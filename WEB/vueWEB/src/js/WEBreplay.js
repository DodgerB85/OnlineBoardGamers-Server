import * as rf from "./WEBreference"
import * as funcs from "./WEBfuncs"
import * as map from "./WEBmap"
import * as model from "./WEBmodel"
import * as history from "./WEBhistory"

import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal.js"

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	funcs.simpleImportWholeWEBmodelNoCompression(store.replayData[store.replayStep], false)
	history.setupHistoryHighlight(store.computedHistory[store.replayStep][0], store.computedHistory[store.replayStep][3])
}

export function performStep(amount) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.clearHistoryHighlights()
	store.clearMessages()

	if (amount === -99) store.replayStep = 0
	if (amount === -9) store.replayStep -= 5
	if (amount === -1) store.replayStep--
	if (amount === 1) store.replayStep++
	if (amount === 9) store.replayStep += 5
	if (amount === 99) store.replayStep = store.replayData.length - 1

	if (store.replayStep < 0) store.replayStep = 0
	if (store.replayStep > store.replayData.length - 1) store.replayStep = store.replayData.length - 1

	// Back to my last move
	if (amount === -999) {
		let idx = store.replayStep
		idx--
		while (idx > 0) {
			let histEntry = store.computedHistory[idx]
			if (histEntry[1] === personal.pov) {
				store.replayStep = idx
				break
			}
			idx--
		}
	}

	funcs.simpleImportWholeWEBmodelNoCompression(store.replayData[store.replayStep], false)
	history.setupHistoryHighlight(store.computedHistory[store.replayStep][0], store.computedHistory[store.replayStep][3])
}

