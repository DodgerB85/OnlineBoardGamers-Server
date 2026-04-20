<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 *
 *
 */

import * as rf from "../js/KFWreference"
import * as controller from "../js/KFWcontroller"
import * as model from "../js/KFWmodel"
//import * as funcs from '../js/KFWfuncs'
import * as view from "../js/KFWview"
import * as village from "../js/KFWvillage"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

import { ref, computed } from "vue"
const polygonRef = ref(null)

const props = defineProps(["playerIndexProp"])

const showPopupFunc = (event, tile) => {
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

const computedScoringData = computed(() => {
	let hasBoat3b = village.doesPlayerHaveTileID(props.playerIndexProp, rf.TILE_SUMMER_BOAT3_B)

	let totalScore = 0
	let ret = {}
	ret.needsItems = []
	ret.needsAction = []
	ret.autoVP = []
	ret.autoVPscore = 0
	ret.manualActionScore = 0
	ret.VPonly = []
	ret.VPonlyScore = 0
	ret.scoreUpgradedOnly = []
	ret.scoreUpgradeOnlyPoint = 0
	// Go through all village tiles, and add to correct section
	for (let i = 0; i < store.players[props.playerIndexProp].villageTiles.length; i++) {
		let tile = store.players[props.playerIndexProp].villageTiles[i]
		// Tiles Needing Items
		if (rf.TILE_SCORE_REQUIRES_ITEMS.includes(tile.tileID[tile.upgraded])) {
			ret.needsItems.push(tile)
			// Base Winter
			if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_JEWELLER_A) {
				if (hasBoat3b) {
					tile.itemSet = [rf.RES_ANY]
					tile.autoSelect = false
				}
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_CRAFTMENS_GUILD_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_WATERMILL_A) {
				if (hasBoat3b) {
					tile.itemSet = [rf.RES_ANY]
					tile.autoSelect = false
				}
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_MERCERS_GUILD_A) {
				if (hasBoat3b) {
					tile.itemSet = [rf.RES_ANY, rf.RES_ANY, rf.RES_ANY]
					tile.autoSelect = false
				}
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_WINDMILL_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_SCRIBES_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_SCHOLAR_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_VILLAGE_HALL_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_KEY_MARKET_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_KEY_GUILD_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_APOTHACARY_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			}
			// Base Boat
			else if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_WHITE_WIND_B) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			}
			// Promo Tiles
			else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_EMPORIUM_A) {
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_MONUMENT_A) {
				if (hasBoat3b) tile.itemSet = [rf.RES_ANY, rf.RES_ANY, rf.RES_ANY]
				totalScore += tile.pointsPerSet * tile.completedSets.length
			}
		}
		// Tiles needing an action
		else if (rf.TILE_VP_MANUAL_ACTION.includes(tile.tileID[tile.upgraded])) {
			ret.needsAction.push(tile)
			if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_SEA_BASTION_B) {
				ret.manualActionScore += tile.victoryPoints[tile.upgraded]
				totalScore += tile.victoryPoints[tile.upgraded]
				tile.buttonText = "Select tile to start Route"
				if (store.context.seaBastionScoringRoute.length > 0) tile.buttonText = "Restart Route"
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_DELIVERY_MAN_A) {
				ret.manualActionScore += tile.victoryPoints[tile.upgraded]
				totalScore += tile.victoryPoints[tile.upgraded]
				tile.buttonText = "Select tile to Start Delivery Man"
				if (store.context.seaBastionScoringRoute.length > 0) tile.buttonText = "Restart Delivery Man Route"
			}
		}
		// VP that isn't fixed but can be auto-scored
		else if (rf.TILE_SCORE_AUTO_PROCESS.includes(tile.tileID[tile.upgraded])) {
			ret.autoVP.push(tile)
			if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_SEA_BREESE_B) {
				let boatChain = rf.getBreeseScore(tile.victoryPoints[tile.upgraded], false)
				if (boatChain === 1) tile.itemMessage = "1 tile in chain"
				else if (boatChain > 1) tile.itemMessage = boatChain + " tiles in chain"
				else tile.itemMessage = "No tiles in chain"
			}
			ret.autoVPscore += tile.victoryPoints[tile.upgraded]
			totalScore += tile.victoryPoints[tile.upgraded]
		}
		// VP only tiles
		else if (rf.TILE_VP_ONLY.includes(tile.tileID[tile.upgraded])) {
			ret.VPonly.push(tile)
			ret.VPonlyScore += tile.victoryPoints[tile.upgraded]
			totalScore += tile.victoryPoints[tile.upgraded]
			// Extensions score upgrade points again
			if (tile.extension >= 0) {
				ret.VPonlyScore += tile.victoryPoints[tile.upgraded]
				totalScore += tile.victoryPoints[tile.upgraded]
			}
		}
		// score Upgrade Only Points
		else if (rf.TILES_FIXED_SCORING_UPGRADED_ONLY.includes(tile.tileID[tile.upgraded])) {
			ret.scoreUpgradedOnly.push(tile)
			ret.scoreUpgradeOnlyPoint += tile.victoryPoints[tile.upgraded]
			totalScore += tile.victoryPoints[tile.upgraded]
			// Extensions score upgrade points again
			if (tile.extension >= 0) {
				ret.scoreUpgradeOnlyPoint += tile.victoryPoints[tile.upgraded]
				totalScore += tile.victoryPoints[tile.upgraded]
			}
		}
		// No score, but you get a different action
		/*else if (rf.TILE_FINAL_SCORE_ACTION.includes(tile.tileID[tile.upgraded])) {
			ret.nonScoringAction.push(tile)
		}*/
	}
	ret.computedContracts = []
	let hasWhiteWind2b = village.doesPlayerHaveTileID(props.playerIndexProp, rf.TILE_M_BOAT_WHITE_WIND_2_B)
	let hasMuleteer = village.doesPlayerHaveTileID(props.playerIndexProp, rf.TILE_M_WINTER_MULETEER)
	// Go through contracts
	for (let i = 0; i < store.players[props.playerIndexProp].hiddenContracts.length; i++) {
		let contract = store.players[props.playerIndexProp].hiddenContracts[i]
		if (contract.completed) {
			let sc = 7
			if (hasWhiteWind2b) sc = 10
			contract.score = sc
		} else {
			contract.score = 0
			if (hasMuleteer) contract.score = 3
			// If you have boat3b, you can use any res
			if (hasBoat3b) {
				for (let j = 0; j < contract.requiredResources.length; j++) {
					contract.requiredResources[j] = rf.RES_ANY
				}
			}
		}
		ret.computedContracts.push(contract)
		totalScore += contract.score
	}

	// Add in 1 vp/gold
	totalScore += store.players[props.playerIndexProp].villageTiles[0].resources[rf.GOLD]

	ret.totalScore = totalScore

	return ret
})

