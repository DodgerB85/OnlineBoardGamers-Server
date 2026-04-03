<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 *
 *
 */

import * as IO from "../backend/KFW_IO"
import * as rf from "../js/KFWreference"
import * as map from "../js/KFWmap"
import * as controller from "../js/KFWcontroller"
import * as model from "../js/KFWmodel"
//import * as funcs from '../js/KFWfuncs'
import * as view from "../js/KFWview"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

import { ref, computed } from "vue"

function debugButton() {
	//
}

function test1() {
	//
}
function test2() {
	//
}

function exportLoc() {
	/*  store.turnResetData = funcs.exportKFWmodel(false)*/
}
function importLoc() {
	/* let data;

data = 'NrDeCIDsEMFsFNwC5wBd4GdUAUA20BPeAJwAZwAacAEwEsMAHfAgOTkRQCUB7DDS8AGNuubgFdiyAIxUs3YvGqdM44oMzJgAXSq5akANb8k22cIXJSs+PEgAReoOjFqACXgAPZQDNjwABwATBQA7ABsFIEALBRhUloAvhQQMAjIaJg4zCRSAnSMzGxpXNCCABbwuALCohLIweByCkoqEup+VoE64HqGfmDgtNTIAMxUFR7IEACOllSSSAC0Mo3SVPTYtnSQAOZ4pfAIkKjI3tC4GPDrGACy4pcA8gBuJMioxGLwSeATPshREXAxG4qGgqFo3EgliSECG-3Gnim4FmSxWCysqyQKw2W30e3w6iOJyQZwuV0Gt3u8GeryQ70+31+8G8-zRILBEKhSFICR0AzhSEBEyRKLRyEWDWM2Iwm0g23xByJp3Ol2udzEjxeC3pXwRXmZ-wawNB4Mh0OSg2GSDGP0RSBmcyB4pWUuusvl+0JtmJpNVFPVmtpOsZnj+SAB83Zpq5PL5sKtAE49SLHQsJbJ6m7cbtPYdvcqyWqqTTtR9dbb9SzwyFIybOeb49IMcL7cjnfNxZLRlm5Xjc0qSSryfQA9StW8yyHK8gQgBWWscs3c3kUflWqTNu0O1EdpZd609j0EvPHAt+kfF8d0yd6sNzhfRhuW6Q2lvb9NOvcZ8OHvvHge+sOlIamOQY3hWd41kCUb1sucbPlir5bm2X6fh+xgxBS7p-oq+aDoW-qXmBDK3gaSAhFBxqLjGMIIVImFvihiw2mm+7zlh2YKl6p74eewGBqWJEQWRIRsnWS6xt0GDmBwGKXLYDjSc4bihsyfiBMEIxdLRqQcBkWD7EQxCBHk9BMIQRR6QAUtw8AENUIiqI6TSKMoGCqO0mjdL0RheWY8iydYCmOMp7iVn4-ikIkFq6ek6AGdkxAjKZBQWew6QAMJlNAcq4K8VA1E5B6NKgAUtO5bQaCY3n6L51X+RY3JBfYIUuGFPjqREgSzok8ECisjEohi6LfjypFVsNMESbRAoNINayfnJzpTmGYnUU+ApIZMrZDbuyzftK2E5v+eGAUWIElhOQlMlWEbQeJNEWgKDHISi+2LQdv7HbhPFnYRF1XsG42sg+sFjY2SDsfNqEjZiDQ4r233cT6Q7nQJV3ljd9QsVNj0Q0Kr0Laxn0cYjXEnijBEXgDxGY6pt1GrjG1WlB0NGuKNquqTR4-ZTfGjpd17XfT9T+KDS6zjNVpixWKY7mhLqZtzOHI2eQEC4D4FY+RmFUY+y5PYmyY7amnbfvDMqcf2p2o-96NC3T07VuLeN0Zu23vmKqHGDaCM86rvHq0RgmO3e7F62DUvSANhMw+2mK+5bZPW79tvU-bQPCbdutMwbENSHNsfMXtis-srSMU2raOgSHK0iTjD3My+xvvuz3vwuX5MAWn-E1xjddVhRLtN1iL0e0xLFm5i7F+yrleB9XguZ9ronD3ndFQ7HbfoY6s8V93VO90vWsi+Gk2N3Bq5rgt0PDc55pZ6mufgwhY9y+9sNc3vXc24fGu0wPEG911qX2voKFuKEvY7yxF9H+qc-7B37sDcMjML4vwFEmWWJsmpoX3BbI6cC+ZBxprXZBURKLPxXGA1mW89qcwWt-FORDF6a2Fk7QIMsI4SyjuArB24oH7kOlbE68D+aIIdoAlBa9JKrhCMEWcVgohJjCJ0GQ-gZAjCsCEKwYRNIyCiGMKI84QhiyiGLfwIw+RBEiJpYIkVIhdWMV1GIcQ+RSDGO4ig7idAQFQBILkDQGDZUuI6PxxBIAPBcLSYAMhNLdG8GIXAuAAAq-jInUGiVYWJFBLFJBAFYfakBEm4FXFoNxVgskyBABGKwwACnxD5FEGQtT9pRTKeUrxXiawgECGMFpwQ2llNXAXTpgRan5IoMsPkrT2luJrLE2pnQhkxM6Dk4I1SBnDMmV0PkHCKDzmAMEZiszhlWDGAmA5wAQgxBaTIKZjSayLO2cs+8tznmNJuaudM9zZF9K+WMH5VzHlfKOTs2RzT-nvOWXcmQFzVzrIqRQCp7TTlIooAmbp0KIgyA3GLCZUUvnNJRTE7FXiRkgDuV0VcBSdluNJVIeiV8jmWK2RKE5EBqDEGgAAd0gGFKqVykyBATNFEAENN7jzem3JaSB8HCN5lXO2fcJHIN6dIqhEMaGSqVmmehMDO5MMVenZVy9T57OAfrSW7SgA'
//data = store.turnResetData
   funcs.importKFWmodel(data)*/
}

