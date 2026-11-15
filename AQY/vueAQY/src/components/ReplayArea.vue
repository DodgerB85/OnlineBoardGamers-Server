<script setup>

/*import * as history from '../js/TGZhistory'
import * as model from '../js/TGZmodel'*/

//import * as rf from '../js/AQYreference'
import * as IO from '../backend/AQY_IO'
import * as replay from '../js/AQYreplay'

import HistoryEntry from './HistoryEntry.vue'


import { useModelStore } from "../stores/AQYstore.js";
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js";
const personal = usePersonalStore()

import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const spinoffSuccessText = ref('')
const spinoffErrorText = ref('')
const copyMessage = ref(t("replayArea.copiedToClipboard", { url: "https://www.onlineboardgamers.com/AQY/110/replay/5" }));


function performStep(amount) {
    store.clearMessages()
    spinoffSuccessText.value = ''
    spinoffErrorText.value = ''
    replay.performStep(amount)
}

async function localCopyGameToPracticeGame2() {
    spinoffErrorText.value = ''
    spinoffSuccessText.value = ''
    const result = await IO.copyGameToNewPracticeGame()
    if (result?.newID) {
        const url = `${window.location.origin}/AQY/${result.newID}/show/`
        spinoffSuccessText.value = `${t("replayArea.gameCreated")} <a href="${url}" target="_blank" rel="noopener">${t("topMenuViews.here")}</a>`
    } else {
        spinoffErrorText.value = t("replayArea.copyGameError")
    }
}

function setReplayStep(event) {
    const step = Number(event.target.value)
    if (step === store.replayStep) return
    store.clearHistoryHelpers()
    store.clearMessages()
    replay.goToReplayStep(step)
}

/*function localCopyGameToPracticeGame(fromEnd) {
    let allowedSpinoffPoints = [rf.HIST_BUILD_FIRST_MON, rf.HIST_BID, rf.HIST_CHOOSE_god, rf.HIST_CHOOSE_SPEC,
    rf.HIST_ACTIVATE_SPEC, rf.HIST_BUILD_MON, rf.HIST_RAISE_MON, rf.HIST_BUILD_CRAFTSMAN, rf.HIST_SET_PRICES,
    rf.HIST_ADD_HERD_COWS, rf.HIST_BUILD_WATER, rf.HIST_BUILD_RESOURCE]

    if (!fromEnd && !allowedSpinoffPoints.includes(store.history[store.replayStep][0])) {
        spinoffErrorText.value = 'Please copy to a new game during a Player Action'
        return
    }
    // Check if it is a pass bid
    if (!fromEnd && store.history[store.replayStep][0] === rf.HIST_BID) {
        if (store.history[store.replayStep][3][0] <= 0) {
            spinoffErrorText.value = 'Please copy to a new game during a Player Action'
            return
        }
    }

    let result = IO.copyGameToNewPracticeGame(fromEnd)
    if (result) spinoffSuccessText.value = 'Your game has been created. Go to the Lobby to view your new game'
    if (!result) spinoffErrorText.value = 'Error Creating a New Game'
}*/

function copyToClipboard() {
    const textToCopy =
        "https://www.onlineboardgamers.com/AQY/" +
        String(personal.gameID) +
        "/replay/" +
        String(store.replayStep + 1); // Replace with the desired text to copy

    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    document.body.appendChild(textarea);

    textarea.select();
    document.execCommand("copy");

    document.body.removeChild(textarea);

    copyMessage.value = t("replayArea.copiedToClipboard", { url: textToCopy })

    // Position after the new text renders, so the popup is centred and on-screen.
    nextTick(() => {
        const button = document.getElementById("copyURLbutton");
        const popup = document.getElementById("popup");

        // Hide any existing popup and reset the timer
        clearTimeout(popup.fadeTimeout);

        popup.style.opacity = "1";
        popup.style.display = "block";

        const buttonRect = button.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        const below = buttonRect.bottom + 10;
        const offsetTop = below + popupRect.height <= window.innerHeight ? below : buttonRect.top - popupRect.height - 10;
        const offsetLeft = Math.max(10, Math.min(window.innerWidth - popupRect.width - 10, buttonRect.left + (buttonRect.width - popupRect.width) / 2));

        popup.style.top = offsetTop + "px";
        popup.style.left = offsetLeft + "px";

        // Fade out the popup after 2 seconds
        popup.fadeTimeout = setTimeout(() => {
            popup.style.opacity = "0";

            // Hide the popup after the fade-out animation completes
            setTimeout(() => {
                popup.style.display = "none";
            }, 300);
        }, 2000);
    });
}

