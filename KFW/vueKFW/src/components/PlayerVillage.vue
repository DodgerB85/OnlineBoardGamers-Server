<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in KFWmap.js
 *
 *
 */

import * as rf from "../js/KFWreference"
import * as map from "../js/KFWmap"
import * as view from "../js/KFWview"
import * as controller from "../js/KFWcontroller"
import * as model from "../js/KFWmodel"
import * as village from "../js/KFWvillage"
import * as IO from "../backend/KFW_IO"

//import MapHighlights from './MapHighlights.vue'
import { ref, computed } from "vue"

const polygonRef = ref(null)
const showErrorPopup = ref(false)
const popupPosition = ref({ x: 0, y: 0 })
const mouseoverIndex = ref(null)

const handleMouseover = (index) => {
	if (store.context.newTileGhostData.id === -1) return
	mouseoverIndex.value = index
}

const handleMouseout = () => {
	if (store.context.newTileGhostData.id === -1) return
	mouseoverIndex.value = null
}

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

const props = defineProps(["playerIndexProp"])

const canvasRef = computed(() => (store.players[props.playerIndexProp].villageRefSize / 2400) * (162.5 / Math.min(store.players[props.playerIndexProp].villageCanvasSize[0], store.players[props.playerIndexProp].villageCanvasSize[1])))
const villageRefSizeRef = computed(() => store.players[props.playerIndexProp].villageRefSize)

function hexCenter(coord, raw, forRotationCenter) {
	//let p = map.hexToPixel(hex)
	//var M = this.orientation
	let refSize = store.players[props.playerIndexProp].villageRefSize
	let canvasSize = Math.min(store.players[props.playerIndexProp].villageCanvasSize[0], store.players[props.playerIndexProp].villageCanvasSize[1])
	var size = [(refSize / canvasSize) * 50, (refSize / canvasSize) * 50]

	let M = [3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0]

	var x = (M[0] * coord[0] + M[1] * [coord[1]]) * size[0]
	var y = (M[2] * coord[0] + M[3] * [coord[1]]) * size[1]
	let p = [x, y]

	if (forRotationCenter) return `${p[0].toFixed(0)},${p[1].toFixed(0)}`
	if (raw) return [parseFloat(p[0].toFixed(1)), parseFloat(p[1].toFixed(1))]
	return `translate(${p[0].toFixed(0)},${p[1].toFixed(0)})`
}

function getNewHexOptionFill(newCoord, newIdx) {
	if (store.context.newTileGhostData.id === -1) return "none"
	// If you are over the tile, return the gfx
	if (mouseoverIndex.value === newIdx) {
		return `url(#${store.context.newTileGhostData.gfx})`
	}
	// If you cannot add a tile there, return red
	let locationRet = village.isValidLocationforNewTile(props.playerIndexProp, store.context.newTileGhostData.id, newCoord, store.context.newTileGhostData.rotation)
	if (locationRet === 0) return "red"
	if (locationRet === 2) return "orange"

	// Otherwise, return yellow
	return "yellow"
}

function localAddTileToVillage(tile_id, rotation, newCoord) {
	if (!tile_id && tile_id !== 0) return
	if (tile_id === -1) return
	//let placementAllowed = village.isValidLocationforNewTile(controller.currentPlayerIndex(), tile_id, newCoord)
	//if (!placementAllowed) {
	// Calculate the position based on the mouse/touch event
	/*popupPosition.value = { x: event.clientX, y: event.clientY - 60 }

		// Show the error popup
		showErrorPopup.value = true

		clearTimeout(errorInterval)
		// Hide the error popup after 2 seconds
		errorInterval = setTimeout(() => {
			showErrorPopup.value = false
		}, 1000)*/
	//} else
	village.addTileToVillage(tile_id, rotation, newCoord, store.context.newTileGhostData.upgraded)
}

// NB idx is index in the array of the tile you're rotating - set this to selected
function localRotatePendingTile(tile, dir, idx) {
	if (controller.currentPlayerIndex() === props.playerIndexProp && personal.canPlay()) {
		store.context.newTileGhostData.selectedIndexInpendingVillageTiles = idx
		store.context.newTileGhostData.id = tile.id
		store.context.newTileGhostData.rotation = tile.rotation
		store.context.newTileGhostData.gfx = tile.gfx[tile.upgraded]
		store.context.newTileGhostData.upgraded = tile.upgraded

		let newRot = model.rotateTileMultipleTimes(tile, dir, 1)
		if (tile.id === store.context.newTileGhostData.id) store.context.newTileGhostData.rotation = newRot

		//if (dir === 0) store.context.newTileGhostData.newSides.push(store.context.newTileGhostData.newSides.shift())
		//else store.context.newTileGhostData.newSides.unshift(store.context.newTileGhostData.newSides.pop())
		store.context.newTileGhostData.newSides = [...tile.sides]
		//for (let i=0;i<newRot;i++) {
		//	store.context.newTileGhostData.newSides.push(store.context.newTileGhostData.newSides.shift())
		//}
	}
}

function rotatePlacedTile(tile, dir) {
	if (controller.currentPlayerIndex() === props.playerIndexProp && personal.canPlay()) {
		let villageTile = controller.currentPlayerObj().villageTiles.find((t) => t.id === tile.id)
		model.rotateTileMultipleTimes(villageTile, dir, 1)
		// Now remove from boat chain warnings
		for (let i = 0; i < store.context.boatChainWarnings.length; i++) {
			if (store.context.boatChainWarnings[i].errorTile_ids.includes(tile.id)) {
				store.context.boatChainWarnings[i].errorTile_ids.splice(store.context.boatChainWarnings[i].errorTile_ids.indexOf(tile.id), 1)
			}
		}
		// And update again
		village.updateBoatChainWarnings(tile.coord, tile.id)

		// Add an undo point
		model.createUndoPoint()
	}
}

function getPendingVillageTilePolygonClass(tile) {
	if (controller.currentPlayerIndex() === props.playerIndexProp && personal.canPlay() && store.context.action === rf.ACT_ADD_TILES_TO_VILLAGE) {
		if (store.context.newTileGhostData.id === tile.id) return "lightGreen"
		return "selectablePendingTile"
	}
	return ""
}

function clickedPendingTile(tile, idx) {
	if (controller.currentPlayerIndex() === props.playerIndexProp && personal.canPlay()) {
		store.context.newTileGhostData.selectedIndexInpendingVillageTiles = idx
		store.context.newTileGhostData.id = tile.id
		store.context.newTileGhostData.rotation = tile.rotation
		store.context.newTileGhostData.gfx = tile.gfx[tile.upgraded]
		store.context.newTileGhostData.upgraded = tile.upgraded
		store.context.newTileGhostData.newSides = [...tile.sides]
	}
}

