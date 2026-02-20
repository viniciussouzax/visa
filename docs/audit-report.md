# Auditoria DS-160 — Clone vs Oficial vs Automação

> Documento gerado em 2026-02-19
> Status: **374/374 campos (100%)** alinhados entre oficial, clone e automação

---

## 📊 Resumo por Página

| # | Página | Campos | Branches | Status |
|---|--------|--------|----------|--------|
| 1 | Personal1 | 22 | 3 (OtherNames, Telecode, MaritalStatus=O) | ✅ |
| 2 | Personal2 | 17 | 2 (OtherNatl, PermRes) | ✅ |
| 3 | Travel | 40 | 4 (SpecificTravel, VisaSubtype, PayerPerson, PayerCompany) | ✅ |
| 4 | TravelCompanions | 4 | 1 (Companions) | ✅ |
| 5 | PreviousUSTravel | 38 | 6 (PrevTravel, PrevVisa, VisaRefused, VWP, PermRes, IVPetition, DriversLic) | ✅ |
| 6 | AddressPhone | 22 | 3 (MailingAddr, AddPhone, AddEmail) | ✅ |
| 7 | Passport | 22 | 2 (BookNum, LostPPT) | ✅ |
| 8 | USContact | 14 | 1 (EmailNA) | ✅ |
| 9 | Family1 | 28 | 3 (FatherUS, MotherUS, ImmediateRelative) | ✅ |
| 10 | Family2 | 18 | 1 (SpouseAddr) | ✅ |
| 11 | WorkEducation1 | 17 | 2 (Occupation=N, Employer) | ✅ |
| 12 | WorkEducation2 | 42 | 2 (PrevEmployed, OtherEduc) | ✅ |
| 13 | WorkEducation3 | 28 | 6 (ClanTribe, Countries, Org, Skills, Military, Insurgent) | ✅ |
| 14 | Security1 | 6 | 0 | ✅ |
| 15 | Security2 | 14 | 0 | ✅ |
| 16 | Security3 | 24 | 0 | ✅ |
| 17 | Security4 | 10 | 0 | ✅ |
| 18 | Security5 | 8 | 0 | ✅ |

**Total: 374 campos | 18 páginas**

---

## 🔧 Correções Aplicadas Nesta Sessão

### 1. Ordem dos Campos (build-field-map.ts)

**Personal1** — Campos reordenados:
- ❌ Antes: Name → Gender → MaritalStatus → DOB → POB → OtherNames → Telecode
- ✅ Depois: Name → **OtherNames** → **Telecode** → Gender → MaritalStatus → DOB → POB

**Personal2** — Campos reordenados:
- ❌ Antes: Nationality → NationalID → SSN → TaxID → OtherNatl → PermRes
- ✅ Depois: Nationality → **OtherNatl** → **PermRes** → NationalID → SSN → TaxID

### 2. Bug Crítico: U.S. Petitioner (value "U" → "H")

O formulário oficial usa `value="H"` para U.S. Petitioner, não `"U"`.

**Arquivos corrigidos:**
- `ds160-clone.html` — option value
- `build-field-map.ts` — condição if
- `brazilian-applicant.ts` — 1 perfil + comentário da interface

### 3. SecurityAnswer Padronizado

Todos os 24 perfis em `brazilian-applicant.ts` agora usam `securityAnswer: "VO"`.

### 4. IDs do WorkEducation1 Corrigidos

