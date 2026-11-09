<script setup>
/** History panel: recorded actions in the IND event/player/time/params shape. */
import { nextTick, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import * as view from "../js/ROWview"
import { useModelStore } from "../stores/ROWstore.js"

const { t } = useI18n()
const store = useModelStore()
const historyPanel = ref(null)
let previousFocus = null

watch(
	() => store.viewSettings.showHistory,
	(open) => {
		if (!open) return
		previousFocus = document.activeElement
		nextTick(() => historyPanel.value?.focus({ preventScroll: true }))
	},
	{ flush: "post" },
)

function close() {
	store.viewSettings.showHistory = false
	nextTick(() => {
		if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
	})
}

onBeforeUnmount(() => {
	previousFocus = null
})
</script>

<template>
	<div
		v-if="store.viewSettings.showHistory"
		id="historyTab"
		ref="historyPanel"
		tabindex="-1"
		role="region"
		:aria-label="t('topMenu.history')"
		@keydown.esc.stop.prevent="close"
	>
		<h3>{{ t('topMenu.history') }} <button class="actionsLineButton" @click="close">{{ t('panels.close') }}</button></h3>
		<div class="historyList">
			<div v-for="(h, i) in store.history" :key="i" class="historyEntry">
				<span class="hp">{{ h.player }}</span>
				<span class="ht">{{ view.humanizeAction(h.type) }}</span>
				<span v-if="h.params.length" class="hparams">{{ h.params.join(", ") }}</span>
			</div>
			<div v-if="store.history.length === 0" class="empty">{{ t('row.history.empty') }}</div>
		</div>
	</div>
</template>

<style scoped>
#historyTab {
	position: fixed;
	left: 2px;
	top: 88px;
	z-index: 9999;
	width: min(450px, calc(100vw - 4px));
	max-height: calc(100vh - 96px);
	overflow-y: auto;
	box-sizing: border-box;
	background: lightblue;
	border: 2px solid black;
	padding: 8px;
	text-align: center;
	outline: none;
}
#historyTab:focus-visible { outline: 2px solid #177daf; outline-offset: -2px; }
#historyTab h3 { display: flex; align-items: center; justify-content: center; gap: 8px; }
.historyList { max-height: 220px; overflow-y: auto; background: white; margin-bottom: 6px; text-align: left; }
.historyEntry { padding: 1px 4px; font-size: 12px; border-bottom: 1px solid #eee; }
.historyEntry .hp { font-weight: bold; margin-right: 6px; }
.historyEntry .hparams { color: #555; margin-left: 6px; }
.empty { color: #666; padding: 6px; }
</style>
