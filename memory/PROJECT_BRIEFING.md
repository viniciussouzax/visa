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
- Worker/Fila DS-160 usam um contrato explicito de status:
  - `doing` existe somente durante execucao real
  - `todo`, `retry` e `standby` sao os unicos estados claimaveis pela automacao
  - `error`, `fail` e `done` nunca devem ser pegos automaticamente
- A fila DS-160 do Fly e global: ela pega solicitantes de todas as organizacoes, em ordem de elegibilidade, sem separar por empresa
- O unico bloqueio de concorrencia necessario e por solicitante/application: nunca pode existir duas automacoes simultaneas para o mesmo caso
- `standby` nao dispara na hora: uma rotina agendada desperta a fila periodicamente para tentar novamente somente os casos cujo cooldown venceu
- A rotina agendada de `standby` depende do secret `SUPABASE_SERVICE_ROLE_KEY` no GitHub Actions para invocar a Edge Function `dispatch-job` e pode disparar multiplas machines por rodada conforme a quantidade elegivel
- O runner processa a fila: claima applicant elegivel em `ds160` → claima `application` → abre Playwright → preenche → promove para `payment` ou classifica o erro

### 3. Dashboard (`dashboard.html` + Supabase RLS)
- Multi-org com RLS (Row Level Security) — cada assessor vê só seus applicants
- Admin master gerencia organizações, usuários, configurações (API keys de captcha, etc.)
- Logs de erro com screenshot, vídeo opcional, HTML da página e ligação por `application_id` para o assessor localizar o erro com precisão

## Regras críticas
- **NUNCA remover config existente** do schema/field-maps — apenas ADICIONAR
- O formulário oficial tem ~26 páginas, cada uma com seu `field-map.js` em `pages/XX-nome/`
- Postback IDs são hardcoded em `automation/field-maps/shared.js` — mudá-los quebra tudo
- O `ds160map/` contém HTMLs salvos do site oficial — fonte de verdade para IDs de campos
- Captchas resolvidos via CapMonster API
- Visibilidade por organização: assessor autenticado só deve ler applicants, processes, grupos, AIS e logs da própria empresa; master mantém visão global
- O portal público precisa sempre carregar `company_id` pela `org` quando disponível e nunca confiar só em `id`/`group_id` no frontend
- Grupos só aceitam vínculo quando grupo e solicitante estão na mesma etapa
- Novo membro em grupo só entra pela Triagem; o grupo só avança quando todos os membros ativos concluem a etapa atual
- Excluir solicitante ativo arquiva primeiro; exclusão permanente só é permitida para itens já arquivados
- `error` é erro de dados corrigível pelo assessor; `standby` é instabilidade temporária com retry automático; `fail` é falha técnica que exige revisão antes de reenfileirar
- `doing` so pode aparecer enquanto existe worker realmente processando o caso; se a execucao morrer, o status precisa voltar para `todo`, `retry` ou `standby`

## Stack
Node.js, Express, Playwright, Supabase (Auth + DB + Storage + Realtime), GitHub Pages (frontend), Fly.io (automação)

## Indice de arquivos do frontend

O mapa oficial de paginas, wrappers, runtime compartilhado e controladores do frontend fica em:

- `docs/frontend-structure.md`

Use esse arquivo como referencia antes de:

- mover paginas
- trocar rotas
- duplicar estilos locais
- criar novos wrappers
- mexer na relacao entre dashboard, portal e formulario

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

