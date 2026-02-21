# Plano: Sistema Inteligente de Auto-Update + Error Reporting

## Problema
Precisamos verificar atualizações em momentos estratégicos sem fazer chamadas excessivas ao GitHub, e garantir que erros de preenchimento sejam reportados para os devs poderem corrigir e liberar updates rapidamente.

## Quando verificar updates (4 gatilhos)

| # | Gatilho | Por quê |
|---|---------|---------|
| 1 | **Ao fazer login** | Garantir que começa com a versão mais recente |
| 2 | **Ao clicar "Verificar fila"** | Antes de processar novos itens |
| 3 | **Antes de iniciar cada preenchimento** | Pode ter saído fix entre um item e outro |
| 4 | **Após um erro de preenchimento** | Pode já existir fix disponível |

## Proteção contra chamadas excessivas

**Cooldown de 5 minutos** — se já verificou nos últimos 5 minutos, ignora silenciosamente.

```
lastCheckTime = 0
COOLDOWN = 5 * 60 * 1000  // 5 minutos

function smartCheckForUpdates() {
    if (Date.now() - lastCheckTime < COOLDOWN) return  // skip
    lastCheckTime = Date.now()
    autoUpdater.checkForUpdatesAndNotify()
}
```

Isso significa que mesmo que todos os 4 gatilhos disparem em sequência, só faz 1 chamada real ao GitHub.

## Fluxo de erro → fix → update

```
Erro no preenchimento
    ↓
1. Salva erro no Supabase (error_logs) ← JÁ IMPLEMENTADO
2. Marca aplicação como "error" ← JÁ IMPLEMENTADO
3. Verifica se tem update disponível (com cooldown)
4. Se tem update → baixa → instala ao fechar
5. Dev vê o erro no error_logs → corrige → npm run release
6. Próximo ciclo do software → detecta v1.0.1 → atualiza
7. Aplicação com erro pode ser reenviada para fila (botão 🔄 Refazer no dashboard)
```

## Arquivos a modificar

### 1. `main.js` — Smart update checker
- Extrair `smartCheckForUpdates()` com cooldown de 5min
- Expor via `global.smartCheckForUpdates`
- Chamar no login

### 2. `queue.js` — Chamar nos 3 pontos do ciclo
- Antes de `_claimNext()` (gatilho 3)
- Após erro no catch (gatilho 4)  
- No `triggerNow()` (gatilho 2)
- Remover o check genérico atual (já coberto pelos pontos acima)

### 3. Nenhuma mudança necessária no renderer
- As notificações de update já funcionam via IPC

## Dados que o error_log já salva (para diagnóstico)

| Campo | Exemplo |
|-------|---------|
| `error_message` | "Cannot read properties of undefined (reading 'day')" |
| `error_stack` | Stack trace completo |
| `page_name` | "Personal 1" |
| `applicant_name` | "João Silva" |
| `worker_id` | "worker_123_abc" |

Isso já permite identificar exatamente onde travou e corrigir.

## Estimativa: ~20 linhas de código alteradas
