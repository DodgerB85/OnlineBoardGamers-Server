<script setup>
/** Display the wonder board - bricks part only
 * Allows auto-cropping for player number, and scaling to set W/H
 *
 *
 *
 */

import * as view from "../js/RNBview"
import * as rf from "../js/RNBreference"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

const props = defineProps({
	totalWidth: {
		type: Number,
		required: false,
	},
	totalHeight: {
		type: Number,
		required: false,
	},
	cropTo6players: {
		type: Boolean,
		required: false,
	},
	cropTo5players: {
		type: Boolean,
		required: false,
	},
	cropTo3or4players: {
		type: Boolean,
		required: false,
	},
	cropTo2players: {
		type: Boolean,
		required: false,
	},
})

const totalWidth = computed(() => {
	if (props.totalWidth) {
		return props.totalWidth
	}
	return (props.totalHeight / 744) * 670
})

const totalHeight = computed(() => {
	if (props.totalHeight) {
		return props.totalHeight
	}

	if (props.cropTo6players === true) {
		// Show only from px 85,84 with width 499 and height 540
		return (props.totalWidth / 499) * 536
	}
	if (props.cropTo5players === true) {
		// fromX, fromY, width, height
		return (props.totalWidth / 499) * 499
	}
	if (props.cropTo3or4players === true) {
		// Show only from px 85,84 with width 499 and height 540
		return (props.totalWidth / 499) * 463
	}
	if (props.cropTo2players === true) {
		// Show only from px 85,84 with width 499 and height 540
		return (props.totalWidth / 428) * 427
	}

	// This only works with no cropping.
	return (props.totalWidth / 670) * 744
})

const dynamicViewBox = computed(() => {
	if (props.cropTo6players === true) {
		// Show only from px 85,84 with width 499 and height 540
		return "85 86 499 536"
	}
	if (props.cropTo5players === true) {
		// fromX, fromY, width, height
		return "85 122 499 499"
	}
	if (props.cropTo3or4players === true) {
		// Show only from px 85,84 with width 499 and height 540
		return "85 158 499 463"
	}
	if (props.cropTo2players === true) {
		// Show only from px 85,84 with width 499 and height 540
		return "120 194 428 427"
	}
	// Default: Show the whole 670x744 image
	return "0 0 670 744"
})

