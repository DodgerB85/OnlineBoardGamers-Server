<script setup lang="ts">
/** Client-side replay bar: step through recorded turn-start frames, then exit. */
import { useGameStore } from "../stores/game"

const store = useGameStore()
</script>

<template>
	<div v-if="store.viewSettings.showReplay" id="replayPanel">
		<div class="replayBar">
			<button :disabled="store.replayIndex <= 0" @click="store.replayStep(-1)">◀ Back</button>
			<span class="frame">Frame {{ store.replayIndex + 1 }} / {{ store.replayFrames.length }}</span>
			<button :disabled="store.replayIndex >= store.replayFrames.length - 1" @click="store.replayStep(1)">Forward ▶</button>
			<button class="exit" @click="store.exitReplay()">Exit Replay</button>
		</div>
	</div>
</template>

<style scoped>
#replayPanel { position: fixed; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 80; }
.replayBar { display: flex; align-items: center; gap: 10px; background: #333; color: white; padding: 6px 14px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); }
.replayBar .frame { font-weight: bold; }
.replayBar button { cursor: pointer; padding: 3px 10px; }
.replayBar button:disabled { opacity: 0.4; cursor: default; }
.replayBar .exit { background: #f6d9c9; font-weight: bold; }
</style>
