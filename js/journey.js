// journey.js — équivalent Journey.gd

const Journey = {
	init() {
		document.getElementById("btn-journey-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});
	},

	show() {
		document.getElementById("journey-title").textContent = Loc.t("journey_title");

		const chapter = State.progress.currentChapter;
		const level = State.progress.currentLevel;

		document.getElementById("journey-progress-label").textContent = Loc.t("home_progress_label", { chapter, level });
		document.getElementById("journey-progress-fill").style.width = `${((level - 1) / 10) * 100}%`;

		document.getElementById("journey-stats-text").textContent = Loc.t("journey_stats", {
			chapter,
			level,
			successes: State.statistics.successes,
			failures: State.statistics.failures,
			rewards_count: State.progress.unlockedRewards.length,
		});
	},
};
