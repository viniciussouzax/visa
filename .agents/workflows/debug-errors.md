---
description: Debug de erros da automação DS-160 usando logs, screenshots e HTML da página
---
// turbo-all

# Debug de Erros da Automação DS-160

Quando a automação falhar, siga este workflow para diagnosticar e corrigir o erro rapidamente.

## 1. Buscar os logs de erro não arquivados

```sql
SELECT id, error_message, error_cause, page_name, field_name, 
       screenshot_url, validation_errors, page_html,
       retry_number, created_at
FROM error_logs 
WHERE archived = false
ORDER BY created_at DESC 
LIMIT 5;
```

Execute via `mcp_supabase-mcp-server_execute_sql` com `project_id: zcpvknzktfmotvrybxdf`.

## 2. Analisar cada erro usando os 3 artefatos

Para cada erro, temos 3 fontes de informação:

### a) Log de erro (`error_message` + `validation_errors`)
- **error_message**: Erro técnico (timeout, seletor não encontrado, etc.)
- **validation_errors**: Array de mensagens de validação do próprio DS-160
- **page_name**: Identifica em qual página do formulário o erro ocorreu
- **field_name**: Campo específico que falhou (quando disponível)
- **error_cause**: Classificação (validation_error, session_expired, unknown)

### b) Screenshot da página (`screenshot_url`)
- Abrir via `browser_subagent` para ver o estado visual da página
- Verificar: mensagens de erro vermelhas, campos destacados, modais abertos, estado dos dropdowns
- Comparar visualmente com o que o código espera encontrar

### c) HTML da página (`page_html`)
- Contém a estrutura completa da página no momento do erro
- Procurar por:
  - IDs dos campos visíveis: `grep` por `id=` para encontrar seletores corretos
  - Elementos de validação: `ValidationSummary`, `has-error`, classes de erro
  - Modais ou overlays bloqueantes: `.modalBackground`, `modalConfirm`
  - Estado de radio buttons e checkboxes: `checked`, `selected`
  - Dropdowns e suas opções: `<select>` com `<option>`
  - Campos condicionais que apareceram/desapareceram

## 3. Diagnóstico cruzado

Compare as 3 fontes para identificar a causa raiz:

| Situação | Log diz | Screenshot mostra | HTML revela | Ação |
|----------|---------|-------------------|-------------|------|
| Seletor errado | Timeout no locator | Campo existe na página | ID diferente do esperado | Corrigir regex no field-map |
| Campo condicional | Campo não visível | Página sem o campo | Panel collapsed/hidden | Adicionar trigger de postback |
| Dado inválido | Validation error | Erro vermelho no campo | Valor preenchido incorreto | Corrigir normalizeProfile |
| Modal bloqueante | Click timeout | Modal sobre a página | `.modalBackground` visible | Adicionar handler de modal |
| Sessão expirada | SessionTimedOut na URL | Página de timeout | Redirect para TimedOut.aspx | Adicionar retry com reload |
| Captcha errado | Ficou na Landing | Erro "code doesn't match" | ValidationSummary visível | Já tem retry, verificar solver |

## 4. Verificar alinhamento código ↔ formulário

Após identificar o problema, verificar:

1. **field-map.js**: O pattern regex corresponde ao ID real no HTML?
   ```
   grep_search no page_html pelo nome do campo → comparar com regex do field-map
   ```

2. **normalizeProfile (filler.js)**: O dado normalizado está correto?
   ```
   Verificar dados do applicant no Supabase:
   SELECT data FROM applicants WHERE id = '<applicant_id>';
   ```

3. **Dados do applicant vs dados esperados pelo DS-160**:
   - O formulário espera certos formatos (datas, códigos de país, etc.)
   - Comparar o valor no JSON com as opções do `<select>` no HTML

## 5. Aplicar correção e testar

1. Editar o arquivo relevante (`field-map.js`, `filler.js`, `queue.js`)
2. Resetar o applicant para retry:
   ```sql
   UPDATE error_logs SET archived = true WHERE archived = false;
   UPDATE applications 
   SET fill_status = 'queued', fill_queued_at = now(), fill_error = NULL, 
       fill_worker_id = NULL, fill_started_at = NULL, retry_count = 0
   WHERE applicant_id = '<APPLICANT_ID>';
   ```
3. Reiniciar o app: `npm start` no diretório `ds160-filler`
4. Monitorar logs do terminal e verificar se passa da página problemática

## 6. Arquivar logs resolvidos

Após confirmar que o erro foi resolvido:
```sql
UPDATE error_logs SET archived = true WHERE id IN ('<ids dos logs resolvidos>');
```

## Referência rápida de arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `automation/filler.js` | Lógica de preenchimento, normalizeProfile, navegação entre páginas |
| `automation/field-map.js` | Mapeamento campo DS-160 → valor do applicant (regex patterns) |
| `automation/queue.js` | Fila de processamento, captura de erros, screenshots, page_html |
| `automation/captcha.js` | Resolução de captcha via CapMonster/AI Vision |
| `main.js` | Entry point do Electron, carrega queue.js |

## Supabase

- **Project ID**: `zcpvknzktfmotvrybxdf`
- **Tabela de erros**: `error_logs` (campos: error_message, screenshot_url, page_html, validation_errors, archived)
- **Tabela de applicants**: `applicants` (campo `data` contém o JSON completo)
- **Tabela de apps**: `applications` (fill_status, retry_count)
- **Storage**: bucket `screenshots`, pasta `errors/`
