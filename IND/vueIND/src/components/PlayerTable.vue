<script setup>
import * as view from "../js/INDview.js"
import * as rf from "../js/INDreference.js"
import * as model from "../js/INDmodel.js"
import * as funcs from "../js/INDfuncs.js"
import * as controller from "../js/INDcontroller.js"

import { reactive, watch, onUnmounted } from "vue"

import i18n from "../i18n"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

const moneyDeltas = reactive({})
const moneyDeltaTimers = {}
let previousCash = store.players.map((player) => player.moneyCash)

watch(
	() => store.players.map((player) => player.moneyCash),
	(newValues) => {
		if (store.topMenuViews.showLoader || store.topMenuViews.showReplay || personal.haltPlay) {
			previousCash = newValues.slice()
			return
		}
		for (let i = 0; i < newValues.length; i++) {
			const delta = newValues[i] - (previousCash[i] ?? newValues[i])
			if (delta === 0) continue
			if (store.hiddenMoney && i !== personal.pov && !personal.trainingGame) continue
			moneyDeltas[i] = delta
			clearTimeout(moneyDeltaTimers[i])
			moneyDeltaTimers[i] = setTimeout(() => {
				delete moneyDeltas[i]
			}, 1200)
		}
		previousCash = newValues.slice()
	}
)

onUnmounted(() => {
	for (const timer of Object.values(moneyDeltaTimers)) clearTimeout(timer)
})

function canSelectSlot(playerIndex, slotIdx, companySlot) {
	if (!personal.canPlay()) return false
	if (store.gameflow.phase === rf.PHASE_MERGERS) {
		const numberOfSelected = store.ongoingVars.selectedMergerInfo.length
		const mergerArray = store.context.mergerStatusArray
		const validMergers = mergerArray.filter(model.canMergeEntry(false))
		function belongsToEntry(arrs) {
			return function (entry) {
				for (const arr of arrs) {
					if (!entry.indices.some((indices) => funcs.arraysEqual(indices, arr))) {
						return false
					}
				}
				return true
			}
		}
		if (numberOfSelected == 0) {
			return validMergers.some(belongsToEntry([[playerIndex, slotIdx]]))
		} else if (numberOfSelected == 1) {
			const selected = store.ongoingVars.selectedMergerInfo[0]
			const selectedIdx = [selected[0], selected[1]]
			const currentIdx = [playerIndex, slotIdx]
			return (
				!funcs.arraysEqual(selectedIdx, currentIdx) &&
				validMergers.some(
					belongsToEntry([
						[playerIndex, slotIdx],
						[selected[0], selected[1]],
					])
				)
			)
		} else {
			return false
		}
	}
	if (playerIndex !== controller.currentPlayerIndex()) return false
	if (model.getActiveCompanyDataFromID(companySlot[0]).operated === true) return false
	if (!store.context.canChangeOperatingCompany) return false
	if (store.gameflow.phase === rf.PHASE_OPERATIONS) return true
	return false
}

function generateMergerSingleErrors(reasonArr) {
	const t = i18n.global.t
	if (reasonArr.invalidType) return t("playerTable.mergeInvalidType")
	if (reasonArr.alreadyMerged) return t("playerTable.mergeAlreadyMerged")
	if (reasonArr.insufficientMerger) return t("playerTable.mergeTechLow")
	if (reasonArr.noFreeSlot) return t("playerTable.mergeNoFreeSlot")
	if (reasonArr.lowCash) return t("playerTable.mergeLowCash")
	if (reasonArr.tooEarlyForSiap) return t("playerTable.mergeSiapEarly")
	return t("playerTable.mergeUnknown")
}

