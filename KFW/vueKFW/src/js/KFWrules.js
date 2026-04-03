import * as IO from "../backend/KFW_IO.js"
import * as rf from "./KFWreference.js"
import * as controller from "./KFWcontroller.js"
import * as funcs from "./KFWfuncs.js"
import * as village from "./KFWvillage.js"

import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"
import { addHistory } from "./KFWmodel.js"

export function canResign() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.canPlay()) return false
	if (personal.trainingGame) return false
	if (store.gameflow.phase !== rf.PHASE_BIDDING_AND_ACTIONS) return false
	if (store.gameflow.passedPlayerIndexes.length >= store.gameflow.fullTurnOrder.length - 1) return false
	return true
}

export function getInitialWinterTileOptions() {
	const store = useModelStore()
	let winterTileOptions = []
	for (let i = 0; i < rf.ALL_TILES.length; i++) {
		const tile = rf.ALL_TILES[i]
		// Always add in the base tiles
		if (tile.tileset === rf.TILESET_BASE && tile.season === rf.WINTER) {
			winterTileOptions.push(tile)
		}
		// If using Merchants expansion, then add in the Merchants tiles
		else if (store.useMerchantsExpansion && tile.tileset === rf.TILESET_MERCHANTS && tile.season === rf.WINTER) {
			winterTileOptions.push(tile)
		} else if (tile.tileset === rf.TILESET_PROMO && tile.season === rf.WINTER && store.promoTileIDsToInclude.includes(tile.tileID[0])) {
			// Add in the promo tiles
			winterTileOptions.push(tile)
		}
	}

	winterTileOptions = funcs.shuffle(winterTileOptions)
	return winterTileOptions
}

export async function setupBoatTiles() {
	const store = useModelStore()
	//Use the appropriate number of boat tiles accorindg to player number, spring side up.
	let baseBoatTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_BASE && tile.season === rf.SEASON_BOAT_TILE && tile.minPlayers <= store.players.length)))
	let merchantsBoatTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_MERCHANTS && tile.season === rf.SEASON_BOAT_TILE && tile.minPlayers <= store.players.length)))

	if (!store.useMerchantsExpansion) store.availableBoatTiles = baseBoatTiles
	// If using merchants expansion, then pick randomly from both arrays
	else if (store.useMerchantsExpansion) {
		for (let i = 0; i < baseBoatTiles.length; i++) {
			// Generate a random number that determines from which array to pick the object
			const randomIndex = Math.floor(Math.random() * 2) // Random index 0 or 1

			// Choose the array based on the randomIndex and push the object to mergedArray
			store.availableBoatTiles.push(randomIndex === 0 ? JSON.parse(JSON.stringify(baseBoatTiles[i])) : JSON.parse(JSON.stringify(merchantsBoatTiles[i])))
		}
	}

	//Fill the boats with meeples / skill tiles face up, randomly from the bags.
	await fillBoatTiles()
}

