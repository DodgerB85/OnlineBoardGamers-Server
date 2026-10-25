<script setup>
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as map from "../js/ROWmap"
import * as view from "../js/ROWview"
import { playerBuildingInfo } from "../js/ROWdata"
import { AI_NAME } from "../js/automa/index"
import { useModelStore } from "../stores/ROWstore.js"

const { ActionType, Hand, Status } = rf
const { t } = useI18n()
const store = useModelStore()

const g = () => store.getGame()
const actions = computed(() => store.actions)
const isBidding = computed(() => store.game?.state?.status === Status.BIDDING)
const automaThinking = computed(() => store.game?.currentPlayer === AI_NAME)

// --- Moves on the trail (done by clicking the map, not from here) ---
const canMove = computed(() => store.actions.includes(ActionType.MOVE) && store.moveStepsLeft > 0)
const stepsLeft = computed(() => store.moveStepsLeft)
const armedMove = computed(() => (store.game ? map.armedTrailMove(store.game, store.actions, store.selectedAction) : null))

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
// Display only: a building is listed when it fits at least one spot the player may
// build on. The choice itself is made in the chooser that opens on the map.
const buildingOptions = computed(() => {
	if (buildingActions.value.length === 0) return null
	const game = g()
	const ps = game.currentPlayerState()
	const action = buildingActions.value[0]
	const locations = [...game.getTrail().locations.values()].filter((l) => l.kind === "BUILDING" && (!l.building || l.building.player === ps.player))
	return ps.buildings.filter((b) => locations.some((l) => map.canPlaceBuilding(game, ps.player, l, b, action)))
})

const HAND_LABEL = {
	[Hand.NONE]: "row.buildingInfo.handNone",
	[Hand.GREEN]: "row.buildingInfo.handGreen",
	[Hand.BLACK]: "row.buildingInfo.handBlack",
	[Hand.BOTH]: "row.buildingInfo.handBoth",
}

function buildingImageFor(building) {
	const color = g().state.players.find((p) => p.name === g().currentPlayer)?.color?.toLowerCase() ?? "red"
	return view.buildingImage(g().edition, building, color)
}
function buildingLabel(building) {
	const info = playerBuildingInfo(building, g().edition)
	if (!info) return building
	return t("row.buildingInfo.label", { building, craftsmen: info.craftsmen, hand: t(HAND_LABEL[info.hand]), points: info.points })
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
	ActionType.UPGRADE_SIMMENTAL, ActionType.TAKE_BONUS_STATION_MASTER,
])
// Actions offered by a placed building are shown on the board (hover the building), not here.
const buildingActionSet = computed(() => map.activeBuildingActions(g(), actions.value))

const directActions = computed(() => actions.value.filter((a) => a !== ActionType.PLACE_BRANCHLET && a !== ActionType.PLACE_BID && !TARGET_ACTIONS.has(a) && !map.engineMoveRange(a, g()) && !buildingActionSet.value.has(a)))

// Card-target actions: selected here, then the card is clicked on the player table.
const CARD_TARGET_ACTIONS = new Set([
	ActionType.DISCARD_CARD, ActionType.REMOVE_CARD,
	ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, ActionType.PLAY_OBJECTIVE_CARD,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS,
	ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS, ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS,
	ActionType.DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET,
	ActionType.UPGRADE_SIMMENTAL,
])
const cardActions = computed(() => actions.value.filter((a) => CARD_TARGET_ACTIONS.has(a)))
/** A draw-then-discard leaves DISCARD_CARD as the only card action: clicking a card discards it. */
const discardOnly = computed(() => cardActions.value.length === 1 && cardActions.value[0] === ActionType.DISCARD_CARD)

// RttN: the bonus station master pile is a real choice the UI has to present.
const bonusStationMasters = computed(() => (actions.value.includes(ActionType.TAKE_BONUS_STATION_MASTER) ? g().getRailroadTrack().stationMasters.slice() : []))

function p(type, extra = {}) {
	controller.perform({ type, ...extra })
}
</script>

