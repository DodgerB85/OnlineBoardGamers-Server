<script setup>
import * as rf from "../js/BUSreference.js"
import * as view from "../js/BUSview.js"
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"

const ghostBuildingRef = ref(null)
const plopAnimationRef = ref(null)

function ghostBuilding(e, junction, building, add) {
	if (!add) {
		ghostBuildingRef.value.style.display = "none"
		if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS) e.target.style.border = String((store.refSize * 5) / 100) + "px solid yellow"
		if (personal.selectedBoard === rf.BOARD_OG) e.target.style.border = String((store.refSize * 3) / 100) + "px solid yellow"
	} else {
		if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS) {
			ghostBuildingRef.value.src = view.getImage("building" + String(store.context.selectedBuildingType))
			ghostBuildingRef.value.style.display = "block"
			const position = view.getBuildingPos(junction, building)
			ghostBuildingRef.value.style.top = position[0] + "px"
			ghostBuildingRef.value.style.left = position[1] + "px"

			// Make ghost building slightly larger to fill highlight circle
			const ghostSize = (store.refSize * getBuildingRadius()) / 100
			ghostBuildingRef.value.style.width = (ghostSize * 1.1) + "px"
			ghostBuildingRef.value.style.height = (ghostSize * 1.1) + "px"
			// Center the ghost building in the highlight circle
			ghostBuildingRef.value.style.transform = "translate(-5%, -5%)"
		} else if (personal.selectedBoard === rf.BOARD_OG) {
			ghostBuildingRef.value.src = view.getImage("building" + String(store.context.selectedBuildingType) + "_orig")
			ghostBuildingRef.value.style.display = "block"
			ghostBuildingRef.value.style.top = view.getBuildingPos(junction, building)[0] + "px"
			ghostBuildingRef.value.style.left = view.getBuildingPos(junction, building)[1] + "px"
			ghostBuildingRef.value.style.width = (store.refSize * 30) / 100 + "px"
			ghostBuildingRef.value.style.height = (store.refSize * 30) / 100 + "px"
			ghostBuildingRef.value.style.transform = "rotate(" + view.getBuildingPos(junction, building)[2] + "deg)"
		}
		if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS) e.target.style.border = String((store.refSize * 5) / 100) + "px solid lightgreen"
		if (personal.selectedBoard === rf.BOARD_OG) e.target.style.border = String((store.refSize * 3) / 100) + "px solid lightgreen"
	}
}
function mouseOverVromBuilding(e, junction, add) {
	if (!add) {
		if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS) e.target.style.border = String((store.refSize * 5) / 100) + "px solid yellow"
		if (personal.selectedBoard === rf.BOARD_OG) e.target.style.border = String((store.refSize * 3) / 100) + "px solid yellow"
	} else {
		if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS) e.target.style.border = String((store.refSize * 5) / 100) + "px solid lightgreen"
		if (personal.selectedBoard === rf.BOARD_OG) e.target.style.border = String((store.refSize * 3) / 100) + "px solid lightgreen"
	}
}

