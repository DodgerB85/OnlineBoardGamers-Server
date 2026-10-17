<script setup>
// Corner legend built from the icon registry, so it always matches what the board shows.
import { ref, watch } from "vue"
import { INGREDIENTS, RANKS, TILES } from "../../js/engine/cards.js"
import ArtIcon from "./ArtIcon.vue"
import { ICONS, MOODS } from "./icons.js"

const SECTIONS = [
	["Tracks", ["cash", "recognized", "hype", "lockedHype", "reputation", "warning", "levy"].map(k => ICONS[k])],
	["Venues", ["anchor", "overhead", "tolerance", "founderCut", "boone", "seal", "preference", "reward"].map(k => ICONS[k])],
	["Shops", ["firstPlayer", "watch", "administration", "franchise", "review", "testimonial", "poison", "kettleSlot"].map(k => ICONS[k])],
	["Ingredients", INGREDIENTS.map(ICONS.ingredient)],
	["Staff", RANKS.map(ICONS.staff)],
	["Workshop", TILES.map(t => ICONS.tile(t.id))],
]

// Remembered per viewer; storage can be unavailable, so it is only a convenience.
let saved = false
try {
	saved = localStorage.getItem("papLegendOpen") === "1"
} catch {
	saved = false
}
const open = ref(saved)
watch(open, v => {
	try {
		localStorage.setItem("papLegendOpen", v ? "1" : "0")
	} catch {
		// ignore: the legend just will not remember its state
	}
})
</script>

<template>
	<aside class="iconLegend" :class="{ open }">
		<button class="toggle" :aria-expanded="open" @click="open = !open">{{ open ? "Hide legend ✕" : "Legend ?" }}</button>
		<div v-if="open" class="body">
			<section v-for="[title, items] in SECTIONS" :key="title">
				<h4>{{ title }}</h4>
				<ul>
					<li v-for="item in items" :key="item.art"><ArtIcon :name="item.art" :size="20" /> <span>{{ item.label }}</span></li>
				</ul>
			</section>
			<section>
				<h4>Customer mood</h4>
				<ul>
					<li v-for="(m, key) in MOODS" :key="key"><span class="mood" :style="{ color: m.colour }">{{ m.shape }}</span> <span>{{ m.label }}</span></li>
				</ul>
			</section>
		</div>
	</aside>
</template>

<style scoped>
.iconLegend {
	position: fixed;
	right: 12px;
	bottom: 12px;
	z-index: 50;
	max-width: min(360px, calc(100vw - 24px));
	text-align: left;
	font-size: 13px;
}
.toggle {
	display: block;
	margin-left: auto;
	border: 2px solid #888;
	border-radius: 14px;
	padding: 4px 12px;
	background-color: #fbf8ef;
	font-weight: bold;
	cursor: pointer;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
.body {
	margin-top: 6px;
	max-height: min(70vh, 640px);
	overflow-y: auto;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 6px 10px;
	background-color: #fbf8ef;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}
h4 {
	margin: 6px 0 2px;
	font-size: 13px;
	color: #5b4a2f;
}
ul {
	margin: 0;
	padding: 0;
	list-style: none;
	display: grid;
	grid-template-columns: 1fr;
	gap: 2px;
}
li {
	display: flex;
	align-items: center;
	gap: 6px;
}
.mood {
	width: 28px;
	text-align: center;
	font-size: 20px;
}
</style>
