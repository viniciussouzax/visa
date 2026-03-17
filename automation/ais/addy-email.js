// ============================================================
// addy.io Email Alias Manager — Creates unique aliases per applicant
// Phase 1: Mock mode (returns test email)
// Phase 2: Real API integration with app.addy.io
// ============================================================

const ADDY_API_BASE = 'https://app.addy.io/api/v1';

/**
 * Create a unique email alias for an applicant via addy.io
 * 
 * @param {object} options
 * @param {string} options.applicantName - Full name (used to generate alias)
 * @param {string} options.domain - addy.io domain to use
 * @param {string} [options.apiToken] - addy.io API token (required in phase 2)
 * @param {boolean} [options.mock=true] - Use mock mode (phase 1)
 * @returns {Promise<{ email: string, aliasId?: string }>}
 */
async function createEmailAlias({ applicantName, applicantId, domain, apiToken, mock = true }) {
    if (mock) {
        // ── MOCK MODE ──
        const rand = Math.random().toString(36).substring(2, 10);
        const mockEmail = `${rand}@${domain || 'mock.addy.io'}`;
        console.log(`[Addy] 📧 Mock alias: ${mockEmail}`);
        return { email: mockEmail, aliasId: `mock-${rand}` };
    }

    // ── REAL addy.io API ──
    if (!apiToken) throw new Error('[Addy] API token required');

    const response = await fetch(`${ADDY_API_BASE}/aliases`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            domain: domain,
            format: 'random_characters',
            description: applicantId || applicantName,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`[Addy] API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const email = data.data?.email;
    const aliasId = data.data?.id || null;

    if (!email) throw new Error('[Addy] API returned no email');

    console.log(`[Addy] 📧 Alias: ${email} (id: ${aliasId})`);
    return { email, aliasId };
}

/**
 * Generate a secure random password (≥16 chars as required by AIS)
 * @returns {string}
 */
function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    // Ensure at least one of each type
    password += 'Aa1!'; // guaranteed mix
    for (let i = 0; i < 14; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

module.exports = { createEmailAlias, generatePassword };
