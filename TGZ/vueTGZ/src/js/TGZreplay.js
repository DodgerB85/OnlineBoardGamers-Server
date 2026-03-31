import * as rf from "./TGZreference"
import * as funcs from "./TGZfuncs"
import * as map from "./TGZmap"
import * as model from "./TGZmodel"
import * as history from "./TGZhistory"
import * as controller from "./TGZcontroller"

import { useModelStore } from "../stores/TGZstore.js"

async function resetDataForReplay() {
	const store = useModelStore()
	// keep store.mapTiles

	// reform availablegods
	for (let i = 0; i < store.players.length; i++) {
		// reform availablegods
		if (store.players[i].god[0] !== rf.NO_god) store.availablegods.push(store.players[i].god[0])
		// reform available specs
		for (let j = 0; j < store.players[i].specialists.length; j++) {
			store.availableSpecialists.push(store.players[i].specialists[j][0])
		}
	}

	for (let i = 0; i < store.players.length; i++) {
		store.players[i].cows = 3
		store.players[i].monuments.splice(0)
		store.players[i].craftsmen.splice(0)
		store.players[i].craftsmenPrices = [1, 1, 1, 1, 1, 1, 1]
		store.players[i].god[0] = rf.NO_god
		store.players[i].god[1] = 0
		store.players[i].specialists.splice(0)
		store.players[i].techs.splice(0)
		store.players[i].maxVR = 20 + 0.1 * i
	}
	store.addedResources.splice(0)
	store.addedWater.splice(0)
	store.coords.splice(0)
	store.gameflow.turn = 0
	store.gameflow.phase = 0
	store.gameflow.turnOrder.splice(0)
	store.gameflow.fullTurnOrder.splice(0)

	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.fullTurnOrder.push(i)
		store.gameflow.turnOrder.push(i)
	}
	store.gameflow.gameEnded = 0
	store.remainingItems = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 8]
	store.depletedResources.splice(0)

	store.ongoingVars.newTurnOrder.splice(0)
	store.ongoingVars.currentBid = 0
	store.ongoingVars.totalBids = 0

	// keep history
	map.initCoords()
	store.clearVars()
}

function replayAddMonument(historyIndex, playerIndex, indexes) {
	const store = useModelStore()

	// Add monument to player
	for (let i = 0; i < indexes.length; i++) {
		model.addMonument_core(playerIndex, indexes[i])
	}
	store.context.actionsTaken.push(rf.ACT_BUILD_MON)
}

function replayBid(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	if (entry3[0] > 0) {
		// Deduct cows from player
		controller.currentPlayerObj().cows -= entry3[0]
		// Check for elegua used; refund if +ve
		if (entry3.length > 2 && entry3[2] > 0) controller.currentPlayerObj().cows += entry3[2]
		// if aja used, move cows to god not bid
		if (entry3.length > 2 && entry3[2] === -1) controller.currentPlayerObj().god[1] = entry3[0]
		// Otherwise Add cows to the bid
		else store.ongoingVars.totalBids += parseInt(entry3[0])
		store.ongoingVars.currentBid = parseInt(entry3[0])
	} else if (store.context.selectedBid === 0) {
		for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
			if (store.ongoingVars.newTurnOrder[i] === -1) {
				store.ongoingVars.newTurnOrder[i] = controller.currentPlayerIndex()
				break
			}
		}
	}
}

function replayEndBids(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	let cowsOnPlaques = model.getCowsOnPlaque(-1, 0)
	let idx = 0

	if (model.anyoneHasSHADIPINYI(false)) {
		store.players[model.anyoneHasSHADIPINYI(true)].cows += cowsOnPlaques[idx]
		idx++
	}
	for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
		let playerPbj = store.players[store.gameflow.fullTurnOrder[i]]
		playerPbj.cows += cowsOnPlaques[idx]
		idx++
	}
	store.gameflow.fullTurnOrder = [...entry3[0]]
	store.gameflow.turnOrder = [...entry3[0]]
	store.clearVars()
	store.ongoingVars.totalBids = 0
}

function replayChoosegod(historyIndex, playerIndex, entry3) {
	model.setgod_core(entry3[0])
}

