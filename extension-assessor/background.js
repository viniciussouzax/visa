import {
  ACTIVE_QUEUE_STATUSES,
  POLL_INTERVAL_MINUTES,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./config.js";
import { validateRecipe } from "./engine/recipe-contract.js";
import { loadRemoteRecipe } from "./engine/recipe-service.js";

const STORAGE_KEYS = {
  session: "session",
  queueSnapshot: "queueSnapshot",
  lastError: "lastError",
  updateStatus: "updateStatus",
  executionState: "executionState",
};

const ALARM_NAME = "queue-poll";
const UPDATE_SETTINGS_KEYS = [
  "extension_latest_version",
  "extension_min_supported_version",
  "extension_download_url",
];
const CEAC_URL = "https://ceac.state.gov/GenNIV/";
const EXECUTION_LOCK_TTL_MS = 45 * 60 * 1000;
const MAX_AUTOMATIC_JOBS_PER_CYCLE = 10;

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  try {
    const queueState = await refreshQueue();
    if (queueState?.ok) {
      await kickAutomaticExecution("alarm", queueState);
    }
  } catch (error) {
    await setLastError(error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "login":
        sendResponse(await login(message.payload));
        return;
      case "logout":
        sendResponse(await logout());
        return;
      case "get-state":
        sendResponse(await getState());
        return;
      case "refresh-queue":
        sendResponse(await handleRefreshQueue());
        return;
      case "ensure-ceac-ready":
        sendResponse(await ensureCeacReady());
        return;
      case "get-ceac-state":
        sendResponse(await getCeacState());
        return;
      case "run-next-job":
        sendResponse(await runNextJob());
        return;
      default:
        sendResponse({ ok: false, error: "Acao nao suportada." });
    }
  })().catch(async (error) => {
    await setLastError(error);
    sendResponse({ ok: false, error: normalizeError(error) });
  });

  return true;
});

async function login({ email, password }) {
  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  const session = await signInWithPassword(email, password);
  const member = await resolveMemberContext(session);
  assertAllowedRole(member);

  await saveSession(session);
  await clearLastError();
  await ensurePollAlarm();

  const queueState = await refreshQueue();
  void kickAutomaticExecution("login", queueState);

  return {
    ok: true,
    authenticated: true,
    session: {
      email: session.user?.email || email,
      expires_at: session.expires_at || null,
    },
    queueSnapshot: queueState?.queueSnapshot || null,
    updateStatus: queueState?.updateStatus || null,
  };
}

async function logout() {
  const { session } = await chrome.storage.local.get(STORAGE_KEYS.session);
  if (session?.access_token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: authHeaders(session.access_token),
    }).catch(() => {});
  }

  await chrome.storage.local.remove([
    STORAGE_KEYS.session,
    STORAGE_KEYS.queueSnapshot,
    STORAGE_KEYS.lastError,
    STORAGE_KEYS.updateStatus,
    STORAGE_KEYS.executionState,
  ]);
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.action.setBadgeText({ text: "" });

  return { ok: true };
}

async function getState() {
  const session = await getValidSession();
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.queueSnapshot,
    STORAGE_KEYS.lastError,
    STORAGE_KEYS.updateStatus,
    STORAGE_KEYS.executionState,
  ]);

  if (!session) {
    return {
      ok: true,
      authenticated: false,
      queueSnapshot: stored.queueSnapshot || null,
      lastError: stored.lastError || null,
      updateStatus: stored.updateStatus || null,
      executionState: stored.executionState || null,
    };
  }

  const updateStatus = await checkForExtensionUpdate(session.access_token);
  if (updateStatus.mustUpdate) {
    return {
      ok: false,
      authenticated: true,
      session: {
        email: session.user?.email || "",
        expires_at: session.expires_at || null,
      },
      queueSnapshot: stored.queueSnapshot || null,
      lastError: stored.lastError || null,
      updateStatus,
      executionState: stored.executionState || null,
      error: updateStatus.message,
    };
  }

  return {
    ok: true,
    authenticated: true,
    session: {
      email: session.user?.email || "",
      expires_at: session.expires_at || null,
    },
    queueSnapshot: stored.queueSnapshot || null,
    lastError: stored.lastError || null,
    updateStatus: updateStatus || stored.updateStatus || null,
    executionState: stored.executionState || null,
  };
}

