// Moteur de progression. Il repond a deux questions :
//   - combien tu fais aujourd'hui (repetitions, secondes de gainage)
//   - a quelle heure le coucher est reellement exige aujourd'hui
//
// Deux mecaniques distinctes selon la routine :
//   1. progression par ressenti (renforcement) : tu dis si c'etait facile,
//      juste ou dur en fin de seance, le niveau bouge en consequence.
//   2. progression par regularite (coucher) : chaque nuit tenue rapproche
//      l'heure de coucher de la cible, par paliers de quelques minutes.

import { heureEnMinutes, minutesEnHeure } from './temps.js'
import { lireProgression, ecrireProgression } from './storage.js'

export const SEUIL_JUSTE = 3 // nombre de seances "juste" avant de monter d'un cran

const ETAT_VIDE = { niveau: 0, compteurJuste: 0, seancesDepuisPas: 0 }

export function etatProgression(routineId) {
  const stocke = lireProgression()[routineId]
  return { ...ETAT_VIDE, ...(stocke || {}) }
}

// --- Doses

export function dose(exercice, niveau) {
  if (!exercice.progression) return null
  const { depart, pas, max, unite } = exercice.progression
  const valeur = Math.min(max ?? Infinity, depart + pas * niveau)
  return { valeur, unite, texte: `${valeur} ${unite}` }
}

export function dureeExercice(exercice, niveau) {
  if (exercice.progression && exercice.progression.cible === 'duree') {
    return dose(exercice, niveau).valeur
  }
  return exercice.duree || 30
}

export function auMaximum(exercice, niveau) {
  if (!exercice.progression || exercice.progression.max === undefined) return false
  return dose(exercice, niveau).valeur >= exercice.progression.max
}

// --- Heure de coucher effective

export function heureEffective(routine, niveau = null) {
  if (!routine.progressionHeure) return routine.heure
  const n = niveau === null ? etatProgression(routine.id).niveau : niveau
  const depart = heureEnMinutes(routine.heure)
  const cible = heureEnMinutes(routine.progressionHeure.cibleFinale)
  const decalee = Math.max(cible, depart - routine.progressionHeure.pasMin * n)
  return minutesEnHeure(decalee)
}

export function cibleAtteinte(routine, niveau = null) {
  if (!routine.progressionHeure) return false
  return heureEffective(routine, niveau) === routine.progressionHeure.cibleFinale
}

// --- Mise a jour apres une seance

export function appliquerBilan(routine, ressenti) {
  const etat = etatProgression(routine.id)
  let changement = null

  if (routine.progressionHeure) {
    if (ressenti === 'dur' && etat.niveau > 0) {
      etat.niveau -= 1
      etat.seancesDepuisPas = 0
      changement = { sens: 'recul', texte: `Coucher repoussé à ${heureEffective(routine, etat.niveau)}` }
    } else if (!cibleAtteinte(routine, etat.niveau)) {
      etat.seancesDepuisPas += 1
      if (etat.seancesDepuisPas >= (routine.progressionHeure.seancesParPas || 4)) {
        etat.niveau += 1
        etat.seancesDepuisPas = 0
        changement = {
          sens: 'avance',
          texte: `Nouvelle heure de coucher : ${heureEffective(routine, etat.niveau)}`
        }
      }
    }
  } else if (routine.exercices.some((e) => e.progression)) {
    if (ressenti === 'facile') {
      etat.niveau += 1
      etat.compteurJuste = 0
      changement = { sens: 'avance', texte: 'Charge augmentée d\u2019un cran' }
    } else if (ressenti === 'juste') {
      etat.compteurJuste += 1
      if (etat.compteurJuste >= SEUIL_JUSTE) {
        etat.niveau += 1
        etat.compteurJuste = 0
        changement = { sens: 'avance', texte: 'Trois séances au bon rythme : charge augmentée' }
      }
    } else if (ressenti === 'dur') {
      etat.compteurJuste = 0
      if (etat.niveau > 0) {
        etat.niveau -= 1
        changement = { sens: 'recul', texte: 'Charge redescendue d\u2019un cran' }
      } else {
        changement = { sens: 'stable', texte: 'On reste au niveau de départ' }
      }
    }
  }

  ecrireProgression(routine.id, etat)
  return { etat, changement }
}

// --- Ce qu'il reste avant le prochain palier

export function prochainPalier(routine) {
  const etat = etatProgression(routine.id)

  if (routine.progressionHeure) {
    if (cibleAtteinte(routine, etat.niveau)) {
      return { atteint: true, texte: `Objectif tenu : ${routine.progressionHeure.cibleFinale}` }
    }
    const restant = (routine.progressionHeure.seancesParPas || 4) - etat.seancesDepuisPas
    return {
      atteint: false,
      texte: `Encore ${restant} nuit${restant > 1 ? 's' : ''} pour gagner ${routine.progressionHeure.pasMin} minutes`
    }
  }

  if (routine.exercices.some((e) => e.progression)) {
    const restant = SEUIL_JUSTE - etat.compteurJuste
    return {
      atteint: false,
      texte: `Encore ${restant} séance${restant > 1 ? 's' : ''} au bon rythme pour monter d\u2019un cran`
    }
  }

  return null
}
