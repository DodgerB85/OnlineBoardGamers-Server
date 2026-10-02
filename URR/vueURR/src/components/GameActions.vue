<script setup>
import { computed, ref, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as controller from "../js/URRcontroller"
import * as model from "../js/URRmodel"
import { applyAction } from "../js/URRgame"
import { getCanalCost, canCrewDig } from "../js/URRmap"
import { currentWaterFrame, waterChoices } from "../js/URRwater"
import { getWaterworkImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const props = defineProps({ selectedArea: { type: String, default: null }, path: { type: Array, default: () => [] } })
const emit = defineEmits(["startDig", "clearPath"])
const store = useModelStore()
const personal = usePersonalStore()
const purchase = ref(null)
const before = ref([[]])
const after = ref([[]])
const maintenanceSales = ref([[]])
const exchangeDer = ref(false)
const primogenitureAmount = ref(1)
const selectedCrew = ref(null)
const nationToBuy = ref(null)
const nationPrice = ref(0)
const removeWaterwork = ref(null)
const waterTarget = ref(null)
const waterAmount = ref(1)
const actor = computed(() => store.gameflow.turnOrder[0])
const area = computed(() => store.board.areas.find((entry) => entry.id === props.selectedArea))
const state = computed(() => store.states[store.gameflow.phase === rf.PHASE_RAINY_SEASON ? store.rain.harvestOrder[0] : store.gameflow.stateOrder[store.gameflow.stateIndex]])
const cardEra = computed(() => rules.nextCardEra(store))
const cardData = computed(() => rf.ERA_CARD_DATA[cardEra.value])
const frame = computed(() => currentWaterFrame(store))
const waterOptions = computed(() => waterChoices(store))
const chosenWater = computed(() => waterOptions.value.find((choice) => choice.area === waterTarget.value))
const removable = computed(() => state.value ? rules.removableWaterworks(store, state.value.id) : [])
const ownedDer = computed(() => {
	const nation = store.nations[rf.NATION_DER]
	return nation && !nation.isRemoved && nation.ownerType === "player" && nation.owner === actor.value
})
const ownedCalah = computed(() => {
	const nation = store.nations[rf.NATION_CALAH]
	return nation && !nation.isRemoved && nation.ownerType === "state" && nation.owner === state.value?.id
})
const assimilationChoices = computed(() => store.nations.filter((nation) => !nation.isRemoved && nation.ownerType !== null && nation.id !== rf.NATION_FIRST_AKKADIANS && !(nation.ownerType === "state" && nation.owner === state.value?.id)))
const barahPlayer = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	return (personal.trainingGame || rf.SUPER_USERS.includes(personal.name)) && nation?.ownerType === "player" ? nation.owner : personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? actor.value : personal.pov
})
const canExchangeBarahshum = computed(() => !personal.haltPlay && personal.pov >= 0 && rules.canExchangeBarahshum(store, barahPlayer.value))
const barahshum = computed(() => store.board.areas.find((entry) => entry.nation === rf.NATION_BARAHSHUM))
const tradeAction = computed(() => ({ type: "tradeLand", sellBefore: before.value.filter((batch) => batch.length), sellAfter: after.value.filter((batch) => batch.length), ...(purchase.value === null ? {} : { buy: purchase.value, exchangeDer: exchangeDer.value }) }))
const hasTrade = computed(() => purchase.value !== null || before.value.some((batch) => batch.length) || after.value.some((batch) => batch.length))
const tradeError = computed(() => hasTrade.value ? preview(tradeAction.value) : "")
const maintenanceAction = computed(() => ({ type: "resolveMaintenance", sales: maintenanceSales.value.filter((batch) => batch.length) }))
const maintenanceError = computed(() => state.value && !rules.hasMaintenanceCrew(store, state.value.id) ? preview(maintenanceAction.value) : "")
const digError = computed(() => {
	if (props.path.length < 2) return "Select at least two areas for a canal path."
	try {
		const cost = getCanalCost(store, props.path)
		const crew = state.value?.diggers.find((entry) => entry.id === selectedCrew.value)
		if (store.gameflow.developmentStep !== "eridu" && (!crew || crew.hasDug)) return "Choose an unused digging crew."
		const capacity = store.gameflow.developmentStep === "eridu" ? 2 : crew.capacity
		return canCrewDig(capacity, cost) ? "" : "The selected crew cannot dig this path."
	} catch (error) { return error.message }
})

