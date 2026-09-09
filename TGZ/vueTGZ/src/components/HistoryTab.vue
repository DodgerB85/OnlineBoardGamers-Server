<script setup>
import HistoryEntry from "./HistoryEntry.vue"

import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"
import * as rf from "../js/TGZreference"
import * as refFuncs from "../js/TGZfuncs"
import * as view from "../js/TGZview"

const store = useModelStore()
const personal = usePersonalStore()

function getCoordsForIndex(index) {
	let Sw = 7
	let x = (index % Sw) + 1
	let y = Math.floor(index / Sw) + 1
	return `(${x}, ${y})`
}

function img(name, cls = "", style = "") {
	const url = view.getImage(name)
	return `<img src="${url}" class="${cls}" style="${style}" />`
}

function tribeImg(playerIdx) {
	const colour = personal.getCorrectedColour(store.players[playerIdx].colour)
	const url = view.getPlayerTribeImage(colour)
	return `<img src="${url}" style="width:30px;height:30px;vertical-align:middle;border:1px solid #000;" />`
}

function playerSpan(playerIdx) {
	const p = store.players[playerIdx]
	const hex = personal.getCorrectedColourHex(p.colour)
	const c = personal.getCorrectedColour(p.colour)
	const textColor = (c === rf.WHITE || c === rf.YELLOW) ? "black" : "white"
	return `<span style="background-color:${hex};color:${textColor};padding:1px 5px;font-weight:bold;">${p.displayName}</span>`
}

