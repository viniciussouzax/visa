// ============================================================
// Print Application — Field map
// ============================================================
// URL: common/printapplication.aspx?{encrypted_param}
//
// Particularidade: pode exibir um dialog/modal "OK" que precisa
// ser aceito antes de qualquer ação.
//
// Ações:
//   1. Aceitar dialog OK (se presente)
//   2. Salvar/imprimir a aplicação como PDF
//   3. Click "Back: Confirmation Page" para voltar
//
// IDs oficiais (ds160map):
//   Back button:        TopUpdateButton1  (Back: Confirmation Page)
//   Print button:       TopButton2        (Print Application)
// ============================================================

function buildPrintAppMap(a, ctx) {
    return [
        // 1. Aceitar dialog OK se presente
        {
            type: 'dialog',
            action: 'accept',
            description: 'Accept OK dialog if shown (before page loads fully)'
        },
        // 2. Salvar página como PDF (via Playwright page.pdf() ou print)
        {
            type: 'navigation',
            action: 'save_pdf',
            saveAs: 'application',
            description: 'Save/print full application as PDF'
        },
        // 3. Voltar para Confirmation
        {
            type: 'navigation',
            action: 'click',
            pattern: /TopUpdateButton1$/i,
            description: 'Click "Back: Confirmation Page"'
        }
    ];
}

module.exports = { buildPrintAppMap };
