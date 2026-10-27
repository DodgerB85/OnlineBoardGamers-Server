<script setup>
import { computed, nextTick } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as assets from "../js/URRassets"
const props = defineProps({ before: { type: Object, required: true }, after: { type: Object, required: true } })
const changes = computed(() => rf.ALL_LAND_TYPES.flatMap((type) => [false, true].map((isCity) => {
	const area = { landType: type, isCity }
	return { type, isCity, previous: rules.landPrice(props.before, area), next: rules.landPrice(props.after, area) }
})).filter((entry) => entry.previous !== entry.next))
async function revealChanges(event) {
	const details = event.currentTarget
	if (!details.open) return
	await nextTick()
	details.scrollIntoView({ block: "nearest", behavior: "instant" })
}
</script>

<template>
	<details v-if="changes.length" class="marketForecast" @toggle="revealChanges">
		<summary>{{ $t("market.forecastSummary") }}</summary>
		<div class="priceChanges"><div v-for="change in changes" :key="`${change.type}-${change.isCity}`" :title="$t('market.forecastTitle', { land: rf.LAND_NAMES[change.type], city: change.isCity ? ' ' + $t('common.city') : '', previous: change.previous, next: change.next })"><img :src="assets.getTerrainImage(change.type, change.isCity)" :alt="`${rf.LAND_NAMES[change.type]}${change.isCity ? ' ' + $t('common.city') : ''}`" /><span>{{ change.previous }} → <b>{{ change.next }}</b> <CurrencyIcon /></span></div></div>
	</details>
</template>

<style scoped>
.marketForecast { scroll-margin-bottom: 100px; margin: 6px 0; border: 1px solid #bdd5e3; border-radius: 3px; background: #edf6fd; font-size: 16px; font-weight: 400; }.marketForecast summary { padding: 6px 7px; cursor: pointer; }.priceChanges { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; padding: 0 7px 7px; }.priceChanges > div { display: flex; align-items: center; gap: 5px; }.priceChanges img { width: 22px; height: 22px; flex-shrink: 0; }.priceChanges span { white-space: nowrap; }.priceChanges b { color: #12628c; }
@media (max-width: 1050px) { .marketForecast summary { min-height: 40px; box-sizing: border-box; padding: 12px 7px; } }
</style>
