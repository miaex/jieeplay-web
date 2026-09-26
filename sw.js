// Service worker JieePlay
// Stratégie : cache-first pour tout le contenu de l'app (§4, §26 du cahier
// des charges). Incrémenter CACHE_NAME à chaque mise à jour du contenu
// pour forcer le rafraîchissement du cache chez les joueurs.

// V32 — Notifications push (Firebase Cloud Messaging). Plutôt que
// d'enregistrer un second service worker séparé (firebase-messaging-sw.js,
// l'approche par défaut suggérée par Firebase), on fusionne la messagerie
// DANS ce service worker existant via importScripts — c'est l'approche
// officiellement recommandée par Firebase pour une app qui a déjà son
// propre service worker, et ça évite tout conflit de scope entre deux SW
// enregistrés à la racine. Le SDK "compat" est utilisé ici volontairement
// (pas le SDK modulaire utilisé ailleurs) : c'est le seul qui fonctionne
// simplement via importScripts dans un service worker classique.
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
	apiKey: "AIzaSyCB_3NTZw4VKuYVtVNZuQF-7_dsqUol2VU",
	authDomain: "jieeplay-chat.firebaseapp.com",
	projectId: "jieeplay-chat",
	storageBucket: "jieeplay-chat.firebasestorage.app",
	messagingSenderId: "27387223575",
	appId: "1:27387223575:web:9c54f554d10635fbbcc652",
});

// Gère les messages reçus quand l'app n'est pas au premier plan : le SDK
// compat s'en charge automatiquement, mais on personnalise l'icône pour
// rester cohérent avec l'identité visuelle de l'app.
try {
	const messaging = firebase.messaging();
	messaging.onBackgroundMessage((payload) => {
		const title = (payload.notification && payload.notification.title) || "Tonton Jiee";
		const body = (payload.notification && payload.notification.body) || "";
		self.registration.showNotification(title, { body, icon: "./assets/icons/icon-192.png" });
	});
} catch (e) {
	// Messagerie indisponible sur ce contexte (ex. navigateur non supporté) —
	// le reste du service worker (cache/offline) continue de fonctionner normalement.
	console.warn("SW: Firebase Messaging indisponible", e);
}

const CACHE_NAME = "jieeplay-v32";

const ASSETS_TO_CACHE = [
	"./",
	"./index.html",
	"./manifest.json",
	"./css/style.css",
	"./css/onboarding.css",
	"./css/home.css",
	"./css/game.css",
	"./css/reward.css",
	"./css/settings.css",
	"./css/journey.css",
	"./css/rewards-list.css",
	"./css/hub.css",
	"./css/chat.css",
	"./css/bottom-nav.css",
	"./js/app.js",
	"./js/nav.js",
	"./js/state.js",
	"./js/reward-engine.js",
	"./js/save.js",
	"./js/localization.js",
	"./js/audio.js",
	"./js/logo.js",
	"./js/avatars.js",
	"./js/onboarding.js",
	"./js/home.js",
	"./js/game.js",
	"./js/reward.js",
	"./js/settings.js",
	"./js/journey.js",
	"./js/rewards-list.js",
	"./js/hub.js",
	"./js/chat.js",
	"./js/firebase-init.js",
	"./js/bottom-nav.js",
	"./js/utils.js",
	"./data/translations-fr.json",
	"./data/translations-en.json",
	"./data/words.json",
	"./data/categories.json",
	"./data/rewards/content.json",
	"./data/home-backgrounds.json",
	"./data/games.json",
	"./assets/icons/icon-192.png",
	"./assets/icons/icon-512.png",
	"./assets/sounds/tile_tap.wav",
	"./assets/sounds/button_click.wav",
	"./assets/sounds/success.wav",
	"./assets/sounds/failure.wav",
	"./assets/sounds/reward.wav",
	"./assets/avatars/bear-rose.png",
	"./assets/avatars/bear-mauve.png",
	"./assets/avatars/bear-caramel.png",
	"./assets/backgrounds/bg-01.jpg",
	"./assets/backgrounds/bg-02.jpg",
	"./assets/backgrounds/bg-03.jpg",
	"./assets/backgrounds/bg-04.jpg",
	"./assets/sounds/confetti.wav",
	"./assets/music/menu_music.ogg",
	"./assets/music/reward_music.ogg",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			// Mise en cache résiliente : un fichier manquant ou en erreur ne doit
			// jamais empêcher la mise en cache de TOUS les autres (contrairement à
			// cache.addAll(), qui échoue intégralement au moindre fichier en échec).
			const results = await Promise.allSettled(
				ASSETS_TO_CACHE.map((url) => cache.add(url))
			);
			results.forEach((r, i) => {
				if (r.status === "rejected") {
					console.warn("SW: échec de mise en cache pour", ASSETS_TO_CACHE[i], r.reason);
				}
			});
		})
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			)
		)
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	// Requêtes de NAVIGATION (chargement de la page elle-même) : toujours
	// retomber sur l'app en cache si hors ligne, peu importe l'URL exacte
	// demandée — c'est ce qui garantit que l'app s'ouvre sans connexion.
	if (event.request.mode === "navigate") {
		event.respondWith(
			fetch(event.request).catch(
				() => caches.match("./index.html").then((r) => r || caches.match("./"))
			)
		);
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cached) => {
			if (cached) return cached;
			return fetch(event.request)
				.then((response) => {
					if (response && response.status === 200) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
					}
					return response;
				})
				.catch(() => cached);
		})
	);
});
