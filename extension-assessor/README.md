# SENDS160 Assessor Queue Extension

Extensão isolada para o assessor:

- login com credencial Supabase do assessor
- consulta manual da fila DS-160
- polling automático em background a cada 3 minutos
- badge com quantidade de itens ativos
- gate de versão antes de consultar nova execução
- conexão opcional com a aba atual do CEAC para modo local
- botão `Executar próximo` para claimar o próximo item da fila local

## Instalação

1. Abra `chrome://extensions`
2. Ative `Modo do desenvolvedor`
3. Clique em `Carregar sem compactação`
4. Selecione a pasta `extension-assessor`

## Pronto para aprovação futura

- permissões mínimas no modo atual
- sem execução de código remoto arbitrário
- host sensível do CEAC fica como permissão opcional
- arquitetura preparada para `engine fixa + config remota`

## Escopo atual

- não altera os arquivos existentes do projeto
- não depende da dashboard aberta
- monitora casos da organização do assessor em `stage = ds160`
- considera fila ativa quando `fill_status` está em:
  - `todo`
  - `retry`
  - `doing`
  - `standby`
  - `error`
  - `fail`
- se a organização estiver em `execution_mode = extension`, a extensão pode conectar na aba do CEAC
- a execução local usa a configuração `settings.extension_recipe_ds160`

## Requisito para execução local

Para o botão `Executar próximo` funcionar, o backend precisa fornecer uma recipe válida em:

- `settings.key_name = extension_recipe_ds160`

Formato esperado:

```json
{
  "version": "0.1.0",
  "steps": [
    { "action": "fill", "selector": "#ctl00_SiteContentPlaceHolder_txtFoo", "value": "{{data.personal.surnames}}" }
  ]
}
```

## Limites conhecidos

- a sessão do assessor fica salva no `chrome.storage.local`
- o polling mínimo do `chrome.alarms` em MV3 é 1 minuto; aqui está em 3
- se a regra da fila mudar no backend, o filtro da extensão precisa acompanhar
- para automação local futura, a recomendação está em [ARCHITECTURE.md](/C:/Users/azuos/Desktop/DS160%20IA/extension-assessor/ARCHITECTURE.md)
