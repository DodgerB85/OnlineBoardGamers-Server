import i18n from "../i18n"
import { useModelStore } from "../stores/FCMstore.js"
import { isMilestoneNightBalanceEnabled, isBalancedNightShiftEnabled } from "./milestoneNightBalance.js"

// Read the active game on every access, never capture a game/locale at import time.
// No reference-data import: FCMreference's display getters may call this resolver.
function options() {
	return useModelStore().startingOptions
}

// Detailed popup/native-tooltip copy; compact metadata stays suitable for 120px cards.
export function cardDetails(type, id) {
	if (type === "milestone" && isMilestoneNightBalanceEnabled(options())) {
		if (id === 19) return i18n.global.t("milestoneNightBalanceDisplay.marketingTrainee")
		if (id === 25) return i18n.global.t("milestoneNightBalanceDisplay.lemonadeDetails")
	}
	if (type === "employee" && id === 47 && isBalancedNightShiftEnabled(options())) {
		return i18n.global.t("milestoneNightBalanceDisplay.nightShiftDetails")
	}
	return ""
}

// These audited originals contain no superseded rule text. Keep the exact assets
// for every game and language, including the original non-English fallback.
export function cardImage(type, id) {
	if (type === "employee" && id === 47) return new URL("../../../static/FCM/images/e_night_shift_manager.jpg", import.meta.url).href
	if (type === "milestone" && id === 19) return new URL("../../../static/FCM/images/m_icon01.png", import.meta.url).href
	if (type === "milestone" && id === 25) return new URL("../../../static/FCM/images/m_icon08.png", import.meta.url).href
	return null
}

export function employeeDescription(id, legacy) {
	if (id === 47 && isBalancedNightShiftEnabled(options())) {
		return i18n.global.t("milestoneNightBalanceDisplay.nightShift")
	}
	return legacy
}

export function milestoneDescription(id, legacy) {
	if (id === 19 && isMilestoneNightBalanceEnabled(options())) {
		return i18n.global.t("milestoneNightBalanceDisplay.marketingTrainee")
	}
	if (id === 25 && isMilestoneNightBalanceEnabled(options())) {
		return i18n.global.t("milestoneNightBalanceDisplay.lemonade")
	}
	return legacy
}
