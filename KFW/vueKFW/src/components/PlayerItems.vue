<script setup>
import * as rf from "../js/KFWreference"
import * as view from "../js/KFWview"
import * as controller from "../js/KFWcontroller"
import * as model from "../js/KFWmodel"
import * as village from "../js/KFWvillage"
import * as rules from "../js/KFWrules"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"

const props = defineProps(["playerIndexProp"])
const exchangingContracts = ref(false)
const polygonRef = ref(null)

const exchangeContractOptions = ref({
	id: -1,
	meepleOptions: [],
	skillTileOptions: [],
	resOptions: [],
})

const showPopupFunc = (event, winterTileID) => {
	polygonRef.value = event.target // Set the polygonRef to the target element
	const rect = polygonRef.value.getBoundingClientRect()
	const xPos = Math.round(rect.left + window.scrollX)
	const yPos = Math.round(rect.top + window.scrollY)
	const width = Math.round(rect.width)
	//const height = Math.round(rect.height)

	store.popupSetter.showPopup = true
	// Set the prop data
	//const svgRectDiv = originalMapDivRef.value.getBoundingClientRect()
	//const svgRectDiv = DEBUGmapSVG.value.getBoundingClientRect()

	//store.popupSetter.popupData.wholeSVGheight = svgRectDiv.height
	//store.popupSetter.popupData.popupObjectType = popupObjectType
	let tile = rf.ALL_TILES.find((t) => t.tileID.includes(winterTileID))
	store.popupSetter.xPos = xPos + width
	store.popupSetter.yPos = yPos
	store.popupSetter.tile_id = tile.id
	store.popupSetter.upgraded = tile.upgraded

	// Check if the popup would go off the right side of the screen
	const popupWidth = 250 // Assuming the popup has a width of 250px
	const popupHeight = 400 // Assuming the popup has a height of 300px
	const screenWidth = window.innerWidth // Width of the viewport
	const screenHeight = window.innerHeight // Height of the viewport

	if (store.popupSetter.xPos + popupWidth > screenWidth) {
		// Adjust the xPos to the left of the original position
		store.popupSetter.xPos = xPos - popupWidth
	}

	if (yPos + popupHeight > screenHeight + window.scrollY) {
		// Adjust the yPos to be above the original position to keep the popup on the screen
		store.popupSetter.yPos = screenHeight + window.scrollY - popupHeight
	}
}

function hidePopup() {
	store.popupSetter.showPopup = false
}

