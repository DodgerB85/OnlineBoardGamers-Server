<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue"
import * as rf from "../js/URRreference"
import * as view from "../js/URRview"
import * as IO from "../backend/URR_IO"

import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
const menuElement = ref(null)
let menuObserver = null
onMounted(() => {
	menuObserver = new ResizeObserver(() => {
		document.documentElement.style.setProperty("--urr-menu-height", `${menuElement.value.getBoundingClientRect().height}px`)
	})
	menuObserver.observe(menuElement.value)
})
onBeforeUnmount(() => {
	menuObserver.disconnect()
	document.documentElement.style.removeProperty("--urr-menu-height")
})

function clearPanels() {
	store.gameMessages.bugErrorText = ""
	store.gameMessages.successText = ""
	if (!personal.haltPlay) store.gameMessages.errorText = ""
}

function toggleBug() {
	clearPanels()
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

function toggleNotes() {
	store.viewSettings.showBug = false
	store.viewSettings.showNotes = !store.viewSettings.showNotes
}

function toggleChat() {
	store.viewSettings.showHistory = false
	store.viewSettings.showChat = !store.viewSettings.showChat
}

function toggleInfo() {
	store.viewSettings.showInfo = !store.viewSettings.showInfo
}

function toggleHistory() {
	store.viewSettings.showChat = false
	store.viewSettings.showInfo = false
	store.viewSettings.showHistory = !store.viewSettings.showHistory
}

function toggleReplay() {
	store.viewSettings.showReplay = !store.viewSettings.showReplay
}

function nextGame() {
	window.location.href = window.initData.nextURL
}

async function resignGame() {
	if (!personal.canResign()) return
	if (!window.confirm("Are you sure you want to resign? You will be treated as a missing player.")) return
	if (await IO.resign()) window.location.reload()
}

function getKickoutTimerText() {
	if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
	let minsToGo = String(Math.floor(personal.secondsToNextKickout / 60))
	let secsToGo = "0" + String(Math.floor(personal.secondsToNextKickout % 60))
	return " " + minsToGo + " : " + secsToGo.slice(-2)
}
</script>

<template>
	<div id="top" ref="menuElement">
		<div id="menu">
			<a href="/">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-house')" alt="" />
					<span>Home</span>
				</span>
			</a>

			<button type="button" v-if="personal.name !== undefined" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" :aria-expanded="store.viewSettings.showChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" alt="" />
				<span>Chat</span>
			</button>

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" :aria-expanded="store.viewSettings.showBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" alt="" />
				<span>Bug</span>
			</button>

			<button type="button" v-if="personal.name !== undefined" class="topMenuItem" :disabled="store.viewSettings.isSaving || store.viewSettings.performingRewind" :title="store.viewSettings.isSaving ? 'Saving move…' : 'Next game'" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" alt="" />
				<span>Next</span>
			</button>

			<div class="menuDivider"></div>

			<a href="/URR/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" alt="" />
					<span>Rules</span>
				</span>
			</a>

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showNotes }]" :aria-expanded="store.viewSettings.showNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" alt="" />
				<span>Notes</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showInfo }]" :aria-expanded="store.viewSettings.showInfo" @click="toggleInfo">
				<img :src="view.getImage('icon-info')" alt="" />
				<span>Info</span>
			</button>

			<div class="menuDivider"></div>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" :aria-expanded="store.viewSettings.showHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" alt="" />
				<span>History</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showReplay }]" :aria-expanded="store.viewSettings.showReplay" @click="toggleReplay">
				<img :src="view.getImage('icon-replay')" alt="" />
				<span>Replay</span>
			</button>

			<div class="menuDivider"></div>

			<button type="button" v-if="personal.pov >= 0 && !personal.trainingGame" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" :aria-expanded="store.viewSettings.showRewindPanel" @click="store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel">
				<img :src="view.getImage('icon-rewind')" alt="" />
				<span>Rewind</span>
			</button>

			<button type="button" v-if="personal.canResign()" class="topMenuItem" @click="resignGame">
				<img :src="view.getImage('resign')" alt="" />
				<span>Resign</span>
			</button>
		</div>

		<div id="topInfos">
			<span class="gameInfoSpan">
				<span v-html="store.gameName"></span>
				| Turn: {{ store.gameflow.turn }} - {{ view.phaseStr(store.gameflow.phase) }}
			</span>
			<div class="playerLineDiv">
				<template v-for="(playerIndex, idx) in store.gameflow.turnOrder" :key="idx">
					<span v-if="playerIndex !== -1" class="mainEntryPlayer turnOrderSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
				</template>
			</div>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name">
				{{ personal.name }}
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<br alt="" />
				<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER">
					<span id="kickoutTimerSpan">Time to next kickout: <span id="kickoutTimerTimer">{{ getKickoutTimerText() }}</span></span>
				</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
