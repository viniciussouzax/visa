---
description: Debug de erros da automação DS-160 usando logs, screenshots e HTML da página
---
// turbo-all

# Debug de Erros da Automação DS-160

Quando a automação falhar, siga este workflow para diagnosticar e corrigir o erro rapidamente.

## 1. Buscar os logs de erro não arquivados

```sql
SELECT id, error_message, error_cause, page_name, field_name, 
       screenshot_url, validation_errors, page_html,
       retry_number, created_at
FROM error_logs 
WHERE archived = false
ORDER BY created_at DESC 
LIMIT 5;
```

Execute via `mcp_supabase-mcp-server_execute_sql` com `project_id: zcpvknzktfmotvrybxdf`.

## 2. Validar dados do applicant com dry-run

Antes de investigar o erro, rodar o script de diagnóstico para verificar se os dados estão corretos:

```bash
# Via arquivo JSON:
node scripts/dry-run.js docs/example-applicant-data.json

# Via Supabase direto:
node scripts/dry-run.js --supabase <APPLICANT_ID>
```

Se o dry-run mostrar ⚠️ warnings ou ❌ erros, a causa pode ser dados inválidos no JSON.

## 3. Analisar cada erro usando os 3 artefatos

Para cada erro, temos 3 fontes de informação:

### a) Log de erro (`error_message` + `validation_errors`)
- **error_message**: Erro técnico (timeout, seletor não encontrado, etc.)
- **validation_errors**: Array de mensagens de validação do próprio DS-160
- **page_name**: Identifica em qual página do formulário o erro ocorreu
- **field_name**: Campo específico que falhou (quando disponível)
- **error_cause**: Classificação (validation_error, session_expired, unknown)

### b) Screenshot da página (`screenshot_url`)
- Abrir via `browser_subagent` para ver o estado visual da página
- Verificar: mensagens de erro vermelhas, campos destacados, modais abertos, estado dos dropdowns
- Comparar visualmente com o que o código espera encontrar

### c) HTML da página (`page_html`)
- Contém a estrutura completa da página no momento do erro
- Procurar por:
  - IDs dos campos visíveis: `grep` por `id=` para encontrar seletores corretos
  - Elementos de validação: `ValidationSummary`, `has-error`, classes de erro
  - Modais ou overlays bloqueantes: `.modalBackground`, `modalConfirm`
  - Estado de radio buttons e checkboxes: `checked`, `selected`
  - Dropdowns e suas opções: `<select>` com `<option>`
  - Campos condicionais que apareceram/desapareceram

## 4. Consultar o índice página↔arquivo

Use `docs/page-index.md` para localizar rapidamente:
- Qual arquivo de automação é responsável pela página (ex: Travel → `travel-page.js`)
- Quais linhas do `field-map.js` mapeiam campos dessa página
- Quais chaves JSON (`data.travel.*`) alimentam essa página
- Quais DataLists (multi-entry) existem nessa página

## 5. Diagnóstico cruzado

Compare as 3 fontes para identificar a causa raiz:

| Situação | Log diz | Screenshot mostra | HTML revela | Ação |
|----------|---------|-------------------|-------------|------|
| Seletor errado | Timeout no locator | Campo existe na página | ID diferente do esperado | Corrigir regex no field-map |
| Campo condicional | Campo não visível | Página sem o campo | Panel collapsed/hidden | Adicionar trigger de postback |
| Dado inválido | Validation error | Erro vermelho no campo | Valor preenchido incorreto | Corrigir normalizeProfile |
| Modal bloqueante | Click timeout | Modal sobre a página | `.modalBackground` visible | Adicionar handler de modal |
| Sessão expirada | SessionTimedOut na URL | Página de timeout | Redirect para TimedOut.aspx | Adicionar retry com reload |
| Captcha errado | Ficou na Landing | Erro "code doesn't match" | ValidationSummary visível | Já tem retry, verificar solver |
| Valor dropdown inválido | Select option not found | Dropdown mostra opção errada | `<option>` não contém valor | Verificar mapeamento de valores |

## 6. Verificar alinhamento código ↔ formulário (4 camadas)

### Camada 1: JSON do formulário clone → normalizeProfile
```
Verificar se o campo em data.seção.campo está sendo lido em normalizeProfile()
Arquivo: filler.js, função normalizeProfile() (L1525-2013)
```

