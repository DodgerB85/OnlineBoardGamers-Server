import * as rf from './FCMreference.js'

// Pure preflight: callers must check ok before mutating any milestone or ledger.
// choice is the numeric employee ID, never a UI index or an implicit random pick.
export function marketingTraineeReward(store, playerIndex, choice) {
 if (!Number.isInteger(playerIndex) || !store.players[playerIndex]) return {ok: false, reason: 'invalid-player'}
 if (store.players[playerIndex].milestones.includes(rf.FIRST_MARKETING_TRAINEE_USED)) return {ok: false, reason: 'already-awarded'}
 if (!store.availableMilestones.includes(rf.FIRST_MARKETING_TRAINEE_USED)) return {ok: false, reason: 'milestone-unavailable'}
 if (choice == null) {
  if (!(store.availableEmployees[rf.KITCHEN_TRAINEE] > 0) && !(store.availableEmployees[rf.ERRAND_BOY] > 0)) return {ok: true, employee: null}
  return {ok: false, reason: 'choice-required'}
 }
 if (choice !== rf.KITCHEN_TRAINEE && choice !== rf.ERRAND_BOY) return {ok: false, reason: 'invalid-choice'}
 if (!(store.availableEmployees[choice] > 0)) return {ok: false, reason: 'employee-unavailable'}
 return {ok: true, employee: choice}
}
