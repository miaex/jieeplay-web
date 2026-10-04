// Service worker JieePlay
// V37 — correction du cache des requêtes POST + rafraîchissement du cache.
//
// Stratégie : cache-first pour les ressources GET de l'application.
// Les requêtes POST/PUT/PATCH/DELETE ne sont JAMAIS interceptées par
// le système de cache.

// ============================================================
// FIREBASE CLOUD MESSAGING
// ============================================================

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

// ============================================================
// NOTIFICATIONS PUSH — FIREBASE MESSAGING
// ============================================================
//
// Le relais Apps Script envoie des messages FCM "data-only".
// Le service worker affiche lui-même la notification afin d'éviter
// les doublons.

// eslint-disable-next-line no-unused-vars
try {
	const messaging = firebase.messaging();

	messaging.onBackgroundMessage((payload) => {
		const d = payload.data || {};

		const title =
			d.title ||
			(payload.notification && payload.notification.title) ||
			"Tonton Jiee";

		const body =
			d.body ||
			(payload.notification && payload.notification.body) ||
			"";

		self.registration.showNotification(title, {
			body,
			icon: "./assets/icons/icon-192.png",
			badge: "./assets/icons/icon-192.png",
			tag: d.tag || "jieeplay-chat",
			renotify: true,
			data: {
				url: d.url || "./?open=chat",
			},
		});
	});
} catch (e) {
	console.warn("SW: Firebase Messaging indisponible", e);
}

// ============================================================
// CLIC SUR UNE NOTIFICATION
// ============================================================

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const target = new URL(
		(event.notification.data && event.notification.data.url) ||
			"./?open=chat",
		self.registration.scope
	).href;

	event.waitUntil(
		self.clients
			.matchAll({
				type: "window",
				includeUncontrolled: true,
			})
			.then((list) => {
				for (const client of list) {
					if (
						client.url.startsWith(self.registration.scope) &&
						"focus" in client
					) {
						client.postMessage({
							type: "open-chat",
						});

						return client.focus();
					}
				}

				return self.clients.openWindow(target);
			})
	);
});

// ============================================================
// CACHE
// ============================================================

const CACHE_NAME = "jieeplay-v37";

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
	"./css/chat-ui.css",
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
	"./js/chat-ui.js",
	"./js/push-config.js",
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

// ============================================================
// INSTALL
// ============================================================

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			const results = await Promise.allSettled(
				ASSETS_TO_CACHE.map((url) => cache.add(url))
			);

			results.forEach((result, index) => {
				if (result.status === "rejected") {
					console.warn(
						"SW: échec de mise en cache pour",
						ASSETS_TO_CACHE[index],
						result.reason
					);
				}
			});
		})
	);

	self.skipWaiting();
});

// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => self.clients.claim())
	);
});

// ============================================================
// FETCH
// ============================================================
//
// IMPORTANT : uniquement les requêtes GET sont prises en charge.
//
// Une requête POST comme celle utilisée par Firebase Messaging,
// Firestore ou notre relais Apps Script doit passer directement au
// réseau. Elle ne doit jamais être envoyée à Cache.put().
//
// C'était la source de :
// "Failed to execute 'put' on 'Cache':
//  Request method 'POST' is unsupported"

// eslint-disable-next-line no-restricted-globals
self.addEventListener("fetch", (event) => {
	const request = event.request;

	// ----------------------------------------------------------
	// 1. Ne jamais intercepter les requêtes qui ne sont pas GET.
	// ----------------------------------------------------------

	if (request.method !== "GET") {
		return;
	}

	// ----------------------------------------------------------
	// 2. Navigation : réseau d'abord, cache en secours.
	// ----------------------------------------------------------

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(() =>
				caches
					.match("./index.html")
					.then((cached) => cached || caches.match("./"))
			)
		);

		return;
	}

	// ----------------------------------------------------------
	// 3. Ressources GET : cache-first.
	// ----------------------------------------------------------

	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) {
				return cached;
			}

			return fetch(request)
				.then((response) => {
					if (
						response &&
						response.ok &&
						request.method === "GET"
					) {
						const clone = response.clone();

						caches
							.open(CACHE_NAME)
							.then((cache) => cache.put(request, clone))
							.catch((error) => {
								console.warn(
									"SW: impossible de mettre en cache",
									request.url,
									error
								);
							});
					}

					return response;
				})
				.catch(() => cached);
		})
	);
});
