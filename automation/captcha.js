// Captcha solver module — dual mode: CapMonster API or AI Vision
const fs = require('fs');

/**
 * Solve a captcha image using the configured mode.
 * @param {string} imagePath - Absolute path to captcha PNG
 * @param {'capmonster'|'ai_vision'} mode - Solver to use
 * @param {object} keys - { capmonsterKey, aiVisionKey }
 * @returns {Promise<string>} The captcha text
 */
async function solveCaptcha(imagePath, mode, keys) {
    const imageBase64 = fs.readFileSync(imagePath, 'base64');

    if (mode === 'capmonster') {
        return solveWithCapMonster(imageBase64, keys.capmonsterKey);
    } else {
        return solveWithAIVision(imageBase64, keys.aiVisionKey);
    }
}

// ============================================================
// CAPMONSTER
// ============================================================
async function solveWithCapMonster(imageBase64, apiKey) {
    if (!apiKey) throw new Error('CapMonster API key não configurada');

    const createRes = await fetch('https://api.capmonster.cloud/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientKey: apiKey,
            task: { type: 'ImageToTextTask', body: imageBase64 }
        })
    });
    const createData = await createRes.json();
    if (createData.errorId) throw new Error('CapMonster: ' + (createData.errorCode || 'unknown'));

    const taskId = createData.taskId;

    // Poll for result (max 40s)
    for (let i = 0; i < 20; i++) {
        await sleep(2000);
        const res = await fetch('https://api.capmonster.cloud/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: apiKey, taskId })
        });
        const result = await res.json();
        if (result.status === 'ready') return result.solution.text;
        if (result.errorId) throw new Error('CapMonster poll: ' + result.errorCode);
    }
    throw new Error('CapMonster timeout');
}

// ============================================================
// AI VISION (Claude API)
// ============================================================
async function solveWithAIVision(imageBase64, apiKey) {
    if (!apiKey) throw new Error('AI Vision API key não configurada');

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
                        text: 'Read the CAPTCHA text in this image. Reply with ONLY the characters, nothing else. No spaces, no explanation.'
                    }
                ]
            }]
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error('AI Vision error: ' + err);
    }

    const data = await res.json();
    const answer = data.content?.[0]?.text?.trim();
    if (!answer) throw new Error('AI Vision: empty response');
    return answer;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Solve captcha directly from base64 string (no file needed).
 */
async function solveCaptchaBase64(imageBase64, mode, keys) {
    if (mode === 'capmonster') {
        return solveWithCapMonster(imageBase64, keys.capmonsterKey);
    } else {
        return solveWithAIVision(imageBase64, keys.aiVisionKey);
    }
}

/**
 * Solve hCaptcha via CapMonster HCaptchaTaskProxyless.
 * Returns the token to inject into h-captcha-response.
 * @param {string} websiteUrl - Page URL where hCaptcha is rendered
 * @param {string} siteKey - hCaptcha site key (from data-sitekey attribute)
 * @param {string} capmonsterKey - CapMonster API key
 * @returns {Promise<string>} hCaptcha response token
 */
async function solveHCaptcha(websiteUrl, siteKey, capmonsterKey) {
    if (!capmonsterKey) throw new Error('CapMonster API key não configurada');

    console.log(`[Captcha] 🔐 Solving hCaptcha (sitekey: ${siteKey.substring(0, 12)}...)`);

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
    if (createData.errorId) throw new Error('CapMonster hCaptcha: ' + (createData.errorCode || 'unknown'));

    const taskId = createData.taskId;
    console.log(`[Captcha] ⏳ Task ID: ${taskId} — aguardando solução...`);

    // Poll for result (max 120s — hCaptcha pode demorar mais)
    for (let i = 0; i < 40; i++) {
        await sleep(3000);
        const res = await fetch('https://api.capmonster.cloud/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: capmonsterKey, taskId })
        });
        const result = await res.json();
        if (result.status === 'ready') {
            console.log(`[Captcha] ✅ hCaptcha resolvido! (${(i + 1) * 3}s)`);
            return result.solution.gRecaptchaResponse;
        }
        if (result.errorId) throw new Error('CapMonster hCaptcha poll: ' + result.errorCode);
    }
    throw new Error('CapMonster hCaptcha timeout (120s)');
}

module.exports = { solveCaptcha, solveCaptchaBase64, solveHCaptcha };
