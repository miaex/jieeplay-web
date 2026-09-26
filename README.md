# JieePlay — version PWA

Migration de Godot vers une PWA (HTML5/CSS3/JS), conservant tout le
contenu déjà écrit (mots, traductions, textes de récompense, sons).

## État actuel : V32 — application complète

L'app est entièrement fonctionnelle de bout en bout, pas seulement le
socle initial :

- Écran de chargement avec vraie barre de progression
- Onboarding complet (langue → genre → prénom)
- Écran d'accueil (bienvenue + menu, carte "message du jour", navigation)
- **Jeu d'anagramme** complet (10 catégories, **1161 mots**, indices, positions
  verrouillées selon la longueur du mot)
- **Système de récompenses** à deux étages :
  - `RewardEngine` (v2) : moteur éditorial (idées/familles/émotions/
    métaphores/structures/vocabulaire), sélection pondérée avec mémoire
    anti-répétition par joueur, et messages rares occasionnels.
  - Écran "Récompense secrète" : révélation en 5 lots de 5 cartes en
    éventail (25 cartes, jamais codées en dur), avant archivage du
    message complet.
- **Mon parcours** : chapitre en cours, statistiques, et une mini-piste
  de progression (chapitres faits / en cours / à venir).
- **Tutoriel "Comment jouer"** accessible depuis Réglages ET depuis un
  bouton dédié sur le plateau de jeu.
- **Univers JieePlay** : hub accessible depuis l'accueil, pensé pour
  accueillir de futurs jeux au sein de la même PWA.
- **Messagerie** : espace de discussion accessible depuis l'accueil —
  texte, photo (galerie ou appareil photo), message audio, suppression
  (pour soi / pour tout le monde), notifications push côté joueur.
  Connectée à un vrai backend (Firestore) — voir sections dédiées
  plus haut pour l'état technique et le panneau admin.
- **Mes récompenses** : liste en accordéon des chapitres terminés, avec
  repère "Nouveau" sur les récompenses pas encore consultées.
- Paramètres (son, musique, vibration, réinitialisation)
- Sauvegarde locale (`localStorage`, clé `jieeplay_save_v1`)
- PWA installable, fonctionne hors ligne (service worker, cache `jieeplay-v32`)
- Sons et musique (mêmes fichiers que la version Godot)

## Messagerie — panneau admin (comment tu reçois les messages)

Le panneau admin est une page séparée, `admin.html` (+ `admin.css` +
`admin.js`), volontairement **hors de la PWA joueur** — pas de lien
depuis l'app, pas mise en cache par le service worker (elle n'a pas
besoin de fonctionner hors-ligne). Une fois déployée sur GitHub Pages,
elle est accessible à `https://TONNOM.github.io/NOMDUREPO/admin.html`
— garde cette URL pour toi (favoris), elle n'est indexée nulle part
(`<meta name="robots" content="noindex, nofollow">`).

Elle affiche la liste de toutes les conversations à gauche, triées par
dernier message, et permet de lire/répondre en temps réel à droite —
tes réponses apparaissent instantanément chez le joueur, sans qu'il
ait besoin de recharger l'app.

### Mise en place (deux étapes, à faire une seule fois)

1. **Créer ton compte admin** : Firebase Console → Authentication →
   Sign-in method → activer **Email/Password**. Puis onglet **Users**
   → **Add user** → choisis un email et un mot de passe (ce sera tes
   identifiants pour `admin.html`).
2. **Sécuriser l'accès** : copie le **User UID** affiché à côté de ce
   compte, envoie-le-moi. Je le remplace dans `firestore.rules` (déjà
   préparé dans le projet) à la place de `"ADMIN_UID"`, et tu colles le
   contenu du fichier dans Firebase Console → Firestore Database →
   onglet **Règles** → **Publier**. Sans cette étape, personne
   (ni toi, ni les joueurs) ne peut lire ou écrire dans Firestore — les
   règles refusent tout par défaut tant qu'elles ne connaissent pas ton
   identité.

### Ce qui manque encore : le push automatique vers toi

