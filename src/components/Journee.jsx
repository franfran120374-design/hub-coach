import { dureeTotale } from '../core/temps.js'

const LIBELLES = {
  inactive: 'Pas au programme',
  faite: 'Fait',
  a_venir: 'À venir',
  attente: 'Fenêtre ouverte',
  reportee: 'Reporté',
  niveau1: 'En retard',
  niveau2: 'En retard',
  niveau3: 'En retard',
  ratee: 'Passé'
}

export default function Journee({ evaluations, onDemarrer, onReporter }) {
  const visibles = evaluations.filter((e) => e.etat !== 'inactive')

  return (
    <section className="journee">
      <h2 className="titre-section">Ta journée</h2>
      {visibles.length === 0 && (
        <p className="vide">Rien de programmé aujourd&apos;hui. Ajoute une routine dans routines.json.</p>
      )}
      <ol className="fil">
        {visibles.map((evaluation) => {
          const { routine, etat, niveau } = evaluation
          const duree = dureeTotale(routine)
          return (
            <li key={routine.id} className={`fil-etape etat-${etat} niveau-${niveau}`}>
              <div className="fil-heure">{evaluation.heure}</div>
              <div className="fil-corps">
                <div className="fil-ligne">
                  <h3>{routine.nom}</h3>
                  <span className="etiquette">{LIBELLES[etat]}</span>
                </div>
                <p className="fil-resume">{routine.resume}</p>
                <p className="fil-meta">
                  {routine.exercices.length} étapes
                  {duree ? ` · environ ${Math.round(duree / 60)} min` : ''}
                  {evaluation.reports ? ` · ${evaluation.reports} report${evaluation.reports > 1 ? 's' : ''}` : ''}
                </p>
                {etat !== 'faite' && etat !== 'ratee' && (
                  <div className="fil-actions">
                    <button type="button" className="bouton bouton-action" onClick={() => onDemarrer(routine.id)}>
                      {etat === 'a_venir' ? 'Commencer en avance' : 'Commencer'}
                    </button>
                    {niveau > 0 && (
                      <button
                        type="button"
                        className="bouton bouton-fin"
                        onClick={() => onReporter(routine.id, 10)}
                      >
                        Reporter 10 min
                      </button>
                    )}
                  </div>
                )}
                {etat === 'reportee' && (
                  <p className="fil-meta">Reprise dans {evaluation.repriseDans} min.</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
