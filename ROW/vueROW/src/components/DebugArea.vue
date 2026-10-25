<script setup>
import { useI18n } from "vue-i18n"
import * as model from "../js/ROWmodel"
import { useModelStore } from "../stores/ROWstore.js"

const { t } = useI18n()
const store = useModelStore()

function showState() {
	window.alert(JSON.stringify(model.serialize(), null, 2))
}
</script>

<template>
	<div id="debugArea">
		<h4>{{ t('row.debug.title') }}</h4>
		<div>{{ t('row.debug.current') }} {{ store.currentPlayer }} | {{ t('row.debug.status') }} {{ store.state?.status }}</div>
		<div>{{ t('row.debug.actions') }} {{ store.actions.join(", ") }}</div>
		<button @click="showState">{{ t('row.debug.showGameData') }}</button>
	</div>
</template>

<style scoped>
#debugArea { border: 1px dashed darkred; background: #fff3cd; padding: 4px; margin: 6px auto; max-width: 700px; font-size: 12px; text-align: left; }
</style>
