<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import { computed, nextTick, ref, watch } from "vue"
import * as boardDisplay from "../js/URRboardDisplay"
import * as boardRules from "../js/URRmap"
import * as rules from "../js/URRrules"
import * as view from "../js/URRview"
import * as assets from "../js/URRassets"
import * as water from "../js/URRwater"
import * as rf from "../js/URRreference"
import * as debug from "../js/URRdebug"
import { usePersonalStore } from "../stores/URRpersonal.js"
import { useModelStore } from "../stores/URRstore.js"
const emit = defineEmits(["selectArea", "changePath", "confirmAction", "cancelAction"])
const props = defineProps({ selectedHex: { type: String, default: null }, mapAction: { type: Object, default: null }, actionTargets: { type: Array, default: () => [] }, highlightedPlayer: { type: Number, default: null }, removalArea: { type: String, default: null }, landDraft: { type: Object, default: null }, waitingPlayerIndex: { type: Number, default: null }, digCapacity: { type: [Number, String, Array], default: null } })
const store = useModelStore()
const personal = usePersonalStore()
const selectedHexId = ref(null)
watch(() => props.selectedHex, (id) => { selectedHexId.value = id })
const focusedHex = ref(null)
const boardElement = ref(null)
const showCoordinates = ref(false)
const previewOpen = ref(false)
const previewWater = ref(false)
const draftPath = ref([])
const previewError = ref("")
function previewDigPath(path) {
	const capacities = Array.isArray(props.digCapacity) ? [...new Set(props.digCapacity)] : [props.digCapacity]
	const previews = capacities.map((capacity) => boardRules.getDigPathPreview(store, path, capacity))
	return previews.find((preview) => !preview.error) || previews[0] || { cost: null, isComplete: false, error: "No unused digging crews remain." }
}
const canTrace = computed(() => personal.canPlay() && store.gameflow.phase === rf.PHASE_DEVELOPMENT && ["digging", "eridu"].includes(store.gameflow.developmentStep) && store.viewSettings.actionIntent === "dig")
watch(canTrace, (canTrace) => { previewOpen.value = canTrace }, { immediate: true })
const digPreview = computed(() => previewDigPath(draftPath.value))
const digOptions = computed(() => previewOpen.value ? Object.fromEntries(store.board.areas.map((area) => [area.id, previewDigPath([...draftPath.value, area.id])])) : {})
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
const riverPaths = computed(() => (store.board.riverSources || []).map((source) => {
	const positions = []
	let id = source
	while (id !== null && id !== undefined) {
		const position = actualAreas.value.find((entry) => entry.area.id === id)?.position
		if (position) positions.push(`${position.x},${position.y}`)
		id = store.board.riverDownstream[id]
	}
	return positions.join(" ")
}))
const waterReport = computed(() => [...store.computedHistory].reverse().find((entry) => (!store.viewSettings.showReplay || entry.historyIndex <= store.replayStep.index) && ["riverStart", "riverComplete"].includes(entry.administration?.kind))?.administration)
const selectedArea = computed(() => store.board.areas.find((area) => area.id === selectedHexId.value))
const reachable = computed(() => !previewOpen.value && !store.viewSettings.actionIntent && selectedArea.value?.waterwork ? boardRules.getWaterworkReach(store, selectedArea.value.id) : [])
const waterDestinations = computed(() => water.waterChoices(store).map((choice) => choice.area))
const routingArea = computed(() => water.currentWaterFrame(store)?.area)
const chosenRemoval = computed(() => !store.viewSettings.showReplay && store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" ? props.removalArea : null)
const queuedPurchase = computed(() => !store.viewSettings.showReplay && store.gameflow.phase === rf.PHASE_SETTLEMENT ? props.landDraft?.buy : null)
const maintenanceState = computed(() => store.gameflow.phase === rf.PHASE_DEVELOPMENT && !["eridu", "betweenStates"].includes(store.gameflow.developmentStep) && !store.gameflow.pendingOffer ? store.states[view.currentStateId(store)] : null)
const needsMaintenanceSales = computed(() => maintenanceState.value && store.players[maintenanceState.value.king].money < rules.maintenanceShortfall(store, maintenanceState.value.id))
const queuedSales = computed(() => !store.viewSettings.showReplay && (store.gameflow.phase === rf.PHASE_SETTLEMENT || needsMaintenanceSales.value) ? props.landDraft?.sales || [] : [])
const maintenanceLand = computed(() => needsMaintenanceSales.value && store.viewSettings.actionIntent === "sell" ? props.landDraft?.eligibleSales || [] : [])
const harvestRemovalSites = computed(() => store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" ? rules.removableWaterworks(store, view.currentStateId(store)) : [])
const barahshumSites = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	const owner = nation.ownerType === "player" ? nation.owner : store.states[nation.owner]?.king
	return store.viewSettings.actionIntent === "barahshum" && !previewOpen.value && !needsMaintenanceSales.value && rules.canExchangeBarahshum(store, owner) ? rules.barahshumDestinations(store) : []
})

