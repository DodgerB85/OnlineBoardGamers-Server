<script setup>
import { computed } from "vue"
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import * as funcs from "../js/DDLfuncs.js"
import * as view from "../js/DDLview.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

const playerIndex = computed(() => {
	if (personal.trainingGame) return store.gameflow.turnOrder[0] ?? -1
	if (personal.pov >= 0) return personal.pov
	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	return -1
})

const player = computed(() => (playerIndex.value >= 0 ? store.players[playerIndex.value] : null))
const active = computed(() => store.gameflow.turnOrder[0] === playerIndex.value)

const slots = computed(() =>
	rf.SHIP_SLOTS.map((slot, index) => ({
		index,
		number: slot.number,
		gear: player.value ? player.value.gear[index] : null,
	}))
)

const goods = computed(() => (player.value ? player.value.goods : []))

const gearColour = (key) => {
	if (key === "navigator") return "#d33a3a"
	if (key === "builder") return "#d9b21f"
	if (key === "merchant") return "#2f6fd0"
	if (key === "cargo") return "#333"
	return "#ddd"
}

const speed = computed(() => (player.value ? rules.shipSpeed(player.value) : 0))
const capacity = computed(() => (player.value ? rules.cargoCapacity(player.value) : 0))
</script>

<template>
	<div id="shipPanel" v-if="player">
		<div class="panelTitle" :style="{ borderColor: personal.getCorrectedColourHex(player.colour) }">
			<span>{{ player.displayName }}</span>
			<span class="small">{{ active ? $t("common.currentTurn") : $t("common.waiting") }}</span>
		</div>

		<div class="energyRow">
			<span v-for="c in 3" :key="c" class="energyPip" :style="{ backgroundColor: rf.ENERGY_HEX[c - 1] }" :title="$t('energy.title', { colour: view.energyLabel(c - 1) })">
				{{ player.energy[c - 1] }}<span v-if="player.virtual[c - 1]" class="virtual">+{{ player.virtual[c - 1] }}</span>
			</span>
			<span class="energyMeta">{{ $t("ship.speedCargo", { speed, used: goods.length, capacity }) }}</span>
		</div>

		<div class="shipSlots">
			<div v-for="slot in slots" :key="slot.index" class="shipSlot" :class="{ filled: slot.gear }" :style="{ borderColor: slot.gear ? gearColour(slot.gear) : '#8a9bb0' }" :title="slot.gear ? view.gearLabel(slot.gear) : $t('ship.emptySlotTitle', { number: slot.number })">
				<span v-if="!slot.gear" class="slotNumber">{{ slot.number }}</span>
				<span v-else class="gearName">{{ view.gearLabel(slot.gear) }}</span>
			</div>
		</div>

		<div class="cargoBox">
			<div class="cargoTitle">{{ $t("ship.cargo") }}</div>
			<div class="cargoGoods">
				<img v-for="(good, index) in goods" :key="index" :src="funcs.goodImage(good)" :title="rf.goodName(good)" class="cargoGood" />
				<span v-if="goods.length === 0" class="emptyCargo">{{ $t("common.empty") }}</span>
			</div>
		</div>

		<div class="shipMeta">
			<span>{{ $t("ship.cubes", { count: player.cubes }) }}</span>
			<span>{{ $t("ship.privileges", { count: player.privileges }) }}</span>
			<span v-if="player.pathways.placed" class="pathwayDone">{{ $t("ship.pathwaysPlaced") }}</span>
			<span v-else class="pathwayTodo">{{ $t("ship.pathwaysUnused") }}</span>
		</div>
		<div v-if="player.auctionBid" class="auctionNote">{{ $t("ship.auctionNote", { amount: player.auctionBid }) }}</div>
	</div>
</template>

<style scoped>
#shipPanel {
	width: 250px;
	background: #f7fbff;
	border: 2px solid #3d5a80;
	border-radius: 6px;
	padding: 6px;
	font-size: 12px;
	text-align: left;
	flex: 0 0 auto;
}
.panelTitle {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	border-bottom: 3px solid;
	font-weight: bold;
	font-size: 15px;
	padding-bottom: 2px;
	margin-bottom: 4px;
}
.panelTitle .small { font-size: 10px; color: #555; font-weight: normal; }
.energyRow { display: flex; align-items: center; gap: 4px; margin-bottom: 5px; flex-wrap: wrap; }
.energyPip {
	color: white;
	font-weight: bold;
	border-radius: 50%;
	width: 30px;
	height: 30px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 2px solid #222;
	position: relative;
}
.energyPip .virtual { position: absolute; right: -4px; bottom: -4px; font-size: 9px; background: #111; color: #ffe600; border-radius: 3px; padding: 0 2px; }
.energyMeta { font-size: 10px; color: #333; }
.shipSlots {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 3px;
	margin-bottom: 5px;
}
.shipSlot {
	min-height: 34px;
	border: 2px dashed #8a9bb0;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #e8eef5;
	padding: 2px;
	text-align: center;
}
.shipSlot.filled { border-style: solid; background: #fff; }
.slotNumber { font-size: 18px; color: #6a7c93; font-weight: bold; }
.gearName { font-size: 10px; font-weight: bold; }
.cargoBox { border-top: 1px solid #b8c6d6; padding-top: 3px; margin-top: 2px; }
.cargoTitle { font-weight: bold; font-size: 11px; }
.cargoGoods { display: flex; flex-wrap: wrap; gap: 2px; min-height: 28px; align-items: center; }
.cargoGood { width: 26px; height: 26px; border: 1px solid #aaa; border-radius: 3px; background: #fff; }
.emptyCargo { color: #888; font-style: italic; font-size: 11px; }
.shipMeta { display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid #b8c6d6; margin-top: 3px; padding-top: 3px; font-size: 10px; color: #333; }
.pathwayDone { color: #126b2a; }
.pathwayTodo { color: #8a4b00; }
.auctionNote { font-size: 10px; color: #8a4b00; margin-top: 3px; }
</style>