export async function fillBoatTiles() {
	const store = useModelStore()
	let meeplesRequired = 0
	let skillsRequired = 0
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		let currentSide = store.availableBoatTiles[i].seasonsIndex.findIndex((subarray) => subarray.includes(store.gameflow.season))
		store.availableBoatTiles[i].upgraded = currentSide

		// Ensure any "bot boats" have no resources in winter
		store.availableBoatTiles[i].itemsOnBoat.meeples.splice(0)
		store.availableBoatTiles[i].itemsOnBoat.skillTiles.splice(0)
		store.availableBoatTiles[i].itemsOnBoat.cabins = 0
		store.availableBoatTiles[i].itemsOnBoat.greenMeeples = 0
		store.availableBoatTiles[i].itemsOnBoat.resources.splice(0)
		store.availableBoatTiles[i].itemsOnBoat.contracts.splice(0)

		if (store.gameflow.season !== rf.WINTER) {
			meeplesRequired += store.availableBoatTiles[i].boatGoods.meeples[store.availableBoatTiles[i].upgraded]
			skillsRequired += store.availableBoatTiles[i].boatGoods.skillTiles[store.availableBoatTiles[i].upgraded]

			// Load meeples
			//store.availableBoatTiles[i].itemsOnBoat.meeples = [...model.pullMeeplesFromBag(meeplesToPull)]
			// Load skills
			//store.availableBoatTiles[i].itemsOnBoat.skillTiles = [...model.pullSkillTilesFromBag(skillTilesToPull)]
			// Load cabins
			store.availableBoatTiles[i].itemsOnBoat.cabins = store.availableBoatTiles[i].boatGoods.cabins[store.availableBoatTiles[i].upgraded]
			//store.availableCabins -= store.availableBoatTiles[i].itemsOnBoat.cabins
			// Load green meeples
			let totalGreenMeeples = store.availableBoatTiles[i].boatGoods.greenMeeples[store.availableBoatTiles[i].upgraded]
			for (let j = 0; j < totalGreenMeeples; j++) {
				if (store.availableGreenMeeples > 0) {
					store.availableBoatTiles[i].itemsOnBoat.greenMeeples++
					store.availableGreenMeeples--
				} else console.log(` (No more green meeples available)`)
			}
			// Load resources
			let newResources = store.availableBoatTiles[i].boatGoods.resArr[store.availableBoatTiles[i].upgraded]
			for (let j = 0; j < newResources.length; j++) {
				for (let k = 0; k < newResources[j]; k++) {
					if (store.availableResources[j] > 0) {
						store.availableBoatTiles[i].itemsOnBoat.resources.push(j)
						store.availableResources[j]--
					} else console.log(` (No more ${j} available)`)
				}
			}
			// Load contracts
			let newContracts = store.availableBoatTiles[i].boatGoods.contracts[store.availableBoatTiles[i].upgraded]
			for (let j = 0; j < newContracts; j++) {
				store.availableBoatTiles[i].itemsOnBoat.contracts.push(store.hiddenContracts.pop())
			}
		}
	}
	// Now boats are loaded, except M/S, so get them from the server
	if (store.gameflow.season !== rf.WINTER) {
		let [meeples, skills] = await IO.getBoatMeeplesAndSkills(meeplesRequired, skillsRequired)
		meeples = funcs.shuffle(meeples)
		skills = funcs.shuffle(skills)
		let totalHist = []
		let histObj = []
		for (let i = 0; i < store.availableBoatTiles.length; i++) {
			histObj.splice(0)
			histObj.push(store.availableBoatTiles[i].tileID[store.availableBoatTiles[i].upgraded])
			// Load meeples
			meeplesRequired = store.availableBoatTiles[i].boatGoods.meeples[store.availableBoatTiles[i].upgraded]
			store.availableBoatTiles[i].itemsOnBoat.meeples = meeples.splice(0, meeplesRequired)

			let meepleHistArray = [0, 0, 0, 0]
			store.availableBoatTiles[i].itemsOnBoat.meeples.forEach((index) => (index >= 0 && index <= 3 ? meepleHistArray[index]++ : console.warn(`Invalid index: ${index}`)))
			while (meepleHistArray[meepleHistArray.length - 1] === 0) {
				meepleHistArray.pop()
			}

			histObj.push([...meepleHistArray])
			// Load skills
			skillsRequired = store.availableBoatTiles[i].boatGoods.skillTiles[store.availableBoatTiles[i].upgraded]
			store.availableBoatTiles[i].itemsOnBoat.skillTiles = skills.splice(0, skillsRequired)
			histObj.push([...store.availableBoatTiles[i].itemsOnBoat.skillTiles])

			// Add the contract
			if (store.availableBoatTiles[i].itemsOnBoat.contracts.length > 0) {
				histObj.push([...store.availableBoatTiles[i].itemsOnBoat.contracts])
			}

			totalHist.push([...histObj])
		}
		addHistory(rf.HIST_FILL_BOAT_TILES, -1, 0, [...totalHist])
	}
}

// Setup at start, and then pre SUMMER / AUTUMN
export function setupSeasonTiles(season) {
	const store = useModelStore()
	let possibleSeasonTiles = []
	let baseSeasonTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_BASE && tile.season === season)))
	let merchantSeasonTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_MERCHANTS && tile.season === season)))
	let promoSeasonTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_PROMO && tile.season === season && store.promoTileIDsToInclude.includes(tile.tileID[0]))))

	possibleSeasonTiles = baseSeasonTiles
	if (store.useMerchantsExpansion) possibleSeasonTiles = possibleSeasonTiles.concat(merchantSeasonTiles)
	if (store.promoTileIDsToInclude.length > 0) possibleSeasonTiles = possibleSeasonTiles.concat(promoSeasonTiles)

	possibleSeasonTiles = funcs.shuffle(possibleSeasonTiles)

	//Use spring tiles according to player count. Start with min 6 tiles
	store.availableTiles.splice(0)
	store.availableTiles = possibleSeasonTiles.splice(0, 6)
	if (store.players.length >= 3) store.availableTiles.push(possibleSeasonTiles.pop())
	if (store.players.length >= 4) store.availableTiles.push(possibleSeasonTiles.pop())
	if (store.players.length >= 5) store.availableTiles.push(possibleSeasonTiles.pop())
	if (store.players.length >= 6) store.availableTiles.push(possibleSeasonTiles.pop())

	// In summer, check for boat tiles and set random side
	if (store.gameflow.season === rf.SUMMER) {
		for (let i = 0; i < store.availableTiles.length; i++) {
			if (rf.TILE_SUMMER_BOATS.includes(store.availableTiles[i].tileID[0])) {
				store.availableTiles[i].upgraded = Math.floor(Math.random() * 2)
			}
		}
	}
}

