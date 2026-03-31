<script setup>
import HistoryEntry from "./HistoryEntry.vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()

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

			<div id="historyButtonDiv"></div>
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