function getWonderBrickPosition(idx) {
	const brickWidth = 68
	const brickHeight = 32
	let centerPos = [0, 0]
	// ROW 1    -- 68 x 32
	if (idx === 0) centerPos = [228, 602]
	else if (idx === 1) centerPos = [299, 602]
	else if (idx === 2) centerPos = [370, 602]
	else if (idx === 3) centerPos = [441, 602]
	// ROW 2
	else if (idx === 4) centerPos = [228, 566]
	else if (idx === 5) centerPos = [299, 566]
	else if (idx === 6) centerPos = [370, 566]
	else if (idx === 7) centerPos = [441, 566]
	// ROW 3
	else if (idx === 8) centerPos = [228, 530]
	else if (idx === 9) centerPos = [299, 530]
	else if (idx === 10) centerPos = [370, 530]
	else if (idx === 11) centerPos = [441, 530]
	// ROW 4
	else if (idx === 12) centerPos = [192, 495]
	else if (idx === 13) centerPos = [263, 495]
	else if (idx === 14) centerPos = [334, 495]
	else if (idx === 15) centerPos = [405, 495]
	else if (idx === 16) centerPos = [476, 495]
	// ROW 5
	else if (idx === 17) centerPos = [192, 460]
	else if (idx === 18) centerPos = [263, 460]
	else if (idx === 19) centerPos = [334, 460]
	else if (idx === 20) centerPos = [405, 460]
	else if (idx === 21) centerPos = [476, 460]
	// ROW 6
	else if (idx === 22) centerPos = [192, 425]
	else if (idx === 23) centerPos = [263, 425]
	else if (idx === 24) centerPos = [334, 425]
	else if (idx === 25) centerPos = [405, 425]
	else if (idx === 26) centerPos = [476, 425]
	// ROW 7
	else if (idx === 27) centerPos = [192, 390]
	else if (idx === 28) centerPos = [263, 390]
	else if (idx === 29) centerPos = [334, 390]
	else if (idx === 30) centerPos = [405, 390]
	else if (idx === 31) centerPos = [476, 390]
	// ROW 8
	else if (idx === 32) centerPos = [157, 352.5]
	else if (idx === 33) centerPos = [228, 352.5]
	else if (idx === 34) centerPos = [299, 352.5]
	else if (idx === 35) centerPos = [370, 352.5]
	else if (idx === 36) centerPos = [441, 352.5]
	else if (idx === 37) centerPos = [512, 352.5]
	// ROW 9
	else if (idx === 38) centerPos = [157, 317.5]
	else if (idx === 39) centerPos = [228, 317.5]
	else if (idx === 40) centerPos = [299, 317.5]
	else if (idx === 41) centerPos = [370, 317.5]
	else if (idx === 42) centerPos = [441, 317.5]
	else if (idx === 43) centerPos = [512, 317.5]
	// ROW 10
	else if (idx === 44) centerPos = [157, 281.5]
	else if (idx === 45) centerPos = [228, 281.5]
	else if (idx === 46) centerPos = [299, 281.5]
	else if (idx === 47) centerPos = [370, 281.5]
	else if (idx === 48) centerPos = [441, 281.5]
	else if (idx === 49) centerPos = [512, 281.5]
	// ROW 11
	else if (idx === 50) centerPos = [157, 246]
	else if (idx === 51) centerPos = [228, 246]
	else if (idx === 52) centerPos = [299, 246]
	else if (idx === 53) centerPos = [370, 246]
	else if (idx === 54) centerPos = [441, 246]
	else if (idx === 55) centerPos = [512, 246]
	// Row 12
	else if (idx === 56) centerPos = [157, 210.5]
	else if (idx === 57) centerPos = [228, 210.5]
	else if (idx === 58) centerPos = [299, 210.5]
	else if (idx === 59) centerPos = [370, 210.5]
	else if (idx === 60) centerPos = [441, 210.5]
	else if (idx === 61) centerPos = [512, 210.5]
	// ROW 12
	else if (idx === 62) centerPos = [124, 175.5]
	else if (idx === 63) centerPos = [194, 175.5]
	else if (idx === 64) centerPos = [264, 175.5]
	else if (idx === 65) centerPos = [335, 175.5]
	else if (idx === 66) centerPos = [406, 175.5]
	else if (idx === 67) centerPos = [477, 175.5]
	else if (idx === 68) centerPos = [548, 175.5]
	// ROW 13
	else if (idx === 69) centerPos = [124, 140]
	else if (idx === 70) centerPos = [194, 140]
	else if (idx === 71) centerPos = [264, 140]
	else if (idx === 72) centerPos = [335, 140]
	else if (idx === 73) centerPos = [406, 140]
	else if (idx === 74) centerPos = [477, 140]
	else if (idx === 75) centerPos = [548, 140]
	// ROW 14
	else if (idx === 76) centerPos = [124, 104]
	else if (idx === 77) centerPos = [194, 104]
	else if (idx === 78) centerPos = [264, 104]
	else if (idx === 79) centerPos = [335, 104]
	else if (idx === 80) centerPos = [406, 104]
	else if (idx === 81) centerPos = [477, 104]
	else if (idx === 82) centerPos = [548, 104]
	else rf.doAdminAlrt("getWonderBrickPosition(" + idx + ")")

	return [centerPos[0] - brickWidth / 2, centerPos[1] - brickHeight / 2]
}

function getBorderRadius() {
	if (props.cropTo2players === true || props.cropTo3or4players === true || props.cropTo5players === true || props.cropTo6players === true) return "0px"
	return (113 * totalWidth.value) / 2000 + "px"
}

function getWonderBrickFill(playerIndex) {
	if (playerIndex >= 8) return `url(#pattern_wonder_brick_${playerIndex})`
	return `url(#pattern_wonder_brick_${personal.getCorrectedColour(store.players[playerIndex].colour)})`
}
</script>
<template>
	<div
		id="wholeWonder"
		:style="{
			width: totalWidth + 'px',
			height: totalHeight + 'px',
			borderRadius: getBorderRadius(),
		}">
		<svg id="wonderSVG" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" :viewBox="dynamicViewBox">
			<!-- Always keep the image at its original full size -->
			<image :xlink:href="view.getImage('wonder')" x="0" y="0" width="670" height="744" preserveAspectRatio="xMidYMid meet" />

			<rect v-for="(entry, idx) in store.wonderBricks.filter((e) => e !== -1)" :key="idx" :x="getWonderBrickPosition(idx)[0]" :y="getWonderBrickPosition(idx)[1]" width="68" height="32" :fill="getWonderBrickFill(entry)" stroke="black" stroke-width="1" />
		</svg>
	</div>
</template>
<style scoped>
#wholeWonder {
	border: 1px solid black;
	box-sizing: border-box;
	overflow: hidden;
	background-color: red;
}
</style>
