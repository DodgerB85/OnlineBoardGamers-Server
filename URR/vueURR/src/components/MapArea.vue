<script setup>
import { computed, ref, watch } from "vue"
import * as boardDisplay from "../js/URRboardDisplay"
import * as boardRules from "../js/URRmap"
import { landPrice } from "../js/URRrules"
import { mapImage, getWaterworkImage, getPlayerMarkerImage } from "../js/URRassets"
import { currentWaterFrame, waterChoices } from "../js/URRwater"
import * as rf from "../js/URRreference"
import * as view from "../js/URRview"
import * as debug from "../js/URRdebug"
import GameActions from "./GameActions.vue"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
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
	const a = actualAreas.value.find((entry) => entry.area.id === from)?.position
	const b = actualAreas.value.find((entry) => entry.area.id === to)?.position
	return a && b ? `${a.x},${a.y} ${b.x},${b.y}` : null
}).filter(Boolean))
const selectedArea = computed(() => store.board.areas.find((area) => area.id === selectedHex.value))
const reachable = computed(() => selectedArea.value?.waterwork ? boardRules.getWaterworkReach(store, selectedArea.value.id) : [])
const waterDestinations = computed(() => waterChoices(store).map((choice) => choice.area))
const routingArea = computed(() => currentWaterFrame(store)?.area)

function currentPlayerName() { return store.players[store.gameflow.turnOrder[0]]?.displayName || "" }
function inspectArea(id) {
	selectedHex.value = id
	if (store.debug.tool && debug.canDebug()) {
		const position = actualAreas.value.find((entry) => entry.area.id === id)?.position || boardDisplay.PRINTED_HEXES.find((hex) => hex.id === id)
		debug.placeAtArea(id, position)
		return
	}
	if (!previewOpen.value || draftPath.value.at(-1) === id) return
	draftPath.value.push(id)
	validateDraft()
}
function validateDraft() {
	previewError.value = ""
	if (draftPath.value.length < 2) return
	try { boardRules.getCanalCost(store, draftPath.value) } catch (error) { previewError.value = error.message }
}
function undoDraft() { draftPath.value.pop(); validateDraft() }
function clearDraft() { draftPath.value = []; previewError.value = "" }
function startDig() { clearDraft(); previewOpen.value = true }
function finishDig() { clearDraft(); previewOpen.value = false }
function areaDescription(area) {
	const owner = area.owner === null ? area.markerOwner === null ? "Uncolonized" : "For sale" : store.players[area.owner].displayName
	return `${area.label || area.id}: ${area.isRiver ? 'River' : `${rf.LAND_NAMES[area.landType]}${area.isCity ? ' city' : ''}, ${rf.STATE_NAMES[area.state]}, ${owner}`}`
}
watch(() => [store.gameflow.phase, store.gameflow.turnOrder[0], store.gameflow.stateIndex], finishDig)
</script>