function label(id) { return store.board.areas.find((entry) => entry.id === id)?.label || id }
function preview(action) {
	if (actor.value === undefined) return ""
	try { applyAction(model.snapshotState(), actor.value, action); return "" } catch (error) { return error.message }
}
function resetTrade() { purchase.value = null; before.value = [[]]; after.value = [[]]; exchangeDer.value = false }
function queueSale(batches) {
	if (!area.value || (area.value.owner !== actor.value && !(batches === after.value && area.value.id === purchase.value))) return
	if ([...before.value, ...after.value, ...maintenanceSales.value].some((batch) => batch.includes(area.value.id))) return
	const last = batches.at(-1)
	if (last.length && store.board.areas.find((entry) => entry.id === last[0]).landType !== area.value.landType) batches.push([])
	batches[batches.length - 1].push(area.value.id)
}
function removeSale(batches, batchIndex, id) { batches[batchIndex] = batches[batchIndex].filter((entry) => entry !== id) }
async function submit(action) {
	if (await controller.submitAction(action)) {
		resetTrade()
		maintenanceSales.value = [[]]
		if (["dig", "digEridu"].includes(action.type)) emit("clearPath")
	}
}
function buildWaterwork(isCalah = false) {
	if (!area.value) return
	submit({ type: isCalah ? "exchangeCalah" : "requestWaterwork", kind: area.value.isRiver ? "reservoir" : "pump", area: area.value.id })
}
watch(() => [store.gameflow.phase, actor.value, store.gameflow.stateIndex], () => {
	resetTrade()
	maintenanceSales.value = [[]]
	selectedCrew.value = state.value?.diggers.find((crew) => !crew.hasDug)?.id ?? null
	primogenitureAmount.value = (store.gameflow.primogenitureBid?.amount || 0) + 1
}, { immediate: true })
watch(() => props.selectedArea, (id) => { if (waterOptions.value.some((choice) => choice.area === id)) waterTarget.value = id })
watch(() => frame.value?.area, () => { waterTarget.value = null; waterAmount.value = 1 })
watch(nationToBuy, (id) => { nationPrice.value = id === null ? 0 : rf.NATION_PRICES[id] })
watch(removable, (ids) => { if (!ids.includes(removeWaterwork.value)) removeWaterwork.value = ids[0] ?? null })
</script>

