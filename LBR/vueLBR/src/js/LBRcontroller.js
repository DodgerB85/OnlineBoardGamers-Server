// LBR controller: turns UI intents into rules actions and saves.
import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as IO from "../backend/LBR_IO.js";
import * as model from "./LBRmodel.js";
import { COLOURS, CELLS, CODE_COLOUR } from "./LBRreference.js";
import { cellName, colourName, cycleSwapCount } from "./LBRview.js";
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
	for (const colour of COLOURS) store.selectedSwap[colour] = 0;
}

export function actionHint() {
	const store = useModelStore();
	const game = store.game;
	if (!game) return "";
	if (game.gameOver) return "The game is over.";
	if (game.pending) {
		if (!model.isMyTurn()) return `Waiting for ${model.seatName(game.pending.seat)} to decide.`;
		if (game.pending.kind === "treasure") return "Choose one of the treasures marked on the board.";
		if (game.pending.kind === "warOrder") return "Choose which conflict is resolved first.";
		if (game.pending.kind === "monument") return "Build one of the offered monuments, or decline.";
		if (game.pending.kind === "warSupport" || game.pending.kind === "revoltSupport") {
			return "Choose how many tiles to send as support.";
		}
		return "Make the highlighted decision.";
	}
	if (!model.isMyTurn()) return `Waiting for ${model.seatName(currentActor(game))}.`;
	const mode = store.viewSettings.mode;
	const colour = store.viewSettings.selectedColour;
	if (mode === "swap") return "Click tiles in your hand to pick up to six to exchange, then confirm the swap.";
	if (mode === "tile" && colour) return `Click a highlighted space for your ${colourName(colour).toLowerCase()} tile.`;
	if (mode === "leader" && colour) {
		const onBoard = game.players[model.mySeat()].leaders[colour] !== null;
		return onBoard
			? `Click a highlighted space for your ${colourName(colour).toLowerCase()} leader, or withdraw it.`
			: `Click a highlighted temple space to bring your ${colourName(colour).toLowerCase()} leader onto the board.`;
	}
	if (mode === "catastrophe") return "Click a space for your catastrophe.";
	return "Click a tile in your board to place it, or one of your leaders to move it. Leaders on the map can be clicked too.";
}

function commit(action) {
	const store = useModelStore();
	if (!store.game || store.game.gameOver) {
		store.gameMessages.errorText = ERROR_TEXT.gameOver;
		return false;
	}
	const seat = currentActor(store.game);
	if (!model.isMyAction(seat)) {
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
	if (mode === "idle") return set;
	for (let pos = 0; pos < CELLS; pos++) {
		let err;
		if (mode === "tile" && colour) err = canPlaceTile(game, seat, colour, pos);
		else if (mode === "leader" && colour) err = canPlaceLeader(game, seat, colour, pos);
		else if (mode === "catastrophe") err = canPlaceCatastrophe(game, seat, pos);
		else continue;
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
	if (mode === "swap") return;
	if (mode === "tile" && colour) commit({ type: "placeTile", colour, pos });
	else if (mode === "leader" && colour) commit({ type: "placeLeader", colour, pos });
	else if (mode === "catastrophe") commit({ type: "catastrophe", pos });
	else {
		const leader = game.leaders[pos];
		if (leader && leader.s === model.mySeat() && model.isMyTurn()) {
			selectLeader(leader.c);
			return;
		}
		store.gameMessages.successText = describeCell(game, pos);
	}
}

function describeCell(game, pos) {
	const leader = game.leaders[pos];
	if (leader) return `${cellName(pos)}: ${colourName(leader.c).toLowerCase()} leader of ${model.seatName(leader.s)}.`;
	if (game.catastrophes[pos]) return `${cellName(pos)}: ruined by a catastrophe.`;
	if (game.tiles[pos] === 5) return `${cellName(pos)}: monument.`;
	if (game.tiles[pos]) return `${cellName(pos)}: ${colourName(CODE_COLOUR[game.tiles[pos]]).toLowerCase()} tile.`;
	if (game.treasures[pos]) return `${cellName(pos)}: treasure.`;
	return `${cellName(pos)}: empty space.`;
}

export function clickHandTile(colour) {
	const store = useModelStore();
	if (store.viewSettings.mode === "swap") pickSwapTile(colour);
	else selectTile(colour);
}

export function selectTile(colour) {
	const store = useModelStore();
	const game = store.game;
	if (!game || game.pending || !model.isMyTurn()) return;
	const seat = model.mySeat();
	if (game.players[seat].hand[colour] <= 0) {
		store.gameMessages.errorText = "You have no tile of that colour.";
		return;
	}
	resetSelection();
	store.viewSettings.mode = "tile";
	store.viewSettings.selectedColour = colour;
	store.gameMessages.errorText = "";
	store.gameMessages.successText = "";
}

export function selectLeader(colour) {
	const store = useModelStore();
	const game = store.game;
	if (!game || game.pending || !model.isMyTurn()) return;
	if (store.viewSettings.mode === "leader" && store.viewSettings.selectedColour === colour) {
		resetSelection();
		return;
	}
	resetSelection();
	store.viewSettings.mode = "leader";
	store.viewSettings.selectedColour = colour;
	store.gameMessages.errorText = "";
	store.gameMessages.successText = "";
}

export function selectCatastrophe() {
	const store = useModelStore();
	const game = store.game;
	if (!game || game.pending || !model.isMyTurn()) return;
	resetSelection();
	store.viewSettings.mode = "catastrophe";
	store.gameMessages.errorText = "";
	store.gameMessages.successText = "";
}

export function selectSwapMode() {
	const store = useModelStore();
	const game = store.game;
	if (!game || game.pending || !model.isMyTurn()) return;
	resetSelection();
	store.viewSettings.mode = "swap";
	store.gameMessages.errorText = "";
	store.gameMessages.successText = "";
}

export function pickSwapTile(colour) {
	const store = useModelStore();
	const game = store.game;
	if (!game || store.viewSettings.mode !== "swap") return;
	const hand = game.players[model.mySeat()].hand;
	const total = COLOURS.reduce((sum, c) => sum + store.selectedSwap[c], 0);
	store.selectedSwap[colour] = cycleSwapCount(store.selectedSwap[colour], hand[colour], total);
	store.gameMessages.errorText = "";
}

export function swapTotal() {
	const store = useModelStore();
	return COLOURS.reduce((sum, colour) => sum + store.selectedSwap[colour], 0);
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
	commit({ type: "swap", tiles: { ...store.selectedSwap } });
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
