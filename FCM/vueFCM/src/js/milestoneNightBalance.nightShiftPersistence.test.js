import fs from 'node:fs'
import {beforeAll,it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
if(!globalThis.pako)(0,eval)(fs.readFileSync(new URL('../../../../Lobby/static/Lobby/common/pakoLib.js',import.meta.url),'utf8'))
let rf,model,map,rules,controller,funcs,replay,plyr,useModelStore,usePersonalStore,store
const STARTING_MAP=[17,0,4,0,19,3,18,0,12,2,24,2,9,0,0,2,13,2]
beforeAll(async()=>{
 globalThis.window={performance};globalThis.document={addEventListener(){},querySelector(){return null}};globalThis.alert=()=>{}
 vi.stubGlobal('fetch',()=>{throw Error('Task8 no external network')})
 rf=await import('./FCMreference.js'); model=await import('./FCMmodel.js');map=await import('./FCMmap.js'); rules=await import('./FCMrules.js');controller=await import('./FCMcontroller.js'); funcs=await import('./FCMfuncs.js');replay=await import('./FCMreplay.js');plyr=await import('./FCMplayer.js')
 ;({useModelStore}=await import('../stores/FCMstore.js'));({usePersonalStore}=await import('../stores/FCMpersonal.js'))
})
function choose(employee,origin=2){store.context.selectedEmployeeToTrainData={employee,origin,...(origin===2?{sourceIndex:0}:{})}}
function fresh(source=6){
 setActivePinia(createPinia());store=useModelStore();usePersonalStore().pov=0
 store.externalStartingOptions=[21,54,rf.SO_NIGHT_SHIFT]
 window.initData={startingOptions:store.externalStartingOptions,playerNames:['P0','P1'],startingMap:STARTING_MAP}
 model.setInternalStartingOptions(store.externalStartingOptions);model.setupNewGame(window.initData)
 store.mapData.tiles=map.expandMapToFullGrid(STARTING_MAP,2);map.initCoords()
 for(let p=0;p<2;p++){
  const index=rules.givePossiblePositionsForNewRestaurant(0,false)[0]
  model.addRestaurant_core(p,index,0,true);model.addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION,[funcs.exportIndex(index),0],p,0)
 }
 // Establish the owned cards with existing official hiring/history rules.
 store.players[1].employees=[-1,-1,-1]
 for(const e of [5,13,0])model.giveEmployeeIfAvailable(0,e)
 model.addHistory(rf.HIST_HIRE,[5,13,0],0,0)
 store.gameflow.turn=1;model.addHistory(rf.HIST_NEW_TURN,[1,store.bank,[0,0]],-1,0)
 Object.assign(store.gameflow,{phase:rf.PHASE_WORKING_DAY,subphase:rf.SUBPHASE_TRAINING,fullTurnOrder:[0,1],turnOrder:[0,1]})
 store.players[0].ceoAction=rf.CEO_ACTION_COACH
 if(source===6){
  store.players[0].employees=[13,-1,-1];store.players[0].beach=[5,0]
  model.addHistory(rf.HIST_CHOOSE_STRUCTURE,[[13],[5,0]],0,0)
  choose(5,0);controller.trainEmployee(6,1);controller.endWorkingDaySubphase()
  expect(store.players[0].beach).toEqual([0,6]);store.context.justTrained=[]
 }
 store.players[0].employees=[source,13,0,...Array(source===6?3:2).fill(-1)];store.players[0].beach=[]
 model.addHistory(rf.HIST_CHOOSE_STRUCTURE,[[source,13,0],[]],0,0)
 plyr.awardMilestone(0,rf.FIRST_LEMONADE_SOLD)
 store.gameflow.subphase=rf.SUBPHASE_TRAINING
 return store
}
function domain(){return JSON.parse(JSON.stringify({employees:store.players.map(p=>p.employees),beach:store.players.map(p=>p.beach),stock:store.availableEmployees,history:store.history}))}
async function saveNormal(){
 const io=await import('../backend/FCM_IO.js'),personal=usePersonalStore();personal.gameID='task8-offline';personal.latestUpdate='1';personal.liveWS=false;document.cookie='csrftoken=task8-local'
 let posted;const offline=fetch
 globalThis.fetch=vi.fn(async(url,options)=>{
  expect(url).toBe('/FCM/processTurn/');expect(options.method).toBe('POST');posted=JSON.parse(options.body)
  return {ok:true,status:200,json:async()=>({latestUpdate:2,secondsToNextKickout:99999})}
 })
 try{expect(await io.saveGameNormal(false,false,false,{})).toBe(true);expect(posted.action).toBe('saveNormal');expect(posted.gameData).toBe(funcs.exportFCMmodel(false,false));return posted.gameData}
 finally{globalThis.fetch=offline;clearInterval(personal.kickoutCountdownIntervalTimer);clearInterval(personal.flexiKickoutCountdownIntervalTimer)}
}
it.each([5,6])('source %s new route conserves CEO position and stock through actual ordinary save/import and generateReplayData stepping',async source=>{
 fresh(source);const before=domain();choose(source);controller.trainEmployee(47,source===5?2:1)
 expect(store.players[0].employees).not.toContain(47);expect(store.context.justTrained).toHaveLength(1)
 controller.endWorkingDaySubphase();expect(store.players[0].employees).toEqual([47,13,0]);const final=domain()
 funcs.importFCMmodel(await saveNormal(),false,false);expect(domain()).toEqual(final)
 for(let gen=0;gen<2;gen++){
  await replay.generateReplayData();expect(domain()).toEqual(final)
  const trainingStep=store.computedHistory.findIndex(h=>h[0]===rf.HIST_TRAIN&&h[3][0]===source+50&&h[3][1]===47)
  expect(trainingStep).toBeGreaterThan(0)
  replay.goToReplayStep(trainingStep-1)
  expect(store.players[0].employees[0]).toBe(source);expect(store.players[0].employees.includes(47)).toBe(false)
  replay.goToReplayStep(trainingStep);expect(store.players[0].employees).toEqual([47,13,0]);expect(domain().stock).toEqual(final.stock)
  replay.performStep(-1);replay.performStep(1);expect(domain()).toEqual(final)
 }
 expect(before.stock[47]-final.stock[47]).toBe(1)
})
it('raw and compressed pending context snapshots retain the original manager slot for undo and completion',()=>{
 fresh();const before=domain();choose(6);controller.trainEmployee(47,1)
 const raw=funcs.simpleExportWholeFCMmodel(true),compressed=funcs.simpleExportWholeFCMmodel()
 for(const [saved,isRaw] of [[raw,true],[compressed,false]]){
  funcs.simpleImportWholeFCMmodel(saved,isRaw);controller.undoTrainEmployee(store.context.justTrained[0]);expect(domain()).toEqual(before)
  funcs.simpleImportWholeFCMmodel(saved,isRaw);controller.endWorkingDaySubphase();expect(store.players[0].employees).toEqual([47,13,0])
 }
})
it('real subphase reset restores original layout, employees and stock after accepted training',()=>{
 fresh();const before=domain();store.subphaseResetData=funcs.simpleExportWholeFCMmodel()
 choose(6);controller.trainEmployee(47,1);controller.resetSubphase();expect(domain()).toEqual(before)
})
