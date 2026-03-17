---
name: Schema Audit — DS-160
description: Agente especializado em auditar e manter o ds160-schema.js como fonte única de verdade. Compara campos, IDs, options e maxLen com o formulário oficial.
---

# 🧠 Schema Audit — Agente Schema & Dados

## Missão
Garantir que `ds160-schema.js` seja **100% fiel** ao formulário DS-160 oficial. Qualquer discrepância quebra a automação e/ou o formulário clone.

## Arquivo Principal

`public/ds160-schema.js` — **editável diretamente**. É a fonte única de verdade do frontend.

> **Nota**: Os módulos em `pages/XX/schema.js` existem como referência de consulta rápida mas NÃO são obrigatórios para o pipeline. Edite o `ds160-schema.js` diretamente.

## Referências Cruzadas

| Consumidor do Schema | Como usa |
|---------------------|----------|
| `public/form-engine.js` | Lê `DS160_SCHEMA.sections[].fields[]` para renderizar formulário |
| `automation/field-maps/index.js` | Router: monta field-map por visto usando `pages/XX/field-map.js` |
| `automation/normalize-profile.js` | Aggregator: normaliza JSON usando `pages/XX/normalize.js` |

## Seções do Schema

| ID | Label | Campos |
|----|-------|--------|
| `location` | Local de Atendimento | 2 |
| `personal1` | Informações Pessoais 1 | 15 |
| `personal2` | Informações Pessoais 2 | 8 |
| `travel` | Viagem | 41 |
| `travelCompanions` | Companheiros de Viagem | 4 |
| `previousUSTravel` | Viagens Anteriores aos EUA | 19 |
| `addressPhone` | Endereço e Telefone | 29 |
| `passport` | Passaporte | 12 |
| `usContact` | Contato nos EUA | 13 |
| `family1` | Família — Pai e Mãe | 16 |
| `family2` | Família — Cônjuge | 14 |
| `deceasedSpouse` | Cônjuge Falecido | 7 |
| `prevSpouse` | Cônjuge Anterior | 2 |
| `workEducation1` | Trabalho/Educação — Atual | 13 |
| `workEducation2` | Trabalho/Educação — Anterior | 4 |
| `workEducation3` | Treinamento Adicional | 13 |
| `security` | Segurança e Antecedentes | 36 |
| `studentExchange` | Estudante/Intercâmbio (F/J) | 7 |
| `petitionInfo` | Informações da Petição (O) | 4 |

## Checklist de Auditoria por Campo

Para cada campo no schema, verificar:

1. **`id`** — único na seção, camelCase consistente
2. **`label`** — tradução fiel do texto original do DS-160
3. **`type`** — corresponde ao input no oficial (text, select, radio, date, textarea)
4. **`ds160`** — ID exato do campo no HTML oficial (deve ser regex-compatible no field-map)
5. **`maxLen`** — corresponde ao `maxlength` do HTML oficial
6. **`required`** — campo é obrigatório no oficial?
7. **`options`** / `optionsRef` — values e labels na mesma ordem do oficial
8. **`showWhen`** — condicional bate com lógica do oficial?
9. **`allowNA` / `allowUnknown`** — checkboxes "Does Not Apply" / "Do Not Know" existem no oficial?

## Workflow: Auditoria de Seção

### Input necessário
- ID da seção no schema (ex: `previousUSTravel`)
- HTML oficial da página correspondente (ou URL)

### Passo 1: Extrair campos do HTML oficial
```bash
Select-String -Path "html_oficial.html" -Pattern "(tbx|ddl|rbl|cbx)[A-Z_]+" -AllMatches
```

### Passo 2: Comparar com schema
```bash
Select-String -Path "public/ds160-schema.js" -Pattern "ds160.*?\"(tbx|ddl|rbl|cbx)[^\"]+\"" -AllMatches
```

### Passo 3: Verificar cross-ref com field-map modular
```bash
Select-String -Path "pages/*/field-map.js" -Pattern "<ds160_id>" -Encoding utf8
```

### Passo 4: Gerar tabela de comparação
| # | Oficial ID | Schema ds160 | Label OK? | MaxLen OK? | Options OK? | Status |
|---|-----------|-------------|-----------|-----------|------------|--------|

### Passo 5: Aplicar correções
Editar diretamente em `public/ds160-schema.js`. Prioridade:
1. IDs ds160 errados (P0 — quebra automação)
2. maxLen errado (P1 — trunca dados)
3. Options faltantes (P1 — select incompleto)
4. Labels imprecisos (P2 — UX)

## Regras de Ouro

1. **Nunca inventar** um ds160 ID — sempre copiar do HTML oficial
2. **Nunca assumir** maxLen — sempre verificar `maxlength` no HTML
3. **Options na mesma ordem** do oficial (Y, M, W, D, H)
4. **Labels são traduções**, não interpretações
5. **Editar ds160-schema.js diretamente** — não precisa de build step