Actuellement, tu sais qu'un joueur t'a écrit uniquement en ouvrant
`admin.html`. Un joueur, lui, peut recevoir une vraie notification
push (une fois qu'il a autorisé les notifications dans le chat) grâce
au service worker — mais l'inverse (toi, notifié automatiquement dès
qu'un joueur écrit) demande une **Cloud Function** : un petit bout de
code qui tourne côté serveur, déclenché à chaque nouveau message, qui
envoie le push vers ton propre token. Le client seul (le navigateur)
ne peut pas envoyer de push à un autre appareil — ça doit venir d'un
serveur. C'est la prochaine étape logique une fois que la messagerie
de base est validée en conditions réelles.

## Messagerie — état technique (V32)

- **Identifiant joueur réel** : authentification anonyme Firebase
  (`State.profile.playerId` = uid Firebase, stable tant que le joueur
  ne vide pas les données de son navigateur). C'est cet identifiant,
  vérifiable côté serveur, qui protège chaque conversation.
- **Stockage des messages** : Firestore, option "tout dans la base"
  (pas de Cloud Storage, donc pas de carte bancaire requise). Les
  photos sont compressées côté appareil avant envoi (max ~1000px,
  JPEG 72%) et les messages audio plafonnés à 45 secondes, pour rester
  sous la limite de 1 Mo par document Firestore.
- **Suppression** : "Pour moi" (masque localement, appui long sur un
  message) et "Pour tout le monde" (supprime réellement le document
  partagé — implémenté, mais seulement sur ses propres messages,
  appliqué des deux côtés via les règles de sécurité).
- **Notifications push (côté joueur)** : bouton dédié dans le chat
  pour activer les notifications (`getToken` + service worker fusionné
  avec Firebase Messaging — voir `sw.js`). Pas universellement supporté
  (notamment Safari iOS hors installation sur l'écran d'accueil) — le
  bouton se masque automatiquement si indisponible plutôt que d'échouer
  silencieusement.
- **Limite connue non testée en conditions réelles** : je n'ai pas
  d'accès réseau depuis cet environnement pour tester contre ton vrai
  projet Firebase. Le code suit fidèlement l'API officielle (SDK
  modulaire v12), mais la première vraie vérification (envoyer un
  message, le voir apparaître dans `admin.html`) doit se faire sur ton
  téléphone après déploiement.

## Profil partagé entre les jeux de l'Univers

`State.profile` (langue, genre, prénom, avatar) est un objet JS global,
chargé une seule fois au démarrage et partagé par toute l'application.
Un futur jeu ajouté dans `data/games.json` lit et écrit ce même objet
directement — il n'y a rien à dupliquer ni à synchroniser
manuellement. Ce qui est propre à JieePlay (chapitre, niveau,
récompenses) reste dans `State.progress`, à ne pas confondre avec
`State.profile` : un nouveau jeu garde sa propre progression dans son
propre espace (ex. `State.games ? State.games[id] :` — à créer selon
ses besoins), mais partage toujours l'identité du joueur.

## V32 — identifiant joueur réel, messagerie connectée, panneau admin

1. **Identifiant joueur réel** : `State.profile.playerId`, un uid
   Firebase obtenu par authentification anonyme (invisible pour le
   joueur). Stable d'une session à l'autre, préservé même après un
   "Réinitialiser la progression" dans Réglages (seule la progression
   de jeu repart à zéro, pas l'identité de la conversation).

2. **Messagerie connectée à un vrai backend** (Firestore). Voir la
   section "Messagerie — état technique" plus haut pour le détail.
   Points clés : suppression pour soi / pour tout le monde (appui long
   sur un message), notifications push côté joueur (bouton dédié,
   masqué si non supporté), compression d'image côté appareil.
   Fusion du service worker avec Firebase Messaging (`sw.js`) plutôt
   qu'un second service worker séparé — évite tout conflit de scope.

3. **Panneau admin** (`admin.html`, `admin.js`, `admin.css`) — page
   séparée, hors PWA joueur, protégée par Firebase Authentication.
   Liste des conversations en temps réel, lecture/réponse. Voir section
   dédiée plus haut pour la mise en place (compte admin + règles de
   sécurité).

4. **Règles de sécurité Firestore** (`firestore.rules`, à coller dans
   la console Firebase) : chaque conversation n'est lisible/écrivable
   que par son joueur et par l'admin — jamais par un autre joueur, même
   authentifié anonymement.

5. **Non testé en conditions réelles** — voir "Messagerie — état
   technique" : cet environnement n'a pas d'accès réseau pour tester
   contre le vrai projet Firebase. Le code suit l'API officielle
   (SDK modulaire v12) mais la vérification finale (envoyer un
   message, le voir apparaître dans `admin.html` en temps réel) doit se
   faire sur un vrai appareil après déploiement.

6. **Non fait dans cette passe** : la notification push automatique
   *vers l'admin* (nécessite une Cloud Function — voir section
   "Ce qui manque encore" plus haut) et le retravaillement visuel de
   l'écran de révélation de récompense (toujours en attente).

