<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in XXXmap.js
 *  Functions to do with changing the game state should probably be in XXXmodel.js
 *
 */
import MapActionArea from "./MapActionArea.vue"
import ZOCpanel from "./ZOCpanel.vue"
import ZoomPanel from "./ZoomPanel.vue"
//import * as view from "../js/AQYview.js"
import * as map from "../js/AQYmap"
import * as rf from "../js/AQYreference"
import * as country from "../js/AQYcountry"
import * as city from "../js/AQYcity.js"
import * as controller from "../js/AQYcontroller.js"
import * as Bot from "../js/AQYbot.js"
//import * as model from "../js/AQYmodel.js"

import ResourceTable from "./ResourceTable.vue"

import { watch /*, ref*/ } from "vue"

import { useModelStore } from "../stores/AQYstore.js"
import { hexToPixel } from "../js/AQYmap.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()
import { ref } from "vue"
import * as IO from "../backend/AQY_IO"

const mapResRefSize = ref(88)

function hexCenter(hex) {
	let p = hexToPixel(hex)
	return `translate(${p.x.toFixed(0)},${p.y.toFixed(0)})`
}

function mountainPipCenter(hex) {
	let p = hexToPixel(hex)
	return `translate(${(p.x - 20).toFixed(0)},${(p.y - 30).toFixed(0)})`
}

function hexExplorerCenter(hex) {
	let p = hexToPixel(hex)
	return `translate(${(p.x - 30).toFixed(0)},${(p.y - 30).toFixed(0)})`
}

function hexResourcesCenter(hex, anchorHex, hexId, anchorHexId, refHexId) {
	let p = hexToPixel(hex)
	let resWidth = (((store.refSize / 160) * mapResRefSize.value) / store.canvasSize) * 648

	// Quick exit for no pull
	if (!store.permanentSettings.pullResToMan) return `translate(${p.x - resWidth / 2},${p.y - resWidth / 2})`

	let commonSide = map.findCommonSide(hex, anchorHex)

	// No common side means it must be the anchor hex
	//if (commonSide === -1 && !refHexId) return `translate(${p.x - resWidth / 2},${p.y - resWidth / 2})`
	if (commonSide === -1 && refHexId == undefined) return `translate(${p.x - resWidth / 2},${p.y - resWidth / 2})`

	if (commonSide === -1) commonSide = map.findCommonSide(hex, map.getHexDataFromID(refHexId).hex)
	// The detault value is -30

	let deltaX = 0
	let deltaY = 0
	// Up
	if (commonSide === 0) {
		deltaX = -resWidth / 2
		deltaY = -resWidth + resWidth / 7
	}
	// Down
	else if (commonSide === 3) {
		deltaX = -resWidth / 2
		deltaY = -resWidth / 7
	}
	// UR
	else if (commonSide === 1) {
		deltaX = -resWidth / 3
		deltaY = -resWidth + resWidth / 3
	}
	// DL
	else if (commonSide === 4) {
		deltaX = -resWidth + resWidth / 3
		deltaY = -resWidth / 3
	}
	// DR
	else if (commonSide === 2) {
		deltaX = -resWidth / 3
		deltaY = -resWidth / 4
	}
	// UL
	else if (commonSide === 5) {
		deltaX = -resWidth + resWidth / 3
		deltaY = -resWidth + resWidth / 3
	}

	return `translate(${(p.x + deltaX).toFixed(0)},${(p.y + deltaY).toFixed(0)})`
	//return `translate(${p.x  - ((((store.refSize / 160) * mapResRefSize.value) / store.canvasSize) * 648) / 2},${p.y  - ((((store.refSize / 160) * mapResRefSize.value) / store.canvasSize) * 648) / 2})`
}

function hexPollutionCenter(pollutionID) {
	let hex = map.getHexDataFromID(pollutionID).hex
	let p = hexToPixel(hex)
	return `translate(${(p.x - 0).toFixed(0)},${(p.y - 0).toFixed(0)})`
}

function hexWorkerCenter(hex) {
	let p = hexToPixel(hex)
	return `translate(${(p.x - mapResRefSize.value / 3.6).toFixed(0)},${(p.y - mapResRefSize.value / 2).toFixed(0)})`
}

