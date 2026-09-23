<script setup>
import * as rf from "../../js/FCMreference"
import * as view from "../../js/FCMview"
import * as controller from "../../js/FCMcontroller"
import * as rules from "../../js/FCMrules"
import * as IO from "../../backend/FCM_IO"

import { useModelStore } from "../../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { ref, computed, watch, nextTick } from "vue"

// --- Props & Emits ---
const props = defineProps({
	itemBeingAdded: Number, // e.g., rf.ITEM_BOX_RESTO / rf.ITEM_BOX_CAMPAIGN
	colour: Number,
})

const isCampaign = props.itemBeingAdded === rf.ITEM_BOX_CAMPAIGN
const isHouse = props.itemBeingAdded === rf.ITEM_BOX_HOUSE
const isLobbyist = props.itemBeingAdded === rf.ITEM_BOX_LOBBYIST
const isFreeway = props.itemBeingAdded === rf.ITEM_BOX_FREEWAY
const isResto = props.itemBeingAdded === rf.ITEM_BOX_RESTO
const isUrbanPlanning = props.itemBeingAdded === rf.ITEM_BOX_URBAN_PLANNING
const isUrbanPlanningPlus = isUrbanPlanning && store.startingOptions.urbanPlanningPlus

// --- Rotation state ---
const currentDegrees = ref(store.context.rotation * 90)
const suppressTransition = ref(false)

function isTwoRotationItem() {
	if (isHouse && !store.startingOptions.hawkers) return true
	if (isCampaign || isFreeway) return true
	if (isLobbyist && lobbyistHasTwoRotations()) return true
	return false
}

// For 2-rotation items, snap to nearest 0/90; for 4-rotation, nearest 0/90/180/270
function nearestValidDegrees(deg) {
	const step = Math.round(deg / 90) * 90
	if (isTwoRotationItem()) return (step % 180 + 180) % 180
	return ((step % 360) + 360) % 360
}

// Keep currentDegrees in sync when store.context.rotation is reset externally
// (e.g. selecting a new campaign, new building, etc.)
watch(() => store.context.rotation, (newRot) => {
	const nearest = nearestValidDegrees(currentDegrees.value)
	const target = newRot * 90
	if (nearest !== target) snapDegrees(target)
})

// Single watcher: reset rotation when the active item context changes
const activeItemIdentity = computed(() => {
	if (isCampaign) return store.context.campaign
	if (isHouse) return store.context.selectedBuilding
	if (isLobbyist) return `${store.context.buildingType}-${store.context.variety}`
	if (isUrbanPlanning) return store.context.nextUrbanPlanningTile
	return null
})

watch(activeItemIdentity, () => snapDegrees(0))

// Degrees accumulate freely so the CSS transition always spins in the clicked
// direction (rotate(450deg) == rotate(90deg) visually)
watch(currentDegrees, (deg) => {
	if ((isHouse || isCampaign || isFreeway) && isTwoRotationItem()) store.context.rotation = Math.round(deg / 90) % 2 === 0 ? 0 : 1
	else if (isLobbyist) {
		if (lobbyistHasTwoRotations()) store.context.rotation = Math.round(deg / 90) % 2 === 0 ? 0 : 1
		else store.context.rotation = (((Math.round(deg / 90) % 4) + 4) % 4)
	} else store.context.rotation = (((Math.round(deg / 90) % 4) + 4) % 4)

	if (isFreeway) controller.applyFreewayHighlightsForCurrentRotation()
	else if (isResto && (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2)) {
		store.highlights.indexesToHighlightYellow = rules.givePossibleStartingRestaurantsPosition(store.context.rotation)
	}
})

// Reset rotation without animating (new building/variety selected)
function snapDegrees(deg) {
	suppressTransition.value = true
	currentDegrees.value = deg
	nextTick(() => {
		suppressTransition.value = false
	})
}


const rotationStyle = computed(() => {
	return {
		transform: `rotate(${currentDegrees.value}deg)`,
		transition: suppressTransition.value ? "none" : "transform 0.3s ease-in-out",
	}
})

function rotateClockwise() {
	if (isCampaign && !computedRotatableCampaign.value) return
	if (isCampaign) controller.rotateCampaign()
	currentDegrees.value += 90
	if (isLobbyist) nextTick(() => controller.updateLobbyistHighlights())
}

