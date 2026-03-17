---
description: Auditoria completa de uma seção do schema vs HTML oficial do DS-160
---

# /audit-schema — Auditoria de Seção

## Quando usar
Quando precisar verificar se uma seção do `ds160-schema.js` está 100% alinhada com o formulário DS-160 oficial.

## Pré-requisitos
- HTML oficial da página correspondente (colado pelo usuário ou obtido via browser)
- Acesso ao `public/ds160-schema.js` (editável diretamente)

## Steps

### 1. Identificar a seção
Pergunte ao usuário qual seção auditar. Seções disponíveis:
- `location`, `personal1`, `personal2`, `passport`, `travel`, `travelCompanions`
- `previousUSTravel`, `addressPhone`, `usContact`, `family1`, `family2`
- `deceasedSpouse`, `prevSpouse`, `workEducation1`, `workEducation2`, `workEducation3`
- `security`, `studentExchange`, `petitionInfo`

### 2. Ler o skill de Schema Audit
// turbo
```
Use view_file para ler c:\Users\azuos\Desktop\DS160 IA\.agents\skills\schema-audit\SKILL.md
```

### 3. Extrair campos do HTML oficial
Do HTML oficial fornecido, extrair todos os IDs de campos:
- `tbx*` → text inputs
- `ddl*` → select dropdowns
- `rbl*` → radio buttons
- `cbx*` → checkboxes (allowNA/allowUnknown)

Anotar `maxlength`, options de selects, e lógica de condicionais.

### 4. Comparar com schema
// turbo
```
Abrir ds160-schema.js e localizar a seção correspondente
```

### 5. Gerar tabela de comparação
| # | Oficial ID | Schema ds160 | Label | MaxLen | Options | Status |
|---|-----------|-------------|-------|--------|---------|--------|

### 6. Aplicar correções
Editar diretamente em `public/ds160-schema.js`. Prioridade:
1. IDs ds160 errados (P0 — quebra automação)
2. maxLen errado (P1 — trunca dados)
3. Options faltantes (P1 — select incompleto)
4. Labels imprecisos (P2 — UX)

### 7. Reportar
Mostrar tabela final com todas as correções ao usuário.
