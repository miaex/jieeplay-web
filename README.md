# JieePlay — version PWA

Migration de Godot vers une PWA (HTML5/CSS3/JS), conservant tout le
contenu déjà écrit (mots, traductions, textes de récompense, sons).

## Étape actuelle : socle + onboarding + accueil

Ce qui fonctionne dans cette première étape :
- Écran de chargement avec vraie barre de progression
- Onboarding complet (langue → genre → prénom)
- Écran d'accueil (bienvenue + menu, carte "message secret", navigation)
- Sauvegarde locale (localStorage)
- PWA installable, fonctionne hors ligne (service worker)
- Sons et musique (mêmes fichiers que la version Godot)

**Pas encore branché** (prochaine étape) : le jeu d'anagramme, les
100 cartes, les paramètres, le parcours. Les vues existent déjà dans
`index.html` (`#view-game`, `#view-reward`, etc.) mais sont vides.

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
index.html          page unique (single-page-app)
manifest.json        métadonnées PWA (nom, icônes, couleurs)
sw.js                 service worker (cache + hors ligne)
css/                  une feuille de style par écran
js/
  state.js            état du jeu (équivalent GameData.gd)
  save.js             sauvegarde locale (équivalent SaveManager.gd)
  localization.js      traductions fr/en (équivalent Loc.gd)
  audio.js             sons/musique (équivalent Audio.gd)
  logo.js               logo animé
  onboarding.js / home.js / app.js   logique par écran
data/                  contenu (mots, catégories, récompenses, traductions)
assets/                sons, musiques, icônes
```
