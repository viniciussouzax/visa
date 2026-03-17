---
name: Automation Queue
description: Guia do sistema de fila de automação DS-160 — runner, retries, error handling, hot-reload modular e ciclo de vida de uma aplicação.
---

# 🔄 Automation Queue — Runner DS-160

## Missão
Documentar o sistema de fila que processa aplicações DS-160 automaticamente: como o runner opera, gerencia retries, loga erros e interage com o Supabase.

## Arquivos Sob Responsabilidade

| Arquivo | Função |
|---------|--------|
| `automation/queue.js` | Runner: loop, claim, retry, status updates |
| `automation/filler.js` | Engine de preenchimento (chamado pelo queue) |
| `automation/normalize-profile.js` | Aggregator de 20 normalizers modulares |
| `automation/field-maps/index.js` | Router por tipo de visto (B/F/J/O) |
| `automation/captcha.js` | Resolução de captcha via API externa |
| `automation/error-catalog.js` | Catálogo de erros com classificação e auto-fix |
| `pages/_shared/visa-configs.js` | Resolução dinâmica de páginas por visto/idade |

## Hot-Reload Modular

O `queue.js` limpa o cache de TODOS os módulos (automation/ + pages/) antes de cada fill:
```javascript
function getFiller() {
    // Limpa cache: automation/ + pages/
    Object.keys(require.cache).forEach(k => {
        if (k.startsWith(automationDir) || k.startsWith(pagesDir)) delete require.cache[k];
    });
    return require('./filler');
}
```
Isso permite corrigir field-maps e normalizers **sem reiniciar o runner**.

## Ciclo de Vida

```
1. CLAIM     → queue.js busca applicant com stage='ds160', status='todo'
2. LOCK      → Marca status 'doing' via RPC claim_application
3. FILL      → filler.js → normalize-profile → field-maps/router → fillPage
4. VERIFY    → Verifica se página de confirmação foi alcançada
5. SUCCESS   → Atualiza 'filled' + salva confirmation number
6. FAIL      → Loga erro + incrementa retry_count
7. RETRY     → Se retry < 5, aguarda backoff e retenta
8. ABANDON   → Se retry >= 5, marca 'system_error' ou re-queue
```

## Vistos Suportados

| Visto | Field-map extra | Normalize extra |
|-------|----------------|-----------------|
| B1/B2 | — | — |
| F1/F2 | student-exchange (+7 entries) | studentExchange |
| J1/J2 | student-exchange (+7 entries) | studentExchange |
| O1/O2/O3 | petition-info (+4 entries) | petitionInfo |

## Regras Críticas

1. **Nunca processar 2 aplicações simultaneamente** — 1 browser, 1 fill por vez
2. **Sempre logar erro ANTES de retry** — nunca perder informação
3. **Screenshot em TODA falha** — evidência visual é essencial
4. **Respeitar rate limits do CEAC** — delays entre ações (~500ms-2s)
5. **Hot-reload ativo** — corrigir e salvar, runner pega automaticamente
