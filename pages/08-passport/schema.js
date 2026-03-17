/** 08-passport — Passaporte */
export default {
    "id": "passport",
    "label": "Passaporte",
    "fields": [
        {
            "id": "type",
            "label": "Tipo de Passaporte",
            "type": "select",
            "required": true,
            "ds160": "ddlPPT_TYPE",
            "options": [
                {
                    "value": "R",
                    "label": "Regular"
                },
                {
                    "value": "D",
                    "label": "Diplomático"
                },
                {
                    "value": "O",
                    "label": "Oficial"
                },
                {
                    "value": "L",
                    "label": "Laissez-Passer"
                },
                {
                    "value": "OT",
                    "label": "Outro"
                }
            ]
        },
        {
            "id": "typeExplanation",
            "label": "Explique outro tipo",
            "type": "textarea",
            "required": true,
            "maxLen": 200,
            "showWhen": {
                "field": "type",
                "equals": "OT"
            },
            "ds160": "tbxPptOtherExpl"
        },
        {
            "id": "number",
            "label": "Número do Passaporte",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "ds160": "tbxPPT_NUM",
            "hint": "Insira exatamente como consta no passaporte, incluindo letras e números."
        },
        {
            "id": "bookNumber",
            "label": "Número do Livro do Passaporte",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowNA": true,
            "ds160": "tbxPPT_BOOK_NUM",
            "hint": "O número do livro pode estar impresso na contracapa do passaporte. Marque 'Não se Aplica' se não houver."
        },
        {
            "id": "issuingCountry",
            "label": "País/Autoridade que Emitiu",
            "type": "select",
            "required": true,
            "ds160": "ddlPPT_ISSUED_CNTRY",
            "optionsRef": "countries",
            "hint": "País ou autoridade responsável pela emissão do passaporte."
        },
        {
            "id": "issuedCity",
            "label": "Cidade de Emissão",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "noSpecial": true,
            "ds160": "tbxPPT_ISSUED_IN_CITY"
        },
        {
            "id": "issuedState",
            "label": "Estado/Província de Emissão",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "noSpecial": true,
            "ds160": "tbxPPT_ISSUED_IN_STATE"
        },
        {
            "id": "issuedCountry",
            "label": "País/Região onde foi emitido",
            "type": "select",
            "required": true,
            "ds160": "ddlPPT_ISSUED_IN_CNTRY",
            "optionsRef": "countries",
            "hint": "Local físico onde o passaporte foi emitido (pode ser diferente do país emissor)."
        },
        {
            "id": "issuanceDate",
            "label": "Data de Emissão",
            "type": "date",
            "required": true,
            "ds160day": "ddlPPT_ISSUED_DTEDay",
            "ds160month": "ddlPPT_ISSUED_DTEMonth",
            "ds160year": "tbxPPT_ISSUEDYear",
            "hint": "Data em que o passaporte foi emitido."
        },
        {
            "id": "expirationDate",
            "label": "Data de Expiração",
            "type": "date",
            "required": true,
            "allowNA": true,
            "ds160day": "ddlPPT_EXPIRE_DTEDay",
            "ds160month": "ddlPPT_EXPIRE_DTEMonth",
            "ds160year": "tbxPPT_EXPIREYear",
            "hint": "Marque 'Não se Aplica' se o passaporte não tiver data de expiração."
        },
        {
            "id": "lostOrStolen",
            "label": "Já perdeu passaporte ou teve roubado?",
            "type": "radio",
            "required": true,
            "ds160": "rblLOST_PPT_IND",
            "hint": "Inclui todos os passaportes anteriores, não apenas o atual."
        },
        {
            "id": "lostPassports",
            "label": "Passaportes perdidos/roubados",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "lostOrStolen",
                "equals": "Y"
            },
            "ds160List": "dtlLostPPT",
            "fields": [
                {
                    "id": "number",
                    "label": "Número",
                    "type": "text",
                    "required": true,
                    "maxLen": 20,
                    "ds160": "tbxLOST_PPT_NUM"
                },
                {
                    "id": "country",
                    "label": "País",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlLOST_PPT_NATL",
                    "optionsRef": "countries"
                },
                {
                    "id": "explanation",
                    "label": "Explique",
                    "type": "textarea",
                    "required": true,
                    "maxLen": 200,
                    "ds160": "tbxLOST_PPT_EXPL"
                }
            ]
        }
    ]
};
