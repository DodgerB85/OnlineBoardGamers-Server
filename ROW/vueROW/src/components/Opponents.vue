<script setup lang="ts">
import { useGameStore } from "../stores/game"

const store = useGameStore()
</script>

<template>
	<div id="opponents">
		<div v-for="p in store.state?.players ?? []" :key="p.name" class="opp">
			<b>{{ p.name }}</b>
			<span v-if="store.game"> ${{ store.game.playerState(p.name).balance }} · hand {{ store.game.playerState(p.name).hand.length }}</span>
		</div>
	</div>
</template>

<style scoped>
#opponents { display: flex; justify-content: center; gap: 8px; margin: 4px; font-size: 12px; }
.opp { border: 1px solid #888; border-radius: 4px; padding: 3px 8px; background: #eee; }
</style>
