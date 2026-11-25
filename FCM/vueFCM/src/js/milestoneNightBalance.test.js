import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as rf from './FCMreference.js'
import * as model from './FCMmodel.js'
import { useModelStore } from '../stores/FCMstore.js'

beforeEach(() => setActivePinia(createPinia()))
it('decodes balance and preserves unrelated module state across games including empty options', async () => {
 const { isMilestoneNightBalanceEnabled: enabled } = await import('./milestoneNightBalance.js')
 for (const [options, expected] of [[[21,54], true], [['21','54'], true], [[21,54,1], false], [[21,54,2], false], [[20,54], false], [[54], false]]) {
  setActivePinia(createPinia())
  const current = useModelStore()
  model.setInternalStartingOptions(options)
  expect(current.startingOptions.milestoneNightBalance).toBe(true)
  expect(enabled(current.startingOptions)).toBe(expected)
  expect(current.startingOptions.nightShift).toBe(false)
 }
 setActivePinia(createPinia())
 const current = useModelStore()
 for (const next of [[], [21], [20], [16]]) {
  model.setInternalStartingOptions([21,54])
  expect(current.startingOptions.milestoneNightBalance).toBe(true)
  current.startingOptions.mediaLine = true
  model.setInternalStartingOptions(next)
  expect(current.startingOptions.milestoneNightBalance).toBe(false)
  expect(current.startingOptions.mediaLine).toBe(true)
 }
})
it.each([
 [[1], [21,54]],
 [[2], [21,54]],
 [[21,54], [20,54]],
 [[21,54], [54]],
 [[16,21,54], [21,54]],
 [[16,21,54], []],
 [[16,21,54], undefined],
 [[16,21,54], null],
 [[1], ['16','21','54']],
])('refreshes direct balance eligibility in the same real store: %j -> %j', async (previous, next) => {
 const { isMilestoneNightBalanceEnabled: enabled, isBalancedNightShiftEnabled: night } = await import('./milestoneNightBalance.js')
 const current = useModelStore()
 model.setInternalStartingOptions(previous)
 current.startingOptions.mediaLine = true
 model.setInternalStartingOptions(next)
 expect(useModelStore()).toBe(current)
 const options = (next ?? []).map(Number)
 const short = options.includes(1)
 const usable = !short && !options.includes(2)
 const balance = options.includes(54) && options.includes(21) && usable
 expect(current.startingOptions.shortGame).toBe(short)
 expect(current.startingOptions.useMilestones).toBe(usable)
 expect(current.startingOptions.newMilestones).toBe(options.includes(21))
 expect(current.startingOptions.nightShift).toBe(options.includes(16))
 expect(current.startingOptions.milestoneNightBalance).toBe(options.includes(54))
 expect(enabled(current.startingOptions)).toBe(balance)
 expect(night(current.startingOptions)).toBe(balance && options.includes(16))
 expect(current.startingOptions.mediaLine).toBe(true)
})
it('registers an independent default-off option with unique ID 54', () => {
 expect(rf.SO_MILESTONE_NIGHT_BALANCE).toBe(54)
 expect(Object.entries(rf).filter(([k,v]) => k.startsWith('SO_') && v === 54)).toHaveLength(1)
 expect(useModelStore().startingOptions.milestoneNightBalance).toBe(false)
})
it('gates balance strictly on new usable milestones without enabling Night Shift', async () => {
 const { isMilestoneNightBalanceEnabled: enabled, isBalancedNightShiftEnabled: night } = await import('./milestoneNightBalance.js')
 for (const milestoneNightBalance of [false, true, 1]) for (const newMilestones of [false, true, 1]) for (const useMilestones of [false, true, 1]) {
  const options = { milestoneNightBalance, newMilestones, useMilestones, ketchupMilestone: true }
  const valid = milestoneNightBalance === true && newMilestones === true && useMilestones === true
  expect(enabled(options)).toBe(valid)
  expect(night(options)).toBe(false)
  expect(night({ ...options, nightShift: true })).toBe(valid)
 }
})
