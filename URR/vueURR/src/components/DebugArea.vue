<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import * as model from "../js/URRmodel"
import * as funcs from "../js/URRfuncs"
import * as rf from "../js/URRreference"
import * as view from "../js/URRview"
import * as rules from "../js/URRrules"
import * as debug from "../js/URRdebug"
import * as IO from "../backend/URR_IO"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const { t } = useI18n()
const money = ref(100)
const nation = ref(0)
const phase = ref(rf.PHASE_SETTLEMENT)
const tools = { land: t("debug.tools.land"), removeLand: t("debug.tools.removeLand"), terrain: t("debug.tools.terrain"), river: t("debug.tools.river"), city: t("debug.tools.city"), pump: t("debug.tools.pump"), reservoir: t("debug.tools.reservoir"), removeWaterwork: t("debug.tools.removeWaterwork"), canal: t("debug.tools.canal"), irrigate: t("debug.tools.irrigate"), dry: t("debug.tools.dry") }

function startTool(tool) {
	store.debug.tool = tool
	store.debug.path = []
}
function undo() {
	if (!debug.canDebug() || !store.debug.undo.length) return
	model.restoreState(store.debug.undo.pop())
	startTool("")
}
function giveNation(toState) {
	debug.changePosition((game) => {
		Object.assign(game.nations[nation.value], { ownerType: toState ? "state" : "player", owner: toState ? store.debug.state : store.debug.player, isRemoved: false, bids: [] })
		if (nation.value === rf.NATION_FIRST_AKKADIANS && !toState) {
			for (const area of game.board.areas.filter((area) => area.nation === nation.value)) area.owner = area.markerOwner = store.debug.player
			game.states[rf.STATE_AKKAD].king = rules.getKing(game, rf.STATE_AKKAD)
		}
	})
}
function addCrew() {
	debug.changePosition((game) => {
		game.states[store.debug.state].diggers.push({ id: game.nextDiggerId++, era: store.debug.era, capacity: rf.ERA_CARD_DATA[store.debug.era].digger[0], hasDug: false })
	})
}
function harvest(distribute) {
	debug.changePosition((game) => {
		const state = game.states[store.debug.state]
		const amount = rules.harvestAmount(game, state.id)
		if (distribute) {
			const result = rules.harvestDistribution(game, state.id, amount)
			for (let index = 0; index < game.players.length; index++) game.players[index].money += result.payments[index]
			state.money += result.retained
		} else state.money += amount
	})
}
function setPhase() {
	debug.changePosition((game) => {
		const flow = game.gameflow
		flow.phase = phase.value
		flow.turnOrder = [store.debug.player]
		flow.pendingOffer = null
		flow.auction = null
		flow.passes = 0
		flow.stateOrder = game.states.filter((state) => state.isActive && state.king !== null).map((state) => state.id)
		flow.stateIndex = 0
		flow.developmentStep = null
		if (phase.value === rf.PHASE_DEVELOPMENT) {
			const state = game.states[store.debug.state]
			state.isActive = true
			state.king = store.debug.player
			flow.stateOrder = [state.id, ...flow.stateOrder.filter((id) => id !== state.id)]
			flow.developmentStep = "digging"
			for (const entry of game.states) for (const crew of entry.diggers) crew.hasDug = false
		}
		if (phase.value === rf.PHASE_RAINY_SEASON) game.rain = { step: "harvest", outflow: 1, harvestOrder: [store.debug.state] }
	})
}
async function save() {
	if (!debug.canDebug()) return
	startTool("")
	model.addHistory(rf.HIST_ACTION, store.debug.player)
	await IO.saveGame(true)
}
function showState() { window.alert(JSON.stringify(funcs.decompressData64(funcs.exportURRmodel()), null, 2)) }
</script>