function getNewItemSetClass(tile) {
	if (!personal.canPlay()) return ""
	if (store.context.action !== rf.ACT_CHOOSE_SCORING_AREAS) return ""
	if (tile.tileItemType === rf.TILE_ITEM_TYPE_MEEPLES) {
		// If it's a meeple match, and the match has been set, it becomes an auto action
		if (tile.itemSet[0] === rf.MEEPLE_ANY_MATCH && tile.completedSets.length > 0) {
			let setToCheck = tile.completedSets[0]

			if (model.resourceCheck(controller.currentPlayerIndex(), setToCheck, [], [], -1) !== 9) return "unselectable"
		}

		if (model.resourceCheck(controller.currentPlayerIndex(), tile.itemSet, [], [], -1) === 9) return "selectable"
		return "unselectable"
	}
	if (tile.tileItemType === rf.TILE_ITEM_TYPE_SKILLS) {
		let setToCheck = [...tile.itemSet]
		if (tile.itemSet[0] === rf.SKILL_ANY_MATCH && tile.completedSets.length > 0) setToCheck = tile.completedSets[0]
		if (model.resourceCheck(controller.currentPlayerIndex(), [], setToCheck, [], -1) === 9) return "selectable"
		return "unselectable"
	}
	if (tile.tileItemType === rf.TILE_ITEM_TYPE_RES) {
		if (model.resourceCheck(controller.currentPlayerIndex(), [], [], tile.itemSet, controller.currentPlayerObj().villageTiles[0].id) === 9) return "selectable"
		return "unselectable"
	}
	return "unselectable"
}

