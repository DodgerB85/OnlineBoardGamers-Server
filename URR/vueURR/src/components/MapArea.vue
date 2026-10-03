<script setup>
import { computed, nextTick, ref, watch } from "vue"
import * as boardDisplay from "../js/URRboardDisplay"
import * as boardRules from "../js/URRmap"
import { landPrice, maintenanceShortfall, getMaintenanceSaleError, canExchangeBarahshum, barahshumDestinations, removableWaterworks, isCalahWaterworkLocation } from "../js/URRrules"
import { currentStateId, waterworkMeasure } from "../js/URRview"
import { mapImage, getWaterworkImage, getPlayerMarkerImage, getTerrainImage, getStateOrderImage } from "../js/URRassets"
import { currentWaterFrame, waterChoices } from "../js/URRwater"
import * as rf from "../js/URRreference"
import * as debug from "../js/URRdebug"
import { useModelStore } from "../stores/URRstore.js"
const emit = defineEmits(["selectArea", "changePath", "reviewDig"])
const props = defineProps({ removalArea: { type: String, default: null }, landDraft: { type: Object, default: null }, waitingPlayerName: { type: String, default: null } })
const store = useModelStore()
const selectedHex = ref(null)
const focusedHex = ref(null)
const boardElement = ref(null)
const boardZoom = ref(1)
const showCoordinates = ref(false)
const previewOpen = ref(false)
const previewWater = ref(false)
const draftPath = ref([])
const previewError = ref("")
const actualAreas = computed(() => store.board.areas.map((area) => ({ area, position: boardDisplay.getAreaPosition(area) })).filter((entry) => entry.position))
const tabArea = computed(() => actualAreas.value.some((entry) => entry.area.id === focusedHex.value) ? focusedHex.value : actualAreas.value[0]?.area.id)
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
const chosenRemoval = computed(() => !store.viewSettings.showReplay && store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" ? props.removalArea : null)
const queuedPurchase = computed(() => !store.viewSettings.showReplay && store.gameflow.phase === rf.PHASE_SETTLEMENT ? props.landDraft?.buy : null)
const decisionArea = computed(() => store.gameflow.pendingOffer?.action.area || (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "routing" ? routingArea.value : chosenRemoval.value) || selectedHex.value || queuedPurchase.value)
const decisionLabel = computed(() => {
	if (store.gameflow.pendingOffer) return "Find site"
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "routing" && routingArea.value) return "Find source"
	if (!selectedHex.value && queuedPurchase.value) return "Find purchase"
	return chosenRemoval.value ? "Find work" : "Find site"
})
const maintenanceState = computed(() => store.gameflow.phase === rf.PHASE_DEVELOPMENT && !["eridu", "betweenStates"].includes(store.gameflow.developmentStep) && !store.gameflow.pendingOffer ? store.states[currentStateId(store)] : null)
const needsMaintenanceSales = computed(() => maintenanceState.value && store.players[maintenanceState.value.king].money < maintenanceShortfall(store, maintenanceState.value.id))
const queuedSales = computed(() => !store.viewSettings.showReplay && (store.gameflow.phase === rf.PHASE_SETTLEMENT || needsMaintenanceSales.value) ? props.landDraft?.sales || [] : [])
const maintenanceLand = computed(() => needsMaintenanceSales.value ? store.board.areas.filter((area) => !getMaintenanceSaleError(store, maintenanceState.value.king, area, maintenanceState.value.id)).map((area) => area.id) : [])
const harvestRemovalSites = computed(() => store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" ? removableWaterworks(store, currentStateId(store)) : [])
const barahshumSites = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	const owner = nation.ownerType === "player" ? nation.owner : store.states[nation.owner]?.king
	return !previewOpen.value && !needsMaintenanceSales.value && canExchangeBarahshum(store, owner) ? barahshumDestinations(store) : []
})

