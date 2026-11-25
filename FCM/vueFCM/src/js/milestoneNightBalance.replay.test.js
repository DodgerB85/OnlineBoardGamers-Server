import fs from 'node:fs'
import {beforeAll,it,expect,vi} from 'vitest'
import {createPinia,setActivePinia,getActivePinia} from 'pinia'
if (!globalThis.pako) (0,eval)(fs.readFileSync(new URL('../../../../Lobby/static/Lobby/common/pakoLib.js',import.meta.url),'utf8'))
let rf,model,map,rules,controller,funcs,replay,useModelStore,store
const STARTING_MAP=[17,0,4,0,19,3,18,0,12,2,24,2,9,0,0,2,13,2]
beforeAll(async()=>{
 globalThis.window={performance}
 globalThis.document={addEventListener(){},querySelector(){return null}}
 globalThis.alert=()=>{}
 vi.stubGlobal('fetch',()=>{throw Error('Task5 forbids network')})
 rf=await import('./FCMreference.js');model=await import('./FCMmodel.js');map=await import('./FCMmap.js');rules=await import('./FCMrules.js');controller=await import('./FCMcontroller.js');funcs=await import('./FCMfuncs.js');replay=await import('./FCMreplay.js');({useModelStore}=await import('../stores/FCMstore.js'))
})
// Local deterministic fixture, not an online game: actual restaurant placement,
// history-producing setup/hire, and controller marketing; no fake reward history.
function fresh(){
 setActivePinia(createPinia());store=useModelStore()
 store.externalStartingOptions=[21,54]
 window.initData={startingOptions:store.externalStartingOptions,playerNames:['P0','P1'],startingMap:STARTING_MAP}
 model.setInternalStartingOptions(store.externalStartingOptions)
 model.setupNewGame(window.initData)
 store.mapData.tiles=map.expandMapToFullGrid(STARTING_MAP,2);map.initCoords()
 for(let p=0;p<2;p++){
  const index=rules.givePossiblePositionsForNewRestaurant(0,false)[0]
  model.addRestaurant_core(p,index,0,true)
  model.addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION,[funcs.exportIndex(index),0],p,0)
  store.players[p].employees=[13];store.availableEmployees[13]--
  model.addHistory(rf.HIST_HIRE,[13],p,0)
 }
 store.gameflow.turn=1;model.addHistory(rf.HIST_NEW_TURN,[1,store.bank,[0,0]],-1,0)
 for(let p=0;p<2;p++) model.addHistory(rf.HIST_CHOOSE_STRUCTURE,[[13],[]],p,0)
 store.gameflow.phase=rf.PHASE_WORKING_DAY;store.gameflow.subphase=rf.SUBPHASE_MARKETING
 store.gameflow.fullTurnOrder=[0,1];store.gameflow.turnOrder=[0,1]
 return store
}
function exhaustRewards(){
 const hired=[]
 for(const employee of [27,23]) while(store.availableEmployees[employee]>0){
  model.giveEmployeeIfAvailable(1,employee);hired.push(employee)
 }
 model.addHistory(rf.HIST_HIRE,hired,1,0)
}
function market(choice){
 controller.selectMarketer(13)
 const index=store.highlights.indexesToHighlightYellow[0]
 expect(index).toBeGreaterThanOrEqual(0)
 expect(controller.placeMarketingCampaign(index,choice)).toBeUndefined()
}
async function normalIOSave(){
 const io=await import('../backend/FCM_IO.js')
 const {usePersonalStore}=await import('../stores/FCMpersonal.js')
 const personal=usePersonalStore();personal.gameID='task5-isolated';personal.latestUpdate='1';personal.liveWS=false
 document.cookie='csrftoken=task5-local'
 let posted
 const offline=globalThis.fetch
 // Only replace the transport, returning a minimal explicit protocol ACK.
 // Serialized gameData is produced by production saveGameNormal itself.
 globalThis.fetch=vi.fn(async(url,options)=>{
  expect(url).toBe('/FCM/processTurn/')
  expect(options.method).toBe('POST')
  posted=JSON.parse(options.body)
  return {ok:true,status:200,json:async()=>({latestUpdate:2,secondsToNextKickout:99999})}
 })
 try{
  expect(await io.saveGameNormal(false,false,false,{})).toBe(true)
  expect(posted.action).toBe('saveNormal')
  expect(posted.gameData).toBe(funcs.exportFCMmodel(false,false))
  return posted.gameData
 }finally{globalThis.fetch=offline;clearInterval(personal.kickoutCountdownIntervalTimer);clearInterval(personal.flexiKickoutCountdownIntervalTimer)}
}
async function assertNoReplayRewardUI(){
 const {createRenderer,h,nextTick}=await import('vue')
 const {default:ActionAreaWorkingDay}=await import('../components/ActionAreaWorkingDay.vue')
 const {default:i18n}=await import('../i18n.js')
 const make=(type,text='')=>({type,text,children:[],props:{},parent:null,style:{},classList:{add(){},remove(){}}})
 const renderer=createRenderer({createElement:make,createText:t=>make('text',t),createComment:t=>make('comment',t),setText:(n,t)=>{n.text=t},setElementText:(n,t)=>{n.text=t;n.children=[]},patchProp:(n,k,_,v)=>{n.props[k]=v},insert(n,p,a){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1)},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]})
 const {usePersonalStore}=await import('../stores/FCMpersonal.js')
 usePersonalStore().pov=0;store.viewSettings.showReplay=true
 const root=make('root'),before=JSON.stringify(rewards())
 const app=renderer.createApp({render:()=>h(ActionAreaWorkingDay)})
 app.use(getActivePinia());app.use(i18n)
 try{
  app.mount(root);await nextTick()
  const all=n=>[n,...n.children.flatMap(all)]
  expect(all(root).filter(n=>n.props['data-trainee-reward']!=null)).toHaveLength(0)
  expect(controller.marketingTraineeRewardPending()).toBe(false)
  expect(JSON.stringify(rewards())).toBe(before)
 }finally{app.unmount()}
}
function rewards(){return {beach:store.players.map(p=>[...p.beach]),employees:store.players.map(p=>[...p.employees]),marketers:store.players.map(p=>p.marketers.map(m=>({campaign:m.campaign,marketer:m.marketer,nightShift:m.nightShift===true}))),ms:store.players.map(p=>[...p.milestones]),stock:[store.availableEmployees[27],store.availableEmployees[23]],availableCampaigns:[...store.availableMarketingCampaigns],campaigns:store.campaigns.map(c=>({...c}))}}
it('actual marketing survives normal context-free save/import and real replay stepping with the chosen employee',async()=>{
 fresh();market(27)
 const earned=store.history.filter(h=>h[0]===rf.HIST_NEW_MILESTONE)
 expect(earned.map(h=>h[3])).toEqual([[18],[19,27]])
 expect(store.history.indexOf(earned[1])).toBeLessThan(store.history.findIndex(h=>h[0]===rf.HIST_START_MARKETING_CAMPAIGN))
 const final=rewards(),history=JSON.parse(JSON.stringify(store.history))
 funcs.importFCMmodel(await normalIOSave(),false,false)
 expect(rewards(),JSON.stringify({actual:rewards(),expected:final})).toEqual(final);expect(store.history).toEqual(history)
 await replay.generateReplayData()
 expect(rewards()).toEqual(final)
 replay.performStep(-1);replay.performStep(1)
 expect(rewards()).toEqual(final)
 expect(store.history).toEqual(history)
 await assertNoReplayRewardUI()
})
it.each([23,null])('actual marketing choice %s survives ordinary save and repeated replay generation without guessing from stock',async choice=>{
 fresh()
 if(choice===null)exhaustRewards()
 market(choice)
 const final=rewards(),hist=JSON.parse(JSON.stringify(store.history))
 const saved=await normalIOSave()
 funcs.importFCMmodel(saved,false,false)
 expect(rewards()).toEqual(final)
 for(let n=0;n<2;n++){
  await replay.generateReplayData()
  // Histories reconstruct real depleted stocks before the explicit null reward.
  expect(store.players[0].beach).toEqual(choice===null?[]:[choice])
  expect(store.players[0].milestones).toEqual([18,19])
  const replayFinal=rewards()
  for(let k=0;k<3;k++){
   replay.performStep(-99);expect(store.players[0].beach).toEqual([])
   replay.performStep(99);expect(rewards()).toEqual(replayFinal)
   replay.performStep(-1);replay.performStep(1);expect(rewards()).toEqual(replayFinal)
  }
  expect(store.history).toEqual(hist)
  await assertNoReplayRewardUI()
 }
})
it.each([27,23,null])('whole snapshots and real subphase undo preserve new payload %s without aliasing live history',choice=>{
 fresh()
 if(choice===null)exhaustRewards()
 store.subphaseResetData=funcs.simpleExportWholeFCMmodel()
 const before=rewards()
 market(choice)
 const final=rewards(),hist=JSON.parse(JSON.stringify(store.history))
 const raw=funcs.simpleExportWholeFCMmodel(true),compressed=funcs.simpleExportWholeFCMmodel()
 store.history.at(-2)[3][1]=999
 expect(raw[13]).toEqual(hist)
 for(const [saved,isRaw] of [[raw,true],[compressed,false]]){
  funcs.simpleImportWholeFCMmodel(saved,isRaw)
  expect(rewards()).toEqual(final);expect(store.history).toEqual(hist)
 }
 controller.resetSubphase()
 expect(rewards()).toEqual(before)
 expect(store.history.some(h=>h[0]===rf.HIST_NEW_MILESTONE)).toBe(false)
 market(choice)
 expect(rewards()).toEqual(final)
})
it('two players actual marketing choices remain separate at each earned step and across repeated full traversals',async()=>{
 fresh();market(27);store.gameflow.turnOrder=[1,0];market(23)
 const final=rewards(),hist=JSON.parse(JSON.stringify(store.history))
 funcs.importFCMmodel(await normalIOSave(),false,false)
 for(let gen=0;gen<2;gen++){
  await replay.generateReplayData();expect(rewards(),JSON.stringify({actual:rewards(),expected:final})).toEqual(final)
  const first=store.computedHistory.findIndex(h=>h[0]===rf.HIST_NEW_MILESTONE&&h[3][0]===19)
  replay.goToReplayStep(first);expect(store.players.map(p=>p.beach)).toEqual([[27],[]])
  for(let i=0;i<store.replayData.length;i++)replay.goToReplayStep(i)
  expect(rewards()).toEqual(final)
  for(let i=store.replayData.length-1;i>=0;i--)replay.goToReplayStep(i)
  expect(store.players.map(p=>p.beach)).toEqual([[],[]])
  expect(store.history).toEqual(hist)
 }
})
it.each([{duration:1,balanced:true},{duration:2,balanced:true},{duration:1,balanced:false},{duration:2,balanced:false}])('night shift actual second marketing $duration with balanced=$balanced survives replay alongside the first and only one gift',async({duration,balanced})=>{
 fresh();store.externalStartingOptions.push(rf.SO_NIGHT_SHIFT);store.startingOptions.nightShift=true
 if(!balanced)store.startingOptions.milestoneNightBalance=false
 store.players[0].employees.push(rf.NIGHT_SHIFT_MANAGER)
 // This fixture establishes the original on-duty organization in the real
 // restructure history before executing the two controller placements.
 const structure=store.history.filter(h=>h[0]===rf.HIST_CHOOSE_STRUCTURE&&h[1]===0).at(-1)
 structure[3][0].push(rf.NIGHT_SHIFT_MANAGER)
 market(27);expect(store.context.nightShift).toBe(true)
 controller.chooseDuration(duration)
 expect(controller.placeMarketingCampaign(store.highlights.indexesToHighlightYellow[0])).toBeUndefined()
 const final=rewards(),hist=JSON.parse(JSON.stringify(store.history))
 const bound=JSON.parse(JSON.stringify(store.players.map(p=>p.marketers)))
 const actions=hist.filter(h=>[rf.HIST_START_MARKETING_CAMPAIGN,rf.HIST_START_NS_CAMPAIGN].includes(h[0]))
 expect(actions.map(h=>h[0])).toEqual([rf.HIST_START_MARKETING_CAMPAIGN,rf.HIST_START_NS_CAMPAIGN])
 expect(final.employees[0].filter(e=>e===13)).toHaveLength(0)
 expect(bound[0].map(m=>m.nightShift)).toEqual(duration===2?[true,false]:[false,true])
 console.log('TASK5_FIX1_TRUE_NS_LIVE',JSON.stringify({duration,balanced,history:actions,employees:final.employees,bound,campaigns:final.campaigns}))
 expect(final.campaigns).toHaveLength(2)
 funcs.importFCMmodel(await normalIOSave(),false,false)
 for(let gen=0;gen<2;gen++){
  await replay.generateReplayData();expect(rewards(),JSON.stringify({actual:rewards(),expected:final})).toEqual(final)
  expect(store.players.map(p=>p.marketers)).toEqual(bound)
  for(let n=0;n<3;n++){
   replay.performStep(-99);replay.performStep(99);expect(rewards()).toEqual(final)
   expect(store.players.map(p=>p.marketers)).toEqual(bound)
   replay.performStep(-1);replay.performStep(1);expect(rewards()).toEqual(final)
  }
 }
 console.log('TASK5_FIX1_TRUE_NS_REPLAY',JSON.stringify({duration,balanced,employees:store.players.map(p=>p.employees),bound:store.players.map(p=>p.marketers)}))
 expect(store.history).toEqual(hist)
 expect(controller.marketingTraineeRewardPending()).toBe(false)
})
it.each([true,false])('a real legacy marketing history replays its old double gift irrespective of current balance flag %s',async enabled=>{
 fresh();store.startingOptions.milestoneNightBalance=false
 market()
 expect(store.history.find(h=>h[0]===rf.HIST_NEW_MILESTONE&&h[3][0]===19)[3]).toEqual([19])
 const final=rewards(),hist=JSON.parse(JSON.stringify(store.history))
 if(!enabled)store.externalStartingOptions=store.externalStartingOptions.filter(x=>x!==rf.SO_MILESTONE_NIGHT_BALANCE)
 model.setInternalStartingOptions(store.externalStartingOptions)
 funcs.importFCMmodel(await normalIOSave(),false,false)
 for(let n=0;n<2;n++){
  await replay.generateReplayData();expect(rewards(),JSON.stringify({actual:rewards(),expected:final})).toEqual(final)
  replay.performStep(-99);replay.performStep(99);expect(rewards()).toEqual(final)
  expect(store.history).toEqual(hist)
 }
})
it('explicit null never coerces to zero or missing choice, even with both reconstructed stocks available',()=>{
 fresh();const stock=[...store.availableEmployees]
 replay.replayGetMS(0,0,[19,null])
 expect(store.players[0].milestones).toContain(19)
 expect(store.players[0].beach).toEqual([])
 expect(store.availableEmployees).toEqual(stock)
})
it('choice payload defines replay even when the current flag is disabled',()=>{
 fresh();store.startingOptions.milestoneNightBalance=false
 replay.replayGetMS(0,0,[19,23]);replay.replayGetMS(0,0,[19,23])
 expect(store.players[0].beach).toEqual([23])
})
it('real adjacent second marketing history is retained while the first reward precedes its own campaign',async()=>{
 fresh()
 model.giveEmployeeIfAvailable(0,13);model.addHistory(rf.HIST_HIRE,[13],0,0)
 store.players[0].beach.pop();store.players[0].employees.push(13)
 model.addHistory(rf.HIST_CHOOSE_STRUCTURE,[[13,13],[]],0,0)
 market(23);market()
 const final=rewards(),hist=JSON.parse(JSON.stringify(store.history))
 expect(store.history.filter(h=>h[0]===rf.HIST_START_MARKETING_CAMPAIGN)).toHaveLength(2)
 funcs.importFCMmodel(await normalIOSave(),false,false)
 await replay.generateReplayData();expect(rewards(),JSON.stringify({actual:rewards(),expected:final})).toEqual(final)
 const earned=store.computedHistory.findIndex(h=>h[0]===rf.HIST_NEW_MILESTONE&&h[3][0]===19)
 replay.goToReplayStep(earned-1);expect(store.players[0].beach).toEqual([])
 replay.performStep(1);expect(store.players[0].beach).toEqual([23]);expect(store.campaigns).toHaveLength(0)
 replay.performStep(1);expect(store.campaigns).toHaveLength(1)
 replay.performStep(1);expect(store.campaigns).toHaveLength(2)
 expect(rewards()).toEqual(final);expect(store.history).toEqual(hist)
})
// Quality-review counterexample: do not call the NS replay handler directly.
// Both histories below must come from real, distinct controller selections.
it.each([false,true].flatMap(nightModule=>[[1,2],[1,1],[2,1],[2,2]].map(([firstDuration,secondDuration])=>({nightModule,firstDuration,secondDuration}))))('fix1 ordinary distinct trainees, module=$nightModule durations=$firstDuration/$secondDuration never swap identities',async({nightModule,firstDuration,secondDuration})=>{
 fresh()
 if(nightModule){store.externalStartingOptions.push(rf.SO_NIGHT_SHIFT);store.startingOptions.nightShift=true}
 model.giveEmployeeIfAvailable(0,13);model.addHistory(rf.HIST_HIRE,[13],0,0)
 store.players[0].beach.pop();store.players[0].employees.push(13)
 model.addHistory(rf.HIST_CHOOSE_STRUCTURE,[[13,13],[]],0,0)
 const employeeCount=()=>store.players[0].employees.filter(e=>e===13).length
 expect(employeeCount()).toBe(2)
 controller.selectMarketer(13);controller.chooseDuration(firstDuration)
 expect(controller.placeMarketingCampaign(store.highlights.indexesToHighlightYellow[0],23)).toBeUndefined()
 expect(employeeCount()).toBe(1);expect(store.context.nightShift).toBe(false)
 controller.selectMarketer(13);controller.chooseDuration(secondDuration)
 expect(controller.placeMarketingCampaign(store.highlights.indexesToHighlightYellow[0])).toBeUndefined()
 expect(employeeCount()).toBe(0)
 const campaigns=store.history.filter(h=>[rf.HIST_START_MARKETING_CAMPAIGN,rf.HIST_START_NS_CAMPAIGN].includes(h[0]))
 expect(campaigns.map(h=>h[0])).toEqual([rf.HIST_START_MARKETING_CAMPAIGN,rf.HIST_START_MARKETING_CAMPAIGN])
 expect(store.campaigns.map(c=>c.duration)).toEqual([firstDuration,secondDuration])
 const final=rewards(),bound=JSON.parse(JSON.stringify(store.players.map(p=>p.marketers))),hist=JSON.parse(JSON.stringify(store.history))
 expect(bound[0].map(m=>m.nightShift)).toEqual([false,false])
 console.log('TASK5_FIX1_ORDINARY_LIVE',JSON.stringify({nightModule,history:campaigns,employees:final.employees,bound,campaigns:final.campaigns}))
 funcs.importFCMmodel(await normalIOSave(),false,false)
 expect(rewards()).toEqual(final)
 for(let generation=0;generation<2;generation++){
  await replay.generateReplayData()
  expect(rewards()).toEqual(final);expect(store.players.map(p=>p.marketers)).toEqual(bound)
  for(let n=0;n<3;n++){
   replay.performStep(-99);replay.performStep(99)
   expect(rewards()).toEqual(final);expect(store.players.map(p=>p.marketers)).toEqual(bound)
   replay.performStep(-1);replay.performStep(1);expect(rewards()).toEqual(final)
  }
  expect(store.history).toEqual(hist)
 }
 console.log('TASK5_FIX1_ORDINARY_REPLAY',JSON.stringify({nightModule,employees:store.players.map(p=>p.employees),bound:store.players.map(p=>p.marketers)}))
})
it('old single-slot 19 remains a double gift even when the current room enables balance',()=>{
 fresh()
 replay.replayGetMS(0,0,[19])
 expect(store.players[0].milestones).toContain(19)
 expect(store.players[0].beach).toEqual([27,23])
 replay.replayGetMS(0,0,[19])
 expect(store.players[0].beach).toEqual([27,23])
})
