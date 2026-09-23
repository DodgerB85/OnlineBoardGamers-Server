<script setup>
/** Action area - This is where you interact with the game flow.
 * Confirm actions, end turn, reset turn.
 * Also, it's where you're told what to do next
 *
 *
 */
import * as rf from "../js/FCMreference"
import * as controller from "../js/FCMcontroller"
import * as funcs from "../js/FCMfuncs"
import * as view from "../js/FCMview"
import * as rules from "../js/FCMrules"
import * as plyr from "../js/FCMplayer"
import AddItemBox from "./utils/AddItemBox.vue"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { computed, watch, ref } from "vue"

function undoHireEmployee(employee) {
	const idx = store.context.justHired.indexOf(employee)
	if (idx === -1) return
	store.availableEmployees[employee]++
	store.context.justHired.splice(idx, 1)
	store.context.endOfDaySummaryData.hire.hired.splice(store.context.endOfDaySummaryData.hire.hired.indexOf(employee), 1)
	controller.currentPlayerObj().beach.splice(controller.currentPlayerObj().beach.lastIndexOf(employee), 1)
}

function selectEmployeeToTrain(employee, origin = 0) {
	store.context.selectedEmployeeToTrainData.employee = employee
	store.context.selectedEmployeeToTrainData.origin = origin
}

function lobbyItemHeight(item) {
	let height = 1
	if (item[0] === 1 && item[1] === 2) height = 2
	if (item[0] === 0 && item[1] !== 0) height = 2
	return height * 20 + "px"
}

// MARKETING

const computedAvailableMarketers = computed(() => {
	const marketers = controller.currentPlayerObj().employees.filter((employee) => rf.MARKETERS.includes(employee))
	// Mass Marketeers are sent automatically
	return funcs.removeItemAll(marketers, rf.MASS_MARKETEER)
})

const computedTrainableOptions = computed(() => {
	const ret = {
		beachTrainable: [],
		atWorkTrainable: [],
	}
	// 1. Map 'justTrained' to get 'to' values
	const justTrainedTo = store.context.justTrained.map((item) => item.to)

	controller.currentPlayerObj().beach.forEach((beachEmp) => {
		// 2. Get and flatten upgrades
		const upgrades = rules.possibleUpgrades(store.availableEmployees, controller.currentPlayerIndex(), beachEmp, computedTrainingData.value.total, computedTrainingData.value.level2, computedTrainingData.value.level3, computedTrainingData.value.unlimited, justTrainedTo).flat(Infinity)

		// 3. Deduplicate using Set
		const uniqueUpgrades = [...new Set(upgrades)]

		// 4. Process the UI if valid upgrades exist
		if (uniqueUpgrades.length > 0) {
			ret.beachTrainable.push(beachEmp)
		}
	})

	if (plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_LEMONADE_SOLD)) {
		// Show the ACTUAL at-work employees that can be trained; clicking one
		// reveals its upgrade options
		ret.atWorkTrainable = controller.currentPlayerObj().employees.filter((emp) => {
			const upgrades = rules.possibleUpgrades(store.availableEmployees, controller.currentPlayerIndex(), emp, computedTrainingData.value.total, computedTrainingData.value.level2, computedTrainingData.value.level3, computedTrainingData.value.unlimited, justTrainedTo, true).flat(Infinity)
			return upgrades.length > 0
		})
	}
	return ret
})

const computedTrainingData = computed(() => rules.getTrainingPoints(controller.currentPlayerIndex(), store.context.justTrained))

const eodCurrentSalary = computed(() => rules.salary(controller.currentPlayerIndex()))
const eodPlayerMoney = computed(() => controller.currentPlayerObj().money)
const eodHasBeerMS = computed(() => plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_BEER_SOLD))
const eodIsLastOrShort = computed(() => store.gameflow.turnOrder.length === 1 || store.startingOptions.shortGame === true)
const eodTriButton = computed(() => {
	if (store.gameflow.turn === 1 && eodCurrentSalary.value === 0) return false
	if (eodIsLastOrShort.value) return false
	if ((eodCurrentSalary.value === 0 && store.gameflow.turn <= 2) || store.startingOptions.strictPaydayFridge) return false
	return eodPlayerMoney.value >= eodCurrentSalary.value && !eodHasBeerMS.value
})

function endTurnPlayPayday() {
	const idx = controller.currentPlayerIndex()
	let paydayFlag = -9
	let cleanupFlag = -9
	const radio0 = store.context.EODradioSelections[0]
	const radio1 = store.context.EODradioSelections[1]
	if (radio0 === -3) paydayFlag = plyr.hasMilestone(idx, rf.FIRST_TRAINER_USED) ? -5 : -3
	else if (radio0 === -4) paydayFlag = -4
	if (radio1 === -1) cleanupFlag = -1
	store.context.preMoveData = [[[paydayFlag], []], [cleanupFlag]]
	controller.endPlayerTurn(false, false)
}

function endTurnAutoPay() {
	const idx = controller.currentPlayerIndex()
	const playerObj = controller.currentPlayerObj()
	const salary = rules.salary(idx)
	let paydayFlag = -9
	let cleanupFlag = -9
	if (salary === 0 && !store.startingOptions.strictPaydayFridge) paydayFlag = -1
	else if (playerObj.money >= salary && !store.startingOptions.strictPaydayFridge && !plyr.hasMilestone(idx, rf.FIRST_BEER_SOLD)) paydayFlag = -2
	if (store.context.EODradioSelections[1] === -1) cleanupFlag = -1
	store.context.preMoveData = [[[paydayFlag], []], [cleanupFlag]]
	controller.endPlayerTurn(false, false)
}

const computedOptionsToTrainToByLevel = computed(() => {
	const fromEmployee = store.context.selectedEmployeeToTrainData.employee
	const fromBeach = store.context.selectedEmployeeToTrainData.origin === 0
	const fromHire = store.context.selectedEmployeeToTrainData.origin === 1
	const fromStructure = store.context.selectedEmployeeToTrainData.origin === 2
	if (fromEmployee === -1 && !fromHire) return []
	if (computedTrainingData.value.total === 0) return []

	const playerIndex = controller.currentPlayerIndex()

	let upgradeOptions = []
	const justTrainedTo = store.context.justTrained.map((item) => item.to)
	if (fromStructure || fromBeach) {
		upgradeOptions = rules.possibleUpgrades(store.availableEmployees, playerIndex, [fromEmployee], computedTrainingData.value.total, computedTrainingData.value.level2, computedTrainingData.value.level3, computedTrainingData.value.unlimited, justTrainedTo, fromStructure)
	} else if (fromHire) {
		upgradeOptions = rules.possibleUpgrades(store.availableEmployees, playerIndex, rf.HIREABLE_EMPLOYEES, computedTrainingData.value.total, computedTrainingData.value.level2, computedTrainingData.value.level3, computedTrainingData.value.unlimited, justTrainedTo, false)
	}

	return upgradeOptions
})

