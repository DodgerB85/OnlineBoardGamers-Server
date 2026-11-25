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
	store.players[0].employees = [rf.MARKETING_TRAINEE]
	store.players[1].employees = [rf.MARKETING_TRAINEE]
	store.availableMilestones = [18,19]
	store.gameflow.turn = 5
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_MARKETING
	store.gameflow.fullTurnOrder = [0, 1]
	store.gameflow.turnOrder = [0, 1]
	store.bank = 500
	const resto = rules.givePossiblePositionsForNewRestaurant(0, false)[0]
	model.addRestaurant_core(0, resto, 0, true)
	model.addRestaurant_core(1, rules.givePossiblePositionsForNewRestaurant(0, false)[0], 0, true)
	root = element("root")
	app = renderer.createApp({ render: () => [h(ActionAreaWorkingDay), h(MapHighlight)] })
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

it('clears a cancelled selection without reserving stock or granting cards', async () => {
 freshGame()
 await openTrainee()
 await click(reward(27))
 const stock = [...store.availableEmployees]
 controller.resetMarketingSelection()
 await nextTick()
 await openTrainee()
 expect(reward(27).props['aria-pressed']).toBe(false)
 const before = state()
 await place()
 expect(state()).toBe(before)
 expect(store.availableEmployees).toEqual(stock)
 expect(store.players[0].beach).toEqual([])
 expect(store.history.filter(h=>h[0] === rf.HIST_NEW_MILESTONE)).toEqual([])
})


it('drops the unconfirmed choice when changing marketing employees', async () => {
 freshGame()
 store.players[0].employees.push(rf.CAMPAIGN_MANAGER)
 await nextTick()
 await openTrainee()
 await click(reward(27))
 controller.selectMarketer(rf.CAMPAIGN_MANAGER)
 await nextTick()
 expect(rewardButtons()).toHaveLength(0)
 controller.selectMarketer(13)
 await nextTick()
 expect(reward(27).props['aria-pressed']).toBe(false)
 const before = state()
 await place()
 expect(state()).toBe(before)
})


it('clears only transient reward choice on context reset and leaves ordinary phone selection untouched by reward reset', async () => {
 freshGame()
 await openTrainee()
 await click(reward(27))
 const context = await import('../js/FCMcontext.js')
 const stock = [...store.availableEmployees]
 context.resetContext()
 controller.selectMarketer(13)
 await nextTick()
 expect(reward(27).props['aria-pressed']).toBe(false)
 // Re-select without going through selectMarketer, to prove resetContext itself.
 await click(reward(27))
 context.resetContext()
 expect(context.marketingTraineeChoice(store.players[0])).toBe(null)
 expect(store.availableEmployees).toEqual(stock)
 store.context.mediaLineSecondCall = true
 context.clearMarketingTraineeChoices()
 expect(store.context.mediaLineSecondCall).toBe(true)
})


it('can undo a choice in the SFC without forfeiting an in-stock reward', async () => {
 freshGame()
 await openTrainee()
 await click(reward(27))
 const before = state()
 await click(findAll(root,n=>n.props['data-trainee-reward-clear'] != null)[0])
 expect(state()).toBe(before)
 expect(reward(27).props['aria-pressed']).toBe(false)
 await place()
 expect(state()).toBe(before)
})


it('rejects a repeated confirmation without duplicating campaign, employee, milestone, or history', async () => {
 freshGame()
 await openTrainee()
 await click(reward(27))
 const index = store.highlights.indexesToHighlightYellow[0]
 const oldTarget = square(index)
 await click(oldTarget)
 const before = state()
 expect(controller.placeMarketingCampaign(index,27)).toEqual({ok:false,reason:'campaign-unavailable'})
 await click(oldTarget)
 expect(state()).toBe(before)
})


it('leaving marketing clears the unconfirmed choice without awarding or consuming stock', async () => {
 freshGame()
 await openTrainee()
 await click(reward(23))
 const stock = [...store.availableEmployees]
 controller.endWorkingDaySubphase()
 await nextTick()
 const context = await import('../js/FCMcontext.js')
 expect(context.marketingTraineeChoice(store.players[0])).toBe(null)
 expect(store.players[0].beach).toEqual([])
 expect(store.players[0].employees).toEqual([13])
 expect(store.availableEmployees).toEqual(stock)
 expect(store.history.filter(h=>h[0] === rf.HIST_NEW_MILESTONE)).toHaveLength(0)
 expect(rewardButtons()).toHaveLength(0)
})


