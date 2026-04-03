<script setup>
import * as view from "../js/WEBview.js"
import * as rf from "../js/WEBreference.js"
import * as model from "../js/WEBmodel.js"
//import * as funcs from "../js/WEBfuncs.js"
import * as controller from "../js/WEBcontroller.js"
//import * as map from "../js/WEBmap.js"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

function getAvailableTileGroups() {
	return [
		[store.SQUARE_PILE_1, store.SQUARE_PILE_2],
		[store.RECT_PILE_1, store.RECT_PILE_2],
		[store.CORNER_PILE_1, store.CORNER_PILE_2],
	]
}

function clickedAvailableTile(tileID) {
	if (!personal.canPlay()) return
	if (store.context.action !== rf.ACT_CHOOSE_ACTION) return
	if (store.context.remainingActions <= 0) return
	model.addTileToPlayer(controller.currentPlayerIndex(), tileID)
}
</script>

<template>
	<div id="availableTilesDiv">
    <span v-if="store.context.action === rf.ACT_CHOOSE_ACTION && personal.canPlay() && store.context.remainingActions > 0">
      <b>Taking a tile reveals hidden information<br/>The game will be saved and you will not be able to undo this action</b>
    </span>
		<div class="groupDiv" v-for="(group, groupIdx) in getAvailableTileGroups()" :key="groupIdx">
			<div class="pileDiv" v-for="(pile, pileIdx) in group" :key="pileIdx">
				<div class="singleTileDiv">
					<svg class="singleTileSVG" xmlns="http://www.w3.org/2000/svg" :viewBox="rf.ALL_RECT_TILES.includes(pile[0]) ? '0 0 50 100' : '0 0 100 100'">
						<polygon @click="clickedAvailableTile(pile[0])" class="singleTilePolygon" :class="[personal.canPlay() && store.context.action === rf.ACT_CHOOSE_ACTION && store.context.remainingActions > 0 ? 'selectableTile' : '']" x="0" y="0" :transform="pile.length > 0 ? view.getRotateString(pile[0], 0, 0, 0, 50) : ''" :points="pile.length > 0 ? view.getPolygonPointsFromTileID(pile[0], 0, 0, 0, 50) : ''" :fill="pile.length > 0 ? view.getTilePatternFromID(pile[0]) : 'none'" />
					</svg>
				</div>
				({{ pile.length }})
			</div>
		</div>
	</div>
</template>

<style scoped>
#availableTilesDiv {
	width: 320px !important;
	min-width: 320px;
  overflow: wrap !important;
}

.groupDiv {
	display: inline-block;
}

.pileDiv {
	display: inline-block;
	margin-right: 5px;
}

.singleTileDiv {
	width: fit-content;
	height: 100px;
}

.singleTileSVG {
	width: 100%;
	height: 100%;
}

.singleTilePolygon {
	stroke: black;
	stroke-width: 1px;
}

.selectableTile {
	cursor: pointer;
	stroke: yellow;
	stroke-width: 5px;
}

.selectableTile:hover {
	stroke: lightgreen;
}
</style>
