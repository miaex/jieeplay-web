// onboarding.js — équivalent Onboarding.gd

const Onboarding = {
	init() {
		renderLogo(document.getElementById("onboarding-logo"));

		document.getElementById("btn-lang-fr").addEventListener("click", () => this.chooseLanguage("fr"));
		document.getElementById("btn-lang-en").addEventListener("click", () => this.chooseLanguage("en"));
		document.getElementById("btn-gender-female").addEventListener("click", () => this.chooseGender("female"));
		document.getElementById("btn-gender-male").addEventListener("click", () => this.chooseGender("male"));

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
