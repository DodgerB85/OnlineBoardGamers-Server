<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in CNSmap.js
 *
 *
 */

import * as rf from '../js/CNSreference'
import * as map from '../js/CNSmap'
import * as view from '../js/CNSview'
import * as controller from '../js/CNScontroller'
import * as model from '../js/CNSmodel'

import MapHighlights from './MapHighlights.vue'

import { useModelStore } from '../stores/CNSstore.js'
const store = useModelStore()

import { usePersonalStore } from '../stores/CNSpersonal.js'
const personal = usePersonalStore()

import { ref } from 'vue';
const showErrorPopup = ref(false);
const popupPosition = ref({ x: 0, y: 0 });

let errorInterval;

function hexCenter(hex, raw, forRotationCenter) {
  let p = map.hexToPixel(hex)
  if (forRotationCenter) return `${p.x.toFixed(0)},${p.y.toFixed(0)}`
  if (raw) return [parseFloat(p.x.toFixed(1)), parseFloat(p.y.toFixed(1))]
  return `translate(${p.x.toFixed(0)},${p.y.toFixed(0)})`
}

function hexClicked(hex) {
  //console.log(hex)
  //console.log(`Invitation Edges: ${map.findInvitationEdges(hex.hexRef, hex.rotation)}`)
}

function pirateShipPoints() {
  const pirateTile = store.hexes.find(item => item.hexRef === store.pirateShipRef);

  let centerPos = hexCenter(pirateTile.hex, true, false)
  let centX = centerPos[0]
  let centY = centerPos[1]

  let modX = 163.5 / 1.5 * store.refSize / 2400 * 500 / store.canvasSize
  let modY = 124.5 / 1.5 * store.refSize / 2400 * 500 / store.canvasSize

  return `${centX + modX}, ${centY + modY * -2}
          ${centX + modX}, ${centY - modY * 0}
          ${centX - modX}, ${centY - modY * 0}
          ${centX - modX}, ${centY + modY * -2}`
}

function getNewHexOptionFill(mousover) {
  if (mousover) {
    const patternNumber = store.context.hexRefBeingAdded
    return `url(#pattern${patternNumber})`
  } else return 'yellow'
}

function getPartyOptionFill(partyNum) {
  if (store.context.partyMouseOver === partyNum) return 'greenyellow'
  return 'yellow'
}

function getViewbox() {
  let gridDimensions = map.calculateGridDimensions(store.topMenuViews.showWholeTable)

  // Find out whether you are NET high/lower, or left/right then the origin
  let netGridNumCols = gridDimensions[3] + gridDimensions[2]
  let netGridNumRows = gridDimensions[1] + gridDimensions[0]

  // Shift appropriately, by half the net amount.
  // You need to go through the canvasSize ratio, as this affects how the SVGs are drawn
  let horizShift = ((((netGridNumCols / -2) * 260) / store.canvasSize) * store.refSize) / 2400
  let vertShift =
    (((((netGridNumRows * 0.866) / -2) * 260) / store.canvasSize) * store.refSize) / 2400

  // Shift down -800 in both directions to display the intial hex
  const minX = -800 * horizShift - 800
  const minY = -800 * vertShift - 800
  const width = 1600
  const height = 1600
  return `${minX} ${minY} ${width} ${height}`
}

function linkClicked(player, link) {
  if (!store.context.removableLinks.includes(link)) {
    return
  }

  if (store.context.action == rf.ACT_REMOVE_LINK) {
    model.removeLink(link)
  }
}

function getStroke(link, player) {
  if (store.context.action == rf.ACT_REMOVE_LINK && store.context.removableLinks.includes(link)) {
    if (link.isMouseOver) return 'lightgreen'
    if (personal.getCorrectedColour(controller.currentPlayerObj().colour) === rf.YELLOW) return 'red'
    else return 'yellow'
  }
  return 'purple'
}
function getStrokeWidth(link) {
  if (store.context.action == rf.ACT_REMOVE_LINK && store.context.removableLinks.includes(link)) return store.refSize * 4
  return store.refSize
}

function localAddHexToMap(tile, hexRef, rotation) {
  let placementError = map.getAnyHexPlacementError(tile, hexRef, rotation)
  if (placementError) {
    // Calculate the position based on the mouse/touch event
    popupPosition.value = { x: event.clientX, y: event.clientY - 60 };

    // Show the error popup
    showErrorPopup.value = true;

    clearTimeout(errorInterval);
    // Hide the error popup after 2 seconds
    errorInterval = setTimeout(() => {
      showErrorPopup.value = false;
    }, 1000);
  }
  else model.addHexToMap(tile, hexRef)
}

