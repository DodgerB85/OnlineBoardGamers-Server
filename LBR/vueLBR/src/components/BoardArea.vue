<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import { cellName, leaderSpriteIndex, monumentSpriteIndex, tileSpriteIndex, colourName } from "../js/LBRview.js";
import { BOARD_WIDTH, CELLS, CELL_W, CODE_COLOUR, COLS, MAP_H, MAP_LEFT, MAP_TOP, MAP_W, PITCH } from "../js/LBRreference.js";

const store = useModelStore();

// The board is one SVG in map units, so artwork, pieces and hit targets scale together.
const mapSrc = "/static/LBR/images/map.jpg";
const tileSheet = "/static/LBR/images/tiles.png";
const leaderSheet = "/static/LBR/images/leaders.png";
const monumentSheet = "/static/LBR/images/monuments.png";

// The map keeps its 950px size when there is room and shrinks to fit a narrow
// page; zooming in past the fit overflows and scrolls as before.
const boardStyle = computed(() => ({
	width: `calc(min(100%, ${BOARD_WIDTH + 4}px) * ${store.viewSettings.boardZoom})`,
}));

const cells = Array.from({ length: CELLS }, (_, i) => i);
const legal = computed(() => controller.legalCells());

const tilePieces = computed(() => {
	if (!store.game) return [];
	const out = [];
	for (const pos of cells) {
		const index = tileSpriteIndex(store.game.tiles[pos], !!store.game.treasures[pos]);
		if (index >= 0) out.push({ key: `t${pos}`, pos, index });
		if (store.game.catastrophes[pos]) out.push({ key: `c${pos}`, pos, index: 6 });
	}
	return out;
});

const leaderPieces = computed(() => {
	if (!store.game) return [];
	const out = [];
	for (const pos of cells) {
		const leader = store.game.leaders[pos];
		if (leader) out.push({ key: `l${pos}`, pos, index: leaderSpriteIndex(leader.s, leader.c), own: isOwnLeader(pos) });
	}
	return out;
});

const monumentPieces = computed(() => {
	const out = [];
	for (const monument of store.game?.monuments || []) {
		const index = monumentSpriteIndex(monument.t);
		if (index >= 0) out.push({ key: `m${monument.at}`, pos: monument.at, index });
	}
	return out;
});

const treasureCells = computed(() => {
	if (!store.game) return [];
	return cells.filter((pos) => store.game.treasures[pos] && store.game.tiles[pos] === 5);
});

function cellX(pos) {
	return MAP_LEFT + PITCH * (pos % COLS);
}

function cellY(pos) {
	return MAP_TOP + PITCH * Math.floor(pos / COLS);
}

function label(pos) {
	const tile = store.game.tiles[pos];
	const leader = store.game.leaders[pos];
	if (leader) return `${cellName(pos)}, ${colourName(leader.c)} leader of ${model.seatName(leader.s)}`;
	if (store.game.catastrophes[pos]) return `${cellName(pos)}, catastrophe`;
	if (tile === 5) return `${cellName(pos)}, monument`;
	if (tile) return `${cellName(pos)}, ${colourName(CODE_COLOUR[tile])} tile${store.game.treasures[pos] ? " with treasure" : ""}`;
	if (store.game.treasures[pos]) return `${cellName(pos)}, treasure`;
	if (store.game.unification === pos) return `${cellName(pos)}, unification tile`;
	return `${cellName(pos)}, empty`;
}

function isKeep(pos) {
	return store.game.pending?.kind === "treasure" && store.game.pending.keepOptions.includes(pos);
}

function isOwnLeader(pos) {
	const leader = store.game.leaders[pos];
	return !!leader && leader.s === model.mySeat() && model.isMyTurn() && !store.game.pending;
}
</script>

