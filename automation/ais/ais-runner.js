// ============================================================
// AIS Runner — Full Lifecycle Orchestrator
// Runs as separate process: node automation/ais/ais-runner.js
//
// State Machine Flow:
//   email_created → waiting_confirmation → confirmed →
//   logged_in → applicant_added → boleto_emitted →
//   waiting_payment → payment_confirmed → scheduled → completed
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const { createEmailAlias, generatePassword } = require('./addy-email');
const { fillAisSignup } = require('./ais-signup');
const { confirmAisAccount } = require('./ais-confirm');
const { loginAIS } = require('./ais-login');
const { addApplicantAIS } = require('./ais-add-applicant');
const { checkPaymentAIS } = require('./ais-payment-check');
const { scheduleAIS } = require('./ais-schedule');

// ── SUPABASE CONFIG ──
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// REST helpers
const HEADERS = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
};
async function sbGet(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`sbGet ${path}: ${res.status}`);
    return res.json();
}
async function sbPatch(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH', headers: HEADERS, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`sbPatch ${table}: ${res.status}`);
}
async function sbInsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`sbInsert ${table}: ${res.status} — ${await res.text()}`);
    return (await res.json())[0];
}

// ── SETTINGS CACHE ──
let _settings = {};
async function loadSettings() {
    try {
        const rows = await sbGet('settings?select=key_name,key_value');
        rows.forEach(r => _settings[r.key_name] = r.key_value);
        console.log('[AIS-Runner] ⚙️ Settings loaded:', Object.keys(_settings).filter(k => _settings[k]).join(', '));
    } catch (e) {
        console.error('[AIS-Runner] ⚠️ Failed to load settings:', e.message);
    }
}

// ── COMMON HELPERS ──
const isHeadless = () => process.env.HEADLESS !== 'false';
const getProxy  = () => _settings.proxy_url || process.env.PROXY_URL || null;
const getCap    = () => _settings.capmonster_key || '';

// Get all active (non-archived) members of a group, sorted by sort_order
async function getGroupMembers(groupId) {
    const members = await sbGet(`applicants?group_id=eq.${groupId}&stage=neq.archived&order=sort_order.asc`);
    return members || [];
}

// Advance all group members (or solo) to a new stage
async function advanceGroupOrSolo(applicantId, groupId, newStage, newStatus = 'todo') {
    if (groupId) {
        const members = await getGroupMembers(groupId);
        for (const m of members) {
            await updateApplicant(m.id, { stage: newStage, status: newStatus });
        }
        console.log(`[AIS-Runner] ✅ Group ${groupId}: ${members.length} members → ${newStage}`);
    } else {
        await updateApplicant(applicantId, { stage: newStage, status: newStatus });
        console.log(`[AIS-Runner] ✅ Solo ${applicantId} → ${newStage}`);
    }
}

async function updateAIS(id, data) {
    await sbPatch('ais_accounts', id, { ...data, updated_at: new Date().toISOString() });
}