const calahSites = computed(() => store.viewSettings.actionIntent === "calah" ? props.actionTargets : [])

// Draw every action above the pieces, using the same outline and badge treatment.
const mapDecisions = computed(() => {
	if (store.viewSettings.showReplay || hasMapInspection.value || store.turnDraft.ready) return {}
	const targets = {}
	const add = (ids, label, kind = "destination", source = false) => {
		for (const id of ids) if (id) targets[id] = { label, kind, source }
	}
	if (previewOpen.value) {
		for (const [id, option] of Object.entries(digOptions.value)) {
			if (!option.error) add([id], "", option.isComplete ? "finish" : "destination", !draftPath.value.length || !option.isComplete)
		}
		draftPath.value.forEach((id, index) => add([id], index === 0 ? "Source" : "", "path", index === 0))
	} else {
		if (store.gameflow.phase === rf.PHASE_SETTLEMENT && !store.viewSettings.actionIntent) {
			const actor = store.gameflow.turnOrder[0]
			add(store.board.areas.filter((area) => !area.isRiver && area.owner === null && !boardRules.isNationLandClosed(store, area)).map((area) => area.id), "Buy")
			add(store.board.areas.filter((area) => !area.isRiver && area.owner === actor).map((area) => area.id), "Sell", "sale")
		}
		add(props.actionTargets, store.viewSettings.actionIntent === "calah" ? "Calah" : "Build", "build")
		add(maintenanceLand.value, "Sell", "sale")
		add(barahshumSites.value, "Canal", "build")
		if (barahshumSites.value.length) add([store.board.areas.find((area) => area.nation === rf.NATION_BARAHSHUM)?.id], "Source", "build", true)
		add(harvestRemovalSites.value, "Remove", "sale")
		add([routingArea.value], "Source", "destination", true)
		waterDestinations.value.forEach((id, index) => { targets[id] = { label: String(index + 1), kind: "destination", number: true } })
	}
	add(queuedSales.value, "Sale", "sale")
	add([queuedPurchase.value], queuedSales.value.includes(queuedPurchase.value) ? "Buy/Sell" : "Buy", "destination")
	add([store.gameflow.pendingOffer?.action.area], "Review", "build")
	return targets
})

const inspectedNation = ref(null)
watch(() => store.gameflow.phase, () => { inspectedNation.value = null })
const hasMapInspection = computed(() => inspectedNation.value !== null || store.viewSettings.inspectedState !== null || props.highlightedPlayer !== null)
const inspectionTargets = computed(() => new Set(store.board.areas.filter((area) =>
	(inspectedNation.value !== null && area.nation === inspectedNation.value) ||
	(store.viewSettings.inspectedState !== null && area.state === store.viewSettings.inspectedState) ||
	(props.highlightedPlayer !== null && area.owner === props.highlightedPlayer)
).map((area) => area.id)))
const confirmationPosition = computed(() => {
	const position = actualAreas.value.find((entry) => entry.area.id === props.mapAction?.area)?.position
	return position ? { left: `clamp(0px, ${position.x / boardDisplay.MAP_WIDTH * 100}%, calc(100% - 220px))`, top: `min(${(position.y + 45) / boardDisplay.MAP_HEIGHT * 100}%, calc(100% - 100px))` } : null
})
const mapHint = computed(() => {
	if (store.turnDraft.ready) return "Review your draft · Undo, Reset Turn, or End Turn to confirm"

	if (hasMapInspection.value) return "Inspecting the map · Clear map inspection to show available actions"
	if (store.viewSettings.showReplay) return "Historical position · click a hex to inspect"
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "routing") return `${props.waitingPlayerIndex !== null ? "Waiting · " : ""}Choose a numbered blue destination; the source has a dashed outline`
	if (props.waitingPlayerIndex !== null) return `Waiting · ${store.gameflow.pendingOffer?.action.area ? 'review the highlighted site' : 'click a hex to inspect'}`
	if (store.viewSettings.actionIntent === "build") return "Choose a highlighted site to build a pump or reservoir"
	if (store.viewSettings.actionIntent === "calah") return "Choose a highlighted site for Calah's free waterwork"
	if (store.viewSettings.actionIntent === "barahshum") return "Choose a highlighted canal destination beside Barahshum"
	if (store.viewSettings.actionIntent === "sell") return props.landDraft?.fundingGap === 0 ? "Crew covered · finish development to save the sales" : maintenanceLand.value.length ? "Choose highlighted land to fund the required crew" : "No eligible funding land remains · review crew funding"
	if (store.gameflow.pendingOffer) return store.gameflow.pendingOffer.action.type === "offerNation" ? "Review the proposed nation purchase" : "Review the proposal at the highlighted site"
	if (queuedPurchase.value || queuedSales.value.length) return needsMaintenanceSales.value ? "Crew funding: red sites are queued sales" : "Trade draft: blue purchase · red sales"
	if (store.gameflow.phase === rf.PHASE_SETTLEMENT) return barahshumSites.value.length ? "Select land · purple sites allow Barahshum" : "Select land to buy or sell"
	if (previewOpen.value) return "Choose a highlighted source, then extend the canal · green allows finishing; gold marks your selection"
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT) {
		if (store.gameflow.developmentStep === "eridu") return "Trace Eridu’s canal or skip digging"
		if (store.gameflow.developmentStep === "betweenStates") return barahshumSites.value.length ? "Barahshum: select a highlighted canal site" : "Review the board before the next state"
		if (needsMaintenanceSales.value) return maintenanceLand.value.length ? "Select highlighted land to fund the crew" : "Review the required revolution"
		const exchanges = [calahSites.value.length ? "Calah" : "", barahshumSites.value.length ? "Barahshum" : ""].filter(Boolean).join(" or ")
		if (store.gameflow.developmentStep === "digging" && store.states[view.currentStateId(store)]?.diggers.some((crew) => !crew.hasDug)) return `Choose a canal path or buy equipment${exchanges ? ` · purple sites allow ${exchanges}` : ""}`
		return exchanges ? `Select a site · purple sites allow ${exchanges}` : "Select a site for a pump or reservoir"
	}
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest") return harvestRemovalSites.value.length ? "Harvest: choose a highlighted waterwork if storing" : "Choose how to use the harvest"
	return "Click a hex to inspect"
})

