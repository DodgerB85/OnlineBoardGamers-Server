<script setup>
/**
 * The tutorial overlay: a speech bubble with the current instruction, plus the
 * running commentary while FcmTutor plays. Deliberately not translated - see
 * tutorialScript.js.
 */
import { computed, onMounted } from "vue"

import { usePersonalStore } from "../../stores/FCMpersonal.js"
import { awaitingClick, finished, nextStep, endTutorial, startTutorial, stepIndex, stepText, tutorBusy, tutorLog, totalSteps, dismissed } from "./FcmTutorial.js"

const personal = usePersonalStore()

const text = computed(() => stepText())
const isLast = computed(() => stepIndex.value >= totalSteps() - 1)
const showHandover = computed(() => finished.value && isLast.value)
const show = computed(() => personal.tutorial && !dismissed.value)

onMounted(() => {
	if (personal.tutorial) startTutorial()
})
</script>

<template>
	<div v-if="show && !showHandover" id="tutorialPanel">
		<div class="tutorialHeader">
			<b>FCM Tutorial</b>
			<span class="tutorialStepCounter">{{ stepIndex + 1 }} / {{ totalSteps() }}</span>
		</div>

		<p class="tutorialText">{{ text }}</p>

		<!-- FcmTutor commentary: shown while they play their turn -->
		<div v-if="tutorLog.length > 0" class="tutorLog">
			<div v-for="(line, i) in tutorLog" :key="i" class="tutorLine">
				<span class="tutorName">FcmTutor</span>
				<span>{{ line }}</span>
			</div>
		</div>
		<p v-else-if="tutorBusy" class="tutorThinking">FcmTutor is thinking...</p>

		<div class="tutorialButtons">
			<!-- Only on narration steps: an act/tutor step is waiting on the game, and
			     letting the user click past it would desync the tutorial from the board. -->
			<button v-if="awaitingClick() && tutorLog.length === 0 && !tutorBusy" class="tutorialNext" @click="nextStep()">Next &#9656;</button>
		</div>
	</div>

	<!-- Handover: the tutorial is over, the user takes over both seats -->
	<div v-if="show && showHandover" id="tutorialPanel" class="tutorialHandover">
		<div class="tutorialHeader">
			<b>FCM Tutorial - finished</b>
		</div>
		<p class="tutorialText">{{ text }}</p>
		<div class="tutorialButtons">
			<button class="tutorialNext" @click="endTutorial()">Play both sides</button>
		</div>
	</div>
</template>

<style>
/* Unscoped on purpose: .tutorialSpotlight is added to elements inside the game
   components, which all use scoped styles. */
#tutorialPanel {
	position: fixed;
	left: 50%;
	bottom: 12px;
	transform: translateX(-50%);
	z-index: 5000;
	width: min(760px, 92vw);
	box-sizing: border-box;
	padding: 12px 16px;
	border: 3px solid #ff8c00;
	border-radius: 10px;
	background-color: #fffdf5;
	box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
	font-family: Arial, sans-serif;
	font-size: 15px;
	line-height: 1.35;
	color: #222;
}

#tutorialPanel .tutorialHeader {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	border-bottom: 1px solid #ffd9a8;
	padding-bottom: 4px;
	margin-bottom: 6px;
	color: #b35c00;
}

#tutorialPanel .tutorialStepCounter {
	font-size: 13px;
	font-weight: normal;
	color: #999;
}

#tutorialPanel .tutorialText {
	margin: 0 0 8px 0;
}

#tutorialPanel .tutorialButtons {
	text-align: right;
}

#tutorialPanel .tutorialNext {
	background-color: #ff8c00;
	color: white;
	border: none;
	border-radius: 6px;
	padding: 7px 18px;
	font-size: 15px;
	font-weight: bold;
	cursor: pointer;
}

#tutorialPanel .tutorialNext:hover {
	background-color: #e07b00;
}

#tutorialPanel .tutorLog {
	max-height: 130px;
	overflow-y: auto;
	margin: 4px 0 8px 0;
	padding: 6px 8px;
	background-color: #eef4ff;
	border-left: 4px solid #4a7fd0;
	border-radius: 0 6px 6px 0;
}

#tutorialPanel .tutorLine {
	margin-bottom: 4px;
}

#tutorialPanel .tutorLine:last-child {
	margin-bottom: 0;
}

#tutorialPanel .tutorName {
	display: inline-block;
	min-width: 88px;
	font-weight: bold;
	color: #2a5599;
}

#tutorialPanel .tutorThinking {
	margin: 4px 0 8px 0;
	font-style: italic;
	color: #2a5599;
}

#tutorialPanel.tutorialHandover {
	border-color: #2a7f3f;
}

#tutorialPanel.tutorialHandover .tutorialHeader {
	border-bottom-color: #c3e6cb;
	color: #2a7f3f;
}

#tutorialPanel.tutorialHandover .tutorialNext {
	background-color: #2a7f3f;
}

#tutorialPanel.tutorialHandover .tutorialNext:hover {
	background-color: #1f6630;
}

.tutorialSpotlight {
	outline: 3px dashed #ff8c00 !important;
	outline-offset: 2px;
	animation: tutorialPulse 0.9s infinite alternate;
}

@keyframes tutorialPulse {
	to {
		outline-color: #ffc266;
	}
}
</style>