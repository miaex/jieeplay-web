// chat.js — messagerie "Tonton Jiee" côté joueur (V35).
//
// L'interface (bulles, saisie, vocal, suppression…) vient de js/chat-ui.js,
// partagée avec le panneau admin. Ce fichier ne s'occupe que des DONNÉES :
//   conversations/{playerId}                 → état de la conversation
//   conversations/{playerId}/messages/{id}   → messages
//
// Accusés (façon WhatsApp) : plutôt qu'écrire un champ "lu" sur chaque
// message, chaque camp enregistre un "filigrane" sur la conversation
// (playerReadAt / playerDeliveredAt, adminReadAt / adminDeliveredAt). Un
// message est "lu" si son horodatage est ≤ au filigrane de l'autre camp.
// Beaucoup moins d'écritures, et impossible d'avoir un état incohérent.

const CHAT_RETENTION_DAYS = 60; // durée de conservation (voir README, "Nettoyage")
const tsMs = (ts) => (!ts ? 0 : ts.toMillis ? ts.toMillis() : ts.toDate ? ts.toDate().getTime() : Number(ts) || 0);

const HDR = {
	fr: { typing: "écrit…", online: "en ligne", seen: "vu à {t}", seenDay: "vu {d}", offline: "En attente de connexion…", connecting: "Connexion à ta conversation…", title: "Tonton Jiee" },
	en: { typing: "typing…", online: "online", seen: "last seen {t}", seenDay: "last seen {d}", offline: "Waiting for connection…", connecting: "Connecting to your conversation…", title: "Tonton Jiee" },
};
const hdr = (k, p) => {
	let s = (HDR[State.profile.language === "en" ? "en" : "fr"] || HDR.fr)[k] || "";
	Object.keys(p || {}).forEach((x) => { s = s.replace(`{${x}}`, p[x]); });
	return s;
};

