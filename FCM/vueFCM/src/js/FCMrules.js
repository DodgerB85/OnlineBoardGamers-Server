import * as rf from "./FCMreference"
import * as controller from "./FCMcontroller"
import * as map from "./FCMmap"
import * as funcs from "./FCMfuncs"
import * as plyr from "./FCMplayer"
import * as model from "./FCMmodel"

import { toRaw } from "vue"
import { useModelStore } from "../stores/FCMstore.js"

const DRINK_TYPES = new Set([rf.DRINK_BEER, rf.DRINK_COKE, rf.DRINK_LEMONADE])

export function getOffsetForRotation(rotation) {
	if (rotation === 0) return 1
	if (rotation === 1) return rf.ssW + 1
	if (rotation === 2) return rf.ssW
	return 0
}

export function oneLevelAbove(employee, preservingColour) {
	const store = useModelStore()
	let level = []
	switch (employee) {
		case rf.MANAGEMENT_TRAINEE:
			level = [rf.JUNIOR_VICE_PRESIDENT, rf.NEW_BUSINESS_DEVELOPER, rf.LUXURIES_MANAGER]
			break
		case rf.JUNIOR_VICE_PRESIDENT:
			level = [rf.VICE_PRESIDENT, rf.LOCAL_MANAGER, rf.DISCOUNT_MANAGER, rf.RECRUITING_MANAGER, rf.COACH]
			break
		case rf.VICE_PRESIDENT:
			level = [rf.SENIOR_VICE_PRESIDENT, rf.REGIONAL_MANAGER, rf.GURU]
			break
		case rf.SENIOR_VICE_PRESIDENT:
			level = [rf.EXECUTIVE_VICE_PRESIDENT, rf.CFO, rf.HR_DIRECTOR]
			break
		case rf.ERRAND_BOY:
			level = [rf.CART_OPERATOR]
			break
		case rf.CART_OPERATOR:
			level = [rf.TRUCK_DRIVER]
			break
		case rf.TRUCK_DRIVER:
			level = [rf.ZEPPELIN_PILOT]
			break
		case rf.MARKETING_TRAINEE:
			level = [rf.CAMPAIGN_MANAGER, rf.RURAL_MARKETEER, rf.MASS_MARKETEER, rf.GOURMET_FOOD_CRITIC, rf.HAWKER_MARKETEER]
			break
		case rf.CAMPAIGN_MANAGER:
			level = [rf.BRAND_MANAGER]
			break
		case rf.BRAND_MANAGER:
			level = [rf.BRAND_DIRECTOR]
			break
		case rf.KITCHEN_TRAINEE:
			level = [rf.BURGER_COOK, rf.PIZZA_COOK, rf.NOODLE_COOK, rf.SUSHI_COOK, rf.DUMPLING_COOK]
			break
		case rf.BURGER_COOK:
			level = [rf.BURGER_CHEF]
			break
		case rf.PIZZA_COOK:
			level = [rf.PIZZA_CHEF]
			break
		case rf.SUSHI_COOK:
			level = [rf.SUSHI_CHEF]
			break
		case rf.NOODLE_COOK:
			level = [rf.NOODLE_CHEF]
			break
		case rf.DUMPLING_COOK:
			level = [rf.DUMPLING_CHEF]
			break
		case rf.WAITRESS:
			level = [rf.B_MOVIE_STAR, rf.C_MOVIE_STAR, rf.D_MOVIE_STAR, rf.JAZZ_MUSICIAN]
			break
		case rf.BARISTA_TRAINEE:
			level = [rf.BARISTA]
			break
		case rf.BARISTA:
			level = [rf.LEAD_BARISTA]
			break
		default:
			level = []
	}

	if (preservingColour === true) {
		switch (employee) {
			case rf.MANAGEMENT_TRAINEE:
				level = [rf.JUNIOR_VICE_PRESIDENT]
				break
			case rf.JUNIOR_VICE_PRESIDENT:
				level = [rf.VICE_PRESIDENT]
				break
			case rf.VICE_PRESIDENT:
				level = [rf.SENIOR_VICE_PRESIDENT]
				break
			case rf.SENIOR_VICE_PRESIDENT:
				level = [rf.EXECUTIVE_VICE_PRESIDENT]
				break
		}
	}

	if (store.startingOptions.fryChefs) {
		switch (employee) {
			case rf.BURGER_COOK:
				level.push(rf.FRY_CHEF)
				break
			case rf.PIZZA_COOK:
				level.push(rf.FRY_CHEF)
				break
			case rf.NOODLE_COOK:
				level.push(rf.FRY_CHEF)
				break
			case rf.SUSHI_COOK:
				level.push(rf.FRY_CHEF)
				break
		}
	}

	return level
}

export function allowedCampaigns(marketer) {
	switch (marketer) {
		case rf.MARKETING_TRAINEE:
			return [rf.BILLBOARD]
		case rf.CAMPAIGN_MANAGER:
			return [rf.BILLBOARD, rf.MAIL]
		case rf.BRAND_MANAGER:
			return [rf.BILLBOARD, rf.MAIL, rf.AIRPLANE]
		case rf.BRAND_DIRECTOR:
			return [rf.BILLBOARD, rf.MAIL, rf.AIRPLANE, rf.RADIO]
		case rf.GOURMET_FOOD_CRITIC:
			return [rf.GOURMET_GUIDE]
		case rf.RURAL_MARKETEER:
			return [rf.GIANT_BILLBOARD]
		case rf.HAWKER_MARKETEER:
			return [rf.HAWKER_TRUCK]
		default:
			return []
	}
}

export function giveMaxDurationForMarketer(marketer) {
	switch (marketer) {
		case rf.MARKETING_TRAINEE:
			return 2
		case rf.CAMPAIGN_MANAGER:
			return 3
		case rf.BRAND_MANAGER:
			return 4
		case rf.BRAND_DIRECTOR:
			return 5
		case rf.GOURMET_FOOD_CRITIC:
			return 3
		case rf.HAWKER_MARKETEER:
			return 3
		default:
			return 0
	}
}

export function giveMaxRangeForMarketer(marketer) {
	switch (marketer) {
		case rf.MARKETING_TRAINEE:
			return 2
		case rf.CAMPAIGN_MANAGER:
			return 3
		case rf.BRAND_MANAGER:
			return -1
		case rf.BRAND_DIRECTOR:
			return -1
		default:
			return 0
	}
}



// The draftable pool. Module 8 is only draftable when the old milestones are in play.
const MODULE_POOL = [20, 23, 10, 12, 11, 19, 22, 9, 15, 17, 13, 14, 16]
const MODULE_IDS = new Set([...MODULE_POOL, 8])

export function getAvailableModules(returnAlreadyDrafted) {
	const store = useModelStore()

	// 1. Define the base pool of modules
	let availableModules = [...MODULE_POOL]

	// 2. Only real module IDs count as drafted. Starting options (18/300/120/...),
	// the 999 skip marker and any duplicate of an already-drafted module share this
	// list, and counting them inflates the draft count so the end-of-draft check
	// never matches and drafting runs forever.
	const rawDrafted = store.externalStartingOptions
	const draftedModules = [...new Set(rawDrafted.filter((mod) => MODULE_IDS.has(mod)))]

	// 3. Return early if we only need the cleaned drafted list
	if (returnAlreadyDrafted) return draftedModules

	// 4. Handle special Milestone 8 logic
	const hasMilestone8 = draftedModules.includes(8)
	if (!store.startingOptions.newMilestones && !hasMilestone8) {
		availableModules.unshift(8)
	}

	// 5. Return available modules that haven't been drafted yet
	const draftedSet = new Set(draftedModules)
	return availableModules.filter((mod) => !draftedSet.has(mod))
}

export function givePossibleStartingRestaurantsPosition(rotation) {
	const store = useModelStore()

	const currentOffset = getOffsetForRotation(rotation)

	// 1. Get initial 2x2 locations adjacent to a road at the offset point
	let possibilities = map.locationFor(2, 2, true).filter((space) => map.adjacentToRoad(space + currentOffset))
	// 2. Identify "Impossible Tiles" (where other players already have restaurants)
	const impossibleTiles = new Set()

	for (const player of store.players) {
		if (player.restaurants.length === 1) {
			const resto = player.restaurants[0]
			const idx = resto.index + getOffsetForRotation(resto.rotation)
			impossibleTiles.add(map.giveTileNumber(idx))
		}
	}

	// 4. Filter possibilities: must not be on an impossible tile
	return possibilities.filter((space) => {
		const tileNum = map.giveTileNumber(space + currentOffset)
		return !impossibleTiles.has(tileNum)
	})
}

export function isAnyTrainableBaseEmployeeUnavailable() {
	const store = useModelStore()
	// Returns true if at least one employee in the list has a count of 0
	return rf.TRAINABLE_BASE.some((em) => store.availableEmployees[em] === 0)
}

export function getRemainingRecruitPointsAvailableForDiscount() {
	const recruitPoints = getRemainingRecruitingPoints(controller.currentPlayerIndex())
	const totalDiscountPoints = getTotalRecruitDiscountPoints(controller.currentPlayerIndex())
	return Math.min(totalDiscountPoints, recruitPoints)
}


export function giveSmallSquaresOutsideBoard() {
	const store = useModelStore()
	let ssWidth = store.mapData.dimensions[0] * 5
	let edgeSquares = []
	for (let i = 0; i < store.mapData.coords.length; i++) {
		// check if an empty SS is next to a non-empty SS
		if (store.mapData.coords[i] === rf.OFF_BOARD) {
			if (store.mapData.coords[i - 1] !== rf.OFF_BOARD) edgeSquares.push(i)
			if (store.mapData.coords[i + 1] !== rf.OFF_BOARD) edgeSquares.push(i)
			if (store.mapData.coords[i - ssWidth] !== rf.OFF_BOARD) edgeSquares.push(i)
			if (store.mapData.coords[i + ssWidth] !== rf.OFF_BOARD) edgeSquares.push(i)
		}
	}
	return edgeSquares
}

export function givePossibilitiesForNewTile() {
	const store = useModelStore()
	const { coords, dimensions } = store.mapData
	const totalSSWidth = dimensions[0] * 5
	const edgeSquares = giveSmallSquaresOutsideBoard()

	// 1. Initial filter for base edge orientation
	const allPossibilitiesSet = new Set()
	for (const idx of edgeSquares) {
		// Bottom and Right edges
		if (map.isTopLeftOfTile(idx)) {
			allPossibilitiesSet.add(idx)
		}
		// Left Edge
		if (map.isTopRightOfTile(idx) && coords[idx + 1] !== rf.OFF_BOARD) {
			allPossibilitiesSet.add(idx)
		}
		// Top Edge
		if (map.isBottomLeftOfTile(idx) && coords[idx + totalSSWidth] !== rf.OFF_BOARD) {
			allPossibilitiesSet.add(idx)
		}
	}

	// 2. Build a Set of forbidden indexes (anything NOT off-board)
	// Checking a Set.has() is significantly faster than Array.includes()
	const forbiddenSet = new Set()
	for (let i = 0; i < coords.length; i++) {
		if (coords[i] !== rf.OFF_BOARD) {
			forbiddenSet.add(i)
		}
	}

	const finalPossibilities = []

	// 3. Validate each potential 5x5 tile placement
	for (const startIdx of allPossibilitiesSet) {
		// Calculate the top-left origin of the 5x5 tile for this specific edge square
		const x = startIdx % totalSSWidth
		const y = Math.floor(startIdx / totalSSWidth)
		const tileX = Math.floor(x / 5)
		const tileY = Math.floor(y / 5)

		// Calculate the starting Small Square (ss) index for the 5x5 block
		const ssIndex = tileY * 5 * totalSSWidth + tileX * 5

		let isBlocked = false

		// Check 5x5 grid for collisions with forbiddenSet
		tileCheck: for (let ty = 0; ty < 5; ty++) {
			for (let tx = 0; tx < 5; tx++) {
				const currentSS = ssIndex + tx + ty * totalSSWidth
				if (forbiddenSet.has(currentSS)) {
					isBlocked = true
					break tileCheck // Early exit: found a collision
				}
			}
		}

		if (!isBlocked) {
			finalPossibilities.push(startIdx)
		}
	}

	return finalPossibilities
}

