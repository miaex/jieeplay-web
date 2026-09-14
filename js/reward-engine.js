// reward-engine.js — RewardEngine v2 : remplace l'ancien cycle de tons
// fixes par un vrai moteur éditorial (idées, émotions, métaphores,
// structures, vocabulaire), avec sélection pondérée par score et
// mémoire anti-répétition par joueur. Le contenu vit entièrement dans
// data/rewards/content.json (CONTENU != CODE) : ce fichier ne contient
// que la logique de composition.
//
// Intégration minimale avec l'existant :
//   - game.js appelle RewardEngine.generateReward(...) au moment où un
//     chapitre se termine, et stocke le résultat dans
//     State.progress.rewardLetter.
//   - reward.js lit simplement rewardLetter.fragments[group-1], comme
//     avant avec l'ancien rewards.json — l'écran de récompense n'a pas
//     besoin de savoir comment le texte a été généré.

const TONE_CYCLE = ["affectionate", "admiring", "playful", "comforting", "mysterious", "warm"];
const RARE_PROBABILITY = 0.08;
const HISTORY_WINDOW = 8; // nb de récompenses passées prises en compte pour le cooldown

const RewardEngine = {
	content: null,

	load(content) {
		this.content = content;
	},

	// -----------------------------------------------------------------
	// BIBLIOTHÈQUES (lecture)
	// -----------------------------------------------------------------

	findIdea(ideaId) {
		return this.content.ideas.find((i) => i.id === ideaId);
	},

	familyOf(ideaId) {
		const idea = this.findIdea(ideaId);
		return idea ? idea.family : null;
	},

	isRelated(ideaIdA, ideaIdB) {
		if (ideaIdA === ideaIdB) return false;
		const idea = this.findIdea(ideaIdA);
		return !!(idea && idea.related_ideas && idea.related_ideas.includes(ideaIdB));
	},

	// -----------------------------------------------------------------
	// SÉLECTION — score = compatibilité - répétition - similarité + hasard contrôlé
	// -----------------------------------------------------------------

	scoreCandidate(candidate, history) {
		let score = 10;
		const recent = (history || []).slice(-HISTORY_WINDOW);

		recent.forEach((h, i) => {
			const stepsAgo = recent.length - i; // 1 = le plus récent
			const weight = Math.max(0, (HISTORY_WINDOW - stepsAgo) / HISTORY_WINDOW + 0.15);

			if (h.ideaId && h.ideaId === candidate.ideaId) score -= 6 * weight;
			else if (h.ideaId && this.isRelated(h.ideaId, candidate.ideaId)) score -= 3 * weight;
			else if (h.family && h.family === this.familyOf(candidate.ideaId)) score -= 1.5 * weight;

			if (h.emotionId && h.emotionId === candidate.emotionId) score -= 2 * weight;
			if (h.structureId && h.structureId === candidate.structureId) score -= 2 * weight;
			if (candidate.metaphorId && h.metaphorId === candidate.metaphorId) score -= 2 * weight;
			if (h.toneId && h.toneId === candidate.toneId) score -= 1 * weight;
		});

		score += Math.random() * 1.5; // le hasard intervient après le filtrage, jamais avant
		return score;
	},

	/** Choisit le meilleur candidat, avec une petite part de hasard
	 * contrôlé parmi les 3 mieux notés (jamais un pur premier-de-liste
	 * systématique — cf. §19 du cahier des charges). */
	pickWeightedBest(candidates) {
		const sorted = [...candidates].sort((a, b) => b._score - a._score);
		const top = sorted.slice(0, 3);
		const min = Math.min(...top.map((c) => c._score));
		const weights = top.map((c) => c._score - min + 0.5);
		const total = weights.reduce((s, w) => s + w, 0);
		let r = Math.random() * total;
		for (let i = 0; i < top.length; i++) {
			r -= weights[i];
			if (r <= 0) return top[i];
		}
		return top[0];
	},

	// -----------------------------------------------------------------
	// GÉNÉRATION
	// -----------------------------------------------------------------

	/** Point d'entrée principal. Retourne { fragments: string[10], meta: {...} }. */
	generateReward({ language, playerName, chapter, history }) {
		if (Math.random() < RARE_PROBABILITY) {
			return this.generateRareReward({ language, playerName, history });
		}

		const structures = this.content.structures;
		const ideas = this.content.ideas;
		const metaphors = this.content.metaphors;

		const candidates = [];
		for (let i = 0; i < 14; i++) {
			const structure = pickRandom(structures);
			const idea = pickRandom(ideas);
			const metaphor = structure.uses_metaphor ? pickRandom(metaphors) : null;
			const tone = pickRandom(TONE_CYCLE);
			candidates.push({
				structureId: structure.id,
				ideaId: idea.id,
				metaphorId: metaphor ? metaphor.id : null,
				emotionId: idea.emotion,
				toneId: tone,
				_structure: structure,
				_idea: idea,
				_metaphor: metaphor,
			});
		}
		candidates.forEach((c) => {
			c._score = this.scoreCandidate(c, history);
		});
		const chosen = this.pickWeightedBest(candidates);

		const fragments = this.composeFragments(chosen, { language, playerName });

		return {
			fragments,
			meta: {
				chapter,
				rare: false,
				ideaId: chosen.ideaId,
				family: this.familyOf(chosen.ideaId),
				emotionId: chosen.emotionId,
				toneId: chosen.toneId,
				structureId: chosen.structureId,
				metaphorId: chosen.metaphorId,
				depth: chosen._idea.depth,
				language,
				date: new Date().toISOString(),
			},
		};
	},

	composeFragments(chosen, { language, playerName }) {
		const L = language === "en" ? "en" : "fr";
		const V = this.content.vocabulary[L];
		const idea = chosen._idea;
		const angles = idea[`angles_${L}`];
		const metaphor = chosen._metaphor;
		const greeting = `${playerName},`;

		const pickFrom = (bank) => pickRandom(bank);
		const pickDifferentFrom = (bank, excluded) => {
			let candidate = pickFrom(bank);
			let tries = 0;
			while (candidate === excluded && tries < 6) {
				candidate = pickFrom(bank);
				tries++;
			}
			return candidate;
		};

		let firstEncouragement = null;

		const slotValue = (slot) => {
			switch (slot) {
				case "greeting":
					return greeting;
				case "idea_obs_a":
					return angles[0];
				case "idea_obs_b":
					return angles[1];
				case "idea_obs_c":
					return angles[2];
				case "metaphor_open":
					return metaphor[`open_${L}`];
				case "metaphor_dev":
					return metaphor[`dev_${L}`];
				case "metaphor_turn":
					return metaphor[`turn_${L}`];
				case "transition":
					return pickFrom(V.transition);
				case "synthesis":
					return pickFrom(V.synthesis);
				case "question":
					return pickFrom(V.question);
				case "personal":
					return pickFrom(V.personal).replaceAll("{player_name}", playerName);
				case "encouragement":
					firstEncouragement = pickFrom(V.encouragement);
					return firstEncouragement;
				case "encouragement2":
					return pickDifferentFrom(V.encouragement, firstEncouragement);
				case "closing":
					return pickFrom(V.closing);
				case "signature":
					return pickFrom(V.signature);
				default:
					return "";
			}
		};

		return chosen._structure.beats.map((slot) => slotValue(slot));
	},

	// -----------------------------------------------------------------
	// MESSAGES RARES — cf. §23 : peu fréquents, mémorables, jamais deux
	// fois de suite le même tant que d'autres restent disponibles.
	// -----------------------------------------------------------------

	generateRareReward({ language, playerName, history }) {
		const L = language === "en" ? "en" : "fr";
		const rareLetters = this.content.rare[L];
		const used = new Set((history || []).filter((h) => h.rare).map((h) => h.rareId));

		let pool = rareLetters.filter((r) => !used.has(r.id));
		if (pool.length === 0) pool = rareLetters;

		const chosen = pickRandom(pool);
		const fragments = chosen.lines.map((line) => line.replaceAll("{player_name}", playerName));

		return {
			fragments,
			meta: {
				rare: true,
				rareId: chosen.id,
				ideaId: null,
				family: null,
				emotionId: null,
				toneId: null,
				structureId: "minimal_poem",
				metaphorId: null,
				depth: 5,
				language,
				date: new Date().toISOString(),
			},
		};
	},
};
