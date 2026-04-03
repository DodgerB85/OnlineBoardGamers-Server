/**
 * Contains functions related to the flow of the game,
 * or rather, interacting with the game, making moves,
 * ending turns / phases / etc
 *
 *
 */
import * as rf from "./KFWreference.js"
import * as model from "./KFWmodel.js"
import * as map from "./KFWmap.js"
import * as funcs from "./KFWfuncs.js"
import * as IO from "../backend/KFW_IO.js"
import * as view from "./KFWview.js"
import * as village from "./KFWvillage.js"
import * as rules from "./KFWrules.js"
import * as Bot from "./KFWbot.js"

import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.trainingGame && store.gameflow.phase === rf.PHASE_FINAL_SCORING) return store.players[store.gameflow.turnOrder[0]]
	if (isSimulPhase(store.gameflow.phase)) {
		if (!personal.canPlay() && store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
		if (personal.pov >= 0) return store.players[personal.pov]
		// Just an emergency return
		return store.players[0]
	}
	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.viewSettings.showReplay & (personal.pov >= 0)) {
			alert("CP-O Error")
			console.log(`CP() Error - t-o: ${store.gameflow.turnOrder} -- ${personal.pov}`)
			store.gameflow.turnOrder.push(0)
		}
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.trainingGame && store.gameflow.phase === rf.PHASE_FINAL_SCORING) return store.gameflow.turnOrder[0]
	if (personal.pov >= 0 && isSimulPhase(store.gameflow.phase)) return personal.pov
	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		if (!store.viewSettings.showReplay & (personal.pov >= 0)) {
			alert("CP-I Error")
			console.log(`CP-I Error - t-o: ${store.gameflow.turnOrder} -- ${personal.pov}`)
			store.gameflow.turnOrder.push(0)
		}
		return 0
	}
}

export function isSimulPhase(phase) {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Practice gamws are always in turn order
	if (personal.trainingGame) return false

	//if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES && !store.gameflow.turnOrder.includes(personal.pov)) return true
	if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING && !store.gameflow.turnOrder.includes(personal.pov)) return true

	if (phase === rf.PHASE_VILLAGE_EXPANDING) return true
	if (phase === rf.PHASE_CHOOSE_WINTER_TILES) return true
	if (phase === rf.PHASE_FINAL_SCORING) return true

	return false
}

export function canResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (!personal.canPlay()) return false
	if (personal.trainingGame) return false
	if (store.gameflow.phase !== rf.PHASE_BIDDING_AND_ACTIONS) return false
	return true
}