const ChatStore = {
	HIDDEN_KEY: "jieeplay_chat_hidden_v1",
	conv: null, hasConv: false, messages: [],
	convUnsub: null, presUnsub: null, msgsUnsub: null, hbTimer: null,
	lastAckMs: 0, readInFlight: false,
	adminTypingVal: null, adminTypingUntil: 0,
	presVal: null, presSeenLocal: 0, presTs: 0,
	onChange: null,

	loadHidden() {
		try { return new Set(JSON.parse(localStorage.getItem(this.HIDDEN_KEY) || "[]")); } catch (e) { return new Set(); }
	},
	hideForMe(id) {
		const s = this.loadHidden(); s.add(id);
		localStorage.setItem(this.HIDDEN_KEY, JSON.stringify([...s]));
	},

	convRef() { const { db, fns, uid } = window.Fb; return fns.doc(db, "conversations", uid); },
	expireAt() { return window.Fb.fns.Timestamp.fromDate(new Date(Date.now() + CHAT_RETENTION_DAYS * 86400000)); },
	emit() { if (this.onChange) this.onChange(); },

	start() {
		if (!window.Fb || !window.Fb.uid || this.convUnsub) return;
		const { db, fns } = window.Fb;
		this.convUnsub = fns.onSnapshot(this.convRef(), (snap) => {
			this.hasConv = snap.exists();
			this.conv = this.hasConv ? snap.data({ serverTimestamps: "estimate" }) : null;
			this.trackTyping();
			this.ackDelivered();
			ChatBadge.render();
			this.emit();
			if (this.hasConv && !this.hbTimer) this.startHeartbeat();
		}, (e) => console.error("Chat: conversation", e));

		this.presUnsub = fns.onSnapshot(fns.doc(db, "admin", "presence"), (snap) => {
			const d = snap.exists() ? snap.data({ serverTimestamps: "estimate" }) : null;
			const v = d ? tsMs(d.lastActiveAt) : 0;
			this.presTs = v;
			if (this.presVal === null) { this.presSeenLocal = Date.now() - Math.max(0, Date.now() - v) ; }
			else if (v !== this.presVal) this.presSeenLocal = Date.now();
			this.presVal = v;
			this.emit();
		}, () => {});
	},

	startMessages() {
		if (!window.Fb || !window.Fb.uid || this.msgsUnsub) return;
		const { db, fns, uid } = window.Fb;
		const q = fns.query(fns.collection(db, "conversations", uid, "messages"), fns.orderBy("timestamp", "desc"), fns.limit(150));
		this.msgsUnsub = fns.onSnapshot(q, (snap) => {
			this.messages = snap.docs
				.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }), pending: d.metadata.hasPendingWrites }))
				.reverse();
			this.emit();
		}, (e) => console.error("Chat: messages", e));
	},

	trackTyping() {
		const v = this.conv ? this.conv.adminTypingAt || 0 : 0;
		if (this.typingInit) {
			if (!v) this.adminTypingUntil = 0;
			else if (v !== this.adminTypingVal) this.adminTypingUntil = Date.now() + 5000;
		} else {
			this.typingInit = true;
			if (v && Date.now() - v < 6000) this.adminTypingUntil = Date.now() + 5000;
		}
		this.adminTypingVal = v;
	},
	adminTyping() { return Date.now() < this.adminTypingUntil; },
	adminOnline() {
		if (!this.presTs) return false;
		return Date.now() - this.presSeenLocal < 200000;
	},

	ackDelivered() {
		const c = this.conv;
		if (!c || c.lastMessageFrom !== "admin") return;
		const last = tsMs(c.lastMessageAt);
		if (!last || last === this.lastAckMs || last <= tsMs(c.playerDeliveredAt)) return;
		this.lastAckMs = last;
		window.Fb.fns.updateDoc(this.convRef(), { playerDeliveredAt: window.Fb.fns.serverTimestamp() }).catch(() => {});
	},

	async markRead() {
		if (!this.hasConv || this.readInFlight) return;
		const c = this.conv || {};
		const lastAdmin = tsMs(c.lastMessageAt);
		if (c.lastMessageFrom !== "admin" && !(c.unreadForPlayer > 0)) return;
		if (lastAdmin && lastAdmin <= tsMs(c.playerReadAt) && !(c.unreadForPlayer > 0)) return;
		this.readInFlight = true;
		try {
			await window.Fb.fns.updateDoc(this.convRef(), { playerReadAt: window.Fb.fns.serverTimestamp(), playerDeliveredAt: window.Fb.fns.serverTimestamp(), unreadForPlayer: 0 });
		} catch (e) { /* réessaiera au prochain changement */ }
		this.readInFlight = false;
	},

	startHeartbeat() {
		const beat = () => {
			if (!this.hasConv || document.visibilityState !== "visible") return;
			window.Fb.fns.updateDoc(this.convRef(), { playerLastActiveAt: window.Fb.fns.serverTimestamp(), expireAt: this.expireAt() }).catch(() => {});
		};
		beat();
		this.hbTimer = setInterval(beat, 90000);
		document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") beat(); });
	},

	sendTyping() {
		if (!this.hasConv) return;
		window.Fb.fns.updateDoc(this.convRef(), { playerTypingAt: Date.now() }).catch(() => {});
	},

	async send({ type, content, duration, replyTo }) {
		const { db, fns, uid } = window.Fb;
		const msg = { from: "player", type, content, timestamp: fns.serverTimestamp(), expireAt: this.expireAt() };
		if (duration) msg.duration = duration;
		if (replyTo) msg.replyTo = replyTo;
		const prev = type === "text" ? content.slice(0, 80) : type === "image" ? "📷" : "🎤";
		const name = State.profile.playerName || "";
		await Promise.all([
			fns.addDoc(fns.collection(db, "conversations", uid, "messages"), msg),
			fns.setDoc(this.convRef(), {
				playerName: name, language: State.profile.language || "fr", playerAvatar: State.profile.avatar || "",
				lastMessageAt: fns.serverTimestamp(), lastMessagePreview: prev, lastMessageFrom: "player",
				unreadFromPlayer: fns.increment(1), playerLastActiveAt: fns.serverTimestamp(), expireAt: this.expireAt(),
			}, { merge: true }),
		]);
		window.Fb.notifyPush({ kind: "toAdmin", conversationId: uid, title: name || "Joueur", body: prev });
	},

	tombstone(id) {
		const { db, fns, uid } = window.Fb;
		return fns.updateDoc(fns.doc(db, "conversations", uid, "messages", id), { deleted: true, content: "" });
	},
};

/** Badge numéroté sur l'icône messagerie de l'accueil : actif dès que Firebase
 * est prêt (1 seule lecture : le compteur vit sur le document de conversation). */
const ChatBadge = {
	count: 0,
	start() { ChatStore.start(); },
	render() {
		const conv = ChatStore.conv;
		this.count = conv && !Chat.isVisible() ? Math.max(0, Number(conv.unreadForPlayer) || 0) : 0;
		const dot = document.getElementById("home-chat-dot");
		if (!dot) return;
		if (this.count > 0) { dot.textContent = this.count > 9 ? "9+" : String(this.count); dot.classList.remove("hidden"); }
		else dot.classList.add("hidden");
	},
};

