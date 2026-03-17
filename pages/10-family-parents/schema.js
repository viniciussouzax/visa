/** 10-family-parents — Família - Pais */
export default {
    "id": "family1",
    "label": "Família - Pais",
    "fields": [
        {
            "id": "h_father",
            "label": "Nome Completo e Data de Nascimento do Pai",
            "type": "heading"
        },
        {
            "id": "fatherSurname",
            "label": "Sobrenome do Pai",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "allowUnknown": true,
            "ds160": "tbxFATHER_SURNAME"
        },
        {
            "id": "fatherGivenName",
            "label": "Nome do Pai",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "allowUnknown": true,
            "ds160": "tbxFATHER_GIVEN_NAME"
        },
        {
            "id": "fatherDob",
            "label": "Data de Nascimento do Pai",
            "type": "date",
            "required": true,
            "allowUnknown": true,
            "hideWhenAllUnknown": [
                "fatherSurname",
                "fatherGivenName"
            ],
            "ds160day": "ddlFathersDOBDay",
            "ds160month": "ddlFathersDOBMonth",
            "ds160year": "tbxFathersDOBYear"
        },
        {
            "id": "fatherInUS",
            "label": "Pai está nos EUA?",
            "type": "radio",
            "required": true,
            "hideWhenAllUnknown": [
                "fatherSurname",
                "fatherGivenName"
            ],
            "ds160": "rblFATHER_LIVE_IN_US_IND"
        },
        {
            "id": "fatherUSStatus",
            "label": "Status do pai nos EUA",
            "type": "select",
            "required": true,
            "showWhen": {
                "field": "fatherInUS",
                "equals": "Y"
            },
            "ds160": "ddlFATHER_US_STATUS",
            "optionsRef": "usStatus"
        },
        {
            "id": "h_mother",
            "label": "Nome Completo e Data de Nascimento da Mãe",
            "type": "heading",
            "spaceBefore": 16
        },
        {
            "id": "motherSurname",
            "label": "Sobrenome da Mãe",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "allowUnknown": true,
            "ds160": "tbxMOTHER_SURNAME"
        },
        {
            "id": "motherGivenName",
            "label": "Nome da Mãe",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "allowUnknown": true,
            "ds160": "tbxMOTHER_GIVEN_NAME"
        },
        {
            "id": "motherDob",
            "label": "Data de Nascimento da Mãe",
            "type": "date",
            "required": true,
            "allowUnknown": true,
            "hideWhenAllUnknown": [
                "motherSurname",
                "motherGivenName"
            ],
            "ds160day": "ddlMothersDOBDay",
            "ds160month": "ddlMothersDOBMonth",
            "ds160year": "tbxMothersDOBYear"
        },
        {
            "id": "motherInUS",
            "label": "Mãe está nos EUA?",
            "type": "radio",
            "required": true,
            "hideWhenAllUnknown": [
                "motherSurname",
                "motherGivenName"
            ],
            "ds160": "rblMOTHER_LIVE_IN_US_IND"
        },
        {
            "id": "motherUSStatus",
            "label": "Status da mãe nos EUA",
            "type": "select",
            "required": true,
            "showWhen": {
                "field": "motherInUS",
                "equals": "Y"
            },
            "ds160": "ddlMOTHER_US_STATUS",
            "optionsRef": "usStatus"
        },
        {
            "id": "immediateRelativesInUS",
            "label": "Tem parentes imediatos nos EUA?",
            "type": "radio",
            "required": true,
            "spaceBefore": 16,
            "ds160": "rblUS_IMMED_RELATIVE_IND",
            "hint": "Parentes imediatos incluem: cônjuge, noivo(a), filho(a), irmão/irmã. Não inclui pais (já informados acima)."
        },
        {
            "id": "otherRelativesInUS",
            "label": "Tem outros parentes nos EUA?",
            "type": "radio",
            "required": true,
            "spaceBefore": 16,
            "showWhen": {
                "field": "immediateRelativesInUS",
                "equals": "N"
            },
            "ds160": "rblUS_OTHER_RELATIVE_IND"
        },
        {
            "id": "relatives",
            "label": "Parentes nos EUA",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "immediateRelativesInUS",
                "equals": "Y"
            },
            "ds160List": "dlUSRelatives",
            "fields": [
                {
                    "id": "givenName",
                    "label": "Nome",
                    "type": "text",
                    "required": true,
                    "maxLen": 33,
                    "noSpecial": true,
                    "uppercase": true,
                    "ds160": "tbxUS_REL_GIVEN_NAME"
                },
                {
                    "id": "surname",
                    "label": "Sobrenome",
                    "type": "text",
                    "required": true,
                    "maxLen": 33,
                    "noSpecial": true,
                    "uppercase": true,
                    "ds160": "tbxUS_REL_SURNAME"
                },
                {
                    "id": "type",
                    "label": "Parentesco",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlUS_REL_TYPE",
                    "optionsRef": "relativeTypes"
                },
                {
                    "id": "status",
                    "label": "Status migratório",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlUS_REL_STATUS",
                    "optionsRef": "usStatus"
                }
            ]
        },
        {
            "id": "otherRelatives",
            "label": "Outros parentes nos EUA",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "otherRelativesInUS",
                "equals": "Y"
            },
            "ds160List": "dlUSRelatives",
            "fields": [
                {
                    "id": "givenName",
                    "label": "Nome",
                    "type": "text",
                    "required": true,
                    "maxLen": 33,
                    "noSpecial": true,
                    "uppercase": true,
                    "ds160": "tbxUS_REL_GIVEN_NAME"
                },
                {
                    "id": "surname",
                    "label": "Sobrenome",
                    "type": "text",
                    "required": true,
                    "maxLen": 33,
                    "noSpecial": true,
                    "uppercase": true,
                    "ds160": "tbxUS_REL_SURNAME"
                },
                {
                    "id": "type",
                    "label": "Parentesco",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlUS_REL_TYPE",
                    "optionsRef": "relativeTypes"
                },
                {
                    "id": "status",
                    "label": "Status migratório",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlUS_REL_STATUS",
                    "optionsRef": "usStatus"
                }
            ]
        }
    ]
};
