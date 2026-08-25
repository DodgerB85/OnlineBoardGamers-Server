import * as rf from "./RNBreference.js"
//import * as util from "./RNButil.js"
import * as model from "./RNBmodel.js"
import * as controller from "./RNBcontroller.js"
//import * as graph from "./RNBgraph.js"
//import * as map from "./RNBmap.js"
//import * as computes from "./RNBcomputes.js"
//import * as highlight from "./RNBhighlight.js"
import * as loc from "./RNBlocation.js"
import * as context from "./RNBcontext.js"
import * as stack from "./RNBstack.js"
import * as Bot from "./RNBbot.js"
import * as atelier from "./RNBatelier.js"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

export function cashInPraying(playerIndex, fromPreMove = false) {
	const store = useModelStore()
	cashInPraying_core(playerIndex)
	// Add the history
	// Either create or add to the history
	let entry = playerIndex + 20
	if (fromPreMove) entry += 10

	let idx = store.history.length - 1
	while (idx >= 0 && rf.ENTRIES_TO_IGNORE.includes(store.history[idx][0])) idx--
	if (store.history[idx][0] === rf.HIST_CONFLICT_PRAYING) {
		store.history[idx][3].push(entry)
	} else model.addHistory(rf.HIST_CONFLICT_PRAYING, playerIndex, 0, [entry])
}

export function cashInPraying_core(playerIndex) {
	const store = useModelStore()
	// Find the index of the first -1
	const firstEmptyIndex = store.gameflow.newWonderPrayingOrder.indexOf(-1)

	// If an empty slot (-1) exists, replace it with playerIndex
	if (firstEmptyIndex !== -1) {
		store.gameflow.newWonderPrayingOrder[firstEmptyIndex] = playerIndex
	} else rf.doAdminAlrt(`No empty slot found in newWonderPrayingOrder CI: ${playerIndex}, order: ${store.gameflow.newWonderPrayingOrder}`)
	// If there is only 1 player left, check there is only 1 empty spot, and put them there
	if (store.gameflow.newWonderPrayingOrder.filter((x) => x === -1).length === 1) {
		// Make an array of 0 to num players
		const requiredNumbers = Array.from({ length: store.players.length }, (_, i) => i)
		// find the number not in the array yet
		const missingNumber = requiredNumbers.find((x) => !store.gameflow.newWonderPrayingOrder.includes(x))
		const lastEmptyIndex = store.gameflow.newWonderPrayingOrder.lastIndexOf(-1)
		store.gameflow.newWonderPrayingOrder[lastEmptyIndex] = missingNumber
	}
	store.gameflow.newWonderPrayingOrder = Bot.moveBotsToStartOfPlayerIndexArray(store.gameflow.newWonderPrayingOrder)
}

export function keepPraying(playerIndex, fromPreMove = false) {
	const store = useModelStore()
	keepPraying_core(playerIndex)

	let entry = playerIndex
	if (fromPreMove) entry += 10
	// Add the history
	// Either create or add to the history
	const entriesToIgnore = [rf.HIST_REWIND, rf.HIST_KICKOUT, rf.HIST_RESIGN]
	let idx = store.history.length - 1
	while (idx >= 0 && entriesToIgnore.includes(store.history[idx][0])) idx--
	if (store.history[idx][0] === rf.HIST_CONFLICT_PRAYING) {
		store.history[idx][3].push(entry)
	} else model.addHistory(rf.HIST_CONFLICT_PRAYING, playerIndex, 0, [entry])
}

export function keepPraying_core(playerIndex) {
	const store = useModelStore()
	// Search from the end of the array to the beginning
	const lastEmptyIndex = store.gameflow.newWonderPrayingOrder.lastIndexOf(-1)

	// If a slot exists, replace it
	if (lastEmptyIndex !== -1) {
		store.gameflow.newWonderPrayingOrder[lastEmptyIndex] = playerIndex
	} else rf.doAdminAlrt("No empty slot found in newWonderPrayingOrder KP: ${playerIndex}, order: ${store.gameflow.newWonderPrayingOrder}")

	// If there is only 1 player left, check there is only 1 empty spot, and put them there
	if (store.gameflow.newWonderPrayingOrder.filter((x) => x === -1).length === 1) {
		// Make an array of 0 to num players
		const requiredNumbers = Array.from({ length: store.players.length }, (_, i) => i)
		// find the number not in the array yet
		const missingNumber = requiredNumbers.find((x) => !store.gameflow.newWonderPrayingOrder.includes(x))
		const lastEmptyIndex = store.gameflow.newWonderPrayingOrder.lastIndexOf(-1)
		store.gameflow.newWonderPrayingOrder[lastEmptyIndex] = missingNumber
	}
}

