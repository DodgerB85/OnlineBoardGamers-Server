import * as rf from "./BUSreference.js"
import * as IO from "../backend/BUS_IO.js"
import * as WS from "../backend/BUSwebsocket.js"
import * as funcs from "./BUSfuncs.js"
import * as pitts from "./BUSpitts.js"
//import * as replay from "./BUSreplay.js"
import * as view from "./BUSview.js"
import * as controller from "./BUScontroller.js"

import { useModelStore } from "../stores/BUSstore.js"
import { usePersonalStore } from "../stores/BUSpersonal.js"

export function initGame() {
	// Set up all Data
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	store.refSize = window.initData.myZoomLevel
	personal.finishedGame = window.initData.finishedGame

	personal.trainingGame = false
	if (window.initData.startingOptions.includes(102)) personal.trainingGame = true

	// Initialize junctions based on board selection
	if (window.initData.startingOptions.includes(3)) {
		store.initializeJunctions(rf.BOARD_PITTS)
	} else {
		store.initializeJunctions(window.initData.preferredBusBoard)
	}

	personal.liveWS = false
	personal.pov = -9 // Also denotes involved player
	personal.superuser = false

	store.deleteVotesData = window.initData.deleteVotesData
	store.statsExcludeVotesData = window.initData.statsExcludeVotesData

	// Set up logged in player
	if (window.initData.name != undefined) {
		personal.name = window.initData.name
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		if (window.initData.startingOptions.includes(3)) {
			personal.selectedBoard = rf.BOARD_PITTS
		} else {
			personal.selectedBoard = window.initData.preferredBusBoard
		}
		if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) store.topMenuViews.displayRightActionSelection = false
		if (personal.selectedBoard === rf.BOARD_PITTS) store.topMenuViews.displayRightActionSelection = true
	}

	// Set up Involved Player data
	if (window.initData.pov != undefined) {
		personal.liveWS = true
		personal.pov = window.initData.pov
		personal.latestUpdate = window.initData.latestUpdate
		personal.secondsToNextKickout = window.initData.secondsToNextKickout
		personal.votedToDelete = store.deleteVotesData[personal.name]
		//store.refSize = 400
		if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.secondsToNextKickout <= 1200 && window.initData.kickoutRequired > 0) personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)

		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
				funcs.importBUSmodel(window.initData.gameData, false, false)
				let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
				let secondsIn24Hours = 24 * 60 * 60
				let playerSeconds = 0

				// Iterate over the KickoutFlexiDataArray to find the player's entry
				for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
					let entry = KickoutFlexiDataArray[i]

					// Check if the entry is a length-2 array and the first element matches the playerName
					if (Array.isArray(entry) && entry.length === 2 && entry[0] === controller.currentPlayerObj().name) {
						playerSeconds = entry[1]
						break
					}
				}
				let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
				personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout

				personal.kickoutFlexiCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
			}
		}

		personal.notes = funcs.htmlUnescape(window.initData.notes)
		if (window.initData.chatNotification) store.topMenuViews.showChat = true
		personal.preferredColour = window.initData.preferredBusColour
		personal.yourTurnAudioType = window.initData.yourTurnAudioType

		// Set up and save new game
		if (window.initData.gameData === "") {
			const COLOURS = funcs.shuffle([rf.BLUE, rf.GREEN, rf.PURPLE, rf.RED, rf.YELLOW])
			for (let i = 0; i < window.initData.playerNames.length; i++) {
				store.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],
					score: 0.5, // Start at ZERO POINT FIVE
					maxScore: 0.5,
					remainingActions: 20, // Start with 20
					timeStones: 0,
					buses: 1, // Total of 5, start with 1
					endJunctions: [], // The 2 junctions at the end of your route
					endLines: [], // The 2 lines at the end of your route
					playerJunctions: [], // The junctions you have access to
					passActionsFlag: false,
				})
			}
			// Now insert display names
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].name === "SHADOW" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[0]
				else if (store.players[i].name === "SHADOW_2" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[1]
				else if (store.players[i].name === "SHADOW_3" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[2]
				else if (store.players[i].name === "SHADOW_4" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[3]
				else store.players[i].displayName = store.players[i].name
			}
			for (let i = 0; i < store.players.length; i++) {
				store.gameflow.turnOrder.push(i)
				store.gameflow.fullTurnOrder.push(i)
			}
			// 3p remove one timestone
			if (store.players.length === 3) store.remainingTimeStones--

			// Set initial phase for new game
			store.gameflow.phase = rf.PHASE_SETUP_BLDGS
			store.gameflow.turn = 0
		} // End NEW GAME
		WS.StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	} // end involved player

	// If new, save, otherwise, import data
	if (window.initData.pov == undefined && window.initData.gameData === "") {
		store.rewindErrorText = "The game has not yet started"
		// Create the <h1> element
		var heading = document.createElement("h1")

		// Set the text content of the <h1> element
		heading.textContent = "The game has not yet started"

		// Get a reference to the body element
		var body = document.body

		// Append the <h1> element to the body
		body.appendChild(heading)
	} else if (window.initData.gameData === "") {
		// New game - save and then call startPlayerTurn to set up the turn
		IO.saveGame(true)
	} else {
		// FInally, impport data
		funcs.importBUSmodel(window.initData.gameData, personal.finishedGame, false)
		if (window.initData.pov != undefined) {
			personal.votedToDelete = store.deleteVotesData[personal.name]
			personal.votedToExclude = store.statsExcludeVotesData[personal.name]
		}
	}

	// Call startPlayerTurn after initialization for all cases

	controller.startPlayerTurn()
} // end initGame

