// ============================================================
// Student Additional Contact — Normalize raw form data
// ============================================================

/**
 * @param {Object} data - Raw applicant data
 * @param {Object} helpers - Shared helpers { g, na }
 * @returns {Object} Normalized additional contact fields
 */
function normalizeStudentAddContact(data, helpers) {
    const { g } = helpers;
    const section = data.studentAddContact || {};
    const rawContacts = section.contacts || [];

    const contacts = rawContacts.map(c => ({
        surname: (c.surname || '').toUpperCase(),
        givenName: (c.givenName || c.given_name || '').toUpperCase(),
        address1: (c.address1 || '').toUpperCase(),
        address2: (c.address2 || '').toUpperCase(),
        city: (c.city || '').toUpperCase(),
        state: c.state || '',
        postalCode: c.postalCode || c.postal_code || '',
        country: c.country || 'BRZL',
        phone: c.phone || '',
        email: c.email || '',
    }));

    return {
        studentAddContact: { contacts },
    };
}

module.exports = { normalizeStudentAddContact };
