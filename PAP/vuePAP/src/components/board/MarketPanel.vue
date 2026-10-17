<script setup>
import { computed } from "vue"
import { APPARATUS, DISPENSATIONS, TESTIMONIALS } from "../../js/engine/cards.js"
import { useModelStore } from "../../stores/PAPstore.js"
import { usePersonalStore } from "../../stores/PAPpersonal.js"
import ArtIcon from "./ArtIcon.vue"
import CardBack from "./CardBack.vue"
import MiniRecipe from "./MiniRecipe.vue"
import { ICONS } from "./icons.js"
import { FAMILY, FAMILY_LEGEND } from "./shared.js"

const store = useModelStore()
const personal = usePersonalStore()
const s = computed(() => store.viewGame)
// Each shelf opens in the phase where it can be bought: Street Alchemist drafts in the Morning Shift, Testimonials in the Morning Post.
const openIn = phase => s.value.phase === phase

// Recipes the viewer already knows are dimmed on the shelf.
const known = computed(() => new Set(s.value.players[personal.pov] ? s.value.players[personal.pov].recipes : []))

function magnetVenue(id) {
	const e = TESTIMONIALS[id].effect
	return e.type === "demandMagnet" ? e.venue : null
}
</script>

<template>
	<section class="panel">
		<h3>Market</h3>

		<details class="shelf" :open="openIn('shift')">
			<summary>Recipes <span class="count">{{ s.decks.marketRecipes.length }}</span></summary>
			<div class="shelfRow">
				<MiniRecipe v-for="id in s.decks.marketRecipes" :key="id" :recipe-id="id" :dim="known.has(id)" />
			</div>
		</details>

		<details class="shelf" :open="openIn('shift')">
			<summary :title="FAMILY_LEGEND">Dispensations <span class="count">{{ s.decks.dispensations.length }}</span></summary>
			<div class="shelfRow">
				<span
					v-for="id in s.decks.dispensations"
					:key="id"
					class="chip"
					:style="{ borderLeftColor: FAMILY[DISPENSATIONS[id].family].colour }"
					:title="DISPENSATIONS[id].name + ' (' + FAMILY[DISPENSATIONS[id].family].name + '): ' + DISPENSATIONS[id].text"
				>{{ DISPENSATIONS[id].name }}</span>
			</div>
		</details>

		<details class="shelf" :open="openIn('shift')">
			<summary>Apparatus <span class="count">{{ s.decks.apparatus.length }}</span></summary>
			<div class="shelfRow">
				<span v-for="id in s.decks.apparatus" :key="id" class="chip" :title="APPARATUS[id].name + ': ' + APPARATUS[id].text">
					<ArtIcon :name="ICONS.apparatus(id).art" :size="18" :label="ICONS.apparatus(id).label" />{{ APPARATUS[id].name }}
				</span>
			</div>
		</details>

		<details class="shelf" :open="openIn('post')">
			<summary>Testimonials <span class="count">{{ s.decks.testimonialMarket.length }}</span></summary>
			<div class="shelfRow">
				<div v-for="id in s.decks.testimonialMarket" :key="id" class="testi" :title="TESTIMONIALS[id].name + ': ' + TESTIMONIALS[id].text">
					<ArtIcon v-if="magnetVenue(id)" class="thumb" :name="'venue-' + magnetVenue(id)" :size="110" />
					<ArtIcon v-else :name="ICONS.testimonial.art" :size="36" :label="TESTIMONIALS[id].name" />
					<span class="testiName">{{ TESTIMONIALS[id].name }}</span>
				</div>
			</div>
		</details>

		<div class="shelf decks">
			<span class="shelfTitle">Decks</span>
			<div class="shelfRow">
				<CardBack kind="customer" :count="s.decks.customer.length" label="Customers" :title="'Customers: ' + s.decks.customer.length + ' left, ' + s.decks.customerDiscard.length + ' discarded'" />
				<CardBack kind="paperwork" :count="s.decks.paper.length" label="Paperwork" :title="'Paperwork: ' + s.decks.paper.length + ' left, ' + s.decks.paperDiscard.length + ' discarded'" />
				<CardBack kind="paperwork" :count="s.decks.side.length" label="Side" :title="'Side deck: ' + s.decks.side.length + ' left'" />
				<CardBack kind="scare" :count="s.decks.scare.length" label="Scares" :title="'Scares: ' + s.decks.scare.length + ' left, ' + s.decks.scareDiscard.length + ' discarded'" />
				<CardBack kind="charter" :count="s.decks.charter.length" label="Charters" :title="'Charters: ' + s.decks.charter.length + ' left, ' + (s.decks.charterDiscard || []).length + ' discarded'" />
			</div>
		</div>
	</section>
</template>

<style scoped>
.panel {
	flex: 1 1 340px;
	min-width: 0;
	box-sizing: border-box;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 8px 10px;
	background-color: #f3ecd9;
	text-align: left;
	font-size: 13px;
}
h3 {
	margin: 4px 0 4px;
	font-size: 15px;
}
.shelf {
	border-bottom: 2px solid #b89b6b;
	padding: 4px 0 6px;
}
.shelf summary {
	cursor: pointer;
	font-weight: bold;
	padding: 2px 0;
}
.shelfTitle {
	display: block;
	font-weight: bold;
	padding: 2px 0;
}
.count {
	display: inline-block;
	min-width: 18px;
	margin-left: 4px;
	border: 1px solid #996;
	border-radius: 9px;
	padding: 0 5px;
	background-color: #fbf8ef;
	font-size: 11px;
	text-align: center;
}
.shelfRow {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 6px;
	padding: 6px 2px 2px;
}
.chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	border: 1px solid #b8ab8c;
	border-left-width: 4px;
	border-radius: 10px;
	padding: 1px 8px 1px 6px;
	background-color: #fbf8ef;
	font-size: 12px;
}
.glyph {
	font-size: 14px;
}
.glyph.big {
	font-size: 34px;
	line-height: 1;
}
.testi {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 3px;
	width: 116px;
	box-sizing: border-box;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 4px;
	background-color: #fbf8ef;
}
.testi .thumb {
	width: 100%;
	height: auto;
	border-radius: 4px;
}
.testiName {
	font-size: 11px;
	font-style: italic;
	text-align: center;
	line-height: 1.2;
}
.decks .shelfRow {
	gap: 12px;
}
</style>
