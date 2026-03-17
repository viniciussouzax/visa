/** 02-personal1 — Informações Pessoais 1 */
export default {
    "id": "personal1",
    "label": "Informações Pessoais 1",
    "fields": [
        {
            "id": "givenName",
            "label": "Nome",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "ds160": "tbxAPP_GIVEN_NAME",
            "hint": "Se o passaporte não tiver nome, insira \"FNU\"."
        },
        {
            "id": "surname",
            "label": "Sobrenome",
            "type": "text",
            "required": true,
            "maxLen": 33,
            "noSpecial": true,
            "uppercase": true,
            "ds160": "tbxAPP_SURNAME",
            "hint": "Insira todos os sobrenomes conforme consta no passaporte."
        },
        {
            "id": "fullNameNative",
            "label": "Nome completo no alfabeto nativo",
            "type": "text",
            "required": true,
            "maxLen": 100,
            "allowNA": true,
            "ds160": "tbxAPP_FULL_NAME_NATIVE",
            "hint": "Escreva seu nome completo no alfabeto do seu país."
        },
        {
            "id": "otherNamesUsed",
            "label": "Já usou outros nomes?",
            "type": "radio",
            "required": true,
            "ds160": "rblOtherNames",
            "hint": "Inclui nome de solteiro(a), nome religioso, profissional, apelido ou qualquer outro nome pelo qual você é ou foi conhecido(a)."
        },
        {
            "id": "otherNames",
            "label": "Outros nomes",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "otherNamesUsed",
                "equals": "Y"
            },
            "ds160List": "DListAlias",
            "fields": [
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
                    "id": "surname",
                    "label": "Sobrenome",
                    "type": "text",
                    "required": true,
                    "maxLen": 33,
                    "noSpecial": true,
                    "uppercase": true,
                    "ds160": "tbxSURNAME"
                }
            ]
        },
        {
            "id": "telecode",
            "label": "Possui telecode?",
            "type": "radio",
            "required": true,
            "ds160": "rblTelecodeQuestion",
            "hint": "Telecodes são códigos numéricos de 4 dígitos que representam caracteres em nomes com alfabeto não-romano. Se não souber, selecione Não."
        },
        {
            "id": "telecodeGivenName",
            "label": "Telecode do Nome",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "groupLabel": "Resposta",
            "showWhen": {
                "field": "telecode",
                "equals": "Y"
            },
            "ds160": "tbxAPP_TelecodeGIVEN_NAME"
        },
        {
            "id": "telecodeSurname",
            "label": "Telecode do Sobrenome",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "showWhen": {
                "field": "telecode",
                "equals": "Y"
            },
            "ds160": "tbxAPP_TelecodeSURNAME"
        },
        {
            "id": "sex",
            "label": "Sexo",
            "type": "select",
            "required": true,
            "ds160": "ddlAPP_GENDER",
            "options": [
                {
                    "value": "M",
                    "label": "Masculino"
                },
                {
                    "value": "F",
                    "label": "Feminino"
                }
            ]
        },
        {
            "id": "maritalStatus",
            "label": "Estado Civil",
            "type": "select",
            "required": true,
            "ds160": "ddlAPP_MARITAL_STATUS",
            "options": [
                {
                    "value": "M",
                    "label": "Casado(a)"
                },
                {
                    "value": "C",
                    "label": "União Estável"
                },
                {
                    "value": "U",
                    "label": "União Civil/Parceria Doméstica"
                },
                {
                    "value": "S",
                    "label": "Solteiro(a)"
                },
                {
                    "value": "W",
                    "label": "Viúvo(a)"
                },
                {
                    "value": "D",
                    "label": "Divorciado(a)"
                },
                {
                    "value": "L",
                    "label": "Separado(a) Legalmente"
                },
                {
                    "value": "O",
                    "label": "Outro"
                }
            ],
            "optionHints": {
                "M": "Casamento civil formalizado legalmente.",
                "C": "Relação em que o casal vive como casado, sem casamento civil formal.",
                "U": "União registrada legalmente entre duas pessoas, semelhante ao casamento.",
                "S": "Pessoa que nunca se casou.",
                "W": "Pessoa cujo cônjuge faleceu.",
                "D": "Casamento encerrado oficialmente por divórcio.",
                "L": "Casamento ainda existente legalmente, mas com separação reconhecida pela justiça.",
                "O": "Situação civil diferente das opções listadas."
            }
        },
        {
            "id": "otherMaritalStatusText",
            "label": "Especifique estado civil",
            "type": "textarea",
            "required": true,
            "maxLen": 200,
            "showWhen": {
                "field": "maritalStatus",
                "equals": "O"
            },
            "ds160": "tbxOtherMaritalStatus"
        },
        {
            "id": "dob",
            "label": "Data de Nascimento",
            "type": "date",
            "required": true,
            "notFuture": true,
            "ds160day": "ddlDOBDay",
            "ds160month": "ddlDOBMonth",
            "ds160year": "tbxDOBYear",
            "hint": "Formato: DD-MMM-AAAA. Se dia ou mês desconhecido, insira conforme consta no passaporte."
        },
        {
            "id": "cityOfBirth",
            "label": "Cidade de Nascimento",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "noSpecial": true,
            "ds160": "tbxAPP_POB_CITY"
        },
        {
            "id": "stateOfBirth",
            "label": "Estado/Província de Nascimento",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "noSpecial": true,
            "allowNA": true,
            "ds160": "tbxAPP_POB_ST_PROVINCE"
        },
        {
            "id": "countryOfBirth",
            "label": "País de Nascimento",
            "type": "select",
            "required": true,
            "ds160": "ddlAPP_POB_CNTRY",
            "optionsRef": "countries",
            "default": "BRZL",
            "hint": "Selecione o nome atualmente usado para o local onde você nasceu."
        }
    ]
};
