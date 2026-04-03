/**
 * These are functions to do with manipulating or interacting with the map.
 * NOTE: Pixel / hex coord / layout / display functions are generally in WEBhex
 * This is for more "game" type functions, rather than display/layout
 * If they do not need to be directly in the component, it is easier to put them here.
 * This helps to stop the component getting cluttered up with a lot of functions,
 * and keeps the component mainly for the display
 *
 */

import * as rf from "./WEBreference.js"
//import * as controller from "./WEBcontroller.js"
import * as model from "./WEBmodel.js"

import { useModelStore } from "../stores/WEBstore.js"

/**
 *
 * UTILITY FUNCTIONS
 *
 */

export function getIndexFromCoord(coord) {
	const store = useModelStore()
	return coord[1] * store.gridWidth + coord[0]
}

export function getCoordFromIndex(index) {
	const store = useModelStore()
	return [index % store.gridWidth, Math.floor(index / store.gridWidth)]
}

export function getViewBox() {
	const store = useModelStore()
	if (store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE) return [0, 0, store.gridWidth * store.refSize, store.gridHeight * store.refSize]
	return [2 * store.refSize, 2 * store.refSize, (store.gridWidth - 4) * store.refSize, (store.gridHeight - 4) * store.refSize]
}

export function isIndexOnTopEdge(index) {
	const store = useModelStore()
	return index < store.gridWidth
}

export function isIndexOnBottomEdge(index) {
	const store = useModelStore()
	return index >= store.gridWidth * (store.gridHeight - 1)
}

export function isIndexOnLeftEdge(index) {
	const store = useModelStore()
	return index % store.gridWidth === 0
}
export function isIndexOnRightEdge(index) {
	const store = useModelStore()
	return (index + 1) % store.gridWidth === 0
}

export function getNeighbours(index) {
	const store = useModelStore()
	let neighbours = []
	if (!isIndexOnTopEdge(index)) neighbours.push(index - store.gridWidth)
	if (!isIndexOnBottomEdge(index)) neighbours.push(index + store.gridWidth)
	if (!isIndexOnLeftEdge(index)) neighbours.push(index - 1)
	if (!isIndexOnRightEdge(index)) neighbours.push(index + 1)
	return neighbours
}

/*** End of Utility Functions */

export function initCoords() {
	// Assume that all tiles are in store.mapTiles
	const store = useModelStore()

  // If there is a mismatch between grid size and coord length, resize coords with empty squares
  if (store.coords.length !== store.gridWidth * store.gridHeight) {
    store.coords.splice(0)
    store.coords = Array.from({ length: store.gridWidth * store.gridHeight }, () => rf.SQ_EMPTY)
  }

	let expansion = getGridExpansion()
	// Update all coords
	for (let i = 0; i < store.mapTiles.length; i++) {
		let tile = store.mapTiles[i]
		tile.coord[0] += expansion.left
		tile.coord[1] += expansion.top
	}
	for (let i = 0; i < store.cables.length; i++) {
		// This refers to the FIRST (left/top) index
		store.cables[i].coord[0] += expansion.left
		store.cables[i].coord[1] += expansion.top
	}
  // Find the history entries that need updating
  let histUpdates = []
  for (let i=0;i<store.history.length;i++) {
    if (rf.HIST_ENTRIES_WITH_INDEX_AS_FIRST_ENTRY.includes(store.history[i][0])) {
      histUpdates.push([i, store.history[i][3][0], getCoordFromIndex(store.history[i][3][0])])
    }
  }
	// Reset the coords -- NB MUST HANDLE store.gridDimensions AS 2 PARTS OR YOU LOSE REACTIVITY
	store.gridDimensions[0] = store.gridWidth + expansion.left + expansion.right
	store.gridDimensions[1] = store.gridHeight + expansion.top + expansion.bottom
	store.coords.splice(0)
	store.coords = Array.from({ length: store.gridWidth * store.gridHeight }, () => rf.SQ_EMPTY)
	// Now update the indexes
	for (let i = 0; i < store.mapTiles.length; i++) {
		let tile = store.mapTiles[i]
		tile.index = getIndexFromCoord(tile.coord)
	}
	for (let i = 0; i < store.cables.length; i++) {
		// This refers to the FIRST (left/top) index
		store.cables[i].indexes[0] = getIndexFromCoord(store.cables[i].coord)
		if (store.cables[i].rotation === 0) store.cables[i].indexes[1] = store.cables[i].indexes[0] + store.gridWidth
		else store.cables[i].indexes[1] = store.cables[i].indexes[0] + 1
	}

  // Update ths history
  for (let i=0;i<histUpdates.length;i++) {
    let histIdx = histUpdates[i][0]
    //let oldIndex = histUpdates[1]
    let oldCoord = histUpdates[i][2]
    oldCoord[0] += expansion.left
    oldCoord[1] += expansion.top
    let newIndex = getIndexFromCoord(oldCoord)
    store.history[histIdx][3][0] = newIndex
  }

	// Add the tiles
	for (let i = 0; i < store.mapTiles.length; i++) {
		let tile = store.mapTiles[i]
		for (let i = 0; i < tile.rotatedModel3d.length; i++) {
			for (let j = 0; j < tile.rotatedModel3d[i].length; j++) {
				if (tile.rotatedModel3d[i][j] !== rf.SQ_NOTHING) store.coords[tile.index + i * store.gridWidth + j] = tile.rotatedModel3d[i][j]
			}
		}
	}

  // Fill in any single squares
  for (let i=0;i<store.coords.length;i++) {
    if (!isIndexOnLeftEdge(i) && !isIndexOnRightEdge(i) && !isIndexOnTopEdge(i) && !isIndexOnBottomEdge(i) && store.coords[i] === rf.SQ_EMPTY) {
      if (store.coords[i-1] !== rf.SQ_EMPTY && store.coords[i+1] !== rf.SQ_EMPTY && store.coords[i-store.gridWidth] !== rf.SQ_EMPTY && store.coords[i+store.gridWidth] !== rf.SQ_EMPTY) store.coords[i] = rf.SQ_ENCLOSED_EMPTY
    }
  }

}

