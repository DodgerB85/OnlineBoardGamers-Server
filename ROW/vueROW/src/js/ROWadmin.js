/**
 * Admin/debug edits. The same change list is applied to the live game and
 * replayed from history, so an edit survives a rebuild from the opening position.
 * Every field stores an absolute target value: replay never recomputes a delta.
 */
import { Worker } from "./ROWcore"
import { CERTIFICATE_STEPS } from "./ROWengine"

const MAX_WORKERS = 6
const MAX_BRANCHLETS = 15

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, Math.trunc(value)))
}

function certificateValue(ps, value) {
	const allowed = CERTIFICATE_STEPS.filter((step) => step <= ps.getTempCertificateLimit())
	return allowed.reduce((best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best), allowed[0])
}

function workerField(key, worker, labelKey) {
	const normalize = (ps, value) => clamp(value, 0, MAX_WORKERS)
	return {
		key,
		labelKey,
		get: (ps) => ps.workers[worker] ?? 0,
		normalize,
		set: (ps, value) => {
			const next = normalize(ps, value)
			ps.workers[worker] = next
			if (worker === Worker.COWBOY) ps.numberOfCowboysUsedInTurn = Math.min(ps.numberOfCowboysUsedInTurn, next)
		},
	}
}

export const ADMIN_FIELDS = [
	{
		key: "balance",
		labelKey: "row.debug.dollars",
		get: (ps) => ps.balance,
		normalize: (ps, value) => Math.max(0, Math.trunc(value)),
		set: (ps, value) => {
			ps.balance = Math.max(0, Math.trunc(value))
		},
	},
	workerField("cowboys", Worker.COWBOY, "row.debug.cowboys"),
	workerField("craftsmen", Worker.CRAFTSMAN, "row.debug.craftsmen"),
	workerField("engineers", Worker.ENGINEER, "row.debug.engineers"),
	{
		key: "exchangeTokens",
		labelKey: "row.debug.exchangeTokens",
		get: (ps) => ps.exchangeTokens,
		normalize: (ps, value) => Math.max(0, Math.trunc(value)),
		set: (ps, value) => {
			ps.exchangeTokens = Math.max(0, Math.trunc(value))
		},
	},
	{
		key: "jobMarketToken",
		labelKey: "row.playerTable.jobMarketToken",
		get: (ps) => (ps.jobMarketToken ? 1 : 0),
		normalize: (ps, value) => clamp(value, 0, 1),
		set: (ps, value) => {
			ps.jobMarketToken = value > 0
		},
	},
	{
		key: "tempCertificates",
		labelKey: "row.stats.tempCerts",
		get: (ps) => ps.tempCertificates,
		normalize: certificateValue,
		set: (ps, value) => {
			ps.tempCertificates = certificateValue(ps, value)
		},
	},
	{
		key: "branchlets",
		labelKey: "row.debug.branchlets",
		get: (ps) => ps.branchlets,
		normalize: (ps, value) => clamp(value, 0, MAX_BRANCHLETS),
		set: (ps, value) => {
			ps.branchlets = clamp(value, 0, MAX_BRANCHLETS)
		},
		available: (game) => game.isRailsToTheNorth(),
	},
]

/** Build absolute from/to edits for every changed input, skipping no-ops. */
export function adminChangesFor(ps, values) {
	const changes = []
	for (const field of ADMIN_FIELDS) {
		const raw = values[field.key]
		if (raw === "" || raw == null) continue
		const value = Number(raw)
		if (!Number.isFinite(value)) continue
		const from = field.get(ps)
		const to = field.normalize(ps, value)
		if (to !== from) changes.push({ field: field.key, from, to })
	}
	return changes
}

/** Apply a recorded edit. Unknown fields are ignored so old histories still load. */
export function applyAdminChanges(game, player, changes) {
	const ps = game.playerState(player)
	for (const change of changes ?? []) {
		const field = ADMIN_FIELDS.find((f) => f.key === change.field)
		if (field && Number.isFinite(change.to)) field.set(ps, change.to)
	}
}
