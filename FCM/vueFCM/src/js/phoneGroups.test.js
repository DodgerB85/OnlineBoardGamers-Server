import { beforeAll, describe, it, expect, vi } from 'vitest'
vi.mock('vue', async original => ({...await original(), TransitionGroup: (_, {slots}) => slots.default?.()}))
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, h, nextTick } from 'vue'
import fs from 'node:fs'
let model, rf, rules, controller, map, funcs, replay, useModelStore, gamePinia
beforeAll(async () => {
 globalThis.window = { performance }; globalThis.alert = () => {}; globalThis.document = { addEventListener() {} }
 if (!globalThis.pako) (0,eval)(fs.readFileSync(new URL('../../../../Lobby/static/Lobby/common/pakoLib.js', import.meta.url), 'utf8'))
 model = await import('./FCMmodel'); rf = await import('./FCMreference'); rules = await import('./FCMrules'); controller = await import('./FCMcontroller'); map = await import('./FCMmap'); funcs = await import('./FCMfuncs'); replay = await import('./FCMreplay'); ({useModelStore} = await import('../stores/FCMstore'))
})
function game(opts = ['50']) {
 gamePinia=createPinia(); setActivePinia(gamePinia); const s = useModelStore(); s.externalStartingOptions.push(...opts); model.setInternalStartingOptions(opts);
 window.initData = { startingOptions: opts, playerNames: ['P0','P1'], startingMap: [17,0,4,0,19,3,18,0,12,2,24,2,9,0,0,2,13,2] }
 model.setupNewGame(); return s
}

