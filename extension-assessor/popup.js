const loginView = document.getElementById("loginView");
const queueView = document.getElementById("queueView");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const queueError = document.getElementById("queueError");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");
const queueList = document.getElementById("queueList");
const orgName = document.getElementById("orgName");
const sessionEmail = document.getElementById("sessionEmail");
const queueCount = document.getElementById("queueCount");
const updatedAt = document.getElementById("updatedAt");
const updateBox = document.getElementById("updateBox");
const updateMessage = document.getElementById("updateMessage");
const updateButton = document.getElementById("updateButton");
const connectCeacButton = document.getElementById("connectCeacButton");
const inspectCeacButton = document.getElementById("inspectCeacButton");
const runNextJobButton = document.getElementById("runNextJobButton");
const ceacStateBox = document.getElementById("ceacStateBox");
const ceacStateMessage = document.getElementById("ceacStateMessage");

loginForm.addEventListener("submit", handleLogin);
refreshButton.addEventListener("click", handleRefresh);
logoutButton.addEventListener("click", handleLogout);
updateButton.addEventListener("click", handleOpenUpdate);
connectCeacButton.addEventListener("click", handleConnectCeac);
inspectCeacButton.addEventListener("click", handleInspectCeac);
runNextJobButton.addEventListener("click", handleRunNextJob);

init();

async function init() {
  const state = await sendMessage({ type: "get-state" });
  renderState(state);
}

async function handleLogin(event) {
  event.preventDefault();
  setLoginBusy(true);
  hideError(loginError);

  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };

  const response = await sendMessage({ type: "login", payload });
  setLoginBusy(false);

  if (!response?.ok) {
    showError(loginError, response?.error || "Falha no login.");
    return;
  }

  renderState(response);
}

async function handleRefresh() {
  setRefreshBusy(true);
  hideError(queueError);

  const response = await sendMessage({ type: "refresh-queue" });
  setRefreshBusy(false);

  renderState(await mergeStateWithResponse(response));
}

async function handleLogout() {
  await sendMessage({ type: "logout" });
  loginForm.reset();
  hideCeacState();
  renderState({ ok: true, authenticated: false });
}

async function handleConnectCeac() {
  setCeacBusy(true, "Conectando...");
  const response = await sendMessage({ type: "ensure-ceac-ready" });
  setCeacBusy(false);
  renderCeacState(response);
}

async function handleInspectCeac() {
  setCeacBusy(true, "Lendo...");
  const response = await sendMessage({ type: "get-ceac-state" });
  setCeacBusy(false);
  renderCeacState(response);
}

async function handleRunNextJob() {
  setCeacBusy(true, "Executando...");
  hideError(queueError);

  const response = await sendMessage({ type: "run-next-job" });
  setCeacBusy(false);
  renderCeacState(response);

  if (response?.queueSnapshot) {
    renderState(await mergeStateWithResponse(response));
  }

  if (!response?.ok) {
    showError(queueError, response?.error || "Falha ao executar a proxima tarefa.");
    return;
  }

  hideError(queueError);
}

async function mergeStateWithResponse(response) {
  const state = await sendMessage({ type: "get-state" });
  return {
    ...state,
    ...(response || {}),
    authenticated: state?.authenticated ?? true,
    session: state?.session || null,
    queueSnapshot: response?.queueSnapshot || state?.queueSnapshot || null,
    updateStatus: response?.updateStatus || state?.updateStatus || null,
  };
}

