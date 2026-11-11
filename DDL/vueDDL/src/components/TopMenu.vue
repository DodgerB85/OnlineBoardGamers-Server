<script setup>
import * as rf from "../js/DDLreference"
import * as view from "../js/DDLview"
import * as IO from "../backend/DDL_IO"
import * as replay from "../js/DDLreplay.js"
import { useI18n } from "vue-i18n"

import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

const MIN_ZOOM = 40
const MAX_ZOOM = 220

function doZoom(step) {
	store.viewSettings.zoomPct = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, store.viewSettings.zoomPct + step))
}

function wholeMapZoom() {
	store.viewSettings.zoomFitToken += 1
}

function clearPanels() {
	store.gameMessages.bugErrorText = ""
	store.gameMessages.successText = ""
	store.gameMessages.errorText = ""
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
	if (store.viewSettings.showReplay) replay.exitReplay()
	else store.viewSettings.showReplay = true
}

function nextGame() {
	window.location.href = window.initData.nextURL
}

function loadRewind() {
	if (store.viewSettings.performingRewind) return
	store.viewSettings.performingRewind = true
	setTimeout(function () {
		IO.loadRewind()
	}, 300)
}

function resignGame() {
	if (!personal.canResign()) return
	if (!window.confirm(t("topMenu.resignConfirm"))) return
	IO.resign()
	window.location.reload()
}

function getKickoutTimerText() {
	if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
	let minsToGo = String(Math.floor(personal.secondsToNextKickout / 60))
	let secsToGo = "0" + String(Math.floor(personal.secondsToNextKickout % 60))
	return " " + minsToGo + " : " + secsToGo.slice(-2)
}
</script>

<template>
	<div id="top">
		<div id="menu">
			<a href="/">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-house')" alt="" />
					<span>{{ $t("topMenu.home") }}</span>
				</span>
			</a>

			<button type="button" v-if="personal.name" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" :aria-expanded="store.viewSettings.showChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" alt="" />
				<span>{{ $t("topMenu.chat") }}</span>
			</button>

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" :aria-expanded="store.viewSettings.showBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" alt="" />
				<span>{{ $t("topMenu.bug") }}</span>
			</button>

			<button type="button" v-if="personal.name" class="topMenuItem" :disabled="personal.haltPlay" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" alt="" />
				<span>{{ $t("topMenu.next") }}</span>
			</button>

			<div class="menuDivider"></div>

			<a href="/DDL/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" alt="" />
					<span>{{ $t("topMenu.rules") }}</span>
				</span>
			</a>

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showNotes }]" :aria-expanded="store.viewSettings.showNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" alt="" />
				<span>{{ $t("topMenu.notes") }}</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showInfo }]" :aria-expanded="store.viewSettings.showInfo" @click="toggleInfo">
				<img :src="view.getImage('icon-info')" alt="" />
				<span>{{ $t("topMenu.info") }}</span>
			</button>

			<div class="menuDivider"></div>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" :aria-expanded="store.viewSettings.showHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" alt="" />
				<span>{{ $t("topMenu.history") }}</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showReplay }]" :aria-expanded="store.viewSettings.showReplay" @click="toggleReplay">
				<img :src="view.getImage('icon-replay')" alt="" />
				<span>{{ $t("topMenu.replay") }}</span>
			</button>

			<div class="menuDivider"></div>

			<button type="button" v-if="personal.pov >= 0 && !personal.trainingGame" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" :aria-expanded="store.viewSettings.showRewindPanel" @click="store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel">
				<img :src="view.getImage('icon-rewind')" alt="" />
				<span>{{ $t("topMenu.rewind") }}</span>
			</button>

			<button type="button" v-if="personal.canResign()" class="topMenuItem" @click="resignGame">
				<img :src="view.getImage('resign')" alt="" />
				<span>{{ $t("topMenu.resign") }}</span>
			</button>
		</div>

		<div id="topInfos">
			<span class="gameInfoSpan">
				<span v-html="store.gameName"></span>
				| {{ $t("topMenu.turn") }}: {{ store.gameflow.turn }} - {{ view.phaseStr(store.gameflow.phase) }}
			</span>
			<div class="playerLineDiv">
				<template v-for="(playerIndex, idx) in store.gameflow.turnOrder" :key="idx">
					<span v-if="playerIndex !== -1" class="turnOrderSpan">
						<span class="turnOrderChip" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour) }"></span>
						<span class="turnOrderName">{{ store.players[playerIndex].displayName }}</span>
					</span>
				</template>
			</div>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name">
				<span v-if="personal.pov >= 0">{{ personal.name }}</span>
				<span v-else>{{ $t("topMenu.spectator") }}</span>
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<br />
				<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER">
					<span id="kickoutTimerSpan" :class="{ kickoutTimerBlink: personal.secondsToNextKickout < 60 }">{{ $t("topMenu.timeToNextKickout") }} <span id="kickoutTimerTimer">{{ getKickoutTimerText() }}</span></span>
				</template>
			</div>

			<div id="zoomDiv">
				<button class="tableZoomButton" :title="$t('topMenu.map')" @click="wholeMapZoom">{{ $t("topMenu.map") }}</button>
				<button class="zoomButton" :title="$t('topMenu.zoomIn')" @click="doZoom(15)">+</button>
				<button class="zoomButton" :title="$t('topMenu.zoomOut')" @click="doZoom(-15)">−</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.kickoutTimerBlink {
	animation: kickoutTimerBlink 1s step-end infinite;
}

@keyframes kickoutTimerBlink {
	0%, 100% { color: red; }
	50% { color: inherit; }
}

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

#zoomDiv {
	display: flex;
	justify-content: center;
	gap: 3px;
	margin-top: 2px;
}
.zoomButton,
.tableZoomButton {
	min-width: 22px;
	font-weight: bolder;
	font-size: 14px;
	cursor: pointer;
}

#top {
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
#menu a:hover, .topMenuItem:hover { color: lightblue; }

.topMenuItem {
	display: inline-block;
	width: 62px;
	height: 55px;
	border-radius: 5px;
	cursor: pointer;
	text-align: center;
	background: transparent;
	border: 0;
	padding: 0;
	color: white;
	font-family: inherit;
	font-size: inherit;
	vertical-align: top;
}
.topMenuItem:focus-visible {
	outline: 2px solid lightblue;
	outline-offset: -2px;
}
.topMenuItem:disabled {
	opacity: 0.45;
	cursor: default;
}
.topMenuItem:disabled:hover { color: white; }
.topMenuItem:disabled:hover img { filter: none; }
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
#topInfos { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-width: 0; flex: 1 1 auto; overflow: hidden; }
.menuDivider { display: inline-block; width: 5px; height: 50px; background-color: darkgray; margin: 0px 10px 0px 10px; }
.turnOrderSpan { display: inline-flex; align-items: center; gap: 4px; padding: 5px; max-width: 150px; }
.turnOrderChip { width: 11px; height: 11px; border-radius: 50%; border: 1px solid #000; display: inline-block; flex: 0 0 auto; }
.turnOrderName { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gameInfoSpan { white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: block; }
.playerLineDiv { white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
</style>
