<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue"
import { useModelStore } from "../stores/URRstore.js"
import HistoryEntry from "./HistoryEntry.vue"
const store = useModelStore()
const newestFirst = ref(true)
const toggleNewestFirst = ref(true)
const INITIAL_ROWS = 60
const LOAD_ROWS = 60
const visibleCount = ref(INITIAL_ROWS)
let sortTimer = null
const historyPanel = ref(null)
let previousFocus = null
const orderedEntries = computed(() => {
	const entries = store.computedHistory.filter((entry) => !entry.hidden).map((entry) => ({ entry, index: entry.historyIndex }))
	return newestFirst.value ? entries.reverse() : entries
})
const visibleEntries = computed(() => orderedEntries.value.slice(0, visibleCount.value))
watch(newestFirst, () => {
	visibleCount.value = INITIAL_ROWS
	historyPanel.value?.scrollTo({ top: 0 })
}, { flush: "post" })
watch(toggleNewestFirst, (value) => {
	clearTimeout(sortTimer)
	sortTimer = setTimeout(() => { newestFirst.value = value }, 400)
})
onBeforeUnmount(() => clearTimeout(sortTimer))
watch(() => store.viewSettings.showHistory, (isOpen) => {
	if (!isOpen) return
	visibleCount.value = INITIAL_ROWS
	previousFocus = document.activeElement
	historyPanel.value.focus({ preventScroll: true })
}, { flush: "post" })

function loadMore() {
	if (visibleCount.value >= orderedEntries.value.length) return
	visibleCount.value = Math.min(orderedEntries.value.length, visibleCount.value + LOAD_ROWS)
}
function onScroll() {
	const panel = historyPanel.value
	if (!panel || panel.scrollTop + panel.clientHeight < panel.scrollHeight - 400) return
	loadMore()
}

function close() {
	store.viewSettings.showHistory = false
	store.clearHistoryHelpers()
	nextTick(() => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }) })
}
async function findReplayPosition() {
	const panel = historyPanel.value
	const position = orderedEntries.value.findIndex(({ index }) => index === store.replayStep.index)
	if (position >= visibleCount.value) {
		visibleCount.value = Math.min(orderedEntries.value.length, position + 1)
		await nextTick()
	}
	const entry = panel.querySelector(".currentReplay")
	if (!entry) return
	const availableHeight = panel.clientHeight - 16
	const gap = 8 + Math.max(0, (availableHeight - entry.offsetHeight) / 2)
	panel.scrollTo({ top: panel.scrollTop + entry.getBoundingClientRect().top - panel.getBoundingClientRect().top - gap })
}
</script>

<template>
	<transition name="fade">
		<div id="history" ref="historyPanel" v-if="store.viewSettings.showHistory" tabindex="-1" :aria-label="$t('historyTab.aria')" @scroll="onScroll" @keydown.esc.stop.prevent="close">
			<div class="historyControls"><div id="historyToggleDiv">
				<span>{{ $t("historyTab.oldestFirst") }}</span>
				<label class="switch"><input type="checkbox" v-model="toggleNewestFirst" :aria-label="$t('historyTab.newestFirst')" /><span class="slider round"></span></label>
				<span>{{ $t("historyTab.newestFirst") }}</span>
			</div>
			<p v-if="store.viewSettings.showReplay" class="replayHint"><span>{{ $t("historyTab.selectMove") }}</span><button @click="findReplayPosition">{{ $t("historyTab.findCurrent") }}</button></p></div>
			<div id="historyMainDiv">
				<HistoryEntry v-for="{ entry, index } in visibleEntries" :key="entry.historyKey" :entry="entry" :index="index" :newest-first="newestFirst" />
			</div>
		</div>
	</transition>
</template>

<style scoped>
#history { position: fixed; padding-top: 5px; left: 2px; top: var(--urr-menu-height, 60px); width: 450px; max-width: calc(100vw - 4px); max-height: calc(100vh - var(--urr-menu-height, 60px) - 12px); box-sizing: border-box; z-index: 9999; border: 2px solid black; background-color: #d4eafd; overflow-y: scroll; text-align: center; outline: none; }
#history { scroll-padding-bottom: 8px; }
.historyControls { background: #d4eafd; }
#historyToggleDiv { display: flex; align-items: center; justify-content: center; padding: 5px; background: #d4eafd; font-size: 16px; font-weight: 400; }
.switch { position: relative; display: inline-block; width: 60px; height: 34px; margin: 0 10px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: #2196f3; transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider:before { transform: translateX(26px); }
input:focus-visible + .slider { outline: 2px solid black; outline-offset: 2px; }
.replayHint { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; margin: 0; padding: 6px 8px; font-size: 16px; font-weight: bold; }.replayHint button { font: inherit; font-weight: normal; padding: 6px 8px; border: 1px solid #177daf; border-radius: 3px; background: #edf6fd; cursor: pointer; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 1050px) { .replayHint button { min-height: 40px; }.switch { height: 40px; }.slider { top: 3px; bottom: 3px; } }
</style>
