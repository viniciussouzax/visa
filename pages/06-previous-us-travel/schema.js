/** 06-previous-us-travel — Viagens Anteriores aos EUA */
export default {
    "id": "previousUSTravel",
    "label": "Viagens Anteriores aos EUA",
    "fields": [
        {
            "id": "hasBeenInUS",
            "label": "Já esteve nos EUA?",
            "type": "radio",
            "required": true,
            "ds160": "rblPREV_US_TRAVEL_IND",
            "hint": "Informe se já visitou os Estados Unidos em qualquer momento."
        },
        {
            "id": "previousVisits",
            "label": "Visitas anteriores",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "hasBeenInUS",
                "equals": "Y"
            },
            "ds160List": "dtlPREV_US_VISIT",
            "fields": [
                {
                    "id": "arrivalDate",
                    "label": "Data de chegada",
                    "type": "date",
                    "required": true,
                    "fullWidth": true,
                    "ds160day": "ddlPREV_US_VISIT_DTEDay",
                    "ds160month": "ddlPREV_US_VISIT_DTEMonth",
                    "ds160year": "tbxPREV_US_VISIT_DTEYear"
                },
                {
                    "id": "lengthOfStay",
                    "label": "Tempo de permanência",
                    "type": "text",
                    "required": true,
                    "maxLen": 3,
                    "flexBasis": "100px",
                    "ds160": "tbxPREV_US_VISIT_LOS"
                },
                {
                    "id": "lengthOfStayUnit",
                    "label": "Período",
                    "type": "select",
                    "required": true,
                    "flexBasis": "300px",
                    "ds160": "ddlPREV_US_VISIT_LOS_CD",
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
                }
            ]
        },
        {
            "id": "hasDriversLicense",
            "label": "Possui ou já possuiu carteira de motorista americana?",
            "type": "radio",
            "required": true,
            "showWhen": {
                "field": "hasBeenInUS",
                "equals": "Y"
            },
            "ds160": "rblPREV_US_DRIVER_LIC_IND"
        },
        {
            "id": "driversLicenses",
            "label": "Carteiras de motorista",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "hasDriversLicense",
                "equals": "Y"
            },
            "ds160List": "dtlUS_DRIVER_LICENSE",
            "fields": [
                {
                    "id": "number",
                    "label": "Número da carteira",
                    "type": "text",
                    "required": true,
                    "maxLen": 20,
                    "allowUnknown": true,
                    "ds160": "tbxUS_DRIVER_LICENSE"
                },
                {
                    "id": "state",
                    "label": "Estado emissor",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlUS_DRIVER_LICENSE_STATE",
                    "optionsRef": "usStates"
                }
            ]
        },
        {
            "id": "hasUSVisa",
            "label": "Já recebeu um visto americano?",
            "type": "radio",
            "required": true,
            "ds160": "rblPREV_VISA_IND",
            "hint": "Selecione Sim se já lhe foi emitido qualquer tipo de visto para os EUA."
        },
        {
            "id": "previousVisaIssueDate",
            "label": "Data de emissão do último visto",
            "type": "date",
            "required": true,
            "showWhen": {
                "field": "hasUSVisa",
                "equals": "Y"
            },
            "ds160day": "ddlPREV_VISA_ISSUED_DTEDay",
            "ds160month": "ddlPREV_VISA_ISSUED_DTEMonth",
            "ds160year": "tbxPREV_VISA_ISSUED_DTEYear"
        },
        {
            "id": "previousVisaNumber",
            "label": "Número do visto",
            "type": "text",
            "required": true,
            "maxLen": 12,
            "allowUnknown": true,
            "showWhen": {
                "field": "hasUSVisa",
                "equals": "Y"
            },
            "ds160": "tbxPREV_VISA_FOIL_NUMBER",
            "hint": "Número de 8 dígitos em vermelho no canto inferior direito do visto. Se era Border Crossing Card, insira os últimos 12 dígitos da primeira linha da zona de leitura óptica."
        },
        {
            "id": "sameVisaType",
            "label": "Está solicitando o mesmo tipo de visto?",
            "type": "radio",
            "required": true,
            "showWhen": {
                "field": "hasUSVisa",
                "equals": "Y"
            },
            "ds160": "rblPREV_VISA_SAME_TYPE_IND"
        },
        {
            "id": "sameCountry",
            "label": "Está solicitando no mesmo país onde o visto acima foi emitido, e esse país é o seu local de residência principal?",
            "type": "radio",
            "required": true,
            "showWhen": {
                "field": "hasUSVisa",
                "equals": "Y"
            },
            "ds160": "rblPREV_VISA_SAME_CNTRY_IND"
        },
        {
            "id": "tenPrint",
            "label": "Já forneceu impressões digitais de todos os 10 dedos?",
            "type": "radio",
            "required": true,
            "showWhen": {
                "field": "hasUSVisa",
                "equals": "Y"
            },
            "ds160": "rblPREV_VISA_TEN_PRINT_IND",
            "hint": "Significa que forneceu impressões de todos os dedos das mãos, e não apenas duas impressões digitais."
        },
        {
            "id": "visaLost",
            "label": "Seu visto americano já foi perdido ou roubado?",
            "type": "radio",
            "required": true,
            "showWhen": {
                "field": "hasUSVisa",
                "equals": "Y"
            },
            "ds160": "rblPREV_VISA_LOST_IND"
        },
        {
            "id": "lostVisaYear",
            "label": "Ano em que o visto foi perdido ou roubado",
            "type": "text",
            "required": true,
            "maxLen": 4,
            "showWhen": {
                "field": "visaLost",
                "equals": "Y"
            },
            "ds160": "tbxPREV_VISA_LOST_YEAR"
        },
        {
            "id": "lostVisaExplanation",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 4000,
            "showWhen": {
                "field": "visaLost",
                "equals": "Y"
            },
            "ds160": "tbxPREV_VISA_LOST_EXPL"
        },
        {
            "id": "visaCancelled",
            "label": "Seu visto americano já foi cancelado ou revogado?",
            "type": "radio",
            "required": true,
            "showWhen": {
                "field": "hasUSVisa",
                "equals": "Y"
            },
            "ds160": "rblPREV_VISA_CANCELLED_IND"
        },
        {
            "id": "cancelledExplanation",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 4000,
            "showWhen": {
                "field": "visaCancelled",
                "equals": "Y"
            },
            "ds160": "tbxPREV_VISA_CANCELLED_EXPL"
        },
        {
            "id": "visaRefused",
            "label": "Já teve um visto americano negado, foi recusada a entrada nos EUA, ou retirou sua solicitação de admissão em um porto de entrada?",
            "type": "radio",
            "required": true,
            "ds160": "rblPREV_VISA_REFUSED_IND"
        },
        {
            "id": "visaRefusedExplanation",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 4000,
            "showWhen": {
                "field": "visaRefused",
                "equals": "Y"
            },
            "ds160": "tbxPREV_VISA_REFUSED_EXPL"
        },
        {
            "id": "immigrantPetition",
            "label": "Alguém já apresentou uma petição de imigrante em seu nome junto ao Serviço de Cidadania e Imigração dos EUA (USCIS)?",
            "type": "radio",
            "required": true,
            "ds160": "rblIV_PETITION_IND"
        },
        {
            "id": "immigrantPetitionExplanation",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 4000,
            "showWhen": {
                "field": "immigrantPetition",
                "equals": "Y"
            },
            "ds160": "tbxIV_PETITION_EXPL"
        }
    ]
};
