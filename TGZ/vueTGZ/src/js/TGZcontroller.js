import * as rf from "./TGZreference"
import * as map from "./TGZmap"
import * as funcs from "./TGZfuncs"
import * as IO from "./TGZ_IO.js"
import * as model from "./TGZmodel"
import * as Bot from "./TGZbot"
import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.topMenuViews.showReplay & (personal.pov != undefined)) {
			alert("CP() Error")
			alert(store.gameflow.turnOrder)
		}
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()

	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		if (!store.topMenuViews.showReplay) alert("CP() IDX Error")
		return 0
	}
}

export function canResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.trainingGame) return false
	if (personal.canPlay() && (store.gameflow.phase === rf.PHASE_BUILD || store.gameflow.phase === rf.PHASE_FIRST_MON)) return true
	return false
}

export function startPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.canPlay()) return
	// SHOULD ONLY BE HERE IF YOU CAN ACTUALLY PLAY

	// First Monumnet
	if (store.gameflow.phase === rf.PHASE_FIRST_MON) {
		store.context.action = rf.ACT_FIRST_MON
		store.context.monumentsToPlace = 1
		store.context.indexesToHighlightClick.splice(0)
		store.context.indexesToHighlightClick = map.getSpacesForMonument(false, true)
	}
	// Bid phase
	else if (store.gameflow.phase === rf.PHASE_BID) {
		store.context.action = rf.ACT_BID
	} else if (store.gameflow.phase === rf.PHASE_BUILD && currentPlayerObj().god[0] === rf.DZIVA) {
		store.context.action = rf.ACT_SET_PRICES
		store.context.choosingPrices = [...currentPlayerObj().craftsmenPrices]
	}

	// Save Reset
	store.wholeTurnResetData = funcs.exportModel()
}

export function ajaPlayerHasJustFreePassed() {
	const store = useModelStore()

	if (currentPlayerObj().god[0] !== rf.AJA) return false
	// NOTE: The HISTORY is placed BETWEEN the first and second check.

	let index = store.history.length - 1
	if (store.history[index][0] === rf.HIST_BID && store.history[index][1] === currentPlayerIndex() && store.history[index][3][0] === -3) return true
	

	return false
}

// DEFUNCT SCHISM AJA
/*export function ajaPlayerCanFreePass() {
	const store = useModelStore()

	if (currentPlayerObj().god[0] !== rf.AJA) return false
	// NOTE: The HISTORY is placed BETWEEN the first and second check.

	let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT]
	let index = store.history.length - 1
	while (entriesToIgnore.includes(store.history[index][0]) || store.history[index][0] === rf.HIST_BID) {
		// if already passed, then false
		if (store.history[index][0] === rf.HIST_BID && store.history[index][1] === currentPlayerIndex() && store.history[index][3][0] === -3) return false
		index--
	}

	return true
}*/

export function endPlayerTurn() {
	const store = useModelStore()

	store.resetTurnVars()

	// Check that there is more than 1 player left, otherwise end game
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) {
		// Only 1 player left, so end game
		store.gameflow.phase = rf.PHASE_GAME_OVER
		model.endGame()
		IO.saveGame(false)
		model.setupStatsMode()
		return
	}

	if (store.gameflow.phase === rf.PHASE_BID) {
		// If player passed, add them to newTurnOrder
		// DEFUNCT SCHISM AJA
		/*if (currentPlayerObj().god[0] === rf.AJA && ajaPlayerHasJustFreePassed()) {
			store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		} else*/ 
		if (store.context.selectedBid === 0) store.gameflow.turnOrder.shift()
		else {
			// Add cows to the bid
			store.ongoingVars.totalBids += parseInt(store.context.selectedBid)
			store.ongoingVars.currentBid = parseInt(store.context.selectedBid)
			store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		}

		// Action bot move here in case they are next, to remove them from the process
		Bot.actionAnyBotMoves()

		// Now auto place players who don't have enough cows
		while (store.gameflow.turnOrder.length > 1 && currentPlayerMustPass()) {
			// If aja doesn't get a free pass, then do a forced pass
			/*if (!ajaPlayerCanFreePass()) {*/
				for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
					if (store.ongoingVars.newTurnOrder[i] === -1) {
						store.ongoingVars.newTurnOrder[i] = currentPlayerIndex()
						model.addHistory(rf.HIST_BID, currentPlayerIndex(), 0, [-1, i])
						break
					}
				}
				store.gameflow.turnOrder.shift()
		/*	}*/
			// Otherwise, aja gets a free pass
			/*else {
				model.addHistory(rf.HIST_BID, currentPlayerIndex(), 0, [-3])
				store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
			}*/
		} // END auto-place players with not enough cows
		// Now check if only one player is left
		if (store.gameflow.turnOrder.length === 1) {
			model.addHistory(rf.HIST_BID, currentPlayerIndex(), 0, [-2])
			store.ongoingVars.newTurnOrder[0] = currentPlayerIndex()
			store.gameflow.turnOrder.shift()
		}
	} else {
		store.gameflow.turnOrder.shift()
	}
	store.clearVars()

	if (store.gameflow.turnOrder.length === 0) endCurrentPhase()

	Bot.actionAnyBotMoves()
	IO.saveGame(true)
} // End Player Turn

