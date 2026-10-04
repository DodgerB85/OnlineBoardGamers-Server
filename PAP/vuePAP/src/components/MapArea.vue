<script setup>
import * as controller from "../js/PAPcontroller"
import * as IO from "../backend/PAP_IO"
import { useModelStore } from "../stores/PAPstore.js"
import { usePersonalStore } from "../stores/PAPpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

function currentPlayerName() {
	const idx = store.gameflow.turnOrder[0]
	if (idx === undefined || idx === -1 || !store.players[idx]) return "-"
	return store.players[idx].displayName
}

function endTurn() {
	controller.endPlayerTurn()
}

function endGame() {
	if (!window.confirm("End the game now and mark the current leader as the winner?")) return
	store.gameflow.phase = 2
	const leader = [...store.players].sort((a, b) => b.score - a.score)[0]
	if (!leader) return
	IO.saveGame(false)
}
</script>

<template>
	<div id="mapArea">
		<div class="boardPlaceholder">
			<h2>Permits and Poisons</h2>
			<p>The game board will be rendered here.</p>
			<p class="turnLine">Turn {{ store.gameflow.turn }} &mdash; it is <b>{{ currentPlayerName() }}</b>'s move.</p>
		</div>
		<div class="controls">
			<template v-if="personal.canPlay()">
				<button class="actionsLineButton" @click="endTurn">End Turn</button>
			</template>
			<template v-else-if="personal.pov >= 0">
				<span>Waiting for {{ currentPlayerName() }}...</span>
			</template>
			<template v-if="personal.pov >= 0 && store.gameflow.phase === 1">
				<button class="actionsLineButton" @click="endGame">End Game</button>
			</template>
		</div>
	</div>
</template>

<style scoped>
#mapArea {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 10px;
}
.boardPlaceholder {
	width: 700px;
	height: 400px;
	border: 4px solid #333;
	border-radius: 8px;
	background-color: #f4f7d7;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
}
.turnLine { font-size: 18px; }
.controls { margin-top: 8px; }
.actionsLineButton {
	margin: 10px;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 8px 16px;
	cursor: pointer;
}
.actionsLineButton:hover { background-color: lightgrey; }
</style>
