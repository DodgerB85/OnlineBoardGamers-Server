<script setup>
import * as map from "../js/TGZmap"
import * as view from "../js/TGZview"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
</script>

<template>
	<!-- HIGHLIGHT SQUARES GREEN -->
	<template v-for="(index, indexCount) in store.historyHelpers.indexesToHighlightGreen" :key="indexCount">
		<svg
			class="higlightSquareGreen"
			:style="{
				width: (store.refSize * 38) / 240 + 'px',
				height: (store.refSize * 38) / 240 + 'px',
				top: view.getIndexPos(index)[0] + 'px',
				left: view.getIndexPos(index)[1] + 'px',
			}">
			<rect
				:style="{
					width: '100%',
					height: '100%',
				}" />
		</svg>
	</template>

	<!-- HIGHLIGHT SQUARES RED -->
	<template v-for="(index, indexCount) in store.context.indexesToHighlightRedXX" v-bind:key="indexCount">
		<svg
			class="higlightSquareRed"
			:style="{
				width: (store.refSize * 38) / 240 + 'px',
				height: (store.refSize * 38) / 240 + 'px',
				top: view.getIndexPos(index)[0] + 'px',
				left: view.getIndexPos(index)[1] + 'px',
			}">
			<rect
				:style="{
					width: '100%',
					height: '100%',
				}" />
		</svg>
	</template>

	<!-- PIP SQUARES GREEN -->
	<template v-for="(index, indexCount) in store.context.indexesToPipGreenXX" v-bind:key="indexCount">
		<div
			class="pipSquaresGreen"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPos(index)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPos(index)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"
			:class="map.getTakenResourceSquaresForCraftsman(store.context.itemBeingAdded, store.context.range).includes(index) ? 'crossBackground' : ''"></div>
	</template>

	<!-- PIP SQUARES RED -->
	<template v-for="(index, indexCount) in store.context.indexesToPipRedXX" v-bind:key="indexCount">
		<div
			class="pipSquaresRed"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPos(index)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPos(index)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"
			:class="map.getTakenResourceSquaresForCraftsman(store.context.itemBeingAdded, store.context.range).includes(index) ? 'crossBackground' : ''"></div>
	</template>

	<!-- PIP CRAFTSMAN DATA GREEN -->
	<template v-for="(craftsmanData, indexCount) in store.context.craftsmanDataToPipGreenXX" v-bind:key="indexCount">
		<div
			class="pipSquaresGreen"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPosForCraftsmanPip(craftsmanData)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPosForCraftsmanPip(craftsmanData)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"></div>
	</template>

	<!-- PIP CRAFTSMAN DATA RED -->
	<template v-for="(craftsmanData, indexCount) in store.context.craftsmanDataToPipRedXX" :key="indexCount">
		<div
			class="pipSquaresRed"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPosForCraftsmanPip(craftsmanData)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPosForCraftsmanPip(craftsmanData)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"></div>
	</template>

	<img class="ghostImg" ref="ghostImgRef" src="" alt="GI Image" />
	<div class="ghostDiv" ref="ghostDivRef"></div>
</template>

<style scoped>
.higlightSquareGreen,
.higlightSquareRed {
	animation: glow 0.6s infinite alternate;
}

@keyframes glow {
	to {
		opacity: 0.5;
	}
}

.pipSquaresRed,
.pipSquaresGreen {
	position: absolute;
	z-index: 50;
	border-radius: 100%;
	border: 1px solid black;
}

.crossBackground {
	background: linear-gradient(to top left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 2px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 2px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 2px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 2px), rgba(0, 0, 0, 0) 100%);
}

/* IMPORTANT!!!!! THE PIP SQ BACKGROUND MUST BE BELOW THE CROSS-BKGND CSSS */
.pipSquaresRed {
	background-color: lightgray;
}

.pipSquaresGreen {
	background-color: yellow;
}

.higlightSquareGreen,
.higlightSquareRed {
	position: absolute;
	z-index: 9;
	opacity: 0.1;
}

.higlightSquareGreen {
	fill: lightgreen;
}

.higlightSquareRed {
	fill: red;
}

.higlightSquareToClick {
	position: absolute;
	z-index: 100;
	opacity: 0.3;
	fill: yellow;
	cursor: pointer;
	border: 2px solid black;
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

.ghostDiv {
	border: solid black;
	border-radius: 100%;
}
</style>
