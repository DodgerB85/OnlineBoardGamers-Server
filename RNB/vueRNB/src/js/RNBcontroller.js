/**
 * Contains functions related to the flow of the game,
 * or rather, interacting with the game, making moves,
 * ending turns / phases / etc
 *
 *
 */
import * as rf from "./RNBreference"
import * as model from "./RNBmodel"
import * as produce from "./RNBproduce"
//import * as map from "./RNBmap"
import * as highlight from "./RNBhighlight"
import * as funcs from "./RNBfuncs"
import * as context from "./RNBcontext"
import * as stack from "./RNBstack"
import * as wonder from "./RNBwonder"
import * as Bot from "./RNBbot"

import * as IO from "../backend/RNB_IO.js"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.soloGame) return store.players[0]

	// If you are in a prephase, then you must be interacting with yourself
	if (rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return store.players[personal.pov]

	if (store.gameflow.turnOrder.length > 0) {
		if (isSimulPhase() && store.gameflow.turnOrder.includes(personal.pov)) return store.players[personal.pov]
		if (isMainPhaseAndPseudoSimul() && store.gameflow.turnOrder.includes(personal.pov)) return store.players[personal.pov]
		const idx = store.gameflow.turnOrder[0]
		if (Number.isInteger(idx) && idx >= 0 && idx < store.players.length) return store.players[idx]
		return store.players[0]
	} else {
		if ((isSimulPhase() || isMainPhaseAndPseudoSimul()) && store.gameflow.turnOrder.length === 0) {
			// Need this if the last player in TO is being processed
			return store.players[personal.pov]
		}
		if (!store.viewSettings.showReplay && !rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) rf.doAdminAlrt(`CurrPlObj Error: ${store.gameflow.turnOrder}`)
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.soloGame) return 0

	// If you are in a prephase, then you must be interacting with yourself
	if (rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return personal.pov

	if (store.gameflow.turnOrder.length > 0) {
		if (isSimulPhase() && store.gameflow.turnOrder.includes(personal.pov)) return personal.pov
		if (isMainPhaseAndPseudoSimul() && store.gameflow.turnOrder.includes(personal.pov)) return personal.pov
		const idx = store.gameflow.turnOrder[0]
		if (Number.isInteger(idx) && idx >= 0 && idx < store.players.length) return idx
		return 0
	} else {
		if ((isSimulPhase() || isMainPhaseAndPseudoSimul()) && store.gameflow.turnOrder.length === 0) {
			// Need this if the last player in TO is being processed
			return personal.pov
		}
		if (!store.viewSettings.showReplay && !rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) rf.doAdminAlrt(`CurrPlIdx Error: ${store.gameflow.turnOrder}`)
		return 0
	}
}

export function timedOutPlayerIndex() {
	const store = useModelStore()
	return store.gameflow.turnOrder[0]
}

export function timedOutPlayerObj() {
	const store = useModelStore()
	const idx = store.gameflow.turnOrder[0]
	if (Number.isInteger(idx) && idx >= 0 && idx < store.players.length) {
		return store.players[idx]
	}
	return store.players[0]
}

export function isStrictTOphase() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.trainingGame) return true
	if (personal.soloGame) return true
	if (store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE) return true
	if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) return true
	if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) return true
	return false
}

export function isSimulPhase() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.trainingGame) return false
	if (personal.soloGame) return false
	//if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) return true
	//if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) return true
	//if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) return true
	//if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) return true
	if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) return true
	return false
}

export function isMainPhaseAndPseudoSimul() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.trainingGame) return false
	if (personal.soloGame) return false
	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) return true
	if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) return true
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) return true
	if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) return true
	return false
}

export function playingOutOfTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.pov < 0) return false
	if (personal.trainingGame) return false
	if (personal.soloGame) return false
	if (isMainPhaseAndPseudoSimul() && store.gameflow.turnOrder[0] !== personal.pov) return true
	return false
}

