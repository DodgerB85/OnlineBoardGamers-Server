// Display helpers shared by the LBR components.
import { COLS, COLOUR_NAMES, LEADER_COL, MONUMENT_TYPES, SEAT_MARKS } from "./LBRreference.js";

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
			return hasTreasure ? 11 : 10;
		case 2:
			return 12;
		case 4:
			return 13;
		case 3:
			return 14;
		default:
			return -1;
	}
}

export function monumentSpriteIndex(type) {
	return MONUMENT_TYPES.indexOf(type);
}

export function leaderSpriteIndex(seat, colour) {
	const row = SEAT_MARKS.indexOf(SEAT_MARKS[seat] || "bull");
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