export function setNewTurnOrderPosition(playerIndex, idx, goEarliest = false, goLatest = false, fromPreMove = false) {
	const store = useModelStore()

	// Process presets
	if (goEarliest === true) idx = store.gameflow.wonderTurnOrder.indexOf(-1)
	if (goLatest === true) idx = store.gameflow.wonderTurnOrder.lastIndexOf(-1)
	setNewTurnOrderPosition_core(playerIndex, idx)
	// Add the history
	// Either create or add to the history
	const entriesToIgnore = [rf.HIST_REWIND, rf.HIST_KICKOUT, rf.HIST_RESIGN]
	let histIdx = store.history.length - 1
	while (histIdx >= 0 && entriesToIgnore.includes(store.history[histIdx][0])) histIdx--
	let entry = [playerIndex, idx]
	if (fromPreMove) entry = [playerIndex, idx, 1]
	if (store.history[histIdx][0] === rf.HIST_CONFLICT_TURN_ORDER) {
		store.history[histIdx][3].push([...entry])
	} else model.addHistory(rf.HIST_CONFLICT_TURN_ORDER, playerIndex, 0, [[...entry]])
}

export function setNewTurnOrderPosition_core(_playerIndex, idx) {
	const store = useModelStore()
	store.gameflow.wonderTurnOrder[idx] = controller.currentPlayerIndex()
	// If there is only 1 player left, check there is only 1 empty spot, and put them there
	if (store.gameflow.wonderTurnOrder.filter((x) => x === -1).length === 1) {
		// Make an array of 0 to num players
		const requiredNumbers = Array.from({ length: store.players.length }, (_, i) => i)
		// find the number not in the array yet
		const missingNumber = requiredNumbers.find((x) => !store.gameflow.wonderTurnOrder.includes(x))
		const lastEmptyIndex = store.gameflow.wonderTurnOrder.lastIndexOf(-1)
		store.gameflow.wonderTurnOrder[lastEmptyIndex] = missingNumber
	}
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

export function getNextPhaseFromHistory() {
	const store = useModelStore()
	let idx = store.history.length - 1
	while (idx >= 0) {
		if (store.history[idx][0] === rf.HIST_STACK_ACTIONS && rf.PHASE_PRODUCTIONS.includes(store.history[idx][3][0])) return rf.PHASE_MOVEMENT_TO
		if (store.history[idx][0] === rf.HIST_STACK_ACTIONS && rf.PHASE_MOVEMENTS.includes(store.history[idx][3][0])) return rf.PHASE_BUILDING_TO
		if (store.history[idx][0] === rf.HIST_STACK_ACTIONS && rf.PHASE_BUILDINGS.includes(store.history[idx][3][0])) return rf.PHASE_WONDER_TO
		if (store.history[idx][0] === rf.HIST_STACK_ACTIONS && rf.PHASE_WONDERS.includes(store.history[idx][3][0])) return rf.PHASE_PRODUCTION_TO

		if (store.history[idx][0] === rf.HIST_NO_PRODUCTION_ACTIONS) return rf.PHASE_MOVEMENT_TO
		if (store.history[idx][0] === rf.HIST_NO_MOVEMENT_ACTIONS) return rf.PHASE_BUILDING_TO
		if (store.history[idx][0] === rf.HIST_NO_BUILDING_ACTIONS) return rf.PHASE_WONDER_TO
		if (store.history[idx][0] === rf.HIST_NO_WONDER_ACTIONS) return rf.PHASE_PRODUCTION_TO

		idx--
	}
	rf.doAdminAlrt("Phase not found")
	// At start of game, next phase is building
	return rf.PHASE_BUILDING_TO
}

export function addBrickToWonder(playerIndex, deductResources = false) {
	const store = useModelStore()
	const resIDsToDeduct = store.context.resIDsInWonderBrick
	if (deductResources) {
		addBrickToWonder_core(playerIndex, resIDsToDeduct)
	} else store.wonderBricks.push(playerIndex)

	const stackAction = [rf.STACK_ADD_WONDER_BRICKS, [...resIDsToDeduct.map((resID) => stack.getResIDtoUse(model.getResByID(resID)))]]
	stack.addItemToStack({
		action: rf.STACK_ADD_WONDER_BRICKS,
		historyEntry: stackAction,
		playerIndex: controller.currentPlayerIndex(),
	})
	store.context.resIDsInWonderBrick.splice(0)
	if (store.context.resIDsOnHomeTile.length < requiredResourcesForWonderBrick(playerIndex)) {
		store.context.wonderError = 2
	}
	context.createUndoPoint()
	if (!controller.playingOutOfTurn()) {
		checkAndPerformEndGame(false)
	}
}

// This just sets the resID's to OOB (no verification performed), and adds the brick
export function addBrickToWonder_core(playerIndex, resIDsToDeduct) {
	const store = useModelStore()
	for (const resID of resIDsToDeduct) {
		model.getResByID(resID).location = loc.setOOBlocation()
	}
	store.wonderBricks.push(playerIndex)
	if (store.wonderBricks.length >= 45) convertDesertsToPastures()
	if (store.CUSTOM_RULES.includes(rf.CR_START_2_DONKEY_3RD_ON_WONDER_BRICK_27) && store.wonderBricks.length === 27) {
		const homeTileLocation = store.ALL_HOME_MARKERS[0].location
		model.addTransporterToGame(0, rf.DONKEY, homeTileLocation, true)
	}
}

export function convertDesertsToPastures() {
	const store = useModelStore()
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		// Irrigate the deserts
		if (store.mapData.hexData[i].currentTerrain === rf.TERR_DESERT) {
			store.mapData.hexData[i].currentTerrain = rf.TERR_PASTURE
			store.mapData.hexData[i].hexGfx += "_irrigated"
		}
	}
}