function playPlopAnimation(junction, building) {
	let position
	let buildingImage
	let buildingWidth, buildingHeight
	
	if (personal.selectedBoard === rf.BOARD_OG) {
		position = view.getBuildingPos(junction, building, false)
		buildingImage = `building${String(store.context.selectedBuildingType % 10)}_orig`
		// OG board uses fixed square dimensions
		buildingWidth = (store.refSize * 30) / 100
		buildingHeight = (store.refSize * 30) / 100
	} else {
		position = view.getBuildingPos(junction, building, false)
		buildingImage = `building${String(store.context.selectedBuildingType)}`
		// Other boards use circle radius
		const buildingRadius = getBuildingRadius()
		buildingWidth = (store.refSize * buildingRadius) / 100
		buildingHeight = (store.refSize * buildingRadius) / 100
	}
	
	// Set up the animation element with building image
	plopAnimationRef.value.style.backgroundImage = `url(${view.getImage(buildingImage)})`
	plopAnimationRef.value.style.backgroundSize = 'contain'
	plopAnimationRef.value.style.backgroundRepeat = 'no-repeat'
	plopAnimationRef.value.style.backgroundPosition = 'center'
	plopAnimationRef.value.style.top = position[0] + 'px'
	plopAnimationRef.value.style.left = position[1] + 'px'
	plopAnimationRef.value.style.width = buildingWidth + 'px'
	plopAnimationRef.value.style.height = buildingHeight + 'px'
	
	// Add rotation for OG board
	let baseTransform = ''
	let rotationDeg = '0deg'
	if (personal.selectedBoard === rf.BOARD_OG) {
		const rotationPos = view.getBuildingPos(junction, building, true)
		if (rotationPos.length > 2) {
			rotationDeg = `${rotationPos[2]}deg`
			baseTransform = `rotate(${rotationDeg})`
		}
	}
	plopAnimationRef.value.style.transform = baseTransform
	plopAnimationRef.value.style.setProperty('--base-rotation', rotationDeg)
	
	// Show and play animation
	plopAnimationRef.value.style.display = 'block'
	plopAnimationRef.value.classList.remove('plop-animation')
	// Force reflow to restart animation
	void plopAnimationRef.value.offsetWidth
	plopAnimationRef.value.classList.add('plop-animation')
	
	// Hide after animation completes
	setTimeout(() => {
		plopAnimationRef.value.style.display = 'none'
		plopAnimationRef.value.style.backgroundImage = ''
		plopAnimationRef.value.style.transform = ''
	}, 600)
}

// Clicked free building spot to add building
function clickedBldg(junction, building) {
	// Remove ghost
	ghostBuildingRef.value.style.display = "none"
	// Remove action
	store.context.buildingsLeftToPlace--

	store.context.historyObj.push([store.context.selectedBuildingType, junction, building])

	// Add bldg to junction
	store.junctions[junction][building] = store.context.selectedBuildingType
	// Play plop animation
	playPlopAnimation(junction, building)
}
function highlight(e, entering) {
	if (entering) e.target.style.border = String((store.refSize * 5) / 100) + "px solid lightgreen"
	else e.target.style.border = String((store.refSize * 5) / 100) + "px solid yellow"
}

function playPassengerPlopAnimation(junction) {
	const position = view.getBuildingPos(junction, -1)
	
	// Set up the animation element with passenger image at same position as pax number
	plopAnimationRef.value.style.backgroundImage = `url(${view.getImage('passenger')})`
	plopAnimationRef.value.style.backgroundSize = 'contain'
	plopAnimationRef.value.style.backgroundRepeat = 'no-repeat'
	plopAnimationRef.value.style.backgroundPosition = 'center'
	plopAnimationRef.value.style.top = position[0] + 'px'
	plopAnimationRef.value.style.left = position[1] + 'px'
	plopAnimationRef.value.style.width = (store.refSize * 32) / 100 + 'px'
	plopAnimationRef.value.style.height = (store.refSize * 32) / 100 + 'px'
	
	// Reset rotation for passengers
	plopAnimationRef.value.style.transform = ''
	plopAnimationRef.value.style.setProperty('--base-rotation', '0deg')
	
	// Show and play animation
	plopAnimationRef.value.style.display = 'block'
	plopAnimationRef.value.classList.remove('plop-animation')
	// Force reflow to restart animation
	void plopAnimationRef.value.offsetWidth
	plopAnimationRef.value.classList.add('plop-animation')
	
	// Hide after animation completes
	setTimeout(() => {
		plopAnimationRef.value.style.display = 'none'
		plopAnimationRef.value.style.backgroundImage = ''
	}, 600)
}