function generateMergerMultiErrors(reasonArr) {
	const t = i18n.global.t
	// Check EVERYTHING already merged
	let errorArr = []

	if (reasonArr.every((x) => x.invalidType)) return t("playerTable.mergeNoOtherCompany")

	if (reasonArr.every((x) => x.alreadyMerged)) return t("playerTable.mergeAlreadyMergedTurn")

	if (reasonArr.every((x) => x.insufficientMerger)) return t("playerTable.mergeTechLowAny")
	else if (reasonArr.some((x) => x.insufficientMerger)) errorArr.push(2) // SOME insufficient merger tech

	if (reasonArr.every((x) => x.noFreeSlot)) return t("playerTable.mergeNoFreeSlotAny")
	else if (reasonArr.some((x) => x.noFreeSlot)) errorArr.push(4) // SOME insufficient slot tech

	if (reasonArr.every((x) => x.lowCash)) return t("playerTable.mergeLowCashAny")
	else if (reasonArr.some((x) => x.lowCash)) errorArr.push(6) // SOME insufficient cash

	// Now record all the partials
	let errorStr = ""
	if (errorArr.includes(2)) errorStr += t("playerTable.mergeInsufficientTech") + ", "
	if (errorArr.includes(4)) errorStr += t("playerTable.mergeNoFreeSlotShort") + ", "
	if (errorArr.includes(6)) errorStr += t("playerTable.mergeLowCashShort") + ", "
	errorStr = errorStr.slice(0, -2)
	return errorStr
}

function clickedSlot(companySlot, slotIdx, playerIndex) {
	store.clearMessages()

	if (!personal.canPlay()) return

	if (store.gameflow.phase === rf.PHASE_MERGERS) {
		if (!canSelectSlot(playerIndex, slotIdx, companySlot)) {
			{
				// Display the reason, and then exit
				// First check if it is the first slot to be slected
				if (store.ongoingVars.selectedMergerInfo.length === 0) {
					let subArr = [playerIndex, slotIdx]
					let reasonArr = store.context.mergerStatusArray.filter((entry) => entry.indices.some((indi) => funcs.arraysEqual(indi, subArr)))
					store.gameMessages.actionError = generateMergerMultiErrors(reasonArr)
					return
				} else if (store.ongoingVars.selectedMergerInfo.length === 1) {
					// Did you click the same slot twice?
					if (playerIndex === store.ongoingVars.selectedMergerInfo[0][0] && slotIdx === store.ongoingVars.selectedMergerInfo[0][1]) {
						store.gameMessages.actionError = i18n.global.t("playerTable.mergeSameSlot")
					}
					// Otherwise, find the entry in store.context.mergerStatusArray
					// Filter the main array for the first subArr
					let reasonArr = store.context.mergerStatusArray.filter((entry) => entry.indices.some((indi) => funcs.arraysEqual(indi, [store.ongoingVars.selectedMergerInfo[0][0], store.ongoingVars.selectedMergerInfo[0][1]])))
					// Now filter from the invalid clicked slot
					let subArr = [playerIndex, slotIdx]
					reasonArr = reasonArr.find((entry) => entry.indices.some((indi) => funcs.arraysEqual(indi, subArr)))
					store.gameMessages.actionError = generateMergerSingleErrors(reasonArr)
				}
				return
			}
		}
		if (store.ongoingVars.selectedMergerInfo.length === 2) return
		store.removeAllActiveHighlights()
		let totalTerrs = 0
		for (let i = 0; i < companySlot.length; i++) totalTerrs += model.getActiveCompanyDataFromID(companySlot[i]).territories.length
		store.ongoingVars.selectedMergerInfo.push([playerIndex, slotIdx, totalTerrs])

		if (store.ongoingVars.selectedMergerInfo.length === 2) {
			let isSiapFajiMerger = false
			let company1type = model.getActiveCompanyDataFromID(store.players[store.ongoingVars.selectedMergerInfo[0][0]].slots[store.ongoingVars.selectedMergerInfo[0][1]][0]).type
			let company2type = model.getActiveCompanyDataFromID(store.players[store.ongoingVars.selectedMergerInfo[1][0]].slots[store.ongoingVars.selectedMergerInfo[1][1]][0]).type
			if (company1type !== company2type) isSiapFajiMerger = true
			store.ongoingVars.nominalValue = model.getNominalValueFromSlotID(store.ongoingVars.selectedMergerInfo[0][0], store.ongoingVars.selectedMergerInfo[0][1], isSiapFajiMerger) + model.getNominalValueFromSlotID(store.ongoingVars.selectedMergerInfo[1][0], store.ongoingVars.selectedMergerInfo[1][1], isSiapFajiMerger)
			store.ongoingVars.bidIncrement = store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2]
			store.ongoingVars.currentBid = store.ongoingVars.nominalValue - store.ongoingVars.bidIncrement
			store.context.selectedMergerBid = store.ongoingVars.nominalValue
		}
		return
	} else if (store.gameflow.phase === rf.PHASE_OPERATIONS) {
		// if it isn't your slot, reuturn
		if (playerIndex !== controller.currentPlayerIndex()) return

		if (model.getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIdx][0]).operated) return

		// if you can't change company, return
		if (!store.context.canChangeOperatingCompany) return
		store.removeAllActiveHighlights()

		model.setupSlotToOperate(playerIndex, slotIdx)
	}
}

