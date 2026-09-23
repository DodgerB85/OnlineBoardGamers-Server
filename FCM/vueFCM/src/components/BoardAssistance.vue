<script setup>
/**
 * Right-hand assistance column next to the board.
 */
import * as view from "../js/FCMview"
import * as rf from "../js/FCMreference"
import * as plyr from "../js/FCMplayer"
import * as rules from "../js/FCMrules"
import * as controller from "../js/FCMcontroller"
import * as funcs from "../js/FCMfuncs"
import * as IO from "../backend/FCM_IO"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"
import { computed, ref } from "vue"
import i18n from "../i18n"

const store = useModelStore()
const personal = usePersonalStore()

const assistanceOn = computed(() => store.viewSettings.assistance)
const assistanceToggleText = computed(() => (assistanceOn.value ? i18n.global.t("assistance.hideSummary") : i18n.global.t("assistance.showSummary")))

function toggleAssistance() {
	store.viewSettings.assistance = !store.viewSettings.assistance
	IO.saveAssistance(store.viewSettings.assistance)
}

/* ---------------- Sandbox mode  ---------------- */
const sandboxMode = computed(() => store.startingOptions.sandboxMode && personal.canPlay())

const sandboxEmpTitle = (emp) => rf.EMPLOYEES_STR[emp]?.title ?? emp

const sandboxHireChoices = computed(() => {
	const possible = []
	for (let i = 0; i < store.availableEmployees.length; i++) {
		if (store.availableEmployees[i] !== -1) possible.push(i)
	}
	rf.sortEmployees(possible)
	return possible
})

const sandboxFireChoices = computed(() => {
	const playerObj = controller.currentPlayerObj()
	let current = [...playerObj.beach]
	if (playerObj.employees.length > 0) current = current.concat(playerObj.employees)
	rf.sortEmployees(current)
	return current.filter((employee) => employee !== rf.BLANK_EMPLOYEE_SPACE)
})

const sandboxHireSelected = ref(sandboxHireChoices.value[0])
const sandboxFireSelected = ref(sandboxFireChoices.value[0])
const sandboxResult = ref("")
let sandboxResultTimer = null

function showSandboxResult(text) {
	sandboxResult.value = text
	clearTimeout(sandboxResultTimer)
	sandboxResultTimer = setTimeout(() => (sandboxResult.value = ""), 1200)
}

function sandboxHire() {
	const emp = sandboxHireSelected.value ?? sandboxHireChoices.value[0]
	if (emp == null) return
	controller.sandboxHireEmployee(emp)
	showSandboxResult(i18n.global.t("assistance.hired", { name: sandboxEmpTitle(emp) }))
}

function sandboxFire() {
	const emp = sandboxFireSelected.value ?? sandboxFireChoices.value[0]
	if (emp == null) return
	controller.sandboxFireEmployee(emp)
	showSandboxResult(i18n.global.t("assistance.fired", { name: sandboxEmpTitle(emp) }))
}

// Resolve a [good, count] into the "Nx" + plain food-image form 
function foodSumGoods(sumArr) {
	const goods = []
	for (let i = 0; i < sumArr.length; i++) {
		if (sumArr[i] > 0) goods.push({ good: i, count: sumArr[i] })
	}
	return goods
}

/* ---------------- Board demand summary ---------------- */
const totalBoardNeeds = computed(() => {
	const sums = Array(10).fill(0)
	for (const need of store.needs) {
		for (const n of need.needs) sums[n[0]]++
	}
	return foodSumGoods(sums)
})

