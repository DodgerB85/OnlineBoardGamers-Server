<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import { cellName, colourName, leaderStyle, monumentName, monumentStyle, tileStyle } from "../js/LBRview.js";
import { conflictStanding, currentActor } from "../js/LBRrules.js";
import GameOverPanel from "./GameOverPanel.vue";

const store = useModelStore();

const game = computed(() => store.game);
const pending = computed(() => game.value?.pending || null);
const actorSeat = computed(() => (game.value ? currentActor(game.value) : -1));
const actorPlayer = computed(() => (game.value ? game.value.players[actorSeat.value] : null));
const myTurn = computed(() => model.isMyTurn());
const mode = computed(() => store.viewSettings.mode);
const selectedColour = computed(() => store.viewSettings.selectedColour);
const saving = computed(() => store.viewSettings.saving);

const support = computed(() => conflictStanding(game.value, pending.value));
const supportMax = computed(() => {
	if (!pending.value || !actorPlayer.value) return 0;
	const colour = pending.value.kind === "revoltSupport" ? "R" : pending.value.colour;
	return actorPlayer.value.hand[colour] || 0;
});
const supportChoices = computed(() => Array.from({ length: supportMax.value + 1 }, (_, i) => i));
const swapCount = computed(() => controller.swapTotal());
const conflicts = computed(() => game.value?.war?.conflicts || []);
const selectedLeaderPos = computed(() => {
	if (mode.value !== "leader" || !selectedColour.value || !actorPlayer.value) return null;
	return actorPlayer.value.leaders[selectedColour.value];
});
const hint = computed(() => controller.actionHint());
const message = computed(() => store.gameMessages.errorText || store.gameMessages.successText);
const meta = computed(() => {
	if (!game.value) return "";
	if (pending.value) return "making a decision";
	if (myTurn.value) return `your turn · ${2 - game.value.actionsUsed} action(s) left`;
	return `waiting for ${model.seatName(actorSeat.value)}`;
});

function keepTreasure(pos) {
	controller.keepTreasure(pos);
}

function order(colour) {
	controller.orderConflict(colour);
}

function sendSupport(count) {
	controller.sendSupport(count);
}

function build(at, type) {
	controller.buildMonument(at, type);
}

function decline() {
	controller.declineMonument();
}

function swapSelected() {
	controller.swapSelected();
}

function cancel() {
	controller.resetSelection();
	store.gameMessages.successText = "";
}
</script>

