<script setup>
import * as rf from "../js/KFWreference.js"
import * as view from "../js/KFWview.js"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { computed } from "vue"

/*const props = defineProps({
	mapPopupProp: {
		type: Object,
		required: true,
		default: () => ({
			popupObjectType: -1,
			svgX: 0,
			svgY: 0,
			popupObjectData: {},
			wholeSVGheight: 0,
		}),
		prop: "mapPopupProp",
	},
})*/

function parsePopupText(text) {
	// SEASONS
	text = text.replace(/<SSP>/g, () => {
		return `<img class='seasonOnPopupImg' src='${view.getImage("season_" + rf.SPRING)}' alt='season' />`
	})
	text = text.replace(/<SSU>/g, () => {
		return `<img class='seasonOnPopupImg' src='${view.getImage("season_" + rf.SUMMER)}' alt='season' />`
	})
	text = text.replace(/<SAU>/g, () => {
		return `<img class='seasonOnPopupImg' src='${view.getImage("season_" + rf.AUTUMN)}' alt='season' />`
	})
	text = text.replace(/<SWI>/g, () => {
		return `<img class='seasonOnPopupImg' src='${view.getImage("season_" + rf.WINTER)}' alt='season' />`
	})
	// RESOURCES
	text = text.replace(/<RA>/g, () => {
		return `<img class='resOnPopupImg' src='${view.getImage("res_" + rf.RES_ANY)}' alt='res' />`
	})
	text = text.replace(/<RM>/g, () => {
		return `<img class='resOnPopupImg' src='${view.getImage("res_" + rf.RES_ANY_MATCH)}' alt='res' />`
	})
	text = text.replace(/<RW>/g, () => {
		return `<img class='resOnPopupImg' src='${view.getImage("res_" + rf.WOOD)}' alt='res' />`
	})
	text = text.replace(/<RS>/g, () => {
		return `<img class='resOnPopupImg' src='${view.getImage("res_" + rf.STONE)}' alt='res' />`
	})
	text = text.replace(/<RI>/g, () => {
		return `<img class='resOnPopupImg' src='${view.getImage("res_" + rf.IRON)}' alt='res' />`
	})
	text = text.replace(/<RG>/g, () => {
		return `<img class='resOnPopupImg' src='${view.getImage("res_" + rf.GOLD)}' alt='res' />`
	})
	// MEEPLES
	text = text.replace(/<MRa>/g, () => {
		return `<img class='meepleOnPopupImg' src='${view.getImage("meeple_random")}' alt='meeple' />`
	})
	text = text.replace(/<MA>/g, () => {
		return `<img class='meepleOnPopupImg' src='${view.getImage("meeple_" + rf.MEEPLE_ANY)}' alt='meeple' />`
	})
	text = text.replace(/<MM>/g, () => {
		return `<img class='meepleOnPopupImg' src='${view.getImage("meeple_" + rf.MEEPLE_ANY_MATCH)}' alt='meeple' />`
	})
	text = text.replace(/<MB>/g, () => {
		return `<img class='meepleOnPopupImg' src='${view.getImage("meeple_blue")}' alt='meeple' />`
	})
	text = text.replace(/<MR>/g, () => {
		return `<img class='meepleOnPopupImg' src='${view.getImage("meeple_red")}' alt='meeple' />`
	})
	text = text.replace(/<MY>/g, () => {
		return `<img class='meepleOnPopupImg' src='${view.getImage("meeple_yellow")}' alt='meeple' />`
	})
	text = text.replace(/<MG>/g, () => {
		return `<img class='meepleOnPopupImg' src='${view.getImage("meeple_green")}' alt='meeple' />`
	})
	// Skills
	text = text.replace(/<SR>/g, () => {
		return `<img class='skillOnPopupImg' src='${view.getImage("skillTile_random")}' alt='skill' />`
	})
	text = text.replace(/<SM>/g, () => {
		return `<img class='skillOnPopupImg' src='${view.getImage("skillTile_-2")}' alt='skill' />`
	})
	text = text.replace(/<SAn>/g, () => {
		return `<img class='skillOnPopupImg' src='${view.getImage("skillTile_-1")}' alt='skill' />`
	})
	text = text.replace(/<SS>/g, () => {
		return `<img class='skillOnPopupImg' src='${view.getImage("skillTile_0")}' alt='skill' />`
	})
	text = text.replace(/<SP>/g, () => {
		return `<img class='skillOnPopupImg' src='${view.getImage("skillTile_1")}' alt='skill' />`
	})
	text = text.replace(/<SA>/g, () => {
		return `<img class='skillOnPopupImg' src='${view.getImage("skillTile_2")}' alt='skill' />`
	})
	// Cabin
	text = text.replace(/<CABIN>/g, () => {
		return `<img class='cabinOnPopupImg' src='${view.getImage("cabin")}' alt='Cabin' />`
	})

	// Contract
	text = text.replace(/<CR>/g, () => {
		return `<svg viewBox="77 131.5 55.5 34" class="popupContractSVG">
					<image width="52.916668" height="31.75" preserveAspectRatio="none" xlink:href="${view.getImage("c_back")}" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
					<path d="${rf.CONTRACT_PATH_D}" class="popupContractPath"  />
				</svg>`
	})
	// VP
	/*	text = text.replace(/<1VP>/g, () => {
		return `<svg class="vpOnPopupSVG" width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#DED228" stroke="black" stroke-width="2" />
  <text x="50" y="80" text-anchor="middle" font-size="80" font-weight="bold" fill="black">1</text>
</svg>`
	})*/
	text = text.replace(/<(\d+)VP>/g, (match, x) => {
		return `<svg class="vpOnPopupSVG" width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#DED228" stroke="black" stroke-width="2" />
  <text x="50" y="80" text-anchor="middle" font-size="80" font-weight="bold" fill="black">${x}</text>
</svg>`
	})

	return text
}

