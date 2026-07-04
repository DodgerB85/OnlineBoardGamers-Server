<script setup>
import * as view from "../js/INDview.js"
import * as rf from "../js/INDreference.js"
import * as model from "../js/INDmodel.js"
import * as funcs from "../js/INDfuncs.js"
import * as controller from "../js/INDcontroller.js"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

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
	if (reasonArr.invalidType) return "Invalid merger type"
	if (reasonArr.alreadyMerged) return "Company has already merged this turn"
	if (reasonArr.insufficientMerger) return "Your merger tech is too low"
	if (reasonArr.noFreeSlot) return "You do not have a free slot, or own a merging company"
	if (reasonArr.lowCash) return "Not enough cash"
	if (reasonArr.tooEarlyForSiap) return "Siap Saji mergers can only be done in Era B or later"
	return "UNKNOWN REASON"
}

function generateMergerMultiErrors(reasonArr) {
	// Check EVERYTHING already merged
	let errorArr = []

	if (reasonArr.every((x) => x.invalidType)) return "No other company to merge with"

	if (reasonArr.every((x) => x.alreadyMerged)) return "Already merged this turn"

	if (reasonArr.every((x) => x.insufficientMerger)) return "Your merger tech is too low for any merger with this company"
	else if (reasonArr.some((x) => x.insufficientMerger)) errorArr.push(2) // SOME insufficient merger tech

	if (reasonArr.every((x) => x.noFreeSlot)) return "You do not have a free slot for any merger with this company"
	else if (reasonArr.some((x) => x.noFreeSlot)) errorArr.push(4) // SOME insufficient slot tech

	if (reasonArr.every((x) => x.lowCash)) return "You do not have enough cash for any merger with this company"
	else if (reasonArr.some((x) => x.lowCash)) errorArr.push(6) // SOME insufficient cash

	// Now record all the partials
	let errorStr = ""
	if (errorArr.includes(2)) errorStr += "Insufficient merger tech, "
	if (errorArr.includes(4)) errorStr += "No free slot, "
	if (errorArr.includes(6)) errorStr += "Not enough cash, "
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
						store.gameMessages.actionError = "You cannot select the same slot twice"
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
</script>

<template>
	<b>
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_NEW_ERA }">1) New Era</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_BID_TURN_ORDER }">2) Turn Order Bidding</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_MERGERS || store.gameflow.phase === rf.PHASE_MERGER_BIDDING }">3) Mergers</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_ACQUISITIONS }">4) Acquisitions</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_R_AND_D }">5) R&D</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_OPERATIONS }">6) Operations</span>
		►
		<span :class="{ currentPhaseGlow: store.gameflow.phase === rf.PHASE_CITY_GROWTH }">7) City Growth</span>
	</b>
	<div id="container">
		<div id="topAreaContainerDiv">
			<div id="playerTableDiv">
				<table id="playerTable">
					<thead>
						<tr>
							<th><b>Player</b></th>
							<th><b>Money</b></th>
							<th><b>R & D</b></th>
							<th><b>Slot 1</b></th>
							<th><b>Slot 2</b></th>
							<th><b>Slot 3</b></th>
							<th><b>Slot 4</b></th>
							<th><b>Slot 5</b></th>
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
								<span v-if="store.players[playerIndex].moneyRoundIncome > 0" class="income">+{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyRoundIncome) }}</span>
							</div>
						</td>
						<td v-else class="money-cell">
							<div class="money-row">
								<span v-if="store.options.playerTableStyle === 0" class="money-label">💵</span>
								<span v-else>Cash: </span>
								<span class="money-value">{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyCash) }}</span>
								<span v-if="store.players[playerIndex].moneyRoundIncome > 0" class="income">+{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyRoundIncome) }}</span>
							</div>
							<div class="money-row">
								<span v-if="store.options.playerTableStyle === 0" class="money-label">🏦</span>
								<span v-else>Bank: </span>
								<span class="money-value">{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyBank) }}</span>
							</div>
							<div class="money-row total-row">
								<span v-if="store.options.playerTableStyle === 0" class="money-label">💰</span>
								<span v-else>Total: </span>
								<span class="money-value total-value">{{ view.getMoneyString(playerIndex, store.players[playerIndex].moneyCash + store.players[playerIndex].moneyBank) }}</span>
							</div>
						</td>
						<!-- R & D -->
						<td v-if="store.topMenuViews.minimalPlayerTable" class="rightAlign">
							{{ store.players[playerIndex].RnD[rf.RnD_BID_IDX] }}-{{ store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX] }}-{{ store.players[playerIndex].RnD[rf.RnD_MERGER_IDX] }}-{{ store.players[playerIndex].RnD[rf.RnD_EXPANSION_IDX] }}-{{ store.players[playerIndex].RnD[rf.RnD_HULL_IDX] }}
							<span v-if="store.useMergerSubsidy || store.useShippingSubsidy">-</span>
							<span v-if="store.useMergerSubsidy">
								{{ store.players[playerIndex].RnD[rf.RnD_MERGER_SUBSIDY_IDX] }}
								<span v-if="store.useShippingSubsidy">-</span>
							</span>
							<span v-if="store.useShippingSubsidy">{{ store.players[playerIndex].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] }}</span>
						</td>
						<td
							v-else
							class="rightAlign"
							:style="{
								fontSize: String(getRNDfontSize()) + 'px',
							}">
							Bid: {{ store.players[playerIndex].RnD[rf.RnD_BID_IDX] }}
							<br />
							Slots: {{ store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX] }}
							<br />
							Merger: {{ store.players[playerIndex].RnD[rf.RnD_MERGER_IDX] }}
							<br />
							Expansion: {{ store.players[playerIndex].RnD[rf.RnD_EXPANSION_IDX] }}
							<br />
							Hull: {{ store.players[playerIndex].RnD[rf.RnD_HULL_IDX] }}
							<br v-if="store.useMergerSubsidy || store.useShippingSubsidy" />
							<template v-if="store.useMergerSubsidy">
								Merger Subsidy: {{ store.players[playerIndex].RnD[rf.RnD_MERGER_SUBSIDY_IDX] }}
								<br />
							</template>
							<template v-if="store.useShippingSubsidy">
								Shipping Subsidy: {{ store.players[playerIndex].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] }}
								<br />
							</template>
						</td>
						<!-- Slots-->
						<template v-for="(companySlot, slotIdx) in store.players[playerIndex].slots" :key="slotIdx">
							<td v-if="store.topMenuViews.minimalPlayerTable" :style="{ 'min-width': companySlot.length * 20 - (5 * companySlot.length - 2) + 'px' }">
								<template v-if="companySlot.length > 0">
									<div class="slotImgsMinimalDiv" :class="[{ selectableSlot: canSelectSlot(playerIndex, slotIdx, companySlot) }, { selectedSlotToOperate: controller.currentPlayerIndex() === playerIndex && store.context.selectedSlotToOperate === slotIdx }]" @click="clickedSlot(companySlot, slotIdx, playerIndex)" :style="{ width: companySlot.length * 20 + 5 * (companySlot.length - 1) + 'px' }">
										<template v-for="(companyID, idx2) in companySlot" :key="idx2">
											<img class="companyCardMinimalIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))" alt="Company" :style="{ left: idx2 * 20 + (5 * idx2 - 1) + 'px' }" />
											<div :class="{ crossBackground: model.getActiveCompanyDataFromID(companyID).operated }"></div>
										</template>
									</div>
								</template>
								<template v-else-if="slotIdx + 1 > store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX]">
									<b>N/A</b>
								</template>
								<template v-else>
									<b>-</b>
								</template>
							</td>
							<!-- NOT minimal -->
							<td v-else>
								<template v-if="companySlot.length > 0">
									<div class="slotsTDdiv">
										<div class="slotImgsDiv" :class="[{ selectableSlot: canSelectSlot(playerIndex, slotIdx, companySlot) }, { unMergeableSlot: companySlot.length > 0 && model.getActiveCompanyDataFromID(companySlot[0]).mergedThisPhase }, { selectedSlotToOperate: playerIndex === controller.currentPlayerIndex() && store.context.selectedSlotToOperate === slotIdx }]" @click="clickedSlot(companySlot, slotIdx, playerIndex)" :style="{ height: companySlot.length > 1 ? 79 + 20 * (companySlot.length - 1) + 'px' : '81px' }">
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
											<span v-if="model.getActiveCompanyDataFromID(companySlot[0]).type === rf.COMPANY_SHIPPING" :class="{ redText: model.getSlotTerrSize(playerIndex, slotIdx) >= model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[store.gameflow.currentEra] }">Size: {{ model.getSlotTerrSize(playerIndex, slotIdx) }} / {{ model.getActiveCompanyDataFromID(companySlot[0]).combinedCapacity[store.gameflow.currentEra] }}</span>
											<span v-else>Size: {{ model.getSlotTerrSize(playerIndex, slotIdx) }}</span>
											<br />
											<template v-if="model.getActiveCompanyDataFromID(companySlot[0]).type === rf.COMPANY_SHIPPING">
												<b><u>Max Size</u></b>
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
												Hull: {{ model.getActiveCompanyDataFromID(companySlot[0]).hullCapacity }}
												<br />
											</template>
											Value: {{ model.getNominalValueFromSlotID(playerIndex, slotIdx, false) }}
											<!--<span
												v-if="rf.LAND_COMPANIES.includes(model.getActiveCompanyDataFromID(companySlot[0]).type)"><br />Good:
												{{
													model.getActiveCompanyDataFromID(companySlot[0]).goodValue }}</span>
											-->
											<br />
											Income: {{ getSlotIncome(playerIndex, slotIdx) }}
										</div>
									</div>
								</template>
								<template v-else-if="slotIdx + 1 > store.players[playerIndex].RnD[rf.RnD_SLOTS_IDX]">
									<b>N/A</b>
								</template>
								<template v-else>
									<b>- Empty -</b>
								</template>
							</td>
						</template>
					</tr>
				</table>
			</div>
			<div id="infoDiv">
				<button class="actionsLineButton" @click="store.topMenuViews.minimalPlayerTable = !store.topMenuViews.minimalPlayerTable">
					<span v-if="store.topMenuViews.minimalPlayerTable">Expand Player Table</span>
					<span v-else>Minimize Player Table</span>
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