export async function endPlayerTurn(endingMidBookkeeperTurn = false, endgingMidUpgradedMerchantTurn = false) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let moveData = ""

	// Check info is removed
	model.unhighlightOutbidMeeples()
	store.meeplePopupSetter.showPopup = false

	if (endingMidBookkeeperTurn === true) store.gameflow.phase = rf.PHASE_GET_BOOKKEEPER_B_CONTRACT
	if (endgingMidUpgradedMerchantTurn === true) store.gameflow.phase = rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE

	if (!isSimulPhase(store.gameflow.phase) && currentPlayerIndex() === store.gameflow.fullTurnOrder[store.gameflow.fullTurnOrder.length - 1]) {
		//store.gameflow.turn++
	}
	let needToEndPhase = false

	// Check for last man standing game over here
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++
	}
	if (personal.trainingGame && nbNonPlayers > 0) {
		model.endGame()
		return
	}
	if (nbNonPlayers === store.players.length - 1) {
		model.endGame()
		return
	}

	model.dealVisibileContracts()

	// if you just chose merchants B first contract, make sure to process the random contract pick
	if (store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) {
		processEndOfTurnActions()
	} else if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		processEndOfTurnActions()

		// Make sure any bots are in the "passed player indexes"
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].displayName === rf.BOT_NAME && !store.gameflow.passedPlayerIndexes.includes(i)) store.gameflow.passedPlayerIndexes.push(i)
		}

		// If you did not pass, then it resets the "pass" sequence
		if (!store.gameflow.passedPlayerIndexes.includes(currentPlayerIndex())) {
			store.gameflow.passedPlayerIndexes.splice(0)
		}
		store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())

		if (store.gameflow.passedPlayerIndexes.length === store.players.length) {
			needToEndPhase = true
		}
	} else if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) {
		processEndOfTurnActions()
		//store.gameflow.turnOrder.shift()
	} else if (store.gameflow.phase === rf.PHASE_CHOOSE_WINTER_TILES) {
		store.ongoingVars.selectedWinterTileIDs = store.ongoingVars.selectedWinterTileIDs.concat(store.context.selectedWinterTileIDs)
		//currentPlayerObj().hiddenWinterTile_tileIDs.splice(0)
		// Keep these here in case of kick during tile pick
		currentPlayerObj().hiddenWinterTile_tileIDs = currentPlayerObj().hiddenWinterTile_tileIDs.concat(store.context.selectedWinterTileIDs)
		moveData = funcs.compressData(store.context.selectedWinterTileIDs)
		//store.gameflow.turnOrder.shift()
	} else if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) {
		moveData = funcs.compressData(funcs.exportPlayerVIllageMoveData(personal.pov))
		// SET PRE-PHASES BACK TO NORMAL TO SAVE -- BUT NOT HERE OR YOU MIGHT LOSE OTHER PLAYERS HISTORY
		//if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) store.gameflow.phase = rf.PHASE_VILLAGE_EXPANDING
		//store.gameflow.turnOrder.shift()
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		moveData = funcs.compressData(funcs.exportPlayerFinalScoringMoveData(currentPlayerIndex()))
		//currentPlayerObj().finalScore =
		//store.gameflow.turnOrder.shift()
	}
	// PHASE_GET_BOOKKEEPER_B_CONTRACT

	store.clearMessages(true)
	store.removeAllActiveHighlights()
	model.unhighlightOutbidMeeples()
	store.clearContext()
	store.viewSettings.showIntroInfo = false

	// END NON SIMUL TURN AND NOT FINAL SCORING
	if (!isSimulPhase(store.gameflow.phase) && store.gameflow.phase !== rf.PHASE_FINAL_SCORING) {
		// If not in the action/Remove player from the turn order
		if (store.gameflow.phase !== rf.PHASE_BIDDING_AND_ACTIONS && store.gameflow.phase !== rf.PHASE_GET_BOOKKEEPER_B_CONTRACT && store.gameflow.phase !== rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) store.gameflow.turnOrder.shift()

		// If not a simul phase, check to see if you can skip the next player
		actionAllPlayerSkips()

		// End phase, if needed
		if (needToEndPhase) store.gameflow.turnOrder.splice(0)

		while (store.gameflow.turnOrder.length === 0) {
			await endCurrentPhase()
			actionAllPlayerSkips()
		}
		// await save
		await IO.saveGame(true, false)

		// Have this for training games
		startPlayerTurn()
		// Make sure this function is exited now
		return
	}
	// END SIMUL TURN - OR FINAL SCORING - assume bots are filtered out at the start of the phase
	else {
		// Remove from turn order
		let justFinishedPlayerIndex = currentPlayerIndex()
		store.gameflow.turnOrder = store.gameflow.turnOrder.filter((playerIndex) => playerIndex !== currentPlayerIndex())
		Bot.removeBotPlayers()
		// NEED TO REBUILD THE TO ARRAY NOW, OTHERWISE VUE GFX THAT RELY ON (eg turnOder[0]) WILL CAUSE ERRORS
		// The turn order should be set/reset again after processing the end of the simul turn
		if (store.gameflow.turnOrder.length === 0) store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()

		if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
			if (personal.trainingGame) await IO.saveFinalScoringMove(justFinishedPlayerIndex, moveData)
			else await IO.saveFinalScoringMove(personal.pov, moveData)
		} else await IO.saveSimulMove(personal.pov, moveData)
		// Make sure this function is exited now
		return
	}
}

