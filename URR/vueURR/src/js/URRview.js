/**
 * Visual helpers (images / phase strings).
 */

import * as rf from "./URRreference"

export function phaseStr(phase) {
	if (phase === rf.PHASE_DIVIDING_NATIONS) return "Dividing the Independent Nations"
	if (phase === rf.PHASE_SETTLEMENT) return "Settlement"
	if (phase === rf.PHASE_DEVELOPMENT) return "Development"
	if (phase === rf.PHASE_RAINY_SEASON) return "Rainy Season"
	if (phase === rf.PHASE_GAME_OVER) return "Game Over"
	return "Unknown phase - " + phase
}

export function getOrdinal(num) {
	var n = num % 10
	var s = num % 100
	if (n === 1 && s !== 11) return num + "st"
	if (n === 2 && s !== 12) return num + "nd"
	if (n === 3 && s !== 13) return num + "rd"
	return num + "th"
}

export function getImage(image) {
	// Menu / generic icons
	if (image === "icon-house") return new URL(`../../../static/URR/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/URR/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/URR/images/icon-rulebook.svg`, import.meta.url).href
	else if (image === "icon-info") return new URL(`../../../static/URR/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/URR/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/URR/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/URR/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/URR/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/URR/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/URR/images/icon-replay.svg`, import.meta.url).href
	else if (image === "resign") return new URL(`../../../static/URR/images/resign.jpg`, import.meta.url).href
	rf.doAdminAlrt("Unknown image requested: " + image)
	return ""
}
