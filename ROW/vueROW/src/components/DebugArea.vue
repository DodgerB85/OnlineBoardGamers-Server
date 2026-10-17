<script setup>
import * as model from "../js/ROWmodel"
import { useModelStore } from "../stores/ROWstore.js"

const store = useModelStore()

function showState() {
	window.alert(JSON.stringify(model.serialize(), null, 2))
}
</script>

<template>
	<div id="debugArea">
		<h4>Debug</h4>
		<div>current: {{ store.currentPlayer }} | status: {{ store.state?.status }}</div>
		<div>actions: {{ store.actions.join(", ") }}</div>
		<button @click="showState">Show game data</button>
	</div>
</template>

<style scoped>
#debugArea { border: 1px dashed darkred; background: #fff3cd; padding: 4px; margin: 6px auto; max-width: 700px; font-size: 12px; text-align: left; }
</style>
