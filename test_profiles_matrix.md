# Matriz de Perfis de Teste — DS-160

## Eixos de Variação Identificados no Schema

| Eixo | Opções | Impacto no Formulário |
|------|--------|-----------------------|
| **Localidade** | SPL, BRA, RCF, PTA, (Porto Alegre/Brasilia) | RCF e PTA exigem upload de foto (alert) |
| **Idade** | <14 anos, ≥14 anos | Menor de 14 pula seções de trabalho/educação? (verificar) |
| **Sexo** | M, F | Afeta contexto de cônjuge |
| **Estado Civil** | S, M, C, U, W, D, L, O | M/C/L/U → family2 (cônjuge), W → deceasedSpouse, D → prevSpouse, O → otherMaritalStatusText |
| **Visto** | B (B1/B2), F (F1/F2), J (J1/J2), O (O1) | Muda campos de propósito |
| **Planos viagem** | Y, N | Y → voos/datas/locais, N → estimativa duração |
| **Patrocinador** | S, O, P, U, C | O → dados pessoa, C → dados empresa, S/P/U → sem sub-form |
| **Todos Y** | Sim em todos radios condicionais | Máximo de campos expandidos |
| **Todos N** | Não em todos radios condicionais | Mínimo de campos |

---

## Decisões Condicionais Mapeadas (Radio/Select)

> Cada flag abaixo abre sub-formulários quando = **Y**

| Seção | Campo | Tipo | Sub-campos que abre |
|-------|-------|------|---------------------|
| personal1 | `otherNamesUsed` | radio | array `otherNames` (até 5) |
| personal1 | `telecode` | radio | telecodeGivenName, telecodeSurname |
| personal1 | `maritalStatus` | select | M/C/L/U→family2, W→deceasedSpouse, D→prevSpouse, O→text |
| personal2 | `otherNationality` | radio | array `otherNationalities` (com passaporte condicional) |
| personal2 | `permanentResident` | radio | array `permanentResidentCountries` |
| travel | `hasSpecificPlans` | radio | Y→voos/datas/locais, N→data estimada/duração |
| travel | `whoIsPaying` | select | O→dados pessoa, C→dados empresa |
| travel (payer) | `payerSameAddress` | radio | N→endereço separado |
| travelCompanions | `travelingWithOthers` | radio | Y→partOfGroup |
| travelCompanions | `partOfGroup` | radio | Y→groupName, N→array companions |
| previousUSTravel | `hasBeenInUS` | radio | array previousVisits + hasDriversLicense |
| previousUSTravel | `hasDriversLicense` | radio | array driversLicenses |
| previousUSTravel | `hasUSVisa` | radio | visaDate, number, sameType, sameCountry, tenPrint, visaLost, visCancelled |
| previousUSTravel | `visaLost` | radio | lostVisaYear + explanation |
| previousUSTravel | `visaCancelled` | radio | cancelledExplanation |
| previousUSTravel | `visaRefused` | radio | visaRefusedExplanation |
| previousUSTravel | `immigrantPetition` | radio | immigrantPetitionExplanation |
| addressPhone | `mailingAddressSame` | radio | N→endereço de correspondência separado |
| addressPhone | `additionalPhones` | radio | array additionalPhoneNumbers |
| addressPhone | `additionalEmails` | radio | array additionalEmailAddresses |
| addressPhone | `additionalSocialMedia` | radio | array additionalSocialMediaAccounts |
| passport | `lostOrStolen` | radio | array lostPassports |
| passport | `type` | select | OT→typeExplanation |
| usContact | `contactType` | radio | P→nome pessoa, O→nome organização |
| family1 | `fatherInUS` | radio | Y→fatherUSStatus |
| family1 | `motherInUS` | radio | Y→motherUSStatus |
| family1 | `immediateRelativesInUS` | radio | Y→array relatives, N→otherRelativesInUS |
| family1 | `otherRelativesInUS` | radio | Y→array otherRelatives |
| workEducation1 | `occupation` | select | RT/H/N→pula empregador (aposentado/dona de casa/desempregado) |
| workEducation2 | `hasPreviousEmployment` | radio | Y→array previousEmployment |
| workEducation2 | `hasEducation` | radio | Y→array education |
| workEducation3 | `clanTribe` | radio | Y→clanTribeName |
| workEducation3 | `countriesVisited` | radio | Y→array countriesVisitedList |
| workEducation3 | `organizationMember` | radio | Y→array organizations |
| workEducation3 | `specializedSkills` | radio | Y→explanation |
| workEducation3 | `militaryService` | radio | Y→array military |
| workEducation3 | `insurgentOrg` | radio | Y→explanation |
| security | 13 radios (disease, disorder, drugUser, arrested...) | radio | Y→explanation cada |

