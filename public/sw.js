// Service worker minimal : reseau d'abord, cache en secours.
// Objectif : l'application reste utilisable hors connexion sans jamais
// servir une version perimee quand le reseau repond.

const CACHE = 'coach-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request
  if (requete.method !== 'GET') return
  if (new URL(requete.url).origin !== self.location.origin) return

  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        const copie = reponse.clone()
        caches.open(CACHE).then((cache) => cache.put(requete, copie)).catch(() => {})
        return reponse
      })
      .catch(() =>
        caches.match(requete).then((cache) => cache || caches.match('./index.html'))
      )
  )
})

self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close()
  evenement.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => 'focus' in f)
      if (ouverte) return ouverte.focus()
      return self.clients.openWindow('./')
    })
  )
})
