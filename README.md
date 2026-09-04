# Coach — module autonome

Un coach de routines qui te rappelle à l'ordre : étirements du matin, renforcement, extinction des feux le soir.
Il fonctionne seul aujourd'hui, et il est découpé pour être branché sur le Hub plus tard sans réécriture.

---

## Installation

Prérequis : **Node.js 18 ou plus** (https://nodejs.org, version LTS).

Ouvre un terminal dans le dossier du dépôt et lance :

```
npm install
```

### Utiliser le coach dans le navigateur

```
npm run dev
```

Puis ouvre http://localhost:5173.
Le navigateur donne les rappels et l'écran bloquant, mais il ne peut pas passer devant tes autres fenêtres.

### Utiliser le coach en application de bureau (recommandé)

Deux terminaux :

```
Terminal 1 : npm run dev
Terminal 2 : npm run app
```

Là, le coach peut vraiment insister : notification système, fenêtre qui remonte au premier plan,
puis prise de l'écran entier au niveau 3.

Pour une version qui tourne sans terminal de développement :

```
npm run app:build
```

---

## Les trois niveaux d'insistance

Chaque routine a une heure et une fenêtre de tolérance. Passée cette fenêtre, le coach monte le ton.

| Niveau | Quand | Ce qui se passe |
|---|---|---|
| 1 | fin de la fenêtre de tolérance | notification, la carte passe en ambre, la fenêtre clignote dans la barre des tâches |
| 2 | quelques minutes plus tard | rappel sonore toutes les 45 secondes, la fenêtre revient au premier plan |
| 3 | encore un peu plus tard | écran plein qui recouvre tout : commencer, ou reporter 10 minutes (compté et affiché) |

Au-delà de 4 heures de retard, le coach arrête d'insister et classe la séance comme manquée.

---

## Changer le programme

Tout est dans **`src/data/routines.json`**. Pas besoin de toucher au code.

```json
{
  "id": "muscu",
  "nom": "Renforcement",
  "heure": "18:30",
  "jours": [1, 3, 5],
  "mode": "timer",
  "toleranceMin": 45,
  "escaladeMin": [0, 10, 20],
  "playlist": "energie",
  "exercices": [
    { "nom": "Squats", "duree": 45, "consigne": "12 répétitions." }
  ]
}
```

- `jours` : 0 = dimanche, 1 = lundi … 6 = samedi.
- `mode` : `timer` (minuteur guidé, chaque exercice a une `duree` en secondes) ou `checklist` (cases à cocher, pas de `duree`).
- `toleranceMin` : combien de minutes de retard avant que le coach commence à insister.
- `escaladeMin` : minutes après la fin de la tolérance pour passer aux niveaux 1, 2 et 3.

---

## Brancher la musique

Tout se règle dans **`src/data/playlists.json`**.

**Fichiers audio locaux** — pose tes mp3 dans `public/musique/` puis :

```json
"energie": { "nom": "Énergie", "source": "locale", "pistes": ["morceau-1.mp3", "morceau-2.mp3"], "url": "" }
```

**Playlist en ligne** (Spotify, Deezer, YouTube) — elle s'ouvre automatiquement au démarrage de la séance :

```json
"energie": { "nom": "Énergie", "source": "externe", "pistes": [], "url": "https://open.spotify.com/playlist/..." }
```

Une playlist sans piste ni URL est simplement ignorée : la séance se déroule avec les bips du minuteur.

---

## Où vivent tes données

Tout est stocké en local dans le navigateur ou l'application (`localStorage`), sous trois clés :
`coach.historique`, `coach.reports`, `coach.reglages`. Rien ne sort de ta machine.

---

## Structure

```
electron/main.cjs        fenêtre, notifications système, prise d'écran au niveau 3
electron/preload.cjs     pont sécurisé vers l'interface
src/core/scheduler.js    le cerveau : décide de l'état de chaque routine
src/core/storage.js      historique, séries, reports, réglages
src/core/sound.js        bips et alarmes générés (aucun fichier audio requis)
src/core/music.js        couche musique, une source par type de playlist
src/data/routines.json   ton programme
src/data/playlists.json  tes playlists
src/components/          interface
```

Pour l'intégration future au Hub : `src/core/` ne dépend d'aucun composant.
Il suffit d'importer `scheduler.js` et `storage.js` et de remplacer l'interface.