function findAllMeeples() {
	let ret = [0, 0, 0, 0]
	// available in store
	for (let i = 0; i < store.availableMeeples.length; i++) {
		ret[i] += store.availableMeeples[i]
	}
	// Held by players
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].hiddenMeeples.length; j++) {
			ret[j] += store.players[i].hiddenMeeples[j]
		}
	}
	// On boats
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		for (let j = 0; j < store.availableBoatTiles[i].itemsOnBoat.meeples.length; j++) {
			ret[store.availableBoatTiles[i].itemsOnBoat.meeples[j]]++
		}
	}

	for (let i = 0; i < store.availableTiles.length; i++) {
		let tile = store.availableTiles[i]
		// On available tiles
		for (let j = 0; j < tile.meeplesOnTile.length; j++) {
			for (let k = 0; k < tile.meeplesOnTile[j].length; k++) {
				ret[tile.meeplesOnTile[j][k]]++
			}
		}

		// bid
		for (let j = 0; j < tile.bids.length; j++) {
			for (let k = 0; k < tile.bids[j][0].length; k++) {
				ret[tile.bids[j][0][k]]++
			}
		}
	}

	// Bid on TO
	for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
		let tile = store.availableTurnOrderTiles[i]

		// bids
		for (let j = 0; j < tile.bids.length; j++) {
			for (let k = 0; k < tile.bids[j][0].length; k++) {
				ret[tile.bids[j][0][k]]++
			}
		}
	}

	// On player villages
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].villageTiles.length; j++) {
			let tile = store.players[i].villageTiles[j]
			// On available tiles
			for (let j = 0; j < tile.meeplesOnTile.length; j++) {
				for (let k = 0; k < tile.meeplesOnTile[j].length; k++) {
					ret[tile.meeplesOnTile[j][k]]++
				}
			}
		}
	}

	// Add in available green
	ret[3] += store.availableGreenMeeples
	// Add in greens onboats
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		ret[3] += store.availableBoatTiles[i].itemsOnBoat.greenMeeples
	}

	// IF final scoring, add in stuff on itemsets
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING || store.gameflow.phase === rf.PHASE_GAME_OVER) {
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].villageTiles.length; j++) {
				let tile = store.players[i].villageTiles[j]
				if (tile.tileItemType === rf.TILE_ITEM_TYPE_MEEPLES) {
					for (let k = 0; k < tile.completedSets.length; k++) {
						for (let m = 0; m < tile.completedSets[k].length; m++) ret[tile.completedSets[k][m]]++
					}
				}
			}
			// And on contracts
			for (let j = 0; j < store.players[i].hiddenContracts.length; j++) {
				let contract = store.players[i].hiddenContracts[j]
				for (let k = 0; k < contract.chosenMeeples.length; k++) {
					ret[contract.chosenMeeples[k]]++
				}
			}
		}
	}

	if ((personal.trainingGame || personal.adminDataInspection) && !personal.haltPlay) {
		if (ret[0] !== 40) store.gameMessages.errorText =`Missing BLUE: ${ret[0]}`
		if (ret[1] !== 40) store.gameMessages.errorText =`Missing RED: ${ret[1]}`
		if (ret[2] !== 40) store.gameMessages.errorText =`Missing YELLOW: ${ret[2]}`
		if (ret[3] !== 20) store.gameMessages.errorText =`Missing GREEN: ${ret[3]}`
	}

	return ret
}

