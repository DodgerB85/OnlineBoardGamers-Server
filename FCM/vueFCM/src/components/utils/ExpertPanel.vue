<script setup>
import * as rf from "../../js/FCMreference"
import * as rules from "../../js/FCMrules"
import * as plyr from "../../js/FCMplayer"
import * as view from "../../js/FCMview"
import * as IO from "../../backend/FCM_IO"

import { useModelStore } from "../../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { computed, watch } from "vue"
import i18n from "../../i18n"

const emit = defineEmits(["startPrePhase"])

const playerObj = computed(() => {
	return personal.pov >= 0 ? store.players[personal.pov] : null
})

// --- Working Day EOD options (pre-move: shown when it IS your turn) ---
const isWorkingDayPhase = computed(() => {
	return store.gameflow.phase === rf.PHASE_WORKING_DAY
})
const due = computed(() => {
	return personal.pov >= 0 && isWorkingDayPhase.value ? rules.salary(personal.pov) : 0
})
const enoughMoney = computed(() => playerObj.value && playerObj.value.money >= due.value)
const hasBeerMS = computed(() => playerObj.value && plyr.hasMilestone(personal.pov, rf.FIRST_BEER_SOLD))
const hasTrainerMS = computed(() => playerObj.value && plyr.hasMilestone(personal.pov, rf.FIRST_TRAINER_USED))
const hasFridge = computed(() => playerObj.value && plyr.hasFridge(personal.pov))
const hasNonCoffeeResources = computed(() => {
	if (!playerObj.value) return false
	return playerObj.value.resources.some((r) => r !== rf.COFFEE)
})
const hasKimchiFridgeCollision = computed(() => {
	return personal.pov >= 0 && rules.kimchiFridgeCollision(personal.pov)
})
const isEndOfWorkingDay = computed(() => store.gameflow.phase === rf.PHASE_WORKING_DAY && store.gameflow.subphase === rf.SUBPHASE_CONFIRM_END_TURN)
const showSalarySection = computed(() => personal.canPlay() && !isEndOfWorkingDay.value && due.value > 0 && !enoughMoney.value && !hasBeerMS.value)
const showFoodPaySection = computed(() => personal.canPlay() && !isEndOfWorkingDay.value && due.value > 0 && hasBeerMS.value && !hasFridge.value && hasNonCoffeeResources.value)
const showCleanupSection = computed(() => personal.canPlay() && !isEndOfWorkingDay.value && isWorkingDayPhase.value && hasFridge.value && hasNonCoffeeResources.value && !hasKimchiFridgeCollision.value)
const showEodOptions = computed(() => showSalarySection.value || showFoodPaySection.value || showCleanupSection.value)

// --- OOB (turn order) preference options (pre-move) ---
const showOOBOptions = computed(() => {
	const phase = store.gameflow.phase
	if (phase === rf.PHASE_RESTRUCTURING) {
		if (store.viewSettings.showReplay) return false
		return personal.pov >= 0
	}
	if (phase === rf.PHASE_TURN_ORDER) {
		if (!personal.canPlay()) return false
		if (store.gameflow.turnOrder[0] === personal.pov) return false
		if (store.gameflow.newTurnOrder.includes(personal.pov)) return false
		if (store.gameflow.turnOrder[store.gameflow.turnOrder.length - 1] === personal.pov) return false
		const unchosenCount = store.gameflow.newTurnOrder.filter((p) => p === -1).length
		if (unchosenCount <= 1) return false
		return true
	}
	return false
})

// --- Post-move preset display (shown when NOT your turn, or during EOD summary) ---
const isPostMove = computed(() => {
	if (personal.pov < 0) return false
	if (!isEndOfWorkingDay.value && personal.canPlay()) return false
	if (!isEndOfWorkingDay.value && store.gameflow.turnOrder.includes(personal.pov)) return false
	if (store.startingOptions.strictPaydayFridge) return false
	if (store.gameflow.phase < rf.PHASE_WORKING_DAY) return false
	if (store.gameflow.phase === rf.PHASE_CLEAN_UP) return false
	if (store.gameflow.turn <= 2 && rules.salary(personal.pov) === 0) return false
	return true
})


const showPostMovePanel = computed(() => isPostMove.value && !(isEndOfWorkingDay.value && personal.canPlay()))

