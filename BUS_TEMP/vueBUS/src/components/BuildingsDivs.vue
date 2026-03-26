<script setup>
import { ref } from 'vue'
import { getBuildingPos } from '../composables/view.js'
import * as constants from '../constants'

import * as view from '../js/BUSview.js'

import { useModelStore } from "../stores/model.js";
const model = useModelStore()
import { usePersonalStore } from "../stores/personal.js";
const personal = usePersonalStore()

const ghostBuildingRef = ref(null)
const junction10 = ref(null)
const junction25 = ref(null)

function ghostBuilding(e, junction, building, add) {
    if (!add) {
        ghostBuildingRef.value.style.display = 'none'
        if (personal.selectedBoard === 0 || personal.selectedBoard === 2) e.target.style.border = String(model.refSize * 5 / 100) + 'px solid yellow'
        if (personal.selectedBoard === 1) e.target.style.border = String(model.refSize * 3 / 100) + 'px solid yellow'
    }
    else {
        if (personal.selectedBoard === 0 || personal.selectedBoard === 2) {
            ghostBuildingRef.value.src = view.getImage('building' + String(model.context.selectedBuildingType))
            ghostBuildingRef.value.style.display = 'block'
            ghostBuildingRef.value.style.top = getBuildingPos(junction, building)[0] + 'px'
            ghostBuildingRef.value.style.left = getBuildingPos(junction, building)[1] + 'px'

            ghostBuildingRef.value.style.width = model.refSize * getBuildingRadius() / 100 + 'px'
            ghostBuildingRef.value.style.height = model.refSize * getBuildingRadius() / 100 + 'px'
        }
        else if (personal.selectedBoard === 1) {
            ghostBuildingRef.value.src = view.getImage('building' + String(model.context.selectedBuildingType) + '_orig')
            ghostBuildingRef.value.style.display = 'block'
            ghostBuildingRef.value.style.top = getBuildingPos(junction, building)[0] + 'px'
            ghostBuildingRef.value.style.left = getBuildingPos(junction, building)[1] + 'px'
            ghostBuildingRef.value.style.width = model.refSize * 30 / 100 + 'px'
            ghostBuildingRef.value.style.height = model.refSize * 30 / 100 + 'px'
            ghostBuildingRef.value.style.transform = 'rotate(' + getBuildingPos(junction, building)[2] + 'deg)'
        }
        if (personal.selectedBoard === 0 || personal.selectedBoard === 2) e.target.style.border = String(model.refSize * 5 / 100) + 'px solid lightgreen'
        if (personal.selectedBoard === 1) e.target.style.border = String(model.refSize * 3 / 100) + 'px solid lightgreen'
    }
}
function mouseOverVromBuilding(e, junction, add) {
    if (!add) {
        if (personal.selectedBoard === 0 || personal.selectedBoard === 2) e.target.style.border = String(model.refSize * 5 / 100) + 'px solid yellow'
        if (personal.selectedBoard === 1) e.target.style.border = String(model.refSize * 3 / 100) + 'px solid yellow'
    }
    else {
        if (personal.selectedBoard === 0 || personal.selectedBoard === 2) e.target.style.border = String(model.refSize * 5 / 100) + 'px solid lightgreen'
        if (personal.selectedBoard === 1) e.target.style.border = String(model.refSize * 3 / 100) + 'px solid lightgreen'
    }
}


// Clicked free building spot to add building
function clickedBldg(junction, building) {
    // Remove ghost
    ghostBuildingRef.value.style.display = 'none'
    // Remove action
    model.context.buildingsLeftToPlace--

    model.context.historyObj.push([model.context.selectedBuildingType, junction, building])

    // Add bldg to junction
    model.junctions[junction][building] = model.context.selectedBuildingType
}
function highlight(e, entering) {
    if (entering) e.target.style.border = String(model.refSize * 5 / 100) + 'px solid lightgreen'
    else e.target.style.border = String(model.refSize * 5 / 100) + 'px solid yellow'
}

function addPassengerToJunction(junction) {
    if (model.remainingPassengers === 0) return
    model.junctions[junction][constants.paxIdx]++
    model.context.passengersLeftToPlace--
    model.remainingPassengers--
    model.context.historyObj.push(junction)

    if (model.remainingPassengers === 0) {
        model.context.turnEndingErrorMessage = "No More Passengers"
        model.context.historyObj.push(-1)
    }
}
function clickedPaxToVrom(junction) {
    if (!model.canPlayerVrom()) return
    if (!model.currentPlayer().playerJunctions.includes(junction)) return
    model.context.selectedPaxToVromJunction = junction
}

