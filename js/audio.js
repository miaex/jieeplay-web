// audio.js — sons et musiques (§21). Système centralisé pour pouvoir
// remplacer les fichiers sans toucher au reste du code.

const Audio_ = {
	sfx: {},
	musicEl: null,
	currentMusicKey: "",

	init() {
		const sounds = {
			tile: "assets/sounds/tile_tap.wav",
			click: "assets/sounds/button_click.wav",
			success: "assets/sounds/success.wav",
			failure: "assets/sounds/failure.wav",
			reward: "assets/sounds/reward.wav",
		};
		for (const key in sounds) {
			const a = new Audio(sounds[key]);
			a.preload = "auto";
			this.sfx[key] = a;
		}

		this.musicTracks = {
			menu: "assets/music/menu_music.ogg",
			reward: "assets/music/reward_music.ogg",
		};

		this.musicEl = new Audio();
		this.musicEl.loop = true;
		this.musicEl.volume = 0.5;
	},

	play(key) {
		if (!State.settings.sfxEnabled) return;
		const base = this.sfx[key];
		if (!base) return;
		// Clone pour permettre des sons qui se chevauchent.
		const node = base.cloneNode();
		node.play().catch(() => {});
	},

	playTile() { this.play("tile"); },
	playClick() { this.play("click"); },
	playSuccess() { this.play("success"); },
	playReward() { this.play("reward"); },

	playFailure() {
		this.play("failure");
		if (State.settings.vibrationEnabled && navigator.vibrate) {
			navigator.vibrate(140);
		}
	},

	playMusic(key) {
		if (!State.settings.musicEnabled) return;
		if (this.currentMusicKey === key && !this.musicEl.paused) return;
		const src = this.musicTracks[key];
		if (!src) return;
		this.currentMusicKey = key;
		this.musicEl.src = src;
		this.musicEl.play().catch(() => {
			// Beaucoup de navigateurs bloquent l'autoplay avant un geste
			// utilisateur : on retentera au prochain clic (voir app.js).
		});
	},

	stopMusic() {
		this.musicEl.pause();
		this.currentMusicKey = "";
	},
};
