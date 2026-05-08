<script setup>

import { useModelStore } from "../stores/CNSstore.js";
const store = useModelStore()

import { usePersonalStore } from "../stores/CNSpersonal.js";
const personal = usePersonalStore()

import * as view from '../js/CNSview'
import * as map from '../js/CNSmap'
import * as rf from '../js/CNSreference'
import * as controller from '../js/CNScontroller'
import * as model from '../js/CNSmodel'
import * as funcs from '../js/CNSfuncs'

import { ref } from 'vue';
const showErrorPopup = ref(false);
const popupPosition = ref({ x: 0, y: 0 });
let errorInterval;

function getMoviePriceLeft(price, idx) {
  return (price - 6) * 40.5 + 6
  /****THIS CODE IS TO SHIFT MULTIPLE PRICES L/R. I CHANGED TO MOVING UP/DOWN INSTEAD */
  /*const occurrence = store.moviePrices.filter(number => number === price).length;
  // If the only movie in the slot, return the centre
  if (occurrence === 1) return (price - 6) * 40.5 + 6

  // If there are two, shift one left and one right
  if (occurrence === 2) {
    // Must go left
    if (idx === 0) return (price - 6) * 40.5 + 6 - 3
    // Could go either way
    if (idx === 1) {
      let dir = 1
      if (store.moviePrices[2] === price) dir = -1
      return (price - 6) * 40.5 + 3 * dir
    }
    // Must go right
    if (idx === 2) return (price - 6) * 40.5 + 6 + 3
  }

  // If they all sit in the same slot, shift first left, last right
  if (occurrence === 3) {
    if (idx === 0) return (price - 6) * 40.5 + 6 - 15
    if (idx === 1) return (price - 6) * 40.5 + 6
    if (idx === 2) return (price - 6) * 40.5 + 6 + 15
  }*/
}

function getMoviePriceTop(price, idx) {
  const occurrence = store.moviePrices.filter(number => number === price).length;
  if (occurrence === 1) return 10

  if (occurrence === 2) {
    // Must go up
    if (idx === 0) return 10 - 30

    // Could go either way
    if (idx === 1) {
      let offset = -30
      if (store.moviePrices[0] === price) offset = 0

      if (idx === 3) offset = 0
      return 10 + offset
    }

    // Must Be Normal
    if (idx === 2) return 10
  }

  if (occurrence === 3) {
    if (idx === 0) return 10 - 30
    if (idx === 1) return 10 - 15
    if (idx === 2) return 10
  }
}

function clickedNewHexOption(hexRef) {
  if (!personal.canPlay()) return
  if (!model.hexActionsRemaining(controller.currentPlayerIndex())) return
  store.clearHistoryHelpers()
  store.context.action = rf.ACT_PLACE_HEX
  store.context.hexRefBeingAdded = hexRef
  store.context.hexBeingAddedRotation = 0

  map.setPlaceableTiles()
  map.calculateCanvasSize(true)
}
function getNewHexRotation(hexRef) {
  if (hexRef !== store.context.hexRefBeingAdded) return 0
  if (!rf.HEX_PARTY_ROTATABLE.includes(hexRef)) return 0
  else return store.context.hexBeingAddedRotation
}

function rotateNewHexTile(dir) {
  store.clearHistoryHelpers()
  store.context.hexBeingAddedRotation += 1 * dir
  if (store.context.hexBeingAddedRotation === -1) store.context.hexBeingAddedRotation = 5
  else if (store.context.hexBeingAddedRotation === 6) store.context.hexBeingAddedRotation = 0
}

function clickedFilmCriticMovieImg(res) {
  const movieIndex = res - rf.RES_MOVIE_OFFET; // Assuming res values start from 1
  const moviePrice = store.moviePrices[movieIndex];

  if (moviePrice === 15) {
    // Calculate the position based on the mouse/touch event
    popupPosition.value = { x: event.clientX, y: event.clientY - 60 };

    // Show the error popup
    showErrorPopup.value = true;

    clearTimeout(errorInterval);
    // Hide the error popup after 2 seconds
    errorInterval = setTimeout(() => {
      showErrorPopup.value = false;
    }, 2000);
  } else {
    model.increaseFilmPrice(res);
  }
}

