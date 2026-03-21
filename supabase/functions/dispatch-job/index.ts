// ============================================================
// dispatch-job - Supabase Edge Function
// Trigger: Database Webhook on applicants table
// Starts Fly.io Machines when applicants need processing
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FLY_API_HOSTNAME = Deno.env.get("FLY_API_HOSTNAME") || "https://api.machines.dev";
const FLY_API_TOKEN = Deno.env.get("FLY_API_TOKEN");
const FLY_DS160_APP = Deno.env.get("FLY_DS160_APP") || "ds160-worker";
const FLY_DS160_MACHINE_ID = Deno.env.get("FLY_DS160_MACHINE_ID");
const FLY_AIS_APP = Deno.env.get("FLY_AIS_APP");
const FLY_AIS_MACHINE_ID = Deno.env.get("FLY_AIS_MACHINE_ID");

type FlyMachine = {
    id: string;
    state?: string;
};

type DispatchResult = {
    dispatched: boolean;
    app: string;
    machineId: string | null;
    reason: string;
};

async function flyFetch(path: string, init: RequestInit = {}) {
    if (!FLY_API_TOKEN) throw new Error("FLY_API_TOKEN not set");

    const res = await fetch(`${FLY_API_HOSTNAME}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${FLY_API_TOKEN}`,
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Fly API ${res.status}: ${error}`);
    }

    return res;
}

async function listMachines(appName: string): Promise<FlyMachine[]> {
    const res = await flyFetch(`/v1/apps/${appName}/machines`);
    return await res.json();
}

async function startMachine(appName: string, machineId: string): Promise<boolean> {
    try {
        await flyFetch(`/v1/apps/${appName}/machines/${machineId}/start`, { method: "POST" });
        console.log(`Started Fly machine ${machineId} for ${appName}`);
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to start Fly machine ${machineId} for ${appName}:`, message);
        return false;
    }
}

function isRunningState(state?: string) {
    return state === "started" || state === "starting";
}

function isStartableState(state?: string) {
    return state === "stopped" || state === "suspended" || state === "created";
}

async function dispatchFlyApp(appName: string, preferredMachineId?: string | null): Promise<DispatchResult> {
    const machines = await listMachines(appName);
    if (!machines.length) {
        return {
            dispatched: false,
            app: appName,
            machineId: null,
            reason: "no_machines_found",
        };
    }

    const running = machines.find((machine) => isRunningState(machine.state));
    if (running) {
        return {
            dispatched: true,
            app: appName,
            machineId: running.id,
            reason: "worker_already_running",
        };
    }

    if (preferredMachineId) {
        const started = await startMachine(appName, preferredMachineId);
        if (started) {
            return {
                dispatched: true,
                app: appName,
                machineId: preferredMachineId,
                reason: "preferred_machine_started",
            };
        }
    }

    const candidate = machines.find((machine) => machine.id !== preferredMachineId && isStartableState(machine.state));
    if (!candidate) {
        return {
            dispatched: false,
            app: appName,
            machineId: preferredMachineId || null,
            reason: preferredMachineId ? "preferred_machine_failed_no_fallback" : "no_startable_machine_available",
        };
    }

    const started = await startMachine(appName, candidate.id);
    return {
        dispatched: started,
        app: appName,
        machineId: candidate.id,
        reason: started ? "machine_started" : "machine_start_failed",
    };
}

Deno.serve(async (req: Request) => {
    try {
        const payload = await req.json();
        const record = payload.record || payload.new;

        if (!record) {
            return new Response(JSON.stringify({ error: "No record in payload" }), { status: 400 });
        }

        const { stage, status } = record;
        let appName: string | null = null;
        let machineId: string | null = null;

        if (stage === "ds160" && (status === "todo" || status === "retry")) {
            appName = FLY_DS160_APP;
            machineId = FLY_DS160_MACHINE_ID || null;
        } else if ((stage === "payment" || stage === "scheduling") && status === "todo" && FLY_AIS_APP) {
            appName = FLY_AIS_APP;
            machineId = FLY_AIS_MACHINE_ID || null;
        }

        if (!appName) {
            return new Response(JSON.stringify({ skipped: true, reason: `${stage}/${status} not dispatchable` }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const result = await dispatchFlyApp(appName, machineId);
        const status = result.dispatched ? 200 : 500;
        console.log("dispatch-job result", JSON.stringify(result));
        return new Response(JSON.stringify(result), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("Error:", message);
        return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
});
