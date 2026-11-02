<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import { catastropheStyle, colourName, dynastyStyle, leaderStyle, neededColours, scoreRows, tileStyle } from "../js/LBRview.js";
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
const swapCount = computed(() => controller.swapTotal());

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

function leaderPos(seat, colour) {
	return seatPlayer(seat).leaders[colour];
}

// Leaders already on the board are drawn there and clicked on the map, so the
// card only offers the ones waiting to be placed.
function offBoardLeaders(seat) {
	return COLOURS.filter((colour) => leaderPos(seat, colour) == null);
}

function need(seat) {
	return neededColours(seatPlayer(seat));
}

function leaderSelected(colour) {
	return mode.value === "leader" && selectedColour.value === colour;
}

// A leader picked from the map (the card only shows the ones off the board).
function leaderOnBoard(seat) {
	return mode.value === "leader" && leaderPos(seat, selectedColour.value) != null;
}

function tileSelected(colour) {
	return mode.value === "tile" && selectedColour.value === colour;
}

function isPicked(colour, i) {
	return !!store.selectedSwap[colour][i - 1];
}

function leaderTitle(colour) {
	return `${colourName(colour)} leader off the board`;
}

function handTitle(colour) {
	return mode.value === "swap"
		? `Pick ${colourName(colour).toLowerCase()} tiles to exchange`
		: `Place a ${colourName(colour).toLowerCase()} tile`;
}