export function maxBuses() {
	const store = useModelStore()
	let busArr = []
	store.players.forEach((player) => busArr.push(player.buses))
	return busArr.reduce((a, b) => Math.max(a, b), -Infinity)
}

export function maxBusesWithNewBus() {
	const store = useModelStore()
	if (store.actionAreaData[1][0] === -1) return maxBuses()
	return Math.max(maxBuses(), controller.getPlayerByColour(store.actionAreaData[1][0]).buses + 1)
}

export function getWinnerName(returnScores) {
	const store = useModelStore()
	// order players by score and timestones
	let resArr = [...store.players]
	let cmp = (a, b) => (a > b) - (a < b)

	/* I WANT A SORT OF FLOOR(SCORE) -> TIMESTONES -> MAX SCORE */

	// sort by timestones in equal score
	resArr.sort(function (a, b) {
		// Move bots to the end of the sort
		const aIsBot = a.displayName === rf.BOT_NAME
		const bIsBot = b.displayName === rf.BOT_NAME
		if (aIsBot && !bIsBot) return 1
		if (!aIsBot && bIsBot) return -1

		// Primary: higher score wins
		// Secondary: more timestones wins (not fewer)
		// Tertiary: lower maxScore wins (reached score first)
		return cmp(Math.floor(b.score), Math.floor(a.score)) || cmp(b.timeStones, a.timeStones) || cmp(b.maxScore, a.maxScore)
	})

	if (returnScores) return resArr
	// Now, need to do a strict sort on scores, as higher decimal is a win
	/* resArr.sort(function (a, b) {
       return cmp(b.score, a.score)
     })*/
	// Now sort on timestones
	/*resArr.sort(function (a, b) {
      return cmp(b.timeStones, a.timeStones)
    })*/

	let reason = 0
	// If top 2 players don't have same score, then there must be 1 highest score
	if (Math.floor(resArr[0].score) - Math.floor(resArr[1].score) !== 0) reason = 0
	else {
		/*let drawingPlayers = []
      for (let i = 0; i < resArr.length; i++) if (Math.floor(resArr[0].score) - Math.floor(resArr[i].score) === 0) drawingPlayers.push([resArr[i]])

      if (drawingPlayers[0].timeStones > drawingPlayers[1].timeStones) reason = 1
      else reason = 2*/
		if (resArr[0].timeStones > resArr[1].timeStones) reason = 1
		else reason = 2
	}

	//if (returnScores) return [resArr[0].name, resArr[1].name, resArr[2].name]
	// then winner is bottom of the pile
	//return [resArr[0].name, reason]
	return [resArr[0].displayName, reason]
}

export function increaseScore(player) {
	const store = useModelStore()
	let newScore = Math.floor(player.score) + 1 + 0.5
	for (let i = 0; i < store.players.length; i++) {
		if (Math.floor(store.players[i].score) === Math.floor(newScore)) newScore -= 0.1
		newScore = Math.round(newScore * 10) / 10
	}
	player.score = newScore
	// Encode turn info in maxScore: higher decimal = earlier turn (earlier wins ties)
	let newMax = Math.floor(player.score) + player.timeStones + (100 - store.gameflow.turn) / 100

	if (newMax > player.maxScore) {
		for (let i = 0; i < store.players.length; i++) if (newMax === store.players[i].maxScore) newMax -= 0.001
		player.maxScore = newMax
	}
}

export function decreaseScore(player) {
	const store = useModelStore()
	let newScore = Math.floor(player.score) - 1 + 0.5 + player.timeStones / 10
	for (let i = 0; i < store.players.length; i++) {
		if (Math.floor(store.players[i].score) === Math.floor(newScore)) newScore -= 0.1
		newScore = Math.round(newScore * 10) / 10
	}
	player.score = newScore
}

/*
export function increaseScore(player) {
    const store = useModelStore()
    
    // 1. Calculate Score (Unique within the current turn)
    let newScore = Math.floor(player.score) + 1.5
    store.players.forEach(p => {
        // If someone else already has this floor, nudge this one down
        if (p.id !== player.id && Math.floor(p.score) === Math.floor(newScore)) {
            newScore -= 0.1
        }
    })
    player.score = Math.round(newScore * 10) / 10

    // 2. Calculate Max Score (Tie-breaking: TimeStones > Turn > Order)
    // Turn bonus: 0.99 for turn 1, 0.01 for turn 99
    const turnBonus = (100 - store.gameflow.turn) / 100 
    let newMax = Math.floor(player.score) + player.timeStones + turnBonus

    // 3. Force Winner (Execution Order)
    if (newMax > player.maxScore) {
        // If ANYONE else already has this EXACT maxScore, 
        // this player is "later," so they get a tiny penalty.
        const alreadyExists = store.players.some(p => p.id !== player.id && p.maxScore === newMax)
        if (alreadyExists) {
            newMax -= 0.001 
        }
        player.maxScore = newMax
    }
}

export function decreaseScore(player) {
    const store = useModelStore()
    let newScore = Math.floor(player.score) - 1 + 0.5 + (player.timeStones / 10)
    
    store.players.forEach(p => {
        if (p.id !== player.id && Math.floor(p.score) === Math.floor(newScore)) {
            newScore -= 0.1
        }
    })
    player.score = Math.round(newScore * 10) / 10
}
*/

