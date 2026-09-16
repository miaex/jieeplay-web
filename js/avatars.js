// avatars.js — 5 avatars au choix, obligatoire à l'inscription, modifiable
// ensuite depuis les Réglages. Certains sont de vraies photos de peluches
// (assets/avatars/*.png, détourées), d'autres restent des nounours dessinés
// en SVG tant qu'aucune photo de remplacement n'a été fournie.

const AVATAR_ACCESSORIES = {
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
	{ id: "bear-rose", type: "photo", src: "assets/avatars/bear-rose.png" },
	{ id: "bear-mauve", type: "photo", src: "assets/avatars/bear-mauve.png" },
	{ id: "bear-caramel", type: "photo", src: "assets/avatars/bear-caramel.png" },
	{ id: "bear-ivoire", type: "svg", fur: "#f3ead8", furDark: "#dccbb0", accessory: "flower", accessoryColor: "#d98a9a" },
	{ id: "bear-dore", type: "svg", fur: "#e9c78c", furDark: "#c9a25f", accessory: "crown", accessoryColor: "#8a5a1f" },
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

const AVATAR_MARKUP_CACHE = {};

/** Retourne le HTML (photo <img> ou SVG dessiné) pour un avatar donné. */
function getAvatarSVG(avatarId) {
	const cfg = AVATAR_LIST.find((a) => a.id === avatarId) || AVATAR_LIST[0];
	if (AVATAR_MARKUP_CACHE[cfg.id]) return AVATAR_MARKUP_CACHE[cfg.id];

	const markup =
		cfg.type === "photo"
			? `<img src="${cfg.src}" alt="" loading="lazy" draggable="false">`
			: buildBearSVG(cfg);

	AVATAR_MARKUP_CACHE[cfg.id] = markup;
	return markup;
}

/** Affiche l'avatar choisi (ou le premier par défaut) dans un conteneur. */
function renderAvatar(containerEl, avatarId) {
	containerEl.innerHTML = getAvatarSVG(avatarId);
}