function addPassengerToJunction(junction) {
	if (store.remainingPassengers === 0) return
	store.junctions[junction][rf.paxIdx]++
	store.context.passengersLeftToPlace--
	store.remainingPassengers--
	store.context.historyObj.push(junction)

	// Play passenger plop animation
	playPassengerPlopAnimation(junction)

	if (store.remainingPassengers === 0) {
		store.context.turnEndingErrorMessage = "No More Passengers"
		store.context.historyObj.push(-1)
	}
}
function clickedPaxToVrom(junction) {
	if (!model.canPlayerVrom()) return
	if (!controller.currentPlayerObj().playerJunctions.includes(junction)) return
	store.context.selectedPaxToVromJunction = junction
}

function mouseOverPaxNumber(e, junction, entering) {
	if (!model.canPlayerVrom()) return
	if (!controller.currentPlayerObj().playerJunctions.includes(junction)) return
	if (entering) document.getElementById("passengerImg" + String(junction)).classList.add("onHover")
	else document.getElementById("passengerImg" + String(junction)).classList.remove("onHover")
}

function clickedVromBldg(junction, buildingIndex) {
	store.context.historyObj.push([store.context.selectedPaxToVromJunction, junction, buildingIndex])
	// Remove a pax from the junction
	store.junctions[store.context.selectedPaxToVromJunction][rf.paxIdx]--
	// Add onto the building
	store.junctions[junction][buildingIndex] += 10
	// remove a move
	store.context.remainingVroms--
	// Increase scre
	controller.currentPlayerObj().score++
	// reset vars
	store.context.selectedPaxToVromJunction = -1
	model.canPlayerVrom()
}

function getBuildingRadius() {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) return 32
	if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) return 29
	if (personal.selectedBoard === rf.BOARD_PITTS) return 34
}
</script>