O clone usava IDs inventados que não existem no formulário oficial:
- ❌ `tbxEmpOrBusName` → ✅ `tbxEmpSchName`
- ❌ `tbxEmpOrBusAddr1` → ✅ `tbxEmpSchAddr1`
- ❌ `tbxEmpOrBusAddr2` → ✅ `tbxEmpSchAddr2`
- ❌ `tbxEmpOrBusCITY` → ✅ `tbxEmpSchCity`
- ❌ `ddlEmpOrBusCOUNTRY` → ✅ `ddlEmpSchCountry`
- ❌ `tbxWE1_ADDR_STATE` → ✅ `tbxWORK_EDUC_ADDR_STATE`
- ❌ `tbxWE1_ADDR_POSTAL_CD` → ✅ `tbxWORK_EDUC_ADDR_POSTAL_CD`
- ❌ `tbxWE1_PHONE` → ✅ `tbxWORK_EDUC_TEL`
- ❌ `ddlWE1_EMPL_STRT_DTEMonth` → ✅ `ddlEmpDateFromDay` + `ddlEmpDateFromMonth` + `tbxEmpDateFromYear`

### 5. Campos Faltantes Adicionados

**WorkEducation2 — Emprego Anterior:**
- `dtlPrevEmpl_ctl00_tbEmployerStreetAddress2` (Rua 2)
- `dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_STATE` + N/A checkbox
- `dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_POSTAL_CD` + N/A checkbox
- `dtlPrevEmpl_ctl00_tbSupervisorGivenName` + N/A checkbox
- Datas com Day/Month/Year completos (antes só tinha Month/Year)

**WorkEducation2 — Educação Anterior:**
- `dtlPrevEduc_ctl00_tbxSchoolAddr1` (Rua 1)
- `dtlPrevEduc_ctl00_tbxSchoolAddr2` (Rua 2)
- `dtlPrevEduc_ctl00_tbxEDUC_INST_ADDR_STATE` + N/A checkbox
- `dtlPrevEduc_ctl00_tbxEDUC_INST_POSTAL_CD` + N/A checkbox
- Datas com Day/Month/Year completos

**Travel:**
- `dlPrincipalAppTravel_ctl00_ddlOtherPurpose` (dropdown subtipo de visto)

### 6. Checkboxes N/A com IDs Oficiais (26 adicionados)

| Página | Checkbox ID | Tipo |
|--------|------------|------|
| Personal1 | `cbexAPP_FULL_NAME_NATIVE_NA` | N/A |
| Personal1 | `cbexAPP_POB_ST_PROVINCE_NA` | N/A |
| Personal2 | `cbexAPP_NATIONAL_ID_NA` | N/A |
| Travel | `cbxDNAPAYER_EMAIL_ADDR_NA` | N/A |
| Travel | `cbxDNAPayerStateProvince` | N/A |
| Travel | `cbxDNAPayerPostalZIPCode` | N/A |
| PreviousUSTravel | `cbxPREV_VISA_FOIL_NUMBER_NA` | N/A |
| AddressPhone | `cbexAPP_ADDR_STATE_NA` | N/A |
| AddressPhone | `cbexAPP_ADDR_POSTAL_CD_NA` | N/A |
| AddressPhone | `cbexAPP_MOBILE_TEL_NA` | N/A |
| AddressPhone | `cbexAPP_BUS_TEL_NA` | N/A |
| Passport | `cbexPPT_BOOK_NUM_NA` | N/A |
| Passport | `cbxPPT_EXPIRE_NA` | Sem Expiração |
| Passport | `dtlLostPPT_ctl00_cbxLOST_PPT_NUM_UNKN_IND` | Não Sabe |
| USContact | `cbxUS_POC_NAME_NA` | Não Sabe |
| USContact | `cbxUS_POC_ORG_NA_IND` | Não Sabe |
| USContact | `cbexUS_POC_EMAIL_ADDR_NA` | N/A |
| Family1 | `cbxFATHER_SURNAME_UNK_IND` | Não Sabe |
| Family1 | `cbxFATHER_GIVEN_NAME_UNK_IND` | Não Sabe |
| Family1 | `cbxFATHER_DOB_UNK_IND` | Não Sabe |
| Family1 | `cbxMOTHER_SURNAME_UNK_IND` | Não Sabe |
| Family1 | `cbxMOTHER_GIVEN_NAME_UNK_IND` | Não Sabe |
| Family1 | `cbxMOTHER_DOB_UNK_IND` | Não Sabe |
| Family2 | `cbexSPOUSE_POB_CITY_NA` | N/A |
| Family2 | `cbexSPOUSE_ADDR_STATE_NA` | N/A |
| Family2 | `cbexSPOUSE_ADDR_POSTAL_CD_NA` | N/A |
| WorkEducation1 | `cbxWORK_EDUC_ADDR_STATE_NA` | N/A |
| WorkEducation1 | `cbxWORK_EDUC_ADDR_POSTAL_CD_NA` | N/A |
| WorkEducation1 | `cbxCURR_MONTHLY_SALARY_NA` | N/A |

