---
description: Debug de erros da automação DS-160 usando logs, screenshots e HTML da página
---

# /debug-errors — Debug de Erros da Automação

## Quando usar
Quando a automação de preenchimento do DS-160 falha — campo não preenchido, valor errado, página travada, etc.

## Pré-requisitos
Pelo menos UM destes:
- Log de erro do Supabase
- Screenshot do DS-160 oficial mostrando o erro
- Mensagem de erro reportada pelo usuário

## Steps

### 1. Ler o skill de Automation Debug
// turbo
```
Use view_file para ler c:\Users\azuos\Desktop\DS160 IA\.agents\skills\automation-debug\SKILL.md
```

### 2. Coletar evidências
Pergunte ao usuário:
- Qual página do DS-160 deu erro?
- Qual o application_id?
- Tem screenshot?

### 3. Consultar JSON no Supabase
```sql
SELECT a.data->'<seção>' FROM applicants a
JOIN applications app ON app.applicant_id = a.id
WHERE app.id = '<application_id>';
```

### 4. Rastrear no pipeline modular
// turbo
```
Buscar o campo nos módulos:
- pages/XX/field-map.js (mapeamento para ID do DS-160)
- pages/XX/normalize.js (normalização do JSON)
- automation/field-maps/index.js (router por visto)
- public/ds160-schema.js (schema editável)
```

### 5. Identificar causa raiz
Classificar como:
- ID errado no schema → editar `ds160-schema.js`
- Mapping errado → editar `pages/XX/field-map.js`
- Normalize errado → editar `pages/XX/normalize.js`
- Visto não detectado → editar `field-maps/index.js` + `visa-configs.js`
- Problema de condicional/postback
- Problema de Add Another

### 6. Aplicar fix
Corrigir no arquivo apropriado. O hot-reload do queue.js pega automaticamente.

### 7. Verificar
Confirmar que o fix resolve o problema sem causar regressão.