function clickedMeeple(colour) {
	if (controller.currentPlayerObj().hiddenMeeples[colour] === 0) return
	if (!rf.ACT_MEEPLE_HIGHLIGHTING.includes(store.context.action)) return
	if (!rules.isPlayerHiddenMeepleSelectable(props.playerIndexProp, controller.currentPlayerObj().hiddenMeeples[colour], colour)) return

	// Choosing items could be in ANY phase / action
	if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
		// Deduct the meeple
		controller.currentPlayerObj().hiddenMeeples[colour] -= 1
		model.deductHiddenMeeple(controller.currentPlayerIndex(), colour)
		// NB THIS LINE IS NEEDED TO MAKE EXTNESION MANUAL COST WORK
		if (store.gameflow.phase !== rf.PHASE_FINAL_SCORING) store.availableMeeples[colour]++
		// Final Scoring, set up server payload
		if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [colour]])
			else store.context.endTurnActions[index][2].push(colour)
		}

		// Add it to the itemsChosen
		store.context.itemsChosen.meeplesChosen.push(colour)
		// Remove it from the itemsRequired
		if (store.context.itemsRequired.meeplesReq.includes(colour)) store.context.itemsRequired.meeplesReq.splice(store.context.itemsRequired.meeplesReq.indexOf(colour), 1)
		else if (store.context.itemsRequired.meeplesReq.includes(rf.MEEPLE_ANY)) store.context.itemsRequired.meeplesReq.splice(store.context.itemsRequired.meeplesReq.indexOf(rf.MEEPLE_ANY), 1)
		else alert("Unable to deduct required item - meeple - ACT_CHOOSE_ITEMS - 1a")
		model.checkItemsRequiredCompletion()
	} else if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		if (store.context.action === rf.ACT_CHOOSE_MEEPLES) {
			let continueClick = true
			if (store.context.coreMeepleColour !== colour && store.context.coreMeepleColour !== rf.MEEPLE_NONE) continueClick = false
			// Boat 4b allows any colour for action area
			if (store.context.selectedTileArea === rf.TILE_ACTION_AREA && village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT4_B)) continueClick = true
			if (!continueClick) return

			// If it would push the meepls > 6 then return
			if (store.context.selectedTileArea === rf.TILE_ACTION_AREA && store.context.selectedTile.meeplesOnTile.reduce((sum, subarray) => sum + subarray.length, 0) === 6) {
				store.gameMessages.errorText = "Tile Full"
				return
			}
		}
		if (store.context.action === rf.ACT_CHOOSE_MEEPLES) model.addMeepleFromYourSupplyToTile(colour)
		else if (store.context.action === rf.ACT_CHOOSE_ANY_MEEPLE_FOR_EXCHANGE) model.exchangeChosenMeeple(colour)
		else if (store.context.action === rf.ACT_CHOOSE_SET_MEEPLE_FOR_EXCHANGE) {
			let message = ""
			message = model.exchangeMeeples_core(controller.currentPlayerIndex(), store.context.selectedTile.action[store.context.selectedTile.upgraded + 1], [0])
			store.gameMessages.turnEndText = message

			let histData = []
			histData.push(store.context.selectedTile.upgraded)
			// entry0 >=0 so must be tileID of outbid off meeples]
			histData.push(-1, [...store.context.meeplesRemoved])

			store.context.historyObj.push([...histData])

			model.addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
			store.context.meeplesRemoved.splice(0)
			store.context.historyObj.splice(0)

			store.context.action = rf.ACT_CONFIRM_END_TURN
			store.removeAllActiveHighlights()
			model.unhighlightOutbidMeeples()
		}
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		// Deduct the meeple
		controller.currentPlayerObj().hiddenMeeples[colour] -= 1
		model.deductHiddenMeeple(controller.currentPlayerIndex(), colour)
		// Final Scoring, set up server payload
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [colour]])
		else store.context.endTurnActions[index][2].push(colour)

		// Add it to the current itemSet
		store.context.currentItemSet.push(colour)
		// Remove it from the remaining itemSet
		if (store.context.remainingItemSet.includes(colour)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(colour), 1)
		else if (store.context.remainingItemSet.includes(rf.MEEPLE_ANY)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(rf.MEEPLE_ANY), 1)
		else if (store.context.remainingItemSet.includes(rf.MEEPLE_ANY_MATCH)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(rf.MEEPLE_ANY_MATCH), 1)
		else alert("Unable to deduct required item 1b")

		if (store.context.remainingItemSet.length === 0) {
			store.context.selectedTile.completedSets.push([...store.context.currentItemSet])
			store.context.currentItemSet.splice(0)
			store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
		}
		// Otherwise you need to choose more meepeles - so set the avaialble colours
		else {
			if (store.context.remainingItemSet.includes(rf.MEEPLE_ANY)) store.context.coreMeepleColour = rf.MEEPLE_ANY
			else if (store.context.remainingItemSet.includes(rf.MEEPLE_ANY_MATCH)) store.context.coreMeepleColour = rf.MEEPLE_ANY
			else store.context.coreMeepleColour = store.context.remainingItemSet[0]
		}
	}
}

function isSkillTileSelectable(skillTileAmount, idx) {
	if (props.playerIndexProp !== controller.currentPlayerIndex()) return false
	if (skillTileAmount <= 0) return false

	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		if (rf.ACT_SKILL_TILE_HIGHLIGHTING.includes(store.context.action) && skillTileAmount > 0) return true
		//return false
	}
	if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
		if (store.context.itemsRequired.skillsReq.includes(rf.SKILL_ANY)) return true
		if (store.context.itemsRequired.skillsReq.includes(idx)) return true
	}
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_SCORING) {
		if (store.context.coreSkillType === rf.SKILL_ANY || store.context.coreSkillType === idx) return true
		//return false
	}

	return false
}

