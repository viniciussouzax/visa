/** 17-security — Segurança e Antecedentes */
export default {
    "id": "security",
    "label": "Segurança e Antecedentes",
    "fields": [
        {
            "id": "disease",
            "label": "Possui doença comunicável (ex: tuberculose)?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblDisease"
        },
        {
            "id": "diseaseExpl",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 200,
            "showWhen": {
                "field": "disease",
                "equals": "Y"
            },
            "ds160": "tbxDisease_EXPL"
        },
        {
            "id": "disorder",
            "label": "Possui distúrbio mental ou físico?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblDisorder"
        },
        {
            "id": "disorderExpl",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 200,
            "showWhen": {
                "field": "disorder",
                "equals": "Y"
            },
            "ds160": "tbxDisorder_EXPL"
        },
        {
            "id": "drugUser",
            "label": "É usuário de drogas?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblDruguser"
        },
        {
            "id": "drugUserExpl",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 200,
            "showWhen": {
                "field": "drugUser",
                "equals": "Y"
            },
            "ds160": "tbxDruguser_EXPL"
        },
        {
            "id": "arrested",
            "label": "Já foi preso ou condenado?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblArrested"
        },
        {
            "id": "arrestedExpl",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 200,
            "showWhen": {
                "field": "arrested",
                "equals": "Y"
            },
            "ds160": "tbxArrested_EXPL"
        },
        {
            "id": "controlledSubstances",
            "label": "Violou lei de substâncias controladas?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblControlledSubstances"
        },
        {
            "id": "controlledSubstancesExpl",
            "label": "Explique",
            "type": "textarea",
            "required": true,
            "maxLen": 200,
            "showWhen": {
                "field": "controlledSubstances",
                "equals": "Y"
            },
            "ds160": "tbxControlledSubstances_EXPL"
        },
        {
            "id": "prostitution",
            "label": "Envolvido em prostituição?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblProstitution"
        },
        {
            "id": "moneyLaundering",
            "label": "Envolvido em lavagem de dinheiro?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblMoneyLaundering"
        },
        {
            "id": "humanTrafficking",
            "label": "Envolvido em tráfico de pessoas?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblHumanTrafficking"
        },
        {
            "id": "assistedSevereTrafficking",
            "label": "Auxiliou tráfico severo?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblAssistedSevereTrafficking"
        },
        {
            "id": "humanTraffickingRelated",
            "label": "Parente de traficante de pessoas?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblHumanTraffickingRelated"
        },
        {
            "id": "illegalActivity",
            "label": "Pretende atividades ilegais nos EUA?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblIllegalActivity"
        },
        {
            "id": "terroristActivity",
            "label": "Envolvido em atividades terroristas?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblTerroristActivity"
        },
        {
            "id": "terroristSupport",
            "label": "Apoiou atividades terroristas?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblTerroristSupport"
        },
        {
            "id": "terroristOrg",
            "label": "Membro de organização terrorista?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblTerroristOrg"
        },
        {
            "id": "terroristRel",
            "label": "Parente de envolvido em terrorismo?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblTerroristRel"
        },
        {
            "id": "genocide",
            "label": "Envolvido em genocídio?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblGenocide"
        },
        {
            "id": "torture",
            "label": "Envolvido em tortura?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblTorture"
        },
        {
            "id": "exViolence",
            "label": "Envolvido em violência extrajudicial?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblExViolence"
        },
        {
            "id": "childSoldier",
            "label": "Recrutou crianças-soldado?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblChildSoldier"
        },
        {
            "id": "religiousFreedom",
            "label": "Violou liberdade religiosa?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblReligiousFreedom"
        },
        {
            "id": "populationControls",
            "label": "Envolvido em controle populacional forçado?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblPopulationControls"
        },
        {
            "id": "transplant",
            "label": "Envolvido em transplante forçado de órgãos?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblTransplant"
        },
        {
            "id": "removalHearing",
            "label": "Já teve audiência de remoção?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblRemovalHearing"
        },
        {
            "id": "immigrationFraud",
            "label": "Cometeu fraude imigratória?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblImmigrationFraud"
        },
        {
            "id": "failToAttend",
            "label": "Falhou em comparecer a audiência?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblFailToAttend"
        },
        {
            "id": "visaViolation",
            "label": "Violou termos do visto?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblVisaViolation"
        },
        {
            "id": "deport",
            "label": "Já foi deportado?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblDeport"
        },
        {
            "id": "childCustody",
            "label": "Detém custódia de criança de cidadão americano?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblChildCustody"
        },
        {
            "id": "votingViolation",
            "label": "Violou lei eleitoral?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblVotingViolation"
        },
        {
            "id": "renounceExp",
            "label": "Renunciou cidadania para evitar impostos?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblRenounceExp"
        },
        {
            "id": "attWoReimb",
            "label": "Participou de treinamento sem reembolso?",
            "type": "radio",
            "required": true,
            "default": "N",
            "ds160": "rblAttWoReimb"
        }
    ]
};