export function currentPlayerMustPass() {
	const store = useModelStore()

	if (currentPlayerObj().god[0] === rf.ELEGUA) {
		if (model.eleguaAvailable() && currentPlayerObj().cows + 3 > store.ongoingVars.currentBid) return false
		if (currentPlayerObj().cows > store.ongoingVars.currentBid) return false
		return true
	}

	//if (currentPlayerObj().god[0] === rf.AJA && ajaPlayerCanFreePass()) return false

	if (currentPlayerObj().god[0] !== rf.ELEGUA && currentPlayerObj().cows <= store.ongoingVars.currentBid) return true
	return false
}

export function endCurrentPhase() {
	const store = useModelStore()

	// DO END PHASE STUFF
	if (store.gameflow.phase === rf.PHASE_BID) {
		// Share the cows
		let cowsOnPlaques = model.getCowsOnPlaque(-1, 0)
		let idx = 0
		let histObj = new Array(store.players.length).fill(0)

		if (model.anyoneHasSHADIPINYI(false)) {
			store.players[model.anyoneHasSHADIPINYI(true)].cows += cowsOnPlaques[idx]
			histObj[model.anyoneHasSHADIPINYI(true)] += cowsOnPlaques[idx]
			idx++
		}
		for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
			let playerPbj = store.players[store.gameflow.fullTurnOrder[i]]
			playerPbj.cows += cowsOnPlaques[idx]
			histObj[store.gameflow.fullTurnOrder[i]] += cowsOnPlaques[idx]
			idx++
		}
		// Change turn order / vars
		store.gameflow.fullTurnOrder = [...store.ongoingVars.newTurnOrder]
		store.gameflow.turnOrder = [...store.ongoingVars.newTurnOrder]
		store.ongoingVars.newTurnOrder.splice(0)
		store.ongoingVars.currentBid = 0
		store.ongoingVars.totalBids = 0
		// histObj is in playerIndex order. So rearrange to fullTurnOrder
		let histObj2 = new Array(store.players.length).fill(0)
		let histObj3 = new Array(store.players.length).fill(0)

		for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
			histObj2[i] = histObj[store.gameflow.fullTurnOrder[i]]
			histObj3[i] = store.players[store.gameflow.fullTurnOrder[i]].cows
		}
		model.addHistory(rf.HIST_END_BIDS, -1, 0, [[...store.gameflow.fullTurnOrder], [...histObj2], [...histObj3]])
	}

	store.gameflow.phase++

	// SETUP NEW PHASE
	if (store.gameflow.phase === rf.PHASE_BID) {
		if (store.gameflow.turn === 0) {
			store.gameflow.turn = 1
			model.addHistory(rf.HIST_NEW_TURN, -1, 0, [store.gameflow.turn])
		}
		store.ongoingVars.newTurnOrder.splice(0)
		for (let i = 0; i < store.players.length; i++) store.ongoingVars.newTurnOrder.push(-1)
		store.ongoingVars.currentBid = 0
		store.ongoingVars.totalBids = 0

		// Reverse players for turn 1
		if (store.gameflow.turn === 1) store.gameflow.fullTurnOrder.reverse()
		else {
			// Calculate turn order - most VR first / first to get to that VR
			// is this done in model.newturncore
		}

		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	} else if (store.gameflow.phase === rf.PHASE_REVENUES) {
		let histObj = model.revenues_core()
		// This has the revenues in player order. Add a final entry with display order
		let temp = [...JSON.parse(JSON.stringify(store.players))]
		for (let i = 0; i < temp.length; i++) temp[i].key = i
		temp.sort((a, b) => b.maxVR - a.maxVR)

		let displayOrder = []
		for (let i = 0; i < temp.length; i++) displayOrder.push([temp[i].key])
		for (let i = 0; i < displayOrder.length; i++) displayOrder[i] = displayOrder[i].concat(histObj[displayOrder[i][0]])
		histObj.splice(0)
		histObj.push(...displayOrder)

		// add history
		model.addHistory(rf.HIST_REVENUES, -1, 0, [...histObj])
		// Move to GE
		store.gameflow.phase++
	}
	// DO NOT USE ELSE IF. CARRIES ON FROM ABOVE
	if (store.gameflow.phase === rf.PHASE_CHECK_END) {
		let histObj = model.endGame_core(true)
		// Snip to length 2
		for (let i = 0; i < histObj.length; i++) if (histObj[i].length > 2) histObj[i].splice(2)
		for (let i = 0; i < histObj.length; i++) histObj[i] = histObj[i].concat([model.getScore(histObj[i][1]), model.getVR(store.players[histObj[i][1]])])

		model.addHistory(rf.HIST_COMPARE_MYTHOLOGIES, -1, 0, [...histObj])
		// GAME END IS DONE HERE FOR SIMPLICITY
		for (let i = 0; i < store.players.length; i++) {
			if (model.getScore(i) >= model.getVR(store.players[i])) {
				model.endGame()
				model.setupStatsMode()
				return
			}
		}
		model.newTurn_core()
		model.addHistory(rf.HIST_NEW_TURN, -1, 0, [store.gameflow.turn])
		store.gameflow.phase = rf.PHASE_FIRST_MON
		endCurrentPhase()
	}

	Bot.actionAnyBotMoves()
} // end current phase
