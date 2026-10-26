<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import KickoutDialog from "./KickoutDialog.vue"
import ArtworkCard from "./ArtworkCard.vue"
import StateLeadership from "./StateLeadership.vue"
import MarketForecast from "./MarketForecast.vue"
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as controller from "../js/URRcontroller"
import * as model from "../js/URRmodel"
import { actionPanelGame, groupedDraftSteps, crewRemovalIndices } from "../js/URRturnDraft.js"
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
const { t } = useI18n()
const game = computed(() => actionPanelGame(store))
const previewState = computed(() => store.turnDraft.ready ? game.value : model.snapshotState())
const tradeSteps = ref([])
const stagedEquipment = computed(() => store.turnDraft.steps.filter((step) => ["requestWaterwork", "exchangeCalah"].includes(step.action?.type)).map((step) => step.action.area))
const purchase = computed(() => tradeSteps.value.find((step) => step.type === "buy")?.area ?? null)
const maintenanceSales = ref([])
const maintenanceSelection = ref([])
const exchangeDer = ref(false)
const primogenitureAmount = ref(1)
const selectedCrew = ref(null)
const digButton = ref(null)
const nationToBuy = ref(null)
const nationPrice = ref(0)
const removeWaterwork = ref(null)
const waterTarget = ref(null)
const waterAmount = ref(1)
const activeSection = ref("")
function chooseSection(section) { activeSection.value = activeSection.value === section ? "" : section }
// Digging is finished by the button below the canal controls, or by buying anything.
const diggingDone = ref(false)
const useCalah = ref(false)
function setIntent(intent) {
	store.viewSettings.actionIntent = intent
	store.viewSettings.inspectedState = null
	store.viewSettings.showOwnedLand = false
}
const canalSummaries = computed(() => store.turnDraft.steps.filter((step) => ["dig", "digEridu", "exchangeBarahshum"].includes(step.action?.type)).map((step) => {
	const path = step.action.path || [step.action.from, step.action.to]
	const cost = step.action.type === "exchangeBarahshum" ? null : boardRules.getCanalCost(step.state, path)
	return { path, cost }
}))
const actor = computed(() => game.value.gameflow.turnOrder[0])
const primogenitureBudget = computed(() => actor.value === undefined ? 0 : rules.availableMoney(game.value, actor.value) + (game.value.gameflow.primogenitureBid?.player === actor.value ? game.value.gameflow.primogenitureBid.amount : 0))
const primogenitureError = computed(() => preview({ type: "bidPrimogeniture", amount: primogenitureAmount.value }))
const area = computed(() => game.value.board.areas.find((entry) => entry.id === props.selectedArea))
const state = computed(() => game.value.states[view.currentStateId(game.value)])
const unusedCrews = computed(() => state.value?.diggers.filter((crew) => !crew.hasDug) || [])
const fittingCrews = computed(() => {
	if (!state.value || game.value.gameflow.developmentStep === "eridu" || props.path.length < 2) return []
	try {
		const cost = boardRules.getCanalCost(game.value, props.path)
		return unusedCrews.value.filter((crew) => boardRules.canCrewDig(crew.capacity, cost)).sort((a, b) => crewPoints(a.capacity) - crewPoints(b.capacity) || a.id - b.id)
	} catch { return [] }
})
function crewPoints(capacity) { return capacity === "M" ? Infinity : capacity === "1+1" ? 2 : Number(capacity) }
const chosenCrew = computed(() => selectedCrew.value === null ? fittingCrews.value[0] : unusedCrews.value.find((crew) => crew.id === selectedCrew.value))
const digCapacity = computed(() => game.value.gameflow.developmentStep === "eridu" ? 2 : selectedCrew.value === null ? unusedCrews.value.map((crew) => crew.capacity) : chosenCrew.value?.capacity ?? null)
watch(digCapacity, (capacity) => emit("changeDigCapacity", capacity), { immediate: true })
const pendingOffer = computed(() => game.value.gameflow.pendingOffer)
const offeredLand = computed(() => game.value.board.areas.find((entry) => entry.id === pendingOffer.value?.action.area))
const offeredLandIncome = computed(() => offeredLand.value ? rf.IRRIGATED_LANDOWNER_INCOME * (offeredLand.value.isCity ? 2 : 1) : 0)
const nationSaleRecipient = computed(() => {
	const offer = pendingOffer.value
	if (offer?.action.type !== "offerNation") return null
	return nationRecipient(game.value.nations[offer.action.nation], offer.action.amount)
})
const cardEra = computed(() => rules.nextCardEra(game.value))
const cardData = computed(() => rf.ERA_CARD_DATA[cardEra.value])
const frame = computed(() => water.currentWaterFrame(game.value))
const waterOptions = computed(() => water.waterChoices(game.value))
const chosenWater = computed(() => waterOptions.value.find((choice) => choice.area === waterTarget.value))
const sourceWaterwork = computed(() => game.value.board.areas.find((area) => area.id === frame.value?.area)?.waterwork)
const targetWaterwork = computed(() => game.value.board.areas.find((area) => area.id === chosenWater.value?.area)?.waterwork)
const irrigationLand = computed(() => {
	if (!chosenWater.value) return null
	const land = game.value.board.areas.find((area) => area.id === chosenWater.value.area)
	return land.owner !== null && land.irrigatedBy === null ? land : null
})
const irrigationState = computed(() => targetWaterwork.value?.state ?? sourceWaterwork.value?.state)
const irrigationYield = computed(() => irrigationLand.value ? rf.ERA_YIELD_PER_AREA[game.value.era] * (irrigationLand.value.isCity ? 2 : 1) : 0)
const irrigationIncome = computed(() => irrigationLand.value ? rf.IRRIGATED_LANDOWNER_INCOME * (irrigationLand.value.isCity ? 2 : 1) : 0)
const maintenanceContribution = computed(() => state.value ? rules.maintenanceShortfall(game.value, state.value.id) : 0)
const canFinishDevelopment = computed(() => state.value && (rules.hasMaintenanceCrew(game.value, state.value.id) || game.value.players[state.value.king].money >= maintenanceContribution.value))
const removable = computed(() => state.value ? rules.removableWaterworks(game.value, state.value.id) : [])
const ownedDer = computed(() => {
	const nation = game.value.nations[rf.NATION_DER]
	return nation && !nation.isRemoved && nation.ownerType === "player" && nation.owner === actor.value
})
const canExchangeDer = computed(() => ownedDer.value && game.value.board.areas.find((area) => area.id === purchase.value)?.landType === rf.LAND_FOREST)
watch(canExchangeDer, (canExchange) => { if (!canExchange && purchase.value !== null) exchangeDer.value = false })
const ownedCalah = computed(() => {
	const nation = game.value.nations[rf.NATION_CALAH]
	return nation && !nation.isRemoved && nation.ownerType === "state" && nation.owner === state.value?.id
})
const assimilationChoices = computed(() => game.value.nations.filter((nation) => !nation.isRemoved && nation.ownerType !== null && nation.id !== rf.NATION_FIRST_AKKADIANS && !(nation.ownerType === "state" && nation.owner === state.value?.id)))
const selectedNation = computed(() => assimilationChoices.value.find((nation) => nation.id === nationToBuy.value))
const nationOfferError = computed(() => selectedNation.value ? preview({ type: "offerNation", nation: nationToBuy.value, amount: nationPrice.value }) : t("actions.chooseNationError"))
const nationPurchaseRecipient = computed(() => selectedNation.value ? nationRecipient(selectedNation.value, nationPrice.value) : null)
const requiresNationConsent = computed(() => selectedNation.value && (selectedNation.value.ownerType === "player" ? selectedNation.value.owner : game.value.states[selectedNation.value.owner].king) !== state.value.king)
const barahPlayer = computed(() => personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? actor.value : personal.pov)
const canExchangeBarahshum = computed(() => !store.turnDraft.ready && !personal.haltPlay && !store.viewSettings.showReplay && personal.pov >= 0 && rules.canExchangeBarahshum(game.value, barahPlayer.value))
const barahshum = computed(() => game.value.board.areas.find((entry) => entry.nation === rf.NATION_BARAHSHUM))
const barahshumError = computed(() => {
	if (!area.value || !barahshum.value?.neighbours.includes(area.value.id)) return t("actions.selectBarahshumAdjacent")
	try { applyAction(previewState.value, barahPlayer.value, { type: "exchangeBarahshum", from: barahshum.value.id, to: area.value.id }); return "" } catch (error) { return error.message }
})
const tradeAction = computed(() => {
	const buyIndex = tradeSteps.value.findIndex((step) => step.type === "buy")
	const sales = (steps) => steps.filter((step) => step.type === "sell").map((step) => step.areas)
	return { type: "tradeLand", sellBefore: sales(buyIndex < 0 ? tradeSteps.value : tradeSteps.value.slice(0, buyIndex)), sellAfter: buyIndex < 0 ? [] : sales(tradeSteps.value.slice(buyIndex + 1)), ...(purchase.value === null ? {} : { buy: purchase.value, exchangeDer: exchangeDer.value }) }
})
const hasTrade = computed(() => tradeSteps.value.length > 0)
const landDraft = computed(() => ({ reset: resetTrade, buy: purchase.value, sales: [...tradeSteps.value.filter((step) => step.type === "sell").flatMap((step) => step.areas), ...maintenanceSales.value.flat(), ...maintenanceSelection.value], eligibleSales: maintenanceChoices.value.map((land) => land.id), fundingGap: maintenanceGap.value, blocked: purchaseLocks.value, equipment: stagedEquipment.value, hasTrade: hasTrade.value, error: tradeError.value, net: tradePreview.value?.game ? tradePreview.value.game.players[actor.value].money - game.value.players[actor.value].money : null }))
const tradePreview = computed(() => {
	if (!hasTrade.value) return null
	try { return { game: applyAction(previewState.value, actor.value, tradeAction.value), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const tradeError = computed(() => {
	const error = tradePreview.value?.error || ""
	if (error !== "Not enough private money" || purchase.value === null) return error
	const sales = tradeAction.value.sellBefore
	const previewGame = sales.length ? actionPreview({ type: "tradeLand", sellBefore: sales }).game : game.value
	if (!previewGame) return error
	const land = previewGame.board.areas.find((entry) => entry.id === purchase.value)
	const deficit = rules.landPrice(previewGame, land, land.markerOwner === null) - rules.availableMoney(previewGame, actor.value)
	return t("actions.notEnoughPrivate", { deficit })
})
const tradeAssetsAfter = computed(() => tradePreview.value?.game ? rules.playerAssets(tradePreview.value.game, actor.value) : null)
const tradeAssetsChange = computed(() => tradeAssetsAfter.value === null ? 0 : tradeAssetsAfter.value - rules.playerAssets(game.value, actor.value))
const purchaseLocks = computed(() => {
	if (game.value.gameflow.phase !== rf.PHASE_SETTLEMENT || actor.value === undefined) return {}
	const player = game.value.players[actor.value]
	const sales = tradeAction.value.sellBefore.flat().map((id) => game.value.board.areas.find((land) => land.id === id))
	return Object.fromEntries(game.value.board.areas.filter((land) => !land.isRiver && land.owner === null).map((land) => {
		const terrainSold = player.soldLandTypes.includes(land.landType) || sales.some((sold) => sold.landType === land.landType)
		const stateSold = player.soldEmergingStates.includes(land.state) || sales.some((sold) => sold.state === land.state && !game.value.states[sold.state].isActive)
		return [land.id, terrainSold ? t("actions.cannotBuySoldLand", { land: rf.LAND_NAMES[land.landType] }) : stateSold ? t("actions.cannotBuySoldState") : ""]
	}))
})
function tradeStepLabel(step, index) {
	const preceding = tradeSteps.value.slice(0, index)
	const buyIndex = preceding.findIndex((entry) => entry.type === "buy")
	const sales = (entries) => entries.filter((entry) => entry.type === "sell").map((entry) => entry.areas)
	const action = { type: "tradeLand", sellBefore: sales(buyIndex < 0 ? preceding : preceding.slice(0, buyIndex)), sellAfter: buyIndex < 0 ? [] : sales(preceding.slice(buyIndex + 1)), ...(buyIndex < 0 ? {} : { buy: preceding[buyIndex].area, exchangeDer: exchangeDer.value }) }
	const previewGame = preceding.length ? actionPreview(action).game : game.value
	const price = (id, buying) => previewGame ? rules.landPrice(previewGame, previewGame.board.areas.find((land) => land.id === id), buying && previewGame.board.areas.find((land) => land.id === id).markerOwner === null) : null
	if (step.type === "buy") return t("actions.buyLand", { area: label(step.area), price: exchangeDer.value ? t("actions.freeWithDer") : previewGame ? t("actions.price", { amount: price(step.area, true) }) : t("actions.resolveEarlier") })
	let text = t("actions.sellLand", { areas: step.areas.map(label).join(", ") })
	if (previewGame) text += ` · +${step.areas.reduce((total, id) => total + price(id, false), 0)} SPL`
	if (buyIndex >= 0) text += t("actions.afterBuying")
	return text
}
function buyLand(id) {
	const step = tradeSteps.value.find((step) => step.type === "buy")
	if (step) step.area = id
	else tradeSteps.value.push({ type: "buy", area: id })
}
// Clicking land on the map edits the plan directly: your land toggles a sale, other land becomes the (single) purchase.
function planClick(id) {
	if (game.value.gameflow.phase === rf.PHASE_DEVELOPMENT) return equipClick(id)
	if (game.value.gameflow.phase !== rf.PHASE_SETTLEMENT || !personal.canPlay() || actor.value === undefined || store.turnDraft.ready) return
	const land = game.value.board.areas.find((entry) => entry.id === id)
	store.gameMessages.actionError = ""
	if (!land || land.isRiver) return
	const sale = tradeSteps.value.find((step) => step.type === "sell" && step.areas.includes(id))
	if (sale) {
		sale.areas = sale.areas.filter((entry) => entry !== id)
		if (!sale.areas.length) tradeSteps.value.splice(tradeSteps.value.indexOf(sale), 1)
	} else if (id === purchase.value) tradeSteps.value.splice(tradeSteps.value.findIndex((step) => step.type === "buy"), 1)
	else if (land.owner === actor.value) tradeSteps.value.push({ type: "sell", areas: [id] })
	else if (land.owner !== null) store.gameMessages.actionError = t("actions.belongsToOther")
	else if (boardRules.isNationLandClosed(game.value, land)) store.gameMessages.actionError = t("actions.nationLandClosed")
	else if (purchaseLocks.value[id]) store.gameMessages.actionError = purchaseLocks.value[id]
	else buyLand(id)
}
function moveTradeStep(index, direction) {
	const step = tradeSteps.value.splice(index, 1)[0]
	tradeSteps.value.splice(index + direction, 0, step)
}
// Lands sold in one batch all sell at the price before any drop.
const landType = (id) => game.value.board.areas.find((land) => land.id === id)?.landType
const canMergeUp = (index) => index > 0 && tradeSteps.value[index].type === "sell" && tradeSteps.value[index - 1].type === "sell" && landType(tradeSteps.value[index].areas[0]) === landType(tradeSteps.value[index - 1].areas[0])
function mergeUp(index) {
	tradeSteps.value[index - 1].areas.push(...tradeSteps.value[index].areas)
	tradeSteps.value.splice(index, 1)
}
function splitStep(index) { tradeSteps.value.splice(index + 1, 0, { type: "sell", areas: [tradeSteps.value[index].areas.pop()] }) }
const harvest = computed(() => state.value ? rules.harvestDistribution(game.value, state.value.id) : null)
const harvestPayments = computed(() => harvest.value?.payments.map((amount, index) => ({ amount, index })).filter((payment) => payment.amount > 0) || [])
const selectedPrice = computed(() => area.value && !area.value.isRiver ? rules.landPrice(tradePreview.value?.game || game.value, area.value, area.value.owner === null && area.value.markerOwner === null) : null)
const maintenanceAction = computed(() => ({ type: "resolveMaintenance", sales: maintenanceSales.value.filter((batch) => batch.length) }))
const maintenancePreview = computed(() => {
	if (!state.value || rules.hasMaintenanceCrew(game.value, state.value.id)) return null
	try { return { game: applyAction(previewState.value, actor.value, maintenanceAction.value), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const maintenanceSalePreview = computed(() => {
	if (!state.value || rules.hasMaintenanceCrew(game.value, state.value.id)) return { game: null, error: "" }
	try { return { game: previewMaintenanceSales(previewState.value, state.value.id, maintenanceAction.value.sales), error: "" } } catch (error) { return { game: null, error: error.message } }
})
const maintenanceFundingGame = computed(() => maintenanceSalePreview.value.game || game.value)
const maintenanceGap = computed(() => state.value ? Math.max(0, rules.maintenanceShortfall(maintenanceFundingGame.value, state.value.id) - maintenanceFundingGame.value.players[state.value.king].money) : 0)
const maintenanceError = computed(() => {
	const error = maintenanceSalePreview.value.error || maintenancePreview.value?.error || ""
	if (error === "Sell the remaining eligible land before declaring a revolution") return t("actions.selectLandRaise", { amount: maintenanceGap.value })
	if (error === "The cash left after hiring must be less than the cheapest land sold") return t("actions.tooMuchCash")
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
const tradeLeadershipChanges = computed(() => view.getLeadershipChanges(game.value, tradePreview.value?.game))
const maintenanceLeadershipChanges = computed(() => view.getLeadershipChanges(game.value, maintenanceFundingGame.value))
const willRevolt = computed(() => maintenancePreview.value?.game?.states[state.value?.id]?.hasRevolted || false)
const developmentTurnAction = computed(() => {
	if (game.value.gameflow.phase !== rf.PHASE_DEVELOPMENT || !state.value || ["eridu", "betweenStates"].includes(game.value.gameflow.developmentStep) || pendingOffer.value || store.turnDraft.ready) return null
	const hasSales = maintenanceSales.value.length > 0
	return { hasPendingSales: hasSales || maintenanceSelection.value.length > 0, label: willRevolt.value ? t("actions.declareRevolution") : hasSales ? t("actions.sellEnd") : !rules.hasMaintenanceCrew(game.value, state.value.id) ? t("actions.hireEnd") : t("actions.endTurn"), error: props.path.length ? t("actions.addOrClearCanal") : !canFinishDevelopment.value || hasSales ? maintenanceError.value : "" }
})
watch(landDraft, (draft) => emit("changeLandDraft", draft), { deep: true, immediate: true })
watch(developmentTurnAction, (action) => emit("changeTurnAction", action), { immediate: true })
const digPreview = computed(() => {
	if (props.path.length < 2) return { cost: null, error: t("actions.selectTwoAreas") }
	try {
		const cost = boardRules.getCanalCost(game.value, props.path)
		const crew = chosenCrew.value
		if (game.value.gameflow.developmentStep !== "eridu" && (!crew || crew.hasDug)) return { cost, error: t("actions.noUnusedCrew") }
		const capacity = game.value.gameflow.developmentStep === "eridu" ? 2 : crew.capacity
		return { cost, error: boardRules.canCrewDig(capacity, cost) ? "" : t("actions.pathNeeds", { canals: cost.canals, junctions: cost.junctions, capacity }) }
	} catch (error) { return { cost: null, error: error.message } }
})
const digError = computed(() => digPreview.value.error)
const showDigging = computed(() => game.value.gameflow.developmentStep === "eridu" || (!!state.value && game.value.gameflow.developmentStep === "digging" && (unusedCrews.value.length > 0 || canalSummaries.value.length > 0) && !diggingDone.value))
const showEquipment = computed(() => !!state.value && !showDigging.value && game.value.gameflow.developmentStep !== "eridu" && canFinishDevelopment.value && !pendingOffer.value)
const siteAction = (land) => ({ type: useCalah.value ? "exchangeCalah" : "requestWaterwork", kind: land.isRiver ? "reservoir" : "pump", area: land.id })
// Sites that pass the engine's own checks (price, tokens, consent), so the map only lights what can be bought.
const equipSites = computed(() => {
	if (store.viewSettings.actionIntent !== "equip" || !personal.canPlay() || !showEquipment.value || store.turnDraft.ready) return []
	const snapshot = previewState.value
	return game.value.board.areas.filter((land) => {
		if (land.waterwork) return false
		try { applyAction(snapshot, actor.value, siteAction(land)); return true } catch { return false }
	}).map((land) => land.id)
})
watch(equipSites, (sites) => emit("changeActionTargets", sites), { immediate: true })
const crewError = computed(() => {
	try {
		applyAction(maintenancePreview.value?.game || previewState.value, actor.value, { type: "buyCard", kind: "digger" })
		return maintenancePreview.value?.error || ""
	} catch (error) { return error.message }
})
const siteCost = computed(() => ({ pump: cardData.value.pump, reservoir: cardData.value.reservoir }))
const noSiteReason = computed(() => {
	const cheapest = Math.min(cardData.value.pump[1], cardData.value.reservoir[1])
	return state.value.money < cheapest && !useCalah.value ? t("actions.treasuryCannotAfford", { money: state.value.money, cheapest }) : t("actions.noSite")
})
const crewSteps = computed(() => store.turnDraft.steps.map((step, index) => ({ step, index })).filter(({ step }) => step.action?.type === "buyCard"))
const hasRequiredHire = computed(() => state.value && !rules.hasMaintenanceCrew(game.value, state.value.id))
const crewCount = computed(() => crewSteps.value.length + Number(hasRequiredHire.value))
const canRemoveCrew = computed(() => {
	const last = crewSteps.value.at(-1)
	return !!last && (crewSteps.value.length > 1 || rules.hasMaintenanceCrew(last.step.state, state.value.id))
})
async function addCrew() {
	if (hasRequiredHire.value && !await controller.submitAction({ type: "buyCard", kind: "digger" })) return
	await submit({ type: "buyCard", kind: "digger" })
}
async function removeCrew(index = crewSteps.value.at(-1).index) {
	for (const position of crewRemovalIndices(store.turnDraft.steps, index, state.value.id)) {
		const previousCount = store.turnDraft.steps.length
		await controller.removeDraftStep(position)
		if (store.turnDraft.steps.length !== previousCount - 1) return
	}
}
const draftGroups = computed(() => groupedDraftSteps(hasRequiredHire.value
	? [...store.turnDraft.steps, { state: game.value, action: { type: "buyCard", kind: "digger" } }]
	: store.turnDraft.steps))
const treasuryBefore = computed(() => store.turnDraft.start ? store.turnDraft.start.state.states[state.value.id].money : state.value.money)
const treasuryAfter = computed(() => maintenancePreview.value?.game?.states[state.value.id].money ?? state.value.money)
const treasuryChange = computed(() => {
	const spent = treasuryBefore.value - treasuryAfter.value
	return `${spent < 0 ? "+" : "−"} ${Math.abs(spent)}`
})
function equipClick(id) {
	if (store.viewSettings.actionIntent !== "equip" || !personal.canPlay() || store.turnDraft.ready) return
	const staged = store.turnDraft.steps.findIndex((step) => ["requestWaterwork", "exchangeCalah"].includes(step.action?.type) && step.action.area === id)
	if (staged >= 0) return controller.removeDraftStep(staged)
	const land = game.value.board.areas.find((entry) => entry.id === id)
	if (land && equipSites.value.includes(id)) submit(siteAction(land))
}
function finishDigging() {
	emit("clearPath")
	diggingDone.value = true
}
async function submitDig() {
	if (digError.value) return
	await submit(game.value.gameflow.developmentStep === "eridu" ? { type: "digEridu", path: props.path } : { type: "dig", crew: chosenCrew.value.id, path: props.path })
	if (personal.canPlay() && unusedCrews.value.length && game.value.gameflow.developmentStep === "digging") setIntent("dig")
}
function label(id) { return game.value.board.areas.find((entry) => entry.id === id)?.label || id }
function nationRecipient(nation, amount) {
	const isPrivateSale = nation.ownerType === "player"
	const owner = isPrivateSale ? game.value.players[nation.owner] : game.value.states[nation.owner]
	return { src: isPrivateSale ? assets.getPlayerMarkerImage(nation.owner) : assets.getStateOrderImage(nation.owner), label: isPrivateSale ? t("actions.privateCash") : t("actions.stateTreasury", { state: rf.STATE_NAMES[nation.owner] }), before: owner.money, after: owner.money + amount }
}
function actionPreview(action) {
	if (actor.value === undefined) return { game: null, error: "" }
	try { return { game: applyAction(previewState.value, actor.value, action), error: "" } } catch (error) { return { game: null, error: error.message } }
}
function preview(action) { return actionPreview(action).error }
function useFittingCrew(crew) { activeSection.value = "dig"; selectedCrew.value = crew.id; nextTick(() => digButton.value?.focus()) }
function resetTrade() { tradeSteps.value = []; exchangeDer.value = false }
function removeSale(batches, batchIndex, id) {
	batches[batchIndex] = batches[batchIndex].filter((entry) => entry !== id)
	if (!batches[batchIndex].length) batches.splice(batchIndex, 1)
}
const ending = ref(false)
async function confirmSettlementBid() {
	if (ending.value) return
	ending.value = true
	try {
		if (await controller.submitAction({ type: "bidPrimogeniture", amount: primogenitureAmount.value })) await controller.endPlayerTurn()
	} finally { ending.value = false }
}
async function skipEridu() {
	if (ending.value || store.viewSettings.isSaving) return
	ending.value = true
	try { await controller.endPlayerTurn() } finally { ending.value = false }
}
async function confirmHarvest(choice) {
	if (ending.value || store.viewSettings.isSaving) return
	ending.value = true
	try {
		if (await controller.submitAction({ type: "harvest", choice, ...(choice === "store" ? { remove: removeWaterwork.value } : {}) })) await controller.endPlayerTurn()
	} finally { ending.value = false }
}
async function confirmAgreement(accept) {
	if (ending.value || store.viewSettings.isSaving) return
	ending.value = true
	try {
		if (await controller.submitAction({ type: "respondOffer", accept })) await controller.endPlayerTurn()
	} finally { ending.value = false }
}
async function submit(action) {
	if (await controller.submitAction(action)) {
		// Dig and equipment stay on the map between purchases; the remounted panel re-selects them.
		if (!["dig", "equip"].includes(store.viewSettings.actionIntent)) store.viewSettings.actionIntent = ""
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
	if (game.value.gameflow.phase === rf.PHASE_DEVELOPMENT && store.viewSettings.actionIntent === "dig" && props.path.length >= 2) return {
		area: props.path.at(-1), label: game.value.gameflow.developmentStep === "eridu" ? t("actions.addEriduCanal") : t("actions.addCanalCrew", { capacity: chosenCrew.value?.capacity ?? "?" }),
		detail: digPreview.value.cost ? t("actions.canalPoints", { canals: digPreview.value.cost.canals, junctions: digPreview.value.cost.junctions }) : digError.value, canConfirm: !digError.value,
	}
	return chosenWater.value ? {
		area: chosenWater.value.area, label: chosenWater.value.kind === "pump" ? t("actions.sendWaterTo", { area: label(chosenWater.value.area) }) : t("actions.irrigateArea", { area: label(chosenWater.value.area) }),
		detail: chosenWater.value.kind === "irrigate" ? t("actions.irrigationYield", { amount: irrigationYield.value }) : t("actions.reviewCanalAmount"),
		canConfirm: chosenWater.value.kind === "irrigate" || (Number.isInteger(waterAmount.value) && waterAmount.value >= 1 && waterAmount.value <= frame.value.water),
	} : null
})
watch(mapConfirmation, (choice) => emit("changeMapAction", choice), { immediate: true })
function confirmMapAction() {
	if (!mapConfirmation.value?.canConfirm) return
	if (game.value.gameflow.phase === rf.PHASE_DEVELOPMENT) return submitDig()
	return submit({ type: "allocateWater", area: waterTarget.value, amount: chosenWater.value.kind === "irrigate" ? 1 : waterAmount.value })
}
function cancelMapAction() {
	if (game.value.gameflow.phase === rf.PHASE_DEVELOPMENT && store.viewSettings.actionIntent === "dig") emit("clearPath")
	else { waterTarget.value = null; emit("selectArea", null) }
}
async function finishTurn() {
	if (game.value.gameflow.phase === rf.PHASE_SETTLEMENT && hasTrade.value) {
		if (!await controller.submitAction(tradeAction.value)) return false
	} else if (game.value.gameflow.phase === rf.PHASE_DEVELOPMENT && !store.turnDraft.ready && state.value && !rules.hasMaintenanceCrew(game.value, state.value.id) && (maintenanceSales.value.length || !canFinishDevelopment.value)) {
		if (!await controller.submitAction(maintenanceAction.value)) return false
	} else if (props.path.length >= 2) {
		store.gameMessages.actionError = t("actions.reviewBeforeEnd")
		return false
	}
	return controller.endPlayerTurn()
}
defineExpose({ finishTurn, confirmMapAction, cancelMapAction, planClick, showDigging })

watch([() => game.value.gameflow.phase, () => actor.value, () => game.value.gameflow.stateIndex], () => {
	resetTrade()
	maintenanceSales.value = []
	maintenanceSelection.value = []
	selectedCrew.value = null
	diggingDone.value = store.viewSettings.actionIntent === "equip"
	useCalah.value = false
	primogenitureAmount.value = (game.value.gameflow.primogenitureBid?.amount || 0) + 1
}, { immediate: true })
watch(() => game.value.gameflow.primogenitureBid?.amount, (amount) => { if (primogenitureAmount.value <= (amount || 0)) primogenitureAmount.value = (amount || 0) + 1 })
watch(() => props.selectedArea, (id) => {
	if (id && game.value.gameflow.phase === rf.PHASE_DEVELOPMENT && store.viewSettings.actionIntent === "sell") toggleMaintenanceLand(id)
	if (game.value.gameflow.phase === rf.PHASE_RAINY_SEASON && game.value.rain.step === "routing") waterTarget.value = waterOptions.value.some((choice) => choice.area === id) ? id : null
	if (game.value.gameflow.phase === rf.PHASE_RAINY_SEASON && game.value.rain.step === "harvest" && removable.value.includes(id)) removeWaterwork.value = id
})
watch(() => frame.value?.area, () => { waterTarget.value = null; waterAmount.value = 1 })
watch(() => frame.value?.water, (water) => { if (water > 0 && waterAmount.value > water) waterAmount.value = water })
watch(waterOptions, (choices) => { if (!choices.some((choice) => choice.area === waterTarget.value)) waterTarget.value = null })
watch(() => store.turnDraft.ready, (ready) => {
	if (!ready) return
	const action = store.turnDraft.steps.at(-1).action
	if (action.type === "allocateWater") {
		waterTarget.value = action.area
		waterAmount.value = action.amount
	}
}, { flush: "post" })
watch(() => state.value?.diggers.filter((crew) => !crew.hasDug).map((crew) => crew.id).join(","), () => {
	if (selectedCrew.value !== null && !unusedCrews.value.some((crew) => crew.id === selectedCrew.value)) selectedCrew.value = null
})
// The map follows the stage: dig canals, then buy equipment; crew funding takes it over when cash is short.
watch([() => game.value.gameflow.phase, () => game.value.gameflow.developmentStep, () => state.value?.id, () => personal.canPlay(), () => unusedCrews.value.length, diggingDone, canFinishDevelopment, useCalah], () => {
	if (!personal.canPlay() || game.value.gameflow.phase !== rf.PHASE_DEVELOPMENT || pendingOffer.value || game.value.gameflow.developmentStep === "betweenStates") return
	if (!canFinishDevelopment.value && game.value.gameflow.developmentStep !== "eridu") setIntent("sell")
	else if (showDigging.value) { if (store.viewSettings.actionIntent !== "dig") setIntent("dig") }
	else setIntent("equip")
}, { immediate: true })
watch(nationToBuy, (id) => { nationPrice.value = id === null ? 0 : rf.NATION_PRICES[id] })
watch(assimilationChoices, (choices) => { if (!choices.some((nation) => nation.id === nationToBuy.value)) nationToBuy.value = null })
watch(removable, (ids) => { if (!ids.includes(removeWaterwork.value)) removeWaterwork.value = ids[0] ?? null }, { immediate: true })
watch(removeWaterwork, (id) => emit("changeRemoval", id), { immediate: true })
</script>

<template>
	<section class="gameActions" :aria-label="$t('actions.aria')">
		<KickoutDialog />
		<div v-if="game.gameflow.endReason && game.gameflow.phase !== rf.PHASE_GAME_OVER" class="endNotice" role="status"><b>{{ $t("actions.finalRound") }}</b> {{ game.gameflow.endReason === 'invasion' ? $t("actions.invasionEnd") : $t("actions.revolutionEnd") }}</div>
		<template v-if="game.gameflow.phase === rf.PHASE_GAME_OVER">
			<b>{{ game.gameflow.endReason === 'revolution' ? $t("actions.gameEndedRevolution") : $t("actions.invasion") }}</b>
			<ol class="finalStandings"><li v-for="index in game.gameflow.finalPositions" :key="index"><PlayerMarker :index="index" /><b>{{ game.players[index].score }} <CurrencyIcon /></b></li></ol><p>{{ $t("actions.finalAssets") }}</p>
		</template>
		<template v-else-if="game.gameflow.pendingOffer">
			<div class="offerHeading"><img :src="assets.getStateOrderImage(pendingOffer.state)" alt="" /><b v-if="pendingOffer.action.type === 'offerNation'"><CurrencyText :text="$t('actions.offerNation', { state: rf.STATE_NAMES[pendingOffer.state], amount: pendingOffer.action.amount, nation: rf.NATION_NAMES[pendingOffer.action.nation] })" /></b><b v-else>{{ $t("actions.offerWaterwork", { state: rf.STATE_NAMES[pendingOffer.state], kind: pendingOffer.action.kind, area: label(pendingOffer.action.area) }) }}</b></div>
			<template v-if="pendingOffer.action.type === 'offerNation'"><ArtworkCard class="consentNationCard" :src="assets.getNationCardImage(pendingOffer.action.nation)" :alt="rf.NATION_NAMES[pendingOffer.action.nation]" /><p>{{ $t("actions.sellNation", { nation: rf.NATION_NAMES[pendingOffer.action.nation] }) }}<b>{{ pendingOffer.action.amount }} <CurrencyIcon /></b>?</p><div class="paymentRow nationSaleRecipient"><img :src="nationSaleRecipient.src" alt="" /><span><CurrencyText :text="nationSaleRecipient.label" /></span><b>{{ nationSaleRecipient.before }} → {{ nationSaleRecipient.after }} <CurrencyIcon /></b></div></template>
			<template v-else><div class="offeredWork"><img :src="assets.getWaterworkImage(pendingOffer.state, cardData[pendingOffer.action.kind][0])" :title="view.waterworkMeasure({ kind: pendingOffer.action.kind, capacity: cardData[pendingOffer.action.kind][0] })" :alt="$t('actions.proposedWork', { kind: pendingOffer.action.kind, measure: view.waterworkMeasure({ kind: pendingOffer.action.kind, capacity: cardData[pendingOffer.action.kind][0] }) })" /><img v-if="offeredLand && !offeredLand.isRiver" :src="assets.getTerrainImage(offeredLand.landType, offeredLand.isCity)" :alt="offeredLand.isCity ? $t('actions.landCity', { land: rf.LAND_NAMES[offeredLand.landType] }) : $t('actions.landLand', { land: rf.LAND_NAMES[offeredLand.landType] })" /><span><b>{{ label(pendingOffer.action.area) }}</b><small class="workMeasure"><template v-if="offeredLand && !offeredLand.isRiver">{{ offeredLand.isCity ? $t("actions.landCity", { land: rf.LAND_NAMES[offeredLand.landType] }) : $t("actions.landLand", { land: rf.LAND_NAMES[offeredLand.landType] }) }}{{ ' ' }}</template>{{ pendingOffer.action.kind }}</small></span></div><p><CurrencyText :text="$t('actions.siteCost', { amount: pendingOffer.action.type === 'exchangeCalah' ? 0 : cardData[pendingOffer.action.kind][1] })" /></p><div v-if="offeredLand && offeredLand.owner !== null" class="paymentRow consentIncome"><img :src="assets.getPlayerMarkerImage(offeredLand.owner)" alt="" /><span>{{ $t("actions.ifIrrigated") }}</span><b>+{{ offeredLandIncome }} <CurrencyIcon /></b></div></template>
			<div class="buttonRow consentControls"><button class="primaryAction" :disabled="!personal.canPlay() || ending || store.viewSettings.isSaving" @click="confirmAgreement(true)">{{ $t("actions.acceptEnd") }}</button><button :disabled="!personal.canPlay() || ending || store.viewSettings.isSaving" @click="confirmAgreement(false)">{{ $t("actions.declineEnd") }}</button></div>
		</template>
		<fieldset v-else-if="game.gameflow.phase === rf.PHASE_SETTLEMENT" :disabled="!personal.canPlay()">
			<p class="hint settlementBox">{{ $t("actions.settlementHint") }}</p>
			<ol v-if="hasTrade" class="turnPlan" :aria-label="$t('actions.settlementTurnAria')">
				<li v-for="(step, index) in tradeSteps" :key="index"><CurrencyText :text="tradeStepLabel(step, index)" />
					<span class="planButtons"><button v-if="canMergeUp(index)" @click="mergeUp(index)" :title="$t('actions.sellTogether')">{{ $t("actions.above") }}</button><button v-if="step.type === 'sell' && step.areas.length > 1" @click="splitStep(index)" :title="$t('actions.sellLastSeparately')">{{ $t("actions.split") }}</button><button :disabled="index === 0" @click="moveTradeStep(index, -1)" :aria-label="$t('actions.moveUp')">↑</button><button :disabled="index === tradeSteps.length - 1" @click="moveTradeStep(index, 1)" :aria-label="$t('actions.moveDown')">↓</button><button @click="tradeSteps.splice(index, 1)" :aria-label="$t('actions.removeFromPlan')">×</button></span>
				</li>
			</ol>
			<label v-if="canExchangeDer"><input type="checkbox" v-model="exchangeDer" /> {{ $t("actions.freeWithDer") }}</label>
			<p v-if="exchangeDer && purchase" class="hint"><CurrencyText :text="$t('actions.derDissolves', { income: rf.NATION_INCOMES[rf.NATION_DER] })" /></p>
			<p v-if="tradeError" class="error"><CurrencyText :text="tradeError" /></p>
			<div v-if="tradePreview?.game" class="tradeBalance">{{ $t("actions.cashAfterPlan") }} <b>{{ tradePreview.game.players[actor].money }} <CurrencyIcon /></b><small>{{ tradePreview.game.players[actor].money - game.players[actor].money >= 0 ? '+' : '' }}{{ tradePreview.game.players[actor].money - game.players[actor].money }} <CurrencyIcon /></small><small :title="$t('actions.assetsAfterTitle')"><CurrencyText :text="$t('actions.assetsAfter', { assets: tradeAssetsAfter, change: (tradeAssetsChange >= 0 ? '+' : '') + tradeAssetsChange })" /></small></div>
			<MarketForecast v-if="tradePreview?.game" :before="game" :after="tradePreview.game" />
			<StateLeadership v-for="change in tradeLeadershipChanges" :key="change.id" :change="change" />
			<button v-if="hasTrade" @click="resetTrade">{{ $t("actions.clearPlan") }}</button>
			<form v-if="!hasTrade" class="primogenitureBid" @submit.prevent="confirmSettlementBid"><p class="orLabel">{{ $t("actions.or") }}</p><div class="bidBox"><label for="primogeniture">{{ $t("actions.bidPrimogeniture") }}</label><div class="buttonRow"><input id="primogeniture" type="number" inputmode="numeric" v-model.number="primogenitureAmount" :min="(game.gameflow.primogenitureBid?.amount || 0) + 1" :max="primogenitureBudget" step="1" required /><button :disabled="!!primogenitureError || ending || store.viewSettings.isSaving"><CurrencyText :text="$t('actions.bidEndTurn', { amount: primogenitureAmount })" /></button><small><CurrencyText :text="$t('actions.availableAmount', { amount: primogenitureBudget })" /><br>{{ $t("actions.refunded") }}</small><span v-if="game.gameflow.primogenitureBid"><PlayerMarker :index="game.gameflow.primogenitureBid.player" /> <CurrencyText :text="$t('actions.holdsHighBid', { amount: game.gameflow.primogenitureBid.amount })" /></span><span v-if="primogenitureError" class="error"><CurrencyText :text="primogenitureError" /></span></div></div></form>
		</fieldset>
		<fieldset v-else-if="game.gameflow.phase === rf.PHASE_DEVELOPMENT" class="developmentActions plain" :disabled="!personal.canPlay()">
			<template v-if="game.gameflow.developmentStep === 'betweenStates'">
				<p>{{ state ? $t("actions.startDevelopment", { state: rf.STATE_NAMES[state.id] }) : $t("actions.startRainy") }}</p>
			</template>
			<template v-else>
				<div v-if="showDigging" class="actionGroup">
					<b>{{ $t("actions.digCanals") }}</b>
					<p>{{ $t("actions.digHint") }}</p>
					<div v-for="(summary, index) in canalSummaries" :key="index" role="status"><p>{{ summary.path.map(label).join(' → ') }}</p><p v-if="summary.cost" class="hint">{{ $t("actions.canalPoints", { canals: summary.cost.canals, junctions: summary.cost.junctions }) }}</p><p v-else class="hint">{{ $t("actions.barahshumDissolved") }}</p></div>
					<b v-if="game.gameflow.developmentStep === 'eridu'">{{ $t("actions.eriduFreeCrew") }}<br>{{ $t("actions.eriduDigPoints") }}</b>
					<label v-else>{{ $t("actions.crewLabel") }} <select v-model="selectedCrew" @change="setIntent('dig')"><option :value="null">{{ $t("actions.automaticCrew") }}</option><option v-for="crew in state.diggers" :key="crew.id" :value="crew.id" :disabled="crew.hasDug">{{ $t("actions.crewOption", { points: crew.capacity, number: crew.id + 1 }) }}{{ crew.hasDug ? " " + $t("actions.crewUsed") : "" }}</option></select></label>
					<p v-if="path.length">{{ path.map(label).join(' → ') }}</p>
					<div v-if="path.length >= 2" class="hint" role="status"><template v-if="digPreview.cost">{{ $t("actions.canalPoints", { canals: digPreview.cost.canals, junctions: digPreview.cost.junctions }) }}</template><span v-if="chosenCrew && !digError"> {{ $t("actions.usesCrew", { points: chosenCrew.capacity, number: chosenCrew.id + 1 }) }}</span><p v-if="digError" class="error"><CurrencyText :text="digError" /></p></div>
					<div v-if="fittingCrews.length > 1" class="buttonRow fittingCrews"><span>{{ $t("actions.otherFittingCrews") }}</span><button v-for="crew in fittingCrews.filter((entry) => entry.id !== chosenCrew?.id)" :key="crew.id" :aria-label="$t('actions.useCrewAria', { points: crew.capacity, number: crew.id + 1 })" @click="useFittingCrew(crew)">{{ $t("actions.useCrew", { points: crew.capacity, number: crew.id + 1 }) }}</button></div>
					<button v-if="path.length >= 2" ref="digButton" class="digAction primaryAction" :disabled="!!digError" @click="submitDig">{{ $t("actions.addCanal") }}<small>{{ path.map(label).join(' → ') }}</small></button>
					<button v-if="path.length" @click="emit('clearPath')">{{ $t("actions.clearCanalDraft") }}</button>
					<button v-if="game.gameflow.developmentStep === 'eridu'" :disabled="ending || store.viewSettings.isSaving" @click="skipEridu">{{ $t("actions.skipEridu") }}</button>
					<button v-else :disabled="!!path.length" @click="finishDigging">{{ $t("actions.doneDigging") }}</button>
				</div>
				<template v-if="game.gameflow.developmentStep !== 'eridu'">
					<div v-if="!rules.hasMaintenanceCrew(game, state.id) && (!canFinishDevelopment || maintenanceSales.length || maintenanceSelection.length)" class="actionGroup crewFunding" :aria-label="$t('actions.requiredCrewFunding')">
						<b>{{ $t("actions.requiredCrew", { capacity: cardData.digger[0] }) }}<br>{{ cardData.digger[1] }} <CurrencyIcon /></b>
						<p><CurrencyText :text="$t('actions.statePays', { amount: Math.min(state.money, cardData.digger[1]), private: maintenanceContribution })" /></p>
						<p v-if="maintenanceSales.length"><CurrencyText :text="$t('actions.privateAfterSales', { amount: maintenanceFundingGame.players[state.king].money })" /></p>
						<p role="status" class="fundingGap"><CurrencyText :text="willRevolt ? $t('actions.crewCannotCover') : maintenanceGap ? $t('actions.needMore', { amount: maintenanceGap }) : maintenanceError ? $t('actions.reviewSales') : $t('actions.crewCovered')" /></p>
						<template v-if="!canFinishDevelopment">
							<button v-if="store.viewSettings.actionIntent !== 'sell' && maintenanceGap" @click="setIntent('sell')">{{ $t("actions.selectFundingLand") }}</button>
							<div v-for="group in maintenanceGroups" :key="group.type" class="fundingTerrain"><b>{{ rf.LAND_NAMES[group.type] }}</b><div class="buttonRow"><button v-for="land in group.lands" :key="land.id" :aria-pressed="maintenanceSelection.includes(land.id)" @click="toggleMaintenanceLand(land.id)">{{ label(land.id) }}<br>+{{ rules.landPrice(maintenanceFundingGame, land) }} <CurrencyIcon /></button></div></div>
							<button v-if="maintenanceSelection.length" class="primaryAction" @click="addMaintenanceBatch"><CurrencyText :text="$t('actions.addSale', { count: maintenanceSelection.length, amount: maintenanceSelectionValue })" /></button>
							<p v-if="maintenanceChoices.length" class="hint">{{ $t("actions.saleHint") }}</p>
							<ol v-if="maintenanceSales.length" :aria-label="$t('actions.crewFundingSalesAria')"><li v-for="(batch, index) in maintenanceSales" :key="index">{{ $t("actions.saleNumber", { number: index + 1 }) }}<button v-for="id in batch" :key="id" :aria-label="$t('actions.removeFromSale', { land: label(id) })" @click="removeSale(maintenanceSales, index, id)">{{ label(id) }} ×</button></li></ol>
							<button v-if="maintenanceSales.length" @click="maintenanceSales = []; maintenanceSelection = []">{{ $t("actions.clearFundingSales") }}</button>
						</template>
						<p v-if="maintenanceError && maintenanceSales.length" class="error"><CurrencyText :text="maintenanceError" /></p>
						<div v-if="maintenancePreview?.game && !willRevolt" class="tradeBalance">{{ $t("actions.afterCrew") }}<b><CurrencyText :text="$t('actions.privateAmount', { amount: maintenancePreview.game.players[state.king].money })" /></b><small><CurrencyText :text="$t('actions.stateTreasuryAmount', { amount: maintenancePreview.game.states[state.id].money })" /></small></div>
						<MarketForecast v-if="maintenanceSales.length && maintenanceSalePreview.game" :before="game" :after="maintenanceSalePreview.game" />
						<StateLeadership v-for="change in maintenanceLeadershipChanges" :key="change.id" :change="change" />
						<p v-if="willRevolt" class="eraChange">{{ $t("actions.revoltWarning") }}</p>
					</div>
					<details v-if="game.era === 3 && assimilationChoices.length" class="actionGroup" :open="activeSection === 'nations'"><summary @click.prevent="chooseSection('nations')">{{ $t("actions.buyNation") }}</summary><form class="nationOffer" @submit.prevent="submit({ type: 'offerNation', nation: nationToBuy, amount: nationPrice })">
						<label>{{ $t("actions.assimilate") }} <select v-model="nationToBuy" required><option :value="null">{{ $t("actions.chooseNation") }}</option><option v-for="nation in assimilationChoices" :key="nation.id" :value="nation.id">{{ rf.NATION_NAMES[nation.id] }}</option></select></label>
						<div v-if="selectedNation" class="nationOfferPreview"><ArtworkCard :src="assets.getNationCardImage(selectedNation.id)" :alt="rf.NATION_NAMES[selectedNation.id]" /><div><b>{{ $t("actions.seller") }} <PlayerMarker v-if="selectedNation.ownerType === 'player'" :index="selectedNation.owner" /><template v-else>{{ rf.STATE_NAMES[selectedNation.owner] }}</template></b><p><CurrencyText :text="$t('actions.allowedOffer', { min: rf.NATION_PRICES[selectedNation.id] / 2, max: rf.NATION_PRICES[selectedNation.id] * 2 })" /></p><label><CurrencyText :text="$t('actions.offerSpl')" /> <input type="number" inputmode="numeric" v-model.number="nationPrice" :min="rf.NATION_PRICES[selectedNation.id] / 2" :max="rf.NATION_PRICES[selectedNation.id] * 2" step="1" required /></label><p v-if="!nationOfferError"><CurrencyText :text="$t('actions.treasuryAfter', { state: rf.STATE_NAMES[state.id], amount: state.money - nationPrice })" /></p><p v-else class="error"><CurrencyText :text="nationOfferError" /></p></div><div v-if="!nationOfferError" class="paymentRow nationPurchaseRecipient"><img :src="nationPurchaseRecipient.src" alt="" /><span><CurrencyText :text="nationPurchaseRecipient.label" /></span><b>{{ nationPurchaseRecipient.before }} → {{ nationPurchaseRecipient.after }} <CurrencyIcon /></b></div><button class="nationPurchaseButton" :disabled="!!nationOfferError">{{ requiresNationConsent ? $t("actions.requestAgreement") : $t("actions.buyNationName", { nation: rf.NATION_NAMES[selectedNation.id] }) }}</button></div>
					</form></details>
					<p v-if="game.gameflow.offerDeclined && state" role="status">{{ $t("actions.agreementDeclined", { area: label(game.gameflow.offerDeclined) }) }}</p>
					<div v-if="showEquipment" class="actionGroup equipmentShop">
						<b>{{ $t("actions.buyEquipment") }}</b>
						<p class="hint">{{ $t("actions.eraSupply", { era: cardEra === 5 ? 'M' : cardEra }) }} - {{ cardEra === 5 ? $t("actions.unlimitedSupply") : $t("actions.cardsLeft", { count: game.cardSupply[cardEra] }) }}</p>
						<div class="equipLegend"><span class="swatch pump"></span><div><span class="shopItemLine"><CurrencyText :text="$t('actions.pump', { price: siteCost.pump[1] })" /> · {{ $t("actions.reach", { reach: siteCost.pump[0] }) }}</span><small>{{ $t("actions.tokensLeft", { tokens: rules.remainingWaterworkTokens(game, state.id, siteCost.pump[0]) }) }}</small></div></div>
						<div class="equipLegend"><span class="swatch reservoir"></span><div><span class="shopItemLine"><CurrencyText :text="$t('actions.reservoir', { price: siteCost.reservoir[1] })" /> · {{ $t("actions.holds", { capacity: siteCost.reservoir[0] }) }}</span><small>{{ $t("actions.tokensLeft", { tokens: rules.remainingWaterworkTokens(game, state.id, siteCost.reservoir[0]) }) }}</small></div></div>
						<label v-if="ownedCalah"><input type="checkbox" v-model="useCalah" /> <CurrencyText :text="$t('actions.useCalah', { income: rf.NATION_INCOMES[rf.NATION_CALAH] })" /></label>
						<p v-if="!store.turnDraft.ready && !equipSites.length" class="hint"><CurrencyText :text="noSiteReason" /></p>
						<div class="crewStepper"><span>{{ $t("actions.crewStepper", { era: cardEra === 5 ? 'M' : cardEra, capacity: cardData.digger[0] }) }}<br>{{ cardData.digger[1] }} <CurrencyIcon /></span><span class="stepper"><button :disabled="!canRemoveCrew" :aria-label="$t('actions.removeCrew')" @click="removeCrew()">−</button><b>{{ crewCount }}</b><button :disabled="!!crewError" :aria-label="$t('actions.addCrew')" @click="addCrew">+</button></span></div>
						<p v-if="crewError" class="hint"><CurrencyText :text="crewError" /></p>
						<button v-if="game.gameflow.developmentStep === 'digging' && unusedCrews.length" @click="diggingDone = false">{{ $t("actions.backToDigging") }}</button>
						<p v-if="cardEra > game.era" class="eraChange">{{ $t("actions.eraStarts", { era: cardEra === 5 ? 'M' : cardEra }) }}<template v-if="cardEra >= 3">{{ $t("actions.eraRetire", { era: cardEra - 2 }) }}</template><template v-if="cardEra === 3">{{ $t("actions.nationsAssimilated") }}</template><template v-if="cardEra === 4">{{ $t("actions.nationsDissolve") }}</template></p>
						<ul v-if="draftGroups.length" class="draftList" :aria-label="$t('actions.yourDraft')"><li v-for="group in draftGroups" :key="group.index"><span><CurrencyText :text="group.label" /></span> <button v-if="!store.turnDraft.ready" :disabled="group.era && (!canRemoveCrew || group.index >= store.turnDraft.steps.length)" @click="group.era ? removeCrew(group.index) : controller.removeDraftStep(group.index)" :aria-label="group.era ? $t('actions.removeCrew') : $t('actions.removeFromDraft')" :title="group.era ? $t('actions.removeCrew') : $t('actions.removeFromDraft')">{{ group.era ? "−" : "×" }}</button></li></ul>
						<p><CurrencyText :text="$t('actions.treasuryCalculation', { before: treasuryBefore, change: treasuryChange, after: treasuryAfter })" /></p>
					</div>
				</template>
			</template>
		</fieldset>
		<fieldset v-else-if="game.gameflow.phase === rf.PHASE_RAINY_SEASON && game.rain.step === 'routing' && frame" :disabled="!personal.canPlay()">
			<legend>{{ $t("actions.routeWater", { area: label(frame.area) }) }}</legend>
			<form @submit.prevent="submit({ type: 'allocateWater', area: waterTarget, amount: chosenWater?.kind === 'irrigate' ? 1 : waterAmount })">
				<div class="waterSupply"><img class="routingWork" :src="assets.getWaterworkImage(sourceWaterwork.state, sourceWaterwork.capacity)" :alt="`${sourceWaterwork.kind} · ${view.waterworkMeasure(sourceWaterwork)}`" :title="`${sourceWaterwork.kind} · ${view.waterworkMeasure(sourceWaterwork)}`" /><span class="waterDrop" aria-hidden="true"></span><span class="waterCount"><b>{{ frame.water }}</b> {{ $t("actions.waterAvailable") }}<small>{{ sourceWaterwork.kind }}<br>{{ view.waterworkMeasure(sourceWaterwork) }}</small></span></div><p v-if="!store.turnDraft.ready">{{ $t("actions.chooseBlueHex") }}</p><p v-if="!store.turnDraft.ready">{{ $t("actions.pumpsIrrigate") }}</p>
				<div class="buttonRow">
					<label>{{ $t("actions.destination") }} <select v-model="waterTarget" @change="emit('selectArea', waterTarget)" required><option :value="null">{{ $t("actions.clickMapOrChoose") }}</option><option v-for="(choice, index) in waterOptions" :key="choice.area" :value="choice.area">{{ index + 1 }}. {{ label(choice.area) }} · {{ choice.kind === 'pump' ? $t("actions.sendToPump") : $t("actions.irrigate") }}</option></select></label>
					<div v-if="targetWaterwork" class="offeredWork"><img :src="assets.getWaterworkImage(targetWaterwork.state, targetWaterwork.capacity)" :alt="$t('actions.destinationPump')" /><span>{{ $t("actions.pumpOf", { state: rf.STATE_NAMES[targetWaterwork.state] }) }}<br>{{ view.waterworkMeasure(targetWaterwork) }}</span></div>
				</div>
				<div v-if="irrigationLand" class="offeredWork irrigationPreview"><img :src="assets.getTerrainImage(irrigationLand.landType, irrigationLand.isCity)" :alt="`${rf.LAND_NAMES[irrigationLand.landType]}${irrigationLand.isCity ? ' ' + $t('common.city') : ''}`" /><img :src="assets.getPlayerMarkerImage(irrigationLand.owner)" :alt="game.players[irrigationLand.owner].displayName" /><span><small><CurrencyText :text="$t('actions.privateIncome', { amount: irrigationIncome })" /></small><small><CurrencyText :text="$t('actions.stateHarvest', { state: rf.STATE_NAMES[irrigationState], before: rules.harvestAmount(game, irrigationState), after: rules.harvestAmount(game, irrigationState) + irrigationYield })" /></small></span></div>
				<div class="buttonRow routingControls"><label v-if="chosenWater?.kind === 'pump'">{{ $t("actions.water") }} (max {{ frame.water }}) <input type="number" inputmode="numeric" v-model.number="waterAmount" min="1" :max="frame.water" step="1" required /></label><button class="primaryAction" :disabled="!chosenWater">{{ !chosenWater ? $t("actions.chooseDestination") : chosenWater.kind === 'pump' ? $t("actions.sendWater") : $t("actions.irrigateOne") }}<small v-if="chosenWater"><template v-if="chosenWater.kind === 'pump'">{{ waterAmount }} → </template>{{ label(chosenWater.area) }}<template v-if="chosenWater.kind === 'irrigate'"><br><CurrencyText :text="$t('actions.irrigationYield', { amount: irrigationYield })" /></template></small></button></div>
			</form>
		</fieldset>
		<fieldset v-else-if="game.gameflow.phase === rf.PHASE_RAINY_SEASON && game.rain.step === 'harvest'" :disabled="!personal.canPlay()">
			<legend><CurrencyText :text="$t('actions.harvestLegend', { state: rf.STATE_NAMES[state.id], amount: rules.harvestAmount(game, state.id) })" /></legend>
			<div class="harvestChoice">
				<b>{{ $t("actions.distribute") }}</b>
				<div class="paymentRow" v-for="payment in harvestPayments" :key="payment.index"><PlayerMarker :index="payment.index" /><span><small><CurrencyText :text="$t('actions.cashBeforeAfter', { before: game.players[payment.index].money, after: game.players[payment.index].money + payment.amount })" /></small></span><b>+{{ payment.amount }} <CurrencyIcon /></b></div>
				<div v-if="harvest.retained > 0" class="paymentRow"><img :src="assets.getStateOrderImage(state.id)" alt="" /><span>{{ $t("actions.stateRetains") }}<small><CurrencyText :text="$t('actions.cashBeforeAfter', { before: state.money, after: state.money + harvest.retained })" /></small></span><b>{{ harvest.retained }} <CurrencyIcon /></b></div>
				<button :disabled="ending || store.viewSettings.isSaving" @click="confirmHarvest('distribute')">{{ $t("actions.distributeEnd") }}</button>
			</div>
			<div v-if="!state.hasRevolted" class="harvestChoice">
				<b>{{ $t("actions.store") }}</b><div class="paymentRow"><img :src="assets.getStateOrderImage(state.id)" alt="" /><span>{{ rf.STATE_NAMES[state.id] }}<small><CurrencyText :text="$t('actions.cashBeforeAfter', { before: state.money, after: state.money + rules.harvestAmount(game, state.id) })" /></small></span><b>+{{ rules.harvestAmount(game, state.id) }} <CurrencyIcon /></b></div>
				<label v-if="rules.harvestAmount(game, state.id) > 0 && removable.length" class="removeWork"><span>{{ $t("actions.removeSmallest") }}</span><span class="removalControl"><select v-model="removeWaterwork" @change="emit('selectArea', removeWaterwork)"><option v-for="id in removable" :key="id" :value="id">{{ label(id) }} · {{ game.board.areas.find((area) => area.id === id).waterwork.kind }} {{ game.board.areas.find((area) => area.id === id).waterwork.capacity }}</option></select><img v-if="removeWaterwork" class="piece" :src="assets.getWaterworkImage(state.id, game.board.areas.find((area) => area.id === removeWaterwork).waterwork.capacity)" :alt="$t('actions.waterworkToRemove')" /></span></label>
				<button :disabled="ending || store.viewSettings.isSaving" @click="confirmHarvest('store')">{{ $t("actions.storeEnd") }}</button>
			</div>
		</fieldset>
		<div v-if="store.turnDraft.ready && (game.gameflow.phase !== rf.PHASE_DEVELOPMENT || (!showDigging && !showEquipment))" class="turnSummary" role="status"><p v-for="(step, index) in store.turnDraft.steps" :key="index"><CurrencyText :text="step.label" /></p></div>
		<div v-if="canExchangeBarahshum || (store.turnDraft.ready && store.turnDraft.steps.at(-1).action.type === 'exchangeBarahshum')" class="actionGroup">
			<b><PlayerMarker v-if="game.nations[rf.NATION_BARAHSHUM].ownerType === 'player'" :index="game.nations[rf.NATION_BARAHSHUM].owner" /><template v-else>{{ rf.STATE_NAMES[game.nations[rf.NATION_BARAHSHUM].owner] }}</template> {{ $t("actions.barahshum") }}</b>
			<p><CurrencyText :text="$t('actions.barahshumHint', { income: rf.NATION_INCOMES[rf.NATION_BARAHSHUM] })" /></p>
			<button v-if="store.viewSettings.actionIntent !== 'barahshum'" :disabled="store.turnDraft.ready" @click="setIntent('barahshum')">{{ $t("actions.chooseCanalSite") }}</button>
			<template v-else><button @click="setIntent(game.gameflow.phase === rf.PHASE_DEVELOPMENT ? (showDigging ? 'dig' : 'equip') : '')">{{ $t("actions.cancelCanal") }}</button><p v-if="barahshumError" class="hint"><CurrencyText :text="barahshumError" /></p><button v-else :disabled="store.turnDraft.ready" @click="submit({ type: 'exchangeBarahshum', from: barahshum.id, to: area.id })">{{ $t("actions.dissolveDig", { area: label(area.id) }) }}</button></template>
		</div>
	</section>
</template>

<style scoped>
.equipLegend { display: flex; align-items: center; gap: 8px; margin: 4px 0; }.swatch { width: 18px; height: 18px; border-radius: 3px; border: 3px solid #007cac; box-sizing: border-box; flex-shrink: 0; }.swatch.reservoir { border-color: #a34720; }.draftList { list-style: none; margin: 6px 0; padding: 0; }.draftList li { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 4px 0; }.draftList button { min-height: 28px; padding: 0 9px; margin: 0; flex-shrink: 0; }.crewStepper { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 8px 0; }.stepper { display: flex; align-items: center; gap: 10px; }.stepper button { min-width: 36px; margin: 0; }.equipmentChoices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }.equipmentChoices button { text-align: left; min-height: 65px; margin: 0; padding: 8px; }.equipmentChoices small { display: block; margin-top: 5px; }.equipmentChoices [aria-pressed=true], .fundingTerrain [aria-pressed=true] { background: #e3eddb; border: 2px solid #547751; }.equipmentPreview { padding: 8px; margin-top: 8px; border: 1px solid #c4b894; border-radius: 4px; }.equipmentReference { margin-top: 8px; }.equipmentReference :deep(img) { max-width: 100%; }.fundingGap { font-weight: bold; }.fundingTerrain { margin: 8px 0; }.crewFunding ol { padding-left: 20px; }

.gameActions { width: 100%; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; margin: 8px 0; text-align: left; font-size: 16px; font-weight: 400; }
fieldset.plain { border: 0; padding: 0; }fieldset { border: 1px solid #c4b894; border-radius: 4px; padding: 8px; margin: 0; min-width: 0; }legend { max-width: 100%; overflow-wrap: anywhere; box-sizing: border-box; font-weight: bold; font-size: 15px; }p { margin: 6px 0; }.buttonRow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 6px 0; }button, input, select { font: inherit; }button { cursor: pointer; margin: 2px; padding: 4px 7px; }button:disabled { cursor: default; }input[type=number] { width: 70px; }label { margin: 3px; }summary { cursor: pointer; font-weight: bold; padding: 5px 0; }
.actionGroup { margin: 8px 0; padding: 7px 0; border-top: 1px solid #c4b894; }.saleGroup { margin: 5px 0; }.error { color: #a40000; font-weight: bold; }.hint { color: #655a42; margin: 4px 0; }.piece { width: 24px; height: 24px; object-fit: contain; vertical-align: middle; margin-right: 5px; }
.cardSupply { display: block; margin-top: 4px; color: #655a42; }.eraChange { padding: 6px; background: #f7edc7; border-left: 3px solid #aa9b77; }
.settlementBox, .bidBox { border: 1px solid #c4b894; border-radius: 4px; padding: 8px; }.orLabel { text-align: center; margin: 6px 0; }.bidBox { margin: 6px 0; }.bidBox label { display: block; text-align: center; }
.equipmentCard { float: right; width: 230px; max-width: 42%; height: auto; margin: 0 0 8px 14px; border: 1px solid #aa9b77; border-radius: 4px; }.equipmentShop { display: flow-root; }
.selectedLand { display: flex; align-items: center; gap: 8px; background: #eee4c9; border-radius: 4px; padding: 7px; margin: 7px 0; }.selectedLand img { width: 35px; height: 35px; }.selectedLand small { display: block; margin-top: 3px; color: #655a42; }
.selectedLand > span { min-width: 0; overflow-wrap: anywhere; }.selectedLand .selectedOwner { display: flex; align-items: center; gap: 4px; }.selectedLand .selectedOwner img { width: 20px; height: 20px; }
.queuedPurchase { padding: 6px; border-left: 3px solid #527349; background: #edf5e4; }.tradeBalance { padding: 7px; border-top: 1px solid #c4b894; display: flex; flex-wrap: wrap; gap: 5px; }.tradeBalance b { margin-left: auto; }.tradeBalance small { width: 100%; text-align: right; color: #655a42; }
.exchangeIncome { display: block; margin-top: 3px; font-size: 16px; font-weight: 400; }.queuedPurchase label { display: flex; align-items: center; gap: 7px; min-height: 40px; margin: 3px 0 0; cursor: pointer; }.queuedPurchase input[type=checkbox] { width: 18px; height: 18px; flex-shrink: 0; margin: 0; }
.harvestChoice { margin-top: 8px; padding: 8px; background: #f7f0dd; border: 1px solid #c4b894; border-radius: 4px; }.paymentRow { display: flex; align-items: center; gap: 7px; margin: 6px 0; }.paymentRow span { min-width: 0; overflow-wrap: anywhere; }.paymentRow img { width: 25px; height: 25px; }.paymentRow b { margin-left: auto; }.removeWork { display: block; margin: 8px 0; font-size: 16px; font-weight: 400; }.removalControl { display: flex; align-items: center; gap: 8px; margin-top: 5px; }.removeWork select { flex: 1; min-width: 0; margin: 0; }.removalControl .piece { flex-shrink: 0; margin: 0; }
.waterSupply { display: flex; align-items: center; gap: 7px; margin: 8px 0; }.waterSupply b { font-size: 24px; }.waterDrop { width: 18px; height: 24px; background: #35c3e6; border: 1px solid #1685b4; border-radius: 65% 35% 55% 45%; transform: rotate(35deg); }
.routingWork { width: 38px; height: 38px; object-fit: contain; }
.waterCount { min-width: 0; flex: 1; }.waterCount small { display: block; margin-top: 3px; font-size: 16px; font-weight: 400; color: #655a42; }.waterSupply > img, .waterDrop { flex-shrink: 0; }
.harvestChoice .paymentRow { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: start; }.harvestChoice .paymentRow b { margin-left: 0; }
.harvestChoice .paymentRow small { display: block; margin-top: 2px; font-size: 16px; font-weight: 400; color: #655a42; }.harvestChoice .paymentRow b { flex-shrink: 0; white-space: nowrap; }
.harvestControls, .routingControls, .developmentControls, .tradeControls { align-items: stretch; }.harvestControls button, .routingControls button, .developmentControls button, .tradeControls button { flex: 1; min-width: 0; margin: 0; }.harvestControls small, .tradeControls small { display: block; margin-top: 3px; font-size: 16px; font-weight: 400; }
/* No sticky bottom: a pinned bar makes the panel above it slide behind, which reads as an inner scroll. */
.maintenanceControls, .tradeControls, .consentControls, .harvestControls, .routingControls, .developmentControls { background: #fff9e9; padding: 7px 0 12px; border-top: 1px solid #c4b894; }
.developmentControls > small { flex-basis: 100%; font-size: 16px; font-weight: 400; color: #655a42; }
.routingControls small { font-size: 16px; font-weight: 400; font-weight: normal; }
.digAction { max-width: 100%; box-sizing: border-box; }.digAction small { display: block; margin-top: 3px; font-size: 16px; font-weight: 400; font-weight: normal; }
.routingControls label { display: flex; flex-direction: column; gap: 2px; margin: 0; font-size: 16px; font-weight: 400; white-space: nowrap; }.routingControls input { box-sizing: border-box; }
.irrigationPreview small, .workMeasure { display: block; margin-top: 3px; font-size: 16px; font-weight: 400; color: #655a42; }
.consentIncome b, .crewContribution b { flex-shrink: 0; white-space: nowrap; }.crewContribution small { display: block; margin-top: 3px; font-size: 16px; font-weight: 400; }
.endNotice { margin-bottom: 8px; padding: 7px 8px; background: #f6e3cf; border-left: 3px solid #a75a24; color: #663716; font-size: 16px; font-weight: 400; }
.finalStandings { padding-left: 24px; }.finalStandings li { overflow-wrap: anywhere; padding: 7px 0; }.finalStandings img { width: 28px; height: 28px; vertical-align: middle; margin-right: 6px; }.finalStandings b { float: right; margin: 6px 0 0 5px; }
.offerHeading, .offeredWork { display: flex; align-items: center; gap: 8px; margin: 8px 0; }.offerHeading img, .offeredWork img { width: 38px; height: 38px; }.offerHeading { padding-bottom: 8px; border-bottom: 1px solid #c4b894; font-size: 15px; }
.nationOfferPreview { display: grid; grid-template-columns: minmax(0, 42%) minmax(0, 1fr); align-items: start; gap: 10px; margin-top: 8px; }.nationOfferPreview > :first-child { width: 100%; }.nationPurchaseRecipient, .nationPurchaseButton { grid-column: 1 / -1; }.nationPurchaseRecipient { margin: 0; }.nationOfferPreview > div { min-width: 0; overflow-wrap: anywhere; }.nationOffer select { max-width: 100%; }
.turnPlan { margin: 4px 0 8px; padding-left: 22px; }.turnPlan li { margin: 5px 0; }.turnPlan li .planButtons { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }.turnPlan li button { min-height: 30px; padding: 0 9px; }
.developmentActions > .actionGroup:first-child { border-top: 0; margin-top: 0; padding-top: 0; }
.crewFunding, .equipmentShop { text-align: center; }
.crewFunding > b { display: block; text-wrap: balance; }
.queuedCrew { margin: 0; color: #24532c; }
.equipLegend { justify-content: center; }
.shopItemLine { white-space: nowrap; }
.equipLegend small { display: block; color: #655a42; }
.crewStepper { flex-direction: column; padding: 10px 0; border-block: 1px solid #c4b894; }
.crewStepper > span:first-child { white-space: pre-line; text-wrap: balance; }
.draftList li > span { white-space: pre-line; flex: 1; text-align: center; text-wrap: balance; }
</style>