async function handleRefreshQueue() {
  const response = await refreshQueue();
  if (response?.ok) {
    void kickAutomaticExecution("manual-refresh", response);
  }
  return response;
}

async function refreshQueue() {
  const session = await getValidSession();
  if (!session?.access_token || !session?.user?.id) {
    return { ok: false, error: "Sessao ausente." };
  }

  const updateStatus = await checkForExtensionUpdate(session.access_token);
  if (updateStatus.mustUpdate) {
    return {
      ok: false,
      authenticated: true,
      updateStatus,
      error: updateStatus.message,
    };
  }

  const member = await resolveMemberContext(session);
  assertAllowedRole(member);

  const company = await fetchSingle(
    `/rest/v1/companies?id=eq.${encodeURIComponent(member.company_id)}&select=id,name,short_id,execution_mode&limit=1`,
    session.access_token,
  );

  if ((company?.execution_mode || "server") !== "extension") {
    const blockedSnapshot = {
      org: company || { id: member.company_id, name: "Organizacao", short_id: "", execution_mode: "server" },
      member,
      items: [],
      generated_at: new Date().toISOString(),
      count: 0,
      modeBlocked: true,
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.queueSnapshot]: blockedSnapshot });
    await clearLastError();
    await chrome.action.setBadgeText({ text: "" });

    return {
      ok: true,
      authenticated: true,
      updateStatus,
      queueSnapshot: blockedSnapshot,
      error: "Esta organizacao esta configurada para execucao no servidor.",
    };
  }

  const applicants = await fetchJson(
    `/rest/v1/applicants?company_id=eq.${encodeURIComponent(member.company_id)}&stage=eq.ds160&select=id,full_name,email,status,stage,notes,updated_at,created_at&order=updated_at.desc`,
    session.access_token,
  );

  const applicantIds = applicants.map((row) => row.id).filter(Boolean);
  const applications = applicantIds.length
    ? await fetchApplicationsForApplicants(applicantIds, session.access_token)
    : [];

  const latestByApplicant = new Map();
  for (const application of applications) {
    if (!latestByApplicant.has(application.applicant_id)) {
      latestByApplicant.set(application.applicant_id, application);
    }
  }

  const items = applicants
    .map((applicant) => {
      const application = latestByApplicant.get(applicant.id) || null;
      return {
        applicant_id: applicant.id,
        application_id: application?.application_id || null,
        application_row_id: application?.id || null,
        name: applicant.full_name || "(Sem nome)",
        email: applicant.email || "",
        stage: applicant.stage || "ds160",
        status: applicant.status || "todo",
        fill_status: application?.fill_status || "todo",
        fill_error: application?.fill_error || null,
        last_page: application?.last_page || null,
        last_error_at: application?.last_error_at || null,
        retry_count: application?.retry_count || 0,
        updated_at: applicant.updated_at || applicant.created_at || null,
        notes: applicant.notes || "",
      };
    })
    .filter((item) => ACTIVE_QUEUE_STATUSES.includes(item.fill_status));

  const snapshot = {
    org: company || { id: member.company_id, name: "Organizacao", short_id: "", execution_mode: "extension" },
    member,
    items,
    generated_at: new Date().toISOString(),
    count: items.length,
    modeBlocked: false,
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.queueSnapshot]: snapshot });
  await clearLastError();
  await chrome.action.setBadgeText({ text: snapshot.count ? String(snapshot.count) : "" });

  return {
    ok: true,
    authenticated: true,
    queueSnapshot: snapshot,
    updateStatus,
  };
}

