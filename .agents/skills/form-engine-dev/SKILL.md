---
name: Form Engine Development
description: Guia para desenvolvimento e manutenção do form-engine.js — renderização, validação, arrays, condicionais, review mode, multi-page mode e performance.
---

# ⚙️ Form Engine Development

## Missão
Manter e evoluir o `form-engine.js` — o motor schema-driven que renderiza campos, valida dados, gerencia arrays/condicionais e suporta modo accordion e multi-page.

## Arquivos Sob Responsabilidade

| Arquivo | Função |
|---------|--------|
| `public/form-engine.js` | Engine principal (classe `FormEngine`) |
| `public/ds160-form.html` | Página host — instancia e configura o engine |
| `public/styles.css` | Estilos do formulário + step-bar + page-nav |
| `public/ds160-schema.js` | Schema editável — fonte de verdade do frontend |

## Modos de Renderização

### Accordion (padrão)
Todas as seções renderizadas como sanfonas. Clicar no header abre/fecha.

### Pages (multi-page)
Uma seção por vez, com step-bar horizontal e navegação anterior/próximo.

```javascript
engine.setRenderMode('pages')     // Ativa modo páginas
engine.setRenderMode('accordion') // Volta para sanfonas
```

### Funções do modo Pages
| Função | O que faz |
|--------|-----------|
| `getVisibleSections()` | Filtra seções por condicionais (marital, visto) |
| `renderStepBar()` | Barra horizontal com indicadores active/completed/pending |
| `goToPage(idx)` | Navega para página, valida forward |
| `_showCurrentPage()` | Mostra 1 seção, esconde todas as outras |
| `setRenderMode(mode)` | Toggle entre 'accordion' e 'pages' |

## Arquitetura da Classe `FormEngine`

```
FormEngine(schema, containerId)
│
├─ INIT
│  ├── init()                      → Aplica defaults, renderiza, calcula progresso
│  ├── _applyDefaults()            → Preenche data{} com valores default do schema
│  └── loadData(json)              → Hydration: JSON do Supabase → data{} + arrayData{}
│
├─ RENDERING
│  ├── renderForm()                → Gera HTML completo (seções + campos + arrays)
│  ├── _renderFields(fields)       → Loop de campos regulares
│  ├── _renderSingleField(f)       → HTML de 1 campo
│  ├── _renderArray(f)             → Container de array (Add Another)
│  └── _resolveOptions(field)      → Resolve optionsRef → options concretas
│
├─ MULTI-PAGE MODE
│  ├── setRenderMode(mode)         → Toggle accordion/pages + inject step-bar
│  ├── getVisibleSections()        → Filtra seções por condicionais
│  ├── renderStepBar()             → Barra de progresso horizontal
│  ├── goToPage(idx)               → Navegação com validação forward
│  └── _showCurrentPage()          → Mostra 1 seção por vez
│
├─ NAVIGATION (ACCORDION)
│  ├── toggleSection(idx, scroll)  → Abre/fecha seção
│  └── goNext(currentIdx)          → Avança para próxima seção visível
│
├─ VALIDATION
│  ├── validateSection(idx, mark)  → Valida 1 seção (retorna errors[])
│  └── validateAll()               → Valida todas as seções
│
├─ JSON / EXPORT
│  ├── generateJSON()              → Exporta data{} + arrayData{} → JSON flat
│  └── copyToClipboard(type)       → Copia JSON ou PW para clipboard
│
└─ REVIEW MODE
   ├── renderReview()              → Renderiza em modo assessor
   └── editField() / saveEdit()   → Edição inline
```

## Regras Críticas

1. **Mudanças devem ser GENÉRICAS** — nunca hardcode um campo
2. **Arrays: Date tem tratamento especial** — `{day, month, year}`, não strings
3. **N/A e Unknown** devem ser limpos ao remover entries
4. **Condicionais: Prune-on-Hide** — dados de campos escondidos são deletados
5. **CEP Auto-Fill** — campos `*PostalCode` + BRZL disparam BrasilAPI
6. **Modo pages** — step-bar e page-nav são injetados dinamicamente por `setRenderMode`
