<script setup>
// shift: assign each idle staff member to a Workshop tile, apparatus actions, then done.
import { computed, reactive, ref } from "vue"
import * as controller from "../../js/PAPcontroller"
import { APPARATUS, APPARATUS_SLOTS, DISPENSATIONS, HIRE_COST, INGREDIENTS, INGREDIENT_INFO, RANKS, RECIPES, ROSTER_LIMITS, TILES, UPGRADES } from "../../js/engine/cards.js"
import { ingredientCost } from "../../js/engine/workshop.js"
import { upgradeStatus } from "../../js/PAPhints.js"
import { ICONS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"
import CostRow from "./CostRow.vue"
import CraftForm from "./CraftForm.vue"
import { craftPayload, craftReady, craftWhy, newCraft } from "./shared.js"

const props = defineProps({ prompt: Object, state: Object })
const me = computed(() => props.prompt.seat)
const p = computed(() => props.state.players[me.value])
const rank = r => RANKS.indexOf(r)
const nextRank = r => RANKS[rank(r) + 1]
const countRank = r => p.value.staff.filter(x => x.rank === r).length
const rosterOpen = r => p.value.staff.length < ROSTER_LIMITS[p.value.tier].total && countRank(r) < ROSTER_LIMITS[p.value.tier][r]
const spent = key => p.value.usedOnce[key] === props.state.year
const isIdle = st => !st.actedThisYear && st.hiredYear < props.state.year
const noIdle = computed(() => !p.value.staff.some(isIdle))
// A toll applies to tiles marked tolled, unless this seat is First Player.
const tolled = t => t.tolled && me.value !== props.state.first

// 1. Staff, 2. tile (filtered by rank)
const staffId = ref(null)
const staff = computed(() => p.value.staff.find(x => x.id === staffId.value))
const tileId = ref(null)
const pickStaff = id => {
	staffId.value = id
	tileId.value = null
}
const tiles = computed(() => (staff.value ? TILES.filter(t => rank(staff.value.rank) >= rank(t.minRank)) : []))
const tile = computed(() => tiles.value.find(t => t.id === tileId.value))
const quarryGood = computed(() => (tile.value?.id === "mushroomCrown" ? "toad" : tile.value?.id === "crystalQuarry" ? "crystal" : null))
const hireRanks = computed(() => RANKS.filter(r => rank(r) <= rank(staff.value?.rank)))

// Tile forms. Each keeps its own choice; choice() turns the one for the chosen tile into the action's choice.
const coop = reactive({ mode: "take", kind: "crystal", hireRank: "apprentice" })
const quarry = reactive({ mode: "two", kind: "crystal" })
const craft = reactive(newCraft())
const alch = reactive({ mode: "side", id: "", take: ["crystal", "toad"] })
const cauld = reactive({ mode: "upgrade", promote: "", take: ["crystal", "toad", "quick"], pay: { crystal: 0, toad: 0, quick: 0, banshee: 0 } })
const paid = k => Number(cauld.pay[k]) || 0

const alchCards = computed(() => {
	const deck = { disp: "dispensations", app: "apparatus", recipe: "marketRecipes" }[alch.mode]
	if (!deck) return []
	const owned = { disp: p.value.dispensations, app: p.value.apparatus, recipe: p.value.recipes }[alch.mode]
	const label = { disp: id => DISPENSATIONS[id].name, app: id => APPARATUS[id].name, recipe: id => RECIPES[id].name }[alch.mode]
	return props.state.decks[deck].filter(id => !owned.includes(id)).map(id => ({ id, name: label(id) }))
})
const pickAlch = mode => {
	alch.mode = mode
	alch.id = ""
}

// Cauldron Works upgrade. Status comes from PAPhints; the pay inputs below build the action.
const up = computed(() => UPGRADES[p.value.tier + 1])
const status = computed(() => upgradeStatus(props.state, me.value))
const fixedNeed = computed(() => Object.entries(up.value?.ingredients || {}).filter(([k]) => k !== "any"))
const fixedCost = computed(() => Object.fromEntries(fixedNeed.value))
const missingFixed = computed(() => Object.fromEntries(Object.entries(status.value.missing).filter(([k]) => k !== "any")))
const anyNeed = computed(() => up.value?.ingredients.any || 0)
const payTotal = computed(() => INGREDIENTS.reduce((n, k) => n + paid(k), 0))
const upgradeOk = computed(() => {
	if (!up.value || p.value.upgradedThisYear || rank(staff.value?.rank) < rank(up.value.rank) || p.value.cash < up.value.crowns) return false
	const fixedSum = fixedNeed.value.reduce((n, [, m]) => n + m, 0)
	return fixedNeed.value.every(([k, m]) => paid(k) >= m) && payTotal.value === fixedSum + anyNeed.value && INGREDIENTS.every(k => paid(k) <= p.value.ingredients[k])
})
// Promote: the piece itself or an idle staff member, into a rank with an open roster slot (R47).
const promoteCandidates = computed(() =>
	p.value.staff.filter(st => (st.id === staffId.value || st.tile === null) && nextRank(st.rank) && countRank(nextRank(st.rank)) < ROSTER_LIMITS[p.value.tier][nextRank(st.rank)]),
)

// Why Assign is off, one line. Only read when the button is disabled.
const why = computed(() => {
	switch (tile.value.id) {
		case "coop":
			return rosterOpen(coop.hireRank) ? "Not enough Crowns to hire" : "No open roster slot for that rank"
		case "kettle":
			return craftWhy(craft)
		case "streetAlchemist":
			if (alch.mode === "side") return "The side deck is empty"
			if (alch.mode === "app" && APPARATUS_SLOTS[p.value.tier] <= p.value.apparatus.length) return "No free Apparatus slot at Tier " + p.value.tier
			return "Pick a card to draft"
		case "cauldronWorks":
			if (cauld.mode === "promote") return "Pick the staff member to promote"
			if (cauld.mode === "take") return "Only a Master can take three ingredients"
			if (!up.value) return "The Cauldron is already Tier 4"
			if (p.value.upgradedThisYear) return "Already upgraded this Year"
			if (rank(staff.value.rank) < rank(up.value.rank)) return "Upgrading to tier " + (p.value.tier + 1) + " needs a " + up.value.rank
			if (p.value.cash < up.value.crowns) return "Not enough Crowns: the upgrade costs " + up.value.crowns
			return "Pay the upgrade's ingredients from your stock"
	}
	return ""
})

const ready = computed(() => {
	if (!staff.value || !tile.value || !isIdle(staff.value)) return false
	switch (tile.value.id) {
		case "coop":
			return coop.mode === "take" || (rank(coop.hireRank) <= rank(staff.value.rank) && rosterOpen(coop.hireRank) && p.value.cash >= HIRE_COST[coop.hireRank])
		case "kettle":
			return craftReady(craft)
		case "streetAlchemist":
			if (alch.mode === "side") return props.state.decks.side.length > 0
			if (alch.mode === "take") return alch.take.every(Boolean)
			if (alch.mode === "app" && APPARATUS_SLOTS[p.value.tier] <= p.value.apparatus.length) return false
			return !!alch.id
		case "cauldronWorks":
			if (cauld.mode === "promote") return !!cauld.promote
			if (cauld.mode === "take") return staff.value.rank === "master" && cauld.take.every(Boolean)
			return upgradeOk.value
		default:
			return true
	}
})

function choice() {
	switch (tile.value.id) {
		case "coop":
			return coop.mode === "take" ? { kind: coop.kind } : { hire: coop.hireRank }
		case "mushroomCrown":
		case "crystalQuarry":
			return quarry.mode === "two" ? { mode: "two" } : { mode: "mixed", kind: quarry.kind }
		case "kettle":
			return craftPayload(craft)
		case "streetAlchemist":
			if (alch.mode === "take") return { take: [...alch.take] }
			if (alch.mode === "side") return { draft: "side" }
			return { draft: alch.mode, id: alch.id }
		case "cauldronWorks":
			if (cauld.mode === "promote") return { promote: cauld.promote }
			if (cauld.mode === "take") return { take: [...cauld.take] }
			return { upgrade: true, pay: Object.fromEntries(INGREDIENTS.map(k => [k, paid(k)])) }
	}
	return {}
}

const assign = () => controller.act({ type: "assign", staffId: staffId.value, tile: tileId.value, choice: choice() })

// Apparatus (not tied to a staff member). The Second Kettle gets its own craft form.
const kettle2 = reactive(newCraft())
const frac = reactive({ from: "", to: "" })
const heldKinds = computed(() => INGREDIENTS.filter(k => p.value.ingredients[k] > 0))
const secondKettle = () => controller.act({ type: "secondKettle", ...craftPayload(kettle2) })
const fractionate = () => controller.act({ type: "fractionator", from: frac.from, to: [frac.to, frac.to] })
</script>

<template>
	<div>
		<div class="pp-section">
			<h4 v-if="!noIdle">1. Pick an idle staff member</h4>
			<p v-else class="pp-note"><b>No idle staff left — finish your shift</b></p>
			<div class="pp-row">
				<button v-for="(st, i) in p.staff" :key="st.id" class="pp-btn" :class="{ sel: st.id === staffId }" :disabled="!isIdle(st)" @click="pickStaff(st.id)">
					<ArtIcon :name="ICONS.staff(st.rank).art" :size="26" :label="ICONS.staff(st.rank).label" /> {{ i + 1 }}
					<template v-if="st.actedThisYear">
						<ArtIcon v-if="st.tile" :name="ICONS.tile(st.tile).art" :size="18" :label="ICONS.tile(st.tile).label" />
						<small>Worked</small>
					</template>
					<small v-else-if="st.hiredYear >= state.year">Hired: acts next Year</small>
					<small v-else>Idle</small>
				</button>
			</div>
		</div>

		<div v-if="staff" class="pp-section">
			<h4>2. Pick a Workshop tile</h4>
			<div class="pp-row">
				<button v-for="t in tiles" :key="t.id" class="pp-btn" :class="{ sel: t.id === tileId }" :title="t.name" @click="tileId = t.id">
					<ArtIcon :name="ICONS.tile(t.id).art" :size="26" :label="ICONS.tile(t.id).label" />
					<TokenPip v-if="tolled(t)" :icon="ICONS.cash.art" value="-1" label="Toll: 1 Crown" />
				</button>
			</div>
		</div>

		<div v-if="staff && tile" class="pp-section">
			<h4>3. <ArtIcon :name="ICONS.tile(tile.id).art" :size="20" :label="ICONS.tile(tile.id).label" /> {{ tile.name }}</h4>

			<template v-if="tile.id === 'coop'">
				<div class="pp-row">
					<button class="pp-btn" :class="{ sel: coop.mode === 'take' }" @click="coop.mode = 'take'">Take an ingredient</button>
					<button class="pp-btn" :class="{ sel: coop.mode === 'hire' }" @click="coop.mode = 'hire'">Hire staff</button>
				</div>
				<div v-if="coop.mode === 'take'" class="pp-row">
					<button v-for="k in INGREDIENTS" :key="k" class="pp-btn" :class="{ sel: coop.kind === k }" @click="coop.kind = k">
						<ArtIcon :name="k" :size="20" :label="ICONS.ingredient(k).label" />
						<TokenPip :icon="ICONS.cash.art" :value="ingredientCost(state, me, k, 'coop')" label="Crowns" />
					</button>
				</div>
				<div v-else class="pp-row">
					<button v-for="r in hireRanks" :key="r" class="pp-btn" :class="{ sel: coop.hireRank === r }" :disabled="!rosterOpen(r)" @click="coop.hireRank = r">
						<ArtIcon :name="ICONS.staff(r).art" :size="20" :label="ICONS.staff(r).label" />
						<CostRow :cost="{ crowns: HIRE_COST[r] }" />
						<small>{{ rosterOpen(r) ? "" : "no roster slot" }}</small>
					</button>
				</div>
			</template>

			<template v-else-if="tile.id === 'mushroomCrown' || tile.id === 'crystalQuarry'">
				<div class="pp-row">
					<button class="pp-btn" :class="{ sel: quarry.mode === 'two' }" @click="quarry.mode = 'two'">
						<CostRow :cost="{ [quarryGood]: 2 }" />
					</button>
					<button class="pp-btn" :class="{ sel: quarry.mode === 'mixed' }" @click="quarry.mode = 'mixed'">
						<CostRow :cost="{ [quarryGood]: 1 }" /> + 1 of your choice
					</button>
				</div>
				<div v-if="quarry.mode === 'mixed'" class="pp-row">
					<button v-for="k in INGREDIENTS" :key="k" class="pp-btn" :class="{ sel: quarry.kind === k }" @click="quarry.kind = k">
						<ArtIcon :name="k" :size="20" :label="ICONS.ingredient(k).label" />
					</button>
				</div>
			</template>

			<CraftForm v-else-if="tile.id === 'kettle'" :state="state" :seat="me" :craft="craft" />

			<template v-else-if="tile.id === 'streetAlchemist'">
				<div class="pp-row">
					<button class="pp-btn" :class="{ sel: alch.mode === 'side' }" :disabled="!state.decks.side.length" @click="alch.mode = 'side'">Side-deck Paperwork</button>
					<button class="pp-btn" :class="{ sel: alch.mode === 'disp' }" @click="pickAlch('disp')">Dispensation</button>
					<button class="pp-btn" :class="{ sel: alch.mode === 'app' }" @click="pickAlch('app')">Apparatus</button>
					<button class="pp-btn" :class="{ sel: alch.mode === 'recipe' }" @click="pickAlch('recipe')">Market Recipe</button>
					<button class="pp-btn" :class="{ sel: alch.mode === 'take' }" @click="alch.mode = 'take'">2 ingredients</button>
				</div>
				<div v-if="alch.mode === 'disp' || alch.mode === 'app' || alch.mode === 'recipe'" class="pp-row">
					<button v-for="c in alchCards" :key="c.id" class="pp-btn" :class="{ sel: alch.id === c.id }" @click="alch.id = c.id">
						<ArtIcon v-if="alch.mode === 'app'" :name="ICONS.apparatus(c.id).art" :size="22" :label="ICONS.apparatus(c.id).label" />
						{{ c.name }}
					</button>
					<span v-if="!alchCards.length" class="pp-note">Nothing left to draft here.</span>
				</div>
				<p v-if="alch.mode === 'app' && APPARATUS_SLOTS[p.tier] <= p.apparatus.length" class="pp-warn">No free Apparatus slot at Tier {{ p.tier }}.</p>
				<div v-if="alch.mode === 'take'" class="pp-row">
					<label v-for="i in 2" :key="i" class="pp-field">
						<select v-model="alch.take[i - 1]">
							<option v-for="k in INGREDIENTS" :key="k" :value="k">{{ INGREDIENT_INFO[k].name }}</option>
						</select>
					</label>
				</div>
			</template>

			<template v-else-if="tile.id === 'cauldronWorks'">
				<div class="pp-row">
					<button class="pp-btn" :class="{ sel: cauld.mode === 'upgrade' }" @click="cauld.mode = 'upgrade'">Upgrade the Cauldron</button>
					<button class="pp-btn" :class="{ sel: cauld.mode === 'promote' }" @click="cauld.mode = 'promote'">Promote staff</button>
					<button class="pp-btn" :class="{ sel: cauld.mode === 'take' }" :disabled="staff.rank !== 'master'" @click="cauld.mode = 'take'">3 ingredients (Master)</button>
				</div>
				<div v-if="cauld.mode === 'promote'" class="pp-row">
					<button v-for="st in promoteCandidates" :key="st.id" class="pp-btn" :class="{ sel: cauld.promote === st.id }" @click="cauld.promote = st.id">
						<ArtIcon :name="ICONS.staff(st.rank).art" :size="20" :label="ICONS.staff(st.rank).label" />
						<ArtIcon :name="ICONS.staff(nextRank(st.rank)).art" :size="20" :label="ICONS.staff(nextRank(st.rank)).label" />
						<small>{{ st.id === staffId ? "this piece" : "idle" }}</small>
					</button>
					<span v-if="!promoteCandidates.length" class="pp-note">No open roster slot.</span>
				</div>
				<template v-else-if="cauld.mode === 'upgrade'">
					<p v-if="!up" class="pp-warn">The Cauldron is already Tier 4.</p>
					<template v-else>
						<p class="pp-row">
							<span>Tier {{ p.tier + 1 }}</span>
							<TokenPip :icon="ICONS.cash.art" :value="up.crowns" :label="ICONS.cash.label" />
							<span :class="p.cash >= up.crowns ? 'pp-ok' : 'pp-warn'">{{ p.cash >= up.crowns ? "✓" : "✗" }}</span>
							<ArtIcon :name="ICONS.staff(up.rank).art" :size="20" :label="ICONS.staff(up.rank).label" />
							<span :class="rank(staff.rank) >= rank(up.rank) ? 'pp-ok' : 'pp-warn'">{{ rank(staff.rank) >= rank(up.rank) ? "✓" : "✗" }}</span>
							<CostRow :cost="fixedCost" />
							<span v-if="anyNeed">+ {{ anyNeed }} any</span>
							<span :class="status.affordable ? 'pp-ok' : 'pp-warn'">{{ status.affordable ? "✓ affordable" : "✗ short" }}</span>
							<CostRow v-if="!status.affordable" :cost="missingFixed" />
						</p>
						<p v-if="p.upgradedThisYear" class="pp-warn">Already upgraded this Year.</p>
						<div class="pp-row">
							<label v-for="k in INGREDIENTS" :key="k" class="pp-field">
								<ArtIcon :name="k" :size="18" :label="ICONS.ingredient(k).label" />
								<small>of {{ p.ingredients[k] }}</small>
								<input v-model.number="cauld.pay[k]" type="number" min="0" :max="p.ingredients[k]" style="width: 4em" />
							</label>
						</div>
					</template>
				</template>
				<div v-else class="pp-row">
					<label v-for="i in 3" :key="i" class="pp-field">
						<select v-model="cauld.take[i - 1]">
							<option v-for="k in INGREDIENTS" :key="k" :value="k">{{ INGREDIENT_INFO[k].name }}</option>
						</select>
					</label>
				</div>
			</template>

			<p class="pp-row">
				<button class="pp-btn primary" :disabled="!ready" @click="assign">Assign</button>
				<TokenPip v-if="tolled(tile)" :icon="ICONS.cash.art" value="-1" label="Toll: 1 Crown" />
			</p>
			<p v-if="!ready" class="pp-why">{{ why }}</p>
		</div>

		<div v-if="p.apparatus.length" class="pp-section">
			<template v-if="p.apparatus.includes('secondKettle') && !spent('secondKettle')">
				<h4><ArtIcon :name="ICONS.apparatus('secondKettle').art" :size="20" :label="ICONS.apparatus('secondKettle').label" /> {{ APPARATUS.secondKettle.name }}</h4>
				<CraftForm :state="state" :seat="me" :craft="kettle2" />
				<p>
					<button class="pp-btn" :disabled="!craftReady(kettle2)" @click="secondKettle">Craft</button>
				</p>
				<p v-if="!craftReady(kettle2)" class="pp-why">{{ craftWhy(kettle2) }}</p>
			</template>
			<template v-if="p.apparatus.includes('fractionator') && !spent('fractionator')">
				<h4 :title="APPARATUS.fractionator.text"><ArtIcon :name="ICONS.apparatus('fractionator').art" :size="20" :label="ICONS.apparatus('fractionator').label" /> {{ APPARATUS.fractionator.name }}</h4>
				<div class="pp-row">
					<label class="pp-field">
						<select v-model="frac.from">
							<option value="" disabled>Split one</option>
							<option v-for="k in heldKinds" :key="k" :value="k">{{ INGREDIENT_INFO[k].name }}</option>
						</select>
					</label>
					<label class="pp-field">
						<select v-model="frac.to">
							<option value="" disabled>into two</option>
							<option v-for="k in INGREDIENTS.filter(x => x !== frac.from)" :key="k" :value="k">{{ INGREDIENT_INFO[k].name }}</option>
						</select>
					</label>
					<button class="pp-btn" :disabled="!frac.from || !frac.to" @click="fractionate">Split</button>
				</div>
				<p v-if="!frac.from || !frac.to" class="pp-why">Pick the ingredient to split and the one to split it into</p>
			</template>
			<template v-if="p.apparatus.includes('greenThumbPump') && !spent('greenThumb')">
				<h4 :title="APPARATUS.greenThumbPump.text"><ArtIcon :name="ICONS.apparatus('greenThumbPump').art" :size="20" :label="ICONS.apparatus('greenThumbPump').label" /> {{ APPARATUS.greenThumbPump.name }}</h4>
				<button class="pp-btn" @click="controller.act({ type: 'greenThumb' })">Take 2 <CostRow :cost="{ toad: 2 }" /></button>
			</template>
		</div>

		<p>
			<button class="pp-btn" :class="{ primary: noIdle }" @click="controller.act({ type: 'done' })">Finish the Shift</button>
		</p>
	</div>
</template>
