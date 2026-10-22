/**
 * Visual helpers (images / phase strings).
 */

import * as rf from "./DDLreference.js"
import { goodImage } from "./DDLfuncs.js"
import i18n from "../i18n.js"

const t = i18n.global.t

export function phaseStr(phase) {
	if (phase === rf.PHASE_SETUP) return t("phase.setup")
	if (phase === rf.PHASE_MAIN) return t("phase.main")
	if (phase === rf.PHASE_GAME_OVER) return t("phase.gameOver")
	return t("phase.unknown", { phase })
}

export function turnTypeStr(turnType) {
	if (turnType === rf.TURN_CHOOSE) return t("turnType.choose")
	if (turnType === rf.TURN_ACTION) return t("turnType.action")
	if (turnType === rf.TURN_GAME_OVER) return t("turnType.gameOver")
	return ""
}

export function placeLabel(rank) {
	const keys = ["first", "second", "third", "fourth", "fifth", "sixth"]
	return keys[rank - 1] ? t("place." + keys[rank - 1]) : t("place.other", { rank })
}

export function getOrdinal(num) {
	const n = num % 10
	const s = num % 100
	if (n === 1 && s !== 11) return num + "st"
	if (n === 2 && s !== 12) return num + "nd"
	if (n === 3 && s !== 13) return num + "rd"
	return num + "th"
}

export function boardImage() {
	return "/static/DDL/images/board.jpg"
}

export function playerAidImage() {
	return "/static/DDL/images/player-aid.jpg"
}

export function goodImg(id) {
	return goodImage(id)
}

export function gearLabel(key) {
	return rf.gearName(key)
}

export function energyLabel(colour) {
	const keys = ["movement", "build", "trade"]
	return keys[colour] ? t("energy." + keys[colour]) : ""
}

export function getImage(image) {
	if (image === "icon-house") return new URL(`../../../static/DDL/images/icon-house.svg`, import.meta.url).href
	if (image === "icon-nextGame") return new URL(`../../../static/DDL/images/icon-nextGame.svg`, import.meta.url).href
	if (image === "icon-rulebook") return new URL(`../../../static/DDL/images/icon-rulebook.svg`, import.meta.url).href
	if (image === "icon-info") return new URL(`../../../static/DDL/images/icon-info.svg`, import.meta.url).href
	if (image === "icon-rewind") return new URL(`../../../static/DDL/images/icon-rewind.svg`, import.meta.url).href
	if (image === "icon-chat") return new URL(`../../../static/DDL/images/icon-chat.svg`, import.meta.url).href
	if (image === "icon-stop") return new URL(`../../../static/DDL/images/icon-stop.svg`, import.meta.url).href
	if (image === "icon-notebook") return new URL(`../../../static/DDL/images/icon-notebook.svg`, import.meta.url).href
	if (image === "icon-scroll") return new URL(`../../../static/DDL/images/icon-scroll.svg`, import.meta.url).href
	if (image === "icon-replay") return new URL(`../../../static/DDL/images/icon-replay.svg`, import.meta.url).href
	if (image === "resign") return "/static/DDL/images/resign.jpg"
	return ""
}
