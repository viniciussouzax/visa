/** 15-work-education-previous — Trabalho/Educação - Anterior */
export default {
    "id": "workEducation2",
    "label": "Trabalho/Educação - Anterior",
    "fields": [
        {
            "id": "hasPreviousEmployment",
            "label": "Já trabalhou anteriormente?",
            "type": "radio",
            "required": true,
            "ds160": "rblPreviouslyEmployed"
        },
        {
            "id": "previousEmployment",
            "label": "Empregos anteriores",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "hasPreviousEmployment",
                "equals": "Y"
            },
            "ds160List": "dtlPrevEmpl",
            "fields": [
                {
                    "id": "name",
                    "label": "Empregador",
                    "type": "text",
                    "required": true,
                    "maxLen": 75,
                    "fullWidth": true,
                    "ds160": "tbEmployerName"
                },
                {
                    "id": "prevEmplCountry",
                    "label": "País / Região",
                    "type": "select",
                    "required": true,
                    "fullWidth": true,
                    "ds160": "DropDownList2",
                    "optionsRef": "countries"
                },
                {
                    "id": "prevEmplPostalCode",
                    "label": "CEP / Código Postal",
                    "type": "text",
                    "maxLen": 10,
                    "allowNA": true,
                    "fullWidth": true,
                    "ds160": "tbxPREV_EMPL_ADDR_POSTAL_CD",
                    "hint": "Digite o CEP para preencher o endereço automaticamente."
                },
                {
                    "id": "prevEmplStreet1",
                    "label": "Endereço - Linha 1",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "fullWidth": true,
                    "ds160": "tbEmployerStreetAddress1"
                },
                {
                    "id": "prevEmplStreet2",
                    "label": "Endereço - Linha 2",
                    "type": "text",
                    "maxLen": 40,
                    "fullWidth": true,
                    "ds160": "tbEmployerStreetAddress2",
                    "hint": "Opcional"
                },
                {
                    "id": "prevEmplCity",
                    "label": "Cidade",
                    "type": "text",
                    "required": true,
                    "maxLen": 20,
                    "fullWidth": true,
                    "ds160": "tbEmployerCity"
                },
                {
                    "id": "prevEmplState",
                    "label": "Estado / Província",
                    "type": "text",
                    "maxLen": 20,
                    "allowNA": true,
                    "fullWidth": true,
                    "ds160": "tbxPREV_EMPL_ADDR_STATE"
                },
                {
                    "id": "prevEmplPhone",
                    "label": "Telefone",
                    "type": "phone",
                    "fullWidth": true,
                    "ds160": "tbEmployerPhone"
                },
                {
                    "id": "jobTitle",
                    "label": "Cargo",
                    "type": "text",
                    "maxLen": 75,
                    "fullWidth": true,
                    "ds160": "tbJobTitle"
                },
                {
                    "id": "supervisor",
                    "label": "Supervisor (sobrenome)",
                    "type": "text",
                    "maxLen": 33,
                    "allowNA": true,
                    "fullWidth": true,
                    "ds160": "tbSupervisorSurname"
                },
                {
                    "id": "supervisorGivenName",
                    "label": "Supervisor (nome)",
                    "type": "text",
                    "maxLen": 33,
                    "allowNA": true,
                    "fullWidth": true,
                    "ds160": "tbSupervisorGivenName"
                },
                {
                    "id": "startDate",
                    "label": "Data início",
                    "type": "date",
                    "required": true,
                    "fullWidth": true,
                    "ds160day": "ddlEmpDateFromDay",
                    "ds160month": "ddlEmpDateFromMonth",
                    "ds160year": "tbxEmpDateFromYear"
                },
                {
                    "id": "endDate",
                    "label": "Data término",
                    "type": "date",
                    "required": true,
                    "fullWidth": true,
                    "ds160day": "ddlEmpDateToDay",
                    "ds160month": "ddlEmpDateToMonth",
                    "ds160year": "tbxEmpDateToYear"
                },
                {
                    "id": "duties",
                    "label": "Funções",
                    "type": "textarea",
                    "maxLen": 4000,
                    "fullWidth": true,
                    "ds160": "tbDescribeDuties"
                }
            ]
        },
        {
            "id": "hasEducation",
            "label": "Possui educação adicional?",
            "type": "radio",
            "required": true,
            "ds160": "rblOtherEduc"
        },
        {
            "id": "education",
            "label": "Instituições de ensino",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "hasEducation",
                "equals": "Y"
            },
            "ds160List": "dtlPrevEduc",
            "fields": [
                {
                    "id": "name",
                    "label": "Instituição",
                    "type": "text",
                    "required": true,
                    "maxLen": 75,
                    "fullWidth": true,
                    "ds160": "tbxSchoolName"
                },
                {
                    "id": "schoolCountry",
                    "label": "País / Região",
                    "type": "select",
                    "required": true,
                    "fullWidth": true,
                    "ds160": "ddlSchoolCountry",
                    "optionsRef": "countries"
                },
                {
                    "id": "schoolPostalCode",
                    "label": "CEP / Código Postal",
                    "type": "text",
                    "maxLen": 10,
                    "allowNA": true,
                    "fullWidth": true,
                    "ds160": "tbxEDUC_INST_POSTAL_CD",
                    "hint": "Digite o CEP para preencher o endereço automaticamente."
                },
                {
                    "id": "schoolStreet1",
                    "label": "Endereço - Linha 1",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "fullWidth": true,
                    "ds160": "tbxSchoolAddr1"
                },
                {
                    "id": "schoolStreet2",
                    "label": "Endereço - Linha 2",
                    "type": "text",
                    "maxLen": 40,
                    "fullWidth": true,
                    "ds160": "tbxSchoolAddr2",
                    "hint": "Opcional"
                },
                {
                    "id": "schoolCity",
                    "label": "Cidade",
                    "type": "text",
                    "required": true,
                    "maxLen": 20,
                    "fullWidth": true,
                    "ds160": "tbxSchoolCity"
                },
                {
                    "id": "schoolState",
                    "label": "Estado / Província",
                    "type": "text",
                    "maxLen": 20,
                    "allowNA": true,
                    "fullWidth": true,
                    "ds160": "tbxEDUC_INST_ADDR_STATE"
                },
                {
                    "id": "course",
                    "label": "Curso",
                    "type": "text",
                    "required": true,
                    "maxLen": 66,
                    "fullWidth": true,
                    "ds160": "tbxSchoolCourseOfStudy"
                },
                {
                    "id": "startDate",
                    "label": "Data início",
                    "type": "date",
                    "required": true,
                    "fullWidth": true,
                    "ds160day": "ddlSchoolFromDay",
                    "ds160month": "ddlSchoolFromMonth",
                    "ds160year": "tbxSchoolFromYear"
                },
                {
                    "id": "endDate",
                    "label": "Data término",
                    "type": "date",
                    "required": true,
                    "fullWidth": true,
                    "ds160day": "ddlSchoolToDay",
                    "ds160month": "ddlSchoolToMonth",
                    "ds160year": "tbxSchoolToYear"
                }
            ]
        }
    ]
};
