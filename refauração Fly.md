# Refauração Fly

## Como Entender Este Documento

Este documento organiza a auditoria completa da automacao DS-160 com foco em fazer a execucao funcionar com mais previsibilidade no Fly.io.

Leitura recomendada:

1. Leia o [Resumo Executivo](#resumo-executivo) para entender a causa mais provavel.
2. Veja a [Leitura dos Logs Reais](#leitura-dos-logs-reais) para entender o que os eventos do Fly mostram.
3. Passe pelos [Achados Principais](#achados-principais) para ver o diagnostico consolidado.
4. Use o [Checklist de Producao](#checklist-de-producao) como referencia do que precisa existir antes do go-live.
5. Consulte a [Matriz Impacto x Esforco](#matriz-impacto-x-esforco) para priorizacao.
6. Siga o [Plano de Execucao](#plano-de-execucao) para organizar o trabalho em 1 dia, 3 dias e 1 semana.
7. Use [Exemplos Conceituais de Codigo](#exemplos-conceituais-de-codigo), [Pseudo-Diff Conceitual do filler.js](#pseudo-diff-conceitual-do-fillerjs) e [Arquivo por Arquivo](#arquivo-por-arquivo) quando for transformar isso em implementacao.
8. No fim, converta o [Backlog Tecnico](#backlog-tecnico) em tarefas reais.

## Indice

- [Resumo Executivo](#resumo-executivo)
- [Contexto do Problema](#contexto-do-problema)
- [Leitura dos Logs Reais](#leitura-dos-logs-reais)
- [Achados Principais](#achados-principais)
- [Ambiente Real no Fly](#ambiente-real-no-fly)
- [Hipotese Mais Provavel](#hipotese-mais-provavel)
- [Checklist de Producao](#checklist-de-producao)
- [Matriz Impacto x Esforco](#matriz-impacto-x-esforco)
- [Plano de Execucao](#plano-de-execucao)
- [Arquitetura Recomendada](#arquitetura-recomendada)
- [Exemplos Conceituais de Codigo](#exemplos-conceituais-de-codigo)
- [Pseudo-Diff Conceitual do filler.js](#pseudo-diff-conceitual-do-fillerjs)
- [Arquivo por Arquivo](#arquivo-por-arquivo)
- [Backlog Tecnico](#backlog-tecnico)
- [Arquivos Mais Importantes](#arquivos-mais-importantes)
- [Criterios de Aceite para Go-Live](#criterios-de-aceite-para-go-live)
- [Apice: O Que Este Documento Nao Tenta Fazer](#apice-o-que-este-documento-nao-tenta-fazer)

## Resumo Executivo

O principal bloqueio no Fly.io nao parece ser um erro simples de captcha ou de seletor. Pelos logs e HTMLs salvos, a automacao frequentemente deixa de operar sobre a pagina real do DS-160 e passa a operar sobre uma resposta de challenge `TSPD`.

Hoje o risco principal e a combinacao de:

- ambiente containerizado do Fly
- identidade de navegador incoerente com o runtime real
- deteccao incompleta de challenge
- reutilizacao de sessao contaminada em retries
- fluxo de landing e recovery sem validacao forte de estado

O foco correto para estabilizar producao no Fly e:

- coerencia de identidade
- deteccao forte de estado da pagina
- higiene de sessao
- logs confiaveis
- smoke tests reais no mesmo runtime de producao

## Contexto do Problema

O ponto de falha observado acontece principalmente em dois fluxos:

- criacao de uma nova aplicacao ao clicar em `Start New Application`
- recuperacao de uma aplicacao existente

No computador local, o fluxo manual passa no navegador normal. No Fly, a automacao avancou mais depois da simulacao de comportamento humano, mas ainda falha de forma intermitente no landing ou em recovery.

O contexto adicional importante e:

- o proxy usado em producao e residencial
- o ambiente real de runtime no Fly e diferente do desktop local
- o projeto ja tem varios scripts de teste, mas nem todos refletem exatamente o runtime do worker real

## Leitura dos Logs Reais

Com base nos logs reais fornecidos, a sequencia operacional observada no Fly foi aproximadamente esta:

1. o worker sobe normalmente
2. o applicant e claimado
3. o browser abre com proxy ativo
4. o landing do DS-160 chega a abrir
5. a location e selecionada com sucesso
6. a pagina recarrega apos o postback
7. o captcha legitimo nao aparece em algumas tentativas
8. o sistema registra timeout esperando captcha
9. o HTML salvo mostra markers de `TSPD`
10. o retry reaproveita browser/pagina em alguns casos
11. a tentativa seguinte encontra DOM inconsistente e falha em `ddlLocation`

### O que isso indica

Isso muda bastante a leitura do problema:

- o sintoma superficial parece ser `captcha_failed`
- o erro estrutural parece ser `challenge_detected` ou `landing_dom_mismatch`

Em outras palavras:

- a automacao nem sempre esta falhando porque "nao conseguiu resolver captcha"
- varias falhas acontecem porque a pagina deixou de ser a landing valida do DS-160

### Sinal mais importante dos HTMLs salvos

Nos registros de erro aparecem respostas com:

- `/TSPD/?type=18`
- `/TSPD/?type=20`
- scripts JS de challenge no `head` e no `body`

Quando isso ocorre, o worker ja nao esta mais operando no fluxo real esperado.

### Conclusao da leitura dos logs

Os logs apontam mais para problema de classificacao de estado e higiene de sessao do que para problema puro de captcha.

## Achados Principais

### 1. O HTML salvo em varias falhas nao e o DS-160 real

Os logs mostram respostas com markers de `TSPD`, como:

- `/TSPD/?type=18`
- `/TSPD/?type=20`
- scripts inline de challenge

Isso significa que a automacao muitas vezes esta tentando interagir com uma pagina de challenge, nao com a pagina real do formulario.

### 2. O runtime real no Fly e Chrome em Linux/Xvfb

O worker roda:

- imagem base Playwright em Linux
- Google Chrome Stable instalado no container
- Patchright instalado no container
- `HEADLESS=false` com `DISPLAY=:99`

Logo, no Fly o navegador real e Chrome em ambiente Linux virtualizado.

### 3. A identidade anunciada pode nao bater com o navegador real

O `filler.js` sorteia identidades que podem anunciar Firefox ou Edge, mas o launch real usa Chrome. Isso cria incoerencia entre:

- user agent
- browser real
- objetos JS do navegador
- headers
- fingerprint geral da sessao

### 4. O fluxo de landing esta parcialmente correto, mas sem validacao suficiente

O mapeamento de landing parece correto para:

- `ddlLocation`
- captcha BotDetect
- `lnkNew`
- `lnkRetrieve`

O problema nao parece ser apenas seletor errado. O problema e o fluxo continuar mesmo quando a pagina deixa de ser valida.

### 5. Captcha e challenge estao misturados na classificacao de erro

Em varios casos, a automacao registra `captcha_failed`, mas o problema real e que a pagina foi trocada por challenge ou entrou em estado invalido.

### 6. Retries podem reutilizar browser e pagina em estado ruim

Os logs mostram reaproveitamento de browser/pagina depois de falha. Se a tentativa anterior ja caiu em challenge, a reutilizacao tende a contaminar o retry.

### 7. Recovery tem mais de um estado legitimo e precisa ser tratado como fluxo proprio

O site oficial mostra variantes reais como:

- App ID + captcha
- surname + year + security question
- fluxo para aplicacao submetida

Isso exige maquina de estados mais explicita.

### 8. O warm-up humano ajudou, mas nao resolveu a causa principal

O fato de o fluxo ter avançado melhor depois das simulacoes humanas sugere que o comportamento inicial importa, mas os logs ainda mostram challenge e DOM inconsistente. Ou seja:

- houve melhora operacional
- mas o problema de base continua estrutural

### 9. O proxy residencial nao explica tudo sozinho

Mesmo com proxy residencial sticky, o Fly ainda recebe challenge. Isso sugere que o problema e a combinacao de:

- ambiente
- identidade
- fluxo
- transicoes de pagina

e nao apenas o tipo de IP.

### 10. Falta uma taxonomia forte de erro para a automacao em producao

Hoje os tipos de falha operacionais mais importantes deveriam incluir:

- `challenge_detected`
- `landing_dom_mismatch`
- `recovery_dom_mismatch`
- `captcha_failed`
- `session_expired`
- `network_error`
- `timeout`

Sem isso, o time corrige sintomas em vez de corrigir causa.

## Ambiente Real no Fly

Com base nos arquivos atuais do projeto, o ambiente real do worker no Fly e:

- `automation/Dockerfile.ds160`
- Linux container
- Chrome Stable
- Patchright
- Xvfb
- `HEADLESS=false`
- `channel: 'chrome'`

Em outras palavras:

- o runtime real nao e Firefox
- o teste de producao deve espelhar exatamente esse ambiente
- qualquer identidade anunciada deve ser coerente com Chrome em Linux/Xvfb

## Hipotese Mais Provavel

A causa mais provavel dos problemas atuais no Fly e:

1. o browser entra em challenge `TSPD`
2. a automacao nao classifica isso cedo o suficiente
3. o fluxo continua tentando encontrar `location`, captcha ou botoes na pagina errada
4. o retry reaproveita contexto comprometido
5. os logs finais contam o sintoma errado

Em resumo:

- a automacao precisa ficar melhor em reconhecer "que pagina eu realmente estou vendo agora?"

## Checklist de Producao

- Alinhar a identidade anunciada com o runtime real do Fly
- Detectar challenge antes de tentar resolver captcha da landing
- Validar contrato de DOM do landing antes de cada fase critica
- Validar contrato de DOM do recovery antes de cada fase critica
- Nao reutilizar sessao contaminada
- Separar `challenge_detected` de `captcha_failed`
- Padronizar evidencias por falha
- Criar smoke test de landing no runtime real do Fly
- Criar smoke test de recovery no runtime real do Fly
- Definir criterio de `standby` para falhas de plataforma

## Matriz Impacto x Esforco

### Alto impacto, baixo esforco

- Alinhar identidade com Chrome no Fly
- Classificar challenge antes de `captcha_failed`
- Nao reutilizar browser/pagina apos challenge
- Revalidar DOM antes de captcha e antes do clique final

### Alto impacto, esforco medio

- Criar detector central de estado da pagina
- Criar contrato de pagina valida no landing
- Criar smoke test canonico do Fly
- Separar recovery em fases explicitas

### Alto impacto, esforco alto

- Simplificar a pilha de identidade/spoofing para algo mais coerente
- Reestruturar a orquestracao de sessao e retry de ponta a ponta

### Medio impacto, baixo esforco

- Congelar viewport, locale e timezone operacionais
- Salvar evidencias minimas de falha
- Melhorar classificacao de erro

### Ordem recomendada

1. identidade coerente
2. deteccao de challenge
3. higiene de sessao
4. guardas de DOM
5. smoke tests no Fly
6. refatoracao do recovery

## Plano de Execucao

### 1 dia

- Ajustar o perfil de identidade para o runtime real do Fly
- Detectar challenge de forma centralizada
- Impedir reutilizacao de sessao contaminada
- Revalidar estado do landing antes de cada fase
- Melhorar logs de erro com URL final, estado e snippets de HTML

### 3 dias

- Criar smoke test de landing no mesmo runtime do Fly
- Criar smoke test de recovery no mesmo runtime do Fly
- Separar taxonomia de erros
- Congelar perfil operacional para reduzir variabilidade

### 1 semana

- Refatorar landing e recovery para uma maquina de estados mais explicita
- Melhorar higiene de sessao e ciclo de retry
- Revisar a coerencia da pilha de identidade
- Definir rollout seguro com criterio de pausa automatica

## Arquitetura Recomendada

### 1. Perfil operacional

Um helper unico para construir:

- identidade do browser
- launch options
- context options

### 2. Detector central de estado

Uma fonte unica de verdade para identificar:

- `landing_ready`
- `landing_partial`
- `challenge`
- `recovery_captcha`
- `recovery_questions`
- `security_question`
- `unknown`

### 3. Guardas de pre-condicao

Cada fase critica so continua se o estado atual da pagina for permitido.

### 4. Higiene de sessao

Retries devem descartar contexto quando houver:

- challenge detectado
- DOM invalido
- estado desconhecido apos transicao critica

### 5. Falha com evidencia estruturada

Toda falha deve carregar:

- `cause`
- `pageState`
- `finalUrl`
- `phase`
- `htmlSnippet`
- `bodySnippet`
- `proxyEnabled`
- `reusedSession`

## Exemplos Conceituais de Codigo

Esta secao nao e um patch do projeto. E uma referencia de desenho para as partes seguras da automacao: deteccao de estado, classificacao de falha, higiene de sessao e smoke tests.

### 1. Detector de estado da pagina

```js
async function detectPageState(page) {
  const url = page.url();
  const html = await page.content().catch(() => '');

  const hasTspdMarker =
    html.includes('/TSPD/') ||
    html.includes('loaderConfig') ||
    html.includes('type=18') ||
    html.includes('type=20');

  const hasLandingLocation = await page.locator("select[id$='_ddlLocation']").first()
    .isVisible({ timeout: 1000 }).catch(() => false);

  const hasLandingCaptcha = await page.locator(".LBD_CaptchaImage, img[id*='CaptchaImage']").first()
    .isVisible({ timeout: 1000 }).catch(() => false);

  const hasStartLink = await page.locator("a[id$='_lnkNew']").first()
    .isVisible({ timeout: 1000 }).catch(() => false);

  const hasRetrieveLink = await page.locator("a[id$='_lnkRetrieve']").first()
    .isVisible({ timeout: 1000 }).catch(() => false);

  const hasRecoveryCaptcha = await page.locator(
    "input[id*='ApplicationID'], input[id*='txtCodeTextBox'], .LBD_CaptchaImage"
  ).first().isVisible({ timeout: 1000 }).catch(() => false);

  const hasRecoveryQuestions = await page.locator(
    "input[id*='txbSname'], input[id*='txbYear'], input[id*='txbAnswer']"
  ).first().isVisible({ timeout: 1000 }).catch(() => false);

  if (hasTspdMarker) return { type: 'challenge', url };

  if (url.includes('Default.aspx') && hasLandingLocation && (hasStartLink || hasRetrieveLink)) {
    return { type: hasLandingCaptcha ? 'landing_ready' : 'landing_partial', url };
  }

  if (url.includes('Recovery.aspx')) {
    if (hasRecoveryQuestions) return { type: 'recovery_questions', url };
    if (hasRecoveryCaptcha) return { type: 'recovery_captcha', url };
    return { type: 'recovery_unknown', url };
  }

  if (url.includes('ConfirmApplicationID') || url.includes('SecureQuestion')) {
    return { type: 'security_question', url };
  }

  return { type: 'unknown', url };
}
```

### 2. Guarda de pre-condicao

```js
async function ensureState(page, allowedStates) {
  const state = await detectPageState(page);

  if (!allowedStates.includes(state.type)) {
    const err = new Error(`Unexpected page state: ${state.type}`);
    err.code = 'PAGE_STATE_MISMATCH';
    err.state = state;
    throw err;
  }

  return state;
}
```

### 3. Classificacao de erro

```js
function classifyAutomationError(error, state) {
  const msg = String(error?.message || '').toLowerCase();

  if (state?.type === 'challenge') return 'challenge_detected';
  if (msg.includes('captcha')) return 'captcha_failed';
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('waiting for locator')) return 'dom_mismatch';
  if (msg.includes('session')) return 'session_expired';
  if (msg.includes('net::') || msg.includes('econn') || msg.includes('enotfound')) {
    return 'network_error';
  }

  return 'unknown_error';
}
```

### 4. Decisao de descarte de sessao

```js
function shouldDiscardSession(lastState, lastErrorType) {
  return (
    lastState?.type === 'challenge' ||
    lastErrorType === 'challenge_detected' ||
    lastErrorType === 'dom_mismatch'
  );
}
```

### 5. Evidencia minima de falha

```js
async function collectFailureEvidence(page, extra = {}) {
  const state = await detectPageState(page).catch(() => ({ type: 'unknown', url: 'n/a' }));
  const html = await page.content().catch(() => '');
  const title = await page.title().catch(() => '');
  const text = await page.locator('body').innerText().catch(() => '');

  return {
    url: state.url,
    state: state.type,
    title,
    htmlSnippet: html.slice(0, 3000),
    bodySnippet: text.slice(0, 1500),
    timestamp: new Date().toISOString(),
    ...extra,
  };
}
```

### 6. Smoke test minimo de landing

```js
async function smokeTestLanding(page) {
  await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  let state = await detectPageState(page);
  if (state.type === 'challenge') return state;

  await ensureState(page, ['landing_ready', 'landing_partial']);

  const location = page.locator("select[id$='_ddlLocation']").first();
  await location.selectOption('RCF');
  await location.dispatchEvent('change');

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2000);

  state = await detectPageState(page);
  return state;
}
```

### 7. Perfil operacional fixo do Fly

```js
const flyBrowserProfile = {
  locale: 'en-US',
  timezoneId: 'America/New_York',
  viewport: { width: 1366, height: 768 },
  screen: { width: 1366, height: 768 },
  colorScheme: 'light',
  isMobile: false,
  hasTouch: false,
  javaScriptEnabled: true,
};
```

## Pseudo-Diff Conceitual do filler.js

Esta secao mostra como a refatoracao ideal se encaixaria no `filler.js`, sem ser um patch literal.

### 1. Bloco de identidade

Antes:

- sorteio de Chrome, Edge e Firefox
- runtime real em Chrome
- risco de identidade incoerente

Depois:

```js
const identity = buildFlyIdentityProfile({
  proxyUrl,
  proxyCountries: config.proxy_countries,
});

const contextOpts = buildContextOptions(identity);
```

### 2. Validacao inicial da pagina

Antes:

```js
const hasContent = ...
const hasTSPDChallenge = ...
if (hasContent || hasTSPDChallenge) {
  navSuccess = true;
}
```

Depois:

```js
const initialState = await detectPageState(page);

if (initialState.type === 'challenge') {
  return failWithState('challenge_detected', initialState);
}

if (!['landing_ready', 'landing_partial', 'recovery_captcha', 'recovery_questions'].includes(initialState.type)) {
  return failWithState('landing_dom_mismatch', initialState);
}

navSuccess = true;
```

### 3. Captcha versus challenge

Antes:

```js
catch (e) {
  if (attempt < 3) continue;
  return { success: false, cause: 'captcha_failed' };
}
```

Depois:

```js
catch (e) {
  const state = await detectPageState(page);

  if (state.type === 'challenge') {
    return failWithState('challenge_detected', state, e);
  }

  if (state.type !== 'landing_ready') {
    return failWithState('landing_dom_mismatch', state, e);
  }

  if (attempt < 3) continue;
  return failWithState('captcha_failed', state, e);
}
```

### 4. Landing com guardas

Depois:

```js
await ensureState(page, ['landing_ready', 'landing_partial']);
await selectLocation(...);

await ensureState(page, ['landing_partial', 'landing_ready', 'challenge']);
await dismissModalIfNeeded(...);

await ensureState(page, ['landing_ready']);
await solveLandingCaptcha(...);

await ensureState(page, ['landing_ready']);
await clickLandingAction(...);
```

### 5. Retry e sessao

Antes:

- o retry reaproveita browser/page em varios cenarios

Depois:

```js
const result = await fillApplication(..., currentBrowser, currentPage);

if (shouldDiscardSession(result.pageState, result.cause)) {
  await currentPage?.close().catch(() => {});
  await currentBrowser?.close().catch(() => {});
  currentPage = null;
  currentBrowser = null;
} else {
  currentBrowser = result.browser;
  currentPage = result.activePage;
}
```

## Arquivo por Arquivo

### 1. `automation/filler.js`

Aqui fica a maior parte da mudanca.

Adicionar:

- construcao de perfil coerente do Fly
- chamadas ao detector central de estado
- guardas de pre-condicao no landing
- separacao entre challenge, captcha_failed e dom_mismatch
- retorno padronizado de falha com evidencia
- recovery dividido por fase

Refatorar nestas areas:

- bloco de identidade e contexto
- deteccao inicial de challenge e conteudo
- landing flow
- recovery flow
- classificador final de erro

### 2. `automation/helpers/page-state.js`

Responsabilidade:

- ser a fonte unica de verdade para identificar estado da pagina

Colocar aqui:

- `detectPageState(page)`
- `detectRecoveryPhase(page)`
- `hasTspdMarkers(html)`
- `isLandingReady(page)`
- `isRecoveryCaptchaPhase(page)`
- `isRecoveryQuestionsPhase(page)`

### 3. `automation/helpers/page-guards.js`

Responsabilidade:

- validar pre-condicoes e contrato de pagina

Colocar aqui:

- `ensureState(page, allowedStates)`
- `assertLandingContract(page, phase)`
- `assertRecoveryContract(page, phase)`

### 4. `automation/helpers/failure-context.js`

Responsabilidade:

- montar envelope consistente de falha e evidencia

Colocar aqui:

- `collectFailureEvidence(page, extra)`
- `buildFailureResult(...)`
- `classifyAutomationError(error, pageState, phase)`

### 5. `automation/helpers/fly-profile.js`

Responsabilidade:

- definir perfil operacional coerente do Fly

Colocar aqui:

- `buildFlyIdentityProfile(config)`
- `buildContextOptions(identity)`
- possivelmente `buildLaunchOptions(...)`

### 6. `automation/queue.js`

Aqui a mudanca e menor, mas critica.

Adicionar:

- logica para descartar browser/page quando a tentativa anterior terminou com:
  - `challenge_detected`
  - `landing_dom_mismatch`
  - `recovery_dom_mismatch`

Objetivo:

- impedir reutilizacao de contexto contaminado

### 7. `automation/ceac-landing-test.js`

Recomendacao:

- deixar de ser o teste canonico se continuar divergindo do runtime do Fly
- reutilizar os helpers novos
- evitar hacks de DOM que reduzem o valor diagnostico do teste

### 8. `automation/fly-smoke-landing.js`

Novo teste sugerido.

Responsabilidade:

- validar somente:
  - abriu a landing
  - selecionou location
  - a pagina virou landing pronta ou challenge

### 9. `automation/fly-smoke-recovery.js`

Novo teste sugerido.

Responsabilidade:

- validar:
  - recovery com captcha
  - recovery com perguntas
  - recovery de aplicacao submetida

### 10. `automation/test-stealth.js` e `automation/fingerprint-test.js`

Recomendacao:

- manter como auxiliares
- nao usar como gate principal de producao

## Backlog Tecnico

### Prioridade 1

- Criar `automation/helpers/fly-profile.js`
- Criar `automation/helpers/page-state.js`
- Refatorar identidade em `automation/filler.js`
- Inserir deteccao central de estado no inicio da navegacao

### Prioridade 2

- Criar `automation/helpers/page-guards.js`
- Refatorar landing com guardas por fase
- Separar `challenge_detected` de `captcha_failed`
- Padronizar classificacao de erro

### Prioridade 3

- Criar `automation/helpers/failure-context.js`
- Padronizar retorno de falha no `filler`
- Refatorar `automation/queue.js` para descartar sessao comprometida

### Prioridade 4

- Criar `automation/fly-smoke-landing.js`
- Criar `automation/fly-smoke-recovery.js`
- Refatorar recovery em fases explicitas

### Prioridade 5

- Ajustar `automation/ceac-landing-test.js`
- Rebaixar `test-stealth.js` e `fingerprint-test.js` para testes auxiliares
- Definir criterios formais de aceite para producao

### Backlog detalhado em ordem recomendada

1. Criar `automation/helpers/fly-profile.js`
2. Refatorar o bloco de identidade em `automation/filler.js`
3. Criar `automation/helpers/page-state.js`
4. Inserir deteccao central de estado no inicio da navegacao em `automation/filler.js`
5. Criar `automation/helpers/page-guards.js`
6. Refatorar o landing flow com guardas por fase
7. Separar `challenge_detected` de `captcha_failed`
8. Refatorar o bloco de recovery em `automation/filler.js`
9. Criar `automation/helpers/failure-context.js`
10. Padronizar os retornos de falha do `filler`
11. Atualizar o classificador final de erro
12. Atualizar retry e session hygiene em `automation/queue.js`
13. Criar `automation/fly-smoke-landing.js`
14. Criar `automation/fly-smoke-recovery.js`
15. Ajustar `automation/ceac-landing-test.js`
16. Rebaixar `automation/test-stealth.js` e `automation/fingerprint-test.js` para auxiliares
17. Adicionar criterio operacional de `standby`
18. Definir criterios de aceite para producao no Fly

## Arquivos Mais Importantes

### Implementacao

- `automation/filler.js`
- `automation/queue.js`
- `automation/Dockerfile.ds160`

### Novos helpers sugeridos

- `automation/helpers/fly-profile.js`
- `automation/helpers/page-state.js`
- `automation/helpers/page-guards.js`
- `automation/helpers/failure-context.js`

### Testes sugeridos

- `automation/fly-smoke-landing.js`
- `automation/fly-smoke-recovery.js`

### Referencia oficial do fluxo

- `ds160map/DS160/1 - Complete/1- Getting Started/1- Apply For a Nonimmigrant Visa.md`
- `ds160map/DS160/1 - Complete/1- Getting Started/1.2 Apply For a Nonimmigrant Visa.md`
- `ds160map/DS160/1 - Complete/1- Getting Started/2 - Secure Question.md`
- `ds160map/DS160/1 - Complete/1- Getting Started/3 - Retrieve a DS-160 Application.md`
- `ds160map/DS160/1 - Complete/1- Getting Started/3.1 - Retrieve a DS-160 Application.md`

## Criterios de Aceite para Go-Live

Antes de considerar esta parte pronta para producao no Fly, o ideal e ter:

- landing real identificado com alta confianca
- challenge detectado e classificado corretamente
- retries sem reaproveitar sessao contaminada
- smoke tests reproduziveis no runtime real do Fly
- recovery classificado corretamente por fase
- logs suficientes para investigar qualquer falha em um unico ciclo

## Apice: O Que Este Documento Nao Tenta Fazer

Este documento nao foi escrito para:

- contornar antibot
- ensinar evasao de deteccao
- priorizar "mais stealth" acima de confiabilidade operacional

Ele foi escrito para:

- estabilizar a automacao no Fly
- tornar a execucao reproduzivel
- diferenciar erro real de challenge
- melhorar manutencao e capacidade de diagnostico

## Observacao Final

O objetivo deste documento nao e aumentar complexidade. E reduzir incerteza operacional.

O foco recomendado para o Fly e:

- coerencia
- previsibilidade
- classificacao correta de estado
- retry limpo
- evidencias claras

Se esses pontos forem resolvidos, a automacao fica muito mais depuravel e pronta para evolucao controlada.
