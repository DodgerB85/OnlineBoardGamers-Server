<script setup>
/**
 * Interactive trail board, ported from the boardgamefiesta GWT trail.component
 * SVG (GPL-3.0, Tom Wetjens). Same absolute coordinates as the original board
 * artwork, and the same click semantics: click a trail spot / city / job-market
 * worker / track space / station / foresight tile to run the matching engine
 * action. Spots with more than one legal interpretation open a chooser.
 */
import { computed, ref } from "vue"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as model from "../js/ROWmodel"
import * as map from "../js/ROWmap"
import * as view from "../js/ROWview"
import { cityStrip, RTTN_BIG_TOWNS } from "../js/ROWdata"
import { useModelStore } from "../stores/ROWstore.js"

const { ActionType } = rf
const store = useModelStore()

const {
	CITY_POSITIONS,
	FORESIGHT_SLOTS,
	JOB_MARKET,
	RTTN_CITY_SPOTS,
	RTTN_MEDIUM_TOWN_SPOTS,
	RTTN_STATION_SPOTS,
	RTTN_TOWN_SPOTS,
	SPACE_RECTS,
	STATION_DISCS,
	STATION_MASTERS,
	STATION_POSITIONS,
	TRAIL_SPOTS,
} = map
const { BUILD_ACTIONS, HAZARD_ACTIONS, WORKER_ACTIONS } = map

const game = computed(() => {
	store.version
	return store.game
})
function g() {
	const v = game.value
	if (!v) throw new Error("no game")
	return v
}

const rttn = computed(() => game.value?.isRailsToTheNorth() ?? false)
const shift = computed(() => (rttn.value ? 195 : 0))
const board = computed(() => (game.value ? view.boardImage(game.value.edition) : ""))
const rttnStrip = computed(() => (game.value ? view.editionImage(game.value.edition, "rttn.jpg") : ""))

const colorByPlayer = computed(() => {
	const out = {}
	for (const p of game.value?.state.players ?? []) out[p.name] = p.color.toLowerCase()
	return out
})

function spot(name) {
	const s = TRAIL_SPOTS[name]
	if (!s) return null
	if (s.edition && s.edition !== (game.value?.edition ?? "FIRST")) return null
	if (game.value?.edition === "SECOND" && s.x2 !== undefined && s.y2 !== undefined) return { ...s, x: s.x2, y: s.y2 }
	return s
}
function center(name) {
	const s = spot(name)
	return s ? { cx: s.x + s.w / 2, cy: s.y + s.h / 2 } : null
}

// ---------- candidate resolution: one click, what can it do? ----------
const chooser = ref(null)

/** Where the next click would count as a step from: the last spot clicked, else where the player stands. */
const moveOrigin = computed(() => {
	if (!game.value) return null
	const planned = store.plannedSteps
	if (planned.length) return planned[planned.length - 1]
	return g().getTrail().currentLocation(g().currentPlayer)
})

/** A MOVE-family action picked off a building, armed until a spot is clicked or it is cancelled. */
const armedMove = computed(() => (game.value ? map.armedTrailMove(g(), store.actions, store.selectedAction) : null))

const moves = computed(() => {
	if (!game.value || !store.currentPlayer) return []
	// A building move is always one move, not a plan, and starts where the player stands.
	const armed = armedMove.value
	if (armed) {
		try {
			return model.possibleMovesFor(store.currentPlayer, armed.limit)
		} catch {
			return []
		}
	}
	if (!store.actions.includes(ActionType.MOVE)) return []
	try {
		return model.possibleMovesFor(store.currentPlayer, store.moveStepsLeft, moveOrigin.value)
	} catch {
		return []
	}
})

/**
 * Walk towards `name`: take the highlighted route when it spends the last of the
 * turn's steps, otherwise record the step and keep highlighting what is left.
 * The opening placement goes straight onto a building, and Kansas City ends the
 * trail, so both commit at once.
 */
function takeMove(name) {
	const target = moveTargets.value.get(name)
	if (!target) return
	const steps = [...store.plannedSteps, ...target.steps]
	const endsMove = !moveOrigin.value || map.moveDestination(target) === "KANSAS_CITY" || store.moveStepsLeft <= target.steps.length
	if (endsMove) {
		const to = controller.commitMove(steps)
		// Out of steps: drop straight into the actions of the spot we landed on.
		if (to) enterBuilding(to)
	} else {
		store.planMove(steps)
	}
}

