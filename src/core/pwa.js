// Installation sur l'ecran d'accueil et fonctionnement hors connexion.

let inviteInstallation = null
const abonnes = new Set()

export function initPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    })
  }

  window.addEventListener('beforeinstallprompt', (evenement) => {
    evenement.preventDefault()
    inviteInstallation = evenement
    abonnes.forEach((f) => f(true))
  })

  window.addEventListener('appinstalled', () => {
    inviteInstallation = null
    abonnes.forEach((f) => f(false))
  })
}

export function installationDisponible() {
  return Boolean(inviteInstallation)
}

export function surChangementInstallation(fonction) {
  abonnes.add(fonction)
  return () => abonnes.delete(fonction)
}

export async function lancerInstallation() {
  if (!inviteInstallation) return false
  inviteInstallation.prompt()
  const choix = await inviteInstallation.userChoice
  inviteInstallation = null
  abonnes.forEach((f) => f(false))
  return choix.outcome === 'accepted'
}

export function dejaInstallee() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function surIphone() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}
