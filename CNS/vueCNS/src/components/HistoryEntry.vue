<script setup>
import * as rf from '../js/CNSreference'
import * as refFuncs from '../js/CNSfuncs'
import * as view from '../js/CNSview'
import * as history from '../js/CNShistory'
import * as replay from '../js/CNSreplay'

import { useModelStore } from "../stores/CNSstore.js";
const store = useModelStore()

import { usePersonalStore } from "../stores/CNSpersonal.js";
const personal = usePersonalStore()

defineProps(['entry', 'entry_ID'])

function clickedHistoryEntry(action, entry3, entry_id) {
  // If not replay, or if clicking on the replay entry, just do highlights
  if (!store.topMenuViews.showReplay || entry_id === -1) history.setupHistoryHighlight(action, entry3)
  // Otherwise, you are clicking in history during replay
  else replay.goToReplayStep(entry_id)
}

function getHistLinkText(entry3) {
  let numAdds = 0
  let numMoves = 0
  for (let i = 0; i < entry3.length; i++) {
    if (entry3[i].length === 2) numAdds++
    else if (entry3[i].length === 4) numMoves++
  }
  if (numMoves === 0) {
    if (numAdds === 1) return "Adds 1 Link"
    else if (numAdds === 2) return "Adds 2 Links"
  }
  else if (numAdds === 0) {
    if (numMoves === 1) return "Moves 1 Link"
    else if (numMoves === 2) return "Moves 2 Links"
  }
  else if (numAdds === 1 && numMoves === 1) return "Adds a Link and Moves a Link"
}
function canSelectPirateEntry(entry3) {
  if (store.topMenuViews.showReplay) return true
  if (entry3[0] <= 1) return true
  return false
}
</script>

