// Stand-alone test: fill DS-160 with any profile JSON (no Supabase required)
// Usage: node test-fill.js [profile-number]
// Examples:
//   node test-fill.js          → test-complex.json (default, married male)
//   node test-fill.js 1        → profile-1-divorced-male.json
//   node test-fill.js 2        → profile-2-widowed-female.json
//   node test-fill.js 4        → profile-4-minor-male.json
//   node test-fill.js 5        → profile-5-minor-female.json
//   node test-fill.js 6        → profile-6-married-female.json
const path = require('path');
const fs = require('fs');
const { fillApplication } = require('./automation/filler');

const PROFILES = {
    '': 'test-complex.json',
    '1': 'test-profiles/profile-1-divorced-male.json',
    '2': 'test-profiles/profile-2-widowed-female.json',
    '3': 'test-complex.json',
    '4': 'test-profiles/profile-4-minor-male.json',
    '5': 'test-profiles/profile-5-minor-female.json',
    '6': 'test-profiles/profile-6-married-female.json',
};

const profileArg = process.argv[2] || '';
const profileFile = PROFILES[profileArg];
if (!profileFile) {
    console.error('Invalid profile number. Use: 1, 2, 3, 4, 5, or 6');
    process.exit(1);
}

const profilePath = path.join(__dirname, '..', 'docs', profileFile);
const testData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
const name = `${testData.personal1?.givenName || ''} ${testData.personal1?.surname || ''}`.trim();

const applicant = {
    full_name: name,
    data: testData
};

const application = {
    id: `test-${profileArg || '3'}`,
    application_id: null,
    security_answer: 'BRAZIL'
};

const config = {
    capmonster_key: '6bf6fe298c54a908f353b96fb3a10c63',
    ai_vision_key: ''
};

async function main() {
    console.log(`🚀 Testing Profile ${profileArg || '3'}: ${name}`);
    console.log(`📋 File: ${profileFile}`);
    console.log(`📊 Marital: ${testData.personal1?.maritalStatus} | Sex: ${testData.personal1?.sex} | Payer: ${testData.travel?.whoIsPaying} | Plans: ${testData.travel?.hasSpecificPlans}`);

    const result = await fillApplication(
        applicant,
        application,
        config,
        'capmonster',
        (page) => console.log(`📄 Filling page: ${page}`)
    );

    if (result.success) {
        console.log('✅ SUCCESS! Application ID:', result.applicationId);
    } else {
        console.error('❌ FAILED:', result.error);
        if (result.page) console.error('   Page:', result.page);
        if (result.field) console.error('   Field:', result.field);
        if (result.cause) console.error('   Cause:', result.cause);
    }

    // Keep browser open for inspection if error
    if (!result.success && result.browser) {
        console.log('🔍 Browser kept open for inspection. Press Ctrl+C to close.');
        await new Promise(() => { });
    }

    if (result.browser) await result.browser.close();
}

main().catch(e => { console.error('💥 Fatal:', e); process.exit(1); });