function clickedMoveImgToSell(res) {
  if (store.context.availableResources[res] === 0) return
  store.context.availableResources[res]--
  store.context.sellingSummary[res - rf.RES_MOVIE_OFFET]++

}

function localSellMovies() {
  model.sellMovies(controller.currentPlayerIndex())
}

function cancelSales() {
  model.cancelSellMovies()
}

function canStoreHex(hexRef) {
  if (!store.useExpansion) return false
  if (store.context.hexRefBeingAdded !== hexRef) return false
  // Need at least 1 link
  if (controller.currentPlayerObj().links.length === 0) return false
  // Need at least 2 spaces
  if (controller.currentPlayerObj().storedResources.length >= 4) return false
  for (let i = 0; i < controller.currentPlayerObj().storedResources.length; i++) {
    // Check if tile already stored
    if (controller.currentPlayerObj().storedResources[i] >= 20) return false
  }
  return true
}

function locStoreHex() {
  store.clearHistoryHelpers()
  model.storeHex(controller.currentPlayerObj(), store.context.hexRefBeingAdded)
}

function afterPirateResult() {
  let network = map.getHexesInNetwork(controller.currentPlayerObj(), true)

  const inAllParties = store.context.partyZones.every(zone =>
    zone.some(entry => network.includes(entry.hexRef))
  )

  // Need to find out if player is in all party zones
  if (store.context.partyZones.length === 2 && inAllParties) return 0
  else if (store.context.partyZones.length === 2 && !inAllParties) return 1
  else if (inAllParties) return 10
  else return 11
}

function clickedPirateRes(res) {
  let afterPirateResultNum = afterPirateResult()
  store.context.pirateActionsUsed++
  // 2 parties, in both
  if (afterPirateResultNum === 0) {
    model.pirateResource(controller.currentPlayerObj(), res, afterPirateResultNum)
  }
  // 2 parties, not in the other
  else if (afterPirateResultNum === 1) {
    model.pirateResource(controller.currentPlayerObj(), res, afterPirateResultNum)
    store.context.availableProduction = store.context.availableProduction.filter(item => item !== rf.PROD_PIRATE);
    store.context.action = rf.ACT_NONE
  }

  // 3+ parties, in all
  else if (afterPirateResultNum === 10) {
    model.pirateResource(controller.currentPlayerObj(), res, afterPirateResultNum)
  }


  // 3+ parties, not in all
  else if (afterPirateResultNum === 11) {
    model.pirateResource(controller.currentPlayerObj(), res, afterPirateResultNum)
    store.context.action = rf.ACT_NONE
    store.gameflow.phase = rf.PHASE_CONFIRM_PIRATE
    store.context.historyObj.push(11, res)
  }
}

function cancelPirate() {
  funcs.importModel(store.pirateResetData, true)
}

