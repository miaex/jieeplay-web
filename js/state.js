// state.js — état central du jeu, équivalent de GameData.gd côté Godot.
// Contient les données du jeu (chargées depuis data/) et l'état du joueur
// (persisté via save.js).

const State = {
	// --- Données du jeu (lecture seule, chargées au démarrage) ---
	categories: [],
	words: [],
	rewardMessages: [],

	// --- Données du joueur (persistées) ---
	profile: {
		language: "",
		gender: "",
		playerName: "",
		onboardingDone: false,
		welcomeSeen: false,
	},

	progress: {
		currentChapter: 1,
		currentLevel: 1,
		unlockedRewards: [],
		rewardActive: false,
		rewardCompleted: false,
		rewardTone: "",
		rewardGroup: 1,
		rewardFragments: [],
	},

	statistics: {
		successes: 0,
		failures: 0,
	},

	settings: {
		sfxEnabled: true,
		musicEnabled: true,
		vibrationEnabled: true,
	},

	categoryChoiceHistory: [],
	usedWordsByCategory: {},

	async loadGameData() {
		this.categories = await fetchJSON("data/categories.json");
		this.words = await fetchJSON("data/words.json");
		this.rewardMessages = await fetchJSON("data/rewards.json");
	},

	registerCategoryChoice(categoryId) {
		this.categoryChoiceHistory.push(categoryId);
	},

	getTopCategories(n = 3) {
		const counts = {};
		for (const c of this.categoryChoiceHistory) {
			counts[c] = (counts[c] || 0) + 1;
		}
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, n)
			.map(([id]) => id);
	},
};
