import SUPABASE_CONFIG from './config.js';

/**
 * Busca a chave do CapMonster do banco de dados
 */
async function getCapMonsterKey(token) {
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/settings?key_name=eq.capmonster_key&select=key_value`, {
        headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    return data[0]?.key_value || null;
}

/**
 * Envia a imagem para o CapMonster e aguarda a resposta
 */
export async function solveCaptcha(base64Image, token) {
    const apiKey = await getCapMonsterKey(token);
    if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
        throw new Error("Chave do CapMonster não configurada no Supabase.");
    }

    // 1. Criar tarefa no CapMonster
    const createTaskRes = await fetch('https://api.capmonster.cloud/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientKey: apiKey,
            task: {
                type: "ImageToTextTask",
                body: base64Image // deve ser base64 sem o prefixo data:image/png;base64,
            }
        })
    });
    const taskData = await createTaskRes.json();
    if (taskData.errorId !== 0) throw new Error("Erro CapMonster (Create): " + taskData.errorCode);

    const taskId = taskData.taskId;

    // 2. Aguardar resultado (polling)
    let tries = 0;
    while (tries < 10) {
        await new Promise(r => setTimeout(r, 2000)); // Espera 2s
        const resultRes = await fetch('https://api.capmonster.cloud/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: apiKey,
                taskId: taskId
            })
        });
        const resultData = await resultRes.json();

        if (resultData.status === 'ready') {
            return resultData.solution.text;
        }
        tries++;
    }

    throw new Error("Tempo limite excedido para resolver captcha.");
}
