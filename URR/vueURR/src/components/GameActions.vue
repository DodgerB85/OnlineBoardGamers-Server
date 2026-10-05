<script setup>
import ArtworkCard from "./ArtworkCard.vue"
import StateLeadership from "./StateLeadership.vue"
import MarketForecast from "./MarketForecast.vue"
import { computed, nextTick, ref, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as controller from "../js/URRcontroller"
import * as model from "../js/URRmodel"
import { applyAction } from "../js/URRgame"
import { getCanalCost, canCrewDig, isNationLandClosed } from "../js/URRmap"
import { currentStateId, waterworkMeasure, getLeadershipChanges } from "../js/URRview"
import { currentWaterFrame, waterChoices } from "../js/URRwater"
import { getWaterworkImage, getEquipmentCardImage, getTerrainImage, getPlayerMarkerImage, getStateOrderImage, getNationCardImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const props = defineProps({ selectedArea: { type: String, default: null }, path: { type: Array, default: () => [] } })
const emit = defineEmits(["startDig", "clearPath", "changeRemoval", "changeLandDraft", "changeDigCapacity"])
const store = useModelStore()
const personal = usePersonalStore()
const purchase = ref(null)
const before = ref([[]])
const after = ref([[]])
const maintenanceSales = ref([[]])
const exchangeDer = ref(false)
const primogenitureAmount = ref(1)
const selectedCrew = ref(null)
const digButton = ref(null)
const nationToBuy = ref(null)
const nationPrice = ref(0)
const removeWaterwork = ref(null)
const waterTarget = ref(null)
const waterAmount = ref(1)
const actor = computed(() => store.gameflow.turnOrder[0])
const primogenitureBudget = computed(() => actor.value === undefined ? 0 : rules.availableMoney(store, actor.value) + (store.gameflow.primogenitureBid?.player === actor.value ? store.gameflow.primogenitureBid.amount : 0))
const primogenitureError = computed(() => preview({ type: "bidPrimogeniture", amount: primogenitureAmount.value }))
const area = computed(() => store.board.areas.find((entry) => entry.id === props.selectedArea))
const state = computed(() => store.states[currentStateId(store)])
const chosenCrew = computed(() => state.value?.diggers.find((crew) => crew.id === selectedCrew.value))
const digCapacity = computed(() => store.gameflow.developmentStep === "eridu" ? 2 : chosenCrew.value && !chosenCrew.value.hasDug ? chosenCrew.value.capacity : null)
watch(digCapacity, (capacity) => emit("changeDigCapacity", capacity), { immediate: true })
const pendingOffer = computed(() => store.gameflow.pendingOffer)
const offeredLand = computed(() => store.board.areas.find((entry) => entry.id === pendingOffer.value?.action.area))
const offeredLandIncome = computed(() => offeredLand.value ? rf.IRRIGATED_LANDOWNER_INCOME * (offeredLand.value.isCity ? 2 : 1) : 0)
const nationSaleRecipient = computed(() => {
	const offer = pendingOffer.value
	if (offer?.action.type !== "offerNation") return null
	return nationRecipient(store.nations[offer.action.nation], offer.action.amount)
})
const cardEra = computed(() => rules.nextCardEra(store))
const cardData = computed(() => rf.ERA_CARD_DATA[cardEra.value])
const frame = computed(() => currentWaterFrame(store))
const waterOptions = computed(() => waterChoices(store))
const chosenWater = computed(() => waterOptions.value.find((choice) => choice.area === waterTarget.value))
const sourceWaterwork = computed(() => store.board.areas.find((area) => area.id === frame.value?.area)?.waterwork)
const targetWaterwork = computed(() => store.board.areas.find((area) => area.id === chosenWater.value?.area)?.waterwork)
const irrigationLand = computed(() => {
	if (!chosenWater.value) return null
	const land = store.board.areas.find((area) => area.id === chosenWater.value.area)
	return land.owner !== null && land.irrigatedBy === null ? land : null
})
const irrigationState = computed(() => targetWaterwork.value?.state ?? sourceWaterwork.value?.state)
const irrigationYield = computed(() => irrigationLand.value ? rf.ERA_YIELD_PER_AREA[store.era] * (irrigationLand.value.isCity ? 2 : 1) : 0)
const irrigationIncome = computed(() => irrigationLand.value ? rf.IRRIGATED_LANDOWNER_INCOME * (irrigationLand.value.isCity ? 2 : 1) : 0)
const maintenanceContribution = computed(() => state.value ? rules.maintenanceShortfall(store, state.value.id) : 0)
const canFinishDevelopment = computed(() => state.value && (rules.hasMaintenanceCrew(store, state.value.id) || store.players[state.value.king].money >= maintenanceContribution.value))
const removable = computed(() => state.value ? rules.removableWaterworks(store, state.value.id) : [])
const ownedDer = computed(() => {
	const nation = store.nations[rf.NATION_DER]
	return nation && !nation.isRemoved && nation.ownerType === "player" && nation.owner === actor.value
})
const canExchangeDer = computed(() => ownedDer.value && store.board.areas.find((area) => area.id === purchase.value)?.landType === rf.LAND_FOREST)
watch(canExchangeDer, (canExchange) => { if (!canExchange) exchangeDer.value = false })
const ownedCalah = computed(() => {
	const nation = store.nations[rf.NATION_CALAH]
	return nation && !nation.isRemoved && nation.ownerType === "state" && nation.owner === state.value?.id
})
const assimilationChoices = computed(() => store.nations.filter((nation) => !nation.isRemoved && nation.ownerType !== null && nation.id !== rf.NATION_FIRST_AKKADIANS && !(nation.ownerType === "state" && nation.owner === state.value?.id)))
const selectedNation = computed(() => assimilationChoices.value.find((nation) => nation.id === nationToBuy.value))
const nationOfferError = computed(() => selectedNation.value ? preview({ type: "offerNation", nation: nationToBuy.value, amount: nationPrice.value }) : "Choose a nation")
const nationSeller = computed(() => selectedNation.value?.ownerType === "player" ? store.players[selectedNation.value.owner].displayName : selectedNation.value ? rf.STATE_NAMES[selectedNation.value.owner] : "")
const nationPurchaseRecipient = computed(() => selectedNation.value ? nationRecipient(selectedNation.value, nationPrice.value) : null)
const requiresNationConsent = computed(() => selectedNation.value && (selectedNation.value.ownerType === "player" ? selectedNation.value.owner : store.states[selectedNation.value.owner].king) !== state.value.king)
const barahPlayer = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	return (personal.trainingGame || rf.SUPER_USERS.includes(personal.name)) && nation?.ownerType === "player" ? nation.owner : personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? actor.value : personal.pov
})
const canExchangeBarahshum = computed(() => !personal.haltPlay && !store.viewSettings.showReplay && personal.pov >= 0 && rules.canExchangeBarahshum(store, barahPlayer.value))
const hasBarahshumOpportunity = computed(() => rules.canExchangeBarahshum(store, store.nations[rf.NATION_BARAHSHUM].owner))
const barahshum = computed(() => store.board.areas.find((entry) => entry.nation === rf.NATION_BARAHSHUM))
const barahshumOwnerName = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	return nation.ownerType === "player" ? store.players[nation.owner].displayName : rf.STATE_NAMES[nation.owner]
})
const barahshumError = computed(() => {
	if (!area.value || !barahshum.value?.neighbours.includes(area.value.id)) return "Select an area adjacent to Barahshum."
	try { applyAction(model.snapshotState(), barahPlayer.value, { type: "exchangeBarahshum", from: barahshum.value.id, to: area.value.id }); return "" } catch (error) { return error.message }
})
const tradeAction = computed(() => ({ type: "tradeLand", sellBefore: before.value.filter((batch) => batch.length), sellAfter: after.value.filter((batch) => batch.length), ...(purchase.value === null ? {} : { buy: purchase.value, exchangeDer: exchangeDer.value }) }))
const landDraft = computed(() => ({ buy: purchase.value, sales: [...before.value, ...after.value, ...maintenanceSales.value].flat() }))
const isSaleQueued = computed(() => area.value && landDraft.value.sales.includes(area.value.id))
watch(landDraft, (draft) => emit("changeLandDraft", draft), { deep: true, immediate: true })
const hasTrade = computed(() => purchase.value !== null || before.value.some((batch) => batch.length) || after.value.some((batch) => batch.length))
const tradePreview = computed(() => {
	if (!hasTrade.value) return null
	try { return { game: applyAction(model.snapshotState(), actor.value, tradeAction.value), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const tradeError = computed(() => tradePreview.value?.error || "")
const tradeAssetsAfter = computed(() => tradePreview.value?.game ? rules.playerAssets(tradePreview.value.game, actor.value) : null)
const tradeAssetsChange = computed(() => tradeAssetsAfter.value === null ? 0 : tradeAssetsAfter.value - rules.playerAssets(store, actor.value))
const harvest = computed(() => state.value ? rules.harvestDistribution(store, state.value.id) : null)
const harvestPayments = computed(() => harvest.value?.payments.map((amount, index) => ({ amount, index })).filter((payment) => payment.amount > 0) || [])
const selectedPrice = computed(() => area.value && !area.value.isRiver ? rules.landPrice(store, area.value, area.value.markerOwner === null) : null)
const maintenanceAction = computed(() => ({ type: "resolveMaintenance", sales: maintenanceSales.value.filter((batch) => batch.length) }))
const maintenancePreview = computed(() => {
	if (!state.value || rules.hasMaintenanceCrew(store, state.value.id)) return null
	try { return { game: applyAction(model.snapshotState(), actor.value, maintenanceAction.value), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const maintenanceNeedsMoreLand = computed(() => maintenancePreview.value?.error === "Sell the remaining eligible land before declaring a revolution")
const maintenanceError = computed(() => maintenanceNeedsMoreLand.value ? "Add more eligible land to cover the required crew while preserving the throne." : maintenancePreview.value?.error || "")
const tradeLeadershipChanges = computed(() => getLeadershipChanges(store, tradePreview.value?.game))
const maintenanceLeadershipChanges = computed(() => getLeadershipChanges(store, maintenancePreview.value?.game))
const willRevolt = computed(() => maintenancePreview.value?.game?.states[state.value.id].hasRevolted || false)
const digPreview = computed(() => {
	if (props.path.length < 2) return { cost: null, error: "Select at least two areas for a canal path." }
	try {
		const cost = getCanalCost(store, props.path)
		const crew = chosenCrew.value
		if (store.gameflow.developmentStep !== "eridu" && (!crew || crew.hasDug)) return { cost, error: "Choose an unused digging crew." }
		const capacity = store.gameflow.developmentStep === "eridu" ? 2 : crew.capacity
		return { cost, error: canCrewDig(capacity, cost) ? "" : `This path needs ${cost.canals} canal points and ${cost.junctions} junction points. The ${capacity} crew cannot dig it.` }
	} catch (error) { return { cost: null, error: error.message } }
})
const fittingCrews = computed(() => {
	const preview = digPreview.value
	if (!preview.cost || !preview.error || store.gameflow.developmentStep === "eridu" || !state.value) return []
	const crews = state.value.diggers.filter((crew) => !crew.hasDug && canCrewDig(crew.capacity, preview.cost))
	return [...new Map(crews.map((crew) => [crew.capacity, crew])).values()]
})
const digError = computed(() => digPreview.value.error)
const crewPurchasePreview = computed(() => actionPreview({ type: "buyCard", kind: "digger" }))
const crewPurchaseError = computed(() => crewPurchasePreview.value.error)
const crewPurchaseContribution = computed(() => crewPurchasePreview.value.game ? store.players[state.value.king].money - crewPurchasePreview.value.game.players[state.value.king].money : 0)
const waterworkPreview = computed(() => area.value ? actionPreview({ type: "requestWaterwork", kind: area.value.isRiver ? "reservoir" : "pump", area: area.value.id }) : { game: null, error: "Select a site on the board" })
const waterworkError = computed(() => waterworkPreview.value.error)
const calahPreview = computed(() => area.value ? actionPreview({ type: "exchangeCalah", kind: area.value.isRiver ? "reservoir" : "pump", area: area.value.id }) : { game: null, error: "Select a site on the board" })
const calahError = computed(() => calahPreview.value.error)
const maintenanceAfterConstruction = computed(() => {
	const notices = []
	const choices = [["After paid construction", waterworkPreview.value]]
	if (ownedCalah.value) choices.push(["After the Calah exchange", calahPreview.value])
	for (const [label, result] of choices) {
		let game = result.game
		if (!game) continue
		if (game.gameflow.pendingOffer) game = applyAction(game, game.gameflow.turnOrder[0], { type: "respondOffer", accept: true })
		if (rules.hasMaintenanceCrew(game, state.value.id)) continue
		const [capacity, price] = rf.ERA_CARD_DATA[rules.nextCardEra(game)].digger
		const contribution = rules.maintenanceShortfall(game, state.value.id)
		const cash = game.players[state.value.king].money
		const notice = { label, capacity, price, contribution, shortfall: Math.max(0, contribution - cash) }
		const matchingNotice = notices.find((existing) => existing.capacity === notice.capacity && existing.price === notice.price && existing.contribution === notice.contribution && existing.shortfall === notice.shortfall)
		if (matchingNotice) matchingNotice.label = "After either construction choice"
		else notices.push(notice)
	}
	return notices
})

function label(id) { return store.board.areas.find((entry) => entry.id === id)?.label || id }
function nationRecipient(nation, amount) {
	const isPrivateSale = nation.ownerType === "player"
	const owner = isPrivateSale ? store.players[nation.owner] : store.states[nation.owner]
	return { src: isPrivateSale ? getPlayerMarkerImage(nation.owner) : getStateOrderImage(nation.owner), label: isPrivateSale ? `${owner.displayName}'s private cash` : `${rf.STATE_NAMES[nation.owner]} treasury`, before: owner.money, after: owner.money + amount }
}
function landImage(id) { const area = store.board.areas.find((entry) => entry.id === id); return getTerrainImage(area.landType, area.isCity) }
function actionPreview(action) {
	if (actor.value === undefined) return { game: null, error: "" }
	try { return { game: applyAction(model.snapshotState(), actor.value, action), error: "" } } catch (error) { return { game: null, error: error.message } }
}
function preview(action) { return actionPreview(action).error }
function useFittingCrew(crew) { selectedCrew.value = crew.id; nextTick(() => digButton.value?.focus()) }
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
		if (action.type !== "exchangeBarahshum") {
			resetTrade()
			maintenanceSales.value = [[]]
		}
		if (["dig", "digEridu"].includes(action.type)) emit("clearPath")
	}
}
function buildWaterwork(isCalah = false) {
	if (!area.value) return
	submit({ type: isCalah ? "exchangeCalah" : "requestWaterwork", kind: area.value.isRiver ? "reservoir" : "pump", area: area.value.id })
}
watch([() => store.gameflow.phase, () => actor.value, () => store.gameflow.stateIndex], () => {
	resetTrade()
	maintenanceSales.value = [[]]
	selectedCrew.value = state.value?.diggers.find((crew) => !crew.hasDug)?.id ?? null
	primogenitureAmount.value = (store.gameflow.primogenitureBid?.amount || 0) + 1
}, { immediate: true })
watch(() => store.gameflow.primogenitureBid?.amount, (amount) => { if (primogenitureAmount.value <= (amount || 0)) primogenitureAmount.value = (amount || 0) + 1 })
watch(() => props.selectedArea, (id) => {
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "routing") waterTarget.value = waterOptions.value.some((choice) => choice.area === id) ? id : null
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" && removable.value.includes(id)) removeWaterwork.value = id
})
watch(() => frame.value?.area, () => { waterTarget.value = null; waterAmount.value = 1 })
watch(() => frame.value?.water, (water) => { if (water > 0 && waterAmount.value > water) waterAmount.value = water })
watch(waterOptions, (choices) => { if (!choices.some((choice) => choice.area === waterTarget.value)) waterTarget.value = null })
watch(() => state.value?.diggers.filter((crew) => !crew.hasDug).map((crew) => crew.id).join(","), () => {
	if (!state.value?.diggers.some((crew) => crew.id === selectedCrew.value && !crew.hasDug)) selectedCrew.value = state.value?.diggers.find((crew) => !crew.hasDug)?.id ?? null
})
watch(nationToBuy, (id) => { nationPrice.value = id === null ? 0 : rf.NATION_PRICES[id] })
watch(assimilationChoices, (choices) => { if (!choices.some((nation) => nation.id === nationToBuy.value)) nationToBuy.value = null })
watch(removable, (ids) => { if (!ids.includes(removeWaterwork.value)) removeWaterwork.value = ids[0] ?? null }, { immediate: true })
watch(removeWaterwork, (id) => emit("changeRemoval", id), { immediate: true })
</script>

<template>
	<section class="gameActions" aria-label="Game actions">
		<div v-if="store.gameMessages.errorText" class="error" role="alert">{{ store.gameMessages.errorText }}</div>
		<div v-if="store.gameMessages.actionError" class="error" role="alert">{{ store.gameMessages.actionError }}</div>
		<div v-if="store.gameflow.endReason && store.gameflow.phase !== rf.PHASE_GAME_OVER" class="endNotice" role="status"><b>Final round.</b> {{ store.gameflow.endReason === 'invasion' ? 'No water reached the south. The game ends after these harvests.' : 'A revolution ends the game after this rainy season.' }}</div>
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<b>{{ store.gameflow.endReason === 'revolution' ? 'The game ends after a revolution.' : 'The Southern Peoples invade.' }}</b>
			<ol class="finalStandings"><li v-for="index in store.gameflow.finalPositions" :key="index"><img :src="getPlayerMarkerImage(index)" alt="" /><span>{{ store.players[index].displayName }}</span><b>{{ store.players[index].score }} SPL</b></li></ol><p>Final assets include private cash and land at its market value. Select a player above to inspect their holdings.</p>
		</template>
		<template v-else-if="store.gameflow.pendingOffer">
			<div class="offerHeading"><img :src="getStateOrderImage(pendingOffer.state)" alt="" /><b v-if="pendingOffer.action.type === 'offerNation'">{{ rf.STATE_NAMES[pendingOffer.state] }} offers {{ pendingOffer.action.amount }} SPL for {{ rf.NATION_NAMES[pendingOffer.action.nation] }}</b><b v-else>{{ rf.STATE_NAMES[pendingOffer.state] }} asks to build a {{ pendingOffer.action.kind }} at {{ label(pendingOffer.action.area) }}</b></div>
			<template v-if="pendingOffer.action.type === 'offerNation'"><ArtworkCard class="consentNationCard" :src="getNationCardImage(pendingOffer.action.nation)" :alt="rf.NATION_NAMES[pendingOffer.action.nation]" /><p>Sell {{ rf.NATION_NAMES[pendingOffer.action.nation] }} for <b>{{ pendingOffer.action.amount }} SPL</b>?</p><div class="paymentRow nationSaleRecipient"><img :src="nationSaleRecipient.src" alt="" /><span>{{ nationSaleRecipient.label }}</span><b>{{ nationSaleRecipient.before }} → {{ nationSaleRecipient.after }} SPL</b></div></template>
			<template v-else><div class="offeredWork"><img :src="getWaterworkImage(pendingOffer.state, cardData[pendingOffer.action.kind][0])" :alt="`Proposed ${pendingOffer.action.kind} · ${waterworkMeasure({ kind: pendingOffer.action.kind, capacity: cardData[pendingOffer.action.kind][0] })}`" /><img v-if="offeredLand && !offeredLand.isRiver" :src="getTerrainImage(offeredLand.landType, offeredLand.isCity)" :alt="`${rf.LAND_NAMES[offeredLand.landType]}${offeredLand.isCity ? ' city' : ' land'}`" /><span><b>{{ label(pendingOffer.action.area) }}</b><small v-if="offeredLand && !offeredLand.isRiver" class="workMeasure">{{ rf.LAND_NAMES[offeredLand.landType] }} {{ offeredLand.isCity ? 'city' : 'land' }}</small><small class="workMeasure">{{ pendingOffer.action.kind }} · {{ waterworkMeasure({ kind: pendingOffer.action.kind, capacity: cardData[pendingOffer.action.kind][0] }) }}</small></span></div><p>The state treasury pays {{ pendingOffer.action.type === 'exchangeCalah' ? 0 : cardData[pendingOffer.action.kind][1] }} SPL. The site is highlighted on the board.</p><div v-if="offeredLand && offeredLand.owner !== null" class="paymentRow consentIncome"><img :src="getPlayerMarkerImage(offeredLand.owner)" alt="" /><span>Private income if this land is irrigated in the rainy season</span><b>+{{ offeredLandIncome }} SPL</b></div></template>
			<div class="buttonRow consentControls"><button class="primaryAction" :disabled="!personal.canPlay()" @click="submit({ type: 'respondOffer', accept: true })">Accept</button><button :disabled="!personal.canPlay()" @click="submit({ type: 'respondOffer', accept: false })">Decline</button></div>
		</template>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_SETTLEMENT && (!canExchangeBarahshum || personal.canPlay())" :disabled="!personal.canPlay()">
			<legend>Settlement · {{ store.players[actor]?.displayName }}</legend>
			<p>Select land on the map. Queue one purchase and any sales, then complete the trade.</p>
			<div class="selectedLand" v-if="area && !area.isRiver"><img :src="getTerrainImage(area.landType, area.isCity)" :alt="`${rf.LAND_NAMES[area.landType]}${area.isCity ? ' city' : ''}`" /><span><b>{{ label(area.id) }} · {{ rf.STATE_NAMES[area.state] }}</b><small>{{ area.owner === null ? (area.markerOwner === null ? 'Colonize' : 'Buy') : 'Sale value' }} · {{ selectedPrice }} SPL<template v-if="area.isCity"> · City</template></small><small v-if="area.owner !== null" class="selectedOwner"><img :src="getPlayerMarkerImage(area.owner)" alt="" />{{ area.owner === actor ? 'Your land' : `Owned by ${store.players[area.owner].displayName}` }}</small><small v-else-if="area.markerOwner !== null" class="selectedOwner" :title="`Returns to ${store.players[area.markerOwner].displayName} when this land is bought`"><img :src="getPlayerMarkerImage(area.markerOwner)" alt="" />{{ store.players[area.markerOwner].displayName }}'s marker</small></span></div>
			<p v-if="area && isNationLandClosed(store, area)" class="hint">Independent nation land is closed to purchases.</p>
			<div class="buttonRow" v-if="area && !area.isRiver"><button v-if="area.owner === null" :disabled="isNationLandClosed(store, area) || purchase === area.id" @click="purchase = area.id">Queue purchase {{ area ? label(area.id) : '' }}</button><button v-if="area.owner === actor" :disabled="isSaleQueued" @click="queueSale(before)">Sell selected before buying</button><button v-if="area.owner === actor || area.id === purchase" :disabled="isSaleQueued" @click="queueSale(after)">Sell selected after buying</button></div>
			<div v-if="purchase !== null" class="queuedPurchase"><img class="piece" :src="landImage(purchase)" alt="" />Buy {{ label(purchase) }} <button @click="purchase = null; exchangeDer = false">Remove purchase</button><label v-if="canExchangeDer"><input type="checkbox" v-model="exchangeDer" /> Exchange Der for a free forest</label><p v-if="exchangeDer" class="hint">Der dissolves. Its {{ rf.NATION_INCOMES[rf.NATION_DER] }} SPL income each round ends.</p></div>
			<div v-for="(batches, timing) in { Before: before, After: after }" :key="timing" class="saleGroup">
				<template v-for="(batch, index) in batches" :key="index"><div v-if="batch.length">Sell {{ timing.toLowerCase() }} buying · batch {{ index + 1 }}<div class="buttonRow"><button class="landChip" v-for="id in batch" :key="id" :aria-label="`Remove ${label(id)} from sale`" @click="removeSale(batches, index, id)"><img class="piece" :src="landImage(id)" alt="" />{{ label(id) }} ×</button></div></div></template>
				<button v-if="batches.at(-1).length" @click="batches.push([])">Start another {{ timing.toLowerCase() }}-buying sale batch</button>
			</div>
			<p v-if="tradeError" class="error">{{ tradeError }}</p>
			<div v-if="tradePreview?.game" class="tradeBalance">Cash after trade <b>{{ tradePreview.game.players[actor].money }} SPL</b><small>{{ tradePreview.game.players[actor].money - store.players[actor].money >= 0 ? '+' : '' }}{{ tradePreview.game.players[actor].money - store.players[actor].money }} SPL</small><small title="Private cash and owned land at the resulting market prices">Assets after: {{ tradeAssetsAfter }} SPL ({{ tradeAssetsChange >= 0 ? '+' : '' }}{{ tradeAssetsChange }})</small></div>
			<MarketForecast v-if="tradePreview?.game" :before="store" :after="tradePreview.game" />
			<StateLeadership v-for="change in tradeLeadershipChanges" :key="change.id" :change="change" />
			<div class="buttonRow" :class="{ tradeControls: hasTrade }"><button v-if="hasTrade" class="primaryAction" :disabled="!!tradeError" @click="submit(tradeAction)">Complete trade<small v-if="tradePreview?.game">{{ tradePreview.game.players[actor].money }} SPL cash after</small></button><button v-if="hasTrade" @click="resetTrade">Clear trade</button><button v-else @click="submit({ type: 'pass' })">Pass</button></div>
			<form v-if="!hasTrade" class="buttonRow primogenitureBid" @submit.prevent="submit({ type: 'bidPrimogeniture', amount: primogenitureAmount })"><label for="primogeniture">Primogeniture bid:</label><input id="primogeniture" type="number" inputmode="numeric" v-model.number="primogenitureAmount" :min="(store.gameflow.primogenitureBid?.amount || 0) + 1" :max="primogenitureBudget" step="1" required /><button :disabled="!!primogenitureError">Bid</button><small>{{ primogenitureBudget }} SPL available · Refunded after settlement</small><span v-if="store.gameflow.primogenitureBid">{{ store.players[store.gameflow.primogenitureBid.player].displayName }} holds the high bid: {{ store.gameflow.primogenitureBid.amount }} SPL</span><span v-if="primogenitureError" class="error">{{ primogenitureError }}</span></form>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_DEVELOPMENT && (!canExchangeBarahshum || personal.canPlay())" class="developmentActions" :disabled="!personal.canPlay()">
			<legend>{{ store.gameflow.developmentStep === 'betweenStates' ? (state ? `Before ${rf.STATE_NAMES[state.id]} development` : 'Before rainy season') : store.gameflow.developmentStep === 'eridu' ? 'Eridu digs before the states' : state ? `${rf.STATE_NAMES[state.id]} development` : 'Finish development' }}</legend>
			<template v-if="store.gameflow.developmentStep === 'betweenStates'">
				<p v-if="hasBarahshumOpportunity">{{ barahshumOwnerName }} may dissolve Barahshum to dig a canal before {{ state ? `${rf.STATE_NAMES[state.id]} begins` : 'the rainy season' }}.</p><p v-else>No Barahshum exchange is available.</p>
				<button @click="submit({ type: 'beginDevelopment' })">{{ state ? `Start ${rf.STATE_NAMES[state.id]} development` : 'Start rainy season' }}</button>
			</template>
			<template v-else>
				<div v-if="store.gameflow.developmentStep === 'eridu' || (store.gameflow.developmentStep === 'digging' && state.diggers.some((crew) => !crew.hasDug))" class="actionGroup">
					<b v-if="store.gameflow.developmentStep === 'eridu'">Eridu's free crew · 2 digging points</b>
					<label v-if="store.gameflow.developmentStep !== 'eridu'">Digging crew <select v-model="selectedCrew"><option :value="null">Choose crew</option><option v-for="crew in state.diggers" :key="crew.id" :value="crew.id" :disabled="crew.hasDug">{{ crew.capacity }} · crew {{ crew.id + 1 }}{{ crew.hasDug ? ' (used)' : '' }}</option></select><template v-if="chosenCrew"><img v-for="(capacity, index) in String(chosenCrew.capacity).split('+')" :key="index" class="piece" :src="getWaterworkImage(state.id, capacity)" :alt="`${capacity}-point digging crew`" /></template></label>
					<button :disabled="digCapacity === null" @click="emit('startDig', path.length > 0)">{{ path.length ? 'Edit canal path on map' : 'Select canal path on map' }}</button><span>{{ path.map(label).join(' → ') }}</span>
					<div class="hint" role="status"><template v-if="digError">{{ digError }}</template><template v-else>Path fits: {{ digPreview.cost.canals }} canal point{{ digPreview.cost.canals === 1 ? '' : 's' }} · {{ digPreview.cost.junctions }} junction point{{ digPreview.cost.junctions === 1 ? '' : 's' }}.</template></div>
					<div v-if="fittingCrews.length" class="buttonRow fittingCrews"><span>This path fits:</span><button v-for="crew in fittingCrews" :key="crew.id" :aria-label="`Use ${crew.capacity} digging crew ${crew.id + 1}`" @click="useFittingCrew(crew)"><img v-for="(capacity, index) in String(crew.capacity).split('+')" :key="index" class="piece" :src="getWaterworkImage(state.id, capacity)" alt="" />Use {{ crew.capacity }} crew</button></div>
					<button ref="digButton" class="digAction" :class="{ primaryAction: !digError }" :disabled="!!digError" @click="submit(store.gameflow.developmentStep === 'eridu' ? { type: 'digEridu', path } : { type: 'dig', crew: selectedCrew, path })">Dig canal<small v-if="path.length">{{ path.map(label).join(' → ') }}</small></button>
					<button v-if="store.gameflow.developmentStep === 'eridu'" @click="submit({ type: 'pass' })">Skip Eridu</button>
				</div>
				<template v-if="store.gameflow.developmentStep !== 'eridu'">
					<div v-if="!rules.hasMaintenanceCrew(store, state.id)" class="actionGroup"><b>A maintenance crew is required.</b><p v-if="maintenanceContribution > 0">Private contribution: {{ maintenanceContribution }} SPL. Available: {{ store.players[state.king].money }} SPL. <template v-if="!canFinishDevelopment">Sell land while preserving the throne.</template><template v-else>Ending development hires the required crew.</template></p><p v-else>Ending development hires the required crew for {{ cardData.digger[1] }} SPL from the state treasury.</p><button v-if="!canFinishDevelopment && !willRevolt" :disabled="!area || isSaleQueued || !!rules.getMaintenanceSaleError(store, actor, area, state.id)" @click="queueSale(maintenanceSales)">Add selected land to maintenance sale</button><template v-for="(batch, index) in maintenanceSales" :key="index"><div v-if="batch.length">Batch {{ index + 1 }}: <button v-for="id in batch" :key="id" :aria-label="`Remove ${label(id)} from maintenance sale`" @click="removeSale(maintenanceSales, index, id)"><img class="piece" :src="landImage(id)" alt="" />{{ label(id) }} ×</button></div></template><button v-if="maintenanceSales.at(-1).length" @click="maintenanceSales.push([])">Start another sale batch</button><p v-if="maintenanceError && maintenanceSales.some((batch) => batch.length)" :class="maintenanceNeedsMoreLand ? 'hint' : 'error'">{{ maintenanceError }}</p><div v-if="maintenanceSales.some((batch) => batch.length) && maintenancePreview?.game && !willRevolt" class="tradeBalance">After sale and crew<b>{{ maintenancePreview.game.players[actor].money }} SPL private</b><small>{{ maintenancePreview.game.states[state.id].money }} SPL in the state treasury</small></div><MarketForecast v-if="maintenancePreview?.game && !willRevolt" :before="store" :after="maintenancePreview.game" /><StateLeadership v-for="change in maintenanceLeadershipChanges" :key="change.id" :change="change" /><p v-if="willRevolt" class="eraChange">The crew cannot be paid for without losing the throne. Revolution forfeits your private cash and ends the game after this rainy season.</p></div>
					<form v-if="store.era === 3 && assimilationChoices.length" class="actionGroup nationOffer" @submit.prevent="submit({ type: 'offerNation', nation: nationToBuy, amount: nationPrice })">
						<label>Assimilate <select v-model="nationToBuy" required><option :value="null">Choose nation</option><option v-for="nation in assimilationChoices" :key="nation.id" :value="nation.id">{{ rf.NATION_NAMES[nation.id] }}</option></select></label>
						<div v-if="selectedNation" class="nationOfferPreview"><ArtworkCard :src="getNationCardImage(selectedNation.id)" :alt="rf.NATION_NAMES[selectedNation.id]" /><div><b>Seller: {{ nationSeller }}</b><p>Allowed offer: {{ rf.NATION_PRICES[selectedNation.id] / 2 }}–{{ rf.NATION_PRICES[selectedNation.id] * 2 }} SPL.</p><label>Offer SPL <input type="number" inputmode="numeric" v-model.number="nationPrice" :min="rf.NATION_PRICES[selectedNation.id] / 2" :max="rf.NATION_PRICES[selectedNation.id] * 2" step="1" required /></label><p v-if="!nationOfferError">{{ rf.STATE_NAMES[state.id] }} treasury after purchase: {{ state.money - nationPrice }} SPL.</p><p v-else class="error">{{ nationOfferError }}</p></div><div v-if="!nationOfferError" class="paymentRow nationPurchaseRecipient"><img :src="nationPurchaseRecipient.src" alt="" /><span>{{ nationPurchaseRecipient.label }}</span><b>{{ nationPurchaseRecipient.before }} → {{ nationPurchaseRecipient.after }} SPL</b></div><button class="nationPurchaseButton" :disabled="!!nationOfferError">{{ requiresNationConsent ? 'Request agreement' : `Buy ${rf.NATION_NAMES[selectedNation.id]}` }}</button></div>
					</form>
					<div class="actionGroup equipmentShop"><ArtworkCard class="equipmentCard" :src="getEquipmentCardImage(cardEra)" :alt="`Era ${cardEra === 5 ? 'M' : cardEra} equipment: capacities and prices`" /><b>Buy era {{ cardEra === 5 ? 'M' : cardEra }} equipment</b><span class="cardSupply">{{ cardEra === 5 ? 'Unlimited supply' : `${store.cardSupply[cardEra]} cards remaining` }}</span><p v-if="cardEra > store.era" class="eraChange">This purchase starts era {{ cardEra === 5 ? 'M' : cardEra }}.<template v-if="cardEra >= 3"> Era {{ cardEra - 2 }} crews retire.</template><template v-if="cardEra === 3"> Nations may be assimilated.</template><template v-if="cardEra === 4"> Independent nations dissolve.</template></p><p>Purchasing ends this state's digging. Treasury: {{ state.money }} SPL.</p>
						<div v-if="crewPurchaseContribution > 0" class="paymentRow crewContribution"><img :src="getPlayerMarkerImage(state.king)" alt="" /><span>Private contribution for the crew<small>Cash {{ store.players[state.king].money }} → {{ crewPurchasePreview.game.players[state.king].money }} SPL</small></span><b>{{ crewPurchaseContribution }} SPL</b></div>
						<div v-for="notice in maintenanceAfterConstruction" :key="notice.label" class="eraChange constructionMaintenance"><b>{{ notice.label }}: crew required</b><p><img v-for="(capacity, index) in String(notice.capacity).split('+')" :key="index" class="piece" :src="getWaterworkImage(state.id, capacity)" alt="" />{{ notice.capacity }} crew · {{ notice.price }} SPL</p><p v-if="notice.contribution > 0">Private contribution: {{ notice.contribution }} SPL.<b v-if="notice.shortfall > 0" class="error"> Short by {{ notice.shortfall }} SPL.</b></p><p v-else>Paid from the state treasury.</p></div>
						<div class="buttonRow"><button :disabled="!!crewPurchaseError" :title="crewPurchaseError" @click="submit({ type: 'buyCard', kind: 'digger' })"><img v-for="(capacity, index) in String(cardData.digger[0]).split('+')" :key="index" class="piece" :src="getWaterworkImage(state.id, capacity)" alt="" />Hire {{ cardData.digger[0] }} crew · {{ cardData.digger[1] }} SPL</button><button :disabled="!!waterworkError" :title="waterworkError" @click="buildWaterwork()"><img v-if="area" class="piece" :src="getWaterworkImage(state.id, area.isRiver ? cardData.reservoir[0] : cardData.pump[0])" alt="" />Build {{ area?.isRiver ? 'reservoir' : 'pump' }} {{ area ? `on ${label(area.id)}` : '(select area)' }} · {{ area?.isRiver ? cardData.reservoir[1] : cardData.pump[1] }} SPL</button><button v-if="ownedCalah" :disabled="!!calahError" :title="calahError" @click="buildWaterwork(true)">Exchange Calah for free waterwork<small v-if="cardEra < 4" class="exchangeIncome">Gives up {{ rf.NATION_INCOMES[rf.NATION_CALAH] }} SPL / round</small></button></div><p v-if="crewPurchaseError" class="hint">Crew: {{ crewPurchaseError }}</p><p v-if="area && waterworkError" class="hint">Site: {{ waterworkError }}</p>
					</div>

					<div class="buttonRow developmentControls" :class="{ maintenanceControls: !rules.hasMaintenanceCrew(store, state.id) }"><small v-if="!canFinishDevelopment && !willRevolt && maintenancePreview?.game">After crew: {{ maintenancePreview.game.players[actor].money }} SPL private · {{ maintenancePreview.game.states[state.id].money }} SPL treasury</small><button v-if="!canFinishDevelopment" class="primaryAction" :disabled="!!maintenanceError" @click="submit(maintenanceAction)">{{ willRevolt ? 'Declare revolution' : 'Sell land and hire required crew' }}</button><button v-else :class="{ primaryAction: path.length < 2 }" @click="submit({ type: 'endDevelopment' })"><template v-if="rules.hasMaintenanceCrew(store, state.id)">End {{ rf.STATE_NAMES[state.id] }} development</template><template v-else>Hire required crew · {{ cardData.digger[1] }} SPL and end development</template></button></div>
				</template>
			</template>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'routing' && frame" :disabled="!personal.canPlay()">
			<legend>Route water from {{ label(frame.area) }}</legend>
			<form @submit.prevent="submit({ type: 'allocateWater', area: waterTarget, amount: chosenWater?.kind === 'irrigate' ? 1 : waterAmount })">
				<div class="waterSupply"><img class="routingWork" :src="getWaterworkImage(sourceWaterwork.state, sourceWaterwork.capacity)" :alt="`${sourceWaterwork.kind} · ${waterworkMeasure(sourceWaterwork)}`" :title="`${sourceWaterwork.kind} · ${waterworkMeasure(sourceWaterwork)}`" /><span class="waterDrop" aria-hidden="true"></span><span class="waterCount"><b>{{ frame.water }}</b> water available<small>{{ sourceWaterwork.kind }} · {{ waterworkMeasure(sourceWaterwork) }}</small></span></div><p> Pumps automatically irrigate their own land. Excess returns to the previous waterwork.</p>
				<div class="buttonRow">
					<label>Destination <select v-model="waterTarget" required><option :value="null">Click the map or choose</option><option v-for="choice in waterOptions" :key="choice.area" :value="choice.area">{{ label(choice.area) }} · {{ choice.kind === 'pump' ? 'Send to pump' : 'Irrigate' }}</option></select></label>
					<div v-if="targetWaterwork" class="offeredWork"><img :src="getWaterworkImage(targetWaterwork.state, targetWaterwork.capacity)" alt="Destination pump" /><span>{{ rf.STATE_NAMES[targetWaterwork.state] }} pump · {{ waterworkMeasure(targetWaterwork) }}</span></div>
				</div>
				<div v-if="irrigationLand" class="offeredWork irrigationPreview"><img :src="getTerrainImage(irrigationLand.landType, irrigationLand.isCity)" :alt="`${rf.LAND_NAMES[irrigationLand.landType]}${irrigationLand.isCity ? ' city' : ''}`" /><img :src="getPlayerMarkerImage(irrigationLand.owner)" :alt="store.players[irrigationLand.owner].displayName" /><span>{{ irrigationLand.isCity ? 'City' : 'Land' }} owned by {{ store.players[irrigationLand.owner].displayName }}<small>Private income: +{{ irrigationIncome }} SPL</small><small>{{ rf.STATE_NAMES[irrigationState] }} harvest: {{ rules.harvestAmount(store, irrigationState) }} → {{ rules.harvestAmount(store, irrigationState) + irrigationYield }} SPL</small></span></div>
				<div class="buttonRow routingControls"><label v-if="chosenWater?.kind === 'pump'">Water (max {{ frame.water }}) <input type="number" inputmode="numeric" v-model.number="waterAmount" min="1" :max="frame.water" step="1" required /></label><button class="primaryAction" :disabled="!chosenWater">{{ !chosenWater ? 'Choose destination' : chosenWater.kind === 'pump' ? 'Send water' : 'Irrigate with one water' }}<small v-if="chosenWater"> · <template v-if="chosenWater.kind === 'pump'">{{ waterAmount }} → </template>{{ label(chosenWater.area) }}<template v-if="chosenWater.kind === 'irrigate'"> · +{{ irrigationYield }} SPL harvest</template></small></button></div>
			</form>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'harvest'" :disabled="!personal.canPlay()">
			<legend>{{ rf.STATE_NAMES[state.id] }} harvest: {{ rules.harvestAmount(store, state.id) }} SPL</legend>
			<div class="harvestChoice">
				<b>Distribute to landowners</b>
				<div class="paymentRow" v-for="payment in harvestPayments" :key="payment.index"><img :src="getPlayerMarkerImage(payment.index)" alt="" /><span>{{ store.players[payment.index].displayName }}<small>Cash {{ store.players[payment.index].money }} → {{ store.players[payment.index].money + payment.amount }} SPL</small></span><b>+{{ payment.amount }} SPL</b></div>
				<div v-if="harvest.retained > 0" class="paymentRow"><img :src="getStateOrderImage(state.id)" alt="" /><span>State retains<small>Treasury {{ state.money }} → {{ state.money + harvest.retained }} SPL</small></span><b>{{ harvest.retained }} SPL</b></div>
			</div>
			<div v-if="!state.hasRevolted" class="harvestChoice">
				<b>Keep in the state treasury</b><div class="paymentRow"><img :src="getStateOrderImage(state.id)" alt="" /><span>{{ rf.STATE_NAMES[state.id] }}<small>Treasury {{ state.money }} → {{ state.money + rules.harvestAmount(store, state.id) }} SPL</small></span><b>+{{ rules.harvestAmount(store, state.id) }} SPL</b></div>
				<label v-if="rules.harvestAmount(store, state.id) > 0 && removable.length" class="removeWork">Remove lowest-numbered waterwork <select v-model="removeWaterwork"><option v-for="id in removable" :key="id" :value="id">{{ label(id) }} · {{ store.board.areas.find((area) => area.id === id).waterwork.kind }} {{ store.board.areas.find((area) => area.id === id).waterwork.capacity }}</option></select><img v-if="removeWaterwork" class="piece" :src="getWaterworkImage(state.id, store.board.areas.find((area) => area.id === removeWaterwork).waterwork.capacity)" alt="Waterwork to remove" /></label>
			</div>
			<div class="buttonRow harvestControls"><button class="primaryAction" @click="submit({ type: 'harvest', choice: 'distribute' })">Distribute harvest</button><button v-if="!state.hasRevolted" @click="submit({ type: 'harvest', choice: 'store', remove: removeWaterwork })">Store harvest<small v-if="removeWaterwork">Remove {{ label(removeWaterwork) }}</small></button></div>
		</fieldset>
		<div v-if="canExchangeBarahshum" class="actionGroup"><b>{{ barahshumOwnerName }} · Barahshum</b><p>Dissolve this nation to build one adjacent canal without using a normal turn. Its {{ rf.NATION_INCOMES[rf.NATION_BARAHSHUM] }} SPL income each round ends.</p><p v-if="barahshumError" class="hint">{{ barahshumError }}</p><button v-else @click="submit({ type: 'exchangeBarahshum', from: barahshum.id, to: area.id })">Dissolve Barahshum and dig to {{ label(area.id) }}</button></div>
	</section>
</template>

<style scoped>
.gameActions { width: 100%; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; margin: 8px 0; text-align: left; font-size: 13px; }
fieldset { border: 1px solid #c4b894; border-radius: 4px; padding: 8px; margin: 0; min-width: 0; }legend { max-width: 100%; overflow-wrap: anywhere; box-sizing: border-box; font-weight: bold; font-size: 15px; }p { margin: 6px 0; }.buttonRow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 6px 0; }button, input, select { font: inherit; }button { cursor: pointer; margin: 2px; padding: 4px 7px; }button:disabled { cursor: default; }input[type=number] { width: 70px; }label { margin: 3px; }.actionGroup { margin: 8px 0; padding: 7px 0; border-top: 1px solid #c4b894; }.saleGroup { margin: 5px 0; }.error { color: #a40000; font-weight: bold; }.hint { color: #655a42; margin: 4px 0; }.piece { width: 24px; height: 24px; object-fit: contain; vertical-align: middle; margin-right: 5px; }
.cardSupply { display: block; margin-top: 4px; color: #655a42; }.eraChange { padding: 6px; background: #f7edc7; border-left: 3px solid #aa9b77; }
.equipmentCard { float: right; width: 230px; max-width: 42%; height: auto; margin: 0 0 8px 14px; border: 1px solid #aa9b77; border-radius: 4px; }.equipmentShop { display: flow-root; }
.selectedLand { display: flex; align-items: center; gap: 8px; background: #eee4c9; border-radius: 4px; padding: 7px; margin: 7px 0; }.selectedLand img { width: 35px; height: 35px; }.selectedLand small { display: block; margin-top: 3px; color: #655a42; }
.selectedLand > span { min-width: 0; overflow-wrap: anywhere; }.selectedLand .selectedOwner { display: flex; align-items: center; gap: 4px; }.selectedLand .selectedOwner img { width: 20px; height: 20px; }
.queuedPurchase { padding: 6px; border-left: 3px solid #527349; background: #edf5e4; }.tradeBalance { padding: 7px; border-top: 1px solid #c4b894; display: flex; flex-wrap: wrap; gap: 5px; }.tradeBalance b { margin-left: auto; }.tradeBalance small { width: 100%; text-align: right; color: #655a42; }
.exchangeIncome { display: block; margin-top: 3px; font-size: 12px; }.queuedPurchase label { display: flex; align-items: center; gap: 7px; min-height: 40px; margin: 3px 0 0; cursor: pointer; }.queuedPurchase input[type=checkbox] { width: 18px; height: 18px; flex-shrink: 0; margin: 0; }
.harvestChoice { margin-top: 8px; padding: 8px; background: #f7f0dd; border: 1px solid #c4b894; border-radius: 4px; }.paymentRow { display: flex; align-items: center; gap: 7px; margin: 6px 0; }.paymentRow span { min-width: 0; overflow-wrap: anywhere; }.paymentRow img { width: 25px; height: 25px; }.paymentRow b { margin-left: auto; }.removeWork { display: block; font-size: 12px; }.removeWork select { margin: 5px; max-width: calc(100% - 10px); }
.waterSupply { display: flex; align-items: center; gap: 7px; margin: 8px 0; }.waterSupply b { font-size: 24px; }.waterDrop { width: 18px; height: 24px; background: #35c3e6; border: 1px solid #1685b4; border-radius: 65% 35% 55% 45%; transform: rotate(35deg); }
.routingWork { width: 38px; height: 38px; object-fit: contain; }
.waterCount { min-width: 0; flex: 1; }.waterCount small { display: block; margin-top: 3px; font-size: 12px; color: #655a42; }.waterSupply > img, .waterDrop { flex-shrink: 0; }
.harvestChoice .paymentRow small { display: block; margin-top: 2px; font-size: 12px; color: #655a42; }.harvestChoice .paymentRow b { flex-shrink: 0; white-space: nowrap; }
.harvestControls, .routingControls, .developmentControls, .tradeControls { align-items: stretch; }.harvestControls button, .routingControls button, .developmentControls button, .tradeControls button { flex: 1; min-width: 0; margin: 0; }.harvestControls small, .tradeControls small { display: block; margin-top: 3px; font-size: 12px; }
.maintenanceControls, .tradeControls, .consentControls, .harvestControls, .routingControls, .developmentControls { position: sticky; bottom: -12px; z-index: 1; background: #fff9e9; padding: 7px 0 12px; border-top: 1px solid #c4b894; }
.developmentControls > small { flex-basis: 100%; font-size: 12px; color: #655a42; }
.routingControls small { font-size: 12px; font-weight: normal; }
.digAction { max-width: 100%; box-sizing: border-box; }.digAction small { display: block; margin-top: 3px; font-size: 12px; font-weight: normal; }
.routingControls label { display: flex; flex-direction: column; gap: 2px; margin: 0; font-size: 12px; white-space: nowrap; }.routingControls input { box-sizing: border-box; }
.irrigationPreview small, .workMeasure { display: block; margin-top: 3px; font-size: 12px; color: #655a42; }
.consentIncome b, .crewContribution b { flex-shrink: 0; white-space: nowrap; }.crewContribution small { display: block; margin-top: 3px; font-size: 12px; }
.endNotice { margin-bottom: 8px; padding: 7px 8px; background: #f6e3cf; border-left: 3px solid #a75a24; color: #663716; font-size: 13px; }
.finalStandings { padding-left: 24px; }.finalStandings li { overflow-wrap: anywhere; padding: 7px 0; }.finalStandings img { width: 28px; height: 28px; vertical-align: middle; margin-right: 6px; }.finalStandings b { float: right; margin: 6px 0 0 5px; }
.offerHeading, .offeredWork { display: flex; align-items: center; gap: 8px; margin: 8px 0; }.offerHeading img, .offeredWork img { width: 38px; height: 38px; }.offerHeading { padding-bottom: 8px; border-bottom: 1px solid #c4b894; font-size: 15px; }
.nationOfferPreview { display: grid; grid-template-columns: minmax(0, 42%) minmax(0, 1fr); align-items: start; gap: 10px; margin-top: 8px; }.nationOfferPreview > :first-child { width: 100%; }.nationPurchaseRecipient, .nationPurchaseButton { grid-column: 1 / -1; }.nationPurchaseRecipient { margin: 0; }.nationOfferPreview > div { min-width: 0; overflow-wrap: anywhere; }.nationOffer select { max-width: 100%; }
</style>
