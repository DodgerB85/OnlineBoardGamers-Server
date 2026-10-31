<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import { cellName, leaderSpriteIndex, monumentSpriteIndex, tileSpriteIndex, colourName } from "../js/LBRview.js";
import { CELLS, COLS } from "../js/LBRreference.js";

const store = useModelStore();
const personal = usePersonalStore();

const pitch = computed(() => personal.zoom || 39);
const scale = computed(() => pitch.value / 13);
const inner = computed(() => 12 * scale.value);
const mapW = computed(() => 240 * scale.value);
const mapH = computed(() => 160 * scale.value);
const legal = computed(() => controller.legalCells());
const mapSrc = "/static/LBR/images/map.png";

const cells = Array.from({ length: CELLS }, (_, i) => i);
const treasureCells = computed(() => {
	if (!store.game) return [];
	return cells.filter((pos) => store.game.treasures[pos] && store.game.tiles[pos] === 5);
});
const unificationCells = computed(() => {
	if (!store.game || store.game.unification < 0) return [];
	return [store.game.unification];
});

function cellLeft(pos) {
	return (17 + 13 * (pos % COLS)) * scale.value;
}

function cellTop(pos) {
	return (8 + 13 * Math.floor(pos / COLS)) * scale.value;
}

function cellStyle(pos) {
	return {
		left: `${cellLeft(pos)}px`,
		top: `${cellTop(pos)}px`,
		width: `${inner.value}px`,
		height: `${pitch.value}px`,
	};
}

function tileStyle(pos) {
	const tile = store.game.tiles[pos];
	if (!tile || tile === 5) return null;
	const index = tileSpriteIndex(tile, !!store.game.treasures[pos]);
	if (index < 0) return null;
	return spriteStyle(index, 216 * scale.value, 13 * scale.value, 12 * scale.value);
}

function catastropheStyle(pos) {
	if (!store.game.catastrophes[pos]) return null;
	return spriteStyle(17, 216 * scale.value, 13 * scale.value, 12 * scale.value);
}

function spriteStyle(index, sheetW, sheetH, stepW) {
	return {
		backgroundImage: "url(/static/LBR/images/tiles.png)",
		backgroundSize: `${sheetW}px ${sheetH}px`,
		backgroundPosition: `${-index * stepW}px 0`,
	};
}

function leaderStyle(pos) {
	const leader = store.game.leaders[pos];
	if (!leader) return null;
	const index = leaderSpriteIndex(leader.s, leader.c);
	return {
		width: `${inner.value}px`,
		height: `${inner.value}px`,
		backgroundImage: "url(/static/LBR/images/leaders.png)",
		backgroundSize: `${4 * inner.value}px ${4 * inner.value}px`,
		backgroundPosition: `${-(index % 4) * inner.value}px ${-Math.floor(index / 4) * inner.value}px`,
	};
}

function monumentStyle(m) {
	const idx = monumentSpriteIndex(m.t);
	if (idx < 0) return null;
	const width = 2 * pitch.value;
	return {
		left: `${cellLeft(m.at)}px`,
		top: `${cellTop(m.at)}px`,
		width: `${width}px`,
		height: `${width}px`,
		backgroundImage: "url(/static/LBR/images/monuments.png)",
		backgroundSize: `${6 * width}px ${width}px`,
		backgroundPosition: `${-idx * width}px 0`,
	};
}

function treasureStyle(pos) {
	if (!store.game.treasures[pos] || store.game.tiles[pos] !== 5) return null;
	return {
		left: `${cellLeft(pos) + inner.value / 2 - inner.value / 4}px`,
		top: `${cellTop(pos) + inner.value / 2 - inner.value / 4}px`,
		width: `${inner.value / 2}px`,
		height: `${inner.value / 2}px`,
	};
}

function unificationStyle(pos) {
	if (store.game.unification !== pos) return null;
	return {
		...spriteStyle(0, 216 * scale.value, 13 * scale.value, 12 * scale.value),
		left: `${cellLeft(pos)}px`,
		top: `${cellTop(pos)}px`,
		width: `${inner.value}px`,
		height: `${pitch.value}px`,
	};
}

