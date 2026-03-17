/** 21-review — Review Application (automação only)
 * Essa etapa NÃO aparece no formulário clone do solicitante.
 * É executada pela automação após preencher todas as seções Complete + Photo.
 * 
 * DS-160 oficial: page Review
 * URL: https://ceac.state.gov/GenNIV/General/complete/complete_review.aspx
 * 
 * Fluxo:
 * 1. Clicar "Review Application" 
 * 2. Verificar que todas as seções mostram ✓
 * 3. Clicar "Next: Sign and Submit"
 */
export default {
    id: "review",
    label: "Revisão",
    automationOnly: true, // NÃO renderizar no formulário clone
    fields: []
};
