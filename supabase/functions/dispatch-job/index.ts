// ============================================================
// dispatch-job — Supabase Edge Function
// Trigger: Database Webhook on applicants table
// Dispatches Cloud Run Jobs when applicants need processing
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GCP_PROJECT = Deno.env.get('GCP_PROJECT_ID');
const GCP_REGION = Deno.env.get('GCP_REGION') || 'us-central1';
const GCP_SA_KEY = Deno.env.get('GCP_SA_KEY_JSON'); // Service account key JSON

// Get GCP access token from service account
async function getGCPToken(): Promise<string> {
    if (!GCP_SA_KEY) throw new Error('GCP_SA_KEY_JSON not set');
    
    const key = JSON.parse(GCP_SA_KEY);
    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = btoa(JSON.stringify({
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }));
    
    // Sign JWT (using Web Crypto API)
    const pemKey = key.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
    );
    
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(`${header}.${claim}`)
    );
    
    const jwt = `${header}.${claim}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
    
    // Exchange JWT for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    
    const tokenData = await tokenRes.json();
    return tokenData.access_token;
}

// Dispatch a Cloud Run Job
async function dispatchJob(jobName: string): Promise<boolean> {
    const token = await getGCPToken();
    const url = `https://run.googleapis.com/v2/projects/${GCP_PROJECT}/locations/${GCP_REGION}/jobs/${jobName}:run`;
    
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    
    if (!res.ok) {
        const error = await res.text();
        console.error(`Failed to dispatch ${jobName}: ${res.status} ${error}`);
        return false;
    }
    
    console.log(`✅ Dispatched ${jobName}`);
    return true;
}

// ── MAIN HANDLER ──
Deno.serve(async (req: Request) => {
    try {
        const payload = await req.json();
        const record = payload.record || payload.new;
        
        if (!record) {
            return new Response(JSON.stringify({ error: 'No record in payload' }), { status: 400 });
        }
        
        const { stage, status } = record;
        
        // Determine which job to dispatch
        let jobName: string | null = null;
        
        if (stage === 'ds160' && (status === 'todo' || status === 'retry')) {
            jobName = 'ds160-worker';
        } else if (stage === 'payment' && status === 'todo') {
            jobName = 'ais-worker';
        } else if (stage === 'scheduling' && status === 'todo') {
            jobName = 'ais-worker';
        }
        
        if (!jobName) {
            return new Response(JSON.stringify({ skipped: true, reason: `${stage}/${status} not dispatchable` }));
        }
        
        const success = await dispatchJob(jobName);
        
        return new Response(JSON.stringify({ dispatched: success, job: jobName }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('Error:', e.message);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
