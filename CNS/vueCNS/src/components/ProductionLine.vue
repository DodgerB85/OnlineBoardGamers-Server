<script setup>
/** Produciton Line - Click here to convert your resources
 *  EG, 2 persons to an actress, etc.
 *  NOTE: - Only conversions in your netowrk are available
 *        - You obviously need enough resources to do the action
 * 
 */
import * as view from '../js/CNSview'
import * as rf from '../js/CNSreference'
import * as map from '../js/CNSmap'
import * as model from '../js/CNSmodel'
import * as controller from '../js/CNScontroller'
import * as funcs from '../js/CNSfuncs'

import { useModelStore } from '../stores/CNSstore.js'
const store = useModelStore()

import { ref } from 'vue';
const showErrorPopup = ref(0);
const popupPosition = ref({ x: 0, y: 0 });

let errorInterval;

function clickedProductionColumn(prod) {
  if (!enoughResForProd(prod)) return
  store.context.action = rf.ACT_NONE
  model.cancelSellMovies()

  if (prod === rf.PROD_CANNES) store.context.action = rf.ACT_SELL_CANNES
  else if (prod === rf.PROD_FILM_CRITIC) store.context.action = rf.ACT_FILM_CRITIC
  else if (prod === rf.PROD_PIRATE) {
    map.setNeighbours()
    store.pirateResetData = funcs.exportModel(true)
    store.context.action = rf.ACT_PIRATE
  }
  else if (prod === rf.PROD_CIGAR) {
    if (controller.currentPlayerObj().links.length === 0) {
      popupPosition.value = { x: event.clientX, y: event.clientY - 60 };
      // Show the error popup
      showErrorPopup.value = 3;
      clearTimeout(errorInterval);
      errorInterval = setTimeout(() => {
        showErrorPopup.value = 0;
      }, 1000);
      return
    }
    store.clearHistoryHelpers()
    map.setNeighbours()
    if (store.oldBoysNetwork.length >= 10) {
      popupPosition.value = { x: event.clientX, y: event.clientY - 45 };
      // Show the error popup
      showErrorPopup.value = 2;

      clearTimeout(errorInterval);
      // Hide the error popup after 2 seconds
      errorInterval = setTimeout(() => {
        showErrorPopup.value = 0;
      }, 1000);
      return
    }
    map.setPlaceableLinks(controller.currentPlayerObj(), true)
    if (store.context.placeableLinks.length === 0) {
      // Calculate the position based on the mouse/touch event
      popupPosition.value = { x: event.clientX, y: event.clientY - 60 };

      // Show the error popup
      showErrorPopup.value = 1;

      clearTimeout(errorInterval);
      // Hide the error popup after 2 seconds
      errorInterval = setTimeout(() => {
        showErrorPopup.value = 0;
      }, 1000);
    }
    else {
      // 2 ppl removed when cigar placed
      store.context.action = rf.ACT_ADD_CIGAR
    }

  }
  else model.actionProd(prod)
}

function enoughResForProd(prod) {
  if (prod === rf.PROD_FILM_CRITIC && store.context.availableResources[rf.RES_BEER] >= 1) return true
  else if (prod === rf.PROD_CIGAR && store.context.availableResources[rf.RES_PEOPLE] >= 2) return true
  else if (prod === rf.PROD_COMPUTER && store.context.availableResources[rf.RES_CHIP] >= 1) return true
  else if (prod === rf.PROD_ACTRESS && store.context.availableResources[rf.RES_PEOPLE] >= 2) return true
  else if (prod === rf.PROD_SFX && store.context.availableResources[rf.RES_COMPUTER] >= 2) return true
  else if (prod === rf.PROD_SCRIPT && store.context.availableResources[rf.RES_COMPUTER] >= 1 && store.context.availableResources[rf.RES_BEER] >= 1) return true
  else if (prod === rf.PROD_MOVIE_ACTION && store.context.availableResources[rf.RES_ACTRESS] >= 1 && store.context.availableResources[rf.RES_SFX] >= 1) return true
  else if (prod === rf.PROD_MOVIE_GIRLIE && store.context.availableResources[rf.RES_ACTRESS] >= 1 && store.context.availableResources[rf.RES_SCRIPT] >= 1) return true
  else if (prod === rf.PROD_MOVIE_SCIFI && store.context.availableResources[rf.RES_SFX] >= 1 && store.context.availableResources[rf.RES_SCRIPT] >= 1) return true
  else if (prod === rf.PROD_CANNES && (store.context.availableResources[rf.RES_MOVIE_ACTION] >= 1 || store.context.availableResources[rf.RES_MOVIE_GIRLIE] >= 1 || store.context.availableResources[rf.RES_MOVIE_SCIFI] >= 1)) return true

  else if (prod === rf.PROD_PIRATE && (store.context.availableResources[rf.RES_SCRIPT] >= 1 || store.context.availableResources[rf.RES_ACTRESS] >= 1 || store.context.availableResources[rf.RES_SFX] >= 1)) return true

  return false
}

</script>

