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
