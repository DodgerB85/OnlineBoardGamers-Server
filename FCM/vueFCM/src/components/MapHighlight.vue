<script setup>
import * as rf from "../js/FCMreference"
import * as map from "../js/FCMmap"
import * as view from "../js/FCMview"
import * as model from "../js/FCMmodel"
import * as controller from "../js/FCMcontroller"
import * as context from "../js/FCMcontext"
import * as rules from "../js/FCMrules"
import { ref, computed, watch } from "vue"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

const ghostImgRef = ref(null)
const ghostDivRef = ref(null)
const ghostHouseNumberRef = ref(null)
const lastPreviewTile = ref(-1)
const ghostRoadworkIndexes = ref([])

// changeGhost early-returns when hovering the same square, so a rotation
// change while the mouse is still would leave a stale ghost — re-show it
watch(() => store.context.rotation, () => {
	if (store.gameflow.subphase === rf.SUBPHASE_HOUSES && store.context.selectedBuilding !== -1 && store.viewSettings.currentGhostIndex != null) {
		showHouseGhost(store.viewSettings.currentGhostIndex)
	}
})

const canShowHighlights = computed(() => {
	if (!personal.canPlay()) return false
	// Training games are hotseat: the current player may be a SHADOW seat
	if (!controller.isSimulPhase(store.gameflow.phase) && personal.pov !== controller.currentPlayerIndex() && !personal.trainingGame) return false
	return true
})

// Square highlight layers - identical rendering, differing only in source list
// and CSS class (history, coffee route, path, preview, drinks, houses).
const squareHighlightLayers = computed(() => [
	{ list: store.historyHelpers.indexesToHighlightYellow, cls: "higlightSquareHistory", key: "h" },
	{ list: store.historyHelpers.coffeeRouteSquaresToHighlight, cls: "higlightSquareHistoryCoffee", key: "coffee" },
	{ list: store.highlights.indexesToHighlightPath, cls: "higlightSquarePath", key: "path" },
	{ list: store.highlights.indexesToHighlightPreview, cls: "higlightSquarePreview", key: "preview" },
	{ list: store.highlights.indexesToHighlightDrinks, cls: "higlightSquareDrinks", key: "drinks" },
	{ list: store.highlights.indexesToHighlightHouses, cls: "higlightSquareHouses", key: "houses" },
])

// Freeway placement highlights: precompute x/y for the whole batch with a single
// getUsedRowCol() scan, so the template no longer calls getXYforSmallSquare per element.
const freewayHighlights = computed(() => {
	const used = map.getUsedRowCol()
	return store.highlights.indexesToHighlightYellow.map((index) => {
		const [x, y] = view.getXYforSmallSquare(index, used)
		return { index, x, y }
	})
})

function clickedOnSquare(index) {
	ghostImgRef.value.style.display = "none"
	ghostDivRef.value.style.display = "none"
	ghostRoadworkIndexes.value = []
	store.clearMessages()
	store.clearCoffeeHistoryInfo()

	if (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) {
		model.addRestaurant(controller.currentPlayerIndex(), index, store.context.rotation, true)
		context.resetContextAndHighlights()
		store.context.action = rf.ACT_CONFORM_END_TURN
	} else if (store.gameflow.phase === rf.PHASE_PIZZA_BOMB) {
		controller.choosePizzaBombMarketer(index)
	} else if (store.gameflow.phase === rf.PHASE_COFFE_SHOP_MS) {
		if (store.context.coffeeShopMSAction === "remove") controller.removeCoffeeShop(index)
		else controller.placeCoffeeShopMS(index)
	} else if (store.gameflow.subphase === rf.SUBPHASE_MARKETING && store.context.marketer > -1 && store.context.campaign > -1 && store.context.campaign <= 16) {
		controller.placeMarketingCampaign(index)
	} else if (store.gameflow.subphase === rf.SUBPHASE_MARKETING && store.context.hawkerRouteActive) {
		controller.selectHawkerRoutePosition(index)
	} else if (store.context.action === rf.ACT_PLACE_FREEWAY) {
		controller.placeFreeway(index)
	} else if (store.gameflow.subphase === rf.SUBPHASE_PRODUCE && [rf.CART_OPERATOR, rf.TRUCK_DRIVER, rf.ZEPPELIN_PILOT].includes(store.context.producer)) {
		lastPreviewTile.value = -1
		if (store.context.producer === rf.ZEPPELIN_PILOT) controller.selectNextTile(map.giveTileNumber(index))
		else controller.selectNextPosition(index)
	} else if (store.gameflow.subphase === rf.SUBPHASE_HOUSES) {
		controller.clickedHouseSquare(index)
	} else if (store.gameflow.subphase === rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN) {
		if (store.context.coffeeShopAction === "remove") controller.removeCoffeeShop(index)
		else controller.placeCoffeeShop(index)
	} else if (store.gameflow.subphase === rf.SUBPHASE_LOBBYISTS) {
		if (store.context.lobbyistMilestoneActive) controller.clickedNewTileSquare(index)
		else controller.clickedLobbyistSquare(index)
	} else if (store.gameflow.subphase === rf.SUBPHASE_NEW_RESTAURANTS) {
		if (store.context.restaurantMilestone) controller.placeMailboxRestaurantMilestone(index)
		else if (store.context.newRestaurantAction === "move") controller.removeRestaurantForMove(index)
		else if (store.context.newRestaurantAction === "create") controller.chooseRestaurantPositionForWorking(index)
	}
}

