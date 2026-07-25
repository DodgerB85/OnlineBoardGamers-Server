/**
 * Anything to do with visual displays.
 * So getting images / pngs
 * Also any long tedious functions to draw / position things
 *
 *

 */

import * as rf from "./INDreference"
import * as model from "./INDmodel"
import * as rfm from "./INDmapData"
import * as IO from "../backend/IND_IO"
import * as map from "./INDmap"

import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"

export function kickoutTimerTicker() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.trainingGame ||  store.historyOnly || store.gameflow.phase === rf.PHASE_GAME_OVER) {
		clearInterval(personal.kickoutCountdownIntervalTimer)
		return
	}

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
		clearInterval(personal.kickoutFlexiCountdownIntervalTimer)
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

	if (store.gameflow.phase === rf.PHASE_NEW_ERA) return "New Era"
	else if (store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) return "Bid Turn Order"
	else if (store.gameflow.phase === rf.PHASE_MERGERS) return "Mergers"
	else if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) return "Mergers - Bid"
	else if (store.gameflow.phase === rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS) return "Mergers - Siap Saji"
	else if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) return "Acquisitions"
	else if (store.gameflow.phase === rf.PHASE_R_AND_D) return "Research & Development"
	else if (store.gameflow.phase === rf.PHASE_OPERATIONS) return "Operations"
	else if (store.gameflow.phase === rf.PHASE_CITY_GROWTH) return "City Growth"
	else if (store.gameflow.phase === rf.PHASE_GAME_OVER) return "Game Over"
	else if (store.gameflow.phase === rf.PHASE_MERGER_SHIP_REDEPLOYMENT) return "Ship Redeployment"

	return "NOT FOUND"
}

export function getGoodColour(good) {
	if (good === rf.GOOD_RICE) return "#CABA1C"
	if (good === rf.GOOD_SPICE) return "#51A334"
	if (good === rf.GOOD_RUBBER) return "grey"
	if (good === rf.GOOD_OIL) return "black"
	if (good === rf.GOOD_SIAP_FAJI) return "orange"
}

export function findEraCardGfxCodeFromID(cardID) {
	const store = useModelStore()
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) return rf.ALL_ERA_CARDS.find((card) => card.id === cardID).gfx
	else if (store.mapData.selectedMap === rf.MAP_AEGEAN) return rf.AG_ALL_ERA_CARDS.find((card) => card.id === cardID).gfx
	else if (store.mapData.selectedMap === rf.MAP_PHP) {
		const card = rf.PH_ALL_ERA_CARDS.find((card) => card.id === cardID)
		if (!card) alert(`Card not found: ${cardID}`)
		if (!card.gfx) alert(`Card gfx not found: ${cardID}`)
		return card.gfx
	}
}

export function getCompanyGfxFromID(companyID) {
	const store = useModelStore()
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) return rf.ALL_COMPANIES.find((company) => company.id === companyID).gfx
	else if (store.mapData.selectedMap === rf.MAP_AEGEAN) return rf.AG_ALL_COMPANIES.find((company) => company.id === companyID).gfx
	else if (store.mapData.selectedMap === rf.MAP_PHP) return rf.PH_ALL_COMPANIES.find((company) => company.id === companyID).gfx
}

export function getProvinceString(provinceID) {
	const store = useModelStore()
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) return rf.OM_PROVINCE_STRINGS[provinceID]
	else if (store.mapData.selectedMap === rf.MAP_AEGEAN) return rf.AG_PROVINCE_STRINGS[provinceID]
	else if (store.mapData.selectedMap === rf.MAP_PHP) return rf.PHP_PROVINCE_STRINGS[provinceID]
}

export function SHIP_GFX_TO_NUM(gfx) {
	const store = useModelStore()
	if (store.options.shipIconsToUse === 0) return rf.ALL_SHIP_GFX_ARRAY_SIMPLE.indexOf(gfx)
	return rf.ALL_SHIP_GFX_ARRAY_FANCY.indexOf(gfx)
}

export function SHIP_NUM_TO_GFX(num) {
	const store = useModelStore()
	if (store.options.shipIconsToUse === 0) return rf.ALL_SHIP_GFX_ARRAY_SIMPLE[num]
	return rf.ALL_SHIP_GFX_ARRAY_FANCY[num]
}

