<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import * as rf from "../js/DDLreference.js"
import * as map from "../js/DDLmap.js"
import * as rules from "../js/DDLrules.js"
import * as controller from "../js/DDLcontroller.js"
import * as view from "../js/DDLview.js"
import * as funcs from "../js/DDLfuncs.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

const boardStyle = computed(() => ({ backgroundImage: `url(${view.boardImage()})` }))

// The board art and every overlay are laid out for a 1060px wide board; the
// whole thing is scaled to the column width (zoom 100) and then by the user.
const BOARD_CSS_WIDTH = 1060
const BOARD_CSS_HEIGHT = 706
const MIN_ZOOM = 40
const MAX_ZOOM = 220
const wrapEl = ref(null)
const colWidth = ref(BOARD_CSS_WIDTH)
const wrapMaxHeight = ref(600)
// Zoom lives in the store so the top-menu buttons can drive it.
const zoomPct = computed(() => store.viewSettings.zoomPct)
let fitting = false

const fitScale = computed(() => colWidth.value / BOARD_CSS_WIDTH)
const scale = computed(() => Math.min(3, (fitScale.value * zoomPct.value) / 100))
const boardWidth = computed(() => BOARD_CSS_WIDTH * scale.value)
const boardHeight = computed(() => BOARD_CSS_HEIGHT * scale.value)

function measure() {
	if (!wrapEl.value) return
	const width = wrapEl.value.getBoundingClientRect().width
	if (width > 0) colWidth.value = width
	// Keep the map viewport inside the window so zooming never grows the page.
	const top = wrapEl.value.getBoundingClientRect().top + window.scrollY
	wrapMaxHeight.value = Math.max(240, window.innerHeight - top - 12)
}

function centerScroll() {
	const el = wrapEl.value
	if (!el) return
	el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
	el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
}

function fitToScreen() {
	measure()
	fitting = true
	const target = Math.min(fitScale.value, wrapMaxHeight.value / BOARD_CSS_HEIGHT)
	const pct = Math.floor((target / fitScale.value) * 100)
	store.viewSettings.zoomPct = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pct))
	window.scrollTo({ top: 0, behavior: "auto" })
	nextTick(() => {
		if (wrapEl.value) {
			wrapEl.value.scrollLeft = 0
			wrapEl.value.scrollTop = 0
		}
		fitting = false
	})
}

watch(() => store.viewSettings.zoomFitToken, fitToScreen)
watch(zoomPct, () => {
	if (fitting) return
	nextTick(centerScroll)
})

function onResize() {
	measure()
}

onMounted(() => {
	measure()
	fitToScreen()
	window.addEventListener("resize", onResize)
})
onUnmounted(() => {
	window.removeEventListener("resize", onResize)
})

function pct(pos) {
	return { left: (pos[0] / rf.BOARD_WIDTH) * 100 + "%", top: (pos[1] / rf.BOARD_HEIGHT) * 100 + "%" }
}

const planetItems = computed(() =>
	rf.PLANETS.map((planet) => {
		const state = rules.planetState(store, planet.id)
		const ships = store.players.map((p, i) => ({ p, i })).filter((entry) => entry.p.ship.node === "P" + planet.id)
		return {
			planet,
			state,
			ships,
			style: pct([planet.x, planet.y]),
			mine: state ? state.mine : null,
			site: state ? state.site : null,
			factory: state ? state.factory : null,
			pathways: state ? state.pathways : [],
		}
	})
)

const consumerCards = computed(() => {
	const cards = []
	for (let col = 0; col < store.board.consumerSlots.length; col++) {
		const slots = store.board.consumerSlots[col]
		let topFound = false
		for (let row = 0; row < slots.length; row++) {
			const tileId = slots[row]
			const pos = rf.CONSUMER_SLOT_POSITIONS[col][row]
			cards.push({
				col,
				row,
				tileId,
				style: pct(pos),
				top: !topFound && tileId !== null,
				value: rf.CONSUMER_COLUMNS[col][row],
			})
			if (tileId !== null) topFound = true
		}
	}
	return cards
})

const activePlayerIndex = computed(() => (personal.trainingGame ? store.gameflow.turnOrder[0] : personal.pov))