async function resetDataForReplay() {
	const store = useModelStore()

	// Keep the final grid dimensions from the loaded game — do NOT reset to 6x6.
	// History entries store indexes computed for the final grid, so the grid must
	// stay at its final size for those indexes to map to the correct coords.

	// Save the center tile (first mapTile) before clearing — it has the correct
	// final coord/index after all grid expansions during the real game.
	let centerTile = JSON.parse(JSON.stringify(store.mapTiles[0]))

	// Reset players to starting state
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].storedCables = 15
		store.players[i].currentCables = 3
		store.players[i].tileIDarrays.splice(0)
	}

	// Clear map and cables
	store.mapTiles.splice(0)
	store.cables.splice(0)

	// Reset gameflow
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_WHOLE_TURN
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.turnOrder.splice(0)
	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.fullTurnOrder.push(i)
		store.gameflow.turnOrder.push(i)
	}

	store.resetContext()
	store.spinoffReplayData.splice(0)

	// Restore center tile at its final position
	store.mapTiles.push(centerTile)

	// Find HIST_INITIAL_TILES entry (may not exist for old games)
	const computedHistory = store.computedHistory
	let initialTilesEntry = null
	for (let i = 0; i < computedHistory.length; i++) {
		if (computedHistory[i][0] === rf.HIST_INITIAL_TILES) {
			initialTilesEntry = computedHistory[i]
			break
		}
	}

	if (initialTilesEntry) {
		// New games: restore exact starting tiles from history
		for (let i = 0; i < store.players.length; i++) {
			store.players[i].tileIDarrays.splice(0)
			if (initialTilesEntry[3][i]) {
				for (let j = 0; j < initialTilesEntry[3][i].length; j++) {
					store.players[i].tileIDarrays.push([...initialTilesEntry[3][i][j]])
				}
			}
		}
	} else {
		// Old games without HIST_INITIAL_TILES: deduce which tiles players started with
		// by tracking which tiles were placed or picked up from piles
		let playerUsedTiles = new Set()
		let allPlacedTiles = new Set()
		allPlacedTiles.add(rf.TILE_CENTER)

		for (let i = 1; i < computedHistory.length; i++) {
			let entry = computedHistory[i]
			if (entry[0] === rf.HIST_ADD_TILE) {
				allPlacedTiles.add(entry[3][1])
			} else if (entry[0] === rf.HIST_GET_NEW_TILE) {
				playerUsedTiles.add(entry[3][0])
			}
		}

		// Any placed tile that was never picked up from a pile must have been a starting tile
		let startingTileCandidates = new Set()
		allPlacedTiles.forEach((tileID) => {
			if (!playerUsedTiles.has(tileID)) startingTileCandidates.add(tileID)
		})

		// Assign starting tiles to players based on who placed them
		for (let i = 1; i < computedHistory.length; i++) {
			let entry = computedHistory[i]
			if (entry[0] === rf.HIST_ADD_TILE && startingTileCandidates.has(entry[3][1])) {
				let playerIdx = entry[1]
				let tileID = entry[3][1]
				let tileData = model.getTileByID(tileID)
				if (tileData.style === rf.TILE_STYLE_SQUARE && store.players[playerIdx].tileIDarrays.filter((t) => model.getTileByID(t[0]).style === rf.TILE_STYLE_SQUARE).length === 0) {
					store.players[playerIdx].tileIDarrays.push([tileID, 0])
				} else if (tileData.style === rf.TILE_STYLE_RECT && store.players[playerIdx].tileIDarrays.filter((t) => model.getTileByID(t[0]).style === rf.TILE_STYLE_RECT).length === 0) {
					store.players[playerIdx].tileIDarrays.push([tileID, 0])
				} else if (tileData.style === rf.TILE_STYLE_CORNER && store.players[playerIdx].tileIDarrays.filter((t) => model.getTileByID(t[0]).style === rf.TILE_STYLE_CORNER).length === 0) {
					store.players[playerIdx].tileIDarrays.push([tileID, 0])
				}
			}
		}

		// For any remaining empty slots, fill with random tiles from unused pool
		let usedTiles = new Set()
		usedTiles.add(rf.TILE_CENTER)
		allPlacedTiles.forEach((t) => usedTiles.add(t))
		playerUsedTiles.forEach((t) => usedTiles.add(t))
		startingTileCandidates.forEach((t) => usedTiles.add(t))

		let remainingSquares = []
		let remainingRects = []
		let remainingCorners = []
		for (let i = 0; i < rf.ALL_SQUARE_TILES.length; i++) {
			if (!usedTiles.has(rf.ALL_SQUARE_TILES[i])) remainingSquares.push(rf.ALL_SQUARE_TILES[i])
		}
		for (let i = 0; i < rf.ALL_RECT_TILES.length; i++) {
			if (!usedTiles.has(rf.ALL_RECT_TILES[i])) remainingRects.push(rf.ALL_RECT_TILES[i])
		}
		for (let i = 0; i < rf.ALL_CORNER_TILES.length; i++) {
			if (!usedTiles.has(rf.ALL_CORNER_TILES[i])) remainingCorners.push(rf.ALL_CORNER_TILES[i])
		}
		remainingSquares = funcs.shuffle(remainingSquares)
		remainingRects = funcs.shuffle(remainingRects)
		remainingCorners = funcs.shuffle(remainingCorners)

		for (let i = 0; i < store.players.length; i++) {
			let hasSquare = store.players[i].tileIDarrays.some((t) => model.getTileByID(t[0]).style === rf.TILE_STYLE_SQUARE)
			let hasRect = store.players[i].tileIDarrays.some((t) => model.getTileByID(t[0]).style === rf.TILE_STYLE_RECT)
			let hasCorner = store.players[i].tileIDarrays.some((t) => model.getTileByID(t[0]).style === rf.TILE_STYLE_CORNER)
			if (!hasSquare && remainingSquares.length > 0) store.players[i].tileIDarrays.push([remainingSquares.pop(), 0])
			if (!hasRect && remainingRects.length > 0) store.players[i].tileIDarrays.push([remainingRects.pop(), 0])
			if (!hasCorner && remainingCorners.length > 0) store.players[i].tileIDarrays.push([remainingCorners.pop(), 0])
		}
	}

	// Collect tiles to exclude from supply piles.
	// Only exclude center tile, placed tiles, and starting tiles.
	// Do NOT exclude drawn tiles (HIST_GET_NEW_TILE) — they must stay in the
	// piles so replayGetNewTile can remove them one-by-one as the replay progresses.
	let usedTiles = new Set()
	usedTiles.add(rf.TILE_CENTER)
	for (let i = 1; i < computedHistory.length; i++) {
		let entry = computedHistory[i]
		if (entry[0] === rf.HIST_ADD_TILE) usedTiles.add(entry[3][1])
	}
	// Also mark starting tiles as used (they're in players' hands, not in piles)
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].tileIDarrays.length; j++) {
			usedTiles.add(store.players[i].tileIDarrays[j][0])
		}
	}

	// Build remaining tile lists for supply piles
	let allSquareTiles = []
	let allRectTiles = []
	let allCornerTiles = []

	for (let i = 0; i < rf.ALL_SQUARE_TILES.length; i++) {
		if (!usedTiles.has(rf.ALL_SQUARE_TILES[i])) allSquareTiles.push(rf.ALL_SQUARE_TILES[i])
	}
	for (let i = 0; i < rf.ALL_RECT_TILES.length; i++) {
		if (!usedTiles.has(rf.ALL_RECT_TILES[i])) allRectTiles.push(rf.ALL_RECT_TILES[i])
	}
	for (let i = 0; i < rf.ALL_CORNER_TILES.length; i++) {
		if (!usedTiles.has(rf.ALL_CORNER_TILES[i])) allCornerTiles.push(rf.ALL_CORNER_TILES[i])
	}

	allSquareTiles = funcs.shuffle(allSquareTiles)
	allRectTiles = funcs.shuffle(allRectTiles)
	allCornerTiles = funcs.shuffle(allCornerTiles)

	// Fill supply piles
	store.SQUARE_PILE_1.splice(0)
	store.SQUARE_PILE_2.splice(0)
	store.RECT_PILE_1.splice(0)
	store.RECT_PILE_2.splice(0)
	store.CORNER_PILE_1.splice(0)
	store.CORNER_PILE_2.splice(0)

	for (let i = 0; i < allSquareTiles.length; i++) {
		if (i % 2 === 0) store.SQUARE_PILE_1.push(allSquareTiles[i])
		else store.SQUARE_PILE_2.push(allSquareTiles[i])
	}
	for (let i = 0; i < allRectTiles.length; i++) {
		if (i % 2 === 0) store.RECT_PILE_1.push(allRectTiles[i])
		else store.RECT_PILE_2.push(allRectTiles[i])
	}
	for (let i = 0; i < allCornerTiles.length; i++) {
		if (i % 2 === 0) store.CORNER_PILE_1.push(allCornerTiles[i])
		else store.CORNER_PILE_2.push(allCornerTiles[i])
	}

	// Rebuild coords for the final grid with the center tile
	store.coords.splice(0)
	store.coords = Array.from({ length: store.gridWidth * store.gridHeight }, () => rf.SQ_EMPTY)
	map.addSingleTileToCoords(centerTile)
}

