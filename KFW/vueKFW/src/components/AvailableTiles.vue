<script setup>
/**
 * Component to hold all the available tiles.
 * It should be able to handle turn order, boats, plus biddable season tiles
 */
import * as rf from "../js/KFWreference"

import AvailableTile from "./AvailableTile.vue"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()
</script>

<template>
	<!-- Boat Tiles-->
	<b><u>Boat Tiles & TO tiles</u></b>
	<br />
	<div v-for="(boatTile, idx) in store.availableBoatTiles" :key="idx" class="availableTilesDiv">
		<AvailableTile :tileProp="boatTile" :innerIndex="boatTile.seasonsIndex.findIndex((subArray) => subArray.includes(store.gameflow.season))" />
	</div>

	<!-- Turn order Tiles-->
	<div v-for="(turnOrderTile, idx) in store.availableTurnOrderTiles" :key="idx" class="availableTilesDiv">
		<AvailableTile :tileProp="turnOrderTile" :innerIndex="0" />
	</div>

	<!-- Season Tiles-->
	<br />
	<b><u>Season Tiles</u></b>
	<br />
	<div v-for="(seasonTile, idx) in store.availableTiles" :key="idx" class="availableTilesDiv">
		<AvailableTile v-if="!rf.TILE_SUMMER_BOATS.includes(seasonTile.tileID[0])" :tileProp="seasonTile" :innerIndex="seasonTile.upgraded" />
		<AvailableTile v-else-if="rf.TILE_SUMMER_BOATS.includes(seasonTile.tileID[0])" :tileProp="seasonTile" :innerIndex="seasonTile.upgraded" />
	</div>
</template>

<style scoped>
.availableTilesDiv {
	display: inline-block;
}
</style>
