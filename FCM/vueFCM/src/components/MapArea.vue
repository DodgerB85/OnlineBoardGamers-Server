<script setup>
import * as map from "../js/FCMmap"
import * as view from "../js/FCMview"
import * as rf from "../js/FCMreference"
import * as model from "../js/FCMmodel"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

import { computed } from "vue"
import MapHighlight from "./MapHighlight.vue"
import BoardAssistance from "./BoardAssistance.vue"

function getTilePos(index) {
	const cols = map.getUsedRowCol()[1].length
	const row = Math.floor(index / cols)
	const col = index % cols
	// Shift the board when planes/freeways are off the edge
	const xOffset = model.isItemOnLeftOfBoard() ? 0.5 : 0
	const yOffset = model.isItemOnTopOfBoard() ? 0.5 : 0
	return [(yOffset + row) * store.refSize, (xOffset + col) * store.refSize]
}

// Raw small-square index -> [x, y] in board squares, offset by the used board origin
function boardOffsetPos(index) {
	const tW = store.mapData.dimensions[0] * 5
	const [rows, cols] = map.getUsedRowCol()
	return [index % tW - cols[0] * 5, Math.floor(index / tW) - rows[0] * 5]
}

// Placed marketing campaigns 
const campaignDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5

	for (const c of store.campaigns) {
		// Gourmet guides / giant billboards / hawker trucks are off-board items
		if (c.number < 1 || c.number > 16) continue
		if (c.index < 0) continue

		const campaignData = rf.MARKETING_CAMPAIGNS[c.number]
		const [x, y] = view.getXYforSmallSquare(c.index)
		let adjustedX = x
		let adjustedY = y
		let r = c.rotated ? "1" : "0"
		let tokenX = adjustedX + ((campaignData.width - 1) * sqSize) / 2
		let tokenY = adjustedY + ((campaignData.height - 1) * sqSize) / 2
		let offsetToken = 0

		if (c.rotated === true) {
			const rotOffset = (campaignData.width - campaignData.height) / 2
			tokenX = adjustedX + ((campaignData.height - 1) * sqSize) / 2
			tokenY = adjustedY + ((campaignData.width - 1) * sqSize) / 2
			adjustedX -= rotOffset * sqSize
			adjustedY += rotOffset * sqSize
		}

		if (campaignData.type === rf.AIRPLANE) {
			offsetToken = (campaignData.width * sqSize) / 4
			if (c.rotated === true) {
				let widthOnLeft = campaignData.width
				if (widthOnLeft == 2) widthOnLeft = 1
				if (map.isIndexOnLeftEdgeOfMap(c.index, widthOnLeft)) adjustedX -= 2 * sqSize
				else adjustedX += sqSize

				tokenX = adjustedX + (campaignData.height * sqSize) / 2
				if (c.number == 6) tokenX += sqSize
				if (c.number == 4) {
					r = "0"
					const rotOffset2 = (campaignData.width - campaignData.height) / 2
					adjustedX += rotOffset2 * sqSize
					adjustedY -= rotOffset2 * sqSize
					tokenX = adjustedX + ((campaignData.width - 1) * sqSize) / 2
					tokenY = adjustedY + ((campaignData.height - 1) * sqSize) / 2
				}
			} else {
				let widthOnBottom = campaignData.width
				if (c.number == 4) widthOnBottom = 1
				if (map.isIndexOnBottomEdgeOfMap(c.index, widthOnBottom)) adjustedY += sqSize
				else adjustedY -= 2 * sqSize

				tokenY = adjustedY + ((campaignData.height - 1) * sqSize) / 2
				if (c.number == 4) {
					r = "1"
					const rotOffset3 = (campaignData.width - campaignData.height) / 2
					adjustedX -= rotOffset3 * sqSize
					adjustedY += rotOffset3 * sqSize
					tokenX = adjustedX + (campaignData.height * sqSize) / 2
					tokenY = adjustedY + ((campaignData.width - 2) * sqSize) / 2
				}
			}
		}

		const playerIndex = model.findPlayerForCampaign(c.number)
		const player = playerIndex === -1 ? -1 : store.players[playerIndex]
		const secondGood = player !== -1 && player.additionalMarketedGood.length > 0 && player.additionalMarketedGood[0] == c.number ? player.additionalMarketedGood[1] : -1

		let imgName = "campaign_" + c.number
		if (secondGood !== -1 && campaignData.type === rf.AIRPLANE) imgName += "a"

		const tokens = []
		if (secondGood !== -1) {
			let offsetTokenX = 0
			let offsetTokenY = 0
			if (c.rotated) offsetTokenY = offsetToken
			else offsetTokenX = offsetToken
			if (c.number == 4) {
				const t = offsetTokenX
				offsetTokenX = offsetTokenY
				offsetTokenY = t
			}
			tokens.push({ good: secondGood, x: tokenX - offsetTokenX, y: tokenY - offsetTokenY, width: sqSize })
			tokens.push({ good: c.good, x: tokenX + offsetTokenX, y: tokenY + offsetTokenY, width: sqSize })
		} else {
			tokens.push({ good: c.good, x: tokenX, y: tokenY, width: sqSize })
		}

		res.push({
			src: view.getImage(imgName),
			x: adjustedX,
			y: adjustedY,
			width: campaignData.width * sqSize,
			rotatedClass: r === "1" ? "r1" : "",
			tokens,
			transparent: [1, 2, 3, 9, 10, 15, 16].includes(c.number),
			duration: c.duration,
			hasSecondGood: secondGood !== -1,
			numX: parseInt(tokenX + store.refSize / 13),
			numY: parseInt(tokenY + store.refSize / 13),
		})
	}
	return res
})

