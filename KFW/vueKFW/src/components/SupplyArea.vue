<script setup>
import * as rf from "../js/KFWreference"
import * as view from "../js/KFWview"
import * as controller from "../js/KFWcontroller"
import * as model from "../js/KFWmodel"
import * as village from "../js/KFWvillage"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

function localClickedContract(id) {
	const store = useModelStore()
	if (store.context.action !== rf.ACT_CHOOSE_CONTRACT) return
	model.chooseContract(id)
}

function canAffordExtension(extension_id) {
	if (!store.availableExtensions.includes(extension_id)) return false
	let extension = rf.ALL_EXTENSIONS.find((e) => e.id === extension_id)

	// Flipper II adds a free extension. So any available extension will be ok
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) return true

	// Extensions can only be added for the same colour that the tile already is
	if (store.context.selectedTile.coreMeepleColour !== rf.MEEPLE_NONE && store.context.selectedTile.coreMeepleColour !== extension.colour) return false

	// If you have boat 3a, all res are wild for upgrading. So change any res req to RES_ANY
	if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT3_A)) {
		for (let i = 0; i < extension.requiredResources.length; i++) {
			extension.requiredResources[i] = rf.RES_ANY
		}
	}
	let affordRet = model.resourceCheck(controller.currentPlayerIndex(), extension.requiredMeeples, extension.requiredSkillTiles, extension.requiredResources, store.context.selectedTile.id)
	if (affordRet !== 9) return false
	return true
}

function clickedExtension(id) {
	if (!canAffordExtension(id)) return
	let extension = rf.ALL_EXTENSIONS.find((e) => e.id === id)
	// If you have boat 3a, all res are wild for upgrading. So change any res req to RES_ANY
	if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT3_A)) {
		for (let i = 0; i < extension.requiredResources.length; i++) {
			extension.requiredResources[i] = rf.RES_ANY
		}
	}
	let tile = controller.currentPlayerObj().villageTiles.find((t) => t.id === store.context.selectedTile.id)
	// Now you have an affordable extension. So check if you can do it automatically
	// NB During final scoring, must be a free action from boat
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
		model.addExtensionToTile_core(controller.currentPlayerIndex(), store.context.selectedTile.id, id)
		model.addHistory(rf.HIST_FREE_EXTENSION, controller.currentPlayerIndex(), 0, [store.context.selectedTile.tileID[store.context.selectedTile.upgraded], id])
		controller.finishPreFinalAction()
	} else if (model.canAutoProcessResources(controller.currentPlayerIndex(), extension.requiredMeeples, extension.requiredSkillTiles, extension.requiredResources, store.context.selectedTile.id)) {
		model.addExtensionToTile(controller.currentPlayerIndex(), store.context.selectedTile.id, id)
	}
	// otherwise, you need to manually select the items
	else {
		store.context.itemsRequired.meeplesReq = [...extension.requiredMeeples]
		store.context.itemsRequired.skillsReq = [...extension.requiredSkillTiles]
		store.context.itemsRequired.resReq = [...extension.requiredResources]
		store.context.itemsRequired.resTile_id = tile.id
		store.context.action2 = store.context.action
		store.context.selectedExtension = id
		model.deductAutoItemPicks(store.context.selectedTile.id)
		store.context.action = rf.ACT_CHOOSE_ITEMS
	}
}
function getExtensionClass(id) {
	if (!store.availableExtensions.includes(id)) return "usedExtensions"
	if (!personal.canPlay()) return ""
	if (store.context.action !== rf.ACT_CHOOSE_EXTENSION) return ""
	if (!canAffordExtension(id)) return "unaffordableExtension"
	return "selectableExtension"
}

const computedAvailableExtensions = computed(() => {
	let res = [0, 0, 0, 0]
	for (let i = 0; i <= 4; i++) if (store.availableExtensions.includes(i)) res[0]++
	for (let i = 5; i <= 9; i++) if (store.availableExtensions.includes(i)) res[1]++
	for (let i = 10; i <= 14; i++) if (store.availableExtensions.includes(i)) res[2]++
	for (let i = 15; i <= 17; i++) if (store.availableExtensions.includes(i)) res[3]++

	return res
})

function clickedExtensionsButton() {
	store.turnStartHighlights.bidAreas.splice(0)
	store.turnStartHighlights.actionAreas.splice(0)
	if (store.context.action === rf.ACT_CHOOSE_EXTENSION) {
		store.context.action = rf.ACT_MOVE_AND_UPGRADE
		return
	}
	store.viewSettings.showFullExtensions = false
}
</script>

