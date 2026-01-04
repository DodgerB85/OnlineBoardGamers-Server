<script setup>
/** Resource area - Resources Available to you are shown here
 * This is just a "dumb" display area. 
 * I don't think you would ever interact here,
 * it just shows you what resources you have available.
 * Resource use / conversion should happen in the ProductionLine
 */

import * as view from '../js/CNSview'
import * as rf from '../js/CNSreference'
import * as model from '../js/CNSmodel'


import { useModelStore } from '../stores/CNSstore.js'
const store = useModelStore()

function clickedRes(index) {
  if (store.gameflow.phase !== rf.PHASE_STORE_RES) return
  store.context.availableResources[index]--
  let totalRes = store.context.availableResources.reduce((acc, curr) => acc + curr, 0);
  if ((!store.useExpansion && totalRes <= 5) || totalRes <= 3) {
    model.storeResources()
    store.context.action = rf.ACT_CONFIRM_END_TURN
  }
}

</script>

<template>
  <template v-if="store.gameflow.phase === rf.PHASE_NETWORK">
    <div id="ResourceAreaNetwork" v-if="store.context.availableResources.some(value => value !== 0)">
      <div class="ARtextDiv">
        New Resources<br />
        INCLUDING Stored Resources:
      </div>
      <template v-for="(amount, index) in store.context.availableResources" :key="index">
        <div v-if="amount !== 0" onselectstart="return false;" class="singleResDiv">
          <img class="singleResImg" :src="view.getImage('res' + String(index))" />
          <div class="singleResNumDiv">{{ amount }}</div>
        </div>
      </template>
    </div>
    <div v-else-if="store.context.action !== rf.ACT_CONFIRM_END_TURN" id="noResourceAreaNetwork">No New Resources</div>
  </template>

  <template v-else>
    <div id="ResourceArea" v-if="store.context.availableResources.some(value => value !== 0)">
      <div class="ARtextDiv">
        Available<br />Resources:
      </div>
      <template v-for="(amount, index) in store.context.availableResources" :key="index">
        <div v-if="amount !== 0" @click="clickedRes(index)" onselectstart="return false;" class="singleResDiv"
          :class="{ 'selectable': store.gameflow.phase === rf.PHASE_STORE_RES }">
          <img class="singleResImg" :src="view.getImage('res' + String(index))" />
          <div class="singleResNumDiv">{{ amount }}</div>
        </div>
      </template>
    </div>
    <div v-else-if="store.context.action !== rf.ACT_CONFIRM_END_TURN" id="noResourceArea">No Available Resources</div>
  </template>
</template>

<style scoped>
#ResourceArea {
  width: 100%;
  height: 64px;
}

#ResourceAreaNetwork {
  width: 100%;
  height: 64px;
  opacity: 0.5;
}

#noResourceArea {
  width: 100%;
}

#noResourceAreaNetwork {
  width: 100%;
  opacity: 0.5;
}

.ARtextDiv {
  display: inline-block;
  font-weight: bolder;
  margin-right: 5px;
  height: fit-content;
  vertical-align: middle;
  transform: translate(0%, -50%);
}

.singleResDiv {
  position: relative;
  margin-top: 5px;
  margin-right: 5px;
  border: 2px solid black;
  display: inline-block;
  height: 50px;
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

.selectable {
  cursor: pointer;
}

.selectable:hover {
  border-color: yellow;
}
</style>