export function getScoreObj() {
	let resArr = getWinnerName(true)

	// USE END GAME SCORING TO MAKE DISCS
	let scoreObj = []
	for (let i = 0; i < resArr.length; i++) {
		var index = scoreObj.findIndex(function (el) {
			return el[0] === Math.floor(resArr[i].score)
		})
		if (index > -1) scoreObj[index][1].push([resArr[i].colour, resArr[i].score])
		else scoreObj.push([Math.floor(resArr[i].score), [[resArr[i].colour, resArr[i].score]]])
	}

	let scoreReturn = []
	for (let i = 0; i < scoreObj.length; i++) {
		let newRow = []
		newRow.push(scoreObj[i][0])
		let scoreRow = []
		for (let j = 0; j < scoreObj[i][1].length; j++) {
			scoreRow.push(scoreObj[i][1][j][0])
		}
		newRow.push(scoreRow)
		scoreReturn.push(newRow)
	}

	// return [score [colour, colour, colour]]
	return scoreReturn
}

export function getEmptyBuildingSpots(forceReturn) {
	const store = useModelStore()
	if (!forceReturn && store.context.buildingsLeftToPlace === 0) return

	if (store.gameflow.phase === rf.PHASE_SETUP_BLDGS) return getEmptyBuildingSpotsByNumber(1)
	let options = []
	options = getEmptyBuildingSpotsByNumber(1)
	if (options.length === 0) options = getEmptyBuildingSpotsByNumber(2)
	if (options.length === 0) options = getEmptyBuildingSpotsByNumber(3)
	if (options.length === 0) options = getEmptyBuildingSpotsByNumber(4)
	if (options.length === 0) {
		store.context.turnEndingErrorMessage = "No more building spots available"
	}
	return options
}

export function getEmptyBuildingSpotsByNumber(number) {
	const store = useModelStore()
	let displayObj = []
	for (let i = 0; i < store.junctions.length; i++) {
		let lineObj = [i, []]
		for (let j = 0; j < store.junctions[i].length - 1; j++) {
			if (j === number && store.junctions[i][j] === 0) lineObj[1].push(j)
			if (number === 1 && j === 0 && store.junctions[i][j] === 0) lineObj[1].push(j)
		}
		if (lineObj[1].length > 0) displayObj.push(lineObj)
	}
	return displayObj
}

export function getEmptyBuildingSpotsByNumberTotal(number) {
	let displayObj = getEmptyBuildingSpotsByNumber(number)
	let count = 0
	for (let i = 0; i < displayObj.length; i++) count += displayObj[i][1].length
	return count
}

export async function moveAllPassengersOntoJunctions() {
	const store = useModelStore()
	// A designer currently on the convention junction (17) moves onto their convention pub/office
	// spot at round end, like a delivered passenger
	if (store.jeroenStatus >= 0 && store.jeroenStatus < rf.DESIGNER_ON_BUILDING_FLAG && store.jeroenStatus % rf.DESIGNER_CON_FLAG === rf.PITTS_CONVENTION_JUNCTION) store.jeroenStatus = rf.DESIGNER_ON_BUILDING_FLAG + rf.DESIGNER_CON_FLAG + rf.PITTS_CONVENTION_JUNCTION
	if (store.jorisStatus >= 0 && store.jorisStatus < rf.DESIGNER_ON_BUILDING_FLAG && store.jorisStatus % rf.DESIGNER_CON_FLAG === rf.PITTS_CONVENTION_JUNCTION) store.jorisStatus = rf.DESIGNER_ON_BUILDING_FLAG + rf.DESIGNER_CON_FLAG + rf.PITTS_CONVENTION_JUNCTION
	for (let i = 0; i < store.junctions.length; i++) {
		for (let j = 0; j < store.junctions[i].length - 1; j++) {
			if (store.junctions[i][j] >= 30) {
				// Joris parked on a building - move back to the junction standee
				store.junctions[i][j] -= 30
				store.jorisStatus %= rf.DESIGNER_ON_BUILDING_FLAG
			} else if (store.junctions[i][j] >= 20) {
				// Jeroen parked on a building - move back to the junction standee
				store.junctions[i][j] -= 20
				store.jeroenStatus %= rf.DESIGNER_ON_BUILDING_FLAG
			} else if (store.junctions[i][j] > 10) {
				// Remove pax from bldg
				store.junctions[i][j] -= 10
				store.junctions[i][rf.paxIdx]++
			}
		}
	}
}