// Board food token sizing - beer/coke halved, lemonade reduced
function tokenStyle(token) {
	let x = token.x
	let width = token.width
	if (token.good === rf.BEER || token.good === rf.COKE) {
		x += width / 4.5
		width /= 2
	} else if (token.good === rf.LEMONADE) {
		x += width / 5
		width /= 1.5
	}
	return {
		left: x + "px",
		top: token.y + "px",
		width: width + "px",
	}
}

// Built houses - house_garden image pasted over the tile + house number
const houseDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5

	for (const house of store.houses) {
		if ((house.index ?? -1) < 0) continue

		const [x, y] = view.getXYforSmallSquare(house.index)
		let adjustedX = x
		let adjustedY = y
		let houseRotation = 0
		if (!store.startingOptions.hawkers && house.rotated) houseRotation = 1
		else if (store.startingOptions.hawkers) houseRotation = house.rotated

		if (house.rotated === 1 || house.rotated === 3 || house.rotated === true) {
			adjustedX += 0.5 * sqSize
			adjustedY -= 0.5 * sqSize
		}

		// House number position (rotations shift it)
		let numX = adjustedX
		let numY = adjustedY
		let numClass = ""
		if (house.rotated === 1 || house.rotated === 3 || house.rotated === true) {
			if (house.rotated === 1 || house.rotated === true) {
				numClass = "r1"
				numX += sqSize / 2
				numY += store.refSize / 3
			} else {
				numX += sqSize / 2 - 2 * sqSize
				numY += store.refSize / 3
				numClass = "r3"
			}
		}
		if (house.rotated === 2) numY += 2 * sqSize + store.refSize / 50
		const fontSize = (store.refSize / 200) * 1.25

		res.push({
			x: adjustedX,
			y: adjustedY,
			width: 2 * sqSize,
			rotationClass: "r" + houseRotation,
			numX: numX + store.refSize / 3.7,
			numY: numY + store.refSize / 50,
			numClass,
			fontSize: fontSize + "em",
			number: house.number,
		})
	}
	return res
})

// Built gardens - garden image at the house's garden edge
const gardenDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5

	for (const garden of store.gardens) {
		if ((garden.index ?? -1) < 0) continue

		const [x, y] = view.getXYforSmallSquare(garden.index)
		let adjustedX = x
		let adjustedY = y
		if (garden.rotated === true) {
			adjustedX -= 0.5 * sqSize
			adjustedY += 0.5 * sqSize
		}

		res.push({
			x: adjustedX,
			y: adjustedY,
			width: 2 * sqSize,
			rotationClass: garden.rotated === true ? "r1" : "",
		})
	}
	return res
})

