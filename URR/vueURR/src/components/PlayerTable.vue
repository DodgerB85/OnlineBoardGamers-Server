<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
import * as view from "../js/URRview"
import * as rules from "../js/URRrules"
const store = useModelStore()
const personal = usePersonalStore()

defineProps({
	minimiseInfoForMainScreen: { type: Boolean, default: false },
})

function isCurrent(index) {
	return view.displayedTurnOrder(store)[0] === index
}
</script>

<template>
	<div id="playerTable" :class="{ minimise: minimiseInfoForMainScreen }">
		<div class="playerRow" v-for="(player, idx) in store.players" :key="idx" :class="{ currentPlayer: isCurrent(idx), me: idx === personal.pov }">
			<PlayerMarker class="colourSwatch" :index="idx" />
			<span class="playerCash" title="Private treasury">{{ player.money }} SPL cash</span>
			<span class="playerScore" title="Private cash plus the market value of owned land">{{ rules.playerAssets(store, idx) }} SPL assets</span>
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
	flex-wrap: wrap;
	max-width: 100%;
	box-sizing: border-box;
	align-items: center;
	gap: 6px;
	border: 1px solid #888;
	border-radius: 5px;
	padding: 4px 8px;
	background-color: #eee;
}
.currentPlayer {
	border: 2px solid green;
	background-color: #dfffe0;
}
.me {
	font-weight: bold;
}
.colourSwatch {
	width: 22px;
	height: 22px;
	border: 1px solid black;
	display: inline-block;
}
.playerScore {
	font-weight: bold;
}
</style>
