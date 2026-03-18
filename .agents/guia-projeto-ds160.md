# 🏗️ Guia Arquitetural — Projeto DS-160 IA (SENDS160)

> **Público-alvo:** Assistentes IA que vão auditar, corrigir ou evoluir este projeto.  
> **Última atualização:** 2026-03-18

---

## ⚠️ Equívocos Documentados (Auditorias OpenClaw/Sereno)

Duas auditorias independentes foram realizadas por outro assistente IA (OpenClaw/Sereno) e produziram **múltiplos falsos positivos**. Estão documentados abaixo para evitar retrabalho.

### Falso Positivo 1 — "Campos VWP faltantes na página 6"

| Item | Detalhe |
|------|---------|
| **Alegação** | Campos `vwpDenial` e `vwpDenialExplanation` estão ausentes da seção previousUSTravel |
| **Veredicto** | ❌ **FALSO** — os campos existem em 3 lugares |
| **Evidência** | `ds160-schema.js` L1344-1359, `pages/06-previous-us-travel/field-map.js` L148-155, `pages/07-address-phone/field-map.js` L178-185, `pages/06-previous-us-travel/normalize.js` L66-67 |
| **Causa do erro** | O assistente buscou no lugar errado ou usou versão desatualizada do código |

### Falso Positivo 2 — "supervisorGivenName faltante na página 15"

| Item | Detalhe |
|------|---------|
| **Alegação** | O field-map de `work-education-previous` não preenche `tbSupervisorGivenName` |
| **Veredicto** | ❌ **FALSO** — o campo existe na L47 do field-map |
| **Evidência** | `pages/15-work-education-previous/field-map.js` L46-47: `tbSupervisorSurname` + `tbSupervisorGivenName`, L51-52: checkboxes N/A para ambos |
| **Causa do erro** | O assistente analisou versão pré-correção ou não usou regex/grep corretamente |

### Falso Positivo 3 — "Incompatibilidade de nomes schema vs field-map"

| Item | Detalhe |
|------|---------|
| **Alegação** | Schema usa `prevEmplCountry` mas field-map usa `prev.country` — dados não chegariam |
| **Veredicto** | ❌ **NÃO SE APLICA** — `normalize.js` faz a ponte entre os dois |
| **Evidência** | Cada pasta `pages/XX/` tem um `normalize.js` que transforma os IDs do schema nos nomes simplificados que o field-map espera |
| **Causa do erro** | O assistente não entende a camada `normalize.js` da arquitetura |

### Bug Real Confirmado — "Y/N + array vazio"

| Item | Detalhe |
|------|---------|
| **Alegação** | `if (a.flag && a.array?.length)` clica N quando flag=Y e array=[] |
| **Veredicto** | ✅ **VERDADEIRO** — existia em 11 ocorrências, 6 arquivos |
| **Status** | Corrigido em commit `9e38668` |

---

## 🧠 Arquitetura do Projeto — Como Pensar

### O Pipeline de Dados (CRUCIAL)

```
┌─────────────┐    ┌──────────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐
│  Schema     │───▶│ Form Engine  │───▶│ Supabase  │───▶│ Normalize │───▶│ Field-Map│
│ (ds160-     │    │ (renderiza   │    │ (JSON     │    │ (transforma│    │ (seletores│
│  schema.js) │    │  formulário) │    │  bruto)   │    │  p/ auto.) │    │  DS-160) │
└─────────────┘    └──────────────┘    └───────────┘    └───────────┘    └──────────┘
    CLONE              CLONE              BANCO           AUTOMAÇÃO        AUTOMAÇÃO
```

> **Regra de ouro:** Schema e Form Engine são o **clone** (formulário que o solicitante preenche). Normalize e Field-Map são a **automação** (Playwright que preenche o DS-160 oficial). **São camadas DIFERENTES com nomes de campos DIFERENTES, conectadas pelo `normalize.js`.**

### Estrutura de Pastas