// Lobbyist-placed roads
const roadDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5

	for (const road of store.newRoads) {
		if ((road.index ?? -1) < 0) continue

		let [x, y] = boardOffsetPos(road.index)

		if (road.variety === 2 && road.rotation === 2) x -= 1

		let w = 2 * sqSize
		if (road.variety === 1) w = 4 * sqSize

		// Off-board items shift the whole board
		const xOffset = model.isItemOnLeftOfBoard() ? 2.5 : 0
		const yOffset = model.isItemOnTopOfBoard() ? 2.5 : 0
		let adjustedX = (xOffset + x) * sqSize
		let adjustedY = (yOffset + y) * sqSize

		let rotClass = "r0"
		if (road.variety !== 2 && road.rotation === 1) {
			rotClass = "r1"
			// Center the rotated road: rotOffset = (sqw-1)/2
			const sqw = road.variety === 0 ? 2 : 4
			const rotOffset = (sqw - 1) / 2
			adjustedX -= rotOffset * sqSize
			adjustedY += rotOffset * sqSize
		}
		if (road.variety === 2) rotClass = "r" + road.rotation

		// Under construction only during the turn the road was added
		const isUC = road.turnAdded === store.gameflow.turn

		res.push({
			x: adjustedX,
			y: adjustedY,
			width: w,
			src: view.getImage("road_" + road.variety + (isUC ? "_UC" : "")),
			rotClass,
		})
	}
	return res
})

// Roadwork marker overlays on adjacent roads
const roadworkDisplays = computed(() => {
	const rwIdxs = map.getRoadworkIndexes()
	if (rwIdxs.length === 0) return []
	const sqSize = store.refSize / 5
	const xOffset = model.isItemOnLeftOfBoard() ? 2.5 : 0
	const yOffset = model.isItemOnTopOfBoard() ? 2.5 : 0
	const res = []
	for (const rwIdx of rwIdxs) {
		const [bx, by] = boardOffsetPos(rwIdx)
		res.push({
			x: (xOffset + bx) * sqSize,
			y: (yOffset + by) * sqSize,
			width: sqSize,
			src: view.getImage("roadUC"),
		})
	}
	return res
})

// Built freeways
const freewayDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5

	for (const fw of store.freeways) {
		if ((fw.index ?? -1) < 0) continue

		const [freewayXcoord, freewayYcoord] = boardOffsetPos(fw.index)

		const xOffset = model.isItemOnLeftOfBoard() ? 2.5 : 0
		const yOffset = model.isItemOnTopOfBoard() ? 2.5 : 0
		let adjustedX = (xOffset + freewayXcoord) * sqSize
		let adjustedY = (yOffset + freewayYcoord) * sqSize

		const freewayWidthSS = fw.rotated ? 1 : 3

		if (!fw.sides) {
			// Top/bottom edge
			let shiftDir = -1
			let shiftCount = 0
			for (let sc = 0; sc < freewayWidthSS; sc++) {
				const below = fw.index + store.mapData.dimensions[0] * 5 + sc
				if (store.mapData.coords[below] === rf.OFF_BOARD || store.mapData.coords[below] === rf.FREEWAY) shiftCount++
			}
			if (shiftCount === freewayWidthSS) shiftDir = 1

			if (!fw.rotated) {
				if (shiftDir < 0) adjustedY -= sqSize
				if (shiftDir > 0) adjustedY += sqSize
			}
			if (fw.rotated) {
				adjustedX -= sqSize
				if (shiftDir < 0) adjustedY -= 2 * sqSize
				if (shiftDir > 0) adjustedY += 2 * sqSize
			}
		} else {
			// Left/right edge
			let shiftDir = 1
			if (map.isIndexOnLeftEdgeOfMap(fw.index, 1)) shiftDir = -1

			if (!fw.rotated) {
				if (shiftDir < 0) adjustedX -= 3 * sqSize
				if (shiftDir > 0) adjustedX += sqSize
			}
			if (fw.rotated) {
				if (shiftDir < 0) adjustedX -= 2 * sqSize
				adjustedY += sqSize
			}
		}

		res.push({
			x: adjustedX,
			y: adjustedY,
			width: 3 * sqSize,
			rotClass: fw.rotated ? "r1" : "r0",
		})
	}
	return res
})

