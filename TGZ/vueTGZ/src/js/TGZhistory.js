import * as map from "./TGZmap"
import * as funcs from "./TGZfuncs"
import * as rf from "./TGZreference"
import * as controller from "./TGZcontroller"

import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"
import { nextTick } from "vue"

/*
  performStep
  goToReplayStep
  setupHistoryHighlightSquares
  
*/

export function performStep(amount) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.clearHistoryHelpers()
	if (amount === -99) store.replayStep = 0
	if (amount === -9) store.replayStep -= 5
	if (amount === -1) store.replayStep--
	if (amount === 1) store.replayStep++
	if (amount === 9) store.replayStep += 5
	if (amount === 99) store.replayStep = store.replayData.length - 1

	if (store.replayStep < 0) store.replayStep = 0
	if (store.replayStep > store.replayData.length - 1) store.replayStep = store.replayData.length - 1

	// Performing back to my last
	if (amount === -999) {
		let idx = store.replayStep
		idx--
		while (idx > 0) {
			let histEntry = store.history[idx]
			if (histEntry[1] === personal.pov) {
				store.replayStep = idx
				break
			}
			idx--
		}
	}

	funcs.importModel(store.replayData[store.replayStep])

	setupHistoryHighlightSquares(store.history[store.replayStep][0], store.history[store.replayStep][3])
	if (store.topMenuViews.showingPlayerIndex !== -1) store.topMenuViews.showingPlayerIndex = controller.currentPlayerIndex()
}

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	funcs.importModel(store.replayData[store.replayStep])

	setupHistoryHighlightSquares(store.history[store.replayStep][0], store.history[store.replayStep][3])
}

export async function setupHistoryHighlightSquares(action, entry3) {
	const store = useModelStore()
	store.historyHelpers.indexesToHighlightGreen.splice(0)
	store.clearHistoryHelpers()
	await nextTick()
	if (action === rf.HIST_BUILD_MON || action === rf.HIST_BUILD_FIRST_MON) store.historyHelpers.indexesToHighlightGreen = [...entry3]
	else if (action === rf.HIST_CHOOSE_ANYANWU_MON) store.historyHelpers.indexesToHighlightGreen = [...entry3]
	else if (action === rf.HIST_BUILD_RESOURCE) store.historyHelpers.indexesToHighlightGreen = [entry3[0]]
	else if (action === rf.HIST_BUILD_WATER) {
		if (entry3[1] === 0) store.historyHelpers.indexesToHighlightGreen = [entry3[0], entry3[0] + 1]
		else if (entry3[1] === 1) store.historyHelpers.indexesToHighlightGreen = [entry3[0], entry3[0] + map.getSw()]
	} else if (action === rf.HIST_BUILD_CRAFTSMAN) {
		if (rf.FOUR_SIZE_TILES.includes(entry3[1])) store.historyHelpers.indexesToHighlightGreen = [entry3[0], entry3[0] + 1, entry3[0] + map.getSw(), entry3[0] + map.getSw() + 1]
		else if (entry3[2] === 0) store.historyHelpers.indexesToHighlightGreen = [entry3[0], entry3[0] + 1]
		else if (entry3[2] === 1) store.historyHelpers.indexesToHighlightGreen = [entry3[0], entry3[0] + map.getSw()]
	} else if (action === rf.HIST_RAISE_MON) {
		let sqs = []
		sqs.push(entry3[0][0])
		for (let i = 1; i < entry3.length; i++) {
			for (let j = 0; j < entry3[i].length; j++) {
				if (entry3[i][j][0] >= 0) {
					if (j % 2 === 0) {
						let craftsmanData = map.getCraftsmanDataFromAnySq(entry3[i][j][0], true)
						if (rf.FOUR_SIZE_TILES.includes(craftsmanData[1])) sqs = sqs.concat([entry3[i][j][0], entry3[i][j][0] + 1, entry3[i][j][0] + map.getSw(), entry3[i][j][0] + map.getSw() + 1])
						else if (craftsmanData[2] === 0) sqs = sqs.concat([entry3[i][j][0], entry3[i][j][0] + 1])
						else if (craftsmanData[2] === 1) sqs = sqs.concat([entry3[i][j][0], entry3[i][j][0] + map.getSw()])
					} else {
						if (typeof entry3[i][j] === "object") sqs.push(...entry3[i][j])
						else sqs.push(entry3[i][j])
					}
				}
			}
		}
		store.historyHelpers.indexesToHighlightGreen = sqs
	} else if (action === rf.HIST_BUILD_OYA_MON) {
		let sqs = []
		sqs.push(entry3[0])
		for (let i = 1; i < entry3.length; i++) {
			for (let j = 0; j < entry3[i].length; j++) {
				if (j % 2 === 0) {
					let craftsmanData = map.getCraftsmanDataFromAnySq(entry3[i][j][0], true)
					if (rf.FOUR_SIZE_TILES.includes(craftsmanData[1])) sqs = sqs.concat([entry3[i][j][0], entry3[i][j][0] + 1, entry3[i][j][0] + map.getSw(), entry3[i][j][0] + map.getSw() + 1])
					else if (craftsmanData[2] === 0) sqs = sqs.concat([entry3[i][j][0], entry3[i][j][0] + 1])
					else if (craftsmanData[2] === 1) sqs = sqs.concat([entry3[i][j][0], entry3[i][j][0] + map.getSw()])
				} else {
					if (typeof entry3[i][j] === "object") sqs.push(...entry3[i][j])
					else sqs.push(entry3[i][j])
				}
			}
		}
		store.historyHelpers.indexesToHighlightGreen = sqs
	}
}
