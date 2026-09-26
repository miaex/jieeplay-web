// nav.js — pile de navigation, pour que "retour" (bouton à l'écran OU
// bouton physique Android) ramène toujours un seul pas en arrière,
// jamais directement à l'accueil ni hors de l'application.

const Nav = {
	current: "home",

	init() {
		history.replaceState({ step: "home" }, "");
		window.addEventListener("popstate", (e) => {
			const step = (e.state && e.state.step) || "home";
			this.applyStep(step);
		});
	},

	/** Avance d'un pas dans la navigation (empile un nouvel état). */
	push(step) {
		this.current = step;
		history.pushState({ step }, "");
		this.applyStep(step);
	},

	/** Remplace le pas courant sans empiler (ex: retour au menu d'accueil
	 * depuis l'écran de bienvenue — ce n'est pas un "vrai" nouveau pas). */
	replace(step) {
		this.current = step;
		history.replaceState({ step }, "");
		this.applyStep(step);
	},

	/** Un seul pas en arrière — déclenche popstate, qui rappelle applyStep. */
	back() {
		history.back();
	},

	applyStep(step) {
		this.current = step;

		if (step === "home") {
			App.goTo("home");
		} else if (step === "game-category") {
			App.goTo("game");
			Game.showCategoryOverlay();
		} else if (step === "game-board") {
			App.goTo("game");
			Game.hideCategoryOverlay();
		} else if (step === "reward") {
			App.goTo("reward");
		} else if (step === "settings") {
			App.goTo("settings");
		} else if (step === "journey") {
			App.goTo("journey");
		} else if (step === "rewards-list") {
			App.goTo("rewards");
		} else if (step === "hub") {
			App.goTo("hub");
		} else if (step === "chat") {
			App.goTo("chat");
		}
	},
};
