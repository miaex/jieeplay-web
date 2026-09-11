// Service worker JieePlay
// Stratégie : cache-first pour tout le contenu de l'app (§4, §26 du cahier
// des charges). Le numéro de CACHE_NAME doit être incrémenté à chaque
// mise à jour du contenu pour forcer le rafraîchissement du cache.

const CACHE_NAME = "jieeplay-v1";

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
	"./js/app.js",
	"./js/state.js",
	"./js/save.js",
	"./js/localization.js",
	"./js/audio.js",
	"./js/logo.js",
	"./js/onboarding.js",
	"./js/home.js",
	"./js/game.js",
	"./js/rewards.js",
	"./js/settings.js",
	"./js/utils.js",
	"./data/translations-fr.json",
	"./data/translations-en.json",
	"./data/words.json",
	"./data/categories.json",
	"./data/rewards.json",
	"./assets/icons/icon-192.png",
	"./assets/icons/icon-512.png",
	"./assets/sounds/tile_tap.wav",
	"./assets/sounds/button_click.wav",
	"./assets/sounds/success.wav",
	"./assets/sounds/failure.wav",
	"./assets/sounds/reward.wav",
	"./assets/music/menu_music.ogg",
	"./assets/music/reward_music.ogg",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
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
	event.respondWith(
		caches.match(event.request).then((cached) => {
			if (cached) return cached;
			return fetch(event.request).then((response) => {
				// Met en cache les nouvelles ressources récupérées avec succès.
				if (response && response.status === 200) {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
				}
				return response;
			}).catch(() => cached);
		})
	);
});
