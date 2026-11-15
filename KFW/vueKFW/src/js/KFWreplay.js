/**
 * Keyflower replay.
 *
 * The saved history is compact: [event, playerIndex, time, params].
 * Replay rebuilds the model from the opening state by applying each history
 * entry with the same model rules used in live play, then stores one RAW
 * exportKFWmodel() frame per history entry. No snapshots go into `history`
 * itself, so gameData stays small.
 *
 * Frames are raw arrays (not compressed) so the slider can load one per step.
 * importKFWmodel(frame, false, true, true) skips gameData1/3, because those
 * hold the *current* server secret data, not the secrets at that point in time.
 */
import * as rf from "./KFWreference"
import * as funcs from "./KFWfuncs"
import * as model from "./KFWmodel"
import * as history from "./KFWhistory"

import { useModelStore } from "../stores/KFWstore.js"

// State that only exists while a replay is being generated.
let replayBase = null
let replayErrors = []

const HOME_ZEROES = () => ({	finalScore: 0,
	requireItmesScore: 0,
	autoScoreScore: 0,
	manualScoreScore: 0,
	contractScore: 0,
	goldScore: 0,
	animalScore: 0,
	bakeryScore: 0,
	granaryScore: 0,
	purpleAnimalScore: 0,
})

export function goToReplayStep(step) {
	const store = useModelStore()
	if (store.replayData.length === 0) return

	let target = Number(step)
	if (!Number.isFinite(target)) target = 0
	target = Math.max(0, Math.min(Math.floor(target), store.replayData.length - 1))
	store.replayStep = target

	funcs.importKFWmodel(store.replayData[target], false, true, true)
	store.clearContext()
	store.context.endTurnActions.splice(0)
	store.context.localEndTurnActions.splice(0)
	store.undoPoints.splice(0)
	store.clearMessages()
	store.meeplePopupSetter.showPopup = false
	store.popupSetter.showPopup = false

	// The frame restores the history prefix for this step, so the entry is here.
	const histEntry = store.history[target]
	if (histEntry) history.setupHistoryHighlight(histEntry[0], histEntry[3], target)
}

export function performStep(amount) {
	const store = useModelStore()
	if (store.replayData.length === 0) return

	store.clearHistoryHelpers()
	store.clearMessages()

	let step = store.replayStep
	if (amount === -99) step = 0
	else if (amount === -9) step -= 5
	else if (amount === -1) step--
	else if (amount === 1) step++
	else if (amount === 9) step += 5
	else if (amount === 99) step = store.replayData.length - 1

	goToReplayStep(step)
}

/**************************** BASE STATE ****************************/

function cloneTileByID(tileID) {
	const def = rf.ALL_TILES.find((tile) => tile.id === tileID)
	if (!def) return null
	return JSON.parse(JSON.stringify(def))
}

function cloneTileByTileID(tileID) {
	const def = rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID))
	if (!def) return null
	return JSON.parse(JSON.stringify(def))
}

function getBoardTileByTileID(tileID) {
	const store = useModelStore()
	const search = (arr) => arr.find((tile) => tile.tileID.includes(tileID))
	return (
		search(store.availableTiles) ||
		search(store.availableTurnOrderTiles) ||
		search(store.availableBoatTiles) ||
		store.players.map((player) => search(player.villageTiles)).find(Boolean) ||
		store.players.map((player) => search(player.pendingVillageTiles)).find(Boolean) ||
		null
	)
}

function captureReplayBase() {
	const store = useModelStore()

	const players = store.players.map((player) => {
		const homeTile = player.villageTiles[0]
		const homeDef = homeTile ? rf.ALL_TILES.find((tile) => tile.id === homeTile.id) : null
		return {
			name: player.name,
			displayName: player.displayName,
			colour: player.colour,
			homeTileID: homeTile ? homeTile.id : -1,
			homeTileID0: homeDef ? homeDef.tileID[0] : 0,
			hiddenWinterTile_tileIDs: [...(player.hiddenWinterTile_tileIDs || [])],
			villageLayout: player.villageTiles.map((tile) => ({ id: tile.id, coord: [...tile.coord], rotation: tile.rotation })),
			pendingLayout: player.pendingVillageTiles.map((tile) => ({ id: tile.id, coord: [...tile.coord], rotation: tile.rotation })),
		}
	})

	return {
		players,
		liveSeason: store.gameflow.season,
		livePhase: store.gameflow.phase,
		liveAvailableTiles: store.availableTiles.map((tile) => JSON.parse(JSON.stringify(tile))),
		finalVillageTiles: store.players.flatMap((player) => player.villageTiles.map((tile) => ({ id: tile.id, season: tile.season }))),
	}
}

function resetPlayer(playerStatic, hasPurpleMeeple) {
	const homeTile = cloneTileByID(playerStatic.homeTileID)
	if (homeTile) {
		homeTile.upgraded = 0
		homeTile.resources = [0, 0, 0, 0]
		homeTile.meeplesOnTile = []
		homeTile.animals = []
		homeTile.cabins = 0
		homeTile.extension = rf.EXTENSION_NONE
		homeTile.coreMeepleColour = rf.MEEPLE_NONE
	}
	return {
		name: playerStatic.name,
		displayName: playerStatic.displayName,
		colour: playerStatic.colour,

		hiddenWinterTile_tileIDs: [...playerStatic.hiddenWinterTile_tileIDs],
		hiddenContracts: [],
		villageTiles: homeTile ? [homeTile] : [],
		villageCanvasSize: [162.5, 162.5],
		villageRefSize: 2400,
		pendingVillageTiles: [],
		hasPurpleMeeple: hasPurpleMeeple,
		villageNeighbours: [],
		placeableVillageCoords: [],
		...HOME_ZEROES(),
		wheat: 0,
		passFlag: 1,

		knownHiddenMeeples: [0, 0, 0, 0, 8],
		knownHiddenSkillTiles: [0, 0, 0, 0],

		// Server secret data is not in gameData. Replay does not guess it.
		hiddenMeeples: [0, 0, 0, 0],
		hiddenSkillTiles: [0, 0, 0],
		hiddenHistory: [],
	}
}

