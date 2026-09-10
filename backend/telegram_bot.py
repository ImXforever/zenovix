"""Telegram channel for the Zenovix brain — stdlib only, no new dependencies.

Activates automatically when TELEGRAM_BOT_TOKEN is set in the environment.
The same knowledge base, catalog, ZX references and admin panel serve both
the website widget and Telegram — one brain, two channels.

Setup (Railway):
  1) @BotFather -> /newbot -> copy the token into TELEGRAM_BOT_TOKEN
  2) put manager Telegram user IDs into TELEGRAM_ADMIN_IDS (comma separated)
  3) choose any random TELEGRAM_WEBHOOK_SECRET
  4) after deploy, open ONCE:  https://<app>/tg/set-webhook/<secret>

Admins get every order/ticket instantly and can run /stats and /leads.
"""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.request
import uuid
from typing import Any, Callable

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "zenovix-tg").strip()
_API = os.environ.get("TELEGRAM_API_BASE", "https://api.telegram.org").rstrip("/")
ADMIN_IDS: list[int] = []
for _raw in os.environ.get("TELEGRAM_ADMIN_IDS", "").replace(";", ",").split(","):
    _raw = _raw.strip()
    if _raw.lstrip("-").isdigit():
        ADMIN_IDS.append(int(_raw))

# flows are kept in memory (single web dyno); a restart simply resets dialogs
_FLOWS: dict[int, dict[str, Any]] = {}
_LANGS: dict[int, str] = {}
_LOCK = threading.Lock()


def configured() -> bool:
    return bool(TOKEN)


