<script setup>
// Map setup data for scenarios: RM = recommended module starting options, JS = &c Jumpstart piles (pile index = home tile choice order)
import * as view from "../../js/RNBview"
import * as jumpstart from "../../js/RNBjumpstart"
import * as rf from "../../js/RNBreference"
import { useModelStore } from "../../stores/RNBstore.js"
import { ref } from "vue"

const store = useModelStore()
const goodToAdd = ref(jumpstart.PILE_GOODS[0])


const JUMPSTART = 7

function setup() {
	return store.mapData.setupData
}

function toggleModule(value) {
	const rm = setup().RM ? [...setup().RM] : []
	const idx = rm.indexOf(value)
	if (idx === -1) rm.push(value)
	else rm.splice(idx, 1)
	if (rm.length > 0) setup().RM = rm.sort((a, b) => a - b)
	else delete setup().RM
	// Piles only exist with Jumpstart; unticking it drops them so they are never saved hidden
	if (value === JUMPSTART && idx !== -1) delete setup().JS
}

function addPile() {
	if (!setup().JS) setup().JS = []
	setup().JS.push([])
}

function removeLastPile() {
	setup().JS.pop()
	if (setup().JS.length === 0) delete setup().JS
}

function addGood(pileIdx) {
	setup().JS[pileIdx].push(goodToAdd.value)
}

function removeGood(pileIdx, goodIdx) {
	setup().JS[pileIdx].splice(goodIdx, 1)
}
</script>

<template>
	<div class="scenarioOptions">
		<div class="scenarioSection">
			<b>{{ $t("mapEditor.recommendedModules") }}</b>
			<div class="modules">
				<label v-for="[value, name, icon] in rf.MODULES" :key="value" class="moduleLabel" :class="{ on: (setup().RM || []).includes(value) }" :title="name">
					<input type="checkbox" :checked="(setup().RM || []).includes(value)" @change="toggleModule(value)" />
					<img :src="rf.moduleIconUrl(icon)" class="moduleIcon" :alt="name" />
					{{ name }}
				</label>
			</div>
		</div>
		<div v-if="(setup().RM || []).includes(JUMPSTART)" class="scenarioSection">
			<b>{{ $t("mapEditor.jumpstartPiles") }}</b>
			<div class="helpText">{{ $t("mapEditor.jumpstartPilesHelp") }}</div>
			<div>
				<img v-for="resType in jumpstart.PILE_GOODS" :key="resType" :src="view.getImage('res_' + resType)" class="good" :class="{ selected: goodToAdd === resType }" @click="goodToAdd = resType" />
			</div>
			<div v-for="(pile, pileIdx) in setup().JS || []" :key="pileIdx" class="pileRow" @click="addGood(pileIdx)">
				<b>{{ pileIdx + 1 }}:</b>
				<img v-for="(resType, goodIdx) in pile" :key="goodIdx" :src="view.getImage('res_' + resType)" class="good" :title="$t('mapEditor.clickToRemove')" @click.stop="removeGood(pileIdx, goodIdx)" />
				<span class="plus">+</span>
			</div>
			<div>
				<button class="actionsLineButton" @click="addPile">{{ $t("mapEditor.addPile") }}</button>
				<button v-if="setup().JS" class="actionsLineButton" @click="removeLastPile">{{ $t("mapEditor.removeLastPile") }}</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.scenarioOptions {
	margin: 10px auto;
	max-width: 700px;
	border: 2px solid black;
	padding: 4px 6px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	text-align: left;
}
.scenarioSection {
	display: flex;
	flex-direction: column;
}
.modules {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 2px 4px;
}
.moduleLabel {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 1px 6px;
	border-radius: 6px;
	cursor: pointer;
	white-space: nowrap;
}
.moduleLabel.on {
	background: #dff0d8;
}
.moduleIcon {
	width: 24px;
	height: 24px;
}
.helpText {
	color: #666;
	font-size: 0.9em;
}
.good {
	width: 28px;
	height: 28px;
	cursor: pointer;
	border: 2px solid transparent;
}
.good.selected {
	border-color: #d35400;
}
.pileRow {
	display: flex;
	align-items: center;
	gap: 4px;
	min-height: 36px;
	padding: 2px 6px;
	border: 1px dashed #999;
	border-radius: 6px;
	cursor: pointer;
}
.pileRow:hover {
	background: #f3f3f3;
}
.plus {
	margin-left: auto;
	font-weight: bold;
	color: #2e7d32;
}
</style>
