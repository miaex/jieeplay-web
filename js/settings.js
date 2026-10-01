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

		document.getElementById("btn-settings-avatar").addEventListener("click", () => this.openAvatarPicker());
		document.getElementById("btn-settings-avatar-close").addEventListener("click", () => this.closeAvatarPicker());

		document.getElementById("btn-settings-language").addEventListener("click", () => this.toggleLanguage());

		document.getElementById("btn-settings-howto").addEventListener("click", () => this.openHowTo());
		document.getElementById("btn-howto-close").addEventListener("click", () => this.closeHowTo());

		document.getElementById("btn-settings-reset").addEventListener("click", () => {
			Audio_.playClick();
			document.getElementById("reset-confirm-overlay").classList.remove("hidden");
			document.getElementById("bottom-nav").classList.add("hidden");
		});
		document.getElementById("btn-reset-cancel").addEventListener("click", () => {
			Audio_.playClick();
			document.getElementById("reset-confirm-overlay").classList.add("hidden");
			document.getElementById("bottom-nav").classList.remove("hidden");
		});
		document.getElementById("btn-reset-confirm").addEventListener("click", () => this.confirmReset());
	},

	show() {
		document.getElementById("settings-title").textContent = Loc.t("settings_title");
		document.getElementById("settings-label-avatar").textContent = Loc.t("settings_label_avatar");
		document.getElementById("settings-avatar-sublabel").textContent = Loc.t("settings_avatar_sublabel");
		document.getElementById("settings-avatar-overlay-title").textContent = Loc.t("onboarding_avatar_title");
		document.getElementById("btn-settings-avatar-close").textContent = Loc.t("howto_close");

		document.getElementById("settings-label-language").textContent = Loc.t("settings_label_language");
		this.refreshLanguageDisplay();

		document.getElementById("settings-label-sound").textContent = Loc.t("settings_sound");
		document.getElementById("settings-label-music").textContent = Loc.t("settings_music");
		document.getElementById("settings-label-vibration").textContent = Loc.t("settings_vibration");
		document.getElementById("btn-settings-howto").textContent = Loc.t("settings_howto");
		document.getElementById("btn-settings-reset").textContent = Loc.t("settings_reset");

		document.getElementById("reset-confirm-text").textContent = Loc.t("settings_reset_confirm");
		document.getElementById("btn-reset-cancel").textContent = Loc.t("settings_reset_cancel");
		document.getElementById("btn-reset-confirm").textContent = Loc.t("settings_reset_confirm_button");

		this.refreshToggle("toggle-sound", State.settings.sfxEnabled);
		this.refreshToggle("toggle-music", State.settings.musicEnabled);
		this.refreshToggle("toggle-vibration", State.settings.vibrationEnabled);

		renderAvatar(document.getElementById("settings-avatar-preview"), State.profile.avatar);
	},

	// -----------------------------------------------------------------
	// PROFIL — avatar et langue modifiables à tout moment
	// -----------------------------------------------------------------

	openAvatarPicker() {
		Audio_.playClick();
		const grid = document.getElementById("settings-avatar-grid");
		grid.innerHTML = "";
		AVATAR_LIST.forEach((cfg) => {
			const card = document.createElement("button");
			card.type = "button";
			card.className = "avatar-choice";
			if (cfg.id === State.profile.avatar) card.classList.add("selected");
			card.dataset.avatarId = cfg.id;
			card.innerHTML = `<span class="avatar-choice-circle">${getAvatarSVG(cfg.id)}</span>`;
			card.addEventListener("click", () => this.selectAvatar(cfg.id));
			grid.appendChild(card);
		});
		document.getElementById("settings-avatar-overlay").classList.remove("hidden");
		document.getElementById("bottom-nav").classList.add("hidden");
	},

	selectAvatar(avatarId) {
		Audio_.playClick();
		State.profile.avatar = avatarId;
		SaveManager.save();
		renderAvatar(document.getElementById("settings-avatar-preview"), avatarId);
		document.querySelectorAll("#settings-avatar-grid .avatar-choice").forEach((el) => {
			el.classList.toggle("selected", el.dataset.avatarId === avatarId);
		});
		this.closeAvatarPicker();
	},

	closeAvatarPicker() {
		Audio_.playClick();
		document.getElementById("settings-avatar-overlay").classList.add("hidden");
		document.getElementById("bottom-nav").classList.remove("hidden");
	},

	toggleLanguage() {
		Audio_.playClick();
		State.profile.language = State.profile.language === "fr" ? "en" : "fr";
		SaveManager.save();
		this.show();
		BottomNav.refresh("settings");
	},

	/** Ouvre le tutoriel "Comment jouer". Remplit son texte à chaque
	 * ouverture (pas seulement dans Settings.show()) pour fonctionner
	 * aussi bien depuis Réglages que depuis le bouton "?" du plateau de
	 * jeu — un seul overlay, jamais dupliqué (§ index.html V29). */
	openHowTo() {
		Audio_.playClick();
		document.getElementById("howto-title").textContent = Loc.t("howto_title");
		for (let i = 1; i <= 5; i++) {
			document.getElementById(`howto-step-${i}`).textContent = Loc.t(`howto_step_${i}`);
		}
		document.getElementById("btn-howto-close").textContent = Loc.t("howto_close");
		document.getElementById("howto-overlay").classList.remove("hidden");
		document.getElementById("bottom-nav").classList.add("hidden");
	},

	closeHowTo() {
		Audio_.playClick();
		document.getElementById("howto-overlay").classList.add("hidden");
		document.getElementById("bottom-nav").classList.remove("hidden");
	},

	refreshLanguageDisplay() {
		const isFr = State.profile.language === "fr";
		document.getElementById("settings-language-sublabel").textContent = isFr ? "Français" : "English";
		document.getElementById("settings-language-value").textContent = isFr ? "FR" : "EN";
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
			rewardLetter: null, rewardHistory: [], completedRewards: [],
			hintsUsedThisChapter: 0,
		};
		State.statistics = { successes: 0, failures: 0 };
		State.categoryChoiceHistory = [];
		State.usedWordsByCategory = {};
		SaveManager.save();

		document.getElementById("reset-confirm-overlay").classList.add("hidden");
		document.getElementById("bottom-nav").classList.remove("hidden");
		Nav.replace("home");
	},
};
