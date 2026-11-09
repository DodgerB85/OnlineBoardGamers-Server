<script setup>
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as replay from "../js/ROWreplay"
import * as view from "../js/ROWview"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"

const { Status } = rf
const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

const PANEL_KEYS = ["showBug", "showNotes", "showChat", "showInfo", "showVotes", "showHistory"]

function togglePanel(name) {
	const open = !store.viewSettings[name]
	for (const key of PANEL_KEYS) store.viewSettings[key] = false
	if (open) store.viewSettings[name] = true
}

function toggleChat() {
	if (!store.viewSettings.showChat) personal.chatNotification = false
	togglePanel("showChat")
}

function toggleReplay() {
	if (store.viewSettings.showReplay) replay.exitReplay()
	else replay.enterReplay()
}

function loadRewind() {
	if (store.saving || store.viewSettings.showReplay || store.viewSettings.performingRewind) return
	store.gameMessages.rewindErrorText = ""
	void controller.rewind()
}

function fitMap() {
	personal.zoom = rf.DEFAULT_ZOOM
	controller.persistZoom(personal.zoom)
	document.getElementById("rowBoard")?.scrollIntoView({ block: "start", behavior: "smooth" })
}

function zoom(dir) {
	personal.zoom = Math.min(rf.MAX_ZOOM, Math.max(rf.MIN_ZOOM, personal.zoom + dir))
	controller.persistZoom(personal.zoom)
}

function openResign() {
	for (const key of PANEL_KEYS) store.viewSettings[key] = false
	store.viewSettings.showResignPanel = true
}

function openResults() {
	for (const key of PANEL_KEYS) store.viewSettings[key] = false
	store.viewSettings.showResignPanel = false
	store.viewSettings.showEndedDialog = true
}

function nextGame() {
	if (nextURL.value && !store.saving && !store.viewSettings.performingRewind) window.location.href = nextURL.value
}

const nextURL = computed(() => String(window.initData?.nextURL ?? ""))
const gameName = computed(() => String(window.initData?.gameName ?? ""))
const players = computed(() => store.state?.players ?? [])
const phaseLabel = computed(() => {
	if (store.game?.isEnded()) return t("row.status.gameOver")
	if (store.state?.status === Status.BIDDING) return t("row.bidding.title")
	return t("row.status.playing")
})
const canResign = computed(
	() =>
		personal.pov >= 0 &&
		!personal.trainingGame &&
		!store.game?.isEnded() &&
		!store.missingPlayers.includes(personal.name),
)
const kickoutText = computed(() => {
	if (personal.trainingGame || personal.pov < 0 || store.game?.isEnded()) return ""
	const s = Math.max(0, personal.secondsToNextKickout)
	if (s > 1200) return ""
	const m = Math.floor(s / 60)
	const sec = String(s % 60).padStart(2, "0")
	return `${m} : ${sec}`
})

function playerColor(color) {
	return color ? color.toLowerCase() : "white"
}
</script>

