// state.js — état central du jeu, équivalent de GameData.gd côté Godot.
// Contient les données du jeu (chargées depuis data/) et l'état du joueur
// (persisté via save.js).

const State = {
	// --- Données du jeu (lecture seule, chargées au démarrage) ---
	categories: [],
	words: [],
	rewardEngineContent: null,
	homeBackgrounds: [],
	games: [],

	// --- Données du joueur (persistées) ---
	profile: {
		language: "",
		gender: "",
		avatar: "",
		playerName: "",
		playerId: "",
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
		rewardLetter: null,
		rewardHistory: [],
		completedRewards: [],
		hintsUsedThisChapter: 0,
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
		this.rewardEngineContent = await fetchJSON("data/rewards/content.json");
		this.homeBackgrounds = await fetchJSON("data/home-backgrounds.json");
		this.games = await fetchJSON("data/games.json");
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
