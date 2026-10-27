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

function fitMap() {
	store.viewSettings.boardZoom = 1
	document.querySelector(".mapContainer")?.scrollIntoView({ block: "start", behavior: "smooth" })
}
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

function toggleOverview() {
	store.viewSettings.showOverview = !store.viewSettings.showOverview
}

function toggleHistory() {
	store.viewSettings.showChat = false
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

// Practice games have no votes to cast, so rewind straight away; normal games open the rewind/votes panel.
function loadRewind() {
	if (!personal.trainingGame) store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel
	else IO.loadRewind()
}

function nextGame() {
	window.location.href = window.initData.nextURL
}

function resignGame() {
	store.viewSettings.showResignPanel = !store.viewSettings.showResignPanel
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
					<span>{{ $t("topMenu.home") }}</span>
				</span>
			</a>

			<button type="button" v-if="personal.name !== undefined" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" :aria-expanded="store.viewSettings.showChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" alt="" />
				<span>{{ $t("topMenu.chat") }}</span>
			</button>

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" :aria-expanded="store.viewSettings.showBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" alt="" />
				<span>{{ $t("topMenu.bug") }}</span>
			</button>

			<button type="button" v-if="personal.name !== undefined" class="topMenuItem" :disabled="store.viewSettings.isSaving || store.viewSettings.performingRewind" :title="store.viewSettings.isSaving ? $t('topMenu.savingMove') : $t('topMenu.nextGame')" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" alt="" />
				<span>{{ $t("topMenu.next") }}</span>
			</button>

			<div class="menuDivider"></div>

			<a href="/URR/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" alt="" />
					<span>{{ $t("topMenu.rules") }}</span>
				</span>
			</a>

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.viewSettings.showNotes }]" :aria-expanded="store.viewSettings.showNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" alt="" />
				<span>{{ $t("topMenu.notes") }}</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showEquipmentSupply }]" :aria-expanded="store.viewSettings.showEquipmentSupply" aria-controls="equipmentSupply" @click="store.viewSettings.showEquipmentSupply = !store.viewSettings.showEquipmentSupply">
				<img :src="view.getImage('icon-hand-card')" alt="" />
				<span>{{ $t("supply.allEras") }}</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showLandPrices }]" :aria-expanded="store.viewSettings.showLandPrices" aria-controls="landPrices" @click="store.viewSettings.showLandPrices = !store.viewSettings.showLandPrices">
				<img :src="view.getImage('icon-price-tag')" alt="" />
				<span>{{ $t("market.landPrices") }}</span>
			</button>

			<button type="button" class="overviewToggle" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showOverview }]" :aria-expanded="store.viewSettings.showOverview" @click="toggleOverview">
				<img :src="view.getImage('icon-info')" alt="" />
				<span>{{ $t("turnOrder.overview") }}</span>
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

			<button type="button" v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" :aria-expanded="store.viewSettings.showRewindPanel" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" alt="" />
				<span>{{ $t("topMenu.rewind") }}</span>
			</button>

			<button type="button" v-if="personal.canResign()" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showResignPanel }]" :aria-expanded="store.viewSettings.showResignPanel" @click="resignGame">
				<img :src="view.getImage('resign')" alt="" />
				<span>{{ $t("topMenu.resign") }}</span>
			</button>
		</div>

		<div id="topInfos">
			<span class="gameInfoSpan">
				<span v-html="store.gameName"></span>
				| {{ $t("topMenu.turn") }} {{ store.gameflow.turn }} - {{ view.phaseStr(store.gameflow.phase) }}
			</span>
			<div class="playerLineDiv">
				<template v-for="(playerIndex, idx) in view.displayedTurnOrder(store)" :key="idx">
					<span v-if="playerIndex !== -1" class="mainEntryPlayer turnOrderSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)"><PlayerMarker :index="playerIndex" /></span>
				</template>
			</div>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name">
				<PlayerMarker v-if="personal.pov >= 0" :index="personal.pov" /><span v-else :title="personal.name">{{ $t("topMenu.spectator") }}</span>
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<br alt="" />
				<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER">
					<span id="kickoutTimerSpan">{{ $t("topMenu.timeToNextKickout") }} <span id="kickoutTimerTimer">{{ getKickoutTimerText() }}</span></span>
				</template>
			</div>
			<div id="zoomDiv" class="mapZoom">
				<button @click="store.viewSettings.boardZoom = Math.min(3, store.viewSettings.boardZoom + .25)" :disabled="store.viewSettings.boardZoom >= 3" :aria-label="$t('topMenu.zoomIn')">🔍+</button>
				<button @click="store.viewSettings.boardZoom = Math.max(.5, store.viewSettings.boardZoom - .25)" :disabled="store.viewSettings.boardZoom <= .5" :aria-label="$t('topMenu.zoomOut')">🔍−</button>
				<button @click="fitMap" :title="$t('topMenu.fitMapTitle')">{{ $t("topMenu.fitMap") }}</button>
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
	min-width: 1380px;
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
	min-width: 62px;
	width: max-content;
	box-sizing: border-box;
	height: 55px;
	border-radius: 5px;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	padding: 0 8px;
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

#topRight { flex-shrink: 0; height: 100%; font-size: 16px; font-weight: 400; text-align: center; margin-right: 5px; }
#zoomDiv { display: flex; justify-content: flex-end; gap: 4px; margin-top: 3px; }#zoomDiv button { min-height: 25px; font: inherit; font-size: 16px; font-weight: 400; cursor: pointer; }#zoomDiv button:disabled { opacity: .4; cursor: default; }
#topInfos { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-width: fit-content; flex-shrink: 0; margin: 0 auto; }
.menuDivider { display: inline-block; width: 5px; height: 50px; background-color: darkgray; margin: 0px 10px 0px 10px; }
.turnOrderSpan { display: inline-block; padding: 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.gameInfoSpan { white-space: nowrap; }
.playerLineDiv { white-space: nowrap; }
</style>
