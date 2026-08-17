<script setup>
import BuildingInfo from "./Utils/BuildingInfo.vue"
//import * as highlight from "../js/RNBhighlight"
import * as rf from "../js/RNBreference"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { computed } from "vue"

const props = defineProps({
	position: {
		type: Object,
		required: false,
		default: () => ({ x: 0, y: 0 }),
	},
})

const cardPosition = computed(() => {
	if (!props.position) return { x: 0, y: 0 }

	// Calculate the horizontal offset to center the card below the transporter
	let xOffset = 0

	if (hasOnlyOneBuilding.value) {
		// For single building, center based on building width
		if (hasWideBuildings.value) {
			xOffset = -148 // Half of 296px
		} else {
			xOffset = -125 // Half of 250px
		}
	} else {
		// For multiple buildings, center based on total card width
		if (hasWideBuildings.value) {
			xOffset = -298 // Half of 596px (2 * 296px + gap)
		} else {
			xOffset = -250 // Half of 500px (2 * 250px + gap)
		}
	}

	return {
		x: props.position.x + xOffset,
		y: props.position.y + 50,
	}
})

const hasWideBuildings = computed(() => {
	return store.context.eligibleBuildingsToBuild.some((bldgNum) => bldgNum === rf.BLDG_PAPERMILL || bldgNum === rf.BLDG_COAL_BURNER)
})

const hasOnlyOneBuilding = computed(() => {
	return store.context.eligibleBuildingsToBuild.length === 1
})

function closeCard() {
	store.context.eligibleBuildingsToBuild.splice(0)
}
</script>

<template>
	<transition name="fade">
		<div v-if="store.context.eligibleBuildingsToBuild.length > 0" class="building-options-overlay" :style="{ left: cardPosition.x + 'px', top: cardPosition.y + 'px' }">
			<div class="building-options-card">
				<div class="card-header">
					<span>Building Options</span>
					<button @click="closeCard" class="close-button">&times;</button>
				</div>
				<div class="card-content" :class="{ hasWideBuildings: hasWideBuildings, hasOnlyOneBuilding: hasOnlyOneBuilding }">
					<template v-for="(bldgNum, idx) in store.context.eligibleBuildingsToBuild" :key="idx">
						<BuildingInfo :bldgNum="bldgNum" :highlightWholeBuilding="true" :showCost="true" />
						<div v-if="bldgNum <= 100 && store.context.eligibleBuildingsToBuild[idx + 1] > 100 && idx % 2 === 0" class="flexBreak"></div>
					</template>
				</div>
			</div>
		</div>
	</transition>
</template>

<style scoped>
.building-options-overlay {
	position: absolute;
	pointer-events: none;
	z-index: 2000;
}

.building-options-card {
	pointer-events: auto;
	background: white;
	border: 3px solid #333;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	max-width: 700px;
	min-height: fit-content;
	overflow-y: auto;
}

.building-options-card:has(.hasOnlyOneBuilding) {
	max-width: 320px;
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	background: #f0f0f0;
	border-bottom: 2px solid #333;
	border-radius: 6px 6px 0 0;
}

.card-header span {
	font-weight: bold;
	font-size: 14px;
}

.close-button {
	background: none;
	border: none;
	font-size: 24px;
	cursor: pointer;
	color: #666;
	padding: 0 4px;
	line-height: 1;
}

.close-button:hover {
	color: #000;
}

.card-content {
	padding: 10px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
}

.card-content.hasOnlyOneBuilding {
	grid-template-columns: 1fr;
}

.card-content :deep(.flexHolderBuildingDiv) {
	min-width: 250px;
}

.card-content.hasWideBuildings :deep(.flexHolderBuildingDiv) {
	min-width: 296px;
}

.flexBreak {
	flex-basis: 100%;
	height: 0;
	margin: 5px 0;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