// Directly place a tile on the map without going through addTileToModel.
// This avoids: (a) adding duplicate history entries, (b) triggering initCoords
// which would expand the grid and shift indexes.
// The stored index is the FINAL index (after all grid expansions in the real
// game). Because we keep the final grid dimensions, the index maps correctly.
function replayAddTile(entry) {
	const store = useModelStore()
	let index = entry[3][0]
	let tileID = entry[3][1]
	let rotation = entry[3][2]
	let playerIndex = entry[1]

	let tileData = model.getTileByID(tileID)
	let rotatedModel3d = model.getRotatedModel3d(tileID, rotation)
	let coord = map.getCoordFromIndex(index)

	store.mapTiles.push({
		tileID: tileID,
		index: index,
		coord: coord,
		gfx: tileData.gfx,
		style: tileData.style,
		rotation: rotation,
		rotatedModel3d: rotatedModel3d,
	})

	// Remove tile from the player who placed it
	if (playerIndex !== -1) {
		store.players[playerIndex].tileIDarrays = store.players[playerIndex].tileIDarrays.filter((tile) => tile[0] !== tileID)
	}

	map.addSingleTileToCoords(store.mapTiles[store.mapTiles.length - 1])
}

function replayGetNewTile(entry) {
	const store = useModelStore()
	let playerIndex = entry[1]
	let tileID = entry[3][0]
	store.players[playerIndex].tileIDarrays.push([tileID, 0])
	// Remove from supply piles
	store.SQUARE_PILE_1 = store.SQUARE_PILE_1.filter((tile) => tile !== tileID)
	store.SQUARE_PILE_2 = store.SQUARE_PILE_2.filter((tile) => tile !== tileID)
	store.RECT_PILE_1 = store.RECT_PILE_1.filter((tile) => tile !== tileID)
	store.RECT_PILE_2 = store.RECT_PILE_2.filter((tile) => tile !== tileID)
	store.CORNER_PILE_1 = store.CORNER_PILE_1.filter((tile) => tile !== tileID)
	store.CORNER_PILE_2 = store.CORNER_PILE_2.filter((tile) => tile !== tileID)
}