// Whole-tile click (zeppelin options)
function clickedOnTile(tile) {
	lastPreviewTile.value = -1
	controller.selectNextTile(tile)
}

// Whole-tile hover preview (zeppelin options)
function hoverTile(tile) {
	controller.setDrivingPreview(map.giveStartingIndexForTile(tile))
}

function unhoverTile() {
	controller.clearDrivingPreview()
}

function tileStyle(tile) {
	const [x, y] = view.getXYforSmallSquare(map.giveStartingIndexForTile(tile))
	return {
		width: store.refSize + "px",
		height: store.refSize + "px",
		top: y + "px",
		left: x + "px",
	}
}

// Ghost preview of the house being placed
function showHouseGhost(index) {
	const sqSize = store.refSize / 5
	const [x, y] = view.getXYforSmallSquare(index)
	const rotation = store.context.rotation
	let adjustedX = x
	let adjustedY = y
	if (rotation === 1 || rotation === 3) {
		adjustedX += 0.5 * sqSize
		adjustedY -= 0.5 * sqSize
	}

	const img = ghostImgRef.value
	img.src = view.getImage("house_garden")
	img.style.display = "block"
	img.style.transform = `rotate(${(rotation % 4) * 90}deg)`
	img.style.transformOrigin = "center center"
	img.style.opacity = "0.5"
	img.style.borderWidth = "0px"
	img.style.top = adjustedY + "px"
	img.style.left = adjustedX + "px"
	img.style.width = 2 * sqSize + "px"
	img.style.height = "auto"

	// House number
	let numX = adjustedX
	let numY = adjustedY
	let numClass = ""
	if (rotation === 1 || rotation === 3) {
		if (rotation === 1) {
			numClass = "r1"
			numX += sqSize / 2
			numY += store.refSize / 3
		} else {
			numX += sqSize / 2 - 2 * sqSize
			numY += store.refSize / 3
			numClass = "r3"
		}
	}
	if (rotation === 2) numY += 2 * sqSize + store.refSize / 50
	const fontSize = (store.refSize / 200) * 1.25

	const number = ghostHouseNumberRef.value
	number.textContent = store.context.selectedBuilding
	number.style.display = "block"
	number.className = "ghostHouseNumber " + numClass
	number.style.left = numX + store.refSize / 3.7 + "px"
	number.style.top = numY + store.refSize / 50 + "px"
	number.style.fontSize = fontSize + "em"
}

// Ghost preview of where the garden will go
function showGardenGhost(index) {
	const sqSize = store.refSize / 5
	const img = ghostImgRef.value

	let houseIndex = index
	let edge
	if (store.context.edges.length > 0) {
		// Hovering an edge option (house already selected)
		houseIndex = store.context.houseIndex
		edge = map.giveEdgeForIndex(index, store.context.houseIndex)
	} else {
		// Hovering a house in the initial garden phase: the edge is relative to the house anchor
		const houseNumber = store.mapData.coords[index] - rf.HOUSE
		houseIndex = map.findIndexForHouse(houseNumber)
		const edges = map.findFreeEdgesForHouse(houseNumber)
		if (edges.length !== 1) {
			// More than one option: no ghost until that house is selected
			img.style.display = "none"
			if (ghostHouseNumberRef.value) ghostHouseNumberRef.value.style.display = "none"
			return
		}
		edge = edges[0]
	}

	const [adjustedX, adjustedY] = view.getXYforSmallSquare(map.giveIndexForEdge(edge, houseIndex))
	const rotated = edge === 1 || edge === 3
	const posX = rotated ? adjustedX - 0.5 * sqSize : adjustedX
	const posY = rotated ? adjustedY + 0.5 * sqSize : adjustedY

	img.src = view.getImage("garden")
	img.style.display = "block"
	img.style.transform = rotated ? "rotate(90deg)" : "rotate(0deg)"
	img.style.transformOrigin = "center center"
	img.style.opacity = "0.5"
	img.style.borderWidth = "0px"
	img.style.top = posY + "px"
	img.style.left = posX + "px"
	img.style.width = 2 * sqSize + "px"
	img.style.height = "auto"

	if (ghostHouseNumberRef.value) ghostHouseNumberRef.value.style.display = "none"
}