export function startPlayerTurn(loadedPreMove = false) {
	const store = useModelStore()
	const personal = usePersonalStore()
	stack.saveKnownLengths()
	store.context.resIDsOnHomeTile.splice(0)
	if (!personal.canPlay()) {
		context.clearAllHighlights()
		return
	}

	if (personal.soloGame) {
		const neutralBricksUsed = store.wonderBricks.filter((num) => num === 8 || num === 9).length
		if (neutralBricksUsed >= 36) store.gameMessages.errorText = "Caution: Final Turn"
	}
	if (!loadedPreMove) {
		// Reset all transporter movements -- BUT ONLY if you haven't loaded a stack
		model.resetTransportersForNewTurn()
		// Reset all resource movements
		for (let i = 0; i < model.getAllInGameResources().length; i++) {
			model.getAllInGameResources()[i].movedTransporterID = -1
		}

		// Reset the stack
		store.actionStack.splice(0)
		// Reset the undo points
		store.undoPoints.splice(0)
	}

	context.resetContextAndHighlights()
	if (store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE) {
		highlight.higlightTilesForStartTile()
	} else if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		// Highlight transporters for TM
		store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
		highlight.updateAllHighlightsForTransporterMode()
	} else if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		store.context.researchHexIDpossibilities.splice(0)
		// Highlight transporters for TM
		store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
		highlight.updateAllHighlightsForTransporterMode()
	} else if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		// Highlight transporters for TM
		store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
		highlight.updateAllHighlightsForTransporterMode()
	} else if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		highlight.updateAllHighlightsForTransporterMode()
	}

	// Conflicts - no special start of turn actions

	// NEEDS TO BE MOVED TO BEFORE SAVE
	if (!loadedPreMove) {
		store.wholeTurnResetData = funcs.simpleExportWholeRNBmodel()
		context.createUndoPoint()
	}
}

export function startPlayerMainPhasePreTurn() {
	const store = useModelStore()
	//const personal = usePersonalStore()
	context.resetContextAndHighlights()

	// Check if a pre-set move failed during loading. If so, keep existing
	// remainingMoves so partially-executed pre-set moves aren't erased.
	const preMoveFailed = store.stackControl.failedStackHistoryEntry.length > 0
	if (!preMoveFailed) {
		// Reset all transporter movements -- BUT ONLY if you haven't loaded a stack
		model.resetTransportersForNewTurn()
		// Reset all resource movements
		for (let i = 0; i < model.getAllInGameResources().length; i++) {
			model.getAllInGameResources()[i].movedTransporterID = -1
		}

		// Reset the stack
		store.actionStack.splice(0)
		// Reset the undo points
		store.undoPoints.splice(0)
	}

	context.resetContextAndHighlights()
	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		// Highlight transporters for TM
		store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
		highlight.updateAllHighlightsForTransporterMode()
	} else if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		store.context.researchHexIDpossibilities.splice(0)
		// Highlight transporters for TM
		store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
		highlight.updateAllHighlightsForTransporterMode()
	} else if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		// Highlight transporters for TM
		store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
		highlight.updateAllHighlightsForTransporterMode()
	} else if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		highlight.updateAllHighlightsForTransporterMode()
	}

	// NEEDS TO BE MOVED TO BEFORE SAVE
	store.wholeTurnResetData = funcs.simpleExportWholeRNBmodel()
	context.createUndoPoint()
}