export async function moveAllPassengersOntoCorrectBuilding(bldgNum) {
	const store = useModelStore()
	for (let i = 0; i < store.junctions.length; i++) {
		// On each junction, check for pax, and try to move to correct bldg
		for (let j = 0; j < store.junctions[i].length - 1; j++) {
			if (store.junctions[i][j] === bldgNum && store.junctions[i][rf.paxIdx] > 0) {
				// add pax to bldg
				store.junctions[i][j] += 10
				store.junctions[i][rf.paxIdx]--
			}
		}
		// A designer standing on a junction with the desired building (never the convention-centre
		// spots) also automatically occupies that building, like a passenger
		if (i !== rf.PITTS_CONVENTION_JUNCTION) {
			if (pitts.getDesignerStatusJunction(store.jeroenStatus) === i && store.jeroenStatus !== rf.DESIGNER_REMOVED) {
				for (let j = 0; j < store.junctions[i].length - 1; j++) {
					if (store.junctions[i][j] === bldgNum) {
						// Park Jeroen on the building (21-23), keeping the attended flag
						store.junctions[i][j] += 20
						store.jeroenStatus = rf.DESIGNER_ON_BUILDING_FLAG + (pitts.hasDesignerAttendedCon(store.jeroenStatus) ? rf.DESIGNER_CON_FLAG : 0) + i
						break
					}
				}
			}
			if (pitts.getDesignerStatusJunction(store.jorisStatus) === i && store.jorisStatus !== rf.DESIGNER_REMOVED) {
				for (let j = 0; j < store.junctions[i].length - 1; j++) {
					if (store.junctions[i][j] === bldgNum) {
						// Park Joris on the building (31-33), keeping the attended flag
						store.junctions[i][j] += 30
						store.jorisStatus = rf.DESIGNER_ON_BUILDING_FLAG + (pitts.hasDesignerAttendedCon(store.jorisStatus) ? rf.DESIGNER_CON_FLAG : 0) + i
						break
					}
				}
			}
		}
	}
}

// Compute the line placement options currently open at a single junction for the
// current player (mirrors the historical logic used for each end junction).
function getJunctionLineOptions(junctionID) {
	const store = useModelStore()
	const player = controller.currentPlayerObj()

	let localPossibilities = view.getLinesAroundJunction(junctionID)

	// Remove any roads which already have this player
	for (let j = localPossibilities.length - 1; j >= 0; j--) {
		if (store.lines[localPossibilities[j]].includes(player.colour)) localPossibilities.splice(j, 1)
	}
	// Save this for later in case all other options run out
	let localPossibilitiesWithoutOwnLines = [...localPossibilities]

	// If all remaining options are occupied, allow all of them
	let occupiedRoads = 0
	let spliceAtTheEnd = false
	for (let j = localPossibilities.length - 1; j >= 0; j--) {
		// Find any roads that are occupied
		if (store.lines[localPossibilities[j]].length > 0) occupiedRoads++
	}
	if (occupiedRoads > 0 && occupiedRoads === localPossibilitiesWithoutOwnLines.length) spliceAtTheEnd = true

	// Remove any roads that would be in the MIDDLE of another player's roads
	for (let j = localPossibilities.length - 1; j >= 0; j--) {
		// First do this removal
		for (let k = 0; k < store.lines[localPossibilities[j]].length; k++) {
			// Get player of this colour
			let otherEndJuncs = controller.getPlayerByColour(store.lines[localPossibilities[j]][k]).endJunctions
			// If this player doesn't have junctionID in their endJunctions, remove it
			if (!otherEndJuncs.includes(junctionID)) {
				localPossibilities.splice(j, 1)
				break
			} else occupiedRoads++
		}
	}

	// Remove lines that are in the middle of someone else's line
	for (let j = localPossibilities.length - 1; j >= 0; j--) {
		// EACH localpossibility[j] is a line ID
		for (let k = 0; k < store.lines[localPossibilities[j]].length; k++) {
			// player of ppl who have lines here
			let removed = false
			let otherEndLines = controller.getPlayerByColour(store.lines[localPossibilities[j]][k]).endLines
			let otherEndJuncs = controller.getPlayerByColour(store.lines[localPossibilities[j]][k]).endJunctions
			// if the other end lines don't include it remove it
			if (!otherEndLines.includes(localPossibilities[j])) {
				localPossibilities.splice(j, 1)
				removed = true
				break
			}
			// To be more precise, you need to find the line that is in the same array position as the matching junction
			// and allow just that line (a junction AND line must match)
			if (otherEndJuncs.includes(junctionID)) {
				let idx1 = otherEndJuncs.indexOf(junctionID)
				let otherEndLine = otherEndLines[idx1]
				if (junctionID === otherEndJuncs[idx1] && otherEndLine !== localPossibilities[j]) {
					// but need to ignore the case when both junctions are the same
					if (otherEndJuncs[0] !== otherEndJuncs[1]) {
						localPossibilities.splice(j, 1)
						removed = true
						break
					}
				}
			}
			if (removed) break
		}
	}

	// Now, if there are no options, allow all the options from before any removal
	if (spliceAtTheEnd) localPossibilities.splice(0)
	if (localPossibilities.length === 0) {
		localPossibilities = [...localPossibilitiesWithoutOwnLines]
	}

	return localPossibilities
}