const computedPopupData = computed(() => {
	/*	let popupObjectType = props.mapPopupProp.popupObjectType
	let svgX = props.mapPopupProp.svgX
	let svgY = props.mapPopupProp.svgY
	let popupObjectData = props.mapPopupProp.popupObjectData
	let wholeSVGheight = props.mapPopupProp.wholeSVGheight
	let offsetY = 0

	let popupHTML = ""

	if (popupObjectType === -1) return ""

	// Avail Comp
	if (popupObjectType === 0) {
		offsetY = store.mapData.selectedMapData.viewSettings.availableCompanyLength
		let company = rf.ALL_COMPANIES.find((comp) => comp.id === popupObjectData[0])
		popupHTML = `<strong>${rf.OM_PROVINCE_STRINGS[company.province]}<br/>${company.typeText}${getShippingExtraHTML(company)}</strong>`
	}
	// City
	else if (popupObjectType === 1) {
		offsetY = 0
		let city = popupObjectData[0]
		popupHTML = `<strong>${rf.OM_PROVINCE_STRINGS[map.getProvinceFromTerrID(city.territory)]}<br/>Size: ${city.size}${getCityReceivedGoodsExtraHTML(city)}</strong>`
	}
	// Prod Marker
	else if (popupObjectType === 2) {
		offsetY = store.mapData.selectedMapData.viewSettings.resRefSize
		let company = popupObjectData[0]
		popupHTML = `<strong>${getMainPlayerHTML(company.ownerIndex)}<br/>${company.typeText}<br>Slot: ${model.getSlotIDXfromCompanyID(company.id) + 1}</strong>`
	}
	// Ship Marker
	else if (popupObjectType === 3) {
		offsetY = store.mapData.selectedMapData.shipMarkerWidth
		// popupObjectData = [x, y, shipGfx, company.id, terrID, l, company.ownerIndex]
		let company = store.activeCompanies.find((comp) => comp.id === popupObjectData[3])
		popupHTML = `<strong>${getMainPlayerHTML(company.ownerIndex)}<br>Slot: ${model.getSlotIDXfromCompanyID(company.id) + 1}<br/>Hull: ${company.hullCapacity}</strong>`
	}

	// Need offsetY from above
	const pixelsInsideSVGleft = (svgX / store.mapData.selectedMapData.backgroundDim[0]) * store.refSize
	const pixelsInsideSVGtop = ((svgY + offsetY) / store.mapData.selectedMapData.backgroundDim[1]) * wholeSVGheight
	*/
	let tile = rf.ALL_TILES.find((tile) => tile.id === store.popupSetter.tile_id)
	let upgraded = store.popupSetter.upgraded
	let normalActionHTML = ""
	let upgradedActionHTML = ""
	let boatTextArr = ["", ""]
	let winterBoatText = ""
	let turnOrderText = ""
	let winterText = ""
	let upgradeCostHTML = "Upgrade Cost: "
	let summerBoatTextSingle = ""
	let meeplesOnBoat = []
	let skillsOnBoat = []
	let cabinsOnBoat = 0
	let greenMeeplesOnBoat = 0
	let resourcesOnBoat = []
	let contractsOnBoat = 0

	if (tile.season === rf.SEASON_BOAT_TILE) {
		boatTextArr[0] = parsePopupText(tile.boatTextArr[0])
		boatTextArr[1] = parsePopupText(tile.boatTextArr[1])
		winterBoatText = parsePopupText(tile.winterText)
		// Find out if it's an available boat with stuff on it
		if (store.availableBoatTiles.some((boat) => boat.tileID[boat.upgraded] === tile.tileID[upgraded])) {
			let boatTile = store.availableBoatTiles.find((t) => t.tileID[t.upgraded] === tile.tileID[upgraded])
			meeplesOnBoat = [...boatTile.itemsOnBoat.meeples]
			skillsOnBoat = [...boatTile.itemsOnBoat.skillTiles]
			cabinsOnBoat = boatTile.itemsOnBoat.cabins
			greenMeeplesOnBoat = boatTile.itemsOnBoat.greenMeeples
			resourcesOnBoat = [...boatTile.itemsOnBoat.resources]
			contractsOnBoat = boatTile.itemsOnBoat.contracts.length
		}
	} else if (tile.season === rf.SEASON_TURN_ORDER_TILE) {
		turnOrderText = parsePopupText(tile.turnOrderText)
		winterText = parsePopupText(tile.winterText)
	} else if (tile.season === rf.SEASON_HOME_TILE || ([rf.SPRING, rf.SUMMER, rf.AUTUMN].includes(tile.season) && !rf.TILE_SUMMER_BOATS.includes(tile.tileID[0]))) {
		//normalActionHTML = `EXAMPLE: Get <img class='meepleOnPopupImg' src='${view.getImage("meeple_red")}' alt='meeple' /> or <img class='skillOnPopupImg' src='${view.getImage("skillTile_0")}' alt='skill' /> or <img class='resOnPopupImg' src='${view.getImage("res_0")}' alt='res' /><img class='resOnPopupImg' src='${view.getImage("res_1")}' alt='res' />`
		//upgradedActionHTML = `EXAMPLE: Get <img class='meepleOnPopupImg' src='${view.getImage("meeple_red")}' alt='meeple' /> AND <img class='skillOnPopupImg' src='${view.getImage("skillTile_0")}' alt='skill' /> AND <img class='resOnPopupImg' src='${view.getImage("res_0")}' alt='res' /><img class='resOnPopupImg' src='${view.getImage("res_1")}' alt='res' />`
		normalActionHTML = parsePopupText(tile.basicActionText)
		upgradedActionHTML = parsePopupText(tile.upgradedActionText)
		for (let i = 0; i < tile.upgradeCost.meepleCost.length; i++) upgradeCostHTML += `<img class='meepleOnPopupImg' src='${view.getImage("meeple_" + tile.upgradeCost.meepleCost[i])}' alt='meeple' />`
		for (let i = 0; i < tile.upgradeCost.skillCost.length; i++) upgradeCostHTML += `<img class='skillOnPopupImg' src='${view.getImage("skillTile_" + tile.upgradeCost.skillCost[i])}' alt='skill' />`
		for (let i = 0; i < tile.upgradeCost.resCost.length; i++) upgradeCostHTML += `<img class='resOnPopupImg' src='${view.getImage("res_" + tile.upgradeCost.resCost[i])}' alt='res' />`
	} else if (/*[rf.SPRING, rf.SUMMER, rf.AUTUMN].includes(tile.season) && */ rf.TILE_SUMMER_BOATS.includes(tile.tileID[0])) {
		summerBoatTextSingle = parsePopupText(tile.summerBoatTextArr[upgraded])
	} else if (tile.season === rf.WINTER) {
		winterText = parsePopupText(tile.winterText)
	}

	return {
		/*left: pixelsInsideSVGleft,
		top: pixelsInsideSVGtop,
		popupHTML: popupHTML,*/
		left: store.popupSetter.xPos,
		top: store.popupSetter.yPos,
		gfx: tile.gfx[upgraded],
		name: tile.name[upgraded],
		rawTile: tile,
		normalActionHTML: normalActionHTML,
		upgradedActionHTML: upgradedActionHTML,
		upgradeCostHTML: upgradeCostHTML,
		boatTextArr: boatTextArr,
		winterBoatText: winterBoatText,
		turnOrderText: turnOrderText,
		winterText: winterText,
		summerBoatTextSingle: summerBoatTextSingle,
		meeplesOnBoat: meeplesOnBoat,
		skillsOnBoat: skillsOnBoat,
		cabinsOnBoat: cabinsOnBoat,
		greenMeeplesOnBoat: greenMeeplesOnBoat,
		resourcesOnBoat: resourcesOnBoat,
		contractsOnBoat: contractsOnBoat,
	}
})
</script>