function candidatesFor(name) {
	if (!game.value) return []
	const acts = store.actions
	const player = g().currentPlayer
	const out = []

	const armed = armedMove.value
	if (armed) {
		// A building move is all-or-nothing: it has no plan and no staying put.
		const target = moveTargets.value.get(name)
		if (target) out.push({ label: moveLabel(target), run: () => controller.perform({ type: armed.type, steps: target.steps }) })
	} else if (acts.includes(ActionType.MOVE)) {
		// One move per spot: the cheapest route, the same one drawn in light green.
		const target = moveTargets.value.get(name)
		if (target) out.push({ label: moveLabel(target), run: () => takeMove(name) })
	}

	const loc = g().getTrail().locations.get(name)
	if (!loc) return out

	const sel = store.selectedAction
	if (loc.hazard) {
		const hz = HAZARD_ACTIONS.find((a) => acts.includes(a))
		if (hz) out.push({ label: `Remove hazard`, run: () => controller.perform({ type: hz, location: name }) })
	}
	if (loc.teepee && acts.includes(ActionType.TRADE_WITH_TRIBES)) {
		out.push({ label: `Trade with tribe`, run: () => controller.perform({ type: ActionType.TRADE_WITH_TRIBES, location: name }) })
	}
	if (sel && BUILD_ACTIONS.includes(sel) && loc.kind === "BUILDING" && (!loc.building || loc.building.player === player)) {
		const picked = store.pendingBuilding
		if (picked) {
			out.length = 0
			out.push({ label: `Place ${picked} here`, run: () => controller.perform({ type: sel, location: name, building: picked }) })
		} else {
			const color = colorByPlayer.value[player] ?? "red"
			for (const b of g().playerState(player).buildings) {
				out.push({
					label: `Place building ${b}`,
					img: view.buildingImage(g().edition, b, color),
					enabled: map.canPlaceBuilding(g(), player, loc, b, sel),
					run: () => controller.perform({ type: sel, location: name, building: b }),
				})
			}
		}
	} else if (sel === ActionType.USE_ADJACENT_BUILDING && loc.building) {
		out.push({ label: `Use ${loc.building.name} building`, run: () => controller.perform({ type: ActionType.USE_ADJACENT_BUILDING, location: name }) })
	}
	return out
}

function playerFeesLabel(m) {
	return Object.entries(m.playerFees)
		.map(([p, f]) => `${f}$ to ${p}`)
		.join(", ")
}

function moveLabel(m) {
	const fee = playerFeesLabel(m)
	return `Move here (${m.cost}$${fee ? "; " + fee : ""})`
}

// ---------- trail moves: cheapest/shortest path per destination ----------
const moveTargets = computed(() => {
	const out = new Map()
	for (const m of moves.value) {
		const to = map.moveDestination(m)
		const best = out.get(to)
		if (!best || m.cost < best.cost || (m.cost === best.cost && m.steps.length < best.steps.length)) out.set(to, m)
	}
	return out
})

/** The spot under the cursor that is a move destination, if any. */
const hoveredMove = ref(null)

/** Spots to light green: those already walked, plus the hovered destination's route. */
const moveRoute = computed(() => {
	if (!game.value) return new Set()
	const trail = g().getTrail()
	const player = g().currentPlayer
	const out = new Set()
	const add = (steps, from) => {
		if (!from) return
		for (const spot of map.trailRoute(trail, from, steps) ?? []) out.add(spot)
	}
	// Walked so far: stays lit until the move is committed or changed.
	add(store.plannedSteps, trail.currentLocation(player))
	// One step away the outline itself is enough; further lights the whole route.
	const target = hoveredMove.value ? moveTargets.value.get(hoveredMove.value) : null
	if (target && target.steps.length > 1) add(target.steps, target.from)
	return out
})

/** Highlight tone: cyan when more than one step away, light green on the shown route, else the default yellow. */
function locationTone(name) {
	if (moveRoute.value.has(name)) return "route"
	const target = moveTargets.value.get(name)
	return target && target.steps.length > 1 ? "far" : ""
}

function clickLocation(name) {
	const cands = candidatesFor(name)
	if (!cands.length) return
	if (cands.length === 1 && cands[0].enabled !== false) return cands[0].run()
	const c = center(name)
	if (!c) return
	chooser.value = { x: c.cx, y: c.cy, cands }
}

function choose(c) {
	if (c.enabled === false) return
	c.run()
	chooser.value = null
}

// ---------- other click targets ----------
function clickCity(idx, city) {
	if (!game.value || !store.actions.includes(ActionType.DELIVER_TO_CITY)) return
	const name = city ?? cityStrip(g().edition, g().isRailsToTheNorth())[idx]
	const pd = g().possibleDeliveries().find((d) => d.city === name)
	if (pd) controller.perform({ type: ActionType.DELIVER_TO_CITY, city: pd.city, certificates: pd.certificates })
}

function clickSpace(space) {
	if (!game.value) return
	const selected = store.selectedAction
	if (selected && map.engineMoveRange(selected, g()) && map.reachableSpacesFor(selected, g()).has(space)) {
		controller.perform({ type: selected, to: space })
		return
	}
	for (const a of store.actions) {
		if (map.reachableSpacesFor(a, g()).has(space)) {
			controller.perform({ type: a, to: space })
			return
		}
	}
}

function clickStation(i) {
	if (!game.value) return
	const acts = store.actions
	const player = g().currentPlayer
	const rt = g().getRailroadTrack()
	const station = rt.stations[i]
	if (!station) return
	// Rails to the North: the station town you just branched onto offers its own upgrade.
	if (acts.includes(ActionType.UPGRADE_STATION_TOWN) && (i === 10 || i === 11))
		return controller.perform({ type: ActionType.UPGRADE_STATION_TOWN })
	if (acts.includes(ActionType.DOWNGRADE_STATION) && station.upgradedBy.includes(player)) return controller.perform({ type: ActionType.DOWNGRADE_STATION, station: i })
	if (acts.includes(ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE) && parseFloat(rt.currentSpace(player)) > parseFloat(station.space)) {
		return controller.perform({ type: ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE, station: i })
	}
}