export function givePossibilitiesForFreeway(rotated, sides) {
	const store = useModelStore()
	const usedRowCol = map.getUsedRowCol() // cached once - this fn used to call it ~160x per invocation
	const coords = toRaw(store.mapData.coords) // raw read - avoids Vue track() on ~10k reads below
	const W = store.mapData.dimensions[0] * 5 // board row width in small squares (total)
	const W5 = W * 5 // row stride (one full row of tiles)
	const usedW = usedRowCol[1].length * 5 // used board width in small squares
	const usedH = usedRowCol[0].length * 5 // used board height in small squares

	// Local helpers that close over coords/W to avoid repeated useModelStore()+toRaw() per call
	const collapseOk = (index, width, collapsed) => {
		if (!collapsed) {
			for (let k = 0; k < width; k++) {
				if (coords[index + k] !== rf.OFF_BOARD && coords[index + k] !== rf.FREEWAY && (coords[index + k] < 134 || coords[index + k] > 136)) return false
			}
		} else {
			for (let i = 0; i < width * W; i += W) {
				if (coords[index + i] !== rf.OFF_BOARD && coords[index + i] !== rf.FREEWAY && (coords[index + i] < 134 || coords[index + i] > 136)) return false
			}
		}
		return true
	}
	const onBottomEdge = (index, width) => {
		let count = 0
		for (let sc = 0; sc < width; sc++) {
			if (coords[index + W + sc] === rf.OFF_BOARD || (coords[index + W + sc] >= 134 && coords[index + W + sc] <= 136)) count++
		}
		return count === width
	}
	const onLeftEdge = (index, height) => {
		let count = 0
		for (let sc = 0; sc < height; sc++) {
			if (coords[index + W * sc + 1] === rf.OFF_BOARD || coords[index + W * sc + 1] === rf.FREEWAY || (coords[index + W * sc + 1] >= 134 && coords[index + W * sc + 1] <= 136)) count++
		}
		return count !== height
	}

	let collapsePossible = true
	let possibilitiesWithSpace = []
	let legalRoad = []
	let indexesRequired = []
	let index = 0
	let addPossible = true

	let freewayWidth = 3
	let freewayHeight = 1
	if (rotated === true) {
		freewayWidth = 1
		freewayHeight = 3
	}

	let possibilities = []

	let startingX = usedRowCol[0][0] * W5 + usedRowCol[1][0] * 5

	if (sides === false) {
		// Get available top and bottom squares
		let netAvailableWidth = usedW - freewayWidth
		for (let i = startingX; i <= startingX + netAvailableWidth; i++) {
			possibilities.push(i)
			possibilities.push(i + W5 * usedRowCol[0].length - W)
		}

		// Now collapse sides into actual board shape
		for (let i = 0; i < possibilities.length; i++) {
			collapsePossible = true
			do {
				collapsePossible = collapseOk(possibilities[i], freewayWidth, false)

				if (collapsePossible) {
					if (i % 2 === 0) possibilities[i] += W5
					else possibilities[i] -= W5
				}
				if (possibilities[i] > 8000) break
				if (possibilities[i] < 0) break
			} while (collapsePossible)
		} // end collapsing

		possibilitiesWithSpace = []
		for (let i = 0; i < possibilities.length; i++) {
			indexesRequired = []
			index = possibilities[i]

			// on bottom
			if (onBottomEdge(index, freewayWidth)) {
				for (let y = 0; y < freewayHeight; y++) {
					for (let x = 0; x < freewayWidth; x++) {
						indexesRequired.push(index + W + W * y + x)
					}
				}
			} else {
				// on top
				for (let y = 0; y < freewayHeight; y++) {
					for (let x = 0; x < freewayWidth; x++) {
						indexesRequired.push(index - W - W * y + x)
					}
				}
			}

			addPossible = true
			for (let j = 0; j < indexesRequired.length; j++) {
				if (coords[indexesRequired[j]] !== rf.OFF_BOARD) addPossible = false
			}
			if (addPossible === true) possibilitiesWithSpace.push(index)
		}
		possibilities = possibilitiesWithSpace

		legalRoad = []
		// top and bottom, rotated, so width of 1, easy
		if (rotated) {
			for (let i = 0; i < possibilities.length; i++) {
				if (coords[possibilities[i]] === rf.ROAD) legalRoad.push(possibilities[i])
			}
			possibilities = legalRoad
		}
		if (!rotated) {
		for (let i = 0; i < possibilities.length; i++) {
			if (coords[possibilities[i]] === rf.ROAD || coords[possibilities[i] + 1] === rf.ROAD || coords[possibilities[i] + 2] === rf.ROAD) legalRoad.push(possibilities[i])
		}
			possibilities = legalRoad
		}

		// Not on the sides, so now shift all the possibilities up or down by 1
		for (let i = 0; i < possibilities.length; i++) {
			if (onBottomEdge(possibilities[i], 3)) possibilities[i] = possibilities[i] + W
			else possibilities[i] = possibilities[i] - W
		}
	} else {
		// Now sides must be true

		// Get available sides squares
		let netAvailableHeight = usedH - freewayHeight
		for (let i = startingX; i <= startingX + netAvailableHeight; i++) {
			possibilities.push(startingX + (i - startingX) * W)
			possibilities.push(startingX + ((i - startingX) * W + usedRowCol[1].length * 5 - 1))
		}

		// Now collapse sides into actual board shape
		for (let i = 0; i < possibilities.length; i++) {
			collapsePossible = true
			do {
				collapsePossible = collapseOk(possibilities[i], freewayHeight, true)
				if (collapsePossible) {
					if (i % 2 === 0)
						possibilities[i] += 5 // LEFT
					else possibilities[i] -= 5 // RIGHT
				}
				if (possibilities[i] > 8000) break
				if (possibilities[i] < 0) break
			} while (collapsePossible)
		} // end collapsing

		// for each possibilities[i], calculate the indexes required, and then check they are all -1
		possibilitiesWithSpace = []
		for (let i = 0; i < possibilities.length; i++) {
			indexesRequired = []
			index = possibilities[i]

			if (onLeftEdge(index, freewayHeight)) {
				for (let y = 0; y < freewayHeight; y++) {
					for (let x = 0; x < freewayWidth; x++) {
						indexesRequired.push(index - 1 + W * y - x)
					}
				}
			} else {
				// on right
				for (let y = 0; y < freewayHeight; y++) {
					for (let x = 0; x < freewayWidth; x++) {
						indexesRequired.push(index + 1 + W * y + x)
					}
				}
			}

			addPossible = true
			for (let j = 0; j < indexesRequired.length; j++) {
				if (coords[indexesRequired[j]] !== rf.OFF_BOARD) addPossible = false
			}
			if (addPossible === true) possibilitiesWithSpace.push(index)
		}
		possibilities = possibilitiesWithSpace

		legalRoad = []
		// sides, NOT rotated, so width of 1, easy
		if (!rotated) {
			for (let i = 0; i < possibilities.length; i++) {
				if (coords[possibilities[i]] === rf.ROAD) legalRoad.push(possibilities[i])
			}
			possibilities = legalRoad
		}
		if (rotated) {
		for (let i = 0; i < possibilities.length; i++) {
			if (coords[possibilities[i]] === rf.ROAD || coords[possibilities[i] + W] === rf.ROAD || coords[possibilities[i] + W + W] === rf.ROAD) legalRoad.push(possibilities[i])
		}
			possibilities = legalRoad
		}

		// on the sides, so now shift all the possibilities L/R by 1
		for (let i = 0; i < possibilities.length; i++) {
			if (onLeftEdge(possibilities[i], 3)) possibilities[i] = possibilities[i] - 1
			else possibilities[i] = possibilities[i] + 1
		}
	}

	return possibilities
}

export function givePossiblePositionsForCoffeeShop(range) {
	const store = useModelStore()

	// 1. Determine initial possibilities
	let possibilities = range === 2 ? givePossiblePositionsForSimpleObject(1, 1, range, 0, false, false, false) : map.locationFor(1, 1, true)

	// 2. Identify forbidden Tile IDs (tiles already containing a coffee shop)
	// Using a Set to store Tile IDs for instant lookup
	const forbiddenTileIds = new Set()

	for (const player of store.players) {
		for (const shopIdx of player.coffeeShops) {
			// Assuming giveTileNumber returns a unique ID for the tile
			forbiddenTileIds.add(map.giveTileNumber(shopIdx))
		}
	}

	// 3. Filter possibilities: Remove any index sitting on a forbidden tile
	return possibilities.filter((index) => {
		const tileId = map.giveTileNumber(index)
		return !forbiddenTileIds.has(tileId)
	})
}

export function givePossiblePositionsForSimpleObject(w, h, range, rotated, lobbyist, newRoad, lobbyistData) {
	const store = useModelStore()
	const mapWidth = rf.ssW
	const coords = toRaw(store.mapData.coords)

	// 1. Adjust dimensions for rotation
	if (rotated === 1) [w, h] = [h, w]

	// 2. Initial Map Scan
	let possibilities = map.locationFor(w, h, true)

	// 3. Filter for Road Connectivity
	if (newRoad) {
		possibilities = possibilities.filter((idx) => {
			if (!rotated) {
				return coords[idx - 1] === rf.ROAD || coords[idx + w] === rf.ROAD
			} else {
				return coords[idx - mapWidth] === rf.ROAD || coords[idx + mapWidth * h] === rf.ROAD
			}
		})
	}

	// 4. Build Reachability Set (Replaces _.intersection)
	const reachSet = new Set()
	const playerObj = controller.currentPlayerObj()
	const hasDriveIn = plyr.doesPlayerHaveDriveIn(controller.currentPlayerIndex())

	// Add ranges from restaurants
	for (const resto of playerObj.restaurants) {
		const minR = hasDriveIn ? 0 : resto.rotation
		const maxR = hasDriveIn ? 4 : resto.rotation + 1

		for (let r = minR; r < maxR; r++) {
			let offset = r === 0 ? 1 : r === 1 ? mapWidth + 1 : r === 2 ? mapWidth : 0
			map.emptySpacesAdjacentToRoadsWithinRange(resto.index + offset, range, lobbyist, lobbyistData).forEach((idx) => reachSet.add(idx))
		}
	}

	// Add ranges from coffee shops
	if (store.startingOptions.coffee) {
		playerObj.coffeeShops.forEach((idx) => {
			map.emptySpacesAdjacentToRoadsWithinRange(idx, range, lobbyist, lobbyistData).forEach((resIdx) => reachSet.add(resIdx))
		})
	}

	// 5. Filter possibilities by Reachability
	possibilities = possibilities.filter((pp) => {
		const totalCoords = map.giveAllSpaceForAToken(pp, w, h)
		return totalCoords.some((coord) => reachSet.has(coord))
	})

	// 6. Handle New Road Restaurant Entrances
	if (newRoad) {
		const restoStarts = [...new Set(givePossibleStartsFromRestaurants(true).flat())].filter((idx) => coords[idx] === rf.EMPTY_SPACE)

		for (const idx of restoStarts) {
			let isValid = true
			const testResult = restaurantRoadTest(idx)

			if (!rotated) {
				if (testResult === 1) {
					// Left to Right
					for (let j = 0; j < w; j++) if (coords[idx + j] !== rf.EMPTY_SPACE) isValid = false
					if (isValid) possibilities.push(idx)
				} else if (testResult === 3) {
					// Right to Left
					for (let j = 0; j < w; j++) if (coords[idx - j] !== rf.EMPTY_SPACE) isValid = false
					if (isValid) possibilities.push(idx - w + 1)
				}
			} else {
				if (testResult === 0) {
					// Up to Down (Top edge)
					for (let j = 0; j < h; j++) if (coords[idx - j * mapWidth] !== rf.EMPTY_SPACE) isValid = false
					if (isValid) possibilities.push(idx - (h - 1) * mapWidth)
				} else if (testResult === 2) {
					// Up to Down (Bottom edge)
					for (let j = 0; j < h; j++) if (coords[idx + j * mapWidth] !== rf.EMPTY_SPACE) isValid = false
					if (isValid) possibilities.push(idx)
				}
			}
		}
	}

	return [...new Set(possibilities)]
}

export function restaurantRoadTest(index) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	if (coords[index + rf.ssW] >= 140 && coords[index + rf.ssW] <= 149 && coords[index + 2 * rf.ssW] >= 140 && coords[index + 2 * rf.ssW] <= 149) return 0 // top edge
	if (coords[index - 1] >= 140 && coords[index - 1] <= 149 && coords[index - 2] >= 140 && coords[index - 2] <= 149) return 1 // right edge
	if (coords[index - rf.ssW] >= 140 && coords[index - rf.ssW] <= 149 && coords[index - 2 * rf.ssW] >= 140 && coords[index - 2 * rf.ssW] <= 149) return 2 // bottom edge
	if (coords[index + 1] >= 140 && coords[index + 1] <= 149 && coords[index + 2] >= 140 && coords[index + 2] <= 149) return 3 // left edge
	return -1
}

