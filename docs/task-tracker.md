# DS-160 IA - Task Tracker & Exploration Plan

> Documento persistente para rastrear progresso entre sessoes.
> Atualizar sempre que completar uma tarefa ou descobrir algo novo.

---

## Status dos Perfis Testados

| Perfil | Field Map | Status | Paginas | Observacoes |
|--------|-----------|--------|---------|-------------|
| single-male | 180 | PENDENTE | - | 35yo, S, engineer, minimal branches |
| married-female | 211 | PENDENTE | - | 42yo, M, medical, other names, companions, payer O |
| divorced-history | 211 | PENDENTE | - | 48yo, D, business, visa refused, military, payer C |
| widowed-relative-us | 205 | PENDENTE | - | 65yo, W, homemaker, lost passport, relative US |
| complex-all-yes | 253 | OK (Review) | 19 | 38yo, M, lawyer, ALL YES. 5 security pages |
| civil-union-ssn | 198 | OK (Review) | - | 34yo, P, artist, SSN, DL, payer U |
| separated-other | 231 | OK (Review) | - | 52yo, L, government, military, insurgent |
| child-minor | 142 | PENDENTE | - | 8yo, N, menor de idade, parent paying |
| teen-male | 157 | PENDENTE | - | 17yo, student, parent paying, 2 companions |

---

## FASE 1: Exploracao Sistematica por Pagina

### Metodologia
Para CADA pagina do DS-160:
1. Listar TODOS os campos visiveis (radios, selects, texts, checkboxes)
2. Para cada radio Y/N: clicar YES, documentar campos que aparecem
3. Para cada radio Y/N: clicar NO, documentar campos que desaparecem
4. Identificar todos os "Add Another" DataLists
5. Testar Add Another: criar entry, verificar IDs dos novos campos
6. Testar com perfis diferentes (sexo, idade, estado civil)
7. Documentar TUDO em ds160-clone.html e task-tracker.md (Apendice)

### Paginas do DS-160 (ordem de navegacao)

| # | Pagina | URL (aspx) | Status | Campos | Branches (YES → campos) | Add Another |
|---|--------|------------|--------|--------|-------------------------|-------------|
| 1 | Personal1 | complete_personal.aspx | COMPLETO | 23 | rblOtherNames(+2), rblTelecode(+2), MaritalStatus=O(+1 textarea) | DListAlias |
| 2 | Personal2 | complete_personalinfo2.aspx | COMPLETO | 17 | rblOthNatl(+3), rblPermRes(+1) | dtlOTHER_NATL, dtlOthPermResCntry |
| 3 | Travel | complete_travel.aspx | COMPLETO | 10 | rblSpecificTravel(+18), PurposeOfTrip=A(+2 ddlOtherPurpose), Payer=O(+9), Payer=C(+11) | dlPrincipalAppTravel |
| 4 | TravelCompanions | complete_travelcompanions.aspx | COMPLETO | 6 | rblOtherPersons(+2: rblGroupTravel) | dlTravelCompanions |
| 5 | PreviousUSTravel | complete_previousustravel.aspx | COMPLETO | 16 | rblPrevTravel(+9), rblPrevVisa(+16), rblVisaRefused(+1), **rblVWP_DENIAL(+1)**, **rblPERM_RESIDENT(+1)**, rblIVPetition(+1) | dtlPREV_US_VISIT, dtlUS_DRIVER_LICENSE |
| 6 | AddressPhone | complete_contact.aspx | COMPLETO | 24 | rblAddPhone(+1), rblAddEmail(+1) | dtlAddPhone, dtlAddEmail, dtlAddSocial |
| 7 | Passport | complete_pptvisa.aspx | COMPLETO | 24 | rblLostPPT(+4), ddlPPT_TYPE=T(+1 tbxPptOtherExpl), cbxPPT_EXPIRE_NA | dtlLostPPT |
| 8 | USContact | complete_uscontact.aspx | COMPLETO | 11 | **ddlUS_POC_REL=R(+8: addr+phone+email)** | - |
| 9 | Family1 | complete_family.aspx | COMPLETO | 28 | rblFatherUS(+2), rblMotherUS(+2), rblImmedRelative(+5) | dlUSRelatives |
| 10 | Family2 | complete_family2.aspx | COMPLETO | 16 | ddlSpouseAddressType=O(+8: addr completo) | - |
| 11 | PrevSpouse | complete_family4.aspx | PARCIAL | - | (D/W/L only - nao explorado nesta execucao) | - |
| 12 | WorkEducation1 | complete_workeducation1.aspx | COMPLETO | 6 | ddlOccupation=A(+17: employer fields), H(remove 17) | - |
| 13 | WorkEducation2 | complete_workeducation2.aspx | COMPLETO | 8 | rblPrevEmployed(+24), rblOtherEduc(+18) | dtlPrevEmpl, dtlPrevEduc |
| 14 | WorkEducation3 | complete_workeducation3.aspx | COMPLETO | 17 | rblClanTribe(+1), rblCountriesVisited(+1), rblOrganization(+1), rblSkills(+1), rblMilitary(+12), rblInsurgent(+1) | dtlLANGUAGES(+1, verified), dtlCountriesVisited, dtlORGANIZATIONS, dtlMILITARY_SERVICE |
| 15 | Security1 | SecurityandBackground1.aspx | COMPLETO | 10 | 3 radios: Disease, Disorder, Druguser | - |
| 16 | Security2 | SecurityandBackground2.aspx | COMPLETO | 18 | 7 radios: Arrested, Substances, Prostitution, MoneyLaundering, HumanTrafficking(x3) | - |
| 17 | Security3 | SecurityandBackground3.aspx | COMPLETO | 28 | 12 radios: IllegalActivity, Terrorist(x5), Genocide, Torture, Violence, ChildSoldier, ReligiousFreedom, PopulationControls, Transplant | - |
| 18 | Security4 | SecurityandBackground4.aspx | COMPLETO | 14 | 5 radios: RemovalHearing, ImmigrationFraud, FailToAttend, VisaViolation, Deport | - |
| 19 | Security5 | SecurityandBackground5.aspx | COMPLETO | 12 | 4 radios: ChildCustody, VotingViolation, RenounceExp, AttWoReimb | - |
| 20 | Confirm (4 pgs) | various | COMPLETO | 5 cada | Paginas de confirmacao (Personal1, Travel, USContact, Family1) apos Security5 | - |
| 21 | Review | complete_confirm.aspx | COMPLETO | - | - | - |

