// Synchronisation entre l'ordinateur et le telephone.
//
// Le serveur est un Supabase gratuit, appele en REST : pas de bibliotheque
// supplementaire, juste fetch. Deux fonctions cote base, coach_lire et
// coach_ecrire, protegees par un code de 32 caracteres genere sur ton
// premier appareil. La table elle-meme n'est pas accessible : sans le code,
// il n'y a rien a lire.
//
// La fusion ne perd jamais une seance : historique et journal sont unis,
// et seuls les reglages tranchent au plus recent.

import { exporterTout, importerTout } from './storage.js'

const CLE_CONFIG = 'coach.sync'
const CLE_DERNIERE = 'coach.syncDerniere'
const TAILLE_JOURNAL = 400

function lireBrut(cle, defaut) {
  try {
    const valeur = localStorage.getItem(cle)
    return valeur ? JSON.parse(valeur) : defaut
  } catch {
    return defaut
  }
}

export function configSync() {
  return lireBrut(CLE_CONFIG, null)
}

export function syncConfiguree() {
  const config = configSync()
  return Boolean(config && config.url && config.cle && config.code)
}

export function definirConfig({ url, cle, code }) {
  const propre = {
    url: String(url || '').replace(/\/+$/, ''),
    cle: String(cle || '').trim(),
    code: String(code || '').trim()
  }
  localStorage.setItem(CLE_CONFIG, JSON.stringify(propre))
  return propre
}

export function delierAppareil() {
  localStorage.removeItem(CLE_CONFIG)
  localStorage.removeItem(CLE_DERNIERE)
}

export function derniereSync() {
  return lireBrut(CLE_DERNIERE, null)
}

// --- Code de liaison : un seul copier-coller pour brancher un deuxieme appareil

export function genererCode() {
  const octets = new Uint8Array(16)
  crypto.getRandomValues(octets)
  return Array.from(octets)
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')
}

export function cleDeLiaison() {
  const config = configSync()
  if (!config) return ''
  return btoa(unescape(encodeURIComponent(JSON.stringify(config))))
}

export function importerCleDeLiaison(texte) {
  try {
    const config = JSON.parse(decodeURIComponent(escape(atob(String(texte).trim()))))
    if (!config.url || !config.cle || !config.code) return null
    return definirConfig(config)
  } catch {
    return null
  }
}

// --- Appels au serveur

async function appeler(fonction, corps) {
  const config = configSync()
  if (!config) throw new Error('synchronisation non configurée')

  const reponse = await fetch(`${config.url}/rest/v1/rpc/${fonction}`, {
    method: 'POST',
    headers: {
      apikey: config.cle,
      Authorization: `Bearer ${config.cle}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(corps)
  })

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => '')
    throw new Error(`serveur ${reponse.status}${detail ? ' : ' + detail.slice(0, 120) : ''}`)
  }

  const texte = await reponse.text()
  return texte ? JSON.parse(texte) : null
}

// --- Fusion

export function fusionner(local, distant) {
  if (!distant || typeof distant !== 'object') return local

  const historique = {}
  ;[distant.historique, local.historique].forEach((source) => {
    Object.entries(source || {}).forEach(([jour, routines]) => {
      historique[jour] = { ...(historique[jour] || {}), ...routines }
    })
  })

  const parHorodatage = new Map()
  ;[...(distant.journal || []), ...(local.journal || [])].forEach((entree) => {
    if (entree && entree.horodatage) parHorodatage.set(entree.horodatage, entree)
  })
  const journal = Array.from(parHorodatage.values())
    .sort((a, b) => b.horodatage - a.horodatage)
    .slice(0, TAILLE_JOURNAL)

  // Progression, ajustements et reglages ne se fusionnent pas ligne a ligne :
  // c'est la derniere version enregistree qui fait foi.
  const recent = (local.maj || 0) >= (distant.maj || 0) ? local : distant

  return {
    version: 1,
    maj: Date.now(),
    historique,
    journal,
    progression: recent.progression || {},
    ajustements: recent.ajustements || {},
    reglages: recent.reglages || {},
    signauxIgnores: recent.signauxIgnores || {}
  }
}

// --- Operation complete

export async function synchroniser() {
  if (!syncConfiguree()) return { ok: false, raison: 'non configurée' }
  const config = configSync()

  try {
    const distant = await appeler('coach_lire', { p_code: config.code })
    const local = exporterTout()
    const fusion = fusionner(local, distant)
    importerTout(fusion)
    await appeler('coach_ecrire', { p_code: config.code, p_donnees: fusion })

    const etat = { horodatage: Date.now(), ok: true }
    localStorage.setItem(CLE_DERNIERE, JSON.stringify(etat))
    return { ok: true, seances: Object.keys(fusion.historique).length, entrees: fusion.journal.length }
  } catch (erreur) {
    const etat = { horodatage: Date.now(), ok: false, message: erreur.message }
    localStorage.setItem(CLE_DERNIERE, JSON.stringify(etat))
    return { ok: false, raison: erreur.message }
  }
}

export async function testerConnexion() {
  try {
    await appeler('coach_lire', { p_code: configSync().code })
    return { ok: true }
  } catch (erreur) {
    return { ok: false, raison: erreur.message }
  }
}