function replayChooseSpecialist(historyIndex, playerIndex, entry3) {
	model.addSpecialist_core(entry3[0])
}

function replayAddResource(historyIndex, playerIndex, entry3) {
	let index = entry3[0]
	let resource = entry3[1]
	// Add cows to shaman, if required
	if (entry3[2] > 0) {
		for (let i = 0; i < controller.currentPlayerObj().specialists.length; i++) {
			if (controller.currentPlayerObj().specialists[i][0] === rf.SHAMAN) {
				let cowCost = rf.SPEC_COST[rf.SHAMAN]
				controller.currentPlayerObj().specialists[i][1] = cowCost
				controller.currentPlayerObj().cows -= cowCost
				break
			}
		}
	}
	model.addResource_core(index, resource, 0)
}
function replayAddWater(historyIndex, playerIndex, entry3) {
	let index = entry3[0]
	let rotation = entry3[1]
	// Add cows to Rain Ceremony, if required
	if (entry3[2] > 0) {
		for (let i = 0; i < controller.currentPlayerObj().specialists.length; i++) {
			if (controller.currentPlayerObj().specialists[i][0] === rf.RAIN_CEREMONY) {
				let cowCost = rf.SPEC_COST[rf.RAIN_CEREMONY]
				controller.currentPlayerObj().specialists[i][1] = cowCost
				controller.currentPlayerObj().cows -= cowCost
				break
			}
		}
	}
	model.addResource_core(index, rf.WATER_TILE, rotation)
}

function replayAddCraftsman(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	let player = store.players[playerIndex]
	let index = entry3[0]
	let craftsman = entry3[1]
	let rotation = entry3[2]
	model.addCraftsman_core(player, index, craftsman, rotation)
	store.context.actionsTaken.push(rf.ACT_BUILD_CRAFTSMEN)
}

function replaySetPrices(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	let player = store.players[playerIndex]
	model.setCraftsmanPrice_core(player, entry3)
}

function replayActivateSpec(historyIndex, playerIndex, entry3) {
	let specID = entry3[0]
	for (let i = 0; i < controller.currentPlayerObj().specialists.length; i++) {
		if (controller.currentPlayerObj().specialists[i][0] === specID) {
			model.activateSpecialist_core(controller.currentPlayerObj().specialists[i])
			break
		}
	}
}

function replayAddHerdCows(historyIndex, playerIndex, entry3) {
	model.addHerdCows_core(entry3[0])
}

function replayChoseAnyanwuMon(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	let player = store.players[playerIndex]
	let monumentSq = entry3[0]
	// raise the monument one level
	let monumentIndex = player.monuments
		.map(function (el) {
			return el[0]
		})
		.indexOf(monumentSq)

	player.monuments[monumentIndex][1] = 3
}

