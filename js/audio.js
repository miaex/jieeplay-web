// audio.js — sons et musiques (§21).
// La musique de fond passe par l'API Web Audio (pas une balise <audio>)
// pour éviter que Chrome n'affiche une notification "lecture en cours"
// dans la barre système — un souci propre aux balises <audio> classiques.
// Les effets courts restent sur <audio>, sans ce problème (trop brefs).

const Audio_ = {
	sfx: {},
	ctx: null,
	musicBuffers: {},
	musicSource: null,
	musicGain: null,
	currentMusicKey: "",
	musicTracks: {
		menu: "assets/music/menu_music.ogg",
		reward: "assets/music/reward_music.ogg",
	},

	init() {
		const sounds = {
			tile: "assets/sounds/tile_tap.wav",
			click: "assets/sounds/button_click.wav",
			success: "assets/sounds/success.wav",
			failure: "assets/sounds/failure.wav",
			reward: "assets/sounds/reward.wav",
			confetti: "assets/sounds/confetti.wav",
		};
		for (const key in sounds) {
			const a = new Audio(sounds[key]);
			a.preload = "auto";
			this.sfx[key] = a;
		}

		this.ctx = new (window.AudioContext || window.webkitAudioContext)();
		this.musicGain = this.ctx.createGain();
		this.musicGain.gain.value = 0.5;
		this.musicGain.connect(this.ctx.destination);
	},

	/** Décode les pistes de musique en arrière-plan (n'empêche pas le jeu
	 * de continuer à se charger pendant ce temps). */
	async preloadMusic() {
		for (const key in this.musicTracks) {
			try {
				const resp = await fetch(this.musicTracks[key]);
				const arrayBuffer = await resp.arrayBuffer();
				this.musicBuffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
			} catch (e) {
				console.warn("Audio: échec du chargement de la musique", key, e);
			}
		}
	},

	play(key) {
		if (!State.settings.sfxEnabled) return;
		const base = this.sfx[key];
		if (!base) return;
		const node = base.cloneNode();
		node.play().catch(() => {});
	},

	playTile() { this.play("tile"); },
	playClick() { this.play("click"); },
	playSuccess() { this.play("success"); },
	playReward() { this.play("reward"); },
	playConfetti() { this.play("confetti"); },

	playFailure() {
		this.play("failure");
		if (State.settings.vibrationEnabled && navigator.vibrate) {
			navigator.vibrate(140);
		}
	},

	async playMusic(key) {
		if (!State.settings.musicEnabled) return;
		if (this.currentMusicKey === key && this.musicSource) return;

		if (this.ctx.state === "suspended") {
			await this.ctx.resume().catch(() => {});
		}

		this.stopMusic();

		const buffer = this.musicBuffers[key];
		if (!buffer) return;

		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		source.connect(this.musicGain);
		source.start(0);

		this.musicSource = source;
		this.currentMusicKey = key;
	},

	stopMusic() {
		if (this.musicSource) {
			try { this.musicSource.stop(); } catch (e) { /* déjà arrêtée */ }
			this.musicSource.disconnect();
			this.musicSource = null;
		}
		this.currentMusicKey = "";
	},

	/** À rappeler au premier geste utilisateur : les navigateurs mobiles
	 * bloquent l'AudioContext tant qu'aucune interaction n'a eu lieu. */
	resumeIfNeeded() {
		if (this.ctx && this.ctx.state === "suspended") {
			this.ctx.resume().catch(() => {});
		}
	},
};
