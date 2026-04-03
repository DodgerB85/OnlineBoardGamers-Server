/**
 * Anything to do with visual displays.
 * So getting images / pngs
 * Also any long tedious functions to draw / position things
 *
 */

import * as rf from "./KFWreference"

import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"

export function hexToRgba(hex, alpha) {
	hex = hex.replace("#", "")
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getPopupXY(xPos, yPos, width, height) {
	let retXpos = xPos + width
	let retYpos = yPos

	// Check if the popup would go off the right side of the screen
	const popupWidth = 250 // Assuming the popup has a width of 250px
	const popupHeight = 400 // Assuming the popup has a height of 300px
	const screenWidth = window.innerWidth // Width of the viewport
	const screenHeight = window.innerHeight // Height of the viewport

	if (retXpos + popupWidth > screenWidth) {
		// Adjust the xPos to the left of the original position
		retXpos = xPos - popupWidth
	}

	if (retYpos + popupHeight > screenHeight+ window.scrollY) {
		// Adjust the yPos to be above the original position to keep the popup on the screen
		retYpos = screenHeight - popupHeight+ window.scrollY
	}

	return [retXpos, retYpos]
}

export function getMeeplePopupXY(xPos, yPos, width) {
	// Check if the popup would go off the right side of the screen
	const popupWidth = 250 // Assuming the popup has a width of 250px
	const popupHeight = 260 // Assuming the popup has a height of 300px
	const screenWidth = window.innerWidth // Width of the viewport
	const screenHeight = window.innerHeight // Height of the viewport

	let retXpos = xPos - popupWidth//- width 
	let retYpos = yPos

	if (retXpos + popupWidth > screenWidth) {
		// Adjust the xPos to the left of the original position
		retXpos = xPos - popupWidth
	}

	if (retYpos + popupHeight > screenHeight+ window.scrollY) {
		// Adjust the yPos to be above the original position to keep the popup on the screen
		retYpos = screenHeight - popupHeight+ window.scrollY
	}

	return [retXpos, retYpos]
}

export function shouldAddStartTurnGlow(area, tile_id, idx) {
	const store = useModelStore()

	//let tile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
	//let tile_id = tile.id
	// Check for bid areas
	if (area === 0) {
		let playerIndex = idx
		let idxArr = store.turnStartHighlights.bidAreas.findIndex((x) => x[0] === tile_id)
		if (idxArr >= 0 && store.turnStartHighlights.bidAreas[idxArr].slice(1).includes(playerIndex)) return true
		return false
	}
	// Check for meeple ROW on tile
	else if (area ===1) {
		let rowVisIdx = idx[0]+1
		let meeplesOnTileRows = idx[1]
		let idxArr = store.turnStartHighlights.actionAreas.findIndex((x) => x[0] === tile_id)
		if (idxArr >= 0) {
			let numRowsToHighlight = store.turnStartHighlights.actionAreas[idxArr].length
			if (rowVisIdx + numRowsToHighlight > meeplesOnTileRows) return true
		} 
		return false
	}
}

export function kickoutTimerTicker() {
	const personal = usePersonalStore()

	if (personal.trainingGame) return

	if (personal.secondsToNextKickout == undefined || personal.secondsToNextKickout > 1200) {
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

export function phaseStr() {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) return "Bidding & Actions"
	if (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) return "Collect Boat Resources"
	if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) return "Village Expansion"
	if (store.gameflow.phase === rf.PHASE_CHOOSE_WINTER_TILES) return "Choose Winter Tiles"
	if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) return "Final Scoring"
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return "Game Over"
	if (store.gameflow.phase === rf.PHASE_GET_BOOKKEEPER_B_CONTRACT) return "Bidding & Actions-B"
	if (store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) return "Bidding & Actions-B"

	if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) return "Pre-Village Expansion"

	return "NOT FOUND"
}

export function getSeasonText(season) {
	if (season === rf.SPRING) return "Spring"
	if (season === rf.SUMMER) return "Summer"
	if (season === rf.AUTUMN) return "Autumn"
	if (season === rf.WINTER) return "Winter"
}

