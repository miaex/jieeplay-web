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

/** Charge et parse un JSON. Ne masque jamais l'erreur : elle est
 * enrichie (chemin, cause précise) puis relancée pour que l'appelant
 * décide quoi en faire — voir App.boot() pour la politique de retry.
 * Une erreur ici ne doit JAMAIS toucher au profil local (chargé à
 * part, avant ces appels — voir App.boot()). */
async function fetchJSON(path) {
	let res;
	try {
		res = await fetch(path);
	} catch (e) {
		throw new Error(`Réseau indisponible pour ${path} (hors cache) : ${e.message}`);
	}
	if (!res.ok) {
		throw new Error(`${path} : réponse HTTP ${res.status}`);
	}
	try {
		return await res.json();
	} catch (e) {
		throw new Error(`${path} : JSON invalide (${e.message})`);
	}
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
