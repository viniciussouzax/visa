// ============================================================
// Confirmation Page — Field map
// ============================================================
// URL: ESign/Complete_Done_Confirmation.aspx?node=Done
//
// Esta é a página de confirmação pós-assinatura.
// Exibe: barcode, dados do aplicante, posto consular.
//
// Ações disponíveis:
//   Print Confirmation: btnPrintConfirm  → window.print()
//   Print Application:  btnPrintApp      → navega para printapplication.aspx
//   Email Confirmation: btnEmailConfirm  → envia por email
//
// IDs oficiais (ds160map):
//   Barcode:            BARCODE_NUMLabel
//   Nome:               APP_SURNAMELabel, APP_GIVEN_NAMELabel
//   Posto:              TARGET_SITE_CD, TARGET_SITE_LINE1..LINE4
//   Print Confirm btn:  FormView1_btnPrintConfirm
//   Print App btn:      FormView1_btnPrintApp
//   Email btn:          FormView1_btnEmailConfirm
// ============================================================

function buildConfirmationMap(a, ctx) {
    return [
        // 1. Capturar o Application ID / Barcode da página
        {
            type: 'extract',
            pattern: /BARCODE_NUMLabel$/i,
            target: 'applicationId',
            description: 'Extract Application ID (barcode number)'
        },
        // 2. Capturar o código do posto consular
        {
            type: 'extract',
            pattern: /TARGET_SITE_CD$/i,
            target: 'consulateCode',
            description: 'Extract consulate code (PTA, RCF, etc.)'
        },
        // 3. Click "Print Confirmation" → dispara window.print()
        {
            type: 'navigation',
            action: 'print_page',
            pattern: /btnPrintConfirm$/i,
            saveAs: 'confirmation',
            description: 'Print/save confirmation page as PDF'
        },
        // 4. Click "Print Application" → navega para printapplication.aspx
        {
            type: 'navigation',
            action: 'click',
            pattern: /btnPrintApp$/i,
            description: 'Click "Print Application" to navigate to full application'
        }
    ];
}

module.exports = { buildConfirmationMap };
