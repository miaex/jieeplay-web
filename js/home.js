// home.js — équivalent Home.gd. Écran d'accueil premium : header avec
// avatar + salutation contextuelle, carte principale adaptative
// (fraîchement inscrit / en cours / récompense prête), carte "du jour",
// raccourcis compacts.

const Home = {
	init() {
		document.getElementById("btn-welcome-start").addEventListener("click", () => this.onStartPressed());

		document.getElementById("btn-continue").addEventListener("click", () => this.startOrContinue());

		document.getElementById("btn-home-envelope").addEventListener("click", () => {
			Audio_.playClick();
			if (State.progress.rewardActive) this.showPendingReward();
		});

		document.getElementById("btn-home-settings").addEventListener("click", () => {
			Audio_.playClick();
			Nav.push("settings");
		});

		document.getElementById("home-daily-card").addEventListener("click", () => {
			Audio_.playClick();
			Nav.push("game-category");
		});

		document.getElementById("btn-pending-reward-continue").addEventListener("click", () => {
			Audio_.playClick();
			document.getElementById("pending-reward-overlay").classList.add("hidden");
			Nav.push("reward");
		});
	},

	/** Action de la carte principale ET de l'onglet "Jouer" de la
	 * navigation basse — un seul point de vérité. */
	startOrContinue() {
		Audio_.playClick();
		if (State.progress.rewardActive) {
			if (Nav.current !== "home") Nav.push("home");
			this.showPendingReward();
		} else {
			Nav.push("game-category");
		}
	},

	show() {
		renderLogo(document.getElementById("home-logo"));
		Audio_.playMusic("menu");

		if (State.profile.welcomeSeen) {
			this.showMenu();
		} else {
			this.showWelcome();
		}
	},

	showWelcome() {
		document.getElementById("home-logo").classList.remove("hidden");
		document.getElementById("home-welcome").classList.remove("hidden");
		document.getElementById("home-menu").classList.add("hidden");

		document.getElementById("home-welcome-body").textContent =
			Loc.t("home_welcome_body", { player_name: State.profile.playerName });
		document.getElementById("home-welcome-question").textContent = Loc.tGendered("home_welcome_question");

		const btn = document.getElementById("btn-welcome-start");
		btn.textContent = Loc.t("home_welcome_button_start");
	},

	onStartPressed() {
		Audio_.playClick();
		State.profile.welcomeSeen = true;
		SaveManager.save();
		this.showMenu();
	},

	// -----------------------------------------------------------------
	// ÉCRAN PRINCIPAL
	// -----------------------------------------------------------------

	showMenu() {
		document.getElementById("home-welcome").classList.add("hidden");
		document.getElementById("home-logo").classList.add("hidden");
		document.getElementById("home-menu").classList.remove("hidden");
		document.getElementById("pending-reward-overlay").classList.add("hidden");

		renderLogo(document.getElementById("home-logo-mini"));
		applyDataT(document.getElementById("home-menu"));
		document.getElementById("home-tagline").textContent = Loc.t("home_tagline");

		this.renderHeader();
		this.renderMainCard();
		this.renderDailyCard();
		this.renderBackgroundPhoto();
		this.replayEntranceAnimations();
	},

	/** Choisit la photo de fond du jour parmi celles disponibles dans le
	 * manifeste (certains emplacements peuvent encore être vides tant que
	 * l'image n'a pas été fournie). Change au plus 2 fois par jour
	 * (matin/après-midi), jamais à chaque visite — effet non agressif. */
	renderBackgroundPhoto() {
		const layer = document.getElementById("home-bg-photo");
		const available = (State.homeBackgrounds || []).filter((bg) => bg.file);
		if (available.length === 0) {
			layer.style.backgroundImage = "";
			return;
		}

		const now = new Date();
		const startOfYear = new Date(now.getFullYear(), 0, 0);
		const dayOfYear = Math.floor((now - startOfYear) / 86400000);
		const half = now.getHours() < 12 ? 0 : 1;
		const index = (dayOfYear * 2 + half) % available.length;
		const chosen = available[index];

		layer.style.backgroundImage = `url("${chosen.file}")`;
		layer.style.backgroundPosition = chosen.position || "center";
	},

	renderHeader() {
		const name = State.profile.playerName || "";
		renderAvatar(document.getElementById("home-avatar"), State.profile.avatar);

		const hour = new Date().getHours();
		const timeKey = hour < 12 ? "home_greeting_morning" : hour < 18 ? "home_greeting_afternoon" : "home_greeting_evening";
		document.getElementById("home-greeting").textContent = Loc.t(timeKey, { player_name: name });

		const lines = (Loc.tables[State.profile.language] && Loc.tables[State.profile.language].home_subtitle_lines) || [];
		document.getElementById("home-subtitle-line").textContent = lines.length
			? applyGenderMarkup(pickRandom(lines), State.profile.gender)
			: "";

		const envelope = document.getElementById("btn-home-envelope");
		envelope.classList.toggle("hidden", !State.progress.rewardActive);
	},

	getHomeState() {
		if (State.progress.rewardActive) return "reward";
		const isFresh =
			State.progress.currentChapter === 1 &&
			State.progress.currentLevel === 1 &&
			State.statistics.successes === 0;
		return isFresh ? "fresh" : "progress";
	},

	renderMainCard() {
		const state = this.getHomeState();
		const chapter = State.progress.currentChapter;
		const level = State.progress.currentLevel;
		const card = document.getElementById("home-main-card");
		const progressTrack = document.getElementById("home-main-progress-track");

		card.classList.toggle("home-main-card--reward", state === "reward");

		if (state === "reward") {
			document.getElementById("home-main-label").textContent = Loc.t("home_main_label");
			document.getElementById("home-main-title").textContent = Loc.t("home_reward_unlocked_title");
			document.getElementById("home-main-progress-text").textContent = "";
			progressTrack.classList.add("hidden");
			document.getElementById("home-main-hint").textContent = Loc.t("home_reward_unlocked_subtitle");
			document.getElementById("home-main-cta-label").textContent = Loc.t("home_cta_open_reward");
		} else if (state === "fresh") {
			document.getElementById("home-main-label").textContent = Loc.t("home_main_label");
			document.getElementById("home-main-title").textContent = Loc.t("home_chapter_title", { chapter });
			document.getElementById("home-main-progress-text").textContent = "";
			progressTrack.classList.add("hidden");
			document.getElementById("home-main-hint").textContent = Loc.t("home_fresh_hint");
			document.getElementById("home-main-cta-label").textContent = Loc.t("home_cta_start");
		} else {
			document.getElementById("home-main-label").textContent = Loc.t("home_main_label");
			document.getElementById("home-main-title").textContent = Loc.t("home_chapter_title", { chapter });
			document.getElementById("home-main-progress-text").textContent = Loc.t("home_level_progress", { level });
			progressTrack.classList.remove("hidden");
			document.getElementById("home-main-progress-fill").style.width = `${((level - 1) / 10) * 100}%`;

			const remaining = 10 - (level - 1);
			document.getElementById("home-main-hint").textContent =
				remaining <= 1 ? Loc.t("home_levels_left_one") : Loc.t("home_levels_left_other", { n: remaining });
			document.getElementById("home-main-cta-label").textContent = Loc.t("home_cta_continue");
		}
	},

	renderDailyCard() {
		const lines = (Loc.tables[State.profile.language] && Loc.tables[State.profile.language].home_daily_lines) || [];
		document.getElementById("home-daily-title").textContent = Loc.t("home_daily_title");
		if (lines.length) {
			const dayIndex = Math.floor(Date.now() / 86400000) % lines.length;
			document.getElementById("home-daily-text").textContent = applyGenderMarkup(lines[dayIndex], State.profile.gender);
		}
		document.getElementById("home-daily-cta").textContent = Loc.t("home_daily_cta");
	},

	/** Relance les animations d'entrée à chaque fois que l'accueil
	 * redevient visible (pas seulement au premier chargement). */
	replayEntranceAnimations() {
		if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		document.querySelectorAll("#home-menu .home-anim").forEach((el) => {
			el.style.animation = "none";
			void el.offsetWidth;
			el.style.animation = "";
		});
	},

	showPendingReward() {
		document.getElementById("pending-reward-text").textContent = Loc.t("home_pending_reward_text");
		document.getElementById("btn-pending-reward-continue").textContent = Loc.t("home_pending_reward_button");
		document.getElementById("pending-reward-overlay").classList.remove("hidden");
		document.getElementById("bottom-nav").classList.add("hidden");
	},
};
