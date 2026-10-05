<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue"
import { useModelStore } from "../stores/URRstore.js"
import HistoryEntry from "./HistoryEntry.vue"
const store = useModelStore()
const newestFirst = ref(true)
const toggleNewestFirst = ref(true)
let sortTimer = null
const historyPanel = ref(null)
let previousFocus = null
const orderedEntries = computed(() => {
	const entries = store.computedHistory.map((entry) => ({ entry, index: entry.historyIndex }))
	return newestFirst.value ? entries.reverse() : entries
})
watch(newestFirst, () => historyPanel.value?.scrollTo({ top: 0 }), { flush: "post" })
watch(toggleNewestFirst, (value) => {
	clearTimeout(sortTimer)
	sortTimer = setTimeout(() => { newestFirst.value = value }, 400)
})
onBeforeUnmount(() => clearTimeout(sortTimer))
watch(() => store.viewSettings.showHistory, (isOpen) => {
	if (!isOpen) return
	previousFocus = document.activeElement
	historyPanel.value.querySelector(".closeHistory").focus({ preventScroll: true })
}, { flush: "post" })

function close() {
	store.viewSettings.showHistory = false
	store.clearHistoryHelpers()
	nextTick(() => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }) })
}
function findReplayPosition() {
	const panel = historyPanel.value
	const entry = panel.querySelector(".currentReplay")
	if (!entry) return
	const controlsHeight = panel.querySelector(".historyControls").offsetHeight
	const availableHeight = panel.clientHeight - controlsHeight - 16
	const gap = 8 + Math.max(0, (availableHeight - entry.offsetHeight) / 2)
	panel.scrollTo({ top: panel.scrollTop + entry.getBoundingClientRect().top - panel.getBoundingClientRect().top - controlsHeight - gap })
}
</script>

<template>
	<transition name="fade">
		<div id="history" ref="historyPanel" v-if="store.viewSettings.showHistory" aria-label="Game history" @keydown.esc.stop.prevent="close">
			<div class="historyControls"><div id="historyToggleDiv">
				<span>Oldest First</span>
				<label class="switch"><input type="checkbox" v-model="toggleNewestFirst" aria-label="Newest first" /><span class="slider round"></span></label>
				<span>Newest First</span>
				<button class="closeHistory" @click="close" aria-label="Close history">×</button>
			</div>
			<p v-if="store.viewSettings.showReplay" class="replayHint"><span>Select a move to replay.</span><button @click="findReplayPosition">Find current move</button></p></div>
			<div id="historyMainDiv">
				<HistoryEntry v-for="{ entry, index } in orderedEntries" :key="entry.historyKey" :entry="entry" :index="index" :newest-first="newestFirst" />
			</div>
		</div>
	</transition>
</template>

<style scoped>
#history { position: absolute; padding-top: 5px; left: 2px; top: var(--urr-menu-height, 60px); width: 450px; max-height: calc(100vh - var(--urr-menu-height, 60px) - 12px); box-sizing: border-box; z-index: 9999; border: 2px solid black; background-color: #d4eafd; overflow-y: scroll; text-align: center; }
#history { scroll-padding-top: 60px; scroll-padding-bottom: 8px; }
.historyControls { position: sticky; top: 0; z-index: 1; background: #d4eafd; }
#historyToggleDiv { display: flex; align-items: center; justify-content: center; padding: 5px; background: #d4eafd; font-size: 13px; }
.switch { position: relative; display: inline-block; width: 60px; height: 34px; margin: 0 10px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: #2196f3; transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider:before { transform: translateX(26px); }
input:focus-visible + .slider { outline: 2px solid black; outline-offset: 2px; }
.closeHistory { margin-left: auto; font-size: 22px; background: none; border: 0; cursor: pointer; }
.replayHint { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; margin: 0; padding: 6px 8px; font-size: 13px; font-weight: bold; }.replayHint button { font: inherit; font-weight: normal; padding: 6px 8px; border: 1px solid #177daf; border-radius: 3px; background: #edf6fd; cursor: pointer; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 1050px) { .closeHistory { min-width: 44px; min-height: 44px; padding: 0; }.replayHint button { min-height: 40px; }.switch { height: 40px; }.slider { top: 3px; bottom: 3px; } }
</style>
