<script setup>
/**
 * Admin panel showing what the FcmAI is currently doing and why.
 *
 * Driven entirely by store.aiThinking, which FCM_AI.js fills in via
 * aiDebug.think() at the point where a decision is complete but nothing has been
 * written to the model yet. With "Pause on AI" on, the bot is parked there until
 * this panel's button is pressed, so the reasoning and the board heat map can be
 * read before the move lands.
 */
import { computed } from "vue"
import * as aiDebug from "../js/AI/aiDebug"
import { W_SAME_TILE_HOUSE, W_ADJACENT_TILE_HOUSE, W_DRIVE_THRU, W_TILE_BOUNDARY, W_OVERPASS_DUAL_NETWORK, W_NO_ROAD_EXIT } from "../js/AI/restaurantHeatMap"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

const t = store.aiThinking

const hasThinking = computed(() => t.summary !== "" || t.reasons.length > 0 || t.heatMap.length > 0)

// Scores relative to the best in the map, for the bar chart in the panel.
const ranked = computed(() =>
	[...t.heatMap]
		.filter((h) => h.rotation === t.heatMapRotation)
		.sort((a, b) => b.score - a.score)
		.slice(0, 8),
)

const bestScore = computed(() => (ranked.value.length > 0 ? ranked.value[0].score : 0))

function barWidth(score) {
	if (bestScore.value <= 0) return "0%"
	return Math.max(2, Math.round((score / bestScore.value) * 100)) + "%"
}

function chosenBreakdown(chosen) {
	if (!chosen || !chosen.breakdown) return ""
	const b = chosen.breakdown
	const bits = []
	if (b.sameTileHouses) bits.push(b.sameTileHouses + " same-tile house x" + W_SAME_TILE_HOUSE)
	if (b.adjacentTileHouses) bits.push(b.adjacentTileHouses + " next-tile house x" + W_ADJACENT_TILE_HOUSE)
	if (b.driveThru) bits.push("drive-thru x" + W_DRIVE_THRU)
	if (b.tileBoundaries) bits.push(b.tileBoundaries + " tile boundary x" + W_TILE_BOUNDARY)
	else bits.push("NO road exit off this tile " + W_NO_ROAD_EXIT)
	if (b.overpassDualNetwork) bits.push("door touches both flyover networks x" + W_OVERPASS_DUAL_NETWORK)
	else if (b.entranceNetworks > 1) bits.push("door touches " + b.entranceNetworks + " networks")
	return bits.join(" + ")
}

function close() {
	aiDebug.closePanel()
}
</script>

<template>
	<div id="aiDebugPanel">
		<div id="aiDebugHeader">
			<h3>AI Debug <span v-if="t.waiting" class="aiWaiting">- PAUSED, waiting for you</span></h3>
			<button class="actionsLineButton" @click="close">Close</button>
		</div>

		<div v-if="!hasThinking" class="aiEmpty">No AI decision recorded yet.</div>

		<template v-else>
			<div class="aiLine">
				<strong>Turn {{ t.turn }}</strong> - {{ aiDebug.describePosition() }} - AI level {{ t.aiLevel }}
			</div>

			<div class="aiSummary">{{ t.summary }}</div>

			<div v-if="t.reasons.length > 0" class="aiReasons">
				<div v-for="(r, i) in t.reasons" :key="i" class="aiReason">{{ r }}</div>
			</div>

			<div v-if="t.chosen" class="aiChosen">
				<div><strong>Chosen:</strong> index {{ t.chosen.index }}, rotation {{ t.chosen.rotation }}, score {{ t.chosen.score }}</div>
				<div v-if="chosenBreakdown(t.chosen)" class="aiBreakdown">{{ chosenBreakdown(t.chosen) }}</div>
				<div class="aiHint">Scores are drawn on the board for rotation {{ t.heatMapRotation }}.</div>
			</div>

			<div v-if="ranked.length > 0" class="aiRanking">
				<h4>Best placements (rotation {{ t.heatMapRotation }})</h4>
				<div v-for="h in ranked" :key="h.x + ',' + h.y + ',' + h.rotation" class="aiRankRow" :class="{ aiPicked: h.index === t.chosen?.index }">
					<span class="aiRankName">{{ h.x }},{{ h.y }}</span>
					<span class="aiBarTrack"><span class="aiBar" :style="{ width: barWidth(h.score) }"></span></span>
					<span class="aiRankScore">{{ h.score }}</span>
				</div>
			</div>

			<div v-if="t.waiting" class="aiGate">
				<button class="actionsLineButton" @click="aiDebug.resume()">End Turn - let the AI play this</button>
				<span class="aiGateHint">The AI is stopped here until you click.</span>
			</div>
		</template>
	</div>
</template>

<style scoped>
#aiDebugPanel {
	position: fixed;
	right: 10px;
	bottom: 10px;
	z-index: 500;
	width: 340px;
	max-height: 70vh;
	overflow-y: auto;
	padding: 8px 10px;
	background-color: #fffde7;
	border: 2px solid #ff8f00;
	border-radius: 6px;
	font-size: 12px;
	text-align: left;
}

#aiDebugHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
}

#aiDebugHeader h3 {
	margin: 0;
	font-size: 14px;
}

.aiWaiting {
	color: #d84315;
	font-weight: bold;
}

.aiEmpty {
	padding: 8px 0;
	font-style: italic;
}

.aiLine {
	margin-top: 6px;
	color: #555;
}

.aiSummary {
	margin-top: 4px;
	font-weight: bold;
	font-size: 13px;
}

.aiReasons {
	margin: 4px 0 4px 10px;
}

.aiReason::before {
	content: "- ";
}

.aiChosen {
	margin-top: 6px;
	padding: 4px;
	background-color: #fff3e0;
	border-radius: 4px;
}

.aiBreakdown {
	color: #555;
}

.aiHint {
	margin-top: 2px;
	color: #777;
	font-style: italic;
}

.aiRanking h4 {
	margin: 8px 0 4px;
	font-size: 12px;
}

.aiRankRow {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 2px;
}

.aiRankName {
	width: 46px;
	color: #666;
}

.aiBarTrack {
	flex: 1;
	height: 9px;
	background-color: #eceff1;
	border-radius: 3px;
	overflow: hidden;
}

.aiBar {
	display: block;
	height: 100%;
	background-color: #ffb74d;
}

.aiPicked .aiBar {
	background-color: #2e7d32;
}

.aiPicked .aiRankName,
.aiPicked .aiRankScore {
	font-weight: bold;
	color: #2e7d32;
}

.aiRankScore {
	width: 34px;
	text-align: right;
}

.aiGate {
	margin-top: 10px;
}

.aiGateHint {
	margin-left: 6px;
	color: #777;
	font-style: italic;
}
</style>