function fisheryCenter(fishery, isFishery) {
	const hex1 = fishery[0].hex
	const hex2 = fishery[1].hex
	let rotation,
		offsetX,
		offsetY = 0

	if (isFishery) {
		if (hex1.q == hex2.q) {
			if (hex1.r < hex2.r) {
				// Move down to center
				rotation = 3
				offsetX = (-mapResRefSize.value * 5) / 12
				offsetY = (mapResRefSize.value * 5) / 48
			} else {
				// Move up to center
				rotation = -3
				offsetX = (mapResRefSize.value * 5) / 12
				offsetY = (-mapResRefSize.value * 5) / 48
			}
		}

		if (hex1.r === hex2.r) {
			if (hex1.q > hex2.q) {
				// move up left
				rotation = 7
				offsetX = (mapResRefSize.value * 5) / 48
				offsetY = -(mapResRefSize.value * 5) / 12
			} else {
				// move down right
				rotation = 1
				offsetX = (-mapResRefSize.value * 5) / 48
				offsetY = (mapResRefSize.value * 5) / 12
			}
		}

		if (hex1.s === hex2.s) {
			if (hex1.q > hex2.q) {
				// Move down left
				rotation = 5
				offsetX = (-mapResRefSize.value * 5) / 16
				offsetY = (-mapResRefSize.value * 5) / 16
			} else {
				// Move up right
				rotation = -1
				offsetX = (mapResRefSize.value * 5) / 16
				offsetY = (mapResRefSize.value * 5) / 16
			}
		}
	}

	// Worker position FRON FIRST HEX
	if (!isFishery) {
		if (hex1.q == hex2.q) {
			if (hex1.r < hex2.r) {
				// Move DOWN to center
				rotation = 0
				offsetX = mapResRefSize.value / 3.4
				offsetY = -mapResRefSize.value / 2.5
			} else {
				// move UP to center
				rotation = 0
				offsetX = mapResRefSize.value / 3.4
				offsetY = mapResRefSize.value / 0.93
			}
		}

		if (hex1.r === hex2.r) {
			if (hex1.q > hex2.q) {
				// move up RIGHT
				rotation = 7
				offsetX = mapResRefSize.value / 1.9
				offsetY = -mapResRefSize.value / 17
			} else {
				// move down LEFT
				rotation = 1
				offsetX = -mapResRefSize.value / 1.9
				offsetY = mapResRefSize.value / 17
			}
		}

		if (hex1.s === hex2.s) {
			if (hex1.q > hex2.q) {
				// Move Down Left
				rotation = -1
				offsetX = mapResRefSize.value / 1
				offsetY = -mapResRefSize.value / 4
			} else {
				// Move up right
				rotation = 5
				offsetX = -mapResRefSize.value / 1
				offsetY = mapResRefSize.value / 4
			}
		}
	}

	let p = hexToPixel(hex1)
	return `translate(${(p.x - offsetX).toFixed(0)},${(p.y - offsetY).toFixed(0)}) rotate(${rotation * 30})`
}

function hexClicked(hex) {
	//alert(JSON.stringify(hex.hex))
}

function clickedHexSelection(tile) {
	store.clearMessages()
	store.newlyExplorerResource = rf.RES_NONE

	let confirmEndTurn = false
	// FIRST CITY
	if (store.context.action === rf.ACT_PLACE_FIRST_CITY) {
		city.createFirstCity(controller.currentPlayerIndex(), tile.hex)
		confirmEndTurn = true
	}
	// WOODCUTTER / MINE / INN / FISHERY
	else if (store.context.action === rf.ACT_PLACE_COUNTRYSIDE_BLDG) {
		if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE) {
			store.historyHelpers.hexesToOutlineGreen.push(tile)
			let neighbours = store.mapNeighbours[tile.id]

			for (let i = 0; i < neighbours.length; i++) {
				let hexData = map.getHexDataFromID(neighbours[i])
				// Target hex should not be occupied or polluted
				if (hexData.terrainType === rf.TERR_MOUNTAINS && !country.hexOccupied(neighbours[i]) && !country.hexPolluted(neighbours[i])) {
					store.historyHelpers.hexesToOutlineBlue.push(map.getHexDataFromID(neighbours[i]))
				}
			}
		}

		country.placeBuilding(controller.currentPlayerIndex(), tile)
	}
	// NEW CITY
	else if (store.context.action === rf.ACT_PLACE_COUNTRYSIDE_CITY) {
		city.payAndCreateNewCity(controller.currentPlayerIndex(), tile.hex, store.context.newCityPayment)
	}
	// POLLUTION
	else if (store.context.action === rf.ACT_PLACE_COUNTRYSIDE_POLLUTION) {
		country.placePollution(tile, controller.currentPlayerIndex())
	}
	// REMOVE POLLUTION
	else if (store.context.action === rf.ACT_REMOVE_COUNTRYSIDE_POLLUTION) {
		country.removePollution(tile, controller.currentPlayerIndex())
	}
	// HARVEST
	else if (store.context.action === rf.ACT_HARVEST) {
		if (store.gameflow.phase === rf.PHASE_HARVEST) {
			country.harvestResources(tile, controller.currentPlayerIndex())
			country.getResourcesHexesForHarvest(controller.currentPlayerIndex())
		} else if (store.gameflow.phase === rf.PRE_PHASE_HARVEST) {
			country.harvestResources(tile, personal.pov)
			country.getResourcesHexesForHarvest(personal.pov)
		}
	}
	// EXPLORE
	else if (store.context.action === rf.ACT_EXPLORE) {
		if (store.gameflow.phase === rf.PHASE_EXPLORE) {
			country.exploreTile(tile, controller.currentPlayerIndex(), false)
			controller.endPlayerTurn()
		} else if (store.gameflow.phase === rf.PRE_PHASE_EXPLORE) {
			IO.savePreTurn(rf.PRE_PHASE_EXPLORE, [tile.id])
		}
	}

	if (!store.context.noReset) {
		store.clearVars()
	}

	// Set up post-vars-clear data
	if (confirmEndTurn) store.context.action = rf.ACT_CONFIRM_END_TURN

	// Update zoom panel
	updateZoomPanelFromLayer45orAbove(tile.id)
}

