<script setup>
import TurnNudge from "./utils/TurnNudge.vue"
import * as view from "../js/DDLview.js"
import * as rf from "../js/DDLreference.js"
import * as IO from "../backend/DDL_IO.js"
import * as controller from "../js/DDLcontroller.js"

import { ref } from "vue"
import { useI18n } from "vue-i18n"

import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import PlayerTable from "./PlayerTable.vue"
const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

const chatMessage = ref("")
const bugReportText = ref("")
const submittingBug = ref(false)

function toggleBug() {
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

function toggleNotes() {
	store.viewSettings.showBug = false
	store.viewSettings.showNotes = !store.viewSettings.showNotes
}

function sendChatMessage() {
	if (chatMessage.value === "") return
	const now = Math.round(new Date().getTime() / 1000)
	const last = store.chatData.length > 0 ? store.chatData[0][1] : now
	const newEntry = [personal.name, Math.max(0, now - last), chatMessage.value]
	IO.sendChatMessage(newEntry)
	chatMessage.value = ""
}

function clearNotes() {
	personal.notes = ""
	IO.saveNotes()
}

async function submitBug() {
	submittingBug.value = true
	store.gameMessages.bugErrorText = ""
	store.gameMessages.successText = ""
	if (bugReportText.value.length === 0) {
		store.gameMessages.bugErrorText = t("topMenuViews.bug.empty")
		submittingBug.value = false
		return
	}
	await IO.submitBug(bugReportText.value)
	submittingBug.value = false
}

function loadRewind() {
	store.viewSettings.showRewindPanel = false
	store.viewSettings.performingRewind = true
	setTimeout(function () {
		IO.loadRewind()
	}, 300)
}

function getStatsExcludeVotes(returnPlayers = false) {
	let votes = 0
	let players = t("common.none")
	for (const player in store.statsExcludeVotesData) {
		if (store.statsExcludeVotesData[player] === true) {
			votes += 1
			if (players === t("common.none")) players = String(player)
			else players += ", " + player
		}
	}
	return returnPlayers ? players : votes
}

function getDeleteVotes(returnPlayers = false) {
	let votes = 0
	let players = t("common.none")
	for (const player in store.deleteVotesData) {
		if (store.deleteVotesData[player] === true) {
			votes += 1
			if (players === t("common.none")) players = String(player)
			else players += ", " + player
		}
	}
	return returnPlayers ? players : votes
}

function localCastVote(topic) {
	IO.castVote(topic)
}
</script>

<template>
	<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame && store.gameflow.phase !== rf.PHASE_GAME_OVER" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
	<!-- BUG REPORT -->
	<div id="bugReport" v-if="store.viewSettings.showBug">
		<h1>{{ $t("topMenuViews.bug.title") }}</h1>
		<h2 class="errorText" v-if="store.gameMessages.bugErrorText !== ''" v-html="store.gameMessages.bugErrorText"></h2>
		<p>{{ $t("topMenuViews.bug.intro") }}<br />{{ $t("topMenuViews.bug.data") }}</p>
		<div><textarea cols="150" rows="10" v-model="bugReportText"></textarea></div>
		<div>
			<button class="actionsLineButton" @click="submitBug" :disabled="submittingBug"><span v-if="submittingBug">{{ $t("topMenuViews.bug.submitting") }}</span><span v-else>{{ $t("topMenuViews.bug.submit") }}</span></button>
			<button class="actionsLineButton" @click="toggleBug">{{ $t("common.cancel") }}</button>
		</div>
	</div>

	<!-- NOTES -->
	<div id="notesBox" v-if="store.viewSettings.showNotes">
		<h2>{{ $t("topMenuViews.notes.title") }}</h2>
		<p>{{ $t("topMenuViews.notes.private") }}</p>
		<div><textarea cols="120" rows="10" v-model="personal.notes" maxlength="5000"></textarea></div>
		<div>
			<button class="actionsLineButton" @click="IO.saveNotes">{{ $t("topMenuViews.notes.save") }}</button>
			<button class="actionsLineButton" @click="clearNotes">{{ $t("topMenuViews.notes.clear") }}</button>
			<button class="actionsLineButton" @click="toggleNotes">{{ $t("topMenuViews.notes.close") }}</button>
		</div>
	</div>

	<!-- CHAT -->
	<div id="wholeChat" v-if="store.viewSettings.showChat">
		<div id="chatBox">
			<h2>{{ $t("topMenuViews.chat.title") }}</h2>
			<div><textarea rows="6" v-model="chatMessage"></textarea></div>
			<div><button class="actionsLineButton" @click="sendChatMessage">{{ $t("topMenuViews.chat.send") }}</button></div>
		</div>
		<div id="messageList">
			<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
				<div class="header"><span class="bold">{{ message[0] }}</span><span class="date">{{ new Date(message[1] * 1000).toLocaleString() }}</span></div>
				<div class="messageBody">{{ message[2] }}</div>
			</div>
		</div>
	</div>

	<!-- REWIND PANEL -->
	<div id="rewindPanel" v-if="store.viewSettings.showRewindPanel">
		{{ $t("topMenuViews.rewind.intro") }}<br />
		{{ $t("topMenuViews.rewind.courtesy") }}<br /><br />
		<span class="errorText" v-html="$t('topMenuViews.rewind.warning')"></span>
		<span class="topMenuItem" @click="loadRewind()"><img :src="view.getImage('icon-rewind')" /><span>{{ $t("topMenu.rewind") }}</span></span>
		<hr />
		<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
			{{ $t("topMenuViews.rewind.statsIntro") }}<br />
			{{ $t("topMenuViews.rewind.votesPlayers", { votes: getStatsExcludeVotes(false), players: getStatsExcludeVotes(true) }) }}<br />
			<button v-if="!personal.votedToExclude" class="actionsLineButton" @click="localCastVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">{{ $t("topMenuViews.rewind.voteExclude") }}</button>
		</div>
		<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
			{{ $t("topMenuViews.rewind.deleteIntro") }}<br />
			{{ $t("topMenuViews.rewind.votesPlayers", { votes: getDeleteVotes(false), players: getDeleteVotes(true) }) }}<br />
			<button v-if="!personal.votedToDelete" class="actionsLineButton" @click="localCastVote(rf.DELETE_VOTE_TOPIC)">{{ $t("topMenuViews.rewind.voteDelete") }}</button>
		</div>
	</div>

	<!-- Info / player aid -->
	<div id="info" v-if="store.viewSettings.showInfo">
		<PlayerTable :minimiseInfoForMainScreen="false" />
		<p><b>{{ $t("topMenuViews.info.gameName") }}</b> {{ store.gameName }}</p>
		<p>{{ $t("topMenuViews.info.description") }}</p>
		<h3>{{ $t("topMenuViews.info.playerAid") }}</h3>
		<img :src="view.playerAidImage()" :alt="$t('topMenuViews.info.aidAlt')" class="playerAidImage" />
		<p><a href="/DDL/help/" target="_blank">{{ $t("topMenuViews.info.rulesHelp") }}</a></p>
		<button v-if="rf.SUPER_USERS.includes(personal.name) && store.gameflow.phase !== rf.PHASE_GAME_OVER" class="actionsLineButton" @click="controller.gameOverNow">{{ $t("topMenuViews.info.endNow") }}</button>
	</div>
</template>

<style scoped>
.actionsLineButton { margin: 10px; width: fit-content; border: 2px solid green; border-radius: 5px; font-weight: bolder; padding: 5px; cursor: pointer; }
.actionsLineButton:hover { background-color: lightgrey; }
.errorText { width: 100%; font-weight: bolder; text-align: center; background-color: lightgoldenrodyellow; color: darkred; }
#bugReport, #notesBox, #info { text-align: center; margin-bottom: 10px; border: 2px solid black; background-color: lightblue; padding: 6px; }
.playerAidImage { width: 100%; max-width: 700px; border: 1px solid #333; }
#wholeChat { position: absolute; left: 2px; top: 62px; width: 450px; z-index: 9999; border: 2px solid black; background-color: #d4eafd; overflow-y: scroll; padding-bottom: 10px; text-align: center; max-height: 80vh; }
#chatBox textarea { width: 90%; }
.chatentry { margin: 5px; border: #000 1px solid; text-align: left; padding: 5px; background-color: #d4eafd; }
.chatentry .header { margin-bottom: 7px; border-bottom: #000 1px solid; }
.chatentry .header .date { font-size: 0.7em; font-style: italic; float: right; }
.chatentry .header .bold { font-weight: bold; }
.chatentry .messageBody { overflow: auto; white-space: pre-wrap; }
#rewindPanel { position: absolute; background-color: black; border: 1px solid white; padding: 5px; width: 400px; top: 60px; left: 440px; font-size: 14px; z-index: 10000; color: white; }
.topMenuItem { display: inline-block; width: 62px; height: 55px; cursor: pointer; text-align: center; }
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 14px; font-weight: bold; display: block; }
</style>
