<script setup>
import * as model from "../js/KFWmodel"
import * as rf from "../js/KFWreference"
import * as controller from "../js/KFWcontroller"
import * as view from "../js/KFWview"
import * as village from "../js/KFWvillage"
import * as IO from "../backend/KFW_IO"

import { computed, ref } from "vue"
const polygonRef = ref(null)

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

const props = defineProps(["tileProp", "innerIndex"])

function localClickedtileArea(area, highlighted, canUse) {
	// Check to reopen popup
	if (store.context.action === rf.ACT_CHOOSE_MEEPLES && store.meeplePopupSetter.showPopup === false) {
		if (props.tileProp.id === store.context.selectedTile.id) store.meeplePopupSetter.showPopup = true
	}

	if (!canUse) return
	// Remove any end of turn messages
	store.clearMessages()
	if (!highlighted) return
	//if (area === rf.TILE_BIDDING_AREA && !props.tileProp.highlightForBid) return
	//if (area === rf.TILE_ACTION_AREA && !props.tileProp.highlightForAction) return

	// SET THE MEEPLE POPUP POS HERE
	const rect = polygonRef.value.getBoundingClientRect()
	const xPos = Math.round(rect.left + window.scrollX)
	const yPos = Math.round(rect.top + window.scrollY)
	const width = Math.round(rect.width)
	let retPos = view.getMeeplePopupXY(xPos, yPos, width)
	store.meeplePopupSetter.xPos = retPos[0]
	store.meeplePopupSetter.yPos = retPos[1]

	model.clickedtileArea(props.tileProp, area)
}

function localClickedMeeple(playerIndex) {
	//let tile = model.getTile(tile_ID)
	if (props.tileProp.bids[playerIndex][1] !== `selectableBidMeeple`) return

	if (store.context.action === rf.ACT_CHOOSE_SET_MEEPLE_FOR_EXCHANGE) {
		let message
		store.context.meeplesRemoved.splice(0)
		if (props.tileProp.season === rf.SEASON_TURN_ORDER_TILE) message = model.exchangeMeeples_core(playerIndex, store.context.selectedTile.action[store.context.selectedTile.upgraded + 1], [1, props.tileProp.id])
		else message = model.exchangeMeeples_core(playerIndex, store.context.selectedTile.action[store.context.selectedTile.upgraded + 1], [2, props.tileProp.id])

		store.gameMessages.turnEndText = message
		store.context.action = rf.ACT_CONFIRM_END_TURN
		store.removeAllActiveHighlights()
		model.unhighlightOutbidMeeples()
		let histData = []
		histData.push(store.context.selectedTile.upgraded)
		// entry0 >=0 so must be tileID of outbid off meeples]
		histData.push(props.tileProp.id, [...store.context.meeplesRemoved])

		store.context.historyObj.push([...histData])

		model.addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.meeplesRemoved.splice(0)
		store.context.historyObj.splice(0)

		return
	}

	if (store.context.action === rf.ACT_CHOOSE_ANY_MEEPLE_FOR_EXCHANGE) {
		model.exchangeOutbidMeeples(props.tileProp.id, playerIndex) 
		return
	}

	if (store.context.selectedTileArea === rf.TILE_ACTION_AREA) {
		let outbidMeepleArrayLength = props.tileProp.bids[playerIndex][0].length

		if (store.context.selectedTile.meeplesOnTile.reduce((sum, subarray) => sum + subarray.length, 0) + outbidMeepleArrayLength > 6) {
			store.gameMessages.errorText = "Not enough space for workers"
			return
		}
	}

	// So now it's a proper click to move outbid meeples
	model.moveOutbidMeeples(props.tileProp.id, playerIndex)
}

function getTilePolygonClass() {
	// In end of season boat phase, highlight boat tiles
	if (personal.canPlay() && store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES && props.tileProp.season === rf.SEASON_BOAT_TILE) {
		if (store.context.action !== rf.ACT_CONFIRM_END_TURN) {
			// In Winter, highlight all tiles
			if (store.gameflow.season === rf.WINTER) return "selectableTile"
			// In Spring / Summer, highlight boat tiles with resources still on them
			if (props.tileProp.itemsOnBoat.meeples.length > 0) return "selectableTile"
		}
	}
	return ""
}