function label(pos) {
	const tile = store.game.tiles[pos];
	const leader = store.game.leaders[pos];
	if (leader) return `${cellName(pos)}, ${colourName(leader.c)} leader of ${model.seatName(leader.s)}`;
	if (store.game.catastrophes[pos]) return `${cellName(pos)}, catastrophe`;
	if (tile === 5) return `${cellName(pos)}, monument`;
	if (tile) return `${cellName(pos)}, ${colourName(tile)} tile${store.game.treasures[pos] ? " with treasure" : ""}`;
	if (store.game.treasures[pos]) return `${cellName(pos)}, treasure`;
	if (store.game.unification === pos) return `${cellName(pos)}, unification tile`;
	return `${cellName(pos)}, empty`;
}

function isKeep(pos) {
	return store.game.pending?.kind === "treasure" && store.game.pending.keepOptions.includes(pos);
}
</script>

<template>
	<div class="board-wrap">
		<div
			v-if="store.game"
			class="board"
			:style="{ width: `${mapW}px`, height: `${mapH}px` }"
		>
			<img class="map" :src="mapSrc" :width="mapW" :height="mapH" alt="Land Between Rivers board" />

			<button
				v-for="pos in cells"
				:key="pos"
				class="cell"
				:class="{ legal: legal.has(pos), keep: isKeep(pos) }"
				:style="cellStyle(pos)"
				:aria-label="label(pos)"
				:title="label(pos)"
				@click="controller.clickCell(pos)"
			>
				<span v-if="tileStyle(pos)" class="tile" :style="tileStyle(pos)"></span>
				<span v-if="catastropheStyle(pos)" class="tile" :style="catastropheStyle(pos)"></span>
				<span v-if="store.game.treasures[pos] && store.game.tiles[pos] !== 5 && store.game.tiles[pos] !== 1" class="cube"></span>
				<span v-if="leaderStyle(pos)" class="leader" :style="leaderStyle(pos)"></span>
				<span v-if="legal.has(pos)" class="legal-ring"></span>
				<span v-if="isKeep(pos)" class="keep-ring"></span>
			</button>

			<div
				v-for="m in store.game.monuments"
				:key="`m${m.at}`"
				class="monument"
				:style="monumentStyle(m)"
			></div>

			<div
				v-for="pos in treasureCells"
				:key="`t${pos}`"
				class="treasure"
				:style="treasureStyle(pos)"
			></div>

			<div
				v-for="pos in unificationCells"
				:key="`u${pos}`"
				class="unification"
				:style="unificationStyle(pos)"
			></div>
		</div>
		<div v-else class="waiting">
			Waiting for the opening position.
		</div>
	</div>
</template>

<style scoped>
.board {
	position: relative;
	image-rendering: pixelated;
	background: #d9a066;
	border: 2px solid #663931;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.map {
	position: absolute;
	left: 0;
	top: 0;
	display: block;
	image-rendering: pixelated;
}

.cell {
	position: absolute;
	background: transparent;
	border: 0;
	padding: 0;
	margin: 0;
	cursor: pointer;
	image-rendering: pixelated;
}

.cell:focus-visible {
	outline: 2px solid #fbf236;
}

.tile,
.unification {
	image-rendering: pixelated;
}

.leader,
.monument {
	image-rendering: auto;
}

.tile {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	background-repeat: no-repeat;
}

.leader {
	position: absolute;
	left: 0;
	top: 0;
	background-repeat: no-repeat;
	border-radius: 50%;
}

.monument {
	position: absolute;
	background-repeat: no-repeat;
	pointer-events: none;
}

.treasure {
	position: absolute;
	background: radial-gradient(circle at 30% 30%, #fff6d8, #fbf236 45%, #b98151 100%);
	border: 1px solid #663931;
	box-shadow: 0 0 3px #fbf236;
	pointer-events: none;
}

.unification {
	position: absolute;
	background-repeat: no-repeat;
	pointer-events: none;
}

.legal-ring {
	position: absolute;
	inset: 0;
	border: 2px solid #fbf236;
	box-shadow: inset 0 0 6px #fbf236;
	border-radius: 3px;
	pointer-events: none;
}

.keep-ring {
	position: absolute;
	inset: 0;
	border: 2px dashed #fff6d8;
	background: rgba(251, 242, 54, 0.25);
	pointer-events: none;
}

.waiting {
	padding: 40px;
	font-size: 18px;
	color: #663931;
}
</style>
