// ============================================================
// DS160 EXPRESSO — Software Page JS
// ============================================================
const GH_OWNER = 'viniciussouzax';
const GH_REPO = 'visa';
const GH_BRANCH = 'main';

(async () => {
    const ok = await initAuth();
    if (!ok) return;
    renderLayout();
    await loadSoftwareInfo();
    setupSoftwareListeners();
    hideLoader();
})();

function setupSoftwareListeners() {
    const copyBtn = $('btn-copy-form');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const base = location.href.replace(/dashboard\/.*$/, '');
            const url = userCompanyShortId ? `${base}ds160/index.html?org=${userCompanyShortId}` : `${base}ds160/index.html`;
            navigator.clipboard.writeText(url);
            copyBtn.textContent = 'Copiado!';
            setTimeout(() => { copyBtn.textContent = 'Copiar link do formulário'; }, 2000);
        };
    }

    // Org ID display
    const orgEl = $('org-id-display');
    if (orgEl && userCompanyId) {
        orgEl.textContent = 'Org: ' + userCompanyId.substring(0, 8) + '...';
        orgEl.onclick = () => {
            navigator.clipboard.writeText(userCompanyId);
            toast('ID copiado!', 'success');
        };
    }
}

async function loadSoftwareInfo() {
    // 1) Fetch latest release from GitHub
    try {
        const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/latest`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.ok) {
            const release = await res.json();
            const version = release.tag_name || release.name || '—';
            const versionClean = version.replace(/^v/i, '');
            const releaseDate = release.published_at
                ? new Date(release.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                : '';
            const notes = release.body || '';
            const msiAsset = (release.assets || []).find(a => a.name.endsWith('-setup.exe') || a.name.endsWith('.msi'));

            $('sw-version').textContent = 'v' + versionClean;
            $('sw-version-date').textContent = releaseDate ? 'Publicado em ' + releaseDate : '';
            $('sw-version-notes').textContent = notes.substring(0, 200);

            if (msiAsset) {
                $('sw-download-btn').href = msiAsset.browser_download_url;
                $('sw-download-version').textContent = 'v' + versionClean;
                const sizeMB = (msiAsset.size / (1024 * 1024)).toFixed(1);
                $('sw-download-size').textContent = sizeMB + ' MB';
                $('sw-download-date').textContent = releaseDate ? 'Publicado em ' + releaseDate : '';
            } else {
                $('sw-download-btn').href = `https://github.com/${GH_OWNER}/${GH_REPO}/releases/latest`;
                $('sw-download-version').textContent = 'v' + versionClean;
                $('sw-download-size').textContent = '';
                $('sw-download-date').textContent = releaseDate ? 'Publicado em ' + releaseDate : '';
            }
        } else {
            $('sw-version').textContent = '—';
            $('sw-version-date').textContent = 'Nenhum release publicado';
            $('sw-download-btn').href = `https://github.com/${GH_OWNER}/${GH_REPO}/releases`;
        }
    } catch (e) {
        console.warn('[Software] Erro ao buscar release:', e);
        $('sw-version').textContent = '—';
        $('sw-version-date').textContent = 'Erro ao carregar';
    }

    // 2) Fetch automation version from version.json
    try {
        const res = await fetch(`https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/ds160-filler/automation/version.json?t=${Date.now()}`);
        if (res.ok) {
            const ver = await res.json();
            $('sw-auto-version').textContent = 'v' + (ver.version || '—');
            $('sw-auto-date').textContent = ver.date ? 'Atualizado em ' + new Date(ver.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
            $('sw-auto-changelog').textContent = ver.changelog || '';
        } else {
            $('sw-auto-version').textContent = '—';
            $('sw-auto-date').textContent = 'Não encontrado';
        }
    } catch (e) {
        console.warn('[Software] Erro ao buscar version.json:', e);
        $('sw-auto-version').textContent = '—';
        $('sw-auto-date').textContent = 'Erro ao carregar';
    }
}
