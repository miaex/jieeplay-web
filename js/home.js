// home.js — équivalent Home.gd

const Home = {
	init() {
		document.getElementById("btn-welcome-start").addEventListener("click", () => this.onStartPressed());
		document.getElementById("btn-continue").addEventListener("click", () => {
			Audio_.playClick();
			Nav.push("game-category");
		});
		document.getElementById("btn-journey").addEventListener("click", () => {
			Audio_.playClick();
			Nav.push("journey");
		});
		document.getElementById("btn-rewards").addEventListener("click", () => {
			Audio_.playClick();
			Nav.push("rewards-list");
		});
		document.getElementById("btn-settings").addEventListener("click", () => {
			Audio_.playClick();
			Nav.push("settings");
		});
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
		document.getElementById("home-welcome").classList.remove("hidden");
		document.getElementById("home-menu").classList.add("hidden");

		document.getElementById("home-welcome-body").textContent =
			Loc.t("home_welcome_body", { player_name: State.profile.playerName });
		document.getElementById("home-welcome-question").textContent = Loc.tGendered("home_welcome_question");

		const btn = document.getElementById("btn-welcome-start");
		btn.textContent = Loc.t("home_welcome_button_start");
	},

	showMenu() {
		document.getElementById("home-welcome").classList.add("hidden");
		document.getElementById("home-menu").classList.remove("hidden");

		document.getElementById("home-greeting").textContent =
			Loc.t("menu_greeting", { player_name: State.profile.playerName });

		document.getElementById("btn-continue").textContent = Loc.t("menu_continue");

		applyDataT(document.getElementById("home-menu"));

		const level = State.progress.currentLevel;
		const chapter = State.progress.currentChapter;
		document.getElementById("secret-title").textContent = Loc.t("home_secret_title");
		document.getElementById("secret-subtitle").textContent =
			Loc.t("home_secret_subtitle", { chapter, level });
		document.getElementById("secret-progress-fill").style.width = `${((level - 1) / 10) * 100}%`;
	},

	onStartPressed() {
		Audio_.playClick();
		State.profile.welcomeSeen = true;
		SaveManager.save();
		this.showMenu();
	},
};