function finishPirate() {
  // 2 parties, in both, just set action to none
  if (afterPirateResult() === 0) {
    store.context.historyObj.push(store.pirateShipRef)
    model.addHistory(rf.HIST_PIRATE_MOVIE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
    store.context.historyObj.splice(0)
    store.context.pirateActionsUsed = 0
    store.context.action = rf.ACT_NONE
  }
  // 3+ parties, in all
  else if (afterPirateResult() >= 10) {
    store.context.action = rf.ACT_NONE
    store.gameflow.phase = rf.PHASE_CONFIRM_PIRATE
  }
}

function getHexOptionFill(idx) {
  if (rf.DEBUG_USERS.includes(personal.name)) return `url(#newHexPattern${idx})`
  if (store.topMenuViews.showReplay && store.history[store.history.length - 1][0] === rf.HIST_GAME_END) return `url(#newHexPattern${idx})`
  if (personal.canPlay()) return `url(#newHexPattern${idx})`
  return 'white'
}
function isHexSelectable() {
  if (!personal.canPlay()) return false
  if (model.hexActionsRemaining(controller.currentPlayerIndex())) return true
  return false
}

function clickedCigar() {
  if (personal.name !== 'sjkat17') return
  /*if (store.gameflow.phase === rf.PHASE_NETWORK) {
    store.context.removableLinks.splice(0)
    for (let i=0;i<store.players[personal.pov].links.length;i++) {
     store.context.removableLinks.push(store.players[personal.pov].links[i])
    }
  }*/
}
</script>

<template>
  <div id="wholeArea">
    <span>&nbsp;</span>
    <!-- Box Office-->
    <div id="boxOfficeDiv">
      <img id="boxOfficeImg" :src="view.getImage('boxOffice')" />
      <img v-for="(price, idx) in store.moviePrices" :key="idx" class="moviePriceImg"
        :src="view.getImage('res' + String(idx + 7))" :style="{
          left: getMoviePriceLeft(price, idx) + 'px',
          top: getMoviePriceTop(price, idx) + 'px'
        }" />
    </div>
    <div id="hexPiles">
      <div id="drawPile" class="pile">
        <svg @click="clickedDrawPile" class="hexagonPile" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="black" />
          <text x="50" y="65" text-anchor="middle">{{ store.hexDrawPile.length }}</text>
        </svg>
      </div>
      <div id="discardPile" class="pile">
        <svg class="hexagonPile" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="black" />
          <text x="50" y="65" text-anchor="middle">{{ store.hexDiscardPile.length }}</text>
        </svg>
      </div>
      <div id="remainingCigarsDiv">
        <img @click="clickedCigar" :src="view.getImage('cigar')" id="remainingCigarsImg" /> x
        {{ 10 - store.oldBoysNetwork.length }}
      </div>
    </div>

    <!-- 3 Available Hexes to Place -->
    <div id="hexOptionDiv">
      <transition name="fadeOut">
        <div class="errorPopup" v-if="showErrorPopup"
          :style="{ top: popupPosition.y + 'px', left: popupPosition.x + 'px' }">
          Max Price 15
        </div>
      </transition>

      <div v-for="(hexRef, idx) in store.ongoingVars.drawnHexes" :key="idx" class="newSingleHexDiv">
        <svg class="newSingleHexagon" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
          <!-- Get patterns for all the hex images -->
          <defs>
            <pattern :id="'newHexPattern' + idx" height="100%" width="100%" patternContentUnits="objectBoundingBox">
              <image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('hex' + hexRef)" />
            </pattern>
          </defs>

          <polygon @click="clickedNewHexOption(hexRef)" points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
            :fill="getHexOptionFill(idx)" :transform="`rotate(${getNewHexRotation(hexRef) * 60} 0 0)`" stroke="black"
            :class="{
              lightGreen: store.context.hexRefBeingAdded === hexRef,
              selectableHex: isHexSelectable()
            }" />
        </svg>

        <div class="newHexRotateDiv leftRotatePos" v-if="
          rf.HEX_PARTY_ROTATABLE.includes(hexRef) && store.context.hexRefBeingAdded === hexRef
        ">
          <img @click="rotateNewHexTile(-1)" :src="view.getImage('rot_anticlockwise')" />
        </div>
        <div v-if="canStoreHex(hexRef)" class="newHexStoreDiv">
          <button @click="locStoreHex()" class="actionsLineButton">Store Tile</button>
        </div>
        <div class="newHexRotateDiv rightRotatePos" v-if="
          rf.HEX_PARTY_ROTATABLE.includes(hexRef) && store.context.hexRefBeingAdded === hexRef
        ">
          <img @click="rotateNewHexTile(1)" :src="view.getImage('rot_clockwise')" />
        </div>
      </div>

      <!-- FILM CRITIC -->
      <div v-if="store.context.action === rf.ACT_FILM_CRITIC" id="filmCriticDiv">
        Select a film to increase in value<br />
        <img v-for="(res, idx) in [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI]" :key="idx"
          :src="view.getImage('res' + String(res))" class="movieResImg" @click="clickedFilmCriticMovieImg(res)" />
      </div>

      <!-- SELL TO CANNES -->
      <div v-if="store.context.action === rf.ACT_SELL_CANNES" id="cannesSellingContainer">
        <div id="cannesSellingDiv">
          Sell Films to Cannes<br />

          <div v-for="(res, idx) in [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI]" :key="idx"
            @click="clickedMoveImgToSell(res)" onselectstart="return false;" class="cannesMovieResDiv"
            :class="{ selectableRes: store.context.availableResources[res] > 0 }">
            <img :src="view.getImage('res' + String(res))" />
            <div class="singleResNumDivCns">{{ store.context.availableResources[res] }}</div>
          </div>

          <!--  <img v-for="(res, idx) in [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI]" :key="idx"
            :src="view.getImage('res' + String(res))" class="cannesMovieResImg" @click="clickedMoveImgToSell(res)"
            :class="{ 'selectableRes': store.context.availableResources[res] > 0 }" />-->
        </div>
        <div id="cannesSummaryDiv">
          Selling Summary<br />
          <div v-for="(res, idx) in [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI]" :key="idx">
            <img :src="view.getImage('res' + String(res))" class="movieSellSummaryImg" />
            x {{ store.context.sellingSummary[idx] }} : Total €
            {{ store.context.sellingSummary[idx] * store.moviePrices[idx] }} M
          </div>
          Grand Total: €
          {{
            store.context.sellingSummary[0] * store.moviePrices[0] +
            store.context.sellingSummary[1] * store.moviePrices[1] +
            store.context.sellingSummary[2] * store.moviePrices[2]
          }}
        </div>
        <div id="cannesButtonsDiv">
          Confirm Sales<br />
          <button class="actionsLineButton" @click="localSellMovies">Sell Movies</button><br />
          <button class="actionsLineButton" @click="cancelSales">Cancel</button>
        </div>
      </div>

      <!-- PIRATE SALES -->
      <div v-if="store.context.action === rf.ACT_PIRATE" id="filmCriticDiv">
        Select a pre-release to pirate<br />
        <span v-if="afterPirateResult() === 0">You are in both parties. You can pirate as much as you like<br />
          The pirate ship will switch between parties after each sale<br /></span>
        <span v-else-if="afterPirateResult() === 1">You are not in the other party. You can pirate one movie<br />
          After you pirate a movie, the pirate ship will move to the other party<br /></span>
        <span v-else-if="afterPirateResult() === 10">You are in all parties. You can pirate as much as you like<br />
          The next player in turn order will select the final destination for the pirates
          <br /></span>
        <span v-else-if="afterPirateResult() === 11">You are not in all parties. You can pirate one movie<br />
          The next player in turn order will select the new destination for the pirates
          <br /></span>

        <div v-for="(res, idx) in [rf.RES_SCRIPT, rf.RES_ACTRESS, rf.RES_SFX]" :key="idx" @click="clickedPirateRes(res)"
          onselectstart="return false;" class="resImgDiv"
          :class="{ selectableRes: store.context.availableResources[res] > 0 }">
          <img :src="view.getImage('res' + String(res))" />
          <div class="singleResNumDivPirate">{{ store.context.availableResources[res] }}</div>
        </div>

        <br /><button @click="cancelPirate" class="actionsLineButton lessMargins">Cancel</button>
        <button @click="finishPirate" v-if="store.context.pirateActionsUsed > 0" class="actionsLineButton lessMargins">
          Finish Pirating
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lessMargins {
  margin-top: 2px !important;
  margin-bottom: 0px !important;
}