// Give possible positions for marketing campaign
export function givePossiblePositionsForMarketingCampaign(marketer, campaignId, rotated) {
	const store = useModelStore()
	const mapWidth = rf.ssW
	const campaignData = rf.MARKETING_CAMPAIGNS[campaignId]

	let w = rotated ? campaignData.height : campaignData.width
	let h = rotated ? campaignData.width : campaignData.height

	// --- CASE A: AIRPLANE CAMPAIGNS ---
	if (campaignData.type === rf.AIRPLANE) {
		let possibilities = []
		const ssDim = store.mapData.dimensions[0] * 5
		const [rows, cols] = map.getUsedRowCol()
		const startX = rows[0] * ssDim * 5 + cols[0] * 5
		const usedW = map.giveUsedDimension()[0] * 5
		const usedH = map.giveUsedDimension()[1] * 5

		const planeW = campaignId === 4 ? campaignData.height : campaignData.width
		const netLen = (rotated ? usedH : usedW) - planeW

		// 1. Generate edge seed positions
		for (let i = 0; i <= netLen; i++) {
			if (rotated) {
				const base = startX + i * ssDim
				possibilities.push(base, base + cols.length * 5 - 1)
			} else {
				const base = startX + i
				possibilities.push(base, base + ssDim * 5 * rows.length - ssDim)
			}
		}

		// 2. Collapse positions toward board edges
		possibilities = possibilities.map((pos, idx) => {
			let current = pos
			const step = rotated ? 5 : ssDim * 5
			const isStartEdge = idx % 2 === 0

			while (map.isCollapsePossible(current, planeW, rotated)) {
				current += isStartEdge ? step : -step
				if (current > 8000 || current < 0) break
			}
			return current
		})

		// 3. Validate OFF_BOARD space requirements
		const coords = toRaw(store.mapData.coords)
		return possibilities
			.filter((pos) => {
				let index = pos
				let [pW, pH] = [campaignData.width, campaignData.height]
				if (campaignId === 4) [pW, pH] = [pH, pW]

				if (!rotated) {
					index = map.isIndexOnBottomEdgeOfMap(pos, pW) ? pos + ssDim : pos - ssDim * 2
				} else {
					;[pW, pH] = [pH, pW]
					if (campaignId === 4) [pW, pH] = [pH, pW]
					index = map.isIndexOnLeftEdgeOfMap(pos, pH) ? pos - 2 : pos + 1
				}

				// Verify all required "sky" squares are OFF_BOARD
				for (let ii = 0; ii < pW; ii++) {
					for (let jj = 0; jj < pH; jj++) {
						if (coords[index + ii + jj * ssDim] !== rf.OFF_BOARD) return false
					}
				}
				return true
			})
			.map((pos) => {
				// Adjust final highlight to sit on the board edge
				if (rotated) return pos % 5 === 0 ? pos - 1 : pos + 1
				return pos % (ssDim * 5) < ssDim ? pos - ssDim : pos + ssDim
			})
	}

	// --- CASE B: STANDARD CAMPAIGNS (BILLBOARD/MAIL) ---
	let possibilities = map.locationFor(w, h, true)
	const range = giveMaxRangeForMarketer(marketer)

	if (range > -1) {
		const reachSet = new Set()
		const player = controller.currentPlayerObj()

		// Build reachability map using Sets (O(1) lookup)
		const sources = [...player.restaurants]
		if (store.startingOptions.coffee && player.coffeeShops.length > 0) {
			player.coffeeShops.forEach((idx) => sources.push({ index: idx, isCoffee: true }))
		}

		for (const s of sources) {
			const driveIn = s.isCoffee ? false : plyr.doesPlayerHaveDriveIn(controller.currentPlayerIndex())
			const minR = !s.isCoffee && !driveIn ? s.rotation : 0
			const maxR = !s.isCoffee && !driveIn ? s.rotation + 1 : 4

			for (let r = minR; r < maxR; r++) {
				let off = r === 0 ? 1 : r === 1 ? mapWidth + 1 : r === 2 ? mapWidth : 0
				map.emptySpacesAdjacentToRoadsWithinRange(s.index + off, range, false, null).forEach((idx) => reachSet.add(idx))
			}
		}

		// Final intersection filter
		possibilities = possibilities.filter((pp) => {
			const totalCoords = map.giveAllSpaceForAToken(pp, w, h)
			return totalCoords.some((coord) => reachSet.has(coord))
		})
	}

	return possibilities
}

export function givePossiblePositionsForMailboxRestaurantMilestone(campaign, restaurantIndex) {
	const campaignData = rf.MARKETING_CAMPAIGNS[campaign]
	const w = campaignData.width
	const h = campaignData.height

	// 1. Get the starting land mass (O(N))
	let area = map.areaNotRoad(restaurantIndex)

	// 2. Handle Mailbox/Small Campaign Logic (Must be road-adjacent)
	if (campaign === 9 || campaign === 10) {
		area = area.filter((idx) => map.adjacentToRoad(idx))
	}

	// 3. Handle Billboard/Large Campaign Logic
	if (campaign === 7 || campaign === 8) {
		// Get valid campaign spots (already optimized in our previous step)
		const campaignPositions = givePossiblePositionsForMarketingCampaign(rf.BRAND_DIRECTOR, campaign, false)
		const campaignSet = new Set(campaignPositions)

		// Use Set.has() for O(1) intersection check
		area = area.filter((idx) => campaignSet.has(idx))
	}

	// 4. Final filter against all valid map locations for the object size
	const maxPossibilities = map.locationFor(w, h)
	const areaSet = new Set(area)

	return maxPossibilities.filter((idx) => areaSet.has(idx))
}

export function givePossiblePositionsForNewRestaurant(rotation, ranged) {
	const store = useModelStore()
	const player = controller.currentPlayerObj()

	const currentOffset = getOffsetForRotation(rotation)

	// 1. Initial Map Scan: Get 2x2 spots adjacent to roads
	let possibilities = map.locationFor(2, 2, true).filter((space) => map.adjacentToRoad(space + currentOffset))

	// 2. Handle Range constraints (Distance-based placement)
	if (ranged === true) {
		const range = 3
		const reachSet = new Set()

		// Collect all reachable road-adjacent empty spaces into a Set
		for (const resto of player.restaurants) {
			// Check all 4 rotations for existing restaurants
			for (let rota = 0; rota < 4; rota++) {
				const idx = resto.index + getOffsetForRotation(rota)
				const options = map.emptySpacesAdjacentToRoadsWithinRange(idx, range, false, null)
				options.forEach((opt) => reachSet.add(opt))
			}
		}

		// Add Coffee Shops to the reachability set
		if (store.startingOptions.coffee && player.coffeeShops.length > 0) {
			for (const shopIdx of player.coffeeShops) {
				const options = map.emptySpacesAdjacentToRoadsWithinRange(shopIdx, range, false, null)
				options.forEach((opt) => reachSet.add(opt))
			}
		}

		// 4. Final filter: Intersection logic using Set.has() for speed
		possibilities = possibilities.filter((pp) => {
			const totalCoords = map.giveAllSpaceForAToken(pp, 2, 2)
			// If ANY of the 4 tiles in the 2x2 building are in the reachSet, it's valid
			return totalCoords.some((coord) => reachSet.has(coord))
		})
	}

	return possibilities
}

export function givePossiblePositionsForBlock(w, h) {
	let possibilities = map.locationFor(w, h, true)
	return possibilities
}

export function givePossibleHousesForGarden() {
	const store = useModelStore()

	// 1. Get all house numbers that already have gardens (Replaces _.pluck)
	const existingGardenHouses = new Set(store.gardens.map((g) => g.house))

	// 2. Find houses that are on the board AND don't have a garden yet
	// Replaces _.difference and _.intersection
	const allBoardHouses = map.findAllHouses() // Assuming this returns an array of house numbers

	const possibilities = allBoardHouses.filter((houseNum) => {
		const isBoardHouse = rf.BOARD_HOUSES.includes(houseNum)
		const hasNoGarden = !existingGardenHouses.has(houseNum)
		return isBoardHouse && hasNoGarden
	})

	// 3. Final filter: House must have at least one free edge for a garden
	return possibilities.filter((house) => map.findFreeEdgesForHouse(house).length > 0)
}

export function givePossibleStartsFromRestaurants(anyIndex) {
	const store = useModelStore()
	const playerObj = controller.currentPlayerObj()
	const resultSet = new Set()

	// openOnly: false — rules historically ignore resto.open (unlike model entrances)
	for (const idx of model.giveRestaurantDoorIndices(controller.currentPlayerIndex(), { openOnly: false })) {
		const neighbors = anyIndex ? map.neighbours(idx) : map.nextRoadNeighbours(idx, -1, false, true)
		for (const n of neighbors) {
			resultSet.add(n)
		}
	}

	// Coffee always uses road neighbours, even when anyIndex picks plain neighbours for doors
	if (store.startingOptions.coffee && playerObj.coffeeShops.length > 0) {
		for (const shopIdx of playerObj.coffeeShops) {
			for (const n of map.nextRoadNeighbours(shopIdx, -1, false, true)) {
				resultSet.add(n)
			}
		}
	}

	return Array.from(resultSet)
}

export function firstStartIsFromTheSameTile(index) {
	const store = useModelStore()
	const playerObj = controller.currentPlayerObj()

	const vicinity = new Set(map.neighbours(index))

	// openOnly: false — matches givePossibleStartsFromRestaurants
	for (const doorIdx of model.giveRestaurantDoorIndices(controller.currentPlayerIndex(), { openOnly: false })) {
		if (vicinity.has(doorIdx) && map.onTheSameTile(index, doorIdx)) {
			return true
		}
	}

	if (store.startingOptions.coffee && playerObj.coffeeShops.length > 0) {
		for (const coffeeIdx of playerObj.coffeeShops) {
			if (vicinity.has(coffeeIdx) && map.onTheSameTile(index, coffeeIdx)) {
				return true
			}
		}
	}

	return false
}

export function nextRoadPossibilities(index, comingFrom, range) {
	// 1. Get the road segment until a junction or choice point is reached
	let possibilities = map.traceRoadUntilChoice(index, comingFrom, range)

	let path = []
	let from = -1 // -1 = no junction reached yet
	let targets = []

	if (possibilities.length === 1) {
		// Only the current square is valid
		path.push(possibilities[0])
		targets = map.nextRoadNeighbours(index, comingFrom, range === 0)
	} else if (possibilities.length > 1) {
		// A multi-square road segment was found
		const segmentByTile = map.splitPathByTiles(possibilities)

		// Deduct range based on tile boundaries crossed
		range -= segmentByTile.length - 1

		const lastIdx = possibilities.length - 1
		path = [...possibilities] // Shallow clone of the path
		from = possibilities[lastIdx]

		// Find next choices from the end of this segment
		targets = map.nextRoadNeighbours(from, possibilities[lastIdx - 1], range === 0)
	}

	return {
		target: targets,
		path: path,
		range: range,
		from: from,
	}
}

export function gatherDrinksAlongPath(path, collectionNumber) {
	const store = useModelStore()
	const coords = store.mapData.coords

	// 1. Gather all unique neighbors along the entire path
	const uniqueSpaces = new Set()
	for (const step of path) {
		const stepNeighbors = map.neighbours(step)
		for (const space of stepNeighbors) {
			if (DRINK_TYPES.has(coords[space])) {
				uniqueSpaces.add(space)
			}
		}
	}

	// 3. Transform unique drink tiles into items based on collectionNumber
	const inventory = []
	for (const space of uniqueSpaces) {
		const type = coords[space]

		// Determine which item to add
		let itemType = null
		if (type === rf.DRINK_LEMONADE) itemType = rf.LEMONADE
		else if (type === rf.DRINK_COKE) itemType = rf.COKE
		else if (type === rf.DRINK_BEER) itemType = rf.BEER

		// Add to inventory 'collectionNumber' times
		if (itemType != null) {
			for (let i = 0; i < collectionNumber; i++) {
				inventory.push(itemType)
			}
		}
	}

	return inventory
}

// Unique drink-square indexes adjacent to a driven road path
export function giveDrinkSquaresAlongPath(path) {
	const store = useModelStore()
	const coords = store.mapData.coords

	const uniqueSpaces = new Set()
	for (const step of path) {
		for (const space of map.neighbours(step)) {
			if (DRINK_TYPES.has(coords[space])) uniqueSpaces.add(space)
		}
	}
	return Array.from(uniqueSpaces)
}

// House-square indexes adjacent to a hawker truck route path
// (houses whose living area neighbours a road square in the path)
export function giveHousesAlongHawkerPath(path) {
	const store = useModelStore()
	const coords = store.mapData.coords

	const houseIndexes = new Set()

	for (const step of path) {
		for (const neighborIdx of map.neighbours(step)) {
			const spaceContent = coords[neighborIdx]

			if (spaceContent > rf.HOUSE && spaceContent < rf.HOUSE + 29) {
				const rawHouseNum = spaceContent - rf.HOUSE
				const houseNum = Number.isInteger(spaceContent) ? rawHouseNum : Math.round((rawHouseNum + Number.EPSILON) * 100) / 100

				// Board Houses and Apartments: directly add the neighbour index
				if (rf.BOARD_HOUSES.includes(houseNum) || rf.APARTMENTS.includes(houseNum)) {
					houseIndexes.add(neighborIdx)
				} else {
					// Player-built houses: check rotation to exclude garden tiles
					const h = store.houses.find((house) => house.number === houseNum)
					if (!h) continue

					const validIndexes = []
					const { rotated, index } = h
					if (rotated === 0) validIndexes.push(index, index + 1, index + rf.ssW, index + rf.ssW + 1)
					else if (rotated === 2) validIndexes.push(index + rf.ssW, index + rf.ssW + 1, index + rf.ssW * 2, index + rf.ssW * 2 + 1)
					else if (rotated === 1) validIndexes.push(index + 1, index + 2, index + rf.ssW + 1, index + rf.ssW + 2)
					else if (rotated === 3) validIndexes.push(index, index + 1, index + rf.ssW, index + rf.ssW + 1)

					if (validIndexes.includes(neighborIdx)) houseIndexes.add(neighborIdx)
				}
			}
		}
	}

	return Array.from(houseIndexes)
}