// Compute which adjacent existing roads would get roadwork markers if a road
// were placed at the given index. Mirrors the logic in FCMmap.addNewRoad().
function computePotentialRoadworkIndexes(index, variety, rotation) {
	const result = []
	if (store.context.buildingType !== 0) return result
	const tW = store.mapData.dimensions[0] * 5
	if (variety !== 2) {
		const sqw = variety === 1 ? 4 : 2
		if (rotation === 0) {
			if (store.mapData.coords[index - 1] === rf.ROAD) result.push(index - 1)
			if (store.mapData.coords[index + sqw] === rf.ROAD) result.push(index + sqw)
		} else if (rotation === 1) {
			if (store.mapData.coords[index - tW] === rf.ROAD) result.push(index - tW)
			if (store.mapData.coords[index + tW * sqw] === rf.ROAD) result.push(index + tW * sqw)
		}
	} else {
		if (rotation === 0 && store.mapData.coords[index + 2] === rf.ROAD) result.push(index + 2)
		if (rotation === 0 && store.mapData.coords[index + tW * 2] === rf.ROAD) result.push(index + tW * 2)
		if (rotation === 1 && store.mapData.coords[index - 1] === rf.ROAD) result.push(index - 1)
		if (rotation === 1 && store.mapData.coords[index + tW * 2 + 1] === rf.ROAD) result.push(index + tW * 2 + 1)
		if (rotation === 2 && store.mapData.coords[index - 1 - tW + 1] === rf.ROAD) result.push(index - 1 - tW + 1)
		if (rotation === 2 && store.mapData.coords[index - 1 + tW - 1] === rf.ROAD) result.push(index - 1 + tW - 1)
		if (rotation === 3 && store.mapData.coords[index - tW] === rf.ROAD) result.push(index - tW)
		if (rotation === 3 && store.mapData.coords[index + tW + 2] === rf.ROAD) result.push(index + tW + 2)
	}
	return result
}

