# 🧠 Briefing: Projeto SEND-S160

**O que é:** Sistema SaaS multi-tenant para automação de preenchimento do formulário DS-160 (visto americano) e agendamento AIS. Assessores de imigração preenchem um formulário clone na plataforma, e um robô Playwright preenche o formulário oficial no site do governo (ceac.state.gov).

## Arquitetura em 3 camadas

```
Assessor → Formulário Clone → Banco (Supabase) → Automação Playwright → Site Oficial
```

### 1. FormEngine (`form-engine.js` + `ds160-schema.js`)
- Renderiza um formulário clone do DS-160 com ~400 campos, condicionais, arrays dinâmicos (AddAnother), validação em tempo real
- Schema-driven: `ds160-schema.js` é a fonte de verdade dos campos, tipos, maxLen, opções, condicionais
- Salva os dados como JSON no Supabase (`applicants.data`)

### 2. Automação (`filler.js` + `generic-page.js` + `pages/*/field-map.js`)
- `normalizeProfile(data)` — transforma o JSON do banco em objeto flat consumível pelos field-maps
- `buildDynamicFieldMap(profile)` — gera array de `{pattern: /regex/, value, type}` mapeando cada campo do site oficial
- `fillPage(page, fieldMap)` — preenche UMA página em 4 fases: postback clicks → postback selects → add-another → text/non-PB
- O site oficial usa ASP.NET WebForms com postbacks assíncronos (UpdatePanel) — cada select/radio pode recarregar parte da página
- Runner (`runner.js`) processa a fila: pega applicant `status=todo` → abre Playwright → preenche → marca `done/error`

### 3. Dashboard (`dashboard.html` + Supabase RLS)
- Multi-org com RLS (Row Level Security) — cada assessor vê só seus applicants
- Admin master gerencia organizações, usuários, configurações (API keys de captcha, etc.)
- Logs de erro com screenshots e HTML da página onde falhou

## Regras críticas
- **NUNCA remover config existente** do schema/field-maps — apenas ADICIONAR
- O formulário oficial tem ~26 páginas, cada uma com seu `field-map.js` em `pages/XX-nome/`
- Postback IDs são hardcoded em `automation/field-maps/shared.js` — mudá-los quebra tudo
- O `ds160map/` contém HTMLs salvos do site oficial — fonte de verdade para IDs de campos
- Captchas resolvidos via CapMonster API

## Stack
Node.js, Express, Playwright, Supabase (Auth + DB + Storage + Realtime), GitHub Pages (frontend), Cloud Run (automação)

## Arquivos Core

| Arquivo | Função |
|---------|--------|
| `automation/filler.js` | Orquestrador principal |
| `automation/pages/generic-page.js` | Motor de preenchimento (4 fases) |
| `automation/field-maps/b1-b2-modular.js` | Agregador de field-maps |
| `automation/helpers/fill-field.js` | Preenchimento individual |
| `automation/helpers/postback.js` | Controla postbacks ASP.NET |
| `pages/*/field-map.js` (26 arquivos) | Mapa de cada página |
| `pages/_shared/field-map-helpers.js` | Helpers (normDate, padDay) |
| `public/ds160-schema.js` | Schema do formulário clone |
| `public/form-engine.js` | Motor de renderização |
| `public/dashboard.html` | Dashboard de gestão |
| `server.js` | Servidor Express |
| `automation/runner.js` | Runner da fila |