it.each([27,23])('offers only the stocked employee %i and cannot forfeit it', async employee => {
 freshGame()
 store.availableEmployees[employee === 27 ? 23 : 27] = 0
 await openTrainee()
 expect(rewardButtons().map(n=>n.props['data-trainee-reward'])).toEqual([employee])
 const before = state()
 await place()
 expect(state()).toBe(before)
 await click(reward(employee))
 await place()
 expect(store.players[0].beach).toEqual([employee])
})
it('permits an initially empty market with explicit null reward history', async () => {
 freshGame()
 store.availableEmployees[27] = 0
 store.availableEmployees[23] = 0
 await openTrainee()
 expect(rewardButtons()).toHaveLength(0)
 await place()
 expect(store.players[0].milestones).toEqual([18,19])
 expect(store.players[0].beach).toEqual([])
 expect(store.history.find(h=>h[0] === rf.HIST_NEW_MILESTONE && h[3][0] === 19)[3]).toEqual([19,null])
 expect(store.campaigns).toHaveLength(1)
})
it('rechecks a stale choice at confirmation and allows a fresh remaining choice', async () => {
 freshGame()
 await openTrainee()
 await click(reward(27))
 store.availableEmployees[27] = 0
 await nextTick()
 const before = state()
 await place()
 expect(state()).toBe(before)
 expect(reward(27)).toBeUndefined()
 await click(reward(23))
 await place()
 expect(store.players[0].beach).toEqual([23])
})
it('rejects a stale explicit choice when both stocks disappear, then permits deliberate empty-market confirmation', async () => {
 freshGame()
 await openTrainee()
 await click(reward(27))
 store.availableEmployees[27] = 0
 store.availableEmployees[23] = 0
 await nextTick()
 const before = state()
 await place()
 expect(state()).toBe(before)
 await click(findAll(root,n=>n.props['data-trainee-reward-clear'] != null)[0])
 await place()
 expect(store.players[0].beach).toEqual([])
 expect(store.players[0].milestones).toContain(19)
 expect(store.campaigns).toHaveLength(1)
})
it.each([1,2])('continues the real night-shift second campaign with duration %i without another reward prompt', async duration => {
 freshGame()
 store.startingOptions.nightShift = true
 store.players[0].employees.push(rf.NIGHT_SHIFT_MANAGER)
 await openTrainee()
 await click(reward(27))
 await place()
 expect(store.context.nightShift).toBe(true)
 expect(rewardButtons()).toHaveLength(0)
 expect(store.players[0].beach).toEqual([27])
 expect(store.campaigns).toHaveLength(1)
 controller.chooseDuration(duration)
 await nextTick()
 await place()
 expect(store.campaigns).toHaveLength(2)
 expect(store.players[0].beach).toEqual([27])
 expect(store.history.filter(h=>h[0] === rf.HIST_NEW_MILESTONE && h[3][0] === 19)).toHaveLength(1)
 expect(store.history.filter(h=>h[0] === rf.HIST_START_NS_CAMPAIGN)).toHaveLength(1)
 expect(store.context.marketer).toBe(-1)
})
it('two players can earn 19 in the same turn while the second must reject a now-exhausted choice', async () => {
 freshGame()
 store.availableEmployees[27] = 1
 store.availableEmployees[23] = 1
 await openTrainee()
 await click(reward(27))
 await place()
 store.gameflow.turnOrder = [1,0]
 usePersonalStore().pov = 1
 await nextTick()
 await openTrainee()
 expect(rewardButtons().map(n=>n.props['data-trainee-reward'])).toEqual([23])
 const before = state()
 expect(controller.placeMarketingCampaign(store.highlights.indexesToHighlightYellow[0],27)).toEqual({ok:false,reason:'employee-unavailable'})
 expect(state()).toBe(before)
 await click(reward(23))
 await place()
 expect(store.players.map(p=>p.beach)).toEqual([[27],[23]])
 expect(store.players.map(p=>p.milestones)).toEqual([[18,19],[18,19]])
 expect(store.campaigns).toHaveLength(2)
})
it.each(['flag','new','use','owned','unavailable'])('does not require a choice for an ineligible 19: %s', async reason => {
 freshGame()
 if (reason === 'flag') store.startingOptions.milestoneNightBalance = false
 if (reason === 'new') store.startingOptions.newMilestones = false
 if (reason === 'use') { store.startingOptions.useMilestones = false; store.availableMilestones = [] }
 if (reason === 'owned') store.players[0].milestones.push(19)
 if (reason === 'unavailable') store.availableMilestones = [18]
 await openTrainee()
 expect(rewardButtons()).toHaveLength(0)
 await place()
 expect(store.campaigns).toHaveLength(1)
 if (reason === 'flag' || reason === 'new') expect(store.players[0].beach).toEqual([27,23])
 else expect(store.players[0].beach).toEqual([])
 if (reason === 'unavailable') expect(store.players[0].milestones).toEqual([18])
})
it('normal campaign-manager marketing and milestone 18 do not show the trainee choice', async () => {
 freshGame()
 store.players[0].employees = [rf.CAMPAIGN_MANAGER]
 await nextTick()
 await click(findAll(root,n=>n.props.alt === rf.employeeName(rf.CAMPAIGN_MANAGER))[0])
 expect(rewardButtons()).toHaveLength(0)
 await place()
 expect(store.players[0].milestones).toEqual([18])
 expect(store.players[0].beach).toEqual([])
 expect(store.campaigns).toHaveLength(1)
})
it('whole-model old-context import on the same store never restores an unconfirmed choice or erases an explicit old phone second call', async () => {
 freshGame()
 const funcs = await import('../js/FCMfuncs.js')
 const old = funcs.simpleExportWholeFCMmodel()
 await openTrainee()
 await click(reward(27))
 const snapshot = funcs.decompressData(old)
 snapshot[20].mediaLineSecondCall = true
 funcs.simpleImportWholeFCMmodel(funcs.compressData(snapshot))
 await nextTick()
 const context = await import('../js/FCMcontext.js')
 expect(context.marketingTraineeChoice(store.players[0])).toBe(null)
 expect(store.context.mediaLineSecondCall).toBe(true)
 expect(store.players[0].beach).toEqual([])
})
it('the real SFC reset button undoes the unconfirmed selection without stock, reward, or campaign changes', async () => {
 freshGame()
 const funcs = await import('../js/FCMfuncs.js')
 store.subphaseResetData = funcs.simpleExportWholeFCMmodel()
 const stock = [...store.availableEmployees]
 await openTrainee()
 await click(reward(27))
 await click(findAll(root,n=>n.type === 'button' && n.text === 'workingDay.reset')[0])
 expect(store.players[0].beach).toEqual([])
 expect(store.players[0].milestones).toEqual([])
 expect(store.availableEmployees).toEqual(stock)
 expect(store.campaigns).toHaveLength(0)
 const context = await import('../js/FCMcontext.js')
 expect(context.marketingTraineeChoice(store.players[0])).toBe(null)
})