function getTileStroke() {
	// If it's selectable, then don't intefere
	if (getTilePolygonClass() !== "") return ""

	// Otherwise, if it's during boat collection, and it's been collected, outline it with that player colour
	if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES && store.gameflow.phase !== rf.WINTER && props.tileProp.season === rf.SEASON_BOAT_TILE) {
		// If it has meeples on it, then it hasn't been collected yet
		if (props.tileProp.itemsOnBoat.meeples.length > 0) return ""
		// So now check the history to find the player index
		let idx = store.history.length-1
		while (idx >= 0 && store.history[idx][0] !== rf.HIST_ACT_ON_TILE && store.history[idx][0] !== rf.HIST_BID_ON_TILE) {
			if (store.history[idx][0] === rf.HIST_COLLECT_BOAT_RESOURCES && store.history[idx][3][0] === props.tileProp.tileID[props.tileProp.upgraded]) {
				let playerIndex= store.history[idx][1]
				let colour = store.players[playerIndex].colour
				return personal.getCorrectedColourHex(colour)
			}
			idx--
		}
	}

	return ""
}

function getTileStrokeWidth() {
	if (getTileStroke() === "") return ""
	return 45
}

function clickedTile() {
	if (IO.DEBUG_USERS.includes(personal.name)) console.log(JSON.stringify(props.tileProp))
	if (!personal.canPlay()) return
	// COLLECTING BOATS
	if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES && props.tileProp.season === rf.SEASON_BOAT_TILE) {
		// If it has no meeples, you can't pick it up. THere will ALWAYS be meeples on an unpicked boat
		if (store.gameflow.season !== rf.WINTER && props.tileProp.itemsOnBoat.meeples.length === 0) return

		if (store.context.action === rf.ACT_COLLECT_BOAT_RESOURCES) {
			model.collectBoatResources(props.tileProp.tileID[props.tileProp.upgraded])
		} else if (store.context.action === rf.ACT_COLLECT_BOAT_TILES) {
			controller.currentPlayerObj().pendingVillageTiles.push(JSON.parse(JSON.stringify(props.tileProp)))
			store.availableBoatTiles = store.availableBoatTiles.filter((tile) => tile.id !== props.tileProp.id)
			// boat 1a also gets 2 random meeples
			// If you have boat1a you get 2 additional workers from the bag, if possible
			store.context.historyObj.splice(0)
			let winterSide = props.tileProp.seasonsIndex.findIndex((subarray) => subarray.includes(rf.WINTER))
			store.context.historyObj.push(props.tileProp.tileID[winterSide])
			/* HISTORY FLAGS
			1 = boat1a
			2 = boat1b+green meeple
			3 = boat1b+NO green meeple
			4 = boat7b+res income
			5 = keyflower II 3x gold income
			9 = boat 7a, next entry is tileID
			*/
			let historyFlags = []
			if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT1_A)) {
				historyFlags.push(1)
			}
			// If you have boat1b you get 1 green worker, if available
			else if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT1_B)) {
				if (store.availableGreenMeeples > 0) {
					controller.currentPlayerObj().hiddenMeeples[rf.MEEPLE_GREEN]++
					controller.currentPlayerObj().knownHiddenMeeples[rf.MEEPLE_GREEN]++
					store.availableGreenMeeples--
					historyFlags.push(2)
				} else {
					historyFlags.push(3)
				}
			}

			// 7b gets you res income at boat COLLECTION
			if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT7_B)) {
				// If you have boat 7B then you cannot have boat 7A, so don't worry about boat 7A
				if (store.availableResources[rf.WOOD] > 0) {
					controller.currentPlayerObj().villageTiles[0].resources[rf.WOOD]++
					store.availableResources[rf.WOOD]--
				}
				if (store.availableResources[rf.STONE] > 0) {
					controller.currentPlayerObj().villageTiles[0].resources[rf.STONE]++
					store.availableResources[rf.STONE]--
				}
				if (store.availableResources[rf.IRON] > 0) {
					controller.currentPlayerObj().villageTiles[0].resources[rf.IRON]++
					store.availableResources[rf.IRON]--
				}
				historyFlags.push(4)
			}

			// Keyflower 2 gets you 3 gold
			if (props.tileProp.tileID[1] === rf.TILE_M_BOAT_KEYFLOWER_2_B) {
				let incomingRes = []
				for (let i = 0; i < 3; i++) {
					if (store.availableResources[rf.GOLD] > 0) {
						store.availableResources[rf.GOLD]--
						incomingRes.push(rf.GOLD)
					}
				}
				village.addResourcesToVillage(controller.currentPlayerIndex(), -1, [...incomingRes])
				store.context.action2 = rf.ACT_CONFIRM_END_TURN
				historyFlags.push(5)
			}

			store.context.historyObj.push([...historyFlags])
			model.addHistory(rf.HIST_COLLECT_BOAT_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])

			if (store.context.historyObj[store.context.historyObj.length - 1].includes(1)) {
				let histData = [rf.MEEPLE_RANDOM, rf.MEEPLE_RANDOM]
				model.addHistory(rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES, controller.currentPlayerIndex(), 0, [...histData])
				store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, 2, store.history.length - 1, [...histData]])
				controller.currentPlayerObj().knownHiddenMeeples[4] += 2
			}
			store.context.historyObj.splice(0)

			if (store.context.action !== rf.ACT_PLACE_BOAT_7A_RESOURCES) store.context.action = rf.ACT_CONFIRM_END_TURN
		}
	}
}