<template>
	<div id="top">
		<div id="menu">
			<a href="/">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-house')" alt="" />
					<span>{{ t('topMenu.home') }}</span>
				</span>
			</a>

			<button v-if="personal.name" type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" :aria-expanded="store.viewSettings.showChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" alt="" />
				<span>{{ t('topMenu.chat') }}</span>
				<span v-if="personal.chatNotification" class="notifDot"></span>
			</button>

			<button v-if="personal.pov >= 0" type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" :aria-expanded="store.viewSettings.showBug" @click="togglePanel('showBug')">
				<img :src="view.getImage('icon-stop')" alt="" />
				<span>{{ t('topMenu.bug') }}</span>
			</button>

			<button v-if="nextURL" type="button" class="topMenuItem" :disabled="store.saving || store.viewSettings.performingRewind" :title="store.saving ? t('topMenu.savingMove') : t('topMenu.next')" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" alt="" />
				<span>{{ t('topMenu.next') }}</span>
			</button>

			<div class="menuDivider"></div>

			<a href="/ROW/help/" target="_blank" rel="noopener">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" alt="" />
					<span>{{ t('topMenu.rules') }}</span>
				</span>
			</a>

			<button v-if="personal.pov >= 0" type="button" :class="['topMenuItem', { hasNotes: personal.notes.length > 0, topMenuItemSelected: store.viewSettings.showNotes }]" :aria-expanded="store.viewSettings.showNotes" @click="togglePanel('showNotes')">
				<img :src="view.getImage('icon-notebook')" alt="" />
				<span>{{ t('topMenu.notes') }}</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showInfo }]" :aria-expanded="store.viewSettings.showInfo" @click="togglePanel('showInfo')">
				<img :src="view.getImage('icon-help')" alt="" />
				<span>{{ t('topMenu.info') }}</span>
			</button>

			<div class="menuDivider"></div>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" :aria-expanded="store.viewSettings.showHistory" @click="togglePanel('showHistory')">
				<img :src="view.getImage('icon-scroll')" alt="" />
				<span>{{ t('topMenu.history') }}</span>
			</button>

			<button v-if="personal.pov >= 0 && !personal.trainingGame && !store.game?.isEnded()" type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showVotes }]" :aria-expanded="store.viewSettings.showVotes" @click="togglePanel('showVotes')">
				<img :src="view.getImage('icon-info')" alt="" />
				<span>{{ t('app.vote') }}</span>
			</button>

			<button v-if="store.game?.isEnded()" type="button" class="topMenuItem" aria-haspopup="dialog" @click="openResults">
				<img :src="view.getImage('icon-info')" alt="" />
				<span>{{ t('app.results') }}</span>
			</button>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showReplay }]" :aria-expanded="store.viewSettings.showReplay" @click="toggleReplay">
				<img :src="view.getImage('icon-replay')" alt="" />
				<span>{{ t('topMenu.replay') }}</span>
			</button>

			<div class="menuDivider"></div>

			<button v-if="personal.pov >= 0 && !store.game?.isEnded()" type="button" class="topMenuItem" :disabled="store.saving || store.viewSettings.showReplay || store.viewSettings.performingRewind" :title="t('topMenu.rewind')" @click="loadRewind">
				<img :src="view.getImage('icon-rewind')" alt="" />
				<span>{{ t('topMenu.rewind') }}</span>
			</button>

			<button v-if="canResign" type="button" class="topMenuItem" aria-haspopup="dialog" :aria-label="t('topMenu.resign')" @click="openResign">
				<img :src="view.getImage('resign')" alt="" />
				<span>{{ t('topMenu.resign') }}</span>
			</button>
		</div>

		<div id="topInfos">
			<div class="infoSpanDiv">
				<span>{{ gameName }}</span>
				<span v-if="store.turn">&nbsp;|&nbsp; {{ t('app.turn', { turn: store.turn }) }}</span>
				<span>&nbsp;|&nbsp; {{ phaseLabel }}</span>
				<span v-if="store.currentPlayer">&nbsp;|&nbsp; {{ store.currentPlayer }}</span>
				<span v-if="store.missingPlayers.length" class="missing">&nbsp;|&nbsp; {{ t('app.missing', { players: store.missingPlayers.join(", ") }) }}</span>
				<span v-if="store.gameMessages.errorText" class="error">&nbsp;|&nbsp; {{ store.gameMessages.errorText }}</span>
				<span v-if="store.gameMessages.rewindErrorText" class="error">&nbsp;|&nbsp; {{ store.gameMessages.rewindErrorText }}</span>
			</div>
			<div class="playerLine">
				<span v-for="p in players" :key="p.name" class="playerChip" :class="{ current: p.name === store.currentPlayer }">
					<span class="playerDot" :style="{ backgroundColor: playerColor(p.color) }"></span>{{ p.name }}
				</span>
			</div>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name">
				<span v-if="personal.pov >= 0" class="viewerName">{{ personal.name }}</span>
				<span v-else class="viewerName" :title="personal.name">{{ t('topMenu.spectator') }}</span>
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<div v-if="kickoutText" id="kickoutTimerSpan">{{ t('topMenu.timeToNextKickout') }} {{ kickoutText }}</div>
			</div>
			<div id="zoomDiv">
				<button @click="fitMap" :title="t('topMenu.fitMapTitle')">{{ t('topMenu.fitMap') }}</button>
				<button @click="zoom(1)" :disabled="personal.zoom >= rf.MAX_ZOOM" :aria-label="t('topMenu.zoomIn')">🔍+</button>
				<button @click="zoom(-1)" :disabled="personal.zoom <= rf.MIN_ZOOM" :aria-label="t('topMenu.zoomOut')">🔍−</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
