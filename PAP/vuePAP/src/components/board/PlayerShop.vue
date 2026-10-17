<script setup>
import { computed, ref } from "vue"
import { APPARATUS, DISPENSATIONS, INGREDIENTS, INGREDIENT_INFO, PAPERWORK, ROSTER_LIMITS, TESTIMONIALS, TILES } from "../../js/engine/cards.js"
import { availableHype, kettleCapacity, venueInfo } from "../../js/engine/state.js"
import { condemnRisk, condemnText, craftable, projectedScore, spoilRisk, upgradeStatus, vpText, yearEarned } from "../../js/PAPhints.js"
import { useModelStore } from "../../stores/PAPstore.js"
import { usePersonalStore } from "../../stores/PAPpersonal.js"
import staffApprentice from "../../assets/art/staff-apprentice.svg?raw"
import staffJourneyman from "../../assets/art/staff-journeyman.svg?raw"
import staffMaster from "../../assets/art/staff-master.svg?raw"
import potionRaw from "../../assets/art/potion.svg?raw"
import ArtIcon from "./ArtIcon.vue"
import CardBack from "./CardBack.vue"
import MiniRecipe from "./MiniRecipe.vue"
import PotionChip from "./PotionChip.vue"
import TokenPip from "./TokenPip.vue"
import { ICONS } from "./icons.js"
import { FAMILY, FAMILY_LEGEND, seatColour } from "./shared.js"

const props = defineProps({
	seat: { type: Number, required: true },
	active: { type: Boolean, default: false },
})

const store = useModelStore()
const personal = usePersonalStore()
const s = computed(() => store.viewGame)
const p = computed(() => s.value.players[props.seat])
const isMe = computed(() => props.seat === personal.pov)
const colour = computed(() => seatColour(props.seat))
// Rival shops start compact (header, tracks, cauldron, kettle); the viewer's own shop is always full.
const expanded = ref(false)
const full = computed(() => isMe.value || expanded.value)
const shift = computed(() => s.value.phase === "shift")

// Hints only for the viewer: they read the viewer's own Poison, Kettle and Levy.
const craft = computed(() => (isMe.value ? craftable(s.value, props.seat) : {}))
const upgrade = computed(() => (isMe.value ? upgradeStatus(s.value, props.seat) : null))
const spoil = computed(() => (isMe.value && s.value.phase === "audit" ? spoilRisk(s.value, props.seat).atRisk : []))
const risk = computed(() => (isMe.value && (s.value.phase === "street" || s.value.phase === "audit") ? condemnRisk(s.value, props.seat) : null))
const earned = computed(() => yearEarned(s.value, props.seat))
const openSlots = computed(() => Math.max(0, ROSTER_LIMITS[p.value.tier].total - p.value.staff.length))
const gaugeMax = computed(() => Math.max(10, p.value.reputation, risk.value ? risk.value.counted : 0))
const venueName = id => venueInfo(id).name
const pct = n => Math.max(0, Math.min(100, (n / gaugeMax.value) * 100)) + "%"
const gaugeLabel = computed(() => (risk.value ? (risk.value.condemned ? condemnText(risk.value) : "Warnings " + risk.value.counted + ", Reputation " + risk.value.reputation + ": condemned at Audit if Warnings exceed Reputation") : ""))
// Final Victory Points once the game is over (they match FinalScores), else what this seat would score if it ended now.
const score = computed(() => (s.value.result ? s.value.result.rows.find(r => r.seat === props.seat) : projectedScore(s.value, props.seat)))

const STAFF_SVG = { apprentice: staffApprentice, journeyman: staffJourneyman, master: staffMaster }
const TILE_NAME = Object.fromEntries(TILES.map(t => [t.id, t.name]))

// A tile is only meaningful once this Year's Shift has started; the shift resets it.
function workedTile(st) {
	return s.value.phase !== "post" && st.actedThisYear && st.tile ? st.tile : null
}

function staffLabel(st) {
	const tile = workedTile(st)
	const rank = st.rank[0].toUpperCase() + st.rank.slice(1)
	const work = tile ? "worked " + TILE_NAME[tile] + " this Year" : "idle this Year"
	return rank + ": " + work + (st.hiredYear === s.value.year ? ". New hire, cannot act until next Year" : "")
}