// PRODUCERS
const isCollectingDrinks = computed(() => [rf.CART_OPERATOR, rf.TRUCK_DRIVER, rf.ZEPPELIN_PILOT].includes(store.context.producer))

// HOUSES & GARDENS (New Business Developer)
const housesRemaining = computed(() => {
	const player = controller.currentPlayerObj()
	return player.employees.filter((e) => e === rf.NEW_BUSINESS_DEVELOPER).length - store.context.justBuilt.length
})

// LOBBYISTS
const computedLobbyistsRemaining = computed(() => {
	const player = controller.currentPlayerObj()
	return player.employees.filter((e) => e === rf.LOBBYIST).length - store.context.justLobbied.length
})

const computedAvailableLobbyistItems = computed(() => {
	return rules.availableNewRoads().length + rules.availableParks().length
})

const computedAvailableLobbyistTiles = computed(() => {
	return rules.availableLobbyistTiles()
})

function getTileImageSrc(tile) {
	const numStr = tile < 9 ? "0" + (tile + 1) : "" + (tile + 1)
	return view.getImage("map" + numStr)
}

// Milestone tile rotation - degrees accumulate freely so the preview spins
// smoothly (like the lobbyist roads/parks), syncing store.context.rotation.
const tileDegrees = ref(store.context.rotation * 90)
watch(tileDegrees, (deg) => {
	store.context.rotation = ((Math.round(deg / 90) % 4) + 4) % 4
})
watch(
	() => store.context.newLobbyistTile,
	() => {
		tileDegrees.value = 0
	}
)
function rotateMSTile(cw) {
	tileDegrees.value += cw ? 90 : -90
}
const tilePreviewStyle = computed(() => ({
	width: "100px",
	height: "100px",
	transform: `rotate(${tileDegrees.value}deg)`,
	transition: "transform 0.3s ease-in-out",
}))

// NEW RESTAURANTS
const computedRemainingManagers = computed(() => {
	const player = controller.currentPlayerObj()
	const total = player.employees.filter((employee) => rf.CAN_BUILD_RESTAURANT.includes(employee))
	const used = store.context.justOpened
	const remaining = []
	for (const m of [rf.LOCAL_MANAGER, rf.REGIONAL_MANAGER]) {
		const n = total.filter((e) => e === m).length - used.filter((e) => e === m).length
		for (let i = 0; i < n; i++) remaining.push(m)
	}
	return remaining
})

// Re-highlight placement squares when the restaurant is rotated
watch(
	() => store.context.rotation,
	() => {
		if (store.gameflow.subphase === rf.SUBPHASE_NEW_RESTAURANTS && store.context.newRestaurantAction === "create") {
			controller.setNewRestaurantPlacementHighlights()
		}
		if (store.gameflow.subphase === rf.SUBPHASE_HOUSES && store.context.selectedBuilding !== -1) {
			controller.updateHousesHighlights()
		}
	}
)

const computedProducers = computed(() => {
	const playerObj = controller.currentPlayerObj()

	// 1. Filter original producers
	let producers = playerObj.employees.filter((employee) => rf.PRODUCERS.includes(employee))

	// 2. Add Night Shift bonuses
	if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) {
		const bonuses = producers.filter((e) => e === rf.ERRAND_BOY || e === rf.KITCHEN_TRAINEE || e === rf.BARISTA_TRAINEE)
		producers = [...producers, ...bonuses]
	}

	// 3. Remove employees that just produced
	if (store.context.justProduced.team.length > 0) {
		store.context.justProduced.team.forEach((e) => {
			const index = producers.indexOf(e)
			if (index !== -1) {
				producers.splice(index, 1)
			}
		})
	}

	return producers
})
</script>

