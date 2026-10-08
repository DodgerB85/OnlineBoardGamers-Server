<script setup lang="ts">
/**
 * Objective card market, ported from the boardgamefiesta GWT
 * objective-cards.component (GPL-3.0, Tom Wetjens).
 */
import { computed } from "vue"
import { ActionType } from "../game"
import { useGameStore } from "../stores/game"
import CardView from "./CardView.vue"
import { cardBackGreyImage } from "../view/assets"

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

const available = computed(() => (game.value ? g().getObjectiveCards().available : []))
const drawStackSize = computed(() => (game.value ? g().getObjectiveCards().drawStack.length : 0))
const canTake = computed(() => store.actions.includes(ActionType.TAKE_OBJECTIVE_CARD))

function take(id: string) {
	if (!canTake.value) return
	const card = g().getObjectiveCards().available.find((c) => c.id === id)
	if (card) store.perform({ type: ActionType.TAKE_OBJECTIVE_CARD, objectiveCard: card })
}

function takeFromDrawStack() {
	if (!canTake.value) return
	store.perform({ type: ActionType.TAKE_OBJECTIVE_CARD })
}
</script>

<template>
	<div id="objectivesMarket" v-if="game">
		<div v-if="canTake" class="hint">Take an objective card</div>
		<CardView
			v-for="card in available"
			:key="card.id"
			class="objCard"
			:class="{ selectable: canTake }"
			:card="card"
			@click="take(card.id)"
		/>
		<div class="drawStack" :class="{ selectable: canTake }" @click="takeFromDrawStack">
			<img :src="cardBackGreyImage()" alt="" draggable="false" />
			<span class="count">{{ drawStackSize }}</span>
		</div>
	</div>
</template>

<style scoped>
#objectivesMarket { margin: 8px; }
.hint { margin-bottom: 4px; font-size: 13px; }
#objectivesMarket > .objCard, #objectivesMarket > .drawStack { display: inline-block; vertical-align: top; margin: 2px; }
.objCard { box-shadow: 4px 4px 4px rgb(0, 0, 0, 0.75); border: 3px solid #ffffff; border-radius: 6px; cursor: default; }
.objCard.selectable { cursor: pointer; }
.objCard.selectable:hover { border-color: black; }
.drawStack {
	position: relative;
	width: 80px;
	height: 115px;
	border: 3px solid white;
	border-radius: 5px;
	box-shadow: 4px 4px 4px rgb(0, 0, 0, 0.75);
	overflow: hidden;
}
.drawStack img { width: 100%; height: 100%; display: block; }
.drawStack.selectable { cursor: pointer; }
.drawStack.selectable:hover { border-color: black; }
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