function replayAddCables(entry) {
	const store = useModelStore()
	let playerIndex = entry[1]
	store.players[playerIndex].storedCables -= 3
	store.players[playerIndex].currentCables += 3
}

function replayAddCableToMap(entry) {
	const store = useModelStore()
	let playerIndex = entry[1]
	let index = entry[3][0]
	let rotation = 0
	if (entry[3].length > 1) rotation = entry[3][1]

	let secondIndex = index + (rotation === 0 ? store.gridWidth : 1)
	store.cables.push({
		playerIndex: playerIndex,
		indexes: [index, secondIndex],
		rotation: rotation,
		coord: [map.getCoordFromIndex(index)[0], map.getCoordFromIndex(index)[1]],
	})
	store.players[playerIndex].currentCables--
}

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Save current state
	store.actualGameState.phase = store.gameflow.phase
	store.actualGameState.finishedGame = store.gameflow.phase === rf.PHASE_GAME_OVER

	store.viewSettings.generatingReplay = true

	let replayData = []

	// Reset to initial state (keeps final grid dimensions)
	await resetDataForReplay()

	let pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")

	const computedHistory = store.computedHistory

	for (let i = 0; i < computedHistory.length; i++) {
		// Skip the synthetic HIST_NEW_GAME entry (index 0) — center tile already placed
		if (i !== 0) {
			let entry = computedHistory[i]
			let eventType = entry[0]

			if (eventType === rf.HIST_ADD_TILE) replayAddTile(entry)
			else if (eventType === rf.HIST_GET_NEW_TILE) replayGetNewTile(entry)
			else if (eventType === rf.HIST_ADD_CABLES) replayAddCables(entry)
			else if (eventType === rf.HIST_ADD_CABLE_TO_MAP) replayAddCableToMap(entry)
			// HIST_RESIGN, HIST_KICKOUT, HIST_REWIND, HIST_GAME_END — no state changes needed
		}

		replayData.push(funcs.simpleExportWholeWEBmodelNoCompression())

		if (i % 5 === 0 && pBarEl != null) {
			let percent = (i / computedHistory.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await funcs.sleep(0)
		}
	}

	store.replayData = replayData
	store.replayStep = replayData.length - 1
	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
		else store.replayStep = window.initData.replayStep
	}
	if (store.replayData.length > 0) store.viewSettings.showReplay = true
	goToReplayStep(store.replayStep)
	store.viewSettings.generatingReplay = false
}
