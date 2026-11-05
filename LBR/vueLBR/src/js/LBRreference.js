// LBR (Land Between Rivers) constants and board.

export const ROWS = 11;
export const COLS = 16;
export const CELLS = ROWS * COLS;

// Board geometry in map units. The artwork is eight times these.
export const MAP_W = 240;
export const MAP_H = 160;
export const CELL_W = 12;
export const PITCH = 13;
export const MAP_LEFT = 17;
export const MAP_TOP = 8;

// The board draws at most 950px wide, shrinking to fit a narrower page.
export const BOARD_WIDTH = 950;

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

// Board layouts from the donor engine. Row 0 is the top; x = river, t =
// starting temple + treasure. Every board keeps the 16-column storage stride;
// width/height are the playable corner of it. Keys are stored in the game state,
// so they must match the Rust policy registry in src/maps.rs of MihaiAnca13/tigris.
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

export const MAP_DEFS = {
	default: { width: 16, height: 11, rows: BOARD_ROWS },
	"twin-bends": {
		width: 14,
		height: 11,
		rows: [
			"..t..x.xx..t....",
			".....xx.x.......",
			"......xxx.......",
			"....txx......t..",
			".....xx.........",
			".t.....t........",
			"..........xxxx..",
			"..........x.....",
			"..........x..t..",
			"....t.....x.....",
			"........t.x.....",
		],
	},
	"long-bend": {
		width: 15,
		height: 8,
		rows: [
			"....xt..........",
			".t..x......t....",
			"....xx..........",
			".....xx.......t.",
			"......xx........",
			".......x..t.....",
			"t......xxxxxx...",
			"....t..xx...xt..",
		],
	},
	"the-fork": {
		width: 13,
		height: 10,
		rows: [
			"..t.x..xxx......",
			"....xx...x..t...",
			".....x...x......",
			"t....x...x......",
			".....x.t.x......",
			".....x.xxx......",
			"....txxxx...t...",
			".....x.x........",
			"t....x.x........",
			".....x.xx.t.....",
		],
	},
};

const MAP_NAMES = Object.keys(MAP_DEFS);

function buildMap(name, def) {
	const river = new Uint8Array(CELLS);
	const temples = new Uint8Array(CELLS);
	let templeCount = 0;
	for (let row = 0; row < def.height; row++) {
		for (let col = 0; col < def.width; col++) {
			const ch = def.rows[row][col];
			const i = row * COLS + col;
			river[i] = ch === "x" ? 1 : 0;
			temples[i] = ch === "t" ? 1 : 0;
			if (ch === "t") templeCount += 1;
		}
	}
	return { ...def, name, river, temples, templeCount };
}

export const MAPS = Object.fromEntries(MAP_NAMES.map((name) => [name, buildMap(name, MAP_DEFS[name])]));

export function getMap(name) {
	return MAPS[name] || MAPS.default;
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

export function edgeDistance(i, map) {
	const row = rowOf(i);
	const col = colOf(i);
	return Math.min(row, map.height - 1 - row, col, map.width - 1 - col);
}

export function boardIndex(row, col) {
	return idx(row, col);
}

// Seat marks: row in the leader sheet (Eye of Horus, Winged Sun Disc,
// Corinthian Helmet, Chinese Dragon).
export const SEAT_MARKS = ["Eye of Horus", "Winged Sun Disc", "Corinthian Helmet", "Chinese Dragon"];

export function seatMarkRow(seat) {
	return seat >= 0 && seat < SEAT_MARKS.length ? seat : 0;
}

// Leader sheet columns: blue, green, red, black.
export const LEADER_COL = { B: 0, G: 1, R: 2, K: 3 };
