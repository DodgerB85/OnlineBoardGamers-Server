<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 *
 *
 */

import * as rf from '../js/CNSreference'
import * as map from '../js/CNSmap'
import * as controller from '../js/CNScontroller'
import * as model from '../js/CNSmodel'
import * as funcs from '../js/CNSfuncs'
import hexlib from '../js/hexlib'

import { useModelStore } from '../stores/CNSstore.js'
const store = useModelStore()

import { usePersonalStore } from '../stores/CNSpersonal.js'
const personal = usePersonalStore()

function test1() {
  //hexlib.Layout.origin = new hexlib.Point(-300,0)
  //map.calculateCanvasSize()
  //store.historyHelpers.hexesToHighlight.push({ hex: new hexlib.Hex(0, 1, -1) })
  //store.context.placeableLinks.splice(0)

  /*store.tableUp = 1 // min 1
  store.tableDown = 1 // min 1
  store.tableLeft = 1.5 // min 1.5
  store.tableRight = 2.5 // min 2.5

  map.createTable(10)*/
  //model.endGame()
  //alert(JSON.stringify(store.gameflow))
  //store.pirateShipRef = 31
  //console.log(funcs.shuffleArray([1,2,3,4,5]))
  alert(store.gameflow.phase)
}
function test2() {
  map.setNeighbours()
  map.updatePartyZones()
  for (let i = 0; i < store.context.partyZones[0].length; i++) {
    store.historyHelpers.hexesToHighlight.push({ hex: new hexlib.Hex(store.context.partyZones[0][i].hex.q, store.context.partyZones[0][i].hex.r, store.context.partyZones[0][i].hex.s) })
  }
  //store.historyHelpers.hexesToHighlight..push([{ hex: new hexlib.Hex(0, 0, 0) }, { hex: new hexlib.Hex(1, 0, -1) }])

}

function exportLoc() {
  console.log(funcs.exportModel())
  store.turnResetData = funcs.exportModel(false)
}
function importLoc() {
  let data;


  data = store.turnResetData
  funcs.importModel(data)
}

function addHex() {
  store.context.action = rf.ACT_PLACE_HEX
  map.setPlaceableTiles()

  store.context.hexRefBeingAdded = store.hexDrawPile.pop()

  map.calculateCanvasSize(true)
}

function addLink(player) {
  store.context.action = rf.ACT_ADD_LINK
  map.setNeighbours()
  map.setPlaceableLinks(player, false)
}

function addCigar(player) {
  store.context.action = rf.ACT_ADD_CIGAR
  map.setNeighbours()
  map.setPlaceableLinks(player, true)
}



function discardThenDraw() {
  model.discardHexes()

  model.drawHexes(3)
}

function startProductionPhase() {
  model.discardHexes()

  // Set up production
  store.context.placeableLinks.splice(0)
  store.context.placeableTiles.splice(0)
  store.context.availableResources.splice(0)
  // Find all hexes in your network
  let hexRefs = map.getHexesInNetwork(controller.currentPlayerObj(), true)

  // Then collect resources from them
  let networkResProd = rf.collectResAndProdFromHexRefs(hexRefs)
  store.context.availableResources = [...networkResProd[0]]
  // Then enable resource conversion from all connected tiles
  store.context.availableProduction = [...networkResProd[1]]

}

function addRes() {
  model.discardHexes()
  store.gameflow.phase = rf.PHASE_PRODUCTION
  for (let i = 0; i < store.context.availableResources.length; i++) store.context.availableResources[i] += 3
}
function addProd() {
  model.discardHexes()
  store.gameflow.phase = rf.PHASE_PRODUCTION
  for (let i = 0; i <= 10; i++) store.context.availableProduction.push(i)
}
function endTurn() {
  controller.endPlayerTurn()
}
</script>

<template>

  <body v-if="rf.DEBUG_USERS.includes(personal.name)">

    {{ JSON.stringify(store.players, null, 4) }} /
    {{ store.refSize }} /////
    {{ store.tableLeft }} /
    {{ store.tableRight }} ---
    AREA: {{ (store.tableUp + store.tableDown) * (store.tableLeft + store.tableRight) }}

    <br />
    <div class="optionsDiv">
      <b>Actions</b> <br />
      <button @click="addLink(controller.currentPlayerObj())">Add link</button>
      <button @click="addHex">Place new hex</button>
      <button @click="discardThenDraw">Discard + Draw hexes</button>
      <button @click="startProductionPhase">Start Production Phase</button>
      <button @click="addCigar(controller.currentPlayerObj())">Add Cigar</button>
    </div>
    <button @click="addRes">CHEAT: Add Res</button>
    <button @click="addProd">CHEAT: Add Prod</button>
    <button @click="endTurn">CHEAT: End Turn</button>
    <button @click="test1">Test 1</button>
    <button @click="test2">Test 2</button>
    <button @click="store.debugVars.showHexImgs = !store.debugVars.showHexImgs">
      Toggle Hex Imgs
    </button>
    <button @click="exportLoc">Export</button>
    <button @click="importLoc">Import</button>
  </body>
</template>

<style scoped>
body {
  background-color: lightpink;
  padding: 10px;
}

.optionsDiv {
  display: inline-block;
  border: 2px solid black;
  padding: 2px;
}

button {
  margin: 2px;
}
</style>
