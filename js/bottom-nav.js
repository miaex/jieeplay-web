// bottom-nav.js — navigation fixe présente sur tous les écrans.
// "Jouer" délègue à Home.startOrContinue() pour respecter la même
// logique que la carte principale (récompense en attente, etc.).

const BOTTOM_NAV_ITEMS = [
	{ id: "home", icon: "🏠", labelKey: "nav_home_short", view: "home", step: "home" },
	{ id: "play", icon: "🎮", labelKey: "nav_play_short", view: "game", step: null },
	{ id: "journey", icon: "📖", labelKey: "menu_journey_short", view: "journey", step: "journey" },
	{ id: "rewards", icon: "🎁", labelKey: "menu_rewards_short", view: "rewards", step: "rewards-list" },
	{ id: "settings", icon: "⚙️", labelKey: "nav_settings_short", view: "settings", step: "settings" },
];

const HIDDEN_ON_VIEWS = ["boot", "onboarding"];

const BottomNav = {
	init() {
		const bar = document.getElementById("bottom-nav");
		bar.innerHTML = "";

		BOTTOM_NAV_ITEMS.forEach((item) => {
			const btn = document.createElement("button");
			btn.className = "bottom-nav-item";
			btn.id = `bottom-nav-${item.id}`;
			btn.innerHTML = `
				<span class="bottom-nav-icon">${item.icon}</span>
				<span class="bottom-nav-label"></span>
				<span class="bottom-nav-badge hidden"></span>
			`;
			btn.addEventListener("click", () => this.onItemPressed(item));
			bar.appendChild(btn);
		});
	},

	onItemPressed(item) {
		Audio_.playClick();
		if (item.id === "play") {
			Home.startOrContinue();
			return;
		}
		if (Nav.current !== item.step) {
			Nav.push(item.step);
		}
	},

	/** Appelé par App.goTo() à chaque changement d'écran. */
	refresh(activeView) {
		const bar = document.getElementById("bottom-nav");
		bar.classList.toggle("hidden", HIDDEN_ON_VIEWS.includes(activeView));

		BOTTOM_NAV_ITEMS.forEach((item) => {
			const btn = document.getElementById(`bottom-nav-${item.id}`);
			if (!btn) return;
			btn.classList.toggle("active", item.view === activeView);
			btn.querySelector(".bottom-nav-label").textContent = Loc.t(item.labelKey);
		});

		this.refreshRewardsBadge();
	},

	refreshRewardsBadge() {
		const badge = document.querySelector("#bottom-nav-rewards .bottom-nav-badge");
		if (!badge) return;
		const count = State.progress.unlockedRewards.length;
		if (count > 0) {
			badge.textContent = count;
			badge.classList.remove("hidden");
		} else {
			badge.classList.add("hidden");
		}
	},
};
