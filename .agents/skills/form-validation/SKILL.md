---
name: Validação do Formulário Clone DS-160
description: Regras de validação preventiva para o formulário clone (ds160/index.html) — evita erros que travam a automação no site oficial
---

# Validação do Formulário Clone DS-160

Este skill documenta TODAS as regras de validação que devem ser implementadas no formulário clone (`ds160/index.html`) para prevenir erros que causam falha na automação do DS-160 oficial.

## Por que validar no formulário clone?

A automação preenche o DS-160 oficial com os dados do formulário clone. O site oficial tem validações rígidas que **travam** a automação quando os dados estão incorretos. Validar no clone **antes** de salvar no Supabase elimina esses erros preventivamente.

---

## 1. CAMPOS DE TEXTO — Espaços e Caracteres

### 1.1 Leading/Trailing Spaces
- **Regra**: Fazer `.trim()` em TODOS os campos de texto antes de salvar
- **Erro que causa**: `"Surnames - leading spaces found in your entry"`
- **Campos críticos**: Surnames, Given Names, City, State, Street, Organization
- **Implementação**: `value.trim()` no `onchange` ou `onblur` de cada input

### 1.2 Caracteres Especiais Proibidos
- **Regra**: Proibir caracteres: `< > & " ' / \ ; : { } [ ] | ~`
- **Erro que causa**: O DS-160 rejeita caracteres especiais em campos de nome/endereço
- **Campos afetados**: Todos exceto email
- **Permitidos**: Letras (A-Z), números (0-9), espaço, hífen (-), ponto (.), vírgula (,), apóstrofo (')
- **Implementação**: Regex `/^[A-Za-z0-9\s\-\.\,\']+$/` no input

### 1.3 Campos Obrigatórios Vazios
- **Regra**: Validar que todos os campos obrigatórios têm valor antes de permitir avançar seção
- **Campos obrigatórios mínimos por seção**: Ver seção 8

### 1.4 Comprimento Máximo de Campos
| Campo | Máx. caracteres |
|-------|----------------|
| Surname / Given Name | 33 |
| Full Name Native | 100 |
| Street Address | 40 |
| City | 20 |
| State/Province | 20 |
| Postal Code | 10 |
| Phone | 15 |
| Email | 50 |
| Passport Number | 20 |
| Explanation (text areas) | 200 |

---

## 2. DATAS — Validações Lógicas

### 2.1 Data de Nascimento
- **Regra**: Deve ser anterior a hoje
- **Regra**: Ano deve ter 4 dígitos entre 1900 e ano atual
- **Regra**: Idade mínima: 1 ano, máxima: 120 anos
- **Erro encontrado**: `year: "4249"` — ano impossível

### 2.2 Data de Nascimento dos Pais
- **Regra**: Pai/Mãe devem ser mais velhos que o aplicante (DOB anterior)
- **Regra**: Diferença mínima realista: 12 anos
- **Erro encontrado**: `Mother DOB: 1998` com `Applicant DOB: 1992` — mãe mais nova que filho

### 2.3 Data de Emissão do Passaporte
- **Regra**: Deve ser anterior a hoje
- **Regra**: Deve ser posterior à data de nascimento do aplicante

### 2.4 Data de Expiração do Passaporte
- **Regra**: Pode ser futura (passaporte válido) ou passada (passaporte vencido, aceito)
- **Regra**: Deve ser posterior à data de emissão

### 2.5 Datas de Emprego
- **Regra**: Start Date deve ser anterior à End Date
- **Regra**: Start Date não pode ser futura (exceto se emprego atual)

### 2.6 Data de Viagem (Arrival Date)
- **Regra**: Deve ser hoje ou futura
- **Regra**: Deve estar dentro de 1 ano a partir de hoje (razoável)

### 2.7 Formato de Mês
- **Regra**: Usar formato DS-160: { day: "DD", month: "MMM", year: "YYYY" }
- **Valores de mês aceitos**: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
- **Dia**: "01" a "31" (sem zero à esquerda opcionalmente)
- **Ano**: 4 dígitos

---

## 3. PAÍSES E LOCALIDADES

### 3.1 Lista de Países Válidos
- **Regra**: Todos os campos de país devem usar EXATAMENTE os nomes da lista oficial do DS-160
- **Erro encontrado**: `/ddlCountry$/i` com `BANGLADESH` do endereço contaminava Passport
- **Implementação**: Dropdown com lista fixa, NÃO permitir digitação livre

### 3.2 Coerência de Países
- **Regra**: `passport.issuedCountry` e `passport.issuingCountry` devem ser iguais (geralmente)
- **Regra**: `personal2.nationality` deve ser compatível com `passport.issuingCountry`
- **Warning (não bloqueante)**: Se nationality ≠ passport country → avisar usuário ("O DS-160 vai mostrar modal de confirmação")

### 3.3 Endereço — País vs Estado
- **Regra**: Se country = "BRAZIL", state deve ser sigla de estado brasileiro (SP, RJ, MG, etc.)
- **Regra**: Se USContact/Travel, state deve ser sigla de estado US (CA, NY, TX, etc.)

### 3.4 CEP/ZIP Code
- **Regra US**: Exatamente 5 dígitos (ou 5+4 formato: 12345-6789)
- **Erro encontrado**: `ZIP: "8244"` → 4 dígitos, DS-160 rejeitou
- **Fix aplicado**: `padStart(5, '0')` — mas melhor validar no clone

---

## 4. TELEFONES

### 4.1 Formato
- **Regra**: Apenas dígitos, sem espaços, hifens ou parênteses
- **Regra**: Mínimo 7 dígitos, máximo 15 dígitos
- **Regra**: Não começar com 0 (exceto se internacional)
- **Implementação**: `value.replace(/\D/g, '')` no save

### 4.2 Campos de Telefone US
- **Regra**: Exatamente 10 dígitos (formato US sem código de país)
- **Campos**: `usContact.phone`, `travel.payer.phone`

---

## 5. EMAIL

### 5.1 Formato
- **Regra**: Validar com regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Regra**: Sem espaços antes/depois
- **Regra**: DS-160 aceita uppercase (converter para uppercase antes de salvar)

---

## 6. CAMPOS CONDICIONAIS (Do Not Know / N/A)

### 6.1 USContact — Name Do Not Know
- **Regra**: Se checkbox "Do Not Know" marcado → surname e givenName devem ser vazios
- **Regra**: Se surname e givenName vazios → checkbox DEVE ser marcado (auto-detect)
- **Flag no JSON**: `usContact.nameDoNotKnow: true`
- **Erro encontrado**: Campo vazio sem checkbox → DS-160 dá erro "Surnames has not been completed"

### 6.2 USContact — Organization Do Not Know  
- **Flag**: `usContact.orgDoNotKnow: true`
- **Mesma lógica**: Se marcado, não preencher organization

### 6.3 Passport Book Number
- **Regra**: Se não tem book number → checkbox "Does Not Apply" marcado
- **Flag**: Auto-detect se `passport.bookNumber` vazio

### 6.4 Lost Passport Number
- **Regra**: Se não sabe número → checkbox "Do Not Know" marcado
- **Flag**: `lostPassport.numberUnknown: true`

---

## 7. ARRAYS DINÂMICOS (Add Another)

### 7.1 Limite Máximo
- **Regra**: Máximo 5 entries por lista dinâmica para evitar loop infinito
- **Listas**: otherNames, otherNationalities, permanentResidentCountries, lostPassports, socialMedia, companions, countriesVisited, languages, education, previousEmployment, military

### 7.2 Entries Vazias
- **Regra**: Não salvar entries com todos os campos vazios
- **Regra**: Validar que cada entry tem pelo menos os campos obrigatórios preenchidos
- **Exemplo**: `otherNationalities[].country` é obrigatório

---

## 8. CAMPOS OBRIGATÓRIOS POR SEÇÃO

### Personal 1
- [x] surname, givenName, dob (day/month/year), sex, countryOfBirth, cityOfBirth, maritalStatus

### Personal 2  
- [x] nationality

### Address & Phone
- [x] homeAddress.street1, homeAddress.city, homeAddress.country, phone, email
- [x] Pelo menos 1 social media (platform + handle)

### Passport
- [x] type, number, issuingCountry, issuedCountry, issuedCity, issuanceDate, expirationDate

### Travel
- [x] purposeOfTrip, arrivalDate (ou nonSpecificArrival), lengthOfStay, lengthOfStayUnit
- [x] usAddress.street1, usAddress.city, usAddress.state, usAddress.zip

### USContact
- [x] (surname + givenName) OU nameDoNotKnow
- [x] organization OU orgDoNotKnow
- [x] relationship, street1, city, state, zip, phone

### Family
- [x] father.surname, father.givenName, father.dob
- [x] mother.surname, mother.givenName, mother.dob

### Work/Education
- [x] occupation
- [x] Se empregado: employer.name, employer.street1, employer.city, employer.country, employer.phone

### Security
- [x] Todas as 30 perguntas de segurança (padrão: "N")

---

## 9. SSN — Social Security Number

### 9.1 Formato
- **Regra**: Formato `XXX-XX-XXXX` — exatamente 9 dígitos
- **Regra**: Não pode ser `000-XX-XXXX`, `XXX-00-XXXX`, ou `XXX-XX-0000`
- **Regra**: Se não tem SSN, deixar vazio (campo opcional)

---

## 10. CHECKLIST DE IMPLEMENTAÇÃO NO FORMULÁRIO CLONE

Para implementar estas validações no `ds160/index.html`:

1. **No `onblur` de cada campo de texto**: `.trim()` + verificar caracteres proibidos
2. **No botão de avançar seção**: Validar todos os campos obrigatórios da seção
3. **No `onchange` de campos de data**: Validar lógica (futuro/passado, coerência)
4. **No `onchange` de campos de país**: Verificar coerência com outros campos
5. **Antes do save final**: Executar validação completa de todas as seções
6. **Mostrar erros visualmente**: Borda vermelha + mensagem tooltip

### Padrão de Validação Sugerido:
```javascript
function validateField(fieldId, value, rules) {
    const errors = [];
    if (rules.required && !value?.trim()) errors.push('Campo obrigatório');
    if (rules.maxLength && value?.length > rules.maxLength) errors.push(`Máximo ${rules.maxLength} caracteres`);
    if (rules.pattern && !rules.pattern.test(value)) errors.push(rules.patternMessage || 'Formato inválido');
    if (rules.noSpecialChars && /[<>&"'\/\\;:{}[\]|~]/.test(value)) errors.push('Caracteres especiais não permitidos');
    return errors;
}
```

---

## 11. ERROS ENCONTRADOS NA AUTOMAÇÃO (HISTÓRICO)

| Erro | Causa | Seção | Fix Aplicado |
|------|-------|-------|-------------|
| `BANGLADESH` no Passport | `ddlCountry` genérico | Passport | Regex movido |
| `Surnames not completed` | nameDoNotKnow sem checkbox | USContact | Checkbox added |
| `ZIP Code invalid` | 4 chars, precisa 5 | USContact | padStart(5) |
| `Leading spaces` | " GREGER " | Family | .trim() |
| `DOB must be earlier` | year: "4249" | Family | Validar clone |
| `Mother DOB > Applicant` | Mãe 1998 > Filho 1992 | Family | Validar clone |
| `Page stuck` | Modal nationality | Passport | Modal dismiss |
| `Infinite loop` | Add Another sem limite | Vários | Max 5 |
