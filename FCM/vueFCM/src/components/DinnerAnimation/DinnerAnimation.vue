<script setup>
/**
 * Plays a dinner-time resolution script built by js/dinnerScript.js.
 * Mounted inside #mapTilesDiv (see MapArea.vue) so all steps are positioned
 * relative to the top-left of the board, exactly like the board tokens.
 */
import { computed, onMounted, onBeforeUnmount, watch } from "vue"
import * as rf from "../../js/FCMreference.js"
import * as view from "../../js/FCMview.js"
import { useModelStore } from "../../stores/FCMstore.js"
import { useDinnerAnimationStore } from "../../stores/dinnerAnimation.js"
import i18n from "../../i18n.js"

const store = useModelStore()
const dinner = useDinnerAnimationStore()

const step = computed(() => dinner.current)
const advancing = computed(() => dinner.state.advancing)
const description = computed(() => {
	const s = step.value
	if (!s) return ""
	return i18n.global.t(s.textKey, s.textParams || {})
})

let timer = null
function schedule() {
	clearTimeout(timer)
	if (!advancing.value) return
	timer = setTimeout(() => {
		if (dinner.state.advancing) dinner.tick()
	}, step.value?.ms ?? 800)
}

watch(() => dinner.state.index, schedule)
watch(advancing, (a) => {
	if (a) schedule()
	else clearTimeout(timer)
})
onMounted(schedule)
onBeforeUnmount(() => clearTimeout(timer))

const tokenSize = computed(() => store.refSize / 5.5)

function tokenSrc(good) {
	return view.giveBoardFoodTokenImage(good)
}

// During pickup the demand simply disappears from the house in place.
// Drinks are narrowed exactly like MapArea.tokenStyle does for the board,
// so the animated load matches what the player already knows.
function tokenStyle(t) {
	let size = tokenSize.value
	let x = t.x
	if (t.good === rf.BEER || t.good === rf.COKE) {
		x += size / 4.5
		size /= 2
	} else if (t.good === rf.LEMONADE) {
		x += size / 5
		size /= 1.5
	}
	return { left: x + "px", top: t.y + "px", width: size + "px" }
}

function tokenClass() {
	return { pickup: step.value.type === "pickup" }
}

// History-time demand overlay: a house's tokens show until its own delivery
// starts (or forever when it was never visited); the live board display is
// suppressed while playback runs so only one version of demand is visible.
function activeOverlay() {
	if (!dinner.state.overlay.length) return []
	const res = []
	for (const house of dinner.state.overlay) {
		if (dinner.state.index >= house.hideAfter) continue
		for (const t of house.tokens) res.push(t)
	}
	return res
}

// Small goods icons riding on top of the car while it drives.
// Drinks (tall images) get a height-capped box so they don't tower over the car.
function carCargoStyle(i, n) {
	return {
		width: store.refSize / 8 + "px",
		height: store.refSize / 7 + "px",
		objectFit: "contain",
		objectPosition: "bottom",
		left: ((i + 0.5) * 100) / n + "%",
	}
}

function cargoIcons() {
	return step.value?.carrying || []
}

// On arrival the cargo fades out as it turns into the income popup.
function cargoClass() {
	return { arrived: step.value.type === "arrive" }
}

// The builder flags the exact steps where the range count went up (tile-border
// crossings), so the HUD pulses only on those steps.
function bumpClass() {
	return { bump: step.value.bump === true }
}

function carStyle() {
	// A new delivery snaps the car to the next house; driving slides.
	const dur = (step.value.snap ? 0 : advancing.value ? Math.max(step.value.ms ?? 520, 120) : 250) || 0
	return {
		left: step.value.car.x + "px",
		top: step.value.car.y + "px",
		fontSize: store.refSize * 0.16 + "px",
		transition: `left ${dur}ms linear, top ${dur}ms linear`,
	}
}

function flareBoxStyle() {
	const f = step.value?.flare
	if (!f) return {}
	const sq = store.refSize / 5
	return { left: f.pos.x - sq / 2 + "px", top: f.pos.y - sq / 2 + "px", width: sq + "px", height: sq + "px" }
}

