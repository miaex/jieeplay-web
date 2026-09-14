// avatars.js — 5 avatars "nounours" au choix, obligatoire à l'inscription.
// Chaque avatar est une petite peluche générée en SVG (couleur de fourrure
// + accessoire distinctif), dans le même langage graphique doux que le
// reste de JieePlay.

const AVATAR_ACCESSORIES = {
	bow: (color) => `
		<g fill="${color}">
			<path d="M70 8 L81 3 L81 15 Z"/>
			<path d="M70 8 L59 3 L59 15 Z"/>
			<circle cx="70" cy="8" r="3.4"/>
		</g>`,
	star: (color) => `
		<path d="M50 21 L53.4 29.6 L62 33 L53.4 36.4 L50 45 L46.6 36.4 L38 33 L46.6 29.6 Z" fill="${color}"/>`,
	heart: (color) => `
		<path d="M50 84c-9-6.5-14.5-12-14.5-18.5a7.8 7.8 0 0 1 14.5-4 7.8 7.8 0 0 1 14.5 4C64.5 72 59 77.5 50 84Z" fill="${color}"/>`,
	flower: (color) => `
		<g fill="${color}">
			<circle cx="17" cy="9" r="4.2"/>
			<circle cx="27" cy="9" r="4.2"/>
			<circle cx="22" cy="4" r="4.2"/>
			<circle cx="22" cy="14" r="4.2"/>
			<circle cx="22" cy="9" r="3" fill="#fff8f0"/>
		</g>`,
	crown: (color) => `
		<path d="M36 15 L43 24 L50 12 L57 24 L64 15 L61 28 L39 28 Z" fill="${color}"/>`,
};

const AVATAR_LIST = [
	{ id: "bear-rose", fur: "#f0c9c9", furDark: "#dba3a3", accessory: "bow", accessoryColor: "#c9607a" },
	{ id: "bear-mauve", fur: "#ddd0e4", furDark: "#bba5c7", accessory: "star", accessoryColor: "#8a6aa0" },
	{ id: "bear-caramel", fur: "#dcac72", furDark: "#bd854e", accessory: "heart", accessoryColor: "#8f3a28" },
	{ id: "bear-ivoire", fur: "#f3ead8", furDark: "#dccbb0", accessory: "flower", accessoryColor: "#d98a9a" },
	{ id: "bear-dore", fur: "#e9c78c", furDark: "#c9a25f", accessory: "crown", accessoryColor: "#8a5a1f" },
];

function buildBearSVG(cfg) {
	const accessoryMarkup = AVATAR_ACCESSORIES[cfg.accessory](cfg.accessoryColor);
	return `
		<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
			<circle cx="50" cy="50" r="50" fill="${cfg.fur}"/>
			<circle cx="25" cy="20" r="12" fill="${cfg.furDark}"/>
			<circle cx="75" cy="20" r="12" fill="${cfg.furDark}"/>
			<ellipse cx="50" cy="63" rx="21" ry="16" fill="#fff8f0"/>
			<circle cx="41" cy="52" r="3.4" fill="#4a332a"/>
			<circle cx="59" cy="52" r="3.4" fill="#4a332a"/>
			<ellipse cx="50" cy="61" rx="4.2" ry="3.2" fill="#4a332a"/>
			<path d="M44 68q6 5 12 0" stroke="#4a332a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
			${accessoryMarkup}
		</svg>`;
}

const AVATAR_SVG_CACHE = {};
function getAvatarSVG(avatarId) {
	const cfg = AVATAR_LIST.find((a) => a.id === avatarId) || AVATAR_LIST[0];
	if (!AVATAR_SVG_CACHE[cfg.id]) AVATAR_SVG_CACHE[cfg.id] = buildBearSVG(cfg);
	return AVATAR_SVG_CACHE[cfg.id];
}

/** Affiche l'avatar choisi (ou le premier par défaut) dans un conteneur. */
function renderAvatar(containerEl, avatarId) {
	containerEl.innerHTML = getAvatarSVG(avatarId);
}
