# Backend status — Zenovix Chat

**Live brain URL:** `https://zenovix-production.up.railway.app`
**Verified:** September 10, 2026

| Check | Result |
|---|---|
| `GET /health` | `{"kb_entries":13,"ok":true,"service":"zenovix-chat-api"}` ✅ |
| `GET /api/public/site` | tenant Zenovix · version 1.6.0 · 6 services ✅ |
| `GET /api/public/catalog?lang=fa` | 6 items, Persian names ✅ |
| `POST /api/public/enquiry` | `201 {"reference":"ZX-…"}` ✅ |
| CORS preflight (Origin: zenovix.ae) | `access-control-allow-origin` present ✅ |
| Widget end-to-end test (headless) | LIVE badge · 6 services · order → `ZX-15B034DD` ✅ |

All embed samples in this package use this URL. If the backend address ever changes,
update the two URLs (`api`, `apiBase`) in the site's embed code and re-verify with:

```bash
curl https://NEW-URL/health
```