function clickedSkillTile(skillTileAmount, idx) {
	if (!isSkillTileSelectable(skillTileAmount, idx)) return
	if (skillTileAmount === 0) return
	if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
		// Deduct the skill
		controller.currentPlayerObj().hiddenSkillTiles[idx] -= 1
		model.deductHiddenSkillTile(controller.currentPlayerIndex(), idx)
		// NB THIS LINE IS NEEDED TO MAKE UPGRADE MANUAL COST WORK
		if (store.gameflow.phase !== rf.PHASE_FINAL_SCORING) store.availableSkills[idx]++
		// Final Scoring, set up server payload
		if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [idx]])
			else store.context.endTurnActions[index][2].push(idx)
		}

		// Remove it from the itemsRequired
		if (store.context.itemsRequired.skillsReq.includes(idx)) store.context.itemsRequired.skillsReq.splice(store.context.itemsRequired.skillsReq.indexOf(idx), 1)
		else if (store.context.itemsRequired.skillsReq.includes(rf.SKILL_ANY)) store.context.itemsRequired.skillsReq.splice(store.context.itemsRequired.skillsReq.indexOf(rf.SKILL_ANY), 1)
		//else if (store.context.itemsRequired.skillsReq.includes(rf.SKILL_ANY_MATCH)) store.context.itemsRequired.skillsReq.splice(store.context.itemsRequired.skillsReq.indexOf(rf.SKILL_ANY_MATCH), 1)
		else alert("Unable to deduct required item 1c")
		// Add it to the items chosen
		store.context.itemsChosen.skillsChosen.push(idx)
		model.checkItemsRequiredCompletion()
	} else if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		if (store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_SKILL_TILE_EXCHANGE) model.exchangeSkillTileForSkillTiles(idx)
		else if (store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_MEEPLE) model.exchangeSkillTileForMeeples(idx)
		else if (store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_GREEN) model.exchangeSkillTileForGreen(idx)
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_SCORING) {
		// Deduct the skill
		controller.currentPlayerObj().hiddenSkillTiles[idx] -= 1
		model.deductHiddenSkillTile(controller.currentPlayerIndex(), idx)
		// Final Scoring, set up server payload
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [idx]])
		else store.context.endTurnActions[index][2].push(idx)

		// Add it to the current itemSet
		store.context.currentItemSet.push(idx)
		// Remove it from the remaining itemSet
		if (store.context.remainingItemSet.includes(idx)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(idx), 1)
		else if (store.context.remainingItemSet.includes(rf.SKILL_ANY)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(rf.SKILL_ANY), 1)
		else if (store.context.remainingItemSet.includes(rf.SKILL_ANY_MATCH)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(rf.SKILL_ANY_MATCH), 1)
		else alert("Unable to deduct required item 1c")

		if (store.context.remainingItemSet.length === 0) {
			store.context.selectedTile.completedSets.push([...store.context.currentItemSet])
			store.context.currentItemSet.splice(0)
			store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
		}
		// Otherwise you need to choose more skills - so set the avaialble skills
		else {
			if (store.context.remainingItemSet.includes(rf.SKILL_ANY)) store.context.coreSkillType = rf.SKILL_ANY
			else if (store.context.remainingItemSet.includes(rf.SKILL_ANY_MATCH)) store.context.coreSkillType = rf.SKILL_ANY
			else store.context.coreSkillType = store.context.remainingItemSet[0][0]
		}
	}
}

function isResSelectable(resAmount, idx) {
	if (resAmount <= 0) return false
	if (store.context.action === rf.ACT_CHOOSE_RES_FOR_SCORING) {
		if (store.context.coreResType === rf.RES_ANY || store.context.coreResType === idx) return true
		// Gold is wild, so allow it to be selected
		if (idx === rf.GOLD && resAmount > 0) return true
		return false
	}
	if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
		if (store.context.itemsRequired.resReq.includes(rf.RES_ANY)) return true
		if (store.context.itemsRequired.resReq.includes(idx)) return true
	}
	return false
}

function clickedRes(resAmount, idx) {
	if (resAmount <= 0) return
	if (!isResSelectable(resAmount, idx)) return
	if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
		// Deduct the res
		controller.currentPlayerObj().villageTiles[0].resources[idx] -= 1
		// Add it to the itemsChosen
		store.context.itemsChosen.resChosen.push(idx)
		// Remove it from the itemsRequired
		if (store.context.itemsRequired.resReq.includes(idx)) store.context.itemsRequired.resReq.splice(store.context.itemsRequired.resReq.indexOf(idx), 1)
		else if (store.context.itemsRequired.resReq.includes(rf.RES_ANY)) store.context.itemsRequired.resReq.splice(store.context.itemsRequired.resReq.indexOf(rf.RES_ANY), 1)
		else alert("Unable to deduct required item - res - ACT_CHOOSE_ITEMS 2a")
		model.checkItemsRequiredCompletion()
	}
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.action === rf.ACT_CHOOSE_RES_FOR_SCORING) {
		// Deduct the res
		controller.currentPlayerObj().villageTiles[0].resources[idx] -= 1
		// Add it to the current itemSet
		store.context.currentItemSet.push(idx)
		// Remove it from the remaining itemSet
		if (store.context.remainingItemSet.includes(idx)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(idx), 1)
		else if (store.context.remainingItemSet.includes(rf.RES_ANY)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(rf.RES_ANY), 1)
		else if (store.context.remainingItemSet.includes(rf.RES_ANY_MATCH)) store.context.remainingItemSet.splice(store.context.remainingItemSet.indexOf(rf.RES_ANY_MATCH), 1)
		else alert("Unable to deduct required item res 2b")

		if (store.context.remainingItemSet.length === 0) {
			store.context.selectedTile.completedSets.push([...store.context.currentItemSet])
			store.context.currentItemSet.splice(0)
			store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
		}
		// Otherwise you need to choose more skills - so set the avaialble skills
		else {
			if (store.context.remainingItemSet.includes(rf.RES_ANY)) store.context.coreResType = rf.RES_ANY
			else if (store.context.remainingItemSet.includes(rf.RES_ANY_MATCH)) store.context.coreResType = rf.RES_ANY_MATCH
			else store.context.coreResType = store.context.remainingItemSet[0][0]
		}
	}
}

