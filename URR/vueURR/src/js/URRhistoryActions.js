/**
 * Numeric action codes for stored URR history entries.
 *
 * History stores [code, player, deltaSeconds, ...params]. Parameterless
 * actions carry no payload, so a pass is three numbers. Optional params come
 * last so absent ones are dropped, and params with a fixed vocabulary (kind,
 * choice) are stored as an index into their rf table. Unknown action types
 * fall back to the raw object.
 */
import * as rf from "./URRreference.js"

export const ACTION_RAW = 99

const SPECS = [
	{ code: 10, type: "pass", params: [] },
	{ code: 11, type: "buyNation", params: ["nation"] },
	{ code: 12, type: "bidNation", params: ["nation", "amount"] },
	{ code: 13, type: "tradeLand", params: ["buy", "sellBefore", "sellAfter", "exchangeDer"], clean: cleanTrade },
	{ code: 14, type: "bidPrimogeniture", params: ["amount"] },
	{ code: 15, type: "dig", params: ["crew", "path"] },
	{ code: 16, type: "digEridu", params: ["path"] },
	{ code: 17, type: "buyCard", params: ["kind", "area"] },
	{ code: 18, type: "requestWaterwork", params: ["kind", "area"] },
	{ code: 19, type: "offerNation", params: ["nation", "amount"] },
	{ code: 20, type: "respondOffer", params: ["accept"] },
	{ code: 21, type: "endDevelopment", params: [] },
	{ code: 22, type: "resolveMaintenance", params: ["sales"], clean: cleanEmptyArray },
	{ code: 23, type: "exchangeBarahshum", params: ["from", "to"] },
	{ code: 24, type: "exchangeCalah", params: ["kind", "area"] },
	{ code: 25, type: "allocateWater", params: ["area", "amount"] },
	{ code: 26, type: "advanceWater", params: [] },
	{ code: 27, type: "harvest", params: ["choice", "remove"] },
	{ code: 28, type: "beginDevelopment", params: [] },
	{ code: 29, type: "passBarahshum", params: ["passTurn"], clean: (value) => value === false ? undefined : value },
]

function cleanTrade(value, field) {
	if ((field === "sellBefore" || field === "sellAfter") && Array.isArray(value) && value.length === 0) return undefined
	if (field === "exchangeDer" && value === false) return undefined
	return value
}

function cleanEmptyArray(value) {
	return Array.isArray(value) && value.length === 0 ? undefined : value
}

const BY_CODE = new Map(SPECS.map((spec) => [spec.code, spec]))
const BY_TYPE = new Map(SPECS.map((spec) => [spec.type, spec]))
const PARAM_TABLES = { kind: rf.EQUIPMENT_KINDS, choice: rf.HARVEST_CHOICES }

function encodeValue(field, value) {
	const table = PARAM_TABLES[field]
	const index = table ? table.indexOf(value) : -1
	return index < 0 ? value : index
}

// A value that is not in the table passes through unchanged.
function decodeValue(field, value) {
	return PARAM_TABLES[field]?.[value] ?? value
}

export function encodeAction(action) {
	const spec = BY_TYPE.get(action.type)
	if (!spec) return [ACTION_RAW, [action]]
	const params = spec.params.map((field) => {
		const value = spec.clean ? spec.clean(action[field], field) : action[field]
		return encodeValue(field, value)
	})
	while (params.length && params.at(-1) === undefined) params.pop()
	return [spec.code, params]
}

export function historyAction(entry) {
	if (entry[0] === ACTION_RAW) return entry[3] ?? null
	const spec = BY_CODE.get(entry[0])
	if (!spec) return null
	const action = { type: spec.type }
	for (const [index, field] of spec.params.entries()) {
		const value = entry[3 + index]
		if (value !== undefined && value !== null) action[field] = decodeValue(field, value)
	}
	return action
}

export function isActionEntry(entry) {
	return entry[0] === ACTION_RAW || BY_CODE.has(entry[0])
}

export function historyChanges(entry) {
	return isActionEntry(entry) ? undefined : entry[3]
}