#WSstatus {
	border: 2px solid white;
	border-radius: 100%;
	width: 15px;
	height: 15px;
	display: inline-block;
	vertical-align: middle;
}
.WSconnecting { background-color: #ff9900; }
.WSconnected { background-color: green; }
.WSdisconnected { background-color: darkred; }

#top {
	overflow-x: auto;
	background-color: #333;
	color: white;
	padding: 0px;
	width: 100%;
	height: 60px;
	top: 0px;
	z-index: 2;
	position: relative;
	display: flex;
	white-space: nowrap;
	box-sizing: border-box;
}
#menu { flex-shrink: 0; color: white; }
#menu a { color: white; }
#menu a:hover, #menu span:hover { color: lightblue; }

.topMenuItem {
	display: inline-block;
	width: 62px;
	height: 55px;
	border-radius: 5px;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	padding: 0;
	vertical-align: top;
	cursor: pointer;
	text-align: center;
}
.topMenuItem:focus-visible { outline: 2px solid lightblue; outline-offset: -2px; }
.topMenuItem:disabled { opacity: .45; cursor: wait; }
.topMenuItem:hover img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
}
.topMenuItemSelected {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
	color: lightblue;
}
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 14px; font-weight: bold; display: block; }

#topRight { flex-shrink: 0; height: 100%; font-size: 14px; text-align: center; margin-right: 5px; }
#topInfos { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-width: fit-content; flex-shrink: 0; margin: 0 auto; }
.menuDivider { display: inline-block; width: 5px; height: 50px; background-color: darkgray; margin: 0px 10px 0px 10px; }
.turnOrderSpan { display: inline-block; padding: 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.gameInfoSpan { white-space: nowrap; }
.playerLineDiv { white-space: nowrap; }
@media (max-width: 1050px) {
	#top { height: auto; overflow: visible; flex-wrap: wrap; white-space: normal; }
	#menu { display: flex; flex-wrap: wrap; width: 100%; align-items: center; }
	#menu > a, #menu > .topMenuItem { flex: 1 0 52px; }
	.topMenuItem { width: 100%; height: 48px; padding-top: 3px; box-sizing: border-box; }
	.topMenuItem img { width: 30px; height: 30px; }
	.topMenuItem span { font-size: 12px; line-height: 14px; }
	.menuDivider, #topInfos { display: none; }
	#topRight { width: 100%; margin: 0; height: auto; font-size: 11px; padding: 2px 4px; box-sizing: border-box; text-align: right; overflow-wrap: anywhere; }
	#WSstatus { width: 9px; height: 9px; }
	#loggedInDiv > br { display: none; }
	#kickoutTimerSpan { margin-left: 8px; }
}
@media (max-width: 650px) {
	#menu > a, #menu > .topMenuItem { flex-basis: 40px; }
	.topMenuItem { height: 44px; }
	.topMenuItem img { width: 26px; height: 26px; }
	.topMenuItem span { font-size: 10px; line-height: 12px; }
}
</style>
