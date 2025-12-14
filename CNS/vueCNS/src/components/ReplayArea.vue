<script setup>

import * as replay from '../js/CNSreplay'
import * as IO from '../js/CNS_IO'
import * as rf from '../js/CNSreference'
import * as model from '../js/CNSmodel'
import * as funcs from '../js/CNSfuncs'


import HistoryEntry from './HistoryEntry.vue'


import { useModelStore } from "../stores/CNSstore.js";
const store = useModelStore()
import { usePersonalStore } from "../stores/CNSpersonal.js";
const personal = usePersonalStore()

import { ref } from 'vue';

const copyMessage = ref('https://www.onlineboardgamers.com/TGZ/110/replay/5 Copied to Clipboard');

function copyToClipboard() {
    const textToCopy =
        "https://www.onlineboardgamers.com/CNS/" +
        String(personal.gameID) +
        "/replay/" +
        String(store.replayStep + 1); 

    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    document.body.appendChild(textarea);

    textarea.select();
    document.execCommand("copy");

    document.body.removeChild(textarea);

    copyMessage.value = textToCopy + " Copied to Clipboard"

    const button = document.getElementById("copyURLbutton");
    const popup = document.getElementById("popup");

    // Hide any existing popup and reset the timer
    clearTimeout(popup.fadeTimeout);

    popup.style.opacity = "1";
    popup.style.display = "block";

    const buttonRect = button.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const offsetTop = buttonRect.top + buttonRect.height + 10; // Adjust the offset as needed
    const offsetLeft = buttonRect.left + (buttonRect.width - popupRect.width) / 2;

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
}

</script>

<template>
    <template v-if="store.topMenuViews.showReplay">
        <button class="actionsLineButton" :disabled="store.replayStep === 0" @click="replay.performStep(-99)">|&lt;</button>
        <button class="actionsLineButton" :disabled="store.replayStep === 0" @click="replay.performStep(-9)">&lt;&lt;</button>
        <button class="actionsLineButton" :disabled="store.replayStep === 0" @click="replay.performStep(-1)">&lt;</button>
        {{ store.replayStep + 1 }} / {{ store.replayData.length }}
        <button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
            @click="replay.performStep(1)">&gt;</button>
        <button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
            @click="replay.performStep(9)">&gt;&gt;</button>
        <button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
            @click="replay.performStep(99)">&gt;|</button>

        <div class="copyGameButtonDiv" v-if="personal.name != undefined">
            <button @click="store.topMenuViews.replayAtBottom = !store.topMenuViews.replayAtBottom"
                class="actionsLineButton">
                <template v-if="!store.topMenuViews.replayAtBottom">Move UI<br />to Bottom <b>▼</b></template>
                <template v-if="store.topMenuViews.replayAtBottom">Move UI<br />to Top <b>▲</b></template>
            </button>
        </div>

        <br />Use the arrows to step through the game. This will not alter the current game in any way
        <br /><button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">Copy URL to this move to
            clipboard</button>
        <div id="popup" class="popup">{{ copyMessage }}</div>

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

.copyGameButtonDiv {
    display: inline-block;
    vertical-align: middle;
}

.replayHistoryEntry {
    width: fit-content;
    margin: auto;
    min-height: 111px;
}

.actionsLineButton {
    margin: 10px;
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
    position: absolute;
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