function replayRaiseMonument(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	let player = store.players[playerIndex]
	let monumentSq = entry3[0][0]

	// raise the monument one level
	let monumentIndex = player.monuments
		.map(function (el) {
			return el[0]
		})
		.indexOf(monumentSq)

	if (monumentIndex === -1 && store.players[playerIndex].god[0] === rf.YEMOJA) {
		for (let i = 0; i < store.players.length; i++) {
			monumentIndex = store.players[i].monuments
				.map(function (el) {
					return el[0]
				})
				.indexOf(monumentSq)
			if (monumentIndex !== -1) {
				store.players[i].monuments[monumentIndex][1]++
				break
			}
		}
	} else player.monuments[monumentIndex][1]++

	// Find out if OVIA is being used
	let OVIAused = false
	//let OVIAcows = 0
	for (let i = 1; i < entry3.length; i++) {
		if (entry3[i][0] === -2) OVIAused = true
	}

	for (let i = 1; i < entry3.length; i++) {
		// each entry3[i] is length 2 or 4. First is Cman, second Res
		if (entry3[i][0] !== -1 && entry3[i][0] !== -2) {
			for (let j = 0; j < entry3[i].length; j++) {
				if (j % 2 === 0) {
					// craftsman
					let cmanIndex = entry3[i][j][0]
					let cmanData = map.getCraftsmanDataFromAnySq(cmanIndex, true)
					// Find owner
					let cmanOwnerIndex = -1
					let found = false
					for (let i = 0; i < store.players.length; i++) {
						for (let j = 0; j < store.players[i].craftsmen.length; j++) {
							if (store.players[i].craftsmen[j][0] === cmanIndex) {
								cmanOwnerIndex = i
								found = true
								break
							}
						}
						if (found) break
					}

					// Hub Cost - MIGHT NEED TO GO TO CARD
					let hubCost = entry3[i][j][1]
					// THIS NEEDS AXTUALLY DOING AGAINST THE PROPER PLAYER
					let cmanCost = entry3[i][j][2]

					// Add cows to Cman tech
					for (let i = 0; i < store.players[cmanOwnerIndex].techs.length; i++) {
						if (cmanData[1] === rf.BLACKSMITH_TILE) {
							if (store.players[cmanOwnerIndex].techs[i][0] === rf.BLACKSMITH_TECH) {
								if (OVIAused) {
									store.players[cmanOwnerIndex].techs[i][1] += cmanCost - 1
									store.players[playerIndex].god[1]++
								} else store.players[cmanOwnerIndex].techs[i][1] += cmanCost
								break
							}
						} else if (store.players[cmanOwnerIndex].techs[i][0] === cmanData[1] * 2 || store.players[cmanOwnerIndex].techs[i][0] === cmanData[1] * 2 + 1) {
							if (OVIAused) {
								store.players[cmanOwnerIndex].techs[i][1] += cmanCost - 1
								store.players[playerIndex].god[1]++
							} else store.players[cmanOwnerIndex].techs[i][1] += cmanCost
							break
						}
					}
					// Add cows to Qamata
					for (let i = 0; i < store.players.length; i++) {
						if (store.players[i].god[0] === rf.QAMATA) store.players[i].god[1] += hubCost
					}

					player.cows -= hubCost
					player.cows -= cmanCost

					// WATERTOLL payment
					if (entry3[i][j].length > 3 && entry3[i][j][3] === -3) {
						controller.currentPlayerObj().cows -= rf.WATERTOLLCowToll
						let WATERTOLLplayerIndex = model.anyoneHasWATERTOLL(true)
						store.players[WATERTOLLplayerIndex].god[1] += rf.WATERTOLLCowToll
					}
				} else if (j % 2 === 1) {
					// Just deplete the res
					if (entry3[i][j].length > 0) {
						for (let k = 0; k < entry3[i][j].length; k++) {
							if (entry3[i][j][k] !== -3) store.depletedResources.push(entry3[i][j][k])
							else {
								// WATERTOLL toll paid
								controller.currentPlayerObj().cows -= rf.WATERTOLLCowToll
								let WATERTOLLplayerIndex = model.anyoneHasWATERTOLL(true)
								store.players[WATERTOLLplayerIndex].god[1] += rf.WATERTOLLCowToll
							}
						}
					} else store.depletedResources.push(entry3[i][j])
				}
			}
		}
	}
	// Check for EKWENSU cows
	for (let i = 1; i < entry3.length; i++) {
		// each entry3[i] is length 2 or 4. First is Cman, second Res
		if (entry3[i][0] === -1) {
			// Remove cows from EKWENSU
			store.players[model.anyoneHasEKWENSU(true)].god[1] -= entry3[i][1]
			// Refund to the actioning player
			player.cows += entry3[i][1]
		}
	}
	store.context.actionsTaken.push(rf.ACT_RAISE_MON)
	// pay costs to correct places
}

