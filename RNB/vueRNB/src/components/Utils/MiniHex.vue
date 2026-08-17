<script setup>
import * as rf from "../../js/RNBreference"
import * as model from "../../js/RNBmodel"
import * as view from "../../js/RNBview"

import { useModelStore } from "../../stores/RNBstore.js"

import { computed } from "vue"

const store = useModelStore()

const props = defineProps({
	hexID: {
		type: Number,
		required: true,
	},
	scaleFactor: {
		type: Number,
		default: 1, // 1 = original size that fits perfectly in 50×50 px
	},
	bridgehighlight: {
		type: Array,
		required: false,
	},
	hexPiecesToOutline: {
		type: Array,
		required: false,
	},
	riversToOutline: {
		type: Array,
		required: false,
	},
	shoresToOutline: {
		type: Array,
		required: false,
	},
	halfShoresToOutline: {
		type: Array,
		required: false,
	},
	wallsToOutline: {
		type: Array,
		required: false,
	},
	buildingNonMineNum: {
		type: Number,
		required: false,
		default: -1,
	},
	transporterGfx: {
		type: String,
		required: false,
		default: "",
	},
	resGfx: {
		type: String,
		required: false,
		default: "",
	}
})

const hexData = computed(() => {
	let ret =  model.getHexByID(props.hexID, "MiniHex")
	if (!ret) ret = model.getHexByID(0, "emergencyCheck")
	return ret
})

// Combine rotation + scaling in one transform for performance
const hexTransform = computed(() => {
	const rot = store.hexStyle === rf.POINTY ? hexData.value.rotation * 60 : hexData.value.rotation * 60 + 30

	//const scale = props.scaleFactor
	return `rotate(${rot} 0 0)` // scale(${scale})`
})
</script>

<template>
	<div class="miniHexContainer" :style="{ width: 50 * props.scaleFactor + 'px', height: 50 * props.scaleFactor + 'px' }">
		<svg v-if="hexData.hexID >= 0" class="miniHexSvg" :viewBox="store.hexStyle === rf.POINTY ? '-400 -464 800 928' : '-462.692 -401.000 925 802'">
			<!-- BASE HEX -->
			<polygon points="0.000,-463.127 399.692,-231.564 399.692,231.564 0.000,463.127 -399.692,231.564 -399.692,-231.564" class="hexPolygon" :fill="`url(#pattern${hexData.hexGfx})`" :transform="hexTransform" />

			<!-- BUILDING-->
			<rect v-if="buildingNonMineNum >= 0" class="buildingOnMiniHex" width="500" height="500" x="-250" y="-250" :fill="`url(#pattern_bldg_${buildingNonMineNum})`" />

			<!-- TRANSPORTER -->
			<image v-if="transporterGfx != ''" width="500" x="-250" y="-250" :xlink:href="view.getImage(transporterGfx)" preserveAspectRatio="none" />

			<!-- RES -->
			<image v-if="resGfx != ''" width="500" x="-250" y="-250" :xlink:href="view.getImage(resGfx)" preserveAspectRatio="none" />
			 
			<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 30 : 0} 0 0)`">
				<!-- BRIDGE OPTIONS -->
				<g v-for="(entry, idx) in bridgehighlight" :key="idx">
					<path :d="view.getBridgeSVGpath(entry[0], entry[1], true, false, true).bridgeD" class="filledPath" />
				</g>

				<!-- SHORES TO Highlight -->
				<g v-for="(entry, idx) in shoresToOutline" :key="idx">
					<polygon :points="view.getShoreHighlightPoints(entry, true)" class="outlinePath" />
				</g>

				<!-- HALF SHORES TO Highlight -->
				<g v-for="(entry, idx) in halfShoresToOutline" :key="idx">
					<polygon :points="view.getHalfShoreHighlightPoints(entry, true)" class="outlinePath" />
				</g>

				<!-- Wall Options -->
				<g v-for="(entry, idx) in wallsToOutline" :key="idx">
					<polygon class="outlinePath" :points="view.getWallSVGpointsFromHexID(entry[0], entry[1], true, false, true)" />
				</g>
			</g>

				<!-- HEX PIECES TO Highlight -->
				<g v-for="(entry, idx) in hexPiecesToOutline" :key="idx">
					<path :d="view.getHexHighlightPath(entry[0], entry[1], true)" :transform="hexTransform" class="outlinePath" />
				</g>

				<!-- RIVER PIECES TO Outline -->
				<g v-for="(entry, idx) in riversToOutline" :key="idx">
					<path :d="view.getRiverHighlightPath(entry[0], entry[1], true)" :transform="hexTransform" class="outlinePath" />
				</g>

				
		</svg>
	</div>
</template>

<style scoped>
.miniHexContainer {
	display: inline-block;
}

.miniHexSvg {
	width: 100%;
	height: 100%;
	/* background-color: aqua;*/
}

.hexPolygon {
	pointer-events: visiblePainted;
	stroke: black;
	stroke-width: 2px;
	cursor: pointer;
}

.outlinePath {
	stroke: yellow;
	stroke-width: 70px;
	fill: none;
}

.filledPath {
	stroke: yellow;
	stroke-width: 70px;
	fill: yellow;
}

.buildingOnMiniHex {
	stroke: aliceblue;
	stroke-width: 20;
}
</style>