const activePreset = computed(() => {
	const pd = store.context.preMoveData
	if (pd[0].length > 0 && pd[0][0].length > 0 && pd[0][0][0] !== -9) return pd
	return store.context.savedEODpreset
})

const hasPaydayPreset = computed(() => {
	const p = activePreset.value
	return p && p[0].length > 0 && p[0][0].length > 0 && p[0][0][0] !== -9
})

const hasCleanupPreset = computed(() => {
	if (!activePreset.value) return false
	return activePreset.value[1] && activePreset.value[1].length > 0 && activePreset.value[1][0] !== -9
})

const currentSalary = computed(() => personal.pov >= 0 ? rules.salary(personal.pov) : 0)

const keepAllButtonText = computed(() => {
	if (!playerObj.value) return i18n.global.t("expert.keepAll")
	if (hasBeerMS.value && !hasFridge.value) return i18n.global.t("expert.keepAllItemsThenMoney")
	if (currentSalary.value === 0) return i18n.global.t("expert.keepAllNoSalary")
	if (playerObj.value.money >= currentSalary.value) return i18n.global.t("expert.keepAllEnoughMoney")
	if (hasTrainerMS.value && playerObj.value.money < currentSalary.value) return i18n.global.t("expert.keepAllTrainerMs")
	return i18n.global.t("expert.keepAllIfEarnEnough")
})

const showKeepAllButton = computed(() => {
	if (!playerObj.value) return false
	return !hasBeerMS.value || !hasFridge.value
})

// Restore radio selections from preMoveData or savedEODpreset
function restoreRadioSelections() {
	const source = activePreset.value
	if (source && source[0].length > 0 && source[0][0].length > 0) {
		store.context.EODradioSelections[0] = source[0][0][0]
	}
	if (source && source[1] && source[1].length > 0) {
		store.context.EODradioSelections[1] = source[1][0]
	}
}

const isBot = computed(() => personal.pov >= 0 && store.players[personal.pov].displayName === rf.BOT_NAME)
const showRedoButton = computed(() => {
	if (personal.pov < 0 || personal.canPlay()) return false
	const phase = store.gameflow.phase
	if (phase === rf.PHASE_RESTRUCTURING || phase === rf.PHASE_PAYDAY) return true
	return phase === rf.PHASE_CLEAN_UP && !store.startingOptions.strictPaydayFridge
})
const redoButtonText = computed(() => {
	if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) return i18n.global.t("expert.redoRestructuring")
	if (store.gameflow.phase === rf.PHASE_PAYDAY) return i18n.global.t("expert.redoPayday")
	return i18n.global.t("expert.redoCleanup")
})
const showAnyOptions = computed(() => showRedoButton.value || (!personal.trainingGame && !isBot.value && (showEodOptions.value || showOOBOptions.value || showPostMovePanel.value)))

watch(showAnyOptions, (visible) => {
	if (visible) restoreRadioSelections()
})
restoreRadioSelections()

function eodRadioChange() {
	const paydayFlag = parseInt(store.context.EODradioSelections[0])
	const cleanupFlag = parseInt(store.context.EODradioSelections[1])
	store.context.preMoveData = [[[paydayFlag], []], [cleanupFlag]]
}

function oobRadioChange(value) {
	playerObj.value.OOBpreference = parseInt(value)
}

// During restructuring: no submit while the turn is open (pref goes with the turn); once submitted, Save is the only way to change it
const showOOBSubmit = computed(() => {
	if (store.gameflow.phase === rf.PHASE_TURN_ORDER) return true
	if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) return personal.moveDataRaw !== ""
	return false
})

async function submitOOB() {
	await IO.saveOOBpreference()
}

// --- Post-move button handlers ---
function cancelPaydayMove() {
	store.context.preMoveData[0] = [[-9], []]
	IO.savePreTurn(store.context.preMoveData)
}

function cancelCleanupMove() {
	store.context.preMoveData[1] = [-9]
	IO.savePreTurn(store.context.preMoveData)
}

function setPaydayFlag() {
	let flag = -9
	if (hasBeerMS.value && !hasFridge.value) flag = -4
	else if (currentSalary.value === 0) flag = -1
	else if (playerObj.value.money >= currentSalary.value) flag = -2
	else if (hasTrainerMS.value && playerObj.value.money < currentSalary.value) flag = -5
	else flag = -3
	store.context.preMoveData[0][0] = [flag]
	store.context.preMoveData[0][1] = []
	IO.savePreTurn(store.context.preMoveData)
}