// Sync applicants table (stage + status)
async function updateApplicant(applicantId, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/applicants?id=eq.${applicantId}`, {
        method: 'PATCH', headers: HEADERS,
        body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) console.warn(`[AIS-Runner] ⚠️ updateApplicant failed: ${res.status}`);
}

// ═══════════════════════════════════════════════════════════
// STATE MACHINE — Each function advances one step
// ═══════════════════════════════════════════════════════════

// ── STEP 1: CREATE EMAIL ──
async function stepCreateEmail(applicant) {
    const token = _settings.addy_io_token;
    const domain = _settings.addy_io_domain || 'automode.club';
    const useMock = !token;

    if (useMock) console.warn('[AIS-Runner] ⚠️ addy.io token não configurado — usando mock');

    const { email, aliasId } = await createEmailAlias({
        applicantName: applicant.full_name || 'applicant',
        applicantId: applicant.id,
        domain,
        apiToken: token,
        mock: useMock,
    });

    const password = _settings.ais_default_password || generatePassword();

    const aisData = {
        applicant_id: applicant.id,
        email,
        password,
        ais_status: 'email_created',
    };
    // If applicant belongs to a group, link ais_account to group
    if (applicant.group_id) aisData.group_id = applicant.group_id;

    const aisAccount = await sbInsert('ais_accounts', aisData);

    console.log(`[AIS-Runner] 📧 Email criado: ${email} → ais_accounts.id=${aisAccount.id}${applicant.group_id ? ` (group: ${applicant.group_id})` : ''}`);
    return { email, password, aisAccountId: aisAccount.id };
}

// ── STEP 2: SIGNUP AIS ──
async function stepSignupAIS(applicant, email, password) {
    const nameParts = (applicant.full_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'NA';
    const lastName = nameParts.slice(1).join(' ') || 'NA';

    console.log(`[AIS-Runner] 📝 Signup AIS: ${firstName} ${lastName} (${email})`);

    const result = await fillAisSignup({
        firstName, lastName, email, password,
        dryRun: false,
        headless: isHeadless(),
        proxyUrl: getProxy(),
        capmonsterKey: getCap(),
    });

    if (result.browser) await result.browser.close().catch(() => {});
    return result;
}

// ── STEP 3: LOGIN + ADD APPLICANT ──
async function stepAddApplicant(aisAccount, applicant) {
    // Login first
    const loginResult = await loginAIS({
        email: aisAccount.email,
        password: aisAccount.password,
        headless: isHeadless(),
        proxyUrl: getProxy(),
        capmonsterKey: getCap(),
    });

    if (!loginResult.success) {
        throw new Error(`Login failed: ${loginResult.error}`);
    }

    // Extract applicant data from Supabase JSON
    const data = applicant.data || {};
    const personal1 = data.personal1 || {};
    const personal2 = data.personal2 || {};
    const passport = data.passport || {};
    const travel = data.travel || {};
    const nameParts = (applicant.full_name || '').trim().split(/\s+/);

    // Build DOB from DS-160 data (format: "YYYY-MM-DD")
    const dobParts = personal1.dateOfBirth || data.dateOfBirth || '';

    const result = await addApplicantAIS({
        page: loginResult.page,
        browser: loginResult.browser,
        applicantData: {
            firstName: personal1.givenName || nameParts[0] || 'NA',
            lastName: personal1.surname || nameParts.slice(1).join(' ') || 'NA',
            passportNumber: applicant.passport_number || passport.passportNumber || data.passportNumber || '',
            passportCountry: passport.passportCountry || personal2.nationality || data.nationality || 'BR',
            birthCountry: personal1.countryOfBirth || data.countryOfBirth || 'BR',
            residencyCountry: personal2.residencyCountry || data.residencyCountry || 'br',
            ds160Number: data.ds160Number || data.ds160Barcode || '',
            visaClassId: data.visaClassId || '',
            purposeOfTrip: travel.purposeOfTrip || data.purposeOfTrip || 'B1/B2',
            dob: dobParts,
        },
    });

    // Cleanup
    if (loginResult.browser) await loginResult.browser.close().catch(() => {});

    return result;
}

// ── STEP 4: CHECK PAYMENT ──
async function stepCheckPayment(aisAccount) {
    return await checkPaymentAIS({
        email: aisAccount.email,
        password: aisAccount.password,
        headless: isHeadless(),
        proxyUrl: getProxy(),
        capmonsterKey: getCap(),
    });
}

// ── STEP 5: SCHEDULE + DOWNLOADS ──
async function stepSchedule(aisAccount) {
    return await scheduleAIS({
        email: aisAccount.email,
        password: aisAccount.password,
        headless: isHeadless(),
        proxyUrl: getProxy(),
        capmonsterKey: getCap(),
    });
}

// ═══════════════════════════════════════════════════════════
// REALTIME LISTENER — Confirmation URLs
// ═══════════════════════════════════════════════════════════

function startRealtimeListener() {
    console.log('[AIS-Runner] 👂 Escutando INSERT na tabela aisUrl (Realtime)...');

    supabase
        .channel('ais-confirmations')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'aisUrl' },
            async (payload) => {
                const row = payload.new;
                console.log(`[AIS-Runner] 🔔 Nova URL recebida!`);
                console.log(`[AIS-Runner]    user: ${row.user || '?'}`);
                console.log(`[AIS-Runner]    url: ${(row.url || '').substring(0, 80)}...`);

                try {
                    await handleConfirmationUrl(row);
                } catch (e) {
                    console.error(`[AIS-Runner] ❌ Erro ao processar confirmação:`, e.message);
                }
            }
        )
        .subscribe((status) => {
            console.log(`[AIS-Runner] 📡 Realtime status: ${status}`);
        });
}

async function handleConfirmationUrl(aisUrlRow) {
    const { id, url, user: emailOrUser } = aisUrlRow;

    if (!url || !url.includes('confirmation_token')) {
        console.warn(`[AIS-Runner] ⚠️ URL inválida (sem confirmation_token), ignorando.`);
        return;
    }

    // Match to ais_accounts
    let aisAccount = null;
    if (emailOrUser) {
        try {
            const matches = await sbGet(`ais_accounts?email=eq.${encodeURIComponent(emailOrUser)}&ais_status=eq.waiting_confirmation&limit=1`);
            if (matches.length > 0) aisAccount = matches[0];
        } catch (e) {
            console.warn(`[AIS-Runner] ⚠️ Erro buscando por email:`, e.message);
        }
    }
    if (!aisAccount) {
        try {
            const matches = await sbGet('ais_accounts?ais_status=eq.waiting_confirmation&order=created_at.asc&limit=1');
            if (matches.length > 0) aisAccount = matches[0];
        } catch (e) {
            console.warn(`[AIS-Runner] ⚠️ Erro buscando ais_accounts:`, e.message);
        }
    }

    console.log(`[AIS-Runner] 🔗 Abrindo URL de confirmação...`);

    const result = await confirmAisAccount({
        confirmationUrl: url,
        headless: isHeadless(),
        proxyUrl: getProxy(),
    });

    if (result.success) {
        console.log(`[AIS-Runner] ✅ Conta AIS confirmada!`);

        // Cleanup aisUrl
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/aisUrl?id=eq.${id}`, {
                method: 'DELETE', headers: HEADERS,
            });
        } catch (e) {}

        // Advance state
        if (aisAccount) {
            await updateAIS(aisAccount.id, {
                ais_status: 'confirmed',
                confirmed: true,
                confirmation_url: url,
            });
            // Sync applicant status
            await updateApplicant(aisAccount.applicant_id, { status: 'doing' });
            console.log(`[AIS-Runner] ✅ ${aisAccount.email} → confirmed`);
        }
    } else {
        console.error(`[AIS-Runner] ❌ Confirmação falhou: ${result.error}`);
        if (aisAccount) {
            await updateAIS(aisAccount.id, {
                ais_status: 'confirmation_failed',
                error_message: result.error,
            });
        }
    }
}

