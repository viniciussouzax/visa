/** 14-work-education-current — Trabalho/Educação - Atual */
export default {
    "id": "workEducation1",
    "label": "Trabalho/Educação - Atual",
    "fields": [
        {
            "id": "occupation",
            "label": "Ocupação/Profissão",
            "type": "select",
            "required": true,
            "ds160": "ddlPresentOccupation",
            "optionsRef": "occupations",
            "hint": "Forneça informações sobre seu emprego ou educação atual."
        },
        {
            "id": "otherOccupation",
            "label": "Especifique ocupação",
            "type": "textarea",
            "required": true,
            "maxLen": 40,
            "showWhen": {
                "field": "occupation",
                "equals": "O"
            },
            "ds160": "tbxOtherOccupation"
        },
        {
            "id": "employerName",
            "label": "Nome do Empregador/Escola",
            "type": "text",
            "required": true,
            "maxLen": 75,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxEmpSchName"
        },
        {
            "id": "employerCountry",
            "label": "País / Região do endereço",
            "type": "select",
            "required": true,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "ddlEmpSchCountry",
            "optionsRef": "countries"
        },
        {
            "id": "employerPostalCode",
            "label": "CEP / Código Postal",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "allowNA": true,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxWORK_EDUC_ADDR_POSTAL_CD",
            "hint": "Digite o CEP para preencher o endereço automaticamente."
        },
        {
            "id": "employerStreet1",
            "label": "Endereço - Linha 1",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxEmpSchAddr1",
            "hint": "Endereço do empregador ou escola atual."
        },
        {
            "id": "employerStreet2",
            "label": "Endereço - Linha 2",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxEmpSchAddr2"
        },
        {
            "id": "employerCity",
            "label": "Cidade",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxEmpSchCity"
        },
        {
            "id": "employerState",
            "label": "Estado / Província",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowNA": true,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxWORK_EDUC_ADDR_STATE"
        },
        {
            "id": "employerPhone",
            "label": "Telefone",
            "type": "phone",
            "required": true,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxWORK_EDUC_TEL"
        },
        {
            "id": "employerStartDate",
            "label": "Data de início",
            "type": "date",
            "required": true,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160day": "ddlEmpDateFromDay",
            "ds160month": "ddlEmpDateFromMonth",
            "ds160year": "tbxEmpDateFromYear"
        },
        {
            "id": "monthlySalary",
            "label": "Salário mensal em Real (R$)",
            "type": "text",
            "required": true,
            "maxLen": 15,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxCURR_MONTHLY_SALARY"
        },
        {
            "id": "duties",
            "label": "Descrição das funções",
            "type": "textarea",
            "required": true,
            "maxLen": 4000,
            "showWhen": {
                "field": "occupation",
                "notIn": [
                    "RT",
                    "H",
                    "N"
                ]
            },
            "ds160": "tbxDescribeDuties"
        }
    ]
};
