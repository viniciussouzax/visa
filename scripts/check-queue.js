const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '.env');
fs.readFileSync(envPath, 'utf8').replace(/\r/g, '').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const i = line.indexOf('=');
    if (i === -1) return;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
    }
    process.env[k] = v;
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
    const { data: queue, error: qErr } = await sb
        .from('applicants')
        .select('id,full_name,stage,status,priority')
        .eq('stage', 'ds160')
        .eq('status', 'todo');
    
    console.log('=== DS-160 Queue (stage=ds160, status=todo) ===');
    if (qErr) console.error('Error:', qErr);
    else if (queue && queue.length > 0) queue.forEach(a => console.log(`  ${a.full_name} [${a.priority}] id:${a.id}`));
    else console.log('  (vazia)');
    
    const { data: all } = await sb
        .from('applicants')
        .select('id,full_name,stage,status')
        .limit(10);
    
    console.log('\n=== All Applicants (first 10) ===');
    if (all) all.forEach(a => console.log(`  ${a.full_name} | stage:${a.stage} | status:${a.status} | id:${a.id}`));
}

main().catch(e => console.error(e));