<template>
	<!-- Add highlight circles to empty building spots -->
	<template v-if="personal.canPlay() && (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS)">
		<template v-for="(line, index) in model.getEmptyBuildingSpots()" v-bind:key="index">
			<div
				class="buildingSpotDiv"
				v-for="(building, index) in line[1]"
				v-bind:key="index"
				:style="{
					top: view.getBuildingPos(line[0], building, true)[0] + 'px',
					left: view.getBuildingPos(line[0], building, true)[1] + 'px',
					border: String((store.refSize * 5) / 100) + 'px solid yellow',
					width: (store.refSize * getBuildingRadius()) / 100 + 'px',
					height: (store.refSize * getBuildingRadius()) / 100 + 'px',
				}"
				@mouseover="ghostBuilding($event, line[0], building, true)"
				@mouseleave="ghostBuilding($event, line[0], building, false)"
				@click="clickedBldg(line[0], building)"></div>
		</template>
	</template>

	<!-- Render the buildings and pax on the map -->
	<template v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS">
		<template v-for="(line, index) in model.getBuildingsToDisplay()" v-bind:key="index">
			<div
				class="buildingDiv"
				v-for="(building, index) in line[1]"
				v-bind:key="index"
				:style="{
					top: view.getBuildingPos(line[0], building[0])[0] + 'px',
					left: view.getBuildingPos(line[0], building[0])[1] + 'px',
					width: (store.refSize * getBuildingRadius()) / 100 + 'px',
					height: (store.refSize * getBuildingRadius()) / 100 + 'px',
				}">
				<!-- Draw the building -->
				<img class="buildingImg" :src="view.getImage('building' + String(building[1] % 10))" alt="buildingOnJS" />

				<!-- Draw any pax -->
				<img
					v-if="building[1] > 10"
					class="passengerImgBldg"
					:src="view.getImage('passenger')"
					alt="pax"
					:style="{
						top: (store.refSize * 10) / 400 + 'px',
						left: (store.refSize * 4) / 400 + 'px',
						width: (store.refSize * 184) / 1500 + 'px',
						height: (store.refSize * 311) / 1500 + 'px',
					}" />
			</div>
		</template>
	</template>

	<!-- Add pax to junctions -->
	<template v-for="(junction, index) in store.junctions" v-bind:key="index">
		<div
			v-if="junction[rf.paxIdx] > 0"
			:style="{
				top: view.getBuildingPos(index, -1)[0] + 'px',
				left: view.getBuildingPos(index, -1)[1] + 'px',
				width: (store.refSize * 32) / 100 + 'px',
				height: (store.refSize * 32) / 100 + 'px',
			}"
			class="paxJunc">
			<!-- Add pax Img first -->
			<img
				class="passengerImg"
				:id="'passengerImg' + String(index)"
				:src="view.getImage('passenger')"
				alt="pax"
				:style="{
					top: (store.refSize * 0) / 400 + 'px',
					left: (store.refSize * 30) / 400 + 'px',
					width: (store.refSize * 184) / 1000 + 'px',
					height: (store.refSize * 311) / 1000 + 'px',
				}"
				:class="{
					selectablePaxToVrom: model.canPlayerVrom() && controller.currentPlayerObj().playerJunctions.includes(index),
					notSelectablePaxToVrom: !model.canPlayerVrom() || !controller.currentPlayerObj().playerJunctions.includes(index),
					selectedPaxToVrom: store.context.selectedPaxToVromJunction === index,
				}" />
			<!-- Add the number of pax ADD THE PAX CLICK HERE AS IT COVERS BASICALLY THE WHOLE PAX -->
			<div
				class="paxJuncNum"
				:style="{
					top: (store.refSize * 6) / 400 + 'px',
					left: (store.refSize * 30) / 400 + 'px',
					'font-size': (store.refSize * 100) / 400 + 'px',
					'font-family': 'Arial Black',
					width: (store.refSize * 184) / 1000 + 'px',
					height: (store.refSize * 311) / 1000 + 'px',
				}"
				:class="{
					selectablePaxToVromNumber: model.canPlayerVrom() && controller.currentPlayerObj().playerJunctions.includes(index),
				}"
				@click="clickedPaxToVrom(index)"
				@mouseover="mouseOverPaxNumber($event, index, true)"
				@mouseleave="mouseOverPaxNumber($event, index, false)">
				{{ junction[rf.paxIdx] }}
			</div>
		</div>
	</template>

	<!-- Add highlight circles to VROM building spots -->
	<!-- FOR junction in playersJunctions, if junction includes(reqBld) then add a circle there-->
	<template v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS">
		<template v-for="(line, index) in model.getVromBuildings()" v-bind:key="index">
			<div
				class="buildingSpotDiv"
				v-for="(building, index) in line[1]"
				v-bind:key="index"
				:style="{
					top: view.getBuildingPos(line[0], building, true)[0] + 'px',
					left: view.getBuildingPos(line[0], building, true)[1] + 'px',
					border: String((store.refSize * 5) / 100) + 'px solid yellow',
					width: (store.refSize * getBuildingRadius()) / 100 + 'px',
					height: (store.refSize * getBuildingRadius()) / 100 + 'px',
				}"
				@mouseover="mouseOverVromBuilding($event, line[0], true)"
				@mouseleave="mouseOverVromBuilding($event, line[0], false)"
				@click="clickedVromBldg(line[0], building)"></div>
		</template>
	</template>

	<!-- Add highlight circles for pax placement -->
	<template v-if="store.context.passengersLeftToPlace > 0 && store.remainingPassengers > 0 && personal.canPlay()">
		<!-- Standard board uses junctions 10 and 25 -->
		<template v-if="personal.selectedBoard !== rf.BOARD_PITTS">
			<div
				ref="junction10"
				:style="{
					top: view.getBuildingPos(10, -1, true)[0] + 'px',
					left: view.getBuildingPos(10, -1, true)[1] + 'px',
					width: (store.refSize * 32) / 100 + 'px',
					height: (store.refSize * 32) / 100 + 'px',
					border: String((store.refSize * 5) / 100) + 'px solid yellow',
				}"
				class="paxJuncOption"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="addPassengerToJunction(10)"></div>
			<div
				ref="junction25"
				:style="{
					top: view.getBuildingPos(25, -1, true)[0] + 'px',
					left: view.getBuildingPos(25, -1, true)[1] + 'px',
					width: (store.refSize * 32) / 100 + 'px',
					height: (store.refSize * 32) / 100 + 'px',
					border: String((store.refSize * 5) / 100) + 'px solid yellow',
				}"
				class="paxJuncOption"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="addPassengerToJunction(25)"></div>
		</template>
		<!-- Pittsburgh map uses junctions 10 and 26 -->
		<template v-else>
			<div
				ref="junction10"
				:style="{
					top: view.getBuildingPos(5, -1, true)[0] + 'px',
					left: view.getBuildingPos(5, -1, true)[1] + 'px',
					width: (store.refSize * 32) / 100 + 'px',
					height: (store.refSize * 32) / 100 + 'px',
					border: String((store.refSize * 5) / 100) + 'px solid yellow',
				}"
				class="paxJuncOption"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="addPassengerToJunction(5)"></div>
			<div
				ref="junction26"
				:style="{
					top: view.getBuildingPos(30, -1, true)[0] + 'px',
					left: view.getBuildingPos(30, -1, true)[1] + 'px',
					width: (store.refSize * 32) / 100 + 'px',
					height: (store.refSize * 32) / 100 + 'px',
					border: String((store.refSize * 5) / 100) + 'px solid yellow',
				}"
				class="paxJuncOption"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="addPassengerToJunction(30)"></div>
		</template>
	</template>

	<img class="ghostImg" ref="ghostBuildingRef" src="" alt="GI Image" />
	
	<!-- Plop animation element -->
	<div class="plop-animation" ref="plopAnimationRef"></div>

	<!-- HISTORY HELPER -- BUILDINGS (ADD BLDG / VROM TO) -->
	<template v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS">
		<template v-for="(line, index) in store.historyHelpers.buildingsToHighlight" v-bind:key="index">
			<div
				class="history_buildingSpotDiv"
				:style="{
					top: view.getBuildingPos(line[1], line[2], true)[0] + 'px',
					left: view.getBuildingPos(line[1], line[2], true)[1] + 'px',
					border: String((store.refSize * 5) / 100) + 'px solid yellow',
					width: (store.refSize * getBuildingRadius()) / 100 + 'px',
					height: (store.refSize * getBuildingRadius()) / 100 + 'px',
				}"></div>
		</template>
	</template>

	<!-- HISTORY HELPER -- JUNCTIONS VROM FROM -->
	<template v-for="(junction, index) in store.historyHelpers.junctionsToHighlight" v-bind:key="index">
		<div
			:style="{
				top: view.getBuildingPos(junction, -1, true)[0] + 'px',
				left: view.getBuildingPos(junction, -1, true)[1] + 'px',
				width: (store.refSize * getBuildingRadius()) / 100 + 'px',
				height: (store.refSize * getBuildingRadius()) / 100 + 'px',
				border: String((store.refSize * 5) / 100) + 'px solid yellow',
			}"
			class="junctionVromFrom"></div>
	</template>

	<!---------------------------------ORIGINAL BOARD-------------------------------------->
	<!---------------------------------ORIGINAL BOARD-------------------------------------->
	<!---------------------------------ORIGINAL BOARD-------------------------------------->
	<!---------------------------------ORIGINAL BOARD-------------------------------------->

	<!-- Add highlight circles to empty building spots -->
	<template v-if="personal.canPlay() && personal.selectedBoard === rf.BOARD_OG">
		<template v-for="(line, index) in model.getEmptyBuildingSpots()" v-bind:key="index">
			<div
				class="buildingSpotDiv_orig"
				v-for="(building, index) in line[1]"
				v-bind:key="index"
				:style="{
					top: view.getBuildingPos(line[0], building, true)[0] + 'px',
					left: view.getBuildingPos(line[0], building, true)[1] + 'px',
					border: String((store.refSize * 12) / 400) + 'px solid yellow',
					/*'background-color': 'red',*/
					width: (store.refSize * 30) / 100 + 'px',
					height: (store.refSize * 30) / 100 + 'px',
					transform: 'rotate(' + view.getBuildingPos(line[0], building, true)[2] + 'deg)',
				}"
				@mouseover="ghostBuilding($event, line[0], building, true)"
				@mouseleave="ghostBuilding($event, line[0], building, false)"
				@click="clickedBldg(line[0], building)"></div>
		</template>
	</template>

	<!-- Add highlight circles to VROM building spots -->
	<template v-if="personal.selectedBoard === rf.BOARD_OG">
		<template v-for="(line, index) in model.getVromBuildings()" v-bind:key="index">
			<div
				class="buildingSpotDiv_orig"
				v-for="(building, index) in line[1]"
				v-bind:key="index"
				:style="{
					top: view.getBuildingPos(line[0], building, true)[0] + 'px',
					left: view.getBuildingPos(line[0], building, true)[1] + 'px',
					border: String((store.refSize * 12) / 400) + 'px solid yellow',
					width: (store.refSize * 30) / 100 + 'px',
					height: (store.refSize * 30) / 100 + 'px',
					transform: 'rotate(' + view.getBuildingPos(line[0], building, true)[2] + 'deg)',
				}"
				@mouseover="mouseOverVromBuilding($event, line[0], true)"
				@mouseleave="mouseOverVromBuilding($event, line[0], false)"
				@click="clickedVromBldg(line[0], building)"></div>
		</template>
	</template>

	<!-- Render the buildings and pax on the map -->
	<template v-if="personal.selectedBoard === rf.BOARD_OG">
		<template v-for="(line, index) in model.getBuildingsToDisplay()" v-bind:key="index">
			<div
				class="buildingDiv"
				v-for="(building, index) in line[1]"
				v-bind:key="index"
				:style="{
					top: view.getBuildingPos(line[0], building[0], false)[0] + 'px',
					left: view.getBuildingPos(line[0], building[0], false)[1] + 'px',
					width: (store.refSize * 30) / 100 + 'px',
					height: (store.refSize * 30) / 100 + 'px',
					transform: 'rotate(' + view.getBuildingPos(line[0], building[0], true)[2] + 'deg)',
				}">
				<!-- Draw the building -->
				<img class="buildingImg" :src="view.getImage('building' + String(building[1] % 10) + '_orig')" alt="buildingOnJS" />

				<!-- Draw any pax -->
				<img
					v-if="building[1] > 10"
					class="passengerImgBldg"
					:src="view.getImage('passenger')"
					alt="pax"
					:style="{
						top: (store.refSize * 10) / 400 + 'px',
						left: (store.refSize * 4) / 400 + 'px',
						width: (store.refSize * 184) / 1500 + 'px',
						height: (store.refSize * 311) / 1500 + 'px',
					}" />
			</div>
		</template>
	</template>

	<!-- HISTORY HELPER -- BUILDINGS (ADD BLDG / VROM TO) -->
	<template v-if="personal.selectedBoard === rf.BOARD_OG">
		<template v-for="(line, index) in store.historyHelpers.buildingsToHighlight" v-bind:key="index">
			<div
				class="history_buildingSpotDiv_orig"
				:style="{
					top: view.getBuildingPos(line[1], line[2], true)[0] + 'px',
					left: view.getBuildingPos(line[1], line[2], true)[1] + 'px',
					border: String((store.refSize * 3) / 100) + 'px solid yellow',
					width: (store.refSize * 30) / 100 + 'px',
					height: (store.refSize * 30) / 100 + 'px',
					transform: 'rotate(' + view.getBuildingPos(line[1], line[2], true)[2] + 'deg)',
				}"></div>
		</template>
	</template>