const computedTileProp = computed(() => {
	let playerIndex = controller.currentPlayerIndex()
	//let playerObj = store.players[playerIndex]
	let computedTileProp = JSON.parse(JSON.stringify(props.tileProp))
	/**
	 *
	 * BIDDING AREAS
	 *
	 * */
	computedTileProp.biddingAreas = []
	const biddingLength = 200
	const biddingWidth = 60
	const biddingCoords = [
		// cx, cy, MeepleX, meepleY
		[0, 400, -75, 300],
		[-350, 223.21, -450, 153.21],
		[-350, -223.21, -450, -303.21],
		[0, -400, -75, -500],
		[350, -223.21, 300, -303.21],
		[350, 223.21, 300, 153.21],
	]
	let biddingCoordsIndexes = [0, 3]
	if (store.players.length === 3) biddingCoordsIndexes = [0, 2, 4]
	if (store.players.length === 4) biddingCoordsIndexes = [0, 2, 3, 4]
	if (store.players.length === 5) biddingCoordsIndexes = [0, 1, 2, 3, 4]
	if (store.players.length === 6) biddingCoordsIndexes = [0, 1, 2, 3, 4, 5]
	if (personal.pov >= 1 && !personal.trainingGame) {
		const temp = biddingCoordsIndexes[0]
		biddingCoordsIndexes[0] = biddingCoordsIndexes[personal.pov]
		biddingCoordsIndexes[personal.pov] = temp
	}

	// Find out the bid required for the tile
	let minMeeplesRequired = Math.max(1, props.tileProp.bids[props.tileProp.bids.reduce((maxIndex, bid, currentIndex, arr) => (bid[0].length > arr[maxIndex][0].length ? currentIndex : maxIndex), 0)][0].length + 1)
	// Now subtract your existing bid
	minMeeplesRequired = Math.max(minMeeplesRequired - props.tileProp.bids[playerIndex][0].length, 1)

	// SET CONTEXT BASED ON TILE COLOUR
	let coreMeepleColour = props.tileProp.coreMeepleColour

	// If you have boat 4a, AND someone else has bid in B/Y/G, then allow different colour counter / or must use new colour
	if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT4_A)) {
		// If you have already bid, xhange the colour to your colour
		if (props.tileProp.bids[playerIndex][0].length > 0) coreMeepleColour = props.tileProp.bids[playerIndex][0][0]
		// But you cannot counterbid against green
		else if (coreMeepleColour !== rf.MEEPLE_GREEN) coreMeepleColour = rf.MEEPLE_NONE
	}

	let canBid = false
	let strokeForBiddingArea = "black"
	// If it is bidding time, find the highlight for the current player
	if (personal.canPlay()) {
		if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS && store.context.action === rf.ACT_NONE) {
			if (model.doesPlayerHaveMeepleColours(playerIndex, coreMeepleColour, minMeeplesRequired)) {
				strokeForBiddingArea = "yellow"
				canBid = true
			} else {
				strokeForBiddingArea = "red"
				canBid = false
			}
		}
	}
	for (let i = 0; i < store.players.length; i++) {
		let biddingCoordIndex = biddingCoordsIndexes[i]
		let coreMeepleColour = props.tileProp.coreMeepleColour
		if (props.tileProp.bids[i].length > 0) coreMeepleColour = props.tileProp.bids[i][0][0]
		let rotation = 0
		/*if (biddingCoordIndex === 1) rotation = 60
		if (biddingCoordIndex === 2) rotation = -60
		if (biddingCoordIndex === 4) rotation = 60
		if (biddingCoordIndex === 5) rotation = -60*/

		rotation = biddingCoordIndex * 60

		let biddingArea = {
			name: store.players[i].name,
			playerIndex: i,
			colour: personal.getCorrectedColourHex(store.players[i].colour),
			cx: biddingCoords[biddingCoordIndex][0],
			cy: biddingCoords[biddingCoordIndex][1],
			rx: biddingLength,
			ry: biddingWidth,
			meepleX: biddingCoords[biddingCoordIndex][2],
			meepleY: biddingCoords[biddingCoordIndex][3],
			coreMeepleColour: coreMeepleColour,
			meepleAmount: props.tileProp.bids[i][0].length,
			rotation: rotation,
			shadowFilter: props.tileProp.bids[i][1],
			strokeForBiddingArea: i === playerIndex ? strokeForBiddingArea : "black",
			canBid: i === playerIndex ? canBid : false,
			currentArea: i === playerIndex,
		}
		computedTileProp.biddingAreas.push(biddingArea)
	}

	/**
	 *
	 * ACTION AREA
	 *
	 * */
	computedTileProp.showActionArea = false
	if (!rf.TILE_NO_ACTION.includes(computedTileProp.tileID[0])) {
		// Sorcerer has actions, but only inside a village
		if (computedTileProp.tileID[0] !== rf.TILE_SUMMER_SORCERER_A) computedTileProp.showActionArea = true
	}

	/**************** MEEPLES ON AVAILABLE TILE */
	computedTileProp.meeplesOnTile = []
	if (!rf.TILE_NO_ACTION.includes(props.tileProp.tileID[0])) {
		for (let i = 0; i < props.tileProp.meeplesOnTile.length; i++) {
			computedTileProp.meeplesOnTile.push([...props.tileProp.meeplesOnTile[i]])
		}
	}

	return computedTileProp
})