const canAct = computed(() => personal.canPlay() && activePlayerIndex.value === store.gameflow.turnOrder[0])
const choosingStart = computed(() => canAct.value && store.gameflow.phase === rf.PHASE_SETUP && store.gameflow.setup.stage === rf.TURN_SETUP_PLANET)
const choosingPathways = computed(() => canAct.value && store.gameflow.phase === rf.PHASE_MAIN && store.gameflow.turnType === rf.TURN_ACTION && store.context.action === rf.ACT_PATHWAY && !store.gameflow.pendingExplore && !store.players[activePlayerIndex.value].pathways.placed)
const choosingExplore = computed(() => canAct.value && store.gameflow.pendingExplore?.player === activePlayerIndex.value)

const highlighted = computed(() => {
	if (!canAct.value || store.gameflow.phase !== rf.PHASE_MAIN || store.gameflow.turnType !== rf.TURN_ACTION || choosingExplore.value) return new Set()
	if (store.context.action === rf.ACT_MOVE && store.gameflow.movement.remaining > 0) {
		const node = store.players[activePlayerIndex.value].ship.node
		return new Set(map.reachableNodes(store, activePlayerIndex.value, node, store.gameflow.movement.remaining).filter((id) => id !== node))
	}
	if (store.context.action === rf.ACT_PLACE_HIGHWAYS) {
		return new Set(map.ROAD_NODES.filter((id) => store.board.highways[id] === undefined && map.shipsOnNode(store, id).length === 0))
	}
	return new Set()
})

const roadTargets = computed(() => Array.from(highlighted.value).filter((id) => map.isRoadNode(id)))

const highlightedPlanets = computed(() => {
	if (choosingStart.value) return new Set(rf.PLANETS.filter((p) => p.start && !store.players.some((player) => player.ship.node === "P" + p.id)).map((p) => p.id))
	if (choosingPathways.value) return new Set(planetItems.value.filter((item) => item.pathways.length === 0 && item.planet.id !== store.context.selectedPathwayIn).map((item) => item.planet.id))
	return new Set(Array.from(highlighted.value).filter((id) => rf.planetByNode(id)).map((id) => rf.planetByNode(id).id))
})

function selectPathway(planetId) {
	if (!highlightedPlanets.value.has(planetId)) return
	if (store.context.selectedPathwayIn < 0) store.context.selectedPathwayIn = planetId
	else store.context.selectedPathwayOut = planetId
}

const highwayItems = computed(() =>
	Object.entries(store.board.highways).map(([node, owner]) => ({
		node,
		owner,
		style: pct(map.nodePosition(node)),
		colour: personal.getCorrectedColourHex(store.players[owner].colour),
	}))
)

const shipItems = computed(() => {
	const items = []
	for (let i = 0; i < store.players.length; i++) {
		const player = store.players[i]
		if (!player.ship.node) continue
		const pos = map.nodePosition(player.ship.node)
		const onPlanet = map.shipsOnNode(store, player.ship.node)
		const offsetIndex = onPlanet.indexOf(i)
		const angle = (Math.PI * 2 * Math.max(0, offsetIndex)) / Math.max(1, onPlanet.length)
		items.push({
			i,
			player,
			style: pct([pos[0] + Math.cos(angle) * 16, pos[1] + Math.sin(angle) * 16]),
			colour: personal.getCorrectedColourHex(player.colour),
			current: store.gameflow.turnOrder[0] === i,
		})
	}
	return items
})

const turnCubeItems = computed(() =>
	store.board.turnCubes.map((cube) => {
		const turn = cube.turn
		const row = Math.floor((turn - 1) / 8)
		const col = (turn - 1) % 8
		return {
			...cube,
			style: pct([96 + col * 42, 1018 + row * 34]),
			colour: personal.getCorrectedColourHex(store.players[cube.player] ? store.players[cube.player].colour : 0),
		}
	})
)

const pathwayItems = computed(() => {
	const items = []
	for (const planet of rf.PLANETS) {
		const state = rules.planetState(store, planet.id)
		if (!state) continue
		for (const pathway of state.pathways) {
			items.push({
				planetId: planet.id,
				owner: pathway.owner,
				dir: pathway.dir,
				style: pct([planet.x + (pathway.dir === "in" ? -38 : 38), planet.y - 28]),
				colour: personal.getCorrectedColourHex(store.players[pathway.owner].colour),
			})
		}
	}
	return items
})

function onPlanetClick(planet) {
	if (choosingStart.value && highlightedPlanets.value.has(planet.id)) {
		controller.submitStartingPlanet(planet.id)
		return
	}
	if (choosingPathways.value) {
		selectPathway(planet.id)
		return
	}
	if (store.context.action === rf.ACT_MOVE && highlightedPlanets.value.has(planet.id)) {
		controller.moveTo("P" + planet.id)
		return
	}
	if (store.context.action === rf.ACT_PLACE_HIGHWAYS) return
	store.context.selectedPlanet = store.context.selectedPlanet === planet.id ? -1 : planet.id
}

