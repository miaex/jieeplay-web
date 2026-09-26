// journey.js — équivalent Journey.gd
//
// V28 : ajout d'une mini-piste de progression (§8 du cahier des charges).
// Objectif : faire ressentir "j'avance dans quelque chose", pas seulement
// afficher des statistiques. La piste montre une fenêtre de 5 chapitres
// autour du chapitre courant (jusqu'à 2 avant, 2 après), dans le même
// langage visuel que le reste de l'écran (verre, or, rose).
//
// Un chapitre déjà terminé ET dont la récompense a été entièrement
// révélée (présente dans completedRewards) est cliquable : il renvoie
// vers "Mes récompenses" avec le chapitre concerné déjà ouvert. Un
// chapitre terminé mais pas encore archivé (récompense pas totalement
// lue) reste visuellement "fait" mais n'est pas cliquable, pour ne
// jamais pointer vers une entrée qui n'existe pas encore.

const JOURNEY_PATH_WINDOW_BEFORE = 2;
const JOURNEY_PATH_WINDOW_AFTER = 2;

const Journey = {
	init() {
		document.getElementById("btn-journey-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});

		// Délégation d'événement : la piste est reconstruite à chaque show(),
		// donc un seul écouteur posé une fois sur le conteneur stable suffit.
		document.getElementById("journey-path-track").addEventListener("click", (e) => {
			const node = e.target.closest(".journey-path-node.clickable[data-chapter]");
			if (!node) return;
			const chapter = parseInt(node.dataset.chapter, 10);
			Audio_.playClick();
			Nav.push("rewards-list");
			RewardsList.focusChapter(chapter);
		});
	},

	show() {
		document.getElementById("journey-eyebrow").textContent = Loc.t("journey_eyebrow");
		document.getElementById("journey-title").textContent = Loc.t("journey_title");
		document.getElementById("journey-hero-label").textContent = Loc.t("journey_hero_label");

		const chapter = State.progress.currentChapter;
		const level = State.progress.currentLevel;

		document.getElementById("journey-hero-chapter").textContent = Loc.t("home_chapter_title", { chapter });
		document.getElementById("journey-progress-label").textContent = Loc.t("home_level_progress", { level });
		document.getElementById("journey-progress-fill").style.width = `${((level - 1) / 10) * 100}%`;

		document.getElementById("journey-path-label").textContent = Loc.t("journey_path_label");
		this.renderPath();

		const successes = State.statistics.successes;
		const failures = State.statistics.failures;
		const total = successes + failures;
		const accuracy = total > 0 ? Math.round((successes / total) * 100) : 0;

		document.getElementById("journey-stat-successes").textContent = successes;
		document.getElementById("journey-stat-successes-label").textContent = Loc.t("journey_stat_successes");
		document.getElementById("journey-stat-failures").textContent = failures;
		document.getElementById("journey-stat-failures-label").textContent = Loc.t("journey_stat_failures");
		document.getElementById("journey-stat-accuracy").textContent = `${accuracy}%`;
		document.getElementById("journey-stat-accuracy-label").textContent = Loc.t("journey_stat_accuracy");
		document.getElementById("journey-stat-rewards").textContent = State.progress.unlockedRewards.length;
		document.getElementById("journey-stat-rewards-label").textContent = Loc.t("journey_stat_rewards");
	},

	renderPath() {
		const current = State.progress.currentChapter;
		const start = Math.max(1, current - JOURNEY_PATH_WINDOW_BEFORE);
		const end = start + JOURNEY_PATH_WINDOW_BEFORE + JOURNEY_PATH_WINDOW_AFTER;
		const track = document.getElementById("journey-path-track");
		track.innerHTML = "";

		for (let ch = start; ch <= end; ch++) {
			if (ch > start) {
				const connector = document.createElement("div");
				connector.className = "journey-path-connector" + (ch - 1 < current ? " done" : "");
				track.appendChild(connector);
			}

			const state = ch < current ? "done" : ch === current ? "current" : "locked";
			const archived = state === "done" && State.progress.completedRewards.some((r) => r.chapter === ch);

			const node = document.createElement("div");
			node.className = `journey-path-node ${state}` + (archived ? " clickable" : "");
			node.dataset.chapter = ch;
			node.setAttribute("role", archived ? "button" : "presentation");
			node.innerHTML = `
				<span class="journey-path-node-dot">${state === "done" ? "✓" : ""}</span>
				<span class="journey-path-node-num">${ch}</span>
			`;
			track.appendChild(node);
		}
	},
};
