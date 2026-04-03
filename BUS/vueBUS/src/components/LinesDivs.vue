<script setup>
import { motion } from "motion-v"
import * as view from "../js/BUSview.js"
//import * as funcs from "../js/BUSfuncs.js"
import * as rf from "../js/BUSreference.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"

import { ref, onMounted, watch, nextTick, computed } from "vue"

// Track animated lines to avoid re-animating existing lines
const animatedLines = ref(new Set())

// Check if a line is new (for animation)
function isNewLine(lineID, lineIndex) {
	const lineKey = `${lineID}-${lineIndex}`
	return animatedLines.value.has(lineKey)
}

// Mark a line as animated
function markLineAsAnimated(lineID, lineIndex) {
	const lineKey = `${lineID}-${lineIndex}`
	animatedLines.value.add(lineKey)
}

function changeFillColor(e) {
	e.target.style.fill = rf.getColourNameFromNumber(personal.getCorrectedColour(controller.currentPlayerObj().colour))
	e.target.style.stroke = rf.getColourNameFromNumber(personal.getCorrectedColour(controller.currentPlayerObj().colour))
	e.target.style["fill-opacity"] = 1
}
function resetFillColor(e) {
	e.target.style.fill = "white"
	e.target.style.stroke = "yellow"
	e.target.style["fill-opacity"] = 0
}
function addNewLine(lineID) {
	store.context.historyObj.push([lineID, store.lines[lineID].length])
	store.context.linesLeftToPlace--

	let startedEqual = model.addLine_core(controller.currentPlayerIndex(), lineID)

	// Mark the new line segment for animation
	const lineIndex = store.lines[lineID].length - 1
	markLineAsAnimated(lineID, lineIndex)

	let endJuncs = view.getJunctionsAtEndOfLine(lineID)
	if (store.gameflow.turn !== 0 && !startedEqual) {
		//console(`player.endJunctions: ${controller.currentPlayerObj().endJunctions}  -- endJuncs: ${endJuncs}`)

		// ELSE find the new end junctions possibilities
		if ((controller.currentPlayerObj().endJunctions[0] === endJuncs[0] && controller.currentPlayerObj().endJunctions[1] === endJuncs[1]) || (controller.currentPlayerObj().endJunctions[1] === endJuncs[0] && controller.currentPlayerObj().endJunctions[0] === endJuncs[1])) {
			// Need to highlight which junction to pick
			store.context.endJunctionsOptions = [lineID, [...endJuncs]]
			return
		}
	}
}

function selectedEndJunction(junction) {
	controller.currentPlayerObj().endJunctions = [junction, junction]
	for (let i = 0; i < controller.currentPlayerObj().endLines.length; i++) {
		// if junction not at end of line, update it
		if (!view.getLinesAroundJunction(junction).includes(controller.currentPlayerObj().endLines[i])) {
			controller.currentPlayerObj().endLines[i] = store.context.endJunctionsOptions[0]
		}
	}
	store.context.endJunctionsOptions = []
}

function getStrokeWidthForBusLine() {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE) return 2
	if (personal.selectedBoard === rf.BOARD_OG) return 3
}

function getStrokeColourForBusLine(line) {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE) return "black"
	if (personal.selectedBoard === rf.BOARD_OG) {
		return "white"
		return rf.getColourNameFromNumber(personal.getCorrectedColour(line))
	}
}

// Calculate arrow direction based on line end data
function getArrowDirection(circleObj) {
	// Prevent the "undefined" error
	if (!circleObj || !circleObj.fromJunction) return 0

	const fromPos = view.getBuildingPos(circleObj.fromJunction, -1)
	const toPos = view.getBuildingPos(circleObj.toJunction, -1)

	// Safety check for position data
	if (!fromPos || !toPos) return 0

	// getBuildingPos usually returns [top, left] -> [y, x]
	const deltaY = toPos[0] - fromPos[0]
	const deltaX = toPos[1] - fromPos[1]

	const angle = Math.atan2(deltaY, deltaX)
	let degrees = angle * (180 / Math.PI)

	return degrees + 90
}

const lineEndCircles = computed(() => {
	let ret = []
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].endLines.length; j++) {
			const player = store.players[i]
			const endLine = player.endLines[j]
			const lineOffset = store.lines[endLine].indexOf(player.colour)
			const rawPoints = view.getLineSVGpoints(endLine, lineOffset, true)

			// TARGET POSITION
			const junctions = view.getJunctionsAtEndOfLine(endLine)
			const targetJuncIndex = junctions.indexOf(player.endJunctions[j])
			const shiftTarget = targetJuncIndex === 1 ? 4 : 0

			const correctedX = rawPoints[0 + shiftTarget] + (rawPoints[2 + shiftTarget] - rawPoints[0 + shiftTarget]) / 2
			const correctedY = rawPoints[1 + shiftTarget] + (rawPoints[3 + shiftTarget] - rawPoints[1 + shiftTarget]) / 2

			// START POSITION (The other end of the line)
			// Use the index that ISN'T the target junction
			const startJunctionIndex = targetJuncIndex === 0 ? 1 : 0
			//const shiftStart = startJunctionIndex === 1 ? 0 : 4

			const shiftStart = shiftTarget === 4 ? 0 : 4

			const startCorrectedX = rawPoints[0 + shiftStart] + (rawPoints[2 + shiftStart] - rawPoints[0 + shiftStart]) / 2
			const startCorrectedY = rawPoints[1 + shiftStart] + (rawPoints[3 + shiftStart] - rawPoints[1 + shiftStart]) / 2
			ret.push({
				id: `p${i}-l${j}-${endLine}`, // Stable ID for the key!
				colour: player.colour,
				x: correctedX,
				y: correctedY,
				startX: startCorrectedX,
				startY: startCorrectedY,
				fromJunction: junctions[startJunctionIndex],
				toJunction: junctions[targetJuncIndex],
			})
		}
	}
	return ret
})
</script>

