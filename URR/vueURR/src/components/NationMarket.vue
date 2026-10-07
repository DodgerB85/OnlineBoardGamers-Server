<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import ArtworkCard from "./ArtworkCard.vue"
import { computed, reactive, watch } from "vue"
import * as rf from "../js/URRreference"
import * as view from "../js/URRview"
import * as rules from "../js/URRrules"
import * as controller from "../js/URRcontroller"
import * as assets from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
defineProps({ isBoardLayout: { type: Boolean, default: false } })
const emit = defineEmits(["locateNation"])
const amounts = reactive({})
const displayedNations = computed(() => store.nations)
const hasPendingBids = computed(() => displayedNations.value.some((nation) => nation.bids.length))
const treaty = computed(() => store.nations.find((nation) => nation.ownerType === null))
const auction = computed(() => store.gameflow.auction)
const actor = computed(() => view.displayedTurnOrder(store)[0])
const totalMoney = computed(() => store.players[actor.value]?.money ?? 0)
const reservedMoney = computed(() => totalMoney.value - available.value)
const available = computed(() => actor.value === undefined ? 0 : rules.availableMoney(store, actor.value))

function price(nation) { return nation.id === rf.NATION_ASHUR ? store.gameflow.ashurPrice : rf.NATION_PRICES[nation.id] }
function minimum(nation) { return Math.max(rf.NATION_PRICES[nation.id], ...nation.bids.map((bid) => bid.amount), auction.value?.nation === nation.id ? auction.value.amount : 0) + 5 }
function amount(nation) { return amounts[nation.id] ?? minimum(nation) }
function highestBid(nation) { return nation.bids.reduce((best, bid) => !best || bid.amount > best.amount ? bid : best, null) }
function moneyForBid(nation) {
	const highest = highestBid(nation)
	return available.value + (!auction.value && highest?.player === actor.value ? highest.amount : 0)
}
function amountError(nation) {
	if (amount(nation) > moneyForBid(nation)) return `Only ${moneyForBid(nation)} SPL available`
	return ""
}
function isAuction(nation) { return auction.value?.nation === nation.id }
function nationState(nation) { return store.board.areas.find((area) => area.nation === nation.id).state }
function bid(nation) { controller.submitAction({ type: "bidNation", nation: nation.id, amount: Number(amount(nation)) }) }
function adjustBid(nation, change) { amounts[nation.id] = Math.min(moneyForBid(nation), Math.max(minimum(nation), amount(nation) + change)) }
watch([() => auction.value?.nation, () => auction.value?.amount, () => actor.value], () => {
	if (auction.value) amounts[auction.value.nation] = minimum(store.nations[auction.value.nation])
	else for (const id of Object.keys(amounts)) delete amounts[id]
})
</script>

