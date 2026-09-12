// reward.js — équivalent Reward.gd : écran "Récompense secrète",
// système des 100 cartes (10 lots de 10, illusion du choix jamais
// expliquée au joueur — cf. spécification fournie).
//
// Logique des 100 cartes (§25-26 de la spec) :
//   - 10 groupes de 10 cartes chacun.
//   - Les 10 cartes d'un même groupe révèlent TOUJOURS le même fragment.
//   - Seule leur apparence (variant + couleur) change.
//   - On ne génère jamais 100 écrans : chaque carte n'est qu'une petite
//     structure { variant, palette }, générée à la volée pour le groupe
//     courant.

const REWARD_CARD_VARIANTS = [
	"stars", "flower", "moon", "leaves", "heart",
	"waves", "sun", "clouds", "diamond", "mystery",
];

const REWARD_PALETTES = [
	"rose", "corail", "creme", "blanc", "mauve", "bordeaux", "or",
];

const REWARD_SYMBOLS = {
	stars: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M24 6 L27 21 L42 24 L27 27 L24 42 L21 27 L6 24 L21 21 Z"/><circle cx="36" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="10" cy="34" r="1.3" fill="currentColor" stroke="none"/></svg>',
	flower: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="24" cy="16" r="7"/><circle cx="24" cy="32" r="7"/><circle cx="14" cy="24" r="7"/><circle cx="34" cy="24" r="7"/><circle cx="24" cy="24" r="4" fill="currentColor" stroke="none"/></svg>',
	moon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M30 8a16 16 0 1 0 0 32 12.5 12.5 0 0 1 0-32Z"/></svg>',
	leaves: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 34C12 20 22 10 34 8c2 12-8 22-22 26Z"/><path d="M36 34C36 20 26 10 14 8c-2 12 8 22 22 26Z" opacity="0.55"/><line x1="24" y1="40" x2="24" y2="12"/></svg>',
	heart: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M24 40C10 30 6 22 6 15a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 7-4 15-18 25Z"/></svg>',
	waves: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6 18c4-6 10-6 14 0s10 6 14 0 10-6 14 0"/><path d="M6 30c4-6 10-6 14 0s10 6 14 0 10-6 14 0" opacity="0.55"/></svg>',
	sun: '<svg viewBox="0 0 48 48" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"><circle cx="24" cy="24" r="9"/><line x1="24" y1="4" x2="24" y2="10"/><line x1="24" y1="38" x2="24" y2="44"/><line x1="4" y1="24" x2="10" y2="24"/><line x1="38" y1="24" x2="44" y2="24"/><line x1="9" y1="9" x2="13" y2="13"/><line x1="35" y1="35" x2="39" y2="39"/><line x1="9" y1="39" x2="13" y2="35"/><line x1="35" y1="13" x2="39" y2="9"/></svg>',
	clouds: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 30a7 7 0 0 1-1-13.9A9 9 0 0 1 30 13a7.5 7.5 0 0 1 3 14.4"/><path d="M13 30h20"/><circle cx="8" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="38" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',
	diamond: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M24 6 L38 20 L24 42 L10 20 Z"/><path d="M10 20 L38 20"/><path d="M17 20 L24 6 L31 20"/></svg>',
	mystery: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M24 24c6 0 10-4 10-9s-4-8-8-8-7 3-7 7 3 6 6 6 5-2 5-5-2-4-4-4"/><circle cx="24" cy="24" r="17" opacity="0.4" stroke-width="1" stroke-dasharray="2 4"/></svg>',
};

