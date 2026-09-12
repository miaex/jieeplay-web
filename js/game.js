// game.js — équivalent Level.gd : choix de catégorie en overlay,
// anagramme jouable avec lettres pré-placées, suppression individuelle,
// indice, et progression de chapitre.

const Game = {
	currentWord: "",
	currentHint: "",
	currentCategory: "",

	shuffledLetters: [],
	tileUsed: [],
	freePositions: [],
	lockedPositions: {},
	slotFill: [],
	hintUsedThisLevel: false,
	selectionLocked: false,

	init() {
		document.getElementById("btn-clear").addEventListener("click", () => this.onClearPressed());
		document.getElementById("btn-validate").addEventListener("click", () => this.onValidatePressed());
		document.getElementById("btn-hint").addEventListener("click", () => this.onHintPressed());
		document.getElementById("btn-category-back").addEventListener("click", () => {
			Audio_.playClick();
			App.goTo("home");
		});
	},

	show() {
		renderLogo(document.getElementById("game-logo"));
		Audio_.playMusic("menu");

		document.getElementById("btn-clear").textContent = Loc.t("level_clear");
		document.getElementById("btn-validate").textContent = Loc.t("level_validate");
		document.getElementById("btn-category-back").textContent = Loc.t("level_back_to_home");
		document.getElementById("category-title").textContent = Loc.t("level_choose_category_title");

		this.showCategoryOverlay();
	},

	// -----------------------------------------------------------------
	// OVERLAY : choix de catégorie
	// -----------------------------------------------------------------

	showCategoryOverlay() {
		const overlay = document.getElementById("category-overlay");
		overlay.classList.remove("hidden-overlay");

		const grid = document.getElementById("category-grid");
		grid.innerHTML = "";

		const lang = State.profile.language;
		State.categories.forEach((cat) => {
			const btn = document.createElement("button");
			btn.className = "category-btn";
			const label = lang === "fr" ? cat.label_fr : cat.label_en;
			btn.innerHTML = `<span class="cat-emoji">${cat.emoji}</span><span>${label}</span>`;
			btn.addEventListener("click", () => this.onCategorySelected(cat.id));
			grid.appendChild(btn);
		});
	},

	hideCategoryOverlay() {
		document.getElementById("category-overlay").classList.add("hidden-overlay");
	},

	onCategorySelected(categoryId) {
		Audio_.playClick();
		State.registerCategoryChoice(categoryId);
		this.currentCategory = categoryId;
		this.pickWordForCategory(categoryId);
		this.setupAnagram();
		this.hideCategoryOverlay();
	},

	// -----------------------------------------------------------------
	// SÉLECTION DU MOT (sans répétition immédiate)
	// -----------------------------------------------------------------

	pickWordForCategory(categoryId) {
		const lang = State.profile.language;
		let candidates = State.words.filter((w) => w.category === categoryId && w.language === lang);

		if (candidates.length === 0) {
			this.currentWord = lang === "fr" ? "JOUER" : "PLAY";
			this.currentHint = "";
			return;
		}

		const used = State.usedWordsByCategory[categoryId] || [];
		let fresh = candidates.filter((w) => !used.includes(w.word));
		if (fresh.length === 0) {
			fresh = candidates;
			State.usedWordsByCategory[categoryId] = [];
		}

		const chosen = pickRandom(fresh);
		this.currentWord = chosen.word.toUpperCase();
		this.currentHint = chosen.hint;

		State.usedWordsByCategory[categoryId] = [...(State.usedWordsByCategory[categoryId] || []), chosen.word];
	},

	// -----------------------------------------------------------------
	// ANAGRAMME
	// -----------------------------------------------------------------

	setupAnagram() {
		document.getElementById("hint-text").textContent = this.currentHint;
		document.getElementById("game-feedback").textContent = "";
		this.hintUsedThisLevel = false;
		this.selectionLocked = false;
		document.getElementById("btn-hint").disabled = false;

		const wordLength = this.currentWord.length;
		const lockCount = Math.min(wordLength <= 6 ? 1 : 2, Math.max(wordLength - 2, 0));

		const allPositions = shuffleArray([...Array(wordLength).keys()]);
		this.lockedPositions = {};
		for (let i = 0; i < lockCount; i++) {
			this.lockedPositions[allPositions[i]] = this.currentWord[allPositions[i]];
		}

		this.freePositions = [];
		for (let i = 0; i < wordLength; i++) {
			if (!(i in this.lockedPositions)) this.freePositions.push(i);
		}

		let pool = this.currentWord.split("");
		for (const pos in this.lockedPositions) {
			const idx = pool.indexOf(this.lockedPositions[pos]);
			if (idx !== -1) pool.splice(idx, 1);
		}
		this.shuffledLetters = shuffleArray(pool);
		this.tileUsed = this.shuffledLetters.map(() => false);
		this.slotFill = this.freePositions.map(() => -1);

		this.rebuildTiles();
		this.rebuildSlots();
		document.getElementById("btn-validate").disabled = true;
	},

	rebuildTiles() {
		const row = document.getElementById("tiles-row");
		row.innerHTML = "";
		this.shuffledLetters.forEach((letter, i) => {
			const tile = document.createElement("div");
			tile.className = "tile";
			tile.textContent = letter;
			tile.addEventListener("click", () => this.onTilePressed(i));
			row.appendChild(tile);
		});
	},

	rebuildSlots() {
		const row = document.getElementById("answer-row");
		row.innerHTML = "";
		for (let pos = 0; pos < this.currentWord.length; pos++) {
			const slot = document.createElement("div");
			const isLocked = pos in this.lockedPositions;
			slot.className = "slot" + (isLocked ? " locked" : "");
			if (isLocked) {
				slot.textContent = this.lockedPositions[pos];
			} else {
				const freeIndex = this.freePositions.indexOf(pos);
				slot.addEventListener("click", () => this.onSlotPressed(freeIndex));
			}
			row.appendChild(slot);
		}
		this.refreshSlots();
	},

	refreshSlots() {
		const row = document.getElementById("answer-row");
		const slotEls = row.children;
		for (let pos = 0; pos < this.currentWord.length; pos++) {
			if (pos in this.lockedPositions) continue;
			const freeIndex = this.freePositions.indexOf(pos);
			const tileIndex = this.slotFill[freeIndex];
			const slotEl = slotEls[pos];
			if (tileIndex !== -1) {
				slotEl.textContent = this.shuffledLetters[tileIndex];
				slotEl.classList.add("filled");
			} else {
				slotEl.textContent = "";
				slotEl.classList.remove("filled");
			}
		}
	},

	onTilePressed(tileIndex) {
		if (this.tileUsed[tileIndex]) return;
		const targetK = this.slotFill.indexOf(-1);
		if (targetK === -1) return;

		this.slotFill[targetK] = tileIndex;
		this.tileUsed[tileIndex] = true;
		this.refreshTileStates();
		this.refreshSlots();
		this.animateSlotPop(this.freePositions[targetK]);
		this.updateValidateState();
		Audio_.playTile();
	},

	onSlotPressed(freeIndex) {
		if (freeIndex < 0) return;
		const tileIndex = this.slotFill[freeIndex];
		if (tileIndex === -1) return;

		this.slotFill[freeIndex] = -1;
		this.tileUsed[tileIndex] = false;
		this.refreshTileStates();
		this.refreshSlots();
		this.updateValidateState();
	},

	refreshTileStates() {
		const tiles = document.getElementById("tiles-row").children;
		this.tileUsed.forEach((used, i) => {
			tiles[i].classList.toggle("used", used);
		});
	},

	updateValidateState() {
		document.getElementById("btn-validate").disabled = this.slotFill.includes(-1);
	},

	onClearPressed() {
		this.slotFill.forEach((tileIndex, i) => {
			if (tileIndex !== -1) this.tileUsed[tileIndex] = false;
			this.slotFill[i] = -1;
		});
		this.refreshTileStates();
		this.refreshSlots();
		document.getElementById("btn-validate").disabled = true;
		document.getElementById("game-feedback").textContent = "";
	},

	onHintPressed() {
		if (this.hintUsedThisLevel) return;
		const k = this.slotFill.indexOf(-1);
		if (k === -1) return;

		const targetPos = this.freePositions[k];
		const needed = this.currentWord[targetPos];

		for (let i = 0; i < this.shuffledLetters.length; i++) {
			if (!this.tileUsed[i] && this.shuffledLetters[i] === needed) {
				this.slotFill[k] = i;
				this.tileUsed[i] = true;
				this.refreshTileStates();
				this.refreshSlots();
				this.animateSlotPop(targetPos);
				this.updateValidateState();
				this.hintUsedThisLevel = true;
				document.getElementById("btn-hint").disabled = true;
				Audio_.playClick();
				break;
			}
		}
	},

	animateSlotPop(pos) {
		const slotEl = document.getElementById("answer-row").children[pos];
		slotEl.classList.remove("pop");
		void slotEl.offsetWidth;
		slotEl.classList.add("pop");
	},

	onValidatePressed() {
		let built = "";
		for (let pos = 0; pos < this.currentWord.length; pos++) {
			if (pos in this.lockedPositions) {
				built += this.lockedPositions[pos];
			} else {
				const freeIndex = this.freePositions.indexOf(pos);
				built += this.shuffledLetters[this.slotFill[freeIndex]];
			}
		}

		if (built === this.currentWord) {
			this.onSuccess();
		} else {
			this.onFailure();
		}
	},

	onSuccess() {
		document.getElementById("game-feedback").textContent = Loc.t("level_success_message");
		Audio_.playSuccess();
		State.statistics.successes++;

		const newLevel = State.progress.currentLevel + 1;

		setTimeout(() => {
			if (newLevel > 10) {
				const completedChapter = State.progress.currentChapter;
				if (!State.progress.unlockedRewards.includes(completedChapter)) {
					State.progress.unlockedRewards.push(completedChapter);
				}
				State.progress.currentChapter = completedChapter + 1;
				State.progress.currentLevel = 1;
				State.progress.rewardActive = true;
				State.progress.rewardCompleted = false;
				State.progress.rewardFragments = [];
				SaveManager.save();
				App.goTo("reward");
			} else {
				State.progress.currentLevel = newLevel;
				SaveManager.save();
				this.showCategoryOverlay();
			}
		}, 1100);
	},

	onFailure() {
		document.getElementById("game-feedback").textContent = Loc.t("level_failure_message");
		Audio_.playFailure();
		State.statistics.failures++;

		const tilesRow = document.getElementById("tiles-row");
		tilesRow.classList.remove("shake");
		void tilesRow.offsetWidth;
		tilesRow.classList.add("shake");

		this.onClearPressed();
	},
};