function resetDataForReplay() {
	const store = useModelStore()

	replayBase = captureReplayBase()

	// Turn order starts from the home tiles, exactly as initGame sets it up.
	const homeOrder = replayBase.players
		.map((player, index) => ({ index, tileID0: player.homeTileID0 }))
		.sort((a, b) => a.tileID0 - b.tileID0)
		.map((entry) => entry.index)

	store.players.splice(0)
	for (let i = 0; i < replayBase.players.length; i++) store.players.push(resetPlayer(replayBase.players[i], homeOrder[0] === i))
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].villageCanvasSize = [162.5, 162.5]
		store.players[i].villageRefSize = 2400
	}

	store.gameflow.turn = 0
	store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
	store.gameflow.season = rf.SPRING
	store.gameflow.passedPlayerIndexes.splice(0)
	store.gameflow.fullTurnOrder.splice(0, store.gameflow.fullTurnOrder.length, ...homeOrder)
	store.gameflow.turnOrder.splice(0, store.gameflow.turnOrder.length, ...homeOrder)

	store.history.splice(0)
	store.replayData.splice(0)
	store.replayStep = 0

	store.availableResources.splice(0, store.availableResources.length, 24, 24, 24, 48)
	store.availableGreenMeeples = 20
	store.availableMeeples.splice(0, store.availableMeeples.length, 0, 0, 0, 0)
	store.availableSkills.splice(0, store.availableSkills.length, 0, 0, 0)

	store.hiddenContracts.splice(0)
	store.visibleContracts.splice(0)
	if (store.useMerchantsExpansion) store.hiddenContracts.push(...rf.ALL_CONTRACTS.map((contract) => contract.id))

	store.availableExtensions.splice(0, store.availableExtensions.length, ...rf.ALL_EXTENSIONS.map((extension) => extension.id))

	store.availableTiles.splice(0)
	store.availableBoatTiles.splice(0)
	store.availableTurnOrderTiles.splice(0)
	if (store.useFarmersExpansion) {
		const farmerTurnOrderTiles = rf.ALL_TILES.filter(
			(tile) => tile.tileset === rf.TILESET_FARMERS && tile.season === rf.SEASON_TURN_ORDER_TILE && tile.minPlayers <= store.players.length && tile.maxPlayers >= store.players.length
		)
		let baseTurnOrderTiles = []
		if (store.players.length === 2) baseTurnOrderTiles = rf.ALL_TILES.filter((tile) => tile.tileID[0] === rf.TILE_TURNORDER_2P)
		else if (store.players.length === 3) baseTurnOrderTiles = rf.ALL_TILES.filter((tile) => tile.tileID[0] === rf.TILE_TURNORDER_3P)
		else if (store.players.length >= 5) baseTurnOrderTiles = rf.ALL_TILES.filter((tile) => tile.tileID[0] === rf.TILE_TURNORDER_5_6P || tile.tileID[0] === rf.TILE_TURNORDER_5_6P2)
		store.availableTurnOrderTiles.push(...farmerTurnOrderTiles.concat(baseTurnOrderTiles).map((tile) => JSON.parse(JSON.stringify(tile))))
	} else {
		store.availableTurnOrderTiles.push(
			...rf.ALL_TILES.filter(
				(tile) =>
					tile.tileset === rf.TILESET_BASE &&
					tile.season === rf.SEASON_TURN_ORDER_TILE &&
					tile.minPlayers <= store.players.length &&
					tile.maxPlayers >= store.players.length
			).map((tile) => JSON.parse(JSON.stringify(tile)))
		)
	}

	store.availableWheat = rf.AVAILABLE_WHEAT_START
	store.availableAnimals.splice(0, store.availableAnimals.length, ...rf.AVAILABLE_ANIMALS_START)

	store.ongoingVars.selectedWinterTileIDs.splice(0)
	store.undoPoints.splice(0)
	store.turnStartHighlights.bidAreas.splice(0)
	store.turnStartHighlights.actionAreas.splice(0)
	store.popupSetter.showPopup = false
	store.meeplePopupSetter.showPopup = false
	store.clearContext()
	store.clearMessages()
	store.clearHistoryHelpers()
	store.context.endTurnActions.splice(0)
	store.context.localEndTurnActions.splice(0)
	store.context.historyObj.splice(0)
}

/**************************** SEASON / BOAT HELPERS ****************************/

function setPlayerTurn(playerIndex) {
	const store = useModelStore()
	if (!Number.isInteger(playerIndex) || playerIndex < 0) return
	const turnOrder = store.gameflow.turnOrder
	const idx = turnOrder.indexOf(playerIndex)
	if (idx > 0) turnOrder.push(...turnOrder.splice(0, idx))
	else if (idx === -1) turnOrder.unshift(playerIndex)
}

function advanceTurn(playerIndex, phase) {
	const store = useModelStore()
	if (!Number.isInteger(playerIndex) || playerIndex < 0) return
	const turnOrder = store.gameflow.turnOrder

	if (phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		const idx = turnOrder.indexOf(playerIndex)
		if (idx > 0) turnOrder.push(...turnOrder.splice(0, idx))
		if (turnOrder[0] === playerIndex) turnOrder.push(turnOrder.shift())
	} else if (phase === rf.PHASE_COLLECT_BOAT_RESOURCES) {
		const idx = turnOrder.indexOf(playerIndex)
		if (idx !== -1) turnOrder.splice(idx, 1)
		if (turnOrder.length === 0) {
			model.breedAnimals()
			turnOrder.push(...store.gameflow.fullTurnOrder)
			store.gameflow.phase = rf.PHASE_VILLAGE_EXPANDING
		}
	} else if (phase === rf.PHASE_VILLAGE_EXPANDING || phase === rf.PHASE_CHOOSE_WINTER_TILES || phase === rf.PHASE_FINAL_SCORING) {
		const idx = turnOrder.indexOf(playerIndex)
		if (idx !== -1) turnOrder.splice(idx, 1)
		if (turnOrder.length === 0) {
			if (phase === rf.PHASE_VILLAGE_EXPANDING && store.gameflow.season === rf.WINTER) {
				store.gameflow.fullTurnOrder.sort((a, b) => a - b)
				turnOrder.push(...store.gameflow.fullTurnOrder)
				store.gameflow.phase = rf.PHASE_FINAL_SCORING
			} else turnOrder.push(...store.gameflow.fullTurnOrder)
		}
	}
}

function resetFullTurnOrderFromPurple() {
	const store = useModelStore()
	let startPlayerIndex = store.players.findIndex((player) => player.hasPurpleMeeple === true)
	if (startPlayerIndex === -1) startPlayerIndex = 0
	let fullTurnOrder = store.players.map((_player, index) => index)
	while (fullTurnOrder[0] !== startPlayerIndex) fullTurnOrder.push(fullTurnOrder.shift())
	store.gameflow.fullTurnOrder.splice(0, store.gameflow.fullTurnOrder.length, ...fullTurnOrder)
	store.gameflow.turnOrder.splice(0, store.gameflow.turnOrder.length, ...fullTurnOrder)
}

function sideOfTile(tileID) {
	const def = rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID))
	if (!def) return null
	return { def, upgraded: def.tileID.indexOf(tileID) }
}

function buildSeasonTileIDs(season) {
	const store = useModelStore()
	const ids = new Set()
	const sideByID = new Map()

	// shortcut: history does not store the random season setup. Tiles that were
	// never bid on are only known for the live season (kept from liveAvailableTiles).
	const addTileID = (tileID) => {
		const side = sideOfTile(tileID)
		if (!side) return
		sideByID.set(side.def.id, side.upgraded)
		if (side.def.season === season) ids.add(side.def.id)
	}

	for (let i = 0; i < store.history.length; i++) {
		const entry = store.history[i]
		if (entry[0] === rf.HIST_BID_ON_TILE || entry[0] === rf.HIST_ACT_ON_TILE) addTileID(entry[3][0])
		else if (entry[0] === rf.HIST_COLLECT_SEASON_TILES) {
			for (const playerEntries of entry[3]) {
				for (const tileEntry of playerEntries) addTileID(tileEntry[0])
			}
		}
	}

	// Tiles won in earlier seasons are in the final villages.
	if (replayBase) {
		for (const tile of replayBase.finalVillageTiles) {
			if (tile.season === season) ids.add(tile.id)
		}
	}

	let orderedIDs = []
	if (replayBase && replayBase.liveSeason === season && replayBase.livePhase === rf.PHASE_BIDDING_AND_ACTIONS) {
		for (const tile of replayBase.liveAvailableTiles) orderedIDs.push(tile.id)
	}
	for (const id of [...ids].sort((a, b) => a - b)) if (!orderedIDs.includes(id)) orderedIDs.push(id)

	return { orderedIDs, sideByID }
}

