import { beforeEach, describe, expect, it } from "vitest"
import { createSSRApp } from "vue"
import { renderToString } from "vue/server-renderer"
import { createPinia, setActivePinia } from "pinia"
import MapArea from "./MapArea.vue"
import TradeModal from "./TradeModal.vue"
import i18n from "../i18n.js"
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import * as model from "../js/DDLmodel.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

let pinia
beforeEach(() => {
	pinia = createPinia()
	setActivePinia(pinia)
	model.applyState(rules.createInitialState({ playerNames: ["A", "B", "C"], seed: 42 }))
	const personal = usePersonalStore()
	personal.pov = 0
	personal.trainingGame = true
})

function renderMap() {
	return renderToString(createSSRApp(MapArea).use(pinia).use(i18n))
}

describe("map decisions", () => {
	it("shows road targets when movement cannot reach another planet", async () => {
		const store = useModelStore()
		store.players[0].ship.node = "P8"
		store.gameflow.phase = rf.PHASE_MAIN
		store.gameflow.turnType = rf.TURN_ACTION
		store.gameflow.movement.remaining = 1
		store.context.action = rf.ACT_MOVE
		const html = await renderMap()
		expect(html).toContain('data-node="')
		expect(html).toContain('role="button" tabindex="0"')
		expect(html).not.toContain("planet highlighted")
		usePersonalStore().pov = -99
		usePersonalStore().trainingGame = false
		expect(await renderMap()).not.toContain('data-node="')
	})

	it("offers only the top consumer tile in each column during exploration", async () => {
		const store = useModelStore()
		store.gameflow.phase = rf.PHASE_MAIN
		store.gameflow.turnType = rf.TURN_ACTION
		store.gameflow.pendingExplore = { player: 0, planetId: 0 }
		store.players[0].ship.node = "P0"
		let html = await renderMap()
		expect(html.match(/class="cardTarget"/g)).toHaveLength(2)
		expect(html).toContain('data-column="0"')
		expect(html).toContain('data-column="1"')
		usePersonalStore().pov = -99
		usePersonalStore().trainingGame = false
		html = await renderMap()
		expect(html).not.toContain('class="cardTarget"')
	})

	it("highlights unoccupied starting planets without showing a picker", async () => {
		const store = useModelStore()
		store.gameflow.setup.stage = rf.TURN_SETUP_PLANET
		store.players[1].ship.node = "P8"
		const html = await renderMap()
		expect(html.match(/startPlanet highlighted/g)).toHaveLength(4)
		expect(html).not.toContain("modalOverlay")
	})
	it("opens trade goods for the partner already selected in the action panel", async () => {
		const store = useModelStore()
		store.players[0].ship.node = "P8"
		store.players[1].ship.node = "P8"
		store.players[0].goods = [0]
		store.players[1].goods = [1]
		store.context.selectedTradePlayer = 1
		store.viewSettings.showTrade = true
		const html = await renderToString(createSSRApp(TradeModal).use(pinia).use(i18n))
		expect(html).toContain('class="tradeColumns"')
		expect(html).toContain("Plastic Beads")
	})

	it("offers pathway travel on the entrance arrow at the acting ship", async () => {
		const store = useModelStore()
		store.gameflow.phase = rf.PHASE_MAIN
		store.gameflow.turnType = rf.TURN_ACTION
		store.players[0].ship.node = "P8"
		store.players[0].pathways = { placed: true, in: 8, out: 0 }
		rules.planetState(store, 8).pathways = [{ owner: 0, dir: "in" }]
		rules.planetState(store, 0).pathways = [{ owner: 0, dir: "out" }]
		const html = await renderMap()
		const entrance = html.match(/<button[^>]*aria-label="Use pathway"[^>]*>/)[0]
		const exit = html.match(/<button[^>]*aria-label="Exit planet"[^>]*>/)[0]
		expect(entrance).toContain("pathwayMarker")
		expect(entrance).not.toContain("disabled")
		expect(exit).toContain("disabled")
	})

})