async function ensureCeacReady() {
  const session = await getValidSession();
  if (!session?.access_token) {
    return { ok: false, error: "Faca login antes de conectar ao CEAC." };
  }

  const queueState = await refreshQueue();
  if (!queueState?.ok && queueState?.updateStatus?.mustUpdate) {
    return queueState;
  }
  if (queueState?.queueSnapshot?.modeBlocked) {
    return { ok: false, error: "A organizacao esta em modo servidor." };
  }

  try {
    const tab = await ensureCeacTabReady({ createIfMissing: true });
    const response = await sendTabMessage(tab.id, { type: "ceac-ping" });
    return {
      ok: true,
      tabId: tab.id,
      state: response?.state || null,
    };
  } catch (error) {
    return { ok: false, error: normalizeError(error) };
  }
}

async function getCeacState() {
  try {
    const tab = await ensureCeacTabReady({ createIfMissing: false });
    const response = await sendTabMessage(tab.id, { type: "ceac-ping" });
    return {
      ok: true,
      tabId: tab.id,
      state: response?.state || null,
    };
  } catch (error) {
    return { ok: false, error: normalizeError(error) };
  }
}

async function runNextJob() {
  return runQueueCycle("manual", { maxJobs: 1 });
}

async function kickAutomaticExecution(source, queueState) {
  if (!queueState?.ok) return { ok: false, error: queueState?.error || "Fila indisponivel." };
  if (queueState?.queueSnapshot?.modeBlocked) return { ok: true, skipped: true };
  if (!hasClaimableItem(queueState?.queueSnapshot?.items || [])) return { ok: true, skipped: true };
  return runQueueCycle(source, { maxJobs: MAX_AUTOMATIC_JOBS_PER_CYCLE, queueState });
}

async function runQueueCycle(source, { maxJobs = 1, queueState = null } = {}) {
  const session = await getValidSession();
  if (!session?.access_token) {
    return { ok: false, error: "Faca login antes de executar." };
  }

  const lock = await acquireExecutionLock(source);
  if (!lock.acquired) {
    return {
      ok: false,
      error: "Ja existe uma execucao local em andamento.",
      executionState: lock.state || null,
    };
  }

  try {
    let lastResult = null;
    let currentQueue = queueState || await refreshQueue();

    for (let count = 0; count < maxJobs; count += 1) {
      if (!currentQueue?.ok || currentQueue?.queueSnapshot?.modeBlocked) break;

      const candidate = chooseNextClaimableItem(currentQueue.queueSnapshot?.items || []);
      if (!candidate) break;

      lastResult = await runSingleJob(session, currentQueue.queueSnapshot, candidate, lock.id);
      if (!lastResult?.ok) {
        return {
          ...lastResult,
          executionState: await getExecutionState(),
        };
      }

      currentQueue = {
        ok: true,
        authenticated: true,
        queueSnapshot: lastResult.queueSnapshot || null,
        updateStatus: currentQueue.updateStatus || null,
      };
    }

    return {
      ok: true,
      queueSnapshot: currentQueue?.queueSnapshot || null,
      executionState: await getExecutionState(),
      job: lastResult?.job || null,
      state: lastResult?.state || null,
    };
  } catch (error) {
    await setLastError(error);
    return { ok: false, error: normalizeError(error), executionState: await getExecutionState() };
  } finally {
    await releaseExecutionLock(lock.id);
  }
}