export function getImage(image) {
	// Icons
	if (image === "rotate_cw") return new URL(`@static/KFW/images/rot_clockwise.svg`, import.meta.url).href
	else if (image === "rotate_acw") return new URL(`@static/KFW/images/rot_anticlockwise.svg`, import.meta.url).href
	else if (image === "boat_warn_icon") return new URL(`@static/KFW/images/boat_warn.svg`, import.meta.url).href
	// Seasons (for popup)
	else if (image === "season_0") return new URL(`@static/KFW/images/season_spring.png`, import.meta.url).href
	else if (image === "season_1") return new URL(`@static/KFW/images/season_summer.png`, import.meta.url).href
	else if (image === "season_2") return new URL(`@static/KFW/images/season_autumn.png`, import.meta.url).href
	else if (image === "season_3") return new URL(`@static/KFW/images/season_winter.png`, import.meta.url).href
	// Meeples
	else if (image === "meeple_any") return new URL(`@static/KFW/images/meeple_any.png`, import.meta.url).href
	else if (image === "meeple_blue") return new URL(`@static/KFW/images/meeple_blue.png`, import.meta.url).href
	else if (image === "meeple_red") return new URL(`@static/KFW/images/meeple_red.png`, import.meta.url).href
	else if (image === "meeple_yellow") return new URL(`@static/KFW/images/meeple_yellow.png`, import.meta.url).href
	else if (image === "meeple_green") return new URL(`@static/KFW/images/meeple_green.png`, import.meta.url).href
	else if (image === "meeple_black") return new URL(`@static/KFW/images/meeple_black.png`, import.meta.url).href
	else if (image === "meeple_purple") return new URL(`@static/KFW/images/meeple_purple.png`, import.meta.url).href
	else if (image === "meeple_-4") return new URL(`@static/KFW/images/meeple_random.png`, import.meta.url).href
	else if (image === "meeple_-3") return new URL(`@static/KFW/images/meeple_match.png`, import.meta.url).href
	else if (image === "meeple_-2") return new URL(`@static/KFW/images/meeple_any.png`, import.meta.url).href
	// NB THERE SHOULD BE NO -1. THIS IS JUST TO STOP ERRORS
	else if (image === "meeple_-1") return new URL(`@static/KFW/images/meeple_blank.png`, import.meta.url).href
	else if (image === "meeple_0") return new URL(`@static/KFW/images/meeple_blue.png`, import.meta.url).href
	else if (image === "meeple_1") return new URL(`@static/KFW/images/meeple_red.png`, import.meta.url).href
	else if (image === "meeple_2") return new URL(`@static/KFW/images/meeple_yellow.png`, import.meta.url).href
	else if (image === "meeple_3") return new URL(`@static/KFW/images/meeple_green.png`, import.meta.url).href
	else if (image === "meeple_4") return new URL(`@static/KFW/images/meeple_purple.png`, import.meta.url).href
	else if (image === "meeple_random") return new URL(`@static/KFW/images/meeple_random.png`, import.meta.url).href
	else if (image === "meeple_blank") return new URL(`@static/KFW/images/meeple_blank.png`, import.meta.url).href
	// Skill Tiles
	else if (image === "skillTile_-3") return new URL(`@static/KFW/images/skill_random.jpg`, import.meta.url).href
	else if (image === "skillTile_-2") return new URL(`@static/KFW/images/skill_match.jpg`, import.meta.url).href
	else if (image === "skillTile_-1") return new URL(`@static/KFW/images/skill_any.jpg`, import.meta.url).href
	else if (image === "skillTile_0") return new URL(`@static/KFW/images/skill_saw.jpg`, import.meta.url).href
	else if (image === "skillTile_1") return new URL(`@static/KFW/images/skill_pickaxe.jpg`, import.meta.url).href
	else if (image === "skillTile_2") return new URL(`@static/KFW/images/skill_anvil.jpg`, import.meta.url).href
	else if (image === "skillTile_random") return new URL(`@static/KFW/images/skill_random.jpg`, import.meta.url).href
	else if (image === "skillTile_any") return new URL(`@static/KFW/images/skill_any.jpg`, import.meta.url).href
	// Resources
	else if (image === "res_-2") return new URL(`@static/KFW/images/res_match.png`, import.meta.url).href
	else if (image === "res_-1") return new URL(`@static/KFW/images/res_any.png`, import.meta.url).href
	else if (image === "res_0") return new URL(`@static/KFW/images/res_wood.png`, import.meta.url).href
	else if (image === "res_1") return new URL(`@static/KFW/images/res_stone.png`, import.meta.url).href
	else if (image === "res_2") return new URL(`@static/KFW/images/res_iron.png`, import.meta.url).href
	else if (image === "res_3") return new URL(`@static/KFW/images/res_gold.png`, import.meta.url).href
	// contracts
	else if (image === "c_m_00") return new URL(`@static/KFW/images/contracts/c_m_00.jpg`, import.meta.url).href
	else if (image === "c_m_01") return new URL(`@static/KFW/images/contracts/c_m_01.jpg`, import.meta.url).href
	else if (image === "c_m_02") return new URL(`@static/KFW/images/contracts/c_m_02.jpg`, import.meta.url).href
	else if (image === "c_m_03") return new URL(`@static/KFW/images/contracts/c_m_03.jpg`, import.meta.url).href
	else if (image === "c_m_04") return new URL(`@static/KFW/images/contracts/c_m_04.jpg`, import.meta.url).href
	else if (image === "c_m_05") return new URL(`@static/KFW/images/contracts/c_m_05.jpg`, import.meta.url).href
	else if (image === "c_m_06") return new URL(`@static/KFW/images/contracts/c_m_06.jpg`, import.meta.url).href
	else if (image === "c_m_07") return new URL(`@static/KFW/images/contracts/c_m_07.jpg`, import.meta.url).href
	else if (image === "c_m_08") return new URL(`@static/KFW/images/contracts/c_m_08.jpg`, import.meta.url).href
	else if (image === "c_m_09") return new URL(`@static/KFW/images/contracts/c_m_09.jpg`, import.meta.url).href
	else if (image === "c_m_10") return new URL(`@static/KFW/images/contracts/c_m_10.jpg`, import.meta.url).href
	else if (image === "c_m_11") return new URL(`@static/KFW/images/contracts/c_m_11.jpg`, import.meta.url).href
	else if (image === "c_m_12") return new URL(`@static/KFW/images/contracts/c_m_12.jpg`, import.meta.url).href
	else if (image === "c_s_13") return new URL(`@static/KFW/images/contracts/c_m_13.jpg`, import.meta.url).href
	else if (image === "c_s_14") return new URL(`@static/KFW/images/contracts/c_m_14.jpg`, import.meta.url).href
	else if (image === "c_s_15") return new URL(`@static/KFW/images/contracts/c_m_15.jpg`, import.meta.url).href
	else if (image === "c_s_16") return new URL(`@static/KFW/images/contracts/c_m_16.jpg`, import.meta.url).href
	else if (image === "c_s_17") return new URL(`@static/KFW/images/contracts/c_m_17.jpg`, import.meta.url).href
	else if (image === "c_s_18") return new URL(`@static/KFW/images/contracts/c_m_18.jpg`, import.meta.url).href
	else if (image === "c_s_19") return new URL(`@static/KFW/images/contracts/c_m_19.jpg`, import.meta.url).href
	else if (image === "c_s_20") return new URL(`@static/KFW/images/contracts/c_m_20.jpg`, import.meta.url).href
	else if (image === "c_s_21") return new URL(`@static/KFW/images/contracts/c_m_21.jpg`, import.meta.url).href
	else if (image === "c_s_22") return new URL(`@static/KFW/images/contracts/c_m_22.jpg`, import.meta.url).href
	else if (image === "c_r_23") return new URL(`@static/KFW/images/contracts/c_m_23.jpg`, import.meta.url).href
	else if (image === "c_r_24") return new URL(`@static/KFW/images/contracts/c_m_24.jpg`, import.meta.url).href
	else if (image === "c_r_25") return new URL(`@static/KFW/images/contracts/c_m_25.jpg`, import.meta.url).href
	else if (image === "c_r_26") return new URL(`@static/KFW/images/contracts/c_m_26.jpg`, import.meta.url).href
	else if (image === "c_r_27") return new URL(`@static/KFW/images/contracts/c_m_27.jpg`, import.meta.url).href
	else if (image === "c_r_28") return new URL(`@static/KFW/images/contracts/c_m_28.jpg`, import.meta.url).href
	else if (image === "c_r_29") return new URL(`@static/KFW/images/contracts/c_m_29.jpg`, import.meta.url).href
	else if (image === "c_r_30") return new URL(`@static/KFW/images/contracts/c_m_30.jpg`, import.meta.url).href
	else if (image === "c_r_31") return new URL(`@static/KFW/images/contracts/c_m_31.jpg`, import.meta.url).href
	else if (image === "c_r_32") return new URL(`@static/KFW/images/contracts/c_m_32.jpg`, import.meta.url).href
	else if (image === "c_r_33") return new URL(`@static/KFW/images/contracts/c_m_33.jpg`, import.meta.url).href
	else if (image === "c_r_34") return new URL(`@static/KFW/images/contracts/c_m_34.jpg`, import.meta.url).href
	else if (image === "c_r_35") return new URL(`@static/KFW/images/contracts/c_m_35.jpg`, import.meta.url).href
	else if (image === "c_back") return new URL(`@static/KFW/images/contracts/c_back.jpg`, import.meta.url).href
	// cabin
	else if (image === "cabin") return new URL(`@static/KFW/images/cabin.png`, import.meta.url).href
	// extensions
	else if (image === "e_b_00") return new URL(`@static/KFW/images/extensions/e_b_00.jpg`, import.meta.url).href
	else if (image === "e_b_01") return new URL(`@static/KFW/images/extensions/e_b_01.jpg`, import.meta.url).href
	else if (image === "e_b_02") return new URL(`@static/KFW/images/extensions/e_b_02.jpg`, import.meta.url).href
	else if (image === "e_b_03") return new URL(`@static/KFW/images/extensions/e_b_03.jpg`, import.meta.url).href
	else if (image === "e_b_04") return new URL(`@static/KFW/images/extensions/e_b_04.jpg`, import.meta.url).href
	else if (image === "e_r_05") return new URL(`@static/KFW/images/extensions/e_r_05.jpg`, import.meta.url).href
	else if (image === "e_r_06") return new URL(`@static/KFW/images/extensions/e_r_06.jpg`, import.meta.url).href
	else if (image === "e_r_07") return new URL(`@static/KFW/images/extensions/e_r_07.jpg`, import.meta.url).href
	else if (image === "e_r_08") return new URL(`@static/KFW/images/extensions/e_r_08.jpg`, import.meta.url).href
	else if (image === "e_r_09") return new URL(`@static/KFW/images/extensions/e_r_09.jpg`, import.meta.url).href
	else if (image === "e_y_10") return new URL(`@static/KFW/images/extensions/e_y_10.jpg`, import.meta.url).href
	else if (image === "e_y_11") return new URL(`@static/KFW/images/extensions/e_y_11.jpg`, import.meta.url).href
	else if (image === "e_y_12") return new URL(`@static/KFW/images/extensions/e_y_12.jpg`, import.meta.url).href
	else if (image === "e_y_13") return new URL(`@static/KFW/images/extensions/e_y_13.jpg`, import.meta.url).href
	else if (image === "e_y_14") return new URL(`@static/KFW/images/extensions/e_y_14.jpg`, import.meta.url).href
	else if (image === "e_g_15") return new URL(`@static/KFW/images/extensions/e_g_15.jpg`, import.meta.url).href
	else if (image === "e_g_16") return new URL(`@static/KFW/images/extensions/e_g_16.jpg`, import.meta.url).href
	else if (image === "e_g_17") return new URL(`@static/KFW/images/extensions/e_g_17.jpg`, import.meta.url).href
	else if (image === "e_blue") return new URL(`@static/KFW/images/extensions/e_blue.jpg`, import.meta.url).href
	else if (image === "e_red") return new URL(`@static/KFW/images/extensions/e_red.jpg`, import.meta.url).href
	else if (image === "e_yellow") return new URL(`@static/KFW/images/extensions/e_yellow.jpg`, import.meta.url).href
	else if (image === "e_green") return new URL(`@static/KFW/images/extensions/e_green.jpg`, import.meta.url).href
	/****************************** TILES */
	// Spring Tiles
	else if (image === "t_spring_1a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_1a.jpg`, import.meta.url).href
	else if (image === "t_spring_1b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_1b.jpg`, import.meta.url).href
	else if (image === "t_spring_2a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_2a.jpg`, import.meta.url).href
	else if (image === "t_spring_2b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_2b.jpg`, import.meta.url).href
	else if (image === "t_spring_3a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_3a.jpg`, import.meta.url).href
	else if (image === "t_spring_3b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_3b.jpg`, import.meta.url).href
	else if (image === "t_spring_4a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_4a.jpg`, import.meta.url).href
	else if (image === "t_spring_4b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_4b.jpg`, import.meta.url).href
	else if (image === "t_spring_5a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_5a.jpg`, import.meta.url).href
	else if (image === "t_spring_5b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_5b.jpg`, import.meta.url).href
	else if (image === "t_spring_6a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_6a.jpg`, import.meta.url).href
	else if (image === "t_spring_6b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_6b.jpg`, import.meta.url).href
	else if (image === "t_spring_7a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_7a.jpg`, import.meta.url).href
	else if (image === "t_spring_7b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_7b.jpg`, import.meta.url).href
	else if (image === "t_spring_8a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_8a.jpg`, import.meta.url).href
	else if (image === "t_spring_8b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_8b.jpg`, import.meta.url).href
	else if (image === "t_spring_9a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_9a.jpg`, import.meta.url).href
	else if (image === "t_spring_9b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_9b.jpg`, import.meta.url).href
	else if (image === "t_spring_10a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_10a.jpg`, import.meta.url).href
	else if (image === "t_spring_10b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_10b.jpg`, import.meta.url).href
	else if (image === "t_spring_11a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_11a.jpg`, import.meta.url).href
	else if (image === "t_spring_11b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_11b.jpg`, import.meta.url).href
	else if (image === "t_spring_12a.jpg") return new URL(`@static/KFW/images/tiles/t_spring_12a.jpg`, import.meta.url).href
	else if (image === "t_spring_12b.jpg") return new URL(`@static/KFW/images/tiles/t_spring_12b.jpg`, import.meta.url).href
	// Summer Tiles
	else if (image === "t_summer_1a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_1a.jpg`, import.meta.url).href
	else if (image === "t_summer_1b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_1b.jpg`, import.meta.url).href
	else if (image === "t_summer_2a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_2a.jpg`, import.meta.url).href
	else if (image === "t_summer_2b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_2b.jpg`, import.meta.url).href
	else if (image === "t_summer_3a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_3a.jpg`, import.meta.url).href
	else if (image === "t_summer_3b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_3b.jpg`, import.meta.url).href
	else if (image === "t_summer_4a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_4a.jpg`, import.meta.url).href
	else if (image === "t_summer_4b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_4b.jpg`, import.meta.url).href
	else if (image === "t_summer_5a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_5a.jpg`, import.meta.url).href
	else if (image === "t_summer_5b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_5b.jpg`, import.meta.url).href
	else if (image === "t_summer_6a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_6a.jpg`, import.meta.url).href
	else if (image === "t_summer_6b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_6b.jpg`, import.meta.url).href
	else if (image === "t_summer_7a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_7a.jpg`, import.meta.url).href
	else if (image === "t_summer_7b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_7b.jpg`, import.meta.url).href
	else if (image === "t_summer_8a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_8a.jpg`, import.meta.url).href
	else if (image === "t_summer_8b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_8b.jpg`, import.meta.url).href
	else if (image === "t_summer_9a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_9a.jpg`, import.meta.url).href
	else if (image === "t_summer_9b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_9b.jpg`, import.meta.url).href
	else if (image === "t_summer_10a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_10a.jpg`, import.meta.url).href
	else if (image === "t_summer_10b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_10b.jpg`, import.meta.url).href
	else if (image === "t_summer_11a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_11a.jpg`, import.meta.url).href
	else if (image === "t_summer_11b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_11b.jpg`, import.meta.url).href
	else if (image === "t_summer_12a.jpg") return new URL(`@static/KFW/images/tiles/t_summer_12a.jpg`, import.meta.url).href
	else if (image === "t_summer_12b.jpg") return new URL(`@static/KFW/images/tiles/t_summer_12b.jpg`, import.meta.url).href
	// Autumn Tiles
	else if (image === "t_autumn_1a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_1a.jpg`, import.meta.url).href
	else if (image === "t_autumn_1b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_1b.jpg`, import.meta.url).href
	else if (image === "t_autumn_2a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_2a.jpg`, import.meta.url).href
	else if (image === "t_autumn_2b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_2b.jpg`, import.meta.url).href
	else if (image === "t_autumn_3a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_3a.jpg`, import.meta.url).href
	else if (image === "t_autumn_3b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_3b.jpg`, import.meta.url).href
	else if (image === "t_autumn_4a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_4a.jpg`, import.meta.url).href
	else if (image === "t_autumn_4b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_4b.jpg`, import.meta.url).href
	else if (image === "t_autumn_5a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_5a.jpg`, import.meta.url).href
	else if (image === "t_autumn_5b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_5b.jpg`, import.meta.url).href
	else if (image === "t_autumn_6a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_6a.jpg`, import.meta.url).href
	else if (image === "t_autumn_6b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_6b.jpg`, import.meta.url).href
	else if (image === "t_autumn_7a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_7a.jpg`, import.meta.url).href
	else if (image === "t_autumn_7b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_7b.jpg`, import.meta.url).href
	else if (image === "t_autumn_8a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_8a.jpg`, import.meta.url).href
	else if (image === "t_autumn_8b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_8b.jpg`, import.meta.url).href
	else if (image === "t_autumn_9a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_9a.jpg`, import.meta.url).href
	else if (image === "t_autumn_9b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_9b.jpg`, import.meta.url).href
	else if (image === "t_autumn_10a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_10a.jpg`, import.meta.url).href
	else if (image === "t_autumn_10b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_10b.jpg`, import.meta.url).href
	else if (image === "t_autumn_11a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_11a.jpg`, import.meta.url).href
	else if (image === "t_autumn_11b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_11b.jpg`, import.meta.url).href
	else if (image === "t_autumn_12a.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_12a.jpg`, import.meta.url).href
	else if (image === "t_autumn_12b.jpg") return new URL(`@static/KFW/images/tiles/t_autumn_12b.jpg`, import.meta.url).href
	// Winter Tiles
	else if (image === "t_winter_1.jpg") return new URL(`@static/KFW/images/tiles/t_winter_1.jpg`, import.meta.url).href
	else if (image === "t_winter_2.jpg") return new URL(`@static/KFW/images/tiles/t_winter_2.jpg`, import.meta.url).href
	else if (image === "t_winter_3.jpg") return new URL(`@static/KFW/images/tiles/t_winter_3.jpg`, import.meta.url).href
	else if (image === "t_winter_4.jpg") return new URL(`@static/KFW/images/tiles/t_winter_4.jpg`, import.meta.url).href
	else if (image === "t_winter_5.jpg") return new URL(`@static/KFW/images/tiles/t_winter_5.jpg`, import.meta.url).href
	else if (image === "t_winter_6.jpg") return new URL(`@static/KFW/images/tiles/t_winter_6.jpg`, import.meta.url).href
	else if (image === "t_winter_7.jpg") return new URL(`@static/KFW/images/tiles/t_winter_7.jpg`, import.meta.url).href
	else if (image === "t_winter_8.jpg") return new URL(`@static/KFW/images/tiles/t_winter_8.jpg`, import.meta.url).href
	else if (image === "t_winter_9.jpg") return new URL(`@static/KFW/images/tiles/t_winter_9.jpg`, import.meta.url).href
	else if (image === "t_winter_10.jpg") return new URL(`@static/KFW/images/tiles/t_winter_10.jpg`, import.meta.url).href
	else if (image === "t_winter_11.jpg") return new URL(`@static/KFW/images/tiles/t_winter_11.jpg`, import.meta.url).href
	else if (image === "t_winter_12.jpg") return new URL(`@static/KFW/images/tiles/t_winter_12.jpg`, import.meta.url).href
	else if (image === "t_winter_back.jpg") return new URL(`@static/KFW/images/tiles/t_winter_back.jpg`, import.meta.url).href
	// Home Tiles
	else if (image === "t_home_1a.jpg") return new URL(`@static/KFW/images/tiles/t_home_1a.jpg`, import.meta.url).href
	else if (image === "t_home_1b.jpg") return new URL(`@static/KFW/images/tiles/t_home_1b.jpg`, import.meta.url).href
	else if (image === "t_home_2a.jpg") return new URL(`@static/KFW/images/tiles/t_home_2a.jpg`, import.meta.url).href
	else if (image === "t_home_2b.jpg") return new URL(`@static/KFW/images/tiles/t_home_2b.jpg`, import.meta.url).href
	else if (image === "t_home_3a.jpg") return new URL(`@static/KFW/images/tiles/t_home_3a.jpg`, import.meta.url).href
	else if (image === "t_home_3b.jpg") return new URL(`@static/KFW/images/tiles/t_home_3b.jpg`, import.meta.url).href
	else if (image === "t_home_4a.jpg") return new URL(`@static/KFW/images/tiles/t_home_4a.jpg`, import.meta.url).href
	else if (image === "t_home_4b.jpg") return new URL(`@static/KFW/images/tiles/t_home_4b.jpg`, import.meta.url).href
	else if (image === "t_home_5a.jpg") return new URL(`@static/KFW/images/tiles/t_home_5a.jpg`, import.meta.url).href
	else if (image === "t_home_5b.jpg") return new URL(`@static/KFW/images/tiles/t_home_5b.jpg`, import.meta.url).href
	else if (image === "t_home_6a.jpg") return new URL(`@static/KFW/images/tiles/t_home_6a.jpg`, import.meta.url).href
	else if (image === "t_home_6b.jpg") return new URL(`@static/KFW/images/tiles/t_home_6b.jpg`, import.meta.url).href
	// Turn Order Tiles
	else if (image === "t_turnorder_1a.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_1a.jpg`, import.meta.url).href
	else if (image === "t_turnorder_1b.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_1b.jpg`, import.meta.url).href
	else if (image === "t_turnorder_2a.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_2a.jpg`, import.meta.url).href
	else if (image === "t_turnorder_2b.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_2b.jpg`, import.meta.url).href
	else if (image === "t_turnorder_3a.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_3a.jpg`, import.meta.url).href
	else if (image === "t_turnorder_3b.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_3b.jpg`, import.meta.url).href
	else if (image === "t_turnorder_4a.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_4a.jpg`, import.meta.url).href
	else if (image === "t_turnorder_back.jpg") return new URL(`@static/KFW/images/tiles/t_turnorder_back.jpg`, import.meta.url).href
	// Boat Tiles
	else if (image === "t_boat_1a.jpg") return new URL(`@static/KFW/images/tiles/t_boat_1a.jpg`, import.meta.url).href
	else if (image === "t_boat_1b.jpg") return new URL(`@static/KFW/images/tiles/t_boat_1b.jpg`, import.meta.url).href
	else if (image === "t_boat_2a.jpg") return new URL(`@static/KFW/images/tiles/t_boat_2a.jpg`, import.meta.url).href
	else if (image === "t_boat_2b.jpg") return new URL(`@static/KFW/images/tiles/t_boat_2b.jpg`, import.meta.url).href
	else if (image === "t_boat_3a.jpg") return new URL(`@static/KFW/images/tiles/t_boat_3a.jpg`, import.meta.url).href
	else if (image === "t_boat_3b.jpg") return new URL(`@static/KFW/images/tiles/t_boat_3b.jpg`, import.meta.url).href
	else if (image === "t_boat_4a.jpg") return new URL(`@static/KFW/images/tiles/t_boat_4a.jpg`, import.meta.url).href
	else if (image === "t_boat_4b.jpg") return new URL(`@static/KFW/images/tiles/t_boat_4b.jpg`, import.meta.url).href
	else if (image === "t_boat_5a.jpg") return new URL(`@static/KFW/images/tiles/t_boat_5a.jpg`, import.meta.url).href
	else if (image === "t_boat_5b.jpg") return new URL(`@static/KFW/images/tiles/t_boat_5b.jpg`, import.meta.url).href
	else if (image === "t_boat_6a.jpg") return new URL(`@static/KFW/images/tiles/t_boat_6a.jpg`, import.meta.url).href
	else if (image === "t_boat_6b.jpg") return new URL(`@static/KFW/images/tiles/t_boat_6b.jpg`, import.meta.url).href
	/************************************* Promo tiles */
	// Spring Promo Tiles
	else if (image === "t_p_spring_1a.jpg") return new URL(`@static/KFW/images/tiles/t_p_spring_1a.jpg`, import.meta.url).href
	else if (image === "t_p_spring_1b.jpg") return new URL(`@static/KFW/images/tiles/t_p_spring_1b.jpg`, import.meta.url).href
	// Summer Promo Tiles
	else if (image === "t_p_summer_1a.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_1a.jpg`, import.meta.url).href
	else if (image === "t_p_summer_1b.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_1b.jpg`, import.meta.url).href
	else if (image === "t_p_summer_2a.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_2a.jpg`, import.meta.url).href
	else if (image === "t_p_summer_2b.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_2b.jpg`, import.meta.url).href
	else if (image === "t_p_summer_3a.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_3a.jpg`, import.meta.url).href
	else if (image === "t_p_summer_3b.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_3b.jpg`, import.meta.url).href
	else if (image === "t_p_summer_4a.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_4a.jpg`, import.meta.url).href
	else if (image === "t_p_summer_4b.jpg") return new URL(`@static/KFW/images/tiles/t_p_summer_4b.jpg`, import.meta.url).href
	// Autumn Promo Tiles
	else if (image === "t_p_autumn_1a.jpg") return new URL(`@static/KFW/images/tiles/t_p_autumn_1a.jpg`, import.meta.url).href
	else if (image === "t_p_autumn_1b.jpg") return new URL(`@static/KFW/images/tiles/t_p_autumn_1b.jpg`, import.meta.url).href
	//else if (image === "t_p_autumn_2a.jpg") return new URL(`@static/KFW/images/tiles/t_p_autumn_2a.jpg`, import.meta.url).href
	//else if (image === "t_p_autumn_2b.jpg") return new URL(`@static/KFW/images/tiles/t_p_autumn_2b.jpg`, import.meta.url).href
	// Winter Promo Tiles
	else if (image === "t_p_winter_1.jpg") return new URL(`@static/KFW/images/tiles/t_p_winter_1.jpg`, import.meta.url).href
	else if (image === "t_p_winter_2.jpg") return new URL(`@static/KFW/images/tiles/t_p_winter_2.jpg`, import.meta.url).href
	else if (image === "t_p_winter_3.jpg") return new URL(`@static/KFW/images/tiles/t_p_winter_3.jpg`, import.meta.url).href
	else if (image === "t_p_winter_4.jpg") return new URL(`@static/KFW/images/tiles/t_p_winter_4.jpg`, import.meta.url).href
	else if (image === "t_p_winter_5.jpg") return new URL(`@static/KFW/images/tiles/t_p_winter_5.jpg`, import.meta.url).href
	else if (image === "t_p_winter_6.jpg") return new URL(`@static/KFW/images/tiles/t_p_winter_6.jpg`, import.meta.url).href
	else if (image === "t_p_winter_7.jpg") return new URL(`@static/KFW/images/tiles/t_p_winter_7.jpg`, import.meta.url).href
	/******************************MERCHANTS TILES  */
	// Spring
	else if (image === "t_m_spring_1a.jpg") return new URL(`@static/KFW/images/tiles/t_m_spring_1a.jpg`, import.meta.url).href
	else if (image === "t_m_spring_1b.jpg") return new URL(`@static/KFW/images/tiles/t_m_spring_1b.jpg`, import.meta.url).href
	// Summer
	else if (image === "t_m_summer_1a.jpg") return new URL(`@static/KFW/images/tiles/t_m_summer_1a.jpg`, import.meta.url).href
	else if (image === "t_m_summer_1b.jpg") return new URL(`@static/KFW/images/tiles/t_m_summer_1b.jpg`, import.meta.url).href
	// Autumn
	else if (image === "t_m_autumn_1a.jpg") return new URL(`@static/KFW/images/tiles/t_m_autumn_1a.jpg`, import.meta.url).href
	else if (image === "t_m_autumn_1b.jpg") return new URL(`@static/KFW/images/tiles/t_m_autumn_1b.jpg`, import.meta.url).href
	// Winter
	else if (image === "t_m_winter_1a.jpg") return new URL(`@static/KFW/images/tiles/t_m_winter_1a.jpg`, import.meta.url).href
	else if (image === "t_m_winter_2a.jpg") return new URL(`@static/KFW/images/tiles/t_m_winter_2a.jpg`, import.meta.url).href
	else if (image === "t_m_winter_3a.jpg") return new URL(`@static/KFW/images/tiles/t_m_winter_3a.jpg`, import.meta.url).href
	// Boat
	else if (image === "t_m_boat_1a.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_1a.jpg`, import.meta.url).href
	else if (image === "t_m_boat_1b.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_1b.jpg`, import.meta.url).href
	else if (image === "t_m_boat_2a.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_2a.jpg`, import.meta.url).href
	else if (image === "t_m_boat_2b.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_2b.jpg`, import.meta.url).href
	else if (image === "t_m_boat_3a.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_3a.jpg`, import.meta.url).href
	else if (image === "t_m_boat_3b.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_3b.jpg`, import.meta.url).href
	else if (image === "t_m_boat_4a.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_4a.jpg`, import.meta.url).href
	else if (image === "t_m_boat_4b.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_4b.jpg`, import.meta.url).href
	else if (image === "t_m_boat_5a.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_5a.jpg`, import.meta.url).href
	else if (image === "t_m_boat_5b.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_5b.jpg`, import.meta.url).href
	else if (image === "t_m_boat_6a.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_6a.jpg`, import.meta.url).href
	else if (image === "t_m_boat_6b.jpg") return new URL(`@static/KFW/images/tiles/t_m_boat_6b.jpg`, import.meta.url).href

	else alert("V-GI: " + image)
}

/// Item flag: 0 = GREEN meeples, 1 = meeples, 2 = skill tiles, 3 = cabins, 4 = resources, 5 = contracts
export function getPosOnAvailableBoat(idx, itemFlag, tileProp, innerIndex) {
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_KEYFLOWER_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-140, -155]
			if (idx === 1) return [-35, -155]
			if (idx === 2) return [-140, -55]
			if (idx === 3) return [-35, -55]
			if (idx === 4) return [-140, 45]
			if (idx === 5) return [-35, 45]
			if (idx === 6) return [-140, 150]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-30, 155]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_KEYFLOWER_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-140, -155]
			if (idx === 1) return [-35, -155]
			if (idx === 2) return [-85, -50]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-145, 60]
			if (idx === 1) return [-25, 60]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_SEA_BASTION_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-105, -175]
			if (idx === 1) return [0, -175]
			if (idx === 2) return [-105, -75]
			if (idx === 3) return [0, -75]
			if (idx === 4) return [-105, 25]
			if (idx === 5) return [0, 25]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-110, 135]
			if (idx === 1) return [5, 135]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_SEA_BREESE_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-150, -155]
			if (idx === 1) return [-45, -155]
			if (idx === 2) return [-150, -55]
			if (idx === 3) return [-45, -55]
			if (idx === 4) return [-150, 55]
			if (idx === 5) return [-45, 55]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-100, 165]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_SEA_BREESE_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-150, -155]
			if (idx === 1) return [-45, -155]
			if (idx === 2) return [-150, -55]
			if (idx === 3) return [-45, -55]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-95, 60]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_FLIPPER_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-110, -210]
			if (idx === 1) return [-170, -105]
			if (idx === 2) return [-60, -105]
			if (idx === 3) return [-170, 0]
			if (idx === 4) return [-60, 0]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-175, 115]
			if (idx === 1) return [-55, 115]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_FLIPPER_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-165, -130]
			if (idx === 1) return [-60, -130]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-170, -20]
			if (idx === 1) return [-52, -20]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_IANVINCIBLE_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-115, -175]
			if (idx === 1) return [-10, -175]
			if (idx === 2) return [-115, -75]
			if (idx === 3) return [-10, -75]
			if (idx === 4) return [-60, 25]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-65, 140]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_IANVINCIBLE_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-115, -175]
			if (idx === 1) return [-10, -175]
			if (idx === 2) return [-63, -75]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-65, 38]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_WHITE_WIND_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-125, -125]
			if (idx === 1) return [-20, -125]
			if (idx === 2) return [-125, -20]
			if (idx === 3) return [-20, -20]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-130, 95]
			if (idx === 1) return [-15, 95]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_BOAT_WHITE_WIND_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-130, -165]
			if (idx === 1) return [-23, -165]
			if (idx === 2) return [-130, -60]
			if (idx === 3) return [-23, -60]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-75, 55]
		}
	}
	// ********************************************************************************* MERCHANTS BOATS
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_KEYFLOWER_2_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-140, -155]
			if (idx === 1) return [-35, -155]
			if (idx === 2) return [-140, -55]
			if (idx === 3) return [-35, -55]
			if (idx === 4) return [-140, 45]
			if (idx === 5) return [-35, 45]
			if (idx === 6) return [-140, 150]
		}
		// 4 = resources
		if (itemFlag === 4) {
			if (idx === 0) return [-35, 150]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_KEYFLOWER_2_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-140, -155]
			if (idx === 1) return [-30, -155]
			if (idx === 2) return [-140, -50]
			if (idx === 3) return [-30, -50]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-135, 60]
		}
		// 4 = resources
		if (itemFlag === 4) {
			if (idx === 0) return [-30, 60]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_SEA_BASTION_2_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-105, -175]
			if (idx === 1) return [0, -175]
			if (idx === 2) return [-105, -75]
			if (idx === 3) return [0, -75]
			if (idx === 4) return [-105, 25]
			if (idx === 5) return [0, 25]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-110, 135]
		}
		// 3 = cabins
		if (itemFlag === 3) {
			if (idx === 0) return [10, 135]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_SEA_BASTION_2_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-100, -160]
			if (idx === 1) return [5, -160]
			if (idx === 2) return [-100, -55]
			if (idx === 3) return [5, -55]

		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-100, 60]
		}
		// 3 = cabins
		if (itemFlag === 3) {
			if (idx === 0) return [20, 60]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_SEA_BREESE_2_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-95, -150]
			if (idx === 1) return [-150, -45]
			if (idx === 2) return [-45, -45]
			if (idx === 3) return [-150, 60]
			if (idx === 4) return [-45, 60]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-150, 170]
		}
		// 5 = contracts
		if (itemFlag === 5) {
			if (idx === 0) return [-50, 175]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_FLIPPER_2_A) {
		// 0 = GREEN meeples
		if (itemFlag === 0) {
			if (idx === 0) return [-115, -210]
		}
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-170, -105]
			if (idx === 1) return [-65, -105]
			if (idx === 2) return [-170, 0]
			if (idx === 3) return [-65, 0]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-175, 115]
			if (idx === 1) return [-55, 115]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_FLIPPER_2_B) {
		// 0 = GREEN meeples
		if (itemFlag === 0) {
			if (idx === 0) return [-112, -170]
		}
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-165, -65]
			if (idx === 1) return [-60, -65]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-170, 50]
			if (idx === 1) return [-52, 50]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_IANVINCIBLE_2_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-85, -175]
			if (idx === 1) return [-135, -75]
			if (idx === 2) return [-25, -75]
			if (idx === 3) return [-135, 35]
			if (idx === 4) return [-25, 35]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-135, 147]
		}
		// 3 = cabins
		if (itemFlag === 3) {
			if (idx === 0) return [-20, 140]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_WHITE_WIND_2_A) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-130, -165]
			if (idx === 1) return [-20, -165]
			if (idx === 2) return [-130, -60]
			if (idx === 3) return [-20, -60]
			if (idx === 4) return [-130, 40]
		}
		// 5 = contracts
		if (itemFlag === 5) {
			if (idx === 0) return [-25, 45]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-130, 150]
			if (idx === 1) return [-15, 150]
		}
	}
	if (tileProp.tileID[innerIndex] === rf.TILE_M_BOAT_WHITE_WIND_2_B) {
		// 1 = meeples
		if (itemFlag === 1) {
			if (idx === 0) return [-130, -165]
			if (idx === 1) return [-20, -165]
			if (idx === 2) return [-130, -60]

		}
		// 5 = contracts
		if (itemFlag === 5) {
			if (idx === 0) return [-30, -60]
		}
		// 2 = skill tiles
		if (itemFlag === 2) {
			if (idx === 0) return [-135, 55]
			if (idx === 1) return [-15, 55]
		}
	}

	let baseIndex = 0
	if (itemFlag >= 1) baseIndex += tileProp.itemsOnBoat.greenMeeples
	if (itemFlag >= 2) baseIndex += tileProp.itemsOnBoat.meeples.length
	if (itemFlag >= 3) baseIndex += tileProp.itemsOnBoat.skillTiles.length
	if (itemFlag >= 4) baseIndex += tileProp.itemsOnBoat.cabins
	if (itemFlag >= 5) baseIndex += tileProp.itemsOnBoat.resources.length
	if (itemFlag >= 6) baseIndex += tileProp.itemsOnBoat.contracts.length

	let posIdx = baseIndex + idx
	// cabins, resources, and contracts need to start on a new line
	if (itemFlag >= 3) if (posIdx % 2 === 1) posIdx += 1

	let itemWidth = 125
	let itemHeight = 125
	let x = -itemWidth + itemHeight * (posIdx % 2)
	let y = -320 + itemHeight * Math.floor(posIdx / 2)

	return [x, y]
}