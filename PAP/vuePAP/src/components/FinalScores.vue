<script setup>
import { computed } from "vue"
import { useModelStore } from "../stores/PAPstore.js"
const store = useModelStore()

// Engine result (audit.js finalScores): rows by seat, finalPositions best first.
const rows = computed(() => {
	const r = store.viewGame.result
	return r ? r.finalPositions.map(seat => r.rows.find(row => row.seat === seat)) : []
})

function signed(n) {
	return n > 0 ? "+" + n : String(n)
}
</script>

<template>
	<div id="finalScores" v-if="store.viewGame.result">
		<h2>Final scores</h2>
		<div class="tableWrap">
			<table>
				<thead>
					<tr>
						<th>Player</th>
						<th>Profit</th>
						<th>Cauldron Tier</th>
						<th>Worked roster</th>
						<th>Cash</th>
						<th>Warnings</th>
						<th>Softer ending</th>
						<th>Total</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="row.seat" :class="{ winner: row.seat === store.viewGame.result.winner }">
						<td class="name">{{ row.name }}<span v-if="row.seat === store.viewGame.result.winner"> (winner)</span></td>
						<td>{{ signed(row.breakdown.profit) }}</td>
						<td>{{ signed(row.breakdown.tier) }}</td>
						<td>{{ signed(row.breakdown.staff) }}</td>
						<td>{{ signed(row.breakdown.cash) }}</td>
						<td>{{ signed(row.breakdown.warnings) }}</td>
						<td>{{ signed(row.breakdown.softer) }}</td>
						<td class="total">{{ row.vp }}</td>
						<td>{{ row.eligible ? "Eligible" : "Eliminated" }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
#finalScores {
	background-color: white;
	border: 2px solid #333;
	border-radius: 8px;
	margin: 10px auto;
	padding: 8px 12px;
	max-width: 800px;
	box-sizing: border-box;
}
#finalScores h2 { margin: 4px 0 8px; }
.tableWrap { overflow-x: auto; }
table { border-collapse: collapse; margin: 0 auto; font-size: 14px; }
th, td { border: 1px solid #bbb; padding: 4px 8px; text-align: center; white-space: nowrap; }
th { background-color: #eee; }
.name { text-align: left; }
.total { font-weight: bold; }
tr.winner { background-color: #dfffe0; font-weight: bold; }
</style>
