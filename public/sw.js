const STATIC_CACHE = 'techstore-static-v1'
const DATA_CACHE = 'techstore-public-data-v1'
const APP_SHELL = [
 '/',
 '/manifest.webmanifest',
 '/icons/icon-192.png',
 '/icons/icon-512.png',
 '/icons/icon-maskable-512.png'
]

self.addEventListener('install', event => {
 event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)))
 self.skipWaiting()
})

self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys
   .filter(key => key.startsWith('techstore-') && ![STATIC_CACHE,DATA_CACHE].includes(key))
   .map(key => caches.delete(key)))
  await self.clients.claim()
 })())
})

self.addEventListener('fetch', event => {
 const request = event.request
 if (request.method !== 'GET') return

 const url = new URL(request.url)
 if (url.origin !== self.location.origin) return

 if (/^\/api\/(productos|categorias|promociones)$/.test(url.pathname)) {
  event.respondWith((async () => {
   const cache = await caches.open(DATA_CACHE)
   try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request,response.clone())
    return response
   } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
   }
  })())
  return
 }

 if (request.mode === 'navigate') {
  event.respondWith(fetch(request).catch(async () => (await caches.match('/'))))
  return
 }

 event.respondWith((async () => {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
   const cache = await caches.open(STATIC_CACHE)
   await cache.put(request,response.clone())
  }
  return response
 })())
})
