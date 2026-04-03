<script setup>
import * as rf from "../js/KFWreference"
import * as view from "../js/KFWview"

import { ref } from "vue"
const polygonRef = ref(null)

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

const props = defineProps(["tileID_prop"])

const showPopupFunc = () => {
	const rect = polygonRef.value.getBoundingClientRect()
	const xPos = Math.round(rect.left + window.scrollX)
	const yPos = Math.round(rect.top + window.scrollY)
	const width = Math.round(rect.width)
	const height = Math.round(rect.height)

	//alert(`xPos: ${xPos}, yPos: ${yPos}, rect.top: ${rect.top}, width: ${width}, height: ${height}`)

	//if (yPos > rect.top) yPos = Math.round(rect.top)
	// Set the prop data
	//const svgRectDiv = originalMapDivRef.value.getBoundingClientRect()
	//const svgRectDiv = DEBUGmapSVG.value.getBoundingClientRect()

	//store.popupSetter.popupData.wholeSVGheight = svgRectDiv.height
	//store.popupSetter.popupData.popupObjectType = popupObjectType

	let tile = rf.ALL_TILES.find((x) => x.tileID.includes(props.tileID_prop))
	let upgraded = tile.tileID.indexOf(props.tileID_prop)

	let retPos = view.getPopupXY(xPos, yPos, width, height)

	store.popupSetter.xPos = retPos[0]
	store.popupSetter.yPos = retPos[1]

	store.popupSetter.tile_id = tile.id
	store.popupSetter.upgraded = upgraded


	store.popupSetter.showPopup = true
}

function hidePopup() {
	store.popupSetter.showPopup = false
}

function getTileGfx() {
	//let tile = model.getTileFromTileID(props.tileID_prop)
	let tile = rf.ALL_TILES.find((x) => x.tileID.includes(props.tileID_prop))
	let idx = tile.tileID.indexOf(props.tileID_prop)
	return tile.gfx[idx]
}
</script>

<template>
	<div class="hexDiv">
		<svg class="hexSVG" viewBox="-420 -348 840 696" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<pattern :id="getTileGfx()" height="100%" width="100%" patternContentUnits="objectBoundingBox">
					<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(getTileGfx())" />
				</pattern>
			</defs>
			<polygon ref="polygonRef" @mouseover="showPopupFunc()" @mouseout="hidePopup()" class="hexPolygon" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${getTileGfx()})`" />
		</svg>
	</div>
</template>

<style scoped>
.hexDiv {
	display: inline-block;
	vertical-align: middle;
	width: 150px;
	height: 125px;
}

.hexSVG {
	width: 100%;
	height: 100%;
}
.hexPolygon {
	stroke: black;
	stroke-width: 8;
}
</style>