export function addSingleTileToCoords(tileObj) {
	const store = useModelStore()
	for (let i = 0; i < tileObj.rotatedModel3d.length; i++) {
		for (let j = 0; j < tileObj.rotatedModel3d[i].length; j++) {
			if (tileObj.rotatedModel3d[i][j] !== rf.SQ_NOTHING) store.coords[tileObj.index + i * store.gridWidth + j] = tileObj.rotatedModel3d[i][j]
		}
	}
}

export function getGridExpansion() {
	const store = useModelStore()
	const expansion = { top: 0, bottom: 0, left: 0, right: 0 }
	// Top: Check first two rows
	for (let i = 0; i < store.gridWidth; i++) {
		if (store.coords[i] !== rf.SQ_EMPTY) {
			expansion.top = 2
			break
		}
		if (store.coords[i + store.gridWidth] !== rf.SQ_EMPTY) {
			expansion.top = 1
		}
	}

	// Bottom: Check last two rows
	for (let i = 0; i < store.gridWidth; i++) {
		const idxLastRow = i + (store.gridHeight - 1) * store.gridWidth
		const idxSecondLast = i + (store.gridHeight - 2) * store.gridWidth
		if (store.coords[idxLastRow] !== rf.SQ_EMPTY) {
			expansion.bottom = 2
			break
		}
		if (store.gridHeight > 1 && store.coords[idxSecondLast] !== rf.SQ_EMPTY) {
			expansion.bottom = 1
		}
	}

	// Left: Check first two columns
	for (let j = 0; j < store.gridHeight; j++) {
		const idx = j * store.gridWidth
		if (store.coords[idx] !== rf.SQ_EMPTY) {
			expansion.left = 2
			break
		}
		if (store.gridWidth > 1 && store.coords[idx + 1] !== rf.SQ_EMPTY) {
			expansion.left = 1
		}
	}

	// Right: Check last two columns
	for (let j = 0; j < store.gridHeight; j++) {
		const idxLastCol = j * store.gridWidth + (store.gridWidth - 1)
		const idxSecondLastCol = j * store.gridWidth + (store.gridWidth - 2)
		if (store.coords[idxLastCol] !== rf.SQ_EMPTY) {
			expansion.right = 2
			break
		}
		if (store.gridWidth > 1 && store.coords[idxSecondLastCol] !== rf.SQ_EMPTY) {
			expansion.right = 1
		}
	}

	return expansion
}

