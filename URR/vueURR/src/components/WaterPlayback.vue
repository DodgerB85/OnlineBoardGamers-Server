<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from "vue"
import * as boardDisplay from "../js/URRboardDisplay.js"
import { useWaterPlaybackStore } from "../stores/URRwaterPlayback.js"
const playback = useWaterPlaybackStore()
const step = computed(() => playback.current)
const position = (id) => boardDisplay.getAreaPosition(playback.state.board.areas.find((area) => area.id === id))
const points = computed(() => step.value.path.map(position).filter(Boolean))
const path = computed(() => {
	const positions = [...points.value]
	if (step.value.type === "source" && positions.length) positions.unshift({ x: positions[0].x, y: 0 })
	if (step.value.type === "river" && !step.value.to && positions.length) positions.push({ x: positions[0].x, y: boardDisplay.MAP_HEIGHT })
	return positions.length > 1 ? `M ${positions.map((point) => `${point.x} ${point.y}`).join(" L ")}` : ""
})
let timer = null
function schedule() {
	clearTimeout(timer)
	if (playback.state.advancing) timer = setTimeout(() => playback.next(), 1100)
}
function outsideInteract(event) {
	if (!event.target.closest(".waterPlayback")) playback.stop()
}
watch(() => [playback.state.index, playback.state.advancing], schedule)
onMounted(() => { schedule(); document.addEventListener("click", outsideInteract, true) })
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener("click", outsideInteract, true) })
</script>

<template>
	<div class="waterPlayback">
		<svg :viewBox="`0 0 ${boardDisplay.MAP_WIDTH} ${boardDisplay.MAP_HEIGHT}`" aria-label="Recorded water flow" @click.stop>
			<rect :width="boardDisplay.MAP_WIDTH" :height="boardDisplay.MAP_HEIGHT" fill="transparent" pointer-events="all" />
			<polygon v-for="id in step.wet" :key="id" :points="boardDisplay.hexPoints(position(id).x, position(id).y)" class="playbackWet" />
			<path v-if="path" :d="path" class="flowPath" />
			<circle v-if="path" :key="playback.state.index" r="12" class="waterDrop"><animateMotion :path="path" dur="1s" fill="freeze" /></circle>
			<g v-for="(point, index) in points" :key="index"><circle :cx="point.x" :cy="point.y" r="25" class="flowSite" /><text :x="point.x" :y="point.y + 7">{{ step.amount }}</text></g>
		</svg>
		<div class="waterPanel">
			<div role="status">{{ step.text }}</div>
			<div class="playbackControls"><button @click="playback.state.index = 0" :disabled="!playback.state.index">Start</button><button @click="playback.state.index--" :disabled="!playback.state.index">Previous</button><button @click="playback.state.advancing = !playback.state.advancing">{{ playback.state.advancing ? 'Pause' : 'Play' }}</button><button @click="playback.next()" :disabled="playback.atEnd">Next</button><button @click="playback.state.index = playback.state.steps.length - 1">End</button><span>{{ playback.state.index + 1 }} / {{ playback.state.steps.length }}</span><button @click="playback.stop()">Close</button></div>
		</div>
	</div>
</template>

<style scoped>
.waterPlayback { position: absolute; inset: 0; pointer-events: none; }.waterPlayback svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: auto; }.flowPath { fill: none; stroke: #00b8ed; stroke-width: 9; stroke-linecap: round; }.waterDrop { fill: #b9f5ff; stroke: #006b92; stroke-width: 3; }.flowSite { fill: #def5ff; stroke: #008cb3; stroke-width: 3; }text { text-anchor: middle; font-size: 23px; fill: #00435c; }.playbackWet { fill: #35d6ff; fill-opacity: .3; stroke: #008cb3; stroke-width: 3; }.waterPanel { position: absolute; bottom: 8px; left: 8px; right: 8px; padding: 8px; background: #fff9e9; border: 1px solid #177daf; border-radius: 4px; line-height: 1.3; text-align: left; font-size: 16px; pointer-events: auto; }.playbackControls { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 6px; }button { font: inherit; padding: 4px 7px; cursor: pointer; }@media (prefers-reduced-motion: reduce) { .waterDrop { display: none; } }
</style>
