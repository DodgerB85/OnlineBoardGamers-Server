<script setup>
import { computed, ref, watch } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import {
	cellName,
	colourName,
	leaderSpriteIndex,
	monumentName,
	tileSpriteIndex,
} from "../js/LBRview.js";
import { COLOURS } from "../js/LBRreference.js";
import { conflictStanding, currentActor } from "../js/LBRrules.js";
import GameOverPanel from "./GameOverPanel.vue";

const store = useModelStore();
const supportCount = ref(0);

const game = computed(() => store.game);
const pending = computed(() => game.value?.pending || null);
const actorSeat = computed(() => (game.value ? currentActor(game.value) : -1));
const actorPlayer = computed(() => (game.value ? game.value.players[actorSeat.value] : null));
const myTurn = computed(() => model.isMyTurn());
const hand = computed(() => actorPlayer.value?.hand || { R: 0, B: 0, G: 0, K: 0 });
const mode = computed(() => store.viewSettings.mode);
const selectedColour = computed(() => store.viewSettings.selectedColour);
const support = computed(() => conflictStanding(game.value, pending.value));
const supportMax = computed(() => {
	if (!pending.value || !actorPlayer.value) return 0;
	const colour = pending.value.kind === "revoltSupport" ? "R" : pending.value.colour;
	return actorPlayer.value.hand[colour] || 0;
});
const swapTotal = computed(() => COLOURS.reduce((sum, c) => sum + (store.selectedSwap[c] || 0), 0));

watch(
	() => [pending.value?.kind, pending.value?.seat, pending.value?.colour, game.value?.turnNumber],
	() => {
		supportCount.value = 0;
	},
);

function tileStyle(colour) {
	const index = tileSpriteIndex({ R: 1, B: 2, G: 3, K: 4 }[colour], false);
	const width = 22;
	const height = Math.round((22 * 13) / 12);
	return {
		width: `${width}px`,
		height: `${height}px`,
		backgroundImage: "url(/static/LBR/images/tiles.png)",
		backgroundSize: `${216 * (width / 12)}px ${13 * (width / 12)}px`,
		backgroundPosition: `${-index * width}px 0`,
	};
}

function leaderStyle(colour, size = 24) {
	const index = leaderSpriteIndex(actorSeat.value, colour);
	return {
		width: `${size}px`,
		height: `${size}px`,
		backgroundImage: "url(/static/LBR/images/leaders.png)",
		backgroundSize: `${4 * size}px ${4 * size}px`,
		backgroundPosition: `${-(index % 4) * size}px ${-Math.floor(index / 4) * size}px`,
	};
}

function handColours() {
	return COLOURS;
}

function leaderOnBoard(colour) {
	const pos = actorPlayer.value?.leaders?.[colour];
	return pos === null || pos === undefined ? null : pos;
}

function selectTile(colour) {
	controller.selectTile(colour);
}

function selectLeader(colour) {
	controller.selectLeader(colour);
}

function catastrophe() {
	controller.selectCatastrophe();
}

function cancel() {
	controller.resetSelection();
	store.gameMessages.successText = "";
}

function swapTiles() {
	controller.swapSelected();
}

function conflictButtons() {
	return game.value?.war?.conflicts || [];
}

function keepTreasure(pos) {
	controller.keepTreasure(pos);
}

function order(colour) {
	controller.orderConflict(colour);
}

function sendSupport() {
	const count = Math.max(0, Math.min(supportMax.value, supportCount.value || 0));
	controller.sendSupport(count);
}

function build(at, type) {
	controller.buildMonument(at, type);
}

function decline() {
	controller.declineMonument();
}

function schoolName(type) {
	return monumentName(type);
}
</script>

