const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkIds() {
    await supabase.auth.signInWithPassword({ email: 'bra920618@gmail.com', password: '123456' });
    const { data: member } = await supabase.from('members').select('company_id, user_id, role').limit(1).single();

    console.log('Logged-in User:', member);

    // Get all applicants for the company to see their user_id
    const { data: apps } = await supabase.from('applicants').select('id, full_name, user_id, company_id').eq('company_id', member.company_id);

    let sameUser = 0; let diffUser = 0; let nullUser = 0;
    if (apps) {
        for (let a of apps) {
            if (!a.user_id) nullUser++;
            else if (a.user_id === member.user_id) sameUser++;
            else diffUser++;
        }
    }
    console.log(`Company Applicants: ${apps ? apps.length : 0} | Same User: ${sameUser} | Diff User: ${diffUser} | Null User (Only Company): ${nullUser}`);

    const { data: totalApps } = await supabase.from('applicants').select('id');
    console.log(`Total System Applicants (Ignore Company Filter): ${totalApps ? totalApps.length : 0}`);
}
checkIds();