<template>
	<section id="debugArea">
		<h3>{{ $t("debug.title") }}</h3>
		<p>{{ $t("debug.intro") }}</p>
		<p v-if="!store.board.areas.length">{{ $t("debug.noBoard") }}</p>
		<fieldset :disabled="!debug.canDebug()">
			<div class="debugRow">
				<span>{{ $t("debug.player") }}</span><button v-for="(player, index) in store.players" :key="index" :aria-pressed="store.debug.player === index" @click="store.debug.player = index"><PlayerMarker :index="index" /></button>
				<label>{{ $t("debug.state") }} <select v-model="store.debug.state"><option v-for="id in rf.ALL_STATES" :key="id" :value="id">{{ rf.STATE_NAMES[id] }}</option></select></label>
				<label>{{ $t("debug.cardEra") }} <select v-model="store.debug.era"><option v-for="era in rf.ALL_ERAS" :key="era" :value="era">{{ era }}</option></select></label>
				<label>{{ $t("debug.terrain") }} <select v-model="store.debug.landType"><option v-for="type in rf.ALL_LAND_TYPES" :key="type" :value="type">{{ rf.LAND_NAMES[type] }}</option></select></label>
			</div>
			<div class="debugRow"><button v-for="(label, tool) in tools" :key="tool" :class="{ selected: store.debug.tool === tool }" @click="startTool(tool)">{{ label }}</button><button @click="startTool('')">{{ $t("debug.stopPlacement") }}</button></div>
			<div v-if="store.debug.tool"><b>{{ $t("debug.clickMap", { tool: tools[store.debug.tool] }) }}</b><span v-if="store.debug.tool === 'canal'">{{ $t("debug.canalHint") }}</span></div>
			<div class="debugRow"><button @click="addCrew">{{ $t("debug.addCrew") }}</button><button @click="debug.changePosition(game => { const state = game.states[store.debug.state]; state.isActive = true; state.king = store.debug.player })">{{ $t("debug.activateState") }}</button><button @click="debug.changePosition(game => { for (const crew of game.states[store.debug.state].diggers) crew.hasDug = false })">{{ $t("debug.resetCrews") }}</button></div>
			<div class="debugRow"><label><CurrencyText :text="$t('debug.spl')" /> <input type="number" min="0" step="1" v-model.number="money" /></label><button :disabled="!Number.isInteger(money) || money < 0" @click="debug.changePosition(game => { game.players[store.debug.player].money = money })">{{ $t("debug.setPrivateTreasury") }}</button><button :disabled="!Number.isInteger(money) || money < 0" @click="debug.changePosition(game => { game.states[store.debug.state].money = money })">{{ $t("debug.setStateTreasury") }}</button></div>
			<div class="debugRow"><label>{{ $t("debug.nation") }} <select v-model="nation"><option v-for="id in rf.ALL_NATIONS" :key="id" :value="id">{{ rf.NATION_NAMES[id] }}</option></select></label><button @click="giveNation(false)">{{ $t("debug.giveToPlayer") }}</button><button @click="giveNation(true)">{{ $t("debug.assimilateIntoState") }}</button><button @click="debug.changePosition(game => { game.nations[nation].isRemoved = true })">{{ $t("debug.removeNation") }}</button></div>
			<div class="debugRow"><label>{{ $t("debug.phase") }} <select v-model="phase"><option v-for="id in rf.ALL_PHASES.filter(id => id !== rf.PHASE_GAME_OVER)" :key="id" :value="id">{{ view.phaseStr(id) }}</option></select></label><button @click="setPhase">{{ $t("debug.startPhase") }}</button><button @click="debug.changePosition(game => { game.era = store.debug.era })">{{ $t("debug.setGameEra") }}</button></div>
			<div class="debugRow"><button @click="debug.changePosition(game => { game.gameflow.primogeniture = store.debug.player; game.gameflow.primogenitureBid = null })">{{ $t("debug.givePrimogeniture") }}</button><button @click="harvest(false)">{{ $t("debug.storeHarvest") }}</button><button @click="harvest(true)">{{ $t("debug.distributeHarvest") }}</button></div>
			<div class="debugRow"><button :disabled="!store.debug.undo.length" @click="undo">{{ $t("debug.undoCheat") }}</button><button @click="save">{{ $t("debug.savePosition") }}</button></div>
		</fieldset>
		<button @click="showState">{{ $t("debug.showGameData") }}</button>
		<div class="debugError" v-if="store.gameMessages.actionError"><CurrencyText :text="store.gameMessages.actionError" /></div>
	</section>
</template>

<style scoped>
#debugArea { border: 1px dashed darkred; background: lightpink; padding: 8px; margin: 8px 0; width: 100%; text-align: left; box-sizing: border-box; font-size: 16px; font-weight: 400; }
h3 { margin: 0; } p { margin: 6px 0; } fieldset { border: 0; padding: 0; min-width: 0; }
.debugRow { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin: 6px 0; }
button, select, input { font: inherit; } button { cursor: pointer; padding: 4px 7px; } input { width: 80px; } .selected { outline: 2px solid #247422; font-weight: bold; } .debugError { color: #a40000; }
</style>
