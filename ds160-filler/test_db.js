const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data: apps, error } = await supabase.from('applications').select('id, application_id, fill_status, applicant_id').order('created_at', { ascending: false }).limit(5);
    console.log("Recent Applications:", apps, "Error:", error);
}
check();
