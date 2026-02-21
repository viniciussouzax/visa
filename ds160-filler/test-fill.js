// Stand-alone test: fill DS-160 with complex JSON (no Supabase required)
const path = require('path');
const fs = require('fs');
const { fillApplication } = require('./automation/filler');

const testData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'test-complex.json'), 'utf-8'));

const applicant = {
    full_name: 'MARIA FERNANDA SILVA',
    data: testData
};

const application = {
    id: 'test-001',
    application_id: null, // new application
    security_answer: 'BRAZIL'
};

const config = {
    capmonster_key: '6bf6fe298c54a908f353b96fb3a10c63',
    ai_vision_key: ''
};

async function main() {
    console.log('🚀 Starting DS-160 fill test with complex JSON...');
    console.log('📋 Applicant:', applicant.full_name);
    console.log('📊 Sections in JSON:', Object.keys(testData).join(', '));

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
        await new Promise(() => { }); // wait forever
    }

    if (result.browser) await result.browser.close();
}

main().catch(e => { console.error('💥 Fatal:', e); process.exit(1); });