function hireActionFor(row, worker) {
	if (!game.value) return null
	const jm = g().getJobMarket()
	if (row >= jm.currentRowIndex) return null
	const hire = WORKER_ACTIONS.find((a) => store.actions.includes(a))
	if (!hire) return null
	const mod = hire === ActionType.HIRE_WORKER_PLUS_2 ? 2 : hire === ActionType.HIRE_WORKER_MINUS_1 ? -1 : hire === ActionType.HIRE_WORKER_MINUS_2 ? -2 : 0
	if (jm.cost(row, worker) + mod > g().playerState(g().currentPlayer).balance) return null
	return hire
}

function clickWorker(row, worker) {
	const hire = hireActionFor(row, worker)
	if (!hire) return
	controller.perform({ type: hire, row, worker })
}

function clickForesight(col, row) {
	if (!game.value) return
	const a = [ActionType.CHOOSE_FORESIGHT_1, ActionType.CHOOSE_FORESIGHT_2, ActionType.CHOOSE_FORESIGHT_3][col]
	if (!store.actions.includes(a)) return
	controller.perform({ type: a, choice: row })
}

// ---------- render data ----------
const trailLocations = computed(() => {
	if (!game.value) return []
	return [...g().getTrail().locations.keys()].map((name) => ({ name, rect: spot(name) })).filter((l) => !!l.rect)
})

const buildingTiles = computed(() => {
	if (!game.value) return []
	const out = []
	for (const [name, loc] of g().getTrail().locations) {
		if (!loc.building) continue
		const rect = spot(name)
		if (!rect) continue
		const img = loc.building.player
			? view.buildingImage(g().edition, loc.building.name, colorByPlayer.value[loc.building.player] ?? "red")
			: view.editionImage("FIRST", `${loc.building.name.toLowerCase()}.jpg`)
		out.push({ name, building: loc.building.name, img, rect })
	}
	return out
})

const hazardTiles = computed(() => {
	if (!game.value) return []
	const out = []
	for (const [name, loc] of g().getTrail().locations) {
		if (!loc.hazard) continue
		const rect = spot(name)
		if (!rect) continue
		out.push({ name, img: view.hazardImage(loc.hazard.type, loc.hazard.hand), points: loc.hazard.points, rect })
	}
	return out
})

const teepeeTiles = computed(() => {
	if (!game.value) return []
	const out = []
	for (const [name, loc] of g().getTrail().locations) {
		if (!loc.teepee) continue
		const rect = spot(name)
		if (!rect) continue
		out.push({ name, img: view.teepeeImage(loc.teepee), rect })
	}
	return out
})

const ranchers = computed(() => {
	if (!game.value) return []
	const byLoc = {}
	for (const [player, loc] of Object.entries(g().getTrail().playerLocations)) (byLoc[loc] ??= []).push(player)
	const out = []
	for (const [loc, players] of Object.entries(byLoc)) {
		const c = center(loc)
		if (!c) continue
		players.forEach((p, i) => out.push({ player: p, color: colorByPlayer.value[p] ?? "red", x: c.cx + i * 10 - ((players.length - 1) * 10) / 2, y: c.cy }))
	}
	return out
})

const engines = computed(() => {
	if (!game.value) return []
	const rt = g().getRailroadTrack()
	const bySpace = {}
	for (const [p, space] of Object.entries(rt.players)) (bySpace[space] ??= []).push(p)
	return SPACE_RECTS.filter((sr) => bySpace[sr.space]?.length).map((sr) => ({ rect: sr, players: bySpace[sr.space] }))
})

const stations = computed(() => {
	if (!game.value) return []
	return g()
		.getRailroadTrack()
		.stations.map((st, i) => {
			// Stations 10/11 only exist on the Rails to the North strip.
			const extra = rttn.value ? RTTN_STATION_SPOTS[i] : null
			if (i >= 10 && !extra) return null
			const pos = extra ? { x: extra.rect.x, y: extra.rect.y - shift.value } : STATION_POSITIONS[i]
			const disc = extra ? { cx: extra.disc.cx, cy: extra.disc.cy - shift.value } : STATION_DISCS[i]
			const masterPos = extra ? { x: extra.master.x, y: extra.master.y - shift.value } : STATION_MASTERS[i]
			return {
				i,
				pos,
				discs: st.upgradedBy.map((p, k) => ({ color: colorByPlayer.value[p] ?? "red", cx: disc.cx, cy: disc.cy - k * 4 })),
				masterPos: st.stationMaster ? masterPos : null,
				masterImg: st.stationMaster ? view.stationMasterImage(st.stationMaster) : null,
				workerImg: st.worker ? view.workerImage(st.worker) : null,
			}
		})
		.filter(Boolean)
})

