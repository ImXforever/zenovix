/*!
 * ███████ Zenovix Chat Widget v3.2.0 — "Bot Parity + Voice" (Xbot TTS/STT/track port) ███████
 * License: MIT — see LICENSE
 * EXACT parity with the real AGI platform bot (app/core/orchestrator.py +
 * shop_flow.py + translations.py + languages.py):
 *
 *   ✓ Welcome/Help/pricing/quote/contact/FAQ texts — verbatim from the platform
 *   ✓ Main menu 4 rows: Shop / Quote+Support / Contact+Help / MyRequests+Language
 *   ✓ Sub-menus with Back: quote · support (ticket+FAQ+emergency) · contact
 *     (call/email/location/hours) · help — exactly like _section_rows()
 *   ✓ Shop flow: product → qty (stepper + custom) → confirmation summary →
 *     [Send request] → Q-ref → "sent to commercial team" → HITL manager →
 *     platform approved/rejected texts with summary (shop_flow.py parity)
 *   ✓ My Requests: "Your recent requests:" + ✅/✖/⏳ badges (my_requests_text)
 *   ✓ Emergency template + FAQ + Talk-to-sales (orchestrator templates)
 *   ✓ Language picker: all 21 platform languages, flags, 2 per row
 *     (languages.py SUPPORTED_MENU_LANGUAGES) · en/fa/ar full UI · RTL
 *   ✓ Commands: /start /lang /prices /support /quote /contact /help
 *   ✓ LIVE mode: /site /catalog /chat /enquiry — the platform public contract
 *   ✓ WhatsApp realism: ticks, typing, doodle wallpaper, presence, unread
 *     badge + sounds, emoji picker, reactions, mobile fullscreen
 *
 * Template lineage: AGI repo → web/_build_site.py → ZenovixFront.html → v3.1
 * One file, zero dependencies.
 *
 * ── Embed (two lines) ─────────────────────────────────────────────────
 *   <script>window.ZenovixChat = { api: "https://SERVER/api/chat" };</script>
 *   <script src="/js/zenovix-chat.js" defer></script>
 *
 * ── Options (window.ZenovixChat OR data-* attrs) ──────────────────────
 *   api       → chat endpoint (POST {message,session} → {reply,session})
 *   apiBase   → AGI/cPanel public API base (…/api/public) → LIVE mode
 *   lang      → any of the 21 codes  ("en" default)
 *   theme     → "dark" | "light"     askName → onboarding (default false, like the bot)
 *   title / subtitle / buttonText / avatarText / greeting / footer
 *   email / phone / whatsappLink / sound / encryption
 *
 * JS API: ZenovixChatAPI.open/close/toggle/send/reset/setLang/openCatalog
 */