// Apply the Pittsburgh-specific rules for which line options at a single junction count
// as legal placements (bridge spaces, forced bridge continuation).
function applyPittJunctionRules(localPossibilities) {
	const store = useModelStore()

	// A street that already has a bridge placed on it is not a legal placement for a
	// line marker - the only way forward is via the "expanding after a bridge" options
	localPossibilities = localPossibilities.filter((lineID) => !store.bridges.includes(lineID))

	// Bridges may not be placed during the first line marker placements (initial setup)
	if (store.gameflow.turn === 0) {
		// Remove bridge lines from options during turn 0
		localPossibilities = localPossibilities.filter((lineID) => !rf.PITTS_BRIDGE_LINE_IDS.includes(lineID))
	}

	// Check if the only empty street from this end junction is a bridge space
	let bridgeOnlyOption = null
	let hasNonBridgeOption = false

	for (const lineID of localPossibilities) {
		if (rf.PITTS_BRIDGE_LINE_IDS.includes(lineID)) {
			if (!bridgeOnlyOption) bridgeOnlyOption = lineID
		} else {
			hasNonBridgeOption = true
			break
		}
	}

	// If only bridge option exists and bridge markers are available, force bridge
	if (bridgeOnlyOption && !hasNonBridgeOption && store.remainingBridgeMarkers > 0) {
		localPossibilities = [bridgeOnlyOption]
	} else if (bridgeOnlyOption && !hasNonBridgeOption && store.remainingBridgeMarkers === 0) {
		// No bridge markers available, standard rules apply (already have localPossibilities)
	}

	return localPossibilities
}

export function getLinePlacementOptions() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (store.context.linesLeftToPlace === 0) return
	if (store.context.endJunctionsOptions.length > 0) return

	let possibilities = []
	// First Line
	if (controller.currentPlayerObj().endJunctions.length === 0) {
		possibilities = Array(70)
			.fill()
			.map((_, i) => i)

		// Pittsburgh: remove bridge lines from first line placement options
		if (personal.selectedBoard === rf.BOARD_PITTS) {
			possibilities = possibilities.filter((lineID) => !rf.PITTS_BRIDGE_LINE_IDS.includes(lineID))
		}

		return possibilities
	}

	//let otherEndJuncs = []

	// Otherwise, get the roads around each end junction
	//currentPlayer().endJunctions.forEach((junc) => possibilities = possibilities.concat(getLinesAroundJunction(junc)))
	for (let i = 0; i < controller.currentPlayerObj().endJunctions.length; i++) {
		let localPossibilities = getJunctionLineOptions(controller.currentPlayerObj().endJunctions[i])

		// Pittsburgh bridge rules
		if (personal.selectedBoard === rf.BOARD_PITTS) {
			localPossibilities = applyPittJunctionRules(localPossibilities)
		}

		possibilities = possibilities.concat(localPossibilities)
	}

	// Pittsburgh: "Expanding After a Bridge" - if a bridge exists at the end of the player's
	// bus line, also offer line placement options from the other end of that bridge
	if (personal.selectedBoard === rf.BOARD_PITTS) {
		const player = controller.currentPlayerObj()
		for (let i = 0; i < player.endJunctions.length; i++) {
			const endJunction = player.endJunctions[i]

			// Find the bridge spaces that sit at this end junction and have a bridge placed on them
			const bridgedLineIDs = view
				.getLinesAroundJunction(endJunction)
				.filter((lineID) => rf.PITTS_BRIDGE_LINE_IDS.includes(lineID) && store.bridges.includes(lineID))

			for (const bridgeLineID of bridgedLineIDs) {
				const otherEndJunction = view.getJunctionsAtEndOfLine(bridgeLineID).find((jun) => jun !== endJunction)
				if (otherEndJunction === undefined) continue

				// get the options from the other end of the bridge, also subject to the
				// Pittsburgh bridge rules, then remove the bridge line itself
				let bridgeEndOptions = applyPittJunctionRules(getJunctionLineOptions(otherEndJunction))
				bridgeEndOptions = bridgeEndOptions.filter((line) => line !== bridgeLineID)
				possibilities = possibilities.concat(bridgeEndOptions)
			}
		}
	}

	//let lines = getLinesAroundJunction(junc)

	possibilities = [...new Set(possibilities)]
	if (possibilities.length === 0) store.context.turnEndingErrorMessage = "No Valid Line Placements Left"
	return possibilities
}

export function getPlayerNetworkJunctionsPitts(player) {
	const store = useModelStore()
	const reachable = new Set(player.playerJunctions)
	const junctionsToVisit = [...player.playerJunctions]

	while (junctionsToVisit.length > 0) {
		const currentJunction = junctionsToVisit.shift()
		const linesAroundJunction = view.getLinesAroundJunction(currentJunction)

		for (const lineID of linesAroundJunction) {
			const lineColours = store.lines[lineID]
			const isPlayerLine = lineColours && lineColours.includes(player.colour)
			// Pittsburgh bridge: any player can use a placed bridge joined to the network
			const isUseBridge = rf.PITTS_BRIDGE_LINE_IDS.includes(lineID) && store.bridges.includes(lineID)
			if (!isPlayerLine && !isUseBridge) continue

			const junctionsAtEnds = view.getJunctionsAtEndOfLine(lineID)
			for (const junction of junctionsAtEnds) {
				if (!reachable.has(junction)) {
					reachable.add(junction)
					junctionsToVisit.push(junction)
				}
			}
		}
	}

	return Array.from(reachable)
}

