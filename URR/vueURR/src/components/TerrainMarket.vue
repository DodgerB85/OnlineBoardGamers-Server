<script setup>
import * as rf from "../js/URRreference"
import { getTerrainImage, landPriceTrackImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
function markerPosition(type) {
	const index = rf.LAND_PRICE_TRACK.length - 1 - rf.LAND_PRICE_TRACK.indexOf(store.landPrices[type])
	const overlap = rf.ALL_LAND_TYPES.filter((other) => other < type && store.landPrices[other] === store.landPrices[type]).length
	return { x: 29 + (index % 13) * 126 + overlap * 18, y: (index < 13 ? 28 : 280) + overlap * 12 }
}
</script>

<template>
	<section class="marketPanel" aria-label="Land market">
		<div class="marketHeading"><b>Land market</b><span>Sale prices · markers move on the printed track</span></div>
		<svg viewBox="0 0 1650 515" aria-label="Current land sale prices">
			<image :href="landPriceTrackImage" width="1650" height="515" />
			<image v-for="type in rf.ALL_LAND_TYPES" :key="type" :href="getTerrainImage(type)" :x="markerPosition(type).x" :y="markerPosition(type).y" width="76" height="76"><title>{{ rf.LAND_NAMES[type] }}: {{ store.landPrices[type] }} SPL</title></image>
		</svg>
		<div class="colonization"><b>Colonization</b><span v-for="type in rf.ALL_LAND_TYPES" :key="type"><img :src="getTerrainImage(type)" alt="" />{{ rf.LAND_NAMES[type] }} {{ rf.LAND_COLONIZATION_PRICES[type] }} <small>City {{ rf.LAND_CITY_COLONIZATION_PRICES[type] }}</small></span></div>
	</section>
</template>

<style scoped>
.marketPanel { width: 100%; background: #fff9e9; border: 1px solid #aa9b77; border-radius: 5px; overflow: hidden; text-align: left; box-sizing: border-box; }
.marketHeading { display: flex; justify-content: space-between; gap: 8px; padding: 7px 10px; font-size: 13px; }.marketHeading span { color: #736950; font-size: 11px; }
svg { display: block; width: 100%; }.colonization { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 8px 10px; font-size: 12px; }.colonization span { display: inline-flex; align-items: center; gap: 4px; }.colonization img { width: 23px; height: 23px; }.colonization small { color: #736950; }
</style>
