/* FormSaathi service worker: Web Push delivery + offline-first app shell.
 * Network-free push rendering; runtime caching never touches Supabase/API traffic. */
/* global self, caches, fetch, clients */
const VERSION = 'formsaathi-v2'
const CORE_ASSETS = ['/', '/index.html', '/offline.html', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      // Individual adds so one missing asset cannot block the whole install.
      await Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => undefined)))
    }).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || !req.url.startsWith('http')) return

  const url = new URL(req.url)
  // Never cache Supabase auth/REST, push endpoints or backend APIs — always go to network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Page navigations: network-first so updates ship immediately, offline page as fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy)).catch(() => undefined)
          return res
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match('/offline.html'))),
    )
    return
  }

  // Hashed build assets and images: stale-while-revalidate (instant load, background refresh).
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.svg')) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req)
        const network = fetch(req)
          .then((res) => { if (res.ok) cache.put(req, res.clone()); return res })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})

// ---------- Web Push (payloads rendered offline; no network needed) ----------
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'FormSaathi', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FormSaathi', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'formsaathi',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client && new URL(client.url).pathname !== target) {
            try { client.navigate(target) } catch { /* best effort */ }
          }
          return client.focus()
        }
      }
      return clients.openWindow(target)
    }),
  )
})
