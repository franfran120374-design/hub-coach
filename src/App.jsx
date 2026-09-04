import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import routinesParDefaut from './data/routines.json'
import { evaluerToutes, routineLaPlusUrgente, prochaineRoutine } from './core/scheduler.js'
import {
  enregistrerSeance,
  reportRoutine,
  lireReglages,
  ecrireReglages,
  nombreReports,
  ajouterAuJournal,
  ignorerSignal
} from './core/storage.js'
import { appliquerBilan } from './core/progression.js'
import { appliquerAjustement } from './core/ajustements.js'
import { synchroniser, syncConfiguree } from './core/sync.js'
import { initPwa } from './core/pwa.js'
import { activerAudio, audioPret, demarrerBoucleAlerte, arreterBoucleAlerte } from './core/sound.js'
import { arreter as arreterMusique, reglerVolume } from './core/music.js'
import Synchro from './components/Synchro.jsx'
import Signaux from './components/Signaux.jsx'
import Journee from './components/Journee.jsx'
import Seance from './components/Seance.jsx'
import Bilan from './components/Bilan.jsx'
import Blocage from './components/Blocage.jsx'
import Progression from './components/Progression.jsx'
import Suivi from './components/Suivi.jsx'
import Journal from './components/Journal.jsx'

const bureau = typeof window !== 'undefined' && window.coach && window.coach.bureau

