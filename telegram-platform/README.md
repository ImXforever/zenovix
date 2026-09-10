# telegram-platform/ — the live Telegram bot & TWA sources (reference copies)

These are the Telegram-facing sources from the **AGI platform** repo
(github.com/ImXforever/AGI) — the parts that power:

| File | Role |
|---|---|
| `telegram.py` | the bot channel — customer conversations, menu rendering, message delivery |
| `admin_commands.py` | the **admin bot** — managers change any business variable from chat (`/admin`) |
| `webhooks.py` | the gateway — `/tg/webhook`, WhatsApp & email inbound |
| `public_site.py` | the public API — `/api/public/*` (what the widget calls) |
| `twa.html` | the **Telegram Web App** — the admin panel inside Telegram (menu button) |

## The built-in bot (backend/telegram_bot.py)

The lightweight brain now ships **its own Telegram channel** — `backend/telegram_bot.py` —
wired into the same backend that serves the website. It needs no extra dependency and
activates itself when `TELEGRAM_BOT_TOKEN` is set. The files below remain the reference
for the **full AGI platform's** richer bot (admin variable editing, TWA panel, WhatsApp).

## Where to edit bot tools

The **live deployment** builds from the AGI repository, not from this folder.
To add or change bot tools:

1. Edit the file in the **AGI repo** (github.com/ImXforever/AGI)
2. Commit → Railway auto-deploys the brain
3. This folder is a snapshot for offline reference — refresh it when convenient

They are kept here so this repository remains the single place that documents
the whole Zenovix surface (site widget + backend + bot platform).
