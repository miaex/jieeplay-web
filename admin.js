// admin.js — panneau de messagerie pour Tonton Jiee. Module ES autonome
// (pas partagé avec le reste de l'app joueur), même projet Firebase.
//
// Prérequis côté Firebase (voir README, section "Messagerie — panneau
// admin") : un compte email/mot de passe créé pour toi dans Firebase
// Authentication, et son uid ajouté aux règles Firestore comme identité
// admin. Sans ça, la connexion fonctionnera mais la lecture/écriture des
// conversations sera refusée par les règles de sécurité.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
	getFirestore, collection, doc, addDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
	getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
	apiKey: "AIzaSyCB_3NTZw4VKuYVtVNZuQF-7_dsqUol2VU",
	authDomain: "jieeplay-chat.firebaseapp.com",
	projectId: "jieeplay-chat",
	storageBucket: "jieeplay-chat.firebasestorage.app",
	messagingSenderId: "27387223575",
	appId: "1:27387223575:web:9c54f554d10635fbbcc652",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentConversationId = null;
let unsubscribeMessages = null;
let unsubscribeList = null;

const el = (id) => document.getElementById(id);

el("btn-login").addEventListener("click", async () => {
	el("login-error").classList.add("hidden");
	try {
		await signInWithEmailAndPassword(auth, el("login-email").value.trim(), el("login-password").value);
	} catch (e) {
		el("login-error").textContent = "Connexion refusée — vérifie l'email et le mot de passe.";
		el("login-error").classList.remove("hidden");
	}
});

el("btn-logout").addEventListener("click", () => signOut(auth));

el("btn-back-to-list").addEventListener("click", () => {
	el("conversation-list-panel").classList.remove("hidden-mobile");
	el("conversation-open").classList.add("hidden");
	el("conversation-empty").classList.remove("hidden");
});

el("btn-admin-send").addEventListener("click", sendAdminReply);
el("admin-input").addEventListener("keydown", (e) => {
	if (e.key === "Enter") sendAdminReply();
});

onAuthStateChanged(auth, (user) => {
	if (user) {
		el("login-screen").classList.add("hidden");
		el("admin-screen").classList.remove("hidden");
		listenToConversations();
	} else {
		el("admin-screen").classList.add("hidden");
		el("login-screen").classList.remove("hidden");
		if (unsubscribeList) unsubscribeList();
		if (unsubscribeMessages) unsubscribeMessages();
	}
});

function listenToConversations() {
	const q = query(collection(db, "conversations"), orderBy("lastMessageAt", "desc"));
	unsubscribeList = onSnapshot(q, (snapshot) => {
		const list = el("conversation-list");
		list.innerHTML = "";
		snapshot.docs.forEach((docSnap) => {
			const data = docSnap.data();
			const btn = document.createElement("button");
			btn.className = "conversation-item" + (docSnap.id === currentConversationId ? " active" : "");
			btn.innerHTML = `
				<div class="conversation-item-name">${data.playerName || "Joueur sans nom"}</div>
				<div class="conversation-item-preview">${data.lastMessagePreview || ""}</div>
			`;
			btn.addEventListener("click", () => openConversation(docSnap.id, data.playerName));
			list.appendChild(btn);
		});
	}, (error) => console.error("Admin: échec de chargement des conversations", error));
}

function openConversation(conversationId, playerName) {
	currentConversationId = conversationId;
	el("conversation-empty").classList.add("hidden");
	el("conversation-open").classList.remove("hidden");
	el("conversation-open-name").textContent = playerName || "Joueur sans nom";
	el("conversation-list-panel").classList.add("hidden-mobile");

	if (unsubscribeMessages) unsubscribeMessages();
	const q = query(collection(db, "conversations", conversationId, "messages"), orderBy("timestamp", "asc"));
	unsubscribeMessages = onSnapshot(q, (snapshot) => {
		const container = el("admin-messages");
		container.innerHTML = "";
		snapshot.docs.forEach((docSnap) => {
			const msg = docSnap.data();
			const bubble = document.createElement("div");
			bubble.className = `admin-bubble ${msg.from === "admin" ? "mine" : "theirs"}`;
			let inner = "";
			if (msg.type === "text") inner = `<p></p>`;
			else if (msg.type === "image") inner = `<img src="${msg.content}" alt="" />`;
			else if (msg.type === "audio") inner = `<audio controls src="${msg.content}"></audio>`;
			bubble.innerHTML = `${inner}<span class="admin-bubble-time"></span>`;
			if (msg.type === "text") bubble.querySelector("p").textContent = msg.content;
			const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate() : new Date();
			bubble.querySelector(".admin-bubble-time").textContent = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
			container.appendChild(bubble);
		});
		container.scrollTop = container.scrollHeight;
	}, (error) => console.error("Admin: échec de chargement des messages", error));
}

async function sendAdminReply() {
	const input = el("admin-input");
	const text = input.value.trim();
	if (!text || !currentConversationId) return;
	input.value = "";
	try {
		await addDoc(collection(db, "conversations", currentConversationId, "messages"), {
			from: "admin",
			type: "text",
			content: text,
			timestamp: serverTimestamp(),
		});
		await setDoc(
			doc(db, "conversations", currentConversationId),
			{ lastMessageAt: serverTimestamp(), lastMessagePreview: `Tonton Jiee: ${text.slice(0, 70)}` },
			{ merge: true }
		);
		// TODO (prochaine étape, cf. README) : déclencher ici une notification
		// push vers le joueur via son pushToken. Nécessite une Cloud Function
		// (le client seul ne peut pas envoyer de push à un autre appareil) —
		// pas encore branché dans cette passe.
	} catch (e) {
		console.error("Admin: échec de l'envoi", e);
		alert("Échec de l'envoi — vérifie ta connexion et réessaie.");
	}
}
