<script setup>
/**
 * Player-order bidding panel (ported from the reference `gwt-bidding` component).
 * Each row is a seat (starting balance 6+i dollars); each column is a bid of
 * `points` VPs. A cell is bid-able when it beats the current best bid for that seat.
 */
import { computed } from "vue"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import { useModelStore } from "../stores/ROWstore.js"

const { ActionType, Status } = rf
const store = useModelStore()

const game = () => store.game
const bidding = computed(() => game()?.state?.status === Status.BIDDING)
const canBid = computed(() => bidding.value && controller.canAct())
const playerCount = computed(() => game()?.state?.playerOrder?.length ?? 0)

const bids = computed(() => {
	const g = game()
	if (!g) return []
	return g.state.players.map((p) => {
		const b = g.playerState(p.name).bid
		return { player: p.name, position: b ? b.position : null, points: b ? b.points : null }
	})
})
const columns = computed(() => {
	const max = bids.value.reduce((m, b) => Math.max(m, b.points ?? 0), 0)
	return Math.max(6, max + playerCount.value)
})
const rows = computed(() => {
	const cols = columns.value
	return Array.from({ length: playerCount.value }, (_, position) => {
		const contesting = bids.value.filter((b) => b.position === position)
		const min = contesting.reduce((m, b) => Math.max(m, b.points ?? 0), -1)
		return {
			position,
			cells: Array.from({ length: cols }, (_, points) => ({
				points,
				players: contesting.filter((b) => b.points === points).map((b) => b.player),
				selectable: points > min,
			})),
		}
	})
})

function placeBid(position, points) {
	if (!canBid.value) return
	controller.perform({ type: ActionType.PLACE_BID, position, points })
}
</script>

<template>
	<div v-if="bidding" id="biddingArea">
		<div class="title">Bidding for turn order — bid VPs (the higher the bid, the earlier you play; a bid costs its value in VP)</div>
		<table>
			<thead>
				<tr>
					<th>Seat</th>
					<th v-for="p in columns" :key="p">-{{ p }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in rows" :key="row.position">
					<th>#{{ row.position + 1 }}</th>
					<td v-for="cell in row.cells" :key="cell.points">
						<button v-if="canBid && cell.selectable" class="bid" @click="placeBid(row.position, cell.points)">Bid</button>
						<span v-for="p in cell.players" :key="p" class="marker" :title="p">{{ p }}</span>
					</td>
				</tr>
			</tbody>
		</table>
		<div v-if="!canBid" class="wait">Waiting for the other players to bid…</div>
	</div>
</template>

<style scoped>
#biddingArea { margin: 8px auto; max-width: 900px; background: #fffde8; border: 1px solid #888; border-radius: 6px; padding: 8px; overflow-x: auto; }
.title { font-weight: bold; font-size: 13px; margin-bottom: 6px; }
table { border-collapse: collapse; margin: 0 auto; }
th, td { border: 1px solid #aaa; padding: 2px 4px; font-size: 12px; text-align: center; min-width: 32px; }
td { height: 26px; }
.bid { font-size: 11px; padding: 1px 4px; cursor: pointer; }
.marker { display: inline-block; background: #d0e8ff; border-radius: 3px; padding: 0 3px; margin: 0 1px; }
.wait { margin-top: 6px; font-style: italic; color: #555; }
</style>