function keepAllCleanup() {
	store.context.preMoveData[1] = [-1]
	IO.savePreTurn(store.context.preMoveData)
}
</script>

<template>
	<div v-if="showAnyOptions" class="expertPanel">
		<b>{{ $t("expert.title") }}</b>

		<template v-if="showRedoButton">
			<div class="expertPanelSection">
				<button class="actionsLineButton" @click="IO.unlockTurn(store.gameflow.phase)">{{ redoButtonText }}</button>
			</div>
			<hr v-if="showOOBOptions" />
		</template>

		<!-- === POST-MOVE PRESET DISPLAY === -->
		<template v-if="showPostMovePanel">
			<div v-if="store.gameflow.phase < rf.PHASE_PAYDAY" class="expertPanelSection">
				<p>
					{{ $t("expert.payday") }}
					<template v-if="hasPaydayPreset">
						<span class="preMoveDataSpan">
							<template v-if="activePreset[0][0][0] === -1">{{ $t("expert.noSalarySkipPayday") }}</template>
							<template v-else-if="activePreset[0][0][0] === -2">{{ $t("expert.enoughMoneyPayEveryone") }}</template>
							<template v-else-if="activePreset[0][0][0] === -3">{{ $t("expert.payEveryoneIfEnoughMoney") }}</template>
							<template v-else-if="activePreset[0][0][0] === -4">{{ $t("expert.keepEveryonePayWithItems") }}</template>
							<template v-else-if="activePreset[0][0][0] === -5">{{ $t("expert.keepEveryoneTrainerMs") }}</template>
							<template v-else-if="activePreset[0][0].length === 0 || activePreset[0][0][0] === -8">{{ $t("expert.keepEveryone") }}</template>
							<template v-else>
								{{ $t("expert.fire") }}
								<img v-for="(emp, i) in activePreset[0][0]" :key="'fired-'+i"
									class="preFiredEmployee" :src="view.getImage('emp_' + emp)" :alt="rf.employeeName(emp)" />
							</template>
							<template v-if="activePreset[0][1] && activePreset[0][1].length > 0">
								{{ $t("expert.payWith") }}
								<img v-for="(food, i) in activePreset[0][1]" :key="'pay-'+i"
									class="preTurnSummaryFoodImg" :src="view.getImage('item_' + food)" :alt="'item_' + food" />
							</template>
						</span>
						<button class="actionsLineButton" @click="cancelPaydayMove">{{ $t("expert.cancelMove") }}</button>
					</template>
					<template v-else>
						<span class="preMoveDataSpan">{{ $t("expert.noMoveSet") }}</span>
					</template>
					<button class="actionsLineButton" @click="emit('startPrePhase', 'payday')">{{ $t("expert.preSetPayday") }}</button>
					<template v-if="showKeepAllButton">
						<button class="actionsLineButton" @click="setPaydayFlag">{{ keepAllButtonText }}</button>
					</template>
				</p>
				<hr />
			</div>
			<div class="expertPanelSection">
				<p>
					{{ $t("expert.cleanUp") }}
					<template v-if="!hasFridge">{{ $t("expert.noFridge") }}</template>
					<template v-else-if="!hasNonCoffeeResources">{{ $t("expert.noItemsToStore") }}</template>
					<template v-else>
						<template v-if="hasCleanupPreset">
							<span class="preMoveDataSpan">
								<template v-if="activePreset[1][0] === -1">{{ $t("expert.keepAllItemsIfPossible") }}</template>
								<template v-else-if="activePreset[1][0] === -2">
									{{ $t("expert.keepPriorityOrder") }}
									<img v-for="(food, i) in activePreset[1].slice(1)" :key="'clean-'+i"
										class="preTurnSummaryFoodImg" :src="view.getImage('item_' + food)" :alt="'item_' + food" />
								</template>
								<template v-else>{{ $t("expert.noMoveSet") }}</template>
							</span>
							<button class="actionsLineButton" @click="cancelCleanupMove">{{ $t("expert.cancelMove") }}</button>
						</template>
						<template v-else>
							<span class="preMoveDataSpan">{{ $t("expert.noMoveSet") }}</span>
						</template>
						<button class="actionsLineButton" @click="emit('startPrePhase', 'cleanup')">{{ $t("expert.preSetCleanUp") }}</button>
						<button class="actionsLineButton" @click="keepAllCleanup">{{ $t("expert.keepAllIf10OrFewer") }}</button>
					</template>
				</p>
			</div>
		</template>

		<!-- === PRE-MOVE: OOB Turn Order Preference === -->
		<template v-if="showOOBOptions">
			<br />
			{{ $t("expert.oobPrompt") }}
			<div class="radioRow">
				<label class="expertPanelLabelInline">
					<input type="radio" :value="1" :checked="playerObj.OOBpreference === 1" @change="oobRadioChange(1)" />
					{{ $t("expert.earliestPossible") }}
				</label>
				<label class="expertPanelLabelInline">
					<input type="radio" :value="0" :checked="playerObj.OOBpreference === 0" @change="oobRadioChange(0)" />
					{{ $t("expert.chooseNormally") }}
				</label>
				<label class="expertPanelLabelInline">
					<input type="radio" :value="2" :checked="playerObj.OOBpreference === 2" @change="oobRadioChange(2)" />
					{{ $t("expert.latestPossible") }}
				</label>
			</div>
			<button v-if="showOOBSubmit" class="actionsLineButton" @click="submitOOB">{{ $t("expert.savePreference") }}</button>
		</template>

		<!-- === PRE-MOVE: Working Day EOD Salary Section === -->
		<div v-if="showSalarySection" class="expertPanelSection">
			<p>{{ $t("expert.salaryNote") }}</p>
			<label class="expertPanelLabel">
				<input type="radio" :value="-3" v-model="store.context.EODradioSelections[0]" @change="eodRadioChange" />
				{{ $t("expert.payAllSalaryIfPossible") }}
			</label>
			<label class="expertPanelLabel">
				<input type="radio" :value="0" v-model="store.context.EODradioSelections[0]" @change="eodRadioChange" />
				{{ $t("expert.chooseNormally") }}
			</label>
			<p v-if="hasTrainerMS">{{ $t("expert.trainerNote") }}</p>
		</div>

		<!-- === PRE-MOVE: Working Day EOD Food Pay Section === -->
		<div v-if="showFoodPaySection" class="expertPanelSection">
			<p>{{ $t("expert.beerMilestoneNote") }}</p>
			<label class="expertPanelLabel">
				<input type="radio" :value="-4" v-model="store.context.EODradioSelections[0]" @change="eodRadioChange" />
				{{ $t("expert.paySalaryItemsThenMoney") }}
			</label>
			<label class="expertPanelLabel">
				<input type="radio" :value="0" v-model="store.context.EODradioSelections[0]" @change="eodRadioChange" />
				{{ $t("expert.chooseNormally") }}
			</label>
		</div>

		<!-- === PRE-MOVE: Working Day EOD Cleanup Section === -->
		<div v-if="showCleanupSection" class="expertPanelSection">
			<p>{{ $t("expert.fridgeKeepAllQuestion") }}</p>
			<label class="expertPanelLabel">
				<input type="radio" :value="-1" v-model="store.context.EODradioSelections[1]" @change="eodRadioChange" />
				{{ $t("expert.keepAllIfLessThan10") }}
			</label>
			<label class="expertPanelLabel">
				<input type="radio" :value="0" v-model="store.context.EODradioSelections[1]" @change="eodRadioChange" />
				{{ $t("expert.chooseNormally") }}
			</label>
		</div>

		<p v-if="showEodOptions" class="expertPanelNote">
			{{ $t("expert.eodNote") }}
		</p>
	</div>
</template>

<style scoped>
.expertPanel {
	border: 2px solid darkblue;
	background-color: lightsalmon;
	font-weight: bolder;
	width: fit-content;
	height: fit-content;
	padding: 10px;
	margin: auto;
}
.expertPanelSection {
	margin-top: 8px;
	margin-bottom: 8px;
}
.expertPanelLabel {
	display: inline-block;
	margin: 3px 8px 3px 0;
	cursor: pointer;
}
.expertPanelLabelInline {
	display: inline-block;
	margin: 3px 8px 3px 0;
	cursor: pointer;
}
.radioRow {
	margin-top: 4px;
}
.expertPanelNote {
	font-style: italic;
	color: #555;
}
.preMoveDataSpan {
	background-color: #94e2fa;
}
.preFiredEmployee {
	vertical-align: middle;
	width: 65px;
	height: 101px !important;
}
.preTurnSummaryFoodImg {
	vertical-align: middle;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
	height: 30px !important;
}
</style>
