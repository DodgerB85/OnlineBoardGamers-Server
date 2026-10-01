<script setup>
import { computed, ref } from "vue"
import * as controller from "../js/URRcontroller"
import * as IO from "../backend/URR_IO"
import * as boardDisplay from "../js/URRboardDisplay"
import * as boardRules from "../js/URRmap"
import { mapImage } from "../js/URRassets"
import * as rf from "../js/URRreference"
import * as view from "../js/URRview"
import * as debug from "../js/URRdebug"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

const selectedHex = ref(null)
const previewOpen = ref(false)
const previewWater = ref(false)
const draftPath = ref([])
const previewError = ref("")

const actualAreas = computed(() => store.board.areas.map((area) => ({ area, position: boardDisplay.getAreaPosition(area) })).filter((entry) => entry.position))
const draftPositions = computed(() => draftPath.value.map((id) => actualAreas.value.find((entry) => entry.area.id === id)?.position || boardDisplay.PRINTED_HEXES.find((hex) => hex.id === id)).filter(Boolean))
const draftLine = computed(() => draftPositions.value.map((hex) => `${hex.x},${hex.y}`).join(" "))
const waterPath = computed(() => draftPositions.value.length > 1 ? `M ${draftPositions.value.map((hex) => `${hex.x} ${hex.y}`).join(" L ")}` : "")
const savedCanals = computed(() => store.board.canals.map(([from, to]) => {
	const fromPosition = actualAreas.value.find((entry) => entry.area.id === from)?.position
	const toPosition = actualAreas.value.find((entry) => entry.area.id === to)?.position
	return fromPosition && toPosition ? `${fromPosition.x},${fromPosition.y} ${toPosition.x},${toPosition.y}` : null
}).filter(Boolean))
const selectedArea = computed(() => selectedHex.value && (store.board.areas.find((area) => area.id === selectedHex.value) || boardDisplay.PRINTED_HEXES.find((hex) => hex.id === selectedHex.value)))

function currentPlayerName() { return store.players[store.gameflow.turnOrder[0]]?.displayName || "-" }
function inspectHex(hex) {
	inspectArea(hex.id)
}
function inspectArea(id) {
	selectedHex.value = id
	if (store.debug.tool && debug.canDebug()) {
		const position = actualAreas.value.find((entry) => entry.area.id === id)?.position || boardDisplay.PRINTED_HEXES.find((hex) => hex.id === id)
		debug.placeAtArea(id, position)
		return
	}
	if (!previewOpen.value || draftPath.value[draftPath.value.length - 1] === id) return
	draftPath.value.push(id)
	validateDraft()
}
function validateDraft() {
	previewError.value = ""
	if (draftPath.value.length < 2 || !draftPath.value.every((id) => store.board.areas.some((area) => area.id === id))) return
	try { boardRules.getCanalCost(store, draftPath.value) } catch (error) { previewError.value = error.message }
}
function undoDraft() { draftPath.value.pop(); validateDraft() }
function clearDraft() { draftPath.value = []; previewError.value = "" }
function endTurn() { controller.endPlayerTurn() }
function endGame() {
	if (!window.confirm("End the game now and mark the current leader as the winner?")) return
	store.gameflow.phase = rf.PHASE_GAME_OVER
	IO.saveGame(false)
}
function ownerColour(area) { return area.owner === null ? "" : personal.getCorrectedColourHex(store.players[area.owner]?.colour) }
function markerLabel(area) { return area.owner === null ? "" : store.players[area.owner]?.displayName?.slice(0, 1) || "?" }
</script>

