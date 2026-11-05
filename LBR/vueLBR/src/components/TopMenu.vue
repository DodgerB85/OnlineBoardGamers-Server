<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as model from "../js/LBRmodel.js";
import * as view from "../js/LBRview.js";

const store = useModelStore();
const personal = usePersonalStore();
const menuElement = ref(null);
let menuObserver = null;

onMounted(() => {
	menuObserver = new ResizeObserver(() => {
		document.documentElement.style.setProperty("--lbr-menu-height", `${menuElement.value.getBoundingClientRect().height}px`);
	});
	menuObserver.observe(menuElement.value);
});
onBeforeUnmount(() => {
	menuObserver.disconnect();
	document.documentElement.style.removeProperty("--lbr-menu-height");
});

const isLoggedIn = computed(() => !!personal.name);
const isInvolved = computed(() => personal.pov >= 0);
const hasNext = computed(() => !!window.initData?.nextURL);
const seats = computed(() => Array.from({ length: store.game?.numSeats || 0 }, (_, i) => i));
const actorSeat = computed(() => (store.game ? model.actorSeat() : -1));
const finished = computed(() => store.finishedGame || !!store.game?.gameOver);
const canResign = computed(() => isInvolved.value && !personal.trainingGame && store.game && !finished.value);
const canRewind = computed(() => isInvolved.value && !personal.trainingGame && store.game && !finished.value);

function closePanels() {
	store.viewSettings.showHistory = false;
	store.viewSettings.showChat = false;
	store.viewSettings.showNotes = false;
	store.viewSettings.showBug = false;
}

function toggleChat() {
	const open = store.viewSettings.showChat;
	closePanels();
	store.viewSettings.showChat = !open;
}

function toggleHistory() {
	const open = store.viewSettings.showHistory;
	closePanels();
	store.viewSettings.showHistory = !open;
}

function toggleNotes() {
	const open = store.viewSettings.showNotes;
	closePanels();
	store.viewSettings.showNotes = !open;
}

function toggleBug() {
	const open = store.viewSettings.showBug;
	closePanels();
	store.gameMessages.bugErrorText = "";
	store.viewSettings.showBug = !open;
}

function nextGame() {
	if (window.initData?.nextURL) window.location.href = window.initData.nextURL;
}

const currentZoom = computed(() => store.viewSettings.boardZoom);

function zoomBy(delta) {
	const next = Math.round(Math.min(3, Math.max(0.5, currentZoom.value + delta)) * 100) / 100;
	if (next === currentZoom.value) return;
	store.viewSettings.boardZoom = next;
}

function fitMap() {
	store.viewSettings.boardZoom = 1;
}