#top {
	background-color: #333;
	color: white;
	padding: 0;
	width: 100%;
	height: 60px;
	top: 0;
	z-index: 2;
	position: relative;
	display: flex;
	white-space: nowrap;
	box-sizing: border-box;
}
#menu { flex-shrink: 0; color: white; }
#menu a { color: white; text-decoration: none; }
#menu a:hover, #menu button:hover { color: lightblue; }
#menu a:focus-visible { outline: 2px solid lightblue; outline-offset: -2px; }

.topMenuItem {
	display: inline-block;
	min-width: 56px;
	width: max-content;
	box-sizing: border-box;
	height: 55px;
	border-radius: 5px;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	padding: 0 6px;
	vertical-align: top;
	cursor: pointer;
	text-align: center;
	position: relative;
}
.topMenuItem:focus-visible { outline: 2px solid lightblue; outline-offset: -2px; }
.topMenuItem:disabled { opacity: 0.45; cursor: wait; }
.topMenuItem:hover img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
}
.hasNotes img {
	filter: brightness(0) saturate(100%) invert(83%) sepia(61%) saturate(1522%) hue-rotate(359deg) brightness(105%) contrast(108%);
}
.topMenuItemSelected { color: lightblue; }
.topMenuItemSelected img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
}
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 14px; font-weight: bold; display: block; }

.menuDivider { display: inline-block; width: 5px; height: 50px; background-color: darkgray; margin: 0 8px; vertical-align: top; }

#topInfos {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
	min-width: 0;
	flex: 1 1 auto;
	overflow: hidden;
}
.infoSpanDiv {
	display: flex;
	justify-content: center;
	line-height: 16px;
	margin: 2px 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}
.infoSpanDiv span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.playerLine {
	display: flex;
	justify-content: center;
	gap: 10px;
	line-height: 16px;
	max-width: 100%;
	overflow: hidden;
	white-space: nowrap;
}
.playerChip {
	font-weight: bold;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
}
.playerDot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid #fff; flex-shrink: 0; }
.playerChip.current { text-decoration: underline; }

#topRight {
	flex-shrink: 0;
	height: 100%;
	font-size: 14px;
	text-align: center;
	margin-right: 5px;
	max-width: 220px;
	overflow: hidden;
	text-overflow: ellipsis;
}
#loggedInDiv { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viewerName { vertical-align: middle; }
#WSstatus {
	border: 2px solid white;
	border-radius: 100%;
	width: 15px;
	height: 15px;
	display: inline-block;
	vertical-align: middle;
	margin-left: 4px;
}
.WSconnecting { background-color: #ff9900; }
.WSconnected { background-color: green; }
.WSdisconnected { background-color: darkred; }
#kickoutTimerSpan { font-size: 12px; }
#zoomDiv { display: flex; justify-content: flex-end; gap: 4px; margin-top: 3px; }
#zoomDiv button {
	min-height: 25px;
	font: inherit;
	font-size: 14px;
	cursor: pointer;
	background: transparent;
	color: white;
	border: 1px solid #777;
	border-radius: 4px;
	padding: 0 6px;
}
#zoomDiv button:hover:enabled { background: #444; }
#zoomDiv button:disabled { opacity: 0.4; cursor: default; }

.error { color: #ff8080; }
.missing { color: #ffb0b0; }
.notifDot { position: absolute; top: 2px; right: 10px; width: 10px; height: 10px; background: red; border-radius: 50%; border: 1px solid white; }
</style>