<template>
	<div v-if="store.popupSetter.showPopup" class="infoPopup" :style="{ left: computedPopupData.left + 'px', top: computedPopupData.top + 'px' }">
		<div class="hexDiv">
			<svg class="hexSVG" viewBox="-420 -348 840 696" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<pattern :id="computedPopupData.gfx + 'popup'" height="100%" width="100%" patternContentUnits="objectBoundingBox">
						<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(computedPopupData.gfx)" />
					</pattern>
				</defs>
				<polygon class="hexPolygon" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${computedPopupData.gfx}popup)`" />
			</svg>
		</div>
		<b>
			<u>{{ computedPopupData.name }}</u>
			<span v-if="[rf.SPRING, rf.SUMMER, rf.AUTUMN, rf.WINTER].includes(computedPopupData.rawTile.season)">
				&nbsp;&nbsp;
				<img class="seasonOnPopupTitleImg" :src="view.getImage('season_' + computedPopupData.rawTile.season)" alt="season" />
			</span>
		</b>
		<br />
		<!-- BOAT TILES -->
		<template v-if="computedPopupData.rawTile.season === rf.SEASON_BOAT_TILE">
			<div v-if="computedPopupData.rawTile.boatTextArr[0] !== ''" v-html="computedPopupData.boatTextArr[0]"></div>
			<hr />
			<div v-if="computedPopupData.rawTile.boatTextArr[1] !== ''" v-html="computedPopupData.boatTextArr[1]"></div>
			<hr v-if="computedPopupData.rawTile.boatTextArr[1] !== ''" />
			<div v-html="computedPopupData.winterBoatText"></div>
			<template v-if="computedPopupData.meeplesOnBoat.length > 0">
				<hr />
				<img class="meepleOnPopupImg" v-for="meeple in computedPopupData.greenMeeplesOnBoat" :key="meeple" :src="view.getImage('meeple_green')" alt="meeple" />
				<img class="meepleOnPopupImg" v-for="meeple in computedPopupData.meeplesOnBoat" :key="meeple" :src="view.getImage('meeple_' + meeple)" alt="meeple" />
			</template>
			<template v-if="computedPopupData.skillsOnBoat.length > 0">
				<img class="skillOnPopupImg" v-for="skill in computedPopupData.skillsOnBoat" :key="skill" :src="view.getImage('skillTile_' + skill)" alt="skill" />
			</template>
			<img v-for="cabin in computedPopupData.cabinsOnBoat" :key="cabin" class="cabinOnPopupImg" :src="view.getImage('cabin')" alt="cabin" />
			<!-- contract -->
			<svg v-for="contractNum in computedPopupData.contractsOnBoat" :key="contractNum" viewBox="77 131.5 55.5 34" class="popupContractSVG">
				<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage('c_back')" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
				<path :d="rf.CONTRACT_PATH_D" class="popupContractPath" />
			</svg>
			<!-- Res -->
			<img class="resOnPopupImg" v-for="res in computedPopupData.resourcesOnBoat" :key="res" :src="view.getImage('res_' + res)" alt="res" />
		</template>
		<!-- TURN ORDER TILES -->
		<template v-if="computedPopupData.rawTile.season === rf.SEASON_TURN_ORDER_TILE">
			<div v-html="computedPopupData.turnOrderText"></div>
			<hr />
			<div v-html="computedPopupData.winterText"></div>
		</template>

		<!-- SPRING / SUMMER / AUTUMN - NOT S BOATS -->
		<template v-if="computedPopupData.rawTile.season === rf.SEASON_HOME_TILE || ([rf.SPRING, rf.SUMMER, rf.AUTUMN].includes(computedPopupData.rawTile.season) && !rf.TILE_SUMMER_BOATS.includes(computedPopupData.rawTile.tileID[0]))">
			<div v-html="computedPopupData.normalActionHTML"></div>
			<hr />
			<div v-html="computedPopupData.upgradeCostHTML"></div>
			<hr />
			<div v-html="computedPopupData.upgradedActionHTML"></div>
		</template>
		<!-- S BOATS-->
		<template v-if="[rf.SPRING, rf.SUMMER, rf.AUTUMN].includes(computedPopupData.rawTile.season) && rf.TILE_SUMMER_BOATS.includes(computedPopupData.rawTile.tileID[0])">
			<div v-html="computedPopupData.summerBoatTextSingle"></div>
		</template>
		<!-- WINTER TILES -->
		<template v-if="computedPopupData.rawTile.season === rf.WINTER">
			<div v-html="computedPopupData.winterText"></div>
		</template>
	</div>
</template>

<style scoped>
.infoPopup {
	position: absolute;
	background-color: #eee9e6;
	border: 1px solid black;
	padding: 5px;
	text-align: left;
	z-index: 9999;
	width: 250px;
	min-height: 350px;
}
.hexDiv {
	width: 240px;
	height: 209px;
}

.hexSVG {
	width: 100%;
	height: 100%;
}
.hexPolygon {
	stroke: black;
	stroke-width: 8;
}

.seasonOnPopupTitleImg {
	width: 20px;
	height: 20px;
	vertical-align: middle;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
}

:deep(.vpOnPopupSVG) {
	vertical-align: middle;
}
:deep(.seasonOnPopupImg) {
	width: 40px;
	height: 40px;
	vertical-align: middle;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
}

:deep(.meepleOnPopupImg) {
	width: 40px;
	height: 40px;
	vertical-align: middle;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
}
:deep(.skillOnPopupImg) {
	width: 40px;
	height: 40px;
	vertical-align: middle;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
}
:deep(.cabinOnPopupImg) {
	width: 46px;
	height: 40px;
	vertical-align: middle;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
}

:deep(.resOnPopupImg) {
	height: 40px;
	vertical-align: middle;
}
:deep(.popupContractSVG) {
	width: 80px;
	height: 40px;
	vertical-align: middle;
}
:deep(.popupContractPath) {
	fill: black;
	fill-opacity: 0;
	stroke: black;
	stroke-width: 2;
	stroke-linecap: butt;
	stroke-linejoin: miter;
	stroke-opacity: 1;
}
</style>