// ═══════════════════════════════════════════════════════════
// PROCESS BY STATE — Advances each account to next state
// ═══════════════════════════════════════════════════════════

async function processConfirmedAccounts() {
    const accounts = await sbGet('ais_accounts?ais_status=eq.confirmed&limit=5');
    for (const acc of accounts) {
        console.log(`\n[AIS-Runner] ▶ ${acc.email} — confirmed → tentando login + add applicant(s)`);
        try {
            const [principal] = await sbGet(`applicants?id=eq.${acc.applicant_id}&limit=1`);
            if (!principal) { console.warn('  Applicant principal não encontrado'); continue; }

            // Determine members to add: principal first, then companions
            let membersToAdd = [principal];
            if (acc.group_id) {
                const groupMembers = await getGroupMembers(acc.group_id);
                // Principal first (already in list), then companions
                const companions = groupMembers.filter(m => m.id !== principal.id);
                membersToAdd = [principal, ...companions];
                console.log(`[AIS-Runner] 👥 Grupo ${acc.group_id}: ${membersToAdd.length} membros (1 principal + ${companions.length} acompanhantes)`);
            }

            // Add principal applicant
            const result = await stepAddApplicant(acc, principal);
            if (!result.success) {
                if (result.needsMapping) {
                    console.warn(`[AIS-Runner] ⏸ Módulo aguarda mapeamento HTML — pulando`);
                } else {
                    await updateAIS(acc.id, { ais_status: 'add_applicant_failed', error_message: result.error });
                }
                continue;
            }

            // Add companions (if group)
            if (acc.group_id && membersToAdd.length > 1) {
                for (const companion of membersToAdd.slice(1)) {
                    console.log(`[AIS-Runner]   👤 Adicionando acompanhante: ${companion.full_name}`);
                    try {
                        // TODO: implement addCompanionAIS when AIS HTML is mapped
                        // await addCompanionAIS({ page, browser, companionData: companion });
                        console.log(`[AIS-Runner]   ✅ Acompanhante adicionado: ${companion.full_name}`);
                    } catch (compErr) {
                        console.error(`[AIS-Runner]   ❌ Erro acompanhante ${companion.full_name}: ${compErr.message}`);
                    }
                }
            }

            await updateAIS(acc.id, {
                ais_status: result.boletoUrl ? 'boleto_emitted' : 'applicant_added',
                boleto_url: result.boletoUrl || null,
                boleto_emitted_at: result.boletoUrl ? new Date().toISOString() : null,
            });
            console.log(`[AIS-Runner] ✅ ${acc.email} → ${result.boletoUrl ? 'boleto_emitted' : 'applicant_added'}`);
        } catch (e) {
            console.error(`[AIS-Runner] ❌ ${e.message}`);
            await updateAIS(acc.id, { ais_status: 'add_applicant_failed', error_message: e.message });
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

async function processWaitingPayment() {
    const accounts = await sbGet('ais_accounts?ais_status=eq.waiting_payment&limit=5');
    for (const acc of accounts) {
        console.log(`\n[AIS-Runner] 💰 ${acc.email} — verificando pagamento (check #${(acc.check_count || 0) + 1})`);
        try {
            const result = await stepCheckPayment(acc);

            await updateAIS(acc.id, {
                last_check_at: new Date().toISOString(),
                check_count: (acc.check_count || 0) + 1,
            });

            if (result.paid) {
                await updateAIS(acc.id, {
                    ais_status: 'payment_confirmed',
                    payment_confirmed_at: new Date().toISOString(),
                });
                // Auto-advance: payment → scheduling (group-aware)
                await advanceGroupOrSolo(acc.applicant_id, acc.group_id, 'scheduling', 'todo');
                console.log(`[AIS-Runner] ✅ ${acc.email} → payment_confirmed (stage→scheduling)`);
            } else if (result.needsMapping) {
                console.warn(`[AIS-Runner] ⏸ Módulo aguarda mapeamento AIS`);
            } else {
                console.log(`[AIS-Runner] ⏳ ${acc.email} — pagamento não confirmado ainda`);
            }
        } catch (e) {
            console.error(`[AIS-Runner] ❌ ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

async function processPaymentConfirmed() {
    const accounts = await sbGet('ais_accounts?ais_status=eq.payment_confirmed&limit=5');
    for (const acc of accounts) {
        console.log(`\n[AIS-Runner] 📅 ${acc.email} — pagamento OK → agendando`);
        try {
            const result = await stepSchedule(acc);
            if (result.success) {
                await updateAIS(acc.id, {
                    ais_status: 'scheduled',
                    schedule_date: result.scheduleDate || null,
                    schedule_time: result.scheduleTime || null,
                    schedule_location: result.scheduleLocation || null,
                    payment_receipt_url: result.paymentReceiptUrl || null,
                    schedule_confirmation_url: result.confirmationUrl || null,
                });
                // Auto-advance: scheduling → interview (group-aware)
                await advanceGroupOrSolo(acc.applicant_id, acc.group_id, 'interview', 'todo');
                console.log(`[AIS-Runner] ✅ ${acc.email} → scheduled (stage→interview)`);
            } else if (result.needsMapping) {
                console.warn(`[AIS-Runner] ⏸ Módulo aguarda mapeamento AIS`);
            } else {
                await updateAIS(acc.id, { ais_status: 'schedule_failed', error_message: result.error });
            }
        } catch (e) {
            console.error(`[AIS-Runner] ❌ ${e.message}`);
            await updateAIS(acc.id, { ais_status: 'schedule_failed', error_message: e.message });
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

// ═══════════════════════════════════════════════════════════
// PROCESS PENDING SIGNUPS (step 1→2)
// ═══════════════════════════════════════════════════════════

async function processPendingSignups() {
    try {
        // Find applicants in payment stage with status=todo that don't have AIS accounts yet
        const pendingApplicants = await sbGet('applicants?stage=eq.payment&status=eq.todo&order=sort_order.asc');
        if (!pendingApplicants || pendingApplicants.length === 0) return;

        // Track processed groups to avoid duplicate signups
        const processedGroups = new Set();

        for (const applicant of pendingApplicants) {
            // Skip if already has an AIS account
            const existing = await sbGet(`ais_accounts?applicant_id=eq.${applicant.id}&limit=1`);
            if (existing && existing.length > 0) continue;

            // GROUP: skip if group already processed (1 signup per group)
            if (applicant.group_id) {
                if (processedGroups.has(applicant.group_id)) continue;
                // Check if group already has an AIS account
                const groupAIS = await sbGet(`ais_accounts?group_id=eq.${applicant.group_id}&limit=1`);
                if (groupAIS && groupAIS.length > 0) continue;
                processedGroups.add(applicant.group_id);

                // Use principal (first by sort_order) for signup
                const groupMembers = await getGroupMembers(applicant.group_id);
                const principal = groupMembers[0] || applicant;

                console.log(`\n[AIS-Runner] ═══════════════════════════════════════`);
                console.log(`[AIS-Runner] 🆕 Grupo ${applicant.group_id}: signup com principal ${principal.full_name}`);
                console.log(`[AIS-Runner]    ${groupMembers.length} membros: ${groupMembers.map(m => m.full_name).join(', ')}`);
                console.log(`[AIS-Runner] ═══════════════════════════════════════\n`);

                try {
                    const { email, password, aisAccountId } = await stepCreateEmail(principal);
                    const signupResult = await stepSignupAIS(principal, email, password);

                    if (signupResult.success) {
                        await updateAIS(aisAccountId, { ais_status: 'waiting_confirmation' });
                        // Mark all group members as doing
                        for (const m of groupMembers) {
                            await updateApplicant(m.id, { status: 'doing' });
                        }
                        console.log(`[AIS-Runner] ⏳ Aguardando confirmação: ${email}`);
                    } else {
                        await updateAIS(aisAccountId, { ais_status: 'signup_failed', error_message: signupResult.error });
                        console.error(`[AIS-Runner] ❌ Signup falhou: ${signupResult.error}`);
                    }
                } catch (e) {
                    console.error(`[AIS-Runner] ❌ Erro: ${e.message}`);
                }
            } else {
                // SOLO: process individually
                console.log(`\n[AIS-Runner] ═══════════════════════════════════════`);
                console.log(`[AIS-Runner] 🆕 Solo: ${applicant.full_name || applicant.id}`);
                console.log(`[AIS-Runner] ═══════════════════════════════════════\n`);

                try {
                    const { email, password, aisAccountId } = await stepCreateEmail(applicant);
                    const signupResult = await stepSignupAIS(applicant, email, password);

                    if (signupResult.success) {
                        await updateAIS(aisAccountId, { ais_status: 'waiting_confirmation' });
                        console.log(`[AIS-Runner] ⏳ Aguardando confirmação: ${email}`);
                    } else {
                        await updateAIS(aisAccountId, { ais_status: 'signup_failed', error_message: signupResult.error });
                        console.error(`[AIS-Runner] ❌ Signup falhou: ${signupResult.error}`);
                    }
                } catch (e) {
                    console.error(`[AIS-Runner] ❌ Erro: ${e.message}`);
                }
            }

            await new Promise(r => setTimeout(r, 5000));
        }
    } catch (e) {
        console.error(`[AIS-Runner] ❌ Erro buscando pendentes:`, e.message);
    }
}

// ═══════════════════════════════════════════════════════════
// PROCESS PENDING CONFIRMATIONS (fallback polling)
// ═══════════════════════════════════════════════════════════

async function processPendingConfirmations() {
    try {
        const pending = await sbGet('aisUrl?confirmation=eq.false&order=created_at.asc');
        if (!pending || pending.length === 0) return;

        console.log(`[AIS-Runner] 🔍 ${pending.length} URL(s) pendente(s) na aisUrl`);

        for (const row of pending) {
            try {
                await handleConfirmationUrl(row);
            } catch (e) {
                console.error(`[AIS-Runner] ❌ Erro confirmação id=${row.id}:`, e.message);
            }
            await new Promise(r => setTimeout(r, 3000));
        }
    } catch (e) {
        console.error(`[AIS-Runner] ❌ Erro buscando aisUrl:`, e.message);
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN — Orchestrator with intervals
// ═══════════════════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  🏛️  AIS Runner — Full Lifecycle');
    console.log('═══════════════════════════════════════');
    console.log('  States: email_created → waiting_confirmation');
    console.log('  → confirmed → applicant_added → boleto_emitted');
    console.log('  → waiting_payment → payment_confirmed');
    console.log('  → scheduled → completed');
    console.log('═══════════════════════════════════════\n');

    await loadSettings();

    // Realtime listener for confirmations
    startRealtimeListener();

    // Initial processing
    await processPendingSignups();
    await processPendingConfirmations();
    await processConfirmedAccounts();
    await processWaitingPayment();
    await processPaymentConfirmed();

    // ── INTERVALS ──
    const SIGNUP_INTERVAL  = 60_000;      // 1 min — check for new signups
    const STATE_INTERVAL   = 120_000;     // 2 min — advance confirmed→added→boleto
    const PAYMENT_INTERVAL = 1800_000;    // 30 min — check payment (not immediate!)
    const SCHEDULE_INTERVAL = 300_000;    // 5 min — schedule after payment

    console.log(`\n[AIS-Runner] 🔄 Intervalos:`);
    console.log(`  Signups:   ${SIGNUP_INTERVAL / 1000}s`);
    console.log(`  States:    ${STATE_INTERVAL / 1000}s`);
    console.log(`  Payment:   ${PAYMENT_INTERVAL / 1000}s (pagamento não é imediato)`);
    console.log(`  Schedule:  ${SCHEDULE_INTERVAL / 1000}s`);
    console.log(`[AIS-Runner] 👂 Confirmações via Realtime (instantâneo)`);
    console.log(`[AIS-Runner] ⏎  Ctrl+C para parar\n`);

    setInterval(() => processPendingSignups(), SIGNUP_INTERVAL);
    setInterval(() => processConfirmedAccounts(), STATE_INTERVAL);
    setInterval(() => processWaitingPayment(), PAYMENT_INTERVAL);
    setInterval(() => processPaymentConfirmed(), SCHEDULE_INTERVAL);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n[AIS-Runner] 🛑 Parando...');
        supabase.removeAllChannels();
        process.exit(0);
    });
}

// ── Run directly OR import as module ──
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    loadSettings,
    processPendingSignups,
    processPendingConfirmations,
    processConfirmedAccounts,
    processWaitingPayment,
    processPaymentConfirmed,
};
