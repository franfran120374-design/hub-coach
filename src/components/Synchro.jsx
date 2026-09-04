import { useEffect, useState } from 'react'
import {
  configSync,
  syncConfiguree,
  definirConfig,
  delierAppareil,
  derniereSync,
  genererCode,
  cleDeLiaison,
  importerCleDeLiaison,
  synchroniser
} from '../core/sync.js'
import {
  installationDisponible,
  surChangementInstallation,
  lancerInstallation,
  dejaInstallee,
  surIphone
} from '../core/pwa.js'

export default function Synchro({ onSynchronise }) {
  const [ouvert, setOuvert] = useState(false)
  const [configuree, setConfiguree] = useState(() => syncConfiguree())
  const [url, setUrl] = useState('')
  const [cle, setCle] = useState('')
  const [liaison, setLiaison] = useState('')
  const [message, setMessage] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [installable, setInstallable] = useState(() => installationDisponible())

  useEffect(() => surChangementInstallation(setInstallable), [])

  const derniere = derniereSync()

  const lancerSync = async () => {
    setEnCours(true)
    const resultat = await synchroniser()
    setEnCours(false)
    setMessage(
      resultat.ok
        ? { ton: 'bon', texte: `À jour : ${resultat.seances} jours d'historique, ${resultat.entrees} entrées de journal.` }
        : { ton: 'erreur', texte: `Échec : ${resultat.raison}` }
    )
    if (resultat.ok && onSynchronise) onSynchronise()
  }

  const brancherPremierAppareil = async () => {
    if (!url.trim() || !cle.trim()) {
      setMessage({ ton: 'erreur', texte: 'Il manque l\u2019adresse du projet ou la clé publique.' })
      return
    }
    definirConfig({ url, cle, code: genererCode() })
    setConfiguree(true)
    setMessage(null)
    await lancerSync()
  }

  const brancherDeuxiemeAppareil = async () => {
    const resultat = importerCleDeLiaison(liaison)
    if (!resultat) {
      setMessage({ ton: 'erreur', texte: 'Cette clé de liaison n\u2019est pas lisible.' })
      return
    }
    setConfiguree(true)
    setLiaison('')
    setMessage(null)
    await lancerSync()
  }

  const copierLiaison = async () => {
    try {
      await navigator.clipboard.writeText(cleDeLiaison())
      setMessage({ ton: 'bon', texte: 'Clé copiée. Colle-la sur ton autre appareil.' })
    } catch {
      setMessage({ ton: 'erreur', texte: 'Copie impossible. Sélectionne la clé ci-dessous à la main.' })
    }
  }

  const delier = () => {
    delierAppareil()
    setConfiguree(false)
    setMessage({ ton: 'bon', texte: 'Cet appareil ne synchronise plus. Tes données restent en local.' })
  }

  return (
    <section className="synchro">
      <button type="button" className="synchro-bascule" onClick={() => setOuvert(!ouvert)}>
        <span>Appareils et synchronisation</span>
        <span className="synchro-etat">
          {configuree
            ? derniere && derniere.ok
              ? `synchronisé ${formatHeure(derniere.horodatage)}`
              : 'branché'
            : 'local uniquement'}
        </span>
      </button>

      {ouvert && (
        <div className="synchro-panneau">
          {!dejaInstallee() && installable && (
            <div className="synchro-bloc">
              <p className="synchro-titre">Installer sur cet appareil</p>
              <p className="synchro-texte">
                L&apos;application s&apos;ouvre en plein écran, sans barre de navigateur, et
                fonctionne sans connexion.
              </p>
              <button type="button" className="bouton bouton-action" onClick={lancerInstallation}>
                Installer
              </button>
            </div>
          )}

          {!dejaInstallee() && !installable && surIphone() && (
            <div className="synchro-bloc">
              <p className="synchro-titre">Installer sur iPhone</p>
              <p className="synchro-texte">
                Bouton Partager en bas de Safari, puis « Sur l&apos;écran d&apos;accueil ».
                Safari ne propose pas d&apos;installation automatique.
              </p>
            </div>
          )}

          {!configuree ? (
            <>
              <div className="synchro-bloc">
                <p className="synchro-titre">Premier appareil</p>
                <p className="synchro-texte">
                  Colle l&apos;adresse de ton projet Supabase et sa clé publique. N&apos;importe
                  quel projet existant convient, le script n&apos;écrase rien. Le code de liaison
                  est généré automatiquement.
                </p>
                <input
                  className="synchro-champ"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xxxxxxxx.supabase.co"
                  spellCheck={false}
                />
                <input
                  className="synchro-champ"
                  value={cle}
                  onChange={(e) => setCle(e.target.value)}
                  placeholder="sb_publishable_… (ou clé anon)"
                  spellCheck={false}
                />
                <button type="button" className="bouton bouton-action" onClick={brancherPremierAppareil}>
                  Brancher
                </button>
              </div>

              <div className="synchro-bloc">
                <p className="synchro-titre">Deuxième appareil</p>
                <p className="synchro-texte">
                  Colle ici la clé de liaison copiée depuis ton premier appareil.
                </p>
                <input
                  className="synchro-champ"
                  value={liaison}
                  onChange={(e) => setLiaison(e.target.value)}
                  placeholder="clé de liaison"
                  spellCheck={false}
                />
                <button type="button" className="bouton bouton-action" onClick={brancherDeuxiemeAppareil}>
                  Relier
                </button>
              </div>
            </>
          ) : (
            <div className="synchro-bloc">
              <p className="synchro-titre">Cet appareil est branché</p>
              <p className="synchro-texte">
                Projet {configSync().url.replace('https://', '')}. La synchronisation se fait à
                l&apos;ouverture, après chaque séance, et toutes les cinq minutes.
              </p>
              <div className="synchro-actions">
                <button type="button" className="bouton bouton-action" onClick={lancerSync} disabled={enCours}>
                  {enCours ? 'En cours…' : 'Synchroniser maintenant'}
                </button>
                <button type="button" className="bouton bouton-fin" onClick={copierLiaison}>
                  Copier la clé de liaison
                </button>
                <button type="button" className="bouton bouton-discret" onClick={delier}>
                  Délier cet appareil
                </button>
              </div>
              <textarea className="synchro-liaison" readOnly value={cleDeLiaison()} rows={2} />
            </div>
          )}

          {message && <p className={`synchro-message ${message.ton}`}>{message.texte}</p>}
        </div>
      )}
    </section>
  )
}

function formatHeure(horodatage) {
  const d = new Date(horodatage)
  return `à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
