<script setup>
import { useModelStore } from "../../stores/PAPstore.js"
import VenueCard from "./VenueCard.vue"

const store = useModelStore()
</script>

<template>
	<div class="venueRow">
		<VenueCard v-for="venue in store.viewGame.venues" :key="venue.id" :venue="venue" />
	</div>
</template>

<style scoped>
.venueRow {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8px;
	padding: 8px;
}
</style>