<template>
  <!-- New Game -->
  <template v-if="entry[0] === rf.HIST_NEW_GAME">
    <div class="log separator mainEntry" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="new_turn">
        Welcome to Cannes!<br />
        <div v-for="(player, idx) in store.players" :key="idx" class="playerScoreSummaryDiv">
          <span class="mainEntryPlayerNewTurn"
            :class="'mainEntryPlayer' + personal.getCorrectedColour(player.colour)">{{ store.players[idx].name }}
          </span>
        </div>
      </div>
    </div>
  </template>

  <!-- ADD HEX -->
  <template v-if="entry[0] === rf.HIST_ADD_HEX">
    <div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <div class="container">
        <span class="mainEntryPlayer"
          :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
            store.players[entry[1]].displayName }} </span>
        Adds {{ (entry[3].length === 1) ? '1 Tile' : '2 Tiles' }}
        <div class="singleHexDiv" v-for="(singleAdd, idx) in entry[3]" :key="idx">
          <svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
            <polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500" :fill="`url(#pattern${singleAdd[0]})`"
              :transform="`rotate(${singleAdd[1] * 60} 0 0)`" stroke="black" />
          </svg>
        </div>
      </div>
    </div>
  </template>

  <!-- STORE HEX -->
  <template v-if="entry[0] === rf.HIST_STORE_HEX">
    <div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <div class="container">
        <span class="mainEntryPlayer"
          :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
            store.players[entry[1]].displayName }} </span>
        Stores:
        <div class="singleHexDiv">
          <svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
            <polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500" :fill="`url(#pattern${entry[3]})`"
              stroke="black" />
          </svg>
        </div>
      </div>
    </div>
  </template>

  <!-- ADD LINK -->
  <template v-if="entry[0] === rf.HIST_ADD_LINK">
    <div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <span class="mainEntryPlayer"
        :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
          store.players[entry[1]].displayName }} </span>
      {{ getHistLinkText(entry[3]) }}
    </div>
  </template>

  <!-- ADD CIGAR -->
  <template v-if="entry[0] === rf.HIST_ADD_CIGAR">
    <div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <span class="mainEntryPlayer"
        :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
          store.players[entry[1]].displayName }} </span>
      Adds a Cigar
      <template v-if="entry[3].length > 2">
        . New Resources:
        <template v-for="(res, idx) in entry[3][2]" :key="idx">
          <img :src="view.getImage('res' + String(res))" class="stdResImg storedResImg" />
        </template>
      </template>
    </div>
  </template>

  <!-- PRODUCE RES -->
  <template v-if="entry[0] === rf.HIST_PRODUCE_RES">
    <div class="log mainEntry" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <div class="container">
        <span class="mainEntryPlayer"
          :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
            store.players[entry[1]].displayName }} </span>
        Produces:
        <!-- FROM TILES -->
        <template v-for="(amount, index) in entry[3][0]" :key="index">
          <div v-if="amount !== 0" class="singleResDiv">
            <img class="singleResImg" :src="view.getImage('res' + String(index))" />
            <div class="singleResNumDiv">{{ amount }}</div>
          </div>
        </template>
      </div>

      <!-- Add in already stored Res -->
      <template v-if="entry[3].length > 1">
        And adds from storage:
        <template v-for="(res, idx) in entry[3][1]" :key="idx">
          <img v-if="res < 20 && ![rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res)"
            :src="view.getImage('res' + String(res))" class="stdResImg storedResImg" />
          <img v-if="res < 20 && [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res)"
            :src="view.getImage('res' + String(res))" class="movieImg storedResImg" />
        </template>
      </template>
    </div>
  </template>

  <!-- CONVERT RES -->
  <template v-if="entry[0] === rf.HIST_CONVERT_RES">
    <div class="log mainEntry" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <span class="mainEntryPlayer"
        :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
          store.players[entry[1]].displayName }} </span>
      Converts:
      <!-- Only One Res Input -->
      <template
        v-if="rf.getInputForProduction(entry[3][0]).length === 1 || rf.getInputForProduction(entry[3][0])[0] === rf.getInputForProduction(entry[3][0])[1]">
        <span v-if="rf.getInputForProduction(entry[3][0]).length === 2">2x </span>
        <img :src="view.getImage('res' + String(rf.getInputForProduction(entry[3][0])[0]))" class="stdResImg" />
      </template>
      <!-- TWO DIFFERENT INPUTS -->
      <template v-else>
        <img :src="view.getImage('res' + String(rf.getInputForProduction(entry[3][0])[0]))" class="stdResImg" />
        <span class="plusSign">+</span>
        <img :src="view.getImage('res' + String(rf.getInputForProduction(entry[3][0])[1]))" class="stdResImg" />
      </template>
      <div class="rightArrow"></div>
      <img :src="view.getImage('res' + String(rf.getOutputForProduction(entry[3][0])))" class="stdResImg" />
    </div>
  </template>

  <!-- INCREASE PRICE -->
  <template v-if="entry[0] === rf.HIST_INCREASE_PRICE">
    <div class="log mainEntry" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <span class="mainEntryPlayer"
        :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
          store.players[entry[1]].displayName }} </span>
      Increases Price:
      <img :src="view.getImage('res' + String(entry[3][0]))" class="movieImg" />
      <div class="rightArrow"></div>
      <span class="bigFont">€ {{ entry[3][1] }} M</span>
    </div>
  </template>

  <!-- SELL MOVIES -->
  <template v-if="entry[0] === rf.HIST_SELL_MOVIES">
    <div class="log mainEntry" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <span class="mainEntryPlayer"
        :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
          store.players[entry[1]].displayName }} </span>
      Sells Movies to Cannes:<br>
      <template v-for="(amount, idx) in entry[3][0]" :key="idx">
        <div v-if="amount > 0" class="movieSalesDiv">
          <span class="bigFont">{{ amount }}x </span>
          <img :src="view.getImage('res' + String(idx + rf.RES_MOVIE_OFFET))" class="movieImg" />
          <span class="bigFont"> for € {{ entry[3][1][idx] + amount }} M, Total: € {{ amount * (entry[3][1][idx] +
            amount) }} M</span>
        </div>
      </template>
      <div><span class="bigFont">Grand Total: € {{ entry[3][0][0] * (entry[3][1][0] + entry[3][0][0]) + entry[3][0][1] *
        (entry[3][1][1] + entry[3][0][1]) + entry[3][0][2] * (entry[3][1][2] + entry[3][0][2]) }} M
          <br />New Score: € {{ entry[3][2][0] }} M</span></div>
      New Prices:<br />
      <template v-for="(amount, idx) in entry[3][1]" :key="idx">
        <div v-if="amount > 0" class="newPriceDiv">
          <span class="bigFont">&nbsp;€ {{ amount }} M </span>
          <img :src="view.getImage('res' + String(idx + rf.RES_MOVIE_OFFET))" class="movieImg" />
        </div>
      </template>
    </div>
  </template>

  <!-- PIRATE MOVIES -->
  <template v-if="entry[0] === rf.HIST_PIRATE_MOVIE">
    <div class="log mainEntry" :class="{ 'selectableHistory': canSelectPirateEntry(entry[3]) }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <span class="mainEntryPlayer"
        :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
          store.players[entry[1]].displayName }} </span>
      <!-- Multiple SALES, MOVE TO PARTY -->
      <template v-if="entry[3][0] === 0">
        Pirates
        <img v-for="(res, idx) in entry[3].slice(1, -1)" :key="idx" :src="view.getImage('res' + String(res))"
          class="stdResImg" />
        <span v-if="entry[3].length % 2 === 1"><br />Ship moves to other party</span>
        <span v-else><br />Ship ends up in same party</span>
      </template>
      <!-- SINGLE SALE, MOVE TO OTHER PARTY -->
      <template v-if="entry[3][0] === 1">
        Pirates
        <img :src="view.getImage('res' + String(entry[3][1]))" class="stdResImg" />
        Ship moves to other party
      </template>
      <!-- No other player invovled, show income this way -->
      <template v-if="entry[3][0] <= 1">
        <br />Score: € {{ entry[3].slice(1, -1).length * 4 }} M
      </template>

      <!-- SINGLE SALE, END TURN-->
      <template v-if="entry[3][0] === 11">
        Pirates
        <img :src="view.getImage('res' + String(entry[3][1]))" class="stdResImg" />
        Score: € 4 M
      </template>
      <!-- Multiple SALES, END TURN -->
      <template v-if="entry[3][0] === 10">
        Pirates
        <img v-for="(res, idx) in entry[3].slice(1)" :key="idx" :src="view.getImage('res' + String(res))"
          class="stdResImg" />
        <br />Score: € {{ entry[3].slice(1).length * 4 }} M
      </template>
    </div>
  </template>

  <!-- MOVE PIRATES -->
  <template v-if="entry[0] === rf.HIST_MOVE_PIRATE">
    <div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <div class="container">
        <span class="mainEntryPlayer"
          :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
            store.players[entry[1]].displayName }} </span>
        Moves the Pirates to
        <div class="singleHexDiv">
          <svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
            <polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500" :fill="`url(#pattern${entry[3][0]})`"
              :transform="`rotate(${entry[3][1] * 60} 0 0)`" stroke="black" />
          </svg>
        </div>
      </div>
    </div>
  </template>

  <!-- STORE RES -->
  <template v-if="entry[0] === rf.HIST_STORE_RES">
    <div class="log mainEntry" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>
          {{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
        </span>
      </div>
      <div class="container">
        <span class="mainEntryPlayer"
          :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
            store.players[entry[1]].displayName }} </span>
        Stores:
        <template v-for="(res, idx) in entry[3]" :key="idx">
          <div v-if="res >= 20" class="singleHexDiv">
            <svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
              <polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500" :fill="`url(#pattern${res})`"
                stroke="black" />
            </svg>
          </div>
          <img v-if="res < 20 && ![rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res)"
            :src="view.getImage('res' + String(res))" class="stdResImg storedResImg" />
          <img v-if="res < 20 && [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res)"
            :src="view.getImage('res' + String(res))" class="movieImg storedResImg" />
        </template>
      </div>
    </div>
  </template>


  <!-- New Turn -->
  <template v-if="entry[0] === rf.HIST_NEW_TURN">
    <div class="log separator mainEntry" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="new_turn">Start of turn {{ entry[3][0] }}
        <br />
        <div v-for="(score, idx) in entry[3][1]" :key="idx" class="playerScoreSummaryDiv">
          <span class="mainEntryPlayerNewTurn"
            :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[idx].colour)">{{
              store.players[idx].displayName }} € {{ score }} M</span>
        </div>
      </div>
    </div>
  </template>

  <!-- GAME END -->
  <template v-if="entry[0] === rf.HIST_GAME_END">
    <div class="log separator" :class="{ 'selectableHistory': store.topMenuViews.showReplay }"
      @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
      <div class="header">
        <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
      </div>
      <div class="mainEntry new_turn">
        Game Ended<br /><br />
        <span v-if="store.oldBoysNetwork.length >= 10">All Cigars Used</span>
        <span v-else-if="store.hexDrawPile.length + store.hexDiscardPile.length === 0">All Tiles Used</span>
        <span v-else>One Player Remaining</span>
        <br /><br />
        <u>Winner</u><br />
        <div class="playerScoreSummaryDiv">
          <span class="mainEntryPlayerNewTurn"
            :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][0][0]].colour)">{{
              store.players[entry[3][0][0]].displayName }} € {{ store.players[entry[3][0][0]].score }} M</span>
        </div>
      </div>
    </div>
  </template>

  <!-- REWIND -->
  <template v-if="entry[0] === rf.HIST_REWIND">
    <div class="log">
      <div class="header">
        <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
      </div>
      <div class="mainEntry rewind">
        Game rewound to here by {{ store.players[entry[3][0]].name }}
      </div>
    </div>
  </template>

  <!-- RESIGN -->
  <template v-if="entry[0] === rf.HIST_RESIGN">
    <div class="log">
      <div class="header">
        <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
      </div>
      <div class="mainEntry rewind">
        <div class="playerScoreSummaryDiv blackBorder">
          <span class="mainEntryPlayerNewTurn"
            :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">
            {{ entry[3][0] }}
          </span>
        </div>
        Resigns
      </div>
    </div>
  </template>

  <!-- KICKOUT -->
  <template v-if="entry[0] === rf.HIST_KICKOUT">
    <div class="log">
      <div class="header">
        <span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
      </div>
      <div class="mainEntry rewind">
        {{ entry[3][0] }} was kicked out
      </div>
    </div>
  </template>
