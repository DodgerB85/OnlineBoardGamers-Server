<script setup lang="ts">
import { computed } from "vue"
import { useGameStore } from "../stores/game"
import { boardImage, editionImage } from "../view/assets"

const store = useGameStore()
const game = computed(() => store.game ?? null)

const locations = computed(() => {
	const g = game.value
	if (!g) return []
	const out: { name: string; label: string; players: string[] }[] = []
	for (const loc of g.getTrail().locations.values()) {
		if (loc.kind === "START") continue
		let label = loc.name
		if (loc.building) label += ` [${loc.building.name}]`
		if (loc.hazard) label += ` ⚠${loc.hazard.points}`
		if (loc.teepee) label += ` ⛺${loc.def.reward}`
		const players = Object.entries(g.getTrail().playerLocations)
			.filter(([, l]) => l === loc.name)
			.map(([p]) => p)
		out.push({ name: loc.name, label, players })
	}
	return out
})

const board = computed(() => (game.value ? boardImage(game.value.edition) : ""))
</script>

<template>
	<div id="trailBoard">
		<img class="board" :src="board" alt="ROW board" />
		<div class="overlay">
			<div v-for="loc in locations" :key="loc.name" class="loc" :class="{ occupied: loc.players.length > 0 }">
				<b>{{ loc.label }}</b>
				<span v-if="loc.players.length"> — {{ loc.players.join(", ") }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
#trailBoard { position: relative; display: inline-block; margin: 8px; }
.board { width: 560px; border: 2px solid #333; }
.overlay { position: absolute; top: 0; left: 0; text-align: left; font-size: 10px; background: rgba(255, 255, 255, 0.75); max-height: 100%; overflow-y: auto; padding: 4px; }
.loc.occupied { color: darkred; font-weight: bold; }
</style>