export function canPlayerVrom(forceCheck) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!forceCheck) {
		if (store.context.remainingVroms === 0) return false
		if (store.gameflow.phase !== rf.PHASE_VROM) return false
	}
	let player = controller.currentPlayerObj()
	let networkJunctions = [...player.playerJunctions]
	// Pittsburgh: network includes placed bridges joined to the player's line
	if (personal.selectedBoard === rf.BOARD_PITTS) networkJunctions = getPlayerNetworkJunctionsPitts(player)
	let anyPax = false
	// If no pax (or Splotter Designer) on owned junctions, cannot vrom
	for (let i = 0; i < networkJunctions.length; i++) {
		if (junctionHasMovableToken(networkJunctions[i])) {
			anyPax = true
			break
		}
	}
	if (!anyPax) {
		store.context.turnEndingErrorMessage = "No available passengers or designers in your network"
		if (store.context.historyObj.length === 0 || store.context.historyObj[store.context.historyObj.length - 1].length !== 1) store.context.historyObj.push([1])
		return false
	}
	let anyBldg = false
	for (let i = 0; i < networkJunctions.length; i++) {
		for (let j = 0; j < store.junctions[networkJunctions[i]].length - 1; j++) {
			if (store.junctions[networkJunctions[i]][j] === store.desiredBuilding) {
				anyBldg = true
				break
			}
		}
	}
	// Pittsburgh: a designer can ride to their matching convention-centre spot when that destination
	// type is desired, as long as they stand on one of your junctions, are not already parked on a
	// building, and have not yet attended the Splotter Con; after attending the Splotter Con a designer
	// can be transported back to the Airport (Returning to the Netherlands), again only when the desired
	// type matches theirs (Jeroen - pubs, Joris - offices)
	let specialDest = false
	if (personal.selectedBoard === rf.BOARD_PITTS && !anyBldg) {
		const jeroenJunction = pitts.getDesignerTransportJunction(store.jeroenStatus)
		const jorisJunction = pitts.getDesignerTransportJunction(store.jorisStatus)
		// Only count a designer as a valid move when they actually have a ride available (their
		// convention-centre ride, or the return flight to the Airport when a bus route exists);
		// this keeps the whole-turn gate in sync with what is highlighted and selectable
		if (store.jeroenStatus !== rf.DESIGNER_REMOVED && networkJunctions.includes(jeroenJunction) && controller.canReachBuildingFromJunction(jeroenJunction, player, store, rf.DESIGNER_JEROEN)) specialDest = true
		if (store.jorisStatus !== rf.DESIGNER_REMOVED && networkJunctions.includes(jorisJunction) && controller.canReachBuildingFromJunction(jorisJunction, player, store, rf.DESIGNER_JORIS)) specialDest = true
	}
	if (!anyBldg && !specialDest) {
		store.context.turnEndingErrorMessage = "No available buildings of the desired type in your network"
		// if the end isn't a single item, push a single item
		if (store.context.historyObj.length === 0 || store.context.historyObj[store.context.historyObj.length - 1].length !== 1) store.context.historyObj.push([2])
		return false
	}
	return true
}

// Does this junction contain a passenger, or a Splotter Designer?
function junctionHasMovableToken(junction) {
	const store = useModelStore()
	if (store.junctions[junction][rf.paxIdx] > 0) return true
	if (pitts.getDesignerTransportJunction(store.jeroenStatus) === junction) return true
	if (pitts.getDesignerTransportJunction(store.jorisStatus) === junction) return true
	return false
}

export function getVromBuildings() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (store.context.selectedPaxToVromJunction === -1) return
	let ret = []
	const selectedDesigner = store.context.selectedDesignerToVrom
	const selectedDesignerStatus = selectedDesigner === rf.DESIGNER_JEROEN ? store.jeroenStatus : selectedDesigner === rf.DESIGNER_JORIS ? store.jorisStatus : -1
	// A designer parked on a building or on the convention-centre spot cannot move this turn,
	// so no regular building destinations are offered to them
	const designerParkedAtCon = selectedDesignerStatus >= rf.DESIGNER_ON_BUILDING_FLAG
	if (!designerParkedAtCon) {
		// Pittsburgh: buildings on the far side of bridges added to the player's network are targets
		let networkJunctions = [...controller.currentPlayerObj().playerJunctions]
		if (personal.selectedBoard === rf.BOARD_PITTS) networkJunctions = getPlayerNetworkJunctionsPitts(controller.currentPlayerObj())
		for (let i = 0; i < networkJunctions.length; i++) {
			if (store.junctions[networkJunctions[i]].slice(0, -1).includes(store.desiredBuilding)) {
				let retLine = [networkJunctions[i], []]
				// need [junction.id, [bld idx, bldidx]]
				for (let j = 0; j < store.junctions[networkJunctions[i]].length - 1; j++) if (store.junctions[networkJunctions[i]][j] === store.desiredBuilding) retLine[1].push(j)
				ret.push(retLine)
			}
		}
	}
	// Splotter Designer destinations (Pittsburgh convention centre / Airport)
	// Only shown when the matching designer is the selected token and the demand is correct
	if (personal.selectedBoard === rf.BOARD_PITTS) {
		const origin = store.context.selectedPaxToVromJunction
		if (store.context.selectedDesignerToVrom === rf.DESIGNER_JEROEN && pitts.getDesignerTransportJunction(store.jeroenStatus) === origin && store.jeroenStatus !== rf.DESIGNER_REMOVED) {
			if (!pitts.hasDesignerAttendedCon(store.jeroenStatus) && store.desiredBuilding === rf.DESIGNER_JEROEN_BUILDING_TYPE)
				ret.push([rf.PITTS_CONVENTION_JUNCTION, [rf.VROM_DEST_JEROEN_CON]])
			if (pitts.hasDesignerAttendedCon(store.jeroenStatus) && store.desiredBuilding === rf.DESIGNER_JEROEN_BUILDING_TYPE)
				ret.push([rf.PITTS_AIRPORT_JUNCTION, [rf.VROM_DEST_AIRPORT]])
		}
		if (store.context.selectedDesignerToVrom === rf.DESIGNER_JORIS && pitts.getDesignerTransportJunction(store.jorisStatus) === origin && store.jorisStatus !== rf.DESIGNER_REMOVED) {
			if (!pitts.hasDesignerAttendedCon(store.jorisStatus) && store.desiredBuilding === rf.DESIGNER_JORIS_BUILDING_TYPE)
				ret.push([rf.PITTS_CONVENTION_JUNCTION, [rf.VROM_DEST_JORIS_CON]])
			if (pitts.hasDesignerAttendedCon(store.jorisStatus) && store.desiredBuilding === rf.DESIGNER_JORIS_BUILDING_TYPE)
				ret.push([rf.PITTS_AIRPORT_JUNCTION, [rf.VROM_DEST_AIRPORT]])
		}
	}
	return ret
}

