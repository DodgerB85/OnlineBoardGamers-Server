<script setup>
import { computed } from "vue"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as model from "../js/ROWmodel"
import * as map from "../js/ROWmap"
import * as view from "../js/ROWview"
import { PLAYER_BUILDINGS } from "../js/ROWdata"
import { useModelStore } from "../stores/ROWstore.js"

const { ActionType, Hand } = rf
const store = useModelStore()

const g = () => store.getGame()
const actions = computed(() => store.actions)

// --- Moves on the trail ---
const moves = computed(() => {
	if (!store.currentPlayer || !actions.value.includes(ActionType.MOVE)) return []
	try {
		return model.possibleMovesFor(store.currentPlayer)
	} catch {
		return []
	}
})

// --- Hire worker ---
const hireRows = computed(() => {
	if (!actions.value.includes(ActionType.HIRE_WORKER) && !actions.value.includes(ActionType.HIRE_WORKER_PLUS_2) && !actions.value.includes(ActionType.HIRE_WORKER_MINUS_1) && !actions.value.includes(ActionType.HIRE_WORKER_MINUS_2)) return []
	const jm = g().getJobMarket()
	const rows = []
	for (let i = 0; i < jm.currentRowIndex; i++) rows.push({ index: i, workers: jm.rows[i].workers, cost: jm.rows[i].workers.length })
	return rows
})

// --- Buildings ---
const buildingActions = computed(() => actions.value.filter((a) => a === ActionType.PLACE_BUILDING || a === ActionType.PLACE_CHEAP_BUILDING || a === ActionType.PLACE_BUILDING_FOR_FREE))
const buildingOptions = computed(() => {
	if (buildingActions.value.length === 0) return null
	const ps = g().currentPlayerState()
	const locations = [...g().getTrail().locations.values()]
		.filter((l) => l.kind === "BUILDING" && (!l.building || l.building.player === ps.player))
		.map((l) => l.name)
	return { buildings: ps.buildings.slice(), locations }
})

const HAND_LABEL = {
	[Hand.NONE]: "no hand limit",
	[Hand.GREEN]: "green hand",
	[Hand.BLACK]: "black hand",
	[Hand.BOTH]: "green or black hand",
}

function buildingImageFor(building) {
	const color = g().state.players.find((p) => p.name === g().currentPlayer)?.color?.toLowerCase() ?? "red"
	return view.buildingImage(g().edition, building, color)
}
function buildingLabel(building) {
	const info = PLAYER_BUILDINGS[building]
	if (!info) return building
	return `${building}: ${info.craftsmen} craftsman${info.craftsmen === 1 ? "" : "en"}, ${HAND_LABEL[info.hand]}, ${info.points} point${info.points === 1 ? "" : "s"}`
}

// --- Engine moves ---
const engineMoves = computed(() => {
	const out = []
	for (const a of actions.value) {
		const spaces = [...map.reachableSpacesFor(a, g())]
		if (spaces.length) out.push({ type: a, spaces })
	}
	return out
})