</script>

<template>
    <template v-if="store.topMenuViews.showReplay">
        <div id="replayArea" :class="{ replayAtBottom: store.topMenuViews.replayAtBottom }">
            <button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0"
                @click="performStep(-999)">{{ $t("replayArea.backToMyLastMove") }}</button>
            <button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-99)">|&lt;</button>
            <button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-9)">&lt;&lt;</button>
            <button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-1)">&lt;</button>
            <input type="range" min="0" :max="Math.max(0, store.replayData.length - 1)" :value="store.replayStep"
                :aria-label="$t('replayArea.stepAria')" @input="setReplayStep" />
            <span class="replayStepSpan">{{ store.replayStep + 1 }} / {{ store.replayData.length }}</span>
            <button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
                @click="performStep(1)">&gt;</button>
            <button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
                @click="performStep(9)">&gt;&gt;</button>
            <button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
                @click="performStep(99)">&gt;|</button>

            <template v-if="personal.name != undefined">
                <button @click="localCopyGameToPracticeGame2()" class="actionsLineButton">
                    {{ $t("replayArea.copyThisGame") }}<br />{{ $t("replayArea.toNewGame") }}
                </button>
                <button @click="store.topMenuViews.replayAtBottom = !store.topMenuViews.replayAtBottom"
                    class="actionsLineButton">
                    <template v-if="!store.topMenuViews.replayAtBottom">{{ $t("replayArea.moveUi") }}<br />{{ $t("replayArea.toBottom") }} <b>▼</b></template>
                    <template v-if="store.topMenuViews.replayAtBottom">{{ $t("replayArea.moveUi") }}<br />{{ $t("replayArea.toTop") }} <b>▲</b></template>
                </button>
            </template>

            <button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">{{ $t("replayArea.copyUrl") }}</button>
            <div id="popup" class="popup">{{ copyMessage }}</div>
        </div>

        <div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
        <div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
        <div v-if="!store.topMenuViews.generatingReplay" class="replayHistoryEntry">
            <HistoryEntry :entry="store.history[store.replayStep]" :entry_-i-d=-1 />
        </div>

    </template>

    <div v-if="store.topMenuViews.generatingReplay" class="progress-bar" id="progressBarID">
        <div id="pBarEl"></div><span id="pBarTextEl"></span>
    </div>
</template>

<style scoped>
.progress-bar {
    border-radius: 5px;
    width: 80%;
    margin: auto;
    background-color: #999;
    height: 30px;
    position: relative;
}

.progress-bar div {
    border-radius: 5px;
    background-color: #1f1f85;
    height: 30px;
    width: 0%;
}

.progress-bar span {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 100%;
    text-align: center;
    color: #fff;
    margin-top: 5px;
    font-family: Verdana;
}

.spinoffSuccessText,
.spinoffErrorText {
    font-size: 20px;
    margin: 10px;
    padding: 10px;
    font-weight: bold;
}

.spinoffSuccessText {
    color: darkgreen;
    background-color: lightblue;
}

.spinoffErrorText {
    color: darkred;
    background-color: lightblue;
}

.copyGameButtonDiv {
    display: inline-block;
    vertical-align: middle;
}

#replayArea {
    position: sticky;
    top: 0;
    z-index: 9998;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px;
    background: #d4eafd;
    border: 1px solid black;
    padding: 8px;
    margin: 10px 12px 0;
    text-align: center;
    font-size: 16px;
    font-weight: 400;
}

#replayArea.replayAtBottom {
    top: auto;
    bottom: 0;
}

#replayArea input[type="range"] {
    width: min(300px, 35vw);
}

.replayStepSpan {
    min-width: 100px;
}

.replayHistoryEntry {
    width: fit-content;
    margin: auto;
    min-height: 111px;
}

.actionsLineButton {
    margin: 0;
    /*width: 100px;*/
    width: fit-content;
    border: 2px solid green;
    border-radius: 5px;
    font-weight: bolder;
}

.actionsLineButton:hover:enabled {
    background-color: lightgrey;
}

.actionsLineButton:disabled {
    background-color: darkgray;
}

.popup {
    position: fixed;
    z-index: 10000;
    background-color: #f7f7f7;
    padding: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transition: opacity 0.3s;
}

.fade-in {
    opacity: 1;
}

.fade-out {
    opacity: 0;
}
</style>
