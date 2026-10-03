<script setup>
import ArtworkCard from "./ArtworkCard.vue"
import { getEquipmentCardImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
</script>

<template>
	<section class="equipmentSupply" aria-label="Equipment era cards">
		<b>Equipment supply</b>
		<div class="eraCards">
			<div v-for="era in [1, 2, 3, 4, 5]" :key="era" class="eraCard">
				<span><b>Era {{ era === 5 ? 'M' : era }}</b> · {{ era === 5 ? 'Unlimited' : `${store.cardSupply[era]} left` }}</span>
				<ArtworkCard :src="getEquipmentCardImage(era)" :alt="`Era ${era === 5 ? 'M' : era} equipment`" />
			</div>
		</div>
	</section>
</template>

<style scoped>
.equipmentSupply { width: 100%; box-sizing: border-box; padding: 8px; border: 2px solid #8e805e; border-radius: 7px; background: #fff9df; text-align: left; font-size: 13px; }.eraCards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }.eraCard { min-width: 0; }.eraCard > span { display: block; margin-bottom: 4px; font-size: 11px; }
</style>
