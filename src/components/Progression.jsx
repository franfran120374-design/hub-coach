import { useMemo } from 'react'
import { etatProgression, dose, prochainPalier, heureEffective, cibleAtteinte } from '../core/progression.js'

export default function Progression({ routines, version }) {
  const lignes = useMemo(
    () =>
      routines
        .filter((r) => r.progressionHeure || (r.exercices || []).some((e) => e.progression))
        .map((routine) => ({
          routine,
          etat: etatProgression(routine.id),
          palier: prochainPalier(routine)
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routines, version]
  )

  if (lignes.length === 0) return null

  return (
    <section className="progression">
      <h2 className="titre-section">Où tu en es</h2>
      {lignes.map(({ routine, etat, palier }) => (
        <article key={routine.id} className="progression-bloc">
          <div className="progression-ligne">
            <h3>{routine.nom}</h3>
            <span className="progression-niveau">Niveau {etat.niveau}</span>
          </div>

          {routine.progressionHeure ? (
            <>
              <p className="progression-valeur">
                {heureEffective(routine, etat.niveau)}
                <span className="progression-unite">
                  {cibleAtteinte(routine, etat.niveau)
                    ? ' · objectif atteint'
                    : ` · objectif ${routine.progressionHeure.cibleFinale}`}
                </span>
              </p>
              <p className="progression-legende">{palier && palier.texte}</p>
            </>
          ) : (
            <>
              <ul className="progression-doses">
                {routine.exercices
                  .filter((e) => e.progression)
                  .map((exercice) => {
                    const d = dose(exercice, etat.niveau)
                    return (
                      <li key={exercice.nom}>
                        <span>{exercice.nom}</span>
                        <strong>{d.texte}</strong>
                      </li>
                    )
                  })}
              </ul>
              <p className="progression-legende">{palier && palier.texte}</p>
            </>
          )}
        </article>
      ))}
    </section>
  )
}
