<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 *
 *
 */

//import * as rf from "../js/WEBreference"
import * as map from "../js/WEBmap"
import * as controller from "../js/WEBcontroller"
//import * as model from "../js/WEBmodel"
//import * as funcs from "../js/WEBfuncs"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()







</script>

<template>
	<body>
		<div class="optionsDiv">
      <button class="actionsLineButton" @click="map.prettyPrint()">Print Map</button>
		</div>
    <br/>
    {{ store.historyHighlights }}
		<br />
		CPO: {{ controller.currentPlayerObj() }}
    <br/>
    MapTiles: {{ store.mapTiles }}
    <br/>
    Cables: {{ store.cables }}
    <br/>
    Grid: {{ store.gridDimensions }} // W: {{ store.gridWidth }} // H: {{ store.gridHeight }}
		<br />
	</body>
</template>

<style scoped>
body {
	background-color: lightpink;
	padding: 10px;
}

.optionsDiv {
	display: inline-block;
	border: 2px solid black;
	padding: 2px;
}

button {
	margin: 2px;
}
</style>