// Unique drink-square indexes contained in a list of tiles (zeppelin)
export function giveDrinkSquaresOnTiles(tiles) {
	const store = useModelStore()
	const coords = store.mapData.coords

	const squares = []
	for (const tile of tiles) {
		for (const idx of map.giveAllSpaceForAToken(map.giveStartingIndexForTile(tile), 5, 5)) {
			if (DRINK_TYPES.has(coords[idx])) squares.push(idx)
		}
	}
	return squares
}

export function givePossibleStartsFromRestaurantsForZeppelin() {
	const store = useModelStore()
	const playerObj = controller.currentPlayerObj()
	const uniqueTiles = new Set()

	// openOnly: false — matches the other rules-side entrance walks
	for (const doorIndex of model.giveRestaurantDoorIndices(controller.currentPlayerIndex(), { openOnly: false })) {
		uniqueTiles.add(map.giveTileNumber(doorIndex))
	}

	if (store.startingOptions.coffee && playerObj.coffeeShops.length > 0) {
		for (const shopIndex of playerObj.coffeeShops) {
			uniqueTiles.add(map.giveTileNumber(shopIndex))
		}
	}

	return Array.from(uniqueTiles)
}

export function nextAirPossibilitiesForZeppelin(index, path) {
	// 1. Get all adjacent tile IDs
	const adjacentTiles = map.giveAdjacentTiles(index)

	// 2. Filter out tiles that are already in the current path
	return adjacentTiles.filter((tile) => !path.includes(tile))
}

export function gatherFromTiles(tiles, range) {
	const inventory = []

	// 1. Define valid sources and their corresponding items
	const drinkMapping = {
		[rf.DRINK_BEER]: rf.BEER,
		[rf.DRINK_COKE]: rf.COKE,
		[rf.DRINK_LEMONADE]: rf.LEMONADE,
	}

	// 2. Iterate through provided tiles
	for (const t of tiles) {
		const tileNumber = map.giveTileAtPosition(t)
		const contents = rf.TILES[tileNumber] || []

		// 3. Filter and map drinks in one pass
		for (const type of contents) {
			const item = drinkMapping[type]

			if (item != null) {
				// Add the item to results 'range' times
				for (let i = 0; i < range; i++) {
					inventory.push(item)
				}
			}
		}
	}

	return inventory
}

// gives the turn order according to the number of free slots
export function giveTurnOrderFromFreeSlots() {
	const store = useModelStore()

	// Create a copy of the array to avoid mutating the store directly
	return [...store.gameflow.fullTurnOrder].sort((a, b) => {
		const getPriority = (playerIndex) => {
			const p = store.players[playerIndex]

			// Bot handling: bots always go last (highest priority number)
			if (p.displayName === rf.BOT_NAME) return 99

			// Base priority is negative free slots (more slots = lower number = earlier turn)
			let score = -plyr.giveNbFreeSlots(playerIndex)

			// Milestone bonus
			if (plyr.hasMilestone(playerIndex, rf.FIRST_AIRPLANE_CAMPAIGN)) {
				score -= 2
			}

			// Movie Star Bonuses (Weighted heavily to force early turns)
			// Using a simple loop or check is faster than multiple .includes calls
			const emp = p.employees
			if (emp.includes(rf.B_MOVIE_STAR)) score -= 300
			if (emp.includes(rf.C_MOVIE_STAR)) score -= 200
			if (emp.includes(rf.D_MOVIE_STAR)) score -= 100

			return score
		}

		return getPriority(a) - getPriority(b)
	})
}

export function getRemainingRecruitingPoints(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const employees = playerObj.employees

	let base = 0

	// 1. CEO Action logic
	if (playerObj.ceoAction === rf.CEO_ACTION_HIRE_1) {
		base += 1
	} else if (playerObj.ceoAction === rf.CEO_ACTION_RECRUITING_MANAGER) {
		base += 2
	}

	// 2. Employee and Night Shift logic in a single pass
	const hasNightShift = store.startingOptions.nightShift && employees.includes(rf.NIGHT_SHIFT_MANAGER)

	for (const employee of employees) {
		if (employee === rf.RECRUITING_GIRL) {
			base += 1
			if (hasNightShift) base += 1 // Add bonus point immediately
		} else if (employee === rf.RECRUITING_MANAGER) {
			base += 2
		} else if (employee === rf.HR_DIRECTOR) {
			base += 4
		}
	}

	// 3. Subtract points for hires already made this turn
	base -= store.context.justHired.length

	return base
}

export function getTotalRecruitingPoints(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const employees = playerObj.employees

	let base = 0

	// 1. CEO Action logic
	if (playerObj.ceoAction === rf.CEO_ACTION_HIRE_1) {
		base += 1
	} else if (playerObj.ceoAction === rf.CEO_ACTION_RECRUITING_MANAGER) {
		base += 2
	}

	// 2. Single-pass check for Employees and Night Shift Bonus
	const hasNightShift = store.startingOptions.nightShift && employees.includes(rf.NIGHT_SHIFT_MANAGER)

	for (const employee of employees) {
		if (employee === rf.RECRUITING_GIRL) {
			base += hasNightShift ? 2 : 1 // +1 base, +1 if Night Shift
		} else if (employee === rf.RECRUITING_MANAGER) {
			base += 2
		} else if (employee === rf.HR_DIRECTOR) {
			base += 4
		}
	}

	return base
}

export function getTotalRecruitDiscountPoints(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	let discountPoints = 0

	// 1. CEO Action logic
	if (playerObj.ceoAction === rf.CEO_ACTION_RECRUITING_MANAGER) {
		discountPoints += 2
	}

	// 2. Single-pass employee check
	for (const employee of playerObj.employees) {
		if (employee === rf.RECRUITING_MANAGER) {
			discountPoints += 2
		} else if (employee === rf.HR_DIRECTOR) {
			discountPoints += 4
		}
	}

	return discountPoints
}

export function getTrainingPoints(playerIndex, trainingDone) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const employees = playerObj.employees

	let total = 0
	let numLevel2 = 0
	let numLevel3 = 0

	// 1. CEO Action
	if (playerObj.ceoAction === rf.CEO_ACTION_COACH) {
		total += 2
		numLevel2++
	}

	// 2. Single-pass Employee & Night Shift calculation
	const hasNightShift = store.startingOptions.nightShift && employees.includes(rf.NIGHT_SHIFT_MANAGER)

	for (const employee of employees) {
		if (employee === rf.TRAINER) {
			total += hasNightShift ? 2 : 1
		} else if (employee === rf.COACH) {
			total += 2
			numLevel2++
		} else if (employee === rf.GURU) {
			total += 3
			numLevel3++
		}
	}

	// 3. Subtract spent training points
	for (const training of trainingDone) {
		const spent = training.spent
		total -= spent
		if (spent === 2) numLevel2--
		else if (spent === 3) numLevel3--
	}

	// 4. Handle "Spill-over" logic (Gurus covering Coach-level training)
	if (numLevel2 < 0 && numLevel3 > 0) {
		numLevel3 += numLevel2 // numLevel2 is negative, so this subtracts
		numLevel2 = 0
	}

	return {
		total,
		level2: numLevel2,
		level3: numLevel3,
		unlimited: plyr.hasMilestone(playerIndex, rf.FIRST_20_SALARIES) || plyr.hasMilestone(playerIndex, rf.FIRST_HOUSE_BUILT),
	}
}

export function getSubSlotsForEmployee(employee) {
	if (rf.MANAGERS.indexOf(employee) > -1) {
		switch (employee) {
			case rf.MANAGEMENT_TRAINEE:
				return 2
			case rf.JUNIOR_VICE_PRESIDENT:
				return 3
			case rf.VICE_PRESIDENT:
				return 4
			case rf.SENIOR_VICE_PRESIDENT:
				return 5
			case rf.EXECUTIVE_VICE_PRESIDENT:
				return 10
		}
	}
	return 0
}

export function forbiddenEmployeesDuringHire(playerIndex, justHired) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const UNIQUE_SET = new Set(rf.UNIQUE_CARDS)

	// 1. Use a Set to automatically handle uniqueness and fast lookups
	const forbidden = new Set()

	// Helper to add unique cards from any array to our forbidden Set
	const addUniques = (arr) => {
		if (!arr) return
		for (const card of arr) {
			if (UNIQUE_SET.has(card)) {
				forbidden.add(card)
			}
		}
	}

	// 2. Process all potential locations of unique cards
	addUniques(playerObj.employees)
	addUniques(playerObj.beach)
	addUniques(justHired)

	// Process marketers (extracting the 'marketer' property first)
	if (playerObj.marketers) {
		for (const m of playerObj.marketers) {
			if (UNIQUE_SET.has(m.marketer)) {
				forbidden.add(m.marketer)
			}
		}
	}

	// 3. Apply specific milestone and duplicate rules
	if (plyr.hasMilestone(playerIndex, rf.FIRST_100_DOL)) {
		forbidden.add(rf.CFO)
	}

	if (plyr.hasEmployee(playerIndex, rf.DELIVERY_DRIVER)) {
		forbidden.add(rf.DELIVERY_DRIVER)
	}

	// 4. Return as a clean array
	return Array.from(forbidden)
}

export function possibleUpgrades(availabilities, playerIndex, employees, numTrain = 1, canTrain2 = 0, canTrain3 = 0, unlimited = false, hired = [], fromActiveEmployees = false) {
	const forbiddenSet = new Set(forbiddenEmployeesDuringHire(playerIndex, hired))

	// Movie Star restriction Set
	const MOVIE_STARS = new Set([rf.B_MOVIE_STAR, rf.C_MOVIE_STAR, rf.D_MOVIE_STAR])
	const hasAnyMovieStar = plyr.hasEmployee(playerIndex, rf.B_MOVIE_STAR) || plyr.hasEmployee(playerIndex, rf.C_MOVIE_STAR) || plyr.hasEmployee(playerIndex, rf.D_MOVIE_STAR)

	// --- CASE A: SINGLE EMPLOYEE UPGRADE (RECURSIVE BASE) ---
	if (typeof employees === "number") {
		let upgradeLevelLimit = unlimited ? 9 : canTrain3 > 0 ? 3 : canTrain2 > 0 ? 2 : 1
		upgradeLevelLimit = Math.min(upgradeLevelLimit, numTrain)

		let resultsByLevel = []
		let currentLevelEmployees = [employees]

		for (let level = 0; level < upgradeLevelLimit; level++) {
			let nextLevelPossible = new Set()

			for (const e of currentLevelEmployees) {
				const upgraded = oneLevelAbove(e, fromActiveEmployees)
				for (const up of upgraded) {
					// Filter out Movie Stars if one is already owned
					if (hasAnyMovieStar && MOVIE_STARS.has(up)) continue
					nextLevelPossible.add(up)
				}
			}

			// Convert to array and filter by bank availability and unique restrictions
			const validForLevel = Array.from(nextLevelPossible).filter((item) => availabilities[item] > 0 && !forbiddenSet.has(item))

			resultsByLevel.push(validForLevel)
			currentLevelEmployees = Array.from(nextLevelPossible)
		}
		return resultsByLevel
	}

	// --- CASE B: ARRAY OF EMPLOYEES ---
	if (Array.isArray(employees) && employees.length > 0) {
		// Filter out blanks once at the start
		const validEmployees = employees.filter((e) => e !== rf.BLANK_EMPLOYEE_SPACE)
		let combinedResults = []

		for (const e of validEmployees) {
			const upLevels = possibleUpgrades(availabilities, playerIndex, e, numTrain, canTrain2, canTrain3, unlimited, hired, fromActiveEmployees)

			// Merge results by level
			upLevels.forEach((levelArray, i) => {
				if (!combinedResults[i]) {
					combinedResults[i] = [...levelArray]
				} else {
					// Use Set to ensure unique upgrades across different base employees
					const mergedSet = new Set([...combinedResults[i], ...levelArray])
					combinedResults[i] = Array.from(mergedSet)
				}
			})
		}

		// Final check to remove movie stars from the combined top-level result
		if (hasAnyMovieStar) {
			combinedResults = combinedResults.filter((level) => !level.some((item) => MOVIE_STARS.has(item)))
		}

		return combinedResults
	}

	return []
}

export function possibleMarketingCampaigns(availabilities, marketer) {
	// 1. Get the list of allowed campaign types for this specific marketer
	const allowedTypes = allowedCampaigns(marketer)

	// 2. Convert to a Set for O(1) lookup performance
	const allowedSet = new Set(allowedTypes)

	// 3. Filter the availabilities array
	return availabilities.filter((campaignId) => {
		const campaign = rf.MARKETING_CAMPAIGNS[campaignId]
		return campaign && allowedSet.has(campaign.type)
	})
}

