// Server communication for Land Between Rivers.
import { ungzip } from "pako";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import { currentActor, phaseOf } from "../js/LBRrules.js";

const API_BASE = "/LBR/";
export const POLL_INTERVAL_MS = 5000;

function getCsrfToken() {
	const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
	if (input) return input.value;
	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (name === "csrftoken") return value;
	}
	return "";
}

async function postJson(url, body, method = "POST") {
	const response = await fetch(url, {
		method,
		credentials: "same-origin",
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": getCsrfToken(),
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		if (response.status === 403) {
			window.location.href = "/login/";
			return null;
		}
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || `HTTP error ${response.status}`);
	}
	return response.json();
}

let saveQueue = Promise.resolve();
let savingCount = 0;

export function saveGame() {
	const store = useModelStore();
	savingCount += 1;
	store.viewSettings.saving = true;
	saveQueue = saveQueue
		.then(doSaveGame)
		.finally(() => {
			savingCount -= 1;
			if (savingCount === 0) store.viewSettings.saving = false;
		});
	return saveQueue;
}

async function doSaveGame() {
	const store = useModelStore();
	const personal = usePersonalStore();
	if (!store.gameID || !store.game) return;

	const game = store.game;
	const status = game.gameOver ? "FINISHED" : "ACTIVE";
	const nextPlayer = status === "FINISHED" ? [] : [store.playerNames[currentActor(game)]];
	const postData = {
		action: "saveGame",
		gameID: store.gameID,
		latestUpdate: store.latestUpdate,
		gameData: JSON.stringify(game),
		turn: game.turnNumber,
		phase: phaseOf(game),
		nextPlayer,
		status,
		saveRewind: status !== "FINISHED",
		checkName: personal.name,
	};
	if (status === "FINISHED") {
		const standings = game.standings || { rows: [], winners: [] };
		postData.winner = standings.winners.map((seat) => store.playerNames[seat]);
		postData.finalPositions = standings.rows.map((row) => row.seat);
	}

	try {
		const data = await postJson(`${API_BASE}processLBRturn/`, postData);
		if (!data) return;
		if (data.syncError) {
			store.gameMessages.errorText = "Another player moved first - loading the latest position.";
			store.viewSettings.mode = "idle";
			store.viewSettings.selectedColour = null;
			await loadGame();
			return;
		}
		store.latestUpdate = data.latestUpdate;
		if (data.secondsToNextKickout !== undefined) store.secondsToNextKickout = data.secondsToNextKickout;
		store.gameMessages.errorText = "";
	} catch (error) {
		console.error("Error saving LBR game", error);
		store.gameMessages.errorText = "Could not save the move. Reloading the last saved position.";
		await loadGame();
	}
}

export async function loadGame() {
	const store = useModelStore();
	try {
		const data = await postJson(`${API_BASE}data/1/`, {
			gameID: store.gameID,
			latestUpdate: store.latestUpdate,
		});
		if (!data) return;
		store.latestUpdate = data.latestUpdate;
		store.finishedGame = !!data.finishedGame;
		if (data.missingPlayers) store.missingPlayers = data.missingPlayers;
		if (data.aiSeats) store.aiSeats = JSON.parse(data.aiSeats);
		if (data.kickoutRequired !== undefined) store.kickoutRequired = data.kickoutRequired;
		if (data.secondsToNextKickout !== undefined) store.secondsToNextKickout = data.secondsToNextKickout;
		if (data.gameData) store.game = JSON.parse(data.gameData);
		store.viewSettings.mode = "idle";
		store.viewSettings.selectedColour = null;
	} catch (error) {
		console.error("Error loading LBR game", error);
	}
}