function canTradeHere(planetId) {
	return canAct.value && store.gameflow.phase === rf.PHASE_MAIN && store.gameflow.turnType === rf.TURN_ACTION && !choosingExplore.value && store.players[activePlayerIndex.value].ship.node === "P" + planetId
}

function openSite(item) {
	store.context.selectedPlanet = item.planet.id
	store.context.action = item.site.built ? rf.ACT_TRADE : rf.ACT_BUILD
}

function onNodeClick(node) {
	if (!highlighted.value.has(node)) return
	if (store.context.action === rf.ACT_MOVE) controller.moveTo(node)
	else if (store.context.action === rf.ACT_PLACE_HIGHWAYS) controller.placeHighway(node, !store.context.highwayCostsEnergy)
}

function siteLabel(site) {
	if (!site) return ""
	if (site.kind === "consumer") {
		const tile = rf.CONSUMER_TILES.find((t) => t.id === site.tileId)
		if (!tile) return t("action.consumer")
		return site.built
			? t("map.siteValue", { good: rf.goodName(tile.good), points: tile.points })
			: t("map.siteBuildValue", { good: rf.goodName(tile.good), points: tile.buildPoints })
	}
	const type = rf.SPACEYARD_TYPES[site.tileId]
	return type ? t("map.gearYard", { gear: rf.gearName(type.gear) }) : t("action.spaceyard")
}

function siteGood(site) {
	if (!site) return null
	if (site.kind === "consumer") {
		const tile = rf.CONSUMER_TILES.find((t) => t.id === site.tileId)
		return tile ? tile.good : null
	}
	return null
}

function factoryGood(factory) {
	if (!factory) return null
	const type = rf.FACTORIES_BY_ID[factory.typeId]
	return type ? type.output : null
}

function privilegeColour(owner) {
	return owner >= 0 ? personal.getCorrectedColourHex(store.players[owner].colour) : "transparent"
}
</script>