function setSeasonTiles(season) {
	const store = useModelStore()
	const { orderedIDs, sideByID } = buildSeasonTileIDs(season)
	const tiles = []
	for (const id of orderedIDs) {
		const liveTile = replayBase && replayBase.liveSeason === season ? replayBase.liveAvailableTiles.find((tile) => tile.id === id) : null
		const tile = liveTile ? JSON.parse(JSON.stringify(liveTile)) : cloneTileByID(id)
		if (!tile) continue
		tile.upgraded = liveTile ? liveTile.upgraded : sideByID.get(id) || 0
		tile.coreMeepleColour = rf.MEEPLE_NONE
		tile.meeplesOnTile = []
		for (const bid of tile.bids || []) bid[0] = []
		tiles.push(tile)
	}
	store.availableTiles.splice(0, store.availableTiles.length, ...tiles)
}

function clearBoatItems(tile) {
	tile.itemsOnBoat.meeples.splice(0)
	tile.itemsOnBoat.skillTiles.splice(0)
	tile.itemsOnBoat.cabins = 0
	tile.itemsOnBoat.greenMeeples = 0
	tile.itemsOnBoat.resources.splice(0)
	tile.itemsOnBoat.contracts.splice(0)
}

function takeContractFromHidden(contractID) {
	const store = useModelStore()
	if (!Number.isInteger(contractID) || contractID < 0) return
	const idx = store.hiddenContracts.indexOf(contractID)
	if (idx !== -1) store.hiddenContracts.splice(idx, 1)
}

function replayFillBoatTiles(entry3, season) {
	const store = useModelStore()
	const boats = []

	for (const boatEntry of entry3) {
		const tileID = boatEntry[0]
		const def = rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID))
		if (!def) continue
		const tile = JSON.parse(JSON.stringify(def))
		tile.upgraded = tile.tileID.indexOf(tileID)
		clearBoatItems(tile)

		if (season !== rf.WINTER) {
			const up = tile.upgraded
			const meepleCounts = boatEntry[1] || []
			const meeples = []
			for (let colour = 0; colour < meepleCounts.length; colour++) {
				for (let n = 0; n < meepleCounts[colour]; n++) meeples.push(colour)
			}
			tile.itemsOnBoat.meeples = meeples
			tile.itemsOnBoat.skillTiles = [...(boatEntry[2] || [])]
			tile.itemsOnBoat.cabins = tile.boatGoods.cabins[up] || 0

			let greenMeeples = tile.boatGoods.greenMeeples[up] || 0
			while (greenMeeples > 0 && store.availableGreenMeeples > 0) {
				tile.itemsOnBoat.greenMeeples++
				store.availableGreenMeeples--
				greenMeeples--
			}

			const resArr = tile.boatGoods.resArr[up] || []
			for (let res = 0; res < resArr.length; res++) {
				for (let n = 0; n < resArr[res]; n++) {
					if (store.availableResources[res] <= 0) break
					tile.itemsOnBoat.resources.push(res)
					store.availableResources[res]--
				}
			}

			const contracts = boatEntry[3] || []
			for (const contractID of contracts) {
				takeContractFromHidden(contractID)
				tile.itemsOnBoat.contracts.push(contractID)
			}
		}
		boats.push(tile)
	}

	store.availableBoatTiles.splice(0, store.availableBoatTiles.length, ...boats)
}

function setWinterBoatTiles() {
	const store = useModelStore()
	const winterBoats = []
	for (const boat of store.availableBoatTiles) {
		const def = rf.ALL_TILES.find((tile) => tile.id === boat.id)
		if (!def) continue
		const tile = JSON.parse(JSON.stringify(def))
		const winterSide = tile.seasonsIndex.findIndex((seasons) => seasons.includes(rf.WINTER))
		tile.upgraded = winterSide === -1 ? 0 : winterSide
		clearBoatItems(tile)
		winterBoats.push(tile)
	}
	store.availableBoatTiles.splice(0, store.availableBoatTiles.length, ...winterBoats)
}

/**************************** VILLAGE HELPERS ****************************/

function layoutForTile(playerStatic, tileID) {
	const side = sideOfTile(tileID)
	if (!side) return null
	return playerStatic.villageLayout.find((layout) => layout.id === side.def.id) || null
}

function addTileToVillageFromHistory(playerIndex, tileID) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	// History records the tile but not its coordinate/rotation. The final model
	// still has each physical tile's placement, so reuse that here.
	const layout = layoutForTile(replayBase.players[playerIndex], tileID)
	const tile = cloneTileByTileID(tileID)
	if (!tile) return

	let coord = layout ? [...layout.coord] : null
	let rotation = layout ? layout.rotation : 0
	if (!coord) {
		// History records no coordinates; this only happens when the final model
		// does not contain the tile yet. Put it somewhere visible but recorded.
		replayErrors.push(`village tile ${tileID} for player ${playerIndex} has no saved coordinate`)
		const n = player.villageTiles.length
		coord = [n, -n, 0]
	}
	if (coord.length === 2) coord.push(-coord[0] - coord[1])

	tile.upgraded = tile.tileID.indexOf(tileID)
	tile.coord = coord
	model.rotateTileMultipleTimes(tile, 1, rotation)
	tile.resources = [0, 0, 0, 0]
	tile.meeplesOnTile = []
	tile.animals = []
	tile.cabins = 0
	tile.extension = rf.EXTENSION_NONE
	tile.coreMeepleColour = rf.MEEPLE_NONE

	player.villageTiles.push(tile)

	const pendingIdx = player.pendingVillageTiles.findIndex((pending) => pending.tileID.includes(tileID))
	if (pendingIdx !== -1) player.pendingVillageTiles.splice(pendingIdx, 1)
}

function doesPlayerHaveTileID(playerIndex, tileID) {
	const store = useModelStore()
	if (tileID < 0) return false
	return store.players[playerIndex].villageTiles.some((tile) => tile.tileID.includes(tileID))
}

function addResToPlayerTile(playerIndex, destinationTileID, res) {
	const store = useModelStore()
	const villageTile = store.players[playerIndex].villageTiles.find((tile) => tile.tileID.includes(destinationTileID))
	if (villageTile) villageTile.resources[res]++
	else if (store.players[playerIndex].villageTiles[0]) store.players[playerIndex].villageTiles[0].resources[res]++
}

function gainResources(playerIndex, destinationTileID, resList) {
	const store = useModelStore()
	for (const res of resList) {
		if (res < 0) continue
		if (store.availableResources[res] <= 0) continue
		store.availableResources[res]--
		addResToPlayerTile(playerIndex, destinationTileID, res)
	}
}

function findActionDestination(extras) {
	for (const extra of extras) {
		if (Array.isArray(extra) && extra.length > 0 && typeof extra[0] === "number" && extra[0] >= 0) return extra[0]
	}
	return -1
}

/**************************** CONTRACT HELPERS ****************************/

