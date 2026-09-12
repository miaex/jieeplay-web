// save.js — persistance locale (§5). Utilise localStorage pour la V1 ;
// la structure est volontairement plate et sérialisable pour faciliter
// une migration future vers IndexedDB si besoin.

const SAVE_KEY = "jieeplay_save_v1";

const SaveManager = {
	hasSave() {
		return localStorage.getItem(SAVE_KEY) !== null;
	},

	save() {
		const data = {
			profile: State.profile,
			progress: State.progress,
			statistics: State.statistics,
			settings: State.settings,
			categoryChoiceHistory: State.categoryChoiceHistory,
			usedWordsByCategory: State.usedWordsByCategory,
		};
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify(data));
		} catch (e) {
			console.error("SaveManager: échec de la sauvegarde", e);
		}
	},

	load() {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return false;
		try {
			const data = JSON.parse(raw);
			if (data.profile) Object.assign(State.profile, data.profile);
			if (data.progress) Object.assign(State.progress, data.progress);
			if (data.statistics) Object.assign(State.statistics, data.statistics);
			if (data.settings) Object.assign(State.settings, data.settings);
			if (data.categoryChoiceHistory) State.categoryChoiceHistory = data.categoryChoiceHistory;
			if (data.usedWordsByCategory) State.usedWordsByCategory = data.usedWordsByCategory;
			return true;
		} catch (e) {
			console.error("SaveManager: sauvegarde corrompue", e);
			return false;
		}
	},

	resetProgress() {
		const language = State.profile.language;
		State.profile = { language, gender: "", playerName: "", onboardingDone: false, welcomeSeen: false };
		State.progress = {
			currentChapter: 1, currentLevel: 1, unlockedRewards: [],
			rewardActive: false, rewardCompleted: false, rewardTone: "", rewardGroup: 1, rewardFragments: [],
		};
		State.statistics = { successes: 0, failures: 0 };
		State.categoryChoiceHistory = [];
		State.usedWordsByCategory = {};
		this.save();
	},
};
