import * as constants from "../constants"
import * as refFuncs from "../refFuncs"
import * as IO from "../BUS_IO"
import * as Bot from "../BUSbot"

import { ref, reactive } from "vue"
import { getLineSVGpoints } from "../composables/view.js"

import { defineStore } from "pinia"
import { /*initialPlayersState,*/ initialLinesState, initialJunctionsStateArray } from "../seed.js"
import { usePersonalStore } from "../stores/personal.js"

//import { storeToRefs } from 'pinia'

/************************ SET UP ONCE VARS */
//var trainingGame = true
//var gameCreationTimestamp = 0 // NEEDS SAVING LOCALLY
//var gameName = 'Bus Game Name'
//var liveWS = "yellow"
/********************** */

export const useModelStore = defineStore("model", () => {
	const personal = usePersonalStore()

	//const players = reactive(initialPlayersState)
	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})

	const players = reactive([])
	const junctions = reactive([...initialJunctionsStateArray])

	const refSize = ref(120)
	const desiredBuilding = ref(1)

	const remainingTimeStones = ref(5) // 4 IN THREE PLAYERS !!!
	const remainingPassengers = ref(11)
	const lines = reactive([...initialLinesState])

	const actionAreaData = reactive([[-1, -1, -1, -1, -1, -1], [-1], [-1, -1, -1, -1, -1, -1], [-1, -1, -1, -1, -1, -1], [-1], [-1, -1, -1, -1, -1, -1], [-1]])
	//const remainingBuildings = reactive([30, 30, 30]) // CHANGED // Dud 0 index, rest matches building ID 1-3

	const gameflow = reactive({
		turn: 0,
		phase: 0,
		turnOrder: [],
		fullTurnOrder: [],
		fullActionTurnOrder: [],
		gameEnded: 0,
	})

	const chatData = reactive([])

	const history = reactive([])

	// UNSAVED - TEMP VARS
	const context = reactive({
		buildingsLeftToPlace: 0,
		linesLeftToPlace: 0,
		passengersLeftToPlace: 0,
		selectedBuildingType: 1,
		remainingVroms: 0,
		turnEndingErrorMessage: "",
		//subphase: 0,
		selectedPaxToVromJunction: -1,
		endJunctionsOptions: [],
		actionChosen: false,
		confirmEndTurn: false,
		confirmResign: false,
		historyObj: [],
		action: -1,
	})
	const topMenuViews = reactive({
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showLoader: false,
		showRewindPanel: false,
		selectingBoard: false,
		displayRightActionSelection: true,
		showReplay: false,
		generatingReplay: false,
		showStatsExcludeDropdown: false,
	})

	const turnResetData = ref("")
	const endReplayResetData = ref("")

	const historyHelpers = reactive({
		buildingsToHighlight: [],
		linesToHighlight: [],
		junctionsToHighlight: [],
	})
	function clearHistoryHelpers() {
		historyHelpers.buildingsToHighlight = []
		historyHelpers.linesToHighlight = []
		historyHelpers.junctionsToHighlight = []
	}

	const performingRewind = ref(false)
	const performingBoardChange = ref(false)
	const rewindErrorText = ref("")
	const successText = ref("")

	const replayStep = ref(0)
	const replayData = reactive([])

	function phaseStr() {
		var phaseStr = "333"
		if (gameflow.phase === 0) phaseStr = "Setup Buildings" // TO: 2 bldgs on zone 1 per player
		if (gameflow.phase === 1) phaseStr = "Setup Lines" // TO then reverse TO,eg 1,2,3,4,4,3,2,1, place 1 line
		if (gameflow.phase === 2) phaseStr = "Choose Actions" // TO: At least 2 actions, then can pass
		if (gameflow.phase === 3) phaseStr = "Line Expansion" // 5p: +1 to maxNumBus
		if (gameflow.phase === 4) phaseStr = "Add a Bus"
		if (gameflow.phase === 5) phaseStr = "Add Passengers"
		if (gameflow.phase === 6) phaseStr = "Add Buildings" // (GE check)
		if (gameflow.phase === 7) phaseStr = "Alter Time" // AND POSSIBLE IMMEDIATE GAME END
		if (gameflow.phase === 8) phaseStr = "VRROOOMM!!"
		if (gameflow.phase === 9) phaseStr = "Change Start Player" // GE check, if no more bldg spots
		if (gameflow.phase === 10) phaseStr = "Game End Check" // bldg spots, only 1 player with action markers
		if (gameflow.phase === 11) phaseStr = "Game Finished"

		return phaseStr
	}

	function currentPlayer() {
		if (gameflow.turnOrder.length > 0) return players[gameflow.turnOrder[0]]
		else {
			if (!topMenuViews.generatingReplay && !gameflow.phase === constants.PHASE_GAME_OVER) alert("CP() Error")
			return 0
		}
	}

	function currentPlayerIndex() {
		if (gameflow.turnOrder.length > 0) return gameflow.turnOrder[0]
		else {
			alert("CPI() Error")
			return 0
		}
	}

	function maxBuses() {
		let busArr = []
		players.forEach((player) => busArr.push(player.buses))
		return busArr.reduce((a, b) => Math.max(a, b), -Infinity)
	}

	function maxBusesWithNewBus() {
		if (actionAreaData[1][0] !== -1) return maxBuses()
		return Math.max(maxBuses(), getPlayerByColour(actionAreaData[1][0]).buses + 1)
	}

	function getWinnerName(returnScores) {
		// order players by score and timestones
		let resArr = [...players]
		let cmp = (a, b) => (a > b) - (a < b)

		/* I WANT A SORT OF FLOOR(SCORE) -> TIMESTONES -> MAX SCORE */

		// sort by timestones in equal score
		resArr.sort(function (a, b) {
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

	function increaseScore(player) {
		let newScore = Math.floor(player.score) + 1 + 0.5
		for (let i = 0; i < players.length; i++) {
			if (Math.floor(players[i].score) === Math.floor(newScore)) newScore -= 0.1
			newScore = Math.round(newScore * 10) / 10
		}
		player.score = newScore
		let newMax = Math.floor(player.score) + player.timeStones

		if (newMax > player.maxScore) {
			//let newMax = newScore + player.timeStones
			for (let i = 0; i < players.length; i++) if (newMax === players[i].maxScore) newMax -= 0.1
			player.maxScore = newMax
		}
	}

	function decreaseScore(player) {
		let newScore = Math.floor(player.score) - 1 + 0.5 + player.timeStones / 10
		for (let i = 0; i < players.length; i++) {
			if (Math.floor(players[i].score) === Math.floor(newScore)) newScore -= 0.1
			newScore = Math.round(newScore * 10) / 10
		}
		player.score = newScore
	}

	function getScoreObj() {
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
	function getBuildingsToDisplay() {
		let displayObj = []
		for (let i = 0; i < junctions.length; i++) {
			let lineObj = [i, []]
			for (let j = 0; j < junctions[i].length - 1; j++) {
				if (junctions[i][j] > 0) {
					lineObj[1].push([j, junctions[i][j]])
				}
			}
			if (lineObj[1].length > 0) displayObj.push(lineObj)
		}
		return displayObj
	}

	function getEmptyBuildingSpots(forceReturn) {
		if (!forceReturn && context.buildingsLeftToPlace === 0) return

		if (gameflow.phase === 0) return getEmptyBuildingSpotsByNumber(1)
		let options = []
		options = getEmptyBuildingSpotsByNumber(1)
		if (options.length === 0) options = getEmptyBuildingSpotsByNumber(2)
		if (options.length === 0) options = getEmptyBuildingSpotsByNumber(3)
		if (options.length === 0) options = getEmptyBuildingSpotsByNumber(4)
		if (options.length === 0) {
			context.turnEndingErrorMessage = "No more building spots available"
		}
		return options
	}
	function getEmptyBuildingSpotsByNumber(number) {
		let displayObj = []
		for (let i = 0; i < junctions.length; i++) {
			let lineObj = [i, []]
			for (let j = 0; j < junctions[i].length - 1; j++) {
				if (j === number && junctions[i][j] === 0) lineObj[1].push(j)
				if (number === 1 && j === 0 && junctions[i][j] === 0) lineObj[1].push(j)
			}
			if (lineObj[1].length > 0) displayObj.push(lineObj)
		}
		return displayObj
	}

	function getEmptyBuildingSpotsByNumberTotal(number) {
		let displayObj = getEmptyBuildingSpotsByNumber(number)
		let count = 0
		for (let i = 0; i < displayObj.length; i++) count += displayObj[i][1].length
		return count
	}

	function moveAllPassengersOntoJunctions() {
		for (let i = 0; i < junctions.length; i++) {
			for (let j = 0; j < junctions[i].length - 1; j++) {
				if (junctions[i][j] > 10) {
					// Remove pax from bldg
					junctions[i][j] -= 10
					junctions[i][constants.paxIdx]++
				}
			}
		}
	}

	function moveAllPassengersOntoCorrectBuilding(bldgNum) {
		for (let i = 0; i < junctions.length; i++) {
			// On each junction, check for pax, and try to move to correct bldg
			for (let j = 0; j < junctions[i].length - 1; j++) {
				if (junctions[i][j] === bldgNum && junctions[i][constants.paxIdx] > 0) {
					// add pax to bldg
					junctions[i][j] += 10
					junctions[i][constants.paxIdx]--
				}
			}
		}
	}

	function getJunctionsAtEndOfLine(lineID) {
		return refFuncs.getJunctionsAtEndOfLine(lineID)
	}
	function getLinesAroundJunction(junc) {
		return refFuncs.getLinesAroundJunction(junc)
	}

	function getLineEndCircleData() {
		// want [player colour, line1end]
		let ret = []

		for (let i = 0; i < players.length; i++) {
			for (let j = 0; j < players[i].endLines.length; j++) {
				let endLine = players[i].endLines[j]
				let lineOffset = 0
				lineOffset = lines[endLine].indexOf(players[i].colour)
				let rawPoints = getLineSVGpoints(endLine, lineOffset, true)

				// find the index of the junction in connected lines
				var index = getJunctionsAtEndOfLine(endLine).indexOf(players[i].endJunctions[j])
				// Now place the circle at either the left / right of the line
				let shift = 0
				if (index === 1) shift = 4

				let correctedX = rawPoints[0 + shift] + (rawPoints[2 + shift] - rawPoints[0 + shift]) / 2
				let correctedY = rawPoints[1 + shift] + (rawPoints[3 + shift] - rawPoints[1 + shift]) / 2
				ret.push([players[i].colour, correctedX, correctedY])
			}
		}

		return ret
	}

	function getLinePlacementOptions() {
		if (context.linesLeftToPlace === 0) return
		if (context.endJunctionsOptions.length > 0) return
		let possibilities = []
		// First Line
		if (currentPlayer().endJunctions.length === 0) {
			possibilities = Array(70)
				.fill()
				.map((x, i) => i)
			return possibilities
		}

		// Otherwise, get the roads around each end junction
		//currentPlayer().endJunctions.forEach((junc) => possibilities = possibilities.concat(getLinesAroundJunction(junc)))
		for (let i = 0; i < currentPlayer().endJunctions.length; i++) {
			let localPossibilities = getLinesAroundJunction(currentPlayer().endJunctions[i])

			// Now remove any roads which already have the player
			for (let j = localPossibilities.length - 1; j >= 0; j--) {
				if (lines[localPossibilities[j]].includes(currentPlayer().colour)) localPossibilities.splice(j, 1)
			}
			// Save this for later in case all other options run out
			let localPossibilitiesWithoutOwnLines = [...localPossibilities]

			// NEW CODE - if all remaining options are occupied, allow all of them
			let occupiedRoads = 0
			let spliceAtTheEnd = false
			for (let j = localPossibilities.length - 1; j >= 0; j--) {
				// Find any roads that are occupied
				if (lines[localPossibilities[j]].length > 0) occupiedRoads++
			}
			//alert(`occupiedRoads: ${occupiedRoads}  -- localPossibilitiesWithoutOwnLines: ${localPossibilitiesWithoutOwnLines}`)
			if (occupiedRoads > 0 && occupiedRoads === localPossibilitiesWithoutOwnLines.length) spliceAtTheEnd = true

			// Now remove any roads that would be in the MIDDLE of another players roads
			// We are working on a single junction, and localPossibilities has only options without our lines
			// for each line ID, see if that player has an end junction that is the same as this junciton
			for (let j = localPossibilities.length - 1; j >= 0; j--) {
				// First do this removal
				for (let k = 0; k < lines[localPossibilities[j]].length; k++) {
					// Get player of this colour
					let otherEndJuncs = getPlayerByColour(lines[localPossibilities[j]][k]).endJunctions
					// If this player doesn't have currentPlayer().endJunctions[i] in their endJunctions, remove it
					if (!otherEndJuncs.includes(currentPlayer().endJunctions[i])) {
						localPossibilities.splice(j, 1)
						break
					} else occupiedRoads++
				}
			}

			//alert(localPossibilities.length + " " + occupiedRoads)

			// Now remove lines that are in the middle of someone else's line
			for (let j = localPossibilities.length - 1; j >= 0; j--) {
				// EACH localpossibility[j] is a line ID
				for (let k = 0; k < lines[localPossibilities[j]].length; k++) {
					// player index of ppl who have lines here - alert(JSON.stringify(lines[localPossibilities[j]]))
					let removed = false
					// Go thru the lines.
					for (let m = 0; m < lines[localPossibilities[j]].length; m++) {
						let otherEndLines = getPlayerByColour(lines[localPossibilities[j]][k]).endLines
						let otherEndJuncs = getPlayerByColour(lines[localPossibilities[j]][k]).endJunctions
						// alert(otherEndJuncs)
						// if ther other end lines dont include it remove it
						if (!otherEndLines.includes(localPossibilities[j])) {
							//alert(22)
							localPossibilities.splice(j, 1)
							removed = true
							break
						}
						/*
            			// I DONT UNDERSTAND THIS. BUT IT REMOVED TOO MUCH
						// But this could leave you with a line where the end is the other end of the line
						var index = otherEndJuncs.indexOf(currentPlayer().endJunctions[i])
						if (otherEndLines[index] !== localPossibilities[j]) {
							//alert(33)
							// THIS REMOVAL SEEMS TO REMOVE OTHER OPTIONS WHEN YOU MEET A DOUBLE HEAD
              			// BUT DOESN'T CORRECTLY ALLOW A SINGLE HEAD IN THE MIDDLE OF A LINE
							//localPossibilities.splice(j, 1)
							removed = true
							break
						}*/

						// Need to remove the correct line if you meet a head in the middle of their line
						// DEFUNCT
						/*if (otherEndJuncs.includes(currentPlayer().endJunctions[i])) {
              //alert(`otherEndJuncs: ${otherEndJuncs}  -- currentPlayer().endJunctions[i]: ${currentPlayer().endJunctions[i]}`)
              //alert(`otherendlines: ${otherEndLines}  -- localPossibilities[j]: ${localPossibilities[j]}`)
              
             let index1 = otherEndJuncs.indexOf(currentPlayer().endJunctions[i])
      
              // find the index of the junction in connected lines
              let index2 = getJunctionsAtEndOfLine(otherEndLines[index1]).indexOf(otherEndJuncs[index1])
              alert(index2)
              alert(otherEndLines[index2])
              if (localPossibilities[j] !== otherEndLines[index2]) {
                localPossibilities.splice(j, 1)
                removed = true
                break
              }
            }*/

						// To be more precise, you need to find the line that is in the same array position as the matching junciton
						// and allow just that line
						// Or rather, the a junction AND line must match

						// So if there is a matching junction, find the matching line, and allow it
						if (otherEndJuncs.includes(currentPlayer().endJunctions[i])) {
							let idx1 = otherEndJuncs.indexOf(currentPlayer().endJunctions[i])
							let otherEndLine = otherEndLines[idx1]
							//alert(`endjunctions[i]: ${currentPlayer().endJunctions[i]}   otherendjuncs[idx1]: ${otherEndJuncs[idx1]}`)
							//alert(`otherendline: ${otherEndLine}   localpossibilities[j]: ${localPossibilities[j]}`)
							if (currentPlayer().endJunctions[i] === otherEndJuncs[idx1] && otherEndLine !== localPossibilities[j]) {
								// but need to ignore the case when both junctions are the same
								if (otherEndJuncs[0] !== otherEndJuncs[1]) {
									localPossibilities.splice(j, 1)
									removed = true
									break
								}
							}
						}
					}
					if (removed) break
				}
			}
			//return localPossibilities
			//alert(localPossibilities)
			// Now, if there are no options, allow all options (ie use localPossibilitiesWithoutOwnLines)
			if (spliceAtTheEnd) localPossibilities.splice(0)
			if (localPossibilities.length === 0) {
				//} || localPossibilities.length === occupiedRoads) {
				localPossibilities = [...localPossibilitiesWithoutOwnLines]
			}
			possibilities = possibilities.concat(localPossibilities)
		}
		//let lines = getLinesAroundJunction(junc)

		possibilities = [...new Set(possibilities)]
		if (possibilities.length === 0) context.turnEndingErrorMessage = "No Valid Line Placements Left"
		return possibilities
	}

	function getPlayerByColour(colour) {
		return players.find((players) => players.colour === colour)
	}
	function getPlayerIndexFromColour(colour) {
		let index = players.findIndex((object) => {
			return object.colour === colour
		})
		return index
	}

	function canPlayerVrom(forceCheck) {
		if (!forceCheck) {
			if (context.remainingVroms === 0) return false
			if (gameflow.phase !== constants.PHASE_VROM) return false
		}
		let player = currentPlayer()
		let anyPax = false
		// If no pax on owned junctions, cannot vrom
		for (let i = 0; i < player.playerJunctions.length; i++) {
			if (junctions[player.playerJunctions[i]][constants.paxIdx] > 0) {
				anyPax = true
				break
			}
		}
		if (!anyPax) {
			context.turnEndingErrorMessage = "No available passengers in your network"
			if (context.historyObj.length === 0 || context.historyObj[context.historyObj.length - 1].length !== 1) context.historyObj.push([1])
			return false
		}
		let anyBldg = false
		for (let i = 0; i < player.playerJunctions.length; i++) {
			for (let j = 0; j < junctions[player.playerJunctions[i]].length - 1; j++) {
				if (junctions[player.playerJunctions[i]][j] === desiredBuilding.value) {
					anyBldg = true
					break
				}
			}
		}
		if (!anyBldg) {
			context.turnEndingErrorMessage = "No available buildings of the desired type in your network"
			// if the end isn't a single item, push a single item
			if (context.historyObj.length === 0 || context.historyObj[context.historyObj.length - 1].length !== 1) context.historyObj.push([2])
			return false
		}
		return true
	}

	function getVromBuildings() {
		if (context.selectedPaxToVromJunction === -1) return
		let ret = []
		for (let i = 0; i < currentPlayer().playerJunctions.length; i++) {
			if (junctions[currentPlayer().playerJunctions[i]].slice(0, -1).includes(desiredBuilding.value)) {
				let retLine = [currentPlayer().playerJunctions[i], []]
				// need [junction.id, [bld idx, bldidx]]
				for (let j = 0; j < junctions[currentPlayer().playerJunctions[i]].length - 1; j++) if (junctions[currentPlayer().playerJunctions[i]][j] === desiredBuilding.value) retLine[1].push(j)
				ret.push(retLine)
			}
		}
		return ret
	}

	function endGame() {
		history.push([constants.HIST_GAME_END, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
	}

	function currentPlayerCanPass() {
		//if (context.actionChosen) return false
		if (gameflow.phase !== constants.PHASE_CHOOSE_ACTIONS) return false
		let takenActions = 0
		for (let i = 0; i < actionAreaData.length; i++) {
			for (let j = 0; j < actionAreaData[i].length; j++) {
				if (actionAreaData[i][j] === currentPlayer().colour) takenActions++
				if (takenActions >= 2) return true
			}
		}
		if (currentPlayer().remainingActions === 0) return true
		return false
	}

	function resetVarsOnTurnEnd() {
		context.buildingsLeftToPlace = 0
		context.linesLeftToPlace = 0
		context.passengersLeftToPlace = 0
		context.selectedBuildingType = 1
		context.remainingVroms = 0
		context.turnEndingErrorMessage = ""
		//context.subphase = 0
		context.selectedPaxToVromJunction = -1
		context.endJunctionsOptions = []
		context.actionChosen = false
		context.confirmEndTurn = false
		context.confirmResign = false
		context.historyObj.splice(0, context.historyObj.length)
		rewindErrorText.value = ""
		successText.value = ""
	}

	function endPlayerChooseActionTurn() {
		// If action chose, rotate the turn order
		if (context.actionChosen) {
			if (gameflow.phase === constants.PHASE_CHOOSE_ACTIONS) history.push([constants.HIST_CHOOSE_ACTION, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
			gameflow.turnOrder.push(gameflow.turnOrder.shift())
			Bot.actionAnyBotMooves() // At end of player choosing an action
			resetVarsOnTurnEnd()
		}
		// Else player has passed, so remove and check for next phase
		else {
			history.push([constants.HIST_CHOOSE_ACTION, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [10]])
			resetVarsOnTurnEnd()
			gameflow.turnOrder.shift()
			Bot.actionAnyBotMooves() // At end of player passing actions
			if (gameflow.turnOrder.length === 0) endCurrentPhase()
		}

		// Skip any players who have just used up their actions
		while (gameflow.turnOrder.length > 0 && gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && (players[gameflow.turnOrder[0]].remainingActions === 0 || players[gameflow.turnOrder[0]].passActionsFlag === true)) {
			if (players[gameflow.turnOrder[0]].passActionsFlag === true) {
				history.push([constants.HIST_CHOOSE_ACTION, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [11]])
				players[gameflow.turnOrder[0]].passActionsFlag = false
			}
			gameflow.turnOrder.shift()
		}

		// Skip any players again -- THIS NEEDS TO BE HERE FOR SOME REASON
		// SOMETHING TO DO WITH SOME PLAYERS SKIPPING AND OTHERS NOT, WHILST SOME HAVE 0 ACTIONS
		// Skip any players who have just used up their actions

		if (gameflow.turnOrder.length === 0) endCurrentPhase()
		IO.saveGame(true)
		//startPlayerTurn() // MOO
	}

	function canSkipPhase() {
		if (gameflow.phase === constants.PHASE_LINE_EXPANSION && refFuncs.removeItemAll(actionAreaData[0], -1).length === 0) return true
		if (gameflow.phase === constants.PHASE_ADD_PAX && refFuncs.removeItemAll(actionAreaData[2], -1).length === 0) return true
		if (gameflow.phase === constants.PHASE_ADD_BLDGS && refFuncs.removeItemAll(actionAreaData[3], -1).length === 0) return true
		if (gameflow.phase === constants.PHASE_VROM && refFuncs.removeItemAll(actionAreaData[5], -1).length === 0) return true
		return false
	}

	function startPlayerTurn() {
		//alert('start')
		const personal = usePersonalStore()
		if (!personal.canPlay()) return
		// SHOULD ONLY BE HERE IF YOU CAN ACTUALLY PLAY

		// Setup Bldgs
		if (gameflow.phase === constants.PHASE_SETUP_BLDGS) context.buildingsLeftToPlace = 2
		// Setup Lines
		else if (gameflow.phase === constants.PHASE_SETUP_LINES) {
			context.linesLeftToPlace = 1 //+ 90
			if (gameflow.turnOrder.length === players.length) context.linesLeftToPlace = 2
		}
		// Choose Actions
		// Line Expansion
		else if (gameflow.phase === constants.PHASE_LINE_EXPANSION) {
			context.linesLeftToPlace = maxBuses() - gameflow.turnOrder.length + 1 // + 60
			if (players.length === 5) context.linesLeftToPlace++
			//if (context.linesLeftToPlace <= 0) endPlayerTurn()
		}
		// Add Pax
		else if (gameflow.phase === constants.PHASE_ADD_PAX) {
			context.passengersLeftToPlace = maxBuses() - (gameflow.fullActionTurnOrder.length - gameflow.turnOrder.length)
		}
		// Add Bldgs
		else if (gameflow.phase === constants.PHASE_ADD_BLDGS) {
			context.buildingsLeftToPlace = maxBuses() - gameflow.turnOrder.length + 1 // + 60
		}
		// VROM
		else if (gameflow.phase === constants.PHASE_VROM) {
			context.remainingVroms = currentPlayer().buses
			canPlayerVrom()
		}

		// Save Reset
		turnResetData.value = exportModel()
	}

	function endPlayerTurn() {
		// history: [.., [HIST_ACTION, PLAYER_ID, TIMESTAMP, [PARAMS]], ... ]

		if (gameflow.phase === constants.PHASE_SETUP_BLDGS) history.push([constants.HIST_ADD_BLDG, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
		else if (gameflow.phase === constants.PHASE_SETUP_LINES) history.push([constants.HIST_ADD_LINE, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
		else if (gameflow.phase === constants.PHASE_LINE_EXPANSION) history.push([constants.HIST_ADD_LINE, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
		else if (gameflow.phase === constants.PHASE_ADD_BLDGS) history.push([constants.HIST_ADD_BLDG, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
		else if (gameflow.phase === constants.PHASE_ADD_PAX) history.push([constants.HIST_ADD_PAX, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
		else if (gameflow.phase === constants.PHASE_ALTER_TIME) history.push([constants.HIST_ALTER_TIME, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
		else if (gameflow.phase === constants.PHASE_VROM) history.push([constants.HIST_VROM, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])

		resetVarsOnTurnEnd()
		gameflow.turnOrder.shift()
		//Bot.updateTurnOrder()
		// Skip players at start of player turn with low max buses
		if (gameflow.phase === constants.PHASE_ADD_PAX && gameflow.turnOrder.length > 0) {
			let actionsRemaining = 0
			do {
				actionsRemaining = maxBuses() - (gameflow.fullActionTurnOrder.length - gameflow.turnOrder.length)
				if (actionsRemaining <= 0) {
					history.push([constants.HIST_ADD_PAX, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
					gameflow.turnOrder.shift()
					//Bot.updateTurnOrder()
				}
			} while (actionsRemaining <= 0 && gameflow.turnOrder.length > 0)
		} else if (gameflow.phase === constants.PHASE_VROM) {
			// Everyone has at least one bus, so remainingVroms > 0
			while (gameflow.turnOrder.length > 0 && !canPlayerVrom(true)) {
				history.push([constants.HIST_VROM, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
				resetVarsOnTurnEnd()
				gameflow.turnOrder.shift()
				// Bot.updateTurnOrder()
				if (gameflow.turnOrder.length === 0) {
					endCurrentPhase()
					break
					//return
				}
				//startPlayerTurn()
			}
		}
		// Now skip players if there are no pax left to add
		if (gameflow.phase === constants.PHASE_ADD_PAX && remainingPassengers.value <= 0 && gameflow.turnOrder.length > 0) {
			do {
				history.push([constants.HIST_ADD_PAX, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [-1]])
				gameflow.turnOrder.shift()
				//Bot.updateTurnOrder()
			} while (gameflow.turnOrder.length > 0)
		}

		// Called at end of ALTER_TIME phase, so can check game end here
		// EVALUATED EVERY TIME, BUT RUNS ONLY AT FIRST TIME - IE AFTER ALTER TIME
		if (gameflow.turnOrder.length === 0) {
			if (remainingTimeStones.value === 0) {
				gameflow.gameEnded = 1
				endGame()
			} else {
				endCurrentPhase()
			}
		} else {
			// do nothing
		}
		if (gameflow.gameEnded === 0) Bot.actionAnyBotMooves()
		IO.saveGame(true)
	} // End Player Turn

	function endCurrentPhase() {
		// DO END PHASE STUFF
		if (gameflow.phase === constants.PHASE_CHOOSE_ACTIONS) {
			for (let i = 0; i < players.length; i++) players[i].passActionsFlag = false
		}

		// Skip phases that no one has chosen
		do {
			gameflow.phase++
			if (gameflow.phase > constants.PHASE_CHANGE_START_PLAYER) gameflow.phase = constants.PHASE_CHOOSE_ACTIONS
		} while (canSkipPhase())

		// SETUP NEW PHASE
		if (gameflow.phase === constants.PHASE_SETUP_LINES) {
			gameflow.turnOrder = [...gameflow.fullTurnOrder].concat([...gameflow.fullTurnOrder].reverse())
			gameflow.turnOrder.splice(players.length, 1)
		}
		// Phase choose actions
		else if (gameflow.phase === constants.PHASE_CHOOSE_ACTIONS) {
			gameflow.turn++
			history.push([constants.HIST_NEW_TURN, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [gameflow.turn]])
			gameflow.turnOrder = [...gameflow.fullTurnOrder]
			// remove all non players
			for (let i = gameflow.turnOrder.length - 1; i >= 0; i--) {
				if (players[gameflow.turnOrder[i]].displayName === "BusBot" || players[gameflow.turnOrder[i]].remainingActions === 0) {
					gameflow.turnOrder.splice(i, 1)
				}
			}
			if (gameflow.gameEnded === 0) {
				for (let i = 0; i < actionAreaData.length; i++) {
					for (let j = 0; j < actionAreaData[i].length; j++) {
						actionAreaData[i][j] = -1
					}
				}
			}
		}
		// Phase Line Expansion
		else if (gameflow.phase === constants.PHASE_LINE_EXPANSION) {
			gameflow.turnOrder = refFuncs.removeItemAll([...actionAreaData[0]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < gameflow.turnOrder.length; i++) gameflow.turnOrder[i] = getPlayerIndexFromColour(gameflow.turnOrder[i])
			gameflow.fullActionTurnOrder = [...gameflow.turnOrder]
			//Bot.updateTurnOrder()
		}
		// Phase Add Bus
		else if (gameflow.phase === constants.PHASE_ADD_BUS) {
			if (actionAreaData[1][0] !== -1) {
				getPlayerByColour(actionAreaData[1][0]).buses++
				history.push([constants.HIST_ADD_BUS, getPlayerIndexFromColour(actionAreaData[1][0]), Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [getPlayerByColour(actionAreaData[1][0]).buses]])
			}
			endCurrentPhase()
			// Re running this loop, so start turn after
			return
		}
		// Phase Add Pax
		else if (gameflow.phase === constants.PHASE_ADD_PAX) {
			gameflow.turnOrder = refFuncs.removeItemAll([...actionAreaData[2]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < gameflow.turnOrder.length; i++) gameflow.turnOrder[i] = getPlayerIndexFromColour(gameflow.turnOrder[i])
			gameflow.fullActionTurnOrder = [...gameflow.turnOrder]
			//Bot.updateTurnOrder()
		}
		// Phase Add Bldgs
		else if (gameflow.phase === constants.PHASE_ADD_BLDGS) {
			gameflow.turnOrder = refFuncs.removeItemAll([...actionAreaData[3]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < gameflow.turnOrder.length; i++) gameflow.turnOrder[i] = getPlayerIndexFromColour(gameflow.turnOrder[i])
			gameflow.fullActionTurnOrder = [...gameflow.turnOrder]
			//Bot.updateTurnOrder()
		}
		// Phase alter time
		else if (gameflow.phase === constants.PHASE_ALTER_TIME) {
			let botAlterTime = false
			if (actionAreaData[4][0] !== -1) {
				gameflow.turnOrder = [actionAreaData[4][0]]
				gameflow.turnOrder[0] = getPlayerIndexFromColour(gameflow.turnOrder[0])
				if (players[gameflow.turnOrder[0]].displayName === "BusBot") botAlterTime = true
				//Bot.updateTurnOrder()
			}
			if (botAlterTime || actionAreaData[4][0] === -1 || gameflow.turnOrder.length === 0) {
				desiredBuilding.value++
				if (desiredBuilding.value === 4) desiredBuilding.value = 1
				history.push([constants.HIST_ALTER_TIME, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [desiredBuilding.value]])
				endCurrentPhase()
				return
			}
		}
		// Phase VROM
		else if (gameflow.phase === constants.PHASE_VROM) {
			moveAllPassengersOntoCorrectBuilding(desiredBuilding.value)
			gameflow.turnOrder = refFuncs.removeItemAll([...actionAreaData[5]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < gameflow.turnOrder.length; i++) gameflow.turnOrder[i] = getPlayerIndexFromColour(gameflow.turnOrder[i])
			gameflow.fullActionTurnOrder = [...gameflow.turnOrder]
			//Bot.updateTurnOrder()
		}
		// Phase Change Start Player
		else if (gameflow.phase === constants.PHASE_CHANGE_START_PLAYER) {
			moveAllPassengersOntoJunctions()
			// change start plasyer
			if (actionAreaData[6][0] !== -1) {
				let newStartPlayer = getPlayerIndexFromColour(actionAreaData[6][0])
				var i = 0
				do {
					gameflow.fullTurnOrder.push(gameflow.fullTurnOrder.shift())
					i++
					if (i === 10) break
				} while (gameflow.fullTurnOrder[0] !== newStartPlayer)
				history.push([constants.HIST_STARTING_PLAYER, getPlayerIndexFromColour(actionAreaData[6][0]), Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...gameflow.fullTurnOrder]])
			}
			// Otherwise player to the left is now starting
			else {
				gameflow.fullTurnOrder.push(gameflow.fullTurnOrder.shift())
				history.push([constants.HIST_STARTING_PLAYER, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...gameflow.fullTurnOrder]])
			}

			gameflow.phase = constants.PHASE_GAME_END_CHECK
			// check game end
			// No more building spots?
			if (getEmptyBuildingSpots(true).length === 0) gameflow.gameEnded = 2
			var eligiblePlayers = 0
			for (let i = 0; i < players.length; i++) {
				if (players[i].remainingActions > 0) eligiblePlayers++
			}
			if (eligiblePlayers <= 1) gameflow.gameEnded = 3
			if (gameflow.gameEnded > 0) {
				gameflow.phase = constants.PHASE_GAME_OVER
				endGame()
				return
			} else endCurrentPhase()
		}

		// Skip players at START of new phase; someone at the end will always be able to play
		if (gameflow.phase === constants.PHASE_LINE_EXPANSION || gameflow.phase === constants.PHASE_ADD_BLDGS) {
			let actionsRemaining = 0
			do {
				if (gameflow.phase === constants.PHASE_LINE_EXPANSION) {
					actionsRemaining = maxBuses() - gameflow.turnOrder.length + 1
					if (players.length === 5) actionsRemaining++
				} else if (gameflow.phase === constants.PHASE_ADD_BLDGS) actionsRemaining = maxBuses() - gameflow.turnOrder.length + 1
				if (actionsRemaining <= 0) {
					if (gameflow.phase === constants.PHASE_LINE_EXPANSION) history.push([constants.HIST_ADD_LINE, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
					else if (gameflow.phase === constants.PHASE_ADD_BLDGS) history.push([constants.HIST_ADD_BLDG, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
					gameflow.turnOrder.shift()
					// Bot.updateTurnOrder()
				}
			} while (actionsRemaining <= 0)
		} else if (gameflow.phase === constants.PHASE_VROM) {
			// Everyone has at least one bus, so remainingVroms > 0
			while (gameflow.turnOrder.length > 0 && !canPlayerVrom(true)) {
				history.push([constants.HIST_VROM, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...context.historyObj]])
				resetVarsOnTurnEnd()
				gameflow.turnOrder.shift()
				// Bot.updateTurnOrder()
				if (gameflow.turnOrder.length === 0) {
					endCurrentPhase()
					return
				}
			}
		}
		// Now skip players if there are no pax left to add
		else if (gameflow.phase === constants.PHASE_ADD_PAX && remainingPassengers.value <= 0 && gameflow.turnOrder.length > 0) {
			do {
				history.push([constants.HIST_ADD_PAX, gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [-1]])
				gameflow.turnOrder.shift()
				// Bot.updateTurnOrder()
			} while (gameflow.turnOrder.length > 0)
			endCurrentPhase()
			return
		}
		Bot.actionAnyBotMooves()
	} // end current phase

	function getPlayerIndexOrderForTable() {
		if (gameflow.phase === constants.PHASE_GAME_OVER) {
			let scoreObj = getScoreObj()

			let resArr = [...players]
			for (let i = 0; i < resArr.length; i++) resArr[i].playerIndex = i
			let order = []
			for (let i = 0; i < scoreObj.length; i++) {
				for (let j = 0; j < scoreObj[i][1].length; j++) {
					let player = resArr.find((el) => el.colour === scoreObj[i][1][j])
					order.push(player.playerIndex)
				}
			}
			gameflow.turnOrder.splice(0)
			gameflow.turnOrder.push(order[0])
			return order

			/*let cmp = (a, b) => (a > b) - (a < b)
			resArr.sort(function (a, b) {
				return cmp(b.score, a.score) || cmp(a.timeStones, b.timeStones)
			})
			// Now find each index in model.players
			let order = []
			for (let i = 0; i < resArr.length; i++) {
				for (let j = 0; j < players.length; j++) {
					if (resArr[i] === players[j]) order.push(j)
				}
			}
			gameflow.turnOrder.splice(0)
			gameflow.turnOrder.push(order[0])
			return [...gameflow.fullTurnOrder]
			return order*/
		} else return [...gameflow.fullTurnOrder]
	}

	function exportModel(saveContext) {
		let temp = []

		// 0
		let tempPlayers = []
		for (let i = 0; i < players.length; i++) {
			tempPlayers.push([
				players[i].name, // 0
				players[i].displayName, // 1
				players[i].colour, // 2
				players[i].score, // 3
				players[i].remainingActions, // 4
				players[i].timeStones, // 5
				players[i].buses, // 6
				JSON.parse(JSON.stringify(players[i].endJunctions)), // 7
				JSON.parse(JSON.stringify(players[i].endLines)), // 8
				JSON.parse(JSON.stringify(players[i].playerJunctions)), // 9
				players[i].passActionsFlag ? 1 : 0, // 10
				players[i].maxScore, // 11
			])
		}
		temp.push(tempPlayers)
		//temp.push(JSON.parse(JSON.stringify(players)))

		// 1
		// MIGHT NEED TO DO THIS LIKE ABOVE
		/*let tempJunctions = []
    for (let i = 0; i < junctions.length; i++) {
      tempJunctions.push([junctions[i].id, [...junctions[i].buildings], junctions[i].passengers])
    }*/
		temp.push(JSON.parse(JSON.stringify(junctions)))

		// 2
		temp.push(remainingTimeStones.value)

		// 3
		temp.push(remainingPassengers.value)

		// 4
		temp.push(JSON.parse(JSON.stringify(lines)))
		//temp.push(lines.map(o => ({...o})));

		// 5
		temp.push(JSON.parse(JSON.stringify(actionAreaData)))

		// 6
		//temp.push(JSON.parse(JSON.stringify(gameflow)))
		//temp.push([gameflow.turn, gameflow.phase, [...gameflow.turnOrder], [...gameflow.fullTurnOrder]])
		temp.push([
			gameflow.turn, // 0
			gameflow.phase, // 1
			JSON.parse(JSON.stringify(gameflow.turnOrder)), // 2
			JSON.parse(JSON.stringify(gameflow.fullTurnOrder)), // 3
			JSON.parse(JSON.stringify(gameflow.fullActionTurnOrder)), // 7
			gameflow.gameEnded,
		])

		// 7
		temp.push(desiredBuilding.value)

		// 8
		temp.push(JSON.parse(JSON.stringify(history)))

		// 9
		if (saveContext) temp.push(JSON.parse(JSON.stringify(context)))

		var step1 = JSON.stringify(temp)
		var step2 = refFuncs.LZString.compressToEncodedURIComponent(step1)
		return step2
	}

	function importModel(input, restoreContext) {
		var step1 = refFuncs.LZString.decompressFromEncodedURIComponent(input)

		var inputModel = JSON.parse(step1)

		// 0 players
		let replacing = false
		if (players.length > 0) replacing = true
		for (let i = 0; i < inputModel[0].length; i++) {
			if (replacing) {
				players[i].name = inputModel[0][i][0]
				players[i].displayName = inputModel[0][i][1]
				players[i].colour = inputModel[0][i][2]
				players[i].score = inputModel[0][i][3]
				players[i].remainingActions = inputModel[0][i][4]
				players[i].timeStones = inputModel[0][i][5]
				players[i].buses = inputModel[0][i][6]
				players[i].endJunctions = inputModel[0][i][7]
				players[i].endLines = inputModel[0][i][8]
				players[i].playerJunctions = inputModel[0][i][9]
				players[i].passActionsFlag = inputModel[0][i][10] === 1 ? true : false
				players[i].maxScore = inputModel[0][i].length >= 12 ? inputModel[0][i][11] : inputModel[0][i][3]
			} else {
				//players.splice(0, players.length)
				players.push({
					name: inputModel[0][i][0],
					displayName: inputModel[0][i][1],
					colour: inputModel[0][i][2],
					score: inputModel[0][i][3],
					remainingActions: inputModel[0][i][4],
					timeStones: inputModel[0][i][5],
					buses: inputModel[0][i][6],
					endJunctions: inputModel[0][i][7],
					endLines: inputModel[0][i][8],
					playerJunctions: inputModel[0][i][9],
					passActionsFlag: inputModel[0][i][10] === 1 ? true : false,
					maxScore: inputModel[0][i].length >= 12 ? inputModel[0][i][11] : inputModel[0][i][3],
				})
			}
		}
		//Object.assign(players, inputModel[0])

		// 1 junctions
		/*for (let i = 0; i < inputModel[1].length; i++) {
      //console.log(junctions[i])
      junctions[i].id = inputModel[1][i][0]
      junctions[i].buildings = inputModel[1][i][1]
      junctions[i].passengers = inputModel[1][i][2]
    }*/
		Object.assign(junctions, inputModel[1])
		//junctions = [...inputModel[1]]

		// 2
		remainingTimeStones.value = inputModel[2]

		// 3
		remainingPassengers.value = inputModel[3]

		// 4
		//lines = inputModel[5]
		/*for (let i = 0; i < inputModel[5].length; i++) {
      lines[i] = inputModel[5][i]
    }*/
		Object.assign(lines, inputModel[4])

		// 5
		//actionAreaData.value = inputModel[6]
		Object.assign(actionAreaData, inputModel[5])

		// 6
		gameflow.turn = inputModel[6][0]
		gameflow.phase = inputModel[6][1]
		gameflow.turnOrder = inputModel[6][2]
		gameflow.fullTurnOrder = inputModel[6][3]
		gameflow.fullActionTurnOrder = inputModel[6][4]
		gameflow.gameEnded = inputModel[6][5]
		//Object.assign(gameflow, inputModel[6])

		// 7
		desiredBuilding.value = inputModel[7]

		// 8
		//remainingBuildings.value = inputModel[7]
		//history.value = []
		history.splice(0, history.length)
		Object.assign(history, inputModel[8])
		//history.value = inputModel[10]

		// 9
		//remainingBuildings.value = inputModel[7]
		if (restoreContext && inputModel.length >= 9) Object.assign(context, inputModel[9])

		// RESET TEMP VARS
		//context.buildingsLeftToPlace = 0

		//alert('import')
	}

	function decompressChatData(data) {
		if (data.length > 0) {
			var step1 = refFuncs.LZString.decompressFromEncodedURIComponent(data)
			var chatArray = JSON.parse(step1)
		} else chatArray = []

		chatArray.push(["WelcomeBot", 0, "Welcome to Bus Online!SNLBSNLBIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"])

		return chatArray
	}

	function kickoutTimerTicker() {
		if (personal.secondsToNextKickout == undefined || personal.secondsToNextKickout > 1200 || personal.trainingGame) {
			clearInterval(personal.kickoutCountdownIntervalTimer) // FIXXXXXXXXXXXXXXXX
		} else {
			personal.secondsToNextKickout--
			if (personal.secondsToNextKickout < 60) {
				// toggle the red class on and off
				if (document.getElementById("kickoutTimerSpan").classList.contains("redText")) document.getElementById("kickoutTimerSpan").classList.remove("redText")
				else document.getElementById("kickoutTimerSpan").classList.add("redText")
			} else document.getElementById("kickoutTimerSpan").classList.remove("redText")

			if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
		}
	}

	function kickoutFlexiTimerTicker() {
		if (personal.kickoutRequired !== 1 || personal.secondsToNextKickout > 1200 || personal.canPlay()) {
			clearInterval(personal.kickoutFlexiCountdownIntervalTimer) // FIXXXXXXXXXXXXXXXX
			return
		} else {
			personal.flexiSecondsToNextKickout--
			if (personal.flexiSecondsToNextKickout < 60) {
				// toggle the red class on and off
				if (document.getElementById("flexiKickoutTimerSpan").classList.contains("redText")) document.getElementById("flexiKickoutTimerSpan").classList.remove("redText")
				else document.getElementById("flexiKickoutTimerSpan").classList.add("redText")
			} else document.getElementById("flexiKickoutTimerSpan").classList.remove("redText")

			if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
		}
	}

	/***************************** */
	function addLine_core(playerIndex, lineID) {
		let player = players[playerIndex]
		// Add To Model
		lines[lineID].push(player.colour)

		// Add the junctions to the players junctions
		player.playerJunctions = player.playerJunctions.concat(getJunctionsAtEndOfLine(lineID))
		player.playerJunctions = [...new Set(player.playerJunctions)]

		// Alter the players endJunctions and endLines
		let endJuncs = getJunctionsAtEndOfLine(lineID)
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
		}
	}

	return {
		//players,
		// showForm,
		/*count,
    findById,
    findIndex,*/
		phaseStr,
		junctions,
		gameflow,
		//gameName,
		players,
		currentPlayer,
		//trainingGame,
		getScoreObj,
		getBuildingsToDisplay,
		refSize,
		getEmptyBuildingSpots,
		moveAllPassengersOntoJunctions,
		moveAllPassengersOntoCorrectBuilding,
		lines,
		getLinePlacementOptions,
		getJunctionsAtEndOfLine,
		getLinesAroundJunction,
		increaseScore,
		context,
		maxBuses,
		endPlayerTurn,
		actionAreaData,
		exportModel,
		importModel,
		canPlayerVrom,
		desiredBuilding,
		getVromBuildings,
		remainingPassengers,
		remainingTimeStones,
		//remainingBuildings,
		getLineEndCircleData,
		turnResetData,
		endCurrentPhase,
		topMenuViews,
		chatData,
		//create,
		endPlayerChooseActionTurn,
		currentPlayerCanPass,
		getWinnerName,
		startPlayerTurn,
		resetVarsOnTurnEnd,
		//gameCreationTimestamp,
		history,
		historyHelpers,
		clearHistoryHelpers,
		decreaseScore,
		decompressChatData,
		performingRewind,
		performingBoardChange,
		rewindErrorText,
		successText,
		endGame,
		kickoutTimerTicker,
		replayStep,
		replayData,
		currentPlayerIndex,
		addLine_core,
		canSkipPhase,
		getPlayerIndexFromColour,
		getPlayerByColour,
		endReplayResetData,
		getPlayerIndexOrderForTable,
		kickoutFlexiTimerTicker,

		getEmptyBuildingSpotsByNumberTotal,
		maxBusesWithNewBus,
		deleteVotesData,
		statsExcludeVotesData
	}
})