function awardContract(playerIndex, contractID) {
	const store = useModelStore()
	if (!Number.isInteger(contractID) || contractID < 0) return
	const def = rf.ALL_CONTRACTS.find((contract) => contract.id === contractID)
	if (!def) return
	const player = store.players[playerIndex]
	if (player.hiddenContracts.some((contract) => contract.id === contractID)) return
	const contract = JSON.parse(JSON.stringify(def))
	contract.visible = 1
	player.hiddenContracts.push(contract)
	const hiddenIdx = store.hiddenContracts.indexOf(contractID)
	if (hiddenIdx !== -1) store.hiddenContracts.splice(hiddenIdx, 1)
	const visibleIdx = store.visibleContracts.indexOf(contractID)
	if (visibleIdx !== -1) store.visibleContracts.splice(visibleIdx, 1)
}

/**************************** ACTION HELPERS ****************************/

function addMeeplesToActionTile(playerIndex, tile, supplyEntries, outbidEntries) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	let group = null

	const addColour = (colour) => {
		if (!group) {
			group = []
			tile.meeplesOnTile.push(group)
		}
		group.push(colour)
	}

	for (const entry of supplyEntries) {
		for (let i = 1; i < entry.length; i++) {
			const colour = entry[i]
			if (!Number.isInteger(colour) || colour < 0) continue
			addColour(colour)
			player.hiddenMeeples[colour]--
			model.deductHiddenMeeple(playerIndex, colour)
		}
	}

	for (const entry of outbidEntries) {
		const fromTileID = entry[1]
		const fromTile = getBoardTileByObjectID(fromTileID)
		const colours = entry.slice(2)
		if (fromTile) fromTile.bids[playerIndex][0].splice(0)
		for (const colour of colours) {
			if (!Number.isInteger(colour) || colour < 0) continue
			addColour(colour)
		}
	}

	if (group && tile.coreMeepleColour === rf.MEEPLE_NONE) tile.coreMeepleColour = group[0]
}

function getBoardTileByObjectID(tile_id) {
	const store = useModelStore()
	const search = (arr) => arr.find((tile) => tile.id === tile_id)
	return (
		search(store.availableTiles) ||
		search(store.availableTurnOrderTiles) ||
		search(store.availableBoatTiles) ||
		store.players.map((player) => search(player.villageTiles)).find(Boolean) ||
		store.players.map((player) => search(player.pendingVillageTiles)).find(Boolean) ||
		null
	)
}

function takeResFromTile(tile, res) {
	if (!tile) return false
	if (tile.resources[res] > 0) {
		tile.resources[res]--
		return true
	}
	return false
}

function applyUpgradeEntry(playerIndex, entry) {
	const store = useModelStore()
	const upgradedTileID = entry[1]
	const paid = entry[2] || []
	const paidSkills = Array.isArray(entry[3]) ? entry[3] : []
	const upgradedTile = store.players[playerIndex].villageTiles.find((tile) => tile.tileID.includes(upgradedTileID))
	if (!upgradedTile) return
	upgradedTile.upgraded = 1

	const cost = upgradedTile.upgradeCost
	const resCost = !Array.isArray(cost) && cost.resCost ? cost.resCost : []
	const skillCost = !Array.isArray(cost) && cost.skillCost ? cost.skillCost : []
	const meepleCost = !Array.isArray(cost) && cost.meepleCost ? cost.meepleCost : []
	const player = store.players[playerIndex]

	if (resCost.length > 0) {
		for (const res of paid) {
			if (!Number.isInteger(res) || res < 0) continue
			if (!takeResFromTile(upgradedTile, res)) continue
			store.availableResources[res]++
		}
	}
	for (const skill of paidSkills) {
		if (!Number.isInteger(skill) || skill < 0) continue
		player.hiddenSkillTiles[skill]--
		model.deductHiddenSkillTile(playerIndex, skill)
		store.availableSkills[skill]++
	}
	if (resCost.length === 0 && skillCost.length > 0 && paidSkills.length === 0) {
		for (const skill of paid) {
			if (!Number.isInteger(skill) || skill < 0) continue
			player.hiddenSkillTiles[skill]--
			model.deductHiddenSkillTile(playerIndex, skill)
			store.availableSkills[skill]++
		}
	}
	if (resCost.length === 0 && skillCost.length === 0 && meepleCost.length > 0) {
		for (const meeple of paid) {
			if (!Number.isInteger(meeple) || meeple < 0) continue
			player.hiddenMeeples[meeple]--
			model.deductHiddenMeeple(playerIndex, meeple)
			store.availableMeeples[meeple]++
		}
	}
}

function payExtensionCost(playerIndex, tile, extension, choice) {
	const store = useModelStore()
	const player = store.players[playerIndex]

	let requiredResources = [...(extension.requiredResources || [])]
	if (requiredResources.length === 2 && requiredResources[1] === rf.RES_ANY && Number.isInteger(choice)) requiredResources = [requiredResources[0], choice]
	const requiredMeeples = [...(extension.requiredMeeples || [])]
	if (requiredMeeples.length === 1 && requiredMeeples[0] === rf.MEEPLE_ANY && Number.isInteger(choice)) requiredMeeples[0] = choice

	for (const res of requiredResources) {
		if (!Number.isInteger(res) || res < 0) continue
		if (!takeResFromTile(tile, res)) continue
		store.availableResources[res]++
	}
	for (const skill of extension.requiredSkillTiles || []) {
		if (!Number.isInteger(skill) || skill < 0) continue
		player.hiddenSkillTiles[skill]--
		model.deductHiddenSkillTile(playerIndex, skill)
		store.availableSkills[skill]++
	}
	for (const meeple of requiredMeeples) {
		if (!Number.isInteger(meeple) || meeple < 0 || meeple === rf.MEEPLE_PURPLE) continue
		player.hiddenMeeples[meeple]--
		model.deductHiddenMeeple(playerIndex, meeple)
		store.availableMeeples[meeple]++
	}
}

function applyExtensionEntry(playerIndex, entry) {
	const store = useModelStore()
	const tile_id = entry[1]
	const extension_id = entry[2]
	const tile = store.players[playerIndex].villageTiles.find((villageTile) => villageTile.id === tile_id)
	const extension = rf.ALL_EXTENSIONS.find((ext) => ext.id === extension_id)
	if (!tile || !extension) return
	payExtensionCost(playerIndex, tile, extension, entry[3])
	tile.extension = extension_id
	tile.coreMeepleColour = tile.coreMeepleColour === rf.MEEPLE_NONE ? extension.colour : tile.coreMeepleColour
	const idx = store.availableExtensions.indexOf(extension_id)
	if (idx !== -1) store.availableExtensions.splice(idx, 1)
}

function applyMoveResEntry(playerIndex, entry) {
	const store = useModelStore()
	const fromTileID = entry[0]
	const toTileID = entry[1]
	const res = entry[2]
	const player = store.players[playerIndex]
	const fromTile = player.villageTiles.find((tile) => tile.tileID.includes(fromTileID))
	const toTile = player.villageTiles.find((tile) => tile.tileID.includes(toTileID))
	if (!fromTile || !toTile || fromTile.resources[res] <= 0) return
	fromTile.resources[res]--
	toTile.resources[res]++
}

