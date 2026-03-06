# DS-160 IA — Sistema de Assessoria de Vistos

Sistema completo para gestão de formulários DS-160, incluindo preenchimento assistido, automação e gerenciamento de solicitantes.

## Estrutura

```
├── public/              Frontend (HTML/CSS/JS estático)
│   ├── dashboard.html   Login + painel do assessor (Kanban)
│   ├── ds160-form.html  Formulário DS-160 (view assessor)
│   ├── index.html       Formulário clone DS-160 (solicitante)
│   ├── portal.html      Portal de acesso do solicitante
│   ├── admin.html       Painel administrativo
│   ├── app-core.js      Core: Supabase, auth, navegação
│   ├── form-engine.js   Motor do formulário (schema-driven)
│   ├── ds160-schema.js  Schema completo do DS-160
│   ├── worker.js        Worker de automação
│   └── worker-monitor.js Monitor do worker
├── automation/          Automação Playwright (preenchimento DS-160)
├── scripts/             Scripts de teste e auditoria
└── .agents/             Workflows e skills do IDE
```

## Como Rodar

```bash
npm run dev
```

Abre em `http://localhost:5173`. Serve os arquivos estáticos de `public/`.

## Tecnologias

- **Frontend:** HTML + Tailwind CSS (CDN) + Vanilla JS
- **Backend:** Supabase (PostgreSQL + Auth + API REST)
- **Automação:** Playwright (Node.js)
- **Formulário:** FormEngine schema-driven (vanilla JS)
