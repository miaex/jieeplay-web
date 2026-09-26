// firebase-init.js — module ES (chargé avec <script type="module">, seul
// fichier de tout le projet à en avoir besoin, car le SDK Firebase modulaire
// n'existe qu'en modules). Ce projet n'a pas d'étape de build (pas de
// npm/bundler), donc le SDK est chargé directement depuis le CDN officiel
// de Google plutôt qu'installé en dépendance.
//
// Tous les autres fichiers (chat.js, admin.js) restent des scripts
// classiques : ce module expose ce dont ils ont besoin sur `window.Fb`,
// et prévient de sa disponibilité via l'évènement "firebase-ready" (et
// "firebase-messaging-ready" séparément, car la messagerie push n'est pas
// supportée partout — Safari iOS hors PWA installée, par exemple).

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
	getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
	query, orderBy, setDoc, serverTimestamp, getDoc,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

// Clé publique côté client — voir README section "Messagerie" : une clé
// apiKey Firebase n'est pas un secret, la sécurité réelle est assurée par
// les règles Firestore (firestore.rules), pas en cachant cette valeur.
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
const db = getFirestore(app);
const auth = getAuth(app);

window.Fb = {
	db, auth,
	fns: { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, setDoc, serverTimestamp, getDoc },
	VAPID_KEY,
	uid: null,
	messaging: null,
};

// Authentification anonyme : donne à chaque appareil un identifiant stable
// et vérifiable côté serveur (persisté par Firebase lui-même — signInAnonymously
// renvoie le MÊME uid aux visites suivantes tant que le stockage du
// navigateur n'est pas effacé). C'est cet identifiant qui sert de clé pour
// la conversation du joueur et que les règles Firestore vérifient.
signInAnonymously(auth).catch((e) => console.error("Firebase: échec de l'authentification anonyme", e));

onAuthStateChanged(auth, (user) => {
	if (!user) return;
	window.Fb.uid = user.uid;
	window.dispatchEvent(new CustomEvent("firebase-ready", { detail: { uid: user.uid } }));
});

// Messagerie push : pas supportée partout (ex. Safari iOS hors installation
// PWA sur l'écran d'accueil) — on vérifie avant d'initialiser quoi que ce soit.
isSupported()
	.then((supported) => {
		if (!supported) return;
		const messaging = getMessaging(app);
		window.Fb.messaging = messaging;
		window.Fb.getToken = getToken;
		window.Fb.onMessage = onMessage;
		window.dispatchEvent(new CustomEvent("firebase-messaging-ready"));
	})
	.catch((e) => console.warn("Firebase Messaging indisponible sur cet appareil/navigateur :", e));
