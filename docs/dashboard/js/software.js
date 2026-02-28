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
            const assets = release.assets || [];

            $('sw-version').textContent = 'v' + versionClean;
            $('sw-version-date').textContent = releaseDate ? 'Publicado em ' + releaseDate : '';
            $('sw-version-notes').textContent = notes.substring(0, 200);

            // Find platform assets
            const winAsset = assets.find(a => a.name.endsWith('-setup.exe') || a.name.endsWith('.msi'));
            const macAsset = assets.find(a => a.name.endsWith('.dmg'));
            const linuxAsset = assets.find(a => a.name.endsWith('.AppImage'));
            const linuxDeb = assets.find(a => a.name.endsWith('.deb'));
            const fallback = `https://github.com/${GH_OWNER}/${GH_REPO}/releases/latest`;

            function fmtSize(bytes) { return (bytes / (1024 * 1024)).toFixed(1) + ' MB'; }

            // Windows
            if (winAsset) {
                $('dl-windows').href = winAsset.browser_download_url;
                $('dl-windows-info').textContent = `v${versionClean} · ${fmtSize(winAsset.size)}`;
            } else {
                $('dl-windows').href = fallback;
            }

            // macOS
            if (macAsset) {
                $('dl-macos').href = macAsset.browser_download_url;
                $('dl-macos-info').textContent = `v${versionClean} · ${fmtSize(macAsset.size)}`;
            } else {
                $('dl-macos').href = fallback;
            }

            // Linux (prefer AppImage, fallback to .deb)
            const linuxFinal = linuxAsset || linuxDeb;
            if (linuxFinal) {
                $('dl-linux').href = linuxFinal.browser_download_url;
                const ext = linuxFinal.name.endsWith('.deb') ? '.deb' : '.AppImage';
                $('dl-linux-info').textContent = `v${versionClean} · ${fmtSize(linuxFinal.size)} · ${ext}`;
            } else {
                $('dl-linux').href = fallback;
            }
        } else {
            $('sw-version').textContent = '—';
            $('sw-version-date').textContent = 'Nenhum release publicado';
            const fallback = `https://github.com/${GH_OWNER}/${GH_REPO}/releases`;
            ['dl-windows', 'dl-macos', 'dl-linux'].forEach(id => { $(id).href = fallback; });
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
