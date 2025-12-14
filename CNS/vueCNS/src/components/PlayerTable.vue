<script setup>
import * as view from '../js/CNSview'
import * as rf from '../js/CNSreference'
import * as controller from '../js/CNScontroller'
import * as model from '../js/CNSmodel'
import * as map from '../js/CNSmap'

import { useModelStore } from "../stores/CNSstore.js";
const store = useModelStore()

import { usePersonalStore } from "../stores/CNSpersonal.js";
const personal = usePersonalStore()


function getActivePlayerClass(index) {
  if (index === store.gameflow.turnOrder[0]) return "activePlayer"
  else return ""
}
function anyPlayerHasUnusedLinks() {
  let unusedLinks = 0
  for (let i = 0; i < store.players.length; i++) {
    if (store.players[i].links.length < 5) return unusedLinks += (5 - store.players[i].links.length)
  }
  if (unusedLinks > 2) return true
  if (unusedLinks === 1 && store.context.action !== rf.ACT_ADD_LINK) return true
  return false
}

function clickedStoredHex(idx, hexRef) {
  if (!canSelectStoredHex(idx)) return
  store.clearHistoryHelpers()

  store.context.action = rf.ACT_PLACE_HEX
  store.context.hexRefBeingAdded = hexRef
  store.context.hexBeingAddedRotation = 0

  map.setPlaceableTiles()
  map.calculateCanvasSize(true)
}
function rotateNewHexTile(dir) {
  store.context.hexBeingAddedRotation += 1 * dir
  if (store.context.hexBeingAddedRotation === -1) store.context.hexBeingAddedRotation = 5
  else if (store.context.hexBeingAddedRotation === 6) store.context.hexBeingAddedRotation = 0
}

function getNewHexRotation(hexRef) {
  if (hexRef !== store.context.hexRefBeingAdded) return 0
  if (!rf.HEX_PARTY_ROTATABLE.includes(hexRef)) return 0
  else return store.context.hexBeingAddedRotation
}

function getPlayerIndexOrderForTable() {
    /*if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
      // [playerIndex, name, score]
      let resArr = store.history[store.history.length-1][3]
      let orderArr = []
      for (let i=0;i<resArr.length;i++) {
        orderArr.push(resArr[i][0])
      }
      return orderArr
    }*/
    
    return store.gameflow.fullTurnOrder
  }
  function canSelectStoredHex(idx) {
    if (!personal.canPlay()) return false
    if (model.hexActionsRemaining(idx)) return true
    return false
  }

</script>

<template>
  <div id="playerInfo">
    <table id="playerTable">
      <thead>
        <tr>
          <th><b>Player</b></th>
          <th><b>Score</b></th>
          <th :class="{ hidden: !anyPlayerHasUnusedLinks() }"><span v-if="anyPlayerHasUnusedLinks()"><b>Links</b></span>
          </th>
          <th><b>Stored Resources</b>
          </th>
        </tr>
      </thead>
      <tr v-for="(arrayIndex, idx) in getPlayerIndexOrderForTable()" :key="idx">
        <td :class="getActivePlayerClass(idx)">
          <a><span :class="['playerInfoName', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[arrayIndex].colour)]">
              {{ store.players[arrayIndex].displayName }} </span></a>
        </td>
        <td>€ {{ store.players[arrayIndex].score }} M</td>
        <td :class="{ hidden: !anyPlayerHasUnusedLinks() }"><span v-if="anyPlayerHasUnusedLinks()">{{ 5 -
            store.players[arrayIndex].links.length }}</span></td>
        <td class="storedResTD">
          <div class="storedResDIV">
            <template
              v-if="idx === controller.currentPlayerIndex() && store.gameflow.phase === rf.PHASE_PRODUCTION && store.context.action !== rf.ACT_CONFIRM_END_TURN && !store.useExpansion">
              Stored Resources<br />Added to Available Resources
            </template>
            <template v-else>
              <template v-for="(res, idx2) in store.players[arrayIndex].storedResources" :key="idx2">
                <div v-if="res >= 20" class="singleHexDiv">
                  <svg class="singleHexSVG"
                    :class="{ 'selectableHexSVG': canSelectStoredHex(idx), 'lightGreen': store.context.hexRefBeingAdded === res }"
                    xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
                    <polygon @click="clickedStoredHex(idx, res)" points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
                      :fill="`url(#pattern${res})`" :transform="`rotate(${getNewHexRotation(res) * 60} 0 0)`" />
                  </svg>

                  <div class="newHexRotateDiv leftRotatePos"
                    v-if="rf.HEX_PARTY_ROTATABLE.includes(res) && store.context.hexRefBeingAdded === res">
                    <img class="rot_img rot_img_enabled" @click="rotateNewHexTile(-1)"
                      src="@static/CNS/images/rot_anticlockwise.svg" />
                  </div>

                  <div class="newHexRotateDiv rightRotatePos"
                    v-if="rf.HEX_PARTY_ROTATABLE.includes(res) && store.context.hexRefBeingAdded === res">
                    <img class="rot_img rot_img_enabled" @click="rotateNewHexTile(1)"
                      src="@static/CNS/images/rot_clockwise.svg" />
                  </div>

                </div>
                <img v-if="res < 20" class="storedResImg" :src="view.getImage('res' + String(res))" />
              </template>
            </template>
          </div>
        </td>
      </tr>
    </table>

  </div>