export function setNewTileOptions() {
	const store = useModelStore()
	store.context.indexesToHighlight.splice(0)
	store.context.currentGhostIndex = -1
	let removeTop = false
	let removeBottom = false
	let removeLeft = false
	let removeRight = false
	let tileID = store.context.selectedTileIDtoPlaceArr[0]
	let rotation = store.context.selectedTileIDtoPlaceArr[1]
	let tileData = model.getTileByID(tileID)

	if (tileData.style === rf.TILE_STYLE_SQUARE) {
		if (rotation === 0) {
			removeBottom = true
			removeRight = true
		} else if (rotation === 1) {
			removeBottom = true
			removeLeft = true
		} else if (rotation === 2) {
			removeTop = true
			removeLeft = true
		} else if (rotation === 3) {
			removeTop = true
			removeRight = true
		}
	} else if (tileData.style === rf.TILE_STYLE_RECT) {
		if (rotation === 0) removeBottom = true
		else if (rotation === 1) removeLeft = true
		else if (rotation === 2) removeTop = true
		else if (rotation === 3) removeRight = true
	} else if (tileData.style === rf.TILE_STYLE_CORNER) {
		if (rotation === 0) {
			removeTop = true
			removeRight = true
		} else if (rotation === 1) {
			removeBottom = true
			removeRight = true
		} else if (rotation === 2) {
			removeBottom = true
			removeLeft = true
		} else if (rotation === 3) {
			removeTop = true
			removeLeft = true
		}
	}

	for (let i = 0; i < store.coords.length; i++) {
		if (store.coords[i] === rf.SQ_EMPTY) {
			if (isIndexOnTopEdge(i) && removeTop) continue
			if (isIndexOnBottomEdge(i) && removeBottom) continue
			if (isIndexOnLeftEdge(i) && removeLeft) continue
			if (isIndexOnRightEdge(i) && removeRight) continue
			store.context.indexesToHighlight.push(i)
		}
	}
}

export function convertMouseIndexToAnchorIndex(index, tileID, rotation) {
	const store = useModelStore()
	let tileData = model.getTileByID(tileID)

	if (tileData.style === rf.TILE_STYLE_SQUARE) {
		if (rotation === 0) return index
		else if (rotation === 1) return (index -= 1)
		else if (rotation === 2) return (index -= store.gridWidth + 1)
		else if (rotation === 3) return (index -= store.gridWidth)
	} else if (tileData.style === rf.TILE_STYLE_RECT) {
		if (rotation === 0) return index
		else if (rotation === 1) return (index -= 1)
		else if (rotation === 2) return (index -= store.gridWidth)
		else if (rotation === 3) return index
	} else if (tileData.style === rf.TILE_STYLE_CORNER) {
		if (rotation === 0) return (index -= store.gridWidth)
		else if (rotation === 1) return index
		else if (rotation === 2) return (index -= 1)
		else if (rotation === 3) return (index -= store.gridWidth + 1)
	}
	alert("convertMouseIndexToAnchorIndex Error")
}

export function getAnyPlacementError(clickedIndex, tileID, rotation) {
	const store = useModelStore()
	let rotatedModel3d = model.getRotatedModel3d(tileID, rotation)
	let anchorIndex = convertMouseIndexToAnchorIndex(clickedIndex, tileID, rotation)

	// Check it isn't overlapping another tile
	for (let i = 0; i < rotatedModel3d.length; i++) {
		for (let j = 0; j < rotatedModel3d[i].length; j++) {
			if (rotatedModel3d[i][j] !== rf.SQ_NOTHING) {
				if (store.coords[anchorIndex + i * store.gridWidth + j] !== rf.SQ_EMPTY) return 1
			}
		}
	}

	// Check it is connected to another tile
	let connected = false

	for (let i = 0; i < rotatedModel3d.length; i++) {
		for (let j = 0; j < rotatedModel3d[i].length; j++) {
			if (rotatedModel3d[i][j] !== rf.SQ_NOTHING) {
				let idx = anchorIndex + i * store.gridWidth + j
				let neighbours = getNeighbours(idx)
				if (neighbours.some((n) => store.coords[n] !== rf.SQ_EMPTY)) {
					connected = true
					break
				}
			}
		}
	}

	if (!connected) return 2

	return 0
}

//////

export function prettyPrint() {
	const store = useModelStore()

	var str = ""
	for (var i = 0; i < store.coords.length; i++) {
		if (i % store.gridWidth === 0) str += "\n"

		switch (store.coords[i]) {
			case rf.SQ_EMPTY:
				str += ".."
				break
			case rf.SQ_ENCLOSED_EMPTY:
				str += "e."
				break
			case rf.SQ_TILE_EMPTY:
				str += "nn"
				break
			case rf.SQ_SERVER:
				str += "S "
				break
			case rf.SQ_COMP_1:
				str += "C1"
				break
			case rf.SQ_COMP_2:
				str += "C2"
				break
			case rf.SQ_COMP_3:
				str += "C3"
				break

			default:
				str += "??"
		}
	}
	console.log(str)
}