// --- Actions with no extra target ---
const TARGET_ACTIONS = new Set([
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
// Actions offered by a placed building are shown on the board (hover the building), not here.
const buildingActionSet = computed(() => map.activeBuildingActions(g(), actions.value))

const directActions = computed(() => actions.value.filter((a) => !TARGET_ACTIONS.has(a) && !map.engineMoveRange(a, g()) && !buildingActionSet.value.has(a)))

// Card-target actions: selected here, then the card is clicked on the player table.
const CARD_TARGET_ACTIONS = new Set([
	ActionType.DISCARD_CARD, ActionType.REMOVE_CARD,
	ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, ActionType.PLAY_OBJECTIVE_CARD,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS,
	ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS, ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS,
])
const cardActions = computed(() => actions.value.filter((a) => CARD_TARGET_ACTIONS.has(a)))

function p(type, extra = {}) {
	controller.perform({ type, ...extra })
}
</script>

<template>
	<div id="actionBar">
		<div v-if="!controller.canAct()" class="group">
			<div class="label">{{ store.saving ? "Saving…" : "Waiting for other players" }}</div>
		</div>
		<template v-else>
			<div v-if="moves.length" class="group">
			<div class="label">Move</div>
			<button v-for="(mv, i) in moves" :key="i" class="act" @click="p(ActionType.MOVE, { steps: mv.steps })">{{ mv.steps.join(" → ") }} ({{ mv.cost }}$)</button>
		</div>

		<div v-if="hireRows.length" class="group">
			<div class="label">Hire worker</div>
			<template v-for="row in hireRows" :key="row.index">
				<button v-for="w in row.workers" :key="row.index + '-' + w" class="act" @click="p(actions.includes(ActionType.HIRE_WORKER_PLUS_2) ? ActionType.HIRE_WORKER_PLUS_2 : actions.includes(ActionType.HIRE_WORKER_MINUS_1) ? ActionType.HIRE_WORKER_MINUS_1 : actions.includes(ActionType.HIRE_WORKER_MINUS_2) ? ActionType.HIRE_WORKER_MINUS_2 : ActionType.HIRE_WORKER, { row: row.index, worker: w })">
					r{{ row.index }} {{ w }}
				</button>
			</template>
		</div>

		<div v-if="buildingOptions && buildingOptions.buildings.length && buildingActions.length" class="group">
			<div class="label">Place building — pick one, then click a spot on the map</div>
			<div class="supply">
				<img
					v-for="b in buildingOptions.buildings"
					:key="b"
					class="buildingTile"
					:class="{ active: store.selectedAction === buildingActions[0] && store.pendingBuilding === b }"
					:src="buildingImageFor(b)"
					:alt="b"
					:title="buildingLabel(b)"
					draggable="false"
					@click="store.pickBuilding(buildingActions[0], b)"
				/>
			</div>
		</div>

		<div v-if="actions.includes(ActionType.APPOINT_STATION_MASTER)" class="group">
			<div class="label">Appoint station master</div>
			<button class="act" :class="{ active: store.selectedAction === ActionType.APPOINT_STATION_MASTER }" @click="store.selectAction(ActionType.APPOINT_STATION_MASTER)">
				{{ store.selectedAction === ActionType.APPOINT_STATION_MASTER ? "Click a worker on your player board" : "Appoint station master" }}
			</button>
		</div>

		<div v-for="em in engineMoves" :key="em.type" class="group">
			<div class="label">{{ view.humanizeAction(em.type) }}</div>
			<button v-for="sp in em.spaces" :key="sp" class="act" @click="p(em.type, { to: sp })">{{ sp }}</button>
		</div>

		<div v-if="cardActions.length" class="group">
			<div class="label">Card actions — select, then click a card on your player table</div>
			<button
				v-for="a in cardActions"
				:key="a"
				class="act"
				:class="{ active: store.selectedAction === a }"
				@click="store.selectAction(a)"
			>{{ view.humanizeAction(a) }}</button>
		</div>

		<div class="group">
			<div class="label">Other actions</div>
			<button v-for="a in directActions" :key="a" class="act" @click="p(a)">{{ view.humanizeAction(a) }}</button>
		</div>

		<div class="group">
			<button class="act" :disabled="!store.canUndo" @click="controller.undo()">Undo</button>
			<button class="act reset" @click="controller.resetWholeTurn()">Reset Whole Turn</button>
			<button class="act end" :disabled="store.saving" @click="controller.endTurn()">End Turn</button>
			<button v-if="store.canSkip" class="act" :disabled="store.saving" @click="controller.skip()">Skip</button>
		</div>
		</template>
	</div>
</template>

<style scoped>
#actionBar { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 6px; }
.group { border: 1px solid #999; border-radius: 5px; padding: 5px; background: #f4f7d7; max-width: 460px; }
.label { font-weight: bold; font-size: 12px; margin-bottom: 3px; }
.act { margin: 2px; padding: 3px 7px; cursor: pointer; font-size: 12px; }
.end { background: #cfe8cf; font-weight: bold; }
.reset { background: #f6d9c9; font-weight: bold; }
.supply { display: flex; flex-wrap: wrap; gap: 3px; }
.buildingTile { width: 44px; height: 52px; border: 2px solid #ffffff; border-radius: 4px; cursor: pointer; background: #fff; }
.buildingTile:hover { border-color: black; }
.buildingTile.active { border-color: green; box-shadow: 0 0 4px green; }
</style>
