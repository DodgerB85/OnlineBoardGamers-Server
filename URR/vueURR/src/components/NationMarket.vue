<script setup>
import ArtworkCard from "./ArtworkCard.vue"
import { computed, reactive, ref, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as controller from "../js/URRcontroller"
import { getNationCardImage, getPlayerMarkerImage, getStateOrderImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
const emit = defineEmits(["locateNation"])
const amounts = reactive({})
const showAcquired = ref(false)
const isWelcomeDismissed = ref(false)
const acquiredNations = computed(() => store.nations.filter((nation) => nation.ownerType !== null))
const displayedNations = computed(() => [...store.nations.filter((nation) => nation.ownerType === null && (!auction.value || nation.id === auction.value.nation)), ...(showAcquired.value ? acquiredNations.value : [])])
const treaty = computed(() => store.nations.find((nation) => nation.ownerType === null))
const auction = computed(() => store.gameflow.auction)
const actor = computed(() => store.gameflow.turnOrder[0])
const available = computed(() => actor.value === undefined ? 0 : rules.availableMoney(store, actor.value))

function price(nation) { return nation.id === rf.NATION_ASHUR ? store.gameflow.ashurPrice : rf.NATION_PRICES[nation.id] }
function minimum(nation) { return Math.max(rf.NATION_PRICES[nation.id], ...nation.bids.map((bid) => bid.amount), auction.value?.nation === nation.id ? auction.value.amount : 0) + 5 }
function amount(nation) { return amounts[nation.id] ?? minimum(nation) }
function moneyForBid(nation) {
	const highest = nation.bids.reduce((best, bid) => !best || bid.amount > best.amount ? bid : best, null)
	return available.value + (!auction.value && highest?.player === actor.value ? highest.amount : 0)
}
function amountError(nation) {
	if (amount(nation) > moneyForBid(nation)) return `Only ${moneyForBid(nation)} SPL available`
	if (amount(nation) < minimum(nation)) return `Minimum ${minimum(nation)} SPL`
	return ""
}
function isAuction(nation) { return auction.value?.nation === nation.id }
function owner(nation) { return nation.ownerType === "player" ? store.players[nation.owner].displayName : "Available" }
function nationState(nation) { return store.board.areas.find((area) => area.nation === nation.id).state }
function bid(nation) { controller.submitAction({ type: "bidNation", nation: nation.id, amount: Number(amount(nation)) }) }
function adjustBid(nation, change) { amounts[nation.id] = Math.min(moneyForBid(nation), Math.max(minimum(nation), amount(nation) + change)) }
watch([() => auction.value?.nation, () => auction.value?.amount, () => actor.value], () => {
	if (auction.value) amounts[auction.value.nation] = minimum(store.nations[auction.value.nation])
	else for (const id of Object.keys(amounts)) delete amounts[id]
})
</script>

<template>
	<section class="nationMarket" aria-label="Independent nations">
		<div v-if="store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS && !store.viewSettings.showReplay && !isWelcomeDismissed" class="welcomeHelper">
			<div><b>Welcome to UR: 1830 BC!</b><button type="button" aria-label="Dismiss welcome" @click="isWelcomeDismissed = true">×</button></div>
			<p>Select a hex to inspect it, or a card to enlarge it. Your available actions are shown here.</p>
			<p><a href="/URR/help/" target="_blank" rel="noopener">Icons and interface help</a> is also available from Rules in the menu. Enjoy the game!</p>
		</div>
		<div v-if="store.gameMessages.actionError || store.gameMessages.errorText" role="alert">{{ store.gameMessages.actionError || store.gameMessages.errorText }}</div>
		<p class="marketHeading"><b>{{ auction ? `Auction: ${rf.NATION_NAMES[auction.nation]}` : "Independent nations" }}</b><span>{{ available }} SPL</span></p>
		<p v-if="auction" class="auctionInfo">High bid {{ auction.amount }} SPL · {{ store.players[auction.highPlayer].displayName }}</p>
		<p v-else class="marketHint">Buy the current nation, or expand another to make an offer.</p>
		<div class="nationList">
			<details v-for="nation in displayedNations" :key="nation.id" class="nationRow" :open="isAuction(nation) || (!auction && treaty?.id === nation.id)" :class="{ current: isAuction(nation) || (!auction && treaty?.id === nation.id), acquired: nation.ownerType !== null, ashur: nation.id === rf.NATION_ASHUR }">
				<summary><button type="button" class="nationLocation" :aria-label="`Find ${rf.NATION_NAMES[nation.id]} in ${rf.STATE_NAMES[nationState(nation)]} on the board`" :title="`${rf.NATION_NAMES[nation.id]} · ${rf.STATE_NAMES[nationState(nation)]}`" @click.stop.prevent="emit('locateNation', nation.id)"><img :src="getStateOrderImage(nationState(nation))" alt="" />Map</button><b>{{ rf.NATION_NAMES[nation.id] }}</b><span :class="{ nationPrice: nation.ownerType === null }">{{ nation.ownerType === null ? `${price(nation)} SPL` : owner(nation) }}</span><small>Income {{ rf.NATION_INCOMES[nation.id] }} SPL<template v-if="nation.bids.length"> · {{ nation.bids.length }} offer{{ nation.bids.length === 1 ? '' : 's' }}</template></small></summary>
				<div class="cardHeading"><ArtworkCard :src="getNationCardImage(nation.id)" :alt="rf.NATION_NAMES[nation.id]" /></div>
				<ol v-if="nation.bids.length" class="nationBids" aria-label="Bidding order"><li v-for="offer in nation.bids" :key="offer.player" :class="{ currentBidder: isAuction(nation) && offer.player === actor }"><img :src="getPlayerMarkerImage(offer.player)" alt="" /><span>{{ store.players[offer.player].displayName }}</span><b>{{ offer.amount }} SPL</b></li></ol>
				<template v-if="nation.ownerType === null">
					<form v-if="!auction && treaty?.id !== nation.id" @submit.prevent="bid(nation)">
						<label :for="`nation-bid-${nation.id}`">{{ auction ? "Bid" : "Offer" }} SPL</label>
						<input :id="`nation-bid-${nation.id}`" type="number" inputmode="numeric" :value="amount(nation)" @input="amounts[nation.id] = Number($event.target.value)" :min="minimum(nation)" :max="moneyForBid(nation)" step="1" required :disabled="!personal.canPlay()" />
						<button :disabled="!personal.canPlay() || amount(nation) < minimum(nation) || amount(nation) > moneyForBid(nation)">{{ auction ? "Bid" : "Make offer" }}</button>
					</form>
					<p v-if="!auction && treaty?.id !== nation.id && amountError(nation)" class="amountError" role="status">{{ amountError(nation) }}</p>
				</template>

			</details>
		</div>
		<button v-if="acquiredNations.length" class="acquiredToggle" @click="showAcquired = !showAcquired">{{ showAcquired ? 'Hide' : 'Show' }} acquired nations ({{ acquiredNations.length }})</button>
		<div class="marketControls" :class="{ auctionControls: auction, treatyControls: !auction }">
			<button v-if="!auction && treaty" class="primaryAction" :disabled="!personal.canPlay() || available < price(treaty)" @click="controller.submitAction({ type: 'buyNation', nation: treaty.id })">Buy for {{ price(treaty) }} SPL<small>{{ rf.NATION_NAMES[treaty.id] }}</small></button>
			<form v-if="auction" @submit.prevent="bid(store.nations[auction.nation])">
				<label :for="`nation-bid-${auction.nation}`">Bid SPL</label>
				<button type="button" class="bidAdjustment" aria-label="Lower bid by 5 SPL" :disabled="!personal.canPlay() || amount(store.nations[auction.nation]) <= minimum(store.nations[auction.nation])" @click="adjustBid(store.nations[auction.nation], -5)">−5</button>
				<input :id="`nation-bid-${auction.nation}`" type="number" inputmode="numeric" :value="amount(store.nations[auction.nation])" @input="amounts[auction.nation] = Number($event.target.value)" :min="minimum(store.nations[auction.nation])" :max="moneyForBid(store.nations[auction.nation])" step="1" required :disabled="!personal.canPlay()" />
				<button type="button" class="bidAdjustment" aria-label="Raise bid by 5 SPL" :disabled="!personal.canPlay() || amount(store.nations[auction.nation]) >= moneyForBid(store.nations[auction.nation])" @click="adjustBid(store.nations[auction.nation], 5)">+5</button>
				<button class="primaryAction" :disabled="!personal.canPlay() || amount(store.nations[auction.nation]) < minimum(store.nations[auction.nation]) || amount(store.nations[auction.nation]) > moneyForBid(store.nations[auction.nation])">Bid</button>
			</form>
			<button class="passButton" :disabled="!personal.canPlay()" @click="controller.submitAction({ type: 'pass' })">{{ auction ? "Withdraw" : "Pass" }}</button>
			<p v-if="auction && amountError(store.nations[auction.nation])" class="amountError" role="status">{{ amountError(store.nations[auction.nation]) }}</p>
		</div>
	</section>
</template>

<style scoped>
.cardHeading { margin-bottom: 7px; }.cardHeading img { width: 100%; display: block; }
.nationRow.ashur .cardHeading { width: 180px; max-width: 100%; margin: 0 auto 7px; }
.nationLocation { float: right; display: inline-flex; align-items: center; gap: 4px; min-height: 40px; font: inherit; font-size: 12px; }.nationLocation img { width: 22px; height: 22px; }
.nationPrice { display: inline-block; white-space: nowrap; }
.nationMarket { text-align: left; color: #263238; font-size: 12px; }.nationMarket p { margin: 5px 0; }.marketHeading { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid #c8c2b4; }.marketHeading span { color: #52616a; }.auctionInfo { padding: 5px 7px; background: #e8f2f6; border-left: 3px solid #177daf; }
.nationList { display: flex; flex-direction: column; gap: 5px; margin: 7px 0; }.nationRow { min-width: 0; padding: 7px; background: #f7f5ef; border: 1px solid #c9c2b2; border-radius: 4px; }.nationRow.current { border-color: #177daf; box-shadow: inset 3px 0 #177daf; }.nationRow.acquired { background: #ece9df; }.nationRow summary { cursor: pointer; font-size: 13px; overflow-wrap: anywhere; }.nationRow summary span { margin-left: 7px; color: #52616a; }.nationRow summary small { display: block; margin: 3px 0 0 14px; font-size: 11px; color: #52616a; }.nationRow[open] summary { margin-bottom: 7px; }
ol { padding-left: 18px; margin: 4px 0; color: #52616a; }form { display: flex; gap: 4px; align-items: center; }form label { font-size: 11px; }input { width: 58px; min-width: 0; }button { cursor: pointer; }button:disabled { cursor: default; }.passButton { width: 100%; margin-top: 3px; }
.nationBids { padding-left: 0; list-style: none; }.nationBids li { display: flex; align-items: center; gap: 5px; padding: 3px; }.nationBids img { width: 22px; height: 22px; }.nationBids span { min-width: 0; overflow-wrap: anywhere; }.nationBids b { margin-left: auto; white-space: nowrap; }.nationBids .currentBidder { background: #edf5e4; border-left: 3px solid #527349; }
.marketHint { color: #52616a; font-size: 12px; }
.welcomeHelper { margin-bottom: 10px; padding: 8px; background: #edf5e4; border: 1px solid #c1cdb1; border-radius: 4px; }
.welcomeHelper > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.welcomeHelper button { flex-shrink: 0; min-width: 40px; min-height: 40px; font: inherit; font-size: 20px; }
.welcomeHelper a { color: #235e88; }
.auctionInfo { overflow-wrap: anywhere; }
.amountError { color: #a40000; font-size: 12px; }
.bidAdjustment { min-width: 40px; padding: 5px; }
.marketControls { position: sticky; bottom: 0; background: #fff9e9; padding: 6px 0 0; border-top: 1px solid #c8c2b4; z-index: 1; }
.treatyControls { display: flex; gap: 6px; align-items: stretch; }.treatyControls > button { flex: 1; min-width: 0; margin: 0; }.treatyControls .passButton { width: auto; flex: 0 0 auto; }.treatyControls small { display: block; margin-top: 3px; font-size: 12px; }
@media (max-width: 1050px) { .auctionControls form { display: inline-flex; }.auctionControls .passButton { width: auto; margin: 0 0 0 6px; } }
</style>