function getPlayerNameClass(playerIndex) {
	//return "activePLayer"
	if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) {
		if (!store.ongoingVars.bidTurnOrder.includes(playerIndex)) return "passedPlayer"
		if (store.ongoingVars.bidTurnOrder[0] === playerIndex) return "activePLayer"
	} else {
		if (playerIndex === store.gameflow.turnOrder[0]) return "activePLayer"
		if (store.gameflow.phase === rf.PHASE_ACQUISITIONS && !store.gameflow.turnOrder.includes(playerIndex)) return "passedPlayer"
	}
}

function getSlotIncome(playerIndex, slotIdx) {
	let income = 0
	for (let i = 0; i < store.players[playerIndex].slots[slotIdx].length; i++) {
		let companyID = store.players[playerIndex].slots[slotIdx][i]
		let companyData = model.getActiveCompanyDataFromID(companyID)
		income += companyData.incomeThisTurn
	}
	return income
}

function getRNDfontSize() {
	if (store.useMergerSubsidy && !store.useShippingSubsidy) return 14
	else if (!store.useMergerSubsidy && store.useShippingSubsidy) return 14
	else if (store.useMergerSubsidy && store.useShippingSubsidy) return 12
	return 16
}

function companiesLeftToOperate() {
	if (store.gameflow.turnOrder.length === 0) return 0
	const player = store.players[store.gameflow.turnOrder[0]]
	let left = 0
	for (const slot of player.slots) {
		if (slot.length > 0 && !model.getActiveCompanyDataFromID(slot[0]).operated) left++
	}
	return left
}

function getRndTooltip(playerIndex) {
	const p = store.players[playerIndex]
	const parts = [
		`${i18n.global.t("playerTable.bid")}: ×${model.getRndDisplayValue(rf.RnD_BID_IDX, p.RnD[rf.RnD_BID_IDX])}`,
		`${i18n.global.t("playerTable.slots")}: ${p.RnD[rf.RnD_SLOTS_IDX]}`,
		`${i18n.global.t("playerTable.merger")}: ${p.RnD[rf.RnD_MERGER_IDX]}`,
		`${i18n.global.t("playerTable.expansion")}: ${p.RnD[rf.RnD_EXPANSION_IDX]}`,
		`${i18n.global.t("playerTable.hull")}: ${p.RnD[rf.RnD_HULL_IDX]}`,
	]
	if (store.useMergerSubsidy) parts.push(`${i18n.global.t("playerTable.mergerSubsidy")}: ${model.getRndDisplayValue(rf.RnD_MERGER_SUBSIDY_IDX, p.RnD[rf.RnD_MERGER_SUBSIDY_IDX])}`)
	if (store.useShippingSubsidy) parts.push(`${i18n.global.t("playerTable.shippingSubsidy")}: ${model.getRndDisplayValue(rf.RnD_SHIPPING_SUBSIDY_IDX, p.RnD[rf.RnD_SHIPPING_SUBSIDY_IDX])}`)
	return parts.join(", ")
}
</script>