// Placed coffee shops
const coffeeShopDisplays = computed(() => {
	const res = []

	for (const player of store.players) {
		for (const shopIdx of player.coffeeShops) {
			const [x, y] = view.getXYforSmallSquare(shopIdx)
			res.push({
				x: x,
				y: y,
				src: view.getImage("coffeeShop_" + personal.getCorrectedColour(player.colour)),
			})
		}
	}
	return res
})

// Lobbyist-placed parks
const parkDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5

	for (const park of store.parks) {
		if ((park.index ?? -1) < 0) continue

		const parkModel = rf.getParkModel(park.variety, park.rotation, park.flipped)
		let [x, y] = boardOffsetPos(park.index)

		if (parkModel[0][0] === 0 && parkModel[0][1] === 0) x -= 2
		else if (parkModel[0][0] === 0) x -= 1

		let w = 3 * sqSize
		if (park.variety === 0) w = 4 * sqSize

		// Off-board items shift the whole board
		const xOffset = model.isItemOnLeftOfBoard() ? 2.5 : 0
		const yOffset = model.isItemOnTopOfBoard() ? 2.5 : 0
		let adjustedX = (xOffset + x) * sqSize
		let adjustedY = (yOffset + y) * sqSize

		if (park.rotation === 1 || park.rotation === 3) {
			const rotOffset = park.variety === 0 ? 1.5 : 0.5
			adjustedX -= rotOffset * sqSize
			adjustedY += rotOffset * sqSize
		}

		let rotClass = "r" + park.rotation
		if (park.flipped) rotClass += "M"

		res.push({
			x: adjustedX,
			y: adjustedY,
			width: w,
			src: view.getImage("park_" + park.variety),
			rotClass,
		})
	}
	return res
})

// Natural board houses already printed on the tiles - pasted over with stock house + number
const naturalHouseDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5
	const fontSize = (store.refSize / 200) * 1.25

	for (const houseNumber of map.findAllHouses()) {
		if (!rf.BOARD_HOUSES.includes(houseNumber)) continue
		const idx = map.findIndexForHouse(houseNumber)
		if (idx < 0) continue

		const [x, y] = view.getXYforSmallSquare(idx)
		res.push({
			x: x,
			y: y,
			width: 2 * sqSize,
			numX: x + store.refSize / 3.7,
			numY: y + store.refSize / 50,
			fontSize: fontSize + "em",
			number: houseNumber,
		})
	}
	return res
})

// Natural board apartments - pasted over with apartment image + number
const naturalApartmentDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5
	const imgWidth = sqSize * 3
	const fontSize = (store.refSize / 200) * 1.5

	for (const houseNumber of map.findAllHouses()) {
		if (!rf.APARTMENTS.includes(houseNumber)) continue
		const idx = map.findIndexForHouse(houseNumber)
		if (idx < 0) continue

		const [x, y] = view.getXYforSmallSquare(idx)
		const number = store.mapData.coords[idx] - rf.HOUSE
		const roundedNumber = Number.isInteger(number) ? number : parseFloat(number.toFixed(1))
		const numberText = roundedNumber === 3.2 ? "\u03C0" : roundedNumber === 9.7 ? "9¾" : String(roundedNumber)

		res.push({
			x: x,
			y: y,
			imgWidth: imgWidth,
			numX: x + store.refSize / 2.5,
			numY: y + store.refSize / 150,
			numberWidth: sqSize,
			numberHeight: (sqSize / 4) * 3,
			fontSize: roundedNumber === 3.2 ? (fontSize * 1.2) + "em" : fontSize + "em",
			numberText: numberText,
		})
	}
	return res
})

