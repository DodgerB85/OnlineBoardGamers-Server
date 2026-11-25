import { useModelStore } from '../stores/FCMstore.js'
import { isMilestoneNightBalanceEnabled, isBalancedNightShiftEnabled } from './milestoneNightBalance.js'
import { previewTrainingOrganization } from './milestoneNightBalanceOrganization.js'
import * as rf from './FCMreference.js'
import * as plyr from './FCMplayer.js'
import * as rules from './FCMrules.js'

// Completed levels are represented by ONE record (spent=1/2/3...), not by
// separate cards. The replacement stays in justTrained until completeTraining;
// it is not an owned source. Undo removes that record and releases the slot.
export function trainingAllowance(playerIndex) {
 const store = useModelStore()
 const active = isMilestoneNightBalanceEnabled(store.startingOptions)
 const used = store.context.justTrained.filter(entry => entry.fromStructure === true).length
 return {active, used, remaining: active ? Math.max(0, 1-used) : Infinity}
}

export function validateBalancedTraining(playerIndex, source, target, steps) {
 const store = useModelStore()
 const allowance = trainingAllowance(playerIndex)
 const reject = reason => ({...allowance,legal:false,reason})
 if (!allowance.active) return {...allowance, legal:true, reason:null}
 const player = store.players[playerIndex]
 if (!player || !source || ![0,1,2].includes(source.origin)) return reject('invalid-source')
 if (source.origin === 1 && (source.employee !== -1 || rules.getRemainingRecruitingPoints(playerIndex) <= 0)) return reject('recruiting-required')
 if (source.origin === 2 && !plyr.hasMilestone(playerIndex, rf.FIRST_LEMONADE_SOLD)) return reject('lemonade-required')
 if (source.origin !== 1) {
  const owned = source.origin === 2 ? player.employees : player.beach
  const index = source.sourceIndex === undefined ? owned.indexOf(source.employee) : source.sourceIndex
  if (!Number.isInteger(source.employee) || source.employee < 0 || !Number.isInteger(index) || index < 0 || owned[index] !== source.employee) return reject('missing-source')
 }
 if (source.origin === 2 && allowance.remaining === 0) return reject('on-duty-limit')
 if (!Number.isInteger(steps) || steps < 1) return reject('invalid-steps')
 if (!Number.isInteger(target) || !(store.availableEmployees[target] > 0)) return reject('unavailable-target')
 const points = rules.getTrainingPoints(playerIndex, store.context.justTrained)
 const upgrades = rules.possibleUpgrades(store.availableEmployees, playerIndex,
  source.origin === 1 ? rules.hireableEmployees() : source.employee,
  points.total, points.level2, points.level3, points.unlimited,
  store.context.justTrained.map(entry => entry.to), source.origin === 2)
 if (!upgrades[steps-1]?.includes(target)) return reject('illegal-upgrade')
 if (source.origin === 2 && target === rf.NIGHT_SHIFT_MANAGER && isBalancedNightShiftEnabled(store.startingOptions)) {
  const organization = previewTrainingOrganization(player,store.context.justTrained,source,target)
  if (!organization.legal) return reject(organization.reason)
 }
 return {...allowance,legal:true,reason:null}
}

// These candidate APIs are only for the active opt-in. Legacy UI keeps its
// existing path. sourceIndex is a transient selection hint, never a ledger or
// wire field; source validation rechecks the actual owned array at submission.
export function balancedTrainingOptions(playerIndex, source) {
 const store = useModelStore()
 if (!isMilestoneNightBalanceEnabled(store.startingOptions) || !store.players[playerIndex] || !source) return []
 const points = rules.getTrainingPoints(playerIndex, store.context.justTrained)
 const options = rules.possibleUpgrades(store.availableEmployees, playerIndex,
  source.origin === 1 ? rules.hireableEmployees() : source.employee,
  points.total, points.level2, points.level3, points.unlimited,
  store.context.justTrained.map(entry => entry.to), source.origin === 2)
 return options.map((level, index) => level.filter(target => validateBalancedTraining(playerIndex, source, target, index+1).legal))
}

export function balancedTrainingSources(playerIndex) {
 const store = useModelStore()
 const player = store.players[playerIndex]
 if (!isMilestoneNightBalanceEnabled(store.startingOptions) || !player) return []
 const sources = [
  ...player.beach.map((employee, sourceIndex) => ({employee,origin:0,sourceIndex})),
  ...player.employees.map((employee, sourceIndex) => ({employee,origin:2,sourceIndex})),
  {employee:-1,origin:1},
 ]
 return sources.filter(source => balancedTrainingOptions(playerIndex, source).some(level => level.length > 0))
}
