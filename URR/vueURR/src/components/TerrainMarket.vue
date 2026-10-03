<script setup>
import * as rf from "../js/URRreference"
import { landPrice } from "../js/URRrules"
import { getTerrainImage, landPriceTrackImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
function markerPosition(type) {
	const index = rf.LAND_PRICE_TRACK.length - 1 - rf.LAND_PRICE_TRACK.indexOf(store.landPrices[type])
	const samePrice = rf.ALL_LAND_TYPES.filter((other) => store.landPrices[other] === store.landPrices[type])
	const position = samePrice.indexOf(type)
	const row = index < 13 ? 0 : 252
	if (samePrice.length === 1) return { x: 29 + (index % 13) * 126, y: row + 28, size: 76 }
	return { x: 20 + (index % 13) * 126 + (position % 2) * 52, y: row + (samePrice.length === 2 ? 43 : 18 + Math.floor(position / 2) * 52), size: 46 }
}
</script>

<template>
	<section class="marketPanel" aria-label="Land market">
		<div class="marketHeading"><b>Land prices <small>SPL</small></b><span>Market / colonize</span></div>
		<div class="priceSummary"><div v-for="type in rf.ALL_LAND_TYPES" :key="type" class="terrainPrice"><div class="landPrice" :title="`${rf.LAND_NAMES[type]}: market ${store.landPrices[type]} SPL; colonize ${rf.LAND_COLONIZATION_PRICES[type]} SPL`"><img :src="getTerrainImage(type)" :alt="rf.LAND_NAMES[type]" /><span><b>{{ store.landPrices[type] }}</b><small>{{ rf.LAND_COLONIZATION_PRICES[type] }}</small></span></div><div class="landPrice cityPrice" :title="`${rf.LAND_NAMES[type]} city: market ${landPrice(store, { landType: type, isCity: true })} SPL; colonize ${rf.LAND_CITY_COLONIZATION_PRICES[type]} SPL`"><img :src="getTerrainImage(type, true)" :alt="`${rf.LAND_NAMES[type]} city`" /><span><b>{{ landPrice(store, { landType: type, isCity: true }) }}</b><small>{{ rf.LAND_CITY_COLONIZATION_PRICES[type] }}</small></span></div></div></div>
		<details class="printedTrack"><summary>Printed land market</summary><svg viewBox="0 0 1650 515" aria-label="Current land sale prices"><image :href="landPriceTrackImage" width="1650" height="515" /><image v-for="type in rf.ALL_LAND_TYPES" :key="type" :href="getTerrainImage(type)" :x="markerPosition(type).x" :y="markerPosition(type).y" :width="markerPosition(type).size" :height="markerPosition(type).size"><title>{{ rf.LAND_NAMES[type] }}: {{ store.landPrices[type] }} SPL</title></image></svg></details>
	</section>
</template>

<style scoped>
.marketPanel { width: 100%; background: #fff9e9; border: 1px solid #aa9b77; border-radius: 5px; overflow: hidden; text-align: left; box-sizing: border-box; }
.marketHeading { display: flex; justify-content: space-between; gap: 8px; padding: 7px 10px; font-size: 13px; }.marketHeading span { color: #736950; font-size: 11px; }
svg { display: block; width: 100%; }.priceSummary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 0 10px 7px; }.terrainPrice { display: grid; gap: 5px; }.landPrice { display: flex; align-items: center; gap: 7px; }.terrainPrice img { width: 35px; height: 35px; border-radius: 3px; }.terrainPrice b { font-size: 18px; }.terrainPrice small { display: block; font-size: 11px; color: #736950; }.marketHeading small { font-weight: normal; }.printedTrack { border-top: 1px solid #d8ceb5; }.printedTrack summary { cursor: pointer; padding: 4px 10px; font-size: 11px; color: #736950; }
@media (max-width: 500px) { .priceSummary { gap: 4px; padding: 0 6px 7px; }.landPrice { gap: 4px; }.terrainPrice img { width: 26px; height: 26px; }.terrainPrice b { font-size: 16px; } }
.terrainPrice small, .marketHeading span, .printedTrack summary { font-size: 12px; }
@media (max-width: 1050px) { .printedTrack summary { min-height: 40px; display: flex; align-items: center; gap: 6px; box-sizing: border-box; }.printedTrack summary::before { content: '\25B8'; }.printedTrack[open] summary::before { content: '\25BE'; } }
@media (max-width: 350px) { .marketHeading { flex-wrap: wrap; gap: 3px; }.marketHeading span { width: 100%; }.landPrice { gap: 3px; }.terrainPrice img { width: 22px; height: 22px; }.terrainPrice b { display: block; }.terrainPrice small { white-space: nowrap; } }
</style>