function localEnableExchangeContracts() {
	exchangingContracts.value = !exchangingContracts.value
	if (exchangingContracts.value === false) {
		exchangeContractOptions.value.id = -1
		exchangeContractOptions.value.meepleOptions.splice(0)
		exchangeContractOptions.value.skillTileOptions.splice(0)
		exchangeContractOptions.value.resOptions.splice(0)
	}
}

function localClickedContract(contract, stopActions) {
	if (!exchangingContracts.value) return
	if (stopActions) return

	// Check for exchanging purple meeple first
	if (contract.requiredMeeples[0] === rf.MEEPLE_PURPLE) {
		exchangeContractOptions.value.id = contract.id
		exchangeContractOptions.value.meepleOptions = [rf.MEEPLE_BLUE, rf.MEEPLE_RED, rf.MEEPLE_YELLOW, rf.MEEPLE_GREEN]
		exchangeContractOptions.value.skillTileOptions = [rf.SAW, rf.PICKAXE, rf.ANVIL]
		exchangeContractOptions.value.resOptions = [rf.WOOD, rf.STONE, rf.IRON, rf.GOLD]
		return
	}

	// Remove negative entries and deduplicate arrays
	for (let key of ["requiredMeeples", "requiredSkillTiles", "requiredResources"]) {
		contract[key] = [...new Set(contract[key].filter((item) => item >= 0))]
	}

	// Find the total length of all arrays
	const totalLength = Object.values(contract).reduce((acc, val) => acc + (Array.isArray(val) ? val.length : 0), 0)

	// Find and log the single array with a length of 1
	if (totalLength === 1) {
		for (let key in contract) {
			if (contract[key].length === 1) {
				let keyNum = 0
				if (key === "requiredSkillTiles") keyNum = 1
				else if (key === "requiredResources") keyNum = 2
				model.exchangeContractAuto(contract.id, keyNum, contract[key][0])
				break
			}
		}
		exchangingContracts.value = false
		return
	}

	// Otherwise, a decision needs to be made
	exchangeContractOptions.value.id = contract.id
	exchangeContractOptions.value.meepleOptions = contract.requiredMeeples
	exchangeContractOptions.value.skillTileOptions = contract.requiredSkillTiles
	exchangeContractOptions.value.resOptions = contract.requiredResources
}

function localExchangeContract(keyNum, item) {
	model.exchangeContractAuto(exchangeContractOptions.value.id, keyNum, item)
	exchangingContracts.value = false
	exchangeContractOptions.value.id = -1
	exchangeContractOptions.value.meepleOptions.splice(0)
	exchangeContractOptions.value.skillTileOptions.splice(0)
	exchangeContractOptions.value.resOptions.splice(0)
}

function getMeepleHeightForInfoLevel2(meepleType) {
	const meepleHeight = 50
	/*console.log(store.players[props.playerIndexProp].knownHiddenMeeples)
	let totalMeeples = store.players[props.playerIndexProp].knownHiddenMeeples.slice(0, 4).reduce((acc, val) => acc + val, 0);
	let percent = (store.players[props.playerIndexProp].knownHiddenMeeples[meepleType] / totalMeeples) * 100
	if (percent < 10) return 10 * meepleHeight / 100
	if (percent > 90) return 90 * meepleHeight / 100
	else return percent * meepleHeight / 100*/
	let hiddenKnownMeeples = store.players[props.playerIndexProp].knownHiddenMeeples.slice(0, 4)
	let totalMeeples = hiddenKnownMeeples.reduce((acc, val) => acc + val, 0)
	if (totalMeeples === 0) totalMeeples = 1
	let percentArray = [0, 0, 0, 0]
	for (let i = 0; i < hiddenKnownMeeples.length; i++) {
		percentArray[i] = (hiddenKnownMeeples[i] / totalMeeples) * 100
	}
	let highestPercent = Math.max(...percentArray)
	if (highestPercent === 0) highestPercent = 1
	let adjustedPercentArray = [0, 0, 0, 0]
	for (let i = 0; i < percentArray.length; i++) {
		adjustedPercentArray[i] = percentArray[i] / highestPercent
	}
	let returnPercent = adjustedPercentArray[meepleType]
	if (returnPercent === 0) returnPercent = 0.1
	else if (returnPercent < 0.1) returnPercent = 0.1
	else if (returnPercent > 0.9) returnPercent = 0.9
	return returnPercent * meepleHeight
}

