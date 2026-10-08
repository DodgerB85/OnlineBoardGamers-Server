<script setup>
/**
 * End-of-game results: standings, totals, ties and a per-category scoring
 * breakdown (ported from the reference ended-dialog).
 */
import { computed } from "vue"
import { useModelStore } from "../stores/ROWstore.js"

const store = useModelStore()

const game = computed(() => {
	store.version
	return store.game
})
const ended = computed(() => game.value?.isEnded() ?? false)
const ranking = computed(() => (game.value && ended.value ? game.value.ranking() : []))
const winners = computed(() => {
	const r = ranking.value
	if (r.length === 0) return new Set()
	const top = game.value.getScore(r[0])
	return new Set(r.filter((n) => game.value.getScore(n) === top))
})

function score(name) {
	return game.value?.getScore(name) ?? 0
}
function details(name) {
	const d = game.value?.scoreDetails(name) ?? {}
	return Object.entries(d)
		.map(([k, v]) => [k, v ?? 0])
		.filter(([, v]) => v !== 0)
}
</script>

<template>
	<div v-if="ended" id="endedDialog">
		<h2>Game over</h2>
		<table>
			<thead>
				<tr><th>#</th><th>Player</th><th>Total</th><th>Breakdown</th></tr>
			</thead>
			<tbody>
				<tr v-for="(p, i) in ranking" :key="p" :class="{ winner: winners.has(p) }">
					<td>{{ i + 1 }}</td>
					<td>{{ p }}<span v-if="winners.has(p)"> 🏆</span></td>
					<td class="total">{{ score(p) }}</td>
					<td class="cats">
						<span v-for="([k, v], j) in details(p)" :key="j" class="cat">{{ k }}: {{ v }}</span>
					</td>
				</tr>
			</tbody>
		</table>
		<div v-if="winners.size > 1" class="tie">Tie between {{ [...winners].join(", ") }}</div>
	</div>
</template>

<style scoped>
#endedDialog {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	z-index: 100;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
#endedDialog h2 { color: white; }
table { background: #fffde8; border-collapse: collapse; min-width: 520px; }
th, td { border: 1px solid #888; padding: 4px 8px; text-align: left; font-size: 14px; }
tr.winner { background: #fff3b0; font-weight: bold; }
td.total { text-align: right; font-weight: bold; }
.cats { max-width: 420px; }
.cat { display: inline-block; margin-right: 8px; font-size: 12px; color: #333; }
.tie { color: #ffe08a; font-weight: bold; margin-top: 8px; }
</style>
