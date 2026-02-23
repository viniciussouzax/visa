/**
 * Transform DS-160 form to accordion layout.
 * SAFE approach: Keep ALL existing HTML structure and JS intact.
 * Only change: CSS (head), wrap body content in accordion container,
 * add accordion headers BEFORE each page div, and append accordion JS at end.
 */
const fs = require('fs');
const src = fs.readFileSync('docs/ds160/index.html', 'utf8');

// Section definitions mapping page IDs to accordion sections
const SECTIONS = [
    { label: 'Início', pages: ['pg-Start'], time: '2 min' },
    { label: 'Dados Pessoais', pages: ['pg-Personal1'], time: '5 min' },
    { label: 'Informações Pessoais Adicionais', pages: ['pg-Personal2'], time: '4 min' },
    { label: 'Informações de Viagem', pages: ['pg-Travel'], time: '5 min' },
    { label: 'Acompanhantes de Viagem', pages: ['pg-TravelCompanions'], time: '3 min' },
    { label: 'Viagens Anteriores aos EUA', pages: ['pg-PreviousUSTravel'], time: '4 min' },
    { label: 'Endereço e Contato', pages: ['pg-AddressPhone'], time: '5 min' },
    { label: 'Informações do Passaporte', pages: ['pg-Passport'], time: '4 min' },
    { label: 'Contato nos EUA', pages: ['pg-USContact'], time: '3 min' },
    { label: 'Família e Parentes', pages: ['pg-Family1', 'pg-Family2', 'pg-DeceasedSpouse', 'pg-PrevSpouse'], time: '6 min' },
    { label: 'Trabalho e Educação', pages: ['pg-WorkEducation1', 'pg-WorkEducation2', 'pg-WorkEducation3'], time: '8 min' },
    { label: 'Antecedentes e Segurança', pages: ['pg-Security1', 'pg-Security2', 'pg-Security3', 'pg-Security4', 'pg-Security5'], time: '5 min' },
];

// Build page-to-section mapping
const pageToSection = {};
SECTIONS.forEach((sec, i) => {
    sec.pages.forEach(p => { pageToSection[p] = i; });
});

// === STEP 1: Replace <head> content (CSS) ===
// Find the old <style>...</style> and replace
const newCSS = `    <script src="https://cdn.tailwindcss.com"><\/script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    borderRadius: { DEFAULT: '5px' },
                }
            }
        }
    <\/script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', system-ui, sans-serif; }
        
        /* Accordion */
        .acc-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 5px; margin-bottom: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
        .acc-header { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: none; border: none; cursor: pointer; text-align: left; transition: background .2s; }
        .acc-header:hover { background: #f8fafc; }
        .acc-chevron { width: 16px; height: 16px; transition: transform .3s; color: #94a3b8; flex-shrink: 0; }
        .acc-chevron.open { transform: rotate(90deg); }
        .acc-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 5px; font-weight: 500; }
        .acc-badge.done { background: #dbeafe; color: #1d4ed8; }
        .acc-badge.pending { background: #f1f5f9; color: #94a3b8; }
        .acc-body { display: none; padding: 0 16px 16px; }
        .acc-body.open { display: block; }
        
        /* Keep original page styles working but override display */
        .page { display: none !important; }
        .page.active { display: block !important; }
        
        /* Form fields - clean design */
        .fg { display: flex; flex-direction: column; margin-bottom: 12px; gap: 4px; }
        .fg label { font-size: 13px; font-weight: 500; color: #374151; }
        .fg input, .fg select, .fg textarea {
            width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 5px;
            font-size: 14px; background: #fff; color: #111827; outline: none; transition: border-color .2s;
        }
        .fg input:focus, .fg select:focus, .fg textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
        .fg input[type="radio"], .fg input[type="checkbox"] { width: auto; }
        .fg.has-error input, .fg.has-error select { border-color: #ef4444; }
        .validation-msg { color: #ef4444; font-size: 11px; margin-top: 2px; }
        
        .radio-group { display: flex; gap: 16px; flex-wrap: wrap; }
        .radio-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 400; }
        
        .section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; padding: 16px; margin-bottom: 12px; }
        .section h3 { font-size: 13px; font-weight: 600; color: #1d4ed8; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
        
        .br { display: none; margin-top: 8px; padding-left: 12px; border-left: 3px solid #dbeafe; }
        .br.open { display: block; }
        
        .entry { background: #f0f4f8; border-radius: 5px; padding: 12px; margin-bottom: 8px; position: relative; }
        .entry .remove-btn { position: absolute; top: 8px; right: 8px; background: #fee2e2; color: #ef4444; border: none; border-radius: 5px; padding: 4px 8px; cursor: pointer; font-size: 11px; }
        
        .na-check { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
        .na-check label { font-size: 12px; color: #6b7280; }
        .section-disabled { opacity: .5; pointer-events: none; }
        
        .page h2 { color: #1e40af; font-size: 16px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #1e40af; }
        
        /* Navigation buttons */
        .page-btns { display: flex; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s; }
        .btn-next { background: #3b82f6; color: #fff; flex: 1; }
        .btn-next:hover { background: #2563eb; }
        .btn-prev { background: #fff; color: #374151; border: 1px solid #d1d5db; }
        .btn-prev:hover { background: #f9fafb; }
        .btn-gen { background: #059669; color: #fff; }
        .btn-gen:hover { background: #047857; }
        
        .validation-toast {
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
            background: #1f2937; color: #fff; padding: 12px 24px; border-radius: 5px;
            font-size: 14px; z-index: 1000; animation: toastIn .3s ease;
        }
        @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
        
        /* Hide old header and nav */
        body > header, body > nav { display: none !important; }
        
        /* Override page max-width for accordion context */
        .page { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
    </style>`;

