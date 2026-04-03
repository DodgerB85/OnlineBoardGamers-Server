//import * as map from "./WEBmap"
//import * as funcs from "./WEBfuncs"
import * as rf from "./WEBreference"
//import * as controller from "./WEBcontroller"

import { useModelStore } from "../stores/WEBstore.js"
import { nextTick } from "vue"

export async function setupHistoryHighlight(action, entry3) {
	const store = useModelStore()
	store.clearHistoryHighlights()
	await nextTick()

	if (action === rf.HIST_ADD_TILE) {
		let index = entry3[0]
		let tileID = entry3[1]
		let rotation = entry3[2]
		if (rf.ALL_SQUARE_TILES.includes(tileID)) {
			store.historyHighlights.indexesToHighlight.push(index)
			store.historyHighlights.indexesToHighlight.push(index + 1)
			store.historyHighlights.indexesToHighlight.push(index + store.gridWidth)
			store.historyHighlights.indexesToHighlight.push(index + store.gridWidth + 1)
		} else if (rf.ALL_RECT_TILES.includes(tileID)) {
			store.historyHighlights.indexesToHighlight.push(index)
			if (rotation === 0) store.historyHighlights.indexesToHighlight.push(index + store.gridWidth)
			else store.historyHighlights.indexesToHighlight.push(index + 1)
		} else if (rf.ALL_CORNER_TILES.includes(tileID)) {
			if (rotation === 0) {
				store.historyHighlights.indexesToHighlight.push(index)
				store.historyHighlights.indexesToHighlight.push(index + store.gridWidth)
				store.historyHighlights.indexesToHighlight.push(index + store.gridWidth + 1)
			} else if (rotation === 1) {
				store.historyHighlights.indexesToHighlight.push(index)
				store.historyHighlights.indexesToHighlight.push(index + 1)
				store.historyHighlights.indexesToHighlight.push(index + store.gridWidth)
			} else if (rotation === 2) {
				store.historyHighlights.indexesToHighlight.push(index)
				store.historyHighlights.indexesToHighlight.push(index + 1)
				store.historyHighlights.indexesToHighlight.push(index + store.gridWidth + 1)
			} else if (rotation === 3) {
				store.historyHighlights.indexesToHighlight.push(index + 1)
				store.historyHighlights.indexesToHighlight.push(index + store.gridWidth)
				store.historyHighlights.indexesToHighlight.push(index + store.gridWidth + 1)
			}
		}
	} else if (action === rf.HIST_ADD_CABLE_TO_MAP) {
		if (entry3.length === 1) store.historyHighlights.cablesToHighlgiht.push([entry3[0], 0])
    else store.historyHighlights.cablesToHighlgiht.push([entry3[0], entry3[1]])
	}
}
