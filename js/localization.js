// localization.js — chargement des textes fr/en et fonction t()
// Comme prévu au cahier des charges : pas de texte écrit en dur dans le
// HTML/JS, tout passe par t("cle", {vars}).

const Loc = {
	tables: {},

	async load() {
		this.tables.fr = await fetchJSON("data/translations-fr.json");
		this.tables.en = await fetchJSON("data/translations-en.json");
	},

	t(key, vars = {}) {
		const lang = State.profile.language || "fr";
		let text = (this.tables[lang] && this.tables[lang][key]) || "";
		if (!text) {
			// Repli sur le français, puis sur la clé brute (ne doit jamais planter).
			text = (this.tables.fr && this.tables.fr[key]) || key;
		}
		for (const k in vars) {
			text = text.replaceAll(`{${k}}`, vars[k]);
		}
		return text;
	},

	/** Variante genrée : ne sert que pour les tournures qui décrivent
	 * le joueur lui-même (ex: "Prête/Prêt ?"), jamais pour une phrase
	 * où c'est Tonton Jiee qui parle à la première personne. */
	tGendered(keyBase, vars = {}) {
		const suffix = State.profile.gender === "female" ? "female" : "male";
		return this.t(`${keyBase}_${suffix}`, vars);
	},
};