// Ghost preview for lobbyist-placed roads/parks
function showLobbyistGhost(index) {
	const img = ghostImgRef.value
	if (!img) return
	const sqSize = store.refSize / 5
	const [x, y] = view.getXYforSmallSquare(index)
	const bType = store.context.buildingType
	const v = store.context.variety
	const rot = store.context.rotation

	let imgSrc = ""
	let width = 2 * sqSize
	//let height = sqSize

	if (bType === 0) {
		// Road - under construction image (placed on current turn)
		imgSrc = view.getImage("road_" + v + "_UC")
		if (v === 0) {
			width = 2 * sqSize
			//height = sqSize
		} else if (v === 1) {
			width = 4 * sqSize
			//height = sqSize
		} else {
			width = 2 * sqSize
			//height = 2 * sqSize
		}
	} else {
		// Park - unrotated dimensions
		imgSrc = view.getImage("park_" + v)
		if (v === 0) {
			width = 4 * sqSize
			//height = sqSize
		} else {
			width = 3 * sqSize
			//height = 2 * sqSize
		}
	}

	// Position adjustment for rotated items (center on clicked square)
	let adjustedX = x
	let adjustedY = y
	if (bType === 1) {
		// Parks: shift based on the park model's actual filled top-left corner
		// (the image is the bounding box, but the filled shape may not start there)
		const parkModel = rf.getParkModel(v, rot, store.context.flipped)
		if (parkModel[0][0] === 0 && parkModel[0][1] === 0) adjustedX -= 2 * sqSize
		else if (parkModel[0][0] === 0) adjustedX -= sqSize
		if (rot === 1 || rot === 3) {
			// Center the rotated bounding box on the clicked square
			const rotOffset = v === 0 ? 1.5 : 0.5
			adjustedX -= rotOffset * sqSize
			adjustedY += rotOffset * sqSize
		}
	} else {
		// Roads
		if (bType === 0 && v === 2 && rot === 2) adjustedX -= sqSize
		if (rot === 1 && v !== 2) {
			const sqw = v === 0 ? 2 : 4
			const rotOffset = (sqw - 1) / 2
			adjustedX -= rotOffset * sqSize
			adjustedY += rotOffset * sqSize
		}
	}

	img.src = imgSrc
	img.style.display = "block"
	img.style.opacity = "0.5"
	img.style.width = width + "px"
	img.style.height = "auto"
	img.style.left = adjustedX + "px"
	img.style.top = adjustedY + "px"
	img.style.borderWidth = "0px"
	img.style.transformOrigin = "center"

	// Inline transform: rotate + scaleX(-1) for flipped parks. Applied inline
	// (not via the .r{N}M class) because the global .r{N}M classes use
	// scaleY(-1), which would flip the ghost vertically instead of horizontally.
	img.style.transform = "rotate(" + rot * 90 + "deg)" + (bType === 1 && store.context.flipped ? " scaleX(-1)" : "")
	img.classList.remove("r0", "r1", "r2", "r3", "r0M", "r1M", "r2M", "r3M")

	if (ghostHouseNumberRef.value) ghostHouseNumberRef.value.style.display = "none"

	// Compute roadwork markers for adjacent roads
	ghostRoadworkIndexes.value = computePotentialRoadworkIndexes(index, v, rot)
}

// Ghost preview for the lobbyist milestone new board tile
function showLobbyistMSTileGhost(index) {
	const img = ghostImgRef.value
	if (!img) return
	const sqSize = store.refSize / 5
	const [x, y] = view.getXYforSmallSquare(index)
	let left = x
	let top = y
	// The anchor square is a corner of the 5x5 tile; shift to the tile top-left
	if (map.isTopRightOfTile(index)) left -= 4 * sqSize
	if (map.isBottomLeftOfTile(index)) top -= 4 * sqSize

	const tile = store.context.newLobbyistTile
	const numStr = tile < 9 ? "0" + (tile + 1) : "" + (tile + 1)
	img.src = view.getImage("map" + numStr)
	img.style.display = "block"
	img.style.opacity = "0.5"
	img.style.width = store.refSize + "px"
	img.style.height = store.refSize + "px"
	img.style.left = left + "px"
	img.style.top = top + "px"
	img.style.transform = `rotate(${(store.context.rotation || 0) * 90}deg)`
	img.style.transformOrigin = "center"
	img.style.borderWidth = "0px"
	img.classList.remove("r0", "r1", "r2", "r3")
	if (ghostHouseNumberRef.value) ghostHouseNumberRef.value.style.display = "none"
}

function handleTouchStart(event, index) {
	event.preventDefault()

	const startTime = new Date().getTime()

	const touchEndHandler = () => {
		const endTime = new Date().getTime()
		const touchDuration = endTime - startTime

		event.target.removeEventListener("touchend", touchEndHandler)

		if (touchDuration < 200) {
			clickedOnSquare(index)
		} else {
			changeGhost(event, index, true)
		}
	}

	event.target.addEventListener("touchend", touchEndHandler)
}

// 2x2 restaurant ghost (initial placement + working-day new restaurants)
function showRestoGhost(index, soon) {
	const img = ghostImgRef.value
	const [x, y] = view.getXYforSmallSquare(index)
	const color = personal.getCorrectedColour(controller.currentPlayerObj().colour)
	img.src = view.getImage((soon ? "player_resto_soon_" : "player_resto_open_") + color)
	img.style.display = "block"
	img.style.transform = `rotate(${(store.context.rotation || 0) * 90}deg)`
	img.style.transformOrigin = "center center"
	img.style.top = y + "px"
	img.style.left = x + "px"
	img.style.width = (store.refSize / 5) * 2 + "px"
	img.style.height = (store.refSize / 5) * 2 + "px"
}

// Simple centered ghost: fixed size, 50% opacity, no transform (pizza bomb radio / coffee shop)
function showSimpleGhost(src, x, y, width, height = "auto") {
	const img = ghostImgRef.value
	img.src = src
	img.style.display = "block"
	img.style.opacity = 0.5
	img.style.transform = ""
	img.style.borderWidth = "0px"
	img.style.top = y + "px"
	img.style.left = x + "px"
	img.style.width = width + "px"
	img.style.height = height + "px"
}