<template>
	<svg id="svgLayer">
		<pattern id="innerPattern" x="3" y="3" width="9" height="9" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="6" height="6" style="stroke: none; fill: #ff0000" />
		</pattern>

		<!-- render the played lines -->
		<g v-for="(lines, index1) in store.lines" v-bind:key="`lines-${index1}`">
			<polygon
				v-for="(line, index2) in lines"
				v-bind:key="`${index1}-${index2}-${line}`"
				:data-line-key="`${index1}-${index2}`"
				:data-line-id="index1"
				:data-line-index="index2"
				:class="{ 'new-line': isNewLine(index1, index2) }"
				:points="view.getLineSVGpoints(index1, index2)"
				:style="{
					stroke: getStrokeColourForBusLine(line),
					'stroke-width': getStrokeWidthForBusLine(),
					fill: rf.getColourNameFromNumber(personal.getCorrectedColour(line)),
					//fill: url(#outerPattern),
				}"></polygon>
		</g>

		<!-- Add Line End circles -->
		<!-- Add Line End circles -->
		<motion.g
    v-for="(circle, index) in lineEndCircles"
    :key="`${circle.id}-${circle.x}-${circle.y}`"
    :initial="{ transform: `translate(${circle.startX - circle.x}px, ${circle.startY - circle.y}px)` }"
    :animate="{ transform: 'translate(0px, 0px)' }"
    :transition="{ duration: 2.0, ease: 'circOut' }"
>
			<circle :cx="circle.x" :cy="circle.y" :r="(store.refSize * 7) / 100" :fill="rf.getColourNameFromNumber(personal.getCorrectedColour(circle.colour))" stroke="black" stroke-width="2" />
			<!-- Arrow uses circle.x and circle.y for center -->
			<path
				:d="`M ${circle.x} ${circle.y - (store.refSize * 7) / 100} 
       L ${circle.x - (store.refSize * 3.5) / 100} ${circle.y + (store.refSize * 3.5) / 100} 
       L ${circle.x + (store.refSize * 3.5) / 100} ${circle.y + (store.refSize * 3.5) / 100} Z`"
				:transform="`rotate(${getArrowDirection(circle, index)} ${circle.x} ${circle.y})`"
				fill="white"
				stroke="black"
				:stroke-width="1 * (store.refSize / 100)" />
		</motion.g>

		<!-- render the Lines option -->
		<polygon class="lineOption" v-for="(option, index) in model.getLinePlacementOptions(personal.getCorrectedColour(controller.currentPlayerObj().colour))" v-bind:key="index" :points="view.getLineSVGpoints(option, 10, false)" style="fill: white; stroke: yellow; stroke-width: 3" @mouseover="changeFillColor" @mouseout="resetFillColor" @click="addNewLine(option)" />

		<!-- Render the HISTORY HIGHLIGH -->
		<polygon class="lineHistory" v-for="(line, index) in store.historyHelpers.linesToHighlight" v-bind:key="index" :points="view.getLineSVGpoints(line[0], line[1], false)" />
	</svg>

	<!-- Render the circle Line option -->
	<template v-if="store.context.endJunctionsOptions.length > 0">
		<div
			v-for="junction in store.context.endJunctionsOptions[1]"
			v-bind:key="junction"
			:style="{
				top: getBuildingPos(junction, -1, true)[0] + 'px',
				left: getBuildingPos(junction, -1, true)[1] + 'px',
				width: (store.refSize * 32) / 100 + 'px',
				height: (store.refSize * 32) / 100 + 'px',
				border: String((store.refSize * 5) / 100) + 'px solid yellow',
			}"
			class="endJuncOption"
			@click="selectedEndJunction(junction)"></div>
	</template>
</template>

<style scoped>
.endJuncOption {
	position: absolute;
	z-index: 10;
	border-radius: 100%;
	border-color: yellow;
}

.endJuncOption:hover {
	border-color: lightgreen !important;
}

#svgLayer {
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
	/*z-index: 20;*/
}

.lineOption {
	z-index: 20;
	fill-opacity: 0;
}
.lineOption:hover {
	cursor: pointer;
}

.lineHistory {
	opacity: 0.5;
	fill: yellow;
	stroke: yellow;
	stroke-width: 30;
}

/* Simple fade-in animation for new lines */
.new-line {
	animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
</style>