it.each(['en','zh-hans','de','fr','es','it'])('defines the new marketing choice messages in %s without fallback', async locale => {
 const { messages } = await import('../locales/index.js')
 for (const key of ['chooseTraineeReward','noTraineeRewardStock','clearTraineeRewardChoice']) {
  expect(messages[locale].workingDay[key], key).toBeTypeOf('string')
  expect(messages[locale].workingDay[key].length).toBeGreaterThan(2)
 }
})


it('a stale repeated map click cannot auto-place the night-shift second campaign on the first token', async () => {
 freshGame()
 store.startingOptions.nightShift = true
 store.players[0].employees.push(rf.NIGHT_SHIFT_MANAGER)
 await openTrainee()
 await click(reward(27))
 const index = store.highlights.indexesToHighlightYellow[0]
 const oldTarget = square(index)
 await click(oldTarget)
 expect(store.context.nightShift).toBe(true)
 const before = state()
 await click(oldTarget)
 expect(state()).toBe(before)
 expect(store.campaigns).toHaveLength(1)
 await place()
 expect(store.campaigns).toHaveLength(2)
 expect(store.players[0].beach).toEqual([27])
})


it('honors the real award recheck failure before any marketing mutation', async () => {
 freshGame()
 await openTrainee()
 await click(reward(27))
 const original = rules.giveMarketingMilestones
 // Interpose an inventory change, not an award result: the actual reviewed
 // rules/player/helper still execute, including their second stock check.
 const spy = vi.spyOn(rules,'giveMarketingMilestones').mockImplementation((...args) => {
  store.availableEmployees[27] = 0
  return original(...args)
 })
 try {
  const expected = JSON.parse(state())
  expected.stock[27] = 0
  expect(controller.placeMarketingCampaign(store.highlights.indexesToHighlightYellow[0])).toEqual({ok:false,reason:'employee-unavailable'})
  expect(JSON.parse(state())).toEqual(expected)
 } finally { spy.mockRestore() }
})
it('a second trainee on the same player markets normally but never earns a second reward', async () => {
 freshGame()
 store.players[0].employees.push(13)
 await nextTick()
 await openTrainee()
 await click(reward(23))
 await place()
 await openTrainee()
 expect(rewardButtons()).toHaveLength(0)
 await place()
 expect(store.campaigns).toHaveLength(2)
 expect(store.players[0].beach).toEqual([23])
 expect(store.history.filter(h=>h[0] === rf.HIST_NEW_MILESTONE && h[3][0] === 19)).toHaveLength(1)
})
it('night-shift trainee marketing does not consume the following telemarketers independent phone groups', async () => {
 freshGame()
 store.startingOptions.nightShift = true
 store.startingOptions.mediaLine = true
 store.mediaLine.rulesVersion = 1
 store.availableMarketingCampaigns.push(...rf.PHONE_CAMPAIGNS)
 store.players[0].employees.push(rf.NIGHT_SHIFT_MANAGER,rf.TELEMARKETER,rf.TELEMARKETER)
 await openTrainee()
 await click(reward(27))
 await place()
 await place()
 for (let group = 0; group < 2; group++) {
  await click(findAll(root,n=>n.props.alt === rf.employeeName(rf.TELEMARKETER))[0])
  for (let token = 0; token < 3; token++) await place()
  expect(store.mediaLine.phoneGroups[group].cards).toHaveLength(3)
 }
 expect(store.campaigns).toHaveLength(8)
 expect(store.players[0].beach).toEqual([27])
 expect(store.players[0].marketers.filter(m=>m.marketer === rf.TELEMARKETER)).toHaveLength(2)
 expect(store.history.filter(h=>h[0] === rf.HIST_NEW_MILESTONE && h[3][0] === 19)).toHaveLength(1)
})


