/**
 * test-states.js — Simulador de estados do dashboard SENDS160
 * 
 * Para usar: abra o DevTools (F12) no app e cole o conteúdo deste arquivo no console.
 * Ou carregue via: <script src="test-states.js"></script> temporariamente no index.html.
 * 
 * Vai ciclar por todos os estados: Azul → Verde → Âmbar → Vermelho (2 tipos) → Azul
 */

(function testDashboardStates() {
    const { listen } = window.__TAURI__.event;

    // Simula envio de evento automation-status
    function emitStatus(payload) {
        const event = { payload };
        // Dispara manualmente o handler
        window.dispatchEvent(new CustomEvent('test-automation-status', { detail: payload }));
        // Acessa diretamente o handler registrado
        document.dispatchEvent(new CustomEvent('automation-status-test', { detail: payload }));
    }

    // Helper: seta o circle e detail diretamente (mesma lógica do renderer.js)
    const $ = id => document.getElementById(id);

    function setCircle(state, detail, circleText) {
        const circle = $('status-circle');
        circle.className = 'status-circle ' + state;
        circle.innerHTML = '<span id="circle-timer" class="circle-timer"></span>';
        if (detail !== undefined) $('status-detail').textContent = detail;
        if (circleText) {
            const ct = $('circle-timer');
            if (ct) ct.textContent = circleText;
        }
    }

    function log(msg) {
        const el = $('log');
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = `<span class="time">[${time}]</span>${msg}`;
        el.prepend(line);
    }

    const states = [
        {
            name: '🔵 AZUL — Ativo e aguardando (countdown)',
            delay: 4000,
            apply: () => {
                setCircle('idle', 'Ativo e aguardando', '29:55');
                log('🧪 TESTE: Estado AZUL — idle com countdown');
            }
        },
        {
            name: '🟢 VERDE — Preenchendo formulário',
            delay: 4000,
            apply: () => {
                setCircle('running', 'Página Personal 1 do solicitante João Silva', 'Preenchendo');
                log('🧪 TESTE: Estado VERDE — preenchendo Personal 1');
            }
        },
        {
            name: '🟢 VERDE — Preenchendo outra página',
            delay: 3000,
            apply: () => {
                setCircle('running', 'Página Travel do solicitante João Silva', 'Preenchendo');
                log('🧪 TESTE: Estado VERDE — preenchendo Travel');
            }
        },
        {
            name: '🟡 ÂMBAR — Retentando após falha',
            delay: 4000,
            apply: () => {
                setCircle('warning', 'Página Travel do solicitante João Silva', 'Retentando');
                log('🧪 TESTE: Estado ÂMBAR — retentando Travel');
            }
        },
        {
            name: '🔴 VERMELHO — Erro de conexão',
            delay: 4000,
            apply: () => {
                setCircle('error', 'Sem conexão com a internet', 'Erro');
                log('🧪 TESTE: Estado VERMELHO — sem conexão');
            }
        },
        {
            name: '🔴 VERMELHO — Erro geral',
            delay: 4000,
            apply: () => {
                setCircle('error', 'Notificando suporte técnico', 'Erro');
                log('🧪 TESTE: Estado VERMELHO — erro geral');
            }
        },
        {
            name: '🔵 AZUL — Voltando ao normal',
            delay: 3000,
            apply: () => {
                setCircle('idle', 'Ativo e aguardando', '29:55');
                log('🧪 TESTE: Voltou ao estado AZUL — teste concluído ✅');
            }
        },
    ];

    console.log('%c🧪 SENDS160 — Teste de estados iniciado!', 'font-size:16px; color:#58a6ff; font-weight:bold');
    console.log('Cada estado será exibido por ~4 segundos...\n');

    let totalDelay = 0;
    states.forEach((state, i) => {
        setTimeout(() => {
            console.log(`%c${i + 1}/${states.length} ${state.name}`, 'color:#3fb950; font-weight:bold');
            state.apply();
        }, totalDelay);
        totalDelay += state.delay;
    });

    setTimeout(() => {
        console.log('%c🧪 Teste finalizado! Todos os estados foram demonstrados.', 'font-size:14px; color:#3fb950; font-weight:bold');
    }, totalDelay);
})();
