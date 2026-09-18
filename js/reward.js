// reward.js — équivalent Reward.gd : écran "Récompense secrète",
// système des 25 cartes (5 lots de 5 cartes façon cartes à jouer).
//
// Logique (cf. spécification) :
//   - 5 groupes, un par fragment du message final.
//   - Chaque groupe affiche 5 cartes générées à la volée (jamais 25
//     écrans codés en dur) : { variant, palette }.
//   - Les 5 cartes d'un même groupe révèlent TOUJOURS le même fragment,
//     mais rien dans l'interface ne le laisse jamais deviner : chaque
//     lot a une apparence entièrement différente, et une seule carte
//     est jamais montrée retournée à la fois. Le joueur doit croire
//     que son choix a façonné le message qu'il reçoit.

const REWARD_TOTAL_LOTS = 5;

const REWARD_CARD_VARIANTS = [
	"stars", "flower", "moon", "leaves", "heart",
	"waves", "sun", "clouds", "diamond", "mystery",
];

const REWARD_PALETTES = ["wine", "plum", "amber", "rosewood", "ivory"];

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

// Géométrie de l'éventail — 5 positions fixes, en arc.
const REWARD_FAN_LAYOUT = [
	{ rot: -18, tx: -92, ty: 22 },
	{ rot: -9, tx: -46, ty: 8 },
	{ rot: 0, tx: 0, ty: 0 },
	{ rot: 9, tx: 46, ty: 8 },
	{ rot: 18, tx: 92, ty: 22 },
];

