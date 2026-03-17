/** 13-prev-spouse — Ex-Cônjuge */
export default {
    "id": "prevSpouse",
    "label": "Ex-Cônjuge",
    "conditional": true,
    "showWhen": {
        "section": "personal1",
        "field": "maritalStatus",
        "equals": "D"
    },
    "fields": [
        {
            "id": "numberOfPrevious",
            "label": "Número de ex-cônjuges",
            "type": "text",
            "required": true,
            "maxLen": 2,
            "ds160": "tbxNumberOfPrevSpouses"
        },
        {
            "id": "spouses",
            "label": "Informações do(a) ex-cônjuge",
            "type": "array",
            "maxItems": 5,
            "ds160List": "DListSpouse",
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
                    "id": "h_formerPOB",
                    "label": "Local de Nascimento do(a) Ex-Cônjuge",
                    "type": "heading"
                },
                {
                    "id": "pobCity",
                    "label": "Cidade de Nascimento",
                    "type": "text",
                    "required": true,
                    "maxLen": 20,
                    "allowUnknown": true,
                    "ds160": "tbxSpousePOBCity"
                },
                {
                    "id": "pobCountry",
                    "label": "País de Nascimento",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlSpousePOBCountry",
                    "optionsRef": "countries"
                },
                {
                    "id": "dateOfMarriage",
                    "label": "Data do Casamento",
                    "type": "date",
                    "required": true,
                    "ds160day": "ddlDomDay",
                    "ds160month": "ddlDomMonth",
                    "ds160year": "txtDomYear"
                },
                {
                    "id": "dateMarriageEnded",
                    "label": "Data do Término do Casamento",
                    "type": "date",
                    "required": true,
                    "ds160day": "ddlDomEndDay",
                    "ds160month": "ddlDomEndMonth",
                    "ds160year": "txtDomEndYear"
                },
                {
                    "id": "howEnded",
                    "label": "Como o casamento terminou",
                    "type": "textarea",
                    "required": true,
                    "maxLen": 4000,
                    "ds160": "tbxHowMarriageEnded"
                },
                {
                    "id": "countryTerminated",
                    "label": "País/Região onde o casamento foi dissolvido",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlMarriageEnded_CNTRY",
                    "optionsRef": "countries"
                }
            ]
        }
    ]
};