/* ---------------- Players assistance ---------------- */
function buildDiscount(playerIndex, player) {
	const phase = store.gameflow.phase
	let ref = phase === rf.PHASE_RESTRUCTURING ? [...player.beach] : []
	ref = ref.concat(player.employees)

	let numWaitresses = 0
	let numJazz = 0
	let minPrice = rules.basePrice()
	let maxPrice = rules.basePrice()
	let price = plyr.playersPrice(playerIndex)

	if (player.ceoAction === rf.CEO_ACTION_PRICE_MINUS_3) {
		minPrice -= 3
		maxPrice -= 3
	}

	for (const e of ref) {
		if (e === rf.WAITRESS) numWaitresses++
		else if (e === rf.JAZZ_MUSICIAN) numJazz++
		else if (e === rf.PRICING_MANAGER) minPrice--
		else if (e === rf.DISCOUNT_MANAGER) minPrice -= 3
		else if (e === rf.LUXURIES_MANAGER) maxPrice += 10
	}

	const hasNSM = player.employees.includes(rf.NIGHT_SHIFT_MANAGER)
	if (hasNSM) {
		for (const e of ref) if (e === rf.PRICING_MANAGER) minPrice--
	}

	if (plyr.hasMilestone(playerIndex, rf.FIRST_LOWER_PRICES)) {
		minPrice--
		maxPrice--
	}

	let distanceBonus = 0
	if (plyr.hasMilestone(playerIndex, rf.FIRST_MARKETEER_USED)) distanceBonus -= 2
	if (plyr.hasMilestone(playerIndex, rf.SOMEONE_SELLS_YOUR_DEMAND)) distanceBonus--

	const chips = []
	if (isNaN(price)) price = 10
	if (phase === rf.PHASE_RESTRUCTURING) {
		let priceStr = "$" + minPrice
		if (minPrice !== maxPrice) priceStr += " - $" + maxPrice
		chips.push({ count: "", label: priceStr, cls: "compact pricing" })
	} else {
		chips.push({ count: "", label: "$" + price, cls: "compact pricing" })
	}
	if (distanceBonus !== 0) chips.push({ count: "", label: distanceBonus + " d", cls: "compact distance" })
	if (numWaitresses > 0) chips.push({ count: numWaitresses + "x", label: " W ", cls: "compact " + rf.EMPLOYEES_STR[rf.WAITRESS].type })
	if (numJazz > 0) chips.push({ count: numJazz + "x", label: " J ", cls: "compact " + rf.EMPLOYEES_STR[rf.JAZZ_MUSICIAN].type })

	return { chips }
}

function buildStock(player) {
	const sums = Array(10).fill(0)
	for (const r of player.resources) sums[r]++
	return { goods: foodSumGoods(sums), hasResources: player.resources.length > 0 }
}

function buildMarketers(playerIndex, player) {
	const items = []
	if (player.marketers.length === 0) return { empty: true, items }

	for (const m of player.marketers) {
		if (m.marketer === rf.MASS_MARKETEER) {
			items.push({ isMM: true })
			continue
		}
		const campaignObj = store.campaigns.find((obj) => obj.number === m.campaign)
		const entry = { campaign: m.campaign, infinite: campaignObj.duration === 9, goods: [] }
		if (campaignObj.duration === 9) {
			entry.goods.push({ good: campaignObj.good, copies: 1 })
			if (plyr.hasMilestone(playerIndex, rf.FIRST_RADIO_CAMPAIGN) && rf.MARKETING_CAMPAIGNS[campaignObj.number].type === rf.RADIO) {
				entry.goods.push({ good: campaignObj.good, copies: 1 })
			}
		} else {
			let secondGood = player.additionalMarketedGood?.[0] === campaignObj.number ? player.additionalMarketedGood[1] : -1
			if (secondGood === -1 && plyr.hasMilestone(playerIndex, rf.FIRST_RADIO_CAMPAIGN)) {
				if (rf.MARKETING_CAMPAIGNS[campaignObj.number].type === rf.RADIO) secondGood = campaignObj.good
			}
			entry.goods.push({ good: campaignObj.good, copies: campaignObj.duration })
			if (secondGood !== -1) entry.goods.push({ good: secondGood, copies: campaignObj.duration })
		}
		items.push(entry)
	}
	return { empty: false, items }
}