function inspectArea(id) {
	focusedHex.value = id
	selectedHexId.value = id
	if (store.debug.tool && debug.canDebug()) {
		const position = actualAreas.value.find((entry) => entry.area.id === id)?.position || boardDisplay.PRINTED_HEXES.find((hex) => hex.id === id)
		debug.placeAtArea(id, position)
		return
	}
	if (canTrace.value && !previewOpen.value) previewOpen.value = true
	if (!canTrace.value || !previewOpen.value || draftPath.value.at(-1) === id) return
	const preview = digOptions.value[id]
	if (preview.error) { previewError.value = preview.error; return }
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
		const rect = hex.getBoundingClientRect()
		if (rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth) revealAboveActions(hex, "instant")
	})
}
function validateDraft() {
	previewError.value = ""
	if (draftPath.value.length) previewError.value = digPreview.value.error
}
watch(() => props.digCapacity, validateDraft)
function undoDraft() {
	draftPath.value.pop()
	selectedHexId.value = draftPath.value.at(-1) ?? null
	if (selectedHexId.value !== null) focusedHex.value = selectedHexId.value
	validateDraft()
}
function clearDraft() { draftPath.value = []; previewError.value = "" }
function finishDig() { clearDraft(); previewOpen.value = false }
function areaDescription(area) {
	let digDescription = ""
	if (previewOpen.value) {
		const option = digOptions.value[area.id]
		digDescription = option.error ? ` · Cannot add: ${option.error}` : option.isComplete ? " · Legal route endpoint" : " · Legal route start or continuation"
	}
	const unmarkedStatus = boardRules.isNationLandClosed(store, area) ? "Independent nation" : "Uncolonized"
	const owner = area.owner === null ? area.markerOwner === null ? unmarkedStatus : `For sale · ${store.players[area.markerOwner].displayName}'s marker` : store.players[area.owner].displayName
	const homeland = area.nation !== null ? ` · ${rf.NATION_NAMES[area.nation]} homeland` : ""
	const closure = boardRules.isNationLandClosed(store, area) ? " · Nation land closed" : ""
	const price = !area.isRiver && (store.gameflow.phase === rf.PHASE_SETTLEMENT || store.gameflow.phase === rf.PHASE_GAME_OVER || needsMaintenanceSales.value) ? ` · ${area.markerOwner === null ? 'Colonization' : 'Market'} price ${rules.landPrice(store, area, area.markerOwner === null)} SPL` : ""
	const waterwork = area.waterwork ? ` · ${rf.STATE_NAMES[area.waterwork.state]} ${area.waterwork.kind}, ${view.waterworkMeasure(area.waterwork)}` : ""
	const irrigation = area.irrigatedBy !== null ? ` · Irrigated by ${rf.STATE_NAMES[area.irrigatedBy]}` : ""
	return `${area.label || area.id}${digDescription}: ${area.isRiver ? 'River' : `${rf.LAND_NAMES[area.landType]}${area.isCity ? ' city' : ''}, ${rf.STATE_NAMES[area.state]}, ${owner}`}${homeland}${closure}${props.landDraft?.blocked?.[area.id] ? ` · ${props.landDraft.blocked[area.id]}` : ""}${price}${waterwork}${irrigation}${queuedPurchase.value === area.id ? " · Queued purchase" : ""}${queuedSales.value.includes(area.id) ? " · Queued sale" : ""}${chosenRemoval.value === area.id ? " · Selected for removal if harvest is stored" : harvestRemovalSites.value.includes(area.id) ? " · Removable if harvest is stored" : ""}${calahSites.value.includes(area.id) ? " · Calah waterwork location" : ""}${barahshumSites.value.includes(area.id) ? " · Barahshum canal destination" : ""}`
}
watch(selectedHexId, (id) => emit("selectArea", id))
watch(draftPath, (path) => emit("changePath", [...path]), { deep: true })
function revealSelection() {
	const hex = boardElement.value.querySelector(".areaHit.selected")
	if (!hex) return
	hex.scrollIntoView({ block: "nearest", behavior: "instant" })
	revealAboveActions(hex)
}
function revealAboveActions(hex, behavior = "smooth") {
	const visibleHeight = window.innerHeight
	const rect = hex.getBoundingClientRect()
	if (rect.top >= 12 && rect.bottom <= visibleHeight - 12) return
	window.scrollBy({ top: rect.top + rect.height / 2 - visibleHeight / 2, behavior })
}
function revealBoard() { boardElement.value.scrollIntoView({ block: "start", behavior: "smooth" }) }
async function locateArea(id, shouldSelect = false) {
	if (shouldSelect) selectedHexId.value = id
	focusArea(id)
	await nextTick()
	const hex = boardElement.value.querySelector(`[data-area-id="${id}"]`)
	hex.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
	revealAboveActions(hex)
}
function locateNation(id) {
	inspectedNation.value = id
	store.viewSettings.inspectedState = null
	store.viewSettings.showOwnedLand = false
	return locateArea(store.board.areas.find((area) => area.nation === id).id)
}
defineExpose({ locateNation, finishDig, revealSelection, revealBoard, locateArea, isTracing: previewOpen })
watch(() => [store.gameflow.phase, store.gameflow.turnOrder[0], store.gameflow.stateIndex, store.gameflow.developmentStep, store.rain.step, store.rain.harvestOrder[0], water.currentWaterFrame(store)?.area], () => { finishDig(); selectedHexId.value = null; previewOpen.value = canTrace.value })
</script>