function getSkillHeightForInfoLevel2(skilType) {
	const skillheight = 50
	let hiddenKnownSkills = store.players[props.playerIndexProp].knownHiddenSkillTiles.slice(0, 3)
	let totalSkills = hiddenKnownSkills.reduce((acc, val) => acc + val, 0)
	if (totalSkills === 0) totalSkills = 1
	let percentArray = [0, 0, 0]
	for (let i = 0; i < hiddenKnownSkills.length; i++) {
		percentArray[i] = (hiddenKnownSkills[i] / totalSkills) * 100
	}
	let highestPercent = Math.max(...percentArray)
	if (highestPercent === 0) highestPercent = 1
	let adjustedPercentArray = [0, 0, 0, 0]
	for (let i = 0; i < percentArray.length; i++) {
		adjustedPercentArray[i] = percentArray[i] / highestPercent
	}
	let returnPercent = adjustedPercentArray[skilType]
	if (returnPercent === 0) returnPercent = 0.2
	else if (returnPercent < 0.1) returnPercent = 0.2
	else if (returnPercent > 0.9) returnPercent = 0.8
	return returnPercent * skillheight
}

function getMyContractGfx(contract, idx) {
	if (store.context.hideContractFromBoatCollection && idx === store.players[personal.pov].hiddenContracts.length - 1) return view.getImage('c_back')

	return view.getImage(contract.gfx)
}

function localClickedPurpleMeeple() {
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.action === rf.ACT_CHOOSE_SCORING_AREAS) {
		store.context.action = rf.ACT_EXCHANGE_PURPLE_MEEPLE
	}
}
</script>