export function requiredResourcesForWonderBrick(playerIndex, extraBricks = 0) {
	const store = useModelStore()
	let baseResRequired = 1
	const bricksInWonder = store.wonderBricks.length + extraBricks
	if (bricksInWonder >= 17) baseResRequired = 2
	let justBuiltBricks = 0 + extraBricks
	const entriesToIgnore = [rf.HIST_REWIND, rf.HIST_KICKOUT, rf.HIST_RESIGN]
	let idx = store.history.length - 1
	while (idx >= 0 && entriesToIgnore.includes(store.history[idx][0])) idx--
	if (store.history[idx][0] === rf.HIST_STACK_ACTIONS && store.history[idx][3][0] === rf.PHASE_WONDER_TO && store.history[idx][1] === playerIndex) {
		// Find the stack entry
		let brickEntry = store.history[idx][3].find((x) => x[0] === rf.STACK_ADD_WONDER_BRICKS)
		if (brickEntry) justBuiltBricks = brickEntry.length - 1
		//justBuiltBricks = store.history[idx][3].length
	}
	return baseResRequired + justBuiltBricks
}

export function getHeldResourcesScore(playerIndex) {
	const store = useModelStore()
	const myTransporterIDs = model.getTransportersByPlayerIndex(playerIndex).map((t) => t.id)

	const resources = model
		.getAllInGameResources()
		.filter((r) => loc.isOnSelectedTransporterIDs(r.location, myTransporterIDs))
		.map((r) => r.type)

	let score = 0
	for (let i = 0; i < resources.length; i++) {
		if (resources[i] === rf.RES_GOLD) score += 10
		else if (resources[i] === rf.RES_COINS) score += 40
		else if (resources[i] === rf.RES_STOCK) score += 120
	}

	if (store.players[playerIndex].displayName === rf.BOT_NAME) score -= 100

	return score
}

// Total score = wonder points + held-resource points + Art & The Atelier artwork points
export function getPlayerTotalScore(playerIndex) {
	return getPlayerWonderPoints(playerIndex) + getHeldResourcesScore(playerIndex) + atelier.scoreArtwork(playerIndex)
}

