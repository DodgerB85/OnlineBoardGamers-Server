<script setup>
import { getLineSVGpoints, getBuildingPos } from "../composables/view.js"
import * as refFuncs from "../refFuncs"
import * as constants from "../constants"

import { useModelStore } from "../stores/model.js"
const model = useModelStore()
import { usePersonalStore } from "../stores/personal.js"
const personal = usePersonalStore()

function changeFillColor(e) {
	e.target.style.fill = constants.getColourNameFromNumber(personal.getCorrectedColour(model.currentPlayer().colour))
	e.target.style.stroke = constants.getColourNameFromNumber(personal.getCorrectedColour(model.currentPlayer().colour))
	e.target.style["fill-opacity"] = 1
}
function resetFillColor(e) {
	e.target.style.fill = "white"
	e.target.style.stroke = "yellow"
	e.target.style["fill-opacity"] = 0
}
function addNewLine(lineID) {
	model.context.historyObj.push([lineID, model.lines[lineID].length])
	model.context.linesLeftToPlace--

	let startedEqual = model.addLine_core(model.currentPlayerIndex(), lineID)

	let endJuncs = model.getJunctionsAtEndOfLine(lineID)
	if (model.gameflow.turn !== 0 && !startedEqual) {
    //alert(`player.endJunctions: ${model.currentPlayer().endJunctions}  -- endJuncs: ${endJuncs}`)

		// ELSE find the new end junctions possibilities
		if ((model.currentPlayer().endJunctions[0] === endJuncs[0] && model.currentPlayer().endJunctions[1] === endJuncs[1]) || (model.currentPlayer().endJunctions[1] === endJuncs[0] && model.currentPlayer().endJunctions[0] === endJuncs[1])) {
      // Need to highlight which junction to pick
			model.context.endJunctionsOptions = [lineID, [...endJuncs]]
			return
		}
	}
}

function selectedEndJunction(junction) {
	model.currentPlayer().endJunctions = [junction, junction]
	for (let i = 0; i < model.currentPlayer().endLines.length; i++) {
		// if junction not at end of line, update it
		if (!refFuncs.getLinesAroundJunction(junction).includes(model.currentPlayer().endLines[i])) {
			model.currentPlayer().endLines[i] = model.context.endJunctionsOptions[0]
		}
	}
	model.context.endJunctionsOptions = []
}

function getStrokeWidthForBusLine() {
	if (personal.selectedBoard === 0 || personal.selectedBoard === 2) return 2
	if (personal.selectedBoard === 1) return 3
}

function getStrokeColourForBusLine(line) {
	if (personal.selectedBoard === 0 || personal.selectedBoard === 2) return "black"
	if (personal.selectedBoard === 1) {
		return "white"
		return constants.getColourNameFromNumber(personal.getCorrectedColour(line))
	}
}
</script>

<template>
	<svg id="svgLayer">
		<pattern id="innerPattern" x="3" y="3" width="9" height="9" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="6" height="6" style="stroke: none; fill: #ff0000" />
		</pattern>

		<!-- render the played lines -->
		<g v-for="(lines, index1) in model.lines" v-bind:key="index1">
			<polygon
				v-for="(line, index2) in lines"
				v-bind:key="index2"
				:points="getLineSVGpoints(index1, index2)"
				:style="{
					stroke: getStrokeColourForBusLine(line),
					'stroke-width': getStrokeWidthForBusLine(),
					fill: constants.getColourNameFromNumber(personal.getCorrectedColour(line)),
					//fill: url(#outerPattern),
				}"></polygon>
		</g>

		<!-- Add Line End circles -->
		<g v-for="(line, index) in model.getLineEndCircleData()" v-bind:key="index">
			<circle
				:cx="line[1]"
				:cy="line[2]"
				:r="(model.refSize * 7) / 100"
				:style="{
					stroke: 'black',
					'stroke-width': 2,
					fill: constants.getColourNameFromNumber(personal.getCorrectedColour(line[0])),
				}"></circle>
		</g>

		<!-- render the Lines option -->
		<polygon class="lineOption" v-for="(option, index) in model.getLinePlacementOptions(personal.getCorrectedColour(model.currentPlayer().colour))" v-bind:key="index" :points="getLineSVGpoints(option, 10, false)" style="fill: white; stroke: yellow; stroke-width: 3" @mouseover="changeFillColor" @mouseout="resetFillColor" @click="addNewLine(option)" />

		<!-- Render the HISTORY HIGHLIGH -->
		<polygon class="lineHistory" v-for="(line, index) in model.historyHelpers.linesToHighlight" v-bind:key="index" :points="getLineSVGpoints(line[0], line[1], false)" />
	</svg>

	<!-- Render the circle Line option -->
	<template v-if="model.context.endJunctionsOptions.length > 0">
		<div
			v-for="junction in model.context.endJunctionsOptions[1]"
			v-bind:key="junction"
			:style="{
				top: getBuildingPos(junction, -1, true)[0] + 'px',
				left: getBuildingPos(junction, -1, true)[1] + 'px',
				width: (model.refSize * 32) / 100 + 'px',
				height: (model.refSize * 32) / 100 + 'px',
				border: String((model.refSize * 5) / 100) + 'px solid yellow',
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
</style>