---

## 20 Perfis de Teste

### Grupo A: Cobertura Sim/Não

#### P01 — "TUDO SIM" (Coverage Máxima)
| Variável | Valor |
|----------|-------|
| Localidade | SPL |
| Idade | 30 anos (M) |
| Sexo | M |
| Civil | M (Casado) → family2 |
| Visto | B1/B2 |
| Planos | Y |
| Pagador | O (outra pessoa) |
| **Todos radios** | **Y** |
| Arrays | **3 itens cada** |
| Pai/Mãe nos EUA | Y |
| Parentes imediatos | Y (3 itens) |
| Emprego anterior | Y (3 itens) |
| Educação | Y (3 itens) |
| Militar | Y (3 itens) |
| Países visitados | Y (3 itens) |
| Organização | Y (3 itens) |
| Passaporte perdido | Y |
| Visto cancelado | Y |
| Visto recusado | Y |
| Petição imigrante | Y |
| Security | Tudo N (normal) |

#### P02 — "TUDO NÃO" (Coverage Mínima)
| Variável | Valor |
|----------|-------|
| Localidade | BRA |
| Idade | 25 anos (F) |
| Sexo | F |
| Civil | S (Solteiro) → sem family2 |
| Visto | B1/B2 |
| Planos | N |
| Pagador | S (próprio) |
| **Todos radios** | **N** |
| Outros nomes | N |
| Telecode | N |
| Outra nacionalidade | N |
| Residente erm. | N |
| Esteve nos EUA | N |
| Visto anterior | N |
| Corresp. = residência | Y |
| Adicional phones/emails | N |
| Social media | NONE |
| Passaporte perdido | N |
| Parentes | N |
| Emprego anterior | N |
| Educação | N |

#### P03 — "NÃO SE APLICA" (Máximo DNA)
| Variável | Valor |
|----------|-------|
| Localidade | RCF (exige foto) |
| Idade | 45 anos (M) |
| Civil | S |
| Visto | B2 |
| Planos | N |
| Pagador | S |
| fullNameNative | DNA |
| stateOfBirth | DNA |
| SSN | DNA |
| taxId | DNA |
| bookNumber | DNA |
| mobilePhone | DNA |
| businessPhone | DNA |
| usContactEmail | DNA |

---

### Grupo B: Por Estado Civil

#### P04 — Casado (M) + Cônjuge no mesmo endereço
- Civil: **M**, family2: spouseAddressType = **H**
- Demais: planos=N, pagador=S, visto=B1/B2

#### P05 — Casado (M) + Endereço do cônjuge diferente
- Civil: **M**, family2: spouseAddressType = **O** → endereço completo
- Localidade: PTA

#### P06 — União Estável (C)
- Civil: **C** → ativa family2
- Sexo: F

#### P07 — Viúvo(a) (W) → Cônjuge Falecido
- Civil: **W** → ativa `deceasedSpouse`
- Sexo: F, Localidade: BRA

#### P08 — Divorciado(a) (D) → Ex-Cônjuge(s)
- Civil: **D** → ativa `prevSpouse` com 3 ex-cônjuges
- Sexo: M, Localidade: SPL

#### P09 — Separado(a) Legalmente (L)
- Civil: **L** → ativa family2
- Sexo: F

#### P10 — Outro (O) + texto explicativo
- Civil: **O** → ativa `otherMaritalStatusText`
- Sexo: M

---

