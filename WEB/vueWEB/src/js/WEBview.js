/**
 * Anything to do with visual displays.
 * So getting images / pngs
 * Also any long tedious functions to draw / position things
 *
 */

import * as rf from "./WEBreference"
//import * as map from "./WEBmap"
//import * as model from "./WEBmodel"

//import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal.js"

export function phaseStr() {
	//const store = useModelStore()

	return ""
}

export function getFlexiKickoutTImerText() {
	const personal = usePersonalStore()
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

export function kickoutTimerTicker() {
	const personal = usePersonalStore()

	if (personal.trainingGame) return

	if (personal.secondsToNextKickout > 1200) {
		clearInterval(personal.kickoutCountdownIntervalTimer) // FIXXXXXXXXXXXXXXXX
	} else {
		personal.secondsToNextKickout--
		if (personal.secondsToNextKickout < 60) {
			// toggle the red class on and off
			if (document.getElementById("kickoutTimerSpan").classList.contains("redText")) document.getElementById("kickoutTimerSpan").classList.remove("redText")
			else document.getElementById("kickoutTimerSpan").classList.add("redText")
		} else document.getElementById("kickoutTimerSpan").classList.remove("redText")

		if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
	}
}

export function kickoutFlexiTimerTicker() {
	const personal = usePersonalStore()

	if (personal.kickoutRequired !== 1 || personal.secondsToNextKickout > 1200 || personal.canPlay()) {
		clearInterval(personal.kickoutFlexiCountdownIntervalTimer) // FIXXXXXXXXXXXXXXXX
		return
	} else {
		personal.flexiSecondsToNextKickout--
		if (personal.flexiSecondsToNextKickout < 60) {
			// toggle the red class on and off
			if (document.getElementById("flexiKickoutTimerSpan").classList.contains("redText")) document.getElementById("flexiKickoutTimerSpan").classList.remove("redText")
			else document.getElementById("flexiKickoutTimerSpan").classList.add("redText")
		} else document.getElementById("flexiKickoutTimerSpan").classList.remove("redText")

		if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	}
}

export function getImage(image) {
	//const store = useModelStore()
	if (image === "tile_00") return new URL(`@static/WEB/images/tiles/tile_00.jpg`, import.meta.url).href
	if (image === "tile_01") return new URL(`@static/WEB/images/tiles/tile_01.jpg`, import.meta.url).href
	if (image === "tile_02") return new URL(`@static/WEB/images/tiles/tile_02.jpg`, import.meta.url).href
	if (image === "tile_03") return new URL(`@static/WEB/images/tiles/tile_03.jpg`, import.meta.url).href
	if (image === "tile_04") return new URL(`@static/WEB/images/tiles/tile_04.jpg`, import.meta.url).href
	if (image === "tile_05") return new URL(`@static/WEB/images/tiles/tile_05.jpg`, import.meta.url).href
	if (image === "tile_06") return new URL(`@static/WEB/images/tiles/tile_06.jpg`, import.meta.url).href
	if (image === "tile_07") return new URL(`@static/WEB/images/tiles/tile_07.jpg`, import.meta.url).href
	if (image === "tile_08") return new URL(`@static/WEB/images/tiles/tile_08.jpg`, import.meta.url).href
	if (image === "tile_09") return new URL(`@static/WEB/images/tiles/tile_09.jpg`, import.meta.url).href
	if (image === "tile_10") return new URL(`@static/WEB/images/tiles/tile_10.jpg`, import.meta.url).href
	if (image === "tile_11") return new URL(`@static/WEB/images/tiles/tile_11.jpg`, import.meta.url).href
	if (image === "tile_12") return new URL(`@static/WEB/images/tiles/tile_12.jpg`, import.meta.url).href
	if (image === "tile_13") return new URL(`@static/WEB/images/tiles/tile_13.jpg`, import.meta.url).href
	if (image === "tile_14") return new URL(`@static/WEB/images/tiles/tile_14.jpg`, import.meta.url).href
	if (image === "tile_15") return new URL(`@static/WEB/images/tiles/tile_15.jpg`, import.meta.url).href
	if (image === "tile_16") return new URL(`@static/WEB/images/tiles/tile_16.jpg`, import.meta.url).href
	if (image === "tile_17") return new URL(`@static/WEB/images/tiles/tile_17.jpg`, import.meta.url).href
	if (image === "tile_18") return new URL(`@static/WEB/images/tiles/tile_18.jpg`, import.meta.url).href

	if (image === "rot_anticlockwise") return new URL(`@static/WEB/images/rot_anticlockwise.svg`, import.meta.url).href
	if (image === "rot_clockwise") return new URL(`@static/WEB/images/rot_clockwise.svg`, import.meta.url).href

	if (image === "actions_2") return new URL(`@static/WEB/images/tiles/actions_2.jpg`, import.meta.url).href
	if (image === "actions_3") return new URL(`@static/WEB/images/tiles/actions_3.jpg`, import.meta.url).href
	if (image === "actions_4") return new URL(`@static/WEB/images/tiles/actions_4.jpg`, import.meta.url).href

	alert("V-GI: " + image)
}

export function getTilePatternFromID(tileID) {
	let tile = rf.ALL_TILES.find((tile) => tile.tileID === tileID)
	if (tile) return `url(#pattern_${tile.gfx})`
	alert("No tile with ID " + tileID + " found")
}

export function getPolygonPointsFromTileID(tileID, rotation, xPos, yPos, sideLength) {
	//let tile = rf.ALL_TILES.find((tile) => tile.tileID === tileID)
	if (rf.ALL_SQUARE_TILES.includes(tileID) || tileID === rf.TILE_CENTER) {
		let res = ""
		res += xPos + "," + yPos + " "
		res += xPos + sideLength * 2 + "," + yPos + " "
		res += xPos + sideLength * 2 + "," + String(yPos + sideLength * 2) + " "
		res += xPos + "," + String(yPos + sideLength * 2) + " "
		return res
	}

	if (rf.ALL_RECT_TILES.includes(tileID)) {
		let res = ""
		res += xPos + "," + yPos + " "
		res += xPos + sideLength + "," + yPos + " "
		res += xPos + sideLength + "," + String(yPos + sideLength * 2) + " "
		res += xPos + "," + String(yPos + sideLength * 2) + " "
		return res
	}

	if (rf.ALL_CORNER_TILES.includes(tileID)) {
		let res = ""
		res += xPos + "," + yPos + " "
		res += xPos + sideLength + "," + yPos + " "
		res += xPos + sideLength + "," + String(yPos + sideLength) + " "
		res += xPos + sideLength * 2 + "," + String(yPos + sideLength) + " "
		res += xPos + sideLength * 2 + "," + String(yPos + sideLength * 2) + " "
		res += xPos + "," + String(yPos + sideLength * 2) + " "
		return res
	}
	alert("Polygon Find Error")
}

export function getRotateString(tileID, rotation, xPos, yPos, sideLength) {
	if (rotation === 0) return ""
	if (!rf.ALL_RECT_TILES.includes(tileID)) return `rotate(${rotation * 90} ${xPos + sideLength} ${yPos + sideLength})`
	if (rotation === 1) return `rotate(${rotation * 90} ${xPos + sideLength} ${yPos + sideLength})`
	if (rotation === 2) return `rotate(${rotation * 90} ${xPos + sideLength / 2} ${yPos + sideLength})`
	if (rotation === 3) return `rotate(${rotation * 90} ${xPos + sideLength / 2} ${yPos + sideLength / 2})`
}

export function getPolygonPointsForCable(rotation, xPos, yPos, sideLength) {
	let res = ""
	if (rotation === 0) {
		res += xPos + sideLength / 3 + "," + String(yPos + sideLength / 2) + " "
		res += xPos + (sideLength * 2) / 3 + "," + String(yPos + sideLength / 2) + " "
		res += xPos + (sideLength * 2) / 3 + "," + String(yPos + sideLength + sideLength / 2) + " "
		res += xPos + sideLength / 3 + "," + String(yPos + sideLength + sideLength / 2) + " "
		return res
	}

	if (rotation === 1) {
		res += xPos + sideLength / 2 + "," + String(yPos + sideLength / 3) + " "
		res += xPos + sideLength + sideLength / 2 + "," + String(yPos + sideLength / 3) + " "
		res += xPos + sideLength + sideLength / 2 + "," + String(yPos + (sideLength * 2) / 3) + " "
		res += xPos + sideLength / 2 + "," + String(yPos + (sideLength * 2) / 3) + " "
		return res
	}
}