export function getPlayerWonderPoints(playerIndex) {
	const store = useModelStore()
	const rowLengths = [4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7]
	let totalScore = 0
	let currentIndex = 0

	rowLengths.forEach((len) => {
		// 1. Extract the row from the flat reactive array
		const row = store.wonderBricks.slice(currentIndex, currentIndex + len)
		currentIndex += len

		// 2. Count bricks (Ignore -1, 8, and 9)
		let myCount = 0
		let opponentCount = 0

		row.forEach((brick) => {
			if (brick === playerIndex) {
				myCount++
			} else if (brick >= 0 && brick <= 6) {
				opponentCount++
			}
		})

		// 3. Apply Scoring Logic
		if (myCount === 0) return

		// Rule: 10 pts if opponents have 0
		if (opponentCount === 0) {
			totalScore += 10
			return
		}

		if (myCount === 1) {
			if (opponentCount === 1) totalScore += 5
			else if (opponentCount === 2) totalScore += 3
			else if (opponentCount === 3 || opponentCount === 4) totalScore += 2
			else if (opponentCount >= 5) totalScore += 1
		} else if (myCount === 2) {
			if (opponentCount === 1) totalScore += 6
			else if (opponentCount === 2) totalScore += 5
			else if (opponentCount === 3) totalScore += 4
			else if (opponentCount === 4)
				totalScore += 2 // "1" in your notes likely meant opponent count 1, but 1 is handled above
			else if (opponentCount >= 5) totalScore += 2
		} else if (myCount === 3) {
			if (opponentCount === 1) totalScore += 7
			else if (opponentCount === 2) totalScore += 6
			else if (opponentCount === 3) totalScore += 5
			else if (opponentCount >= 4) totalScore += 5 // "4 is s pts" interpreted as 5
		} else if (myCount === 4) {
			if (opponentCount === 1) totalScore += 8
			else if (opponentCount === 2) totalScore += 6
			else if (opponentCount >= 3) totalScore += 5
		} else if (myCount >= 5) {
			if (opponentCount === 1) totalScore += 8
			else if (opponentCount >= 2) totalScore += 7
		}
	})

	if (store.players[playerIndex].displayName === rf.BOT_NAME) totalScore -= 100

	return totalScore
}

export function checkAndPerformEndGame(fromStack = false) {
	// Game ends with 33 neutral bricks, OR any brick on the "game end" brick space
	// length 45 is the desert spot
	const store = useModelStore()
	const personal = usePersonalStore()
	let gameOver = false
	let gameOverDueToWonderBrick = false
	let gameOverDueToNeutralBrick = false
	if (store.players.length === 2 && store.wonderBricks.length >= 62) {
		gameOver = true
		gameOverDueToWonderBrick = true
	}
	if (store.players.length === 3 && store.wonderBricks.length >= 66) {
		gameOver = true
		gameOverDueToWonderBrick = true
	}
	if (store.players.length === 4 && store.wonderBricks.length >= 69) {
		gameOver = true
		gameOverDueToWonderBrick = true
	}
	if (store.players.length === 5 && store.wonderBricks.length >= 76) {
		gameOver = true
		gameOverDueToWonderBrick = true
	}
	if (store.players.length === 6 && store.wonderBricks.length >= 83) {
		gameOver = true
		gameOverDueToWonderBrick = true
	}
	const neutralBricksUsed = store.wonderBricks.filter((num) => num === 8 || num === 9).length
	if (neutralBricksUsed >= 33 && !personal.soloGame) {
		gameOver = true
		gameOverDueToNeutralBrick = true
	}
	else if (store.CUSTOM_RULES.includes(rf.CR_USE_ONLY_28_NEUTRAL_BRICKS) && neutralBricksUsed >= 28 && !personal.soloGame) {
		gameOver = true
		gameOverDueToNeutralBrick = true
	}
	else if (personal.soloGame && neutralBricksUsed >= 37) {
		gameOver = true
		gameOverDueToNeutralBrick = true
	}

	// Check only 1 player left IF not solo
	if (!personal.soloGame) {
		let nbNonPlayers = 0
		for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++
		if (nbNonPlayers >= store.players.length - 1) gameOver = true
	}

	if (gameOver) {
		if (gameOverDueToNeutralBrick) {
			setFullTurnOrderForGameover()
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			store.gameflow.phase = rf.PHASE_GAME_OVER
		} else if (gameOverDueToWonderBrick) {
			if (fromStack) {
				setFullTurnOrderForGameover()
				store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
				store.gameflow.phase = rf.PHASE_GAME_OVER
			} else {
				store.context.action = rf.ACT_CONFIRM_END_GAME
			}
		} else {
			setFullTurnOrderForGameover()
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			store.gameflow.phase = rf.PHASE_GAME_OVER
		}
	}
}

export function setFullTurnOrderForGameover() {
	const store = useModelStore()
	// Before changing the phase, alter the TO / fullTO to result
	store.gameflow.fullTurnOrder.sort((x, y) => {
		// 1. Calculate Primary Score
		const scoreX = getPlayerTotalScore(x)
		const scoreY = getPlayerTotalScore(y)
		const scoreDiff = scoreY - scoreX

		// 2. If scores are different, sort by score (descending)
		if (scoreDiff !== 0) return scoreDiff

		// 3. Tie-breaker: Whichever playerIndex appears earlier in wonderPrayingOrder
		const order = store.gameflow.wonderPrayingOrder
		return order.indexOf(y) - order.indexOf(x)
	})
}