### Camada 2: normalizeProfile → buildDynamicFieldMap
```
Verificar se a propriedade normalizada (ex: a.purposeOfTrip) gera um entry no fieldMap
Arquivo: field-map.js, função buildDynamicFieldMap() (L9-1339)
```

### Camada 3: fieldMap pattern → ID real no DS-160
```
Comparar o pattern regex (ex: /ddlPurposeOfTrip$/i) com o ID real no HTML
Use: grep pelo ID no page_html salvo em error_logs
```

### Camada 4: Valor do fieldMap → opções do dropdown/campo
```
Para selects: verificar se o valor (ex: "B1-B2") existe nas <option> do HTML
Para texto: verificar formato (ex: ZIP 5 dígitos, phone sem espaços)
```

## 7. Aplicar correção e testar

1. Editar o arquivo relevante (`field-map.js`, `filler.js`, `queue.js`)
2. **Rodar dry-run para confirmar que o fix está correto:**
   ```bash
   node scripts/dry-run.js docs/example-applicant-data.json
   ```
3. Resetar o applicant para retry:
   ```sql
   UPDATE error_logs SET archived = true WHERE archived = false;
   UPDATE applications 
   SET fill_status = 'queued', fill_queued_at = now(), fill_error = NULL, 
       fill_worker_id = NULL, fill_started_at = NULL, retry_count = 0
   WHERE applicant_id = '<APPLICANT_ID>';
   ```
4. Reiniciar o app: `npm start` no diretório `ds160-filler`
5. Monitorar logs do terminal e verificar se passa da página problemática

## 8. Arquivar logs resolvidos

Após confirmar que o erro foi resolvido:
```sql
UPDATE error_logs SET archived = true WHERE id IN ('<ids dos logs resolvidos>');
```

## 9. Erros conhecidos e padrões comuns

Referência completa de erros conhecidos (com fixes já aplicados) e regras de validação:
- **Skill `form-validation`**: Regras preventivas para o formulário clone (datas, telefones, ZIP codes, etc.)
- **Skill `ds160-exploration`**: Workflow de alinhamento condicional detalhado
- Consultar esses skills com `view_file` quando necessário.

| Erro | Causa raiz | Fix |
|------|-----------|-----|
| `BANGLADESH` no Passport | `ddlCountry` genérico capturado | Regex suffix-anchored no field-map |
| `Surnames not completed` | nameDoNotKnow sem checkbox | Lógica de checkbox no normalizeProfile |
| `ZIP Code invalid` | 4 chars, precisa 5 | `padStart(5, '0')` |
| `Leading spaces` | " SILVA " | `.trim()` no form clone |
| `DOB must be earlier` | year: "4249" | Validação no form clone |
| `Mother DOB > Applicant` | Mãe 1998, filho 1992 | Validação cruzada no clone |
| `Page stuck` | Modal nationality | Modal dismiss no clickNextAndWait |
| `Infinite loop` | Add Another sem limite | Max 5 entries |

## Referência rápida de arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `automation/filler.js` | Lógica de preenchimento, normalizeProfile, navegação entre páginas |
| `automation/field-map.js` | Mapeamento campo DS-160 → valor do applicant (regex patterns) |
| `automation/queue.js` | Fila de processamento, captura de erros, screenshots, page_html |
| `automation/captcha.js` | Resolução de captcha via CapMonster/AI Vision |
| `automation/pages/travel-page.js` | Handler especializado para Travel page |
| `automation/pages/generic-page.js` | Handler genérico para demais páginas |
| `main.js` | Entry point do Electron, carrega queue.js |
| `scripts/dry-run.js` | Validação offline do mapeamento JSON → field-map |
| `docs/page-index.md` | Índice página ↔ arquivo ↔ JSON keys |
| `docs/example-applicant-data.json` | JSON exemplo completo para testes |

## Supabase

- **Project ID**: `zcpvknzktfmotvrybxdf`
- **Tabela de erros**: `error_logs` (campos: error_message, screenshot_url, page_html, validation_errors, archived)
- **Tabela de applicants**: `applicants` (campo `data` contém o JSON completo)
- **Tabela de apps**: `applications` (fill_status, retry_count)
- **Storage**: bucket `screenshots`, pasta `errors/`
