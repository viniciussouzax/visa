/** 05-travel-companions — Acompanhantes de Viagem */
export default {
    "id": "travelCompanions",
    "label": "Acompanhantes de Viagem",
    "fields": [
        {
            "id": "travelingWithOthers",
            "label": "Viaja com outras pessoas?",
            "type": "radio",
            "required": true,
            "ds160": "rblOtherPersonsTravelingWithYou",
            "hint": "Inclua familiares, amigos ou qualquer pessoa que viajará junto com você."
        },
        {
            "id": "partOfGroup",
            "label": "Faz parte de um grupo?",
            "type": "radio",
            "required": true,
            "showWhen": {
                "field": "travelingWithOthers",
                "equals": "Y"
            },
            "ds160": "rblGroupTravel",
            "hint": "Selecione Sim se estiver viajando como parte de um grupo ou organização."
        },
        {
            "id": "groupName",
            "label": "Nome do grupo",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "showWhen": {
                "field": "partOfGroup",
                "equals": "Y"
            },
            "ds160": "tbxGroupName",
            "hint": "Informe o nome do grupo com o qual você está viajando."
        },
        {
            "id": "companions",
            "label": "Acompanhantes",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "partOfGroup",
                "equals": "N"
            },
            "ds160List": "dlTravelCompanions",
            "fields": [
                {
                    "id": "givenName",
                    "label": "Nome",
                    "type": "text",
                    "required": true,
                    "maxLen": 33,
                    "noSpecial": true,
                    "uppercase": true,
                    "ds160": "tbxTC_GIVEN_NAME"
                },
                {
                    "id": "surname",
                    "label": "Sobrenome",
                    "type": "text",
                    "required": true,
                    "maxLen": 33,
                    "noSpecial": true,
                    "uppercase": true,
                    "ds160": "tbxTC_SURNAME"
                },
                {
                    "id": "relationship",
                    "label": "Relação",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlTCRelationship",
                    "optionsRef": "relationships"
                }
            ]
        }
    ]
};
