<script setup>
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as replay from "../js/ROWreplay"
import * as view from "../js/ROWview"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"

const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

function toggle(name) {
	store.viewSettings[name] = !store.viewSettings[name]
}

function loadRewind() {
	store.gameMessages.rewindErrorText = ""
	void controller.rewind()
}

function toggleReplay() {
	if (store.viewSettings.showReplay) replay.exitReplay()
	else replay.enterReplay()
}

function toggleChat() {
	if (!store.viewSettings.showChat) personal.chatNotification = false
	store.viewSettings.showChat = !store.viewSettings.showChat
}

function zoom(dir) {
	personal.zoom = Math.min(rf.MAX_ZOOM, Math.max(rf.MIN_ZOOM, personal.zoom + dir))
	controller.persistZoom(personal.zoom)
}

function resignGame() {
	if (!window.confirm("Are you sure you want to resign? You will not be able to continue.")) return
	void controller.resignGame()
}

function nextGame() {
	if (window.initData?.nextURL) window.location.href = window.initData.nextURL
}

const kickoutText = computed(() => {
	const s = personal.secondsToNextKickout
	if (s > 1200) return ""
	const m = Math.floor(s / 60)
	const sec = String(s % 60).padStart(2, "0")
	return `${m} : ${sec}`
})

const gameName = computed(() => String(window.initData?.gameName ?? ""))
const players = computed(() => store.state?.players ?? [])

function playerColor(color) {
	return color ? color.toLowerCase() : "white"
}
</script>

<template>
	<div id="top">
		<div id="menu">
			<a href="/">
				<span class="topMenuItem"><img :src="view.getImage('icon-house')" /><span>{{ t('topMenu.home') }}</span></span>
			</a>
			<span class="topMenuItem" @click="nextGame"><img :src="view.getImage('icon-nextGame')" /><span>{{ t('topMenu.next') }}</span></span>
			<div class="menuDivider"></div>
			<a href="/ROW/help/" target="_blank">
				<span class="topMenuItem"><img :src="view.getImage('icon-rulebook')" /><span>{{ t('topMenu.rules') }}</span></span>
			</a>
			<span :class="['topMenuItem', { selected: store.viewSettings.showInfo }]" @click="toggle('showInfo')">
				<img :src="view.getImage('icon-info')" /><span>{{ t('topMenu.info') }}</span>
			</span>
			<div class="menuDivider"></div>
			<span v-if="personal.pov >= 0" :class="['topMenuItem', { selected: store.viewSettings.performingRewind }]" @click="loadRewind">
				<img :src="view.getImage('icon-rewind')" /><span>{{ t('topMenu.rewind') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<br />

			<span :class="['topMenuItem', { selected: store.viewSettings.showChat }]" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" /><span>{{ t('topMenu.chat') }}</span>
				<span v-if="personal.chatNotification" class="notifDot"></span>
			</span>
			<span v-if="personal.pov >= 0" :class="['topMenuItem', { selected: store.viewSettings.showBug }]" @click="toggle('showBug')">
				<img :src="view.getImage('icon-stop')" /><span>{{ t('topMenu.bug') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>
			<div class="menuDivider"></div>
			<span v-if="personal.pov >= 0" :class="['topMenuItem', { selected: store.viewSettings.showNotes }]" @click="toggle('showNotes')">
				<img :src="view.getImage('icon-notebook')" /><span>{{ t('topMenu.notes') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>
			<span :class="['topMenuItem', { selected: store.viewSettings.showHistory }]" @click="toggle('showHistory')">
				<img :src="view.getImage('icon-scroll')" /><span>{{ t('topMenu.history') }}</span>
			</span>
			<div class="menuDivider"></div>
			<span :class="['topMenuItem', { selected: store.viewSettings.showReplay }]" @click="toggleReplay">
				<img :src="view.getImage('icon-replay')" /><span>{{ t('topMenu.replay') }}</span>
			</span>
		</div>

		<div id="topRight">
			<div v-if="personal.name">{{ personal.name }}</div>
			<div v-if="kickoutText">{{ t('topMenu.timeToNextKickout') }} {{ kickoutText }}</div>
			<div class="topControls">
				<button class="topBtn" @click="zoom(-1)">🔍−</button>
				<button class="topBtn" @click="zoom(1)">🔍+</button>
				<button v-if="personal.pov >= 0 && !personal.trainingGame" class="topBtn resign" @click="resignGame">{{ t('topMenu.resign') }}</button>
			</div>
		</div>

		<div id="topInfos">
			<div class="infoSpanDiv">
				<span>{{ gameName }}</span>
				<span v-if="store.turn">&nbsp;|&nbsp; Turn {{ store.turn }}</span>
				<span v-if="store.currentPlayer">&nbsp;|&nbsp; {{ store.currentPlayer }}</span>
				<span v-if="store.missingPlayers.length" class="missing">&nbsp;|&nbsp; Missing: {{ store.missingPlayers.join(", ") }}</span>
				<span v-if="store.gameMessages.errorText" class="error">&nbsp;|&nbsp; {{ store.gameMessages.errorText }}</span>
				<span v-if="store.gameMessages.rewindErrorText" class="error">&nbsp;|&nbsp; {{ store.gameMessages.rewindErrorText }}</span>
			</div>
			<div class="playerLine">
				<span
					v-for="p in players"
					:key="p.name"
					class="playerChip"
					:class="{ current: p.name === store.currentPlayer }"
					:style="{ color: playerColor(p.color) }"
				>{{ p.name }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
#top {
	background-color: #333;
	color: white;
	width: 100%;
	min-width: 1050px;
	height: 120px;
	top: 0;
	z-index: 2;
	position: relative;
	display: inline-block;
}

#menu { float: left; padding-top: 2px; color: white; }
#menu a { color: white; text-decoration: none; }
#menu a:hover, #menu span:hover { color: lightblue; }

.topMenuItem { display: inline-block; width: 62px; height: 55px; border-radius: 5px; cursor: pointer; text-align: center; position: relative; }
.topMenuBlank { display: inline-block; width: 62px; height: 55px; border-radius: 5px; text-align: center; }
.topMenuItem.selected span { color: lightblue; }
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 14px; font-weight: bold; display: block; }
.menuDivider { display: inline-block; width: 5px; height: 50px; background-color: darkgray; margin: 0 10px; vertical-align: top; }

#topRight { float: right; height: 100%; font-size: 14px; text-align: center; margin-right: 5px; }
.topControls { margin-top: 4px; }
.topBtn { margin: 1px; padding: 2px 8px; cursor: pointer; font-size: 13px; }
.topBtn.resign { background: #f6d9c9; font-weight: bold; }

#topInfos { display: inline; }
.infoSpanDiv { display: flex; justify-content: center; line-height: 16px; margin: 2px 0; white-space: nowrap; overflow: hidden; }
.playerLine { display: flex; justify-content: center; gap: 10px; line-height: 16px; }
.playerChip { font-weight: bold; }
.playerChip.current { text-decoration: underline; }

.error { color: #ff8080; }
.missing { color: #ffb0b0; }
.notifDot { position: absolute; top: 2px; right: 12px; width: 10px; height: 10px; background: red; border-radius: 50%; border: 1px solid white; }
</style>