function getBuildingIcon(playerIndex, building) {
	let colourNum = personal.getCorrectedColour(store.players[playerIndex].colour)
	if (building === rf.COUNTRYSIDE_BLDG_CITY) return `city_${colourNum}`
	if (building.type === rf.COUNTRYSIDE_BLDG_INN) return `c_inn_${colourNum}`
}


function getResourcesFromBuilding(building) {
	if (building.resources.length > 0) return building.resources
}

watch(
	() => store.context.pollutionLeftToPlace,
	() => {
		if (store.context.pollutionLeftToPlace > 0) {
			let zoc = []
			if (store.gameflow.phase === rf.PRE_PHASE_POLLUTION) zoc = country.getPollutionPlacementZonePRETURN(personal.pov)
			else zoc = country.getPollutionPlacementZone(controller.currentPlayerIndex())

			if (zoc.length === 0 && store.context.pollutionLeftToPlace > 0) {
				if (store.gameflow.phase === rf.PRE_PHASE_POLLUTION) {
					rf.doAdminAlrt("ERROR: should not switch to graves in pre phase")
					return
				}
				// Set the number of graves to place
				store.context.gravesLeftToPlace = store.context.pollutionLeftToPlace
				city.startGravePlacement(controller.currentPlayerIndex())

				if (!store.context.cityIndexesToHighlightClick.some((citySpots) => citySpots.length > 0)) {
					if (store.context.gravesLeftToPlace > 0) {
						Bot.actionGraveGameOver()
						return
					}
				}

				store.context.pollutionLeftToPlace = 0
				store.topMenuViews.showingPlayerIndex = controller.currentPlayerIndex()
			}

			store.context.hexesToHighlight = zoc
		} else store.historyHelpers.hexesToOutlineRed.splice(0)
	}
)

/*   store.context.pollutionLeftToPlace = pollutionLeftToPlace;
}*/

// This needs to be here as it is used to DISPLAY zoc
function getZOCstrokeColour(colNum, fromPlayerIndex) {
	if (fromPlayerIndex) colNum = store.players[colNum].colour
	let correctedColNum = personal.getCorrectedColour(colNum)
	if (correctedColNum === 0) return "rgb(52, 90, 151)" //"blue"
	if (correctedColNum === 1) return "purple"
	if (correctedColNum === 2) return "red"
	if (correctedColNum === 3) return "yellow"
}

function getUniqueHexFill(playerIndex) {
	let colNum = store.players[playerIndex].colour
	let correctedColNum = personal.getCorrectedColour(colNum)
	if (correctedColNum === 0) return "rgb(52, 90, 151)" //"blue"
	if (correctedColNum === 1) return "purple"
	if (correctedColNum === 2) return "red"
	if (correctedColNum === 3) return "yellow"
}

// THIS HAS BEEN MOVED INTO THE BELOW FUNCTION
// JUST LEAVE THE MOUSEOVER CODE FOR NOW IN CASE
// IT NEEDS TO BE RESTORED BACK INTO EVERY LAYER
/*function updateZoomPanel(hexID) {
	if (hexID === 99) return
	return
}*/

// THIS ALSO REMOVES THE BLUE HEXES
function updateZoomPanelFromLayer45orAbove(hexID) {
	// REMOVE BLUE HEXES
	store.context.hexesToHighlightBlueTopLayer.splice(0)

	// If nothing to change, return
	if (store.zoomPanelInfo.hexID === hexID) return

	store.clearZoomPanel()
	store.zoomPanelInfo.hexID = hexID
	// First, set the base terrain
	let tile = map.getHexDataFromID(hexID)
	store.zoomPanelInfo.terrainType = tile.terrainType
	// Woodcutter turned forest to grass, just set to grass. No - grass is different colour
	//if (store.zoomPanelInfo.terrainType === 4) store.zoomPanelInfo.terrainType = 1

	// Add the mountain type
	store.zoomPanelInfo.mountainType = tile.mountainType

	// Check for explorer. If it exists, then return after
	// as nothing can be on top of it
	//const showExplorer = Object.values(store.mapData.explorers).some((explorer) => explorer.id === hexID)
	const showExplorer = store.mapData.explorers.includes(hexID)
	if (showExplorer) {
		store.zoomPanelInfo.showExplorer = true
		return
	}
	// Check for inn. If it exists, then return after
	// as nothing can be on top of it

	const innPlayer = store.players.find((player) => player.countrysideBuildings.some((building) => building.hexId === hexID && building.type === rf.COUNTRYSIDE_BLDG_INN))
	if (innPlayer != undefined) {
		store.zoomPanelInfo.innColourToShow = personal.getCorrectedColour(innPlayer.colour)
		return
	}

	// Check for pollution. Other things may be on top
	//store.zoomPanelInfo.showPollution = Object.values(store.mapData.pollution).some((pollution) => pollution.hexId === hexID)
	if (store.permanentSettings.showPollutionUnderRes && store.mapData.pollution.includes(hexID)) store.zoomPanelInfo.showPollution = true
	else if (!store.permanentSettings.showPollutionUnderRes) store.zoomPanelInfo.showPollution = map.shouldShowPollution(hexID) === 2

	// Check to show Res and man
	for (const player of store.players) {
		const targetBuilding = player.countrysideBuildings.find((building) => building.resources.some((resource) => resource.hexId === hexID))
		if (targetBuilding) {
			store.zoomPanelInfo.resToShow = targetBuilding.resources[0].resType
			if (targetBuilding.hexId === hexID) store.zoomPanelInfo.manColourToShow = personal.getCorrectedColour(player.colour)
			return
		}
	}

	// finally, check for fisheries
	for (const player of store.players) {
		let fisheries = country.getFisheries(player.countrysideBuildings, true)
		// See if the hexID is in a fishery
		let foundFishery = fisheries.find((subarray) => subarray.includes(hexID))
		if (foundFishery) {
			let commonSide = map.findCommonSide(map.getHexDataFromID(foundFishery[0]).hex, map.getHexDataFromID(foundFishery[1]).hex)
			if (hexID === foundFishery[1]) commonSide = (commonSide + 3) % 6
			store.zoomPanelInfo.fisherySide = commonSide
			store.zoomPanelInfo.manColourToShow = personal.getCorrectedColour(player.colour)
			return
		}
	}
}

