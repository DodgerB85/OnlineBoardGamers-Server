<script setup>
/** This is the City top building store
 * IE multi-build bldgs, player res, player bldgs
 */

import * as view from "../js/AQYview.js"
import * as rf from "../js/AQYreference.js"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()
const store = useModelStore()
</script>

<template>
	<template v-if="store.topMenuViews.WStradeToDisplay.length > 0">
		<div class="playerBoxes">
			<div class="playerBox">
				<template v-if="store.topMenuViews.WStradeToDisplay[0] === personal.pov">
					<div class="playerScoreSummaryDiv">
						<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.topMenuViews.WStradeToDisplay[0]].colour)">
							You
						</span>
					</div>
					offered:
				</template>
				<template v-else>
					<div class="playerScoreSummaryDiv">
						<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.topMenuViews.WStradeToDisplay[0]].colour)">
							{{ store.players[store.topMenuViews.WStradeToDisplay[0]].displayName }}
						</span>
					</div>
					offered:
				</template>
				<img v-for="(res, idx) in store.topMenuViews.WStradeToDisplay[2]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />

				<div class="promiseDiv" v-if="store.topMenuViews.WStradeToDisplay[3][0] !== ''">
					&nbsp;
					<b>Promise Phase</b> {{ rf.PHASE_STRINGS[store.topMenuViews.WStradeToDisplay[3][1]] }}
					<b>Promise</b>
					{{ store.topMenuViews.WStradeToDisplay[3][0] }}
				</div>
			</div>

			<div class="playerBox">
				<template v-if="store.topMenuViews.WStradeToDisplay[1] === personal.pov">
					<div class="playerScoreSummaryDiv">
						<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.topMenuViews.WStradeToDisplay[1]].colour)">
							You
						</span>
					</div>
					were asked for:
				</template>
				<template v-else>
					<div class="playerScoreSummaryDiv">
						<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.topMenuViews.WStradeToDisplay[1]].colour)">
							{{ store.players[store.topMenuViews.WStradeToDisplay[1]].displayName }}
						</span>
					</div>
					was asked for:
				</template>
				<img v-for="(res, idx) in store.topMenuViews.WStradeToDisplay[4]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />

				<div class="promiseDiv" v-if="store.topMenuViews.WStradeToDisplay[5][0] !== ''">
					&nbsp;
					<b>Promise Phase</b> {{ rf.PHASE_STRINGS[store.topMenuViews.WStradeToDisplay[5][1]] }}
					<b>Promise</b>
					{{ store.topMenuViews.WStradeToDisplay[5][0] }}
				</div>
			</div>
		</div>
	</template>
</template>

<style scoped>
.playerBoxes {
	width: fit-content;
	display: flex;
	margin: auto;
}

.playerBox {
	min-width: 500px;
	width: fit-content;
	border: 2px solid black;
	margin: 5px;
	padding: 5px;
}

.tradingRes {
	border: 1px solid black;
	width: 50px;
	height: 50px;
	vertical-align: middle;
	border: 1px solid black;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	margin: 4px;
	padding: 0px;
	vertical-align: middle;
}

.promiseDiv {
	display: inline;
}
</style>
