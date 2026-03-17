# Scaling Plan — SENDS160 Automation

## Context

The DS-160 automation fills forms on ceac.state.gov via Playwright.
Each form takes ~3-5 minutes. The system is legitimate (advisory firms filling client forms).

---

## Tier 1 — Low Volume (up to 20/day)

**Infrastructure:** Single machine, single worker.

| Component | Solution | Cost |
|-----------|----------|------|
| Worker | 1x QueueRunner (Node.js) | — |
| Browser | Playwright Chromium (headless/headed) | — |
| IP | Residential/VPS IP | — |
| Captcha | CapMonster API | ~$5-10/mo |
| Database | Supabase (existing) | Free tier |

**No special infrastructure needed.** A single office IP submitting 10-20 forms/day is normal behavior for advisory firms.

---

## Tier 2 — Medium Volume (20-100/day)

**Infrastructure:** Single machine, 1-2 workers, residential proxy.

| Component | Solution | Cost |
|-----------|----------|------|
| Workers | 1-2x QueueRunner | — |
| Proxy | Residential proxy (BrightData, IPRoyal) | ~$10-30/mo |
| Anti-fingerprint | playwright-extra + stealth plugin | Free |
| Parallelism | 2 workers (main + retry) | — |

### Why proxy at this tier

- Rotating IPs prevent any pattern detection
- Residential proxies look like normal home connections
- No need for dedicated IPs — rotation is sufficient

### Playwright proxy config (when needed)

```javascript
const browser = await chromium.launch({
  proxy: {
    server: 'http://proxy.provider.com:port',
    username: 'user',
    password: 'pass'
  }
});
```

---

## Tier 3 — High Volume (100+/day)

**Infrastructure:** Containerized workers, proxy pool, orchestration.

| Component | Solution | Cost |
|-----------|----------|------|
| Workers | N containers (Docker) | ~$15-30/mo each |
| Proxy | Residential proxy pool (rotating) | ~$50-100/mo |
| Anti-fingerprint | Unique browser profiles per session | Free |
| Orchestration | Docker Compose → Kubernetes | Varies |
| Monitoring | Grafana + logs | — |

### Architecture

```
[Supabase Queue]
       │
       ├─ Container 1 (proxy IP-A) → DS-160
       ├─ Container 2 (proxy IP-B) → DS-160
       ├─ Container 3 (proxy IP-C) → DS-160
       └─ Container N (proxy IP-N) → DS-160
```

### Docker setup (future)

```dockerfile
FROM node:20-slim
RUN npx playwright install chromium --with-deps
COPY automation/ /app/automation/
WORKDIR /app
CMD ["node", "automation/run.js"]
```

```yaml
# docker-compose.yml
services:
  worker-main:
    build: .
    environment:
      - WORKER_PRIORITIES=urgent,normal,low
      - PROXY_URL=http://proxy:port
    restart: unless-stopped

  worker-retry:
    build: .
    environment:
      - WORKER_PRIORITIES=retry
      - PROXY_URL=http://proxy:port
    restart: unless-stopped
```

### Dual queue activation

The QueueRunner constructor would accept a `priorities` filter:

```javascript
class QueueRunner {
  constructor({ priorities = null, ...opts }) {
    this.priorityFilter = priorities; // ['retry'] or ['urgent','normal','low']
  }

  async _claimNext() {
    let query = this.supabase.from('applicants')
      .select('id, priority, sort_order')
      .eq('stage', 'ds160')
      .eq('status', 'todo');

    if (this.priorityFilter) {
      query = query.in('priority', this.priorityFilter);
    }
    // ... rest of claim logic
  }
}
```

---

## What is NOT needed

| Approach | Why not |
|----------|---------|
| VPN/Tor | Slow, suspicious IPs, unnecessary |
| Dedicated IP per org | Rotating proxy is sufficient |
| Advanced fingerprint masking | This is legitimate form filling, not scraping |
| Headless browser detection bypass | DS-160 doesn't check for headless |

---

## Decision Matrix

| Volume | Workers | Proxy | Containers | Estimated Cost |
|--------|---------|-------|------------|----------------|
| < 20/day | 1 | None | No | ~$5/mo (captcha) |
| 20-100/day | 1-2 | Residential | No | ~$20-40/mo |
| 100+/day | 3+ | Pool | Yes (Docker) | ~$100-200/mo |

---

## Current Status

**Tier 1** — Single worker, no proxy, CapMonster captcha.
The data model (stage/status/priority) already supports Tier 2-3 without schema changes.
