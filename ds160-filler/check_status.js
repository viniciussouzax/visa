const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("=== APPLICATIONS STATUS ===");
    const { data: apps } = await supabase.from('applications').select('id, status, fill_error, application_id, retry_count, current_page, applicant_id').in('status', ['filling', 'filled', 'pending', 'failed_hard', 'failed_soft', 'needs_attention', 'error']);
    console.log(JSON.stringify(apps, null, 2));

    console.log("\n=== APPLICANTS PIPELINE ===");
    const { data: applicants } = await supabase.from('applicants').select('id, full_name, pipeline_status');
    console.log(JSON.stringify(applicants, null, 2));

    console.log("\n=== AUTOMATION LOGS (LAST 3) ===");
    const { data: logs } = await supabase.from('automation_logs').select('step, level, message').order('created_at', { ascending: false }).limit(3);
    console.log(JSON.stringify(logs, null, 2));
}
check();