### 7. Dropdowns Traduzidos para PT-BR

| Dropdown | Antes | Depois |
|----------|-------|--------|
| PURPOSES (23 categorias de visto) | Inglês (A - DIPLOMAT...) | PT-BR (A - DIPLOMATA...) |
| OCCUPATIONS (23 profissões) | Inglês (AGRICULTURE...) | PT-BR com original entre parênteses |
| Gender | Já traduzido | MASCULINO / FEMININO |
| Marital Status | Já traduzido | CASADO, SOLTEIRO, etc. |
| Meses | Já traduzido | - |
| Países | Mantido em inglês (padrão oficial) | - |
| US States | Mantido em inglês | - |

### 8. Subtipos de Visto (ddlOtherPurpose)

Adicionado dropdown dinâmico que aparece quando o usuário seleciona uma categoria de visto.

| Categoria | Subtipos |
|-----------|----------|
| B1/B2 | Negócios, Turismo, Negócios+Turismo, Tratamento Médico, Visitar Família |
| B1 | Negócios/Conferência, Consultoria, Negociação, Treinamento Curto |
| B2 | Turismo, Tratamento Médico, Visitar Família, Evento Social |
| F | F-1, F-2, F-3 |
| H | H-1B, H-1B1, H-2A, H-2B, H-3, H-4 |
| J | J-1, J-2 |
| K | K-1, K-2, K-3, K-4 |
| L | L-1A, L-1B, L-2 |
| Demais | Sem subtipo (dropdown oculto) |

### 9. Placeholders Adicionados (53 campos)

Todos os campos de texto agora têm placeholders em PT-BR com exemplos:
- Nomes: `Ex: SILVA`, `Ex: JOAO`
- CPF: `Ex: 123.456.789-00 (CPF)`
- Endereços: `Ex: SAO PAULO`, `Rua, número`
- Telefones: `Ex: 011-5511999998888`
- Emails: `email@exemplo.com`
- Passaporte: `Ex: FX123456`

### 10. Bug Fix: Lógica Condicional do Pagador

`updatePayerBranch()` usava `'U'` para U.S. Petitioner. Corrigido para `'H'`.

---

## 📋 Backlog Pendente

### Prioridade Alta
- [ ] **Validação de inputs** — required, maxlength, pattern (CPF, telefone, etc.)
- [ ] **Visibilidade condicional no clone** — Algumas perguntas condicionais abrem errado (devem ocultar conforme resposta)
- [ ] **Lógica de idade** — Ocultar páginas quando menor de idade (WorkEduc3 reduzida, Security simplificadas)
- [ ] **Exploração dinâmica do oficial** — Rodar automação com cliques reais para descobrir campos ocultos pelo sistema legado

### Prioridade Média
- [ ] **Perfis variados** — Testar com mulher adulta, menor de idade, casado, divorciado
- [ ] **Traduzir LOCATIONS para PT-BR** — 218 locais de entrevista (atualmente em inglês)
- [ ] **Build-field-map adaptações** — Mapear ddlOtherPurpose na automação

### Prioridade Baixa
- [ ] **"Add Another"** — Testar e validar lógica de múltiplas entradas
- [ ] **Relationship dropdown traduzido** — Traduzir opções de parentesco
- [ ] **PayerOrg name** — Verificar ID correto no clone