export function endGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.history.push([rf.HIST_GAME_END, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
}

export function getBuildingsToDisplay() {
	const store = useModelStore()
	let displayObj = []
	for (let i = 0; i < store.junctions.length; i++) {
		let lineObj = [i, []]
		for (let j = 0; j < store.junctions[i].length - 1; j++) {
			if (store.junctions[i][j] > 0) {
				lineObj[1].push([j, store.junctions[i][j]])
			}
		}
		if (lineObj[1].length > 0) displayObj.push(lineObj)
	}
	return displayObj
}

export function addLine_core(playerIndex, lineID) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let player = store.players[playerIndex]

	// Pittsburgh bridge placement - don't add to lines, add to bridges
	if (personal.selectedBoard === rf.BOARD_PITTS && rf.PITTS_BRIDGE_LINE_IDS.includes(lineID)) {
		// Add the junctions to the players junctions
		player.playerJunctions = player.playerJunctions.concat(view.getJunctionsAtEndOfLine(lineID))
		player.playerJunctions = [...new Set(player.playerJunctions)]

		// Alter the players endJunctions and endLines
		let endJuncs = view.getJunctionsAtEndOfLine(lineID)
		let startedEqual = false
		if (player.endJunctions[0] === player.endJunctions[1]) startedEqual = true

		// IF First Line
		if (player.endJunctions.length === 0) {
			player.endJunctions = [...endJuncs]
			player.endLines = [lineID, lineID]
		} else {
			// ELSE find the new end junctions possibilities
			if ((player.endJunctions[0] === endJuncs[0] && player.endJunctions[1] === endJuncs[1]) || (player.endJunctions[1] === endJuncs[0] && player.endJunctions[0] === endJuncs[1])) {
				// Need to highlight which junction to pick
				return startedEqual
			}

			for (let i = 0; i < player.endJunctions.length; i++) {
				if (player.endJunctions[i] === endJuncs[0]) {
					// A bridge does not extend the player's line, so endJunctions/endLines stay unchanged
					// Place bridge marker
					store.remainingBridgeMarkers--
					store.bridges.push(lineID)
					// Track which end has the bridge (the end we just expanded from)
					store.bridgeEnds[lineID] = i
					// Set bridge expansion option for next turn
					store.context.bridgeExpansionOption = { lineID: lineID, endIndex: i }

					return startedEqual
				} else if (player.endJunctions[i] === endJuncs[1]) {
					// A bridge does not extend the player's line, so endJunctions/endLines stay unchanged
					// Place bridge marker
					store.remainingBridgeMarkers--
					store.bridges.push(lineID)
					// Track which end has the bridge (the end we just expanded from)
					store.bridgeEnds[lineID] = i
					// Set bridge expansion option for next turn
					store.context.bridgeExpansionOption = { lineID: lineID, endIndex: i }

					return startedEqual
				}
			}
		}
		return startedEqual
	}

	// Regular line placement (non-bridge)
	// Add To Model
	store.lines[lineID].push(player.colour)

	// Add the junctions to the players junctions
	player.playerJunctions = player.playerJunctions.concat(view.getJunctionsAtEndOfLine(lineID))
	player.playerJunctions = [...new Set(player.playerJunctions)]

	// Alter the players endJunctions and endLines
	let endJuncs = view.getJunctionsAtEndOfLine(lineID)
	//alert(`player.endJunctions: ${player.endJunctions}  -- endJuncs: ${endJuncs}`)
	let startedEqual = false
	if (player.endJunctions[0] === player.endJunctions[1]) startedEqual = true
	// IF First Line
	if (player.endJunctions.length === 0) {
		player.endJunctions = [...endJuncs]
		player.endLines = [lineID, lineID]
	} else {
		// ELSE find the new end junctions possibilities
		if ((player.endJunctions[0] === endJuncs[0] && player.endJunctions[1] === endJuncs[1]) || (player.endJunctions[1] === endJuncs[0] && player.endJunctions[0] === endJuncs[1])) {
			// Need to highlight which junction to pick
			//alert("matchy")
			return startedEqual
		}

		for (let i = 0; i < player.endJunctions.length; i++) {
			if (player.endJunctions[i] === endJuncs[0]) {
				player.endJunctions[i] = endJuncs[1]
				player.endLines[i] = lineID
				return startedEqual
			} else if (player.endJunctions[i] === endJuncs[1]) {
				player.endJunctions[i] = endJuncs[0]
				player.endLines[i] = lineID
				return startedEqual
			}
		}

		// Pittsburgh: "Expanding After a Bridge" - if this new line (a non-bridge line)
		// sits at the far end of a bridge attached to one of the player's end junctions,
		// its own junctions won't match the player's end junctions directly (the end
		// junction is on the near side of the bridge). Extend the end across the bridge
		// so the end junction moves to the far end of this new line (away from the bridge).
		if (personal.selectedBoard === rf.BOARD_PITTS) {
			for (let i = 0; i < player.endJunctions.length; i++) {
				let endJunction = player.endJunctions[i]
				const bridgedLineIDs = view
					.getLinesAroundJunction(endJunction)
					.filter((id) => rf.PITTS_BRIDGE_LINE_IDS.includes(id) && store.bridges.includes(id))

				for (let bridgeLineID of bridgedLineIDs) {
					const bridgeFarEnd = view.getJunctionsAtEndOfLine(bridgeLineID).find((j) => j !== endJunction)
					if (bridgeFarEnd === undefined) continue

					if (endJuncs[0] === bridgeFarEnd) {
						player.endJunctions[i] = endJuncs[1]
						player.endLines[i] = lineID
						return startedEqual
					} else if (endJuncs[1] === bridgeFarEnd) {
						player.endJunctions[i] = endJuncs[0]
						player.endLines[i] = lineID
						return startedEqual
					}
				}
			}
		}
	}
}

