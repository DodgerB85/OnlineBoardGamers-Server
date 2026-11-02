<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import { cellName, colourName, leaderStyle, scoreRows, tileStyle } from "../js/LBRview.js";
import { COLOURS } from "../js/LBRreference.js";

const props = defineProps({
	seats: { type: Array, default: null },
});

const store = useModelStore();
const personal = usePersonalStore();

const allSeats = computed(() => Array.from({ length: store.game?.numSeats || 0 }, (_, i) => i));
const shownSeats = computed(() => props.seats ?? allSeats.value);
const mySeat = computed(() => model.mySeat());
const mode = computed(() => store.viewSettings.mode);
const selectedColour = computed(() => store.viewSettings.selectedColour);

function seatPlayer(seat) {
	return store.game.players[seat];
}

function current(seat) {
	if (!store.game) return false;
	const actor = store.game.pending ? store.game.pending.seat : store.game.activeSeat;
	return actor === seat;
}

function isMine(seat) {
	return seat === mySeat.value && !model.isAiSeat(seat);
}

function ownsHand(seat) {
	return personal.trainingGame || (personal.pov === seat && !model.isAiSeat(seat));
}

function canPick(seat) {
	return model.isMyTurn() && isMine(seat) && !store.game.pending && !store.viewSettings.saving;
}

function visible(seat) {
	return model.visibleScore(seat);
}

function handCount(hand) {
	return hand.R + hand.B + hand.G + hand.K;
}

function leaderPos(seat, colour) {
	return seatPlayer(seat).leaders[colour];
}

function leaderSelected(colour) {
	return mode.value === "leader" && selectedColour.value === colour;
}

function tileSelected(colour) {
	return mode.value === "tile" && selectedColour.value === colour;
}

function swapped(colour) {
	return mode.value === "swap" ? store.selectedSwap[colour] : 0;
}

function leaderTitle(seat, colour) {
	const pos = leaderPos(seat, colour);
	const where = pos == null ? "off the board" : `at ${cellName(pos)}`;
	return `${colourName(colour)} leader ${where}`;
}

function handTitle(colour) {
	return mode.value === "swap"
		? `Pick ${colourName(colour).toLowerCase()} tiles to exchange`
		: `Place a ${colourName(colour).toLowerCase()} tile`;
}

function stackHeight(count) {
	return count > 0 ? 37 + (count - 1) * 9 : 37;
}

function clickTile(colour) {
	if (!canPick(mySeat.value)) return;
	controller.clickHandTile(colour);
}

function chooseLeader(colour) {
	if (!canPick(mySeat.value)) return;
	controller.selectLeader(colour);
}
</script>

<template>
	<div v-if="store.game" class="player-cards">
		<div
			v-for="seat in shownSeats"
			:key="seat"
			class="seat"
			:class="{ active: current(seat), mine: isMine(seat) }"
		>
			<div class="seat-head">
				<span class="avatar" :style="leaderStyle(seat, 'R', 30)" aria-hidden="true"></span>
				<div class="identity">
					<div class="name">
						{{ model.seatName(seat) }}
						<span v-if="seat === personal.pov && !model.isAiSeat(seat)" class="you">(you)</span>
					</div>
					<div class="tags">
						<span v-if="current(seat)" class="current" title="Making a decision now">● playing</span>
						<span v-if="model.isAiSeat(seat)" class="missing">AI</span>
						<span v-if="model.isMissing(seat)" class="missing">missing</span>
						<span class="mark">{{ model.markForSeat(seat) }} dynasty</span>
					</div>
				</div>
			</div>

			<div class="leader-row" aria-label="Leaders">
				<button
					v-for="colour in COLOURS"
					:key="colour"
					type="button"
					class="leader-slot pieceButton"
					:class="{ off: leaderPos(seat, colour) == null, selected: leaderSelected(colour) }"
					:disabled="!canPick(seat)"
					:aria-pressed="leaderSelected(colour)"
					:title="leaderTitle(seat, colour)"
					@click="chooseLeader(colour)"
				>
					<span class="leader-disc" :style="leaderStyle(seat, colour, 28)"></span>
					<span class="where">{{ leaderPos(seat, colour) == null ? "off" : cellName(leaderPos(seat, colour)) }}</span>
				</button>
			</div>

			<div class="stats">
				<span class="stat" title="Treasures">◆ {{ visible(seat) ? seatPlayer(seat).treasures : "?" }}</span>
				<span class="stat" title="Catastrophes">▲ {{ seatPlayer(seat).catastrophes }}</span>
				<span class="stat">Hand {{ handCount(seatPlayer(seat).hand) }}</span>
			</div>

			<div class="score-row" aria-label="Victory points">
				<template v-if="visible(seat)">
					<span v-for="row in scoreRows(seatPlayer(seat).score)" :key="row.colour" class="score-cube" :class="`c-${row.colour}`" :title="colourName(row.colour)">
						{{ row.value }}
					</span>
				</template>
				<span v-else class="hidden-score" title="Scores are hidden behind screens">?</span>
			</div>

			<div v-if="ownsHand(seat)" class="hand" :class="{ swapping: mode === 'swap' }" aria-label="Hand">
				<button
					v-for="colour in COLOURS"
					:key="colour"
					type="button"
					class="hand-stack pieceButton"
					:class="{ selected: tileSelected(colour) || swapped(colour) > 0 }"
					:style="{ height: `${stackHeight(seatPlayer(seat).hand[colour])}px` }"
					:disabled="!canPick(seat)"
					:aria-pressed="tileSelected(colour) || swapped(colour) > 0"
					:title="handTitle(colour)"
					@click="clickTile(colour)"
				>
					<template v-if="seatPlayer(seat).hand[colour] > 0">
						<span
							v-for="i in seatPlayer(seat).hand[colour]"
							:key="i"
							class="hand-tile"
							:class="{ picked: i <= swapped(colour) }"
							:style="{ ...tileStyle(colour, 34), top: `${(i - 1) * 9}px` }"
						></span>
					</template>
					<span v-else class="hand-empty"></span>
					<span class="hand-count">{{ seatPlayer(seat).hand[colour] }}</span>
				</button>
			</div>
			<div v-else class="hand-line">Hand: {{ handCount(seatPlayer(seat).hand) }}</div>
		</div>
	</div>
