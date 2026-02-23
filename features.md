# DS-160 IA — Features & Argumentos de Venda

## 🎯 Para o Solicitante (Usuário Final)

### Preenchimento Inteligente
- **Normalização automática de caracteres** — converte acentos (ã→A, ç→C, é→E), letras minúsculas para maiúsculas e remove caracteres especiais em tempo real, evitando erros no formulário oficial
- **Valores padrão nas perguntas de segurança** — todas as 31 perguntas de segurança vêm pré-selecionadas como "Não", eliminando cliques repetitivos (editável se necessário)
- **Validação antes do envio** — impede submissão com campos obrigatórios vazios, destacando visualmente o campo com erro e navegando automaticamente até ele

### Salvamento e Continuidade
- **Auto-save silencioso** — dados são salvos automaticamente a cada troca de página, sem interrupção
- **Retomada inteligente** — ao voltar, o formulário abre exatamente na próxima seção a ser preenchida, com checks verdes nas seções já completas
- **Restauração completa** — todos os campos (textos, selects, radios, checkboxes, listas dinâmicas) são restaurados fielmente via snapshot
- **Múltiplos solicitantes por email** — um email funciona como "pasta do grupo", permitindo gerenciar várias aplicações (titular + dependentes) em um só lugar

### Interface Amigável
- **Design em accordion/sanfona** — formulário extenso organizado em seções colapsáveis, com visão clara do progresso
- **Checks verdes de progresso** — indicação visual de quais seções estão completas
- **Toggle de seções** — clique no título para abrir/fechar qualquer seção livremente
- **Botões padronizados** — texto em caixa alta, sem símbolos, layout consistente em toda a aplicação
- **Tradução completa para português** — todas as labels, botões e mensagens em PT-BR

---

## 👨‍💼 Para o Assessor (Profissional de Imigração)

### Dashboard de Gestão
- **Pipeline visual estilo Kanban** — visualize todos os processos organizados por status (Novo, Em Análise, Aprovado, etc.)
- **Visão por empresa/organização** — gerencie múltiplas empresas e seus solicitantes em um só painel
- **Detalhes do processo em modal** — visualize o formulário completo do solicitante sem sair do dashboard

### Revisão e Aprovação
- **Checks verdes automáticos** — ao abrir o formulário de um solicitante, o assessor vê imediatamente quais seções estão preenchidas e quais faltam
- **Formulário idêntico ao do solicitante** — o assessor visualiza e edita no mesmo formulário, garantindo consistência
- **Botão de aprovação com validação** — ao aprovar, o sistema valida que todos os campos obrigatórios estão preenchidos antes de gerar o JSON final
- **Notificação de aprovação** — ao aprovar, o dashboard é atualizado automaticamente

### Automação e Integração
- **Geração automática de JSON** — dados do formulário são convertidos automaticamente no formato aceito pelo DS-160 oficial
- **Extensão Chrome para preenchimento automático** — preenche o formulário oficial do DS-160 automaticamente a partir dos dados aprovados
- **Resolução de captcha integrada** — via CapMonster, resolve captchas do site oficial automaticamente
- **Mapeamento campo-a-campo** — todos os campos do formulário clone mapeiam exatamente para os campos do DS-160 oficial

---

## 🔒 Segurança e Infraestrutura

- **Supabase como backend** — banco de dados PostgreSQL com autenticação, RLS (Row Level Security) e APIs seguras
- **RPCs de segurança** — funções de banco SECURITY DEFINER garantem acesso controlado aos dados
- **Dados isolados por solicitante** — cada aplicação tem seus dados individuais, sem contaminação cruzada
- **Sem exposição de credenciais** — chaves de API e tokens são gerenciados de forma segura

---

## ⚡ Diferenciais Competitivos

| Feature | Formulário Oficial | DS-160 IA |
|---|---|---|
| Idioma | Inglês | Português |
| Auto-save | Não | Sim, a cada página |
| Normalização de caracteres | Não (erro se usar acento) | Automática em tempo real |
| Perguntas de segurança | 31 cliques manuais | Pré-selecionadas |
| Gestão de múltiplos processos | Não | Sim, por email/grupo |
| Dashboard para assessor | Não | Pipeline visual completo |
| Preenchimento automático | Não | Extensão Chrome dedicada |
| Validação antes do envio | Parcial | Completa com destaque visual |
| Retomada de onde parou | Limitada | Exata, com checks de progresso |

---