function rotateAntiClockwise() {
	if (isCampaign && !computedRotatableCampaign.value) return
	if (isCampaign) controller.rotateCampaign()
	currentDegrees.value -= 90
	if (isLobbyist) nextTick(() => controller.updateLobbyistHighlights())
}

/*** END Rotation ***/

// --- URBAN PLANNING ---

const computedAvailableUrbanPlanningTiles = computed(() => rules.availableUrbanPlanningTiles())

function getUrbanPlanningTileSrc(tile) {
	const numStr = tile < 9 ? "0" + (tile + 1) : "" + (tile + 1)
	return view.getImage("map" + numStr)
}

// Index (in tiles) of the slot holding the current UP tile, or -1
// Tiles are stored as [tileNum, rotation, tileNum, rotation, ...] so tile
// numbers are always at even indices.  A plain indexOf could match a
// rotation value that happens to equal the tile number (odd index), which
// would cause confirmUrbanPlanning to silently skip writing the rotation.
function currentUPTileIndex() {
	for (let i = 0; i < store.mapData.tiles.length; i += 2) {
		if (store.mapData.tiles[i] === store.context.nextUrbanPlanningTile) return i
	}
	return -1
}

function selectUrbanPlanningTile(tile) {
	const idx = currentUPTileIndex()
	if (idx !== -1) store.mapData.tiles[idx] = tile
	store.context.nextUrbanPlanningTile = tile
	view.setMapDisplayTiles()
}

function confirmUrbanPlanning() {
	const idx = currentUPTileIndex()
	if (idx !== -1) store.mapData.tiles[idx + 1] = store.context.rotation
	view.setMapDisplayTiles()
	IO.saveInProgressMap()
}

function getImageForItemBox() {
	if (props.itemBeingAdded === rf.ITEM_BOX_RESTO) {
		const colour = personal.getCorrectedColour(controller.currentPlayerObj().colour)
		const soon = store.context.selectedBuildingManager === rf.LOCAL_MANAGER
		return view.getImage((soon ? "player_resto_soon_" : "player_resto_open_") + colour)
	}
}

// --- HOUSE / GARDEN MODE ---

function houseSelectedItemImage() {
	if (store.context.selectedBuilding === -1) return view.getImage("garden")
	return view.getImage("house_garden")
}

// --- CAMPAIGN OPTIONS ---

const computedMaxDuration = computed(() => rules.giveMaxDurationForMarketer(store.context.marketer))

const computedRotatableCampaign = computed(() => {
	const campaignData = rf.MARKETING_CAMPAIGNS[store.context.campaign]
	if (!campaignData || !campaignData.width) return false
	return campaignData.width !== campaignData.height && campaignData.type !== rf.GIANT_BILLBOARD
})

const secondGoodChoices = computed(() => [0, 1, 2, 3, 4].filter((good) => good !== store.context.good))

const computedCampaignPreviewSrc = computed(() => {
	const campaignData = rf.MARKETING_CAMPAIGNS[store.context.campaign]
	if (!campaignData || !campaignData.width) return ""
	let imgName = "campaign_" + store.context.campaign
	if (store.context.double && store.context.secondGood > -1 && campaignData.type === rf.AIRPLANE) imgName += "a"
	return view.getImage(imgName)
})

const computedPreviewWidth = computed(() => {
	const campaignData = rf.MARKETING_CAMPAIGNS[store.context.campaign]
	if (!campaignData || !campaignData.width) return { width: "120px" }
	return { width: campaignData.width * 25 + "px" }
})

// Rotation row must stay tall enough to contain the preview when rotated
// (CSS transforms don't affect layout, so the row needs a min-height)
const computedRotationMinHeight = computed(() => {
	const campaignData = rf.MARKETING_CAMPAIGNS[store.context.campaign]
	if (!campaignData || !campaignData.height) return "60px"
	return Math.max(campaignData.width, campaignData.height) * 25 + 20 + "px"
})

function campaignChoiceStyle(campaign) {
	const campaignData = rf.MARKETING_CAMPAIGNS[campaign]
	const style = {}
	if (campaignData && campaignData.width) {
		style.width = campaignData.width * 25 + "px"
		// For campaign 4, add rotation to show it in the correct orientation (1 width 2 height)
		if (campaign === 4) {
			style.transform = "rotate(90deg)"
		}
	}
	return style
}

// --- LOBBYIST MODE ---

const computedAvailableRoads = computed(() => rules.availableNewRoads())
const computedAvailableParks = computed(() => rules.availableParks())