// Shared preview-route logic for driving/hawker hover
function previewRoute(index, add, event, setFn, clearFn, restoreFn) {
	if (add) {
		const tile = map.giveTileNumber(index)
		if (tile !== lastPreviewTile.value) {
			lastPreviewTile.value = tile
			setFn(index)
		}
	} else {
		const related = event && event.relatedTarget
		const destEl = related && related.closest ? related.closest("[data-index]") : null
		const destIdx = destEl ? parseInt(destEl.dataset.index) : -1
		if (!isNaN(destIdx) && destIdx > -1 && map.giveTileNumber(destIdx) === map.giveTileNumber(index)) return
		lastPreviewTile.value = -1
		clearFn()
		if (restoreFn) restoreFn()
	}
}

function changeGhost(index, add, event) {
	// Only return early if we are MOVING into the SAME square
	// If add is false (mouse leaving), we MUST continue to hide it
	if (add && index === store.viewSettings.currentGhostIndex) return

	// Update the index
	store.viewSettings.currentGhostIndex = add ? index : null

	// Drink driving: preview the route that clicking this square would take
	if (store.gameflow.subphase === rf.SUBPHASE_PRODUCE && [rf.CART_OPERATOR, rf.TRUCK_DRIVER, rf.ZEPPELIN_PILOT].includes(store.context.producer)) {
		previewRoute(index, add, event, controller.setDrivingPreview, controller.clearDrivingPreview)
		return
	}

	// Hawker route: preview the route extension on hover
	if (store.gameflow.subphase === rf.SUBPHASE_MARKETING && store.context.hawkerRouteActive) {
		previewRoute(index, add, event, controller.setHawkerRoutePreview, controller.clearDrivingPreview, () => {
			store.highlights.indexesToHighlightHouses = rules.giveHousesAlongHawkerPath(store.context.path)
		})
		return
	}

	const img = ghostImgRef.value
	const div = ghostDivRef.value

	// Hide and Exit
	if (!add || !img) {
		if (img) img.style.display = "none"
		if (div) div.style.display = "none"
		if (ghostHouseNumberRef.value) ghostHouseNumberRef.value.style.display = "none"
		ghostRoadworkIndexes.value = []
		return
	}

	if (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) {
		showRestoGhost(index, false)
		return
	}
	// PLACING A NEW RESTAURANT (working day) - same ghost as the initial placement
	else if (store.gameflow.subphase === rf.SUBPHASE_NEW_RESTAURANTS && store.context.newRestaurantAction === "create") {
		showRestoGhost(index, store.context.selectedBuildingManager === rf.LOCAL_MANAGER)
		return
	}
	// PLACING A PIZZA BOMB RADIO (free radio campaign from First Pizza Sold)
	else if (store.gameflow.phase === rf.PHASE_PIZZA_BOMB) {
		const campaign = rules.firstRadioCampaign()
		if (campaign < 1 || !rf.MARKETING_CAMPAIGNS[campaign]) return

		const [x, y] = view.getXYforSmallSquare(index)
		const campaignData = rf.MARKETING_CAMPAIGNS[campaign]
		showSimpleGhost(view.getImage("campaign_" + campaign), x, y, campaignData.width * (store.refSize / 5))
		return
	}
	// PLACING A COFFEE SHOP (subphase or First Coffee Sold milestone)
	else if ((store.gameflow.subphase === rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN && store.context.coffeeShopAction === "place") || (store.gameflow.phase === rf.PHASE_COFFE_SHOP_MS && store.context.coffeeShopMSAction === "place")) {
		const [x, y] = view.getXYforSmallSquare(index)
		const color = personal.getCorrectedColour(controller.currentPlayerObj().colour)
		showSimpleGhost(view.getImage("coffeeShop_" + color), x, y, store.refSize / 5, store.refSize / 5)
		return
	}
	// PLACING A HOUSE / GARDEN (New Business Developer)
	else if (store.gameflow.subphase === rf.SUBPHASE_HOUSES) {
		if (store.context.selectedBuilding === -1) showGardenGhost(index)
		else showHouseGhost(index)
		return
	}
	// PLACING THE LOBBYIST MILESTONE NEW BOARD TILE
	else if (store.gameflow.subphase === rf.SUBPHASE_LOBBYISTS && store.context.lobbyistMilestoneActive) {
		showLobbyistMSTileGhost(index)
		return
	}
	// PLACING A LOBBYIST ROAD / PARK
	else if (store.gameflow.subphase === rf.SUBPHASE_LOBBYISTS && !store.context.lobbyistMilestoneActive) {
		showLobbyistGhost(index)
		return
	}
	// PLACING CAMPAIGN
	else if ((store.gameflow.subphase === rf.SUBPHASE_MARKETING && store.context.marketer > -1 && store.context.campaign > -1 && store.context.campaign <= 16) || (store.context.restaurantMilestone && store.context.campaign > -1 && store.context.campaign <= 16)) {
		const campaignData = rf.MARKETING_CAMPAIGNS[store.context.campaign]
		const sqSize = store.refSize / 5

		let imgName = "campaign_" + store.context.campaign
		if (store.context.double && store.context.secondGood > -1 && campaignData.type === rf.AIRPLANE) imgName += "a"
		img.src = view.getImage(imgName)
		img.style.display = "block"
		img.style.transform = ""
		img.classList.remove("r1")
		img.style.opacity = 0.5

		let r = "0"
		const [x, y] = view.getXYforSmallSquare(index)
		let adjustedX = x
		let adjustedY = y

		if (store.context.rotated === true) {
			r = "1"
			const rotOffset = (campaignData.width - campaignData.height) / 2
			adjustedX -= rotOffset * sqSize
			adjustedY += rotOffset * sqSize
		}

		if (campaignData.type === rf.AIRPLANE) {
			if (store.context.rotated === true) {
				// Shift left 2 or right 1
				let widthOnLeft = campaignData.width
				if (widthOnLeft == 2) widthOnLeft = 1
				if (map.isIndexOnLeftEdgeOfMap(index, widthOnLeft)) adjustedX -= sqSize

				if (store.context.campaign == 4) {
					r = "0"
					const rotOffset2 = (campaignData.width - campaignData.height) / 2
					adjustedX += rotOffset2 * sqSize
					adjustedY -= rotOffset2 * sqSize
				}
			} else {
				// Need to shift up 2 or down 1
				let widthOnBottom = campaignData.width
				if (store.context.campaign == 4) widthOnBottom = 1
				if (!map.isIndexOnBottomEdgeOfMap(index, widthOnBottom)) adjustedY -= sqSize

				if (store.context.campaign == 4) {
					r = "1"
					const rotOffset3 = (campaignData.width - campaignData.height) / 2
					adjustedX -= rotOffset3 * sqSize
					adjustedY += rotOffset3 * sqSize
				}
			}
		}

		if (r === "1") img.classList.add("r1")

		img.style.top = `${adjustedY + 1}px`
		img.style.left = `${adjustedX + 1}px`
		img.style.width = campaignData.width * sqSize + "px"
		img.style.height = "auto"
		img.style["border-width"] = "2px"
	}
	// PLACING FREEWAY
	else if (store.context.action === rf.ACT_PLACE_FREEWAY) {
		const sqSize = store.refSize / 5
		const rotated = store.context.rotation === 1

		img.src = view.getImage("freeway")
		img.style.display = "block"
		img.style.opacity = 0.5
		img.style.borderWidth = "0px"
		img.classList.remove("r1")
		if (rotated) img.classList.add("r1")
		img.style.transform = ""
		img.style.transformOrigin = ""

		// Base dimensions always 3x1 — CSS .r1 handles rotation visually
		img.style.width = 3 * sqSize + "px"
		img.style.height = 1 * sqSize + "px"

		// Determine which edge set this square belongs to
		const isSidesTrue = store.context.freewaySidesTrue.includes(index)
		const isSidesFalse = store.context.freewaySidesFalse.includes(index)

		// Move index back onto the board tile (matching view.js lines 2399-2411)
		let adjustedIndex = index
		if (isSidesTrue) {
			if (adjustedIndex % 5 == 0) adjustedIndex--
			else if ((adjustedIndex + 1) % 5 == 0) adjustedIndex++
		} else if (isSidesFalse) {
			const rowSize = store.mapData.dimensions[0] * 5 * 5
			const topRowSize = store.mapData.dimensions[0] * 5
			if (adjustedIndex % rowSize < topRowSize) adjustedIndex -= topRowSize
			else adjustedIndex += topRowSize
		}

		const [x, y] = view.getXYforSmallSquare(adjustedIndex)
		let adjustedX = x
		let adjustedY = y
		const freewayWidthSS = rotated ? 1 : 3

		if (isSidesFalse && !isSidesTrue) {
			// Top/bottom edge placement
			let shiftDir = -1 // default: up
			let shiftCount = 0
			for (let sc = 0; sc < freewayWidthSS; sc++) {
				const below = adjustedIndex + store.mapData.dimensions[0] * 5 + sc
				if (store.mapData.coords[below] === rf.OFF_BOARD || store.mapData.coords[below] === rf.FREEWAY) shiftCount++
			}
			if (shiftCount === freewayWidthSS) shiftDir = 1 // down

			if (!rotated) {
				if (shiftDir < 0) adjustedY -= sqSize
				if (shiftDir > 0) adjustedY += sqSize
			}
			if (rotated) {
				adjustedX -= sqSize
				if (shiftDir < 0) adjustedY -= 2 * sqSize
				if (shiftDir > 0) adjustedY += 2 * sqSize
			}
		} else if (isSidesTrue) {
			// Left/right edge placement
			let shiftDir = 1 // default: right
			if (map.isIndexOnLeftEdgeOfMap(adjustedIndex, 1)) shiftDir = -1

			if (!rotated) {
				if (shiftDir < 0) adjustedX -= 3 * sqSize
				if (shiftDir > 0) adjustedX += sqSize
			}
			if (rotated) {
				if (shiftDir < 0) adjustedX -= 2 * sqSize
				adjustedY += sqSize
			}
		}

		img.style.top = `${adjustedY}px`
		img.style.left = `${adjustedX}px`
	}
}
</script>