function buildProduction(playerIndex, player) {
	const phase = store.gameflow.phase
	let ref = phase === rf.PHASE_RESTRUCTURING ? [...player.beach] : []
	ref = ref.concat(player.employees)

	let numPizza = 0,
		numBurger = 0,
		numErrand = 0,
		numCart = 0,
		numTruck = 0,
		numZeppelin = 0,
		numKitchen = 0,
		numBaristaTrainee = 0
	let numSushi = 0,
		numNoodles = 0,
		numDumplings = 0,
		numKimchi = 0,
		numCoffee = 0

	const nsm = player.employees.includes(rf.NIGHT_SHIFT_MANAGER)
	for (const employee of ref) {
		if (employee === rf.PIZZA_COOK) numPizza += 3
		else if (employee === rf.PIZZA_CHEF) numPizza += 8
		else if (employee === rf.BURGER_COOK) numBurger += 3
		else if (employee === rf.BURGER_CHEF) numBurger += 8
		else if (employee === rf.DUMPLING_COOK) numDumplings += 3
		else if (employee === rf.DUMPLING_CHEF) numDumplings += 8
		else if (employee === rf.KITCHEN_TRAINEE) {
			numKitchen++
			if (phase > rf.PHASE_RESTRUCTURING && nsm) numKitchen++
		} else if (employee === rf.ERRAND_BOY) {
			numErrand++
			if (phase > rf.PHASE_RESTRUCTURING && nsm) numErrand++
		} else if (employee === rf.CART_OPERATOR) numCart++
		else if (employee === rf.TRUCK_DRIVER) numTruck++
		else if (employee === rf.ZEPPELIN_PILOT) numZeppelin++
		else if (employee === rf.SUSHI_COOK) numSushi += 2
		else if (employee === rf.SUSHI_CHEF) numSushi += 5
		else if (employee === rf.NOODLE_COOK) numNoodles += 6
		else if (employee === rf.NOODLE_CHEF) numNoodles += 16
		else if (employee === rf.KIMCHI_MASTER) numKimchi += 1
		else if (employee === rf.BARISTA_TRAINEE) {
			numCoffee++
			numBaristaTrainee++
			if (phase > rf.PHASE_RESTRUCTURING && nsm) numCoffee++
		} else if (employee === rf.BARISTA) numCoffee += 2
		else if (employee === rf.LEAD_BARISTA) numCoffee += 5
	}

	if (phase < rf.PHASE_DINNERTIME) {
		const productionArr = Array(10).fill(0)
		productionArr[rf.PIZZA] = numPizza
		productionArr[rf.BURGER] = numBurger
		productionArr[rf.COFFEE] = numCoffee
		productionArr[rf.NOODLES] = numNoodles
		productionArr[rf.SUSHI] = numSushi
		productionArr[rf.KIMCHI] = numKimchi
		productionArr[rf.DUMPLING] = numDumplings
		const goods = foodSumGoods(productionArr)

		const chips = []
		if (numErrand > 0) {
			let label = "E"
			if (plyr.hasMilestone(playerIndex, rf.FIRST_ERRAND_BOY)) label += " *"
			chips.push({ count: numErrand + "x", label: " " + label + " ", cls: "compactAid " + rf.EMPLOYEES_STR[rf.ERRAND_BOY].type })
		}
		if (numCart > 0) {
			let label2 = "C"
			if (plyr.hasMilestone(playerIndex, rf.FIRST_CART_OPERATOR)) label2 += " *"
			chips.push({ count: numCart + "x", label: " " + label2 + " ", cls: "compactAid " + rf.EMPLOYEES_STR[rf.CART_OPERATOR].type })
		}
		if (numTruck > 0) {
			let label3 = "T"
			if (plyr.hasMilestone(playerIndex, rf.FIRST_CART_OPERATOR)) label3 += " *"
			chips.push({ count: numTruck + "x", label: " " + label3 + " ", cls: "compactAid " + rf.EMPLOYEES_STR[rf.TRUCK_DRIVER].type })
		}
		if (numZeppelin > 0) {
			let label4 = "Z"
			if (plyr.hasMilestone(playerIndex, rf.FIRST_CART_OPERATOR)) label4 += " *"
			chips.push({ count: "&nbsp;", label: " " + label4 + " ", cls: "compactAid " + rf.EMPLOYEES_STR[rf.ZEPPELIN_PILOT].type })
		}
		if (numKitchen > 0) {
			chips.push({ count: numKitchen + "x", label: " K ", cls: "compactAid " + rf.EMPLOYEES_STR[rf.KITCHEN_TRAINEE].type })
		}

		const none = goods.length === 0 && chips.length === 0

		let nsmChips = []
		if (phase === rf.PHASE_RESTRUCTURING && nsm && !none) {
			if (numBaristaTrainee > 0) nsmChips.push({ count: numBaristaTrainee + "x", label: "", good: rf.COFFEE, cls: "marketerAidFood" })
			if (numErrand > 0) {
				let label = "E"
				if (plyr.hasMilestone(playerIndex, rf.FIRST_ERRAND_BOY)) label += " *"
				nsmChips.push({ count: numErrand + "x", label: " " + label + " ", cls: "compactAid " + rf.EMPLOYEES_STR[rf.ERRAND_BOY].type })
			}
			if (numKitchen > 0) nsmChips.push({ count: numKitchen + "x", label: " K ", cls: "compactAid " + rf.EMPLOYEES_STR[rf.KITCHEN_TRAINEE].type })
		}

		return { show: true, goods, chips, none, nsmTitle: rf.EMPLOYEES_STR[rf.NIGHT_SHIFT_MANAGER].title, showNSM: nsmChips.length > 0, nsmChips }
	}
	return { show: false }
}

/* ---------------- Gourmet Food Critics ---------------- */
const gourmetUsed = computed(() => store.startingOptions.gourmet)

const gfcCampaigns = computed(() => {
	return store.campaigns
		.filter((c) => rf.MARKETING_CAMPAIGNS[c.number]?.type === rf.GOURMET_GUIDE)
		.map((c) => ({
			number: c.number,
			good: c.good,
			duration: c.duration,
			campaignImg: view.getImage("campaign_" + c.number),
			foodImg: view.getImage("item_" + c.good),
		}))
})

/* ---------------- Hawker Trucks ---------------- */
const useHawkerTrucks = computed(() => store.startingOptions.hawkers)