### Variacoes por Perfil que Afetam Paginas

| Variavel | Valores | Impacto |
|----------|---------|---------|
| Sexo (M/F) | Male, Female | Pode alterar campos em Family2 |
| Idade (<14, 14-15, 16+) | Menor, Teen, Adulto | Menores pulam WE1/WE2/WE3, Security diferente |
| Estado Civil | S, M, C, P, W, D, L, N | M/C/P/W/D/L = Family2 (spouse). D/W/L = PrevSpouse |
| Tipo Visto | B1/B2, F1, H1B, etc | Pode alterar campos em Travel e WE1 |
| Payer | S (self), C (company), O (other), P (employer), U (petitioner) | Diferentes campos de pagamento |

---

## FASE 2: Funcionalidades de Infraestrutura

### 2.1 Recuperacao de Formulario
- [ ] Salvar Application ID em `tmp/application-id.txt` (ja implementado)
- [ ] Implementar logica de "Retrieve Application" na landing page
- [ ] Testar: iniciar form, sair, recuperar, continuar preenchimento
- [ ] Documentar fluxo de recuperacao

### 2.2 Tratamento de Sessao Expirada
- [ ] Detectar redirect para Landing page (session expired)
- [ ] Implementar auto-recovery: recuperar app ID + continuar
- [ ] Testar timeout de sessao

### 2.3 Navegacao e URLs
- [ ] Mapear TODAS as URLs possiveis (aspx?node=XXX)
- [ ] Melhorar `identifyPage()` para cobrir todos os casos
- [ ] Testar navegacao Back (botao Previous)
- [ ] Documentar sequencia de paginas por perfil

### 2.4 Tratamento de Erros
- [ ] ValidationSummary (ja detectado)
- [ ] Red span errors (ja detectado)
- [ ] JavaScript errors no console
- [ ] Postback timeouts
- [ ] Campo com valor invalido (ex: visa foil 9 chars)

---

## FASE 3: Add Another - Cobertura Completa

### Status dos 17 DataLists

