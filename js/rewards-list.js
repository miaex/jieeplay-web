// rewards-list.js — équivalent RewardsList.gd (liste des chapitres
// entièrement bouclés ; nommé "RewardsList" en JS pour ne pas entrer en
// conflit avec le module "Reward", qui gère le système de cartes en jeu).
//
// Comportement accordéon : un seul message ouvert à la fois. Cliquer sur
// un chapitre replié l'ouvre (et referme l'ancien s'il y en avait un) ;
// cliquer sur celui déjà ouvert le referme.

const RewardsList = {
	openChapter: null,

	init() {
		document.getElementById("btn-rewards-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});
	},

	show() {
		document.getElementById("rewards-list-eyebrow").textContent = Loc.t("rewards_eyebrow");
		document.getElementById("rewards-list-title").textContent = Loc.t("rewards_title");

		const completed = [...State.progress.completedRewards].sort((a, b) => a.chapter - b.chapter);
		const emptyEl = document.getElementById("rewards-list-empty");
		const itemsEl = document.getElementById("rewards-list-items");
		itemsEl.innerHTML = "";
		this.openChapter = null;

		if (completed.length === 0) {
			emptyEl.textContent = Loc.t("rewards_empty");
			emptyEl.classList.remove("hidden");
			itemsEl.classList.add("hidden");
			return;
		}

		emptyEl.classList.add("hidden");
		itemsEl.classList.remove("hidden");

		completed.forEach((entry) => {
			const isNew = entry.viewed === false;
			const item = document.createElement("div");
			item.className = "rewards-accordion-item" + (isNew ? " is-new" : "");
			item.dataset.chapter = entry.chapter;
			item.innerHTML = `
				<button class="rewards-accordion-header" type="button">
					<span class="rewards-accordion-title-group">
						<span class="rewards-accordion-title">${Loc.t("rewards_chapter_label", { chapter: entry.chapter })}</span>
						<span class="rewards-new-badge">${Loc.t("rewards_new_badge")}</span>
					</span>
					<span class="rewards-accordion-chevron">›</span>
				</button>
				<div class="rewards-accordion-panel">
					<div class="rewards-accordion-panel-inner">
						<p class="rewards-message-text"></p>
					</div>
				</div>
			`;
			item.querySelector(".rewards-message-text").textContent = entry.message;
			item.querySelector(".rewards-accordion-header").addEventListener("click", () => this.toggleChapter(entry.chapter));
			itemsEl.appendChild(item);
		});
	},

	toggleChapter(chapter) {
		Audio_.playClick();
		const itemsEl = document.getElementById("rewards-list-items");
		const wasOpen = this.openChapter === chapter;

		itemsEl.querySelectorAll(".rewards-accordion-item").forEach((item) => {
			item.classList.remove("open");
		});

		this.openChapter = wasOpen ? null : chapter;

		if (this.openChapter !== null) {
			const target = itemsEl.querySelector(`.rewards-accordion-item[data-chapter="${this.openChapter}"]`);
			if (target) target.classList.add("open");
			this.markViewed(chapter);
		}
	},

	/** Ouvre directement un chapitre depuis un autre écran (Parcours) et
	 * le fait défiler en vue. N'émet pas de son de clic : l'appelant s'en
	 * charge déjà pour l'interaction d'origine (§ Journey.init). */
	focusChapter(chapter) {
		const itemsEl = document.getElementById("rewards-list-items");
		const target = itemsEl.querySelector(`.rewards-accordion-item[data-chapter="${chapter}"]`);
		if (!target) return;

		itemsEl.querySelectorAll(".rewards-accordion-item").forEach((item) => item.classList.remove("open"));
		target.classList.add("open");
		this.openChapter = chapter;
		this.markViewed(chapter);
		target.scrollIntoView({ block: "center", behavior: "smooth" });
	},

	/** Marque une récompense comme consultée : retire le badge "Nouveau"
	 * et persiste, une seule fois (idempotent sur les entrées déjà vues
	 * ou sur les sauvegardes antérieures à V28 qui n'ont pas ce champ). */
	markViewed(chapter) {
		const entry = State.progress.completedRewards.find((r) => r.chapter === chapter);
		if (!entry || entry.viewed !== false) return;

		entry.viewed = true;
		SaveManager.save();

		const item = document.querySelector(`.rewards-accordion-item[data-chapter="${chapter}"]`);
		if (item) item.classList.remove("is-new");
	},
};