function clickedPlacedNewTile(tile) {
	if (controller.currentPlayerIndex() === props.playerIndexProp && personal.canPlay()) {
		// Remove tile from village,
		controller.currentPlayerObj().villageTiles = controller.currentPlayerObj().villageTiles.filter((t) => t.id !== tile.id)
		// Remove from boat chain warnings
		for (let i = 0; i < store.context.boatChainWarnings.length; i++) {
			if (store.context.boatChainWarnings[i].errorTile_ids.includes(tile.id)) {
				store.context.boatChainWarnings[i].errorTile_ids.splice(store.context.boatChainWarnings[i].errorTile_ids.indexOf(tile.id), 1)
			}
		}
		// add it to pending
		controller.currentPlayerObj().pendingVillageTiles.push(tile)

		//  set it as currently being placed tile
		map.setPlaceableTilesForPlayerVillge(controller.currentPlayerIndex())
		map.calculateCanvasSizeForPlayerVillage(controller.currentPlayerIndex(), true)

		store.context.action = rf.ACT_ADD_TILES_TO_VILLAGE

		// Add an undo point
		model.createUndoPoint()

		store.context.newTileGhostData.selectedIndexInpendingVillageTiles = controller.currentPlayerObj().pendingVillageTiles.length - 1
		store.context.newTileGhostData.id = tile.id
		store.context.newTileGhostData.rotation = tile.rotation
		store.context.newTileGhostData.gfx = tile.gfx[tile.upgraded]
		store.context.newTileGhostData.upgraded = tile.upgraded
		store.context.newTileGhostData.newSides = [...tile.sides]
	}
}

// NB THIS IS A COMPUTED TILE
function clickedPlayerVillageTile(event, tile) {
	// NB THIS IS A COMPUTED TILE
	// NB THIS IS A COMPUTED TILE
	if (IO.DEBUG_USERS.includes(personal.name)) console.log(JSON.stringify(tile))
	if (!tile.addHighlightOutlineYellow) return

	// BOAT 7A SELECTION
	if (store.context.action === rf.ACT_PLACE_BOAT_7A_RESOURCES) {
		let villageTile = controller.currentPlayerObj().villageTiles.find((t) => t.id === tile.id)
		store.context.resourceDepositTileID = villageTile.tileID[villageTile.upgraded]
		// Add the resources to that tile
		for (let i = 0; i < store.context.pendingBoat7Aresources.length; i++) {
			villageTile.resources[store.context.pendingBoat7Aresources[i]]++
		}
		store.context.pendingBoat7Aresources.splice(0)
		// Go back to main action
		if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
			// Check you are on a tile action
			if (store.context.selectedTile.id !== -1) {
				if (store.context.selectedTile.tileID[store.context.selectedTile.upgraded] === rf.TILE_M_SPRING_ASSAYER_B && store.context.action2 === rf.ACT_CHOOSE_CONTRACT) {
					// Update the destination before choosing a contract
					if (store.context.historyObj.length > 0 && store.context.historyObj[store.context.historyObj.length - 1][0] === -1) {
						store.context.historyObj[store.context.historyObj.length - 1][0] = tile.tileID[tile.upgraded]
					}
					store.context.action = rf.ACT_CHOOSE_CONTRACT
					store.context.action2 = rf.ACT_NONE
				} else if (store.context.action2 === rf.ACT_CONFIRM_END_TURN) {
					if (store.context.historyObj.length > 0 && store.context.historyObj[store.context.historyObj.length - 1][0] === -1) {
						store.context.historyObj[store.context.historyObj.length - 1][0] = tile.tileID[tile.upgraded]
						model.addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
						store.context.historyObj.splice(0)
					}
					store.context.action = rf.ACT_CONFIRM_END_TURN
					store.context.action2 = rf.ACT_NONE
				}
			}
			// Otherwise exchanging a contract pre turn bidding/action
			else {
				store.context.action = rf.ACT_NONE
				store.context.action2 = rf.ACT_NONE
			}
		}
		// Otherwise, assume you are adding a resource from a boat OR boat collection
		else if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) {
			let histEntry = store.history[store.history.length - 1]
			histEntry[3][histEntry[3].length - 1].push(9, tile.tileID[tile.upgraded])
			store.context.action = store.context.action2
			store.context.action2 = rf.ACT_NONE
		}
		return
	} // End boat 7A selection

	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		// Adding a bid
		if (store.context.action === rf.ACT_NONE) {
			if (model.canPutMeeplesOnTile(controller.currentPlayerIndex(), tile, false) !== 2) return
			// So now set up for selecting meeples
			//store.removeAllActiveHighlights()
			//store.context.villageTilesToHighlightGreen.push([props.playerIndexProp, tile.id])
			// SET THE MEEPLE POPUP POS HERE
			polygonRef.value = event.target // Set the polygonRef to the target element
			const rect = polygonRef.value.getBoundingClientRect()
			const xPos = Math.round(rect.left + window.scrollX)
			const yPos = Math.round(rect.top + window.scrollY)
			const width = Math.round(rect.width)
			let retPos = view.getMeeplePopupXY(xPos, yPos, width)
			store.meeplePopupSetter.xPos = retPos[0]
			store.meeplePopupSetter.yPos = retPos[1]

			let clickedTile = store.players[props.playerIndexProp].villageTiles.find((t) => t.id === tile.id)
			model.clickedtileArea(clickedTile, rf.TILE_ACTION_AREA)
		}
		// upgrading
		else if (store.context.action === rf.ACT_MOVE_AND_UPGRADE && store.context.remainingUpgrades > 0) {
			if (isAddingExtensionAllowed(tile)) {
				store.context.selectedTile = tile
				store.context.action = rf.ACT_CHOOSE_EXTENSION
				return
			}

			// If you have boat 3a, all res are wild for upgrading. So change any res req to RES_ANY
			if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT3_A)) {
				for (let i = 0; i < tile.upgradeCost.resCost.length; i++) {
					tile.upgradeCost.resCost[i] = rf.RES_ANY
				}
			}
			// Only highlighted yellow if you can upgrade. Therefore you have the res. So if the res are set, do the upgrade
			if (!tile.upgradeCost.meepleCost.includes(rf.MEEPLE_ANY) && !tile.upgradeCost.skillCost.includes(rf.SKILL_ANY) && !tile.upgradeCost.resCost.includes(rf.RES_ANY)) model.upgradeTile(controller.currentPlayerIndex(), tile.id)
			// If the "any" matches exactly the "have", you can upgrade
			else if (model.canAutoProcessResources(controller.currentPlayerIndex(), tile.upgradeCost.meepleCost, tile.upgradeCost.skillCost, tile.upgradeCost.resCost, tile.id)) model.upgradeTile(controller.currentPlayerIndex(), tile.id)
			// otherwise, you need to manually select the items
			else {
				store.context.itemsRequired.meeplesReq = tile.upgradeCost.meepleCost
				store.context.itemsRequired.skillsReq = tile.upgradeCost.skillCost
				store.context.itemsRequired.resReq = tile.upgradeCost.resCost
				store.context.itemsRequired.resTile_id = tile.id
				store.context.action2 = store.context.action
				store.context.action = rf.ACT_CHOOSE_ITEMS
			}
		} else if (store.context.action === rf.ACT_MOVE_RES && store.context.remainingMoves > 0) {
			let distIdx = store.context.villageDistanceHighlightData.slice(1).findIndex((subArray) => subArray.includes(tile.id))
			if (distIdx === -1) return
			let fromTile_id = store.context.villageDistanceHighlightData[0][0]
			let resToMove = store.context.villageDistanceHighlightData[0][1]
			model.moveRes(fromTile_id, tile.id, resToMove, distIdx)
		} else if (store.context.action === rf.ACT_CHOOSE_SORCERER_TILE) {
			store.context.historyObj.push(tile.tileID[tile.upgraded])
			store.context.selectedTile = tile.originalTile
			model.processTileAction(tile.originalTile)
		}
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		// PRE-FINAL-ACTIONS
		if (store.context.action === rf.ACT_FREE_UPGRADE) {
			let villageTile = controller.currentPlayerObj().villageTiles.find((t) => t.id === tile.id)
			villageTile.upgraded = 1
			model.addHistory(rf.HIST_FREE_UPGRADE, controller.currentPlayerIndex(), 0, [villageTile.tileID[0]])
			controller.finishPreFinalAction()
		} else if (store.context.action === rf.ACT_FREE_EXTENSION) {
			// Swap the actions, and remember action2 is free
			store.viewSettings.showFullExtensions = true
			store.context.selectedTile = tile
			store.context.action = rf.ACT_CHOOSE_EXTENSION
		}

		// Delivery Man
		else if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN) {
			store.context.deliveryManScoringRoute.push(tile.id)
			// Update the score
			let deliveryManTile = controller.currentPlayerObj().villageTiles.find((t) => t.tileID[t.upgraded] === rf.TILE_WINTER_DELIVERY_MAN_A)
			let score = [...new Set(store.context.deliveryManScoringRoute)].length
			deliveryManTile.victoryPoints[deliveryManTile.upgraded] = score
			let possibilities = model.findValidTileIdsForRouteSelection()
			if (possibilities.length === 0) {
				deliveryManTile.scoredRoute = [...store.context.deliveryManScoringRoute]
				store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
			}
		} else if (store.context.action === rf.ACT_SCORE_SEA_BASTION) {
			store.context.seaBastionScoringRoute.push(tile.id)
			// Update the score if you've made a loop
			if (store.context.seaBastionScoringRoute[0] === store.context.seaBastionScoringRoute[store.context.seaBastionScoringRoute.length - 1] && store.context.seaBastionScoringRoute.length > 1) {
				let seaBastionTile = controller.currentPlayerObj().villageTiles.find((t) => t.tileID[t.upgraded] === rf.TILE_BOAT_SEA_BASTION_B)
				seaBastionTile.scoredRoute = [...store.context.seaBastionScoringRoute]
				let score = [...new Set(store.context.seaBastionScoringRoute)].length
				seaBastionTile.victoryPoints[seaBastionTile.upgraded] = score
			}
			let possibilities = model.findValidTileIdsForRouteSelection()
			if (possibilities.length === 0) {
				store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
			}
		}
	}
}