let result = src;

// Replace everything between <style> and </style> (inclusive of tags)  
result = result.replace(/<style>[\s\S]*?<\/style>/, newCSS);

// === STEP 2: Add new header + progress bar + accordion wrapping ===
// Insert AFTER <body> tag
const headerHTML = `
    <!-- Accordion Header -->
    <div id="acc-wrapper">
        <header class="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
            <div class="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <span class="text-2xl">🇺🇸</span>
                <div>
                    <h1 class="text-base font-bold text-slate-800">DS-160 Formulário de Visto Online</h1>
                    <p class="text-xs text-slate-400">Preencha todas as informações solicitadas</p>
                </div>
            </div>
        </header>
        <div class="max-w-2xl mx-auto px-4 pt-4 pb-2">
            <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-semibold text-slate-600" id="progress-label">Progresso: 0%</span>
                <span class="text-xs text-slate-400" id="progress-steps">0 de ${SECTIONS.length} seções</span>
            </div>
            <div class="w-full h-2 bg-slate-200 rounded-[5px] overflow-hidden">
                <div class="h-full bg-blue-500 rounded-[5px] transition-all duration-500" id="progress-bar" style="width:0%"></div>
            </div>
        </div>
        <div class="max-w-2xl mx-auto px-4 pb-8" id="acc-container"></div>
    </div>`;

result = result.replace('<body>', '<body class="bg-slate-50 min-h-screen">' + headerHTML);

