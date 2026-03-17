---
name: Debug de Erros — Automação DS-160
description: Workflow de diagnóstico e correção de erros na automação de preenchimento do DS-160. Cobre pipeline modular JSON → normalizeProfile → field-map router → filler → DS-160 oficial.
---

# 🤖 Debug de Erros — Automação DS-160

## Missão
Diagnosticar e corrigir falhas de preenchimento automático no DS-160 oficial.

## Pipeline de Preenchimento (Modular)
```
applicants.data (Supabase JSON)
  → normalizeProfile() (automation/normalize-profile.js → 20 normalizers)
    → buildDynamicFieldMap() (automation/field-maps/index.js → router por visto)
      → fillField() (automation/helpers/fill-field.js)
        → DS-160 oficial (ceac.state.gov)
```

## Arquivos da Automação

| Arquivo | Função |
|---------|--------|
| `automation/filler.js` | Runner principal: fillApplication, fillPage, phase orchestration |
| `automation/normalize-profile.js` | Aggregator: 20 normalizers modulares de `pages/XX/normalize.js` |
| `automation/field-maps/index.js` | Router: seleciona field-map por visto (B/F/J/O) + hot-reload |
| `automation/field-maps/b1-b2-modular.js` | Aggregator: 17 builders de `pages/XX/field-map.js` |
| `automation/field-maps/shared.js` | Helpers: `ph()`, postback IDs |
| `automation/field-map.js` | Proxy backward-compat → `require('./field-maps')` |
| `automation/helpers/fill-field.js` | Preenche 1 campo no browser (text, select, click, checkbox) |
| `automation/helpers/add-another.js` | Lógica Add Another / InsertButton para DataLists ASP.NET |
| `automation/helpers/postback.js` | Detecta e espera postbacks ASP.NET (UpdatePanel) |
| `automation/helpers/verify.js` | Verifica se campos foram preenchidos corretamente pós-fill |
| `automation/pages/generic-page.js` | Preenchimento genérico de página (phases 1-4) |
| `automation/pages/travel-page.js` | Preenchimento especializado da página Travel |
| `automation/captcha.js` | Resolução de captcha (integração API externa) |
| `automation/error-catalog.js` | Catálogo de erros conhecidos com classificação e auto-fix |
| `public/ds160-schema.js` | Schema editável — fonte de verdade do frontend |
| `pages/XX/field-map.js` | Módulos de field-map por página (17 módulos) |
| `pages/XX/normalize.js` | Módulos de normalização por página (20 módulos) |
| `pages/_shared/visa-configs.js` | Resolução dinâmica de páginas por visto/idade/marital |

## Workflow de Debug

### Passo 1: Coletar evidências
Necessário pelo menos UM:
- **Log de erro** do Supabase (`error_logs` table)
- **Screenshot** do DS-160 oficial mostrando o erro
- **Mensagem de erro** reportada pelo usuário

### Passo 2: Identificar o campo
Do log/screenshot, extrair:
- Nome da página (Personal1, Travel, AddressPhone, etc.)
- Campo que falhou (ex: "Surnames has not been completed")
- Valor esperado vs valor real

### Passo 3: Rastrear no pipeline modular

#### 3a. JSON do Supabase
```sql
SELECT a.data->'<seção>' FROM applicants a WHERE a.id = '<applicant_id>';
```

#### 3b. Normalize (modular)
```bash
Select-String -Path "automation/normalize-profile.js" -Pattern "<campo>" -Encoding utf8
Select-String -Path "pages/*/normalize.js" -Pattern "<campo>" -Encoding utf8
```

#### 3c. Field-map (modular)
```bash
Select-String -Path "automation/field-maps/index.js" -Pattern "<visa_type>" -Encoding utf8
Select-String -Path "pages/*/field-map.js" -Pattern "<ds160_id>" -Encoding utf8
```

#### 3d. Schema
```bash
Select-String -Path "public/ds160-schema.js" -Pattern "<ds160_id>" -Encoding utf8
```

### Passo 4: Classificar o erro

| Tipo | Causa | Fix em |
|------|-------|--------|
| **ID Errado** | ds160 ID no schema ≠ ID real | `ds160-schema.js` (editar direto) |
| **Mapping Errado** | field-map aponta para propriedade incorreta | `pages/XX/field-map.js` |
| **Normalize Errado** | normalize não extrai campo do JSON | `pages/XX/normalize.js` |
| **Condicional** | Campo depende de outro não preenchido | Verificar ordem de phases |
| **Postback** | Campo precisa postback antes de outro | Mover para phase correta |
| **Add Another** | Loop de adição de entries falha | `helpers/add-another.js` |
| **Select mismatch** | Valor não existe nas options do select | Verificar `select-label` vs `select` |
| **Visto errado** | Router não detecta o tipo de visto | `field-maps/index.js` + `visa-configs.js` |

### Passo 5: Testar
Após fix, verificar:
- Campo preenchido corretamente no oficial
- Nenhum campo adjacente afetado
- Postbacks dispararam na ordem certa

## Padrões de Preenchimento

### Phases (Ordem de Preenchimento por Página)
```
Phase 1: Selects que causam postback (POSTBACK_SELECT_IDS)
Phase 2: Radios/clicks que causam postback (POSTBACK_CLICK_YES_IDS, POSTBACK_CLICK_ANY_IDS)
Phase 3: Checkboxes (checkbox-check, checkbox-uncheck)
Phase 4: Text fields, selects normais, select-label
```

### Tipos de Field-Map Entry

| `type` | Ação no browser | Exemplo |
|--------|----------------|---------|
| `text` | `page.fill(selector, value)` | Nomes, endereços |
| `select` | `page.selectOption(selector, value)` | Day, Month, State |
| `select-label` | Busca option por label text | País (BRAZIL → BRZL) |
| `select-search` | Seleciona em dropdown colapsável | Visa class |
| `click` | `page.click(selector)` | Radio Yes/No |
| `checkbox-check` | Marca checkbox se não marcado | DNA, Does Not Apply |

## Erros Históricos

| Erro | Causa Raiz | Fix |
|------|-----------|-----|
| `BANGLADESH` no Passport | ddlCountry genérico (regex sem sufixo) | Regex com sufixo específico |
| `Surnames not completed` | DNA sem checkbox | Checkbox added |
| `ZIP Code invalid` | 4 chars, precisa 5 | `padStart(5, '0')` |
| `Leading spaces` | " GREGER " | `.trim()` |
| `DOB must be earlier` | year: "4249" | Validar no clone |
| `Page stuck` | Modal nationality | Modal dismiss |
| `Infinite loop` | Add Another sem limite | Max 5 entries |