<template>
	<section class="nationMarket" :class="{ boardLayout: isBoardLayout, hasPendingBids }" aria-label="Independent nations">
		<p class="marketHeading"><b>{{ auction ? `Auction: ${rf.NATION_NAMES[auction.nation]}` : "Independent nations" }}</b><span>{{ available }} SPL available</span></p>
		<p v-if="reservedMoney" class="moneySummary" title="Reserved money becomes available when outbid; the winner pays when the nation is awarded.">{{ reservedMoney }} SPL reserved for highest bids · {{ totalMoney }} SPL total</p>
		<p v-if="auction" class="auctionInfo">High bid {{ auction.amount }} SPL · <PlayerMarker :index="auction.highPlayer" /></p>
		<p v-else-if="!store.turnDraft.ready" class="marketHint">Buy the current nation, or make an offer on another.</p>
		<div class="nationList">
			<article v-for="nation in displayedNations" :key="nation.id" class="nationRow" :aria-label="rf.NATION_NAMES[nation.id]" :class="{ current: isAuction(nation) || (!auction && treaty?.id === nation.id), acquired: nation.ownerType !== null, ashur: nation.id === rf.NATION_ASHUR }">
				<div class="cardHeading"><ArtworkCard :src="assets.getNationCardImage(nation.id)" :alt="rf.NATION_NAMES[nation.id]" /></div>
				<p v-if="nation.ownerType !== null" class="nationOwner">Owned by <PlayerMarker :index="nation.owner" /></p>
				<ol v-if="nation.bids.length" class="nationBids" :aria-label="isAuction(nation) ? 'Auction participants in bidding order' : 'Interested players in bidding order'">
					<li v-for="(offer, position) in nation.bids" :key="offer.player" :class="{ currentBidder: isAuction(nation) && offer.player === actor }" :aria-current="isAuction(nation) && offer.player === actor ? 'step' : undefined">
						<span class="bidPosition">{{ position + 1 }}</span><PlayerMarker :index="offer.player" /><b v-if="offer.player === highestBid(nation).player" aria-label="Highest offer" title="Highest offer">{{ offer.amount }} SPL</b>
					</li>
				</ol>
				<div class="nationActions">
					<button type="button" class="nationLocation" :aria-label="`Find ${rf.NATION_NAMES[nation.id]} in ${rf.STATE_NAMES[nationState(nation)]} on the board`" :title="`${rf.NATION_NAMES[nation.id]} · ${rf.STATE_NAMES[nationState(nation)]}`" @click.stop.prevent="emit('locateNation', nation.id)"><img :src="assets.getStateOrderImage(nationState(nation))" alt="" />Map</button>
				<template v-if="nation.ownerType === null">
					<form v-if="!auction && treaty?.id !== nation.id" @submit.prevent="bid(nation)">
						<label :for="`nation-bid-${nation.id}`">{{ auction ? "Bid" : "Offer" }} SPL</label>
						<input :id="`nation-bid-${nation.id}`" type="number" inputmode="numeric" :value="amount(nation)" @input="amounts[nation.id] = Number($event.target.value)" :min="minimum(nation)" :max="moneyForBid(nation)" step="1" required :disabled="!personal.canPlay()" />
						<template v-if="nation.bids.length"><button v-for="increment in [1, 5, 10]" :key="increment" type="button" class="bidAdjustment" :aria-label="`Raise bid by ${increment} SPL`" :disabled="!personal.canPlay() || amount(nation) + increment > moneyForBid(nation)" @click="adjustBid(nation, increment)">+{{ increment }}</button></template>
						<button :disabled="!personal.canPlay() || amount(nation) < minimum(nation) || amount(nation) > moneyForBid(nation)">{{ auction ? "Bid" : "Make offer" }}</button>
					</form>
					<p v-if="!auction && treaty?.id !== nation.id && amountError(nation)" class="amountError" role="status">{{ amountError(nation) }}</p>
				</template>
				<div v-if="nation.ownerType === null && !auction && treaty?.id === nation.id" class="marketControls treatyControls">
					<button class="primaryAction" :disabled="!personal.canPlay() || available < price(nation)" @click="controller.submitAction({ type: 'buyNation', nation: nation.id })">Buy for {{ price(nation) }} SPL</button>
					<button class="passButton" :disabled="!personal.canPlay()" @click="controller.submitAction({ type: 'pass' })">Pass</button>
				</div>
				<div v-if="nation.ownerType === null && isAuction(nation)" class="marketControls auctionControls">
					<form @submit.prevent="bid(nation)">
						<label :for="`nation-bid-${nation.id}`">Bid SPL</label>
						<input :id="`nation-bid-${nation.id}`" type="number" inputmode="numeric" :value="amount(nation)" @input="amounts[nation.id] = Number($event.target.value)" :min="minimum(nation)" :max="moneyForBid(nation)" step="1" required :disabled="!personal.canPlay()" />
						<button v-for="increment in [1, 5, 10]" :key="increment" type="button" class="bidAdjustment" :aria-label="`Raise bid by ${increment} SPL`" :disabled="!personal.canPlay() || amount(nation) + increment > moneyForBid(nation)" @click="adjustBid(nation, increment)">+{{ increment }}</button>
						<button class="primaryAction" :disabled="!personal.canPlay() || amount(nation) < minimum(nation) || amount(nation) > moneyForBid(nation)">Bid</button>
					</form>
					<p v-if="amountError(nation)" class="amountError" role="status">{{ amountError(nation) }}</p>
					<button class="passButton" :disabled="!personal.canPlay()" @click="controller.submitAction({ type: 'pass' })">Withdraw</button>
				</div>
				</div>
			</article>
		</div>

	</section>
</template>

