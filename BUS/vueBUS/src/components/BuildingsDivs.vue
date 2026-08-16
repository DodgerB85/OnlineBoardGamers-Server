<script setup>
import * as rf from "../js/BUSreference.js"
import * as view from "../js/BUSview.js"
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"
import * as pitts from "../js/BUSpitts.js"

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
	// Designer arrival options are column wrappers; the border lives on their inner circle
	if (e.currentTarget.classList.contains("designerArrivalOption")) {
		const circle = e.currentTarget.querySelector(".designerArrivalCircle")
		if (circle) circle.style.borderColor = entering ? "lightgreen" : "yellow"
		return
	}
	if (entering) e.target.style.border = String((store.refSize * 5) / 100) + "px solid lightgreen"
	else e.target.style.border = String((store.refSize * 5) / 100) + "px solid yellow"
}

function playPassengerPlopAnimation(junction, image, leftOffset, plopWidth, plopHeight) {
	if (image === undefined) image = "passenger"
	if (leftOffset === undefined) leftOffset = 0
	const position = view.getBuildingPos(junction, -1)
	
	// Set up the animation element with passenger image at same position as pax number
	plopAnimationRef.value.style.backgroundImage = `url(${view.getImage(image)})`
	plopAnimationRef.value.style.backgroundSize = 'contain'
	plopAnimationRef.value.style.backgroundRepeat = 'no-repeat'
	plopAnimationRef.value.style.backgroundPosition = 'center'
	plopAnimationRef.value.style.top = position[0] + 'px'
	plopAnimationRef.value.style.left = position[1] + leftOffset + 'px'
	plopAnimationRef.value.style.width = (plopWidth === undefined ? (store.refSize * 32) / 100 : plopWidth) + 'px'
	plopAnimationRef.value.style.height = (plopHeight === undefined ? (store.refSize * 32) / 100 : plopHeight) + 'px'
	
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

// Landing offset for a designer standing on a junction: on the junction like a pax when no regular
// pax are waiting, else directly to the right of the waiting pax (Jeroen first, then Joris)
function getDesignerLandingOffset(designerIdx, junction, index) {
	if (junction[rf.paxIdx] === 0) return (store.refSize * 30) / 400
	let offset = (store.refSize * 30) / 400 + (store.refSize * 184) / 1000
	if (designerIdx === rf.DESIGNER_JORIS && pitts.getDesignerStatusJunction(store.jeroenStatus) === index) offset += (store.refSize * 184) / 1000
	return offset
}

// Bring a Splotter Designer into play at the Airport (junction 30), instead of two regular passengers
function addDesignerToJunction(designerIdx) {
	if (store.context.passengersLeftToPlace < 2) return
	if (pitts.designerArrivedThisRound()) return
	const designerStatus = designerIdx === rf.DESIGNER_JEROEN ? store.jeroenStatus : store.jorisStatus
	if (designerStatus !== rf.DESIGNER_NOT_ARRIVED) return
	if (designerIdx === rf.DESIGNER_JEROEN) store.jeroenStatus = rf.PITTS_AIRPORT_JUNCTION
	else store.jorisStatus = rf.PITTS_AIRPORT_JUNCTION
	store.context.passengersLeftToPlace -= 2
	store.context.historyObj.push([rf.PITTS_AIRPORT_JUNCTION, designerIdx])
	// Plop at the designer's actual landing spot
	const landingOffset = getDesignerLandingOffset(designerIdx, store.junctions[rf.PITTS_AIRPORT_JUNCTION], rf.PITTS_AIRPORT_JUNCTION)
	playPassengerPlopAnimation(rf.PITTS_AIRPORT_JUNCTION, designerIdx === rf.DESIGNER_JEROEN ? "jeroen" : "joris", landingOffset, (store.refSize * 184) / 1000, (store.refSize * 311) / 1000)
}
function clickedPaxToVrom(junction) {
	if (!model.canPlayerVrom()) return
	if (personal.selectedBoard === rf.BOARD_PITTS) {
		if (!paxSelectableForVrom(junction)) return
	} else {
		if (!controller.currentPlayerObj().playerJunctions.includes(junction)) return
	}
	store.context.selectedDesignerToVrom = -1
	store.context.selectedPaxToVromJunction = junction
}

// Selection of a Splotter Designer to be moved during VRROOOMM
function clickedDesignerToVrom(designerIdx, junction) {
	if (!model.canPlayerVrom()) return
	if (personal.selectedBoard === rf.BOARD_PITTS) {
		if (!designerSelectableForVrom(junction, designerIdx)) return
	} else {
		if (!controller.currentPlayerObj().playerJunctions.includes(junction)) return
	}
	if (pitts.getDesignerStatusJunction(designerIdx === rf.DESIGNER_JEROEN ? store.jeroenStatus : store.jorisStatus) !== junction) return
	store.context.selectedDesignerToVrom = designerIdx
	store.context.selectedPaxToVromJunction = junction
}

// A designer parked on their convention-centre spot stays there like a delivered passenger; the
// Airport flight is only offered on a later round from junction 17 itself, so no click handling is added here

// A passenger can select this junction for VROOMM only when a regular desired building is reachable from it;
// designer special rides (convention centre / Airport) never make a junction selectable for a passenger
function paxSelectableForVrom(junction) {
	if (personal.selectedBoard !== rf.BOARD_PITTS) return model.canPlayerVrom() && controller.currentPlayerObj().playerJunctions.includes(junction)
	return model.canPlayerVrom() && store.context.eligibleJunctionsToVromPitts.includes(junction) && controller.canReachBuildingFromJunction(junction, controller.currentPlayerObj(), store, null)
}

// A Splotter Designer can select this junction only when their own rides (and regular building rides) reach a destination
function designerSelectableForVrom(junction, designerIdx) {
	if (personal.selectedBoard !== rf.BOARD_PITTS) return model.canPlayerVrom() && controller.currentPlayerObj().playerJunctions.includes(junction)
	return model.canPlayerVrom() && store.context.eligibleJunctionsToVromPitts.includes(junction) && controller.canReachBuildingFromJunction(junction, controller.currentPlayerObj(), store, designerIdx)
}

function mouseOverPaxNumber(e, junction, entering) {
	if (!model.canPlayerVrom()) return
	if (personal.selectedBoard === rf.BOARD_PITTS) {
		if (!paxSelectableForVrom(junction)) return
	} else {
		if (!controller.currentPlayerObj().playerJunctions.includes(junction)) return
	}
	if (entering) document.getElementById("passengerImg" + String(junction)).classList.add("onHover")
	else document.getElementById("passengerImg" + String(junction)).classList.remove("onHover")
}

function mouseOverDesignerNumber(e, junction, designerIdx, entering) {
	if (!designerSelectableForVrom(junction, designerIdx)) return
	if (entering) document.getElementById("designerImg" + String(designerIdx) + "x" + String(junction)).classList.add("onHover")
	else document.getElementById("designerImg" + String(designerIdx) + "x" + String(junction)).classList.remove("onHover")
}

function getDesignerStatus(designerIdx) {
	if (designerIdx === rf.DESIGNER_JEROEN) return store.jeroenStatus
	return store.jorisStatus
}
function setDesignerStatus(designerIdx, status) {
	if (designerIdx === rf.DESIGNER_JEROEN) store.jeroenStatus = status
	else store.jorisStatus = status
}

function clickedVromBldg(junction, buildingIndex) {
	const origin = store.context.selectedPaxToVromJunction
	// SPLOTTER DESIGNER DESTINATIONS - convention centre spots and the Airport
	// Only the matching designer can ride these; a normal pax can never move to them
	if (buildingIndex < 0) {
		const designerIdx = store.context.selectedDesignerToVrom
		if (designerIdx === -1) return
		if (buildingIndex === rf.VROM_DEST_JEROEN_CON && designerIdx !== rf.DESIGNER_JEROEN) return
		else if (buildingIndex === rf.VROM_DEST_JORIS_CON && designerIdx !== rf.DESIGNER_JORIS) return
		else if (buildingIndex === rf.VROM_DEST_AIRPORT && designerIdx !== rf.DESIGNER_JEROEN && designerIdx !== rf.DESIGNER_JORIS) return
		store.context.historyObj.push([origin, junction, buildingIndex, designerIdx])
		if (buildingIndex === rf.VROM_DEST_AIRPORT) {
			setDesignerStatus(designerIdx, rf.DESIGNER_REMOVED)
		} else {
			// Parked on the convention-centre spot like a delivered passenger; returns to the
			// convention junction (17) at round end
			setDesignerStatus(designerIdx, rf.DESIGNER_ON_BUILDING_FLAG + rf.DESIGNER_CON_FLAG + rf.PITTS_CONVENTION_JUNCTION)
		}
		store.context.remainingVroms--
		model.increaseScore(controller.currentPlayerObj())
		store.context.selectedPaxToVromJunction = -1
		store.context.selectedDesignerToVrom = -1
		controller.canPlayerVrom(true)
		return
	}
	// A designer rides to any normal building destination too
	if (store.context.selectedDesignerToVrom !== -1) {
		const designerIdx = store.context.selectedDesignerToVrom
		store.context.historyObj.push([origin, junction, buildingIndex, designerIdx])
		const attended = pitts.hasDesignerAttendedCon(getDesignerStatus(designerIdx))
		// Park the designer on the building like a delivered pax (21-23 Jeroen, 31-33 Joris)
		store.junctions[junction][buildingIndex] += designerIdx === rf.DESIGNER_JEROEN ? 20 : 30
		setDesignerStatus(designerIdx, rf.DESIGNER_ON_BUILDING_FLAG + (attended ? rf.DESIGNER_CON_FLAG : 0) + junction)
		store.context.remainingVroms--
		model.increaseScore(controller.currentPlayerObj())
		store.context.selectedPaxToVromJunction = -1
		store.context.selectedDesignerToVrom = -1
		controller.canPlayerVrom(true)
		return
	}
	store.context.historyObj.push([store.context.selectedPaxToVromJunction, junction, buildingIndex])
	// Remove a pax from the junction
	store.junctions[store.context.selectedPaxToVromJunction][rf.paxIdx]--
	// Add onto the building
	store.junctions[junction][buildingIndex] += 10
	// remove a move
	store.context.remainingVroms--
	// Increase scre
	model.increaseScore(controller.currentPlayerObj())
	// reset vars
	store.context.selectedPaxToVromJunction = -1
	store.context.selectedDesignerToVrom = -1
	controller.canPlayerVrom(true)
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

				<!-- Draw the occupant (pax or Splotter Designer) -->
				<img
					v-if="building[1] > 10"
					:class="building[1] >= 20 ? 'designerImgBldg' : 'passengerImgBldg'"
					:src="view.getImage(view.getBuildingOccupantImage(building[1]))"
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
					selectablePaxToVrom: paxSelectableForVrom(index),
					notSelectablePaxToVrom: !paxSelectableForVrom(index),
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
					selectablePaxToVromNumber: paxSelectableForVrom(index),
				}"
				@click="clickedPaxToVrom(index)"
				@mouseover="mouseOverPaxNumber($event, index, true)"
				@mouseleave="mouseOverPaxNumber($event, index, false)">
				{{ junction[rf.paxIdx] }}
			</div>
		</div>
	</template>

	<!-- Display any Splotter Designers waiting on junctions -->
	<template v-for="(junction, index) in store.junctions" v-bind:key="'jeroen' + index">
		<img
			v-if="personal.selectedBoard === rf.BOARD_PITTS && pitts.getDesignerStatusJunction(store.jeroenStatus) === index"
			class="designerImg"
			:id="'designerImg' + String(rf.DESIGNER_JEROEN) + 'x' + String(index)"
			:src="view.getImage('jeroen')"
			alt="Jeroen"
			:class="{
				selectablePaxToVrom: designerSelectableForVrom(index, rf.DESIGNER_JEROEN),
				selectedPaxToVrom: store.context.selectedPaxToVromJunction === index && store.context.selectedDesignerToVrom === rf.DESIGNER_JEROEN,
			}"
			:style="{
				top: view.getBuildingPos(index, -1)[0] + 'px',
				left: view.getBuildingPos(index, -1)[1] + getDesignerLandingOffset(rf.DESIGNER_JEROEN, junction, index) + 'px',
				width: (store.refSize * 184) / 1000 + 'px',
				height: (store.refSize * 311) / 1000 + 'px',
			}"
			@click="clickedDesignerToVrom(rf.DESIGNER_JEROEN, index)"
			@mouseover="mouseOverDesignerNumber($event, index, rf.DESIGNER_JEROEN, true)"
			@mouseleave="mouseOverDesignerNumber($event, index, rf.DESIGNER_JEROEN, false)" />
	</template>
	<template v-for="(junction, index) in store.junctions" v-bind:key="'joris' + index">
		<img
			v-if="personal.selectedBoard === rf.BOARD_PITTS && pitts.getDesignerStatusJunction(store.jorisStatus) === index"
			class="designerImg"
			:id="'designerImg' + String(rf.DESIGNER_JORIS) + 'x' + String(index)"
			:src="view.getImage('joris')"
			alt="Joris"
			:class="{
				'selectablePaxToVrom': designerSelectableForVrom(index, rf.DESIGNER_JORIS),
				selectedPaxToVrom: store.context.selectedPaxToVromJunction === index && store.context.selectedDesignerToVrom === rf.DESIGNER_JORIS,
			}"
			:style="{
				top: view.getBuildingPos(index, -1)[0] + 'px',
				left: view.getBuildingPos(index, -1)[1] + getDesignerLandingOffset(rf.DESIGNER_JORIS, junction, index) + 'px',
				width: (store.refSize * 184) / 1000 + 'px',
				height: (store.refSize * 311) / 1000 + 'px',
			}"
			@click="clickedDesignerToVrom(rf.DESIGNER_JORIS, index)"
			@mouseover="mouseOverDesignerNumber($event, index, rf.DESIGNER_JORIS, true)"
			@mouseleave="mouseOverDesignerNumber($event, index, rf.DESIGNER_JORIS, false)" />
	</template>

	<!-- Splotter Designers parked on their convention-centre spot (small size, like a building occupant);
			parked from delivery onwards, like a delivered passenger -->
	<img
		v-if="personal.selectedBoard === rf.BOARD_PITTS && store.jeroenStatus === rf.DESIGNER_ON_BUILDING_FLAG + rf.DESIGNER_CON_FLAG + rf.PITTS_CONVENTION_JUNCTION"
		class="designerImgBldg"
		:src="view.getImage('jeroen')"
		alt="Jeroen"
		:style="{
			top: view.getVromDestinationPos(rf.PITTS_CONVENTION_JUNCTION, rf.VROM_DEST_JEROEN_CON, false)[0] + (store.refSize * 10) / 400 + 'px',
			left: view.getVromDestinationPos(rf.PITTS_CONVENTION_JUNCTION, rf.VROM_DEST_JEROEN_CON, false)[1] + (store.refSize * 4) / 400 + 'px',
			width: (store.refSize * 184) / 1500 + 'px',
			height: (store.refSize * 311) / 1500 + 'px',
		}" />
	<img
		v-if="personal.selectedBoard === rf.BOARD_PITTS && store.jorisStatus === rf.DESIGNER_ON_BUILDING_FLAG + rf.DESIGNER_CON_FLAG + rf.PITTS_CONVENTION_JUNCTION"
		class="designerImgBldg"
		:src="view.getImage('joris')"
		alt="Joris"
		:style="{
			top: view.getVromDestinationPos(rf.PITTS_CONVENTION_JUNCTION, rf.VROM_DEST_JORIS_CON, false)[0] + (store.refSize * 10) / 400 + 'px',
			left: view.getVromDestinationPos(rf.PITTS_CONVENTION_JUNCTION, rf.VROM_DEST_JORIS_CON, false)[1] + (store.refSize * 4) / 400 + 'px',
			width: (store.refSize * 184) / 1500 + 'px',
			height: (store.refSize * 311) / 1500 + 'px',
		}" />

	<!-- Add highlight circles to VROM building spots -->
	<!-- FOR junction in playersJunctions, if junction includes(reqBld) then add a circle there-->
	<template v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS">
		<template v-for="(line, index) in model.getVromBuildings()" v-bind:key="index">
			<div
				class="buildingSpotDiv"
				v-for="(building, index) in line[1]"
				v-bind:key="index"
				:style="{
					top: view.getVromDestinationPos(line[0], building, true)[0] + 'px',
					left: view.getVromDestinationPos(line[0], building, true)[1] + 'px',
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
			<!-- SPLOTTER DESIGNER ARRIVAL - at the Airport (junction 30) instead of two passengers -->
			<div
				v-if="store.context.passengersLeftToPlace >= 2 && !pitts.designerArrivedThisRound() && store.jeroenStatus === rf.DESIGNER_NOT_ARRIVED"
				class="designerArrivalOption"
				:style="{
					top: view.getBuildingPos(30, -1, true)[0] + (store.refSize * 272) / 400 + 'px',
					left: view.getBuildingPos(30, -1, true)[1] - (store.refSize * 63) / 400 + 'px',
				}"
				title="Bring Jeroen into play at the Airport (uses two of your passenger placements)"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="addDesignerToJunction(rf.DESIGNER_JEROEN)">
				<div
					class="designerArrivalCircle"
					:style="{
						width: (store.refSize * 40) / 100 + 'px',
						height: (store.refSize * 40) / 100 + 'px',
						border: String((store.refSize * 5) / 100) + 'px solid yellow',
					}">
					<img class="designerArrivalImg" :src="view.getImage('jeroen')" alt="Jeroen" />
				</div>
				<span class="designerArrivalName" :style="{ fontSize: (store.refSize * 50) / 400 + 'px' }">Jeroen</span>
			</div>
			<div
				v-if="store.context.passengersLeftToPlace >= 2 && !pitts.designerArrivedThisRound() && store.jorisStatus === rf.DESIGNER_NOT_ARRIVED"
				class="designerArrivalOption"
				:style="{
					top: view.getBuildingPos(30, -1, true)[0] + (store.refSize * 272) / 400 + 'px',
					left: view.getBuildingPos(30, -1, true)[1] + (store.refSize * 127) / 400 + 'px',
				}"
				title="Bring Joris into play at the Airport (takes two of your passenger placements)"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="addDesignerToJunction(rf.DESIGNER_JORIS)">
				<div
					class="designerArrivalCircle"
					:style="{
						width: (store.refSize * 40) / 100 + 'px',
						height: (store.refSize * 40) / 100 + 'px',
						border: String((store.refSize * 5) / 100) + 'px solid yellow',
					}">
					<img class="designerArrivalImg" :src="view.getImage('joris')" alt="Joris" />
				</div>
				<span class="designerArrivalName" :style="{ fontSize: (store.refSize * 50) / 400 + 'px' }">Joris</span>
			</div>
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
					top: view.getVromDestinationPos(line[0], building, true)[0] + 'px',
					left: view.getVromDestinationPos(line[0], building, true)[1] + 'px',
					border: String((store.refSize * 12) / 400) + 'px solid yellow',
					width: (store.refSize * 30) / 100 + 'px',
					height: (store.refSize * 30) / 100 + 'px',
					transform: 'rotate(' + view.getVromDestinationPos(line[0], building, true)[2] + 'deg)',
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

				<!-- Draw the occupant (pax or Splotter Designer) -->
				<img
					v-if="building[1] > 10"
					:class="building[1] >= 20 ? 'designerImgBldg' : 'passengerImgBldg'"
					:src="view.getImage(view.getBuildingOccupantImage(building[1]))"
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

.designerImgBldg {
	position: absolute;
	filter: drop-shadow(2px 0 0 white) drop-shadow(0 2px 0 white) drop-shadow(-2px 0 0 white) drop-shadow(0 -2px 0 white);
}

.passengerImg {
	position: absolute;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
}

.designerImg {
	position: absolute;
	z-index: 6;
	filter: drop-shadow(2px 0 0 white) drop-shadow(0 2px 0 white) drop-shadow(-2px 0 0 white) drop-shadow(0 -2px 0 white);
}

.designerImg.selectablePaxToVrom:hover {
	cursor: pointer;
}

.designerArrivalOption {
	position: absolute;
	z-index: 10;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.designerArrivalOption:hover {
	cursor: pointer;
}

.designerArrivalCircle {
	border-radius: 100%;
	background-color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.designerArrivalName {
	color: #d4eafd;
	font-weight: bold;
	line-height: 1.1;
	margin-top: 2px;
	white-space: nowrap;
	text-shadow: -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black;
}

.designerArrivalImg {
	width: 90%;
	height: 90%;
	object-fit: contain;
	padding: 2px;
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
	z-index: 7;
	pointer-events: none;
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