<template>
	<!-- Hiring Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_HIRING">
		<div>
			<template v-if="rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) > 0">
				<template v-if="store.gameflow.turn === 1">
					<p v-if="!store.startingOptions.kimchi && !store.startingOptions.nightShift && !store.startingOptions.lobbyists">
						<b>{{ $t("actionArea.noFiringAfterFirstTurn") }}</b>
					</p>
					<p v-else>
						<b>{{ $t("actionArea.noFiringAfterFirstTurnDetail") }}</b>
					</p>
					<p v-if="store.startingOptions.useMilestones && store.startingOptions.newMilestones">
						<span v-html="$t('welcome.newMilestones')"></span>
						<img class="boxReminderImg" :src="view.getImage('FCMbox2')" />
					</p>
					<p v-if="store.startingOptions.useMilestones && !store.startingOptions.newMilestones">
						<span v-html="$t('welcome.originalMilestones')"></span>
						<img class="boxReminderImg" :src="view.getImage('FCMbox')" alt="Original FCM box" />
					</p>
				</template>

				<p>{{ $t("actionArea.canRecruitNewEmployees") }}</p>
				<p v-if="store.startingOptions.nightShift && store.players[personal.pov].employees.includes(rf.NIGHT_SHIFT_MANAGER)">
					{{ $t("actionArea.nightShiftRecruitTwice") }}
				</p>

				<p v-if="rules.isAnyTrainableBaseEmployeeUnavailable()">
					{{ $t("actionArea.keepRecruitingPointsForTraining") }}
				</p>
			</template>
			<template v-else>
				<p v-if="store.context.justHired.length === 0">
					{{ $t("actionArea.ceoActionNoRecruitingPoints") }}
				</p>
			</template>

			<!-- Display just hired employees -->
			<div v-if="store.context.justHired.length > 0" class="reminder hiredLine">
				<div v-for="employee in store.context.justHired" :key="employee" class="cardSummaryDiv selectable" :title="$t('actionArea.clickToUndoHire')" @click="undoHireEmployee(employee)">
					<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
				</div>
			</div>

			<template v-if="rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) > 0">
				<!-- Recruiting points -->
				<p>
					{{ rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) }} {{ rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) === 1 ? "remaining point" : "remaining points" }}
					<template v-if="rules.getRemainingRecruitPointsAvailableForDiscount(controller.currentPlayerIndex()) > 0">
						<br />
						{{ rules.getRemainingRecruitPointsAvailableForDiscount() }} {{ rules.getRemainingRecruitPointsAvailableForDiscount() === 1 ? "point may be used to reduce salaries by $5" : `points may be used to reduce salaries by $${rules.getRemainingRecruitPointsAvailableForDiscount() * 5}` }}
					</template>
				</p>

				<!-- Employee cards -->
				<div class="allHireableEmployeesDiv">
					<div v-for="employee in rf.HIREABLE_EMPLOYEES.filter((e) => store.availableEmployees[e] > 0 && !rules.forbiddenEmployeesDuringHire(controller.currentPlayerIndex(), store.context.justHired).includes(e))" :key="employee" class="cardChoiceDiv selectable" @click="controller.hireEmployee(employee)">
						<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
					</div>
				</div>
			</template>

			<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset Working Day</button>
			<button class="actionsLineButton" @click="controller.endWorkingDaySubphase()">Finish Recruiting</button>
		</div>
	</template>

	<!-- Training Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_TRAINING">
		<!-- Main display when not training -->
		<template v-if="store.context.selectedEmployeeToTrainData.employee === -1 && store.context.selectedEmployeeToTrainData.origin === 0">
			<!-- Display just trained employees -->
			<div v-if="store.context.justTrained.length > 0" class="reminder">
				<p>Trained:</p>
				<template v-for="(entry, idx) in store.context.justTrained" :key="idx">
					<img v-if="entry.from > -1" :src="view.getImage(`emp_${entry.from}`)" class="cardImg oldTrainedEmployee" :alt="rf.employeeName(entry.from)" />
					<img :src="view.getImage(`emp_${entry.to}`)" class="cardImg" :class="{ newTrainedEmployee: entry.from > -1 }" :alt="rf.employeeName(entry.to)" />
				</template>
			</div>

			<!-- NSM TEXT -->
			<span v-if="controller.currentPlayerObj().employees.includes(rf.NIGHT_SHIFT_MANAGER)">Your Night Shift Manager allows each trainer to work twice</span>

			<!-- TRAIN INFO -->
			<span v-if="store.context.remainingTrains > 0">
				You can train {{ store.context.remainingTrains }}
				<span v-if="store.context.remainingTrains === 1">employee</span>
				<span v-else>slots</span>
			</span>

			<p>{{ computedTrainingData.total }} training points available</p>

			<!-- NOT UNLIMITEFD - BUT HAVE MULTI TRAIN -->
			<template v-if="!computedTrainingData.unlimited">
				<template v-if="computedTrainingData.level2 > 0">
					<span v-if="computedTrainingData.level2 === 1">
						You can train 1 employee up to 2 levels
						<br />
					</span>
					<span v-else>
						You can train {{ computedTrainingData.level2 }} employees up to 2 levels
						<br />
					</span>
				</template>
				<span v-if="computedTrainingData.level3 > 0">
					You can train 1 employee up to 3 levels
					<br />
				</span>
			</template>

			<!-- SPARE RECRUIT POINTS-->
			<template v-if="rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) > 0">
				<span v-if="rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) === 1">You have 1 recruiting point</span>
				<span v-else>You have {{ rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) }} recruiting points</span>
			</template>

			<p v-if="computedTrainingData.total > 0">Choose an employee to train</p>

			<span v-if="computedTrainingData.level3 > 0 || computedTrainingData.level2 > 0 || computedTrainingData.unlimited === true">
				<small>Each employee can only be trained once, so just select the final promotion</small>
			</span>

			<div class="trainingOptionsDiv">
				<!-- Training Options -->
				<div class="allHireableEmployeesDiv">
					<div v-for="employee in computedTrainableOptions.beachTrainable" :key="employee" class="cardChoiceDiv selectable" @click="selectEmployeeToTrain(employee)">
						<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
					</div>
				</div>
			</div>

			<template v-if="computedTrainingData.total > 0 && computedTrainableOptions.beachTrainable.length === 0 && computedTrainableOptions.atWorkTrainable.length === 0 && rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) === 0">You have training capacity available, but no one to train</template>

			<!-- LEMONADE MS STRUTURE TRAIN -->
			<template v-if="plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_LEMONADE_SOLD)">
				<template v-if="computedTrainableOptions.atWorkTrainable.length > 0">
					<p>You can train staff from your working employees (preserving colour)</p>
					<div class="trainingOptionsDiv">
						<div class="allHireableEmployeesDiv">
							<div v-for="employee in computedTrainableOptions.atWorkTrainable" :key="employee" class="cardChoiceDiv selectable" @click="selectEmployeeToTrain(employee, 2)">
								<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
							</div>
						</div>
					</div>
				</template>
				<p v-else>You are not able to train any of your working employees (preserving colour)</p>
			</template>

			<button v-if="rules.getRemainingRecruitingPoints(controller.currentPlayerIndex()) > 0 && computedTrainingData.total > 0" class="actionsLineButton" @click="selectEmployeeToTrain(-1, 1)">Train from hiring</button>
			<br />
			<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset Working Day</button>
			<button class="actionsLineButton" @click="controller.resetSubphase()">Reset Training</button>
			<button class="actionsLineButton" @click="controller.endWorkingDaySubphase()">Finish Training</button>
		</template>
		<!-- If mid train, show from and to -->
		<template v-else>
			<template v-if="store.context.selectedEmployeeToTrainData.employee > -1">
				<p>From:</p>
				<div class="cardSummaryDiv">
					<img :src="view.getImage(`emp_${store.context.selectedEmployeeToTrainData.employee}`)" class="cardImg" :alt="rf.employeeName(store.context.selectedEmployeeToTrainData.employee)" />
				</div>
			</template>
			<p>To:</p>
			<template v-for="(level, idx1) in computedOptionsToTrainToByLevel" :key="idx1">
				<template v-if="level.length > 0">
					<div v-for="(emp, idx2) in level" :key="idx2" class="cardChoiceDiv selectable" @click="controller.trainEmployee(emp, idx1 + 1)">
						<img :src="view.getImage(`emp_${emp}`)" class="cardImg" :alt="rf.employeeName(emp)" />
					</div>
				</template>
				<br />
			</template>
		</template>
	</template>

	<!-- Coffee Shops Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN">
		<div>
			<p v-if="store.context.baristaCoffeeShops > 0">Training a Barista allows you to place/move a coffee shop with a range of 2 - Remaining: {{ store.context.baristaCoffeeShops }}</p>
			<p v-if="store.context.leadBaristaCoffeeShopsFromB > 0">Training a Lead Barista from a Barista allows you to place/move a coffee shop with unlimited range - Remaining: {{ store.context.leadBaristaCoffeeShopsFromB }}</p>
			<p v-if="store.context.leadBaristaCoffeeShopsFromTB > 0">Training a Lead Barista from a Trainee Barista allows you to first place/move a coffee shop with range 2 (included above) and then another with unlimited range - Remaining: {{ store.context.leadBaristaCoffeeShopsFromTB }}</p>

			<p v-if="store.context.leadBaristaCoffeeShopsFromB > 0 || (store.context.justCoffeeShopped.length == 1 && store.context.leadBaristaCoffeeShopsFromTB > 0)">
				<b>Place a coffee shop with unlimited range</b>
			</p>
			<p v-else-if="store.context.baristaCoffeeShops > 0 || store.context.leadBaristaCoffeeShopsFromTB > 0">
				<b>Place a coffee shop with range 2</b>
			</p>

			<p v-if="store.context.coffeeShopAction === 'remove'">No more Coffee Shops. Select a placed Coffee Shop to move it</p>
			<p v-else-if="store.context.coffeeShopAction === 'place'">There can only be 1 coffee shop per tile, and it must be next to a road</p>

			<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset the whole working day</button>
			<button class="actionsLineButton" @click="controller.resetSubphase()">Reset</button>
			<button v-if="store.context.baristaCoffeeShops + store.context.leadBaristaCoffeeShopsFromB + store.context.leadBaristaCoffeeShopsFromTB > 0" class="actionsLineButton" @click="controller.endWorkingDaySubphase()">Skip Coffee Shop</button>
			<button v-else class="actionsLineButton" @click="controller.endWorkingDaySubphase()">Finish Building Coffee Shops</button>
		</div>
	</template>

	<!-- Marketing Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_MARKETING">
		<!-- Freeway Placement (after Rural Marketeer campaign) -->
		<template v-if="store.context.action === rf.ACT_PLACE_FREEWAY">
			<p>Place a Highway Ramp to connect to the Rural Area. You can place it side on or end on to any edge of the board, as long as it connects to at least one road.</p>

			<AddItemBox :itemBeingAdded="rf.ITEM_BOX_FREEWAY" />

			<br />
			<button class="actionsLineButton" @click="controller.resetMarketingSelection()">Skip Freeway Placement</button>
		</template>

		<!-- Select which marketer to use -->
		<template v-else-if="store.context.marketer === -1">
			<template v-if="computedAvailableMarketers.length > 0">
				<p>Select a marketeer to start a marketing campaign</p>
				<div class="allHireableEmployeesDiv">
					<div v-for="employee in computedAvailableMarketers" :key="employee" class="cardChoiceDiv selectable" @click="controller.selectMarketer(employee)">
						<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
					</div>
				</div>
			</template>
			<p v-else-if="store.context.justMarketed.length === 0">No marketeers available</p>

			<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset the whole working day</button>
			<button class="actionsLineButton" @click="controller.resetSubphase()">Reset</button>
			<button class="actionsLineButton" @click="controller.endWorkingDaySubphase()">{{ store.context.justMarketed.length === 0 ? "Skip Marketing" : "Finish Marketing" }}</button>
		</template>

		<!-- Configure and place the campaign -->
		<template v-else>
			<div class="reminder">
				<img :src="view.getImage(`emp_${store.context.marketer}`)" class="cardImg" :alt="rf.employeeName(store.context.marketer)" />
				<img v-if="store.context.nightShift" :src="view.getImage('so_nightShift')" class="nightShiftIcon" alt="Night Shift" />
			</div>

			<template v-if="store.context.campaigns.length === 0">
				<p>There are no suitable marketing campaigns left</p>
				<button class="actionsLineButton" @click="controller.cancelMarketer()">Never mind</button>
			</template>
			<template v-else>
				<p v-if="store.context.secondCampaignManager">Choose another campaign for your Campaign Manager Milestone</p>
				<p v-else-if="store.context.nightShift">Choose a marketing campaign for the Night Shift Manager</p>
				<p v-else>Choose a marketing campaign</p>
				<p v-if="!store.context.nightShift && !store.context.secondCampaignManager && controller.currentPlayerObj().employees.includes(rf.NIGHT_SHIFT_MANAGER) && store.context.marketer === rf.MARKETING_TRAINEE">Your Night Shift Manager allows your Marketing Trainee to market twice. Your trainee will be attached to the longer of the 2 campaigns</p>

				<AddItemBox :itemBeingAdded="rf.ITEM_BOX_CAMPAIGN" />

				<!-- Hawker truck: route-based placement -->
				<template v-if="store.context.campaign >= 25 && store.context.campaign <= 27">
					<p v-if="store.context.path.length === 0 && !store.context.hawkerRouteActive"><button class="actionsLineButton" @click="controller.startHawkerRouteSelection()">Set Hawker Route</button></p>
					<template v-else-if="store.context.hawkerRouteActive">
						<p v-if="store.context.range > 0">Set Hawker Route: {{ store.context.range }} range left</p>
						<p v-else>Set Hawker Route: 0 range — click a highlighted square to stop</p>
						<button class="actionsLineButton" @click="controller.stopHawkerTruck()">Done Drawing Route</button>
					</template>
					<p v-else-if="store.context.path.length > 0"><button class="actionsLineButton" @click="controller.addHawkerTruck()">Add Hawker Truck</button></p>
					<p v-else><button class="actionsLineButton" @click="controller.placeMarketingCampaign(0)">Place Campaign</button></p>
				</template>

				<!-- Gourmet guides / giant billboards: button placement -->
				<p v-else-if="store.context.campaign > 16"><button class="actionsLineButton" @click="controller.placeMarketingCampaign(0)">Place Campaign</button></p>
				<p v-else>Click a highlighted square on the map to place your campaign</p>

				<br />
				<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset the whole working day</button>
				<button class="actionsLineButton" @click="controller.resetSubphase()">Reset</button>
				<button v-if="store.context.nightShift" class="actionsLineButton" @click="controller.skipNightShiftManager()">{{ $t("actionArea.skipNightShiftManager") }}</button>
			</template>
		</template>
	</template>

	<!-- Production Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_PRODUCE">
		<div>
			<!-- DISPLAY JUST PRODUCED -->
			<div class="reminder">
				<p>Produced:</p>
				<div v-for="(emp, idx) in store.context.justProduced.team" :key="idx" class="cardSummaryDiv producedCardSummary">
					<img :src="view.getImage(`emp_${emp}`)" class="cardImg" :alt="rf.employeeName(emp)" />
				</div>
				<template v-for="(amount, idx) in store.context.justProduced.added" :key="idx">
					<div v-if="amount > 0" class="productionItemSummaryDiv">
						<img :src="view.getImage(`item_${idx}`)" class="producedItemSummaryImg" :alt="amount" />
						<span class="producedNumber">{{ amount }}</span>
					</div>
				</template>
			</div>

			<template v-if="computedProducers.length > 0">
				<p>Select a Food / Drink producer</p>
				<template v-if="controller.currentPlayerObj().employees.includes(rf.NIGHT_SHIFT_MANAGER)">
					<span v-if="store.startingOptions.coffee">Your Night Shift Manager allows each Barista Trainee, Errand Boy and Kitchen Trainee to work twice. They are displayed twice each below</span>
					<span v-else>Your Night Shift Manager allows each Errand Boy and Kitchen Trainee to work twice. They are displayed twice each below</span>
				</template>
			</template>

			<!-- DRIVING A CART / TRUCK / ZEPPELIN TO COLLECT DRINKS -->
			<template v-if="isCollectingDrinks">
				<p>Click the highlighted squares to trace a path, then stop to collect drinks</p>
				<button class="actionsLineButton" @click="controller.stopCollecting()">Stop and collect drinks</button>
			</template>

			<template v-else>
				<!-- DISPLAY PRODUCERS -->
				<div class="allHireableEmployeesDiv">
					<div v-for="(employee, idx) in computedProducers" :key="idx" class="cardChoiceDiv selectable" @click="controller.clickedProducer(employee)">
						<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
					</div>
				</div>

				<!-- DISPLAY OPTIONS FOR EB / KT -->
				<template v-if="store.context.producer !== -1">
					<div>
						<template v-if="store.context.producer === rf.ERRAND_BOY">
							<p>Select Drink to produce</p>
							<div class="productionOptionsDiv">
								<div v-for="(item, idx) in [rf.LEMONADE, rf.COKE, rf.BEER]" :key="idx" class="productionItemOptionsDiv" @click="controller.addProducedItemToPlayer(item)">
									<img :src="view.getImage(`item_${item}`)" class="producerItemOptionImg" />
								</div>
							</div>
						</template>
						<template v-else-if="store.context.producer === rf.KITCHEN_TRAINEE">
							<p>Select Food item to produce</p>
							<div class="productionOptionsDiv">
								<div v-for="(item, idx) in [rf.PIZZA, rf.BURGER]" :key="idx" class="productionItemOptionsDiv" @click="controller.addProducedItemToPlayer(item)">
									<img :src="view.getImage(`item_${item}`)" class="producerItemOptionImg" />
								</div>
							</div>
						</template>
					</div>
				</template>

				<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset Working Day</button>
				<button class="actionsLineButton" @click="controller.resetSubphase()">Reset Production</button>
				<button class="actionsLineButton" @click="controller.endWorkingDaySubphase()">Finish Production</button>
			</template>
		</div>
	</template>

	<!-- Houses and Gardens Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_HOUSES">
		<div>
			<p>{{ $t("actionArea.buildHousesAndGardens") }}</p>

			<template v-if="housesRemaining > 0">
				<p>You can build new houses and gardens</p>
				<p v-if="rules.givePossibleHousesForGarden().length === 0">No suitable houses</p>

				<AddItemBox :itemBeingAdded="rf.ITEM_BOX_HOUSE" />
			</template>

			<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset Working Day</button>
			<button class="actionsLineButton" @click="controller.resetSubphase()">Reset Houses & Gardens</button>
			<button class="actionsLineButton" @click="controller.endWorkingDaySubphase()">Finish Houses & Gardens</button>
		</div>
	</template>

	<!-- Lobbyists Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_LOBBYISTS">
		<div>
			<!-- Milestone: choose and place a new board tile -->
			<template v-if="store.context.lobbyistMilestoneActive">
				<p>For the First Lobbyist Used milestone, you are allowed to add a new tile to the board</p>
				<p>Choose the tile and rotation you would like, then click a highlighted square to place it</p>

				<template v-if="computedAvailableLobbyistTiles.length > 0">
					<!-- Tile choice -->
					<div class="addBoxSection">
						<img v-for="tile in computedAvailableLobbyistTiles" :key="'lt-' + tile" :src="getTileImageSrc(tile)" class="selectable lobbyistTileChoiceImg" :class="{ selectedChoice: store.context.newLobbyistTile === tile }" @click="controller.selectLobbyistMSTile(tile)" :alt="'Tile ' + (tile + 1)" />
					</div>

					<!-- Rotation + preview -->
					<div class="addBoxSection rotationSection">
						<img :src="view.getImage('rot_anticlockwise')" class="rotateButton" @click="rotateMSTile(false)" />
						<div id="newComponentImgDiv">
							<img id="newComponentImg" :src="getTileImageSrc(store.context.newLobbyistTile)" :style="tilePreviewStyle" />
						</div>
						<img :src="view.getImage('rot_clockwise')" class="rotateButton" @click="rotateMSTile(true)" />
					</div>
				</template>
				<p v-else><b>No more tiles</b></p>

				<button class="actionsLineButton" @click="controller.cancelLobbyistMilestone()">Never mind</button>
			</template>

			<!-- Normal lobbying -->
			<template v-else>
				<template v-if="computedLobbyistsRemaining > 0">
					<p>
						You can build a new road or park.
						<br />
						The lobbyist has a range of 2 but can also build next to any road that is within a range of 2.
					</p>

					<template v-if="computedAvailableLobbyistItems > 0">
						<AddItemBox :itemBeingAdded="rf.ITEM_BOX_LOBBYIST" />
					</template>
					<p v-else>Unfortunately there are no more roads or parks available</p>
				</template>
				<p v-else-if="store.context.justLobbied.length === 0">No lobbyists available</p>
			</template>

			<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset Working Day</button>
			<button class="actionsLineButton" @click="controller.resetLobbying()">Reset Lobbying</button>
			<button class="actionsLineButton" @click="controller.endWorkingDaySubphase()">{{ store.context.justLobbied.length === 0 ? "Skip Lobbying" : "Finish Lobbying" }}</button>
		</div>
	</template>

	<!-- New Restaurants Subphase -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_NEW_RESTAURANTS">
		<div>
			<!-- Mailbox milestone: place a free mailbox campaign next to the new restaurant -->
			<template v-if="store.context.restaurantMilestone">
				<p>Choose a mailbox campaign for your 'First New Restaurant' milestone</p>

				<AddItemBox :itemBeingAdded="rf.ITEM_BOX_CAMPAIGN" />

				<p>Click a highlighted square on the map to place your campaign</p>
				<br />
				<button class="actionsLineButton" @click="controller.cancelNewRestaurantMilestone()">Never mind</button>
			</template>

			<!-- Choosing a restaurant to move -->
			<template v-else-if="store.context.newRestaurantAction === 'move'">
				<div class="reminder">
					<img :src="view.getImage(`emp_${store.context.selectedBuildingManager}`)" class="cardImg" alt="manager" />
				</div>
				<p>Choose a restaurant to move</p>
			</template>

			<!-- Placing a new restaurant -->
			<template v-else-if="store.context.newRestaurantAction === 'create'">
				<p>Click a highlighted square to place your restaurant</p>
				<AddItemBox :itemBeingAdded="rf.ITEM_BOX_RESTO" />
			</template>

			<!-- Regional Manager: move an existing restaurant or place a new one -->
			<template v-else-if="store.context.selectedBuildingManager === rf.REGIONAL_MANAGER">
				<div class="reminder">
					<img :src="view.getImage(`emp_${rf.REGIONAL_MANAGER}`)" class="cardImg" alt="Regional Manager" />
				</div>
				<p>Move an existing restaurant or place a new one</p>
				<p>
					<button class="actionsLineButton" @click="controller.chooseBuildAction('move')">Move</button>
					<button class="actionsLineButton" @click="controller.chooseBuildAction('create')">Create</button>
				</p>
			</template>

			<!-- Choosing a manager -->
			<template v-else>
				<template v-if="store.context.noMoreRestaurants">
					<p><span class="cautionText">No more restaurants</span></p>
				</template>
				<template v-else-if="computedRemainingManagers.length > 0">
					<p>Select a Local or Regional Manager</p>
					<div class="allHireableEmployeesDiv">
						<div v-for="(employee, idx) in computedRemainingManagers" :key="idx" class="cardChoiceDiv selectable" @click="controller.selectManager(employee)">
							<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
						</div>
					</div>
				</template>
				<p v-else-if="store.context.justOpened.length === 0">No managers available to open new restaurants</p>
			</template>

			<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">Reset Working Day</button>
			<button class="actionsLineButton" @click="controller.resetSubphase()">Reset New Restaurants</button>
			<button v-if="store.context.restaurantMilestone === false && store.context.newRestaurantAction === ''" class="actionsLineButton" @click="controller.endWorkingDaySubphase()">{{ store.context.justOpened.length === 0 ? "Skip Expanding" : "Finish Expanding" }}</button>
		</div>
	</template>

	<!-- End of Working Day -->
	<template v-if="store.gameflow.subphase === rf.SUBPHASE_CONFIRM_END_TURN">
		<div>
			<p>{{ $t("actionArea.workingDaySummary") }}</p>

			<div id="EODsummaryDiv">
				<table id="EODsummaryTable">
					<thead>
						<tr>
							<th>Phase</th>
							<th>Actions Available</th>
							<th>Actions Taken</th>
							<th>Actions Remaining</th>
							<th>Redo</th>
						</tr>
					</thead>
					<tbody>
						<!-- HIRE -->
						<tr>
							<td>Recruit</td>
							<td>{{ store.context.endOfDaySummaryData.hire.total }}</td>
							<td>
								<template v-for="(emp, idx) in store.context.endOfDaySummaryData.hire.hired" :key="idx">
									<img v-if="emp !== -1" :src="view.getImage(`emp_${emp}`)" class="EODsummaryEmployee" />
									<span v-else>Train</span>
								</template>
							</td>
							<td>
								<span v-if="store.context.endOfDaySummaryData.hire.total === store.context.endOfDaySummaryData.hire.hired.length && store.context.endOfDaySummaryData.hire.salaryReductions === 0" class="EODsummaryGoodSpan">0</span>
								<span v-else-if="store.context.endOfDaySummaryData.hire.hired.length + store.context.endOfDaySummaryData.hire.salaryReductions >= store.context.endOfDaySummaryData.hire.total">{{ store.context.endOfDaySummaryData.hire.total - store.context.endOfDaySummaryData.hire.hired.length }} - Used to reduce salary</span>
								<span v-else class="EODsummaryWarningSpan">
									{{ store.context.endOfDaySummaryData.hire.total - store.context.endOfDaySummaryData.hire.hired.length }}
									<span v-if="store.context.endOfDaySummaryData.hire.salaryReductions > 0">({{ store.context.endOfDaySummaryData.hire.salaryReductions }} can be used to reduce salary)</span>
								</span>
							</td>
							<td><button class="actionsLineButton" @click="controller.redoSubphase(rf.SUBPHASE_HIRING)">Redo</button></td>
						</tr>
						<!-- TRAIN -->
						<tr v-if="store.context.endOfDaySummaryData.train.total > 0">
							<td>Train</td>
							<td>{{ store.context.endOfDaySummaryData.train.total }}</td>
							<td>
								<template v-for="(emp, idx) in store.context.endOfDaySummaryData.train.trained" :key="idx">
									<img :src="view.getImage(`emp_${emp}`)" class="EODsummaryEmployee" />
								</template>
							</td>
							<td>
								<span v-if="store.context.endOfDaySummaryData.train.unused === 0" class="EODsummaryGoodSpan">0</span>
								<span v-else class="EODsummaryWarningSpan">{{ store.context.endOfDaySummaryData.train.unused }}</span>
							</td>
							<td><button class="actionsLineButton" @click="controller.redoSubphase(rf.SUBPHASE_TRAINING)">Redo</button></td>
						</tr>
						<!-- MARKET -->
						<tr v-if="store.context.endOfDaySummaryData.market.total > 0">
							<td>Market</td>
							<td>{{ store.context.endOfDaySummaryData.market.total }}</td>
							<td>
								<img v-for="(campaign, idx) in store.context.endOfDaySummaryData.market.marketed" :key="idx" :src="view.getImage(`marketing_campaign_${campaign}`)" class="EODsummaryCampaign" :style="{ width: rf.MARKETING_CAMPAIGNS[campaign].width * 20 + 'px' }" />
							</td>
							<td>
								<span v-if="store.context.endOfDaySummaryData.market.unused.length === 0" class="EODsummaryGoodSpan">0</span>
								<span v-else class="EODsummaryWarningSpan">
									{{ store.context.endOfDaySummaryData.market.unused.length }}
									<template v-for="(emp, idx) in store.context.endOfDaySummaryData.market.unused" :key="idx">
										<img :src="view.getImage(`emp_${emp}`)" class="EODsummaryEmployee" />
									</template>
								</span>
							</td>
							<td><button class="actionsLineButton" @click="controller.redoSubphase(rf.SUBPHASE_MARKETING)">Redo</button></td>
						</tr>
						<!-- PRODUCE -->
						<tr v-if="store.context.endOfDaySummaryData.produce.total > 0">
							<td>Produce</td>
							<td>{{ store.context.endOfDaySummaryData.produce.total }}</td>
							<td>
								<template v-for="(count, idx) in store.context.endOfDaySummaryData.produce.produced" :key="idx">
									<div v-if="count > 0" class="EODsummaryProducedDiv">
										<img :src="view.getImage(`item_${idx}`)" />
										<div class="EODsummaryProducedNumDiv">{{ count }}</div>
									</div>
								</template>
							</td>
							<td>
								<span v-if="store.context.endOfDaySummaryData.produce.unused.length === 0" class="EODsummaryGoodSpan">0</span>
								<span v-else class="EODsummaryWarningSpan">
									{{ store.context.endOfDaySummaryData.produce.unused.length }}
									<template v-for="(emp, idx) in store.context.endOfDaySummaryData.produce.unused" :key="idx">
										<img :src="view.getImage(`emp_${emp}`)" class="EODsummaryEmployee" />
									</template>
								</span>
							</td>
							<td><button class="actionsLineButton" @click="controller.redoSubphase(rf.SUBPHASE_PRODUCE)">Redo</button></td>
						</tr>
						<!-- HOUSES -->
						<tr v-if="store.context.endOfDaySummaryData.houses.total > 0">
							<td>Build Houses/Gardens</td>
							<td>{{ store.context.endOfDaySummaryData.houses.total }}</td>
							<td>
								<template v-for="(item, idx) in store.context.endOfDaySummaryData.houses.built" :key="idx">
									<img v-if="item === -1" :src="view.getImage('garden')" class="EODsummaryHouseGarden" />
									<img v-else :src="view.getImage('house_small')" class="EODsummaryHouseGarden" />
								</template>
							</td>
							<td>
								<span v-if="store.context.endOfDaySummaryData.houses.total === store.context.endOfDaySummaryData.houses.built.length" class="EODsummaryGoodSpan">0</span>
								<span v-else class="EODsummaryWarningSpan">
									{{ store.context.endOfDaySummaryData.houses.total - store.context.endOfDaySummaryData.houses.built.length }}
								</span>
							</td>
							<td><button class="actionsLineButton" @click="controller.redoSubphase(rf.SUBPHASE_HOUSES)">Redo</button></td>
						</tr>
						<!-- LOBBY -->
						<tr v-if="store.context.endOfDaySummaryData.lobby.total > 0">
							<td>Lobby</td>
							<td>{{ store.context.endOfDaySummaryData.lobby.total }}</td>
							<td>
								<template v-for="(item, idx) in store.context.endOfDaySummaryData.lobby.built" :key="idx">
									<img v-if="item[0] === 1" :src="view.getImage(`road_${item[1]}`)" class="EODsummaryLobby" :style="{ height: lobbyItemHeight(item) }" />
									<img v-else-if="item[0] === 0" :src="view.getImage(`park_${item[1]}`)" class="EODsummaryLobby" :style="{ height: lobbyItemHeight(item) }" />
								</template>
							</td>
							<td>
								<span v-if="store.context.endOfDaySummaryData.lobby.total === store.context.endOfDaySummaryData.lobby.built.length" class="EODsummaryGoodSpan">0</span>
								<span v-else class="EODsummaryWarningSpan">
									{{ store.context.endOfDaySummaryData.lobby.total - store.context.endOfDaySummaryData.lobby.built.length }}
								</span>
							</td>
							<td><button class="actionsLineButton" @click="controller.redoSubphase(rf.SUBPHASE_LOBBYISTS)">Redo</button></td>
						</tr>
						<!-- MANAGERS (New Restaurants) -->
						<tr v-if="store.context.endOfDaySummaryData.managers.total > 0">
							<td>New Restaurants</td>
							<td>{{ store.context.endOfDaySummaryData.managers.total }}</td>
							<td>
								<img v-for="(item, idx) in store.context.endOfDaySummaryData.managers.built" :key="idx" :src="view.getImage(`emp_${item}`)" class="EODsummaryEmployee" />
							</td>
							<td>
								<span v-if="Math.min(store.context.endOfDaySummaryData.managers.total - store.context.endOfDaySummaryData.managers.built.length, 3 - controller.currentPlayerObj().restaurants.length) <= 0" class="EODsummaryGoodSpan">0</span>
								<span v-else class="EODsummaryWarningSpan">
									{{ Math.min(store.context.endOfDaySummaryData.managers.total - store.context.endOfDaySummaryData.managers.built.length, 3 - controller.currentPlayerObj().restaurants.length) }}
								</span>
							</td>
							<td><button class="actionsLineButton" @click="controller.redoSubphase(rf.SUBPHASE_NEW_RESTAURANTS)">Redo</button></td>
						</tr>
					</tbody>
				</table>
			</div>

			<p>You are about to confirm the whole Working Day</p>

			<template v-if="store.gameflow.turn === 1 && eodCurrentSalary === 0">
				<p v-if="controller.currentPlayerObj().beach.length === 0"><b>WARNING: YOU HAVE NOT HIRED ANYONE</b></p>
				<button class="actionsLineButton" @click="controller.resetWholeTurn()">Reset Whole Turn</button>
				<button class="actionsLineButton" @click="endTurnPlayPayday">End Turn</button>
			</template>

			<template v-else-if="eodIsLastOrShort">
				<button class="actionsLineButton" @click="controller.resetWholeTurn()">Reset Whole Turn</button>
				<button class="actionsLineButton" @click="endTurnPlayPayday">End Turn</button>
			</template>

			<template v-else-if="(eodCurrentSalary === 0 && store.gameflow.turn <= 2) || store.startingOptions.strictPaydayFridge">
				<p v-if="eodCurrentSalary === 0 && store.gameflow.turn <= 2 && !store.startingOptions.strictPaydayFridge">Payday will be skipped as you have no salary to pay and it is turn 1 or 2</p>
				<p v-else>Payday will be played in turn order</p>
				<button class="actionsLineButton" @click="controller.resetWholeTurn()">Reset Whole Turn</button>
				<button class="actionsLineButton" @click="endTurnPlayPayday">End Turn</button>
			</template>

			<template v-else-if="eodTriButton">
				<p>You have <b>enough money</b> to keep all your employees. You can decide now to keep all of them in order to save time</p>
				<button class="actionsLineButton" @click="controller.resetWholeTurn()">Reset the whole working day</button>
				<button class="actionsLineButton" @click="endTurnPlayPayday">End Turn. Play Payday Phase</button>
				<button class="actionsLineButton" @click="endTurnAutoPay">End Turn. Auto-pay salaries and keep all employees</button>
			</template>

			<template v-else>
				<button class="actionsLineButton" @click="controller.resetWholeTurn()">Reset Whole Turn</button>
				<button class="actionsLineButton" @click="endTurnPlayPayday">End Turn</button>
			</template>
		</div>
	</template>
