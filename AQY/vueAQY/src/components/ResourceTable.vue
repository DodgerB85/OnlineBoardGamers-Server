<script setup>
/** This is the City top building store
 * IE multi-build bldgs, player res, player bldgs
 */

import * as view from "../js/AQYview.js"
import * as rf from "../js/AQYreference.js"
import * as city from "../js/AQYcity.js"
import * as model from "../js/AQYmodel.js"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()
const store = useModelStore()

//defineProps(['playerIndex', 'playerIndex'])
const props = defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})

function isResSelectable(res) {
	// Can if you are trading IN
	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.context.tradingAwayGoods.length == 2) return true
	if (store.context.action === rf.ACT_SETUP_PLAYER_TRADE) {
		if (props.playerIndexProp === personal.pov) {
			let availableRes = store.players[props.playerIndexProp].availableResources[res]
			const resAlreadyInTrade = store.context.setupPlayerTrade.yourResources.reduce((count, num) => {
				return count + (num === res ? 1 : 0)
			}, 0)
			if (availableRes > resAlreadyInTrade) return true
			return false
		}
		if (props.playerIndexProp === store.context.setupPlayerTrade.selectedOpponent) {
			let availableRes = store.players[props.playerIndexProp].availableResources[res]
			const resAlreadyInTrade = store.context.setupPlayerTrade.opponentsResources.reduce((count, num) => {
				return count + (num === res ? 1 : 0)
			}, 0)
			if (availableRes > resAlreadyInTrade) return true
			return false
		}
		return false
	}

	if (!personal.trainingGame && props.playerIndexProp !== personal.pov) return false

	// Can't if you have none
	if (store.players[props.playerIndexProp].availableResources[res] === 0) return false
	// Can't if city build except trade
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING && store.gameflow.phase !== rf.PHASE_STORE_GOODS && store.gameflow.phase !== rf.PRE_PHASE_STORE_GOODS) return false
	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.context.action !== rf.ACT_TRADE_BOARD && store.context.action !== rf.ACT_SETUP_PLAYER_TRADE) return false
	if ((store.gameflow.phase === rf.PHASE_STORE_GOODS || store.gameflow.phase === rf.PRE_PHASE_STORE_GOODS) && store.context.resourcesToDiscard === 0) return false

	// Can if you have more than 2
	if (store.players[props.playerIndexProp].availableResources[res] >= 2) return true
	// Can if you have 1 and it's not in the trade
	if (store.players[props.playerIndexProp].availableResources[res] === 1 && !store.context.tradingAwayGoods.includes(res)) return true
	return false
}

function clickedRes(res) {
	if (!isResSelectable(res)) return

	if ((store.gameflow.phase == rf.PHASE_STORE_GOODS || store.gameflow.phase == rf.PRE_PHASE_STORE_GOODS) && store.context.resourcesToDiscard > 0 && store.players[props.playerIndexProp].availableResources[res] > 0) {
		store.players[props.playerIndexProp].availableResources[res]--
		store.context.resourcesToDiscard--
		store.context.discardedResources.push(res)
		return
	}

	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.context.action === rf.ACT_SETUP_PLAYER_TRADE) {
		store.context.tradingAwayGoods.splice(0)
		if (props.playerIndexProp === personal.pov) {
			store.context.setupPlayerTrade.yourResources.push(res)
		} else if (props.playerIndexProp === store.context.setupPlayerTrade.selectedOpponent) {
			store.context.setupPlayerTrade.opponentsResources.push(res)
		}

		return
	}

	if (store.context.tradingAwayGoods.length < 2) {
		store.context.tradingAwayGoods.push(res)
	} else {
		// Action the trade
		for (let i = 0; i < store.context.tradingAwayGoods.length; i++) {
			store.players[props.playerIndexProp].availableResources[store.context.tradingAwayGoods[i]]--
		}
		store.players[props.playerIndexProp].availableResources[res]++
		store.players[props.playerIndexProp].cityHistory.boardTrades.push([store.context.tradingAwayGoods[0], store.context.tradingAwayGoods[1], res])
		store.clearVars()

		// RESET BUILDING TO MARKET
		store.context.cityBuildingToDisplay = rf.BLDG_MARKET
		store.context.cityBuildingBeingAddedRotation = 0
		store.context.cityBuildingToDisplayData = rf.BLDG_DATA[rf.BLDG_ARRAY[store.context.cityBuildingToDisplay]]
		store.context.action = rf.ACT_TRADE_BOARD

		// Mark market as used this turn
		city.markBuildingAsUsed(props.playerIndexProp, rf.BLDG_MARKET)
		model.createUndoPoint()
	}
}

