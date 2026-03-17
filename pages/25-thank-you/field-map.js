// ============================================================
// Thank You — Field map
// ============================================================
// URL: common/thankyou.aspx
//
// Página final do DS-160. Opções de navegação:
//   - Back to Confirmation
//   - Create a Family Application
//   - Start Another Application
//   - Exit Application
//
// IDs oficiais (ds160map):
//   Back button:        UpdateButton1  (Back to Confirmation)
//   Family button:      UpdateButton2  (Create a Family Application)
//   New App button:     UpdateButton3  (Start Another Application)
//   Exit button:        UpdateButton4  (Exit Application)
// ============================================================

function buildThankYouMap(a, ctx) {
    const nextAction = ctx?.nextAction || 'exit'; // 'family', 'new', 'back', 'exit'

    const actions = {
        back: {
            pattern: /UpdateButton1$/i,
            description: 'Back to Confirmation'
        },
        family: {
            pattern: /UpdateButton2$/i,
            description: 'Create a Family Application'
        },
        new: {
            pattern: /UpdateButton3$/i,
            description: 'Start Another Application'
        },
        exit: {
            pattern: /UpdateButton4$/i,
            description: 'Exit Application'
        }
    };

    const selected = actions[nextAction] || actions.exit;

    return [
        {
            type: 'navigation',
            action: 'click',
            pattern: selected.pattern,
            description: selected.description
        }
    ];
}

module.exports = { buildThankYouMap };