function removeBlueTopLayerHexes() {
	store.context.hexesToHighlightBlueTopLayer.splice(0)
}

function mouseOverHexSelection(tile) {
	updateZoomPanelFromLayer45orAbove(tile.id)
	if (store.gameflow.phase === rf.PHASE_FIRST_CITY) {
		// Put the neighbours into the blue layer
		let neighbours = store.mapNeighbours[tile.id]
		for (let i = 0; i < neighbours.length; i++) {
			store.context.hexesToHighlightBlueTopLayer.push(map.getHexDataFromID(neighbours[i]))
		}
	} else if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING) {
		let neighbours = store.mapNeighbours[tile.id]
		let requiredTerrain = [-50]
		if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_WOODCUTTER) requiredTerrain = [rf.TERR_FOREST]
		else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE) requiredTerrain = [rf.TERR_MOUNTAINS]
		else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM) requiredTerrain = [rf.TERR_PLAINS, rf.TERR_GRASS]
		else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FISHERY) requiredTerrain = [rf.TERR_WATER]
		// IF ADDING RESOURCE BUILDING
		if (requiredTerrain[0] >= 0) {
			for (let i = 0; i < neighbours.length; i++) {
				let hexData = map.getHexDataFromID(neighbours[i])
				// Target hex should not be occupied or polluted
				if (requiredTerrain.includes(hexData.terrainType) && !country.hexOccupied(neighbours[i]) && !country.hexPolluted(neighbours[i])) store.context.hexesToHighlightBlueTopLayer.push(hexData)
			}
		}
		// ELSE IF ADDING CITY
		else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_CITY) {
			for (let i = 0; i < neighbours.length; i++) store.context.hexesToHighlightBlueTopLayer.push(map.getHexDataFromID(neighbours[i]))
		}
		// ELSE IF DOING FAC ALCH
		else if (store.context.action === rf.ACT_REMOVE_COUNTRYSIDE_POLLUTION) {
			for (let i = 0; i < neighbours.length; i++) {
				//if (Object.values(store.mapData.pollution).some((pollution) => pollution.hexId === neighbours[i])) {
				if (store.mapData.pollution.includes(neighbours[i])) {
					let hexData = map.getHexDataFromID(neighbours[i])
					// ONLY PUSH IF NO RESOURCES
					if (!country.hexOccupied(hexData.id)) store.context.hexesToHighlightBlueTopLayer.push(hexData)
				}
			}
		}
	}
}

function mouseoverOOB() {
	store.context.hexesToHighlightBlueTopLayer.splice(0)
	store.zoomPanelInfo.hexID = -1
}

function getResourceIconID(icon) {
	if (store.topMenuViews.resourceIconType === 0) return icon
	if (store.topMenuViews.resourceIconType === 1) return icon + "_border"
}

function getExplorerID() {
	if (store.topMenuViews.resourceIconType === 0) return "explorer"
	if (store.topMenuViews.resourceIconType === 1) return "explorer_border"
}

function doZoom(e) {
	if (!e.ctrlKey) {
		return // Exit the function if CTRL key is not pressed
	}

	let dir = 0

	e.preventDefault()
	e.stopPropagation()

	if (e.deltaY < 0) {
		dir++
	} else {
		dir--
	}

	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 40

	if (store.refSize < 120) {
		store.refSize = 120
		doSave = false
	} else if (store.refSize > 500) {
		store.refSize = 500
		doSave = false
	} else clearInterval(personal.zoomInterval)
	if (doSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom()
		}, 1000)
	}
	map.calculateCanvasSize()
}
</script>