7. Cache passé à `jieeplay-v32`.



1. **Carte "Univers JieePlay" illisible sur l'accueil** — corrigé.
   Cause réelle : son fond n'avait que 14% d'opacité (contre ~72%
   pour la carte principale), donc la photo de fond de l'accueil
   transperçait entièrement et cassait le contraste. Remise au même
   traitement "verre" que le reste de l'écran (fond crème opaque,
   flou, ombre), plus une icône dans un badge dégradé or/mauve au lieu
   d'un emoji flottant. Testé avec la photo de fond active.

2. **Messagerie** (`js/chat.js`, `css/chat.css`, `#view-chat`) : bulles
   de conversation, envoi de texte, photo depuis la galerie, photo
   depuis l'appareil photo, message audio (`MediaRecorder`, plafonné à
   2 minutes). Accessible depuis un nouveau bouton sur l'accueil (a
   remplacé l'icône Réglages du header — Réglages reste accessible
   depuis la navigation basse, donc rien n'est perdu). Voir section
   "Messagerie" plus haut pour l'état réel (stockage local, backend à
   brancher) — testé de bout en bout (texte, image, ouverture/fermeture
   du menu de pièce-jointe), zéro erreur.
   - **Bug trouvé et corrigé pendant ce développement** : même erreur
     que le bug V30 (`position: relative` écrasant `.view`), réintroduite
     par mégarde dans `chat.css`. Repérée immédiatement par la même
     vérification de hauteur d'écran qui avait servi à diagnostiquer le
     bug V30 — corrigée avant livraison, pas seulement après coup.

3. Cache passé à `jieeplay-v32`.

1. **Correctif : "Mes récompenses" ne défilait plus au-delà d'un
   certain nombre de chapitres.** Cause réelle : dans `journey.css`,
   la règle `#view-journey, #view-rewards { position: relative; }`
   écrasait par erreur (spécificité ID) le `position: absolute; inset:
   0` que `.view` pose en base pour borner chaque écran à la hauteur
   du viewport. Résultat : l'écran grandissait avec son contenu au
   lieu d'être borné, et rien ne défilait — les chapitres les plus
   récents sortaient simplement du cadre visible. Le bug existait déjà
   en V27, invisible tant qu'il y avait peu de chapitres. Corrigé en
   retirant la surcharge ; testé avec 15 chapitres, défilement
   vérifié jusqu'au dernier.

2. **Univers JieePlay — architecture multi-jeux** (`js/hub.js`,
   `css/hub.css`, `data/games.json`, nouvelle vue `#view-hub`). Une
   nouvelle carte sur l'accueil ("Univers JieePlay") ouvre un hub
   listant les jeux disponibles et à venir. JieePlay (le jeu actuel)
   y figure comme premier jeu, deux emplacements "Bientôt" illustrent
   la suite. Pour ajouter un futur jeu codé séparément :
   - ajouter son entrée dans `data/games.json` (id, icône, libellés
     fr/en, `status: "available"`) ;
   - lui donner sa propre vue (`#view-<id>`), son propre module
     JS/CSS, exactement comme `journey.js`/`rewards-list.js` ;
   - lui ajouter un `case` dans `Hub.launchGame()`.
   Aucun changement nécessaire à la navigation existante : `Nav`,
   `App.views` et le service worker suivent le même schéma répétable
   déjà en place pour Parcours/Récompenses/Hub. Testé de bout en bout
   (accueil → hub → lancement de JieePlay → retour).

3. **Mots** : 1089 → **1161** (+72), rééquilibrage FR/EN (les
   catégories anglaises étaient plus petites que leurs équivalents
   français).

4. **Vérifications de bout en bout** (Playwright) : démarrage à
   blanc, balayage de tous les écrans, bascule de langue, aller-retour
   dans le hub — zéro erreur console. Complétion réelle d'un chapitre
   via `Game.onSuccess()` (pas un appel direct au moteur) : chapitre
   incrémenté, récompense générée avec le nouveau contenu, écran de
   révélation affiché correctement.
   - Observation mineure, non corrigée car sans impact : 6 clés de
     traduction (`reward_message_*_2`) existent en FR mais pas en EN ;
     elles ne sont référencées nulle part dans le code (résidu d'une
     version antérieure du système de récompenses). Inoffensif —
     laissé en l'état plutôt que supprimé sans certitude absolue.

