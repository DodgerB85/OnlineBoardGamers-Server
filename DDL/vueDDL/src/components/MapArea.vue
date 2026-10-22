<script setup>
import { computed } from "vue"
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

const highlighted = computed(() => {
	if (store.context.highlightNodes.length > 0) return new Set(store.context.highlightNodes)
	if (activePlayerIndex.value >= 0 && store.context.action === rf.ACT_MOVE && store.gameflow.movement.remaining > 0 && store.players[activePlayerIndex.value].ship.node) {
		return new Set(map.reachableNodes(store, activePlayerIndex.value, store.players[activePlayerIndex.value].ship.node, store.gameflow.movement.remaining))
	}
	if (store.context.action === rf.ACT_PLACE_HIGHWAYS) {
		const nodes = []
		for (const route of rf.ROUTES) {
			for (let i = 1; i < route.length; i++) {
				const id = map.segmentNodeId(route.id, i)
				if (store.board.highways[id] === undefined && map.shipsOnNode(store, id).length === 0) nodes.push(id)
			}
		}
		return new Set(nodes)
	}
	return new Set()
})

const highlightedPlanets = computed(() => {
	if (activePlayerIndex.value >= 0 && store.context.action === rf.ACT_MOVE && store.gameflow.movement.remaining > 0 && store.players[activePlayerIndex.value].ship.node) {
		const nodes = map.reachableNodes(store, activePlayerIndex.value, store.players[activePlayerIndex.value].ship.node, store.gameflow.movement.remaining)
		return new Set(nodes.filter((n) => rf.planetByNode(n)).map((n) => rf.planetByNode(n).id))
	}
	return new Set()
})

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
	if (store.context.action === rf.ACT_MOVE && highlightedPlanets.value.has(planet.id)) {
		controller.moveTo("P" + planet.id)
		return
	}
	if (store.context.action === rf.ACT_PLACE_HIGHWAYS) return
	store.context.selectedPlanet = store.context.selectedPlanet === planet.id ? -1 : planet.id
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
		return tile ? t("map.siteValue", { good: rf.goodName(tile.good), points: tile.points }) : t("action.consumer")
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
	<div class="boardWrap">
		<div class="board" :style="boardStyle">
			<svg class="overlaySvg" viewBox="0 0 1800 1200" preserveAspectRatio="none">
				<path v-for="route in rf.ROUTES" :key="route.id" :d="map.routePathD(route)" fill="none" stroke="#7fb8e8" stroke-width="18" stroke-opacity="0" />
			</svg>

			<div v-for="item in planetItems" :key="item.planet.id" class="planet" :class="{ startPlanet: item.planet.start, highlighted: highlightedPlanets.has(item.planet.id), selected: store.context.selectedPlanet === item.planet.id }" :style="item.style" @click="onPlanetClick(item.planet)">
				<div class="planetName">{{ item.planet.name }}</div>
				<div class="planetDisc" :class="{ start: item.planet.start }"></div>
				<div class="planetStatus">
					<img v-if="item.mine !== null" class="mineIcon" :src="funcs.goodImage(item.mine)" :title="$t('map.mineTitle', { good: rf.goodName(item.mine) })" />
					<span v-if="item.site" class="siteChip" :class="{ built: item.site.built, unbuilt: !item.site.built }" :title="siteLabel(item.site)">
						<img v-if="siteGood(item.site) !== null" :src="funcs.goodImage(siteGood(item.site))" />
						<span v-else>{{ siteLabel(item.site) }}</span>
					</span>
					<span v-if="item.factory" class="factoryChip" :title="$t('action.factory')">
						<img :src="funcs.goodImage(factoryGood(item.factory))" />
					</span>
					<span v-if="item.pathways.length > 0" class="pathwayChip">{{ item.pathways.map((p) => p.dir === "in" ? $t("map.in") : $t("map.out")).join("/") }}</span>
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

			<div v-for="item in pathwayItems" :key="item.planetId + item.dir + item.owner" class="pathwayMarker" :class="item.dir" :style="{ ...item.style, borderColor: item.colour, color: item.colour }">{{ item.dir === "in" ? $t("map.in") : $t("map.out") }}</div>

			<div v-for="node in highlighted" :key="node" class="dotTarget" :style="pct(map.nodePosition(node))" :title="map.nodeLabel(node)" @click="onNodeClick(node)"></div>

			<div v-for="card in consumerCards" :key="card.col + '-' + card.row" class="consumerCard" :class="{ empty: card.tileId === null, top: card.top }" :style="card.style">
				<img v-if="card.tileId !== null" :src="funcs.goodImage(card.tileId)" :title="$t('map.cardTitle', { good: rf.goodName(card.tileId), value: card.value })" />
				<span v-else class="emptySlot">{{ $t("map.emptySlotValue", { points: card.value }) }}</span>
				<span class="vpBadge">{{ card.value }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.boardWrap {
	width: 1060px;
	margin: 0 auto;
}
.board {
	position: relative;
	width: 1060px;
	height: 706px;
	background-size: 100% 100%;
	background-repeat: no-repeat;
	border: 3px solid #10233f;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
	overflow: hidden;
}
.overlaySvg {
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
.planetName {
	position: absolute;
	left: 50%;
	top: -10px;
	transform: translate(-50%, -100%);
	font-size: 11px;
	font-weight: bold;
	color: #fff;
	background: rgba(8, 20, 40, 0.75);
	padding: 1px 4px;
	border-radius: 3px;
	white-space: nowrap;
	pointer-events: none;
}
.planetStatus {
	position: absolute;
	left: 50%;
	top: 100%;
	transform: translate(-50%, 0);
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
.pathwayChip { font-size: 9px; font-weight: bold; color: #111; background: #ff8c42; border-radius: 3px; padding: 1px 3px; }
.privilegeRow {
	position: absolute;
	left: 50%;
	top: 68%;
	transform: translate(-50%, 0);
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
	position: absolute;
	width: 12px;
	height: 12px;
	transform: translate(-50%, -50%) rotate(45deg);
	border: 1px solid #fff;
	z-index: 8;
	box-shadow: 0 0 3px #000;
}
.turnCube {
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
.dotTarget {
	position: absolute;
	width: 20px;
	height: 20px;
	transform: translate(-50%, -50%);
	border-radius: 50%;
	background: rgba(255, 230, 0, 0.55);
	border: 2px solid #ffe600;
	cursor: pointer;
	z-index: 20;
}
.dotTarget:hover { background: rgba(255, 230, 0, 0.9); }
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
</style>