export function givePossibleFoodDrinksChoice(employee) {
	if (employee === rf.KITCHEN_TRAINEE) return [rf.BURGER, rf.PIZZA]
	else if (employee === rf.ERRAND_BOY) return [rf.BEER, rf.COKE, rf.LEMONADE]
	// QWERT
	else if (employee === rf.PIZZA_COOK || employee === rf.PIZZA_CHEF) return [rf.PIZZA]
	else if (employee === rf.BURGER_COOK || employee === rf.BURGER_CHEF) return [rf.BURGER]
	else if (employee === rf.SUSHI_COOK || employee === rf.SUSHI_CHEF) return [rf.SUSHI]
	else if (employee === rf.NOODLE_COOK || employee === rf.NOODLE_CHEF) return [rf.NOODLES]
	else if (employee === rf.BARISTA_TRAINEE || employee === rf.BARISTA || employee === rf.LEAD_BARISTA) return [rf.COFFEE]
	else if (employee === rf.DUMPLING_COOK || employee === rf.DUMPLING_CHEF) return [rf.DUMPLING]
	else return []
}

export function availableLobbyistTiles() {
	const store = useModelStore()
	let allTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
	if (store.startingOptions.newDistricts) {
		allTiles.push(20)
		allTiles.push(21)
		allTiles.push(22)
		allTiles.push(23)
		allTiles.push(24)
		if (store.startingOptions.lobbyists) allTiles.push(25)
	}

	let usedTiles = []
	for (let i = 0; i < store.mapData.tiles.length; i += 2) {
		usedTiles.push(store.mapData.tiles[i])
	}

	allTiles = allTiles.filter(function (item) {
		return !usedTiles.includes(item)
	})

	return allTiles
}

export function availableUrbanPlanningTiles() {
	const store = useModelStore()
	let allTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
	if (store.startingOptions.newDistricts) {
		allTiles.push(20)
		allTiles.push(21)
		allTiles.push(22)
		allTiles.push(23)
		allTiles.push(24)
		if (store.startingOptions.lobbyists) allTiles.push(25)
	}

	if (store.players.length === 6) {
		if (!allTiles.includes(20)) allTiles.push(20)
		if (!allTiles.includes(21)) allTiles.push(21)
		if (!allTiles.includes(22)) allTiles.push(22)
		if (!allTiles.includes(23)) allTiles.push(23)
		if (!allTiles.includes(24)) allTiles.push(24)
		if (store.startingOptions.lobbyists && !allTiles.includes(25)) allTiles.push(25)
	}

	let usedTiles = []
	for (let i = 0; i < store.mapData.tiles.length; i += 2) {
		usedTiles.push(store.mapData.tiles[i])
	}

	allTiles = allTiles.filter(function (item) {
		return !usedTiles.includes(item)
	})

	if (allTiles.length === 0) {
		allTiles = [21, 22, 23, 24, 25]
		allTiles = allTiles.filter(function (item) {
			return !usedTiles.includes(item)
		})
	}

	return allTiles
}

export function availableHouses() {
	const store = useModelStore()

	// 1. Return all if no houses are built
	if (store.houses.length === 0) {
		return [...rf.AVAILABLE_HOUSES]
	}

	// 2. Create a Set of built house numbers for O(1) lookups
	const builtHouseNumbers = new Set(store.houses.map((h) => h.number))

	// 3. Filter the global list to find houses not yet in the Set
	return rf.AVAILABLE_HOUSES.filter((houseNum) => !builtHouseNumbers.has(houseNum))
}

export function availableGardens() {
	const store = useModelStore()

	// Simple subtraction from total stock (8)
	return 8 - store.gardens.length
}

export function availableParks() {
	const store = useModelStore()
	if (!store.startingOptions.lobbyists) return []
	let res = [0, 1, 2, 2]
	if (store.parks.length > 0) {
		if (store.parks.some((r) => r.variety === 0))
			res = res.filter(function (item) {
				return item !== 0
			})
		if (store.parks.some((r) => r.variety === 1))
			res = res.filter(function (item) {
				return item !== 1
			})
		let variety2count = 0
		for (let i = 0; i < store.parks.length; i++) if (store.parks[i].variety === 2) variety2count++
		if (variety2count >= 2)
			res = res.filter(function (item) {
				return item !== 2
			})
		//res -= model.parks.length;
	}
	return res
}

export function availableNewRoads() {
	const store = useModelStore()
	if (!store.startingOptions.lobbyists) return []
	let res = [0, 0, 0, 0, 1, 1, 2, 2]
	if (store.newRoads.length > 0) {
		res = []
		let variety0count = 4
		let variety1count = 2
		let variety2count = 2
		for (let i = 0; i < store.newRoads.length; i++) {
			if (store.newRoads[i].variety === 0) variety0count--
			else if (store.newRoads[i].variety === 1) variety1count--
			else if (store.newRoads[i].variety === 2) variety2count--
		}
		for (let j = 0; j < variety0count; j++) res.push(0)
		for (let k = 0; k < variety1count; k++) res.push(1)
		for (let m = 0; m < variety2count; m++) res.push(2)
		//res -= model.newRoads.length;
	}
	return res
}

// Used in dinnertime to break ties
export function getPlaceInFullTurnOrderForPlayer(playerIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
		if (store.gameflow.fullTurnOrder[i] === playerIndex) return i
	}
	return -1
}

export function doDinnerTime(replayOnly) {
	const store = useModelStore()

	const usedFryChefs = new Set() // Stores "houseNum-colour" for O(1) lookup
	const ketchupWinners = []
	const sold = []
	const earnings = new Array(store.players.length).fill(0)
	const coffeeEarnings = new Array(store.players.length).fill(0)
	const histoHouses = []

	const possiblePizzaBomb = store.availableMilestones.includes(rf.FIRST_PIZZA_SOLD)
	const possibleCoffeeMS = store.availableMilestones.includes(rf.FIRST_COFFEE_SOLD)
	if (possibleCoffeeMS) store.coffeeShopMSplayers.splice(0)

	const firstPizzas = []

	// --- PHASE 1: WORK THROUGH NEEDS ---
	const sortedNeeds = [...store.needs].sort((a, b) => a.number - b.number)

	for (const need of sortedNeeds) {
		// [number, needs, historyOfCompetitors]
		let histoH = [need.number, need.needs.map((sub) => (sub.length > 0 ? sub[0] : -1)), []]

		const rangeData = model.giveRestaurantRangesForHouse(need.number)
		const distances = adjustDistanceForMilestones(rangeData, need.needs.length)

		let winningCompetitors = []
		let finalGoods = need.needs.map((x) => x[0])
		const prioritizedNeeds = selectNeedsPriority(finalGoods, model.hasGarden(need.number))

		// Find which tier of needs someone can fulfill
		for (const intermediateNeed of prioritizedNeeds) {
			for (let i = 0; i < store.players.length; i++) {
				const p = store.players[i]
				if (plyr.playerHasResources(i, intermediateNeed) && distances[i] !== -99) {
					const obj = {
						price: plyr.playersPrice(i),
						playerIndex: i,
						distance: distances[i],
						waitress: plyr.numberOfWaitress(i),
						musicians: plyr.numberOfMusicians(i),
						order: getPlaceInFullTurnOrderForPlayer(i),
						emp: p.employees,
					}
					winningCompetitors.push(obj)

					// Re-create the exact histoH[2] structure for UI (providers keyed by colour)
					const competitorLog = [p.colour, obj.price, obj.distance, store.startingOptions.jazzMusicians ? [obj.musicians, obj.waitress] : obj.waitress, obj.order]
					if (store.startingOptions.movieStars) {
						const star = p.employees.includes(rf.B_MOVIE_STAR) ? 1 : p.employees.includes(rf.C_MOVIE_STAR) ? 2 : p.employees.includes(rf.D_MOVIE_STAR) ? 3 : 0
						if (star > 0) competitorLog.push(star)
					}
					histoH[2].push(competitorLog)
				}
			}
			if (winningCompetitors.length > 0) {
				finalGoods = intermediateNeed
				histoH[1] = intermediateNeed
				break
			}
		}

		if (winningCompetitors.length > 0) {
			// Sort by ranking (lowest wins)
			winningCompetitors.sort((a, b) => {
				const getRank = (item) => {
					let r = (item.price + item.distance) * 10000
					if (item.emp.includes(rf.B_MOVIE_STAR)) r -= 5000
					else if (item.emp.includes(rf.C_MOVIE_STAR)) r -= 4000
					else if (item.emp.includes(rf.D_MOVIE_STAR)) r -= 3000
					r += item.musicians * 450 - item.waitress * 10 + item.order
					return r
				}
				return getRank(a) - getRank(b)
			})

			const winner = winningCompetitors[0]
			const winnerColour = store.players[winner.playerIndex].colour

			// Shift history until winner is at the front
			while (histoH[2][0][0] !== winnerColour) {
				histoH[2].push(histoH[2].shift())
			}

			sold.push({ house: need.number, needs: finalGoods, playerIndex: winner.playerIndex, distance: winner.distance })

			// Ketchup Milestone
			if (store.availableMilestones.includes(rf.SOMEONE_SELLS_YOUR_DEMAND)) {
				for (const sub of need.needs) {
					if (sub[1] !== -1 && sub[1] !== winner.playerIndex) {
						ketchupWinners.push(sub[1])
					}
				}
			}

			plyr.removeResourcesFromPlayer(winner.playerIndex, finalGoods)

			// Pizza Bomb tracking
			if (possiblePizzaBomb && firstPizzas.length < 9 && finalGoods.includes(rf.PIZZA)) {
				if (need.number !== rf.RURAL_MARKETING_AREA) firstPizzas.push(1, need.number, winner.playerIndex)
			}
		} else {
			histoH.splice(2) // No one sold
		}

		if (histoH.length > 2 && histoH[2].length === 1) histoH[2][0].splice(2)
		histoHouses.push(histoH)

		// Coffee block must come AFTER the house's regular block,
		// so the history UI can attribute it to the correct house
		if (winningCompetitors.length > 0 && store.startingOptions.coffee && model.getAvailableCoffee(false)) {
			processCoffee(need.number, winningCompetitors[0], usedFryChefs, coffeeEarnings, histoHouses, possibleCoffeeMS)
		}
	}

	// Now sort out Coffee MS - unique and in turn order
	const uniqCoffeeMS = [...new Set(store.coffeeShopMSplayers)].sort((a, b) => store.gameflow.turnOrder.indexOf(a) - store.gameflow.turnOrder.indexOf(b))
	store.coffeeShopMSplayers.splice(0, store.coffeeShopMSplayers.length, ...uniqCoffeeMS)

	// --- PHASE 2: PIZZA BOMB & MILESTONE CLEANUP ---
	finalizeMilestones(firstPizzas, possiblePizzaBomb)

	// --- PHASE 3: CALCULATE FINAL EARNINGS & BONUSES ---
	sold.forEach((sale) => {
		const pIdx = sale.playerIndex
		const p = store.players[pIdx]
		let multiplier = 1
		if (model.hasGarden(sale.house)) multiplier++
		if (model.adjacentToPark(sale.house)) multiplier++

		let price = sale.needs.length * plyr.playersPrice(pIdx) * multiplier
		const bonus = plyr.playerBonus(pIdx, sale.needs)
		price += bonus

		let chefs = p.employees.filter((e) => e === rf.FRY_CHEF).length
		if (usedFryChefs.has(`${sale.house}-${pIdx}`)) chefs = 9 // Already used on coffee

		if (chefs < 9) price += 10 * chefs
		earnings[pIdx] += price

		const houseHisto = histoHouses.find((h) => h[0] === sale.house)
		if (houseHisto) {
			houseHisto.push(bonus)
			const bits = (model.hasGarden(sale.house) ? 1 : 0) + (model.adjacentToPark(sale.house) ? 2 : 0)
			houseHisto.push(bits)
			if (store.startingOptions.fryChefs) houseHisto.push(chefs < 9 ? chefs : 0)
		}
	})

	// Give MS for selling
	sold.forEach((sale) => {
		if (!replayOnly) giveSalesMilestones(sale.playerIndex, sale.needs)
	})

	if (!replayOnly) model.addHistory(rf.HIST_DINNER_TIME, histoHouses, -1, 0)

	// --- PHASE 4: PAYOUTS & BANK BREAK ---
	finalizePayouts(earnings, coffeeEarnings, ketchupWinners, sold, replayOnly)

}

