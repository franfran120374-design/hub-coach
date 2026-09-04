import { useMemo } from 'react'
import { detecterSignaux } from '../core/signaux.js'

export default function Signaux({ routines, version, onAppliquer, onIgnorer }) {
  const signaux = useMemo(
    () => detecterSignaux(routines),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routines, version]
  )

  if (signaux.length === 0) return null

  return (
    <section className="signaux">
      <h2 className="titre-section">Ce que le coach a remarqué</h2>
      {signaux.map((signal) => (
        <article key={signal.cle} className={`signal signal-${signal.ton}`}>
          <h3 className="signal-titre">{signal.titre}</h3>
          <p className="signal-constat">{signal.constat}</p>
          <p className="signal-proposition">{signal.proposition}</p>
          <div className="signal-actions">
            <button type="button" className="bouton bouton-action" onClick={() => onAppliquer(signal)}>
              Appliquer
            </button>
            <button type="button" className="bouton bouton-discret" onClick={() => onIgnorer(signal)}>
              Laisser comme ça
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}
