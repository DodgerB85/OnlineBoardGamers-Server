/**
 * Minimal backend I/O: the server stores the whole serialized game and passes
 * turns. There is no per-action endpoint and no rule enforcement server-side.
 */

import { deflateSync, gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate"

export function getCookie(name: string): string | null {
	const cookies = document.cookie ? document.cookie.split(";") : []
	for (const c of cookies) {
		const cookie = c.trim()
		if (cookie.startsWith(name + "=")) return decodeURIComponent(cookie.substring(name.length + 1))
	}
	return null
}

function post(url: string, body: unknown): Promise<Response> {
	const csrftoken = getCookie("csrftoken")
	return fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken ?? "" },
		body: JSON.stringify(body),
	})
}

export function compress(data: unknown): string {
	const json = JSON.stringify(data)
	const bytes = gzipSync(strToU8(json))
	let binary = ""
	for (const b of bytes) binary += String.fromCharCode(b)
	return btoa(binary)
}

export function decompress(input: string): unknown {
	if (!input) return null
	const binary = atob(input)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return JSON.parse(strFromU8(gunzipSync(bytes)))
}

export interface SaveResult {
	latestUpdate: string
	secondsToNextKickout: number
	syncError?: boolean
}

export async function saveGame(payload: {
	gameID: number
	latestUpdate: string | number
	gameData: unknown
	turn: number
	phase: number
	status: "ACTIVE" | "FINISHED"
	allIsCurrentPlayers: string[]
	allRemainingPlayersInTurnOrder: string[]
	saveRewind?: boolean
	winner?: string
	finalPositions?: number[]
}): Promise<SaveResult> {
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

export async function reloadGameData(gameID: number): Promise<{ gameData: string; latestUpdate: string; secondsToNextKickout: number }> {
	const response = await post("/ROW/data/1/", { gameID })
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

/** Fetch the stored chat (gzip+base64) and clear this viewer's chat notification. */
export async function loadChat(gameID: number): Promise<string> {
	const response = await post("/ROW/data/2/", { gameID })
	if (!response.ok) throw new Error("Network response was not ok")
	const data = await response.json()
	return data.chatData
}

export async function sendChatMessage(gameID: number, newEntry: unknown[]): Promise<string> {
	const response = await post("/ROW/sendChatMessageROW/", { action: "sendChatMessage", gameID, newEntry })
	if (!response.ok) throw new Error("Network response was not ok")
	const data = await response.json()
	return data.chatData
}

export async function saveNotes(gameID: number, notes: string): Promise<void> {
	const response = await post("/ROW/saveNotesROW/", { action: "saveNotes", gameID, notes })
	if (!response.ok) throw new Error("Network response was not ok")
}

export async function loadRewind(gameID: number, latestUpdate: string | number): Promise<unknown> {
	const response = await post("/ROW/processROWturn/", { action: "loadRewind", gameID, latestUpdate })
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

export async function updateDataFromLoadRewind(payload: {
	gameID: number
	turn: number
	phase: number
	gameData: unknown
	allIsCurrentPlayers: string[]
	allRemainingPlayersInTurnOrder: string[]
}): Promise<{ latestUpdate: string; secondsToNextKickout: number }> {
	const response = await post("/ROW/processROWturn/", {
		action: "updateDataFromLoadRewind",
		gameID: payload.gameID,
		turn: payload.turn,
		phase: payload.phase,
		gameData: JSON.stringify(payload.gameData),
		allIsCurrentPlayers: payload.allIsCurrentPlayers,
		allRemainingPlayersInTurnOrder: payload.allRemainingPlayersInTurnOrder,
	})
	if (!response.ok) throw new Error("Network response was not ok")
	return response.json()
}

export async function resign(gameID: number): Promise<void> {
	await post("/ROW/processROWturn/", { action: "resign", gameID })
}

export async function submitBug(gameID: number, description: string, gameData: unknown): Promise<boolean> {
	const response = await post("/ROW/bugEntry/", { action: "bugentry", gameID, description, gameData: JSON.stringify(gameData) })
	if (!response.ok) throw new Error("Network response was not ok")
	const data = await response.json()
	return !!data.bugEntrySuccess
}

// Exposed for potential future compression needs.
export { deflateSync }
