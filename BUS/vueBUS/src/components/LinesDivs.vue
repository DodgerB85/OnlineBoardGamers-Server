<script setup>
import { motion } from "motion-v"
import * as view from "../js/BUSview.js"
//import * as funcs from "../js/BUSfuncs.js"
import * as rf from "../js/BUSreference.js"
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

import { ref, computed } from "vue"

// Track animated lines to avoid re-animating existing lines
const animatedLines = ref(new Set())

function getAnimatedLinePolygon(circle, progress = 0.5) {
    const strokeWidth =  store.refSize/12; // Get your 2 or 3px width
    const halfWidth = strokeWidth / 2;

    // 1. Calculate the target point based on progress
    // We draw from Start toward the current circle position (x, y)
    const currentTargetX = circle.startX + (circle.x - circle.startX) * progress;
    const currentTargetY = circle.startY + (circle.y - circle.startY) * progress;

    // 2. Calculate the direction vector of the line
    const dx = currentTargetX - circle.startX;
    const dy = currentTargetY - circle.startY;
    const len = Math.hypot(dx, dy);

    // Safety check: if line is 0 length, return a tiny stub or empty string
    if (len < 0.1) return `${circle.startX},${circle.startY}`;

    // 3. Calculate the Perpendicular Vector (the "width" direction)
    // We rotate the vector 90 degrees and normalize it to 1px
    const nx = (-dy / len) * halfWidth;
    const ny = (dx / len) * halfWidth;

    // 4. Create the 4 corners of the polygon
    // Start side (Points 1 and 2)
    const p1x = circle.startX + nx;
    const p1y = circle.startY + ny;
    const p2x = circle.startX - nx;
    const p2y = circle.startY - ny;

    // End side (Points 3 and 4)
    const p3x = currentTargetX - nx;
    const p3y = currentTargetY - ny;
    const p4x = currentTargetX + nx;
    const p4y = currentTargetY + ny;

    // 5. Return the points string for the <polygon>
    return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`;
}




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

	// Remove .new-line class from all existing lines
	const existingLines = document.querySelectorAll('.new-line')
	existingLines.forEach(line => {
		line.classList.remove('new-line')
	})

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
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS) return 2
	if (personal.selectedBoard === rf.BOARD_OG) return 3
}

function getStrokeColourForBusLine(line) {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS) return "black"
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

	// view.getBuildingPos usually returns [top, left] -> [y, x]
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
				fromJunctionIndex: startJunctionIndex,
				toJunctionIndex: targetJuncIndex,
				endLineID: endLine, // Add this to match index1
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
			<g v-for="(line, index2) in lines" v-bind:key="`${index1}-${index2}-${line}`">
				<!-- Render the actual line -->
				<polygon
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
				<!-- Add animated growing line for new lines -->
				<g v-for="circle in lineEndCircles" :key="`${circle.id}-${circle.x}-${circle.y}`">
					<motion.polygon
						v-if="isNewLine(index1, index2)  && circle.endLineID === index1"
						:points="getAnimatedLinePolygon(circle, 0.1)"
						:initial="{ }"
						:animate="{ points: getAnimatedLinePolygon(circle, 1) }"
						:transition="{ duration: 2.0, ease: 'circOut' }"
						:style="{
							stroke: 'black',
							'stroke-width': 2,
							fill: rf.getColourNameFromNumber(personal.getCorrectedColour(circle.colour)),
							'pointer-events': 'none',
						}"></motion.polygon>
				</g>
			</g>
		</g>

		<!-- Add Line End circles -->
		<!-- Add Line End circles -->
		<motion.g v-for="(circle, index) in lineEndCircles" :key="`${circle.id}-${circle.x}-${circle.y}`" :initial="{ transform: `translate(${circle.startX - circle.x}px, ${circle.startY - circle.y}px)` }" :animate="{ transform: 'translate(0px, 0px)' }" :transition="{ duration: 2.0, ease: 'circOut' }">
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
				top: view.getBuildingPos(junction, -1, true)[0] + 'px',
				left: view.getBuildingPos(junction, -1, true)[1] + 'px',
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

.new-line {
    opacity: 0;
    /* 
       0.01s: The duration of the 'show' (makes it feel like a snap)
       2.0s:  MATCHES your motion.g transition duration
       forwards: Ensures it stays visible after the animation ends
    */
    animation: showFullLine 0.01s linear 2.0s forwards;
}

@keyframes showFullLine {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>