function getCigarPattern(link) {
  if (link[0].hex.r === link[1].hex.r) return '#patternCigar'
  else if (link[0].hex.s === link[1].hex.s) return '#patternCigar_u'
  else if (link[0].hex.q === link[1].hex.q) return '#patternCigar_d'
}

function addPirateToParty(partyNum) {
  model.setPirateInPartyIndex(partyNum)
  store.gameflow.phase = -1
  store.context.action = rf.ACT_CONFIRM_PIRATE_PLACEMENT
}
</script>

<template>
  <div id="hexDIV" :style="{
    width: store.canvasWidth + 'px',
    height: store.canvasHeight + 'px'
  }">

    <transition name="fadeOut">
      <div class="hexPlaceErrorPopup" v-if="showErrorPopup"
        :style="{ top: popupPosition.y + 'px', left: popupPosition.x + 'px' }">
        Invitation Cannot<br />
        Join to Party
      </div>
    </transition>

    <svg id="hexSVG" v-if="store.hexes" xmlns="http://www.w3.org/2000/svg" version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" :viewBox="getViewbox()">
      <!-- Get patterns for all the hex images -->
      <defs>
        <!-- Cannes Hex Img -->
        <pattern id="pattern0" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('hex0')" />
        </pattern>
        <pattern id="pattern1" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('hex1')" />
        </pattern>
        <pattern id="pattern2" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('hex2')" />
        </pattern>
        <pattern id="pattern3" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('hex3')" />
        </pattern>
        <!-- All Other Hex Imgs -->
        <pattern v-for="(num, index) in rf.INITIAL_DRAW_PILE_4P" :key="index" :id="'pattern' + num" height="100%"
          width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('hex' + String(num))" />
        </pattern>
        <g v-if="store.tableJunk.length > 0">
          <!-- Junk Hex Imgs -->
          <pattern v-for="(num, index) in [1, 2, 3, 4, 5, 6, 7]" :key="index" :id="'patternJunk' + num" height="100%"
            width="100%" patternContentUnits="objectBoundingBox">
            <image height="1" width="1" preserveAspectRatio="none"
              :xlink:href="view.getImage('hexJunk' + String(num))" />
          </pattern>
        </g>
        <!-- Cigar -->
        <pattern id="patternCigar" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('cigar')" />
        </pattern>
        <pattern id="patternCigar_u" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('cigar_u')" />
        </pattern>
        <pattern id="patternCigar_d" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('cigar_d')" />
        </pattern>
        <!-- PIRATE SHIP -->
        <pattern id="patternPirateShip" height="100%" width="100%" patternContentUnits="objectBoundingBox">
          <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('pirate')" />
        </pattern>
      </defs>

      <!-- Add table Top Edge -->
      <rect v-if="store.tableUp !== 0" :x="-store.tableLeft * store.refSize / 1 / 3 * 260 / store.canvasSize + 10"
        :y="-(store.tableUp) * rf.hexSmallRatio * store.refSize * 1 / 3 * 260 / store.canvasSize - 0.5 * store.refSize / 8 * 3 * 262.7 / store.canvasSize + 10 - store.tableBulk"
        :width="(store.tableLeft + store.tableRight) * store.refSize / 1 / 3 * 262.7 / store.canvasSize - 20"
        :height="store.tableBulk - 20" fill="brown" stroke="black" stroke-width="20" />

      <!-- Add table Botton Edge -->
      <rect v-if="store.tableUp !== 0" :x="-store.tableLeft * store.refSize / 1 / 3 * 260 / store.canvasSize + 10"
        :y="(store.tableDown) * rf.hexSmallRatio * store.refSize * 1 / 3 * 260 / store.canvasSize + 0.5 * store.refSize / 8 * 3 * 262.7 / store.canvasSize + 10"
        :width="(store.tableLeft + store.tableRight) * store.refSize / 1 / 3 * 262.7 / store.canvasSize - 20"
        :height="store.tableBulk - 20" fill="brown" stroke="black" stroke-width="20" />

      <!-- Add table Left Edge -->
      <rect v-if="store.tableUp !== 0"
        :x="-store.tableLeft * store.refSize / 1 / 3 * 260 / store.canvasSize + 10 - store.tableBulk"
        :y="-(store.tableUp) * rf.hexSmallRatio * store.refSize * 1 / 3 * 262.7 / store.canvasSize - 0.5 * store.refSize / 8 * 3 * 262.7 / store.canvasSize + 10 - store.tableBulk"
        :height="(store.tableUp + store.tableDown) * rf.hexSmallRatio * store.refSize * 1 / 3 * 262.7 / store.canvasSize + store.refSize / 8 * 3 * 262.7 / store.canvasSize - 20 + store.tableBulk * 2"
        :width="store.tableBulk - 20" fill="brown" stroke="black" stroke-width="20" />

      <!-- Add table Right Edge -->
      <rect v-if="store.tableUp !== 0" :x="store.tableRight * store.refSize / 1 / 3 * 260 / store.canvasSize + 10"
        :y="-(store.tableUp) * rf.hexSmallRatio * store.refSize * 1 / 3 * 262.7 / store.canvasSize - 0.5 * store.refSize / 8 * 3 * 262.7 / store.canvasSize + 10 - store.tableBulk"
        :height="(store.tableUp + store.tableDown) * rf.hexSmallRatio * store.refSize * 1 / 3 * 262.7 / store.canvasSize + store.refSize / 8 * 3 * 262.7 / store.canvasSize - 20 + store.tableBulk * 2"
        :width="store.tableBulk - 20" fill="brown" stroke="black" stroke-width="20" />

      <text x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="white" font-size="16">Table</text>

      <!-- Add Hexes -->
      <polygon :id="'hex' + tile.id" :key="tile.id" v-for="tile in store.hexes" @click="hexClicked(tile)"
        :points="map.getHexPoints(false)" :transform="'rotate(' +
          tile.rotation * 60 +
          ' ' +
          hexCenter(tile.hex, false, true) +
          ')' +
          hexCenter(tile.hex, false)
          " class="mapHexSVG" :fill="`url(#pattern${tile.hexRef})`"></polygon>

      <!-- Add Junk Hex -->
      <polygon v-for="(junkData, idx) in store.tableJunk" :key="idx" :points="map.getHexPoints(false)"
        :transform="hexCenter(junkData[0], false)" :fill="`url(#patternJunk${junkData[1]})`" class="mapJunkSVG">
      </polygon>

      <!-- Add New Hex Options -->
      <g v-if="store.context.action === rf.ACT_PLACE_HEX">
        <polygon v-for="tile in store.context.placeableTiles" class="newHexOptionSVG" :key="tile.id"
          @click="localAddHexToMap(tile, store.context.hexRefBeingAdded, store.context.hexBeingAddedRotation)"
          :points="map.getHexPoints(false)" :transform="'rotate(' +
            store.context.hexBeingAddedRotation * 60 +
            ' ' +
            hexCenter(tile, false, true) +
            ')' +
            hexCenter(tile, false)
            " @mouseover="tile.isMouseOver = true" @mouseout="tile.isMouseOver = false"
          :fill="getNewHexOptionFill(tile.isMouseOver)" :style="{
            'stroke-width': store.refSize / 240 + 'px'
          }"></polygon>
      </g>

      <!-- Add PZ highlight for Pirates -->
      <g v-if="store.context.action === rf.ACT_MOVE_PIRATE">
        <g v-for="(partyZone, partyNum) in store.context.partyPointsToHighlight" :key="partyNum">
          <polygon v-for="(hexPoints, idx) in partyZone" class="partyZoneForPirate" :key="idx"
            @click="addPirateToParty(partyNum)" :points="hexPoints" @mouseover="store.context.partyMouseOver = partyNum"
            @mouseout="store.context.partyMouseOver = -1" :fill="getPartyOptionFill(partyNum)"></polygon>
        </g>
      </g>

      <!-- Add Links -->
      <g v-for="(player, idx) in store.players" :key="idx">
        <polygon :key="link.id" v-for="link in player.links" :points="map.getLinkSVGpoints(link, false)"
          @click="linkClicked(player, link)" @mouseover="link.isMouseOver = true" @mouseout="link.isMouseOver = false"
          :style="{
            'stroke-width': getStrokeWidth(link) / 600 + 'px',
            stroke: getStroke(link, player),
            fill: personal.getCorrectedColourHex(player.colour),
            cursor: (store.context.action == rf.ACT_REMOVE_LINK && store.context.removableLinks.includes(link)) ? 'pointer' : 'default'
          }"></polygon>
      </g>

      <!-- Add New Link Options -->
      <g v-if="store.context.action === rf.ACT_ADD_LINK || store.context.action === rf.ACT_READD_LINK">
        <polygon :key="link.id" v-for="link in store.context.placeableLinks" :points="map.getLinkSVGpoints(link, false)"
          @click="model.addLink(controller.currentPlayerObj(), link)" @mouseover="link.isMouseOver = true"
          @mouseout="link.isMouseOver = false" class="newLink" :style="{
            'stroke-width': store.refSize / 240 + 'px',
            fill: personal.getCorrectedColourHex(controller.currentPlayerObj().colour)
          }"></polygon>
      </g>

      <!-- Add Cigars -->
      <polygon :key="link.id" v-for="link in store.oldBoysNetwork" class="boardCigarPolygon"
        :points="map.getLinkSVGpoints(link, true)" :fill="'url(' + getCigarPattern(link) + ')'"></polygon>

      <!-- Add New Cigar Options -->
      <g v-if="store.context.action === rf.ACT_ADD_CIGAR">
        <polygon :key="link.id" v-for="link in store.context.placeableLinks"
          :points="map.getLinkSVGpoints(link, true, true)" @click="model.addCigar(link)"
          @mouseover="link.isMouseOver = true" @mouseout="link.isMouseOver = false"
          :fill="'url(' + getCigarPattern(link) + ')'" class="newCigar" :style="{
            'stroke-width': store.refSize / 240 + 'px',
          }"></polygon>
      </g>

      <!-- ADD PIRATE SHIP -->
      <!-- PIRATE SHIP SVG -->
      <g v-if="store.pirateShipRef > 0">
        <polygon class="boardShipPolygon" :points="pirateShipPoints()" fill="url(#patternPirateShip)"></polygon>
      </g>
    </svg>

    <!-- Add Hex Imgs -->
    <template v-if="store.debugVars.showHexImgs">
      <div v-for="(tile, index) in store.hexes" :key="index" class="hexTileDiv" :style="{
        width: store.refSize / 18.7 + 'px',
        height: (store.refSize / 18.7) * rf.hexBigRatio + 'px',
        left: getImgDivPos(0, tile.hex) + 'px',
        top: getImgDivPos(1, tile.hex) + 'px'
      }">
        <img class="hexIMG" :src="view.getImage('hex' + String(rf.HEX_PROD_MOVIE_SCIFI))"
          :alt="rf.HEX_PROD_MOVIE_SCIFI" />
      </div>
    </template>

    <MapHighlights />
  </div>