async function runSingleJob(session, snapshot, candidate, lockId) {
  const applicationRow = await ensureApplicationRow(candidate.applicant_id, session.access_token);
  const claimed = await claimApplicationRow(applicationRow.id, session.user?.id || "extension", session.access_token);
  if (!claimed?.id) {
    return { ok: false, error: "Falha ao claimar a aplicacao para execucao local." };
  }

  await updateExecutionState(lockId, {
    application_row_id: claimed.id,
    applicant_id: candidate.applicant_id,
    applicant_name: candidate.name,
  });

  let applicant = null;
  let recipe = null;

  try {
    applicant = await fetchSingle(
      `/rest/v1/applicants?id=eq.${encodeURIComponent(candidate.applicant_id)}&select=*`,
      session.access_token,
    );
    if (!applicant) {
      throw new Error("Solicitante nao encontrado apos claim.");
    }

    const recipeSettings = await fetchSettingsMap(["extension_recipe_ds160"], session.access_token);
    if (!recipeSettings.extension_recipe_ds160) {
      throw new Error("Recipe extension_recipe_ds160 nao configurada no backend.");
    }

    recipe = loadRemoteRecipe(recipeSettings.extension_recipe_ds160, {
      applicant,
      data: applicant.data || {},
      application: claimed,
      org: snapshot.org || {},
      session: {
        user_id: session.user?.id || "",
        email: session.user?.email || "",
      },
    });

    const recipeErrors = validateRecipe(recipe);
    if (recipeErrors.length > 0) {
      throw new Error(recipeErrors.join(" | "));
    }

    const tab = await ensureCeacTabReady({ createIfMissing: true });
    const execution = await sendTabMessage(tab.id, { type: "ceac-run-recipe", recipe });
    if (!execution?.ok) {
      throw new Error(execution?.error || "Falha ao executar a recipe na aba do CEAC.");
    }

    await applyRecipeOutcome(claimed.id, applicant.id, session.access_token, recipe?.on_success, {
      application_fill_status: "todo",
      applicant_status: "todo",
      fill_error: null,
    });

    const updatedQueue = await refreshQueue();
    await clearLastError();

    return {
      ok: true,
      queueSnapshot: updatedQueue?.queueSnapshot || null,
      job: {
        applicant_id: applicant.id,
        name: applicant.full_name || "(Sem nome)",
        application_row_id: claimed.id,
        recipe_version: recipe.version || "0.1.0",
      },
      state: execution?.state || null,
    };
  } catch (error) {
    if (applicant?.id) {
      await applyRecipeOutcome(claimed.id, applicant.id, session.access_token, recipe?.on_failure, {
        application_fill_status: "retry",
        applicant_status: "retry",
        fill_error: normalizeError(error),
      }).catch(() => releaseClaimedApplication(claimed.id, session.access_token, normalizeError(error)));
    } else {
      await releaseClaimedApplication(claimed.id, session.access_token, normalizeError(error));
    }

    const updatedQueue = await refreshQueue().catch(() => null);
    await setLastError(error);

    return {
      ok: false,
      error: normalizeError(error),
      queueSnapshot: updatedQueue?.queueSnapshot || null,
    };
  }
}

async function ensureCeacTabReady({ createIfMissing }) {
  let tab = await findAnyCeacTab();

  if (!tab && !createIfMissing) {
    throw new Error("Nenhuma aba do CEAC encontrada.");
  }

  if (!tab && createIfMissing) {
    tab = await chrome.tabs.create({ url: CEAC_URL, active: true });
  } else if (tab) {
    if (tab.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    }
    await chrome.tabs.update(tab.id, { active: true });
  }

  await waitForTabReady(tab.id);
  await injectCeacScripts(tab.id);
  return tab;
}

async function findAnyCeacTab() {
  const tabs = await chrome.tabs.query({ url: ["https://ceac.state.gov/*"] });
  return tabs[0] || null;
}

function waitForTabReady(tabId, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timeout ao aguardar a aba do CEAC carregar."));
    }, timeoutMs);

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }

    chrome.tabs.get(tabId, (tab) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        clearTimeout(timeout);
        reject(new Error(runtimeError.message));
        return;
      }

      if (tab?.status === "complete") {
        clearTimeout(timeout);
        resolve();
        return;
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

async function acquireExecutionLock(source) {
  const state = await getExecutionState();
  const now = Date.now();

  if (state?.running && now - new Date(state.started_at || 0).getTime() < EXECUTION_LOCK_TTL_MS) {
    return { acquired: false, state };
  }

  const lockId = crypto.randomUUID();
  const nextState = {
    id: lockId,
    running: true,
    source,
    started_at: new Date().toISOString(),
    application_row_id: null,
    applicant_id: null,
    applicant_name: null,
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.executionState]: nextState });
  return { acquired: true, id: lockId, state: nextState };
}