describe('phone four-way click anchor — production SFC chain', () => {
 const directions=[[1,0],[0,1],[-1,0],[0,-1]]
 it('production TV picker shows only three numbered antennas while phone 6.5 remains selectable',async()=>{
  const s=board(rf.TV_ANNOUNCER);controller.selectMarketer(rf.TV_ANNOUNCER,false)
  const ui=await mountMapAction()
  try{
   const choices=()=>nodes(ui.root,n=>String(n.props.class).includes('campaignChoiceImg'))
   const tvChoices=choices().filter(n=>String(n.props.src).includes('antenna'))
   expect(tvChoices.map(n=>n.props.alt)).toEqual([3.5,4.5,5.5]);expect(tvChoices).toHaveLength(3)
   tvChoices[2].props.onClick();await nextTick();expect(s.context.campaign).toBe(42)
   const phone=choices().find(n=>String(n.props.src).includes('marketing_phone_65_v1'))
   expect(phone).toBeDefined();phone.props.onClick();await nextTick();expect(s.context.campaign).toBe(30)
   expect(ui.errors).toEqual([])
  }finally{ui.app.unmount()}
 })

 it('a new marketer default phone selection resets stale four-way orientation before any card click',()=>{
  const s=board(rf.TELEMARKETER);s.context.rotation=3;s.context.rotated=true
  controller.selectMarketer(rf.TELEMARKETER,false)
  expect(s.context.campaign).toBe(30);expect(s.context.rotation).toBe(0);expect(s.context.rotated).toBe(false)
  expect(controller.placeMarketingCampaign(s.highlights.indexesToHighlightYellow[0])).toBe(true)
 })
 it.each([0,1,2,3])('rotation %s rejects actual map-edge wrap and out-of-map origins', rotation=>{
  const s=detached(), [dx,dy]=directions[rotation]
  const [x,y]=[[rf.ssW-1,43],[43,rf.ssH-1],[0,43],[43,0]][rotation], anchor=map.giveIndex(x,y)
  s.players[0].restaurants=[{index:map.giveIndex(Math.min(Math.max(x-2,0),rf.ssW-3),Math.min(Math.max(y-2,0),rf.ssH-3)),rotation:0,open:true}]
  expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotation%2===1,rotation)).not.toContain(anchor)
 })
 it('counterclockwise rotation and hover leave never revive a hidden ghost',async()=>{
  const s=detached();controller.selectMarketer(rf.TELEMARKETER,false);controller.chooseCampaign(30)
  const ui=await mountMapAction()
  try{
   const ghost=nodes(ui.root,n=>n.props.alt==='GI Image')[0]
   const back=()=>nodes(ui.root,n=>String(n.props.src).includes('rot_anticlockwise'))[0]
   back().props.onClick();await nextTick();expect(s.context.rotation).toBe(3);expect(ghost.style.display).not.toBe('block')
   const square=nodes(ui.root,n=>n.props['data-index']===map.giveIndex(46,43))[0]
   square.props.onMouseover({});await nextTick();expect(ghost.style.display).toBe('block')
   square.props.onMouseleave({});await nextTick();back().props.onClick();await nextTick()
   expect(s.context.rotation).toBe(2);expect(ghost.style.display).toBe('none');expect(s.viewSettings.currentGhostIndex).toBeNull();expect(ui.errors).toEqual([])
  }finally{ui.app.unmount()}
 })
 it.each([0,1,2,3])('rotation %s stores canonical footprint in unchanged replay data and real forward/back snapshots',async rotation=>{
  const s=realPhoneBoard();s.history.push([rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION,0,999,[funcs.exportIndex(s.players[0].restaurants[0].index),0]],[rf.HIST_HIRE,0,1000,[rf.TELEMARKETER]],[rf.HIST_CHOOSE_STRUCTURE,0,1001,[[rf.TELEMARKETER],[]]])
  controller.selectMarketer(rf.TELEMARKETER,false);controller.chooseCampaign(30)
  for(let i=0;i<rotation;i++)controller.rotateCampaign()
  const origin=s.highlights.indexesToHighlightYellow[0], [x,y]=map.giveCoord(origin), [dx,dy]=directions[rotation], canonical=map.giveIndex(x+Math.min(dx,0),y+Math.min(dy,0))
  expect(controller.placeMarketingCampaign(origin)).toBe(true)
  const expected=JSON.parse(JSON.stringify(s.campaigns)), count=s.history.length
  globalThis.document.querySelector=()=>null
  await replay.generateReplayData();expect(s.campaigns).toEqual(expected)
  expect(s.campaigns[0].index).toBe(canonical);expect(s.campaigns[0].rotated).toBe(rotation%2===1)
  replay.goToReplayStep(0);expect(s.campaigns).toHaveLength(0)
  replay.goToReplayStep(count-1);expect(s.campaigns).toEqual(expected)
 })
 it('legacy phone and ordinary billboard keep their two-orientation controller behavior',()=>{
  const s=detached();controller.selectMarketer(rf.TELEMARKETER,false);controller.chooseCampaign(30);s.mediaLine.rulesVersion=0
  for(let i=0;i<4;i++){controller.rotateCampaign();expect(s.context.rotated).toBe(i%2===0);expect(s.context.rotation).toBe(0)}
  s.mediaLine.rulesVersion=1;controller.chooseCampaign(14)
  for(let i=0;i<4;i++){controller.rotateCampaign();expect(s.context.rotated).toBe(i%2===0);expect(s.context.rotation).toBe(0)}
 })
 function nodes(n,p){return [...(p(n)?[n]:[]),...n.children.flatMap(c=>nodes(c,p))]}
 async function mountMapAction(){
  const {default:Action}=await import('../components/ActionAreaWorkingDay.vue')
  const {default:MapHighlight}=await import('../components/MapHighlight.vue')
  const {usePersonalStore}=await import('../stores/FCMpersonal'); usePersonalStore().pov=0
  const root=uiNode('root'), errors=[], app=phoneRenderer.createApp({render:()=>[h(Action),h(MapHighlight)]})
  app.use(gamePinia); app.config.globalProperties.$t=(k,a)=>k+(a?.current??''); app.config.errorHandler=e=>errors.push(e)
  app.mount(root); await nextTick(); return {root,errors,app}
 }
 function detached(role=rf.TELEMARKETER){const s=board(role);s.mapData.coords=s.mapData.coords.map(v=>v>rf.HOUSE&&v<rf.HOUSE_ENC_MAX?rf.EMPTY_SPACE:v);return s}
 it.each([0,1,2,3])('rotation %s: clicked origin, highlight, stationary hover and submitted footprint agree',async rotation=>{
  const s=detached(), anchor=map.giveIndex(46,43), [dx,dy]=directions[rotation]
  controller.selectMarketer(rf.TELEMARKETER,false);controller.chooseCampaign(30)
  const ui=await mountMapAction(), square=()=>nodes(ui.root,n=>n.props['data-index']===anchor)[0]
  try{
   const ghost=nodes(ui.root,n=>n.props.alt==='GI Image')[0]
   square().props.onMouseover({}); await nextTick()
   for(let i=0;i<rotation;i++){nodes(ui.root,n=>String(n.props.src).includes('rot_clockwise'))[0].props.onClick();await nextTick()}
   expect(s.context.rotation).toBe(rotation)
   expect(square()).toBeDefined(); expect(s.viewSettings.currentGhostIndex).toBe(anchor)
   const view=await import('./FCMview'), canonical=map.giveIndex(46+Math.min(dx,0),43+Math.min(dy,0)), [x,y]=view.getXYforSmallSquare(canonical)
   expect(parseFloat(ghost.style.left)).toBe(x-(rotation%2?s.refSize/10:0)+1)
   expect(parseFloat(ghost.style.top)).toBe(y+(rotation%2?s.refSize/10:0)+1)
   square().props.onClick(); await nextTick()
   expect(s.campaigns[0].index).toBe(canonical);expect(s.campaigns[0].rotated).toBe(rotation%2===1)
   const occupied=s.mapData.coords.flatMap((v,i)=>v===rf.MARKETING+30?[i]:[])
   expect(occupied.sort((a,b)=>a-b)).toEqual([anchor,map.giveIndex(46+dx,43+dy)].sort((a,b)=>a-b))
   expect(ghost.style.display).toBe('none');expect(s.viewSettings.currentGhostIndex).toBeNull()
   expect(ui.errors).toEqual([])
  }finally{ui.app.unmount()}
 })
 it.each([0,1,2,3])('rotation %s allows outward crossing but never reverses the zone-origin constraint',rotation=>{
  const s=detached(), [dx,dy]=directions[rotation]
  const [x,y]=[[49,43],[43,49],[35,43],[43,35]][rotation], origin=map.giveIndex(x,y), other=map.giveIndex(x+dx,y+dy)
  const zone=map.waveRegionSpaces(model.giveRestaurantDoorIndices(0,{openOnly:false}),1)
  expect(zone.has(origin)).toBe(true);expect(zone.has(other)).toBe(false)
  expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotation%2===1,rotation)).toContain(origin)
  expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotation%2===1,(rotation+2)%4)).not.toContain(other)
  for(const value of [rf.ROAD,rf.HOUSE+7,rf.RESTAURANT_OPEN,rf.OFF_BOARD]){s.mapData.coords[other]=value;expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotation%2===1,rotation)).not.toContain(origin)}
 })
 it.each([2,3].flatMap(rotation=>['TELEMARKETER','TV_ANNOUNCER','BRAND_DIRECTOR'].map(role=>[rotation,role])))('only reverse direction %s remains for %s: second and third are mandatory and context/raw undo preserve origin direction',async (rotation,role)=>{
  const s=detached(rf[role]), coords=rotation===2?[[35,40],[35,42],[35,44]]:[[40,35],[42,35],[44,35]], [dx,dy]=directions[rotation]
  s.mapData.coords=s.mapData.coords.map(v=>v===rf.EMPTY_SPACE?rf.ROAD:v)
  for(const [x,y]of coords)for(const i of [map.giveIndex(x,y),map.giveIndex(x+dx,y+dy)])s.mapData.coords[i]=rf.EMPTY_SPACE
  controller.selectMarketer(rf[role],false);controller.chooseCampaign(30)
  const ui=await mountMapAction()
  try{
   for(let i=0;i<rotation;i++){nodes(ui.root,n=>String(n.props.src).includes('rot_clockwise'))[0].props.onClick();await nextTick()}
   for(let n=0;n<3;n++){
    const origin=map.giveIndex(...coords[n]);expect(s.highlights.indexesToHighlightYellow).toContain(origin)
    nodes(ui.root,e=>e.props['data-index']===origin)[0].props.onClick();await nextTick()
    if(n<2){expect(s.context.marketer).toBe(rf[role]);expect(s.context.rotation).toBe(rotation);expect(uiText(ui.root)).toContain('workingDay.phoneGroupProgress'+(n+2));
     const terrain=[...s.mapData.coords], saved=funcs.exportFCMmodel(false,true);funcs.importFCMmodel(saved,false,true);await nextTick();expect(s.context.rotation).toBe(rotation)
     // Wire saves rebuild real terrain: restore this synthetic empty-pair fixture after testing the context.
     s.mapData.coords=terrain;controller.setCampaignPlacementHighlights();await nextTick()
     const snap=funcs.simpleExportWholeFCMmodel(true);funcs.simpleImportWholeFCMmodel(snap,true);await nextTick();expect(s.context.rotation).toBe(rotation)
    }
   }
   expect(s.campaigns).toHaveLength(3);expect(s.context.marketer).toBe(-1);expect(ui.errors).toEqual([])
  }finally{ui.app.unmount()}
 })
})
describe('new phone rules', () => {
 it('new games supply four whole three-card groups and remove only the telephone milestone', () => {
  const s = game(); expect(s.mediaLine.rulesVersion).toBe(1)
  const ids = s.availableMarketingCampaigns.filter(n => rf.MARKETING_CAMPAIGNS[n].type === rf.PHONE)
  expect(ids).toHaveLength(12); expect(new Set(ids).size).toBe(12)
  expect(ids.map(rules.campaignSortKey)).toEqual([6.5,6.5,6.5,7.5,7.5,7.5,8.5,8.5,8.5,9.5,9.5,9.5])
  expect(s.availableMilestones).not.toContain(rf.FIRST_TELEMARKETER_USED)
  expect(s.availableMilestones).toContain(rf.FIRST_TV_ANNOUNCER_USED)
  expect(s.availableMarketingCampaigns.filter(n=>rf.MARKETING_CAMPAIGNS[n].type === rf.TV_CHANNEL)).toEqual([28,29,42])
 })
})
function board(marketer) {
 const s = game(); s.mapData.coords = new Array(rf.ssW * rf.ssH).fill(rf.EMPTY_SPACE)
 const index = map.giveIndex(40,40)
 for (let y=40;y<43;y++) for (let x=38;x<40;x++) s.mapData.coords[map.giveIndex(x,y)] = rf.HOUSE + 7
 map.addElement(rf.TYPE_RESTAURANT, s.players[0].colour, index, false)
 s.players[0].restaurants = [{index, rotation:0, open:true}]
 s.players[0].employees = [marketer]; s.gameflow.turnOrder = [0,1]
 s.gameflow.phase = rf.PHASE_WORKING_DAY; s.gameflow.subphase = rf.SUBPHASE_MARKETING
 return s
}
function placeNext(s) {
 for (const rotated of [false,true]) {
  const positions = rules.givePossiblePositionsForMarketingCampaign(s.context.marketer,s.context.campaign,rotated)
  if (positions.length) { if (s.context.rotated !== rotated) controller.rotateCampaign(); controller.placeMarketingCampaign(positions[0]); return true }
 }
 return false
}
describe('whole phone actions', () => {
 it.each(['TELEMARKETER','TV_ANNOUNCER','BRAND_DIRECTOR'])('requires a whole matching group for %s', role => {
  const marketer = rf[role]
  const s = board(marketer); controller.selectMarketer(marketer,false); controller.chooseCampaign(30)
  controller.chooseGood(rf.PIZZA); controller.chooseDuration(3)
  expect(placeNext(s)).toBe(true); expect(s.campaigns).toHaveLength(1)
  expect(s.context.campaign).toBe(31)
  expect(s.availableMarketingCampaigns.filter(n=>n>=30&&n<=32)).toEqual([])
  controller.resetMarketingSelection(); expect(s.context.campaign).toBe(31)
  controller.cancelMarketer(); expect(s.context.campaign).toBe(31)
  controller.chooseCampaign(33); expect(s.context.campaign).toBe(31)
  controller.selectMarketer(rf.TELEMARKETER,false); expect(s.context.marketer).toBe(marketer)
  controller.chooseGood(rf.BURGER); controller.chooseDuration(1)
  expect(placeNext(s)).toBe(true); expect(s.context.campaign).toBe(32)
  expect(placeNext(s)).toBe(true); expect(s.context.marketer).toBe(-1)
  expect(s.campaigns.map(c=>[c.number,c.good,c.duration])).toEqual([[30,rf.PIZZA,3],[31,rf.PIZZA,3],[32,rf.PIZZA,3]])
  expect(s.context.endOfDaySummaryData.market.marketed).toEqual([30,31,32])
  expect(s.players[0].employees).not.toContain(marketer)
  expect(s.players[0].milestones).not.toContain(rf.FIRST_TELEMARKETER_USED)
 })
 it('new-game/AI reset clears a discarded pending phone action', () => {
  const s=board(rf.TELEMARKETER); controller.selectMarketer(rf.TELEMARKETER,false); placeNext(s)
  expect(s.context.phoneGroupAction).not.toBeNull()
  model.setupNewGame()
  expect(s.mediaLine.rulesVersion).toBe(1); expect(s.mediaLine.phoneGroups).toEqual({})
  expect(s.context.phoneGroupAction).toBeNull(); expect(s.context.marketer).toBe(-1)
 })
 it('only offers one representative per available group', () => {
  const s = board(rf.TELEMARKETER); controller.selectMarketer(rf.TELEMARKETER,false)
  expect(s.context.campaigns.filter(n=>rf.PHONE_CAMPAIGNS.includes(n))).toEqual([30,33,36,39])
 })
})
describe('placement boundaries and expiry', () => {
 function constrained(cells) {
  const s = board(rf.TELEMARKETER)
  s.mapData.coords = s.mapData.coords.map(v => v === rf.EMPTY_SPACE ? rf.ROAD : v)
  for (const [x,y] of cells) s.mapData.coords[map.giveIndex(x,y)] = rf.EMPTY_SPACE
  return s
 }
 it.each([1,2])('automatically finishes after %s only when both orientations are exhausted; locks remainder until expiry', count => {
  const cells = [[36,40],[37,40]]; if(count===2) cells.push([36,42],[37,42])
  const s = constrained(cells); controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(30)
  controller.chooseDuration(1)
  for(let n=0;n<count;n++) expect(placeNext(s)).toBe(true)
  expect(s.campaigns).toHaveLength(count); expect(s.context.marketer).toBe(-1)
  expect(s.availableMarketingCampaigns.filter(n=>n>=30&&n<=32)).toEqual([])
  s.players[1].employees.push(rf.TELEMARKETER); s.gameflow.turnOrder=[1,0]
  controller.selectMarketer(rf.TELEMARKETER,false)
  expect(s.context.campaigns).not.toContain(30); expect(s.context.campaigns).not.toContain(31)
  rules.doMarketingCampaigns(false)
  expect(s.campaigns).toHaveLength(0)
  expect(s.availableMarketingCampaigns.filter(n=>n>=30&&n<=32)).toEqual([30,31,32])
  expect(s.players[0].beach.filter(e=>e===rf.TELEMARKETER)).toHaveLength(1)
  expect(s.mediaLine.phoneGroups).toEqual({})
 })
 it('does not mistake no horizontal position for no legal position', () => {
  const s = constrained([[37,40],[37,41],[37,42],[37,43]])
  controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(30)
  expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,false)).toEqual([])
  expect(placeNext(s)).toBe(true); expect(s.context.marketer).toBe(rf.TELEMARKETER)
  expect(s.context.rotated).toBe(true); expect(placeNext(s)).toBe(true)
  expect(s.campaigns).toHaveLength(2); expect(s.context.marketer).toBe(-1)
 })
 it('zero legal positions consumes neither employee nor group', () => {
  const s = constrained([]); controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(30)
  const before = JSON.stringify({campaigns:s.campaigns,pool:s.availableMarketingCampaigns,employees:s.players[0].employees,locks:s.mediaLine.phoneGroups})
  expect(controller.placeMarketingCampaign(map.giveIndex(36,40))).toBe(false)
  expect(JSON.stringify({campaigns:s.campaigns,pool:s.availableMarketingCampaigns,employees:s.players[0].employees,locks:s.mediaLine.phoneGroups})).toBe(before)
  controller.cancelMarketer()
  expect(s.context.marketer).toBe(-1); expect(s.context.justMarketed).not.toContain(rf.TELEMARKETER)
 })
 it('clamps phone durations even for a TV employee switching from TV; rejects malformed input before mutation', () => {
  const s=board(rf.TV_ANNOUNCER); controller.selectMarketer(rf.TV_ANNOUNCER,false); controller.chooseCampaign(28); controller.chooseDuration(4); controller.chooseCampaign(30)
  expect(s.context.duration).toBeLessThanOrEqual(3)
  controller.chooseDuration(4); expect(s.context.duration).toBeLessThanOrEqual(3)
  const before=JSON.stringify({campaigns:s.campaigns,pool:s.availableMarketingCampaigns,employees:s.players[0].employees,locks:s.mediaLine.phoneGroups,history:s.history})
  for(const bad of [NaN, -1, '42', 1.2, null]) expect(controller.placeMarketingCampaign(bad)).toBe(false)
  expect(JSON.stringify({campaigns:s.campaigns,pool:s.availableMarketingCampaigns,employees:s.players[0].employees,locks:s.mediaLine.phoneGroups,history:s.history})).toBe(before)
 })
 it('same printed numbers have deterministic internal-id tie-break order', () => {
  const s=board(rf.TELEMARKETER)
  for(const n of [32,30,31]) model.addMarketingCampaign(n,map.giveIndex(36,40),false,rf.BURGER,2)
  rules.doMarketingCampaigns(false)
  const h=s.history.find(h=>h[0]===rf.HIST_MARKETING_CAMPAIGN_PHASE)
  expect(h[3].map(x=>x[0])).toEqual([30,31,32])
 })
})
// Compile and mount the real action SFC; no game/controller/component mocks.
function uiNode(type, text = '') { return { type, text, props: {}, children: [], parent: null, style: {}, classList: {add(){},remove(){}} } }
const phoneRenderer = createRenderer({
 createElement: uiNode, createText: text => uiNode('text', text), createComment: text => uiNode('comment', text),
 setText: (node,text) => { node.text=text }, setElementText: (node,text) => { node.text=text; node.children=[] },
 patchProp: (node,key,old,value) => { node.props[key]=value },
 insert(node,parent,anchor) {
  if(node.parent) node.parent.children.splice(node.parent.children.indexOf(node),1)
  const i=anchor?parent.children.indexOf(anchor):-1
  parent.children.splice(i<0?parent.children.length:i,0,node); node.parent=parent
 },
 remove(node) { if(node.parent) node.parent.children.splice(node.parent.children.indexOf(node),1); node.parent=null },
 parentNode: node=>node.parent, nextSibling: node=>node.parent?.children[node.parent.children.indexOf(node)+1],
})
function uiText(node) { return node.type==='comment'?'':String(node.text)+node.children.map(uiText).join('') }
async function mountPhoneAction() {
 const {default: Action} = await import('../components/ActionAreaWorkingDay.vue')
 const {usePersonalStore} = await import('../stores/FCMpersonal')
 usePersonalStore().pov=0
 const root=uiNode('root'), errors=[], app=phoneRenderer.createApp({render:()=>h(Action)})
 app.use(gamePinia); app.config.globalProperties.$t=(key,args)=>key+(args?.current??'')
 app.config.errorHandler=error=>errors.push(error)
 app.mount(root); await nextTick()
 return {app,root,errors}
}
function realPhoneBoard() {
 const s=game(); s.players[0].employees=[rf.TELEMARKETER]
 s.gameflow.phase=rf.PHASE_WORKING_DAY; s.gameflow.subphase=rf.SUBPHASE_MARKETING; s.gameflow.turnOrder=[0,1]
 const index=map.locationFor(2,2,true).find(index=>{
  s.players[0].restaurants=[{index,rotation:0,open:true}]
  return rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,false).length>8
 })
 expect(index).toBeDefined(); map.addElement(rf.TYPE_RESTAURANT,s.players[0].colour,index,false)
 return s
}
describe('phone detached placement correction', () => {
 function detachedBoard(role=rf.TELEMARKETER) {
  const s=board(role)
  s.mapData.coords=s.mapData.coords.map(v=>v>rf.HOUSE && v<rf.HOUSE_ENC_MAX ? rf.EMPTY_SPACE : v)
  return s
 }
 it.each([false,true])('modern permits detached ground, legacy still requires a building (rotated=%s)',rotated=>{
  const s=detachedBoard(), anchor=map.giveIndex(45,43)
  expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotated)).toContain(anchor)
  s.mediaLine.rulesVersion=0
  expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotated)).not.toContain(anchor)
  s.mediaLine.rulesVersion=1
  expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotated)).toContain(anchor)
 })
 it.each([false,true])('keeps the exact five-tile anchor zone, crossings, occupancy and board edge (rotated=%s)',rotated=>{
  const s=detachedBoard(), w=rotated?1:2, h=rotated?2:1
  for(const value of [rf.ROAD,rf.HOUSE+7,rf.RESTAURANT_OPEN,rf.OFF_BOARD]) {
   const blocked=map.giveIndex(46,43); s.mapData.coords[blocked]=value
   expect(rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotated)).not.toContain(map.giveIndex(rotated?46:45,43))
  }
  s.mapData.coords[map.giveIndex(46,43)]=rf.EMPTY_SPACE
  const actual=rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotated)
  expect(actual).not.toContain(map.giveIndex(37,37)); expect(actual).not.toContain(map.giveIndex(50,43))
  expect(actual).toContain(map.giveIndex(rotated?43:49,rotated?49:43)) // existing outward straddle stays legal
  const expected=[...map.waveRegionSpaces(model.giveRestaurantDoorIndices(0,{openOnly:false}),1)].filter(anchor=>{
   const [x,y]=map.giveCoord(anchor)
   return x+w<=rf.ssW && y+h<=rf.ssH && map.giveAllSpaceForAToken(anchor,w,h).every(c=>s.mapData.coords[c]===rf.EMPTY_SPACE)
  })
  expect(actual).toEqual(expected)
  const index=map.giveIndex(rf.ssW-3,rf.ssH-3); s.players[0].restaurants=[{index,rotation:0,open:true}]
  const edge=rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER,30,rotated)
  expect(edge.length).toBeGreaterThan(0)
  for(const anchor of edge) { const [x,y]=map.giveCoord(anchor); expect(x+w).toBeLessThanOrEqual(rf.ssW); expect(y+h).toBeLessThanOrEqual(rf.ssH) }
  expect(edge).not.toContain(map.giveIndex(rotated?rf.ssW-2:rf.ssW-1,rotated?rf.ssH-1:rf.ssH-2))
 })
 it.each(['TELEMARKETER','TV_ANNOUNCER','BRAND_DIRECTOR'])('real SFC continues all three without houses for %s',async role=>{
  const s=detachedBoard(rf[role])
  // Only three detached pairs remain, all inside the eastern tile of the cross.
  s.mapData.coords=s.mapData.coords.map(v=>v===rf.EMPTY_SPACE?rf.ROAD:v)
  for(const y of [40,42,44]) for(const x of [46,47]) s.mapData.coords[map.giveIndex(x,y)]=rf.EMPTY_SPACE
  controller.selectMarketer(rf[role],false); controller.chooseCampaign(30); controller.chooseGood(rf.PIZZA); controller.chooseDuration(3)
  const ui=await mountPhoneAction()
  try {
   for(let n=0;n<3;n++) {
    expect(s.context.campaign).toBe(30+n)
    expect(controller.placeMarketingCampaign(map.giveIndex(46,40+n*2))).not.toBe(false); await nextTick()
    expect(s.campaigns).toHaveLength(n+1)
    if(n<2) { expect(s.context.marketer).toBe(rf[role]); expect(uiText(ui.root)).toContain('workingDay.phoneGroupProgress'+(n+2)); controller.cancelMarketer(); expect(s.context.campaign).toBe(31+n) }
   }
   expect(s.context.marketer).toBe(-1); expect(s.context.phoneGroupAction).toBeNull()
   expect(s.campaigns.map(c=>[c.number,c.good,c.duration])).toEqual([[30,rf.PIZZA,3],[31,rf.PIZZA,3],[32,rf.PIZZA,3]])
   expect(ui.errors).toEqual([])
  } finally { ui.app.unmount() }
 })
})
describe('phone context cross-version recovery — real action rendering', () => {
 const paths=['wire','whole-compressed','whole-raw']
 const save=path=>path==='wire'?funcs.exportFCMmodel(false,true):funcs.simpleExportWholeFCMmodel(path==='whole-raw')
 const load=(path,data)=>path==='wire'?funcs.importFCMmodel(data,false,true):funcs.simpleImportWholeFCMmodel(data,path==='whole-raw')
 function legacySave(path, secondCall=false) {
  const s=realPhoneBoard(); s.mediaLine.rulesVersion=0
  controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(30)
  s.context.mediaLineSecondCall=secondCall
  let data=path==='whole-raw'?save(path):funcs.decompressData(save(path))
  data=data.filter(v=>!(Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE) && !(v&&typeof v==='object'&&!Array.isArray(v)&&Array.isArray(v.headlines)))
  const c=path==='wire'?JSON.parse(data.find(v=>typeof v==='string'&&v.startsWith('{'))):data[20]
  delete c.phoneGroupAction
  if(!secondCall) delete c.mediaLineSecondCall
  if(path==='wire') data[data.findIndex(v=>typeof v==='string'&&v.startsWith('{'))]=JSON.stringify(c)
  return path==='whole-raw'?data:funcs.compressData(data)
 }
 for(const path of paths) it.each([1,2])(`new → legacy missing fields → new resumes after %s cards (${path})`, async count=>{
  const legacy=legacySave(path), s=realPhoneBoard()
  controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(39); controller.chooseGood(rf.PIZZA); controller.chooseDuration(2)
  for(let i=0;i<count;i++) expect(placeNext(s)).toBe(true)
  const newer=save(path), expected=JSON.parse(JSON.stringify(s.mediaLine.phoneGroups))
  const ui=await mountPhoneAction()
  try {
   expect(uiText(ui.root)).toContain('workingDay.phoneGroupProgress'+(count+1))
   expect(load(path,legacy)).not.toBe(-9999)
   // Wire saves intentionally omit subphase; enter the old marketing screen.
   s.gameflow.subphase=rf.SUBPHASE_MARKETING; await nextTick()
   expect(s.mediaLine.rulesVersion).toBe(0); expect(s.mediaLine.phoneGroups).toEqual({})
   expect(s.context.phoneGroupAction).toBeNull(); expect(s.context.mediaLineSecondCall).toBe(false)
   expect(ui.errors.map(error=>error.stack).join('\n')).toBe(''); expect(uiText(ui.root)).not.toContain('workingDay.phoneGroupProgress')
   expect(load(path,newer)).not.toBe(-9999); await nextTick()
   expect(s.mediaLine.rulesVersion).toBe(1); expect(s.mediaLine.phoneGroups).toEqual(expected)
   expect(s.context.phoneGroupAction).toEqual({group:3}); expect(s.context.campaign).toBe(39+count)
   expect(uiText(ui.root)).toContain('workingDay.phoneGroupProgress'+(count+1))
   for(let i=count;i<3;i++) { expect(placeNext(s)).toBe(true); await nextTick() }
   expect(s.campaigns.map(c=>[c.number,c.good,c.duration])).toEqual([[39,rf.PIZZA,2],[40,rf.PIZZA,2],[41,rf.PIZZA,2]])
   expect(Object.keys(s.mediaLine.phoneGroups)).toEqual(['3']); expect(s.mediaLine.phoneGroups[3].cards).toEqual([39,40,41])
   expect(s.players[0].marketers).toHaveLength(1); expect(s.context.phoneGroupAction).toBeNull(); expect(ui.errors.map(error=>error.stack).join('\n')).toBe('')
  } finally { ui.app.unmount() }
 })
 it.each(paths)('preserves explicit legacy second-token context (%s)',path=>{
  const legacy=legacySave(path,true), s=realPhoneBoard()
  controller.selectMarketer(rf.TELEMARKETER,false); expect(placeNext(s)).toBe(true)
  load(path,legacy)
  expect(s.context.phoneGroupAction).toBeNull(); expect(s.context.mediaLineSecondCall).toBe(true)
 })
 it.each(['legacy-stale','missing-lock','missing-cards','non-array-cards'])('UI guards an inconsistent %s action without changing game state',async kind=>{
  const s=realPhoneBoard(); controller.selectMarketer(rf.TELEMARKETER,false); expect(placeNext(s)).toBe(true)
  if(kind==='legacy-stale') { s.mediaLine.rulesVersion=0; s.mediaLine.phoneGroups={} }
  if(kind==='missing-lock') s.mediaLine.phoneGroups={}
  if(kind==='missing-cards') delete s.mediaLine.phoneGroups[0].cards
  if(kind==='non-array-cards') s.mediaLine.phoneGroups[0].cards={length:1}
  const before=JSON.stringify({context:s.context,media:s.mediaLine}), ui=await mountPhoneAction()
  try {
   expect(ui.errors.map(error=>error.stack).join('\n')).toBe(''); expect(uiText(ui.root)).not.toContain('workingDay.phoneGroupProgress')
   expect(JSON.stringify({context:s.context,media:s.mediaLine})).toBe(before)
  } finally { ui.app.unmount() }
 })
 it.each(paths)('rejects invalid new locks before touching a pending game (%s)',path=>{
  const s=realPhoneBoard(); controller.selectMarketer(rf.TELEMARKETER,false); expect(placeNext(s)).toBe(true)
  const valid=path==='whole-raw'?save(path):funcs.decompressData(save(path))
  for(const kind of ['unknown-version','unknown-group','missing-cards','bad-action']) {
   const data=JSON.parse(JSON.stringify(valid)), slot=data.find(v=>Array.isArray(v)?v[0]===-rf.SO_MEDIA_LINE:v&&typeof v==='object'&&Array.isArray(v.headlines))
   const locks=path==='wire'?slot[8]:slot.phoneGroups
   if(kind==='unknown-version') { if(path==='wire') slot[1]=999; else slot.rulesVersion=999 }
   if(kind==='unknown-group') { locks[4]=locks[0]; delete locks[0] }
   if(kind==='missing-cards') delete locks[0].cards
   if(kind==='bad-action') {
    const index=path==='wire'?data.findIndex(v=>typeof v==='string'&&v.startsWith('{')):20
    const c=path==='wire'?JSON.parse(data[index]):data[index]; c.phoneGroupAction.group=3
    data[index]=path==='wire'?JSON.stringify(c):c
   }
   const before=funcs.simpleExportWholeFCMmodel(true), invalid=path==='whole-raw'?data:funcs.compressData(data)
   if(path==='wire') expect(load(path,invalid)).toBe(-9999); else expect(()=>load(path,invalid)).toThrow(TypeError)
   expect(funcs.simpleExportWholeFCMmodel(true)).toEqual(before)
  }
 })
})
describe('phone save and replay compatibility', () => {
 const decode=b=>JSON.parse(pako.ungzip(Uint8Array.from(atob(b), c=>c.charCodeAt(0)),{to:'string'}))
 const encode=a=>btoa(String.fromCharCode(...new Uint8Array(pako.gzip(JSON.stringify(a)))))
 it.each([false,true])('normal/context save keeps new rules, extended IDs and whole-group reservation (context=%s)', includeContext => {
  const s=board(rf.TELEMARKETER); controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(39); controller.chooseGood(rf.PIZZA); controller.chooseDuration(2); placeNext(s)
  const encoded=funcs.exportFCMmodel(false,includeContext); const locks=JSON.parse(JSON.stringify(s.mediaLine.phoneGroups))
  s.mediaLine.rulesVersion=0; s.mediaLine.phoneGroups={}
  expect(funcs.importFCMmodel(encoded,false,includeContext)).not.toBe(-9999)
  expect(s.mediaLine.rulesVersion).toBe(1); expect(s.mediaLine.phoneGroups).toEqual(locks)
  expect(s.campaigns[0]).toMatchObject({number:39, good:rf.PIZZA, duration:2})
  expect(s.availableMarketingCampaigns.filter(n=>n>=39&&n<=41)).toEqual([])
  expect(s.availableMilestones).not.toContain(rf.FIRST_TELEMARKETER_USED)
  expect(rules.campaignSortKey(40)).toBe(9.5)
  if(includeContext) {
   expect(s.context.campaign).toBe(40); expect(s.context.phoneGroupAction).toEqual({group:3})
   expect(s.gameflow.subphase).toBe(rf.SUBPHASE_MARKETING)
   expect(s.highlights.indexesToHighlightYellow).toEqual(rules.givePossiblePositionsForMarketingCampaign(s.context.marketer,s.context.campaign,s.context.rotated))
  } else {
   expect(s.context.phoneGroupAction).toBeNull(); expect(s.context.mediaLineSecondCall).toBe(false)
  }
 })
 it.each([false,true])('whole model snapshots retain mid-action lock (raw=%s)', raw => {
  const s=board(rf.TELEMARKETER); controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(36); placeNext(s)
  const save=funcs.simpleExportWholeFCMmodel(raw)
  s.mediaLine.rulesVersion=0; s.mediaLine.phoneGroups={}; s.context.phoneGroupAction=null
  funcs.simpleImportWholeFCMmodel(save,raw)
  expect(s.mediaLine.rulesVersion).toBe(1); expect(s.context.campaign).toBe(37); expect(s.context.phoneGroupAction).toEqual({group:2})
  expect(s.mediaLine.phoneGroups[2].cards).toEqual([36])
  expect(placeNext(s)).toBe(true); expect(placeNext(s)).toBe(true)
 })
 it('unmarked old imports reset a new-game version to legacy, then new reload restores new rules', () => {
  const s=game(); const newer=funcs.exportFCMmodel(false,false); let old=decode(newer); old=old.filter(v=>!(Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE))
  expect(funcs.importFCMmodel(encode(old),false,false)).not.toBe(-9999)
  expect(s.mediaLine.rulesVersion).toBe(0); expect(rules.campaignSortKey(31)).toBe(6.6)
  expect(s.availableMarketingCampaigns.filter(n=>rf.PHONE_CAMPAIGNS.includes(n))).toEqual([30,31,32,33,34,35])
  expect(s.availableMilestones).toContain(rf.FIRST_TELEMARKETER_USED)
  funcs.importFCMmodel(newer,false,false); expect(s.mediaLine.rulesVersion).toBe(1)
 })
 it('game-over wire save retains all extended phone IDs and reservations', () => {
  const s=board(rf.TELEMARKETER); controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(39); controller.chooseDuration(2)
  for(let i=0;i<3;i++) placeNext(s)
  s.gameflow.phase=rf.PHASE_GAME_OVER
  const saved=funcs.exportFCMmodel(true,false)
  expect(funcs.importFCMmodel(saved,true,false)).not.toBe(-9999)
  expect(s.gameflow.phase).toBe(rf.PHASE_GAME_OVER); expect(s.mediaLine.rulesVersion).toBe(1)
  expect(s.campaigns.map(c=>c.number)).toEqual([39,40,41]); expect(s.mediaLine.phoneGroups[3].cards).toEqual([39,40,41])
  expect(s.availableMarketingCampaigns).not.toContain(40)
 })
 it('module-off non-draft save omits the Media Line slot', () => {
  const s=game([]); const data=decode(funcs.exportFCMmodel(false,false))
  expect(data.some(v=>Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE)).toBe(false)
  s.mediaLine.rulesVersion=1
  expect(funcs.importFCMmodel(encode(data),false,false)).not.toBe(-9999)
  expect(s.mediaLine.rulesVersion).toBe(0); expect(s.startingOptions.mediaLine).toBe(false)
 })
 it('draft-phase save keeps the revision, and drafting Media Line keeps the game modern after reload', () => {
  const s=game([rf.SO_DRAFT_MODULE_BREAKER]); expect(s.gameflow.phase).toBe(rf.PHASE_SETUP_MODULES)
  const draftSave=funcs.exportFCMmodel(false,false), draftData=decode(draftSave)
  const slot=draftData.find(v=>Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE)
  expect(slot).toBeTruthy(); expect(slot[1]).toBe(3); expect(slot[7]).toBe(1); expect(slot).toHaveLength(9); expect(s.startingOptions.mediaLine).toBe(false)
  // Reload during drafting: the revision must survive before the module is active.
  s.mediaLine.rulesVersion=0
  expect(funcs.importFCMmodel(draftSave,false,false)).not.toBe(-9999)
  expect(s.mediaLine.rulesVersion).toBe(1)
  // saveModuleSelection() applies the drafted option before exporting the save.
  s.externalStartingOptions.push(String(rf.SO_MEDIA_LINE))
  window.initData.startingOptions=[...window.initData.startingOptions,String(rf.SO_MEDIA_LINE)]
  model.setInternalStartingOptions(s.externalStartingOptions); model.setupKetchupExpansion(s.players.length)
  expect(s.startingOptions.mediaLine).toBe(true)
  const draftedSave=funcs.exportFCMmodel(false,false), draftedData=decode(draftedSave)
  expect(draftedData.some(v=>Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE)).toBe(true)
  s.mediaLine.rulesVersion=0
  expect(funcs.importFCMmodel(draftedSave,false,false)).not.toBe(-9999)
  expect(s.mediaLine.rulesVersion).toBe(1)
  expect(s.availableMarketingCampaigns.filter(n=>rf.PHONE_CAMPAIGNS.includes(n))).toHaveLength(12)
  expect(s.availableMilestones).not.toContain(rf.FIRST_TELEMARKETER_USED)
 })
 it('an old draft save stays legacy when Media Line is drafted later', () => {
  const s=game([rf.SO_DRAFT_MODULE_BREAKER]); let data=decode(funcs.exportFCMmodel(false,false))
  data=data.filter(v=>!(Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE))
  s.mediaLine.rulesVersion=0
  expect(funcs.importFCMmodel(encode(data),false,false)).not.toBe(-9999)
  expect(s.mediaLine.rulesVersion).toBe(0)
  s.externalStartingOptions.push(String(rf.SO_MEDIA_LINE))
  window.initData.startingOptions=[...window.initData.startingOptions,String(rf.SO_MEDIA_LINE)]
  model.setInternalStartingOptions(s.externalStartingOptions); model.setupKetchupExpansion(s.players.length)
  expect(s.availableMarketingCampaigns.filter(n=>rf.PHONE_CAMPAIGNS.includes(n))).toHaveLength(6)
  expect(s.availableMilestones).toContain(rf.FIRST_TELEMARKETER_USED)
  const oldDrafted=funcs.exportFCMmodel(false,false), oldSlot=decode(oldDrafted).find(v=>Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE)
  expect(oldSlot[1]).toBe(2)
  s.mediaLine.rulesVersion=1
  expect(funcs.importFCMmodel(oldDrafted,false,false)).not.toBe(-9999)
  expect(s.mediaLine.rulesVersion).toBe(0)
  expect(s.availableMarketingCampaigns.filter(n=>rf.PHONE_CAMPAIGNS.includes(n))).toHaveLength(6)
 })
 it.each([false,true])('new schema coexists with Stadium/Labor Market/Bailout/SBD tails (raw=%s)', raw => {
  const s=game(['50','47','48','49','53']); s.gameflow.turn=5; s.gameflow.phase=rf.PHASE_WORKING_DAY
  s.stadium.gamesPlayed=2; s.laborMarket.removedTemporaryWorkers=2
  Object.assign(s.bailout,{pending:true,pool:{[rf.CAMPAIGN_MANAGER]:1},claims:{0:rf.CAMPAIGN_MANAGER},order:[0,1]})
  s.mediaLine.headlines=[{turn:4,playerIndex:0,value:5}]
  const expected=JSON.parse(JSON.stringify({stadium:s.stadium,labor:s.laborMarket,bailout:s.bailout,media:s.mediaLine}))
  const save=raw?funcs.simpleExportWholeFCMmodel(true):funcs.exportFCMmodel(false,false)
  s.stadium.gamesPlayed=99; s.bailout.pending=false; s.laborMarket.removedTemporaryWorkers=99; s.mediaLine.rulesVersion=0
  if(raw) funcs.simpleImportWholeFCMmodel(save,true); else expect(funcs.importFCMmodel(save,false,false)).not.toBe(-9999)
  expect(s.stadium).toEqual(expected.stadium); expect(s.laborMarket).toEqual(expected.labor); expect(s.bailout).toEqual(expected.bailout); expect(s.mediaLine).toEqual(expected.media)
 })
 it.each(['unknown','duplicate','truncated','bad-lock','owner-out-of-range','bad-context'])('rejects %s rule extension before mutating the game', kind => {
  const s=game(), arr=decode(funcs.exportFCMmodel(false,false)); const i=arr.findIndex(v=>Array.isArray(v)&&v[0]===-rf.SO_MEDIA_LINE)
  if(kind==='unknown') arr[i][1]=999
  if(kind==='duplicate') arr.push(arr[i])
  if(kind==='truncated') arr[i]=[-rf.SO_MEDIA_LINE,3]
  if(kind==='bad-lock') { arr[i][8]={'4':{owner:0,marketer:59,cards:[39],good:0,duration:2}} }
  if(kind==='owner-out-of-range') { arr[i][8]={'0':{owner:2,marketer:59,cards:[30],good:0,duration:2}} }
  if(kind==='bad-context') arr.push(JSON.stringify({phoneGroupAction:{group:4},campaign:30,marketer:59,good:0,duration:2}))
  const before=funcs.simpleExportWholeFCMmodel(true)
  expect(funcs.importFCMmodel(encode(arr),false,false)).toBe(-9999)
  expect(funcs.simpleExportWholeFCMmodel(true)).toEqual(before)
 })
})
describe('real replay snapshots', () => {
 it('reconstructs three phone tokens, one employee and locks, then moves backward/forward without aliasing', async () => {
  const s=board(rf.TELEMARKETER); s.history.push([rf.HIST_HIRE,0,1000,[rf.TELEMARKETER]], [rf.HIST_CHOOSE_STRUCTURE,0,1001,[[rf.TELEMARKETER],[]]])
  controller.selectMarketer(rf.TELEMARKETER,false); controller.chooseCampaign(36); controller.chooseDuration(2)
  for(let i=0;i<3;i++) placeNext(s)
  const count=s.history.length; globalThis.document={querySelector:()=>null}
  await replay.generateReplayData()
  expect(s.campaigns.map(c=>c.number)).toEqual([36,37,38])
  expect(s.players[0].marketers).toHaveLength(1); expect(s.mediaLine.phoneGroups[2].cards).toEqual([36,37,38])
  expect(s.history).toHaveLength(count)
  const snapshot=JSON.stringify(s.replayData)
  replay.goToReplayStep(0); expect(s.campaigns).toHaveLength(0); expect(s.mediaLine.rulesVersion).toBe(1)
  replay.goToReplayStep(count-1); expect(s.campaigns).toHaveLength(3); expect(s.history).toHaveLength(count)
  expect(JSON.stringify(s.replayData)).toBe(snapshot)
 })
 it.each(['wire-index','good','marketer-format'])('rejects malformed new phone replay %s before mutation', kind => {
  const s=board(rf.TELEMARKETER), data=[30,100,rf.BURGER,0,2]
  if(kind==='wire-index') data[1]=-1
  if(kind==='good') data[2]=rf.COFFEE
  if(kind==='marketer-format') data.push([rf.TELEMARKETER,rf.TV_ANNOUNCER])
  const before=funcs.simpleExportWholeFCMmodel(true)
  expect(()=>replay.replayStartMarketingCampaign(0,0,data)).toThrow(TypeError)
  expect(funcs.simpleExportWholeFCMmodel(true)).toEqual(before)
 })
 it('raw undo snapshots stay immutable when continuing a phone action after restore', () => {
  const s=board(rf.TELEMARKETER); controller.selectMarketer(rf.TELEMARKETER,false); placeNext(s)
  const saved=funcs.simpleExportWholeFCMmodel(true), before=JSON.stringify(saved)
  funcs.simpleImportWholeFCMmodel(saved,true); placeNext(s); placeNext(s)
  expect(JSON.stringify(saved)).toBe(before)
 })
 it('legacy replay setup retains six phones and its milestone', () => {
  const s=game(); s.mediaLine.rulesVersion=0; replay.resetDataForReplay()
  expect(s.availableMarketingCampaigns.filter(n=>rf.PHONE_CAMPAIGNS.includes(n))).toEqual([30,31,32,33,34,35])
  expect(s.availableMilestones).toContain(rf.FIRST_TELEMARKETER_USED)
 })
})
describe('phone artwork and visible wording', () => {
 it('phone operation copy is short in all six languages and omits compatibility and lock details', async()=>{
  const {default:en}=await import('../locales/en/workingDay.js')
  const {default:zh}=await import('../locales/zh-hans.js')
  const words=[en.workingDay,zh.workingDay]
  for(const lang of ['de','es','fr','it']){const {default:extra}=await import(`../locales/${lang}.extra.js`);words.push(extra.workingDay)}
  for(const text of words){expect(text.phoneGroupRules.length).toBeLessThan(160);expect(text.phoneGroupProgress.length).toBeLessThan(50)}
  expect(zh.workingDay.phoneGroupRules).toBe('选择一组电话牌，同商品、同时长，有位置须放满3张。')
  expect(zh.workingDay.phoneGroupProgress).toBe('正在放置第 {current}/3 张。')
 })
 it('uses actual new-number images for all twelve cards, retaining legacy artwork', async () => {
  const s=game(); const view=await import('./FCMview')
  for(let n=30;n<=41;n++) expect(view.getImage('campaign_'+n)).toContain('marketing_phone_'+(65+10*Math.floor((n-30)/3))+'_v1.jpg')
  expect(fs.existsSync(new URL('../../../static/FCM/images/e_telemarketer_en.jpg',import.meta.url))).toBe(true)
  expect(fs.existsSync(new URL('../../../static/FCM/images/e_telemarketer_legacy.jpg',import.meta.url))).toBe(true)
  s.mediaLine.rulesVersion=0; expect(view.getImage('campaign_31')).toContain('marketing31.jpg')
  expect(view.getImage('emp_'+rf.TELEMARKETER)).toContain('e_telemarketer_legacy.jpg')
 })
 it('modern phone UI cannot offer legacy skip and exposes the three-card rule', () => {
  const action=fs.readFileSync(new URL('../components/ActionAreaWorkingDay.vue',import.meta.url),'utf8')
  expect(action).toContain('!phone.modern()')
  expect(action).toContain('phoneGroupProgress')
  const zh=fs.readFileSync(new URL('../locales/zh-hans.js',import.meta.url),'utf8')
  expect(zh).toContain('放置电话或更低级的广告，持续时间1—3回合')
  const help=fs.readFileSync(new URL('../../../templates/FCM/fanExpansionsHelp.html',import.meta.url),'utf8')
  expect(help).toContain('6.5 / 7.5 / 8.5 / 9.5')
  expect(help).not.toContain('unlocks a permanent group bonus')
 })
})
describe('AI uses the same validated whole-group path', () => {
 it.each([30,33,36,39])('places whole group %s for one AI marketer rather than inserting one token', async number => {
  const phone=await import('./FCMphone'); const s=board(rf.TELEMARKETER)
  expect(phone.autoPlace(rf.TELEMARKETER,number,rf.BURGER,2)).toBe(3)
  expect(s.campaigns.map(c=>c.number)).toEqual([number,number+1,number+2])
  expect(s.players[0].marketers).toHaveLength(1)
  expect(s.mediaLine.phoneGroups[(number-30)/3].cards).toEqual([number,number+1,number+2])
 })
})
export { game, board, placeNext }