</template>

<style scoped>
/** GENERAL WORKING DAY */
.boxReminderImg {
	width: 105px;
	height: 150px;
	vertical-align: middle;
	margin-left: 10px;
}

.selectable {
	cursor: pointer;
	border: 4px solid yellow;
}
.selectable:hover {
	border-color: lightgreen;
}

.selected {
	border-color: lightgreen !important;
	border-width: 5px !important;
}

.cardImg {
	width: 100%;
	height: 100%;
}

.cardSummaryDiv {
	border-radius: 10px;
	box-sizing: border-box;
	width: 97px;
	height: 150px;
	margin: 5px;
	display: inline-block;
	overflow: hidden;
	border: 2px solid black;
}

/* hired-line cards: yellow outline until hovered */
.hiredLine .cardSummaryDiv.selectable:not(:hover) {
	border: 3px solid yellow;
}
.hiredLine .cardSummaryDiv.selectable:hover {
	border: 3px solid lightgreen;
}

.resetWorkingDayButton {
	margin-right: 60px;
}

/** JUST TRAINED SUMMARY */
.reminder > .cardImg {
	width: auto;
	height: 150px;
}

.nightShiftIcon {
	width: auto;
	height: 60px;
	margin-left: 8px;
}

.oldTrainedEmployee {
	border: 2px solid black;
	border-radius: 10%;
	position: relative;
	left: 25px;
}