export function endCurrentPhase(endingConflictDecisionWithConflict = false) {
	const store = useModelStore()
	const personal = usePersonalStore()
	context.resetContextAndHighlights()
	if (store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	} else if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		store.context.historyObj.splice(0)
		store.context.historyObj.push([])
		// Do end of production phase
		produce.doAutoSecondaryProduction(false)
		model.addHistory(rf.HIST_POST_PRODUCTION, -1, 0, [...store.context.historyObj])
		model.resetBuildingsAfterProduction()
		// Solo mode no conflict
		if (personal.soloGame) store.gameflow.phase = rf.PHASE_MOVEMENT_TO
		// training game conflict check
		else if (personal.trainingGame || personal.soloGame) {
			if (store.trainingGameSkipConflictPhase || personal.soloGame) {
				store.gameflow.phase = rf.PHASE_MOVEMENT_TO
				store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			} else {
				model.addHistory(rf.HIST_CHOOSE_CONFLICT, -1, 0, Array.from({ length: store.players.length }, (_, i) => i))
				store.gameflow.phase = rf.PHASE_CONFLICT_MOVEMENT_PRAYING
				store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
			}
		}
		// Normal game
		else {
			store.gameflow.phase = rf.PHASE_CONFLICT_MOVEMENT_DECISION
			store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
		}
	} else if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		// Solo mode no conflict
		if (personal.soloGame) store.gameflow.phase = rf.PHASE_BUILDING_TO
		// training game conflict check
		else if (personal.trainingGame) {
			if (store.trainingGameSkipConflictPhase || personal.soloGame) {
				store.gameflow.phase = rf.PHASE_BUILDING_TO
				store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			} else {
				model.addHistory(rf.HIST_CHOOSE_CONFLICT, -1, 0, Array.from({ length: store.players.length }, (_, i) => i))
				store.gameflow.phase = rf.PHASE_CONFLICT_BUILDING_PRAYING
				store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
			}
		}
		// Normal game
		else {
			store.gameflow.phase = rf.PHASE_CONFLICT_BUILDING_DECISION
			store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
		}
	} else if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		// Solo mode no conflict
		if (personal.soloGame) store.gameflow.phase = rf.PHASE_WONDER_TO
		// training game conflict check
		else if (personal.trainingGame) {
			if (store.trainingGameSkipConflictPhase || personal.soloGame) {
				store.gameflow.phase = rf.PHASE_WONDER_TO
				store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			} else {
				model.addHistory(rf.HIST_CHOOSE_CONFLICT, -1, 0, Array.from({ length: store.players.length }, (_, i) => i))
				store.gameflow.phase = rf.PHASE_CONFLICT_WONDER_PRAYING
				store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
			}
		}
		// Normal game
		else {
			store.gameflow.phase = rf.PHASE_CONFLICT_WONDER_DECISION
			store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
		}
	} else if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		// At end of wonder phase, add a neutral brick
		wonder.addBrickToWonder_core(8, [])
		// Check for game over here -- use fromStack=true so PHASE_GAME_OVER is set directly,
		// since the ACT_CONFIRM_END_GAME dialog path is not handled by endCurrentPhase
		wonder.checkAndPerformEndGame(true)
		//if (store.gameflow.phase === rf.PHASE_GAME_OVER) wonder.endAndSaveGame()
		// If the game has ended, don't carry on
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return

		store.gameflow.turn++
		model.addHistory(rf.HIST_NEW_TURN, -1, 0, [store.gameflow.turn])

		// Solo mode no conflict
		if (personal.soloGame) store.gameflow.phase = rf.PHASE_PRODUCTION_TO
		// training game conflict check
		else if (personal.trainingGame) {
			if (store.trainingGameSkipConflictPhase || personal.soloGame) {
				store.gameflow.phase = rf.PHASE_PRODUCTION_TO
				store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			} else {
				store.gameflow.phase = rf.PHASE_CONFLICT_PRODUCTION_PRAYING
				store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
			}
		}
		// Normal game
		else {
			store.gameflow.phase = rf.PHASE_CONFLICT_PRODUCTION_DECISION
			store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder].reverse()
		}

		// Mine production happens BEFORE conflict. So do it now
		produce.doMineProduction(false, [], false)
		if (store.context.historyObj.length > 0) model.addHistory(rf.HIST_PRE_PRODUCTION_MINES, -1, 0, [...store.context.historyObj])
	} else if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
		if (endingConflictDecisionWithConflict) {
			store.gameflow.phase++
			// Set to for praying
			store.gameflow.fullTurnOrder = [...store.gameflow.wonderPrayingOrder]
			store.gameflow.turnOrder = [...store.gameflow.wonderPrayingOrder]
		}
	}

	// After you end a phase, immediately move on to the next one
	startPhase()
}

export function performAllPreProductionExceptMines() {
	const store = useModelStore()
	// NOTE: remainingConversions are reset at the start of the production phase (startPhase)
	store.context.historyObj.splice(0)
	// All primaries produce
	produce.doPrimaryProduction(false)
	// All secondaries produce - if no transporters present
	produce.doAutoSecondaryProduction(true)
	model.addHistory(rf.HIST_PRE_PRODUCTION, -1, 0, [...store.context.historyObj])
}

