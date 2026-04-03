<script setup>
import { useModelStore } from "../stores/BUSstore.js";
const store = useModelStore()
import * as model from "../js/BUSmodel.js"
import * as rf from "../js/BUSreference.js"

import { usePersonalStore } from "../stores/BUSpersonal.js";
const personal = usePersonalStore()

function getScoreDiscPos(scoreSet) {
    if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) return [Math.max(store.refSize * 2788 / 400 - (scoreSet[0] * store.refSize * 154 / 400), store.refSize * 20 / 400), store.refSize * 21 / 400]
    else if (personal.selectedBoard === rf.BOARD_OG) {
        if (scoreSet[0] <= 0) return [store.refSize * 500 / 400, store.refSize * 49 / 400]
        if (scoreSet[0] === 1) return [store.refSize * 330 / 400, store.refSize * 60 / 400]
        if (scoreSet[0] === 2) return [store.refSize * 160 / 400, store.refSize * 53 / 400]
        if (scoreSet[0] === 3) return [store.refSize * 70 / 400, store.refSize * 207 / 400]
        if (scoreSet[0] === 4) return [store.refSize * 97 / 400, store.refSize * 396 / 400]
        if (scoreSet[0] === 5) return [store.refSize * 80 / 400, store.refSize * 602 / 400]
        if (scoreSet[0] === 6) return [store.refSize * 50 / 400, store.refSize * 824 / 400]
        if (scoreSet[0] === 7) return [store.refSize * 140 / 400, store.refSize * 1080 / 400]
        if (scoreSet[0] === 8) return [store.refSize * 60 / 400, store.refSize * 1337 / 400]
        if (scoreSet[0] === 9) return [store.refSize * 110 / 400, store.refSize * 1516 / 400]
        if (scoreSet[0] === 10) return [store.refSize * 60 / 400, store.refSize * 1759 / 400]
        if (scoreSet[0] === 11) return [store.refSize * 100 / 400, store.refSize * 2040 / 400]
        if (scoreSet[0] === 12) return [store.refSize * 40 / 400, store.refSize * 2241 / 400]
        if (scoreSet[0] === 13) return [store.refSize * 120 / 400, store.refSize * 2366 / 400]
        if (scoreSet[0] === 14) return [store.refSize * 50 / 400, store.refSize * 2546 / 400]
        if (scoreSet[0] === 15) return [store.refSize * 80 / 400, store.refSize * 2720 / 400]
        if (scoreSet[0] === 16) return [store.refSize * 45 / 400, store.refSize * 2923 / 400]
        if (scoreSet[0] === 17) return [store.refSize * 55 / 400, store.refSize * 3094 / 400]
        if (scoreSet[0] === 18) return [store.refSize * 245 / 400, store.refSize * 3089 / 400]
        if (scoreSet[0] === 19) return [store.refSize * 410 / 400, store.refSize * 2983 / 400]
        if (scoreSet[0] >= 20) return [store.refSize * 650 / 400, store.refSize * 3063 / 400]
    }
    else if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) {
        if (scoreSet[0] <= 0) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 131.9 / 400), store.refSize * 93 / 400), store.refSize * 88 / 400]
        if (scoreSet[0] === 1) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 131.9 / 400), store.refSize * 93 / 400), store.refSize * 85 / 400]
        if (scoreSet[0] === 2) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 131.9 / 400), store.refSize * 93 / 400), store.refSize * 83 / 400]
        if (scoreSet[0] === 3) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 131.9 / 400), store.refSize * 93 / 400), store.refSize * 82 / 400]
        if (scoreSet[0] === 4) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 131.9 / 400), store.refSize * 93 / 400), store.refSize * 81 / 400]
        if (scoreSet[0] === 5) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 131.9 / 400), store.refSize * 93 / 400), store.refSize * 81 / 400]
        if (scoreSet[0] === 6) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.2 / 400), store.refSize * 93 / 400), store.refSize * 81 / 400]
        if (scoreSet[0] === 7) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.2 / 400), store.refSize * 93 / 400), store.refSize * 81 / 400]
        if (scoreSet[0] === 8) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.3 / 400), store.refSize * 93 / 400), store.refSize * 82 / 400]
        if (scoreSet[0] === 9) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.3 / 400), store.refSize * 93 / 400), store.refSize * 83 / 400]
        if (scoreSet[0] === 10) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 84 / 400]
        if (scoreSet[0] === 11) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 84 / 400]
        if (scoreSet[0] === 12) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 84 / 400]
        if (scoreSet[0] === 13) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 83 / 400]
        if (scoreSet[0] === 14) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 83 / 400]
        if (scoreSet[0] === 15) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 84 / 400]
        if (scoreSet[0] === 16) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 86 / 400]
        if (scoreSet[0] === 17) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 86 / 400]
        if (scoreSet[0] === 18) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.4 / 400), store.refSize * 93 / 400), store.refSize * 87 / 400]
        if (scoreSet[0] === 19) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.3 / 400), store.refSize * 93 / 400), store.refSize * 88 / 400]
        if (scoreSet[0] >= 20) return [Math.max(store.refSize * 2733 / 400 - (scoreSet[0] * store.refSize * 132.8 / 400), store.refSize * 88 / 400), store.refSize * 88 / 400]
    }

}

function getDiscRadius() {
    if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) return 100
    return 120
}

</script>

<template>
    <div v-for="scoreSet in model.getScoreObj()" v-bind:key="scoreSet[0]">
        <div class="score" :class="'scoreRow' + scoreSet[0]" :style="{
            'top': String(getScoreDiscPos(scoreSet)[0]) + 'px',
            'left': String(getScoreDiscPos(scoreSet)[1]) + 'px'
        }">
            <div class="scoreDisc" v-bind:class="'mainEntryPlayer' + personal.getCorrectedColour(colour)"
                v-for="(colour, index) in scoreSet[1]" v-bind:key="colour" :style="{
                    'top': 0 - (index * store.refSize * 20 / 400) + 'px',
                    width: store.refSize * getDiscRadius() / 400 + 'px',
                    height: store.refSize * getDiscRadius() / 400 + 'px',
                }">
            </div>
        </div>
    </div>
</template>

<style scoped>
.score {
    position: absolute;
    font-size: larger;
}

.scoreDisc {
    position: absolute;
    top: 0px;
    left: 0px;
    border: 1px solid black;
    border-radius: 100%;
}
</style>