<template>
	<div id="mapArea">
		<div class="boardHeading"><b>{{ view.phaseStr(store.gameflow.phase) }}</b><span>Turn {{ store.gameflow.turn }} · Era {{ store.era }} · {{ currentPlayerName() }}'s move</span></div>
		<div class="mapSurface">
			<svg :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" aria-label="UR: 1830 BC game board" role="img">
				<image :href="mapImage" x="0" y="0" :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" />
				<g class="printedHexes"><polygon v-for="hex in boardDisplay.PRINTED_HEXES" :key="hex.id" :points="boardDisplay.hexPoints(hex.x, hex.y)" :class="{ selected: selectedHex === hex.id, drafting: draftPath.includes(hex.id) }" @click="inspectHex(hex)" /></g>
				<polyline v-for="(canal, index) in savedCanals" :key="`canal-${index}`" :points="canal" class="savedCanal" />
				<polyline v-if="draftLine" :points="draftLine" class="draftCanal" />
				<path v-if="waterPath && previewWater" :d="waterPath" class="waterPreviewPath" />
				<circle v-if="waterPath && previewWater" r="11" class="waterPreviewDot"><animateMotion :path="waterPath" dur="2.6s" repeatCount="indefinite" /></circle>
				<g v-for="entry in actualAreas" :key="entry.area.id"><circle :cx="entry.position.x" :cy="entry.position.y" r="42" class="areaHit" @click="inspectArea(entry.area.id)" /><circle v-if="entry.area.owner !== null" :cx="entry.position.x" :cy="entry.position.y" r="19" class="ownerMarker" :fill="ownerColour(entry.area)" /><text v-if="entry.area.owner !== null" :x="entry.position.x" :y="entry.position.y + 6" class="markerText">{{ markerLabel(entry.area) }}</text><circle v-if="entry.area.waterwork" :cx="entry.position.x + 24" :cy="entry.position.y - 24" r="12" class="waterworkMarker" /></g>
			</svg>
		</div>
		<div class="inspection" v-if="selectedArea"><b>{{ selectedArea.id }}</b><template v-if="selectedArea.landType !== undefined"> · {{ rf.LAND_NAMES[selectedArea.landType] }} · {{ rf.STATE_NAMES[selectedArea.state] }}</template><template v-else> · printed board area</template></div>
		<div class="inspection" v-if="store.debug.tool && debug.canDebug()">Debug: {{ store.debug.tool }} — click the map to place. <button @click="store.debug.tool = ''; store.debug.path = []">Stop placement</button></div>
		<div class="controls"><button @click="previewOpen = !previewOpen">{{ previewOpen ? "Hide" : "Visual" }} preview</button><template v-if="previewOpen"><span>Click areas to sketch a canal.</span><button @click="undoDraft" :disabled="!draftPath.length">Undo</button><button @click="clearDraft" :disabled="!draftPath.length">Clear</button><label><input type="checkbox" v-model="previewWater" :disabled="draftPath.length < 2" /> Flow water</label></template><template v-if="personal.canPlay()"><button class="actionsLineButton" @click="endTurn">End Turn</button></template><template v-else-if="personal.pov >= 0"><span>Waiting for {{ currentPlayerName() }}...</span></template><button v-if="personal.pov >= 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER" class="dangerButton" @click="endGame">End Game</button></div>
		<div v-if="previewError" class="previewError">{{ previewError }}</div>
	</div>
</template>

<style scoped>
#mapArea { width: 100%; display: flex; flex-direction: column; align-items: center; min-width: 0; }.boardHeading { width: 100%; display: flex; justify-content: space-between; gap: 12px; box-sizing: border-box; padding: 5px 8px; background: #f7edc7; border: 2px solid #8e805e; border-radius: 7px 7px 0 0; font-size: 14px; }.mapSurface { width: min(100%, 920px); line-height: 0; box-shadow: 0 2px 5px #6b614a; }.mapSurface svg { width: 100%; height: auto; display: block; }
.printedHexes polygon { fill: #fff; fill-opacity: .001; stroke: transparent; stroke-width: 5; cursor: pointer; }.printedHexes polygon:hover, .printedHexes polygon.selected { fill: #fff57a; fill-opacity: .32; stroke: #7e6400; }.printedHexes polygon.drafting { stroke: #1165bb; fill-opacity: .17; }.savedCanal { fill: none; stroke: #2269ad; stroke-width: 10; stroke-linecap: round; }.draftCanal { fill: none; stroke: #1f75ce; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; opacity: .82; }.waterPreviewPath { fill: none; stroke: #aef4ff; stroke-width: 6; stroke-dasharray: 12 12; }.waterPreviewDot { fill: #35d6ff; stroke: #fff; stroke-width: 3; }.areaHit { fill: transparent; cursor: pointer; }.ownerMarker { stroke: #fff; stroke-width: 3; pointer-events: none; }.markerText { text-anchor: middle; fill: #fff; font-weight: bold; font-size: 18px; pointer-events: none; }.waterworkMarker { fill: #d8edf0; stroke: #154e62; stroke-width: 4; pointer-events: none; }
.inspection { min-height: 20px; padding: 3px 8px; background: #fff9df; border: 1px solid #bcae85; font-size: 13px; }.controls { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 8px; font-size: 13px; }.controls button { cursor: pointer; }.actionsLineButton { border: 2px solid #247422; border-radius: 5px; font-weight: bold; padding: 5px 12px; }.dangerButton { border: 1px solid #a33333; color: #8b1111; }.previewError { color: #a40000; font-weight: bold; font-size: 13px; } @media (prefers-reduced-motion: reduce) { .waterPreviewDot animateMotion { display: none; } }
</style>
