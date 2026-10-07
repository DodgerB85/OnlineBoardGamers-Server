<script setup lang="ts">
import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import ActionBar from "./components/ActionBar.vue"
import TrailBoard from "./components/TrailBoard.vue"
import PlayerBoard from "./components/PlayerBoard.vue"
import Opponents from "./components/Opponents.vue"
import DebugArea from "./components/DebugArea.vue"
import FooterBar from "./components/FooterBar.vue"
import { useGameStore } from "./stores/game"
import { usePersonalStore } from "./stores/personal"
import { initGame } from "./composables/useGame"

const store = useGameStore()
const personal = usePersonalStore()

initGame()

function showDebug() {
	return personal.name === "admin" || personal.name === "BotKickStarter"
}
</script>

<template>
	<TopMenu />
	<div id="wholeMiddleArea">
		<TopMenuViews />
		<Opponents />
		<ActionBar />
		<div id="mainArea">
			<TrailBoard />
			<PlayerBoard />
		</div>
		<DebugArea v-if="showDebug()" />
	</div>
	<FooterBar />
</template>

<style>
body { margin: 0 !important; background-color: #d4eafd; font-family: Arial, sans-serif; font-size: 15px; }
#wholeMiddleArea { min-height: 500px; text-align: center; }
#mainArea { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; }
</style>