<template>
	<template
		v-if="personal.trainingGame || playerIndexProp === personal.pov || personal.adminDataInspection === true || store.gameflow.phase === rf.PHASE_GAME_OVER">
		<div class="playerItemsDiv">
			<span class="mainEntryPlayer" :style="{
				backgroundColor: personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
				color: personal.getCorrectedColourText(store.players[playerIndexProp].colour),
			}">
				{{ store.players[playerIndexProp].displayName }}
			</span>
			<div v-if="store.players[playerIndexProp].hasPurpleMeeple" class="meepleImgAndNumberDiv purpleMeepleDiv">
				<div class="meepleImgDiv">
					<img class="meepleImg"
						:class="{ selectableMeepleImg: store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.action === rf.ACT_CHOOSE_SCORING_AREAS }"
						@click="localClickedPurpleMeeple"
						:src="view.getImage('meeple_purple')" alt="Meeple" />
				</div>
			</div>
			<br />
			<!-- MEEPLES -->
			<template v-for="(meepleAmount, idx) in store.players[playerIndexProp].hiddenMeeples" :key="idx">
				<div class="meepleImgAndNumberDiv" @click="clickedMeeple(idx)">
					<div class="meepleImgDiv">
						<img class="meepleImg"
							:class="{ selectableMeepleImg: rules.isPlayerHiddenMeepleSelectable(playerIndexProp, meepleAmount, idx) }"
							:src="view.getImage('meeple_' + String(idx))" alt="Meeple" />
					</div>
					<div class="meepleNumberDiv">{{ meepleAmount }}</div>
				</div>
				<template v-if="idx % 2 === 1"><br /></template>
			</template>
			<!-- SKILL TILES -->
			<template v-for="(skillTileAmount, idx) in store.players[playerIndexProp].hiddenSkillTiles" :key="idx">
				<div class="skillTileImgAndNumberDiv"
					:class="{ selectableSkillTileImg: isSkillTileSelectable(skillTileAmount, idx) }"
					@click="clickedSkillTile(skillTileAmount, idx)">
					<div class="skillTileImgDiv">
						<img class="skillTileImg" :src="view.getImage('skillTile_' + String(idx))" alt="Skill" />
					</div>
					<div class="skillTileNumberDiv">{{ skillTileAmount }}</div>
				</div>
			</template>
			<!-- RESOURCES ON HOME TILE - FINAL SCORING ONLY -->
			<template v-if="store.gameflow.phase === rf.PHASE_FINAL_SCORING">
				<template v-for="(resAmount, idx) in store.players[playerIndexProp].villageTiles[0].resources"
					:key="idx">
					<div class="resImgAndNumberDiv" :class="{ selectableResImg: isResSelectable(resAmount, idx) }"
						@click="clickedRes(resAmount, idx)">
						<div class="resImgDiv">
							<img class="resImg" :src="view.getImage('res_' + String(idx))" alt="Res" />
						</div>
						<div class="resNumberDiv">{{ resAmount }}</div>
					</div>
				</template>
			</template>
			<br />
			<!-- CONTRACTS -->
			<template v-if="store.players[playerIndexProp].hiddenContracts.length > 0">
				<template v-for="(contract, idx) in store.players[playerIndexProp].hiddenContracts" :key="idx">
					<div class="contractDiv">
						<svg viewBox="77 131.5 55.5 34" class="contractSVG">
							<image width="52.916668" height="31.75" :xlink:href="getMyContractGfx(contract, idx)"
								x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
							<path :d="rf.CONTRACT_PATH_D" class="contractPath"
								:class="{ contractPathSeletable: exchangingContracts && !getMyContractGfx(contract, idx).includes('c_back.jpg') }"
								@click="localClickedContract(contract, getMyContractGfx(contract, idx).includes('c_back.jpg'))" />
						</svg>
					</div>
					<template v-if="idx % 2 === 1"><br /></template>
				</template>
				<!-- EXCHANGE CONTRACT OPTIONS -->
				<template v-if="exchangingContracts">
					<br />
					<img @click="localExchangeContract(0, meeple)"
						v-for="(meeple, idx) in exchangeContractOptions.meepleOptions" :key="idx"
						class="meepleImgNoDiv selectableMeepleImg" :src="view.getImage('meeple_' + String(meeple))"
						alt="Meeple" />
					<img @click="localExchangeContract(1, skillTile)"
						v-for="(skillTile, idx) in exchangeContractOptions.skillTileOptions" :key="idx"
						class="skillTileImgNoDiv selectableSkillTileImg"
						:src="view.getImage('skillTile_' + String(skillTile))" alt="Skill Tile" />
					<img @click="localExchangeContract(2, resource)"
						v-for="(resource, idx) in exchangeContractOptions.resOptions" :key="idx"
						class="resImgNoDiv selectableResImg" :src="view.getImage('res_' + String(resource))"
						alt="Res" />
				</template>
				<button v-if="personal.canPlay() && playerIndexProp === controller.currentPlayerIndex()"
					class="actionsLineButton" @click="localEnableExchangeContracts">
					<span v-if="exchangingContracts">Cancel</span>
					<span v-else>Exchange Contract</span>
				</button>
				<br v-else />
			</template>
			<!-- Winter Tiles - Don't display in Winter-->
			<template v-if="store.gameflow.season !== rf.WINTER">
				<template v-for="(winterTileID, idx) in store.players[playerIndexProp].hiddenWinterTile_tileIDs"
					:key="idx">
					<div class="hiddenWinterHexDiv">
						<svg class="hiddenWinterHexSVG" viewBox="-420 -348 840 696" xmlns="http://www.w3.org/2000/svg">
							<defs>
								<pattern :id="rf.ALL_TILES.find((tile) => tile.tileID.includes(winterTileID)).gfx[0]"
									height="100%" width="100%" patternContentUnits="objectBoundingBox">
									<image height="1" width="1" preserveAspectRatio="none"
										:xlink:href="view.getImage(rf.ALL_TILES.find((tile) => tile.tileID.includes(winterTileID)).gfx[0])" />
								</pattern>
							</defs>
							<polygon @mouseover="showPopupFunc($event, winterTileID)" @mouseout="hidePopup()"
								class="hiddenWinterHexPolygon"
								points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41"
								:fill="`url(#${rf.ALL_TILES.find((tile) => tile.tileID.includes(winterTileID)).gfx[0]})`" />
						</svg>
					</div>
				</template>
				<br />
			</template>
		</div>
	</template>
	<template v-else>
		<div class="playerItemsDiv">
			<span class="mainEntryPlayer" :style="{
				backgroundColor: personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
				color: personal.getCorrectedColourText(store.players[playerIndexProp].colour),
			}">
				{{ store.players[playerIndexProp].displayName }}
			</span>
			<div v-if="store.players[playerIndexProp].hasPurpleMeeple" class="meepleImgAndNumberDiv purpleMeepleDiv">
				<div class="meepleImgDiv">
					<img class="meepleImg" :src="view.getImage('meeple_purple')" alt="Meeple" />
				</div>
			</div>
			<br />
			<template v-if="store.hiddenInformationKnowledge !== 5">
				<!-- MEEPLES -->
				<div class="meepleImgAndNumberDiv">
					<div class="meepleImgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_any')" alt="Meeple" />
					</div>
					<div class="meepleNumberDiv">
						<span v-if="store.hiddenInformationKnowledge === 9 || store.hiddenInformationKnowledge === 8">{{
							store.players[playerIndexProp].knownHiddenMeeples[4] }}</span>
						<span v-else-if="store.hiddenInformationKnowledge === 7">
							{{ store.players[playerIndexProp].knownHiddenMeeples[0] + store.players[playerIndexProp].knownHiddenMeeples[1] + store.players[playerIndexProp].knownHiddenMeeples[2] + store.players[playerIndexProp].knownHiddenMeeples[3] + store.players[playerIndexProp].knownHiddenMeeples[4] }}
						</span>
						<span v-else>?</span>
					</div>
				</div>
				<div class="meepleImgAndNumberDiv">
					<div v-if="store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6" class="meepleImgDiv" :style="{
						height: '50px',
					}">
						<img class="meepleImgBlank" :src="view.getImage('meeple_blank')" alt="Meeple" />
					</div>
					<div class="meepleImgDiv" :style="{
						overflowY: (store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6) ? 'hidden' : 'visible',
						height: 	(store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6) ? getMeepleHeightForInfoLevel2(rf.MEEPLE_GREEN) + 'px' : '50px',
					}">
						<img :class="store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6 ? 'meepleImgHiddenInfo2' : 'meepleImg'"
							:src="view.getImage('meeple_green')" alt="Meeple" />
					</div>
					<div v-if="store.hiddenInformationKnowledge === 9 || store.hiddenInformationKnowledge === 8" class="meepleNumberDiv">{{
						store.players[playerIndexProp].knownHiddenMeeples[3] }}</div>
				</div>
				<br />
				<template v-for="(meepleAmount, idx) in store.players[playerIndexProp].knownHiddenMeeples.slice(0, 3)"
					:key="idx">
					<div class="meepleImgAndNumberDiv">
						<div v-if="store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6" class="meepleImgDiv" :style="{
							height: '50px',
						}">
							<img class="meepleImgBlank" :src="view.getImage('meeple_blank')" alt="Meeple" />
						</div>
						<div class="meepleImgDiv" :style="{
							overflowY: (store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6)  ? 'hidden' : 'visible',
							height: 	(store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6)  ? getMeepleHeightForInfoLevel2(idx) + 'px' : '50px',
						}">
							<img :class="store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6 ? 'meepleImgHiddenInfo2' : 'meepleImg'"
								:src="view.getImage('meeple_' + String(idx))" alt="Meeple" />
						</div>
						<div v-if="store.hiddenInformationKnowledge === 9 || store.hiddenInformationKnowledge === 8" class="meepleNumberDiv">{{ meepleAmount }}</div>
					</div>
				</template>
				<!-- SKILL TILES -->
				<div class="skillTileImgAndNumberDiv">
					<div class="skillTileImgDiv">
						<img class="skillTileImg" :src="view.getImage('skillTile_any')" alt="Skill" />
					</div>
					<div class="meepleNumberDiv">
						<span v-if="store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6">?</span>
						<span v-else>{{ store.players[playerIndexProp].knownHiddenSkillTiles[3] }}</span>
					</div>
				</div>
				<br />
				<template
					v-for="(skillTileAmount, idx) in store.players[playerIndexProp].knownHiddenSkillTiles.slice(0, 3)"
					:key="idx">
					<div class="skillTileImgAndNumberDiv">
						<div class="skillTileImgDiv" :style="{
							overflowY: (store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6) ? 'hidden' : 'visible',
							height: 	(store.hiddenInformationKnowledge === 7 || store.hiddenInformationKnowledge === 6) ? getSkillHeightForInfoLevel2(idx) + 'px' : '50px',
						}">
							<img class="skillTileImg" :src="view.getImage('skillTile_' + String(idx))" alt="Skill" />
						</div>
						<div v-if="store.hiddenInformationKnowledge === 9 || store.hiddenInformationKnowledge === 8" class="skillTileNumberDiv">{{ skillTileAmount }}
						</div>
					</div>
				</template>
				<!-- RESOURCES ON HOME TILE - FINAL SCORING ONLY -->
				<template v-if="store.gameflow.phase === rf.PHASE_FINAL_SCORING">
					<template v-for="(resAmount, idx) in store.players[playerIndexProp].villageTiles[0].resources"
						:key="idx">
						<div class="resImgAndNumberDiv">
							<div class="resImgDiv">
								<img class="resImg" :src="view.getImage('res_' + String(idx))" alt="Worker" />
							</div>
							<div class="resNumberDiv">{{ resAmount }}</div>
						</div>
					</template>
				</template>
				<br />
			</template>
			<!-- CONTRACTS -->
			<template v-if="store.players[playerIndexProp].hiddenContracts.length > 0">
				<template v-for="(contract, idx) in store.players[playerIndexProp].hiddenContracts" :key="idx">
					<div class="contractDiv">
						<svg viewBox="77 131.5 55.5 34" class="contractSVG">
							<image width="52.916668" height="31.75"
								:xlink:href="view.getImage(contract.visible === 1 ? contract.gfx : 'c_back')"
								x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
							<path :d="rf.CONTRACT_PATH_D" class="contractPath"
								:class="{ contractPathSeletable: exchangingContracts }"
								@click="localClickedContract(contract)" />
						</svg>
					</div>
					<template v-if="idx % 2 === 1"><br /></template>
				</template>
			</template>
		</div>
	</template>
