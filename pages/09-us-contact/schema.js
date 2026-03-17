/** 09-us-contact — Contato nos EUA */
export default {
    "id": "usContact",
    "label": "Contato nos EUA",
    "fields": [
        {
            "id": "_contactIntro",
            "label": "Pessoa ou Organização de Contato nos Estados Unidos",
            "type": "orientation",
            "text": "Seu ponto de contato pode ser qualquer pessoa nos EUA que o conheça e possa, se necessário, verificar sua identidade. Se não conhecer ninguém pessoalmente, informe o nome da loja, empresa ou organização que pretende visitar."
        },
        {
            "id": "contactType",
            "label": "Tipo de Contato",
            "type": "radio",
            "required": true,
            "options": [
                {
                    "value": "P",
                    "label": "Pessoa"
                },
                {
                    "value": "O",
                    "label": "Organização"
                }
            ]
        },
        {
            "id": "surname",
            "label": "Sobrenome do Contato",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "showWhen": {
                "field": "contactType",
                "equals": "P"
            },
            "ds160": "tbxUS_POC_SURNAME"
        },
        {
            "id": "givenName",
            "label": "Nome do Contato",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "showWhen": {
                "field": "contactType",
                "equals": "P"
            },
            "ds160": "tbxUS_POC_GIVEN_NAME"
        },
        {
            "id": "organization",
            "label": "Nome da Organização",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "showWhen": {
                "field": "contactType",
                "equals": "O"
            },
            "ds160": "tbxUS_POC_ORGANIZATION"
        },
        {
            "id": "relationship",
            "label": "Relação com Você",
            "type": "select",
            "required": true,
            "ds160": "ddlUS_POC_REL_TO_APP",
            "optionsRef": "usContactRelationships"
        },
        {
            "id": "usContactStreet1",
            "label": "Endereço nos EUA (Linha 1)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "ds160": "tbxUS_POC_ADDR_LN1"
        },
        {
            "id": "usContactStreet2",
            "label": "Endereço nos EUA (Linha 2)",
            "type": "text",
            "maxLen": 40,
            "ds160": "tbxUS_POC_ADDR_LN2",
            "hint": "Opcional"
        },
        {
            "id": "usContactCity",
            "label": "Cidade",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "ds160": "tbxUS_POC_ADDR_CITY"
        },
        {
            "id": "usContactState",
            "label": "Estado",
            "type": "select",
            "required": true,
            "ds160": "ddlUS_POC_ADDR_STATE",
            "optionsRef": "usStates"
        },
        {
            "id": "usContactZip",
            "label": "CEP (ZIP Code)",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "ds160": "tbxUS_POC_ADDR_POSTAL_CD",
            "hint": "ex: 55555 ou 55555-5555"
        },
        {
            "id": "usContactPhone",
            "label": "Telefone",
            "type": "phone",
            "required": true,
            "phoneCountry": "us",
            "phoneLocked": true,
            "ds160": "tbxUS_POC_HOME_TEL",
            "hint": "ex: 5555555555"
        },
        {
            "id": "usContactEmail",
            "label": "Email",
            "type": "email",
            "required": true,
            "maxLen": 50,
            "allowNA": true,
            "ds160": "tbxUS_POC_EMAIL_ADDR",
            "hint": "Preencha ou marque 'Não se Aplica'"
        }
    ]
};