const hawkerCampaigns = computed(() => {
	return store.campaigns
		.filter((c) => rf.MARKETING_CAMPAIGNS[c.number]?.type === rf.HAWKER_TRUCK)
		.map((c) => ({
			number: c.number,
			good: c.good,
			duration: c.duration,
			campaignImg: view.getImage("campaign_" + c.number),
			foodImg: view.getImage("item_" + c.good),
		}))
})

function showHawkerRoute(campaignNumber) {
	// Toggle off if already showing this route
	if (store.highlights.indexesToHighlightPath.length > 0 && store.context.showingHawkerRoute === campaignNumber) {
		store.highlights.indexesToHighlightPath = []
		store.context.showingHawkerRoute = -1
		return
	}
	// Find the route in history (search backwards, match campaign number only)
	// History format: [action, playerIndex, timestamp, param]
	// For marketing campaign: param = [campaignNumber, routeOrIndex, good, ...]
	let route = []
	for (let i = store.history.length - 1; i >= 0; i--) {
		const entry = store.history[i]
		const param = entry[3]
		if (entry[0] === rf.HIST_START_MARKETING_CAMPAIGN && param[0] == campaignNumber) {
			route = funcs.importIndexes(param[1])
			break
		}
	}
	if (route.length > 0) {
		store.highlights.indexesToHighlightPath = route
		store.context.showingHawkerRoute = campaignNumber
	}
}

/* ---------------- Rural Marketing Area ---------------- */
const useRuralMarketers = computed(() => store.startingOptions.ruralMarketers)

const GIANT_BILLBOARD_COORDS = [
	[116, 3],
	[116, 290],
	[-26, 145],
	[260, 145],
]
const GIANT_BILLBOARD_ITEM_COORDS = [
	[177, 3],
	[177, 290],
	[33, 145],
	[320, 145],
]

const rmaCampaigns = computed(() => {
	return store.campaigns
		.filter((c) => rf.MARKETING_CAMPAIGNS[c.number]?.type === rf.GIANT_BILLBOARD)
		.map((c) => {
			const idx = c.number - 21
			const bb = GIANT_BILLBOARD_COORDS[idx] || [0, 0]
			const bi = GIANT_BILLBOARD_ITEM_COORDS[idx] || [0, 0]
			let itemLeft = bi[0]
			if (c.good === rf.BEER) itemLeft += 11
			if (c.good === rf.COKE) itemLeft += 9
			if (c.good === rf.LEMONADE) itemLeft += 6
			let itemWidth = 40
			if (c.good === rf.BEER) itemWidth = 20
			if (c.good === rf.COKE) itemWidth = 20
			if (c.good === rf.LEMONADE) itemWidth = 29
			return {
				number: c.number,
				good: c.good,
				bbX: bb[0],
				bbY: bb[1],
				itemX: itemLeft,
				itemY: bi[1],
				itemWidth,
				rotationClass: c.number === 22 ? "r2" : c.number === 23 ? "r3" : c.number === 24 ? "r1" : "",
			}
		})
})

const RMA_DEMAND_COORDS = [
	[92, 115],
	[92, 185],
	[162, 115],
	[162, 185],
	[232, 185],
]

const rmaDemands = computed(() => {
	const rmaNeed = store.needs.find((n) => n.number === rf.RURAL_MARKETING_AREA)
	if (!rmaNeed || !rmaNeed.needs) return []

	const combined = [0, 0, 0, 0, 0, 0]
	for (const [good] of rmaNeed.needs) combined[good === rf.DUMPLING ? 5 : good]++

	const res = []
	let added = 0
	for (let i = 0; i < combined.length; i++) {
		if (combined[i] > 0) {
			const good = i === 5 ? rf.DUMPLING : i
			let width = 70
			if (good === rf.BEER || good === rf.COKE) width = 35
			else if (good === rf.LEMONADE) width = 51
			res.push({
				good,
				count: combined[i],
				x: RMA_DEMAND_COORDS[added][0],
				y: RMA_DEMAND_COORDS[added][1],
				width,
			})
			added++
		}
	}
	return res
})