.newTrainedEmployee {
	border: 2px solid black;
	border-radius: 15px;
	position: relative;
	left: -25px;
}

/** CHOOSE RESERVE */
.cardChoiceDiv {
	border-radius: 10px;
	box-sizing: border-box;
	width: 160px;
	height: 250px;
	margin: 5px;
	display: inline-block;
	overflow: hidden;
}

/** PRODUCE */
.productionOptionsDiv,
.productionItemOptionsDiv {
	display: inline-block;
}

.producedCardSummary {
	vertical-align: middle;
}

.productionItemSummaryDiv {
	width: fit-content;
	height: fit-content;
	position: relative; /* Essential for absolute positioning of the span */
	display: inline-block;
	align-items: center;
	justify-content: center;
	margin-right: 10px;
	vertical-align: middle;
}

.producedNumber {
	font-size: 35px;
	position: absolute;
	/* Centering logic */
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);

	/* Styling to make it readable over an image */
	font-weight: bold;
	color: white;
	text-shadow:
		1px 1px 2px black,
		-1px -1px 2px black,
		1px -1px 2px black,
		-1px 1px 2px black;
	pointer-events: none; /* Prevents the number from blocking clicks on the image */
}

.productionItemOptionsDiv {
	margin-right: 10px;
}

.producedItemSummaryImg {
	width: 100%;
	height: 100%;
	display: block;
	filter: drop-shadow(3px 0 0 black) drop-shadow(0 3px 0 black) drop-shadow(-3px 0 0 black) drop-shadow(0 -3px 0 black);
}
.producerItemOptionImg {
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow);
}
.producerItemOptionImg:hover {
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen);
}
/** EOD SUMMARY */
#EODsummaryDiv {
	border: 2px solid black;
	padding: 5px;
	width: fit-content;
	margin: auto;
}
#EODsummaryTable {
	border-collapse: collapse;
	min-width: 600px;
	margin: auto;
}

