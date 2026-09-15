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
	selectionLocked: false,

	init() {
		document.getElementById("btn-clear").addEventListener("click", () => this.onClearPressed());
		document.getElementById("btn-validate").addEventListener("click", () => this.onValidatePressed());
		document.getElementById("btn-hint").addEventListener("click", () => this.onHintPressed());
		document.getElementById("btn-category-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});
		document.getElementById("btn-board-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});
	},

	show() {
		renderLogo(document.getElementById("game-logo"));
		Audio_.playMusic("menu");

		document.getElementById("btn-clear").textContent = Loc.t("level_clear");
		document.getElementById("btn-validate").textContent = Loc.t("level_validate");
		document.getElementById("btn-category-back").textContent = Loc.t("level_back_to_home");
		document.getElementById("category-title").textContent = Loc.t("level_choose_category_title");
		document.getElementById("category-eyebrow").textContent = Loc.t("level_choose_category_eyebrow");
		document.getElementById("hint-eyebrow").textContent = Loc.t("level_hint_eyebrow");
		document.getElementById("scramble-eyebrow").textContent = Loc.t("level_scramble_eyebrow");

		this.refreshHintCounter();
		this.showCategoryOverlay();
	},

	// -----------------------------------------------------------------
	// INDICES — budget de 8 par chapitre
	// -----------------------------------------------------------------

	HINTS_PER_CHAPTER: 8,

	refreshHintCounter() {
		const used = State.progress.hintsUsedThisChapter || 0;
		document.getElementById("hint-counter").textContent = Loc.t("level_hints_counter", { used, total: this.HINTS_PER_CHAPTER });
	},

	hintsExhausted() {
		return (State.progress.hintsUsedThisChapter || 0) >= this.HINTS_PER_CHAPTER;
	},

	// -----------------------------------------------------------------
	// MESSAGES DE TONTON JIEE — piochés au hasard, jamais deux fois
	// consécutivement identiques quand on peut l'éviter.
	// -----------------------------------------------------------------

	lastMessage: "",

	pickMessage(key) {
		const lang = State.profile.language || "fr";
		const table = (Loc.tables[lang] && Loc.tables[lang][key]) || (Loc.tables.fr && Loc.tables.fr[key]) || [];
		if (!table.length) return "";
		let candidates = table;
		if (table.length > 1) candidates = table.filter((m) => m !== this.lastMessage);
		const msg = pickRandom(candidates);
		this.lastMessage = msg;
		const personalized = msg.replaceAll("{player_name}", State.profile.playerName || "");
		return applyGenderMarkup(personalized, State.profile.gender);
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

		// Filtrage par genre grammatical (uniquement pertinent en français,
		// où certains mots sont des adjectifs genrés) : un mot sans genre
		// précisé convient à tout le monde, un mot genré doit correspondre
		// au genre du joueur.
		const genderKey = State.profile.gender === "male" ? "m" : State.profile.gender === "female" ? "f" : null;
		if (genderKey) {
			const genderMatched = candidates.filter((w) => !w.gender || w.gender === genderKey);
			if (genderMatched.length > 0) candidates = genderMatched;
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
		this.selectionLocked = false;
		this.refreshHintCounter();

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
		this.renderScrambleDisplay();
		document.getElementById("btn-validate").disabled = true;
		this.refreshHintButtonState();
	},

	/** Aperçu décoratif du mot mélangé, au-dessus du plateau — lettres
	 * colorées façon signature JieePlay (voir logo.js), casse alternée
	 * pour un rendu vivant type "O-r-m-b-e". Purement visuel : la vraie
	 * interaction se fait sur le clavier plus bas. */
	renderScrambleDisplay() {
		const container = document.getElementById("scramble-display");
		container.innerHTML = "";
		const letters = shuffleArray(this.currentWord.split(""));

		letters.forEach((letter, i) => {
			if (i > 0) {
				const dash = document.createElement("span");
				dash.className = "scramble-dash";
				dash.textContent = "-";
				container.appendChild(dash);
			}
			const span = document.createElement("span");
			span.className = "scramble-letter";
			span.textContent = i % 2 === 0 ? letter.toUpperCase() : letter.toLowerCase();
			span.style.color = LOGO_COLORS[i % LOGO_COLORS.length];
			span.style.animationDelay = `${i * 0.05}s`;
			container.appendChild(span);
		});
	},

	refreshHintButtonState() {
		const noEmptySlot = this.slotFill.indexOf(-1) === -1;
		document.getElementById("btn-hint").disabled = this.hintsExhausted() || noEmptySlot;
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
		this.refreshHintButtonState();
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
		this.refreshHintButtonState();
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
		this.refreshHintButtonState();
	},

	onHintPressed() {
		if (this.hintsExhausted()) return;
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
				State.progress.hintsUsedThisChapter = (State.progress.hintsUsedThisChapter || 0) + 1;
				SaveManager.save();
				this.refreshHintCounter();
				this.refreshHintButtonState();
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
		document.getElementById("game-feedback").textContent = "";
		Audio_.playSuccess();
		State.statistics.successes++;

		const newLevel = State.progress.currentLevel + 1;
		const wordFound = this.currentWord;
		const message = this.pickMessage("level_success_messages");

		this.showWordReveal(wordFound, message, () => {
			this.hideWordReveal();

			if (newLevel > 10) {
				const completedChapter = State.progress.currentChapter;
				if (!State.progress.unlockedRewards.includes(completedChapter)) {
					State.progress.unlockedRewards.push(completedChapter);
				}
				State.progress.currentChapter = completedChapter + 1;
				State.progress.currentLevel = 1;
				State.progress.hintsUsedThisChapter = 0;
				State.progress.rewardActive = true;
				State.progress.rewardCompleted = false;
				State.progress.rewardGroup = 1;
				State.progress.rewardFragments = [];

				const letter = RewardEngine.generateReward({
					language: State.profile.language || "fr",
					playerName: State.profile.playerName,
					chapter: completedChapter,
					history: State.progress.rewardHistory,
				});
				State.progress.rewardLetter = letter;
				State.progress.rewardHistory.push(letter.meta);

				SaveManager.save();
				Nav.push("reward");
			} else {
				State.progress.currentLevel = newLevel;
				SaveManager.save();
				this.showCategoryOverlay();
			}
		});
	},

	// -----------------------------------------------------------------
	// RÉVÉLATION DU MOT — plateau flouté au second plan, mot + pique de
	// Tonton Jiee au premier plan, pluie de confettis. Le joueur décide
	// lui-même quand passer à la suite.
	// -----------------------------------------------------------------

	showWordReveal(word, message, onContinue) {
		document.getElementById("game-board").classList.add("blurred");
		document.getElementById("bottom-nav").classList.add("hidden");
		document.getElementById("word-reveal-word").textContent = word;
		document.getElementById("word-reveal-message").textContent = message;

		const continueBtn = document.getElementById("btn-word-reveal-continue");
		continueBtn.textContent = Loc.t("level_word_reveal_continue");
		continueBtn.onclick = () => {
			Audio_.playClick();
			onContinue();
		};

		const overlay = document.getElementById("word-reveal-overlay");
		overlay.classList.remove("hidden");
		requestAnimationFrame(() => overlay.classList.add("visible"));

		this.spawnConfetti();
		this.spawnFireworks();
	},

	hideWordReveal() {
		document.getElementById("game-board").classList.remove("blurred");
		document.getElementById("bottom-nav").classList.remove("hidden");
		const overlay = document.getElementById("word-reveal-overlay");
		overlay.classList.remove("visible");
		overlay.classList.add("hidden");
		document.getElementById("confetti-layer").innerHTML = "";
	},

	spawnConfetti() {
		const layer = document.getElementById("confetti-layer");
		layer.innerHTML = "";
		Audio_.playConfetti();

		const colors = ["#e79292", "#c98bb0", "#d9b06c", "#7a3b4a", "#f3d9d6", "#e6dcec"];
		const pieceCount = 34;
		const starCount = 12;

		for (let i = 0; i < pieceCount; i++) {
			const piece = document.createElement("span");
			piece.className = "confetti-piece";
			const left = Math.random() * 100;
			const duration = 1.6 + Math.random() * 1.1;
			const delay = Math.random() * 0.35;
			const rotation = 180 + Math.random() * 540;
			const color = colors[Math.floor(Math.random() * colors.length)];
			const size = 6 + Math.random() * 5;

			piece.style.left = `${left}%`;
			piece.style.width = `${size}px`;
			piece.style.height = `${size * 1.6}px`;
			piece.style.background = color;
			piece.style.animationDuration = `${duration}s`;
			piece.style.animationDelay = `${delay}s`;
			piece.style.setProperty("--confetti-rot", `${rotation}deg`);

			layer.appendChild(piece);
		}

		// Petites étoiles cristallines, en plus des confettis classiques
		const starGlyphs = ["✦", "✧", "⋆"];
		for (let i = 0; i < starCount; i++) {
			const star = document.createElement("span");
			star.className = "confetti-star";
			const left = Math.random() * 100;
			const fallDuration = 1.8 + Math.random() * 1.2;
			const fallDelay = Math.random() * 0.5;
			const rotation = 180 + Math.random() * 360;
			const size = 12 + Math.random() * 10;
			const isGold = Math.random() > 0.5;

			star.style.left = `${left}%`;
			star.style.animationDuration = `${fallDuration}s`;
			star.style.animationDelay = `${fallDelay}s`;
			star.style.setProperty("--confetti-rot", `${rotation}deg`);

			const inner = document.createElement("span");
			inner.className = "confetti-star-inner";
			inner.textContent = starGlyphs[Math.floor(Math.random() * starGlyphs.length)];
			inner.style.fontSize = `${size}px`;
			inner.style.color = isGold ? "#d9b06c" : "#ffffff";
			inner.style.textShadow = isGold
				? "0 0 6px rgba(217,176,108,0.85)"
				: "0 0 6px rgba(255,255,255,0.9)";
			inner.style.animationDuration = `${0.5 + Math.random() * 0.4}s`;
			inner.style.animationDelay = `${Math.random() * 0.3}s`;

			star.appendChild(inner);
			layer.appendChild(star);
		}
	},

	/** Petit feu d'artifice qui part du bas de l'écran : une fusée monte,
	 * puis éclate en une pluie de particules à son point culminant.
	 * Se superpose aux confettis pour un effet plus spectaculaire. */
	spawnFireworks() {
		const layer = document.getElementById("confetti-layer");
		const palette = ["#e79292", "#c98bb0", "#d9b06c", "#f3d9d6", "#ffffff", "#a080b3"];
		const rocketCount = 3;

		for (let i = 0; i < rocketCount; i++) {
			const launchDelay = i * 220 + Math.random() * 120;

			setTimeout(() => {
				const xPercent = 18 + Math.random() * 64;
				const riseHeight = 34 + Math.random() * 22;
				const riseDuration = 0.55 + Math.random() * 0.2;
				const color = palette[Math.floor(Math.random() * palette.length)];

				const rocket = document.createElement("span");
				rocket.className = "firework-rocket";
				rocket.style.left = `${xPercent}%`;
				rocket.style.background = color;
				rocket.style.boxShadow = `0 0 8px 2px ${color}`;
				rocket.style.setProperty("--rise-height", `${riseHeight}vh`);
				rocket.style.animationDuration = `${riseDuration}s`;
				layer.appendChild(rocket);

				setTimeout(() => {
					const rect = rocket.getBoundingClientRect();
					const layerRect = layer.getBoundingClientRect();
					const burstX = rect.left - layerRect.left + rect.width / 2;
					const burstY = rect.top - layerRect.top + rect.height / 2;
					rocket.remove();
					this.burstFirework(layer, burstX, burstY, palette);
				}, riseDuration * 1000);
			}, launchDelay);
		}
	},

	burstFirework(layer, x, y, palette) {
		const particleCount = 16;
		for (let i = 0; i < particleCount; i++) {
			const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
			const distance = 45 + Math.random() * 55;
			const dx = Math.cos(angle) * distance;
			const dy = Math.sin(angle) * distance + 18; // légère gravité vers le bas
			const color = palette[Math.floor(Math.random() * palette.length)];

			const particle = document.createElement("span");
			particle.className = "firework-particle";
			particle.style.left = `${x}px`;
			particle.style.top = `${y}px`;
			particle.style.background = color;
			particle.style.boxShadow = `0 0 4px 1px ${color}`;
			particle.style.setProperty("--dx", `${dx}px`);
			particle.style.setProperty("--dy", `${dy}px`);
			particle.style.animationDelay = `${Math.random() * 0.05}s`;

			layer.appendChild(particle);
			setTimeout(() => particle.remove(), 1100);
		}
	},

	onFailure() {
		document.getElementById("game-feedback").textContent = this.pickMessage("level_failure_messages");
		Audio_.playFailure();
		State.statistics.failures++;

		const tilesRow = document.getElementById("tiles-row");
		tilesRow.classList.remove("shake");
		void tilesRow.offsetWidth;
		tilesRow.classList.add("shake");

		this.onClearPressed();
	},
};
