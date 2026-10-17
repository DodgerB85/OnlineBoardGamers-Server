<script setup>
import { computed } from "vue"
import { CHARTERS, INGREDIENT_INFO, RECIPES } from "../../js/engine/cards.js"
import { availableHype, recognizedLeader, venueInfo } from "../../js/engine/state.js"
import { useModelStore } from "../../stores/PAPstore.js"
import { usePersonalStore } from "../../stores/PAPpersonal.js"
import ArtIcon from "./ArtIcon.vue"
import { MOOD_COLOURS, STAR_COLOURS, seatColour } from "./shared.js"

const store = useModelStore()
const personal = usePersonalStore()
const s = computed(() => store.viewGame)

// What the viewer holds of a charter's good: that ingredient, potions of that star class, or Hype to pledge.
function stockOf(c) {
	const p = s.value.players[personal.pov]
	if (!p) return 0
	const t = CHARTERS[c.charterId].target
	if (t.type === "ingredient") return p.ingredients[t.kind]
	if (t.type === "recipeClass") return p.potions.filter(pot => RECIPES[pot.recipe].stars === t.stars).length
	return availableHype(p)
}

// The viewer's contribution would fill the last slot and found the charter: not the Recognized leader, not frozen, not under a Boone.
function canFound(c) {
	const review = s.value.council.review
	if (!s.value.players[personal.pov] || c.contributedBy.includes(personal.pov) || stockOf(c) < 1 || venueOf(c).boone) return false
	return c.progress + 1 >= CHARTERS[c.charterId].threshold && recognizedLeader(s.value) !== personal.pov && !(review && review.frozen === personal.pov)
}

// The good a charter asks for: an icon, how many stars (potions only), and the printed wording.
function targetOf(charterId) {
	const t = CHARTERS[charterId].target
	if (t.type === "ingredient") return { icon: t.kind, stars: 0, text: "Contribute 1 " + INGREDIENT_INFO[t.kind].name }
	if (t.type === "recipeClass") return { icon: "potion", stars: t.stars, text: "Contribute 1 " + t.stars + "-star potion" }
	return { icon: "hype", stars: 0, text: "Pledge " + t.hype + " Hype" }
}

function seatName(seat) {
	return s.value.players[seat].name
}

function venueOf(c) {
	return s.value.venues.find(v => v.id === c.venue)
}

function progressText(c) {
	const names = c.contributedBy.length ? c.contributedBy.map(seatName).join(", ") : "none yet"
	return `Progress ${c.progress} of ${CHARTERS[c.charterId].threshold}. Contributors: ${names}`
}

// Slot i takes the colour of the i-th contributor; a Public Review contribution counts double, so the last one can fill two.
function slotColour(c, i) {
	const seat = c.contributedBy[Math.min(i, c.contributedBy.length - 1)]
	return seatColour(seat)
}
</script>