// Needs - food tokens beside houses / demand counters on apartments
const GOODS_HOUSE = {
	V: [
		[0.01, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.01, 0.4],
		[0.21, 0.4],
	],
	V2: [
		[0.01, 0],
		[0.01, 0.2],
		[0.21, 0],
		[0.01, 0.4],
		[0.21, 0.4],
	],
	H: [
		[0.01, 0],
		[0.21, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.42, 0],
	],
	H1: [
		[0.01, 0],
		[0.21, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.42, 0.2],
	],
	H2: [
		[0.01, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.42, 0],
		[0.42, 0.2],
	],
}

const GOODS_APARTMENT = [
	[0.01, 0.15],
	[0.01, 0.35],
	[0.21, 0.15],
	[0.21, 0.35],
	[0.42, 0.35],
	[0.42, 0.15],
]

const needDisplays = computed(() => {
	const res = []
	const sqSize = store.refSize / 5

	for (const need of store.needs) {
		if (need.number === rf.RURAL_MARKETING_AREA) continue
		if (!need.needs || need.needs.length === 0) continue

		// House needs
		const houseObj = model.findHouse(need.number)
		if (houseObj !== -1 && houseObj.index > -1) {
			const [x, y] = view.getXYforSmallSquare(houseObj.index)
			let adjustedX = x
			let adjustedY = y
			const offsetHouse = model.getHouseOffset(need.number)
			let rotated = houseObj.rotated === 1
			if (offsetHouse === -1 || offsetHouse === 2) rotated = true

			let D = GOODS_HOUSE.V
			if (rotated) D = GOODS_HOUSE.H
			if (offsetHouse === 2) D = GOODS_HOUSE.H2
			if (offsetHouse < -1) D = GOODS_HOUSE.V2
			if (offsetHouse === -1) D = GOODS_HOUSE.H1
			if (offsetHouse === -1) adjustedX -= sqSize
			if (offsetHouse < -1) adjustedY -= sqSize

			for (let i = 0; i < need.needs.length && i < D.length; i++) {
				res.push({
					type: "token",
					good: need.needs[i][0],
					x: adjustedX + D[i][0] * store.refSize,
					y: adjustedY + D[i][1] * store.refSize,
					width: store.refSize / 5.5,
				})
			}
		}

		// Apartment needs - combined counts with demand number
		const apartment = model.findApartment(need.number)
		if (apartment !== -1 && apartment.index > -1) {
			const [x, y] = view.getXYforSmallSquare(apartment.index)
			const combinedNeeds = [0, 0, 0, 0, 0, 0]
			for (const n of need.needs) combinedNeeds[n[0] === rf.DUMPLING ? 5 : n[0]]++
			let alreadyAdded = 0
			for (let item = 0; item < combinedNeeds.length; item++) {
				if (combinedNeeds[item] > 0) {
					res.push({
						type: "demand",
						count: combinedNeeds[item],
						good: item === 5 ? rf.DUMPLING : item,
						x: x + GOODS_APARTMENT[alreadyAdded][0] * store.refSize,
						y: y + GOODS_APARTMENT[alreadyAdded][1] * store.refSize,
						fontSize: store.refSize / 4 + "px",
						boxSize: sqSize,
					})
					alreadyAdded++
				}
			}
		}
	}
	return res
})

// Apartment demand token sizing
function apartmentTokenStyle(n) {
	let width = store.refSize / 5.5
	if (n.good === rf.BEER || n.good === rf.COKE) width /= 2
	else if (n.good === rf.LEMONADE) width /= 1.5
	const style = { width: width + "px" }
	if (n.good === rf.BEER) style.left = "11px"
	if (n.good === rf.COKE) style.left = "9px"
	if (n.good === rf.LEMONADE) {
		style.left = "6px"
		style.marginTop = "10px"
	}
	if (n.good === rf.DUMPLING) style.marginTop = "25px"
	return style
}

function isCurrentUrbanPlanningTile(tileData) {
	if (store.gameflow.phase !== rf.PHASE_URBAN_PLANNING) return false
	if (tileData[0] === -2) return false
	return tileData[0] === store.context.nextUrbanPlanningTile
}

