<script setup>
import * as view from "../js/TGZview"
import * as rf from "../js/TGZreference"
import * as model from "../js/TGZmodel"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

function getBiddingLine() {
	let ret = []
	let temp = [...JSON.parse(JSON.stringify(store.players))]
	for (let i = 0; i < temp.length; i++) temp[i].key = i
	temp.sort((a, b) => b.maxVR - a.maxVR)
	for (let i = 0; i < temp.length; i++) ret.push(temp[i].key)
	return ret
}
</script>

<template>
	<div class="playerBiddingLineDiv">
		<div
			v-if="model.anyoneHasSHADIPINYI()"
			class="playerBox"
			:style="{
				'background-color': personal.getCorrectedColourHex(store.players[model.anyoneHasSHADIPINYI(true)].colour),
				color: personal.getCorrectedColour(store.players[model.anyoneHasSHADIPINYI(true)].colour) === rf.WHITE || personal.getCorrectedColour(store.players[model.anyoneHasSHADIPINYI(true)].colour) === rf.YELLOW ? 'black' : 'white',
			}">
			<img class="playerTribeImg" :src="view.getImage('shad_plaque')" alt="SHAD" />
      <br/>
			<span class="playerNameSpan" >{{ store.players[model.anyoneHasSHADIPINYI(true)].displayName }}</span>


		</div>

		<div
			v-for="(playerIndex, index) in getBiddingLine()"
			:key="index"
			class="playerBox"
			:style="{
				'background-color': personal.getCorrectedColourHex(store.players[playerIndex].colour),
				color: personal.getCorrectedColour(store.players[playerIndex].colour) === rf.WHITE || personal.getCorrectedColour(store.players[playerIndex].colour) === rf.YELLOW ? 'black' : 'white',
			}">
			<img class="playerTribeImg" :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[playerIndex].colour))" alt="NR" />
			<br />
			<span class="playerNameSpan" >{{ store.players[playerIndex].displayName }}</span>
			<br />
		</div>
	</div>
</template>

<style scoped>
.playerBiddingLineDiv {
	white-space: nowrap;
	text-align: center;
}

.playerBox {
	border: 2px solid black;
	display: inline-block;
	margin-left: 5px;
	padding-bottom: 5px;
	width: 93px;
	height: 68px;

	white-space: nowrap;
	/*overflow: hidden;*/
	text-overflow: ellipsis;
	font-weight: bolder;
	vertical-align: top;
}

.playerTribeImg {
	width: 45px;
	height: 45px;
}

.playerNameSpan {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