export function getImage(image) {
	const store = useModelStore()
	// Icons
	if (image === "icon-house") return new URL(`../../../static/IND/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/IND/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/IND/images/icon-rulebook.svg`, import.meta.url).href
	//else if (image === "icon-info") return new URL(`../../../static/IND/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/IND/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/IND/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/IND/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/IND/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/IND/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/IND/images/icon-replay.svg`, import.meta.url).href
	else if (image === "icon-hand-card") return new URL(`../../../static/IND/images/icon-hand-card.svg`, import.meta.url).href
	else if (image === "icon-cog") return new URL(`../../../static/IND/images/icon-cog.svg`, import.meta.url).href
	// Other imports
	else if (image === "loading-bar-black") return new URL(`../../../static/IND/images/loading-bar-black.gif`, import.meta.url).href
	else if (image === "INDbox") return new URL(`../../../static/IND/images/INDbox.jpg`, import.meta.url).href
	// MAP ICONS
	else if (image === "OM_map_hex_icon") return new URL(`../../../static/IND/images/maps/OM_map_hex_icon.jpg`, import.meta.url).href
	else if (image === "OM_map_1e2e_icon") return new URL(`../../../static/IND/images/maps/OM_map_1e2e_icon.jpg`, import.meta.url).href
	else if (image === "OM_map_3e_icon") return new URL(`../../../static/IND/images/maps/OM_map_3e_icon.jpg`, import.meta.url).href
	// MAPS
	else if (image === "current_map_background") {
		if (store.mapData.selectedMap === rf.MAP_OM_HEXES) return new URL(`../../../static/IND/images/maps/OM_map_hex.jpg`, import.meta.url).href
		else if (store.mapData.selectedMap === rf.MAP_OM_3E) return new URL(`../../../static/IND/images/maps/OM_map_3e.jpg`, import.meta.url).href
		else if (store.mapData.selectedMap === rf.MAP_OM_1E2E) {
			if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/maps/OM_map_1e2e_icons_1e.jpg`, import.meta.url).href
			if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/maps/OM_map_1e2e_icons_2e.jpg`, import.meta.url).href
		} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) return new URL(`../../../static/IND/images/maps/AG_map.jpg`, import.meta.url).href
		else if (store.mapData.selectedMap === rf.MAP_PHP) return new URL(`../../../static/IND/images/maps/PH_map.jpg`, import.meta.url).href
	}
	// CITIES
	else if (image === "city_1" || image === "city_2" || image === "city_3") {
		if (store.cityColourScheme === 0) {
			if (image === "city_1") return new URL(`../../../static/IND/images/city_green.jpg`, import.meta.url).href
			else if (image === "city_2") return new URL(`../../../static/IND/images/city_orange.jpg`, import.meta.url).href
			else if (image === "city_3") return new URL(`../../../static/IND/images/city_red.jpg`, import.meta.url).href
		} else {
			if (image === "city_1") return new URL(`../../../static/IND/images/city_orange.jpg`, import.meta.url).href
			else if (image === "city_2") return new URL(`../../../static/IND/images/city_green.jpg`, import.meta.url).href
			else if (image === "city_3") return new URL(`../../../static/IND/images/city_red.jpg`, import.meta.url).href
		}
	}
	// ERA CARDS
	else if (image === "era_card_00") return new URL(`../../../static/IND/images/c_era_00.jpg`, import.meta.url).href
	else if (image === "era_card_01") return new URL(`../../../static/IND/images/c_era_01.jpg`, import.meta.url).href
	else if (image === "era_card_02") return new URL(`../../../static/IND/images/c_era_02.jpg`, import.meta.url).href
	else if (image === "era_card_03") return new URL(`../../../static/IND/images/c_era_03.jpg`, import.meta.url).href
	else if (image === "era_card_04") return new URL(`../../../static/IND/images/c_era_04.jpg`, import.meta.url).href
	else if (image === "era_card_10") return new URL(`../../../static/IND/images/c_era_10.jpg`, import.meta.url).href
	else if (image === "era_card_11") return new URL(`../../../static/IND/images/c_era_11.jpg`, import.meta.url).href
	else if (image === "era_card_12") return new URL(`../../../static/IND/images/c_era_12.jpg`, import.meta.url).href
	else if (image === "era_card_13") return new URL(`../../../static/IND/images/c_era_13.jpg`, import.meta.url).href
	else if (image === "era_card_14") return new URL(`../../../static/IND/images/c_era_14.jpg`, import.meta.url).href
	else if (image === "era_card_20") return new URL(`../../../static/IND/images/c_era_20.jpg`, import.meta.url).href
	else if (image === "era_card_21") return new URL(`../../../static/IND/images/c_era_21.jpg`, import.meta.url).href
	else if (image === "era_card_22") return new URL(`../../../static/IND/images/c_era_22.jpg`, import.meta.url).href
	else if (image === "era_card_23") return new URL(`../../../static/IND/images/c_era_23.jpg`, import.meta.url).href
	else if (image === "era_card_24") return new URL(`../../../static/IND/images/c_era_24.jpg`, import.meta.url).href
	// ERA CARDS AEGEAN
	else if (image === "ag_era_card_00") return new URL(`../../../static/IND/images/ag_c_era_00.jpg`, import.meta.url).href
	else if (image === "ag_era_card_01") return new URL(`../../../static/IND/images/ag_c_era_01.jpg`, import.meta.url).href
	else if (image === "ag_era_card_02") return new URL(`../../../static/IND/images/ag_c_era_02.jpg`, import.meta.url).href
	else if (image === "ag_era_card_03") return new URL(`../../../static/IND/images/ag_c_era_03.jpg`, import.meta.url).href
	else if (image === "ag_era_card_04") return new URL(`../../../static/IND/images/ag_c_era_04.jpg`, import.meta.url).href
	else if (image === "ag_era_card_10") return new URL(`../../../static/IND/images/ag_c_era_10.jpg`, import.meta.url).href
	else if (image === "ag_era_card_11") return new URL(`../../../static/IND/images/ag_c_era_11.jpg`, import.meta.url).href
	else if (image === "ag_era_card_12") return new URL(`../../../static/IND/images/ag_c_era_12.jpg`, import.meta.url).href
	else if (image === "ag_era_card_13") return new URL(`../../../static/IND/images/ag_c_era_13.jpg`, import.meta.url).href
	else if (image === "ag_era_card_14") return new URL(`../../../static/IND/images/ag_c_era_14.jpg`, import.meta.url).href
	else if (image === "ag_era_card_20") return new URL(`../../../static/IND/images/ag_c_era_20.jpg`, import.meta.url).href
	else if (image === "ag_era_card_21") return new URL(`../../../static/IND/images/ag_c_era_21.jpg`, import.meta.url).href
	else if (image === "ag_era_card_22") return new URL(`../../../static/IND/images/ag_c_era_22.jpg`, import.meta.url).href
	else if (image === "ag_era_card_23") return new URL(`../../../static/IND/images/ag_c_era_23.jpg`, import.meta.url).href
	else if (image === "ag_era_card_24") return new URL(`../../../static/IND/images/ag_c_era_24.jpg`, import.meta.url).href
	// ERA CARDS PHP
	else if (image === "ph_citycard_era_a_00") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_a_00.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_a_01") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_a_01.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_a_02") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_a_02.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_a_03") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_a_03.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_a_04") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_a_04.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_b_00") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_b_00.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_b_01") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_b_01.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_b_02") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_b_02.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_b_03") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_b_03.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_b_04") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_b_04.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_c_00") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_c_00.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_c_01") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_c_01.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_c_02") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_c_02.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_c_03") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_c_03.jpg`, import.meta.url).href
	else if (image === "ph_citycard_era_c_04") return new URL(`../../../static/IND/images/PHP/eraCards/ph_citycard_era_c_04.jpg`, import.meta.url).href
	// COMPANY DEEDS ERA A
	else if (image === "c_comp_00") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_00_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_00_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_01") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_01_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_01_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_02") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_02_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_02_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_03") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_03_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_03_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_04") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_04_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_04_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_05") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_05_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_05_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_06") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_06_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_06_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_07") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_07_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_07_2e.jpg`, import.meta.url).href
	}
	// COMPANY DEEDS ERA A = AEGEAN
	else if (image === "ag_c_comp_00") return new URL(`../../../static/IND/images/ag_c_comp_00.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_01") return new URL(`../../../static/IND/images/ag_c_comp_01.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_02") return new URL(`../../../static/IND/images/ag_c_comp_02.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_03") return new URL(`../../../static/IND/images/ag_c_comp_03.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_04") return new URL(`../../../static/IND/images/ag_c_comp_04.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_05") return new URL(`../../../static/IND/images/ag_c_comp_05.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_06") return new URL(`../../../static/IND/images/ag_c_comp_06.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_07") return new URL(`../../../static/IND/images/ag_c_comp_07.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_08") return new URL(`../../../static/IND/images/ag_c_comp_08.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_09") return new URL(`../../../static/IND/images/ag_c_comp_09.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_10") return new URL(`../../../static/IND/images/ag_c_comp_10.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_11") return new URL(`../../../static/IND/images/ag_c_comp_11.jpg`, import.meta.url).href
	// COMPANY DEEDS - UNIFIED - PHP
	else if (image === "ph_companycard_era_a_rice_southbicol") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_rice_southbicol.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_rice_westernvisayas") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_rice_westernvisayas.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_rice_zamboanga") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_rice_zamboanga.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_shipping_capitalregion") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_shipping_capitalregion.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_shipping_northbicol") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_shipping_northbicol.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_shipping_northcaraga") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_shipping_northcaraga.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_shipping_zamboanga") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_shipping_zamboanga.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_spice_cagayanvalley") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_spice_cagayanvalley.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_spice_centralluzon") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_spice_centralluzon.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_a_spice_southcaraga") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_a_spice_southcaraga.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_rice_calabarzon") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_rice_calabarzon.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_rice_mindanao") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_rice_mindanao.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_rubber_cordillera") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_rubber_cordillera.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_rubber_davao") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_rubber_davao.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_rubber_malaysia") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_rubber_malaysia.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_rubber_palawan") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_rubber_palawan.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_shipping_cordillera") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_shipping_cordillera.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_shipping_malaysiadavao") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_shipping_malaysiadavao.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_spice_bangsamoro") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_spice_bangsamoro.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_spice_centralvisayas") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_spice_centralvisayas.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_spice_leyte") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_spice_leyte.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_bangsamoro") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_bangsamoro.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_cagayanvalley") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_cagayanvalley.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_calabarzon") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_calabarzon.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_centralluzon") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_centralluzon.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_centralvisayas") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_centralvisayas.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_cordillera") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_cordillera.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_davao") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_davao.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_leyte") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_leyte.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_malaysia") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_malaysia.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_mindanao") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_mindanao.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_palawan") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_palawan.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_southbicol") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_southbicol.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_southcaraga") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_southcaraga.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_westernvisayas") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_westernvisayas.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_oil_zamboanga") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_oil_zamboanga.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_rubber_samar") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_rubber_samar.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_siapfaji_malaysia") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_siapfaji_malaysia.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_spice_quezon") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_spice_quezon.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_b_siapfaji_malaysia") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_b_siapfaji_malaysia.jpg`, import.meta.url).href
	else if (image === "ph_companycard_era_c_rice_soccsksargen") return new URL(`../../../static/IND/images/PHP/companyCards/ph_companycard_era_c_rice_soccsksargen.jpg`, import.meta.url).href
	// COMPANY DEEDS - ERA A - PHP
	//else if (image === "ph_c_comp_00") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_00.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_01") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_01.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_02") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_02.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_03") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_03.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_04") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_04.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_05") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_05.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_06") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_06.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_07") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_07.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_08") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_08.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_09") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_09.jpg`, import.meta.url).href
	// COMPANY DEEDS ERA B
	else if (image === "c_comp_10") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_10_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_10_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_11") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_11_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_11_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_12") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_12_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_12_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_13") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_13_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_13_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_14") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_14_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_14_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_15") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_15_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_15_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_16") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_16_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_16_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_17") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_17_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_17_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_18") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_18_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_18_2e.jpg`, import.meta.url).href
	}
	// COMPANY DEEDS ERA B = AEGEAN
	else if (image === "ag_c_comp_20") return new URL(`../../../static/IND/images/ag_c_comp_20.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_21") return new URL(`../../../static/IND/images/ag_c_comp_21.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_22") return new URL(`../../../static/IND/images/ag_c_comp_22.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_23") return new URL(`../../../static/IND/images/ag_c_comp_23.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_24") return new URL(`../../../static/IND/images/ag_c_comp_24.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_25") return new URL(`../../../static/IND/images/ag_c_comp_25.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_26") return new URL(`../../../static/IND/images/ag_c_comp_26.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_27") return new URL(`../../../static/IND/images/ag_c_comp_27.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_28") return new URL(`../../../static/IND/images/ag_c_comp_28.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_29") return new URL(`../../../static/IND/images/ag_c_comp_29.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_30") return new URL(`../../../static/IND/images/ag_c_comp_30.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_31") return new URL(`../../../static/IND/images/ag_c_comp_31.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_32") return new URL(`../../../static/IND/images/ag_c_comp_32.jpg`, import.meta.url).href
	// COMPANY DEEDS ERA B - PHP
	//else if (image === "ph_c_comp_10") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_10.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_11") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_11.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_12") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_12.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_13") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_13.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_14") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_14.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_15") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_15.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_16") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_16.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_17") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_17.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_18") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_18.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_19") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_19.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_20") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_20.jpg`, import.meta.url).href
	// COMPANY DEEDS ERA C
	else if (image === "c_comp_20") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_20_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_20_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_21") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_21_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_21_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_22") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_22_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_22_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_23") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_23_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_23_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_24") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_24_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_24_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_25") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_25_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_25_2e.jpg`, import.meta.url).href
	} else if (image === "c_comp_26") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/c_comp_26_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/c_comp_26_2e.jpg`, import.meta.url).href
	}
	// COMPANY DEEDS ERA C = AEGEAN
	else if (image === "ag_c_comp_40") return new URL(`../../../static/IND/images/ag_c_comp_40.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_41") return new URL(`../../../static/IND/images/ag_c_comp_41.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_42") return new URL(`../../../static/IND/images/ag_c_comp_42.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_43") return new URL(`../../../static/IND/images/ag_c_comp_43.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_44") return new URL(`../../../static/IND/images/ag_c_comp_44.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_45") return new URL(`../../../static/IND/images/ag_c_comp_45.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_46") return new URL(`../../../static/IND/images/ag_c_comp_46.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_47") return new URL(`../../../static/IND/images/ag_c_comp_47.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_48") return new URL(`../../../static/IND/images/ag_c_comp_48.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_49") return new URL(`../../../static/IND/images/ag_c_comp_49.jpg`, import.meta.url).href
	else if (image === "ag_c_comp_50") return new URL(`../../../static/IND/images/ag_c_comp_50.jpg`, import.meta.url).href
	// COMPANY DEEDS ERA C = PHP
	//else if (image === "ph_c_comp_30") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_30.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_31") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_31.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_32") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_32.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_33") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_33.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_34") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_34.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_35") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_35.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_36") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_36.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_37") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_37.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_38") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_38.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_39") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_39.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_40") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_40.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_41") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_41.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_42") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_42.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_43") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_43.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_44") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_44.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_45") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_45.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_46") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_46.jpg`, import.meta.url).href
	//else if (image === "ph_c_comp_47") return new URL(`../../../static/IND/images/PHP/companyCards/ph_c_comp_47.jpg`, import.meta.url).href
	// PROD MARKERS
	else if (image === "prod_marker_rice") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/prod_marker_rice_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/prod_marker_rice_2e.jpg`, import.meta.url).href
	} else if (image === "prod_marker_spice") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/prod_marker_spice_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/prod_marker_spice_2e.jpg`, import.meta.url).href
	} else if (image === "prod_marker_rubber") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/prod_marker_rubber_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/prod_marker_rubber_2e.jpg`, import.meta.url).href
	} else if (image === "prod_marker_oil") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/prod_marker_oil_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/prod_marker_oil_2e.jpg`, import.meta.url).href
	} else if (image === "prod_marker_siap_faji") {
		if (store.options.iconsToUse === 1) return new URL(`../../../static/IND/images/prod_marker_siap_faji_1e.jpg`, import.meta.url).href
		if (store.options.iconsToUse === 2) return new URL(`../../../static/IND/images/prod_marker_siap_faji_2e.jpg`, import.meta.url).href
	}

	// SHIPS FANCY
	else if (image === "ship_triple_mast") return new URL(`../../../static/IND/images/ships/ship_triple_mast.png`, import.meta.url).href
	else if (image === "ship_masts") return new URL(`../../../static/IND/images/ships/ship_masts.png`, import.meta.url).href
	else if (image === "ship_barque") return new URL(`../../../static/IND/images/ships/ship_barque.png`, import.meta.url).href
	else if (image === "ship_indonesian") return new URL(`../../../static/IND/images/ships/ship_indonesian.png`, import.meta.url).href
	else if (image === "ship_djong1") return new URL(`../../../static/IND/images/ships/ship_djong1.png`, import.meta.url).href
	else if (image === "ship_djong2") return new URL(`../../../static/IND/images/ships/ship_djong2.png`, import.meta.url).href
	else if (image === "ship_djong3") return new URL(`../../../static/IND/images/ships/ship_djong3.png`, import.meta.url).href
	// SHIPS_SIMPLE
	else if (image === "ship_simple_cargo") return new URL(`../../../static/IND/images/ships/ship_simple_cargo.png`, import.meta.url).href
	else if (image === "ship_simple_galleon") return new URL(`../../../static/IND/images/ships/ship_simple_galleon.png`, import.meta.url).href
	else if (image === "ship_simple_pirate") return new URL(`../../../static/IND/images/ships/ship_simple_pirate.png`, import.meta.url).href
	else if (image === "ship_simple_row") return new URL(`../../../static/IND/images/ships/ship_simple_row.png`, import.meta.url).href
	else if (image === "ship_simple_singleSail") return new URL(`../../../static/IND/images/ships/ship_simple_singleSail.png`, import.meta.url).href
	else if (image === "ship_simple_doubleSail") return new URL(`../../../static/IND/images/ships/ship_simple_doubleSail.png`, import.meta.url).href
	else alert("V-GI: " + image)
}

