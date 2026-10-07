<script setup lang="ts">
import { computed } from "vue"
import { ActionType, CattleCard, ObjectiveCardDef } from "../game"
import { useGameStore } from "../stores/game"

function tileLabel(t: unknown): string {
	if (!t) return "—"
	const tile = t as Record<string, any>
	if ("worker" in tile) return String(tile.worker)
	if ("teepee" in tile) return String(tile.teepee)
	if ("hazard" in tile) return String(tile.hazard.type)
	return "?"
}

const store = useGameStore()

const g = () => store.getGame()
const actions = computed(() => store.actions)

// --- Moves on the trail ---
const moves = computed(() => {
	if (!store.currentPlayer || !actions.value.includes(ActionType.MOVE)) return []
	try {
		return store.possibleMovesFor(store.currentPlayer)
	} catch {
		return []
	}
})

// --- Deliveries (normal at Kansas City, extraordinary otherwise) ---
const deliveries = computed(() => {
	if (!actions.value.includes(ActionType.DELIVER_TO_CITY)) return []
	try {
		return g().possibleDeliveries()
	} catch {
		return []
	}
})

// --- Buy cattle ---
const buys = computed(() => {
	if (!actions.value.includes(ActionType.BUY_CATTLE)) return []
	const ps = g().currentPlayerState()
	return g().getCattleMarket().possibleBuys(ps.cowboysRemaining(), ps.balance)
})

// --- Hire worker ---
const hireRows = computed(() => {
	if (!actions.value.includes(ActionType.HIRE_WORKER) && !actions.value.includes(ActionType.HIRE_WORKER_PLUS_2) && !actions.value.includes(ActionType.HIRE_WORKER_MINUS_1) && !actions.value.includes(ActionType.HIRE_WORKER_MINUS_2)) return []
	const jm = g().getJobMarket()
	const rows: { index: number; workers: string[]; cost: number }[] = []
	for (let i = 0; i < jm.currentRowIndex; i++) rows.push({ index: i, workers: jm.rows[i].workers, cost: jm.rows[i].workers.length })
	return rows
})

// --- Unlock ---
const unlocks = computed(() => {
	const game = g()
	const ps = game.currentPlayerState()
	for (const a of actions.value) {
		if (a !== ActionType.UNLOCK_WHITE && a !== ActionType.UNLOCK_BLACK_OR_WHITE) continue
		const available = (Object.keys(ps.unlocked) as any[]).filter((u) => ps.canUnlock(u, game.isRailsToTheNorth()))
		return { type: a, available }
	}
	return null
})

// --- Foresight ---
const foresights = computed(() => {
	const game = g()
	for (const [a, col] of [
		[ActionType.CHOOSE_FORESIGHT_1, 0],
		[ActionType.CHOOSE_FORESIGHT_2, 1],
		[ActionType.CHOOSE_FORESIGHT_3, 2],
	] as [ActionType, number][]) {
		if (actions.value.includes(a)) return { a, col, choices: game.getForesights().choices(col).map((t, i) => ({ i, t })) }
	}
	return null
})

// --- Hazards / teepees ---
const hazards = computed(() => {
	if (!actions.value.some((a) => a.startsWith("REMOVE_HAZARD"))) return []
	return [...g().getTrail().locations.values()].filter((l) => l.kind === "HAZARD" && l.hazard).map((l) => l.name)
})
const teepees = computed(() => {
	if (!actions.value.includes(ActionType.TRADE_WITH_TRIBES)) return []
	return [...g().getTrail().locations.values()].filter((l) => l.kind === "TEEPEE" && l.teepee).map((l) => l.name)
})

// --- Buildings ---
const buildingActions = computed(() => actions.value.filter((a) => a === ActionType.PLACE_BUILDING || a === ActionType.PLACE_CHEAP_BUILDING || a === ActionType.PLACE_BUILDING_FOR_FREE))
const buildingOptions = computed<{ buildings: string[]; locations: string[] } | null>(() => {
	if (buildingActions.value.length === 0) return null
	const ps = g().currentPlayerState()
	const locations = [...g().getTrail().locations.values()]
		.filter((l) => l.kind === "BUILDING" && (!l.building || l.building.player === ps.player))
		.map((l) => l.name)
	return { buildings: ps.buildings.slice(), locations }
})

// --- Hand cards (discard / remove / play objective) ---
const handCattle = computed<CattleCard[]>(() => g().currentPlayerState().hand.filter((c): c is CattleCard => (c as CattleCard).value !== undefined))