<template>
	<template v-if="rf.COUNTRY_PHASES.includes(store.gameflow.phase) && !store.topMenuViews.showReplay">
		<ResourceTable :playerIndexProp="store.gameflow.turnOrder[0]" class="mapActionAreaResTableDiv" />
	</template>
	<MapActionArea />
	<div id="mapAndZocPanelDiv">
		<div
			id="mapCanvasDiv"
			:style="{
				width: store.canvasWidth + 'px',
				height: store.canvasHeight + 'px',
			}"
			v-if="!store.topMenuViews.generatingReplay">
			<svg id="mapSVG" :viewBox="map.getViewbox()">
				<!-- MAP LAYER MINUS 1 -- Just a big rect to cover the area, to detect the mouse moving OFF the map -->
				<rect @mouseover="mouseoverOOB" :x="map.getMinX()" :y="map.getMinY()" width="150%" height="150%" fill="blue" fill-opacity="0" />

				<!-- MAP LAYER 0 - THE BIG HEX, ROTATED AS REQUIRED-->
				<path
					v-for="(entry, index) in store.mapData.seed"
					:key="index"
					class="bigHexPath"
					:fill="`url(#tile-${index})`"
					width="100%"
					height="100%"
					:d="map.getBigHexD(store.currentLayout.imageOffsets[index][0], store.currentLayout.imageOffsets[index][1])"
					:style="`

                    transform: rotate(${entry[1] * 60}deg);
                    transform-box: fill-box;
                    transform-origin: center;
                `"></path>

				<!-- MAP LAYER 1 - COLOURED HEX LAYER, ROTATED AS REQUIRED-->

				<!-- Display Grass -- THIS IS ALL NOW DONE FROM THE TERRAIN-HEX-TERRAINTYPE -->
				<g v-for="(item, idx) in store.mapData.grass" :key="idx">
					<g v-if="map.shouldShowGrass(map.getHexDataFromID(item[0]))">
						<polygon :points="map.getHexPoints()" :transform="hexCenter(map.getHexDataFromID(item[0]).hex)" class="hexPolygon" :fill="`url(#hex_grass_${item[1]})`"></polygon>
					</g>
				</g>

				<!-- ADD COLOUR OVERLAY-->
				<g v-for="tile in store.mapData.hexes" :key="tile.id">
					<polygon :id="'hex' + tile.id" :class="store.topMenuViews.showFullColourHex === 1 ? 'halfOpacity' : ''" :points="map.getHexPoints()" :transform="hexCenter(tile.hex)" class="hexPolygon" :fill="map.getTerrainColor(tile)" />
					<!-- WHILST ITERATING, MIGHT AS WELL ADD MOUNTAIN INDICTATORS -->
					<circle v-if="tile.mountainType === rf.MOUNTAIN_STONE || tile.mountainType === rf.MOUNTAIN_GOLD" :transform="mountainPipCenter(tile.hex)" cx="0" cy="0" r="10" :fill="tile.mountainType === rf.MOUNTAIN_GOLD ? 'gold' : 'lightgray'" stroke="black" stroke-width="2" />
				</g>

				<!-- ADD MAP OBJECTS TOGGLE-->
				<g v-if="store.topMenuViews.showMapObjects">
					<!--MAP LAYER 2 - HEX CONTENTS LAYER, eg fishery, city, pollution, etc-->

					<g v-for="(hexID, exIdx) in store.mapData.explorers" :key="exIdx">
						<rect :points="map.getHexPoints()" width="60px" height="60px" :transform="hexExplorerCenter(map.getHexDataFromID(hexID).hex)" :fill="`url(#${getExplorerID()})`" />
					</g>

					<!-- POLLUSOIN -->
					<g v-for="(pollutionID, idx) in store.mapData.pollution" :key="idx">
						<g v-if="map.shouldShowPollution(pollutionID) >= 1">
							<circle v-if="map.shouldShowPollution(pollutionID) === 1" :r="(((store.refSize / 160) * 55) / store.canvasSize) * 648" :transform="hexPollutionCenter(pollutionID)" class="pollutionCircle" />
							<circle v-if="map.shouldShowPollution(pollutionID) === 2" :r="(((store.refSize / 240) * 55) / store.canvasSize) * 648" :transform="hexPollutionCenter(pollutionID)" class="pollutionCircle" />
						</g>
					</g>

					<!-- Resources -->
					<g v-for="(player, playerIndex) in store.players" :key="playerIndex">
						<g v-for="(building, csIdx) in player.countrysideBuildings" :key="csIdx">
							<rect
								v-for="(res, resIdx) in getResourcesFromBuilding(building)"
								:class="{ mannedResRect: [rf.COUNTRYSIDE_BLDG_FARM, rf.COUNTRYSIDE_BLDG_MINE, rf.COUNTRYSIDE_BLDG_WOODCUTTER].includes(building.type) && building.hexId === res.hexId }"
								:key="resIdx"
								:width="(((store.refSize / 160) * mapResRefSize) / store.canvasSize) * 648"
								:height="(((store.refSize / 160) * mapResRefSize) / store.canvasSize) * 648"
								:transform="hexResourcesCenter(res.hex, building.hex, res.hexId, building.hexId, building.refHexId)"
								:fill="`url(#${getResourceIconID(res.icon)})`"
								:style="{
									//stroke: personal.getCorrectedColourHex(store.players[playerIndex].colour),
									stroke: 'black',
								}"></rect>
						</g>

						<!-- Cities -->
						<g v-for="(city, cityIdx) in player.cities" :key="cityIdx">
							<path
								class="cityHexPath"
								:fill="`url(#${getBuildingIcon(playerIndex, rf.COUNTRYSIDE_BLDG_CITY)})`"
								width="100%"
								height="100%"
								:d="map.getCityD()"
								:transform="hexCenter(city.hex)"
								:style="{
									'transform-box': 'fill-box',
									'transform-origin': 'center',
									stroke: personal.getCorrectedColourHex(store.players[playerIndex].colour),
								}" />
						</g>

						<g v-for="(fishery, index) in country.getFisheries(player.countrysideBuildings, false)" :key="index">
							<rect
								fill="url(#c_fishery)"
								:style="{
									width: (mapResRefSize * 5) / 3 + 'px',
									height: (mapResRefSize * 2.5) / 3 + 'px',
								}"
								:transform="fisheryCenter(fishery, true)" />
							<!-- FISHERY WORKERS-->
							<rect
								class="workerTransparency"
								:style="{
									fill: personal.getCorrectedColourHex(store.players[playerIndex].colour),
									width: mapResRefSize / 1.7 + 'px',
									height: mapResRefSize / 1.7 + 'px',
								}"
								:transform="fisheryCenter(fishery, false)" />
						</g>

						<g v-for="(building, csIdx) in player.countrysideBuildings" :key="csIdx">
							<!-- INNS -->
							<polygon
								v-if="building.type === rf.COUNTRYSIDE_BLDG_INN"
								class="polygonInn"
								:points="map.getHexPoints()"
								:transform="hexCenter(building.hex)"
								:fill="`url(#${getBuildingIcon(playerIndex, building)})`"
								:style="{
									stroke: personal.getCorrectedColourHex(store.players[playerIndex].colour),
								}" />

							<!-- NON-FISHERY WORKERS-->
							<rect
								v-if="[rf.COUNTRYSIDE_BLDG_FARM, rf.COUNTRYSIDE_BLDG_MINE, rf.COUNTRYSIDE_BLDG_WOODCUTTER].includes(building.type) && building.refHexId == undefined"
								class="workerTransparency"
								:style="{
									fill: personal.getCorrectedColourHex(store.players[playerIndex].colour),
									width: mapResRefSize / 1.7 + 'px',
									height: mapResRefSize / 1.7 + 'px',
								}"
								:transform="hexWorkerCenter(building.hex)" />
						</g>
					</g>
				</g>
				<!-- END SHOW MAP OBJECTS TOGGLE-->

				<!--MAP LAYER 3 - ZOC LAYER, draw the ZOC in this layer It needs to be capable of showing glowing hexes, or a solid outline (maybe both?)-->
				<!-- THIS IS NOT USED AT THE MOMENT -->
				<g>
					<path
						v-for="(ZOCpath, idx) in store.ZOCpaths"
						:key="idx"
						width="100%"
						height="100%"
						:d="ZOCpath[1]"
						:style="{
							stroke: getZOCstrokeColour(ZOCpath[0]),
							'transform-box': 'fill-box',
							'transform-origin': 'center',
							'stroke-dashoffset': String(ZOCpath[0] * 2 * 0),
							'stroke-dasharray': String(10 + ZOCpath[0] * 0) + ',' + String(10 * 0 + ZOCpath[0] * 0),
							'stroke-linecap': 'butt',
							'stroke-linejoin': 'round',
							'stroke-width': String(20 - 0 * idx) + 'px',
						}" />
				</g>

				<!-- ZOC WITH MULTIPLES -->
				<g v-for="(entry, idx1) in store.ZOCpathsWithMultiples" :key="idx1">
					<!-- Single entry, so whole line in one colour -->
					<g v-if="entry[0].length === 1">
						<path
							width="100%"
							height="100%"
							:d="entry[1]"
							:style="{
								stroke: getZOCstrokeColour(entry[0][0], true),
								'transform-box': 'fill-box',
								'transform-origin': 'center',
								'stroke-linecap': 'butt',
								'stroke-linejoin': 'round',
								'stroke-width': String(20) + 'px',
							}" />
					</g>
					<g v-if="entry[0].length > 1">
						<path
							v-for="(playerIndex, idx2) in entry[0]"
							:key="idx2"
							width="100%"
							height="100%"
							:d="entry[1]"
							:style="{
								stroke: getZOCstrokeColour(playerIndex, true),
								'transform-box': 'fill-box',
								'transform-origin': 'center',
								'stroke-dashoffset': String((((store.refSize / store.canvasSize) * 300) / entry[0].length) * idx2), // Offsets INITIAL pattern start
								'stroke-dasharray': String(((store.refSize / store.canvasSize) * 300) / entry[0].length) + ',' + String(((store.refSize / store.canvasSize) * 300) / 2), // dash len - gap len
								'stroke-linecap': 'butt',
								'stroke-linejoin': 'round',
								'stroke-width': String(20 - 0 * idx1 * 1) + 'px',
							}" />
					</g>
				</g>
				<!-- ZOC UNIQUES -->
				<g v-for="(entry, idx1) in store.ZOCuniqueData" :key="idx1">
					<g v-for="(hexID, idx2) in entry" :key="idx2">
						<polygon class="ZOCuniquePolygon" :points="map.getHexPoints()" :transform="hexCenter(map.getHexDataFromID(hexID).hex)" :fill="getUniqueHexFill(idx1)" />
					</g>
				</g>

				<!-- ZOC OVERLPS --- FIRST MAKE THE DEFS -->
				<defs v-for="(entry, idx) in store.ZOCoverlapData" :key="idx">
					<linearGradient v-if="entry.length - 1 === 2" :id="'ZOCoverlapFill' + String(idx)" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop
							offset="0%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[1]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="50%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[1]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="50%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[2]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="100%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[2]].colour),
								'stop-opacity': 1,
							}" />
					</linearGradient>
					<linearGradient v-else-if="entry.length - 1 === 3" :id="'ZOCoverlapFill' + String(idx)" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop
							offset="0%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[1]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="33%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[1]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="33%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[2]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="67%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[2]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="67%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[3]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="100%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[3]].colour),
								'stop-opacity': 1,
							}" />
					</linearGradient>
					<linearGradient v-else-if="entry.length - 1 === 4" :id="'ZOCoverlapFill' + String(idx)" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop
							offset="0%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[1]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="33%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[1]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="33%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[2]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="50%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[2]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="50%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[3]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="66%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[3]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="66%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[4]].colour),
								'stop-opacity': 1,
							}" />
						<stop
							offset="100%"
							:style="{
								'stop-color': getZOCstrokeColour(store.players[entry[4]].colour),
								'stop-opacity': 1,
							}" />
					</linearGradient>
				</defs>
				<g v-for="(entry, idx) in store.ZOCoverlapData" :key="idx">
					<polygon class="ZOCoverlapPolygon" :points="map.getHexPoints()" :transform="hexCenter(map.getHexDataFromID(entry[0]).hex)" :fill="`url(#ZOCoverlapFill${idx})`" />
				</g>

				<!-- MAP LAYERS 3.9 - Note Hex IDs-->
				<g v-if="store.topMenuViews.showNoteHexIDs">
					<g v-for="tile in store.mapData.hexes" :key="tile.id">
						<text v-if="tile?.noteID >= 0" x="0" y="20" :transform="hexCenter(tile.hex)" fill="white" font-size="55" font-weight="bolder" stroke="black" stroke-width="1.5" text-anchor="middle">
							{{ tile.noteID }}
						</text>
					</g>
				</g>

				<!--MAP LAYER 4 - HISTORY HIGHLIGHT LAYER, eg click on a history entry, makes the hex / fishery / city etc glow etc-->
				<g v-for="(tile, idx) in store.historyHelpers.hexesToHighlightYellow" :key="idx">
					<polygon class="hexHighlightPolygon polygonYellow" :points="map.getHexPoints()" :transform="hexCenter(tile.hex)" />
				</g>
				<g v-for="(tile, idx) in store.historyHelpers.hexesToHighlightBlue" :key="idx">
					<polygon class="hexHighlightPolygon polygonBlue" :points="map.getHexPoints()" :transform="hexCenter(tile.hex)" />
				</g>
				<g v-for="(tile, idx) in store.historyHelpers.hexesToHighlightRed" :key="idx">
					<polygon class="hexHighlightPolygon polygonRed" :points="map.getHexPoints()" :transform="hexCenter(tile.hex)" />
				</g>

				<!-- MAP LAYER 4.4 -- JUST BENEATH SEE THROUGH LAYER. OUTLINE HEXES TO DENOTE UNABLE POLLUTION, MINE SELECTOR -->
				<g v-for="tile in store.historyHelpers.hexesToOutlineRed" :key="tile.id">
					<polygon
						:points="map.getHexPoints()"
						:transform="hexCenter(tile.hex)"
						class="layer44polygon outlineRed"
						:style="{
							'stroke-width': String((store.refSize / 6 / store.canvasSize) * 500) + 'px',
						}" />
				</g>
				<g v-for="tile in store.historyHelpers.hexesToOutlineBlue" :key="tile.id">
					<polygon
						:points="map.getHexPoints()"
						:transform="hexCenter(tile.hex)"
						class="layer44polygon outlineBlue"
						:style="{
							'stroke-width': String((store.refSize / 6 / store.canvasSize) * 500) + 'px',
						}" />
				</g>
				<g v-for="tile in store.historyHelpers.hexesToOutlineGreen" :key="tile.id">
					<polygon
						:points="map.getHexPoints()"
						:transform="hexCenter(tile.hex)"
						class="layer44polygon outlineGreen"
						:style="{
							'stroke-width': String((store.refSize / 6 / store.canvasSize) * 500) + 'px',
						}" />
				</g>

				<!-- MAP LAYER 4.5 -- JUST BENEATH HEX SELECTION, BUT ON TOP OF ALL GFXS -- CHECK FOR MOUSE OFF SELECTION, SET UP ZOOM PANEL -->
				<g v-for="tile in store.mapData.hexes" :key="tile.id">
					<!-- removed @wheel="doZoom"  -->
					<polygon @click="hexClicked(tile)" @mouseover="updateZoomPanelFromLayer45orAbove(tile.id)" :id="'hex' + tile.id" :points="map.getHexPoints()" :transform="hexCenter(tile.hex)" class="layer45polygon" />
				</g>
				<!--MAP LAYER 5 - SELECTION LAYER, eg click this hex to build / pollute / explore, etc-->
				<g v-for="(tile, idx) in store.context.hexesToHighlight" :key="idx">
					<polygon
						:class="[
							{
								hexSelectionPolygon: tile.isDiscardGoods == null || tile.isDiscardGoods === false,
							},
							{
								hexDiscardPolygon: tile.isDiscardGoods != null && tile.isDiscardGoods === true,
							},
						]"
						:points="map.getHexPoints(true)"
						:transform="hexCenter(tile.hex)"
						@click="clickedHexSelection(tile)"
						@mouseover="mouseOverHexSelection(tile)"
						:style="{
							'stroke-width': String((store.refSize / 6 / store.canvasSize) * 500) + 'px',
						}" />
				</g>

				<!-- MAP LAYER 6 - BLUE HEXES OVER SELECTION !!!!!! CAUTION !!!!! THIS SHOULD NEVER BLOCK THE SELECTION LAYER -->
				<g v-for="(tile, idx) in store.context.hexesToHighlightBlueTopLayer" :key="idx">
					<!-- THIS V-IF CAN BE REMOVED. LEFT AS A REMINDER OF THE CHANGE -->
					<polygon
						class="blueTopLayePolyton"
						:points="map.getHexPoints(true)"
						:transform="hexCenter(tile.hex)"
						@mouseover="removeBlueTopLayerHexes()"
						:style="{
							'stroke-width': String((store.refSize / 6 / store.canvasSize) * 500) + 'px',
						}" />
				</g>
			</svg>
		</div>
		<div id="ZoomAndZOCpanelsDiv">
			<ZoomPanel />
			<ZOCpanel />
		</div>
	</div>
	<div id="resLineDiv">
		<template v-for="idx in Array.from({ length: store.players.length }, (_, idx) => idx)" :key="idx">
			<ResourceTable :playerIndexProp="idx" class="resTableLine" />
		</template>
	</div>