/* ---------------- Phase line ---------------- */
const phaseSegments = computed(() => {
	const phase = store.gameflow.phase
	const segs = []
	const push = (label, glow) => segs.push({ label, glow })

	if (phase === rf.PHASE_SETUP_MODULES) push(i18n.global.t("assistance.phaseChooseModules"), true)

	if (phase === rf.PHASE_URBAN_PLANNING) push(i18n.global.t("assistance.phaseUrbanPlanning", { plus: store.startingOptions.urbanPlanningPlus ? "+" : "" }), true)

	if (phase === rf.PHASE_SETUP_MODULES || phase === rf.PHASE_URBAN_PLANNING || phase === rf.PHASE_SETUP_RESTAURANT1 || phase === rf.PHASE_SETUP_RESTAURANT2 || phase === rf.PHASE_SETUP_RESERVE) {
		push(i18n.global.t("assistance.phaseSetupRestaurants"), phase === rf.PHASE_SETUP_RESTAURANT1 || phase === rf.PHASE_SETUP_RESTAURANT2)
		push(i18n.global.t("assistance.phaseSetupReserveCards"), phase === rf.PHASE_SETUP_RESERVE)
	}

	push(i18n.global.t("assistance.phaseRestructuring"), phase === rf.PHASE_RESTRUCTURING)
	push(i18n.global.t("assistance.phaseOrderOfBusiness"), phase === rf.PHASE_TURN_ORDER)
	push(i18n.global.t("assistance.phaseWorking"), phase === rf.PHASE_WORKING_DAY)
	push(i18n.global.t("assistance.phaseDinnertime"), phase === rf.PHASE_DINNERTIME)

	if (phase === rf.PHASE_PIZZA_BOMB) push(i18n.global.t("assistance.phasePizzaMilestone"), true)

	if (phase === rf.PHASE_CHOOSE_CEO_BONUS) push(i18n.global.t("assistance.phaseChooseCeoBonus"), true)

	push(i18n.global.t("assistance.phasePayday"), phase === rf.PHASE_PAYDAY)
	push(i18n.global.t("assistance.phaseMarketingCampaigns"), phase === rf.PHASE_MARKETING_CAMPAIGNS)
	push(i18n.global.t("assistance.phaseCleanUp"), phase === rf.PHASE_CLEAN_UP)

	if (phase === rf.PHASE_COFFE_SHOP_MS) push(i18n.global.t("assistance.phaseCoffeeMs"), true)

	return segs
})

const playerRows = computed(() => {
	const rows = []
	const phase = store.gameflow.phase
	for (const turn of store.gameflow.fullTurnOrder) {
		const player = store.players[turn]
		let played = false
		if (phase === rf.PHASE_WORKING_DAY) {
			const cur = store.gameflow.turnOrder.indexOf(controller.currentPlayerIndex())
			if (store.gameflow.turnOrder.indexOf(turn) < cur) played = true
		}
		rows.push({
			played,
			bgUrl: view.getImage("player_resto_icon_" + personal.getCorrectedColour(player.colour)),
			discount: buildDiscount(turn, player),
			stock: buildStock(player),
			production: buildProduction(turn, player),
			marketers: buildMarketers(turn, player),
		})
	}
	return rows
})
</script>

