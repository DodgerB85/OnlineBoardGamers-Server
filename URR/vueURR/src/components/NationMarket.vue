<script setup>
import { computed, reactive } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as controller from "../js/URRcontroller"
import { getNationCardImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
const amounts = reactive({})
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
function isAuction(nation) { return auction.value?.nation === nation.id }
function owner(nation) { return nation.ownerType === "player" ? store.players[nation.owner].displayName : "Available" }
function bid(nation) { controller.submitAction({ type: "bidNation", nation: nation.id, amount: Number(amount(nation)) }) }
</script>

<template>
	<section class="nationMarket" aria-label="Independent nations">
		<div v-if="store.gameMessages.actionError || store.gameMessages.errorText" role="alert">{{ store.gameMessages.actionError || store.gameMessages.errorText }}</div>
		<p class="marketHeading"><b>{{ auction ? `Auction: ${rf.NATION_NAMES[auction.nation]}` : "Independent nations" }}</b><span>{{ available }} SPL</span></p>
		<p v-if="auction" class="auctionInfo">High bid {{ auction.amount }} SPL · {{ store.players[auction.highPlayer].displayName }}</p>
		<div class="nationList">
			<article v-for="nation in store.nations" :key="nation.id" class="nationRow" :class="{ current: isAuction(nation) || (!auction && treaty?.id === nation.id), acquired: nation.ownerType !== null }">
				<div class="cardHeading"><img :src="getNationCardImage(nation.id)" :alt="rf.NATION_NAMES[nation.id]" /></div>
				<div class="nationInfo">
					<div class="nationTitle"><span>{{ owner(nation) }}</span></div>
					<div class="nationStats">Price {{ price(nation) }} · Income {{ rf.NATION_INCOMES[nation.id] }} SPL</div>
				</div>
				<ol v-if="nation.bids.length"><li v-for="offer in nation.bids" :key="offer.player">{{ store.players[offer.player].displayName }}: {{ offer.amount }} SPL</li></ol>
				<template v-if="nation.ownerType === null">
					<button v-if="!auction && treaty?.id === nation.id" :disabled="!personal.canPlay() || available < price(nation)" @click="controller.submitAction({ type: 'buyNation', nation: nation.id })">Buy for {{ price(nation) }} SPL</button>
					<form v-else-if="!auction || isAuction(nation)" @submit.prevent="bid(nation)">
						<label :for="`nation-bid-${nation.id}`">{{ auction ? "Bid" : "Offer" }} SPL</label>
						<input :id="`nation-bid-${nation.id}`" type="number" :value="amount(nation)" @input="amounts[nation.id] = Number($event.target.value)" :min="minimum(nation)" step="1" required :disabled="!personal.canPlay()" />
						<button :disabled="!personal.canPlay() || amount(nation) < minimum(nation) || amount(nation) > moneyForBid(nation)">{{ auction ? "Bid" : "Make offer" }}</button>
					</form>
				</template>
				<details class="nationArtwork">
					<summary>Special ability</summary>
					<div class="artworkCrop"><img :src="getNationCardImage(nation.id)" :alt="`${rf.NATION_NAMES[nation.id]} card artwork`" /></div>
				</details>
			</article>
		</div>
		<button class="passButton" :disabled="!personal.canPlay()" @click="controller.submitAction({ type: 'pass' })">{{ auction ? "Withdraw" : "Pass" }}</button>
	</section>
</template>

<style scoped>
.cardHeading { height: 27px; overflow: hidden; margin-bottom: 4px; }.cardHeading img { width: 100%; display: block; }
.nationMarket { text-align: left; color: #263238; font-size: 12px; }.nationMarket p { margin: 5px 0; }.marketHeading { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid #c8c2b4; }.marketHeading span { color: #52616a; }.auctionInfo { padding: 5px 7px; background: #e8f2f6; border-left: 3px solid #177daf; }
.nationList { display: flex; flex-direction: column; gap: 5px; margin: 7px 0; }.nationRow { min-width: 0; padding: 7px; background: #f7f5ef; border: 1px solid #c9c2b2; border-radius: 4px; }.nationRow.current { border-color: #177daf; box-shadow: inset 3px 0 #177daf; }.nationRow.acquired { background: #ece9df; }.nationInfo { margin-bottom: 5px; }.nationTitle { display: flex; justify-content: space-between; gap: 5px; }.nationTitle span { color: #647078; text-align: right; }.nationStats { margin-top: 2px; color: #4e5d63; }
ol { padding-left: 18px; margin: 4px 0; color: #52616a; }form { display: flex; gap: 4px; align-items: center; }form label { font-size: 11px; }input { width: 58px; min-width: 0; }button { cursor: pointer; }button:disabled { cursor: default; }.passButton { width: 100%; margin-top: 3px; }.nationArtwork { margin-top: 5px; color: #647078; }.nationArtwork summary { cursor: pointer; font-size: 11px; }.artworkCrop { height: auto; aspect-ratio: 1.65; margin-top: 4px; overflow: hidden; border-radius: 3px; }.artworkCrop img { display: block; width: 100%; height: auto; }
</style>