function incomeStyle() {
	const c = step.value?.car
	if (!c) return {}
	return { left: c.x + "px", top: c.y + "px" }
}
</script>

<template>
	<div v-if="step" class="dinnerPlayback">
		<!-- History-time demand for every house not yet collected at this point of the round -->
		<template v-for="(t, oi) in activeOverlay()" :key="'demand' + oi + ':' + t.x + ':' + t.y">
			<img class="dinnerToken" :src="tokenSrc(t.good)" :style="tokenStyle(t)" alt="" />
		</template>

		<!-- Demand tokens sitting on the building; during pickup they fade out right there -->
		<template v-if="step.tokens && step.tokens.length">
			<img
				v-for="(t, ti) in step.tokens"
				:key="'tok' + ti"
				class="dinnerToken"
				:class="tokenClass()"
				:src="tokenSrc(t.good)"
				:style="tokenStyle(t)"
				alt="" />
		</template>

		<!-- The delivery car; cargo + HUD are children so they glide along with every move -->
		<div v-if="step.car" class="dinnerCar" :style="carStyle()">
			🚗
			<img v-for="(g, gi) in cargoIcons()" :key="'cargo' + gi" class="dinnerCarCargo" :class="cargoClass()" :src="tokenSrc(g)" :style="carCargoStyle(gi, step.carrying.length)" alt="" />
			<div v-if="step.range != null" class="dinnerHud">
				<div :key="'r' + step.range" class="dinnerHudLine" :class="bumpClass()">{{ $t("history.animRange", { range: step.range }) }}</div>
				<div :key="'cost' + step.cost" class="dinnerHudLine" :class="bumpClass()">{{ $t("history.animCost", { cost: step.cost }) }}</div>
			</div>
		</div>

		<!-- Coffee sale flash: a selling player's shop on the route earns money -->
		<div v-if="step.type === 'coffee' && step.flare" class="dinnerCoffee" :style="flareBoxStyle()">
			<span class="dinnerCoffeeMoney">+${{ step.flare.amount }}</span>
		</div>

		<!-- Final income on arrival -->
		<div v-if="step.type === 'arrive' && step.car" class="dinnerIncome" :style="incomeStyle()">+${{ step.income }}</div>

		<!-- Control panel: explanation on top, navigation buttons, then counter + close -->
		<div class="dinnerPanel">
			<div class="dinnerDesc">{{ description }}</div>
			<div class="dinnerPanelButtons">
				<template v-if="advancing">
					<button class="dinnerBtn dinnerBtnWide" @click="dinner.toggleAdvancing()">{{ $t("history.animSwitchStep") }}</button>
				</template>
				<template v-else>
					<button class="dinnerBtn" :disabled="dinner.state.index === 0" @click="dinner.jumpStart()">◀◀ {{ $t("history.animStart") }}</button>
					<button class="dinnerBtn" :disabled="dinner.state.index === 0" @click="dinner.prev()">◀ {{ $t("history.animPrev") }}</button>
					<button class="dinnerBtn" :disabled="dinner.atEnd" @click="dinner.next()">{{ $t("history.animNext") }} ▶</button>
					<button class="dinnerBtn" :disabled="dinner.atEnd" @click="dinner.jumpEnd()">{{ $t("history.animEnd") }} ▶▶</button>
				</template>
			</div>
			<div class="dinnerPanelFoot">
				<span class="dinnerProgress">{{ $t("history.animStepOf", { current: dinner.state.index + 1, total: dinner.total }) }}</span>
				<button class="dinnerBtn dinnerBtnClose" @click="dinner.stop()">{{ $t("history.animClose") }}</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dinnerPlayback {
	position: absolute;
	inset: 0;
	z-index: 130;
	pointer-events: none;
}

.dinnerToken {
	position: absolute;
	z-index: 135;
	transform-origin: center;
	transition:
		transform 0.85s ease-in,
		opacity 0.85s ease-in;
}

/* demand vanishes right where it sits as it is loaded into the car */
.dinnerToken.pickup {
	transform: scale(0.15);
	opacity: 0;
}