</template>

<style scoped>
.newHexOptionSVG {
  stroke: black;
  fill-opacity: 0.5;
  z-index: 200;
  cursor: pointer;
}

.partyZoneForPirate {
  stroke: none;
  fill-opacity: 0.5;
  z-index: 200;
  cursor: pointer;
}


.hexTileDiv {
  position: absolute;
}

.hexTileDiv img {
  width: 100%;
  height: 100%;
}

#hexDIV {
  position: relative;
  padding: 0px;
  width: fit-content;
  margin: auto;

  background-color: aliceblue;
  z-index: 100;
}

.hexIMG {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 50px;
  height: 73.2px;
  /* To get width, multiply height by 0.8660254 */
}

.mapHexSVG {
  stroke: black;
  stroke-width: 5px;
}

.mapJunkSVG {
  stroke: black;
}

#hexSVG {
  margin: 0 auto;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  z-index: 100;
}

polygon {
  pointer-events: visiblePainted;
  stroke: black;
}

.neighbor {
  fill: hsla(154, 88%, 50%, 0.324);
}

.newLink {
  stroke: yellow !important;
  fill-opacity: 0;
  z-index: 200;
}

.newLink:hover {
  cursor: pointer;
  fill-opacity: 1;
}

.newCigar {
  stroke: yellow !important;
  fill-opacity: 0;
  z-index: 200;
}

.newCigar:hover {
  cursor: pointer;
  fill-opacity: 1;
}

.boardCigarPolygon {
  stroke: none !important;
}

.boardShipPolygon {
  stroke: none;
}

.hexPlaceErrorPopup {
  position: fixed;
  background-color: red;
  color: white;
  padding: 10px;
  border-radius: 5px;
  opacity: 1;
  z-index: 9999;
}

.fadeOut-enter-active,
.fadeOut-leave-active {
  transition: opacity .5s ease-in-out;
}

.fadeOut-enter,
.fadeOut-leave-active {
  opacity: 0;
}
</style>