#filmCriticDiv {
  font-weight: bolder;
}

#cannesSellingContainer {
  font-weight: bolder;
}

#cannesSellingDiv {
  display: inline-block;
}

#cannesButtonsDiv,
#cannesSummaryDiv {
  display: inline-block;
  vertical-align: top;
  margin-left: 10px;
}

.movieSellSummaryImg {
  border: 1px solid black;
  height: 40px;
  width: 28px;
  vertical-align: middle;
}

.movieResImg {
  height: 125px;
  width: 80px;
  border: 2px solid black;
  margin-right: 2px;
}

.movieResImg:hover {
  border-color: yellow;
}

.resImgDiv {
  height: 50px;
  width: 50px;
  border: 2px solid black;
  margin-right: 2px;
  opacity: 0.3;
  position: relative;
  display: inline-block;
}

.resImgDiv img {
  width: 100%;
  height: 100%;
}

.singleResNumDivPirate {
  position: absolute;
  font-size: 30px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-shadow:
    -1px -1px 0 #fff,
    1px -1px 0 #fff,
    -1px 1px 0 #fff,
    1px 1px 0 #fff;
}

.cannesMovieResDiv {
  display: inline-block;
  height: 125px;
  width: 80px;
  border: 2px solid black;
  margin-right: 2px;
  opacity: 0.3;
  position: relative;
}