/* small goods icons riding on the car between pickup and arrival */
.dinnerCar {
	position: absolute;
	z-index: 140;
	transform: translate(-50%, -50%);
	line-height: 1;
}

.dinnerCarCargo {
	position: absolute;
	bottom: 95%;
	transform: translateX(-50%);
	z-index: 1;
	animation: dinnerCargoIn 0.45s ease-out;
}

.dinnerCarCargo.arrived {
	transition:
		opacity 0.6s ease-in,
		transform 0.6s ease-in;
	opacity: 0;
	transform: translateX(-50%) scale(0.2);
}

@keyframes dinnerCargoIn {
	0% {
		opacity: 0;
		transform: translateX(-50%) scale(0.2);
	}
	100% {
		opacity: 1;
		transform: translateX(-50%) scale(1);
	}
}

/* HUD is a child of the car, so it glides along; parked high to keep the cargo visible */
.dinnerHud {
	position: absolute;
	bottom: 170%;
	left: 50%;
	transform: translateX(-50%);
	z-index: 145;
	background: rgba(0, 0, 0, 0.75);
	color: #fff;
	font-size: 12px;
	line-height: 1.25;
	padding: 3px 6px;
	border-radius: 4px;
	white-space: nowrap;
	text-align: center;
	pointer-events: none;
}

.dinnerHudLine {
	display: block;
}

/* the value that just increased flashes so the change is obvious */
.dinnerHudLine.bump {
	animation: dinnerBump 0.6s ease-out;
}

@keyframes dinnerBump {
	0% {
		color: #ffd700;
		transform: scale(1.45);
	}
	100% {
		color: #fff;
		transform: scale(1);
	}
}

.dinnerCoffee {
	position: absolute;
	z-index: 142;
	background: rgba(255, 215, 0, 0.55);
	border-radius: 4px;
	box-shadow: 0 0 8px 2px rgba(255, 215, 0, 0.8);
	overflow: visible;
	pointer-events: none;
}

.dinnerCoffeeMoney {
	position: absolute;
	left: 50%;
	bottom: 100%;
	transform: translateX(-50%);
	font-weight: bold;
	color: #060;
	background: rgba(255, 255, 255, 0.9);
	padding: 1px 4px;
	border-radius: 3px;
	white-space: nowrap;
	animation: dinnerFloat 1s ease-out forwards;
}

.dinnerIncome {
	position: absolute;
	z-index: 144;
	transform: translate(-50%, -50%);
	font-size: 18px;
	font-weight: bold;
	color: #060;
	background: #fff;
	border-radius: 4px;
	padding: 2px 8px;
	pointer-events: none;
	animation: dinnerFloat 1.4s ease-out forwards;
}

@keyframes dinnerFloat {
	0% {
		opacity: 0;
		transform: translate(-50%, -20%);
	}
	15% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -160%);
	}
}

/* Step counter is shown inside the control panel so it reflects every step */
.dinnerProgress {
	color: #fff;
	font-size: 12px;
	white-space: nowrap;
}

.dinnerPanel {
	position: fixed;
	left: 50%;
	bottom: 24px;
	transform: translateX(-50%);
	z-index: 3000;
	background: #333;
	color: #fff;
	border-radius: 8px;
	padding: 10px 14px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-width: 440px;
	min-width: 300px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
	pointer-events: auto;
}

.dinnerDesc {
	font-size: 13px;
	line-height: 1.35;
}

.dinnerPanelButtons {
	display: flex;
	gap: 6px;
	justify-content: center;
}

.dinnerPanelFoot {
	display: flex;
	gap: 10px;
	justify-content: center;
	align-items: center;
	border-top: 1px solid #555;
	padding-top: 6px;
}

.dinnerBtn {
	background: #555;
	color: #fff;
	border: 1px solid #777;
	border-radius: 4px;
	padding: 4px 10px;
	cursor: pointer;
	font-size: 13px;
}

.dinnerBtnWide {
	padding: 4px 22px;
}

.dinnerBtn:hover:not(:disabled) {
	background: #666;
}

.dinnerBtn:disabled {
	opacity: 0.4;
	cursor: default;
}
</style>