// Rotation class for a rendered tile: the current UP tile follows the live context rotation
function tileRotationClass(tileData) {
	return "r" + (isCurrentUrbanPlanningTile(tileData) ? store.context.rotation : tileData[1])
}
</script>

<template>
	<div class="boardRow">
		<!-- DISPLAY MAP TILES -->
		<div
			id="mapTilesDiv"
			:style="{
				width: (map.getUsedRowCol()[1].length + (model.isItemOnLeftOfBoard() ? 0.5 : 0) + (model.isItemOnRightOfBoard() ? 0.5 : 0)) * store.refSize + 'px',
				height: (map.getUsedRowCol()[0].length + (model.isItemOnTopOfBoard() ? 0.5 : 0) + (model.isItemOnBottomOfBoard() ? 0.5 : 0)) * store.refSize + 'px',
			}">
		<template v-for="(tileData, index) in store.mapData.displayTiles" :key="index">
				<!-- Normal tile / current urban planning tile (rotation not yet chosen) -->
				<div
				v-if="tileData[0] !== -1 && tileData[0] !== -2 && (tileData[1] >= 0 || isCurrentUrbanPlanningTile(tileData))"
				class="mapTile"
				:class="tileRotationClass(tileData)"
					:style="{
						width: store.refSize + 'px',
						height: store.refSize + 'px',
						top: getTilePos(index)[0] + 'px',
						left: getTilePos(index)[1] + 'px',
					}">
					<img class="mapTileImg" :src="view.getImage('map' + String(tileData[0] + 1))" alt="Map Tile" />
				</div>
				<!-- No Tile placeholder (urban planning unfilled slots) -->
				<div
				v-else-if="(tileData[0] === -2 || tileData[1] < 0) && store.gameflow.phase === rf.PHASE_URBAN_PLANNING"
				class="mapTile emptyTileDiv"
					:style="{
						width: store.refSize + 'px',
						height: store.refSize + 'px',
						top: getTilePos(index)[0] + 'px',
						left: getTilePos(index)[1] + 'px',
					}">
					No Tile
				</div>
			</template>

			<!-- Display Restos -->
			<template v-for="(playerObj, playerIndex) in store.players" :key="playerIndex">
				<div
					v-for="(resto, idx) in playerObj.restaurants"
					:key="idx"
					class="restoDiv"
					:style="{
						width: (store.refSize / 5) * 2 + 'px',
						height: (store.refSize / 5) * 2 + 'px',
						left: view.getXYforSmallSquare(resto.index)[0] + 'px',
						top: view.getXYforSmallSquare(resto.index)[1] + 'px',
					}">
					<img
						class="restoImg"
						:src="view.getImage((resto.open === false ? 'player_resto_soon_' : 'player_resto_open_') + personal.getCorrectedColour(playerObj.colour))"
						:style="{
							border: '2px solid ' + personal.getCorrectedColourHexForRestoBorder(playerObj.colour),
							transform: `rotate(${resto.rotation * 90}deg)`,
							filter: resto.open === false ? 'grayscale(80%)' : 'none',
						}" />
				</div>
			</template>

			<!-- Display marketing campaigns -->
			<template v-for="(camp, campIdx) in campaignDisplays" :key="'camp' + campIdx">
				<img class="boardCampaignImg" :src="camp.src" :class="camp.rotatedClass" :style="{ left: camp.x + 'px', top: camp.y + 'px', width: camp.width + 'px' }" :alt="campIdx" />
				<img v-for="(token, tIdx) in camp.tokens" :key="'tok' + campIdx + '-' + tIdx" class="boardTokenImg" :class="{ seeThroughBoardItem: camp.transparent }" :style="tokenStyle(token)" :src="view.giveBoardFoodTokenImage(token.good)" :alt="token.good" />
				<span class="campaignDurationSpan" :class="{ r1: camp.duration === 9, inverted: camp.hasSecondGood }" :style="{ left: camp.numX + 'px', top: camp.numY + 'px' }">{{ camp.duration === 9 ? "8" : camp.duration }}</span>
			</template>

			<!-- Display natural board houses -->
			<template v-for="(h, hIdx) in naturalHouseDisplays" :key="'nh' + hIdx">
				<img class="boardHouseImg" :src="view.getImage('house_small')" :style="{ left: h.x + 'px', top: h.y + 'px', width: h.width + 'px' }" alt="House" />
				<span class="houseNumberSpan" :style="{ left: h.numX + 'px', top: h.numY + 'px', 'font-size': h.fontSize }">{{ h.number }}</span>
			</template>

			<!-- Display natural board apartments -->
			<template v-for="(a, aIdx) in naturalApartmentDisplays" :key="'na' + aIdx">
				<img class="boardApartmentImg" :src="view.getImage('apartment')" :style="{ left: a.x + 'px', top: a.y + 'px', width: a.imgWidth + 'px' }" alt="Apartment" />
				<span class="apartmentNumberSpan" :style="{ left: a.numX + 'px', top: a.numY + 'px', width: a.numberWidth + 'px', height: a.numberHeight + 'px', 'font-size': a.fontSize }">{{ a.numberText }}</span>
			</template>

			<!-- Display built houses -->
			<template v-for="(h, hIdx) in houseDisplays" :key="'bh' + hIdx">
				<img class="boardHouseImg" :src="view.getImage('house_garden')" :class="h.rotationClass" :style="{ left: h.x + 'px', top: h.y + 'px', width: h.width + 'px' }" alt="House" />
				<span class="houseNumberSpan" :class="h.numClass" :style="{ left: h.numX + 'px', top: h.numY + 'px', 'font-size': h.fontSize }">{{ h.number }}</span>
			</template>

			<!-- Display built gardens -->
			<template v-for="(g, gIdx) in gardenDisplays" :key="'bg' + gIdx">
				<img class="boardGardenImg" :src="view.getImage('garden')" :class="g.rotationClass" :style="{ left: g.x + 'px', top: g.y + 'px', width: g.width + 'px' }" alt="Garden" />
			</template>

			<!-- Display lobbyist-placed roads -->
			<template v-for="(r, rIdx) in roadDisplays" :key="'road' + rIdx">
				<img class="boardRoadImg" :src="r.src" :class="r.rotClass" :style="{ left: r.x + 'px', top: r.y + 'px', width: r.width + 'px' }" alt="Road" />
			</template>

			<!-- Roadwork marker overlays on adjacent roads -->
			<template v-for="(rw, rwIdx) in roadworkDisplays" :key="'rw' + rwIdx">
				<img class="boardRoadworkImg" :src="rw.src" :style="{ left: rw.x + 'px', top: rw.y + 'px', width: rw.width + 'px', height: rw.width + 'px' }" alt="Roadwork" />
			</template>

			<!-- Display lobbyist-placed parks -->
			<template v-for="(p, pIdx) in parkDisplays" :key="'park' + pIdx">
				<img class="boardParkImg" :src="p.src" :class="p.rotClass" :style="{ left: p.x + 'px', top: p.y + 'px', width: p.width + 'px' }" alt="Park" />
			</template>

			<!-- Display coffee shops -->
			<template v-for="(cs, csIdx) in coffeeShopDisplays" :key="'cs' + csIdx">
				<img class="boardCoffeeShopImg" :src="cs.src" :style="{ left: cs.x + 'px', top: cs.y + 'px', width: store.refSize / 5 + 'px', height: store.refSize / 5 + 'px' }" alt="Coffee Shop" />
			</template>

			<!-- Display freeways -->
			<template v-for="(fw, fwIdx) in freewayDisplays" :key="'fw' + fwIdx">
				<img class="boardFreewayImg" :src="view.getImage('freeway')" :class="fw.rotClass" :style="{ left: fw.x + 'px', top: fw.y + 'px', width: fw.width + 'px' }" alt="Freeway" />
			</template>

			<!-- Display needs -->
			<template v-for="(n, nIdx) in needDisplays" :key="'need' + nIdx">
				<img v-if="n.type === 'token'" class="boardTokenImg needTokenImg" :src="view.giveBoardFoodTokenImage(n.good)" :style="tokenStyle(n)" :alt="n.good" />
				<div v-else class="apartmentDemandDiv" :style="{ left: n.x + 'px', top: n.y + 'px', 'font-size': n.fontSize, height: n.boxSize + 'px', width: n.boxSize + 'px' }">
					<span class="apartmentDemandNumber">{{ n.count }}</span>
					<img class="apartmentDemandImg" :src="view.giveBoardFoodTokenImage(n.good)" :style="apartmentTokenStyle(n)" :alt="n.good" />
				</div>
			</template>

			<!-- Add highlights on top-->
			<MapHighlight />
		</div>

		<!-- Right-hand assistance column (board demand summary + players) -->
		<BoardAssistance />
	</div>