5. Cache passé à `jieeplay-v30`.

1. **Vocabulaire du jeu** : 892 → **1089 mots** (+197), répartis sur les
   10 catégories × 2 langues, avec indices écrits un par un (aucun mot
   ni indice généré automatiquement). Vérifié : aucun doublon
   introduit, uniquement des lettres A–Z, longueurs 3–15 comme le reste
   de la banque.

2. **« Comment jouer » accessible depuis le plateau** (`btn-game-howto`
   dans `index.html`, coin supérieur droit, miroir du bouton retour).
   L'overlay existant a été sorti de `#view-settings` pour devenir un
   élément global (`.global-modal-overlay`, `position: fixed`), afin
   d'être ouvrable depuis n'importe quel écran sans dupliquer son
   contenu. `Settings.openHowTo()` / `closeHowTo()` remplissent le
   texte à chaque ouverture, qu'elle vienne de Réglages ou du plateau —
   testé en ouvrant le tutoriel dès la première partie, sans jamais
   être passé par Réglages.

3. **Récompenses, approfondissement du contenu éditorial**
   (`data/rewards/content.json`) :
   - **Idées** : 16 → 30 (+14), chacune avec 3 formulations par langue,
     sur des thèmes plus profonds : être vu sans avoir à se justifier,
     valeur inconditionnelle, force discrète, absence remarquée,
     pardon envers soi-même, personne irremplaçable, droit à la
     douceur, mérite des bonnes choses qui arrivent.
   - **Métaphores** : 6 → 10 (+4 : jardin, phare, rivière, ancre).
   - **Messages rares** (les plus travaillés, ceux pensés pour être
     gardés ou partagés) : 2 → 5 par langue (+3 chacun).
   - **Vocabulaire** (formules personnelles, encouragements, clôtures) :
     étoffé dans les deux langues.
   - Le moteur (`reward-engine.js`) n'a pas été touché : il était déjà
     solide (score pondéré, anti-répétition sur 8 récompenses, familles
     liées). Le vrai gain de variété vient du contenu, comme
     diagnostiqué en V28 (§10-11 du cahier des charges).
   - Testé : 300 générations simulées (genres et langues alternés) —
     les 30 idées sont toutes atteignables, aucune erreur, l'accord de
     genre (`{masc|fem}`) s'applique correctement partout.

4. Cache passé à `jieeplay-v29`.

Objectif de cette passe : finition, pas nouvelles fonctionnalités (cf.
cahier des charges V27→V28). Trois changements, choisis parce qu'ils
répondaient chacun à un problème réel observé dans le code de V27 :

1. **Mini-piste de progression dans "Mon parcours"** (`journey.js`,
   `journey.css`, `index.html`). Avant : uniquement une carte "chapitre
   en cours" + une grille de statistiques — le joueur consultait des
   chiffres. Maintenant : une piste de 5 chapitres (2 avant / courant /
   2 après) avec des nœuds pleins (faits), un anneau doré (en cours) et
   des nœuds creux (à venir), reliés par une ligne qui se remplit au fil
   de la progression. Un chapitre déjà terminé **et** dont la récompense
   a été entièrement lue est cliquable : il ouvre directement l'entrée
   correspondante dans "Mes récompenses".

2. **Badge "Nouveau" dans "Mes récompenses"** (`rewards-list.js`,
   `rewards-list.css`, `reward.js`). Avant : une récompense fraîchement
   débloquée avait la même apparence qu'une récompense lue vingt parties
   plus tôt. Maintenant : chaque récompense fraîchement archivée porte un
   champ `viewed: false` ; une pastille dorée "Nouveau" s'affiche tant
   qu'elle n'a pas été ouverte une première fois, puis disparaît et se
   persiste. Les sauvegardes antérieures à V28 n'ont pas ce champ : elles
   sont traitées comme déjà vues (aucun badge ne surgit rétroactivement).

3. **Cache V28** (`sw.js`) : `CACHE_NAME` passé de `jieeplay-v27` à
   `jieeplay-v28`, ce qui déclenche le remplacement du cache existant à
   l'activation (`skipWaiting` + `clients.claim` déjà en place, logique
   de fetch inchangée). Tous les fichiers listés dans `ASSETS_TO_CACHE`
   ont été vérifiés présents sur disque.

### Volontairement laissé intact
- Le moteur `RewardEngine` (score, anti-répétition, messages rares) :
  aucun problème réel identifié, cf. §10 du cahier des charges.
