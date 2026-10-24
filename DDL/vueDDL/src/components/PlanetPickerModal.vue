<script setup>
import { computed } from "vue"
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import * as controller from "../js/DDLcontroller.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

const setupPlayer = computed(() => rules.currentSetupPlayer(store))
const visible = computed(() => store.viewSettings.showPlanetPicker && store.gameflow.phase === rf.PHASE_SETUP && store.gameflow.setup.stage === rf.TURN_SETUP_PLANET)
const isMine = computed(() => (personal.trainingGame ? setupPlayer.value >= 0 : setupPlayer.value === personal.pov))
const startPlanets = computed(() =>
	rf.PLANETS.filter((p) => p.start).map((planet) => ({
		planet,
		taken: store.players.some((player) => player.ship.node === "P" + planet.id),
	}))
)

async function choose(planetId) {
	await controller.submitStartingPlanet(planetId)
}
</script>

<template>
	<div v-if="visible" class="modalOverlay">
		<div class="modalBox">
			<h2>{{ $t("planetPicker.title") }}</h2>
			<p v-if="!isMine">{{ $t("planetPicker.waiting", { player: setupPlayer >= 0 ? store.players[setupPlayer].displayName : $t("common.setup") }) }}</p>
			<template v-else>
				<p>{{ $t("planetPicker.intro") }}</p>
				<div class="planetGrid">
					<button v-for="entry in startPlanets" :key="entry.planet.id" class="planetButton" :disabled="entry.taken" @click="choose(entry.planet.id)">
						<span class="dot" :class="{ taken: entry.taken }"></span>
						<b>{{ entry.planet.name }}</b>
						<span class="takenText" v-if="entry.taken">{{ $t("planetPicker.taken") }}</span>
					</button>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.modalOverlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 5000; pointer-events: none; }
.modalBox { background: #fffdf3; border: 3px solid #7a5b19; border-radius: 8px; padding: 18px; width: 560px; max-width: 90vw; text-align: center; pointer-events: auto; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
.planetGrid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 10px; }
.planetButton { width: 150px; border: 2px solid #1d5f8a; border-radius: 6px; background: #e9f7ff; padding: 8px; cursor: pointer; }
.planetButton:disabled { opacity: 0.45; cursor: default; }
.dot { display: block; width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #8fe2ff, #31a8e8 60%, #156fa5); margin: 0 auto 4px auto; border: 2px solid #0e5c8d; }
.dot.taken { filter: grayscale(1); }
.takenText { display: block; font-size: 10px; color: #a33; }
</style>
