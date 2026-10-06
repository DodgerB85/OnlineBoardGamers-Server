<script setup>
import { computed } from "vue"
import ArtworkCard from "./ArtworkCard.vue"
import { getEquipmentCardImage } from "../js/URRassets"
import { nextCardEra } from "../js/URRrules"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const purchaseEra = computed(() => nextCardEra(store))
const nextEra = computed(() => purchaseEra.value > store.era ? purchaseEra.value : store.era < 5 ? store.era + 1 : null)
</script>

<template>
	<section class="equipmentSupply" aria-label="Equipment era cards">
		<b>Equipment supply</b>
		<div class="eraCard currentEra">
			<span><b>Era {{ store.era === 5 ? 'M' : store.era }}</b> · {{ store.era === 5 ? 'Unlimited' : `${store.cardSupply[store.era]} left` }}</span>
			<ArtworkCard :src="getEquipmentCardImage(store.era)" :alt="`Era ${store.era === 5 ? 'M' : store.era} equipment`" />
		</div>
		<p v-if="nextEra !== null" class="eraTrigger"><template v-if="purchaseEra > store.era">Next purchase starts Era {{ nextEra === 5 ? 'M' : nextEra }}.</template><template v-else>Era {{ nextEra === 5 ? 'M' : nextEra }} starts with its first purchase, after this supply runs out.</template></p>
		<details class="allEras">
			<summary>All eras</summary>
			<div class="eraCards">
				<div v-for="era in [1, 2, 3, 4, 5].filter((era) => era !== store.era)" :key="era" class="eraCard">
					<span><b>Era {{ era === 5 ? 'M' : era }}</b> · {{ era === 5 ? 'Unlimited' : `${store.cardSupply[era]} left` }}</span>
					<ArtworkCard :src="getEquipmentCardImage(era)" :alt="`Era ${era === 5 ? 'M' : era} equipment`" />
				</div>
			</div>
		</details>
	</section>
</template>

<style scoped>
.equipmentSupply { width: 100%; box-sizing: border-box; padding: 8px; border: 2px solid #8e805e; border-radius: 7px; background: #fff9df; text-align: left; font-size: 13px; }.eraCards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }.eraCard { min-width: 0; }.eraCard > span { display: block; margin-bottom: 4px; font-size: 11px; }.currentEra { margin-top: 8px; }.eraTrigger { font-size: 12px; line-height: 1.4; margin: 8px 0; }.allEras { border-top: 1px solid #c4b894; margin-top: 8px; }.allEras summary { padding: 8px 0; cursor: pointer; }
</style>
