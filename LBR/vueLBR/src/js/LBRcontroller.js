// LBR controller: turns UI intents into rules actions and saves.
import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as IO from "../backend/LBR_IO.js";
import * as model from "./LBRmodel.js";
import { COLOURS, CELLS } from "./LBRreference.js";
import {
	applyAction,
	canPlaceCatastrophe,
	canPlaceLeader,
	canPlaceTile,
	currentActor,
} from "./LBRrules.js";

const ERROR_TEXT = {
	notYourTurn: "It is not your decision.",
	gameOver: "The game is over.",
	badColour: "Choose a colour.",
	badCell: "That space is not on the board.",
	noTile: "You have no tile of that colour.",
	occupied: "That space is not empty.",
	blueOnLand: "Farms (blue) can only be placed on river spaces.",
	landOnRiver: "Only farms (blue) can be placed on river spaces.",
	threeKingdoms: "A tile may not join three kingdoms.",
	noCatastrophes: "You have no catastrophes left.",
	catastrophe: "That space is permanently ruined.",
	treasure: "You cannot place a catastrophe on a treasure.",
	leader: "You cannot place a catastrophe on a leader.",
	monument: "You cannot place there: monument.",
	river: "Leaders cannot stand on a river.",
	notAdjacentTemple: "A leader must be placed next to a red temple.",
	joinTwoKingdoms: "A leader may not join two kingdoms.",
	splitRejoin: "A leader may not split its kingdom and rejoin it in one move.",
	noLeader: "That leader is not on the board.",
	notEnoughTiles: "You do not have that many tiles.",
	badTreasure: "Keep one of the highlighted treasures.",
	noTrader: "That kingdom has no green trader.",
	badMonument: "That monument cannot be built there.",
	badSupport: "That support choice is not legal.",
	badAction: "Unknown action.",
	noTiles: "Choose at least one tile to swap.",
	bagEmpty: "The bag is empty.",
};

export function errorText(error) {
	return ERROR_TEXT[error] || error;
}

export function bootGame() {
	const store = useModelStore();
	const personal = usePersonalStore();
	if (store.game || personal.pov < 0) return;
	if (!store.playerNames.length) return;
	const game = model.newGameState(store.playerNames.length, Math.random);
	game.displayNames = { ...store.displayNames };
	store.game = game;
	store.gameMessages.successText = "The game has started.";
	IO.saveGame();
}

export function resetSelection() {
	const store = useModelStore();
	store.viewSettings.mode = "idle";
	store.viewSettings.selectedColour = null;
}

function commit(action) {
	const store = useModelStore();
	const personal = usePersonalStore();
	if (!store.game || store.game.gameOver) {
		store.gameMessages.errorText = ERROR_TEXT.gameOver;
		return false;
	}
	const seat = currentActor(store.game);
	if (!personal.trainingGame && personal.pov !== seat) {
		store.gameMessages.errorText = ERROR_TEXT.notYourTurn;
		return false;
	}
	const result = applyAction(store.game, seat, action);
	if (result.error) {
		store.gameMessages.errorText = errorText(result.error);
		return false;
	}
	store.gameMessages.errorText = "";
	store.game = result.state;
	resetSelection();
	if (store.game.gameOver) store.gameMessages.successText = "Game over.";
	IO.saveGame();
	return true;
}

export function legalCells() {
	const store = useModelStore();
	const set = new Set();
	const game = store.game;
	if (!game || game.gameOver) return set;
	if (game.pending) {
		if (game.pending.kind === "treasure") {
			for (const pos of game.pending.keepOptions) set.add(pos);
		}
		return set;
	}
	if (!model.isMyTurn()) return set;
	const seat = currentActor(game);
	const mode = store.viewSettings.mode;
	const colour = store.viewSettings.selectedColour;
	for (let pos = 0; pos < CELLS; pos++) {
		let err = null;
		if (mode === "tile" && colour) err = canPlaceTile(game, seat, colour, pos);
		else if (mode === "leader" && colour) err = canPlaceLeader(game, seat, colour, pos);
		else if (mode === "catastrophe") err = canPlaceCatastrophe(game, seat, pos);
		if (!err) set.add(pos);
	}
	return set;
}

