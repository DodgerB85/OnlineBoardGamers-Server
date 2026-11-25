import {beforeAll,beforeEach,it,expect} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
let rf,rules,controller,ai,useModelStore,usePersonalStore
beforeAll(async()=>{
 globalThis.alert=()=>{}; globalThis.window=globalThis.window||{}; window.performance=performance
 rf=await import('./FCMreference.js'); rules=await import('./FCMrules.js'); controller=await import('./FCMcontroller.js'); ai=await import('./AI/FCM_AI.js')
 ;({useModelStore}=await import('../stores/FCMstore.js')); ({usePersonalStore}=await import('../stores/FCMpersonal.js'))
})
beforeEach(()=>{
 setActivePinia(createPinia()); const s=useModelStore()
 Object.assign(s.startingOptions,{milestoneNightBalance:true,newMilestones:true,useMilestones:true,nightShift:true})
 s.players=[{name:'A',displayName:'A',money:100,employees:[6,0,0,-1,-1,-1],beach:[],marketers:[],milestones:[],resources:[],ceoSlots:3,ceoAction:rf.CEO_ACTION_HIRE_1}]
 Object.assign(s.gameflow,{turnOrder:[0],phase:rf.PHASE_WORKING_DAY,subphase:rf.SUBPHASE_HIRING}); usePersonalStore().pov=0
 s.availableEmployees=[...rf.ORIGINAL_AVAILABLE_EMPLOYEES]; s.availableEmployees[47]=1
})
it('exact capacity accepts 6 to 47 and undo restores the original slots and stock',()=>{
 const s=duty(); const employees=[...s.players[0].employees], stock=[...s.availableEmployees]; controller.trainEmployee(47,1)
 expect(s.context.justTrained).toHaveLength(1); expect(s.players[0].employees).not.toContain(47)
 controller.undoTrainEmployee(s.context.justTrained[0]); expect(s.players[0].employees).toEqual(employees); expect(s.availableEmployees).toEqual(stock)
 expect(rules.getTrainingPoints(0,s.context.justTrained).total).toBe(2)
})
function snap(){return JSON.stringify(useModelStore().$state)}
it('train from a genuine recruiting point can reach 47 in two steps without an intermediate entity',()=>{
 const s=duty([rf.GURU,13,0]);s.context.selectedEmployeeToTrainData={employee:-1,origin:1};s.availableEmployees[6]=0
 s.players[0].ceoAction=rf.CEO_ACTION_HIRE_1;controller.trainEmployee(47,2)
 expect(s.context.justTrained).toEqual([{from:-1,to:47,spent:2,fromStructure:false}]);expect(s.availableEmployees[6]).toBe(0)
})
it('pending 47 has no trainer night bonus until completion',()=>{
 const s=duty([6,rf.TRAINER,0,-1,-1,-1]);controller.trainEmployee(47,1)
 expect(s.players[0].employees).not.toContain(47);expect(rules.getTrainingPoints(0,s.context.justTrained).total).toBe(2)
})
it('sandbox and common reward helpers remain acquisition exceptions',async()=>{
 const s=useModelStore();const model=await import('./FCMmodel.js')
 model.giveEmployeeIfAvailable(0,47);expect(s.players[0].beach).toContain(47)
 s.players[0].beach=[];s.availableEmployees[47]=1;controller.sandboxHireEmployee(47);expect(s.players[0].beach).toContain(47)
})
it.each([[2,1],[3,1],[4,2],[5,3],[6,3]])('night manager supply for %i players remains %i',async(n,count)=>{
 const s=useModelStore(),model=await import('./FCMmodel.js');model.setupKetchupExpansion(n);expect(s.availableEmployees[47]).toBe(count)
})
it('without night shift setup does not add stock or enable the expansion',async()=>{
 const s=useModelStore(),model=await import('./FCMmodel.js');s.startingOptions.nightShift=false;s.availableEmployees[47]=-1
 model.setupKetchupExpansion(5);expect(s.availableEmployees[47]).toBe(-1);expect(s.startingOptions.nightShift).toBe(false)
})
it('training history from+50 replays the new manager into the CEO slot',async()=>{
 const s=duty([6,5,13,0,-1,-1,-1,-1]); const replay=await import('./FCMreplay.js'); const stock=[...s.availableEmployees]
 replay.replayTrain(0,s.players[0],[56,47])
 expect(s.players[0].employees).toEqual([47,5,13,0,-1]); expect(s.availableEmployees[6]).toBe(stock[6]+1); expect(s.availableEmployees[47]).toBe(stock[47]-1)
})
it.each(['milestoneNightBalance','newMilestones','useMilestones','nightShift'])('disabling %s restores official direct recruitment and removes the new route',key=>{
 const s=useModelStore(); s.startingOptions[key]=false
 expect(rules.hireableEmployees()).toContain(47); expect(rules.oneLevelAbove(6,false)).not.toContain(47); expect(rules.oneLevelAbove(6,true)).not.toContain(47)
 expect(controller.hireEmployee(47)).toBe(true)
})
it('AI candidate recruitment cannot spend its only point on 47',()=>{
 const s=useModelStore(); s.players[0].AIlevel=0; s.availableEmployees.fill(0); s.availableEmployees[47]=1; const before=snap()
 ai.actionHires(0); expect(snap()).toBe(before)
})
it.each(['stock','unique-owned','unique-pending','no-lemonade','stale-index','missing','duplicate','invalid-layout','no-coach','hire-forgery','no-night'])('rejects %s with a completely unchanged domain snapshot',mode=>{
 const s=duty(); let steps=1
 if(mode==='stock')s.availableEmployees[47]=0
 if(mode==='unique-owned')s.players[0].beach.push(47)
 if(mode==='unique-pending')s.context.justTrained.push({from:6,to:47,spent:1,fromStructure:false})
 if(mode==='no-lemonade')s.players[0].milestones=[]
 if(mode==='stale-index')s.context.selectedEmployeeToTrainData.sourceIndex=2
 if(mode==='missing')s.players[0].employees[0]=-1
 if(mode==='duplicate'){controller.trainEmployee(47,1)}
 if(mode==='invalid-layout')s.players[0].employees=[6,0,0,5,-1,-1,-1,-1]
 if(mode==='no-coach'){s.players[0].employees=[5,rf.TRAINER,rf.TRAINER,-1,-1];s.players[0].ceoAction=rf.CEO_ACTION_HIRE_1;s.context.selectedEmployeeToTrainData={employee:5,origin:2,sourceIndex:0};steps=2}
 if(mode==='hire-forgery')s.context.selectedEmployeeToTrainData={employee:47,origin:1}
 if(mode==='no-night')s.startingOptions.nightShift=false
 const before=snap(); expect(controller.trainEmployee(47,steps)).toBe(false); expect(snap()).toBe(before)
})
it('economic level, headhunt price, static recruitment roots and original branches are unchanged',()=>{
 expect(rules.getEmployeeLevel(47)).toBe(1); expect(rules.headhuntCost(47)).toBe(10); expect(rf.HIREABLE_EMPLOYEES).toContain(47)
 expect(rules.oneLevelAbove(6,false)).toEqual([7,2,12,18,21,47]); expect(rules.oneLevelAbove(6,true)).toEqual([7,47])
})
it('pending beach training does not erase an on-duty target or provide fake slots',()=>{
 const s=duty([6,0,0,0,-1,-1]); s.context.justTrained=[{from:5,to:6,spent:1,fromStructure:false}]
 const before=snap(); expect(controller.trainEmployee(47,1)).toBe(false); expect(snap()).toBe(before)
})
function duty(employees=[6,0,0,-1,-1,-1],from=6){
 const s=useModelStore(); s.gameflow.subphase=rf.SUBPHASE_TRAINING; s.players[0].employees=employees; s.players[0].ceoAction=rf.CEO_ACTION_COACH; s.players[0].milestones=[rf.FIRST_LEMONADE_SOLD]
 s.context.selectedEmployeeToTrainData={employee:from,origin:2,sourceIndex:0}; return s
}
it('only two empty slots rejects shrinking 6 to 47 before any mutation',async()=>{
 const s=duty([6,0,0,0,-1,-1]); const helper=await import('./milestoneNightBalanceTraining.js'); const before=snap()
 expect(helper.balancedTrainingOptions(0,s.context.selectedEmployeeToTrainData).flat()).not.toContain(47)
 expect(controller.trainEmployee(47,1)).toBe(false); expect(snap()).toBe(before)
})
it('5 reaches 47 in two levels even with no intermediate 6 stock, never one',()=>{
 const s=useModelStore(); s.gameflow.subphase=rf.SUBPHASE_TRAINING; s.players[0].employees=[rf.COACH,0,0]; s.players[0].beach=[5]; s.availableEmployees[6]=0
 s.context.selectedEmployeeToTrainData={employee:5,origin:0}; const before=snap(); expect(controller.trainEmployee(47,1)).toBe(false); expect(snap()).toBe(before)
 controller.trainEmployee(47,2); expect(s.context.justTrained[0]).toMatchObject({from:5,to:47,spent:2}); expect(s.availableEmployees[6]).toBe(0)
})
it('same colour 6 has the 47 route',()=>{expect(rules.oneLevelAbove(6,true)).toContain(47)})
it('6 trains one step into 47 on the beach',()=>{
 const s=useModelStore(); s.gameflow.subphase=rf.SUBPHASE_TRAINING; s.players[0].employees=[rf.COACH,0,0]; s.players[0].beach=[6]
 s.context.selectedEmployeeToTrainData={employee:6,origin:0}; controller.trainEmployee(47,1)
 expect(s.context.justTrained).toEqual([{from:6,to:47,spent:1,fromStructure:false}]); expect(s.players[0].employees).not.toContain(47)
})
it('AI direct recruitment rejects 47 without mutation',()=>{
 const before=snap(); expect(ai.actionAIhire(0,47)).toBe(false); expect(snap()).toBe(before)
})
it('direct ordinary recruitment rejects 47 without mutation',()=>{
 const before=snap(); expect(controller.hireEmployee(47)).toBe(false); expect(snap()).toBe(before)
})