</template>

<style scoped>
.boardRow {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: flex-start;
	gap: 10px;
	margin: 10px auto;
}

#mapTilesDiv {
	position: relative;
	margin: 20px 0;
	transition: all 0.2s ease-in-out;
}

.mapTile {
	position: absolute;
	border: 0.5px solid black;
	box-sizing: border-box;
}

.mapTileImg {
	width: 100%;
	height: 100%;
}

.restoDiv {
	position: absolute;
}

.restoImg {
	width: 100%;
	height: 100%;
	box-sizing: border-box;
}

.boardCampaignImg {
	position: absolute;
	z-index: 10;
	height: auto;
}

.boardTokenImg {
	position: absolute;
	z-index: 11;
	height: auto;
}

.seeThroughBoardItem {
	opacity: 0.45;
}

.boardHouseImg {
	position: absolute;
	z-index: 5;
	height: auto;
}

.boardApartmentImg {
	position: absolute;
	z-index: 5;
	height: auto;
}

.apartmentNumberSpan {
	position: absolute;
	z-index: 12;
	color: #fff;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	text-align: center;
	line-height: 1;
	font-family: "Times New Roman", Times, serif;
	pointer-events: none;
}

.boardGardenImg {
	position: absolute;
	z-index: 5;
	height: auto;
}

