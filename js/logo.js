// logo.js — petit logo "JieePlay" coloré, avec apparition lettre par
// lettre à la toute première apparition (comme la version Godot).

const LOGO_WORD = "JieePlay";
const LOGO_COLORS = ["#cb7a83", "#795a73", "#e79292", "#a080b3", "#d99e59", "#cb7a83", "#795a73", "#e79292"];

let logoIntroPlayed = false;

function renderLogo(containerEl) {
	containerEl.innerHTML = "";
	for (let i = 0; i < LOGO_WORD.length; i++) {
		const span = document.createElement("span");
		span.textContent = LOGO_WORD[i];
		span.style.color = LOGO_COLORS[i % LOGO_COLORS.length];
		if (!logoIntroPlayed) {
			span.style.animationDelay = `${i * 0.045}s`;
		} else {
			span.style.opacity = "1";
			span.style.transform = "scale(1)";
		}
		containerEl.appendChild(span);
	}
	logoIntroPlayed = true;
}