// Move/upgrade history is nested: [[fromTileID, toTileID, res, distance], [-3, tileID, paid], [-4, tile_id, extension]]
function applyNestedActionHistory(playerIndex, extras) {
	for (const entry of extras) {
		if (!Array.isArray(entry) || entry.length === 0) continue
		if (Array.isArray(entry[0])) {
			applyNestedActionHistory(playerIndex, entry)
			continue
		}
		if (entry[0] === -3) applyUpgradeEntry(playerIndex, entry)
		else if (entry[0] === -4) applyExtensionEntry(playerIndex, entry)
		else if (entry.length >= 3 && Number.isInteger(entry[0]) && Number.isInteger(entry[1])) applyMoveResEntry(playerIndex, entry)
	}
}

function applyRandomMeepleGain(playerIndex, count) {
	const store = useModelStore()
	store.players[playerIndex].knownHiddenMeeples[4] += count
}

function applyRandomSkillGain(playerIndex, count) {
	const store = useModelStore()
	store.players[playerIndex].knownHiddenSkillTiles[3] += count
}

function applySkillReturn(playerIndex, skill) {
	const store = useModelStore()
	if (!Number.isInteger(skill) || skill < 0) return
	store.players[playerIndex].hiddenSkillTiles[skill]--
	store.availableSkills[skill]++
	model.deductHiddenSkillTile(playerIndex, skill)
}

function awardGreenMeeples(playerIndex, amount) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	for (let i = 0; i < amount; i++) {
		if (store.availableGreenMeeples <= 0) break
		player.hiddenMeeples[rf.MEEPLE_GREEN]++
		player.knownHiddenMeeples[rf.MEEPLE_GREEN]++
		store.availableGreenMeeples--
	}
}

function removeOutbidMeeplesFromAnyTile(playerIndex, colours) {
	const store = useModelStore()
	if (colours.length === 0) return
	const allTiles = store.availableTiles.concat(store.availableTurnOrderTiles)
	for (const tile of allTiles) {
		const bid = tile.bids[playerIndex][0]
		if (bid.length !== colours.length) continue
		const sortedBid = [...bid].sort((a, b) => a - b)
		const sortedColours = [...colours].sort((a, b) => a - b)
		if (sortedBid.every((colour, idx) => colour === sortedColours[idx])) {
			for (const colour of bid) store.availableMeeples[colour]++
			bid.splice(0)
			return
		}
	}
	// No exact outbid group found. Return the meeples to the bag anyway.
	for (const colour of colours) store.availableMeeples[colour]++
}

/**************************** MAIN EVENT HANDLERS ****************************/

function replayBidOnTile(playerIndex, entry3) {
	const store = useModelStore()
	const tileID = entry3[0]
	const tile = store.availableTiles.find((candidate) => candidate.tileID.includes(tileID)) || store.availableTurnOrderTiles.find((candidate) => candidate.tileID.includes(tileID))
	if (!tile) {
		replayErrors.push(`bid tile ${tileID} not found in replay board`)
		return
	}
	setPlayerTurn(playerIndex)

	const bid = tile.bids[playerIndex][0]
	let firstColour = -1
	for (const entry of entry3.slice(1)) {
		if (!Array.isArray(entry)) continue
		if (entry[0] === -1) {
			for (let i = 1; i < entry.length; i++) {
				const colour = entry[i]
				if (!Number.isInteger(colour) || colour < 0) continue
				bid.push(colour)
				if (firstColour === -1) firstColour = colour
				store.players[playerIndex].hiddenMeeples[colour]--
				model.deductHiddenMeeple(playerIndex, colour)
			}
		} else if (entry[0] === -2) {
			const fromTile = getBoardTileByObjectID(entry[1])
			if (fromTile) {
				fromTile.bids[playerIndex][0].splice(0)
				fromTile.bids[playerIndex][1] = "none"
			}
			for (let i = 2; i < entry.length; i++) {
				const colour = entry[i]
				if (!Number.isInteger(colour) || colour < 0) continue
				bid.push(colour)
				if (firstColour === -1) firstColour = colour
			}
		}
	}
	if (firstColour !== -1 && tile.coreMeepleColour === rf.MEEPLE_NONE) tile.coreMeepleColour = firstColour

	model.checkPassFlagsForOutbidMeeples(tile.id)
}