<template>
	<div id="assistance">
		<div id="assistanceSummary">
			<h4>{{ $t("assistance.summary") }}</h4>
			<div id="assistanceBoard">
				<template v-if="assistanceOn">
					<span v-if="totalBoardNeeds.length > 0">
						<span>{{ $t("assistance.totalDemandOnBoard") }}</span>
						<span class="food_list groupAid">
							<span class="groupAid singleLine" v-for="(fd, fi) in totalBoardNeeds" :key="fi">
								<span class="food_labelAid">{{ fd.count }}x</span>
								<img :src="view.getImage('item_' + fd.good)" alt="food" />
							</span>
						</span>
					</span>
					<span v-else>{{ $t("assistance.noDemandOnBoard") }}</span>
				</template>
				<div class="changeAssistanceButtonDiv">
					<button id="changeAssistanceButton" class="actionsLineButton" v-html="assistanceToggleText" @click="toggleAssistance"></button>
				</div>
			</div>
		</div>

		<div id="assistancePlayers" v-if="assistanceOn">
			<div class="playerEntry" :class="{ played: row.played }" :style="{ backgroundImage: 'url(' + row.bgUrl + ')' }" v-for="(row, ri) in playerRows" :key="ri">
				<!-- Price / discount -->
				<div class="playerLine first">
					<span class="title">{{ $t("assistance.price") }}</span>
					<span>:</span>
					<template v-for="(chip, ci) in row.discount.chips" :key="ci">
						<span v-if="chip.count">{{ chip.count }}</span>
						<span :class="chip.cls">{{ chip.label }}</span>
					</template>
				</div>

				<!-- Stock -->
				<div class="playerLine">
					<span class="title">{{ $t("assistance.stock") }}</span>
					<span>:</span>
					<span v-if="row.stock.hasResources">
						<span class="food_list groupAid">
							<span class="groupAid singleLine" v-for="(fd, fi) in row.stock.goods" :key="fi">
								<span class="food_labelAid">{{ fd.count }}x</span>
								<img :src="view.getImage('item_' + fd.good)" alt="food" />
							</span>
						</span>
					</span>
					<span v-else>{{ $t("assistance.noResources") }}</span>
				</div>

				<!-- Production -->
				<div class="playerLine">
					<template v-if="row.production.show">
						<span class="title">{{ $t("assistance.prod") }}</span>
						<span>:</span>
						<span class="food_list groupAid">
							<span class="groupAid singleLine" v-for="(fd, fi) in row.production.goods" :key="'g' + fi">
								<span class="food_labelAid">{{ fd.count }}x</span>
								<img :src="view.getImage('item_' + fd.good)" alt="food" />
							</span>
						</span>
						<template v-for="(chip, ci) in row.production.chips" :key="'c' + ci">
							<span v-if="chip.count" v-html="chip.count"></span>
							<span :class="chip.cls">{{ chip.label }}</span>
						</template>
						<span v-if="row.production.none">{{ $t("assistance.none") }}</span>
						<br v-if="row.production.showNSM" />
						<span v-if="row.production.showNSM">
							<span>{{ row.production.nsmTitle }}:</span>
							<template v-for="(chip, ci) in row.production.nsmChips" :key="'n' + ci">
								<span v-if="chip.count" v-html="chip.count"></span>
								<span :class="chip.cls" v-if="chip.label">{{ chip.label }}</span>
								<img v-if="chip.good != null" :src="view.getImage('item_' + chip.good)" alt="food" />
							</template>
						</span>
					</template>
					<template v-else>
						<span class="title">{{ $t("assistance.prod") }}</span>
						<span>....</span>
					</template>
				</div>

				<!-- Marketers -->
				<div class="playerLine">
					<template v-if="!row.marketers.empty">
						<span class="title">{{ $t("assistance.marketers") }}</span>
						:
						<span class="food_list groupAid">
							<span class="groupAid singleLine" v-for="(m, mi) in row.marketers.items" :key="mi">
								<span v-if="m.isMM" class="marketerAid">MM</span>
								<template v-else>
									<span class="marketerAid">{{ m.campaign }}</span>
									<span class="marketerAidFood" v-for="(g, gi) in m.goods" :key="gi">
										<img v-for="c in g.copies" :key="c" :src="view.getImage('item_' + g.good)" alt="food" />
									</span>
									<span v-if="m.infinite" class="infDiv r1">8</span>
								</template>
							</span>
						</span>
					</template>
					<template v-else>
						<span class="title">{{ $t("assistance.marketers") }}</span>
						: {{ $t("assistance.noMarketers") }}
					</template>
				</div>
			</div>
		</div>

		<!-- GOURMET FOOD CRITICS -->
		<div id="gourmetFoodCriticActiveDisplay" v-if="gourmetUsed">
			<template v-if="gfcCampaigns.length > 0">
				<div class="gourmetCampaign" v-for="c in gfcCampaigns" :key="c.number">
					<div class="fixedCampaign">
						<img class="campaign w2" :src="c.campaignImg" />
						<div class="inner">
							<img class="GFCitemImg" :src="c.foodImg" />
						</div>
						<div v-if="c.duration < 9" class="innerGFM">{{ c.duration }}</div>
						<div v-else class="innerGFM r1">8</div>
					</div>
				</div>
			</template>
			<template v-else>{{ $t("assistance.noActiveGourmetFoodCritics") }}</template>
		</div>

		<!-- HAWKER TRUCKS -->
		<div id="hawkerMarketerActiveDisplay" v-if="useHawkerTrucks">
			<template v-if="hawkerCampaigns.length > 0">
				<div><strong>{{ $t("assistance.hawkerTrucks") }}</strong></div>
				<div class="hawkerCampaign" v-for="c in hawkerCampaigns" :key="c.number" @click="showHawkerRoute(c.number)">
					<div class="fixedCampaign">
						<img class="campaign w3" :src="c.campaignImg" />
						<div class="inner">
							<img class="hawkerItemImg" :src="c.foodImg" />
						</div>
						<div v-if="c.duration < 9" class="innerHawker">{{ c.duration }}</div>
						<div v-else class="innerHawker r1">8</div>
					</div>
				</div>
			</template>
			<template v-else>{{ $t("assistance.noActiveHawkerTrucks") }}</template>
		</div>

		<!-- RURAL MARKETING AREA -->
		<div id="ruralMarketingArea" v-if="useRuralMarketers">
			<img class="ruralAreaBg" :src="view.getImage('ruralArea')" />
			<template v-for="c in rmaCampaigns" :key="'bb' + c.number">
				<img class="billboardImg" :class="c.rotationClass" :src="view.getImage('campaign_' + c.number)" :style="{ left: c.bbX + 'px', top: c.bbY + 'px' }" />
				<img class="billboardFood" :src="view.getImage('item_' + c.good)" :style="{ left: c.itemX + 'px', top: c.itemY + 'px', width: c.itemWidth + 'px' }" />
			</template>
			<template v-for="(d, di) in rmaDemands" :key="'rd' + di">
				<div class="RMAdemandDiv" :style="{ left: d.x + 'px', top: d.y + 'px' }">
					<img class="rmaDemandFood" :src="view.getImage('item_' + d.good)" :style="{ width: d.width + 'px' }" />
					<span class="rural_demand_number">{{ d.count }}</span>
				</div>
			</template>
		</div>

		<!-- SANDBOX MODE -->
		<div id="sandboxDiv" v-if="sandboxMode">
			<div>
				<strong>{{ $t("assistance.availableEmployees") }}</strong>
				<br />
				<select v-model="sandboxHireSelected">
					<option v-for="emp in sandboxHireChoices" :key="'h' + emp" :value="emp">{{ sandboxEmpTitle(emp) }}</option>
				</select>
				<button class="actionsLineButton" :disabled="sandboxHireChoices.length === 0" @click="sandboxHire">{{ $t("assistance.hireEmployee") }}</button>
			</div>
			<div style="margin: 20px"></div>
			<div>
				<strong>{{ $t("assistance.currentEmployees") }}</strong>
				<br />
				<select v-model="sandboxFireSelected">
					<option v-for="(emp, idx) in sandboxFireChoices" :key="'f' + idx" :value="emp">{{ sandboxEmpTitle(emp) }}</option>
				</select>
				<button class="actionsLineButton" :disabled="sandboxFireChoices.length === 0" @click="sandboxFire">{{ $t("assistance.fireEmployee") }}</button>
			</div>
			<div v-if="sandboxResult !== ''" class="resultText" style="font-weight: bold">{{ sandboxResult }}</div>
		</div>

		<!-- Phase line at the bottom of assistance -->
		<div id="phaseDiv">
			<template v-for="(seg, si) in phaseSegments" :key="si">
				<span :class="{ currentPhaseGlow: seg.glow }">{{ seg.label }}</span>
				<span v-if="si < phaseSegments.length - 1">►</span>
			</template>
		</div>
	</div>
