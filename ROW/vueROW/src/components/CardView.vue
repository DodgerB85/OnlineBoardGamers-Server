<script setup lang="ts">
/**
 * Card artwork, ported from the boardgamefiesta GWT card.component
 * (GPL-3.0, Tom Wetjens). Cattle cards 80x115, objective cards use the same
 * frame; SIMMENTAL art lives under row2/cards.
 */
import { computed } from "vue"
import { isCattleCard, type Card } from "../game"

const props = withDefaults(defineProps<{ card: Card; points?: boolean; small?: boolean }>(), { points: true, small: false })

const img = computed(() => {
	const card = props.card
	if (isCattleCard(card)) {
		if (card.type === "SIMMENTAL") return `/static/ROW/images/row2/cards/simmental${card.value}.jpg`
		return `/static/ROW/images/row/cards/${card.type.toLowerCase()}.jpg`
	}
	const id = card.id
	if (id.startsWith("GAIN2_")) return `/static/ROW/images/row/cards/2_${id.slice(6).toLowerCase()}.jpg`
	return `/static/ROW/images/row/cards/${id.toLowerCase()}.jpg`
})

const points = computed(() => (isCattleCard(props.card) ? props.card.points : 0))
</script>

<template>
	<div class="gwtCard" :class="{ small }" :title="isCattleCard(card) ? `${card.type} v${card.value}` : card.id">
		<img :src="img" alt="" draggable="false" />
		<span v-if="points && points > 0" class="cardPoints">{{ points }}</span>
		<slot />
	</div>
</template>

<style scoped>
.gwtCard {
	position: relative;
	width: 80px;
	height: 115px;
	border: 1px solid #ffffff;
	border-radius: 5px;
	background-size: cover;
	background-position: center;
	display: block;
	flex: none;
}
.gwtCard.small { width: 40px; height: 58px; border-width: 1px; }
.gwtCard img {
	width: 100%;
	height: 100%;
	border-radius: 4px;
	object-fit: cover;
	pointer-events: none;
	display: block;
}
.cardPoints {
	position: absolute;
	left: 14px;
	top: 70px;
	color: white;
	font-size: 11px;
	font-weight: bold;
	text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
	pointer-events: none;
}
.gwtCard.small .cardPoints { left: 7px; top: 35px; font-size: 8px; }
</style>
