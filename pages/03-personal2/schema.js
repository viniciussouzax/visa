/** 03-personal2 — Informações Pessoais 2 */
export default {
    "id": "personal2",
    "label": "Informações Pessoais 2",
    "fields": [
        {
            "id": "nationality",
            "label": "Nacionalidade",
            "type": "select",
            "required": true,
            "ds160": "ddlAPP_NATL",
            "optionsRef": "countries"
        },
        {
            "id": "otherNationality",
            "label": "Possui outra nacionalidade?",
            "type": "radio",
            "required": true,
            "ds160": "rblAPP_OTH_NATL_IND",
            "hint": "Informe todas as nacionalidades que possui atualmente e todas que já possuiu, independente de ter renunciado formalmente ou não."
        },
        {
            "id": "otherNationalities",
            "label": "Outras nacionalidades",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "otherNationality",
                "equals": "Y"
            },
            "ds160List": "dtlOTHER_NATL",
            "fields": [
                {
                    "id": "country",
                    "label": "País",
                    "type": "select",
                    "required": true,
                    "fullWidth": true,
                    "ds160": "ddlOTHER_NATL",
                    "optionsRef": "countries",
                    "excludeField": "nationality"
                },
                {
                    "id": "hasPassport",
                    "label": "Possui passaporte desse país?",
                    "type": "radio",
                    "required": true,
                    "fullWidth": true,
                    "ds160": "rblOTHER_PPT_IND"
                },
                {
                    "id": "passportNumber",
                    "label": "Número do passaporte",
                    "type": "text",
                    "required": true,
                    "maxLen": 20,
                    "showWhen": {
                        "field": "hasPassport",
                        "equals": "Y"
                    },
                    "ds160": "tbxOTHER_PPT_NUM"
                }
            ]
        },
        {
            "id": "permanentResident",
            "label": "É residente permanente de outro país?",
            "type": "radio",
            "required": true,
            "ds160": "rblPermResOtherCntryInd",
            "hint": "Residente permanente é qualquer pessoa que recebeu de um país permissão legal para viver e trabalhar sem limitação de tempo naquele país."
        },
        {
            "id": "permanentResidentCountries",
            "label": "Países de residência permanente",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "permanentResident",
                "equals": "Y"
            },
            "ds160List": "dtlOthPermResCntry",
            "fields": [
                {
                    "id": "country",
                    "label": "País",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlOthPermResCntry",
                    "optionsRef": "countries",
                    "excludeField": "nationality"
                }
            ]
        },
        {
            "id": "nationalId",
            "label": "Identidade Nacional / CPF",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowNA": true,
            "ds160": "tbxAPP_NATIONAL_ID",
            "hint": "Número único fornecido pelo seu governo (ex: CPF para brasileiros). Marque 'Não se Aplica' se não possuir."
        },
        {
            "id": "ssn",
            "label": "Número do Seguro Social (SSN) dos EUA",
            "type": "ssn",
            "required": true,
            "allowNA": true,
            "ds160p1": "tbxAPP_SSN1",
            "ds160p2": "tbxAPP_SSN2",
            "ds160p3": "tbxAPP_SSN3",
            "hint": "Formato: XXX-XX-XXXX. Apenas se já possuiu ou possui SSN americano."
        },
        {
            "id": "taxId",
            "label": "Número de Contribuinte dos EUA",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowNA": true,
            "ds160": "tbxAPP_TAX_ID",
            "hint": "Apenas se já possuiu ou possui número de contribuinte (ITIN/EIN) nos EUA."
        }
    ]
};