</template>


<style scoped>
.singleResDiv {
  position: relative;
  margin-right: 5px;
  margin-bottom: 2px;
  border: 2px solid black;
  display: inline-block;
  height: 35px;
  cursor: default;
}

.singleResImg {
  height: 100%;
}

.singleResNumDiv {
  position: absolute;
  font-size: 30px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
}


.playerScoreSummaryDiv {
  border: 1px solid white;
  display: inline-block;
  font-size: 20px;
  font-weight: bolder;
  margin: 4px;
  padding: 0px;
}

.blackBorder {
  border-color: black;
}

.container {
  display: flex;
  align-items: center;
}

.SingleHexDiv {
  margin: 0px;
  width: 75px;
  background-color: aqua;
  height: 75px;
}

.singleHexSVG {
  width: 75px;
  margin: 0px;
  height: fit-content;
}

.movieSalesDiv {
  margin-top: 4px;
}

.log {
  direction: ltr;
  margin: 5px;
  border: #000 1px solid;
  text-align: left;
  padding: 3px 3px 3px 3px;
  background-size: 35px 34px;
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
  color: #2196F3;
}

.log .rewind {
  background-color: #d4eafd;
  text-align: center;
  color: #000;
  font-weight: bold;
  font-size: 1.2em;
  padding: 8px;
  margin-top: 30px;
  margin-bottom: 30px;
}

