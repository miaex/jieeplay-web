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
	getFirestore, collection, doc, addDoc, updateDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
	getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

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

// Enregistré dès le chargement (pas seulement à l'activation des
// notifications) : condition nécessaire pour que Chrome propose
// "Ajouter à l'écran d'accueil" sur cette page.
if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Admin: service worker non enregistré", e));
}

let currentConversationId = null;
let unsubscribeMessages = null;
let unsubscribeList = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;

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

el("btn-admin-send").addEventListener("click", sendAdminText);
el("admin-input").addEventListener("keydown", (e) => {
	if (e.key === "Enter") sendAdminText();
});
el("admin-input").addEventListener("input", (e) => {
	el("btn-admin-send").disabled = e.target.value.trim() === "";
});

el("btn-admin-attach").addEventListener("click", () => {
	el("admin-attach-menu").classList.toggle("hidden");
});
el("btn-admin-camera").addEventListener("click", () => {
	el("admin-attach-menu").classList.add("hidden");
	el("admin-camera-input").click();
});
el("btn-admin-gallery").addEventListener("click", () => {
	el("admin-attach-menu").classList.add("hidden");
	el("admin-gallery-input").click();
});
el("admin-camera-input").addEventListener("change", onImageSelected);
el("admin-gallery-input").addEventListener("change", onImageSelected);
el("btn-admin-mic").addEventListener("click", toggleRecording);
el("btn-admin-notif").addEventListener("click", enablePushNotifications);

onAuthStateChanged(auth, (user) => {
	if (user) {
		el("login-screen").classList.add("hidden");
		el("admin-screen").classList.remove("hidden");
		listenToConversations();
		refreshNotifButton();
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
				<div class="conversation-item-name">${data.playerName || "Joueur sans nom"}${data.unreadFromPlayer ? '<span class="conversation-item-unread"></span>' : ""}</div>
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
		const toMarkRead = [];

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

			// Accusé de lecture (V34) — uniquement affiché sur les messages
			// DE l'admin (c'est le joueur qui les a lus ou non).
			if (msg.from === "admin") {
				const tick = document.createElement("span");
				tick.className = "admin-bubble-tick" + (msg.read === true ? " read" : "");
				tick.textContent = msg.read === true ? "✓✓" : "✓";
				bubble.appendChild(tick);
			}
			if (msg.from === "player" && msg.read !== true) toMarkRead.push(docSnap.id);

			container.appendChild(bubble);
		});
		container.scrollTop = container.scrollHeight;

		// Marque les messages du joueur comme lus dès que la conversation
		// est ouverte à l'écran (miroir de Chat.markAdminMessagesRead côté joueur).
		toMarkRead.forEach((id) => {
			updateDoc(doc(db, "conversations", conversationId, "messages", id), { read: true }).catch((e) =>
				console.warn("Admin: échec du marquage lu", e)
			);
		});
		if (toMarkRead.length > 0) {
			setDoc(doc(db, "conversations", conversationId), { unreadFromPlayer: false }, { merge: true }).catch(() => {});
		}
	}, (error) => console.error("Admin: échec de chargement des messages", error));
}

async function sendAdminText() {
	const input = el("admin-input");
	const text = input.value.trim();
	if (!text || !currentConversationId) return;
	input.value = "";
	el("btn-admin-send").disabled = true;
	await sendAdminMessage("text", text);
}

async function sendAdminMessage(type, content) {
	if (!currentConversationId) return;
	try {
		await addDoc(collection(db, "conversations", currentConversationId, "messages"), {
			from: "admin",
			type,
			content,
			timestamp: serverTimestamp(),
		});
		await setDoc(
			doc(db, "conversations", currentConversationId),
			{
				lastMessageAt: serverTimestamp(),
				lastMessagePreview: type === "text" ? `Tonton Jiee: ${content.slice(0, 70)}` : `Tonton Jiee: [${type}]`,
			},
			{ merge: true }
		);
		// TODO (prochaine étape, cf. README) : déclencher ici une notification
		// push vers le joueur via son pushToken. Nécessite une Cloud Function
		// (le client seul ne peut pas envoyer de push à un autre appareil).
	} catch (e) {
		console.error("Admin: échec de l'envoi", e);
		alert("Échec de l'envoi — vérifie ta connexion et réessaie.");
	}
}