<template>
	<div class="wholeSupplyDiv">
		<b><u>Supply</u></b>
		<br />
		<div class="supplyDiv">
			<!-- TRAINING GAME TRAINING GAME TRAINING GAME-->
			<template v-if="personal.trainingGame || personal.adminDataInspection || store.gameflow.phase === rf.PHASE_GAME_OVER">
				<!-- MEEPLES-->
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_blue')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableMeeples[0] }}</div>
				</div>
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_red')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableMeeples[1] }}</div>
				</div>
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_yellow')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableMeeples[2] }}</div>
				</div>
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_green')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableMeeples[3] }}</div>
				</div>
				<br />
				<!-- GREEN MEEPLES-->
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_green')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableGreenMeeples }}</div>
				</div>
				<!-- SKILLS -->
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="skillsImg" :src="view.getImage('skillTile_0')" alt="Skill" />
					</div>
					<div class="numberDiv">{{ store.availableSkills[0] }}</div>
				</div>
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="skillsImg" :src="view.getImage('skillTile_1')" alt="Skill" />
					</div>
					<div class="numberDiv">{{ store.availableSkills[1] }}</div>
				</div>
				<div class="itemAndNumberDiv_sm">
					<div class="imgDiv">
						<img class="skillsImg" :src="view.getImage('skillTile_2')" alt="Skill" />
					</div>
					<div class="numberDiv">{{ store.availableSkills[2] }}</div>
				</div>
			</template>
			<!-- NORMAL GAME NORMAL GAME NORMAL GAME-->
			<template v-else>
				<!-- Meeple Count -->
				<div class="itemAndNumberDiv">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_any')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableMeeplesCount }}</div>
				</div>
				<!-- Skills Count -->
				<div class="itemAndNumberDiv">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('skillTile_any')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableSkillsCount }}</div>
				</div>

				<!-- Green Meeples -->
				<div class="itemAndNumberDiv">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('meeple_green')" alt="Meeple" />
					</div>
					<div class="numberDiv">{{ store.availableGreenMeeples }}</div>
				</div>
			</template>
		</div>
		<br />
		<template v-for="(resAmount, idx) in store.availableResources" :key="idx">
			<div class="resImgAndNumberDiv">
				<div class="resImgDiv">
					<img class="resImg" :src="view.getImage('res_' + String(idx))" alt="Res" />
				</div>
				<div class="resNumberDiv" :class="resAmount === 0 ? 'noMoreResNumer' : ''">{{ resAmount }}</div>
			</div>
		</template>
		<!-- Cabins NOT NEEDED AS 6 IN GAME AND MAX 6 USED -->
		<!--<div class="supplyDiv">
			<div class="itemAndNumberDiv">
				<div class="imgDiv">
					<img class="cabinImg" :src="view.getImage('cabin')" alt="Cabin" />
				</div>
				<div class="numberDiv">{{ store.availableCabins }}</div>
			</div>
		</div>
		<br />-->
		<!-- Contracts -->
		<div v-if="store.useMerchantsExpansion" class="supplyDiv">
			<div class="contractAndNumberDiv">
				<svg viewBox="77 131.5 55.5 34" class="contractSVG">
					<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage('c_back')" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
					<path :d="rf.CONTRACT_PATH_D" class="contractPath" :class="{ contractPathSeletable: store.context.action === rf.ACT_CHOOSE_CONTRACT }" @click="localClickedContract(-1)" />
				</svg>
				<div class="numberDiv">{{ store.hiddenContracts.length }}</div>
			</div>
			<template v-for="(contract_id, idx) in store.visibleContracts" :key="idx">
				<div class="contractAndNumberDiv">
					<svg viewBox="77 131.5 55.5 34" class="contractSVG">
						<image width="52.916668" height="31.75" :xlink:href="view.getImage(rf.ALL_CONTRACTS.find((x) => x.id === contract_id).gfx)" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
						<path :d="rf.CONTRACT_PATH_D" class="contractPath" :class="{ contractPathSeletable: store.context.action === rf.ACT_CHOOSE_CONTRACT }" @click="localClickedContract(contract_id)" />
					</svg>
				</div>
				<br v-if="idx % 2 === 0" />
			</template>
		</div>
		<!-- Extensions -->
		<template v-if="store.useMerchantsExpansion && !store.viewSettings.showFullExtensions">
			<br />
			<div class="supplyDiv">
				<div class="blankExtAndNumberDiv">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('e_blue')" alt="B-Ext" />
					</div>
					<div class="numberDiv">{{ computedAvailableExtensions[0] }}</div>
				</div>
			</div>
			<div class="supplyDiv">
				<div class="blankExtAndNumberDiv">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('e_red')" alt="B-Ext" />
					</div>
					<div class="numberDiv">{{ computedAvailableExtensions[1] }}</div>
				</div>
			</div>
			<div class="supplyDiv">
				<div class="blankExtAndNumberDiv">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('e_yellow')" alt="B-Ext" />
					</div>
					<div class="numberDiv">{{ computedAvailableExtensions[2] }}</div>
				</div>
			</div>
			<div class="supplyDiv">
				<div class="blankExtAndNumberDiv">
					<div class="imgDiv">
						<img class="meepleImg" :src="view.getImage('e_green')" alt="B-Ext" />
					</div>
					<div class="numberDiv">{{ computedAvailableExtensions[3] }}</div>
				</div>
			</div>
			<br />
			<button class="actionsLineButton" @click="store.viewSettings.showFullExtensions = true">Show Extensions</button>
		</template>
		<template v-else-if="store.useMerchantsExpansion && store.viewSettings.showFullExtensions">
			<div class="fullExtensionDiv">
				<template v-for="idx in [0, 1, 2, 3, 4]" :key="idx">
					<img @click="clickedExtension(idx)" class="extensionImg" :class="getExtensionClass(idx)" :src="view.getImage('e_b_0' + String(idx))" alt="Ext" />
					<img @click="clickedExtension(idx + 5)" class="extensionImg" :class="getExtensionClass(idx + 5)" :src="view.getImage('e_r_0' + String(idx + 5))" alt="Ext" />
					<img @click="clickedExtension(idx + 10)" class="extensionImg" :class="getExtensionClass(idx + 10)" :src="view.getImage('e_y_1' + String(idx))" alt="Ext" />
					<img @click="clickedExtension(idx + 15)" v-if="idx <= 2" class="extensionImg" :class="getExtensionClass(idx + 15)" :src="view.getImage('e_g_1' + String(idx + 5))" alt="Ext" />
					<br />
				</template>
				<button class="actionsLineButton" @click="clickedExtensionsButton">
					<span v-if="store.context.action === rf.ACT_CHOOSE_EXTENSION">Cancel Adding Extension</span>
					<span v-else>Hide Extensions</span>
				</button>
			</div>
		</template>
	</div>