function getContractClass(contract) {
	// Compeleted, dark green
	if (contract.completed) return "darkGreen"
	if (store.context.action !== rf.ACT_CHOOSE_SCORING_AREAS) return ""
	if (!personal.canPlay()) return ""
	// Incomplete but doable, selectable
	if (model.resourceCheck(controller.currentPlayerIndex(), contract.requiredMeeples, contract.requiredSkillTiles, contract.requiredResources, -1) === 9) return "selectable"
	return "unselectable"
}

function cancelContractSet(contract) {
	if (store.context.action !== rf.ACT_CHOOSE_SCORING_AREAS) return
	if (!contract.completed) return
	// Refund the items
	for (let i = 0; i < contract.chosenMeeples.length; i++) {
		controller.currentPlayerObj().hiddenMeeples[contract.chosenMeeples[i]] += 1
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
		let index2 = store.context.endTurnActions[index][2].indexOf(contract.chosenMeeples[i])
		store.context.endTurnActions[index][2].splice(index2, 1)
	}
	for (let i = 0; i < contract.chosenSkillTiles.length; i++) {
		controller.currentPlayerObj().hiddenSkillTiles[contract.chosenSkillTiles[i]] += 1
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
		let index2 = store.context.endTurnActions[index][2].indexOf(contract.chosenSkillTiles[i])
		store.context.endTurnActions[index][2].splice(index2, 1)
	}
	for (let i = 0; i < contract.chosenResources.length; i++) controller.currentPlayerObj().villageTiles[0].resources[contract.chosenResources[i]] += 1
	// Remove the set
	contract.completed = false
	contract.chosenMeeples.splice(0)
	contract.chosenSkillTiles.splice(0)
	contract.chosenResources.splice(0)
}

function clickedContract(contract) {
	if (!personal.canPlay()) return
	if (store.context.action !== rf.ACT_CHOOSE_SCORING_AREAS) return
	if (contract.completed) return
	if (model.resourceCheck(controller.currentPlayerIndex(), contract.requiredMeeples, contract.requiredSkillTiles, contract.requiredResources, -1) !== 9) return
	// Copy the contract to required items
	store.context.itemsRequired.meeplesReq = [...contract.requiredMeeples]
	store.context.itemsRequired.skillsReq = [...contract.requiredSkillTiles]
	store.context.itemsRequired.resReq = [...contract.requiredResources]
	// Now remove the auto picks
	model.deductAutoItemPicks(controller.currentPlayerObj().villageTiles[0].id)

	// Check if there's anything left to pick
	// Check if all three arrays are empty
	const contractComplete = store.context.itemsRequired.meeplesReq.length === 0 && store.context.itemsRequired.skillsReq.length === 0 && store.context.itemsRequired.resReq.length === 0
	if (contractComplete) {
		// Complete the contract
		contract.chosenMeeples = [...store.context.itemsChosen.meeplesChosen]
		contract.chosenSkillTiles = [...store.context.itemsChosen.skillsChosen]
		contract.chosenResources = [...store.context.itemsChosen.resChosen]
		contract.completed = true
		store.clearContext()
		store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
		return
	}
	store.context.currentlyScoringContract_id = contract.id
	store.context.action = rf.ACT_CHOOSE_ITEMS
	store.context.action2 = rf.ACT_CHOOSE_CONTRACT_SCORING_ITEMS
}

function cancelItemSet(tile, idx) {
	if (!personal.canPlay()) return
	if (store.context.action !== rf.ACT_CHOOSE_SCORING_AREAS) return
	// Refund the items
	for (let i = 0; i < tile.completedSets[idx].length; i++) {
		if (tile.tileItemType === rf.TILE_ITEM_TYPE_MEEPLES) {
			controller.currentPlayerObj().hiddenMeeples[tile.completedSets[idx][i]] += 1
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
			let index2 = store.context.endTurnActions[index][2].indexOf(tile.completedSets[idx][i])
			store.context.endTurnActions[index][2].splice(index2, 1)
		} else if (tile.tileItemType === rf.TILE_ITEM_TYPE_SKILLS) {
			controller.currentPlayerObj().hiddenSkillTiles[tile.completedSets[idx][i]] += 1
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
			let index2 = store.context.endTurnActions[index][2].indexOf(tile.completedSets[idx][i])
			store.context.endTurnActions[index][2].splice(index2, 1)
		} else if (tile.tileItemType === rf.TILE_ITEM_TYPE_RES) controller.currentPlayerObj().villageTiles[0].resources[tile.completedSets[idx][i]] += 1
	}
	// Remove the set
	tile.completedSets.splice(idx, 1)
}

