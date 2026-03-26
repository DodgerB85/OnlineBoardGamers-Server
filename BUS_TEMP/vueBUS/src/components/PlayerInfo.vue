<script setup>
import * as constants from '../constants'
import * as view from '../js/BUSview.js'

import { useModelStore } from "../stores/model.js";
const model = useModelStore()

import { usePersonalStore } from "../stores/personal.js";
const personal = usePersonalStore()

function getActivePlayerClass(index) {
  if (index === model.gameflow.turnOrder[0]) return "activePlayer"
  else if (model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && !model.gameflow.turnOrder.includes(index)) return "passedPlayer"
  else return ""
}

</script>

<template>
  <div id="playerInfo">
    <table id="playerTable">
      <thead>
        <tr>
          <th><b>Player</b></th>
          <th><b>Actions</b></th>
          <th><b>Buses</b></th>
          <th><b>Stones</b></th>
          <th><b>Score</b></th>
        </tr>
      </thead>
      <tr v-for="(arrayIndex, index) in model.getPlayerIndexOrderForTable()" :key="index">
        <td :class="getActivePlayerClass(arrayIndex)">
          <a><span
              :class="['playerInfoName', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[arrayIndex].colour)]">
              {{ model.players[arrayIndex].displayName }} </span></a>
        </td>
        <td :class="{ 'noMoreLeft': (model.players[arrayIndex].remainingActions === 0) }">{{
          model.players[arrayIndex].remainingActions }}</td>
        <td>{{ model.players[arrayIndex].buses }}</td>
        <td>{{ model.players[arrayIndex].timeStones }}</td>
        <td>{{ Math.floor(model.players[arrayIndex].score) }}</td>
      </tr>
    </table>

    <div id="desireDiv">
      <!-- DESIRED DESTINATION -->
      <!-- REPLAY MODE< PHASE ALTER TIME-->
      <template v-if="model.topMenuViews.showReplay && model.gameflow.phase === constants.PHASE_ALTER_TIME">
        Destination:
        <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === 1" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>
      <!-- PHASE ALTER TIME // NOT CLICKED AN OPTION-->
      <template v-else-if="model.gameflow.phase === constants.PHASE_ALTER_TIME && !model.context.confirmEndTurn">
        <span v-if="model.gameflow.phase <= constants.PHASE_CHOOSE_ACTIONS || model.actionAreaData[4][0] !== -1">Expected
        </span>Destination:
        <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="buildingDesireImg"
          :src="view.getImage('building' + String((model.desiredBuilding === 3) ? 1 : model.desiredBuilding + 1))"
          alt="desiredBldg">
        <img v-if="personal.selectedBoard === 1" class="buildingDesireImg"
          :src="view.getImage('building' + String((model.desiredBuilding === 3) ? 1 : model.desiredBuilding + 1) + '_orig')"
          alt="desiredBldg">

        Altering Time would keep Destination as:
        <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === 1" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>
      <!-- PHASE ALTER TIME // CLICKED AN OPTION-->
      <template v-else-if="model.gameflow.phase === constants.PHASE_ALTER_TIME && model.context.confirmEndTurn">
        Destination:
        <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === 1" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>

      <!-- NOT PHASE VROM-->
      <template v-else-if="model.gameflow.phase !== constants.PHASE_VROM">
        <span v-if="model.gameflow.phase <= constants.PHASE_CHOOSE_ACTIONS || model.actionAreaData[4][0] !== -1">Expected
        </span>Destination:
        <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="buildingDesireImg"
          :src="view.getImage('building' + String((model.desiredBuilding === 3) ? 1 : model.desiredBuilding + 1))"
          alt="desiredBldg">
        <img v-if="personal.selectedBoard === 1" class="buildingDesireImg"
          :src="view.getImage('building' + String((model.desiredBuilding === 3) ? 1 : model.desiredBuilding + 1) + '_orig')"
          alt="desiredBldg">

        <template v-if="model.gameflow.phase <= constants.PHASE_CHOOSE_ACTIONS || model.actionAreaData[4][0] !== -1">
          Altering Time would keep Destination as:
          <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="buildingDesireImg"
            :src="view.getImage('building' + String(model.desiredBuilding))" alt="desiredBldg">
          <img v-if="personal.selectedBoard === 1" class="buildingDesireImg"
            :src="view.getImage('building' + String(model.desiredBuilding) + '_orig')" alt="desiredBldg">
        </template>
      </template>
      <!-- NOT PHASE VROM-->
      <template v-else-if="model.gameflow.phase === constants.PHASE_VROM">
        Destination:
        <img v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === 1" class="buildingDesireImg"
          :src="view.getImage('building' + String(model.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>
      <!-- END DESIRED DESTINATION -->

      <div id="currentTurnOrder" v-if="model.gameflow.phase !== constants.PHASE_GAME_OVER">Current Turn Order: <span
          v-for="(playerID, index2) in model.gameflow.turnOrder" v-bind:key="index2"
          :class="['playerLineName', 'mainEntryPlayer' + personal.getCorrectedColour(model.players[playerID].colour)]">
          {{ model.players[playerID].displayName }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*.star-gold {
  --star-color: gold;
}

.star-silver {
  --star-color: silver;
}

.five-pointed-star {

  /*margin:1em auto;*/
/* font-size: 10px;
  position: relative;
  display: inline-block;
  width: 0px;
  height: 0px;
  border-right: 1em solid transparent;
  border-bottom: 0.7em solid var(--star-color);
  border-left: 1em solid transparent;
  transform: rotate(35deg);
}

.five-pointed-star:before {
  border-bottom: 0.8em solid var(--star-color);
  border-left: 0.3em solid transparent;
  border-right: 0.3em solid transparent;
  position: absolute;
  height: 0;
  width: 0;
  top: -0.45em;
  left: -0.65em;
  display: block;
  content: "";
  transform: rotate(-35deg);
}

.five-pointed-star:after {
  position: absolute;
  display: block;
  top: 0.03em;
  left: -1.05em;
  width: 0;
  height: 0;
  border-right: 1em solid transparent;
  border-bottom: 0.7em solid var(--star-color);
  border-left: 1em solid transparent;
  transform: rotate(-70deg);
  content: "";
}*/

#currentTurnOrder {
  margin-bottom: 10px;
  line-height: 20px;
}

.playerInfoName {
  color: white;
  font-weight: bolder;
  padding: 3px;
  border: 1px solid black;
}

.playerLineName {
  color: white;
  font-weight: bolder;
  padding: 3px;
  border: 1px solid black;
  margin-right: 3px;
  margin-top: 1px;
  display: inline-block;
}

.noMoreLeft {
  color: red;
}

.activePlayer {
  background-color: lightgreen;
}

.passedPlayer {
  background-color: orange;
}

#desireDiv {
  text-align: center;
}

.buildingDesireImg {
  width: 40px;
  vertical-align: middle;
}

#playerTable {
  border-collapse: collapse;
  width: 600px;
  margin: 5px;
}

#playerTable a:link {
  text-decoration: none;
  color: lightcyan;
}

#playerTable a:visited {
  text-decoration: none;
  color: darkblue;
  color: greenyellow;
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

#playerTable tr {
  cursor: pointer;
  text-align: center;
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
</style>