const calahSites = computed(() => {
	const nation = store.nations[rf.NATION_CALAH]
	if (previewOpen.value || needsMaintenanceSales.value || store.gameflow.pendingOffer || store.gameflow.phase !== rf.PHASE_DEVELOPMENT || ["eridu", "betweenStates"].includes(store.gameflow.developmentStep) || nation.isRemoved || nation.ownerType !== "state" || nation.owner !== currentStateId(store)) return []
	return store.board.areas.filter((area) => !area.waterwork && isCalahWaterworkLocation(store, area) && !boardRules.isNationLandClosed(store, area)).map((area) => area.id)
})

const mapHint = computed(() => {
	if (store.viewSettings.showReplay) return "Historical position · click a hex to inspect"
	if (props.waitingPlayerName) return `Waiting for ${props.waitingPlayerName} · ${store.gameflow.pendingOffer?.action.area ? 'review the highlighted site' : 'click a hex to inspect'}`
	if (store.gameflow.pendingOffer) return store.gameflow.pendingOffer.action.type === "offerNation" ? "Review the proposed nation purchase" : "Review the proposal at the highlighted site"
	if (queuedPurchase.value || queuedSales.value.length) return needsMaintenanceSales.value ? "Crew funding: red sites are queued sales" : "Trade draft: blue purchase · red sales"
	if (store.gameflow.phase === rf.PHASE_SETTLEMENT) return barahshumSites.value.length ? "Select land · purple sites allow Barahshum" : "Select land to buy or sell"
	if (previewOpen.value) return "Trace a canal through adjacent areas"
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT) {
		if (store.gameflow.developmentStep === "eridu") return "Trace Eridu’s canal or skip digging"
		if (store.gameflow.developmentStep === "betweenStates") return barahshumSites.value.length ? "Barahshum: select a highlighted canal site" : "Review the board before the next state"
		if (needsMaintenanceSales.value) return maintenanceLand.value.length ? "Select highlighted land to fund the crew" : "Review the required revolution"
		const exchanges = [calahSites.value.length ? "Calah" : "", barahshumSites.value.length ? "Barahshum" : ""].filter(Boolean).join(" or ")
		if (store.gameflow.developmentStep === "digging" && store.states[currentStateId(store)]?.diggers.some((crew) => !crew.hasDug)) return `Choose a canal path or buy equipment${exchanges ? ` · purple sites allow ${exchanges}` : ""}`
		return exchanges ? `Select a site · purple sites allow ${exchanges}` : "Select a site for a pump or reservoir"
	}
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "routing") return "Choose a blue water destination"
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest") return harvestRemovalSites.value.length ? "Harvest: choose a highlighted waterwork if storing" : "Choose how to use the harvest"
	return "Click a hex to inspect"
})