function getMeepleBagCount() {
	let ret = [0, 0, 0, 0]
	let retCount = 0
	// available in store
	for (let i = 0; i < store.availableMeeples.length; i++) {
		ret[i] += store.availableMeeples[i]
	}
	// Held by players
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].hiddenMeeples.length; j++) {
			ret[j] += store.players[i].hiddenMeeples[j]
		}
	}
	// On boats
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		for (let j = 0; j < store.availableBoatTiles[i].itemsOnBoat.meeples.length; j++) {
			ret[store.availableBoatTiles[i].itemsOnBoat.meeples[j]]++
		}
	}

	for (let i = 0; i < store.availableTiles.length; i++) {
		let tile = store.availableTiles[i]
		// On available tiles
		for (let j = 0; j < tile.meeplesOnTile.length; j++) {
			for (let k = 0; k < tile.meeplesOnTile[j].length; k++) {
				ret[tile.meeplesOnTile[j][k]]++
			}
		}

		// bid
		for (let j = 0; j < tile.bids.length; j++) {
			for (let k = 0; k < tile.bids[j][0].length; k++) {
				ret[tile.bids[j][0][k]]++
			}
		}
	}

	// Bid on TO
	for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
		let tile = store.availableTurnOrderTiles[i]

		// bids
		for (let j = 0; j < tile.bids.length; j++) {
			for (let k = 0; k < tile.bids[j][0].length; k++) {
				ret[tile.bids[j][0][k]]++
			}
		}
	}

	// On player villages
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].villageTiles.length; j++) {
			let tile = store.players[i].villageTiles[j]
			// On available tiles
			for (let j = 0; j < tile.meeplesOnTile.length; j++) {
				for (let k = 0; k < tile.meeplesOnTile[j].length; k++) {
					ret[tile.meeplesOnTile[j][k]]++
				}
			}
		}
	}

	// Add in available green
	ret[3] += store.availableGreenMeeples
	// Add in greens onboats
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		ret[3] += store.availableBoatTiles[i].itemsOnBoat.greenMeeples
	}
	// IF final scoring, add in stuff on itemsets
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING || store.gameflow.phase === rf.PHASE_GAME_OVER) {
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].villageTiles.length; j++) {
				let tile = store.players[i].villageTiles[j]
				if (tile.tileItemType === rf.TILE_ITEM_TYPE_MEEPLES) {
					for (let k = 0; k < tile.completedSets.length; k++) {
						for (let m = 0; m < tile.completedSets[k].length; m++) ret[tile.completedSets[k][m]]++
					}
				}
			}
		}
	}

	if (personal.trainingGame && store.gameflow.turn !== 1) {
		if (ret[0] !== 40) store.gameMessages.errorText ="Missing BLUE"
		if (ret[1] !== 40) store.gameMessages.errorText ="Missing RED"
		if (ret[2] !== 40) store.gameMessages.errorText ="Missing YELLOW"
		if (ret[3] !== 20) store.gameMessages.errorText ="Missing GREEN"
	}
	retCount = ret.reduce((acc, val) => acc + val, 0)
	retCount += store.availableMeeplesCount

	// Can't really do warnings, as the meeples of the other player are totally unknown

	return retCount
}

function findAllSkillTiles() {
	let ret = [0, 0, 0]
	// available in store
	for (let i = 0; i < store.availableSkills.length; i++) {
		ret[i] += store.availableSkills[i]
	}
	// Held by players
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].hiddenSkillTiles.length; j++) {
			ret[j] += store.players[i].hiddenSkillTiles[j]
		}
	}
	// On boats
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		for (let j = 0; j < store.availableBoatTiles[i].itemsOnBoat.skillTiles.length; j++) {
			ret[store.availableBoatTiles[i].itemsOnBoat.skillTiles[j]]++
		}
	}

	// IF final scoring, add in stuff on itemsets
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING || store.gameflow.phase === rf.PHASE_GAME_OVER) {
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].villageTiles.length; j++) {
				let tile = store.players[i].villageTiles[j]
				if (tile.tileItemType === rf.TILE_ITEM_TYPE_SKILLS) {
					for (let k = 0; k < tile.completedSets.length; k++) {
						for (let m = 0; m < tile.completedSets[k].length; m++) ret[tile.completedSets[k][m]]++
					}
				}
			}
			// And on contracts
			for (let j = 0; j < store.players[i].hiddenContracts.length; j++) {
				let contract = store.players[i].hiddenContracts[j]
				for (let k = 0; k < contract.chosenSkillTiles.length; k++) {
					ret[contract.chosenSkillTiles[k]]++
				}
			}
		}
	}

	if ((personal.trainingGame || personal.adminDataInspection) && !personal.haltPlay) {
		if (ret[0] !== 16) store.gameMessages.errorText ="Missing saw"
		if (ret[1] !== 16) store.gameMessages.errorText ="Missing pickaxe"
		if (ret[2] !== 16) store.gameMessages.errorText ="Missing anvil"
	}

	return ret
}

