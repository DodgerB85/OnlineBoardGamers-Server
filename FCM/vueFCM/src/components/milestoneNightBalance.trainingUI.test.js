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
	vi.stubGlobal("fetch", () => { throw new Error("Task4 must not access network services") })
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
it('hides the second on-duty card after a real training without consuming allowance while rendering',async()=>{
 freshGame(); await nextTick()
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(2)
 const supply=[...store.availableEmployees]
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 expect(store.context.justTrained).toHaveLength(1)
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(0)
 await nextTick()
 expect(store.context.justTrained).toHaveLength(1)
 expect(store.availableEmployees[rf.KITCHEN_TRAINEE]).toBe(supply[rf.KITCHEN_TRAINEE]+1)
})

it.each(['phase','player','turn','source','stock','points'])('clears only the new training selection when %s changes',async mode=>{
 freshGame(); await nextTick()
 store.context.mediaLineSecondCall=true
 const context=await import('../js/FCMcontext.js')
 context.setMarketingTraineeChoice(store.players[0],rf.ERRAND_BOY)
 await click(choices(rf.KITCHEN_TRAINEE)[1])
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:rf.KITCHEN_TRAINEE,origin:2})
 expect(store.context.selectedEmployeeToTrainData.sourceIndex).toBe(2)
 const ledger=JSON.stringify(store.context.justTrained)
 if(mode==='phase') store.gameflow.subphase=rf.SUBPHASE_MARKETING
 if(mode==='player') store.gameflow.turnOrder=[1,0]
 if(mode==='turn') store.gameflow.turn++
 if(mode==='source') store.players[0].employees[2]=rf.ERRAND_BOY
 if(mode==='stock') for(let i=0;i<store.availableEmployees.length;i++) store.availableEmployees[i]=0
 if(mode==='points') store.players[0].employees[0]=rf.BLANK_EMPLOYEE_SPACE
 await nextTick()
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:-1,origin:0})
 expect(store.context.mediaLineSecondCall).toBe(true)
 expect(context.marketingTraineeChoice(store.players[0])).toBe(rf.ERRAND_BOY)
 expect(JSON.stringify(store.context.justTrained)).toBe(ledger)
})

function button(key) { return findAll(root,n=>n.type==='button' && n.text===key)[0] }
it('cancels a selected training without spending ability, stock or the on-duty slot',async()=>{
 freshGame(); await nextTick()
 const supply=[...store.availableEmployees]
 await click(choices(rf.KITCHEN_TRAINEE)[1])
 await click(button('workingDay.neverMind'))
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:-1,origin:0})
 expect(store.availableEmployees).toEqual(supply)
 expect(store.context.justTrained).toEqual([])
 expect(rules.getTrainingPoints(0,store.context.justTrained).total).toBe(3)
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(2)
})

it('undo from the rendered ledger refunds exactly once including a repeated stale click',async()=>{
 freshGame(); await nextTick()
 const supply=[...store.availableEmployees]
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 const pair=findAll(root,n=>hasClass(n,'trainedPair'))[0]
 await click(pair)
 expect(store.availableEmployees).toEqual(supply)
 expect(store.context.justTrained).toEqual([])
 expect(rules.getTrainingPoints(0,store.context.justTrained).total).toBe(3)
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(2)
 const state=JSON.stringify({context:store.context,players:store.players,supply:store.availableEmployees})
 await click(pair)
 expect(JSON.stringify({context:store.context,players:store.players,supply:store.availableEmployees})).toBe(state)
})

