/** History Functions
 *  Generally handles clicks to a history entry
 * So this sets up the appropriate flashing highlights in the game
 *
 *
 *
 */

import * as map from "./AQYmap"
import * as city from "./AQYcity"
//import * as funcs from './AQYfuncs'
import * as rf from "./AQYreference"
//import * as controller from './AQYcontroller'

//import hexlib from "./hexlib.js"

import { useModelStore } from "../stores/AQYstore.js"
import { nextTick } from "vue"

export async function setupHistoryHighlight(action, entry3, entry_id) {
	const store = useModelStore()
	store.clearHistoryHelpers()
	store.clearVars()
	await nextTick()

	if (action === rf.HIST_FIRST_CITY) {
		store.topMenuViews.showingPlayerIndex = -1

		// Add city hex
		store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[0]))
		let neighbours = store.mapNeighbours[entry3[0]]
		for (let i = 0; i < neighbours.length; i++) {
			store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(neighbours[i]))
		}
	} else if (action === rf.HIST_CITY_BUILD) {
		// Add the indexes
		let playerIndex = store.history[entry_id][1]
		store.topMenuViews.showingPlayerIndex = playerIndex

		let player = store.players[playerIndex]
		// Entries 0,1,2 == built, moved, manned -- SO JUST DO BUILT AND MANNED
		// BUILT HISTORY
		for (let i = 0; i < entry3[0].length; i++) {
			//if (entry3[i].length > 0) {
			//	for (let j = 0; j < entry3[i].length; j++) {
			//		if (entry3[i][j].length === 0) break
			/*let cityIndex = 0
					let bldgIndex = 0*/
			// Find and highlight the unique building
			/*if (rf.BLDG_UNIQUE.includes(entry3[i][j][0])) {
						player.cities.forEach((city, cityIdx) => {
							const buildingIdx = city.buildings.findIndex((building) => building.bldgNum === entry3[i][j][0])
							if (buildingIdx !== -1) {
								cityIndex = cityIdx
								bldgIndex = buildingIdx
							}
						})
						let bldgInfo = player.cities[cityIndex].buildings[bldgIndex]
						//store.historyHelpers.citySquaresToHighlight[playerIndex][cityIndex].push(bldgInfo.index)
						let indexes = city.getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, bldgInfo.index, bldgInfo.bldgNum, bldgInfo.rotation, false, false)
						store.historyHelpers.citySquaresToHighlight[playerIndex][cityIndex] = store.historyHelpers.citySquaresToHighlight[playerIndex][cityIndex].concat(indexes)
					} else {*/

			// get correct indexes for non-unique building -- USE FOR ALL BLDGS IN CASE MOVED
			let bldgNum = entry3[0][i][0]
			let cityIndex = entry3[0][i][1]
			let index = entry3[0][i][2]
			let rotation = 0
			if (rf.BLDG_ROTATABLE.includes(bldgNum)) rotation = entry3[0][i][3]
			//const bldgInfo = player.cities[cityIndex].buildings.find((building) => building.bldgNum === entry3[0][i][0] && building.index === entry3[0][i][2])
			let indexes = []
			//if (bldgNum !== rf.BLDG_STORAGE) indexes = city.getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, bldgInfo.index, bldgInfo.bldgNum, bldgInfo.rotation, false, false)
			//else indexes = city.getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, bldgInfo.index, bldgInfo.bldgNum, [bldgInfo.width, bldgInfo.height], false, false)

			if (bldgNum !== rf.BLDG_STORAGE) indexes = city.getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, rotation, false, false)
			else indexes = city.getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, [entry3[0][i][3][0], entry3[0][i][3][1]], false, false)

			store.historyHelpers.citySquaresToHighlight[playerIndex][cityIndex] = store.historyHelpers.citySquaresToHighlight[playerIndex][cityIndex].concat(indexes)
			//}
			//}
			//}
		}
		// Now do MOVED
		for (let j = 0; j < entry3[1].length; j++) {
			// get correct indexes for non-unique building -- USE FOR ALL BLDGS IN CASE MOVED
			let bldgNum = entry3[1][j][0]
			let cityIndex = entry3[1][j][2][0]
			let index = entry3[1][j][2][1]
			let rotation = 0
			if (rf.BLDG_ROTATABLE.includes(bldgNum)) rotation = entry3[1][j][2][2]
			let indexes = []

			if (bldgNum !== rf.BLDG_STORAGE) indexes = city.getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, rotation, false, false)
			else indexes = city.getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, [entry3[1][j][1][2][0], entry3[1][j][1][2][1]], false, false)

			store.historyHelpers.citySquaresToHighlight[playerIndex][cityIndex] = store.historyHelpers.citySquaresToHighlight[playerIndex][cityIndex].concat(indexes)
		}
	}
	// POLLUTION
	else if (action === rf.HIST_ADD_POLLUTIONS) {
		store.topMenuViews.showingPlayerIndex = -1
		for (let i = 0; i < entry3[0].length; i++) {
			store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[0][i]))
		}
	}
	// POLLUTION + GRAVES
	else if (action === rf.HIST_ADD_POLLUIIONS_AND_GRAVES) {
		store.topMenuViews.showingPlayerIndex = -1
		for (let i = 0; i < entry3[0].length; i++) {
			store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[0][i]))
		}
		// Add the indexes
		let playerIndex = store.history[entry_id][1]
		//store.topMenuViews.showingPlayerIndex = playerIndex

		for (let i = 0; i < entry3[1].length; i++) {
			if (entry3[1][i].length > 0) {
				store.historyHelpers.citySquaresToHighlight[playerIndex][i] = store.historyHelpers.citySquaresToHighlight[playerIndex][i].concat(entry3[1][i])
			}
		}
	}
	// REMOVE POLLUTION
	else if (action === rf.HIST_REMOVE_POLLUTION) {
		store.topMenuViews.showingPlayerIndex = -1
		for (let i = 0; i < entry3.length; i++) {
			store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[i]))
		}
	} else if (action === rf.HIST_WOODCUTTER) {
		store.topMenuViews.showingPlayerIndex = -1
		// Add woodcutter hex
		store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[0]))
		// Highlight zone
		for (let i = 0; i < entry3[1].length; i++) {
			store.historyHelpers.hexesToHighlightBlue.push(map.getHexDataFromID(entry3[1][i]))
		}
	} else if (action === rf.HIST_MINE) {
		store.topMenuViews.showingPlayerIndex = -1
		// Add mine hex
		store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[2]))
		// Highlight zone
		for (let i = 0; i < entry3[3].length; i++) {
			store.historyHelpers.hexesToHighlightBlue.push(map.getHexDataFromID(entry3[3][i]))
		}
	} else if (action === rf.HIST_FARM) {
		store.topMenuViews.showingPlayerIndex = -1
		// Add farm hex
		store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[1]))
		// Highlight zone
		for (let i = 0; i < entry3[2].length; i++) {
			store.historyHelpers.hexesToHighlightBlue.push(map.getHexDataFromID(entry3[2][i]))
		}
	} else if (action === rf.HIST_FISHERY) {
		store.topMenuViews.showingPlayerIndex = -1
		// Add fishery hexes
		for (let i = 0; i < entry3[0].length; i++) {
			store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[0][i]))
		}
		// Highlight zone
		for (let i = 0; i < entry3[2].length; i++) {
			store.historyHelpers.hexesToHighlightBlue.push(map.getHexDataFromID(entry3[2][i]))
		}
	} else if (action === rf.HIST_INN) {
		store.topMenuViews.showingPlayerIndex = -1
		// Add inn hex
		store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[1]))
	} else if (action === rf.HIST_NEW_CITY) {
		store.topMenuViews.showingPlayerIndex = -1
		// Add city hex
		store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[0]))
		let neighbours = store.mapNeighbours[entry3[0]]
		for (let i = 0; i < neighbours.length; i++) {
			store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(neighbours[i]))
		}
	}
	// AUTO-HARVEST
	else if (action === rf.HIST_AUTO_HARVEST) {
		store.topMenuViews.showingPlayerIndex = -1
		for (let i = 0; i < entry3.length; i++) {
			if (entry3[i][2] === 1) store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[i][1]))
			else if (entry3[i][2] === 0) store.historyHelpers.hexesToHighlightRed.push(map.getHexDataFromID(entry3[i][1]))
		}
	}
	// MANUAL-HARVEST
	else if (action === rf.HIST_HARVEST) {
		store.topMenuViews.showingPlayerIndex = -1
		for (let i = 0; i < entry3.length; i++) {
			if (entry3[i][2] === 1) store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[i][1]))
			else if (entry3[i][2] === 0) store.historyHelpers.hexesToHighlightRed.push(map.getHexDataFromID(entry3[i][1]))
		}
	} else if (action === rf.HIST_EXPLORE) {
		store.topMenuViews.showingPlayerIndex = -1
		store.historyHelpers.hexesToHighlightYellow.push(map.getHexDataFromID(entry3[0]))
	}
	// Famine
	else if (action === rf.HIST_FAMINE) {
		// Add the indexes
		let playerIndex = store.history[entry_id][1]
		store.topMenuViews.showingPlayerIndex = playerIndex

		for (let i = 0; i < entry3.length; i++) {
			if (entry3[i].length > 0) {
				store.historyHelpers.citySquaresToHighlight[playerIndex][i] = store.historyHelpers.citySquaresToHighlight[playerIndex][i].concat(entry3[i])
			}
		}
	}
}