<template>
	<b>
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_NEW_ERA }" :title="$t('playerTable.phaseHelpNewEra')">1) {{ $t('playerTable.newEra') }}</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_BID_TURN_ORDER }" :title="$t('playerTable.phaseHelpBidTurnOrder')">2) {{ $t('playerTable.bidTurnOrder') }}</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_MERGERS || store.gameflow.phase === rf.PHASE_MERGER_BIDDING }" :title="$t('playerTable.phaseHelpMergers')">3) {{ $t('playerTable.mergers') }}</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_ACQUISITIONS }" :title="$t('playerTable.phaseHelpAcquisitions')">4) {{ $t('playerTable.acquisitions') }}</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_R_AND_D }" :title="$t('playerTable.phaseHelpRnd')">5) {{ $t('playerTable.rnd') }}</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_OPERATIONS }" :title="$t('playerTable.phaseHelpOperations')">6) {{ $t('playerTable.operations') }}<template v-if="store.gameflow.phase === rf.PHASE_OPERATIONS"> ({{ $t('playerTable.companiesLeft', { count: companiesLeftToOperate() }) }})</template></span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_CITY_GROWTH }" :title="$t('playerTable.phaseHelpCityGrowth')">7) {{ $t('playerTable.cityGrowth') }}</span>
	</b>
	<div id="container">
		<div id="topAreaContainerDiv">
			<div id="playerTableDiv">
				<table id="playerTable">
					<thead>
						<tr>
							<th><b>{{ $t('playerTable.player') }}</b></th>
							<th><b>{{ $t('playerTable.money') }}</b></th>
							<th><b>{{ $t('playerTable.rndHeader') }}</b></th>
							<th><b>{{ $t('playerTable.slot', { num: 1 }) }}</b></th>
							<th><b>{{ $t('playerTable.slot', { num: 2 }) }}</b></th>
							<th><b>{{ $t('playerTable.slot', { num: 3 }) }}</b></th>
							<th><b>{{ $t('playerTable.slot', { num: 4 }) }}</b></th>
							<th><b>{{ $t('playerTable.slot', { num: 5 }) }}</b></th>
						</tr>
					</thead>
					<tr v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">
						<!-- Player -->
						<td :class="getPlayerNameClass(playerIndex)">
							<span class="mainEntryPlayer playerTableName" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
						</td>
						<!-- Money -->
						<td v-if="store.topMenuViews.minimalPlayerTable" class="money-cell">
							<div class="money-row">
								<span class="money-label">💵</span>
								<span class="money-value">{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyCash) }}</span>
								<span v-if="moneyDeltas[playerIndex]" class="moneyDelta" :class="moneyDeltas[playerIndex] > 0 ? 'positive' : 'negative'">{{ moneyDeltas[playerIndex] > 0 ? '+' : '' }}{{ view.getMoneyString(playerIndex, moneyDeltas[playerIndex]) }}</span>
								<span v-if="store.players[playerIndex].moneyRoundIncome !== 0 && (!store.hiddenMoney || playerIndex === personal.pov || personal.trainingGame)" :title="$t('playerTable.roundIncomeTooltip')" :class="store.players[playerIndex].moneyRoundIncome < 0 ? 'negativeIncome' : 'income'"><template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">{{ $t('playerTable.lastRoundIncome') }} </template><template v-if="store.players[playerIndex].moneyRoundIncome > 0">+</template>{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyRoundIncome) }}</span>
							</div>
						</td>
						<td v-else class="money-cell">
							<div class="money-row">
								<span v-if="store.options.playerTableStyle === 0" class="money-label">💵</span>
								<span v-else>{{ $t('playerTable.cash') }} </span>
								<span class="money-value">{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyCash) }}</span>
								<span v-if="moneyDeltas[playerIndex]" class="moneyDelta" :class="moneyDeltas[playerIndex] > 0 ? 'positive' : 'negative'">{{ moneyDeltas[playerIndex] > 0 ? '+' : '' }}{{ view.getMoneyString(playerIndex, moneyDeltas[playerIndex]) }}</span>
								<span v-if="store.players[playerIndex].moneyRoundIncome !== 0 && (!store.hiddenMoney || playerIndex === personal.pov || personal.trainingGame)" :title="$t('playerTable.roundIncomeTooltip')" :class="store.players[playerIndex].moneyRoundIncome < 0 ? 'negativeIncome' : 'income'"><template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">{{ $t('playerTable.lastRoundIncome') }} </template><template v-if="store.players[playerIndex].moneyRoundIncome > 0">+</template>{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyRoundIncome) }}</span>
							</div>
							<div class="money-row">
								<span v-if="store.options.playerTableStyle === 0" class="money-label">🏦</span>
								<span v-else>{{ $t('playerTable.bank') }} </span>
								<span class="money-value">{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyBank) }}</span>
							</div>
							<div class="money-row total-row">
								<span v-if="store.options.playerTableStyle === 0" class="money-label">💰</span>
								<span v-else>{{ $t('playerTable.total') }} </span>
								<span class="money-value total-value">{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyCash + store.players[playerIndex].moneyBank) }}</span>
							</div>
						</td>
						<!-- R & D -->
						<td v-if="store.topMenuViews.minimalPlayerTable" class="rightAlign" :title="getRndTooltip(playerIndex)">
							×{{ model.getRndDisplayValue(rf.RnD_BID_IDX, store.players[playerIndex].RnD[rf.RnD_BID_IDX]) }}-{{ store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX] }}-{{ store.players[playerIndex].RnD[rf.RnD_MERGER_IDX] }}-{{ store.players[playerIndex].RnD[rf.RnD_EXPANSION_IDX] }}-{{ store.players[playerIndex].RnD[rf.RnD_HULL_IDX] }}
							<span v-if="store.useMergerSubsidy || store.useShippingSubsidy">-</span>
							<span v-if="store.useMergerSubsidy">
								{{ model.getRndDisplayValue(rf.RnD_MERGER_SUBSIDY_IDX, store.players[playerIndex].RnD[rf.RnD_MERGER_SUBSIDY_IDX]) }}
								<span v-if="store.useShippingSubsidy">-</span>
							</span>
							<span v-if="store.useShippingSubsidy">{{ model.getRndDisplayValue(rf.RnD_SHIPPING_SUBSIDY_IDX, store.players[playerIndex].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX]) }}</span>
						</td>
						<td
							v-else
							class="rightAlign"
							:title="getRndTooltip(playerIndex)"
							:style="{
								fontSize: String(getRNDfontSize()) + 'px',
							}">
							{{ $t('playerTable.bid') }}: ×{{ model.getRndDisplayValue(rf.RnD_BID_IDX, store.players[playerIndex].RnD[rf.RnD_BID_IDX]) }}
							<br />
							{{ $t('playerTable.slots') }}: {{ store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX] }}
							<br />
							{{ $t('playerTable.merger') }}: {{ store.players[playerIndex].RnD[rf.RnD_MERGER_IDX] }}
							<br />
							{{ $t('playerTable.expansion') }}: {{ store.players[playerIndex].RnD[rf.RnD_EXPANSION_IDX] }}
							<br />
							{{ $t('playerTable.hull') }}: {{ store.players[playerIndex].RnD[rf.RnD_HULL_IDX] }}
							<br v-if="store.useMergerSubsidy || store.useShippingSubsidy" />
							<template v-if="store.useMergerSubsidy">
								{{ $t('playerTable.mergerSubsidy') }}: {{ model.getRndDisplayValue(rf.RnD_MERGER_SUBSIDY_IDX, store.players[playerIndex].RnD[rf.RnD_MERGER_SUBSIDY_IDX]) }}
								<br />
							</template>
							<template v-if="store.useShippingSubsidy">
								{{ $t('playerTable.shippingSubsidy') }}: {{ model.getRndDisplayValue(rf.RnD_SHIPPING_SUBSIDY_IDX, store.players[playerIndex].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX]) }}
								<br />
							</template>
						</td>
						<!-- Slots-->
						<template v-for="(companySlot, slotIdx) in store.players[playerIndex].slots" :key="slotIdx">
							<td v-if="store.topMenuViews.minimalPlayerTable" :style="{ 'min-width': companySlot.length * 20 - (5 * companySlot.length - 2) + 'px' }">
								<template v-if="companySlot.length > 0">
									<div class="slotImgsMinimalDiv" :class="[{ selectableSlot: canSelectSlot(playerIndex, slotIdx, companySlot) }, { selectedSlotToOperate: controller.currentPlayerIndex() === playerIndex && store.context.selectedSlotToOperate === slotIdx }, { mergedSlotPulse: model.getActiveCompanyDataFromID(companySlot[0]).mergedThisPhase }]" @click="clickedSlot(companySlot, slotIdx, playerIndex)" :style="{ width: companySlot.length * 20 + 5 * (companySlot.length - 1) + 'px' }">
										<template v-for="(companyID, idx2) in companySlot" :key="idx2">
											<img class="companyCardMinimalIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))" alt="Company" :style="{ left: idx2 * 20 + (5 * idx2 - 1) + 'px' }" />
											<div :class="{ crossBackground: model.getActiveCompanyDataFromID(companyID).operated }"></div>
										</template>
									</div>
								</template>
								<template v-else-if="slotIdx + 1 > store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX]">
									<b>{{ $t('playerTable.notAvailable') }}</b>
								</template>
								<template v-else>
									<b>-</b>
								</template>
							</td>
							<!-- NOT minimal -->
							<td v-else>
								<template v-if="companySlot.length > 0">
									<div class="slotsTDdiv">
										<div class="slotImgsDiv" :class="[{ selectableSlot: canSelectSlot(playerIndex, slotIdx, companySlot) }, { unMergeableSlot: companySlot.length > 0 && model.getActiveCompanyDataFromID(companySlot[0]).mergedThisPhase }, { mergedSlotPulse: model.getActiveCompanyDataFromID(companySlot[0]).mergedThisPhase }, { selectedSlotToOperate: playerIndex === controller.currentPlayerIndex() && store.context.selectedSlotToOperate === slotIdx }]" @click="clickedSlot(companySlot, slotIdx, playerIndex)" :style="{ height: companySlot.length > 1 ? 79 + 20 * (companySlot.length - 1) + 'px' : '81px' }">
											<template v-for="(companyID, idx2) in companySlot" :key="idx2">
												<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))" alt="Company" :style="{ top: (companySlot.length - 1 - idx2) * 20 + 'px' }" />
												<div :class="{ crossBackground: model.getActiveCompanyDataFromID(companyID).operated }"></div>
											</template>
											<template v-if="model.getActiveCompanyDataFromID(companySlot[0]).type === rf.COMPANY_SHIPPING">
												<div class="shipCompanyBackground"></div>
												<svg class="shipCardImgSVG">
													<image class="shipCardIMG" :filter="view.getShipMarkerMainFilterURLfromPlayerIndex(playerIndex)" :xlink:href="view.getImage(model.getActiveCompanyDataFromID(companySlot[0]).shipGfx)" alt="Ship" />
												</svg>
											</template>
										</div>

										<div class="companyInfoDiv">
											<span v-if="model.getActiveCompanyDataFromID(companySlot[0]).type === rf.COMPANY_SHIPPING" :class="{ redText: model.getSlotTerrSize(playerIndex, slotIdx) >= model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[store.gameflow.currentEra] }">{{ $t('playerTable.size') }}: {{ model.getSlotTerrSize(playerIndex, slotIdx) }} / {{ model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[store.gameflow.currentEra] }}</span>
											<span v-else>{{ $t('playerTable.size') }}: {{ model.getSlotTerrSize(playerIndex, slotIdx) }}</span>
											<br />
											<template v-if="model.getActiveCompanyDataFromID(companySlot[0]).type === rf.COMPANY_SHIPPING">
												<b><u>{{ $t('playerTable.maxSize') }}</u></b>
												<br />
												<span :class="{ lightGreenBackground: store.gameflow.currentEra === rf.ERA_A }">
													<span v-if="model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[0] !== 0">{{ model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[0] }}</span>
													<span v-else>-</span>
												</span>
												,
												<span :class="{ lightGreenBackground: store.gameflow.currentEra === rf.ERA_B }">{{ model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[1] }}</span>
												,
												<span :class="{ lightGreenBackground: store.gameflow.currentEra === rf.ERA_C }">{{ model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[2] }}</span>
												<br />
												{{ $t('playerTable.hullInfo') }}: {{ model.getActiveCompanyDataFromID(companySlot[0]).hullCapacity }}
												<br />
											</template>
											{{ $t('playerTable.value') }}: {{ model.getNominalValueFromSlotID(playerIndex, slotIdx, false) }}
											<!--<span
												v-if="rf.LAND_COMPANIES.includes(model.getActiveCompanyDataFromID(companySlot[0]).type)"><br />Good:
												{{
													model.getActiveCompanyDataFromID(companySlot[0]).goodValue }}</span>
											-->
											<br />
											<span :title="$t('playerTable.companyIncomeTooltip')">{{ $t('playerTable.income') }}: {{ getSlotIncome(playerIndex, slotIdx) }}</span>
										</div>
									</div>
								</template>
								<template v-else-if="slotIdx + 1 > store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX]">
									<b>{{ $t('playerTable.notAvailable') }}</b>
								</template>
								<template v-else>
									<b>{{ $t('playerTable.empty') }}</b>
								</template>
							</td>
						</template>
					</tr>
				</table>
			</div>
			<div id="infoDiv">
				<button class="actionsLineButton" @click="store.topMenuViews.minimalPlayerTable = !store.topMenuViews.minimalPlayerTable">
					<span v-if="store.topMenuViews.minimalPlayerTable">{{ $t('playerTable.expandTable') }}</span>
					<span v-else>{{ $t('playerTable.minimizeTable') }}</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.playerTableName {
	display: inline-block;
	vertical-align: middle;

	/* 1. Limit the maximum size */
	max-width: 200px;

	/* 2. FORCE it to be at least as wide as the text (up to the max) */
	width: min-content;

	/* 3. Prevent parent flexboxes from squashing it */
	flex-shrink: 0;

	/* 4. Standard truncation */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.slotsTDdiv {
	display: flex;
	align-items: center;
}

.slotImgsDiv {
	position: relative;
	width: 79px;
}

.companyCardIMG {
	position: absolute;
	left: 0px;
	border: 2px solid black;
	width: 75px;
	height: 75px;
	animation: acquireDeedIn 0.25s ease-out;
	transform-origin: center;
}

.slotImgsMinimalDiv {
	position: relative;
	height: 20px;
	min-width: fit-content;
}

.companyCardMinimalIMG {
	position: absolute;
	border: 1px solid black;
	width: 20px;
	height: 20px;
	box-sizing: border-box;
	top: 0px;
	animation: acquireDeedIn 0.25s ease-out;
	transform-origin: center;
}

@keyframes acquireDeedIn {
	0% {
		opacity: 0.5;
		transform: scale(0.82);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}

.shipCompanyBackground {
	background-color: #4ca0bc;
	position: absolute;
	left: 2px;
	top: 20px;
	width: 70px;
	height: 40px;
}

.shipCardImgSVG {
	position: absolute;
	left: 18px;
	top: 20px;
	width: 46px;
	height: 46px;
}

.shipCardIMG {
	width: 100%;
	height: 100%;
}

#container {
	display: flex;
	justify-content: center;
	/* Center the flex container horizontally */
	min-width: 1000px;
	/* Minimum total width */
}

#topAreaContainerDiv {
	display: flex;
	min-width: fit-content;
	/* Minimum total width */
	margin: auto;
}