function onImageSelected(e) {
	const file = e.target.files && e.target.files[0];
	e.target.value = "";
	if (!file) return;
	compressImage(file, (dataUrl) => sendAdminMessage("image", dataUrl));
}

function compressImage(file, callback) {
	const reader = new FileReader();
	reader.onload = () => {
		const img = new Image();
		img.onload = () => {
			const maxSize = 1000;
			let width = img.width;
			let height = img.height;
			if (width > height && width > maxSize) { height *= maxSize / width; width = maxSize; }
			else if (height > maxSize) { width *= maxSize / height; height = maxSize; }
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			canvas.getContext("2d").drawImage(img, 0, 0, width, height);
			callback(canvas.toDataURL("image/jpeg", 0.72));
		};
		img.src = reader.result;
	};
	reader.readAsDataURL(file);
}

async function toggleRecording() {
	const micBtn = el("btn-admin-mic");
	if (mediaRecorder && mediaRecorder.state === "recording") {
		mediaRecorder.stop();
		return;
	}
	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
		alert("Les messages audio ne sont pas pris en charge sur ce navigateur.");
		return;
	}
	try {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		recordedChunks = [];
		mediaRecorder = new MediaRecorder(stream);
		mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
		mediaRecorder.onstop = () => {
			stream.getTracks().forEach((t) => t.stop());
			micBtn.classList.remove("recording");
			clearInterval(recordingTimer);
			el("admin-recording-indicator").classList.add("hidden");
			const blob = new Blob(recordedChunks, { type: "audio/webm" });
			if (blob.size === 0) return;
			if (blob.size > 900 * 1024) {
				alert("Ce message est trop long pour être envoyé. Essaie un message plus court.");
				return;
			}
			const reader = new FileReader();
			reader.onload = () => sendAdminMessage("audio", reader.result);
			reader.readAsDataURL(blob);
		};
		mediaRecorder.start();
		micBtn.classList.add("recording");
		const start = Date.now();
		const indicator = el("admin-recording-indicator");
		indicator.classList.remove("hidden");
		recordingTimer = setInterval(() => {
			const secs = Math.floor((Date.now() - start) / 1000);
			indicator.textContent = `Enregistrement ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
			if (secs >= 45) mediaRecorder.stop();
		}, 500);
	} catch (e) {
		alert("L'accès au micro a été refusé.");
	}
}

// ---------------- Notifications push (admin) ----------------

let messagingInstance = null;

async function refreshNotifButton() {
	const btn = el("btn-admin-notif");
	const supported = "Notification" in window && (await isSupported().catch(() => false));
	if (!supported) {
		btn.classList.add("hidden");
		return;
	}
	btn.classList.remove("hidden");
	btn.classList.toggle("active", Notification.permission === "granted");
}

async function enablePushNotifications() {
	try {
		const supported = await isSupported().catch(() => false);
		if (!supported) {
			alert("Les notifications push ne sont pas prises en charge sur ce navigateur.");
			return;
		}
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return;

		const registration = await navigator.serviceWorker.ready;

		if (!messagingInstance) messagingInstance = getMessaging(app);
		const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
		if (!token) return;

		await setDoc(doc(db, "admin", "config"), { pushToken: token, updatedAt: serverTimestamp() }, { merge: true });

		onMessage(messagingInstance, (payload) => {
			if (payload.notification) {
				new Notification(payload.notification.title || "Nouveau message", { body: payload.notification.body || "" });
			}
		});

		refreshNotifButton();
	} catch (e) {
		console.error("Admin: activation des notifications échouée", e);
	}
}