export function getNewBoatTileIDs() {
	const store = useModelStore()

	let baseBoatTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_BASE && tile.season === rf.SEASON_BOAT_TILE && tile.minPlayers <= store.players.length)))
	let merchantsBoatTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_MERCHANTS && tile.season === rf.SEASON_BOAT_TILE && tile.minPlayers <= store.players.length)))
	baseBoatTiles = baseBoatTiles.filter((tile) => !store.availableBoatTiles.some((boatTile) => boatTile.tileID[0] === tile.tileID[0]))
	merchantsBoatTiles = merchantsBoatTiles.filter((tile) => !store.availableBoatTiles.some((boatTile) => boatTile.tileID[0] === tile.tileID[0]))

	let newBoatTileIDs = []
	for (let i = 0; i < baseBoatTiles.length; i++) newBoatTileIDs.push(baseBoatTiles[i].tileID[1])
	if (store.useMerchantsExpansion) {
		for (let i = 0; i < merchantsBoatTiles.length; i++) newBoatTileIDs.push(merchantsBoatTiles[i].tileID[1])
	}

	return newBoatTileIDs
}

export function isPlayerHiddenMeepleSelectable(playerIndex, meepleAmount, idx) {
	const store = useModelStore()
	if (playerIndex !== controller.currentPlayerIndex()) return false
	if (!rf.ACT_MEEPLE_HIGHLIGHTING.includes(store.context.action)) return false
	if (meepleAmount === 0) return false
	if (store.context.action === rf.ACT_CHOOSE_ITEMS) {
		if (store.context.itemsRequired.meeplesReq.includes(rf.MEEPLE_ANY)) return true
		if (store.context.itemsRequired.meeplesReq.includes(idx)) return true
	} else if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		// Check you wouldn't be over bidding on to an action tile
		if (store.context.action === rf.ACT_CHOOSE_MEEPLES && store.context.selectedTileArea === rf.TILE_ACTION_AREA && store.context.selectedTile.meeplesOnTile.reduce((sum, subarray) => sum + subarray.length, 0) === 6) return false

		if (store.context.action === rf.ACT_CHOOSE_MEEPLES && meepleAmount > 0 && (store.context.coreMeepleColour === idx || store.context.coreMeepleColour === rf.MEEPLE_NONE)) return true
		// Boat 4b allows non matching meeples for actions
		if (!store.context.stopBoat4b && store.context.action === rf.ACT_CHOOSE_MEEPLES && store.context.selectedTileArea === rf.TILE_ACTION_AREA && village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT4_B)) return true
		if (store.context.action === rf.ACT_CHOOSE_ANY_MEEPLE_FOR_EXCHANGE && meepleAmount > 0) return true
		if (store.context.action === rf.ACT_CHOOSE_SET_MEEPLE_FOR_EXCHANGE && meepleAmount > 0) {
			if (idx === store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][0]) return true
		}
	} else if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		if (store.context.coreMeepleColour === rf.MEEPLE_ANY) return true
		if (store.context.coreMeepleColour === idx) return true
	}
	return false
}

