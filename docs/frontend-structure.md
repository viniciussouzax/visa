# Frontend Structure

## Objetivo

Este documento e a referencia oficial do mapa de arquivos do frontend.
Use este arquivo antes de mover paginas, trocar rotas, criar wrappers ou
duplicar logica visual.

## Paginas canonicas

Estas sao as paginas reais da aplicacao e continuam sendo a fonte principal:

- `public/index.html`
- `public/dashboard.html`
- `public/portal.html`
- `public/ds160-form.html`
- `public/update-password.html`
- `public/docs.html`

## Wrappers e aliases

Estes arquivos existem apenas para navegacao e compatibilidade de rota:

- `public/dashboard/index.html`
  - wrapper para `public/dashboard.html`
- `public/update-password/index.html`
  - wrapper para `public/update-password.html`
- `public/404.html`
  - fallback de rota para GitHub Pages

Regra:

- wrappers nao devem virar fonte de logica de negocio
- toda logica real deve continuar nas paginas canonicas

## Runtime compartilhado

Arquivos globais usados por multiplas paginas:

- `public/app-core.js`
- `public/styles.css`

Responsabilidades:

- `app-core.js`
  - helpers de rota
  - sessao e auth
  - integracao com Supabase
  - utilitarios compartilhados
- `styles.css`
  - design system
  - layout base
  - sidebar, tabelas, modais, formularios e tokens visuais

## Controladores por pagina

- `public/js/dashboard.js`
- `public/js/portal.js`

Regra:

- logica especifica de tela fica nesses controladores
- helpers genericos ficam em `public/app-core.js`
- evitar duplicar funcoes de rota em varios arquivos

## Dominio sensivel: formulario DS-160

O formulario e um dominio separado e sensivel. A estrutura oficial dele e:

- `public/ds160-form.html`
- `public/ds160-schema.js`
- `public/form-engine.js`

Regra:

- nao misturar logica de dashboard ou portal com a engine do formulario
- alteracoes visuais no formulario devem ser minimas e controladas
- o mesmo formulario atende solicitante e assessor; muda o contexto, nao a pagina

## Rotas oficiais atuais

Enquanto a aplicacao continuar publicada em GitHub Pages com paginas estaticas,
as rotas estaveis sao:

- `/`
- `/dashboard.html`
- `/portal.html`
- `/ds160-form.html?id=...`
- `/update-password.html`
- `/docs.html`

Aliases suportados:

- `/dashboard/`
- `/update-password/`

## Regras de manutencao

Antes de criar nova pagina ou mover arquivo:

1. decidir se sera pagina canonica ou alias
2. manter a URL publica compativel
3. centralizar a construcao de links em `public/app-core.js`
4. evitar duplicacao de estilos locais quando ja existir classe em `public/styles.css`

## O que evitar

- mover paginas canonicas sem criar compatibilidade
- duplicar sidebar ou design system dentro do HTML
- criar rota nova montando URL manualmente dentro da dashboard
- usar wrappers como lugar de logica de negocio