function kickoutText() {
	const seconds = Math.max(0, store.secondsToNextKickout);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const showKickoutTimer = computed(
	() => isInvolved.value && !personal.trainingGame && !finished.value && store.secondsToNextKickout > 0 && store.secondsToNextKickout <= 1200,
);
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

			<button type="button" v-if="isLoggedIn" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" :aria-expanded="store.viewSettings.showChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" alt="" />
				<span>Chat<span v-if="store.chatNotification" class="chatNotification" aria-label="New messages">●</span></span>
			</button>

			<button type="button" v-if="isInvolved" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" :aria-expanded="store.viewSettings.showBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" alt="" />
				<span>Bug</span>
			</button>

			<button type="button" v-if="isLoggedIn && hasNext" class="topMenuItem" :disabled="store.viewSettings.saving" title="Next game" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" alt="" />
				<span>Next</span>
			</button>

			<div class="menuDivider"></div>

			<a href="/LBR/help/" target="_blank" rel="noopener">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" alt="" />
					<span>Rules</span>
				</span>
			</a>

			<button type="button" v-if="isInvolved" :class="['topMenuItem', { hasNotes: store.notes.length > 0, topMenuItemSelected: store.viewSettings.showNotes }]" :aria-expanded="store.viewSettings.showNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" alt="" />
				<span>Notes</span>
			</button>

			<div class="menuDivider"></div>

			<button type="button" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" :aria-expanded="store.viewSettings.showHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" alt="" />
				<span>History</span>
			</button>

			<div class="menuDivider"></div>

			<button type="button" v-if="canRewind" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" :aria-expanded="store.viewSettings.showRewindPanel" @click="store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel">
				<img :src="view.getImage('icon-rewind')" alt="" />
				<span>Rewind</span>
			</button>

			<button type="button" v-if="canResign" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showResignPanel }]" :aria-expanded="store.viewSettings.showResignPanel" @click="store.viewSettings.showResignPanel = !store.viewSettings.showResignPanel">
				<img :src="view.getImage('resign')" alt="" />
				<span>Resign</span>
			</button>
		</div>

		<div id="topInfos">
			<span class="gameInfoSpan">{{ store.gameName }} <template v-if="store.gameID">#{{ store.gameID }}</template> | {{ model.turnText() }}</span>
			<span v-if="finished" class="finishedSpan">Finished</span>
			<div class="playerLineDiv" v-if="seats.length">
				<span v-for="seat in seats" :key="seat" class="turnOrderSpan" :class="{ currentPlayer: seat === actorSeat }">{{ model.seatName(seat) }}</span>
			</div>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="isLoggedIn">
				<span v-if="isInvolved">{{ model.seatName(personal.pov) }}</span>
				<span v-else>Spectator</span>
				<br />
				<span v-if="showKickoutTimer" id="kickoutTimerSpan">Next kickout in <span id="kickoutTimerTimer">{{ kickoutText() }}</span></span>
			</div>
			<div id="zoomDiv" class="mapZoom">
				<button type="button" class="zoomButton" @click="zoomBy(-0.25)" :disabled="currentZoom <= 0.5" aria-label="Zoom out">−</button>
				<button type="button" class="zoomButton" @click="zoomBy(0.25)" :disabled="currentZoom >= 3" aria-label="Zoom in">+</button>
				<button type="button" class="zoomButton" @click="fitMap" title="Reset the board to full size">Fit</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
#top {
	overflow-x: auto;
	background-color: #333;
	color: white;
	padding: 0;
	width: 100%;
	min-width: 1150px;
	height: 60px;
	top: 0;
	z-index: 20;
	position: relative;
	display: flex;
	white-space: nowrap;
	box-sizing: border-box;
}
#menu { flex-shrink: 0; color: white; }
#menu a { color: white; text-decoration: none; }
#menu a:focus-visible { outline: 2px solid lightblue; outline-offset: -2px; }
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
.topMenuItem:disabled { opacity: 0.45; cursor: wait; }
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
.chatNotification { color: #d9534f; font-size: 12px; margin-left: 2px; }

#topRight { flex-shrink: 0; height: 100%; font-size: 16px; font-weight: 400; text-align: center; margin-right: 5px; }
#loggedInDiv { height: 34px; overflow: hidden; }
#kickoutTimerSpan { font-size: 12px; }
#zoomDiv { display: flex; justify-content: flex-end; gap: 4px; margin-top: 3px; }
#zoomDiv button { min-height: 22px; height: 22px; padding: 0 6px; font: inherit; font-size: 16px; font-weight: 400; cursor: pointer; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #302f27; }
#zoomDiv button:hover:enabled { background: #f1e9d7; }
#zoomDiv button:focus-visible { outline: 2px solid lightblue; outline-offset: 1px; }
#zoomDiv button:disabled { opacity: 0.4; cursor: default; }
#topInfos { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-width: fit-content; flex-shrink: 0; margin: 0 auto; font-size: 16px; }
.menuDivider { display: inline-block; width: 5px; height: 50px; background-color: darkgray; margin: 0 10px; }
.gameInfoSpan { white-space: nowrap; }
.finishedSpan { font-size: 13px; }
.playerLineDiv { white-space: nowrap; font-size: 13px; }
.turnOrderSpan { display: inline-block; padding: 0 6px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.turnOrderSpan + .turnOrderSpan { border-left: 1px solid darkgray; }
.currentPlayer { color: lightblue; font-weight: bold; }
</style>
