<script setup>
import { computed } from "vue"
import ArtworkCard from "./ArtworkCard.vue"
import * as assets from "../js/URRassets"
import * as rules from "../js/URRrules"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const purchaseEra = computed(() => rules.nextCardEra(store))
const nextEra = computed(() => purchaseEra.value > store.era ? purchaseEra.value : store.era < 5 ? store.era + 1 : null)
</script>

<template>
	<section class="equipmentSupply" :aria-label="$t('supply.aria')">
		<div class="eraCard currentEra">
			<span><b>{{ $t("supply.era", { era: store.era === 5 ? 'M' : store.era }) }}</b> · {{ store.era === 5 ? $t("supply.unlimited") : $t("supply.left", { count: store.cardSupply[store.era] }) }}</span>
			<ArtworkCard :src="assets.getEquipmentCardImage(store.era)" :alt="$t('supply.eraEquipment', { era: store.era === 5 ? 'M' : store.era })" />
		</div>
		<p v-if="purchaseEra > store.era" class="eraTrigger">{{ $t("supply.nextPurchase", { era: nextEra === 5 ? "M" : nextEra }) }}</p>
		<details class="allEras">
			<summary>{{ $t("supply.allEras") }}</summary>
			<div class="eraCards">
				<div v-for="era in [1, 2, 3, 4, 5].filter((era) => era !== store.era)" :key="era" class="eraCard">
					<span><b>{{ $t("supply.era", { era: era === 5 ? 'M' : era }) }}</b> · {{ era === 5 ? $t("supply.unlimited") : $t("supply.left", { count: store.cardSupply[era] }) }}</span>
					<ArtworkCard :src="assets.getEquipmentCardImage(era)" :alt="$t('supply.eraEquipment', { era: era === 5 ? 'M' : era })" />
				</div>
			</div>
		</details>
	</section>
</template>

<style scoped>
.equipmentSupply { width: 100%; box-sizing: border-box; padding: 8px; border: 2px solid #8e805e; border-radius: 7px; background: #fff9df; text-align: left; font-size: 16px; font-weight: 400; }.eraCards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }.eraCard { min-width: 0; }.eraCard > span { display: block; margin-bottom: 4px; font-size: 16px; font-weight: 400; }.eraTrigger { font-size: 16px; font-weight: 400; line-height: 1.4; margin: 8px 0; }.allEras { border-top: 1px solid #c4b894; margin-top: 8px; }.allEras summary { padding: 8px 0; cursor: pointer; }
</style>
