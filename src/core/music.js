// Couche musique volontairement abstraite : le reste de l'application demande
// "joue la playlist energie", elle ne sait pas d'ou viennent les pistes.
// Deux sources supportees aujourd'hui :
//   "locale"  -> fichiers poses dans public/musique/, listes dans playlists.json
//   "externe" -> une URL de playlist (Spotify, Deezer, YouTube...) ouverte au demarrage
// Pour brancher les playlists du Hub, il suffira d'ajouter une source ici.

import playlists from '../data/playlists.json'

let lecteur = null
let pisteCourante = 0
let listeCourante = []
let idCourant = null

function creerLecteur(volume) {
  if (!lecteur) {
    lecteur = new Audio()
    lecteur.addEventListener('ended', pisteSuivante)
    lecteur.addEventListener('error', pisteSuivante)
  }
  lecteur.volume = volume
  return lecteur
}

function pisteSuivante() {
  if (listeCourante.length === 0) return
  pisteCourante = (pisteCourante + 1) % listeCourante.length
  if (lecteur) {
    lecteur.src = listeCourante[pisteCourante]
    lecteur.play().catch(() => {})
  }
}

export function playlistDisponible(id) {
  const config = playlists[id]
  if (!config) return false
  if (config.source === 'locale') return Array.isArray(config.pistes) && config.pistes.length > 0
  if (config.source === 'externe') return Boolean(config.url)
  return false
}

export function nomPlaylist(id) {
  return playlists[id] ? playlists[id].nom : null
}

export function jouer(id, volume = 0.6) {
  const config = playlists[id]
  if (!config) return { lance: false, raison: 'playlist inconnue' }

  if (config.source === 'externe') {
    if (!config.url) return { lance: false, raison: 'aucune URL configuree' }
    if (idCourant === id) return { lance: true, mode: 'externe' }
    idCourant = id
    if (window.coach && window.coach.ouvrirLien) window.coach.ouvrirLien(config.url)
    else window.open(config.url, '_blank', 'noopener')
    return { lance: true, mode: 'externe' }
  }

  const pistes = (config.pistes || []).map((f) =>
    f.startsWith('http') || f.startsWith('/') ? f : `./musique/${f}`
  )
  if (pistes.length === 0) return { lance: false, raison: 'aucune piste configuree' }

  listeCourante = pistes
  pisteCourante = 0
  idCourant = id
  const audio = creerLecteur(volume)
  audio.src = listeCourante[0]
  audio.play().catch(() => {})
  return { lance: true, mode: 'locale' }
}

export function arreter() {
  idCourant = null
  listeCourante = []
  if (lecteur) {
    lecteur.pause()
    lecteur.currentTime = 0
  }
}

export function reglerVolume(volume) {
  if (lecteur) lecteur.volume = volume
}