export function startPhase() {
	const store = useModelStore()
	let phase = store.gameflow.phase
	if (rf.PHASE_PRODUCTIONS.includes(phase)) {
		// Reset remaining production capacity here, BEFORE pre-production runs,
		// so an active manager on a tile doubles the capacity for the whole phase
		model.resetBuildingsAfterProduction()
		performAllPreProductionExceptMines()
	} else if (rf.PHASE_MOVEMENTS.includes(phase)) {
		// Do start of movement phase
	} else if (rf.PHASE_BUILDINGS.includes(phase)) {
		// Do start of building phase
	} else if (rf.PHASE_WONDERS.includes(phase)) {
		// Do start of wonder phase
	}
	// Start conflict phases
	else if (rf.PHASE_CONFLICT_PRAYINGS.includes(phase)) {
		store.gameflow.newWonderPrayingOrder = Array(store.players.length).fill(-1)
		// Set the TO's - don't carry -1 placeholders from an incomplete praying order forward
		const validPrayingOrder = store.gameflow.wonderPrayingOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < store.players.length)
		store.gameflow.fullTurnOrder = [...validPrayingOrder].reverse()
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	}
}

export async function endPlayerTurn(overridePlayerName = null, overridePlayerIndex = null) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearMessages()
	store.context.resIDsOnHomeTile.splice(0)
	store.context.resIDsInWonderBrick.splice(0)

	const effectivePlayerIndex = overridePlayerIndex !== null ? overridePlayerIndex : currentPlayerIndex()

	if (store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE) {
		store.gameflow.turnOrder.shift()
		if (store.gameflow.turnOrder.length === 0) {
			// If there is no turn order, then move to the next phase
			endCurrentPhase()
		}

		await IO.saveGame(true, false)
		startPlayerTurn()
		return
	}

	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		// Add donkey reproduction to the stack
		if (store.context.possibleDonkeyReproductionData.length > 0) {
			let stackAction = [rf.STACK_DONKEY_REPRODUCTION]
			let histObj = produce.processDonkeyReproduction(effectivePlayerIndex)
			if (histObj.length > 0) stackAction.push(...histObj)
			if (stackAction.length > 1)
				stack.addItemToStack({
					action: rf.STACK_DONKEY_REPRODUCTION,
					historyEntry: [...stackAction],
					playerIndex: effectivePlayerIndex,
				})
		}
		// Remove the donkey info
		store.context.possibleDonkeyReproductionData.splice(0)
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_PRODUCTION_ACTIONS, effectivePlayerIndex, 0, [])
		}
	} else if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_MOVEMENT_ACTIONS, effectivePlayerIndex, 0, [])
		}
	} else if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_BUILDING_ACTIONS, effectivePlayerIndex, 0, [])
		}
	} else if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_WONDER_ACTIONS, effectivePlayerIndex, 0, [])
		}
	}

	// First, process PvP turn end
	if (!personal.trainingGame && !personal.soloGame) {
		// Remove yourself from the turn order if you are next up -- THIS IS DONE IN IO
		if (rf.MAIN_PHASES.includes(store.gameflow.phase)) {
			await IO.saveStackMove(true, overridePlayerName, overridePlayerIndex)
		} else if (rf.ALL_PHASE_CONFLICTS.includes(store.gameflow.phase)) {
			// If you are calling conflict, reform the TO
			if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase) && store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT) {
				model.addHistory(rf.HIST_CHOOSE_CONFLICT, -1, 0, [effectivePlayerIndex])
				// Go to the next phase - DECISION > PRAYING
				store.gameflow.phase++
				//localPhaseChangedFromConflictDecision = true
				// This just sets the TO
				startPhase()
			} else if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
				if (overridePlayerIndex !== null) {
					store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => idx !== overridePlayerIndex)
				} else {
					store.gameflow.turnOrder.shift()
				}
				// Process bots' praying decisions before removing them, so
				// newWonderPrayingOrder is fully populated when processOnePlayerLeftDuringConflict copies it
				for (let i = 0; i < store.gameflow.turnOrder.length; i++) {
					const idx = store.gameflow.turnOrder[i]
					if (store.players[idx].displayName === rf.BOT_NAME) {
						wonder.cashInPraying(idx, true)
					}
				}
				Bot.removeBotPlayers()

				if (store.gameflow.turnOrder.length <= 1) processOnePlayerLeftDuringConflict()
			}
			await IO.saveConflictMove(true, overridePlayerName, overridePlayerIndex)
		}

		// Be explicit that we don't need to worry about anything else in this function
		return
	}
	// If solo or practice, work in strict turn order.
	else if (personal.trainingGame || personal.soloGame) {
		store.gameflow.turnOrder.shift()
		// If in conflict phase, AND there is no turn order, AND there is no NEW turn order
		// Then move from praying/cashing to selecting TO
		if (rf.ALL_PHASE_CONFLICTS.includes(store.gameflow.phase) && store.gameflow.turnOrder.length === 1) {
			processOnePlayerLeftDuringConflict()
		} else if (store.gameflow.turnOrder.length === 0) {
			// If there is no turn order, then move to the next phase
			endCurrentPhase()
		}

		await IO.saveGame(true, false)
		if (store.gameflow.phase !== rf.PHASE_GAME_OVER) startPlayerTurn()
	}
}

export async function endPlayerPreMainPhaseTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearMessages()
	store.context.resIDsOnHomeTile.splice(0)
	store.context.resIDsInWonderBrick.splice(0)

	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		// Add donkey reproduction to the stack
		if (store.context.possibleDonkeyReproductionData.length > 0) {
			let stackAction = [rf.STACK_DONKEY_REPRODUCTION]
			let histObj = produce.processDonkeyReproduction(currentPlayerIndex())
			if (histObj.length > 0) stackAction.push(...histObj)
			if (stackAction.length > 1)
				stack.addItemToStack({
					action: rf.STACK_DONKEY_REPRODUCTION,
					historyEntry: [...stackAction],
					playerIndex: personal.pov,
				})
		}
		// Remove the donkey info
		store.context.possibleDonkeyReproductionData.splice(0)
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_PRODUCTION_ACTIONS, currentPlayerIndex(), 0, [])
		}
	} else if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_MOVEMENT_ACTIONS, currentPlayerIndex(), 0, [])
		}
	} else if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_BUILDING_ACTIONS, currentPlayerIndex(), 0, [])
		}
	} else if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		// If you took no actions, add that to the stack
		if (store.actionStack.length === 0) {
			model.addHistory(rf.HIST_NO_WONDER_ACTIONS, currentPlayerIndex(), 0, [])
		}
	}

	await IO.savePrePhaseMain()
}

export function processOnePlayerLeftDuringConflict() {
	const store = useModelStore()
	// You should only be here if there is 0 or 1 person left
	if (store.gameflow.turnOrder.length > 1) return
	if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) {
		// Ensure newWonderPrayingOrder is complete before using it as the praying order
		// (players can time out or be kicked before praying, leaving -1 slots behind)
		const existingIndexes = new Set(store.gameflow.newWonderPrayingOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < store.players.length))
		for (let i = 0; i < store.players.length; i++) {
			if (!existingIndexes.has(i)) {
				const firstEmpty = store.gameflow.newWonderPrayingOrder.indexOf(-1)
				if (firstEmpty !== -1) store.gameflow.newWonderPrayingOrder[firstEmpty] = i
			}
		}
		// Choose TO in REVERSE praying order
		store.gameflow.turnOrder = [...store.gameflow.newWonderPrayingOrder]
		store.gameflow.wonderPrayingOrder = [...store.gameflow.newWonderPrayingOrder]
		store.gameflow.newWonderPrayingOrder.splice(0)
		//store.gameflow.newWonderTurnOrder = Array(store.players.length).fill(-1)
		store.gameflow.wonderTurnOrder.splice(0)
		store.gameflow.wonderTurnOrder = Array(store.players.length).fill(-1)
		// Move to next TO decision phase
		store.gameflow.phase++
	} else if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
		// Ensure wonderTurnOrder is complete before using it as the full turn order
		// (recovery can advance the phase before all players have chosen a position)
		const existingIndexes = new Set(store.gameflow.wonderTurnOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < store.players.length))
		for (let i = 0; i < store.players.length; i++) {
			if (!existingIndexes.has(i)) {
				const firstEmpty = store.gameflow.wonderTurnOrder.indexOf(-1)
				if (firstEmpty !== -1) store.gameflow.wonderTurnOrder[firstEmpty] = i
				else store.gameflow.wonderTurnOrder.push(i)
			}
		}
		store.gameflow.fullTurnOrder = [...store.gameflow.wonderTurnOrder]
		store.gameflow.turnOrder = [...store.gameflow.wonderTurnOrder]
		//Bot.removeBotPlayers()
		// Set to the next phase
		store.gameflow.phase = wonder.getNextPhaseFromHistory()
		startPhase()
	} else if (store.gameflow.turnOrder.length === 0) {
		rf.doAdminAlrt("NO TURN ORDER during conflict??")
		endCurrentPhase()
	}
}
