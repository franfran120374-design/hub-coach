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

## Progression et mémoire

À la fin de chaque séance, le coach demande une seule chose : c'était **trop facile**, **juste**, ou **trop dur**.
Plus une note libre facultative. C'est tout ce dont il a besoin pour ajuster.

### Le renforcement monte tout seul

Chaque exercice concerné a un palier dans `routines.json` :

```json
"progression": { "unite": "répétitions", "depart": 12, "pas": 2, "max": 30 }
```

- **trop facile** → un cran de plus dès la séance suivante
- **juste** → trois séances de suite au bon rythme, puis un cran de plus
- **trop dur** → un cran de moins

Le gainage progresse en secondes : c'est le minuteur lui-même qui s'allonge
(`"cible": "duree"` dans son palier). Les autres exercices affichent le nombre de
répétitions du jour au-dessus du chrono. Le `max` empêche l'escalade sans fin.

### L'heure de coucher recule

C'est la mécanique la plus utile pour dormir. Le coucher ne progresse pas au ressenti mais
à la régularité :

```json
"progressionHeure": { "cibleFinale": "22:15", "pasMin": 5, "seancesParPas": 4 }
```

Quatre nuits tenues et l'heure exigée recule de cinq minutes. De 23:00 à 22:15, il faut
36 nuits. Personne ne se couche 45 minutes plus tôt du jour au lendemain ; par tranches
de cinq minutes, le corps suit sans s'en apercevoir.
Si tu réponds « trop tôt pour moi », l'heure repart de cinq minutes en arrière : le coach
recule plutôt que de te faire échouer chaque soir.

### Le journal

Chaque séance validée laisse une entrée : date, routine, ressenti, changement de niveau,
et ta note. Au début de la séance suivante, le coach te ressort la dernière note que tu
avais laissée sur cette routine — c'est là que tu écris « genou droit sensible sur les
fentes » pour ne pas l'oublier trois semaines plus tard.

Les 400 dernières entrées sont conservées, en local uniquement.

---

## Ce que le coach remarque tout seul

Le coach relit ton historique et ton journal. Quand un motif se répète, il te le dit —
et il te propose une adaptation applicable en un clic. Une observation sans proposition,
c'est un reproche : il n'en fait pas.

Quatre motifs sont surveillés :

| Motif | Ce qui déclenche | Ce qu'il propose |
|---|---|---|
| Trop dur | trois séances de suite marquées « trop dur » | semaine allégée : un cran de moins et les exercices secondaires retirés pendant 7 jours |
| Jour faible | un même jour de la semaine raté 3 fois sur les 4 dernières, alors que le reste tient | un horaire propre à ce jour (coucher), ou retirer ce jour du programme (renforcement) |
| Reports en cascade | plus de 2 reports en moyenne sur les 5 dernières séances | décaler l'horaire de 30 minutes : l'heure ne correspond pas à ta journée réelle |
| Trop facile | trois séances de suite marquées « trop facile » | doubler le pas de progression |

Chaque proposition a deux réponses : **Appliquer**, ou **Laisser comme ça** — qui met le
signal de côté pour deux semaines. Deux signaux maximum sont affichés à la fois, et une
routine n'en produit jamais deux en même temps : deux conseils contradictoires le même jour,
c'est du bruit.

**Les garde-fous.** Un « jour faible » ne se déclenche que si la routine a au moins six
séances faites, un taux de réussite global supérieur à 40 %, et si les autres jours tiennent
à plus de 60 %. Sans ça, une routine jamais lancée signalerait tous les jours de la semaine
comme problématiques.

### Ce que les ajustements modifient

`routines.json` reste ta référence, les ajustements se posent par-dessus dans
`coach.ajustements` : décalage d'horaire, horaire particulier pour un jour donné,
jour retiré, semaine allégée en cours. La carte « Où tu en es » affiche ce qui est
actif sous chaque routine. Pour repartir de zéro sur une routine, la fonction
`reinitialiserAjustements(routineId)` de `src/core/ajustements.js` remet le programme d'origine.

Les exercices retirés en semaine allégée sont ceux marqués `"allegeable": true`
dans `routines.json` — aujourd'hui les fentes et le pont fessier. À toi de choisir
lesquels sont secondaires.

---

## Sur le téléphone, et synchronisé

### Installer l'application

L'application publiée sur GitHub Pages s'installe sur l'écran d'accueil et fonctionne
ensuite sans connexion, en plein écran, sans barre de navigateur.