const cityGroups = computed(() => {
	if (!game.value) return []
	const rt = g().getRailroadTrack()
	const strip = cityStrip(g().edition, g().isRailsToTheNorth())
	// On the expansion strip the city crests live at their own coordinates instead of the
	// board's printed strip, which the expansion covers. The big towns you reach behind a
	// branchlet sit on the strip too, so they get delivery discs there as well.
	const table = g().isRailsToTheNorth() ? RTTN_CITY_SPOTS : null
	const cities = table ? [...strip, ...Object.keys(RTTN_BIG_TOWNS)] : strip
	return cities
		.map((city, i) => {
			const spot = table ? table[city] : CITY_POSITIONS[i]
			if (!spot) return null
			const pos = table
				? { rect: { x: spot.rect.x, y: spot.rect.y - shift.value, w: spot.rect.w, h: spot.rect.h }, disc: { cx: spot.disc.cx, cy: spot.disc.cy - shift.value } }
				: spot
			return {
				idx: i,
				pos,
				city,
				discs: (rt.cities[city] ?? []).map((p, k) => ({ color: colorByPlayer.value[p] ?? "red", cx: pos.disc.cx, cy: pos.disc.cy - k * 4 })),
			}
		})
		.filter(Boolean)
})

/** Towns on the expansion strip: branchlet markers plus the medium town tile sitting on them. */
const towns = computed(() => {
	if (!game.value || !rttn.value) return []
	const track = g().getRailroadTrack()
	return Object.entries(RTTN_TOWN_SPOTS).map(([name, sp]) => ({
		name,
		x: sp.x,
		y: sp.y - shift.value,
		branchlets: (track.branchlets[name] ?? []).map((p) => colorByPlayer.value[p] ?? "red"),
		tileImg: track.mediumTownTiles[name] ? view.stationMasterImage(track.mediumTownTiles[name]) : null,
	}))
})
const mediumTownTiles = computed(() => towns.value.filter((t) => t.tileImg))
const branchletMarkers = computed(() =>
	towns.value.flatMap((t) => t.branchlets.map((color, i) => ({ color, cx: t.x + 9 + (i % 2) * 17, cy: t.y + 11 + Math.floor(i / 2) * 15 })))
)

const jobWorkers = computed(() => {
	if (!game.value) return []
	const jm = g().getJobMarket()
	const playerCount = g().state.players.length
	const out = []
	jm.rows.forEach((row, ri) => {
		// Reference: workers are right-aligned in the 4-wide row area.
		const offset = (4 - Math.max(playerCount, row.workers.length)) * JOB_MARKET.workerW
		row.workers.forEach((w, ci) => {
			out.push({
				key: `${ri}-${ci}-${w}`,
				worker: w,
				img: view.workerImage(w),
				x: JOB_MARKET.x + offset + ci * JOB_MARKET.workerW,
				y: JOB_MARKET.y0 + ri * JOB_MARKET.rowStep,
				row: ri,
				hireable: !!hireActionFor(ri, w),
			})
		})
	})
	return out
})
const jobToken = computed(() => {
	if (!game.value) return null
	const jm = g().getJobMarket()
	return { img: view.jobMarketTokenImage(), x: JOB_MARKET.tokenX, y: JOB_MARKET.tokenY0 + jm.currentRowIndex * JOB_MARKET.rowStep }
})

// ---- clickable-target highlighting (yellow = available, green = hover) ----
const reachableSpaces = computed(() => {
	const out = new Set()
	if (!game.value) return out
	for (const a of store.actions) for (const s of map.reachableSpacesFor(a, g())) out.add(s)
	return out
})

const deliverableCities = computed(() => {
	if (!game.value || !store.actions.includes(ActionType.DELIVER_TO_CITY)) return new Set()
	try {
		return new Set(g().possibleDeliveries().map((d) => d.city))
	} catch {
		return new Set()
	}
})

function buildingActionRegions(name, rect, inter) {
	if (!inter) return []
	const actions = inter.options
	const allActions = inter.layoutActions
	const top = rect.y + rect.h * 0.48
	const bottom = rect.y + rect.h * 0.91
	const left = rect.x + rect.w * 0.08
	const right = rect.x + rect.w * 0.92
	const middle = rect.x + rect.w / 2
	const panel = (x1, x2) => `${x1},${top} ${x2},${top} ${x2},${bottom} ${x1},${bottom}`
	const triangleTop = `${left},${top} ${middle},${top} ${left},${bottom}`
	const triangleBottom = `${middle},${top} ${middle},${bottom} ${left},${bottom}`
	let groups
	let shapes

	// The printed neutral A tile has three columns; C and D split their left
	// column diagonally, with their remaining action printed on the right.
	if (name === "A") {
		groups = [[0], [1], [2]]
		shapes = [panel(left, left + (right - left) / 3), panel(left + (right - left) / 3, left + (right - left) * 2 / 3), panel(left + (right - left) * 2 / 3, right)]
	} else if (["C", "D", "8a"].includes(name)) {
		groups = [[0], [1], [2]]
		shapes = [triangleTop, triangleBottom, panel(middle, right)]
	} else if (name === "10b") {
		groups = [[0], [1], [2]]
		const horizontal = rect.y + rect.h * 0.70
		shapes = [
			`${left},${top} ${middle},${top} ${middle},${horizontal} ${left},${horizontal}`,
			`${left},${horizontal} ${middle},${horizontal} ${middle},${bottom} ${left},${bottom}`,
			panel(middle, right),
		]
	} else if (["2a", "E"].includes(name)) {
		groups = [[0], allActions.map((_, index) => index).slice(1)]
		shapes = [panel(left, middle), panel(middle, right)]
	} else if (name === "4b") {
		const moveIndex = allActions.findIndex((action) => action === ActionType.MOVE_3_FORWARD)
		groups = [allActions.map((_, index) => index).filter((index) => index !== moveIndex), [moveIndex]]
		shapes = [panel(left, middle), panel(middle, right)]
	} else if (allActions.length <= 1) {
		groups = [[0]]
		shapes = [panel(left, right)]
	} else {
		groups = allActions.map((_, index) => [index])
		shapes = allActions.length === 3
			? [panel(left, left + (right - left) / 3), panel(left + (right - left) / 3, left + (right - left) * 2 / 3), panel(left + (right - left) * 2 / 3, right)]
			: [panel(left, middle), panel(middle, right)]
	}

	return groups.map((slots, index) => ({
		points: shapes[index],
		actions: slots.map((slot) => allActions[slot]).filter((action) => actions.includes(action) && !map.MARKET_DRAW_ACTIONS.has(action)),
	})).filter((region) => region.actions.length)
}