export function processEndOfTurnActions() {
	const store = useModelStore()
	const personal = usePersonalStore()
	// Process any end of turn actions
	if (store.context.localEndTurnActions.length > 0) {
		let message = ""
		for (let i = 0; i < store.context.localEndTurnActions.length; i++) {
			/*if (store.context.endTurnActions[i][0] === rf.ACT_TILE_GET_RANDOM_SKILL_TILE) {
				let pulledSkills = model.pullSkillTilesFromBag(store.context.endTurnActions[i][1])
				if (message === "") {
					if (personal.trainingGame) message += `${currentPlayerObj().name} gained `
					else message += `You gained `
				}
				for (let i = 0; i < pulledSkills.length; i++) {
					currentPlayerObj().hiddenSkillTiles[pulledSkills[i]]++
					message += `<img class="skillTileInMessage" src="${view.getImage("skillTile_" + pulledSkills[i])}" />`
				}
				store.gameMessages.endTurnMessage = message
			} */ /*else if (store.context.endTurnActions[i][0] === rf.ACT_TILE_GET_RANDOM_MEEPLE) {
				let pulledMeeples = model.pullMeeplesFromBag(store.context.endTurnActions[i][1])
				if (message === "") {
					if (personal.trainingGame) message = `${currentPlayerObj().name} gained `
					else message = `You gained `
				}
				for (let i = 0; i < pulledMeeples.length; i++) {
					currentPlayerObj().hiddenMeeples[pulledMeeples[i]]++
					message += `<img class="meepleInMessage" src="${view.getImage("meeple_" + pulledMeeples[i])}" />`
				}
				store.gameMessages.endTurnMessage = message
			}*/ if (store.context.localEndTurnActions[i][0] === rf.ACT_GET_RANDOM_CONTRACT) {
				if (message === "") {
					if (personal.trainingGame) message = `${currentPlayerObj().name} gained `
					else message = `You gained `
				}
				let newContract_id = -1
				for (let j = 0; j < store.context.localEndTurnActions[i][1]; j++) {
					// Get the contract
					let ret = store.hiddenContracts.pop()
					newContract_id = ret
					let newContract = rf.ALL_CONTRACTS.find((c) => c.id === ret)
					let newContractGfx = newContract.gfx
					currentPlayerObj().hiddenContracts.push(JSON.parse(JSON.stringify(newContract)))
					currentPlayerObj().hiddenContracts[currentPlayerObj().hiddenContracts.length - 1].visible = 0
					message += `<svg viewBox="77 131.5 55.5 34" class="contractInMessage">
					<image width="52.916668" height="31.75" preserveAspectRatio="none" xlink:href="${view.getImage(newContractGfx)}" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
					<path d="${rf.CONTRACT_PATH_D}" class="contractPathGLOBAL" />
				</svg>`
				}
				store.gameMessages.endTurnMessage = message

				// Check if it's at the end of a normal turn
				//if (store.context.historyObj.length > 0 && store.context.historyObj[store.context.historyObj.length - 1][0] === rf.HIST_ACT_ON_TILE)
				if (store.context.historyObj.length > 1) {
					if (store.context.historyObj[0] === rf.TILE_M_AUTUMN_MERCHANT_B) {
						// Double contract
						let finalEntty = store.context.historyObj[store.context.historyObj.length - 1]
						for (let i = 0; i < finalEntty.length; i++) {
							if (finalEntty[i][1] === -1) {
								finalEntty[i][1] = newContract_id
								break
							}
						}
						if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS && i === store.context.localEndTurnActions.length - 1) model.addHistory(rf.HIST_ACT_ON_TILE, currentPlayerIndex(), 0, [...store.context.historyObj])
					}
					// Otherwise assume single contract
					else {
						store.context.historyObj[store.context.historyObj.length - 1][1] = newContract_id
						if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) model.addHistory(rf.HIST_ACT_ON_TILE, currentPlayerIndex(), 0, [...store.context.historyObj])
					}
				}
				// Otherwise, alter the Merchants B history - this only works for first contract chosen
				else if (store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) {
					let histIndex = store.history.length - 1
					while (store.history[histIndex][3][0] !== rf.TILE_M_AUTUMN_MERCHANT_B) histIndex--
					let histEntry3 = store.history[histIndex][3]
					histEntry3[histEntry3.length - 1][0][1] = newContract_id
				}
				// Otherwise, look for BOOKKEERPER_B history
				else {
					let histIndex = store.history.length - 1
					while (store.history[histIndex][3][0] !== rf.TILE_M_SUMMER_BOOKKEEPER_B && store.history[histIndex][3][0] !== rf.TILE_M_AUTUMN_MERCHANT_B) histIndex--
					let histEntry3 = store.history[histIndex][3]
					if (store.history[histIndex][3][0] === rf.TILE_M_SUMMER_BOOKKEEPER_B) histEntry3[histEntry3.length - 1][1] = newContract_id
					else if (store.history[histIndex][3][0] === rf.TILE_M_AUTUMN_MERCHANT_B) {
						if (histEntry3[histEntry3.length - 1][0][0] === -1 && histEntry3[histEntry3.length - 1][0][1] === -1) histEntry3[histEntry3.length - 1][0][1] = newContract_id
						else histEntry3[histEntry3.length - 1][1][1] = newContract_id
					}
				}
			}
		}
	}
	store.context.localEndTurnActions.splice(0)
}