```
DS160 IA/
├── public/                          ← CLONE (frontend)
│   ├── ds160-schema.js              ← Fonte de verdade do formulário clone
│   ├── form-engine.js               ← Motor que renderiza/valida/salva
│   ├── ds160-form.html              ← Página do formulário
│   └── styles.css                   ← Estilos do dashboard
│
├── pages/                           ← AUTOMAÇÃO (por página do DS-160 oficial)
│   ├── 01-location/
│   │   ├── schema.js                ← Módulo de schema (compila p/ ds160-schema.js)
│   │   ├── field-map.js             ← Mapeamento campo→seletor do DS-160 oficial
│   │   └── normalize.js             ← Transforma JSON do banco → formato field-map
│   ├── 02-personal1/
│   │   ├── schema.js
│   │   ├── field-map.js
│   │   └── normalize.js
│   └── ...                          ← 25 pastas no total
│
├── automation/                      ← Runner e filler da automação
│   ├── filler.js                    ← Executor genérico de field-maps
│   ├── field-map.js                 ← Field-map legado (monolítico)
│   └── field-maps/
│       ├── b1-b2-modular.js         ← Agregador modular (importa de pages/*)
│       ├── shared.js                ← Utilitários compartilhados
│       └── index.js                 ← Router de field-maps por tipo de visto
│
├── ds160map/                        ← HTMLs salvos do DS-160 oficial (referência)
│   └── *.html                       ← Snapshots das páginas oficiais
│
└── scripts/
    └── build-schema.js              ← Compila pages/*/schema.js → ds160-schema.js
```

### Relação entre Componentes

| Componente | Responsável por | Nomes de campos |
|-----------|-----------------|-----------------|
| `ds160-schema.js` | Define campos do formulário clone | `otherNationality`, `ssn`, `previousVisits` |
| `form-engine.js` | Renderiza, valida, salva no Supabase | Usa `section.id + '.' + field.id` como chave |
| `normalize.js` | Transforma JSON salvo → formato da automação | Mapeia `otherNationality: "Y"` → `a.otherNationality = true` |
| `field-map.js` | Mapeia dados → seletores CSS do site oficial | Usa `a.otherNationality`, `a.otherNames` etc. |
| `filler.js` | Executa os field-map entries via Playwright | Recebe array de `{pattern, value, type}` |

### Fluxo de Dados Completo (exemplo: "Outros Nomes")

```
1. SCHEMA define:     otherNamesUsed (radio Y/N) + otherNames (array)
2. FORM-ENGINE:       Solicitante preenche → salva no Supabase como JSON
3. SUPABASE contém:   { personal1: { otherNamesUsed: "Y", otherNames: [{surname:"X", givenName:"Y"}] } }
4. NORMALIZE lê:      personal1.otherNamesUsed → a.otherNamesUsed = true
                       personal1.otherNames → a.otherNames = [{surname:"X", givenName:"Y"}]
5. FIELD-MAP gera:    [{ pattern: /rblOtherNames_0$/, type: "click" },
                       { pattern: /DListAlias_ctl00_tbxSURNAME$/, value: "X", type: "text" }]
6. FILLER executa:    Playwright clica/digita em cada seletor no site oficial
```

---

## 🔍 Como Auditar Corretamente

### ❌ NÃO faça

- **Não compare nomes de campos do schema com nomes do field-map diretamente** — eles são diferentes por design (normalize.js faz a ponte)
- **Não assuma que um campo "falta"** sem buscar em TODOS os arquivos relevantes (schema, field-map, normalize, field-map legado)
- **Não alegue que o projeto não faz algo** sem verificar — o projeto tem 4000+ linhas de schema e 26 field-maps

### ✅ Faça

1. **Identifique a camada**: O bug é no clone (schema/form-engine) ou na automação (normalize/field-map/filler)?
2. **Busque com grep**: Use `grep -r "campo" pages/ public/` antes de afirmar que algo falta
3. **Verifique o normalize.js**: Se o campo existe no schema mas tem nome diferente no field-map, verifique o normalize.js da página correspondente
4. **Teste end-to-end**: O dado flui corretamente do formulário → Supabase → normalize → field-map → site oficial?

### Checklist de Auditoria

Para cada campo, verificar:
- [ ] Existe no `pages/XX/schema.js`?
- [ ] ds160-schema.js compilado tem o campo? (`scripts/build-schema.js`)
- [ ] form-engine.js renderiza corretamente?
- [ ] JSON salvo no Supabase tem o campo?
- [ ] `normalize.js` transforma corretamente?
- [ ] `field-map.js` mapeia para o seletor correto do DS-160?
- [ ] Seletor corresponde ao HTML real em `ds160map/*.html`?

---

## 📋 Skills e Workflows Disponíveis

O projeto tem skills configurados em `.agents/skills/` e workflows em `.agents/workflows/`:

- `/audit-schema` — Auditoria completa de uma seção do schema vs HTML oficial
- `/debug-errors` — Debug de erros da automação usando logs, screenshots e HTML

**USE ESSAS SKILLS** antes de fazer auditorias manuais.

---

## 🚨 Regras Invioláveis

1. **NUNCA remover configurações existentes** — apenas ADICIONAR o que falta
2. **Falar SEMPRE em português do Brasil**
3. **Verificar alinhamento** entre schema, normalize e field-map antes de afirmar que há bug
4. **Testar com dados reais** — o projeto tem perfis de teste em `generated_ds160_profiles_v2.json`