function finalizePayouts(earnings, coffeeEarnings, ketchupWinners, sold, replayOnly) {
	const store = useModelStore()
	const histoIncome = []
	store.players.forEach((p, playerIndex) => {
		const salesIncome = earnings[playerIndex] + (store.startingOptions.coffee ? coffeeEarnings[playerIndex] : 0)
		let total = salesIncome
		const waitressVal = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS) ? 5 : 3

		const waitressInc = plyr.numberOfWaitress(playerIndex) * waitressVal
		const musicianInc = plyr.numberOfMusicians(playerIndex) * 15
		total += waitressInc + musicianInc

		const hI = [salesIncome, store.startingOptions.jazzMusicians ? [plyr.numberOfWaitress(playerIndex), plyr.numberOfMusicians(playerIndex)] : plyr.numberOfWaitress(playerIndex)]

		if (p.employees.includes(rf.CFO) || plyr.hasMilestone(playerIndex, rf.FIRST_100_DOL)) {
			const supplement = Math.ceil(total / 2)
			total += supplement
			hI.push(supplement)
		}

		histoIncome[playerIndex] = hI
		p.money += total
		store.bank -= total

		// Bankruptcy and Milestones
		if (p.money < 0) {
			p.bankrupt = true
			if (p.displayName !== rf.BOT_NAME && !replayOnly) model.addHistory(rf.HIST_BANKRUPT, [], playerIndex, 0)
		}
		if (!replayOnly) {
			if (p.money >= 100) {
				plyr.awardMilestone(playerIndex, rf.FIRST_100_DOL)
				if (p.employees.includes(rf.CFO) && plyr.hasMilestone(playerIndex, rf.FIRST_100_DOL)) {
					plyr.fireEmployee(playerIndex, rf.CFO)
					store.availableEmployees[rf.CFO]++
				}
			}
			if (p.money >= 20) plyr.awardMilestone(playerIndex, rf.FIRST_20_DOL)
			if (p.employees.includes(rf.WAITRESS)) plyr.awardMilestone(playerIndex, rf.FIRST_WAITRESS_USED)
		}

	})

	if (!replayOnly) {
		const hasInc = histoIncome.some((h) => h[0] > 0 || (Array.isArray(h[1]) ? h[1].some((v) => v > 0) : h[1] > 0))
		model.addHistory(rf.HIST_INCOME, hasInc ? histoIncome : [], -1, 0)
	}

	// Award Ketchup MS
	ketchupWinners.forEach((idx) => {
		if (!replayOnly) plyr.awardMilestone(idx, rf.SOMEONE_SELLS_YOUR_DEMAND)
	})

	// Cleanup fulfilled needs
	const served = new Set(sold.map((s) => s.house))
	store.needs = store.needs.filter((need) => !served.has(need.number))

	// End Game / Bank Break
	const numBankrupt = store.players.filter((p) => p.bankrupt).length
	if (numBankrupt === store.players.length) {
		if (!replayOnly) model.addHistory(rf.HIST_TOTAL_BANKRUPT, [], -1, 0)
		if (!replayOnly) model.endGame()
	} else if (numBankrupt === store.players.length - 1) {
		if (!replayOnly) model.addHistory(rf.HIST_ONE_LEFT, [], -1, 0)
		if (!replayOnly) model.endGame()
	} else if (store.bank < 0) {
		handleBankBreak(replayOnly)
	}
}

function finalizeMilestones(firstPizzas, possiblePizzaBomb) {
	const store = useModelStore()
	if (possiblePizzaBomb && firstPizzas.length > 0) {
		let numPizzaBomb = firstPizzas.length / 3
		const numRadios = store.availableMarketingCampaigns.filter((c) => rf.MARKETING_CAMPAIGNS[c].type === rf.RADIO).length

		while (numPizzaBomb > numRadios) {
			firstPizzas.splice(firstPizzas.length - 4, 3)
			numPizzaBomb = firstPizzas.length / 3
		}

		if (firstPizzas.length >= 3) {
			// firstPizzas entries are already playerIndex ([1, house, playerIndex, ...])
			store.firstPizzas = firstPizzas
		}
	}
}

export function processCoffee(houseNum, winner, usedFryChefs, coffeeEarnings, histoHouses, possibleCoffeeMS) {
	const store = useModelStore()
	const winnerIdx = winner.playerIndex
	let coffeeDist = winner.distance
	if (houseNum === rf.RURAL_MARKETING_AREA) coffeeDist--

	if (plyr.hasMilestone(winnerIdx, rf.FIRST_MARKETEER_USED)) coffeeDist += 2
	if (plyr.hasMilestone(winnerIdx, rf.SOMEONE_SELLS_YOUR_DEMAND)) coffeeDist++

	const coffeeInfo = model.getCoffeeRoute(houseNum, winnerIdx, coffeeDist)
	const [salesByIndex, lookedAtSquares, salesLocations] = coffeeInfo

	// --- COFFEE HISTORY BLOCK ---
	let historyForCoffeeHouse = []
	const salesHistObj = [...salesByIndex]
	historyForCoffeeHouse.push([...salesHistObj]) // Index 0: Sales amounts

	// Identify 2x2 restaurant footprints for UI highlighting
	let restoIndexes = []
	let tempSalesLocations = [...salesLocations]
	let found = true
	while (found) {
		found = false
		for (let i = 0; i < tempSalesLocations.length; i++) {
			const sq = tempSalesLocations[i]
			if (tempSalesLocations.includes(sq + 1) && tempSalesLocations.includes(sq + rf.ssW) && tempSalesLocations.includes(sq + rf.ssW + 1)) {
				found = true
				restoIndexes.push(sq)
				const surplus = [sq, sq + 1, sq + rf.ssW, sq + rf.ssW + 1]
				tempSalesLocations = tempSalesLocations.filter((el) => !surplus.includes(el))
				break
			}
		}
	}

	// Group format: [routeSquares, restaurantBaseIndexes, coffeeShopIndexes]
	// Coffee shops are 1x1 leftovers after the 2x2 resto extraction — keep them
	// as singles so More Information can highlight shops that also sold.
	let highlightSqs =
		restoIndexes.length === 0
			? [...lookedAtSquares, ...tempSalesLocations].map((idx) => funcs.exportIndex(idx))
			: [[...lookedAtSquares].map((idx) => funcs.exportIndex(idx)), [...restoIndexes].map((idx) => funcs.exportIndex(idx)), [...tempSalesLocations].map((idx) => funcs.exportIndex(idx))]

	historyForCoffeeHouse.push(highlightSqs) // Index 2: Highlight squares

	// --- REVENUE & MILESTONES ---
	const coffeeSalesData = store.players.map(() => [])
	store.players.forEach((seller, sellerIdx) => {
		const amount = salesByIndex[sellerIdx]
		if (amount > 0) {
			let price = amount * plyr.playersPrice(sellerIdx)
			let multiplier = 1
			if (model.hasGarden(houseNum)) multiplier++
			if (model.adjacentToPark(houseNum)) multiplier++
			price *= multiplier

			const chefs = seller.employees.filter((e) => e === rf.FRY_CHEF).length
			price += 10 * chefs
			coffeeEarnings[sellerIdx] += price

			// Prevent the winning player's fry chefs from also boosting the goods sale
			if (sellerIdx === winnerIdx && chefs > 0) usedFryChefs.add(`${houseNum}-${sellerIdx}`)

			coffeeSalesData[sellerIdx].push(plyr.playersPrice(sellerIdx))
			if (store.startingOptions.fryChefs && chefs > 0) coffeeSalesData[sellerIdx].push(chefs)

			plyr.removeResourcesFromPlayer(sellerIdx, rf.COFFEE, amount)
			plyr.awardMilestone(sellerIdx, rf.FIRST_COFFEE_SOLD)
			if (possibleCoffeeMS) store.coffeeShopMSplayers.push(sellerIdx)
		}
	})

	historyForCoffeeHouse.push(store.players.map((_, i) => coffeeSalesData[i]))
	if (store.startingOptions.coffee && historyForCoffeeHouse.length > 0) {
		histoHouses.push([...historyForCoffeeHouse])
	}
}

export function basePrice() {
	const store = useModelStore()
	let price = 10

	// Only calculate custom price if the bank is broken and Reserve Price option is active
	if (store.startingOptions.reservePrice && store.bankBroken > 0) {
		const reserveCounts = [0, 0, 0]

		// Count occurrences of each card (1, 2, or 3)
		for (const card of store.reserveCards) {
			if (card >= 1 && card <= 3) {
				reserveCounts[card - 1]++
			}
		}

		// Find the highest count
		const maxCount = Math.max(...reserveCounts)

		// Logic check:
		// 1. If Card 3 (index 2) is the most frequent, price is 20
		// 2. Otherwise, if Card 1 (index 0) is the most frequent, price is 5
		if (maxCount === reserveCounts[2]) {
			price = 20
		} else if (maxCount === reserveCounts[0]) {
			price = 5
		}
	}

	return price
}

export function selectNeedsPriority(needs, hasGarden) {
	const store = useModelStore()
	const totalNeeds = []

	// 1. Guard clause: Return early if there are no needs
	if (needs.length === 0) return totalNeeds

	const options = store.startingOptions
	const len = needs.length

	// 2. Prepare specialized needs (Replaces _.fill)
	const sushis = options.sushi && hasGarden ? new Array(len).fill(rf.SUSHI) : []
	const noodles = options.noodles ? new Array(len).fill(rf.NOODLES) : []

	// 3. Construct priority list
	// Kimchi combinations go first
	if (options.kimchi) {
		const k = rf.KIMCHI
		if (sushis.length > 0) totalNeeds.push([k, ...sushis])
		totalNeeds.push([k, ...needs])
		if (noodles.length > 0) totalNeeds.push([k, ...noodles])
	}

	// Standard items follow
	if (sushis.length > 0) totalNeeds.push(sushis)

	totalNeeds.push(needs) // The base need is the default middle-priority

	if (noodles.length > 0) totalNeeds.push(noodles)

	return totalNeeds
}

export function winner(returnIndexOnly) {
	const store = useModelStore()
	// Otherwise, returns the name
	let max = -1
	let winningPerson = "No winner"
	let winningIndex = -1
	for (let i = 0; i < store.gameflow.turnOrder.length; i++) {
		let p = store.players[store.gameflow.turnOrder[i]]
		let m = p.money

		if (m > max && p.bankrupt !== true) {
			max = m
			winningPerson = p.name
			winningIndex = store.gameflow.turnOrder[i]
		}
	}
	if (returnIndexOnly) return winningIndex
	return winningPerson
}

export function salary(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	// Bots should not be paying back into the bank
	//alert(`name: ${player.name} -- displayName: ${player.displayName} -- equalsBot: ${player.displayName === rf.BOT_NAME}`)
	if (playerObj.displayName === rf.BOT_NAME) return 0

	let due = 0
	let unitarySalary = 5

	if (plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED)) {
		unitarySalary = 3
	}

	let paidEmployees = employeesRequiringASalary(playerIndex)

	due = paidEmployees.length * unitarySalary

	if (plyr.hasMilestone(playerIndex, rf.FIRST_TRAIN)) {
		due -= 15
	}

	if (plyr.hasMilestone(playerIndex, rf.FIRST_RECRUITING_GIRL_USED) && plyr.hasEmployee(playerIndex, rf.EXECUTIVE_VICE_PRESIDENT)) {
		due -= unitarySalary
	}

	// Get the TOTAL recruits available
	let totalRecruitingPoitns = getTotalRecruitingPoints(playerIndex)

	// Now remove the USED recruits by searching the history
	let recruitsUsed = 999
	for (let i = store.history.length - 1; i >= 0; i--) {
		if (store.history[i][0] === rf.HIST_HIRE && store.history[i][1] === playerIndex) {
			recruitsUsed = store.history[i][3].length
			break
		}
	}

	// Check for useful leftover recruits and deduct from salary
	let recruitLeft = totalRecruitingPoitns - recruitsUsed
	if (recruitLeft > 0) {
		/*let usefulRecruitPoints = _.reduce(
                player.employees,
                function (total, occ) {
                    if (occ === rf.RECRUITING_MANAGER) return total + 2
                    else if (occ === rf.HR_DIRECTOR) return total + 4
                    else return total
                },
                0
            )*/
		let usefulRecruitPoints = getTotalRecruitDiscountPoints(playerIndex)

		usefulRecruitPoints = Math.min(recruitLeft, usefulRecruitPoints)
		due -= 5 * usefulRecruitPoints
	}

	due = Math.max(due, 0)
	return due
}

export function employeesRequiringASalary(playerIndex) {
	const store = useModelStore()
	const palayerObj = store.players[playerIndex]
	const salarySet = new Set(rf.REQUIRE_SALARY)
	const marketerSet = new Set(rf.MARKETERS)
	const hasFreeMarketers = plyr.hasMilestone(playerIndex, rf.FIRST_BILLBOARD)

	const requiring = []

	// Helper to process a group of employees
	const processList = (list) => {
		for (const emp of list) {
			// An employee requires salary if in REQUIRE_SALARY and not a marketer made free by the billboard milestone
			if (salarySet.has(emp) && (!hasFreeMarketers || !marketerSet.has(emp))) {
				requiring.push(emp)
			}
		}
	}

	// 1. Check active structure and beach
	processList(palayerObj.employees)
	processList(palayerObj.beach)

	// 2. Check marketers currently working on campaigns
	// If we have the billboard milestone, all marketers are free (length check avoided)
	if (!hasFreeMarketers) {
		palayerObj.marketers.forEach((entry, i) => {
			// Ignore the marketer in the additional campaign slot (usually handled elsewhere)
			if (i !== palayerObj.additionalCampaignArrayIndex) {
				const emp = entry.marketer
				if (salarySet.has(emp)) {
					requiring.push(emp)
				}
			}
		})
	}

	return requiring
}