const Chat = {
	ui: null, typingTimer: null,

	isVisible() {
		const v = document.getElementById("view-chat");
		return !!v && v.classList.contains("active") && document.visibilityState === "visible";
	},

	init() {
		document.getElementById("btn-chat-back").addEventListener("click", () => { Audio_.playClick(); Nav.back(); });
		document.getElementById("btn-chat-notif").addEventListener("click", () => this.enablePushNotifications());

		this.ui = ChatUI.mount(document.getElementById("chat-thread"), {
			me: "player", lang: State.profile.language, peerName: "Tonton Jiee",
			canDeleteForEveryone: (m) => m.from === "player",
			onSendText: (text, reply) => this.send("text", text, {}, reply),
			onSendMedia: (type, data, extra, reply) => this.send(type, data, extra, reply),
			onDelete: (m, scope) => this.onDelete(m, scope),
			onTyping: () => ChatStore.sendTyping(),
		});
		ChatUI.bindViewport(document.getElementById("view-chat"));

		ChatStore.onChange = () => this.refresh();
		window.addEventListener("firebase-ready", () => { if (this.isVisible()) this.show(); });
		window.addEventListener("online", () => this.refreshNotice());
		window.addEventListener("offline", () => this.refreshNotice());
		document.addEventListener("visibilitychange", () => { if (this.isVisible()) ChatStore.markRead(); });
	},

	show() {
		const lang = State.profile.language;
		document.getElementById("chat-name").textContent = hdr("title");
		this.ui.setLang(lang);
		this.ui.setIntro(Loc.t("chat_intro_text"));
		this.refreshNotifButton();
		if (window.Fb && window.Fb.uid) { ChatStore.start(); ChatStore.startMessages(); }
		this.refresh();
		this.ui.scrollToBottom();
		ChatBadge.render();
		ChatStore.markRead();
	},

	refreshNotice() {
		if (!navigator.onLine) this.ui.setNotice(hdr("offline"));
		else if (!(window.Fb && window.Fb.uid)) this.ui.setNotice(hdr("connecting"));
		else this.ui.setNotice("");
	},

	statusOf(m) {
		if (m.from !== "player") return undefined;
		if (m.pending) return "pending";
		const c = ChatStore.conv || {};
		const ms = tsMs(m.timestamp);
		if (m.read === true || (ms && ms <= tsMs(c.adminReadAt))) return "read";
		if (ms && ms <= tsMs(c.adminDeliveredAt)) return "delivered";
		return "sent";
	},

	headerStatus() {
		if (ChatStore.adminTyping()) return { text: hdr("typing"), cls: "typing" };
		if (ChatStore.adminOnline()) return { text: hdr("online"), cls: "online" };
		if (ChatStore.presTs) {
			const d = new Date(ChatStore.presTs);
			const same = d.toDateString() === new Date().toDateString();
			const loc = State.profile.language === "en" ? "en-US" : "fr-FR";
			return same
				? { text: hdr("seen", { t: d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }) }), cls: "" }
				: { text: hdr("seenDay", { d: d.toLocaleDateString(loc, { day: "numeric", month: "short" }) }), cls: "" };
		}
		return { text: "", cls: "" };
	},

	refresh() {
		if (!this.ui) return;
		const hidden = ChatStore.loadHidden();
		const list = ChatStore.messages.filter((m) => !hidden.has(m.id)).map((m) => ({ ...m, status: this.statusOf(m) }));
		this.ui.setMessages(list);
		this.ui.setPeerTyping(ChatStore.adminTyping());
		clearTimeout(this.typingTimer);
		if (ChatStore.adminTyping()) this.typingTimer = setTimeout(() => this.refresh(), Math.max(200, ChatStore.adminTypingUntil - Date.now() + 50));
		const st = this.headerStatus();
		const el = document.getElementById("chat-status");
		el.textContent = st.text;
		el.className = "chat-status " + st.cls;
		this.refreshNotice();
		if (this.isVisible()) ChatStore.markRead();
		ChatBadge.render();
	},

	send(type, content, extra, replyTo) {
		if (!(window.Fb && window.Fb.uid)) { ChatUI.toast(hdr("connecting")); return false; }
		ChatStore.send({ type, content, duration: extra && extra.duration, replyTo }).catch((e) => {
			console.error("Chat: envoi échoué", e);
			ChatUI.toast(hdr("offline"));
		});
		return true;
	},

	async onDelete(m, scope) {
		if (scope === "me") { ChatStore.hideForMe(m.id); this.refresh(); return; }
		try { await ChatStore.tombstone(m.id); } catch (e) { console.error("Chat: suppression échouée", e); ChatUI.toast(hdr("offline")); }
	},

	// ---------------- Notifications push ----------------
	refreshNotifButton() {
		const btn = document.getElementById("btn-chat-notif");
		const ok = "Notification" in window && window.Fb && window.Fb.messaging;
		btn.classList.toggle("hidden", !ok);
		if (ok) btn.classList.toggle("active", Notification.permission === "granted");
	},

	async enablePushNotifications() {
		Audio_.playClick();
		if (!window.Fb || !window.Fb.messaging) return;
		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") { this.refreshNotifButton(); return; }
			const registration = await navigator.serviceWorker.ready;
			const token = await window.Fb.getToken(window.Fb.messaging, { vapidKey: window.Fb.VAPID_KEY, serviceWorkerRegistration: registration });
			if (!token) return;
			const { fns } = window.Fb;
			await fns.setDoc(ChatStore.convRef(), { pushToken: token, playerName: State.profile.playerName || "", expireAt: ChatStore.expireAt() }, { merge: true });
			this.refreshNotifButton();
		} catch (e) { console.error("Chat: activation des notifications échouée", e); }
	},
};