</template>

<style scoped>
.hiddenWinterHexDiv {
	display: inline-block;
	vertical-align: middle;
	width: 88px;
	height: 77px;
}

.hiddenWinterHexSVG {
	width: 100%;
	height: 100%;
}

.hiddenWinterHexPolygon {
	stroke: black;
	stroke-width: 8;
}

.playerItemsDiv {
	border: 2px solid black;
	background-color: antiquewhite;
	width: fit-content;
	height: fit-content;
	width: 185px;
	box-sizing: border-box;
}

.meepleImgNoDiv {
	height: 50px;
	width: 50px;
	vertical-align: middle;
}

.skillTileImgNoDiv {
	height: 50px;
	width: 50px;
	vertical-align: middle;
}

.resImgNoDiv {
	height: 50px;
	width: 35px;
	vertical-align: middle;
}

.meepleImgAndNumberDiv {
	display: inline-block;
	height: 50px;
	width: 50px;
	box-sizing: border-box;
	position: relative;
	margin-right: 5px;
	margin-top: 5px;
}

.meepleImgDiv {
	box-sizing: border-box;
	position: absolute;
	bottom: 0px;
	height: 50px;
	width: 50px;
}

.purpleMeepleDiv {
	vertical-align: middle;
	margin-top: 3px;
}