function getSkillBagCount() {
	let ret = [0, 0, 0]
	let retCount = 0
	// available in store
	for (let i = 0; i < store.availableSkills.length; i++) {
		ret[i] += store.availableSkills[i]
	}
	// Held by players
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].hiddenSkillTiles.length; j++) {
			ret[j] += store.players[i].hiddenSkillTiles[j]
		}
	}
	// On boats
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		for (let j = 0; j < store.availableBoatTiles[i].itemsOnBoat.skillTiles.length; j++) {
			ret[store.availableBoatTiles[i].itemsOnBoat.skillTiles[j]]++
		}
	}

	if (personal.trainingGame && store.gameflow.turn !== 1) {
		if (ret[0] !== 16) store.gameMessages.errorText ="Missing saw"
		if (ret[1] !== 16) store.gameMessages.errorText ="Missing pickaxe"
		if (ret[2] !== 16) store.gameMessages.errorText ="Missing anvil"
	}

	retCount = ret.reduce((acc, val) => acc + val, 0)
	retCount += store.availableSkillsCount
	return retCount
}

function localAdminDataInspection() {
	store.availableMeeples = [0, 0, 0, 0]
	IO.adminDataInspection()
}


</script>

<template>
	<body>
		<div class="meepleImgAndNumberDiv">
			<div class="meepleImgDiv">
				<img class="meepleImg" :src="view.getImage('meeple_green')" alt="Meeple" />
			</div>
			<div v-if="store.hiddenInformationKnowledge <= 1" class="meepleNumberDiv">
				{{ store.gameflow.turn }}
			</div>
		</div>

		<br />
		{{ store.context.finalPositions }}<br/>
		<button class="actionsLineButton" @click="localAdminDataInspection">Admin Data Inspection</button><br/>
		HO: {{ store.context.historyObj }} // OngoV: {{ store.ongoingVars }}
		<br />
		{{ store.context.boatChainWarnings }}
		<br />

		<div id="playerTableDiv">
			<table id="playerTable">
				<thead>
					<tr>
						<th><b>Player</b></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('meeple_purple')" alt="Meeple" /></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('meeple_blue')" alt="Meeple" /></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('meeple_red')" alt="Meeple" /></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('meeple_yellow')" alt="Meeple" /></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('meeple_green')" alt="Meeple" /></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('skillTile_0')" alt="Meeple" /></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('skillTile_1')" alt="Meeple" /></th>
						<th><img class="meepleHeaderImg" :src="view.getImage('skillTile_2')" alt="Meeple" /></th>
						<th><b>Winter Tiles</b></th>
					</tr>
				</thead>
				<!-- FOUND MEEPLES -->
				<tr>
					<td><b>Bags</b></td>
					<td></td>
					<td>{{ findAllMeeples()[0] }}</td>
					<td>{{ findAllMeeples()[1] }}</td>
					<td>{{ findAllMeeples()[2] }}</td>
					<td>{{ findAllMeeples()[3] }}</td>
					<td>{{ findAllSkillTiles()[0] }}</td>
					<td>{{ findAllSkillTiles()[1] }}</td>
					<td>{{ findAllSkillTiles()[2] }}</td>
				</tr>
				<tr v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">
					<!-- Player -->
					<td>
						<span
							class="mainEntryPlayer"
							:style="{
								backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
								color: personal.getCorrectedColourText(store.players[playerIndex].colour),
							}">
							{{ store.players[playerIndex].displayName }}
						</span>
					</td>
					<!-- MEEPLES-->
					<td><img v-if="store.players[playerIndex].hasPurpleMeeple" class="meepleHeaderImg" :src="view.getImage('meeple_purple')" alt="Meeple" /></td>
					<td>{{ store.players[playerIndex].hiddenMeeples[0] }}</td>
					<td>{{ store.players[playerIndex].hiddenMeeples[1] }}</td>
					<td>{{ store.players[playerIndex].hiddenMeeples[2] }}</td>
					<td>{{ store.players[playerIndex].hiddenMeeples[3] }}</td>
					<!-- Skill Tiles-->
					<td>{{ store.players[playerIndex].hiddenSkillTiles[0] }}</td>
					<td>{{ store.players[playerIndex].hiddenSkillTiles[1] }}</td>
					<td>{{ store.players[playerIndex].hiddenSkillTiles[2] }}</td>
					<!-- WINTER TILES -->
					<td>
						<template v-for="(winterTileID, idx) in store.players[playerIndex].hiddenWinterTile_tileIDs" :key="idx">
							<img class="hiddenWinterTileImg" :src="view.getImage(rf.ALL_TILES.find((tile) => tile.tileID[0] === winterTileID).gfx[0])" alt="WinterTile" />
						</template>
					</td>
				</tr>
				<!-- MEEPLE BAG -->
				<tr>
					<td><b>Meeple Bag</b></td>
					<td>{{ getMeepleBagCount() }}</td>
					<td>{{ store.availableMeeples[0] }}</td>
					<td>{{ store.availableMeeples[1] }}</td>
					<td>{{ store.availableMeeples[2] }}</td>
					<td>{{ store.availableMeeples[3] }}</td>
				</tr>
				<!-- SKILL BAG -->
				<tr>
					<td><b>Skill Bag</b></td>
					<td>{{ getSkillBagCount() }}</td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td>{{ store.availableSkills[0] }}</td>
					<td>{{ store.availableSkills[1] }}</td>
					<td>{{ store.availableSkills[2] }}</td>
				</tr>
				<!-- Green Meeple Pile -->
				<tr>
					<td><b>Green Meeples</b></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td>{{ store.availableGreenMeeples }}</td>
				</tr>
			</table>
		</div>

		<br />
		<!--- DEBUG DEBUG DEBUG-->
		<button @click="debugButton"><b>Debug</b></button>
		<br />
		<button @click="highlightAllTerrs"><b>Highlight All Territories</b></button>
		<button @click="makeCities"><b>Make Cities</b></button>
		<div id="terrInfoDiv">Territory Path:</div>

		<br />

		<div class="optionsDiv">
			<b>Map Actions</b>
			<br />
		</div>
		<div class="optionsDiv">
			<b>City Actions</b>
			<br />
		</div>
		<button @click="test1">Test 1</button>
		<button @click="test2">Test 2</button>

		<button @click="exportLoc">Export</button>
		<button @click="importLoc">Import</button>

		Money Cash:
		<input v-model="controller.currentPlayerObj().moneyCash" placeholder="edit me" id="moneyCashNumber" />

		<button @click="controller.currentPlayerObj().moneyCash++">+</button>
		<button @click="controller.currentPlayerObj().moneyCash--">-</button>
	</body>
