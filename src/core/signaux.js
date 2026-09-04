// Detection de motifs. Le coach lit ton historique et ton journal, repere
// ce qui se repete, et propose une adaptation concrete que tu acceptes ou non.
//
// Regle de conduite : un signal ne se declenche jamais sur un echantillon trop
// mince, et il ne se declenche qu'avec une proposition applicable en un clic.
// Un constat sans action n'est pas un signal, c'est un reproche.

import { clefJourDecalee, heureEnMinutes, minutesEnHeure } from './temps.js'
import { lireHistorique, journalDeRoutine, signalIgnore } from './storage.js'
import { joursActifs, heureDuJour, allegementActif, NOM_JOUR } from './ajustements.js'

const FENETRE_JOURS = 42

function occurrences(routine, nbJours = FENETRE_JOURS) {
  const historique = lireHistorique()
  const actifs = joursActifs(routine)
  const liste = []
  for (let i = 1; i <= nbJours; i += 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    if (!actifs.includes(date.getDay())) continue
    const jour = clefJourDecalee(-i)
    const entree = historique[jour] ? historique[jour][routine.id] : null
    liste.push({
      date,
      jour,
      jourSemaine: date.getDay(),
      fait: Boolean(entree && entree.fait),
      reports: entree && entree.reports ? entree.reports : 0
    })
  }
  return liste
}

function troisDerniersRessentis(routineId) {
  return journalDeRoutine(routineId, 12)
    .filter((e) => e.ressenti)
    .slice(0, 3)
    .map((e) => e.ressenti)
}

// --- Les detecteurs

function signalTropDur(routine) {
  if (!routine.exercices.some((e) => e.progression)) return null
  if (allegementActif(routine.id)) return null
  const ressentis = troisDerniersRessentis(routine.id)
  if (ressentis.length < 3 || !ressentis.every((r) => r === 'dur')) return null

  return {
    cle: `${routine.id}:trop-dur`,
    routineId: routine.id,
    ton: 'attention',
    titre: 'Trois séances de suite trop dures',
    constat: `Tu as trouvé ${routine.nom.toLowerCase()} trop dur trois fois d'affilée. Redescendre d'un cran n'a pas suffi.`,
    proposition: 'Passer en semaine allégée : un cran de moins et les exercices secondaires mis de côté pendant sept jours.',
    action: { type: 'allegement', routineId: routine.id, jours: 7 }
  }
}

function signalTropFacile(routine) {
  if (!routine.exercices.some((e) => e.progression)) return null
  const ressentis = troisDerniersRessentis(routine.id)
  if (ressentis.length < 3 || !ressentis.every((r) => r === 'facile')) return null

  return {
    cle: `${routine.id}:trop-facile`,
    routineId: routine.id,
    ton: 'bon',
    titre: 'Tu montes plus vite que le programme',
    constat: 'Trois séances de suite trop faciles. Les paliers actuels sont trop petits pour toi.',
    proposition: 'Doubler le pas de progression : chaque montée de niveau ajoutera deux fois plus.',
    action: { type: 'pas_double', routineId: routine.id }
  }
}

function signalJourFaible(routine) {
  const liste = occurrences(routine)

  // Garde-fou : un "jour faible" n'a de sens que si le reste tient. Sur une
  // routine jamais lancee, tous les jours seraient signales comme faibles.
  const faites = liste.filter((o) => o.fait).length
  if (faites < 6) return null
  if (faites / liste.length < 0.4) return null

  const parJour = {}
  liste.forEach((o) => {
    if (!parJour[o.jourSemaine]) parJour[o.jourSemaine] = []
    parJour[o.jourSemaine].push(o)
  })

  for (const [jourSemaine, occs] of Object.entries(parJour)) {
    const quatreDernieres = occs.slice(0, 4)
    if (quatreDernieres.length < 4) continue
    const echecs = quatreDernieres.filter((o) => !o.fait).length
    if (echecs < 3) continue

    // Le jour doit vraiment sortir du lot : ailleurs, ca tient.
    const jour = Number(jourSemaine)
    const ailleurs = liste.filter((o) => o.jourSemaine !== jour)
    if (ailleurs.length < 6) continue
    if (ailleurs.filter((o) => o.fait).length / ailleurs.length < 0.6) continue
    const nom = NOM_JOUR[jour]

    if (routine.mode === 'checklist') {
      const plusTard = minutesEnHeure(heureEnMinutes(heureDuJour(routine)) + 45)
      return {
        cle: `${routine.id}:jour-faible:${jour}`,
        routineId: routine.id,
        ton: 'attention',
        titre: `Le ${nom} ne tient jamais`,
        constat: `${echecs} des 4 derniers ${nom}s, ${routine.nom.toLowerCase()} n'a pas été validé. Le reste de la semaine tient.`,
        proposition: `Donner au ${nom} son propre horaire : ${plusTard} au lieu de ${heureDuJour(routine)}. Mieux vaut une heure tenue qu'une heure ignorée.`,
        action: { type: 'exception_jour', routineId: routine.id, jour, heure: plusTard }
      }
    }

    return {
      cle: `${routine.id}:jour-faible:${jour}`,
      routineId: routine.id,
      ton: 'attention',
      titre: `Le ${nom} ne passe pas`,
      constat: `${echecs} des 4 derniers ${nom}s, ${routine.nom.toLowerCase()} a été sauté.`,
      proposition: `Retirer le ${nom} du programme. Deux séances tenues valent mieux que trois dont une ratée.`,
      action: { type: 'retirer_jour', routineId: routine.id, jour }
    }
  }
  return null
}

function signalReports(routine) {
  const faites = occurrences(routine).filter((o) => o.fait).slice(0, 5)
  if (faites.length < 5) return null
  const moyenne = faites.reduce((somme, o) => somme + o.reports, 0) / faites.length
  if (moyenne < 2) return null

  const minutes = 30
  const nouvelle = minutesEnHeure(heureEnMinutes(heureDuJour(routine)) + minutes)
  return {
    cle: `${routine.id}:reports`,
    routineId: routine.id,
    ton: 'neutre',
    titre: 'Tu repousses systématiquement',
    constat: `En moyenne ${moyenne.toFixed(1)} reports par séance sur les cinq dernières. Tu finis par la faire, mais jamais à l'heure prévue.`,
    proposition: `Décaler l'horaire de 30 minutes, à ${nouvelle}. L'heure actuelle ne correspond pas à ta journée réelle.`,
    action: { type: 'decalage', routineId: routine.id, minutes }
  }
}

// Ordre de priorite. Un signal plus haut masque les suivants pour la meme
// routine : deux propositions contradictoires le meme jour, c'est du bruit.
const DETECTEURS = [signalTropDur, signalJourFaible, signalReports, signalTropFacile]

const MAX_AFFICHES = 2

export function detecterSignaux(routines) {
  const trouves = []
  routines.forEach((routine) => {
    for (const detecteur of DETECTEURS) {
      const signal = detecteur(routine)
      if (signal && !signalIgnore(signal.cle)) {
        trouves.push(signal)
        break
      }
    }
  })
  return trouves.slice(0, MAX_AFFICHES)
}