(function () {
  "use strict";
  if (window.__zxcLoaded) { return; }
  window.__zxcLoaded = true;

  /* ═══════════════════════ 1. CONFIG ═══════════════════════ */
  var scriptEl = document.currentScript ||
    (function () { var s = document.getElementsByTagName("script"); return s[s.length - 1]; })();
  var ds = (scriptEl && scriptEl.dataset) ? scriptEl.dataset : {};
  var g = window.ZenovixChat || {};

  function pick(key, dsKey, dflt) {
    if (g && typeof g[key] !== "undefined" && g[key] !== "") { return g[key]; }
    if (dsKey && ds[dsKey] !== undefined && ds[dsKey] !== "") { return ds[dsKey]; }
    if (ds[key] !== undefined && ds[key] !== "") { return ds[key]; }
    return dflt;
  }

  var CFG = {
    api:         String(pick("api", "zxApi", "/api/chat")).replace(/\/+$/, ""),
    apiBase:     String(pick("apiBase", "zxApiBase", "")).replace(/\/+$/, ""),
    lang:        pick("lang", "zxLang", "en"),
    theme:       pick("theme", "zxTheme", "dark") === "light" ? "light" : "dark",
    askName:     String(pick("askName", "zxAskName", "false")) !== "false",
    title:       pick("title", "zxTitle", "Zenovix"),
    subtitle:    pick("subtitle", "zxSubtitle", "Digital Operations Desk"),
    greeting:    pick("greeting", "zxGreeting", ""),
    buttonText:  pick("buttonText", "zxButtonText", "Ask Zenovix"),
    footer:      pick("footer", "zxFooter", ""),
    email:       pick("email", "zxEmail", "studio@zenovix.com"),
    phone:       pick("phone", "zxPhone", "+971 4570 1100"),
    whatsappLink: pick("whatsappLink", "zxWhatsapp", "https://wa.me/97145701100"),
    avatarText:  pick("avatarText", "zxAvatar", "Z"),
    sound:       String(pick("sound", "zxSound", "true")) !== "false",
    encryption:  String(pick("encryption", "zxEncryption", "true")) !== "false",
    tts:         String(pick("tts", "zxTts", "true")) !== "false",
    stt:         String(pick("stt", "zxStt", "true")) !== "false"
  };

  /* ═══ 1.5 VOICE — TTS/STT (Xbot LaunchBot port · Web Speech parity of edge-tts UX) ═══ */
  var LANG_BCP = { en: "en-US", fa: "fa-IR", ar: "ar-SA", tr: "tr-TR", ru: "ru-RU", zh: "zh-CN", ja: "ja-JP",
    ko: "ko-KR", hi: "hi-IN", nl: "nl-NL", uk: "uk-UA", sv: "sv-SE", id: "id-ID", ms: "ms-MY", vi: "vi-VN",
    he: "he-IL", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", pt: "pt-PT" };
  var TTS_OK = CFG.tts && typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
  var ttsPref = false;
  try { ttsPref = localStorage.getItem("zxc_tts") === "1"; } catch (e) {}
  function speechPlain(text, rich) {
    var raw = text || "";
    if (!raw && rich) {
      var dv = document.createElement("div");
      dv.innerHTML = rich;
      raw = dv.textContent || "";
    }
    raw = String(raw).replace(/[\uD800-\uDFFF\u2600-\u27BF\u2190-\u21FF\uFE0F\u200D]/g, " ");
    return raw.replace(/\s+/g, " ").trim().slice(0, 1200);
  }
  function speakNow(text, rich) {
    if (!TTS_OK) { return; }
    var s = speechPlain(text, rich);
    if (!s) { return; }
    try {
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(s);
      u.lang = LANG_BCP[S.lang] || "en-US";
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function stopSpeak() {
    if (!TTS_OK) { return; }
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  function addSayBtn(m, plain) {
    var meta = m.wrap ? m.wrap.querySelector(".zxc-meta") : null;
    if (!meta || meta.querySelector(".zxc-say")) { return; }
    var b = el("button", "zxc-say");
    b.type = "button";
    b.innerHTML = icon("spk", 12);
    b.setAttribute("aria-label", "Read aloud");
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      speakNow(plain);
    });
    meta.insertBefore(b, meta.firstChild);
  }

  /* ═══════════════════════ 2. ICONS ═══════════════════════ */
  var P = {
    send:   '<path d="M3.4 20.4l17.4-8.4L3.4 3.6 3.3 10l12 2-12 2z" fill="currentColor" stroke="none"/>',
    spk:    '<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute:   '<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/>',
    close:  '<path d="M6 6l12 12M18 6L6 18"/>',
    back:   '<path d="M19 12H6"/><path d="M11 6l-6 6 6 6"/>',
    video:  '<rect x="3" y="6" width="12" height="12" rx="3"/><path d="M15 10.5l6-3.5v10l-6-3.5"/>',
    phone:  '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    dots:   '<circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>',
    mic:    '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
    clip:   '<path d="M8.5 12l6.2-6.2a3.6 3.6 0 0 1 5.1 5.1l-8.3 8.3a5.2 5.2 0 0 1-7.4-7.4L12 3.9"/>',
    smile:  '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.6 4.6 0 0 0 7 0"/><circle cx="9" cy="9.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9.6" r="1.1" fill="currentColor" stroke="none"/>',
    down:   '<path d="M6 10l6 6 6-6"/>',
    mail:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    refresh:'<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.5 3.5v5h-5"/>',
    lock:   '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bell:   '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
    check1: '<path d="M4 12.6l4.4 4.4L19 6.4"/>',
    check2: '<path d="M2.5 13l4.2 4.2L15.5 7"/><path d="M10.3 16.6l1.4 1.4L21.5 7"/>',
    wa:     '<path fill="currentColor" stroke="none" d="M16 3C9 3 3.4 8.6 3.4 15.6c0 2.4.7 4.7 1.9 6.7L3 29l6.9-2.2c1.9 1 4 1.6 6.1 1.6 7 0 12.6-5.6 12.6-12.6S23 3 16 3zm0 22.9c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.3 1.3-3.9-.3-.4a10.3 10.3 0 1 1 8.9 4.7zm5.7-7.7c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.4 8.4 0 0 1-4.2-3.7c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4l-.5-.3z"/>',
    verified:'<circle cx="12" cy="12" r="10" fill="#53BDEB" stroke="none"/><path d="M7.8 12.6l2.6 2.6 5.8-6" stroke="#111B21" stroke-width="2.1" fill="none"/>'
  };
  function icon(name, size, sw) {
    var vb = name === "wa" ? "0 0 32 32" : "0 0 24 24";
    return '<svg width="' + size + '" height="' + size + '" viewBox="' + vb + '" fill="none" ' +
      'stroke="currentColor" stroke-width="' + (sw || 1.7) + '" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + P[name] + "</svg>";
  }

  /* ═══════════════════════ 3. STYLES ═══════════════════════ */
  var FF = "-apple-system,'Segoe UI','Helvetica Neue',Helvetica,'Noto Sans',Roboto,Arial,sans-serif";
  var DOODLE_DARK, DOODLE_LIGHT;
  (function () {
    var tile =
      "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'>" +
      "<g fill='none' stroke='__C__' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>" +
      "<circle cx='34' cy='42' r='10'/><path d='M31 42l2.5 2.5L38 39.5'/>" +
      "<path d='M128 26l6 12 13 2-9.5 9 2.3 13-11.8-6.2L116.2 62l2.3-13-9.5-9 13-2z'/>" +
      "<path d='M196 46c-6.5-8.5-19-4-19 5.2 0 7.3 10.5 13.5 19 20 8.5-6.5 19-12.7 19-20 0-9.2-12.5-13.7-19-5.2z'/>" +
      "<path d='M40 132h30v22H56l-9 9v-9h-7z'/>" +
      "<circle cx='208' cy='158' r='13'/><path d='M203 161.5a5.4 5.4 0 0 0 10 0'/>" +
      "<path d='M92 202h38v24h-15l-10 10v-10h-13z'/>" +
      "<path d='M152 108l11 11 19-19'/>" +
      "<path d='M20 214c9-11 27-11 36 0'/><circle cx='164' cy='224' r='8'/>" +
      "<path d='M232 96h24v18h-9l-7 7v-7h-8z'/>" +
      "<path d='M70 80l7 7 12-12'/></g></svg>";
    DOODLE_DARK  = "url(\"data:image/svg+xml," + encodeURIComponent(tile.replace("__C__", "rgba(255,255,255,0.05)")) + "\")";
    DOODLE_LIGHT = "url(\"data:image/svg+xml," + encodeURIComponent(tile.replace("__C__", "rgba(17,27,33,0.05)")) + "\")";
  })();

  var CSS =
    /* theme vars */
    ".zxc-panel{--zxc-chatbg:#0B141A;--zxc-head:#202C33;--zxc-panelbg:#111B21;--zxc-in:#202C33;" +
    "--zxc-out:#005C4B;--zxc-ink:#E9EDEF;--zxc-dim:#8696A0;--zxc-line:rgba(134,150,160,.16);" +
    "--zxc-inputbg:#2A3942;--zxc-hover:#202C33;--zxc-green:#25D366;--zxc-teal:#00A884;" +
    "--zxc-amber:#ffb84d;--zxc-red:#ff5b74;--zxc-lilac:#C7A9F5;--zxc-blue:#53BDEB}" +
    ".zxc-panel[data-theme='light']{--zxc-chatbg:#ECE5DD;--zxc-head:#F0F2F5;--zxc-panelbg:#FFFFFF;" +
    "--zxc-in:#FFFFFF;--zxc-out:#D9FDD3;--zxc-ink:#111B21;--zxc-dim:#667781;" +
    "--zxc-line:rgba(17,27,33,.12);--zxc-inputbg:#FFFFFF;--zxc-hover:rgba(17,27,33,.05)}" +
    /* FAB */
    ".zxc-fab{position:fixed;right:22px;bottom:24px;z-index:99995;display:inline-flex;align-items:center;gap:10px;" +
    "padding:13px 20px 13px 16px;border-radius:999px;border:0;color:#fff;cursor:pointer;background:#00A884;" +
    "font:600 .95rem " + FF + ";box-shadow:0 10px 28px rgba(0,0,0,.35);transition:transform .22s ease,background .2s}" +
    ".zxc-fab:hover{transform:translateY(-2px);background:#008f72}" +
    ".zxc-fab svg{flex:none}" +
    ".zxc-fab .zxc-dot{width:9px;height:9px;border-radius:50%;background:#9ff3bd;box-shadow:0 0 0 4px rgba(159,243,189,.22);animation:zxc-pulse 2.2s infinite}" +
    "@keyframes zxc-pulse{0%,100%{box-shadow:0 0 0 3px rgba(159,243,189,.25)}55%{box-shadow:0 0 0 7px rgba(159,243,189,.06)}}" +
    ".zxc-badge{position:absolute;top:-6px;left:-6px;min-width:22px;height:22px;border-radius:999px;background:#25D366;color:#08301f;" +
    "font:700 12px/22px " + FF + ";text-align:center;padding:0 5px;box-shadow:0 3px 10px rgba(0,0,0,.35);display:none}" +
    ".zxc-badge.zxc-show{display:block;animation:zxc-pop-in .25s ease}" +
    "@keyframes zxc-pop-in{from{transform:scale(.4)}to{transform:scale(1)}}" +
    /* panel */
    ".zxc-panel{position:fixed;right:22px;bottom:90px;z-index:99996;width:min(408px,calc(100vw - 32px));" +
    "height:min(660px,calc(100svh - 120px));display:none;flex-direction:column;overflow:hidden;text-align:start;" +
    "background:var(--zxc-panelbg);color:var(--zxc-ink);border:1px solid var(--zxc-line);border-radius:18px;" +
    "box-shadow:0 24px 70px rgba(0,0,0,.5);font:15px/1.45 " + FF + ";" +
    "transform-origin:100% 100%;animation:zxc-open-anim .2s cubic-bezier(.2,.9,.3,1.2)}" +
    ".zxc-panel.zxc-open{display:flex}" +
    "@keyframes zxc-open-anim{from{opacity:0;transform:scale(.85) translateY(14px)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.zxc-panel{animation:none}.zxc-badge.zxc-show{animation:none}}" +
    /* header */
    ".zxc-head{display:flex;align-items:center;gap:11px;padding:10px 14px;background:var(--zxc-head);" +
    "border-bottom:1px solid var(--zxc-line);flex:none}" +
    ".zxc-back{display:none;background:none;border:0;color:var(--zxc-dim);cursor:pointer;padding:4px;margin-left:-6px}" +
    ".zxc-av{position:relative;width:40px;height:40px;border-radius:50%;flex:none;display:flex;align-items:center;" +
    "justify-content:center;font-weight:700;font-size:17px;color:#fff;background:linear-gradient(135deg,#00A884,#005C4B)}" +
    ".zxc-av i{position:absolute;right:0;bottom:0;width:11px;height:11px;border-radius:50%;background:#25D366;" +
    "border:2.5px solid var(--zxc-head)}" +
    ".zxc-av i.zxc-away{background:#F2A33C}" +
    ".zxc-id{min-width:0}" +
    ".zxc-name{display:flex;align-items:center;gap:5px;font-weight:700;font-size:15px;color:var(--zxc-ink);white-space:nowrap}" +
    ".zxc-mode{font-size:9.5px;font-weight:700;letter-spacing:.06em;border-radius:6px;padding:1.5px 6px;" +
    "background:rgba(0,168,132,.18);color:#00A884;border:1px solid rgba(0,168,132,.4)}" +
    ".zxc-mode.zxc-live{background:rgba(83,189,235,.15);color:var(--zxc-blue);border-color:rgba(83,189,235,.4)}" +
    ".zxc-status{font-size:12px;color:var(--zxc-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".zxc-status.zxc-typing{color:#25D366;font-style:italic}" +
    ".zxc-hactions{margin-left:auto;display:flex;align-items:center;gap:1px;flex:none}" +
    ".zxc-hactions button{background:none;border:0;color:var(--zxc-dim);cursor:pointer;padding:7px;border-radius:50%;" +
    "font-size:16px;line-height:1;transition:background .15s;position:relative}" +
    ".zxc-hactions button:hover{background:var(--zxc-hover)}" +
    ".zxc-hactions .zxc-mini{position:absolute;top:-1px;right:-1px;min-width:15px;height:15px;border-radius:99px;" +
    "background:var(--zxc-red);color:#fff;font:700 9px/15px " + FF + ";padding:0 3px;display:none}" +
    ".zxc-hactions .zxc-mini.zxc-show{display:block}" +
    /* body + screens */
    ".zxc-body{flex:1;min-height:0;display:flex}" +
    ".zxc-scr{flex:1;min-width:0;display:none;flex-direction:column}" +
    ".zxc-scr.zxc-on{display:flex}" +
    /* chat log */
    ".zxc-log{flex:1;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:2.5px;padding:14px 12px 8px;" +
    "background-color:var(--zxc-chatbg);background-image:" + DOODLE_DARK + ";scroll-behavior:smooth}" +
    ".zxc-panel[data-theme='light'] .zxc-log{background-image:" + DOODLE_LIGHT + "}" +
    ".zxc-log::-webkit-scrollbar{width:6px}.zxc-log::-webkit-scrollbar-thumb{background:rgba(134,150,160,.3);border-radius:99px}" +
    ".zxc-sys{align-self:center;max-width:88%;background:var(--zxc-head);color:var(--zxc-dim);border-radius:10px;" +
    "padding:7px 12px;font-size:12px;line-height:1.5;text-align:center;margin:3px 0;box-shadow:0 1px 2px rgba(0,0,0,.25)}" +
    ".zxc-sys svg{vertical-align:-3px;margin-right:4px;opacity:.8}" +
    ".zxc-date{align-self:center;color:var(--zxc-dim);background:var(--zxc-head);border-radius:8px;padding:5px 12px;" +
    "font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:4px 0 6px;box-shadow:0 1px 2px rgba(0,0,0,.25)}" +
    ".zxc-unread{display:flex;align-items:center;gap:8px;color:#00A884;font-size:11.5px;font-weight:700;" +
    "letter-spacing:.05em;text-transform:uppercase;margin:7px 0}" +
    ".zxc-unread::before,.zxc-unread::after{content:'';flex:1;height:1px;background:rgba(0,168,132,.4)}" +
    /* bubbles */
    ".zxc-msg{position:relative;max-width:86%;padding:2px 0;animation:zxc-msg-in .18s ease-out}" +
    "@keyframes zxc-msg-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}" +
    "@media (prefers-reduced-motion:reduce){.zxc-msg{animation:none}}" +
    ".zxc-msg.zxc-in{align-self:flex-start;margin-right:auto}" +
    ".zxc-msg.zxc-out{align-self:flex-end;margin-left:auto}" +
    ".zxc-bubble{position:relative;padding:7px 9px 8px 10px;border-radius:9px;font-size:14.2px;line-height:1.5;" +
    "color:var(--zxc-ink);word-wrap:break-word;overflow-wrap:anywhere;box-shadow:0 1px 1.5px rgba(0,0,0,.22)}" +
    ".zxc-in .zxc-bubble{background:var(--zxc-in);border-top-left-radius:3px}" +
    ".zxc-out .zxc-bubble{background:var(--zxc-out);border-top-right-radius:3px}" +
    ".zxc-panel[data-theme='light'] .zxc-in .zxc-bubble{border:1px solid rgba(17,27,33,.08)}" +
    ".zxc-in .zxc-bubble::before{content:'';position:absolute;top:0;left:-7.5px;width:9px;height:13px;" +
    "background:var(--zxc-in);clip-path:polygon(100% 0,100% 100%,0 0)}" +
    ".zxc-out .zxc-bubble::before{content:'';position:absolute;top:0;right:-7.5px;width:9px;height:13px;" +
    "background:var(--zxc-out);clip-path:polygon(0 0,0 100%,100% 0)}" +
    ".zxc-bubble a{color:#53BDEB;text-decoration:underline;word-break:break-all}" +
    ".zxc-bubble .zxc-g{color:var(--zxc-lilac);font-weight:700}" +
    ".zxc-meta{display:flex;align-items:center;justify-content:flex-end;gap:3px;float:right;margin:7px -3px -3px 10px;" +
    "font-size:11px;color:var(--zxc-dim);user-select:none}" +
    ".zxc-out .zxc-meta{color:rgba(233,237,239,.62)}" +
    ".zxc-panel[data-theme='light'] .zxc-out .zxc-meta{color:rgba(17,27,33,.45)}" +
    ".zxc-tick{display:inline-flex;color:var(--zxc-dim)}" +
    ".zxc-tick.zxc-read{color:#53BDEB}" +
    /* typing */
    ".zxc-typing .zxc-bubble{padding:11px 14px;display:inline-flex;gap:5px;align-items:center}" +
    ".zxc-typing span{width:7px;height:7px;border-radius:50%;background:var(--zxc-dim);display:inline-block;" +
    "animation:zxc-dot 1.2s infinite}" +
    ".zxc-typing span:nth-child(2){animation-delay:.15s}.zxc-typing span:nth-child(3){animation-delay:.3s}" +
    "@keyframes zxc-dot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}" +
    /* reactions */
    ".zxc-reactbar{position:absolute;top:-14px;right:6px;z-index:3;display:none;gap:2px;background:var(--zxc-head);" +
    "border:1px solid var(--zxc-line);border-radius:999px;padding:3px 5px;box-shadow:0 6px 18px rgba(0,0,0,.35)}" +
    ".zxc-msg.zxc-in:hover .zxc-reactbar,.zxc-msg.zxc-out:hover .zxc-reactbar{display:flex}" +
    ".zxc-reactbar button{background:none;border:0;font-size:15px;cursor:pointer;padding:2px 3px;border-radius:50%;" +
    "transition:transform .12s}" +
    ".zxc-reactbar button:hover{transform:scale(1.35)}" +
    ".zxc-react{position:absolute;bottom:-11px;right:8px;background:var(--zxc-head);border:1px solid var(--zxc-line);" +
    "border-radius:999px;padding:1px 7px;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);z-index:2}" +
    /* inline keyboard (bot buttons inside a bubble) */
    ".zxc-ikb{display:flex;flex-direction:column;gap:5px;margin-top:7px}" +
    ".zxc-ikb .zxc-row{display:flex;gap:5px}" +
    ".zxc-ikb button{flex:1;background:rgba(0,168,132,.10);border:1px solid rgba(0,168,132,.45);color:var(--zxc-ink);" +
    "border-radius:8px;padding:8px 6px;font:600 12.8px " + FF + ";cursor:pointer;transition:background .15s;" +
    "text-align:center;min-height:34px}" +
    ".zxc-ikb button:hover{background:rgba(0,168,132,.22)}" +
    ".zxc-ikb button:disabled{opacity:.5;cursor:wait}" +
    ".zxc-ikb button.zxc-primary{background:var(--zxc-teal);border-color:var(--zxc-teal);color:#fff;font-weight:700}" +
    ".zxc-ikb button.zxc-ok{background:rgba(37,211,102,.14);border-color:rgba(37,211,102,.55)}" +
    ".zxc-ikb button.zxc-danger{background:rgba(255,91,116,.12);border-color:rgba(255,91,116,.5)}" +
    ".zxc-receipt{font-size:12px;color:var(--zxc-dim);margin-top:6px}" +
    /* quick replies */
    ".zxc-sug{display:flex;gap:7px;flex-wrap:wrap;padding:8px 12px 4px;flex:none}" +
    ".zxc-sug button{background:var(--zxc-panelbg);border:1.5px solid #00A884;color:#00A884;border-radius:999px;" +
    "padding:7px 13px;font:600 12.5px " + FF + ";cursor:pointer;transition:all .15s;box-shadow:0 1px 2px rgba(0,0,0,.2)}" +
    ".zxc-sug button:hover{background:rgba(0,168,132,.12)}" +
    /* composer */
    ".zxc-ttsbtn{position:fixed;right:22px;bottom:88px;z-index:99995;width:46px;height:46px;border-radius:50%;" +
    "border:1px solid rgba(134,150,160,.4);background:var(--zxc-panelbg);color:var(--zxc-dim);display:flex;align-items:center;" +
    "justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.22);transition:.15s;padding:0}" +
    ".zxc-ttsbtn:hover{transform:translateY(-2px)}" +
    ".zxc-ttsbtn.zxc-on{background:#00A884;border-color:#008f72;color:#fff}" +
    ".zxc-msg .zxc-say{background:none;border:0;padding:0;margin:0 6px;color:inherit;opacity:.5;cursor:pointer;display:inline-flex;vertical-align:middle}" +
    ".zxc-msg .zxc-say:hover{opacity:1}" +
    ".zxc-comp>button.zxc-mic.zxc-rec{color:#FF6B6B}" +
    ".zxc-comp{display:flex;align-items:flex-end;gap:6px;padding:8px 9px;background:var(--zxc-panelbg);flex:none;" +
    "border-top:1px solid var(--zxc-line)}" +
    ".zxc-comp>button{background:none;border:0;color:var(--zxc-dim);width:40px;height:40px;border-radius:50%;" +
    "cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;transition:background .15s}" +
    ".zxc-comp>button:hover{background:var(--zxc-hover)}" +
    ".zxc-comp>button.zxc-sendbtn{background:#00A884;color:#fff}" +
    ".zxc-comp>button.zxc-sendbtn:hover{background:#008f72}" +
    ".zxc-comp input{flex:1;min-width:0;height:44px;border:0;border-radius:999px;padding:0 16px;background:var(--zxc-inputbg);" +
    "color:var(--zxc-ink);font:14.5px " + FF + ";outline:none}" +
    ".zxc-comp input::placeholder{color:var(--zxc-dim)}" +
    /* emoji picker */
    ".zxc-emoji{position:absolute;left:10px;bottom:70px;z-index:6;background:var(--zxc-head);border:1px solid var(--zxc-line);" +
    "border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.45);padding:9px;display:none;grid-template-columns:repeat(8,1fr);gap:2px}" +
    ".zxc-emoji.zxc-show{display:grid;animation:zxc-open-anim .15s ease-out}" +
    ".zxc-emoji button{background:none;border:0;font-size:19px;cursor:pointer;padding:4px;border-radius:8px}" +
    ".zxc-emoji button:hover{background:var(--zxc-hover)}" +
    /* scroll-down pill */
    ".zxc-scrolldown{position:absolute;right:14px;bottom:76px;z-index:5;width:40px;height:40px;border-radius:50%;" +
    "background:var(--zxc-head);border:1px solid var(--zxc-line);color:var(--zxc-dim);cursor:pointer;display:none;" +
    "align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.35)}" +
    ".zxc-scrolldown.zxc-show{display:flex}" +
    ".zxc-scrolldown .zxc-n{position:absolute;top:-6px;right:-4px;min-width:18px;height:18px;border-radius:99px;" +
    "background:#25D366;color:#08301f;font:700 11px/18px " + FF + ";padding:0 4px;display:none}" +
    ".zxc-scrolldown .zxc-n.zxc-show{display:block}" +
    /* dropdown menu */
    ".zxc-menu{position:absolute;top:56px;right:10px;z-index:7;background:var(--zxc-head);border:1px solid var(--zxc-line);" +
    "border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.45);min-width:235px;overflow:hidden;display:none}" +
    ".zxc-menu.zxc-show{display:block;animation:zxc-open-anim .14s ease-out}" +
    ".zxc-menu button{display:flex;align-items:center;gap:11px;width:100%;background:none;border:0;color:var(--zxc-ink);" +
    "font:14px " + FF + ";padding:12px 15px;cursor:pointer;text-align:start}" +
    ".zxc-menu button:hover{background:var(--zxc-hover)}" +
    ".zxc-menu svg,.zxc-menu .zxc-e{color:var(--zxc-dim);flex:none;font-style:normal}" +
    /* footer */
    ".zxc-foot{flex:none;font-size:10.5px;color:var(--zxc-dim);text-align:center;padding:5px 14px 8px;background:var(--zxc-panelbg)}" +
    ".zxc-foot svg{vertical-align:-2px;margin-right:3px;opacity:.75}" +
    /* app screens (catalog / orders / support / manager) */
    ".zxc-app{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;" +
    "background-color:var(--zxc-chatbg);background-image:" + DOODLE_DARK + "}" +
    ".zxc-panel[data-theme='light'] .zxc-app{background-image:" + DOODLE_LIGHT + "}" +
    ".zxc-app::-webkit-scrollbar{width:6px}.zxc-app::-webkit-scrollbar-thumb{background:rgba(134,150,160,.3);border-radius:99px}" +
    ".zxc-card{background:var(--zxc-in);border:1px solid var(--zxc-line);border-radius:13px;padding:11px 13px;" +
    "box-shadow:0 1px 2px rgba(0,0,0,.18)}" +
    ".zxc-card h4{margin:0 0 4px;font-size:13.5px;color:var(--zxc-ink);display:flex;align-items:center;gap:7px;flex-wrap:wrap}" +
    ".zxc-card p{margin:0;font-size:12.3px;color:var(--zxc-dim);line-height:1.55}" +
    ".zxc-card .zxc-price{font-weight:700;color:var(--zxc-lilac)}" +
    ".zxc-card .zxc-code{color:var(--zxc-dim);font-size:11px;letter-spacing:.04em}" +
    ".zxc-rowb{display:flex;gap:6px;margin-top:9px}" +
    ".zxc-rowb button{flex:1;border-radius:8px;padding:8px 6px;font:600 12.3px " + FF + ";cursor:pointer;" +
    "background:rgba(0,168,132,.10);border:1px solid rgba(0,168,132,.45);color:var(--zxc-ink)}" +
    ".zxc-rowb button:hover{background:rgba(0,168,132,.22)}" +
    ".zxc-rowb button.zxc-ok{background:rgba(37,211,102,.14);border-color:rgba(37,211,102,.55)}" +
    ".zxc-rowb button.zxc-danger{background:rgba(255,91,116,.12);border-color:rgba(255,91,116,.5)}" +
    ".zxc-pill{display:inline-block;font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap}" +
    ".zxc-pill.zxc-pend{background:rgba(255,184,77,.14);color:var(--zxc-amber);border:1px solid rgba(255,184,77,.4)}" +
    ".zxc-pill.zxc-pok{background:rgba(37,211,102,.13);color:#7de9a8;border:1px solid rgba(37,211,102,.4)}" +
    ".zxc-pill.zxc-pno{background:rgba(255,91,116,.13);color:#ff9dab;border:1px solid rgba(255,91,116,.4)}" +
    ".zxc-pill.zxc-pinfo{background:rgba(83,189,235,.13);color:var(--zxc-blue);border:1px solid rgba(83,189,235,.4)}" +
    ".zxc-empty{text-align:center;color:var(--zxc-dim);font-size:13px;padding:26px 12px;line-height:1.7}" +
    ".zxc-sechead{font-size:12.5px;font-weight:700;color:var(--zxc-ink);margin:2px 0 -2px;letter-spacing:.02em}" +
    ".zxc-gradbtn{background:var(--zxc-teal);border:0;color:#fff;border-radius:11px;padding:11px;cursor:pointer;" +
    "font:700 13px " + FF + ";width:100%}" +
    ".zxc-gradbtn:hover{background:#008f72}" +
    /* ticket thread */
    ".zxc-thread{display:flex;flex-direction:column;gap:6px;margin:8px 0}" +
    ".zxc-thread .zxc-t{max-width:88%;padding:8px 11px;border-radius:10px;font-size:12.6px;line-height:1.55;" +
    "overflow-wrap:anywhere}" +
    ".zxc-thread .zxc-t.zxc-me{background:var(--zxc-out);color:var(--zxc-ink);align-self:flex-end}" +
    ".zxc-thread .zxc-t.zxc-them{background:var(--zxc-head);border:1px solid var(--zxc-line);color:var(--zxc-ink);align-self:flex-start}" +
    ".zxc-mini-in{display:flex;gap:6px;margin-top:8px}" +
    ".zxc-mini-in input{flex:1;min-width:0;background:var(--zxc-inputbg);border:1px solid var(--zxc-line);" +
    "border-radius:9px;padding:9px 10px;font:12.8px " + FF + ";color:var(--zxc-ink);outline:none}" +
    ".zxc-mini-in button{background:var(--zxc-teal);border:0;color:#fff;border-radius:9px;padding:0 14px;cursor:pointer;font-size:14px}" +
    /* manager toggle */
    ".zxc-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--zxc-in);" +
    "border:1px solid var(--zxc-line);border-radius:12px;padding:10px 12px;font-size:12.8px}" +
    ".zxc-toggle button{border-radius:999px;border:1px solid var(--zxc-line);background:transparent;color:var(--zxc-ink);" +
    "padding:5px 15px;cursor:pointer;font:700 12px " + FF + "" +
    ";transition:all .15s}" +
    ".zxc-toggle button.zxc-on{background:rgba(37,211,102,.2);border-color:var(--zxc-green);color:#7de9a8}" +
    /* bottom nav */
    ".zxc-nav{display:flex;border-top:1px solid var(--zxc-line);background:var(--zxc-head);flex:none}" +
    ".zxc-nav button{position:relative;flex:1;background:none;border:0;color:var(--zxc-dim);font-family:" + FF + ";" +
    "font-size:10px;padding:7px 2px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;" +
    "transition:color .15s}" +
    ".zxc-nav button .zxc-e{font-size:19px;line-height:1;filter:grayscale(1);opacity:.75;transition:filter .15s}" +
    ".zxc-nav button.zxc-on{color:#00A884}" +
    ".zxc-nav button.zxc-on .zxc-e{filter:none;opacity:1}" +
    ".zxc-nav button.zxc-on::after{content:'';position:absolute;top:0;left:25%;right:25%;height:3px;border-radius:0 0 4px 4px;" +
    "background:#00A884}" +
    ".zxc-nav .zxc-nbdg{position:absolute;top:2px;right:calc(50% - 20px);min-width:17px;height:17px;border-radius:9px;" +
    "background:var(--zxc-red);color:#fff;font:700 10px/17px " + FF + ";padding:0 4px;display:none;z-index:2}" +
    ".zxc-nav .zxc-nbdg.zxc-show{display:block}" +
    /* toast */
    ".zxc-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:104px;z-index:99999;background:#233138;color:#E9EDEF;" +
    "border-radius:10px;padding:11px 17px;font:13.5px " + FF + ";box-shadow:0 10px 30px rgba(0,0,0,.45);max-width:min(430px,88vw);" +
    "text-align:center;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}" +
    ".zxc-toast.zxc-show{opacity:1;transform:translateX(-50%) translateY(-4px)}" +
    /* manager mode chrome */
    ".zxc-panel.zxc-mgr .zxc-head{background:linear-gradient(135deg,#c81e4e,#8A3FE6)}" +
    /* RTL */
    ".zxc-panel[dir='rtl'] .zxc-in .zxc-bubble{border-top-left-radius:9px;border-top-right-radius:3px}" +
    ".zxc-panel[dir='rtl'] .zxc-out .zxc-bubble{border-top-right-radius:9px;border-top-left-radius:3px}" +
    ".zxc-panel[dir='rtl'] .zxc-in .zxc-bubble::before{left:auto;right:-7.5px;clip-path:polygon(0 0,0 100%,100% 0)}" +
    ".zxc-panel[dir='rtl'] .zxc-out .zxc-bubble::before{right:auto;left:-7.5px;clip-path:polygon(100% 0,100% 100%,0 0)}" +
    ".zxc-panel[dir='rtl'] .zxc-menu{right:auto;left:10px}" +
    ".zxc-panel[dir='rtl'] .zxc-emoji{left:auto;right:10px}" +
    ".zxc-panel[dir='rtl'] .zxc-back{margin-left:0;margin-right:-6px}" +
    /* mobile */
    "@media (max-width:540px){" +
    ".zxc-fab{right:16px;bottom:16px;padding:15px}.zxc-fab .zxc-t,.zxc-fab .zxc-dot{display:none}" +
    ".zxc-panel{right:0;bottom:0;width:100vw;height:100dvh;max-height:100dvh;border-radius:0;border:0}" +
    ".zxc-back{display:block}.zxc-msg{max-width:90%}}";

  /* ═══════════════════════ 4. PLATFORM STRINGS (verbatim) ═══════════════════════ */
  /* 21 languages — app/core/languages.py · flags — orchestrator._FLAGS */
  var LANGS = [
    ["en","English","🇬🇧"],["fa","فارسی","🇮🇷"],["ar","العربية","🇸🇦"],["es","Español","🇪🇸"],
    ["fr","Français","🇫🇷"],["de","Deutsch","🇩🇪"],["it","Italiano","🇮🇹"],["pt","Português","🇵🇹"],
    ["tr","Türkçe","🇹🇷"],["ru","Русский","🇷🇺"],["zh","中文","🇨🇳"],["ja","日本語","🇯🇵"],
    ["ko","한국어","🇰🇷"],["hi","हिन्दी","🇮🇳"],["nl","Nederlands","🇳🇱"],["uk","Українська","🇺🇦"],
    ["sv","Svenska","🇸🇪"],["id","Bahasa Indonesia","🇮🇩"],["ms","Melayu","🇲🇾"],["vi","Tiếng Việt","🇻🇳"],
    ["he","עברית","🇮🇱"]
  ];
  var RTL_LANGS = { fa: 1, ar: 1, he: 1 };
  var FLAG = {};
  LANGS.forEach(function (l) { FLAG[l[0]] = l[2]; });

  /* Full UI: en / fa / ar — big texts verbatim from translations.py MENUS */
  var STR_EN = {
    dir: "ltr", online: "online", typing: "typing…", inputPh: "Type a message",
    nav: ["Chat", "Catalog", "My Requests", "Support"],
    catT: "🛍 Catalog", reqT: "🧾 My Requests", supT: "🎫 Support", mgrT: "👔 Manager",
    /* platform MENUS.en — verbatim */
    welcomeMsg: "✨ Welcome to Zenovix\n━━━━━━━━━━━━━━━━━━━━━━━\nAI & Digital Technology · Dubai\n\nArtificial intelligence, cloud & ICT, web & mobile,\nintelligent automation, data & analytics, animation & 3D.\n\nHow can we help you today?",
    helpMsg: "📖 Help Guide\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Quick Commands\n  /start  — Open main menu\n  /lang   — Change language\n  /prices — Product pricing\n  /support — Technical support\n  /quote — Request a quote\n  /contact — Contact information\n  /help — This help page\n\n💡 You can also send any question directly\nand I'll route it to the right specialist.\n\n🚨 For emergencies, just type emergency.",
    pricingMsg: "💰 Products & Pricing\n━━━━━━━━━━━━━━━━━━━━━━━\n\nEvery project is scoped and priced in a formal proposal.\n\nTell us the service (e.g. AI chatbot, website, automation, dashboard), the scope and your timeline — our team will prepare a proposal.",
    supportMsg: "🛠️ Technical Support\n━━━━━━━━━━━━━━━━━━━━━━━\n\nDescribe your issue and I'll connect you with the right team.\n\nFor urgent issues, type emergency.",
    quoteMsg: "📋 Request a Quote\n━━━━━━━━━━━━━━━━━━━━━━━\n\nPlease provide:\n• Service (AI, cloud & ICT, web & mobile, automation, data, animation & 3D)\n• What you want to build and for whom\n• Languages, integrations and timeline\n• Company name and contact\n\nOur team will prepare a proposal and a manager will confirm it.",
    contactMsg: "📞 Contact Us\n━━━━━━━━━━━━━━━━━━━━━━━\n\n📧 Email: {email}\n📞 Phone: +971 4570 1100\n💬 WhatsApp: wa.me/97145701100\n🕐 Office: Mon–Fri 9:00–18: GST (UTC+4)\n📍 Office 2703, Aspect Tower, Business Bay, Dubai, UAE\n\n🚨 For urgent matters, type emergency",
    langPicker: "🌐 Choose your language / لطفاً زبان خود را انتخاب کنید:",
    waitingManager: "Your request has been passed to a manager for confirmation. We will follow up as soon as it is reviewed.",
    talkSales: "Tell me what you need — the service, what you want to build and your timeline — and our team will reply with a formal proposal. You can also pick a service from the menu and send a request in three taps.",
    newTicketMsg: "Describe the issue in one message (what happened, where, since when). A ticket is opened and the right team is notified. Safety cases are escalated immediately.",
    faqMsg: "Common questions:\n- Prices: every project is scoped and quoted in a formal proposal after a manager confirms.\n- Services: AI, cloud and ICT, web and mobile (bilingual EN/AR), intelligent automation, data and analytics, animation and 3D.\n- Process: strategy first, then design, engineering and launch with a team that stays after go-live.\n- Payment: never taken in this chat.\nAsk anything else in your own words.",
    contactCallT: "Phone & WhatsApp", contactEmailT: "E-mail",
    contactLocT: "Office", contactHoursT: "Office hours",
    emergencyMsg: "⚠️ Emergency keyword detected in your message.\nPlease contact immediately:\n📞 {email}\nOr call local emergency services.",
    clarification: "Sorry, I couldn't fully understand your request. Could you please rephrase or clarify what you need?",
    guardRejected: "⚠️ This message was rejected because it contains disallowed content. If you have a genuine question, please rephrase it.",
    noKnowledge: "I'm sorry, I don't have enough information about this topic in our database. Can I help you with something else related to our products or services?",
    /* catalog_i18n en — verbatim */
    listTitle: "Products & services",
    listHint: "Tap a category to see products, or send a product code (for example 101).",
    pickProduct: "Choose a product:",
    pickQty: "How much do you need?",
    qtyCustom: "Other quantity",
    qtyPrompt: "Send the quantity as a number (for example 500).",
    qtyInvalid: "Please send a number, for example 500.",
    confirm: "Please confirm your request:",
    confirmBtn: "📤 Send request", cancelBtn: "✖ Cancel",
    sent: function (r) { return "Thank you. Your request " + r + " was sent to our commercial team. A manager will confirm the price shortly."; },
    cancelled: "Request cancelled. You can start again from the menu.",
    priceOnRequest: "price on request",
    lblCode: "Code", lblProduct: "Product", lblQty: "Quantity", lblPrice: "Price", lblUnit: "unit",
    empty: "No products are available right now.",
    approved: function (r, s) { return "Good news. Your request " + r + " was approved by our manager:\n" + s + "\nOur team will contact you to finalise."; },
    rejected: function (r) { return "Your request " + r + " could not be approved as submitted. Our team will contact you with alternatives."; },
    expired: function (r) { return "Your request " + r + " is still under review. We will get back to you during business hours."; },
    myReqTitle: "Your recent requests:",
    noRequests: "You have no requests yet. Choose a product from the menu to send one.",
    /* buttons — _BUTTONS_140 en */
    bShop: "🛒 Products & Prices", bMyReq: "🧾 My requests", bBack: "◀ Back",
    bQuote: "📋 Request Quote", bSupport: "🛠 Technical Support", bContact: "📞 Contact Us", bHelp: "❓ Help",
    bTalkSales: "💬 Talk to sales", bNewTicket: "🎫 New support ticket", bFaq: "📖 FAQ", bEmergency: "🚨 Emergency",
    bCall: "📞 Call / WhatsApp", bEmail: "✉️ E-mail", bLocation: "📍 Location", bHours: "🕘 Office hours",
    bLang: "🌐 Language / زبان",
    /* widget-side strings (manager console etc.) */
    sug: ["What services do you offer?", "/prices", "How do I start a project?", "Open a support ticket"],
    sev: ["🔥 Urgent", "⚠️ Normal", "💡 Question"],
    supMade: function (r) { return "🎫 Ticket " + r + " opened!\nTrack it in 🎫 Support. Urgent cases go straight to a person."; },
    tooShort: "Please write a bit more 🙂",
    status: { pending: "⏳ pending", approved: "✅ approved", rejected: "❌ rejected", open: "🟢 open", waiting: "🟡 waiting", resolved: "✅ resolved" },
    mgrAuto: "Auto-approve new requests (8s)", mgrOn: "ON", mgrOff: "OFF",
    approve: "✅ Approve", reject: "❌ Reject", rejWhy: "Rejection reason:",
    rejReasons: ["Out of scope", "Need more info", "Pricing — contact sales"],
    mgrReplyPh: "Reply to customer…",
    ticketGot: function (r) { return "🎫 New reply on " + r + " — check 🎫 Support."; },
    thx: "You're welcome! 🌹", bye: "See you soon! 👋",
    sim: "SIM", live: "LIVE", queue: "📥 Queue", ticketsOpen: "🎫 Tickets",
    footerDef: "Zenovix answers from approved data · proposals & payments go to a manager",
    stPending: "pending", stApproved: "approved", stRejected: "rejected",
    emailAsk: "One last thing — what's the best e-mail for the manager's proposal?",
    emailInvalid: "That e-mail doesn't look right — please send it like name@company.com 🙂",
    ttsOn: "Auto-read is ON — I'll read the answers aloud 🔊",
    ttsOff: "Auto-read is OFF",
    ttsAnnounce: "Auto-read is on. I will read the answers aloud.",
    trackTitle: "📦 Status of your orders & tickets:",
    trackEmpty: "You have no requests yet. Choose a product from the menu to send one.",
    trackLive: "🟢 {ref}: received by our commercial team — a manager will confirm shortly.",
    trackReview: "⏳ {ref}: still under review. We will get back to you during business hours."
  };

  var STR_FA = {
    dir: "rtl", online: "آنلاین", typing: "در حال نوشتن…", inputPh: "پیام…",
    nav: ["چت", "کاتالوگ", "درخواست‌های من", "پشتیبانی"],
    catT: "🛍 کاتالوگ", reqT: "🧾 درخواست‌های من", supT: "🎫 پشتیبانی", mgrT: "👔 مدیر",
    welcomeMsg: "✨ به زنوویکس خوش آمدید\n━━━━━━━━━━━━━━━━━━━━━━━\nهوش مصنوعی و فناوری دیجیتال · دبی\n\nهوش مصنوعی، کلاود و ICT، وب و موبایل،\nاتوماسیون هوشمند، داده و تحلیل، انیمیشن و سه‌بعدی.\n\nامروز چطور می‌توانم کمکتان کنم؟",
    helpMsg: "📖 راهنمای دستورات و استفاده\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 دستورات سریع:\n  /start  — باز کردن منوی اصلی\n  /lang   — تغییر زبان سیستم\n  /prices — لیست قیمت و محصولات\n  /support — پشتیبانی فنی\n  /quote — درخواست پیش‌فاکتور\n  /contact — اطلاعات تماس\n  /help — صفحه راهنما\n\n💡 همچنین می‌توانید هر سوالی دارید را مستقیماً ارسال کنید تا پاسخ مناسب دریافت نمایید.\n\n🚨 برای موارد اضطراری کلمه emergency را ارسال کنید.",
    pricingMsg: "💰 محصولات و قیمت‌ها\n━━━━━━━━━━━━━━━━━━━━━━━\n\nقیمت هر پروژه پس از بررسی دامنهٔ کار در پیشنهاد رسمی اعلام می‌شود.\n\nخدمت موردنظر (مثلاً چت‌بات هوش مصنوعی، وب‌سایت، اتوماسیون، داشبورد)، دامنهٔ کار و زمان‌بندی را بفرستید تا تیم ما پیشنهاد فنی و مالی آماده کند.",
    supportMsg: "🛠️ پشتیبانی فنی\n━━━━━━━━━━━━━━━━━━━━━━━\n\nمشکل یا سوال فنی خود را شرح دهید تا بررسی شود.\n\nبرای موارد فوری کلمه emergency را تایپ کنید.",
    quoteMsg: "📋 درخواست استعلام / پیش‌فاکتور\n━━━━━━━━━━━━━━━━━━━━━━━\n\nلطفاً موارد زیر را مشخص فرمایید:\n• خدمت (هوش مصنوعی، کلاود و ICT، وب و موبایل، اتوماسیون، داده، انیمیشن و سه‌بعدی)\n• چه چیزی می‌خواهید بسازید و برای چه کسی\n• زبان‌ها، یکپارچه‌سازی‌ها و زمان‌بندی\n• نام شرکت و اطلاعات تماس\n\nتیم ما پیشنهاد فنی و مالی را آماده می‌کند و یک مدیر آن را تأیید می‌کند.",
    contactMsg: "📞 اطلاعات تماس\n━━━━━━━━━━━━━━━━━━━━━━━\n\n📧 ایمیل: {email}\n📞 تلفن: +971 4570 1100\n💬 واتس‌اپ: wa.me/97145701100\n🕐 دفتر: دوشنبه تا جمعه ۹ تا ۱۸ به وقت خلیج (UTC+4)\n📍 دفتر ۲۷۰۳، برج Aspect، بیزینس‌بی، دبی، امارات\n\n🚨 برای موارد اضطراری کلمه emergency را تایپ کنید.",
    langPicker: "🌐 لطفاً زبان مورد نظر خود را انتخاب کنید / Choose your language:",
    waitingManager: "درخواست شما برای تأیید به مدیر ارجاع شد. به‌محض بررسی، به شما اطلاع می‌دهیم.",
    talkSales: "نیازتان را بگویید — خدمت موردنظر، چیزی که می‌خواهید ساخته شود و زمان‌بندی — تا تیم ما با پیشنهاد رسمی پاسخ دهد. می‌توانید از منو هم خدمت را انتخاب کنید و با سه لمس درخواست بفرستید.",
    newTicketMsg: "مشکل را در یک پیام توضیح دهید (چه شده، کجا، از کی). تیکت باز می‌شود و تیم مربوطه مطلع می‌شود. موارد ایمنی فوراً ارجاع می‌شوند.",
    faqMsg: "سوالات متداول:\n- قیمت: هر پروژه پس از بررسی دامنهٔ کار و تأیید مدیر، در پیشنهاد رسمی قیمت‌گذاری می‌شود.\n- خدمات: هوش مصنوعی، کلاود و ICT، وب و موبایل (دوزبانهٔ انگلیسی/عربی)، اتوماسیون هوشمند، داده و تحلیل، انیمیشن و سه‌بعدی.\n- روند کار: اول استراتژی، بعد طراحی، مهندسی و launch با تیمی که بعد از تحویل هم هست.\n- پرداخت: در این چت هرگز دریافت نمی‌شود.\nهر سوال دیگری داری به زبان خودت بپرس.",
    contactCallT: "تلفن و واتس‌اپ", contactEmailT: "ایمیل",
    contactLocT: "دفتر", contactHoursT: "ساعات کاری",
    emergencyMsg: "⚠️ پیام اضطراری در درخواست شما تشخیص داده شد.\nلطفاً بلافاصله با بخش پشتیبانی تماس بگیرید:\n📞 {email}\nیا با فوریت‌های امدادی تماس حاصل فرمایید.",
    clarification: "متأسفانه درخواست شما را کامل متوجه نشدم. می‌توانید دوباره و واضح‌تر بپرسید؟",
    guardRejected: "⚠️ این پیام رد شد چون محتوای غیرمجاز دارد. اگر سوال واقعی دارید، لطفاً بازنویسی کنید.",
    noKnowledge: "متأسفانه اطلاعات کافی درباره این موضوع در پایگاه داده ما نیست. چیز دیگری درباره خدمات می‌پرسید؟",
    listTitle: "محصولات و خدمات",
    listHint: "یک دسته را انتخاب کنید یا کد محصول را بفرستید.",
    pickProduct: "یک محصول را انتخاب کنید:",
    pickQty: "چه مقدار نیاز دارید؟",
    qtyCustom: "مقدار دیگر",
    qtyPrompt: "مقدار را به صورت عدد بفرستید (مثلاً ۵۰۰).",
    qtyInvalid: "لطفاً فقط عدد بفرستید، مثلاً ۵۰۰.",
    confirm: "لطفاً درخواست خود را تأیید کنید:",
    confirmBtn: "📤 ارسال درخواست", cancelBtn: "✖ انصراف",
    sent: function (r) { return "متشکریم. درخواست " + r + " برای تیم بازرگانی ارسال شد. مدیر به‌زودی قیمت را تأیید می‌کند."; },
    cancelled: "درخواست لغو شد. از منو می‌توانید دوباره شروع کنید.",
    priceOnRequest: "قیمت: استعلامی",
    lblCode: "کد", lblProduct: "محصول", lblQty: "تعداد", lblPrice: "قیمت", lblUnit: "واحد",
    empty: "در حال حاضر محصولی موجود نیست.",
    approved: function (r, s) { return "خبر خوب. درخواست " + r + " توسط مدیر تأیید شد:\n" + s + "\nتیم ما برای نهایی‌سازی با شما تماس می‌گیرد."; },
    rejected: function (r) { return "درخواست " + r + " به همین شکل قابل تأیید نبود. تیم ما با گزینه‌های جایگزین با شما تماس می‌گیرد."; },
    expired: function (r) { return "درخواست " + r + " هنوز در حال بررسی است. در ساعات کاری اطلاع می‌دهیم."; },
    myReqTitle: "درخواست‌های اخیر شما:",
    noRequests: "هنوز درخواستی نداری. از منو یک محصول انتخاب کن و بفرست.",
    bShop: "🛒 محصولات و قیمت‌ها", bMyReq: "🧾 درخواست‌های من", bBack: "◀ بازگشت",
    bQuote: "📋 درخواست پیش‌فاکتور", bSupport: "🛠 پشتیبانی فنی", bContact: "📞 اطلاعات تماس", bHelp: "❓ راهنما",
    bTalkSales: "💬 گفتگو با فروش", bNewTicket: "🎫 تیکت پشتیبانی جدید", bFaq: "📖 سوالات متداول", bEmergency: "🚨 اضطراری",
    bCall: "📞 تماس / واتساپ", bEmail: "✉️ ایمیل", bLocation: "📍 آدرس", bHours: "🕘 ساعات کاری",
    bLang: "🌐 تغییر زبان / Language",
    sug: ["چه خدماتی دارید؟", "/prices", "چطور شروع کنم؟", "تیکت پشتیبانی"],
    sev: ["🔥 فوری", "⚠️ عادی", "💡 سوال"],
    supMade: function (r) { return "🎫 تیکت " + r + " باز شد!\nاز 🎫 پشتیبانی پیگیری کن. موارد فوری مستقیم می‌ره پیش آدم."; },
    tooShort: "یه کم بیشتر بنویس 🙂",
    status: { pending: "⏳ در انتظار", approved: "✅ تأیید شد", rejected: "❌ رد شد", open: "🟢 باز", waiting: "🟡 منتظر", resolved: "✅ حل شد" },
    mgrAuto: "تأیید خودکار درخواست‌ها (۸ ثانیه)", mgrOn: "روشن", mgrOff: "خاموش",
    approve: "✅ تأیید", reject: "❌ رد", rejWhy: "دلیل رد:",
    rejReasons: ["خارج از اسکوپ", "اطلاعات ناقص", "قیمتی — تماس با فروش"],
    mgrReplyPh: "پاسخ به مشتری…",
    ticketGot: function (r) { return "🎫 جواب جدید روی " + r + " — برو 🎫 پشتیبانی."; },
    thx: "خواهش می‌کنم! 🌹", bye: "به امید دیدار! 👋",
    sim: "شبیه‌سازی", live: "متصل", queue: "📥 صف تأیید", ticketsOpen: "🎫 تیکت‌ها",
    footerDef: "پاسخ‌ها از داده‌های مصوب · پیش‌فاکتور و پرداخت با تأیید مدیر",
    stPending: "pending", stApproved: "approved", stRejected: "rejected",
    emailAsk: "فقط یک چیز — بهترین ایمیل برای ارسال پیشنهاد مدیر چیه؟",
    emailInvalid: "ایمیل درست نیست — به این شکل بفرست: name@company.com 🙂",
    ttsOn: "خواندن خودکار روشن شد — جواب‌ها را بلند می‌خوانم 🔊",
    ttsOff: "خواندن خودکار خاموش شد",
    ttsAnnounce: "خواندن خودکار روشن شد. جواب‌ها را بلند می‌خوانم.",
    trackTitle: "📦 وضعیت سفارش‌ها و تیکت‌های شما:",
    trackEmpty: "هنوز درخواستی نداری. از منو یک محصول انتخاب کن و بفرست.",
    trackLive: "🟢 {ref}: توسط تیم ما دریافت شد — مدیر به‌زودی تأیید می‌کند.",
    trackReview: "⏳ {ref}: همچنان در حال بررسی است. در ساعات کاری پاسخ می‌دهیم."
  };

  var STR_AR = {
    dir: "rtl", online: "متصل", typing: "يكتب…", inputPh: "رسالة…",
    nav: ["دردشة", "كتالوج", "طلباتي", "الدعم"],
    catT: "🛍 كتالوج", reqT: "🧾 طلباتي", supT: "🎫 الدعم", mgrT: "👔 مدير",
    welcomeMsg: "✨ مرحباً بكم في زينوفكس\n━━━━━━━━━━━━━━━━━━━━━━━\nالذكاء الاصطناعي والتقنية الرقمية · دبي\n\nالذكاء الاصطناعي، الحوسبة وتقنية المعلومات، الويب والتطبيقات،\nالأتمتة الذكية، البيانات والتحليلات، الرسوم ثلاثية الأبعاد.\n\nكيف يمكننا مساعدتك اليوم؟",
    helpMsg: "📖 دليل المساعدة\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 أوامر سريعة\n  /start  — فتح القائمة الرئيسية\n  /lang   — تغيير اللغة\n  /prices — أسعار المنتجات\n  /support — الدعم الفني\n  /quote — طلب عرض سعر\n  /contact — معلومات الاتصال\n  /help — صفحة المساعدة\n\n💡 يمكنك أيضاً إرسال أي سؤال مباشرة\nوسأوجهه إلى القسم المناسب.\n\n🚨 للطوارئ، اكتب فقط emergency.",
    pricingMsg: "💰 المنتجات والأسعار\n━━━━━━━━━━━━━━━━━━━━━━━\n\nيتم تسعير كل مشروع في عرض رسمي بعد تحديد النطاق.\n\nأخبرنا بالخدمة (مثلاً chatbot ذكي، موقع، أتمتة، لوحة بيانات)، النطاق والجدول الزمني — وسعد فريقنا بإعداد عرض.",
    supportMsg: "🛠️ الدعم الفني\n━━━━━━━━━━━━━━━━━━━━━━━\n\nصف مشكلتك وسنوصلك بالفريق المناسب.\n\nللحالات العاجلة اكتب emergency.",
    quoteMsg: "📋 طلب عرض سعر\n━━━━━━━━━━━━━━━━━━━━━━━\n\nيرجى تحديد:\n• الخدمة (ذكاء اصطناعي، سحابة و ICT، ويب وتطبيقات، أتمتة، بيانات، رسوم 3D)\n• ماذا تريد أن تبني ولمن\n• اللغات والتكاملات والجدول الزمني\n• اسم الشركة وبيانات التواصل\n\nسعد فريقنا بإعداد العرض وسوافق عليه مدير.",
    contactMsg: "📞 تواصل معنا\n━━━━━━━━━━━━━━━━━━━━━━━\n\n📧 البريد: {email}\n📞 الهاتف: +971 4570 1100\n💬 واتساب: wa.me/97145701100\n🕐 الدوام: الاثنين–الجمعة ٩ص–٦م GST (UTC+4)\n📍 مكتب 2703، برج Aspect، الخليج التجاري، دبي، الإمارات\n\n🚨 للطوارئ اكتب emergency",
    langPicker: "🌐 اختر لغتك / Choose your language:",
    waitingManager: "تم إحالة طلبك إلى مدير للتأكيد. سنوافيك بمجرد المراجعة.",
    talkSales: "قل لنا ما تحتاجه — الخدمة، ما تريد بناءه والجدول الزمني — وسيرد فريقنا بعرض رسمي. يمكنك أيضاً اختيار خدمة من القائمة وإرسال الطلب بثلاث لمسات.",
    newTicketMsg: "صف المشكلة في رسالة واحدة (ماذا حدث، أين، منذ متى). تُفتح تذكرة ويُبلَّغ الفريق المناسب. حالات السلامة تُصعَّد فوراً.",
    faqMsg: "الأسئلة الشائعة:\n- الأسعار: يُسعَّر كل مشروع في عرض رسمي بعد موافقة مدير.\n- الخدمات: ذكاء اصطناعي، سحابة و ICT، ويب وموبايل (ثنائي اللغة EN/AR)، أتمتة ذكية، بيانات وتحليلات، رسوم ثلاثية الأبعاد.\n- العملية: الاستراتيجية أولاً، ثم التصميم والهندسة والإطلاق مع فريق يبقى بعد التسليم.\n- الدفع: لا يُؤخذ في هذه المحادثة أبداً.\nاسأل بأي لغة تحب.",
    contactCallT: "الهاتف وواتساب", contactEmailT: "البريد الإلكتروني",
    contactLocT: "المكتب", contactHoursT: "ساعات العمل",
    emergencyMsg: "⚠️ تم اكتشاف حالة طوارئ في رسالتك.\nيرجى التواصل فوراً مع:\n📞 {email}\nأو الاتصال بخدمات الطوارئ.",
    clarification: "عذراً، لم أفهم طلبك بالكامل. هل يمكنك إعادة الصياغة؟",
    guardRejected: "⚠️ رُفضت هذه الرسالة لأنها تحتوي محتوى غير مسموح. إذا كان سؤالك حقيقياً أعد صياغته.",
    noKnowledge: "عذراً، لا توجد معلومات كافية عن هذا الموضوع في قاعدة بياناتنا. هل تسأل عن شيء آخر؟",
    listTitle: "المنتجات والخدمات",
    listHint: "اختر فئة أو أرسل رمز المنتج.",
    pickProduct: "اختر منتجاً:",
    pickQty: "كم تحتاج؟",
    qtyCustom: "كمية أخرى",
    qtyPrompt: "أرسل الكمية كرقم (مثلاً 500).",
    qtyInvalid: "أرسل رقماً فقط، مثلاً 500.",
    confirm: "يرجى تأكيد طلبك:",
    confirmBtn: "📤 إرسال الطلب", cancelBtn: "✖ إلغاء",
    sent: function (r) { return "شكراً. طلبك " + r + " أُرسل إلى الفريق التجاري. سيؤكد المدير السعر قريباً."; },
    cancelled: "أُلغي الطلب. يمكنك البدء من القائمة.",
    priceOnRequest: "السعر: عند الطلب",
    lblCode: "الرمز", lblProduct: "المنتج", lblQty: "الكمية", lblPrice: "السعر", lblUnit: "وحدة",
    empty: "لا توجد منتجات حالياً.",
    approved: function (r, s) { return "خبر جيد. طلبك " + r + " وافق عليه المدير:\n" + s + "\nسيتصل بك فريقنا للإنهاء."; },
    rejected: function (r) { return "طلبك " + r + " لم يمكن الموافقة عليه كما هو. سيتصل بك فريقنا بخيارات بديلة."; },
    expired: function (r) { return "طلبك " + r + " لا يزال قيد المراجعة. سنوافيك في ساعات العمل."; },
    myReqTitle: "طلباتك الأخيرة:",
    noRequests: "لا طلبات بعد. اختر منتجاً من القائمة لإرسال طلب.",
    bShop: "🛒 المنتجات والأسعار", bMyReq: "🧾 طلباتي", bBack: "◀ رجوع",
    bQuote: "📋 طلب عرض سعر", bSupport: "🛠 الدعم الفني", bContact: "📞 تواصل معنا", bHelp: "❓ المساعدة",
    bTalkSales: "💬 التحدث مع المبيعات", bNewTicket: "🎫 تذكرة دعم جديدة", bFaq: "📖 الأسئلة الشائعة", bEmergency: "🚨 طوارئ",
    bCall: "📞 اتصال / واتساب", bEmail: "✉️ البريد الإلكتروني", bLocation: "📍 الموقع", bHours: "🕘 ساعات العمل",
    bLang: "🌐 تغيير اللغة / Language",
    sug: ["ما الخدمات؟", "/prices", "كيف أبدأ؟", "تذكرة دعم"],
    sev: ["🔥 عاجل", "⚠️ عادي", "💡 سؤال"],
    supMade: function (r) { return "🎫 التذكرة " + r + " فُتحت!\nتابعها من 🎫 الدعم."; },
    tooShort: "اكتب أكثر قليلاً 🙂",
    status: { pending: "⏳ منتظر", approved: "✅ موافق", rejected: "❌ مرفوض", open: "🟢 مفتوحة", waiting: "🟡 انتظار", resolved: "✅ حُلّت" },
    mgrAuto: "موافقة تلقائية (٨ث)", mgrOn: "نعم", mgrOff: "لا",
    approve: "✅ موافقة", reject: "❌ رفض", rejWhy: "سبب الرفض:",
    rejReasons: ["خارج النطاق", "معلومات ناقصة", "التسعير — تواصل مع المبيعات"],
    mgrReplyPh: "رد على العميل…",
    ticketGot: function (r) { return "🎫 رد جديد على " + r + " — راجع 🎫 الدعم."; },
    thx: "على الرحب! 🌹", bye: "إلى اللقاء! 👋",
    sim: "محاكاة", live: "مباشر", queue: "📥 القائمة", ticketsOpen: "🎫 التذاكر",
    footerDef: "Zenovix — ردود من بيانات معتمدة",
    stPending: "pending", stApproved: "approved", stRejected: "rejected",
    emailAsk: "شيء أخير — ما هو أفضل بريد إلكتروني لعرض المدير؟",
    emailInvalid: "البريد غير صحيح — أرسله مثل name@company.com 🙂",
    ttsOn: "تمت قراءة تلقائية — سأقرأ الإجابات بصوت عالٍ 🔊",
    ttsOff: "تم إيقاف القراءة التلقائية",
    ttsAnnounce: "القراءة التلقائية مفعّلة. سأقرأ الإجابات بصوت عالٍ.",
    trackTitle: "📦 حالة طلباتك وتذاكرك:",
    trackEmpty: "لا طلبات لديك بعد. اختر منتجًا من القائمة وأرسله.",
    trackLive: "🟢 {ref}: استلمناه — سيؤكد المدير قريبًا.",
    trackReview: "⏳ {ref}: لا يزال قيد المراجعة. سنعود إليك خلال ساعات العمل."
  };

  /* partial UIs — welcome/help/buttons for es fr de tr ru (platform verbatim),
     all other codes fall back to English exactly like get_text() */
  var WELCOME_X = {
    es: "✨ Bienvenido a Zenovix\n━━━━━━━━━━━━━━━━━━━━━━━\nInteligencia artificial · Nube e ICT · Web y móvil · Automatización · Datos · Animación 3D.\n\n¿Cómo podemos ayudarle hoy?",
    fr: "✨ Bienvenue chez Zenovix\n━━━━━━━━━━━━━━━━━━━━━━━\nIntelligence artificielle · Cloud et ICT · Web et mobile · Automatisation · Données · Animation 3D.\n\nComment pouvons-nous vous aider aujourd'hui ?",
    de: "✨ Willkommen bei Zenovix\n━━━━━━━━━━━━━━━━━━━━━━━\nKünstliche Intelligenz · Cloud und ICT · Web und Mobile · Automatisierung · Daten · 3D-Animation.\n\nWie können wir Ihnen heute helfen?",
    tr: "✨ Zenovix'e Hoş Geldiniz\n━━━━━━━━━━━━━━━━━━━━━━━\nYapay zeka · Bulut ve ICT · Web ve mobil · Otomasyon · Veri · 3D animasyon.\n\nBugün size nasıl yardımcı olabiliriz?",
    ru: "✨ Добро пожаловать в Zenovix\n━━━━━━━━━━━━━━━━━━━━━━━\nИскусственный интеллект · Облако и ICT · Веб и мобильные · Автоматизация · Данные · 3D-анимация.\n\nЧем мы можем вам помочь сегодня?"
  };
  var HELP_X = {
    es: "📖 Guía de Ayuda\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Comandos Rápidos\n  /start — Abrir menú principal\n  /lang — Cambiar idioma\n  /prices — Precios de productos\n  /support — Soporte técnico\n  /quote — Solicitar cotización\n  /contact — Información de contacto\n  /help — Esta página de ayuda",
    fr: "📖 Guide d'Aide\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Commandes Rapides\n  /start — Menu principal\n  /lang — Changer de langue\n  /prices — Tarifs produits\n  /support — Support technique\n  /quote — Demander un devis\n  /contact — Informations de contact\n  /help — Cette page d'aide",
    de: "📖 Hilfe-Leitfaden\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Schnellbefehle\n  /start — Hauptmenü öffnen\n  /lang — Sprache ändern\n  /prices — Produktpreise\n  /support — Technischer Support\n  /quote — Angebot anfordern\n  /contact — Kontaktinformationen\n  /help — Diese Hilfe-Seite",
    tr: "📖 Yardım Rehberi\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Hızlı Komutlar\n  /start — Ana menüyü aç\n  /lang — Dil değiştir\n  /prices — Ürün fiyatları\n  /support — Teknik Destek\n  /quote — Teklif iste\n  /contact — İletişim bilgileri\n  /help — Bu yardım sayfası",
    ru: "📖 Руководство\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Команды\n  /start — Главное меню\n  /lang — Сменить язык\n  /prices — Цены на продукцию\n  /support — Техническая поддержка\n  /quote — Запросить расчет\n  /contact — Контакты\n  /help — Помощь"
  };
  var BTN_X = {
    es: { shop: "🛒 Productos y precios", my_requests: "🧾 Mis solicitudes", back: "◀ Atrás", talk_sales: "💬 Hablar con ventas", new_ticket: "🎫 Nuevo ticket", faq: "📖 Preguntas frecuentes", emergency: "🚨 Emergencia", call: "📞 Llamar / WhatsApp", email: "✉️ Correo", location: "📍 Ubicación", hours: "🕘 Horario", lang: "🌐 Idioma / Language", quote: "📋 Solicitar Cotización", support: "🛠 Soporte Técnico", contact: "📞 Contacto", help: "❓ Ayuda" },
    fr: { shop: "🛒 Produits & prix", my_requests: "🧾 Mes demandes", back: "◀ Retour", talk_sales: "💬 Parler aux ventes", new_ticket: "🎫 Nouveau ticket", faq: "📖 FAQ", emergency: "🚨 Urgence", call: "📞 Appel / WhatsApp", email: "✉️ E-mail", location: "📍 Emplacement", hours: "🕘 Horaires", lang: "🌐 Langue / Language", quote: "📋 Demande de Devis", support: "🛠 Support Technique", contact: "📞 Contact", help: "❓ Aide" },
    de: { shop: "🛒 Produkte & Preise", my_requests: "🧾 Meine Anfragen", back: "◀ Zurück", talk_sales: "💬 Mit Verkauf sprechen", new_ticket: "🎫 Neues Ticket", faq: "📖 FAQ", emergency: "🚨 Notfall", call: "📞 Anruf / WhatsApp", email: "✉️ E-Mail", location: "📍 Standort", hours: "🕘 Öffnungszeiten", lang: "🌐 Sprache / Language", quote: "📋 Angebot anfordern", support: "🛠 Technischer Support", contact: "📞 Kontakt", help: "❓ Hilfe" },
    tr: { shop: "🛒 Ürünler & Fiyatlar", my_requests: "🧾 Taleplerim", back: "◀ Geri", talk_sales: "💬 Satışla görüş", new_ticket: "🎫 Yeni destek talebi", faq: "📖 SSS", emergency: "🚨 Acil", call: "📞 Ara / WhatsApp", email: "✉️ E-posta", location: "📍 Konum", hours: "🕘 Çalışma saatleri", lang: "🌐 Dil / Language", quote: "📋 Teklif İste", support: "🛠 Teknik Destek", contact: "📞 İletişim", help: "❓ Yardım" },
    ru: { shop: "🛒 Товары и цены", my_requests: "🧾 Мои заявки", back: "◀ Назад", talk_sales: "💬 Поговорить с продажами", new_ticket: "🎫 Новый тикет", faq: "📖 Вопросы", emergency: "🚨 Экстренно", call: "📞 Позвонить / WhatsApp", email: "✉️ Эл. почта", location: "📍 Адрес", hours: "🕘 Часы работы", lang: "🌐 Язык / Language", quote: "📋 Запрос КП", support: "🛠 Поддержка", contact: "📞 Контакты", help: "❓ Помощь" }
  };

  var STR_BASE = { en: STR_EN, fa: STR_FA, ar: STR_AR };
  function T() {
    var base = STR_BASE[S.lang] || STR_EN;
    if (STR_BASE[S.lang]) { return base; }
    /* partial language → English UI + platform welcome/help/buttons */
    var mixed = Object.create(STR_EN);
    if (WELCOME_X[S.lang]) { mixed.welcomeMsg = WELCOME_X[S.lang]; }
    if (HELP_X[S.lang]) { mixed.helpMsg = HELP_X[S.lang]; }
    var bx = BTN_X[S.lang];
    if (bx) {
      mixed.bShop = bx.shop; mixed.bMyReq = bx.my_requests; mixed.bBack = bx.back;
      mixed.bQuote = bx.quote; mixed.bSupport = bx.support; mixed.bContact = bx.contact; mixed.bHelp = bx.help;
      mixed.bTalkSales = bx.talk_sales; mixed.bNewTicket = bx.new_ticket; mixed.bFaq = bx.faq;
      mixed.bEmergency = bx.emergency; mixed.bCall = bx.call; mixed.bEmail = bx.email;
      mixed.bLocation = bx.location; mixed.bHours = bx.hours; mixed.bLang = bx.lang;
    }
    mixed.sug = STR_EN.sug;
    mixed.dir = RTL_LANGS[S.lang] ? "rtl" : "ltr";
    return mixed;
  }

  /* ═══════════════════════ 5. AGI SERVICES (real platform data) ═══════════════════════ */
  var SERVICES = [
    { icon: "🤖", code: "SVC-01", en: ["Artificial Intelligence", "Custom models, computer vision, and conversational AI trained on your data."], fa: ["هوش مصنوعی", "مدل اختصاصی، بینایی ماشین و هوش گفتگو روی داده خودت."] },
    { icon: "☁️", code: "SVC-02", en: ["Cloud & ICT", "Secure infrastructure, networks, and systems integration."], fa: ["کلاد و ICT", "زیرساخت امن، شبکه و یکپارچه‌سازی سیستم‌ها."] },
    { icon: "🌐", code: "SVC-03", en: ["Web & Mobile", "Fast websites and apps — bilingual EN/AR ready."], fa: ["وب و موبایل", "سایت و اپ سریع — آماده دوزبانه."] },
    { icon: "⚙️", code: "SVC-04", en: ["Intelligent Automation", "AI agents on WhatsApp, Telegram, e-mail and web, with human approvals."], fa: ["اتوماسیون هوشمند", "ایجنت روی واتس‌اپ و تلگرام و ایمیل با تأیید انسانی."] },
    { icon: "📊", code: "SVC-05", en: ["Data & Analytics", "Dashboards and pipelines that turn numbers into decisions."], fa: ["داده و تحلیل", "داشبورد و پایپ‌لاین؛ عددها تبدیل به تصمیم."] },
    { icon: "🎬", code: "SVC-06", en: ["Animation & 3D", "Brand films, AI video, and interactive 3D."], fa: ["انیمیشن و سه‌بعدی", "فیلم برند، ویدیوی AI و سه‌بعدی تعاملی."] }
  ];

  /* ═══════════════════════ 6. STATE ═══════════════════════ */
  var S = {
    lang: (LANGS.some(function (l) { return l[0] === CFG.lang; }) ? CFG.lang : "en"),
    name: "", onboard: !CFG.askName, capture: null,
    orders: [], tickets: [], screen: "chat",
    mgrAuto: false, unreadSup: 0, unreadOrd: 0,
    session: "", catalog: null, backend: false, mode: "sim", email: ""
  };
  try {
    var saved = JSON.parse(localStorage.getItem("zxc3") || "{}");
    if (saved.lang && LANGS.some(function (l) { return l[0] === saved.lang; })) { S.lang = saved.lang; }
    if (saved.name) { S.name = String(saved.name).slice(0, 40); S.onboard = true; }
    if (Array.isArray(saved.orders)) { S.orders = saved.orders.slice(0, 60); }
    if (Array.isArray(saved.tickets)) { S.tickets = saved.tickets.slice(0, 40); }
    if (saved.session) { S.session = String(saved.session).slice(0, 64); }
    if (saved.email) { S.email = String(saved.email).slice(0, 254); }
    S.mgrAuto = !!saved.mgrAuto;
  } catch (e) {}
  function save() {
    try {
      localStorage.setItem("zxc3", JSON.stringify({
        lang: S.lang, name: S.name, orders: S.orders, tickets: S.tickets,
        session: S.session, mgrAuto: S.mgrAuto, email: S.email
      }));
    } catch (e) {}
  }
  function svcName(i) {
    var s = SERVICES[i];
    if (!s) { return "?"; }
    if (S.backend && S.catalog) { /* live catalog may reorder — keep sim names */ }
    return s.icon + " " + (S.lang === "fa" ? s.fa[0] : s.en[0]);
  }
  function svcDesc(i) {
    var s = SERVICES[i];
    return s ? (S.lang === "fa" ? s.fa[1] : s.en[1]) : "";
  }

  /* ═══════════════════════ 7. DOM BUILD ═══════════════════════ */
  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (parent) { parent.appendChild(n); }
    return n;
  }
  var style = document.createElement("style");
  style.id = "zxc-style";
  style.textContent = CSS;
  document.head.appendChild(style);

  /* toast */
  var toastEl = el("div", "zxc-toast");
  var toastTimer = null;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add("zxc-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("zxc-show"); }, ms || 2400);
  }

  /* FAB */
  var fab = el("button", "zxc-fab");
  fab.type = "button";
  fab.setAttribute("aria-expanded", "false");
  fab.style.position = "fixed";
  fab.innerHTML = icon("wa", 24) + " <span class='zxc-t'></span> <span class='zxc-dot' aria-hidden='true'></span>" +
    "<span class='zxc-badge'></span>";
  var fabLabel = fab.querySelector(".zxc-t");
  var chatBadge = fab.querySelector(".zxc-badge");

  /* panel */
  var panel = el("div", "zxc-panel");
  panel.id = "zxc-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("data-theme", CFG.theme);

  /* header */
  var head = el("div", "zxc-head", panel);
  var backBtn = el("button", "zxc-back", head);
  backBtn.type = "button"; backBtn.innerHTML = icon("back", 20); backBtn.setAttribute("aria-label", "Close");
  var av = el("div", "zxc-av", head);
  av.appendChild(document.createTextNode(CFG.avatarText));
  var presence = el("i", null, av);
  var idBox = el("div", "zxc-id", head);
  var nameRow = el("div", "zxc-name", idBox);
  nameRow.appendChild(document.createTextNode(CFG.title));
  var modeTag = el("span", "zxc-mode", nameRow);
  modeTag.textContent = "SIM";
  var vf = el("span", null, nameRow);
  vf.innerHTML = icon("verified", 15);
  vf.title = CFG.title + " Business Account";
  var status = el("div", "zxc-status", idBox);
  status.textContent = "connecting…";
  var actions = el("div", "zxc-hactions", head);
  function hBtn(html, label, cls) {
    var b = el("button", cls || null, actions);
    b.type = "button"; b.innerHTML = html; b.title = label; b.setAttribute("aria-label", label);
    return b;
  }
  var langBtn = hBtn("🌍", "Language");
  var mgrBtn = hBtn("👔", "Manager mode");
  var mgrBdg = el("span", "zxc-mini", mgrBtn);
  var videoBtn = hBtn(icon("video", 19), "Video call");
  var callBtn = hBtn(icon("phone", 19), "Voice call");
  var menuBtn = hBtn(icon("dots", 19), "Menu");

  /* body + screens */
  var body = el("div", "zxc-body", panel);

  /* — chat screen — */
  var scrChat = el("div", "zxc-scr zxc-on", body);
  scrChat.id = "zxc-scr-chat";
  var log = el("div", "zxc-log", scrChat);
  var scrollBtn = el("button", "zxc-scrolldown", scrChat);
  scrollBtn.type = "button";
  scrollBtn.innerHTML = icon("down", 20) + "<span class='zxc-n'></span>";
  var scrollN = scrollBtn.querySelector(".zxc-n");
  var sug = el("div", "zxc-sug", scrChat);
  var comp = el("div", "zxc-comp", scrChat);
  var emoBtn = el("button", null, comp);
  emoBtn.type = "button"; emoBtn.innerHTML = icon("smile", 22); emoBtn.title = "Emoji";
  var input = el("input", null, comp);
  input.type = "text"; input.maxLength = 2000; input.autocomplete = "off";
  input.setAttribute("aria-label", "Your message");
  var clipBtn = el("button", null, comp);
  clipBtn.type = "button"; clipBtn.innerHTML = icon("clip", 20); clipBtn.title = "Attach";
  var SR_CLASS = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var micBtn = null, recog = null, recOn = false;
  if (CFG.stt && SR_CLASS) {
    micBtn = el("button", "zxc-mic", comp);
    micBtn.type = "button"; micBtn.innerHTML = icon("mic", 20);
    micBtn.title = "Voice input"; micBtn.setAttribute("aria-label", "Voice input");
    micBtn.addEventListener("click", function () {
      if (recOn) { try { recog.stop(); } catch (e) {} return; }
      try {
        recog = new SR_CLASS();
        recog.lang = LANG_BCP[S.lang] || "en-US";
        recog.interimResults = true;
        recog.continuous = false;
        recog.onresult = function (ev) {
          var fin = "", intr = "";
          for (var i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) { fin += ev.results[i][0].transcript; }
            else { intr += ev.results[i][0].transcript; }
          }
          input.value = (fin || intr || "").trim();
        };
        recog.onend = function () { recOn = false; micBtn.classList.remove("zxc-rec"); };
        recog.start();
        recOn = true;
        micBtn.classList.add("zxc-rec");
      } catch (e) {}
    });
  }
  var send = el("button", "zxc-sendbtn", comp);
  send.type = "button"; send.innerHTML = icon("mic", 21);
  var emojiBox = el("div", "zxc-emoji", scrChat);

  /* — app screens — */
  function appScreen(name) {
    var scr = el("div", "zxc-scr", body);
    scr.id = "zxc-scr-" + name;
    var app = el("div", "zxc-app", scr);
    app.id = "zxc-body-" + name;
    return scr;
  }
  appScreen("cat"); appScreen("ord"); appScreen("sup"); appScreen("mgr");

  /* menu dropdown */
  var menu = el("div", "zxc-menu", panel);
  function mBtn(ic, label) {
    var b = el("button", null, menu);
    b.type = "button";
    b.innerHTML = (ic.length <= 2 ? "<i class='zxc-e'>" + ic + "</i>" : icon(ic, 18)) + "<span></span>";
    b.lastChild.textContent = label;
    return b;
  }
  var waBtn = mBtn("wa", "Continue on WhatsApp");
  var mailBtn = mBtn("mail", "E-mail the studio");
  var soundBtn = mBtn("bell", "Sounds: on");
  var resetBtn = mBtn("refresh", "Restart conversation");

  /* emoji set */
  var EMOJIS = ["\u{1F600}","\u{1F601}","\u{1F602}","\u{1F923}","\u{1F60A}","\u{1F60D}","\u{1F914}","\u{1F60E}",
    "\u{1F973}","\u{1F622}","\u{1F621}","\u{1F44D}","\u{1F44E}","\u{1F64F}","\u{1F44F}","\u{1F4AA}",
    "\u{1F525}","\u{2728}","\u{1F389}","\u2764\uFE0F","\u{1F49C}","\u2705","\u274C","\u{1F4A1}",
    "\u{1F680}","\u{1F4DE}","\u{1F4E7}","\u{1F4B0}","\u{1F6E0}\uFE0F","\u{1F4CA}","\u{1F310}","\u{1F916}"];
  EMOJIS.forEach(function (e) {
    var b = el("button", null, emojiBox);
    b.type = "button"; b.textContent = e;
  });

  /* bottom nav */
  var nav = el("div", "zxc-nav", panel);
  var NAVS = [
    { id: "chat", e: "💬" }, { id: "cat", e: "🛍" },
    { id: "ord", e: "📦" }, { id: "sup", e: "🎫" }
  ];
  var navBtns = {};
  NAVS.forEach(function (nv) {
    var b = el("button", nv.id === "chat" ? "zxc-on" : null, nav);
    b.type = "button"; b.dataset.nav = nv.id;
    b.innerHTML = "<span class='zxc-e'>" + nv.e + "</span><span class='zxc-l'></span>" +
      "<span class='zxc-nbdg'></span>";
    b.querySelector(".zxc-l").textContent = nv.id;
    navBtns[nv.id] = b;
  });
  var ordBdg = navBtns.ord.querySelector(".zxc-nbdg");
  var supBdg = navBtns.sup.querySelector(".zxc-nbdg");

  /* footer */
  var foot = el("div", "zxc-foot", panel);
  foot.innerHTML = icon("lock", 11) + "<span></span>";

  function mount() {
    document.body.appendChild(toastEl);
    if (TTS_OK) {
      var ttsBtn = el("button", "zxc-ttsbtn");
      ttsBtn.type = "button";
      ttsBtn.setAttribute("aria-label", "Auto-read answers (TTS)");
      ttsBtn.innerHTML = ttsPref ? icon("spk", 20) : icon("mute", 20);
      if (ttsPref) { ttsBtn.classList.add("zxc-on"); }
      ttsBtn.addEventListener("click", function () {
        ttsPref = !ttsPref;
        try { localStorage.setItem("zxc_tts", ttsPref ? "1" : "0"); } catch (e) {}
        ttsBtn.classList.toggle("zxc-on", ttsPref);
        ttsBtn.innerHTML = ttsPref ? icon("spk", 20) : icon("mute", 20);
        if (ttsPref) { speakNow(T().ttsAnnounce); toast(T().ttsOn); }
        else { stopSpeak(); toast(T().ttsOff); }
      });
      document.body.appendChild(ttsBtn);
    }
    document.body.appendChild(fab);
    document.body.appendChild(panel);
  }
  if (document.body) { mount(); }
  else { document.addEventListener("DOMContentLoaded", mount); }

  /* ═══════════════════════ 8. UTILITIES ═══════════════════════ */
  function fmtTime() {
    try {
      return new Date().toLocaleTimeString(S.lang === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }
  function inBusinessHours() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB",
        { timeZone: "Asia/Dubai", weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
      var wd = "", h = -1;
      parts.forEach(function (p) {
        if (p.type === "weekday") { wd = p.value; }
        if (p.type === "hour") { h = parseInt(p.value, 10); }
      });
      return ["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(wd) >= 0 && h >= 9 && h < 18;
    } catch (e) { return true; }
  }
  function rid(p) { return p + "-" + Math.random().toString(16).slice(2, 6).toUpperCase(); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function removeNode(n) { if (n && n.parentNode) { n.parentNode.removeChild(n); } }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* sound engine (WebAudio — no assets) */
  var audioCtx = null;
  function tone(f1, f2, dur, vol) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return; }
      if (!audioCtx) { audioCtx = new AC(); }
      if (audioCtx.state === "suspended") { audioCtx.resume(); }
      var t = audioCtx.currentTime, o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.35);
      gn.gain.setValueAtTime(0.001, t);
      gn.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  function pop() { if (CFG.sound) { tone(620, 880, 0.22, 0.06); } }
  function okChime() { if (CFG.sound) { tone(520, 780, 0.16, 0.06); setTimeout(function () { tone(780, 1040, 0.2, 0.05); }, 130); } }
  function badChime() { if (CFG.sound) { tone(440, 300, 0.28, 0.055); } }

  /* safe linkify */
  var URL_RE = /(https?:\/\/[^\s<>"']+)/g;
  function fillText(node, text) {
    String(text).split(URL_RE).forEach(function (piece) {
      if (!piece) { return; }
      if (piece.indexOf("http") === 0) {
        var a = el("a", null, null);
        a.href = piece; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.textContent = piece;
        node.appendChild(a);
      } else {
        node.appendChild(document.createTextNode(piece));
      }
    });
  }
  /* bot text supports only our own <b class=g> emphasis — build safely */
  function fillRich(node, html) {
    var parts = String(html).split(/(<b class="g">[\s\S]*?<\/b>)/g);
    parts.forEach(function (p) {
      if (!p) { return; }
      var m = p.match(/^<b class="g">([\s\S]*?)<\/b>$/);
      if (m) {
        var b = el("b", "zxc-g", null);
        b.textContent = m[1];
        node.appendChild(b);
      } else {
        fillText(node, p);
      }
    });
  }
  function nl2br(node, text) {
    String(text).split("\n").forEach(function (line, i) {
      if (i > 0) { node.appendChild(el("br")); }
      if (line) { fillText(node, line); }
    });
  }

  /* ═══════════════════════ 9. MESSAGE FACTORY ═══════════════════════ */
  var unread = 0, unreadAnchor = null, pendingBelow = 0;

  function afterAppend(force) {
    var nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 130;
    if (nearBottom || force) { scrollLog(); hideScroll(); }
    else {
      pendingBelow++;
      scrollN.textContent = String(pendingBelow);
      scrollN.classList.add("zxc-show");
      scrollBtn.classList.add("zxc-show");
    }
  }
  function scrollLog() {
    try { log.scrollTo({ top: log.scrollHeight, behavior: "smooth" }); }
    catch (e) { log.scrollTop = log.scrollHeight; }
  }
  function hideScroll() { scrollBtn.classList.remove("zxc-show"); scrollN.classList.remove("zxc-show"); pendingBelow = 0; }
  log.addEventListener("scroll", function () {
    if (log.scrollHeight - log.scrollTop - log.clientHeight < 60) { hideScroll(); }
  });

  function systemPill(iconName, text) {
    var d = el("div", "zxc-sys", log);
    if (iconName) { d.innerHTML = icon(iconName, 12) + "<span></span>"; }
    else { d.appendChild(document.createElement("span")); }
    d.lastChild.textContent = text;
    afterAppend();
    return d;
  }
  function dateDivider() {
    var d = el("div", "zxc-date", log);
    d.textContent = "Today";
    afterAppend();
    return d;
  }

  function addMsg(who, opts) {
    /* opts: {text, rich, kb, ticks} — text plain or rich (<b class=g>) */
    var wrap = el("div", "zxc-msg zxc-" + who, log);
    var bubble = el("div", "zxc-bubble", wrap);
    var txt = el("span", "zxc-txt", null);
    txt.style.display = "block";
    if (opts.rich) { fillRich(txt, opts.rich); }
    else if (who === "out") { txt.textContent = opts.text; }
    else if (opts.preserveNl) { nl2br(txt, opts.text); }
    else { fillText(txt, opts.text); }
    bubble.appendChild(txt);

    var ikb = null;
    if (opts.kb && opts.kb.length) { ikb = paintKb(opts.kb, bubble); }

    var meta = el("span", "zxc-meta", bubble);
    var time = el("span", null, meta);
    time.textContent = fmtTime();
    var tick = null;
    if (opts.ticks) {
      tick = el("span", "zxc-tick", meta);
      tick.innerHTML = icon("clock", 13, 2);
    }
    afterAppend();
    return {
      wrap: wrap, bubble: bubble, ikb: ikb,
      setTick: function (state) {
        if (!tick) { return; }
        tick.innerHTML = icon(state === "read" ? "check2" : "check1", 15, 2);
        if (state === "read") { tick.classList.add("zxc-read"); }
      },
      setKb: function (kb) { paintKb(kb, bubble, ikb); return ikb; }
    };
  }

  function paintKb(kb, bubble, existing) {
    var box = existing || el("div", "zxc-ikb", bubble);
    box.innerHTML = "";
    kb.forEach(function (row) {
      var r = el("div", "zxc-row", box);
      row.forEach(function (b) {
        var btn = el("button", b.c ? "zxc-" + b.c : null, r);
        btn.type = "button";
        btn.textContent = b.t;
        btn.dataset.cb = b.cb;
        if (b.arg !== undefined) { btn.dataset.arg = b.arg; }
      });
    });
    return box;
  }
  function kbReceipt(box, note) {
    var d = el("div", "zxc-receipt");
    d.textContent = "✓ " + (note || "");
    box.replaceWith(d);
  }

  function addTyping() {
    var wrap = el("div", "zxc-msg zxc-in zxc-typing", log);
    el("div", "zxc-bubble", wrap).innerHTML = "<span></span><span></span><span></span>";
    afterAppend(true);
    return wrap;
  }
  function upgradeAllRead() {
    var ticks = log.querySelectorAll(".zxc-out .zxc-tick");
    for (var i = 0; i < ticks.length; i++) {
      ticks[i].innerHTML = icon("check2", 15, 2);
      ticks[i].classList.add("zxc-read");
    }
  }
  function setStatusTyping(on) {
    isTyping = on;
    status.textContent = on ? T().typing : (inBusinessHours() ? T().online : T().online + " · ⏰");
    status.classList.toggle("zxc-typing", on);
  }

  /* bot message with typing simulation + read-upgrade + reactions */
  var isTyping = false;
  async function botSay(text, kb, opts) {
    opts = opts || {};
    var t = addTyping();
    upgradeAllRead();
    setStatusTyping(true);
    await sleep(opts.fast ? 260 : 480 + Math.random() * 620);
    removeNode(t);
    setStatusTyping(false);
    var m = addMsg("in", {
      text: text, rich: opts.rich, kb: kb,
      preserveNl: opts.preserveNl !== false
    });
    addReactBar(m.wrap);
    if (TTS_OK) {
      var spoken = speechPlain(text, opts.rich);
      if (spoken) {
        addSayBtn(m, spoken);
        if (ttsPref) { speakNow(spoken); }
      }
    }
    if (!panel.classList.contains("zxc-open")) {
      unread++;
      chatBadge.textContent = unread > 9 ? "9+" : String(unread);
      chatBadge.classList.add("zxc-show");
      unreadAnchor = unreadAnchor || m.wrap;
    }
    pop();
    return m;
  }

  /* reactions */
  var REACTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F61E}", "\u{1F64F}"];
  function addReactBar(wrap) {
    var bar = el("div", "zxc-reactbar", wrap);
    REACTIONS.forEach(function (r) {
      var b = el("button", null, bar);
      b.type = "button"; b.textContent = r;
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        toggleReaction(wrap, r);
        bar.style.display = "none";
        setTimeout(function () { bar.style.display = ""; }, 350);
      });
    });
  }
  function toggleReaction(wrap, r) {
    var chip = wrap.querySelector(".zxc-react");
    if (chip && chip.textContent === r) { removeNode(chip); return; }
    if (chip) { removeNode(chip); }
    chip = el("button", "zxc-react", wrap);
    chip.type = "button"; chip.textContent = r; chip.title = "Remove reaction";
    pop();
  }

  /* ═══════════════════════ 10. BACKEND (LIVE mode) ═══════════════════════ */
  async function apiGet(path) {
    var r = await fetch(CFG.apiBase + path, { credentials: "omit" });
    if (!r.ok) { throw new Error("HTTP " + r.status); }
    return r.json();
  }
  async function apiPost(path, payload, timeout) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeout || 20000);
    try {
      var r = await fetch(CFG.apiBase + path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), credentials: "omit", signal: ctrl.signal
      });
      clearTimeout(timer);
      return { status: r.status, json: await r.json().catch(function () { return {}; }) };
    } catch (e) { clearTimeout(timer); throw e; }
  }
  async function bootBackend() {
    if (!CFG.apiBase) { return false; }
    try {
      await apiGet("/site");
      var cat = null;
      try { cat = await apiGet("/catalog?lang=" + encodeURIComponent(S.lang === "ar" ? "ar" : S.lang)); } catch (e) {}
      if (cat && Array.isArray(cat.items) && cat.items.length) { S.catalog = cat; }
      S.backend = true; S.mode = "live";
      return true;
    } catch (e) { S.backend = false; S.mode = "sim"; return false; }
  }
  async function postEnquiry(prefix, message) {
    /* order/quote → the platform's website-lead pipeline (customer + ticket) */
    if (!S.backend) { return null; }
    try {
      var r = await apiPost("/enquiry", {
        name: S.name || "customer", email: S.email || "n/a@local", phone: "", company: "",
        service: "Other", message: message, website: ""
      }, 15000);
      if (r.status === 201 && r.json && r.json.reference) { return r.json.reference; }
    } catch (e) {}
    return null;
  }
  async function showTrack() {
    /* Xbot parity: /track — per-reference status list (+ LIVE backend check) */
    var rows = [];
    S.orders.slice(0, 8).forEach(function (o) {
      rows.push((o.st === "approved" ? "✅ " : o.st === "rejected" ? "❌ " : "⏳ ") + o.ref +
        ((o.summary || "").split("\n")[0] ? " — " + (o.summary || "").split("\n")[0].slice(0, 60) : ""));
    });
    S.tickets.slice(0, 5).forEach(function (t) {
      rows.push((t.st === "closed" ? "🔒 " : "🎫 ") + t.ref);
    });
    if (!rows.length) { await botSay(T().trackEmpty, mainMenuKb(), {}); return; }
    var body = T().trackTitle + "\n\n" + rows.join("\n");
    var zx = null;
    S.orders.forEach(function (o) { if (!zx && /^ZX-/.test(o.ref)) { zx = o.ref; } });
    if (S.backend && zx) {
      try {
        var j = await apiGet("/track?ref=" + encodeURIComponent(zx));
        body += "\n\n" + (j && j.found ? T().trackLive : T().trackReview).replace("{ref}", zx);
      } catch (e) { body += "\n\n" + T().trackReview.replace("{ref}", zx); }
    }
    await botSay(body, mainMenuKb(), {});
  }

  /* free-text chat → backend chat endpoint or local knowledge */
  function localAnswer(raw) {
    var m = " " + String(raw || "").toLowerCase() + " ";
    var has = function () {
      for (var i = 0; i < arguments.length; i++) { if (m.indexOf(arguments[i]) !== -1) { return true; } }
      return false;
    };
    var fa = S.lang === "fa", ar = S.lang === "ar";
    if (has("whatsapp", "واتس", "واتساب")) {
      return fa ? "بله — ایجنت واتس‌اپ با تأیید انسانی می‌سازیم. برای شروع، 🧾 استعلام بزن."
        : ar ? "نعم — نبني وكلاء واتساب بموافقة بشرية. ابدأ بـ 🧾 عرض سعر."
        : "Yes — we build AI agents for WhatsApp with human approvals. Tap 🧾 Quote to start.";
    }
    if (has("bilingual", "arabic", "rtl", "دوزبانه", "عربی", "دوزبانه")) {
      return fa ? "بله — سایت و اپ دوزبانه با راست‌به‌چپ کامل تخصص ماست."
        : "Yes — bilingual EN/AR websites and apps with full RTL are our specialty.";
    }
    if (has("price", "cost", "قیمت", "هزینه", "اسعار", "استعلام")) {
      return fa ? "قیمت‌ها استعلامی‌ان — 🧾 استعلام بزن تا مدیر برآورد بده."
        : ar ? "الأسعار عند الطلب — اضغط 🧾 عرض سعر."
        : "Prices are on request — tap 🧾 Quote and a manager will scope it.";
    }
    if (has("order", "track", "سفارش", "پیگیری", "طلب")) {
      return fa ? "از 🛍 محصولات انتخاب کن یا از 📦 سفارش‌ها پیگیری کن."
        : ar ? "اختر من 🛍 الكتالوج أو تابع من 📦 الطلبات."
        : "Pick from 🛍 Catalog, or track in 📦 Orders.";
    }
    if (has("ticket", "support", "issue", "problem", "تیکت", "پشتیبانی", "مشکل", "دعم")) {
      return fa ? "🆘 پشتیبانی رو بزن تا تیکت باز کنم."
        : ar ? "اضغط 🆘 الدعم لفتح تذكرة."
        : "Tap 🆘 Support and I'll open a ticket.";
    }
    if (has("manager", "human", "مدیر", "اپراتور")) {
      return fa ? "هر چیز مهمی (پیش‌فاکتور، قرارداد، پرداخت) با تأیید مدیر انسانی انجام می‌شه — همون سیستم HITL خود پلتفرم."
        : ar ? "كل شيء حساس يمر على مدير بشري — نظام الموافقة البشرية."
        : "Anything sensitive (quotes, contracts, payments) goes through a human manager — the platform's HITL system.";
    }
    if (has("contact", "email", "phone", "call", "address", "hour", "تماس", "تلفن", "ایمیل", "آدرس", "ساعت", "اتصال")) {
      return T().contact;
    }
    if (has("thank", "merci", "مرسی", "ممنون", "شکرا")) { return T().thx; }
    if (has("bye", "خداحافظ", "بای", "وداعا")) { return T().bye; }
    if (has("hello", "hi", "hey", "salam", "سلام", "درود", "مرحبا")) {
      return fa ? "سلام! از منو انتخاب کن یا سوالت رو بپرس. 👋"
        : ar ? "أهلاً! اختر من القائمة أو اسأل. 👋"
        : "Hello! Pick from the menu or just ask. 👋";
    }
    if (fa) { return STR_FA.clarification; }
    if (ar) { return STR_AR.clarification; }
    return STR_EN.clarification;
  }
  async function askBackendChat(text) {
    var r = await fetch(CFG.api, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text.slice(0, 2000), session: S.session || "" })
    });
    var j = await r.json().catch(function () { return {}; });
    return { status: r.status, json: j };
  }

  /* ═══════════════════════ 11. BOT FLOWS (orchestrator parity) ═══════════════════════ */
  function mainMenuKb() {
    return [
      [{ t: T().bShop, cb: "shop" }],
      [{ t: T().bQuote, cb: "menu_quote" }, { t: T().bSupport, cb: "menu_support" }],
      [{ t: T().bContact, cb: "menu_contact" }, { t: T().bHelp, cb: "menu_help" }],
      [{ t: T().bMyReq, cb: "my_requests" }, { t: T().bLang, cb: "menu_lang" }]
    ];
  }
  function backRow() { return [{ t: T().bBack, cb: "menu_home" }]; }
  function quoteMenuKb() {
    return [
      [{ t: T().bShop, cb: "shop" }],
      [{ t: T().bMyReq, cb: "my_requests" }],
      [{ t: T().bTalkSales, cb: "talk_sales" }],
      backRow()
    ];
  }
  function supportMenuKb() {
    return [
      [{ t: T().bNewTicket, cb: "new_ticket" }],
      [{ t: T().bFaq, cb: "faq" }, { t: T().bEmergency, cb: "emergency" }],
      backRow()
    ];
  }
  function contactMenuKb() {
    return [
      [{ t: T().bCall, cb: "contact_call" }, { t: T().bEmail, cb: "contact_email" }],
      [{ t: T().bLocation, cb: "contact_location" }, { t: T().bHours, cb: "contact_hours" }],
      backRow()
    ];
  }
  function helpMenuKb() {
    return [
      [{ t: T().bShop, cb: "shop" }, { t: T().bSupport, cb: "menu_support" }],
      [{ t: T().bLang, cb: "menu_lang" }],
      backRow()
    ];
  }
  function langKb() {
    /* 21 languages, 2 per row — _send_language_picker parity */
    var rows = [], row = [];
    LANGS.forEach(function (l) {
      row.push({ t: FLAG[l[0]] + " " + l[1], cb: "lang_" + l[0] });
      if (row.length === 2) { rows.push(row); row = []; }
    });
    if (row.length) { rows.push(row); }
    return rows;
  }

  function svcName(i) {
    var s = SERVICES[i];
    return s ? (s.icon + " " + (S.lang === "fa" ? s.fa[0] : s.en[0])) : "?";
  }
  function svcDesc(i) {
    var s = SERVICES[i];
    return s ? (S.lang === "fa" ? s.fa[1] : s.en[1]) : "";
  }
  function productsKb() {
    var rows = SERVICES.map(function (s, i) {
      return [{ t: svcName(i), cb: "prod", arg: String(i) }];
    });
    rows.push(backRow());
    return rows;
  }
  function orderSummary(pid, qty) {
    var s = SERVICES[pid];
    return (S.lang === "fa" ? "محصول" : S.lang === "ar" ? "المنتج" : T().lblProduct) + ": " + svcName(pid) +
      "\n" + T().lblCode + ": " + s.code +
      "\n" + T().lblQty + ": " + qty +
      "\n" + T().lblPrice + ": " + T().priceOnRequest;
  }
  function productRich(i) {
    return '<b class="g">' + svcName(i) + "</b>\n" + svcDesc(i) +
      "\n💰 <b>" + T().priceOnRequest + "</b>";
  }
  function productKb(i) {
    return [
      [{ t: T().bQuote, cb: "qstart", arg: String(i), c: "ok" }],
      backRow()
    ];
  }
  function qtyKb(pid, q) {
    return [
      [{ t: "➖", cb: "qmin", arg: pid + ":" + q }, { t: String(q), cb: "noop" }, { t: "➕", cb: "qplus", arg: pid + ":" + q }],
      [{ t: T().qtyCustom, cb: "qcustom", arg: String(pid) }],
      [{ t: T().confirmBtn, cb: "tosum", arg: pid + ":" + q, c: "primary" }],
      [{ t: T().cancelBtn, cb: "cancel" }]
    ];
  }
  function confirmKb(pid, q) {
    return [
      [{ t: T().confirmBtn, cb: "oconfirm", arg: pid + ":" + q, c: "primary" }],
      [{ t: T().cancelBtn, cb: "cancel" }]
    ];
  }

  async function showShop(box) {
    if (box) { kbReceipt(box, "🛒"); }
    await botSay(null, productsKb(), {
      rich: '<b class="g">🛒 ' + T().listTitle + "</b>\n" + T().pickProduct
    });
  }
  var EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[A-Za-z]{2,24}$/;
  async function submitRequest(pid, qty) {
    /* shop_flow.submit_request parity: quote draft + approval + manager alert */
    if (S.backend && !S.email) {
      S.capture = { type: "email", pid: pid, qty: qty };
      await botSay(T().emailAsk, null, {});
      return;
    }
    await doSubmit(pid, qty);
  }
  async function doSubmit(pid, qty) {
    var ref = rid("Q");
    var o = { ref: ref, kind: "quote", pid: pid, qty: qty, st: "pending", at: Date.now(), cust: S.name, summary: orderSummary(pid, qty) };
    S.orders.unshift(o); save(); paintBadges();
    var live = await postEnquiry("QUOTE", "QUOTE " + ref + ": " + svcName(pid) + " x" + qty + " (web widget)");
    if (live) { o.pendingRef = ref; o.ref = live; o.summary = o.summary; save(); }
    await botSay(T().sent(o.ref), null, {});
    if (S.mgrAuto) { setTimeout(function () { mgrDecide(o.ref, true, true); }, 8000); }
    if (S.screen === "ord") { renderReq(); }
  }
  async function placeTicket(desc) {
    var ref = rid("TKT");
    var sev = /\b(urgent|asap|فوری|عاجل|عاجل)\b/i.test(desc) ? "urgent" : "normal";
    var t = {
      ref: ref, sev: sev, st: "open", at: Date.now(), cust: S.name,
      thread: [{ me: true, text: desc.slice(0, 500), at: Date.now() }], unread: 0
    };
    S.tickets.unshift(t); save(); S.capture = null;
    var live = await postEnquiry("TICKET", "TICKET " + ref + ": " + desc);
    if (live) { t.liveRef = live; save(); }
    await botSay(T().supMade(ref), null, {});
    if (S.screen === "sup") { renderSup(true, ""); }
  }

  /* ---- HITL manager (approval engine — notify_pending parity) ---- */
  function mgrDecide(ref, approve, auto) {
    var o = null;
    for (var i = 0; i < S.orders.length; i++) { if (S.orders[i].ref === ref) { o = S.orders[i]; break; } }
    if (!o || o.st !== "pending") { return; }
    o.st = approve ? "approved" : "rejected";
    if (!approve && !o.why) { o.why = T().rejReasons[1]; }
    save(); S.unreadOrd++; paintBadges();
    if (approve) { okChime(); } else { badChime(); }
    botSay(approve ? T().approved(o.ref, o.summary || "") : T().rejected(o.ref), null, {});
    if (!auto) { toast(approve ? "✅" : "❌"); }
    if (S.screen === "mgr") { renderMgr(""); }
    if (S.screen === "ord") { renderReq(); }
  }
  function mgrTicketReply(ref, text, toStatus) {
    var t = null;
    for (var i = 0; i < S.tickets.length; i++) { if (S.tickets[i].ref === ref) { t = S.tickets[i]; break; } }
    if (!t) { return; }
    t.thread.push({ me: false, text: text, at: Date.now() });
    if (toStatus) { t.st = toStatus; }
    t.unread = (t.unread || 0) + 1;
    S.unreadSup++; save(); paintBadges();
    pop();
    botSay(T().ticketGot(ref), null, {});
    if (S.screen === "mgr") { renderMgr(openMgrTicket); }
    if (S.screen === "sup") { renderSup(true, ""); }
  }

  /* ═══════════════════════ 12. SCREENS ═══════════════════════ */
  function body_(name) { return document.getElementById("zxc-body-" + name); }
  function pillCls(st) {
    if (st === "pending") { return "zxc-pend"; }
    if (st === "open" || st === "approved" || st === "resolved") { return "zxc-pok"; }
    if (st === "waiting") { return "zxc-pinfo"; }
    return "zxc-pno";
  }
  function setScreen(name) {
    S.screen = name;
    ["chat", "cat", "ord", "sup", "mgr"].forEach(function (n) {
      var scr = document.getElementById("zxc-scr-" + n);
      if (scr) { scr.classList.toggle("zxc-on", n === name); }
    });
    Object.keys(navBtns).forEach(function (k) {
      navBtns[k].classList.toggle("zxc-on", k === name);
    });
    panel.classList.toggle("zxc-mgr", name === "mgr");
    if (name === "mgr") { renderMgr(""); }
    if (name === "cat") { renderCat(); }
    if (name === "ord") { S.unreadOrd = 0; paintBadges(); renderReq(); }
    if (name === "sup") { S.unreadSup = 0; paintBadges(); renderSup(true, ""); }
    if (name === "chat") { scrollLog(); }
  }
  function paintBadges() {
    var pend = 0;
    S.orders.forEach(function (o) { if (o.st === "pending") { pend++; } });
    setBdg(mgrBdg, pend);
    setBdg(chatBadge, unread);
    setBdg(ordBdg, S.unreadOrd);
    setBdg(supBdg, S.unreadSup);
  }
  function setBdg(node, n) {
    if (!node) { return; }
    if (n > 0) { node.textContent = n > 9 ? "9+" : String(n); node.classList.add("zxc-show"); }
    else { node.classList.remove("zxc-show"); }
  }
  function catalogItems() {
    if (S.backend && S.catalog && S.catalog.items && S.catalog.items.length) {
      return S.catalog.items.map(function (p) {
        return { name: p.name, desc: p.title || "", price: p.price_text || T().priceOnRequest, code: p.code, img: p.image };
      });
    }
    return SERVICES.map(function (s, i) {
      return {
        name: (S.lang === "fa" ? s.fa[0] : s.en[0]),
        desc: (S.lang === "fa" ? s.fa[1] : s.en[1]),
        price: T().priceOnRequest, code: s.code, icon: s.icon, idx: i
      };
    });
  }
  function renderCat() {
    var b = body_("cat");
    b.innerHTML = "";
    var headEl = el("div", "zxc-sechead", b);
    headEl.textContent = (S.backend ? T().live : T().sim) + " · " + T().listTitle;
    var items = catalogItems();
    if (!items.length) {
      var em0 = el("div", "zxc-empty", b);
      em0.textContent = T().empty;
      return;
    }
    items.forEach(function (p, i) {
      var d = el("div", "zxc-card", b);
      var h4 = el("h4", null, d);
      h4.textContent = (p.icon || "📦") + " " + (p.name || "");
      var pd = el("p", null, d);
      pd.textContent = p.desc || "";
      var pm = el("p", null, d);
      pm.style.marginTop = "6px";
      var pr = el("span", "zxc-price", pm);
      pr.textContent = " " + (p.price || T().priceOnRequest) + " ";
      var cd = el("span", "zxc-code", pm);
      cd.textContent = p.code || "";
      var row = el("div", "zxc-rowb", d);
      var bq = el("button", "zxc-ok", row);
      bq.type = "button"; bq.textContent = T().bQuote;
      var idx = (p.idx !== undefined ? p.idx : i);
      bq.onclick = function () { setScreen("chat"); startQty(S.backend ? 0 : idx, 1); };
    });
  }
  function renderReq() {
    /* my_requests_text parity: badge list + cards */
    var b = body_("ord");
    b.innerHTML = "";
    if (!S.orders.length) {
      var em = el("div", "zxc-empty", b);
      em.textContent = T().noRequests;
      return;
    }
    var listCard = el("div", "zxc-card", b);
    var h = el("h4", null, listCard);
    h.textContent = T().myReqTitle;
    var pre = el("p", null, listCard);
    pre.style.whiteSpace = "pre-line";
    var lines = [];
    S.orders.slice(0, 5).forEach(function (o) {
      var badge = o.st === "approved" ? "✅" : o.st === "rejected" ? "✖" : "⏳";
      lines.push(badge + " " + o.ref + " · " + T().priceOnRequest + " · " + (T().status[o.st] || o.st));
    });
    pre.textContent = lines.join("\n");
    S.orders.forEach(function (o) {
      var d = el("div", "zxc-card", b);
      var h4 = el("h4", null, d);
      h4.textContent = "🧾 " + o.ref;
      var pill = el("span", "zxc-pill " + pillCls(o.st), h4);
      pill.textContent = T().status[o.st] || o.st;
      var p = el("p", null, d);
      p.textContent = svcName(o.pid) + " × " + o.qty;
    });
  }
  function renderSup(listMode, openRef) {
    var b = body_("sup");
    b.innerHTML = "";
    var nb = el("button", "zxc-gradbtn", b);
    nb.type = "button"; nb.textContent = T().bNewTicket;
    nb.onclick = function () { setScreen("chat"); startTicket(); };
    if (!listMode && openRef) {
      var t = null;
      for (var i = 0; i < S.tickets.length; i++) { if (S.tickets[i].ref === openRef) { t = S.tickets[i]; break; } }
      if (t) {
        t.unread = 0; save(); S.unreadSup = 0; paintBadges();
        var d = el("div", "zxc-card", b);
        var h4 = el("h4", null, d);
        h4.textContent = "🎫 " + t.ref + " · " + t.sev;
        var pill = el("span", "zxc-pill " + pillCls(t.st), h4);
        pill.textContent = T().status[t.st] || t.st;
        var th = el("div", "zxc-thread", d);
        t.thread.forEach(function (m) {
          var bbl = el("div", "zxc-t " + (m.me ? "zxc-me" : "zxc-them"), th);
          bbl.textContent = m.text;
        });
        var mi = el("div", "zxc-mini-in", d);
        var inp = el("input", null, mi);
        inp.maxLength = 500;
        var btn = el("button", null, mi);
        btn.type = "button"; btn.textContent = "➤";
        btn.onclick = function () {
          var v = inp.value.trim();
          if (!v) { return; }
          t.thread.push({ me: true, text: v.slice(0, 500), at: Date.now() });
          if (t.st === "resolved") { t.st = "open"; }
          save();
          renderSup(false, openRef);
          toast("→ " + t.ref);
        };
        inp.onkeydown = function (e) { if (e.key === "Enter") { btn.click(); } };
        return;
      }
    }
    if (!S.tickets.length) {
      var em = el("div", "zxc-empty", b);
      em.textContent = T().noRequests;
      return;
    }
    S.tickets.forEach(function (t) {
      var d = el("div", "zxc-card", b);
      d.style.cursor = "pointer";
      var h4 = el("h4", null, d);
      h4.textContent = "🎫 " + t.ref + " · " + t.sev + " ";
      var pill = el("span", "zxc-pill " + pillCls(t.st), h4);
      pill.textContent = T().status[t.st] || t.st;
      if (t.unread) {
        var up = el("span", "zxc-pill zxc-pno", h4);
        up.textContent = String(t.unread);
      }
      var p = el("p", null, d);
      p.textContent = ((t.thread[0] || {}).text || "").slice(0, 80) + "…";
      d.onclick = function () { renderSup(false, t.ref); };
    });
  }
  var openMgrTicket = "";
  function renderMgr(openTicket) {
    var b = body_("mgr");
    b.innerHTML = "";
    if (typeof openTicket === "string") { openMgrTicket = openTicket; }
    openTicket = openMgrTicket;
    var tg = el("div", "zxc-toggle", b);
    var lbl = el("span", null, tg);
    lbl.textContent = "🤖 " + T().mgrAuto;
    var tb = el("button", S.mgrAuto ? "zxc-on" : null, tg);
    tb.type = "button"; tb.textContent = S.mgrAuto ? T().mgrOn : T().mgrOff;
    tb.onclick = function () { S.mgrAuto = !S.mgrAuto; save(); renderMgr(""); };

    var pend = S.orders.filter(function (o) { return o.st === "pending"; });
    var h1 = el("div", "zxc-sechead", b);
    h1.textContent = T().queue + " (" + pend.length + ")";
    if (!pend.length) {
      var em = el("div", "zxc-empty", b);
      em.textContent = T().mgrEmpty || "—";
    }
    pend.forEach(function (o) {
      var d = el("div", "zxc-card", b);
      var h4 = el("h4", null, d);
      h4.textContent = "🧾 " + o.ref;
      var p = el("p", null, d);
      p.textContent = "👤 " + (o.cust || "-") + "\n" + (o.summary || (svcName(o.pid) + " × " + o.qty));
      var row = el("div", "zxc-rowb", d);
      var ba = el("button", "zxc-ok", row);
      ba.type = "button"; ba.textContent = T().approve;
      ba.onclick = function () { mgrDecide(o.ref, true, false); };
      var br = el("button", "zxc-danger", row);
      br.type = "button"; br.textContent = T().reject;
      br.onclick = function () {
        row.innerHTML = "";
        var l = el("div", null, row);
        l.textContent = T().rejWhy;
        l.style.cssText = "font-size:11.5px;color:var(--zxc-dim);width:100%";
        T().rejReasons.forEach(function (w) {
          var bb = el("button", null, row);
          bb.type = "button"; bb.textContent = w;
          bb.style.flex = "1 1 100%";
          bb.onclick = function () { o.why = w; mgrDecide(o.ref, false, false); };
        });
      };
    });

    var h2 = el("div", "zxc-sechead", b);
    h2.textContent = T().ticketsOpen + " (" + S.tickets.length + ")";
    if (!S.tickets.length) {
      var e2 = el("div", "zxc-empty", b);
      e2.textContent = "—";
    }
    S.tickets.forEach(function (t) {
      var d = el("div", "zxc-card", b);
      var h4 = el("h4", null, d);
      h4.textContent = "🎫 " + t.ref + " ";
      var pill = el("span", "zxc-pill " + pillCls(t.st), h4);
      pill.textContent = T().status[t.st] || t.st;
      if (openTicket === t.ref) {
        var th = el("div", "zxc-thread", d);
        th.style.margin = "8px 0";
        t.thread.forEach(function (m) {
          var bbl = el("div", "zxc-t " + (m.me ? "zxc-them" : "zxc-me"), th);
          bbl.textContent = (m.me ? "👤 " : "👔 ") + m.text;
        });
        var pr = el("div", "zxc-rowb", d);
        [["✓ " + T().status.resolved, "resolved"], ["⏳ " + T().status.waiting, "waiting"], ["🟢 " + T().status.open, "open"]].forEach(function (pair) {
          var bb = el("button", null, pr);
          bb.type = "button"; bb.textContent = pair[0];
          bb.onclick = (function (st, label) {
            return function () { mgrTicketReply(t.ref, "— " + label + " —", st); };
          })(pair[1], pair[0]);
        });
        var mi = el("div", "zxc-mini-in", d);
        var inp = el("input", null, mi);
        inp.maxLength = 500;
        inp.placeholder = T().mgrReplyPh;
        var btn = el("button", null, mi);
        btn.type = "button"; btn.textContent = "➤";
        btn.onclick = function () { var v = inp.value.trim(); if (v) { mgrTicketReply(t.ref, v); } };
        inp.onkeydown = function (e) { if (e.key === "Enter") { btn.click(); } };
      } else {
        var p = el("p", null, d);
        p.textContent = ((t.thread[t.thread.length - 1] || {}).text || "").slice(0, 90);
        d.style.cursor = "pointer";
        d.onclick = function () { renderMgr(t.ref); };
      }
    });
  }

  /* ═══════════════════════ 13. ROUTING (command parity) ═══════════════════════ */
  async function startQty(pid, q) {
    S.capture = { type: "qty", pid: pid, q: q };
    await botSay(null, qtyKb(pid, q), {
      rich: '<b class="g">' + T().pickQty + "</b>\n" + svcName(pid)
    });
  }
  async function startTicket() {
    S.capture = { type: "tdesc" };
    await botSay(T().newTicketMsg, null, {});
  }
  async function routeText(raw) {
    var text = String(raw || "").trim();
    if (!text) { return; }
    /* commands — get_text/help parity */
    var cmd = text.split(/\s+/)[0].toLowerCase();
    if (cmd === "/start") { await botSay(null, mainMenuKb(), { rich: richWelcome() }); return; }
    if (cmd === "/lang") { await botSay(T().langPicker, langKb(), {}); return; }
    if (cmd === "/prices") { await showShop(null); return; }
    if (cmd === "/support") { await botSay(T().supportMsg, supportMenuKb(), {}); return; }
    if (cmd === "/track") { await showTrack(); return; }
    if (cmd === "/quote") { await botSay(T().quoteMsg, quoteMenuKb(), {}); return; }
    if (cmd === "/contact") { await botSay(fillT(T().contactMsg), contactMenuKb(), {}); return; }
    if (cmd === "/help") { await botSay(T().helpMsg, null, {}); return; }
    /* onboarding (optional — askName) */
    if (!S.onboard) {
      var nm = text.trim();
      if (nm.length < 2) { await botSay(T().welcomeMsg, null, {}); return; }
      S.name = nm.slice(0, 40);
      S.onboard = true; save();
      await botSay(null, mainMenuKb(), { rich: richWelcome() });
      return;
    }
    /* capture steps */
    if (S.capture) {
      if (S.capture.type === "qty") {
        var n = parseInt(text.replace(/[^\d]/g, ""), 10);
        if (!n || n < 1) { await botSay(T().qtyInvalid, null, {}); return; }
        var pid = S.capture.pid;
        await botSay(null, confirmKb(pid, n), {
          rich: '<b class="g">' + T().confirm + "</b>\n\n" + orderSummary(pid, n)
        });
        return;
      }
      if (S.capture.type === "tdesc") {
        if (text.length < 3) { await botSay(T().tooShort, null, {}); return; }
        await placeTicket(text);
        return;
      }
      if (S.capture.type === "email") {
        var em = text.replace(/\s+/g, "").slice(0, 254);
        if (!EMAIL_RE.test(em)) { await botSay(T().emailInvalid, null, {}); return; }
        S.email = em; save();
        var cpid = S.capture.pid, cqty = S.capture.qty;
        S.capture = null;
        await doSubmit(cpid, cqty);
        return;
      }
    }
    if (/^(track|پیگیری|تتبع)$/i.test(text.trim())) { await showTrack(); return; }
    /* emergency keyword — template parity */
    if (/\b(emergency|اضطراری|طوارئ)\b/i.test(text)) {
      await botSay(fillT(T().emergencyMsg), supportMenuKb(), {});
      return;
    }
    /* free text → backend chat or local knowledge */
    var typingEl = addTyping();
    upgradeAllRead();
    setStatusTyping(true);
    try {
      var r = await askBackendChat(text);
      removeNode(typingEl);
      setStatusTyping(false);
      if (r.json && r.json.session) { S.session = r.json.session; save(); }
      if (r.status === 200 && r.json && r.json.reply) {
        var m = addMsg("in", { text: r.json.reply, preserveNl: true });
        addReactBar(m.wrap);
        pop();
      } else if (r.status === 429) {
        addMsg("in", { text: "⏳ " + (S.lang === "fa" ? "آروم‌تر 😅" : "You're sending messages quickly 😅"), preserveNl: true });
      } else {
        addMsg("in", { text: localAnswer(text), preserveNl: true });
      }
    } catch (e) {
      removeNode(typingEl);
      setStatusTyping(false);
      addMsg("in", { text: localAnswer(text), preserveNl: true });
    }
    scrollLog();
  }
  function richWelcome() { return '<b class="g">✨ ' + (S.lang === "fa" ? "به زنوویکس خوش آمدید" : S.lang === "ar" ? "مرحباً بكم في زينوفكس" : "Welcome to Zenovix") + "</b>\n" + T().welcomeMsg.replace(/^✨[^\n]*\n/, "").replace(/<[^>]*>/g, ""); }
  function fillT(tpl) { return String(tpl).replace("{email}", CFG.email); }

  /* ═══════════════════════ 14. CALLBACKS ═══════════════════════ */
  async function onCb(cb, arg, box) {
    if (cb === "noop") { return; }
    if (cb === "menu_home") { kbReceipt(box, "🏠"); await botSay(null, mainMenuKb(), { rich: richWelcome() }); return; }
    if (cb === "shop") { await showShop(box); return; }
    if (cb === "menu_quote") { kbReceipt(box, "📋"); await botSay(T().quoteMsg, quoteMenuKb(), {}); return; }
    if (cb === "menu_support") { kbReceipt(box, "🛠"); await botSay(T().supportMsg, supportMenuKb(), {}); return; }
    if (cb === "menu_contact") { kbReceipt(box, "📞"); await botSay(fillT(T().contactMsg), contactMenuKb(), {}); return; }
    if (cb === "menu_help") { kbReceipt(box, "❓"); await botSay(T().helpMsg, helpMenuKb(), {}); return; }
    if (cb === "menu_lang") { kbReceipt(box, "🌐"); await botSay(T().langPicker, langKb(), {}); return; }
    if (cb === "my_requests") {
      kbReceipt(box, "🧾");
      if (!S.orders.length) { await botSay(T().noRequests, mainMenuKb(), {}); return; }
      var lines = [T().myReqTitle];
      S.orders.slice(0, 5).forEach(function (o) {
        var badge = o.st === "approved" ? "✅" : o.st === "rejected" ? "✖" : "⏳";
        lines.push(badge + " " + o.ref + " · " + T().priceOnRequest + " · " + (T().status[o.st] || o.st));
      });
      await botSay(lines.join("\n"), null, {});
      return;
    }
    if (cb === "talk_sales") { kbReceipt(box, "💬"); await botSay(T().talkSales, quoteMenuKb(), {}); return; }
    if (cb === "new_ticket") { kbReceipt(box, "🎫"); await startTicket(); return; }
    if (cb === "faq") { kbReceipt(box, "📖"); await botSay(T().faqMsg, null, {}); return; }
    if (cb === "emergency") { kbReceipt(box, "🚨"); await botSay(fillT(T().emergencyMsg), supportMenuKb(), {}); return; }
    if (cb === "contact_call") { kbReceipt(box, "📞"); await botSay(T().contactCallT + ":\n+971 4570 1100\nwa.me/97145701100", null, {}); return; }
    if (cb === "contact_email") { kbReceipt(box, "✉️"); await botSay(T().contactEmailT + ":\n" + CFG.email, null, {}); return; }
    if (cb === "contact_location") { kbReceipt(box, "📍"); await botSay(T().contactLocT + ":\nOffice 2703, Aspect Tower, Business Bay, Dubai, UAE", null, {}); return; }
    if (cb === "contact_hours") { kbReceipt(box, "🕘"); await botSay(T().contactHoursT + ":\nMon–Fri 9:00–18:00 GST (UTC+4)", null, {}); return; }
    if (cb.indexOf("lang_") === 0) {
      var code = cb.slice(5);
      if (!FLAG[code]) { return; }
      S.lang = code; save(); applyLang();
      kbReceipt(box, FLAG[code]);
      await botSay(null, mainMenuKb(), { rich: richWelcome() });
      return;
    }
    if (cb === "prod") {
      kbReceipt(box, "▸");
      var i = Number(arg);
      await botSay(null, productKb(i), { rich: productRich(i) });
      return;
    }
    if (cb === "qstart") {
      kbReceipt(box, "📋");
      await startQty(Number(arg), 1);
      return;
    }
    if (cb === "qplus" || cb === "qmin") {
      var parts = String(arg).split(":");
      var qp = Number(parts[0]), q = Number(parts[1]);
      var nn = cb === "qplus" ? Math.min(9, q + 1) : Math.max(1, q - 1);
      S.capture = { type: "qty", pid: qp, q: nn };
      if (box) {
        paintKb(qtyKb(qp, nn), null, box);
        var msg = box.closest ? box.closest(".zxc-msg") : null;
        if (msg) {
          var txtEl = msg.querySelector(".zxc-txt");
          if (txtEl) {
            txtEl.innerHTML = "";
            fillRich(txtEl, '<b class="g">' + esc(T().pickQty) + "</b>\n" + esc(svcName(qp)));
          }
        }
      }
      scrollLog();
      return;
    }
    if (cb === "qcustom") {
      kbReceipt(box, "⌨️");
      S.capture = { type: "qty", pid: Number(arg), q: 1 };
      await botSay(T().qtyPrompt, null, {});
      return;
    }
    if (cb === "tosum") {
      var cp = String(arg).split(":");
      kbReceipt(box, "📝");
      await botSay(null, confirmKb(Number(cp[0]), Number(cp[1])), {
        rich: '<b class="g">' + T().confirm + "</b>\n\n" + orderSummary(Number(cp[0]), Number(cp[1]))
      });
      return;
    }
    if (cb === "oconfirm") {
      var cparts = String(arg).split(":");
      kbReceipt(box, "✅");
      await submitRequest(Number(cparts[0]), Number(cparts[1]));
      return;
    }
    if (cb === "cancel") {
      kbReceipt(box, "✖");
      S.capture = null;
      await botSay(T().cancelled, mainMenuKb(), {});
      return;
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-cb]") : null;
    if (!b || b.disabled) { return; }
    var box = b.closest(".zxc-ikb");
    var cb = b.dataset.cb, arg = b.dataset.arg;
    if (cb === "noop") { return; }
    if (box) { Array.prototype.forEach.call(box.querySelectorAll("button"), function (x) { x.disabled = true; }); }
    Promise.resolve(onCb(cb, arg, box)).finally(function () {
      if (box && box.isConnected) {
        Array.prototype.forEach.call(box.querySelectorAll("button"), function (x) {
          if (x.dataset.cb !== "noop") { x.disabled = false; }
        });
      }
    });
  });

  /* ═══════════════════════ 15. LANGUAGE ═══════════════════════ */
  function paintSug() {
    sug.innerHTML = "";
    (T().sug || []).forEach(function (s) {
      var b = el("button", null, sug);
      b.type = "button"; b.textContent = s;
    });
  }
  function applyLang() {
    var t = T();
    panel.setAttribute("dir", t.dir);
    panel.setAttribute("lang", S.lang);
    status.textContent = t.online;
    input.placeholder = t.inputPh;
    fabLabel.textContent = CFG.buttonText;
    foot.lastChild.textContent = CFG.footer || t.footerDef;
    Object.keys(navBtns).forEach(function (k, i) {
      navBtns[k].querySelector(".zxc-l").textContent = t.nav[i];
    });
    paintSug();
    modeTag.textContent = S.mode === "live" ? t.live : t.sim;
    modeTag.classList.toggle("zxc-live", S.mode === "live");
    save();
  }

  /* ═══════════════════════ 16. EVENTS ═══════════════════════ */
  var booted = false;
  function openPanel(state) {
    panel.classList.toggle("zxc-open", state);
    fab.setAttribute("aria-expanded", state ? "true" : "false");
    if (state) {
      if (!booted) { boot(); }
      if (unreadAnchor && unread > 0) {
        var div = el("div", "zxc-unread");
        div.textContent = unread + " unread message" + (unread > 1 ? "s" : "");
        log.insertBefore(div, unreadAnchor);
        unreadAnchor = null; unread = 0;
      }
      unread = 0; paintBadges();
      setTimeout(function () { input.focus(); }, 180);
      scrollLog();
    }
  }

  fab.addEventListener("click", function () { openPanel(!panel.classList.contains("zxc-open")); });
  backBtn.addEventListener("click", function () { openPanel(false); });

  /* nav */
  Object.keys(navBtns).forEach(function (k) {
    navBtns[k].addEventListener("click", function () { setScreen(k); });
  });

  /* [data-open-chat] opens the widget (delegated) + dropdown close logic */
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    var n = t; // walk-up cursor — must not touch t (used by close checks below)
    while (n && n !== document) {
      if (n.hasAttribute && n.hasAttribute("data-open-chat")) { ev.preventDefault(); openPanel(true); return; }
      n = n.parentNode;
    }
    if (!menu.classList.contains("zxc-show") && !emojiBox.classList.contains("zxc-show")) { return; }
    if (!menu.contains(t) && t !== menuBtn && !menuBtn.contains(t)) { menu.classList.remove("zxc-show"); }
    if (!emojiBox.contains(t) && t !== emoBtn && !emoBtn.contains(t)) { emojiBox.classList.remove("zxc-show"); }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      if (emojiBox.classList.contains("zxc-show")) { emojiBox.classList.remove("zxc-show"); }
      else if (menu.classList.contains("zxc-show")) { menu.classList.remove("zxc-show"); }
      else if (panel.classList.contains("zxc-open")) { openPanel(false); }
    }
  });

  /* header actions */
  videoBtn.addEventListener("click", function () { toast("🎥 " + CFG.phone); });
  callBtn.addEventListener("click", function () { toast("📞 " + CFG.phone); });
  langBtn.addEventListener("click", function () {
    setScreen("chat");
    botSay(T().langPicker, langKb(), {});
  });
  mgrBtn.addEventListener("click", function () {
    setScreen(S.screen === "mgr" ? "chat" : "mgr");
  });
  menuBtn.addEventListener("click", function () { menu.classList.toggle("zxc-show"); });
  waBtn.addEventListener("click", function () { window.open(CFG.whatsappLink, "_blank", "noopener"); menu.classList.remove("zxc-show"); });
  mailBtn.addEventListener("click", function () { window.location.href = "mailto:" + CFG.email; menu.classList.remove("zxc-show"); });
  soundBtn.addEventListener("click", function () {
    CFG.sound = !CFG.sound;
    soundBtn.lastChild.textContent = "Sounds: " + (CFG.sound ? "on" : "off");
    if (CFG.sound) { pop(); }
    menu.classList.remove("zxc-show");
  });
  resetBtn.addEventListener("click", function () {
    S.session = ""; S.name = ""; S.email = ""; S.onboard = CFG.askName; S.capture = null;
    S.orders = []; S.tickets = []; S.unreadOrd = 0; S.unreadSup = 0; S.mgrAuto = false; openMgrTicket = "";
    try { localStorage.removeItem("zxc3"); } catch (e) {}
    while (log.firstChild) { removeNode(log.firstChild); }
    unread = 0; unreadAnchor = null; pendingBelow = 0;
    paintBadges();
    booted = false;
    openPanel(true);
    toast("🔄 " + (S.lang === "fa" ? "گفتگو از نو" : "Conversation restarted"));
  });

  /* emoji picker */
  emoBtn.addEventListener("click", function () { emojiBox.classList.toggle("zxc-show"); });
  emojiBox.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button") : null;
    if (!b) { return; }
    input.value += b.textContent;
    input.focus();
  });

  /* composer */
  clipBtn.addEventListener("click", function () { toast("📎 " + CFG.email); });
  function setSendIcon() {
    send.innerHTML = icon(input.value.trim() ? "send" : "mic", 21);
    send.title = input.value.trim() ? "Send" : "Voice message";
  }
  input.addEventListener("input", setSendIcon);
  function sendCurrent() {
    var text = input.value.trim();
    if (!text) { toast("🎤 " + (S.lang === "fa" ? "فعلاً تایپ کن 🙂" : "Voice is on the roadmap — type for now 🙂")); return; }
    addMsg("out", { text: text, ticks: true });
    input.value = ""; setSendIcon();
    var self = log.querySelector(".zxc-out:last-child .zxc-tick");
    if (self) { setTimeout(function () { if (self.isConnected) { self.innerHTML = icon("check1", 15, 2); } }, 420); }
    routeText(text);
  }
  send.addEventListener("click", sendCurrent);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { sendCurrent(); } });
  sug.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button") : null;
    if (b) { addMsg("out", { text: b.textContent, ticks: true }); routeText(b.textContent); }
  });
  scrollBtn.addEventListener("click", function () { hideScroll(); scrollLog(); });

  /* ═══════════════════════ 17. BOOT ═══════════════════════ */
  var booting = false;
  async function boot() {
    if (booted || booting) { return; }
    booting = true;
    if (CFG.encryption) {
      systemPill("lock", S.lang === "fa"
        ? "پیام‌ها رمزگذاری سرتاسری‌اند — فقط میز Zenovix می‌خواند."
        : "Messages are end-to-end encrypted. Only Zenovix's desk can read them.");
    }
    dateDivider();
    var live = await bootBackend();
    applyLang();
    var banner = "<b>" + esc("🤖 " + CFG.title) + "</b> · " + (live ? T().live : T().sim);
    var m = addMsg("in", { rich: banner, preserveNl: true });
    addReactBar(m.wrap);
    if (CFG.askName && !S.onboard) {
      await botSay(CFG.greeting || T().welcomeMsg, null, {});
    } else {
      await botSay(null, mainMenuKb(), { rich: CFG.greeting ? '<b class="g">' + CFG.greeting + "</b>" : richWelcome() });
    }
    systemPill("clock", inBusinessHours()
      ? "🕘 " + (S.lang === "fa" ? "میز آنلاین است · مدیر در چت جواب می‌دهد" : "The desk is online · managers reply in chat")
      : "🌙 " + (S.lang === "fa" ? "خارج از ساعت کاری · پیام بگذار" : "Away — leave a message, we reply next business hours"));
    presence.className = inBusinessHours() ? "" : "zxc-away";
    booted = true; booting = false;
  }

  /* public mini-API */
  window.ZenovixChatAPI = {
    open: function () { openPanel(true); },
    close: function () { openPanel(false); },
    toggle: function () { openPanel(!panel.classList.contains("zxc-open")); },
    send: function (t) { openPanel(true); addMsg("out", { text: String(t), ticks: true }); routeText(String(t)); },
    reset: function () { resetBtn.click(); },
    setLang: function (l) { if (LANGS.some(function (x) { return x[0] === l; })) { S.lang = l; save(); applyLang(); } },
    openCatalog: function () { openPanel(true); setScreen("cat"); }
  };
})();
