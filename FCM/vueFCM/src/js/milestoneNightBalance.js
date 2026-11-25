// Independent opt-in: Ketchup Milestone is not New Milestones.
export function isMilestoneNightBalanceEnabled(options) {
 return options.milestoneNightBalance === true && options.newMilestones === true && options.useMilestones === true
}

export function isBalancedNightShiftEnabled(options) {
 return isMilestoneNightBalanceEnabled(options) && options.nightShift === true
}
