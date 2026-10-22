<script setup>
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import { useI18n } from "vue-i18n"
const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

defineProps({
	minimiseInfoForMainScreen: { type: Boolean, default: false },
})

function isCurrent(index) {
	return store.gameflow.turnOrder[0] === index
}

function energyTotal(player) {
	return rules.totalEnergy(player)
}

function cargoText(player) {
	return `${rules.cargoUsed(player)}/${rules.cargoCapacity(player)}`
}

function statusText(player, idx) {
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return t("playerTable.finalScore", { score: rules.finalScore(player) })
	if (isCurrent(idx)) return t("common.currentTurn")
	if (store.players[idx].ship.node) return t("common.waiting")
	return t("common.setup")
}
</script>

<template>
	<div id="playerTable" :class="{ minimise: minimiseInfoForMainScreen }">
		<div v-for="(player, idx) in store.players" :key="idx" class="playerCard" :class="{ currentPlayer: isCurrent(idx), me: idx === personal.pov }">
			<span class="colourSwatch" :style="{ backgroundColor: personal.getCorrectedColourHex(player.colour) }"></span>
			<span class="playerName">{{ player.displayName }}</span>
			<span class="playerScore" :title="player.auctionBid ? $t('playerTable.scoreBeforeBid') : $t('playerTable.score')">{{ player.score }}</span>
			<span class="stat" :title="$t('playerTable.storedEnergy')">⚡ {{ energyTotal(player) }}</span>
			<span class="stat" :title="$t('playerTable.cargoUsed')">📦 {{ cargoText(player) }}</span>
			<span class="stat" :title="$t('playerTable.privilegesLeft')">🔵 {{ player.privileges }}</span>
			<span v-if="player.auctionBid" class="stat auctionStat" :title="$t('playerTable.auctionBidTitle')">{{ $t("playerTable.bidAmount", { amount: player.auctionBid }) }}</span>
			<span class="status">{{ statusText(player, idx) }}</span>
		</div>
	</div>
</template>

<style scoped>
#playerTable {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 6px;
	padding: 6px;
}
.playerCard {
	display: flex;
	align-items: center;
	gap: 6px;
	border: 1px solid #888;
	border-radius: 5px;
	padding: 4px 8px;
	background-color: #eee;
	font-size: 13px;
}
.currentPlayer {
	border: 2px solid green;
	background-color: #dfffe0;
	box-shadow: 0 0 5px #4caf50;
}
.me { font-weight: bold; }
.colourSwatch { width: 14px; height: 14px; border: 1px solid black; display: inline-block; }
.playerScore { font-weight: bold; font-size: 15px; }
.stat { color: #333; white-space: nowrap; }
.auctionStat { color: #8a4b00; }
.status { font-size: 11px; color: #555; font-style: italic; }
</style>
