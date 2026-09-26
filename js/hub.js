// hub.js — écran "Univers JieePlay". Point d'entrée unique pour tous
// les jeux de l'écosystème : le mot-jeu original (JieePlay) est le
// premier de la liste, les suivants viendront s'ajouter dans
// data/games.json sans toucher à ce fichier (voir README, section
// "Ajouter un nouveau jeu").
//
// Un jeu "disponible" pointe vers une clé `entryStep` (un pas de
// Nav.push existant, ex: "game-category"). Un jeu codé comme projet
// séparé s'intègre de la même façon : sa propre vue (#view-<id>), son
// propre module JS/CSS, et une entrée dans games.json avec le bon
// entryStep — le hub n'a pas besoin d'en savoir plus.

const Hub = {
	init() {
		document.getElementById("btn-hub-back").addEventListener("click", () => {
			Audio_.playClick();
			Nav.back();
		});
	},

	show() {
		document.getElementById("hub-eyebrow").textContent = Loc.t("hub_eyebrow");
		document.getElementById("hub-title").textContent = Loc.t("hub_title");
		document.getElementById("hub-subtitle").textContent = Loc.t("hub_subtitle");
		this.renderGames();
	},

	renderGames() {
		const L = State.profile.language === "en" ? "en" : "fr";
		const grid = document.getElementById("hub-games-grid");
		grid.innerHTML = "";

		(State.games || []).forEach((game) => {
			const isAvailable = game.status === "available";
			const card = document.createElement(isAvailable ? "button" : "div");
			card.className = `hub-game-card accent-${game.accent || "gold"}` + (isAvailable ? "" : " soon");
			card.innerHTML = `
				<span class="hub-game-icon">${game.emoji}</span>
				<span class="hub-game-name">${game[`label_${L}`]}</span>
				<span class="hub-game-subtitle">${game[`subtitle_${L}`]}</span>
				<span class="hub-game-status">${isAvailable ? Loc.t("hub_play_cta") : Loc.t("hub_soon_label")}</span>
			`;
			if (isAvailable) {
				card.addEventListener("click", () => this.launchGame(game));
			}
			grid.appendChild(card);
		});
	},

	/** Lance un jeu disponible. Pour l'instant, seul "jieeplay" (le jeu
	 * historique) existe ; les prochains jeux ajouteront simplement un
	 * `case` ici, ou — s'ils suivent tous le même besoin — un champ
	 * `entryStep` générique dans games.json à passer directement à
	 * Nav.push. */
	launchGame(game) {
		Audio_.playClick();
		if (game.id === "jieeplay") {
			Home.startOrContinue();
		}
	},
};