function clickedNewItemSet(tile) {
	if (!personal.canPlay()) return
	if (store.context.action !== rf.ACT_CHOOSE_SCORING_AREAS) return
	// If it's auto select, check for resources, deduct resources, and add the points
	if (tile.autoSelect) {
		if (tile.tileItemType === rf.TILE_ITEM_TYPE_MEEPLES) {
			if (model.resourceCheck(controller.currentPlayerIndex(), tile.itemSet, [], [], -1) !== 9) return
			// Now we know we can do it, so deduct the resources
			for (let i = 0; i < tile.itemSet.length; i++) {
				controller.currentPlayerObj().hiddenMeeples[tile.itemSet[i]] -= 1
				let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
				if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [tile.itemSet[i]]])
				else store.context.endTurnActions[index][2].push(tile.itemSet[i])
			}
			tile.completedSets.push([...tile.itemSet])
		} else if (tile.tileItemType === rf.TILE_ITEM_TYPE_SKILLS) {
			if (model.resourceCheck(controller.currentPlayerIndex(), [], tile.itemSet, [], -1) !== 9) return
			// Now we know we can do it, so deduct the resources
			for (let i = 0; i < tile.itemSet.length; i++) {
				controller.currentPlayerObj().hiddenSkillTiles[tile.itemSet[i]] -= 1
				let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
				if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [tile.itemSet[i]]])
				else store.context.endTurnActions[index][2].push(tile.itemSet[i])
			}
			tile.completedSets.push([...tile.itemSet])
		} else if (tile.tileItemType === rf.TILE_ITEM_TYPE_RES) {
			if (model.resourceCheck(controller.currentPlayerIndex(), [], [], tile.itemSet, controller.currentPlayerObj().villageTiles[0].id) !== 9) return
			// Now we know we can do it, so deduct the resources
			let newItemSet = []
			for (let i = 0; i < tile.itemSet.length; i++) {
				controller.currentPlayerObj().villageTiles[0].resources[tile.itemSet[i]] -= 1
				let useGold = false
				// If its < 0, use the gold instead
				if (controller.currentPlayerObj().villageTiles[0].resources[tile.itemSet[i]] < 0) {
					let deficit = controller.currentPlayerObj().villageTiles[0].resources[tile.itemSet[i]] * -1
					controller.currentPlayerObj().villageTiles[0].resources[rf.GOLD] -= deficit
					controller.currentPlayerObj().villageTiles[0].resources[tile.itemSet[i]] = 0
					// Swap it out on the new tile too
					useGold = true
				}
				// Move them to the new tile
				if (useGold) {
					tile.resources[rf.GOLD] += 1
					newItemSet.push(rf.GOLD)
				} else {
					tile.resources[tile.itemSet[i]] += 1
					newItemSet.push(tile.itemSet[i])
				}
			}

			tile.completedSets.push([...newItemSet])
		}
	}
	// If it's NOT auto select, set up the correct highlights
	else if (!tile.autoSelect) {
		if (tile.tileItemType === rf.TILE_ITEM_TYPE_MEEPLES) {
			if (model.resourceCheck(controller.currentPlayerIndex(), tile.itemSet, [], [], -1) !== 9) return
			// If it's a meeple match, and the match has been set, it becomes an auto action
			if (tile.itemSet[0] === rf.MEEPLE_ANY_MATCH && tile.completedSets.length > 0) {
				let setToCheck = tile.completedSets[0]
				if (model.resourceCheck(controller.currentPlayerIndex(), setToCheck, [], [], -1) !== 9) return
				// Now we know we can do it, so deduct the resources
				for (let i = 0; i < setToCheck.length; i++) {
					controller.currentPlayerObj().hiddenMeeples[setToCheck[i]] -= 1
					let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
					if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [setToCheck[i]]])
					else store.context.endTurnActions[index][2].push(setToCheck[i])
				}
				tile.completedSets.push([...setToCheck])
				return
			}

			if (tile.itemSet.includes(rf.MEEPLE_ANY)) store.context.coreMeepleColour = rf.MEEPLE_ANY
			else if (tile.itemSet.includes(rf.MEEPLE_ANY_MATCH)) {
				store.context.coreMeepleColour = rf.MEEPLE_ANY
				if (tile.completedSets.length > 0) store.context.coreSkillType = tile.completedSets[0][0]
			}
			store.context.currentItemSet.splice(0)
			store.context.remainingItemSet = [...tile.itemSet]
			store.context.selectedTile = tile
			store.context.action = rf.ACT_CHOOSE_MEEPLES
			//store.context.selectedTile = controller.currentPlayerObj().villageTiles.find((t) => t.id === tile.id)
		} else if (tile.tileItemType === rf.TILE_ITEM_TYPE_SKILLS) {
			if (model.resourceCheck(controller.currentPlayerIndex(), [], tile.itemSet, [], -1) !== 9) return
			// If it's a skill match, and the match has been set, it becomes an auto action
			if (tile.itemSet[0] === rf.SKILL_ANY_MATCH && tile.completedSets.length > 0) {
				let setToCheck = tile.completedSets[0]
				if (model.resourceCheck(controller.currentPlayerIndex(), [], setToCheck, [], -1) !== 9) return
				// Now we know we can do it, so deduct the resources
				for (let i = 0; i < setToCheck.length; i++) {
					controller.currentPlayerObj().hiddenSkillTiles[setToCheck[i]] -= 1
					let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
					if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [setToCheck[i]]])
					else store.context.endTurnActions[index][2].push(setToCheck[i])
				}
				tile.completedSets.push([...setToCheck])
				return
			}
			if (tile.itemSet.includes(rf.SKILL_ANY)) store.context.coreSkillType = rf.SKILL_ANY
			else if (tile.itemSet.includes(rf.SKILL_ANY_MATCH)) {
				store.context.coreSkillType = rf.SKILL_ANY
				if (tile.completedSets.length > 0) {
					store.context.coreSkillType = tile.completedSets[0][0]
				}
			}
			store.context.currentItemSet.splice(0)
			store.context.remainingItemSet = [...tile.itemSet]
			store.context.selectedTile = tile
			store.context.action = rf.ACT_CHOOSE_SKILL_TILE_FOR_SCORING
		} else if (tile.tileItemType === rf.TILE_ITEM_TYPE_RES) {
			if (model.resourceCheck(controller.currentPlayerIndex(), [], [], tile.itemSet, controller.currentPlayerObj().villageTiles[0].id) !== 9) return
			// If it's a skill match, and the match has been set, it becomes an auto action
			/*if (tile.itemSet[0] === rf.SKILL_ANY_MATCH && tile.completedSets.length > 0) {
				let setToCheck = tile.completedSets[0]
				if (model.resourceCheck(controller.currentPlayerIndex(), [], setToCheck, [], -1) !== 9) return
				// Now we know we can do it, so deduct the resources
				for (let i = 0; i < setToCheck.length; i++) {
					controller.currentPlayerObj().hiddenSkillTiles[setToCheck[i]] -= 1
				}
				tile.completedSets.push([...setToCheck])
				return
			}*/
			if (tile.itemSet.includes(rf.RES_ANY)) store.context.coreResType = rf.RES_ANY
			else if (tile.itemSet.includes(rf.RES_ANY_MATCH)) {
				store.context.coreResType = rf.RES_ANY
				if (tile.completedSets.length > 0) {
					store.context.coreResType = tile.completedSets[0][0]
				}
			}
			store.context.currentItemSet.splice(0)
			store.context.remainingItemSet = [...tile.itemSet]
			store.context.selectedTile = tile
			store.context.action = rf.ACT_CHOOSE_RES_FOR_SCORING
		}
	}
}

