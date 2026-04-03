<script setup>
import * as rf from "../js/KFWreference.js"
import * as model from "../js/KFWmodel.js"
import * as view from "../js/KFWview.js"
import * as controller from "../js/KFWcontroller.js"
import * as village from "../js/KFWvillage.js"
import * as rules from "../js/KFWrules.js"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { computed } from "vue"

const computedMeeplePopupData = computed(() => {
	let hiddenMeeples = controller.currentPlayerObj().hiddenMeeples

	let hiddenBlueSelectable = rules.isPlayerHiddenMeepleSelectable(controller.currentPlayerIndex(), hiddenMeeples[rf.MEEPLE_BLUE], rf.MEEPLE_BLUE)
	let hiddenRedSelectable = rules.isPlayerHiddenMeepleSelectable(controller.currentPlayerIndex(), hiddenMeeples[rf.MEEPLE_RED], rf.MEEPLE_RED)
	let hiddenYellowSelectable = rules.isPlayerHiddenMeepleSelectable(controller.currentPlayerIndex(), hiddenMeeples[rf.MEEPLE_YELLOW], rf.MEEPLE_YELLOW)
	let hiddenGreenSelectable = rules.isPlayerHiddenMeepleSelectable(controller.currentPlayerIndex(), hiddenMeeples[rf.MEEPLE_GREEN], rf.MEEPLE_GREEN)

	let anyHiddenMeepleSelectable = hiddenBlueSelectable || hiddenGreenSelectable || hiddenRedSelectable || hiddenYellowSelectable

	let selectableMeepleArray = []
	if (hiddenBlueSelectable) selectableMeepleArray.push(rf.MEEPLE_BLUE)
	if (hiddenRedSelectable) selectableMeepleArray.push(rf.MEEPLE_RED)
	if (hiddenYellowSelectable) selectableMeepleArray.push(rf.MEEPLE_YELLOW)
	if (hiddenGreenSelectable) selectableMeepleArray.push(rf.MEEPLE_GREEN)

	let outbidMeepleInfo = store.meeplePopupSetter.outbidMeepleInfo

	return {
		left: store.meeplePopupSetter.xPos,
		top: store.meeplePopupSetter.yPos,
		hiddenBlueSelectable,
		hiddenGreenSelectable,
		hiddenRedSelectable,
		hiddenYellowSelectable,
		anyHiddenMeepleSelectable,
		selectableMeepleArray,
		outbidMeepleInfo,
	}
})

function resetWholePlayerTurn() {
	store.meeplePopupSetter.showPopup = false
	store.clearContext()

	model.resetWholeTurn()
	controller.startPlayerTurn()
}

function finishAddingMeeples() {
	store.meeplePopupSetter.showPopup = false
	// You now have enough meeples for a valid bid / to activate a tile
	store.removeAllActiveHighlights()
	model.unhighlightOutbidMeeples()
	// If you were bidding, then just move to end turn
	if (store.context.selectedTileArea === rf.TILE_BIDDING_AREA) {
		store.context.action = rf.ACT_CONFIRM_END_TURN
		store.removeAllActiveHighlights()

		// Add the history
		model.addHistory(rf.HIST_BID_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
		controller.endPlayerTurn()
	}
	// If you activated a tile, move on to that action
	else if (store.context.selectedTileArea === rf.TILE_ACTION_AREA) {
		model.processTileAction(store.context.selectedTile)
	}
}

function clickedSupplyMeeple(colour) {
	if (controller.currentPlayerObj().hiddenMeeples[colour] === 0) return
	if (!rf.ACT_MEEPLE_HIGHLIGHTING.includes(store.context.action)) return
	if (!rules.isPlayerHiddenMeepleSelectable(controller.currentPlayerIndex(), controller.currentPlayerObj().hiddenMeeples[colour], colour)) return

	if (store.context.action !== rf.ACT_CHOOSE_MEEPLES) return
	let continueClick = true
	if (store.context.coreMeepleColour !== colour && store.context.coreMeepleColour !== rf.MEEPLE_NONE) continueClick = false
	// Boat 4b allows any colour for action area
	if (store.context.selectedTileArea === rf.TILE_ACTION_AREA && village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT4_B)) continueClick = true
	if (!continueClick) return

	// If it would push the meepls > 6 then return
	if (store.context.selectedTileArea === rf.TILE_ACTION_AREA && store.context.selectedTile.meeplesOnTile.reduce((sum, subarray) => sum + subarray.length, 0) === 6) {
		store.gameMessages.errorText ="Tile Full"
		return
	}

	model.addMeepleFromYourSupplyToTile(colour)
}

function clickedOutbidMeeple(entry) {
	// So now it's a proper click to move outbid meeples
	model.moveOutbidMeeples(entry[0], controller.currentPlayerIndex())
}
</script>

