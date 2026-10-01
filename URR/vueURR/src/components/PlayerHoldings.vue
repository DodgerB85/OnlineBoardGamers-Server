<script setup>
import { computed, ref, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import { getTerrainImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const inspectedPlayer = ref(null)

const activePlayer = computed(() => inspectedPlayer.value ?? store.gameflow.turnOrder[0] ?? 0)
const player = computed(() => store.players[activePlayer.value])
const land = computed(() => rf.ALL_LAND_TYPES.map((type) => ({ type, count: store.board.areas.filter((area) => area.owner === activePlayer.value && area.landType === type).length })))
const nations = computed(() => store.nations.filter((nation) => nation.ownerType === "player" && nation.owner === activePlayer.value))
const states = computed(() => store.states.filter((state) => state.king === activePlayer.value))
const markers = computed(() => store.board.areas.filter((area) => area.markerOwner === activePlayer.value).length)

watch(() => store.gameflow.turnOrder[0], () => { inspectedPlayer.value = null })

function inspect(index) { inspectedPlayer.value = index }
function reset() { inspectedPlayer.value = null }
</script>

<template>
	<aside class="holdingsPanel">
		<div class="panelTitle"><b>{{ player?.displayName || "Player" }}</b><button v-if="inspectedPlayer !== null" @click="reset">Follow turn</button></div>
		<div class="money">Private treasury: {{ player?.money ?? 0 }} SPL</div>
		<div class="terrainRow" v-for="entry in land" :key="entry.type"><span class="terrainChip" :style="{ backgroundImage: `url(${getTerrainImage(entry.type)})` }"></span>{{ rf.LAND_NAMES[entry.type] }} <b>{{ entry.count }}</b></div>
		<div>States ruled: {{ states.map((state) => rf.STATE_NAMES[state.id]).join(", ") || "None" }}</div>
		<div>Nations: {{ nations.map((nation) => rf.NATION_NAMES[nation.id]).join(", ") || "None" }}</div>
		<div v-if="store.board.markerLimit">Markers: {{ markers }}/{{ store.board.markerLimit }}</div>
		<div class="assetLine">Assets: {{ player ? rules.playerAssets(store, activePlayer) : 0 }} SPL</div>
		<div class="playerChoices"><button v-for="(entry, index) in store.players" :key="index" :class="{ selected: index === activePlayer }" @click="inspect(index)">{{ entry.displayName }}</button></div>
	</aside>
</template>

<style scoped>
.holdingsPanel { width: 205px; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; text-align: left; font-size: 13px; display: grid; gap: 5px; align-self: flex-start; }
.panelTitle { display: flex; justify-content: space-between; gap: 4px; font-size: 16px; }
.panelTitle button, .playerChoices button { font: inherit; cursor: pointer; }
.money, .assetLine { font-weight: bold; }
.terrainRow { display: flex; gap: 6px; align-items: center; }
.terrainRow b { margin-left: auto; }
.terrainChip { width: 13px; height: 13px; border: 1px solid #333; display: inline-block; }
.terrainChip { background-size: cover; background-position: center; }
.playerChoices { display: flex; flex-wrap: wrap; gap: 3px; border-top: 1px solid #c4b894; padding-top: 5px; }
.playerChoices .selected { outline: 2px solid #45a7df; }
</style>