function inspectArea(id) {
	focusedHex.value = id
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
function moveFocus(event, entry) {
	const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
	if (!direction) return
	event.preventDefault()
	const neighbours = actualAreas.value.filter((next) => entry.area.neighbours.includes(next.area.id)).map((next) => {
		const dx = next.position.x - entry.position.x
		const dy = next.position.y - entry.position.y
		return { entry: next, forward: dx * direction[0] + dy * direction[1], sideways: Math.abs(dx * direction[1] - dy * direction[0]) }
	}).filter((next) => next.forward > 0)
	// Choose the adjacent hex most closely aligned with the pressed arrow.
	const target = neighbours.sort((a, b) => a.sideways / a.forward - b.sideways / b.forward)[0]?.entry
	if (!target) return
	focusArea(target.area.id)
}
function focusArea(id) {
	focusedHex.value = id
	nextTick(() => {
		const hex = [...boardElement.value.querySelectorAll(".areaHit")].find((hex) => hex.dataset.areaId === tabArea.value)
		hex.focus()
		if (!window.matchMedia("(max-width: 1050px)").matches) return
		const rect = hex.getBoundingClientRect()
		const drawer = document.querySelector(".actionSidebar:not(.isFinished)")?.getBoundingClientRect()
		if (rect.top < 0 || rect.bottom > (drawer ? drawer.top : window.innerHeight)) revealAboveActions(hex, "instant")
	})
}
function validateDraft() {
	previewError.value = ""
	if (draftPath.value.length < 2) return
	try { boardRules.getCanalCost(store, draftPath.value) } catch (error) { previewError.value = error.message }
}
function undoDraft() {
	draftPath.value.pop()
	selectedHex.value = draftPath.value.at(-1) ?? null
	if (selectedHex.value !== null) focusedHex.value = selectedHex.value
	validateDraft()
}
function clearDraft() { draftPath.value = []; previewError.value = "" }
function startDig(keepPath = false) {
	if (!keepPath) clearDraft()
	previewOpen.value = true
	const startArea = keepPath ? draftPath.value.at(-1) : tabArea.value
	if (keepPath) selectedHex.value = startArea
	focusArea(startArea)
}
function stopSelectingPath() { previewOpen.value = false; if (draftPath.value.length >= 2) emit("reviewDig") }
function finishDig() { clearDraft(); previewOpen.value = false }
function areaDescription(area) {
	const unmarkedStatus = boardRules.isNationLandClosed(store, area) ? "Independent nation" : "Uncolonized"
	const owner = area.owner === null ? area.markerOwner === null ? unmarkedStatus : `For sale · ${store.players[area.markerOwner].displayName}'s marker` : store.players[area.owner].displayName
	const homeland = area.nation !== null ? ` · ${rf.NATION_NAMES[area.nation]} homeland` : ""
	const closure = boardRules.isNationLandClosed(store, area) ? " · Nation land closed" : ""
	const price = !area.isRiver && (store.gameflow.phase === rf.PHASE_SETTLEMENT || store.gameflow.phase === rf.PHASE_GAME_OVER || needsMaintenanceSales.value) ? ` · ${area.markerOwner === null ? 'Colonization' : 'Market'} price ${landPrice(store, area, area.markerOwner === null)} SPL` : ""
	const waterwork = area.waterwork ? ` · ${rf.STATE_NAMES[area.waterwork.state]} ${area.waterwork.kind}, ${waterworkMeasure(area.waterwork)}` : ""
	const irrigation = area.irrigatedBy !== null ? ` · Irrigated by ${rf.STATE_NAMES[area.irrigatedBy]}` : ""
	return `${area.label || area.id}: ${area.isRiver ? 'River' : `${rf.LAND_NAMES[area.landType]}${area.isCity ? ' city' : ''}, ${rf.STATE_NAMES[area.state]}, ${owner}`}${homeland}${closure}${price}${waterwork}${irrigation}${queuedPurchase.value === area.id ? " · Queued purchase" : ""}${queuedSales.value.includes(area.id) ? " · Queued sale" : ""}${chosenRemoval.value === area.id ? " · Selected for removal if harvest is stored" : harvestRemovalSites.value.includes(area.id) ? " · Removable if harvest is stored" : ""}${calahSites.value.includes(area.id) ? " · Calah waterwork location" : ""}${barahshumSites.value.includes(area.id) ? " · Barahshum canal destination" : ""}`
}
watch(selectedHex, (id) => emit("selectArea", id))
watch(draftPath, (path) => emit("changePath", [...path]), { deep: true })
function revealSelection() {
	const hex = boardElement.value.querySelector(".areaHit.selected")
	if (!hex) return
	hex.scrollIntoView({ block: "nearest", behavior: "instant" })
	revealAboveActions(hex)
}
function revealAboveActions(hex, behavior = "smooth") {
	const drawer = document.querySelector(".actionSidebar:not(.isFinished)")?.getBoundingClientRect()
	const visibleHeight = drawer ? drawer.top : window.innerHeight
	const rect = hex.getBoundingClientRect()
	if (rect.top >= 12 && rect.bottom <= visibleHeight - 12) return
	window.scrollBy({ top: rect.top + rect.height / 2 - visibleHeight / 2, behavior })
}
function revealBoard() { boardElement.value.scrollIntoView({ block: "start", behavior: "smooth" }) }
async function locateArea(id, shouldSelect = false) {
	if (shouldSelect) selectedHex.value = id
	focusArea(id)
	await nextTick()
	const hex = boardElement.value.querySelector(`[data-area-id="${id}"]`)
	hex.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
	if (window.matchMedia("(max-width: 1050px)").matches) revealAboveActions(hex)
}
function locateDecision() { return locateArea(decisionArea.value) }
defineExpose({ startDig, finishDig, revealSelection, revealBoard, locateArea, isTracing: previewOpen })
watch(() => [store.gameflow.phase, store.gameflow.turnOrder[0], store.gameflow.stateIndex, store.gameflow.developmentStep, store.rain.step, store.rain.harvestOrder[0], currentWaterFrame(store)?.area], () => { finishDig(); selectedHex.value = null })
</script>

<template>
	<div id="mapArea" ref="boardElement">
		<div class="boardHeading"><b>Game board</b><span class="mapHint">{{ mapHint }}</span><div class="mapZoom"><button v-if="decisionArea" @click="locateDecision">{{ decisionLabel }}</button><button :aria-pressed="showCoordinates" @click="showCoordinates = !showCoordinates" title="Show coordinates on every hex">Hex labels</button><button :disabled="boardZoom <= 1" @click="boardZoom = Math.max(1, boardZoom - .25)" aria-label="Zoom out">−</button><button @click="boardZoom = 1" title="Fit the board">{{ Math.round(boardZoom * 100) }}%</button><button :disabled="boardZoom >= 2" @click="boardZoom = Math.min(2, boardZoom + .25)" aria-label="Zoom in">+</button></div></div>
		<div class="controls" v-if="previewOpen"><b>Canal path:</b><span>{{ draftPath.map((id) => store.board.areas.find((area) => area.id === id)?.label || id).join(' → ') || 'Click the starting river or canal area.' }}</span><button @click="undoDraft" :disabled="!draftPath.length">Undo</button><button @click="clearDraft" :disabled="!draftPath.length">Clear</button><button @click="stopSelectingPath">{{ draftPath.length >= 2 ? 'Review canal' : 'Stop selecting path' }}</button><label><input type="checkbox" v-model="previewWater" :disabled="draftPath.length < 2" /> Animate draft</label></div>
		<div class="mapSurface" :class="{ isZoomed: boardZoom > 1 }">
			<svg :style="{ width: `${boardZoom * 100}%` }" :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" aria-label="UR: 1830 BC game board"><title>Use arrow keys to move between adjacent hexes, and Enter or Space to select.</title>
				<image :href="mapImage" x="0" y="0" :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" />
				<g v-if="!actualAreas.length" class="printedHexes"><polygon v-for="hex in boardDisplay.PRINTED_HEXES" :key="hex.id" :points="boardDisplay.hexPoints(hex.x, hex.y)" @click="inspectArea(hex.id)" /></g>
				<polyline v-for="(canal, index) in savedCanals" :key="`canal-${index}`" :points="canal" class="savedCanal" />
				<polyline v-if="draftLine" :points="draftLine" class="draftCanal" />
				<path v-if="waterPath && previewWater" :d="waterPath" class="waterPreviewPath" />
				<circle v-if="waterPath && previewWater" r="11" class="waterPreviewDot"><animateMotion :path="waterPath" dur="2.6s" repeatCount="indefinite" /></circle>
				<g v-for="entry in actualAreas" :key="entry.area.id" class="boardArea" :class="{ showLabel: showCoordinates || selectedHex === entry.area.id || queuedPurchase === entry.area.id || queuedSales.includes(entry.area.id) || chosenRemoval === entry.area.id || draftPath.includes(entry.area.id) }">
					<polygon :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="areaHit" :class="{ selected: selectedHex === entry.area.id, drafting: draftPath.includes(entry.area.id), reachable: reachable.includes(entry.area.id), waterDestination: waterDestinations.includes(entry.area.id), routing: routingArea === entry.area.id, maintenanceSale: maintenanceLand.includes(entry.area.id), barahshumSite: barahshumSites.includes(entry.area.id), calahSite: calahSites.includes(entry.area.id), harvestRemovalSite: harvestRemovalSites.includes(entry.area.id), removalTarget: chosenRemoval === entry.area.id, tradePurchase: queuedPurchase === entry.area.id, tradeSale: queuedSales.includes(entry.area.id), offerTarget: store.gameflow.pendingOffer?.action.area === entry.area.id }" role="button" :tabindex="tabArea === entry.area.id ? 0 : -1" :data-area-id="entry.area.id" :aria-label="areaDescription(entry.area)" @focus="focusedHex = entry.area.id" @keydown="moveFocus($event, entry)" @click="inspectArea(entry.area.id)" @keydown.enter.prevent="inspectArea(entry.area.id)" @keydown.space.prevent="inspectArea(entry.area.id)"><title>{{ areaDescription(entry.area) }}</title></polygon>
					<polygon v-if="queuedPurchase === entry.area.id && queuedSales.includes(entry.area.id)" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="purchaseSaleOutline" />
					<image v-if="entry.area.markerOwner !== null" :href="getPlayerMarkerImage(entry.area.markerOwner)" :x="entry.position.x - 22" :y="entry.position.y - 22" width="44" height="44" class="ownerMarker" :class="{ sold: entry.area.owner === null }" />
					<rect v-if="entry.area.owner === null && entry.area.markerOwner !== null" :x="entry.position.x - 22" :y="entry.position.y - 22" width="44" height="44" class="saleMarkerFrame" />
					<text :x="entry.position.x" :y="entry.position.y + 41" class="areaLabel">{{ entry.area.label || entry.area.id }}</text>
					<image v-if="entry.area.waterwork" :href="getWaterworkImage(entry.area.waterwork.state, entry.area.waterwork.capacity)" :x="entry.position.x + 10" :y="entry.position.y - 40" width="32" height="32" class="waterworkMarker"><title>{{ rf.STATE_NAMES[entry.area.waterwork.state] }} {{ entry.area.waterwork.kind }} · {{ waterworkMeasure(entry.area.waterwork) }}</title></image>
					<circle v-if="entry.area.irrigatedBy !== null" :cx="entry.position.x + 24" :cy="entry.position.y + 20" r="10" class="irrigationMarker"><title>Irrigated by {{ rf.STATE_NAMES[entry.area.irrigatedBy] }}</title></circle>
				</g>
			</svg>
		</div>
		<div class="inspection" v-if="selectedArea">
			<b>{{ selectedArea.label || selectedArea.id }}</b>
			<span v-if="selectedArea.nation !== null">{{ rf.NATION_NAMES[selectedArea.nation] }} homeland</span>
			<span v-if="selectedArea.isRiver">River</span>
			<template v-else>
				<img :src="getTerrainImage(selectedArea.landType, selectedArea.isCity)" :alt="`${rf.LAND_NAMES[selectedArea.landType]}${selectedArea.isCity ? ' city' : ''}`" :title="`${rf.LAND_NAMES[selectedArea.landType]}${selectedArea.isCity ? ' city' : ''}`" />
				<span v-if="selectedArea.isCity">City</span>
				<img :src="getStateOrderImage(selectedArea.state)" :alt="rf.STATE_NAMES[selectedArea.state]" :title="rf.STATE_NAMES[selectedArea.state]" />
				<span class="inspectionOwner" v-if="selectedArea.owner !== null"><img :src="getPlayerMarkerImage(selectedArea.owner)" alt="" />{{ store.players[selectedArea.owner].displayName }}</span>
				<span v-else-if="selectedArea.markerOwner !== null" class="inspectionOwner"><img :src="getPlayerMarkerImage(selectedArea.markerOwner)" alt="" />For sale · {{ store.players[selectedArea.markerOwner].displayName }}'s marker</span>
				<span v-else>{{ boardRules.isNationLandClosed(store, selectedArea) ? 'Independent nation' : 'Uncolonized' }}</span>
			</template>
			<span class="inspectionWork" v-if="selectedArea.waterwork"><img :src="getWaterworkImage(selectedArea.waterwork.state, selectedArea.waterwork.capacity)" :alt="rf.STATE_NAMES[selectedArea.waterwork.state]" />{{ selectedArea.waterwork.kind }} · {{ waterworkMeasure(selectedArea.waterwork) }}</span>
			<span v-if="selectedArea.irrigatedBy !== null">Irrigated by {{ rf.STATE_NAMES[selectedArea.irrigatedBy] }}</span>
			<span v-if="queuedPurchase === selectedArea.id">Queued purchase</span>
			<span v-if="queuedSales.includes(selectedArea.id)">Queued sale</span>
			<span v-if="chosenRemoval === selectedArea.id">Selected for removal if harvest is stored</span>
			<span v-else-if="harvestRemovalSites.includes(selectedArea.id)">Removable if harvest is stored</span>
			<span v-if="calahSites.includes(selectedArea.id)">Calah free-waterwork location</span>
			<span v-if="barahshumSites.includes(selectedArea.id)">Barahshum canal destination</span>
			<span v-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'routing' && selectedArea.id !== routingArea && !waterDestinations.includes(selectedArea.id)">Outside current water destinations</span>
			<span v-if="!selectedArea.isRiver && (store.gameflow.phase === rf.PHASE_SETTLEMENT || store.gameflow.phase === rf.PHASE_GAME_OVER || needsMaintenanceSales)">{{ selectedArea.markerOwner === null ? 'Colonization' : 'Market' }} price {{ landPrice(store, selectedArea, selectedArea.markerOwner === null) }} SPL</span>
			<span v-if="!selectedArea.isRiver && boardRules.isNationLandClosed(store, selectedArea) && store.gameflow.phase !== rf.PHASE_RAINY_SEASON">Nation land closed</span>
			<span v-if="selectedArea.waterwork">{{ selectedArea.waterwork.kind === 'pump' ? 'Reach highlighted' : 'Connected destinations highlighted' }}</span>
		</div>
		<div class="inspection" v-if="store.debug.tool && debug.canDebug()">Debug: {{ store.debug.tool }} — click the map to place. <button @click="store.debug.tool = ''; store.debug.path = []">Stop placement</button></div>

		<div v-if="previewError" class="previewError" role="alert">{{ previewError }}</div>
	</div>
</template>

<style scoped>
#mapArea { width: 100%; display: flex; flex-direction: column; align-items: center; min-width: 0; }.boardHeading { width: 100%; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; box-sizing: border-box; padding: 5px 8px; background: #f7edc7; border: 2px solid #8e805e; border-radius: 7px 7px 0 0; font-size: 14px; }.mapSurface { width: min(100%, 920px); line-height: 0; box-shadow: 0 2px 5px #6b614a; }.mapSurface svg { width: 100%; height: auto; display: block; }
.printedHexes polygon, .areaHit { fill: #fff; fill-opacity: .001; stroke: transparent; stroke-width: 5; cursor: pointer; }.areaHit.maintenanceSale { fill: #ffd894; fill-opacity: .2; stroke: #b76400; }.areaHit.harvestRemovalSite { fill: #ffd894; fill-opacity: .22; stroke: #b76400; }.areaHit.barahshumSite, .areaHit.calahSite { fill: #d9b7ed; fill-opacity: .28; stroke: #8758a8; }.areaHit.reachable { fill: #bf9dff; fill-opacity: .24; }.areaHit.waterDestination { fill: #74e9ff; fill-opacity: .3; stroke: #008cb3; }.areaHit.routing { stroke: #006dca; stroke-width: 8; }.areaHit:hover, .areaHit:focus, .areaHit.selected { fill: #fff57a; fill-opacity: .32; stroke: #7e6400; }.areaHit.drafting { stroke: #1165bb; fill-opacity: .17; }
.savedCanal { fill: none; stroke: #2269ad; stroke-width: 10; stroke-linecap: round; pointer-events: none; }.draftCanal { fill: none; stroke: #1f75ce; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; opacity: .82; pointer-events: none; }.waterPreviewPath { fill: none; stroke: #aef4ff; stroke-width: 6; stroke-dasharray: 12 12; pointer-events: none; }.waterPreviewDot, .irrigationMarker { fill: #35d6ff; stroke: #fff; stroke-width: 3; pointer-events: none; }.ownerMarker, .waterworkMarker, .areaLabel { pointer-events: none; }.ownerMarker.sold { opacity: .7; }.saleMarkerFrame { fill: none; stroke: #605640; stroke-width: 3; stroke-dasharray: 5 3; pointer-events: none; }.areaLabel { opacity: 0; text-anchor: middle; fill: #333; font-weight: bold; font-size: 13px; paint-order: stroke; stroke: #fff; stroke-width: 3; }
.boardArea:hover .areaLabel, .boardArea:focus-within .areaLabel, .boardArea.showLabel .areaLabel { opacity: 1; }
.inspection { overflow-wrap: anywhere; width: 100%; box-sizing: border-box; min-height: 20px; padding: 6px 8px; background: #fff9df; border: 1px solid #bcae85; font-size: 13px; text-align: left; }.controls { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 8px; font-size: 13px; }.controls button { cursor: pointer; }.previewError { color: #a40000; font-weight: bold; font-size: 13px; } @media (prefers-reduced-motion: reduce) { .waterPreviewDot { display: none; } }
.mapZoom { display: inline-flex; gap: 2px; }.mapZoom button { min-width: 28px; min-height: 25px; font: inherit; font-size: 12px; background: #fff9df; border: 1px solid #bcae85; border-radius: 3px; cursor: pointer; }.mapZoom button:disabled { opacity: .4; cursor: default; }.mapSurface { overflow: auto; }.mapSurface.isZoomed { max-height: max(180px, calc(100vh - 290px)); }@media (max-width: 1050px) { .mapSurface.isZoomed { max-height: 65vh; } }
.areaHit.tradePurchase { stroke: #177daf; stroke-width: 8; stroke-dasharray: 12 6; }.areaHit.tradeSale { stroke: #aa3d2e; stroke-width: 8; stroke-dasharray: 12 6; }
.areaHit.tradePurchase.tradeSale { stroke: #177daf; stroke-dasharray: 12 12; }.purchaseSaleOutline { fill: none; stroke: #aa3d2e; stroke-width: 8; stroke-dasharray: 12 12; stroke-dashoffset: 12; pointer-events: none; }
.areaHit.removalTarget { stroke: #b76400; stroke-width: 8; }
.areaHit.offerTarget { stroke: #ad4da7; stroke-width: 8; fill: #f1b4ed; fill-opacity: .25; }
.mapZoom button[aria-pressed=true] { background: #e1edf5; border-color: #177daf; color: #145575; }
.areaLabel { font-size: 22px; }
.mapHint { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
@media (min-width: 1051px) and (max-width: 1250px), (min-width: 1051px) and (max-height: 800px) { .areaLabel { font-size: 28px; } }
@media (max-width: 500px), (max-width: 1050px) and (max-height: 600px) { .areaLabel { font-size: 36px; stroke-width: 5px; } }
@media (max-width: 1050px) { .mapZoom button { min-width: 40px; min-height: 40px; } }
.inspection { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }.inspection img { width: 25px; height: 25px; object-fit: contain; }.inspectionOwner, .inspectionWork { display: inline-flex; align-items: center; gap: 4px; }.inspectionOwner { min-width: 0; overflow-wrap: anywhere; }
.controls button { min-height: 30px; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #302f27; font: inherit; padding: 4px 8px; }.controls button:disabled { opacity: .5; cursor: default; }@media (max-width: 1050px) { .controls button { min-height: 40px; } }
.controls label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }.controls input[type=checkbox] { width: 18px; height: 18px; margin: 0; }@media (max-width: 1050px) { .controls label { min-height: 40px; } }
@media (max-width: 1050px) and (max-height: 600px) { .mapSurface { width: min(100%, calc((100vh - 160px) * 1.2333)); } }
</style>
