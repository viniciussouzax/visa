const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data: applicants, error: e1 } = await supabase.from('applicants').select('id, full_name, pipeline_status');
    const { data: applications, error: e2 } = await supabase.from('applications').select('id, applicant_id, fill_status');

    console.log(`\n=== KANBAN LEADS (applicants) === Total: ${applicants?.length || 0}`);
    if (applicants) applicants.forEach(a => console.log(`  - ${a.id} | ${a.full_name} | status_kanban: ${a.pipeline_status}`));

    console.log(`\n=== AUTOMATION RUNS (applications) === Total: ${applications?.length || 0}`);
    if (applications) applications.forEach(a => console.log(`  - AppId: ${a.id} | FK_Applicant: ${a.applicant_id} | status_robo: ${a.fill_status}`));
}
check();
