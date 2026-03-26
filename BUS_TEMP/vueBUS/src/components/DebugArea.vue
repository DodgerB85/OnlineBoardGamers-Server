<script setup>
import * as WS from '../BUSwebsocket'

//import { storeToRefs } from 'pinia'
import { useModelStore } from "../stores/model.js";
const model = useModelStore()
//const modelRefs = storeToRefs(model);

import { usePersonalStore } from "../stores/personal.js";
const personal = usePersonalStore()

import * as constants from '../constants'

function test() {
  alert(personal.selectedBoard)
}
function test2() {
  //model.increaseScore(model.players[0])
  for (let i=0;i<model.players.length;i++) {
    model.players[i].passActionsFlag = false
  }
}

function swapPlayerOrder() {
  //model.gameflow.turnOrder.unshift(model.gameflow.turnOrder.pop())
  model.increaseScore(model.players[1])
}

function highlightBuildingOptions() {
  model.increaseScore(model.players[1])
  model.getVromBuildings()
}
function removePax() {
  model.moveAllPassengersOntoJunctions()
}
function addPax(bldgNumber) {
  model.moveAllPassengersOntoCorrectBuilding(bldgNumber)
}

function removeAllBuildings() {
  for (let i = 0; i < model.junctions.length; i++) {
    for (let j = 0; j < model.junctions[i].length; j++) {
      if (model.junctions[i][j] > 0) model.junctions[i][j] = 0
    }
  }
}
function exportLoc() {
  //model.desiredBuilding = 1
  console.log(model.exportModel())
}
function importLoc() {
  var data = 
'NrDeCIDsEMFsFNwC5wGUASBBAIgeQOrgA04AJgJYDOADgDbQCeAcnIihjgceAMYD2tPgFcATsgCMJSvxFsADCVmxo5SKoDmmHgBdyfSJQkA2EroSpt++IaQLwAIyGVrEkvEikAUkMg69B5GAAJiIAFgBdNw8AGVUXJGCiAGZI8DpGeBFvX119G0SksPCAXyIIGARkcGhSWFVuChp6ZlYqmrrIbn5BUWQ7aT5ZPsV4ZVUNLVyApHETcDN4CysbO0dnGxDwdy8fPzzA8QBWInE5VO3YyHjgJJCgo1T0hkzsvengWZOFI5KyqFb2Fg8PgAPpBBpUJ4sSqAzig8EkbrCMRIQrgAZDWwjMZqSCaN42cQAdlM5HMliuKxIa3iki2HleU3yCiC5xicWZJ0ezReuyZByIITOxUiIAUwAAtJIpUQZTKzkQFR8iJLpWrZZIFUqQqqNYr9VLIkrCrq5eqtaLQiqzQa1UbRcdTer5faVSYnXqXYrRSSPQoFIbvSqABzW82e8Su4AATjDtttUdOcZtZsiKRV4kkHptFozOpzEcTJoLqaDHytwH9EY1kUjGcdkmddq5GfdMvDgaVxOTTaDXdD2fNidjuoDmprZaC4u+1cDdeCWcbs7r86C+fDY6jQWLva92orKaHk8dh8Lk7b4-lE+1voLm8nA5Lze1I6f19FSXFp73H6zd-fKq3D21a5jcO7Ln2H4HrumpRkkJ4wZBkTHAONwfqK87zqK2EqjhwB4QRuFEfhxGESR5FkUqZF4VRpF0RR9HUYxzEMaxTFsSx1GioOy6isaJzxqWPGHhhH4CQohSwWG4SRBA2iiJ0MwkNQAAW0DOMgJLzApuAiKQmSBAq4AAGZCLQtAACo6XpBkJDOrIkKZ5mTP4VkiJAun6SiiTfL8kgQI45C0BQeKUNE8DGdoFl8AACvQPDyCQtAcuFkXRXF0AJcMaTqc4eKZGFEVRbF8WJei8C0PAOjwKQABCQhBSF6gWQw1BsHSSgqLi6gAGoiHwsBUtp7kAKIeBoI0iP1IgALLWJQ0DqGw4DcM4lXVaQMXQAAHtFfUDYy-jIDK9I7Dk-iULg1D8gkqSZVMADCKl8HlyDGdAtDOIi+jGeQIiwGNpBuYp72ffAJAqVQlgiAwuD2AAVoEvwgEmY5GNGSREsGSShLcchYyqypHC2RPHGcMkZjOUro5j2O41ORIVkTJiYYKjYyRhLIajTWM43jRI6sqQRSULvkUx8l6zBjvP03IRiOj5HMZku1PS3TeNGOKwQmOTGGSCEqu03zU6HL6ypKv6SsSwJhsy3jhwmjcQpW5mto8+rJtZjc3ri2O3Nq8bciHIu4viEK-tG7LoTula5N5jbUuR3juMZj78cG4ndtTqEWbOxh4e2x7chJCOISRvnCfu4HmMqncod3BHWdyEEI5k-XbsB7LQQVsc5fx2qVddzqxyshXGeD3jwsqscKQV2jnd4+IrdFBXA8L1OzfT0Qhzt+P69yHIi5xx8BeZ0XB+U+3a9J0v0YDqcoeSY36u3wOo8Zlae839G0YVkmD8YVjs-Pmt9xQAI-pXBeoDcIcyAA'






model.importModel(data)
  //model.canPlayerVrom()
}



</script>

<template>



{{  model.getScoreObj()  }}
<br/> {{ model.players[0] }}
<br/>
<br/> {{ model.players[1] }}
<br/>

<br/> {{ model.getWinnerName(true) }}
<br/>
  <button @click="model.increaseScore(model.players[0])">P0 + </button>
  <button @click="model.decreaseScore(model.players[0]); model.players[0].timeStones++">P0 - </button>

  <button @click="model.increaseScore(model.players[1])">P1 + </button>
  <button @click="model.decreaseScore(model.players[1]);  model.players[1].timeStones++">P1 - </button>

  
  <button @click="model.increaseScore(model.players[2])">P2 + </button>
  <button @click="model.decreaseScore(model.players[2]);  model.players[2].timeStones++">P2 - </button>
  
  <button @click="model.gameflow.gameEnded = 0">Play </button>
  <button @click="model.gameflow.gameEnded = 1">End </button>

  <button @click="test">Test </button>
  <button @click="test2">Test2 </button>
  <button @click="swapPlayerOrder">swap players</button>
  <button @click="highlightBuildingOptions(1)">Highligh Bldg Options</button>
  <button @click="removeAllBuildings()">Remove All Bldgs</button>
  <button @click="removePax()">Remove Pax</button>
  <button @click="addPax(1)">Add Pax</button>
  <button @click="exportLoc()">export</button>
  <button @click="importLoc()">import</button>
</template>

<style scoped>
body {overflow: hidden; background: #212121}
input {position: absolute; display: none}

* {
  margin: 0px;
  padding: 0px;
  list-style-type: none;
}

body {
  background: #003366;
}

#container {
  width: 1000px;
  margin: 0px auto;
}

#elements {
  width: 100%;
}

#elements li {
  display: inline-block;
  width: 50px;
  margin: 5px;
  background: #FFF;
  color: #003366;
  box-shadow: 10px 10px 0px #222;
  user-select: none;
}

#elements li h1,
h3 {
  padding: 1px;
}

#elements li h1 {
  cursor: pointer;
}
</style>
