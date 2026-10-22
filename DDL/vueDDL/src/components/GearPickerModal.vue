<script setup>
import { computed, ref } from "vue"
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import * as controller from "../js/DDLcontroller.js"
import * as view from "../js/DDLview.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

const setupPlayer = computed(() => rules.currentSetupPlayer(store))
const visible = computed(() => store.viewSettings.showGearPicker && store.gameflow.phase === rf.PHASE_SETUP && store.gameflow.setup.stage === rf.TURN_SETUP_GEAR)
const isMine = computed(() => personal.trainingGame ? setupPlayer.value >= 0 : setupPlayer.value === personal.pov)
const selected = ref([])

function toggle(key) {
	if (!isMine.value) return
	const idx = selected.value.indexOf(key)
	if (idx === -1) {
		if (selected.value.length < 3) selected.value.push(key)
	} else selected.value.splice(idx, 1)
}

async function submit() {
	if (selected.value.length !== 3) return
	await controller.submitGear([...selected.value])
	selected.value = []
}
</script>

<template>
	<div v-if="visible" class="modalOverlay">
		<div class="modalBox">
			<h2>{{ $t("gearPicker.title") }}</h2>
			<p v-if="!isMine">{{ $t("gearPicker.waiting", { player: setupPlayer >= 0 ? store.players[setupPlayer].displayName : $t("common.setup") }) }}</p>
			<template v-else>
				<p>{{ $t("gearPicker.intro") }}</p>
				<div class="gearGrid">
					<button v-for="gear in rf.GEAR_TYPES" :key="gear.key" class="gearButton" :class="{ selected: selected.includes(gear.key) }" @click="toggle(gear.key)">
						<b>{{ rf.gearName(gear.key) }}</b>
						<span class="gearDesc">{{ gear.key === "cargo" ? $t("gearPicker.cargoBonus") : $t("gearPicker.crew", { colour: view.energyLabel(rf.gearEnergyColour(gear.key)) }) }}</span>
						<span class="gearCount">{{ selected.filter((key) => key === gear.key).length }}</span>
					</button>
				</div>
				<p>{{ $t("gearPicker.selected", { count: selected.length }) }}</p>
				<button class="actionsLineButton" :disabled="selected.length !== 3" @click="submit">{{ $t("gearPicker.confirm") }}</button>
			</template>
		</div>
	</div>
</template>

<style scoped>
.modalOverlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 5000; }
.modalBox { background: #fffdf3; border: 3px solid #7a5b19; border-radius: 8px; padding: 18px; width: 520px; max-width: 90vw; text-align: center; }
.gearGrid { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 10px 0; }
.gearButton { width: 110px; min-height: 76px; border: 2px solid #999; border-radius: 6px; background: #f7fbff; cursor: pointer; position: relative; padding: 5px; }
.gearButton.selected { border-color: #126b2a; background: #dcffdc; }
.gearDesc { display: block; font-size: 11px; color: #555; margin-top: 3px; }
.gearCount { position: absolute; right: 4px; top: 2px; font-weight: bold; color: #126b2a; }
</style>
