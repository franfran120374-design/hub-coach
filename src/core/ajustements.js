// Ajustements : tout ce que le coach a modifie apres que tu as accepte une
// proposition. Le fichier routines.json reste ta reference, les ajustements
// viennent par-dessus. Les retirer remet le programme d'origine.

import { heureEnMinutes, minutesEnHeure, minutesDepuisMinuit } from './temps.js'
import { lireAjustements, ecrireAjustement, lireProgression, ecrireProgression } from './storage.js'
import { heureEffective, etatProgression } from './progression.js'

const VIDE = {
  decalageMin: 0,
  exceptionsJour: {},
  joursExclus: [],
  allegementJusqua: 0
}

export function ajustement(routineId) {
  const stocke = lireAjustements()[routineId]
  return { ...VIDE, ...(stocke || {}) }
}

// --- Horaire reellement exige aujourd'hui

export function heureDuJour(routine, date = new Date()) {
  const regle = ajustement(routine.id)
  const base = heureEffective(routine)

  // Routine du soir consultee apres minuit : elle appartient a la veille.
  let jourRef = date.getDay()
  if (minutesDepuisMinuit(date) < 360 && heureEnMinutes(base) >= 1200) {
    jourRef = (jourRef + 6) % 7
  }

  const exception = regle.exceptionsJour[String(jourRef)]
  if (exception && exception.heure) return exception.heure

  if (regle.decalageMin) return minutesEnHeure(heureEnMinutes(base) + regle.decalageMin)
  return base
}

export function joursActifs(routine) {
  const regle = ajustement(routine.id)
  return (routine.jours || [0, 1, 2, 3, 4, 5, 6]).filter((j) => !regle.joursExclus.includes(j))
}

// --- Semaine allegee

export function allegementActif(routineId) {
  return ajustement(routineId).allegementJusqua > Date.now()
}

export function joursRestantsAllegement(routineId) {
  const fin = ajustement(routineId).allegementJusqua
  if (fin <= Date.now()) return 0
  return Math.ceil((fin - Date.now()) / (24 * 60 * 60 * 1000))
}

export function exercicesDuJour(routine) {
  if (!allegementActif(routine.id)) return routine.exercices
  return routine.exercices.filter((e) => !e.allegeable)
}

// --- Application d'une proposition

export function appliquerAjustement(action) {
  const regle = ajustement(action.routineId)

  if (action.type === 'allegement') {
    regle.allegementJusqua = Date.now() + (action.jours || 7) * 24 * 60 * 60 * 1000
    const etat = etatProgression(action.routineId)
    if (etat.niveau > 0) etat.niveau -= 1
    etat.compteurJuste = 0
    ecrireProgression(action.routineId, etat)
  }

  if (action.type === 'exception_jour') {
    regle.exceptionsJour = { ...regle.exceptionsJour, [String(action.jour)]: { heure: action.heure } }
  }

  if (action.type === 'retirer_jour') {
    if (!regle.joursExclus.includes(action.jour)) regle.joursExclus = [...regle.joursExclus, action.jour]
  }

  if (action.type === 'decalage') {
    regle.decalageMin = (regle.decalageMin || 0) + action.minutes
  }

  if (action.type === 'pas_double') {
    const etat = etatProgression(action.routineId)
    etat.multiplicateurPas = (etat.multiplicateurPas || 1) * 2
    ecrireProgression(action.routineId, etat)
  }

  ecrireAjustement(action.routineId, regle)
  return regle
}

export function reinitialiserAjustements(routineId) {
  ecrireAjustement(routineId, { ...VIDE })
  const progression = lireProgression()[routineId]
  if (progression) {
    ecrireProgression(routineId, { ...progression, multiplicateurPas: 1 })
  }
  return { ...VIDE }
}

export function ajustementsActifs(routine) {
  const regle = ajustement(routine.id)
  const liste = []
  if (regle.decalageMin) {
    liste.push(`horaire décalé de ${regle.decalageMin > 0 ? '+' : ''}${regle.decalageMin} min`)
  }
  Object.entries(regle.exceptionsJour).forEach(([jour, valeur]) => {
    liste.push(`${NOM_JOUR[jour]} à ${valeur.heure}`)
  })
  regle.joursExclus.forEach((jour) => liste.push(`${NOM_JOUR[jour]} retiré`))
  if (allegementActif(routine.id)) {
    liste.push(`allégée encore ${joursRestantsAllegement(routine.id)} j`)
  }
  const etat = etatProgression(routine.id)
  if ((etat.multiplicateurPas || 1) > 1) liste.push(`progression ×${etat.multiplicateurPas}`)
  return liste
}

export const NOM_JOUR = {
  0: 'dimanche',
  1: 'lundi',
  2: 'mardi',
  3: 'mercredi',
  4: 'jeudi',
  5: 'vendredi',
  6: 'samedi'
}