<template>
  <template v-if="store.gameflow.phase === rf.PHASE_PRODUCTION && store.context.action !== rf.ACT_SELL_CANNES">
    <div id="productionLineDiv"
      v-if="store.context.availableProduction.length > 0 && store.context.action !== rf.ACT_PIRATE && store.context.action !== rf.ACT_CONFIRM_END_TURN">
      <transition name="fadeOut">
        <div class="errorPopup" v-if="showErrorPopup > 0"
          :style="{ top: popupPosition.y + 'px', left: popupPosition.x + 'px' }">
          <template v-if="showErrorPopup === 1">
            No Valid Positions<br />
            To Place Cigar
          </template>
          <template v-else-if="showErrorPopup === 2">
            No more Cigars
          </template>
          <template v-else-if="showErrorPopup === 3">
            No Player Links
          </template>
        </div>
      </transition>

      <div class="productionRow">
        <div class="APtextDiv">
          Available<br />Production:
        </div>

        <div v-for="(prod, idx) in store.context.availableProduction" :key="idx" class="productionColumn"
          @click="clickedProductionColumn(prod)" :class="{ 'selectable': enoughResForProd(prod) }">
          <!-- PRODUCTION INPUT -->
          <div class="productionInputDiv">
            <img v-for="(res, idx) in rf.getInputForProduction(prod)" :key="idx"
              :src="view.getImage('res' + String(res))" :class="{
                'stdResImg': ![rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res),
                'movieResImg': [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res)
              }" />
          </div>
          <div class="productionArrow">
          </div>
          <div class="productionOutputDiv">
            <img :src="view.getImage('res' + String(rf.getOutputForProduction(prod)))" :class="{
              'stdResImg': ![rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI, rf.RES_CIGAR, rf.RES_FILM_CRITIC, rf.RES_PIRATE].includes(rf.getOutputForProduction(prod)),
              'movieResImg': [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(rf.getOutputForProduction(prod)),
              'criticResImg': rf.getOutputForProduction(prod) === rf.RES_FILM_CRITIC,
              'pirateOutputImg': rf.getOutputForProduction(prod) === rf.RES_PIRATE
            }" />
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="store.context.availableProduction.length === 0 && store.context.action !== rf.ACT_CONFIRM_END_TURN"
      id="noProductionLineDiv">No Available Production</div>
  </template>

  <template v-else-if="store.gameflow.phase === rf.PHASE_NETWORK">
    <div id="productionLineDivNetwork" v-if="store.context.availableProduction.length > 0">


      <div class="productionRow">
        <div class="APtextDiv">
          Current<br />Production:
        </div>

        <div v-for="(prod, idx) in store.context.availableProduction" :key="idx" class="productionColumn">
          <!-- PRODUCTION INPUT -->
          <div class="productionInputDiv">
            <img v-for="(res, idx) in rf.getInputForProduction(prod)" :key="idx"
              :src="view.getImage('res' + String(res))" :class="{
                'stdResImg': ![rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res),
                'movieResImg': [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(res)
              }" />
          </div>
          <div class="productionArrow">
          </div>
          <div class="productionOutputDiv">
            <img :src="view.getImage('res' + String(rf.getOutputForProduction(prod)))" :class="{
              'stdResImg': ![rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI, rf.RES_CIGAR, rf.RES_FILM_CRITIC, rf.RES_PIRATE].includes(rf.getOutputForProduction(prod)),
              'movieResImg': [rf.RES_MOVIE_ACTION, rf.RES_MOVIE_GIRLIE, rf.RES_MOVIE_SCIFI].includes(rf.getOutputForProduction(prod)),
              'criticResImg': rf.getOutputForProduction(prod) === rf.RES_FILM_CRITIC,
              'pirateOutputImg': rf.getOutputForProduction(prod) === rf.RES_PIRATE
            }" />
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="store.context.availableProduction.length === 0 && store.context.action !== rf.ACT_CONFIRM_END_TURN"
      id="productionLineDivNetwork">No Current Production</div>
  </template>

</template>

<style scoped>
#productionLineDiv {
  width: 100%;
}

#productionLineDivNetwork {
  width: 100%;
  opacity: 0.5;
}



#noProductionLineDiv {
  width: 100%;
}

.APtextDiv {
  display: inline-block;
  font-weight: bolder;
  margin-right: 5px;
  height: fit-content;
  transform: translate(0%, 100%);
}

.productionColumn {
  display: flex;
  flex-direction: column;
  border: 2px solid black;
  margin-right: 2px;
}

.productionColumn img {
  opacity: 0.4;
}

.selectable img {
  opacity: 1;
}

.selectable:hover {
  border-color: yellow;
}

.productionRow {
  display: flex;
  margin: auto;
  width: fit-content;
}

.productionInputDiv {
  height: 54px;
  min-width: fit-content;
  white-space: nowrap;
}

.stdResImg {
  width: 50px;
  height: 50px;
  border: 2px solid black;
}

.pirateOutputImg {
  width: 50px;
  height: 50px;
}

.movieResImg {
  height: 50px;
  border: 2px solid black;
}

.criticResImg {
  width: 50px;
}

.productionInputDiv img:not(:last-child) {
  margin-right: 2px;
}

.productionArrow {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 20px;
  position: relative;
}

.productionArrow::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(0deg);
  width: 0;
  height: 0;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-top: 12px solid black;
}

.productionOutputDiv {
  height: 54px;
}

.errorPopup {
  position: fixed;
  background-color: red;
  color: white;
  padding: 10px;
  border-radius: 5px;
  opacity: 1;
  z-index: 9999;
}

.fadeOut-enter-active,
.fadeOut-leave-active {
  transition: opacity .5s ease-in-out;
}

.fadeOut-enter,
.fadeOut-leave-active {
  opacity: 0;
}
</style>