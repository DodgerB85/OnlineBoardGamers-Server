<script setup>
/**
 * Cattle market, ported from the boardgamefiesta GWT cattle-market.component
 * (GPL-3.0, Tom Wetjens): market cards as artwork, click-to-select and confirm
 * a buy (single or pair), plus a draw-stack placeholder.
 */
import { computed, ref } from "vue"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as view from "../js/ROWview"
import { isCattleCard, CattleType } from "../js/ROWcore"
import { useModelStore } from "../stores/ROWstore.js"
import CardView from "./CardView.vue"

const { ActionType } = rf
const store = useModelStore()

const game = computed(() => {
	store.version
	return store.game
})
function g() {
	const v = game.value
	if (!v) throw new Error("no game")
	return v
}

const market = computed(() => (game.value ? g().getCattleMarket().market : []))
// Display order only (copy, never the live array): ascending breeding value keeps
// colours together and pins brown West Highland left of purple Texas Longhorn;
// ties fall back to colour, then points.
const CATTLE_TYPE_ORDER = [
	CattleType.JERSEY,
	CattleType.GUERNSEY,
	CattleType.BLACK_ANGUS,
	CattleType.DUTCH_BELT,
	CattleType.SIMMENTAL,
	CattleType.HOLSTEIN,
	CattleType.BROWN_SWISS,
	CattleType.AYRSHIRE,
	CattleType.WEST_HIGHLAND,
	CattleType.TEXAS_LONGHORN,
]
function marketOrder(a, b) {
	return (
		(a.value ?? 0) - (b.value ?? 0) ||
		CATTLE_TYPE_ORDER.indexOf(a.type) - CATTLE_TYPE_ORDER.indexOf(b.type) ||
		(a.points ?? 0) - (b.points ?? 0)
	)
}
const displayMarket = computed(() => [...market.value].sort(marketOrder))
const drawStackSize = computed(() => (game.value ? g().getCattleMarket().drawStack.length : 0))
const buying = computed(() => store.actions.includes(ActionType.BUY_CATTLE))
const takingThree = computed(() => store.actions.includes(ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD))

const possibleBuys = computed(() => {
	if (!game.value || !buying.value) return []
	const ps = g().currentPlayerState()
	return g().getCattleMarket().possibleBuys(ps.cowboysRemaining(), ps.balance)
})

/** DRAW_2_CATTLE_CARDS lives on the draw pile: 1 cowboy for 2 cards, repeatable. */
const drawingTwo = computed(() => store.actions.includes(ActionType.DRAW_2_CATTLE_CARDS))

const selected = ref([])

const hint = computed(() => {
	if (takingThree.value) return "Take a breeding value 3 card"
	if (buying.value) return possibleBuys.value.length ? "Select card(s) to buy" : "Not enough dollars or cowboys to buy cattle"
	return `Click the draw pile to draw 2 cattle cards for 1 cowboy (${g().currentPlayerState().cowboysRemaining()} left)`
})

function drawTwo() {
	if (!drawingTwo.value) return
	selected.value = []
	controller.perform({ type: ActionType.DRAW_2_CATTLE_CARDS })
}

function canBuySingle(breedingValue) {
	return possibleBuys.value.some((o) => o.breedingValue === breedingValue && !o.pair)
}
function canBuyPair(breedingValue) {
	return possibleBuys.value.some((o) => o.breedingValue === breedingValue && o.pair)
}
function canSelectCard(card) {
	if (takingThree.value) return card.value === 3
	return buying.value && canBuySingle(card.value)
}
function isSelected(card) {
	return selected.value.includes(card)
}

function selectCard(card) {
	if (takingThree.value && card.value === 3) {
		controller.perform({ type: ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD, card })
		return
	}
	if (!canSelectCard(card)) return

	const idx = selected.value.indexOf(card)
	if (idx >= 0) {
		selected.value.splice(idx, 1)
		return
	}
	if (selected.value.length === 2) selected.value.splice(0, 1)
	if (selected.value.length > 0 && (selected.value[0].value !== card.value || !canBuyPair(card.value))) {
		selected.value = []
	}
	selected.value.push(card)
}

const canConfirm = computed(() => {
	if (selected.value.length === 0) return false
	return possibleBuys.value.some((o) => o.breedingValue === selected.value[0].value && o.pair === (selected.value.length === 2))
})