| # | DataList | Pagina | handleAddAnother | Deep Explore | Status |
|---|----------|--------|------------------|--------------|--------|
| 1 | DListAlias | Personal1 | SIM | Nao detectado (radios) | OK |
| 2 | dtlOTHER_NATL | Personal2 | NAO | Nao detectado | Pendente |
| 3 | dtlOthPermResCntry | Personal2 | NAO | Nao detectado | Pendente |
| 4 | dlTravelCompanions | TravelCompanions | SIM | Nao detectado | Pendente |
| 5 | dlPrincipalAppTravel | Travel | NAO | Fill+Remove OK | **NOVO** - 2nd purpose of trip |
| 6 | dtlPREV_US_VISIT | PreviousUSTravel | NAO | Nao detectado | Pendente |
| 7 | dtlUS_DRIVER_LICENSE | PreviousUSTravel | NAO | Nao detectado | Pendente |
| 8 | dtlLostPPT | Passport | NAO | Nao detectado | Pendente |
| 9 | dtlAddPhone | AddressPhone | SIM | Nao detectado (radios) | OK |
| 10 | dtlAddEmail | AddressPhone | SIM | Nao detectado (radios) | OK |
| 11 | dtlAddSocial | AddressPhone | SIM | Nao detectado (radios) | OK |
| 12 | dlUSRelatives | Family1 | NAO | Nao detectado | Pendente |
| 13 | dtlPrevEmpl | WorkEducation2 | SIM | Nao detectado (radios) | OK |
| 14 | dtlPrevEduc | WorkEducation2 | SIM | Nao detectado (radios) | OK |
| 15 | dtlCountriesVisited | WorkEducation3 | SIM | Nao detectado (radios) | OK |
| 16 | dtlORGANIZATIONS | WorkEducation3 | NAO | Nao detectado (radios) | Pendente |
| 17 | dtlLANGUAGES | WorkEducation3 | SIM | Fill+Remove OK (+1 campo) | OK |
| 18 | dtlMILITARY_SERVICE | WorkEducation3 | NAO | Nao detectado (radios) | Pendente |

> **Nota**: DataLists como DListAlias, dtlAddPhone, dtlPrevEmpl nao sao detectados pelo deep-explore porque os campos aparecem via radio Y/N (nao via botao Add Another). Os Add Anothers que foram detectados e testados com fill+remove: dlPrincipalAppTravel e dtlLANGUAGES.

---

## FASE 4: Testes de Perfis Restantes

### Prioridade de teste
1. **child-minor** - Menor de idade (8yo) - pula paginas de trabalho/educacao
2. **teen-male** - Adolescente (17yo) - pode ter paginas diferentes
3. **single-male** - Adulto simples - baseline minimo
4. **married-female** - Feminino + casada - testa sexo diferente + payer O
5. **divorced-history** - Divorciado + historico completo - testa PrevSpouse + military
6. **widowed-relative-us** - Viuva + parente nos EUA - testa lost passport + relative

---

## Historico de Sessoes

### Sessao 1 (data desconhecida)
- Criacao inicial do projeto
- Implementacao do fill-form.ts e build-field-map.ts
- Perfil civil-union-ssn testado com sucesso

### Sessao 2 (data desconhecida)
- Perfil separated-other testado com sucesso
- Adicionado suporte a PrevSpouse page
- Fix: spouse address quando addressType="O"

### Sessao 3 (2026-02-15/16)
- Perfil complex-all-yes testado com sucesso (19 paginas, 5 security)
- Descobertos: tbxOTHER_PPT_NUM, rblVWP_DENIAL_IND
- Add Another testado: 2 other names, 2 phones, 2 emails, 2 social, 2 employers, 2 education, 3 languages, 3 countries
- Fix: supervisor NA checkboxes, employer/education day selects e postal codes
- Melhorado diagnosticos: IDs completos, ValidationSummary detection
- Criado este documento de rastreamento

### Sessao 4 (2026-02-15) - Deep Exploration v2
- Criado `scripts/deep-explore.ts` - explorador completo com:
  - Dump de TODOS os campos visiveis por pagina
  - Teste de TODOS os radios Y/N (YES→campos novos→NO para restaurar)
  - Teste de selects com postback (PurposeOfTrip, WhoIsPaying, PPT_TYPE, Occupation, SpouseAddr, etc.)
  - Add Another: click→fill com dados teste→remove entrada para limpar
  - QuickFill com ordem DOM (top→bottom) para avançar corretamente
