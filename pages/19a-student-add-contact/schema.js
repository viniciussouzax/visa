/** 19a-student-add-contact — Contatos Adicionais (F1/J1/M1 primary holders only)
 * 
 * DS-160 oficial: Additional Point of Contact Information
 * URL: complete_ExchangeVisitorAddContact.aspx?node=ExchangeVisitor2
 * 
 * NOTA: Esta seção NÃO aparece para dependentes (F2/J2/M2).
 *       Apenas primary holders (F1-F1, J1, M1) preenchem.
 * 
 * Requer pelo menos 2 contatos no país de residência
 * que possam verificar as informações (NÃO familiares).
 * 
 * É um array com "Add Another" no DS-160 oficial.
 * Cada contato indexado: dtlStudentAddPOC_ctl{NN}_{fieldId}
 */
export default {
    id: "studentAddContact",
    label: "Contatos Adicionais (Estudante)",
    conditional: true,
    showWhen: {
        section: "travel",
        field: "purposeOfTrip",
        in: ["F1-F1", "J1-J1", "M1"]
    },
    fields: [
        {
            id: "studentAddContactNote",
            type: "alert",
            alertStyle: "info",
            label: "Você indicou que pretende estudar nos EUA. Forneça pelo menos duas pessoas de contato no seu país de residência que possam verificar as informações fornecidas. Não inclua familiares imediatos."
        },
        {
            id: "contacts",
            label: "Contatos",
            type: "array",
            minEntries: 2,
            maxEntries: 5,
            required: true,
            fields: [
                { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, uppercase: true, ds160: "tbxADD_POC_SURNAME" },
                { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, uppercase: true, ds160: "tbxADD_POC_GIVEN_NAME" },
                { id: "address1", label: "Endereço (Linha 1)", type: "text", required: true, maxLen: 40, uppercase: true, ds160: "tbxADD_POC_ADDR_LN1" },
                { id: "address2", label: "Endereço (Linha 2 — Bairro)", type: "text", required: false, maxLen: 40, uppercase: true, ds160: "tbxADD_POC_ADDR_LN2" },
                { id: "city", label: "Cidade", type: "text", required: true, maxLen: 20, uppercase: true, ds160: "tbxADD_POC_ADDR_CITY" },
                { id: "state", label: "Estado / Província", type: "text", required: false, maxLen: 20, uppercase: true, hasNA: true, ds160: "tbxADD_POC_ADDR_STATE", ds160NA: "cbxADD_POC_ADDR_STATE_NA" },
                { id: "postalCode", label: "CEP / Código Postal", type: "text", required: false, maxLen: 10, hasNA: true, ds160: "tbxADD_POC_ADDR_POSTAL_CD", ds160NA: "cbxADD_POC_ADDR_POSTAL_CD_NA" },
                { id: "country", label: "País", type: "select", required: true, optionsRef: "countries", ds160: "ddlADD_POC_ADDR_CTRY" },
                { id: "phone", label: "Telefone", type: "phone", required: false, maxLen: 15, hasNA: true, ds160: "tbxADD_POC_TEL", ds160NA: "cbxADD_POC_TEL_NA" },
                { id: "email", label: "E-mail", type: "email", required: false, maxLen: 50, hasNA: true, ds160: "tbxADD_POC_EMAIL_ADDR", ds160NA: "cbxADD_POC_EMAIL_ADDR_NA" }
            ]
        }
    ]
};
