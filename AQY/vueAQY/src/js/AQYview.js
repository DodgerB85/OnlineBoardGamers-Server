/**
 * Anything to do with visual displays.
 * So getting images / pngs
 * Also any long tedious functions to draw / position things
 *
 */

import * as rf from "./AQYreference"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal"

export function kickoutTimerTicker() {
	//const store = useModelStore()
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
	//const store = useModelStore()
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

	if (store.gameflow.phase === rf.PHASE_FIRST_CITY) return " - First City"
	else if (store.gameflow.phase === rf.PHASE_ALL_RISE) return ".1 - All Rise"
	else if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) return ".2 - City Building"
	else if (store.gameflow.phase === rf.PHASE_TURN_ORDER) return ".3 - Turn Order"
	else if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING) return ".4 - Countryside Building"
	else if (store.gameflow.phase === rf.PHASE_STORE_GOODS) return ".5 - Store Goods"
	else if (store.gameflow.phase === rf.PHASE_HARVEST) return ".6 - Harvest"
	else if (store.gameflow.phase === rf.PHASE_EXPLORE) return ".7 - Explore"
	else if (store.gameflow.phase === rf.PHASE_FAMINE) return ".8 - Famine"
	else if (store.gameflow.phase === rf.PHASE_POLLUTION) return ".9 - Pollution"
	else if (store.gameflow.phase === rf.PHASE_CHECK_VICTORY) return ".10 - Check Victory"
	else if (store.gameflow.phase === rf.PHASE_GAME_OVER) return " - Game Over"
}

export function getTileImgNameFromSeed(seed) {
	if (seed < 10) return "tile_" + String(seed)
	return "tile_" + String(seed - 10) + "M"
}