const showPopupFunc = () => {
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

	store.popupSetter.tile_id = props.tileProp.id
	store.popupSetter.upgraded = props.tileProp.upgraded

	let retPos = view.getPopupXY(xPos, yPos, width, height)

	store.popupSetter.xPos = retPos[0]
	store.popupSetter.yPos = retPos[1]
	store.popupSetter.showPopup = true
}

function hidePopup() {
	store.popupSetter.showPopup = false
}
</script>

<template>
	<div
		class="availableTileDiv"
		:style="{
			width: computedTileProp.season === rf.SEASON_BOAT_TILE ? '167px' : '200px',
			height: computedTileProp.season === rf.SEASON_BOAT_TILE ? '145px' : '200px',
		}">
		<svg class="availableTileSVG" :viewBox="computedTileProp.season === rf.SEASON_BOAT_TILE ? '-400 -350 800 700' : '-500 -500 1000 1000'" xmlns="http://www.w3.org/2000/svg">
			<!--DEF -->
			<defs>
				<pattern :id="tileProp.gfx[tileProp.upgraded]" height="100%" width="100%" patternContentUnits="objectBoundingBox">
					<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(tileProp.gfx[tileProp.upgraded])" />
				</pattern>
			</defs>

			<!-- Available Tiles -->
			<polygon ref="polygonRef" class="tilePolygon" :class="getTilePolygonClass()" @mouseover="showPopupFunc()" @mouseout="hidePopup()" @click="clickedTile" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${computedTileProp.gfx[innerIndex]})`"
			:style="{
				stroke: getTileStroke(),
				'stroke-width': getTileStrokeWidth(),
			}" />

			<!--	<path
				d="M-200,346.41
             Q-200,450 -100,450
             Q0,450 100,450
             Q200,450 200,346.41
             L200,346.41 L-200,346.41 Z"
				fill="red"
				stroke="black"
				:transform="`rotate(${computedTileProp.rotation},0,0)`"
				stroke-width="5" />-->

			<!--
	<path
    d="M200,-346.41
       Q200,-450 100,-450
       Q0,-450 -100,-450
       Q-200,-450 -200,-346.41
       L-200,-346.41 L200,-346.41 Z"
    fill="blue"
    stroke="black"
    stroke-width="5" />-->

			<!-- If boat tile, add resources -->
			<g v-if="computedTileProp.season === rf.SEASON_BOAT_TILE">
				<image v-for="(greenMeeple, idx) in computedTileProp.itemsOnBoat.greenMeeples" :key="idx" class="meepleOnBoatImg unselectable" :x="view.getPosOnAvailableBoat(idx, 0, tileProp, innerIndex)[0]" :y="view.getPosOnAvailableBoat(idx, 0, tileProp, innerIndex)[1]" :xlink:href="view.getImage('meeple_green')" />
				<image v-for="(meeple, idx) in computedTileProp.itemsOnBoat.meeples" :key="idx" class="meepleOnBoatImg unselectable" :x="view.getPosOnAvailableBoat(idx, 1, tileProp, innerIndex)[0]" :y="view.getPosOnAvailableBoat(idx, 1, tileProp, innerIndex)[1]" :xlink:href="view.getImage('meeple_' + String(meeple))" />
				<image v-for="(skillTile, idx) in computedTileProp.itemsOnBoat.skillTiles" :key="idx" class="skillTileOnBoatImg unselectable" :x="view.getPosOnAvailableBoat(idx, 2, tileProp, innerIndex)[0]" :y="view.getPosOnAvailableBoat(idx, 2, tileProp, innerIndex)[1]" :xlink:href="view.getImage('skillTile_' + String(skillTile))" />
				<image v-for="(cabin, idx) in computedTileProp.itemsOnBoat.cabins" :key="idx" class="cabinOnBoatImg unselectable" :x="view.getPosOnAvailableBoat(idx, 3, tileProp, innerIndex)[0]" :y="view.getPosOnAvailableBoat(idx, 3, tileProp, innerIndex)[1]" :xlink:href="view.getImage('cabin')" />
				<image v-for="(res, idx) in computedTileProp.itemsOnBoat.resources" :key="idx" class="itemOnBoatImg unselectable" :x="view.getPosOnAvailableBoat(idx, 4, tileProp, innerIndex)[0]" :y="view.getPosOnAvailableBoat(idx, 4, tileProp, innerIndex)[1]" :xlink:href="view.getImage('res_' + String(res))" />
				<image v-for="(contract, idx) in computedTileProp.itemsOnBoat.contracts" :key="idx" class="contractOnBoatImg unselectable" :x="view.getPosOnAvailableBoat(idx, 5, tileProp, innerIndex)[0]" :y="view.getPosOnAvailableBoat(idx, 5, tileProp, innerIndex)[1]" :xlink:href="view.getImage('c_back')" />
			</g>

			<!-- Action Area -->
			<path v-if="computedTileProp.showActionArea" class="actionArea" :class="[{ highlighted: model.canPutMeeplesOnTile(controller.currentPlayerIndex(), computedTileProp, false) === 2 }, { illegal: model.canPutMeeplesOnTile(controller.currentPlayerIndex(), computedTileProp, false) === 1 }, { selectedArea: store.context.selectedTile.id === computedTileProp.id && store.context.selectedTileArea === rf.TILE_ACTION_AREA }]" @click="localClickedtileArea(rf.TILE_ACTION_AREA, true, model.canPutMeeplesOnTile(controller.currentPlayerIndex(), computedTileProp, false) === 2)" :d="computedTileProp.upgraded === 0 ? 'M-200 -260 l0 230 l200 0 l0 -75 l200 0 l0 -155 Z' : 'M-200 -260 l0 230 l200 0 l0 -75 l200 0 l0 -155 Z'" />
			<!-- Meeples on the tile -->
			<g v-for="(row, idx) in computedTileProp.meeplesOnTile" :key="idx">
				<g v-for="(meepleColourEntry, idx2) in row" :key="idx2">
					<image class="meepleOnTileImg" :class="{ turnStartMeepleGlow: view.shouldAddStartTurnGlow(1, tileProp.id, [idx, computedTileProp.meeplesOnTile.length]) }" :xlink:href="view.getImage('meeple_' + String(meepleColourEntry))" :x="-300 + idx2 * 120" :y="-40 + idx * 120" width="120" height="120" />
				</g>
			</g>

			<!-- Bidding areas -->
			<g v-if="computedTileProp.season !== rf.SEASON_BOAT_TILE">
				<g v-for="(biddingArea, idx) in computedTileProp.biddingAreas" :key="idx">
					<!-- Add colour splash -->
					<path
						d="M-200,346.41
             Q-200,450 -100,450
             Q0,450 100,450
             Q200,450 200,346.41
             L200,346.41 L-200,346.41 Z"
						:fill="biddingArea.colour"
						stroke="black"
						class="biddingArea"
						:class="[{ startTurnGlow: view.shouldAddStartTurnGlow(0, tileProp.id, biddingArea.playerIndex) }, { currentArea: biddingArea.currentArea }, { highlighted: idx === controller.currentPlayerIndex() && biddingArea.canBid }, { selectedArea: idx === controller.currentPlayerIndex() && store.context.selectedTile.id === computedTileProp.id && store.context.selectedTileArea === rf.TILE_BIDDING_AREA }, { illegalBiddingArea: biddingArea.strokeForBiddingArea === 'red' }]"
						@click="localClickedtileArea(rf.TILE_BIDDING_AREA, idx === controller.currentPlayerIndex() /*&& computedTileProp.highlightForBid*/, biddingArea.canBid)"
						:transform="`rotate(${biddingArea.rotation} 0 0)`"
						:style="{
							stroke: biddingArea.strokeForBiddingArea,
						}" />
					<!--<ellipse
						:cx="biddingArea.cx"
						:cy="biddingArea.cy"
						:rx="biddingArea.rx"
						:ry="biddingArea.ry"
						:fill="biddingArea.colour"
						class="biddingArea"
						:class="[{ currentArea: biddingArea.currentArea }, { highlighted: idx === controller.currentPlayerIndex() && biddingArea.canBid }, { selectedArea: idx === controller.currentPlayerIndex() && store.context.selectedTile.id === computedTileProp.id && store.context.selectedTileArea === rf.TILE_BIDDING_AREA }]"
						@click="localClickedtileArea(rf.TILE_BIDDING_AREA, idx === controller.currentPlayerIndex() /*&& computedTileProp.highlightForBid*/, biddingArea.canBid)"
						:transform="`rotate(${biddingArea.rotation} ${biddingArea.cx} ${biddingArea.cy})`"
						:style="{
							stroke: biddingArea.strokeForBiddingArea,
						}" />-->

					<!-- Add meeples to bidding area -->
					<g v-if="biddingArea.meepleAmount > 0">
						<image
							@click="localClickedMeeple(biddingArea.playerIndex)"
							class="meepleOnBidAreaImg"
							:class="biddingArea.shadowFilter"
							:xlink:href="view.getImage('meeple_' + String(biddingArea.coreMeepleColour))"
							:x="biddingArea.meepleX"
							:y="biddingArea.meepleY"
							width="150"
							height="150"
							:style="{
								pointerEvents: rf.ACT_MEEPLE_HIGHLIGHTING.includes(store.context.action) ? 'auto' : 'none',
							}" />

						<g v-if="biddingArea.meepleAmount > 1">
							<text :x="biddingArea.meepleX + 30" :y="biddingArea.meepleY + 120" class="biddingMeepleText">
								{{ biddingArea.meepleAmount }}
							</text>
						</g>
					</g>
				</g>
			</g>
		</svg>
	</div>
</template>

<style scoped>
.availableTileDiv {
	display: inline-block;
	vertical-align: middle;
}

.availableTileSVG {
	width: 100%;
	height: 100%;
	/*background-color: aliceblue;*/
}

.tilePolygon {
	stroke: black;
	stroke-width: 8;
}
.selectableTile {
	stroke: yellow;
	stroke-width: 30;
}
.selectableTile:hover {
	stroke: lightgreen;
}

.biddingArea {
	stroke-width: 8;
}

/*.biddingArea.currentArea {
	stroke-width: 30;
}*/

.biddingArea.highlighted {
	stroke-width: 30;
	stroke: yellow;
}
.biddingArea.highlighted:hover {
	stroke: lightgreen !important;
}

.actionArea {
	fill: black;
	fill-opacity: 0;
	pointer-events: visiblePainted;
}

.actionArea.highlighted {
	stroke: yellow;
	stroke-width: 32;
}
.actionArea.highlighted:hover {
	stroke: lightgreen !important;
}

.actionArea.illegal {
	stroke: red;
	stroke-width: 32;
	fill: black;
	fill-opacity: 0;
}
.illegalBiddingArea {
	stroke: red;
	stroke-width: 32;
}
.selectedArea {
	stroke: lightgreen !important;
	stroke-width: 32;
}

.biddingMeepleText {
	font-size: 150px;
	font-weight: bolder;
	stroke-width: 10;
	stroke: white;
	fill: black;
	cursor: default;
	pointer-events: none;
}

.meepleOnBoatImg {
	width: 100px;
	height: 100px;
	pointer-events: none;
	filter: drop-shadow(2px 2px 0 black) drop-shadow(-2px 2px 0 black) drop-shadow(-2px -2px 0 black) drop-shadow(2px -2px 0 black);
}

.skillTileOnBoatImg {
	width: 100px;
	height: 100px;
	pointer-events: none;
	filter: drop-shadow(4px 4px 0 black) drop-shadow(-4px 4px 0 black) drop-shadow(-4px -4px 0 black) drop-shadow(4px -4px 0 black);
}

.cabinOnBoatImg {
	width: 100px;
	height: 100px;
	pointer-events: none;
	filter: drop-shadow(4px 4px 0 white) drop-shadow(-4px 4px 0 white) drop-shadow(-4px -4px 0 white) drop-shadow(4px -4px 0 white);
}

.contractOnBoatImg {
	width: 200px;
	height: 100px;
	pointer-events: none;
	filter: drop-shadow(4px 4px 0 white) drop-shadow(-4px 4px 0 white) drop-shadow(-4px -4px 0 white) drop-shadow(4px -4px 0 white);
}

.itemOnBoatImg {
	width: 100px;
	height: 100px;
	pointer-events: none;
}
.meepleOnTileImg {
	stroke: none;
	stroke-width: 0;
	filter: drop-shadow(4px 4px 0 black) drop-shadow(-4px 4px 0 black) drop-shadow(-4px -4px 0 black) drop-shadow(4px -4px 0 black);
}

.meepleOnBidAreaImg {
	stroke: "none";
	stroke-width: 0;
	filter: drop-shadow(4px 4px 0 black) drop-shadow(-4px 4px 0 black) drop-shadow(-4px -4px 0 black) drop-shadow(4px -4px 0 black);
}

.selectableBidMeeple {
	filter: drop-shadow(8px 8px 0 yellow) drop-shadow(-8px 8px 0 yellow) drop-shadow(-8px -8px 0 yellow) drop-shadow(8px -8px 0 yellow);
}

.selectableBidMeeple:hover {
	filter: drop-shadow(8px 8px 0 lightgreen) drop-shadow(-8px 8px 0 lightgreen) drop-shadow(-8px -8px 0 lightgreen) drop-shadow(8px -8px 0 lightgreen);
}

.unselectable {
	pointer-events: none;
}

.startTurnGlow {
	animation: glow 0.8s infinite alternate;
	/*background-size: 200% 100%; /* Make the gradient twice the size of the element */
}

@keyframes glow {
	to {
		/*opacity: 0.3;
		background-color: yellow;*/
		/*background-position: 100% 0; /* Shift the gradient to the right */
		fill: yellow;
	}
}

.turnStartMeepleGlow {
	animation: glowMeeple 0.8s infinite alternate;
}

@keyframes glowMeeple {
	to {
		filter: drop-shadow(8px 8px 0 yellow) drop-shadow(-8px 8px 0 yellow) drop-shadow(-8px -8px 0 yellow) drop-shadow(8px -8px 0 yellow);
	}
}

</style>
