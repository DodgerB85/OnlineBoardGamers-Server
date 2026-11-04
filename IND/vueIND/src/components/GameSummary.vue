<template>
	<div v-if="store.topMenuViews.showGameSummary" id="gameSummaryOverlay">
		<div id="gameSummaryPanel">
			<div id="gameSummaryHeader">
				<span id="gameSummaryTitle">{{ $t('gameSummary.title') }}</span>
				<button id="gameSummaryClose" @click="store.topMenuViews.showGameSummary = false">{{ $t('gameSummary.close') }}</button>
			</div>
			<div v-if="generating" id="gameSummaryGenerating">{{ $t('gameSummary.generating') }}</div>
			<div v-else-if="!chartLibraryAvailable" id="gameSummaryGenerating">{{ $t('gameSummary.unavailable') }}</div>
			<template v-else>
				<div class="gameSummaryChart"><canvas id="gameSummaryCash"></canvas></div>
				<div class="gameSummaryChart"><canvas id="gameSummaryBank"></canvas></div>
				<div class="gameSummaryChart"><canvas id="gameSummaryTotal"></canvas></div>
				<div class="gameSummaryChart"><canvas id="gameSummaryIncome"></canvas></div>
			</template>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from "vue"

import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"
import * as replay from "../js/INDreplay"
import { buildGameSummarySeries } from "../js/INDgameSummary"
import i18n from "../i18n"

const store = useModelStore()
const personal = usePersonalStore()
const generating = ref(false)
const chartLibraryAvailable = ref(true)
let charts = []

watch(
	() => store.topMenuViews.showGameSummary,
	async (show) => {
		if (!show) {
			destroyCharts()
			return
		}
		generating.value = true
		// Replay data is the only source of money per turn that also works for hidden-money games
		if (store.replayData.length === 0) {
			const wasShowingReplay = store.topMenuViews.showReplay
			await replay.generateReplayData()
			store.topMenuViews.showReplay = wasShowingReplay
		}
		if (!store.topMenuViews.showGameSummary) return
		const series = buildGameSummarySeries(store.replayData, store.computedHistory)
		generating.value = false
		chartLibraryAvailable.value = Boolean(window.Chart)
		if (!chartLibraryAvailable.value) return
		await nextTick()
		drawCharts(series)
	},
)

onBeforeUnmount(destroyCharts)

function drawCharts(series) {
	destroyCharts()
	const labels = series.turns.map(String)
	const datasets = (perPlayer) =>
		store.players.map((player, p) => ({
			label: player.displayName,
			data: perPlayer[p],
			borderColor: personal.getCorrectedColourHex(player.colour),
			backgroundColor: personal.getCorrectedColourHex(player.colour),
			tension: 0.2,
		}))
	const addChart = (canvasId, title, perPlayer) => {
		charts.push(
			new window.Chart(document.getElementById(canvasId), {
				type: "line",
				data: { labels, datasets: datasets(perPlayer) },
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						title: { display: true, text: title },
						legend: { position: "bottom" },
					},
					scales: {
						x: { title: { display: true, text: i18n.global.t("gameSummary.turnAxis") } },
						y: { title: { display: true, text: i18n.global.t("gameSummary.moneyAxis") } },
					},
				},
			}),
		)
	}
	addChart("gameSummaryCash", i18n.global.t("gameSummary.cash"), series.cash)
	addChart("gameSummaryBank", i18n.global.t("gameSummary.bank"), series.bank)
	addChart("gameSummaryTotal", i18n.global.t("gameSummary.total"), series.total)
	addChart("gameSummaryIncome", i18n.global.t("gameSummary.income"), series.income)
}

function destroyCharts() {
	for (const chart of charts) chart.destroy()
	charts = []
}
</script>

<style>
#gameSummaryOverlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	z-index: 20000;
	display: flex;
	justify-content: center;
	align-items: flex-start;
}

#gameSummaryPanel {
	background: #d4eafd;
	border: 2px solid black;
	margin-top: 40px;
	padding: 15px;
	width: 90%;
	max-width: 900px;
	max-height: calc(100vh - 80px);
	overflow-y: auto;
	text-align: center;
}

#gameSummaryHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}

#gameSummaryTitle {
	font-size: 24px;
	font-weight: bold;
}

#gameSummaryGenerating {
	font-size: 18px;
	margin: 30px;
}

.gameSummaryChart {
	position: relative;
	height: 320px;
	margin-bottom: 20px;
}
</style>