.cannesMovieResDiv img {
  width: 100%;
  height: 100%;
}

.singleResNumDivCns {
  position: absolute;
  font-size: 60px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-shadow:
    -1px -1px 0 #fff,
    1px -1px 0 #fff,
    -1px 1px 0 #fff,
    1px 1px 0 #fff;
}

.selectableRes {
  opacity: 1;
}

.selectableRes:hover {
  border-color: yellow;
}

.newHexRotateDiv {
  position: absolute;
  bottom: 0px;
  z-index: 100;
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
  right: 0px;
}

.newHexStoreDiv {
  position: absolute;
  bottom: 0px;
  z-index: 100;
  width: fit-content;
  height: 22px;
  border: 1px solid black;
  box-sizing: border-box;
  left: 36px;
  /* 150 - 78 /2    */
}

.newHexStoreDiv button {
  margin: 0px !important;
  padding-top: 0px !important;
  padding-bottom: 0px !important;
}

#hexOptionDiv {
  margin: auto;
  width: fit-content;
}

.newSingleHexDiv {
  position: relative;
  display: inline-block;
  margin: 0px;
}

.newSingleHexagon {
  width: 150px;
  margin: 0px;
}

.newSingleHexagon polygon {
  stroke: black;
  stroke-width: 30px;
  fill-opacity: 0.3;
}

.selectableHex {
  fill-opacity: 1 !important;
}

.selectableHex:hover {
  stroke: yellow;
}

.lightGreen {
  stroke: lightgreen !important;
}

#wholeArea {
  margin: 0;
  height: 100%;
}

#boxOfficeDiv {
  position: relative;
  background-color: brown;
  margin-left: auto;
  margin-right: auto;
  height: 90px;
  width: 411px;
  margin-top: 5px;
}

#boxOfficeImg {
  width: 100%;
  height: 100%;
}

.moviePriceImg {
  position: absolute;
  height: 46px;
  width: 30px;
  border: 2px solid black;
  transition-property: top, left;
  transition-duration: 700ms;
  transition-timing-function: ease;
}

#hexPiles {
  display: flex;
  margin-left: auto;
  margin-right: auto;
  width: fit-content;
}

.hexagonPile {
  width: 75px;
  height: 75px;
  margin: auto;
  font-size: 50px;
  font-weight: bolder;
}

.pile {
  text-align: center;
}

#remainingCigarsDiv {
  display: inline-block;
  font-size: 30px;
  font-weight: bolder;
  height: fit-content;
  transform: translate(-0%, 50%);
}

#remainingCigarsImg {
  width: 115px;
  height: 25px;
  vertical-align: middle;
}

.errorPopup {
  position: fixed;
  background-color: red;
  color: white;
  padding: 10px;
  border-radius: 5px;
  opacity: 1;
  z-index: 2000;
}

.fadeOut-enter-active,
.fadeOut-leave-active {
  transition: opacity 0.5s ease-in-out;
}

.fadeOut-enter,
.fadeOut-leave-active {
  opacity: 0;
}
</style>