<template>
	<!-- HIGHLIGHT SQUARES TO CLICK -->
	<template v-if="canShowHighlights">
		<TransitionGroup name="fade-sq">
			<svg
				v-for="el in freewayHighlights"
				:key="el.index"
				class="higlightSquareToClick"
				:class="{ noBorder: store.gameflow.subphase === rf.SUBPHASE_HOUSES && store.context.selectedBuilding === -1 }"
				:data-index="el.index"
				:style="{
					width: store.refSize / 5 + 'px',
					height: store.refSize / 5 + 'px',
					top: el.y + 'px',
					left: el.x + 'px',
				}"
				@click="clickedOnSquare(el.index)"
				@mouseover="changeGhost(el.index, true, $event)"
				@mouseleave="changeGhost(el.index, false, $event)"
				@touchstart="handleTouchStart($event, el.index)">
				<rect style="width: 100%; height: 100%" oncontextmenu="return false" />
			</svg>
		</TransitionGroup>
	</template>

	<!-- ZEPPELIN OPTION TILES TO CLICK (whole tiles, instant) -->
	<template v-if="canShowHighlights">
		<svg v-for="tile in store.highlights.tilesToHighlight" :key="'tile' + tile" class="tileToClick" :style="tileStyle(tile)" @click="clickedOnTile(tile)" @mouseover="hoverTile(tile)" @mouseleave="unhoverTile()">
			<rect style="width: 100%; height: 100%" oncontextmenu="return false" />
		</svg>
	</template>

	<!-- ZEPPELIN HOVER PREVIEW TILES (whole tiles, instant, not clickable) -->
	<template v-for="(tile, tileCount) in store.highlights.tilesToHighlightPreview" :key="'tilePrev' + tileCount">
		<svg class="tileHighlightPreview" :style="tileStyle(tile)">
			<rect style="width: 100%; height: 100%" />
		</svg>
	</template>

	<!-- SQUARE HIGHLIGHT LAYERS (history / coffee route / path / preview / drinks) -->
	<template v-for="(layer, li) in squareHighlightLayers" :key="li">
		<svg
			v-for="(index, ii) in layer.list"
			:key="layer.key + ii"
			:class="layer.cls"
			:style="{
				width: store.refSize / 5 + 'px',
				height: store.refSize / 5 + 'px',
				top: view.getXYforSmallSquare(index)[1] + 'px',
				left: view.getXYforSmallSquare(index)[0] + 'px',
			}">
			<rect style="width: 100%; height: 100%" />
		</svg>
	</template>

	<img class="ghostImg" ref="ghostImgRef" src="" alt="GI Image" oncontextmenu="return false" />
	<img
		v-for="(rwIdx, rwKey) in ghostRoadworkIndexes"
		:key="'rw' + rwKey"
		class="ghostImg"
		:src="view.getImage('roadUC')"
		:style="{
			display: 'block',
			opacity: '0.5',
			left: view.getXYforSmallSquare(rwIdx)[0] + 'px',
			top: view.getXYforSmallSquare(rwIdx)[1] + 'px',
			width: store.refSize / 5 + 'px',
			height: store.refSize / 5 + 'px',
			borderWidth: '0px',
			transform: 'none',
		}"
		alt="Roadwork"
		oncontextmenu="return false" />
	<div class="ghostDiv" ref="ghostDivRef" oncontextmenu="return false"></div>
	<span ref="ghostHouseNumberRef" class="ghostHouseNumber"></span>
