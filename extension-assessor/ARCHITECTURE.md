# Arquitetura da Extensão

## Objetivo

Rodar localmente no navegador do assessor com o menor atrito possível:

- o usuário instala uma vez
- faz login
- consulta fila
- no futuro executa o preenchimento local

## Princípios para aprovação futura

1. A extensão não baixa nem executa JavaScript remoto arbitrário.
2. A lógica principal da engine fica embarcada na própria extensão.
3. O backend só entrega configuração e dados:
   - versão mínima
   - recipe
   - selectors
   - mapeamentos
   - flags
4. Permissões mínimas por padrão.
5. Permissões de página sensível ficam opcionais e só entram quando a automação local for ativada.

## Modelo de atualização

Antes de cada consulta de fila e antes de cada execução:

1. a extensão lê o `settings` no Supabase
2. compara:
   - versão local
   - versão mínima suportada
   - versão mais recente
3. se a versão local estiver abaixo da mínima:
   - bloqueia a operação
   - orienta a atualizar

## Modelo futuro da automação

### O que fica fixo na extensão

- engine de execução
- tipos de ação suportados
- contrato de validação da recipe
- tratamento de estado local

### O que vem do backend

- `automation_version`
- `min_engine_version`
- `recipe`
- `selectors`
- `field_map`
- `conditional_rules`

## Limite entre engine e config remota

Mudanças que devem funcionar sem atualizar a extensão:

- novo input mapeado
- seletor alterado
- ordem de campos
- validação simples
- obrigatoriedade
- regra condicional

Mudanças que exigem nova versão da extensão:

- novo tipo de interação que a engine não conhece
- novo fluxo de navegação
- integração com API de navegador não prevista
- mudança estrutural do motor local

## Modo de execução por organização

Campo esperado na organização:

- `execution_mode = server | extension`

Regra:

- `server`: servidor executa, extensão só consulta
- `extension`: extensão executa, servidor ignora

## Próxima etapa técnica

Adicionar:

- content script local
- reader de recipe remota
- engine declarativa
- lock por item + heartbeat
