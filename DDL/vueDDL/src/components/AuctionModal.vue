<script setup>
import { computed, ref } from "vue"
import * as rf from "../js/DDLreference.js"
import * as controller from "../js/DDLcontroller.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()
const bid = ref(0)

const visible = computed(() => store.viewSettings.showAuction && store.gameflow.phase === rf.PHASE_SETUP && store.gameflow.setup.auction && !store.gameflow.setup.auctionResolved)
const tied = computed(() => store.gameflow.setup.tiebreakPlayers || [])
const isTied = computed(() => tied.value.includes(personal.pov) || personal.trainingGame)
const canBid = computed(() => personal.trainingGame || tied.value.length === 0 || tied.value.includes(personal.pov))

async function submit() {
	const value = Math.max(0, Math.floor(Number(bid.value) || 0))
	await controller.submitAuctionBid(value)
}
</script>

<template>
	<div v-if="visible" class="modalOverlay">
		<div class="modalBox">
			<h2>{{ $t("auction.title") }}</h2>
			<p>{{ $t("auction.intro") }}</p>
			<p v-if="tied.length > 0" class="tiebreak">{{ $t("auction.tiebreak", { players: tied.map((idx) => store.players[idx].displayName).join(", ") }) }}</p>
			<div v-if="canBid">
				<div v-if="personal.auctionSubmitted" class="submitted">{{ $t("auction.submitted") }}</div>
				<template v-else>
					<label>{{ $t("auction.bidLabel") }} <input v-model.number="bid" type="number" min="0" max="999" /></label>
					<button class="actionsLineButton" @click="submit">{{ $t("auction.submit") }}</button>
				</template>
			</div>
			<div v-else class="submitted">{{ $t("auction.waitingTied") }}</div>
		</div>
	</div>
</template>

<style scoped>
.modalOverlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 5000; pointer-events: none; }
.modalBox { background: #fffdf3; border: 3px solid #7a5b19; border-radius: 8px; padding: 18px; width: 480px; max-width: 90vw; text-align: center; pointer-events: auto; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
.tiebreak { color: #8a4b00; font-weight: bold; }
.submitted { font-weight: bold; color: #126b2a; margin-top: 10px; }
input { width: 90px; font-size: 16px; padding: 3px; }
</style>
