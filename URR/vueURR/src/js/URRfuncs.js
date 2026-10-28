/**
 * Generic helper functions for the URR client.
 */

import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
import * as rf from "./URRreference.js"
import * as historyStorage from "./URRhistoryStorage.js"
import { normalizeEntry } from "./URRhistoryActions.js"

const STATE_FIELDS = ["players", "gameflow", "states", "nations", "board", "landPrices", "era", "cardSupply", "rain", "nextDiggerId"]
const RAIN_STEPS = [null, "routing", "harvest", "complete"]

export const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

// get CSRF for javascript
export function getCookie(name) {
	var cookieValue = null
	if (document.cookie && document.cookie !== "") {
		var cookies = document.cookie.split(";")
		for (var i = 0; i < cookies.length; i++) {
			var cookie = cookies[i].trim()
			if (cookie.substring(0, name.length + 1) === name + "=") {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
				break
			}
		}
	}
	return cookieValue
}

export function removeItemAll(arr, value) {
	var arrCopy = [...arr]
	var i = 0
	while (i < arrCopy.length) {
		if (arrCopy[i] === value) {
			arrCopy.splice(i, 1)
		} else {
			++i
		}
	}
	return arrCopy
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function compressData64(data) {
	let step1 = JSON.stringify(data)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let binary = ""
	// Large histories exceed the argument limit of a single spread call.
	for (let index = 0; index < step2.length; index += 32768) binary += String.fromCharCode(...step2.subarray(index, index + 32768))
	return btoa(binary)
}

export function decompressData64(input) {
	if (!input) return null
	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	return JSON.parse(decompressedData)
}

// Chat is stored server-side as gzip+base64 of [[name, deltaSeconds, message], ...]
// with the newest entry first. The deltas are relative to the next entry.
export function decompressChatData(data) {
	const personal = usePersonalStore()
	let chatArray = []
	if (data && data.length > 0) {
		let compressedData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
		// eslint-disable-next-line no-undef
		let decompressedData = pako.ungzip(compressedData, { to: "string" })
		chatArray = JSON.parse(decompressedData)
	}
	let currentFullTime = personal.gameCreationTimestamp
	for (let i = chatArray.length - 1; i >= 0; i--) {
		currentFullTime += chatArray[i][1]
		chatArray[i][1] = currentFullTime
	}
	return chatArray
}

export function timestampToString(timestamp) {
	var d = new Date(timestamp * 1000)
	var res = ""
	if (d.getDate() < 10) res += "0" + d.getDate() + "/"
	else res += d.getDate() + "/"
	if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
	else res += d.getMonth() + 1 + "/"
	res += d.getFullYear() + " "
	if (d.getHours() < 10) res += "0" + d.getHours() + ":"
	else res += d.getHours() + ":"
	if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
	else res += d.getMinutes() + ":"
	if (d.getSeconds() < 10) res += "0" + d.getSeconds()
	else res += d.getSeconds()

	return res
}

export function htmlEscape(str) {
	return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function htmlUnescape(str) {
	return String(str).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
}

export function snapshotState() {
	const store = useModelStore()
	return JSON.parse(JSON.stringify(Object.fromEntries(STATE_FIELDS.map((field) => [field, store[field]]))))
}

export function restoreState(snapshot) {
	const store = useModelStore()
	const data = JSON.parse(JSON.stringify(snapshot))
	for (const field of STATE_FIELDS) {
		if (data[field] === undefined) throw new Error(`Missing URR state field: ${field}`)
	}
	store.players.splice(0, store.players.length, ...data.players)
	for (const key of Object.keys(store.gameflow)) delete store.gameflow[key]
	Object.assign(store.gameflow, data.gameflow)
	for (const field of STATE_FIELDS) {
		if (field !== "players" && field !== "gameflow") store[field] = data[field]
	}
}

// Full browser-side snapshot used by resets and replay; never sent to the server.
export function simpleExportWholeURRmodel() {
	return compressData64({ state: snapshotState(), history: useModelStore().history })
}

export function simpleImportWholeURRmodel(input) {
	const data = decompressData64(input)
	const store = useModelStore()
	restoreState(data.state)
	store.setHistory(data.history)
}

function encodePlayers(players, forGameOver) {
	return players.map((player) => {
		const soldLandTypes = forGameOver ? 0 : player.soldLandTypes || []
		const soldEmergingStates = forGameOver ? 0 : player.soldEmergingStates || []
		const entry = [player.name, player.money, player.score || 0, soldLandTypes, soldEmergingStates, player.displayName !== player.name ? player.displayName : 0, player.isMissing ? 1 : 0]
		while (entry.length > 2) {
			const last = entry.at(-1)
			if (last !== 0 && !(Array.isArray(last) && last.length === 0)) break
			entry.pop()
		}
		return entry
	})
}

function decodePlayers(players) {
	return players.map((entry, index) => ({
		name: entry[0],
		displayName: entry[5] || entry[0],
		colour: rf.ALL_COLOURS[index],
		money: entry[1],
		score: entry[2] || 0,
		soldLandTypes: [...(entry[3] || [])],
		soldEmergingStates: [...(entry[4] || [])],
		...(entry[6] ? { isMissing: true } : {}),
	}))
}

function isDefault(value) {
	return value === 0 || value === null || value === undefined || (Array.isArray(value) && value.length === 0)
}

// Slot 0 of each table means "none", so the save stores the table index; text
// that is not in the table (an older save) passes through unchanged.
function encodeToken(table, value) {
	const index = table.indexOf(value ?? null)
	return index < 0 ? (value ?? 0) : index
}

function decodeToken(table, value) {
	return typeof value === "number" ? table[value] ?? null : value ?? null
}

function encodeGameflow(flow, forGameOver) {
	if (forGameOver) return [flow.turn, flow.phase, encodeToken(rf.END_REASONS, flow.endReason), flow.finalPositions || []]
	const entry = [
		flow.turn,
		flow.phase,
		[...flow.fullTurnOrder],
		[...flow.turnOrder],
		flow.primogeniture,
		flow.primogenitureBid ? [flow.primogenitureBid.player, flow.primogenitureBid.amount] : 0,
		flow.passes,
		flow.treatyResumePlayer,
		flow.ashurPrice,
		flow.auction ? [flow.auction.nation, [...flow.auction.bidders], flow.auction.highPlayer, flow.auction.amount] : 0,
		[...flow.stateOrder],
		flow.stateIndex,
		encodeToken(rf.DEVELOPMENT_STEPS, flow.developmentStep),
		encodeToken(rf.END_REASONS, flow.endReason),
		flow.pendingOffer ?? 0,
	]
	const optional = [flow.barahshumPass ?? 0, flow.waterworkRequests ?? 0, flow.waterworkAgreements ?? 0, flow.declinedWaterworks ?? 0, flow.offerDeclined ?? 0, flow.developmentPlan ?? 0, flow.finalPositions ?? 0]
	let last = -1
	optional.forEach((value, index) => {
		if (!isDefault(value)) last = index
	})
	if (last >= 0) entry.push(...optional.slice(0, last + 1))
	return entry
}

function decodeGameflow(entry, playerCount) {
	const flow = {
		turn: 1, phase: rf.PHASE_DIVIDING_NATIONS, fullTurnOrder: Array.from({ length: playerCount }, (_, index) => index), turnOrder: [0],
		primogeniture: 0, primogenitureBid: null, passes: 0, treatyResumePlayer: 0, ashurPrice: 20,
		auction: null, stateOrder: [], stateIndex: 0, developmentStep: null, endReason: null, pendingOffer: null,
	}
	if (entry.length === 4) {
		// Game-over saves only carry the fields the final screen still reads.
		return { ...flow, turn: entry[0], phase: entry[1], endReason: decodeToken(rf.END_REASONS, entry[2]), finalPositions: entry[3] || [], turnOrder: [] }
	}
	flow.turn = entry[0]
	flow.phase = entry[1]
	flow.fullTurnOrder = [...entry[2]]
	flow.turnOrder = [...entry[3]]
	flow.primogeniture = entry[4]
	flow.primogenitureBid = entry[5] ? { player: entry[5][0], amount: entry[5][1] } : null
	flow.passes = entry[6]
	flow.treatyResumePlayer = entry[7]
	flow.ashurPrice = entry[8]
	flow.auction = entry[9] ? { nation: entry[9][0], bidders: [...entry[9][1]], highPlayer: entry[9][2], amount: entry[9][3] } : null
	flow.stateOrder = [...entry[10]]
	flow.stateIndex = entry[11]
	if (entry[12]) flow.developmentStep = decodeToken(rf.DEVELOPMENT_STEPS, entry[12])
	if (entry[13]) flow.endReason = decodeToken(rf.END_REASONS, entry[13])
	if (entry[14]) flow.pendingOffer = entry[14]
	const optionalKeys = ["barahshumPass", "waterworkRequests", "waterworkAgreements", "declinedWaterworks", "offerDeclined", "developmentPlan", "finalPositions"]
	optionalKeys.forEach((key, index) => {
		const value = entry[15 + index]
		if (value !== undefined && value !== 0) flow[key] = value
	})
	return flow
}

function encodeStates(states, forGameOver = false) {
	return states.map((state) => {
		if (forGameOver) return [state.money, state.king ?? -1]
		const entry = [state.money, state.king ?? -1]
		const diggers = state.diggers.map((crew) => {
			const crewEntry = [crew.id, crew.era]
			if (crew.hasDug) crewEntry.push(1)
			return crewEntry
		})
		if (state.isActive || diggers.length || state.hasRevolted) {
			entry.push(state.isActive ? 1 : 0)
			if (diggers.length || state.hasRevolted) entry.push(diggers)
			if (state.hasRevolted) entry.push(1)
		}
		return entry
	})
}

function decodeStates(states) {
	return states.map((entry, id) => ({
		id,
		money: entry[0],
		king: entry[1] < 0 ? null : entry[1],
		isActive: !!entry[2],
		diggers: (entry[3] || []).map(([crewId, era, hasDug]) => ({ id: crewId, era, capacity: rf.ERA_CARD_DATA[era].digger[0], hasDug: !!hasDug })),
		hasRevolted: !!entry[4],
	}))
}

function ownerTypeCode(ownerType) {
	if (ownerType === null) return -1
	return ownerType === "player" ? 0 : 1
}

function encodeNations(nations, forGameOver = false) {
	return nations.map((nation) => {
		const bids = nation.bids.flatMap((bid) => [bid.player, bid.amount])
		const entry = [ownerTypeCode(nation.ownerType), nation.owner ?? -1]
		if (forGameOver) {
			if (nation.isRemoved) entry.push(1)
			return entry
		}
		if (nation.isRemoved || bids.length) {
			entry.push(nation.isRemoved ? 1 : 0)
			if (bids.length) entry.push(bids)
		}
		return entry
	})
}

function decodeNations(nations) {
	return nations.map((entry, id) => ({
		id,
		ownerType: entry[0] < 0 ? null : entry[0] === 0 ? "player" : "state",
		owner: entry[1] < 0 ? null : entry[1],
		isRemoved: !!entry[2],
		bids: (entry[3] || []).reduce((bids, value, index, all) => {
			if (index % 2 === 0) bids.push({ player: value, amount: all[index + 1] })
			return bids
		}, []),
	}))
}

function encodeRain(rain, areaIndex) {
	if (!rain || (rain.step === null && rain.outflow === null && !rain.harvestOrder?.length && !rain.routing)) return []
	const step = RAIN_STEPS.indexOf(rain.step)
	const entry = [step < 0 ? 0 : step, rain.outflow ?? -1, [...(rain.harvestOrder || [])]]
	if (rain.routing) {
		const routing = rain.routing
		entry.push([
			routing.sourceIndex ?? 0,
			routing.river ? [areaIndex.get(routing.river.area) ?? routing.river.area, routing.river.water] : 0,
			Object.entries(routing.arrivals || {}).map(([id, arrival]) => [areaIndex.get(id) ?? id, arrival.count, arrival.water]),
			routing.outflow ?? 0,
			(routing.stack || []).map((frame) => [areaIndex.get(frame.area) ?? frame.area, frame.water, frame.downstreamWater, (frame.visited || []).map((id) => areaIndex.get(id) ?? id), areaIndex.get(frame.originReservoir) ?? frame.originReservoir]),
		])
	}
	return entry
}

function decodeRain(entry, areaIds) {
	if (!entry?.length) return { step: null, outflow: null, harvestOrder: [] }
	const areaId = (value) => (typeof value === "number" ? areaIds[value] : value)
	const [step, outflow, harvestOrder, routing] = entry
	const rain = { step: RAIN_STEPS[step] ?? null, outflow: outflow < 0 ? null : outflow, harvestOrder: [...(harvestOrder || [])] }
	if (routing) {
		rain.routing = {
			sourceIndex: routing[0],
			river: routing[1] ? { area: areaId(routing[1][0]), water: routing[1][1] } : null,
			arrivals: Object.fromEntries((routing[2] || []).map(([id, count, water]) => [areaId(id), { count, water }])),
			outflow: routing[3],
			stack: (routing[4] || []).map(([id, water, downstreamWater, visited, originReservoir]) => ({ area: areaId(id), water, downstreamWater, visited: (visited || []).map(areaId), originReservoir: areaId(originReservoir) })),
		}
	}
	return rain
}

function encodeCardSupply(cardSupply) {
	return [1, 2, 3, 4].map((era) => cardSupply?.[era] ?? rf.ERA_CARD_COUNTS[era])
}

function decodeCardSupply(entry) {
	if (!entry?.length) return { ...rf.ERA_CARD_COUNTS }
	return Object.fromEntries([1, 2, 3, 4].map((era) => [era, entry[era - 1] ?? rf.ERA_CARD_COUNTS[era]]))
}

export function exportURRmodel(forGameOver = false) {
	const store = useModelStore()
	const state = snapshotState()
	const areaIndex = historyStorage.printedAreaIndexMap()
	const history = store.history

	// Replay entries: actions + state-changing special events (kickout, resign).
	// Excludes HIST_ACTION (3) summaries which are display-only.
	function isReplayEntry(e) {
		const code = e[0]
		return code === rf.HIST_KICKOUT || code === rf.HIST_RESIGN || (code >= 10 && code <= 28) || code === 99
	}

	const entry = [
		encodePlayers(state.players, forGameOver),
		encodeGameflow(state.gameflow, forGameOver),
		encodeStates(state.states, forGameOver),
		encodeNations(state.nations, forGameOver),
		historyStorage.compactBoard(state.board, forGameOver),
		state.landPrices,
		state.era,
		encodeCardSupply(state.cardSupply),
		forGameOver ? [] : encodeRain(state.rain, areaIndex),
		forGameOver ? -1 : state.nextDiggerId,
		// Replay slot: only entries that affect game state (actions + kickout + resign).
		// HIST_ACTION summaries are display-only, reconstructed on load by computeHistory.
		history.slice(1).filter(isReplayEntry).map(normalizeEntry),
	]
	entry.push(history[0]?.[3] ?? [])

	console.log(JSON.stringify(entry))

	return compressData64(entry)
}

export function importURRmodel(input) {
	const data = typeof input === "string" ? (input.trim().startsWith("{") ? JSON.parse(input) : decompressData64(input)) : input
	if (data?.opening) {
		const names = data.players.map((player) => (typeof player === "string" ? player : player.name))
		const history = historyStorage.expandHistory({ replay: [], replayStart: data.replayStart }, rf.HIST_NEW_GAME)
		return { state: historyStorage.openingState(names, data.replayStart || []), history }
	}
	if (!Array.isArray(data) || data.length < 12) throw new Error("Unsupported URR save")
	const players = decodePlayers(data[0])
	const states = decodeStates(data[2])
	const state = {
		players,
		gameflow: decodeGameflow(data[1], players.length),
		states,
		nations: decodeNations(data[3]),
		board: historyStorage.expandBoard(data[4]),
		landPrices: data[5],
		era: data[6],
		cardSupply: decodeCardSupply(data[7]),
		rain: decodeRain(data[8], historyStorage.printedAreaIds()),
		nextDiggerId: data[9] >= 0 ? data[9] : Math.max(-1, ...states.flatMap((entry) => entry.diggers.map((crew) => crew.id))) + 1,
	}
	const history = historyStorage.expandHistory({ replay: data[10], replayStart: data[11] }, rf.HIST_NEW_GAME)
	return { state, history }
}