- TODAS 22 paginas exploradas com sucesso (Personal1 → Review)
- Descobertas novas:
  - **rblPERM_RESIDENT_IND** + tbxPERM_RESIDENT_EXPL (PreviousUSTravel) - campo totalmente novo
  - **tbxVWP_DENIAL_EXPL** (PreviousUSTravel) - textarea que aparece com rblVWP_DENIAL_IND=YES
  - **ddlUS_POC_REL_TO_APP=R** (USContact) - RELATIVE mostra 8 campos extras (endereço+tel+email)
  - **cbxPPT_EXPIRE_NA** (Passport) - checkbox "No Expiration"
  - **tbxPptOtherExpl** (Passport) - textarea quando PPT_TYPE=T (Other/Travel Document)
  - **dlPrincipalAppTravel** (Travel) - Add Another para 2o propósito de viagem
  - Security: 31 radios no total (3+7+12+5+4)
  - Apos Security5: 4 paginas de confirmacao (Personal1,Travel,USContact,Family1 com 5 campos cada)
- Campos adicionados ao field map: permanentResident, permanentResidentExplanation, vwpDenialExplanation
- Chromium: adicionadas flags --disable-infobars --disable-save-password-bubble --disable-notifications

### Proximos Passos
- Completar Add Another para os DataLists pendentes (FASE 3)
- Testar perfis restantes: child-minor, teen-male, single-male, married-female, divorced-history, widowed-relative-us (FASE 4)
- Implementar recuperacao de formulario (FASE 2.1)
- Usar SEMPRE visto B1/B2 (turismo e negocios)

---

## Navegador Correto
**SEMPRE usar Chromium do Playwright** (NAO Google Chrome):
```
Caminho: C:\Users\azuos\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe
Script: tmp\restart-chromium.ps1
Flags: --remote-debugging-port=9222 --user-data-dir=...tmp\chromium-profile --no-first-run
       --disable-infobars --disable-save-password-bubble --disable-notifications
       --disable-features=TranslateUI,AutofillSaveCardBubble,AutofillAddressEnabled
       --no-default-browser-check --enable-automation
```

---

## APENDICE: Mapeamento Completo de Ramificacoes

> Referencia detalhada de todos os campos e branches por pagina.
> Gerado via explore-page.ts. Atualizar conforme novas descobertas.

### Personal1 (complete_personal.aspx)

**Campos Base (17):**
`tbxAPP_SURNAME`, `tbxAPP_GIVEN_NAME`, `tbxAPP_FULL_NAME_NATIVE` (+NA cb), `rblOtherNames` [Y/N], `rblTelecodeQuestion` [Y/N], `ddlAPP_GENDER` [M/F], `ddlAPP_MARITAL_STATUS` [M/C/P/S/W/D/L/O], DOB (day/month/year), `tbxAPP_POB_CITY`, `tbxAPP_POB_ST_PROVINCE` (+NA cb), `ddlAPP_POB_CNTRY` [281 opts, postback]

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblOtherNames` | YES | +2: `DListAlias_ctl00_tbxSURNAME`, `DListAlias_ctl00_tbxGIVEN_NAME` |
| `rblTelecodeQuestion` | YES | +2: `tbxAPP_TelecodeSURNAME`, `tbxAPP_TelecodeGIVEN_NAME` |
| `ddlAPP_MARITAL_STATUS` | O | +1: `tbxOtherMaritalStatus` [textarea] |

### Personal2 (complete_personalcont.aspx)

**Campos Base (13):**
`ddlAPP_NATL` [212 opts], `rblAPP_OTH_NATL_IND` [Y/N], `rblPermResOtherCntryInd` [Y/N], `tbxAPP_NATIONAL_ID` (+NA cb), `tbxAPP_SSN1/SSN2/SSN3` (+NA cb), `tbxAPP_TAX_ID` (+NA cb)

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblAPP_OTH_NATL_IND` | YES | +4: `dtlOTHER_NATL_ctl00_ddlOTHER_NATL` [212], `rblOTHER_PPT_IND` [Y/N], `tbxOTHER_PPT_NUM` |
| `rblPermResOtherCntryInd` | YES | +1: `dtlOthPermResCntry_ctl00_ddlOthPermResCntry` [253] |

### Travel (complete_travel.aspx)

**Campos Base:** `ddlPurposeOfTrip` [26 opts, postback], `ddlOtherPurpose` [sub-tipo, postback], `rblSpecificTravel` [Y/N], `ddlWhoIsPaying` [postback]