async function updateExecutionState(lockId, patch) {
  const state = await getExecutionState();
  if (!state?.running || state.id !== lockId) return;

  await chrome.storage.local.set({
    [STORAGE_KEYS.executionState]: {
      ...state,
      ...patch,
    },
  });
}

async function releaseExecutionLock(lockId) {
  const state = await getExecutionState();
  if (!state) return;
  if (lockId && state.id !== lockId) return;
  await chrome.storage.local.remove(STORAGE_KEYS.executionState);
}

async function getExecutionState() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.executionState);
  return stored.executionState || null;
}

function hasClaimableItem(items) {
  return items.some((item) => ["todo", "retry"].includes(item.fill_status));
}

async function signInWithPassword(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(payload?.msg || payload?.error_description || payload?.error || "Falha no login.");
  }

  return payload;
}

async function refreshSession(refreshToken) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(payload?.msg || payload?.error_description || payload?.error || "Falha ao renovar sessao.");
  }

  return payload;
}

async function getValidSession() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.session);
  const session = data[STORAGE_KEYS.session];
  if (!session?.access_token) return null;

  const expiresAt = Number(session.expires_at || 0);
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && expiresAt - now > 90) {
    return session;
  }

  if (!session.refresh_token) {
    await logout();
    return null;
  }

  const refreshed = await refreshSession(session.refresh_token);
  await saveSession(refreshed);
  return refreshed;
}

async function saveSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEYS.session]: session });
}

async function ensurePollAlarm() {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES });
}

async function fetchSingle(path, token) {
  const rows = await fetchJson(path, token);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function injectCeacScripts(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["engine/runtime.js", "content-script.js"],
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      resolve(response);
    });
  });
}

async function fetchSettingsMap(keys, token) {
  if (!keys?.length) return {};

  const encodedKeys = keys.map((key) => `"${key}"`).join(",");
  const rows = await fetchJson(
    `/rest/v1/settings?key_name=in.(${encodedKeys})&select=key_name,key_value`,
    token,
  );

  const map = {};
  for (const row of rows || []) {
    map[row.key_name] = row.key_value;
  }

  return map;
}

async function fetchApplicationsForApplicants(applicantIds, token) {
  const chunkSize = 80;
  const rows = [];

  for (let index = 0; index < applicantIds.length; index += chunkSize) {
    const chunk = applicantIds.slice(index, index + chunkSize);
    const data = await fetchJson(
      `/rest/v1/applications?applicant_id=in.(${chunk.join(",")})&select=id,applicant_id,application_id,fill_status,fill_error,last_page,last_error_at,retry_count,updated_at,created_at&order=created_at.desc`,
      token,
    );
    rows.push(...data);
  }

  return rows;
}

async function ensureApplicationRow(applicantId, token) {
  const row = await fetchSingle(
    `/rest/v1/applications?applicant_id=eq.${encodeURIComponent(applicantId)}&select=*&order=created_at.desc&limit=1`,
    token,
  );

  if (!row) {
    return createApplicationRow(applicantId, token);
  }

  if (["error", "standby", "done"].includes(row.fill_status)) {
    return patchApplicationRow(
      row.id,
      {
        fill_status: "todo",
        fill_error: null,
        fill_worker_id: null,
        fill_started_at: null,
        last_error_at: null,
        retry_count: 0,
      },
      token,
    );
  }

  return row;
}

async function createApplicationRow(applicantId, token) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      applicant_id: applicantId,
      fill_status: "todo",
    }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error("Falha ao criar application row.");
  }

  return Array.isArray(data) ? data[0] : data;
}

async function patchApplicationRow(applicationRowId, patch, token) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${encodeURIComponent(applicationRowId)}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error("Falha ao atualizar application row.");
  }

  return Array.isArray(data) ? data[0] : data;
}

