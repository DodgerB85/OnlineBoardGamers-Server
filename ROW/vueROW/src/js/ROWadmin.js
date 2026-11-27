/**
 * Admin/debug edits. The same change list is applied to the live game and
 * replayed from history, so an edit survives a rebuild from the opening position.
 * Every field stores an absolute target value: replay never recomputes a delta.
 */
import { UNLOCKABLE_INFO, Unlockable, Worker } from "./ROWcore"
import { CERTIFICATE_STEPS } from "./ROWengine"

const MAX_WORKERS = 6
const MAX_BRANCHLETS = 15

const DISC_LABELS = {
	[Unlockable.CERT_LIMIT_4]: "Certificate limit 4",
	[Unlockable.CERT_LIMIT_6]: "Certificate limit 6",
	[Unlockable.EXTRA_STEP_DOLLARS]: "Step limit +1 ($3 space)",
	[Unlockable.EXTRA_STEP_POINTS]: "Step limit +1 (3 VP space)",
	[Unlockable.EXTRA_CARD]: "Hand limit +1 ($5 space)",
	[Unlockable.AUX_GAIN_DOLLAR]: "Auxiliary: gain $1",
	[Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD]: "Auxiliary: draw/discard",
	[Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT]: "Auxiliary: engine back + certificate",
	[Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD]: "Auxiliary: pay + engine forward",
	[Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD]: "Auxiliary: engine back + remove card",
	[Unlockable.AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET]: "Auxiliary: discard cattle + branchlet",
}

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

/**
 * Player-board disc spaces. A space is cleared by increasing `unlocked` for its
 * Unlockable, so admin edits store the absolute cleared count. These fields are
 * hidden from the generic number grid and driven by the disc control in DebugArea.
 */
export const DISC_FIELDS = Object.values(Unlockable).map((u) => {
	const count = UNLOCKABLE_INFO[u].count
	return {
		key: `disc_${u}`,
		u,
		count,
		hidden: true,
		labelKey: "row.debug.disc",
		label: DISC_LABELS[u] ?? u,
		get: (ps) => ps.unlocked[u] ?? 0,
		normalize: (ps, value) => clamp(value, 0, count),
		set: (ps, value) => {
			ps.unlocked[u] = clamp(value, 0, count)
		},
		available: (game) => u !== Unlockable.AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET || game.isRailsToTheNorth(),
	}
})

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
	...DISC_FIELDS,
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
