/* FormSaathi Web Push service worker. Network-free: renders payloads sent by the backend. */
/* global self, clients */
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
      icon: '/favicon.svg',
      badge: '/favicon.svg',
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
