<script setup>
import { computed } from "vue"
import * as rf from "../js/URRreference"
import { getTerrainImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()

const priceGroups = computed(() => {
	const groups = new Map()
	for (const type of rf.ALL_LAND_TYPES) {
		const price = store.landPrices[type]
		if (!groups.has(price)) groups.set(price, [])
		groups.get(price).push(type)
	}
	return [...groups.entries()].map(([price, types]) => ({ price, types })).sort((a, b) => b.price - a.price)
})
</script>

<template>
	<aside class="marketPanel">
		<h3>Land market</h3>
		<div class="marketNote">Current sale price</div>
		<div class="priceGroup" v-for="group in priceGroups" :key="group.price"><span class="tokenStack"><span v-for="(type, index) in group.types" :key="type" class="terrainToken" :style="{ left: `${index * 9}px`, backgroundImage: `url(${getTerrainImage(type)})` }" :title="rf.LAND_NAMES[type]"></span></span><b>{{ group.price }}</b> SPL</div>
		<div class="ipo"><b>IPO / colonization</b><div v-for="type in rf.ALL_LAND_TYPES" :key="type"><span class="terrainToken mini" :style="{ backgroundImage: `url(${getTerrainImage(type)})` }"></span>{{ rf.LAND_NAMES[type] }} {{ rf.LAND_COLONIZATION_PRICES[type] }}</div></div>
		<details><summary>City prices</summary><div v-for="type in rf.ALL_LAND_TYPES" :key="type">{{ rf.LAND_NAMES[type] }}: IPO {{ rf.LAND_CITY_COLONIZATION_PRICES[type] }}, sale follows next higher marker</div></details>
	</aside>
</template>

<style scoped>
.marketPanel { width: 205px; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; text-align: left; font-size: 13px; align-self: flex-start; }
h3 { margin: 0; font-size: 16px; }.marketNote { color: #5e5746; margin: 3px 0; }
.priceGroup { display: flex; align-items: center; min-height: 30px; gap: 5px; border-bottom: 1px solid #ddd1aa; }
.tokenStack { width: 57px; height: 25px; position: relative; }.terrainToken { position: absolute; top: 1px; width: 23px; height: 23px; border: 1px solid #483f2e; box-shadow: 1px 1px 1px #776; background-size: cover; background-position: center; }
.ipo { border-top: 2px solid #9a8d69; margin-top: 6px; padding-top: 5px; display: grid; gap: 2px; }.mini { display: inline-block; position: static; width: 12px; height: 12px; margin-right: 5px; vertical-align: -2px; }
details { margin-top: 6px; font-size: 11px; } summary { cursor: pointer; }
</style>