<template>
	<div class="boardWrap" ref="wrapEl" :style="{ maxHeight: wrapMaxHeight + 'px' }">
		<div class="boardScaler" :style="{ width: boardWidth + 'px', height: boardHeight + 'px' }">
		<div class="board" :style="[boardStyle, { transform: `scale(${scale})` }]">
			<div v-for="item in planetItems" :key="item.planet.id" class="planet" :class="{ startPlanet: item.planet.start, highlighted: highlightedPlanets.has(item.planet.id), selected: store.context.selectedPlanet === item.planet.id || (choosingPathways && [store.context.selectedPathwayIn, store.context.selectedPathwayOut].includes(item.planet.id)) }" :style="item.style">
				<button type="button" class="planetDisc" :data-planet="item.planet.id" :class="{ start: item.planet.start }" :title="item.planet.name" :aria-label="item.planet.name" @click="onPlanetClick(item.planet)"></button>
				<div class="planetStatus">
					<button v-if="item.mine !== null" type="button" class="mapTile mineTile" :disabled="!canTradeHere(item.planet.id)" :title="$t('action.takeGood', { good: rf.goodName(item.mine) })" :aria-label="$t('action.takeGood', { good: rf.goodName(item.mine) })" @click="controller.tradeMine">
						<img class="mineIcon" :src="funcs.goodImage(item.mine)" alt="" />
					</button>
					<button v-if="item.site" type="button" class="mapTile siteChip" :disabled="!canTradeHere(item.planet.id)" :aria-label="siteLabel(item.site)" @click="openSite(item)" :class="{ built: item.site.built, unbuilt: !item.site.built }" :title="siteLabel(item.site)">
						<img v-if="siteGood(item.site) !== null" :src="funcs.goodImage(siteGood(item.site))" />
						<span v-else aria-hidden="true">⚙</span>
					</button>
					<button v-if="item.factory" type="button" class="mapTile factoryChip" :disabled="!canTradeHere(item.planet.id)" :title="$t('action.produceGood', { good: rf.goodName(factoryGood(item.factory)) })" :aria-label="$t('action.produceGood', { good: rf.goodName(factoryGood(item.factory)) })" @click="controller.tradeFactory">
						<img :src="funcs.goodImage(factoryGood(item.factory))" alt="" />
					</button>
				</div>
				<div class="privilegeRow">
					<span v-if="item.state && item.state.privileges.mine >= 0" class="privDot" :style="{ backgroundColor: privilegeColour(item.state.privileges.mine) }" :title="$t('map.minePrivilege')"></span>
					<span v-if="item.state && item.state.privileges.site >= 0" class="privDot" :style="{ backgroundColor: privilegeColour(item.state.privileges.site) }" :title="$t('map.sitePrivilege')"></span>
					<span v-if="item.state && item.state.privileges.factory >= 0" class="privDot" :style="{ backgroundColor: privilegeColour(item.state.privileges.factory) }" :title="$t('map.factoryPrivilege')"></span>
				</div>
			</div>

			<div v-for="ship in shipItems" :key="ship.i" class="ship" :class="{ currentShip: ship.current }" :style="ship.style" :title="ship.player.displayName">
				<span class="shipBody" :style="{ backgroundColor: ship.colour }"></span>
			</div>

			<div v-for="hw in highwayItems" :key="hw.node" class="highwayCube" :style="{ ...hw.style, backgroundColor: hw.colour }" :title="$t('map.highway')"></div>

			<div v-for="cube in turnCubeItems" :key="cube.turn" class="turnCube" :style="{ ...cube.style, backgroundColor: cube.colour }" :title="$t('map.turnCube', { turn: cube.turn })"></div>

			<button v-for="item in pathwayItems" :key="item.planetId + item.dir + item.owner" type="button" class="pathwayMarker" :disabled="item.dir !== 'in' || !canTradeHere(item.planetId)" :title="item.dir === 'in' ? $t('action.usePathway') : $t('action.exitPlanet')" :aria-label="item.dir === 'in' ? $t('action.usePathway') : $t('action.exitPlanet')" :class="item.dir" :style="{ ...item.style, borderColor: item.colour, color: item.colour }" @click="controller.usePathway">{{ item.dir === "in" ? "↘" : "↗" }}</button>

			<svg class="overlaySvg" viewBox="0 0 1800 1200" preserveAspectRatio="none">
				<polygon v-for="node in roadTargets" :key="node" class="dotTarget" :data-node="node" :points="map.roadPolygon(node)" role="button" tabindex="0" :aria-label="map.nodeLabel(node)" @keydown.enter.prevent="onNodeClick(node)" @keydown.space.prevent="onNodeClick(node)" @click="onNodeClick(node)"><title>{{ map.nodeLabel(node) }}</title></polygon>
			</svg>

			<div v-for="card in consumerCards" :key="card.col + '-' + card.row" class="consumerCard" :class="{ empty: card.tileId === null, top: card.top, selectable: choosingExplore && card.top }" :style="card.style">
				<button v-if="choosingExplore && card.top" type="button" class="cardTarget" :data-column="card.col" :aria-label="$t('map.cardTitle', { good: rf.goodName(card.tileId), value: card.value })" @click="controller.explore(card.col)"></button>
				<img v-if="card.tileId !== null" :src="funcs.goodImage(card.tileId)" :title="$t('map.cardTitle', { good: rf.goodName(card.tileId), value: card.value })" />
				<span v-else class="emptySlot">{{ $t("map.emptySlotValue", { points: card.value }) }}</span>
				<span class="vpBadge">{{ card.value }}</span>
			</div>
		</div>
		</div>
	</div>
</template>

