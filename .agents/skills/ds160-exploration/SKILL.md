---
name: Exploração DS-160 — Alinhamento Condicional
description: Workflow para alinhar perguntas condicionais entre o formulário clone DS-160, a automação (field-map.js/filler.js) e o JSON do banco de dados. Usado para corrigir erros de preenchimento.
---

# Exploração DS-160 — Alinhamento Condicional

## Quando Usar
- Quando um campo do DS-160 oficial não está sendo preenchido corretamente
- Quando uma pergunta condicional (Add Another, Yes/No toggle, etc.) não está alinhada
- Quando o JSON do banco não corresponde ao que a automação espera
- Para auditar uma página inteira do DS-160

## Arquivos Chave

| Componente | Arquivo | Função |
|---|---|---|
| **Automação** | `ds160-filler/automation/field-map.js` | Mapeia campos JSON → seletores DS-160 |
| **Automação** | `ds160-filler/automation/filler.js` | Engine de preenchimento (phases, postbacks, Add Another) |
| **Form Clone** | `ds160/index.html` | Formulário clone que coleta dados do usuário |
| **JSON Banco** | Supabase `applicants.data` | JSON gerado pelo form clone |

## Workflow de Diagnóstico

### Passo 1: Identificar o Erro
```
-- Consultar logs de erro no Supabase
SELECT error_message, page_name, field_name, validation_errors, screenshot_url
FROM error_logs WHERE archived = false ORDER BY created_at DESC LIMIT 5;
```

Se há screenshot, analisar visualmente qual campo está vazio ou errado.

### Passo 2: Verificar o JSON do Applicant
```
-- Ver dados relevantes do applicant
SELECT a.data->'<seção>' as dados
FROM applicants a JOIN applications app ON app.applicant_id = a.id
WHERE app.id = '<application_id>';
```

Seções disponíveis: `personal1`, `personal2`, `addressPhone`, `passport`, `travel`, `travelCompanions`, `previousUSTravel`, `usContact`, `family`, `workEducation1`, `workEducation2`, `workEducation3`, `securityBackground1-5`

### Passo 3: Verificar o field-map.js
Procurar o campo no field-map.js:
```bash
Select-String -Path "field-map.js" -Pattern "<nomeDoField>" -Encoding utf8
```

Verificar:
- O `pattern` (regex) bate com o ID real do campo no DS-160?
- O `value` aponta para a propriedade correta do JSON normalizado?
- O `type` está correto? (text, select, select-label, click, checkbox-check)

### Passo 4: Verificar normalizeProfile no filler.js
O filler.js tem uma função `normalizeProfile(data)` que transforma o JSON do banco no formato que o field-map espera:
```bash
Select-String -Path "filler.js" -Pattern "<propriedade>" -Encoding utf8
```

Verificar:
- O campo JSON (`data.personal1.xxx`) está sendo mapeado para a propriedade que o field-map usa (`a.xxx`)?
- Campos aninhados (ex: `employer.name`) estão sendo achatados (flattened)?

### Passo 5: Verificar Condicionais no Form Clone
No `ds160/index.html`, procurar o campo e verificar:
```bash
Select-String -Path "ds160/index.html" -Pattern "<nomeDoField>" -Encoding utf8
```

- A pergunta condicional (Yes/No) salva o valor correto no JSON?
- O campo condicional aparece/oculta corretamente?
- O campo tem o `name` correto no form-data?

## Padrões Condicionais DS-160

### Yes/No Radio que revela campos
```
JSON: { "otherNationality": "Y", "otherNationalities": [...] }
field-map: if (a.otherNationality && a.otherNationalities?.length > 0) { ... }
filler.js normalizeProfile: otherNationality: data.otherNationality === 'Y'
```

### Add Another (Multi-Entry DataLists)
O DS-160 usa DataLists ASP.NET para campos com múltiplas entries.

**3 Mecanismos de adição (baseado em testes reais):**

1. **Link "Add Another"** — `<a>` com texto "Add Another"
   - Usado em: Other Names (DListAlias), Other Nationalities (dtlOTHER_NATL)
   - Clicado após preencher a **primeira entry** (ctl00)
   
2. **InsertButton** — `<input id="..._InsertButton...">` dentro do DataList
   - Usado em: Permanent Resident (dtlOthPermResCntry) diretamente
   - Usado em Other Names/Nationalities para entries **ctl01+** (após Add Another)
   - **O InsertButton SALVA a entry atual e CRIA a próxima row vazia**

3. **Fluxo completo multi-entry:**
   ```
   Preenche ctl00 → Add Another OU InsertButton → 
   Preenche ctl01 → InsertButton ctl01 → 
   Preenche ctl02 → (último: salvo pelo Next)
   ```

**Regras críticas:**
- InsertButton **SÓ deve ser clicado DEPOIS** que os campos estão preenchidos
- O **último entry** NÃO precisa de InsertButton (salvo pelo botão Next)
- Guard: verificar `visible.some(f => f.id.includes(listName) && f.id.includes(prevCtl) && !isSelectEmpty(f.value))`

### Postback Fields
Alguns campos causam postback ASP.NET (recarregam parte da página):
- Radio buttons: Yes/No que revelam campos (ex: `rblOtherNames`, `rblAPP_OTH_NATL_IND`)
- Select dropdowns: Location, whoIsPaying, etc.
- Lista em `POSTBACK_CLICK_ANY_IDS` e `isPostbackClick()` no filler.js

**Regra**: Postback fields devem ser preenchidos ANTES de text fields (text fica para Phase 4).

## DataLists Conhecidos no DS-160

| DataList | Página | Mecanismo Add | Campos |
|---|---|---|---|
| `DListAlias` | Personal1 | Link "Add Another" | surname, givenName |
| `dtlOTHER_NATL` | Personal2 | Link "Add Another" | country, hasPassport, passportNumber |
| `dtlOthPermResCntry` | Personal2 | InsertButton direto | country |
| `DListSpouse` | Family | — (single entry) | nome, DOB, etc |

## Dicas de Debug

1. **Rodar Playwright Inspector** para capturar seletores reais:
   ```bash
   npx playwright codegen https://ceac.state.gov/GenNIV/General/complete/complete_personal.aspx
   ```

2. **Ver discoverFields** — adicionar log para ver todos os campos visíveis:
   ```javascript
   const fields = await discoverFields(page);
   fields.filter(f => f.visible).forEach(f => console.log(f.id, f.tag, f.type, f.value));
   ```

3. **Verificar se o ID real bate com o pattern**:
   ```javascript
   const regex = /tbxSURNAME$/i;
   console.log(regex.test('ctl00_SiteContentPlaceHolder_FormView1_tbxSURNAME')); // true
   ```

4. **Screenshot manual** para debug visual:
   ```javascript
   await page.screenshot({ path: 'debug.png', fullPage: true });
   ```