<style scoped>
.cardHeading { margin-bottom: 7px; }.cardHeading img { width: 100%; display: block; }
.nationRow.ashur .cardHeading { width: 180px; max-width: 100%; margin: 0 auto 7px; }
.nationLocation { flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px; min-height: 40px; font: inherit; font-size: 16px; font-weight: 600; }.nationLocation img { width: 22px; height: 22px; }
.nationMarket { text-align: left; color: #263238; font-size: 16px; font-weight: 600; }.nationMarket p { margin: 5px 0; }.marketHeading { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid #c8c2b4; }.marketHeading span { color: #52616a; }.auctionInfo { padding: 5px 7px; background: #e8f2f6; border-left: 3px solid #177daf; }
.nationList { display: flex; flex-direction: column; gap: 5px; margin: 7px 0; }.nationRow { min-width: 0; padding: 7px; background: #f7f5ef; border: 1px solid #c9c2b2; border-radius: 4px; }.nationRow.current { border-color: #177daf; box-shadow: inset 3px 0 #177daf; }.nationRow.acquired { background: #ece9df; }
ol { padding-left: 18px; margin: 4px 0; color: #52616a; }form { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }form label { font-size: 16px; font-weight: 600; }input { width: 58px; min-width: 0; }button { cursor: pointer; }button:disabled { cursor: default; }.passButton { width: 100%; margin-top: 3px; }
.nationBids { padding-left: 0; margin: 4px 0; list-style: none; }.nationBids li { display: flex; align-items: center; gap: 5px; padding: 3px; }.nationBids img { width: 22px; height: 22px; }.nationBids span { min-width: 0; overflow-wrap: anywhere; }.nationBids b { margin-left: auto; white-space: nowrap; }.nationBids .bidPosition { color: #625940; }.nationBids .currentBidder { background: #e1edf5; border-left: 3px solid #177daf; }
.marketHint { color: #52616a; font-size: 16px; font-weight: 600; }
.auctionInfo { overflow-wrap: anywhere; }
.amountError { color: #a40000; font-size: 16px; font-weight: 600; }
.bidAdjustment { min-width: 40px; padding: 5px; }
.marketControls { margin-top: 7px; padding-top: 6px; border-top: 1px solid #c8c2b4; }
.treatyControls { display: flex; gap: 6px; align-items: stretch; }.treatyControls > button { flex: 1; min-width: 0; margin: 0; }.treatyControls .passButton { width: auto; flex: 0 0 auto; }.treatyControls small { display: block; margin-top: 3px; font-size: 16px; font-weight: 600; }

.boardLayout .nationList { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; align-items: stretch; }
.boardLayout .nationRow { display: flex; flex-direction: column; padding: 6px; }
.boardLayout .cardHeading, .boardLayout .nationRow.ashur .cardHeading { width: 100%; margin: 0 0 5px; }
.boardLayout .cardHeading :deep(.artworkButton img) { width: 100%; height: clamp(80px, calc((100vh - 580px) / 2), 150px); object-fit: contain; }
.boardLayout .nationBids { display: flex; flex-wrap: wrap; gap: 2px 6px; font-size: 16px; font-weight: 600; }
.boardLayout .nationBids li { flex: 1 1 auto; }
.boardLayout .nationBids img { width: 28px; height: 28px; }
.boardLayout .marketControls { margin: 0; padding: 0; border: 0; }
.boardLayout .nationOwner { margin-top: auto; color: #52616a; }
.boardLayout .nationRow.acquired { opacity: .7; }
.boardLayout form label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.boardLayout .nationLocation { min-height: 32px; }
.boardLayout .bidAdjustment { min-width: 32px; padding: 4px; }
.nationActions { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 4px; margin-top: auto; }
.nationActions > form, .nationActions > .marketControls { flex: 1; min-width: 0; }
.nationActions .amountError { flex-basis: 100%; }
.boardLayout .nationActions { padding-top: 5px; border-top: 1px solid #c8c2b4; }
.boardLayout .nationActions button { min-height: 34px; font-size: 16px; font-weight: 600; padding: 4px 6px; }
.boardLayout .nationActions input { min-height: 34px; font-size: 16px; font-weight: 600; }
.boardLayout.hasPendingBids .cardHeading :deep(.artworkButton img) { height: clamp(60px, calc((100vh - 660px) / 2), 150px); }
</style>