<style scoped>
.boardWrap {
	width: 100%;
	overflow: auto;
}
.boardScaler {
	position: relative;
	margin: 0 auto;
}
.board {
	position: absolute;
	top: 0;
	left: 0;
	width: 1060px;
	height: 706px;
	transform-origin: top left;
	background-size: 100% 100%;
	background-repeat: no-repeat;
	box-shadow: inset 0 0 0 3px #10233f, 0 2px 8px rgba(0, 0, 0, 0.35);
	overflow: hidden;
}
.overlaySvg {
	z-index: 20;
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}
.planet {
	position: absolute;
	transform: translate(-50%, -50%);
	width: 150px;
	height: 150px;
	z-index: 4;
	pointer-events: none;
}
.planetDisc {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: radial-gradient(circle at 35% 30%, #e3d3a8, #b09a70 70%, #7e6a48);
	border: 3px solid #6f5b3e;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
	cursor: pointer;
	pointer-events: auto;
}
.planetDisc.start {
	background: radial-gradient(circle at 35% 30%, #8fe2ff, #31a8e8 60%, #156fa5);
	border-color: #0e5c8d;
}
.planet.highlighted .planetDisc {
	outline: 4px solid #ffe600;
	outline-offset: 3px;
	box-shadow: 0 0 18px #ffe600;
}
.planet.selected .planetDisc { outline: 3px solid #00ff88; outline-offset: 2px; }
.planetStatus {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, 28px);
	display: flex;
	gap: 3px;
	align-items: center;
	justify-content: center;
	white-space: nowrap;
	pointer-events: none;
}
.mineIcon { width: 22px; height: 22px; background: #3b3b3b; border: 1px solid #ddd; border-radius: 3px; }
.siteChip {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-size: 9px;
	font-weight: bold;
	color: #222;
	background: #e8d267;
	border: 1px solid #6d5a19;
	border-radius: 3px;
	padding: 1px 3px;
	max-width: 68px;
	overflow: hidden;
}
.siteChip.built { background: #4aa3df; color: #fff; border-color: #1e5c8a; }
.siteChip img { width: 18px; height: 18px; }
.factoryChip { display: inline-flex; background: #7c5eb0; border: 1px solid #3c2b5e; border-radius: 3px; padding: 1px; }
.factoryChip img { width: 20px; height: 20px; }
.privilegeRow {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -40px);
	display: flex;
	gap: 2px;
	pointer-events: none;
}
.privDot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid #111; display: inline-block; }
.ship {
	position: absolute;
	transform: translate(-50%, -50%);
	z-index: 12;
	pointer-events: none;
}
.shipBody {
	display: block;
	width: 20px;
	height: 20px;
	border-radius: 50% 50% 50% 10%;
	transform: rotate(45deg);
	border: 2px solid #fff;
	box-shadow: 0 0 4px #000;
}
.ship.currentShip .shipBody { box-shadow: 0 0 0 3px #ffe600, 0 0 10px #ffe600; }
.highwayCube {
	pointer-events: none;
	position: absolute;
	width: 12px;
	height: 12px;
	transform: translate(-50%, -50%) rotate(45deg);
	border: 1px solid #fff;
	z-index: 8;
	box-shadow: 0 0 3px #000;
}
.turnCube {
	pointer-events: none;
	position: absolute;
	width: 11px;
	height: 11px;
	transform: translate(-50%, -50%);
	border: 1px solid #fff;
	z-index: 9;
	box-shadow: 0 0 2px #000;
}
.pathwayMarker {
	position: absolute;
	transform: translate(-50%, -50%);
	font-size: 9px;
	font-weight: bold;
	background: #111;
	border: 2px solid;
	border-radius: 4px;
	padding: 1px 3px;
	z-index: 10;
}
.pathwayMarker:disabled { pointer-events: none; }
.pathwayMarker:enabled { outline: 2px solid #00ff88; cursor: pointer; }
.dotTarget {
	fill: rgba(255, 230, 0, 0.45);
	stroke: #ffe600;
	stroke-width: 2;
	cursor: pointer;
	pointer-events: auto;
}
.dotTarget:hover { fill: rgba(255, 230, 0, 0.8); }
.consumerCard {
	position: absolute;
	width: 4.6%;
	height: 4.7%;
	transform: translate(-50%, -50%);
	background: #f0d75e;
	border: 1px solid #7a6414;
	border-radius: 3px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 5;
}
.consumerCard.top { box-shadow: 0 0 0 2px #ffe600, 0 0 8px #ffe600; }
.consumerCard.empty { background: rgba(255, 255, 255, 0.12); border-color: #888; }
.consumerCard img { width: 82%; height: 82%; object-fit: contain; }
.consumerCard .vpBadge {
	position: absolute;
	right: 0;
	bottom: 0;
	font-size: 8px;
	font-weight: bold;
	color: #fff;
	background: #1b3f6b;
	padding: 0 2px;
	border-radius: 2px;
}
.emptySlot { font-size: 8px; color: #ddd; }
.mapTile { pointer-events: auto; padding: 0; cursor: pointer; }
.mapTile:disabled { cursor: default; }
.mapTile:enabled { outline: 2px solid #00ff88; }
.mineTile { background: transparent; border: 0; display: inline-flex; }
.planetDisc:focus-visible, .dotTarget:focus-visible { outline: 4px solid white; }
.cardTarget { position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; background: transparent; border: 0; z-index: 1; }
.consumerCard.selectable { outline: 3px solid #00ff88; outline-offset: 2px; }
.cardTarget:focus-visible { outline: 4px solid white; }
</style>