#playerTableDiv {
	min-width: 700px;
	/* Fixed width for the left div */
	width: fit-content;
}

#infoDiv {
	/*flex: 1; /* Take up the remaining space */
	width: 0px;
	background-color: lightcoral;
}

#playerTable {
	border-collapse: collapse;
	min-width: 600px;
	margin: auto;
}

#playerTable td,
#playerTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#playerTable tr {
	cursor: pointer;
	text-align: center;
}

#playerTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#playerTable tr:nth-child(odd) {
	background-color: white;
}

#playerTable tr:hover {
	background-color: #ddd;
}

#playerTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.eraCardIMG {
	border: 2px solid black;
	width: 150px;
	margin-right: 5px;
}

.unMergeableSlot {
	border: 3px solid red;
}

.selectableSlot {
	cursor: pointer;
	border: 3px solid yellow;
}

.selectableSlot:hover {
	border-color: lightgreen;
}

.selectedSlotToOperate {
	border: 3px solid lightgreen !important;
}

.mergedSlotPulse {
	animation: mergerSlotPulse 0.35s ease-out;
}

@keyframes mergerSlotPulse {
	0% {
		box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.75);
	}
	70% {
		box-shadow: 0 0 0 7px rgba(40, 167, 69, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
	}
}

.crossBackground {
	z-index: 20;
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
	background: linear-gradient(to top left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%);
}

