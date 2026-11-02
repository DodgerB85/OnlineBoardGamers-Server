<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";
import { cellName, colourName, monumentName, monumentStyle, tileStyle } from "../js/LBRview.js";
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
					<div class="hint">A tie goes to the defender.</div>
				</div>
				<span v-if="myTurn" class="decision-text">Send how many?</span>
				<span v-else class="decision-text">Waiting for {{ model.seatName(pending.seat) }} to send support.</span>
				<template v-if="myTurn">
					<button
						v-for="count in supportChoices"
						:key="count"
						type="button"
						class="actionsLineButton support-button"
						:disabled="saving"
						@click="sendSupport(count)"
					>
						<span class="mini-tile" :style="tileStyle(support.colour, 16)"></span>
						{{ count }}
					</button>
				</template>
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

.conflict-box {
	border: 1px solid rgba(102, 57, 49, 0.4);
	border-radius: 5px;
	padding: 5px 7px;
	font-size: 12px;
	line-height: 1.35;
}

.conflict-box .hint {
	font-size: 12px;
	opacity: 0.78;
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
