import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatChrono } from '../core/temps.js'
import { bipDecompte, bipTransition, bipFin } from '../core/sound.js'
import { jouer, arreter as arreterMusique, playlistDisponible, nomPlaylist } from '../core/music.js'

export default function Seance({ routine, reglages, onTerminer, onAbandonner }) {
  const checklist = routine.mode === 'checklist'
  const exercices = routine.exercices || []

  const [index, setIndex] = useState(0)
  const [restant, setRestant] = useState(() => (checklist ? 0 : exercices[0]?.duree || 30))
  const [enPause, setEnPause] = useState(false)
  const [coches, setCoches] = useState(() => exercices.map(() => false))

  const musique = useMemo(
    () => (reglages.musiqueActive && playlistDisponible(routine.playlist) ? routine.playlist : null),
    [reglages.musiqueActive, routine.playlist]
  )

  useEffect(() => {
    if (musique) jouer(musique, reglages.volume)
    return () => arreterMusique()
  }, [musique, reglages.volume])

  const allerA = useCallback(
    (nouvelIndex) => {
      const borne = Math.max(0, Math.min(exercices.length - 1, nouvelIndex))
      setIndex(borne)
      setRestant(exercices[borne]?.duree || 30)
    },
    [exercices]
  )

  const suivant = useCallback(() => {
    if (index >= exercices.length - 1) {
      if (reglages.sonActif) bipFin()
      onTerminer()
      return
    }
    if (reglages.sonActif) bipTransition()
    allerA(index + 1)
  }, [index, exercices.length, allerA, onTerminer, reglages.sonActif])

  useEffect(() => {
    if (checklist || enPause) return undefined
    const battement = setInterval(() => setRestant((r) => r - 1), 1000)
    return () => clearInterval(battement)
  }, [checklist, enPause, index])

  useEffect(() => {
    if (checklist) return
    if (restant > 0 && restant <= 3 && reglages.sonActif) bipDecompte()
    if (restant <= 0) suivant()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restant])

  const exercice = exercices[index]
  const progression = checklist
    ? coches.filter(Boolean).length / Math.max(1, exercices.length)
    : (index + (exercice?.duree ? 1 - restant / exercice.duree : 0)) / Math.max(1, exercices.length)

  const toutCoche = coches.every(Boolean)

  if (checklist) {
    return (
      <div className="seance seance-checklist">
        <header className="seance-entete">
          <h1>{routine.nom}</h1>
          <button type="button" className="bouton bouton-fin" onClick={onAbandonner}>
            Sortir
          </button>
        </header>

        <div className="barre"><span style={{ width: `${progression * 100}%` }} /></div>

        <ul className="checklist">
          {exercices.map((etape, i) => (
            <li key={etape.nom} className={coches[i] ? 'coche' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={coches[i]}
                  onChange={(e) => {
                    const copie = [...coches]
                    copie[i] = e.target.checked
                    setCoches(copie)
                    if (e.target.checked && reglages.sonActif) bipTransition()
                  }}
                />
                <span className="checklist-nom">{etape.nom}</span>
              </label>
              <p className="checklist-consigne">{etape.consigne}</p>
            </li>
          ))}
        </ul>

        <div className="seance-pied">
          <button
            type="button"
            className="bouton bouton-action bouton-large"
            disabled={!toutCoche}
            onClick={() => {
              if (reglages.sonActif) bipFin()
              onTerminer()
            }}
          >
            {toutCoche ? 'Bonne nuit' : `Encore ${coches.filter((c) => !c).length} à faire`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="seance">
      <header className="seance-entete">
        <h1>{routine.nom}</h1>
        <div className="seance-entete-droite">
          {musique && <span className="etiquette">Musique : {nomPlaylist(musique)}</span>}
          <button type="button" className="bouton bouton-fin" onClick={onAbandonner}>
            Sortir
          </button>
        </div>
      </header>

      <div className="barre"><span style={{ width: `${Math.min(100, progression * 100)}%` }} /></div>

      <div className="minuteur">
        <p className="minuteur-position">
          Étape {index + 1} sur {exercices.length}
        </p>
        <h2 className="minuteur-nom">{exercice?.nom}</h2>
        <div className={`minuteur-chiffres ${restant <= 3 ? 'fin-proche' : ''}`}>
          {formatChrono(restant)}
        </div>
        <p className="minuteur-consigne">{exercice?.consigne}</p>
        {exercices[index + 1] && (
          <p className="minuteur-apres">Ensuite : {exercices[index + 1].nom}</p>
        )}
      </div>

      <div className="seance-pied">
        <button type="button" className="bouton bouton-fin" onClick={() => allerA(index - 1)} disabled={index === 0}>
          Précédent
        </button>
        <button type="button" className="bouton bouton-action bouton-large" onClick={() => setEnPause((p) => !p)}>
          {enPause ? 'Reprendre' : 'Pause'}
        </button>
        <button type="button" className="bouton bouton-fin" onClick={suivant}>
          Suivant
        </button>
      </div>
    </div>
  )
}