</template>

<style scoped>
#assistance {
	width: 400px;
	padding-left: 10px;
	font-family: Arial, Helvetica, sans-serif;
}

#assistance h4 {
	margin: 0.2em;
}

#assistancePlayers {
	text-align: left;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
}

#assistanceSummary {
	text-align: center;
	width: 350px;
	display: inline-block;
}

#assistanceBoard {
	position: relative;
}

.changeAssistanceButtonDiv {
	position: absolute !important;
	left: 0%;
	top: -40px;
	display: inline !important;
	visibility: visible !important;
}

#changeAssistanceButton {
	display: inline;
	visibility: visible;
}

#assistance .playerEntry {
	text-align: left;
	width: 350px;
	display: inline-block;
	border: #000 1px solid;
	margin-bottom: 4px;
	min-height: fit-content;
	padding: 3px 45px 3px 3px;
	background-size: 40px 40px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
	vertical-align: top;
}

#assistance .playerEntry.played {
	background-color: #bbb;
	color: #555;
}

/* Phase line */
#phaseDiv {
	width: 100%;
	color: black;
	font-weight: bolder;
	margin-top: 5px;
}

.currentPhaseGlow {
	background-color: lightgreen;
}



#assistance .playerLine {
	height: fit-content;
	min-height: 25px;
}

#assistance .playerLine.first {
	display: inline-block;
}

#assistance .playerLine span.title {
	text-decoration: underline;
	display: inline-block;
	min-width: 45px;
	width: fit-content;
}

#assistance .food_list {
	display: inline;
}

#assistance .groupAid {
	margin: 0 2px;
}

.food_labelAid {
	display: inline-block;
}

.compact {
	font-weight: bold;
	padding: 2px 5px;
	margin: 2px;
	display: inline-block;
	cursor: default;
}

.compactAid {
	font-weight: bold;
	padding: 5px 5px;
	margin: 1px;
	display: inline-block;
}

.marketerAid {
	font-weight: bold;
	padding: 5px 5px;
	margin: 2px;
	display: inline-block;
	background-color: #87c2c8;
}

.marketerAidFood {
	display: inline-block;
	vertical-align: middle;
}

.infDiv {
	display: inline-block;
	padding: 5px;
}

.singleLine {
	display: inline-block;
	white-space: nowrap;
}

/* Food / drink / employee type chips */
#assistance .pricing {
	background-color: #f8a48c;
}

#assistance .hiring {
	background-color: #beb6b4;
}

#assistance .food {
	background-color: #8fa960;
}

#assistance .drink {
	background-color: #a4cf8a;
}

#assistance .restaurant {
	background-color: #b8312d;
}

#assistance .manager {
	background-color: #241e20;
	color: #fff;
}

#assistance .marketer {
	background-color: #87c2c8;
}