</template>

<style scoped>
#ZoomAndZOCpanelsDiv {
	display: inline-block;
}
#mapAndZocPanelDiv {
	display: flex;
	width: fit-content;
	margin: auto;
}
#mapCanvasDiv {
	position: relative;
	padding: 0px;
	width: fit-content;
	/*background-color: aliceblue;*/
	display: inline-block;
}

#mapSVG {
	margin: 0 auto;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
}

.bigHexPath {
	stroke: black;
	stroke-width: 5;
}

.cityHexPath {
	stroke-width: 15px;
}

.hexPolygon {
	pointer-events: visiblePainted;
	/* fill: hsla(60, 12%, 95%, 0);*/
	stroke: black;
	cursor: pointer;
}

.ZOCoverlapPolygon {
	pointer-events: visiblePainted;
	/* fill: hsla(60, 12%, 95%, 0);*/
	stroke: none;
	cursor: pointer;
	opacity: 0.5;
}

.ZOCuniquePolygon {
	pointer-events: visiblePainted;
	/* fill: hsla(60, 12%, 95%, 0);*/
	stroke: none;
	cursor: pointer;
	opacity: 0.5;
}

.halfOpacity {
	fill-opacity: 0.4;
}

.workerTransparency {
	fill-opacity: 0.8;
}