**Visa Classes (26):** A, B, C, CNMI, D, E, F, G, H, I, J, K, L, M, NATO, O, P, Q, R, T, TD, U, V
**B Sub-tipos:** B1-B2 (Business/Tourism), B1-CF (Conference), B2-TM (Tourism/Medical)

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblSpecificTravel` | YES | +~18: datas arrival/departure, flights, location, address, state, zip |
| `ddlWhoIsPaying` | O (Other) | +9: `tbxPayerSurname/GivenName/Phone`, `tbxPAYER_EMAIL_ADDR` (+NA), `ddlPayerRelationship`, `rblPayerAddrSameAsInd` |
| `ddlWhoIsPaying` | C (Company) | +11: `tbxPayingCompany`, phone, relation, address fields |
| `ddlWhoIsPaying` | P/U | Campos do empregador (similar a C) |

### TravelCompanions (complete_travelcompanions.aspx)

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblOtherPersonsTravelingWithYou` | YES | +2: `rblGroupTravel` [Y/N] + companion fields (surname, given name, relationship) |
| `rblGroupTravel` | YES | Campos de grupo (nome do grupo) |

### PreviousUSTravel (complete_previousustravel.aspx)

**5 radios Y/N:** `rblPREV_US_TRAVEL_IND`, `rblPREV_VISA_IND`, `rblPREV_VISA_REFUSED_IND`, `rblIV_PETITION_IND`, `rblVWP_DENIAL_IND`

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblPREV_US_TRAVEL_IND` | YES | +9: datas visita, duracao, `rblPREV_US_DRIVER_LIC_IND` [Y/N] |
| `rblPREV_VISA_IND` | YES | +16: datas visto, `tbxPREV_VISA_FOIL_NUMBER` (+NA), same_type, same_country, ten_print, lost, cancelled [Y/N cada] |
| `rblPREV_VISA_REFUSED_IND` | YES | +1: `tbxPREV_VISA_REFUSED_EXPL` [textarea] |
| `rblIV_PETITION_IND` | YES | +1: `tbxIV_PETITION_EXPL` [textarea] |
| `rblVWP_DENIAL_IND` | YES | 0 (apenas registro) |

### AddressPhone (complete_contact.aspx)

**Campos Base (24):** Endereco (street1/2, city, state, postal, country), `rblMailingAddrSame` [Y/N], telefones (home, mobile+NA, business+NA), `rblAddPhone/Email/Social` [Y/N cada], email, social media (22 plataformas)

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblMailingAddrSame` | NO | Campos de mailing address separado |
| `rblAddPhone` | YES | +1: `dtlAddPhone_ctl00_tbxAddPhoneInfo` |
| `rblAddEmail` | YES | +1: `dtlAddEmail_ctl00_tbxAddEmailInfo` |
| `rblAddSocial` | YES | +2: `dtlAddSocial_ctl00_tbxAddSocialPlat/Hand` |

### Passport (Passport_Visa_Info.aspx)

**Campos Base (17):** `ddlPPT_TYPE` [R/O/D/L/T, postback], `tbxPPT_NUM`, `tbxPPT_BOOK_NUM` (+NA), country issued, city/state, dates, `rblLOST_PPT_IND` [Y/N]

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblLOST_PPT_IND` | YES | +4: `dtlLostPPT_ctl00_tbxLOST_PPT_NUM` (+UNK cb), `ddlLOST_PPT_NATL` [217], `tbxLOST_PPT_EXPL` [textarea] |
| `ddlPPT_TYPE` | T (OTHER) | +1: `tbxPptOtherExpl` [textarea] |

### USContact (complete_uscontact.aspx)

**Campos Base (14):** `tbxUS_POC_SURNAME/GIVEN_NAME` (+NA), `tbxUS_POC_ORGANIZATION` (+NA), `ddlUS_POC_REL_TO_APP` [R/S/C/B/P/H/O, postback], endereco US (street1/2, city, state[57], postal), phone, email(+NA)
**Sem ramificacoes Y/N.**

### Family1/Relatives (complete_family1.aspx)

**Campos Base (25):** Pai (nome+UNK, DOB+UNK, `rblFATHER_LIVE_IN_US_IND`), Mae (idem), `rblUS_IMMED_RELATIVE_IND` [Y/N], `rblUS_OTHER_RELATIVE_IND` [Y/N]

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblFATHER_LIVE_IN_US_IND` | YES | +1: `ddlFATHER_US_STATUS` [S/C/P/O] |
| `rblMOTHER_LIVE_IN_US_IND` | YES | +1: `ddlMOTHER_US_STATUS` [S/C/P/O] |
| `rblUS_IMMED_RELATIVE_IND` | YES | +5: `tbxUS_REL_SURNAME/GIVEN_NAME`, `ddlUS_REL_TYPE` [S/F/C/B], `ddlUS_REL_STATUS`. Remove `rblUS_OTHER_RELATIVE_IND` |

