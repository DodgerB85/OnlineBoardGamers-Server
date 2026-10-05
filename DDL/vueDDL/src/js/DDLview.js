/**
 * Visual helpers (images / phase strings).
 */

import * as rf from "./DDLreference"

export function phaseStr(phase) {
	if (phase === rf.PHASE_SETUP) return "Setup"
	if (phase === rf.PHASE_MAIN) return "Main"
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
	if (image === "icon-house") return new URL(`../../../static/DDL/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/DDL/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/DDL/images/icon-rulebook.svg`, import.meta.url).href
	else if (image === "icon-info") return new URL(`../../../static/DDL/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/DDL/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/DDL/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/DDL/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/DDL/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/DDL/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/DDL/images/icon-replay.svg`, import.meta.url).href
	else if (image === "resign") return new URL(`../../../static/DDL/images/resign.jpg`, import.meta.url).href
	rf.doAdminAlrt("Unknown image requested: " + image)
	return ""
}