export function doesEmployeeRequireSalary(playerIndex, employee) {
	if (rf.REQUIRE_SALARY.indexOf(employee) === -1) return false
	if (rf.MARKETERS.indexOf(employee) !== -1 && plyr.hasMilestone(playerIndex, rf.FIRST_BILLBOARD)) return false

	return true
}

export function canAffordPayDay(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const due = salary(playerIndex)

	// 1. Check for immediate total affordability
	if (due === 0 || due <= playerObj.money) return true

	// 2. Calculate the "gap" in coverage
	// Milestone reduces the cost of firing an employee from $5 to $3
	const firingPenalty = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
	const unpaidAmount = due - playerObj.money
	const requiredCoverage = Math.ceil(unpaidAmount / firingPenalty)

	// 3. First Beer Sold Milestone Logic
	// Allows paying salary with resources instead of cash (excluding Coffee)
	if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD)) {
		// Count how many non-coffee resources the player has
		const validResourcesCount = playerObj.resources.reduce((acc, item) => {
			return item !== rf.COFFEE ? acc + 1 : acc
		}, 0)

		return requiredCoverage <= validResourcesCount
	}

	return false
}

export function canPayWithFood(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	return plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD) && playerObj.resources.length > 0
}

export function canPayWithMoney(playerIndex, n) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	let unitarySalary = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
	return Math.floor(playerObj.money / unitarySalary) >= n
}

export function paySalaries(foodPayements) {
	const store = useModelStore()
	let histo = []
	console.log(`[PAY] ========== PAYSalaries ========== POV=${store.players[0]?.displayName || '?'}`)
	for (let i = 0; i < store.players.length; i++) {
		let player = store.players[i]
		let foodPayement = foodPayements[i]

		// Add in case of skip payday
		if (plyr.hasEmployee(i, rf.CFO) && plyr.hasMilestone(i, rf.FIRST_100_DOL)) {
			plyr.fireEmployee(i, rf.CFO)
			store.availableEmployees[rf.CFO]++
		}

		let due = salary(i)
		let preMoney = player.money

		if (due >= 20) {
			plyr.awardMilestone(i, rf.FIRST_20_SALARIES)
		}

		if (plyr.hasMilestone(i, rf.FIRST_BEER_SOLD) && foodPayement.length > 0) {
			let unitarySalary = plyr.hasMilestone(i, rf.FIRST_WAITRESS_USED) ? 3 : 5
			due -= unitarySalary * foodPayement.length
			due = Math.max(due, 0)
		}

		//if (!Rules.canAffordPayDay(player) && plyr.hasMilestone(i, FIRST_TRAINER_USED)) {
		if (due > player.money && plyr.hasMilestone(i, rf.FIRST_TRAINER_USED)) {
			store.bank += player.money
			player.money = 0
			if (plyr.hasMilestone(i, rf.FIRST_BEER_SOLD) && player.resources.length > 0) {
				histo.push([due, player.resources.length])
				player.resources = []
			} else histo.push([due])
			console.log(`[PAY] ${player.displayName}: due=${due} PRE=$${preMoney} trainer_bust → money=$${player.money}`)
		} else {
			player.money -= due
			store.bank += due

			if (foodPayement && foodPayement.length > 0) {
				histo.push([due, foodPayement.length])
			} else {
				histo.push([due])
			}
			console.log(`[PAY] ${player.displayName}: due=${due} PRE=$${preMoney} → money=$${player.money}`)
		}
	}
	let anySalary = false
	for (let i = 0; i < histo.length; i++) {
		if (histo[i][0] > 0 || (histo[i].length > 1 && histo[i][1] > 0)) {
			anySalary = true
			break
		}
	}
	if (!anySalary) histo.splice(0)
	return histo
}

export function fireableEmployees(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const salarySet = new Set(rf.REQUIRE_SALARY)
	const employees = playerObj.employees
	const beach = playerObj.beach

	// 1. If player is solvent, they can fire anyone
	if (canAffordPayDay(playerIndex)) {
		return [...employees, ...beach]
	}

	// 2. If insolvent, check if specific marketers MUST be fired first
	const marketersToFire = marketersNeedingFiring(playerIndex)

	if (marketersToFire.length > 0) {
		// Filter out any employees who require a salary (must keep unpaid ones)
		// Replaces _.filter + indexOf
		const freeEmployees = employees.filter((e) => !salarySet.has(e))
		const freeBeach = beach.filter((e) => !salarySet.has(e))

		return [...freeEmployees, ...freeBeach, ...marketersToFire]
	}

	// 3. Fallback: return all if no specific marketers are flagged
	return [...employees, ...beach]
}

export function needFiringMarketers(playerIndex) {
	return marketersNeedingFiring(playerIndex).length > 0
}

export function marketersNeedingFiring(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const salarySet = new Set(rf.REQUIRE_SALARY)

	// 1. Check for immediate total affordability or free marketers
	// If the player has the Billboard or Trainer milestone, marketers usually don't need firing logic here
	if (canAffordPayDay(playerIndex) || plyr.hasMilestone(playerIndex, rf.FIRST_BILLBOARD) || plyr.hasMilestone(playerIndex, rf.FIRST_TRAINER_USED)) {
		return []
	}

	// 2. Calculate the "Debt Gap" (how many employees must be fired)
	const penalty = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
	const currentSalary = salary(playerIndex)
	const availableCash = Math.max(0, playerObj.money)

	let numToFire = Math.floor(currentSalary / penalty) - Math.floor(availableCash / penalty)

	// Beer Milestone allows paying with resources
	if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD)) {
		numToFire -= playerObj.resources.length
	}

	// If no one needs to be fired, exit early
	if (numToFire <= 0) return []

	// 3. Count paid staff on Beach and in active structure
	const countPaid = (list) => {
		let count = 0
		for (const emp of list) {
			if (salarySet.has(emp)) count++
		}
		return count
	}

	let totalPaidStaff = countPaid(playerObj.beach) + countPaid(playerObj.employees)

	// Milestone: Executive Vice President can sometimes save one paid slot
	if (plyr.hasMilestone(playerIndex, rf.FIRST_RECRUITING_GIRL_USED) && plyr.hasEmployee(playerIndex, rf.EXECUTIVE_VICE_PRESIDENT)) {
		totalPaidStaff--
	}

	// 4. Identify Marketers to fire only if other staff cannot cover the debt
	const result = []
	if (numToFire > totalPaidStaff && playerObj.marketers.length > 0) {
		playerObj.marketers.forEach((entry, i) => {
			const emp = entry.marketer
			// Ignore the marketer in the additional campaign slot
			if (i !== playerObj.additionalCampaignArrayIndex && salarySet.has(emp)) {
				result.push(emp)
			}
		})
	}

	return result
}

export function numPayNeeded(playerIndex) {
	let unitarySalary = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
	let due = salary(playerIndex)
	return Math.ceil(due / unitarySalary)
}

export function payingWithGoodsRequireAction(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	// 1. Return false immediately if the player cannot pay with resources
	if (!plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD)) return false

	const penalty = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
	const unpaidStaffCount = employeesRequiringASalary(playerIndex).length

	// 2. Calculate if the player has more payment options than debt
	// (Cash coverage + Resource count)
	const cashSlots = Math.floor(playerObj.money / penalty)
	const totalPaymentOptions = cashSlots + playerObj.resources.length

	// 3. If they have more options than debt, they must CHOOSE which to use.
	// However, if all resources are identical, no choice is required.
	if (totalPaymentOptions > unpaidStaffCount) {
		// Use a Set to check for multiple resource types (more than 1 unique item)
		const uniqueResourceCount = new Set(playerObj.resources).size
		return uniqueResourceCount > 1
	}

	return false
}

export function housesAffectedByMarketingCampaign(campaign) {
	const store = useModelStore()
	const campaignData = rf.MARKETING_CAMPAIGNS[campaign.number]
	const affectedHouses = new Set()
	const affectedArea = []

	// 1. Determine the affected area based on Campaign Type
	switch (campaignData.type) {
		case rf.BILLBOARD: {
			let w = campaign.rotated ? campaignData.height : campaignData.width
			let h = campaign.rotated ? campaignData.width : campaignData.height
			// Get neighbors of the billboard's footprint
			affectedArea.push(...map.neighbours(map.giveAllSpaceForAToken(campaign.index, w, h)))
			break
		}

		case rf.MAIL:
			affectedArea.push(...map.areaNotRoad(campaign.index))
			break

		case rf.AIRPLANE: {
			const [cX, cY] = map.giveCoord(campaign.index)
			const size = campaign.number === 4 ? campaignData.height : campaignData.width

			if (campaign.rotated) {
				// Horizontal flight path across the entire map width
				for (let i = 0; i < size; i++) {
					for (let x = 0; x < rf.ssW; x++) {
						affectedArea.push(map.giveIndex(x, cY + i))
					}
				}
			} else {
				// Vertical flight path across the entire map height
				for (let i = 0; i < size; i++) {
					for (let y = 0; y < rf.ssH; y++) {
						affectedArea.push(map.giveIndex(cX + i, y))
					}
				}
			}
			break
		}

		case rf.RADIO: {
			const centerTile = map.giveTileNumber(campaign.index)
			const tiles = [...map.giveAdjacentTiles(centerTile, true), centerTile]

			for (const tileId of tiles) {
				for (let j = 0; j < 25; j++) {
					affectedArea.push(map.giveIndexForCoordsInTile(tileId, j % 5, Math.floor(j / 5)))
				}
			}
			break
		}

		case rf.GOURMET_GUIDE:
			model.giveHousesWithGarden().forEach((h) => affectedHouses.add(h))
			break

		case rf.HAWKER_TRUCK:
			model.getHousesAffectedByHawkerTruck(campaign.number).forEach((h) => affectedHouses.add(h))
			break
	}

	// 2. Identify houses within the affected area
	for (const space of affectedArea) {
		const tileValue = store.mapData.coords[space]

		// Standard House Check (House IDs are usually base + offset)
		if (tileValue > rf.HOUSE && tileValue < rf.HOUSE + 29) {
			let houseId
			if (Number.isInteger(tileValue)) {
				houseId = tileValue - rf.HOUSE
			} else {
				// Handle floating point IDs if necessary
				houseId = Math.round((tileValue - rf.HOUSE + Number.EPSILON) * 100) / 100
			}
			affectedHouses.add(houseId)
		}
		// Garden Check (Gardens trigger the house they are attached to)
		else if (tileValue === rf.GARDEN) {
			const houseFromGarden = model.houseForThisGarden(space)
			if (houseFromGarden > -1) {
				affectedHouses.add(houseFromGarden)
			}
		}
	}

	return Array.from(affectedHouses)
}

// PHASE_MARKETING_CAMPAIGNS -- fire off marketing campaigns
export function doMarketingCampaigns(replayOnly) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		plyr.recallMassMarketeers(i)
	}

	let totalMassMarketers = 0
	if (!replayOnly) {
		totalMassMarketers = store.players.reduce((acc, p) => acc + p.employees.filter((x) => x === rf.MASS_MARKETEER).length, 0)
	}

	// Phase Loop (Runs once normally, or multiple times for Mass Marketers)
	for (let mmLoop = totalMassMarketers; mmLoop >= 0; mmLoop--) {
		// Sort campaigns by number
		const sortedCampaigns = [...store.campaigns].sort((a, b) => a.number - b.number)

		const histObj = []
		const earnedByPlayers = []

		for (const campaign of sortedCampaigns) {
			const affectedHouses = housesAffectedByMarketingCampaign(campaign)
			const playerIndex = model.findPlayerForCampaign(campaign.number)
			const player = playerIndex === -1 ? -1 : store.players[playerIndex]
			// No owning marketer (e.g. the free radio from the First Pizza Sold milestone) -
			// the campaign still markets, just without a player attribution.
			const isRadio = rf.MARKETING_CAMPAIGNS[campaign.number].type === rf.RADIO
			const isAirplane = rf.MARKETING_CAMPAIGNS[campaign.number].type === rf.AIRPLANE

			let good1 = campaign.good
			let good2 = -1

			// Milestone: Radio double marketing
			if (player !== -1 && plyr.hasMilestone(playerIndex, rf.FIRST_RADIO_CAMPAIGN) && isRadio) {
				good2 = campaign.good
			}

			// Milestone: Brand Manager additional good
			if (player !== -1 && plyr.hasMilestone(playerIndex, rf.FIRST_BRAND_MANAGER_USED) && isAirplane && player.additionalMarketedGood?.[0] === campaign.number) {
				good2 = campaign.good
				good1 = player.additionalMarketedGood[1]
			}

			const h1 = [campaign.number, [], good1]
			const h2 = good2 !== -1 ? [campaign.number, [], good2] : null
			const hDumpling = [campaign.number, [], rf.DUMPLING]

			for (const houseId of affectedHouses) {
				const isApt = rf.APARTMENTS.includes(houseId)
				const limit = model.hasGarden(houseId) ? 5 : 3
				const isInfiniteHouse = houseId === 3.2 || houseId === 9.7

				const tryAddNeed = (good, history) => {
					const needs = store.needs.find((n) => n.number === houseId)
					if (isInfiniteHouse || (needs?.needs.length || 0) < limit) {
						model.addNeedToHouse(good, houseId, playerIndex)
						if (isApt) model.addNeedToHouse(good, houseId, playerIndex)

						const reward = rewardMarketingOnHouse(playerIndex, houseId)
						if (reward > 0) earnedByPlayers.push([houseId, reward, playerIndex])
						history[1].push(houseId)
						return true
					}
					return false
				}

				// Standard Good 1
				tryAddNeed(good1, h1)

				// Standard Good 2
				if (h2) tryAddNeed(good2, h2)

				// Expansion: Dumplings
				if (store.startingOptions.dumplings) tryAddNeed(rf.DUMPLING, hDumpling)
			}

			// Rural Marketing Logic (Campaigns 21-24)
			if (campaign.number >= 21 && campaign.number <= 24) {
				const houseId = rf.RURAL_MARKETING_AREA
				model.addNeedToHouse(good1, houseId, playerIndex)
				model.addNeedToHouse(good1, houseId, playerIndex)
				const reward = rewardMarketingOnHouse(playerIndex, houseId)
				if (reward > 0) earnedByPlayers.push([houseId, reward, playerIndex])
				h1[1].push(houseId)
			}

			histObj.push(h1)
			if (h2) histObj.push(h2)
			if (hDumpling[1].length > 0) histObj.push(hDumpling)

			// Cleanup: Expire or decrement campaign duration
			if (mmLoop === 0) {
				if (campaign.duration === 1) {
					model.removeMarketingCampaign(campaign.number)
					for (let i = 0; i < store.players.length; i++) {
						plyr.recallMarketeer(i, campaign.number)
					}
				} else if (campaign.duration < 9) {
					campaign.duration--
				}
			}
		}

		// Finalize Earnings & Log
		processEarnings(earnedByPlayers, histObj, mmLoop, totalMassMarketers, replayOnly)
	}
}