export function actionAllPlayerSkips() {
	const store = useModelStore()
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return

	store.context.historyObj.splice(0)
	while (canSkipCurrentPlayer()) {
		if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) model.addHistory(rf.HIST_VILLAGE_EXPANSION, currentPlayerIndex(), 0, [])

		/*	if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) {
			let boatTile = store.availableBoatTiles.find((tile) => tile.itemsOnBoat.meeples.length > 0)
			model.collectBoatResources(boatTile.tileID[boatTile.upgraded])
		}*/

		// Now remove from turn order
		if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		else store.gameflow.turnOrder.shift()
	}
}

export function canSkipCurrentPlayer() {
	const store = useModelStore()
	// Always skip bots - NB these SHOULDNT ever be in turnOrder, so this is a backup
	if (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS && !store.gameflow.passedPlayerIndexes.includes(currentPlayerIndex())) store.gameflow.passedPlayerIndexes.push(currentPlayerIndex())
		//model.addHistory(rf.HIST_PASS_TURN, currentPlayerIndex(), 0, [])
		return true
	}
	// You can't skip if the turn is over
	if (store.gameflow.turnOrder.length === 0) return false
	// Can't skip if PHASE_GET_BOOKKEEPER_B_CONTRACT
	if (store.gameflow.phase === rf.PHASE_GET_BOOKKEEPER_B_CONTRACT) return false
	// Can't skip if PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE
	if (store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) return false
	// You can't skip shoosing winter tiles
	if (store.gameflow.phase === rf.PHASE_CHOOSE_WINTER_TILES) return false
	// you can't skip scoring phase
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) return false

	let playerIndex = store.gameflow.turnOrder[0]
	let playerObj = store.players[playerIndex]

	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		if (playerObj.passFlag > 1) {
			if (store.gameflow.passedPlayerIndexes.length === store.gameflow.fullTurnOrder.length) return false

			if (!store.gameflow.passedPlayerIndexes.includes(playerIndex)) {
				store.gameflow.passedPlayerIndexes.push(playerIndex)
				model.addHistory(rf.HIST_PASS_TURN, playerIndex, 0, [])
			}
			return true
		}
		return false
	}

	// Can auto-turn the last player in turn order for boat collection UNLESS sea bastion 2
	// No point, as with simul village expansion allowed during boat phase it makes no difference
	/*if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) {
		// Last player can auto collect
		if (store.gameflow.turnOrder.length === 1) {
			let boatTile = store.availableBoatTiles.find((tile) => tile.itemsOnBoat.meeples.length > 0)
			if (boatTile.tileID[boatTile.upgraded] !== rf.TILE_M_BOAT_SEA_BASTION_2_B) return true
			return false
		}
	}*/

	if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) {
		if (playerObj.pendingVillageTiles.length === 0) return true
	}

	return false
}

