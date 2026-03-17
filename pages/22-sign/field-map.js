// ============================================================
// Sign and Submit — Field map
// ============================================================
// URL: esign/signtheapplication.aspx?node=SignCertify
//
// 2 estados na MESMA URL:
//   Estado 1 (pré-assinatura): Preparer Q + Passport + CAPTCHA + Sign btn
//   Estado 2 (pós-assinatura): Mensagem sucesso + Next: Confirmation
//
// IDs oficiais (ds160map):
//   Preparer radio:    rblPREP_IND         (Y/N, postback)
//   Passport number:   PPTNumTbx           (maxlen=20)
//   CAPTCHA code:      CodeTextBox         (maxlen=10)
//   Sign button:       btnSignApp
//   Next button:       UpdateButton3       (Next: Confirmation)
// ============================================================

function buildSignMap(a, ctx) {
    const passport = a.passport || {};
    const sign = a.sign || {};

    return [
        // 1. Preparer radio — "Did anyone assist?" → N (No)
        {
            pattern: /rblPREP_IND$/i,
            value: sign.preparerAssisted || 'N',
            type: 'radio',
            description: 'Preparer of Application: Did anyone assist you?'
        },
        // 2. Passport Number — e-signature confirmation
        {
            pattern: /PPTNumTbx$/i,
            value: passport.passportNumber || '',
            type: 'text',
            description: 'Passport/Travel Document Number (e-signature)'
        },
        // 3. CAPTCHA — requires OCR or manual entry at runtime
        {
            pattern: /CodeTextBox$/i,
            value: '',
            type: 'captcha',
            maxLen: 10,
            description: 'CAPTCHA code — requires OCR or manual entry'
        },
        // 4. Click "Sign and Submit Application"
        {
            type: 'navigation',
            action: 'click',
            pattern: /btnSignApp$/i,
            description: 'Click "Sign and Submit Application"'
        },
        // 5. After signing — Click "Next: Confirmation"
        {
            type: 'navigation',
            action: 'click',
            pattern: /UpdateButton3$/i,
            waitForState: 'signed',
            description: 'Click "Next: Confirmation" (after successful signing)'
        }
    ];
}

module.exports = { buildSignMap };
