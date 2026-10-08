<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { getImage } from "../view/assets"
import { useGameStore } from "../stores/game"
import { usePersonalStore } from "../stores/personal"

const { t } = useI18n()
const store = useGameStore()
const personal = usePersonalStore()

function toggle(name: "showChat" | "showNotes" | "showBug" | "showHistory" | "showInfo" | "showReplay") {
	store.viewSettings[name] = !store.viewSettings[name]
}

function loadRewind() {
	store.gameMessages.rewindErrorText = ""
	void store.rewind()
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
</script>

<template>
	<div id="top">
		<div id="menu">
			<div class="menuRow">
				<a href="/">
					<span class="topMenuItem"><img :src="getImage('icon-house')" /><span>{{ t('topMenu.home') }}</span></span>
				</a>
				<span class="topMenuItem" @click="nextGame"><img :src="getImage('icon-nextGame')" /><span>{{ t('topMenu.next') }}</span></span>
				<div class="menuDivider"></div>
				<a href="/ROW/help/" target="_blank">
					<span class="topMenuItem"><img :src="getImage('icon-rulebook')" /><span>{{ t('topMenu.rules') }}</span></span>
				</a>
				<span :class="['topMenuItem', { selected: store.viewSettings.showInfo }]" @click="toggle('showInfo')">
					<img :src="getImage('icon-info')" /><span>{{ t('topMenu.info') }}</span>
				</span>
			</div>
			<div class="menuRow">
				<span :class="['topMenuItem', { selected: store.viewSettings.showChat }]" @click="toggle('showChat')">
					<img :src="getImage('icon-chat')" /><span>{{ t('topMenu.chat') }}</span>
				</span>
				<span :class="['topMenuItem', { selected: store.viewSettings.showBug }]" @click="toggle('showBug')">
					<img :src="getImage('icon-stop')" /><span>{{ t('topMenu.bug') }}</span>
				</span>
				<div class="menuDivider"></div>
				<span :class="['topMenuItem', { selected: store.viewSettings.showNotes }]" @click="toggle('showNotes')">
					<img :src="getImage('icon-notebook')" /><span>{{ t('topMenu.notes') }}</span>
				</span>
				<span :class="['topMenuItem', { selected: store.viewSettings.showHistory }]" @click="toggle('showHistory')">
					<img :src="getImage('icon-scroll')" /><span>{{ t('topMenu.history') }}</span>
				</span>
				<div class="menuDivider"></div>
				<span :class="['topMenuItem', { selected: store.viewSettings.showReplay }]" @click="toggle('showReplay')">
					<img :src="getImage('icon-replay')" /><span>{{ t('topMenu.replay') }}</span>
				</span>
				<span
					v-if="personal.pov >= 0"
					:class="['topMenuItem', { selected: store.viewSettings.performingRewind }]"
					@click="loadRewind"
				>
					<img :src="getImage('icon-rewind')" /><span>{{ t('topMenu.rewind') }}</span>
				</span>
			</div>
		</div>

		<div id="topRight">
			<div v-if="personal.name">{{ personal.name }}</div>
			<div v-if="kickoutText">{{ t('topMenu.timeToNextKickout') }} {{ kickoutText }}</div>
		</div>

		<div id="topInfos">
			<span>{{ store.state?.players?.length ?? 0 }} players</span>
			<span v-if="store.currentPlayer"> | turn by {{ store.currentPlayer }}</span>
			<span v-if="store.gameMessages.errorText" class="error"> | {{ store.gameMessages.errorText }}</span>
			<span v-if="store.gameMessages.rewindErrorText" class="error"> | {{ store.gameMessages.rewindErrorText }}</span>
		</div>
	</div>
</template>

<style scoped>
#top { background: #333; color: white; width: 100%; min-width: 900px; min-height: 118px; position: relative; z-index: 2; }
#menu { float: left; padding-top: 2px; }
#menu a { color: white; text-decoration: none; }
.menuRow { display: block; white-space: nowrap; }
.topMenuItem { display: inline-block; width: 62px; height: 50px; border-radius: 5px; cursor: pointer; text-align: center; }
.topMenuItem:hover span { color: lightblue; }
.topMenuItem.selected span { color: lightblue; }
.topMenuItem img { width: 32px; height: 32px; }
.topMenuItem span { font-size: 13px; font-weight: bold; display: block; }
.menuDivider { display: inline-block; width: 5px; height: 44px; background: darkgray; margin: 2px 10px 0 10px; vertical-align: top; }
#topRight { float: right; font-size: 14px; text-align: center; margin-right: 6px; }
#topInfos { clear: both; text-align: center; font-size: 14px; padding-top: 4px; }
.error { color: #ff8080; }
</style>
