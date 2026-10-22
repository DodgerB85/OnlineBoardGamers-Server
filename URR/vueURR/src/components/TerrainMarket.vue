<script setup>
import * as rf from "../js/URRreference"
import * as assets from "../js/URRassets"
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
	<section class="marketPanel" :aria-label="$t('market.aria')">
		<svg viewBox="0 0 1650 515" :aria-label="$t('market.pricesAria')"><image :href="assets.landPriceTrackImage" width="1650" height="515" /><image v-for="type in rf.ALL_LAND_TYPES" :key="type" :href="assets.getTerrainImage(type)" :x="markerPosition(type).x" :y="markerPosition(type).y" :width="markerPosition(type).size" :height="markerPosition(type).size"><title>{{ $t("market.priceTitle", { land: rf.LAND_NAMES[type], price: store.landPrices[type] }) }}</title></image></svg>
	</section>
</template>

<style scoped>
.marketPanel { width: 100%; background: #fff9e9; border: 1px solid #aa9b77; border-radius: 5px; overflow: hidden; text-align: left; box-sizing: border-box; }
svg { display: block; width: 100%; }
</style>