const activeBuildingRegions = computed(() => {
	if (!game.value || !controller.canAct()) return []
	return buildingTiles.value.flatMap((tile) => {
		const inter = map.buildingInteraction(tile.name, g(), store.actions)
		const building = g().getTrail().getLocation(tile.name).building.name
		return buildingActionRegions(building, tile.rect, inter).map((region) => ({ ...region, name: tile.name, mode: inter.mode }))
	})
})

const foresightActive = computed(() => {
	const acts = store.actions
	return {
		0: acts.includes(ActionType.CHOOSE_FORESIGHT_1),
		1: acts.includes(ActionType.CHOOSE_FORESIGHT_2),
		2: acts.includes(ActionType.CHOOSE_FORESIGHT_3),
	}
})

const foresightTiles = computed(() => {
	if (!game.value) return []
	const fs = g().getForesights()
	const out = []
	for (const slot of FORESIGHT_SLOTS) {
		const t = fs.spaces[slot.col][slot.row]
		if (!t) continue
		const img = "worker" in t ? view.workerImage(t.worker) : "teepee" in t ? view.teepeeImage(t.teepee) : view.hazardImage(t.hazard.type, t.hazard.hand)
		out.push({ slot, img, points: "hazard" in t ? t.hazard.points : 0 })
	}
	return out
})

// ---- building hover: zoom to 2x + clickable action hotspots ----
const hovered = ref(null)
let hoverTimer = null

function enterBuilding(name) {
	if (hoverTimer) {
		clearTimeout(hoverTimer)
		hoverTimer = null
	}
	hovered.value = name
}
function leaveBuilding() {
	if (hoverTimer) clearTimeout(hoverTimer)
	hoverTimer = setTimeout(() => {
		hovered.value = null
	}, 250)
}

const hoveredBuilding = computed(() => {
	const name = hovered.value
	if (!name || !game.value) return null
	const tile = buildingTiles.value.find((t) => t.name === name)
	if (!tile) return null
	const inter = map.buildingInteraction(name, g(), store.actions)
	const r = tile.rect
	const building = tile.building
	const regions = controller.canAct() ? buildingActionRegions(building, r, inter).map((region) => ({ ...region, name, mode: inter.mode })) : []
	return {
		name,
		building,
		rect: r,
		img: tile.img,
		// The zoomed tile covers the board's own border, so it draws its own.
		// Light green while it is a movement option the mouse is over, black otherwise.
		move: moveTargets.value.has(name),
		mode: inter ? inter.mode : null,
		regions,
		transform: `translate(${r.x + r.w / 2},${r.y + r.h / 2}) scale(2) translate(${-(r.x + r.w / 2)},${-(r.y + r.h / 2)})`,
	}
})

function runHotspot(opt, name, mode) {
	if (!controller.canAct()) return
	if (mode === "adjacent") {
		controller.perform({ type: ActionType.USE_ADJACENT_BUILDING, location: name })
		return
	}
	if (opt !== ActionType.MOVE && map.MOVE_FAMILY.includes(opt)) {
		const options = map.trailMoveTargets(g(), opt)
		// Nothing to choose between: take the only spot straight away.
		if (options.length < 2) {
			if (options.length === 1) controller.perform({ type: opt, steps: options[0].steps })
			return
		}
		store.selectAction(opt)
		return
	}
	// Actions that need a further choice are armed; the board/top choosers finish them.
	if (map.NEEDS_PARAMS.has(opt) || map.engineMoveRange(opt, g())) {
		store.selectAction(opt)
		return
	}
	controller.perform({ type: opt })
}

function clickBuildingRegion(region, mode = region.mode) {
	if (region.actions.length === 1) {
		runHotspot(region.actions[0], region.name, mode)
		return
	}
	const pos = center(region.name)
	if (!pos) return
	chooser.value = {
		x: pos.cx,
		y: pos.cy,
		cands: region.actions.map((action) => ({ label: view.humanizeAction(action), run: () => runHotspot(action, region.name, mode) })),
	}
}