function getMeeplesOnTileArray(tile) {
	let meeplesOnTile = []
	if (rf.TILE_NO_ACTION.includes(tile.tileID[0])) return []

	for (let i = 0; i < tile.meeplesOnTile.length; i++) {
		/*let meepleColours = []
		for (let j = 0; j < props.tileProp.meeplesOnTile[i][0]; j++) meepleColours.push(props.tileProp.coreMeepleColour)
		if (props.tileProp.meeplesOnTile[i].length > 1) {
			meepleColours.splice(0)
			for (let j = 1; j < props.tileProp.meeplesOnTile[i].length; j++) {
				meepleColours.push(props.tileProp.meeplesOnTile[i][j])
			}
		}*/

		meeplesOnTile.push([...tile.meeplesOnTile[i]])
	}
	return meeplesOnTile
}

function isAddingExtensionAllowed(tile) {
	if (!store.useMerchantsExpansion) return false
	if (!tile.upgradable) return false
	if (tile.upgraded !== 1) return false
	if (tile.extension >= 0) return false
	return true
}

const computedVillageTiles = computed(() => {
	// First, copy the tiles
	let computedVillageTiles = JSON.parse(JSON.stringify(store.players[props.playerIndexProp].villageTiles))
	let validSorcererIds = []
	if (store.context.action === rf.ACT_CHOOSE_SORCERER_TILE) validSorcererIds = village.getValidSorcererIds()
	for (let i = 0; i < computedVillageTiles.length; i++) {
		computedVillageTiles[i].originalTile = store.players[props.playerIndexProp].villageTiles[i]
		// Set the outline to nothing
		computedVillageTiles[i].addHighlightOutline = false
		// Check there is actually an action
		if (!rf.TILE_NO_ACTION.includes(computedVillageTiles[i].tileID[0]) || store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
			// First check for permanent green outline due to selected tile
			if (store.context.selectedTile.id === computedVillageTiles[i].id && store.context.action !== rf.ACT_MOVE_AND_UPGRADE && store.context.action2 !== rf.ACT_MOVE_AND_UPGRADE) {
				computedVillageTiles[i].addHighlightOutline = true
				computedVillageTiles[i].addHighlightOutlineGreen = true
			}
			// Next check if it should be selectable
			else if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS && store.context.action === rf.ACT_NONE) {
				if (model.canPutMeeplesOnTile(controller.currentPlayerIndex(), computedVillageTiles[i], false) === 2) {
					computedVillageTiles[i].addHighlightOutline = true
					computedVillageTiles[i].addHighlightOutlineYellow = true
				} else if (model.canPutMeeplesOnTile(controller.currentPlayerIndex(), computedVillageTiles[i], false) === 1) {
					computedVillageTiles[i].addHighlightOutline = true
					computedVillageTiles[i].addHighlightOutlineRed = true
				}
			}
		}
		/*** ANY VILLAGE HIGHLIGHTS */
		if (store.context.action === rf.ACT_CHOOSE_SORCERER_TILE) {
			if (validSorcererIds.includes(computedVillageTiles[i].id)) {
				if (!rf.TILE_NO_ACTION.includes(computedVillageTiles[i].tileID[0])) {
					// Next check if it should be selectable
					if (model.canPutMeeplesOnTile(controller.currentPlayerIndex(), computedVillageTiles[i], true) === 2) {
						computedVillageTiles[i].addHighlightOutline = true
						computedVillageTiles[i].addHighlightOutlineYellow = true
					} else if (model.canPutMeeplesOnTile(controller.currentPlayerIndex(), computedVillageTiles[i], true) === 1) {
						computedVillageTiles[i].addHighlightOutline = true
						computedVillageTiles[i].addHighlightOutlineRed = true
					}
				}
			}
		}
		/** ACTIVE PLAYER ONLY HIGHLIGHTS */
		if (props.playerIndexProp === controller.currentPlayerIndex()) {
			// highlight for upgrade
			if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS && store.context.action === rf.ACT_MOVE_AND_UPGRADE && store.context.remainingUpgrades > 0) {
				if (props.playerIndexProp === controller.currentPlayerIndex() && computedVillageTiles[i].upgradable) {
					// If you can afford it, highlight yellow, else red
					let tile = computedVillageTiles[i]
					if (tile.upgradable && tile.upgraded === 0) {
						// If you have boat 3a, all res are wild for upgrading. So change any res req to RES_ANY
						if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT3_A)) {
							for (let i = 0; i < tile.upgradeCost.resCost.length; i++) {
								tile.upgradeCost.resCost[i] = rf.RES_ANY
							}
						}
						if (model.resourceCheck(controller.currentPlayerIndex(), tile.upgradeCost.meepleCost, tile.upgradeCost.skillCost, tile.upgradeCost.resCost, tile.id) !== 9) {
							computedVillageTiles[i].addHighlightOutline = true
							computedVillageTiles[i].addHighlightOutlineRed = true
						} else {
							computedVillageTiles[i].addHighlightOutline = true
							computedVillageTiles[i].addHighlightOutlineYellow = true
						}
					}
					// Allow adding extensions
					else if (isAddingExtensionAllowed(computedVillageTiles[i])) {
						computedVillageTiles[i].addHighlightOutline = true
						computedVillageTiles[i].addHighlightOutlineYellow = true
					}
				}
			}
			// highlight for res move
			if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS && store.context.action === rf.ACT_MOVE_RES && store.context.remainingMoves > 0) {
				if (store.context.villageDistanceHighlightData.slice(1).some((subArray) => subArray.includes(computedVillageTiles[i].id))) {
					computedVillageTiles[i].addHighlightOutline = true
					computedVillageTiles[i].addHighlightOutlineYellow = true
				}
			}

			// VILLAGE EXPANSION PHASE
			if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) {
				if (store.context.newVillageTile_ids.includes(computedVillageTiles[i].id)) {
					let locationRet = village.isValidLocationforNewTile(props.playerIndexProp, computedVillageTiles[i].id, computedVillageTiles[i].coord, computedVillageTiles[i].rotation)
					if (locationRet === 0) {
						computedVillageTiles[i].addHighlightOutline = true
						computedVillageTiles[i].addHighlightOutlineRed = true
					} else if (locationRet === 1) {
						computedVillageTiles[i].addHighlightOutline = true
						computedVillageTiles[i].addHighlightOutlineYellow = true
					} else if (locationRet === 2) {
						computedVillageTiles[i].addHighlightOutline = true
						computedVillageTiles[i].addHighlightOutlineOrange = true
					}
				}
			}

			// Boat 7a res placement
			if (store.context.action === rf.ACT_PLACE_BOAT_7A_RESOURCES) {
				if (!rf.TILE_SUMMER_BOATS.includes(computedVillageTiles[i].tileID[0]) && computedVillageTiles[i].season !== rf.SEASON_BOAT_TILE) {
					computedVillageTiles[i].addHighlightOutline = true
					computedVillageTiles[i].addHighlightOutlineYellow = true
				}
			}

			// Final scoring - deliveryman / sea bastion
			if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
				if (store.context.tileIDsForPreFinalAction.length > 0 && store.context.tileIDsForPreFinalAction.includes(computedVillageTiles[i].tileID[computedVillageTiles[i].upgraded])) {
					computedVillageTiles[i].addHighlightOutline = true
					computedVillageTiles[i].addHighlightOutlineYellow = true
				} else if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN || store.context.action === rf.ACT_SCORE_SEA_BASTION) {
					if (model.findValidTileIdsForRouteSelection().includes(computedVillageTiles[i].id)) {
						computedVillageTiles[i].addHighlightOutline = true
						computedVillageTiles[i].addHighlightOutlineYellow = true
					}
				}
			}
		}

		// Set the gfx to display
		computedVillageTiles[i].gfxUsed = computedVillageTiles[i].gfx[computedVillageTiles[i].upgraded]
	}
	return computedVillageTiles
})

