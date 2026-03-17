---
name: Validação do Formulário Clone DS-160
description: Regras de validação preventiva para o formulário clone (public/ds160-form.html + form-engine.js) — evita erros que travam a automação no site oficial.
---

# Validação do Formulário Clone DS-160

Regras de validação implementadas no `FormEngine` (classe em `public/form-engine.js`) que previnem erros na automação do DS-160 oficial.

## Por que validar no formulário clone?

A automação preenche o DS-160 oficial com dados do clone. O site oficial tem validações rígidas que **travam** a automação. Validar no clone **antes** de salvar no Supabase elimina esses erros preventivamente.

## Onde as validações vivem

| Componente | Arquivo | Métodos |
|------------|---------|---------|
| Engine | `public/form-engine.js` | `validateSection()`, `validateAll()`, `_setupRealtimeValidation()` |
| Host | `public/ds160-form.html` | `runValidation()`, `showErrors()`, `approveData()` |
| Schema | `public/ds160-schema.js` | `required`, `maxLen`, `noSpecial`, `notFuture` flags |

---

## 1. CAMPOS DE TEXTO

### 1.1 Leading/Trailing Spaces
- **Regra**: `.trim()` em TODOS os campos no `onBlur`
- **Onde**: `FormEngine.onBlur()` — `if (el.value) el.value = el.value.trim()`
- **Erro que evita**: `"Surnames - leading spaces found in your entry"`

### 1.2 Caracteres Especiais Proibidos
- **Regex**: `/<>&"'\/\\;:{}[\]|~/g` (constante `this.SPECIAL`)
- **Onde**: `onInput()` — `if (el.dataset.noSpecial === 'true') val = val.replace(this.SPECIAL, '')`
- **Schema flag**: `noSpecial: true`

### 1.3 Uppercase Obrigatório
- **Regra**: DS-160 requer UPPERCASE em todos os campos de texto
- **Onde**: `onInput()` — `val = val.toUpperCase()` para todos exceto SELECT

### 1.4 Comprimento Máximo
| Campo | maxLen |
|-------|--------|
| Surname / Given Name | 33 |
| Full Name Native | 100 |
| Street Address | 40 |
| City | 20 |
| State/Province | 20 |
| Postal Code | 10 |
| Phone | 15 |
| Email | 50 |
| Passport Number | 20 |
| Visa Number | 12 |
| Explanation (textareas) | 200 |

---

## 2. DATAS

### 2.1 Formato
- **Regra**: Objeto `{ day: "DD", month: "MMM", year: "YYYY" }`
- **Meses aceitos**: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC

### 2.2 Data de Nascimento
- Deve ser anterior a hoje
- Ano 4 dígitos entre 1900 e ano atual
- Erro encontrado: `year: "4249"` — ano impossível

### 2.3 Passaporte
- Emissão: anterior a hoje, posterior ao nascimento
- Expiração: pode ser futura ou passada, mas posterior à emissão

### 2.4 Flag `notFuture`
- Schema flag que `validateSection()` verifica
- Ex: `{ type: "date", notFuture: true }`

---

## 3. CEP e Endereços

### 3.1 Auto-Fill via BrasilAPI
- **Onde**: `FormEngine._checkCepAutoFill()` chamado no `onBlur` de campos `*PostalCode`
- **Trigger**: Qualquer campo com sufixo `PostalCode` + país = BRZL + CEP 8 dígitos
- **API**: `https://brasilapi.com.br/api/cep/v1/{cep}`
- **Preenche**: Street1, Street2 (bairro), City, State

### 3.2 ZIP Code US
- Exatamente 5 dígitos (ou 5+4: `12345-6789`)
- Erro encontrado: `"8244"` (4 dígitos) → DS-160 rejeitou

### 3.3 Masks
- **Phone**: `(XX) XXXXX-XXXX` — campo com `data-mask="phone"`
- **CPF**: `XXX.XXX.XXX-XX` — campo com `data-mask="cpf"`
- **ZIP**: `XXXXX-XXX` — campo com `data-mask="zip"`

---

## 4. N/A e Unknown (DNA / UNKNOWN)

| Flag | Valor salvo | Checkbox | Efeito |
|------|-------------|----------|--------|
| N/A | `"DNA"` | "Não se aplica" | Desabilita campo, limpa valor |
| Unknown | `"UNKNOWN"` | "Não sei" | Desabilita campo, limpa valor |

- Schema flags: `allowNA: true`, `allowUnknown: true`
- Armazenados em: `FormEngine.naFields` (Set), `FormEngine.unknownFields` (Set)
- `removeArrayEntry` limpa e reconstrói os Sets com novos índices

---

## 5. ARRAYS (Add Another)

### 5.1 Limite máximo
- Default: 5 entries. Schema: `maxItems: N`
- Botão "Adicionar" desabilita ao atingir limite

### 5.2 Validação antes de adicionar
- `addArrayEntry()` valida que entry atual tem campos obrigatórios preenchidos antes de criar nova entry
- Entries completamente vazias não são salvas no JSON final

---

## 6. CAMPOS OBRIGATÓRIOS POR SEÇÃO

### Personal 1
- surname, givenName, dob, sex, countryOfBirth, cityOfBirth, maritalStatus

### Personal 2
- nationality

### Address & Phone
- homeCountry, homeStreet1, homeCity, phone, email, 1+ social media

### Passport
- type, number, issuingCountry, issuedCountry, issuedCity, issuanceDate, expirationDate

### Travel
- purposeOfTrip, arrivalDate, lengthOfStay, lengthOfStayUnit, usAddress

### USContact
- (surname + givenName) OU nameDoNotKnow, organization OU orgDoNotKnow, relationship, address, phone

### Family
- father (surname, givenName, dob), mother (surname, givenName, dob)

### Security
- Todas as 30 perguntas (default: "N")

---

## 7. ERROS HISTÓRICOS

| Erro | Causa | Fix |
|------|-------|-----|
| `BANGLADESH` no Passport | `ddlCountry` genérico | Regex com sufixo específico |
| `Surnames not completed` | DNA sem checkbox | Checkbox added |
| `ZIP Code invalid` | 4 chars | padStart(5, '0') + validação |
| `Leading spaces` | " GREGER " | .trim() no onBlur |
| `DOB must be earlier` | year: "4249" | Validação no clone |
| `Page stuck` | Modal nationality | Modal dismiss |
| `Infinite loop` | Add Another sem limite | Max 5 entries |
