// LBR (Land Between Rivers / Tigris & Euphrates) constants and board.

export const ROWS = 11;
export const COLS = 16;
export const CELLS = ROWS * COLS;

// Tile codes stored in state.tiles.
export const T_EMPTY = 0;
export const T_RED = 1;
export const T_BLUE = 2;
export const T_GREEN = 3;
export const T_BLACK = 4;
export const T_MONUMENT = 5;

export const COLOURS = ["R", "B", "G", "K"];
export const COLOUR_CODE = { R: T_RED, B: T_BLUE, G: T_GREEN, K: T_BLACK };
export const CODE_COLOUR = { 1: "R", 2: "B", 3: "G", 4: "K" };

export const COLOUR_NAMES = {
	R: "Temple",
	B: "Farm",
	G: "Market",
	K: "Settlement",
};

// Monument pairs use colour letters. Order matches the donor sprite strip.
export const MONUMENT_TYPES = ["RB", "KG", "KB", "KR", "GB", "RG"];

export const MONUMENT_COLOURS = {
	RB: ["R", "B"],
	KG: ["K", "G"],
	KB: ["K", "B"],
	KR: ["K", "R"],
	GB: ["G", "B"],
	RG: ["R", "G"],
};

export const START_TILES = { R: 57, B: 36, G: 30, K: 30 };
export const START_TEMPLES = 10;

// Board layout from the donor engine (`BOARD` in game.rs). Row 0 is the top.
// x = river, t = starting temple + treasure.
export const BOARD_ROWS = [
	"....xxxxx.t.x...",
	".t..x.......x..t",
	"...xxt......xx..",
	"xxxx.........xxx",
	".............txx",
	"..............x.",
	"xxxx.....t..xxx.",
	".t.xxxxx....x...",
	".......xxxxxx.t.",
	"......t.........",
	"..........t.....",
];

export const RIVER = new Uint8Array(CELLS);
export const START_TEMPLE = new Uint8Array(CELLS);
for (let row = 0; row < ROWS; row++) {
	for (let col = 0; col < COLS; col++) {
		const ch = BOARD_ROWS[row][col];
		const i = row * COLS + col;
		RIVER[i] = ch === "x" ? 1 : 0;
		START_TEMPLE[i] = ch === "t" ? 1 : 0;
	}
}

export function idx(row, col) {
	return row * COLS + col;
}

export function rowOf(i) {
	return Math.floor(i / COLS);
}

export function colOf(i) {
	return i % COLS;
}

export function inBounds(row, col) {
	return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

export function neighbours(i) {
	const row = rowOf(i);
	const col = colOf(i);
	const out = [];
	if (row > 0) out.push(i - COLS);
	if (row < ROWS - 1) out.push(i + COLS);
	if (col > 0) out.push(i - 1);
	if (col < COLS - 1) out.push(i + 1);
	return out;
}

export function edgeDistance(i) {
	const row = rowOf(i);
	const col = colOf(i);
	return Math.min(row, ROWS - 1 - row, col, COLS - 1 - col);
}

export function boardIndex(row, col) {
	return idx(row, col);
}

// Seat marks: row in the leader sheet (bull, urn, lion, bow).
export const SEAT_MARKS = ["bull", "urn", "lion", "bow"];

// Leader sheet columns: blue, green, red, black.
export const LEADER_COL = { B: 0, G: 1, R: 2, K: 3 };