function replayActOnTile(playerIndex, entry3) {
	const store = useModelStore()
	const historyTileID = entry3[0]
	const sourceTile = getBoardTileByTileID(historyTileID)
	let actionDef = sourceTile || rf.ALL_TILES.find((tile) => tile.tileID.includes(historyTileID))
	if (!actionDef) {
		replayErrors.push(`action tile ${historyTileID} not found in replay`)
		return
	}
	setPlayerTurn(playerIndex)

	let upgrades = []
	let extras = []
	for (const entry of entry3.slice(1)) {
		if (Array.isArray(entry) && entry[0] === -1) upgrades.push(entry)
		else if (Array.isArray(entry) && entry[0] === -2) upgrades.push(entry)
		else extras.push(entry)
	}

	let actionTileID = historyTileID
	let upgraded = actionDef.tileID.indexOf(actionTileID)
	if (upgraded === -1) upgraded = 0
	let action = actionDef.action[0]

	// Sorcerer: the next scalar is the tile whose action was copied.
	if (action === rf.ACT_TILE_USE_OTHER_TILE) {
		const copyIdx = extras.findIndex((entry) => typeof entry === "number" && entry >= 0)
		if (copyIdx !== -1) {
			const copiedTileID = extras[copyIdx]
			extras.splice(copyIdx, 1)
			const copiedDef = rf.ALL_TILES.find((tile) => tile.tileID.includes(copiedTileID))
			if (copiedDef) {
				actionDef = copiedDef
				actionTileID = copiedTileID
				upgraded = copiedDef.tileID.indexOf(copiedTileID)
				if (upgraded === -1) upgraded = 0
				action = copiedDef.action[0]
			}
		}
	}

	// Meeples were placed on the tile that was clicked, which for a Sorcerer is
	// the Sorcerer tile, not the copied tile.
	if (sourceTile) addMeeplesToActionTile(playerIndex, sourceTile, upgrades.filter((e) => e[0] === -1), upgrades.filter((e) => e[0] === -2))
	else {
		// The tile is gone (e.g. a collected season tile). Recover the public
		// meeple bookkeeping without a tile to put them on.
		for (const entry of upgrades) {
			if (entry[0] !== -1) continue
			for (let i = 1; i < entry.length; i++) model.deductHiddenMeeple(playerIndex, entry[i])
		}
	}

	const params = actionDef.action[upgraded + 1]
	const destinationTileID = findActionDestination(extras)

	switch (action) {
		case rf.ACT_TILE_GET_RES:
			gainResources(playerIndex, destinationTileID, Array.isArray(params) ? params : [])
			break

		case rf.ACT_TILE_GET_RES_CHOICE_THEN_ALL: {
			const destinationEntry = extras.find((entry) => Array.isArray(entry) && entry.length > 0 && typeof entry[0] === "number" && entry[0] >= 0)
			if (upgraded === 1) gainResources(playerIndex, destinationTileID, params)
			else if (destinationEntry && destinationEntry.length > 1) gainResources(playerIndex, destinationEntry[0], [destinationEntry[1]])
			break
		}

		case rf.ACT_TILE_SKILL_FOR_RES:
			applySkillReturn(playerIndex, params[0])
			gainResources(playerIndex, destinationTileID, params.slice(1))
			break

		case rf.ACT_TILE_GET_RANDOM_MEEPLE:
			applyRandomMeepleGain(playerIndex, extras.flat(Infinity).filter((value) => value === rf.MEEPLE_RANDOM).length || (params || 0) * 1)
			break

		case rf.ACT_TILE_GET_RANDOM_SKILL_TILE:
			applyRandomSkillGain(playerIndex, extras.flat(Infinity).filter((value) => value === rf.SKILL_ANY_RANDOM).length || (params || 0) * 1)
			break

		case rf.ACT_TILE_GET_ANIMALS:
		case rf.ACT_TILE_GET_WHEAT:
		case rf.ACT_TILE_GET_ANIMAL_AND_WHEAT:
		case rf.ACT_TILE_GET_FARM_ITEMS:
		case rf.ACT_TILE_GET_WHEAT_AND_MOVE_UPGRADE:
			// Items are recorded in a separate HIST_GET_FARM_ITEMS entry.
			if (action === rf.ACT_TILE_GET_WHEAT_AND_MOVE_UPGRADE) applyNestedActionHistory(playerIndex, extras)
			break

		case rf.ACT_TILE_MOVE_AND_UPGRADE:
			applyNestedActionHistory(playerIndex, extras)
			break

		case rf.ACT_TILE_GET_MEEPLE_AND_OR_SKILL: {
			const flat = extras.flat(Infinity).filter((entry) => typeof entry === "number")
			if (flat.includes(rf.MEEPLE_RANDOM)) applyRandomMeepleGain(playerIndex, 1)
			if (flat.includes(rf.SKILL_ANY_RANDOM)) applyRandomSkillGain(playerIndex, 1)
			break
		}

		case rf.ACT_TILE_EXCHANGE_MEEPLE_AUTO: {
			// [upgraded, -1] from supply, or [upgraded, tile_id, [meeples]] from an outbid tile.
			const exchange = extras.find((entry) => Array.isArray(entry))
			if (!exchange) break
			const source = exchange[1]
			if (source === -1) {
				const costColour = params[0]
				if (costColour >= 0) {
					store.players[playerIndex].hiddenMeeples[costColour]--
					model.deductHiddenMeeple(playerIndex, costColour)
					store.availableMeeples[costColour]++
				}
			} else if (source >= 0) {
				const fromTile = getBoardTileByObjectID(source)
				if (fromTile) {
					for (const colour of fromTile.bids[playerIndex][0]) store.availableMeeples[colour]++
					fromTile.bids[playerIndex][0].splice(0)
				}
			}
			awardGreenMeeples(playerIndex, params.slice(1).length)
			break
		}

		case rf.ACT_TILE_EXCHANGE_MEEPLE_MANUAL: {
			// Flat numbers are the outbid meeples removed, then MEEPLE_RANDOM gains.
			const flat = extras.flat(Infinity).filter((entry) => typeof entry === "number")
			const removed = flat.filter((value) => value >= 0)
			const randomCount = flat.filter((value) => value === rf.MEEPLE_RANDOM).length
			removeOutbidMeeplesFromAnyTile(playerIndex, removed)
			applyRandomMeepleGain(playerIndex, randomCount)
			break
		}

		case rf.ACT_TILE_EXCHANGE_SKILL_FOR_SKILL: {
			const flat = extras.flat(Infinity).filter((entry) => typeof entry === "number")
			const skill = flat.find((value) => value >= 0)
			const randomCount = flat.filter((value) => value === rf.SKILL_ANY_RANDOM).length
			applySkillReturn(playerIndex, skill)
			applyRandomSkillGain(playerIndex, randomCount)
			break
		}

		case rf.ACT_TILE_SKILL_FOR_MEEPLE: {
			// Brewer: exchange one skill tile for random meeples.
			const flat = extras.flat(Infinity).filter((entry) => typeof entry === "number")
			const skill = flat.find((value) => value >= 0)
			const randomCount = flat.filter((value) => value === rf.MEEPLE_RANDOM).length
			applySkillReturn(playerIndex, skill)
			applyRandomMeepleGain(playerIndex, randomCount)
			break
		}

		case rf.ACT_TILE_SKILL_FOR_GREEN: {
			// Trader: exchange one skill tile for green meeples.
			const flat = extras.flat(Infinity).filter((entry) => typeof entry === "number")
			const skill = flat.find((value) => value >= 0)
			applySkillReturn(playerIndex, skill)
			awardGreenMeeples(playerIndex, Array.isArray(params) ? params[1] : 0)
			break
		}

		case rf.ACT_TILE_GET_CONTRACT: {
			// Merchant A: flat array [id] or [-1, randomID].
			// Merchant B: nested arrays, one per contract.
			for (const extra of extras) {
				if (typeof extra === "number") awardContract(playerIndex, extra)
				else if (Array.isArray(extra)) {
					const ids = extra.filter((value) => Number.isInteger(value) && value >= 0)
					if (ids.length > 0) awardContract(playerIndex, ids[ids.length - 1])
				}
			}
			break
		}

		case rf.ACT_TILE_CONTRACT_OR_AND_ITEMS: {
			const actionTileDef = rf.ALL_TILES.find((tile) => tile.tileID.includes(actionTileID))
			const baseTileID = actionTileDef ? actionTileDef.tileID[0] : -1
			if (baseTileID === rf.TILE_M_SPRING_ASSAYER_A) {
				const arrayEntries = extras.filter((entry) => Array.isArray(entry))
				if (upgraded === 1) {
					gainResources(playerIndex, destinationTileID, [rf.STONE, rf.IRON])
					const contractEntry = arrayEntries[0] || []
					const id = contractEntry.filter((value) => Number.isInteger(value) && value >= 0).pop()
					awardContract(playerIndex, id)
				} else {
					const contractEntry = arrayEntries[0] || []
					const id = contractEntry.filter((value) => Number.isInteger(value) && value >= 0).pop()
					awardContract(playerIndex, id)
				}
			} else if (baseTileID === rf.TILE_M_SUMMER_BOOKKEEPER_A) {
				const contractEntry = extras.find((entry) => Array.isArray(entry)) || []
				const id = contractEntry.filter((value) => Number.isInteger(value) && value >= 0).pop()
				awardContract(playerIndex, id)
			} else if (baseTileID === rf.TILE_M_SUMMER_BOOKKEEPER_B) {
				const contractEntry = extras.find((entry) => Array.isArray(entry)) || []
				const id = contractEntry[1] !== undefined ? contractEntry[1] : contractEntry[0]
				awardContract(playerIndex, id)
				applyRandomSkillGain(playerIndex, 1)
			}
			break
		}

		default:
			// Tile actions with no replayable board effect (e.g. tile text only).
			break
	}
}

function replayGetFarmItems(playerIndex, entry3) {
	const tileID = entry3[0]
	const animalType = entry3[1]
	const animalCount = entry3[2] || 0
	const wheat = entry3[3] || 0
	const skillWanted = entry3[4] && entry3[4].length > 0

	if (animalType >= 0 && animalType <= 2) {
		const sourceTileId = doesPlayerHaveTileID(playerIndex, tileID) ? sideOfTile(tileID)?.def.id : -1
		model.addAnimalsToVillage(playerIndex, animalType, animalCount, sourceTileId)
	}
	model.addWheatToPlayer(playerIndex, wheat)
	if (skillWanted) applyRandomSkillGain(playerIndex, 1)
}

