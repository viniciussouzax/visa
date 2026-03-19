# Roadmap — DS160 IA

## DS160
1. **Preenchimento + Confirmação** — preenche, pega confirmação e ds160 completo
   - https://ceac.state.gov/GenNIV/Default.aspx

## AIS
1. **Cadastro → Boleto** — Cadastro, confirmação email, adicionar solicitantes, emitir e pegar boleto
   - https://ais.usvisa-info.com/pt-br/niv/signup
2. **Pagamento → Agendamento** — Confirmar pagamento, fazer agendamentos, pegar comprovante de pagamento e de agendamento
   - https://ais.usvisa-info.com/pt-br/niv/users/sign_in
3. **DS160 Check** — Verifica o status do DS-160
   - https://ceac.state.gov/ceacstattracker/status.aspx

## Adicionais (não é prioridade)
- **FOIA** — Solicitar em caso de visto negado ou quando precisa de dados imigratórios
- **Receita Federal** — Buscar dados de Imposto de Renda, etc.
- **Antecedentes Criminais**
- **JusBrasil** — Buscar processos judiciais
- **Consulta CPF e CNPJ** — Dados pessoais e familiares

## IAs
1. **Pré-Análise** — Análise criteriosa sobre pontos importantes do perfil do solicitante. Melhora decisões com inteligência de dados.
2. **Auto-Update** — Lê logs, identifica erros ou falhas, faz plano de ação e gera correção.

---

## Futuro: Gmail Pub/Sub (substituir Make)

**Objetivo**: Eliminar dependência do Make. Quando email chega, o próprio Google acorda o Supabase.

**Fluxo**:
```
Email → Gmail → Pub/Sub notifica → Edge Function processa → salva no ais_accounts
```

**Setup necessário (GCP Console)**:
1. Ativar Gmail API + Pub/Sub API
2. Criar tópico Pub/Sub: `ais-emails`
3. Criar assinatura push → `https://zcpvknzktfmotvrybxdf.supabase.co/functions/v1/ais-email-handler`
4. Configurar Gmail watch: monitorar inbox e notificar no tópico

**Setup (Supabase)**:
5. Edge Function `ais-email-handler` que recebe push, lê email via Gmail API, extrai links e salva

**Vantagens**: Grátis (free tier GCP), sem polling, sem Make, infra própria.