.houseNumberSpan {
	position: absolute;
	z-index: 12;
	color: #fff;
	pointer-events: none;
	font-family: "Times New Roman", Times, serif;
}

.needTokenImg {
	z-index: 12;
}

.campaignDurationSpan {
	position: absolute;
	color: #fff;
	font-size: 20px;
	z-index: 12;
}

.campaignDurationSpan.inverted {
	color: #000;
	background-color: #fff;
	border-radius: 20%;
	padding: 0.05em 0.25em;
}

.apartmentDemandDiv {
	position: absolute;
	z-index: 12;
	color: white;
	text-align: center;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	margin: 0;
}

.apartmentDemandNumber {
	z-index: 99;
	position: absolute;
	transform: translate(-50%, 5%);
}

.apartmentDemandImg {
	position: absolute;
	top: 0;
	margin: auto;
	display: block;
}

.r1 {
	transform: rotate(90deg);
}

.r2 {
	transform: rotate(180deg);
}

.r3 {
	transform: rotate(270deg);
}

/* Lobbyist-placed roads */
.boardRoadImg {
	position: absolute;
}

/* Roadwork marker overlays on adjacent roads */
.boardRoadworkImg {
	position: absolute;
	z-index: 9;
}

/* Lobbyist-placed parks */
.boardParkImg {
	position: absolute;
}

/* Coffee shops */
.boardCoffeeShopImg {
	position: absolute;
	z-index: 6;
}

/* Freeways */
.boardFreewayImg {
	position: absolute;
	z-index: 5;
}

/* Flipped park rotations (mirror horizontally, matching FCM.css) */
.r0M { transform: rotate(0deg) scaleX(-1); }
.r1M { transform: rotate(90deg) scaleX(-1); }
.r2M { transform: rotate(180deg) scaleX(-1); }
.r3M { transform: rotate(270deg) scaleX(-1); }

/* No Tile placeholder (urban planning) */
.emptyTileDiv {
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px dashed black;
	background-color: #f0f0f0;
	color: #666;
	font-size: 14px;
	font-weight: bold;
	box-sizing: border-box;
}
</style>