</template>

<style scoped>
.SingleHexDiv {
  margin: 0px;
  position: relative;
  display: flex;
  overflow-x: auto;
  max-width: 100%;
  align-items: center;
  position: relative;
}
.newHexRotateDiv {
  position: absolute;
  bottom: 0px;
  z-index: 100;
  background-color: aliceblue;
  width: 30px;
  height: 30px;
  border: 1px solid black;
  border-radius: 10px;
  box-sizing: border-box;
  overflow: hidden;
}

.newHexRotateDiv:hover {
  border: yellow;
}


.leftRotatePos {
  left: 0px;
}

.rightRotatePos {
  left: 84px;
}

#playerInfo {
  height: 355px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.storedResTD {
  white-space: nowrap;
}

.hidden {
  width: 0px !important;
  padding: 0px !important;
}

.storedResDIV {
  display: flex;
  overflow-x: auto;
  max-width: 100%;
  align-items: center;
  position: relative;
}

.storedResImg {
  /*display: inline-block;*/
  vertical-align: middle;
  max-height: 100%;

  border: 2px solid black;
  height: 60px;
  margin-left: 2px;

}

.playerInfoName {
  color: white;
  font-weight: bolder;
  padding: 3px;
  border: 1px solid black;
}

.activePlayer {
  background-color: lightgreen;
}

#playerTable {
  border-collapse: collapse;
  width: 600px;  
}

#playerTable a:link {
  text-decoration: none;
  /*color: darkblue;*/
  color: lightcyan;
}

#playerTable a:visited {
  text-decoration: none;
  color: darkblue;
}

#playerTable a:hover {
  text-decoration: underline;
}

#playerTable a:active {
  text-decoration: none;
  color: darkblue;

}

#playerTable td,
#playerTable th {
  border: 1px solid #ddd;
  padding: 5px;
}

#playerTable tr:not(:first-child) {
  cursor: pointer;
  text-align: center;
  height: 78.5px;
}

#playerTable tr:nth-child(even) {
  background-color: #f2f2f2;
}

#playerTable tr:nth-child(odd) {
  background-color: white;
}

#playerTable tr:hover {
  background-color: #ddd;
}

#playerTable th {
  padding-top: 7px;
  padding-bottom: 7px;
  background-color: #5875f8;
  color: white;
  cursor: default;
}



.singleHexSVG {
  width: 60px;
  margin: 0px;
  height: fit-content;
  stroke-width: 20px;
  stroke: black;
}


.selectableHexSVG {
  width: 120px;
  stroke: black;
 
}

.selectableHexSVG:hover {
  stroke: yellow;
}

.lightGreen {
  stroke: lightgreen !important;
}
</style>
