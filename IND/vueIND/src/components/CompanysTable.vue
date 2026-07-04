<script setup>
import * as view from "../js/INDview.js"
import * as rf from "../js/INDreference.js"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
//import { nextTick } from 'vue';
const personal = usePersonalStore()

import { /*ref, */computed } from "vue"

const computedShipMarkerDisplayData = computed(() => {
	// First, make a copy of active compies
	let displayCompanys = JSON.parse(JSON.stringify(store.activeCompanies))

	if (store.displayData.sortByType) {
		const order = [rf.COMPANY_SHIPPING, rf.COMPANY_RICE, rf.COMPANY_SPICE, rf.COMPANY_RUBBER, rf.COMPANY_OIL, rf.COMPANY_SIAP_FAJI]
		displayCompanys.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
	}

	return JSON.parse(JSON.stringify(displayCompanys))
})

/*const squares = ref(
	Array.from({ length: 20 }, () => ({
		fillColor: "none",
	}))
)*/


</script>

<template>
	<!-- GLOW ANIMATION MOVING TEST
	 	<svg width="800" height="100" xmlns="http://www.w3.org/2000/svg">
		<g v-for="(square, index) in squares" :key="index">
		<rect v-if="index % 2 === 0" class="glowRect"  :x="(index % 100) * 40" :y="0" width="30" height="30" :fill="square.fillColor">
			<animate
      attributeName="fill"
      values="rgba(255, 255, 0, 0); rgba(255, 255, 0, 1); rgba(255, 255, 0, 0); rgba(255, 255, 0, 0)"
      :keyTimes="'0;' + 0.3 * 10 / squares.length   + '; ' + 0.6* 10 / squares.length   + '; 1'"
      :dur="squares.length * 0.5 + 's'"
      repeatCount="indefinite"
      :begin="index * 0.5 + 's'"
    />
		</rect>
		</g>
		<g v-for="(square, index) in squares" :key="index">
		<rect v-if="index % 2 === 1" class="glowRect"  :x="(index % 100) * 40" :y="0" width="30" height="50" :fill="square.fillColor">
			<animate
      attributeName="fill"
      values="rgba(255, 255, 0, 0); rgba(255, 255, 0, 1); rgba(255, 255, 0, 0); rgba(255, 255, 0, 0)"
      :keyTimes="'0;' + 0.3 * 10 / squares.length   + '; ' + 0.6* 10 / squares.length   + '; 1'"
      :dur="squares.length * 0.5 + 's'"
      repeatCount="indefinite"
      :begin="index * 0.5 + 's'"
    />
		</rect>
		</g>
	</svg>
-->
	<div id="companysTableDiv">
		<table id="companysTable">
			<thead>
				<tr>
					<th><b>Owner</b></th>
					<th><b>Company</b></th>
					<th><b>No. Territories</b></th>
				</tr>
			</thead>
			<tr v-for="(company, idx) in computedShipMarkerDisplayData" :key="idx">
				<!-- OWNER -->
				<td>
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[company.ownerIndex].colour)">{{ store.players[company.ownerIndex].displayName }}</span>
				</td>
				<!-- COMPANY -->
				<td>
					<img class="companyCardIMG" :src="view.getImage(company.gfx)" alt="Company" />
				</td>
				<!-- TERRITORIES -->
				<td>{{ company.territories.length }} // {{ company }}</td>
			</tr>
		</table>
	</div>
</template>

<style scoped>
#companysTableDiv {
	text-align: center;
	margin: auto;
	width: fit-content;
}

.companyCardIMG {
	width: 50px;
	height: 50px;
	border: 2px solid black;
}

#companysTable {
	border-collapse: collapse;
	width: 1200px;
	margin: 5px;
}

#companysTable td,
#companysTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#companysTable tr {
	cursor: pointer;
	text-align: center;
}

#companysTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#companysTable tr:nth-child(odd) {
	background-color: white;
}

#companysTable tr:hover {
	background-color: #ddd;
}

#companysTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

rect {
	stroke: black;
	stroke-width: 1px;
	pointer-events: none;
	/*animation: glow 0.6s infinite alternate;*/
}


</style>