it.each(['wire','wire-no-context','whole-raw','new-game'])('defaults to no unconfirmed reward on the same store after %s', async path => {
 freshGame()
 const funcs = await import('../js/FCMfuncs.js')
 const context = await import('../js/FCMcontext.js')
 store.context.mediaLineSecondCall = true
 const saved = path === 'whole-raw' ? funcs.simpleExportWholeFCMmodel(true) : funcs.exportFCMmodel(false,path !== 'wire-no-context')
 await openTrainee()
 await click(reward(27))
 expect(context.marketingTraineeChoice(store.players[0])).toBe(27)
 if (path === 'new-game') model.setupNewGame({playerNames:['N0','N1'],startingMap:STARTING_MAP})
 else if (path === 'whole-raw') funcs.simpleImportWholeFCMmodel(saved,true)
 else funcs.importFCMmodel(saved,false,path !== 'wire-no-context')
 await nextTick()
 expect(context.marketingTraineeChoice(store.players[0])).toBe(null)
 expect(store.players[0].beach).toEqual([])
 expect(store.players[0].milestones).toEqual([])
 if (path === 'wire' || path === 'whole-raw') expect(store.context.mediaLineSecondCall).toBe(true)
 expect(store.startingOptions.milestoneNightBalance).toBe(true)
})

function rewardButtons() { return findAll(root,n=>n.type === 'button' && n.props['data-trainee-reward'] != null) }
function reward(employee) { return rewardButtons().find(n=>n.props['data-trainee-reward'] === employee) }
it.each([27,23])('chooses %i in the real SFC and confirms one campaign with exactly one employee', async employee => {
 freshGame()
 await openTrainee()
 expect(rewardButtons().map(n=>n.props['data-trainee-reward'])).toEqual([27,23])
 const stock = [...store.availableEmployees]
 const before = state()
 await click(reward(employee))
 expect(state()).toBe(before) // choosing alone never mutates game/context/wire
 expect(reward(employee).props['aria-pressed']).toBe(true)
 expect(hasClass(reward(employee),'selected')).toBe(true)
 expect(hasClass(reward(employee),'cardChoiceDiv')).toBe(true)
 const campaign = store.context.campaign
 await place()
 expect(store.players[0].beach).toEqual([employee])
 expect(store.players[0].milestones).toContain(19)
 expect(store.availableEmployees[employee]).toBe(stock[employee]-1)
 expect(store.availableEmployees[employee === 27 ? 23 : 27]).toBe(stock[employee === 27 ? 23 : 27])
 expect(store.players[0].marketers.map(m=>m.campaign)).toEqual([campaign])
 expect(store.history.filter(h=>h[0] === rf.HIST_START_MARKETING_CAMPAIGN)).toHaveLength(1)
 expect(store.history.find(h=>h[0] === rf.HIST_NEW_MILESTONE && h[3][0] === 19)[3]).toEqual([19,employee])
 expect(rewardButtons()).toHaveLength(0)
})

async function openTrainee() {
 await click(findAll(root,n=>n.props.alt === rf.employeeName(13))[0])
}
async function place() {
 const index = store.highlights.indexesToHighlightYellow[0]
 expect(index).toBeGreaterThanOrEqual(0)
 await click(square(index))
}
it('rejects unchosen marketing before any mutation through the real map event and controller', async () => {
 freshGame()
 await openTrainee()
 const before = state()
 await place()
 expect(state()).toBe(before)
 expect(controller.placeMarketingCampaign(store.highlights.indexesToHighlightYellow[0],47)).toEqual({ok:false,reason:'invalid-choice'})
 expect(state()).toBe(before)
})