/*function getTopPos(res) {
	if (res === rf.RES_GRAIN) return 47
	if (res === rf.RES_OLIVES) return 47
	if (res === rf.RES_SHEEP) return 47
	if (res === rf.RES_FISH) return 47

	if (res === rf.RES_WINE) return 98
	if (res === rf.RES_PEARLS) return 98
	if (res === rf.RES_DYE) return 98
	if (res === rf.RES_GOLD) return 98

	if (res === rf.RES_STONE) return 149
	if (res === rf.RES_WOOD) return 149
	return 0
}
function getLeftPos(res) {
	if (res === rf.RES_GRAIN) return 86
	if (res === rf.RES_OLIVES) return 119
	if (res === rf.RES_SHEEP) return 152
	if (res === rf.RES_FISH) return 212

	if (res === rf.RES_WINE) return 118
	if (res === rf.RES_PEARLS) return 195
	if (res === rf.RES_DYE) return 229
	if (res === rf.RES_GOLD) return 277

	if (res === rf.RES_STONE) return 277
	if (res === rf.RES_WOOD) return 342

	return 0
}*/

function getTHandTDstyle() {
	return `border-color: ${personal.getCorrectedColourHex(store.players[props.playerIndexProp].colour)};`
}
</script>

<template>
	<!-- RESOURCES-->
	<!--<div class="resDiv">
		<img id="resBankImg" :src="static/AQY/images/res_bank.jpg" />
		<template v-for="(num, res) in store.players[playerIndexProp].availableResources" :key="res">
			<div
				v-if="num !== 0 || canSelectResToTrade(res)"
				class="resImgDiv"
				:class="[{ noRes: num === 0 }, { resSelectable: canSelectResToTrade(res) }]"
				:style="{
					top: String(getTopPos(res)) + 'px',
					left: String(getLeftPos(res)) + 'px',
				}"
				@click="clickedRes(res)">
				<img :src="view.getImage('res_' + String(res))" />
				<div v-if="num !== 0" onselectstart="return false;" class="resNumDiv">{{ num }}</div>
			</div>
		</template>
	</div>-->

	<!-- Table style SAME AS THE PLAYER AID-->
	<!--<div
		class="resDiv"
		:style="{
			border: '6px solid ' + personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
		}">
		<div class="table-container">
			<table class="resTable">
				<thead>
					<tr>
						<th></th>
						<th id="farmHead">Farm</th>
						<th>Fishery</th>
						<th>Mine</th>
						<th>Wood</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th>Food</th>
						<td>
							<template v-for="(res, idx) in [rf.RES_GRAIN, rf.RES_OLIVES, rf.RES_SHEEP]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
						<td>
							<div class="resAndTextDiv">
								<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[rf.RES_FISH] === 0 }, { resSelectable: isResSelectable(rf.RES_FISH) }]" @click="clickedRes(rf.RES_FISH)">
									<img :src="view.getImage('res_' + String(rf.RES_FISH))" />
									<div v-if="store.players[playerIndexProp].availableResources[rf.RES_FISH] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[rf.RES_FISH] }}</div>
								</div>
								<br />
								{{ rf.RES_TEXT[rf.RES_FISH] }}
							</div>
						</td>
						<td></td>
						<td></td>
					</tr>
					<tr>
						<th>Lux</th>
						<td>
							<div class="resAndTextDiv">
								<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[rf.RES_WINE] === 0 }, { resSelectable: isResSelectable(rf.RES_WINE) }]" @click="clickedRes(rf.RES_WINE)">
									<img :src="view.getImage('res_' + String(rf.RES_WINE))" />
									<div v-if="store.players[playerIndexProp].availableResources[rf.RES_WINE] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[rf.RES_WINE] }}</div>
								</div>
								<br />
								{{ rf.RES_TEXT[rf.RES_WINE] }}
							</div>
						</td>
						<td>
							<template v-for="(res, idx) in [rf.RES_PEARLS, rf.RES_DYE]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
						<td>
							<template v-for="(res, idx) in [rf.RES_GOLD]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
						<td></td>
					</tr>
					<tr>
						<th>Raw</th>
						<td></td>
						<td></td>
						<td>
							<template v-for="(res, idx) in [rf.RES_STONE]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
						<td>
							<template v-for="(res, idx) in [rf.RES_WOOD]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>-->

	<!-- Table style DONE MY WAY-->
	<div
		class="resDiv"
		:style="{
			border: '6px solid ' + personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
		}">
		<div class="table-container">
			<table class="resTable">
				<thead>
					<tr>
						<th :style="getTHandTDstyle()"></th>
						<th :style="getTHandTDstyle()">Wood</th>
						<th :style="getTHandTDstyle()">Mine</th>
						<th id="farmHead" :style="getTHandTDstyle()">Farm</th>
						<th :style="getTHandTDstyle()">Fishery</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th :style="getTHandTDstyle()">Raw</th>
						<td :style="getTHandTDstyle()">
							<!-- RAW + WOOD -->
							<template v-for="(res, idx) in [rf.RES_WOOD]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>

						<td :style="getTHandTDstyle()">
							<!-- RAW + MINE -->
							<template v-for="(res, idx) in [rf.RES_STONE]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
						<td :style="getTHandTDstyle()"></td>
						<td :style="getTHandTDstyle()"></td>
					</tr>
					<tr>
						<th :style="getTHandTDstyle()">Food</th>
						<td :style="getTHandTDstyle()"></td>
						<td :style="getTHandTDstyle()"></td>
						<td :style="getTHandTDstyle()">
							<!-- FOOD + FARM -->
							<template v-for="(res, idx) in [rf.RES_GRAIN, rf.RES_OLIVES, rf.RES_SHEEP]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
						<td :style="getTHandTDstyle()">
							<!-- FOOD + FISHERMAN -->
							<div class="resAndTextDiv">
								<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[rf.RES_FISH] === 0 }, { resSelectable: isResSelectable(rf.RES_FISH) }]" @click="clickedRes(rf.RES_FISH)">
									<img :src="view.getImage('res_' + String(rf.RES_FISH))" />
									<div v-if="store.players[playerIndexProp].availableResources[rf.RES_FISH] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[rf.RES_FISH] }}</div>
								</div>
								<br />
								{{ rf.RES_TEXT[rf.RES_FISH] }}
							</div>
						</td>
					</tr>
					<tr>
						<th :style="getTHandTDstyle()">Lux</th>
						<td :style="getTHandTDstyle()"></td>
						<td :style="getTHandTDstyle()">
							<!-- LUX + MINE -->
							<template v-for="(res, idx) in [rf.RES_GOLD]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
						<td :style="getTHandTDstyle()">
							<!-- LUX + FARM -->
							<div class="resAndTextDiv">
								<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[rf.RES_WINE] === 0 }, { resSelectable: isResSelectable(rf.RES_WINE) }]" @click="clickedRes(rf.RES_WINE)">
									<img :src="view.getImage('res_' + String(rf.RES_WINE))" />
									<div v-if="store.players[playerIndexProp].availableResources[rf.RES_WINE] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[rf.RES_WINE] }}</div>
								</div>
								<br />
								{{ rf.RES_TEXT[rf.RES_WINE] }}
							</div>
						</td>
						<td :style="getTHandTDstyle()">
							<!-- LUX + FISHERMAN -->
							<template v-for="(res, idx) in [rf.RES_PEARLS, rf.RES_DYE]" :key="idx">
								<div class="resAndTextDiv">
									<div class="resImgInTableDiv" :class="[{ noRes: store.players[playerIndexProp].availableResources[res] === 0 }, { resSelectable: isResSelectable(res) }]" @click="clickedRes(res)">
										<img :src="view.getImage('res_' + String(res))" />
										<div v-if="store.players[playerIndexProp].availableResources[res] !== 0" onselectstart="return false;" class="resNumDiv">{{ store.players[playerIndexProp].availableResources[res] }}</div>
									</div>
									<br />
									{{ rf.RES_TEXT[res] }}
								</div>
							</template>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