<template>
	<section class="gameActions" aria-label="Game actions">
		<div v-if="store.gameMessages.errorText" class="error" role="alert">{{ store.gameMessages.errorText }}</div>
		<div v-if="store.gameMessages.actionError" class="error" role="alert">{{ store.gameMessages.actionError }}</div>
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<b>{{ store.gameflow.endReason === 'revolution' ? 'The game ends after a revolution.' : 'The Southern Peoples invade.' }}</b>
			<ol><li v-for="index in store.gameflow.finalPositions" :key="index">{{ store.players[index].displayName }}: {{ store.players[index].score }} SPL</li></ol>
		</template>
		<template v-else-if="store.gameflow.pendingOffer">
			<b>{{ rf.STATE_NAMES[store.gameflow.pendingOffer.state] }} requests your agreement.</b>
			<p v-if="store.gameflow.pendingOffer.action.type === 'offerNation'">Sell {{ rf.NATION_NAMES[store.gameflow.pendingOffer.action.nation] }} for {{ store.gameflow.pendingOffer.action.amount }} SPL?</p>
			<p v-else>Allow a {{ store.gameflow.pendingOffer.action.kind }} on {{ label(store.gameflow.pendingOffer.action.area) }}?</p>
			<button :disabled="!personal.canPlay()" @click="submit({ type: 'respondOffer', accept: true })">Accept</button>
			<button :disabled="!personal.canPlay()" @click="submit({ type: 'respondOffer', accept: false })">Decline</button>
		</template>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_SETTLEMENT" :disabled="!personal.canPlay()">
			<legend>Settlement · {{ store.players[actor]?.displayName }}</legend>
			<p>Click land on the map to queue one purchase and any sales. Each sale batch is priced before its terrain markers move.</p>
			<div class="buttonRow"><button :disabled="!area || area.isRiver || area.owner !== null" @click="purchase = area.id">Queue purchase {{ area ? label(area.id) : '' }}</button><button :disabled="!area || area.owner !== actor" @click="queueSale(before)">Sell selected before buying</button><button :disabled="!area || (area.owner !== actor && area.id !== purchase)" @click="queueSale(after)">Sell selected after buying</button></div>
			<div v-if="purchase !== null">Buy {{ label(purchase) }} <button @click="purchase = null; exchangeDer = false">Remove purchase</button><label v-if="ownedDer"><input type="checkbox" v-model="exchangeDer" /> Exchange Der for a free forest</label></div>
			<div v-for="(batches, timing) in { Before: before, After: after }" :key="timing" class="saleGroup">
				<template v-for="(batch, index) in batches" :key="index"><div v-if="batch.length">{{ timing }} buying, batch {{ index + 1 }}: <button v-for="id in batch" :key="id" @click="removeSale(batches, index, id)">{{ label(id) }} ×</button></div></template>
				<button v-if="batches.at(-1).length" @click="batches.push([])">Start another {{ timing.toLowerCase() }}-buying sale batch</button>
			</div>
			<p v-if="tradeError" class="error">{{ tradeError }}</p>
			<div class="buttonRow"><button :disabled="!hasTrade || !!tradeError" @click="submit(tradeAction)">Complete trade</button><button :disabled="!hasTrade" @click="resetTrade">Clear trade</button><button :disabled="hasTrade" @click="submit({ type: 'pass' })">Pass</button></div>
			<form class="buttonRow" @submit.prevent="submit({ type: 'bidPrimogeniture', amount: primogenitureAmount })"><label for="primogeniture">Primogeniture bid (refunded):</label><input id="primogeniture" type="number" v-model.number="primogenitureAmount" :min="(store.gameflow.primogenitureBid?.amount || 0) + 1" step="1" required /><button :disabled="hasTrade">Bid</button><span v-if="store.gameflow.primogenitureBid">{{ store.players[store.gameflow.primogenitureBid.player].displayName }} holds the high bid: {{ store.gameflow.primogenitureBid.amount }} SPL</span></form>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_DEVELOPMENT" :disabled="!personal.canPlay()">
			<legend>{{ store.gameflow.developmentStep === 'eridu' ? 'Eridu digs before the states' : state ? `${rf.STATE_NAMES[state.id]} development` : 'Finish development' }}</legend>
			<template v-if="store.gameflow.developmentStep === 'betweenStates'">
				<p>Barahshum's owner may dissolve it to dig a canal before the next state begins.</p>
				<button @click="submit({ type: 'beginDevelopment' })">{{ state ? 'Start this state’s turn' : 'Start rainy season' }}</button>
			</template>
			<template v-else>
				<div v-if="store.gameflow.developmentStep === 'eridu' || store.gameflow.developmentStep === 'digging'" class="actionGroup">
					<label v-if="store.gameflow.developmentStep !== 'eridu'">Digging crew <select v-model="selectedCrew"><option :value="null">Choose crew</option><option v-for="crew in state.diggers" :key="crew.id" :value="crew.id" :disabled="crew.hasDug">{{ crew.capacity }} · crew {{ crew.id + 1 }}{{ crew.hasDug ? ' (used)' : '' }}</option></select></label>
					<button @click="emit('startDig')">Select canal path on map</button><span>{{ path.map(label).join(' → ') }}</span>
					<div class="hint">{{ digError || 'This path fits the selected crew.' }}</div>
					<button :disabled="!!digError" @click="submit(store.gameflow.developmentStep === 'eridu' ? { type: 'digEridu', path } : { type: 'dig', crew: selectedCrew, path })">Dig canal</button>
					<button v-if="store.gameflow.developmentStep === 'eridu'" @click="submit({ type: 'pass' })">Skip Eridu</button>
				</div>
				<template v-if="store.gameflow.developmentStep !== 'eridu'">
					<div class="actionGroup"><b>Buy era {{ cardEra === 5 ? 'M' : cardEra }} equipment</b><p>Purchasing ends this state's digging. Treasury: {{ state.money }} SPL.</p>
						<div class="buttonRow"><button @click="submit({ type: 'buyCard', kind: 'digger' })"><img v-for="(capacity, index) in String(cardData.digger[0]).split('+')" :key="index" class="piece" :src="getWaterworkImage(state.id, capacity)" alt="" />Hire {{ cardData.digger[0] }} crew · {{ cardData.digger[1] }} SPL</button><button :disabled="!area" @click="buildWaterwork()"><img v-if="area" class="piece" :src="getWaterworkImage(state.id, area.isRiver ? cardData.reservoir[0] : cardData.pump[0])" alt="" />Build {{ area?.isRiver ? 'reservoir' : 'pump' }} {{ area ? `on ${label(area.id)}` : '(select area)' }} · {{ area?.isRiver ? cardData.reservoir[1] : cardData.pump[1] }} SPL</button><button v-if="ownedCalah" :disabled="!area" @click="buildWaterwork(true)">Exchange Calah for free waterwork</button></div>
					</div>
					<form v-if="store.era === 3" class="actionGroup buttonRow" @submit.prevent="submit({ type: 'offerNation', nation: nationToBuy, amount: nationPrice })"><label>Assimilate <select v-model="nationToBuy" required><option :value="null">Choose nation</option><option v-for="nation in assimilationChoices" :key="nation.id" :value="nation.id">{{ rf.NATION_NAMES[nation.id] }}</option></select></label><label>Offer SPL <input type="number" v-model.number="nationPrice" :min="nationToBuy === null ? 0 : rf.NATION_PRICES[nationToBuy] / 2" :max="nationToBuy === null ? 0 : rf.NATION_PRICES[nationToBuy] * 2" step="1" required /></label><button :disabled="nationToBuy === null">Request agreement</button></form>
					<div v-if="!rules.hasMaintenanceCrew(store, state.id)" class="actionGroup"><b>A maintenance crew is required.</b><p>The monarch must contribute {{ rules.maintenanceShortfall(store, state.id) }} SPL. Private treasury: {{ store.players[state.king].money }} SPL. Queue sales if needed; they must preserve this state's throne.</p><button :disabled="!area || !!rules.getMaintenanceSaleError(store, actor, area, state.id)" @click="queueSale(maintenanceSales)">Add selected land to maintenance sale</button><template v-for="(batch, index) in maintenanceSales" :key="index"><div v-if="batch.length">Batch {{ index + 1 }}: <button v-for="id in batch" :key="id" @click="removeSale(maintenanceSales, index, id)">{{ label(id) }} ×</button></div></template><button v-if="maintenanceSales.at(-1).length" @click="maintenanceSales.push([])">Start another sale batch</button><p v-if="maintenanceError" class="error">{{ maintenanceError }}</p><button :disabled="!!maintenanceError" @click="submit(maintenanceAction)">Resolve maintenance: hire crew or declare revolution</button></div>
					<button :disabled="!rules.hasMaintenanceCrew(store, state.id)" @click="submit({ type: 'endDevelopment' })">End {{ rf.STATE_NAMES[state.id] }} development</button>
				</template>
			</template>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'routing' && frame" :disabled="!personal.canPlay()">
			<legend>Route water from {{ label(frame.area) }}</legend>
			<p>{{ frame.water }} water available. Pumps automatically irrigate their own land. Excess returns to the previous waterwork.</p>
			<form class="buttonRow" @submit.prevent="submit({ type: 'allocateWater', area: waterTarget, amount: chosenWater?.kind === 'irrigate' ? 1 : waterAmount })"><label>Destination <select v-model="waterTarget" required><option :value="null">Click the map or choose</option><option v-for="choice in waterOptions" :key="choice.area" :value="choice.area">{{ label(choice.area) }} · {{ choice.kind === 'pump' ? 'Send to pump' : 'Irrigate' }}</option></select></label><label v-if="chosenWater?.kind === 'pump'">Water <input type="number" v-model.number="waterAmount" min="1" :max="frame.water" step="1" required /></label><button :disabled="!chosenWater">{{ chosenWater?.kind === 'pump' ? 'Send water' : 'Irrigate with one water' }}</button></form>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'harvest'" :disabled="!personal.canPlay()">
			<legend>{{ rf.STATE_NAMES[state.id] }} harvest: {{ rules.harvestAmount(store, state.id) }} SPL</legend>
			<p>Distribution: <template v-for="(payment, index) in rules.harvestDistribution(store, state.id).payments" :key="index">{{ store.players[index].displayName }} {{ payment }} SPL; </template>treasury retains {{ rules.harvestDistribution(store, state.id).retained }} SPL.</p>
			<button @click="submit({ type: 'harvest', choice: 'distribute' })">Distribute harvest</button>
			<template v-if="!state.hasRevolted"><label v-if="rules.harvestAmount(store, state.id) > 0 && removable.length">Remove waterwork <select v-model="removeWaterwork"><option v-for="id in removable" :key="id" :value="id">{{ label(id) }}</option></select></label><button @click="submit({ type: 'harvest', choice: 'store', remove: removeWaterwork })">Store harvest</button></template>
			<p v-else>A state that revolted must distribute.</p>
		</fieldset>
		<div v-if="canExchangeBarahshum" class="actionGroup"><b>Barahshum</b><p>Select an adjacent area, then dissolve the nation to build one canal. This does not use a normal turn.</p><button :disabled="!area || !barahshum?.neighbours.includes(area.id)" @click="submit({ type: 'exchangeBarahshum', from: barahshum.id, to: area.id })">Dissolve Barahshum and dig to {{ area ? label(area.id) : 'selected area' }}</button></div>
	</section>
</template>

<style scoped>
.gameActions { width: 100%; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; margin: 8px 0; text-align: left; font-size: 13px; }
fieldset { border: 1px solid #c4b894; border-radius: 4px; padding: 8px; margin: 0; min-width: 0; }legend { font-weight: bold; font-size: 15px; }p { margin: 6px 0; }.buttonRow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 6px 0; }button, input, select { font: inherit; }button { cursor: pointer; margin: 2px; padding: 4px 7px; }button:disabled { cursor: default; }input[type=number] { width: 70px; }label { margin: 3px; }.actionGroup { margin: 8px 0; padding: 7px 0; border-top: 1px solid #c4b894; }.saleGroup { margin: 5px 0; }.error { color: #a40000; font-weight: bold; }.hint { color: #655a42; margin: 4px 0; }.piece { width: 24px; height: 24px; object-fit: contain; vertical-align: middle; margin-right: 5px; }
</style>
