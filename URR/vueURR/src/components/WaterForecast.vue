<script setup>
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import * as boardDisplay from "../js/URRboardDisplay.js"
import { useWaterForecastStore } from "../stores/URRwaterForecast.js"
const forecast = useWaterForecastStore()
const { t } = useI18n()
const step = computed(() => forecast.currentStep)
const position = (id) => {
	const area = forecast.state.game?.board.areas.find((entry) => entry.id === id)
	return area && boardDisplay.getAreaPosition(area)
}
const points = computed(() => (step.value?.path ?? []).map(position).filter(Boolean))
const routes = computed(() => (forecast.state.steps ?? []).map((entry) => (entry.path ?? []).map(position).filter(Boolean)).filter((route) => route.length > 1).map((route) => route.map((point) => `${point.x},${point.y}`).join(" ")))
const blob = computed(() => points.value.at(-1))
const waitingText = (id) => {
	const area = forecast.state.game?.board.areas.find((entry) => entry.id === id)
	return t(!area?.isRiver ? "waterPlayback.toReturn" : area.waterwork ? "waterPlayback.toContinue" : "waterPlayback.atJunction")
}
</script>

<template>
	<div class="waterForecast" @click.stop>
		<svg :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" :aria-label="$t('forecast.title')">
			<rect :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" fill="transparent" pointer-events="all" />
			<polygon v-for="id in step?.wet ?? []" :key="id" :points="boardDisplay.hexPoints(position(id).x, position(id).y)" class="forecastWet" />
			<polyline v-for="(route, index) in routes" :key="index" :points="route" class="forecastPath" />
			<g v-for="water in step?.waitingWater ?? []" :key="water.area" :transform="`translate(${position(water.area).x} ${position(water.area).y - 36})`" class="forecastWaiting">
				<title>{{ $t("waterPlayback.waiting", { amount: water.amount, where: waitingText(water.area) }) }}</title>
				<rect x="-24" y="-18" width="48" height="36" rx="18" />
				<text y="7">{{ water.amount }}</text>
			</g>
			<g v-if="blob && step?.amount" :transform="`translate(${blob.x} ${blob.y})`" class="forecastBlob">
				<path d="M -25 1 C -27 -15 -13 -25 2 -24 C 18 -25 29 -12 27 3 C 27 20 11 26 -4 24 C -20 25 -28 15 -25 1 Z" />
				<text y="7">{{ step.amount }}</text>
			</g>
		</svg>
	</div>
</template>

<style scoped>
.waterForecast { position: absolute; inset: 0; pointer-events: none; }.waterForecast svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: auto; }
.forecastWet { fill: #35d6ff; fill-opacity: .3; stroke: #008cb3; stroke-width: 3; pointer-events: none; }
.forecastPath { fill: none; stroke: #64d6ee; stroke-opacity: .5; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
.forecastWaiting rect { fill: #8be4f6; stroke: #007fa5; stroke-width: 2; }.forecastWaiting text, .forecastBlob text { text-anchor: middle; font-size: 22px; font-weight: bold; fill: #00435c; }
.forecastBlob path { fill: #8be4f6; stroke: #007fa5; stroke-width: 2; filter: drop-shadow(0 3px 3px #00435c55); }
</style>
