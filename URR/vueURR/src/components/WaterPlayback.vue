<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue"
import * as boardDisplay from "../js/URRboardDisplay.js"
import { useWaterPlaybackStore } from "../stores/URRwaterPlayback.js"
const playback = useWaterPlaybackStore()
const svg = ref(null)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
const step = computed(() => playback.current)
const position = (id) => boardDisplay.getAreaPosition(playback.state.board.areas.find((area) => area.id === id))
const points = computed(() => step.value.path.map(position).filter(Boolean))
const path = computed(() => {
	const positions = [...points.value]
	if (step.value.type === "source" && positions.length) positions.unshift({ x: positions[0].x, y: 0 })
	if (step.value.type === "river" && !step.value.to && positions.length) positions.push({ x: positions[0].x, y: boardDisplay.MAP_HEIGHT })
	if (positions.length < 2) return ""
	let curve = `M ${positions[0].x} ${positions[0].y}`
	for (let index = 0; index < positions.length - 1; index++) {
		const from = positions[index], to = positions[index + 1]
		const before = positions[index - 1] || from, after = positions[index + 2] || to
		const bowX = positions.length === 2 ? (from.y - to.y) * .12 : 0
		const bowY = positions.length === 2 ? (to.x - from.x) * .12 : 0
		curve += ` C ${from.x + (to.x - before.x) / 6 + bowX} ${from.y + (to.y - before.y) / 6 + bowY}, ${to.x - (after.x - from.x) / 6 + bowX} ${to.y - (after.y - from.y) / 6 + bowY}, ${to.x} ${to.y}`
	}
	return curve
})
const blobPosition = computed(() => {
	const point = points.value.at(-1)
	return point && (!path.value || reducedMotion) ? `translate(${point.x} ${point.y})` : undefined
})
let timer = null
function schedule() {
	clearTimeout(timer)
	if (playback.state.advancing) timer = setTimeout(() => playback.next(), 1750)
}
function outsideInteract(event) {
	if (!event.target.closest(".waterPlayback")) playback.stop()
}
watch(() => [playback.state.index, playback.state.advancing], schedule)
watch(() => playback.state.advancing, (advancing) => nextTick(() => {
	if (advancing) svg.value?.unpauseAnimations()
	else svg.value?.pauseAnimations()
}))
onMounted(() => { schedule(); document.addEventListener("click", outsideInteract, true) })
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener("click", outsideInteract, true) })
</script>

<template>
	<div class="waterPlayback">
		<svg ref="svg" :key="playback.state.index" :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" aria-label="Recorded water flow" @click.stop>
			<defs><radialGradient id="waterBlobFill" cx="35%" cy="25%" r="75%"><stop offset="0" stop-color="#e1fbff" /><stop offset=".55" stop-color="#8be4f6" /><stop offset="1" stop-color="#27b5dc" /></radialGradient></defs>
			<rect :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" fill="transparent" pointer-events="all" />
			<polygon v-for="id in step.wet" :key="id" :points="boardDisplay.hexPoints(position(id).x, position(id).y)" class="playbackWet" />
			<path v-if="path" :d="path" class="flowPath" />
			<g v-if="points.length" :transform="blobPosition" class="waterTransit">
				<animateMotion v-if="path && !reducedMotion" :path="path" dur="1.45s" calcMode="spline" keyTimes="0;1" keySplines=".35 0 .25 1" fill="freeze" />
				<g class="waterBlob" :class="{ paused: !playback.state.advancing }">
					<path d="M -25 1 C -27 -15 -13 -25 2 -24 C 18 -25 29 -12 27 3 C 27 20 11 26 -4 24 C -20 25 -28 15 -25 1 Z" />
					<ellipse cx="-9" cy="-13" rx="8" ry="4" class="blobHighlight" />
					<text y="7">{{ step.amount }}</text>
				</g>
			</g>
		</svg>
		<div class="waterPanel">
			<div role="status">{{ step.text }}</div>
			<div class="playbackControls"><button @click="playback.state.index = 0" :disabled="!playback.state.index">Start</button><button @click="playback.state.index--" :disabled="!playback.state.index">Previous</button><button @click="playback.state.advancing = !playback.state.advancing">{{ playback.state.advancing ? 'Pause' : 'Play' }}</button><button @click="playback.next()" :disabled="playback.atEnd">Next</button><button @click="playback.state.index = playback.state.steps.length - 1">End</button><span>{{ playback.state.index + 1 }} / {{ playback.state.steps.length }}</span><button @click="playback.stop()">Close</button></div>
		</div>
	</div>
</template>

<style scoped>
.waterPlayback { position: absolute; inset: 0; pointer-events: none; }.waterPlayback svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: auto; }.flowPath { fill: none; stroke: #64d6ee; stroke-opacity: .4; stroke-width: 5; stroke-linecap: round; }.waterBlob { animation: waterBob 2.8s ease-in-out infinite; filter: drop-shadow(0 3px 3px #00435c55); }.waterBlob.paused { animation-play-state: paused; }.waterBlob path { fill: url(#waterBlobFill); stroke: #007fa5; stroke-width: 2; }.blobHighlight { fill: #fff; opacity: .65; }text { text-anchor: middle; font-size: 22px; font-weight: bold; fill: #00435c; }@keyframes waterBob { 0%, 100% { transform: translateY(-2px) scale(1, 1); } 50% { transform: translateY(3px) scale(1.035, .965); } }.playbackWet { fill: #35d6ff; fill-opacity: .3; stroke: #008cb3; stroke-width: 3; }.waterPanel { position: absolute; bottom: 8px; left: 8px; right: 8px; padding: 8px; background: #fff9e9; border: 1px solid #177daf; border-radius: 4px; line-height: 1.3; text-align: left; font-size: 16px; pointer-events: auto; }.playbackControls { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 6px; }button { font: inherit; padding: 4px 7px; cursor: pointer; }@media (prefers-reduced-motion: reduce) { .waterBlob { animation: none; } }
</style>
