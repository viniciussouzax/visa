/** 07-address-phone — Endereço e Telefone */
export default {
    "id": "addressPhone",
    "label": "Endereço e Telefone",
    "fields": [
        {
            "id": "_homeAddressTitle",
            "label": "Endereço Residencial",
            "type": "heading"
        },
        {
            "id": "homeCountry",
            "label": "País / Região do endereço",
            "type": "select",
            "required": true,
            "ds160": "ddlCountry",
            "optionsRef": "countries",
            "default": "BRZL"
        },
        {
            "id": "homePostalCode",
            "label": "CEP / Código Postal",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "allowNA": true,
            "ds160": "tbxAPP_ADDR_POSTAL_CD",
            "hint": "Digite o CEP para preencher o endereço automaticamente."
        },
        {
            "id": "homeStreet1",
            "label": "Rua / Endereço (Linha 1)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "ds160": "tbxAPP_ADDR_LN1"
        },
        {
            "id": "homeStreet2",
            "label": "Rua / Endereço (Linha 2)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "ds160": "tbxAPP_ADDR_LN2"
        },
        {
            "id": "homeCity",
            "label": "Cidade",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "noSpecial": true,
            "ds160": "tbxAPP_ADDR_CITY"
        },
        {
            "id": "homeState",
            "label": "Estado / Província",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "noSpecial": true,
            "allowNA": true,
            "ds160": "tbxAPP_ADDR_STATE"
        },
        {
            "id": "_mailingAddressTitle",
            "label": "Endereço para Correspondência",
            "type": "heading",
            "spaceBefore": 16
        },
        {
            "id": "mailingAddressSame",
            "label": "O seu endereço para correspondência é o mesmo do seu endereço residencial?",
            "type": "radio",
            "required": true,
            "ds160": "rblMailingAddrSame"
        },
        {
            "id": "mailCountry",
            "label": "País / Região do endereço",
            "type": "select",
            "required": true,
            "showWhen": {
                "field": "mailingAddressSame",
                "equals": "N"
            },
            "ds160": "ddlMailCountry",
            "optionsRef": "countries"
        },
        {
            "id": "mailPostalCode",
            "label": "CEP / Código Postal",
            "type": "text",
            "required": true,
            "maxLen": 10,
            "allowNA": true,
            "showWhen": {
                "field": "mailingAddressSame",
                "equals": "N"
            },
            "ds160": "tbxMAILING_ADDR_POSTAL_CD"
        },
        {
            "id": "mailStreet1",
            "label": "Rua / Endereço (Linha 1)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "showWhen": {
                "field": "mailingAddressSame",
                "equals": "N"
            },
            "ds160": "tbxMAILING_ADDR_LN1"
        },
        {
            "id": "mailStreet2",
            "label": "Rua / Endereço (Linha 2)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "showWhen": {
                "field": "mailingAddressSame",
                "equals": "N"
            },
            "ds160": "tbxMAILING_ADDR_LN2"
        },
        {
            "id": "mailCity",
            "label": "Cidade",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "showWhen": {
                "field": "mailingAddressSame",
                "equals": "N"
            },
            "ds160": "tbxMAILING_ADDR_CITY"
        },
        {
            "id": "mailState",
            "label": "Estado / Província",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "allowNA": true,
            "showWhen": {
                "field": "mailingAddressSame",
                "equals": "N"
            },
            "ds160": "tbxMAILING_ADDR_STATE"
        },
        {
            "id": "_phoneTitle",
            "label": "Telefone",
            "type": "heading"
        },
        {
            "id": "phone",
            "label": "Número de Telefone Principal",
            "type": "phone",
            "required": true,
            "ds160": "tbxAPP_HOME_TEL",
            "hint": "Você deve fornecer um número de telefone principal. Este número deve ser o de mais fácil acesso (fixo ou celular)."
        },
        {
            "id": "mobilePhone",
            "label": "Número de Telefone Secundário",
            "type": "phone",
            "allowNA": true,
            "ds160": "tbxAPP_MOBILE_TEL",
            "hint": "Se possui outra linha fixa ou celular, informe aqui."
        },
        {
            "id": "businessPhone",
            "label": "Telefone Comercial",
            "type": "phone",
            "allowNA": true,
            "ds160": "tbxAPP_BUS_TEL"
        },
        {
            "id": "additionalPhones",
            "label": "Nos últimos cinco anos, utilizou algum outro número de telefone?",
            "type": "radio",
            "required": true,
            "ds160": "rblAddPhone"
        },
        {
            "id": "additionalPhoneNumbers",
            "label": "Telefone Adicional",
            "type": "array",
            "maxItems": 4,
            "showWhen": {
                "field": "additionalPhones",
                "equals": "Y"
            },
            "ds160List": "dtlAddPhone",
            "fields": [
                {
                    "id": "phone",
                    "label": "Número de Telefone Adicional",
                    "type": "phone",
                    "required": true,
                    "ds160": "tbxAddPhoneInfo"
                }
            ]
        },
        {
            "id": "email",
            "label": "Endereço de Email",
            "type": "email",
            "required": true,
            "maxLen": 50,
            "ds160": "tbxAPP_EMAIL_ADDR",
            "hint": "Você deve fornecer um endereço de email. O email informado será utilizado para correspondências. Forneça um email seguro e ao qual tenha acesso frequente. (ex: email@exemplo.com)"
        },
        {
            "id": "additionalEmails",
            "label": "Nos últimos cinco anos, utilizou algum outro endereço de email?",
            "type": "radio",
            "required": true,
            "ds160": "rblAddEmail"
        },
        {
            "id": "additionalEmailAddresses",
            "label": "Email Adicional",
            "type": "array",
            "maxItems": 4,
            "showWhen": {
                "field": "additionalEmails",
                "equals": "Y"
            },
            "ds160List": "dtlAddEmail",
            "fields": [
                {
                    "id": "email",
                    "label": "Endereço de Email Adicional",
                    "type": "email",
                    "required": true,
                    "maxLen": 50,
                    "ds160": "tbxAddEmailInfo"
                }
            ]
        },
        {
            "id": "_socialMediaTitle",
            "label": "Redes Sociais",
            "type": "heading"
        },
        {
            "id": "_socialMediaIntro",
            "label": "Você possui presença em redes sociais?",
            "type": "orientation",
            "text": "Da lista abaixo, selecione cada rede social que utilizou nos últimos cinco anos. No campo ao lado do nome da plataforma, informe o nome de usuário utilizado. Não forneça suas senhas. Se utilizou mais de uma plataforma ou mais de um nome de usuário em uma só plataforma, clique em 'Adicionar Outro' para listar cada um separadamente. Se não utilizou nenhuma das plataformas nos últimos cinco anos, selecione 'Nenhuma'."
        },
        {
            "id": "socialMedia",
            "label": "Redes Sociais",
            "type": "array",
            "maxItems": 5,
            "ds160List": "dtlSocial",
            "noneOnlyFirstEntry": true,
            "noneValue": "NONE",
            "noneField": "platform",
            "fields": [
                {
                    "id": "platform",
                    "label": "Plataforma / Provedor de Rede Social",
                    "type": "select",
                    "required": true,
                    "ds160": "ddlSocialMedia",
                    "default": "NONE",
                    "options": [
                        {
                            "value": "NONE",
                            "label": "NENHUMA"
                        },
                        {
                            "value": "ASKF",
                            "label": "ASK.FM"
                        },
                        {
                            "value": "DUBN",
                            "label": "DOUBAN"
                        },
                        {
                            "value": "FCBK",
                            "label": "FACEBOOK"
                        },
                        {
                            "value": "FLKR",
                            "label": "FLICKR"
                        },
                        {
                            "value": "GOGL",
                            "label": "GOOGLE+"
                        },
                        {
                            "value": "INST",
                            "label": "INSTAGRAM"
                        },
                        {
                            "value": "LINK",
                            "label": "LINKEDIN"
                        },
                        {
                            "value": "MYSP",
                            "label": "MYSPACE"
                        },
                        {
                            "value": "PTST",
                            "label": "PINTEREST"
                        },
                        {
                            "value": "QZNE",
                            "label": "QZONE (QQ)"
                        },
                        {
                            "value": "RDDT",
                            "label": "REDDIT"
                        },
                        {
                            "value": "SWBO",
                            "label": "SINA WEIBO"
                        },
                        {
                            "value": "TWBO",
                            "label": "TENCENT WEIBO"
                        },
                        {
                            "value": "TUMB",
                            "label": "TUMBLR"
                        },
                        {
                            "value": "TWIT",
                            "label": "TWITTER"
                        },
                        {
                            "value": "TWOO",
                            "label": "TWOO"
                        },
                        {
                            "value": "VINE",
                            "label": "VINE"
                        },
                        {
                            "value": "VKON",
                            "label": "VKONTAKTE (VK)"
                        },
                        {
                            "value": "YUKU",
                            "label": "YOUKU"
                        },
                        {
                            "value": "YTUB",
                            "label": "YOUTUBE"
                        }
                    ]
                },
                {
                    "id": "handle",
                    "label": "Identificador da Rede Social",
                    "type": "text",
                    "required": true,
                    "maxLen": 50,
                    "ds160": "tbxSocialMediaIdent"
                }
            ]
        },
        {
            "id": "additionalSocialMedia",
            "label": "Deseja fornecer informações sobre a sua presença em outros sites ou aplicativos que tenha usado nos últimos cinco anos para criar ou compartilhar conteúdo (fotos, vídeos, atualizações, etc.)?",
            "type": "radio",
            "required": true,
            "ds160": "rblAddSocial",
            "hint": "Não inclui mensagens privadas / serviços de mensagens pessoa-a-pessoa, como WhatsApp."
        },
        {
            "id": "additionalSocialMediaAccounts",
            "label": "Outras Redes Sociais",
            "type": "array",
            "maxItems": 4,
            "showWhen": {
                "field": "additionalSocialMedia",
                "equals": "Y"
            },
            "ds160List": "dtlAddSocial",
            "fields": [
                {
                    "id": "platform",
                    "label": "Plataforma de Rede Social Adicional",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "ds160": "tbxAddSocialPlat"
                },
                {
                    "id": "handle",
                    "label": "Identificador de Rede Social Adicional",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "ds160": "tbxAddSocialHand"
                }
            ]
        }
    ]
};