</template>

<style scoped>
body {
	background-color: lightpink;
	padding: 10px;
}

#svg1 {
	background-color: lightblue;
	width: 100px;
}
#path1 {
	fill: black;
	fill-opacity: 0;
	stroke: yellow;
	stroke-width: 2;
	stroke-linecap: butt;
	stroke-linejoin: miter;
	stroke-opacity: 1;
}
#path1:hover {
	stroke: lightgreen;
}

.optionsDiv {
	display: inline-block;
	border: 2px solid black;
	padding: 2px;
}

button {
	margin: 2px;
}

#playerTableDiv {
	min-width: 700px; /* Fixed width for the left div */
	width: fit-content;
	margin: auto;
}

#playerTable {
	border-collapse: collapse;
	min-width: 600px;
	margin: auto;
}

#playerTable td,
#playerTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#playerTable tr {
	cursor: pointer;
	text-align: center;
}

#playerTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#playerTable tr:nth-child(odd) {
	background-color: white;
}

#playerTable tr:hover {
	background-color: #ddd;
}

#playerTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.meepleHeaderImg {
	width: 40px;
}

.hiddenWinterTileImg {
	width: 80px;
}

.meepleImgAndNumberDiv {
	display: flex;
	flex-direction: column; /* Stack the image and number vertically */
	align-items: center; /* Center them horizontally */
	background-color: #ddd;
	position: relative;
	height: 50px;
	width: 50px;
}

.meepleImgDiv {
	width: auto; /* Adjust as needed */
	overflow: hidden;
	position: absolute;
	bottom: 0px;
	height: 20px;
	width: 50px;
	background-color: red;
}

.meepleImg {
	position: absolute;
	left: 0;
	width: 100%;
	object-fit: contain; /* Important for scaling */
	bottom: 0px
}

</style>
