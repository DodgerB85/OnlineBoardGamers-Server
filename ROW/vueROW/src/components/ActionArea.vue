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
const hiring = computed(() => map.WORKER_ACTIONS.some((a) => actions.value.includes(a)))

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
const engineActive = computed(() => actions.value.some((a) => map.engineMoveRange(a, g())))

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

// Card-target actions: click the matching card on the player table.
const CARD_TARGET_ACTIONS = new Set([
	ActionType.DISCARD_CARD, ActionType.REMOVE_CARD,
	ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, ActionType.PLAY_OBJECTIVE_CARD,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS,
	ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS, ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS,
	ActionType.DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET,
	ActionType.DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS, ActionType.DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS,
	ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE, ActionType.DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES,
	ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS, ActionType.DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION,
	ActionType.DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD, ActionType.DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD,
	ActionType.DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS, ActionType.DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS,
	ActionType.DISCARD_1_GUERNSEY, ActionType.DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS,
	ActionType.DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS, ActionType.DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES,
	ActionType.DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS,
	ActionType.UPGRADE_SIMMENTAL,
])

// Market draw actions are done on the cattle-market draw pile, so they are explained here instead of shown as buttons.
const drawingTwo = computed(() => actions.value.includes(ActionType.DRAW_2_CATTLE_CARDS))

const directActions = computed(() => actions.value.filter((a) => a !== ActionType.PLACE_BRANCHLET && a !== ActionType.PLACE_BID && !map.MARKET_DRAW_ACTIONS.has(a) && !TARGET_ACTIONS.has(a) && !CARD_TARGET_ACTIONS.has(a) && !map.engineMoveRange(a, g()) && !buildingActionSet.value.has(a)))

const cardActions = computed(() => actions.value.filter((a) => CARD_TARGET_ACTIONS.has(a)))
/** A draw-then-discard leaves DISCARD_CARD as the only card action: clicking a card discards it. */
const discardOnly = computed(() => cardActions.value.length === 1 && cardActions.value[0] === ActionType.DISCARD_CARD)

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
		</div>

		<div v-if="hiring" class="group">
			<div class="label">{{ t('row.actionArea.hireWorker') }}</div>
			<div class="note">{{ t('row.actionArea.hireHint') }}</div>
		</div>

		<div v-if="buildingOptions && buildingOptions.length" class="group">
			<div class="label">{{ t('row.actionArea.placeBuildingHint') }}</div>
			<div class="supply">
				<img v-for="b in buildingOptions" :key="b" class="buildingTile display" :src="buildingImageFor(b)" :alt="b" :title="buildingLabel(b)" draggable="false" />
			</div>
		</div>

		<div v-if="actions.includes(ActionType.PLACE_BRANCHLET)" class="group">
			<div class="label">{{ t('row.actionArea.placeBranchletHint') }}</div>
		</div>

		<div v-if="actions.includes(ActionType.APPOINT_STATION_MASTER)" class="group">
			<div class="label">{{ t('row.actions.buttons.APPOINT_STATION_MASTER') }}</div>
			<div class="note">{{ t('row.actionArea.clickWorker') }}</div>
		</div>

		<div v-if="actions.includes(ActionType.TAKE_BONUS_STATION_MASTER)" class="group">
			<div class="label">{{ t('row.actions.buttons.TAKE_BONUS_STATION_MASTER') }}</div>
			<div class="note">{{ t('row.actionArea.bonusStationMasterHint') }}</div>
		</div>

		<div v-if="engineActive" class="group">
			<div class="label">{{ t('row.actionArea.engineHint') }}</div>
		</div>

		<div v-if="cardActions.length" class="group">
			<div class="label">{{ discardOnly ? t('row.actionArea.clickCardToDiscard') : t('row.actionArea.cardActionsHint') }}</div>
			<div v-for="a in cardActions" :key="a" class="note">{{ view.humanizeAction(a) }}</div>
		</div>

		<div v-if="directActions.length || drawingTwo" class="group">
			<div class="label">{{ t('row.actionArea.otherActions') }}</div>
			<div v-for="a in directActions" :key="a" class="note">{{ view.humanizeAction(a) }}</div>
			<div v-if="drawingTwo" class="note">{{ t('row.cattleMarket.drawTwoHint', { cowboys: g().currentPlayerState().cowboysRemaining() }) }}</div>
			<div v-if="directActions.length" class="note">{{ t('row.actionArea.clickHighlighted') }}</div>
		</div>
		</template>

		<div class="group">
			<button class="actionsLineButton" :disabled="!store.canUndo" @click="controller.undo()">{{ t('app.undo') }}</button>
			<button class="actionsLineButton" @click="controller.resetWholeTurn()">{{ t('app.resetWholeTurn') }}</button>
			<button class="actionsLineButton" :disabled="store.saving || store.game?.isEnded()" @click="controller.endTurn()">{{ t('action.endTurn') }}</button>
			<button v-if="store.canSkip" class="actionsLineButton" :disabled="store.saving" @click="controller.skip()">{{ t('action.skip') }}</button>
		</div>
		</template>
	</div>
</template>

<style scoped>
#actionBar { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 6px; }
.group { border: 1px solid #999; border-radius: 5px; padding: 5px; background: #f4f7d7; max-width: 460px; }
.group .actionsLineButton { margin: 4px; }
.label { font-weight: bold; font-size: 12px; margin-bottom: 3px; }
.note { font-size: 12px; }
.supply { display: flex; flex-wrap: wrap; gap: 3px; }
.buildingTile { width: 44px; height: 52px; border: 2px solid #ffffff; border-radius: 4px; cursor: pointer; background: #fff; }
.buildingTile:hover { border-color: black; }
/* Twice the size, display only: the building is picked in the chooser on the map. */
.buildingTile.display { width: 88px; height: 104px; cursor: default; }
.buildingTile.display:hover { border-color: #ffffff; }
</style>
