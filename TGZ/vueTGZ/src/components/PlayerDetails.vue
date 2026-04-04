<script setup>
import * as view from "../js/TGZview"
import * as rf from "../js/TGZreference"
import * as model from "../js/TGZmodel"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

import { defineProps } from 'vue'
const props = defineProps(["playerIndex"])

function getRemainigItems(tech0) {
	if (tech0 === rf.BLACKSMITH_TECH) return store.remainingItems[rf.BLACKSMITH_TILE]
	else return store.remainingItems[Math.floor(tech0 / 2)]
}

function getStatsForTech(playerIndex, tech) {
	if (tech === rf.WOOD_CARVER_TECH_A || tech === rf.WOOD_CARVER_TECH_B) return store.statsModeData.techIncomeArray[playerIndex][0]
	if (tech === rf.POTTER_TECH_A || tech === rf.POTTER_TECH_B) return store.statsModeData.techIncomeArray[playerIndex][1]
	if (tech === rf.IVORY_CARVER_TECH_A || tech === rf.IVORY_CARVER_TECH_B) return store.statsModeData.techIncomeArray[playerIndex][2]
	if (tech === rf.DIAMOND_CUTTER_TECH_A || tech === rf.DIAMOND_CUTTER_TECH_B) return store.statsModeData.techIncomeArray[playerIndex][3]
	if (tech === rf.SCULPTOR_TECH_A || tech === rf.SCULPTOR_TECH_B) return store.statsModeData.techIncomeArray[playerIndex][4]
	if (tech === rf.VESSEL_MAKER_TECH_A || tech === rf.VESSEL_MAKER_TECH_B) return store.statsModeData.techIncomeArray[playerIndex][5]
	if (tech === rf.THRONE_MAKER_TECH_A || tech === rf.THRONE_MAKER_TECH_B) return store.statsModeData.techIncomeArray[playerIndex][6]
	if (tech === rf.BLACKSMITH_TECH) return store.statsModeData.techIncomeArray[playerIndex][7]
}

function getStatsForSpec(spec) {
	if (spec === rf.HERD) return store.statsModeData.specsandgodsObj.herd
	if (spec === rf.NOMADS) return store.statsModeData.specsandgodsObj.nomads
	if (spec === rf.RAIN_CEREMONY) return store.statsModeData.specsandgodsObj.rainCeremony
	if (spec === rf.SHAMAN) return store.statsModeData.specsandgodsObj.shaman
	if (spec === rf.BUILDER) return store.statsModeData.specsandgodsObj.builder
	return "??"
}

function getStatsFor_god(god) {
  if (god === rf.ENGAI) return store.statsModeData.specsandgodsObj.engai
  if (god === rf.SHADIPINYI) return store.statsModeData.specsandgodsObj.shadipinyi
  if (god === rf.QAMATA) return store.statsModeData.specsandgodsObj.qamata
  if (god === rf.AJA) return store.statsModeData.specsandgodsObj.aja
  if (god === rf.OVIA) return store.statsModeData.specsandgodsObj.ovia
  if (god === rf.EKWENSU) return store.statsModeData.specsandgodsObj.ekwensu

  return 99
}
</script>