function confirm() {
	const options = possibleBuys.value
		.filter((o) => o.breedingValue === selected.value[0].value)
		.filter((o) => o.pair === (selected.value.length === 2))
		.sort((a, b) => a.cowboys - b.cowboys)
	const option = options[0]
	if (!option) return
	// Resolve the selected cards to actual market card objects.
	const cards = selected.value.map((sel) => {
		const m = g().getCattleMarket().market.find((mc) => isCattleCard(mc) && mc.type === sel.type && mc.value === sel.value)
		return m ?? sel
	})
	controller.perform({ type: ActionType.BUY_CATTLE, cattleCards: cards, cowboys: option.cowboys, dollars: option.dollars })
	selected.value = []
}
</script>

<template>
	<div id="cattleMarket" v-if="game">
		<div v-if="buying || takingThree || drawingTwo" class="hint">
			<span>{{ hint }}</span>
			<button v-if="buying" class="buy" :disabled="!canConfirm" @click="confirm">Buy</button>
		</div>
		<div class="cards" :class="{ buying: buying || takingThree, selecting: selected.length > 0 }">
			<CardView
				v-for="(card, i) in displayMarket"
				:key="i"
				class="marketCard"
				:class="{ selectable: canSelectCard(card), disabled: !canSelectCard(card), selected: isSelected(card) }"
				:card="card"
				@click="selectCard(card)"
			/>
			<div
				class="drawStack"
				:class="{ empty: drawStackSize === 0, selectable: drawingTwo }"
				:title="drawingTwo ? 'Draw 2 cattle cards for 1 cowboy' : `Draw pile (${drawStackSize}) — cattle cards still to be turned face up into the market`"
				@click="drawTwo"
			>
				<img :src="view.cardBackImage()" alt="" draggable="false" />
				<em class="stackLabel">{{ drawingTwo ? "Draw 2" : "Draw" }}</em>
				<span class="count">({{ drawStackSize }})</span>
				<em v-if="drawingTwo" class="cost">1 cowboy</em>
			</div>
		</div>
	</div>
</template>

<style scoped>
#cattleMarket { margin: 8px; }
.hint { margin-bottom: 4px; font-size: 13px; }
.hint .buy { margin-left: 8px; padding: 2px 10px; cursor: pointer; font-weight: bold; }
.hint .buy:disabled { opacity: 0.4; cursor: default; }
.cards { display: flex; flex-wrap: wrap; gap: 4px; }
.marketCard { box-shadow: 4px 4px 4px rgb(0, 0, 0, 0.75); border: 3px solid #ffffff; border-radius: 6px; cursor: default; }
.marketCard.selectable { cursor: pointer; border-width: 5px; border-color: #ffd400; }
.marketCard.selectable:hover { border-color: #90ee90; }
.cards.buying .marketCard.disabled { border-color: grey; opacity: 0.6; }
.cards.selecting .marketCard { opacity: 0.7; }
.cards.selecting .marketCard.selected { border-color: #90ee90; opacity: 1; }
.drawStack {
	position: relative;
	width: 80px;
	height: 115px;
	border: 3px solid white;
	border-radius: 5px;
	box-shadow: 4px 4px 4px rgb(0, 0, 0, 0.75);
	overflow: hidden;
}
.drawStack.empty { border: none; }
.drawStack.selectable { cursor: pointer; border-width: 5px; border-color: #ffd400; }
.drawStack.selectable:hover { border-color: #90ee90; }
.drawStack img { width: 100%; height: 100%; display: block; }
.drawStack .stackLabel {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	font-style: normal;
	font-size: 13px;
	font-weight: bold;
	line-height: 17px;
	text-align: center;
	color: white;
	background: rgba(0, 0, 0, 0.55);
	text-shadow: -1px -1px 0 #000, 1px 1px 0 #000;
}
.drawStack .count {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 2px;
	text-align: center;
	color: white;
	font-size: 17px;
	font-weight: bold;
	text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
}
/* Cost of the draw-2 option, shown once the action is live. */
.drawStack .cost {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 22px;
	font-style: normal;
	font-size: 12px;
	font-weight: bold;
	text-align: center;
	color: white;
	background: rgba(144, 238, 144, 0.85);
	text-shadow: -1px -1px 0 #000, 1px 1px 0 #000;
}
</style>