<template>
	<div v-if="!game" class="action-bar waiting-bar">
		<b>Waiting</b>
		<span>The opening position is being created.</span>
	</div>

	<GameOverPanel v-else-if="game.gameOver" />

	<div v-else class="action-bar">
		<div class="action-info">
			<div class="turn-line">
				<span class="actor-avatar" :style="leaderStyle(actorSeat, 'R', 24)" aria-hidden="true"></span>
				<b>{{ model.seatName(actorSeat) }}</b>
				<span class="turn-meta">{{ meta }}</span>
			</div>
			<div
				class="message"
				:class="{ error: store.gameMessages.errorText, ok: !store.gameMessages.errorText && store.gameMessages.successText }"
				role="status"
			>
				{{ message }}
			</div>
			<div class="hint">{{ hint }}</div>
		</div>

		<div class="action-controls">
			<!-- Treasure decision -->
			<template v-if="pending && pending.kind === 'treasure'">
				<span class="decision-text">Keep one treasure from the highlighted group.</span>
				<button
					v-for="pos in pending.keepOptions"
					:key="pos"
					type="button"
					class="actionsLineButton"
					:disabled="!myTurn"
					@click="keepTreasure(pos)"
				>
					Keep at {{ cellName(pos) }}
				</button>
			</template>

			<!-- Choose which conflict to resolve first -->
			<template v-else-if="pending && pending.kind === 'warOrder'">
				<span class="decision-text">Choose the first conflict.</span>
				<button
					v-for="c in conflicts"
					:key="c.colour"
					type="button"
					class="actionsLineButton"
					:disabled="!myTurn"
					@click="order(c.colour)"
				>
					{{ colourName(c.colour) }}: {{ model.seatName(c.attacker) }} attacks {{ model.seatName(c.defender) }}
				</button>
			</template>

			<!-- Support decision -->
			<template v-else-if="pending && (pending.kind === 'warSupport' || pending.kind === 'revoltSupport')">
				<div class="conflict-box">
					<div>
						<strong>{{ model.seatName(support.attacker) }}</strong>: {{ support.attackerBase }} + {{ support.attackerSupport }} =
						<strong>{{ support.attackerTotal }}</strong>
					</div>
					<div>
						<strong>{{ model.seatName(support.defender) }}</strong>: {{ support.defenderBase }} + {{ support.defenderSupport }} =
						<strong>{{ support.defenderTotal }}</strong>
					</div>
					<div class="hint">
						A tie goes to the defender. {{ model.seatName(pending.seat) }} holds {{ supportMax }}
						{{ colourName(support.colour).toLowerCase() }} tile(s).
					</div>
				</div>
				<span class="decision-text">Send how many?</span>
				<button
					v-for="count in supportChoices"
					:key="count"
					type="button"
					class="actionsLineButton support-button"
					:disabled="!myTurn || saving"
					@click="sendSupport(count)"
				>
					<span class="mini-tile" :style="tileStyle(support.colour, 16)"></span>
					{{ count }}
				</button>
			</template>

			<!-- Monument decision -->
			<template v-else-if="pending && pending.kind === 'monument'">
				<span class="decision-text">{{ colourName(pending.colour) }} square completed. Build a monument?</span>
				<template v-for="offer in pending.offers" :key="offer.at">
					<button
						v-for="type in offer.types"
						:key="type"
						type="button"
						class="actionsLineButton monument-button"
						:disabled="!myTurn"
						:title="`Build ${monumentName(type)} at ${cellName(offer.at)}`"
						@click="build(offer.at, type)"
					>
						<span class="mini-monument" :style="monumentStyle(type, 24)"></span>
						{{ monumentName(type) }} at {{ cellName(offer.at) }}
					</button>
				</template>
				<button type="button" class="actionsLineButton" :disabled="!myTurn" @click="decline">Decline</button>
			</template>

			<!-- Normal turn -->
			<template v-else-if="myTurn">
				<template v-if="mode === 'swap'">
					<span class="decision-text">Swap {{ swapCount }} / 6</span>
					<button type="button" class="actionsLineButton" :disabled="swapCount <= 0 || saving" @click="swapSelected">Confirm swap</button>
					<button type="button" class="actionsLineButton" @click="cancel">Cancel</button>
				</template>
				<template v-else>
					<button v-if="mode !== 'idle'" type="button" class="actionsLineButton" @click="cancel">Cancel</button>
					<button
						v-if="mode === 'leader' && selectedLeaderPos != null"
						type="button"
						class="actionsLineButton"
						:disabled="saving"
						@click="controller.withdrawLeader(selectedColour)"
					>
						Withdraw leader
					</button>
					<button
						type="button"
						class="actionsLineButton"
						:class="{ chosen: mode === 'catastrophe' }"
						:aria-pressed="mode === 'catastrophe'"
						:disabled="actorPlayer.catastrophes <= 0 || saving"
						@click="controller.selectCatastrophe"
					>
						Catastrophe ({{ actorPlayer.catastrophes }})
					</button>
					<button type="button" class="actionsLineButton" :disabled="saving" @click="controller.selectSwapMode">Swap tiles</button>
					<button type="button" class="actionsLineButton" :disabled="saving" @click="controller.passAction">Pass one action</button>
					<button type="button" class="actionsLineButton" :disabled="saving" @click="controller.endTurn">End turn</button>
				</template>
			</template>
		</div>
	</div>
</template>

<style scoped>
.action-bar {
	display: flex;
	flex: 0 0 auto;
	gap: 12px;
	align-items: flex-start;
	justify-content: space-between;
	padding: 8px 10px;
	background: var(--lbr-panel);
	border: 2px solid var(--lbr-panel-edge);
	border-radius: 8px;
	max-height: 38vh;
	overflow: auto;
}

.waiting-bar {
	justify-content: flex-start;
	gap: 10px;
	color: #663931;
}

.action-info {
	flex: 1 1 320px;
	min-width: 0;
}

.turn-line {
	display: flex;
	align-items: center;
	gap: 7px;
	font-size: 15px;
}

.actor-avatar {
	flex: 0 0 auto;
	background-repeat: no-repeat;
	border-radius: 50%;
	image-rendering: auto;
}

.turn-meta {
	font-size: 12px;
	opacity: 0.75;
}

.message {
	min-height: 1.3em;
	font-size: 13px;
}

.message.error {
	color: #8b1d1d;
	font-weight: bold;
}

.message.ok {
	color: #275d02;
}

.hint {
	font-size: 12px;
	opacity: 0.78;
}

.action-controls {
	display: flex;
	flex-wrap: wrap;
	gap: 3px;
	align-items: center;
	justify-content: flex-end;
	flex: 0 1 auto;
	max-width: 60%;
}

.action-controls :deep(.actionsLineButton),
.action-controls .actionsLineButton {
	margin: 2px;
}

.decision-text {
	font-size: 13px;
	font-weight: bold;
	margin: 0 4px;
}

.conflict-box {
	border: 1px solid rgba(102, 57, 49, 0.4);
	border-radius: 5px;
	padding: 5px 7px;
	font-size: 12px;
	line-height: 1.35;
}

.conflict-box .hint {
	font-size: 11px;
}

.support-button {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	min-width: 44px;
}

.mini-tile,
.mini-monument {
	display: inline-block;
	background-repeat: no-repeat;
	flex: 0 0 auto;
}

.mini-tile {
	image-rendering: pixelated;
}

.monument-button {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

@media (max-width: 1000px) {
	.action-bar {
		flex-direction: column;
		max-height: 45vh;
	}
	.action-controls {
		max-width: 100%;
		justify-content: flex-start;
	}
}
</style>
