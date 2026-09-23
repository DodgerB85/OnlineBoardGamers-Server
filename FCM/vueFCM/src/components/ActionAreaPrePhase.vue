<script setup>
import * as rf from "../js/FCMreference"
import * as rules from "../js/FCMrules"
import * as plyr from "../js/FCMplayer"
import * as view from "../js/FCMview"
import * as IO from "../backend/FCM_IO"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { computed, ref } from "vue"

const emit = defineEmits(["close"])

const props = defineProps({
	mode: { type: String, required: true },
})

const playerObj = computed(() => personal.pov >= 0 ? store.players[personal.pov] : null)
const playerIndex = computed(() => personal.pov)

// --- Save state on mount for cancel/reset ---
const savedBeach = ref([])
const savedEmployees = ref([])
const savedResources = ref([])
const savedPreMoveData = ref(null)
const savedJustFired = ref([])

function saveState() {
	savedBeach.value = [...playerObj.value.beach]
	savedEmployees.value = [...playerObj.value.employees]
	savedResources.value = [...playerObj.value.resources]
	savedPreMoveData.value = JSON.parse(JSON.stringify(store.context.preMoveData))
	savedJustFired.value = [...store.context.justFired]
}
saveState()

// Clear previous preset data on entry
if (props.mode === "payday") {
	store.context.preMoveData[0][0].splice(0)
	store.context.preMoveData[0][1].splice(0)
}
if (props.mode === "cleanup") {
	store.context.preMoveData[1].splice(0)
}

// --- PAYDAY PRE-PHASE ---
const salaryRequired = new Set(rf.REQUIRE_SALARY)
const paydayFlow = ref("")

const sortedFireableEmployees = computed(() => {
	if (props.mode !== "payday") return []
	const b = rules.fireableEmployees(playerIndex.value)
	return [...b].sort((a, b) => {
		const aRequires = salaryRequired.has(a) ? 0 : 1
		const bRequires = salaryRequired.has(b) ? 0 : 1
		return aRequires - bRequires
	})
})

const actualFiredEmployees = computed(() => {
	return store.context.preMoveData[0][0].filter((e) => typeof e !== "number" || e > 0)
})

const unfireableMarketers = computed(() => {
	if (!playerObj.value) return []
	return playerObj.value.marketers.filter((m, i) => i !== playerObj.value.additionalCampaignArrayIndex && !m.nightShift)
})

const currentSalary = computed(() => rules.salary(playerIndex.value))
const canAfford = computed(() => rules.canAffordPayDay(playerIndex.value))
const canPayWithFood = computed(() => rules.canPayWithFood(playerIndex.value))
const hasTrainerMS = computed(() => plyr.hasMilestone(playerIndex.value, rf.FIRST_TRAINER_USED))
const hasBeerMS = computed(() => plyr.hasMilestone(playerIndex.value, rf.FIRST_BEER_SOLD))
const hasWaitressMS = computed(() => plyr.hasMilestone(playerIndex.value, rf.FIRST_WAITRESS_USED))
const unitarySalary = computed(() => hasWaitressMS.value ? 3 : 5)
const nbPays = computed(() => Math.ceil(currentSalary.value / unitarySalary.value))
const leftToPay = computed(() => nbPays.value - store.context.preMoveData[0][1].length)

const sortedFoodResources = computed(() => {
	if (props.mode !== "payday") return []
	return [...playerObj.value.resources].filter((r) => r !== rf.COFFEE).sort()
})

function preFireEmployee(employee) {
	plyr.fireEmployee(playerIndex.value, employee)
	store.context.preMoveData[0][0].push(employee)
}

function unFireEmployee(employee) {
	const idx = store.context.preMoveData[0][0].indexOf(employee)
	if (idx === -1) return
	store.context.preMoveData[0][0].splice(idx, 1)
	playerObj.value.beach.push(employee)
}

function useResourceToPaySalary(good) {
	const idx = playerObj.value.resources.indexOf(good)
	if (idx > -1) playerObj.value.resources.splice(idx, 1)
	store.context.preMoveData[0][1].push(good)
}

