<script setup>
/** This is to allow HIGHLIGHTS on the map
 *  Basically to click an entry in the history and then show where it happened
 * on the map
 *
 *
 */

import * as map from '../js/CNSmap'

import { useModelStore } from '../stores/CNSstore.js'
const store = useModelStore()

function hexCenter(hex, raw, forRotationCenter) {
  let p = map.hexToPixel(hex)
  if (forRotationCenter) return `${p.x.toFixed(0)},${p.y.toFixed(0)}`
  if (raw) return [parseFloat(p.x.toFixed(1)), parseFloat(p.y.toFixed(1))]
  return `translate(${p.x.toFixed(0)},${p.y.toFixed(0)})`
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

function shouldShowHighlights() {
  if (store.historyHelpers.hexesToHighlight.length > 0) return true
  if (store.historyHelpers.linksToHighlight.length > 0) return true
  if (store.historyHelpers.linksToHighlightRed.length > 0) return true
  if (store.historyHelpers.linksToHighlightGreen.length > 0) return true

  return false
}

</script>

<template>
  <div id="wholeDiv" v-if="shouldShowHighlights()">
    <svg id="areaSVG" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"
      xmlns:svgjs="http://svgjs.com/svgjs" :viewBox="getViewbox()">

      <!-- Add Hexes -->
      <polygon v-for="(tile, idx) in store.historyHelpers.hexesToHighlight" :key="idx" :points="map.getHexPoints(true)"
        :transform="hexCenter(tile.hex, false)" class="hexHighlightPolygon"></polygon>

      <!-- Add Links -->
      <polygon v-for="(link, idx) in store.historyHelpers.linksToHighlight" :key="idx"
        :points="map.getLinkSVGpoints(link, false, true)" class="linkHighlightPolygon"></polygon>
      <polygon v-for="(link, idx) in store.historyHelpers.linksToHighlightRed" :key="idx"
        :points="map.getLinkSVGpoints(link, false, true)" class="linkHighlightPolygon red"></polygon>
      <polygon v-for="(link, idx) in store.historyHelpers.linksToHighlightGreen" :key="idx"
        :points="map.getLinkSVGpoints(link, false, true)" class="linkHighlightPolygon green"></polygon>

    </svg>

  </div>
</template>

<style scoped>
#wholeDiv {
  z-index: 150;
}

#areaSVG {
  margin: 0 auto;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  z-index: 150;
}

.hexHighlightPolygon {
  stroke: black;
  stroke-width: 0px;
  z-index: 150;
  fill: yellow;
  fill-opacity: .6;
  pointer-events: visiblePainted;
  cursor: default;
  animation: glow 0.6s infinite alternate;
}

.linkHighlightPolygon {
  stroke: black;
  stroke-width: 0px;
  z-index: 150;
  fill: yellow;
  fill-opacity: .9;
  pointer-events: visiblePainted;
  cursor: default;
  animation: glow 0.6s infinite alternate;
}

.red {
  fill: lightcoral;
}

.green {
  fill: green;
}

@keyframes glow {
  to {
    opacity: 0.5;
  }
}
</style>