import { useMemo } from 'react'
import { lireJournal } from '../core/storage.js'

const RESSENTI_LIBELLE = {
  facile: 'trop facile',
  juste: 'au bon rythme',
  dur: 'trop dur'
}

export default function Journal({ routines, version, limite = 8 }) {
  const entrees = useMemo(() => lireJournal(limite), [version, limite])

  const nomDe = (id) => {
    const routine = routines.find((r) => r.id === id)
    return routine ? routine.nom : id
  }

  return (
    <section className="journal">
      <h2 className="titre-section">Ce que le coach retient</h2>
      {entrees.length === 0 ? (
        <p className="vide">Rien encore. Le journal se remplit à la fin de chaque séance.</p>
      ) : (
        <ul className="journal-liste">
          {entrees.map((entree) => (
            <li key={entree.horodatage}>
              <div className="journal-entete">
                <span className="journal-routine">{nomDe(entree.routineId)}</span>
                <span className="journal-date">{formatDate(entree.jour)}</span>
              </div>
              <p className="journal-ressenti">
                {entree.ressenti ? RESSENTI_LIBELLE[entree.ressenti] : 'sans retour'}
                {entree.changement ? ` · ${entree.changement}` : ''}
              </p>
              {entree.note && <p className="journal-note">{entree.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatDate(jour) {
  const [annee, mois, date] = String(jour).split('-')
  if (!date) return jour
  return `${date}/${mois}/${String(annee).slice(2)}`
}