<template>
	<div id="mapArea">
		<div class="boardHeading"><b>{{ view.phaseStr(store.gameflow.phase) }}</b><span>Turn {{ store.gameflow.turn }} · Era {{ store.era === 5 ? 'M' : store.era }}<template v-if="currentPlayerName()"> · {{ currentPlayerName() }}'s move</template></span></div>
		<div class="mapSurface">
			<svg :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" aria-label="UR: 1830 BC game board">
				<image :href="mapImage" x="0" y="0" :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" />
				<g v-if="!actualAreas.length" class="printedHexes"><polygon v-for="hex in boardDisplay.PRINTED_HEXES" :key="hex.id" :points="boardDisplay.hexPoints(hex.x, hex.y)" @click="inspectArea(hex.id)" /></g>
				<polyline v-for="(canal, index) in savedCanals" :key="`canal-${index}`" :points="canal" class="savedCanal" />
				<polyline v-if="draftLine" :points="draftLine" class="draftCanal" />
				<path v-if="waterPath && previewWater" :d="waterPath" class="waterPreviewPath" />
				<circle v-if="waterPath && previewWater" r="11" class="waterPreviewDot"><animateMotion :path="waterPath" dur="2.6s" repeatCount="indefinite" /></circle>
				<g v-for="entry in actualAreas" :key="entry.area.id" class="boardArea" :class="{ showLabel: selectedHex === entry.area.id || draftPath.includes(entry.area.id) }">
					<polygon :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="areaHit" :class="{ selected: selectedHex === entry.area.id, drafting: draftPath.includes(entry.area.id), reachable: reachable.includes(entry.area.id), waterDestination: waterDestinations.includes(entry.area.id), routing: routingArea === entry.area.id }" role="button" tabindex="0" :aria-label="areaDescription(entry.area)" @click="inspectArea(entry.area.id)" @keydown.enter.prevent="inspectArea(entry.area.id)" @keydown.space.prevent="inspectArea(entry.area.id)"><title>{{ areaDescription(entry.area) }}</title></polygon>
					<image v-if="entry.area.markerOwner !== null" :href="getPlayerMarkerImage(entry.area.markerOwner)" :x="entry.position.x - 22" :y="entry.position.y - 22" width="44" height="44" class="ownerMarker" :class="{ sold: entry.area.owner === null }" />
					<text :x="entry.position.x" :y="entry.position.y + 41" class="areaLabel">{{ entry.area.label || entry.area.id }}</text>
					<image v-if="entry.area.waterwork" :href="getWaterworkImage(entry.area.waterwork.state, entry.area.waterwork.capacity)" :x="entry.position.x + 10" :y="entry.position.y - 40" width="32" height="32" class="waterworkMarker"><title>{{ rf.STATE_NAMES[entry.area.waterwork.state] }} {{ entry.area.waterwork.kind }} {{ entry.area.waterwork.capacity }}</title></image>
					<circle v-if="entry.area.irrigatedBy !== null" :cx="entry.position.x + 24" :cy="entry.position.y + 20" r="10" class="irrigationMarker"><title>Irrigated by {{ rf.STATE_NAMES[entry.area.irrigatedBy] }}</title></circle>
				</g>
			</svg>
		</div>
		<div class="inspection" v-if="selectedArea"><b>{{ areaDescription(selectedArea) }}</b><template v-if="!selectedArea.isRiver"> · {{ selectedArea.markerOwner === null ? 'Colonization' : 'Market' }} price {{ landPrice(store, selectedArea, selectedArea.markerOwner === null) }} SPL<span v-if="boardRules.isNationLandClosed(store, selectedArea)"> · Nation land closed</span></template><span v-if="selectedArea.waterwork"> · {{ rf.STATE_NAMES[selectedArea.waterwork.state] }} {{ selectedArea.waterwork.kind }} {{ selectedArea.waterwork.capacity }} · Reach highlighted</span></div>
		<div class="inspection" v-if="store.debug.tool && debug.canDebug()">Debug: {{ store.debug.tool }} — click the map to place. <button @click="store.debug.tool = ''; store.debug.path = []">Stop placement</button></div>
		<div class="controls" v-if="previewOpen"><b>Canal path:</b><span>{{ draftPath.map((id) => store.board.areas.find((area) => area.id === id)?.label || id).join(' → ') || 'Click the starting river or canal area.' }}</span><button @click="undoDraft" :disabled="!draftPath.length">Undo</button><button @click="clearDraft" :disabled="!draftPath.length">Clear</button><button @click="previewOpen = false">Stop selecting path</button><label><input type="checkbox" v-model="previewWater" :disabled="draftPath.length < 2" /> Animate draft</label></div>
		<div v-if="previewError" class="previewError">{{ previewError }}</div>
		<GameActions v-if="store.gameflow.phase !== rf.PHASE_DIVIDING_NATIONS" :selected-area="selectedHex" :path="draftPath" @start-dig="startDig" @clear-path="finishDig" />
	</div>
</template>

<style scoped>
#mapArea { width: 100%; display: flex; flex-direction: column; align-items: center; min-width: 0; }.boardHeading { width: 100%; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; box-sizing: border-box; padding: 5px 8px; background: #f7edc7; border: 2px solid #8e805e; border-radius: 7px 7px 0 0; font-size: 14px; }.mapSurface { width: min(100%, 920px); line-height: 0; box-shadow: 0 2px 5px #6b614a; }.mapSurface svg { width: 100%; height: auto; display: block; }
.printedHexes polygon, .areaHit { fill: #fff; fill-opacity: .001; stroke: transparent; stroke-width: 5; cursor: pointer; }.areaHit.reachable { fill: #bf9dff; fill-opacity: .24; }.areaHit.waterDestination { fill: #74e9ff; fill-opacity: .3; stroke: #008cb3; }.areaHit.routing { stroke: #006dca; stroke-width: 8; }.areaHit:hover, .areaHit:focus, .areaHit.selected { fill: #fff57a; fill-opacity: .32; stroke: #7e6400; }.areaHit.drafting { stroke: #1165bb; fill-opacity: .17; }
.savedCanal { fill: none; stroke: #2269ad; stroke-width: 10; stroke-linecap: round; pointer-events: none; }.draftCanal { fill: none; stroke: #1f75ce; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; opacity: .82; pointer-events: none; }.waterPreviewPath { fill: none; stroke: #aef4ff; stroke-width: 6; stroke-dasharray: 12 12; pointer-events: none; }.waterPreviewDot, .irrigationMarker { fill: #35d6ff; stroke: #fff; stroke-width: 3; pointer-events: none; }.ownerMarker, .waterworkMarker, .areaLabel { pointer-events: none; }.ownerMarker.sold { filter: grayscale(1); opacity: .5; }.areaLabel { opacity: 0; text-anchor: middle; fill: #333; font-weight: bold; font-size: 13px; paint-order: stroke; stroke: #fff; stroke-width: 3; }
.boardArea:hover .areaLabel, .boardArea:focus-within .areaLabel, .boardArea.showLabel .areaLabel { opacity: 1; }
.inspection { width: 100%; box-sizing: border-box; min-height: 20px; padding: 6px 8px; background: #fff9df; border: 1px solid #bcae85; font-size: 13px; text-align: left; }.controls { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 8px; font-size: 13px; }.controls button { cursor: pointer; }.previewError { color: #a40000; font-weight: bold; font-size: 13px; } @media (prefers-reduced-motion: reduce) { .waterPreviewDot { display: none; } }
</style>