it('uses source indices and rechecks a captured stale target through the real controller',async()=>{
 freshGame(); await nextTick()
 await click(choices(rf.KITCHEN_TRAINEE)[1])
 expect(store.context.selectedEmployeeToTrainData.sourceIndex).toBe(2)
 const target=choices(rf.BURGER_COOK)[0]
 store.players[0].employees[2]=rf.ERRAND_BOY
 const state=JSON.stringify({players:store.players,supply:store.availableEmployees,ledger:store.context.justTrained})
 // Invoke before watchers can hide the option: submission must reject itself.
 target.props.onClick()
 expect(JSON.stringify({players:store.players,supply:store.availableEmployees,ledger:store.context.justTrained})).toBe(state)
 await nextTick()
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:-1,origin:0})
})
it('keeps beach and train-from-hire available after using the on-duty allowance',async()=>{
 freshGame(); store.players[0].beach=[rf.KITCHEN_TRAINEE]; await nextTick()
 // Beach first, then the two on-duty copies.
 await click(choices(rf.KITCHEN_TRAINEE)[2]); await click(choices(rf.BURGER_COOK)[0])
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(1)
 await train(rf.KITCHEN_TRAINEE,rf.PIZZA_COOK)
 await click(button('workingDay.trainFromHiring'))
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:-1,origin:1})
 await click(choices(rf.CART_OPERATOR)[0])
 expect(store.context.justTrained.map(x=>x.fromStructure)).toEqual([true,false,false])
 expect(rules.getTrainingPoints(0,store.context.justTrained).total).toBe(0)
 expect(rules.getRemainingRecruitingPoints(0)).toBe(0)
 expect(button('workingDay.trainFromHiring')).toBeUndefined()
})
it.each([2,3])('renders a legal spent=%i chain as one on-duty employee and restores all ability on undo',async steps=>{
 freshGame(); store.players[0].employees=[steps===2?rf.COACH:rf.GURU,rf.ERRAND_BOY,rf.ERRAND_BOY]; await nextTick()
 const supply=[...store.availableEmployees]
 await train(rf.ERRAND_BOY,steps===2?rf.TRUCK_DRIVER:rf.ZEPPELIN_PILOT)
 expect(store.context.justTrained).toHaveLength(1)
 expect(store.context.justTrained[0].spent).toBe(steps)
 expect(choices(rf.ERRAND_BOY)).toHaveLength(0)
 await click(findAll(root,n=>hasClass(n,'trainedPair'))[0])
 expect(store.availableEmployees).toEqual(supply)
 expect(rules.getTrainingPoints(0,store.context.justTrained).total).toBe(steps)
 expect(choices(rf.ERRAND_BOY)).toHaveLength(2)
})
it.each(['flag','missing','old','use','short'])('keeps old multiple on-duty training for %s',async mode=>{
 freshGame()
 if(mode==='flag') store.startingOptions.milestoneNightBalance=false
 if(mode==='missing') delete store.startingOptions.milestoneNightBalance
 if(mode==='old') store.startingOptions.newMilestones=false
 if(mode==='use') store.startingOptions.useMilestones=false
 if(mode==='short') {store.startingOptions.shortGame=true;store.startingOptions.useMilestones=false}
 await nextTick()
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(1)
 await train(rf.KITCHEN_TRAINEE,rf.PIZZA_COOK)
 expect(store.context.justTrained.filter(x=>x.fromStructure)).toHaveLength(2)
})
it('keeps ordinary beach training without lemonade and original multi-level qualifications',async()=>{
 freshGame(); store.players[0].milestones=[]; store.players[0].employees=[rf.TRAINER,rf.TRAINER];store.players[0].beach=[rf.KITCHEN_TRAINEE];await nextTick()
 await click(choices(rf.KITCHEN_TRAINEE)[0])
 expect(choices(rf.BURGER_CHEF)).toHaveLength(0)
 await click(button('workingDay.neverMind'))
 store.players[0].employees=[rf.COACH]; await nextTick()
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_CHEF)
 expect(store.context.justTrained).toEqual([{from:rf.KITCHEN_TRAINEE,to:rf.BURGER_CHEF,spent:2,fromStructure:false}])
})
it('resets real training subphase restoring stock, source cards and training capacity',async()=>{
 freshGame(); controller.startPlayerTurn(true); await nextTick()
 const supply=[...store.availableEmployees], employees=[...store.players[0].employees]
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 await click(button('workingDay.resetTraining'))
 expect(store.context.justTrained).toEqual([])
 expect(store.availableEmployees).toEqual(supply)
 expect(store.players[0].employees).toEqual(employees)
 expect(rules.getTrainingPoints(0,store.context.justTrained).total).toBe(3)
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(2)
})
it('completes real training to the source areas rather than beaching the on-duty employee',async()=>{
 freshGame();store.players[0].beach=[rf.ERRAND_BOY];await nextTick()
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 await train(rf.ERRAND_BOY,rf.CART_OPERATOR)
 const supply=[...store.availableEmployees]
 await click(button('workingDay.finishTraining'))
 expect(store.gameflow.subphase).not.toBe(rf.SUBPHASE_TRAINING)
 expect(store.players[0].employees).toEqual([rf.GURU,rf.KITCHEN_TRAINEE,rf.BURGER_COOK])
 expect(store.players[0].beach).toEqual([rf.CART_OPERATOR])
 expect(store.availableEmployees).toEqual(supply)
 expect(store.history.find(e=>e[0]===rf.HIST_TRAIN)[3]).toEqual([rf.KITCHEN_TRAINEE+50,rf.BURGER_COOK,rf.ERRAND_BOY,rf.CART_OPERATOR])
})