function replayBuildOyaMon(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	let player = store.players[playerIndex]
	let monumentSq = entry3[0]

	model.addMonument_core(playerIndex, monumentSq)

	for (let i = 1; i < entry3.length; i++) {
		// each entry3[i] is length 2 or 4. First is Cman, second Res
		for (let j = 0; j < entry3[i].length; j++) {
			if (j % 2 === 0) {
				// craftsman
				let cmanIndex = entry3[i][j][0]
				let cmanData = map.getCraftsmanDataFromAnySq(cmanIndex, true)
				// Find owner
				let cmanOwnerIndex = -1
				let found = false
				for (let i = 0; i < store.players.length; i++) {
					for (let j = 0; j < store.players[i].craftsmen.length; j++) {
						if (store.players[i].craftsmen[j][0] === cmanIndex) {
							cmanOwnerIndex = i
							found = true
							break
						}
					}
					if (found) break
				}

				// Hub Cost - MIGHT NEED TO GO TO CARD
				let hubCost = entry3[i][j][1]
				// THIS NEEDS AXTUALLY DOING AGAINST THE PROPER PLAYER
				let cmanCost = entry3[i][j][2]

				// Add cows to Cman tech
				for (let i = 0; i < store.players[cmanOwnerIndex].techs.length; i++) {
					if (cmanData[1] === rf.BLACKSMITH_TILE) {
						if (store.players[cmanOwnerIndex].techs[i][0] === rf.BLACKSMITH_TECH) {
							store.players[cmanOwnerIndex].techs[i][1] += cmanCost
							break
						}
					} else if (store.players[cmanOwnerIndex].techs[i][0] === cmanData[1] * 2 || store.players[cmanOwnerIndex].techs[i][0] === cmanData[1] * 2 + 1) {
						store.players[cmanOwnerIndex].techs[i][1] += cmanCost
						break
					}
				}
				// Add cows to Qamata
				for (let i = 0; i < store.players.length; i++) {
					if (store.players[i].god[0] === rf.QAMATA) store.players[i].god[1] += hubCost
				}

				player.cows -= hubCost
				player.cows -= cmanCost
			} else if (j % 2 === 1) {
				// Just deplete the res
				store.depletedResources.push(entry3[i][j])
			}
		}
	}
	store.context.actionsTaken.push(rf.ACT_RAISE_MON)
}

function replayRevenues(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	store.gameflow.phase = rf.PHASE_REVENUES
	// Add engai, herd, card cows
	model.revenues_core()
}

function replayCompareMythologies() {
	const store = useModelStore()

	store.gameflow.phase = rf.PHASE_CHECK_END
	for (let i = 0; i < store.players.length; i++) {
		if (model.getScore(i) >= model.getVR(store.players[i])) {
			model.endGame_core()
			return
		}
	}
}

function replayNewTurn(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_BID
}

function turnEndToPerform(historyIndex) {
	// NOTE: THis IS THE HISTORY INDEX THAT ALREADY HAPPEND
	// SO NEED TO REDUCE TO THE PREVIOUS MENINGFUL ENTRY
	const store = useModelStore()

	const NOTHING = 0
	const PUSH_SHIFT = 1
	const SHIFT = 2

	let currentAction = store.history[historyIndex][0]

	let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT]
	if (entriesToIgnore.includes(currentAction)) return NOTHING

	let currentPlayerIndex = store.history[historyIndex][1]

	historyIndex--
	while (entriesToIgnore.includes(store.history[historyIndex][0]) && historyIndex > 0) historyIndex--
	// Don't end the first turn before it has begun

	let previousPlayerIndex = store.history[historyIndex][1]
	let previousAction = store.history[historyIndex][0]

	if (historyIndex === 0 && entriesToIgnore.includes(previousAction)) return NOTHING

	if (previousAction === rf.HIST_NEW_TURN) return NOTHING
	if (previousAction === rf.HIST_END_BIDS) {
		store.gameflow.phase = rf.PHASE_BUILD
		// Remove first players if they made no actions
		while (store.gameflow.turnOrder.length > 0 && store.gameflow.turnOrder[0] !== currentPlayerIndex) store.gameflow.turnOrder.shift()
		return NOTHING
	}

	let previousEntry3 = store.history[historyIndex][3]

	if (previousPlayerIndex !== currentPlayerIndex) {
		if (previousAction === rf.HIST_BID) {
			if (previousEntry3[0] <= 0 && store.gameflow.turnOrder.length > 1) return SHIFT
			else return PUSH_SHIFT
			//return NOTHING
		}
		return SHIFT
	}

	return NOTHING
}

