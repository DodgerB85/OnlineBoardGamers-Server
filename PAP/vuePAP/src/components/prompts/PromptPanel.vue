<script setup>
/**
 * The action panel: every decision a player makes goes through here.
 * Shows whose move it is, one short line for the step, and the sub-panel for that step.
 * The full rule for the step sits behind the ⓘ toggle.
 */
import { computed, ref, watch } from "vue"
import * as controller from "../../js/PAPcontroller"
import { currentPrompt } from "../../js/engine/index.js"
import { seatColour } from "../board/shared.js"
import { useModelStore } from "../../stores/PAPstore.js"
import "./prompts.css"
import SetupPrompt from "./SetupPrompt.vue"
import CivicPrompt from "./CivicPrompt.vue"
import PostPrompt from "./PostPrompt.vue"
import ChoicesPrompt from "./ChoicesPrompt.vue"
import ShiftPrompt from "./ShiftPrompt.vue"
import StreetPrompt from "./StreetPrompt.vue"
import AuditPrompt from "./AuditPrompt.vue"

const store = useModelStore()

const STEPS = {
	"setup.recipes": { short: "Learn two House Specials.", help: "Pick two different House Specials. No recipe can be chosen by more than two players.", panel: SetupPrompt },
	"post.review": { short: "Call a Public Review, or pass.", help: "A Public Review freezes the Recognized leader out of Council until your rallies run out. Calling it spends your first Council contribution (no goods, Hype or progress).", panel: CivicPrompt },
	"post.rally": { short: "Rally to the Review, or pass.", help: "You hold a live Boone seal. A Rally extends the Public Review by one Council opportunity.", panel: CivicPrompt },
	"post.council": { short: "Contribute to Charters, then finish.", help: "Contribute to any open Charters you can afford. Each contribution pays the good, gives +1 Hype and +1 progress.", panel: CivicPrompt },
	"post.bylaw": { short: "Vote for a Charter.", help: "Each Founder's Seal you hold is one vote. The most votes wins; ties go to the lowest-Recognized tied voter.", panel: CivicPrompt },
	"admin.name": { short: "Name the rival who takes one ingredient from you.", help: "Administration: that rival takes one ingredient of their choice from you.", panel: PostPrompt },
	"admin.take": { short: "Take one ingredient from the administered player.", help: "Administration: take one ingredient of your choice from the administered player.", panel: PostPrompt },
	"post.pitch": { short: "Block a rival's first sale this High Street, or pass.", help: "Spend 1 Hype to block one rival's first sale attempt this High Street. Their potion can be offered again.", panel: PostPrompt },
	"post.discard": { short: "Discard down to your hand limit.", help: "You hold more Paperwork than your hand limit. Discard one card.", panel: PostPrompt },
	"post.choices": { short: "Take any Morning Post actions, then finish.", help: "Take any of these actions in any order, then finish the Morning Post.", panel: ChoicesPrompt },
	shift: { short: "Assign each staff member to a tile, then finish.", help: "Assign each of your staff to a Workshop tile, then finish. A tile with a crown badge pays a 1 Crown toll unless you are First Player.", panel: ShiftPrompt },
	"street.solo": { short: "Sell to customers only you can serve, dump or sabotage, then finish.", help: "Sell to customers only you can serve, dump or sabotage a potion, then finish. Warnings show before you confirm.", panel: StreetPrompt },
	"street.commit": { short: "Submit a sealed bid for this customer, or pass.", help: "Bids stay sealed until every eligible player has bid. The highest Customer Score wins the customer.", panel: StreetPrompt },
	"street.extraSale": { short: "Sell one more potion to this venue, or pass.", help: "An extra sale at this venue, at Anchor. Warnings show before you confirm.", panel: StreetPrompt },
	"street.reoffer": { short: "Re-offer your lost potion to an unserved customer, or pass.", help: "A potion that lost an exchange may be offered to another unserved customer it qualifies for, at Anchor.", panel: StreetPrompt },
	"audit.paper": { short: "Play Favor or Expediting Fee cards, then finish.", help: "Play Favor or Expediting Fee cards from your hand, then finish. Condemnation is checked after this.", panel: AuditPrompt },
	"audit.condemn": { short: "Settle the excess Warnings.", help: "You have more Warnings than Reputation. Pay 2 Crowns per excess Warning, or discard a Journeyman to cancel the excess.", panel: AuditPrompt },
	"audit.spoil": { short: "Protect potions from spoilage.", help: "Choose the unsold potions to protect. Unprotected potions spoil.", panel: AuditPrompt },
}

const prompt = computed(() => {
	const s = store.game
	if (!s || store.viewSettings.showReplay || s.phase === "over") return null
	return currentPrompt(s)
})
const step = computed(() => STEPS[prompt.value.step])
const colour = computed(() => seatColour(prompt.value.seat))

// Remounts the sub-panel after every move, so its selections reset when the turn moves on.
const promptKey = computed(() => prompt.value && store.actions.length + ":" + prompt.value.step + ":" + prompt.value.seat)
const showHelp = ref(false)
watch(promptKey, () => (showHelp.value = false))
</script>

<template>
	<div v-if="prompt">
		<div v-if="controller.isMyTurn()" class="pp-panel" :style="{ '--seat': colour }">
			<p class="pp-who">Your move</p>
			<h3 class="pp-header">
				{{ step.short }}
				<button class="pp-info" :aria-expanded="showHelp" title="What this step means" @click="showHelp = !showHelp">ⓘ</button>
			</h3>
			<p v-if="showHelp" class="pp-note">{{ step.help }}</p>
			<p v-if="store.gameMessages.actionError" class="pp-error">{{ store.gameMessages.actionError }}</p>
			<component :is="step.panel" :key="promptKey" :prompt="prompt" :state="store.game" />
		</div>
		<p v-else class="pp-waiting">Waiting for {{ store.game.players[prompt.seat].name }}: {{ step.short }}</p>
	</div>
</template>
