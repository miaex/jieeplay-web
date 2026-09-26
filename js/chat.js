// chat.js — Messagerie "Tonton Jiee", connectée à Firestore (V32).
//
// Architecture : voir js/firebase-init.js pour l'initialisation Firebase.
// Chaque joueur a un uid Firebase stable (authentification anonyme) —
// State.profile.playerId. Sa conversation vit dans Firestore à :
//   conversations/{playerId}                → métadonnées (nom, dernier message, token push)
//   conversations/{playerId}/messages/{id}   → chaque message
//
// Ce fichier reste un script classique (pas un module) : il consomme
// Firebase via window.Fb, posé par firebase-init.js (module ES, seul
// fichier du projet à en avoir besoin — voir ce fichier pour pourquoi).
// Tant que window.Fb.uid n'est pas prêt, ChatBackend met les actions en
// attente au lieu d'échouer silencieusement.

const ChatBackend = {
	HIDDEN_KEY: "jieeplay_chat_hidden_v1",
	unsubscribe: null,

	/** Liste locale des messages que CE joueur a choisi de masquer pour lui
	 * seul (contrairement à une suppression "pour tout le monde", qui
	 * modifie le document partagé). Un choix purement local — jamais
	 * synchronisé — puisque Firestore ne connaît qu'un seul document par
	 * message, partagé entre le joueur et Tonton Jiee. */
	loadHidden() {
		try {
			return new Set(JSON.parse(localStorage.getItem(this.HIDDEN_KEY) || "[]"));
		} catch (e) {
			return new Set();
		}
	},
	hideForMe(messageId) {
		const hidden = this.loadHidden();
		hidden.add(messageId);
		localStorage.setItem(this.HIDDEN_KEY, JSON.stringify([...hidden]));
	},

	/** S'abonne aux messages de la conversation du joueur courant. Appelle
	 * `onChange(messages)` à chaque mise à jour (envoi, suppression, ou
	 * réponse de Tonton Jiee — en temps réel, sans recharger). */
	subscribe(onChange) {
		if (!window.Fb || !window.Fb.uid) return;
		if (this.unsubscribe) this.unsubscribe();

		const { db, fns, uid } = window.Fb;
		const messagesRef = fns.collection(db, "conversations", uid, "messages");
		const q = fns.query(messagesRef, fns.orderBy("timestamp", "asc"));

		this.unsubscribe = fns.onSnapshot(
			q,
			(snapshot) => {
				const hidden = this.loadHidden();
				const messages = snapshot.docs
					.map((d) => ({ id: d.id, ...d.data() }))
					.filter((m) => !hidden.has(m.id));
				onChange(messages);
			},
			(error) => console.error("Chat: erreur de synchronisation Firestore", error)
		);
	},

	async ensureConversationDoc() {
		const { db, fns, uid } = window.Fb;
		await fns.setDoc(
			fns.doc(db, "conversations", uid),
			{ playerName: State.profile.playerName || "", language: State.profile.language || "fr" },
			{ merge: true }
		);
	},

	async send(type, content) {
		if (!window.Fb || !window.Fb.uid) {
			console.warn("Chat: identité pas encore prête, message non envoyé");
			return;
		}
		const { db, fns, uid } = window.Fb;
		await this.ensureConversationDoc();
		await fns.addDoc(fns.collection(db, "conversations", uid, "messages"), {
			from: "player",
			type,
			content,
			timestamp: fns.serverTimestamp(),
		});
		await fns.setDoc(
			fns.doc(db, "conversations", uid),
			{
				lastMessageAt: fns.serverTimestamp(),
				lastMessagePreview: type === "text" ? content.slice(0, 80) : `[${type}]`,
			},
			{ merge: true }
		);
	},

	/** Supprime pour tout le monde : modifie le document partagé — le
	 * message disparaît aussi bien chez le joueur que dans l'espace de
	 * Tonton Jiee. Autorisé uniquement sur ses propres messages (voir
	 * firestore.rules). */
	async deleteForEveryone(messageId) {
		const { db, fns, uid } = window.Fb;
		await fns.deleteDoc(fns.doc(db, "conversations", uid, "messages", messageId));
	},
};