function clickedVillageImg(tile) {
	if (IO.DEBUG_USERS.includes(personal.name)) console.log(tile)
}

function isResSelectable(tile, resAmount, idx) {
	if (!personal.canPlay()) return false
	if (props.playerIndexProp !== controller.currentPlayerIndex()) return false
	// If final scoring and NOT home tile, then click to move to home tile and DEDUCT the 'on tne tile' score
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING && tile.season !== rf.SEASON_HOME_TILE) {
		// Only "score res already on tile res" should be selectable
		if (tile.action[0] !== rf.VP_RES_ON_TILE) return false
		return true
	}
	if (store.context.itemsRequired.resTile_id !== -1 && store.context.itemsRequired.resTile_id !== tile.id) return false
	if (resAmount <= 0) return false
	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
			if (store.context.itemsRequired.resReq.includes(rf.RES_ANY)) return true
			if (store.context.itemsRequired.resReq.includes(idx)) return true
			if (store.context.itemsRequired.resReq.length > 0 && idx === rf.GOLD) return true
		}
		if (store.context.action === rf.ACT_MOVE_AND_UPGRADE && store.context.remainingMoves > 0) return true
	}
	return false
}

function clickedRes(tile_id, resAmount, idx) {
	let tile = store.players[props.playerIndexProp].villageTiles.find((t) => t.id === tile_id)
	if (!isResSelectable(tile, resAmount, idx)) return
	if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
		// Deduct the res
		tile.resources[idx] -= 1
		// Remove it from the itemsRequired
		// First if it is directly needed
		if (store.context.itemsRequired.resReq.includes(idx)) store.context.itemsRequired.resReq.splice(store.context.itemsRequired.resReq.indexOf(idx), 1)
		// then from "any"
		else if (store.context.itemsRequired.resReq.includes(rf.SKILL_ANY)) store.context.itemsRequired.resReq.splice(store.context.itemsRequired.resReq.indexOf(rf.SKILL_ANY), 1)
		// Otherwise if it's gold, remove one NB THIS SHOULD REALLY BE DONE BEFORE USING IT UP AS AN "ANY"
		else if (idx === rf.GOLD) store.context.itemsRequired.resReq.splice(0, 1)
		//else if (store.context.itemsRequired.resReq.includes(rf.SKILL_ANY_MATCH)) store.context.itemsRequired.resReq.splice(store.context.itemsRequired.resReq.indexOf(rf.SKILL_ANY_MATCH), 1)
		else alert("Unable to dedcut required item 3a")
		// Add it to the items chosen
		store.context.itemsChosen.resChosen.push(idx)
		model.checkItemsRequiredCompletion()
	} else if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		if (store.context.action === rf.ACT_MOVE_AND_UPGRADE && store.context.remainingMoves > 0) {
			// highlight the valid tiles to move to
			let allowedSides = [rf.ROAD]
			if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT2_A)) allowedSides.push(rf.GRASS)
			const distanceData = map.tilesDistanceFrom(store.players[props.playerIndexProp].villageTiles, allowedSides, tile_id)
			const moveLimitedDistanceData = distanceData.slice(0, Math.min(distanceData.length, store.context.remainingMoves + 1))
			store.context.villageDistanceHighlightData = [[tile_id, idx], ...moveLimitedDistanceData]

			store.context.action2 = store.context.action
			store.context.action = rf.ACT_MOVE_RES
		}
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		// Move the res
		tile.resources[idx] -= 1
		store.players[props.playerIndexProp].villageTiles[0].resources[idx]++
		// Deduct the score
		if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_TIMBER_YARD_A) tile.victoryPoints[0] -= 2
		else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_TIMBER_YARD_B) tile.victoryPoints[1] -= 3
		if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_STONE_YARD_A) tile.victoryPoints[0] -= 2
		else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_STONE_YARD_B) tile.victoryPoints[1] -= 3
		if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BLACKSMITH_A) tile.victoryPoints[0] -= 2
		else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BLACKSMITH_B) tile.victoryPoints[1] -= 3
		if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BARN_A) tile.victoryPoints[0] -= 1
		else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BARN_B) tile.victoryPoints[1] -= 2
	}
}

