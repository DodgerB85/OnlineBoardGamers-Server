import fs from 'node:fs'
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
if (!globalThis.pako) (0,eval)(fs.readFileSync(new URL('../../../../Lobby/static/Lobby/common/pakoLib.js', import.meta.url), 'utf8'))
import { createPinia, setActivePinia } from "pinia"
import { createRenderer, h, nextTick } from "vue"

// Exercise compiled SFC templates and their event handlers/watchers in Node.
// Only the DOM-only animation wrapper is replaced; game components stay real.
vi.mock("vue", async (importOriginal) => {
	const vue = await importOriginal()
	return { ...vue, TransitionGroup: (_, { slots }) => slots.default?.() }
})

function element(type, text = "") {
	const classes = new Set()
	return { type, text, props: {}, children: [], parent: null, style: {}, classList: {
		add: (...names) => names.forEach((name) => classes.add(name)),
		remove: (...names) => names.forEach((name) => classes.delete(name)),
	} }
}
const renderer = createRenderer({
	createElement: element,
	createText: (text) => element("text", text),
	createComment: (text) => element("comment", text),
	setText: (node, text) => { node.text = text },
	setElementText: (node, text) => { node.text = text; node.children = [] },
	patchProp: (node, key, _, value) => { node.props[key] = value },
	insert(node, parent, anchor = null) {
		if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
		const index = anchor ? parent.children.indexOf(anchor) : -1
		parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
		node.parent = parent
	},
	remove(node) {
		if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
		node.parent = null
	},
	parentNode: (node) => node.parent,
	nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1],
})
function findAll(root, predicate) {
	return [...(predicate(root) ? [root] : []), ...root.children.flatMap((child) => findAll(child, predicate))]
}
function hasClass(node, name) { return String(node.props.class || "").split(" ").includes(name) }
let app, root, store, rf, model, map, rules, controller, useModelStore, usePersonalStore
let ActionAreaWorkingDay, MapHighlight
beforeAll(async () => {
	globalThis.window = { performance }
	globalThis.document = { addEventListener() {} }
	globalThis.alert = () => {}
	vi.stubGlobal("fetch", () => { throw new Error("Task8 must not access network services") })
	rf = await import("../js/FCMreference.js")
	model = await import("../js/FCMmodel.js")
	map = await import("../js/FCMmap.js")
	rules = await import("../js/FCMrules.js")
	controller = await import("../js/FCMcontroller.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../stores/FCMpersonal.js"))
	;({ default: ActionAreaWorkingDay } = await import("./ActionAreaWorkingDay.vue"))
	;({ default: MapHighlight } = await import("./MapHighlight.vue"))
})
afterEach(() => { app?.unmount(); app = null })
const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]
function freshGame() {
	const pinia = createPinia()
	setActivePinia(pinia)
	store = useModelStore()
	const personal = usePersonalStore()
	personal.pov = 0
	store.externalStartingOptions = [21,54]
	window.initData = {startingOptions:store.externalStartingOptions,playerNames:['P0','P1'],startingMap:STARTING_MAP}
	model.setInternalStartingOptions(store.externalStartingOptions)
	model.setupNewGame({ playerNames: ["P0", "P1"], startingMap: STARTING_MAP })
	store.mapData.tiles = map.expandMapToFullGrid(STARTING_MAP, 2)
	map.initCoords()
	store.players[0].employees = [rf.GURU,rf.KITCHEN_TRAINEE,rf.KITCHEN_TRAINEE]
	store.players[0].milestones = [rf.FIRST_LEMONADE_SOLD]
	store.players[1].employees = [rf.MARKETING_TRAINEE]
	store.availableMilestones = [18,19]
	store.gameflow.turn = 5
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_TRAINING
	store.gameflow.fullTurnOrder = [0, 1]
	store.gameflow.turnOrder = [0, 1]
	store.bank = 500
	const resto = rules.givePossiblePositionsForNewRestaurant(0, false)[0]
	model.addRestaurant_core(0, resto, 0, true)
	model.addRestaurant_core(1, rules.givePossiblePositionsForNewRestaurant(0, false)[0], 0, true)
	root = element("root")
	app = renderer.createApp({ render: () => [h(ActionAreaWorkingDay)] })
	app.use(pinia)
	app.config.globalProperties.$t = (key) => key
	app.mount(root)
	return store
}
async function click(node) {
	expect(node, "rendered clickable element").toBeDefined()
	let target = node
	while (target && !target.props.onClick) target = target.parent
	expect(target, "click target or its ancestor has a Vue click handler").toBeDefined()
	target.props.onClick({ target: node, stopPropagation() {}, preventDefault() {} })
	await nextTick()
}
function square(index) {
	return findAll(root, (n) => hasClass(n, "higlightSquareToClick") && n.props["data-index"] === index)[0]
}
function image(name) {
	return findAll(root, (n) => n.type === "img" && String(n.props.src).includes(name))[0]
}