def _api(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    req = urllib.request.Request(
        f"{_API}/bot{TOKEN}/{method}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_message(chat_id: int | str, text: str, keyboard: list[list[dict]] | None = None) -> None:
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text[:4000],
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    try:
        _api("sendMessage", payload)
    except Exception:
        pass  # Telegram hiccups must never break the request


def _answer_callback(cb_id: str, text: str = "") -> None:
    try:
        _api("answerCallbackQuery", {"callback_query_id": cb_id, "text": text[:190]})
    except Exception:
        pass


def notify_admins(text: str) -> None:
    """Instant push to every manager — synchronous but fail-safe."""
    if not configured():
        return
    for admin in ADMIN_IDS:
        send_message(admin, text)


def set_webhook(base_url: str) -> dict[str, Any]:
    return _api("setWebhook", {"url": base_url, "allowed_updates": ["message", "callback_query"]})


def _menu_keyboard(lang_note: bool = False) -> list[list[dict]]:
    rows = [
        [{"text": "🛒 Products & Prices", "callback_data": "shop"}],
        [{"text": "📋 Request Quote", "callback_data": "quote"}, {"text": "🛠 Technical Support", "callback_data": "support"}],
        [{"text": "🧾 My requests", "callback_data": "myreq"}, {"text": "🌐 Language", "callback_data": "lang"}],
    ]
    if lang_note:
        rows.append([{"text": "❓ What can you do?", "callback_data": "help"}])
    return rows


_WELCOME = (
    "👋 Welcome to <b>Zenovix</b> — the digital operations desk.\n"
    "How can we help you today?\n"
    "━━━━━━━━━━━━━━━━━━━━━━━\n"
    "Pick an option below, or just type your question — I answer in any language."
)


# ---------------------------------------------------------------------------
# update handling — hooks are provided by app.py (the brain)
# ---------------------------------------------------------------------------

_HOOKS: dict[str, Callable] = {}


def register(hooks: dict[str, Callable]) -> None:
    """app.py calls this once at startup with the brain functions."""
    global _HOOKS
    _HOOKS = hooks


def _services_keyboard() -> list[list[dict]]:
    rows: list[list[dict]] = []
    for svc in _HOOKS.get("services", lambda: [])():
        rows.append([{"text": f"{svc.get('icon','•')} {svc.get('name','?')}", "callback_data": f"svc:{svc.get('code','')}"}])
    rows.append([{"text": "⬅️ Back", "callback_data": "start"}])
    return rows


def _service_detail(code: str) -> str:
    for svc in _HOOKS.get("services", lambda: [])():
        if svc.get("code") == code:
            return (
                f"{svc.get('icon','•')} <b>{svc.get('name', code)}</b>\n\n"
                f"{svc.get('title','')}\n\n"
                "💰 Price on request — the commercial team answers with a tailored quote."
            )
    return "Service not found — tap /start to see the menu."


def _start_flow(chat_id: int, flow: str, code: str = "") -> None:
    with _LOCK:
        _FLOWS[chat_id] = {"flow": flow, "code": code}


def _pop_flow(chat_id: int) -> dict[str, Any]:
    with _LOCK:
        return _FLOWS.pop(chat_id, None) or {}


def _ask_quote_service(chat_id: int) -> None:
    send_message(chat_id, "📋 <b>Request a quote</b>\n\nWhich service is it about?", _services_keyboard())


def _fmt_refs(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "🧾 You have no requests yet — everything you order or ask will appear here with its tracking reference."
    lines = ["🧾 <b>Your requests:</b>", ""]
    for r in rows[:8]:
        mark = "✅" if r.get("status") == "approved" else "🕒"
        lines.append(f"{mark} <code>{r.get('reference')}</code> — {r.get('label','')} · {r.get('status','under_review')}")
    lines.append("\nCite any reference any time — /track also works.")
    return "\n".join(lines)


def handle_update(update: dict[str, Any]) -> None:
    """Process one Telegram update — never raises."""
    try:
        _handle(update)
    except Exception:
        pass


def _handle(update: dict[str, Any]) -> None:
    msg = update.get("message") or {}
    cb = update.get("callback_query") or {}

    if cb:
        chat_id = (cb.get("message") or {}).get("chat", {}).get("id")
        if chat_id is None:
            return
        data = str(cb.get("data", ""))
        _answer_callback(cb.get("id", ""))
        _on_callback(chat_id, data)
        return

    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    text = str(msg.get("text", "")).strip()
    if chat_id is None:
        return
    if chat.get("type") not in ("private", "group", "supergroup"):
        return
    sender = msg.get("from") or {}
    first_name = str(sender.get("first_name", "there"))[:60]
    sender_id = int(sender.get("id", 0) or 0)

    # ── commands ──
    if text.startswith("/start"):
        with _LOCK:
            _FLOWS.pop(chat_id, None)
        send_message(chat_id, _WELCOME, _menu_keyboard(lang_note=True))
        return
    if text.startswith("/help"):
        send_message(chat_id, "ℹ️ <b>How it works</b>\n\n• Ask anything — type your question\n• 🛒 browse services & prices\n• 📋 request a quote (tracked ZX reference)\n• 🛠 open a support ticket (TKT reference)\n• 🧾 /track — your requests\n\nA human from the team reviews every quote.", _menu_keyboard())
        return
    if text.startswith("/track") or text.startswith("/my"):
        send_message(chat_id, _fmt_refs(_HOOKS.get("myreqs", lambda cid: [])(chat_id)))
        return
    if text.startswith("/stats") or text.startswith("/admin"):
        if sender_id not in ADMIN_IDS:
            send_message(chat_id, "👔 This command is for the Zenovix team only.")
            return
        if text.startswith("/stats"):
            send_message(chat_id, _HOOKS.get("stats", lambda: "n/a")())
        else:
            send_message(chat_id, _HOOKS.get("recent", lambda n: "no leads yet")(5))
        return

    # ── active dialog flow ──
    flow = _pop_flow(chat_id)
    fkind = flow.get("flow")

    if fkind == "quote_msg":
        flow["message"] = text
        flow["flow"] = "quote_email"
        with _LOCK:
            _FLOWS[chat_id] = flow
        send_message(chat_id, "📧 And the best e-mail to send the quotation to?")
        return

    if fkind == "quote_email":
        email = text.strip().lower()
        ok, err = _HOOKS.get("check", lambda p: (True, ""))({"name": first_name, "email": email, "message": flow.get("message", "")})
        if not ok:
            with _LOCK:
                _FLOWS[chat_id] = flow
            send_message(chat_id, f"⚠️ {err}\nPlease send the e-mail again:")
            return
        ref = _HOOKS.get("enquiry", lambda *a, **k: "ZX-????????")(
            name=first_name, email=email, service=flow.get("code", "Other"),
            message=flow.get("message", ""), chat_id=chat_id,
        )
        send_message(
            chat_id,
            f"✅ <b>Your request <code>{ref}</code> was sent to our commercial team.</b>\n"
            "They will answer by e-mail shortly — cite the reference any time with /track.",
            _menu_keyboard(),
        )
        notify_admins(f"🟢 <b>New order {ref}</b>\n👤 {first_name} (TG · <code>{chat_id}</code>)\n📧 {email}\n🏷 {flow.get('code','Other')}\n💬 {flow.get('message','')[:300]}")
        return

    if fkind == "support_wait":
        ref = _HOOKS.get("ticket", lambda *a, **k: "TKT-??????")(chat_id=chat_id, name=first_name, message=text)
        send_message(
            chat_id,
            f"🎫 <b>Ticket <code>{ref}</code> opened.</b>\nOur technical team is on it — track it any time with /track.",
            _menu_keyboard(),
        )
        notify_admins(f"🎫 <b>New ticket {ref}</b>\n👤 {first_name} (TG · <code>{chat_id}</code>)\n💬 {text[:300]}")
        return

    # ── free text → the same brain as the website ──
    reply = _HOOKS.get("brain", lambda m, s: "How can we help you today?")(text, f"tg:{chat_id}")
    send_message(chat_id, reply, _menu_keyboard() if text.startswith("/") else None)


def _on_callback(chat_id: int | str, data: str) -> None:
    chat_id = int(chat_id)

    if data == "start":
        with _LOCK:
            _FLOWS.pop(chat_id, None)
        send_message(chat_id, _WELCOME, _menu_keyboard(lang_note=True))
        return

    if data == "shop":
        send_message(chat_id, "🛒 <b>Products &amp; services</b>\n\nPick one for details & pricing:", _services_keyboard())
        return

    if data.startswith("svc:"):
        code = data[4:]
        kb = [[{"text": "📋 Request quote", "callback_data": f"quote:{code}"}], [{"text": "⬅️ Services", "callback_data": "shop"}]]
        send_message(chat_id, _service_detail(code), kb)
        return

    if data == "quote":
        _ask_quote_service(chat_id)
        return

    if data.startswith("quote:"):
        code = data[6:]
        name = code
        for svc in _HOOKS.get("services", lambda: [])():
            if svc.get("code") == code:
                name = svc.get("name", code)
        _start_flow(chat_id, "quote_msg", code)
        send_message(chat_id, f"📋 <b>Quote — {name}</b>\n\nDescribe your requirement in one message:")
        return

    if data == "support":
        _start_flow(chat_id, "support_wait")
        send_message(chat_id, "🛠 <b>Technical Support</b>\n\nDescribe the issue in one message — a ticket with a tracking reference opens instantly:")
        return

    if data == "myreq":
        send_message(chat_id, _fmt_refs(_HOOKS.get("myreqs", lambda cid: [])(chat_id)))
        return

    if data == "lang":
        kb = [
            [{"text": "🇬🇧 English", "callback_data": "langset:en"}, {"text": "🇮🇷 فارسی", "callback_data": "langset:fa"}],
            [{"text": "🇸🇦 العربية", "callback_data": "langset:ar"}, {"text": "🇩🇪 Deutsch", "callback_data": "langset:de"}],
        ]
        send_message(chat_id, "🌐 Choose your language — the team answers in it:", kb)
        return

    if data.startswith("langset:"):
        code = data[8:]
        with _LOCK:
            _LANGS[chat_id] = code
        send_message(chat_id, f"🌐 Language saved: <b>{code.upper()}</b> — the team answers in your language.")
        return

    if data == "help":
        send_message(chat_id, "ℹ️ <b>How it works</b>\n\n• Type any question — instant answers\n• 📋 quotes carry a tracked ZX reference\n• 🛠 tickets carry a TKT reference\n• 👔 a human reviews every quote\n• /track — your requests", _menu_keyboard())
        return

    send_message(chat_id, "Hmm, that button expired — tap /start for the fresh menu.")
