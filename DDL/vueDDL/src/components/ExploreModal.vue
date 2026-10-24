<script setup>
import { computed } from "vue"
import * as rf from "../js/DDLreference.js"
import * as controller from "../js/DDLcontroller.js"
import * as funcs from "../js/DDLfuncs.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

const pending = computed(() => store.gameflow.pendingExplore)
const visible = computed(() => store.viewSettings.showExplore && pending.value && (pending.value.player === personal.pov || personal.trainingGame))
const options = computed(() => {
	const result = []
	for (let col = 0; col < store.board.consumerSlots.length; col++) {
		const slots = store.board.consumerSlots[col]
		let tileId = null
		for (const id of slots) {
			if (id !== null) {
				tileId = id
				break
			}
		}
		if (tileId !== null) {
			const tile = rf.CONSUMER_TILES.find((t) => t.id === tileId)
			result.push({ column: col, tile })
		}
	}
	return result
})

async function choose(column) {
	await controller.explore(column)
}
</script>

<template>
	<div v-if="visible" class="modalOverlay">
		<div class="modalBox">
			<h2>{{ $t("explore.title") }}</h2>
			<p>{{ $t("explore.intro") }}</p>
			<div class="choices">
				<button v-for="option in options" :key="option.column" class="choice" @click="choose(option.column)">
					<img :src="funcs.goodImage(option.tile.good)" :alt="rf.goodName(option.tile.good)" />
					<div><b>{{ rf.goodName(option.tile.good) }}</b></div>
					<div>{{ $t("explore.victoryPoints", { points: option.tile.points }) }}</div>
					<div class="col">{{ $t("explore.column", { number: option.column + 1 }) }}</div>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.modalOverlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 5000; pointer-events: none; }
.modalBox { background: #fffdf3; border: 3px solid #7a5b19; border-radius: 8px; padding: 18px; width: 520px; max-width: 90vw; text-align: center; pointer-events: auto; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
.choices { display: flex; gap: 12px; justify-content: center; margin-top: 10px; }
.choice { width: 180px; border: 2px solid #7a5b19; border-radius: 6px; background: #f5e7a8; padding: 10px; cursor: pointer; font-size: 13px; }
.choice:hover { background: #ffe680; }
.choice img { width: 64px; height: 64px; object-fit: contain; }
.col { font-size: 11px; color: #555; }
</style>