<template>
	<div id="mapArea" ref="boardElement">
		<div class="boardHeading"><b>Game board</b><span class="mapHint"><PlayerMarker v-if="waitingPlayerIndex !== null" :index="waitingPlayerIndex" /> {{ mapHint }}</span><div class="mapZoom"><button :aria-pressed="showCoordinates" @click="showCoordinates = !showCoordinates" title="Show coordinates on every hex">Hex labels</button></div></div>
		<div v-if="waterReport" class="riverStatus" role="status"><span><b>River flow · Turn {{ waterReport.turn }}</b> · {{ waterReport.waterTotal }} water from upstream<template v-if="waterReport.kind === 'riverComplete'"> · {{ waterReport.irrigatedCount }} wet hexes · {{ waterReport.outflow }} water flows off the board<template v-if="!waterReport.irrigatedCount"> · No irrigation income</template></template><template v-else> · Routing in progress</template></span></div>
		<div class="controls" v-if="previewOpen"><b>Canal path:</b><span>{{ draftPath.map((id) => store.board.areas.find((area) => area.id === id)?.label || id).join(' → ') || 'Click a highlighted starting area.' }}</span><button @click="undoDraft" :disabled="!draftPath.length">Undo</button><button @click="clearDraft" :disabled="!draftPath.length">Clear</button><label><input type="checkbox" v-model="previewWater" :disabled="draftPath.length < 2" /> Animate draft</label></div>
		<div v-if="previewOpen" class="digStatus" role="status"><b>{{ Array.isArray(digCapacity) ? 'Automatic crew selection' : digCapacity === null ? 'No unused crew' : `${digCapacity} crew` }}</b><template v-if="digPreview.cost"> · {{ digPreview.cost.canals }} canal points + {{ digPreview.cost.junctions }} junction points = {{ digPreview.cost.points }} total</template><span v-if="draftPath.length && !digPreview.error"> · {{ digPreview.isComplete ? 'Ready to add; a fitting crew will be used. You may extend the route.' : draftPath.length === 1 ? 'Select an adjacent highlighted hex.' : 'Unfinished route: continue to an existing river or canal.' }}</span></div>
		<div v-if="previewError" class="previewError" role="alert">{{ previewError }}</div>
		<div class="mapSurface">
			<svg :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" aria-label="UR: 1830 BC game board"><title>Use arrow keys to move between adjacent hexes, and Enter or Space to select.</title>
				<image :href="assets.mapImage" x="0" y="0" :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" />
				<g v-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON" class="flowingRivers"><polyline v-for="(path, index) in riverPaths" :key="index" :points="path" /></g>
				<g v-if="!actualAreas.length" class="printedHexes"><polygon v-for="hex in boardDisplay.PRINTED_HEXES" :key="hex.id" :points="boardDisplay.hexPoints(hex.x, hex.y)" @click="inspectArea(hex.id)" /></g>
				<polyline v-for="(canal, index) in savedCanals" :key="`canal-${index}`" :points="canal" class="savedCanal" />
				<polyline v-if="draftLine" :points="draftLine" class="draftCanal" />
				<path v-if="waterPath && previewWater" :d="waterPath" class="waterPreviewPath" />
				<circle v-if="waterPath && previewWater" r="11" class="waterPreviewDot"><animateMotion :path="waterPath" dur="2.6s" repeatCount="indefinite" /></circle>
				<g v-for="entry in actualAreas" :key="entry.area.id" class="boardArea" :class="{ showLabel: showCoordinates || (inspectedNation !== null && entry.area.nation === inspectedNation) || selectedHexId === entry.area.id || queuedPurchase === entry.area.id || queuedSales.includes(entry.area.id) || chosenRemoval === entry.area.id || draftPath.includes(entry.area.id) }">
					<polygon v-if="inspectionTargets.has(entry.area.id)" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="inspectionHalo" />
					<polygon v-if="(inspectedNation !== null && entry.area.nation === inspectedNation) || (store.viewSettings.inspectedState !== null && entry.area.state === store.viewSettings.inspectedState)" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="inspectionHighlight" />
					<polygon v-if="highlightedPlayer !== null && entry.area.owner === highlightedPlayer" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="inspectionHighlight ownedLandHighlight" />
					<polygon :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="areaHit" :class="[{ purchaseLocked: !store.viewSettings.showReplay && !!props.landDraft?.blocked?.[entry.area.id] }, hasMapInspection || store.turnDraft.ready || store.viewSettings.showReplay ? {} : { actionSite: actionTargets.includes(entry.area.id), digComplete: digOptions[entry.area.id] && !digOptions[entry.area.id].error && digOptions[entry.area.id].isComplete, digContinue: digOptions[entry.area.id] && !digOptions[entry.area.id].error && !digOptions[entry.area.id].isComplete, selected: selectedHexId === entry.area.id, drafting: draftPath.includes(entry.area.id), reachable: reachable.includes(entry.area.id), waterDestination: waterDestinations.includes(entry.area.id), routing: routingArea === entry.area.id, maintenanceSale: maintenanceLand.includes(entry.area.id), barahshumSite: barahshumSites.includes(entry.area.id), calahSite: calahSites.includes(entry.area.id), harvestRemovalSite: harvestRemovalSites.includes(entry.area.id), removalTarget: chosenRemoval === entry.area.id, tradePurchase: queuedPurchase === entry.area.id, tradeSale: queuedSales.includes(entry.area.id), offerTarget: store.gameflow.pendingOffer?.action.area === entry.area.id }]" role="button" :tabindex="tabArea === entry.area.id ? 0 : -1" :data-area-id="entry.area.id" :aria-label="areaDescription(entry.area)" @focus="focusedHex = entry.area.id" @keydown="moveFocus($event, entry)" @click="inspectArea(entry.area.id)" @keydown.enter.prevent="inspectArea(entry.area.id)" @keydown.space.prevent="inspectArea(entry.area.id)"><title>{{ areaDescription(entry.area) }}</title></polygon>
					<polygon v-if="mapDecisions[entry.area.id] && queuedPurchase === entry.area.id && queuedSales.includes(entry.area.id)" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="purchaseSaleOutline" />
					<polygon v-if="entry.area.irrigatedBy !== null" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="wetHex" />
					<polygon v-if="entry.area.id === store.viewSettings.historyArea" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="historyOutline" />
					<image v-if="entry.area.owner !== null" :href="assets.getPlayerMarkerImage(entry.area.markerOwner)" :x="entry.position.x - 22" :y="entry.position.y - 22" width="44" height="44" class="ownerMarker" />
					<rect v-if="entry.area.markerOwner !== null" :x="entry.position.x - 22" :y="entry.position.y - 22" width="44" height="44" class="tokenFrame" :class="{ saleMarkerFrame: entry.area.owner === null }" />
					<text :x="entry.position.x" :y="entry.position.y + 41" class="areaLabel">{{ entry.area.label || entry.area.id }}</text>
					<image v-if="entry.area.waterwork" :href="assets.getWaterworkImage(entry.area.waterwork.state, entry.area.waterwork.capacity)" :x="entry.position.x + 10" :y="entry.position.y - 40" width="32" height="32" class="waterworkMarker"><title>{{ rf.STATE_NAMES[entry.area.waterwork.state] }} {{ entry.area.waterwork.kind }} · {{ view.waterworkMeasure(entry.area.waterwork) }}</title></image>
					<rect v-if="entry.area.waterwork" :x="entry.position.x + 10" :y="entry.position.y - 40" width="32" height="32" class="tokenFrame" />
					<circle v-if="entry.area.irrigatedBy !== null" :cx="entry.position.x + 24" :cy="entry.position.y + 20" r="10" class="irrigationMarker"><title>Irrigated by {{ rf.STATE_NAMES[entry.area.irrigatedBy] }}</title></circle>
					<g v-if="mapDecisions[entry.area.id]" class="mapDecisionHighlight" :class="mapDecisions[entry.area.id].kind">
						<polygon :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="mapDecisionHalo" />
						<polygon :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="mapDecisionOutline" :class="{ source: mapDecisions[entry.area.id].source, chosen: selectedHexId === entry.area.id || chosenRemoval === entry.area.id }" />
						<template v-if="mapDecisions[entry.area.id].number"><circle :cx="entry.position.x - 28" :cy="entry.position.y - 27" r="16" class="decisionBadge" /><text :x="entry.position.x - 28" :y="entry.position.y - 27" class="destinationNumber">{{ mapDecisions[entry.area.id].label }}</text></template>
						<template v-else-if="mapDecisions[entry.area.id].label"><rect :x="entry.position.x - 36" :y="entry.position.y + 23" width="72" height="23" rx="4" class="decisionBadge" /><text :x="entry.position.x" :y="entry.position.y + 35" class="decisionLabel">{{ mapDecisions[entry.area.id].label }}</text></template>
					</g>
					<polygon v-if="Object.keys(mapDecisions).length && !mapDecisions[entry.area.id]" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="actionShade" />
					<polygon v-if="hasMapInspection && !inspectionTargets.has(entry.area.id)" :points="boardDisplay.hexPoints(entry.position.x, entry.position.y)" class="inspectionShade" />
				</g>
			</svg>
			<div v-if="mapAction && confirmationPosition && !hasMapInspection && !store.turnDraft.ready" class="mapConfirmation" :style="confirmationPosition">
				<b>{{ mapAction.label }}</b><small>{{ mapAction.detail }}</small>
				<div><button :disabled="!mapAction.canConfirm" @click="emit('confirmAction')">Confirm</button><button @click="emit('cancelAction')">Cancel</button></div>
			</div>
		</div>
		<div v-if="hasMapInspection" class="mapInspectionCue">Inspecting <span v-if="inspectedNation !== null">{{ rf.NATION_NAMES[inspectedNation] }} territory</span><span v-if="store.viewSettings.inspectedState !== null">{{ rf.STATE_NAMES[store.viewSettings.inspectedState] }} territory</span><span v-if="store.viewSettings.inspectedState !== null && highlightedPlayer !== null"> · </span><span v-if="highlightedPlayer !== null"><PlayerMarker :index="highlightedPlayer" /> owned land</span> · other hexes dimmed; clear inspection to show available actions<button @click="inspectedNation = null; store.viewSettings.inspectedState = null; store.viewSettings.showOwnedLand = false">Clear map inspection</button></div>
		<div class="boardLegend">White square: sold land · River number: reservoir water capacity · Land number: pump reach in canals</div>
		<div class="inspection" v-if="selectedArea">
			<b>{{ selectedArea.label || selectedArea.id }}</b>
			<span v-if="selectedArea.nation !== null">{{ rf.NATION_NAMES[selectedArea.nation] }} homeland</span>
			<span v-if="selectedArea.isRiver">River</span>
			<template v-else>
				<img :src="assets.getTerrainImage(selectedArea.landType, selectedArea.isCity)" :alt="`${rf.LAND_NAMES[selectedArea.landType]}${selectedArea.isCity ? ' city' : ''}`" :title="`${rf.LAND_NAMES[selectedArea.landType]}${selectedArea.isCity ? ' city' : ''}`" />
				<span v-if="selectedArea.isCity">City</span>
				<img :src="assets.getStateOrderImage(selectedArea.state)" :alt="rf.STATE_NAMES[selectedArea.state]" :title="rf.STATE_NAMES[selectedArea.state]" />
				<span class="inspectionOwner" v-if="selectedArea.owner !== null"><PlayerMarker :index="selectedArea.owner" /></span>
				<span v-else-if="selectedArea.markerOwner !== null" class="inspectionOwner"><PlayerMarker :index="selectedArea.markerOwner" />For sale</span>
				<span v-else>{{ boardRules.isNationLandClosed(store, selectedArea) ? 'Independent nation' : 'Uncolonized' }}</span>
			</template>
			<span class="inspectionWork" v-if="selectedArea.waterwork"><img :src="assets.getWaterworkImage(selectedArea.waterwork.state, selectedArea.waterwork.capacity)" :alt="rf.STATE_NAMES[selectedArea.waterwork.state]" />{{ selectedArea.waterwork.kind }} · {{ view.waterworkMeasure(selectedArea.waterwork) }}</span>
			<span v-if="selectedArea.irrigatedBy !== null">Irrigated by {{ rf.STATE_NAMES[selectedArea.irrigatedBy] }}</span>
			<span v-if="queuedPurchase === selectedArea.id">Queued purchase</span>
			<span v-if="queuedSales.includes(selectedArea.id)">Queued sale</span>
			<span v-if="chosenRemoval === selectedArea.id">Selected for removal if harvest is stored</span>
			<span v-else-if="harvestRemovalSites.includes(selectedArea.id)">Removable if harvest is stored</span>
			<span v-if="calahSites.includes(selectedArea.id)">Calah free-waterwork location</span>
			<span v-if="barahshumSites.includes(selectedArea.id)">Barahshum canal destination</span>
			<span v-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'routing' && selectedArea.id !== routingArea && !waterDestinations.includes(selectedArea.id)">Outside current water destinations</span>
			<span v-if="!selectedArea.isRiver && (store.gameflow.phase === rf.PHASE_SETTLEMENT || store.gameflow.phase === rf.PHASE_GAME_OVER || needsMaintenanceSales)">{{ selectedArea.markerOwner === null ? 'Colonization' : 'Market' }} price {{ rules.landPrice(store, selectedArea, selectedArea.markerOwner === null) }} SPL</span>
			<span v-if="!selectedArea.isRiver && boardRules.isNationLandClosed(store, selectedArea) && store.gameflow.phase !== rf.PHASE_RAINY_SEASON">Nation land closed</span>
			<span v-if="selectedArea.waterwork">{{ selectedArea.waterwork.kind === 'pump' ? 'Reach highlighted' : 'Connected destinations highlighted' }}</span>
		</div>
		<div class="inspection" v-if="store.debug.tool && debug.canDebug()">Debug: {{ store.debug.tool }} — click the map to place. <button @click="store.debug.tool = ''; store.debug.path = []">Stop placement</button></div>

	</div>