### WorkEducation1 (complete_workeducation1.aspx)

**Campos Base (~18 apos ocupacao):** `ddlPresentOccupation` [23 opts, postback], employer fields (name, addr, city, state+NA, postal+NA, country, phone), dates, salary(+NA), duties[textarea]
**Ocupacoes (23):** A, AP, B, CM, CS, C, ED, EN, G, H, L, MD, ML, N, O, RE, RS, RT, SC, SM, ST, T

### WorkEducation2 (complete_workeducation2.aspx)

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblPreviouslyEmployed` | YES | +~24: employer name/addr/city/state/postal/country/phone, job title, supervisor name(+NA), dates, duties |
| `rblOtherEduc` | YES | +~18: school name/addr/city/state/postal/country, course of study, dates |

### WorkEducation3 (complete_workeducation3.aspx)

**Campos Base (13):** `dtlLANGUAGES_ctl00_tbxLANGUAGE_NAME`, 6 radios Y/N

| Trigger | Valor | Novos Campos |
|---|---|---|
| `rblCLAN_TRIBE_IND` | YES | +1: `tbxCLAN_TRIBE_NAME` |
| `rblCOUNTRIES_VISITED_IND` | YES | +1: `ddlCOUNTRIES_VISITED` [253] |
| `rblORGANIZATION_IND` | YES | +1: `tbxORGANIZATION_NAME` |
| `rblSPECIALIZED_SKILLS_IND` | YES | +1: `tbxSPECIALIZED_SKILLS_EXPL` [textarea] |
| `rblMILITARY_SERVICE_IND` | YES | +12: country[213], branch/rank/specialty, dates from/to (day+month+year x2) |
| `rblINSURGENT_ORG_IND` | YES | +1: `tbxINSURGENT_ORG_EXPL` [textarea] |

### Security Pages (5 paginas)

- **Pg1 Saude (3):** `rblDisease`, `rblDisorder`, `rblDruguser`
- **Pg2 Criminal (7):** `rblArrested`, `rblControlledSubstances`, `rblProstitution`, `rblMoneyLaundering`, `rblHumanTrafficking`, `rblAssistedSevereTrafficking`, `rblHumanTraffickingRelated`
- **Pg3 Seg.Nacional (12):** `rblIllegalActivity`, `rblTerroristActivity/Support/Org/Rel`, `rblGenocide`, `rblTorture`, `rblExViolence`, `rblChildSoldier`, `rblReligiousFreedom`, `rblPopulationControls`, `rblTransplant`
- **Pg4 Imigracao (2):** `rblImmigrationFraud`, `rblDeport`
- **Pg5 Diversos (3):** `rblChildCustody`, `rblVotingViolation`, `rblRenounceExp`

> Todas Y/N. Padrao: N. Se YES, provavelmente aparece textarea para explicacao.

### Resumo de Ramificacoes

| Pagina | Radios Y/N | Branches | Max Campos Extras |
|---|---|---|---|
| Personal1 | 2 | 3 | +2 |
| Personal2 | 2 | 2 | +1 a +4 |
| Travel | 1 | 4 | +9 a +18 |
| TravelCompanions | 1 | 1 | +2 |
| PreviousUSTravel | 5 | 5 | +1 a +16 |
| AddressPhone | 4 | 3 | +1 a +2 |
| Passport | 1 | 2 | +1 a +4 |
| USContact | 0 | 0 | 0 |
| Family1 | 4 | 4 | +1 a +5 |
| WorkEducation1 | 0 | 1 | variavel |
| WorkEducation2 | 2 | 2 | +18 a +24 |
| WorkEducation3 | 6 | 6 | +1 a +12 |
| Security (5 pgs) | 27 | todos N | textarea se Y |

**Total: ~54 radios Y/N + ~10 selects com postback = ~64 ramificacoes possiveis**