it('restores the allowance on the next real cleanup/restructure/working-day transition',async()=>{
 freshGame(); await nextTick()
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 await click(button('workingDay.finishTraining'))
 const turn=store.gameflow.turn
 // Real phase driver includes dinner, cleanup and clearForNewTurn; never
 // emulate a next turn by mutating or emptying justTrained ourselves.
 for(let n=0; n<10 && store.gameflow.phase!==rf.PHASE_RESTRUCTURING;n++) await controller.endCurrentPhase()
 expect(store.gameflow.phase).toBe(rf.PHASE_RESTRUCTURING)
 expect(store.gameflow.turn).toBe(turn+1)
 const plyr=await import('../js/FCMplayer.js')
 plyr.setEmployeeInIndex(0,rf.GURU,0)
 plyr.setEmployeeInIndex(0,rf.KITCHEN_TRAINEE,1)
 await controller.endCurrentPhase()
 expect(store.gameflow.phase).toBe(rf.PHASE_TURN_ORDER)
 store.gameflow.newTurnOrder=[0,1]
 await controller.endCurrentPhase()
 controller.startPlayerTurn(false)
 controller.endWorkingDaySubphase()
 await nextTick()
 expect(store.gameflow.subphase).toBe(rf.SUBPHASE_TRAINING)
 expect(store.context.justTrained).toEqual([])
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(1)
 await train(rf.KITCHEN_TRAINEE,rf.PIZZA_COOK)
 expect(store.context.justTrained).toHaveLength(1)
 expect(store.context.justTrained[0].fromStructure).toBe(true)
})
it('whole-turn reset restores sources, stock, points and a fresh on-duty allowance',async()=>{
 freshGame();
 // Build a coherent inventory from the scenario's real owned cards, just as
 // a normal wire load does (the fixture seeded staff directly).
 const funcs=await import('../js/FCMfuncs.js')
 funcs.importFCMmodel(funcs.exportFCMmodel(false,false))
 controller.startPlayerTurn(false); controller.endWorkingDaySubphase(); await nextTick()
 const supply=[...store.availableEmployees], employees=[...store.players[0].employees]
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 await click(button('workingDay.resetWholeWorkingDay'))
 expect(store.availableEmployees).toEqual(supply)
 expect(store.players[0].employees).toEqual(employees)
 expect(store.gameflow.subphase).toBe(rf.SUBPHASE_HIRING)
 controller.endWorkingDaySubphase(); await nextTick()
 expect(store.context.justTrained).toEqual([])
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(2)
 expect(rules.getTrainingPoints(0,store.context.justTrained).total).toBe(3)
})
it('does not put historical multiple on-duty replay through the live guard',async()=>{
 freshGame(); await nextTick()
 const replay=await import('../js/FCMreplay.js')
 const payload=[rf.KITCHEN_TRAINEE+50,rf.BURGER_COOK,rf.KITCHEN_TRAINEE+50,rf.PIZZA_COOK]
 const supply=[...store.availableEmployees]
 replay.replayTrain(0,store.players[0],payload)
 await nextTick()
 expect(store.players[0].employees).toEqual([rf.GURU,rf.BURGER_COOK,rf.PIZZA_COOK])
 expect(store.availableEmployees[rf.KITCHEN_TRAINEE]).toBe(supply[rf.KITCHEN_TRAINEE]+2)
 expect(store.availableEmployees[rf.BURGER_COOK]).toBe(supply[rf.BURGER_COOK]-1)
 expect(store.availableEmployees[rf.PIZZA_COOK]).toBe(supply[rf.PIZZA_COOK]-1)
})