const showPopupFunc = (event, tile) => {
	polygonRef.value = event.target // Set the polygonRef to the target element
	const rect = polygonRef.value.getBoundingClientRect()
	const xPos = Math.round(rect.left + window.scrollX)
	const yPos = Math.round(rect.top + window.scrollY)
	const width = Math.round(rect.width)
	const height = Math.round(rect.height)

	// Set the prop data
	//const svgRectDiv = originalMapDivRef.value.getBoundingClientRect()
	//const svgRectDiv = DEBUGmapSVG.value.getBoundingClientRect()

	//store.popupSetter.popupData.wholeSVGheight = svgRectDiv.height
	//store.popupSetter.popupData.popupObjectType = popupObjectType

	let retPos = view.getPopupXY(xPos, yPos, width, height)

	store.popupSetter.xPos = retPos[0]
	store.popupSetter.yPos = retPos[1]

	store.popupSetter.tile_id = tile.id
	store.popupSetter.upgraded = tile.upgraded

	store.popupSetter.showPopup = true
}

function hidePopup() {
	store.popupSetter.showPopup = false
}

function calculateXShapePath() {
	const startX = -800 * canvasRef.value
	const endX = -400 * canvasRef.value
	const startY = -600 * canvasRef.value
	const endY = -200 * canvasRef.value

	return `M${endX} ${startY}L${startX} ${endY}M${startX} ${startY}L${endX} ${endY}`
}
function calculateRewindArrowPath(isSecond = false) {
	const startX = -150 * canvasRef.value
	const midX = -300 * canvasRef.value
	const startY = -550 * canvasRef.value
	const midY = -400 * canvasRef.value
	const endY = -250 * canvasRef.value
	let translateX = 35 * canvasRef.value

	if (isSecond) {
		translateX = 80 * canvasRef.value
	}

	return `M${startX + translateX} ${startY}L${midX + translateX} ${midY}L${startX + translateX} ${endY}`
}

function calculateTickPath() {
	const startX = 700 * canvasRef.value
	const midX = 400 * canvasRef.value
	const endX = 480 * canvasRef.value
	const startY = -300 * canvasRef.value
	const midY = -200 * canvasRef.value
	const endY = -580 * canvasRef.value

	return `M${midX} ${startY}L${endX} ${midY}L${startX} ${endY}`
}

function getExtensionFill(extension_id) {
	if (rf.EXTENSION_BLUE_IDS.includes(extension_id))
		return "#0282AF" // "#3D4365"
	else if (rf.EXTENSION_RED_IDS.includes(extension_id))
		return "#E8332A" //"#92332D"
	else if (rf.EXTENSION_YELLOW_IDS.includes(extension_id))
		return "#FFE651" //"#E5B72E"
	else if (rf.EXTENSION_GREEN_IDS.includes(extension_id)) return "#4DAA40" //"#327937"
}

function getDeliveryButtonTransform() {
	let tile_id = -1
	if (store.context.action === rf.ACT_SCORE_SEA_BASTION) tile_id = store.context.seaBastionScoringRoute[store.context.seaBastionScoringRoute.length - 1]
	else if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN) tile_id = store.context.deliveryManScoringRoute[store.context.deliveryManScoringRoute.length - 1]
	let tile = store.players[props.playerIndexProp].villageTiles.find((t) => t.id === tile_id)
	return hexCenter(tile.coord, false)
}

function rewindRouteScoring() {
	if (store.context.action === rf.ACT_SCORE_SEA_BASTION) store.context.seaBastionScoringRoute.pop()
	else if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN) store.context.deliveryManScoringRoute.pop()
}

function cancelScoringRoute() {
	if (store.context.action === rf.ACT_SCORE_SEA_BASTION) store.context.seaBastionScoringRoute.splice(0)
	else if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN) store.context.deliveryManScoringRoute.splice(0)
	store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
}

function finishRouteScoring() {
	if (store.context.action === rf.ACT_SCORE_SEA_BASTION) {
		store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
	} else if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN) {
		let deliveryManTile = store.players[props.playerIndexProp].villageTiles.find((t) => t.id === store.context.deliveryManScoringRoute[0])
		deliveryManTile.scoredRoute = [...store.context.deliveryManScoringRoute]
		store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
	}
}

function getScoringPathStroke(newTile_id) {
	if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN) return "lightgreen"
	// Sea bastion should only be green, if it's stored in the route on the tile
	let seaBastionTile = store.players[props.playerIndexProp].villageTiles.find((t) => t.tileID[0] === rf.TILE_BOAT_SEA_BASTION_A)
	if (seaBastionTile.scoredRoute.includes(newTile_id)) return "lightgreen"

	return "yellow"
}
</script>