const hypeLabel = computed(() => "Hype: " + availableHype(p.value) + " available" + (p.value.lockedHype ? ", " + p.value.lockedHype + " locked" : ""))
const warnLabel = computed(() => "Warnings: " + p.value.warnings)
const kettleLabel = computed(() => "Kettle: " + p.value.potions.length + " of " + kettleCapacity(p.value) + " bottles")
const emptyBottles = computed(() => Math.max(0, kettleCapacity(p.value) - p.value.potions.length))
</script>

<template>
	<section class="shop" :class="{ compact: !full, active }" :style="{ borderColor: colour, boxShadow: active ? '0 0 0 2px #fff, 0 0 14px 4px ' + colour : null }">
		<header class="band" :style="{ backgroundColor: colour }">
			<span class="name">{{ p.name }}</span>
			<span v-if="isMe" class="tag">You</span>
			<span class="vpPip" :title="(s.result ? 'Final Victory Points: ' : 'Victory Points if the game ended now: ') + vpText(score)">
				<span aria-hidden="true">★</span> VP <b>{{ score.vp }}</b>
			</span>
			<span class="status">
				<ArtIcon v-if="s.first === seat" :name="ICONS.firstPlayer.art" :size="18" :label="ICONS.firstPlayer.label + ': leads this Year\'s turn order'" />
				<ArtIcon v-if="s.watch === seat" :name="ICONS.watch.art" :size="18" :label="ICONS.watch.label + ': watched for next Year\'s Ruin Check'" />
				<ArtIcon v-if="s.administered === seat" :name="ICONS.administration.art" :size="18" :label="ICONS.administration.label + ': cannot claim First Player, names a rival, gains a Warning'" />
				<ArtIcon v-if="p.franchise" :name="ICONS.franchise.art" :size="18" :label="ICONS.franchise.label + ': one extra customer slot, +8 Crown premium on real sales'" />
			</span>
			<button v-if="!isMe" type="button" class="toggle" :aria-expanded="full" :title="full ? 'Show less of this shop' : 'Show this shop in full'" @click="expanded = !expanded">
				{{ full ? "Less" : "More" }}
			</button>
		</header>

		<div class="body">
			<div class="tracks">
				<TokenPip icon="crown" :value="p.cash" :label="'Cash: ' + p.cash + ' Crowns'" />
				<TokenPip icon="vp" :value="p.recognized" :label="ICONS.recognized.label + ': ' + p.recognized" />
				<TokenPip v-if="s.phase === 'audit'" icon="vp" :value="(earned >= 0 ? '+' : '') + earned" :label="'Recognized Profit earned this Year: ' + earned" />
				<TokenPip icon="hype" :value="availableHype(p)" :locked="p.lockedHype" :label="hypeLabel" />
				<TokenPip icon="reputation" :value="p.reputation" :label="'Reputation: ' + p.reputation" />
				<span class="warnings" role="img" :title="warnLabel" :aria-label="warnLabel">
					<ArtIcon v-for="i in Math.min(p.warnings, 5)" :key="i" :name="ICONS.warning.art" :size="20" />
					<b v-if="p.warnings > 5">×{{ p.warnings }}</b>
					<b v-else-if="p.warnings === 0" class="none">0</b>
				</span>
				<span v-if="risk" class="gauge" :class="{ condemned: risk.condemned }" role="img" :title="gaugeLabel" :aria-label="gaugeLabel">
					<span class="bar"><i class="rep" :style="{ width: pct(p.reputation) }"></i></span>
					<span class="bar"><i class="warn" :style="{ width: pct(risk.counted) }"></i></span>
				</span>
				<TokenPip v-if="isMe && p.levyOwed" icon="levy" :value="p.levyOwed" :label="'Compliance Levy owed: ' + p.levyOwed + ' Crowns (only you see this)'" :class="s.phase === 'audit' ? 'hot' : 'cool'" />
			</div>

			<div class="cauldronKettle">
				<div class="cauldron" role="img" :title="'Cauldron tier ' + p.tier" :aria-label="'Cauldron tier ' + p.tier">
					<ArtIcon :name="ICONS.tier(p.tier).art" :size="64" :label="ICONS.tier(p.tier).label" />
					<span class="tier">{{ p.tier }}</span>
				</div>
				<div class="kettle" role="group" :title="kettleLabel" :aria-label="kettleLabel">
					<PotionChip v-for="pot in p.potions" :key="pot.id" :potion="pot" :owner="seat" :spoil="spoil.includes(pot.id)" compact />
					<span v-for="i in emptyBottles" :key="'empty' + i" class="emptyBottle" aria-hidden="true"><span v-html="potionRaw"></span></span>
				</div>
			</div>

			<template v-if="full">
				<div v-if="upgrade && upgrade.nextTier" class="block upgrade" :class="{ dimmed: !shift }">
					<div class="label">Cauldron upgrade to tier {{ upgrade.nextTier }}</div>
					<div class="shelfRow">
						<ArtIcon :name="ICONS.tier(upgrade.nextTier).art" :size="28" :label="ICONS.tier(upgrade.nextTier).label" />
						<span class="cost" :class="{ lacking: p.cash < upgrade.crowns }" :title="upgrade.crowns + ' Crowns'">
							<ArtIcon :name="ICONS.cash.art" :size="16" :label="ICONS.cash.label" />{{ upgrade.crowns }}
						</span>
						<span v-for="(n, k) in upgrade.ingredients" :key="k" class="cost" :class="{ lacking: upgrade.missing[k] }">
							<template v-if="k === 'any'">{{ n }} any</template>
							<template v-else><ArtIcon v-for="i in n" :key="i" :name="k" :size="16" :label="INGREDIENT_INFO[k].name" /></template>
						</span>
						<b v-if="upgrade.affordable" class="ok" title="Affordable now">✓</b>
					</div>
				</div>

				<div class="block">
					<div class="tracks">
						<TokenPip v-for="k in INGREDIENTS" :key="k" :icon="k" :value="'×' + p.ingredients[k]" :label="INGREDIENT_INFO[k].name + ': ' + p.ingredients[k]" />
					</div>
				</div>

				<div class="block">
					<div class="label">Staff</div>
					<div class="staffRow">
						<div
							v-for="st in p.staff"
							:key="st.id"
							class="staffCard"
							:class="{ newHire: st.hiredYear === s.year, idle: shift && isMe && !st.actedThisYear && st.hiredYear < s.year, spent: shift && isMe && st.actedThisYear }"
							role="group"
							:title="staffLabel(st)"
							:aria-label="staffLabel(st)"
						>
							<span class="meeple" :style="{ color: colour }" v-html="STAFF_SVG[st.rank]"></span>
							<ArtIcon v-if="workedTile(st)" :name="ICONS.tile(workedTile(st)).art" :size="26" :label="ICONS.tile(workedTile(st)).label" />
							<span v-else class="idleMark" aria-hidden="true"></span>
							<span v-if="st.hiredYear === s.year" class="zz" aria-hidden="true">zz</span>
						</div>
						<template v-if="shift">
							<span v-for="i in openSlots" :key="'open' + i" class="openSlot" title="Open roster slot" v-html="STAFF_SVG.apprentice"></span>
						</template>
						<span v-if="p.staff.length === 0 && !shift" class="muted">none</span>
					</div>
				</div>

				<div class="block">
					<div class="label">Recipes</div>
					<div class="shelfRow">
						<MiniRecipe
							v-for="id in p.recipes"
							:key="id"
							:recipe-id="id"
							:dim="shift && isMe && !craft[id].ok"
							:missing="shift && isMe ? craft[id].missing : null"
						/>
					</div>
				</div>

				<div class="block">
					<div class="label" :title="FAMILY_LEGEND">Dispensations</div>
					<div class="shelfRow">
						<span v-if="p.dispensations.length === 0" class="muted">none</span>
						<span
							v-for="id in p.dispensations"
							:key="id"
							class="chip"
							:style="{ borderLeftColor: FAMILY[DISPENSATIONS[id].family].colour }"
							:title="DISPENSATIONS[id].name + ' (' + FAMILY[DISPENSATIONS[id].family].name + '): ' + DISPENSATIONS[id].text"
						>{{ DISPENSATIONS[id].name }}</span>
					</div>
				</div>

				<div class="block">
					<div class="label">Apparatus</div>
					<div class="shelfRow">
						<span v-if="p.apparatus.length === 0" class="muted">none</span>
						<span v-for="id in p.apparatus" :key="id" class="chip" :title="APPARATUS[id].name + ': ' + APPARATUS[id].text">
							<ArtIcon :name="ICONS.apparatus(id).art" :size="18" :label="ICONS.apparatus(id).label" />{{ APPARATUS[id].name }}
						</span>
					</div>
				</div>

				<div class="block">
					<div class="label">Testimonials</div>
					<div class="shelfRow">
						<span v-if="p.testimonials.length === 0" class="muted">none</span>
						<span v-for="id in p.testimonials" :key="id" class="chip" :title="TESTIMONIALS[id].name + ': ' + TESTIMONIALS[id].text">
							<span v-if="TESTIMONIALS[id].effect.type === 'demandMagnet'" class="venueThumb">
								<ArtIcon :name="'venue-' + TESTIMONIALS[id].effect.venue" :size="36" />
							</span>
							<ArtIcon v-else :name="ICONS.testimonial.art" :size="18" :label="TESTIMONIALS[id].name" />
						</span>
					</div>
				</div>

				<div class="block">
					<div class="label">Founder's Seals</div>
					<div class="shelfRow">
						<span v-if="p.seals.length === 0" class="muted">none</span>
						<span v-for="id in p.seals" :key="id" class="chip" :title="'Founder\'s Seal: ' + venueName(id)">
							<ArtIcon name="seal" :size="16" />
							<span class="venueThumb"><ArtIcon :name="'venue-' + id" :size="36" /></span>
						</span>
					</div>
				</div>

				<div class="block">
					<div class="label">Paperwork</div>
					<div v-if="isMe" class="shelfRow">
						<span v-if="p.hand.length === 0" class="muted">none</span>
						<span v-for="(id, i) in p.hand" :key="i" class="paperCard" :title="PAPERWORK[id].name + ': ' + PAPERWORK[id].text">
							<ArtIcon :name="ICONS.paper(id).art" :size="34" :label="PAPERWORK[id].name" />
							<span>{{ PAPERWORK[id].name }}</span>
						</span>
					</div>
					<div v-else class="shelfRow">
						<CardBack kind="paperwork" fan :count="p.hand.length" :title="p.hand.length + ' Paperwork in hand (hidden)'" :size="40" />
					</div>
				</div>
			</template>
		</div>
	</section>