</template>

<style scoped>
.higlightSquareToClick {
	position: absolute;
	z-index: 100;
	opacity: 0.5;
	fill: yellow;
	cursor: pointer;
	border: 2px solid black;
	box-sizing: border-box;
}

.higlightSquareToClick.noBorder {
	border: none;
}

/* Zeppelin option tiles - whole-tile highlight, instant (no transition) */
.tileToClick {
	position: absolute;
	z-index: 100;
	opacity: 0.6;
	fill: yellow;
	cursor: pointer;
	border: 2px solid black;
	box-sizing: border-box;
}

/* Zeppelin hover preview tiles - lightgreen, instant, not clickable */
.tileHighlightPreview {
	position: absolute;
	z-index: 95;
	opacity: 0.6;
	fill: lightgreen;
	box-sizing: border-box;
}

/* History highlight-on-click squares - same as higlightSquareToClick,
   but no border (not clickable) */
.higlightSquareHistory {
	position: absolute;
	z-index: 100;
	opacity: 1;
	fill: yellow;
	box-sizing: border-box;
	animation: glow 0.6s infinite alternate;
}

.higlightSquareHistoryCoffee {
	position: absolute;
	z-index: 100;
	opacity: 1;
	fill: #1e9533;
	box-sizing: border-box;
	animation: glow 0.6s infinite alternate;
}