#assistance .waitress {
	background-color: #b492c4;
}

#assistance .delivery {
	background-color: #e98d2a;
}

#assistance .coffee {
	background-color: #a1cfa8;
}

#assistance .distance {
	background-color: #000;
	color: #fff;
}

#assistance .food_list img,
#assistance .marketerAidFood img {
	max-width: 25px;
	max-height: 28px;
	margin: 2px;
	padding: 2px;
	height: auto;
	vertical-align: middle;
}

/* Rotated 8 for infinite duration */
#assistance .infDiv.r1 {
	transform: rotate(90deg);
}

/* Matches the player assistance divs (#assistance .playerEntry) */
#sandboxDiv {
	width: 350px;
	display: inline-block;
	border: #000 1px solid;
	margin-bottom: 4px;
	padding: 3px 45px 3px 3px;
	background-color: #d4eafd;
	vertical-align: top;
}

/* Gourmet Food Critics */
#gourmetFoodCriticActiveDisplay {
	width: 392px;
	display: block;
	border: #000 1px solid;
	margin: 0 auto;
	margin-top: 5px;
	min-height: 110px;
	padding: 3px;
	z-index: 1;
}

.gourmetCampaign {
	float: left;
	padding: 4px;
	margin: 4px;
	position: relative;
	z-index: 1;
}

/* Hawker Trucks */
#hawkerMarketerActiveDisplay {
	width: 392px;
	display: block;
	border: #000 1px solid;
	margin: 0 auto;
	margin-top: 5px;
	height: 98px;
	padding: 3px;
	z-index: 1;
}

.hawkerCampaign {
	float: left;
	padding: 0px;
	margin: 4px;
	position: relative;
	z-index: 1;
	width: 114px;
	border: 2px solid black;
	height: 64px;
	cursor: pointer;
}

.hawkerCampaign:hover {
	border: 2px solid lightgreen;
}

.fixedCampaign img.campaign.w3 {
	width: 114px;
	height: 64px;
	box-sizing: border-box;
}

.fixedCampaign div.inner {
	position: absolute;
	bottom: 0;
	width: 100%;
	height: 40px;
	line-height: 40px;
	color: #fff;
	font-size: 20px;
}

.fixedCampaign .hawkerItemImg {
	height: 40px;
}

.fixedCampaign div.innerHawker {
	position: absolute;
	bottom: 0;
	left: 20px;
	width: 100%;
	height: 40px;
	line-height: 40px;
	color: #ffffff;
	font-size: 30px;
	font-weight: bolder;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	z-index: 1;
}

.fixedCampaign .innerHawker.r1 {
	transform: rotate(90deg);
}

.fixedCampaign {
	display: inline-block;
	position: relative;
}

.fixedCampaign img.campaign {
	display: block;
}

.fixedCampaign img.campaign.w2 {
	width: 80px;
}

.fixedCampaign div.inner {
	position: absolute;
	bottom: 0;
	width: 100%;
	height: 40px;
	line-height: 40px;
	color: #fff;
	font-size: 20px;
}

.fixedCampaign div.innerGFM {
	position: absolute;
	bottom: 0;
	left: 20px;
	width: 100%;
	height: 40px;
	line-height: 40px;
	color: #ffffff;
	font-size: 30px;
	font-weight: bolder;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	z-index: 1;
}

/* Rotated 8 for infinite duration */
.fixedCampaign .innerGFM.r1 {
	transform: rotate(90deg);
}

/* Rural Marketing Area */
#ruralMarketingArea {
	width: 392px;
	display: block;
	border: #000 1px solid;
	margin: 0 auto;
	margin-top: 5px;
	height: 330px;
	padding: 3px;
	position: relative;
}

.ruralAreaBg {
	left: 71px;
	top: 40px;
	width: 250px;
	height: 250px;
	position: absolute;
}

.billboardImg {
	position: absolute;
	width: 161px;
	height: 40px;
}

.billboardImg.r1 {
	transform: rotate(90deg);
}

.billboardImg.r2 {
	transform: rotate(180deg);
}

.billboardImg.r3 {
	transform: rotate(270deg);
}

.billboardFood {
	position: absolute;
	height: 40px;
}

.RMAdemandDiv {
	position: absolute;
	width: 70px;
	height: 70px;
}

.rmaDemandFood {
	position: absolute;
	left: 0;
	top: 0;
	height: 70px;
}

span.rural_demand_number {
	z-index: 99;
	position: absolute;
	transform: translate(-50%, 19%);
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	font-weight: bolder;
	font-size: 45px;
}

.GFCitemImg {
	height: 28px;
	filter: drop-shadow(1px 1px white) drop-shadow(-1px 1px white) drop-shadow(1px -1px white) drop-shadow(-1px -1px white);
}
</style>
