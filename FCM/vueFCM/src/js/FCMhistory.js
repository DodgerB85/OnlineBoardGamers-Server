/*  */
import * as rf from "./FCMreference"
import * as funcs from "./FCMfuncs"
import * as map from "./FCMmap"

import { useModelStore } from "../stores/FCMstore.js"

export function setupHistoryHighlight(action, entry3, entry_id) {
	const store = useModelStore()
	store.clearHistoryHelpers()
	const squares = []

	if (action === rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION || action === rf.HIST_OPEN_RESTAURANT) {
		// 2x2 restaurant block, as replayAddStartingResto / replayAddResto
		const restoIndex = funcs.importIndex(entry3[0])
		squares.push(restoIndex, restoIndex + 1, restoIndex + rf.ssW, restoIndex + rf.ssW + 1)
	} else if (action === rf.HIST_MOVE_RESTAURANT) {
		const newRestoIndex = funcs.importIndex(entry3[0])
		const oldRestoIndex = funcs.importIndex(entry3[1])
		squares.push(newRestoIndex, newRestoIndex + 1, newRestoIndex + rf.ssW, newRestoIndex + rf.ssW + 1)
		squares.push(oldRestoIndex, oldRestoIndex + 1, oldRestoIndex + rf.ssW, oldRestoIndex + rf.ssW + 1)
	} else if (action === rf.HIST_BUILD_HOUSE) {
		const houseIndex = funcs.importIndex(entry3[0])
		// Old entries omitted rotation for the common case; missing means 1 (landscape)
		let rotation = entry3.length > 2 ? entry3[2] : 1
		if (rotation === true) rotation = 1
		if (rotation === false) rotation = 0
		const sideways = rotation === 1 || rotation === 3
		const height = sideways ? 2 : 3
		const width = sideways ? 3 : 2
		for (let i = 0; i < height; i++) for (let j = 0; j < width; j++) squares.push(houseIndex + j + rf.ssW * i)
	} else if (action === rf.HIST_BUILD_GARDEN) {
		const gardenIndex = funcs.importIndex(entry3[0])
		let rotated = true
		if (entry3.length > 2 && entry3[2] === 0) rotated = false
		squares.push(gardenIndex)
		if (!rotated) squares.push(gardenIndex + 1)
		else squares.push(gardenIndex + rf.ssW)
	} else if (action === rf.HIST_ADD_FREEWAY) {
		const index = funcs.importIndex(entry3[0])
		const rotated = entry3[1] === 1
		const sides = entry3[2] === 1
		let highlightIndex = index
		if (sides) {
			if (map.isIndexOnLeftEdgeOfMap(index, 1)) {
				highlightIndex--
				if (!rotated) squares.push(highlightIndex, highlightIndex - 1, highlightIndex - 2)
				else if (rotated) squares.push(highlightIndex, highlightIndex + rf.ssW, highlightIndex + rf.ssW * 2)
			} else {
				highlightIndex++
				if (!rotated) squares.push(highlightIndex, highlightIndex + 1, highlightIndex + 2)
				else if (rotated) squares.push(highlightIndex, highlightIndex + rf.ssW, highlightIndex + rf.ssW * 2)
			}
		} else if (!sides) {
			if (map.isIndexOnBottomEdgeOfMap(index, 1)) {
				highlightIndex += rf.ssW
				if (!rotated) squares.push(highlightIndex, highlightIndex + 1, highlightIndex + 2)
				else if (rotated) squares.push(highlightIndex, highlightIndex + rf.ssW, highlightIndex + rf.ssW * 2)
			} else {
				highlightIndex -= rf.ssW
				if (!rotated) squares.push(highlightIndex, highlightIndex + 1, highlightIndex + 2)
				else if (rotated) squares.push(highlightIndex, highlightIndex - rf.ssW, highlightIndex - rf.ssW * 2)
			}
		}
	} else if (action === rf.HIST_LOBBYIST_PARK) {
		let parkIndex = funcs.importIndex(entry3[0])
		const parkVariety = entry3[1]
		let rotation = 0
		let flipped = false
		if (entry3.length >= 3) rotation = entry3[2]
		if (entry3.length >= 4) flipped = entry3[3] === 1
		const parkModel = rf.getParkModel(parkVariety, rotation, flipped)
		if (parkModel[0][0] === 0 && parkModel[0][1] === 0) parkIndex -= 2
		else if (parkModel[0][0] === 0) parkIndex -= 1
		for (let y = 0; y < parkModel.length; y++) for (let x = 0; x < parkModel[y].length; x++) if (parkModel[y][x] === 1) squares.push(parkIndex + x + store.mapData.dimensions[0] * 5 * y)
	} else if (action === rf.HIST_LOBBYIST_ROAD) {
		const roadIndex = funcs.importIndex(entry3[0])
		const roadVariety = entry3[1]
		let rotation = 0
		if (entry3.length >= 3) rotation = entry3[2]
		if (roadVariety !== 2) {
			let roadLength = 2
			if (roadVariety === 1) roadLength = 4
			if (rotation === 0) for (let i = 0; i < roadLength; i++) squares.push(roadIndex + i)
			else if (rotation === 1) for (let i = 0; i < roadLength; i++) squares.push(roadIndex + rf.ssW * i)
		} else if (roadVariety === 2) {
			if (rotation !== 2) squares.push(roadIndex)
			if (rotation !== 3) squares.push(roadIndex + 1)
			if (rotation !== 0) squares.push(roadIndex + rf.ssW + 1)
			if (rotation !== 1) squares.push(roadIndex + rf.ssW)
		}
	} else if (action === rf.HIST_NEW_TILE) {
		const tileIndex = funcs.importIndex(entry3[0])
		squares.push(tileIndex)
		for (let i = 0; i < store.mapData.coords.length; i++) if (i !== tileIndex && map.onTheSameTile(tileIndex, i)) squares.push(i)
	} else if (action === rf.HIST_COFFE_SHOP_BUILD || action === rf.HIST_COFFE_SHOP_REMOVE) {
		const coffeShopIndex = funcs.importIndex(entry3[0])
		squares.push(coffeShopIndex)
	} else if (action === rf.HIST_PIZZA_BOMB) {
		const radioIndex = funcs.importIndex(entry3[0])
		squares.push(radioIndex)
	} else if (action === rf.HIST_START_MARKETING_CAMPAIGN) {
		const campaignNumber = entry3[0]
		const campaignIndex = funcs.importIndex(entry3[1])
		let paramIdx = 3
		//let campaignEmployee = -1
		if (campaignNumber <= 3 || campaignNumber >= 17) {
			//if (campaignNumber <= 3) campaignEmployee = rf.BRAND_DIRECTOR
			//else if (campaignNumber >= 17 && campaignNumber <= 20) campaignEmployee = rf.GOURMET_FOOD_CRITIC
			//else if (campaignNumber >= 21 && campaignNumber <= 24) campaignEmployee = rf.RURAL_MARKETEER
		} else {
			//campaignEmployee = entry3[paramIdx]
			paramIdx++
		}
		let campaignRotated = 0
		if (rf.ROTATABLE_CAMPAIGNS.includes(campaignNumber)) {
			campaignRotated = entry3[paramIdx]
			paramIdx++
		}
		let height = rf.MARKETING_CAMPAIGNS[campaignNumber].height
		let width = rf.MARKETING_CAMPAIGNS[campaignNumber].width
		if (campaignNumber === 4) [width, height] = [height, width]
		if (campaignRotated === 1) [width, height] = [height, width]
		let highlightIndex = campaignIndex
		if (rf.MARKETING_CAMPAIGNS[campaignNumber].type === rf.AIRPLANE) {
			if (campaignRotated === 1) {
				let widthOnLeft = width
				if (widthOnLeft === 2) widthOnLeft = 1
				if (map.isIndexOnLeftEdgeOfMap(campaignIndex, widthOnLeft)) highlightIndex -= 1 * width
				else if (!map.isIndexOnLeftEdgeOfMap(campaignIndex, widthOnLeft)) highlightIndex += 1
			} else {
				let widthOnBottom = width
				if (entry3[1] === 4) widthOnBottom = 1
				if (map.isIndexOnBottomEdgeOfMap(campaignIndex, widthOnBottom)) highlightIndex += rf.ssW
				else if (!map.isIndexOnBottomEdgeOfMap(campaignIndex, widthOnBottom)) highlightIndex -= rf.ssW * height
			}
		}
		if (campaignNumber <= 16) {
			for (let i = 0; i < height; i++) for (let j = 0; j < width; j++) squares.push(highlightIndex + j + rf.ssW * i)
		} else if (campaignNumber >= 25 && campaignNumber <= 27) {
			squares.push(...funcs.importIndexes(entry3[1]))
		}
	} else if (action === rf.HIST_START_NS_CAMPAIGN) {
		// Final highlight state
		const campaignIndex = funcs.importIndex(entry3[1])
		squares.push(campaignIndex)
	} else if (action === rf.HIST_RESTO_MAILBOX_MS) {
		const campaignNumber = entry3[0]
		const campaignIndex = funcs.importIndex(entry3[1])
		squares.push(campaignIndex)
		if (campaignNumber === 7 || campaignNumber === 8) squares.push(campaignIndex + 1, campaignIndex + rf.ssW, campaignIndex + rf.ssW + 1)
	}

	store.historyHelpers.indexesToHighlightYellow = squares
}
