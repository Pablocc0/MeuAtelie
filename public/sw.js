const CACHE = 'meu-atelie-v2'
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    const page = await fetch('/')
    const html = await page.clone().text()
    const generatedAssets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
      .map((match) => match[1])
      .filter((url) => url.startsWith('/'))
    await cache.put('/', page)
    await cache.addAll([...new Set([...CORE.slice(1), ...generatedAssets])])
  }))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html'))),
  )
})
