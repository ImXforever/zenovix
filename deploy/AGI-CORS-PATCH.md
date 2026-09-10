# AGI CORS patch (NOTE: the current Flask backend on Railway already ships correct CORS —
# this file matters only if you later swap the brain for the full AGI platform)

The site widget calls the brain cross-origin, so the AGI FastAPI app needs CORS.

`agi-main-patched.py` in this folder is a copy of the AGI repo's `app/main.py`
with the patch already applied. Copy it into the **AGI repository** as
`app/main.py` and commit — Railway auto-deploys it.

What was added (right after `app.add_middleware(RequestContextMiddleware)`):

```python
import os as _os
from fastapi.middleware.cors import CORSMiddleware

_allowed = [
    o.strip() for o in _os.getenv(
        "ALLOWED_ORIGINS", "https://zenovix.ae,https://www.zenovix.ae"
    ).split(",") if o.strip()
]
if _allowed:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
        max_age=86400,
    )
```

Then set in Railway (AGI service → Variables):

```
ALLOWED_ORIGINS=https://zenovix.ae,https://www.zenovix.ae
```

Full walkthrough: `docs/deployment-guide.html` (Phase 1).

---

**Status (Sep 10, 2026):** the live backend at `https://zenovix-production.up.railway.app` was probed with an
OPTIONS preflight from `https://zenovix.ae` and already returns the correct
`access-control-allow-origin` headers. No action needed for the current deployment.