/* returnFlag
	1 = just current player cautions if they rewind
*/
// CHANGE THIS TO FLAT ARRAY - [plIdx, flag, flag, id, flag]
export function getRewindHiddenDataResult(returnFlag) {
	const store = useModelStore()

	const ENTRIES_TO_IGNORE = [rf.HIST_NEW_GAME, rf.HIST_RESIGN, rf.HIST_KICKOUT, rf.HIST_REWIND]
	//const NO_HIDDEN_INFO = [rf.HIST_BID_ON_TILE, rf.HIST_PASS_TURN, rf.HIST_COLLECT_VILLAGE_MEEPLES, rf.HIST_COLLECT_OUTBID_MEEPLES, rf.HIST_COLLECT_SEASON_TILES, rf.HIST_VILLAGE_EXPANSION, rf.HIST_EXCHANGE_CONTRACT_AUTO, rf.HIST_REPLACE_SEA_BASTION_2, rf.HIST_COLLECT_BOAT_TILE, rf.HIST_FREE_UPGRADE, rf.HIST_FREE_EXTENSION, rf.HIST_KEYSIDE_BOAT_INCOME]
	const ALWAYS_HIDDEN_INFO = [rf.HIST_FILL_BOAT_TILES, rf.HIST_SEASON_TILES, rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES, rf.HIST_NEW_CONTRACTS, rf.HIST_CHOSEN_WINTER_TILES]
	const SOMETIMES_HIDDEN_INFO = [rf.HIST_ACT_ON_TILE, rf.HIST_COLLECT_BOAT_RESOURCES]

	const ENTRIES_WITHOUT_STOP_POINT = [rf.HIST_FILL_BOAT_TILES, rf.HIST_COLLECT_VILLAGE_MEEPLES, rf.HIST_COLLECT_OUTBID_MEEPLES, rf.HIST_COLLECT_SEASON_TILES, rf.HIST_SEASON_TILES, rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES, rf.HIST_EXCHANGE_CONTRACT_AUTO, rf.HIST_NEW_CONTRACTS, rf.HIST_REPLACE_SEA_BASTION_2, rf.HIST_FREE_UPGRADE, rf.HIST_FREE_EXTENSION, rf.HIST_KEYSIDE_BOAT_INCOME]

	let idx = store.history.length - 1
	let stopPointFound = false
	let rewindCautionArray = []
	let oldRewindCautionArrays = []
	while (!stopPointFound && idx > 0) {
		// The current idx will always be rewound. So need to check it
		if (ALWAYS_HIDDEN_INFO.includes(store.history[idx][0])) {
			/*  Flags
			========	
			[-1] - NEW HIST_BOAT_FILL
			[-2] - HIST_SEASON_TILES
			[-3] - HIST_COLLECT_BOAT1A_RANDOM_MEEPLES
			[-4, X] - X dealt contracts - HIST_NEW_CONTRACTS
			[-5] - HIST_CHOSEN_WINTER_TILES
			[-6] - HIST_COLLECT_BOAT_RESOURCES-- WITH A CONTRACT
			
		*/
			if (store.history[idx][0] === rf.HIST_FILL_BOAT_TILES) rewindCautionArray.push([-1])
			else if (store.history[idx][0] === rf.HIST_SEASON_TILES) rewindCautionArray.push([-2])
			else if (store.history[idx][0] === rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES) rewindCautionArray.push([-3])
			else if (store.history[idx][0] === rf.HIST_NEW_CONTRACTS) rewindCautionArray.push([-4, store.history[idx][3].length])
			else if (store.history[idx][0] === rf.HIST_CHOSEN_WINTER_TILES) rewindCautionArray.push([-5])
		} else if (SOMETIMES_HIDDEN_INFO.includes(store.history[idx][0])) {
			if (store.history[idx][0] === rf.HIST_COLLECT_BOAT_RESOURCES) {
				let tileID = store.history[idx][3][0]
				let tile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
				// If it's a contrat boat, add a flag
				if (tile.boatGoods.contracts[0] !== 0) {
					rewindCautionArray.push([-6])
				}
			} else if (store.history[idx][0] === rf.HIST_ACT_ON_TILE) {
				let tileID = store.history[idx][3][0]
				let tile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
				let upgraded = tile.tileID.indexOf(tileID)
				if (tile.revealedRewindInfo[upgraded].length > 0) {
					rewindCautionArray.push([store.history[idx][3][0]])
				}
			}
		}

		// If you are currently at a rewind point, save any previous data
		if (store.history[idx][0] === rf.HIST_REWIND) {
			if (store.history[idx][3].length > 0) oldRewindCautionArrays.push([...store.history[idx][3]])
		}

		// Now check whether to stop or check another entry
		if (ENTRIES_TO_IGNORE.includes(store.history[idx][0])) idx--
		else if (ENTRIES_WITHOUT_STOP_POINT.includes(store.history[idx][0])) idx--
		else stopPointFound = true
	}

	//[ tileIDs, season tiles, winter tiles, boat1A meeples, boat fill, new contracts]

	//Find where the game will rewind to - save any rewind entry 3’s along the way
	//check if any steps between OR that entry have hidden information
	//Record the tileID and hidden info

	if (returnFlag === 1) return rewindCautionArray
}