// Road 0/1 and park 0 are rectangles (2 rotations); the rest have 4
function lobbyistHasTwoRotations() {
	const buildingType = store.context.buildingType
	const v = store.context.variety
	return (buildingType === 0 && (v === 0 || v === 1)) || (buildingType === 1 && v === 0)
}

const computedLobbyistPreviewSrc = computed(() => {
	const buildingType = store.context.buildingType
	const v = store.context.variety
	if (buildingType === 0) return view.getImage("road_" + v + "_UC")
	return view.getImage("park_" + v)
})

// Preview div uses rotationStyle (same as restaurant) for smooth continuous rotation
const lobbyistPreviewStyle = computed(() => {
	const buildingType = store.context.buildingType
	const v = store.context.variety
	// Size container to fit the image (unrotated dimensions)
	let w = 100
	if (buildingType === 0) {
		if (v === 1) w = 200
	} else {
		if (v === 0) w = 200
		else w = 150
	}
	return {
		...rotationStyle.value,
		width: w + "px",
		height: "auto",
		display: "inline-block",
		position: "relative",
	}
})

const lobbyistImageStyle = computed(() => {
	const buildingType = store.context.buildingType
	const v = store.context.variety
	let w = "100px"
	if (buildingType === 0 && v === 1) w = "200px"
	else if (buildingType === 1 && v === 0) w = "200px"
	else if (buildingType === 1 && v >= 1) w = "150px"
	return { width: w }
})

// Flip wrapper: mirrors the image + anchor (combines with the rotated outerdiv 
const lobbyistFlipStyle = computed(() => ({
	position: "relative",
	display: "inline-block",
	transform: store.context.flipped ? "scaleX(-1)" : "none",
	transition: "transform 0.3s ease-in-out",
}))

// Anchor square overlay (yellow) for T/L parks. It lives inside the flip
// wrapper (so it mirrors with the image) and inside the rotated wrapper (so it
// rotates with the preview). Its cell is recomputed per (rotation, flipped)
// from the park model's highlightOffset so it always sits on the true
// placement anchor.
const computedShowAnchor = computed(() => isLobbyist && store.context.buildingType === 1 && (store.context.variety === 1 || store.context.variety === 2))

const computedAnchorStyle = computed(() => {
	const v = store.context.variety
	const rot = store.context.rotation
	const flipped = store.context.flipped
	const W0 = 3
	const H0 = 2
	const parkModel = rf.getParkModel(v, rot, flipped)
	const offset = parkModel[0][0] === 1 ? 0 : parkModel[0][1] === 1 ? 1 : 2

	// Inverse of rotation(rot), then inverse of flip, applied to (offset, 0)
	let c1, r1
	if (rot === 0) { c1 = offset; r1 = 0 }
	else if (rot === 1) { c1 = 0; r1 = H0 - 1 - offset }
	else if (rot === 2) { c1 = W0 - 1 - offset; r1 = H0 - 1 }
	else { c1 = W0 - 1; r1 = offset }

	const c0 = flipped ? W0 - 1 - c1 : c1
	const r0 = r1
	const sqPx = 50 // 150px image / 3 squares

	return {
		position: "absolute",
		top: r0 * sqPx + "px",
		left: c0 * sqPx + "px",
		width: sqPx + "px",
		height: sqPx + "px",
		background: "yellow",
		opacity: "0.5",
		"pointer-events": "none",
	}
})

const computedShowFlip = computed(() => store.context.buildingType === 1 && store.context.variety === 2)

// Road variety 2 (corner) always uses drop-shadow, never border
function roadVarietyClass(v) {
	if (v === 2) return store.context.variety === v ? "selectedDropShadow" : "unselectedDropShadow"
	return store.context.variety === v ? "selectedChoice" : ""
}

// Park varieties 1/2 (T/L) always use drop-shadow, never border; variety 0 uses border
function parkVarietyClass(v) {
	if (v >= 1) return store.context.variety === v ? "selectedDropShadow" : "unselectedDropShadow"
	return store.context.variety === v ? "selectedChoice" : ""
}

function flipLobbyist(vertical) {
	controller.flipLobbyist(vertical)
	currentDegrees.value = store.context.rotation * 90
}
</script>