</template>

<style scoped>
.shop {
	box-sizing: border-box;
	border: 3px solid #888;
	border-radius: 6px;
	margin: 8px;
	overflow: hidden;
	background-color: #fbf8ef;
	text-align: left;
	font-size: 13px;
}
.shop.compact {
	align-self: flex-start;
}
.shop.active .name {
	text-shadow: 0 0 6px #fff, 0 0 2px #fff;
}
.band {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
	font-size: 15px;
}
.band .artIcon {
	filter: drop-shadow(0 0 1px #000);
}
.name {
	font-weight: bold;
}
.vpPip {
	display: inline-flex;
	align-items: baseline;
	gap: 3px;
	padding: 0 8px;
	border: 2px solid #3a2e1f;
	border-radius: 12px;
	background-color: #fff3c4;
	font-size: 14px;
	font-weight: bold;
	color: #111;
	white-space: nowrap;
}
.vpPip b {
	font-size: 18px;
}
.tag {
	border: 1px solid #fff;
	border-radius: 9px;
	padding: 0 6px;
	font-size: 11px;
	background-color: rgba(255, 255, 255, 0.2);
}
.status {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-left: auto;
}
.toggle {
	border: 1px solid #fff;
	border-radius: 9px;
	padding: 0 8px;
	background-color: rgba(255, 255, 255, 0.2);
	color: #fff;
	font-size: 12px;
	cursor: pointer;
}
.body {
	padding: 6px 8px 8px;
}
.tracks,
.shelfRow,
.cauldronKettle {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
}
.tracks {
	padding-bottom: 6px;
}
.cool {
	opacity: 0.55;
}
.hot {
	box-shadow: 0 0 0 2px #e0a030;
	border-radius: 16px;
}
.warnings {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 0 4px;
}
.warnings b {
	font-size: 14px;
}
.gauge {
	display: inline-flex;
	flex-direction: column;
	gap: 2px;
	width: 90px;
	padding: 0 2px;
}
.gauge .bar {
	display: block;
	height: 8px;
	border: 1px solid #666;
	border-radius: 4px;
	background-color: #fff;
	overflow: hidden;
}
.gauge i {
	display: block;
	height: 100%;
}
.gauge .rep {
	background-color: #4a8fc7;
}
.gauge .warn {
	background-color: #e0a030;
}
.gauge.condemned {
	outline: 2px solid #d84343;
	border-radius: 4px;
}
.gauge.condemned .warn {
	background-color: #d84343;
}
.none {
	color: #999;
}
.block {
	border-top: 1px dashed #bbb;
	padding: 6px 0 2px;
}
.block.upgrade.dimmed {
	opacity: 0.55;
}
.upgrade .cost {
	display: inline-flex;
	align-items: center;
	gap: 1px;
}
.upgrade .lacking {
	opacity: 0.4;
	text-decoration: line-through;
}
.upgrade .ok {
	color: #2f6b2f;
	font-size: 16px;
}
.label {
	font-weight: bold;
	font-size: 12px;
	color: #444;
	margin-bottom: 4px;
}
.cauldronKettle {
	align-items: flex-end;
	padding: 4px 0;
	border-top: 1px dashed #bbb;
}
.cauldron {
	position: relative;
	flex: none;
}
.tier {
	position: absolute;
	right: -4px;
	bottom: -2px;
	min-width: 18px;
	border: 2px solid #2b2233;
	border-radius: 9px;
	background-color: #fff;
	font-size: 12px;
	font-weight: bold;
	text-align: center;
	line-height: 14px;
}
.kettle {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 6px;
	min-height: 40px;
}
.emptyBottle {
	display: inline-block;
	width: 28px;
	height: 36px;
	box-sizing: border-box;
	border: 2px dashed #aaa;
	border-radius: 6px;
	padding: 2px 0 0;
	color: #bbb;
	text-align: center;
	opacity: 0.8;
}
.emptyBottle :deep(svg) {
	width: 20px;
	height: auto;
	display: block;
	margin: 0 auto;
	opacity: 0.35;
}
.staffRow {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: flex-end;
}
.staffCard {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	min-width: 34px;
}
.staffCard.newHire {
	opacity: 0.45;
}
.staffCard.spent .meeple {
	opacity: 0.35;
}
.staffCard.idle .meeple {
	filter: drop-shadow(0 0 2px #e0a030);
}
.openSlot {
	display: inline-block;
	box-sizing: border-box;
	width: 30px;
	height: 40px;
	border: 1px dashed #999;
	border-radius: 6px;
	padding: 2px 0 0;
	text-align: center;
}
.openSlot :deep(svg) {
	width: 22px;
	height: auto;
	display: block;
	margin: 0 auto;
	opacity: 0.2;
}
.meeple :deep(svg) {
	width: 28px;
	height: auto;
	display: block;
}
.idleMark {
	display: inline-block;
	width: 22px;
	height: 14px;
	border-bottom: 2px dotted #aaa;
}
.zz {
	position: absolute;
	top: -6px;
	right: -6px;
	border: 1px solid #889;
	border-radius: 8px;
	padding: 0 3px;
	background-color: #eef;
	font-size: 10px;
	font-weight: bold;
}
.chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	border: 1px solid #b8ab8c;
	border-left-width: 4px;
	border-radius: 10px;
	padding: 1px 8px 1px 6px;
	background-color: #fff;
	font-size: 12px;
}
.venueThumb {
	display: inline-flex;
	line-height: 0;
}
.venueThumb :deep(img) {
	border-radius: 3px;
}
.muted {
	color: #666;
	font-size: 12px;
}
.paperCard {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	width: 78px;
	font-size: 12px;
	text-align: center;
	line-height: 1.15;
}
</style>
