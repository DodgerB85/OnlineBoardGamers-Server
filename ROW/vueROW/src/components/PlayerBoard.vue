<script setup lang="ts">
import { computed } from "vue"
import { Worker, isCattleCard } from "../game"
import { useGameStore } from "../stores/game"

const store = useGameStore()
const ps = computed(() => {
	const g = store.game
	if (!g) return null
	try {
		return g.playerState(g.currentPlayer)
	} catch {
		return null
	}
})
const hand = computed(() => ps.value?.hand ?? [])
</script>

<template>
	<div v-if="ps" id="playerBoard">
		<div class="row">
			<strong>{{ ps.player }}</strong> | ${{ ps.balance }} | certs {{ ps.tempCertificates }} | discs {{ ps.discs }}
		</div>
		<div class="row">
			workers: {{ Worker.COWBOY }} {{ ps.workers[Worker.COWBOY] }} / {{ Worker.CRAFTSMAN }} {{ ps.workers[Worker.CRAFTSMAN] }} / {{ Worker.ENGINEER }} {{ ps.workers[Worker.ENGINEER] }}
		</div>
		<div class="row">
			engine: {{ store.game?.getRailroadTrack().currentSpace(ps.player) }} | hand value {{ ps.handValue() }} | hand limit {{ ps.getHandLimit() }}
		</div>
		<div class="hand">
			<div v-for="(card, i) in hand" :key="i" class="card">
				<template v-if="isCattleCard(card)">{{ card.type }} v{{ card.value }} p{{ card.points }}</template>
				<template v-else>OBJ {{ card.id }}</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
#playerBoard { border: 2px solid #333; background: #eef7d8; margin: 8px; padding: 6px; text-align: center; }
.row { margin: 2px 0; font-size: 13px; }
.hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin-top: 4px; }
.card { border: 1px solid #333; background: white; padding: 4px 6px; font-size: 11px; }
</style>
