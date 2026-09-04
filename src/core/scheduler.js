// Moteur du coach : a partir des routines et de l'heure courante, il decide
// de l'etat de chacune. C'est le seul endroit ou vit la logique d'insistance.
//
// Etats possibles :
//   inactive  : pas programmee aujourd'hui
//   faite     : validee pour aujourd'hui
//   a_venir   : l'heure n'est pas encore passee
//   attente   : l'heure est passee, on est dans la fenetre de tolerance
//   reportee  : tu as demande un delai, il court encore
//   niveau1   : rappel discret
//   niveau2   : rappel sonore repete
//   niveau3   : ecran bloquant
//   ratee     : trop tard, on classe et on passe a demain

import { minutesDepuisMinuit, heureEnMinutes } from './temps.js'
import { estFaite, reportActif } from './storage.js'

const LIMITE_ABANDON_MIN = 240 // au-dela de 4 h de retard, on arrete d'insister

export function retardEnMinutes(routine, maintenant = new Date()) {
  const cible = heureEnMinutes(routine.heure)
  let retard = minutesDepuisMinuit(maintenant) - cible
  // Routine du soir consultee apres minuit : on rattache au jour precedent.
  if (retard < -720) retard += 1440
  return retard
}

function programmeeAujourdhui(routine, maintenant, retard) {
  const jours = routine.jours || [0, 1, 2, 3, 4, 5, 6]
  const jourCourant = maintenant.getDay()
  const debordeMinuit = minutesDepuisMinuit(maintenant) < heureEnMinutes(routine.heure) && retard >= 0
  const jourDeReference = debordeMinuit ? (jourCourant + 6) % 7 : jourCourant
  return jours.includes(jourDeReference)
}

export function evaluerRoutine(routine, maintenant = new Date()) {
  const retard = retardEnMinutes(routine, maintenant)

  if (!programmeeAujourdhui(routine, maintenant, retard)) {
    return { routine, etat: 'inactive', retard, niveau: 0 }
  }

  if (estFaite(routine.id)) {
    return { routine, etat: 'faite', retard, niveau: 0 }
  }

  if (retard < 0) {
    return { routine, etat: 'a_venir', retard, niveau: 0, dansMinutes: -retard }
  }

  const report = reportActif(routine.id)
  if (report && !report.expire) {
    return {
      routine,
      etat: 'reportee',
      retard,
      niveau: 0,
      reports: report.nombre,
      repriseDans: Math.ceil((report.jusqua - Date.now()) / 60000)
    }
  }

  const tolerance = routine.toleranceMin ?? 15
  if (retard < tolerance) {
    return { routine, etat: 'attente', retard, niveau: 0, reports: report ? report.nombre : 0 }
  }

  if (retard > LIMITE_ABANDON_MIN) {
    return { routine, etat: 'ratee', retard, niveau: 0 }
  }

  const depuisTolerance = retard - tolerance
  const paliers = routine.escaladeMin || [0, 5, 10]
  let niveau = 0
  if (depuisTolerance >= paliers[0]) niveau = 1
  if (depuisTolerance >= paliers[1]) niveau = 2
  if (depuisTolerance >= paliers[2]) niveau = 3

  return {
    routine,
    etat: `niveau${niveau}`,
    niveau,
    retard,
    reports: report ? report.nombre : 0
  }
}

export function evaluerToutes(routines, maintenant = new Date()) {
  return routines.map((routine) => evaluerRoutine(routine, maintenant))
}

export function routineLaPlusUrgente(evaluations) {
  const candidates = evaluations.filter((e) => e.niveau > 0)
  if (candidates.length === 0) return null
  return candidates.sort((a, b) => b.niveau - a.niveau || b.retard - a.retard)[0]
}

export function prochaineRoutine(evaluations) {
  const aVenir = evaluations
    .filter((e) => e.etat === 'a_venir' || e.etat === 'attente' || e.etat === 'reportee')
    .sort((a, b) => (a.dansMinutes ?? 0) - (b.dansMinutes ?? 0))
  return aVenir[0] || null
}
