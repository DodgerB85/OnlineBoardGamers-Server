<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 *
 *
 */

import * as rf from '../js/INDreference'
import * as map from '../js/INDmap'
import * as controller from '../js/INDcontroller'
import * as model from '../js/INDmodel'
import * as funcs from '../js/INDfuncs'
//import * as view from '../js/INDview'


import { useModelStore } from '../stores/INDstore.js'
const store = useModelStore()

//import { usePersonalStore } from '../stores/INDpersonal.js'
//const personal = usePersonalStore()

function highlightAllTerrs() {
	store.context.action = rf.ACT_NONE
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) for (let i = 0; i < rf.OM_TERRITORY_COUNT; i++) store.context.territoriesToHighlight.push(i)
	else if (store.mapData.selectedMap === rf.MAP_AEGEAN) for (let i = 0; i < rf.AG_TERRITORY_COUNT; i++) store.context.territoriesToHighlight.push(i)
	//else if (store.mapData.selectedMap === rf.MAP_PHP) for (let i = 0; i < rf.PH_TERRITORY_COUNT; i++) store.context.territoriesToHighlight.push(i)
	else if (store.mapData.selectedMap === rf.MAP_PHP) for (let i = 112; i <= 118; i++) store.context.territoriesToHighlight.push(i)
	//store.context.territoriesToHighlight = [...rf.OM_TERR_ID_TO_PATH_ID]
}

function debugButton() {
	//store.context.territoriesToHighlight.splice(0)
	//store.context.territoriesToHighlight.push(6)
	store.availableCompanies.splice(0)
}

function makeCities() {
	for (let i = 0; i < 200; i++) {
		if (map.isCoastal(i)) {
			//const randomIndex = Math.floor(Math.random() * 3) // Generates random index 0, 1, or 2
			//store.cities[randomIndex].push([i])
			model.addCity_core(i, 0, 0)
		}
	}
}

function makeProdMarkers() {
	const dummyComp = {
		id: 5,
		era: rf.ERA_A,
		type: rf.COMPANY_RICE,
		typeText: "Rice",
		good: rf.GOOD_RICE,
		goodValue: 20,
		province: rf.PH_PROVINCE_BAN,
		territories: [],
		siapFaji: false,
		ownerIndex: 0,
		gfx: "ag_c_comp_04",
		goodsGfx: "prod_marker_rice",
		operated: false,
		mergedThisPhase: false,
		markedForRemoval: false,
		newExpansionsThisTurn: [],
		incomeThisTurn: 0,
	}
	for (let i = 0; i <= 117; i++) {
		if (!map.isSeaTerritory(i)) {
			dummyComp.territories.push([i, 0])
		}
	}
	store.activeCompanies.push(dummyComp)
}

function makeShipMarkers() {
	const dummyComp = {
		id: 0, // save
		era: rf.ERA_A, // NO NEED SAVE
		type:rf.COMPANY_SHIPPING, // NO NEED SAVE
		typeText: "Shipping", // NO NEED SAVE
		province: rf.PROVINCE_HAL, // NO NEED SAVE
		capacity: [3, 4, 5], // NO NEED SAVE
		combinedCapacity: [3, 4, 5], // NO NEED SAVE
		hullCapacity: 1, // NO NEED SAVE
		territories: [], // save
		ownerIndex: 0, // NO NEED SAVE (find from slots)
		gfx: "c_comp_00", // NO NEED SAVE
		shipGfx: "ship_triple_mast", // save
		operated: false, // save
		mergedThisPhase: false, // save
		newExpansionsThisTurn: [], // save
		incomeThisTurn: 0, // save
	}
	//for (let i = 112; i < rf.PH_TERRITORY_COUNT; i++) {
	for (let i = 0; i < rf.OM_TERRITORY_COUNT; i++) {
		if (map.isSeaTerritory(i) ) {
			dummyComp.territories.push([i, 0])
			dummyComp.territories.push([i, 0])
			dummyComp.territories.push([i, 0])
			dummyComp.territories.push([i, 0])
			dummyComp.territories.push([i, 0])
		}
	}
	store.activeCompanies.push(dummyComp)
	store.players[0].slots[0].push(0)
}

function test1() {
	let company = store.activeCompanies.find((company) => company.id === 5)
	company.territories.splice(0)
}
function test2() {
	//
}

