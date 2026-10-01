// firebase-init.js — module ES (seul fichier de l'app joueur à en avoir besoin :
// le SDK Firebase modulaire n'existe qu'en modules ; pas de bundler ici, donc
// chargé depuis le CDN officiel de Google).
//
// Les autres fichiers (chat.js…) restent des scripts classiques : ce module
// expose ce dont ils ont besoin sur `window.Fb` et prévient via l'évènement
// "firebase-ready" (identité prête) et "firebase-messaging-ready" (push).

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
	getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
	collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit,
	setDoc, serverTimestamp, getDoc, increment, Timestamp,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

// La clé apiKey Firebase n'est pas un secret : la vraie protection, ce sont
// les règles Firestore (firestore.rules).
const firebaseConfig = {
	apiKey: "AIzaSyCB_3NTZw4VKuYVtVNZuQF-7_dsqUol2VU",
	authDomain: "jieeplay-chat.firebaseapp.com",
	projectId: "jieeplay-chat",
	storageBucket: "jieeplay-chat.firebasestorage.app",
	messagingSenderId: "27387223575",
	appId: "1:27387223575:web:9c54f554d10635fbbcc652",
};
const VAPID_KEY = "BIKRIB42k6fIi3KSU896QL1zcNL8aabKwqYmKPrrxcTzICbham3Z2KAN78m_9arZn54APVHNyTVp_dvztN_uMow";

const app = initializeApp(firebaseConfig);

// Cache local persistant : la conversation s'affiche instantanément au
// lancement, et un message écrit sans réseau est conservé puis envoyé à la
// reconnexion (même si l'app a été fermée entre-temps). Si le navigateur ne
// le supporte pas (mode privé…), on retombe sur le mode standard.
let db;
try {
	db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
	db = getFirestore(app);
}
const auth = getAuth(app);

window.Fb = {
	db, auth,
	fns: { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, setDoc, serverTimestamp, getDoc, increment, Timestamp },
	VAPID_KEY,
	uid: null,
	messaging: null,
	getIdToken: () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)),
	/** Prévient le relais push (si configuré) qu'un message vient d'être envoyé. */
	async notifyPush(payload) {
		const url = window.JIEE_PUSH_RELAY_URL;
		if (!url) return;
		try {
			const idToken = await window.Fb.getIdToken();
			if (!idToken) return;
			fetch(url, {
				method: "POST", mode: "no-cors", keepalive: true,
				headers: { "Content-Type": "text/plain;charset=utf-8" },
				body: JSON.stringify({ idToken, ...payload }),
			}).catch(() => {});
		} catch (e) { /* le push est un bonus : ne jamais bloquer l'envoi */ }
	},
};

// Authentification anonyme : un identifiant stable et vérifiable par appareil
// (Firebase le conserve tant que les données du navigateur ne sont pas effacées).
signInAnonymously(auth).catch((e) => console.error("Firebase: échec de l'authentification anonyme", e));

onAuthStateChanged(auth, (user) => {
	if (!user) return;
	window.Fb.uid = user.uid;
	window.dispatchEvent(new CustomEvent("firebase-ready", { detail: { uid: user.uid } }));
});

isSupported()
	.then((supported) => {
		if (!supported) return;
		window.Fb.messaging = getMessaging(app);
		window.Fb.getToken = getToken;
		window.Fb.onMessage = onMessage;
		window.dispatchEvent(new CustomEvent("firebase-messaging-ready"));
	})
	.catch((e) => console.warn("Firebase Messaging indisponible :", e));
