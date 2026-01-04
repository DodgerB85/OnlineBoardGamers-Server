import * as map from "./CNSmap"
import * as rf from "./CNSreference"

import hexlib from "./hexlib"

import { useModelStore } from "../stores/CNSstore.js"
import { nextTick } from "vue"

export async function setupHistoryHighlight(action, entry3) {
	const store = useModelStore()
	store.clearHistoryHelpers()
	await nextTick()

	if (action === rf.HIST_ADD_HEX) {
		for (let i = 0; i < entry3.length; i++) {
			store.historyHelpers.hexesToHighlight.push({ hex: new hexlib.Hex(entry3[i][2][0], entry3[i][2][1], map.calculateScoord(entry3[i][2][0], entry3[i][2][1])) })
		}
	} else if (action === rf.HIST_ADD_LINK) {
		for (let i = 0; i < entry3.length; i++) {
			if (entry3[i].length === 2) store.historyHelpers.linksToHighlight.push([{ hex: new hexlib.Hex(entry3[i][0][0], entry3[i][0][1], map.calculateScoord(entry3[i][0][0], entry3[i][0][1])) }, { hex: new hexlib.Hex(entry3[i][1][0], entry3[i][1][1], map.calculateScoord(entry3[i][1][0], entry3[i][1][1])) }])
			else if (entry3[i].length === 4) {
				// remove link
				store.historyHelpers.linksToHighlightRed.push([{ hex: new hexlib.Hex(entry3[i][0][0], entry3[i][0][1], map.calculateScoord(entry3[i][0][0], entry3[i][0][1])) }, { hex: new hexlib.Hex(entry3[i][1][0], entry3[i][1][1], map.calculateScoord(entry3[i][1][0], entry3[i][1][1])) }])
				// readd link
				store.historyHelpers.linksToHighlightGreen.push([{ hex: new hexlib.Hex(entry3[i][2][0], entry3[i][2][1], map.calculateScoord(entry3[i][2][0], entry3[i][2][1])) }, { hex: new hexlib.Hex(entry3[i][3][0], entry3[i][3][1], map.calculateScoord(entry3[i][3][0], entry3[i][3][1])) }])
			}
		}
	} else if (action === rf.HIST_ADD_CIGAR) {
		store.historyHelpers.linksToHighlight.push([{ hex: new hexlib.Hex(entry3[0][0], entry3[0][1], map.calculateScoord(entry3[0][0], entry3[0][1])) }, { hex: new hexlib.Hex(entry3[1][0], entry3[1][1], map.calculateScoord(entry3[1][0], entry3[1][1])) }])
	} else if (action === rf.HIST_PIRATE_MOVIE) {
		let hexData = map.reconstructHexFromHexRef(entry3[entry3.length - 1])
		store.historyHelpers.hexesToHighlight.push({ hex: hexData })
	} else if (action === rf.HIST_MOVE_PIRATE) {
		let hexData = map.reconstructHexFromHexRef(entry3[0])
		store.historyHelpers.hexesToHighlight.push({ hex: hexData })
	}
}
