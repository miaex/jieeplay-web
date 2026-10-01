// onboarding.js — équivalent Onboarding.gd

const Onboarding = {
	selectedAvatar: "",

	init() {
		renderLogo(document.getElementById("onboarding-logo"));

		document.getElementById("btn-lang-fr").addEventListener("click", () => this.chooseLanguage("fr"));
		document.getElementById("btn-lang-en").addEventListener("click", () => this.chooseLanguage("en"));
		document.getElementById("btn-gender-female").addEventListener("click", () => this.chooseGender("female"));
		document.getElementById("btn-gender-male").addEventListener("click", () => this.chooseGender("male"));

		this.buildAvatarGrid();
		document.getElementById("btn-avatar-continue").addEventListener("click", () => this.finishAvatar());

		const nameInput = document.getElementById("input-player-name");
		const btnContinue = document.getElementById("btn-name-continue");
		nameInput.addEventListener("input", () => {
			btnContinue.disabled = nameInput.value.trim().length === 0;
		});
		btnContinue.addEventListener("click", () => this.finishName(nameInput.value.trim()));
	},

	chooseLanguage(lang) {
		Audio_.playClick();
		State.profile.language = lang;
		this.showStep("step-gender");
		this.applyTexts();
	},

	chooseGender(gender) {
		Audio_.playClick();
		State.profile.gender = gender;
		this.showStep("step-avatar");
		this.applyTexts();
	},

	// -----------------------------------------------------------------
	// AVATAR — choix obligatoire parmi 5 nounours
	// -----------------------------------------------------------------

	buildAvatarGrid() {
		const grid = document.getElementById("avatar-grid");
		grid.innerHTML = "";
		AVATAR_LIST.forEach((cfg) => {
			const card = document.createElement("button");
			card.type = "button";
			card.className = "avatar-choice";
			card.dataset.avatarId = cfg.id;
			card.innerHTML = `<span class="avatar-choice-circle">${getAvatarSVG(cfg.id)}</span>`;
			card.addEventListener("click", () => this.selectAvatar(cfg.id));
			grid.appendChild(card);
		});
	},

	selectAvatar(avatarId) {
		Audio_.playClick();
		this.selectedAvatar = avatarId;
		document.querySelectorAll(".avatar-choice").forEach((el) => {
			el.classList.toggle("selected", el.dataset.avatarId === avatarId);
		});
		document.getElementById("btn-avatar-continue").disabled = false;
	},

	finishAvatar() {
		if (!this.selectedAvatar) return;
		Audio_.playClick();
		State.profile.avatar = this.selectedAvatar;
		this.showStep("step-name");
		this.applyTexts();
	},

	finishName(name) {
		if (!name) return;
		Audio_.playClick();
		State.profile.playerName = name;
		State.profile.onboardingDone = true;
		SaveManager.save();
		App.goTo("home");
	},

	showStep(stepId) {
		document.querySelectorAll(".onb-step").forEach((s) => s.classList.add("hidden"));
		document.getElementById(stepId).classList.remove("hidden");
	},

	applyTexts() {
		applyDataT(document.getElementById("view-onboarding"));
	},
};