export function performingMapChange(mapNumber) {
	const store = useModelStore()
	if (store.mapData.selectedMap === rf.MAP_AEGEAN) return
	if (store.mapData.selectedMap === rf.MAP_PHP) return
	store.mapData.selectedMap = mapNumber
	if (store.mapData.selectedMap === rf.MAP_OM_HEXES) store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.OM_MAP_HEX))
	if (store.mapData.selectedMap === rf.MAP_OM_1E2E) store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.OM_MAP_1E2E))
	if (store.mapData.selectedMap === rf.MAP_OM_3E) store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.OM_MAP_3E))
	store.refSize = store.mapData.selectedMapData.zoomSettings[2]
	IO.saveZoom(store.refSize)
}

export function getMoneyString(playerIndex, money) {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (!store.hiddenMoney) return money
	if (personal.trainingGame) return money
	if (playerIndex === personal.pov) return money
	return "?"
}

// For history entry
export function getShippingSubsidyAmount(operatingPlayerIndex, playerIndexForSubsidy, non_comuted_entry_ID) {
	const store = useModelStore()
	if (!store.useShippingSubsidy) return 0
	// You cannot subsidise yourself
	if (playerIndexForSubsidy === operatingPlayerIndex) return 0

	// Otherwise, find the latest reseatch level
	for (let histIdx = non_comuted_entry_ID; histIdx >= 0; histIdx--) {
		let entry = store.history[histIdx]
		if (entry[0] === rf.HIST_RND && entry[1] === playerIndexForSubsidy && entry[3][0] == rf.RnD_SHIPPING_SUBSIDY_IDX) {
			return (entry[3][1] - 1) * rf.SHIPPING_SUBSIDY_MULTIPLIER
		}
	}
	return 0
}