<template>
	<div id="mapItemToAddBoxDiv">
		<!-- CAMPAIGN MODE -->
		<template v-if="isCampaign">
			<!-- Campaign choice -->
			<div class="addBoxSection">
				<img v-for="campaign in store.context.campaigns" :key="campaign" :src="view.getImage(`campaign_${campaign}`)" class="selectable campaignChoiceImg" :class="{ selectedChoice: store.context.campaign === campaign }" :style="campaignChoiceStyle(campaign)" @click="controller.chooseCampaign(campaign)" :alt="campaign" />
			</div>

			<!-- Main good -->
			<div class="addBoxSection">
				<img v-for="good in [0, 1, 2, 3, 4]" :key="good" :src="view.getImage(`item_${good}`)" class="goodChoiceImg" :class="{ selectedGoodImg: store.context.good === good }" @click="controller.chooseGood(good)" :alt="good" />
			</div>

			<!-- Second good for the Brand Manager double airplane campaign -->
			<div v-if="store.context.double && rf.MARKETING_CAMPAIGNS[store.context.campaign].type === rf.AIRPLANE" class="addBoxSection">
				<img v-for="good in secondGoodChoices" :key="good" :src="view.getImage(`item_${good}`)" class="goodChoiceImg" :class="{ selectedGoodImg: store.context.secondGood === good }" @click="controller.chooseSecondGood(good)" :alt="good" />
				<button class="boxRefuseSecondButton" :class="{ selectedDurationButton: store.context.secondGood === -1 }" @click="controller.chooseSecondGood(-1)">{{ $t("items.none") }}</button>
			</div>

			<!-- Duration -->
			<div class="addBoxSection durationSection">
				<span>{{ $t("items.duration") }}</span>
				<!-- When infinite, ONLY the always-selected infinite button shows, with no hover highlight -->
				<button v-if="controller.campaignDurationInfinite()" class="durationButton infiniteDurationButton selectedDurationButton">&infin;</button>
				<template v-else>
					<button v-for="i in computedMaxDuration" v-show="!store.context.secondCampaignManager || store.context.duration === i" :key="i" class="durationButton" :class="{ selectedDurationButton: store.context.duration === i }" @click="controller.chooseDuration(i)">{{ i }}</button>
				</template>
			</div>

			<!-- Rotation + preview -->
			<div class="addBoxSection rotationSection" :style="{ minHeight: computedRotationMinHeight }">
				<img :src="view.getImage('rot_anticlockwise')" class="rotateButton" :class="{ dimmedRotateButton: !computedRotatableCampaign }" @click="rotateAntiClockwise" />
				<img :src="computedCampaignPreviewSrc" class="campaignPreviewImg" :style="{ ...computedPreviewWidth, ...rotationStyle }" :alt="store.context.campaign" />
				<img :src="view.getImage('rot_clockwise')" class="rotateButton" :class="{ dimmedRotateButton: !computedRotatableCampaign }" @click="rotateClockwise" />
			</div>
		</template>

		<!-- FREEWAY MODE -->
		<template v-else-if="isFreeway">
			<!-- Rotation + preview -->
			<div class="addBoxSection" style="min-height: 150px; gap: 8px; align-items: center; justify-content: center;">
				<img :src="view.getImage('rot_anticlockwise')" class="rotateButton" @click="rotateAntiClockwise" />
				<img :src="view.getImage('freeway')" class="campaignPreviewImg" :style="{ width: '120px', transform: `rotate(${currentDegrees}deg)`, transition: suppressTransition ? 'none' : 'transform 0.3s ease-in-out' }" alt="Freeway" />
				<img :src="view.getImage('rot_clockwise')" class="rotateButton" @click="rotateClockwise" />
			</div>
		</template>

		<!-- URBAN PLANNING MODE -->
		<template v-else-if="isUrbanPlanning">
			<!-- Tile choice for Urban Planning Plus -->
			<div v-if="isUrbanPlanningPlus && computedAvailableUrbanPlanningTiles.length > 0" class="addBoxSection">
				<img
					v-for="tile in computedAvailableUrbanPlanningTiles"
					:key="'up-' + tile"
					:src="getUrbanPlanningTileSrc(tile)"
					class="selectable upTileChoiceImg"
					:class="{ selectedChoice: store.context.nextUrbanPlanningTile === tile }"
					@click="selectUrbanPlanningTile(tile)"
					:alt="'Tile ' + (tile + 1)" />
			</div>

			<!-- Rotation + preview -->
			<div class="addBoxSection upRotationSection">
				<img :src="view.getImage('rot_anticlockwise')" class="rotateButton" @click="rotateAntiClockwise" />
				<img
					:key="store.context.nextUrbanPlanningTile"
					v-if="store.context.nextUrbanPlanningTile >= 0"
					:src="getUrbanPlanningTileSrc(store.context.nextUrbanPlanningTile)"
					class="upPreviewImg"
					:style="rotationStyle" />
				<img :src="view.getImage('rot_clockwise')" class="rotateButton" @click="rotateClockwise" />
			</div>

			<!-- Confirm button -->
			<div class="addBoxSection">
				<button class="actionsLineButton" @click="confirmUrbanPlanning">{{ $t("actionArea.addTileAndEndTurn") }}</button>
			</div>
		</template>

		<!-- HOUSE / GARDEN MODE (New Business Developer) -->
		<template v-else-if="isHouse">
			<!-- Available houses & gardens -->
			<div class="addBoxSection">
				<template v-if="rules.availableHouses().length > 0">
					<span v-for="houseNum in rules.availableHouses()" :key="'buildHouse-' + houseNum" class="houseHolder" :class="{ selected: store.context.selectedBuilding === houseNum }" @click="controller.selectHouseToBuild(houseNum)">
						<img :src="view.getImage('house_garden')" alt="House" />
						<span class="numberHolder">{{ houseNum }}</span>
					</span>
				</template>
				<span v-else class="noMoreSpan">{{ $t("items.noMoreHouses") }}</span>

				<img v-if="rules.availableGardens() > 0" :src="view.getImage('garden')" class="gardenBuildChoice" :class="{ selected: store.context.selectedBuilding === -1 }" @click="controller.selectGardenToBuild()" alt="Garden" />
				<span v-else class="noMoreSpan">{{ $t("items.noMoreGardens") }}</span>
			</div>

			<!-- Rotate + selected item -->
			<div class="addBoxSection rotationSection">
				<img v-if="store.context.selectedBuilding !== -1" :src="view.getImage('rot_anticlockwise')" class="rotateButton" @click="rotateAntiClockwise" />
				<div id="newComponentImgDiv" :style="rotationStyle">
					<img id="newComponentImg" :src="houseSelectedItemImage()" />
					<span v-if="store.context.selectedBuilding !== -1" class="numberHolder">{{ store.context.selectedBuilding }}</span>
				</div>
				<img v-if="store.context.selectedBuilding !== -1" :src="view.getImage('rot_clockwise')" class="rotateButton" @click="rotateClockwise" />
				<p v-if="store.context.selectedBuilding === -1" class="gardenHintText">
					{{ store.context.edges.length > 0 ? $t("items.chooseEdgeForGarden") : $t("items.chooseHouseForGarden") }}
				</p>
			</div>
		</template>

		<!-- LOBBYIST MODE -->
		<template v-else-if="isLobbyist">
			<!-- Building type (Road / Park) -->
			<div class="addBoxSection">
				<template v-if="computedAvailableRoads.length > 0">
					<img :src="view.getImage('road_0_UC')" class="selectable lobbyistTypeRoad" :class="{ selectedChoice: store.context.buildingType === 0 }" @click="controller.selectLobbyistBuilding(0)" alt="Road" />
				</template>
				<span v-else class="noMoreSpan">{{ $t("items.noMoreRoads") }}</span>

				<template v-if="computedAvailableParks.length > 0">
					<img :src="view.getImage('park_0')" class="selectable lobbyistTypePark" :class="{ selectedChoice: store.context.buildingType === 1 }" @click="controller.selectLobbyistBuilding(1)" alt="Park" />
				</template>
				<span v-else class="noMoreSpan">{{ $t("items.noMoreParks") }}</span>
			</div>

			<!-- Variety sub-types - vertically centered -->
			<div class="addBoxSection lobbyistVarietyRow">
				<template v-if="store.context.buildingType === 0">
					<template v-for="v in 3" :key="'road-var-' + v">
						<img v-if="computedAvailableRoads.includes(v - 1)" :src="view.getImage('road_' + (v - 1) + '_UC')" class="selectable" :class="roadVarietyClass(v - 1)" :style="{ width: (v - 1) === 1 ? '200px' : '100px' }" @click="controller.selectLobbyistVariety(v - 1)" :alt="'Road ' + (v - 1)" />
					</template>
				</template>
				<template v-else>
					<template v-for="v in 3" :key="'park-var-' + v">
						<img v-if="computedAvailableParks.includes(v - 1)" :src="view.getImage('park_' + (v - 1))" class="selectable" :class="parkVarietyClass(v - 1)" :style="{ width: (v - 1) === 0 ? '200px' : '150px' }" @click="controller.selectLobbyistVariety(v - 1)" :alt="'Park ' + (v - 1)" />
					</template>
				</template>
			</div>

			<!-- Rotation + preview -->
			<div class="addBoxSection lobbyistRotationSection">
				<img :src="view.getImage('rot_anticlockwise')" class="rotateButton" @click="rotateAntiClockwise" />
				<img v-if="computedShowFlip" :src="view.getImage('flip_h')" class="rotateButton flipButton" @click="flipLobbyist(false)" alt="Flip H" />
				<div class="lobbyistPreviewWrapper">
					<div id="newComponentImgDiv" :style="lobbyistPreviewStyle">
						<div :style="lobbyistFlipStyle">
							<img id="newComponentImg" :src="computedLobbyistPreviewSrc" :style="lobbyistImageStyle" />
							<div v-if="computedShowAnchor" :style="computedAnchorStyle"></div>
						</div>
					</div>
				</div>
				<img v-if="computedShowFlip" :src="view.getImage('flip_h')" class="rotateButton flipButton flipButtonV" @click="flipLobbyist(true)" alt="Flip V" />
				<img :src="view.getImage('rot_clockwise')" class="rotateButton" @click="rotateClockwise" />
			</div>
		</template>

		<!-- RESTAURANT MODE -->
		<template v-else>
			<div class="addBoxSection restoAddBoxRow">
				<!-- Rotate Left -->
				<img :src="view.getImage('rot_anticlockwise')" class="rotateButton restoRotateButton" @click="rotateAntiClockwise" />

				<!-- Main Item Image -->
				<div id="newComponentImgDiv" :style="rotationStyle">
					<img id="newComponentImg" :src="getImageForItemBox()" />
				</div>

				<!-- Rotate Right -->
				<img :src="view.getImage('rot_clockwise')" class="rotateButton restoRotateButton" @click="rotateClockwise" />
			</div>
		</template>
	</div>