<template>
	<section class="panel" :class="{ recede: s.phase !== 'post' }">
		<h3>Civic Charters</h3>
		<p v-if="s.council.open.length === 0" class="muted">No open charters.</p>

		<div v-for="c in s.council.open" :key="c.charterId" class="charterDoc" :class="{ mine: c.contributedBy.includes(personal.pov) }" :title="CHARTERS[c.charterId].text">
			<div class="docTop">
				<ArtIcon
					class="thumb"
					:name="'venue-' + c.venue"
					:size="72"
					:label="venueInfo(c.venue).name"
					:style="{ borderColor: MOOD_COLOURS[venueOf(c).mood] }"
				/>
				<div class="docTitle">
					<div class="charterName">{{ CHARTERS[c.charterId].name }}</div>
					<div class="docRow">
						<span class="target" role="img" :title="targetOf(c.charterId).text" :aria-label="targetOf(c.charterId).text">
							<ArtIcon :name="targetOf(c.charterId).icon" :size="20" />
							<span v-if="targetOf(c.charterId).stars" class="stars" :style="{ color: STAR_COLOURS[targetOf(c.charterId).stars] }">{{ "★".repeat(targetOf(c.charterId).stars) }}</span>
							<b>×1</b>
						</span>
						<span v-if="personal.pov >= 0" class="stock" :title="'You hold ' + stockOf(c)">{{ stockOf(c) }} yours</span>
						<span v-if="canFound(c)" class="found" title="Your contribution completes this charter">
							<ArtIcon name="seal" :size="16" label="Founder's Seal" /> you could found it
						</span>
						<span class="venueTag">{{ venueInfo(c.venue).name }}</span>
					</div>
				</div>
			</div>

			<div class="docBottom">
				<div class="slots" role="img" :title="progressText(c)" :aria-label="progressText(c)">
					<span
						v-for="i in CHARTERS[c.charterId].threshold"
						:key="i"
						class="slot"
						:class="{ filled: i <= c.progress }"
						:style="i <= c.progress ? { backgroundColor: slotColour(c, i - 1) } : null"
					></span>
				</div>
				<div class="rewards">
					<ArtIcon
						name="boone"
						:size="20"
						:label="'Civic Boone at ' + venueInfo(c.venue).name + ': +1 Hype per sale, +1 customer slot until Audit'"
					/>
					<ArtIcon
						name="seal"
						:size="20"
						label="Founder's Seal to the contributor who completes it, unless they lead on Recognized Profit or are frozen"
					/>
				</div>
			</div>
		</div>

		<div v-if="s.council.review" class="review" role="status">
			<ArtIcon name="seal" :size="18" :label="'Public Review called by ' + seatName(s.council.review.caller)" />
			<b>Public Review</b>
			<span class="frozen" :title="seatName(s.council.review.frozen) + ' is frozen out of the civic lane'" :aria-label="seatName(s.council.review.frozen) + ' is frozen'">
				{{ seatName(s.council.review.frozen) }}
			</span>
			<span class="opps" :title="'Opportunities left: ' + s.council.review.opportunities">{{ s.council.review.opportunities }} left</span>
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
	margin: 4px 0 8px;
	font-size: 15px;
}
.muted {
	color: #666;
}
.charterDoc {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-bottom: 8px;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 6px;
	background-color: #fbf8ef;
}
.docTop {
	display: flex;
	gap: 8px;
	align-items: center;
}
.thumb {
	flex: none;
	border: 2px solid #bbb;
	border-radius: 4px;
	object-fit: cover;
}
.docTitle {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}
.charterName {
	font-weight: bold;
	font-size: 14px;
	line-height: 1.2;
}
.docRow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
}
.target {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	border: 1px solid #b8ab8c;
	border-radius: 12px;
	padding: 1px 8px 1px 4px;
	background-color: #fff;
}
.stars {
	font-size: 14px;
	letter-spacing: -2px;
}
.venueTag {
	font-size: 11px;
	color: #555;
}
.docBottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}
.slots {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}
.slot {
	width: 16px;
	height: 16px;
	box-sizing: border-box;
	border: 2px dashed #888;
	border-radius: 4px;
	background-color: #fff;
}
.slot.filled {
	border: 2px solid #2b2233;
}
.rewards {
	display: flex;
	gap: 4px;
	flex: none;
}
.review {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	border: 1px dashed #996;
	border-radius: 6px;
	padding: 4px 8px;
	background-color: #fbf8ef;
}
.frozen {
	border: 1px solid #6a9ab5;
	border-radius: 10px;
	padding: 0 6px;
	background-color: #e4f1f8;
}
.opps {
	margin-left: auto;
	color: #555;
}
.panel.recede {
	opacity: 0.6;
}
.charterDoc.mine {
	border-color: #6a9a4a;
}
.stock {
	font-size: 12px;
	color: #444;
}
.found {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	font-size: 12px;
	font-weight: bold;
	color: #2f6b2f;
}
</style>