// --- Engine moves ---
const ENGINE_FORWARD: Record<string, [number, number]> = {
	[ActionType.MOVE_ENGINE_1_FORWARD]: [1, 1],
	[ActionType.MOVE_ENGINE_2_FORWARD]: [1, 2],
	[ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD]: [1, 1],
	[ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD]: [1, 2],
	[ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD]: [0, 2],
	[ActionType.MOVE_ENGINE_AT_MOST_3_FORWARD]: [0, 3],
	[ActionType.MOVE_ENGINE_AT_MOST_4_FORWARD]: [0, 4],
	[ActionType.MOVE_ENGINE_2_OR_3_FORWARD]: [2, 3],
	[ActionType.DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD]: [1, 1],
	[ActionType.DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD]: [1, 2],
}
const ENGINE_BACKWARD: Record<string, [number, number]> = {
	[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS]: [1, 1],
	[ActionType.MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS]: [1, 39],
	[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD]: [1, 1],
	[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR]: [1, 1],
	[ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS]: [2, 2],
	[ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS]: [2, 2],
	[ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE]: [1, 1],
	[ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES]: [2, 2],
	[ActionType.EXTRAORDINARY_DELIVERY]: [1, 39],
}
const engineMoves = computed(() => {
	const rt = g().getRailroadTrack()
	const player = g().currentPlayer
	const out: { type: ActionType; spaces: string[] }[] = []
	for (const a of actions.value) {
		if (a === ActionType.MOVE_ENGINE_FORWARD) {
			out.push({ type: a, spaces: [...rt.reachableSpacesForward(rt.currentSpace(player), 0, g().currentPlayerState().getNumberOfEngineers())] })
		} else if (ENGINE_FORWARD[a]) {
			const [lo, hi] = ENGINE_FORWARD[a]
			out.push({ type: a, spaces: [...rt.reachableSpacesForward(rt.currentSpace(player), lo, hi)] })
		} else if (ENGINE_BACKWARD[a]) {
			const [lo, hi] = ENGINE_BACKWARD[a]
			out.push({ type: a, spaces: [...rt.reachableSpacesBackwards(rt.currentSpace(player), lo, hi)] })
		}
	}
	return out
})

// --- Actions with no extra target ---
const TARGET_ACTIONS = new Set<string>([
	ActionType.MOVE, ActionType.DELIVER_TO_CITY, ActionType.CHOOSE_FORESIGHT_1, ActionType.CHOOSE_FORESIGHT_2, ActionType.CHOOSE_FORESIGHT_3,
	ActionType.BUY_CATTLE, ActionType.HIRE_WORKER, ActionType.HIRE_WORKER_PLUS_2, ActionType.HIRE_WORKER_MINUS_1, ActionType.HIRE_WORKER_MINUS_2,
	ActionType.UNLOCK_WHITE, ActionType.UNLOCK_BLACK_OR_WHITE, ActionType.REMOVE_HAZARD, ActionType.REMOVE_HAZARD_FOR_2_DOLLARS, ActionType.REMOVE_HAZARD_FOR_5_DOLLARS, ActionType.REMOVE_HAZARD_FOR_FREE,
	ActionType.TRADE_WITH_TRIBES, ActionType.PLACE_BUILDING, ActionType.PLACE_CHEAP_BUILDING, ActionType.PLACE_BUILDING_FOR_FREE,
	ActionType.REMOVE_CARD, ActionType.DISCARD_CARD, ActionType.TAKE_OBJECTIVE_CARD, ActionType.PLAY_OBJECTIVE_CARD,
	ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND, ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS, ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS, ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS,
	ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD, ActionType.APPOINT_STATION_MASTER, ActionType.DOWNGRADE_STATION,
	ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE, ActionType.USE_ADJACENT_BUILDING,
])
const directActions = computed(() => actions.value.filter((a) => !TARGET_ACTIONS.has(a) && !ENGINE_FORWARD[a] && !ENGINE_BACKWARD[a] && a !== ActionType.MOVE_ENGINE_FORWARD))

const objectiveAvailable = computed(() => (actions.value.includes(ActionType.TAKE_OBJECTIVE_CARD) ? g().getObjectiveCards().available.slice() : []))
const objectivesInHand = computed<ObjectiveCardDef[]>(() => g().currentPlayerState().hand.filter((c): c is ObjectiveCardDef => (c as any).tasks !== undefined))

function p(type: ActionType, extra: Record<string, unknown> = {}) {
	store.perform({ type, ...extra })
}
</script>

