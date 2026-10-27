<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import WaterPlayback from "./WaterPlayback.vue"
import { useWaterPlaybackStore } from "../stores/URRwaterPlayback.js"
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
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
const emit = defineEmits(["selectArea", "clickArea", "changePath", "confirmAction", "cancelAction"])
const props = defineProps({ selectedHex: { type: String, default: null }, mapAction: { type: Object, default: null }, actionTargets: { type: Array, default: () => [] }, highlightedPlayer: { type: Number, default: null }, removalArea: { type: String, default: null }, landDraft: { type: Object, default: null }, waitingPlayerIndex: { type: Number, default: null }, digCapacity: { type: [Number, String, Array], default: null } })
const store = useModelStore()
const { t, locale } = useI18n()
const playback = useWaterPlaybackStore()
const displayedBoard = computed(() => playback.state.visible ? playback.state.board : store.board)
const reservoirCapacities = Object.values(rf.ERA_CARD_DATA).map((card) => card.reservoir[0])
const pumpCapacities = Object.values(rf.ERA_CARD_DATA).map((card) => card.pump[0])
const personal = usePersonalStore()
const selectedHexId = ref(null)
watch(() => props.selectedHex, (id) => { selectedHexId.value = id })
const focusedHex = ref(null)
const boardElement = ref(null)
const showCoordinates = ref(false)
const previewOpen = ref(false)
const draftPath = ref([])
const previewError = ref("")
function previewDigPath(path) {
	const capacities = Array.isArray(props.digCapacity) ? [...new Set(props.digCapacity)] : [props.digCapacity]
	const previews = capacities.map((capacity) => boardRules.getDigPathPreview(store, path, capacity))
	return previews.find((preview) => !preview.error) || previews[0] || { cost: null, isComplete: false, error: t("actions.noCrewsRemain") }
}
const canTrace = computed(() => !playback.state.visible && personal.canPlay() && store.gameflow.phase === rf.PHASE_DEVELOPMENT && ["digging", "eridu"].includes(store.gameflow.developmentStep) && store.viewSettings.actionIntent === "dig")
watch(canTrace, (canTrace) => { previewOpen.value = canTrace }, { immediate: true })
const digPreview = computed(() => previewDigPath(draftPath.value))
const digOptions = computed(() => previewOpen.value ? Object.fromEntries(store.board.areas.map((area) => [area.id, previewDigPath([...draftPath.value, area.id])])) : {})
const actualAreas = computed(() => displayedBoard.value.areas.map((area) => ({ area, position: boardDisplay.getAreaPosition(area) })).filter((entry) => entry.position))
// SVG paints later groups on top, so keep the selected border above its neighbours.
const renderedAreas = computed(() => [...actualAreas.value].sort((a, b) => Number(a.area.id === selectedHexId.value) - Number(b.area.id === selectedHexId.value)))
const areaClips = computed(() => Object.fromEntries(actualAreas.value.map((entry) => [entry.area.id, boardDisplay.hexCellPoints(entry.position, actualAreas.value.map((area) => area.position))])))
const actionClips = computed(() => {
	const targets = actualAreas.value.filter((entry) => mapDecisions.value[entry.area.id])
	return Object.fromEntries(targets.map((entry) => [entry.area.id, boardDisplay.hexClipPoints(entry.position, targets.map((target) => target.position))]))
})
const stateBorders = computed(() => boardDisplay.stateBorderPaths(displayedBoard.value.areas))
const outerStateBorders = computed(() => boardDisplay.outerStateBorderPaths(stateBorders.value))
const tabArea = computed(() => actualAreas.value.some((entry) => entry.area.id === focusedHex.value) ? focusedHex.value : actualAreas.value[0]?.area.id)
const draftPositions = computed(() => draftPath.value.map((id) => actualAreas.value.find((entry) => entry.area.id === id)?.position || boardDisplay.PRINTED_HEXES.find((hex) => hex.id === id)).filter(Boolean))
const draftLine = computed(() => draftPositions.value.map((hex) => `${hex.x},${hex.y}`).join(" "))
const savedCanals = computed(() => displayedBoard.value.canals.map(([from, to]) => {
	const a = actualAreas.value.find((entry) => entry.area.id === from)?.position
	const b = actualAreas.value.find((entry) => entry.area.id === to)?.position
	return a && b ? `${a.x},${a.y} ${b.x},${b.y}` : null
}).filter(Boolean))
const waterReport = computed(() => {
	// River rows are kept separately so a new history entry does not invalidate the map.
	for (let index = store.historyRiverReports.length - 1; index >= 0; index--) {
		const report = store.historyRiverReports[index]
		if (!store.viewSettings.showReplay || report.historyIndex <= store.replayStep.index) return report.administration
	}
	return null
})
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
	if (playback.state.visible || store.viewSettings.showReplay || hasMapInspection.value || store.turnDraft.ready) return {}
	const targets = {}
	const add = (ids, label, kind = "destination", source = false, planned = false) => {
		for (const id of ids) if (id) targets[id] = { label, kind, source, planned }
	}
	if (previewOpen.value) {
		for (const [id, option] of Object.entries(digOptions.value)) {
			if (!option.error) add([id], "", option.isComplete ? "finish" : "destination", !draftPath.value.length || !option.isComplete)
		}
		draftPath.value.forEach((id, index) => add([id], index === 0 ? t("map.source") : "", "path", index === 0))
	} else {
		if (store.gameflow.phase === rf.PHASE_SETTLEMENT && !store.viewSettings.actionIntent) {
			const actor = store.gameflow.turnOrder[0]
			add(store.board.areas.filter((area) => !area.isRiver && area.owner === null && !boardRules.isNationLandClosed(store, area)).map((area) => area.id), "")
			add(store.board.areas.filter((area) => !area.isRiver && area.owner === actor).map((area) => area.id), "", "sale")
		}
		for (const id of props.actionTargets) add([id], "", store.board.areas.find((area) => area.id === id)?.isRiver ? "sale" : "destination")
		add(maintenanceLand.value, t("map.sell"), "sale")
		add(barahshumSites.value, t("map.canal"), "build")
		if (barahshumSites.value.length) add([store.board.areas.find((area) => area.nation === rf.NATION_BARAHSHUM)?.id], t("map.source"), "build", true)
		add(harvestRemovalSites.value, "", "sale")
		add([routingArea.value], t("map.source"), "destination", true)
		waterDestinations.value.forEach((id, index) => { targets[id] = { label: String(index + 1), kind: "destination", number: true } })
	}
	for (const id of props.landDraft?.equipment || []) add([id], "", store.board.areas.find((area) => area.id === id)?.isRiver ? "sale" : "destination", false, true)
	add(queuedSales.value, needsMaintenanceSales.value ? t("map.sale") : "", "sale", false, true)
	add([queuedPurchase.value], "", "destination", false, true)
	add([store.gameflow.pendingOffer?.action.area], t("map.review"), "build")
	return targets
})