.resAndTextDiv {
	display: inline-block;
	font-size: 11px;
	font-weight: bolder;
}
#farmHead {
	min-width: fit-content;
}

.resTable {
	border-collapse: collapse;
	width: 100%;
}

.resTable th,
.resTable td {
	border: 2px solid;
	padding: 1px;
	text-align: center;
}

.resDiv {
	display: inline-block;
	box-sizing: border-box;
	font-weight: bolder;
	font-size: 20px;
	width: 403px;
	height: fit-content;
	padding: 0px;
	position: relative;
	background-color: #f8f0dd;
}

#resBankImg {
	width: 100%;
	/* height: 160px;*/
	height: 100%;
	margin: 0px;
}

.resImg {
	border: 2px solid black;
	width: 45px;
	height: 45px;
	vertical-align: middle;
}

.resImgDiv {
	position: absolute;
	top: 0px;
	left: 0px;
	border: 2px solid black;
	width: 33px;
	height: 33px;
}

.resImgInTableDiv {
	border: 2px solid black;
	width: 33px;
	height: 33px;
	display: inline-block;
	position: relative;
}

.resImgInTableDiv img,
.resImgDiv img {
	width: 100%;
	height: 100%;
}

.resNumDiv {
	position: absolute;
	font-size: 25px;
	font-weight: bold;
	cursor: inherit;

	top: 0px;
	left: 0px;
	width: 100%;
	text-align: center;
	justify-content: center;
	vertical-align: middle;
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
}

.noRes {
	opacity: 0.8;
	border-color: red;
}

.resSelectable {
	border-color: yellow;
	border-width: 2px;
	opacity: 1 !important;
}

.resSelectable:hover {
	border-color: lightgreen;
	border-width: 2px;
	cursor: pointer;
}

.resTable th:first-child,
.resTable td:first-child {
	border-left: none;
}

.resTable th:last-child,
.resTable td:last-child {
	border-right: none;
}

.resTable tr:first-child th {
	border-top: none;
}

.resTable tr:last-child td {
	border-bottom: none;
}
</style>
