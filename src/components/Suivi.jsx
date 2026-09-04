import { useMemo } from 'react'
import { serieEnCours, septDerniersJours } from '../core/storage.js'
import { nomJourCourt } from '../core/temps.js'

export default function Suivi({ routines, version }) {
  const lignes = useMemo(
    () =>
      routines.map((routine) => ({
        routine,
        serie: serieEnCours(routine.id, routine.jours),
        semaine: septDerniersJours(routine.id)
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routines, version]
  )

  return (
    <section className="suivi">
      <h2 className="titre-section">Ce que tu tiens</h2>
      {lignes.map(({ routine, serie, semaine }) => (
        <article key={routine.id} className="suivi-bloc">
          <div className="suivi-ligne">
            <h3>{routine.nom}</h3>
            <span className="suivi-serie">{serie}</span>
          </div>
          <p className="suivi-legende">
            {serie === 0 ? 'Aucune série en cours' : `${serie} fois d'affilée`}
          </p>
          <div className="semaine">
            {semaine.map(({ jour, date, fait }) => (
              <div key={jour} className={`semaine-case ${fait ? 'faite' : ''}`} title={jour}>
                <span>{nomJourCourt(date)}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}
