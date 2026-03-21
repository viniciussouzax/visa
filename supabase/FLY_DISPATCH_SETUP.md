# Supabase -> Fly Dispatch Setup

Este projeto usa o fluxo abaixo para iniciar o preenchimento automaticamente:

1. A dashboard move o solicitante para `stage='ds160'` com `status='todo'`.
2. Um trigger no banco chama a Edge Function `dispatch-job`.
3. A Edge Function chama a Fly Machines API.
4. A machine do app `ds160-worker` inicia, processa a fila e encerra.

## Secrets da Edge Function

Configure estes secrets no deploy da função:

- `FLY_API_TOKEN`: token da Fly com permissão para gerenciar machines.
- `FLY_DS160_APP`: normalmente `ds160-worker`.
- `FLY_DS160_MACHINE_ID`: recomendado para iniciar sempre a machine principal.
- `FLY_AIS_APP`: normalmente `ais-worker` se houver worker AIS.
- `FLY_AIS_MACHINE_ID`: opcional para AIS.
- `FLY_API_HOSTNAME`: opcional, padrão `https://api.machines.dev`.

## SQL do trigger

Use a migration [20260320_dispatch_fly_worker.sql](/C:/Users/azuos/Desktop/DS160%20IA/supabase/migrations/20260320_dispatch_fly_worker.sql) e substitua:

- `YOUR_SUPABASE_SERVICE_ROLE_KEY`

O trigger dispara quando houver transição para:

- `ds160/todo`
- `ds160/retry`
- `payment/todo`
- `scheduling/todo`

## Valores atuais auditados no Fly

Em `2026-03-20`, o app `ds160-worker` estava publicado no Fly com:

- app: `ds160-worker`
- machine principal: `90800d05b1d798`
- standby: `e286d2d7c7de38`

Se quiser fixar a machine principal no dispatch, use:

```env
FLY_DS160_APP=ds160-worker
FLY_DS160_MACHINE_ID=90800d05b1d798
```

## Observações

- O GitHub Actions não inicia execução em runtime; ele só faz deploy.
- Sem esse trigger/webhook do Supabase, a machine do Fly pode permanecer parada mesmo com applicant em `ds160/todo`.
- O deploy atualmente rodando no Fly ainda está desatualizado e precisa receber as correções locais antes de produção.
