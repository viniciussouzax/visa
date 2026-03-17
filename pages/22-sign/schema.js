/** 22-sign — Sign and Submit Application (automação only)
 * Essa etapa NÃO aparece no formulário clone do solicitante.
 * É a última etapa executada pela automação.
 * 
 * DS-160 oficial: Sign and Submit
 * URL: https://ceac.state.gov/GenNIV/General/complete/complete_sign.aspx
 * 
 * Fluxo:
 * 1. Preencher campo de assinatura (Passport Number)
 * 2. Selecionar Security Question
 * 3. Preencher Security Answer
 * 4. Clicar "Sign and Submit Application"
 * 5. Capturar confirmação (Application ID + barcode)
 */
export default {
    id: "sign",
    label: "Assinar e Enviar",
    automationOnly: true, // NÃO renderizar no formulário clone
    fields: []
};