it('loads an old wire game in the same store without leaving the opt-in restriction behind',async()=>{
 freshGame()
 const funcs=await import('../js/FCMfuncs.js')
 const oldWire=funcs.exportFCMmodel(false,false)
 await nextTick(); await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(0)
 window.initData.startingOptions=[21]
 store.externalStartingOptions=[21]
 funcs.importFCMmodel(oldWire)
 controller.startPlayerTurn(false); controller.endWorkingDaySubphase(); await nextTick()
 expect(store.startingOptions.milestoneNightBalance).toBe(false)
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 await train(rf.KITCHEN_TRAINEE,rf.PIZZA_COOK)
 expect(store.context.justTrained.filter(x=>x.fromStructure)).toHaveLength(2)
})
it('does not confuse an owned card of the trained-to ID with the already trained employee',async()=>{
 freshGame(); store.players[0].employees.push(rf.BURGER_COOK);await nextTick()
 await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 expect(choices(rf.BURGER_COOK)).toHaveLength(0)
 expect(choices(rf.KITCHEN_TRAINEE)).toHaveLength(0)
})
it('renders only stocked same-color targets and rechecks a stale confirmation after cancellation',async()=>{
 freshGame();store.availableEmployees[rf.PIZZA_COOK]=0; await nextTick()
 await click(choices(rf.KITCHEN_TRAINEE)[0])
 expect(choices(rf.PIZZA_COOK)).toHaveLength(0)
 expect(choices(rf.MANAGEMENT_TRAINEE)).toHaveLength(0)
 const target=choices(rf.BURGER_COOK)[0]
 await click(button('workingDay.neverMind'))
 const before=JSON.stringify({players:store.players,supply:store.availableEmployees,context:store.context})
 target.props.onClick()
 expect(JSON.stringify({players:store.players,supply:store.availableEmployees,context:store.context})).toBe(before)
})

it('rejects a stale undo click after completeTraining has committed the replacement',async()=>{
 freshGame(); await nextTick(); await train(rf.KITCHEN_TRAINEE,rf.BURGER_COOK)
 const pair=findAll(root,n=>hasClass(n,'trainedPair'))[0]
 await click(button('workingDay.finishTraining'))
 const before=JSON.stringify({players:store.players,supply:store.availableEmployees,context:store.context,history:store.history})
 await click(pair)
 expect(JSON.stringify({players:store.players,supply:store.availableEmployees,context:store.context,history:store.history})).toBe(before)
})

it('keeps the source index a transient hint rather than adding it to wire or whole-model context',async()=>{
 freshGame();await nextTick();await click(choices(rf.KITCHEN_TRAINEE)[1])
 expect(store.context.selectedEmployeeToTrainData.sourceIndex).toBe(2)
 const funcs=await import('../js/FCMfuncs.js')
 expect(JSON.stringify(store.context.selectedEmployeeToTrainData)).toBe(JSON.stringify({employee:rf.KITCHEN_TRAINEE,origin:2}))
 expect(JSON.stringify(funcs.decompressData(funcs.exportFCMmodel(false,true)))).not.toContain('sourceIndex')
 expect(JSON.stringify(funcs.simpleExportWholeFCMmodel(true))).not.toContain('sourceIndex')
})


it.each(['player','turn'])('fix1: rejects a captured target before and after watcher flush on %s change',async mode=>{
 freshGame();
 store.players[1].employees=[rf.GURU,rf.KITCHEN_TRAINEE,rf.KITCHEN_TRAINEE]
 store.players[1].milestones=[rf.FIRST_LEMONADE_SOLD]
 usePersonalStore().trainingGame=true
 await nextTick(); await click(choices(rf.KITCHEN_TRAINEE)[1])
 const target=choices(rf.BURGER_COOK)[0].props.onClick
 if(mode==='player') store.gameflow.turnOrder=[1,0]
 else store.gameflow.turn++
 const snapshot=()=>JSON.stringify({players:store.players,stock:store.availableEmployees,ledger:store.context.justTrained,history:store.history})
 const before=snapshot()
 target()
 expect(snapshot()).toBe(before)
 await nextTick(); target()
 expect(snapshot()).toBe(before)
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:-1,origin:0})
})


it('fix1: replacing a live selection revokes the old controller capability',async()=>{
 freshGame(); await nextTick()
 const ctx=await import('../js/FCMcontext.js')
 const old=ctx.bindTrainingSelection({employee:rf.KITCHEN_TRAINEE,origin:2,sourceIndex:2})
 ctx.bindTrainingSelection({employee:rf.KITCHEN_TRAINEE,origin:2,sourceIndex:1})
 store.context.selectedEmployeeToTrainData=old
 const before=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1,old)).toBe(false)
 expect(state()).toBe(before)
})


