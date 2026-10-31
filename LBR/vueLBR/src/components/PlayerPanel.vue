<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as model from "../js/LBRmodel.js";
import { leaderSpriteIndex, scoreRows, tileSpriteIndex } from "../js/LBRview.js";
import { COLOURS } from "../js/LBRreference.js";

const store = useModelStore();
const personal = usePersonalStore();

const seats = computed(() => Array.from({ length: store.game?.numSeats || 0 }, (_, i) => i));

function seatPlayer(seat) {
	return store.game.players[seat];
}

function current(seat) {
	if (!store.game) return false;
	const actor = store.game.pending ? store.game.pending.seat : store.game.activeSeat;
	return actor === seat;
}

function leaderStyle(seat, colour, size = 26) {
	const index = leaderSpriteIndex(seat, colour);
	return {
		width: `${size}px`,
		height: `${size}px`,
		backgroundImage: "url(/static/LBR/images/leaders.png)",
		backgroundSize: `${4 * size}px ${4 * size}px`,
		backgroundPosition: `${-(index % 4) * size}px ${-Math.floor(index / 4) * size}px`,
	};
}

function visible(seat) {
	return model.visibleScore(seat);
}

function handCount(hand) {
	return hand.R + hand.B + hand.G + hand.K;
}

function ownsHand(seat) {
	return personal.trainingGame || (personal.pov === seat && !model.isAiSeat(seat));
}

function tileMiniStyle(colour, size = 15) {
	const index = tileSpriteIndex({ R: 1, B: 2, G: 3, K: 4 }[colour], false);
	const height = Math.round((size * 13) / 12);
	return {
		width: `${size}px`,
		height: `${height}px`,
		backgroundImage: "url(/static/LBR/images/tiles.png)",
		backgroundSize: `${216 * (size / 12)}px ${13 * (size / 12)}px`,
		backgroundPosition: `${-index * size}px 0`,
	};
}
</script>

<template>
	<div v-if="store.game" class="panel">
		<h2>Players</h2>
		<div
			v-for="seat in seats"
			:key="seat"
			class="seat"
			:class="{ active: current(seat) }"
		>
			<div class="seat-head">
				<span class="avatar" :style="leaderStyle(seat, 'R', 30)" aria-hidden="true"></span>
				<div>
					<div class="name">
						{{ model.seatName(seat) }}
						<span v-if="seat === personal.pov && !model.isAiSeat(seat)" class="you">(you)</span>
						<span v-if="current(seat)" class="current" title="Making a decision now">●</span>
						<span v-if="model.isAiSeat(seat)" class="missing">AI</span>
						<span v-if="model.isMissing(seat)" class="missing">missing</span>
					</div>
					<div class="mark">{{ model.markForSeat(seat) }} dynasty</div>
				</div>
			</div>

			<div class="leader-row" aria-label="Leaders">
				<template v-for="colour in COLOURS" :key="colour">
					<span
						class="leader-disc"
						:class="{ offboard: seatPlayer(seat).leaders[colour] === null }"
						:style="leaderStyle(seat, colour)"
						:title="`${colour} leader`"
					></span>
				</template>
			</div>

			<div class="stats">
				<span class="stat">Treasures: {{ visible(seat) ? seatPlayer(seat).treasures : "?" }}</span>
				<span class="stat">Catastrophes: {{ seatPlayer(seat).catastrophes }}</span>
			</div>
			<div v-if="ownsHand(seat)" class="hand-row" aria-label="Hand">
				<span
					v-for="colour in COLOURS"
					:key="colour"
					class="hand-tile"
					:style="tileMiniStyle(colour)"
					:title="`${seatPlayer(seat).hand[colour]} ${colour} tiles`"
				></span>
				<span class="hand-count">{{ handCount(seatPlayer(seat).hand) }} tiles</span>
			</div>
			<div v-else class="stats">
				<span class="stat">Hand: {{ handCount(seatPlayer(seat).hand) }}</span>
			</div>

			<div class="score-row" aria-label="Victory points">
				<template v-if="visible(seat)">
					<span v-for="row in scoreRows(seatPlayer(seat).score)" :key="row.colour" class="score-cube" :class="`c-${row.colour}`" :title="row.colour">
						{{ row.value }}
					</span>
				</template>
				<span v-else class="hidden-score" title="Scores are hidden behind screens">?</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.seat {
	border: 1px solid rgba(102, 57, 49, 0.4);
	border-radius: 6px;
	padding: 7px;
	margin-bottom: 7px;
	background: rgba(255, 255, 255, 0.25);
}

.seat.active {
	background: #fbf23655;
	border-color: #663931;
	box-shadow: 0 0 6px #fbf236;
}

.seat-head {
	display: flex;
	gap: 8px;
	align-items: center;
}

.avatar {
	background-repeat: no-repeat;
	border-radius: 50%;
	image-rendering: auto;
}

.name {
	font-weight: bold;
	font-size: 15px;
}

.you,
.mark,
.missing {
	font-size: 11px;
	font-weight: normal;
	opacity: 0.75;
}

.current {
	color: #ac3232;
	font-size: 16px;
}

.leader-row {
	display: flex;
	gap: 5px;
	margin: 6px 0;
}

.leader-disc {
	background-repeat: no-repeat;
	border-radius: 50%;
	image-rendering: auto;
}

.leader-disc.offboard {
	opacity: 0.22;
}

.stats {
	display: flex;
	gap: 10px;
	font-size: 12px;
	flex-wrap: wrap;
}

.hand-row {
	display: flex;
	gap: 4px;
	align-items: center;
	margin-top: 4px;
}

.hand-tile {
	background-repeat: no-repeat;
	image-rendering: pixelated;
}

.hand-count {
	font-size: 11px;
	opacity: 0.75;
	margin-left: 3px;
}

.score-row {
	display: flex;
	gap: 4px;
	margin-top: 5px;
}

.score-cube {
	display: inline-block;
	width: 24px;
	text-align: center;
	font-weight: bold;
	font-size: 12px;
	border: 1px solid #663931;
	border-radius: 3px;
	color: #fff6d8;
}

.c-R {
	background: #ac3232;
}
.c-B {
	background: #5b6ee1;
}
.c-G {
	background: #388900;
}
.c-K {
	background: #242327;
}

.hidden-score {
	font-size: 18px;
	font-weight: bold;
	opacity: 0.6;
}
</style>
