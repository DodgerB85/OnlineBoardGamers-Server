<script setup>
import PlayerMarker from "./PlayerMarker.vue"
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
	if (store.viewSettings.showChat) store.viewSettings.showChat = false
	else {
		store.viewSettings.showChat = true
		setTimeout(function () {
			var el = document.getElementById("wholeChat")
			var cs = getComputedStyle(el)
			var b = document.getElementById("footer").getBoundingClientRect().top
			var a = el.getBoundingClientRect().top + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
			el.style["max-height"] = String(parseInt(b - a)) + "px"
		}, 50)
	}
}

function toggleInfo() {
	store.viewSettings.showInfo = !store.viewSettings.showInfo
}

function toggleHistory() {
	store.viewSettings.showChat = false
	store.viewSettings.showInfo = false
	if (store.viewSettings.showHistory) store.viewSettings.showHistory = false
	else {
		store.viewSettings.showHistory = true
		setTimeout(function () {
			var el = document.getElementById("history")
			var cs = getComputedStyle(el)
			var b = document.getElementById("footer").getBoundingClientRect().top
			var a = el.getBoundingClientRect().top + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
			el.style["max-height"] = String(parseInt(b - a)) + "px"
		}, 50)
	}
}

function toggleReplay() {
	store.viewSettings.showReplay = !store.viewSettings.showReplay
}

// Practice games have no votes to cast; loadRewind confirms before saving.
function loadRewind() {
	if (!personal.trainingGame) store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel
	else IO.loadRewind()
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

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.viewSettings.showNotes }]" :aria-expanded="store.viewSettings.showNotes" @click="toggleNotes">
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

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" :aria-expanded="store.viewSettings.showRewindPanel" @click="loadRewind()">
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
				<template v-for="(playerIndex, idx) in view.displayedTurnOrder(store)" :key="idx">
					<span v-if="playerIndex !== -1" class="mainEntryPlayer turnOrderSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)"><PlayerMarker :index="playerIndex" /></span>
				</template>
			</div>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name">
				<PlayerMarker v-if="personal.pov >= 0" :index="personal.pov" /><span v-else :title="personal.name">Spectator</span>
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<br alt="" />
				<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER">
					<span id="kickoutTimerSpan">Time to next kickout: <span id="kickoutTimerTimer">{{ getKickoutTimerText() }}</span></span>
				</template>
			</div>
			<div id="zoomDiv" class="mapZoom">
				<button @click="store.viewSettings.boardZoom = Math.min(3, store.viewSettings.boardZoom + .25)" :disabled="store.viewSettings.boardZoom >= 3" aria-label="Zoom in">🔍+</button>
				<button @click="store.viewSettings.boardZoom = Math.max(.5, store.viewSettings.boardZoom - .25)" :disabled="store.viewSettings.boardZoom <= .5" aria-label="Zoom out">🔍−</button>
				<button @click="store.viewSettings.boardZoom = 1" title="Fit the board">{{ Math.round(store.viewSettings.boardZoom * 100) }}%</button>
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
	min-width: 1400px;
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
.hasNotes {
	filter: brightness(0) saturate(100%) invert(83%) sepia(61%) saturate(1522%) hue-rotate(359deg) brightness(105%) contrast(108%);
}
.topMenuItemSelected {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
	color: lightblue;
}
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 16px; font-weight: bold; display: block; }

#topRight { flex-shrink: 0; height: 100%; font-size: 16px; font-weight: 600; text-align: center; margin-right: 5px; }
#zoomDiv { display: flex; justify-content: flex-end; gap: 4px; margin-top: 3px; }#zoomDiv button { min-height: 25px; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; }#zoomDiv button:disabled { opacity: .4; cursor: default; }
#topInfos { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-width: fit-content; flex-shrink: 0; margin: 0 auto; }
.menuDivider { display: inline-block; width: 5px; height: 50px; background-color: darkgray; margin: 0px 10px 0px 10px; }
.turnOrderSpan { display: inline-block; padding: 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.gameInfoSpan { white-space: nowrap; }
.playerLineDiv { white-space: nowrap; }
</style>