</template>

<style scoped>
.fullExtensionDiv {
	text-align: left;
}
.extensionImg {
	width: 41px;
	height: 41px;
	box-sizing: border-box;
	margin-right: 1.5px;
	margin-left: 1.5px;
	margin-bottom: 5px;
	border: 2px solid black;
}

.usedExtensions {
	/*border: 2px solid red;*/
	opacity: 0.4;
}

.unaffordableExtension {
	border: 4px solid red;
}
.selectableExtension {
	border: 4px solid yellow;
}
.selectableExtension:hover {
	border: 4px solid lightgreen;
}

.wholeSupplyDiv {
	border: 2px solid black;
	width: fit-content;
	height: fit-content;
}
.supplyDiv {
	display: inline-block;
	margin-right: 5px;
}
.itemAndNumberDiv {
	display: inline-block;
	height: 50px;
	width: 50px;
	position: relative;
	margin-top: 5px;
}

.itemAndNumberDiv_sm {
	display: inline-block;
	height: 45px;
	width: 43px;
	position: relative;
	margin-top: 5px;
}
.contractAndNumberDiv {
	display: inline-block;
	height: 50px;
	width: 80px;
	position: relative;
	margin-right: 5px;
}
.blankExtAndNumberDiv {
	display: inline-block;
	height: 35px;
	width: 35px;
	position: relative;
	margin-right: 1.5px;
	margin-left: 1.5px;
}
.imgDiv {
	width: 100%;
	height: 100%;
}
.meepleImg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
	padding: 0px;
}

.skillsImg {
	width: 100%;
	height: 100%;
	padding: 0px;
	border: 2px solid black;
	box-sizing: border-box;
}

.cabinImg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(2px 0 0 white) drop-shadow(0 2px 0 white) drop-shadow(-2px 0 0 white) drop-shadow(0 -2px 0 white);
	padding: 0px;
}

.contractSVG {
	width: 100%;
}
.contractPath {
	fill: black;
	fill-opacity: 0;
	stroke: black;
	stroke-width: 2;
	stroke-linecap: butt;
	stroke-linejoin: miter;
	stroke-opacity: 1;
}
.contractPathSeletable {
	stroke: yellow;
}
.contractPathSeletable:hover {
	stroke: lightgreen;
}

.numberDiv {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	font-weight: bolder;
	font-size: 30px;
	text-shadow:
		-1px -1px 0 #fff,
		1px -1px 0 #fff,
		-1px 1px 0 #fff,
		1px 1px 0 #fff;
	pointer-events: none;
}

.resImgAndNumberDiv {
	display: inline-block;
	height: 50px;
	/*width: 50px;*/
	position: relative;
	margin-left: 5px;
	margin-right: 5px;
}
.resImgDiv {
	width: 100%;
	height: 100%;
}
.resImg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
	padding: 0px;
}

.resNumberDiv {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	font-weight: bolder;
	font-size: 40px;
	text-shadow:
		-1px -1px 0 #fff,
		1px -1px 0 #fff,
		-1px 1px 0 #fff,
		1px 1px 0 #fff;
	pointer-events: none;
}

.noMoreResNumer {
	color: red !important;
}
</style>