function replayCollectBoatResources(playerIndex, entry3) {
	const store = useModelStore()
	const tileID = entry3[0]
	setPlayerTurn(playerIndex)

	const flags = Array.isArray(entry3[entry3.length - 1]) ? entry3[entry3.length - 1] : []
	const season = store.gameflow.season
	const boat = store.availableBoatTiles.find((candidate) => candidate.tileID.includes(tileID))
	if (!boat) {
		replayErrors.push(`boat tile ${tileID} not found in replay board`)
		return
	}
	store.context.pendingBoat7Aresources.splice(0)
	model.collectBoatResources_core(playerIndex, tileID, season)

	if (flags.includes(1)) applyRandomMeepleGain(playerIndex, 2)

	const flag9Idx = flags.indexOf(9)
	if (flag9Idx !== -1 && flags[flag9Idx + 1] !== undefined) {
		const destination = flags[flag9Idx + 1]
		for (const res of store.context.pendingBoat7Aresources) {
			addResToPlayerTile(playerIndex, destination, res)
		}
	}
	store.context.pendingBoat7Aresources.splice(0)
	store.context.action = rf.ACT_NONE
	store.context.action2 = rf.ACT_NONE
}

function replayCollectBoatTile(playerIndex, entry3) {
	const store = useModelStore()
	const tileID = entry3[0]
	setPlayerTurn(playerIndex)

	const boatIdx = store.availableBoatTiles.findIndex((tile) => tile.tileID.includes(tileID))
	if (boatIdx === -1) {
		replayErrors.push(`winter boat tile ${tileID} not found`)
		return
	}
	const boat = JSON.parse(JSON.stringify(store.availableBoatTiles[boatIdx]))
	store.players[playerIndex].pendingVillageTiles.push(boat)
	store.availableBoatTiles.splice(boatIdx, 1)

	const flags = Array.isArray(entry3[entry3.length - 1]) ? entry3[entry3.length - 1] : []
	if (flags.includes(1)) applyRandomMeepleGain(playerIndex, 2)
	if (flags.includes(2)) awardGreenMeeples(playerIndex, 1)
	if (flags.includes(4)) {
		for (const res of [rf.WOOD, rf.STONE, rf.IRON]) {
			if (store.availableResources[res] <= 0) continue
			store.availableResources[res]--
			addResToPlayerTile(playerIndex, boat.tileID[0], res)
		}
	}
	if (flags.includes(5)) {
		for (let i = 0; i < 3; i++) {
			if (store.availableResources[rf.GOLD] <= 0) break
			store.availableResources[rf.GOLD]--
			addResToPlayerTile(playerIndex, boat.tileID[0], rf.GOLD)
		}
	}
}

function replayVillageExpansion(playerIndex, entry3) {
	const store = useModelStore()
	for (const tileID of entry3) {
		if (!Number.isInteger(tileID)) continue
		addTileToVillageFromHistory(playerIndex, tileID)
	}
	if (store.gameflow.season === rf.WINTER) store.availableBoatTiles.splice(0)
}

function replayChosenWinterTiles(entry3) {
	const store = useModelStore()

	if (store.gameflow.season !== rf.WINTER) {
		resetFullTurnOrderFromPurple()
		store.gameflow.season = rf.WINTER
		store.gameflow.phase = rf.PHASE_CHOOSE_WINTER_TILES
		setWinterBoatTiles()
		model.resetCoreMeepleColours()
		store.availableTiles.splice(0)
	}

	for (const player of store.players) player.hiddenWinterTile_tileIDs.splice(0)

	// The server writes [chosenCountsPerPlayer, tileID, tileID...]; the training
	// game path writes just tileIDs.
	const firstIsCounts = Array.isArray(entry3[0])
	const tileIDs = firstIsCounts ? entry3.slice(1) : entry3
	for (const tileID of tileIDs) {
		if (!Number.isInteger(tileID)) continue
		const tile = cloneTileByTileID(tileID)
		if (!tile) continue
		tile.upgraded = tile.tileID.indexOf(tileID)
		store.availableTiles.push(tile)
	}

	store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
	store.gameflow.turnOrder.splice(0, store.gameflow.turnOrder.length, ...store.gameflow.fullTurnOrder)
}

function replayNewContracts(historyIndex, entry3) {
	const store = useModelStore()
	const nextEntry = store.history[historyIndex + 1]
	// At the end of a season the old visible contracts are discarded first.
	if (nextEntry && (nextEntry[0] === rf.HIST_FILL_BOAT_TILES || nextEntry[0] === rf.HIST_CHOSEN_WINTER_TILES)) store.visibleContracts.splice(0)
	for (const contractID of entry3) {
		if (!Number.isInteger(contractID)) continue
		const hiddenIdx = store.hiddenContracts.indexOf(contractID)
		if (hiddenIdx !== -1) store.hiddenContracts.splice(hiddenIdx, 1)
		if (!store.visibleContracts.includes(contractID)) store.visibleContracts.push(contractID)
	}
}

function replayExchangeContractAuto(playerIndex, entry3) {
	const store = useModelStore()
	const contractID = entry3[0]
	const keyNum = entry3[1]
	const item = entry3[2]
	const player = store.players[playerIndex]
	player.hiddenContracts = player.hiddenContracts.filter((contract) => contract.id !== contractID)

	if (keyNum === 0) {
		player.hiddenMeeples[item]++
		player.knownHiddenMeeples[item]++
		store.availableMeeples[item]--
	} else if (keyNum === 1) {
		player.hiddenSkillTiles[item]++
		player.knownHiddenSkillTiles[item]++
		store.availableSkills[item]--
	} else if (keyNum === 2) {
		if (store.availableResources[item] > 0) {
			store.availableResources[item]--
			addResToPlayerTile(playerIndex, -1, item)
		}
	}
}

