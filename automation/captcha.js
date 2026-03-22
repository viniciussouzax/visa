const fs = require('fs');

async function solveCaptcha(imagePath, mode, keys, opts = {}) {
    const imageBase64 = fs.readFileSync(imagePath, 'base64');
    return _solveWithFallback(imageBase64, mode, keys, opts);
}

async function _solveWithFallback(imageBase64, mode, keys, opts = {}) {
    const primaryMode = mode === 'ai_vision' ? 'ai_vision' : 'capmonster';
    const fallbackMode = primaryMode === 'capmonster' ? 'ai_vision' : 'capmonster';
    const fallbackKey = fallbackMode === 'capmonster' ? keys.capmonsterKey : keys.aiVisionKey;

    try {
        const result = primaryMode === 'capmonster'
            ? await solveWithCapMonster(imageBase64, keys.capmonsterKey)
            : await solveWithAIVision(imageBase64, keys.aiVisionKey, opts.promptText);
        return normalizeCaptchaAnswer(result, opts);
    } catch (primaryErr) {
        console.warn(`[Captcha] ${primaryMode} falhou: ${primaryErr.message}`);

        if (!fallbackKey) throw primaryErr;

        console.log(`[Captcha] Tentando fallback: ${fallbackMode}`);
        try {
            const result = fallbackMode === 'capmonster'
                ? await solveWithCapMonster(imageBase64, keys.capmonsterKey)
                : await solveWithAIVision(imageBase64, keys.aiVisionKey, opts.promptText);
            console.log(`[Captcha] Fallback ${fallbackMode} funcionou`);
            return normalizeCaptchaAnswer(result, opts);
        } catch (fallbackErr) {
            console.error(`[Captcha] Fallback ${fallbackMode} tambem falhou: ${fallbackErr.message}`);
            throw new Error(`Captcha: ambos modos falharam. ${primaryMode}: ${primaryErr.message} | ${fallbackMode}: ${fallbackErr.message}`);
        }
    }
}

async function solveWithCapMonster(imageBase64, apiKey) {
    if (!apiKey) throw new Error('CapMonster API key nao configurada');

    const createRes = await fetch('https://api.capmonster.cloud/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientKey: apiKey,
            task: { type: 'ImageToTextTask', body: imageBase64 }
        })
    });
    const createData = await createRes.json();
    if (createData.errorId) throw new Error(`CapMonster: ${createData.errorCode || 'unknown'}`);

    const taskId = createData.taskId;
    for (let i = 0; i < 20; i++) {
        await sleep(2000);
        const res = await fetch('https://api.capmonster.cloud/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: apiKey, taskId })
        });
        const result = await res.json();
        if (result.status === 'ready') return result.solution.text;
        if (result.errorId) throw new Error(`CapMonster poll: ${result.errorCode}`);
    }

    throw new Error('CapMonster timeout');
}

async function solveWithAIVision(imageBase64, apiKey, promptText) {
    if (!apiKey) throw new Error('AI Vision API key nao configurada');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 50,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/png', data: imageBase64 }
                    },
                    {
                        type: 'text',
                        text: promptText || 'Read the CAPTCHA text in this image. Reply with ONLY the characters, nothing else. No spaces, no explanation.'
                    }
                ]
            }]
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`AI Vision error: ${err}`);
    }

    const data = await res.json();
    const answer = data.content?.[0]?.text?.trim();
    if (!answer) throw new Error('AI Vision: empty response');
    return answer;
}

function normalizeCaptchaAnswer(raw, opts = {}) {
    const preserveCase = opts.preserveCase !== false;
    const minLength = Number.isFinite(opts.minLength) ? opts.minLength : 1;
    const maxLength = Number.isFinite(opts.maxLength) ? opts.maxLength : 16;
    const value = String(raw || '')
        .replace(/\s+/g, '')
        .replace(/[^A-Za-z0-9]/g, '');

    const normalized = preserveCase ? value : value.toUpperCase();
    if (!normalized || normalized.length < minLength) {
        throw new Error(`Captcha answer invalida: "${raw}"`);
    }

    return normalized.slice(0, maxLength);
}

async function solveCaptchaBase64(imageBase64, mode, keys, opts = {}) {
    return _solveWithFallback(imageBase64, mode, keys, opts);
}

async function solveTspdCaptcha(imagePath, keys) {
    const preferredMode = keys.aiVisionKey ? 'ai_vision' : 'capmonster';
    return solveCaptcha(imagePath, preferredMode, keys, {
        promptText: 'Read exactly the CAPTCHA text in this image. Preserve uppercase and lowercase letters. Reply with ONLY the captcha characters. No spaces, no punctuation, no explanation.',
        preserveCase: true,
        minLength: 4,
        maxLength: 8,
    });
}

async function solveHCaptcha(websiteUrl, siteKey, capmonsterKey) {
    if (!capmonsterKey) throw new Error('CapMonster API key nao configurada');

    console.log(`[Captcha] Solving hCaptcha (sitekey: ${siteKey.substring(0, 12)}...)`);

    const createRes = await fetch('https://api.capmonster.cloud/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientKey: capmonsterKey,
            task: {
                type: 'HCaptchaTaskProxyless',
                websiteURL: websiteUrl,
                websiteKey: siteKey,
            }
        })
    });
    const createData = await createRes.json();
    if (createData.errorId) throw new Error(`CapMonster hCaptcha: ${createData.errorCode || 'unknown'}`);

    const taskId = createData.taskId;
    console.log(`[Captcha] Task ID: ${taskId} aguardando solucao...`);

    for (let i = 0; i < 40; i++) {
        await sleep(3000);
        const res = await fetch('https://api.capmonster.cloud/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: capmonsterKey, taskId })
        });
        const result = await res.json();
        if (result.status === 'ready') {
            console.log(`[Captcha] hCaptcha resolvido (${(i + 1) * 3}s)`);
            return result.solution.gRecaptchaResponse;
        }
        if (result.errorId) throw new Error(`CapMonster hCaptcha poll: ${result.errorCode}`);
    }

    throw new Error('CapMonster hCaptcha timeout (120s)');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { solveCaptcha, solveCaptchaBase64, solveTspdCaptcha, solveHCaptcha };
