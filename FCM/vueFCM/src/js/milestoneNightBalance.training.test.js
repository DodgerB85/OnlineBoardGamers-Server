import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
let controller, rf, rules, useModelStore, usePersonalStore
beforeAll(async () => {
 globalThis.alert = () => {}
 globalThis.window = globalThis.window || {}
 globalThis.window.performance = performance
 controller = await import('./FCMcontroller.js')
 rf = await import('./FCMreference.js')
 rules = await import('./FCMrules.js')
 ;({useModelStore} = await import('../stores/FCMstore.js'))
 ;({usePersonalStore} = await import('../stores/FCMpersonal.js'))
})
function player(employees) {
 return {name:'A',displayName:'A',money:100,employees,beach:[],marketers:[],milestones:[rf.FIRST_LEMONADE_SOLD],resources:[],ceoSlots:3,ceoAction:rf.CEO_ACTION_HIRE_1}
}
beforeEach(() => {
 setActivePinia(createPinia())
 const s=useModelStore()
 s.players.push(player([rf.GURU,rf.KITCHEN_TRAINEE,rf.KITCHEN_TRAINEE]))
 Object.assign(s.startingOptions,{milestoneNightBalance:true,newMilestones:true,useMilestones:true})
 Object.assign(s.gameflow,{turnOrder:[0],phase:rf.PHASE_WORKING_DAY,subphase:rf.SUBPHASE_TRAINING})
 s.availableEmployees=[...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
 usePersonalStore().pov=0
})
function select(employee,origin=2) {useModelStore().context.selectedEmployeeToTrainData={employee,origin}}
function state() {const s=useModelStore(); return JSON.stringify({players:s.players,supply:s.availableEmployees,context:s.context,history:s.history,gameflow:s.gameflow})}
describe('balanced lemonade training controller',()=>{
 it.each([2,3])('keeps a legal %i-level chain one person and conserves supply through undo',async steps=>{
  const h=await import('./milestoneNightBalanceTraining.js'); const s=useModelStore()
  s.players[0].employees=[steps===2?rf.COACH:rf.GURU,rf.ERRAND_BOY,rf.ERRAND_BOY]
  const target=steps===2?rf.TRUCK_DRIVER:rf.ZEPPELIN_PILOT
  const supply=[...s.availableEmployees]
  select(rf.ERRAND_BOY)
  controller.trainEmployee(target,steps)
  expect(s.context.justTrained).toEqual([{from:rf.ERRAND_BOY,to:target,spent:steps,fromStructure:true}])
  expect(h.trainingAllowance()).toEqual({active:true,used:1,remaining:0})
  expect(s.availableEmployees[rf.ERRAND_BOY]).toBe(supply[rf.ERRAND_BOY]+1)
  expect(s.availableEmployees[target]).toBe(supply[target]-1)
  expect(s.availableEmployees[rf.CART_OPERATOR]).toBe(supply[rf.CART_OPERATOR])
  expect(rules.getTrainingPoints(0,s.context.justTrained).total).toBe(0)
  controller.undoTrainEmployee(s.context.justTrained[0])
  expect(s.availableEmployees).toEqual(supply)
  expect(h.trainingAllowance().remaining).toBe(1)
  expect(rules.getTrainingPoints(0,s.context.justTrained).total).toBe(steps)
  select(rf.ERRAND_BOY)
  controller.trainEmployee(target,steps)
  expect(s.context.justTrained).toHaveLength(1)
 })
 it('does not limit beach or hire training after the on-duty slot is used',async()=>{
  const h=await import('./milestoneNightBalanceTraining.js'); const s=useModelStore()
  s.players[0].beach=[rf.KITCHEN_TRAINEE]
  select(rf.KITCHEN_TRAINEE); controller.trainEmployee(rf.BURGER_COOK,1)
  expect(h.balancedTrainingSources(0).some(x=>x.origin===2)).toBe(false)
  select(rf.KITCHEN_TRAINEE,0); controller.trainEmployee(rf.PIZZA_COOK,1)
  select(-1,1); controller.trainEmployee(rf.CART_OPERATOR,1)
  expect(s.context.justTrained.map(x=>x.fromStructure)).toEqual([true,false,false])
  expect(h.trainingAllowance().used).toBe(1)
  expect(rules.getRemainingRecruitingPoints(0)).toBe(0)
  expect(rules.getTrainingPoints(0,s.context.justTrained).total).toBe(0)
 })
 it('keeps normal training legal without owning lemonade',()=>{
  const s=useModelStore(); s.players[0].milestones=[]; s.players[0].beach=[rf.KITCHEN_TRAINEE]
  select(rf.KITCHEN_TRAINEE,0); controller.trainEmployee(rf.BURGER_CHEF,2)
  select(-1,1); controller.trainEmployee(rf.CART_OPERATOR,1)
  expect(s.context.justTrained).toHaveLength(2)
  expect(s.context.justTrained.every(x=>!x.fromStructure)).toBe(true)
 })
 it('rejects duplicate submission and a same-ID owned replacement impersonating the trained card',()=>{
  const s=useModelStore(); s.players[0].employees.push(rf.BURGER_COOK)
  select(rf.KITCHEN_TRAINEE); controller.trainEmployee(rf.BURGER_COOK,1)
  let before=state(); expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false); expect(state()).toBe(before)
  select(rf.BURGER_COOK); before=state()
  expect(controller.trainEmployee(rf.BURGER_CHEF,1)).toBe(false); expect(state()).toBe(before)
 })
 it.each(['off','missing','old','no-milestones','short'])('preserves unlimited legacy on-duty behavior for %s',async mode=>{
  const h=await import('./milestoneNightBalanceTraining.js'); const s=useModelStore()
  if(mode==='off') s.startingOptions.milestoneNightBalance=false
  if(mode==='missing') delete s.startingOptions.milestoneNightBalance
  if(mode==='old') s.startingOptions.newMilestones=false
  if(mode==='no-milestones') s.startingOptions.useMilestones=false
  if(mode==='short') {s.startingOptions.shortGame=true;s.startingOptions.useMilestones=false}
  select(rf.KITCHEN_TRAINEE); controller.trainEmployee(rf.BURGER_COOK,1)
  select(rf.KITCHEN_TRAINEE); controller.trainEmployee(rf.PIZZA_COOK,1)
  expect(s.context.justTrained).toHaveLength(2)
  expect(h.trainingAllowance().active).toBe(false)
  expect(h.trainingAllowance().remaining).toBe(Infinity)
 })
 it('keeps guru and salary milestone qualifications rather than imposing one training point',()=>{
  const s=useModelStore()
  s.players[0].employees=[rf.TRAINER,rf.TRAINER,rf.ERRAND_BOY]
  s.players[0].milestones.push(rf.FIRST_20_SALARIES)
  select(rf.ERRAND_BOY); controller.trainEmployee(rf.TRUCK_DRIVER,2)
  expect(s.context.justTrained[0].spent).toBe(2)
 })

 it('provides pure indexed source candidates and target levels for the UI',async()=>{
  const h=await import('./milestoneNightBalanceTraining.js')
  const s=useModelStore(); s.players[0].beach=[rf.ERRAND_BOY]
  const before=state()
  const sources=h.balancedTrainingSources(0)
  expect(sources).toContainEqual({employee:rf.KITCHEN_TRAINEE,origin:2,sourceIndex:1})
  expect(sources).toContainEqual({employee:rf.KITCHEN_TRAINEE,origin:2,sourceIndex:2})
  expect(sources).toContainEqual({employee:rf.ERRAND_BOY,origin:0,sourceIndex:0})
  expect(sources).toContainEqual({employee:-1,origin:1})
  expect(h.balancedTrainingOptions(0,sources.find(x=>x.origin===2))[1]).toContain(rf.BURGER_CHEF)
  expect(h.trainingAllowance()).toEqual({active:true,used:0,remaining:1})
  expect(state()).toBe(before)
 })
 it.each(['no-recruiting','bad-hire-source'])('rejects train-from-hire %s atomically',mode=>{
  const s=useModelStore()
  select(mode==='bad-hire-source'?rf.KITCHEN_TRAINEE:-1,1)
  if(mode==='no-recruiting') s.context.justHired.push(-1)
  const before=state()
  expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false)
  expect(state()).toBe(before)
 })
 it.each(['zero','negative','fraction','string','wrong-level','no-points','no-coach','stock','invalid-target','color','unique-owned','unique-ledger'])('rejects illegal upgrade %s atomically',mode=>{
  const s=useModelStore(); let target=rf.BURGER_COOK, steps=1
  select(rf.KITCHEN_TRAINEE)
  if(mode==='zero') steps=0
  if(mode==='negative') steps=-1
  if(mode==='fraction') steps=1.5
  if(mode==='string') steps='1'
  if(mode==='wrong-level') steps=2
  if(mode==='no-points') s.players[0].employees=[rf.KITCHEN_TRAINEE]
  if(mode==='no-coach') {s.players[0].employees=[rf.TRAINER,rf.TRAINER,rf.KITCHEN_TRAINEE]; target=rf.BURGER_CHEF; steps=2}
  if(mode==='stock') s.availableEmployees[target]=0
  if(mode==='invalid-target') target=999
  if(mode==='color') {s.players[0].employees.push(rf.MANAGEMENT_TRAINEE); select(rf.MANAGEMENT_TRAINEE); target=rf.LUXURIES_MANAGER}
  if(mode==='unique-owned') {s.players[0].beach=[rf.BURGER_CHEF]; target=rf.BURGER_CHEF; steps=2}
  if(mode==='unique-ledger') {s.context.justTrained.push({from:-1,to:rf.BURGER_CHEF,spent:1,fromStructure:false}); target=rf.BURGER_CHEF; steps=2}
  const before=state()
  expect(controller.trainEmployee(target,steps)).toBe(false)
  expect(state()).toBe(before)
 })
 it.each(['no-milestone','missing-structure','missing-beach','invalid-origin','invalid-employee','stale-index','foreign-source'])('rejects illegal source %s without mutation',mode=>{
  const s=useModelStore()
  select(rf.KITCHEN_TRAINEE)
  if(mode==='no-milestone') s.players[0].milestones=[]
  if(mode==='missing-structure') s.players[0].employees=[rf.GURU]
  if(mode==='missing-beach') select(rf.KITCHEN_TRAINEE,0)
  if(mode==='invalid-origin') select(rf.KITCHEN_TRAINEE,99)
  if(mode==='invalid-employee') select(-1)
  if(mode==='stale-index') s.context.selectedEmployeeToTrainData.sourceIndex=0
  if(mode==='foreign-source') {s.players.push(player([rf.ERRAND_BOY])); select(rf.ERRAND_BOY)}
  const before=state()
  expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false)
  expect(state()).toBe(before)
 })
 it.each(['phase','subphase','other-player','halted','empty-order','bailout'])('atomically rejects %s before training',mode=>{
  const s=useModelStore()
  select(rf.KITCHEN_TRAINEE)
  if(mode==='phase') s.gameflow.phase=rf.PHASE_CLEAN_UP
  if(mode==='subphase') s.gameflow.subphase=rf.SUBPHASE_HIRING
  if(mode==='other-player') {s.players.push(player([rf.KITCHEN_TRAINEE])); usePersonalStore().pov=1}
  if(mode==='halted') usePersonalStore().haltPlay=true
  if(mode==='empty-order') s.gameflow.turnOrder=[]
  if(mode==='bailout') Object.assign(s.bailout,{pending:true,order:[0],claims:{}})
  const before=state()
  expect(controller.trainEmployee(rf.BURGER_COOK,1)).toBe(false)
  expect(state()).toBe(before)
 })
 it('accepts the first on-duty employee and atomically rejects a second identical card',()=>{
  const s=useModelStore()
  select(rf.KITCHEN_TRAINEE)
  controller.trainEmployee(rf.BURGER_COOK,1)
  expect(s.context.justTrained).toEqual([{from:rf.KITCHEN_TRAINEE,to:rf.BURGER_COOK,spent:1,fromStructure:true}])
  expect(s.players[0].employees).toEqual([rf.GURU,rf.KITCHEN_TRAINEE])
  select(rf.KITCHEN_TRAINEE)
  const before=state()
  controller.trainEmployee(rf.PIZZA_COOK,1)
  expect(state()).toBe(before)
 })
})
