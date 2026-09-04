import { useState } from 'react'
import { journalDeRoutine } from '../core/storage.js'

const RESSENTIS = [
  { cle: 'facile', libelle: 'Trop facile', detail: 'On monte d\u2019un cran dès la prochaine' },
  { cle: 'juste', libelle: 'Juste ce qu\u2019il faut', detail: 'Trois fois de suite et ça monte' },
  { cle: 'dur', libelle: 'Trop dur', detail: 'On redescend d\u2019un cran' }
]

export default function Bilan({ routine, onValider, onPasser }) {
  const [ressenti, setRessenti] = useState(null)
  const [note, setNote] = useState('')
  const derniere = journalDeRoutine(routine.id, 1)[0]

  const coucher = Boolean(routine.progressionHeure)
  const libelles = coucher
    ? [
        { cle: 'facile', libelle: 'Sans effort', detail: 'Tu tiens l\u2019horaire facilement' },
        { cle: 'juste', libelle: 'Ça allait', detail: 'Le rythme est bon' },
        { cle: 'dur', libelle: 'Trop tôt pour moi', detail: 'On repousse l\u2019heure de cinq minutes' }
      ]
    : RESSENTIS

  return (
    <div className="bilan">
      <div className="bilan-contenu">
        <p className="bilan-surtitre">{routine.nom} — terminé</p>
        <h1 className="bilan-titre">C&apos;était comment ?</h1>

        <div className="bilan-choix">
          {libelles.map((option) => (
            <button
              key={option.cle}
              type="button"
              className={`bilan-option ${ressenti === option.cle ? 'choisie' : ''}`}
              onClick={() => setRessenti(option.cle)}
            >
              <span className="bilan-option-libelle">{option.libelle}</span>
              <span className="bilan-option-detail">{option.detail}</span>
            </button>
          ))}
        </div>

        <label className="bilan-note">
          <span>Quelque chose à retenir ? (facultatif)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Genou droit sensible sur les fentes, à surveiller."
          />
        </label>

        {derniere && derniere.note && (
          <p className="bilan-rappel">La dernière fois, tu avais noté : {derniere.note}</p>
        )}

        <div className="bilan-actions">
          <button
            type="button"
            className="bouton bouton-action bouton-large"
            disabled={!ressenti}
            onClick={() => onValider(ressenti, note.trim())}
          >
            Enregistrer
          </button>
          <button type="button" className="bouton bouton-discret" onClick={onPasser}>
            Passer
          </button>
        </div>
      </div>
    </div>
  )
}
