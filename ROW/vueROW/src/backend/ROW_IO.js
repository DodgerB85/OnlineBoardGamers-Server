/**
 * Minimal backend I/O: the server stores the whole serialized game and passes
 * turns. There is no per-action endpoint and no rule enforcement server-side.
 */

import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate"
import { usePersonalStore } from "../stores/ROWpersonal"

export function getCookie(name) {
	const cookies = document.cookie ? document.cookie.split(";") : []
	for (const c of cookies) {
		const cookie = c.trim()
		if (cookie.startsWith(name + "=")) return decodeURIComponent(cookie.substring(name.length + 1))
	}
	return null
}

function post(url, body) {
	const csrftoken = getCookie("csrftoken")
	return fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken ?? "" },
		body: JSON.stringify(body),
	})
}

function put(url, body) {
	const csrftoken = getCookie("csrftoken")
	return fetch(url, {
		method: "PUT",
		headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken ?? "" },
		body: JSON.stringify(body),
	})
}

export function compress(data) {
	const json = JSON.stringify(data)
	const bytes = gzipSync(strToU8(json))
	let binary = ""
	for (const b of bytes) binary += String.fromCharCode(b)
	return btoa(binary)
}

export function decompress(input) {
	if (!input) return null
	const binary = atob(input)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return JSON.parse(strFromU8(gunzipSync(bytes)))
}

export async function saveGame(payload) {
	const body = {
		action: "saveGame",
		gameID: payload.gameID,
		latestUpdate: payload.latestUpdate,
		gameData: JSON.stringify(payload.gameData),
		turn: payload.turn,
		phase: payload.phase,
		status: payload.status,
		allIsCurrentPlayers: payload.allIsCurrentPlayers,
		allRemainingPlayersInTurnOrder: payload.allRemainingPlayersInTurnOrder,
		saveRewind: payload.saveRewind ?? true,
		winnerUsername: payload.winner,
		finalPositions: payload.finalPositions,
	}
	const response = await post("/ROW/processROWturn/", body)
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

export async function reloadGameData(gameID) {
	const response = await post("/ROW/data/1/", { gameID })
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

/** Fetch the stored chat (gzip+base64) and clear this viewer's chat notification. */
export async function loadChat(gameID) {
	const response = await post("/ROW/data/2/", { gameID })
	if (!response.ok) throw new Error("Network response was not ok")
	const data = await response.json()
	return data.chatData
}

/** Persist the saved zoom level (PUT, shared_save_zoom). */
export async function saveZoom(gameID, zoomLevel) {
	const personal = usePersonalStore()
	// shared_save_zoom requires the seat index when not saving for all players.
	const response = await put("/ROW/saveZoomROW/", { action: "zoom", gameID, zoomLevel, playerNumber: personal.pov, allPlayers: false })
	if (!response.ok) throw new Error("Network response was not ok")
}

export async function sendChatMessage(gameID, newEntry) {
	const response = await post("/ROW/sendChatMessageROW/", { action: "sendChatMessage", gameID, newEntry })
	if (!response.ok) throw new Error("Network response was not ok")
	const data = await response.json()
	return data.chatData
}

export async function saveNotes(gameID, notes) {
	const response = await post("/ROW/saveNotesROW/", { action: "saveNotes", gameID, notes })
	if (!response.ok) throw new Error("Network response was not ok")
}

export async function loadRewind(gameID, latestUpdate) {
	const response = await post("/ROW/processROWturn/", { action: "loadRewind", gameID, latestUpdate })
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

export async function updateDataFromLoadRewind(payload) {
	const response = await post("/ROW/processROWturn/", {
		action: "updateDataFromLoadRewind",
		gameID: payload.gameID,
		latestUpdate: payload.latestUpdate,
		turn: payload.turn,
		phase: payload.phase,
		gameData: JSON.stringify(payload.gameData),
		allIsCurrentPlayers: payload.allIsCurrentPlayers,
		allRemainingPlayersInTurnOrder: payload.allRemainingPlayersInTurnOrder,
	})
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

export async function resign(gameID) {
	await post("/ROW/processROWturn/", { action: "resign", gameID })
}

/** Cast a vote (delete game / exclude from stats / rewind consent). */
export async function castVote(gameID, topic, choice = true) {
	const response = await post("/ROW/castVote/", { gameID, topic, choice })
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

/** Vote to kick out (or actually kick out) the timed-out player. */
export async function kickout(gameID, kickedName, latestUpdate) {
	const response = await post("/ROW/processROWturn/", { action: "kickout", gameID, kickedName, latestUpdate })
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

export async function submitBug(gameID, description, gameData) {
	const response = await post("/ROW/bugEntry/", { action: "bugentry", gameID, description, gameData: JSON.stringify(gameData) })
	if (!response.ok) throw new Error("Network response was not ok")
	const data = await response.json()
	return !!data.bugEntrySuccess
}