.activePLayer {
	background-color: lightgreen !important;
}

.passedPlayer {
	background-color: orange !important;
}

.lightGreenBackground {
	background-color: yellow;
}

.redText {
	color: red;
}

.currentPhaseGlow {
	background-color: lightgreen;
	animation: phaseHighlightIn 0.35s ease-out;
	transition: background-color 0.2s ease-in-out;
}

@keyframes phaseHighlightIn {
	0% {
		background-color: transparent;
	}
	100% {
		background-color: lightgreen;
	}
}

/* New styles for improved layout */
.header-cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 8px 4px !important;
}

.header-icon {
	width: 20px;
	height: 20px;
}

.money-cell {
	padding: 4px !important;
	text-align: right;
	position: relative;
}

.moneyDelta {
	position: absolute;
	right: 4px;
	top: 0;
	font-size: 11px;
	font-weight: bold;
	pointer-events: none;
	animation: moneyDeltaFade 1.2s ease-out forwards;
}

.moneyDelta.positive {
	color: #28a745;
}

.moneyDelta.negative {
	color: #c0392b;
}

@keyframes moneyDeltaFade {
	0% {
		opacity: 0;
		transform: translateY(3px);
	}
	15% {
		opacity: 1;
	}
	70% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translateY(-3px);
	}
}