export function getMergerSubsidyAmount(playerIndex, non_comuted_entry_ID) {
	const store = useModelStore()
	if (!store.useMergerSubsidy) return 0

	// Otherwise, find the latest reseatch level
	for (let histIdx = non_comuted_entry_ID; histIdx >= 0; histIdx--) {
		let entry = store.history[histIdx]
		if (entry[0] === rf.HIST_RND && entry[1] === playerIndex && entry[3][0] == rf.RnD_MERGER_SUBSIDY_IDX) {
			return (entry[3][1] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER
		}
	}
	return 0
}

// Takes in the entire history entry
export function getTotalIncomeArray(entry, returnCompanies, non_comuted_entry_ID) {
	const store = useModelStore()
	let res = []
	let resComps = []
	// Add the currentPlayerIndex with income 0
	res.push([entry[1], 0, 0])
	resComps.push([entry[3][0][0], 0, 0])

	// If generating a reply, return here
	//if (store.topMenuViews.generatingReplay) return res

	let goodsIncome = rf.GOOD_INCOME[model.getActiveCompanyDataFromID(entry[3][0][0]).good]
	// But if it's SS, then we need to check this is actually correct
	if (goodsIncome === 35) {
		let originalRiceFound = false
		let originalSpiceFound = false
		for (let i = 0; i < entry[3][0].length; i++) {
			let inGameCompanyID = model.getActiveCompanyDataFromID(entry[3][0][i]).id
			let originalCompany
			if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) originalCompany = rf.ALL_COMPANIES.find((company) => company.id === inGameCompanyID)
			else if (store.mapData.selectedMap === rf.MAP_AEGEAN) originalCompany = rf.AG_ALL_COMPANIES.find((company) => company.id === inGameCompanyID)
			else if (store.mapData.selectedMap === rf.MAP_PHP) originalCompany = rf.PH_ALL_COMPANIES.find((company) => company.id === inGameCompanyID)

			if (originalCompany.good === rf.GOOD_RICE) originalRiceFound = true
			if (originalCompany.good === rf.GOOD_SPICE) originalSpiceFound = true
		}
		if (originalRiceFound && originalSpiceFound) goodsIncome = 35
		else if (originalSpiceFound && !originalRiceFound) goodsIncome = 25
		else if (originalRiceFound && !originalSpiceFound) goodsIncome = 20
	}

	// Calculate the main player income
	let totalGoodsSold = entry[3].length - 2
	let mainIncome = goodsIncome * totalGoodsSold
	// Now transfer money to the ships
	for (let i = 1; i < entry[3].length - 1; i++) {
		let shipsIncome = (entry[3][i].length - 4) * 5
		mainIncome -= shipsIncome
		const playerIndex = entry[3][i][1]
		let subsidy = getShippingSubsidyAmount(entry[1], playerIndex, non_comuted_entry_ID, "flag3")
		let subArr = res.find((subArr) => subArr[0] === playerIndex)
		if (subArr === undefined) {
			res.push([entry[3][i][1], shipsIncome, subsidy])
		} else {
			subArr[1] += shipsIncome
			subArr[2] += subsidy
		}
		let subArrComps = resComps.find((subArr) => subArr[0] === entry[3][i][2])
		if (subArrComps === undefined) {
			resComps.push([entry[3][i][2], shipsIncome])
		} else {
			subArrComps[1] += shipsIncome
		}
	}

	res[0][1] += mainIncome
	resComps[0][1] += mainIncome
	if (returnCompanies) return resComps
	return res
}

export function getShipMarkerMainFilterURLfromPlayerIndex(ownerIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let correctedColourNum = personal.getCorrectedColour(store.players[ownerIndex].colour)
	return `url(#f_col_${correctedColourNum})`
}

export function getRemainingHullText(companyID, terrID, terrIdx) {
	const store = useModelStore()
	const company = store.activeCompanies.find((company) => company.id === companyID)

	const totalCapacity = /*multiplier **/ company.hullCapacity
	let remainingCapcity = company.territories[terrIdx][1]
	let usedCapacity = totalCapacity - remainingCapcity
	return `${usedCapacity}/${totalCapacity}`
}
