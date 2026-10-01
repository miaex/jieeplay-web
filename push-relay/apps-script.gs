/**
 * Relais de notifications push JieePlay — Google Apps Script (gratuit, sans carte).
 *
 * Rôle : quand un message est envoyé (joueur → admin, ou admin → joueur), l'app
 * appelle cette adresse ; le script vérifie QUI appelle, retrouve le token push
 * du destinataire dans Firestore, et lui envoie la notification via Firebase
 * Cloud Messaging. Un navigateur seul ne peut pas le faire : il faut un serveur.
 *
 * MISE EN PLACE (détaillée dans le README, section "Notifications push") :
 *  1. script.google.com → Nouveau projet → colle CE fichier.
 *  2. Paramètres du projet → Propriétés du script → ajoute :
 *       SERVICE_ACCOUNT_JSON : contenu COMPLET du fichier JSON de clé de compte de service
 *                              (Firebase → Paramètres du projet → Comptes de service → Générer une clé)
 *       ADMIN_UID            : ton uid admin (Authentication → Users)
 *       WEB_API_KEY          : AIzaSyCB_3NTZw4VKuYVtVNZuQF-7_dsqUol2VU
 *       PROJECT_ID           : jieeplay-chat
 *       GAME_URL             : https://miaex.github.io/jieeplay-web/
 *       ADMIN_URL            : https://miaex.github.io/jieeplay-admin/
 *  3. Déployer → Nouveau déploiement → Application web →
 *       Exécuter en tant que : Moi · Qui a accès : Tout le monde → Déployer.
 *  4. Copie l'URL obtenue dans js/push-config.js (jeu) ET push-config.js (admin).
 *
 * SÉCURITÉ : la clé du compte de service ne quitte jamais ton compte Google (elle
 * reste dans les propriétés du script). Chaque appel doit fournir un jeton Firebase
 * valide (idToken) ; un joueur ne peut notifier QUE l'admin et QUE pour sa propre
 * conversation ; seul l'admin peut notifier un joueur. Limite : 1 push / 3 s / appelant.
 */

function doPost(e) {
	try {
		const req = JSON.parse(e.postData.contents);
		const props = PropertiesService.getScriptProperties();
		const caller = verifyIdToken_(req.idToken, props.getProperty("WEB_API_KEY"));
		if (!caller) return out_({ ok: false, error: "auth" });

		const cache = CacheService.getScriptCache();
		if (cache.get("rl_" + caller)) return out_({ ok: true, skipped: "rate-limit" });
		cache.put("rl_" + caller, "1", 3);

		const projectId = props.getProperty("PROJECT_ID");
		const adminUid = props.getProperty("ADMIN_UID");
		const access = getAccessToken_();
		let token, data;

		if (caller === adminUid && req.kind === "toPlayer" && req.conversationId) {
			token = fsString_(projectId, "conversations/" + req.conversationId, "pushToken", access);
			data = { title: "Tonton Jiee", body: clip_(req.body), url: props.getProperty("GAME_URL") + "?open=chat", tag: "jieeplay-chat" };
		} else if (req.kind === "toAdmin" && req.conversationId === caller) {
			token = fsString_(projectId, "admin/config", "pushToken", access);
			data = { title: clip_(req.title || "Joueur", 40), body: clip_(req.body), url: props.getProperty("ADMIN_URL") + "?c=" + caller, tag: "conv-" + caller };
		} else if (caller === adminUid && req.kind === "selfTest") {
			// V36 — bouton "Tester la notification" (Paramètres admin) : un
			// vrai aller-retour de bout en bout vers l'admin lui-même, pas
			// une simple réponse HTTP (voir cahier des charges §84).
			token = fsString_(projectId, "admin/config", "pushToken", access);
			data = { title: "Test de notification", body: "Tout fonctionne ✓", url: props.getProperty("ADMIN_URL"), tag: "tj-self-test" };
		} else {
			return out_({ ok: false, error: "forbidden" });
		}
		if (!token) return out_({ ok: true, skipped: "no-token" });

		const res = UrlFetchApp.fetch("https://fcm.googleapis.com/v1/projects/" + projectId + "/messages:send", {
			method: "post", contentType: "application/json", muteHttpExceptions: true,
			headers: { Authorization: "Bearer " + access },
			payload: JSON.stringify({ message: { token: token, data: data, webpush: { headers: { Urgency: "high", TTL: "86400" } } } }),
		});
		return out_({ ok: res.getResponseCode() === 200, status: res.getResponseCode() });
	} catch (err) {
		return out_({ ok: false, error: String(err) });
	}
}

function doGet() { return out_({ ok: true, service: "jieeplay-push-relay" }); }

/** À lancer une fois depuis l'éditeur (▶ Exécuter) pour vérifier la configuration. */
function checkSetup() {
	const p = PropertiesService.getScriptProperties();
	["SERVICE_ACCOUNT_JSON", "ADMIN_UID", "WEB_API_KEY", "PROJECT_ID", "GAME_URL", "ADMIN_URL"].forEach(function (k) {
		Logger.log(k + " : " + (p.getProperty(k) ? "OK" : "MANQUANT"));
	});
	Logger.log("Jeton d'accès : " + (getAccessToken_() ? "OK" : "ÉCHEC (vérifie SERVICE_ACCOUNT_JSON)"));
}

// ----------------------------------------------------------------- utilitaires
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function clip_(s, n) { return String(s || "").slice(0, n || 120); }

function verifyIdToken_(idToken, apiKey) {
	if (!idToken) return null;
	const res = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + apiKey, {
		method: "post", contentType: "application/json", muteHttpExceptions: true, payload: JSON.stringify({ idToken: idToken }),
	});
	if (res.getResponseCode() !== 200) return null;
	const j = JSON.parse(res.getContentText());
	return j.users && j.users[0] ? j.users[0].localId : null;
}

function fsString_(projectId, path, field, access) {
	const res = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/" + path, {
		headers: { Authorization: "Bearer " + access }, muteHttpExceptions: true,
	});
	if (res.getResponseCode() !== 200) return null;
	const f = JSON.parse(res.getContentText()).fields || {};
	return f[field] && f[field].stringValue ? f[field].stringValue : null;
}

function b64_(s) { return Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, ""); }

function getAccessToken_() {
	const cache = CacheService.getScriptCache();
	const cached = cache.get("sa_token");
	if (cached) return cached;
	const sa = JSON.parse(PropertiesService.getScriptProperties().getProperty("SERVICE_ACCOUNT_JSON"));
	const now = Math.floor(Date.now() / 1000);
	const unsigned = b64_(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64_(JSON.stringify({
		iss: sa.client_email,
		scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
		aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
	}));
	const sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, sa.private_key)).replace(/=+$/, "");
	const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
		method: "post", muteHttpExceptions: true,
		payload: { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + sig },
	});
	const tok = JSON.parse(res.getContentText()).access_token;
	if (tok) cache.put("sa_token", tok, 3000);
	return tok;
}