- Les banques éditoriales (`data/rewards/content.json`).
- L'écran de révélation "Récompense secrète" (25 cartes en éventail) :
  déjà abouti visuellement.
- La structure de sauvegarde (`jieeplay_save_v1`) : le nouveau champ
  `viewed` est additif, aucune migration nécessaire.
- `data/rewards.json` (racine) : fichier orphelin de l'ancien système de
  récompenses (pré-RewardEngine), non référencé par le code. Laissé en
  place — sa suppression n'a pas été demandée et n'a aucun effet sur
  l'app ; à signaler pour une éventuelle décision future.

### Tests effectués
Réellement exécutés (Playwright, Chromium headless, viewport 390×844) :
- Rendu de la piste avec un joueur en tout début de jeu (chapitre 1,
  aucun chapitre terminé) : aucun nœud "fait", aucune erreur console.
- Rendu avec plusieurs chapitres terminés : nœuds et connecteurs
  corrects, badges "Nouveau" affichés sur les chapitres non consultés.
- Clic sur un nœud terminé → navigation vers "Mes récompenses" avec le
  bon chapitre déjà ouvert et son badge retiré.
- Chargement d'une sauvegarde simulant le format pré-V28 (sans le champ
  `viewed`) : aucun badge "Nouveau" ne s'affiche à tort, aucune erreur.
- Vérification que chaque fichier listé dans `sw.js` existe sur disque.
- Vérification syntaxique (`node --check`) des fichiers JS modifiés.

Non testés (à vérifier manuellement) :
- Le comportement réel hors ligne après un déploiement (coupure réseau
  physique, plusieurs appareils).
- Le remplacement effectif du service worker sur un appareil ayant déjà
  V27 installé (le mécanisme est en place et cohérent, mais pas observé
  en conditions réelles).
- Le rendu sur d'autres tailles d'écran que 390×844.

## Tester en local

Comme le service worker et les `fetch()` exigent un serveur (pas juste
ouvrir le fichier HTML directement), il faut un petit serveur local.
Dans Termux :

```bash
cd jieeplay_web
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080` dans le navigateur du téléphone.

## Déploiement (GitHub Pages)

1. Pousser ce dossier sur GitHub (voir instructions Termux fournies).
2. Sur GitHub : Settings → Pages → Source : Deploy from a branch →
   choisir la branche `main` et le dossier où se trouve ce projet.
3. L'URL publique est générée automatiquement
   (`https://TONNOM.github.io/NOMDUREPO/`).
4. Chaque `git push` met à jour le site automatiquement, aucun build
   n'est nécessaire (contrairement à la version Godot/APK).

## Structure

```
index.html            page unique (single-page-app)
admin.html              panneau admin, séparé (hors PWA joueur)
manifest.json          métadonnées PWA (nom, icônes, couleurs)
sw.js                   service worker (cache + hors ligne + Firebase Messaging, v32)
firestore.rules          règles de sécurité (à coller dans Firebase Console)
css/                    une feuille de style par écran (+ admin.css)
js/
  state.js              état du jeu (équivalent GameData.gd)
  save.js               sauvegarde locale (équivalent SaveManager.gd)
  localization.js        traductions fr/en (équivalent Loc.gd)
  audio.js               sons/musique (équivalent Audio.gd)
  logo.js                 logo animé
  reward-engine.js        moteur éditorial des récompenses (v2)
  firebase-init.js        initialisation Firebase (module ES, via CDN)
  chat.js                 messagerie (Firestore temps réel)
  hub.js                  écran "Univers JieePlay" (multi-jeux)
  onboarding.js / home.js / game.js / reward.js / settings.js /
  journey.js / rewards-list.js / bottom-nav.js   logique par écran
admin.js                 logique du panneau admin (module ES, séparé)
data/                    contenu (mots, catégories, récompenses, traductions, jeux)
assets/                  sons, musiques, icônes
```

## Roadmap restante (non implémentée en V28 — voir cahier des charges)

- Migration avancée des sauvegardes (`save_v1` → `save_v2`) : pas
  nécessaire tant qu'aucun changement de schéma ne l'impose.
- Amélioration éditoriale (diversité des banques de récompenses) :
  piste secondaire, pas traitée dans cette passe.
- Profils multiples, mini-jeux additionnels, architecture de contenu
  distante : hors périmètre V28, mentionnés comme vision à plus long
  terme dans le cahier des charges.