</template>

<style scoped>
/* Campaign box container - sections all stretch to the same width */
#mapItemToAddBoxDiv {
	width: fit-content;
	margin: auto;
	padding: 4px;
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

/* Section borders - content flows in a row like the inline layout */
.addBoxSection {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	padding: 6px 8px;
	border: 1px solid black;
}

/* Campaign choice images - width set inline (25px per campaign width unit) */
.campaignChoiceImg {
	height: auto;
	border: 3px solid black;
	cursor: pointer;
	transform-origin: center;
}

/* Yellow hover highlight */
.campaignChoiceImg:hover {
	border-color: yellow;
}

/* Good choice images */
.goodChoiceImg {
	width: auto;
	height: 50px;
	cursor: pointer;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
}

/* Selected good */
.selectedGoodImg {
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen);
}

/* Yellow hover highlight */
.goodChoiceImg:hover {
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow);
}

/* Duration section */
.durationSection {
	gap: 8px;
}

.durationSection span {
	font-weight: bold;
	margin-right: 6px;
}

.durationButton {
	width: 53px;
	height: 53px;
	border-radius: 50%;
	border: 3px solid black;
	background: white;
	font-size: 30px;
	font-weight: bold;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* Selected duration button */
.selectedDurationButton {
	border-color: lightgreen !important;
}

/* Yellow hover highlight */
/* The infinite duration button never highlights - omits the hover handler there */
.durationButton:hover:not(.infiniteDurationButton) {
	border-color: yellow;
}

/* Infinite duration button shows ∞ */
.durationButton.selectedDurationButton {
	background: #fff8c7;
}

/* None button for refusing the second airplane good - border wraps the text */
.boxRefuseSecondButton {
	background-color: white;
	font-size: 30px;
	border-radius: 25%;
	border: 3px solid black;
	height: 53px;
	line-height: 17px;
	position: relative;
	top: 0px;
	font-weight: bold;
	cursor: pointer;
}

.boxRefuseSecondButton:hover {
	border-color: yellow;
}

/* Rotation section */
.rotationSection {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 35px;
}

.rotateButton,
.flipButton {
	width: 37px;
	height: 37px;
	border: 1px solid black;
	border-radius: 15px;
	cursor: pointer;
	transition: background-color 0.2s;
}

.rotateButton:hover,
.flipButton:hover {
	border-color: yellow;
}

.flipButtonV {
	transform: rotate(90deg);
}

.campaignPreviewImg {
	height: auto;
	margin: 5px;
	box-sizing: border-box;
	border: 2px solid black;
	transition: transform 0.3s ease-in-out;
}

.dimmedRotateButton {
	opacity: 0.2;
}

/* Restaurant mode - same layout as addBoxSection, slightly larger gap */
.restoAddBoxRow {
	gap: 8px;
}

/* House / garden mode */
.houseHolder {
	display: inline-block;
	position: relative;
	margin: 5px;
	cursor: pointer;
}

.houseHolder img {
	width: 100px;
}

.houseHolder .numberHolder,
#newComponentImgDiv .numberHolder {
	position: absolute;
	top: 7px;
	left: 10px;
	color: #fff;
	font-size: 20px;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
}

