<script setup>
import { computed, ref } from "vue"
import * as rf from "../js/DDLreference.js"
import * as controller from "../js/DDLcontroller.js"
import * as funcs from "../js/DDLfuncs.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()
const target = ref(-1)

const playerIndex = computed(() => (personal.trainingGame ? store.gameflow.turnOrder[0] : personal.pov))
const me = computed(() => (playerIndex.value >= 0 ? store.players[playerIndex.value] : null))
const visible = computed(() => store.viewSettings.showTrade && me.value)
const others = computed(() => {
	if (!me.value || !me.value.ship.node) return []
	return store.players.map((p, idx) => ({ p, idx })).filter((entry) => entry.idx !== playerIndex.value && entry.p.ship.node === me.value.ship.node && rf.planetByNode(entry.p.ship.node))
})
const targetPlayer = computed(() => (target.value >= 0 ? store.players[target.value] : null))

function goodsOf(player) {
	const counts = {}
	for (const good of player.goods) counts[good] = (counts[good] || 0) + 1
	return rf.GOODS.filter((g) => counts[g.id] > 0).map((g) => ({ ...g, count: counts[g.id] }))
}

function toggleGive(goodId) {
	const idx = store.context.selectedGive.indexOf(goodId)
	if (idx === -1) store.context.selectedGive.push(goodId)
	else store.context.selectedGive.splice(idx, 1)
}
function toggleReceive(goodId) {
	const idx = store.context.selectedReceive.indexOf(goodId)
	if (idx === -1) store.context.selectedReceive.push(goodId)
	else store.context.selectedReceive.splice(idx, 1)
}
function close() {
	store.viewSettings.showTrade = false
	store.context.selectedGive.splice(0)
	store.context.selectedReceive.splice(0)
}
async function propose() {
	if (target.value < 0) return
	await controller.proposeTrade(target.value, [...store.context.selectedGive], [...store.context.selectedReceive])
	store.context.selectedGive.splice(0)
	store.context.selectedReceive.splice(0)
	target.value = -1
}
</script>

<template>
	<div v-if="visible" class="modalOverlay">
		<div class="modalBox">
			<h2>{{ $t("trade.title") }}</h2>
			<p>{{ $t("trade.intro") }}</p>
			<select v-model.number="target">
				<option :value="-1">{{ $t("common.choosePlayer") }}</option>
				<option v-for="entry in others" :key="entry.idx" :value="entry.idx">{{ entry.p.displayName }}</option>
			</select>

			<div v-if="targetPlayer" class="tradeColumns">
				<div class="tradeColumn">
					<h3>{{ $t("trade.youGive") }}</h3>
					<button v-for="g in goodsOf(me)" :key="g.id" class="goodButton" :class="{ selected: store.context.selectedGive.includes(g.id) }" @click="toggleGive(g.id)">
						<img :src="funcs.goodImage(g.id)" />
						<span>{{ $t("common.goodCount", { good: rf.goodName(g.id), count: g.count }) }}</span>
					</button>
					<div class="chosen">{{ $t("trade.selected", { goods: funcs.formatGoods(store.context.selectedGive) || $t("common.nothing") }) }}</div>
				</div>
				<div class="tradeColumn">
					<h3>{{ $t("trade.youReceive") }}</h3>
					<button v-for="g in goodsOf(targetPlayer)" :key="g.id" class="goodButton" :class="{ selected: store.context.selectedReceive.includes(g.id) }" @click="toggleReceive(g.id)">
						<img :src="funcs.goodImage(g.id)" />
						<span>{{ $t("common.goodCount", { good: rf.goodName(g.id), count: g.count }) }}</span>
					</button>
					<div class="chosen">{{ $t("trade.selected", { goods: funcs.formatGoods(store.context.selectedReceive) || $t("common.nothing") }) }}</div>
				</div>
			</div>
			<div class="buttons">
				<button class="actionsLineButton" :disabled="target < 0 || (store.context.selectedGive.length === 0 && store.context.selectedReceive.length === 0)" @click="propose">{{ $t("trade.sendOffer") }}</button>
				<button class="actionsLineButton" @click="close">{{ $t("common.cancel") }}</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.modalOverlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 5000; pointer-events: none; }
.modalBox { background: #fffdf3; border: 3px solid #7a5b19; border-radius: 8px; padding: 18px; width: 680px; max-width: 92vw; text-align: center; pointer-events: auto; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
.tradeColumns { display: flex; gap: 20px; justify-content: center; margin-top: 10px; }
.tradeColumn { width: 50%; border: 1px solid #c9b06a; border-radius: 5px; padding: 8px; }
.tradeColumn h3 { margin: 2px 0 6px 0; }
.goodButton { display: flex; align-items: center; gap: 6px; width: 100%; border: 1px solid #bbb; border-radius: 4px; background: #fff; cursor: pointer; font-size: 11px; padding: 2px; margin-bottom: 3px; text-align: left; }
.goodButton.selected { border-color: #126b2a; background: #dcffdc; }
.goodButton img { width: 26px; height: 26px; object-fit: contain; }
.chosen { font-size: 11px; color: #444; margin-top: 5px; min-height: 28px; }
.buttons { margin-top: 10px; }
</style>
