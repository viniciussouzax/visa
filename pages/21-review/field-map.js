// ============================================================
// Review — Field map (automação only)
// Não há campos para preencher, apenas navegação
// ============================================================
// DS-160 Review Page flow:
// 1. Verificar todos os checks verdes
// 2. Scroll to bottom
// 3. Click "Next: Sign and Submit" button
//    ID: ctl00_SiteContentPlaceHolder_UpdateButton3
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context
 * @returns {Array} Navigation actions for review page
 */
function buildReviewMap(a, ctx) {
    return [
        {
            type: 'navigation',
            action: 'click_next',
            ds160ButtonId: 'ctl00_SiteContentPlaceHolder_UpdateButton3',
            description: 'Click "Next: Sign and Submit" after verifying all sections are complete'
        }
    ];
}

module.exports = { buildReviewMap };
