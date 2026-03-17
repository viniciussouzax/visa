---
name: Frontend Architecture — SENDS160
description: Guia de arquitetura do frontend: páginas, componentes, design system, integração Supabase, branding dinâmico e padrões de desenvolvimento.
---

# 🎨 Frontend Architecture — SENDS160

## Missão
Manter e evoluir toda a interface web do SENDS160: landing, dashboard, portal e formulário.

## Mapa de Páginas e Arquivos

| Arquivo | Papel | Tamanho |
|---------|-------|---------|
| `public/index.html` | Landing page (login/redirect) | 4 KB |
| `public/dashboard.html` | Dashboard do assessor (tabela, filtros, ações, sidebar) | 162 KB |
| `public/portal.html` | Portal do solicitante (busca email, lista formulários) | 63 KB |
| `public/ds160-form.html` | Formulário DS-160 (instancia FormEngine) | 44 KB |
| `public/app-core.js` | Core compartilhado (auth, fetch, nav, loading, toast) | 9 KB |
| `public/styles.css` | Design system global | 104 KB |
| `public/form-engine.js` | Motor do formulário — accordion + pages mode (ver skill `form-engine-dev`) | 174 KB |
| `public/ds160-schema.js` | Schema editável — fonte de verdade (19 seções, 259 campos) | 166 KB |
| `public/logo-azul.png` | Logo azul | 10 KB |
| `public/logo-branco.png` | Logo branco | 9 KB |

## Papéis de Usuário

| Role | Acesso | Login |
|------|--------|-------|
| `solicitante` | Formulário próprio via portal | Link email (sem senha) |
| `assessor` | Dashboard + formulários atribuídos | Email + senha (Supabase Auth) |
| `admin_master` | Todos os formulários + configurações | Email + senha |

## Módulo Core (`app-core.js`)

```javascript
AppCore = {
  SUPABASE_URL,           // URL do projeto
  SUPABASE_KEY,           // Anon key
  getAuth(),              // Token do sessionStorage
  getOrg(),               // Org slug da URL
  sbFetch(path, method, body),  // Fetch autenticado ao Supabase (REST)
  sbGet(path),            // GET shorthand
  navigate(page, params), // Navegação com preservação de org
  buildUrl(page, params), // Constrói URL com org
  goToDashboard(),        // Volta ao dashboard
  showLoading(),          // Tela de loading global
  hideLoading(),          // Remove loading
  showToast(msg, type),   // Toast notification
}
```

## Design System (CSS Variables)

### Cores principais
```css
--accent: #3b82f6;         /* Azul primário */
--accent-hover: #2563eb;   /* Hover */
--bg-body: #f1f5f9;        /* Fundo */
--bg-card: #ffffff;        /* Cards */
--bg-sidebar: #0f172a;     /* Sidebar escura */
--text-primary: #1e293b;   /* Texto principal */
--text-secondary: #64748b; /* Texto secundário */
--text-muted: #94a3b8;     /* Texto mutado */
--border: #e2e8f0;         /* Bordas */
--success: #22c55e;        /* Verde */
--danger: #ef4444;         /* Vermelho */
--warning: #f59e0b;        /* Amarelo */
```

### Tipografia
- **Font**: Inter (Google Fonts) + Outfit (headings)
- **Body**: 13-14px, weight 400-500
- **Headings**: weight 600-700

### Padrões de Componentes
- Inputs: borda `var(--border)`, border-radius `var(--radius)` (6px), padding `8px 12px`
- Botões: `.btn` base, `.btn-primary`, `.btn-outline`, `.btn-new`, `.btn-danger`
- Cards: `.bg-card`, `box-shadow: var(--shadow-lg)`, `border-radius: var(--radius-lg)` (12px)
- Modais: `.modal-overlay` + `.modal-box`
- Toast: `.toast` com animação slideUp

## Componentes por Página

### Dashboard (`dashboard.html`)
- **Sidebar**: `.sidebar` com `.nav-item`, badges de contagem, kebab menu no footer
- **Tabela**: `.data-table` com linhas `.selectable`, checkbox seleção, filtros
- **Drawer**: Painel lateral para review embutido
- **Ações**: Drag-and-drop para reordenar, grupos, WhatsApp
- **Funções-chave**: `loadApplicants()`, `renderTable()`, `showReviewDrawer()`

### Portal (`portal.html`)
- **Busca**: Campo email → carrega formulários do solicitante
- **Lista**: Cards de formulários com progresso %
- **Branding**: Logo/cores dinâmicos por organização
- **Funções-chave**: `initPortal()`, `renderForms()`, `createNewForm()`

### Formulário (`ds160-form.html`)
- **Views**: Solicitante (form) / Assessor (review) / Código (JSON/PW)
- **Debounced auto-save**: 2s após última mudança
- **Portal mode**: `body.role-solicitante` com card centralizado
- **Funções-chave**: `loadApplicantData()`, `saveData()`, `approveData()`

## Integração Supabase

### Padrão de chamada
```javascript
// GET
const rows = await AppCore.sbGet('applicants?id=eq.' + id + '&select=id,full_name,data');
// POST/PATCH
await AppCore.sbFetch('applicants?id=eq.' + id, 'PATCH', { data: json });
```

### Tabelas do Supabase

| Tabela | Colunas principais | Uso |
|--------|-------------------|-----|
| `applicants` | `id`, `full_name`, `data` (JSON), `stage`, `status`, `result`, `priority`, `company_id`, `group_id` | Dados do formulário |
| `companies` | `id`, `short_id`, `name`, `logo_url`, `use_custom_logo`, `portal_bg_color`, `portal_btn_color` | Branding por organização |
| `error_logs` | `id`, `error_message`, `page_name`, `screenshot_url`, `archived` | Logs de erro da automação |

## Branding Dinâmico

Organizações customizam via `companies`:
```javascript
// CSS variables override no runtime
document.body.style.setProperty('--accent', org.portal_btn_color);
document.body.style.backgroundColor = org.portal_bg_color;
// Logo
logo.src = org.logo_url;
logo.style.maxWidth = (org.logo_max_width || 150) + 'px';
```

## Regras de Desenvolvimento

1. **CSS variables** para tudo — nunca hardcode cores
2. **Responsivo** — funcionar em mobile (min-width 320px)
3. **Ícones** — Iconoir com stroke-width 2 (`font-size: 18-20px`)
4. **Toast** para feedback — nunca `alert()`
5. **Loading states** — `AppCore.showLoading()` em operações async
6. **sessionStorage** para auth — token e org preservados entre refreshes
7. **buildUrl/navigate** para links — preserva `?org=` automaticamente
