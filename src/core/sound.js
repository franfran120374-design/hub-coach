// Sons generes a la volee : pas de fichier audio a livrer, rien a charger.
// Le navigateur exige un geste utilisateur avant de laisser jouer du son :
// d'ou le bouton "Activer le son" au premier lancement.

let contexte = null
let boucle = null

export function audioPret() {
  return Boolean(contexte && contexte.state === 'running')
}

export async function activerAudio() {
  try {
    if (!contexte) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return false
      contexte = new Ctx()
    }
    if (contexte.state === 'suspended') await contexte.resume()
    return contexte.state === 'running'
  } catch {
    return false
  }
}

function note({ frequence = 660, duree = 0.15, volume = 0.2, forme = 'sine', decalage = 0 }) {
  if (!contexte) return
  const debut = contexte.currentTime + decalage
  const osc = contexte.createOscillator()
  const gain = contexte.createGain()
  osc.type = forme
  osc.frequency.setValueAtTime(frequence, debut)
  gain.gain.setValueAtTime(0.0001, debut)
  gain.gain.exponentialRampToValueAtTime(volume, debut + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree)
  osc.connect(gain)
  gain.connect(contexte.destination)
  osc.start(debut)
  osc.stop(debut + duree + 0.05)
}

export function bipDecompte() {
  note({ frequence: 520, duree: 0.09, volume: 0.12 })
}

export function bipTransition() {
  note({ frequence: 700, duree: 0.12, volume: 0.18 })
  note({ frequence: 990, duree: 0.18, volume: 0.18, decalage: 0.13 })
}

export function bipFin() {
  note({ frequence: 620, duree: 0.16, volume: 0.2 })
  note({ frequence: 780, duree: 0.16, volume: 0.2, decalage: 0.17 })
  note({ frequence: 1040, duree: 0.35, volume: 0.2, decalage: 0.34 })
}

export function bipAlerte() {
  note({ frequence: 440, duree: 0.2, volume: 0.25, forme: 'triangle' })
  note({ frequence: 330, duree: 0.3, volume: 0.25, forme: 'triangle', decalage: 0.22 })
}

export function demarrerBoucleAlerte(intervalleMs = 45000) {
  arreterBoucleAlerte()
  bipAlerte()
  boucle = setInterval(bipAlerte, intervalleMs)
}

export function arreterBoucleAlerte() {
  if (boucle) {
    clearInterval(boucle)
    boucle = null
  }
}
