<script setup>
/**
 * End-of-game results: standings, totals, ties and a per-category scoring
 * breakdown (ported from the reference ended-dialog).
 */
import { computed, ref } from "vue"
import { useModelStore } from "../stores/ROWstore.js"
import { City } from "../js/ROWreference"

const store = useModelStore()

const dismissed = ref(false)
const nextURL = String(window.initData?.nextURL ?? "")

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

/** Per-player detailed statistics (mirrors the reference stats table). */
const stats = computed(() => {
	const g = game.value
	if (!g || !ended.value) return []
	const names = g.state.players.map((p) => p.name)
	const n = names.length
	return names.map((name) => {
		const ps = g.playerState(name)
		const psStops = ps.stops ?? {}
		const deliveries = {}
		for (const city of Object.values(City)) deliveries[city] = g.getRailroadTrack().numberOfDeliveries(name, city)
		let teepeeStops = 0
		let hazardStops = 0
		let buildingStops = 0
		for (const [locName, loc] of g.getTrail().locations) {
			const count = psStops[locName] ?? 0
			if (!count) continue
			if (loc.teepee) teepeeStops += count
			else if (loc.hazard) hazardStops += count
			else if (loc.building) buildingStops += count
		}
		return {
			name,
			seat: names.indexOf(name) + 1,
			turns: ps.turns ?? 0,
			cowboys: ps.getNumberOfCowboys(),
			craftsmen: ps.getNumberOfCraftsmen(),
			engineers: ps.getNumberOfEngineers(),
			stepLimit: ps.getStepLimit(n),
			handLimit: ps.getHandLimit(),
			permCerts: ps.permanentCertificates(),
			tempCerts: ps.tempCertificates,
			tempCertLimit: ps.getTempCertificateLimit(),
			deliveries,
			buildingStops,
			teepeeStops,
			hazardStops,
		}
	})
})
const STAT_ROWS = [
	["Seat", "seat"],
	["Turns", "turns"],
	["Cowboys", "cowboys"],
	["Craftsmen", "craftsmen"],
	["Engineers", "engineers"],
	["Step limit", "stepLimit"],
	["Hand limit", "handLimit"],
	["Permanent certificates", "permCerts"],
	["Temporary certificates", "tempCerts"],
	["Certificate limit", "tempCertLimit"],
	["Stops at buildings", "buildingStops"],
	["Stops at teepees", "teepeeStops"],
	["Stops at hazards", "hazardStops"],
]
</script>

<template>
	<div v-if="ended && !dismissed" id="endedDialog">
		<h2>Game over</h2>
		<div class="dialog-actions">
			<a v-if="nextURL" class="ended-action" :href="nextURL">Next game</a>
			<button class="ended-action" @click="dismissed = true">Close</button>
		</div>
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

		<h3>Detailed results</h3>
		<table>
			<thead>
				<tr>
					<th></th>
					<th v-for="s in stats" :key="s.name">{{ s.name }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="[label, key] in STAT_ROWS" :key="key">
					<th>{{ label }}</th>
					<td v-for="s in stats" :key="s.name + key">{{ s[key] }}</td>
				</tr>
				<tr v-for="city in Object.keys(stats[0]?.deliveries ?? {})" :key="city">
					<th>Deliveries to {{ city }}</th>
					<td v-for="s in stats" :key="s.name + city">{{ s.deliveries[city] }}</td>
				</tr>
			</tbody>
		</table>
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
.dialog-actions { display: flex; gap: 10px; margin-bottom: 10px; }
.ended-action { padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer; background: #ffd400; color: #222; text-decoration: none; font-size: 14px; }
.ended-action:hover { background: #ffe680; }
</style>