export async function endCurrentPhase() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		store.gameflow.passedPlayerIndexes.splice(0)
		// Reset the colour of each tile
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].villageTiles.length; j++) {
				store.players[i].villageTiles[j].coreMeepleColour = rf.MEEPLE_NONE
			}
		}

		// Reset all pass flags
		for (let i = 0; i < store.players.length; i++) {
			store.players[i].passFlag = 1
		}

		// End of all seasons
		model.collectUnsuccessfulBids()
		// Collect season tiles; put meeples in bag; remove unbid on tiles
		model.collectSeasonTiles()
		// Collect meeples in your village
		model.collectPlayerVillageMeeples()

		store.gameflow.phase = rf.PHASE_COLLECT_BOAT_RESOURCES

		// With High- Knowledge, move all "known" workers to "unknown" workers
		if (store.hiddenInformationKnowledge === 8) {
			for (let i = 0; i < store.players.length; i++) {
				// meeples
				store.players[i].knownHiddenMeeples[4] += store.players[i].knownHiddenMeeples[3]
				store.players[i].knownHiddenMeeples[3] = 0
				store.players[i].knownHiddenMeeples[4] += store.players[i].knownHiddenMeeples[2]
				store.players[i].knownHiddenMeeples[2] = 0
				store.players[i].knownHiddenMeeples[4] += store.players[i].knownHiddenMeeples[1]
				store.players[i].knownHiddenMeeples[1] = 0
				store.players[i].knownHiddenMeeples[4] += store.players[i].knownHiddenMeeples[0]
				store.players[i].knownHiddenMeeples[0] = 0
				// skills
				store.players[i].knownHiddenSkillTiles[3] += store.players[i].knownHiddenSkillTiles[2]
				store.players[i].knownHiddenSkillTiles[2] = 0
				store.players[i].knownHiddenSkillTiles[3] += store.players[i].knownHiddenSkillTiles[1]
				store.players[i].knownHiddenSkillTiles[1] = 0
				store.players[i].knownHiddenSkillTiles[3] += store.players[i].knownHiddenSkillTiles[0]
				store.players[i].knownHiddenSkillTiles[0] = 0
			}
		}

		// Form the new turn order. Start by finding who bid for the lowest turn order tiles, and work up from there
		// You can simply check all turn order tiles in order. If they weren't in the game they simply won't be bid on at all
		model.processTurnOrderTiles()
	} else if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) {
		// Reform the turn order
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_VILLAGE_EXPANDING
	} else if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) {
		// if you are ALREADY in winter, go directly to scoring phase
		if (store.gameflow.season === rf.WINTER) {
			store.gameflow.fullTurnOrder.sort((a, b) => a - b)
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			Bot.removeBotPlayers()
			store.gameflow.phase = rf.PHASE_FINAL_SCORING
			return
		}
		// End of the season, so reform turn order
		let startPlayerIndex = store.players.findIndex((player) => player.hasPurpleMeeple === true)
		store.gameflow.fullTurnOrder.splice(0)
		for (let i = 0; i < store.players.length; i++) store.gameflow.fullTurnOrder.push(i)
		while (store.gameflow.fullTurnOrder[0] !== startPlayerIndex) store.gameflow.fullTurnOrder.push(store.gameflow.fullTurnOrder.shift())
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()

		// Remove visible contracts, deal new ones
		store.visibleContracts.splice(0)
		model.dealVisibileContracts()

		// Otherwise, Go to next season
		store.gameflow.season++

		// Set the boat tile sides, Re-add meeples etc to boats (the funciton checks for Winter)
		await rules.fillBoatTiles()

		// Reset the colour on all the tiles
		model.resetCoreMeepleColours()

		// Set up new available tiles - if the NEW season isn't winter
		if (store.gameflow.season !== rf.WINTER) {
			rules.setupSeasonTiles(store.gameflow.season)
			store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
		}
		// In winter, each player chooses at least 1 tile to include
		else store.gameflow.phase = rf.PHASE_CHOOSE_WINTER_TILES
	} else if (store.gameflow.phase === rf.PHASE_CHOOSE_WINTER_TILES) {
		// Set up the winter tiles
		store.context.historyObj.splice(0)
		if (personal.trainingGame) {
			for (let i = 0; i < store.ongoingVars.selectedWinterTileIDs.length; i++) {
				let tileID = store.ongoingVars.selectedWinterTileIDs[i]
				store.context.historyObj.push(tileID)
				let tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID))))
				store.availableTiles.push(tile)
			}
			model.addHistory(rf.HIST_CHOSEN_WINTER_TILES, -1, 0, [...store.context.historyObj])
		}
		// Restore the turn order
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()

		store.context.historyObj.splice(0)

		store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		// NB THIS IS NEVER RUN as ending process goes through IO saves
		model.endGame()
	}
}

