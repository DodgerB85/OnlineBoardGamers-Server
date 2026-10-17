<script setup>
// audit.paper, audit.condemn, audit.spoil: Paperwork, Warnings and spoilage.
import { computed, ref } from "vue"
import * as controller from "../../js/PAPcontroller"
import { RECIPES } from "../../js/engine/cards.js"
import { condemnRisk, condemnText, spoilRisk } from "../../js/PAPhints.js"
import { ICONS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"
import CostRow from "./CostRow.vue"
import RiskList from "./RiskList.vue"

const props = defineProps({ prompt: Object, state: Object })
const me = computed(() => props.prompt.seat)
const p = computed(() => props.state.players[me.value])
const rivals = computed(() => props.state.players.filter(x => x.seat !== me.value))
const rival = ref(null)

// Same as the engine's levy bill (R30): doubled by S11, less the fees Expediting skipped.
const levy = computed(() => Math.max(0, p.value.levyOwed * (props.state.yearFx.doubleLevies ? 2 : 1) - 2 * (p.value.skipLevy || 0)))

// audit.paper and audit.condemn: what the Condemnation check will count.
const condemn = computed(() => condemnRisk(props.state, me.value))

// audit.condemn
const excess = computed(() => props.prompt.data.excess)
const journeymen = computed(() => p.value.staff.filter(st => st.rank === "journeyman"))

// audit.spoil
const spoil = computed(() => spoilRisk(props.state, me.value))
const chosen = ref([])
const backedNow = pot => pot.backedFutures && !pot.backedAudits
function toggle(id) {
	if (chosen.value.includes(id)) chosen.value = chosen.value.filter(x => x !== id)
	else if (chosen.value.length < props.prompt.data.slots) chosen.value = [...chosen.value, id]
}
</script>

<template>
	<div>
		<template v-if="prompt.step === 'audit.paper'">
			<p class="pp-row">
				<TokenPip :icon="ICONS.warning.art" :value="condemn.counted" :label="'Warnings counted for Condemnation'" />
				<TokenPip :icon="ICONS.reputation.art" :value="condemn.reputation" :label="ICONS.reputation.label" />
				<TokenPip :icon="ICONS.cash.art" :value="p.cash" :label="ICONS.cash.label" />
				<RiskList v-if="condemn.condemned" :risks="[{ text: condemnText(condemn) }]" />
			</p>

			<div v-if="p.hand.includes('favor')" class="pp-section">
				<h4><ArtIcon :name="ICONS.paper('favor').art" :size="20" :label="ICONS.paper('favor').label" /> Favor</h4>
				<div class="pp-row">
					<label class="pp-field">
						<select v-model="rival">
							<option :value="null" disabled>Rival</option>
							<option v-for="r in rivals" :key="r.seat" :value="r.seat">{{ r.name }}</option>
						</select>
					</label>
				</div>
				<div class="pp-row">
					<button class="pp-btn" :disabled="p.warnings < 1" @click="controller.act({ type: 'favor', mode: 'cancel' })">
						<ArtIcon :name="ICONS.warning.art" :size="16" :label="ICONS.warning.label" /> Cancel one of mine
					</button>
					<button class="pp-btn" :disabled="rival === null" @click="controller.act({ type: 'favor', mode: 'order', seat: rival })">Rival resolves before me</button>
					<button
						class="pp-btn"
						:disabled="rival === null"
						title="If they sabotage me in the next High Street, they pay 2 Crowns or take a Warning"
						@click="controller.act({ type: 'favor', mode: 'restitution', seat: rival })"
					>
						Restitution from the rival
					</button>
				</div>
			</div>

			<div v-if="p.hand.includes('expedite')" class="pp-section">
				<h4><ArtIcon :name="ICONS.paper('expedite').art" :size="20" :label="ICONS.paper('expedite').label" /> Expediting Fee <CostRow :cost="{ crowns: 1 }" /></h4>
				<div class="pp-row">
					<button class="pp-btn" :disabled="p.cash < 1 || levy === 0" title="Skips one of your fees: 2 Crowns of levy" @click="controller.act({ type: 'expedite', mode: 'skipFee' })">
						Skip one fee
						<TokenPip :icon="ICONS.levy.art" :value="levy" :label="ICONS.levy.label" />
					</button>
					<button class="pp-btn" :disabled="p.cash < 1 || rival === null" @click="controller.act({ type: 'expedite', mode: 'last', seat: rival })">Rival resolves last</button>
				</div>
			</div>

			<p>
				<button class="pp-btn primary" @click="controller.act({ type: 'done' })">Done</button>
			</p>
		</template>

		<template v-else-if="prompt.step === 'audit.condemn'">
			<p class="pp-row">
				<TokenPip :icon="ICONS.warning.art" :value="p.warnings" :label="ICONS.warning.label" />
				<TokenPip :icon="ICONS.reputation.art" :value="p.reputation" :label="ICONS.reputation.label" />
				<RiskList :risks="[{ text: 'Excess ' + excess + ' Warning' + (excess === 1 ? '' : 's') + ': pay ' + 2 * excess + ' Crowns or discard a Journeyman' }]" />
			</p>
			<div class="pp-row">
				<button class="pp-btn primary" :disabled="p.cash < 2 * excess" @click="controller.act({ type: 'payCondemnation' })">
					Pay <CostRow :cost="{ crowns: 2 * excess }" />
				</button>
				<button v-for="st in journeymen" :key="st.id" class="pp-btn" @click="controller.act({ type: 'discardJourneyman', staffId: st.id })">
					<ArtIcon :name="ICONS.staff('journeyman').art" :size="20" :label="ICONS.staff('journeyman').label" />
					Discard, cancels <TokenPip :icon="ICONS.warning.art" :value="excess" :label="ICONS.warning.label" />
				</button>
			</div>
			<p v-if="p.cash < 2 * excess" class="pp-why">Need {{ 2 * excess }} Crowns to pay; you have {{ p.cash }}{{ journeymen.length ? ". Discard a Journeyman instead" : "" }}</p>
		</template>

		<template v-else-if="prompt.step === 'audit.spoil'">
			<p class="pp-row">
				<TokenPip :icon="ICONS.kettleSlot.art" :value="spoil.slots" :label="'Protect slots'" />
				<span class="pp-note">Unprotected potions spoil.</span>
			</p>
			<div class="pp-row">
				<button
					v-for="pot in p.potions"
					:key="pot.id"
					class="pp-btn"
					:class="{ sel: chosen.includes(pot.id) }"
					:disabled="backedNow(pot)"
					@click="toggle(pot.id)"
				>
					{{ RECIPES[pot.recipe].name }}
					<small>poison {{ pot.poison }}, potency {{ pot.potency }}</small>
					<small v-if="backedNow(pot)">Kept by Backed Futures</small>
					<RiskList v-else-if="spoil.atRisk.includes(pot.id)" :risks="[{ text: 'Will spoil' }]" />
				</button>
				<span v-if="!p.potions.length" class="pp-note">You hold no potions.</span>
			</div>
			<p>
				<button class="pp-btn primary" :disabled="chosen.length > prompt.data.slots" @click="controller.act({ type: 'protect', potionIds: [...chosen] })">
					Protect {{ chosen.length }}
				</button>
				<button class="pp-btn" @click="controller.act({ type: 'protect', potionIds: [] })">Protect nothing</button>
			</p>
		</template>
	</div>
</template>
