<script setup lang="ts">
/**
 * Cattle market, ported from the boardgamefiesta GWT cattle-market.component
 * (GPL-3.0, Tom Wetjens): market cards as artwork, click-to-select and confirm
 * a buy (single or pair), plus a draw-stack placeholder.
 */
import { computed, ref } from "vue"
import { ActionType, CattleCard, isCattleCard } from "../game"
import { useGameStore } from "../stores/game"
import { cardBackImage } from "../view/assets"
import CardView from "./CardView.vue"

const store = useGameStore()

const game = computed(() => {
	store.version
	return store.game
})
function g() {
	const v = game.value
	if (!v) throw new Error("no game")
	return v
}

const market = computed<CattleCard[]>(() => (game.value ? g().getCattleMarket().market : []))
const drawStackSize = computed(() => (game.value ? g().getCattleMarket().drawStack.length : 0))
const buying = computed(() => store.actions.includes(ActionType.BUY_CATTLE))
const takingThree = computed(() => store.actions.includes(ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD))

const possibleBuys = computed(() => {
	if (!game.value || !buying.value) return []
	const ps = g().currentPlayerState()
	return g().getCattleMarket().possibleBuys(ps.cowboysRemaining(), ps.balance)
})

const selected = ref<CattleCard[]>([])

function canBuySingle(breedingValue: number): boolean {
	return possibleBuys.value.some((o) => o.breedingValue === breedingValue && !o.pair)
}
function canBuyPair(breedingValue: number): boolean {
	return possibleBuys.value.some((o) => o.breedingValue === breedingValue && o.pair)
}
function canSelectCard(card: CattleCard): boolean {
	if (takingThree.value) return card.value === 3
	return buying.value && canBuySingle(card.value)
}
function isSelected(card: CattleCard): boolean {
	return selected.value.includes(card)
}

function selectCard(card: CattleCard) {
	if (takingThree.value && card.value === 3) {
		store.perform({ type: ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD, card })
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
		const m = g().getCattleMarket().market.find((mc) => isCattleCard(mc) && (mc as CattleCard).type === sel.type && (mc as CattleCard).value === sel.value)
		return (m ?? sel) as never
	})
	store.perform({ type: ActionType.BUY_CATTLE, cattleCards: cards, cowboys: option.cowboys, dollars: option.dollars })
	selected.value = []
}
</script>

<template>
	<div id="cattleMarket" v-if="game">
		<div v-if="buying || takingThree" class="hint">
			<span>{{ takingThree ? "Take a breeding value 3 card" : "Select card(s) to buy" }}</span>
			<button v-if="buying" class="buy" :disabled="!canConfirm" @click="confirm">Buy</button>
		</div>
		<div class="cards" :class="{ buying: buying || takingThree, selecting: selected.length > 0 }">
			<CardView
				v-for="(card, i) in market"
				:key="i"
				class="marketCard"
				:class="{ disabled: !canSelectCard(card), selected: isSelected(card) }"
				:card="card"
				@click="selectCard(card)"
			/>
			<div class="drawStack" :class="{ empty: drawStackSize === 0 }">
				<img :src="cardBackImage()" alt="" draggable="false" />
				<span class="count">{{ drawStackSize }}</span>
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
.marketCard.selectable { cursor: pointer; }
.marketCard.selectable:hover { border-color: black; }
.cards.buying .marketCard.disabled { border-color: grey; opacity: 0.6; }
.cards.selecting .marketCard { opacity: 0.7; }
.cards.selecting .marketCard.selected { border-color: green; opacity: 1; }
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
.drawStack img { width: 100%; height: 100%; display: block; }
.drawStack .count {
	position: absolute;
	right: 4px;
	bottom: 2px;
	color: white;
	font-size: 12px;
	font-weight: bold;
	text-shadow: -1px -1px 0 #000, 1px -1px 0 #000;
}
</style>