<template>
	<div v-if="!game" class="panel">
		<h2>Waiting</h2>
		<p>The opening position is being created.</p>
	</div>

	<GameOverPanel v-else-if="game.gameOver" />

	<div v-else class="panel action-panel">
		<h2>Actions</h2>
		<div class="message" :class="{ error: store.gameMessages.errorText, ok: store.gameMessages.successText }">
			{{ store.gameMessages.errorText || store.gameMessages.successText }}
		</div>

		<!-- Treasure decision -->
		<template v-if="pending && pending.kind === 'treasure'">
			<p>
				{{ model.seatName(pending.seat) }} has a green trader in a kingdom with more than one treasure.
				Keep one treasure. Treasures nearest a board edge must be taken first.
			</p>
			<div class="row">
				<button v-for="pos in pending.keepOptions" :key="pos" class="action" :disabled="!myTurn" @click="keepTreasure(pos)">
					Keep treasure at {{ cellName(pos) }}
				</button>
			</div>
			<p class="hint">You can also click a highlighted treasure on the board.</p>
		</template>

		<!-- Choose which conflict to resolve first -->
		<template v-else-if="pending && pending.kind === 'warOrder'">
			<p>{{ model.seatName(pending.seat) }} chooses the order of the conflicts.</p>
			<div class="row">
				<button v-for="c in conflictButtons()" :key="c.colour" class="action" :disabled="!myTurn" @click="order(c.colour)">
					{{ colourName(c.colour) }} first: {{ model.seatName(c.attacker) }} attacks {{ model.seatName(c.defender) }}
				</button>
			</div>
		</template>

		<!-- Support decision -->
		<template v-else-if="pending && (pending.kind === 'warSupport' || pending.kind === 'revoltSupport')">
			<p>
				{{ colourName(support.colour) }} conflict:
				{{ model.seatName(support.attacker) }} attacks {{ model.seatName(support.defender) }}.
				{{ model.seatName(pending.seat) }} is sending support ({{ pending.stage }}).
			</p>
			<div class="conflict-box">
				<div>
					<strong>{{ model.seatName(support.attacker) }}</strong>: {{ support.attackerBase }} in kingdom +
					{{ support.attackerSupport }} sent = <strong>{{ support.attackerTotal }}</strong>
				</div>
				<div>
					<strong>{{ model.seatName(support.defender) }}</strong>: {{ support.defenderBase }} in kingdom +
					{{ support.defenderSupport }} sent = <strong>{{ support.defenderTotal }}</strong>
				</div>
				<div class="hint">A tie goes to the defender. You have {{ supportMax }} tile(s) of this colour.</div>
			</div>
			<div class="row">
				<label for="supportCount">Send:</label>
				<input id="supportCount" type="number" min="0" :max="supportMax" v-model.number="supportCount" />
				<button class="action" :disabled="!myTurn || store.viewSettings.saving" @click="sendSupport">Confirm support</button>
			</div>
		</template>

		<!-- Monument decision -->
		<template v-else-if="pending && pending.kind === 'monument'">
			<p>{{ model.seatName(pending.seat) }} completed a square of {{ colourName(pending.colour) }} tiles.</p>
			<div class="monument-offers">
				<div v-for="offer in pending.offers" :key="offer.at" class="offer">
					<div>Square at {{ cellName(offer.at) }}</div>
					<div class="row">
						<button v-for="type in offer.types" :key="type" class="action" :disabled="!myTurn" @click="build(offer.at, type)">
							Build {{ schoolName(type) }}
						</button>
					</div>
				</div>
			</div>
			<button class="action ghost-dark" :disabled="!myTurn" @click="decline">Decline monument</button>
		</template>

		<!-- Normal turn -->
		<template v-else>
			<p v-if="myTurn" class="status">
				{{ model.seatName(actorSeat) }} has {{ 2 - game.actionsUsed }} action(s) left.
			</p>
			<p v-else class="status waiting">
				Waiting for {{ model.seatName(actorSeat) }}.
			</p>

			<template v-if="myTurn">
				<div class="section-title">Your hand</div>
				<div class="row hand">
					<button
						v-for="colour in handColours()"
						:key="colour"
						class="tile-button"
						:class="{ chosen: mode === 'tile' && selectedColour === colour }"
						:disabled="hand[colour] <= 0 || store.viewSettings.saving"
						@click="selectTile(colour)"
						:title="`${colourName(colour)} tile (${hand[colour]} in hand)`"
					>
						<span class="tile-icon" :style="tileStyle(colour)"></span>
						<span>{{ hand[colour] }}</span>
					</button>
				</div>

				<div class="section-title">Leaders</div>
				<div class="row leaders">
					<button
						v-for="colour in handColours()"
						:key="colour"
						class="leader-button"
						:class="{ chosen: mode === 'leader' && selectedColour === colour }"
						:disabled="store.viewSettings.saving"
						@click="selectLeader(colour)"
						:title="`Move the ${colourName(colour)} leader`"
					>
						<span class="leader-icon" :style="leaderStyle(colour)"></span>
						<span>{{ leaderOnBoard(colour) !== null ? cellName(leaderOnBoard(colour)) : "off board" }}</span>
					</button>
				</div>
				<div v-if="leaderOnBoard(selectedColour)" class="row">
					<button class="action ghost-dark" @click="controller.withdrawLeader(selectedColour)">
						Withdraw selected leader
					</button>
				</div>

				<div class="section-title">Other actions</div>
				<div class="row">
					<button
						class="action"
						:class="{ chosen: mode === 'catastrophe' }"
						:disabled="actorPlayer.catastrophes <= 0 || store.viewSettings.saving"
						@click="catastrophe"
					>
						Catastrophe ({{ actorPlayer.catastrophes }})
					</button>
					<button v-if="mode !== 'idle'" class="action ghost-dark" @click="cancel">Cancel</button>
				</div>

				<div class="section-title">Swap tiles</div>
				<div class="row swap">
					<label v-for="colour in handColours()" :key="colour">
						<span :class="`c-${colour}`">{{ colour }}</span>
						<input
							type="number"
							min="0"
							:max="Math.min(6, hand[colour])"
							v-model.number="store.selectedSwap[colour]"
						/>
					</label>
					<span>Total: {{ swapTotal }} / 6</span>
					<button class="action" :disabled="swapTotal <= 0 || store.viewSettings.saving" @click="swapTiles">Swap</button>
				</div>

				<div class="row end-row">
					<button class="action" :disabled="store.viewSettings.saving" @click="controller.passAction">Pass one action</button>
					<button class="action" :disabled="store.viewSettings.saving" @click="controller.endTurn">End turn</button>
				</div>
			</template>

			<p v-if="mode !== 'idle'" class="hint">
				Click a highlighted space on the board.
			</p>
		</template>
	</div>