export function chooseBridgeExpansion(expandFromBridge) {
	const store = useModelStore()
	const player = controller.currentPlayerObj()

	if (!store.context.bridgeExpansionOption) return

	const { lineID, endIndex } = store.context.bridgeExpansionOption

	if (expandFromBridge) {
		// Expand from the far end of the bridge
		// The player's end junction is still at the near end of the bridge
		// (it is not moved when the bridge is placed), so the far end is
		// the other junction of the bridge line
		const nearJunction = player.endJunctions[endIndex]
		const bridgeEndJunction = view.getJunctionsAtEndOfLine(lineID).find((j) => j !== nearJunction)

		// Set the end junctions to expand from the bridge end
		player.endJunctions = [bridgeEndJunction, bridgeEndJunction]
		player.endLines = [lineID, lineID]
	} else {
		// Expand from the last line marker before the bridge
		// This means expanding from the other end of the line
		const otherEndIndex = endIndex === 0 ? 1 : 0
		const otherEndJunction = player.endJunctions[otherEndIndex]

		// Set the end junctions to expand from the other end
		player.endJunctions = [otherEndJunction, otherEndJunction]
		player.endLines = [lineID, lineID]
	}

	// Clear the bridge expansion option
	store.context.bridgeExpansionOption = null
}

export function getJunctionsReachableFromJunction(playerIndex, junctionID) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const playerColout = store.players[playerIndex].colour

	// Use a Set to avoid duplicates and a stack/queue for BFS
	const reachableJunctions = new Set()
	const junctionsToVisit = [junctionID]

	// Add starting junction
	reachableJunctions.add(junctionID)

	while (junctionsToVisit.length > 0) {
		const currentJunction = junctionsToVisit.shift()
		// Get all lines around this junction
		const linesAroundJunction = view.getLinesAroundJunction(currentJunction)

		for (const lineID of linesAroundJunction) {
			// Check if this player has built this line
			const lineColours = store.lines[lineID]
			let canUseLine = lineColours && lineColours.includes(playerColout)

			// Pittsburgh bridge usage: any player can use a placed bridge joined to the network
			if (personal.selectedBoard === rf.BOARD_PITTS && !canUseLine) {
				if (rf.PITTS_BRIDGE_LINE_IDS.includes(lineID) && store.bridges.includes(lineID)) {
					const junctionsAtEnds = view.getJunctionsAtEndOfLine(lineID)
					if (reachableJunctions.has(junctionsAtEnds[0]) || reachableJunctions.has(junctionsAtEnds[1])) {
						canUseLine = true
					}
				}
			}

			if (!canUseLine) continue

			// Get the junctions at the ends of this line
			const junctionsAtEnds = view.getJunctionsAtEndOfLine(lineID)

			// Find the junction at the other end (not the current one)
			for (const junctionAtEnd of junctionsAtEnds) {
				if (junctionAtEnd !== currentJunction && !reachableJunctions.has(junctionAtEnd)) {
					// Add this junction to our reachable set and queue
					reachableJunctions.add(junctionAtEnd)
					junctionsToVisit.push(junctionAtEnd)
				}
			}
		}
	}

	// Convert Set to Array and return
	return Array.from(reachableJunctions)
}