// ---- top-layer clickable borders (drawn last so they are never covered) ----
const hitTargets = computed(() => {
	if (!game.value) return []
	const out = []
	for (const l of trailLocations.value) {
		const hasTargets = candidatesFor(l.name).length > 0
		const building = map.buildingInteraction(l.name, g(), store.actions)
		if (!hasTargets && !building) continue
		out.push({ key: "loc:" + l.name, type: "location", name: l.name, tone: locationTone(l.name), x: l.rect.x, y: l.rect.y, w: l.rect.w, h: l.rect.h, rx: 2, transform: null })
	}
	for (const c of cityGroups.value) {
		if (!deliverableCities.value.has(c.city)) continue
		out.push({ key: "city:" + c.city, type: "city", idx: c.idx, city: c.city, x: c.pos.rect.x, y: c.pos.rect.y, w: 52, h: 50, rx: 2, transform: null })
	}
	// Rails to the North: towns the player may put a branchlet on.
	if (store.actions.includes(ActionType.PLACE_BRANCHLET)) {
		const allowed = new Set(g().possibleTowns(g().currentPlayer))
		for (const [name, sp] of Object.entries(RTTN_TOWN_SPOTS)) {
			if (!allowed.has(name)) continue
			out.push({ key: "town:" + name, type: "town", name, x: sp.x, y: sp.y - shift.value, w: 36, h: 36, rx: 2, transform: null })
		}
	}
	for (const sr of SPACE_RECTS) {
		if (!reachableSpaces.value.has(sr.space)) continue
		out.push({ key: "space:" + sr.space, type: "space", space: sr.space, x: 0, y: 0, w: sr.w, h: sr.h, rx: 3, transform: `translate(${sr.x},${sr.y}) ${sr.transform ?? ""}` })
	}
	for (const f of foresightTiles.value) {
		if (!foresightActive.value[f.slot.col]) continue
		out.push({ key: "fs:" + f.slot.col + "-" + f.slot.row, type: "foresight", col: f.slot.col, row: f.slot.row, x: f.slot.x, y: f.slot.y, w: 33, h: 39, rx: 3, transform: null })
	}
	return out
})

function clickTarget(t) {
	if (t.type === "location") clickLocation(t.name)
	else if (t.type === "city") clickCity(t.idx, t.city)
	else if (t.type === "space") clickSpace(t.space)
	else if (t.type === "foresight") clickForesight(t.col, t.row)
	else if (t.type === "town") clickTown(t.name)
}

/** Rails to the North: drop a branchlet on the clicked town. */
function clickTown(name) {
	if (!game.value) return
	controller.perform({ type: ActionType.PLACE_BRANCHLET, town: name })
}

function enterTarget(t) {
	if (t.type === "location") {
		enterBuilding(t.name)
		hoveredMove.value = moveTargets.value.has(t.name) ? t.name : null
	}
}

function leaveTarget(t) {
	if (t.type === "location" && hoveredMove.value === t.name) hoveredMove.value = null
	leaveBuilding()
}
</script>

