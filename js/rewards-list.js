// rewards-list.js — équivalent RewardsList.gd (liste des chapitres
// débloqués ; nommé "RewardsList" en JS pour ne pas entrer en conflit
// avec le module "Reward", qui gère le système de cartes en jeu).

const RewardsList = {
	init() {
		document.getElementById("btn-rewards-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});
	},

	show() {
		document.getElementById("rewards-list-title").textContent = Loc.t("rewards_title");

		const unlocked = [...State.progress.unlockedRewards].sort((a, b) => a - b);
		const emptyEl = document.getElementById("rewards-list-empty");
		const itemsEl = document.getElementById("rewards-list-items");
		itemsEl.innerHTML = "";

		if (unlocked.length === 0) {
			emptyEl.textContent = Loc.t("rewards_empty");
			emptyEl.classList.remove("hidden");
			itemsEl.classList.add("hidden");
		} else {
			emptyEl.classList.add("hidden");
			itemsEl.classList.remove("hidden");
			unlocked.forEach((chapter) => {
				const badge = document.createElement("div");
				badge.className = "card rewards-list-badge";
				badge.textContent = Loc.t("rewards_entry", { chapter });
				itemsEl.appendChild(badge);
			});
		}
	},
};
