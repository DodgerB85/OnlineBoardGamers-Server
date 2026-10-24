<script setup>
import { computed, ref } from "vue"
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import * as controller from "../js/DDLcontroller.js"
import * as IO from "../backend/DDL_IO.js"
import * as funcs from "../js/DDLfuncs.js"
import * as view from "../js/DDLview.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

const randomGood = ref(-1)
const siteGearSlot = ref(-1)
const gearSlot = ref(-1)
const gearRandomGood = ref(-1)
const pathwayIn = ref(-1)
const pathwayOut = ref(-1)
const tradeTarget = ref(-1)

const myIndex = computed(() => {
	if (personal.trainingGame) return store.gameflow.turnOrder[0]
	return personal.pov
})
const me = computed(() => (myIndex.value >= 0 ? store.players[myIndex.value] : null))
const currentIndex = computed(() => store.gameflow.turnOrder[0])
const current = computed(() => (currentIndex.value >= 0 ? store.players[currentIndex.value] : null))
const isMyTurn = computed(() => personal.canPlay() && currentIndex.value === myIndex.value)
const planet = computed(() => (me.value ? rules.playerPlanet(store, myIndex.value) : null))
const planetState = computed(() => (planet.value ? rules.planetState(store, planet.value.id) : null))
const incomingTrades = computed(() => store.board.trades.filter((t) => t.status === "pending" && t.to === myIndex.value))
const outgoingTrades = computed(() => store.board.trades.filter((t) => t.status === "pending" && t.from === myIndex.value))
const otherPlayersHere = computed(() => {
	if (!me.value || !me.value.ship.node) return []
	return store.players
		.map((p, idx) => ({ p, idx }))
		.filter((entry) => entry.idx !== myIndex.value && entry.p.ship.node === me.value.ship.node && rf.planetByNode(entry.p.ship.node))
})

const myGoods = computed(() => (me.value ? me.value.goods : []))
const goodChoices = computed(() => {
	const counts = {}
	for (const good of myGoods.value) counts[good] = (counts[good] || 0) + 1
	return rf.GOODS.filter((g) => counts[g.id] > 0).map((g) => ({ ...g, count: counts[g.id] }))
})

const site = computed(() => (planetState.value ? planetState.value.site : null))
const siteCost = computed(() => (planet.value ? rules.siteCost(store, planet.value.id) : null))
const spaceyardType = computed(() => {
	if (!site.value || site.value.kind !== "spaceyard") return null
	return rf.SPACEYARD_TYPES[site.value.tileId]
})
const firstEmptyGearSlot = computed(() => (me.value ? rules.firstEmptyGearSlot(me.value) : -1))
const siteGearSlotNeeded = computed(() => !!site.value && site.value.kind === "spaceyard" && !site.value.built && firstEmptyGearSlot.value < 0)
const validGearSlots = computed(() => {
	if (!me.value) return []
	if (firstEmptyGearSlot.value >= 0) return [{ slot: rf.SHIP_SLOTS[firstEmptyGearSlot.value], index: firstEmptyGearSlot.value }]
	return rf.SHIP_SLOTS.map((slot, index) => ({ slot, index }))
})
const validSiteGearSlots = computed(() => {
	if (!me.value) return []
	return rf.SHIP_SLOTS.map((slot, index) => ({ slot, index })).filter((entry) => me.value.gear[entry.index])
})
const consumerTile = computed(() => {
	if (!site.value || site.value.kind !== "consumer") return null
	return rf.CONSUMER_TILES.find((t) => t.id === site.value.tileId)
})
const factoryRecipe = computed(() => {
	if (!planetState.value || !planetState.value.factory) return null
	return rf.FACTORIES_BY_ID[planetState.value.factory.typeId]
})
const buildableFactories = computed(() => {
	if (!planetState.value || planetState.value.factory || (planet.value && planet.value.start)) return []
	return store.board.factoryStock
		.filter((f) => f.count > 0)
		.map((stock) => {
			const factory = rf.FACTORIES_BY_ID[stock.id]
			return {
				...factory,
				count: stock.count,
				affordable: me.value && rules.hasGoods(me.value, factory.input) && me.value.energy[rf.YELLOW_ENERGY] > 0,
			}
		})
})
const canClaim = (kind) => {
	if (!planetState.value) return false
	if (kind === "site" && !planetState.value.site) return false
	if (kind === "factory" && !planetState.value.factory) return false
	return planetState.value.privileges[kind] === -1 && me.value && me.value.privileges > 0 && me.value.energy[rf.YELLOW_ENERGY] >= 3
}
const pathwayPlanets = computed(() => rf.PLANETS)
const canPlacePathways = computed(() => me.value && !me.value.pathways.placed && store.gameflow.turnType === rf.TURN_ACTION && pathwayIn.value >= 0 && pathwayOut.value >= 0 && pathwayIn.value !== pathwayOut.value)
const hasIncoming = computed(() => incomingTrades.value.length > 0)
const currentPlanetShips = computed(() => {
	if (!planet.value) return []
	return store.players.filter((p) => p.ship.node === "P" + planet.value.id)
})

