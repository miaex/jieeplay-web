// utils.js — petites fonctions réutilisées partout dans JieePlay

function shuffleArray(arr) {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function randomInt(max) {
	return Math.floor(Math.random() * max);
}

function pickRandom(arr) {
	return arr[randomInt(arr.length)];
}

async function fetchJSON(path) {
	const res = await fetch(path);
	return res.json();
}

/** Petit helper pour créer un élément avec classes/texte en une ligne. */
function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/** Résout la syntaxe {masculin|féminin} dans un texte selon le genre du
 * joueur — utilisé partout où le jeu s'adresse directement au joueur,
 * pour ne jamais afficher une forme "universelle" du type "content(e)".
 * Sans genre connu (valeur vide ou "male" par défaut), la forme
 * masculine est utilisée. */
function applyGenderMarkup(text, gender) {
	if (!text || text.indexOf("|") === -1) return text;
	const useFeminine = gender === "female";
	return text.replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (_match, masc, fem) => (useFeminine ? fem : masc));
}