<template>
	<div id="actionBar">
		<div v-if="!controller.canAct()" class="group">
			<div class="label">{{ store.saving ? t('app.saving') : automaThinking ? t('row.status.garthThinking') : t('app.waitingForOthers') }}</div>
		</div>
		<template v-else>
		<template v-if="!isBidding">
		<div v-if="canMove" class="group">
			<div class="label">{{ t('row.actionArea.moveStepsLeft', { steps: stepsLeft }) }}</div>
		</div>

		<div v-if="armedMove" class="group">
			<div class="label">{{ t('row.actionArea.moveAtMost', { limit: armedMove.limit }) }}</div>
			<button class="act" @click="store.clearAction()">{{ t('panels.cancel') }}</button>
		</div>

		<div v-if="hireRows.length" class="group">
			<div class="label">{{ t('row.actionArea.hireWorker') }}</div>
			<template v-for="row in hireRows" :key="row.index">
				<button v-for="w in row.workers" :key="row.index + '-' + w" class="act" @click="p(actions.includes(ActionType.HIRE_WORKER_PLUS_2) ? ActionType.HIRE_WORKER_PLUS_2 : actions.includes(ActionType.HIRE_WORKER_MINUS_1) ? ActionType.HIRE_WORKER_MINUS_1 : actions.includes(ActionType.HIRE_WORKER_MINUS_2) ? ActionType.HIRE_WORKER_MINUS_2 : ActionType.HIRE_WORKER, { row: row.index, worker: w })">
					r{{ row.index }} {{ w }}
				</button>
			</template>
		</div>

		<div v-if="buildingOptions && buildingOptions.length" class="group">
			<div class="label">{{ t('row.actionArea.placeBuildingHint') }}</div>
			<div class="supply">
				<img v-for="b in buildingOptions" :key="b" class="buildingTile display" :src="buildingImageFor(b)" :alt="b" :title="buildingLabel(b)" draggable="false" />
			</div>
		</div>

		<div v-if="actions.includes(ActionType.PLACE_BRANCHLET)" class="group">
			<div class="label">{{ t('row.actionArea.placeBranchletHint') }}</div>
			<button class="act" :class="{ active: store.selectedAction === ActionType.PLACE_BRANCHLET }" @click="store.selectAction(ActionType.PLACE_BRANCHLET)">
				{{ store.selectedAction === ActionType.PLACE_BRANCHLET ? t('row.actionArea.clickTown') : t('row.actions.buttons.PLACE_BRANCHLET') }}
			</button>
		</div>

		<div v-if="actions.includes(ActionType.APPOINT_STATION_MASTER)" class="group">
			<div class="label">{{ t('row.actions.buttons.APPOINT_STATION_MASTER') }}</div>
			<button class="act" :class="{ active: store.selectedAction === ActionType.APPOINT_STATION_MASTER }" @click="store.selectAction(ActionType.APPOINT_STATION_MASTER)">
				{{ store.selectedAction === ActionType.APPOINT_STATION_MASTER ? t('row.actionArea.clickWorker') : t('row.actions.buttons.APPOINT_STATION_MASTER') }}
			</button>
		</div>

		<div v-if="bonusStationMasters.length" class="group">
			<div class="label">{{ t('row.actions.buttons.TAKE_BONUS_STATION_MASTER') }}</div>
			<div class="supply">
				<img
					v-for="m in bonusStationMasters"
					:key="m"
					class="buildingTile"
					:src="view.stationMasterImage(m)"
					:alt="view.humanizeAction(m)"
					:title="view.humanizeAction(m)"
					draggable="false"
					@click="p(ActionType.TAKE_BONUS_STATION_MASTER, { stationMaster: m })"
				/>
			</div>
		</div>

		<div v-for="em in engineMoves" :key="em.type" class="group">
			<div class="label">{{ view.humanizeAction(em.type) }}</div>
			<button v-for="sp in em.spaces" :key="sp" class="act move" @click="p(em.type, { to: sp })">{{ sp }}</button>
		</div>

		<div v-if="cardActions.length" class="group">
			<div class="label">{{ discardOnly ? t('row.actionArea.clickCardToDiscard') : t('row.actionArea.cardActionsHint') }}</div>
			<button
				v-for="a in cardActions"
				:key="a"
				class="act"
				:class="{ active: store.selectedAction === a }"
				@click="store.selectAction(a)"
			>{{ view.humanizeAction(a) }}</button>
		</div>

		<div class="group">
			<div class="label">{{ t('row.actionArea.otherActions') }}</div>
			<button v-for="a in directActions" :key="a" class="act" @click="p(a)">{{ view.humanizeAction(a) }}</button>
		</div>
		</template>

		<div class="group">
			<button class="act" :disabled="!store.canUndo" @click="controller.undo()">{{ t('app.undo') }}</button>
			<button class="act reset" @click="controller.resetWholeTurn()">{{ t('app.resetWholeTurn') }}</button>
			<button class="act end" :disabled="store.saving || store.game?.isEnded()" @click="controller.endTurn()">{{ t('action.endTurn') }}</button>
			<button v-if="store.canSkip" class="act" :disabled="store.saving" @click="controller.skip()">{{ t('action.skip') }}</button>
		</div>
		</template>
	</div>
</template>

<style scoped>
#actionBar { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 6px; }
.group { border: 1px solid #999; border-radius: 5px; padding: 5px; background: #f4f7d7; max-width: 460px; }
.label { font-weight: bold; font-size: 12px; margin-bottom: 3px; }
.act { margin: 2px; padding: 3px 7px; cursor: pointer; font-size: 12px; }
/* Movement options match the board: light-green border on hover, as the map spots do. */
.act.move:hover { border: 2px solid #90ee90; }
.end { background: #cfe8cf; font-weight: bold; }
.reset { background: #f6d9c9; font-weight: bold; }
.supply { display: flex; flex-wrap: wrap; gap: 3px; }
.buildingTile { width: 44px; height: 52px; border: 2px solid #ffffff; border-radius: 4px; cursor: pointer; background: #fff; }
.buildingTile:hover { border-color: black; }
/* Twice the size, display only: the building is picked in the chooser on the map. */
.buildingTile.display { width: 88px; height: 104px; cursor: default; }
.buildingTile.display:hover { border-color: #ffffff; }
</style>