<template>
	<div id="trailBoard" v-if="game">
		<svg :viewBox="`0 -20 800 ${rttn ? 1015 : 820}`">
			<image :href="board" x="0" :y="shift" width="800" height="800" />
			<image v-if="rttn" :href="rttnStrip" x="0" y="0" width="800" height="250" />

			<g :transform="`translate(0 ${shift})`">
				<!-- foresights -->
				<g v-for="f in foresightTiles" :key="'fs' + f.slot.col + '-' + f.slot.row" class="foresight">
					<image :href="f.img" :x="f.slot.x" :y="f.slot.y" width="33" height="39" />
					<text v-if="f.points" :x="f.slot.x + 21" :y="f.slot.y + 33" class="points">{{ f.points }}</text>
				</g>

				<!-- delivery cities -->
				<g v-for="c in cityGroups" :key="'city' + c.city" class="cityGroup">
					<circle v-for="(d, i) in c.discs" :key="i" :class="'disc ' + d.color" :cx="d.cx" :cy="d.cy" r="11" />
					<rect class="city" :x="c.pos.rect.x" :y="c.pos.rect.y" width="52" height="50" rx="2" ry="2" />
				</g>

				<!-- railroad track spaces -->
				<g v-for="sr in SPACE_RECTS" :key="'space' + sr.space" :transform="`translate(${sr.x},${sr.y}) ${sr.transform ?? ''}`">
					<rect class="space" rx="3" ry="3" :width="sr.w" :height="sr.h" />
				</g>
				<g v-for="e in engines" :key="'eng' + e.rect.space" :transform="`translate(${e.rect.x},${e.rect.y}) ${e.rect.transform ?? ''}`">
					<circle v-for="(p, i) in e.players" :key="p" :class="'engine ' + (colorByPlayer[p] ?? 'red')" cx="8" :cy="8 + i * 11" r="7" />
				</g>

				<!-- stations -->
				<g v-for="st in stations" :key="'station' + st.i" class="stationGroup" @click="clickStation(st.i)">
					<rect class="station" :x="st.pos.x" :y="st.pos.y" width="33" height="33" rx="6" ry="6" />
					<circle v-for="(d, i) in st.discs" :key="i" :class="'disc ' + d.color" :cx="d.cx" :cy="d.cy" r="11" />
					<image v-if="st.masterImg && st.masterPos" :href="st.masterImg" :x="st.masterPos.x" :y="st.masterPos.y" width="33" height="39" />
					<image v-if="st.workerImg && st.masterPos" :href="st.workerImg" :x="st.masterPos.x" :y="st.masterPos.y" width="33" height="39" />
				</g>

				<!-- job market -->
				<g v-for="w in jobWorkers" :key="'jm' + w.key" class="workerGroup" :class="{ hireable: w.hireable }" @click="clickWorker(w.row, w.worker)">
					<image :href="w.img" :x="w.x" :y="w.y" width="33" height="39" />
					<rect class="hireOutline" :x="w.x" :y="w.y" width="33" height="39" rx="4" ry="4" />
				</g>
				<image v-if="jobToken" :href="jobToken.img" :x="jobToken.x" :y="jobToken.y" width="30" height="30" />

				<!-- trail tiles -->
				<g class="buildings">
					<image v-for="b in buildingTiles" :key="'b' + b.name" :href="b.img" :x="b.rect.x" :y="b.rect.y" :width="b.rect.w" :height="b.rect.h" />
				</g>
				<g class="hazards">
					<image v-for="h in hazardTiles" :key="'hz' + h.name" :href="h.img" :x="h.rect.x" :y="h.rect.y" width="33" height="39" />
					<text v-for="h in hazardTiles" :key="'hzp' + h.name" class="points" :x="h.rect.x + 21" :y="h.rect.y + 33">{{ h.points }}</text>
				</g>
				<g class="teepees">
					<image v-for="t in teepeeTiles" :key="'tp' + t.name" :href="t.img" :x="t.rect.x" :y="t.rect.y" width="33" height="39" />
				</g>

				<!-- location hit-rects: hover any location to peek at buildings (click handled by the top layer) -->
				<rect
					v-for="l in trailLocations"
					:key="l.name"
					class="location"
					:x="l.rect.x"
					:y="l.rect.y"
					:width="l.rect.w"
					:height="l.rect.h"
					rx="2"
					ry="2"
					@mouseenter="enterBuilding(l.name)"
					@mouseleave="leaveBuilding"
				>
					<title>{{ l.name }}</title>
				</rect>

				<!-- ranchers -->
				<g class="ranchers">
					<circle v-for="r in ranchers" :key="'r' + r.player" :class="'rancher ' + r.color" :cx="r.x" :cy="r.y" r="7" />
				</g>

				<!-- Rails to the North: medium town tiles and branchlets on the strip -->
				<g v-if="rttn" class="mediumTownTiles">
					<image v-for="t in mediumTownTiles" :key="'mt' + t.name" :href="t.tileImg" :x="t.x" :y="t.y" width="36" height="36" />
				</g>
				<g v-if="rttn" class="branchlets">
					<circle v-for="(m, i) in branchletMarkers" :key="'bl' + i" :class="'disc ' + m.color" :cx="m.cx" :cy="m.cy" r="7" />
				</g>

				<!-- clickable-target borders, drawn on top so they never get covered -->
				<g class="hitLayer">
					<rect
						v-for="t in hitTargets"
						:key="t.key"
						:class="t.tone ? 'hit ' + t.tone : 'hit'"
						:x="t.x"
						:y="t.y"
						:width="t.w"
						:height="t.h"
						:rx="t.rx"
						:ry="t.rx"
						:transform="t.transform || undefined"
						@mouseenter="enterTarget(t)"
						@mouseleave="leaveTarget(t)"
						@click="clickTarget(t)"
					/>
				</g>
				<polygon
					v-for="(region, index) in activeBuildingRegions"
					:key="'building-region-' + region.name + '-' + index"
					class="hotspot originalHotspot"
					:points="region.points"
					@mouseenter="enterBuilding(region.name)"
					@mouseleave="leaveBuilding"
					@click.stop="clickBuildingRegion(region)"
				/>

				<!-- hovered building: zoomed, with action hotspots -->
				<g
					v-if="hoveredBuilding"
					class="buildingOverlay"
					@mouseenter="enterBuilding(hoveredBuilding.name)"
					@mouseleave="leaveBuilding"
					@click="clickLocation(hoveredBuilding.name)"
				>
					<g :transform="hoveredBuilding.transform">
						<image :href="hoveredBuilding.img" :x="hoveredBuilding.rect.x" :y="hoveredBuilding.rect.y" :width="hoveredBuilding.rect.w" :height="hoveredBuilding.rect.h" />
						<rect
							class="buildingOutline"
							:class="{ move: hoveredBuilding.move }"
							:x="hoveredBuilding.rect.x"
							:y="hoveredBuilding.rect.y"
							:width="hoveredBuilding.rect.w"
							:height="hoveredBuilding.rect.h"
							rx="2"
							ry="2"
						/>
						<polygon
							v-for="(region, index) in hoveredBuilding.regions"
							:key="index"
							class="hotspot"
							:points="region.points"
							@click.stop="clickBuildingRegion(region)"
						/>
					</g>
				</g>
			</g>
		</svg>

		<div
			v-if="chooser"
			class="chooser"
			:class="{ tiled: chooser.cands.some((c) => c.img) }"
			:style="{ left: (chooser.x / 800) * 100 + '%', top: ((chooser.y + shift) / (rttn ? 1035 : 840)) * 100 + '%' }"
		>
			<template v-for="(c, i) in chooser.cands" :key="i">
				<img v-if="c.img" class="cand" :class="c.enabled === false ? 'disabled' : 'enabled'" :src="c.img" :title="c.label" :alt="c.label" draggable="false" @click="choose(c)" />
				<button v-else class="act" @click="choose(c)">{{ c.label }}</button>
			</template>
			<button class="act cancel" @click="chooser = null">Cancel</button>
		</div>
	</div>
