<script setup>
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

defineProps({
	minimiseInfoForMainScreen: { type: Boolean, default: false },
})

function isCurrent(index) {
	return store.gameflow.turnOrder[0] === index
}
</script>

<template>
	<div id="playerTable" :class="{ minimise: minimiseInfoForMainScreen }">
		<div class="playerRow" v-for="(player, idx) in store.players" :key="idx" :class="{ currentPlayer: isCurrent(idx), me: idx === personal.pov }">
			<span class="colourSwatch" :style="{ backgroundColor: personal.getCorrectedColourHex(player.colour) }"></span>
			<span class="playerName">{{ player.displayName }}</span>
			<span class="playerScore">{{ player.score }}</span>
		</div>
	</div>
</template>

<style scoped>
#playerTable {
	display: flex;
	justify-content: center;
	gap: 6px;
	padding: 6px;
}
.playerRow {
	display: flex;
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
	width: 14px;
	height: 14px;
	border: 1px solid black;
	display: inline-block;
}
.playerScore {
	font-weight: bold;
}
</style>
