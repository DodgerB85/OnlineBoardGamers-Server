<script setup>
import { useModelStore } from "../stores/LBRstore.js";
import * as model from "../js/LBRmodel.js";
import { scoreRows } from "../js/LBRview.js";

const store = useModelStore();

function standings() {
	return store.game?.standings || { rows: [], winners: [] };
}
</script>

<template>
	<div v-if="store.game && store.game.gameOver" class="panel game-over">
		<h2>Game over</h2>
		<p>The final scores are now visible.</p>
		<table>
			<thead>
				<tr>
					<th>Place</th>
					<th>Player</th>
					<th>Final score</th>
					<th>Colours</th>
					<th>Treasures</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, index) in standings().rows" :key="row.seat" :class="{ winner: standings().winners.includes(row.seat) }">
					<td>{{ index + 1 }}</td>
					<td>
						{{ model.seatName(row.seat) }}
						<span v-if="standings().winners.includes(row.seat)" class="crown">★</span>
					</td>
					<td>{{ row.score }}</td>
					<td class="colours">
						<span v-for="c in scoreRows(row.scores)" :key="c.colour" class="cube" :class="`c-${c.colour}`">{{ c.value }}</span>
					</td>
					<td>{{ row.treasures }}</td>
				</tr>
			</tbody>
		</table>
		<p class="note">Winner: {{ standings().winners.map(model.seatName).join(", ") }}. Ties on the final score share the win.</p>
	</div>
</template>

<style scoped>
.game-over table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
}

th,
td {
	border-bottom: 1px solid rgba(102, 57, 49, 0.3);
	padding: 4px;
	text-align: left;
}

tr.winner {
	background: #fbf23655;
	font-weight: bold;
}

.crown {
	color: #ac3232;
}

.colours {
	display: flex;
	gap: 3px;
}

.cube {
	display: inline-block;
	width: 18px;
	text-align: center;
	color: #fff6d8;
	border: 1px solid #663931;
	border-radius: 2px;
}

.c-R {
	background: #ac3232;
}
.c-B {
	background: #5b6ee1;
}
.c-G {
	background: #388900;
}
.c-K {
	background: #242327;
}

.note {
	font-size: 12px;
	opacity: 0.8;
}
</style>