function exportLoc() {
	/*  store.turnResetData = funcs.exportModel(false)*/
	console.log(JSON.stringify(funcs.exportModel(false, false)))
}
function importLoc() {
	/* let data;
   
   data = 'NrDeCIDsEMFsFNwC5wBd4GdUAUA20BPeAJwAZwAacAEwEsMAHfAgOTkRQCUB7DDS8AGNuubgFdiyAIxUs3YvGqdM44oMzJgAXSq5akANb8k22cIXJSs+PEgAReoOjFqACXgAPZQDNjwABwATBQA7ABsFIEALBRhUloAvhQQMAjIaJg4zCRSAnSMzGxpXNCCABbwuALCohLIweByCkoqEup+VoE64HqGfmDgtNTIAMxUFR7IEACOllSSSAC0Mo3SVPTYtnSQAOZ4pfAIkKjI3tC4GPDrGACy4pcA8gBuJMioxGLwSeATPshREXAxG4qGgqFo3EgliSECG-3Gnim4FmSxWCysqyQKw2W30e3w6iOJyQZwuV0Gt3u8GeryQ70+31+8G8-zRILBEKhSFICR0AzhSEBEyRKLRyEWDWM2Iwm0g23xByJp3Ol2udzEjxeC3pXwRXmZ-wawNB4Mh0OSg2GSDGP0RSBmcyB4pWUuusvl+0JtmJpNVFPVmtpOsZnj+SAB83Zpq5PL5sKtAE49SLHQsJbJ6m7cbtPYdvcqyWqqTTtR9dbb9SzwyFIybOeb49IMcL7cjnfNxZLRlm5Xjc0qSSryfQA9StW8yyHK8gQgBWWscs3c3kUflWqTNu0O1EdpZd609j0EvPHAt+kfF8d0yd6sNzhfRhuW6Q2lvb9NOvcZ8OHvvHge+sOlIamOQY3hWd41kCUb1sucbPlir5bm2X6fh+xgxBS7p-oq+aDoW-qXmBDK3gaSAhFBxqLjGMIIVImFvihiw2mm+7zlh2YKl6p74eewGBqWJEQWRIRsnWS6xt0GDmBwGKXLYDjSc4bihsyfiBMEIxdLRqQcBkWD7EQxCBHk9BMIQRR6QAUtw8AENUIiqI6TSKMoGCqO0mjdL0RheWY8iydYCmOMp7iVn4-ikIkFq6ek6AGdkxAjKZBQWew6QAMJlNAcq4K8VA1E5B6NKgAUtO5bQaCY3n6L51X+RY3JBfYIUuGFPjqREgSzok8ECisjEohi6LfjypFVsNMESbRAoNINayfnJzpTmGYnUU+ApIZMrZDbuyzftK2E5v+eGAUWIElhOQlMlWEbQeJNEWgKDHISi+2LQdv7HbhPFnYRF1XsG42sg+sFjY2SDsfNqEjZiDQ4r233cT6Q7nQJV3ljd9QsVNj0Q0Kr0Laxn0cYjXEnijBEXgDxGY6pt1GrjG1WlB0NGuKNquqTR4-ZTfGjpd17XfT9T+KDS6zjNVpixWKY7mhLqZtzOHI2eQEC4D4FY+RmFUY+y5PYmyY7amnbfvDMqcf2p2o-96NC3T07VuLeN0Zu23vmKqHGDaCM86rvHq0RgmO3e7F62DUvSANhMw+2mK+5bZPW79tvU-bQPCbdutMwbENSHNsfMXtis-srSMU2raOgSHK0iTjD3My+xvvuz3vwuX5MAWn-E1xjddVhRLtN1iL0e0xLFm5i7F+yrleB9XguZ9ronD3ndFQ7HbfoY6s8V93VO90vWsi+Gk2N3Bq5rgt0PDc55pZ6mufgwhY9y+9sNc3vXc24fGu0wPEG911qX2voKFuKEvY7yxF9H+qc-7B37sDcMjML4vwFEmWWJsmpoX3BbI6cC+ZBxprXZBURKLPxXGA1mW89qcwWt-FORDF6a2Fk7QIMsI4SyjuArB24oH7kOlbE68D+aIIdoAlBa9JKrhCMEWcVgohJjCJ0GQ-gZAjCsCEKwYRNIyCiGMKI84QhiyiGLfwIw+RBEiJpYIkVIhdWMV1GIcQ+RSDGO4ig7idAQFQBILkDQGDZUuI6PxxBIAPBcLSYAMhNLdG8GIXAuAAAq-jInUGiVYWJFBLFJBAFYfakBEm4FXFoNxVgskyBABGKwwACnxD5FEGQtT9pRTKeUrxXiawgECGMFpwQ2llNXAXTpgRan5IoMsPkrT2luJrLE2pnQhkxM6Dk4I1SBnDMmV0PkHCKDzmAMEZiszhlWDGAmA5wAQgxBaTIKZjSayLO2cs+8tznmNJuaudM9zZF9K+WMH5VzHlfKOTs2RzT-nvOWXcmQFzVzrIqRQCp7TTlIooAmbp0KIgyA3GLCZUUvnNJRTE7FXiRkgDuV0VcBSdluNJVIeiV8jmWK2RKE5EBqDEGgAAd0gGFKqVykyBATNFEAENN7jzem3JaSB8HCN5lXO2fcJHIN6dIqhEMaGSqVmmehMDO5MMVenZVy9T57OAfrSW7SgA'
   //data = store.turnResetData
	  funcs.importModel(data)*/
}

