/* Zenovix Chat Widget v3.2 — bot-parity test suite (jsdom) + Xbot TTS/STT/track */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/../frontend/zenovix-chat.js", "utf8");

function makeBrowser(storage, fetchImpl, cfg) {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><a href="#" data-open-chat>open</a></body></html>`,
    { url: "http://localhost:5000/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  if (cfg) { w.ZenovixChat = cfg; }
  w.fetch = fetchImpl || (() => Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true, reply: "LIVE reply", session: "s1" }) }));
  w.HTMLElement.prototype.scrollTo = function () {};
  w.speechSynthesis = { cancel(){}, speak(u){ (w.__spoke = w.__spoke || []).push(u.text); } };
  w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(w, "localStorage", { value: {
    _s: storage || {},
    getItem(k){ return this._s[k] ?? null; },
    setItem(k,v){ this._s[k]=String(v); },
    removeItem(k){ delete this._s[k]; }
  }});
  w.eval(src);
  const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  return { w, d, click, sleep };
}

(async () => {
  let pass = 0, fail = 0;
  const ok = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? "✓" : "✗ FAIL"), name); };
  const storage = {};
  const { w, d, click, sleep } = makeBrowser(storage);
  const $ = s => d.querySelector(s);
  const $$ = s => Array.from(d.querySelectorAll(s));
  const lastBot = () => { const l = $$(".zxc-msg.zxc-in"); return l[l.length-1]; };
  const ikb = (msg) => msg ? Array.from(msg.querySelectorAll(".zxc-ikb button")) : [];
  const input = () => $(".zxc-comp input");
  const sendTxt = async (t) => { input().value = t; click($(".zxc-sendbtn")); await sleep(1800); };

  click($("[data-open-chat]"));
  await sleep(300);
  ok("panel opens", $(".zxc-panel").classList.contains("zxc-open"));
  await sleep(2600);
  /* exact platform welcome */
  ok("welcome verbatim (How can we help you today?)", lastBot().textContent.includes("How can we help you today?"));
  ok("welcome has ━━━ divider", lastBot().textContent.includes("━━━━━━━━━━━━━━━━━━━━━━━"));

  /* Xbot v3.2 — TTS دکمه کنار ویجت */
  const ttsBtn = $(".zxc-ttsbtn");
  ok("TTS button next to FAB (Xbot port)", !!ttsBtn);
  click(ttsBtn); await sleep(200);
  ok("TTS auto-read ON (class + pref)", ttsBtn.classList.contains("zxc-on") && storage["zxc_tts"] === "1");
  /* exact main menu: 1+2+2+2 = 7 buttons */
  const menuMsg = lastBot();
  ok("main menu 7 buttons (4 rows)", ikb(menuMsg).length === 7);
  ok("menu: Shop full row", ikb(menuMsg)[0].textContent === "🛒 Products & Prices");
  ok("menu: Quote+Support row", ikb(menuMsg)[1].textContent === "📋 Request Quote" && ikb(menuMsg)[2].textContent === "🛠 Technical Support");
  ok("menu: MyRequests+Language row", ikb(menuMsg)[5].textContent === "🧾 My requests" && ikb(menuMsg)[6].textContent.includes("🌐"));
  ok("TTS announce spoken on toggle", (w.__spoke || []).length >= 1 && w.__spoke.join(" ").includes("Auto-read is on"));
  const sayCount = $$(".zxc-msg.zxc-in .zxc-say").length;
  ok("per-message 🔊 buttons", sayCount >= 1);
  const spokeN = w.__spoke.length;
  click($(".zxc-msg.zxc-in .zxc-say")); await sleep(150);
  ok("bubble 🔊 speaks on click", w.__spoke.length === spokeN + 1);

  /* SHOP FLOW — shop_flow.py parity */
  click(ikb(menuMsg)[0]);
  await sleep(1800);
  const prodMsg = lastBot();
  ok("TTS auto-reads new bot message", (w.__spoke || []).join(" ").includes("Products & services"));
  ok("shop: 6 services + back", ikb(prodMsg).length === 7);
  click(ikb(prodMsg)[3]); // ⚙️ Intelligent Automation
  await sleep(1800);
  const detMsg = lastBot();
  ok("product detail + price on request", detMsg.textContent.includes("human approvals") && detMsg.textContent.includes("price on request"));
  click(ikb(detMsg)[0]); // 📋 Request Quote
  await sleep(1800);
  const qtyMsg = lastBot();
  ok("qty: stepper+custom+send+cancel (6)", ikb(qtyMsg).length === 6);
  click(ikb(qtyMsg)[2]); // ➕ → 2
  await sleep(250);
  ok("qty stepper → 2", ikb(qtyMsg)[1].textContent === "2");
  click(ikb(qtyMsg)[4]); // 📤 Send request → confirmation summary
  await sleep(1800);
  const confMsg = lastBot();
  ok("confirmation summary (Code SVC-04)", confMsg.textContent.includes("Please confirm your request") && confMsg.textContent.includes("SVC-04") && confMsg.textContent.includes("2"));
  click(ikb(confMsg)[0]); // Send request
  await sleep(2400);
  ok("Q-ref created", /Q-[0-9A-F]{4}/.test(lastBot().textContent));
  ok("sent text verbatim", lastBot().textContent.includes("was sent to our commercial team"));
  ok("mgr badge pending", $(".zxc-mini").classList.contains("zxc-show"));

  /* MANAGER approves — HITL parity */
  click($$(".zxc-hactions button")[1]); // 👔
  await sleep(200);
  ok("manager queue (1)", $("#zxc-body-mgr").textContent.includes("(1)"));
  const approveBtn = Array.from($("#zxc-body-mgr").querySelectorAll("button")).find(b => b.textContent.includes("Approve"));
  click(approveBtn);
  await sleep(2000);
  ok("approved text verbatim + summary", lastBot().textContent.includes("was approved by our manager") && lastBot().textContent.includes("SVC-04"));

  /* MY REQUESTS — my_requests_text parity */
  click($$(".zxc-hactions button")[1]); // back to chat via mgr toggle
  await sleep(150);
  await sendTxt("/start");
  const mm = lastBot();
  click(ikb(mm)[5]); // 🧾 My requests
  await sleep(1800);
  ok("my requests badge list", lastBot().textContent.includes("Your recent requests:") && lastBot().textContent.includes("✅ Q-"));

  /* Xbot v3.2 — /track */
  await sendTxt("/track");
  ok("/track lists refs+status", lastBot().textContent.includes("Q-") && lastBot().textContent.includes("✅"));

  /* SUPPORT sub-menu + ticket — _section_rows parity */
  await sendTxt("/support");
  ok("support section verbatim", lastBot().textContent.includes("Technical Support") && lastBot().textContent.includes("type emergency"));
  click(ikb(lastBot())[0]); // 🎫 New support ticket
  await sleep(1800);
  ok("new_ticket text verbatim", lastBot().textContent.includes("Describe the issue in one message"));
  await sendTxt("The dashboard is down since morning");
  await sleep(2400);
  ok("TKT created", /TKT-[0-9A-F]{4}/.test(lastBot().textContent));

  /* FAQ + EMERGENCY — orchestrator templates */
  await sendTxt("/support");
  click(ikb(lastBot())[1]); // 📖 FAQ
  await sleep(1800);
  ok("FAQ verbatim", lastBot().textContent.includes("Common questions:") && lastBot().textContent.includes("Payment: never taken in this chat"));
  await sendTxt("this is an emergency!");
  ok("emergency template verbatim", lastBot().textContent.includes("Emergency keyword detected") && lastBot().textContent.includes("Or call local emergency services"));

  /* CONTACT sub-menu — 4 details */
  await sendTxt("/contact");
  ok("contact verbatim", lastBot().textContent.includes("Contact Us") && lastBot().textContent.includes("wa.me/97145701100"));
  click(ikb(lastBot())[2]); // 📍 Location
  await sleep(1800);
  ok("contact_location detail", lastBot().textContent.includes("Office 2703, Aspect Tower"));

  /* COMMANDS + 21-language picker */
  await sendTxt("/lang");
  ok("lang picker verbatim", lastBot().textContent.includes("Choose your language"));
  const langMsg = lastBot();
  ok("21 language buttons", ikb(langMsg).length === 21);
  ok("flags + native names", ikb(langMsg)[0].textContent === "🇬🇧 English" && ikb(langMsg)[9].textContent === "🇷🇺 Русский");
  click(ikb(langMsg)[1]); // 🇮🇷 فارسی
  await sleep(2000);
  ok("fa RTL + fa nav", $(".zxc-panel").getAttribute("dir") === "rtl" && $$(".zxc-nav button .zxc-l")[2].textContent === "درخواست‌های من");
  await sendTxt("/help");
  ok("fa help verbatim", lastBot().textContent.includes("راهنمای دستورات و استفاده"));
  await sendTxt("قیمت چنده؟");
  await sleep(1500);
  ok("free text → backend (LIVE mock)", lastBot().textContent.includes("LIVE reply"));

  /* persistence */
  const saved = JSON.parse(storage["zxc3"] || "{}");
  ok("persisted orders+tickets+lang=fa", saved.orders.length === 1 && saved.orders[0].st === "approved" && saved.tickets.length === 1 && saved.lang === "fa");

  /* backend parity endpoints against the bundled Flask API */
  const realFetch = async (url, opts) => {
    const http = require("http");
    const u = new URL(url.replace("http://localhost:5000", "http://127.0.0.1:5000"));
    return new Promise((resolve) => {
      const req = http.request({ hostname: "127.0.0.1", port: 5000, path: u.pathname + u.search, method: opts && opts.method || "GET",
        headers: { "Content-Type": "application/json" } }, (res) => {
        let body = ""; res.on("data", c => body += c); res.on("end", () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: () => Promise.resolve(JSON.parse(body || "{}")) }));
      });
      if (opts && opts.body) req.write(opts.body);
      req.end();
    });
  };
  const storage2 = {};
  const B2 = makeBrowser(storage2, realFetch, { api: "http://127.0.0.1:5000/api/chat", apiBase: "http://127.0.0.1:5000/api/public" });
  const $2 = s => B2.d.querySelector(s);
  const $$2 = s => Array.from(B2.d.querySelectorAll(s));
  const last2 = () => { const l = $$2(".zxc-msg.zxc-in"); return l[l.length-1]; };
  const click2 = el => el.dispatchEvent(new B2.w.MouseEvent("click", { bubbles: true }));
  const wait2 = async (fn, ms) => { const end = Date.now() + (ms || 6000); while (Date.now() < end) { const v = fn(); if (v) { return v; } await B2.sleep(200); } return null; };
  click2($2("[data-open-chat]"));
  await wait2(() => $2(".zxc-mode").textContent === "LIVE");
  ok("LIVE mode tag", $2(".zxc-mode").textContent === "LIVE");
  /* real /enquiry through widget flow */
  const send2 = async (t) => { $2(".zxc-comp input").value = t; click2($2(".zxc-sendbtn")); await B2.sleep(1600); };
  await send2("/prices");
  const prodBtn = await wait2(() => Array.from($$2(".zxc-ikb button")).filter(b => b.dataset.cb === "prod")[2]);
  click2(prodBtn);
  const qsBtn = await wait2(() => $2(".zxc-ikb button[data-cb='qstart']"));
  ok("product detail in LIVE", !!qsBtn);
  click2(qsBtn);
  const qtyBtn = await wait2(() => $2(".zxc-ikb button[data-cb='tosum']"));
  click2(qtyBtn);
  const confBtn = await wait2(() => $2(".zxc-ikb button[data-cb='oconfirm']"));
  ok("confirmation in LIVE", !!confBtn);
  click2(confBtn);
  const emailAsk = await wait2(() => last2() && last2().textContent.includes("best e-mail") ? last2() : null);
  ok("LIVE asks e-mail (enquiry contract)", !!emailAsk);
  $2(".zxc-comp input").value = "buyer@example.com";
  click2($2(".zxc-sendbtn"));
  await wait2(() => /ZX-[0-9A-F]{8}/.test(last2() ? last2().textContent : ""));
  ok("LIVE /enquiry → ZX reference", /ZX-[0-9A-F]{8}/.test(last2() ? last2().textContent : ""));

  /* Xbot v3.2 — /track در LIVE (اندپوینت واقعی فورک) */
  await send2("/track");
  const trk = await wait2(() => last2() && (last2().textContent.includes("received by our commercial team") || last2().textContent.includes("under review")) ? last2() : null, 8000);
  ok("LIVE /track → backend status", !!trk);

  /* ── landing + admin backstage (real HTTP against the bundled API) ── */
  const http2 = require("http"), crypto2 = require("crypto");
  const get = (path, headers) => new Promise((resolve) => {
    const q = http2.request({ hostname: "127.0.0.1", port: 5000, path, headers: headers || {} }, (res) => {
      let b = ""; res.on("data", c => b += c); res.on("end", () => resolve({ status: res.statusCode, body: b }));
    }); q.on("error", () => resolve({ status: 0, body: "" })); q.end();
  });
  const post2 = (path, body, headers) => new Promise((resolve) => {
    const data = JSON.stringify(body || {});
    const q = http2.request({ hostname: "127.0.0.1", port: 5000, path, method: "POST", headers: Object.assign({ "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }, headers || {}) }, (res) => {
      let b = ""; res.on("data", c => b += c); res.on("end", () => resolve({ status: res.statusCode, body: b }));
    }); q.on("error", () => resolve({ status: 0, body: "" })); q.write(data); q.end();
  });
  let lr, lj, ljd, ad;
  lr = await get("/");
  ok("GET / → landing (html + widget + team login)", lr.status === 200 && lr.body.includes("/widget.js") && lr.body.includes("/admin") && lr.body.includes("Zenovix"));
  lr = await get("/api");
  ok("GET /api → endpoint map (json)", lr.status === 200 && lr.body.includes("endpoints") && lr.body.includes("/api/chat"));
  lr = await get("/admin");
  ok("GET /admin → backstage page", lr.status === 200 && lr.body.includes("Zenovix Backstage") && lr.body.includes("password"));
  lr = await get("/api/admin/data");
  ok("admin data requires a token (401)", lr.status === 401);
  lj = await post2("/api/admin/login", { password: "definitely-wrong" });
  ok("admin login rejects a wrong password", lj.status === 401);
  /* assumes the default password (CI sets no ADMIN_PASSWORD) */
  const secret = crypto2.createHash("sha256").update("zx-backstage:zenovix-admin").digest("hex");
  const exp2 = Math.floor(Date.now() / 1000) + 3600;
  const goodTok = exp2 + "." + crypto2.createHmac("sha256", secret).update("admin:" + exp2).digest("hex");
  lj = await post2("/api/admin/login", { password: "zenovix-admin" });
  ljd = {};
  try { ljd = JSON.parse(lj.body); } catch (e) {}
  ok("admin login OK (token + default flag)", lj.status === 200 && ljd.ok === true && ljd.default_password === true && /^[0-9]+\.[0-9a-f]{64}$/.test(ljd.token || ""));
  lr = await get("/api/admin/data", { "X-Admin-Token": goodTok });
  ad = {};
  try { ad = JSON.parse(lr.body); } catch (e) {}
  ok("admin data with a valid token (leads + stats)", lr.status === 200 && ad.ok === true && Array.isArray(ad.leads) && ad.stats && typeof ad.stats.leads === "number");
  lr = await get("/api/admin/data", { "X-Admin-Token": goodTok.slice(0, -2) + "ff" });
  ok("admin data rejects a forged token", lr.status === 401);

  /* ── Telegram channel E2E: mock Telegram API + dedicated backend on a random port ── */
  const cp = require("child_process");
  const TGPORT = 5100 + Math.floor(Math.random() * 40);   // random: immune to stale servers from earlier runs
  const MOCKPORT = 5150 + Math.floor(Math.random() * 40);
  const tgSent = [];   // every sendMessage the bot would deliver
  const mockTg = http2.createServer((mreq, mres) => {
    let mb = ""; mreq.on("data", c => mb += c);
    mreq.on("end", () => {
      try { const p = JSON.parse(mb || "{}"); tgSent.push({ url: mreq.url, chat_id: p.chat_id, text: p.text || "" }); } catch (e) {}
      mres.setHeader("Content-Type", "application/json");
      mres.end(JSON.stringify({ ok: true, result: { message_id: tgSent.length } }));
    });
  });
  await new Promise((r) => mockTg.listen(MOCKPORT, "127.0.0.1", r));
  const BE = TGPORT, MG = MOCKPORT;
  const tgReq = (port, method, path, body, headers) => new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const q = http2.request({ hostname: "127.0.0.1", port, path, method,
      headers: Object.assign({}, data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}, headers || {}) },
      (res2) => { let b2 = ""; res2.on("data", c => b2 += c); res2.on("end", () => resolve({ status: res2.statusCode, body: b2 })); });
    q.on("error", () => resolve({ status: 0, body: "" })); if (data) q.write(data); q.end();
  });
  const upd = (payload) => tgReq(BE, "POST", "/tg/webhook/s3cret", payload);
  const lastTg = () => tgSent[tgSent.length - 1];
  const tgWait = async (pred, ms) => { const end = Date.now() + (ms || 5000); while (Date.now() < end) { const v = pred(); if (v) return v; await B2.sleep(150); } return null; };

  /* unconfigured on the main backend (no TG env in CI) */
  lr = await get("/api");
  try { ljd = JSON.parse(lr.body); } catch (e) {}
  ok("telegram reported as off when no token", ljd && ljd.telegram && ljd.telegram.configured === false);
  lj = await post2("/tg/webhook/test", { update_id: 1 });
  ok("webhook without a token → 503", lj.status === 503);

  /* dedicated backend with the bot enabled */
  const tgChild = cp.spawn("python3", ["../backend/app.py"], {
    env: Object.assign({}, process.env, { PORT: String(BE), TELEGRAM_BOT_TOKEN: "12345:TESTTOKEN", TELEGRAM_WEBHOOK_SECRET: "s3cret", TELEGRAM_ADMIN_IDS: "111", TELEGRAM_API_BASE: "http://127.0.0.1:" + MG }),
    stdio: "ignore",
  });
  let tgUp = false;
  for (let i = 0; i < 60 && !tgUp; i++) { const h = await tgReq(BE, "GET", "/health"); tgUp = h.status === 200; if (!tgUp) await B2.sleep(300); }
  ok("TG backend booted with the bot enabled", tgUp);
  lr = await tgReq(BE, "GET", "/api");
  try { ljd = JSON.parse(lr.body); } catch (e) {}
  ok("telegram reported as connected", !!(ljd && ljd.telegram && ljd.telegram.configured === true));

  const msgU = (uid, text2, fid) => ({ update_id: Date.now(), message: { message_id: 1, from: { id: uid, first_name: "Tester", username: "t" }, chat: { id: uid, type: "private" }, text: text2, date: 1 } });
  const cbU = (uid, data2) => ({ update_id: Date.now(), callback_query: { id: "cb" + Math.random(), from: { id: uid, first_name: "Tester" }, message: { message_id: 5, chat: { id: uid, type: "private" } }, data: data2 } });

  await upd(msgU(111, "/start"));
  ok("TG /start → welcome with the menu", !!(await tgWait(() => lastTg() && lastTg().chat_id === 111 && lastTg().text.includes("How can we help you today?"))));
  lj = await tgReq(BE, "POST", "/tg/webhook/WRONG", msgU(111, "/start"));
  ok("TG webhook rejects a bad secret", lj.status === 403);
  const snapShop = tgSent.length;
  await upd(cbU(111, "shop"));
  ok("TG shop → 6 services listed", !!(await tgWait(() => tgSent.length > snapShop && lastTg().text.includes("Pick one"))));
  await upd(cbU(111, "svc:SVC-01"));
  ok("TG service detail → price on request", !!(await tgWait(() => lastTg() && lastTg().text.includes("Artificial Intelligence") && lastTg().text.includes("Price on request"))));
  await upd(cbU(111, "quote:SVC-01"));
  ok("TG quote flow asks the requirement", !!(await tgWait(() => lastTg() && lastTg().text.includes("Describe your requirement"))));
  await upd(msgU(111, "Need an AI chatbot for my shop"));
  ok("TG quote flow asks the e-mail", !!(await tgWait(() => lastTg() && lastTg().text.includes("e-mail"))));
  await upd(msgU(111, "tester@example.com"));
  const zxMsg = await tgWait(() => lastTg() && /ZX-[0-9A-F]{8}/.test(lastTg().text) ? lastTg() : null, 6000);
  ok("TG order → ZX reference", !!zxMsg);
  ok("TG order → admin push to manager 111", !!(await tgWait(() => tgSent.some(m => m.chat_id === 111 && m.text.includes("New order")))));
  await upd(msgU(111, "/track"));
  ok("TG /track lists the ZX ref", !!(await tgWait(() => lastTg() && lastTg().text.includes(zxMsg ? zxMsg.text.match(/ZX-[0-9A-F]{8}/)[0] : "ZX-"))));
  await upd(cbU(111, "support"));
  ok("TG support flow opens", !!(await tgWait(() => lastTg() && lastTg().text.includes("Describe the issue"))));
  await upd(msgU(111, "The dashboard is down since morning"));
  ok("TG ticket → TKT reference", !!(await tgWait(() => lastTg() && /TKT-[0-9A-F]{6}/.test(lastTg().text), 6000)));
  const snapBrain = tgSent.length;
  await upd(msgU(111, "What services do you offer?"));
  ok("TG free text → the same brain (KB answer)", !!(await tgWait(() => tgSent.length > snapBrain && lastTg().text.length > 40)));
  await upd(msgU(999, "/admin"));
  ok("TG /admin is team-only", !!(await tgWait(() => lastTg() && lastTg().chat_id === 999 && lastTg().text.includes("team only"))));
  await upd(msgU(111, "/stats"));
  ok("TG admin /stats works for the manager", !!(await tgWait(() => lastTg() && lastTg().chat_id === 111 && lastTg().text.includes("leads"))));
  const dataResp = await tgReq(BE, "GET", "/api/admin/data", null, { "X-Admin-Token": goodTok });
  try { ad = JSON.parse(dataResp.body); } catch (e) {}
  ok("TG leads visible in the admin panel (chat_id)", !!(ad && ad.ok && Array.isArray(ad.leads) && ad.leads.some(l => String(l.chat_id) === "111")));
  tgChild.kill("SIGKILL");
  mockTg.close();

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("CRASH:", e); process.exit(1); });
