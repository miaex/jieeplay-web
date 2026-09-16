// bottom-nav.js — navigation fixe présente sur tous les écrans.
// "Jouer" délègue à Home.startOrContinue() pour respecter la même
// logique que la carte principale (récompense en attente, etc.).

const NAV_ICONS = {
	home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/></svg>',
	play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M10 8.5l6 3.5-6 3.5Z" fill="currentColor" stroke="none"/></svg>',
	journey: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-1.5-1.3-3.6-2-6-2v12.5c2.4 0 4.5.7 6 2 1.5-1.3 3.6-2 6-2V4.5c-2.4 0-4.5.7-6 2Z"/><path d="M12 6.5v12.5"/></svg>',
	rewards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9.5" width="16" height="10" rx="1.5"/><path d="M4 9.5h16"/><path d="M12 9.5v10"/><path d="M12 9.5c-1.2-2.3-3-3.5-4.4-3-1.2.4-1.5 1.9-.4 2.6.9.6 2.7.5 4.8.4Z"/><path d="M12 9.5c1.2-2.3 3-3.5 4.4-3 1.2.4 1.5 1.9.4 2.6-.9.6-2.7.5-4.8.4Z"/></svg>',
	settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.2c.1-.4.1-.8 0-1.2l1.6-1.3-1.5-2.6-1.9.6a4.7 4.7 0 0 0-1-.6L16.2 6h-3l-.4 2.1c-.4.1-.7.3-1 .6l-1.9-.6-1.5 2.6 1.6 1.3c-.1.4-.1.8 0 1.2L8.4 14.5l1.5 2.6 1.9-.6c.3.3.6.5 1 .6l.4 2.1h3l.4-2.1c.4-.1.7-.3 1-.6l1.9.6 1.5-2.6-1.6-1.3Z"/></svg>',
};

const BOTTOM_NAV_ITEMS = [
	{ id: "home", icon: NAV_ICONS.home, labelKey: "nav_home_short", view: "home", step: "home" },
	{ id: "play", icon: NAV_ICONS.play, labelKey: "nav_play_short", view: "game", step: null },
	{ id: "journey", icon: NAV_ICONS.journey, labelKey: "menu_journey_short", view: "journey", step: "journey" },
	{ id: "rewards", icon: NAV_ICONS.rewards, labelKey: "menu_rewards_short", view: "rewards", step: "rewards-list" },
	{ id: "settings", icon: NAV_ICONS.settings, labelKey: "nav_settings_short", view: "settings", step: "settings" },
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