it.each([false,true])('fix1: an old rendered target cannot survive an old-mode wire import (context=%s)',async includeContext=>{
 freshGame(); await nextTick()
 const funcs=await import('../js/FCMfuncs.js')
 const wire=funcs.exportFCMmodel(false,includeContext)
 await click(choices(rf.KITCHEN_TRAINEE)[1])
 const target=choices(rf.BURGER_COOK)[0].props.onClick
 window.initData.startingOptions=[21];store.externalStartingOptions=[21]
 funcs.importFCMmodel(wire)
 expect(store.startingOptions.milestoneNightBalance).toBe(false)
 const before=state()
 target()
 expect(state()).toBe(before)
 await nextTick();target()
 expect(state()).toBe(before)
})


it.each(['player','turn','phase'])('fix1: direct controller submission rejects stale %s ownership without UI/watchers',async mode=>{
 freshGame(); await nextTick()
 store.players[1].employees=[rf.GURU,rf.KITCHEN_TRAINEE,rf.KITCHEN_TRAINEE]
 store.players[1].milestones=[rf.FIRST_LEMONADE_SOLD]
 usePersonalStore().trainingGame=true
 const ctx=await import('../js/FCMcontext.js')
 const selection=ctx.bindTrainingSelection({employee:rf.KITCHEN_TRAINEE,origin:2,sourceIndex:2})
 const sameContext=store.context
 if(mode==='player') store.gameflow.turnOrder=[1,0]
 if(mode==='turn') store.gameflow.turn++
 if(mode==='phase') store.gameflow.subphase=rf.SUBPHASE_HIRING
 expect(store.context).toBe(sameContext)
 const before=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1,selection)).toBe(false)
 expect(state()).toBe(before)
 expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false)
 expect(state()).toBe(before)
})
it('fix1: an old target cannot adopt a newer selection in the same owner and turn',async()=>{
 freshGame();await nextTick();await click(choices(rf.KITCHEN_TRAINEE)[1])
 const stale=choices(rf.BURGER_COOK)[0].props.onClick
 await click(button('workingDay.neverMind'))
 await click(choices(rf.KITCHEN_TRAINEE)[0])
 const before=state()
 stale();expect(state()).toBe(before)
 await click(choices(rf.PIZZA_COOK)[0])
 expect(store.context.justTrained).toEqual([{from:rf.KITCHEN_TRAINEE,to:rf.PIZZA_COOK,spent:1,fromStructure:true}])
})
it.each(['player','turn'])('fix1: a fresh selection after a normal %s switch remains legal in hotseat',async mode=>{
 freshGame();usePersonalStore().trainingGame=true
 store.players[1].employees=[rf.GURU,rf.KITCHEN_TRAINEE,rf.KITCHEN_TRAINEE]
 store.players[1].milestones=[rf.FIRST_LEMONADE_SOLD]
 await nextTick();await click(choices(rf.KITCHEN_TRAINEE)[1])
 const stale=choices(rf.BURGER_COOK)[0].props.onClick
 if(mode==='player') store.gameflow.turnOrder=[1,0]
 else store.gameflow.turn++
 await nextTick()
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:-1,origin:0})
 await click(choices(rf.KITCHEN_TRAINEE)[1])
 const before=state();stale();expect(state()).toBe(before)
 await click(choices(rf.BURGER_COOK)[0])
 const player=mode==='player'?1:0
 expect(store.players[player].employees).toEqual([rf.GURU,rf.KITCHEN_TRAINEE])
 expect(store.players[1-player].employees).toEqual([rf.GURU,rf.KITCHEN_TRAINEE,rf.KITCHEN_TRAINEE])
 expect(store.context.justTrained).toHaveLength(1)
})
it.each(['cancel','subphase-reset','turn-reset','complete'])('fix1: %s revokes the live capability',async mode=>{
 freshGame();controller.startPlayerTurn(true);await nextTick()
 const ctx=await import('../js/FCMcontext.js')
 await click(choices(rf.KITCHEN_TRAINEE)[1])
 const selection=store.context.selectedEmployeeToTrainData
 if(mode==='cancel') await click(button('workingDay.neverMind'))
 if(mode==='subphase-reset') controller.resetSubphase()
 if(mode==='turn-reset') controller.resetWholeTurn()
 if(mode==='complete') controller.endWorkingDaySubphase()
 const before=state()
 expect(ctx.trainingSelectionIsCurrent(selection,true)).toBe(false)
 expect(controller.trainEmployee(rf.BURGER_COOK,1,selection)).toBe(false)
 expect(state()).toBe(before)
})
it.each([false,true])('fix1: new-mode import does not restore a live capability (context=%s)',async includeContext=>{
 freshGame();await nextTick();await click(choices(rf.KITCHEN_TRAINEE)[1])
 const ctx=await import('../js/FCMcontext.js'),funcs=await import('../js/FCMfuncs.js')
 const selection=store.context.selectedEmployeeToTrainData
 const wire=funcs.exportFCMmodel(false,includeContext)
 expect(JSON.stringify(funcs.decompressData(wire))).not.toContain('trainingSelectionOwners')
 funcs.importFCMmodel(wire)
 expect(ctx.trainingSelectionIsCurrent(selection,true)).toBe(false)
 expect(ctx.trainingSelectionIsCurrent(store.context.selectedEmployeeToTrainData,true)).toBe(false)
 const before=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1,selection)).toBe(false)
 expect(state()).toBe(before)
 await nextTick()
 expect(store.context.selectedEmployeeToTrainData).toEqual({employee:-1,origin:0})
})
it('fix1: direct submission accepts the original capability but rejects an unbound copy',async()=>{
 freshGame();await nextTick()
 const ctx=await import('../js/FCMcontext.js')
 const selection=ctx.bindTrainingSelection({employee:rf.KITCHEN_TRAINEE,origin:2,sourceIndex:2})
 const before=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1,{...selection})).toBe(false)
 expect(state()).toBe(before)
 controller.trainEmployee(rf.BURGER_COOK,1,selection)
 expect(store.context.justTrained).toHaveLength(1)
 expect(ctx.trainingSelectionIsCurrent(selection,true)).toBe(false)
})