</template>

<style scoped>
.history_buildingSpotDiv {
	border: 5px solid yellow;
	border-radius: 100%;
	position: absolute;
	z-index: 100;
	background-color: yellow;
	opacity: 0.5;
}

.history_buildingSpotDiv_orig {
	position: absolute;
	z-index: 100;
	background-color: yellow;
	opacity: 0.5;
}

.ghostImg {
	position: absolute;
	display: none;
}

.paxJunc {
	position: absolute;
	color: white;
	font-size: 20px;
	z-index: 1;
}

.paxJuncOption {
	position: absolute;
	z-index: 10;
	border-radius: 100%;
	border-color: yellow;
}

.paxJuncOption:hover {
	cursor: pointer;
}

.junctionVromFrom {
	position: absolute;
	z-index: 10;
	border-radius: 100%;
	border-color: yellow;
	background-color: yellow;
	opacity: 0.5;
}

.paxJuncOption:hover {
	border-color: lightgreen;
}

.paxJuncNum {
	position: absolute;
	color: white;
	z-index: 12;
	filter: drop-shadow(1px 0 0 black) drop-shadow(0 1px 0 black) drop-shadow(-1px 0 0 black) drop-shadow(0 -1px 0 black);
	cursor: default;
}

.buildingDiv {
	position: absolute;
}