## 🏗️ Arquitetura — Os 8 Pilares

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA DO SISTEMA                      │
│                                                                  │
│   ① Dashboard ──→ ② Formulário ──→ ③ JSON ──→ ④ Banco          │
│        ↑                                          │              │
│        │              ⑧ Updates ◄──── ⑦ Análise  │              │
│        │                   │             ↑        ↓              │
│        └───────────────────┘        ⑥ Logs ◄── ⑤ Automação      │
└─────────────────────────────────────────────────────────────────┘
```

### ① Dashboard
> Portal de gestão — onde o assessor controla o fluxo de todos os processos.

| Item | Detalhe |
|---|---|
| **Arquivos** | `dashboard.html`, `dashboard.js` |
| **Entrada** | Dados do banco (applicants, applications, error_logs) |
| **Saída** | Ações do assessor (aprovar, reprovar, editar, reenviar) |
| **Função** | Pipeline visual Kanban, gerenciamento de fila, visualização de logs com screenshots |

### ② Formulário Clone
> Réplica em PT-BR do DS-160 oficial — onde o solicitante preenche seus dados.

| Item | Detalhe |
|---|---|
| **Arquivos** | `docs/ds160/index.html` (HTML + CSS + JS inline) |
| **Entrada** | Dados digitados pelo usuário, snapshot restaurado |
| **Saída** | Dados salvos via snapshot + JSON estruturado via `generateJSON()` |
| **Função** | Normalização de caracteres, validação, auto-save, branches condicionais, listas dinâmicas |

### ③ JSON (generateJSON)
> Função que transforma todos os inputs do formulário em um objeto JSON estruturado e limpo.

| Item | Detalhe |
|---|---|
| **Arquivo** | `docs/ds160/index.html` → função `generateJSON()` |
| **Entrada** | DOM do formulário (190+ campos) |
| **Saída** | JSON com ~15 seções: personal1, personal2, travel, travelCompanions, previousUSTravel, addressPhone, passport, usContact, family1, family2, deceasedSpouse, prevSpouse, workEducation1/2/3, security |
| **Função** | Ponte entre formulário visual e banco de dados / automação |

### ④ Banco de Dados (Supabase)
> Armazenamento persistente de todos os dados, logs e configurações.

| Item | Detalhe |
|---|---|
| **Plataforma** | Supabase (PostgreSQL + Auth + Storage + RLS) |
| **Tabelas principais** | `applicants` (dados), `applications` (fila), `error_logs` (erros), `automation_config`, `members` |
| **Storage** | Bucket `screenshots` para prints de erros |
| **Função** | Fonte de verdade para todos os pilares — o JSON gerado é salvo em `applicants.data` |

### ⑤ Automação (Playwright)
> Software desktop que lê o JSON do banco e preenche o DS-160 oficial automaticamente.

| Item | Detalhe |
|---|---|
| **Arquivos** | `filler.js` (engine), `field-map.js` (mapeamento), `queue.js` (fila) |
| **Pipeline** | `applicants.data` → `normalizeProfile()` → `buildDynamicFieldMap()` → `fillPageCompletely()` |
| **Captcha** | CapMonster / AI Vision |
| **Função** | Preenche 100% dos campos do DS-160 oficial, incluindo postbacks, radios condicionais e multipages |

### ⑥ Geração de Logs
> Registro detalhado de cada erro que ocorre durante a automação.

| Item | Detalhe |
|---|---|
| **Arquivo** | `queue.js` → `_logError()` |
| **O que captura** | error_message, error_stack, page_name, field_name, error_cause (8 sub-causas), screenshot_url, validation_errors[], retry_number |
| **Tipos de causa** | `browser_closed`, `network_error`, `captcha_failed`, `validation_error`, `timeout`, `postback_stuck`, `field_error`, `field_error:select`, `field_error:missing`, `page_stuck` |
| **Função** | Diagnóstico preciso — qual página, qual campo, qual tipo de erro, com prova visual |

### ⑦ Análise de Logs e Resolução
> Processo de analisar os logs para identificar se o erro é bug do software, dado ausente do solicitante, ou mudança no DS-160 oficial.

| Cenário | Diagnóstico | Ação |
|---|---|---|
| `validation_error` + screenshot mostra campo vermelho | Dado ausente ou inválido no JSON | Corrigir `normalizeProfile` ou pedir dado ao solicitante |
| `field_error:select` + "no option matching" | DS-160 oficial mudou as opções do dropdown | Atualizar values no `field-map.js` |
| `field_error:missing` + campo não encontrado na página | DS-160 mudou ID do campo | Atualizar regex no `field-map.js` |
| `postback_stuck` | DS-160 adicionou novo postback trigger | Adicionar ID ao `POSTBACK_SELECT_IDS` ou `POSTBACK_CLICK_YES_IDS` |
| `captcha_failed` | CapMonster com saldo zerado ou mudança de captcha | Verificar saldo ou alternar para AI Vision |
| `page_stuck` após 3 retries | Erro estrutural — página nova ou fluxo diferente | Investigar via screenshot e atualizar `identifyPage()` |

### ⑧ Updates do Software
> Ciclo de melhoria contínua baseado nos logs e análises.

| Tipo de Update | Arquivo Afetado | Frequência |
|---|---|---|
| **Campo novo/removido no DS-160** | `field-map.js` + `normalizeProfile` | Quando detectado via logs |
| **Novo formato de dados** | `generateJSON()` + `normalizeProfile` | Quando formulário clone muda |
| **Postback novo** | `field-map.js` (POSTBACK arrays) | Quando `postback_stuck` aparece |
| **Página nova no DS-160** | `filler.js` → `identifyPage()` | Raro — muda ~1x/ano |
| **Melhoria de UX** | `dashboard.html/js` | Contínuo |
| **Novas sub-causas de erro** | `filler.js` error handler | Conforme padrões emergem |

---

## 🔄 Fluxo Completo de Dados

```
Solicitante preenche ──→ generateJSON() ──→ Supabase (applicants.data)
                                                    │
Assessor aprova ────────────────────────────────────┘
                                                    │
Queue pega da fila ──→ normalizeProfile() ──→ buildDynamicFieldMap()
                                                    │
                        fillPageCompletely() ◄──────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                ✅ Sucesso          ❌ Erro
                    │                   │
            _markDone()         screenshot()
            fill_status=        upload Storage
            'filled'            _logError()
                                _updateRetry()
                                    │
                            ┌───────┴───────┐
                            │               │
                        retry < 3      retry >= 3
                            │               │
                        backoff         _markNeedsAttention()
                        e retenta       fill_status=
                                        'needs_attention'
                                            │
                                    Dashboard exibe
                                    com screenshot
                                    e validation errors
```