function clickTile(colour, index) {
	if (!canPick(mySeat.value)) return;
	controller.clickHandTile(colour, index);
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
				<span class="avatar" :style="dynastyStyle(seat, 72)" aria-hidden="true"></span>
				<div class="identity">
					<div class="name">
						{{ model.seatName(seat) }}
						<span v-if="seat === personal.pov && !model.isAiSeat(seat)" class="you">(you)</span>
					</div>
					<div class="tags">
						<span v-if="current(seat)" class="current">● playing</span>
						<span v-if="current(seat) && !store.game.pending && !store.game.gameOver" class="actions-left">
							{{ 2 - store.game.actionsUsed }} action(s) left
						</span>
						<span v-if="model.isAiSeat(seat)" class="missing">AI</span>
						<span v-if="model.isMissing(seat)" class="missing">missing</span>
						<span class="mark">{{ model.markForSeat(seat) }}</span>
					</div>
				</div>
			</div>

			<div v-if="offBoardLeaders(seat).length" class="leader-row" aria-label="Leaders off the board">
				<button
					v-for="colour in offBoardLeaders(seat)"
					:key="colour"
					type="button"
					class="leader-slot pieceButton"
					:class="{ selected: leaderSelected(colour) }"
					:disabled="!canPick(seat)"
					:aria-pressed="leaderSelected(colour)"
					:aria-label="leaderTitle(colour)"
					@click="chooseLeader(colour)"
				>
					<span class="leader-disc" :style="leaderStyle(seat, colour, 44)"></span>
				</button>
			</div>

			<div class="card-controls" v-if="isMine(seat) && !store.game.gameOver">
				<template v-if="mode === 'swap'">
					<button type="button" :disabled="!canPick(seat) || swapCount <= 0" @click="controller.swapSelected">
						Confirm swap ({{ swapCount }}/6)
					</button>
					<button type="button" :disabled="!canPick(seat)" @click="controller.resetSelection">Cancel</button>
				</template>
				<template v-else>
					<button type="button" :disabled="!canPick(seat)" @click="controller.selectSwapMode">Swap tiles</button>
					<button v-if="leaderOnBoard(seat)" type="button" :disabled="!canPick(seat)" @click="controller.withdrawLeader(selectedColour)">
						Withdraw leader
					</button>
					<button v-if="mode !== 'idle'" type="button" :disabled="!canPick(seat)" @click="controller.resetSelection">Cancel</button>
					<button type="button" :disabled="!canPick(seat)" @click="controller.endTurn">Pass &amp; End Turn</button>
				</template>
			</div>

			<div class="stats">
				<span v-if="ownsHand(seat)" class="stat">
					<span class="nugget" aria-hidden="true"></span>
					{{ seatPlayer(seat).treasures }}
				</span>
				<button
					v-if="isMine(seat)"
					type="button"
					class="stat catastrophe-button pieceButton"
					:aria-pressed="mode === 'catastrophe'"
					:disabled="!canPick(seat) || seatPlayer(seat).catastrophes <= 0"
					aria-label="Place a catastrophe"
					@click="controller.selectCatastrophe"
				>
					<span class="catastrophe" :style="catastropheStyle(48)" aria-hidden="true"></span>
					{{ seatPlayer(seat).catastrophes }}
				</button>
				<span v-else class="stat">
					<span class="catastrophe" :style="catastropheStyle(48)" aria-hidden="true"></span>
					{{ seatPlayer(seat).catastrophes }}
				</span>
			</div>

			<div v-if="visible(seat)" class="score-row" aria-label="Victory points">
				<span v-for="row in scoreRows(seatPlayer(seat).score)" :key="row.colour" class="score-cube" :class="`c-${row.colour}`">
					{{ row.value }}
				</span>
			</div>

			<div v-if="visible(seat)" class="need-row" aria-label="Needed colours">
				<span class="need-label">Need:</span>
				<span v-if="need(seat).length === 4" class="need-any">any</span>
				<template v-else>
					<span
						v-for="colour in need(seat)"
						:key="colour"
						class="score-cube need-cube"
						:class="`c-${colour}`"
					></span>
				</template>
			</div>

			<div v-if="ownsHand(seat)" class="hand" :class="{ swapping: mode === 'swap' }" aria-label="Hand">
				<template v-for="colour in COLOURS" :key="colour">
					<button
						v-for="i in seatPlayer(seat).hand[colour]"
						:key="`${colour}${i}`"
						type="button"
						class="hand-tile pieceButton"
						:class="{ selected: tileSelected(colour), picked: isPicked(colour, i) }"
						:style="tileStyle(colour, 44)"
						:disabled="!canPick(seat)"
						:aria-pressed="tileSelected(colour) || isPicked(colour, i)"
						:aria-label="handTitle(colour)"
						@click="clickTile(colour, i)"
					></button>
				</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
.seat {
	border: 1px solid rgba(102, 57, 49, 0.4);
	border-radius: 8px;
	padding: 12px;
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
	font-size: 22px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	font-size: 15px;
	opacity: 0.8;
}

.current {
	color: #177daf;
	font-weight: bold;
}

.you,
.mark,
.missing {
	font-size: 15px;
	font-weight: normal;
}

.actions-left {
	font-weight: bold;
}

.card-controls {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 9px 0;
}

.missing {
	color: #8b1d1d;
}

.leader-row {
	display: flex;
	gap: 5px;
	margin: 9px 0;
}

.leader-slot {
	display: flex;
	align-items: center;
	border: 1px solid transparent;
	border-radius: 4px;
	padding: 2px;
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

.stats {
	display: flex;
	gap: 16px;
	font-size: 18px;
	align-items: center;
	flex-wrap: wrap;
}

.stat {
	display: inline-flex;
	align-items: center;
	gap: 5px;
}

.nugget {
	display: inline-block;
	width: 36px;
	height: 36px;
	border: 1px solid #663931;
	border-radius: 6px;
	background: radial-gradient(circle at 30% 30%, #fff6d8, #fbf236 50%, #b98151);
}

.catastrophe {
	display: inline-block;
	background-repeat: no-repeat;
	border-radius: 6px;
}

.catastrophe-button {
	padding: 0;
	border: 0;
	background: transparent;
	border-radius: 4px;
	cursor: pointer;
}

.catastrophe-button:disabled {
	cursor: default;
}

.catastrophe-button:hover:enabled .catastrophe {
	box-shadow: 0 0 0 2px #fbf236;
}

.catastrophe-button[aria-pressed="true"] .catastrophe {
	box-shadow: 0 0 0 2px #177daf;
}

.score-row {
	display: flex;
	gap: 6px;
	margin-top: 9px;
}

.score-cube {
	display: inline-block;
	width: 36px;
	text-align: center;
	font-weight: bold;
	font-size: 17px;
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

.need-row {
	display: flex;
	align-items: center;
	gap: 7px;
	margin-top: 7px;
	font-size: 16px;
}

.need-label {
	opacity: 0.75;
}

.need-cube {
	width: 22px;
	height: 22px;
}

.need-any {
	font-weight: bold;
	opacity: 0.75;
}

.hand {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 5px;
	margin-top: 10px;
	padding-top: 8px;
	border-top: 1px solid rgba(102, 57, 49, 0.2);
}

.hand.swapping {
	background: rgba(251, 242, 54, 0.12);
	border-radius: 4px;
}

.hand-tile {
	border: 0;
	padding: 0;
	background-color: transparent;
	background-repeat: no-repeat;
	border-radius: 3px;
	cursor: pointer;
}

.hand-tile:disabled {
	cursor: default;
}

.hand-tile.selected {
	box-shadow: 0 0 0 2px #177daf;
}

.hand-tile.picked {
	box-shadow: 0 0 0 2px #fbf236;
}

.pieceButton:focus-visible {
	outline: 2px solid #177daf;
	outline-offset: 1px;
}

/* The rails sit under the board on narrow screens, so the seat cards share a row. */
@media (max-width: 1300px) {
	.player-cards {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		gap: 8px;
		min-width: 0;
	}

	.seat {
		flex: 1 1 260px;
	}
}
</style>