<template>
	<div
		v-if="playerIndex !== -1"
		class="playerDetailsDiv"
		:style="{
			'background-color': personal.getCorrectedColourHex(store.players[playerIndex].colour),
			color: personal.getCorrectedColour(store.players[playerIndex].colour) === rf.WHITE || personal.getCorrectedColour(store.players[playerIndex].colour) === rf.YELLOW ? 'black' : 'white',
		}">
		<!-- gods -->
		<template v-for="(godData, godIndex) in model.getPlayer_gods(store.players[playerIndex])" :key="godIndex">
			<div v-if="godData[0] !== rf.NO_god"
				:class="[personal.aidText ? 'cardDiv' : 'cardDivNoText']"
				:style="{
					'border-color': personal.getCorrectedColour(store.players[playerIndex].colour) === rf.BLACK ? 'white' : 'black',
				}">
				<img class="godImg" :src="view.getImage('god' + godData[0])" alt="god" />
				<div v-if="rf.gods_WITH_COWS.includes(godData[0]) || (godData[0] === rf.ENGAI && store.statsModeData.statsMode > 0)|| (godData[0] === rf.SHADIPINYI && store.statsModeData.statsMode > 0)" class="cowOnCardDiv">
					<img :src="view.getImage('cows1_bid')" alt="Cows" />
					<div class="cowsOnCardNumber">
        
						<span v-if="store.statsModeData.statsMode > 0">{{ getStatsFor_god(godData[0]) }}</span>
						<span v-else>{{ godData[1] }}</span>
			</div>
				</div>
				<template v-if="personal.aidText">
					<br />
					{{ rf.god_TEXT[godData[0]] }}
				</template>
				<br />
				<span v-if="rf.isVRchanged(godData[0]) || personal.aidText" :class="{ changedVR: rf.isVRchanged(godData[0]) }">VR: {{ rf.gods_VR[godData[0]] }}</span>
			</div>
		</template>
		<div v-if="model.getPlayer_gods(store.players[playerIndex]).every(god => god[0] === rf.NO_god)"
			:class="[personal.aidText ? 'cardDiv' : 'cardDivNoText', { no_god: true }]"
			:style="{
				'border-color': personal.getCorrectedColour(store.players[playerIndex].colour) === rf.BLACK ? 'white' : 'black',
			}">
			No god
		</div>

		<!-- SPECIALISTS -->
		<div
			v-for="(spec, idx) in store.players[playerIndex].specialists"
			:key="idx"
			:class="[personal.aidText ? 'cardDiv' : 'cardDivNoText']"
			:style="{
				'border-color': personal.getCorrectedColour(store.players[playerIndex].colour) === rf.BLACK ? 'white' : 'black',
			}">
			<img class="specImg" :src="view.getImage('spec' + spec[0])" alt="Spec" />
			<template v-if="personal.aidText">
				<br />
				{{ rf.SPEC_TEXT[spec[0]] }}
			</template>
			<br />
			<span v-if="rf.isSpecVRchanged(spec[0]) || personal.aidText" :class="{ changedVR: rf.isSpecVRchanged(spec[0]) }">VR: {{ rf.SPEC_VR[spec[0]] }}</span>

			<div class="cowOnCardDiv">
				<img :src="view.getImage('cows1_bid')" alt="Cows" />
				<div class="cowsOnCardNumber">
					<span v-if="store.statsModeData.statsMode > 0">{{ getStatsForSpec(spec[0]) }}</span>
					<span v-else>{{ spec[1] }}</span>
				</div>
			</div>
			<div v-if="spec[0] === rf.HERD && spec[1] > 0" class="cowOnCardDivHerdIncome">
				<img :src="view.getImage('cows1_bid')" alt="Cows" />
				<div class="cowsOnCardNumber">+{{ spec[1] / 2 }}</div>
			</div>
		</div>

		<!-- TECHS -->
		<div
			class="techArea"
			:style="{
				width: Math.ceil(store.players[playerIndex].techs.length / 2) * 260 + 'px',
			}">
			<div
				v-for="(tech, idx) in store.players[playerIndex].techs"
				:key="idx"
				class="techDiv"
				:style="{
					'border-color': personal.getCorrectedColour(store.players[playerIndex].colour) === rf.BLACK ? 'white' : 'black',
				}">
				<img :src="view.getImage('tech' + tech[0])" alt="Tech" />

				<div class="cowOnCardDiv">
					<img :src="view.getImage('cows1_bid')" alt="Cows" />
					<div class="cowsOnCardNumber">
						<span v-if="store.statsModeData.statsMode > 0">{{ getStatsForTech(playerIndex, tech[0]) }}</span>
						<span v-else>{{ tech[1] }}</span>
					</div>
				</div>
				<div class="remainingCmanDiv">({{ getRemainigItems(tech[0]) }})</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.playerDetailsDiv {
	width: 100%;
	margin: auto;
	padding: 5px;
	/*margin-top: -3px;*/
	border: 1px solid black;
	/*height: 386px;*/
	/*margin-left: -10px !important;*/
}

.cardDiv {
	display: inline-block;
	border: 2px solid black;
	margin: 2px;
	width: 200px;
	height: 366px;
	vertical-align: middle;
	position: relative;
}

.cardDivNoText {
	display: inline-block;
	margin-top: 2px;
	margin-bottom: 2px;
	margin-left: 5px;
	margin-right: 5px;
	width: 160px;
	height: fit-content;
	vertical-align: top;
	position: relative;
}

.cardDivNoText img {
	width: 100%;
}

.techArea {
	display: inline-block;
	height: 366px;
	vertical-align: middle;
	position: relative;
	flex-wrap: wrap;
	flex-direction: row;
}

.techDiv {
	display: inline-flex;
	flex-wrap: wrap;
	flex-direction: row;
	border: 2px solid black;
	border-radius: 10px;
	margin: 2px;
	width: 250px;
	height: 160px;
	position: relative;
	overflow: hidden;
}

.no_god {
	line-height: 366px;
	border: 2px solid black;
}

.techDiv img {
	width: 100%;
	height: 100%;
}

.cardDiv img {
	width: 80%;
}

.cowOnCardDiv {
	border: 2px solid black;
	position: absolute;
	top: 68px;
	left: 65px;
	width: 65px;
	height: 47px;
}

.cowOnCardDivHerdIncome {
	border: 2px solid black;
	position: absolute;
	top: 130px;
	left: 65px;
	width: 65px;
	height: 47px;
}

.cowOnCardDivHerdIncome img,
.cowOnCardDiv img {
	width: 100%;
	height: 100%;
}

.specImg,
.godImg {
	border-radius: 10px;
	border: 2px solid black;
}

.cowsOnCardNumber {
	position: relative;
	top: -53px;
	/*left: 17px;*/
	display: block;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	color: white;
	font-size: 45px;
}

.remainingCmanDiv {
	position: absolute;
	top: 62px;
	left: 182px;
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	font-size: 40px;
}

.changedVR {
	background-color: yellow;
	color: darkred;
}
</style>
