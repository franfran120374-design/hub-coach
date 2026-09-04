import { useEffect, useState } from 'react'

// Ecran de niveau 3. Il recouvre tout et ne propose que deux issues.
// Le report reste possible, mais il est compte et affiche : c'est ce qui marche
// mieux qu'un blocage total, qu'on finit toujours par contourner.

export default function Blocage({ evaluation, onDemarrer, onReporter }) {
  const [delaiActif, setDelaiActif] = useState(false)
  const { routine, retard, reports } = evaluation

  useEffect(() => {
    const t = setTimeout(() => setDelaiActif(true), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="blocage" role="dialog" aria-modal="true" aria-label={`Rappel : ${routine.nom}`}>
      <div className="blocage-contenu">
        <p className="blocage-retard">{retard} minutes de retard</p>
        <h1 className="blocage-titre">{routine.nom}</h1>
        <p className="blocage-texte">{routine.resume}</p>

        <button type="button" className="bouton bouton-action bouton-large" onClick={onDemarrer} autoFocus>
          Commencer maintenant
        </button>

        <button
          type="button"
          className="bouton bouton-discret"
          disabled={!delaiActif}
          onClick={() => onReporter(10)}
        >
          {delaiActif ? 'Encore 10 minutes' : 'Encore 10 minutes (patiente 4 s)'}
        </button>

        {reports > 0 && (
          <p className="blocage-compteur">
            {reports} report{reports > 1 ? 's' : ''} aujourd&apos;hui.
          </p>
        )}
      </div>
    </div>
  )
}
