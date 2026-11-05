<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import { cellName, colourName, leaderStyle, monumentName, monumentStyle, tileStyle } from "../js/LBRview.js";
import { conflictStanding } from "../js/LBRrules.js";
import GameOverPanel from "./GameOverPanel.vue";

const store = useModelStore();

const game = computed(() => store.game);
const pending = computed(() => game.value?.pending || null);
const myTurn = computed(() => model.isMyTurn());
const saving = computed(() => store.viewSettings.saving);

const support = computed(() => conflictStanding(game.value, pending.value));
const supportMax = computed(() => {
	if (!pending.value) return 0;
	const colour = pending.value.kind === "revoltSupport" ? "R" : pending.value.colour;
	return game.value.players[pending.value.seat].hand[colour] || 0;
});
const supportChoices = computed(() => Array.from({ length: supportMax.value + 1 }, (_, i) => i));
const conflicts = computed(() => game.value?.war?.conflicts || []);
const message = computed(() => store.gameMessages.errorText || store.gameMessages.successText);

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
</script>

<template>
	<div v-if="!game" class="action-bar waiting-bar">
		<b>Waiting</b>
		<span>The opening position is being created.</span>
	</div>

	<GameOverPanel v-else-if="game.gameOver" />

	<div v-else class="action-bar" :class="{ idle: !pending && !message }">
		<div
			v-if="message"
			class="message"
			:class="{ error: store.gameMessages.errorText, ok: !store.gameMessages.errorText && store.gameMessages.successText }"
			role="status"
		>
			{{ message }}
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
				<div class="decision-row">
					<span class="decision-title">Choose the first conflict.</span>
					<button
						v-for="c in conflicts"
						:key="c.colour"
						type="button"
						class="conflict-button"
						:disabled="!myTurn"
						@click="order(c.colour)"
					>
						<span class="leader-badge" :style="leaderStyle(c.attacker, c.colour, 32)" aria-hidden="true"></span>
						<span class="conflict-names">
							<b>{{ model.seatName(c.attacker) }}</b>
							attacks
							<b>{{ model.seatName(c.defender) }}</b>
						</span>
						<span class="leader-badge" :style="leaderStyle(c.defender, c.colour, 32)" aria-hidden="true"></span>
					</button>
				</div>
			</template>

			<!-- Support decision -->
			<template v-else-if="pending && (pending.kind === 'warSupport' || pending.kind === 'revoltSupport')">
				<div class="decision-row support-row">
					<div class="contender">
						<span class="leader-badge" :style="leaderStyle(support.attacker, support.colour, 36)" aria-hidden="true"></span>
						<span class="contender-name">{{ model.seatName(support.attacker) }}</span>
						<span class="computation">{{ support.attackerBase }} + {{ support.attackerSupport }} = <b>{{ support.attackerTotal }}</b></span>
					</div>
					<span class="versus">vs</span>
					<div class="contender">
						<span class="leader-badge" :style="leaderStyle(support.defender, support.colour, 36)" aria-hidden="true"></span>
						<span class="contender-name">{{ model.seatName(support.defender) }}</span>
						<span class="computation">{{ support.defenderBase }} + {{ support.defenderSupport }} = <b>{{ support.defenderTotal }}</b></span>
					</div>
					<span class="tie-note">A tie goes to the defender.</span>
					<div v-if="myTurn" class="send-group">
						<span class="decision-title">Send how many?</span>
						<button
							v-for="count in supportChoices"
							:key="count"
							type="button"
							class="support-button"
							:disabled="saving"
							@click="sendSupport(count)"
						>
							<span class="mini-tile" :style="tileStyle(support.colour, 22)"></span>
							{{ count }}
						</button>
					</div>
					<span v-else class="decision-title">Waiting for {{ model.seatName(pending.seat) }} to send support.</span>
				</div>
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
						@click="build(offer.at, type)"
					>
						<span class="mini-monument" :style="monumentStyle(type, 24)"></span>
						{{ monumentName(type) }} at {{ cellName(offer.at) }}
					</button>
				</template>
				<button type="button" class="actionsLineButton" :disabled="!myTurn" @click="decline">Decline</button>
			</template>
		</div>
	</div>
</template>

<style scoped>
.action-bar {
	display: flex;
	flex: 0 0 auto;
	flex-wrap: wrap;
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

/* Nothing to decide and nothing to say: keep the space, drop the frame. */
.action-bar.idle {
	background: transparent;
	border-color: transparent;
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

.action-controls {
	display: flex;
	flex-wrap: wrap;
	gap: 3px;
	align-items: center;
	justify-content: flex-end;
	flex: 1 1 auto;
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

/* Decisions lay out across the whole bar so the bar is not a tall stack. */
.decision-row {
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
	width: 100%;
	font-size: 18px;
}

.decision-title {
	font-weight: bold;
	font-size: 18px;
	white-space: nowrap;
}

.leader-badge {
	flex: 0 0 auto;
	background-repeat: no-repeat;
	border-radius: 50%;
}

.contender {
	display: flex;
	align-items: center;
	gap: 10px;
}

.contender-name {
	font-weight: bold;
}

.computation {
	font-size: 20px;
	font-variant-numeric: tabular-nums;
}

.versus {
	font-size: 16px;
	font-weight: bold;
	opacity: 0.6;
}

.tie-note {
	font-size: 14px;
	opacity: 0.75;
	margin-right: auto;
}

.send-group {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.support-button,
.conflict-button {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	border: 1px solid #998a67;
	border-radius: 5px;
	background: #fffdf4;
	color: #302f27;
	font-family: Arial, sans-serif;
	cursor: pointer;
}

.support-button {
	justify-content: center;
	min-width: 64px;
	min-height: 46px;
	padding: 6px 12px;
	font-size: 20px;
}

.conflict-button {
	min-height: 48px;
	padding: 8px 14px;
	font-size: 18px;
}

.support-button:hover:enabled,
.conflict-button:hover:enabled {
	background: #f1e9d7;
	border-color: #756440;
}

.support-button:disabled,
.conflict-button:disabled {
	opacity: 0.45;
	cursor: default;
}

.conflict-names {
	white-space: nowrap;
}

.mini-tile,
.mini-monument {
	display: inline-block;
	background-repeat: no-repeat;
	flex: 0 0 auto;
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
		justify-content: flex-start;
	}
}
</style>
