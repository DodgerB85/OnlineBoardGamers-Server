<script setup>
import * as refFuncs from '../refFuncs'
import * as constants from '../constants'
import * as replay from '../BUSreplay'

import * as view from '../js/BUSview.js'

import { useModelStore } from "../stores/model.js";
const model = useModelStore()

import { usePersonalStore } from "../stores/personal.js";
const personal = usePersonalStore()

defineProps(['entry', 'entry_ID'])

function addHighlight(e, entering, id) {
  // for entry in replay area
  if (id === -1) return
  if (model.topMenuViews.showReplay === false) {
    if (model.history[id][0] === constants.HIST_NEW_TURN || model.history[id][0] === constants.HIST_GAME_END || model.history[id][0] === constants.HIST_REWIND || model.history[id][0] === constants.HIST_RESIGN || model.history[id][0] === constants.HIST_KICKOUT || model.history[id][0] === constants.HIST_CHOOSE_ACTION || model.history[id][0] === constants.HIST_ADD_BUS || model.history[id][0] === constants.HIST_ADD_PAX || model.history[id][0] === constants.HIST_ALTER_TIME || model.history[id][0] === constants.HIST_STARTING_PLAYER) return
    if (model.history[id][0] === constants.HIST_VROM && model.history[id][3][0].length === 1) return
  }
  if (e.target.id !== 'logEntry' + String(id)) return
  if (entering) e.target.classList.add('highlightHistDiv')
  else e.target.classList.remove('highlightHistDiv')
}

function historyHighlightBuildings(buildingsObj, index) {
  if (model.topMenuViews.showReplay) {
    clickedEntry(index)
    return
  }
  model.clearHistoryHelpers()
  model.historyHelpers.buildingsToHighlight = [...buildingsObj]
}
function historyHighlightLines(buildingsObj, index) {
  if (model.topMenuViews.showReplay) {
    clickedEntry(index)
    return
  }
  model.clearHistoryHelpers()
  model.historyHelpers.linesToHighlight = [...buildingsObj]
}

function historyHighlightVroms(entry3, index) {
  if (model.topMenuViews.showReplay) {
    clickedEntry(index)
    return
  }
  model.clearHistoryHelpers()
  let junctions = []
  let buildings = []

  for (let i = 0; i < entry3.length; i++) {
    if (entry3[i].length > 1) {
      junctions.push(entry3[i][0])
      buildings.push([-1, entry3[i][1], entry3[i][2]])
    }
  }
  historyHighlightBuildings(buildings)
  model.historyHelpers.junctionsToHighlight = [...junctions]

}

function getActionText(entry3) {
  let text = ""

  if (entry3[0] === 10) return "to pass"
  if (entry3[0] === 11) return "to pass (auto)"

  if (entry3[0] === 0) text += "\"Line Expansion\""
  if (entry3[0] === 1) text += "\"New Bus\""
  if (entry3[0] === 2) text += "\"Add Passengers\""
  if (entry3[0] === 3) text += "\"New Buildings\""
  if (entry3[0] === 4) text += "\"Alter Time\""
  if (entry3[0] === 5) text += "\"Vrrooomm\""
  if (entry3[0] === 6) text += "\"Starting Player\""

  const forwardChars = ['A', 'B', 'C', 'D', 'E', 'F']
  const reverseChars = ['F', 'E', 'D', 'C', 'B', 'A']

  if (entry3[0] === 0 || entry3[0] === 3) {
    text += " at position: " + reverseChars[entry3[1]]
  }
  else if (entry3[0] === 2 || entry3[0] === 5) {
    text += " at position: " + forwardChars[entry3[1]]
  }

  return text
}
function getAddPassengersText(entry3) {
  let text = ""
  if (entry3[0] === -1) return "adds no Passengers - none remaining"
  let junction10 = 0
  let junction25 = 0
  let runOut = false
  for (let i = 0; i < entry3.length; i++) {
    if (entry3[i] === 10) junction10++
    else if (entry3[i] === 25) junction25++
    else if (entry3[i] === -1) runOut = true
  }
  if (junction10 >= 2) text += "adds " + String(junction10) + " passengers to the top station"
  else if (junction10 === 1) text += " adds a passenger to the top station"

  if (junction10 > 0 && junction25 > 0) text += ", and "

  if (junction25 >= 2) text += "adds " + String(junction25) + " passengers to the bottom station"
  else if (junction25 === 1) text += " adds a passenger to the bottom station"

  if (runOut) text += ", but then ran out of Passengers"

  return text
}
function getAlterTimeText(entry1, entry3) {
  if (entry1 === -1) return "Time passes. New Destination: "
  if (entry3[1] === 0) return "chooses not to Stop Time. New Destination: "
  else return "stops Time! Destination remains: "
}
function geVromText(entry3) {
  // We know that there is at least 1 valid VROM, and it either ends in VROM or unable
  if (entry3.length === 1) return "moves 1 Passenger"
  if (entry3[entry3.length - 1].length !== 1) return "moves " + String(entry3.length) + " Passengers"
  // Now there must be some valid and then unable
  let movedPaxNum = entry3.length - 1
  let text = ""
  if (movedPaxNum > 1) text += "moves " + String(movedPaxNum) + " Passengers"
  else if (movedPaxNum === 1) text += "moves 1 Passenger"
  if (entry3[entry3.length - 1][0] === 1) text += ", but ran out of Passengers"
  if (entry3[entry3.length - 1][0] === 2) text += ", but ran out of Buildings"

  return text

}

