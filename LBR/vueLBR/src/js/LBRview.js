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

// Swapping picks tiles one at a time: clicking a picked tile puts only that
// tile back, and no more than six may be picked.
export function toggleSwapPick(selected, index, totalSelected, max = 6) {
	const key = String(index - 1);
	if (selected[key]) {
		const next = { ...selected };
		delete next[key];
		return next;
	}
	if (totalSelected >= max) return selected;
	return { ...selected, [key]: true };
}

// History lines are split into text and sprite parts so the panel can draw
// tile, leader and monument icons inline instead of naming colours.
export function historyParts(entry, seatNames) {
	const name = entry.s >= 0 ? seatNames[entry.s] || `Seat ${entry.s + 1}` : "";
	const tile = (colour) => ({ tile: colour });
	const leader = (seat, colour) => ({ leader: { seat, colour } });
	switch (entry.a) {
		case "start":
			return [{ text: `Game started with ${entry.n} players.` }];
		case "tile":
			return [{ text: `${name} placed a ` }, tile(entry.c), { text: ` tile at ${cellName(entry.p)}.` }];
		case "leader":
			return [{ text: `${name} moved the ` }, leader(entry.s, entry.c), { text: ` leader to ${cellName(entry.p)}.` }];
		case "withdraw":
			return [{ text: `${name} withdrew the ` }, leader(entry.s, entry.c), { text: ` leader.` }];
		case "cat":
			return [{ text: `${name} played a catastrophe at ${cellName(entry.p)}.` }];
		case "swap":
			return [{ text: `${name} swapped ${entry.n} tiles.` }];
		case "pass":
			return [{ text: `${name} passed an action.` }];
		case "end":
			return [{ text: `${name} ended their turn.` }];
		case "support":
			return [{ text: `${name} sent ${entry.n} ` }, tile(entry.c), { text: ` tile(s).` }];
		case "war":
			return [{ text: `${name} won the ` }, tile(entry.c), { text: ` war and destroyed ${entry.n} tile(s).` }];
		case "revolt":
			return [{ text: `${name} won the ` }, tile(entry.c), { text: ` revolt.` }];
		case "treasure":
			return [{ text: `${name} took ${entry.n} treasure(s), keeping the one at ${cellName(entry.keep)}.` }];
		case "monument":
			return [{ text: `${name} built the ` }, { monument: entry.t }, { text: ` monument.` }];
		case "declineMonument":
			return [{ text: `${name} declined a monument.` }];
		case "evict": {
			// Older saves did not record whose leader was evicted.
			if (entry.c == null || entry.o == null) return [{ text: "A leader left the board (no adjacent temple)." }];
			const owner = entry.o >= 0 ? seatNames[entry.o] || `Seat ${entry.o + 1}` : "An unknown player";
			return [{ text: `${owner}'s ` }, leader(entry.o, entry.c), { text: ` leader left the board (no adjacent temple).` }];
		}
		case "over":
			return [{ text: `Game over (${entry.r === "bag" ? "the bag is empty" : "only two treasures remain"}).` }];
		default:
			return [{ text: entry.a }];
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