export function startPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	// Allow expanding village during boat phase - this is needed for going here right from saveGame
	if (!personal.trainingGame && store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES && !store.gameflow.turnOrder.includes(personal.pov) && store.players[personal.pov].pendingVillageTiles.length > 0) {
		// NB if you refresh the page you will have pending village tiles, but not visible
		if (!IO.DEBUG_USERS.includes(personal.name) && personal.pov >= 0 && window.initData.move == "") store.gameflow.phase = rf.PRE_PHASE_VILLAGE_EXPANDING
	}
	if (!personal.canPlay()) return

	store.undoPoints.splice(0)

	// SET PRE MOVES HERE
	if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) {
		store.context.historyObj.splice(0)
		if (currentPlayerObj().pendingVillageTiles.length > 0) {
			for (let i = 0; i < currentPlayerObj().pendingVillageTiles.length; i++) {
				store.context.historyObj.push(currentPlayerObj().pendingVillageTiles[i].id)
			}
			village.setBoatChainWarningSettings(currentPlayerIndex())
			map.setPlaceableTilesForPlayerVillge(currentPlayerIndex())
			map.calculateCanvasSizeForPlayerVillage(currentPlayerIndex(), true)
			store.context.action = rf.ACT_ADD_TILES_TO_VILLAGE

			store.context.newTileGhostData.selectedIndexInpendingVillageTiles = 0
			store.context.newTileGhostData.id = currentPlayerObj().pendingVillageTiles[0].id
			store.context.newTileGhostData.rotation = 0
			store.context.newTileGhostData.gfx = currentPlayerObj().pendingVillageTiles[0].gfx[currentPlayerObj().pendingVillageTiles[0].upgraded]
			store.context.newTileGhostData.upgraded = currentPlayerObj().pendingVillageTiles[0].upgraded
			store.context.newTileGhostData.newSides = [...currentPlayerObj().pendingVillageTiles[0].sides]
		}
		// Save the turn reset
		store.wholeTurnResetData = funcs.exportKFWmodel(true)
		// Add an undo point
		model.createUndoPoint()
		return
	}

	if (store.gameflow.phase === rf.PHASE_GET_BOOKKEEPER_B_CONTRACT) {
		store.context.action = rf.ACT_CHOOSE_CONTRACT
	} else if (store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) {
		store.context.remainingContracts = 1
		store.context.action = rf.ACT_CHOOSE_CONTRACT
	} else if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		window.initData.move = ""
		// Set village highlights
		/*store.context.villageTilesToHighlight.splice(0)
		for (let i=0; i<store.players.length; i++) {
			for (let j=0; j<store.players[i].villageTiles.length; j++) {
				if (!rf.TILE_NO_ACTION.includes(store.players[i].villageTiles[j].tileID[0])) {
					store.context.villageTilesToHighlight.push([i, store.players[i].villageTiles[j].id])
				}
			}
		}*/
	} else if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) {
		window.initData.move = ""
		if (store.gameflow.season !== rf.WINTER) store.context.action = rf.ACT_COLLECT_BOAT_RESOURCES
		else store.context.action = rf.ACT_COLLECT_BOAT_TILES
	} else if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) {
		store.context.historyObj.splice(0)
		if (currentPlayerObj().pendingVillageTiles.length > 0) {
			for (let i = 0; i < currentPlayerObj().pendingVillageTiles.length; i++) {
				store.context.historyObj.push(currentPlayerObj().pendingVillageTiles[i].tileID[currentPlayerObj().pendingVillageTiles[i].upgraded])
			}
			village.setBoatChainWarningSettings(currentPlayerIndex())
			map.setPlaceableTilesForPlayerVillge(currentPlayerIndex())
			map.calculateCanvasSizeForPlayerVillage(currentPlayerIndex(), true)
			store.context.action = rf.ACT_ADD_TILES_TO_VILLAGE

			store.context.newTileGhostData.selectedIndexInpendingVillageTiles = 0
			store.context.newTileGhostData.id = currentPlayerObj().pendingVillageTiles[0].id
			store.context.newTileGhostData.rotation = 0
			store.context.newTileGhostData.gfx = currentPlayerObj().pendingVillageTiles[0].gfx[currentPlayerObj().pendingVillageTiles[0].upgraded]
			store.context.newTileGhostData.upgraded = currentPlayerObj().pendingVillageTiles[0].upgraded
			store.context.newTileGhostData.newSides = [...currentPlayerObj().pendingVillageTiles[0].sides]
		}
	} else if (store.gameflow.phase === rf.PHASE_CHOOSE_WINTER_TILES) {
		window.initData.move = ""
		store.context.action = rf.ACT_CHOOSE_WINTER_TILES
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		window.initData.move = ""
		for (let i = 0; i < currentPlayerObj().villageTiles.length; i++) {
			if (rf.TILE_FINAL_SCORE_ACTION.includes(currentPlayerObj().villageTiles[i].tileID[currentPlayerObj().villageTiles[i].upgraded])) {
				let tileID = currentPlayerObj().villageTiles[i].tileID[currentPlayerObj().villageTiles[i].upgraded]
				if (tileID === rf.TILE_BOAT_FLIPPER_B) store.context.preFinalActions.push(rf.ACT_FREE_UPGRADE)
				if (tileID === rf.TILE_M_BOAT_FLIPPER_2_B) store.context.preFinalActions.push(rf.ACT_FREE_EXTENSION)
			}
		}

		if (store.context.preFinalActions.length > 0) {
			store.context.preFinalActions.reverse()
			setupPreFinalAction()
		} else setupFinalScoring()
	}

	// Save the turn reset
	store.wholeTurnResetData = funcs.exportKFWmodel(true)
	// Add an undo point
	model.createUndoPoint()
}

