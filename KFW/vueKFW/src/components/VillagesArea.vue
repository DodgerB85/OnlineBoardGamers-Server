<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in map.js
 *
 *
 */

import * as rf from "../js/KFWreference"

import PlayerVillage from "./PlayerVillage.vue"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"

const personal = usePersonalStore()

function getPlayerIndexes() {
	let res = []
	if (personal.pov >= 0) res.push(personal.pov)
	for (let i = 0; i < store.players.length; i++) if (!res.includes(i)) res.push(i)
	return res
}
</script>

<template>
	<template v-for="playerIndex in getPlayerIndexes()" :key="playerIndex">
		<div
			class="playerVillageDiv"
			:style="{
				minWidth: (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) && personal.canPlay() && (playerIndex === personal.pov || personal.trainingGame) ? '1400px' : '0px',
			}">
			<PlayerVillage :playerIndexProp="playerIndex" />
		</div>
	</template>
</template>
<style scoped>
.playerVillageDiv {
	display: inline-block;
	background-color: aliceblue;
	width: fit-content;
	vertical-align: top;
}
</style>