const hasMapInspection = computed(() => store.viewSettings.inspectedState !== null || props.highlightedPlayer !== null)
const inspectionTargets = computed(() => new Set(store.board.areas.filter((area) =>
	(store.viewSettings.inspectedState !== null && area.state === store.viewSettings.inspectedState) ||
	(props.highlightedPlayer !== null && area.owner === props.highlightedPlayer)
).map((area) => area.id)))
const confirmationPosition = computed(() => {
	const position = actualAreas.value.find((entry) => entry.area.id === props.mapAction?.area)?.position
	return position ? { left: `clamp(0px, ${position.x / boardDisplay.MAP_WIDTH * 100}%, calc(100% - 220px))`, top: `min(${(position.y + 45) / boardDisplay.MAP_HEIGHT * 100}%, calc(100% - 100px))` } : null
})
function inspectArea(id) {
	if (playback.state.visible) return
	focusedHex.value = id
	selectedHexId.value = id
	emit("clickArea", id)
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
// Firefox deoptimizes vue-i18n's formatter after many calls; describe each hex
// only when the fields that feed its text change.
const descriptionCache = new Map()
// Keep this list in sync with buildAreaDescription.
function areaDescriptionKey(area) {
	const nation = area.nation === null ? null : store.nations[area.nation]
	return JSON.stringify([
		area.label, area.landType, area.isCity, area.isRiver, area.state, area.nation, nation?.isRemoved, nation?.ownerType,
		area.owner, area.markerOwner, area.waterwork, area.irrigatedBy,
		area.owner === null ? null : store.players[area.owner]?.displayName,
		area.markerOwner === null ? null : store.players[area.markerOwner]?.displayName,
		store.gameflow.phase, needsMaintenanceSales.value, store.landPrices, locale.value,
		props.landDraft?.blocked?.[area.id] ?? "",
		queuedPurchase.value === area.id, queuedSales.value.includes(area.id),
		chosenRemoval.value === area.id, harvestRemovalSites.value.includes(area.id),
		calahSites.value.includes(area.id), barahshumSites.value.includes(area.id),
		previewOpen.value, digOptions.value[area.id]?.error ?? "", digOptions.value[area.id]?.isComplete ?? false,
	])
}
function areaDescription(area) {
	const key = areaDescriptionKey(area)
	const cached = descriptionCache.get(area.id)
	if (cached?.key === key) return cached.value
	const value = buildAreaDescription(area)
	descriptionCache.set(area.id, { key, value })
	return value
}
function buildAreaDescription(area) {
	let digDescription = ""
	if (previewOpen.value) {
		const option = digOptions.value[area.id]
		digDescription = option.error ? t("map.cannotAdd", { error: option.error }) : option.isComplete ? t("map.legalEndpoint") : t("map.legalStart")
	}
	const unmarkedStatus = boardRules.isNationLandClosed(store, area) ? t("map.independentNation") : t("map.uncolonized")
	const owner = area.owner === null ? area.markerOwner === null ? unmarkedStatus : t("map.forSale", { name: store.players[area.markerOwner].displayName }) : store.players[area.owner].displayName
	const homeland = area.nation !== null ? t("map.homeland", { nation: rf.NATION_NAMES[area.nation] }) : ""
	const closure = boardRules.isNationLandClosed(store, area) ? t("map.nationLandClosed") : ""
	const price = !area.isRiver && (store.gameflow.phase === rf.PHASE_SETTLEMENT || store.gameflow.phase === rf.PHASE_GAME_OVER || needsMaintenanceSales.value) ? area.markerOwner === null ? t("map.colonizationPrice", { price: rules.landPrice(store, area, true) }) : t("map.marketPrice", { price: rules.landPrice(store, area, false) }) : ""
	const waterwork = area.waterwork ? t("map.waterwork", { state: rf.STATE_NAMES[area.waterwork.state], kind: view.kindName(area.waterwork.kind), measure: view.waterworkMeasure(area.waterwork) }) : ""
	const irrigation = area.irrigatedBy !== null ? t("map.irrigatedBy", { state: rf.STATE_NAMES[area.irrigatedBy] }) : ""
	const land = area.isRiver ? t("map.river") : `${rf.LAND_NAMES[area.landType]}${area.isCity ? " " + t("common.city") : ""}, ${rf.STATE_NAMES[area.state]}, ${owner}`
	return `${area.label || area.id}${digDescription}: ${land}${homeland}${closure}${props.landDraft?.blocked?.[area.id] ? " · " + props.landDraft.blocked[area.id] : ""}${price}${waterwork}${irrigation}${queuedPurchase.value === area.id ? t("map.queuedPurchase") : ""}${queuedSales.value.includes(area.id) ? t("map.queuedSale") : ""}${chosenRemoval.value === area.id ? t("map.selectedRemoval") : harvestRemovalSites.value.includes(area.id) ? t("map.removable") : ""}${calahSites.value.includes(area.id) ? t("map.calahSite") : ""}${barahshumSites.value.includes(area.id) ? t("map.barahshumDestination") : ""}`
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
defineExpose({ finishDig, revealSelection, revealBoard, locateArea, isTracing: previewOpen })
watch(() => [store.gameflow.phase, store.gameflow.turnOrder[0], store.gameflow.stateIndex, store.gameflow.developmentStep, store.rain.step, store.rain.harvestOrder[0], water.currentWaterFrame(store)?.area], () => { finishDig(); selectedHexId.value = null; previewOpen.value = canTrace.value })
</script>

<template>
	<div id="mapArea" ref="boardElement">
		<div v-if="previewError" class="previewError" role="alert"><CurrencyText :text="previewError" /></div>
		<div class="mapSurface">
			<svg :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" :aria-label="$t('map.aria')"><title>{{ $t("map.keyboardHint") }}</title>
				<defs>
					<clipPath v-for="entry in actualAreas" :id="`hex-clip-${entry.area.id}`" :key="entry.area.id" clipPathUnits="userSpaceOnUse"><polygon :points="areaClips[entry.area.id]" /></clipPath>
					<clipPath v-for="(points, id) in actionClips" :id="`action-clip-${id}`" :key="id" clipPathUnits="userSpaceOnUse"><polygon :points="points" /></clipPath>
				</defs>
				<image :href="assets.mapImage" x="0" y="0" :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" />
				<g v-if="!actualAreas.length" class="printedHexes"><polygon v-for="hex in boardDisplay.PRINTED_HEXES" :key="hex.id" :points="boardDisplay.hexPoints(hex.x, hex.y)" @click="inspectArea(hex.id)" /></g>
				<polyline v-for="(canal, index) in savedCanals" :key="`canal-${index}`" :points="canal" class="savedCanal" />
				<polyline v-if="draftLine" :points="draftLine" class="draftCanal" />
				<g v-for="entry in renderedAreas" :key="entry.area.id" class="boardArea" :clip-path="selectedHexId === entry.area.id ? null : `url(#hex-clip-${entry.area.id})`" :class="{ hasDecision: !!mapDecisions[entry.area.id], showLabel: showCoordinates || selectedHexId === entry.area.id || queuedPurchase === entry.area.id || queuedSales.includes(entry.area.id) || chosenRemoval === entry.area.id || draftPath.includes(entry.area.id) }">
					<polygon v-if="inspectionTargets.has(entry.area.id)" :points="areaClips[entry.area.id]" class="inspectionHalo" />
					<polygon v-if="(store.viewSettings.inspectedState !== null && entry.area.state === store.viewSettings.inspectedState)" :points="areaClips[entry.area.id]" class="inspectionHighlight" />
					<polygon v-if="highlightedPlayer !== null && entry.area.owner === highlightedPlayer" :points="areaClips[entry.area.id]" class="inspectionHighlight ownedLandHighlight" />
					<polygon :points="areaClips[entry.area.id]" class="areaHit" :class="[{ purchaseLocked: !store.viewSettings.showReplay && !!props.landDraft?.blocked?.[entry.area.id] }, hasMapInspection || store.turnDraft.ready || store.viewSettings.showReplay ? {} : { actionSite: actionTargets.includes(entry.area.id) && store.viewSettings.actionIntent !== 'equip', digComplete: digOptions[entry.area.id] && !digOptions[entry.area.id].error && digOptions[entry.area.id].isComplete, digContinue: digOptions[entry.area.id] && !digOptions[entry.area.id].error && !digOptions[entry.area.id].isComplete, selected: selectedHexId === entry.area.id, drafting: draftPath.includes(entry.area.id), reachable: reachable.includes(entry.area.id), waterDestination: waterDestinations.includes(entry.area.id), routing: routingArea === entry.area.id, maintenanceSale: maintenanceLand.includes(entry.area.id), barahshumSite: barahshumSites.includes(entry.area.id), calahSite: calahSites.includes(entry.area.id), harvestRemovalSite: harvestRemovalSites.includes(entry.area.id), removalTarget: chosenRemoval === entry.area.id, tradePurchase: queuedPurchase === entry.area.id, tradeSale: queuedSales.includes(entry.area.id), offerTarget: store.gameflow.pendingOffer?.action.area === entry.area.id }]" role="button" :tabindex="tabArea === entry.area.id ? 0 : -1" :data-area-id="entry.area.id" :aria-label="areaDescription(entry.area)" @focus="focusedHex = entry.area.id" @keydown="moveFocus($event, entry)" @click="inspectArea(entry.area.id)" @keydown.enter.prevent="inspectArea(entry.area.id)" @keydown.space.prevent="inspectArea(entry.area.id)"><title>{{ areaDescription(entry.area) }}</title></polygon>
					<polygon v-if="mapDecisions[entry.area.id] && queuedPurchase === entry.area.id && queuedSales.includes(entry.area.id)" :points="areaClips[entry.area.id]" class="purchaseSaleOutline" />
					<polygon v-if="entry.area.irrigatedBy !== null" :points="areaClips[entry.area.id]" class="wetHex" />
					<polygon v-if="entry.area.id === store.viewSettings.historyArea" :points="areaClips[entry.area.id]" class="historyOutline" />
					<image v-if="entry.area.owner !== null" :href="assets.getPlayerMarkerImage(entry.area.markerOwner)" :x="entry.position.x - 22" :y="entry.position.y - 22" width="44" height="44" class="ownerMarker" />
					<rect v-if="entry.area.markerOwner !== null" :x="entry.position.x - 22" :y="entry.position.y - 22" width="44" height="44" class="tokenFrame" :class="{ saleMarkerFrame: entry.area.owner === null }" />
					<text :x="entry.position.x" :y="entry.position.y + 41" class="areaLabel">{{ entry.area.label || entry.area.id }}</text>
					<image v-if="entry.area.waterwork" :href="assets.getWaterworkImage(entry.area.waterwork.state, entry.area.waterwork.capacity)" :x="entry.position.x + 10" :y="entry.position.y - 40" width="32" height="32" class="waterworkMarker"><title>{{ rf.STATE_NAMES[entry.area.waterwork.state] }} {{ view.kindName(entry.area.waterwork.kind) }} · {{ view.waterworkMeasure(entry.area.waterwork) }}</title></image>
					<rect v-if="entry.area.waterwork" :x="entry.position.x + 10" :y="entry.position.y - 40" width="32" height="32" class="tokenFrame" />
					<circle v-if="entry.area.irrigatedBy !== null" :cx="entry.position.x + 24" :cy="entry.position.y + 20" r="10" class="irrigationMarker"><title>{{ $t("map.irrigatedBy", { state: rf.STATE_NAMES[entry.area.irrigatedBy] }) }}</title></circle>
					<g v-if="mapDecisions[entry.area.id]" class="mapDecisionHighlight" :class="mapDecisions[entry.area.id].kind">
						<template v-if="mapDecisions[entry.area.id].number"><circle :cx="entry.position.x - 28" :cy="entry.position.y - 27" r="16" class="decisionBadge" /><text :x="entry.position.x - 28" :y="entry.position.y - 27" class="destinationNumber">{{ mapDecisions[entry.area.id].label }}</text></template>
						<template v-else-if="mapDecisions[entry.area.id].label"><rect :x="entry.position.x - 36" :y="entry.position.y + 23" width="72" height="23" rx="4" class="decisionBadge" /><text :x="entry.position.x" :y="entry.position.y + 35" class="decisionLabel">{{ mapDecisions[entry.area.id].label }}</text></template>
					</g>
					<polygon v-if="Object.keys(mapDecisions).length && !mapDecisions[entry.area.id]" :points="areaClips[entry.area.id]" class="actionShade" />
					<polygon v-if="playback.isIrrigationPreview && !playback.current.wet.includes(entry.area.id)" :points="areaClips[entry.area.id]" class="inspectionShade" />
					<polygon v-if="hasMapInspection && !inspectionTargets.has(entry.area.id)" :points="areaClips[entry.area.id]" class="inspectionShade" />
				</g>
				<template v-for="entry in renderedAreas" :key="`outline-${entry.area.id}`">
					<g v-if="mapDecisions[entry.area.id]" class="mapDecisionHighlight" :class="mapDecisions[entry.area.id].kind" :clip-path="selectedHexId === entry.area.id ? null : `url(#action-clip-${entry.area.id})`">
						<polygon :points="areaClips[entry.area.id]" class="mapDecisionOutline" :class="{ source: mapDecisions[entry.area.id].source, chosen: (selectedHexId === entry.area.id && store.gameflow.phase !== rf.PHASE_SETTLEMENT) || chosenRemoval === entry.area.id, planned: mapDecisions[entry.area.id].planned }" />
					</g>
				</template>
				<!-- Clipping halves the stroke: draw 14px for a 7px state border that covers the printed one. -->
				<g v-for="border in stateBorders" :key="border.areaId" :stroke="boardDisplay.MAP_STATE_COLOURS[border.state]" fill="none" stroke-linecap="butt" pointer-events="none">
					<path :d="border.path" :clip-path="`url(#hex-clip-${border.areaId})`" stroke-width="14" />
				</g>
				<path v-for="(border, index) in outerStateBorders" :key="`outer-${index}`" :d="border.path" :stroke="boardDisplay.MAP_STATE_COLOURS[border.state]" fill="none" stroke-width="7" stroke-linecap="butt" stroke-linejoin="miter" pointer-events="none" />
				<template v-for="entry in renderedAreas" :key="`selection-${entry.area.id}`">
					<g v-if="mapDecisions[entry.area.id] && (mapDecisions[entry.area.id].planned || selectedHexId === entry.area.id)" class="mapDecisionHighlight" :class="mapDecisions[entry.area.id].kind">
						<polygon :points="areaClips[entry.area.id]" class="mapDecisionOutline selectionOutline" :class="{ source: mapDecisions[entry.area.id].source, chosen: (selectedHexId === entry.area.id && store.gameflow.phase !== rf.PHASE_SETTLEMENT) || chosenRemoval === entry.area.id, planned: mapDecisions[entry.area.id].planned }" />
					</g>
				</template>
				<polygon v-if="selectedHexId && !mapDecisions[selectedHexId] && !hasMapInspection && !store.turnDraft.ready && !store.viewSettings.showReplay" :points="areaClips[selectedHexId]" class="areaHit selected selectionOutline" />
			</svg>
			<WaterPlayback v-if="playback.state.visible" />
			<div v-if="!playback.state.visible && mapAction && confirmationPosition && !hasMapInspection && !store.turnDraft.ready" class="mapConfirmation" :style="confirmationPosition">
				<b><CurrencyText :text="mapAction.label" /></b><small><CurrencyText :text="mapAction.detail" /></small>
				<div><button :disabled="!mapAction.canConfirm" @click="emit('confirmAction')">{{ $t("map.confirm") }}</button><button @click="emit('cancelAction')">{{ $t("map.cancel") }}</button></div>
			</div>
		</div>
		<div v-if="waterReport" class="riverStatus" role="status"><span><b>{{ waterReport.kind === 'riverComplete' && store.gameflow.phase !== rf.PHASE_RAINY_SEASON ? $t("map.lastRainySeason") : $t("map.riverFlow", { turn: waterReport.turn }) }}</b> · {{ $t("map.water", { amount: waterReport.waterTotal }) }}<template v-if="waterReport.kind === 'riverComplete'"> · {{ $t("map.wetHexes", { count: waterReport.irrigatedCount }) }} · {{ $t("map.waterLost", { amount: waterReport.outflow }) }}<template v-if="!waterReport.irrigatedCount"> · {{ $t("map.noIrrigation") }}</template></template><template v-else> · {{ $t("map.routingInProgress") }}</template></span></div>
		<div class="mapFooter" v-if="previewOpen">
			<div class="controls" v-if="previewOpen"><button @click="undoDraft" :disabled="!draftPath.length">{{ $t("common.undo") }}</button><button @click="clearDraft" :disabled="!draftPath.length">{{ $t("common.clear") }}</button></div>
		</div>
		<div v-if="hasMapInspection" class="mapInspectionCue">{{ $t("map.inspecting") }} <span v-if="store.viewSettings.inspectedState !== null">{{ $t("map.territory", { name: rf.STATE_NAMES[store.viewSettings.inspectedState] }) }}</span><span v-if="store.viewSettings.inspectedState !== null && highlightedPlayer !== null"> · </span><span v-if="highlightedPlayer !== null"><PlayerMarker :index="highlightedPlayer" /> {{ $t("map.ownedLand") }}</span>{{ $t("map.inspectionCue") }}<button @click="store.viewSettings.inspectedState = null; store.viewSettings.showOwnedLand = false">{{ $t("map.clearInspection") }}</button></div>
		<div class="legendFooter">
		<div class="boardLegend">
			<div class="legendRow"><svg class="legendToken" viewBox="0 0 48 48" role="img" :aria-label="$t('map.soldLand')"><rect x="2" y="2" width="44" height="44" class="tokenFrame saleMarkerFrame" /></svg><span>{{ $t("map.soldLand") }}</span></div>
			<div class="legendRow"><span class="legendExamples"><img v-for="capacity in reservoirCapacities" :key="capacity" :src="assets.getWaterworkImage(rf.STATE_AKKAD, capacity)" :alt="capacity === 'M' ? $t('map.unlimitedCapacity') : $t('map.capacityWater', { capacity })" /></span><span>{{ $t("map.reservoirsLegend") }}</span></div>
			<div class="legendRow"><span class="legendExamples"><img v-for="capacity in pumpCapacities" :key="capacity" :src="assets.getWaterworkImage(rf.STATE_AKKAD, capacity)" :alt="capacity === 'M' ? $t('map.unlimitedReach') : $t('map.canalsCount', { capacity })" /></span><span>{{ $t("map.pumpsLegend") }}</span></div>
		</div>
			<div class="mapZoom"><button :aria-pressed="showCoordinates" @click="showCoordinates = !showCoordinates" :title="$t('map.showCoordinates')">{{ $t("map.hexLabels") }}</button></div>
		</div>
		<div class="inspection" v-if="store.debug.tool && debug.canDebug()">{{ $t("map.debug", { tool: store.debug.tool }) }} <button @click="store.debug.tool = ''; store.debug.path = []">{{ $t("map.stopPlacement") }}</button></div>

	</div>
</template>

<style scoped>
.areaHit.purchaseLocked { fill: #444; fill-opacity: .35; }
.mapSurface { position: relative; }.mapConfirmation { position: absolute; width: 220px; max-width: 100%; box-sizing: border-box; padding: 8px; background: #fff9e9; border: 2px solid #177daf; border-radius: 5px; box-shadow: 0 2px 8px #0005; text-align: left; font-size: 16px; font-weight: 400; line-height: 1.4; z-index: 2; }.mapConfirmation b { display: block; }.mapConfirmation small { display: block; margin: 4px 0; }.mapConfirmation button { min-height: 36px; margin-right: 5px; font: inherit; }.mapConfirmation button:first-child { background: #d9ead1; }.areaHit.actionSite { fill: #7bdca3; fill-opacity: .35; stroke: #176a3b; stroke-width: 6; }.actionShade { fill: #fff9e9; fill-opacity: .55; pointer-events: none; }

.areaHit.digComplete { fill: #7bdca3; fill-opacity: .3; stroke: #176a3b; }
.areaHit.digContinue { fill: #c1e8ed; fill-opacity: .25; stroke: #257b89; stroke-dasharray: 10 6; }
.previewError { width: 100%; box-sizing: border-box; padding: 8px; background: #fff9df; text-align: left; font-size: 16px; font-weight: 400; line-height: 1.5; }

.legendRow { display: contents; }.legendToken { justify-self: end; }.legendExamples { display: inline-flex; gap: 4px; }.legendToken, .legendExamples img { width: 24px; height: 24px; flex-shrink: 0; }
.boardLegend { display: grid; grid-template-columns: max-content minmax(0, 1fr); align-items: center; gap: 4px 8px; font-size: 16px; font-weight: 400; line-height: 1.4; padding: 6px 8px; text-align: left; }
#mapArea { width: 100%; display: flex; flex-direction: column; align-items: center; min-width: 0; }.mapFooter { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; }.legendFooter { display: flex; align-items: flex-start; gap: 8px; width: 100%; padding-top: 6px; }.legendFooter .boardLegend { flex: 1; min-width: 0; }.legendFooter .mapZoom { flex-shrink: 0; }.mapFooter .controls { width: auto; padding: 0; }.mapSurface { position: relative; width: 100%; line-height: 0; box-shadow: 0 2px 5px #6b614a; }.mapSurface svg { width: 100%; height: auto; display: block; }
.printedHexes polygon, .areaHit { fill: #fff; fill-opacity: .001; stroke: transparent; stroke-width: 5; cursor: pointer; }.areaHit.maintenanceSale { fill: #ffd894; fill-opacity: .2; stroke: #b76400; }.areaHit.harvestRemovalSite { fill: #ffd894; fill-opacity: .22; stroke: #b76400; }.areaHit.barahshumSite, .areaHit.calahSite { fill: #d9b7ed; fill-opacity: .28; stroke: #8758a8; }.areaHit.reachable { fill: #bf9dff; fill-opacity: .24; }.areaHit.waterDestination { fill: #74e9ff; fill-opacity: .3; stroke: #008cb3; }.areaHit.routing { stroke: #006dca; stroke-width: 8; }.areaHit:hover, .areaHit:focus, .areaHit.selected { fill: #fff57a; fill-opacity: .32; stroke: #7e6400; }.areaHit.drafting { stroke: #1165bb; fill-opacity: .17; }
.savedCanal { fill: none; stroke: #2269ad; stroke-width: 10; stroke-linecap: round; pointer-events: none; }.draftCanal { fill: none; stroke: #1f75ce; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; opacity: .82; pointer-events: none; }.irrigationMarker { fill: #35d6ff; stroke: #fff; stroke-width: 3; pointer-events: none; }.ownerMarker, .waterworkMarker, .areaLabel { pointer-events: none; }.areaLabel { opacity: 0; text-anchor: middle; fill: #333; font-weight: bold; font-size: 16px; font-weight: 400; paint-order: stroke; stroke: #fff; stroke-width: 3; }
.tokenFrame { fill: none; stroke: #000; stroke-width: 2; pointer-events: none; }.saleMarkerFrame { fill: #fff; }.irrigationMarker { stroke: #000; stroke-width: 2; }
.riverStatus { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 8px; box-sizing: border-box; background: #def5ff; font-size: 16px; font-weight: 400; line-height: 1.4; }.riverStatus button { flex-shrink: 0; padding: 6px; font: inherit; border: 1px solid #177daf; border-radius: 3px; background: #fffdf4; cursor: pointer; }.wetHex { fill: #35d6ff; fill-opacity: .22; stroke: #008cb3; stroke-width: 3; pointer-events: none; }.historyOutline { fill: none; stroke: #177daf; stroke-width: 8; pointer-events: none; }
.boardArea:hover .areaLabel, .boardArea:focus-within .areaLabel, .boardArea.showLabel .areaLabel { opacity: 1; }
.inspection { overflow-wrap: anywhere; width: 100%; box-sizing: border-box; min-height: 20px; padding: 6px 8px; background: #fff9df; border: 1px solid #bcae85; font-size: 16px; font-weight: 400; text-align: left; }.controls { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 8px; font-size: 16px; font-weight: 400; }.controls button { cursor: pointer; }.previewError { color: #a40000; font-weight: bold; font-size: 16px; font-weight: 400; }
.mapZoom { display: inline-flex; gap: 2px; }.mapZoom button { min-width: 28px; min-height: 25px; font: inherit; font-size: 16px; font-weight: 400; background: #fff9df; border: 1px solid #bcae85; border-radius: 3px; cursor: pointer; }.mapZoom button:disabled { opacity: .4; cursor: default; }
.areaHit.tradePurchase { stroke: #177daf; stroke-width: 8; stroke-dasharray: 12 6; }.areaHit.tradeSale { stroke: #aa3d2e; stroke-width: 8; stroke-dasharray: 12 6; }
.areaHit.tradePurchase.tradeSale { stroke: #177daf; stroke-dasharray: 12 12; }.purchaseSaleOutline { fill: none; stroke: #aa3d2e; stroke-width: 8; stroke-dasharray: 12 12; stroke-dashoffset: 12; pointer-events: none; }
.areaHit.removalTarget { stroke: #b76400; stroke-width: 8; }
.areaHit.offerTarget { stroke: #ad4da7; stroke-width: 8; fill: #f1b4ed; fill-opacity: .25; }
.mapZoom button[aria-pressed=true] { background: #e1edf5; border-color: #177daf; color: #145575; }
.areaLabel { font-size: 22px; }
.mapZoom button { min-width: 40px; min-height: 40px; }
.inspection { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.controls button { min-height: 30px; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #302f27; font: inherit; padding: 4px 8px; }.controls button:disabled { opacity: .5; cursor: default; }@media (max-width: 1050px) { .controls button { min-height: 40px; } }
.boardArea.hasDecision > .areaHit { stroke: transparent; }
.mapDecisionHighlight { pointer-events: none; --decision-color: #007cac; }.mapDecisionHighlight.finish { --decision-color: #176a3b; }.mapDecisionHighlight.build { --decision-color: #75439c; }.mapDecisionHighlight.sale { --decision-color: #a34720; }.mapDecisionHighlight.path { --decision-color: #234872; }.mapDecisionOutline { fill: none; stroke: var(--decision-color); stroke-width: 7; }.mapDecisionOutline.source { stroke-dasharray: 12 6; }
.mapDecisionOutline.planned { stroke-width: 12; fill: var(--decision-color); fill-opacity: .22; }.mapDecisionOutline.chosen { stroke: #a57000; }.decisionBadge { fill: var(--decision-color); stroke: white; stroke-width: 3; }.destinationNumber, .decisionLabel { fill: white; font-size: 20px; font-weight: bold; text-anchor: middle; dominant-baseline: central; }.decisionLabel { font-size: 16px; }
.areaHit.selectionOutline, .mapDecisionOutline.selectionOutline { fill: none; pointer-events: none; }

.inspectionHalo { fill: none; stroke: #fffdf5; stroke-width: 9; pointer-events: none; }.inspectionShade { fill: #e9e2d2; fill-opacity: .78; pointer-events: none; }.inspectionHighlight { fill: white; fill-opacity: .12; stroke: #514632; stroke-width: 3; stroke-dasharray: 3 5; pointer-events: none; }.inspectionHighlight.ownedLandHighlight { stroke-width: 4; stroke-dasharray: 10 5; }.mapInspectionCue { width: 100%; box-sizing: border-box; padding: 6px 8px; font-size: 16px; font-weight: 400; text-align: left; background: #fff9df; }.mapInspectionCue button { font: inherit; margin-left: 8px; padding: 4px 6px; background: #fffdf5; border: 1px solid #b3a481; border-radius: 3px; cursor: pointer; }
</style>