.buildingImg {
	filter: drop-shadow(1px 0 0 black) drop-shadow(0 1px 0 black) drop-shadow(-1px 0 0 black) drop-shadow(0 -1px 0 black);
	width: 100%;
	height: 100%;
}

.passengerImgBldg {
	position: absolute;
}

.passengerImg {
	position: absolute;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
}

.selectablePaxToVrom {
	filter: drop-shadow(4px 0 0 yellow) drop-shadow(0 4px 0 yellow) drop-shadow(-4px 0 0 yellow) drop-shadow(0 -4px 0 yellow);
}

.selectablePaxToVromNumber:hover {
	cursor: pointer;
}

.notSelectablePaxToVrom {
	filter: drop-shadow(4px 0 0 black) drop-shadow(0 4px 0 black) drop-shadow(-4px 0 0 black) drop-shadow(0 -4px 0 black);
}

.onHover {
	filter: drop-shadow(4px 0 0 lightgreen) drop-shadow(0 4px 0 lightgreen) drop-shadow(-4px 0 0 lightgreen) drop-shadow(0 -4px 0 lightgreen);
}

.selectedPaxToVrom {
	filter: drop-shadow(4px 0 0 lightgreen) drop-shadow(0 4px 0 lightgreen) drop-shadow(-4px 0 0 lightgreen) drop-shadow(0 -4px 0 lightgreen) !important;
}

.buildingSpotDiv {
	border-radius: 100%;
	position: absolute;
	z-index: 10;
}

.buildingSpotDiv,
.buildingSpotDiv_orig:hover {
	cursor: pointer;
}

.buildingSpotDiv_orig {
	position: absolute;
	z-index: 10;
}

.buildingSpotDiv_orig:hover {
	cursor: pointer;
}

.buildingSpotDiv:hover {
	cursor: pointer;
}

.plop-animation {
	position: absolute;
	display: none;
	z-index: 5;
}

.plop-animation.plop-animation {
	animation: bouncePlace 0.4s ease-out;
	--base-rotation: 0deg;
}

@keyframes bouncePlace {
	0% {
		transform: rotate(var(--base-rotation)) scale(0.8);
	}
	40% {
		transform: rotate(var(--base-rotation)) scale(1.3);
	}
	100% {
		transform: rotate(var(--base-rotation)) scale(1);
	}
}
</style>
