<script setup>
import { useModelStore } from "../stores/model.js";
const model = useModelStore()

import { usePersonalStore } from "../stores/personal.js";
const personal = usePersonalStore()

function getScoreDiscPos(scoreSet) {
    if (personal.selectedBoard === 0) return [Math.max(model.refSize * 2788 / 400 - (scoreSet[0] * model.refSize * 154 / 400), model.refSize * 20 / 400), model.refSize * 21 / 400]
    else if (personal.selectedBoard === 1) {
        if (scoreSet[0] <= 0) return [model.refSize * 500 / 400, model.refSize * 49 / 400]
        if (scoreSet[0] === 1) return [model.refSize * 330 / 400, model.refSize * 60 / 400]
        if (scoreSet[0] === 2) return [model.refSize * 160 / 400, model.refSize * 53 / 400]
        if (scoreSet[0] === 3) return [model.refSize * 70 / 400, model.refSize * 207 / 400]
        if (scoreSet[0] === 4) return [model.refSize * 97 / 400, model.refSize * 396 / 400]
        if (scoreSet[0] === 5) return [model.refSize * 80 / 400, model.refSize * 602 / 400]
        if (scoreSet[0] === 6) return [model.refSize * 50 / 400, model.refSize * 824 / 400]
        if (scoreSet[0] === 7) return [model.refSize * 140 / 400, model.refSize * 1080 / 400]
        if (scoreSet[0] === 8) return [model.refSize * 60 / 400, model.refSize * 1337 / 400]
        if (scoreSet[0] === 9) return [model.refSize * 110 / 400, model.refSize * 1516 / 400]
        if (scoreSet[0] === 10) return [model.refSize * 60 / 400, model.refSize * 1759 / 400]
        if (scoreSet[0] === 11) return [model.refSize * 100 / 400, model.refSize * 2040 / 400]
        if (scoreSet[0] === 12) return [model.refSize * 40 / 400, model.refSize * 2241 / 400]
        if (scoreSet[0] === 13) return [model.refSize * 120 / 400, model.refSize * 2366 / 400]
        if (scoreSet[0] === 14) return [model.refSize * 50 / 400, model.refSize * 2546 / 400]
        if (scoreSet[0] === 15) return [model.refSize * 80 / 400, model.refSize * 2720 / 400]
        if (scoreSet[0] === 16) return [model.refSize * 45 / 400, model.refSize * 2923 / 400]
        if (scoreSet[0] === 17) return [model.refSize * 55 / 400, model.refSize * 3094 / 400]
        if (scoreSet[0] === 18) return [model.refSize * 245 / 400, model.refSize * 3089 / 400]
        if (scoreSet[0] === 19) return [model.refSize * 410 / 400, model.refSize * 2983 / 400]
        if (scoreSet[0] >= 20) return [model.refSize * 650 / 400, model.refSize * 3063 / 400]
    }
    else if (personal.selectedBoard === 2) {
        if (scoreSet[0] <= 0) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 131.9 / 400), model.refSize * 93 / 400), model.refSize * 88 / 400]
        if (scoreSet[0] === 1) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 131.9 / 400), model.refSize * 93 / 400), model.refSize * 85 / 400]
        if (scoreSet[0] === 2) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 131.9 / 400), model.refSize * 93 / 400), model.refSize * 83 / 400]
        if (scoreSet[0] === 3) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 131.9 / 400), model.refSize * 93 / 400), model.refSize * 82 / 400]
        if (scoreSet[0] === 4) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 131.9 / 400), model.refSize * 93 / 400), model.refSize * 81 / 400]
        if (scoreSet[0] === 5) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 131.9 / 400), model.refSize * 93 / 400), model.refSize * 81 / 400]
        if (scoreSet[0] === 6) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.2 / 400), model.refSize * 93 / 400), model.refSize * 81 / 400]
        if (scoreSet[0] === 7) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.2 / 400), model.refSize * 93 / 400), model.refSize * 81 / 400]
        if (scoreSet[0] === 8) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.3 / 400), model.refSize * 93 / 400), model.refSize * 82 / 400]
        if (scoreSet[0] === 9) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.3 / 400), model.refSize * 93 / 400), model.refSize * 83 / 400]
        if (scoreSet[0] === 10) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 84 / 400]
        if (scoreSet[0] === 11) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 84 / 400]
        if (scoreSet[0] === 12) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 84 / 400]
        if (scoreSet[0] === 13) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 83 / 400]
        if (scoreSet[0] === 14) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 83 / 400]
        if (scoreSet[0] === 15) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 84 / 400]
        if (scoreSet[0] === 16) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 86 / 400]
        if (scoreSet[0] === 17) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 86 / 400]
        if (scoreSet[0] === 18) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.4 / 400), model.refSize * 93 / 400), model.refSize * 87 / 400]
        if (scoreSet[0] === 19) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.3 / 400), model.refSize * 93 / 400), model.refSize * 88 / 400]
        if (scoreSet[0] >= 20) return [Math.max(model.refSize * 2733 / 400 - (scoreSet[0] * model.refSize * 132.8 / 400), model.refSize * 88 / 400), model.refSize * 88 / 400]
    }

}

function getDiscRadius() {
    if (personal.selectedBoard === 2) return 100
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
                    'top': 0 - (index * model.refSize * 20 / 400) + 'px',
                    width: model.refSize * getDiscRadius() / 400 + 'px',
                    height: model.refSize * getDiscRadius() / 400 + 'px',
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
