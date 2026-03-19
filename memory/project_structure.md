# Estrutura do Projeto — DS160 IA

```
C:\Users\azuos\Desktop\DS160 IA\
│
├── automation/                          🔴 CORE — Motor de automação
│   ├── filler.js                        Principal — orquestra preenchimento DS-160 (110 KB)
│   ├── queue.js                         Fila de execução, polling, claim, retry, DoR (52 KB)
│   ├── run.js                           Runner local — inicia queue + realtime
│   ├── ds160-entry.js                   Entrypoint Cloud Run (1 applicant/execução)
│   ├── normalize-profile.js             Transforma nested → flat profile
│   ├── field-map.js                     Router para field-maps modulares
│   ├── captcha.js                       Solver captcha (CapMonster / AI Vision)
│   ├── error-catalog.js                 Catálogo de erros classificados
│   ├── Dockerfile.ds160                 Image Docker Cloud Run DS-160
│   ├── Dockerfile.ais                   Image Docker Cloud Run AIS
│   │
│   ├── pages/                           Fillers especializados por página
│   │   ├── generic-page.js              Preenchimento genérico (maioria das páginas)
│   │   ├── travel-page.js               Página Travel (condicionais complexas)
│   │   ├── landing-page.js              Landing (location + captcha)
│   │   ├── security-question-page.js    Security Question setup
│   │   ├── recovery-page.js             Retrieve Application
│   │   ├── photo-page.js                Upload de foto
│   │   └── esign-page.js                Assinatura eletrônica
│   │
│   ├── helpers/                         Utilitários de preenchimento
│   │   ├── fill-field.js                Preenche text/select/radio/checkbox
│   │   ├── add-another.js               Lógica "Add Another" para arrays
│   │   ├── postback.js                  Espera ASP.NET postback completar
│   │   ├── verify.js                    Extrai erros de validação
│   │   └── captcha-handler.js           Handler captcha inline (TSPD)
│   │
│   ├── field-maps/                      Mapeamento campo → ID DS-160
│   │   ├── index.js                     Exporta field maps por tipo de visto
│   │   ├── b1-b2-modular.js             Field map B1/B2 (turismo/negócios)
│   │   └── shared.js                    Campos compartilhados entre vistos
│   │
│   └── ais/                             🟠 CORE — Automação AIS (Agendamento)
│       ├── ais-runner.js                Orquestrador do fluxo AIS (28 KB)
│       ├── ais-login.js                 Login no portal AIS
│       ├── ais-signup.js                Cadastro automático AIS
│       ├── ais-add-applicant.js         Adicionar applicant + gerar MRV
│       ├── ais-confirm.js               Confirmação de pagamento
│       ├── ais-payment-check.js         Verificação de pagamento
│       ├── ais-schedule.js              Agendamento de entrevista
│       ├── ais-country-map.js           Mapeamento de países AIS
│       ├── addy-email.js                Gerenciamento de email AIS
│       └── test-ais-flow.js             Teste do fluxo AIS
│
├── pages/                               🟢 SCHEMA — Definição do formulário
│   ├── 01-location/schema.js            Local da Entrevista
│   ├── 02-personal1/schema.js           Informações Pessoais 1
│   ├── 03-personal2/schema.js           Informações Pessoais 2
│   ├── 04-travel/schema.js              Viagem
│   ├── 05-travel-companions/schema.js   Acompanhantes
│   ├── 06-previous-us-travel/schema.js  Viagens anteriores EUA
│   ├── 07-address-phone/schema.js       Endereço e Telefone
│   ├── 08-passport/schema.js            Passaporte
│   ├── 09-us-contact/schema.js          Contato nos EUA
│   ├── 10-family-parents/schema.js      Família — Pais
│   ├── 11-family-spouse/schema.js       Família — Cônjuge
│   ├── 12-deceased-spouse/schema.js     Cônjuge Falecido
│   ├── 13-prev-spouse/schema.js         Ex-Cônjuges
│   ├── 14-work-education-current/       Trabalho/Educação Atual
│   ├── 15-work-education-previous/      Trabalho/Educação Anterior
│   ├── 16-work-education-additional/    Educação Adicional
│   ├── 17-security/schema.js            Segurança
│   ├── 18-student-exchange/             Estudante/Intercâmbio
│   ├── 19-petition-info/                Petição
│   ├── 19a-student-add-contact/         Contato Estudante
│   ├── 20-photo-upload/                 Upload de Foto
│   ├── 21-review/                       Revisão
│   ├── 22-sign/                         Assinatura
│   ├── 23-confirmation/                 Confirmação
│   ├── 24-print-app/                    Imprimir Aplicação
│   ├── 25-thank-you/                    Agradecimento
│   └── _shared/                         Options compartilhadas (países, estados)
│
├── public/                              🔵 PLATAFORMA — Frontend (GitHub Pages)
│   ├── dashboard.html                   Dashboard admin (28 KB)
│   ├── ds160-form.html                  Formulário clone DS-160 (47 KB)
│   ├── portal.html                      Portal do solicitante (24 KB)
│   ├── landing.html                     Landing page pública (60 KB)
│   ├── index.html                       Redirect / entrada
│   ├── update-password.html             Reset de senha
│   ├── docs.html                        Documentação interna (55 KB)
│   ├── styles.css                       CSS global (116 KB)
│   ├── app-core.js                      Auth + routing core
│   ├── form-engine.js                   Motor do formulário clone (198 KB)
│   ├── ds160-schema.js                  Schema compilado (175 KB)
│   ├── logo-azul.png                    Logo azul
│   ├── logo-branco.png                  Logo branco
│   └── js/
│       ├── dashboard.js                 Lógica do dashboard admin (184 KB)
│       └── portal.js                    Lógica do portal solicitante (37 KB)
│
├── scripts/                             ⚙️ SCRIPTS — Utilidades e testes
│   ├── build-schema.js                  Compila pages/*/schema.js → ds160-schema.js
│   ├── seed-test-profiles.js            Popula banco com perfis de teste
│   ├── test-profiles.js                 Definição dos 39 perfis de teste (73 KB)
│   ├── check-test-results.js            Relatório de resultados batch
│   ├── check-queue.js                   Verifica estado da fila
│   ├── audit-schema-consistency.js      Auditoria schema vs HTML oficial
│   ├── audit-coverage.js                Cobertura de campos
│   ├── setup-production.sql             SQL de setup produção
│   ├── setup-gcp.sh                     Setup GCP / Cloud Run
│   ├── run-batch-test.sh                Executa batch de testes
│   ├── test-auth.js                     Teste de autenticação
│   ├── test-quick.js                    Teste rápido
│   └── example-applicant-data.json      JSON exemplo de applicant
│
├── supabase/                            🗄️ BANCO — Supabase
│   └── functions/
│       └── dispatch-job/                Edge Function — dispara jobs Cloud Run
│
├── ds160map/                            📚 REFERÊNCIA — HTMLs do DS-160 oficial
├── AISmap/                              📚 REFERÊNCIA — Docs/screenshots AIS
│
├── memory/                              🧠 CONTEXTO — Briefings e memória
│   ├── DS160.md                         Resumo geral
│   ├── PROJECT_BRIEFING.md              Briefing do projeto
│   └── walkthrough.md                   Walkthrough atual
│
├── docs/                               📄 DOCUMENTAÇÃO
│   └── infra-scale/                     Docs de infraestrutura e escala
│
├── audit-proxy-deep.js                  🔍 Auditoria profunda de proxy
├── audit-supabase.js                    🔍 Auditoria do banco
├── audit-frontend.js                    🔍 Auditoria do frontend
├── audit-frontend-sync.js              🔍 Sync frontend
├── audit-syntax.js                      🔍 Auditoria de sintaxe
│
├── package.json                         Dependências Node.js
├── package-lock.json                    Lock de dependências
├── vite.config.mjs                      Config Vite (dev server)
├── .env / .env.example                  Variáveis de ambiente
├── .gitignore                           Git ignore
├── PROXY_SETUP.md                       Guia de configuração de proxy
├── README.md                            README do projeto
└── ROADMAP.md                           Roadmap de features
```
