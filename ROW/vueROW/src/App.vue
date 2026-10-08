<script setup lang="ts">
import { computed } from "vue"
import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import ActionBar from "./components/ActionBar.vue"
import TrailBoard from "./components/TrailBoard.vue"
import PlayerBoard from "./components/PlayerBoard.vue"
import CattleMarket from "./components/CattleMarket.vue"
import ObjectivesMarket from "./components/ObjectivesMarket.vue"
import EndedDialog from "./components/EndedDialog.vue"
import ReplayPanel from "./components/ReplayPanel.vue"
import DebugArea from "./components/DebugArea.vue"
import FooterBar from "./components/FooterBar.vue"
import { useGameStore } from "./stores/game"
import { usePersonalStore } from "./stores/personal"
import { initGame } from "./composables/useGame"

const store = useGameStore()
const personal = usePersonalStore()

initGame()

const boardPlayers = computed(() => {
	store.version
	const g = store.game
	if (!g) return []
	const order = g.state.playerOrder.length ? g.state.playerOrder : g.state.players.map((p) => p.name)
	// Own board first (matching the reference layout), then the others.
	const me = order.find((n) => n === personal.name) ?? order[0]
	return [me, ...order.filter((n) => n !== me)]
})

function showDebug() {
	return personal.name === "admin" || personal.name === "BotKickStarter"
}
</script>

<template>
	<TopMenu />
	<div id="wholeMiddleArea">
		<TopMenuViews />
		<ActionBar />
		<div id="mainArea" :style="{ zoom: personal.zoom / 16 }">
			<div id="leftColumn">
				<TrailBoard />
				<CattleMarket />
				<ObjectivesMarket />
			</div>
			<div id="playerBoards">
				<PlayerBoard v-for="p in boardPlayers" :key="p" :playerName="p" />
			</div>
		</div>
		<DebugArea v-if="showDebug()" />
	</div>
	<EndedDialog />
	<ReplayPanel />
	<FooterBar />
</template>

<style>
body { margin: 0 !important; background-color: #d4eafd; font-family: Arial, sans-serif; font-size: 15px; }
#wholeMiddleArea { min-height: 500px; text-align: center; }
#mainArea { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px; }
#leftColumn { display: flex; flex-direction: column; align-items: center; flex: 0 1 780px; min-width: 0; }
#playerBoards { display: flex; flex-direction: column; align-items: center; flex: 1 1 360px; min-width: 300px; max-width: 46%; }
</style>