export async function checkForLatestData(force = false) {
	const store = useModelStore();
	const personal = usePersonalStore();
	if (!store.gameID || !personal.name) return;
	if (!force && store.viewSettings.saving) return;

	try {
		const data = await postJson(`${API_BASE}data/3/`, {
			gameID: store.gameID,
			latestUpdate: store.latestUpdate,
		});
		if (!data) return;
		if (data.secondsToNextKickout !== undefined) store.secondsToNextKickout = data.secondsToNextKickout;
		if (data.kickoutRequired !== undefined) store.kickoutRequired = data.kickoutRequired;
		if (data.missingPlayers) store.missingPlayers = data.missingPlayers;
		if (data.aiSeats) store.aiSeats = JSON.parse(data.aiSeats);
		if (data.latest) return;
		store.latestUpdate = data.latestUpdate;
		store.finishedGame = !!data.finishedGame;
		if (data.gameData) {
			try {
				store.game = JSON.parse(data.gameData);
				store.viewSettings.mode = "idle";
				store.viewSettings.selectedColour = null;
			} catch (error) {
				console.error("Could not parse incoming LBR game data", error);
			}
		}
	} catch (error) {
		console.error("Error polling LBR game", error);
	}
}

export async function loadChat() {
	const store = useModelStore();
	const data = await postJson(`${API_BASE}data/2/`, { gameID: store.gameID });
	if (!data) return;
	store.chatData = data.chatData || "";
	store.chatMessages = decompressChat(store.chatData);
	store.chatNotification = false;
}

export async function sendChat(message) {
	const store = useModelStore();
	const personal = usePersonalStore();
	const data = await postJson(`${API_BASE}sendChatMessage/`, {
		action: "sendChatMessage",
		gameID: store.gameID,
		newEntry: [personal.name, Date.now(), message],
	});
	if (!data) return;
	store.chatData = data.chatData || "";
	store.chatMessages = decompressChat(store.chatData);
}

export async function saveNotes(notes) {
	const store = useModelStore();
	return postJson(`${API_BASE}saveNotesLBR/`, { gameID: store.gameID, notes });
}

export async function saveZoom(zoomLevel) {
	const store = useModelStore();
	return postJson(
		`${API_BASE}saveZoomLBR/`,
		{ action: "zoom", gameID: store.gameID, zoomLevel, allPlayers: true },
		"PUT",
	);
}

export async function loadRewind() {
	const store = useModelStore();
	const data = await postJson(`${API_BASE}processLBRturn/`, {
		action: "loadRewind",
		gameID: store.gameID,
		latestUpdate: store.latestUpdate,
	});
	if (!data) return;
	if (data.errorMessage) {
		store.gameMessages.errorText = data.errorMessage;
		return;
	}
	store.game = JSON.parse(data.gameData);
	store.latestUpdate = data.latestUpdate;
	if (data.missingPlayers) store.missingPlayers = data.missingPlayers;
}

export async function kickout(target) {
	const store = useModelStore();
	const data = await postJson(`${API_BASE}processLBRturn/`, {
		action: "kickout",
		gameID: store.gameID,
		latestUpdate: store.latestUpdate,
		kickedName: target,
	});
	if (!data) return null;
	if (data.syncError) {
		store.gameMessages.errorText = "Another player moved first - loading the latest position.";
		await checkForLatestData(true);
		return null;
	}
	if (data.voteCast) {
		store.gameMessages.successText = "Kickout vote recorded. Waiting for the other players.";
		return data;
	}
	store.latestUpdate = data.latestUpdate;
	if (data.missingPlayers) store.missingPlayers = data.missingPlayers;
	if (data.secondsToNextKickout !== undefined) store.secondsToNextKickout = data.secondsToNextKickout;
	await checkForLatestData(true);
	return data;
}

export async function resign() {
	const store = useModelStore();
	return postJson(`${API_BASE}processLBRturn/`, {
		action: "resign",
		gameID: store.gameID,
	});
}

export function decompressChat(base64) {
	if (!base64) return [];
	try {
		const binary = atob(base64);
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		const text = ungzip(bytes, { to: "string" });
		const rows = JSON.parse(text);
		return Array.isArray(rows) ? rows : [];
	} catch (error) {
		console.error("Could not decompress chat", error);
		return [];
	}
}