<template>
	<div class="board-wrap">
		<div v-if="store.game" class="board" :style="boardStyle">
			<svg class="map" :viewBox="`0 0 ${MAP_W} ${MAP_H}`" role="group" aria-label="Land Between Rivers board">
				<defs>
					<radialGradient id="lbr-treasure" cx="30%" cy="30%" r="75%">
						<stop offset="0" stop-color="#fff6d8" />
						<stop offset="0.5" stop-color="#fbf236" />
						<stop offset="1" stop-color="#b98151" />
					</radialGradient>
				</defs>

				<image :href="mapSrc" x="0" y="0" :width="MAP_W" :height="MAP_H" />

				<!-- Tiles, leaders and monuments, all drawn from their sprite sheets. -->
				<g class="pieces">
					<svg
						v-for="piece in tilePieces"
						:key="piece.key"
						:x="cellX(piece.pos)"
						:y="cellY(piece.pos)"
						:width="CELL_W"
						:height="PITCH"
						:viewBox="`${piece.index * CELL_W} 0 ${CELL_W} ${PITCH}`"
					>
						<image :href="tileSheet" :width="7 * CELL_W" :height="PITCH" />
					</svg>

					<template v-for="piece in leaderPieces" :key="piece.key">
						<svg
							:x="cellX(piece.pos)"
							:y="cellY(piece.pos)"
							:width="CELL_W"
							:height="CELL_W"
							:viewBox="`${piece.index % 4} ${Math.floor(piece.index / 4)} 1 1`"
						>
							<image :href="leaderSheet" width="4" height="4" />
						</svg>
						<circle v-if="piece.own" :cx="cellX(piece.pos) + CELL_W / 2" :cy="cellY(piece.pos) + CELL_W / 2" :r="CELL_W / 2" class="own-ring" />
					</template>

					<svg
						v-for="piece in monumentPieces"
						:key="piece.key"
						:x="cellX(piece.pos)"
						:y="cellY(piece.pos)"
						:width="2 * PITCH"
						:height="2 * PITCH"
						:viewBox="`${piece.index} 0 1 1`"
					>
						<image :href="monumentSheet" width="6" height="1" />
					</svg>

					<rect
						v-for="pos in treasureCells"
						:key="`treasure${pos}`"
						:x="cellX(pos) + CELL_W / 4"
						:y="cellY(pos) + CELL_W / 4"
						:width="CELL_W / 2"
						:height="CELL_W / 2"
						class="treasure"
					/>

					<svg
						v-if="store.game.unification >= 0"
						:x="cellX(store.game.unification)"
						:y="cellY(store.game.unification)"
						:width="CELL_W"
						:height="PITCH"
						:viewBox="`0 0 ${CELL_W} ${PITCH}`"
					>
						<image :href="tileSheet" :width="7 * CELL_W" :height="PITCH" />
					</svg>
				</g>

				<!-- Hit targets sit on top so a piece never swallows a click. -->
				<rect
					v-for="pos in cells"
					:key="pos"
					class="cell"
					:x="cellX(pos)"
					:y="cellY(pos)"
					:width="CELL_W"
					:height="PITCH"
					:class="{ legal: legal.has(pos), keep: isKeep(pos) }"
					role="button"
					tabindex="0"
					:aria-label="label(pos)"
					@click="controller.clickCell(pos)"
					@keydown.enter.prevent="controller.clickCell(pos)"
					@keydown.space.prevent="controller.clickCell(pos)"
				>
				</rect>
			</svg>
		</div>
		<div v-else class="waiting">
			Waiting for the opening position.
		</div>
	</div>
</template>

<style scoped>
.board {
	flex: 0 0 auto;
	margin: 0 auto;
	border: 2px solid #663931;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
	background: #c49662;
	line-height: 0;
}

.map {
	display: block;
	width: 100%;
	height: auto;
}

.pieces {
	pointer-events: none;
}

.cell {
	fill: transparent;
	pointer-events: all;
	cursor: pointer;
}

.cell:hover {
	fill: rgba(255, 255, 255, 0.22);
}

.cell:focus-visible {
	fill: rgba(23, 125, 175, 0.25);
	stroke: #177daf;
	stroke-width: 0.75;
}

/* Stroke widths are in map units: 0.75 is about 3px on a 950px board. */
.cell.legal {
	fill: rgba(251, 242, 54, 0.2);
	stroke: #fbf236;
	stroke-width: 0.75;
}

.cell.keep {
	fill: rgba(251, 242, 54, 0.25);
	stroke: #fff6d8;
	stroke-width: 0.5;
	stroke-dasharray: 1.2 0.8;
}

.own-ring {
	fill: none;
	stroke: #fbf236;
	stroke-width: 0.6;
	filter: drop-shadow(0 0 0.6px #fbf236);
}

.treasure {
	fill: url(#lbr-treasure);
	stroke: #663931;
	stroke-width: 0.25;
}

.waiting {
	padding: 40px;
	font-size: 18px;
	color: #663931;
	text-align: center;
}
</style>
