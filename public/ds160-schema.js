/**
 * DS-160 SCHEMA — Fonte única de verdade
 * Cada campo é definido aqui. O engine gera form, validação, review e JSON automaticamente.
 * 
 * Tipos suportados: text, select, radio, date, phone, email, textarea, array
 * Modificadores: required, maxLen, noSpecial, uppercase, allowNA, allowUnknown, showWhen, default
 */
const DS160_SCHEMA = {
    sections: [
        // ========== LOCATION ==========
        {
            id: "location",
            label: "Local da Entrevista",
            fields: [
                {
                    id: "location", label: "Local de retirada do visto", type: "select", required: true, ds160: "ddlLocation", options: [
                        { value: "BRA", label: "Brasil - Brasília" },
                        { value: "RIO", label: "Brasil - Rio de Janeiro" },
                        { value: "SAO", label: "Brasil - São Paulo" },
                        { value: "REC", label: "Brasil - Recife" },
                        { value: "POA", label: "Brasil - Porto Alegre" }
                    ]
                }
            ]
        },

        // ========== PERSONAL 1 ==========
        {
            id: "personal1",
            label: "Informações Pessoais 1",
            fields: [
                { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxAPP_SURNAME", hint: "Insira todos os sobrenomes conforme consta no passaporte." },
                { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxAPP_GIVEN_NAME", hint: "Se o passaporte não tiver nome, insira \"FNU\"." },
                { id: "fullNameNative", label: "Nome completo no alfabeto nativo", type: "text", required: true, maxLen: 100, allowNA: true, ds160: "tbxAPP_FULL_NAME_NATIVE", hint: "Escreva seu nome completo no alfabeto do seu país." },
                { id: "otherNamesUsed", label: "Já usou outros nomes?", type: "radio", required: true, ds160: "rblOtherNames", hint: "Inclui nome de solteiro(a), nome religioso, profissional, apelido ou qualquer outro nome pelo qual você é ou foi conhecido(a)." },
                {
                    id: "otherNames", label: "Outros nomes", type: "array", maxItems: 5, showWhen: { field: "otherNamesUsed", equals: "Y" }, ds160List: "DListAlias", fields: [
                        { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxSURNAME" },
                        { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxGIVEN_NAME" }
                    ]
                },
                { id: "telecode", label: "Possui telecode?", type: "radio", required: true, ds160: "rblTelecodeQuestion", hint: "Telecodes são códigos numéricos de 4 dígitos que representam caracteres em nomes com alfabeto não-romano. Se não souber, selecione Não." },
                { id: "telecodeSurname", label: "Telecode do Sobrenome", type: "text", maxLen: 20, showWhen: { field: "telecode", equals: "Y" }, ds160: "tbxAPP_TelecodeSURNAME" },
                { id: "telecodeGivenName", label: "Telecode do Nome", type: "text", maxLen: 20, showWhen: { field: "telecode", equals: "Y" }, ds160: "tbxAPP_TelecodeGIVEN_NAME" },
                {
                    id: "sex", label: "Sexo", type: "select", required: true, ds160: "ddlAPP_GENDER", options: [
                        { value: "M", label: "Masculino" }, { value: "F", label: "Feminino" }
                    ]
                },
                {
                    id: "maritalStatus", label: "Estado Civil", type: "select", required: true, ds160: "ddlAPP_MARITAL_STATUS", options: [
                        { value: "M", label: "Casado(a)" },
                        { value: "C", label: "União Estável" },
                        { value: "U", label: "União Civil/Parceria Doméstica" },
                        { value: "S", label: "Solteiro(a)" },
                        { value: "W", label: "Viúvo(a)" },
                        { value: "D", label: "Divorciado(a)" },
                        { value: "L", label: "Separado(a) Legalmente" },
                        { value: "O", label: "Outro" }
                    ]
                },
                { id: "otherMaritalStatusText", label: "Especifique estado civil", type: "text", maxLen: 40, showWhen: { field: "maritalStatus", equals: "O" }, ds160: "tbxOtherMaritalStatus" },
                { id: "dob", label: "Data de Nascimento", type: "date", required: true, notFuture: true, ds160day: "ddlDOBDay", ds160month: "ddlDOBMonth", ds160year: "tbxDOBYear", hint: "Formato: DD-MMM-AAAA. Se dia ou mês desconhecido, insira conforme consta no passaporte." },
                { id: "cityOfBirth", label: "Cidade de Nascimento", type: "text", required: true, maxLen: 20, noSpecial: true, ds160: "tbxAPP_POB_CITY" },
                { id: "stateOfBirth", label: "Estado/Província de Nascimento", type: "text", maxLen: 20, noSpecial: true, allowNA: true, ds160: "tbxAPP_POB_ST_PROVINCE" },
                { id: "countryOfBirth", label: "País de Nascimento", type: "select", required: true, ds160: "ddlAPP_POB_CNTRY", optionsRef: "countries", hint: "Selecione o nome atualmente usado para o local onde você nasceu." }
            ]
        },

        // ========== PERSONAL 2 ==========
        {
            id: "personal2",
            label: "Informações Pessoais 2",
            fields: [
                { id: "nationality", label: "Nacionalidade", type: "select", required: true, ds160: "ddlAPP_NATL", optionsRef: "countries" },
                { id: "otherNationality", label: "Possui outra nacionalidade?", type: "radio", required: true, ds160: "rblAPP_OTH_NATL_IND", hint: "Informe todas as nacionalidades que possui atualmente e todas que já possuiu, independente de ter renunciado formalmente ou não." },
                {
                    id: "otherNationalities", label: "Outras nacionalidades", type: "array", maxItems: 5, showWhen: { field: "otherNationality", equals: "Y" }, ds160List: "dtlOTHER_NATL", fields: [
                        { id: "country", label: "País", type: "select", required: true, ds160: "ddlOTHER_NATL", optionsRef: "countries" },
                        { id: "hasPassport", label: "Possui passaporte desse país?", type: "radio", required: true, ds160: "rblOTHER_PPT_IND" },
                        { id: "passportNumber", label: "Número do passaporte", type: "text", maxLen: 20, showWhen: { field: "hasPassport", equals: "Y" }, ds160: "tbxOTHER_PPT_NUM" }
                    ]
                },
                { id: "permanentResident", label: "É residente permanente de outro país?", type: "radio", required: true, ds160: "rblPermResOtherCntryInd", hint: "Residente permanente é qualquer pessoa que recebeu de um país permissão legal para viver e trabalhar sem limitação de tempo naquele país." },
                {
                    id: "permanentResidentCountries", label: "Países de residência permanente", type: "array", maxItems: 5, showWhen: { field: "permanentResident", equals: "Y" }, ds160List: "dtlOthPermResCntry", fields: [
                        { id: "country", label: "País", type: "select", required: true, ds160: "ddlOthPermResCntry", optionsRef: "countries" }
                    ]
                },
                { id: "nationalId", label: "Identidade Nacional / CPF", type: "text", required: true, maxLen: 20, allowNA: true, ds160: "tbxAPP_NATIONAL_ID", hint: "Número único fornecido pelo seu governo (ex: CPF para brasileiros). Marque 'Não se Aplica' se não possuir." },
                { id: "ssn", label: "Número do Seguro Social (SSN) dos EUA", type: "text", maxLen: 11, allowNA: true, ds160: "tbxAPP_SSN", hint: "Apenas se já possuiu ou possui SSN americano." },
                { id: "taxId", label: "Número de Contribuinte dos EUA", type: "text", maxLen: 20, allowNA: true, ds160: "tbxAPP_TAX_ID", hint: "Apenas se já possuiu ou possui número de contribuinte (ITIN/EIN) nos EUA." }
            ]
        },

        // ========== PASSPORT ==========
        {
            id: "passport",
            label: "Passaporte",
            fields: [
                {
                    id: "type", label: "Tipo de Passaporte", type: "select", required: true, ds160: "ddlPPT_TYPE", options: [
                        { value: "R", label: "Regular" }, { value: "D", label: "Diplomático" },
                        { value: "O", label: "Oficial" }, { value: "L", label: "Laissez-Passer" },
                        { value: "OT", label: "Outro" }
                    ]
                },
                { id: "typeExplanation", label: "Explique outro tipo", type: "text", maxLen: 40, showWhen: { field: "type", equals: "OT" }, ds160: "tbxPptOtherExpl" },
                { id: "number", label: "Número do Passaporte", type: "text", required: true, maxLen: 20, ds160: "tbxPPT_NUM", hint: "Insira exatamente como consta no passaporte, incluindo letras e números." },
                { id: "bookNumber", label: "Número do Livro do Passaporte", type: "text", maxLen: 20, allowNA: true, ds160: "tbxPPT_BOOK_NUM", hint: "O número do livro pode estar impresso na contracapa do passaporte. Marque 'Não se Aplica' se não houver." },
                { id: "issuingCountry", label: "País de Emissão", type: "select", required: true, ds160: "ddlPPT_ISSUED_CNTRY", optionsRef: "countries" },
                { id: "issuedCity", label: "Cidade de Emissão", type: "text", required: true, maxLen: 20, noSpecial: true, ds160: "tbxPPT_ISSUED_IN_CITY" },
                { id: "issuedState", label: "Estado/Província de Emissão", type: "text", maxLen: 20, noSpecial: true, ds160: "tbxPPT_ISSUED_IN_STATE" },
                { id: "issuedCountry", label: "País onde foi emitido", type: "select", required: true, ds160: "ddlPPT_ISSUED_IN_CNTRY", optionsRef: "countries" },
                { id: "issuanceDate", label: "Data de Emissão", type: "date", required: true, ds160day: "ddlPPT_ISSUED_DTEDay", ds160month: "ddlPPT_ISSUED_DTEMonth", ds160year: "tbxPPT_ISSUEDYear", hint: "Data em que o passaporte foi emitido." },
                { id: "expirationDate", label: "Data de Expiração", type: "date", required: true, allowNA: true, ds160day: "ddlPPT_EXPIRE_DTEDay", ds160month: "ddlPPT_EXPIRE_DTEMonth", ds160year: "tbxPPT_EXPIREYear", hint: "Marque 'Não se Aplica' se o passaporte não tiver data de expiração." },
                { id: "lostOrStolen", label: "Já perdeu passaporte ou teve roubado?", type: "radio", required: true, ds160: "rblLOST_PPT_IND", hint: "Inclui todos os passaportes anteriores, não apenas o atual." },
                {
                    id: "lostPassports", label: "Passaportes perdidos/roubados", type: "array", maxItems: 5, showWhen: { field: "lostOrStolen", equals: "Y" }, ds160List: "dtlLostPPT", fields: [
                        { id: "number", label: "Número", type: "text", required: true, maxLen: 20, ds160: "tbxLOST_PPT_NUM" },
                        { id: "country", label: "País", type: "select", required: true, ds160: "ddlLOST_PPT_NATL", optionsRef: "countries" },
                        { id: "explanation", label: "Explique", type: "textarea", required: true, maxLen: 200, ds160: "tbxLOST_PPT_EXPL" }
                    ]
                }
            ]
        },

        // ========== TRAVEL ==========
        {
            id: "travel",
            label: "Viagem",
            fields: [
                {
                    id: "purposeCategory", label: "Categoria do Visto", type: "select", required: true, ds160: "ddlPurposeOfTrip", options: [
                        { value: "B", label: "BUSINESS/PERSONAL (B1/B2)" },
                        { value: "F", label: "STUDENT/ACADEMIC (F1)" },
                        { value: "J", label: "EXCHANGE VISITOR (J1)" },
                        { value: "H", label: "TEMPORARY WORKER (H)" },
                        { value: "C", label: "TRANSIT (C)" },
                        { value: "CW", label: "TRANSITIONAL WORKER (CW)" },
                        { value: "D", label: "CREWMEMBER (D)" },
                        { value: "E", label: "TREATY TRADER/INVESTOR (E)" },
                        { value: "I", label: "FOREIGN MEDIA REP (I)" },
                        { value: "K", label: "FIANCE(E) OR SPOUSE (K)" },
                        { value: "L", label: "INTRACOMPANY TRANSFEREE (L)" },
                        { value: "M", label: "VOCATIONAL/NONACADEMIC (M)" },
                        { value: "O", label: "EXTRAORDINARY ABILITY (O)" },
                        { value: "P", label: "ATHLETES/ARTISTS/ENTERTAINERS (P)" },
                        { value: "Q", label: "CULTURAL EXCHANGE VST (Q)" },
                        { value: "R", label: "RELIGIOUS WORKER (R)" },
                        { value: "TD", label: "TN/TD PROFESSIONALS" },
                        { value: "T", label: "VICTIM OF TRAFFICKING (T)" },
                        { value: "U", label: "CRIME VICTIM (U)" },
                        { value: "OTHER", label: "OUTRO" }
                    ]
                },
                {
                    id: "purposeOfTrip", label: "Tipo de Visto Específico", type: "select", required: true, ds160: "ddlOtherPurpose", options: [
                        { value: "B1/B2", label: "B1/B2 - Negócios e Turismo" },
                        { value: "B1", label: "B1 - Negócios" },
                        { value: "B2", label: "B2 - Turismo" },
                        { value: "F1", label: "F1 - Estudante" },
                        { value: "J1", label: "J1 - Visitante de Intercâmbio" },
                        { value: "C1/D", label: "C1/D - Tripulante" }
                    ]
                },
                { id: "hasSpecificPlans", label: "Possui planos específicos de viagem?", type: "radio", required: true, ds160: "rblSpecificTravel", hint: "Se já tem datas, voos e locais definidos, selecione Sim. Caso contrário, selecione Não e informe uma estimativa." },
                // Specific plans fields
                { id: "arrivalDate", label: "Data de Chegada", type: "date", showWhen: { field: "hasSpecificPlans", equals: "Y" }, ds160day: "ddlARRIVAL_US_DTEDay", ds160month: "ddlARRIVAL_US_DTEMonth", ds160year: "tbxARRIVAL_US_DTEYear" },
                { id: "arrivalFlight", label: "Voo de Chegada", type: "text", maxLen: 20, showWhen: { field: "hasSpecificPlans", equals: "Y" }, ds160: "tbxArriveFlight" },
                { id: "arrivalCity", label: "Cidade de Chegada", type: "text", maxLen: 20, showWhen: { field: "hasSpecificPlans", equals: "Y" }, ds160: "tbxArriveCity" },
                { id: "departureDate", label: "Data de Partida", type: "date", showWhen: { field: "hasSpecificPlans", equals: "Y" }, ds160day: "ddlDEPARTURE_US_DTEDay", ds160month: "ddlDEPARTURE_US_DTEMonth", ds160year: "tbxDEPARTURE_US_DTEYear" },
                { id: "departureFlight", label: "Voo de Partida", type: "text", maxLen: 20, showWhen: { field: "hasSpecificPlans", equals: "Y" }, ds160: "tbxDepartFlight" },
                { id: "departureCity", label: "Cidade de Partida", type: "text", maxLen: 20, showWhen: { field: "hasSpecificPlans", equals: "Y" }, ds160: "tbxDepartCity" },
                {
                    id: "specificLocations", label: "Locais nos EUA", type: "array", maxItems: 5, showWhen: { field: "hasSpecificPlans", equals: "Y" }, ds160List: "dtlTravelLoc", fields: [
                        { id: "location", label: "Local", type: "text", required: true, maxLen: 40, ds160: "tbxSPECTRAVEL_LOCATION" }
                    ]
                },
                // Non-specific fields
                { id: "nonSpecificArrival", label: "Data prevista de chegada", type: "date", showWhen: { field: "hasSpecificPlans", equals: "N" }, ds160day: "ddlARRIVAL_US_NSDTEDay", ds160month: "ddlARRIVAL_US_NSDTEMonth", ds160year: "tbxARRIVAL_US_NSDTEYear" },
                { id: "lengthOfStay", label: "Tempo de permanência", type: "text", required: true, maxLen: 3, showWhen: { field: "hasSpecificPlans", equals: "N" }, ds160: "tbxAPP_LOS" },
                {
                    id: "lengthOfStayUnit", label: "Unidade", type: "select", required: true, showWhen: { field: "hasSpecificPlans", equals: "N" }, ds160: "ddlAPP_LOS_CD", options: [
                        { value: "D", label: "Dias" }, { value: "W", label: "Semanas" },
                        { value: "M", label: "Meses" }, { value: "Y", label: "Anos" }
                    ]
                },
                // US Address
                { id: "usAddressStreet1", label: "Endereço nos EUA - Linha 1", type: "text", required: true, maxLen: 40, ds160: "tbxStreetAddress1" },
                { id: "usAddressStreet2", label: "Endereço nos EUA - Linha 2", type: "text", maxLen: 40, ds160: "tbxStreetAddress2" },
                { id: "usAddressCity", label: "Cidade nos EUA", type: "text", required: true, maxLen: 20, ds160: "tbxCity" },
                { id: "usAddressState", label: "Estado nos EUA", type: "select", required: true, ds160: "ddlTravelState", optionsRef: "usStates" },
                { id: "usAddressZip", label: "CEP nos EUA", type: "text", required: true, maxLen: 10, ds160: "tbZIPCode" },
                // Payer
                {
                    id: "whoIsPaying", label: "Quem paga a viagem?", type: "select", required: true, ds160: "ddlWhoIsPaying", hint: "Selecione quem irá custear os gastos da viagem aos EUA.", options: [
                        { value: "SELF", label: "O próprio solicitante" },
                        { value: "OTH", label: "Outra pessoa" },
                        { value: "COM", label: "Empresa/Organização" },
                        { value: "OTHR_COM_ORG", label: "Outra empresa" }
                    ]
                },
                { id: "payerSurname", label: "Sobrenome do pagador", type: "text", maxLen: 33, noSpecial: true, showWhen: { field: "whoIsPaying", equals: "OTH" }, ds160: "tbxPayerSurname" },
                { id: "payerGivenName", label: "Nome do pagador", type: "text", maxLen: 33, noSpecial: true, showWhen: { field: "whoIsPaying", equals: "OTH" }, ds160: "tbxPayerGivenName" },
                { id: "payerPhone", label: "Telefone do pagador", type: "phone", showWhen: { field: "whoIsPaying", equals: "OTH" }, ds160: "tbxPayerPhone" },
                { id: "payerEmail", label: "Email do pagador", type: "email", maxLen: 50, showWhen: { field: "whoIsPaying", equals: "OTH" }, ds160: "tbxPAYER_EMAIL_ADDR" },
                { id: "payerRelationship", label: "Relação com o pagador", type: "select", showWhen: { field: "whoIsPaying", equals: "OTH" }, ds160: "ddlPayerRelationship", optionsRef: "relationships" },
                { id: "payerCompanyName", label: "Nome da empresa pagadora", type: "text", maxLen: 33, showWhen: { field: "whoIsPaying", equals: "COM" }, ds160: "tbxPayingCompany" },
                { id: "payerCompanyPhone", label: "Telefone da empresa", type: "phone", showWhen: { field: "whoIsPaying", equals: "COM" }, ds160: "tbxPayerPhoneC" },
                { id: "payerCompanyRelation", label: "Relação com a empresa", type: "text", maxLen: 40, showWhen: { field: "whoIsPaying", equals: "COM" }, ds160: "tbxCompanyRelation" }
            ]
        },

        // ========== TRAVEL COMPANIONS ==========
        {
            id: "travelCompanions",
            label: "Acompanhantes de Viagem",
            fields: [
                { id: "travelingWithOthers", label: "Viaja com outras pessoas?", type: "radio", required: true, ds160: "rblOtherPersonsTravelingWithYou", hint: "Inclua familiares, amigos ou qualquer pessoa que viajará junto com você." },
                { id: "partOfGroup", label: "Faz parte de um grupo?", type: "radio", showWhen: { field: "travelingWithOthers", equals: "Y" }, ds160: "rblGroupTravel", hint: "Selecione Sim se estiver viajando como parte de um grupo ou organização." },
                { id: "groupName", label: "Nome do grupo", type: "text", maxLen: 40, showWhen: { field: "partOfGroup", equals: "Y" }, ds160: "tbxGroupName", hint: "Informe o nome do grupo com o qual você está viajando." },
                {
                    id: "companions", label: "Acompanhantes", type: "array", maxItems: 5, showWhen: { field: "travelingWithOthers", equals: "Y" }, ds160List: "dlTravelCompanions", fields: [
                        { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxTC_SURNAME" },
                        { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxTC_GIVEN_NAME" },
                        { id: "relationship", label: "Relação", type: "select", required: true, ds160: "ddlTCRelationship", optionsRef: "relationships" }
                    ]
                }
            ]
        },

        // ========== PREVIOUS US TRAVEL ==========
        {
            id: "previousUSTravel",
            label: "Viagens Anteriores aos EUA",
            fields: [
                { id: "hasBeenInUS", label: "Já esteve nos EUA?", type: "radio", required: true, ds160: "rblPREV_US_TRAVEL_IND", hint: "Informe se já visitou os Estados Unidos em qualquer momento." },
                {
                    id: "previousVisits", label: "Visitas anteriores", type: "array", maxItems: 5, showWhen: { field: "hasBeenInUS", equals: "Y" }, ds160List: "dtlPREV_US_VISIT", fields: [
                        { id: "arrivalDate", label: "Data de chegada", type: "date", required: true, ds160day: "ddlPREV_US_VISIT_DTEDay", ds160month: "ddlPREV_US_VISIT_DTEMonth", ds160year: "tbxPREV_US_VISIT_DTEYear" },
                        { id: "lengthOfStay", label: "Tempo de permanência", type: "text", required: true, maxLen: 3, ds160: "tbxPREV_US_VISIT_LOS" },
                        {
                            id: "lengthOfStayUnit", label: "Período", type: "select", required: true, ds160: "ddlPREV_US_VISIT_LOS_CD", options: [
                                { value: "D", label: "Dias" }, { value: "W", label: "Semanas" }, { value: "M", label: "Meses" }, { value: "Y", label: "Anos" }
                            ]
                        }
                    ]
                },
                { id: "hasDriversLicense", label: "Já teve carteira de motorista nos EUA?", type: "radio", required: true, showWhen: { field: "hasBeenInUS", equals: "Y" }, ds160: "rblPREV_US_DRIVER_LIC_IND" },
                {
                    id: "driversLicenses", label: "Carteiras de motorista", type: "array", maxItems: 5, showWhen: { field: "hasDriversLicense", equals: "Y" }, ds160List: "dtlUS_DRIVER_LICENSE", fields: [
                        { id: "number", label: "Número", type: "text", required: true, maxLen: 20, ds160: "tbxUS_DRIVER_LICENSE" },
                        { id: "state", label: "Estado", type: "select", required: true, ds160: "ddlUS_DRIVER_LICENSE_STATE", optionsRef: "usStates" }
                    ]
                },
                { id: "hasUSVisa", label: "Já teve visto americano?", type: "radio", required: true, ds160: "rblPREV_VISA_IND", hint: "Selecione Sim se já obteve qualquer tipo de visto americano anteriormente." },
                { id: "previousVisaIssueDate", label: "Data de emissão do visto anterior", type: "date", showWhen: { field: "hasUSVisa", equals: "Y" }, ds160day: "ddlPREV_VISA_ISSUED_DTEDay", ds160month: "ddlPREV_VISA_ISSUED_DTEMonth", ds160year: "tbxPREV_VISA_ISSUED_DTEYear" },
                { id: "previousVisaNumber", label: "Número do visto anterior", type: "text", maxLen: 20, showWhen: { field: "hasUSVisa", equals: "Y" }, ds160: "tbxPREV_VISA_FOIL_NUMBER", hint: "Número de 8 dígitos em vermelho no visto. Marque 'Não Sei' se não souber." },
                { id: "sameVisaType", label: "Mesmo tipo de visto?", type: "radio", showWhen: { field: "hasUSVisa", equals: "Y" }, ds160: "rblPREV_VISA_SAME_TYPE_IND", hint: "Está solicitando o mesmo tipo de visto que o anterior?" },
                { id: "sameCountry", label: "Mesmo país de emissão?", type: "radio", showWhen: { field: "hasUSVisa", equals: "Y" }, ds160: "rblPREV_VISA_SAME_CNTRY_IND", hint: "Está solicitando no mesmo país onde o visto anterior foi emitido?" },
                { id: "tenPrint", label: "Já forneceu impressões digitais?", type: "radio", showWhen: { field: "hasUSVisa", equals: "Y" }, ds160: "rblPREV_VISA_TEN_PRINT_IND" },
                { id: "visaLost", label: "Visto perdido ou roubado?", type: "radio", showWhen: { field: "hasUSVisa", equals: "Y" }, ds160: "rblPREV_VISA_LOST_IND" },
                { id: "lostVisaYear", label: "Ano da perda", type: "text", maxLen: 4, showWhen: { field: "visaLost", equals: "Y" }, ds160: "tbxLOST_VISA_YEAR" },
                { id: "lostVisaExplanation", label: "Explique a perda", type: "textarea", maxLen: 200, showWhen: { field: "visaLost", equals: "Y" }, ds160: "tbxLOST_VISA_EXPL" },
                { id: "visaCancelled", label: "Visto já foi cancelado/revogado?", type: "radio", showWhen: { field: "hasUSVisa", equals: "Y" }, ds160: "rblPREV_VISA_CANCELLED_IND" },
                { id: "cancelledExplanation", label: "Explique o cancelamento", type: "textarea", maxLen: 200, showWhen: { field: "visaCancelled", equals: "Y" }, ds160: "tbxCANCELLED_VISA_EXPL" },
                { id: "visaRefused", label: "Já teve visto negado?", type: "radio", required: true, ds160: "rblPREV_VISA_REFUSED_IND", hint: "Inclui recusa de visto, recusa de admissão nos EUA, ou retirada de solicitação no porto de entrada." },
                { id: "visaRefusedExplanation", label: "Explique a negativa", type: "textarea", maxLen: 200, showWhen: { field: "visaRefused", equals: "Y" }, ds160: "tbxPREV_VISA_REFUSED_EXPL" },
                { id: "immigrantPetition", label: "Alguém já entrou com petição de imigração?", type: "radio", required: true, ds160: "rblIV_PETITION_IND", hint: "Alguém já apresentou uma petição de imigrante em seu nome junto ao Serviço de Cidadania e Imigração dos EUA (USCIS)?" },
                { id: "immigrantPetitionExplanation", label: "Explique a petição", type: "textarea", maxLen: 200, showWhen: { field: "immigrantPetition", equals: "Y" }, ds160: "tbxIV_PETITION_EXPL" }
            ]
        },

        // ========== ADDRESS & PHONE ==========
        {
            id: "addressPhone",
            label: "Endereço e Telefone",
            fields: [
                { id: "homeStreet1", label: "Endereço residencial - Linha 1", type: "text", required: true, maxLen: 40, ds160: "tbxAPP_ADDR_LN1" },
                { id: "homeStreet2", label: "Endereço residencial - Linha 2", type: "text", maxLen: 40, ds160: "tbxAPP_ADDR_LN2" },
                { id: "homeCity", label: "Cidade", type: "text", required: true, maxLen: 20, noSpecial: true, ds160: "tbxAPP_ADDR_CITY" },
                { id: "homeState", label: "Estado/Província", type: "text", required: true, maxLen: 20, noSpecial: true, ds160: "tbxAPP_ADDR_STATE" },
                { id: "homePostalCode", label: "CEP", type: "text", required: true, maxLen: 10, ds160: "tbxAPP_ADDR_POSTAL_CD" },
                { id: "homeCountry", label: "País", type: "select", required: true, ds160: "ddlCountry", optionsRef: "countries" },
                { id: "mailingAddressSame", label: "Endereço de correspondência é o mesmo?", type: "radio", required: true, ds160: "rblMailingAddrSame" },
                { id: "mailStreet1", label: "Endereço corresp. - Linha 1", type: "text", maxLen: 40, showWhen: { field: "mailingAddressSame", equals: "N" }, ds160: "tbxMAILING_ADDR_LN1" },
                { id: "mailStreet2", label: "Endereço corresp. - Linha 2", type: "text", maxLen: 40, showWhen: { field: "mailingAddressSame", equals: "N" }, ds160: "tbxMAILING_ADDR_LN2" },
                { id: "mailCity", label: "Cidade (corresp.)", type: "text", maxLen: 20, showWhen: { field: "mailingAddressSame", equals: "N" }, ds160: "tbxMAILING_ADDR_CITY" },
                { id: "mailState", label: "Estado (corresp.)", type: "text", maxLen: 20, showWhen: { field: "mailingAddressSame", equals: "N" }, ds160: "tbxMAILING_ADDR_STATE" },
                { id: "mailPostalCode", label: "CEP (corresp.)", type: "text", maxLen: 10, showWhen: { field: "mailingAddressSame", equals: "N" }, ds160: "tbxMAILING_ADDR_POSTAL_CD" },
                { id: "mailCountry", label: "País (corresp.)", type: "select", showWhen: { field: "mailingAddressSame", equals: "N" }, ds160: "ddlMailCountry", optionsRef: "countries" },
                { id: "phone", label: "Telefone residencial", type: "phone", required: true, ds160: "tbxAPP_HOME_TEL", hint: "Formato internacional: código do país + DDD + número. Ex: 011-5511999998888" },
                { id: "mobilePhone", label: "Celular", type: "phone", required: true, ds160: "tbxAPP_MOBILE_TEL" },
                { id: "businessPhone", label: "Telefone comercial", type: "phone", ds160: "tbxAPP_BUS_TEL" },
                { id: "additionalPhones", label: "Possui telefones adicionais?", type: "radio", ds160: "rblAddPhone", hint: "Usou outros números de telefone nos últimos 5 anos?" },
                {
                    id: "additionalPhoneNumbers", label: "Telefones adicionais", type: "array", maxItems: 4, showWhen: { field: "additionalPhones", equals: "Y" }, ds160List: "dtlAddPhone", fields: [
                        { id: "phone", label: "Telefone", type: "phone", required: true, ds160: "tbxAddPhoneInfo" }
                    ]
                },
                { id: "email", label: "Email", type: "email", required: true, maxLen: 50, ds160: "tbxAPP_EMAIL_ADDR" },
                { id: "additionalEmails", label: "Possui emails adicionais?", type: "radio", ds160: "rblAddEmail", hint: "Usou outros endereços de email nos últimos 5 anos?" },
                {
                    id: "additionalEmailAddresses", label: "Emails adicionais", type: "array", maxItems: 4, showWhen: { field: "additionalEmails", equals: "Y" }, ds160List: "dtlAddEmail", fields: [
                        { id: "email", label: "Email", type: "email", required: true, maxLen: 50, ds160: "tbxAddEmailInfo" }
                    ]
                },
                {
                    id: "socialMedia", label: "Redes Sociais", type: "array", maxItems: 5, ds160List: "dtlSocialMedia", fields: [
                        {
                            id: "platform", label: "Plataforma", type: "select", required: true, ds160: "ddlSocialMedia", options: [
                                { value: "FACEBOOK", label: "Facebook" }, { value: "FLICKR", label: "Flickr" }, { value: "GOOGLE+", label: "Google+" },
                                { value: "INSTAGRAM", label: "Instagram" }, { value: "LINKEDIN", label: "LinkedIn" }, { value: "MYSPACE", label: "Myspace" },
                                { value: "PINTEREST", label: "Pinterest" }, { value: "REDDIT", label: "Reddit" }, { value: "TUMBLR", label: "Tumblr" },
                                { value: "TWITTER", label: "Twitter/X" }, { value: "YOUTUBE", label: "YouTube" }, { value: "NONE", label: "Nenhuma" }
                            ]
                        },
                        { id: "handle", label: "Identificador/Usuário", type: "text", required: true, maxLen: 40, ds160: "tbxSocialMediaIdent" }
                    ]
                },
                { id: "additionalSocialMedia", label: "Possui outras redes sociais?", type: "radio", ds160: "rblAddSocial", hint: "Deseja informar presença em outros sites ou aplicativos usados nos últimos 5 anos para criar ou compartilhar conteúdo? Não inclui serviços de mensagens privadas como WhatsApp." },
                {
                    id: "additionalSocialMediaAccounts", label: "Outras redes", type: "array", maxItems: 4, showWhen: { field: "additionalSocialMedia", equals: "Y" }, ds160List: "dtlAddSocial", fields: [
                        { id: "platform", label: "Plataforma", type: "text", required: true, maxLen: 40, ds160: "tbxAddSocialPlatform" },
                        { id: "handle", label: "Identificador", type: "text", required: true, maxLen: 40, ds160: "tbxSocialMediaIdent" }
                    ]
                }
            ]
        },

        // ========== US CONTACT ==========
        {
            id: "usContact",
            label: "Contato nos EUA",
            fields: [
                { id: "surname", label: "Sobrenome do Contato", type: "text", maxLen: 33, noSpecial: true, uppercase: true, allowNA: true, ds160: "tbxUS_POC_SURNAME", hint: "Pessoa de contato nos EUA. Marque 'Não se Aplica' se não souber." },
                { id: "givenName", label: "Nome do Contato", type: "text", maxLen: 33, noSpecial: true, uppercase: true, allowNA: true, ds160: "tbxUS_POC_GIVEN_NAME" },
                { id: "organization", label: "Organização", type: "text", maxLen: 40, allowNA: true, ds160: "tbxUS_POC_ORGANIZATION" },
                { id: "relationship", label: "Relação com o contato", type: "select", required: true, ds160: "ddlUS_POC_REL_TO_APP", optionsRef: "relationships" },
                { id: "usContactStreet1", label: "Endereço - Linha 1", type: "text", required: true, maxLen: 40, ds160: "tbxUS_POC_ADDR_LN1", hint: "Endereço e telefone do ponto de contato nos EUA." },
                { id: "usContactStreet2", label: "Endereço - Linha 2", type: "text", maxLen: 40, ds160: "tbxUS_POC_ADDR_LN2" },
                { id: "usContactCity", label: "Cidade", type: "text", required: true, maxLen: 20, ds160: "tbxUS_POC_ADDR_CITY" },
                { id: "usContactState", label: "Estado", type: "select", required: true, ds160: "ddlUS_POC_ADDR_STATE", optionsRef: "usStates" },
                { id: "usContactZip", label: "CEP", type: "text", required: true, maxLen: 10, ds160: "tbxUS_POC_ADDR_POSTAL_CD" },
                { id: "usContactPhone", label: "Telefone", type: "phone", required: true, ds160: "tbxUS_POC_HOME_TEL" },
                { id: "usContactEmail", label: "Email", type: "email", maxLen: 50, ds160: "tbxUS_POC_EMAIL_ADDR" }
            ]
        },

        // ========== FAMILY 1 ==========
        {
            id: "family1",
            label: "Família - Pais",
            fields: [
                { id: "fatherSurname", label: "Sobrenome do Pai", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxFATHER_SURNAME" },
                { id: "fatherGivenName", label: "Nome do Pai", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxFATHER_GIVEN_NAME" },
                { id: "fatherDob", label: "Data de Nascimento do Pai", type: "date", allowUnknown: true, ds160day: "ddlFathersDOBDay", ds160month: "ddlFathersDOBMonth", ds160year: "tbxFathersDOBYear" },
                { id: "fatherInUS", label: "Pai está nos EUA?", type: "radio", required: true, ds160: "rblFATHER_LIVE_IN_US_IND" },
                { id: "fatherUSStatus", label: "Status do pai nos EUA", type: "select", showWhen: { field: "fatherInUS", equals: "Y" }, ds160: "ddlFATHER_US_STATUS", optionsRef: "usStatus" },
                { id: "motherSurname", label: "Sobrenome da Mãe", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxMOTHER_SURNAME" },
                { id: "motherGivenName", label: "Nome da Mãe", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxMOTHER_GIVEN_NAME" },
                { id: "motherDob", label: "Data de Nascimento da Mãe", type: "date", allowUnknown: true, ds160day: "ddlMothersDOBDay", ds160month: "ddlMothersDOBMonth", ds160year: "tbxMothersDOBYear" },
                { id: "motherInUS", label: "Mãe está nos EUA?", type: "radio", required: true, ds160: "rblMOTHER_LIVE_IN_US_IND" },
                { id: "motherUSStatus", label: "Status da mãe nos EUA", type: "select", showWhen: { field: "motherInUS", equals: "Y" }, ds160: "ddlMOTHER_US_STATUS", optionsRef: "usStatus" },
                { id: "immediateRelativesInUS", label: "Tem parentes imediatos nos EUA?", type: "radio", required: true, ds160: "rblUS_IMMED_RELATIVE_IND", hint: "Parentes imediatos incluem: cônjuge, noivo(a), filho(a), irmão/irmã. Não inclui pais (já informados acima)." },
                { id: "otherRelativesInUS", label: "Tem outros parentes nos EUA?", type: "radio", required: true, ds160: "rblUS_OTHER_RELATIVE_IND" },
                {
                    id: "relatives", label: "Parentes nos EUA", type: "array", maxItems: 5, showWhen: { field: "immediateRelativesInUS", equals: "Y" }, ds160List: "dlUSRelatives", fields: [
                        { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, ds160: "tbxUS_REL_SURNAME" },
                        { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, ds160: "tbxUS_REL_GIVEN_NAME" },
                        { id: "type", label: "Parentesco", type: "select", required: true, ds160: "ddlUS_REL_TYPE", optionsRef: "relativeTypes" },
                        { id: "status", label: "Status migratório", type: "select", required: true, ds160: "ddlUS_REL_STATUS", optionsRef: "usStatus" }
                    ]
                }
            ]
        },

        // ========== FAMILY 2 (SPOUSE) — conditional ==========
        {
            id: "family2",
            label: "Família - Cônjuge",
            conditional: true,
            showWhen: { section: "personal1", field: "maritalStatus", in: ["M", "C"] },
            fields: [
                { id: "spouseSurname", label: "Sobrenome do Cônjuge", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxSpouseSurname" },
                { id: "spouseGivenName", label: "Nome do Cônjuge", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxSpouseGivenName" },
                { id: "spouseDob", label: "Data de Nascimento", type: "date", required: true, ds160day: "ddlSpouseDOBDay", ds160month: "ddlSpouseDOBMonth", ds160year: "tbxSpouseDOBYear" },
                { id: "spouseNationality", label: "Nacionalidade", type: "select", required: true, ds160: "ddlSpouseNatDropDownList", optionsRef: "countries" },
                { id: "spouseCityOfBirth", label: "Cidade de Nascimento", type: "text", required: true, maxLen: 20, ds160: "tbxSpousePOBCity" },
                { id: "spouseCountryOfBirth", label: "País de Nascimento", type: "select", required: true, ds160: "ddlSpousePOBCountry", optionsRef: "countries" },
                {
                    id: "spouseAddressType", label: "Endereço do cônjuge", type: "select", required: true, ds160: "ddlSpouseAddressType", options: [
                        { value: "S", label: "Mesmo do solicitante" }, { value: "O", label: "Outro endereço" }
                    ]
                },
                { id: "spouseStreet1", label: "Endereço - Linha 1", type: "text", maxLen: 40, showWhen: { field: "spouseAddressType", equals: "O" }, ds160: "tbxSPOUSE_ADDR_LN1" },
                { id: "spouseCity", label: "Cidade", type: "text", maxLen: 20, showWhen: { field: "spouseAddressType", equals: "O" }, ds160: "tbxSPOUSE_ADDR_CITY" },
                { id: "spouseCountry", label: "País", type: "select", showWhen: { field: "spouseAddressType", equals: "O" }, ds160: "ddlSPOUSE_ADDR_CNTRY", optionsRef: "countries" }
            ]
        },

        // ========== DECEASED SPOUSE — conditional ==========
        {
            id: "deceasedSpouse",
            label: "Cônjuge Falecido",
            conditional: true,
            showWhen: { section: "personal1", field: "maritalStatus", equals: "W" },
            fields: [
                { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxDECEASED_SPOUSE_SURNAME" },
                { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, noSpecial: true, uppercase: true, ds160: "tbxDECEASED_SPOUSE_GIVEN_NAME" },
                { id: "dob", label: "Data de Nascimento", type: "date", required: true, ds160day: "ddlDECEASED_SPOUSE_DOBDay", ds160month: "ddlDECEASED_SPOUSE_DOBMonth", ds160year: "tbxDECEASED_SPOUSE_DOBYear" },
                { id: "nationality", label: "Nacionalidade", type: "select", required: true, ds160: "ddlDECEASED_SPOUSE_NATL", optionsRef: "countries" },
                { id: "cityOfBirth", label: "Cidade de Nascimento", type: "text", required: true, maxLen: 20, ds160: "tbxDECEASED_SPOUSE_POB_CITY" },
                { id: "countryOfBirth", label: "País de Nascimento", type: "select", required: true, ds160: "ddlDECEASED_SPOUSE_POB_CNTRY", optionsRef: "countries" }
            ]
        },

        // ========== PREV SPOUSE — conditional ==========
        {
            id: "prevSpouse",
            label: "Cônjuge Anterior",
            conditional: true,
            showWhen: { section: "personal1", field: "maritalStatus", in: ["D", "W"] },
            fields: [
                { id: "numberOfPrevious", label: "Número de cônjuges anteriores", type: "text", required: true, maxLen: 2, ds160: "tbxNumberOfPreviousSpouses" },
                {
                    id: "spouses", label: "Cônjuges anteriores", type: "array", maxItems: 5, ds160List: "dlPrevSpouse", fields: [
                        { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, ds160: "tbxPREV_SPOUSE_SURNAME" },
                        { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, ds160: "tbxPREV_SPOUSE_GIVEN_NAME" },
                        { id: "dob", label: "Data de Nascimento", type: "date", required: true, ds160day: "ddlPREV_SPOUSE_DOBDay", ds160month: "ddlPREV_SPOUSE_DOBMonth", ds160year: "tbxPREV_SPOUSE_DOBYear" },
                        { id: "nationality", label: "Nacionalidade", type: "select", required: true, ds160: "ddlPREV_SPOUSE_NATL", optionsRef: "countries" },
                        { id: "dateOfMarriage", label: "Data do Casamento", type: "date", required: true, ds160day: "ddlDOM_DTEDay", ds160month: "ddlDOM_DTEMonth", ds160year: "tbxDOM_DTEYear" },
                        { id: "dateMarriageEnded", label: "Data Término", type: "date", required: true, ds160day: "ddlDOME_DTEDay", ds160month: "ddlDOME_DTEMonth", ds160year: "tbxDOME_DTEYear" },
                        { id: "howEnded", label: "Como terminou", type: "text", required: true, maxLen: 40, ds160: "tbxHOW_MARRIAGE_ENDED" },
                        { id: "countryTerminated", label: "País do término", type: "select", required: true, ds160: "ddlCNTRY_MARRIAGE_TERMINATED", optionsRef: "countries" }
                    ]
                }
            ]
        },

        // ========== WORK/EDUCATION 1 ==========
        {
            id: "workEducation1",
            label: "Trabalho/Educação - Atual",
            fields: [
                { id: "occupation", label: "Ocupação/Profissão", type: "select", required: true, ds160: "ddlPresentOccupation", optionsRef: "occupations", hint: "Forneça informações sobre seu emprego ou educação atual." },
                { id: "otherOccupation", label: "Especifique ocupação", type: "text", maxLen: 40, showWhen: { field: "occupation", equals: "N" }, ds160: "tbxOtherOccupation" },
                { id: "employerName", label: "Nome do Empregador/Escola", type: "text", required: true, maxLen: 40, ds160: "tbxEmpSchName" },
                { id: "employerStreet1", label: "Endereço - Linha 1", type: "text", required: true, maxLen: 40, ds160: "tbxEmpSchAddr1", hint: "Endereço do empregador ou escola atual." },
                { id: "employerStreet2", label: "Endereço - Linha 2", type: "text", maxLen: 40, ds160: "tbxEmpSchAddr2" },
                { id: "employerCity", label: "Cidade", type: "text", required: true, maxLen: 20, ds160: "tbxEmpSchCity" },
                { id: "employerState", label: "Estado/Província", type: "text", maxLen: 20, ds160: "tbxWORK_EDUC_ADDR_STATE" },
                { id: "employerPostalCode", label: "CEP", type: "text", maxLen: 10, ds160: "tbxWORK_EDUC_ADDR_POSTAL_CD" },
                { id: "employerCountry", label: "País", type: "select", required: true, ds160: "ddlEmpSchCountry", optionsRef: "countries" },
                { id: "employerPhone", label: "Telefone", type: "phone", required: true, ds160: "tbxWORK_EDUC_TEL" },
                { id: "employerStartDate", label: "Data de início", type: "date", ds160day: "ddlEmpDateFromDay", ds160month: "ddlEmpDateFromMonth", ds160year: "tbxEmpDateFromYear" },
                { id: "monthlySalary", label: "Salário mensal (local)", type: "text", maxLen: 15, ds160: "tbxCURR_MONTHLY_SALARY" },
                { id: "duties", label: "Descrição das funções", type: "textarea", required: true, maxLen: 200, ds160: "tbxDescribeDuties" }
            ]
        },

        // ========== WORK/EDUCATION 2 ==========
        {
            id: "workEducation2",
            label: "Trabalho/Educação - Anterior",
            fields: [
                { id: "hasPreviousEmployment", label: "Já trabalhou anteriormente?", type: "radio", required: true, ds160: "rblPreviouslyEmployed" },
                {
                    id: "previousEmployment", label: "Empregos anteriores", type: "array", maxItems: 5, showWhen: { field: "hasPreviousEmployment", equals: "Y" }, ds160List: "dtlPrevEmpl", fields: [
                        { id: "name", label: "Empregador", type: "text", required: true, maxLen: 40, ds160: "tbEmployerName" },
                        { id: "city", label: "Cidade", type: "text", maxLen: 20, ds160: "tbEmployerCity" },
                        { id: "country", label: "País", type: "select", ds160: "DropDownList2", optionsRef: "countries" },
                        { id: "jobTitle", label: "Cargo", type: "text", maxLen: 40, ds160: "tbJobTitle" },
                        { id: "supervisor", label: "Supervisor (sobrenome)", type: "text", maxLen: 33, ds160: "tbSupervisorSurname" },
                        { id: "startDate", label: "Data início", type: "date", ds160day: "ddlEmpDateFromDay", ds160month: "ddlEmpDateFromMonth", ds160year: "tbxEmpDateFromYear" },
                        { id: "endDate", label: "Data término", type: "date", ds160day: "ddlEmpDateToDay", ds160month: "ddlEmpDateToMonth", ds160year: "tbxEmpDateToYear" },
                        { id: "duties", label: "Funções", type: "textarea", maxLen: 200, ds160: "tbDescribeDuties" }
                    ]
                },
                { id: "hasEducation", label: "Possui educação adicional?", type: "radio", required: true, ds160: "rblOtherEduc" },
                {
                    id: "education", label: "Instituições de ensino", type: "array", maxItems: 5, showWhen: { field: "hasEducation", equals: "Y" }, ds160List: "dtlPrevEduc", fields: [
                        { id: "name", label: "Instituição", type: "text", required: true, maxLen: 40, ds160: "tbxSchoolName" },
                        { id: "city", label: "Cidade", type: "text", maxLen: 20, ds160: "tbxSchoolCity" },
                        { id: "country", label: "País", type: "select", ds160: "ddlSchoolCountry", optionsRef: "countries" },
                        { id: "course", label: "Curso", type: "text", maxLen: 40, ds160: "tbxSchoolCourseOfStudy" },
                        { id: "startDate", label: "Data início", type: "date", ds160day: "ddlSchoolFromDay", ds160month: "ddlSchoolFromMonth", ds160year: "tbxSchoolFromYear" },
                        { id: "endDate", label: "Data término", type: "date", ds160day: "ddlSchoolToDay", ds160month: "ddlSchoolToMonth", ds160year: "tbxSchoolToYear" }
                    ]
                }
            ]
        },

        // ========== WORK/EDUCATION 3 ==========
        {
            id: "workEducation3",
            label: "Trabalho/Educação - Adicional",
            fields: [
                {
                    id: "languages", label: "Idiomas que fala", type: "array", maxItems: 5, ds160List: "dtlLANGUAGES", fields: [
                        { id: "name", label: "Idioma", type: "text", required: true, maxLen: 20, ds160: "tbxLANGUAGE_NAME" }
                    ]
                },
                { id: "clanTribe", label: "Pertence a clã ou tribo?", type: "radio", required: true, ds160: "rblCLAN_TRIBE_IND" },
                { id: "clanTribeName", label: "Nome do clã/tribo", type: "text", maxLen: 40, showWhen: { field: "clanTribe", equals: "Y" }, ds160: "tbxCLAN_TRIBE_NAME" },
                { id: "countriesVisited", label: "Visitou outros países nos últimos 5 anos?", type: "radio", required: true, ds160: "rblCOUNTRIES_VISITED_IND", hint: "Informe todos os países/regiões que visitou nos últimos 5 anos." },
                {
                    id: "countriesVisitedList", label: "Países visitados", type: "array", maxItems: 10, showWhen: { field: "countriesVisited", equals: "Y" }, ds160List: "dtlCountriesVisited", fields: [
                        { id: "country", label: "País", type: "select", required: true, ds160: "ddlCOUNTRIES_VISITED", optionsRef: "countries" }
                    ]
                },
                { id: "organizationMember", label: "É membro de alguma organização?", type: "radio", required: true, ds160: "rblORGANIZATION_IND" },
                {
                    id: "organizations", label: "Organizações", type: "array", maxItems: 5, showWhen: { field: "organizationMember", equals: "Y" }, ds160List: "dtlORGANIZATIONS", fields: [
                        { id: "name", label: "Nome da organização", type: "text", required: true, maxLen: 40, ds160: "tbxORGANIZATION_NAME" }
                    ]
                },
                { id: "specializedSkills", label: "Possui habilidades especializadas?", type: "radio", required: true, ds160: "rblSPECIALIZED_SKILLS_IND", hint: "Inclui treinamento em armas de fogo, explosivos, energia nuclear/biológica/química, ou experiência militar." },
                { id: "specializedSkillsExplanation", label: "Descreva", type: "textarea", maxLen: 200, showWhen: { field: "specializedSkills", equals: "Y" }, ds160: "tbxSPECIALIZED_SKILLS_EXPL" },
                { id: "militaryService", label: "Já serviu nas forças armadas?", type: "radio", required: true, ds160: "rblMILITARY_SERVICE_IND" },
                {
                    id: "military", label: "Serviço militar", type: "array", maxItems: 5, showWhen: { field: "militaryService", equals: "Y" }, ds160List: "dtlMILITARY_SERVICE", fields: [
                        { id: "country", label: "País", type: "select", required: true, ds160: "ddlMILITARY_SVC_CNTRY", optionsRef: "countries" },
                        { id: "branch", label: "Ramo", type: "text", required: true, maxLen: 40, ds160: "tbxMILITARY_SVC_BRANCH" },
                        { id: "rank", label: "Patente", type: "text", maxLen: 40, ds160: "tbxMILITARY_SVC_RANK" },
                        { id: "specialty", label: "Especialidade", type: "text", maxLen: 40, ds160: "tbxMILITARY_SVC_SPECIALTY" },
                        { id: "startDate", label: "Data início", type: "date", ds160day: "ddlMILITARY_SVC_FROMDay", ds160month: "ddlMILITARY_SVC_FROMMonth", ds160year: "tbxMILITARY_SVC_FROMYear" },
                        { id: "endDate", label: "Data término", type: "date", ds160day: "ddlMILITARY_SVC_TODay", ds160month: "ddlMILITARY_SVC_TOMonth", ds160year: "tbxMILITARY_SVC_TOYear" }
                    ]
                }
            ]
        },

        // ========== SECURITY (all 5 pages in one section) ==========
        {
            id: "security",
            label: "Segurança e Antecedentes",
            fields: [
                // Security 1 - Health
                { id: "disease", label: "Possui doença comunicável (ex: tuberculose)?", type: "radio", required: true, default: "N", ds160: "rblDisease" },
                { id: "diseaseExpl", label: "Explique", type: "textarea", maxLen: 200, showWhen: { field: "disease", equals: "Y" }, ds160: "tbxDisease_EXPL" },
                { id: "disorder", label: "Possui distúrbio mental ou físico?", type: "radio", required: true, default: "N", ds160: "rblDisorder" },
                { id: "disorderExpl", label: "Explique", type: "textarea", maxLen: 200, showWhen: { field: "disorder", equals: "Y" }, ds160: "tbxDisorder_EXPL" },
                { id: "drugUser", label: "É usuário de drogas?", type: "radio", required: true, default: "N", ds160: "rblDruguser" },
                { id: "drugUserExpl", label: "Explique", type: "textarea", maxLen: 200, showWhen: { field: "drugUser", equals: "Y" }, ds160: "tbxDruguser_EXPL" },
                // Security 2 - Criminal
                { id: "arrested", label: "Já foi preso ou condenado?", type: "radio", required: true, default: "N", ds160: "rblArrested" },
                { id: "arrestedExpl", label: "Explique", type: "textarea", maxLen: 200, showWhen: { field: "arrested", equals: "Y" }, ds160: "tbxArrested_EXPL" },
                { id: "controlledSubstances", label: "Violou lei de substâncias controladas?", type: "radio", required: true, default: "N", ds160: "rblControlledSubstances" },
                { id: "controlledSubstancesExpl", label: "Explique", type: "textarea", maxLen: 200, showWhen: { field: "controlledSubstances", equals: "Y" }, ds160: "tbxControlledSubstances_EXPL" },
                { id: "prostitution", label: "Envolvido em prostituição?", type: "radio", required: true, default: "N", ds160: "rblProstitution" },
                { id: "moneyLaundering", label: "Envolvido em lavagem de dinheiro?", type: "radio", required: true, default: "N", ds160: "rblMoneyLaundering" },
                { id: "humanTrafficking", label: "Envolvido em tráfico de pessoas?", type: "radio", required: true, default: "N", ds160: "rblHumanTrafficking" },
                { id: "assistedSevereTrafficking", label: "Auxiliou tráfico severo?", type: "radio", required: true, default: "N", ds160: "rblAssistedSevereTrafficking" },
                { id: "humanTraffickingRelated", label: "Parente de traficante de pessoas?", type: "radio", required: true, default: "N", ds160: "rblHumanTraffickingRelated" },
                // Security 3 - National Security
                { id: "illegalActivity", label: "Pretende atividades ilegais nos EUA?", type: "radio", required: true, default: "N", ds160: "rblIllegalActivity" },
                { id: "terroristActivity", label: "Envolvido em atividades terroristas?", type: "radio", required: true, default: "N", ds160: "rblTerroristActivity" },
                { id: "terroristSupport", label: "Apoiou atividades terroristas?", type: "radio", required: true, default: "N", ds160: "rblTerroristSupport" },
                { id: "terroristOrg", label: "Membro de organização terrorista?", type: "radio", required: true, default: "N", ds160: "rblTerroristOrg" },
                { id: "terroristRel", label: "Parente de envolvido em terrorismo?", type: "radio", required: true, default: "N", ds160: "rblTerroristRel" },
                { id: "genocide", label: "Envolvido em genocídio?", type: "radio", required: true, default: "N", ds160: "rblGenocide" },
                { id: "torture", label: "Envolvido em tortura?", type: "radio", required: true, default: "N", ds160: "rblTorture" },
                { id: "exViolence", label: "Envolvido em violência extrajudicial?", type: "radio", required: true, default: "N", ds160: "rblExViolence" },
                { id: "childSoldier", label: "Recrutou crianças-soldado?", type: "radio", required: true, default: "N", ds160: "rblChildSoldier" },
                { id: "religiousFreedom", label: "Violou liberdade religiosa?", type: "radio", required: true, default: "N", ds160: "rblReligiousFreedom" },
                { id: "populationControls", label: "Envolvido em controle populacional forçado?", type: "radio", required: true, default: "N", ds160: "rblPopulationControls" },
                { id: "transplant", label: "Envolvido em transplante forçado de órgãos?", type: "radio", required: true, default: "N", ds160: "rblTransplant" },
                // Security 4 - Immigration
                { id: "removalHearing", label: "Já teve audiência de remoção?", type: "radio", required: true, default: "N", ds160: "rblRemovalHearing" },
                { id: "immigrationFraud", label: "Cometeu fraude imigratória?", type: "radio", required: true, default: "N", ds160: "rblImmigrationFraud" },
                { id: "failToAttend", label: "Falhou em comparecer a audiência?", type: "radio", required: true, default: "N", ds160: "rblFailToAttend" },
                { id: "visaViolation", label: "Violou termos do visto?", type: "radio", required: true, default: "N", ds160: "rblVisaViolation" },
                { id: "deport", label: "Já foi deportado?", type: "radio", required: true, default: "N", ds160: "rblDeport" },
                // Security 5 - Miscellaneous
                { id: "childCustody", label: "Detém custódia de criança de cidadão americano?", type: "radio", required: true, default: "N", ds160: "rblChildCustody" },
                { id: "votingViolation", label: "Violou lei eleitoral?", type: "radio", required: true, default: "N", ds160: "rblVotingViolation" },
                { id: "renounceExp", label: "Renunciou cidadania para evitar impostos?", type: "radio", required: true, default: "N", ds160: "rblRenounceExp" },
                { id: "attWoReimb", label: "Participou de treinamento sem reembolso?", type: "radio", required: true, default: "N", ds160: "rblAttWoReimb" }
            ]
        },
        // ========== STUDENT / EXCHANGE (F, J, M) ==========
        {
            id: "studentExchange",
            label: "Estudante / Intercâmbio (SEVIS)",
            conditional: true,
            showWhen: { section: "travel", field: "purposeCategory", in: ["F", "J", "M"] },
            fields: [
                { id: "sevisId", label: "Número SEVIS", type: "text", required: true, maxLen: 12, uppercase: true, ds160: "tbxSEVIS_ID" },
                { id: "schoolName", label: "Nome da Escola / Programa", type: "text", required: true, maxLen: 100, uppercase: true, ds160: "tbxSchoolName" },
                { id: "courseOfStudy", label: "Curso de Estudo (F/M)", type: "text", maxLen: 50, showWhen: { section: "travel", field: "purposeCategory", in: ["F", "M"] }, ds160: "tbxCourseOfStudy" },
                { id: "schoolAddress", label: "Endereço da Instituição", type: "text", required: true, maxLen: 100, ds160: "tbxSchoolAddress" },
                { id: "schoolCity", label: "Cidade da Instituição", type: "text", required: true, maxLen: 50, ds160: "tbxSchoolCity" },
                { id: "schoolState", label: "Estado", type: "select", required: true, ds160: "ddlSchoolState", optionsRef: "usStates" },
                { id: "schoolZip", label: "CEP (ZIP Code)", type: "text", required: true, maxLen: 10, ds160: "tbxSchoolZipCode" }
            ]
        }
    ],

    // ========== REFERENCE OPTIONS (shared across sections) ==========
    options: {
        countries: [
            { value: "BRAZIL", label: "Brasil" }, { value: "USA", label: "Estados Unidos" }, { value: "AFGHANISTAN", label: "Afeganistão" },
            { value: "ARGENTINA", label: "Argentina" }, { value: "AUSTRALIA", label: "Austrália" }, { value: "CANADA", label: "Canadá" },
            { value: "CHILE", label: "Chile" }, { value: "CHINA", label: "China" }, { value: "COLOMBIA", label: "Colômbia" },
            { value: "FRANCE", label: "França" }, { value: "GERMANY", label: "Alemanha" }, { value: "INDIA", label: "Índia" },
            { value: "ITALY", label: "Itália" }, { value: "JAPAN", label: "Japão" }, { value: "MEXICO", label: "México" },
            { value: "PORTUGAL", label: "Portugal" }, { value: "RUSSIA", label: "Rússia" }, { value: "SPAIN", label: "Espanha" },
            { value: "UNITED KINGDOM", label: "Reino Unido" }, { value: "URUGUAY", label: "Uruguai" },
            { value: "VENEZUELA", label: "Venezuela" }, { value: "PARAGUAY", label: "Paraguai" }, { value: "PERU", label: "Peru" },
            { value: "BOLIVIA", label: "Bolívia" }, { value: "SOUTH KOREA", label: "Coreia do Sul" }
        ],
        usStates: [
            { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
            { value: "CA", label: "California" }, { value: "CO", label: "Colorado" }, { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
            { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
            { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
            { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" }, { value: "MA", label: "Massachusetts" },
            { value: "MD", label: "Maryland" }, { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
            { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
            { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
            { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
            { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
            { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
            { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
            { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
            { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
            { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }, { value: "DC", label: "District of Columbia" }
        ],
        relationships: [
            { value: "C", label: "Filho(a)" }, { value: "F", label: "Pai" }, { value: "M", label: "Mãe" }, { value: "S", label: "Cônjuge" },
            { value: "R", label: "Parente" }, { value: "B", label: "Parceiro de negócios" }, { value: "O", label: "Outro" },
            { value: "E", label: "Empregador" }, { value: "SC", label: "Escola" }, { value: "FR", label: "Amigo" }
        ],
        relativeTypes: [
            { value: "C", label: "Filho(a)" }, { value: "F", label: "Pai" }, { value: "M", label: "Mãe" }, { value: "S", label: "Cônjuge" },
            { value: "B", label: "Irmão/Irmã" }, { value: "FI", label: "Noivo(a)" }
        ],
        usStatus: [
            { value: "C", label: "Cidadão americano" }, { value: "L", label: "Residente permanente (LPR)" },
            { value: "N", label: "Não-imigrante" }, { value: "O", label: "Outro" }
        ],
        occupations: [
            { value: "A", label: "Agricultura" }, { value: "AC", label: "Artista/Performer" }, { value: "B", label: "Negócios" },
            { value: "CS", label: "Comunicação/Social" }, { value: "E", label: "Educação" }, { value: "F", label: "Engenharia" },
            { value: "G", label: "Governo" }, { value: "H", label: "Saúde" }, { value: "HM", label: "Dona de Casa" },
            { value: "L", label: "Direito" }, { value: "M", label: "Militar" }, { value: "N", label: "Outra (especifique)" },
            { value: "NA", label: "Não aplicável" }, { value: "RE", label: "Aposentado" }, { value: "RT", label: "Pesquisa" },
            { value: "S", label: "Ciência" }, { value: "ST", label: "Estudante" }, { value: "T", label: "Tecnologia" }
        ]
    }
};

