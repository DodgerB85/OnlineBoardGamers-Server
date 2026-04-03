import * as IO from "../backend/AQY_IO.js"
import * as rf from "./AQYreference"
import * as controller from "./AQYcontroller"
import * as model from "./AQYmodel"
import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal"

export function removeBotPlayers() {
	const store = useModelStore()

	store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => store.players[idx].displayName != rf.BOT_NAME)
}

export function performBotHarvest(playerIndex) {
	const store = useModelStore()
	store.context.historyObj.splice(0)

	let player = store.players[playerIndex]
	let buildingToSplice = []
	let buildingToSpliceHexIDs = []

	// Use a counter to NOT return one man per each fishery hex!
	let fisheryManReturnCounter = 0
	for (let i = 0; i < player.countrysideBuildings.length; i++) {
		let currentBuilding = player.countrysideBuildings[i]

		if (currentBuilding.type === rf.COUNTRYSIDE_BLDG_WOODCUTTER || currentBuilding.type === rf.COUNTRYSIDE_BLDG_FARM || currentBuilding.type === rf.COUNTRYSIDE_BLDG_MINE || (currentBuilding.type === rf.COUNTRYSIDE_BLDG_FISHERY && currentBuilding.resources.length > 0)) {
			let res = currentBuilding.resources

			// AUTO WITHOUT FORCED LABOUR - SINGLE RES
			let isFisheryWithoutRes = currentBuilding.type === rf.COUNTRYSIDE_BLDG_FISHERY && currentBuilding.refHexId == undefined

			if (res.length == 1) {
				store.context.historyObj.push([res[0].resType, res[0].hexId, 1])
				currentBuilding.resources = []
				// Change the BUILDING hex to grass - this is the last one with the man on it
				// NO, the grass is always added in the model at start. This setting only changes the display
				//if (currentBuilding.type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(currentBuilding.hexId, currentBuilding.hex)
			} else if (res.length >= 2) {
				for (let j = res.length - 1; j >= 0; j--) {
					if (res[j].hexId != currentBuilding.hexId) {
						// Change the RES hex to grass - this is the SECOND last one
						//if (currentBuilding.type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(res[j].hexId, res[j].hex)
						// Add this history - res // hex ID
						store.context.historyObj.push([res[j].resType, res[j].hexId, 1])
						currentBuilding.resources.splice(j, 1)
						break
					}
				}
			} else {
				if (!isFisheryWithoutRes) alert(`BOT Auto-Harvest Error: Without Manned Labour -- res.length: ${res.length}`)
			}

			// GAIN THE RESOURCE - res[0] has been spliced? But works because of a copy?
			if (!isFisheryWithoutRes) player.availableResources[res[0].resType]++

			// Return Worker when no more goods avaliable
			if (currentBuilding.resources.length == 0) {
				// Fisherman needs to remove 2 buildings
				// So only return ONCE
				if (currentBuilding.type === rf.COUNTRYSIDE_BLDG_FISHERY) {
					let refHexId = currentBuilding.refHexId
					buildingToSplice.push(i)
					buildingToSpliceHexIDs.push(currentBuilding.hexId)
					//building.splice(i, 1)
					// Locate the other half and remove the building
					for (let k = 0; k < player.countrysideBuildings.length; k++) {
						if (player.countrysideBuildings[k].hexId === refHexId) {
							//building.splice(k, 1)
							buildingToSplice.push(k)
							buildingToSpliceHexIDs.push(player.countrysideBuildings[k].hexId)
						}
					}
					// Fisheries have TWO hexes, so only return on the first hex (even number)
					if (fisheryManReturnCounter % 2 === 0) {
						fisheryManReturnCounter++
						player.availableMen++
					} else fisheryManReturnCounter++
				} else {
					buildingToSplice.push(i)
					buildingToSpliceHexIDs.push(currentBuilding.hexId)
					player.availableMen++
				}
			}
		}
	}
	for (let i = 0; i < buildingToSpliceHexIDs.length; i++) {
		player.countrysideBuildings = player.countrysideBuildings.filter((building) => building.hexId !== buildingToSpliceHexIDs[i])
	}

	model.addHistory(rf.HIST_AUTO_HARVEST, playerIndex, 0, [...store.context.historyObj])
	store.context.historyObj.splice(0)
}

/*export function actionAnyBotMooves() {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return

	while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		store.gameflow.turnOrder.shift()
	}

	if (store.gameflow.turnOrder.length === 0) {
		model.endTurn()
	}

	while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		store.gameflow.turnOrder.shift()
	}
	// controller.startPlayerTurn()
}*/

export async function actionPlayerKickout() {
	const personal = usePersonalStore()
	if (personal.kickoutRequired === 2) {
		personal.kickoutRequired = 0

		// Action the kick in game
		model.addHistory(rf.HIST_KICKOUT, personal.pov, 0, [controller.currentPlayerObj().displayName])

		await IO.kickout()

		controller.currentPlayerObj().displayName = rf.BOT_NAME

		controller.endPlayerTurn()
	}
}

export async function actionGraveGameOver() {
	// Action the kick in game
	model.addHistory(rf.HIST_GRAVE_GAME_OVER, controller.currentPlayerIndex(), 0, [controller.currentPlayerObj().displayName])

	await IO.resign(true)

	controller.currentPlayerObj().displayName = rf.BOT_NAME

	controller.endPlayerTurn()
}

export async function actionResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	model.addHistory(rf.HIST_RESIGN, controller.currentPlayerIndex(), 0, [controller.currentPlayerObj().displayName])

	// This just sets the server settings
	await IO.resign()

	store.clearVars()

	store.players[personal.pov].displayName = rf.BOT_NAME

	// This then ends and saves the game
	//controller.endPlayerTurn()

	// Reform the turnOrder
	for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
		if (store.players[store.gameflow.fullTurnOrder[i]].displayName != rf.BOT_NAME) store.gameflow.turnOrder.push(store.gameflow.fullTurnOrder[i])
	}

	// Check that there is more than 1 player left, otherwise end game
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) {
		// Only 1 player left, so end game
		store.gameflow.phase = rf.PHASE_GAME_OVER
		model.endGame() // THIS ALSO SAVES THE GAME
		return
	}

	// Save the game
	IO.saveGame(false)
}