.money-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 4px;
}

.money-label {
	font-size: 18px;
	min-width: 24px;
	text-align: center;
}

.money-value {
	font-weight: bold;
	font-size: 14px;
}

.total-row {
	border-top: 1px solid #ccc;
	padding-top: 4px;
	margin-top: 4px;
}

.total-value {
	color: #2c5aa0;
	font-weight: bold;
}

.income {
	color: #28a745;
	font-size: 12px;
	font-weight: bold;
}

.negativeIncome {
	color: #c0392b;
	font-size: 12px;
	font-weight: bold;
}

.rnd-cell {
	padding: 8px !important;
	text-align: right;
}

.rnd-cell-minimal {
	padding: 8px !important;
	text-align: right;
}

.rnd-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 3px;
}

.rnd-icon {
	font-size: 14px;
	min-width: 20px;
	text-align: center;
}

.rnd-value {
	font-weight: bold;
	font-size: 14px;
	min-width: 20px;
	text-align: center;
}

.rnd-label {
	font-size: 12px;
	color: #666;
}

.subsidy-row {
	color: #6c757d;
}

.rnd-cell-minimal .rnd-row {
	justify-content: center;
	gap: 8px;
	flex-wrap: wrap;
}

.subsidy {
	color: #6c757d;
}

.slot-info {
	margin-left: 12px;
	font-size: 13px;
	line-height: 1.4;
}

