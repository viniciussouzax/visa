/** 16-work-education-additional — Trabalho/Educação - Adicional */
export default {
    "id": "workEducation3",
    "label": "Trabalho/Educação - Adicional",
    "fields": [
        {
            "id": "clanTribe",
            "label": "Pertence a algum clã ou tribo?",
            "type": "radio",
            "required": true,
            "ds160": "rblCLAN_TRIBE_IND"
        },
        {
            "id": "clanTribeName",
            "label": "Nome do clã/tribo",
            "type": "text",
            "required": true,
            "maxLen": 80,
            "showWhen": {
                "field": "clanTribe",
                "equals": "Y"
            },
            "ds160": "tbxCLAN_TRIBE_NAME"
        },
        {
            "id": "languages",
            "label": "Idiomas que fala",
            "type": "array",
            "maxItems": 5,
            "ds160List": "dtlLANGUAGES",
            "fields": [
                {
                    "id": "name",
                    "label": "Idioma",
                    "type": "text",
                    "required": true,
                    "maxLen": 66,
                    "fullWidth": true,
                    "ds160": "tbxLANGUAGE_NAME"
                }
            ]
        },
        {
            "id": "countriesVisited",
            "label": "Visitou outros países nos últimos 5 anos?",
            "type": "radio",
            "required": true,
            "ds160": "rblCOUNTRIES_VISITED_IND",
            "hint": "Informe todos os países/regiões que visitou nos últimos 5 anos."
        },
        {
            "id": "countriesVisitedList",
            "label": "Países visitados",
            "type": "array",
            "maxItems": 10,
            "showWhen": {
                "field": "countriesVisited",
                "equals": "Y"
            },
            "ds160List": "dtlCountriesVisited",
            "fields": [
                {
                    "id": "country",
                    "label": "País / Região",
                    "type": "select",
                    "required": true,
                    "fullWidth": true,
                    "ds160": "ddlCOUNTRIES_VISITED",
                    "optionsRef": "countries"
                }
            ]
        },
        {
            "id": "organizationMember",
            "label": "Pertenceu, contribuiu ou trabalhou em organizações profissionais, sociais ou de caridade?",
            "type": "radio",
            "required": true,
            "ds160": "rblORGANIZATION_IND"
        },
        {
            "id": "organizations",
            "label": "Organizações",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "organizationMember",
                "equals": "Y"
            },
            "ds160List": "dtlORGANIZATIONS",
            "fields": [
                {
                    "id": "name",
                    "label": "Nome da organização",
                    "type": "text",
                    "required": true,
                    "maxLen": 66,
                    "fullWidth": true,
                    "ds160": "tbxORGANIZATION_NAME"
                }
            ]
        },
        {
            "id": "specializedSkills",
            "label": "Possui habilidades ou treinamento especializado?",
            "type": "radio",
            "required": true,
            "ds160": "rblSPECIALIZED_SKILLS_IND",
            "hint": "Inclui treinamento em armas de fogo, explosivos, energia nuclear/biológica/química."
        },
        {
            "id": "specializedSkillsExplanation",
            "label": "Descreva",
            "type": "textarea",
            "required": true,
            "maxLen": 4000,
            "showWhen": {
                "field": "specializedSkills",
                "equals": "Y"
            },
            "ds160": "tbxSPECIALIZED_SKILLS_EXPL"
        },
        {
            "id": "militaryService",
            "label": "Já serviu nas forças armadas?",
            "type": "radio",
            "required": true,
            "ds160": "rblMILITARY_SERVICE_IND"
        },
        {
            "id": "military",
            "label": "Serviço militar",
            "type": "array",
            "maxItems": 5,
            "showWhen": {
                "field": "militaryService",
                "equals": "Y"
            },
            "ds160List": "dtlMILITARY_SERVICE",
            "fields": [
                {
                    "id": "country",
                    "label": "País / Região",
                    "type": "select",
                    "required": true,
                    "fullWidth": true,
                    "ds160": "ddlMILITARY_SVC_CNTRY",
                    "optionsRef": "countries"
                },
                {
                    "id": "branch",
                    "label": "Ramo das Forças Armadas",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "fullWidth": true,
                    "ds160": "tbxMILITARY_SVC_BRANCH"
                },
                {
                    "id": "rank",
                    "label": "Patente / Posto",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "fullWidth": true,
                    "ds160": "tbxMILITARY_SVC_RANK"
                },
                {
                    "id": "specialty",
                    "label": "Especialidade Militar",
                    "type": "text",
                    "required": true,
                    "maxLen": 40,
                    "fullWidth": true,
                    "ds160": "tbxMILITARY_SVC_SPECIALTY"
                },
                {
                    "id": "startDate",
                    "label": "Data início",
                    "type": "date",
                    "required": true,
                    "fullWidth": true,
                    "ds160day": "ddlMILITARY_SVC_FROMDay",
                    "ds160month": "ddlMILITARY_SVC_FROMMonth",
                    "ds160year": "tbxMILITARY_SVC_FROMYear"
                },
                {
                    "id": "endDate",
                    "label": "Data término",
                    "type": "date",
                    "required": true,
                    "fullWidth": true,
                    "ds160day": "ddlMILITARY_SVC_TODay",
                    "ds160month": "ddlMILITARY_SVC_TOMonth",
                    "ds160year": "tbxMILITARY_SVC_TOYear"
                }
            ]
        },
        {
            "id": "insurgentOrg",
            "label": "Já serviu, foi membro ou esteve envolvido com unidade paramilitar, milícia, grupo rebelde, guerrilha ou organização insurgente?",
            "type": "radio",
            "required": true,
            "ds160": "rblINSURGENT_ORG_IND"
        },
        {
            "id": "insurgentOrgExplanation",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 4000,
            "showWhen": {
                "field": "insurgentOrg",
                "equals": "Y"
            },
            "ds160": "tbxINSURGENT_ORG_EXPL"
        }
    ]
};