function setupManualScoring(tileID) {
	if (tileID === rf.TILE_BOAT_SEA_BASTION_B) {
		// Reset score
		store.context.seaBastionScoringRoute.splice(0)
		let startTile = controller.currentPlayerObj().villageTiles.find((tile) => tile.tileID[tile.upgraded] === rf.TILE_BOAT_SEA_BASTION_B)
		startTile.victoryPoints[startTile.upgraded] = 0
		startTile.scoredRoute.splice(0)
		// Highlight all tiles to select start point
		store.context.action = rf.ACT_SCORE_SEA_BASTION
	} else if (tileID === rf.TILE_WINTER_DELIVERY_MAN_A) {
		let startTile = controller.currentPlayerObj().villageTiles.find((tile) => tile.tileID[tile.upgraded] === rf.TILE_WINTER_DELIVERY_MAN_A)
		startTile.victoryPoints[startTile.upgraded] = 0
		startTile.scoredRoute.splice(0)
		store.context.deliveryManScoringRoute.splice(0)
		// highlight the delivery tile
		store.context.action = rf.ACT_SCORE_DELIVERY_MAN
	}
}

function itemTypeNumToString(itemNum) {
	if (itemNum === rf.TILE_ITEM_TYPE_MEEPLES) return "meeple"
	if (itemNum === rf.TILE_ITEM_TYPE_SKILLS) return "skillTile"
	if (itemNum === rf.TILE_ITEM_TYPE_RES) return "res"
	else {
		alert(`Error finding items type: ${itemNum}`)
	}
}
</script>