export function setupPreFinalAction() {
	const store = useModelStore()
	store.context.action = store.context.preFinalActions[0]
	for (let i = 0; i < currentPlayerObj().villageTiles.length; i++) {
		let tile = currentPlayerObj().villageTiles[i]
		if (store.context.action === rf.ACT_FREE_UPGRADE && tile.upgradable && tile.upgraded === 0) {
			store.context.tileIDsForPreFinalAction.push(tile.tileID[tile.upgraded])
		} else if (store.context.action === rf.ACT_FREE_EXTENSION && tile.upgradable && tile.upgraded === 1 && tile.extension === rf.EXTENSION_NONE) {
			store.context.tileIDsForPreFinalAction.push(tile.tileID[tile.upgraded])
		}
	}
}

export function finishPreFinalAction() {
	const store = useModelStore()
	store.context.preFinalActions.shift()
	store.context.tileIDsForPreFinalAction.splice(0)
	if (store.context.preFinalActions.length > 0) setupPreFinalAction()
	else setupFinalScoring()
}

export function setupFinalScoring() {
	const store = useModelStore()

	// TODO remove this
	for (let i = 0; i < currentPlayerObj().villageTiles.length; i++) {
		currentPlayerObj().villageTiles[i].completedSets = []
	}
	model.scoreAutoProcessingTilesAndMoveResources(currentPlayerIndex())
	store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
}
