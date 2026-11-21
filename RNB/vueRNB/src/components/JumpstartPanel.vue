<script setup>
// &c Jumpstart: build goods piles, then bid on them. Pile number = home tile choice order.
import * as rf from "../js/RNBreference"
import * as controller from "../js/RNBcontroller"
import * as view from "../js/RNBview"
import * as jumpstart from "../js/RNBjumpstart"
import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"
import { ref, computed } from "vue"

const store = useModelStore()
const personal = usePersonalStore()
const selectedGood = ref(null)
// Extra raise steps (of 5) above the minimum bid, per pile
const extraSteps = ref({})

const js = computed(() => store.gameflow.jumpstart)
const isBidding = computed(() => store.gameflow.phase === rf.PHASE_JUMPSTART_BIDDING)
const currentIdx = computed(() => store.gameflow.turnOrder[0])
const myTurn = computed(() => personal.canPlay() && currentIdx.value !== undefined)

function playerName(idx) {
	return store.players[idx].displayName || store.players[idx].name
}

function playerColour(idx) {
	return personal.getCorrectedColourHex(store.players[idx].colour)
}

function donkeyImg(idx) {
	return view.getImage("transporter_" + rf.DONKEY + "_" + personal.getCorrectedColour(store.players[idx].colour))
}

function bidAmount(pileIdx) {
	return jumpstart.minBid(pileIdx) + (extraSteps.value[pileIdx] || 0) * rf.JUMPSTART_MIN_RAISE
}

function step(pileIdx, delta) {
	extraSteps.value[pileIdx] = Math.max(0, (extraSteps.value[pileIdx] || 0) + delta)
}

function pileClicked(pileIdx) {
	if (!myTurn.value || isBidding.value || selectedGood.value === null) return
	if (!jumpstart.addGoodToPile(controller.currentPlayerIndex(), pileIdx, selectedGood.value)) return
	selectedGood.value = null
	controller.endPlayerTurn()
}

function bid(pileIdx) {
	if (!jumpstart.placeBid(controller.currentPlayerIndex(), pileIdx, bidAmount(pileIdx))) return
	extraSteps.value = {}
	controller.endPlayerTurn()
}
</script>

<template>
	<div v-if="rf.PHASE_JUMPSTARTS.includes(store.gameflow.phase) && !store.viewSettings.showReplay" class="jumpstartPanel">
		<h2>{{ $t("jumpstart.title") }}</h2>
		<div class="jsHelp">{{ isBidding ? $t("jumpstart.biddingHelp", { raise: rf.JUMPSTART_MIN_RAISE }) : $t("jumpstart.pilesHelp", { left: store.gameflow.turnOrder.length }) }}</div>

		<div v-if="currentIdx !== undefined" class="jsTurn" :style="{ borderColor: playerColour(currentIdx) }">
			<img :src="donkeyImg(currentIdx)" class="jsDonkey" />
			<span v-if="myTurn">{{ isBidding ? $t("jumpstart.yourBid", { name: playerName(currentIdx) }) : $t("jumpstart.yourAdd", { name: playerName(currentIdx) }) }}</span>
			<span v-else>{{ $t("jumpstart.waitingFor", { name: playerName(currentIdx) }) }}</span>
		</div>

		<!-- Pick a good, then click a pile -->
		<div v-if="myTurn && !isBidding" class="jsGoods">
			<img v-for="resType in jumpstart.PILE_GOODS" :key="resType" :src="view.getImage('res_' + resType)" class="jsGood" :class="{ selected: selectedGood === resType }" @click="selectedGood = resType" />
		</div>

		<div class="jsCards">
			<div
				v-for="(pile, pileIdx) in js.piles"
				:key="pileIdx"
				class="jsCard"
				:class="{ addable: myTurn && !isBidding && selectedGood !== null, held: isBidding && js.owners[pileIdx] !== -1 }"
				:style="isBidding && js.owners[pileIdx] !== -1 ? { borderColor: playerColour(js.owners[pileIdx]) } : {}"
				@click="pileClicked(pileIdx)">
				<div class="jsBadge">{{ $t("jumpstart.homePick", { ordinal: view.getOrdinal(pileIdx + 1) }) }}</div>
				<div class="jsPileGoods">
					<img v-for="(resType, idx) in pile" :key="idx" :src="view.getImage('res_' + resType)" class="jsPileGood" />
					<span v-if="pile.length === 0" class="jsMuted">{{ $t("jumpstart.empty") }}</span>
				</div>

				<template v-if="isBidding">
					<div v-if="js.owners[pileIdx] !== -1" class="jsHolder" :style="{ color: playerColour(js.owners[pileIdx]) }" :title="$t('jumpstart.costHint', { amount: js.prices[pileIdx] })">
						<img :src="donkeyImg(js.owners[pileIdx])" class="jsDonkey" />
						{{ playerName(js.owners[pileIdx]) }} · {{ js.prices[pileIdx] }}
					</div>
					<div v-else class="jsHolder jsMuted">{{ $t("jumpstart.noBid") }}</div>

					<div v-if="myTurn" class="jsBidRow">
						<button class="jsStep" :disabled="!extraSteps[pileIdx]" @click="step(pileIdx, -1)">−</button>
						<button class="actionsLineButton jsBidBtn" :title="$t('jumpstart.costHint', { amount: bidAmount(pileIdx) })" @click="bid(pileIdx)">
							{{ js.owners[pileIdx] === -1 ? $t("jumpstart.takeFor", { amount: bidAmount(pileIdx) }) : $t("jumpstart.raiseTo", { amount: bidAmount(pileIdx) }) }}
						</button>
						<button class="jsStep" @click="step(pileIdx, 1)">+</button>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
.jumpstartPanel {
	margin-bottom: 12px;
	text-align: center;
}
.jsHelp {
	color: #555;
	margin-bottom: 6px;
}
.jsTurn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 10px;
	border: 2px solid;
	border-radius: 14px;
	font-weight: bold;
	margin-bottom: 8px;
	background: white;
}
.jsDonkey {
	width: 24px;
	height: 24px;
}
.jsGoods {
	margin-bottom: 8px;
}
.jsGood {
	width: 36px;
	height: 36px;
	cursor: pointer;
	border: 2px solid transparent;
}
.jsGood.selected {
	border-color: #d35400;
}
.jsCards {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
}
.jsCard {
	width: 210px;
	border: 2px solid #bbb;
	border-radius: 8px;
	background: white;
	padding: 6px;
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.jsCard.addable {
	cursor: pointer;
	border-style: dashed;
}
.jsCard.addable:hover {
	background: #f3f9ef;
}
.jsCard.held {
	border-width: 3px;
}
.jsBadge {
	align-self: center;
	background: #2e7d32;
	color: white;
	font-weight: bold;
	padding: 2px 10px;
	border-radius: 10px;
}
.jsPileGoods {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 2px;
	min-height: 30px;
}
.jsPileGood {
	width: 28px;
	height: 28px;
}
.jsMuted {
	color: #888;
	font-style: italic;
}
.jsHolder {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	font-weight: bold;
}
.jsBidRow {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 4px;
}
.jsStep {
	width: 26px;
	height: 26px;
	font-weight: bold;
}
.jsBidBtn {
	min-width: 110px;
}
</style>