</template>

<style scoped>
.areaHit.purchaseLocked { fill: #444; fill-opacity: .35; }
.mapSurface { position: relative; }.mapConfirmation { position: absolute; width: 220px; max-width: 100%; box-sizing: border-box; padding: 8px; background: #fff9e9; border: 2px solid #177daf; border-radius: 5px; box-shadow: 0 2px 8px #0005; text-align: left; font-size: 16px; font-weight: 600; line-height: 1.4; z-index: 2; }.mapConfirmation b { display: block; }.mapConfirmation small { display: block; margin: 4px 0; }.mapConfirmation button { min-height: 36px; margin-right: 5px; font: inherit; }.mapConfirmation button:first-child { background: #d9ead1; }.areaHit.actionSite { fill: #7bdca3; fill-opacity: .35; stroke: #176a3b; stroke-width: 6; }.actionShade { fill: #fff9e9; fill-opacity: .55; pointer-events: none; }

.areaHit.digComplete { fill: #7bdca3; fill-opacity: .3; stroke: #176a3b; }
.areaHit.digContinue { fill: #c1e8ed; fill-opacity: .25; stroke: #257b89; stroke-dasharray: 10 6; }
.digStatus, .previewError { width: 100%; box-sizing: border-box; padding: 8px; background: #fff9df; text-align: left; font-size: 16px; font-weight: 600; line-height: 1.5; }

.boardLegend { font-size: 16px; font-weight: 600; line-height: 1.4; padding: 6px 8px; text-align: left; }
#mapArea { width: 100%; display: flex; flex-direction: column; align-items: center; min-width: 0; }.boardHeading { width: 100%; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; box-sizing: border-box; padding: 5px 8px; background: #f7edc7; border: 2px solid #8e805e; border-radius: 7px 7px 0 0; font-size: 16px; font-weight: 600; }.mapSurface { width: 100%; line-height: 0; box-shadow: 0 2px 5px #6b614a; }.mapSurface svg { width: 100%; height: auto; display: block; }
.printedHexes polygon, .areaHit { fill: #fff; fill-opacity: .001; stroke: transparent; stroke-width: 5; cursor: pointer; }.areaHit.maintenanceSale { fill: #ffd894; fill-opacity: .2; stroke: #b76400; }.areaHit.harvestRemovalSite { fill: #ffd894; fill-opacity: .22; stroke: #b76400; }.areaHit.barahshumSite, .areaHit.calahSite { fill: #d9b7ed; fill-opacity: .28; stroke: #8758a8; }.areaHit.reachable { fill: #bf9dff; fill-opacity: .24; }.areaHit.waterDestination { fill: #74e9ff; fill-opacity: .3; stroke: #008cb3; }.areaHit.routing { stroke: #006dca; stroke-width: 8; }.areaHit:hover, .areaHit:focus, .areaHit.selected { fill: #fff57a; fill-opacity: .32; stroke: #7e6400; }.areaHit.drafting { stroke: #1165bb; fill-opacity: .17; }
.savedCanal { fill: none; stroke: #2269ad; stroke-width: 10; stroke-linecap: round; pointer-events: none; }.draftCanal { fill: none; stroke: #1f75ce; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; opacity: .82; pointer-events: none; }.waterPreviewPath { fill: none; stroke: #aef4ff; stroke-width: 6; stroke-dasharray: 12 12; pointer-events: none; }.waterPreviewDot, .irrigationMarker { fill: #35d6ff; stroke: #fff; stroke-width: 3; pointer-events: none; }.ownerMarker, .waterworkMarker, .areaLabel { pointer-events: none; }.areaLabel { opacity: 0; text-anchor: middle; fill: #333; font-weight: bold; font-size: 16px; font-weight: 600; paint-order: stroke; stroke: #fff; stroke-width: 3; }
.tokenFrame { fill: none; stroke: #000; stroke-width: 2; pointer-events: none; }.saleMarkerFrame { fill: #fff; }.irrigationMarker { stroke: #000; stroke-width: 2; }
.riverStatus { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 8px; box-sizing: border-box; background: #def5ff; font-size: 16px; font-weight: 600; line-height: 1.4; }.riverStatus button { flex-shrink: 0; padding: 6px; font: inherit; border: 1px solid #177daf; border-radius: 3px; background: #fffdf4; cursor: pointer; }.flowingRivers { fill: none; stroke: #16a9db; stroke-width: 6; stroke-dasharray: 12 9; pointer-events: none; animation: riverFlow 1s linear infinite; }.wetHex { fill: #35d6ff; fill-opacity: .22; stroke: #008cb3; stroke-width: 3; pointer-events: none; }.historyOutline { fill: none; stroke: #177daf; stroke-width: 8; pointer-events: none; }@keyframes riverFlow { to { stroke-dashoffset: -21; } }@media (prefers-reduced-motion: reduce) { .flowingRivers { animation: none; } }
.boardArea:hover .areaLabel, .boardArea:focus-within .areaLabel, .boardArea.showLabel .areaLabel { opacity: 1; }
.inspection { overflow-wrap: anywhere; width: 100%; box-sizing: border-box; min-height: 20px; padding: 6px 8px; background: #fff9df; border: 1px solid #bcae85; font-size: 16px; font-weight: 600; text-align: left; }.controls { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 8px; font-size: 16px; font-weight: 600; }.controls button { cursor: pointer; }.previewError { color: #a40000; font-weight: bold; font-size: 16px; font-weight: 600; } @media (prefers-reduced-motion: reduce) { .waterPreviewDot { display: none; } }
.mapZoom { display: inline-flex; gap: 2px; }.mapZoom button { min-width: 28px; min-height: 25px; font: inherit; font-size: 16px; font-weight: 600; background: #fff9df; border: 1px solid #bcae85; border-radius: 3px; cursor: pointer; }.mapZoom button:disabled { opacity: .4; cursor: default; }
.areaHit.tradePurchase { stroke: #177daf; stroke-width: 8; stroke-dasharray: 12 6; }.areaHit.tradeSale { stroke: #aa3d2e; stroke-width: 8; stroke-dasharray: 12 6; }
.areaHit.tradePurchase.tradeSale { stroke: #177daf; stroke-dasharray: 12 12; }.purchaseSaleOutline { fill: none; stroke: #aa3d2e; stroke-width: 8; stroke-dasharray: 12 12; stroke-dashoffset: 12; pointer-events: none; }
.areaHit.removalTarget { stroke: #b76400; stroke-width: 8; }
.areaHit.offerTarget { stroke: #ad4da7; stroke-width: 8; fill: #f1b4ed; fill-opacity: .25; }
.mapZoom button[aria-pressed=true] { background: #e1edf5; border-color: #177daf; color: #145575; }
.areaLabel { font-size: 22px; }
.mapHint { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
.mapZoom button { min-width: 40px; min-height: 40px; }
.inspection { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }.inspection img { width: 25px; height: 25px; object-fit: contain; }.inspectionOwner, .inspectionWork { display: inline-flex; align-items: center; gap: 4px; }.inspectionOwner { min-width: 0; overflow-wrap: anywhere; }
.controls button { min-height: 30px; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #302f27; font: inherit; padding: 4px 8px; }.controls button:disabled { opacity: .5; cursor: default; }@media (max-width: 1050px) { .controls button { min-height: 40px; } }
.controls label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }.controls input[type=checkbox] { width: 18px; height: 18px; margin: 0; }@media (max-width: 1050px) { .controls label { min-height: 40px; } }
.mapDecisionHighlight { pointer-events: none; --decision-color: #007cac; }.mapDecisionHighlight.finish { --decision-color: #176a3b; }.mapDecisionHighlight.build { --decision-color: #75439c; }.mapDecisionHighlight.sale { --decision-color: #a34720; }.mapDecisionHighlight.path { --decision-color: #234872; }.mapDecisionHalo { fill: none; stroke: white; stroke-width: 12; }.mapDecisionOutline { fill: none; stroke: var(--decision-color); stroke-width: 7; }.mapDecisionOutline.source { stroke-dasharray: 12 6; }.mapDecisionOutline.chosen { stroke: #a57000; }.decisionBadge { fill: var(--decision-color); stroke: white; stroke-width: 3; }.destinationNumber, .decisionLabel { fill: white; font-size: 20px; font-weight: bold; text-anchor: middle; dominant-baseline: central; }.decisionLabel { font-size: 16px; }

.inspectionHalo { fill: none; stroke: #fffdf5; stroke-width: 9; pointer-events: none; }.inspectionShade { fill: #e9e2d2; fill-opacity: .78; pointer-events: none; }.inspectionHighlight { fill: white; fill-opacity: .12; stroke: #514632; stroke-width: 3; stroke-dasharray: 3 5; pointer-events: none; }.inspectionHighlight.ownedLandHighlight { stroke-width: 4; stroke-dasharray: 10 5; }.mapInspectionCue { width: 100%; box-sizing: border-box; padding: 6px 8px; font-size: 16px; font-weight: 600; text-align: left; background: #fff9df; }.mapInspectionCue button { font: inherit; margin-left: 8px; padding: 4px 6px; background: #fffdf5; border: 1px solid #b3a481; border-radius: 3px; cursor: pointer; }
</style>