function state() {
 return JSON.stringify({players:store.players, stock:store.availableEmployees, campaigns:store.campaigns, available:store.availableMarketingCampaigns, history:store.history, context:store.context, highlights:store.highlights})
}


function choices(employee) { return findAll(root,n=>hasClass(n,'cardChoiceDiv') && n.children.some(x=>x.props.alt===rf.employeeName(employee))) }
async function train(employee,target) { await click(choices(employee)[0]); await click(choices(target)[0]) }
it('SFC normal recruitment never offers 47 for the balanced game',async()=>{
 freshGame(); store.startingOptions.nightShift=true; store.availableEmployees[47]=1; store.gameflow.subphase=rf.SUBPHASE_HIRING
 await nextTick(); expect(choices(47)).toHaveLength(0)
})
it.each([
 ['ordinary cells can be rearranged',[6,-1,-1,13,-1,-1],[47,13,-1],6,1],
 ['other manager shared supply',[6,5,13,0,-1,-1,-1,-1],[47,5,13,0,-1],6,1],
 ['legal two-level on-duty chain',[5,13,0,-1,-1],[47,13,0],5,2],
])('real SFC and completion: %s',async(_,employees,expected,source,spent)=>{
 freshGame();store.startingOptions.nightShift=true;store.availableEmployees[47]=1;store.availableEmployees[6]=0
 store.players[0].employees=employees;store.players[0].ceoAction=rf.CEO_ACTION_COACH
 await nextTick();await train(source,47);expect(store.context.justTrained[0].spent).toBe(spent)
 controller.endWorkingDaySubphase();await nextTick();expect(store.players[0].employees).toEqual(expected)
})
it('insufficient capacity is hidden in the real target panel and a captured old click rejects before watchers',async()=>{
 freshGame();store.startingOptions.nightShift=true;store.availableEmployees[47]=1
 store.players[0].employees=[6,13,0,-1,-1,-1];store.players[0].ceoAction=rf.CEO_ACTION_COACH
 await nextTick();await click(choices(6)[0]);const old=choices(47)[0].props.onClick
 store.players[0].employees[3]=0
 const before=state();expect(old()).toBe(false);expect(state()).toBe(before)
 await nextTick();expect(choices(47)).toHaveLength(0)
})
it('real SFC undo restores the exact original manager layout, stock and on-duty allowance',async()=>{
 freshGame();store.startingOptions.nightShift=true;store.availableEmployees[47]=1
 store.players[0].employees=[6,13,0,-1,-1,-1];store.players[0].ceoAction=rf.CEO_ACTION_COACH
 const employees=[...store.players[0].employees],stock=[...store.availableEmployees]
 await nextTick();await train(6,47);await click(findAll(root,n=>hasClass(n,'trainedPair'))[0])
 expect(store.players[0].employees).toEqual(employees);expect(store.availableEmployees).toEqual(stock);expect(store.context.justTrained).toEqual([])
 expect(choices(6)).toHaveLength(1);await train(6,47);expect(store.context.justTrained).toHaveLength(1)
})
it('beach 6 training does not apply on-duty capacity shrink checks',async()=>{
 freshGame();store.startingOptions.nightShift=true;store.availableEmployees[47]=1
 store.players[0].employees=[rf.GURU,0,0,0];store.players[0].beach=[6]
 await nextTick();await train(6,47);expect(store.context.justTrained[0]).toMatchObject({from:6,to:47,spent:1,fromStructure:false})
})
it('SFC to completion keeps promoted manager in the CEO slot and everyone on duty',async()=>{
 freshGame(); store.startingOptions.nightShift=true; store.availableEmployees[47]=1
 store.players[0].employees=[6,rf.MARKETING_TRAINEE,0,-1,-1,-1]; store.players[0].ceoAction=rf.CEO_ACTION_COACH
 await nextTick(); await train(6,47)
 expect(store.context.justTrained).toHaveLength(1); expect(store.players[0].employees).not.toContain(47)
 controller.endWorkingDaySubphase(); await nextTick()
 expect(store.players[0].employees).toEqual([47,rf.MARKETING_TRAINEE,0])
 expect(store.history.some(e=>e[0]===rf.HIST_TRAIN && JSON.stringify(e[3])==='[56,47]')).toBe(true)
})
