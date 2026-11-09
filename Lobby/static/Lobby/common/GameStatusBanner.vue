<script setup>
import { readableTextColour } from "./statusBannerLabels.js"

defineProps({
	labels: { type: Object, required: true },
	phase: { type: String, default: "" },
	action: { type: String, default: "" },
	isMyTurn: { type: Boolean, default: false },
	isGameOver: { type: Boolean, default: false },
	isReplay: { type: Boolean, default: false },
	player: { type: Object, default: null },
	currentNames: { type: String, default: "" },
})
</script>

<template>
	<div id="statusBanner" :class="{ myTurn: isMyTurn && !isReplay && !isGameOver, gameOver: isGameOver }" role="status" aria-live="polite">
		<span class="statusMeta">
			<span v-if="labels.turn">{{ labels.turn }}</span>
			<span v-if="phase" class="statusPhase"><template v-if="labels.turn"> · </template>{{ phase }}</span>
		</span>
		<span class="statusState">
			<template v-if="isReplay">{{ labels.replay }}</template>
			<template v-else-if="isGameOver">{{ labels.gameOver }}</template>
			<template v-else-if="isMyTurn">
				<span class="yourTurnBadge">{{ labels.yourTurn }}</span>
				<span v-if="action" class="statusAction">{{ action }}</span>
			</template>
			<template v-else-if="player">
				<span class="turnPlayerChip" :style="{ backgroundColor: player.background || '#555555', color: readableTextColour(player.background) }">{{ player.name }}</span>
				<span v-if="action" class="statusAction">{{ action }}</span>
			</template>
			<template v-else-if="currentNames">
				{{ labels.waitingFor }}
				<span v-if="action" class="statusAction"> · {{ action }}</span>
			</template>
			<template v-else>
				{{ labels.waitingNext }}
				<span v-if="action" class="statusAction"> · {{ action }}</span>
			</template>
		</span>
	</div>
</template>

<style scoped>
#statusBanner {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 4px 8px;
	background-color: #c4dff7;
	border-bottom: 1px solid #8bb8d8;
	color: #1a2f42;
	font-size: 15px;
	font-weight: bolder;
	text-align: center;
}
#statusBanner.myTurn {
	background-color: lightgreen;
}
#statusBanner.gameOver {
	background-color: lightgoldenrodyellow;
}
.statusMeta,
.statusState {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 6px;
}
.statusPhase {
	color: #1a4f73;
}
.statusState {
	color: #1a5c1a;
}
.yourTurnBadge {
	display: inline-block;
	background-color: darkgreen;
	color: white;
	border-radius: 10px;
	padding: 1px 8px;
	font-size: 0.9em;
}
.turnPlayerChip {
	display: inline-block;
	border: 1px solid black;
	padding: 1px 6px;
	font-weight: bold;
}
</style>