function renderState(state) {
  if (!state?.authenticated) {
    loginView.classList.remove("hidden");
    queueView.classList.add("hidden");
    renderUpdateStatus(state?.updateStatus || null);
    hideCeacState();

    if (state?.lastError?.message) {
      showError(loginError, state.lastError.message);
    } else {
      hideError(loginError);
    }
    return;
  }

  loginView.classList.add("hidden");
  queueView.classList.remove("hidden");

  const snapshot = state.queueSnapshot || {};
  const items = snapshot.items || [];

  orgName.textContent = snapshot.org?.name || "Fila DS-160";
  sessionEmail.textContent = state.session?.email || "";
  queueCount.textContent = String(snapshot.count || 0);
  updatedAt.textContent = formatDate(snapshot.generated_at);

  if (state.lastError?.message) {
    showError(queueError, state.lastError.message);
  } else {
    hideError(queueError);
  }

  renderUpdateStatus(state.updateStatus || null);
  queueList.innerHTML = "";

  if (state?.updateStatus?.mustUpdate) {
    queueList.innerHTML = `<div class="item"><div class="item-name">Atualizacao obrigatoria</div><div class="item-meta">A extensao precisa ser atualizada antes de consultar uma nova execucao.</div></div>`;
    return;
  }

  if (snapshot.modeBlocked) {
    queueList.innerHTML = `<div class="item"><div class="item-name">Modo servidor ativo</div><div class="item-meta">A organizacao esta configurada para execucao remota no painel master.</div></div>`;
    return;
  }

  if (!items.length) {
    queueList.innerHTML = `<div class="item"><div class="item-name">Nenhum item na fila.</div><div class="item-meta">Sem casos ativos em DS-160 para esta organizacao.</div></div>`;
    return;
  }

  for (const item of items) {
    const element = document.createElement("article");
    element.className = "item";
    element.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-meta">${escapeHtml(item.email || "Sem e-mail")}</div>
        </div>
        <span class="badge ${escapeHtml(item.fill_status)}">${escapeHtml(labelForStatus(item.fill_status))}</span>
      </div>
      <div class="item-meta">Application ID: ${escapeHtml(item.application_id || "-")}</div>
      <div class="item-meta">Ultima pagina: ${escapeHtml(item.last_page || "-")}</div>
      <div class="item-meta">Retries: ${escapeHtml(String(item.retry_count || 0))}</div>
      ${item.fill_error ? `<div class="item-meta">Erro: ${escapeHtml(item.fill_error)}</div>` : ""}
    `;
    queueList.appendChild(element);
  }
}

function renderUpdateStatus(status) {
  if (!status?.hasUpdate && !status?.mustUpdate) {
    updateBox.classList.add("hidden");
    updateMessage.textContent = "";
    updateButton.classList.add("hidden");
    updateButton.dataset.url = "";
    return;
  }

  updateBox.classList.remove("hidden");
  updateMessage.textContent = status.message || `Atualizacao disponivel: ${status.latestVersion}.`;

  if (status.downloadUrl) {
    updateButton.classList.remove("hidden");
    updateButton.dataset.url = status.downloadUrl;
  } else {
    updateButton.classList.add("hidden");
    updateButton.dataset.url = "";
  }
}

function renderCeacState(response) {
  if (!response?.ok) {
    ceacStateBox.classList.remove("hidden");
    ceacStateMessage.textContent = response?.error || "Falha ao conectar no CEAC.";
    return;
  }

  const state = response.state || {};
  const inspected = state.inspected || {};
  const job = response.job || null;

  ceacStateBox.classList.remove("hidden");
  ceacStateMessage.textContent = job
    ? `Executando: ${job.name} · recipe ${job.recipe_version || "0.1.0"}`
    : `CEAC conectado. ${state.pathname || "/"} · formularios: ${inspected.formCount ?? 0} · inputs: ${inspected.inputCount ?? 0}`;
}

function hideCeacState() {
  ceacStateBox.classList.add("hidden");
  ceacStateMessage.textContent = "";
}

function handleOpenUpdate() {
  const url = updateButton.dataset.url;
  if (!url) return;
  chrome.tabs.create({ url });
}

function setLoginBusy(busy) {
  loginButton.disabled = busy;
  loginButton.textContent = busy ? "Entrando..." : "Entrar";
}

function setRefreshBusy(busy) {
  refreshButton.disabled = busy;
  refreshButton.textContent = busy ? "Consultando..." : "Consultar agora";
}

function setCeacBusy(busy, label = "Conectar CEAC") {
  connectCeacButton.disabled = busy;
  inspectCeacButton.disabled = busy;
  runNextJobButton.disabled = busy;
  connectCeacButton.textContent = busy ? label : "Conectar CEAC";
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideError(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

function labelForStatus(status) {
  const labels = {
    todo: "Pendente",
    retry: "Repetir",
    doing: "Em execucao",
    standby: "Em espera",
    error: "Erro",
    fail: "Falha",
  };
  return labels[status] || status || "Desconhecido";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { ok: false, error: "Sem resposta da extensao." });
    });
  });
}