function undoPaySalaryWithResource(idx) {
	const food = store.context.preMoveData[0][1][idx]
	store.context.preMoveData[0][1].splice(idx, 1)
	playerObj.value.resources.push(food)
}

function autoDetermineFlag() {
	if (store.context.preMoveData[0][0].length === 0) {
		if (hasBeerMS.value && !hasFridge.value) store.context.preMoveData[0][0].push(-4)
		else if (currentSalary.value === 0) store.context.preMoveData[0][0].push(-1)
		else if (currentSalary.value <= playerObj.value.money) store.context.preMoveData[0][0].push(-2)
		else if (hasTrainerMS.value) store.context.preMoveData[0][0].push(-5)
		else store.context.preMoveData[0][0].push(-3)
	}
}

// --- CLEANUP PRE-PHASE ---
const hasFridge = computed(() => playerObj.value && plyr.hasFridge(playerIndex.value))
const hasKimchiFridgeCollision = computed(() => rules.kimchiFridgeCollision(playerIndex.value))

const fridgeItems = computed(() => {
	if (props.mode !== "cleanup" || !hasFridge.value) return []
	return [...playerObj.value.resources].sort()
})

function addToCleanupPriority(good) {
	store.context.preMoveData[1].push(good)
}

function chooseKimchi() {
	const nbKimchi = playerObj.value.resources.filter((r) => r === rf.KIMCHI).length
	const rest = playerObj.value.resources.filter((r) => r !== rf.KIMCHI)
	store.context.justBinned = (store.context.justBinned || []).concat(rest)
	playerObj.value.resources = Array(Math.min(nbKimchi, 10)).fill(rf.KIMCHI)
}

function chooseRest() {
	const rest = playerObj.value.resources.filter((r) => r !== rf.KIMCHI)
	const nbKimchi = playerObj.value.resources.filter((r) => r === rf.KIMCHI).length
	store.context.justBinned = (store.context.justBinned || []).concat(Array(nbKimchi).fill(rf.KIMCHI))
	playerObj.value.resources = rest
}

// --- BUTTON HANDLERS ---
function cancel() {
	playerObj.value.beach = [...savedBeach.value]
	playerObj.value.employees = [...savedEmployees.value]
	playerObj.value.resources = [...savedResources.value]
	store.context.preMoveData = JSON.parse(JSON.stringify(savedPreMoveData.value))
	store.context.justFired.splice(0)
	emit("close")
}

function reset() {
	playerObj.value.beach = [...savedBeach.value]
	playerObj.value.employees = [...savedEmployees.value]
	playerObj.value.resources = [...savedResources.value]
	store.context.justFired.splice(0)
	store.context.preMoveData[0] = [[], []]
	if (props.mode === "cleanup") {
		store.context.preMoveData[1] = []
	}
}

function savePayday() {
	playerObj.value.beach = [...savedBeach.value]
	playerObj.value.employees = [...savedEmployees.value]
	playerObj.value.resources = [...savedResources.value]
	autoDetermineFlag()
	IO.savePreTurn(store.context.preMoveData)
	emit("close")
}

function savePaydayWithFood() {
	playerObj.value.beach = [...savedBeach.value]
	playerObj.value.employees = [...savedEmployees.value]
	playerObj.value.resources = [...savedResources.value]
	if (store.context.preMoveData[0][0].length === 0) store.context.preMoveData[0][0].push(-4)
	IO.savePreTurn(store.context.preMoveData)
	emit("close")
}

function saveCleanup() {
	playerObj.value.beach = [...savedBeach.value]
	playerObj.value.employees = [...savedEmployees.value]
	playerObj.value.resources = [...savedResources.value]
	if (store.context.preMoveData[1].length === 0) store.context.preMoveData[1] = [-1]
	IO.savePreTurn(store.context.preMoveData)
	emit("close")
}
</script>