// === STEP 3: Add accordion JS BEFORE </body> ===
const accordionJS = `
    <script>
    // ===== ACCORDION SYSTEM =====
    (function() {
        const SECTIONS = ${JSON.stringify(SECTIONS)};
        const container = document.getElementById('acc-container');
        const completedSections = new Set();
        let currentSectionIdx = 0;

        // Map pageId -> sectionIdx
        const pageToSection = {};
        SECTIONS.forEach((sec, i) => sec.pages.forEach(p => { pageToSection[p] = i; }));

        // Build accordion items, each wrapping the original page divs
        SECTIONS.forEach((sec, idx) => {
            const item = document.createElement('div');
            item.className = 'acc-item';
            item.dataset.section = idx;

            // Header
            const header = document.createElement('button');
            header.type = 'button';
            header.className = 'acc-header';
            header.innerHTML = \`
                <div style="display:flex;align-items:center;gap:10px">
                    <svg class="acc-chevron \${idx===0?'open':''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <span style="font-size:14px;font-weight:600;color:#334155">Seção \${idx+1}: \${sec.label}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="acc-badge pending" data-badge="\${idx}">⏱ \${sec.time}</span>
                </div>
            \`;
            header.onclick = () => toggleAccordion(idx);
            item.appendChild(header);

            // Body
            const body = document.createElement('div');
            body.className = 'acc-body' + (idx === 0 ? ' open' : '');
            body.dataset.body = idx;

            // Info bar
            const info = document.createElement('div');
            info.style.cssText = 'background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center';
            info.innerHTML = \`<span style="font-size:13px;font-weight:600;color:#334155">\${sec.label}</span><span style="font-size:11px;color:#94a3b8">⏱ Tempo estimado: \${sec.time}</span>\`;
            body.appendChild(info);

            // Move original page divs into the accordion body
            sec.pages.forEach(pageId => {
                const pageDiv = document.getElementById(pageId);
                if (pageDiv) {
                    body.appendChild(pageDiv);
                }
            });

            item.appendChild(body);
            container.appendChild(item);
        });

        // Move JSON modal and anything after pages into acc-wrapper too
        const jsonModal = document.getElementById('jsonModal');
        if (jsonModal) {
            document.getElementById('acc-wrapper').appendChild(jsonModal);
        }

        function toggleAccordion(idx) {
            const items = container.querySelectorAll('.acc-item');
            items.forEach((item, i) => {
                const body = item.querySelector('.acc-body');
                const chevron = item.querySelector('.acc-chevron');
                if (i === idx) {
                    const isOpen = body.classList.contains('open');
                    body.classList.toggle('open');
                    chevron.classList.toggle('open');
                } else {
                    body.classList.remove('open');
                    chevron.classList.remove('open');
                }
            });
            currentSectionIdx = idx;

            // Show first page of this section
            const sec = SECTIONS[idx];
            if (sec && sec.pages.length > 0) {
                // Find the page index in the original PAGES array and show it
                const pageNames = typeof _PAGES_NAMES !== 'undefined' ? _PAGES_NAMES : [];
                const firstPageId = sec.pages[0].replace('pg-', '');
                const pageIdx = pageNames.indexOf(firstPageId);
                if (pageIdx >= 0 && typeof _origShowPage === 'function') {
                    _origShowPage(pageIdx);
                }
            }
        }

        function markComplete(idx) {
            completedSections.add(idx);
            const badge = document.querySelector(\`[data-badge="\${idx}"]\`);
            if (badge) {
                badge.className = 'acc-badge done';
                badge.textContent = '✓ concluído';
            }
            updateProgress();
        }

        function updateProgress() {
            const total = SECTIONS.length;
            const done = completedSections.size;
            const pct = Math.round((done / total) * 100);
            const bar = document.getElementById('progress-bar');
            const label = document.getElementById('progress-label');
            const steps = document.getElementById('progress-steps');
            if (bar) bar.style.width = pct + '%';
            if (label) label.textContent = 'Progresso: ' + pct + '% Concluído';
            if (steps) steps.textContent = done + ' de ' + total + ' seções';
        }

        // === INTERCEPT original navigation ===
        // Save original showPage reference
        if (typeof showPage === 'function') {
            window._origShowPage = showPage;
        }
        // Save PAGES names
        if (typeof PAGES !== 'undefined' && Array.isArray(PAGES)) {
            window._PAGES_NAMES = [...PAGES];
        }

        // Override showPage to also open the correct accordion
        const origShowPage = window._origShowPage;
        window.showPage = function(i) {
            // Call original
            if (origShowPage) origShowPage(i);
            // Find which section this page belongs to
            if (window._PAGES_NAMES && window._PAGES_NAMES[i]) {
                const pageId = 'pg-' + window._PAGES_NAMES[i];
                const secIdx = pageToSection[pageId];
                if (secIdx !== undefined && secIdx !== currentSectionIdx) {
                    toggleAccordion(secIdx);
                }
            }
        };

        // Override nextPage to mark section complete when moving to next section
        const origNextPage = window.nextPage;
        window.nextPage = function() {
            const prevSection = currentSectionIdx;
            if (origNextPage) origNextPage();
            // Check if we moved to a different section
            // Find current page's section
            if (window._PAGES_NAMES) {
                const activePage = document.querySelector('.page.active');
                if (activePage) {
                    const secIdx = pageToSection[activePage.id];
                    if (secIdx !== undefined && secIdx !== prevSection) {
                        markComplete(prevSection);
                        toggleAccordion(secIdx);
                        document.querySelector(\`[data-section="\${secIdx}"]\`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
        };

        // Override prevPage similarly
        const origPrevPage = window.prevPage;
        window.prevPage = function() {
            if (origPrevPage) origPrevPage();
            const activePage = document.querySelector('.page.active');
            if (activePage) {
                const secIdx = pageToSection[activePage.id];
                if (secIdx !== undefined && secIdx !== currentSectionIdx) {
                    toggleAccordion(secIdx);
                    document.querySelector(\`[data-section="\${secIdx}"]\`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };

        // Show first section
        toggleAccordion(0);
    })();
    <\/script>`;

result = result.replace('</body>', accordionJS + '\n</body>');

fs.writeFileSync('docs/ds160/index.html', result, 'utf8');
console.log('Done! Size:', result.length, 'bytes');
console.log('Lines:', result.split('\n').length);
