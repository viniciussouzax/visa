// Quick auth test
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');
fs.readFileSync(envPath, 'utf8').replace(/\r/g, '').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const i = line.indexOf('=');
    if (i === -1) return;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
    process.env[k] = v;
});

const { createClient } = require('@supabase/supabase-js');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const sb = createClient(process.env.SUPABASE_URL, serviceKey || process.env.SUPABASE_KEY);

(async () => {
    console.log('URL:', process.env.SUPABASE_URL);
    console.log('Email:', process.env.WORKER_EMAIL);

    console.log('Auth mode:', serviceKey ? 'service_role' : 'user_password');

    if (!serviceKey) {
        const { data, error } = await sb.auth.signInWithPassword({
            email: process.env.WORKER_EMAIL,
            password: process.env.WORKER_PASSWORD,
        });

        if (error) {
            console.log('AUTH ERROR:', error.message);
        } else {
            console.log('AUTH OK:', data.user.email, data.user.id);
        }
    }

    // Check queue
    const { data: apps, error: appErr } = await sb
        .from('applicants')
        .select('id, full_name, pipeline_status')
        .eq('pipeline_status', 'approved')
        .limit(5);

    if (appErr) console.log('QUERY ERROR:', appErr.message);
    else console.log('Approved applicants:', apps?.length || 0, apps?.map(a => a.full_name));

    process.exit(0);
})();