- **Android** : ouvre le site dans Chrome, puis le panneau « Appareils et synchronisation »
  propose un bouton *Installer*. Chrome affiche aussi sa propre bannière.
- **iPhone** : Safari ne propose pas d'installation automatique. Bouton Partager, puis
  « Sur l'écran d'accueil ».
- **Ordinateur** : Chrome et Edge affichent une icône d'installation dans la barre d'adresse.

### Brancher la synchronisation

La synchronisation demande un serveur. J'ai choisi Supabase : gratuit, rien à maintenir,
et l'application l'appelle en REST sans bibliothèque supplémentaire.

**Une seule fois, sur supabase.com :**

1. Ouvre un projet. **Un projet existant convient** : le script crée sa propre table
   `coach_etat` et ses deux fonctions, il n'écrase rien et ne touche à rien d'autre.
   Inutile d'en créer un dédié, surtout si tu as atteint la limite de projets gratuits.
2. Onglet *SQL Editor*, colle tout le contenu de `supabase/installation.sql`, clique sur *Run*.
3. Onglet *Project Settings → API Keys* : copie l'**URL du projet** et la clé publique.
   Selon l'âge du projet elle s'appelle **publishable** (`sb_publishable_…`) ou **anon**
   dans l'onglet *Legacy API Keys*. Les deux fonctionnent : Supabase remplace
   progressivement la seconde par la première, avec les mêmes privilèges.

**Sur ton premier appareil :** panneau « Appareils et synchronisation », section
*Premier appareil*, colle l'URL et la clé, clique sur *Brancher*. Un code de
32 caractères est généré : c'est lui qui protège tes données.

**Sur le deuxième :** sur le premier appareil, clique sur *Copier la clé de liaison*.
Envoie-la-toi par message ou par mail, puis colle-la dans la section *Deuxième appareil*.
Un seul copier-coller, rien d'autre à saisir.

### Ce que la synchronisation garantit

Elle tourne à l'ouverture, au retour sur l'application, après chaque séance validée,
et toutes les cinq minutes.

La fusion ne perd jamais une séance : les historiques et les journaux des deux appareils
sont réunis, jamais écrasés. Seuls la progression, les ajustements et les réglages
tranchent au plus récent — ce sont des réglages, pas des faits.

Concrètement : si tu valides le coucher sur le téléphone pendant que l'ordinateur est
éteint, la séance est là au réveil de l'ordinateur. Et inversement.

### Sécurité

La clé publique de Supabase est publique par conception, mais elle ne donne accès à rien :
le script SQL verrouille la table et n'expose que deux fonctions, qui exigent ton code de
32 caractères. Sans ce code, il n'y a rien à lire.
Ne mets ni l'URL, ni la clé, ni le code dans le dépôt : tout est saisi dans l'application
et reste sur tes appareils.

---

## Où vivent tes données

Tout est stocké en local dans le navigateur ou l'application (`localStorage`), sous sept clés :
`coach.historique`, `coach.reports`, `coach.reglages`, `coach.progression`, `coach.journal`,
`coach.ajustements`, `coach.signauxIgnores`. Rien ne sort de ta machine.

---

## Structure

```
electron/main.cjs        fenêtre, notifications système, prise d'écran au niveau 3
electron/preload.cjs     pont sécurisé vers l'interface
src/core/scheduler.js    le cerveau : décide de l'état de chaque routine
src/core/progression.js  niveaux, doses du jour, heure de coucher effective
src/core/ajustements.js  décalages, jours retirés, semaines allégées
src/core/signaux.js      détection de motifs et propositions d'adaptation
src/core/sync.js         synchronisation entre appareils, fusion sans perte
src/core/pwa.js          installation sur l'écran d'accueil, hors connexion
public/sw.js             service worker : réseau d'abord, cache en secours
supabase/installation.sql  à coller une fois dans ton projet Supabase
src/core/storage.js      historique, séries, reports, réglages, progression, journal
src/core/sound.js        bips et alarmes générés (aucun fichier audio requis)
src/core/music.js        couche musique, une source par type de playlist
src/data/routines.json   ton programme
src/data/playlists.json  tes playlists
src/components/          interface
```

Pour l'intégration future au Hub : `src/core/` ne dépend d'aucun composant.
Il suffit d'importer `scheduler.js` et `storage.js` et de remplacer l'interface.