/**
 * Helper for Bank Break and Payout Logic
 */
function processEarnings(earnedByPlayers, currentHist, mmLoop, totalMM, replayOnly) {
	const store = useModelStore()
	if (currentHist.length > 0 && !replayOnly) {
		if (totalMM > 0 && totalMM - mmLoop > 0) currentHist.push(totalMM - mmLoop)
		model.addHistory(rf.HIST_MARKETING_CAMPAIGN_PHASE, [...currentHist], -1, 0)
	}

	if (earnedByPlayers.length === 0) return

	const earningsByPlayerIndex = Array.from({ length: store.players.length }, () => [[], 0]) // [houses, totalAmount]

	for (const [house, amount, pIdx] of earnedByPlayers) {
		earningsByPlayerIndex[pIdx][1] += amount
		earningsByPlayerIndex[pIdx][0].push(house)
	}

	store.players.forEach((playerObj, playerIndex) => {
		const [houses, rawAmount] = earningsByPlayerIndex[playerIndex]
		if (houses.length === 0) return

		let finalAmount = rawAmount
		if (plyr.hasMilestone(playerIndex, rf.FIRST_100_DOL) || playerObj.employees.includes(rf.CFO)) {
			finalAmount = Math.ceil(rawAmount * 1.5)
		}

		playerObj.money += finalAmount
		store.bank -= finalAmount
	})

	// Log marketing earnings history
	if (!replayOnly) {
		const histObj = earningsByPlayerIndex.map((e) => e[0].length > 0 ? e : [])
		model.addHistory(rf.HIST_MARKETING_EARNING, histObj, -1, 0)
	}

	// Bank Break Logic
	if (store.bank < 0 && !store.startingOptions.shortGame && store.bankBroken === 0) {
		handleBankBreak()
	}
}

function handleBankBreak(replayOnly) {
	const store = useModelStore()

	if (store.startingOptions.shortGame) {
		if (!replayOnly) model.endGame()
		return
	}

	if (store.bankBroken === 0) {
		store.bankBroken = 1

		if (!replayOnly) model.addHistory(rf.HIST_DISPLAY_RESERVE, store.reserveCards.filter((card) => card !== -1), -1, 0)

		const reserve = [0, 0, 0]
		let total = 0

		store.reserveCards.forEach((card) => {
			if (card === -1) return
			total += card * 100
			reserve[card - 1]++
		})

		const maxVal = Math.max(...reserve)
		store.ceoLevel = reserve.lastIndexOf(maxVal) + 2

		if (store.startingOptions.reservePrice) {
			total = 200 * store.reserveCards.length
			store.ceoLevel = 3
		}

		if (!replayOnly) store.bank += total
		store.players.forEach((p, i) => (p.ceoSlots = plyr.hasMilestone(i, rf.FIRST_BURGER_SOLD) ? 4 : store.ceoLevel))
		if (!replayOnly) model.addHistory(rf.HIST_BANK_BREAK, [total], -1, 0)

		if (store.bank < 0) {
			if (!replayOnly) model.endGame()
		}
	} else {
		if (!replayOnly) model.endGame()
	}
}

// This is used in C.canSkipCurrentPlayer
export function isRequiredToPlayCleanUp(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	funcs.removeItemAll(playerObj.resources, rf.COFFEE)
	if (playerObj.resources.length === 0) return false

	if (playerObj.name === rf.BOT_NAME) {
		playerObj.resources.splice(0)
		return false
	}

	// Action EOD fridge skip
	if (playerObj.resources.length <= 10 && playerObj.autoFridge === 1) {
		if (kimchiFridgeCollision(playerIndex)) return true
		return false
	}

	if (plyr.hasFridge(playerIndex) && playerObj.resources.length > 0) {
		// Rule change to allow throwing away all food
		return kimchiFridgeCollision(playerIndex) || playerObj.resources.length > 0
	}
	return false
}

export function autoProcessCleanUp(playerIndex) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	// ASSUME A SKIP IS DEFINITELY POSSIBLE
	if (!plyr.hasFridge(playerIndex)) {
		if (playerObj.resources.length > 0) {
			plyr.awardMilestone(playerIndex, rf.FIRST_THROW_AWAY)
		}
		playerObj.resources = []
	}
}

export function kimchiFridgeCollision(playerIndex) {
	const store = useModelStore()
	// 1. Resolve player object (accepts index or object)
	const playerObj = store.players[playerIndex]

	// 2. Early exit for performance
	if (!plyr.hasFridge(playerIndex) || playerObj.resources.length === 0 || !store.startingOptions.kimchi) {
		return false
	}

	// 3. Check for multiple resource types including Kimchi
	// Set automatically handles uniqueness and has O(1) lookups
	const distinctSet = new Set(playerObj.resources.filter((r) => r !== rf.COFFEE))

	return distinctSet.has(rf.KIMCHI) && distinctSet.size > 1
}

export function giveMarketingMilestones(playerIndex, marketer) {
	switch (marketer) {
		case rf.MARKETING_TRAINEE:
			plyr.awardMilestone(playerIndex, rf.FIRST_MARKETEER_USED)
			plyr.awardMilestone(playerIndex, rf.FIRST_MARKETING_TRAINEE_USED)
			break
		case rf.CAMPAIGN_MANAGER:
			plyr.awardMilestone(playerIndex, rf.FIRST_MARKETEER_USED)
			plyr.awardMilestone(playerIndex, rf.FIRST_CAMPAIGN_MANAGER_USED)
			break
		/*case BRAND_MANAGER:
                model.giveMilestone(FIRST_MARKETEER_USED, player);
                model.giveMilestone(FIRST_BRAND_MANAGER_USED, player);
                break;*/
		/*case BRAND_DIRECTOR:
                model.giveMilestone(FIRST_MARKETEER_USED, player);
                model.giveMilestone(FIRST_BRAND_DIRECTOR_USED, player);
                break;*/
	}
}

export function giveSalesMilestones(playerIndex, needs) {
	if (needs.indexOf(rf.BURGER) > -1) {
		plyr.awardMilestone(playerIndex, rf.FIRST_BURGER_SOLD)
	}
	if (needs.indexOf(rf.PIZZA) > -1) {
		plyr.awardMilestone(playerIndex, rf.FIRST_PIZZA_SOLD)
	}
	if (needs.indexOf(rf.LEMONADE) > -1) {
		plyr.awardMilestone(playerIndex, rf.FIRST_LEMONADE_SOLD)
	}
	if (needs.indexOf(rf.BEER) > -1) {
		plyr.awardMilestone(playerIndex, rf.FIRST_BEER_SOLD)
	}
	if (needs.indexOf(rf.COKE) > -1) {
		plyr.awardMilestone(playerIndex, rf.FIRST_COKE_SOLD)
	}
	if (needs.indexOf(rf.DUMPLING) > -1) {
		plyr.awardMilestone(playerIndex, rf.FIRST_DUMPLING_SOLD)
	}
}

function rewardMarketingOnHouse(playerIndex, house) {
	if (playerIndex === -1) return 0
	let total = 0
	if (plyr.hasMilestone(playerIndex, rf.FIRST_MARKETEER_USED)) {
		total = 5
	}
	if (rf.APARTMENTS.includes(house)) total *= 2
	if (house === rf.RURAL_MARKETING_AREA) total *= 2
	return total
}

export function adjustDistanceForMilestones(distances, numItems) {
	const store = useModelStore()

	// distances is keyed by playerIndex (index into store.players); -99 = unreachable
	for (const [playerIndex, _player] of store.players.entries()) {
		let dist = distances[playerIndex]

		// 2. Skip if this player can't reach the house
		if (dist === -99) continue

		// 3. Marketer Milestone: -2 distance
		if (plyr.hasMilestone(playerIndex, rf.FIRST_MARKETEER_USED)) {
			dist -= 2
		}

		// 4. Demand Sold Milestone: -1 distance
		if (plyr.hasMilestone(playerIndex, rf.SOMEONE_SELLS_YOUR_DEMAND)) {
			dist -= 1
		}

		// 5. Delivery Driver: Set distance to 0 if carrying 2+ items
		if (numItems >= 2 && plyr.playerHasEmployeeAtWork(playerIndex, rf.DELIVERY_DRIVER)) {
			if (dist > 0) dist = 0
		}

		// 6. Update the original array
		distances[playerIndex] = dist
	}

	return distances
}

export function enforceDiscountMilestone(playerIndex, replayOnly) {
	const store = useModelStore()

	if (plyr.hasMilestone(playerIndex, rf.FIRST_DISCOUNT_MANAGER_USED) && plyr.purePriceDropFromDiscountersForPlayer(playerIndex) >= 3) {
		store.bank -= 100
		if (!replayOnly) model.addHistory(rf.HIST_DISCOUNT_MILESTONE, [], playerIndex, 0)
	}
}

// Pizza BOMB LOCATIONS
export function givePossiblePositionsForRadioPizzaBomb(houseNumber) {
	const store = useModelStore()
	const mapWidth = rf.ssW
	const tileSet = new Set()

	// 1. Resolve House or Apartment Object
	const isApartment = houseNumber === 3.2 || houseNumber === 9.7
	const house = isApartment ? model.findApartment(houseNumber) : model.findHouse(houseNumber)

	if (!house) return []

	// 2. Identify all small square indexes occupied by the house
	const occupiedIndexes = [house.index, house.index + 1, house.index + mapWidth, house.index + 1 + mapWidth]

	// Add Garden/Expansion tiles
	if (house.natural === true) {
		if (model.hasGarden(houseNumber)) {
			const garden = store.gardens.find((g) => g.house === houseNumber)
			if (garden) {
				occupiedIndexes.push(garden.index)
				occupiedIndexes.push(garden.rotated ? garden.index + mapWidth : garden.index + 1)
			}
		}
	} else if (model.hasGarden(houseNumber)) {
		// Handle non-natural house garden placement (landscape only for rot 1/3)
		if (house.rotated === 1 || house.rotated === 3 || house.rotated === true) {
			occupiedIndexes.push(house.index + 2, house.index + mapWidth + 2)
		} else {
			occupiedIndexes.push(house.index + 2 * mapWidth, house.index + 2 * mapWidth + 1)
		}
	}

	// 3. Convert square indexes to unique Tile Numbers
	for (const idx of occupiedIndexes) {
		tileSet.add(map.giveTileNumber(idx))
	}

	// 4. Gather all empty indexes within those tiles (Replaces map/flatten/uniq)
	const result = []
	for (const tileId of tileSet) {
		const emptySpaces = map.giveEmptyIndexesInTile(tileId)
		result.push(...emptySpaces)
	}

	return result
}

export function firstRadioCampaign() {
	const store = useModelStore()
	// 1. Filter for radio types
	const radioCampaigns = store.availableMarketingCampaigns.filter((c) => rf.MARKETING_CAMPAIGNS[c].type === rf.RADIO)

	// 2. If no campaigns found, return -1 early
	if (radioCampaigns.length === 0) return -1

	// 3. Find the lowest ID
	return Math.min(...radioCampaigns)
}