const Chat = {
	mediaRecorder: null,
	recordedChunks: [],
	recordingTimer: null,
	currentMessages: [],
	pendingDeleteId: null,

	init() {
		document.getElementById("btn-chat-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});

		document.getElementById("chat-input").addEventListener("input", (e) => {
			document.getElementById("btn-chat-send").disabled = e.target.value.trim() === "";
		});
		document.getElementById("chat-input").addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.sendText();
			}
		});
		document.getElementById("btn-chat-send").addEventListener("click", () => this.sendText());

		document.getElementById("btn-chat-attach").addEventListener("click", () => this.toggleAttachMenu());
		document.getElementById("btn-chat-camera").addEventListener("click", () => {
			this.toggleAttachMenu(false);
			document.getElementById("chat-camera-input").click();
		});
		document.getElementById("btn-chat-gallery").addEventListener("click", () => {
			this.toggleAttachMenu(false);
			document.getElementById("chat-gallery-input").click();
		});
		document.getElementById("chat-camera-input").addEventListener("change", (e) => this.onImageSelected(e));
		document.getElementById("chat-gallery-input").addEventListener("change", (e) => this.onImageSelected(e));

		document.getElementById("btn-chat-mic").addEventListener("click", () => {
			this.toggleAttachMenu(false);
			this.toggleRecording();
		});

		document.getElementById("btn-chat-notif").addEventListener("click", () => this.enablePushNotifications());

		document.getElementById("chat-message-menu-hide").addEventListener("click", () => this.confirmDelete("me"));
		document.getElementById("chat-message-menu-everyone").addEventListener("click", () => this.confirmDelete("everyone"));
		document.getElementById("chat-message-menu-cancel").addEventListener("click", () => this.closeMessageMenu());
		document.getElementById("chat-message-menu-overlay").addEventListener("click", (e) => {
			if (e.target.id === "chat-message-menu-overlay") this.closeMessageMenu();
		});

		window.addEventListener("firebase-ready", () => {
			if (Nav.current === "chat") this.subscribeToMessages();
		});
	},

	show() {
		document.getElementById("chat-eyebrow").textContent = Loc.t("chat_eyebrow");
		document.getElementById("chat-title").textContent = Loc.t("chat_title");
		document.getElementById("chat-input").placeholder = Loc.t("chat_input_placeholder");
		document.getElementById("btn-chat-camera").querySelector("span").textContent = Loc.t("chat_attach_camera");
		document.getElementById("btn-chat-gallery").querySelector("span").textContent = Loc.t("chat_attach_gallery");
		document.getElementById("chat-message-menu-hide").textContent = Loc.t("chat_delete_for_me");
		document.getElementById("chat-message-menu-everyone").textContent = Loc.t("chat_delete_for_everyone");
		document.getElementById("chat-message-menu-cancel").textContent = Loc.t("chat_cancel");

		this.refreshNotifButton();

		if (window.Fb && window.Fb.uid) {
			this.subscribeToMessages();
		} else {
			this.renderConnecting();
		}
	},

	subscribeToMessages() {
		ChatBackend.subscribe((messages) => {
			this.currentMessages = messages;
			this.render(messages);
		});
	},

	renderConnecting() {
		const list = document.getElementById("chat-messages");
		list.innerHTML = `<div class="chat-connecting">${Loc.t("chat_connecting")}</div>`;
	},

	render(messages) {
		const list = document.getElementById("chat-messages");
		list.innerHTML = "";

		const intro = document.createElement("div");
		intro.className = "chat-bubble theirs";
		intro.innerHTML = `<p class="chat-bubble-text"></p>`;
		intro.querySelector(".chat-bubble-text").textContent = Loc.t("chat_intro_text");
		list.appendChild(intro);

		messages.forEach((msg) => {
			const bubble = document.createElement("div");
			bubble.className = `chat-bubble ${msg.from === "player" ? "mine" : "theirs"}`;
			bubble.dataset.id = msg.id;

			let inner = "";
			if (msg.type === "text") inner = `<p class="chat-bubble-text"></p>`;
			else if (msg.type === "image") inner = `<img class="chat-bubble-image" src="${msg.content}" alt="" />`;
			else if (msg.type === "audio") inner = `<audio class="chat-bubble-audio" controls src="${msg.content}"></audio>`;

			bubble.innerHTML = `${inner}<span class="chat-bubble-time"></span>`;
			if (msg.type === "text") bubble.querySelector(".chat-bubble-text").textContent = msg.content;

			const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate() : new Date();
			bubble.querySelector(".chat-bubble-time").textContent = time.toLocaleTimeString(
				State.profile.language === "en" ? "en-US" : "fr-FR",
				{ hour: "2-digit", minute: "2-digit" }
			);

			if (msg.from === "player") {
				let pressTimer;
				bubble.addEventListener("touchstart", () => { pressTimer = setTimeout(() => this.openMessageMenu(msg.id), 450); });
				bubble.addEventListener("touchend", () => clearTimeout(pressTimer));
				bubble.addEventListener("contextmenu", (e) => { e.preventDefault(); this.openMessageMenu(msg.id); });
			}

			list.appendChild(bubble);
		});

		list.scrollTop = list.scrollHeight;
	},

	openMessageMenu(messageId) {
		Audio_.playClick();
		this.pendingDeleteId = messageId;
		document.getElementById("chat-message-menu-overlay").classList.remove("hidden");
	},
	closeMessageMenu() {
		document.getElementById("chat-message-menu-overlay").classList.add("hidden");
		this.pendingDeleteId = null;
	},
	async confirmDelete(scope) {
		const id = this.pendingDeleteId;
		this.closeMessageMenu();
		if (!id) return;
		Audio_.playClick();
		if (scope === "me") {
			ChatBackend.hideForMe(id);
			this.render(this.currentMessages.filter((m) => m.id !== id));
		} else {
			try {
				await ChatBackend.deleteForEveryone(id);
			} catch (e) {
				console.error("Chat: échec de la suppression", e);
			}
		}
	},

	sendText() {
		const input = document.getElementById("chat-input");
		const text = input.value.trim();
		if (!text) return;
		Audio_.playClick();
		input.value = "";
		document.getElementById("btn-chat-send").disabled = true;
		ChatBackend.send("text", text).catch((e) => console.error("Chat: envoi échoué", e));
	},

	toggleAttachMenu(forceState) {
		const menu = document.getElementById("chat-attach-menu");
		const shouldShow = forceState !== undefined ? forceState : menu.classList.contains("hidden");
		menu.classList.toggle("hidden", !shouldShow);
	},

	onImageSelected(e) {
		const file = e.target.files && e.target.files[0];
		e.target.value = "";
		if (!file) return;
		this.compressImage(file, (dataUrl) => {
			ChatBackend.send("image", dataUrl).catch((err) => console.error("Chat: envoi image échoué", err));
		});
	},

	/** Redimensionne/compresse côté client avant envoi — indispensable en
	 * "option A" (pas de Cloud Storage) puisque chaque message vit dans un
	 * document Firestore, plafonné à 1 Mo. Une photo de galerie fait
	 * souvent plusieurs Mo non compressée. */
	compressImage(file, callback) {
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
	},

	async toggleRecording() {
		const micBtn = document.getElementById("btn-chat-mic");
		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			this.mediaRecorder.stop();
			return;
		}
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			alert(Loc.t("chat_audio_unsupported"));
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.recordedChunks = [];
			this.mediaRecorder = new MediaRecorder(stream);
			this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
			this.mediaRecorder.onstop = () => {
				stream.getTracks().forEach((t) => t.stop());
				micBtn.classList.remove("recording");
				clearInterval(this.recordingTimer);
				document.getElementById("chat-recording-indicator").classList.add("hidden");

				const blob = new Blob(this.recordedChunks, { type: "audio/webm" });
				if (blob.size === 0) return;
				if (blob.size > 900 * 1024) {
					alert(Loc.t("chat_audio_too_long"));
					return;
				}
				const reader = new FileReader();
				reader.onload = () => {
					ChatBackend.send("audio", reader.result).catch((e) => console.error("Chat: envoi audio échoué", e));
				};
				reader.readAsDataURL(blob);
			};

			this.mediaRecorder.start();
			micBtn.classList.add("recording");
			const start = Date.now();
			const indicator = document.getElementById("chat-recording-indicator");
			indicator.classList.remove("hidden");
			this.recordingTimer = setInterval(() => {
				const secs = Math.floor((Date.now() - start) / 1000);
				indicator.textContent = `${Loc.t("chat_recording")} ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
				if (secs >= 45) this.mediaRecorder.stop(); // reste sous la limite de taille Firestore (option A)
			}, 500);
		} catch (e) {
			alert(Loc.t("chat_audio_permission_denied"));
		}
	},

	// ---------------- Notifications push ----------------

	refreshNotifButton() {
		const btn = document.getElementById("btn-chat-notif");
		const supported = "Notification" in window && window.Fb && window.Fb.messaging;
		if (!supported) {
			btn.classList.add("hidden");
			return;
		}
		btn.classList.remove("hidden");
		btn.classList.toggle("active", Notification.permission === "granted");
	},

	async enablePushNotifications() {
		Audio_.playClick();
		if (!window.Fb || !window.Fb.messaging) {
			alert(Loc.t("chat_audio_unsupported"));
			return;
		}
		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") return;

			const registration = await navigator.serviceWorker.ready;
			const token = await window.Fb.getToken(window.Fb.messaging, {
				vapidKey: window.Fb.VAPID_KEY,
				serviceWorkerRegistration: registration,
			});
			if (!token) return;

			const { db, fns, uid } = window.Fb;
			await fns.setDoc(fns.doc(db, "conversations", uid), { pushToken: token }, { merge: true });

			window.Fb.onMessage(window.Fb.messaging, (payload) => {
				// Message reçu pendant que l'appli est ouverte au premier plan :
				// les notifications système ne se déclenchent pas toutes seules
				// dans ce cas, donc on la simule si le joueur n'est pas déjà
				// en train de regarder la conversation.
				if (Nav.current !== "chat" && payload.notification) {
					new Notification(payload.notification.title || "Tonton Jiee", { body: payload.notification.body || "" });
				}
			});

			this.refreshNotifButton();
		} catch (e) {
			console.error("Chat: activation des notifications échouée", e);
		}
	},
};
