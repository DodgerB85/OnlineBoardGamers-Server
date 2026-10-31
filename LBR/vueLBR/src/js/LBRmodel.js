// LBR model: init from the page payload and shared read-only helpers.
import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import { createInitialState, currentActor, phaseOf } from "./LBRrules.js";
import { SEAT_MARKS } from "./LBRreference.js";

export function initGame() {
	const store = useModelStore();
	const personal = usePersonalStore();
	const data = window.initData || {};

	personal.name = data.name || "";
	personal.pov = typeof data.pov === "number" ? data.pov : -99;
	personal.gameID = data.gameID || 0;
	personal.zoom = data.myZoomLevel || 39;
	personal.gameCreationTimestamp = data.gameCreationTimestamp || 0;
	personal.chatNotification = !!data.chatNotification;
	personal.isAdmin = personal.pov === -1;

	const options = data.startingOptions || [];
	personal.trainingGame = options.includes(102);
	personal.learningGame = options.includes(110);
	personal.experiencedGame = options.includes(120);

	store.gameID = data.gameID || 0;
	store.gameName = data.gameName || "";
	store.playerNames = data.playerNames || [];
	const shadowNames = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"];
	const labels = Array.isArray(data.displayNames) ? data.displayNames : [];
	store.displayNames = {};
	for (let i = 0; i < labels.length && i < shadowNames.length; i++) {
		store.displayNames[shadowNames[i]] = labels[i];
	}
	store.currentPlayers = Array.isArray(data.currentPlayers) ? data.currentPlayers : [];
	store.latestUpdate = data.latestUpdate || 0;
	store.finishedGame = !!data.finishedGame;
	store.notes = data.notes || "";
	store.chatData = data.chatData || "";
	store.secondsToNextKickout = data.secondsToNextKickout || 0;
	store.kickoutRequired = data.kickoutRequired || 0;
	store.kickoutVotesData = data.kickoutVotesData || {};
	store.kickoutVoteThreshold = data.kickoutVoteThreshold || 0;
	store.chatNotification = !!data.chatNotification;

	if (data.gameData) {
		try {
			store.game = JSON.parse(data.gameData);
			if (store.game?.displayNames) store.displayNames = store.game.displayNames;
		} catch (error) {
			console.error("Could not parse LBR game data", error);
			store.game = null;
		}
	}
	personal.selectedSeat = personal.pov >= 0 ? personal.pov : 0;
}

export function seatUsername(seat) {
	const store = useModelStore();
	return store.playerNames[seat] || "";
}

export function seatName(seat) {
	const store = useModelStore();
	const username = store.playerNames[seat];
	if (!username) return `Seat ${seat + 1}`;
	return store.displayNames[username] || username;
}

export function seatOfName(name) {
	const store = useModelStore();
	return store.playerNames.indexOf(name);
}

export function actorSeat() {
	const store = useModelStore();
	return store.game ? currentActor(store.game) : -1;
}

export function actorName() {
	return seatName(actorSeat());
}

export function actorUsername() {
	return seatUsername(actorSeat());
}

export function mySeat() {
	const personal = usePersonalStore();
	const store = useModelStore();
	if (personal.trainingGame && store.game) return currentActor(store.game);
	return personal.pov;
}

export function isMissing(seat) {
	const store = useModelStore();
	return store.missingPlayers.includes(seatUsername(seat));
}

export function isMyTurn() {
	const personal = usePersonalStore();
	const store = useModelStore();
	if (!store.game || store.game.gameOver || store.finishedGame) return false;
	const actor = currentActor(store.game);
	if (personal.trainingGame) return true;
	return personal.pov === actor;
}

export function isMyAction(seat) {
	const personal = usePersonalStore();
	if (personal.trainingGame) return true;
	return personal.pov === seat;
}

export function visibleScore(seat) {
	const personal = usePersonalStore();
	const store = useModelStore();
	if (personal.trainingGame) return true;
	if (store.game && store.game.gameOver) return true;
	return personal.pov === seat;
}

export function markForSeat(seat) {
	return SEAT_MARKS[seat] || "bull";
}

export function seatColourClass(seat) {
	return ["mark-bull", "mark-urn", "mark-lion", "mark-bow"][seat] || "mark-bull";
}

export function turnText() {
	const store = useModelStore();
	if (!store.game) return "";
	const game = store.game;
	if (game.gameOver) return "Game over";
	if (game.pending) {
		if (game.pending.kind === "treasure") return `Turn ${game.turnNumber}: ${seatName(game.pending.seat)} takes treasures`;
		if (game.pending.kind === "warOrder") return `Turn ${game.turnNumber}: ${seatName(game.pending.seat)} chooses a conflict`;
		if (game.pending.kind === "warSupport" || game.pending.kind === "revoltSupport") {
			return `Turn ${game.turnNumber}: ${seatName(game.pending.seat)} sends support`;
		}
		if (game.pending.kind === "monument") return `Turn ${game.turnNumber}: ${seatName(game.pending.seat)} may build a monument`;
	}
	return `Turn ${game.turnNumber}: ${seatName(game.activeSeat)} (${2 - game.actionsUsed} actions)`;
}

export function phaseForSave() {
	const store = useModelStore();
	return store.game ? phaseOf(store.game) : 0;
}

export function newGameState(numSeats, rng = Math.random) {
	return createInitialState(numSeats, rng);
}