it.each(['player','turn','context'])('fix2: copied bound selection cannot downgrade to raw after %s change',async mode=>{
 freshGame();usePersonalStore().trainingGame=true
 store.players[1].employees=[rf.GURU,rf.KITCHEN_TRAINEE,rf.KITCHEN_TRAINEE]
 store.players[1].milestones=[rf.FIRST_LEMONADE_SOLD]
 await nextTick();await click(choices(rf.KITCHEN_TRAINEE)[1])
 const bound=store.context.selectedEmployeeToTrainData
 if(mode==='player')store.gameflow.turnOrder=[1,0]
 if(mode==='turn')store.gameflow.turn++
 if(mode==='context')store.context={...store.context}
 store.context.selectedEmployeeToTrainData={...bound}
 const before=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false)
 expect(state()).toBe(before)
})

it.each([false,true])('fix2: old-mode import cannot revive an omitted stale capability (context=%s)',async includeContext=>{
 freshGame();await nextTick()
 const funcs=await import('../js/FCMfuncs.js')
 const wire=funcs.exportFCMmodel(false,includeContext)
 await click(choices(rf.KITCHEN_TRAINEE)[1])
 const old=store.context.selectedEmployeeToTrainData
 window.initData.startingOptions=[21];store.externalStartingOptions=[21]
 funcs.importFCMmodel(wire)
 store.gameflow.phase=rf.PHASE_WORKING_DAY;store.gameflow.subphase=rf.SUBPHASE_TRAINING
 store.context.selectedEmployeeToTrainData=old
 const before=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false)
 expect(state()).toBe(before)
 store.context.selectedEmployeeToTrainData={...old}
 const copied=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false)
 expect(state()).toBe(copied)
})

it.each(['bound','raw-new','raw-old'])('fix2: explicit undefined is not omission for %s source',async mode=>{
 freshGame();await nextTick()
 if(mode==='bound')await click(choices(rf.KITCHEN_TRAINEE)[1])
 else store.context.selectedEmployeeToTrainData={employee:rf.KITCHEN_TRAINEE,origin:2}
 if(mode==='raw-old')store.startingOptions.milestoneNightBalance=false
 const before=state()
 expect(controller.trainEmployee(rf.BURGER_COOK,1,undefined)).toBe(false)
 expect(state()).toBe(before)
 if(mode!=='bound'){
  controller.trainEmployee(rf.BURGER_COOK,1)
  expect(store.context.justTrained).toHaveLength(1)
 }
})