.gardenBuildChoice {
	width: 100px;
	margin: 5px;
	cursor: pointer;
}

.houseHolder.selected,
.gardenBuildChoice.selected {
	outline: 3px solid lightgreen;
	outline-offset: -3px;
}

.houseHolder:hover,
.gardenBuildChoice:hover {
	outline: 3px solid yellow;
	outline-offset: -3px;
}

.noMoreSpan {
	position: relative;
	display: inline-block;
	top: -20px;
	padding: 5px;
	margin: 5px;
}

.gardenHintText {
	margin: 0 8px;
}

.restoRotateButton {
	width: 50px;
	height: 50px;
}

#newComponentImgDiv {
	box-sizing: border-box;
	border: 2px solid black;
	margin: 0 0px;
	width: 100px;
}

#newComponentImg {
	width: 100%;
	height: auto;
	min-height: 50px;
	display: block;
}

/* Lobbyist mode */
.lobbyistTypeRoad {
	width: 100px;
	height: 50px;
	border: 3px solid black;
	cursor: pointer;
	margin: 4px;
}
.lobbyistTypePark {
	width: 200px;
	height: 50px;
	border: 3px solid black;
	cursor: pointer;
	margin: 4px;
}
.lobbyistTypeRoad.selectedChoice,
.lobbyistTypePark.selectedChoice {
	border-color: lightgreen;
}
.lobbyistTypeRoad:hover,
.lobbyistTypePark:hover {
	border-color: yellow;
}
/* Variety row - vertically centered */
/* Variety images - base border only for rectangular items */
.lobbyistVarietyRow .selectable:not(.unselectedDropShadow):not(.selectedDropShadow) {
	border: 3px solid black;
}
/* Selected with border (rectangular: road 0/1, park 0) */
.selectedChoice {
	border: 3px solid lightgreen;
}
/* Drop-shadow for non-rectangular (road 2, park 1/2) */
.selectedDropShadow {
	border: 3px solid transparent;
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen);
}
.unselectedDropShadow {
	border: 3px solid transparent;
	filter: drop-shadow(3px 0 0 black) drop-shadow(0 3px 0 black) drop-shadow(-3px 0 0 black) drop-shadow(0 -3px 0 black);
}
/* Hover highlights - only for rectangular items, non-rectangular use drop-shadow */
.selectable:hover:not(.selectedChoice):not(.selectedDropShadow):not(.unselectedDropShadow) {
	border-color: yellow;
}
.selectable.unselectedDropShadow:hover {
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow);
}
/* Rotation section - taller to fit rotated items (straight park, T/L-park) */
.lobbyistRotationSection {
	min-height: 220px;
	gap: 8px;
}
/* Wrapper holds the rotated preview (which overflows its layout box) plus the
   non-rotating anchor-square overlay */
.lobbyistPreviewWrapper {
	position: relative;
	display: inline-block;
}

/* Urban Planning */
.upTileChoiceImg {
	width: 100px;
	height: 100px;
	margin: 5px;
	border: 3px solid black;
	cursor: pointer;
}

.upTileChoiceImg:hover {
	border-color: yellow;
}

.upTileChoiceImg.selectedChoice {
	border-color: lightgreen;
}

.upRotationSection {
	min-height: 130px;
	gap: 35px;
}

.upPreviewImg {
	width: 100px;
	height: 100px;
	box-sizing: border-box;
	border: 2px solid black;
}
</style>
