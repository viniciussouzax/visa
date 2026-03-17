// ============================================================
// Student Additional Contact — Field map (F/J/M visas)
// ============================================================
// DS-160 uses indexed DataList pattern:
//   dtlStudentAddPOC_ctl{NN}_{fieldId}
// Where NN = 00, 01, 02... for each contact entry.
//
// Page: complete_ExchangeVisitorAddContact.aspx?node=ExchangeVisitor2
// Navigation: Back: Security → Next: SEVIS
//
// IMPORTANT: Uses `pattern` (RegExp) format compatible with
// generic-page.js buildFieldIndex() — NOT CSS selectors.
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context
 * @returns {Array} Field map entries for additional contacts
 */
function buildStudentAddContactMap(a, ctx) {
    const contacts = a.studentAddContact?.contacts || [];
    const map = [];

    contacts.forEach((contact, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const listName = 'dtlStudentAddPOC';

        // Core fields — always present
        map.push(
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_SURNAME$`), value: contact.surname || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_GIVEN_NAME$`), value: contact.givenName || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_LN1$`), value: contact.address1 || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_LN2$`), value: contact.address2 || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_CITY$`), value: contact.city || '', type: 'text' },
        );

        // State — text with N/A checkbox (postback)
        if (contact.state) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_STATE$`), value: contact.state, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_ADDR_STATE_NA$`), value: true, type: 'checkbox-check' });
        }

        // Postal Code — text with N/A checkbox (postback)
        if (contact.postalCode) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_POSTAL_CD$`), value: contact.postalCode, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_ADDR_POSTAL_CD_NA$`), value: true, type: 'checkbox-check' });
        }

        // Country — select
        map.push(
            { pattern: new RegExp(`${listName}_${ctl}_ddlADD_POC_ADDR_CTRY$`), value: contact.country || 'BRZL', type: 'select' },
        );

        // Phone — text with N/A checkbox (postback)
        if (contact.phone) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_TEL$`), value: contact.phone, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_TEL_NA$`), value: true, type: 'checkbox-check' });
        }

        // Email — text with N/A checkbox (postback)
        if (contact.email) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_EMAIL_ADDR$`), value: contact.email, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_EMAIL_ADDR_NA$`), value: true, type: 'checkbox-check' });
        }

        // Add Another — for idx >= 1, signal that a new entry must be created
        // Uses addAnother convention from generic-page.js Phase 2.5
        if (idx >= 1) {
            // Mark every field of this entry as needing "Add Another" first
            map.forEach((entry, i) => {
                if (i >= map.length - 10 * 1 && entry.pattern?.source?.includes(ctl)) {
                    entry.addAnother = { list: listName, idx };
                }
            });
        }
    });

    return map;
}

module.exports = { buildStudentAddContactMap };
