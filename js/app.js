// app.js — équivalent Boot.gd + SceneRouter.gd

/** Applique Loc.t() à tous les éléments marqués data-t / data-t-placeholder
 * à l'intérieur d'un conteneur donné. Évite de répéter le texte en dur
 * dans le JS pour les éléments statiques du HTML. */
function applyDataT(container) {
	container.querySelectorAll("[data-t]").forEach((elm) => {
		elm.textContent = Loc.t(elm.dataset.t);
	});
	container.querySelectorAll("[data-t-placeholder]").forEach((elm) => {
		elm.placeholder = Loc.t(elm.dataset.tPlaceholder);
	});
}

const App = {
	views: ["boot", "onboarding", "home", "game", "reward", "settings", "journey", "rewards", "hub", "chat"],

	goTo(viewName) {
		this.views.forEach((v) => {
			document.getElementById(`view-${v}`).classList.toggle("active", v === viewName);
		});
		BottomNav.refresh(viewName);

		if (viewName === "home") Home.show();
		if (viewName === "game") Game.show();
		if (viewName === "reward") Reward.show();
		if (viewName === "settings") Settings.show();
		if (viewName === "journey") Journey.show();
		if (viewName === "rewards") RewardsList.show();
		if (viewName === "hub") Hub.show();
		if (viewName === "chat") Chat.show();
	},

	async boot() {
		renderLogo(document.getElementById("boot-logo"));

		const fill = document.getElementById("boot-progress-fill");
		const percentLabel = document.getElementById("boot-percent");
		const errorBox = document.getElementById("boot-error");
		const errorText = document.getElementById("boot-error-text");
		const retryBtn = document.getElementById("btn-boot-retry");

		// PRIORITÉ ABSOLUE (correctif onboarding hors-ligne, V36) : le profil
		// local est chargé EN PREMIER, avant toute ressource réseau/cache.
		// SaveManager.load() est synchrone (localStorage) — il ne peut pas
		// échouer pour une raison réseau. Ainsi, même si le chargement des
		// données de jeu échoue juste après, on sait DÉJÀ si ce joueur a un
		// profil ou non ; une erreur de contenu ne pourra plus jamais être
		// confondue avec "première installation".
		SaveManager.load();
		const hadProfile = SaveManager.hasSave() && State.profile.onboardingDone;

		const steps = [
			() => Loc.load(),
			() => State.loadGameData(),
			() => RewardEngine.load(State.rewardEngineContent),
		];

		const isEn = State.profile.language === "en";
		const runSteps = async () => {
			errorBox.classList.add("hidden");
			for (let i = 0; i < steps.length; i++) {
				await steps[i]();
				const pct = Math.round(((i + 1) / steps.length) * 100);
				fill.style.width = `${pct}%`;
				percentLabel.textContent = `${pct}%`;
				await new Promise((r) => setTimeout(r, 120));
			}
		};

		try {
			await runSteps();
		} catch (e) {
			// Une ressource de jeu n'a pas pu être chargée (hors cache, réseau
			// coupé au pire moment). Le profil, lui, est déjà connu (ci-dessus)
			// et n'est JAMAIS remis en cause par cette erreur — on propose
			// juste de réessayer, sans jamais retomber sur l'onboarding pour
			// cette raison.
			console.error("Boot: échec du chargement des ressources", e);
			await new Promise((resolve) => this.boot_retryLoop(runSteps, errorBox, errorText, retryBtn, isEn, resolve));
		}

		Audio_.init();
		Nav.init();
		Onboarding.init();
		Home.init();
		Game.init();
		Reward.init();
		Settings.init();
		Journey.init();
		RewardsList.init();
		Hub.init();
		Chat.init();
		BottomNav.init();

		Audio_.preloadMusic();

		await new Promise((r) => setTimeout(r, 250));

		// V36 : les deux branches passent maintenant par Nav (plus de
		// court-circuit this.goTo direct) — cohérence de l'état de
		// navigation dès le premier écran, dans les deux cas.
		if (hadProfile) {
			if (State.progress.rewardActive) {
				Nav.replace("reward");
			} else {
				Nav.replace("home");
				// V35 : lancée depuis une notification → messagerie directement.
				if (new URLSearchParams(location.search).get("open") === "chat") Nav.push("chat");
			}
		} else {
			Nav.replace("onboarding");
			renderLogo(document.getElementById("onboarding-logo"));
			applyDataT(document.getElementById("step-language"));
		}
	},

	/** Boucle de réessai manuelle tant que le joueur clique sur "Réessayer" —
	 * on ne force jamais un abandon vers l'onboarding, on ne fait que
	 * réessayer le chargement des ressources. */
	boot_retryLoop(runSteps, errorBox, errorText, retryBtn, isEn, resolve) {
		errorText.textContent = isEn
			? "Couldn't load game content. Check your connection and try again."
			: "Impossible de charger le contenu du jeu. Vérifie ta connexion et réessaie.";
		retryBtn.textContent = isEn ? "Retry" : "Réessayer";
		errorBox.classList.remove("hidden");
		retryBtn.onclick = async () => {
			retryBtn.onclick = null;
			try {
				await runSteps();
				resolve();
			} catch (e) {
				console.error("Boot: nouvel échec", e);
				this.boot_retryLoop(runSteps, errorBox, errorText, retryBtn, isEn, resolve);
			}
		};
	},
};

// Beaucoup de navigateurs mobiles bloquent l'audio tant qu'aucun geste
// utilisateur n'a eu lieu : on relance l'AudioContext au premier clic.
document.addEventListener("click", () => Audio_.resumeIfNeeded(), { once: false });

// V32 : identifiant joueur réel (uid Firebase, authentification anonyme —
// voir js/firebase-init.js). Se déclenche dès que Firebase confirme
// l'identité, quel que soit l'écran affiché à ce moment-là.
window.addEventListener("firebase-ready", (e) => {
	if (typeof ChatBadge !== "undefined") ChatBadge.start();
	if (State.profile.playerId === e.detail.uid) return; // déjà à jour
	State.profile.playerId = e.detail.uid;
	if (typeof SaveManager !== "undefined") SaveManager.save();
	if (typeof Chat !== "undefined" && Nav.current === "chat") Chat.show();
});

// V35 : toucher une notification ouvre directement la messagerie.
navigator.serviceWorker && navigator.serviceWorker.addEventListener("message", (e) => {
	if (e.data && e.data.type === "open-chat" && State.profile.onboardingDone && Nav.current !== "chat") Nav.push("chat");
});

window.addEventListener("DOMContentLoaded", () => {
	App.boot();

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed", e));
	}
});
