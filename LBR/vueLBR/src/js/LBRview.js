// Display helpers shared by the LBR components.
import { COLOUR_CODE, COLS, COLOUR_NAMES, LEADER_COL, MONUMENT_TYPES, seatMarkRow } from "./LBRreference.js";
import { scoresAfterTreasures } from "./LBRrules.js";

export function getImage(image) {
	if (image === "icon-house") return new URL(`../../../static/LBR/images/icon-house.svg`, import.meta.url).href;
	if (image === "icon-chat") return new URL(`../../../static/LBR/images/icon-chat.svg`, import.meta.url).href;
	if (image === "icon-stop") return new URL(`../../../static/LBR/images/icon-stop.svg`, import.meta.url).href;
	if (image === "icon-nextGame") return new URL(`../../../static/LBR/images/icon-nextGame.svg`, import.meta.url).href;
	if (image === "icon-rulebook") return new URL(`../../../static/LBR/images/icon-rulebook.svg`, import.meta.url).href;
	if (image === "icon-notebook") return new URL(`../../../static/LBR/images/icon-notebook.svg`, import.meta.url).href;
	if (image === "icon-scroll") return new URL(`../../../static/LBR/images/icon-scroll.svg`, import.meta.url).href;
	if (image === "icon-rewind") return new URL(`../../../static/LBR/images/icon-rewind.svg`, import.meta.url).href;
	if (image === "resign") return "/static/LBR/images/resign.jpg";
	return "";
}

export function cellName(pos) {
	const row = Math.floor(pos / COLS) + 1;
	const col = String.fromCharCode(65 + (pos % COLS));
	return `${col}${row}`;
}

export function colourName(colour) {
	return COLOUR_NAMES[colour] || colour;
}

export function monumentName(type) {
	return type
		.split("")
		.map((c) => COLOUR_NAMES[c] || c)
		.join("/");
}

export function tileSpriteIndex(code, hasTreasure) {
	switch (code) {
		case 1:
			return hasTreasure ? 2 : 1;
		case 2:
			return 3;
		case 4:
			return 4;
		case 3:
			return 5;
		default:
			return -1;
	}
}

export function monumentSpriteIndex(type) {
	return MONUMENT_TYPES.indexOf(type);
}

export function leaderSpriteIndex(seat, colour) {
	const row = seatMarkRow(seat);
	const col = LEADER_COL[colour] || 0;
	return row * 4 + col;
}

export function handTiles(hand) {
	const out = [];
	for (const colour of ["R", "B", "G", "K"]) {
		for (let i = 0; i < hand[colour]; i++) out.push(colour);
	}
	return out;
}

// A hand tile drawn at any width, keeping the 12:13 sprite proportions.
function sheetStyle(index, width) {
	const scale = width / 12;
	return {
		width: `${width}px`,
		height: `${Math.round(13 * scale)}px`,
		backgroundImage: "url(/static/LBR/images/tiles.png)",
		backgroundSize: `${84 * scale}px ${13 * scale}px`,
		backgroundPosition: `${-index * width}px 0`,
	};
}

export function tileStyle(colour, width = 22) {
	return sheetStyle(tileSpriteIndex(COLOUR_CODE[colour], false), width);
}

// The last sprite on the tile sheet is the catastrophe.
export function catastropheStyle(width = 16) {
	return sheetStyle(6, width);
}

export function leaderStyle(seat, colour, size = 24) {
	const index = leaderSpriteIndex(seat, colour);
	return {
		width: `${size}px`,
		height: `${size}px`,
		backgroundImage: "url(/static/LBR/images/leaders.png)",
		backgroundSize: `${4 * size}px ${4 * size}px`,
		backgroundPosition: `${-(index % 4) * size}px ${-Math.floor(index / 4) * size}px`,
	};
}

// The dynasty mark sits on a gold field so it never reads as one of the four
// leader colours.
export function dynastyStyle(seat, size = 44) {
	return {
		width: `${size}px`,
		height: `${size}px`,
		backgroundImage: "url(/static/LBR/images/dynasties.png)",
		backgroundSize: `${size}px ${4 * size}px`,
		backgroundPosition: `0 ${-seatMarkRow(seat) * size}px`,
	};
}

export function monumentStyle(type, size = 40) {
	const index = monumentSpriteIndex(type);
	if (index < 0) return {};
	return {
		width: `${size}px`,
		height: `${size}px`,
		backgroundImage: "url(/static/LBR/images/monuments.png)",
		backgroundSize: `${6 * size}px ${size}px`,
		backgroundPosition: `${-index * size}px 0`,
	};
}

// Clicking a colour in swap mode adds one tile, wraps back to zero after the
// last tile of that colour, and never takes more than six in total.
export function cycleSwapCount(current, handCount, totalSelected, max = 6) {
	if (current >= handCount || totalSelected >= max) return 0;
	return current + 1;
}

export function historyText(entry, seatNames) {
	const name = entry.s >= 0 ? seatNames[entry.s] || `Seat ${entry.s + 1}` : "";
	switch (entry.a) {
		case "start":
			return `Game started with ${entry.n} players.`;
		case "tile":
			return `${name} placed a ${colourName(entry.c)} tile at ${cellName(entry.p)}.`;
		case "leader":
			return `${name} moved the ${colourName(entry.c)} leader to ${cellName(entry.p)}.`;
		case "withdraw":
			return `${name} withdrew the ${colourName(entry.c)} leader.`;
		case "cat":
			return `${name} played a catastrophe at ${cellName(entry.p)}.`;
		case "swap":
			return `${name} swapped ${entry.n} tiles.`;
		case "pass":
			return `${name} passed an action.`;
		case "end":
			return `${name} ended their turn.`;
		case "support":
			return `${name} sent ${entry.n} ${colourName(entry.c)} tile(s).`;
		case "war":
			return `${name} won the ${colourName(entry.c)} war and destroyed ${entry.n} tile(s).`;
		case "revolt":
			return `${name} won the ${colourName(entry.c)} revolt.`;
		case "treasure":
			return `${name} took ${entry.n} treasure(s), keeping the one at ${cellName(entry.keep)}.`;
		case "monument":
			return `${name} built the ${monumentName(entry.t)} monument.`;
		case "declineMonument":
			return `${name} declined a monument.`;
		case "evict":
			return `A leader left the board because it had no adjacent temple.`;
		case "over":
			return `Game over (${entry.r === "bag" ? "the bag is empty" : "only two treasures remain"}).`;
		default:
			return entry.a;
	}
}

export function scoreRows(score) {
	return ["R", "B", "G", "K"].map((colour) => ({ colour, value: score[colour] }));
}

// The colours holding the player's current score (treasures count as wild), so
// these are the ones that need raising. All four equal means any will do.
export function neededColours(player) {
	const scores = scoresAfterTreasures(player);
	const lowest = Math.min(scores.R, scores.B, scores.G, scores.K);
	return ["R", "B", "G", "K"].filter((colour) => scores[colour] === lowest);
}
