/** 19-petition-info — Temporary Work Visa Information
 *  Usado por vistos de trabalho: H, L, O, P, Q, R e dependentes
 *  URL oficial: complete_temporarywork.aspx?node=TemporaryWork
 */
export default {
    "id": "temporaryWork",
    "label": "Informações de Trabalho Temporário",
    "conditional": true,
    "showWhen": {
        "section": "travel",
        "field": "purposeCategory",
        "in": ["H", "L", "O", "P", "Q", "R"]
    },
    "fields": [
        {
            "id": "petitionNumber",
            "label": "Número do Recibo/Petição",
            "type": "text",
            "required": true,
            "maxLen": 13,
            "uppercase": true,
            "hint": "ex: ABC1234567890",
            "ds160": "tbxPetitionNumber"
        },
        {
            "id": "nameOfPetitioner",
            "label": "Nome da Pessoa/Empresa que Entrou com a Petição",
            "type": "text",
            "required": true,
            "maxLen": 66,
            "uppercase": true,
            "ds160": "tbxNameOfPetitioner"
        },
        {
            "id": "employerName",
            "label": "Nome do Empregador",
            "type": "text",
            "required": true,
            "maxLen": 75,
            "uppercase": true,
            "ds160": "tbxEmployerName"
        },
        {
            "id": "employerAddress",
            "label": "Endereço nos EUA (Linha 1)",
            "type": "text",
            "required": true,
            "maxLen": 40,
            "uppercase": true,
            "ds160": "tbxEmpStreetAddress1"
        },
        {
            "id": "employerAddress2",
            "label": "Endereço nos EUA (Linha 2)",
            "type": "text",
            "required": false,
            "maxLen": 40,
            "uppercase": true,
            "ds160": "tbxEmpStreetAddress2"
        },
        {
            "id": "employerCity",
            "label": "Cidade",
            "type": "text",
            "required": true,
            "maxLen": 20,
            "uppercase": true,
            "ds160": "tbxEmpCity"
        },
        {
            "id": "employerState",
            "label": "Estado",
            "type": "select",
            "required": true,
            "optionsRef": "usStates",
            "ds160": "ddlEmpState"
        },
        {
            "id": "employerZip",
            "label": "CEP (ZIP Code)",
            "type": "text",
            "required": false,
            "maxLen": 10,
            "hint": "ex: 55555 ou 55555-5555",
            "ds160": "tbxZIPCode"
        },
        {
            "id": "employerPhone",
            "label": "Telefone",
            "type": "text",
            "required": true,
            "maxLen": 15,
            "hint": "ex: 5555555555",
            "ds160": "tbxTEMP_WORK_TEL"
        },
        {
            "id": "monthlySalary",
            "label": "Renda Mensal (em USD)",
            "type": "text",
            "required": true,
            "maxLen": 11,
            "ds160": "tbxEmpSalaryInUSD"
        }
    ]
};