const Reward = {
	selecting: false,

	init() {
		document.getElementById("btn-reward-continue").addEventListener("click", () => this.onContinuePressed());
		document.getElementById("btn-reward-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.replace("home");
		});
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

		this.resetStage();

		if (State.progress.rewardCompleted) {
			this.renderFinal(false);
		} else {
			this.renderGroup();
		}
	},

	resetStage() {
		document.getElementById("reward-stage").classList.add("hidden");
		document.getElementById("reward-stage").classList.remove("visible");
		document.getElementById("reward-stage-backdrop").classList.add("hidden");
		document.getElementById("reward-stage-backdrop").classList.remove("visible");
		document.getElementById("reward-stage-result").classList.add("hidden");
		document.getElementById("reward-stage-result").classList.remove("visible");
		document.getElementById("reward-stage-card").classList.remove("flipped");
		document.getElementById("btn-reward-back").classList.remove("reward-back-hidden");
		document.getElementById("bottom-nav").classList.remove("hidden");
	},

	renderProgressDots() {
		const track = document.getElementById("reward-progress-dots");
		track.innerHTML = "";
		const revealed = State.progress.rewardFragments.length;
		for (let i = 0; i < REWARD_TOTAL_LOTS; i++) {
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
		document.getElementById("reward-bottom-note").classList.remove("hidden");
		this.resetStage();
		this.selecting = false;

		const group = State.progress.rewardGroup;
		document.getElementById("reward-lot-label").textContent = Loc.t("secret_lot_label", { current: group, total: REWARD_TOTAL_LOTS });
		this.renderProgressDots();
		this.buildFan();
	},

	/** Construit les 5 cartes du lot courant, en éventail. Peu importe
	 * la carte choisie, le fragment révélé est toujours celui du groupe
	 * courant — l'illusion du choix n'est jamais explicitée. */
	buildFan() {
		const fan = document.getElementById("reward-fan");
		fan.innerHTML = "";
		fan.classList.remove("locked", "reward-fan--dim", "reward-fan--blurred");

		const variants = shuffleArray(REWARD_CARD_VARIANTS).slice(0, 5);
		const palettes = shuffleArray(REWARD_PALETTES);

		REWARD_FAN_LAYOUT.forEach((pos, i) => {
			const variant = variants[i];
			const palette = palettes[i];
			const distanceFromCenter = Math.abs(i - 2);

			const card = document.createElement("div");
			card.className = `reward-fan-card palette-${palette}`;
			card.style.setProperty("--rot", `${pos.rot}deg`);
			card.style.setProperty("--tx", `${pos.tx}px`);
			card.style.setProperty("--ty", `${pos.ty}px`);
			card.style.zIndex = 10 - distanceFromCenter * 2;
			card.style.animationDelay = `${i * 0.06}s`;
			card.innerHTML = `
				<div class="reward-card-inner">
					<div class="reward-card-face reward-card-back">
						<span class="reward-corner-mark reward-corner-tl">${REWARD_SYMBOLS[variant]}</span>
						<span class="reward-corner-mark reward-corner-br">${REWARD_SYMBOLS[variant]}</span>
						<div class="reward-card-symbol">${REWARD_SYMBOLS[variant]}</div>
					</div>
				</div>`;
			card.addEventListener("click", () => this.onCardSelected(card, variant, palette));
			fan.appendChild(card);
		});
	},

	// -----------------------------------------------------------------
	// SÉLECTION D'UNE CARTE → SCÈNE DE RÉVÉLATION EN GRAND PLAN
	// -----------------------------------------------------------------

	onCardSelected(cardEl, variant, palette) {
		if (this.selecting) return;
		this.selecting = true;
		Audio_.playClick();

		const fan = document.getElementById("reward-fan");
		fan.classList.add("locked", "reward-fan--dim");
		cardEl.classList.add("chosen");

		setTimeout(() => {
			fan.classList.add("reward-fan--blurred");
			this.presentStage(variant, palette);
		}, 220);
	},

	presentStage(variant, palette) {
		document.getElementById("btn-reward-back").classList.add("reward-back-hidden");
		document.getElementById("bottom-nav").classList.add("hidden");
		const backdrop = document.getElementById("reward-stage-backdrop");
		const stage = document.getElementById("reward-stage");
		const stageCard = document.getElementById("reward-stage-card");

		stageCard.className = `reward-stage-card palette-${palette}`;
		stageCard.querySelectorAll(".reward-card-symbol").forEach((n) => (n.innerHTML = REWARD_SYMBOLS[variant]));
		stageCard.querySelectorAll(".reward-card-back .reward-corner-mark").forEach((n) => (n.innerHTML = REWARD_SYMBOLS[variant]));
		stageCard.querySelectorAll(".reward-card-front .reward-corner-mark").forEach((n) => (n.innerHTML = REWARD_SYMBOLS[variant]));
		stageCard.querySelector(".reward-card-front-text").classList.remove("show");
		stageCard.querySelector(".reward-card-front-text").textContent = "";
		stageCard.querySelector(".reward-card-front-label").textContent = Loc.t("secret_fragment_unlocked");

		backdrop.classList.remove("hidden");
		stage.classList.remove("hidden");
		Audio_.playReward();

		requestAnimationFrame(() => {
			backdrop.classList.add("visible");
			stage.classList.add("visible");
		});

		setTimeout(() => {
			stageCard.classList.add("flipped");
			this.revealFragment(stageCard);
		}, 650);
	},

	revealFragment(stageCard) {
		const group = State.progress.rewardGroup;
		const letter = State.progress.rewardLetter;
		const fragmentText = letter && letter.fragments ? letter.fragments[group - 1] : "";

		// Le retournement dure ~600ms (voir CSS) : le texte n'apparaît
		// qu'une fois la face avant bien visible.
		setTimeout(() => {
			const textEl = stageCard.querySelector(".reward-card-front-text");
			textEl.textContent = fragmentText;
			requestAnimationFrame(() => textEl.classList.add("show"));

			// Sauvegarde immédiate : si l'app est fermée juste après ce
			// point, le fragment n'est jamais perdu et le prochain
			// lancement affiche directement le lot suivant.
			State.progress.rewardFragments.push(fragmentText);
			State.progress.rewardGroup = group + 1;
			if (State.progress.rewardGroup > REWARD_TOTAL_LOTS) {
				State.progress.rewardCompleted = true;
				this.archiveCompletedReward();
			}
			SaveManager.save();

			this.renderProgressDots();
			document.getElementById("reward-result-label").textContent = Loc.t("secret_fragment_obtained");
			document.getElementById("btn-reward-continue").textContent = Loc.t("secret_continue");
			const resultEl = document.getElementById("reward-stage-result");
			resultEl.classList.remove("hidden");
			requestAnimationFrame(() => resultEl.classList.add("visible"));
		}, 420);
	},

	/** Archive le message complet dès qu'il est entièrement révélé, pour
	 * que le joueur puisse le relire à tout moment depuis "Mes récompenses" —
	 * indépendamment du fait qu'il ait déjà appuyé sur le bouton final. */
	archiveCompletedReward() {
		const letter = State.progress.rewardLetter;
		const chapter = letter && letter.meta ? letter.meta.chapter : State.progress.currentChapter - 1;
		if (State.progress.completedRewards.some((r) => r.chapter === chapter)) return;

		State.progress.completedRewards.push({
			chapter,
			message: State.progress.rewardFragments.join("\n\n"),
			language: State.profile.language,
			date: new Date().toISOString(),
		});
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
		this.resetStage();
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