<template>
	<div>
		<!-- ========== PAYDAY PRE-PHASE ========== -->
		<template v-if="mode === 'payday'">
			<!-- SCREEN 1: FIRE EMPLOYEES -->
			<template v-if="paydayFlow !== 'beer'">
				<div>
					<p>You can pre-select which employees to fire. If you do not have enough money after this, you will play the phase as normal</p>

					<div v-if="unfireableMarketers.length > 0" class="reminder">
						<p>Marketing employees you can't fire:</p>
						<div v-for="m in unfireableMarketers" :key="m.marketer" class="cardSummaryDiv">
							<img :src="view.getImage('emp_' + m.marketer)" class="cardImg" :alt="rf.employeeName(m.marketer)" />
						</div>
					</div>

					<p v-if="canPayWithFood">
						You need to pay: ${{ currentSalary }} or {{ nbPays }} resource tokens (or a mix of both)
					</p>
					<p v-else>
						You need to pay: ${{ currentSalary }}
					</p>

					<p v-if="!canAfford && hasTrainerMS" style="color: #f00">
						You cannot afford to pay all of your employees! However, your
						<i>First Trainer Used</i>
						milestone allows you to keep everyone.
						<br />
						If you wish, you
						<b>may</b>
						click on employees to fire them anyway
					</p>
					<p v-else-if="!canAfford" style="color: #f00">You cannot pay for all of your employees - You must fire employees until you can pay for the remainder</p>

					<!-- Just fired reminder -->
					<div v-if="actualFiredEmployees.length > 0" class="reminder fireLine">
						<img v-for="(emp, i) in actualFiredEmployees" :key="'fired-'+i" :src="view.getImage('emp_' + emp)" class="cardSummaryDiv selectable" :title="$t('actionArea.clickToUnfire')" :alt="rf.employeeName(emp)" @click="unFireEmployee(emp)" />
						<b>You're Fired!&nbsp;</b>
						<img :src="view.getImage('fired')" class="firedImg" />
					</div>

					<!-- Fireable employees -->
					<div>
						<div v-for="emp in sortedFireableEmployees" :key="emp" class="fireCardChoiceDiv selectable" @click="preFireEmployee(emp)">
							<img :src="view.getImage('emp_' + emp)" class="cardImg" :alt="rf.employeeName(emp)" />
						</div>
					</div>
				</div>
			</template>

			<!-- SCREEN 2: CHOOSE FOOD PAYMENT -->
			<template v-if="paydayFlow === 'beer'">
				<template v-if="leftToPay > 0">
					<p>
						You have to pay for {{ nbPays }} employee{{ nbPays !== 1 ? 's' : '' }}.
						Choose the item{{ leftToPay !== 1 ? 's' : '' }} you want to use:
					</p>
				</template>
				<p v-else>All employees are covered by food items</p>
				<div v-if="store.context.preMoveData[0][1].length > 0" class="reminder fireLine">
					<img :src="view.getImage(rf.MILESTONES_STR[rf.FIRST_THROW_AWAY].img)" class="payBinIcon" alt="bin" />
					<img v-for="(food, i) in store.context.preMoveData[0][1]" :key="'paid-'+i" :src="view.getImage('item_' + food)" class="payFoodToken paidToken" :alt="food" @click="undoPaySalaryWithResource(i)" />
				</div>
				<p>You are currently paying <b>${{ Math.max(0, currentSalary - store.context.preMoveData[0][1].length * unitarySalary) }}</b> and <b>{{ store.context.preMoveData[0][1].length }}</b> item{{ store.context.preMoveData[0][1].length !== 1 ? 's' : '' }}</p>
				<div>
					<img v-for="(food, i) in sortedFoodResources" :key="'food-'+i" :src="view.getImage('item_' + food)" class="payFoodToken selectable" :alt="food" @click="useResourceToPaySalary(food)" />
				</div>
			</template>
		</template>

		<!-- ========== CLEANUP PRE-PHASE ========== -->
		<template v-if="mode === 'cleanup'">
			<template v-if="hasFridge && hasKimchiFridgeCollision">
				<p>You can store either Kimchi or other types of food/drink in a fridge</p>
				<p>Your items:</p>
				<div class="fridgeItems">
					<img v-for="(food, i) in fridgeItems" :key="'cki-'+i" :src="view.getImage('item_' + food)" class="payFoodToken" :alt="food" />
				</div>
				<button class="actionsLineButton choice-button" @click="chooseKimchi">Store Kimchi</button>
				<button class="actionsLineButton choice-button" @click="chooseRest">Store other items</button>
			</template>
			<template v-else-if="fridgeItems.length > 0 || store.context.preMoveData[1].length > 0">
				<p>Your fridge can store up to 10 items. Some may be sold during the Dinnertime phase.</p>
				<p>Click items in the priority you would like them to be stored</p>

				<div v-if="store.context.preMoveData[1].length > 0">
					Highest Priority to store &gt;
					<img v-for="(item, i) in store.context.preMoveData[1]" :key="'prior-'+i" :src="view.getImage('item_' + item)" class="preTurnFoodImg" :alt="item" />
					&lt; Lowest Priority to store
				</div>

				<div class="fridgeItems">
					<img v-for="(food, i) in fridgeItems" :key="'fr-'+i" :src="view.getImage('item_' + food)" class="fridgeSelectable" :alt="food" @click="addToCleanupPriority(food)" />
				</div>
			</template>
			<template v-else>
				<p>No items to store</p>
			</template>
		</template>

		<!-- ========== COMMON BUTTONS ========== -->
		<div>
			<br />
			<button class="actionsLineButton" @click="cancel">Cancel Pre-{{ mode === 'payday' ? 'Payday' : 'Fridge' }}</button>
			<button class="actionsLineButton" @click="reset">Reset {{ mode === 'payday' ? 'Payday' : 'Clean Up' }}</button>
			<template v-if="mode === 'payday'">
				<template v-if="paydayFlow !== 'beer'">
					<button v-if="hasBeerMS && canPayWithFood" class="actionsLineButton" @click="paydayFlow = 'beer'">Choose payment type</button>
					<button v-else class="actionsLineButton" @click="savePayday">Save Payday Turn</button>
				</template>
				<template v-if="paydayFlow === 'beer'">
					<button class="actionsLineButton" @click="savePaydayWithFood">Pay the rest in $$$ - Save Payday Turn</button>
				</template>
			</template>
			<template v-if="mode === 'cleanup'">
				<button class="actionsLineButton" @click="saveCleanup">Save Fridge Turn</button>
			</template>
		</div>
	</div>