function collect(colour) {
	controller.collectEnergy(colour)
}
function gainText(colour) {
	const gains = rules.energyGain(me.value, colour)
	return gains.map((n, i) => (n ? n + " " + view.energyLabel(i).charAt(0) : "")).filter(Boolean).join(" ")
}
function takeAction() {
	controller.chooseAction()
}
function startMove() {
	controller.startMovement()
}
function stopMove() {
	rules.stopMovement(store)
	store.context.action = rf.ACT_NONE
}
function openHighways(costEnergy) {
	store.context.action = rf.ACT_PLACE_HIGHWAYS
	store.context.highwayCostsEnergy = costEnergy
}
function openMove() {
	store.context.action = rf.ACT_MOVE
	controller.startMovement()
}
function openBuild() {
	store.context.action = rf.ACT_BUILD
}
function openTrade() {
	store.context.action = rf.ACT_TRADE
}
function openPathways() {
	store.context.action = rf.ACT_PATHWAY
}
async function buildSiteNow() {
	if (!siteCost.value) return
	const chosen = siteCost.value.random
		? randomGood.value >= 0
			? randomGood.value
			: goodChoices.value.find((g) => g.id !== siteCost.value.printed)?.id
		: -1
	if (siteCost.value.random && (chosen === undefined || chosen < 0)) return
	if (siteGearSlotNeeded.value && siteGearSlot.value < 0) return
	if (await controller.buildSite(chosen, siteGearSlotNeeded.value ? siteGearSlot.value : -1)) {
		randomGood.value = -1
		siteGearSlot.value = -1
	}
}
async function buyGearNow() {
	if (gearSlot.value < 0) return
	const chosen = gearRandomGood.value >= 0 ? gearRandomGood.value : goodChoices.value.find((g) => g.id !== spaceyardType.value.cost[0])?.id
	if (chosen === undefined || chosen < 0) return
	if (await controller.buyGear(gearSlot.value, chosen)) {
		gearSlot.value = -1
		gearRandomGood.value = -1
	}
}
function placePathwaysNow() {
	controller.placePathways(pathwayIn.value, pathwayOut.value)
}
function propose() {
	if (tradeTarget.value < 0) return
	const give = store.context.selectedGive
	const receive = store.context.selectedReceive
	controller.proposeTrade(tradeTarget.value, give, receive)
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
function goodsOf(player) {
	const counts = {}
	for (const good of player.goods) counts[good] = (counts[good] || 0) + 1
	return rf.GOODS.filter((g) => counts[g.id] > 0).map((g) => ({ ...g, count: counts[g.id] }))
}
function skipMissing() {
	controller.skipMissingPlayerTurn()
}
function respond(tradeId, accept) {
	controller.respondTrade(tradeId, accept)
}
function isPendingExplore() {
	return store.gameflow.pendingExplore && store.gameflow.pendingExplore.player === myIndex.value
}
function openTradeModal() {
	store.viewSettings.showTrade = true
}
</script>

<template>
	<div id="actionPanel">
		<div class="actionTitle">{{ $t("action.title") }}</div>
		<div v-if="store.gameMessages.errorText" class="errorText">{{ store.gameMessages.errorText }}</div>
		<div v-if="store.gameMessages.actionError" class="errorText">{{ store.gameMessages.actionError }}</div>
		<div v-if="store.gameMessages.successText" class="successText">{{ store.gameMessages.successText }}</div>

		<div v-if="store.gameflow.phase === rf.PHASE_GAME_OVER" class="gameOverBox">
			<h2>{{ $t("action.gameOver") }}</h2>
			<div v-for="(group, i) in store.gameflow.finalPositions" :key="i" class="finalGroup">
				<b>{{ i === 0 ? $t("action.winner") : view.placeLabel(i + 1) }}:</b>
				<span v-for="idx in group" :key="idx" class="finalPlayer">{{ store.players[idx].displayName }} ({{ rules.finalScore(store.players[idx]) }})</span>
			</div>
		</div>

		<template v-else>
			<div class="turnLine">
				<span v-if="store.gameflow.phase === rf.PHASE_SETUP">{{ $t("phase.setup") }}: <b>{{ current ? current.displayName : "?" }}</b></span>
				<span v-else>{{ $t("action.actionTurnLabel", { turn: store.gameflow.turn }) }} Â· {{ $t("action.current") }} <b>{{ current ? current.displayName : "?" }}</b></span>
			</div>

			<div v-if="store.gameflow.phase === rf.PHASE_SETUP" class="waitBox">
				<p v-if="store.gameflow.setup.auction && !store.gameflow.setup.auctionResolved">{{ $t("action.auctionInProgress") }}</p>
				<p v-else-if="store.gameflow.setup.stage === rf.TURN_SETUP_GEAR">{{ $t("action.placingGear") }}</p>
				<p v-else>{{ $t("action.choosingPlanet") }}</p>
			</div>

			<template v-else-if="isMyTurn">
				<template v-if="store.gameflow.turnType === rf.TURN_CHOOSE">
					<p class="hint">{{ $t("action.collectHint") }}</p>
					<div class="buttonGrid">
						<button v-for="c in 3" :key="c" class="actionsLineButton energyButton" :style="{ backgroundColor: rf.ENERGY_HEX[c - 1], color: '#fff' }" @click="collect(c - 1)">
							{{ $t("energy.collect", { colour: view.energyLabel(c - 1) }) }}<br />
							<small>{{ gainText(c - 1) }}</small>
						</button>
					</div>
					<button class="actionsLineButton bigAction" @click="takeAction">{{ $t("action.takeAction") }}</button>
				</template>

				<template v-else-if="store.gameflow.turnType === rf.TURN_ACTION">
					<div class="actionInfo">
						{{ $t("action.actionInfo", { turn: store.gameflow.turn, highways: store.gameflow.freeHighwaysLeft, movement: store.gameflow.movement.remaining }) }}
					</div>
					<div class="buttonGrid">
						<button class="actionsLineButton" :disabled="store.gameflow.freeHighwaysLeft <= 0" @click="openHighways(false)">{{ $t("action.placeFreeHighway", { count: store.gameflow.freeHighwaysLeft }) }}</button>
						<button class="actionsLineButton" :disabled="me.energy[rf.YELLOW_ENERGY] <= 0" @click="openHighways(true)">{{ $t("action.buildHighway") }}</button>
						<button class="actionsLineButton" :disabled="store.gameflow.movement.remaining > 0 ? false : me.energy[rf.RED_ENERGY] + me.virtual[rf.RED_ENERGY] <= 0" @click="openMove">{{ $t("action.move") }}</button>
						<button class="actionsLineButton" @click="openBuild">{{ $t("action.build") }}</button>
						<button class="actionsLineButton" @click="openTrade">{{ $t("action.trade") }}</button>
						<button class="actionsLineButton" @click="openPathways">{{ $t("action.pathways") }}</button>
						<button class="actionsLineButton endTurnButton" @click="controller.endActionTurn">{{ $t("action.endTurn") }}</button>
					</div>

					<div v-if="store.context.action === rf.ACT_PLACE_HIGHWAYS" class="subPanel">
						<b>{{ $t("action.placeHighway") }}</b> {{ $t("action.placeHighwayHint") }}
						<button class="actionsLineButton" @click="store.context.action = rf.ACT_NONE">{{ $t("action.finishPlacing") }}</button>
					</div>

					<div v-if="store.context.action === rf.ACT_MOVE" class="subPanel">
						<b>{{ $t("action.moving") }}</b> {{ $t("action.movingHint", { steps: store.gameflow.movement.remaining }) }}
						<button class="actionsLineButton" @click="stopMove">{{ $t("action.stopMoving") }}</button>
					</div>

					<div v-if="store.context.action === rf.ACT_BUILD" class="subPanel">
						<div v-if="!planet" class="hint">{{ $t("action.mustBeOnPlanetToBuild") }}</div>
						<template v-else>
							<div class="planetHeader">{{ planet.name }}</div>
							<div class="subSection">
								<b>{{ $t("action.factorySlot") }}</b>
								<div v-if="planetState.factory" class="smallNote">{{ $t("action.factoryLine", { factory: rf.factoryName(planetState.factory.typeId) }) }}</div>
								<div v-else class="factoryList">
									<div v-for="factory in buildableFactories" :key="factory.id" class="factoryOption">
										<span>{{ $t("action.factoryOption", { factory: rf.factoryName(factory.id), points: factory.points, count: factory.count }) }}</span>
										<button class="actionsLineButton" :disabled="!factory.affordable" @click="controller.buildFactory(factory.id)">{{ $t("action.build") }}</button>
									</div>
									<div v-if="buildableFactories.length === 0" class="smallNote">{{ $t("action.noFactories") }}</div>
								</div>
							</div>
							<div class="subSection">
								<b>{{ $t("action.siteSlot") }}</b>
								<div v-if="!site" class="smallNote">{{ $t("action.emptyExploreFirst") }}</div>
								<div v-else-if="site.built" class="smallNote">{{ $t("action.alreadyBuilt", { kind: site.kind === "spaceyard" ? $t("action.spaceyard") : $t("action.consumerSite") }) }}</div>
								<div v-else>
									<div v-if="siteCost.random">{{ $t("action.buildSiteLine", { kind: $t("action.spaceyard"), good: rf.goodName(siteCost.printed) }) }}</div>
									<div v-else>{{ $t("action.buildConsumerLine", { good: rf.goodName(siteCost.printed) }) }}</div>
									<select v-if="siteCost.random" v-model.number="randomGood">
										<option :value="-1">{{ $t("common.chooseSecondGood") }}</option>
										<option v-for="g in goodChoices" :key="g.id" :value="g.id" :disabled="g.id === siteCost.printed">{{ $t("common.goodCount", { good: rf.goodName(g.id), count: g.count }) }}</option>
									</select>
									<div v-if="site.kind === 'spaceyard'" class="smallNote">{{ $t("action.spaceyardReward", { gear: rf.gearName(spaceyardType.gear) }) }}</div>
									<select v-if="siteGearSlotNeeded" v-model.number="siteGearSlot">
										<option :value="-1">{{ $t("common.chooseSlot") }}</option>
										<option v-for="entry in validSiteGearSlots" :key="entry.index" :value="entry.index">{{ $t("action.slotOption", { number: entry.index + 1, gear: view.gearLabel(me.gear[entry.index]) }) }}</option>
									</select>
									<button class="actionsLineButton" :disabled="me.energy[rf.YELLOW_ENERGY] <= 0 || (siteGearSlotNeeded && siteGearSlot < 0)" @click="buildSiteNow">{{ $t("action.buildSite") }}</button>
								</div>
							</div>
							<div class="subSection">
								<b>{{ $t("action.privileges") }}</b>
								<div class="buttonGrid">
									<button class="actionsLineButton" :disabled="!canClaim('mine')" @click="controller.claimPrivilege('mine')">{{ $t("action.claimMine") }}</button>
									<button class="actionsLineButton" :disabled="!canClaim('site')" @click="controller.claimPrivilege('site')">{{ $t("action.claimSite") }}</button>
									<button class="actionsLineButton" :disabled="!canClaim('factory')" @click="controller.claimPrivilege('factory')">{{ $t("action.claimFactory") }}</button>
								</div>
							</div>
						</template>
					</div>

					<div v-if="store.context.action === rf.ACT_TRADE" class="subPanel">
						<div v-if="!planet" class="hint">{{ $t("action.mustBeOnPlanetToTrade") }}</div>
						<template v-else>
							<div class="planetHeader">{{ planet.name }} â€” {{ currentPlanetShips.map((p) => p.displayName).join(", ") }}</div>
							<div class="subSection">
								<b>{{ $t("action.mine") }}</b>
								<div>{{ $t("action.produces", { good: rf.goodName(planetState.mine) }) }}</div>
								<button class="actionsLineButton" :disabled="me.energy[rf.BLUE_ENERGY] + me.virtual[rf.BLUE_ENERGY] <= 0 && !me.freeTradeTiles.includes(planet.id + ':mine')" @click="controller.tradeMine">{{ $t("action.takeGood", { good: rf.goodName(planetState.mine) }) }}</button>
							</div>
							<div v-if="factoryRecipe" class="subSection">
								<b>{{ $t("action.factory") }}</b>
								<div>{{ rf.factoryName(factoryRecipe.id) }}</div>
								<button class="actionsLineButton" :disabled="me.energy[rf.BLUE_ENERGY] + me.virtual[rf.BLUE_ENERGY] <= 0" @click="controller.tradeFactory">{{ $t("action.produceGood", { good: rf.goodName(factoryRecipe.output) }) }}</button>
							</div>
							<div v-if="site && site.built && site.kind === 'consumer'" class="subSection">
								<b>{{ $t("action.consumer") }}</b>
								<div>{{ $t("action.wants", { good: rf.goodName(consumerTile.good), points: consumerTile.points }) }}</div>
								<button class="actionsLineButton" :disabled="me.energy[rf.BLUE_ENERGY] + me.virtual[rf.BLUE_ENERGY] <= 0" @click="controller.tradeConsumer">{{ $t("action.sellGood", { good: rf.goodName(consumerTile.good) }) }}</button>
							</div>
							<div v-if="site && site.built && site.kind === 'spaceyard'" class="subSection">
								<b>{{ $t("action.spaceyardSection") }}</b>
								<div>{{ $t("action.buildsGear", { gear: rf.gearName(spaceyardType.gear), good: rf.goodName(spaceyardType.cost[0]) }) }}</div>
								<select v-model.number="gearSlot">
									<option :value="-1">{{ $t("common.chooseSlot") }}</option>
									<option v-for="entry in validGearSlots" :key="entry.index" :value="entry.index">{{ $t("action.slotOption", { number: entry.index + 1, gear: me.gear[entry.index] ? view.gearLabel(me.gear[entry.index]) : $t("action.emptySlotSpeed", { number: entry.slot.number }) }) }}</option>
								</select>
								<select v-model.number="gearRandomGood">
									<option :value="-1">{{ $t("common.chooseSecondGood") }}</option>
									<option v-for="g in goodChoices" :key="g.id" :value="g.id" :disabled="g.id === spaceyardType.cost[0]">{{ $t("common.goodCount", { good: rf.goodName(g.id), count: g.count }) }}</option>
								</select>
								<button class="actionsLineButton" :disabled="gearSlot < 0 || me.energy[rf.BLUE_ENERGY] + me.virtual[rf.BLUE_ENERGY] <= 0" @click="buyGearNow">{{ $t("action.buyGear") }}</button>
							</div>
							<div class="subSection">
								<b>{{ $t("action.tradeWithPlayers") }}</b>
								<div v-if="otherPlayersHere.length === 0" class="smallNote">{{ $t("action.noOtherPlayer") }}</div>
								<div v-else>
									<select v-model.number="tradeTarget">
										<option :value="-1">{{ $t("common.choosePlayer") }}</option>
										<option v-for="entry in otherPlayersHere" :key="entry.idx" :value="entry.idx">{{ entry.p.displayName }}</option>
									</select>
									<button class="actionsLineButton" :disabled="tradeTarget < 0" @click="openTradeModal">{{ $t("action.proposeTrade") }}</button>
								</div>
							</div>
						</template>
					</div>

					<div v-if="store.context.action === rf.ACT_PATHWAY" class="subPanel">
						<div v-if="me.pathways.placed" class="smallNote">{{ $t("action.pathwaysAlready") }}</div>
						<template v-else>
							<div>{{ $t("action.pathwaysHint") }}</div>
							<select v-model.number="pathwayIn">
								<option :value="-1">{{ $t("action.entrancePlanet") }}</option>
								<option v-for="p in pathwayPlanets" :key="p.id" :value="p.id">{{ p.name }}</option>
							</select>
							<select v-model.number="pathwayOut">
								<option :value="-1">{{ $t("action.exitPlanet") }}</option>
								<option v-for="p in pathwayPlanets" :key="p.id" :value="p.id">{{ p.name }}</option>
							</select>
							<button class="actionsLineButton" :disabled="!canPlacePathways" @click="placePathwaysNow">{{ $t("action.placePathways") }}</button>
						</template>
					</div>

					<div class="subSection offers" v-if="incomingTrades.length || outgoingTrades.length">
						<b>{{ $t("action.tradeOffers") }}</b>
						<div v-for="trade in incomingTrades" :key="trade.id" class="tradeOffer">
							<div>{{ $t("action.offerLine", { player: store.players[trade.from].displayName, give: funcs.formatGoods(trade.give), receive: funcs.formatGoods(trade.receive) }) }}</div>
							<button class="actionsLineButton" @click="respond(trade.id, true)">{{ $t("common.accept") }}</button>
							<button class="actionsLineButton" @click="respond(trade.id, false)">{{ $t("common.decline") }}</button>
						</div>
						<div v-for="trade in outgoingTrades" :key="trade.id" class="tradeOffer out">
							{{ $t("action.waitingOffer", { player: store.players[trade.to].displayName, give: funcs.formatGoods(trade.give), receive: funcs.formatGoods(trade.receive) }) }}
						</div>
					</div>
				</template>
			</template>

			<template v-else>
				<div class="waitBox">
					<p>{{ $t("action.waitingFor", { player: current ? current.displayName : $t("action.otherPlayers") }) }}</p>
					<div v-if="hasIncoming" class="subSection offers">
						<b>{{ $t("action.tradeOffersForYou") }}</b>
						<div v-for="trade in incomingTrades" :key="trade.id" class="tradeOffer">
							<div>{{ $t("action.offerLine", { player: store.players[trade.from].displayName, give: funcs.formatGoods(trade.give), receive: funcs.formatGoods(trade.receive) }) }}</div>
							<button class="actionsLineButton" @click="respond(trade.id, true)">{{ $t("common.accept") }}</button>
							<button class="actionsLineButton" @click="respond(trade.id, false)">{{ $t("common.decline") }}</button>
						</div>
					</div>
					<button v-if="personal.kickoutRequired > 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER" class="actionsLineButton" @click="skipMissing">{{ $t("action.skipTimedOut") }}</button>
					<button v-if="personal.kickoutRequired > 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER" class="actionsLineButton" @click="IO.kickout()">{{ $t("action.voteKickout", { player: current ? current.displayName : $t("action.playerFallback") }) }}</button>
				</div>
			</template>
		</template>
	</div>
</template>

<style scoped>
#actionPanel {
	width: 100%;
	box-sizing: border-box;
	height: 132px;
	overflow-y: auto;
	background: #fffdf3;
	border: 2px solid #7a5b19;
	border-radius: 6px;
	padding: 6px 10px;
	text-align: left;
	font-size: 12px;
	flex: 0 0 auto;
	display: flex;
	flex-wrap: wrap;
	align-content: flex-start;
	gap: 6px 18px;
}
.actionTitle { font-weight: bold; font-size: 16px; border-right: 2px solid #7a5b19; padding-right: 12px; margin: 0; }
.turnLine { margin: 0; }
.hint { color: #444; font-size: 12px; }
.buttonGrid { display: flex; flex-wrap: wrap; gap: 3px; }
.energyButton { min-width: 84px; padding: 4px; font-size: 12px; }
.energyButton small { font-size: 10px; font-weight: normal; }
.bigAction { margin-top: 0; font-size: 14px; }
.actionInfo { font-weight: bold; background: #f2e4b8; padding: 3px 6px; border-radius: 3px; margin: 0; }
.endTurnButton { border-color: #a33; color: #800; }
.subPanel { flex: 1 1 100%; border: 1px solid #b49a54; border-radius: 4px; padding: 3px 4px; margin-top: 0; background: #fffbe8; }
.subPanel .actionsLineButton { margin: 2px; padding: 4px 8px; }
.planetHeader { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
.subSection { border-top: 1px solid #d8c58f; padding-top: 4px; margin-top: 4px; }
.smallNote { color: #666; font-size: 11px; }
.factoryList { display: flex; flex-direction: column; gap: 2px; }
.factoryOption { display: flex; justify-content: space-between; align-items: center; gap: 4px; font-size: 11px; }
.factoryOption .actionsLineButton { margin: 0; padding: 2px 5px; font-size: 11px; }
select { max-width: 100%; font-size: 11px; margin: 2px; }
.tradeOffer { border: 1px solid #c9b06a; border-radius: 3px; padding: 3px; margin-top: 3px; background: #fff; }
.tradeOffer.out { background: #eef3ff; color: #445; }
.waitBox { text-align: left; margin-top: 0; }
.gameOverBox { text-align: left; }
.finalGroup { margin: 4px 0; }
.finalPlayer { margin-left: 6px; }
</style>
