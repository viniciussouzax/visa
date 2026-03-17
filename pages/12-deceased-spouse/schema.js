/** 12-deceased-spouse — Cônjuge Falecido */
export default {
    "id": "deceasedSpouse",
    "label": "Cônjuge Falecido",
    "conditional": true,
    "showWhen": {
        "section": "personal1",
        "field": "maritalStatus",
        "equals": "W"
    },
    "fields": [
        {
            "id": "surname",
            "label": "Sobrenome",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "ds160": "tbxSURNAME"
        },
        {
            "id": "givenName",
            "label": "Nome",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "ds160": "tbxGIVEN_NAME"
        },
        {
            "id": "dob",
            "label": "Data de Nascimento",
            "type": "date",
            "required": true,
            "ds160day": "ddlDOBDay",
            "ds160month": "ddlDOBMonth",
            "ds160year": "tbxDOBYear"
        },
        {
            "id": "nationality",
            "label": "Nacionalidade",
            "type": "select",
            "required": true,
            "ds160": "ddlSpouseNatDropDownList",
            "optionsRef": "countries"
        },
        {
            "id": "h_deceasedPOB",
            "label": "Local de Nascimento do Cônjuge Falecido",
            "type": "heading"
        },
        {
            "id": "cityOfBirth",
            "label": "Cidade de Nascimento",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowUnknown": true,
            "ds160": "tbxSpousePOBCity"
        },
        {
            "id": "countryOfBirth",
            "label": "País de Nascimento",
            "type": "select",
            "required": true,
            "ds160": "ddlSpousePOBCountry",
            "optionsRef": "countries"
        }
    ]
};