<template>
	<span
		class="mainEntryPlayer"
		:style="{
			backgroundColor: personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
			color: personal.getCorrectedColourText(store.players[playerIndexProp].colour),
		}">
		{{ store.players[playerIndexProp].displayName }}
	</span>
	<!-- PENDING VILLAGE TILES -->
	<template v-if="store.players[props.playerIndexProp].pendingVillageTiles.length > 0">
		<div
			id="newHexesDiv"
			:style="{
				backgroundColor: view.hexToRgba(personal.getCorrectedColourHex(store.players[playerIndexProp].colour), 0.5),
			}">
			<!-- Available Hexes to Place -->
			<div v-for="(tile, idx) in store.players[props.playerIndexProp].pendingVillageTiles" :key="idx" class="newSingleHexDiv">
				<svg class="newSingleHexagonSVG" viewBox="-400 -400 800 800" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<pattern :id="tile.gfx[tile.upgraded]" height="100%" width="100%" patternContentUnits="objectBoundingBox">
							<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(tile.gfx[tile.upgraded])" />
						</pattern>
					</defs>
					<polygon @mouseover="showPopupFunc($event, tile)" @mouseout="hidePopup()" class="pendingTilePolygon" :class="getPendingVillageTilePolygonClass(tile)" @click="clickedPendingTile(tile, idx)" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${tile.gfx[tile.upgraded]})`" :transform="`rotate(${tile.rotation * 60} 0 0)`" />

					<g v-for="(side, idx) in tile.sides" :key="idx">
						<g v-if="side === rf.ROAD">
							<path
								d="M -56,328 A 56,56 0 0 1 56,328"
								:transform="'rotate(' + idx * 60 + ' 0 0)'"
								:style="{
									'stroke-width': 20,
									stroke: 'black',
									fill: '#E4EBCA',
								}" />
						</g>
					</g>
				</svg>

				<div v-if="personal.canPlay() && playerIndexProp === controller.currentPlayerIndex() && store.context.action === rf.ACT_ADD_TILES_TO_VILLAGE" class="newHexRotateDiv leftRotatePos">
					<img @click="localRotatePendingTile(tile, -1, idx)" :src="view.getImage('rotate_acw')" />
				</div>

				<div v-if="personal.canPlay() && playerIndexProp === controller.currentPlayerIndex() && store.context.action === rf.ACT_ADD_TILES_TO_VILLAGE" class="newHexRotateDiv rightRotatePos">
					<img @click="localRotatePendingTile(tile, 1, idx)" :src="view.getImage('rotate_cw')" />
				</div>
			</div>
		</div>
	</template>

	<!-- PLAYER VILLAGE -->
	<div
		id="playerVillageDiv"
		:style="{
			width: store.players[playerIndexProp].villageCanvasSize[0] + 'px',
			height: store.players[playerIndexProp].villageCanvasSize[1] + 'px',
			backgroundColor: view.hexToRgba(personal.getCorrectedColourHex(store.players[playerIndexProp].colour), 0.5),
		}">
		<transition name="fadeOut">
			<div class="hexPlaceErrorPopup" v-if="showErrorPopup" :style="{ top: popupPosition.y + 'px', left: popupPosition.x + 'px' }">
				Invitation Cannot
				<br />
				Join to Party
			</div>
		</transition>

		<svg id="playerVillageSVG" :viewBox="map.getViewboxForPlayerVillage(playerIndexProp)">
			<defs>
				<pattern v-for="(tile, idx) in computedVillageTiles" :key="idx" :id="tile.gfxUsed" height="100%" width="100%" patternContentUnits="objectBoundingBox">
					<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(tile.gfxUsed)" />
				</pattern>
			</defs>
			<!-- Add Hexes -->
			<g v-for="(tile, idx) in computedVillageTiles" :key="idx">
				<!-- Hex-->
				<polygon @click="clickedVillageImg(tile)" :id="'hex' + tile.id" :points="map.getHexPointsForPlayerIndex(playerIndexProp, false, 0.95)" :transform="'rotate(' + tile.rotation * 60 + ' ' + hexCenter(tile.coord, false, true) + ')' + hexCenter(tile.coord, false)" class="tilePolygon" :fill="`url(#${tile.gfxUsed})`"></polygon>

				<!-- EXTENSION -->
				<g v-if="tile.extension >= 0">
					<rect
						class="unclickable extensionRect"
						:x="hexCenter(tile.coord, true, false)[0] + 260 * canvasRef"
						:y="hexCenter(tile.coord, true, false)[1] - 420 * canvasRef"
						:transform="'rotate(' + tile.rotation * 60 + ' ' + hexCenter(tile.coord, false, true) + ')'"
						:width="250 * canvasRef"
						:height="250 * canvasRef"
						:style="{
							fill: getExtensionFill(tile.extension),
							'stroke-width': 20 * canvasRef,
							stroke: 'black',
						}" />
				</g>

				<!-- Cabins - HOME TILE ONLY -->
				<g v-if="tile.season === rf.SEASON_HOME_TILE && tile.cabins > 0">
					<image class="unclickable" :x="hexCenter(tile.coord, true, false)[0] + 220 * canvasRef" :y="hexCenter(tile.coord, true, false)[1] - 400 * canvasRef" :width="400 * canvasRef" :height="400 * canvasRef" :xlink:href="view.getImage('cabin')" />

					<text
						class="cabinText"
						:x="hexCenter(tile.coord, true, false)[0] + 320 * canvasRef"
						:y="hexCenter(tile.coord, true, false)[1] - 75 * canvasRef"
						:style="{
							'font-size': 300 * canvasRef + 'px',
							'stroke-width': 20 * canvasRef,
						}">
						{{ tile.cabins }}
					</text>
				</g>
				<!-- Highlight Hex -->
				<polygon
					v-if="tile.addHighlightOutline || 1 == 1"
					@click="clickedPlayerVillageTile($event, tile)"
					@mouseover="showPopupFunc($event, tile)"
					@mouseout="hidePopup()"
					:points="map.getHexPointsForPlayerIndex(playerIndexProp, false, 0.965)"
					:transform="hexCenter(tile.coord, false)"
					class="tileOutline"
					:class="[{ tileOutlineYellow: tile.addHighlightOutlineYellow, tileOutlineGreen: tile.addHighlightOutlineGreen }, { tileOutlineRed: tile.addHighlightOutlineRed }]"
					:style="{
						strokeWidth: tile.addHighlightOutline ? 40 * canvasRef : 20 * canvasRef,
					}"></polygon>

				<!-- Meeples on the tile -->
				<g v-for="(row, idx) in getMeeplesOnTileArray(tile)" :key="idx">
					<g v-for="(meepleColourEntry, idx2) in row" :key="idx2">
						<image
							class="meepleOnTileImg"
							:class="{ turnStartMeepleGlow: view.shouldAddStartTurnGlow(1, tile.id, [idx, tile.meeplesOnTile.length]) }"
							:xlink:href="view.getImage('meeple_' + String(meepleColourEntry))"
							:x="hexCenter(tile.coord, true, false)[0] - 500 * canvasRef + idx2 * 240 * canvasRef"
							:y="hexCenter(tile.coord, true, false)[1] - 40 * canvasRef + idx * 240 * canvasRef"
							:width="200 * canvasRef"
							:height="200 * canvasRef"
							:style="{
								filter: `drop-shadow(${8 * canvasRef}px ${8 * canvasRef}px 0 black) drop-shadow(${-8 * canvasRef}px ${8 * canvasRef}px 0 black) drop-shadow(${-8 * canvasRef}px ${-8 * canvasRef}px 0 black) drop-shadow(${8 * canvasRef}px ${-8 * canvasRef}px 0 black)`,
							}" />
					</g>
				</g>

				<!-- Resource on hex -->
				<g v-for="(amount, res) in tile.resources" :key="res">
					<image
						v-if="amount > 0"
						@click="clickedRes(tile.id, amount, res)"
						@mouseover="tile.originalTile.resIdxOver = res"
						@mouseout="tile.originalTile.resIdxOver = -1"
						:x="hexCenter(tile.coord, true, false)[0] - 400 * canvasRef + res * 200 * canvasRef"
						:y="hexCenter(tile.coord, true, false)[1] + 300 * canvasRef"
						:width="200 * canvasRef"
						:height="350 * canvasRef"
						:xlink:href="view.getImage('res_' + res)"
						:style="{
							pointerEvents: isResSelectable(tile, amount, res) ? 'painted' : 'none',
							//filter: isResSelectable(tile, amount, res) ? `drop-shadow(${120 * canvasRef}px ${120 * canvasRef} 0 yellow) drop-shadow(-${12 * canvasRef} ${12 * canvasRef} 0 yellow) drop-shadow(${12 * canvasRef} -${12 * canvasRef} 0 yellow) drop-shadow(-${12 * canvasRef} -${12 * canvasRef} 0 yellow)` : `none`,
							filter: isResSelectable(tile, amount, res) ? `drop-shadow(${24 * canvasRef}px ${24 * canvasRef}px 0 ${tile.resIdxOver === res ? 'lightgreen' : 'yellow'}) drop-shadow(${-24 * canvasRef}px ${24 * canvasRef}px 0 ${tile.resIdxOver === res ? 'lightgreen' : 'yellow'}) drop-shadow(${-24 * canvasRef}px ${-24 * canvasRef}px 0 ${tile.resIdxOver === res ? 'lightgreen' : 'yellow'}) drop-shadow(${24 * canvasRef}px ${-24 * canvasRef}px 0 ${tile.resIdxOver === res ? 'lightgreen' : 'yellow'})` : 'none',
						}" />

					<text
						v-if="amount > 0"
						class="resourceText"
						:x="hexCenter(tile.coord, true, false)[0] - 425 * canvasRef + res * 200 * canvasRef"
						:y="hexCenter(tile.coord, true, false)[1] + 475 * canvasRef"
						:style="{
							'font-size': 400 * canvasRef + 'px',
							'stroke-width': 20 * canvasRef,
						}">
						{{ amount }}
					</text>
				</g>

				<!-- DELIVERY MAN / DRAN PATH TILES -->
				<g v-if="controller.currentPlayerIndex() === props.playerIndexProp && (store.context.action === rf.ACT_SCORE_SEA_BASTION || store.context.action === rf.ACT_SCORE_DELIVERY_MAN)">
					<!--<path
						:d="map.getScoringPath(props.playerIndexProp, store.context.action)"
						:stroke="getScoringPathStroke()"
						class="scoringPath"
						:style="{
							strokeWidth: 160 * canvasRef,
						}" />-->
					<path
						v-for="(dataEntry, idx) in map.getScoringPath(props.playerIndexProp, store.context.action)"
						:key="idx"
						:d="dataEntry[0]"
						:stroke="getScoringPathStroke(dataEntry[1])"
						class="scoringPath"
						:style="{
							strokeWidth: 160 * canvasRef,
						}" />

					<!-- BUTTONS FOR DELIVERY MAN / DRAW PATH -->
					<g v-if="(store.context.action === rf.ACT_SCORE_SEA_BASTION && store.context.seaBastionScoringRoute.length > 0) || (store.context.action === rf.ACT_SCORE_DELIVERY_MAN && store.context.deliveryManScoringRoute.length > 0)">
						<!-- Move the buttons onto the correct tile -->
						<g :transform="getDeliveryButtonTransform()">
							<!-- Cancel Button -->
							<g transform="scale(0.7)" @click="rewindAction">
								<circle @click="cancelScoringRoute" id="cancelCircle" class="pathDrawingButtonCircle" :cx="-600 * canvasRef" :cy="-400 * canvasRef" :r="300 * canvasRef" fill="red" />
								<path class="unselectable" :d="calculateXShapePath()" stroke="white" :stroke-width="40 * canvasRef" stroke-linecap="round" @click="cancelAction" />
							</g>

							<!-- Rewind Button -->
							<g transform="scale(0.7)" @click="rewindAction">
								<circle @click="rewindRouteScoring" id="rewindCircle" class="pathDrawingButtonCircle" :cx="0 * canvasRef" :cy="-400 * canvasRef" :r="300 * canvasRef" fill="blue" />
								<path class="unselectable" :d="calculateRewindArrowPath(false)" fill="none" stroke="white" :stroke-width="40 * canvasRef" stroke-linecap="round" stroke-linejoin="round" transform="translate(35, 5)" />
								<path class="unselectable" :d="calculateRewindArrowPath(true)" fill="none" stroke="white" :stroke-width="40 * canvasRef" stroke-linecap="round" stroke-linejoin="round" transform="translate(75, 5)" />
							</g>

							<!-- Finish Button -->
							<g v-if="store.context.action === rf.ACT_SCORE_DELIVERY_MAN || (store.context.action === rf.ACT_SCORE_SEA_BASTION && controller.currentPlayerObj().villageTiles.find((t) => t.tileID[t.upgraded] === rf.TILE_BOAT_SEA_BASTION_B).scoredRoute.length > 0)" transform="scale(0.7)" @click="rewindAction">
								<circle @click="finishRouteScoring" id="finishCircle" class="pathDrawingButtonCircle" :cx="600 * canvasRef" :cy="-400 * canvasRef" :r="300 * canvasRef" fill="forestgreen" />
								<path class="unselectable" fill="none" :d="calculateTickPath()" stroke="white" :stroke-width="40 * canvasRef" stroke-linecap="round" stroke-linejoin="round" transform="translate(0, 0)" style="cursor: pointer" @click="finishAction" />
							</g>
						</g>
					</g>
				</g>

				<!-- NEWLY ADDED TILES -->
				<g v-if="(store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) && store.context.newVillageTile_ids.includes(tile.id)">
					<!-- New tile Outline -->
					<polygon
						v-if="tile.addHighlightOutline || 1 == 1"
						@click="clickedPlacedNewTile(tile)"
						:points="map.getHexPointsForPlayerIndex(playerIndexProp, false, 0.965)"
						:transform="hexCenter(tile.coord, false)"
						class="tileOutline"
						:class="[{ tileOutlineYellow: tile.addHighlightOutlineYellow }, { tileOutlineRed: tile.addHighlightOutlineRed }, { tileOutlineOrange: tile.addHighlightOutlineOrange }]"
						:style="{
							strokeWidth: tile.addHighlightOutline ? 40 * canvasRef : 20 * canvasRef,
						}" />
					<!-- New tile Rotate Buttons -->
					<image
						class="newTileRotateImg"
						@click="rotatePlacedTile(tile, -1)"
						@mouseover="controller.currentPlayerObj().villageTiles[idx].mouseIsOverACW = true"
						@mouseleave="controller.currentPlayerObj().villageTiles[idx].mouseIsOverACW = false"
						:xlink:href="view.getImage('rotate_acw')"
						:x="hexCenter(tile.coord, true, false)[0] - 350 * canvasRef"
						:y="hexCenter(tile.coord, true, false)[1] + 275 * canvasRef"
						:width="300 * canvasRef"
						:height="300 * canvasRef"
						:style="{
							filter: `drop-shadow(${8 * canvasRef}px ${8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverACW ? 'lightgreen' : 'yellow'}) drop-shadow(${-8 * canvasRef}px ${8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverACW ? 'lightgreen' : 'yellow'}) drop-shadow(${-8 * canvasRef}px ${-8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverACW ? 'lightgreen' : 'yellow'}) drop-shadow(${8 * canvasRef}px ${-8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverACW ? 'lightgreen' : 'yellow'})`,
						}" />
					<image
						class="newTileRotateImg"
						@click="rotatePlacedTile(tile, 1)"
						@mouseover="controller.currentPlayerObj().villageTiles[idx].mouseIsOverCW = true"
						@mouseleave="controller.currentPlayerObj().villageTiles[idx].mouseIsOverCW = false"
						:xlink:href="view.getImage('rotate_cw')"
						:x="hexCenter(tile.coord, true, false)[0] + 50 * canvasRef"
						:y="hexCenter(tile.coord, true, false)[1] + 275 * canvasRef"
						:width="300 * canvasRef"
						:height="300 * canvasRef"
						:style="{
							filter: `drop-shadow(${8 * canvasRef}px ${8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverCW ? 'lightgreen' : 'yellow'}) drop-shadow(${-8 * canvasRef}px ${8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverCW ? 'lightgreen' : 'yellow'}) drop-shadow(${-8 * canvasRef}px ${-8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverCW ? 'lightgreen' : 'yellow'}) drop-shadow(${8 * canvasRef}px ${-8 * canvasRef}px 0 ${controller.currentPlayerObj().villageTiles[idx].mouseIsOverCW ? 'lightgreen' : 'yellow'})`,
						}" />

					<!-- Boat Warning -->
					<image v-if="store.context.boatChainWarnings.some((warning) => warning.errorTile_ids.includes(tile.id))" class="boatWarningIcon" :xlink:href="view.getImage('boat_warn_icon')" :x="hexCenter(tile.coord, true, false)[0] + -300 * canvasRef" :y="hexCenter(tile.coord, true, false)[1] + -400 * canvasRef" :width="600 * canvasRef" :height="600 * canvasRef" />
				</g>

				<!-- ROAD PIPS - DURING VILLAGE EXPANION -->
				<g v-if="store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING">
					<g v-for="(side, idx) in tile.sides" :key="idx">
						<g v-if="side === rf.ROAD">
							<path
								:d="map.calculateSemicirclePath(playerIndexProp, false, 0.95)"
								:transform="'rotate(' + idx * 60 + ' ' + hexCenter(tile.coord, false, true) + ')' + hexCenter(tile.coord, false)"
								:style="{
									'stroke-width': 20 * canvasRef,
									stroke: 'black',
									fill: '#E4EBCA',
								}" />
						</g>
					</g>
				</g>
			</g>
			<!-- END OF VILLAGE TILES LOOP -->

			<!-- Add New BLANK Hex Options -->
			<g v-if="store.context.action === rf.ACT_ADD_TILES_TO_VILLAGE && personal.canPlay() && playerIndexProp === controller.currentPlayerIndex()">
				<!-- NEW HEX OPTION -->
				<g v-for="(newCoord, newIdx) in store.players[playerIndexProp].placeableVillageCoords" :key="newIdx">
					<polygon
						class="newTileOptionPolygon"
						@mouseover="handleMouseover(newIdx)"
						@mouseout="handleMouseout(newIdx)"
						@click="localAddTileToVillage(store.context.newTileGhostData.id, store.context.newTileGhostData.rotation, newCoord)"
						:points="map.getHexPointsForPlayerIndex(playerIndexProp, false, 1)"
						:transform="'rotate(' + store.context.newTileGhostData.rotation * 60 + ' ' + hexCenter(newCoord, false, true) + ')' + hexCenter(newCoord, false)"
						:fill="getNewHexOptionFill(newCoord, newIdx)"
						:style="{
							'stroke-width': store.players[playerIndexProp].villageRefSize / 240 + 'px',
							fillOpacity: mouseoverIndex === newIdx ? 1 : 0.3,
						}"></polygon>

					<!-- ROAD PIPS - DURING VILLAGE EXPANION -->
					<g v-if="mouseoverIndex === newIdx && store.context.newTileGhostData.id !== -1">
						<g v-for="(side, idx) in store.context.newTileGhostData.newSides" :key="idx">
							<g v-if="side === rf.ROAD">
								<path
									:d="map.calculateSemicirclePath(playerIndexProp, false, 0.95)"
									:transform="'rotate(' + idx * 60 + ' ' + hexCenter(newCoord, false, true) + ')' + hexCenter(newCoord, false)"
									:style="{
										'stroke-width': 20 * canvasRef,
										stroke: 'black',
										fill: '#E4EBCA',
									}" />
							</g>
							=
						</g>
					</g>
				</g>
			</g>
		</svg>

		<!--MapHighlights /-->
	</div>
	<template v-if="playerIndexProp === controller.currentPlayerIndex() && store.context.boatChainWarnings.some((warning) => warning.errorTile_ids.length > 0)">
		<div>
			<img class="boatWarningIconText" :src="view.getImage('boat_warn_icon')" />
			Caution - one of your tiles is blocking the water flowing from your home tile
			<br />
			This could prevent you from adding boat tiles in a chain, which could affect the Sea Breese scoring
			<span v-if="store.players.length === 2">
				<br />
				(Sea Breese is not in a 2p game, but be careful at higher player counts)
			</span>
			<br />
		</div>
	</template>