</template>

<style scoped>
#trailBoard { position: relative; display: inline-block; margin: 8px; max-width: 100%; }
svg { width: min(760px, 92vw); height: auto; display: block; }

.location {
	stroke-opacity: 1;
	stroke: #ffffff;
	stroke-width: 2;
	fill: rgb(0, 0, 0, 0.1);
	cursor: pointer;
}
.location:hover { stroke: black; }

.space {
	fill: rgb(0, 0, 0, 0.1);
	stroke: #ffffff;
	stroke-width: 1;
	cursor: pointer;
}
.space:hover { stroke: black; }

.city {
	fill: rgb(0, 0, 0, 0.01);
	stroke: #ffffff;
	stroke-width: 2;
	cursor: pointer;
}
.cityGroup:hover .city { stroke: black; }

.station {
	fill: rgb(0, 0, 0, 0.1);
	stroke: #ffffff;
	stroke-width: 2;
	cursor: pointer;
}
.stationGroup:hover .station { stroke: black; }

.foresight { cursor: pointer; }
.workerGroup { cursor: default; }
.workerGroup.hireable { cursor: pointer; }
.hireOutline { fill: transparent; stroke: none; pointer-events: none; }
.workerGroup.hireable .hireOutline { stroke: #ffd400; stroke-width: 4; }
.workerGroup.hireable:hover .hireOutline { stroke: #90ee90; stroke-width: 6; }

/* Clickable targets: yellow border, cyan when more than one step away, light green on hover or on a shown route. */
.hit {
	fill: transparent;
	stroke: #ffd400;
	stroke-width: 6;
	cursor: pointer;
}
.hit.far { stroke: #00cfe0; }
.hit.route { stroke: #90ee90; stroke-width: 7; }
.hit:hover { stroke: #90ee90; stroke-width: 7; }
.hitLayer { pointer-events: all; }

.points {
	fill: white;
	font-size: 10px;
	font-weight: bold;
	text-shadow: -1px -1px 0 #000, 1px 1px 0 #000;
	pointer-events: none;
}

.disc, .engine, .rancher { stroke: black; stroke-width: 0.5; }
.disc.red, .engine.red, .rancher.red { fill: red; }
.disc.blue, .engine.blue, .rancher.blue { fill: blue; }
.disc.yellow, .engine.yellow, .rancher.yellow { fill: yellow; }
.disc.white, .engine.white, .rancher.white { fill: #d9d9d9; }
.disc.green, .engine.green, .rancher.green { fill: green; }
.disc.orange, .engine.orange, .rancher.orange { fill: orange; }
.disc.purple, .engine.purple, .rancher.purple { fill: purple; }
.disc.black, .engine.black, .rancher.black { fill: black; }

/* Hovered-building action hotspots */
.buildingOverlay { pointer-events: all; }
/* Border of the 2x tile, drawn over its artwork so it is not lost behind it. */
.buildingOutline { fill: none; stroke: black; stroke-width: 6; pointer-events: none; }
.buildingOutline.move { stroke: #90ee90; }
.hotspot {
	fill: rgb(255, 255, 0, 0.32);
	stroke: #ffd400;
	stroke-width: 1.5;
	cursor: pointer;
}
.hotspot:hover { fill: rgb(144, 238, 144, 0.55); stroke: #90ee90; }

.chooser {
	position: absolute;
	transform: translate(-50%, 0);
	background: #fffde8;
	border: 1px solid #666;
	border-radius: 6px;
	padding: 4px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	z-index: 10;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.chooser .act { font-size: 12px; padding: 3px 8px; cursor: pointer; white-space: nowrap; }
.chooser .cancel { background: #eee; }
/* Building picker: tile images in a wrapped grid instead of a text list. */
.chooser.tiled { flex-direction: row; flex-wrap: wrap; width: 284px; }
.chooser .cand { box-sizing: border-box; width: 92px; height: 108px; padding: 0; border: 5px solid #000; border-radius: 6px; background: #fff; cursor: pointer; }
.chooser .cand.enabled { border-color: #ffd400; }
.chooser .cand.enabled:hover { border-color: #90ee90; }
.chooser .cand.disabled { opacity: 0.55; cursor: default; }
.chooser.tiled .cancel { width: 100%; text-align: center; }
</style>