export function getImage(image) {
	//const store = useModelStore()

	// Grab an convert resource to border resource
	/*if (store.topMenuViews === 1) {
		if (image === "res_" + String(rf.RES_WOOD)) image = "res_border_" + String(rf.RES_WOOD)
		else if (image === "res_" + String(rf.RES_STONE)) image = "res_border_" + String(rf.RES_STONE)
		else if (image === "res_" + String(rf.RES_DYE)) image = "res_border_" + String(rf.RES_DYE)
		else if (image === "res_" + String(rf.RES_GOLD)) image = "res_border_" + String(rf.RES_GOLD)
		else if (image === "res_" + String(rf.RES_PEARLS)) image = "res_border_" + String(rf.RES_PEARLS)
		else if (image === "res_" + String(rf.RES_WINE)) image = "res_border_" + String(rf.RES_WINE)
		else if (image === "res_" + String(rf.RES_FISH)) image = "res_border_" + String(rf.RES_FISH)
		else if (image === "res_" + String(rf.RES_GRAIN)) image = "res_border_" + String(rf.RES_GRAIN)
		else if (image === "res_" + String(rf.RES_OLIVES)) image = "res_border_" + String(rf.RES_OLIVES)
		else if (image === "res_" + String(rf.RES_SHEEP)) image = "res_border_" + String(rf.RES_SHEEP)
	}*/
	
	// Icons
	if (image === "icon-house") return new URL(`../../../static/AQY/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/AQY/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/AQY/images/icon-rulebook.svg`, import.meta.url).href
	else if (image === "icon-info") return new URL(`../../../static/AQY/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/AQY/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/AQY/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/AQY/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/AQY/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/AQY/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/AQY/images/icon-replay.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/AQY/images/icon-notebook.svg`, import.meta.url).href

	// Other imports
	else if (image === "loading-bar-black") return new URL(`../../../static/AQY/images/loading-bar-black.gif`, import.meta.url).href
	else if (image === "rot_anticlockwise") return new URL(`../../../static/AQY/images/rot_anticlockwise.svg`, import.meta.url).href
	else if (image === "rot_clockwise") return new URL(`../../../static/AQY/images/rot_clockwise.svg`, import.meta.url).href
	else if (image === "AQYbox") return new URL(`../../../static/AQY/images/AQYbox.jpg`, import.meta.url).href

	// Intro
	else if (image === "clickPlayers") return new URL(`../../../static/AQY/images/help/clickPlayers.jpg`, import.meta.url).href
	else if (image === "helpCity") return new URL(`../../../static/AQY/images/help/helpCity.jpg`, import.meta.url).href

	// TILES
	else if (image === "tile_0") return new URL(`../../../static/AQY/images/tile_0.jpg`, import.meta.url).href
	else if (image === "tile_1") return new URL(`../../../static/AQY/images/tile_1.jpg`, import.meta.url).href
	else if (image === "tile_2") return new URL(`../../../static/AQY/images/tile_2.jpg`, import.meta.url).href
	else if (image === "tile_3") return new URL(`../../../static/AQY/images/tile_3.jpg`, import.meta.url).href
	else if (image === "tile_4") return new URL(`../../../static/AQY/images/tile_4.jpg`, import.meta.url).href
	else if (image === "tile_5") return new URL(`../../../static/AQY/images/tile_5.jpg`, import.meta.url).href
	else if (image === "tile_6") return new URL(`../../../static/AQY/images/tile_6.jpg`, import.meta.url).href
	else if (image === "tile_7") return new URL(`../../../static/AQY/images/tile_7.jpg`, import.meta.url).href
	///
	else if (image === "tile_0M") return new URL(`../../../static/AQY/images/tile_0M.jpg`, import.meta.url).href
	else if (image === "tile_1M") return new URL(`../../../static/AQY/images/tile_1M.jpg`, import.meta.url).href
	else if (image === "tile_2M") return new URL(`../../../static/AQY/images/tile_2M.jpg`, import.meta.url).href
	else if (image === "tile_3M") return new URL(`../../../static/AQY/images/tile_3M.jpg`, import.meta.url).href
	else if (image === "tile_4M") return new URL(`../../../static/AQY/images/tile_4M.jpg`, import.meta.url).href
	else if (image === "tile_5M") return new URL(`../../../static/AQY/images/tile_5M.jpg`, import.meta.url).href
	else if (image === "tile_6M") return new URL(`../../../static/AQY/images/tile_6M.jpg`, import.meta.url).href
	else if (image === "tile_7M") return new URL(`../../../static/AQY/images/tile_7M.jpg`, import.meta.url).href
	//else if (image === "tile8")
	//    return new URL(`../../../static/AQY/images/tile_8.jpg`, import.meta.url).href;
	// BUILDINGS
	else if (image === "bldg" + rf.BLDG_THEOLOGY) return new URL(`../../../static/AQY/images/b_theology.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_BIOLOGY) return new URL(`../../../static/AQY/images/b_biology.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_UNIVERSITY) return new URL(`../../../static/AQY/images/b_university.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_ALCHEMY) return new URL(`../../../static/AQY/images/b_alchemy.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_PHILOSOPHY) return new URL(`../../../static/AQY/images/b_philosophy.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_BREWERY) return new URL(`../../../static/AQY/images/b_brewery.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_FORCED_LABOUR) return new URL(`../../../static/AQY/images/b_forcedLabour.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_STABLE) return new URL(`../../../static/AQY/images/b_stable.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_HARBOUR) return new URL(`../../../static/AQY/images/b_harbour.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_HOSPITAL) return new URL(`../../../static/AQY/images/b_hospital.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_EXPLORER) return new URL(`../../../static/AQY/images/b_explorer.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_GRANARY) return new URL(`../../../static/AQY/images/b_granary.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_DUMP) return new URL(`../../../static/AQY/images/b_dump.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_CATHEDRAL) return new URL(`../../../static/AQY/images/b_cathedral.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_MARKET) return new URL(`../../../static/AQY/images/b_market.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_CART) return new URL(`../../../static/AQY/images/b_cart.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_FOUNTAIN) return new URL(`../../../static/AQY/images/b_fountain.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_STORAGE) return new URL(`../../../static/AQY/images/b_storage.jpg`, import.meta.url).href
	else if (image === "bldg" + rf.BLDG_GRAVE) return new URL(`../../../static/AQY/images/grave.jpg`, import.meta.url).href
	// STORAGE SIZES
	else if (image === "bldg_storage_12") return new URL(`../../../static/AQY/images/storage/b_storage_12.jpg`, import.meta.url).href
	else if (image === "bldg_storage_14") return new URL(`../../../static/AQY/images/storage/b_storage_14.jpg`, import.meta.url).href
	else if (image === "bldg_storage_16") return new URL(`../../../static/AQY/images/storage/b_storage_16.jpg`, import.meta.url).href
	else if (image === "bldg_storage_21") return new URL(`../../../static/AQY/images/storage/b_storage_21.jpg`, import.meta.url).href
	else if (image === "bldg_storage_22") return new URL(`../../../static/AQY/images/storage/b_storage_22.jpg`, import.meta.url).href
	else if (image === "bldg_storage_23") return new URL(`../../../static/AQY/images/storage/b_storage_23.jpg`, import.meta.url).href
	else if (image === "bldg_storage_24") return new URL(`../../../static/AQY/images/storage/b_storage_24.jpg`, import.meta.url).href
	else if (image === "bldg_storage_25") return new URL(`../../../static/AQY/images/storage/b_storage_25.jpg`, import.meta.url).href
	else if (image === "bldg_storage_26") return new URL(`../../../static/AQY/images/storage/b_storage_26.jpg`, import.meta.url).href
	else if (image === "bldg_storage_27") return new URL(`../../../static/AQY/images/storage/b_storage_27.jpg`, import.meta.url).href
	else if (image === "bldg_storage_32") return new URL(`../../../static/AQY/images/storage/b_storage_32.jpg`, import.meta.url).href
	else if (image === "bldg_storage_34") return new URL(`../../../static/AQY/images/storage/b_storage_34.jpg`, import.meta.url).href
	else if (image === "bldg_storage_36") return new URL(`../../../static/AQY/images/storage/b_storage_36.jpg`, import.meta.url).href
	else if (image === "bldg_storage_41") return new URL(`../../../static/AQY/images/storage/b_storage_41.jpg`, import.meta.url).href
	else if (image === "bldg_storage_42") return new URL(`../../../static/AQY/images/storage/b_storage_42.jpg`, import.meta.url).href
	else if (image === "bldg_storage_43") return new URL(`../../../static/AQY/images/storage/b_storage_43.jpg`, import.meta.url).href
	else if (image === "bldg_storage_44") return new URL(`../../../static/AQY/images/storage/b_storage_44.jpg`, import.meta.url).href
	else if (image === "bldg_storage_45") return new URL(`../../../static/AQY/images/storage/b_storage_45.jpg`, import.meta.url).href
	else if (image === "bldg_storage_46") return new URL(`../../../static/AQY/images/storage/b_storage_46.jpg`, import.meta.url).href
	else if (image === "bldg_storage_47") return new URL(`../../../static/AQY/images/storage/b_storage_47.jpg`, import.meta.url).href
	else if (image === "bldg_storage_52") return new URL(`../../../static/AQY/images/storage/b_storage_52.jpg`, import.meta.url).href
	else if (image === "bldg_storage_54") return new URL(`../../../static/AQY/images/storage/b_storage_54.jpg`, import.meta.url).href
	else if (image === "bldg_storage_56") return new URL(`../../../static/AQY/images/storage/b_storage_56.jpg`, import.meta.url).href
	else if (image === "bldg_storage_61") return new URL(`../../../static/AQY/images/storage/b_storage_61.jpg`, import.meta.url).href
	else if (image === "bldg_storage_62") return new URL(`../../../static/AQY/images/storage/b_storage_62.jpg`, import.meta.url).href
	else if (image === "bldg_storage_63") return new URL(`../../../static/AQY/images/storage/b_storage_63.jpg`, import.meta.url).href
	else if (image === "bldg_storage_64") return new URL(`../../../static/AQY/images/storage/b_storage_64.jpg`, import.meta.url).href
	else if (image === "bldg_storage_65") return new URL(`../../../static/AQY/images/storage/b_storage_65.jpg`, import.meta.url).href
	else if (image === "bldg_storage_66") return new URL(`../../../static/AQY/images/storage/b_storage_66.jpg`, import.meta.url).href
	else if (image === "bldg_storage_67") return new URL(`../../../static/AQY/images/storage/b_storage_67.jpg`, import.meta.url).href
	else if (image === "bldg_storage_72") return new URL(`../../../static/AQY/images/storage/b_storage_72.jpg`, import.meta.url).href
	else if (image === "bldg_storage_74") return new URL(`../../../static/AQY/images/storage/b_storage_74.jpg`, import.meta.url).href
	else if (image === "bldg_storage_76") return new URL(`../../../static/AQY/images/storage/b_storage_76.jpg`, import.meta.url).href
	// HOUSES
	else if (image === "h_1") return new URL(`../../../static/AQY/images/h_1.jpg`, import.meta.url).href
	else if (image === "h_2") return new URL(`../../../static/AQY/images/h_2.jpg`, import.meta.url).href
	else if (image === "h_3") return new URL(`../../../static/AQY/images/h_3.jpg`, import.meta.url).href
	else if (image === "h_4") return new URL(`../../../static/AQY/images/h_4.jpg`, import.meta.url).href
	else if (image === "h_5") return new URL(`../../../static/AQY/images/h_5.jpg`, import.meta.url).href
	else if (image === "h_6") return new URL(`../../../static/AQY/images/h_6.jpg`, import.meta.url).href
	else if (image === "h_7") return new URL(`../../../static/AQY/images/h_7.jpg`, import.meta.url).href
	else if (image === "h_8") return new URL(`../../../static/AQY/images/h_8.jpg`, import.meta.url).href
	else if (image === "h_9") return new URL(`../../../static/AQY/images/h_9.jpg`, import.meta.url).href
	else if (image === "h_10") return new URL(`../../../static/AQY/images/h_10.jpg`, import.meta.url).href
	else if (image === "h_11") return new URL(`../../../static/AQY/images/h_11.jpg`, import.meta.url).href
	else if (image === "h_12") return new URL(`../../../static/AQY/images/h_12.jpg`, import.meta.url).href
	else if (image === "h_13") return new URL(`../../../static/AQY/images/h_13.jpg`, import.meta.url).href
	else if (image === "h_14") return new URL(`../../../static/AQY/images/h_14.jpg`, import.meta.url).href
	else if (image === "h_15") return new URL(`../../../static/AQY/images/h_15.jpg`, import.meta.url).href
	else if (image === "h_16") return new URL(`../../../static/AQY/images/h_16.jpg`, import.meta.url).href
	else if (image === "h_17") return new URL(`../../../static/AQY/images/h_17.jpg`, import.meta.url).href
	else if (image === "h_18") return new URL(`../../../static/AQY/images/h_18.jpg`, import.meta.url).href
	else if (image === "h_19") return new URL(`../../../static/AQY/images/h_19.jpg`, import.meta.url).href
	else if (image === "h_20") return new URL(`../../../static/AQY/images/h_20.jpg`, import.meta.url).href
	// HOUSES IN CITY
	else if (image === "h_city_1") return new URL(`../../../static/AQY/images/h_city_1.jpg`, import.meta.url).href
	else if (image === "h_city_2") return new URL(`../../../static/AQY/images/h_city_2.jpg`, import.meta.url).href
	else if (image === "h_city_3") return new URL(`../../../static/AQY/images/h_city_3.jpg`, import.meta.url).href
	// CITIES
	else if (image === "city6") return new URL(`../../../static/AQY/images/city_6.jpg`, import.meta.url).href
	else if (image === "city7") return new URL(`../../../static/AQY/images/city_7.jpg`, import.meta.url).href
	else if (image === "city_back") return new URL(`../../../static/AQY/images/city_back.jpg`, import.meta.url).href
	// RESOURCES
	else if (image === "res_" + String(rf.RES_WOOD)) return new URL(`../../../static/AQY/images/res_wood.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_STONE)) return new URL(`../../../static/AQY/images/res_stone.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_DYE)) return new URL(`../../../static/AQY/images/res_dye.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_GOLD)) return new URL(`../../../static/AQY/images/res_gold.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_PEARLS)) return new URL(`../../../static/AQY/images/res_pearls.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_WINE)) return new URL(`../../../static/AQY/images/res_wine.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_FISH)) return new URL(`../../../static/AQY/images/res_fish.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_GRAIN)) return new URL(`../../../static/AQY/images/res_grain.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_OLIVES)) return new URL(`../../../static/AQY/images/res_olives.jpg`, import.meta.url).href
	else if (image === "res_" + String(rf.RES_SHEEP)) return new URL(`../../../static/AQY/images/res_sheep.jpg`, import.meta.url).href
	// RESOURCES + BORDER
	else if (image === "res_border_" + String(rf.RES_WOOD)) return new URL(`../../../static/AQY/images/res_border_wood.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_STONE)) return new URL(`../../../static/AQY/images/res_border_stone.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_DYE)) return new URL(`../../../static/AQY/images/res_border_dye.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_GOLD)) return new URL(`../../../static/AQY/images/res_border_gold.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_PEARLS)) return new URL(`../../../static/AQY/images/res_border_pearls.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_WINE)) return new URL(`../../../static/AQY/images/res_border_wine.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_FISH)) return new URL(`../../../static/AQY/images/res_border_fish.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_GRAIN)) return new URL(`../../../static/AQY/images/res_border_grain.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_OLIVES)) return new URL(`../../../static/AQY/images/res_border_olives.jpg`, import.meta.url).href
	else if (image === "res_border_" + String(rf.RES_SHEEP)) return new URL(`../../../static/AQY/images/res_border_sheep.jpg`, import.meta.url).href
	// GRAVE
	else if (image === "grave") return new URL(`../../../static/AQY/images/grave.jpg`, import.meta.url).href
	// SAINTS
	else if (image === "saint_" + rf.SAINT_GIORGIO) return new URL(`../../../static/AQY/images/saint_giorgio.jpg`, import.meta.url).href
	else if (image === "saint_" + rf.SAINT_BARBARA) return new URL(`../../../static/AQY/images/saint_barbara.jpg`, import.meta.url).href
	else if (image === "saint_" + rf.SAINT_CHRISTOFORI) return new URL(`../../../static/AQY/images/saint_christofori.jpg`, import.meta.url).href
	else if (image === "saint_" + rf.SAINT_NICOLO) return new URL(`../../../static/AQY/images/saint_nicolo.jpg`, import.meta.url).href
	else if (image === "saint_" + rf.SAINT_MARIA) return new URL(`../../../static/AQY/images/saint_maria.jpg`, import.meta.url).href
	// INNS - PNGs are needed for the player line
	else if (image === "c_inn_" + String(rf.BLUE)) return new URL(`../../../static/AQY/images/c_inn_blue.jpg`, import.meta.url).href
	else if (image === "c_inn_" + String(rf.PURPLE)) return new URL(`../../../static/AQY/images/c_inn_purple.jpg`, import.meta.url).href
	else if (image === "c_inn_" + String(rf.RED)) return new URL(`../../../static/AQY/images/c_inn_red.jpg`, import.meta.url).href
	else if (image === "c_inn_" + String(rf.YELLOW)) return new URL(`../../../static/AQY/images/c_inn_yellow.jpg`, import.meta.url).href
	else if (image === "c_inn_PNG_" + String(rf.BLUE)) return new URL(`../../../static/AQY/images/c_inn_blue.png`, import.meta.url).href
	else if (image === "c_inn_PNG_" + String(rf.PURPLE)) return new URL(`../../../static/AQY/images/c_inn_purple.png`, import.meta.url).href
	else if (image === "c_inn_PNG_" + String(rf.RED)) return new URL(`../../../static/AQY/images/c_inn_red.png`, import.meta.url).href
	else if (image === "c_inn_PNG_" + String(rf.YELLOW)) return new URL(`../../../static/AQY/images/c_inn_yellow.png`, import.meta.url).href
	// FISHERY
	else if (image === "c_fishery") return new URL(`../../../static/AQY/images/c_fishery.jpg`, import.meta.url).href
	// CITY MAP
	else if (image === "city_" + String(rf.PURPLE)) return new URL(`../../../static/AQY/images/city_purple.jpg`, import.meta.url).href
	else if (image === "city_" + String(rf.BLUE)) return new URL(`../../../static/AQY/images/city_blue.jpg`, import.meta.url).href
	else if (image === "city_" + String(rf.RED)) return new URL(`../../../static/AQY/images/city_red.jpg`, import.meta.url).href
	else if (image === "city_" + String(rf.YELLOW)) return new URL(`../../../static/AQY/images/city_yellow.jpg`, import.meta.url).href
	else if (image === "hex_grass_0") return new URL(`../../../static/AQY/images/hex_grass_0.jpg`, import.meta.url).href
	else if (image === "hex_grass_1") return new URL(`../../../static/AQY/images/hex_grass_1.jpg`, import.meta.url).href
	//else if (image === "pollution") return new URL(`../../../static/AQY/images/pollution.jpg`, import.meta.url)
	else if (image === "explorer") return new URL(`../../../static/AQY/images/c_explorer.jpg`, import.meta.url).href
	else if (image === "explorer_border") return new URL(`../../../static/AQY/images/c_border_explorer.jpg`, import.meta.url).href
	// Zoom Terrain
	else if (image === "zoomTerr_0") return new URL(`../../../static/AQY/images/zoomTerr_0.jpg`, import.meta.url).href
	else if (image === "zoomTerr_1") return new URL(`../../../static/AQY/images/zoomTerr_1.jpg`, import.meta.url).href
	else if (image === "zoomTerr_2") return new URL(`../../../static/AQY/images/zoomTerr_2.jpg`, import.meta.url).href
	else if (image === "zoomTerr_3") return new URL(`../../../static/AQY/images/zoomTerr_3.jpg`, import.meta.url).href
	else rf.doAdminAlrt("V-GI: " + image)
}

export function getCityHouseImg(houseNum) {
	if (houseNum > 20) houseNum -= 20
	if ([1, 2, 3, 4, 11, 12, 13, 14].includes(houseNum)) return "h_city_1"
	if ([5, 6, 7, 15, 16, 17].includes(houseNum)) return "h_city_2"
	if ([8, 9, 10, 18, 19, 20].includes(houseNum)) return "h_city_3"
}