function applyHistoryEntry(historyIndex) {
	const store = useModelStore()
	const entry = store.history[historyIndex]
	const event = entry[0]
	const playerIndex = entry[1]
	const entry3 = entry[3] || []
	const phaseBefore = store.gameflow.phase

	switch (event) {
		case rf.HIST_NEW_GAME:
		case rf.HIST_GAME_END:
		case rf.HIST_REWIND:
		case rf.HIST_KEYSIDE_BOAT_INCOME:
			break

		case rf.HIST_FILL_BOAT_TILES: {
			const isFirst = store.availableBoatTiles.length === 0 && store.gameflow.season === rf.SPRING
			const season = isFirst ? rf.SPRING : store.gameflow.season + 1
			if (!isFirst) {
				resetFullTurnOrderFromPurple()
				store.gameflow.season = season
				store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
				model.resetCoreMeepleColours()
				setSeasonTiles(season)
			}
			replayFillBoatTiles(entry3, season)
			break
		}

		case rf.HIST_SEASON_TILES: {
			const season = entry3[0]
			store.gameflow.season = season
			store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
			const tiles = []
			for (let i = 1; i < entry3.length; i++) {
				const tile = cloneTileByID(entry3[i])
				if (!tile) continue
				tile.upgraded = 0
				tiles.push(tile)
			}
			store.availableTiles.splice(0, store.availableTiles.length, ...tiles)
			break
		}

		case rf.HIST_BID_ON_TILE:
			replayBidOnTile(playerIndex, entry3)
			break

		case rf.HIST_ACT_ON_TILE:
			replayActOnTile(playerIndex, entry3)
			break

		case rf.HIST_PASS_TURN:
			setPlayerTurn(playerIndex)
			if (playerIndex >= 0 && !store.gameflow.passedPlayerIndexes.includes(playerIndex)) store.gameflow.passedPlayerIndexes.push(playerIndex)
			// shortcut: the chosen pass option (1/2/3) is not in the compact history;
			// 1 is the default and does not affect the board.
			if (playerIndex >= 0 && store.players[playerIndex]) store.players[playerIndex].passFlag = 1
			break

		case rf.HIST_COLLECT_OUTBID_MEEPLES:
			store.gameflow.phase = rf.PHASE_COLLECT_BOAT_RESOURCES
			store.context.historyObj.splice(0)
			model.collectUnsuccessfulBids_core()
			for (const player of store.players) {
				player.passFlag = 1
				player.coreMeepleColour = rf.MEEPLE_NONE
			}
			store.gameflow.passedPlayerIndexes.splice(0)
			model.processTurnOrderTiles()
			break

		case rf.HIST_COLLECT_SEASON_TILES:
			store.context.historyObj.splice(0)
			model.collectSeasonTiles_core()
			break

		case rf.HIST_COLLECT_VILLAGE_MEEPLES:
			store.context.historyObj.splice(0)
			model.collectPlayerVillageMeeples_core()
			break

		case rf.HIST_COLLECT_BOAT_RESOURCES:
			if (store.gameflow.phase !== rf.PHASE_COLLECT_BOAT_RESOURCES) store.gameflow.phase = rf.PHASE_COLLECT_BOAT_RESOURCES
			replayCollectBoatResources(playerIndex, entry3)
			break

		case rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES:
			applyRandomMeepleGain(playerIndex, entry3.length)
			break

		case rf.HIST_COLLECT_BOAT_TILE:
			replayCollectBoatTile(playerIndex, entry3)
			break

		case rf.HIST_VILLAGE_EXPANSION:
			store.gameflow.phase = rf.PHASE_VILLAGE_EXPANDING
			replayVillageExpansion(playerIndex, entry3)
			break

		case rf.HIST_REPLACE_SEA_BASTION_2:
			model.replaceSeaBation2_core(entry3[0])
			break

		case rf.HIST_NEW_CONTRACTS:
			replayNewContracts(historyIndex, entry3)
			break

		case rf.HIST_EXCHANGE_CONTRACT_AUTO:
			replayExchangeContractAuto(playerIndex, entry3)
			break

		case rf.HIST_GET_FARM_ITEMS:
			replayGetFarmItems(playerIndex, entry3)
			break

		case rf.HIST_CHOSEN_WINTER_TILES:
			replayChosenWinterTiles(entry3)
			break

		case rf.HIST_FREE_UPGRADE: {
			const tileID = entry3[0]
			const tile = store.players[playerIndex].villageTiles.find((candidate) => candidate.tileID.includes(tileID))
			if (tile) tile.upgraded = 1
			break
		}

		case rf.HIST_FREE_EXTENSION: {
			const tileID = entry3[0]
			const extensionID = entry3[1]
			const tile = store.players[playerIndex].villageTiles.find((candidate) => candidate.tileID.includes(tileID))
			const extension = rf.ALL_EXTENSIONS.find((ext) => ext.id === extensionID)
			if (tile && extension) {
				tile.extension = extensionID
				tile.coreMeepleColour = tile.coreMeepleColour === rf.MEEPLE_NONE ? extension.colour : tile.coreMeepleColour
				const idx = store.availableExtensions.indexOf(extensionID)
				if (idx !== -1) store.availableExtensions.splice(idx, 1)
			}
			break
		}

		case rf.HIST_KICKOUT:
		case rf.HIST_RESIGN: {
			const displayName = entry3[0]
			const kickedIndex = store.players.findIndex((player) => player.displayName === displayName || player.name === displayName)
			if (kickedIndex !== -1) {
				store.players[kickedIndex].displayName = rf.BOT_NAME
				const turnIdx = store.gameflow.turnOrder.indexOf(kickedIndex)
				if (turnIdx !== -1) store.gameflow.turnOrder.splice(turnIdx, 1)
			}
			break
		}

		default:
			// Unknown history events must not break the replay.
			break
	}

	const TURN_ENDING_EVENTS = [
		rf.HIST_BID_ON_TILE,
		rf.HIST_ACT_ON_TILE,
		rf.HIST_PASS_TURN,
		rf.HIST_COLLECT_BOAT_RESOURCES,
		rf.HIST_COLLECT_BOAT_TILE,
		rf.HIST_VILLAGE_EXPANSION,
	]
	if (TURN_ENDING_EVENTS.includes(event)) advanceTurn(playerIndex, phaseBefore)
}

/**************************** ENTRY POINT ****************************/

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	store.viewSettings.generatingReplay = true
	replayErrors = []

	const fullHistory = store.history.map((entry) => JSON.parse(JSON.stringify(entry)))

	try {
		resetDataForReplay()
		store.history.splice(0, store.history.length, ...fullHistory)

		const replayData = []
		let pBarEl = null
		let pBarTextEl = null
		let lastYield = performance.now()
		if (typeof document !== "undefined") {
			// Let Vue render the progress bar before looking it up.
			await funcs.sleep(0)
			pBarEl = document.getElementById("pBarEl")
			pBarTextEl = document.getElementById("pBarTextEl")
		}

		for (let i = 0; i < store.history.length; i++) {
			try {
				applyHistoryEntry(i)
			} catch (error) {
				replayErrors.push(`history ${i} (event ${store.history[i][0]}): ${error.message}`)
				console.error("KFW replay error", i, store.history[i], error)
			}
			replayData.push(funcs.exportKFWmodel(false, true))

			if (pBarEl != null && pBarTextEl != null && performance.now() - lastYield > 50) {
				const percent = Math.round(((i + 1) / store.history.length) * 100)
				pBarEl.style.width = percent + "%"
				pBarTextEl.innerText = percent + "%"
				if (typeof requestAnimationFrame !== "undefined") await new Promise((resolve) => requestAnimationFrame(resolve))
				lastYield = performance.now()
			}
		}

		store.replayData.splice(0, store.replayData.length, ...replayData)

		let startStep = replayData.length - 1
		if (spoilerFree && replayData.length > 0) {
			const requested = Number(window.initData.replayStep)
			if (Number.isFinite(requested)) startStep = Math.max(0, Math.min(Math.floor(requested), replayData.length - 1))
		}
		if (startStep < 0) startStep = 0

		if (store.replayData.length > 0) {
			store.viewSettings.showReplay = true
			goToReplayStep(startStep)
		}
		if (replayErrors.length > 0) console.error(`KFW replay finished with ${replayErrors.length} error(s)`)
	} finally {
		replayBase = null
		store.viewSettings.generatingReplay = false
	}
}