.info-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 3px;
}

.info-icon {
	font-size: 12px;
	min-width: 16px;
	text-align: center;
}

.info-label {
	font-size: 12px;
	color: #666;
	min-width: 50px;
}

.info-value {
	font-weight: bold;
	font-size: 13px;
}

.header-row {
	margin-bottom: 6px;
	border-bottom: 1px solid #eee;
	padding-bottom: 2px;
}

.header {
	font-weight: bold;
	color: #333;
}

.shipping-info {
	border: 1px solid #e3f2fd;
	background-color: #f8fbff;
	padding: 6px;
	border-radius: 4px;
	margin-top: 4px;
}

.capacity-row {
	display: flex;
	gap: 8px;
	justify-content: center;
	margin: 4px 0;
}

.era-cap {
	padding: 2px 6px;
	border-radius: 3px;
	background-color: #f5f5f5;
	font-weight: bold;
	font-size: 12px;
}

.era-active {
	background-color: #fff3cd;
	border: 1px solid #ffeaa7;
}

.income-row {
	margin-top: 6px;
	padding-top: 4px;
	border-top: 1px solid #eee;
}

.income-value {
	color: #28a745;
	font-weight: bold;
}

/* Improve table overall appearance */
#playerTable {
	font-size: 13px;
}

#playerTable th {
	background: linear-gradient(135deg, #5875f8, #4a69e6);
	font-weight: bold;
	text-transform: uppercase;
	font-size: 12px;
	letter-spacing: 0.5px;
}

#playerTable td {
	vertical-align: top;
}

#playerTable tr:hover {
	background-color: #f0f7ff;
}

.rightAlign {
	text-align: right;
}

.companyInfoDiv {
	margin-left: 10px;
	text-align: right;
}
</style>