.log h4 {
  text-align: center
}

.log.separator {
  padding: 3px;
}

.reverseHistory {
  display: flex;
  flex-direction: column-reverse;
}

.highlightHistDiv {
  border-color: yellow;
}

.bigFont {
  font-weight: bolder;
  /*font-size: 25px;*/
  vertical-align: middle;
}

.rightArrow {
  position: relative;
  width: 50px;
  height: 0;
  border-bottom: 10px solid black;
  display: inline-block;
  vertical-align: middle;
  margin-left: 4px;
  margin-right: 14px;
}

.rightArrow::after {
  content: '';
  width: 0;
  height: 0;
  border-top: 15px solid transparent;
  border-bottom: 15px solid transparent;
  border-left: 30px solid black;
  position: absolute;
  right: -10px;
  top: -10.5px;
}

.stdResImg {
  border: 1px solid black;
  vertical-align: middle;
  height: 35px;
  width: 35px;
}

.storedResImg {
  margin-right: 4px;
}

.movieImg {
  border: 1px solid black;
  vertical-align: middle;
  height: 53px;
  width: 34px;
}

.plusSign {
  font-weight: bolder;
  font-size: 40px;
  vertical-align: middle;
  margin-left: 4px;
  margin-right: 4px;
}

.newPriceDiv {
  display: inline-block;
}
</style>