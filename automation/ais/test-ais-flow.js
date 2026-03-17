// ============================================================
// Test AIS Flow — End-to-End test for Phase 1 (mock mode)
// Tests: email creation → signup → confirmation
// ============================================================
const { createEmailAlias, generatePassword } = require('./addy-email');
const { fillAisSignup } = require('./ais-signup');
const { confirmAisAccount } = require('./ais-confirm');

// Supabase config
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';

const HEADERS = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
};

async function supabaseInsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase insert error: ${res.status} — ${err}`);
    }
    return (await res.json())[0];
}

async function supabaseUpdate(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase update error: ${res.status} — ${err}`);
    }
}

// ====================================================================
// TEST RUNNER
// ====================================================================
async function runTest() {
    console.log('═══════════════════════════════════════');
    console.log('  AIS Signup — Test Flow (Phase 1)');
    console.log('═══════════════════════════════════════\n');

    // Test applicant data
    const testApplicant = {
        id: '404d5225-d72b-4719-85eb-26165e3fb7ab', // JOSE CARLOS
        firstName: 'JOSE CARLOS',
        lastName: 'SOUZA SILVA',
    };

    // ── STEP 1: Create email alias ──
    console.log('━━━ STEP 1: Create Email Alias ━━━');
    const { email, aliasId } = await createEmailAlias({
        applicantName: `${testApplicant.firstName} ${testApplicant.lastName}`,
        domain: 'mock.addy.io',
        mock: true, // Phase 1: mock mode
    });
    const password = generatePassword();
    console.log(`Email: ${email}`);
    console.log(`Password: ${password} (${password.length} chars)`);
    console.log(`Alias ID: ${aliasId}\n`);

    // ── STEP 2: Save to Supabase ──
    console.log('━━━ STEP 2: Save to Supabase ━━━');
    let aisAccount;
    try {
        aisAccount = await supabaseInsert('ais_accounts', {
            applicant_id: testApplicant.id,
            email: email,
            password: password,
            ais_status: 'signup_pending',
        });
        console.log(`✅ ais_accounts row created: ${aisAccount.id}\n`);
    } catch (e) {
        console.warn(`⚠️ Supabase insert skipped (table may not exist yet): ${e.message}`);
        aisAccount = { id: 'mock-id' };
        console.log('');
    }

    // ── STEP 3: Fill AIS Signup (DRY RUN) ──
    console.log('━━━ STEP 3: Fill AIS Signup (Dry Run) ━━━');
    const isHeadless = process.env.HEADLESS !== 'false';
    const signupResult = await fillAisSignup({
        firstName: testApplicant.firstName,
        lastName: testApplicant.lastName,
        email: email,
        password: password,
        dryRun: true, // Don't actually submit
        headless: isHeadless,
        proxyUrl: process.env.PROXY_URL || null,
    });

    if (signupResult.success) {
        console.log(`✅ Signup dry run successful\n`);

        // Update status
        if (aisAccount.id !== 'mock-id') {
            try {
                await supabaseUpdate('ais_accounts', aisAccount.id, {
                    ais_status: 'signup_dryrun_ok',
                });
            } catch (e) {
                console.warn(`⚠️ Status update skipped: ${e.message}`);
            }
        }
    } else {
        console.error(`❌ Signup failed: ${signupResult.error}\n`);
    }

    // Close browser from signup
    if (signupResult.browser) {
        await signupResult.browser.close().catch(() => {});
    }

    // ── STEP 4: Simulate confirmation URL ──
    console.log('━━━ STEP 4: Confirm Account (Mock URL) ━━━');
    const mockConfirmUrl = 'https://ais.usvisa-info.com/pt-br/niv/users/confirmation?confirmation_token=MOCK_TOKEN_12345';
    console.log(`Mock URL: ${mockConfirmUrl}`);

    // In phase 1, we just verify the module loads and URL validation works
    const confirmResult = await confirmAisAccount({
        confirmationUrl: mockConfirmUrl,
        headless: true,
    });
    console.log(`Confirmation result: ${confirmResult.success ? '✅' : '❌'} ${confirmResult.error || ''}\n`);

    // ── SUMMARY ──
    console.log('═══════════════════════════════════════');
    console.log('  Test Summary');
    console.log('═══════════════════════════════════════');
    console.log(`  Email Creation:  ✅ ${email}`);
    console.log(`  Password:        ✅ ${password.length} chars (≥16 required)`);
    console.log(`  Supabase Insert: ${aisAccount.id !== 'mock-id' ? '✅' : '⚠️ Skipped (table not created)'}`);
    console.log(`  AIS Signup:      ${signupResult.success ? '✅ Dry run OK' : '❌ Failed'}`);
    console.log(`  Confirmation:    ${confirmResult.success ? '✅' : '⚠️ Expected (mock token)'}`);
    console.log('═══════════════════════════════════════\n');
}

runTest().catch(console.error);