</template>

<style scoped>
.seat {
	border: 1px solid rgba(102, 57, 49, 0.4);
	border-radius: 8px;
	padding: 8px;
	background: rgba(255, 255, 255, 0.3);
}

.seat.active {
	background: #e1edf5;
	border-color: #177daf;
	box-shadow: 0 0 0 1px #177daf inset;
}

.seat.mine {
	background: #fff9e9;
}

.seat.mine.active {
	background: #e1edf5;
}

.seat-head {
	display: flex;
	gap: 8px;
	align-items: center;
	min-width: 0;
}

.avatar {
	flex: 0 0 auto;
	background-repeat: no-repeat;
	border-radius: 50%;
	image-rendering: auto;
}

.identity {
	min-width: 0;
}

.name {
	font-weight: bold;
	font-size: 15px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	font-size: 11px;
	opacity: 0.8;
}

.current {
	color: #177daf;
	font-weight: bold;
}

.you,
.mark,
.missing {
	font-size: 11px;
	font-weight: normal;
}

.missing {
	color: #8b1d1d;
}

.leader-row {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 3px;
	margin: 7px 0;
}

.leader-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1px;
	border: 1px solid transparent;
	border-radius: 4px;
	padding: 2px 1px;
	background: transparent;
	font: inherit;
	cursor: pointer;
}

.leader-slot:hover:enabled {
	background: rgba(255, 255, 255, 0.6);
}

.leader-slot:disabled {
	cursor: default;
}

.leader-slot.selected {
	border-color: #177daf;
	background: #e1edf5;
}

.leader-disc {
	background-repeat: no-repeat;
	border-radius: 50%;
	image-rendering: auto;
}

.leader-slot.off .leader-disc {
	opacity: 0.22;
}

.where {
	font-size: 10px;
	line-height: 1;
	opacity: 0.75;
}

.stats {
	display: flex;
	gap: 9px;
	font-size: 12px;
	flex-wrap: wrap;
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

.hand {
	display: flex;
	align-items: flex-end;
	gap: 7px;
	margin-top: 6px;
	padding-top: 3px;
	border-top: 1px solid rgba(102, 57, 49, 0.2);
	min-height: 43px;
}

.hand.swapping {
	background: rgba(251, 242, 54, 0.12);
	border-radius: 4px;
}

.hand-stack {
	position: relative;
	flex: 0 0 34px;
	width: 34px;
	border: 1px solid transparent;
	border-radius: 4px;
	padding: 0;
	background: transparent;
	cursor: pointer;
}

.hand-stack:disabled {
	cursor: default;
}

.hand-stack.selected {
	border-color: #177daf;
	background: rgba(225, 237, 245, 0.7);
}

.hand-tile {
	position: absolute;
	left: 0;
	background-repeat: no-repeat;
	image-rendering: pixelated;
}

.hand-tile.picked {
	left: 4px;
	box-shadow: 0 0 0 2px #fbf236;
	z-index: 2;
}

.hand-empty {
	position: absolute;
	left: 0;
	top: 0;
	width: 34px;
	height: 37px;
	border: 1px dashed rgba(102, 57, 49, 0.35);
	border-radius: 3px;
}

.hand-count {
	position: absolute;
	right: -4px;
	bottom: -5px;
	z-index: 3;
	background: #663931;
	color: #fff6d8;
	font-size: 11px;
	line-height: 14px;
	border-radius: 8px;
	padding: 0 4px;
}

.hand-line {
	margin-top: 5px;
	font-size: 12px;
	opacity: 0.75;
}

.pieceButton:focus-visible {
	outline: 2px solid #177daf;
	outline-offset: 1px;
}
</style>
