// Utilitaires de date et d'heure. Aucune dependance externe.

export function minutesDepuisMinuit(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes()
}

export function heureEnMinutes(heure) {
  const [h, m] = String(heure).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

export function minutesEnHeure(total) {
  const t = ((total % 1440) + 1440) % 1440
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatChrono(secondes) {
  const s = Math.max(0, Math.round(secondes))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function clefJour(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function clefJourDecalee(nbJours, date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() + nbJours)
  return clefJour(d)
}

export function nomJourCourt(date = new Date()) {
  return ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][date.getDay()]
}

export function dureeTotale(routine) {
  if (routine.mode === 'checklist') return null
  return (routine.exercices || []).reduce((somme, ex) => somme + (ex.duree || 0), 0)
}
