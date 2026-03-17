/** 04-travel — Viagem */
export default {
    "id": "travel",
    "label": "Viagem",
    "fields": [
        {
            "id": "purposeCategory",
            "label": "Categoria do Visto",
            "type": "select",
            "required": true,
            "ds160": "ddlPurposeOfTrip",
            "options": [
                {
                    "value": "B",
                    "label": "B - Negócios / Turismo"
                },
                {
                    "value": "F",
                    "label": "F - Estudante"
                },
                {
                    "value": "J",
                    "label": "J - Intercâmbio"
                },
                {
                    "value": "O",
                    "label": "O - Habilidade Extraordinária"
                }
            ]
        },
        {
            "id": "purposeOfTrip",
            "label": "Tipo de Visto Específico",
            "type": "select",
            "required": true,
            "ds160": "ddlOtherPurpose",
            "filteredBy": {
                "field": "purposeCategory"
            },
            "options": [
                {
                    "value": "B1/B2",
                    "label": "B1/B2 - Negócios e Turismo",
                    "group": "B"
                },
                {
                    "value": "B1",
                    "label": "B1 - Negócios/Conferência",
                    "group": "B"
                },
                {
                    "value": "B2",
                    "label": "B2 - Turismo/Tratamento Médico",
                    "group": "B"
                },
                {
                    "value": "F1",
                    "label": "F1 - Estudante",
                    "group": "F"
                },
                {
                    "value": "F2",
                    "label": "F2 - Cônjuge/Filho de F1",
                    "group": "F"
                },
                {
                    "value": "J1",
                    "label": "J1 - Visitante de Intercâmbio",
                    "group": "J"
                },
                {
                    "value": "J2",
                    "label": "J2 - Cônjuge/Filho de J1",
                    "group": "J"
                },
                {
                    "value": "H1B",
                    "label": "H-1B - Ocupação Especializada",
                    "group": "H"
                },
                {
                    "value": "H1B1",
                    "label": "H-1B1 - Free Trade (Chile/Singapura)",
                    "group": "H"
                },
                {
                    "value": "H2A",
                    "label": "H-2A - Trabalhador Agrícola",
                    "group": "H"
                },
                {
                    "value": "H2B",
                    "label": "H-2B - Trabalhador Não-Agrícola",
                    "group": "H"
                },
                {
                    "value": "H3",
                    "label": "H-3 - Trainee",
                    "group": "H"
                },
                {
                    "value": "H4",
                    "label": "H-4 - Cônjuge/Filho de H",
                    "group": "H"
                },
                {
                    "value": "C1",
                    "label": "C1 - Trânsito",
                    "group": "C"
                },
                {
                    "value": "C1/D",
                    "label": "C1/D - Tripulante em Trânsito",
                    "group": "C"
                },
                {
                    "value": "C2",
                    "label": "C2 - Trânsito para ONU",
                    "group": "C"
                },
                {
                    "value": "C3",
                    "label": "C3 - Oficial Estrangeiro em Trânsito",
                    "group": "C"
                },
                {
                    "value": "CW1",
                    "label": "CW-1 - Trabalhador Transicional CNMI",
                    "group": "CW"
                },
                {
                    "value": "CW2",
                    "label": "CW-2 - Cônjuge/Filho de CW1",
                    "group": "CW"
                },
                {
                    "value": "D",
                    "label": "D - Tripulante",
                    "group": "D"
                },
                {
                    "value": "E1",
                    "label": "E-1 - Comerciante por Tratado",
                    "group": "E"
                },
                {
                    "value": "E2",
                    "label": "E-2 - Investidor por Tratado",
                    "group": "E"
                },
                {
                    "value": "E3",
                    "label": "E-3 - Trabalhador Australiano",
                    "group": "E"
                },
                {
                    "value": "I",
                    "label": "I - Representante de Mídia",
                    "group": "I"
                },
                {
                    "value": "K1",
                    "label": "K-1 - Noivo(a) de Cidadão Americano",
                    "group": "K"
                },
                {
                    "value": "K2",
                    "label": "K-2 - Filho de K1",
                    "group": "K"
                },
                {
                    "value": "K3",
                    "label": "K-3 - Cônjuge de Cidadão Americano",
                    "group": "K"
                },
                {
                    "value": "K4",
                    "label": "K-4 - Filho de K3",
                    "group": "K"
                },
                {
                    "value": "L1",
                    "label": "L-1 - Transferência Intraempresa",
                    "group": "L"
                },
                {
                    "value": "L2",
                    "label": "L-2 - Cônjuge/Filho de L1",
                    "group": "L"
                },
                {
                    "value": "M1",
                    "label": "M-1 - Estudante Vocacional",
                    "group": "M"
                },
                {
                    "value": "M2",
                    "label": "M-2 - Cônjuge/Filho de M1",
                    "group": "M"
                },
                {
                    "value": "O1",
                    "label": "O-1 - Habilidade Extraordinária",
                    "group": "O"
                },
                {
                    "value": "O2",
                    "label": "O-2 - Assistente de O1",
                    "group": "O"
                },
                {
                    "value": "O3",
                    "label": "O-3 - Cônjuge/Filho de O1/O2",
                    "group": "O"
                },
                {
                    "value": "P1",
                    "label": "P-1 - Atleta/Artista Individual",
                    "group": "P"
                },
                {
                    "value": "P2",
                    "label": "P-2 - Artista de Intercâmbio",
                    "group": "P"
                },
                {
                    "value": "P3",
                    "label": "P-3 - Artista Culturalmente Único",
                    "group": "P"
                },
                {
                    "value": "P4",
                    "label": "P-4 - Cônjuge/Filho de P",
                    "group": "P"
                },
                {
                    "value": "Q1",
                    "label": "Q-1 - Intercâmbio Cultural",
                    "group": "Q"
                },
                {
                    "value": "R1",
                    "label": "R-1 - Trabalhador Religioso",
                    "group": "R"
                },
                {
                    "value": "R2",
                    "label": "R-2 - Cônjuge/Filho de R1",
                    "group": "R"
                },
                {
                    "value": "TN",
                    "label": "TN - Profissional NAFTA",
                    "group": "TD"
                },
                {
                    "value": "TD",
                    "label": "TD - Cônjuge/Filho de TN",
                    "group": "TD"
                },
                {
                    "value": "T1",
                    "label": "T-1 - Vítima de Tráfico",
                    "group": "T"
                },
                {
                    "value": "T2",
                    "label": "T-2 - Cônjuge de T1",
                    "group": "T"
                },
                {
                    "value": "T3",
                    "label": "T-3 - Filho de T1",
                    "group": "T"
                },
                {
                    "value": "U1",
                    "label": "U-1 - Vítima de Crime",
                    "group": "U"
                },
                {
                    "value": "U2",
                    "label": "U-2 - Cônjuge de U1",
                    "group": "U"
                },
                {
                    "value": "U3",
                    "label": "U-3 - Filho de U1",
                    "group": "U"
                },
                {
                    "value": "OTHER",
                    "label": "Outro",
                    "group": "OTHER"
                }
            ]
        },
        {
            "id": "hasSpecificPlans",
            "label": "Possui planos específicos de viagem?",
            "type": "radio",
            "required": true,
            "ds160": "rblSpecificTravel",
            "hint": "Se já tem datas, voos e locais definidos, selecione Sim. Caso contrário, selecione Não e informe uma estimativa."
        },
        {
            "id": "arrivalDate",
            "label": "Data de Chegada",
            "type": "date",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "Y"
            },
            "ds160day": "ddlARRIVAL_US_DTEDay",
            "ds160month": "ddlARRIVAL_US_DTEMonth",
            "ds160year": "tbxARRIVAL_US_DTEYear"
        },
        {
            "id": "arrivalFlight",
            "label": "Voo de Chegada",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "fullWidth": true,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "Y"
            },
            "ds160": "tbxArriveFlight"
        },
        {
            "id": "arrivalCity",
            "label": "Cidade de Chegada",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "fullWidth": true,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "Y"
            },
            "ds160": "tbxArriveCity"
        },
        {
            "id": "departureDate",
            "label": "Data de Partida",
            "type": "date",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "Y"
            },
            "ds160day": "ddlDEPARTURE_US_DTEDay",
            "ds160month": "ddlDEPARTURE_US_DTEMonth",
            "ds160year": "tbxDEPARTURE_US_DTEYear"
        },
        {
            "id": "departureFlight",
            "label": "Voo de Partida",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "fullWidth": true,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "Y"
            },
            "ds160": "tbxDepartFlight"
        },
        {
            "id": "departureCity",
            "label": "Cidade de Partida",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "fullWidth": true,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "Y"
            },
            "ds160": "tbxDepartCity"
        },
        {
            "id": "specificLocations",
            "label": "Locais nos EUA",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "Y"
            },
            "ds160List": "dtlTravelLoc",
            "fields": [
                {
                    "id": "location",
                    "label": "Local",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "ds160": "tbxSPECTRAVEL_LOCATION"
                }
            ]
        },
        {
            "id": "nonSpecificArrival",
            "label": "Data prevista de chegada",
            "type": "date",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "N"
            },
            "ds160day": "ddlARRIVAL_US_NSDTEDay",
            "ds160month": "ddlARRIVAL_US_NSDTEMonth",
            "ds160year": "tbxARRIVAL_US_NSDTEYear"
        },
        {
            "id": "lengthOfStay",
            "label": "Tempo de permanência",
            "type": "text",
            "required": true,
            "maxLen": 3,
            "inline": true,
            "flexBasis": "100px",
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "N"
            },
            "ds160": "tbxAPP_LOS"
        },
        {
            "id": "lengthOfStayUnit",
            "label": "Unidade",
            "type": "select",
            "required": true,
            "inline": true,
            "flexBasis": "300px",
            "showWhen": {
                "field": "hasSpecificPlans",
                "equals": "N"
            },
            "ds160": "ddlAPP_LOS_CD",
            "options": [
                {
                    "value": "Y",
                    "label": "Anos"
                },
                {
                    "value": "M",
                    "label": "Meses"
                },
                {
                    "value": "W",
                    "label": "Semanas"
                },
                {
                    "value": "D",
                    "label": "Dias"
                },
                {
                    "value": "H",
                    "label": "Menos de 24 horas"
                }
            ]
        },
        {
            "id": "usAddressHeading",
            "label": "Qual endereço do local onde você ficará hospedado nos EUA?",
            "type": "heading"
        },
        {
            "id": "usAddressStreet1",
            "label": "Endereço nos EUA - Linha 1",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "ds160": "tbxStreetAddress1"
        },
        {
            "id": "usAddressStreet2",
            "label": "Endereço nos EUA - Linha 2",
            "type": "text",
            "maxLen": 40,
            "ds160": "tbxStreetAddress2"
        },
        {
            "id": "usAddressCity",
            "label": "Cidade nos EUA",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "ds160": "tbxCity"
        },
        {
            "id": "usAddressState",
            "label": "Estado nos EUA",
            "type": "select",
            "required": true,
            "ds160": "ddlTravelState",
            "optionsRef": "usStates"
        },
        {
            "id": "usAddressZip",
            "label": "CEP nos EUA",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "ds160": "tbZIPCode"
        },
        {
            "id": "whoIsPaying",
            "label": "Quem paga a viagem?",
            "type": "select",
            "required": true,
            "ds160": "ddlWhoIsPaying",
            "hint": "Selecione quem irá custear os gastos da viagem aos EUA.",
            "options": [
                {
                    "value": "S",
                    "label": "O próprio solicitante"
                },
                {
                    "value": "O",
                    "label": "Outra pessoa"
                },
                {
                    "value": "P",
                    "label": "Empregador atual"
                },
                {
                    "value": "U",
                    "label": "Empregador nos EUA"
                },
                {
                    "value": "C",
                    "label": "Outra companhia/organização"
                }
            ]
        },
        {
            "id": "payerSurname",
            "label": "Sobrenome do pagador",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerSurname"
        },
        {
            "id": "payerGivenName",
            "label": "Nome do pagador",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerGivenName"
        },
        {
            "id": "payerPhone",
            "label": "Telefone do pagador",
            "type": "phone",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerPhone"
        },
        {
            "id": "payerEmail",
            "label": "Email do pagador",
            "type": "email",
            "required": true,
            "maxLen": 50,
            "allowNA": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPAYER_EMAIL_ADDR",
            "hint": "Marque 'Não se Aplica' se não souber o email."
        },
        {
            "id": "payerRelationship",
            "label": "Relação com o pagador",
            "type": "select",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "ddlPayerRelationship",
            "options": [
                {
                    "value": "C",
                    "label": "Filho(a)"
                },
                {
                    "value": "P",
                    "label": "Pais"
                },
                {
                    "value": "S",
                    "label": "Cônjuge"
                },
                {
                    "value": "R",
                    "label": "Outro parente"
                },
                {
                    "value": "F",
                    "label": "Amigo"
                },
                {
                    "value": "O",
                    "label": "Outro"
                }
            ]
        },
        {
            "id": "payerSameAddress",
            "label": "O endereço do pagador é o mesmo que seu endereço residencial ou de correspondência?",
            "type": "radio",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "rblPayerAddrSameAsInd",
            "options": [
                {
                    "value": "Y",
                    "label": "Sim"
                },
                {
                    "value": "N",
                    "label": "Não"
                }
            ]
        },
        {
            "id": "payerPersonCountry",
            "label": "País/Região do endereço residencial ou de correspondência do Pagador?",
            "type": "select",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "ddlPayerCountry",
            "optionsRef": "countries"
        },
        {
            "id": "payerPersonPostalCode",
            "label": "CEP / Código Postal",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "allowNA": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerPostalZIPCode",
            "hint": "Digite o CEP para preencher o endereço automaticamente."
        },
        {
            "id": "payerPersonStreet1",
            "label": "Endereço do Pagador (Linha 1)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerStreetAddress1"
        },
        {
            "id": "payerPersonStreet2",
            "label": "Endereço do Pagador (Linha 2)",
            "type": "text",
            "maxLen": 40,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerStreetAddress2",
            "hint": "Opcional"
        },
        {
            "id": "payerPersonCity",
            "label": "Cidade do Pagador",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerCity"
        },
        {
            "id": "payerPersonState",
            "label": "Estado/Província do Pagador",
            "type": "text",
            "maxLen": 20,
            "allowNA": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "O"
            },
            "ds160": "tbxPayerStateProvince"
        },
        {
            "id": "payerCompanyName",
            "label": "Nome da empresa/organização pagadora",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxPayingCompany"
        },
        {
            "id": "payerCompanyPhone",
            "label": "Telefone da empresa",
            "type": "phone",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxPayerPhone"
        },
        {
            "id": "payerCompanyRelation",
            "label": "Relação com a empresa",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxCompanyRelation"
        },
        {
            "id": "payerCoCountry",
            "label": "País/Região do endereço da empresa/organização pagadora",
            "type": "select",
            "required": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "ddlPayerCountry",
            "optionsRef": "countries"
        },
        {
            "id": "payerCoPostalCode",
            "label": "CEP / Código Postal",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "allowNA": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxPayerPostalZIPCode",
            "hint": "Digite o CEP para preencher o endereço automaticamente."
        },
        {
            "id": "payerCoStreet1",
            "label": "Endereço da Empresa (Linha 1)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxPayerStreetAddress1"
        },
        {
            "id": "payerCoStreet2",
            "label": "Endereço da Empresa (Linha 2)",
            "type": "text",
            "maxLen": 40,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxPayerStreetAddress2",
            "hint": "Opcional"
        },
        {
            "id": "payerCoCity",
            "label": "Cidade da Empresa",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxPayerCity"
        },
        {
            "id": "payerCoState",
            "label": "Estado/Província da Empresa",
            "type": "text",
            "maxLen": 20,
            "allowNA": true,
            "fullWidth": true,
            "showWhen": {
                "field": "whoIsPaying",
                "equals": "C"
            },
            "ds160": "tbxPayerStateProvince"
        }
    ]
};
