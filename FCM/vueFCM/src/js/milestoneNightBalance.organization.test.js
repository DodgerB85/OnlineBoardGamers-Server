import {beforeAll,it,expect} from 'vitest'
let preview,legal
beforeAll(async()=>{
 globalThis.window=globalThis.window||{}; window.performance=performance
 ;({previewTrainingOrganization:preview,isLegalTrainingOrganization:legal}=await import('./milestoneNightBalanceOrganization.js'))
})
it.each([
 ['exact',[6,0,0,-1,-1,-1],[47,0,0]],
 ['ordinary overflow can move into free CEO cells',[6,-1,-1,0,-1,-1],[47,0,-1]],
 ['shared capacity of another manager',[6,5,0,0,-1,-1,-1,-1],[47,5,0,0,-1]],
 ['5 loses two slots, not three',[5,0,0,-1,-1],[47,0,0]],
])('%s: pure preview preserves every employee and a CEO manager',(_,employees,expected)=>{
 const player={employees,ceoSlots:3}, before=JSON.stringify(player)
 const result=preview(player,[],{employee:employees[0],sourceIndex:0},47)
 expect(result).toEqual({legal:true,reason:null,employees:expected}); expect(JSON.stringify(player)).toBe(before)
 expect(legal(result.employees,3)).toBe(true)
})
it.each([
 ['two holes do not offset three lost slots',[6,0,0,0,-1,-1]],
 ['illegal existing manager in subordinate slot',[6,0,0,5,-1,-1,-1,-1]],
 ['preexisting occupied overflow',[6,0,0,0,0,0,0]],
])('%s: rejects without altering the input',(_,employees)=>{
 const player={employees,ceoSlots:3}, before=JSON.stringify(player)
 expect(preview(player,[],{employee:6,sourceIndex:0},47).legal).toBe(false); expect(JSON.stringify(player)).toBe(before)
})
it('a total-only validator would accept the old append result but the layout validator rejects it',()=>{
 expect(legal([5,0,0,-1,-1,-1,-1,47],3)).toBe(false)
 expect(legal([47,0,0,5,-1],3)).toBe(false)
})
it.each([true,false])('includes other pending on-duty targets once (indexed=%s)',indexed=>{
 const employees=indexed?[6,-1,0,-1,-1,-1]:[6,0,-1,-1,-1]
 const pending=[{from:0,to:13,spent:1,fromStructure:true,...(indexed?{structureIndex:1}:{})},{from:5,to:6,spent:1,fromStructure:false}]
 const result=preview({employees,ceoSlots:3},pending,{employee:6,sourceIndex:0},47)
 expect(result.legal).toBe(true); expect(result.employees.filter(e=>e===13)).toHaveLength(1); expect(result.employees.filter(e=>e!==-1).sort((a,b)=>a-b)).toEqual([0,13,47])
})
it('pending target does not disappear to make an overcapacity proposal seem legal',()=>{
 expect(preview({employees:[6,-1,0,0,-1,-1],ceoSlots:3},[{from:0,to:13,fromStructure:true,structureIndex:1}],{employee:6,sourceIndex:0},47).legal).toBe(false)
})
it('does not silently merge two pending replacements of one original slot',()=>{
 const pending=[{from:6,to:47,fromStructure:true,structureIndex:0},{from:6,to:7,fromStructure:true,structureIndex:0}]
 expect(preview({employees:[-1,0,0,-1,-1,-1],ceoSlots:3},pending).legal).toBe(false)
})
it('rejects stale sources and overwritten pending holes',()=>{
 const player={employees:[6,0,0,-1,-1,-1],ceoSlots:3}
 expect(preview(player,[],{employee:6,sourceIndex:2},47).legal).toBe(false)
 expect(preview(player,[{from:6,to:47,fromStructure:true,structureIndex:0}]).legal).toBe(false)
})