</template>

<style scoped>
.scoringPath {
	fill: none;
	pointer-events: none;
}
.newHexOptionSVG {
	stroke: black;
	fill-opacity: 0.5;
	z-index: 200;
	cursor: pointer;
}

#playerVillageDiv {
	position: relative;
	padding: 0px;
	width: fit-content;
	margin: auto;

	background-color: aliceblue;
	z-index: 100;
}

#playerVillageSVG {
	margin: 0 auto;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
	z-index: 100;
}

.tilePolygon {
	stroke: black;
}

.tileOutline {
	stroke: black;
	fill: black;
	fill-opacity: 0;
}

.tileOutlineYellow {
	stroke: yellow;
}
.tileOutlineYellow:hover {
	stroke: lightgreen;
}
.tileOutlineGreen {
	stroke: lightgreen;
}
.tileOutlineRed {
	stroke: red;
}
.tileOutlineOrange {
	stroke: orange;
}

.hexPlaceErrorPopup {
	position: fixed;
	background-color: red;
	color: white;
	padding: 10px;
	border-radius: 5px;
	opacity: 1;
	z-index: 9999;
}

.fadeOut-enter-active,
.fadeOut-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeOut-enter,
.fadeOut-leave-active {
	opacity: 0;
}

/** New tiles */
#newHexesDiv {
	margin: 0;
	height: fit-content;
	margin: auto;
	width: fit-content;
}

