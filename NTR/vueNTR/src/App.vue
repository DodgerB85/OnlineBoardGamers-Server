<script setup>
/**
 * Napoleon's Triumph - Main App Component
 * 
 * Game phases:
 * - Round X - Allied Turn (phase 0)
 * - Round X - French Turn (phase 1)
 * - Game Over (phase 2)
 * 
 * Max 10 rounds. Victory by demoralization or territorial objectives.
 */

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import HistoryTab from "./components/HistoryTab.vue"
import ReplayArea from "./components/ReplayArea.vue"
import FooterBar from "./components/FooterBar.vue"
import DebugArea from "./components/DebugArea.vue"
import MapArea from "./components/MapArea.vue"
import ActionArea from "./components/ActionArea.vue"
import PlayerTable from "./components/PlayerTable.vue"

import { useModelStore } from "./stores/NTRstore.js"
import i18n from "./i18n"
const store = useModelStore()

import { usePersonalStore } from "./stores/NTRpersonal.js"
const personal = usePersonalStore()

import * as model from "./js/NTRmodel"
import * as controller from "./js/NTRcontroller"
import * as rf from "./js/NTRreference"
import * as view from "./js/NTRview"
import * as funcs from "./js/NTRfuncs"
import * as IO from "./backend/NTR_IO"
import * as replay from "./js/NTRreplay"

model.initGame()

/********************************* */

if (!IO.SUPER_USERS.includes(personal.name) && !IO.DEBUG_USERS.includes(personal.name)) {
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    return false
  })
}

document.addEventListener("keyup", function (event) {
  if (store.viewSettings.showChat) return
  else if (event.key == "ArrowLeft") {
    if (store.viewSettings.showReplay) replay.performStep(-1)
  } else if (event.key == "ArrowRight") {
    if (store.viewSettings.showReplay) replay.performStep(1)
  }
})
</script>

<template>
  <svg id="patternsSVG">
    <defs>
      <!-- TERRAIN PATTERNS (solid colors - no external images needed) -->
      <pattern v-for="(terrain, idx) in rf.ALL_TERRAINS" :key="idx" :id="'pattern_terrain_' + terrain.id" width="100%" height="100%" patternContentUnits="objectBoundingBox">
        <rect x="0" y="0" width="1" height="1" :fill="view.getTerrainColor(terrain.id)" />
      </pattern>
      <!-- APPROACH PATTERNS -->
      <pattern v-for="(approach, idx) in rf.ALL_APPROACH_TYPES" :key="idx" :id="'pattern_approach_' + approach.id" width="100%" height="100%" patternContentUnits="objectBoundingBox">
        <image :xlink:href="view.getImage('approach_' + approach.id)" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
      </pattern>
    </defs>
  </svg>
  <TopMenu />
  <div
    id="wholeMiddleArea"
    :class="store.viewSettings.showReplay ? 'greyBackground' : 'normalBackground'"
    :style="{
      'min-width': (store.players.length === 2 ? '500' : '900') + 'px',
    }">
    <transition name="fadeMainArea">
      <div id="boardContainer" v-if="!store.viewSettings.performingRewind">
        <div id="middle">
          <TopMenuViews />
          <HistoryTab />
          <div class="topContainer">
            <PlayerTable />
          </div>

          <ReplayArea v-if="store.viewSettings.generatingReplay || !store.viewSettings.replayAtBottom" />
          <template v-if="!store.viewSettings.generatingReplay">
            <div id="mainAreaLessHistory">
              <div v-if="store.viewSettings.showLoader" id="fLoadingBar">
                <img :src="view.getImage('loading-bar-black')" />
              </div>

              <ActionArea />
              <div class="mapAndControlPanelContainer">
                <MapArea />
              </div>
              <ReplayArea v-if="store.viewSettings.replayAtBottom" />

              <DebugArea v-if="IO.DEBUG_USERS.includes(personal.name)" />
            </div>
          </template>
        </div>
      </div>
    </transition>
  </div>

  <FooterBar />
</template>

<style>
body {
  margin: 0px !important;
  background-color: #d4eafd;
  font-family: Arial, sans-serif;
  font-size: 16px;
}

.topContainer {
  display: flex;
  flex-wrap: nowrap;
  width: fit-content;
  margin-top: 2px;
  gap: 5px;
  justify-content: flex-start;
  margin: auto;
}

#boardContainer {
  margin-top: 0px;
  margin-right: auto;
  margin-bottom: 0px;
  align-items: center;
  transition: all 0.2s ease-in-out;
}

.slideRight {
  margin: 0px auto 0px 460px !important;
  transition: all 0.2s ease-in-out;
}

#wholeMiddleArea {
  width: 100%;
  min-width: 1400px;
  text-align: center;
  min-height: 500px;
}

#mainAreaLessHistory {
  min-height: 60px;
  min-width: 620px;
}

.greyBackground {
  background-color: lightgray;
  transition: background-color 1s ease-in-out;
}

.normalBackground {
  background-color: #d4eafd;
  transition: background-color 1s ease-in-out;
}

.fadeMainArea-enter-active,
.fadeMainArea-leave-active {
  transition: opacity 0.5s ease-in-out;
}

.fadeMainArea-enter-from,
.fadeMainArea-leave-to {
  opacity: 0;
}

#fLoadingBar {
  width: 100%;
  text-align: center;
}

/** UNSCOPED CSS */
.mainEntryPlayer {
  color: white;
  font-weight: bolder;
  padding: 2px;
  border: 1px solid black;
  margin-right: 3px;
  display: inline-block;
  margin-top: 1px;
}
.mainEntryPlayerNewTurn {
  color: white;
  font-weight: bolder;
  padding: 2px;
  display: inline-block;
  margin: 0px;
}

.mainEntryPlayer0 { background-color: #000000; }
.mainEntryPlayer1 { background-color: #3474a9; }
.mainEntryPlayer2 { background-color: #f5f5f5; color: black; }
.mainEntryPlayer3 { background-color: #c28727; }
.mainEntryPlayer4 { background-color: #8b0000; }
.mainEntryPlayer5 { background-color: #228b22; }
.mainEntryPlayer6 { background-color: #4b0082; color: white; }
.mainEntryPlayer7 { background-color: #b8860b; }

.actionsLineButton {
  margin: 10px;
  width: fit-content;
  border: 2px solid green;
  border-radius: 5px;
  font-weight: bolder;
  padding: 5px;
}
.actionsLineButton:hover { background-color: lightgrey; }
.actionsLineButton:active { background-color: darkgrey; }

#patternsSVG {
  height: 0px;
  margin: 0px;
  padding: 0px;
  position: absolute;
}

.mapAndControlPanelContainer {
  display: flex;
  justify-content: flex-start;
  margin: auto;
  width: fit-content;
  align-items: flex-start;
  gap: 20px;
}
</style>