</template>

<style scoped>
.action-panel {
	max-height: 75vh;
	overflow: auto;
}

.status {
	font-weight: bold;
}

.waiting {
	opacity: 0.75;
}

.section-title {
	margin: 8px 0 4px;
	font-size: 13px;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.hand,
.leaders {
	gap: 7px;
}

.tile-button,
.leader-button {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	border: 1px solid #663931;
	border-radius: 4px;
	background: #fff6d8;
	padding: 3px 5px;
	font: inherit;
	cursor: pointer;
}

.tile-button.chosen,
.leader-button.chosen {
	box-shadow: 0 0 0 2px #fbf236, 0 0 6px #fbf236;
}

.tile-button:disabled,
.leader-button:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.tile-icon {
	image-rendering: pixelated;
	background-repeat: no-repeat;
}

.leader-icon {
	image-rendering: auto;
	background-repeat: no-repeat;
}

.conflict-box {
	border: 1px solid rgba(102, 57, 49, 0.4);
	border-radius: 5px;
	padding: 6px;
	margin-bottom: 6px;
	font-size: 13px;
}

.monument-offers .offer {
	border-bottom: 1px solid rgba(102, 57, 49, 0.3);
	padding: 5px 0;
}

.hint {
	font-size: 12px;
	opacity: 0.75;
}

.swap label {
	display: inline-flex;
	align-items: center;
	gap: 3px;
}

.swap input {
	width: 44px;
}

.end-row {
	margin-top: 8px;
	border-top: 1px solid rgba(102, 57, 49, 0.35);
	padding-top: 8px;
}

.c-R {
	color: #ac3232;
}
.c-B {
	color: #5b6ee1;
}
.c-G {
	color: #388900;
}
.c-K {
	color: #242327;
}

.ghost-dark {
	background: transparent;
	border: 1px dashed #663931;
}
</style>
