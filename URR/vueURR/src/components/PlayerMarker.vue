<script setup>
import { computed } from "vue"
import * as assets from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const props = defineProps({ index: { type: Number, required: true }, name: { type: String, default: "" } })
const playerName = computed(() => props.name || store.players[props.index].displayName)
</script>

<template>
	<img class="playerMarker" :src="assets.getPlayerMarkerImage(index)" :alt="playerName" :title="playerName" />
</template>

<style scoped>
.playerMarker { display: inline-block; width: 24px; height: 24px; vertical-align: middle; flex-shrink: 0; }
</style>