export function clickCell(pos) {
	const store = useModelStore();
	const game = store.game;
	if (!game) return;
	if (game.pending) {
		if (game.pending.kind === "treasure" && game.pending.keepOptions.includes(pos)) {
			commit({ type: "treasure", keep: pos });
		} else {
			store.gameMessages.errorText = "Choose one of the highlighted treasures.";
		}
		return;
	}
	const mode = store.viewSettings.mode;
	const colour = store.viewSettings.selectedColour;
	if (mode === "tile" && colour) commit({ type: "placeTile", colour, pos });
	else if (mode === "leader" && colour) commit({ type: "placeLeader", colour, pos });
	else if (mode === "catastrophe") commit({ type: "catastrophe", pos });
	else {
		const leader = game.leaders[pos];
		const code = game.tiles[pos];
		store.gameMessages.successText = leader
			? `${model.seatName(leader.s)} ${leader.c} leader`
			: code
				? "Tile"
				: game.catastrophes[pos]
					? "Catastrophe"
					: "Empty space";
	}
}

export function selectTile(colour) {
	const store = useModelStore();
	const game = store.game;
	if (!game) return;
	const seat = model.mySeat();
	if (game.players[seat].hand[colour] <= 0) {
		store.gameMessages.errorText = "You have no tile of that colour.";
		return;
	}
	store.viewSettings.mode = "tile";
	store.viewSettings.selectedColour = colour;
	store.gameMessages.errorText = "";
	store.gameMessages.successText = "Choose a space for the tile.";
}

export function selectLeader(colour) {
	const store = useModelStore();
	store.viewSettings.mode = "leader";
	store.viewSettings.selectedColour = colour;
	store.gameMessages.errorText = "";
	store.gameMessages.successText = "Choose a space next to a red temple.";
}

export function selectCatastrophe() {
	const store = useModelStore();
	store.viewSettings.mode = "catastrophe";
	store.viewSettings.selectedColour = null;
	store.gameMessages.errorText = "";
	store.gameMessages.successText = "Choose a space for the catastrophe.";
}

export function withdrawLeader(colour) {
	commit({ type: "withdrawLeader", colour });
}

export function passAction() {
	commit({ type: "pass" });
}

export function endTurn() {
	commit({ type: "endTurn" });
}

export function swapSelected() {
	const store = useModelStore();
	const tiles = { ...store.selectedSwap };
	for (const c of COLOURS) store.selectedSwap[c] = 0;
	commit({ type: "swap", tiles });
}

export function keepTreasure(pos) {
	commit({ type: "treasure", keep: pos });
}

export function orderConflict(colour) {
	commit({ type: "warOrder", colour });
}

export function sendSupport(count) {
	commit({ type: "support", count });
}

export function buildMonument(at, type) {
	commit({ type: "monument", build: { at, type } });
}

export function declineMonument() {
	commit({ type: "monument", build: null });
}

export async function doResign() {
	const store = useModelStore();
	try {
		await IO.resign();
		await IO.checkForLatestData(true);
		autoPlayMissing();
	} catch {
		store.gameMessages.errorText = "Could not resign.";
	}
}

export async function doRewind() {
	const store = useModelStore();
	try {
		await IO.loadRewind();
		resetSelection();
	} catch {
		store.gameMessages.errorText = "Could not rewind.";
	}
}

function nextRealSeat(game, after, missing) {
	for (let step = 1; step <= game.numSeats; step++) {
		const seat = (after + step) % game.numSeats;
		if (!missing.has(model.seatUsername(seat))) return seat;
	}
	return -1;
}

function defaultAction(game) {
	const pending = game.pending;
	if (!pending) return { type: "pass" };
	if (pending.kind === "treasure") return { type: "treasure", keep: pending.keepOptions[0] };
	if (pending.kind === "warOrder") return { type: "warOrder", colour: game.war.conflicts[0].colour };
	if (pending.kind === "support" || pending.kind === "warSupport" || pending.kind === "revoltSupport") {
		return { type: "support", count: 0 };
	}
	if (pending.kind === "monument") return { type: "monument", build: null };
	return { type: "pass" };
}

// A missing seat cannot act. The next real seat in clockwise order persists
// forced moves for it (passes, zero support, declining monuments), so the game
// never stalls on an abandoned player.
export function autoPlayMissing() {
	const store = useModelStore();
	const personal = usePersonalStore();
	const game = store.game;
	if (!game || game.gameOver || !store.missingPlayers.length) return;
	const missing = new Set(store.missingPlayers);
	const actor = currentActor(game);
	if (!missing.has(model.seatUsername(actor))) return;
	const designated = nextRealSeat(game, actor, missing);
	if (!personal.trainingGame && personal.pov !== designated) return;

	let state = game;
	let guard = 0;
	while (!state.gameOver && missing.has(model.seatUsername(currentActor(state))) && guard < 32) {
		guard += 1;
		const seat = currentActor(state);
		const result = applyAction(state, seat, defaultAction(state));
		if (result.error) break;
		state = result.state;
	}
	if (state !== game) {
		store.game = state;
		IO.saveGame();
	}
}