function downloadHistoryAsPDF() {
	let html = `<html><head><style>
		body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
		h1 { text-align: center; font-size: 18px; }
		h2 { text-align: center; font-size: 14px; color: #555; margin-bottom: 20px; }
		.entry { border-bottom: 1px solid #ccc; padding: 6px 0; line-height: 30px; }
		.turn-marker { background: #000; color: #fff; text-align: center; padding: 6px; font-weight: bold; font-size: 13px; margin: 10px 0; }
		.game-over { background: #000; color: #fff; text-align: center; padding: 10px; font-weight: bold; font-size: 14px; }
		.timestamp { color: #888; font-size: 10px; }
		.cow { height: 20px; vertical-align: middle; }
		.res { height: 28px; vertical-align: middle; border: 1px solid #000; }
		.cman { height: 28px; vertical-align: middle; border: 1px solid #000; }
		.tech { height: 20px; vertical-align: middle; }
		.spec { height: 24px; vertical-align: middle; border: 1px solid #000; }
		.water { height: 18px; vertical-align: middle; border: 1px solid #000; }
	</style></head><body>`

	html += `<h1>TGZ Game History</h1>`
	html += `<h2>${store.players.map(p => p.displayName).join(" vs ")}</h2>`

	for (const entry of store.history) {
		const action = entry[0]
		const playerIdx = entry[1]
		const timestamp = refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000)
		const data = entry[3]

		html += `<div class="entry"><span class="timestamp">${timestamp}</span> `

		if (action === rf.HIST_NEW_GAME) {
			const tribeImgs = data[0].map(i => tribeImg(i)).join(" ")
			html += `<div class="turn-marker">Welcome to Africa! ${tribeImgs}</div>`
		} else if (action === rf.HIST_NEW_TURN) {
			html += `<div class="turn-marker">Start of Turn ${data[0]}</div>`
		} else if (action === rf.HIST_GAME_END) {
			html += `<div class="game-over">Game Ended<br>Winner: ${tribeImg(data[0][1])} ${store.players[data[0][1]].displayName}</div>`
		} else if (action === rf.HIST_BID) {
			html += tribeImg(playerIdx) + " " + playerSpan(playerIdx) + " "
			if (data[0] > 0) html += `bids ${data[0]} ${img("cows1", "cow")} ${data[0] !== 1 ? "s" : ""}`
			else if (data[0] === 0) html += `passes. New position: ${data[1] + 1}`
			else if (data[0] === -1) html += `passes - not enough cows. New position: ${data[1] + 1}`
			else if (data[0] === -2) html += `is the most generous. Position: 1`
			else if (data[0] === -3) html += `performs a free pass with Aja`
		} else if (action === rf.HIST_END_BIDS) {
			html += `<b>End of Bidding:</b><br>`
			for (let i = 0; i < data[0].length; i++) {
				html += `${tribeImg(data[0][i])} ${store.players[data[0][i]].displayName} gains ${data[1][i]} ${img("cows1", "cow")} ${data[1][i] !== 1 ? "s" : ""}. Total: ${data[2][i]}<br>`
			}
		} else if (action === rf.HIST_CHOOSE_god) {
			const godName = data[0] === rf.OGUN ? "Ogun" : rf.god_NAMES[data[0]]
			const godImg = img("god" + data[0], "", "height:24px;vertical-align:middle;border:1px solid #000;")
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} chooses ${godImg} ${godName}. VR +${rf.gods_VR[data[0]]}`
		} else if (action === rf.HIST_CHOOSE_SPEC) {
			const specImg = img("spec" + data[0], "spec")
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} chooses ${specImg} ${rf.SPEC_NAMES[data[0]]} (${rf.SPEC_COST[data[0]]} ${img("cows1", "cow")}) VR +${rf.SPEC_VR[data[0]]}`
		} else if (action === rf.HIST_BUILD_MON || action === rf.HIST_BUILD_FIRST_MON) {
			const coords = data.map(i => getCoordsForIndex(i)).join(", ")
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} builds ${data.length === 1 ? "a monument" : "monuments"} at ${coords}`
		} else if (action === rf.HIST_RAISE_MON) {
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} raises monument at ${getCoordsForIndex(data[0][0])} to level ${data[0][1]}`
		} else if (action === rf.HIST_BUILD_CRAFTSMAN) {
			const cmanImg = img("craftsman" + data[1], "cman")
			const cost = data[3] !== 0 ? data[3] : rf.COW_COST_TO_BUILD_CMAN[data[1]]
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} builds ${cmanImg} at ${getCoordsForIndex(data[0])}. Cost: ${cost} ${img("cows1", "cow")}`
			if (data[3] !== 0) html += ` (Builder +${data[3]})`
			if (data[4] !== -1) html += ` Tech +${rf.TECH_VR[data[4]]} VR ${img("tech" + data[4], "tech")}`
		} else if (action === rf.HIST_SET_PRICES) {
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} sets prices: `
			const prices = []
			for (let i = 0; i < data.length; i++) {
				if (data[i] > 0) prices.push(`${img("craftsman" + i, "cman")} ${data[i]}${img("cows" + data[i], "cow")}`)
			}
			html += prices.join(" ")
		} else if (action === rf.HIST_ACTIVATE_SPEC) {
			const specImg = img("spec" + data[0], "spec")
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} activates ${specImg} ${rf.SPEC_NAMES[data[0]]} with ${data[1]} ${img("cows1", "cow")}`
		} else if (action === rf.HIST_ADD_HERD_COWS) {
			const specImg = img("spec0", "spec")
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} adds ${data[1]} to ${specImg} Herd. New size: ${data[0]}`
		} else if (action === rf.HIST_BUILD_RESOURCE) {
			const resImg = img("res" + data[1], "res")
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} builds ${resImg} at ${getCoordsForIndex(data[0])}`
			if (data[2] > 0) html += ` (Shaman, ${data[2]} ${img("cows1", "cow")})`
		} else if (action === rf.HIST_BUILD_WATER) {
			const waterImg = img("res" + rf.WATER_TILE + (data[1] === 1 ? "_v" : ""), "water")
			html += `${tribeImg(playerIdx)} ${playerSpan(playerIdx)} builds ${waterImg} at ${getCoordsForIndex(data[0])}`
			if (data[2] > 0) html += ` (Rain Ceremony, ${data[2]} ${img("cows1", "cow")})`
		} else if (action === rf.HIST_REVENUES) {
			html += `<b>Revenue:</b><br>`
			for (const r of data) {
				const total = r.reduce((a, b) => a + b, 0) - r[5] - r[0]
				html += `${tribeImg(r[0])} ${store.players[r[0]].displayName}: +${total} Total: ${r[5]} (god:${r[1]}, specs:${r[2]}, techs:${r[3]}, monument:${r[4]})<br>`
			}
		} else if (action === rf.HIST_COMPARE_MYTHOLOGIES) {
			html += `<b>Let Us Compare Mythologies:</b><br>`
			for (const s of data) {
				html += `${tribeImg(s[1])} ${store.players[s[1]].displayName}: ${s[2]} / ${s[3]} (${s[2] - s[3]})<br>`
			}
		} else if (action === rf.HIST_REWIND) {
			html += `<i>Game rewound by ${store.players[data[0]].name}</i>`
		} else if (action === rf.HIST_RESIGN) {
			html += `<i>${data[0]} resigns</i>`
		} else if (action === rf.HIST_KICKOUT) {
			html += `<i>${data[0]} was kicked out</i>`
		} else {
			html += `[Action ${action}]`
		}

		html += `</div>`
	}

	html += `</body></html>`

	const w = window.open("", "_blank")
	w.document.write(html)
	w.document.close()
	w.print()
}

function historyToggle() {
	setTimeout(function () {
		if (document.getElementById("historyMainDiv").classList.contains("reverseHistory")) document.getElementById("historyMainDiv").classList.remove("reverseHistory")
		else document.getElementById("historyMainDiv").classList.add("reverseHistory")

		var b = document.getElementById("footer").getBoundingClientRect().top
		var a = 69
		document.getElementById("history").style["max-height"] = String(parseInt(b - a)) + "px"
	}, 400)
}
</script>

<template>
	<transition name="fade">
		<div id="history" v-if="store.topMenuViews.showHistory">
			<!-- TOGGLE DIV-->
			<div id="historyToggleDiv">
				<label class="textLabel">Oldest First</label>
				<label class="switch">
					<input type="checkbox" checked @click="historyToggle" />

					<span class="slider round"></span>
				</label>
				<label class="textLabel">Newest First</label>
			</div>
			<div v-if="store.topMenuViews.showReplay"><b>Replay Mode - click an entry to jump to that point in time</b></div>

			<div id="historyMainDiv" class="reverseHistory">
				<template v-for="(entry, index1) in store.history" :key="index1">
					<HistoryEntry :entry="entry" :entry_-i-d="index1" />
				</template>
			</div>

			<div id="historyButtonDiv">
				<button class="actionsLineButton" @click="downloadHistoryAsPDF" style="margin: 5px;">Download History as PDF</button>
			</div>
		</div>
	</transition>
</template>

<style scoped>
.historyCraftsmanImg {
	width: 40px;
	border: 1px solid black;
	vertical-align: middle;
}

.historyCraftsmanImg.r1 {
	vertical-align: baseline;
}

.historyResourceImg {
	width: 40px;
	height: 40px;
	border: 1px solid black;
	vertical-align: middle;
}

.historyWaterImg {
	width: 50px;
	height: 25px;
	border: 1px solid black;
	vertical-align: middle;
}

.historyWaterImg.r1 {
	vertical-align: baseline;
}

.noBreak {
	white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

#history {
	position: absolute;
	padding-top: 5px;
	left: 2px;
	top: 120px;
	width: 450px;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	/*overflow-y: scroll;
	direction: rtl;*/
	overflow-y: scroll;
	text-align: center;
}

.log {
	direction: ltr;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 3px 3px 3px 3px;
	background-size: 40px 40px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
	z-index: 30;
}

.log .header {
	font-size: 0.8em;
}

.mainEntry {
	line-height: 25px;
}

.selectableHistory:hover {
	border: 1px solid yellow;
}

.log .new_turn {
	background-color: #000;
	text-align: center;
	color: #fff;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log .new_turn a {
	color: #2196f3;
}

.log .rewind {
	background-color: #d4eafd;
	text-align: center;
	color: #000;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log h4 {
	text-align: center;
}

.log.separator {
	padding: 3px;
}

.hist_buildingImg {
	width: 40px;
	vertical-align: middle;
	border: 2px solid black;
	border-radius: 100%;
	margin-left: 2px;
}

.hist_buildingImg_orig {
	width: 40px;
	vertical-align: middle;
	border: 2px solid black;
	margin-left: 2px;
}

.reverseHistory {
	display: flex;
	flex-direction: column-reverse;
}

.highlightHistDiv {
	border-color: yellow;
}

/* The switch - the box around the slider */
#historyToggleDiv .switch {
	position: relative;
	display: inline-block;
	width: 60px;
	height: 34px;
	margin-left: 10px;
	margin-right: 10px;
	vertical-align: middle;
}

/* Hide default HTML checkbox */
#historyToggleDiv .switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

/* The slider */
#historyToggleDiv .slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #2196f3;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

#historyToggleDiv .slider:before {
	position: absolute;
	content: "";
	height: 26px;
	width: 26px;
	left: 4px;
	bottom: 4px;
	background-color: white;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

#historyToggleDiv input:checked + .slider {
	background-color: #2196f3;
}

#historyToggleDiv input:focus + .slider {
	box-shadow: 0 0 1px #2196f3;
}

#historyToggleDiv input:checked + .slider:before {
	-webkit-transform: translateX(26px);
	-ms-transform: translateX(26px);
	transform: translateX(26px);
}

/* Rounded sliders */
#historyToggleDiv .slider.round {
	border-radius: 34px;
}

#historyToggleDiv .slider.round:before {
	border-radius: 50%;
}
</style>
