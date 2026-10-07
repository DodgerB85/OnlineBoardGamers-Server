<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import KickoutDialog from "./KickoutDialog.vue"
import ArtworkCard from "./ArtworkCard.vue"
import StateLeadership from "./StateLeadership.vue"
import MarketForecast from "./MarketForecast.vue"
import { computed, nextTick, ref, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as controller from "../js/URRcontroller"
import * as model from "../js/URRmodel"
import { applyAction, previewMaintenanceSales } from "../js/URRgame"
import * as boardRules from "../js/URRmap"
import * as view from "../js/URRview"
import * as water from "../js/URRwater"
import * as assets from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const props = defineProps({ selectedArea: { type: String, default: null }, path: { type: Array, default: () => [] } })
const emit = defineEmits(["clearPath", "changeRemoval", "changeLandDraft", "changeDigCapacity", "selectArea", "changeMapAction", "changeActionTargets", "changeTurnAction"])
const store = useModelStore()
const personal = usePersonalStore()
const tradeSteps = ref([])
const saleSelection = ref([])
const purchase = computed(() => tradeSteps.value.find((step) => step.type === "buy")?.area ?? null)
const maintenanceSales = ref([])
const maintenanceSelection = ref([])
const equipmentChoice = ref(null)
const exchangeDer = ref(false)
const primogenitureAmount = ref(1)
const selectedCrew = ref(null)
const digButton = ref(null)
const nationToBuy = ref(null)
const nationPrice = ref(0)
const removeWaterwork = ref(null)
const waterTarget = ref(null)
const waterAmount = ref(1)
const activeSection = ref(store.gameflow.developmentStep === "purchasing" ? "equipment" : "dig")
function chooseSection(section) {
	activeSection.value = activeSection.value === section ? "" : section
	let intent = ""
	if (activeSection.value === "dig") intent = "dig"
	else if (activeSection.value === "equipment" && equipmentChoice.value === "calah") intent = "calah"
	else if (activeSection.value === "equipment" && ["pump", "reservoir"].includes(equipmentChoice.value)) intent = "build"
	setIntent(intent)
}
function chooseEquipment(kind) {
	equipmentChoice.value = kind
	activeSection.value = "equipment"
	emit("selectArea", null)
	setIntent(kind === "digger" ? "" : kind === "calah" ? "calah" : "build")
}
function setIntent(intent) {
	store.viewSettings.actionIntent = intent
	store.viewSettings.inspectedState = null
	store.viewSettings.showOwnedLand = false
}
const actor = computed(() => store.gameflow.turnOrder[0])
const primogenitureBudget = computed(() => actor.value === undefined ? 0 : rules.availableMoney(store, actor.value) + (store.gameflow.primogenitureBid?.player === actor.value ? store.gameflow.primogenitureBid.amount : 0))
const primogenitureError = computed(() => preview({ type: "bidPrimogeniture", amount: primogenitureAmount.value }))
const area = computed(() => store.board.areas.find((entry) => entry.id === props.selectedArea))
const state = computed(() => store.states[view.currentStateId(store)])
const unusedCrews = computed(() => state.value?.diggers.filter((crew) => !crew.hasDug) || [])
const fittingCrews = computed(() => {
	if (!state.value || store.gameflow.developmentStep === "eridu" || props.path.length < 2) return []
	try {
		const cost = boardRules.getCanalCost(store, props.path)
		return unusedCrews.value.filter((crew) => boardRules.canCrewDig(crew.capacity, cost)).sort((a, b) => crewPoints(a.capacity) - crewPoints(b.capacity) || a.id - b.id)
	} catch { return [] }
})
function crewPoints(capacity) { return capacity === "M" ? Infinity : capacity === "1+1" ? 2 : Number(capacity) }
const chosenCrew = computed(() => selectedCrew.value === null ? fittingCrews.value[0] : unusedCrews.value.find((crew) => crew.id === selectedCrew.value))
const digCapacity = computed(() => store.gameflow.developmentStep === "eridu" ? 2 : selectedCrew.value === null ? unusedCrews.value.map((crew) => crew.capacity) : chosenCrew.value?.capacity ?? null)
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
const frame = computed(() => water.currentWaterFrame(store))
const waterOptions = computed(() => water.waterChoices(store))
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
watch(canExchangeDer, (canExchange) => { if (!canExchange && purchase.value !== null) exchangeDer.value = false })
const ownedCalah = computed(() => {
	const nation = store.nations[rf.NATION_CALAH]
	return nation && !nation.isRemoved && nation.ownerType === "state" && nation.owner === state.value?.id
})
const assimilationChoices = computed(() => store.nations.filter((nation) => !nation.isRemoved && nation.ownerType !== null && nation.id !== rf.NATION_FIRST_AKKADIANS && !(nation.ownerType === "state" && nation.owner === state.value?.id)))
const selectedNation = computed(() => assimilationChoices.value.find((nation) => nation.id === nationToBuy.value))
const nationOfferError = computed(() => selectedNation.value ? preview({ type: "offerNation", nation: nationToBuy.value, amount: nationPrice.value }) : "Choose a nation")
const nationPurchaseRecipient = computed(() => selectedNation.value ? nationRecipient(selectedNation.value, nationPrice.value) : null)
const requiresNationConsent = computed(() => selectedNation.value && (selectedNation.value.ownerType === "player" ? selectedNation.value.owner : store.states[selectedNation.value.owner].king) !== state.value.king)
const barahPlayer = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	return (personal.trainingGame || rf.SUPER_USERS.includes(personal.name)) && nation?.ownerType === "player" ? nation.owner : personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? actor.value : personal.pov
})
const canExchangeBarahshum = computed(() => !store.turnDraft.ready && !personal.haltPlay && !store.viewSettings.showReplay && personal.pov >= 0 && rules.canExchangeBarahshum(store, barahPlayer.value))
const hasBarahshumOpportunity = computed(() => rules.canExchangeBarahshum(store, store.nations[rf.NATION_BARAHSHUM].owner))
const barahshum = computed(() => store.board.areas.find((entry) => entry.nation === rf.NATION_BARAHSHUM))
const barahshumError = computed(() => {
	if (!area.value || !barahshum.value?.neighbours.includes(area.value.id)) return "Select an area adjacent to Barahshum."
	try { applyAction(model.snapshotState(), barahPlayer.value, { type: "exchangeBarahshum", from: barahshum.value.id, to: area.value.id }); return "" } catch (error) { return error.message }
})
const tradeAction = computed(() => {
	const buyIndex = tradeSteps.value.findIndex((step) => step.type === "buy")
	const sales = (steps) => steps.filter((step) => step.type === "sell").map((step) => step.areas)
	return { type: "tradeLand", sellBefore: sales(buyIndex < 0 ? tradeSteps.value : tradeSteps.value.slice(0, buyIndex)), sellAfter: buyIndex < 0 ? [] : sales(tradeSteps.value.slice(buyIndex + 1)), ...(purchase.value === null ? {} : { buy: purchase.value, exchangeDer: exchangeDer.value }) }
})
const hasTrade = computed(() => tradeSteps.value.length > 0)
const landDraft = computed(() => ({ buy: purchase.value, sales: [...tradeSteps.value.filter((step) => step.type === "sell").flatMap((step) => step.areas), ...maintenanceSales.value.flat(), ...maintenanceSelection.value], eligibleSales: maintenanceChoices.value.map((land) => land.id), fundingGap: maintenanceGap.value, blocked: purchaseLocks.value, hasTrade: hasTrade.value, error: tradeError.value, net: tradePreview.value?.game ? tradePreview.value.game.players[actor.value].money - store.players[actor.value].money : null }))
const isSaleQueued = computed(() => area.value && landDraft.value.sales.includes(area.value.id))
const tradePreview = computed(() => {
	if (!hasTrade.value) return null
	try { return { game: applyAction(model.snapshotState(), actor.value, tradeAction.value), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const tradeError = computed(() => {
	const error = tradePreview.value?.error || ""
	if (error !== "Not enough private money" || purchase.value === null) return error
	const sales = tradeAction.value.sellBefore
	const game = sales.length ? actionPreview({ type: "tradeLand", sellBefore: sales }).game : store
	if (!game) return error
	const land = game.board.areas.find((entry) => entry.id === purchase.value)
	const deficit = rules.landPrice(game, land, land.markerOwner === null) - rules.availableMoney(game, actor.value)
	return `Need ${deficit} more SPL — sell land before this purchase to afford it (move the sale above the purchase).`
})
const tradeAssetsAfter = computed(() => tradePreview.value?.game ? rules.playerAssets(tradePreview.value.game, actor.value) : null)
const tradeAssetsChange = computed(() => tradeAssetsAfter.value === null ? 0 : tradeAssetsAfter.value - rules.playerAssets(store, actor.value))
const purchaseLocks = computed(() => {
	if (store.gameflow.phase !== rf.PHASE_SETTLEMENT || actor.value === undefined) return {}
	const player = store.players[actor.value]
	const sales = tradeAction.value.sellBefore.flat().map((id) => store.board.areas.find((land) => land.id === id))
	return Object.fromEntries(store.board.areas.filter((land) => !land.isRiver && land.owner === null).map((land) => {
		const terrainSold = player.soldLandTypes.includes(land.landType) || sales.some((sold) => sold.landType === land.landType)
		const stateSold = player.soldEmergingStates.includes(land.state) || sales.some((sold) => sold.state === land.state && !store.states[sold.state].isActive)
		return [land.id, terrainSold ? `Cannot buy: sold ${rf.LAND_NAMES[land.landType]} this phase.` : stateSold ? "Cannot buy: sold land in this emerging state this phase." : ""]
	}))
})
const saleChoices = computed(() => area.value ? store.board.areas.filter((land) => !land.isRiver && land.landType === area.value.landType && (land.owner === actor.value || land.id === purchase.value) && !landDraft.value.sales.includes(land.id)) : [])
function tradeStepLabel(step, index) {
	const preceding = tradeSteps.value.slice(0, index)
	const buyIndex = preceding.findIndex((entry) => entry.type === "buy")
	const sales = (entries) => entries.filter((entry) => entry.type === "sell").map((entry) => entry.areas)
	const action = { type: "tradeLand", sellBefore: sales(buyIndex < 0 ? preceding : preceding.slice(0, buyIndex)), sellAfter: buyIndex < 0 ? [] : sales(preceding.slice(buyIndex + 1)), ...(buyIndex < 0 ? {} : { buy: preceding[buyIndex].area, exchangeDer: exchangeDer.value }) }
	const game = preceding.length ? actionPreview(action).game : store
	const price = (id, buying) => game ? rules.landPrice(game, game.board.areas.find((land) => land.id === id), buying && game.board.areas.find((land) => land.id === id).markerOwner === null) : null
	if (step.type === "buy") return `Buy ${label(step.area)} · ${exchangeDer.value ? 'free with Der' : game ? `${price(step.area, true)} SPL` : 'resolve earlier actions'}`
	return `Sell ${step.areas.map(label).join(', ')}${game ? ` · +${step.areas.reduce((total, id) => total + price(id, false), 0)} SPL` : ''}`
}
const saleValue = computed(() => saleSelection.value.reduce((total, id) => total + rules.landPrice(tradePreview.value?.game || store, store.board.areas.find((land) => land.id === id)), 0))
function buySelected() {
	const step = tradeSteps.value.find((step) => step.type === "buy")
	if (step) step.area = area.value.id
	else tradeSteps.value.push({ type: "buy", area: area.value.id })
	saleSelection.value = [area.value.id]
}
function sellSelected() {
	if (!saleSelection.value.length) return
	tradeSteps.value.push({ type: "sell", areas: [...saleSelection.value] })
	saleSelection.value = []
}
function moveTradeStep(index, direction) {
	const step = tradeSteps.value.splice(index, 1)[0]
	tradeSteps.value.splice(index + direction, 0, step)
}
const harvest = computed(() => state.value ? rules.harvestDistribution(store, state.value.id) : null)
const harvestPayments = computed(() => harvest.value?.payments.map((amount, index) => ({ amount, index })).filter((payment) => payment.amount > 0) || [])
const selectedPrice = computed(() => area.value && !area.value.isRiver ? rules.landPrice(tradePreview.value?.game || store, area.value, area.value.owner === null && area.value.markerOwner === null) : null)
const maintenanceAction = computed(() => ({ type: "resolveMaintenance", sales: maintenanceSales.value.filter((batch) => batch.length) }))
const maintenancePreview = computed(() => {
	if (!state.value || rules.hasMaintenanceCrew(store, state.value.id)) return null
	try { return { game: applyAction(model.snapshotState(), actor.value, maintenanceAction.value), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const maintenanceSalePreview = computed(() => {
	if (!state.value || rules.hasMaintenanceCrew(store, state.value.id)) return { game: null, error: "" }
	try { return { game: previewMaintenanceSales(model.snapshotState(), state.value.id, maintenanceAction.value.sales), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const maintenanceFundingGame = computed(() => maintenanceSalePreview.value.game || store)
const maintenanceGap = computed(() => state.value ? Math.max(0, rules.maintenanceShortfall(maintenanceFundingGame.value, state.value.id) - maintenanceFundingGame.value.players[state.value.king].money) : 0)
const maintenanceError = computed(() => {
	const error = maintenanceSalePreview.value.error || maintenancePreview.value?.error || ""
	if (error === "Sell the remaining eligible land before declaring a revolution") return `Select land to raise ${maintenanceGap.value} more SPL.`
	if (error === "The cash left after hiring must be less than the cheapest land sold") return "These sales raise too much. Remove land until the cash left after hiring is less than the cheapest land sold."
	return error
})
const maintenanceChoices = computed(() => !state.value || maintenanceGap.value === 0 || maintenanceSalePreview.value.error ? [] : maintenanceFundingGame.value.board.areas.filter((land) => !rules.getMaintenanceSaleError(maintenanceFundingGame.value, state.value.king, land, state.value.id)))
const maintenanceGroups = computed(() => rf.ALL_LAND_TYPES.map((type) => ({ type, lands: maintenanceChoices.value.filter((land) => land.landType === type) })).filter((group) => group.lands.length))
const maintenanceSelectionValue = computed(() => maintenanceSelection.value.reduce((total, id) => total + rules.landPrice(maintenanceFundingGame.value, maintenanceFundingGame.value.board.areas.find((land) => land.id === id)), 0))
function toggleMaintenanceLand(id) {
	const land = maintenanceChoices.value.find((entry) => entry.id === id)
	if (!land) return
	if (maintenanceSelection.value.includes(id)) maintenanceSelection.value = maintenanceSelection.value.filter((entry) => entry !== id)
	else {
		const first = maintenanceFundingGame.value.board.areas.find((entry) => entry.id === maintenanceSelection.value[0])
		if (first && first.landType !== land.landType) maintenanceSelection.value = []
		maintenanceSelection.value.push(id)
	}
}
function addMaintenanceBatch() {
	if (!maintenanceSelection.value.length) return
	maintenanceSales.value.push([...maintenanceSelection.value])
	maintenanceSelection.value = []
}
watch(maintenanceChoices, (lands) => { maintenanceSelection.value = maintenanceSelection.value.filter((id) => lands.some((land) => land.id === id)) })
const tradeLeadershipChanges = computed(() => view.getLeadershipChanges(store, tradePreview.value?.game))
const maintenanceLeadershipChanges = computed(() => view.getLeadershipChanges(store, maintenanceFundingGame.value))
const willRevolt = computed(() => maintenancePreview.value?.game?.states[state.value?.id]?.hasRevolted || false)
const developmentTurnAction = computed(() => {
	if (store.gameflow.phase !== rf.PHASE_DEVELOPMENT || !state.value || ["eridu", "betweenStates"].includes(store.gameflow.developmentStep) || pendingOffer.value || store.turnDraft.ready) return null
	const hasSales = maintenanceSales.value.length > 0
	return { hasPendingSales: hasSales || maintenanceSelection.value.length > 0, label: willRevolt.value ? "Declare revolution" : hasSales ? "Sell land and finish development" : !rules.hasMaintenanceCrew(store, state.value.id) ? "Hire required crew and finish development" : `Finish ${rf.STATE_NAMES[state.value.id]} development`, error: props.path.length ? "Add or clear the canal draft before finishing development." : !canFinishDevelopment.value || hasSales ? maintenanceError.value : "" }
})
watch(landDraft, (draft) => emit("changeLandDraft", draft), { deep: true, immediate: true })
watch(developmentTurnAction, (action) => emit("changeTurnAction", action), { immediate: true })
const digPreview = computed(() => {
	if (props.path.length < 2) return { cost: null, error: "Select at least two areas for a canal path." }
	try {
		const cost = boardRules.getCanalCost(store, props.path)
		const crew = chosenCrew.value
		if (store.gameflow.developmentStep !== "eridu" && (!crew || crew.hasDug)) return { cost, error: "No unused crew can dig this route. Shorten the path or change the crew." }
		const capacity = store.gameflow.developmentStep === "eridu" ? 2 : crew.capacity
		return { cost, error: boardRules.canCrewDig(capacity, cost) ? "" : `This path needs ${cost.canals} canal points and ${cost.junctions} junction points. The ${capacity} crew cannot dig it.` }
	} catch (error) { return { cost: null, error: error.message } }
})
const digError = computed(() => digPreview.value.error)
const equipmentAction = computed(() => {
	if (equipmentChoice.value === "digger") return { type: "buyCard", kind: "digger" }
	if (!area.value || !equipmentChoice.value) return null
	const kind = equipmentChoice.value === "calah" ? area.value.isRiver ? "reservoir" : "pump" : equipmentChoice.value
	return { type: equipmentChoice.value === "calah" ? "exchangeCalah" : "requestWaterwork", kind, area: area.value.id }
})
const equipmentPreview = computed(() => {
	if (props.path.length) return { game: null, error: "Add or clear your canal draft before buying equipment." }
	if (maintenanceSales.value.length || maintenanceSelection.value.length) return { game: null, error: "Finish or clear crew-funding sales before buying equipment." }
	if (!equipmentAction.value) return { game: null, error: equipmentChoice.value ? "Choose a highlighted site on the map." : "Choose equipment below." }
	return actionPreview(equipmentAction.value)
})
const equipmentResult = computed(() => {
	const game = equipmentPreview.value.game
	if (!game?.gameflow.pendingOffer) return game
	return applyAction(game, game.gameflow.turnOrder[0], { type: "respondOffer", accept: true })
})
const equipmentPrice = computed(() => equipmentChoice.value === "calah" ? 0 : equipmentChoice.value ? cardData.value[equipmentChoice.value][1] : 0)
const equipmentButtonLabel = computed(() => equipmentChoice.value !== "digger" && !area.value ? `Choose ${equipmentChoice.value === "calah" ? "waterwork" : equipmentChoice.value} site` : equipmentPreview.value.game?.gameflow.pendingOffer ? "Request landowner agreement" : equipmentChoice.value === "digger" ? `Add ${cardData.value.digger[0]} crew (${equipmentPrice.value} SPL)` : equipmentChoice.value === "calah" ? `Exchange Calah on ${label(area.value?.id)}` : `Build ${equipmentChoice.value} on ${label(area.value?.id)} (${equipmentPrice.value} SPL)`)
const maintenanceAfterConstruction = computed(() => {
	const game = equipmentResult.value
	if (!game || equipmentChoice.value === "digger" || rules.hasMaintenanceCrew(game, state.value.id)) return null
	const [capacity, price] = rf.ERA_CARD_DATA[rules.nextCardEra(game)].digger
	const contribution = rules.maintenanceShortfall(game, state.value.id)
	return { capacity, price, contribution, shortfall: Math.max(0, contribution - game.players[state.value.king].money) }
})
async function submitDig() {
	if (digError.value) return
	await submit(store.gameflow.developmentStep === "eridu" ? { type: "digEridu", path: props.path } : { type: "dig", crew: chosenCrew.value.id, path: props.path })
	if (personal.canPlay() && unusedCrews.value.length && store.gameflow.developmentStep === "digging") setIntent("dig")
}
function buyEquipment() {
	if (equipmentPreview.value.error) return
	return submit(equipmentAction.value)
}

function label(id) { return store.board.areas.find((entry) => entry.id === id)?.label || id }
function nationRecipient(nation, amount) {
	const isPrivateSale = nation.ownerType === "player"
	const owner = isPrivateSale ? store.players[nation.owner] : store.states[nation.owner]
	return { src: isPrivateSale ? assets.getPlayerMarkerImage(nation.owner) : assets.getStateOrderImage(nation.owner), label: isPrivateSale ? "Private cash" : `${rf.STATE_NAMES[nation.owner]} treasury`, before: owner.money, after: owner.money + amount }
}
function actionPreview(action) {
	if (actor.value === undefined) return { game: null, error: "" }
	try { return { game: applyAction(model.snapshotState(), actor.value, action), error: "" } } catch (error) { return { game: null, error: error.message } }
}
function preview(action) { return actionPreview(action).error }
function useFittingCrew(crew) { activeSection.value = "dig"; selectedCrew.value = crew.id; nextTick(() => digButton.value?.focus()) }
function resetTrade() { tradeSteps.value = []; saleSelection.value = []; exchangeDer.value = false }
function removeSale(batches, batchIndex, id) {
	batches[batchIndex] = batches[batchIndex].filter((entry) => entry !== id)
	if (!batches[batchIndex].length) batches.splice(batchIndex, 1)
}
async function confirmSettlementBid() {
	if (await controller.submitAction({ type: "bidPrimogeniture", amount: primogenitureAmount.value })) await controller.endPlayerTurn()
}
async function submit(action) {
	if (await controller.submitAction(action)) {
		store.viewSettings.actionIntent = ""
		if (action.type !== "exchangeBarahshum") {
			resetTrade()
			maintenanceSales.value = []
			maintenanceSelection.value = []
		}
		if (["dig", "digEridu"].includes(action.type)) emit("clearPath")
	}
}
const mapConfirmation = computed(() => {
	if (!personal.canPlay() || store.viewSettings.showReplay) return null
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.viewSettings.actionIntent === "dig" && props.path.length >= 2) return {
		area: props.path.at(-1), label: store.gameflow.developmentStep === "eridu" ? "Add Eridu canal" : `Add canal · ${chosenCrew.value?.capacity ?? '?'} crew`,
		detail: digPreview.value.cost ? `${digPreview.value.cost.canals} canal + ${digPreview.value.cost.junctions} junction points` : digError.value, canConfirm: !digError.value,
	}
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && ["build", "calah"].includes(store.viewSettings.actionIntent) && area.value) return {
		area: area.value.id, label: equipmentButtonLabel.value, detail: equipmentPreview.value.error || "Staged until development is finished", canConfirm: !equipmentPreview.value.error,
	}
	return chosenWater.value ? {
		area: chosenWater.value.area, label: chosenWater.value.kind === "pump" ? `Send water to ${label(chosenWater.value.area)}` : `Irrigate ${label(chosenWater.value.area)}`,
		detail: chosenWater.value.kind === "irrigate" ? `+${irrigationYield.value} SPL harvest` : "Review the amount in the action panel",
		canConfirm: chosenWater.value.kind === "irrigate" || (Number.isInteger(waterAmount.value) && waterAmount.value >= 1 && waterAmount.value <= frame.value.water),
	} : null
})
watch(mapConfirmation, (choice) => emit("changeMapAction", choice), { immediate: true })
const intentTargets = computed(() => {
	const intent = store.viewSettings.actionIntent
	if (!personal.canPlay() || !["build", "calah"].includes(intent) || store.gameflow.phase !== rf.PHASE_DEVELOPMENT || !state.value || ["eridu", "betweenStates"].includes(store.gameflow.developmentStep) || pendingOffer.value) return []
	// Use the existing action validation, including token supply and consent.
	const snapshot = model.snapshotState()
	return store.board.areas.filter((land) => {
		if (land.waterwork || (intent === "build" && (equipmentChoice.value === "digger" || !equipmentChoice.value || (equipmentChoice.value === "reservoir") !== land.isRiver))) return false
		try {
			applyAction(snapshot, actor.value, { type: intent === "calah" ? "exchangeCalah" : "requestWaterwork", kind: land.isRiver ? "reservoir" : "pump", area: land.id })
			return true
		} catch { return false }
	}).map((land) => land.id)
})
watch(intentTargets, (targets) => emit("changeActionTargets", targets), { immediate: true })
function confirmMapAction() {
	if (!mapConfirmation.value?.canConfirm) return
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT) return store.viewSettings.actionIntent === "dig" ? submitDig() : buyEquipment()
	return submit({ type: "allocateWater", area: waterTarget.value, amount: chosenWater.value.kind === "irrigate" ? 1 : waterAmount.value })
}
function cancelMapAction() {
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.viewSettings.actionIntent === "dig") emit("clearPath")
	else { waterTarget.value = null; emit("selectArea", null) }
}
async function finishTurn() {
	if (store.gameflow.phase === rf.PHASE_SETTLEMENT && hasTrade.value) {
		if (!await controller.submitAction(tradeAction.value)) return false
	} else if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && !store.turnDraft.ready && state.value && !rules.hasMaintenanceCrew(store, state.value.id) && (maintenanceSales.value.length || !canFinishDevelopment.value)) {
		if (!await controller.submitAction(maintenanceAction.value)) return false
	} else if (props.path.length >= 2) {
		store.gameMessages.actionError = "Review and add your canal before ending the turn, or clear the path."
		return false
	}
	return controller.endPlayerTurn()
}
defineExpose({ finishTurn, confirmMapAction, cancelMapAction })

watch([() => store.gameflow.phase, () => actor.value, () => store.gameflow.stateIndex], () => {
	resetTrade()
	maintenanceSales.value = []
	maintenanceSelection.value = []
	selectedCrew.value = null
	equipmentChoice.value = null
	primogenitureAmount.value = (store.gameflow.primogenitureBid?.amount || 0) + 1
}, { immediate: true })
watch(() => store.gameflow.primogenitureBid?.amount, (amount) => { if (primogenitureAmount.value <= (amount || 0)) primogenitureAmount.value = (amount || 0) + 1 })
watch(() => props.selectedArea, (id) => {
	saleSelection.value = saleChoices.value.some((land) => land.id === id) ? [id] : []
	if (id && store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.viewSettings.actionIntent === "sell") toggleMaintenanceLand(id)
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "routing") waterTarget.value = waterOptions.value.some((choice) => choice.area === id) ? id : null
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" && removable.value.includes(id)) removeWaterwork.value = id
})
watch(() => frame.value?.area, () => { waterTarget.value = null; waterAmount.value = 1 })
watch(() => frame.value?.water, (water) => { if (water > 0 && waterAmount.value > water) waterAmount.value = water })
watch(waterOptions, (choices) => { if (!choices.some((choice) => choice.area === waterTarget.value)) waterTarget.value = null })
watch(() => state.value?.diggers.filter((crew) => !crew.hasDug).map((crew) => crew.id).join(","), (unusedCrewIds, previousCrewIds) => {
	if (store.gameflow.developmentStep === "digging") {
		if (unusedCrewIds === "") activeSection.value = "equipment"
		else if (previousCrewIds === "") activeSection.value = "dig"
	}
	if (selectedCrew.value !== null && !unusedCrews.value.some((crew) => crew.id === selectedCrew.value)) selectedCrew.value = null
})
watch(() => store.gameflow.developmentStep, (step) => { if (step === "purchasing") { activeSection.value = "equipment"; equipmentChoice.value = null } })
watch([() => store.gameflow.phase, () => store.gameflow.developmentStep, () => state.value?.id, () => personal.canPlay(), () => unusedCrews.value.length], () => {
	if (!personal.canPlay() || store.gameflow.phase !== rf.PHASE_DEVELOPMENT || pendingOffer.value || ["betweenStates"].includes(store.gameflow.developmentStep)) return
	if (!canFinishDevelopment.value && store.gameflow.developmentStep !== "eridu") { activeSection.value = "funding"; setIntent("sell") }
	else if (store.gameflow.developmentStep === "eridu" || (store.gameflow.developmentStep === "digging" && unusedCrews.value.length)) {
		if (!store.viewSettings.actionIntent) { activeSection.value = "dig"; setIntent("dig") }
	} else { activeSection.value = "equipment"; if (store.viewSettings.actionIntent === "dig") setIntent("") }
}, { immediate: true })
watch(nationToBuy, (id) => { nationPrice.value = id === null ? 0 : rf.NATION_PRICES[id] })
watch(assimilationChoices, (choices) => { if (!choices.some((nation) => nation.id === nationToBuy.value)) nationToBuy.value = null })
watch(removable, (ids) => { if (!ids.includes(removeWaterwork.value)) removeWaterwork.value = ids[0] ?? null }, { immediate: true })
watch(removeWaterwork, (id) => emit("changeRemoval", id), { immediate: true })
</script>

<template>
	<section class="gameActions" aria-label="Game actions">
		<KickoutDialog />
		<div v-if="store.gameMessages.errorText" class="error" role="alert">{{ store.gameMessages.errorText }}</div>
		<div v-if="store.gameMessages.actionError" class="error" role="alert">{{ store.gameMessages.actionError }}</div>
		<div v-if="store.gameflow.endReason && store.gameflow.phase !== rf.PHASE_GAME_OVER" class="endNotice" role="status"><b>Final round.</b> {{ store.gameflow.endReason === 'invasion' ? 'No water reached the south. The game ends after these harvests.' : 'A revolution ends the game after this rainy season.' }}</div>
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<b>{{ store.gameflow.endReason === 'revolution' ? 'The game ends after a revolution.' : 'The Southern Peoples invade.' }}</b>
			<ol class="finalStandings"><li v-for="index in store.gameflow.finalPositions" :key="index"><PlayerMarker :index="index" /><b>{{ store.players[index].score }} SPL</b></li></ol><p>Final assets include private cash and land at its market value. Select a player above to inspect their holdings.</p>
		</template>
		<template v-else-if="store.gameflow.pendingOffer">
			<div class="offerHeading"><img :src="assets.getStateOrderImage(pendingOffer.state)" alt="" /><b v-if="pendingOffer.action.type === 'offerNation'">{{ rf.STATE_NAMES[pendingOffer.state] }} offers {{ pendingOffer.action.amount }} SPL for {{ rf.NATION_NAMES[pendingOffer.action.nation] }}</b><b v-else>{{ rf.STATE_NAMES[pendingOffer.state] }} asks to build a {{ pendingOffer.action.kind }} at {{ label(pendingOffer.action.area) }}</b></div>
			<template v-if="pendingOffer.action.type === 'offerNation'"><ArtworkCard class="consentNationCard" :src="assets.getNationCardImage(pendingOffer.action.nation)" :alt="rf.NATION_NAMES[pendingOffer.action.nation]" /><p>Sell {{ rf.NATION_NAMES[pendingOffer.action.nation] }} for <b>{{ pendingOffer.action.amount }} SPL</b>?</p><div class="paymentRow nationSaleRecipient"><img :src="nationSaleRecipient.src" alt="" /><span>{{ nationSaleRecipient.label }}</span><b>{{ nationSaleRecipient.before }} → {{ nationSaleRecipient.after }} SPL</b></div></template>
			<template v-else><div class="offeredWork"><img :src="assets.getWaterworkImage(pendingOffer.state, cardData[pendingOffer.action.kind][0])" :alt="`Proposed ${pendingOffer.action.kind} · ${view.waterworkMeasure({ kind: pendingOffer.action.kind, capacity: cardData[pendingOffer.action.kind][0] })}`" /><img v-if="offeredLand && !offeredLand.isRiver" :src="assets.getTerrainImage(offeredLand.landType, offeredLand.isCity)" :alt="`${rf.LAND_NAMES[offeredLand.landType]}${offeredLand.isCity ? ' city' : ' land'}`" /><span><b>{{ label(pendingOffer.action.area) }}</b><small v-if="offeredLand && !offeredLand.isRiver" class="workMeasure">{{ rf.LAND_NAMES[offeredLand.landType] }} {{ offeredLand.isCity ? 'city' : 'land' }}</small><small class="workMeasure">{{ pendingOffer.action.kind }} · {{ view.waterworkMeasure({ kind: pendingOffer.action.kind, capacity: cardData[pendingOffer.action.kind][0] }) }}</small></span></div><p>The state treasury pays {{ pendingOffer.action.type === 'exchangeCalah' ? 0 : cardData[pendingOffer.action.kind][1] }} SPL. The site is highlighted on the board.</p><div v-if="offeredLand && offeredLand.owner !== null" class="paymentRow consentIncome"><img :src="assets.getPlayerMarkerImage(offeredLand.owner)" alt="" /><span>Private income if this land is irrigated in the rainy season</span><b>+{{ offeredLandIncome }} SPL</b></div></template>
			<div class="buttonRow consentControls"><button class="primaryAction" :disabled="!personal.canPlay()" @click="submit({ type: 'respondOffer', accept: true })">Accept</button><button :disabled="!personal.canPlay()" @click="submit({ type: 'respondOffer', accept: false })">Decline</button></div>
		</template>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_SETTLEMENT && (!canExchangeBarahshum || personal.canPlay())" :disabled="!personal.canPlay()">
			<legend>Settlement · <PlayerMarker :index="actor" /></legend>
			<p>Select land to buy or sell. Actions happen in the order below; Complete Turn saves them.</p>
			<div class="selectedLand" v-if="area && !area.isRiver"><img :src="assets.getTerrainImage(area.landType, area.isCity)" :alt="`${rf.LAND_NAMES[area.landType]}${area.isCity ? ' city' : ''}`" /><span><b>{{ label(area.id) }} · {{ rf.STATE_NAMES[area.state] }}</b><small>{{ area.owner === null ? (area.markerOwner === null ? 'Colonize' : 'Buy') : 'Sale value' }} · {{ selectedPrice }} SPL<template v-if="area.isCity"> · City</template></small><small v-if="area.owner !== null" class="selectedOwner"><PlayerMarker :index="area.owner" />{{ area.owner === actor ? 'Your land' : 'Owned land' }}</small><small v-else-if="area.markerOwner !== null" class="selectedOwner" :title="`Returns to ${store.players[area.markerOwner].displayName} when this land is bought`"><PlayerMarker :index="area.markerOwner" />Ownership marker</small></span></div>
			<p v-if="area && boardRules.isNationLandClosed(store, area)" class="hint">Independent nation land is closed to purchases.</p>
			<div class="buttonRow" v-if="area && !area.isRiver">
				<button v-if="area.owner === null" :disabled="boardRules.isNationLandClosed(store, area) || !!purchaseLocks[area.id] || purchase === area.id" @click="buySelected">{{ purchase && purchase !== area.id ? 'Change purchase to' : area.markerOwner === null ? 'Colonize' : 'Buy' }} {{ label(area.id) }} ({{ selectedPrice }} SPL)</button>
				<label v-if="ownedDer && area.landType === rf.LAND_FOREST && area.owner === null"><input type="checkbox" v-model="exchangeDer" /> Free with Der</label>
			</div>
			<p v-if="area && purchaseLocks[area.id]" class="hint">{{ purchaseLocks[area.id] }}</p>
			<div v-if="area && (area.owner === actor || area.id === purchase) && !isSaleQueued" class="saleGroup">
				<label v-for="land in saleChoices" :key="land.id"><input type="checkbox" v-model="saleSelection" :value="land.id" />{{ label(land.id) }}</label>
				<button :disabled="!saleSelection.length" @click="sellSelected">Sell {{ saleSelection.length }} {{ rf.LAND_NAMES[area.landType] }} (+{{ saleValue }} SPL)</button>
				<p class="hint">Selected land sells together at the price before the drop.</p>
			</div>
			<ol v-if="hasTrade" aria-label="Your settlement turn">
				<li v-for="(step, index) in tradeSteps" :key="index">
					{{ tradeStepLabel(step, index) }}
					<button :disabled="index === 0" @click="moveTradeStep(index, -1)" aria-label="Move action up">↑</button><button :disabled="index === tradeSteps.length - 1" @click="moveTradeStep(index, 1)" aria-label="Move action down">↓</button><button @click="tradeSteps.splice(index, 1)" aria-label="Remove action">×</button>
				</li>
			</ol>
			<p v-if="exchangeDer && purchase" class="hint">Der dissolves. Its {{ rf.NATION_INCOMES[rf.NATION_DER] }} SPL income each round ends.</p>
			<p v-if="tradeError" class="error">{{ tradeError }}</p>
			<div v-if="tradePreview?.game" class="tradeBalance">Cash after trade <b>{{ tradePreview.game.players[actor].money }} SPL</b><small>{{ tradePreview.game.players[actor].money - store.players[actor].money >= 0 ? '+' : '' }}{{ tradePreview.game.players[actor].money - store.players[actor].money }} SPL</small><small title="Private cash and owned land at the resulting market prices">Assets after: {{ tradeAssetsAfter }} SPL ({{ tradeAssetsChange >= 0 ? '+' : '' }}{{ tradeAssetsChange }})</small></div>
			<MarketForecast v-if="tradePreview?.game" :before="store" :after="tradePreview.game" />
			<StateLeadership v-for="change in tradeLeadershipChanges" :key="change.id" :change="change" />
			<button v-if="hasTrade" @click="resetTrade">Clear turn actions</button>
			<form v-if="!hasTrade" class="buttonRow primogenitureBid" @submit.prevent="confirmSettlementBid"><label for="primogeniture">Primogeniture bid:</label><input id="primogeniture" type="number" inputmode="numeric" v-model.number="primogenitureAmount" :min="(store.gameflow.primogenitureBid?.amount || 0) + 1" :max="primogenitureBudget" step="1" required /><button :disabled="!!primogenitureError">Bid</button><small>{{ primogenitureBudget }} SPL available · Refunded after settlement</small><span v-if="store.gameflow.primogenitureBid"><PlayerMarker :index="store.gameflow.primogenitureBid.player" /> holds the high bid: {{ store.gameflow.primogenitureBid.amount }} SPL</span><span v-if="primogenitureError" class="error">{{ primogenitureError }}</span></form>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_DEVELOPMENT && (!canExchangeBarahshum || personal.canPlay())" class="developmentActions" :disabled="!personal.canPlay()">
			<legend>{{ store.gameflow.developmentStep === 'betweenStates' ? (state ? `Before ${rf.STATE_NAMES[state.id]} development` : 'Before rainy season') : store.gameflow.developmentStep === 'eridu' ? 'Eridu digs before the states' : state ? `${rf.STATE_NAMES[state.id]} development` : 'Finish development' }}</legend>
			<template v-if="store.gameflow.developmentStep === 'betweenStates'">
				<p v-if="hasBarahshumOpportunity"><PlayerMarker v-if="store.nations[rf.NATION_BARAHSHUM].ownerType === 'player'" :index="store.nations[rf.NATION_BARAHSHUM].owner" /><template v-else>{{ rf.STATE_NAMES[store.nations[rf.NATION_BARAHSHUM].owner] }}</template> may dissolve Barahshum to dig a canal before {{ state ? `${rf.STATE_NAMES[state.id]} begins` : 'the rainy season' }}.</p><p v-else>No Barahshum exchange is available.</p>
				<button @click="submit({ type: 'beginDevelopment' })">{{ state ? `Start ${rf.STATE_NAMES[state.id]} development` : 'Start rainy season' }}</button>
			</template>
			<template v-else>
				<details v-if="store.gameflow.developmentStep === 'eridu' || (store.gameflow.developmentStep === 'digging' && state.diggers.some((crew) => !crew.hasDug))" class="actionGroup" :open="activeSection === 'dig'">
					<summary @click.prevent="chooseSection('dig')">Dig canals</summary>
					<p>Click a highlighted hex, then extend the route. A fitting crew is chosen automatically.</p>
					<b v-if="store.gameflow.developmentStep === 'eridu'">Eridu's free crew · 2 digging points</b>
					<label v-else>Crew <select v-model="selectedCrew" @change="setIntent('dig')"><option :value="null">Automatic · smallest fitting crew</option><option v-for="crew in state.diggers" :key="crew.id" :value="crew.id" :disabled="crew.hasDug">{{ crew.capacity }} points · crew {{ crew.id + 1 }}{{ crew.hasDug ? ' (used)' : '' }}</option></select></label>
					<p v-if="path.length">{{ path.map(label).join(' → ') }}</p>
					<div v-if="path.length >= 2" class="hint" role="status"><template v-if="digPreview.cost">{{ digPreview.cost.canals }} canal + {{ digPreview.cost.junctions }} junction points.</template><span v-if="chosenCrew && !digError"> Uses {{ chosenCrew.capacity }} crew {{ chosenCrew.id + 1 }}.</span><p v-if="digError" class="error">{{ digError }}</p></div>
					<div v-if="fittingCrews.length > 1" class="buttonRow fittingCrews"><span>Other fitting crews:</span><button v-for="crew in fittingCrews.filter((entry) => entry.id !== chosenCrew?.id)" :key="crew.id" :aria-label="`Use ${crew.capacity} digging crew ${crew.id + 1}`" @click="useFittingCrew(crew)">Use {{ crew.capacity }} crew {{ crew.id + 1 }}</button></div>
					<button v-if="path.length >= 2" ref="digButton" class="digAction primaryAction" :disabled="!!digError" @click="submitDig">Add canal<small>{{ path.map(label).join(' → ') }}</small></button>
					<button v-if="path.length" @click="emit('clearPath')">Clear canal draft</button>
					<button v-if="store.gameflow.developmentStep === 'eridu'" @click="submit({ type: 'pass' })">Skip Eridu</button>
				</details>
				<template v-if="store.gameflow.developmentStep !== 'eridu'">
					<div v-if="!rules.hasMaintenanceCrew(store, state.id)" class="actionGroup crewFunding" aria-label="Required crew funding">
						<b>Required {{ cardData.digger[0] }} crew · {{ cardData.digger[1] }} SPL</b>
						<p>State pays {{ Math.min(state.money, cardData.digger[1]) }} SPL. Private contribution: {{ maintenanceContribution }} SPL.</p>
						<p v-if="maintenanceSales.length">Private cash after sales: {{ maintenanceFundingGame.players[state.king].money }} SPL.</p>
						<p role="status" class="fundingGap">{{ willRevolt ? 'The crew cannot be covered with eligible land.' : maintenanceGap ? `Need ${maintenanceGap} more SPL — select land to sell.` : maintenanceError ? 'Review the funding sales below.' : 'Crew covered. Finish development to hire it.' }}</p>
						<template v-if="!canFinishDevelopment">
							<button v-if="store.viewSettings.actionIntent !== 'sell' && maintenanceGap" @click="setIntent('sell')">Select funding land on map</button>
							<div v-for="group in maintenanceGroups" :key="group.type" class="fundingTerrain"><b>{{ rf.LAND_NAMES[group.type] }}</b><div class="buttonRow"><button v-for="land in group.lands" :key="land.id" :aria-pressed="maintenanceSelection.includes(land.id)" @click="toggleMaintenanceLand(land.id)">{{ label(land.id) }} · +{{ rules.landPrice(maintenanceFundingGame, land) }} SPL</button></div></div>
							<button v-if="maintenanceSelection.length" class="primaryAction" @click="addMaintenanceBatch">Add sale of {{ maintenanceSelection.length }} land (+{{ maintenanceSelectionValue }} SPL)</button>
							<p v-if="maintenanceChoices.length" class="hint">Select one terrain type per batch. Each batch sells at the price before its drop. Sales must preserve this throne; stop once the crew is covered.</p>
							<ol v-if="maintenanceSales.length" aria-label="Crew funding sales"><li v-for="(batch, index) in maintenanceSales" :key="index">Sale {{ index + 1 }}:<button v-for="id in batch" :key="id" :aria-label="`Remove ${label(id)} from maintenance sale`" @click="removeSale(maintenanceSales, index, id)">{{ label(id) }} ×</button></li></ol>
							<button v-if="maintenanceSales.length" @click="maintenanceSales = []; maintenanceSelection = []">Clear funding sales</button>
						</template>
						<p v-if="maintenanceError && maintenanceSales.length" class="error">{{ maintenanceError }}</p>
						<div v-if="maintenancePreview?.game && !willRevolt" class="tradeBalance">After crew<b>{{ maintenancePreview.game.players[state.king].money }} SPL private</b><small>{{ maintenancePreview.game.states[state.id].money }} SPL in the state treasury</small></div>
						<MarketForecast v-if="maintenanceSales.length && maintenanceSalePreview.game" :before="store" :after="maintenanceSalePreview.game" />
						<StateLeadership v-for="change in maintenanceLeadershipChanges" :key="change.id" :change="change" />
						<p v-if="willRevolt" class="eraChange">No eligible land can cover the crew. Declaring revolution forfeits your private cash and ends the game after this rainy season.</p>
					</div>
					<details v-if="store.era === 3 && assimilationChoices.length" class="actionGroup" :open="activeSection === 'nations'"><summary @click.prevent="chooseSection('nations')">Buy a nation</summary><form class="nationOffer" @submit.prevent="submit({ type: 'offerNation', nation: nationToBuy, amount: nationPrice })">
						<label>Assimilate <select v-model="nationToBuy" required><option :value="null">Choose nation</option><option v-for="nation in assimilationChoices" :key="nation.id" :value="nation.id">{{ rf.NATION_NAMES[nation.id] }}</option></select></label>
						<div v-if="selectedNation" class="nationOfferPreview"><ArtworkCard :src="assets.getNationCardImage(selectedNation.id)" :alt="rf.NATION_NAMES[selectedNation.id]" /><div><b>Seller: <PlayerMarker v-if="selectedNation.ownerType === 'player'" :index="selectedNation.owner" /><template v-else>{{ rf.STATE_NAMES[selectedNation.owner] }}</template></b><p>Allowed offer: {{ rf.NATION_PRICES[selectedNation.id] / 2 }}–{{ rf.NATION_PRICES[selectedNation.id] * 2 }} SPL.</p><label>Offer SPL <input type="number" inputmode="numeric" v-model.number="nationPrice" :min="rf.NATION_PRICES[selectedNation.id] / 2" :max="rf.NATION_PRICES[selectedNation.id] * 2" step="1" required /></label><p v-if="!nationOfferError">{{ rf.STATE_NAMES[state.id] }} treasury after purchase: {{ state.money - nationPrice }} SPL.</p><p v-else class="error">{{ nationOfferError }}</p></div><div v-if="!nationOfferError" class="paymentRow nationPurchaseRecipient"><img :src="nationPurchaseRecipient.src" alt="" /><span>{{ nationPurchaseRecipient.label }}</span><b>{{ nationPurchaseRecipient.before }} → {{ nationPurchaseRecipient.after }} SPL</b></div><button class="nationPurchaseButton" :disabled="!!nationOfferError">{{ requiresNationConsent ? 'Request agreement' : `Buy ${rf.NATION_NAMES[selectedNation.id]}` }}</button></div>
					</form></details>
					<details class="actionGroup equipmentShop" :open="activeSection === 'equipment'"><summary @click.prevent="chooseSection('equipment')">Buy equipment</summary>
						<p>Era {{ cardEra === 5 ? 'M' : cardEra }} · {{ cardEra === 5 ? 'Unlimited supply' : `${store.cardSupply[cardEra]} cards left` }} · State treasury {{ state.money }} SPL</p>
						<div class="equipmentChoices" role="group" aria-label="Choose equipment">
							<button v-for="kind in ['digger', 'pump', 'reservoir']" :key="kind" :aria-pressed="equipmentChoice === kind" @click="chooseEquipment(kind)"><b>{{ kind === 'digger' ? 'Crew' : kind === 'pump' ? 'Pump' : 'Reservoir' }} · {{ cardData[kind][1] }} SPL</b><small>{{ kind === 'digger' ? `${cardData[kind][0]} digging points · usable next development` : kind === 'pump' ? `${cardData[kind][0]} canal reach · choose land` : `${cardData[kind][0]} water capacity · choose river` }}</small></button>
							<button v-if="ownedCalah" :aria-pressed="equipmentChoice === 'calah'" @click="chooseEquipment('calah')"><b>Calah · free waterwork</b><small>Dissolves Calah · ends its {{ rf.NATION_INCOMES[rf.NATION_CALAH] }} SPL income</small></button>
						</div>
						<details class="equipmentReference"><summary>Printed equipment card</summary><ArtworkCard :src="assets.getEquipmentCardImage(cardEra)" :alt="`Era ${cardEra === 5 ? 'M' : cardEra} equipment: capacities and prices`" /></details>
						<div v-if="equipmentChoice" class="equipmentPreview">
							<p v-if="store.gameflow.developmentStep === 'digging'" class="eraChange"><b>This purchase ends digging for {{ rf.STATE_NAMES[state.id] }}.</b></p>
							<p v-if="cardEra > store.era" class="eraChange">Starts era {{ cardEra === 5 ? 'M' : cardEra }}.<template v-if="cardEra >= 3"> Era {{ cardEra - 2 }} crews retire.</template><template v-if="cardEra === 3"> Nations may be assimilated.</template><template v-if="cardEra === 4"> Independent nations dissolve.</template></p>
							<p v-if="area && equipmentChoice !== 'digger'"><b>{{ label(area.id) }} · {{ rf.STATE_NAMES[area.state] }}</b></p>
							<p v-if="equipmentPreview.error" class="hint" role="status">{{ equipmentPreview.error }}</p>
							<button v-if="path.length" @click="emit('clearPath')">Clear canal draft</button>
							<div v-if="equipmentResult" class="tradeBalance">After purchase<b>{{ equipmentResult.states[state.id].money }} SPL state treasury</b><small>Private cash: {{ store.players[state.king].money }} → {{ equipmentResult.players[state.king].money }} SPL</small></div>
							<p v-if="equipmentPreview.game?.gameflow.pendingOffer" class="hint"><PlayerMarker :index="area.owner" /> must agree. Digging closes if they accept.</p>
							<div v-if="maintenanceAfterConstruction" class="eraChange"><b>Maintenance still required: {{ maintenanceAfterConstruction.capacity }} crew · {{ maintenanceAfterConstruction.price }} SPL</b><p>Private contribution: {{ maintenanceAfterConstruction.contribution }} SPL.<span v-if="maintenanceAfterConstruction.shortfall" class="error"> Need {{ maintenanceAfterConstruction.shortfall }} more SPL.</span></p></div>
							<button class="primaryAction equipmentPurchase" :disabled="!!equipmentPreview.error" @click="buyEquipment">{{ equipmentButtonLabel }}</button>
							<p class="hint">Added to your draft. Finish development to save, or Undo to change it.</p>
						</div>
					</details>
				</template>
			</template>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'routing' && frame" :disabled="!personal.canPlay()">
			<legend>Route water from {{ label(frame.area) }}</legend>
			<form @submit.prevent="submit({ type: 'allocateWater', area: waterTarget, amount: chosenWater?.kind === 'irrigate' ? 1 : waterAmount })">
				<div class="waterSupply"><img class="routingWork" :src="assets.getWaterworkImage(sourceWaterwork.state, sourceWaterwork.capacity)" :alt="`${sourceWaterwork.kind} · ${view.waterworkMeasure(sourceWaterwork)}`" :title="`${sourceWaterwork.kind} · ${view.waterworkMeasure(sourceWaterwork)}`" /><span class="waterDrop" aria-hidden="true"></span><span class="waterCount"><b>{{ frame.water }}</b> water available<small>{{ sourceWaterwork.kind }} · {{ view.waterworkMeasure(sourceWaterwork) }}</small></span></div><p>Choose a numbered blue hex on the map or select its number below.</p><p> Pumps automatically irrigate their own land. Excess returns to the previous waterwork.</p>
				<div class="buttonRow">
					<label>Destination <select v-model="waterTarget" @change="emit('selectArea', waterTarget)" required><option :value="null">Click the map or choose</option><option v-for="(choice, index) in waterOptions" :key="choice.area" :value="choice.area">{{ index + 1 }}. {{ label(choice.area) }} · {{ choice.kind === 'pump' ? 'Send to pump' : 'Irrigate' }}</option></select></label>
					<div v-if="targetWaterwork" class="offeredWork"><img :src="assets.getWaterworkImage(targetWaterwork.state, targetWaterwork.capacity)" alt="Destination pump" /><span>{{ rf.STATE_NAMES[targetWaterwork.state] }} pump · {{ view.waterworkMeasure(targetWaterwork) }}</span></div>
				</div>
				<div v-if="irrigationLand" class="offeredWork irrigationPreview"><img :src="assets.getTerrainImage(irrigationLand.landType, irrigationLand.isCity)" :alt="`${rf.LAND_NAMES[irrigationLand.landType]}${irrigationLand.isCity ? ' city' : ''}`" /><img :src="assets.getPlayerMarkerImage(irrigationLand.owner)" :alt="store.players[irrigationLand.owner].displayName" /><span>{{ irrigationLand.isCity ? 'City' : 'Land' }} owned by <PlayerMarker :index="irrigationLand.owner" /><small>Private income: +{{ irrigationIncome }} SPL</small><small>{{ rf.STATE_NAMES[irrigationState] }} harvest: {{ rules.harvestAmount(store, irrigationState) }} → {{ rules.harvestAmount(store, irrigationState) + irrigationYield }} SPL</small></span></div>
				<div class="buttonRow routingControls"><label v-if="chosenWater?.kind === 'pump'">Water (max {{ frame.water }}) <input type="number" inputmode="numeric" v-model.number="waterAmount" min="1" :max="frame.water" step="1" required /></label><button class="primaryAction" :disabled="!chosenWater">{{ !chosenWater ? 'Choose destination' : chosenWater.kind === 'pump' ? 'Send water' : 'Irrigate with one water' }}<small v-if="chosenWater"> · <template v-if="chosenWater.kind === 'pump'">{{ waterAmount }} → </template>{{ label(chosenWater.area) }}<template v-if="chosenWater.kind === 'irrigate'"> · +{{ irrigationYield }} SPL harvest</template></small></button></div>
			</form>
		</fieldset>
		<fieldset v-else-if="store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === 'harvest'" :disabled="!personal.canPlay()">
			<legend>{{ rf.STATE_NAMES[state.id] }} harvest: {{ rules.harvestAmount(store, state.id) }} SPL</legend>
			<div class="harvestChoice">
				<b>Distribute to landowners</b>
				<div class="paymentRow" v-for="payment in harvestPayments" :key="payment.index"><PlayerMarker :index="payment.index" /><span><small>Cash {{ store.players[payment.index].money }} → {{ store.players[payment.index].money + payment.amount }} SPL</small></span><b>+{{ payment.amount }} SPL</b></div>
				<div v-if="harvest.retained > 0" class="paymentRow"><img :src="assets.getStateOrderImage(state.id)" alt="" /><span>State retains<small>Treasury {{ state.money }} → {{ state.money + harvest.retained }} SPL</small></span><b>{{ harvest.retained }} SPL</b></div>
			</div>
			<div v-if="!state.hasRevolted" class="harvestChoice">
				<b>Keep in the state treasury</b><div class="paymentRow"><img :src="assets.getStateOrderImage(state.id)" alt="" /><span>{{ rf.STATE_NAMES[state.id] }}<small>Treasury {{ state.money }} → {{ state.money + rules.harvestAmount(store, state.id) }} SPL</small></span><b>+{{ rules.harvestAmount(store, state.id) }} SPL</b></div>
				<label v-if="rules.harvestAmount(store, state.id) > 0 && removable.length" class="removeWork">Remove lowest-numbered waterwork <select v-model="removeWaterwork" @change="emit('selectArea', removeWaterwork)"><option v-for="id in removable" :key="id" :value="id">{{ label(id) }} · {{ store.board.areas.find((area) => area.id === id).waterwork.kind }} {{ store.board.areas.find((area) => area.id === id).waterwork.capacity }}</option></select><img v-if="removeWaterwork" class="piece" :src="assets.getWaterworkImage(state.id, store.board.areas.find((area) => area.id === removeWaterwork).waterwork.capacity)" alt="Waterwork to remove" /></label>
			</div>
			<div class="buttonRow harvestControls"><button class="primaryAction" @click="submit({ type: 'harvest', choice: 'distribute' })">Distribute harvest</button><button v-if="!state.hasRevolted" @click="submit({ type: 'harvest', choice: 'store', remove: removeWaterwork })">Store harvest<small v-if="removeWaterwork">Remove {{ label(removeWaterwork) }}</small></button></div>
		</fieldset>
		<div v-if="canExchangeBarahshum" class="actionGroup"><button @click="setIntent('barahshum')">Choose Barahshum canal site</button><b><PlayerMarker v-if="store.nations[rf.NATION_BARAHSHUM].ownerType === 'player'" :index="store.nations[rf.NATION_BARAHSHUM].owner" /><template v-else>{{ rf.STATE_NAMES[store.nations[rf.NATION_BARAHSHUM].owner] }}</template> · Barahshum</b><p>Dissolve this nation to build one adjacent canal without using a normal turn. Its {{ rf.NATION_INCOMES[rf.NATION_BARAHSHUM] }} SPL income each round ends.</p><p v-if="barahshumError" class="hint">{{ barahshumError }}</p><button v-else @click="submit({ type: 'exchangeBarahshum', from: barahshum.id, to: area.id })">Dissolve Barahshum and dig to {{ label(area.id) }}</button></div>
	</section>
</template>

<style scoped>
.equipmentChoices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }.equipmentChoices button { text-align: left; min-height: 65px; margin: 0; padding: 8px; }.equipmentChoices small { display: block; margin-top: 5px; }.equipmentChoices [aria-pressed=true], .fundingTerrain [aria-pressed=true] { background: #e3eddb; border: 2px solid #547751; }.equipmentPreview { padding: 8px; margin-top: 8px; border: 1px solid #c4b894; border-radius: 4px; }.equipmentReference { margin-top: 8px; }.equipmentReference :deep(img) { max-width: 100%; }.fundingGap { font-weight: bold; }.fundingTerrain { margin: 8px 0; }.crewFunding ol { padding-left: 20px; }

.gameActions { width: 100%; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; margin: 8px 0; text-align: left; font-size: 16px; font-weight: 600; }
fieldset { border: 1px solid #c4b894; border-radius: 4px; padding: 8px; margin: 0; min-width: 0; }legend { max-width: 100%; overflow-wrap: anywhere; box-sizing: border-box; font-weight: bold; font-size: 15px; }p { margin: 6px 0; }.buttonRow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 6px 0; }button, input, select { font: inherit; }button { cursor: pointer; margin: 2px; padding: 4px 7px; }button:disabled { cursor: default; }input[type=number] { width: 70px; }label { margin: 3px; }summary { cursor: pointer; font-weight: bold; padding: 5px 0; }
.actionGroup { margin: 8px 0; padding: 7px 0; border-top: 1px solid #c4b894; }.saleGroup { margin: 5px 0; }.error { color: #a40000; font-weight: bold; }.hint { color: #655a42; margin: 4px 0; }.piece { width: 24px; height: 24px; object-fit: contain; vertical-align: middle; margin-right: 5px; }
.cardSupply { display: block; margin-top: 4px; color: #655a42; }.eraChange { padding: 6px; background: #f7edc7; border-left: 3px solid #aa9b77; }
.equipmentCard { float: right; width: 230px; max-width: 42%; height: auto; margin: 0 0 8px 14px; border: 1px solid #aa9b77; border-radius: 4px; }.equipmentShop { display: flow-root; }
.selectedLand { display: flex; align-items: center; gap: 8px; background: #eee4c9; border-radius: 4px; padding: 7px; margin: 7px 0; }.selectedLand img { width: 35px; height: 35px; }.selectedLand small { display: block; margin-top: 3px; color: #655a42; }
.selectedLand > span { min-width: 0; overflow-wrap: anywhere; }.selectedLand .selectedOwner { display: flex; align-items: center; gap: 4px; }.selectedLand .selectedOwner img { width: 20px; height: 20px; }
.queuedPurchase { padding: 6px; border-left: 3px solid #527349; background: #edf5e4; }.tradeBalance { padding: 7px; border-top: 1px solid #c4b894; display: flex; flex-wrap: wrap; gap: 5px; }.tradeBalance b { margin-left: auto; }.tradeBalance small { width: 100%; text-align: right; color: #655a42; }
.exchangeIncome { display: block; margin-top: 3px; font-size: 16px; font-weight: 600; }.queuedPurchase label { display: flex; align-items: center; gap: 7px; min-height: 40px; margin: 3px 0 0; cursor: pointer; }.queuedPurchase input[type=checkbox] { width: 18px; height: 18px; flex-shrink: 0; margin: 0; }
.harvestChoice { margin-top: 8px; padding: 8px; background: #f7f0dd; border: 1px solid #c4b894; border-radius: 4px; }.paymentRow { display: flex; align-items: center; gap: 7px; margin: 6px 0; }.paymentRow span { min-width: 0; overflow-wrap: anywhere; }.paymentRow img { width: 25px; height: 25px; }.paymentRow b { margin-left: auto; }.removeWork { display: block; font-size: 16px; font-weight: 600; }.removeWork select { margin: 5px; max-width: calc(100% - 10px); }
.waterSupply { display: flex; align-items: center; gap: 7px; margin: 8px 0; }.waterSupply b { font-size: 24px; }.waterDrop { width: 18px; height: 24px; background: #35c3e6; border: 1px solid #1685b4; border-radius: 65% 35% 55% 45%; transform: rotate(35deg); }
.routingWork { width: 38px; height: 38px; object-fit: contain; }
.waterCount { min-width: 0; flex: 1; }.waterCount small { display: block; margin-top: 3px; font-size: 16px; font-weight: 600; color: #655a42; }.waterSupply > img, .waterDrop { flex-shrink: 0; }
.harvestChoice .paymentRow small { display: block; margin-top: 2px; font-size: 16px; font-weight: 600; color: #655a42; }.harvestChoice .paymentRow b { flex-shrink: 0; white-space: nowrap; }
.harvestControls, .routingControls, .developmentControls, .tradeControls { align-items: stretch; }.harvestControls button, .routingControls button, .developmentControls button, .tradeControls button { flex: 1; min-width: 0; margin: 0; }.harvestControls small, .tradeControls small { display: block; margin-top: 3px; font-size: 16px; font-weight: 600; }
.maintenanceControls, .tradeControls, .consentControls, .harvestControls, .routingControls, .developmentControls { position: sticky; bottom: -12px; z-index: 1; background: #fff9e9; padding: 7px 0 12px; border-top: 1px solid #c4b894; }
.developmentControls > small { flex-basis: 100%; font-size: 16px; font-weight: 600; color: #655a42; }
.routingControls small { font-size: 16px; font-weight: 600; font-weight: normal; }
.digAction { max-width: 100%; box-sizing: border-box; }.digAction small { display: block; margin-top: 3px; font-size: 16px; font-weight: 600; font-weight: normal; }
.routingControls label { display: flex; flex-direction: column; gap: 2px; margin: 0; font-size: 16px; font-weight: 600; white-space: nowrap; }.routingControls input { box-sizing: border-box; }
.irrigationPreview small, .workMeasure { display: block; margin-top: 3px; font-size: 16px; font-weight: 600; color: #655a42; }
.consentIncome b, .crewContribution b { flex-shrink: 0; white-space: nowrap; }.crewContribution small { display: block; margin-top: 3px; font-size: 16px; font-weight: 600; }
.endNotice { margin-bottom: 8px; padding: 7px 8px; background: #f6e3cf; border-left: 3px solid #a75a24; color: #663716; font-size: 16px; font-weight: 600; }
.finalStandings { padding-left: 24px; }.finalStandings li { overflow-wrap: anywhere; padding: 7px 0; }.finalStandings img { width: 28px; height: 28px; vertical-align: middle; margin-right: 6px; }.finalStandings b { float: right; margin: 6px 0 0 5px; }
.offerHeading, .offeredWork { display: flex; align-items: center; gap: 8px; margin: 8px 0; }.offerHeading img, .offeredWork img { width: 38px; height: 38px; }.offerHeading { padding-bottom: 8px; border-bottom: 1px solid #c4b894; font-size: 15px; }
.nationOfferPreview { display: grid; grid-template-columns: minmax(0, 42%) minmax(0, 1fr); align-items: start; gap: 10px; margin-top: 8px; }.nationOfferPreview > :first-child { width: 100%; }.nationPurchaseRecipient, .nationPurchaseButton { grid-column: 1 / -1; }.nationPurchaseRecipient { margin: 0; }.nationOfferPreview > div { min-width: 0; overflow-wrap: anywhere; }.nationOffer select { max-width: 100%; }
</style>
