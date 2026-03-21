#!/usr/bin/env node
// ============================================================
// test-local-proxy.js — Testa proxy + comportamento humano
// Simula o worker localmente: abre CEAC via proxy, verifica IP,
// testa captcha landing e mede tempos de input humano.
// ============================================================
const fs = require('fs');
const path = require('path');
// Load .env manually (no dotenv dependency)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const match = line.match(/^([^#\s][^=]*)=(.+)$/);
        if (match && !process.env[match[1].trim()]) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}
const { createClient } = require('@supabase/supabase-js');
const { buildProxyOpts, resolveProxyUrl, resolveProxyCountries } = require('./helpers/proxy-helper');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL + SUPABASE_KEY obrigatorios');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    console.log('=== TESTE LOCAL: Proxy + Comportamento Humano ===\n');

    // ── 1. LER PROXY DO BANCO ──
    console.log('1) Lendo proxy do banco de dados...');
    const { data: proxySettings } = await supabase
        .from('settings')
        .select('key_name, key_value')
        .in('key_name', ['proxy_url', 'proxy_countries']);

    const urlRow = proxySettings?.find(r => r.key_name === 'proxy_url');
    const countriesRow = proxySettings?.find(r => r.key_name === 'proxy_countries');

    const proxyUrl = resolveProxyUrl({ settingsRow: urlRow });
    const proxyCountries = resolveProxyCountries({ settingsRow: countriesRow });

    console.log(`   proxy_url: ${proxyUrl ? proxyUrl.replace(/\/\/.*@/, '//***@') : 'NAO ENCONTRADO'}`);
    console.log(`   proxy_countries: ${proxyCountries}`);

    if (!proxyUrl) {
        console.error('   ERRO: Sem proxy_url no banco!');
        process.exit(1);
    }

    // ── 2. CONSTRUIR PROXY OPTS ──
    console.log('\n2) Construindo proxy opts (DataImpulse format)...');
    const proxyOpts = buildProxyOpts(proxyUrl, {
        countries: proxyCountries,
        sessionId: `test_${Date.now()}`
    });

    console.log(`   server: ${proxyOpts.server}`);
    console.log(`   username: ${proxyOpts.username}`);
    console.log(`   password: ${proxyOpts.password ? '***' : 'VAZIO'}`);

    // Validar formato DataImpulse
    const hasCountry = proxyOpts.username?.includes('__cr.');
    const hasSession = proxyOpts.username?.includes('__s.');
    console.log(`   __cr. presente: ${hasCountry ? 'SIM' : 'NAO - ERRO!'}`);
    console.log(`   __s. presente: ${hasSession ? 'SIM' : 'NAO - ERRO!'}`);

    if (!hasCountry || !hasSession) {
        console.error('   ERRO: Formato proxy invalido!');
        process.exit(1);
    }

    // ── 3. ABRIR BROWSER COM PROXY ──
    console.log('\n3) Abrindo browser com proxy...');
    
    // Usar patchright (mesmo que no projeto)
    let chromium;
    try {
        const pw = require('patchright');
        chromium = pw.chromium;
        console.log('   Usando: patchright');
    } catch {
        const pw = require('playwright');
        chromium = pw.chromium;
        console.log('   Usando: playwright (fallback)');
    }

    const headless = process.env.HEADLESS === 'true';
    console.log(`   Headless: ${headless}`);

    const browser = await chromium.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
        ],
        proxy: proxyOpts,
    });

    const context = await browser.newContext({
        locale: 'en-US',
        timezoneId: 'America/New_York',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();

    // ── 4. VERIFICAR IP VIA PROXY ──
    console.log('\n4) Verificando IP via proxy (api.ipify.org)...');
    try {
        await page.goto('https://api.ipify.org/?format=json', { timeout: 15000 });
        const ipText = await page.textContent('body');
        console.log(`   IP: ${ipText}`);
    } catch (e) {
        console.error(`   ERRO ao verificar IP: ${e.message}`);
    }

    // ── 5. ACESSAR CEAC ──
    console.log('\n5) Acessando CEAC (ceac.state.gov)...');
    try {
        const start = Date.now();
        await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        const elapsed = Date.now() - start;
        console.log(`   Carregou em ${elapsed}ms`);
        console.log(`   URL: ${page.url()}`);
        console.log(`   Title: ${await page.title()}`);

        // Screenshot
        const ssPath = '/tmp/ceac-proxy-test.jpg';
        await page.screenshot({ path: ssPath, fullPage: false, type: 'jpeg', quality: 80 });
        console.log(`   Screenshot: ${ssPath}`);
    } catch (e) {
        console.error(`   ERRO ao acessar CEAC: ${e.message}`);
        const ssPath = '/tmp/ceac-proxy-error.jpg';
        try {
            await page.screenshot({ path: ssPath, fullPage: false, type: 'jpeg', quality: 80 });
            console.log(`   Screenshot de erro: ${ssPath}`);
        } catch {}
    }

    // ── 6. TESTAR COMPORTAMENTO HUMANO ──
    console.log('\n6) Testando comportamento humano...');
    
    // Importar helpers de input humano
    let humanType, sleep;
    try {
        const helpers = require('./helpers/input-helpers');
        humanType = helpers.humanType;
        sleep = helpers.sleep;
        console.log('   input-helpers carregado');
    } catch (e) {
        console.log(`   input-helpers nao encontrado: ${e.message}`);
        // Fallback
        sleep = ms => new Promise(r => setTimeout(r, ms));
        humanType = async (pg, locator, text) => {
            for (const char of text) {
                await locator.type(char, { delay: 50 + Math.random() * 100 });
            }
        };
        console.log('   Usando fallback para humanType');
    }

    // Testar digitacao humana em algum campo da pagina
    try {
        // Procurar campo de selecao de idioma  
        const langSelect = page.locator('select').first();
        if (await langSelect.count() > 0) {
            console.log('   Select encontrado, testando...');
            await langSelect.selectOption('en-US');
            console.log('   Idioma selecionado: en-US');
        }

        // Verificar se tem campo de texto na pagina
        const textInputs = page.locator('input[type="text"]');
        const count = await textInputs.count();
        console.log(`   Campos de texto encontrados: ${count}`);
        
        if (count > 0) {
            const input = textInputs.first();
            const startType = Date.now();
            await humanType(page, input, 'TEST123');
            const typeTime = Date.now() - startType;
            console.log(`   Digitacao 'TEST123' levou ${typeTime}ms (humano = 400-1200ms)`);
            
            if (typeTime < 100) {
                console.warn('   AVISO: Digitacao muito rapida! Pode parecer bot.');
            } else if (typeTime > 200) {
                console.log('   Velocidade de digitacao OK (human-like)');
            }
        }
    } catch (e) {
        console.log(`   Teste de input: ${e.message}`);
    }

    // ── 7. TESTE DE DETECCAO DE BOT ──
    console.log('\n7) Teste de deteccao de bot (navigator.webdriver)...');
    try {
        const webdriverFlag = await page.evaluate(() => navigator.webdriver);
        console.log(`   navigator.webdriver: ${webdriverFlag} (deve ser false/undefined)`);
        
        const userAgent = await page.evaluate(() => navigator.userAgent);
        console.log(`   User-Agent: ${userAgent}`);
        
        const hasChrome = await page.evaluate(() => !!window.chrome);
        console.log(`   window.chrome: ${hasChrome ? 'presente' : 'AUSENTE - suspeito!'}`);
    } catch (e) {
        console.log(`   Erro no teste: ${e.message}`);
    }

    // ── CLEANUP ──
    console.log('\n=== RESULTADO ===');
    console.log('Proxy: ' + (proxyOpts ? 'OK' : 'FALHOU'));
    
    await browser.close();
    console.log('Browser fechado. Teste concluido.\n');
}

main().catch(err => {
    console.error('CRASH:', err);
    process.exit(1);
});

