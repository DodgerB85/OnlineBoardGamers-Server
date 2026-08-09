<script setup>
import * as rf from '../js/BUSreference.js'
import * as view from '../js/BUSview.js'
import * as model from '../js/BUSmodel.js'

import { useModelStore } from "../stores/BUSstore.js";
const store = useModelStore()

import { usePersonalStore } from "../stores/BUSpersonal.js";
const personal = usePersonalStore()

function getActivePlayerClass(index) {
  if (index === store.gameflow.turnOrder[0]) return "activePlayer"
  else if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && !store.gameflow.turnOrder.includes(index)) return "passedPlayer"
  else if (store.gameflow.phase === rf.PHASE_GAME_OVER && store.players[index].remainingActions === 0) return "passedPlayer"
  else return ""
}

function getPlayerIndexOrderForTable() {
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		let scoreObj = model.getScoreObj()
		let resArr = [...store.players]
		for (let i = 0; i < resArr.length; i++) resArr[i].playerIndex = i
		let order = []
		for (let i = 0; i < scoreObj.length; i++) {
			for (let j = 0; j < scoreObj[i][1].length; j++) {
				let player = resArr.find((el) => el.colour === scoreObj[i][1][j])
				order.push(player.playerIndex)
			}
		}
		return order
	} else return [...store.gameflow.fullTurnOrder]
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
      <tbody>
      <tr v-for="(arrayIndex, index) in getPlayerIndexOrderForTable()" :key="index">
        <td :class="getActivePlayerClass(arrayIndex)">
          <a><span
              :class="['playerInfoName', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[arrayIndex].colour)]">
              {{ store.players[arrayIndex].displayName }} </span></a>
        </td>
        <td :class="{ 'noMoreLeft': (store.players[arrayIndex].remainingActions === 0) }">{{ store.players[arrayIndex].remainingActions }}</td>
        <td>{{ store.players[arrayIndex].buses }}</td>
        <td>{{ store.players[arrayIndex].timeStones }}</td>
        <td>{{ Math.floor(store.players[arrayIndex].score) }}</td>
      </tr>
      </tbody>
    </table>

    <div id="desireDiv">
      <!-- DESIRED DESTINATION -->
      <!-- REPLAY MODE< PHASE ALTER TIME-->
      <template v-if="store.topMenuViews.showReplay && store.gameflow.phase === rf.PHASE_ALTER_TIME">
        Destination:
        <img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === rf.BOARD_OG" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>
      <!-- PHASE ALTER TIME // NOT CLICKED AN OPTION-->
      <template v-else-if="store.gameflow.phase === rf.PHASE_ALTER_TIME && !store.context.confirmEndTurn">
        <span v-if="store.gameflow.phase <= rf.PHASE_CHOOSE_ACTIONS || store.actionAreaData[4][0] !== -1">Expected
        </span>Destination:
        <img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="buildingDesireImg"
          :src="view.getImage('building' + String((store.desiredBuilding === rf.BLDG_PUB) ? rf.BLDG_HOME : store.desiredBuilding + 1))"
          alt="desiredBldg">
        <img v-if="personal.selectedBoard === rf.BOARD_OG" class="buildingDesireImg"
          :src="view.getImage('building' + String((store.desiredBuilding === rf.BLDG_PUB) ? rf.BLDG_HOME : store.desiredBuilding + 1) + '_orig')"
          alt="desiredBldg">

        Altering Time would keep Destination as:
        <img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === rf.BOARD_OG" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>
      <!-- PHASE ALTER TIME // CLICKED AN OPTION-->
      <template v-else-if="store.gameflow.phase === rf.PHASE_ALTER_TIME && store.context.confirmEndTurn">
        Destination:
        <img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === rf.BOARD_OG" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>

      <!-- NOT PHASE VROM-->
      <template v-else-if="store.gameflow.phase !== rf.PHASE_VROM">
        <span v-if="store.gameflow.phase <= rf.PHASE_CHOOSE_ACTIONS || store.actionAreaData[4][0] !== -1">Expected
        </span>Destination:
        <img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="buildingDesireImg"
          :src="view.getImage('building' + String((store.desiredBuilding === rf.BLDG_PUB) ? rf.BLDG_HOME : store.desiredBuilding + 1))"
          alt="desiredBldg">
        <img v-if="personal.selectedBoard === rf.BOARD_OG" class="buildingDesireImg"
          :src="view.getImage('building' + String((store.desiredBuilding === rf.BLDG_PUB) ? rf.BLDG_HOME : store.desiredBuilding + 1) + '_orig')"
          alt="desiredBldg">

        <template v-if="store.gameflow.phase <= rf.PHASE_CHOOSE_ACTIONS || store.actionAreaData[4][0] !== -1">
          Altering Time would keep Destination as:
          <img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="buildingDesireImg"
            :src="view.getImage('building' + String(store.desiredBuilding))" alt="desiredBldg">
          <img v-if="personal.selectedBoard === rf.BOARD_OG" class="buildingDesireImg"
            :src="view.getImage('building' + String(store.desiredBuilding) + '_orig')" alt="desiredBldg">
        </template>
      </template>
      <!-- NOT PHASE VROM-->
      <template v-else-if="store.gameflow.phase === rf.PHASE_VROM">
        Destination:
        <img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding))" alt="desiredBldg">
        <img v-if="personal.selectedBoard === rf.BOARD_OG" class="buildingDesireImg"
          :src="view.getImage('building' + String(store.desiredBuilding) + '_orig')" alt="desiredBldg">
      </template>
      <!-- END DESIRED DESTINATION -->

      <div id="currentTurnOrder" v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER">Current Turn Order: <span
          v-for="(playerID, index2) in store.gameflow.turnOrder" v-bind:key="index2"
          :class="['playerLineName', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerID].colour)]">
          {{ store.players[playerID].displayName }}
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
