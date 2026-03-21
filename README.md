# DS-160 IA — Sistema de Automação

Sistema modular de preenchimento automatizado do formulário DS-160 (Visto Americano).

## Arquitetura

```
📁 DS160 IA/
├── automation/              # Backend — automação Playwright
│   ├── filler.js            # Runner principal
│   ├── queue.js             # Queue runner (Supabase)
│   ├── run.js               # Entry point
│   ├── normalize-profile.js # Aggregator: 20 normalizers
│   ├── field-maps/
│   │   ├── index.js         # Router por tipo de visto (B/F/J/O)
│   │   ├── b1-b2-modular.js # Aggregator: 17 page builders
│   │   └── shared.js        # Postback IDs
│   ├── helpers/             # fill-field, postback, add-another, verify
│   └── pages/               # generic-page, travel-page
│
├── pages/                   # Módulos por página (57 arquivos)
│   ├── _shared/
│   │   ├── options.js       # Options compartilhados
│   │   ├── field-map-helpers.js
│   │   └── visa-configs.js  # Resolução dinâmica por visto/idade/marital
│   ├── 01-location/         # schema + field-map + normalize
│   ├── 02-personal1/        # ...
│   ├── ...
│   ├── 18-student-exchange/ # F/J/M visas (SEVIS)
│   └── 19-petition-info/    # O visa (I-129)
│
├── public/                  # Frontend
│   ├── ds160-form.html      # Formulário clone
│   ├── form-engine.js       # Renderizador (accordion + pages mode)
│   ├── ds160-schema.js      # Schema editável — fonte de verdade do frontend
│   ├── styles.css           # CSS completo
│   ├── dashboard.html       # Dashboard admin
│   └── portal.html          # Portal do solicitante
│
├── scripts/                 # Utilitários
│   ├── build-schema.js      # Gera ds160-schema.js dos módulos
│   ├── setup-production.sql # Setup do banco
│   ├── check-queue.js       # Debug: consulta fila
│   └── test-auth.js         # Debug: testa autenticação
│
└── .agents/                 # Skills e workflows do agente IA
```

## Mapa de arquivos do frontend

O indice oficial do frontend agora fica em:

- `docs/frontend-structure.md`

Use esse documento como fonte de verdade para:

- paginas canonicas
- wrappers e aliases
- rotas estaveis do GitHub Pages
- runtime compartilhado
- separacao entre dashboard, portal e formulario DS-160

Resumo rapido:

- paginas canonicas:
  - `public/index.html`
  - `public/dashboard.html`
  - `public/portal.html`
  - `public/ds160-form.html`
  - `public/update-password.html`
  - `public/docs.html`
- runtime compartilhado:
  - `public/app-core.js`
  - `public/styles.css`
- controladores por pagina:
  - `public/js/dashboard.js`
  - `public/js/portal.js`

## Tipos de Visto Suportados

| Visto | Tipo | Páginas Extra |
|-------|------|---------------|
| **B1/B2** | Turismo/Negócios | — |
| **F1/F2** | Estudante | SEVIS (student-exchange) |
| **J1/J2** | Intercâmbio | SEVIS (student-exchange) |
| **O1/O2/O3** | Habilidade Extraordinária | Petition Info (I-129) |

## Comandos

```bash
# Rebuild schema a partir dos módulos (opcional)
node scripts/build-schema.js

# Verificar fila de automação
node scripts/check-queue.js

# Executar automação
node automation/run.js
```

## Modo de Renderização do Formulário

```javascript
// No browser console:
engine.setRenderMode('pages')     // Multi-page (step-bar)
engine.setRenderMode('accordion') // Sanfonas (padrão)
```
