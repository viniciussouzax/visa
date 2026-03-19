# 🔒 Proxy Setup — SENDS160

## Por que usar proxy?

O site CEAC (ceac.state.gov) bloqueia IPs de datacenters (AWS, GCP, Azure). Para automação em Cloud Run ou VPS, é **obrigatório** usar proxy residencial.

## Configuração Local

1. Adicione no `.env`:
   ```
   PROXY_URL=http://user:password@proxy.dataimpulse.com:8000
   ```

2. Ou configure via Supabase (Settings do dashboard):
   ```sql
   INSERT INTO settings (key_name, key_value, description)
   VALUES ('proxy_url', 'http://user:pass@proxy.dataimpulse.com:8000', 'Proxy residencial')
   ON CONFLICT (key_name) DO UPDATE SET key_value = EXCLUDED.key_value;
   ```

3. Teste localmente:
   ```bash
   curl -x http://user:pass@proxy.dataimpulse.com:8000 https://ceac.state.gov/GenNIV/Default.aspx -I
   ```

## Configuração Cloud Run

### 1. Criar VPC Connector (uma vez)
```bash
gcloud compute networks vpc-access connectors create ds160-connector \
  --region us-central1 \
  --range 10.8.0.0/28
```

### 2. Deploy com VPC Connector
```bash
gcloud run jobs deploy ds160-worker \
  --region us-central1 \
  --vpc-connector projects/<PROJECT_ID>/locations/us-central1/connectors/ds160-connector \
  --vpc-egress all-traffic
```

> **IMPORTANTE**: `--vpc-egress all-traffic` força TODO o tráfego pelo connector. Sem isso, o tráfego pode sair pelo IP público do Google e ser bloqueado.

## Formato da URL

```
http://user:password@host:port    # HTTP proxy (DataImpulse, BrightData)
socks5://user:password@host:port  # SOCKS5
```

## Validação no Código

O `filler.js` agora **valida** a URL do proxy antes de usar. Se inválida, lança erro fatal (não continua sem proxy).

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| `Proxy URL inválida` | Formato errado no `.env` ou `settings` | Verificar URL completa com `http://` |
| Timeout no CEAC | Proxy bloqueado ou lento | Trocar região/provider |
| `ERR_PROXY_CONNECTION_FAILED` | Credenciais erradas | Verificar user/pass no painel do proxy |