.layer44polygon {
	fill: none;
}

.outlineRed {
	stroke: red;
}
.outlineGreen {
	stroke: lightgreen;
}
.outlineBlue {
	stroke: blue;
}

.layer45polygon {
	fill: blue;
	fill-opacity: 0;
	stroke-width: 0;
}

.hexHighlightPolygon {
	stroke: black;
	stroke-width: 0px;
	fill-opacity: 1;
	pointer-events: visiblePainted;
	cursor: default;
	animation: glow 0.6s infinite alternate;
}

.polygonYellow {
	fill: yellow;
}
.polygonBlue {
	fill: blue;
}
.polygonRed {
	fill: red;
}

.hexSelectionPolygon {
	stroke: yellow;
	fill: white;
	fill-opacity: 0;
	pointer-events: visiblePainted;
}

.hexSelectionPolygon:hover {
	stroke: lightgreen;
	cursor: pointer;
}

.hexDiscardPolygon {
	stroke: red;
	fill: white;
	fill-opacity: 0;
	pointer-events: visiblePainted;
}

.hexDiscardPolygon:hover {
	stroke: lightgreen;
	cursor: pointer;
}

.blueTopLayePolyton {
	stroke: blue;
	fill: white;
	fill-opacity: 0;
	pointer-events: visiblePainted;
}

.zocPlacement {
	fill: none;
	stroke: none;
	stroke-width: 0px;
	z-index: 150;
	fill-opacity: 0.5;
	pointer-events: visiblePainted;
	cursor: default;
}

.yellow {
	fill: yellow !important;
	opacity: 0.3;
}

.chooseResDiv {
	display: inline-block;
	width: 200px;
	height: 180px;
	border: 2px solid yellow;
	vertical-align: middle;
	margin-right: 5px;
}

.chosenResDiv {
	display: inline-block;
	width: 200px;
	height: 180px;
	border: 2px solid green !important;
	vertical-align: middle;
	margin-right: 5px;
}

.chooseResDiv:hover {
	border-color: lightgreen;
}

.chooseResImg {
	height: 150px;
}

.mapActionAreaResTableDiv {
	margin-top: 8px;
}
.resTableLine {
	margin-top: 8px;
	margin-right: 8px;
}
.polygonInn {
	stroke-width: 15px;
}
.mannedResRect {
	stroke-width: 5px;
}

.pollutionCircle {
	fill: black;
	stroke: white;
	stroke-width: 3px;
	opacity: 0.5;
}

@keyframes glow {
	to {
		opacity: 0.3;
	}
}
</style>
