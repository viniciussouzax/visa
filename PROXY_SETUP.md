# Proxy Setup - SENDS160

## Por que usar proxy?

O site CEAC (`ceac.state.gov`) bloqueia IPs de datacenters (AWS, GCP, Azure). Para automacao em Fly.io ou VPS, e obrigatorio usar proxy residencial.

## Configuracao Local

1. Adicione no `.env`:
   ```
   PROXY_URL=http://user:password@proxy.dataimpulse.com:8000
   ```

2. Ou configure via Supabase (`settings` do dashboard):
   ```sql
   INSERT INTO settings (key_name, key_value, description)
   VALUES ('proxy_url', 'http://user:pass@proxy.dataimpulse.com:8000', 'Proxy residencial')
   ON CONFLICT (key_name) DO UPDATE SET key_value = EXCLUDED.key_value;
   ```

3. Teste localmente:
   ```bash
   curl -x http://user:pass@proxy.dataimpulse.com:8000 https://ceac.state.gov/GenNIV/Default.aspx -I
   ```

## Configuracao Fly.io

1. Configure `PROXY_URL` como secret do app:
   ```bash
   flyctl secrets set PROXY_URL=http://user:password@proxy.dataimpulse.com:8000 -a ds160-worker
   ```

2. Ou mantenha o valor em `settings.proxy_url` no Supabase para o worker consumir dinamicamente.

3. Verifique logs do worker:
   ```bash
   flyctl logs -a ds160-worker
   ```

## Formato da URL

```
http://user:password@host:port
socks5://user:password@host:port
```

## Validacao no codigo

O `filler.js` valida a URL do proxy antes de usar. Se invalida, lanca erro fatal e nao continua sem proxy.

## Troubleshooting

| Problema | Causa | Solucao |
|----------|-------|---------|
| `Proxy URL invalida` | Formato errado no `.env` ou `settings` | Verificar URL completa com `http://` |
| Timeout no CEAC | Proxy bloqueado ou lento | Trocar regiao/provider |
| `ERR_PROXY_CONNECTION_FAILED` | Credenciais erradas | Verificar user/pass no painel do proxy |