const Reward = {
	selecting: false,

	init() {
		document.getElementById("btn-reward-continue").addEventListener("click", () => this.onContinuePressed());
	},

	show() {
		Audio_.playMusic("reward");

		document.getElementById("reward-title").textContent = Loc.t("secret_title");
		document.getElementById("reward-subtitle").textContent = Loc.t("secret_subtitle");
		document.getElementById("reward-choose-title").textContent = Loc.t("secret_choose_title");
		document.getElementById("reward-choose-desc").textContent = Loc.t("secret_choose_desc");
		document.getElementById("reward-select-label").textContent = Loc.t("secret_select_label");
		document.getElementById("reward-tip-text").textContent = Loc.t("secret_tip");
		document.getElementById("reward-assembling-text").textContent = Loc.t("secret_assembling");
		document.getElementById("reward-final-title").textContent = Loc.t("secret_final_title");
		document.getElementById("btn-reward-final-continue").textContent = Loc.t("reward_continue");

		if (State.progress.rewardCompleted) {
			this.renderFinal(false);
		} else {
			this.renderGroup();
		}
	},

	// -----------------------------------------------------------------
	// PROGRESSION (ZONE B)
	// -----------------------------------------------------------------

	renderProgressDots() {
		const track = document.getElementById("reward-progress-dots");
		track.innerHTML = "";
		const revealed = State.progress.rewardFragments.length;
		for (let i = 0; i < 10; i++) {
			const dot = document.createElement("span");
			dot.className = "reward-dot" + (i < revealed ? " filled" : "");
			track.appendChild(dot);
		}
	},

	// -----------------------------------------------------------------
	// LOT COURANT (ZONES C + D + E)
	// -----------------------------------------------------------------

	renderGroup() {
		document.getElementById("reward-final").classList.add("hidden");
		document.getElementById("reward-flow").classList.remove("hidden");
		document.getElementById("reward-result").classList.add("hidden");
		document.getElementById("reward-grid-wrap").classList.remove("hidden");
		document.getElementById("reward-bottom-note").classList.remove("hidden");
		this.selecting = false;

		const group = State.progress.rewardGroup;
		document.getElementById("reward-lot-label").textContent = Loc.t("secret_lot_label", { current: group, total: 10 });
		this.renderProgressDots();
		this.buildGrid();
	},

	/** Construit dynamiquement les 10 cartes du lot courant. Les 10
	 * variantes visuelles sont mélangées à chaque lot, mais quelle que
	 * soit la carte choisie, le fragment révélé est toujours le même
	 * (celui du groupe courant) — l'illusion du choix n'est jamais
	 * expliquée au joueur. */
	buildGrid() {
		const grid = document.getElementById("reward-grid");
		grid.innerHTML = "";

		const variants = shuffleArray(REWARD_CARD_VARIANTS);

		variants.forEach((variant, i) => {
			const palette = REWARD_PALETTES[i % REWARD_PALETTES.length];
			const card = document.createElement("div");
			card.className = `reward-card palette-${palette}`;
			card.innerHTML = `
				<div class="reward-card-inner">
					<div class="reward-card-face reward-card-back">
						<div class="reward-card-symbol">${REWARD_SYMBOLS[variant]}</div>
						<span class="reward-card-number">${String(i + 1).padStart(2, "0")}</span>
					</div>
					<div class="reward-card-face reward-card-front">
						<span class="reward-card-front-label"></span>
						<p class="reward-card-front-text"></p>
					</div>
				</div>`;
			card.addEventListener("click", () => this.onCardSelected(card));
			grid.appendChild(card);
		});
	},

	// -----------------------------------------------------------------
	// SÉLECTION D'UNE CARTE
	// -----------------------------------------------------------------

	onCardSelected(cardEl) {
		if (this.selecting) return;
		this.selecting = true;
		Audio_.playClick();

		const grid = document.getElementById("reward-grid");
		Array.from(grid.children).forEach((c) => {
			c.classList.add("locked");
			if (c !== cardEl) c.classList.add("dimmed");
		});
		cardEl.classList.add("chosen");

		setTimeout(() => {
			cardEl.classList.add("flipped");
			Audio_.playReward();
			this.revealFragment(cardEl);
		}, 200);
	},

	revealFragment(cardEl) {
		const group = State.progress.rewardGroup;
		const lang = State.profile.language || "fr";
		const tone = State.progress.rewardTone;
		const entry = State.rewardMessages.find((r) => r.language === lang && r.tone === tone);
		const rawFragment = entry ? entry.fragments[group - 1] : "";
		const fragmentText = rawFragment.replaceAll("{player_name}", State.profile.playerName);

		// Le retournement dure ~550ms (voir CSS) : on laisse la face avant
		// apparaître avant d'afficher le texte du fragment.
		setTimeout(() => {
			cardEl.querySelector(".reward-card-front-label").textContent = Loc.t("secret_fragment_unlocked");
			const textEl = cardEl.querySelector(".reward-card-front-text");
			textEl.textContent = fragmentText;
			requestAnimationFrame(() => textEl.classList.add("show"));

			// Sauvegarde immédiate : si l'app est fermée juste après ce point,
			// le fragment n'est jamais perdu et le prochain lancement affiche
			// directement le lot suivant (§30 de la spec).
			State.progress.rewardFragments.push(fragmentText);
			State.progress.rewardGroup = group + 1;
			if (State.progress.rewardGroup > 10) {
				State.progress.rewardCompleted = true;
			}
			SaveManager.save();

			this.showResultFooter();
		}, 350);
	},

	showResultFooter() {
		document.getElementById("reward-grid-wrap").classList.add("hidden");
		document.getElementById("reward-bottom-note").classList.add("hidden");
		document.getElementById("reward-result").classList.remove("hidden");
		document.getElementById("reward-result-label").textContent = Loc.t("secret_fragment_obtained");
		document.getElementById("btn-reward-continue").textContent = Loc.t("secret_continue");
		this.renderProgressDots();
	},

	onContinuePressed() {
		Audio_.playClick();
		if (State.progress.rewardCompleted) {
			this.renderFinal(true);
		} else {
			this.renderGroup();
		}
	},

	// -----------------------------------------------------------------
	// MESSAGE FINAL (après le 10e fragment)
	// -----------------------------------------------------------------

	renderFinal(withAssembling) {
		document.getElementById("reward-flow").classList.add("hidden");
		document.getElementById("reward-final").classList.remove("hidden");

		const assembling = document.getElementById("reward-assembling");
		const content = document.getElementById("reward-final-content");

		const showContent = () => {
			document.getElementById("reward-final-message").textContent =
				State.progress.rewardFragments.join("\n\n");
			assembling.classList.add("hidden");
			content.classList.remove("hidden");
		};

		if (withAssembling) {
			content.classList.add("hidden");
			assembling.classList.remove("hidden");
			Audio_.playReward();
			setTimeout(showContent, 900);
		} else {
			assembling.classList.add("hidden");
			showContent();
		}

		document.getElementById("btn-reward-final-continue").onclick = () => {
			Audio_.playClick();
			State.progress.rewardActive = false;
			SaveManager.save();
			Nav.replace("home");
		};
	},
};