<template>
	<div v-if="store.meeplePopupSetter.showPopup" class="meeplePopup" :style="{ left: computedMeeplePopupData.left + 'px', top: computedMeeplePopupData.top + 'px' }">
		<div class="addMeeplesDiv">Add Workers:</div>
		<!-- Meeples In Supply -->
		<template v-if="!computedMeeplePopupData.anyHiddenMeepleSelectable">
			<div class="noSupplyMeeplesDiv">
				<b>No eligible workers in your supply</b>
			</div>
		</template>
		<template v-else>
			<b><u>Hidden Workers</u></b>
			<br />
			<template v-for="(meepleAmount, idx) in controller.currentPlayerObj().hiddenMeeples" :key="idx">
				<div v-if="computedMeeplePopupData.selectableMeepleArray.includes(idx)" class="meepleImgAndNumberDiv" @click="clickedSupplyMeeple(idx)">
					<div class="meepleImgDiv">
						<img class="meepleImg" :class="{ selectableMeepleImg: rules.isPlayerHiddenMeepleSelectable(controller.currentPlayerIndex(), meepleAmount, idx) }" :src="view.getImage('meeple_' + String(idx))" alt="Meeple" />
					</div>
					<div class="meepleNumberDiv">{{ meepleAmount }}</div>
				</div>
			</template>
			<br />
		</template>
		<!-- Outbid Meeples -->
		<template v-if="computedMeeplePopupData.outbidMeepleInfo.length === 0">
			<div class="noSupplyMeeplesDiv">
				<b>No eligible outbid workers</b>
			</div>
		</template>
		<template v-else>
			<b><u>Outbid Workers</u></b>
			<br />
			<template v-for="(entry, idx) in computedMeeplePopupData.outbidMeepleInfo" :key="idx">
				{{ entry[3] }}
				<div class="meepleImgAndNumberDiv" @click="clickedOutbidMeeple(entry)">
					<div class="meepleImgDiv">
						<img class="meepleImg selectableMeepleImg" :src="view.getImage('meeple_' + String(entry[1]))" alt="Meeple" />
					</div>
					<div class="meepleNumberDiv">{{ entry[2] }}</div>
				</div>
			</template>
			<br />
		</template>
		<button @click="store.meeplePopupSetter.showPopup = false" class="actionsLineButton">Close</button>
		<button @click="resetWholePlayerTurn" class="actionsLineButton">Cancel</button>
		<button v-if="store.gameMessages.actionError === '' && store.context.minMeeplesRequired <= 0" class="actionsLineButton" @click="finishAddingMeeples">
			<span v-if="store.context.selectedTileArea === rf.TILE_BIDDING_AREA">Finish Adding Workers & End Turn</span>
			<span v-else>Finish Adding Workers</span>
		</button>
		<template v-else-if="store.context.minMeeplesRequired > 0">
			<div class="requiredMeeplesDiv">
				You need: {{ store.context.minMeeplesRequired }}
				<span v-if="store.context.minMeeplesRequired > 1">workers</span>
				<span v-else>worker</span>
			</div>
		</template>
	</div>
</template>

<style scoped>
.meeplePopup {
	position: absolute;
	background-color: #eee9e6;
	border: 1px solid black;
	padding: 5px;
	text-align: left;
	z-index: 9999;
	width: 225px;
	min-height: 100px;
	text-align: center;
}

.addMeeplesDiv {
	font-weight: bolder;
	font-size: 20px;
	/*border: 2px solid black;
	border-radius: 25px;*/
	padding: 5px;
}

.noSupplyMeeplesDiv {
	font-weight: bolder;
	font-size: 20px;
}

.meepleImgAndNumberDiv {
	display: inline-block;
	height: 50px;
	width: 50px;
	position: relative;
	margin-right: 5px;
	margin-top: 5px;
	vertical-align: middle;
}

.meepleImgDiv {
	width: 100%;
	height: 100%;
}
.meepleImg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
	padding: 0px;
}
.selectableMeepleImg {
	filter: drop-shadow(2px 0 0 yellow) drop-shadow(0 2px 0 yellow) drop-shadow(-2px 0 0 yellow) drop-shadow(0 -2px 0 yellow);
}
.selectableMeepleImg:hover {
	filter: drop-shadow(2px 0 0 lightgreen) drop-shadow(0 2px 0 lightgreen) drop-shadow(-2px 0 0 lightgreen) drop-shadow(0 -2px 0 lightgreen) !important;
}
.meepleNumberDiv {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	font-weight: bolder;
	font-size: 40px;
	text-shadow:
		-1px -1px 0 #fff,
		1px -1px 0 #fff,
		-1px 1px 0 #fff,
		1px 1px 0 #fff;
	pointer-events: none;
}

.requiredMeeplesDiv {
	font-weight: bolder;
	font-size: 20px;
	padding: 5px;
}
</style>