/* Drink driving path - blue, below clickable squares */
.higlightSquarePath {
	position: absolute;
	z-index: 90;
	fill: blue;
	opacity: 0.4;
	box-sizing: border-box;
}

/* Drink driving hover preview - lightgreen */
.higlightSquarePreview {
	position: absolute;
	z-index: 95;
	fill: lightgreen;
	opacity: 0.5;
	box-sizing: border-box;
	animation: glow 0.6s infinite alternate;
}

/* Drink spots passed on the route - lightgreen */
.higlightSquareDrinks {
	position: absolute;
	z-index: 92;
	fill: lightgreen;
	opacity: 0.6;
	box-sizing: border-box;
	animation: glow 0.6s infinite alternate;
}

/* Hawker truck affected houses - magenta */
.higlightSquareHouses {
	position: absolute;
	z-index: 93;
	fill: #e91e8c;
	opacity: 0.6;
	box-sizing: border-box;
	animation: glow 0.6s infinite alternate;
}

@keyframes glow {
	to {
		opacity: 0.5;
	}
}

.ghostImg,
.ghostDiv {
	position: absolute;
	display: none;
	z-index: 50;
}

.ghostImg {
	box-sizing: border-box;
	border: solid black;
}

.ghostImg.r1 {
	transform: rotate(90deg);
}
.ghostImg.r2 {
	transform: rotate(180deg);
}
.ghostImg.r3 {
	transform: rotate(270deg);
}

.ghostDiv {
	border: solid black;
	border-radius: 100%;
}

.ghostHouseNumber {
	position: absolute;
	display: none;
	z-index: 51;
	color: #fff;
	font-weight: bold;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
}

.ghostHouseNumber.r1 {
	transform: rotate(90deg);
}

.ghostHouseNumber.r3 {
	transform: rotate(270deg);
}

/* Disable all mouse/touch interactions while fading out */
.fade-sq-leave-active {
	pointer-events: none;
}

/* Duration and timing of the animation */
.fade-sq-enter-active,
.fade-sq-leave-active {
	transition:
		opacity 0.4s ease,
		transform 0.4s ease;
}

/* Starting state for entering / Ending state for leaving */
.fade-sq-enter-from,
.fade-sq-leave-to {
	opacity: 0;
}

/* Absolute position is needed during leave so items don't "jump" */
.fade-sq-leave-active {
	position: absolute;
}
</style>