function clickedEntry(index) {
  if (model.topMenuViews.showReplay === false) return
  // for entry in replay area
  if (index === -1) return
  replay.goToReplayStep(index)
}

</script>

<template>
  <!-- NON PLAYER-->
  <template v-if="entry[0] < 10">

    <!-- New Turn -->
    <template v-if="entry[0] === constants.HIST_NEW_TURN">
      <div class="log separator mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="new_turn">Start of turn {{ entry[3][0] }}</div>
      </div>
    </template>

    <!-- REWIND -->
    <template v-if="entry[0] === constants.HIST_REWIND">
      <div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
        </div>
        <div class="mainEntry rewind">
          Game rewound to here by {{ model.players[entry[1]].name }}
        </div>
      </div>
    </template>


    <!-- RESIGN -->
    <template v-if="entry[0] === constants.HIST_RESIGN">
      <div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
        </div>
        <div class="mainEntry rewind">
          {{ model.players[entry[1]].name }} Resigns
        </div>
      </div>
    </template>

    <!-- KICKOUT -->
    <template v-if="entry[0] === constants.HIST_KICKOUT">
      <div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
        </div>
        <div class="mainEntry rewind">
          {{ model.players[entry[3][0]].name }} was kicked out
        </div>
      </div>
    </template>

    <!-- GAME END -->
    <template v-if="entry[0] === constants.HIST_GAME_END">
      <div class="log separator" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
        </div>
        <div class="mainEntry new_turn">
          Game Ended<br />
          <br />Winner: {{ model.getWinnerName()[0] }}<br />
          <br />
          <span v-if="model.getWinnerName()[1] === 0">Highest Score</span>
          <span v-if="model.getWinnerName()[1] === 1">Joint score with more Time Stones</span>
          <span v-if="model.getWinnerName()[1] === 2">Joint score, same Time Stones, achieved score first</span>
          <br /><br />
          <span v-if="model.gameflow.gameEnded === 1">No More Timestones</span>
          <span v-if="model.gameflow.gameEnded === 2">No More Building Spots</span>
          <span v-if="model.gameflow.gameEnded === 3">Only One Player with Actions</span>
          <span v-if="model.gameflow.gameEnded === 4">Last player standing</span>
        </div>
      </div>
    </template>

  </template>

  <!-- PLAYER ACTIONS -->
  <template v-else-if="entry[0] >= 10 && entry[0] < 20">

    <!-- ADD BLDG -->
    <template v-if="entry[0] === constants.HIST_ADD_BLDG && entry[3].length > 0">
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)"
        @click="historyHighlightBuildings(entry[3], entry_ID)" @mouseover="addHighlight($event, true, entry_ID)"
        @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">{{
            model.players[entry[1]].displayName }} </span>
        builds
        <template v-for="(line, index) in entry[3]" v-bind:key="index">
          <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="hist_buildingImg"
            :src="view.getImage('building' + String(line[0]))" alt="buildingHist" />
          <img v-if="personal.selectedBoard === 1" class="hist_buildingImg_orig"
            :src="view.getImage('building' + String(line[0]) + '_orig')" alt="buildingHist" />
        </template>
      </div>
    </template>
    <template v-if="entry[0] === constants.HIST_ADD_BLDG && entry[3].length === 0">
      <div class="log mainEntry">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">{{
            model.players[entry[1]].displayName }} </span>
        passes "New Building" - Max Buses too low
      </div>
    </template>

    <!-- ADD LINE -->
    <template v-if="entry[0] === constants.HIST_ADD_LINE && entry[3].length > 0">
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="historyHighlightLines(entry[3], entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">{{
            model.players[entry[1]].displayName }} </span>
        <span v-if="entry[3].length === 1">adds 1 line</span>
        <span v-else>adds {{ entry[3].length }} lines</span>
      </div>
    </template>
    <template v-if="entry[0] === constants.HIST_ADD_LINE && entry[3].length === 0">
      <div class="log mainEntry">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">
          {{ model.players[entry[1]].displayName }}
        </span>
        passes "Line Expansion" - Max Buses too low
      </div>
    </template>

    <!-- Choose Action -->
    <template v-if="entry[0] === constants.HIST_CHOOSE_ACTION">
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">
          {{ model.players[entry[1]].displayName }} </span>
        chooses {{ getActionText(entry[3]) }}
      </div>
    </template>

    <!-- ADD BUS -->
    <template v-if="entry[0] === constants.HIST_ADD_BUS">
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">
          {{ model.players[entry[1]].displayName }} </span>
        increases buses to {{ entry[3][0] }}
      </div>
    </template>

    <!-- Add Pax -->
    <template v-if="entry[0] === constants.HIST_ADD_PAX && entry[3].length > 0">
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">
          {{ model.players[entry[1]].displayName }} </span>
        {{ getAddPassengersText(entry[3]) }}
      </div>
    </template>
    <template v-if="entry[0] === constants.HIST_ADD_PAX && entry[3].length === 0">
      <div class="log mainEntry">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">
          {{ model.players[entry[1]].displayName }}
        </span>
        passes "Add Passenger" - Max Buses too low
      </div>
    </template>

    <!-- Alter Time -->
    <template v-if="entry[0] === constants.HIST_ALTER_TIME">
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span v-if="entry[1] !== -1"
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">
          {{ model.players[entry[1]].displayName }} </span>
        {{ getAlterTimeText(entry[1], entry[3]) }}
        <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="hist_buildingImg"
          :src="view.getImage('building' + String(entry[3][0]))" alt="buildingOption" />
        <img v-if="personal.selectedBoard === 1" class="hist_buildingImg_orig"
          :src="view.getImage('building' + String(entry[3][0]) + '_orig')" alt="buildingOption" />
      </div>
    </template>

    <!-- Start Player -->
    <template v-if="entry[0] === constants.HIST_STARTING_PLAYER">
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span v-if="entry[1] !== -1"
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">
          {{ model.players[entry[1]].displayName }} </span>
        <span v-if="entry[1] === -1">Action Round Starting Player moves to the Left. New Turn Order:</span>
        <span v-else>becomes the Starting Player. New Turn Order:</span>

        <span v-for="(player, indexSP) in entry[3]" v-bind:key="indexSP"
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[player].colour)]">
          {{ model.players[player].displayName }} </span>

      </div>
    </template>

  </template>
  <template v-else>

    <!-- VROM WITH HIGHLIGHTS -->
    <template
      v-if="entry[0] === constants.HIST_VROM && entry[3][0] != undefined && entry[3][0].length > 1"><!-- && entry[3][0] != undefined -->
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="historyHighlightVroms(entry[3], entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">{{
            model.players[entry[1]].displayName }} </span>
        <span>{{ geVromText(entry[3]) }}</span>
      </div>
    </template>

    <!-- UNABLE TO VROM -->
    <template
      v-if="entry[0] === constants.HIST_VROM && entry[3][0] != undefined && entry[3][0].length === 1"><!-- && entry[3][0] != undefined -->
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)"
        @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">{{
            model.players[entry[1]].displayName }} </span>
        <span v-if="entry[3][0][0] === 1">is unable to VRROOOMM - no available Passengers</span>
        <span v-if="entry[3][0][0] === 2">is unable to VRROOOMM - no desired destination</span>
      </div>
    </template>

    <template v-if="entry[0] === constants.HIST_VROM && entry[3][0] == undefined"><!-- && entry[3][0] != undefined -->
      <div class="log mainEntry" :id="'logEntry' + String(entry_ID)">
        <div class="header">
          <span>
            {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
          </span>
        </div>
        <span
          :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[entry[1]].colour)]">{{
            model.players[entry[1]].displayName }} </span>
        <span>ERROR: {{ entry[3] }}</span>
      </div>
    </template>
  </template>
</template>

<style scoped>
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

.log .new_turn {
  background-color: #000;
  text-align: center;
  color: #fff;
  font-weight: bold;
  font-size: 1.2em;
  padding: 8px;
}

.log .new_turn a {
  color: #2196F3;
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
  text-align: center
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



.highlightHistDiv {
  border-color: yellow;
}
</style>