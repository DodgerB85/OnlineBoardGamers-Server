<script setup>
/**
 * Debug area: edit the current player's resources directly.
 * Apply batches every changed field into one history entry, so replay rebuilds
 * the same state in one step.
 */
import { computed, reactive, watch } from "vue"
import { useI18n } from "vue-i18n"
import * as model from "../js/ROWmodel"
import * as controller from "../js/ROWcontroller"
import { ADMIN_FIELDS, adminChangesFor } from "../js/ROWadmin"
import { useModelStore } from "../stores/ROWstore.js"

const { t } = useI18n()
const store = useModelStore()

const values = reactive(Object.fromEntries(ADMIN_FIELDS.map((field) => [field.key, 0])))
const fields = computed(() =>
	ADMIN_FIELDS.filter((field) => !field.available || (store.game && field.available(store.game))),
)
const playerState = computed(() => (store.game && store.currentPlayer ? store.game.playerState(store.currentPlayer) : null))

function resetValues() {
	if (!playerState.value) return
	for (const field of ADMIN_FIELDS) values[field.key] = field.get(playerState.value)
}

watch([() => store.currentPlayer, () => store.version], resetValues, { immediate: true })

function applyChanges() {
	if (!playerState.value) return
	const changes = adminChangesFor(playerState.value, values)
	if (changes.length === 0) {
		resetValues()
		return
	}
	if (controller.adminEdit(changes)) resetValues()
}

function showState() {
	window.alert(JSON.stringify(model.serialize(), null, 2))
}
</script>

<template>
	<div id="debugArea">
		<h4>{{ t('row.debug.title') }}</h4>
		<div>{{ t('row.debug.current') }} {{ store.currentPlayer }} | {{ t('row.debug.status') }} {{ store.state?.status }}</div>
		<div>{{ t('row.debug.actions') }} {{ store.actions.join(", ") }}</div>
		<div v-if="playerState" class="adminGrid">
			<label v-for="field in fields" :key="field.key" class="adminRow">
				<span>{{ t(field.labelKey) }}</span>
				<input v-model.number="values[field.key]" type="number" step="1" :aria-label="t(field.labelKey)" />
			</label>
			<div class="adminButtons">
				<button class="actionsLineButton" @click="applyChanges">{{ t('row.debug.apply') }}</button>
				<button class="actionsLineButton" @click="resetValues">{{ t('row.debug.reset') }}</button>
			</div>
		</div>
		<button class="actionsLineButton" @click="showState">{{ t('row.debug.showGameData') }}</button>
	</div>
</template>

<style scoped>
#debugArea { border: 1px dashed darkred; background: #fff3cd; padding: 4px; margin: 6px auto; max-width: 700px; font-size: 12px; text-align: left; }
#debugArea .actionsLineButton { margin: 4px 0; }
#debugArea .adminGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 2px 10px; margin: 6px 0; }
#debugArea .adminRow { display: flex; align-items: center; gap: 4px; }
#debugArea .adminRow span { flex: 1; }
#debugArea .adminRow input { width: 58px; text-align: right; }
#debugArea .adminButtons { grid-column: 1 / -1; }
</style>