</template>

<style scoped>
.cardImg {
	width: 100%;
	height: 100%;
}

.fireCardChoiceDiv {
	border-radius: 10px;
	box-sizing: border-box;
	width: 160px;
	height: 250px;
	margin: 5px;
	display: inline-block;
	overflow: hidden;
}

.fireLine {
	display: flex;
	align-items: center;
	justify-content: center;
}

.payBinIcon {
	height: 25px;
	vertical-align: middle;
	margin-right: 4px;
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

.selectable {
	cursor: pointer;
	border: 3px solid yellow;
}
.selectable:hover {
	border-color: lightgreen;
}

.payFoodToken {
	margin: 5px;
	vertical-align: middle;
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow);
	border: none;
}
.payFoodToken:hover {
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen);
}

.paidToken {
	height: 25px;
	cursor: pointer;
}
.paidToken:hover {
	filter: drop-shadow(1px 1px 2px rgba(200, 0, 0, 0.8));
}

.fridgeItems {
	margin: 5px 0;
}

.fridgeSelectable {
	height: auto;
	max-width: 91px;
	max-height: 91px;
	margin: 4px;
	vertical-align: middle;
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow);
	transition: filter 0.15s ease;
}
.fridgeSelectable:hover {
	cursor: pointer;
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen);
}

.preTurnFoodImg {
	vertical-align: middle;
	height: 30px;
}

.firedImg {
	width: 100px;
	vertical-align: middle;
}

.choice-button {
	margin: 5px;
}
</style>
