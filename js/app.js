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
	views: ["boot", "onboarding", "home", "game", "reward", "settings", "journey"],

	goTo(viewName) {
		this.views.forEach((v) => {
			document.getElementById(`view-${v}`).classList.toggle("active", v === viewName);
		});

		if (viewName === "home") Home.show();
		if (viewName === "game") Game.show();
		if (viewName === "reward") Reward.show();
		// settings / journey seront branchés aux prochaines étapes.
	},

	async boot() {
		renderLogo(document.getElementById("boot-logo"));

		const fill = document.getElementById("boot-progress-fill");
		const percentLabel = document.getElementById("boot-percent");

		const steps = [
			() => Loc.load(),
			() => State.loadGameData(),
		];

		for (let i = 0; i < steps.length; i++) {
			await steps[i]();
			const pct = Math.round(((i + 1) / steps.length) * 100);
			fill.style.width = `${pct}%`;
			percentLabel.textContent = `${pct}%`;
			await new Promise((r) => setTimeout(r, 120));
		}

		Audio_.init();
		SaveManager.load();
		Nav.init();
		Onboarding.init();
		Home.init();
		Game.init();
		Reward.init();

		Audio_.preloadMusic();

		await new Promise((r) => setTimeout(r, 250));

		if (SaveManager.hasSave() && State.profile.onboardingDone) {
			if (State.progress.rewardActive) {
				Nav.replace("reward");
			} else {
				Nav.replace("home");
			}
		} else {
			this.goTo("onboarding");
			renderLogo(document.getElementById("onboarding-logo"));
			applyDataT(document.getElementById("step-language"));
		}
	},
};

// Beaucoup de navigateurs mobiles bloquent l'audio tant qu'aucun geste
// utilisateur n'a eu lieu : on relance l'AudioContext au premier clic.
document.addEventListener("click", () => Audio_.resumeIfNeeded(), { once: false });

window.addEventListener("DOMContentLoaded", () => {
	App.boot();

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed", e));
	}
});
