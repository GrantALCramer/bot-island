/* Bot Island service worker — minimal, installable, network-first.
   Never serves stale /api or chat; app shell updates on next open. */
const CACHE = 'bot-island-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isApiOrLive(url) {
  const p = url.pathname;
  return p.startsWith('/api/') || p === '/ws' || p.startsWith('/ws');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // Never cache API / live endpoints — always network.
  if (isApiOrLive(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for navigations and static assets so updates arrive on next open.
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      // Cache successful same-origin GETs for offline shell fallback only.
      if (fresh && fresh.ok && (req.mode === 'navigate' || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/textures/') || url.pathname.endsWith('.webmanifest'))) {
        const copy = fresh.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = await caches.match('/');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