.newSingleHexDiv {
	position: relative;
	display: inline-block;
	margin: 0px;
}

.newSingleHexagonSVG {
	width: 150px;
	margin: 0px;
}

.newHexRotateDiv {
	position: absolute;
	bottom: 0px;
	z-index: 100;
	background-color: aliceblue;
	width: 30px;
	height: 30px;
	border: 1px solid black;
	border-radius: 10px;
	box-sizing: border-box;
	overflow: hidden;
}

.newHexRotateDiv:hover {
	border: yellow;
}

.leftRotatePos {
	left: 0px;
}

.rightRotatePos {
	right: 0px;
}

.lightGreen {
	stroke: lightgreen !important;
}

.pendingTilePolygon {
	stroke-width: 30;
	stroke: black;
}

.newTileOptionPolygon {
	stroke: yellow;
	/*z-index: 200;*/
	cursor: pointer;
}
.newTileOptionPolygon:hover {
	stroke: lightgreen;
}

.selectablePendingTile {
	stroke: yellow;
}

.selectablePendingTile:hover {
	stroke: lightgreen;
}

.actionArea {
	fill: none;
}

.actionArea.highlighted {
	stroke: yellow;
	fill: black;
	fill-opacity: 0;
}
.actionArea.highlighted:hover {
	stroke: lightgreen !important;
}

.actionArea.illegal {
	stroke: red;
	fill: black;
	fill-opacity: 0;
}

.selectedArea {
	stroke: lightgreen !important;
}

.resourceText {
	font-weight: bolder;
	stroke: black;
	fill: white;
	pointer-events: none;
}

.cabinText {
	font-weight: bolder;
	stroke: white;
	fill: black;
	pointer-events: none;
}

.unclickable {
	pointer-events: none;
}
.meepleOnTileImg {
	stroke: none;
	stroke-width: 0;
}

.boatWarningIcon {
	pointer-events: none;
	animation: glow 0.6s infinite alternate;
}

@keyframes glow {
	to {
		opacity: 0.3;
	}
}

.boatWarningIconText {
	width: 50px;
	height: 50px;
	margin-right: 6px;
}

.turnStartMeepleGlow {
	animation: glowMeeple 0.8s infinite alternate;
}

@keyframes glowMeeple {
	to {
		filter: drop-shadow(8px 8px 0 yellow) drop-shadow(-8px 8px 0 yellow) drop-shadow(-8px -8px 0 yellow) drop-shadow(8px -8px 0 yellow);
	}
}

#blueStop1 {
	stop-color: lightblue; /* Default color */
}

#blueStop2 {
	stop-color: blue; /* Default color */
}

.pathDrawingButtonCircle {
	stroke: white;
	stroke-width: 10;
	cursor: pointer;
}

#rewindCircle:hover {
	fill: darkblue;
}
#cancelCircle:hover {
	fill: darkred;
}
#finishCircle:hover {
	fill: darkgreen;
}
.unselectable {
	pointer-events: none;
}
</style>