async function claimApplicationRow(applicationRowId, userId, token) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_application`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      app_id: applicationRowId,
      worker: `extension_${userId}`,
    }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error("Falha no claim da aplicacao.");
  }

  return data;
}

async function releaseClaimedApplication(applicationRowId, token, message) {
  try {
    await patchApplicationRow(
      applicationRowId,
      {
        fill_status: "retry",
        fill_error: message || null,
        fill_worker_id: null,
        fill_started_at: null,
        last_error_at: new Date().toISOString(),
      },
      token,
    );
  } catch {
    // noop
  }
}

async function applyRecipeOutcome(applicationRowId, applicantId, token, outcome, fallback) {
  const merged = {
    application_fill_status: fallback?.application_fill_status || "todo",
    applicant_status: fallback?.applicant_status || "todo",
    fill_error: fallback?.fill_error ?? null,
    last_page: fallback?.last_page ?? null,
    ...(outcome || {}),
  };

  await patchApplicationRow(
    applicationRowId,
    {
      fill_status: merged.application_fill_status,
      fill_error: merged.fill_error,
      fill_worker_id: null,
      fill_started_at: null,
      last_error_at: merged.fill_error ? new Date().toISOString() : null,
      last_page: merged.last_page || null,
    },
    token,
  );

  await patchApplicantRow(
    applicantId,
    {
      status: merged.applicant_status,
      updated_at: new Date().toISOString(),
    },
    token,
  );
}

async function patchApplicantRow(applicantId, patch, token) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/applicants?id=eq.${encodeURIComponent(applicantId)}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error("Falha ao atualizar applicant.");
  }

  return Array.isArray(data) ? data[0] : data;
}

async function fetchJson(path, token) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: authHeaders(token),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Falha HTTP ${response.status}`);
  }

  return parseJson(response);
}

function baseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
}

function authHeaders(token) {
  return {
    ...baseHeaders(),
    Authorization: `Bearer ${token}`,
  };
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function setLastError(error) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.lastError]: {
      message: normalizeError(error),
      at: new Date().toISOString(),
    },
  });
}

async function clearLastError() {
  await chrome.storage.local.remove(STORAGE_KEYS.lastError);
}

function normalizeError(error) {
  return error?.message || String(error || "Erro desconhecido");
}

async function resolveMemberContext(session) {
  const member = await fetchSingle(
    `/rest/v1/members?user_id=eq.${encodeURIComponent(session.user.id)}&select=company_id,role&limit=1`,
    session.access_token,
  );

  if (!member?.company_id) {
    throw new Error("Usuario sem organizacao vinculada.");
  }

  return member;
}

function assertAllowedRole(member) {
  if (!["assessor", "admin"].includes(member?.role)) {
    throw new Error("A extensao esta liberada apenas para assessor ou admin da organizacao.");
  }
}

async function checkForExtensionUpdate(token) {
  const localVersion = chrome.runtime.getManifest().version;
  const settings = await fetchSettingsMap(UPDATE_SETTINGS_KEYS, token).catch(() => ({}));

  const latestVersion = settings.extension_latest_version || localVersion;
  const minSupportedVersion = settings.extension_min_supported_version || localVersion;
  const downloadUrl = settings.extension_download_url || "";
  const mustUpdate = compareVersions(localVersion, minSupportedVersion) < 0;
  const hasUpdate = compareVersions(localVersion, latestVersion) < 0;

  const updateStatus = {
    localVersion,
    latestVersion,
    minSupportedVersion,
    downloadUrl,
    mustUpdate,
    hasUpdate,
    message: mustUpdate
      ? `Extensao desatualizada. Atualize para ${latestVersion}.`
      : hasUpdate
        ? `Atualizacao disponivel: ${latestVersion}.`
        : "",
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.updateStatus]: updateStatus });
  return updateStatus;
}

function compareVersions(left, right) {
  const leftParts = String(left || "0").split(".").map((part) => Number(part) || 0);
  const rightParts = String(right || "0").split(".").map((part) => Number(part) || 0);
  const size = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < size; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

function chooseNextClaimableItem(items) {
  const claimableStatuses = new Set(["todo", "retry"]);

  return [...items]
    .filter((item) => claimableStatuses.has(item.fill_status))
    .sort((left, right) => new Date(left.updated_at || 0) - new Date(right.updated_at || 0))[0] || null;
}