.meepleImg {
	box-sizing: border-box;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
	padding: 0px;
	position: absolute;
	left: 0;
	width: 100%;
	object-fit: contain;
	/* Important for scaling */
	bottom: 0px;
}

.meepleImgHiddenInfo2 {
	box-sizing: border-box;
	padding: 0px;
	position: absolute;
	left: 0;
	width: 100%;
	object-fit: contain;
	/* Important for scaling */
	bottom: 0px;
}

.meepleImgBlank {
	box-sizing: border-box;
	filter: drop-shadow(0.5px 0 0 black) drop-shadow(0 0.5px 0 black) drop-shadow(-0.5px 0 0 black) drop-shadow(0 -0.5px 0 black);
	padding: 0px;
	position: absolute;
	left: 0;
	width: 100%;
	bottom: 0px;
}

.selectableMeepleImg {
	filter: drop-shadow(4px 0 0 yellow) drop-shadow(0 4px 0 yellow) drop-shadow(-4px 0 0 yellow) drop-shadow(0 -4px 0 yellow);
}

.selectableMeepleImg:hover {
	filter: drop-shadow(4px 0 0 lightgreen) drop-shadow(0 4px 0 lightgreen) drop-shadow(-4px 0 0 lightgreen) drop-shadow(0 -4px 0 lightgreen) !important;
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

/** Skill Tiles */
.skillTileImgAndNumberDiv {
	display: inline-block;
	position: relative;
	box-sizing: border-box;
	height: 50px;
	width: 50px;
	position: relative;
	border: 2px solid black;
	margin-right: 2.5px;
	margin-left: 2.5px;
}

.selectableSkillTileImg {
	box-sizing: border-box;
	height: 52px;
	width: 52px;
	border: 4px solid yellow;
}

.selectableSkillTileImg:hover {
	box-sizing: border-box;
	border: 4px solid lightgreen;
}

.skillTileImgDiv {
	width: 50px;
	height: 50px;
	box-sizing: border-box;
	position: absolute;
	bottom: 0px;
}

.skillTileImg {
	padding: 0px;
	position: absolute;
	left: 0;
	width: 46px;
	object-fit: contain;
	/* Important for scaling */
	bottom: 0px;
}

.skillTileNumberDiv {
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
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	pointer-events: none;
}

/** CONTRACTS */
.contractDiv {
	display: inline-block;
	height: 50px;
	width: 80px;
	position: relative;
	margin-right: 5px;
}

.contractSVG {
	width: 100%;
}

.contractPath {
	fill: black;
	fill-opacity: 0;
	stroke: black;
	stroke-width: 2;
	stroke-linecap: butt;
	stroke-linejoin: miter;
	stroke-opacity: 1;
}

.contractPathSeletable {
	stroke: yellow;
}

.contractPathSeletable:hover {
	stroke: lightgreen;
}

/*** RESOURCES DURING FINAL SCORING */

.resImgAndNumberDiv {
	display: inline-block;
	height: 50px;
	/*width: 50px;*/
	position: relative;
	margin-left: 5px;
	margin-right: 5px;
}

.resImgDiv {
	width: 100%;
	height: 100%;
}

.resImg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
	padding: 0px;
}

.selectableResImg {
	filter: drop-shadow(-2px -2px 0 yellow) drop-shadow(2px 2px 0 yellow) drop-shadow(-2px 2px 0 yellow) drop-shadow(2px -2px 0 yellow);
}

.selectableResImg:hover {
	filter: drop-shadow(-2px -2px 0 lightgreen) drop-shadow(2px 2px 0 lightgreen) drop-shadow(-2px 2px 0 lightgreen) drop-shadow(2px -2px 0 lightgreen) !important;
}

.resNumberDiv {
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
</style>
