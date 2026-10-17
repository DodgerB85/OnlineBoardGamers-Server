<script setup>
import { computed } from "vue"
import { CONTRIBUTION_THRESHOLD } from "../js/engine/cards.js"
import { activeSeat } from "../js/engine/index.js"
import { availableHype } from "../js/engine/state.js"
import { projectedScore, vpText, yearEarned } from "../js/PAPhints.js"
import { ICONS } from "./board/icons.js"
import ArtIcon from "./board/ArtIcon.vue"
import TokenPip from "./board/TokenPip.vue"
import { useModelStore } from "../stores/PAPstore.js"
import { usePersonalStore } from "../stores/PAPpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

defineProps({
	minimiseInfoForMainScreen: { type: Boolean, default: false },
})

// Stats come from the state on screen (the replay frame during replay). Colours come from the store.
function isCurrent(index) {
	return activeSeat(store.viewGame) === index
}

// Recognized Profit bar: the 40 tick is the Final Audit threshold; the bar scale grows with the leader.
function barMax() {
	return Math.max(CONTRIBUTION_THRESHOLD * 1.25, ...store.viewGame.players.map(p => p.recognized))
}
function pct(n) {
	return Math.max(0, Math.min(100, (n / barMax()) * 100)) + "%"
}

// Victory Points: the final ones once the game is over (they match FinalScores), else what the seat would score if it ended now.
function score(idx) {
	const r = store.viewGame.result
	return r ? r.rows.find(row => row.seat === idx) : projectedScore(store.viewGame, idx)
}
const scores = computed(() => store.viewGame.players.map((_, idx) => score(idx)))
</script>

<template>
	<div id="playerTable" :class="{ minimise: minimiseInfoForMainScreen }">
		<div class="playerRow" v-for="(player, idx) in store.viewGame.players" :key="idx" :class="{ currentPlayer: isCurrent(idx), me: idx === personal.pov }" :style="{ borderColor: personal.getCorrectedColourHex(store.players[idx].colour) }">
			<div class="playerHead">
				<span class="colourSwatch" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[idx].colour) }"></span>
				<span class="playerName">{{ player.name }}</span>
				<ArtIcon v-if="store.viewGame.first === idx" :name="ICONS.firstPlayer.art" :label="ICONS.firstPlayer.label" :size="16" />
				<ArtIcon v-if="store.viewGame.watch === idx" :name="ICONS.watch.art" :label="ICONS.watch.label" :size="16" />
				<ArtIcon v-if="store.viewGame.administered === idx" :name="ICONS.administration.art" :label="ICONS.administration.label" :size="16" />
				<span v-if="isCurrent(idx)" class="activeTag">to play</span>
				<span class="vpPip" :title="(store.viewGame.result ? 'Final Victory Points: ' : 'Victory Points if the game ended now: ') + vpText(scores[idx])">
					<span aria-hidden="true">★</span> VP <b>{{ scores[idx].vp }}</b>
				</span>
			</div>
			<div class="profitBar" :title="ICONS.recognized.label + ' ' + player.recognized + ' (Final Audit threshold ' + CONTRIBUTION_THRESHOLD + ')'">
				<div class="fill" :class="{ safe: player.recognized >= CONTRIBUTION_THRESHOLD }" :style="{ width: pct(player.recognized) }"></div>
				<div class="tick" :style="{ left: pct(CONTRIBUTION_THRESHOLD) }"></div>
			</div>
			<div class="stats">
				<TokenPip :icon="ICONS.cash.art" :value="player.cash" :label="'Cash: ' + player.cash + ' Crowns'" :size="16" />
				<TokenPip :icon="ICONS.recognized.art" :value="player.recognized" :label="ICONS.recognized.label + ': ' + player.recognized" :size="16" />
				<TokenPip :icon="ICONS.hype.art" :value="availableHype(player)" :locked="player.lockedHype" :label="'Hype: ' + availableHype(player) + (player.lockedHype ? ', ' + player.lockedHype + ' locked' : '')" :size="16" />
				<TokenPip :icon="ICONS.reputation.art" :value="player.reputation" :label="'Reputation: ' + player.reputation" :size="16" />
				<TokenPip :icon="ICONS.warning.art" :value="player.warnings" :label="'Warnings: ' + player.warnings" :size="16" />
				<TokenPip :icon="ICONS.tier(player.tier).art" :value="player.tier" :label="ICONS.tier(player.tier).label" :size="16" />
				<span v-if="store.viewGame.phase === 'audit'" class="earned" title="Recognized Profit earned this Year: the highest becomes First Player">+{{ yearEarned(store.viewGame, idx) }} this Year</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
#playerTable {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 6px;
	padding: 6px;
}
.playerRow {
	display: flex;
	flex-direction: column;
	gap: 4px;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 4px 8px;
	background-color: #fbf8ef;
	font-size: 14px;
}
.playerHead {
	display: flex;
	align-items: center;
	gap: 6px;
}
.stats {
	display: flex;
	flex-wrap: wrap;
	gap: 3px 4px;
	font-size: 13px;
}
.profitBar {
	position: relative;
	height: 6px;
	border-radius: 3px;
	background-color: #e4dcc6;
}
.fill {
	height: 100%;
	border-radius: 3px;
	background-color: #b5651d;
}
.fill.safe {
	background-color: #3f7f3f;
}
.tick {
	position: absolute;
	top: -3px;
	width: 2px;
	height: 12px;
	background-color: #3a2e1f;
}
.currentPlayer {
	box-shadow: 0 0 8px #3f9f3f;
}
.activeTag {
	font-size: 12px;
	color: #2e6b2e;
	font-weight: bold;
}
.earned {
	font-size: 12px;
	color: #2e6b2e;
	align-self: center;
}
.vpPip {
	margin-left: auto;
	padding: 0 8px;
	border: 2px solid #3a2e1f;
	border-radius: 12px;
	background-color: #fff3c4;
	font-size: 14px;
	font-weight: bold;
	white-space: nowrap;
}
.vpPip b {
	font-size: 20px;
}
.me .playerName {
	font-weight: bold;
}
.colourSwatch {
	width: 14px;
	height: 14px;
	border: 1px solid black;
	display: inline-block;
}
</style>