### Grupo C: Por Tipo de Visto

#### P11 — Visto F1 (Estudante)
- Visto: **F** → **F1**
- Ocupação: Student
- Idade: 20 anos, Civil: S

#### P12 — Visto F2 (Dependente de F1)
- Visto: **F** → **F2**
- Civil: M (cônjuge do F1)

#### P13 — Visto J1 (Intercâmbio)
- Visto: **J** → **J1**
- Idade: 22 anos, Civil: S

#### P14 — Visto O1 (Habilidade Extraordinária)
- Visto: **O** → **O1**
- Com emprego especializado, organizações: Y

---

### Grupo D: Por Localidade

#### P15 — Porto Alegre (PTA) — exige foto
- Localidade: **PTA**, Sexo: F, Civil: S, Visto: B1/B2, Planos: Y

#### P16 — Recife (RCF) — exige foto
- Localidade: **RCF**, Sexo: M, Civil: M, Visto: B1/B2

---

### Grupo E: Por Idade

#### P17 — Menor de 14 anos
- DOB = 2015 (≈11 anos)
- Sexo: M, Civil: S
- Ocupação: N (não trabalha)
- Planos: N, Pagador: O (pais)
- Verificar quais seções são puladas

#### P18 — Maior de 14, jovem (15 anos)
- DOB = 2011
- Sexo: F, Civil: S
- Ocupação: Student

---

### Grupo F: Patrocinador

#### P19 — Pagador = Empresa (C)
- whoIsPaying: **C**
- payerCompanyName, phone, relation, endereço empresa completo

#### P20 — Pagador = Outra pessoa (O) + endereço diferente
- whoIsPaying: **O**
- payerSameAddress: **N**
- Todos dados do pagador pessoa + endereço separado

---

## Resumo de Arrays com 3+ itens

> Todos os perfis marcados com "3 itens cada" devem ter:

| Array | Perfis que usam |
|-------|-----------------|
| `otherNames` (personal1) | P01 |
| `otherNationalities` (personal2, com passaporte) | P01 |
| `permanentResidentCountries` (personal2) | P01 |
| `specificLocations` (travel) | P01, P15 |
| `companions` (travelCompanions) | P01 |
| `previousVisits` (previousUSTravel) | P01 |
| `driversLicenses` (previousUSTravel) | P01 |
| `additionalPhoneNumbers` (addressPhone) | P01 |
| `additionalEmailAddresses` (addressPhone) | P01 |
| `socialMedia` (addressPhone) | P01 |
| `additionalSocialMediaAccounts` (addressPhone) | P01 |
| `lostPassports` (passport) | P01 |
| `relatives` / `otherRelatives` (family1) | P01 |
| `spouses` (prevSpouse) | P08 (3 ex-cônjuges) |
| `previousEmployment` (workEducation2) | P01 |
| `education` (workEducation2) | P01 |
| `languages` (workEducation3) | P01 |
| `countriesVisitedList` (workEducation3) | P01 |
| `organizations` (workEducation3) | P01 |
| `military` (workEducation3) | P01 |

---

## Combinações Críticas a Observar

> [!IMPORTANT]
> Estes são os cruzamentos que mais geram erros na automação:

1. **Civil W + sexo F** → `deceasedSpouse` + campos de falecido
2. **Civil D + 3 ex-cônjuges** → array `prevSpouse.spouses` com datas casamento/término
3. **Plano Y + 3 locais + voos** → `specificLocations` array + arrivalFlight/departureFlight
4. **Pagador O + endereço diferente** → 10+ campos sub-formulário do pagador
5. **Pagador C** → campos empresa diferentes dos campos pessoa
6. **Visto anterior Y + perdido Y + cancelado Y + recusado Y** → 4 sub-forms simultâneos
7. **Menor de 14** → ocupação provavelmente N/Student, verificar seções puladas
8. **Localidade RCF/PTA** → alerta de foto (não bloqueia mas testável)
9. **Passaporte tipo OT** → textarea obrigatório `typeExplanation`
10. **Ocupação RT/H/N** → pula todos campos de empregador (8+ campos)