#EODsummaryTable td,
#EODsummaryTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#EODsummaryTable tr {
	cursor: pointer;
	text-align: center;
}

#EODsummaryTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#EODsummaryTable tr:nth-child(odd) {
	background-color: white;
}

#EODsummaryTable tr:hover {
	background-color: #ddd;
}

#EODsummaryTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.EODsummaryEmployee {
	width: 32.5px;
	height: 50.5px !important;
	vertical-align: middle;
	margin-left: 1px;
	margin-right: 1px;
	border: 1px solid black;
	box-sizing: border-box;
	border-radius: 10%;
}

.EODsummaryCampaign {
	vertical-align: middle;
	margin-right: 5px;
}

.EODsummaryWarningSpan {
	background-color: yellow;
	color: darkred;
	padding: 5px;
}

.EODsummaryGoodSpan {
	color: black;
	background-color: lightgreen;
	padding: 5px;
}

.EODsummaryHouseGarden {
	width: 32.5px !important;
}

.EODsummaryProducedDiv {
	height: 40px !important;
	display: inline-block;
	position: relative;
}

.EODsummaryProducedDiv img {
	height: 40px !important;
	margin: 5px;
}

.EODsummaryProducedNumDiv {
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	text-align: center;
	justify-content: center;
	vertical-align: middle;
	color: white;
	text-shadow:
		-2px -2px 0 #000,
		2px -2px 0 #000,
		-2px 2px 0 #000,
		2px 2px 0 #000;
	font-size: 40px;
}

.EODsummaryLobby {
	vertical-align: middle;
	margin-right: 5px;
}

.cautionText {
	background-color: lightgoldenrodyellow;
	color: darkred;
	font-weight: bolder;
}

/* Lobbyist milestone tile selector */
.lobbyistTileChoiceImg {
	width: 100px;
	height: 100px;
	margin: 5px;
	border: 3px solid black;
	cursor: pointer;
}
.lobbyistTileChoiceImg.selectedChoice {
	border-color: lightgreen;
}
.lobbyistTileChoiceImg:hover {
	border-color: yellow;
}
.addBoxSection {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	padding: 6px 8px;
	border: 1px solid black;
	margin: 5px auto;
	width: fit-content;
}
.rotationSection {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 35px;
}
.rotateButton {
	width: 37px;
	height: 37px;
	border: 1px solid black;
	border-radius: 15px;
	cursor: pointer;
}
.rotateButton:hover {
	border-color: yellow;
}
</style>