</script>

<template>

	<body>
		highlights: {{ store.context.territoriesToHighlight }}<br />
		CGJ: {{ store.context.currentGoodJourney }}
		<br />
		HI: {{ store.context.historyObj }}

		<br />
		{{ store.ongoingVars.passedPlayerIndexes }}<br /><br />
		{{ store.context.shipMarkersToHighlight }}
		Acq C: {{ store.context.acquiredCompany }}<br />
		Good Journey: {{ store.context.currentGoodJourney }}<br />
		H-O: {{ store.context.historyObj }} /// {{ store.context.historyObj.length }}<br />
		<br />
		{{ store.ongoingVars }}<br />
		{{ store.gameflow }}<br />
		{{ store.players[0] }}<br />
		{{ store.activeCompanies }}<br />
		{{ store.historyHelpers.histRNDmarkersToHighlight }}<br />
		{{ store.cities }}<br />
		{{ store.canvasWidth }}<br />
		{{ store.canvasSize }}<br />
		<br />
		<!--- DEBUG DEBUG DEBUG-->
		<button @click="debugButton"><b>Debug</b></button>
		<br />
		<button @click="highlightAllTerrs"><b>Highlight All Territories</b></button>
		<button @click="makeCities"><b>Make Cities</b></button>
		<button @click="makeProdMarkers"><b>Make Prod Markers</b></button>
		<button @click="makeShipMarkers"><b>Make Ship Markers</b></button>
		<div id="terrInfoDiv">
			Territory Path: {{ store.debugVars.clickedTerrPath }}
			<br />
			Territory ID: {{ map.getTerrIDfromPath(store.debugVars.clickedTerrPath) }}
			<br />
			Locaed in Province: {{ rf.OM_PROVINCE_STRINGS[map.getProvinceFromTerrID(store.debugVars.clickedTerrID)] }}
			<br />
			All neighbours: {{ store.mapData.allNeighbours[store.debugVars.clickedTerrID] }}
			<br />
			Land neighbours: {{ store.mapData.landNeighbours[store.debugVars.clickedTerrID] }}
			<br />
			Sea Neighbours: {{ store.mapData.seaNeighbours[store.debugVars.clickedTerrID] }}
			<br />
			Is coastal?: {{ map.isCoastal(store.debugVars.clickedTerrID) }}
		</div>


		<br />

		<div class="optionsDiv">
			<b>Map Actions</b> <br />
		</div>
		<div class="optionsDiv">
			<b>City Actions</b> <br />
		</div>
		<button @click="test1">Test 1</button>
		<button @click="test2">Test 2</button>

		<button @click="exportLoc">Export</button>
		<button @click="importLoc">Import</button>

		Money Cash:<input v-model="controller.currentPlayerObj().moneyCash" placeholder="edit me"
			id="moneyCashNumber" />

		<button @click="controller.currentPlayerObj().moneyCash++">+ </button>
		<button @click="controller.currentPlayerObj().moneyCash--">- </button>
	</body>
</template>

<style scoped>
body {
	background-color: lightpink;
	padding: 10px;
}

.eraCardTest {
	width: 600px;
}

.optionsDiv {
	display: inline-block;
	border: 2px solid black;
	padding: 2px;
}

button {
	margin: 2px;
}
</style>