function mouseOverPaxNumber(e, junction, entering) {
    if (!model.canPlayerVrom()) return
    if (!model.currentPlayer().playerJunctions.includes(junction)) return
    if (entering) document.getElementById('passengerImg' + String(junction)).classList.add('onHover');
    else document.getElementById('passengerImg' + String(junction)).classList.remove('onHover');
}

function clickedVromBldg(junction, buildingIndex) {
    model.context.historyObj.push([model.context.selectedPaxToVromJunction, junction, buildingIndex])
    // Remove a pax from the junction
    model.junctions[model.context.selectedPaxToVromJunction][constants.paxIdx]--
    // Add onto the building
    model.junctions[junction][buildingIndex] += 10
    // remove a move
    model.context.remainingVroms--
    // Increase scre
    model.increaseScore(model.currentPlayer())
    // reset vars
    model.context.selectedPaxToVromJunction = -1
    model.canPlayerVrom()
}

function getBuildingRadius() {
    if (personal.selectedBoard === 0) return 32
    if (personal.selectedBoard === 2) return 29
}
</script>

<template>
    <!-- Add highlight circles to empty building spots -->
    <template v-if="personal.canPlay() && personal.selectedBoard === 0 || personal.selectedBoard === 2">
        <template v-for="(line, index) in model.getEmptyBuildingSpots()" v-bind:key="index">
            <div class="buildingSpotDiv" v-for="(building, index) in line[1]" v-bind:key="index" :style="{
                'top': getBuildingPos(line[0], building, true)[0] + 'px',
                'left': getBuildingPos(line[0], building, true)[1] + 'px',
                border: String(model.refSize * 5 / 100) + 'px solid yellow',
                width: model.refSize * getBuildingRadius() / 100 + 'px',
                height: model.refSize * getBuildingRadius() / 100 + 'px',
            }" @mouseover="ghostBuilding($event, line[0], building, true)"
                @mouseleave="ghostBuilding($event, line[0], building, false)" @click="clickedBldg(line[0], building)">
            </div>
        </template>
    </template>

    <!-- Render the buildings and pax on the map -->
    <template v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2">
        <template v-for="(line, index) in model.getBuildingsToDisplay()" v-bind:key="index">
            <div class="buildingDiv" v-for="(building, index) in line[1]" v-bind:key="index" :style="{
                'top': getBuildingPos(line[0], building[0])[0] + 'px',
                'left': getBuildingPos(line[0], building[0])[1] + 'px',
                width: model.refSize * getBuildingRadius() / 100 + 'px',
                height: model.refSize * getBuildingRadius() / 100 + 'px',
            }">
                <!-- Draw the building -->
                <img class="buildingImg" :src="view.getImage('building' + String(building[1] % 10))" alt="buildingOnJS">

                <!-- Draw any pax -->
                <img v-if="building[1] > 10" class="passengerImgBldg" :src="view.getImage('passenger')" alt="pax" :style="{
                    'top': model.refSize * 10 / 400 + 'px',
                    'left': model.refSize * 4 / 400 + 'px',
                    width: model.refSize * 184 / 1500 + 'px',
                    height: model.refSize * 311 / 1500 + 'px',
                }">
            </div>
        </template>
    </template>

    <!-- Add pax to junctions -->
    <template v-for="(junction, index) in model.junctions" v-bind:key="index">
        <div v-if="junction[constants.paxIdx] > 0" :style="{
            'top': getBuildingPos(index, -1)[0] + 'px',
            'left': getBuildingPos(index, -1)[1] + 'px',
            width: model.refSize * 32 / 100 + 'px',
            height: model.refSize * 32 / 100 + 'px',
        }" class="paxJunc">

            <!-- Add pax Img first -->
            <img class="passengerImg" :id="'passengerImg' + String(index)" :src="view.getImage('passenger')" alt="pax"
                :style="{
                    'top': model.refSize * 0 / 400 + 'px',
                    'left': model.refSize * 30 / 400 + 'px',
                    width: model.refSize * 184 / 1000 + 'px',
                    height: model.refSize * 311 / 1000 + 'px',
                }" :class="{
    'selectablePaxToVrom': (model.canPlayerVrom() && model.currentPlayer().playerJunctions.includes(index)),
    'notSelectablePaxToVrom': (!model.canPlayerVrom() || !model.currentPlayer().playerJunctions.includes(index)),
    'selectedPaxToVrom': (model.context.selectedPaxToVromJunction === index)
}">
            <!-- Add the number of pax ADD THE PAX CLICK HERE AS IT COVERS BASICALLY THE WHOLE PAX -->
            <div class="paxJuncNum" :style="{
                'top': model.refSize * 6 / 400 + 'px',
                'left': model.refSize * 30 / 400 + 'px',
                'font-size': model.refSize * 100 / 400 + 'px',
                'font-family': 'Arial Black',
                width: model.refSize * 184 / 1000 + 'px',
                height: model.refSize * 311 / 1000 + 'px',
            }" :class="{
    'selectablePaxToVromNumber': (model.canPlayerVrom() && model.currentPlayer().playerJunctions.includes(index)),
}" @click="clickedPaxToVrom(index)" @mouseover="mouseOverPaxNumber($event, index, true)"
                @mouseleave="mouseOverPaxNumber($event, index, false)">
                {{ junction[constants.paxIdx] }}
            </div>
        </div>
    </template>

    <!-- Add highlight circles to VROM building spots -->
    <!-- FOR junction in playersJunctions, if junction includes(reqBld) then add a circle there-->
    <template v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2">
        <template v-for="(line, index) in model.getVromBuildings()" v-bind:key="index">
            <div class="buildingSpotDiv" v-for="(building, index) in line[1]" v-bind:key="index" :style="{
                'top': getBuildingPos(line[0], building, true)[0] + 'px',
                'left': getBuildingPos(line[0], building, true)[1] + 'px',
                border: String(model.refSize * 5 / 100) + 'px solid yellow',
                width: model.refSize * getBuildingRadius() / 100 + 'px',
                height: model.refSize * getBuildingRadius() / 100 + 'px',
            }" @mouseover="mouseOverVromBuilding($event, line[0], true)"
                @mouseleave="mouseOverVromBuilding($event, line[0], false)" @click="clickedVromBldg(line[0], building)">
            </div>
        </template>
    </template>



    <!-- Add highlight circles for pax placement -->
    <template v-if="model.context.passengersLeftToPlace > 0 && model.remainingPassengers > 0 && personal.canPlay()">
        <div ref="junction10" :style="{
            'top': getBuildingPos(10, -1, true)[0] + 'px',
            'left': getBuildingPos(10, -1, true)[1] + 'px',
            width: model.refSize * 32 / 100 + 'px',
            height: model.refSize * 32 / 100 + 'px',
            border: String(model.refSize * 5 / 100) + 'px solid yellow',
        }" class="paxJuncOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
            @click="addPassengerToJunction(10)">
        </div>
        <div ref="junction25" :style="{
            'top': getBuildingPos(25, -1, true)[0] + 'px',
            'left': getBuildingPos(25, -1, true)[1] + 'px',
            width: model.refSize * 32 / 100 + 'px',
            height: model.refSize * 32 / 100 + 'px',
            border: String(model.refSize * 5 / 100) + 'px solid yellow',
        }" class="paxJuncOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
            @click="addPassengerToJunction(25)">
        </div>
    </template>

    <img class="ghostImg" ref="ghostBuildingRef" src="" alt="GI Image">

    <!-- HISTORY HELPER -- BUILDINGS (ADD BLDG / VROM TO) -->
    <template v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2">
        <template v-for="(line, index) in model.historyHelpers.buildingsToHighlight" v-bind:key="index">
            <div class="history_buildingSpotDiv" :style="{
                'top': getBuildingPos(line[1], line[2], true)[0] + 'px',
                'left': getBuildingPos(line[1], line[2], true)[1] + 'px',
                border: String(model.refSize * 5 / 100) + 'px solid yellow',
                width: model.refSize * getBuildingRadius() / 100 + 'px',
                height: model.refSize * getBuildingRadius() / 100 + 'px',
            }">
            </div>
        </template>
    </template>

    <!-- HISTORY HELPER -- JUNCTIONS VROM FROM -->
    <template v-for="(junction, index) in model.historyHelpers.junctionsToHighlight" v-bind:key="index">
        <div :style="{
            'top': getBuildingPos(junction, -1, true)[0] + 'px',
            'left': getBuildingPos(junction, -1, true)[1] + 'px',
            width: model.refSize * getBuildingRadius() / 100 + 'px',
            height: model.refSize * getBuildingRadius() / 100 + 'px',
            border: String(model.refSize * 5 / 100) + 'px solid yellow',
        }" class="junctionVromFrom">
        </div>
    </template>


    <!---------------------------------ORIGINAL BOARD-------------------------------------->
    <!---------------------------------ORIGINAL BOARD-------------------------------------->
    <!---------------------------------ORIGINAL BOARD-------------------------------------->
    <!---------------------------------ORIGINAL BOARD-------------------------------------->

    <!-- Add highlight circles to empty building spots -->
    <template v-if="personal.canPlay() && personal.selectedBoard === 1">
        <template v-for="(line, index) in model.getEmptyBuildingSpots()" v-bind:key="index">
            <div class="buildingSpotDiv_orig" v-for="(building, index) in line[1]" v-bind:key="index" :style="{
                'top': getBuildingPos(line[0], building, true)[0] + 'px',
                'left': getBuildingPos(line[0], building, true)[1] + 'px',
                border: String(model.refSize * 12 / 400) + 'px solid yellow',
                /*'background-color': 'red',*/
                width: model.refSize * 30 / 100 + 'px',
                height: model.refSize * 30 / 100 + 'px',
                transform: 'rotate(' + getBuildingPos(line[0], building, true)[2] + 'deg)',
            }" @mouseover="ghostBuilding($event, line[0], building, true)"
                @mouseleave="ghostBuilding($event, line[0], building, false)" @click="clickedBldg(line[0], building)">
            </div>
        </template>
    </template>

    <!-- Add highlight circles to VROM building spots -->
    <template v-if="personal.selectedBoard === 1">
        <template v-for="(line, index) in model.getVromBuildings()" v-bind:key="index">
            <div class="buildingSpotDiv_orig" v-for="(building, index) in line[1]" v-bind:key="index" :style="{
                'top': getBuildingPos(line[0], building, true)[0] + 'px',
                'left': getBuildingPos(line[0], building, true)[1] + 'px',
                border: String(model.refSize * 12 / 400) + 'px solid yellow',
                width: model.refSize * 30 / 100 + 'px',
                height: model.refSize * 30 / 100 + 'px',
                transform: 'rotate(' + getBuildingPos(line[0], building, true)[2] + 'deg)',
            }" @mouseover="mouseOverVromBuilding($event, line[0], true)"
                @mouseleave="mouseOverVromBuilding($event, line[0], false)" @click="clickedVromBldg(line[0], building)">
            </div>
        </template>
    </template>

    <!-- Render the buildings and pax on the map -->
    <template v-if="personal.selectedBoard === 1">
        <template v-for="(line, index) in model.getBuildingsToDisplay()" v-bind:key="index">
            <div class="buildingDiv" v-for="(building, index) in line[1]" v-bind:key="index" :style="{
                'top': getBuildingPos(line[0], building[0])[0] + 'px',
                'left': getBuildingPos(line[0], building[0])[1] + 'px',
                width: model.refSize * 30 / 100 + 'px',
                height: model.refSize * 30 / 100 + 'px',
                transform: 'rotate(' + getBuildingPos(line[0], building[0], true)[2] + 'deg)',
            }">
                <!-- Draw the building -->
                <img class="buildingImg" :src="view.getImage('building' + String(building[1] % 10) + '_orig')"
                    alt="buildingOnJS">

                <!-- Draw any pax -->
                <img v-if="building[1] > 10" class="passengerImgBldg" :src="view.getImage('passenger')" alt="pax" :style="{
                    'top': model.refSize * 10 / 400 + 'px',
                    'left': model.refSize * 4 / 400 + 'px',
                    width: model.refSize * 184 / 1500 + 'px',
                    height: model.refSize * 311 / 1500 + 'px',
                }">
            </div>
        </template>
    </template>

    <!-- HISTORY HELPER -- BUILDINGS (ADD BLDG / VROM TO) -->
    <template v-if="personal.selectedBoard === 1">
        <template v-for="(line, index) in model.historyHelpers.buildingsToHighlight" v-bind:key="index">
            <div class="history_buildingSpotDiv_orig" :style="{
                'top': getBuildingPos(line[1], line[2], true)[0] + 'px',
                'left': getBuildingPos(line[1], line[2], true)[1] + 'px',
                border: String(model.refSize * 3 / 100) + 'px solid yellow',
                width: model.refSize * 30 / 100 + 'px',
                height: model.refSize * 30 / 100 + 'px',
                transform: 'rotate(' + getBuildingPos(line[1], line[2], true)[2] + 'deg)',
            }">
            </div>
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
    z-index: 10;
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
</style>