<template>
	<template v-if="store.context.action === rf.ACT_CHOOSE_ITEMS">
		You need:
		<img v-for="(meeple, idx) in store.context.itemsRequired.meeplesReq" :key="idx" class="itemsetImg" :src="view.getImage('meeple_' + meeple)" />
		<img v-for="(skill, idx) in store.context.itemsRequired.skillsReq" :key="idx" class="itemsetImg" :src="view.getImage('skillTile_' + skill)" />
		<img v-for="(res, idx) in store.context.itemsRequired.resReq" :key="idx" class="itemsetImg" :src="view.getImage('res_' + res)" />
		You have chosen:
		<img v-for="(meeple, idx) in store.context.itemsChosen.meeplesChosen" :key="idx" class="itemsetImg" :src="view.getImage('meeple_' + meeple)" />
		<img v-for="(skill, idx) in store.context.itemsChosen.skillsChosen" :key="idx" class="itemsetImg" :src="view.getImage('skillTile_' + skill)" />
		<img v-for="(res, idx) in store.context.itemsChosen.resChosen" :key="idx" class="itemsetImg" :src="view.getImage('res_' + res)" />
	</template>
	<template v-if="store.context.action === rf.ACT_CHOOSE_MEEPLES || store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_SCORING || store.context.action === rf.ACT_CHOOSE_RES_FOR_SCORING">
		You need:
		<img v-for="(item, idx) in store.context.remainingItemSet" :key="idx" class="itemsetImg" :src="view.getImage(itemTypeNumToString(store.context.selectedTile.tileItemType) + '_' + item)" />
		You have chosen:
		<img v-for="(item, idx) in store.context.currentItemSet" :key="idx" class="itemsetImg" :src="view.getImage(itemTypeNumToString(store.context.selectedTile.tileItemType) + '_' + item)" />
	</template>
	<div id="playerTableDiv">
		<table id="playerTable">
			<thead>
				<tr>
					<th><b>Tile</b></th>
					<th>Items</th>
					<th>Score</th>
				</tr>
			</thead>
			<tbody>
				<!-- 1 vp / gold -->
				<tr>
					<td class="sectionHeader" colspan="3">1 VP for any remaining gold</td>
				</tr>
				<tr>
					<td>
						1 VP / gold
						<br />
						(Scored Automatically for any unused gold)
					</td>
					<td>
						<div class="completedItemSetDiv" v-for="(res, idx) in store.players[playerIndexProp].villageTiles[0].resources[rf.GOLD]" :key="idx">
							<img class="itemsetImg" :src="view.getImage('res_' + rf.GOLD)" />
						</div>
					</td>
					<td>
						{{ store.players[playerIndexProp].villageTiles[0].resources[rf.GOLD] }}
					</td>
				</tr>
				<!-- REQUIRES ITEMS -->
				<tr>
					<td class="sectionHeader" colspan="3">Score for Items</td>
				</tr>
				<tr v-for="(tile, idx) in computedScoringData.needsItems" :key="idx">
					<td>
						<div class="hexDiv">
							<svg class="hexSVG" viewBox="-420 -348 840 696">
								<polygon class="hexPolygon" @mouseover="showPopupFunc($event, tile)" @mouseout="hidePopup()" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${tile.gfx[tile.upgraded]})`" />
							</svg>
						</div>
					</td>
					<td>
						<div class="completedItemSetDiv" v-for="(completedItemSet, idx) in tile.completedSets" :key="idx">
							<button v-if="personal.canPlay()" class="cancelItemsButton" @click="cancelItemSet(tile, idx)">X</button>
							<img v-for="(item, idx2) in completedItemSet" :key="idx2" class="itemsetImg" :src="view.getImage(itemTypeNumToString(tile.tileItemType) + '_' + item)" />
						</div>
						<div v-if="personal.canPlay()" class="newItemSetDiv" @click="clickedNewItemSet(tile)" :class="getNewItemSetClass(tile)">
							<img v-for="(item, idx) in tile.itemSet" :key="idx" class="itemsetImg" :src="view.getImage(itemTypeNumToString(tile.tileItemType) + '_' + item)" />
						</div>
					</td>
					<td>
						{{ tile.pointsPerSet * tile.completedSets.length }}
						<br />
						{{ tile.pointsPerSet }} / set
					</td>
				</tr>
				<!-- REQUIRES ITEMS - CONTRACT -->
				<template v-if="store.players[playerIndexProp].hiddenContracts.length > 0">
					<tr>
						<td class="sectionHeader" colspan="3">Score for Contracts</td>
					</tr>
					<tr v-for="(contract, idx) in computedScoringData.computedContracts" :key="idx">
						<td>
							<div class="contractDiv">
								<svg viewBox="77 131.5 55.5 34" class="contractSVG">
									<image width="52.916668" height="31.75" :xlink:href="view.getImage(contract.gfx)" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
									<path :d="rf.CONTRACT_PATH_D" class="contractPath" />
								</svg>
							</div>
						</td>
						<td>
							<div v-if="!contract.completed && personal.canPlay()" :class="[{ newItemSetDiv: !contract.completed }, { completedContractDiv: contract.completed }, getContractClass(contract)]" @click="clickedContract(contract)">
								<img v-for="(meeple, idx) in contract.requiredMeeples" :key="idx" class="contractMeepleImg itemShadow" :src="view.getImage('meeple_' + String(meeple))" alt="Worker" />
								<img v-for="(skillTile, idx) in contract.requiredSkillTiles" :key="idx" class="contractSkillTileImg itemShadow" :src="view.getImage('skillTile_' + String(skillTile))" alt="Skill Tile" />
								<img v-for="(resource, idx) in contract.requiredResources" :key="idx" class="contractResImg" :src="view.getImage('res_' + String(resource))" alt="Res" />
							</div>
							<div v-else-if="contract.completed" :class="[{ newItemSetDiv: !contract.completed }, { completedContractDiv: contract.completed }, getContractClass(contract)]" @click="clickedContract(contract)">
								<img v-for="(meeple, idx) in contract.chosenMeeples" :key="idx" class="contractMeepleImg itemShadow" :src="view.getImage('meeple_' + String(meeple))" alt="Worker" />
								<img v-for="(skillTile, idx) in contract.chosenSkillTiles" :key="idx" class="contractSkillTileImg itemShadow" :src="view.getImage('skillTile_' + String(skillTile))" alt="Skill Tile" />
								<img v-for="(resource, idx) in contract.chosenResources" :key="idx" class="contractResImg" :src="view.getImage('res_' + String(resource))" alt="Res" />
								<button v-if="personal.canPlay()" class="cancelItemsButton" @click.stop="cancelContractSet(contract)">X</button>
							</div>
						</td>
						<td>
							{{ contract.score }}
							<br />
							{{ 7 }} / set
						</td>
					</tr>
				</template>
				<!-- Manual Actions -->
				<template v-if="computedScoringData.needsAction.length > 0">
					<tr>
						<td class="sectionHeader" colspan="3">Manual Scoring</td>
					</tr>
					<tr v-for="(tile, idx) in computedScoringData.needsAction" :key="idx">
						<td>
							<div class="hexDiv">
								<svg class="hexSVG" viewBox="-420 -348 840 696">
									<polygon class="hexPolygon" @mouseover="showPopupFunc($event, tile)" @mouseout="hidePopup()" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${tile.gfx[tile.upgraded]})`" />
								</svg>
							</div>
						</td>
						<td>
							<button v-if="personal.canPlay()" class="actionsLineButton" @click="setupManualScoring(tile.tileID[tile.upgraded])">{{ tile.buttonText }}</button>
						</td>
						<td>{{ tile.victoryPoints[tile.upgraded] }}</td>
					</tr>
				</template>
				<!-- Auto VP tiles-->
				<tr>
					<td class="sectionHeader" colspan="3">VP Tiles - Auto Scoring</td>
				</tr>
				<tr v-for="(tile, idx) in computedScoringData.autoVP" :key="idx">
					<td>
						<div class="hexDiv">
							<svg class="hexSVG" viewBox="-420 -348 840 696">
								<polygon class="hexPolygon" @mouseover="showPopupFunc($event, tile)" @mouseout="hidePopup()" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${tile.gfx[tile.upgraded]})`" />
							</svg>
						</div>
					</td>
					<td>{{ tile.itemMessage }}</td>
					<td>{{ tile.victoryPoints[tile.upgraded] }}</td>
				</tr>
				<!-- VP only tiles-->
				<tr>
					<td class="sectionHeader" colspan="3">VP Tiles (no action)</td>
				</tr>
				<tr>
					<td>
						<div class="hexDiv" v-for="(tile, idx) in computedScoringData.VPonly" :key="idx">
							<svg class="hexSVG" viewBox="-420 -348 840 696">
								<polygon class="hexPolygon" @mouseover="showPopupFunc($event, tile)" @mouseout="hidePopup()" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${tile.gfx[tile.upgraded]})`" />
							</svg>
						</div>
					</td>
					<td>-</td>
					<td>{{ computedScoringData.VPonlyScore }}</td>
				</tr>
				<!-- TILES THAT SCORE WHEN UPGRADED ONLY-->
				<tr>
					<td class="sectionHeader" colspan="3">Upgraded Tiles</td>
				</tr>
				<tr>
					<td>
						<div class="hexDiv" v-for="(tile, idx) in computedScoringData.scoreUpgradedOnly" :key="idx">
							<svg class="hexSVG" viewBox="-420 -348 840 696">
								<polygon class="hexPolygon" @mouseover="showPopupFunc($event, tile)" @mouseout="hidePopup()" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${tile.gfx[tile.upgraded]})`" />
							</svg>
						</div>
					</td>
					<td>-</td>
					<td>{{ computedScoringData.scoreUpgradeOnlyPoint }}</td>
				</tr>
				<tr>
					<td colspan="3" id="totalScoreTD">Total Score: {{ computedScoringData.totalScore }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped>
#totalScoreTD {
	font-size: 20px;
	font-weight: bolder;
	background-color: lightgreen;
}
#playerTableDiv {
	min-width: 700px; /* Fixed width for the left div */
	width: fit-content;
	margin: auto;
	font-size: 15px;
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

#playerTable .sectionHeader {
	background-color: #5875f8;
	color: white;
}

.hexDiv {
	display: inline-block;
	vertical-align: middle;
	width: 150px;
	height: 125px;
}

.hexSVG {
	width: 100%;
	height: 100%;
}
.hexPolygon {
	stroke: black;
	stroke-width: 8;
}

.newItemSetDiv {
	border: 6px solid black;
	display: inline-block;
	padding: 5px;
}
.newItemSetDiv img {
	opacity: 0.5;
}
.completedItemSetDiv {
	border: 2px solid black;
	display: inline-block;
	padding: 5px;
	position: relative;
}

.completedContractDiv {
	border: 6px solid green;
	display: inline-block;
	padding: 5px;
	position: relative;
}

.itemsetImg {
	height: 40px;
}

.selectable {
	border-color: yellow;
}
.selectable:hover {
	border-color: lightgreen;
}
.unselectable {
	border-color: red;
}

.darkGreen {
	border-color: darkgreen;
}

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

.contractMeepleImg {
	height: 40px;
	width: 40px;
	margin-right: 2px;
}

.contractSkillTileImg {
	height: 40px;
	width: 40px;
	margin-right: 2px;
}

.contractResImg {
	height: 40px;
	margin-right: 2px;
}

.itemShadow {
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(1px -1px 0 black) drop-shadow(-1px -1px 0 black);
}

.cancelItemsButton {
	background-color: red;
	color: white;
	border: none;
	border-radius: 2px;
	width: 20px;
	height: 20px;
	font-size: 16px;
	font-weight: bold;
	position: absolute;
	top: 1px;
	right: 1px;
	cursor: pointer;
}

.cancelItemsButton:hover {
	background-color: darkred;
}
</style>
