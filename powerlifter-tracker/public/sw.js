// PowerTrack service worker — handles push notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { data = {} }

  const title   = data.title || 'PowerTrack'
  const options = {
    body:               data.body || '',
    icon:               '/icons/icon-192.png',
    badge:              '/icons/icon-192.png',
    tag:                data.tag || 'powertrack',
    data:               { url: data.url || '/' },
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) => w.url.startsWith(self.location.origin))
        if (existing) return existing.focus().then((w) => w.navigate(url))
        return clients.openWindow(url)
      })
  )
})
