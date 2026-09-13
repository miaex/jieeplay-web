// settings.js — équivalent Settings.gd

const Settings = {
	init() {
		document.getElementById("btn-settings-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});

		document.getElementById("toggle-sound").addEventListener("click", () => this.toggleSetting("sfxEnabled", "toggle-sound"));
		document.getElementById("toggle-music").addEventListener("click", () => this.toggleMusic());
		document.getElementById("toggle-vibration").addEventListener("click", () => this.toggleSetting("vibrationEnabled", "toggle-vibration"));

		document.getElementById("btn-settings-howto").addEventListener("click", () => {
			Audio_.playClick();
			document.getElementById("howto-overlay").classList.remove("hidden");
		});
		document.getElementById("btn-howto-close").addEventListener("click", () => {
			Audio_.playClick();
			document.getElementById("howto-overlay").classList.add("hidden");
		});

		document.getElementById("btn-settings-reset").addEventListener("click", () => {
			Audio_.playClick();
			document.getElementById("reset-confirm-overlay").classList.remove("hidden");
		});
		document.getElementById("btn-reset-cancel").addEventListener("click", () => {
			Audio_.playClick();
			document.getElementById("reset-confirm-overlay").classList.add("hidden");
		});
		document.getElementById("btn-reset-confirm").addEventListener("click", () => this.confirmReset());
	},

	show() {
		document.getElementById("settings-title").textContent = Loc.t("settings_title");
		document.getElementById("settings-label-sound").textContent = Loc.t("settings_sound");
		document.getElementById("settings-label-music").textContent = Loc.t("settings_music");
		document.getElementById("settings-label-vibration").textContent = Loc.t("settings_vibration");
		document.getElementById("btn-settings-howto").textContent = Loc.t("settings_howto");
		document.getElementById("btn-settings-reset").textContent = Loc.t("settings_reset");

		document.getElementById("howto-title").textContent = Loc.t("howto_title");
		for (let i = 1; i <= 5; i++) {
			document.getElementById(`howto-step-${i}`).textContent = Loc.t(`howto_step_${i}`);
		}
		document.getElementById("btn-howto-close").textContent = Loc.t("howto_close");

		document.getElementById("reset-confirm-text").textContent = Loc.t("settings_reset_confirm");
		document.getElementById("btn-reset-cancel").textContent = Loc.t("settings_reset_cancel");
		document.getElementById("btn-reset-confirm").textContent = Loc.t("settings_reset_confirm_button");

		this.refreshToggle("toggle-sound", State.settings.sfxEnabled);
		this.refreshToggle("toggle-music", State.settings.musicEnabled);
		this.refreshToggle("toggle-vibration", State.settings.vibrationEnabled);
	},

	refreshToggle(id, on) {
		document.getElementById(id).classList.toggle("on", on);
	},

	toggleSetting(field, toggleId) {
		Audio_.playClick();
		State.settings[field] = !State.settings[field];
		SaveManager.save();
		this.refreshToggle(toggleId, State.settings[field]);
	},

	toggleMusic() {
		Audio_.playClick();
		State.settings.musicEnabled = !State.settings.musicEnabled;
		SaveManager.save();
		this.refreshToggle("toggle-music", State.settings.musicEnabled);
		if (State.settings.musicEnabled) {
			Audio_.playMusic(Audio_.currentMusicKey || "menu");
		} else {
			Audio_.stopMusic();
		}
	},

	confirmReset() {
		Audio_.playClick();

		State.progress = {
			currentChapter: 1, currentLevel: 1, unlockedRewards: [],
			rewardActive: false, rewardCompleted: false, rewardTone: "", rewardGroup: 1, rewardFragments: [],
			hintsUsedThisChapter: 0,
		};
		State.statistics = { successes: 0, failures: 0 };
		State.categoryChoiceHistory = [];
		State.usedWordsByCategory = {};
		SaveManager.save();

		document.getElementById("reset-confirm-overlay").classList.add("hidden");
		Nav.replace("home");
	},
};
