/** 11-family-spouse — Família - Cônjuge/Parceiro(a) */
export default {
    "id": "family2",
    "label": "Família - Cônjuge/Parceiro(a)",
    "conditional": true,
    "showWhen": {
        "section": "personal1",
        "field": "maritalStatus",
        "in": [
            "M",
            "C",
            "L",
            "U"
        ]
    },
    "fields": [
        {
            "id": "spouseSurname",
            "label": "Sobrenome do Cônjuge/Parceiro(a)",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "ds160": "tbxSpouseSurname"
        },
        {
            "id": "spouseGivenName",
            "label": "Nome do Cônjuge/Parceiro(a)",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "ds160": "tbxSpouseGivenName"
        },
        {
            "id": "spouseDob",
            "label": "Data de Nascimento",
            "type": "date",
            "required": true,
            "ds160day": "ddlDOBDay",
            "ds160month": "ddlDOBMonth",
            "ds160year": "tbxDOBYear"
        },
        {
            "id": "spouseNationality",
            "label": "Nacionalidade",
            "type": "select",
            "required": true,
            "ds160": "ddlSpouseNatDropDownList",
            "optionsRef": "countries"
        },
        {
            "id": "h_spousePOB",
            "label": "Local de Nascimento do Cônjuge/Parceiro(a)",
            "type": "heading"
        },
        {
            "id": "spouseCityOfBirth",
            "label": "Cidade de Nascimento",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowUnknown": true,
            "ds160": "tbxSpousePOBCity"
        },
        {
            "id": "spouseCountryOfBirth",
            "label": "País de Nascimento",
            "type": "select",
            "required": true,
            "ds160": "ddlSpousePOBCountry",
            "optionsRef": "countries"
        },
        {
            "id": "spouseAddressType",
            "label": "Endereço do Cônjuge/Parceiro(a)",
            "type": "select",
            "required": true,
            "ds160": "ddlSpouseAddressType",
            "options": [
                {
                    "value": "H",
                    "label": "Mesmo endereço residencial"
                },
                {
                    "value": "M",
                    "label": "Mesmo endereço para correspondência"
                },
                {
                    "value": "U",
                    "label": "Mesmo endereço de contato nos EUA"
                },
                {
                    "value": "D",
                    "label": "Desconhecido"
                },
                {
                    "value": "O",
                    "label": "Outro (especificar endereço)"
                }
            ]
        },
        {
            "id": "spouseCountry",
            "label": "País",
            "type": "select",
            "required": true,
            "showWhen": {
                "field": "spouseAddressType",
                "equals": "O"
            },
            "ds160": "ddlSPOUSE_ADDR_CNTRY",
            "optionsRef": "countries",
            "default": "BRZL"
        },
        {
            "id": "spousePostalCode",
            "label": "CEP / Código Postal",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "allowNA": true,
            "showWhen": {
                "field": "spouseAddressType",
                "equals": "O"
            },
            "ds160": "tbxSPOUSE_ADDR_POSTAL_CD",
            "hint": "Digite o CEP para preencher o endereço automaticamente."
        },
        {
            "id": "spouseStreet1",
            "label": "Endereço - Linha 1",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "showWhen": {
                "field": "spouseAddressType",
                "equals": "O"
            },
            "ds160": "tbxSPOUSE_ADDR_LN1",
            "hint": "Número de caixa postal não será aceito."
        },
        {
            "id": "spouseStreet2",
            "label": "Endereço - Linha 2",
            "type": "text",
            "maxLen": 40,
            "showWhen": {
                "field": "spouseAddressType",
                "equals": "O"
            },
            "ds160": "tbxSPOUSE_ADDR_LN2"
        },
        {
            "id": "spouseCity",
            "label": "Cidade",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "showWhen": {
                "field": "spouseAddressType",
                "equals": "O"
            },
            "ds160": "tbxSPOUSE_ADDR_CITY"
        },
        {
            "id": "spouseState",
            "label": "Estado / Província",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowNA": true,
            "showWhen": {
                "field": "spouseAddressType",
                "equals": "O"
            },
            "ds160": "tbxSPOUSE_ADDR_STATE"
        }
    ]
};