function performReplayEndTurn(historyIndex) {
	const store = useModelStore()

	const NOTHING = 0
	const PUSH_SHIFT = 1
	const SHIFT = 2

	let turnEndToPerformNum = turnEndToPerform(historyIndex)

	if (turnEndToPerformNum === NOTHING) return
	else if (turnEndToPerformNum === PUSH_SHIFT) {
		store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		return
	} else if (turnEndToPerformNum === SHIFT && store.gameflow.turnOrder.length > 0) {
		while (store.gameflow.turnOrder.length > 0 && store.gameflow.turnOrder[0] !== store.history[historyIndex][1]) store.gameflow.turnOrder.shift()
		store.clearVars(false)
	}
	if (store.gameflow.turnOrder.length === 0) {
		if (store.gameflow.turn === 0) {
			store.gameflow.turn = 1
			store.gameflow.phase = rf.PHASE_BID
			store.gameflow.fullTurnOrder.reverse()
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			store.ongoingVars.newTurnOrder.splice(0)
			for (let i = 0; i < store.players.length; i++) store.ongoingVars.newTurnOrder.push(-1)
			store.ongoingVars.currentBid = 0
			store.ongoingVars.totalBids = 0
		} else {
			let gameEnded = false
			for (let i = 0; i < store.players.length; i++) {
				if (model.getScore(i) >= model.getVR(store.players[i])) {
					gameEnded = true
					return
				}
			}
			if (!gameEnded) store.gameflow.turn++
			store.depletedResources.splice(0)
			// Setup new turn order
			store.gameflow.fullTurnOrder.splice(0)
			let temp = [...JSON.parse(JSON.stringify(store.players))]
			for (let i = 0; i < temp.length; i++) temp[i].key = i
			temp.sort((a, b) => b.maxVR - a.maxVR)

			for (let i = 0; i < temp.length; i++) store.gameflow.fullTurnOrder.push(temp[i].key)
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]

			store.ongoingVars.newTurnOrder.splice(0)
			for (let i = 0; i < store.players.length; i++) store.ongoingVars.newTurnOrder.push(-1)
			store.ongoingVars.currentBid = 0
			store.ongoingVars.totalBids = 0
		}

		if (store.gameflow.phase === rf.PHASE_GAME_OVER) store.gameflow.turnOrder.push(0)
	}
}

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	store.topMenuViews.generatingReplay = true

	let replayData = []
	let spinoffReplayData = []

	// Reset the data
	await resetDataForReplay()
	let pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")

	for (let i = 0; i < store.history.length; i++) {
		if (i !== 0) performReplayEndTurn(i)

		spinoffReplayData.push(funcs.exportModel(true))

		if (store.history[i][0] === rf.HIST_BUILD_FIRST_MON) replayAddMonument(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_BID) replayBid(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_END_BIDS) replayEndBids(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_CHOOSE_god) replayChoosegod(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_CHOOSE_SPEC) replayChooseSpecialist(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_BUILD_MON) replayAddMonument(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_RAISE_MON) replayRaiseMonument(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_BUILD_CRAFTSMAN) replayAddCraftsman(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_SET_PRICES) replaySetPrices(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ACTIVATE_SPEC) replayActivateSpec(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ADD_HERD_COWS) replayAddHerdCows(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_BUILD_WATER) replayAddWater(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_BUILD_RESOURCE) replayAddResource(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_REVENUES) replayRevenues(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_COMPARE_MYTHOLOGIES) replayCompareMythologies()
		else if (store.history[i][0] === rf.HIST_NEW_TURN) replayNewTurn(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_CHOOSE_ANYANWU_MON) replayChoseAnyanwuMon(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_BUILD_OYA_MON) replayBuildOyaMon(i, store.history[i][1], store.history[i][3])

		replayData.push(funcs.exportModel(true))

		if (i % 3 === 0 && pBarEl != null) {
			let percent = (i / store.history.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await funcs.sleep(0)
		}
	}

	store.replayData = replayData
	store.spinoffReplayData = spinoffReplayData
	store.replayStep = replayData.length - 1
	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
		else store.replayStep = window.initData.replayStep
	}
	if (store.replayData.length > 0) store.topMenuViews.showReplay = true
	history.goToReplayStep(store.replayStep)
	store.topMenuViews.generatingReplay = false
}