<template>
	<div id="actionBar">
		<div v-if="moves.length" class="group">
			<div class="label">Move</div>
			<button v-for="(mv, i) in moves" :key="i" class="act" @click="p(ActionType.MOVE, { steps: mv.steps })">{{ mv.steps.join(" → ") }} ({{ mv.cost }}$)</button>
		</div>

		<div v-if="deliveries.length" class="group">
			<div class="label">Deliver</div>
			<button v-for="d in deliveries" :key="d.city" class="act" @click="p(ActionType.DELIVER_TO_CITY, { city: d.city, certificates: d.certificates })">{{ d.city }}</button>
		</div>

		<div v-if="foresights" class="group">
			<div class="label">Foresight</div>
			<button v-for="c in foresights.choices" :key="c.i" class="act" @click="p(foresights.a, { choice: c.i })">
				{{ tileLabel(c.t) }}
			</button>
		</div>

		<div v-if="buys.length" class="group">
			<div class="label">Buy cattle</div>
			<button v-for="(b, i) in buys" :key="i" class="act" @click="p(ActionType.BUY_CATTLE, { cattleCards: g().getCattleMarket().market.filter((c: CattleCard) => c.value === b.breedingValue).slice(0, b.pair ? 2 : 1), cowboys: b.cowboys, dollars: b.dollars })">
				v{{ b.breedingValue }} {{ b.pair ? "(pair)" : "" }} {{ b.dollars }}$ {{ b.cowboys }}c
			</button>
		</div>

		<div v-if="hireRows.length" class="group">
			<div class="label">Hire worker</div>
			<template v-for="row in hireRows" :key="row.index">
				<button v-for="w in row.workers" :key="row.index + '-' + w" class="act" @click="p(actions.includes(ActionType.HIRE_WORKER_PLUS_2) ? ActionType.HIRE_WORKER_PLUS_2 : actions.includes(ActionType.HIRE_WORKER_MINUS_1) ? ActionType.HIRE_WORKER_MINUS_1 : actions.includes(ActionType.HIRE_WORKER_MINUS_2) ? ActionType.HIRE_WORKER_MINUS_2 : ActionType.HIRE_WORKER, { row: row.index, worker: w })">
					r{{ row.index }} {{ w }}
				</button>
			</template>
		</div>

		<div v-if="unlocks && unlocks.available.length" class="group">
			<div class="label">Unlock</div>
			<button v-for="u in unlocks.available" :key="u" class="act" @click="p(unlocks.type, { unlock: u })">{{ u }}</button>
		</div>

		<div v-if="hazards.length" class="group">
			<div class="label">Remove hazard</div>
			<button v-for="loc in hazards" :key="loc" class="act" @click="p(actions.find((a) => a.startsWith('REMOVE_HAZARD')) as ActionType, { location: loc })">{{ loc }}</button>
		</div>

		<div v-if="teepees.length" class="group">
			<div class="label">Trade with tribes</div>
			<button v-for="loc in teepees" :key="loc" class="act" @click="p(ActionType.TRADE_WITH_TRIBES, { location: loc })">{{ loc }}</button>
		</div>

		<div v-if="buildingOptions && buildingOptions.buildings.length && buildingActions.length" class="group">
			<div class="label">Place building (pick then location)</div>
			<button v-for="b in buildingOptions.buildings" :key="b" class="act" @click="p(buildingActions[0], { building: b, location: buildingOptions.locations[0] })">{{ b }} → {{ buildingOptions.locations[0] }}</button>
		</div>

		<div v-for="em in engineMoves" :key="em.type" class="group">
			<div class="label">{{ em.type }}</div>
			<button v-for="sp in em.spaces" :key="sp" class="act" @click="p(em.type, { to: sp })">{{ sp }}</button>
		</div>

		<div v-if="handCattle.length" class="group">
			<div class="label">Cattle in hand</div>
			<button v-for="(c, i) in handCattle" :key="i" class="act" @click="p((actions.find((a) => a.startsWith('DISCARD_1_CATTLE_CARD')) || actions.find((a) => a.startsWith('DISCARD_PAIR')) || ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE) as ActionType, { cattleType: c.type })">{{ c.type }}</button>
		</div>

		<div v-if="objectiveAvailable.length" class="group">
			<div class="label">Take objective</div>
			<button v-for="o in objectiveAvailable" :key="o.id" class="act" @click="p(ActionType.TAKE_OBJECTIVE_CARD, { objectiveCard: o })">{{ o.id }}</button>
		</div>

		<div v-if="objectivesInHand.length" class="group">
			<div class="label">Objectives in hand</div>
			<button v-for="o in objectivesInHand" :key="o.id" class="act" @click="p(ActionType.PLAY_OBJECTIVE_CARD, { objectiveCard: o })">{{ o.id }}</button>
			<button v-for="o in objectivesInHand" :key="o.id + '-d'" class="act" @click="p(ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, { objectiveCard: o })">discard {{ o.id }}</button>
		</div>

		<div class="group">
			<div class="label">Other actions</div>
			<button v-for="a in directActions" :key="a" class="act" @click="p(a)">{{ a }}</button>
		</div>

		<div class="group">
			<button class="act end" @click="store.endTurn()">End Turn</button>
			<button v-if="store.canSkip" class="act" @click="store.skip()">Skip</button>
		</div>
	</div>
</template>

<style scoped>
#actionBar { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 6px; }
.group { border: 1px solid #999; border-radius: 5px; padding: 5px; background: #f4f7d7; max-width: 460px; }
.label { font-weight: bold; font-size: 12px; margin-bottom: 3px; }
.act { margin: 2px; padding: 3px 7px; cursor: pointer; font-size: 12px; }
.end { background: #cfe8cf; font-weight: bold; }
</style>
