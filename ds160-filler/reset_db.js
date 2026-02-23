const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function wipeDatabase() {
    console.log('--- INICIANDO LIMPEZA AMBIENTAL ---');
    await supabase.auth.signInWithPassword({ email: 'bra920618@gmail.com', password: '123456' });
    const { data: member } = await supabase.from('members').select('company_id').limit(1).single();

    if (!member) {
        return console.error('Erro: Não foi possível obter Company ID da conta autorizada.');
    }

    const companyId = member.company_id;
    console.log(`Company ID Autorizada: ${companyId}`);

    // Passo 1: Limpar as Aplicações (Filhos) atreladas indiretamente via Applicants
    // O Supabase impede deletar Applications direto pelo company_id se nao houver foreign key explícita, 
    // então pegamos os IDs dos applicants primeiro.
    const { data: applicantsToWipe } = await supabase.from('applicants').select('id').eq('company_id', companyId);

    if (applicantsToWipe && applicantsToWipe.length > 0) {
        const applicantIds = applicantsToWipe.map(a => a.id);

        // Coletar as Applications atreladas para poder deletar os logs primeiro
        const { data: appsToWipe } = await supabase.from('applications').select('id').in('applicant_id', applicantIds);
        if (appsToWipe && appsToWipe.length > 0) {
            const appIds = appsToWipe.map(a => a.id);
            console.log(`Deletando Logs atrelados as ${appIds.length} Applications...`);

            // Chunk ids in case of too many parameters
            for (let id of appIds) {
                await supabase.from('error_logs').delete().eq('application_id', id);
                await supabase.from('automation_logs').delete().eq('application_id', id);
            }
        }

        console.log(`Deletando Applications dos ${applicantIds.length} Applicants vinculados...`);
        const { error: err1 } = await supabase.from('applications').delete().in('applicant_id', applicantIds);
        if (err1) console.error('Erro ao deletar Applications:', err1);
        else console.log('✅ Applications arquivadas com sucesso.');

        // Passo 2: Limpar os Applicants (Pais) atrelados à Companhia
        console.log(`Deletando Tabela Ancestral (Applicants)...`);
        const { error: err2 } = await supabase.from('applicants').delete().in('id', applicantIds);
        if (err2) console.error('Erro ao deletar Applicants:', err2);
        else console.log('✅ Applicants varridos com sucesso!');
    } else {
        console.log('Nenhum dado encontrado para limpar na companhia atual.');
    }

    console.log('--- BASE 100% LIMPA ---');
}
wipeDatabase();
