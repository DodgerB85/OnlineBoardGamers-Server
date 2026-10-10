<script setup>
/** History panel: recorded actions in the IND event/player/time/params shape. */
import { useI18n } from "vue-i18n"
import * as view from "../js/ROWview"
import { useModelStore } from "../stores/ROWstore.js"

const { t } = useI18n()
const store = useModelStore()
</script>

<template>
	<div v-if="store.viewSettings.showHistory" id="historyTab">
		<h3>{{ t('topMenu.history') }}</h3>
		<div class="historyList">
			<div v-for="(h, i) in store.history" :key="i" class="historyEntry">
				<span class="hp">{{ h.player }}</span>
				<span class="ht">{{ view.humanizeAction(h.type) }}</span>
				<span v-if="h.params.length" class="hparams">{{ h.params.join(", ") }}</span>
			</div>
			<div v-if="store.history.length === 0" class="empty">No actions yet</div>
		</div>
	</div>
</template>

<style scoped>
#historyTab { background: lightblue; border: 2px solid black; margin: 6px; padding: 8px; text-align: center; }
.historyList { max-height: 220px; overflow-y: auto; background: white; margin-bottom: 6px; text-align: left; }
.historyEntry { padding: 1px 4px; font-size: 12px; border-bottom: 1px solid #eee; }
.historyEntry .hp { font-weight: bold; margin-right: 6px; }
.historyEntry .hparams { color: #555; margin-left: 6px; }
.empty { color: #666; padding: 6px; }
</style>
