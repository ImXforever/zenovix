/* Zenovix PWA service worker — offline shell + smart API pass-through
   - Page & icons: cache-first (instant reopen)
   - Chat/API calls: ALWAYS network (never serve stale answers), with a
     friendly offline JSON fallback so the UI can show a proper message.
*/
const CACHE = "zenovix-v1";
const SHELL = ["/", "/widget.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // let cross-origin (LLM etc.) pass straight through

  // API + chat: network-first, JSON offline notice, never cached
  if (url.pathname.startsWith("/api/") || url.pathname === "/health") {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ ok: false, detail: "You are offline — the Zenovix brain is unreachable right now. Reconnect and try again." }), {
          status: 503,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        })
      )
    );
    return;
  }

  // Shell: cache-first, refresh in the background
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok && e.request.method === "GET") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
    )
  );
});
