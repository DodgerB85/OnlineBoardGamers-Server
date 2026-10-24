<script setup>
import { computed } from "vue"
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import * as controller from "../js/DDLcontroller.js"
import * as funcs from "../js/DDLfuncs.js"
import * as view from "../js/DDLview.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

const playerIndex = computed(() => (personal.trainingGame ? store.gameflow.turnOrder[0] : personal.pov))
const player = computed(() => (playerIndex.value >= 0 ? store.players[playerIndex.value] : null))
const cargoVisible = computed(() => store.viewSettings.showDiscardCargo && player.value)
const energyVisible = computed(() => store.viewSettings.showDiscardEnergy && player.value)
const capacity = computed(() => (player.value ? rules.cargoCapacity(player.value) : 0))
const goods = computed(() => (player.value ? player.value.goods : []))
const energyTotal = computed(() => (player.value ? rules.totalEnergy(player.value) : 0))

function canCloseCargo() {
	return goods.value.length <= capacity.value
}
function canCloseEnergy() {
	return energyTotal.value <= 4
}
function close() {
	store.viewSettings.showDiscardCargo = false
	store.viewSettings.showDiscardEnergy = false
}
</script>

<template>
	<div v-if="cargoVisible || energyVisible" class="modalOverlay">
		<div v-if="cargoVisible" class="modalBox">
			<h2>{{ $t("discard.cargoTitle") }}</h2>
			<p>{{ $t("discard.cargoIntro", { capacity, count: goods.length }) }}</p>
			<div class="goodsGrid">
				<button v-for="(good, index) in goods" :key="index" class="goodButton" :title="$t('discard.discardGood', { good: rf.goodName(good) })" @click="controller.discardCargo(good)">
					<img :src="funcs.goodImage(good)" />
					<span>{{ rf.goodName(good) }}</span>
				</button>
			</div>
			<button class="actionsLineButton" :disabled="!canCloseCargo()" @click="close">{{ $t("common.done") }}</button>
		</div>
		<div v-else class="modalBox">
			<h2>{{ $t("discard.energyTitle") }}</h2>
			<p>{{ $t("discard.energyIntro", { count: energyTotal }) }}</p>
			<div class="energyGrid">
				<div v-for="c in 3" :key="c" class="energyCol">
					<span class="energyPip" :style="{ backgroundColor: rf.ENERGY_HEX[c - 1] }">{{ player.energy[c - 1] }}</span>
					<span>{{ view.energyLabel(c - 1) }}</span>
					<button class="actionsLineButton" :disabled="player.energy[c - 1] <= 0" @click="controller.discardEnergy(c - 1)">{{ $t("discard.discard") }}</button>
				</div>
			</div>
			<button class="actionsLineButton" :disabled="!canCloseEnergy()" @click="close">{{ $t("common.done") }}</button>
		</div>
	</div>
</template>

<style scoped>
.modalOverlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 5000; pointer-events: none; }
.modalBox { background: #fffdf3; border: 3px solid #7a5b19; border-radius: 8px; padding: 18px; width: 560px; max-width: 90vw; text-align: center; pointer-events: auto; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
.goodsGrid { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin: 8px 0; }
.goodButton { width: 70px; border: 1px solid #aaa; border-radius: 4px; background: #fff; cursor: pointer; font-size: 9px; padding: 2px; }
.goodButton img { width: 40px; height: 40px; object-fit: contain; display: block; margin: 0 auto; }
.energyGrid { display: flex; gap: 14px; justify-content: center; margin: 10px 0; }
.energyCol { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.energyPip { color: #fff; font-weight: bold; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 2px solid #222; }
</style>
