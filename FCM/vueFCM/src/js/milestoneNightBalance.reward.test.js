import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useModelStore } from '../stores/FCMstore.js'
import * as rf from './FCMreference.js'
import * as model from './FCMmodel.js'
import * as player from './FCMplayer.js'
import * as rules from './FCMrules.js'

let store
beforeEach(() => {
 setActivePinia(createPinia())
 store = useModelStore()
 model.setInternalStartingOptions([21,54])
 store.availableMilestones = [rf.FIRST_MARKETING_TRAINEE_USED]
 store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
 for (let i = 0; i < 2; i++) store.players.push({name: `P${i}`, employees: [rf.MARKETING_TRAINEE], beach: [], milestones: [], marketers: [], resources: [], restaurants: [], money: 0, ceoSlots: 3})
 store.gameflow.turn = 1
})
function award(choice, index = 0) {
 return player.awardMilestone(index, rf.FIRST_MARKETING_TRAINEE_USED, false, choice)
}
function state() {
 return JSON.stringify({players: store.players, stock: store.availableEmployees, milestones: store.availableMilestones, history: store.history, context: store.context})
}
it.each([[[]], [[21]], [[20,54]], [[54]], [[21,54,1]], [[21,54,2]]])('preserves legacy 19 double gift and undefined return for options %j', options => {
 model.setInternalStartingOptions(options)
 const stock = [...store.availableEmployees]
 expect(award()).toBeUndefined()
 expect(store.players[0].beach).toEqual([27,23])
 expect(store.availableEmployees[27]).toBe(stock[27]-1)
 expect(store.availableEmployees[23]).toBe(stock[23]-1)
 expect(store.history[0][3]).toEqual([19])
 const before = state()
 expect(award(23)).toBeUndefined()
 expect(state()).toBe(before)
})
it('leaves milestone 18 unchanged even with balance enabled', () => {
 store.availableMilestones = [18]
 const stock = [...store.availableEmployees]
 expect(player.awardMilestone(0,18)).toBeUndefined()
 expect(store.players[0].milestones).toEqual([18])
 expect(store.players[0].beach).toEqual([])
 expect(store.availableEmployees).toEqual(stock)
 expect(store.history[0][3]).toEqual([18])
 const before = state()
 expect(player.awardMilestone(0,18)).toBeUndefined()
 expect(state()).toBe(before)
})
it('keeps the campaign-manager rules path and unrelated return convention', () => {
 store.availableMilestones = [18,19,rf.FIRST_CAMPAIGN_MANAGER_USED]
 expect(rules.giveMarketingMilestones(0,rf.CAMPAIGN_MANAGER,27)).toBeUndefined()
 expect(store.players[0].milestones).toEqual([18,rf.FIRST_CAMPAIGN_MANAGER_USED])
 expect(store.players[0].beach).toEqual([])
})
it('keeps legacy rules double gift when the balance flag is off', () => {
 model.setInternalStartingOptions([21])
 expect(rules.giveMarketingMilestones(0,13)).toBeUndefined()
 expect(store.players[0].beach).toEqual([27,23])
 expect(store.history[0][3]).toEqual([19])
})
it.each([27,23])('requires explicit choice even when %i is the sole stock', employee => {
 store.availableEmployees[27] = 0
 store.availableEmployees[23] = 0
 store.availableEmployees[employee] = 1
 const before = state()
 expect(award()).toEqual({ok:false, reason:'choice-required'})
 expect(state()).toBe(before)
 expect(award(employee)).toEqual({ok:true, employee})
})
it.each([27,23])('allows both eligible players in the same turn, but rechecks last %i live', employee => {
 const other = employee === 27 ? 23 : 27
 store.availableEmployees[employee] = 1
 store.availableEmployees[other] = 1
 expect(rules.giveMarketingMilestones(0,13,employee)).toEqual({ok:true, employee})
 expect(store.availableMilestones).toEqual([19])
 const before = state()
 expect(rules.giveMarketingMilestones(1,13,employee)).toEqual({ok:false, reason:'employee-unavailable'})
 expect(state()).toBe(before)
 expect(rules.giveMarketingMilestones(1,13,other)).toEqual({ok:true, employee:other})
 expect(store.players.map(p=>p.beach)).toEqual([[employee],[other]])
 expect(store.players.map(p=>p.milestones)).toEqual([[19],[19]])
 expect(store.availableEmployees[employee]).toBe(0)
 expect(store.availableEmployees[other]).toBe(0)
 expect(store.history.map(h=>[h[1],h[3]])).toEqual([[0,[19,employee]],[1,[19,other]]])
 const complete = state()
 rules.giveMarketingMilestones(0,13,other)
 expect(state()).toBe(complete)
})
it('does not reward a stale explicit pick even when both stocks are now empty', () => {
 store.availableEmployees[27] = 0
 store.availableEmployees[23] = 0
 const before = state()
 expect(award(27)).toEqual({ok:false,reason:'employee-unavailable'})
 expect(award(47)).toEqual({ok:false,reason:'invalid-choice'})
 expect(state()).toBe(before)
 expect(award()).toEqual({ok:true,employee:null})
})
it('never defers an empty-stock gift when supply later returns', () => {
 store.availableEmployees[27] = 0
 store.availableEmployees[23] = 0
 award()
 store.availableEmployees[27] = 1
 const before = state()
 expect(award(27)).toEqual({ok:false,reason:'already-awarded'})
 expect(state()).toBe(before)
})
it('preserves replayOnly positional argument without appending live history', () => {
 expect(player.awardMilestone(0,19,true,27)).toEqual({ok:true,employee:27})
 expect(store.players[0].beach).toEqual([27])
 expect(store.history).toEqual([])
})
it.each([-1,2,0.5,'0',null])('rejects invalid player %j without a partial award', index => {
 const before = state()
 expect(award(27,index)).toEqual({ok: false, reason: 'invalid-player'})
 expect(state()).toBe(before)
})
it('preflights rules entry before awarding either milestone and forwards explicit choice', () => {
 store.availableMilestones = [18,19]
 const before = state()
 expect(rules.giveMarketingMilestones(0, rf.MARKETING_TRAINEE)).toEqual({ok: false, reason: 'choice-required'})
 expect(state()).toBe(before)
 expect(rules.giveMarketingMilestones(0, rf.MARKETING_TRAINEE, 23)).toEqual({ok: true, employee: 23})
 expect(store.players[0].milestones).toEqual([18,19])
 expect(store.players[0].beach).toEqual([23])
 expect(store.history.map(h => h[3])).toEqual([[18],[19,23]])
})
it('rejects unavailable milestone before giving employees or history', () => {
 store.availableMilestones = []
 const before = state()
 expect(award(27)).toEqual({ok: false, reason: 'milestone-unavailable'})
 expect(state()).toBe(before)
})
it.each([27,23,null])('never repeats an existing award with original reward %j', choice => {
 if (choice === null) { store.availableEmployees[27] = 0; store.availableEmployees[23] = 0 }
 expect(award(choice).ok).toBe(true)
 store.availableEmployees[27] = 2
 const before = state()
 expect(award(27)).toEqual({ok: false, reason: 'already-awarded'})
 expect(state()).toBe(before)
})
it.each([undefined, null])('awards empty-market milestone with explicit null history, choice %j', choice => {
 store.availableEmployees[27] = 0
 store.availableEmployees[23] = 0
 const stock = [...store.availableEmployees]
 expect(award(choice)).toEqual({ok: true, employee: null})
 expect(store.players[0].milestones).toEqual([19])
 expect(store.players[0].beach).toEqual([])
 expect(store.availableEmployees).toEqual(stock)
 expect(store.history[0][3]).toEqual([19,null])
 store.availableEmployees[27] = 1
 expect(store.players[0].beach).toEqual([])
})
it.each([[27,23],[23,27]])('rejects exhausted %i without falling back to %i', (chosen, other) => {
 store.availableEmployees[chosen] = 0
 store.availableEmployees[other] = 1
 const before = state()
 expect(award(chosen)).toEqual({ok: false, reason: 'employee-unavailable'})
 expect(state()).toBe(before)
 expect(award(other)).toEqual({ok: true, employee: other})
 expect(store.players[0].beach).toEqual([other])
 expect(store.availableEmployees[other]).toBe(0)
})
it.each([undefined, null, 13, 0, 47, '27', {employee: 27}])('rejects missing or illegal choice %j atomically while stock exists', choice => {
 const before = state()
 expect(award(choice)).toEqual({ok: false, reason: choice == null ? 'choice-required' : 'invalid-choice'})
 expect(state()).toBe(before)
})
it('chooses only an errand boy from live inventory', () => {
 const stock = [...store.availableEmployees]
 expect(award(rf.ERRAND_BOY)).toEqual({ok: true, employee: rf.ERRAND_BOY})
 expect(store.players[0].beach).toEqual([rf.ERRAND_BOY])
 expect(store.availableEmployees[23]).toBe(stock[23]-1)
 expect(store.availableEmployees[27]).toBe(stock[27])
 expect(store.history[0][3]).toEqual([19,23])
})
it('chooses only a kitchen trainee and records its identity without hiring', () => {
 const stock = [...store.availableEmployees]
 const recruiting = rules.getRemainingRecruitingPoints(0)
 const result = award(rf.KITCHEN_TRAINEE)
 expect(store.players[0].beach).toEqual([rf.KITCHEN_TRAINEE])
 expect(result).toEqual({ok: true, employee: rf.KITCHEN_TRAINEE})
 expect(store.availableEmployees[rf.KITCHEN_TRAINEE]).toBe(stock[rf.KITCHEN_TRAINEE]-1)
 expect(store.availableEmployees[rf.ERRAND_BOY]).toBe(stock[rf.ERRAND_BOY])
 expect(store.players[0].milestones).toEqual([19])
 expect(store.history.map(h => [h[0], h[1], h[3]])).toEqual([[rf.HIST_NEW_MILESTONE, 0, [19,27]]])
 expect(store.context.justHired).toEqual([])
 expect(rules.getRemainingRecruitingPoints(0)).toBe(recruiting)
})
