// Persistance locale. Une seule cle par domaine, pour rester portable
// vers un autre stockage (fichier, API du Hub) sans toucher au reste du code.

import { clefJour, clefJourDecalee } from './temps.js'

const CLE_HISTORIQUE = 'coach.historique'
const CLE_REPORTS = 'coach.reports'
const CLE_REGLAGES = 'coach.reglages'
const CLE_PROGRESSION = 'coach.progression'
const CLE_JOURNAL = 'coach.journal'
const TAILLE_JOURNAL = 400

const REGLAGES_DEFAUT = {
  sonActif: true,
  musiqueActive: true,
  volume: 0.6,
  demarrageAuto: false
}

function lire(cle, defaut) {
  try {
    const brut = localStorage.getItem(cle)
    if (!brut) return defaut
    const valeur = JSON.parse(brut)
    return valeur === null || valeur === undefined ? defaut : valeur
  } catch {
    return defaut
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
    return true
  } catch {
    return false
  }
}

// --- Historique : { "2026-09-04": { "muscu": { fait: true, heure: "18:41", reports: 1 } } }

export function lireHistorique() {
  return lire(CLE_HISTORIQUE, {})
}

export function enregistrerSeance(routineId, { jour = clefJour(), reports = 0 } = {}) {
  const historique = lireHistorique()
  const duJour = historique[jour] || {}
  const maintenant = new Date()
  duJour[routineId] = {
    fait: true,
    heure: `${String(maintenant.getHours()).padStart(2, '0')}:${String(maintenant.getMinutes()).padStart(2, '0')}`,
    reports
  }
  historique[jour] = duJour
  ecrire(CLE_HISTORIQUE, historique)
  return historique
}

export function estFaite(routineId, jour = clefJour()) {
  const historique = lireHistorique()
  return Boolean(historique[jour] && historique[jour][routineId] && historique[jour][routineId].fait)
}

export function serieEnCours(routineId, joursActifs = [0, 1, 2, 3, 4, 5, 6]) {
  const historique = lireHistorique()
  let serie = 0
  for (let i = 0; i < 120; i += 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    if (!joursActifs.includes(date.getDay())) continue
    const jour = clefJourDecalee(-i)
    const fait = historique[jour] && historique[jour][routineId] && historique[jour][routineId].fait
    if (fait) {
      serie += 1
    } else if (i === 0) {
      // La journee en cours n'est pas encore jouee : elle ne casse pas la serie.
      continue
    } else {
      break
    }
  }
  return serie
}

export function septDerniersJours(routineId) {
  const historique = lireHistorique()
  const resultat = []
  for (let i = 6; i >= 0; i -= 1) {
    const jour = clefJourDecalee(-i)
    const date = new Date()
    date.setDate(date.getDate() - i)
    resultat.push({
      jour,
      date,
      fait: Boolean(historique[jour] && historique[jour][routineId] && historique[jour][routineId].fait)
    })
  }
  return resultat
}

// --- Reports : { "muscu": { jour: "2026-09-04", nombre: 2, jusqua: 1757000000000 } }

export function lireReports() {
  return lire(CLE_REPORTS, {})
}

export function reportRoutine(routineId, minutes) {
  const reports = lireReports()
  const courant = reports[routineId]
  const memeJour = courant && courant.jour === clefJour()
  reports[routineId] = {
    jour: clefJour(),
    nombre: memeJour ? courant.nombre + 1 : 1,
    jusqua: Date.now() + minutes * 60 * 1000
  }
  ecrire(CLE_REPORTS, reports)
  return reports[routineId]
}

export function reportActif(routineId) {
  const reports = lireReports()
  const courant = reports[routineId]
  if (!courant || courant.jour !== clefJour()) return null
  if (courant.jusqua < Date.now()) return { ...courant, expire: true }
  return { ...courant, expire: false }
}

export function nombreReports(routineId) {
  const courant = reportActif(routineId)
  return courant ? courant.nombre : 0
}

// --- Reglages

export function lireReglages() {
  return { ...REGLAGES_DEFAUT, ...lire(CLE_REGLAGES, {}) }
}

export function ecrireReglages(partiel) {
  const fusion = { ...lireReglages(), ...partiel }
  ecrire(CLE_REGLAGES, fusion)
  return fusion
}

// --- Progression : { "muscu": { niveau: 3, compteurJuste: 1, seancesDepuisPas: 2 } }

export function lireProgression() {
  return lire(CLE_PROGRESSION, {})
}

export function ecrireProgression(routineId, etat) {
  const tout = lireProgression()
  tout[routineId] = etat
  ecrire(CLE_PROGRESSION, tout)
  return etat
}

// --- Journal : la memoire du coach, du plus recent au plus ancien

export function lireJournal(limite = 0) {
  const journal = lire(CLE_JOURNAL, [])
  return limite > 0 ? journal.slice(0, limite) : journal
}

export function ajouterAuJournal(entree) {
  const journal = lireJournal()
  journal.unshift({ horodatage: Date.now(), jour: clefJour(), ...entree })
  ecrire(CLE_JOURNAL, journal.slice(0, TAILLE_JOURNAL))
  return journal
}

export function journalDeRoutine(routineId, limite = 10) {
  return lireJournal().filter((e) => e.routineId === routineId).slice(0, limite)
}

export function toutEffacer() {
  ;[CLE_HISTORIQUE, CLE_REPORTS, CLE_REGLAGES, CLE_PROGRESSION, CLE_JOURNAL].forEach((cle) => {
    try {
      localStorage.removeItem(cle)
    } catch {
      /* rien a faire */
    }
  })
}