export default function App() {
  const [maintenant, setMaintenant] = useState(() => new Date())
  const [version, setVersion] = useState(0)
  const [seanceId, setSeanceId] = useState(null)
  const [bilanId, setBilanId] = useState(null)
  const [reglages, setReglages] = useState(() => lireReglages())
  const [sonPret, setSonPret] = useState(() => audioPret())
  const alertesEnvoyees = useRef({})
  const niveauPrecedent = useRef(0)

  useEffect(() => {
    const battement = setInterval(() => setMaintenant(new Date()), 1000)
    return () => clearInterval(battement)
  }, [])

  // Synchronisation : a l'ouverture, puis toutes les cinq minutes.
  useEffect(() => {
    initPwa()
    if (!syncConfiguree()) return undefined
    const lancer = () => synchroniser().then((r) => r.ok && setVersion((v) => v + 1))
    lancer()
    const battement = setInterval(lancer, 5 * 60 * 1000)
    const auRetour = () => {
      if (document.visibilityState === 'visible') lancer()
    }
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      clearInterval(battement)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [])

  const routines = routinesParDefaut
  const evaluations = useMemo(
    () => evaluerToutes(routines, maintenant),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routines, Math.floor(maintenant.getTime() / 5000), version]
  )

  const enPleineSeance = Boolean(seanceId || bilanId)
  const urgente = routineLaPlusUrgente(evaluations)
  const suivante = prochaineRoutine(evaluations)
  const niveau = enPleineSeance ? 0 : urgente ? urgente.niveau : 0
  const routineEnCours = seanceId ? routines.find((r) => r.id === seanceId) : null
  const routineDuBilan = bilanId ? routines.find((r) => r.id === bilanId) : null

  // Escalade : notification, son, prise de l'ecran.
  useEffect(() => {
    if (!urgente || enPleineSeance) {
      arreterBoucleAlerte()
      if (bureau) window.coach.liberer()
      niveauPrecedent.current = 0
      return
    }

    const cle = urgente.routine.id
    const dejaEnvoye = alertesEnvoyees.current[cle] || 0

    if (urgente.niveau > dejaEnvoye) {
      alertesEnvoyees.current[cle] = urgente.niveau
      const messages = {
        1: `C'est l'heure. ${urgente.routine.nom}.`,
        2: `${urgente.retard} minutes de retard sur ${urgente.routine.nom.toLowerCase()}.`,
        3: `On arrête tout. ${urgente.routine.nom}, maintenant.`
      }
      const corps = messages[urgente.niveau]
      if (bureau) window.coach.notifier('Coach', corps)
      else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Coach', { body: corps })
      }
    }

    if (reglages.sonActif && urgente.niveau >= 2 && sonPret) demarrerBoucleAlerte(45000)
    else arreterBoucleAlerte()

    if (bureau && urgente.niveau !== niveauPrecedent.current) {
      niveauPrecedent.current = urgente.niveau
      window.coach.escalader(urgente.niveau)
    }
  }, [urgente, enPleineSeance, reglages.sonActif, sonPret])

  useEffect(() => {
    reglerVolume(reglages.volume)
  }, [reglages.volume])

  const demarrer = useCallback(async (routineId) => {
    if (!audioPret()) {
      const ok = await activerAudio()
      setSonPret(ok)
    }
    arreterBoucleAlerte()
    if (bureau) window.coach.liberer()
    setSeanceId(routineId)
  }, [])

  const terminer = useCallback((routineId) => {
    enregistrerSeance(routineId, { reports: nombreReports(routineId) })
    arreterMusique()
    delete alertesEnvoyees.current[routineId]
    setSeanceId(null)
    setBilanId(routineId)
    setVersion((v) => v + 1)
  }, [])

  const abandonner = useCallback(() => {
    arreterMusique()
    setSeanceId(null)
    setVersion((v) => v + 1)
  }, [])

  const cloreBilan = useCallback((routine, ressenti, note) => {
    const { etat, changement } = appliquerBilan(routine, ressenti)
    ajouterAuJournal({
      routineId: routine.id,
      ressenti: ressenti || null,
      note: note || '',
      niveau: etat.niveau,
      changement: changement ? changement.texte : null
    })
    setBilanId(null)
    setVersion((v) => v + 1)
    if (syncConfiguree()) synchroniser()
  }, [])

  const reporter = useCallback((routineId, minutes) => {
    reportRoutine(routineId, minutes)
    arreterBoucleAlerte()
    alertesEnvoyees.current[routineId] = 0
    if (bureau) window.coach.liberer()
    setVersion((v) => v + 1)
  }, [])

  const appliquerSignal = useCallback((signal) => {
    appliquerAjustement(signal.action)
    ajouterAuJournal({
      routineId: signal.routineId,
      ressenti: null,
      note: '',
      changement: `Ajustement accepté : ${signal.titre.toLowerCase()}`
    })
    setVersion((v) => v + 1)
  }, [])

  const ecarterSignal = useCallback((signal) => {
    ignorerSignal(signal.cle, 14)
    setVersion((v) => v + 1)
  }, [])

  const majReglages = useCallback((partiel) => {
    setReglages(ecrireReglages(partiel))
  }, [])

  const preparerSon = useCallback(async () => {
    const ok = await activerAudio()
    setSonPret(ok)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  if (routineEnCours) {
    return (
      <Seance
        routine={routineEnCours}
        reglages={reglages}
        onTerminer={() => terminer(routineEnCours.id)}
        onAbandonner={abandonner}
      />
    )
  }

  if (routineDuBilan) {
    return (
      <Bilan
        routine={routineDuBilan}
        onValider={(ressenti, note) => cloreBilan(routineDuBilan, ressenti, note)}
        onPasser={() => cloreBilan(routineDuBilan, null, '')}
      />
    )
  }

  return (
    <div className={`app niveau-${niveau}`}>
      {niveau === 3 && urgente && (
        <Blocage
          evaluation={urgente}
          onDemarrer={() => demarrer(urgente.routine.id)}
          onReporter={(minutes) => reporter(urgente.routine.id, minutes)}
        />
      )}

      <header className="entete">
        <div className="horloge">
          <span className="horloge-heure">
            {String(maintenant.getHours()).padStart(2, '0')}
            <span className="horloge-sep">:</span>
            {String(maintenant.getMinutes()).padStart(2, '0')}
          </span>
          <p className="horloge-phrase">{phraseDuMoment(urgente, suivante)}</p>
        </div>
        <div className="entete-actions">
          {!sonPret && (
            <button type="button" className="bouton bouton-fin" onClick={preparerSon}>
              Activer le son
            </button>
          )}
          <label className="interrupteur">
            <input
              type="checkbox"
              checked={reglages.sonActif}
              onChange={(e) => majReglages({ sonActif: e.target.checked })}
            />
            <span>Rappels sonores</span>
          </label>
          <label className="interrupteur">
            <input
              type="checkbox"
              checked={reglages.musiqueActive}
              onChange={(e) => majReglages({ musiqueActive: e.target.checked })}
            />
            <span>Musique</span>
          </label>
        </div>
      </header>

      <main className="colonnes">
        <div className="colonne-gauche">
          <Signaux
            routines={routines}
            version={version}
            onAppliquer={appliquerSignal}
            onIgnorer={ecarterSignal}
          />
          <Journee evaluations={evaluations} onDemarrer={demarrer} onReporter={reporter} />
          <Journal routines={routines} version={version} />
        </div>
        <div className="colonne-droite">
          <Synchro onSynchronise={() => setVersion((v) => v + 1)} />
          <Progression routines={routines} version={version} />
          <Suivi routines={routines} version={version} />
        </div>
      </main>

      {bureau && (
        <footer className="pied">
          <button type="button" className="bouton bouton-fin" onClick={() => window.coach.quitter()}>
            Quitter le coach
          </button>
          <span className="pied-note">
            Fermer la fenêtre la réduit seulement : le coach continue de compter.
          </span>
        </footer>
      )}
    </div>
  )
}

function phraseDuMoment(urgente, suivante) {
  if (urgente) {
    const minutes = urgente.retard
    if (urgente.niveau >= 3) return `${urgente.routine.nom} : ${minutes} minutes de retard. On y va.`
    if (urgente.niveau === 2) return `${urgente.routine.nom} attend depuis ${minutes} minutes.`
    return `C'est l'heure de ${urgente.routine.nom.toLowerCase()}.`
  }
  if (suivante) {
    if (suivante.etat === 'reportee') {
      return `${suivante.routine.nom} revient dans ${suivante.repriseDans} min.`
    }
    if (suivante.etat === 'attente') {
      return `${suivante.routine.nom} : la fenêtre est ouverte.`
    }
    const h = Math.floor((suivante.dansMinutes || 0) / 60)
    const m = (suivante.dansMinutes || 0) % 60
    const delai = h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
    return `Prochaine étape dans ${delai} : ${suivante.routine.nom.toLowerCase()}.`
  }
  return 'Journée bouclée. Rien ne t\u2019attend.'
}
