/**
 * Anything to do with visual displays.
 * So getting images / pngs
 * Also any long tedious functions to draw / position things
 *
 */

import * as rf from "./RNBreference"
//import * as map from "./RNBmap"
import * as vec from "./RNBvector"
import * as util from "./RNButil"
import * as model from "./RNBmodel"
import * as hd from "./RNBhex"
import * as computes from "./RNBcomputes"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal"

export function phaseStr(phase) {
	if (phase === rf.PHASE_CONFLICT_PRODUCTION_DECISION) return "Conflict Decision: Production"
	if (phase === rf.PHASE_CONFLICT_PRODUCTION_PRAYING) return "Conflict Praying: Production"
	if (phase === rf.PHASE_CONFLICT_PRODUCTION_TURN_ORDER) return "Conflict Turn Order: Production"
	if (phase === rf.PHASE_PRODUCTION_TO) return "Production"
	if (phase === rf.PHASE_CONFLICT_MOVEMENT_DECISION) return "Conflict Decision: Movement"
	if (phase === rf.PHASE_CONFLICT_MOVEMENT_PRAYING) return "Conflict Praying: Movement"
	if (phase === rf.PHASE_CONFLICT_MOVEMENT_TURN_ORDER) return "Conflict Turn Order: Movement"
	if (phase === rf.PHASE_MOVEMENT_TO) return "Movement"
	if (phase === rf.PHASE_CONFLICT_BUILDING_DECISION) return "Conflict Decision: Building"
	if (phase === rf.PHASE_CONFLICT_BUILDING_PRAYING) return "Conflict Praying: Building"
	if (phase === rf.PHASE_CONFLICT_BUILDING_TURN_ORDER) return "Conflict Turn Order: Building"
	if (phase === rf.PHASE_BUILDING_TO) return "Building"
	if (phase === rf.PHASE_CONFLICT_WONDER_DECISION) return "Conflict Decision: Wonder"
	if (phase === rf.PHASE_CONFLICT_WONDER_PRAYING) return "Conflict Praying: Wonder"
	if (phase === rf.PHASE_CONFLICT_WONDER_TURN_ORDER) return "Conflict Turn Order: Wonder"
	if (phase === rf.PHASE_WONDER_TO) return "Wonder"

	if (phase === rf.PHASE_CHOOSE_HOME_TILE) return "Choose Home Tile"

	if (phase === rf.PHASE_GAME_OVER) return "Game Over"

	if (phase === rf.PRE_PHASE_CONFLICT_PRODUCTION) return "Production Conflict (pre-phase)"
	if (phase === rf.PRE_PHASE_PRODUCTION) return "Production (pre-phase)"
	if (phase === rf.PRE_PHASE_CONFLICT_MOVEMENT) return "Movement Conflict (pre-phase)"
	if (phase === rf.PRE_PHASE_MOVEMENT) return "Movement (pre-phase)"
	if (phase === rf.PRE_PHASE_CONFLICT_BUILDING) return "Building Conflict (pre-phase)"
	if (phase === rf.PRE_PHASE_BUILDING) return "Building (pre-phase)"
	if (phase === rf.PRE_PHASE_CONFLICT_WONDER) return "Wonder Conflict (pre-phase)"
	if (phase === rf.PRE_PHASE_WONDER) return "Wonder (pre-phase)"

	return `"NO PHASE - ${phase}`
}

export function getOrdinal(num) {
	var n = num % 10
	if (n === 1) return num + "st"
	else if (n === 2) return num + "nd"
	else if (n === 3) return num + "rd"
	else return num + "th"
}

export function basePhaseStr(phase) {
	if (rf.PHASE_PRODUCTIONS.includes(phase)) return "Production"
	else if (rf.PHASE_MOVEMENTS.includes(phase)) return "Movement"
	else if (rf.PHASE_BUILDINGS.includes(phase)) return "Building"
	else if (rf.PHASE_WONDERS.includes(phase)) return "Wonder"
	else if (rf.PHASE_CONFLICT_PRODUCTIONS.includes(phase)) return "Production"
	else if (rf.PHASE_CONFLICT_MOVEMENTS.includes(phase)) return "Movement"
	else if (rf.PHASE_CONFLICT_BUILDINGS.includes(phase)) return "Building"
	else if (rf.PHASE_CONFLICT_WONDERS.includes(phase)) return "Wonder"
}

export function nextBasePhaseStr(phase) {
	if (rf.PHASE_PRODUCTIONS.includes(phase)) return "Movement"
	else if (rf.PHASE_MOVEMENTS.includes(phase)) return "Building"
	else if (rf.PHASE_BUILDINGS.includes(phase)) return "Wonder"
	else if (rf.PHASE_WONDERS.includes(phase)) return "Production"
	else if (phase === rf.PRE_PHASE_CONFLICT_PRODUCTION) return "Next Production"
	else if (phase === rf.PRE_PHASE_CONFLICT_MOVEMENT) return "Next Movement"
	else if (phase === rf.PRE_PHASE_CONFLICT_BUILDING) return "Next Building"
	else if (phase === rf.PRE_PHASE_CONFLICT_WONDER) return "Next Wonder"
}

export function getFlexiKickoutTImerText() {
	const personal = usePersonalStore()
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

export function getImage(image) {
	// Icons
	if (image === "icon-house") return new URL(`../../../static/RNB/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/RNB/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/RNB/images/icon-rulebook.svg`, import.meta.url).href
	else if (image === "icon-info") return new URL(`../../../static/RNB/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/RNB/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/RNB/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/RNB/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/RNB/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/RNB/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/RNB/images/icon-replay.svg`, import.meta.url).href
	//else if (image === "icon-hand-card") return new URL(`../../../static/RNB/images/icon-hand-card.svg`, import.meta.url).href
	//else if (image === "icon-cog") return new URL(`../../../static/RNB/images/icon-cog.svg`, import.meta.url).href
	//else if (image === "icon-help") return new URL(`../../../static/RNB/images/icon-help.svg`, import.meta.url).href
	else if (image === "icon-box") return new URL(`../../../static/RNB/images/icon-box.svg`, import.meta.url).href
	// Other imports
	else if (image === "transporterSelectHelp") return new URL(`../../../static/RNB/help/transporterSelectHelp.jpg`, import.meta.url).href
	else if (image === "loading-bar-black") return new URL(`../../../static/RNB/images/loading-bar-black.gif`, import.meta.url).href
	else if (image === "rot_anticlockwise") return new URL(`../../../static/RNB/images/rot_anticlockwise.svg`, import.meta.url).href
	else if (image === "rot_clockwise") return new URL(`../../../static/RNB/images/rot_clockwise.svg`, import.meta.url).href
	else if (image === "RNBbox") return new URL(`../../../static/RNB/images/RNBbox.jpg`, import.meta.url).href
	else if (image === "resign") return new URL(`../../../static/RNB/images/resign.jpg`, import.meta.url).href
	else if (image === "saveMap") return new URL(`../../../static/RNB/images/saveMap.png`, import.meta.url).href
	else if (image === "replaceMap") return new URL(`../../../static/RNB/images/saveMapReplace.png`, import.meta.url).href
	else if (image === `gem_${rf.BLACK}`) return new URL(`../../../static/RNB/images/gem_black.png`, import.meta.url).href
	else if (image === `gem_${rf.BLUE}`) return new URL(`../../../static/RNB/images/gem_blue.png`, import.meta.url).href
	else if (image === `gem_${rf.GREEN}`) return new URL(`../../../static/RNB/images/gem_green.png`, import.meta.url).href
	else if (image === `gem_${rf.GREY}`) return new URL(`../../../static/RNB/images/gem_grey.png`, import.meta.url).href
	else if (image === `gem_${rf.RED}`) return new URL(`../../../static/RNB/images/gem_red.png`, import.meta.url).href
	else if (image === `gem_${rf.YELLOW}`) return new URL(`../../../static/RNB/images/gem_yellow.png`, import.meta.url).href
	// Player Aid
	else if (image === `playerAid_${rf.PLAYER_AID_OG}`) return new URL(`../../../static/RNB/images/playerAids/playerAid_OG.jpg`, import.meta.url).href
	else if (image === `playerAid_${rf.PLAYER_AID_COLOUR}`) return new URL(`../../../static/RNB/images/playerAids/playerAid_colour.jpg`, import.meta.url).href
	else if (image === `playerAid_${rf.PLAYER_AID_COLOUR_ETC}`) return new URL(`../../../static/RNB/images/playerAids/playerAid_colour_etc.jpg`, import.meta.url).href
	// Reseaarch
	else if (image === "research") return new URL(`../../../static/RNB/images/research/research.jpg`, import.meta.url).href
	else if (image === "research_0") return new URL(`../../../static/RNB/images/research/res_0.jpg`, import.meta.url).href
	else if (image === "research_1") return new URL(`../../../static/RNB/images/research/res_1.jpg`, import.meta.url).href
	else if (image === "research_2") return new URL(`../../../static/RNB/images/research/res_2.jpg`, import.meta.url).href
	else if (image === "research_3") return new URL(`../../../static/RNB/images/research/res_3.jpg`, import.meta.url).href
	else if (image === "research_4") return new URL(`../../../static/RNB/images/research/res_4.jpg`, import.meta.url).href
	else if (image === "research_5") return new URL(`../../../static/RNB/images/research/res_5.jpg`, import.meta.url).href
	else if (image === "research_6") return new URL(`../../../static/RNB/images/research/res_6.jpg`, import.meta.url).href
	else if (image === "research_7") return new URL(`../../../static/RNB/images/research/res_7.jpg`, import.meta.url).href
	// Wonder screen
	else if (image === "wonder") return new URL(`../../../static/RNB/images/wonder/wonder.jpg`, import.meta.url).href
	else if (image === "wonder_brick_0") return new URL(`../../../static/RNB/images/wonder/wonder_brick_0.jpg`, import.meta.url).href
	else if (image === "wonder_brick_1") return new URL(`../../../static/RNB/images/wonder/wonder_brick_1.jpg`, import.meta.url).href
	else if (image === "wonder_brick_2") return new URL(`../../../static/RNB/images/wonder/wonder_brick_2.jpg`, import.meta.url).href
	else if (image === "wonder_brick_3") return new URL(`../../../static/RNB/images/wonder/wonder_brick_3.jpg`, import.meta.url).href
	else if (image === "wonder_brick_4") return new URL(`../../../static/RNB/images/wonder/wonder_brick_4.jpg`, import.meta.url).href
	else if (image === "wonder_brick_5") return new URL(`../../../static/RNB/images/wonder/wonder_brick_5.jpg`, import.meta.url).href
	else if (image === "wonder_brick_8") return new URL(`../../../static/RNB/images/wonder/wonder_brick_8.jpg`, import.meta.url).href
	else if (image === "wonder_brick_9") return new URL(`../../../static/RNB/images/wonder/wonder_brick_9.jpg`, import.meta.url).href
	else if (image === "pray_" + rf.BLACK) return new URL(`../../../static/RNB/images/wonder/pray_black.png`, import.meta.url).href
	else if (image === "pray_" + rf.BLUE) return new URL(`../../../static/RNB/images/wonder/pray_blue.png`, import.meta.url).href
	else if (image === "pray_" + rf.GREEN) return new URL(`../../../static/RNB/images/wonder/pray_green.png`, import.meta.url).href
	else if (image === "pray_" + rf.GREY) return new URL(`../../../static/RNB/images/wonder/pray_grey.png`, import.meta.url).href
	else if (image === "pray_" + rf.RED) return new URL(`../../../static/RNB/images/wonder/pray_red.png`, import.meta.url).href
	else if (image === "pray_" + rf.YELLOW) return new URL(`../../../static/RNB/images/wonder/pray_yellow.png`, import.meta.url).href
	else if (image === "temple_icon") return new URL(`../../../static/RNB/images/wonder/temple_icon.png`, import.meta.url).href
	/** RIVER HEXES */
	if (image === "hex_00") return new URL(`../../../static/RNB/images/hexes/hex_00.jpg`, import.meta.url).href
	else if (image === "hex_00_irrigated") return new URL(`../../../static/RNB/images/hexes/hex_00_irrigated.jpg`, import.meta.url).href
	else if (image === "hex_01") return new URL(`../../../static/RNB/images/hexes/hex_01.jpg`, import.meta.url).href
	else if (image === "hex_01_irrigated") return new URL(`../../../static/RNB/images/hexes/hex_01_irrigated.jpg`, import.meta.url).href
	else if (image === "hex_02") return new URL(`../../../static/RNB/images/hexes/hex_02.jpg`, import.meta.url).href
	else if (image === "hex_03") return new URL(`../../../static/RNB/images/hexes/hex_03.jpg`, import.meta.url).href
	else if (image === "hex_04") return new URL(`../../../static/RNB/images/hexes/hex_04.jpg`, import.meta.url).href
	else if (image === "hex_05") return new URL(`../../../static/RNB/images/hexes/hex_05.jpg`, import.meta.url).href
	else if (image === "hex_06") return new URL(`../../../static/RNB/images/hexes/hex_06.jpg`, import.meta.url).href
	else if (image === "hex_07") return new URL(`../../../static/RNB/images/hexes/hex_07.jpg`, import.meta.url).href
	else if (image === "hex_08") return new URL(`../../../static/RNB/images/hexes/hex_08.jpg`, import.meta.url).href
	else if (image === "hex_09") return new URL(`../../../static/RNB/images/hexes/hex_09.jpg`, import.meta.url).href
	else if (image === "hex_10") return new URL(`../../../static/RNB/images/hexes/hex_10.jpg`, import.meta.url).href
	else if (image === "hex_11") return new URL(`../../../static/RNB/images/hexes/hex_11.jpg`, import.meta.url).href
	else if (image === "hex_12") return new URL(`../../../static/RNB/images/hexes/hex_12.jpg`, import.meta.url).href
	else if (image === "hex_13") return new URL(`../../../static/RNB/images/hexes/hex_13.jpg`, import.meta.url).href
	else if (image === "hex_14") return new URL(`../../../static/RNB/images/hexes/hex_14.jpg`, import.meta.url).href
	else if (image === "hex_15") return new URL(`../../../static/RNB/images/hexes/hex_15.jpg`, import.meta.url).href
	else if (image === "hex_16") return new URL(`../../../static/RNB/images/hexes/hex_16.jpg`, import.meta.url).href
	else if (image === "hex_17") return new URL(`../../../static/RNB/images/hexes/hex_17.jpg`, import.meta.url).href
	else if (image === "hex_18") return new URL(`../../../static/RNB/images/hexes/hex_18.jpg`, import.meta.url).href
	else if (image === "hex_19") return new URL(`../../../static/RNB/images/hexes/hex_19.jpg`, import.meta.url).href
	else if (image === "hex_20") return new URL(`../../../static/RNB/images/hexes/hex_20.jpg`, import.meta.url).href
	else if (image === "hex_21") return new URL(`../../../static/RNB/images/hexes/hex_21.jpg`, import.meta.url).href
	else if (image === "hex_22") return new URL(`../../../static/RNB/images/hexes/hex_22.jpg`, import.meta.url).href
	/** NON-RIVER HEXE *********/
	//
	else if (image === "hex_50") return new URL(`../../../static/RNB/images/hexes/hex_50.jpg`, import.meta.url).href
	else if (image === "hex_50_irrigated") return new URL(`../../../static/RNB/images/hexes/hex_50_irrigated.jpg`, import.meta.url).href
	else if (image === "hex_51") return new URL(`../../../static/RNB/images/hexes/hex_51.jpg`, import.meta.url).href
	else if (image === "hex_51_irrigated") return new URL(`../../../static/RNB/images/hexes/hex_51_irrigated.jpg`, import.meta.url).href
	else if (image === "hex_52") return new URL(`../../../static/RNB/images/hexes/hex_52.jpg`, import.meta.url).href
	else if (image === "hex_52_irrigated") return new URL(`../../../static/RNB/images/hexes/hex_52_irrigated.jpg`, import.meta.url).href
	else if (image === "hex_53") return new URL(`../../../static/RNB/images/hexes/hex_53.jpg`, import.meta.url).href
	else if (image === "hex_53_irrigated") return new URL(`../../../static/RNB/images/hexes/hex_53_irrigated.jpg`, import.meta.url).href
	else if (image === "hex_54") return new URL(`../../../static/RNB/images/hexes/hex_54.jpg`, import.meta.url).href
	else if (image === "hex_54_irrigated") return new URL(`../../../static/RNB/images/hexes/hex_54_irrigated.jpg`, import.meta.url).href
	else if (image === "hex_55") return new URL(`../../../static/RNB/images/hexes/hex_55.jpg`, import.meta.url).href
	else if (image === "hex_56") return new URL(`../../../static/RNB/images/hexes/hex_56.jpg`, import.meta.url).href
	else if (image === "hex_57") return new URL(`../../../static/RNB/images/hexes/hex_57.jpg`, import.meta.url).href
	else if (image === "hex_58") return new URL(`../../../static/RNB/images/hexes/hex_58.jpg`, import.meta.url).href
	else if (image === "hex_59") return new URL(`../../../static/RNB/images/hexes/hex_59.jpg`, import.meta.url).href
	else if (image === "hex_60") return new URL(`../../../static/RNB/images/hexes/hex_60.jpg`, import.meta.url).href
	else if (image === "hex_61") return new URL(`../../../static/RNB/images/hexes/hex_61.jpg`, import.meta.url).href
	else if (image === "hex_62") return new URL(`../../../static/RNB/images/hexes/hex_62.jpg`, import.meta.url).href
	else if (image === "hex_63") return new URL(`../../../static/RNB/images/hexes/hex_63.jpg`, import.meta.url).href
	else if (image === "hex_64") return new URL(`../../../static/RNB/images/hexes/hex_64.jpg`, import.meta.url).href
	else if (image === "hex_65") return new URL(`../../../static/RNB/images/hexes/hex_65.jpg`, import.meta.url).href
	else if (image === "hex_66") return new URL(`../../../static/RNB/images/hexes/hex_66.jpg`, import.meta.url).href
	else if (image === "hex_67") return new URL(`../../../static/RNB/images/hexes/hex_67.jpg`, import.meta.url).href
	else if (image === "hex_68") return new URL(`../../../static/RNB/images/hexes/hex_68.jpg`, import.meta.url).href
	else if (image === "hex_69") return new URL(`../../../static/RNB/images/hexes/hex_69.jpg`, import.meta.url).href
	else if (image === "hex_70") return new URL(`../../../static/RNB/images/hexes/hex_70.jpg`, import.meta.url).href
	else if (image === "hex_71") return new URL(`../../../static/RNB/images/hexes/hex_71.jpg`, import.meta.url).href
	else if (image === "hex_72") return new URL(`../../../static/RNB/images/hexes/hex_72.jpg`, import.meta.url).href
	else if (image === "hex_73") return new URL(`../../../static/RNB/images/hexes/hex_73.jpg`, import.meta.url).href
	else if (image === "hex_74") return new URL(`../../../static/RNB/images/hexes/hex_74.jpg`, import.meta.url).href
	else if (image === "hex_75") return new URL(`../../../static/RNB/images/hexes/hex_75.jpg`, import.meta.url).href
	else if (image === "hex_76") return new URL(`../../../static/RNB/images/hexes/hex_76.jpg`, import.meta.url).href
	else if (image === "hex_77") return new URL(`../../../static/RNB/images/hexes/hex_77.jpg`, import.meta.url).href
	else if (image === "hex_78") return new URL(`../../../static/RNB/images/hexes/hex_78.jpg`, import.meta.url).href
	else if (image === "hex_79") return new URL(`../../../static/RNB/images/hexes/hex_79.jpg`, import.meta.url).href
	else if (image === "hex_80") return new URL(`../../../static/RNB/images/hexes/hex_80.jpg`, import.meta.url).href
	else if (image === "hex_81") return new URL(`../../../static/RNB/images/hexes/hex_81.jpg`, import.meta.url).href
	else if (image === "hex_82") return new URL(`../../../static/RNB/images/hexes/hex_82.jpg`, import.meta.url).href
	else if (image === "hex_83") return new URL(`../../../static/RNB/images/hexes/hex_83.jpg`, import.meta.url).href
	else if (image === "hex_84") return new URL(`../../../static/RNB/images/hexes/hex_84.jpg`, import.meta.url).href
	else if (image === "hex_85") return new URL(`../../../static/RNB/images/hexes/hex_85.jpg`, import.meta.url).href
	else if (image === "hex_86") return new URL(`../../../static/RNB/images/hexes/hex_86.jpg`, import.meta.url).href
	else if (image === "hex_87") return new URL(`../../../static/RNB/images/hexes/hex_87.jpg`, import.meta.url).href
	// Polders
	else if (image === "hex_90") return new URL(`../../../static/RNB/images/hexes/hex_90.jpg`, import.meta.url).href
	else if (image === "hex_90_f") return new URL(`../../../static/RNB/images/hexes/hex_90_f.jpg`, import.meta.url).href
	else if (image === "hex_91") return new URL(`../../../static/RNB/images/hexes/hex_91.jpg`, import.meta.url).href
	else if (image === "hex_91_f") return new URL(`../../../static/RNB/images/hexes/hex_91_f.jpg`, import.meta.url).href
	else if (image === "hex_92") return new URL(`../../../static/RNB/images/hexes/hex_92.jpg`, import.meta.url).href
	else if (image === "hex_92_f") return new URL(`../../../static/RNB/images/hexes/hex_92_f.jpg`, import.meta.url).href
	else if (image === "hex_93") return new URL(`../../../static/RNB/images/hexes/hex_93.jpg`, import.meta.url).href
	else if (image === "hex_93_f") return new URL(`../../../static/RNB/images/hexes/hex_93_f.jpg`, import.meta.url).href
	else if (image === "hex_94") return new URL(`../../../static/RNB/images/hexes/hex_94.jpg`, import.meta.url).href
	else if (image === "hex_94_f") return new URL(`../../../static/RNB/images/hexes/hex_94_f.jpg`, import.meta.url).href
	else if (image === "hex_95") return new URL(`../../../static/RNB/images/hexes/hex_blank_1.jpg`, import.meta.url).href
	else if (image === "hex_96") return new URL(`../../../static/RNB/images/hexes/hex_blank_2.jpg`, import.meta.url).href
	// Home Tiles
	else if (image === "home_" + String(rf.BLACK)) return new URL(`../../../static/RNB/images/hometiles/homeblack.jpg`, import.meta.url).href
	else if (image === "home_" + String(rf.BLUE)) return new URL(`../../../static/RNB/images/hometiles/homeblue.jpg`, import.meta.url).href
	else if (image === "home_" + String(rf.GREEN)) return new URL(`../../../static/RNB/images/hometiles/homegreen.jpg`, import.meta.url).href
	else if (image === "home_" + String(rf.GREY)) return new URL(`../../../static/RNB/images/hometiles/homegrey.jpg`, import.meta.url).href
	else if (image === "home_" + String(rf.RED)) return new URL(`../../../static/RNB/images/hometiles/homered.jpg`, import.meta.url).href
	else if (image === "home_" + String(rf.YELLOW)) return new URL(`../../../static/RNB/images/hometiles/homeyellow.jpg`, import.meta.url).href
	// Resources export const ALL_RES = [RES_TRUNKS, RES_BOARDS, RES_PAPER, RES_GOOSE, RES_CLAY, RES_STONE, RES_FUEL, RES_IRON, RES_GOLD, RES_COINS, RES_STOCK, RES_BOMB, RES_MANAGER, RES_PEARL, RES_MARBLE, RES_ART]
	else if (image === "res_blank") return new URL(`../../../static/RNB/images/resources/res_blank.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_TRUNKS) return new URL(`../../../static/RNB/images/resources/res_trunks.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_BOARDS) return new URL(`../../../static/RNB/images/resources/res_boards.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_PAPER) return new URL(`../../../static/RNB/images/resources/res_paper.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_GOOSE) return new URL(`../../../static/RNB/images/resources/res_goose.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_CLAY) return new URL(`../../../static/RNB/images/resources/res_clay.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_STONE) return new URL(`../../../static/RNB/images/resources/res_stone.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_FUEL) return new URL(`../../../static/RNB/images/resources/res_fuel.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_IRON) return new URL(`../../../static/RNB/images/resources/res_iron.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_GOLD) return new URL(`../../../static/RNB/images/resources/res_gold.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_COINS) return new URL(`../../../static/RNB/images/resources/res_coins.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_STOCK) return new URL(`../../../static/RNB/images/resources/res_stock.jpg`, import.meta.url).href
	// Resources &c
	else if (image === "res_" + rf.RES_BOMB) return new URL(`../../../static/RNB/images/resources/res_bomb.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_MANAGER) return new URL(`../../../static/RNB/images/resources/res_manager.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_PEARL) return new URL(`../../../static/RNB/images/resources/res_pearl.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_MARBLE) return new URL(`../../../static/RNB/images/resources/res_marble.jpg`, import.meta.url).href
	// Art & The Atelier artwork
	else if (image === "res_" + rf.RES_WOOD_CARVING) return new URL(`../../../static/RNB/images/resources/res_woodcarving.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_RING) return new URL(`../../../static/RNB/images/resources/res_ring.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_SKETCH) return new URL(`../../../static/RNB/images/resources/res_sketch.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_POTTERY) return new URL(`../../../static/RNB/images/resources/res_pottery.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_STATUE) return new URL(`../../../static/RNB/images/resources/res_statue.jpg`, import.meta.url).href
	else if (image === "res_" + rf.RES_PSEUDO_MINE) return new URL(`../../../static/RNB/images/resources/res_pseudo_mine.jpg`, import.meta.url).href
	// Buildings
	else if (image === "bldg_" + rf.BLDG_WOODCUTTER) return new URL(`../../../static/RNB/images/buildings/bldg_woodcutter.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_SAWMILL) return new URL(`../../../static/RNB/images/buildings/bldg_sawmill.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_PAPERMILL) return new URL(`../../../static/RNB/images/buildings/bldg_papermill.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_CLAY_PIT) return new URL(`../../../static/RNB/images/buildings/bldg_claypit.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_STONE_FACTORY) return new URL(`../../../static/RNB/images/buildings/bldg_stonefactory.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_QUARRY) return new URL(`../../../static/RNB/images/buildings/bldg_quarry.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_OILRIG) return new URL(`../../../static/RNB/images/buildings/bldg_oilrig.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_COAL_BURNER) return new URL(`../../../static/RNB/images/buildings/bldg_coalburner.jpg`, import.meta.url).href
	// Mine defined as SVG
	else if (image === "bldg_" + rf.BLDG_MINT) return new URL(`../../../static/RNB/images/buildings/bldg_mint.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_STOCK_EXCHANGE) return new URL(`../../../static/RNB/images/buildings/bldg_stockexchange.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_WAGON_FACTORY) return new URL(`../../../static/RNB/images/buildings/bldg_wagonfactory.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_TRUCK_FACTORY) return new URL(`../../../static/RNB/images/buildings/bldg_truckfactory.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_RAFT_FACTORY) return new URL(`../../../static/RNB/images/buildings/bldg_raftfactory.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_ROWBOAT_FACTORY) return new URL(`../../../static/RNB/images/buildings/bldg_rowboatfactory.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_STEAMER_FACTORY) return new URL(`../../../static/RNB/images/buildings/bldg_steamerfactory.jpg`, import.meta.url).href
	// Buildings &C
	else if (image === "bldg_" + rf.BLDG_AEROPORT) return new URL(`../../../static/RNB/images/buildings/bldg_airport.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_BOMB_FACTORY) return new URL(`../../../static/RNB/images/buildings/bldg_bombfactory.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_POWER_PLANT) return new URL(`../../../static/RNB/images/buildings/bldg_powerplant.jpg`, import.meta.url).href
	//else if (image === "bldg_" + rf.MBA) return new URL(`../../../static/RNB/images/buildings/bldg_mba.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_PEARL_FISHERY) return new URL(`../../../static/RNB/images/buildings/bldg_pearlfishery.jpg`, import.meta.url).href
	//else if (image === "bldg_" + rf.BLDG_QUARRY_MARBLE)
	//	return new URL(`../../../static/RNB/images/buildings/bldg_quarrymarble.jpg`, import.meta.url).href // *** TODO
	else if (image === "bldg_" + rf.BLDG_ATELIER) return new URL(`../../../static/RNB/images/buildings/bldg_atelier.jpg`, import.meta.url).href
	// MBAs - ONE PER TERRAIN TYPE
	else if (image === "bldg_" + rf.BLDG_MBA_WOODS) return new URL(`../../../static/RNB/images/buildings/bldg_mbawoods.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_MBA_MOUNTAIN) return new URL(`../../../static/RNB/images/buildings/bldg_mbamountain.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_MBA_ROCK) return new URL(`../../../static/RNB/images/buildings/bldg_mbarock.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_MBA_PASTURE) return new URL(`../../../static/RNB/images/buildings/bldg_mbapasture.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_MBA_COAST) return new URL(`../../../static/RNB/images/buildings/bldg_mbacoast.jpg`, import.meta.url).href
	else if (image === "bldg_" + rf.BLDG_MBA_DESERT) return new URL(`../../../static/RNB/images/buildings/bldg_mbadesert.jpg`, import.meta.url).href
	// Transporters - transporter_TRANSPORTERCODE_COLOURCODE
	else if (image === "transporter_" + rf.DONKEY + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_donkey_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.DONKEY + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_donkey_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.DONKEY + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_donkey_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.DONKEY + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_donkey_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.DONKEY + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_donkey_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.DONKEY + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_donkey_yellow.png`, import.meta.url).href
	else if (image === "transporter_" + rf.WAGON + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_wagon_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.WAGON + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_wagon_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.WAGON + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_wagon_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.WAGON + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_wagon_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.WAGON + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_wagon_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.WAGON + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_wagon_yellow.png`, import.meta.url).href
	else if (image === "transporter_" + rf.TRUCK + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_truck_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.TRUCK + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_truck_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.TRUCK + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_truck_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.TRUCK + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_truck_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.TRUCK + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_truck_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.TRUCK + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_truck_yellow.png`, import.meta.url).href
	else if (image === "transporter_" + rf.RAFT + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_raft_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.RAFT + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_raft_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.RAFT + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_raft_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.RAFT + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_raft_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.RAFT + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_raft_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.RAFT + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_raft_yellow.png`, import.meta.url).href
	else if (image === "transporter_" + rf.ROWBOAT + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_rowboat_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.ROWBOAT + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_rowboat_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.ROWBOAT + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_rowboat_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.ROWBOAT + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_rowboat_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.ROWBOAT + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_rowboat_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.ROWBOAT + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_rowboat_yellow.png`, import.meta.url).href
	else if (image === "transporter_" + rf.STEAMER + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_steamer_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.STEAMER + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_steamer_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.STEAMER + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_steamer_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.STEAMER + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_steamer_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.STEAMER + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_steamer_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.STEAMER + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_steamer_yellow.png`, import.meta.url).href
	// Planes (&c)
	else if (image === "transporter_" + rf.PLANE + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_plane_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.PLANE + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_plane_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.PLANE + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_plane_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.PLANE + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_plane_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.PLANE + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_plane_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.PLANE + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_plane_yellow.png`, import.meta.url).href
	// Art & The Atelier: exhibition caravan
	else if (image === "transporter_" + rf.EXHIBITION_TRANSPORTER + "_" + rf.BLACK) return new URL(`../../../static/RNB/images/transporters/transport_caravan_black.png`, import.meta.url).href
	else if (image === "transporter_" + rf.EXHIBITION_TRANSPORTER + "_" + rf.BLUE) return new URL(`../../../static/RNB/images/transporters/transport_caravan_blue.png`, import.meta.url).href
	else if (image === "transporter_" + rf.EXHIBITION_TRANSPORTER + "_" + rf.GREEN) return new URL(`../../../static/RNB/images/transporters/transport_caravan_green.png`, import.meta.url).href
	else if (image === "transporter_" + rf.EXHIBITION_TRANSPORTER + "_" + rf.GREY) return new URL(`../../../static/RNB/images/transporters/transport_caravan_grey.png`, import.meta.url).href
	else if (image === "transporter_" + rf.EXHIBITION_TRANSPORTER + "_" + rf.RED) return new URL(`../../../static/RNB/images/transporters/transport_caravan_red.png`, import.meta.url).href
	else if (image === "transporter_" + rf.EXHIBITION_TRANSPORTER + "_" + rf.YELLOW) return new URL(`../../../static/RNB/images/transporters/transport_caravan_yellow.png`, import.meta.url).href
	// &c
	else rf.doAdminAlrt("V-GI: " + image)
}

export function getWonderBrickPosition(idx) {
	// ROW 1
	if (idx === 0) return [197, 664]
	else if (idx === 1) return [1, 0]
	else if (idx === 2) return [2, 0]
	else if (idx === 3) return [0, 1]
	// ROW 2
	else if (idx === 4) return [197, 554]
	else if (idx === 5) return [2, 1]
	else if (idx === 6) return [0, 2]
	else if (idx === 7) return [1, 2]
	// ROW 3
	else if (idx === 8) return [2, 2]
	else if (idx === 9) return [0, 3]
	else if (idx === 10) return [1, 3]
	else if (idx === 11) return [2, 3]
	// ROW 4
	else if (idx === 12) return [0, 4]
	else if (idx === 13) return [1, 4]
	else if (idx === 14) return [2, 4]
	else if (idx === 15) return [0, 5]
	else if (idx === 16) return [1, 5]
	// ROW 5
	else if (idx === 17) return [2, 5]
	else if (idx === 18) return [0, 6]
	else if (idx === 19) return [1, 6]
	else if (idx === 20) return [2, 6]
	else if (idx === 21) return [0, 7]
	// ROW 6
	else if (idx === 22) return [1, 7]
	else if (idx === 23) return [2, 7]
	else if (idx === 24) return [0, 8]
	else if (idx === 25) return [1, 8]
	else if (idx === 26) return [2, 8]
	// ROW 7
	else if (idx === 27) return [0, 9]
	else if (idx === 28) return [1, 9]
	else if (idx === 29) return [2, 9]
	else if (idx === 30) return [0, 10]
	else if (idx === 31) return [1, 10]
	// ROW 8
	else if (idx === 32) return [2, 10]
	else if (idx === 33) return [0, 11]
	else if (idx === 34) return [1, 11]
	else if (idx === 35) return [2, 11]
	else if (idx === 36) return [0, 12]
	else if (idx === 37) return [1, 12]
	// ROW 9
	else if (idx === 38) return [2, 12]
	else if (idx === 39) return [0, 13]
	else if (idx === 40) return [1, 13]
	else if (idx === 41) return [2, 13]
	else if (idx === 42) return [0, 14]
	else if (idx === 43) return [1, 14]
	// ROW 10
	else if (idx === 44) return [2, 14]
	else if (idx === 45) return [0, 15]
	else if (idx === 46) return [1, 15]
	else if (idx === 47) return [2, 15]
	else if (idx === 48) return [0, 16]
	else if (idx === 49) return [1, 16]
	// ROW 11
	else if (idx === 50) return [2, 16]
	else if (idx === 51) return [0, 17]
	else if (idx === 52) return [1, 17]
	else if (idx === 53) return [2, 17]
	else if (idx === 54) return [0, 18]
	else if (idx === 55) return [1, 18]
	// Row 12
	else if (idx === 56) return [2, 18]
	else if (idx === 57) return [0, 19]
	else if (idx === 58) return [1, 19]
	else if (idx === 59) return [2, 19]
	else if (idx === 60) return [0, 20]
	else if (idx === 61) return [1, 20]
	// ROW 12
	else if (idx === 62) return [2, 20]
	else if (idx === 63) return [0, 21]
	else if (idx === 64) return [1, 21]
	else if (idx === 65) return [2, 21]
	else if (idx === 66) return [0, 22]
	else if (idx === 67) return [1, 22]
	else if (idx === 68) return [2, 22]
	// ROW 13
	else if (idx === 69) return [0, 23]
	else if (idx === 70) return [1, 23]
	else if (idx === 71) return [2, 23]
	else if (idx === 72) return [0, 24]
	else if (idx === 73) return [1, 24]
	else if (idx === 74) return [2, 24]
	else if (idx === 75) return [0, 25]
	// ROW 14
	else if (idx === 76) return [1, 25]
	else if (idx === 77) return [2, 25]
	else if (idx === 78) return [0, 26]
	else if (idx === 79) return [1, 26]
	else if (idx === 80) return [2, 26]
	else if (idx === 81) return [0, 27]
	else if (idx === 82) return [1, 27]
	else rf.doAdminAlrt("getWonderBrickPosition(" + idx + ")")
	return [0, 0]
}

function scaleNumber(match) {
	const store = useModelStore()
	const number = parseFloat(match)
	return String(number * store.RATIO)
}

// NO - store.VERTICES IS NO LONGER SCALED. SO SAFE TO USE IT DIRECTLY
/*function getPointyPointsEXT(forZoomPanel) {
	const store = useModelStore()
	return forZoomPanel
		? [
				[
					[0, -463.127 * 1],
					[399.692 * 1, -231.564 * 1],
					[399.692 * 1, 231.564 * 1],
					[0, 463.127 * 1],
					[-399.692 * 1, 231.564 * 1],
					[-399.692 * 1, -231.564 * 1],
				],
				[
					[199.846 * 1, -347.346 * 1],
					[399.692 * 1, 0.0 * 1],
					[199.846 * 1, 347.346 * 1],
					[-199.846 * 1, 347.346 * 1],
					[-399.692 * 1, 0.0 * 1],
					[-199.846 * 1, -347.346 * 1],
				],
			]
		: [store.VERTICES_POINTY_EXT, store.MID_POINTS_POINTY]
}*/

export function getTerrainColour(hexID) {
	const hex = model.getHexByID(hexID)
	switch (hex.currentTerrain) {
		case rf.TERR_WOODS:
			return "#228B22"
		case rf.TERR_PASTURE:
			return "#90C43D"
		case rf.TERR_ROCK:
			return "#9E9E9E"
		case rf.TERR_MOUNTAINS:
			return "#8E1A1B"
		case rf.TERR_DESERT:
			return "#EDD98A"
		case rf.TERR_SEA:
			return "#5AC7DB"
		case rf.TERR_POLDER:
			return "#5BA56B"
		default:
			return "none"
	}
}

export function getHexHighlightPath(hexID, initialBucketIds, forZoomPanel) {
	const store = useModelStore()
	//const store = useModelStore()
	let hex = model.getHexByID(hexID)
	let rotation = hex.rotation
	let terrainID = hex.hexTerrainID

	// just use the corners here, rather than center and side vertices too. Bit of a hack
	let rotatedVertexes = util.indexArray(6).filter((i) => initialBucketIds.includes(hex.cornerBucketIds[i]))

	// Un rotate the rotatedvertexes
	let unrotatedVertexes = rotatedVertexes.map((i) => (i - rotation + 6) % 6)
	//unrotatedVertexes.sort()
	// Correct numeric sort
	unrotatedVertexes.sort((a, b) => a - b)

	let path = ""
	if (terrainID === rf.PASTURE_RIVER_STRAIGHT) {
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2])) path = "m 0.13407,-463.51182 399.82606,231.85294 V 232.047 l -157.19822,90.62468 -19.43331,-26.74486 -5.57987,-3.27096 -21.16499,-48.48709 -9.62046,-10.96731 -16.35477,-32.32473 -9.62045,-38.28941 -1.53928,-28.47654 L 151.56001,91.01115 141.16992,70.80819 125.00756,51.7597 98.07029,42.33165 56.70234,33.67324 16.87366,29.82506 5.1367,25.59206 -23.72466,7.50561 l -30.97786,-24.43596 -5.38746,-7.31154 -11.54454,-7.69636 -7.88877,-14.23828 -1.53928,-14.04586 -9.42804,-22.89668 -4.233,-10.00527 -2.30891,-5.96468 2.88614,-21.74223 14.04586,-26.74486 6.73432,-33.28677 1.92409,-25.01318 -0.57723,-31.17027 -10.77491,-21.54982 -15.39272,-26.74486 -22.31946,-31.7475 -17.31681,-24.62836 -22.70427,-29.05377"
		else if (util.arraysEqual(unrotatedVertexes, [3, 4, 5])) path = "m -244.61028,-321.32151 39.63627,58.87718 21.74222,19.81813 20.97259,19.0485 7.88878,27.70691 -1.34687,32.13232 1.53927,21.3574 -6.92672,26.74487 -0.38482,27.12968 1.73168,12.50659 3.65577,25.78281 -3.27095,25.78282 2.50132,35.40327 2.69372,6.92673 16.73959,7.69636 28.86137,9.62045 26.36004,8.85082 16.73959,1.34687 15.00791,6.5419 45.21613,31.55509 31.93991,-0.76963 28.47654,15.77754 31.55509,46.94782 12.12177,47.14022 15.77755,45.79336 -2.1165,19.43332 15.00791,74.07749 13.85345,22.70428 17.50923,17.70163 L -1.2128,462.74549 -400.07682,231.46977 v -463.12865 z"
	} else if (terrainID === rf.PASTURE_RIVER_STRAIGHT_WIGGLY) {
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2])) path = "m 0.57817,-463.67122 -160.54344,93.8771 14.69381,33.46923 16.87067,17.14277 27.21075,16.32645 28.57129,2.72108 23.40125,7.3469 18.50331,6.80269 30.20393,6.53058 15.51013,10.06798 11.15641,20.68017 5.44215,13.60538 -3.26529,15.23802 -11.15641,16.32645 -14.96591,10.6122 -11.70062,9.79587 0.2721,15.51013 7.0748,18.2312 4.35372,19.59174 -4.89794,13.87749 -14.96591,14.4217 -9.25166,16.87066 -10.61219,31.83658 -16.05434,26.93865 -8.97955,8.16322 2.99318,14.1496 10.61219,5.17004 45.98618,2.44897 57.14258,-1.90476 39.18348,-6.53058 36.1903,6.25848 17.14278,16.59856 7.89112,23.94546 -0.54422,27.21075 -5.44215,24.21757 -8.97955,11.42852 -15.51013,13.06116 -9.25165,4.89793 -22.04071,22.04071 -22.58493,35.9182 -13.06116,6.25847 -20.13596,37.00663 18.77542,36.73451 46.8025,4.08161 29.38761,-4.62582 42.44878,1.36053 24.76178,13.60538 18.77542,18.50331 15.51013,34.82977 166.52981,-97.95871 v -463.39913 z"
		else if (util.arraysEqual(unrotatedVertexes, [3, 4, 5])) path = "m -243.50228,-322.44741 12.24484,19.59174 7.0748,29.11551 25.85021,19.86385 34.55766,13.87748 51.97254,25.0339 34.01344,1.63264 17.14277,14.69381 -9.52376,5.71426 -5.44215,17.14277 4.35372,18.2312 7.61901,10.06798 -23.12914,58.77523 -15.51013,29.93183 -7.89112,22.85703 -1.63264,17.9591 1.36053,35.10187 4.35372,28.02707 24.21757,25.85022 21.4965,1.08843 53.33307,-7.89112 44.35353,-5.17004 16.05435,-2.72108 19.31963,4.89794 5.17004,19.31963 0.54422,8.43534 -30.20394,32.10868 -29.38761,36.73452 -26.12232,41.90456 -15.23803,43.5372 3.80951,19.59175 18.2312,37.55084 24.76179,24.76178 44.35353,8.97955 10.61219,3.5374 38.36716,-10.34009 22.31282,13.60538 20.40806,32.38079 -160.81555,90.0676 -399.72596,-232.37983 0.27211,-462.85491z"
	}
	if (terrainID === rf.WOODS_RIVER_STRAIGHT) {
		// hex_14
		//if (util.arraysEqual(unrotatedVertexes, [0, 1, 2])) path = "m -159.23324,-371.30504 25.53798,53.9454 43.04155,53.08457 3.44332,14.34719 8.89525,53.37151 6.59971,13.48635 13.77329,26.11187 28.40742,57.96261 10.90386,28.12048 7.17359,23.52938 0.57389,19.79911 90.96113,100.71721 30.12908,33.85935 14.92106,26.11187 27.83354,27.25964 17.7905,16.35579 8.03442,39.59822 7.46054,29.55519 22.09466,30.70297 19.22522,26.9727 18.07745,17.79051 L 399.446,230.98963 V -232.42432 L -0.26647,-463.41394 Z"
		//else if (util.arraysEqual(unrotatedVertexes, [3, 4, 5])) path = "m -399.40506,-231.27655 7.42612,467.12702 392.28636,227.27656 156.09733,-90.1003 -16.64273,-34.43324 -3.15638,-10.61691 0.86083,-7.17359 L 120.5368,292.39557 106.18962,265.42287 56.83531,186.80032 18.95875,133.4288 -41.29941,46.48488 -74.58487,11.19082 l -31.85074,-33.57241 -8.32137,-18.65133 -3.44332,-18.07745 v -20.65994 l -19.22522,-36.44184 -7.46054,-17.79051 -3.73027,-22.3816 3.15638,-17.50356 -2.29555,-16.92968 -10.61691,-15.20801 -17.50356,-31.85074 -10.61691,-13.7733 -16.92968,-13.48635 -24.67715,-40.45905 -12.05163,-18.65133 z"
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2])) path = "m -0.25075,-463.51182 -160.85399,93.89563 21.165,28.86136 6.15709,20.78018 35.78809,62.34055 47.71745,74.2699 28.86136,41.56036 56.56827,80.427 35.78809,42.71481 43.09963,50.796 8.85082,30.40063 6.54191,29.24618 16.54718,40.79073 1.92409,26.55245 -1.53927,23.47391 26.93727,45.02372 13.85345,20.39537 19.62573,17.70163 13.85345,21.93464 18.08645,35.78809 161.62363,-94.28045 -0.38482,-461.78179 z"
		else if (util.arraysEqual(unrotatedVertexes, [3, 4, 5])) path = "M -400.46164,-231.08165 V 232.23941 L -0.25075,462.36067 156.75506,370.00431 112.50097,294.57995 86.33333,259.17668 77.48252,197.9906 53.62379,142.19196 25.14725,95.62897 l -12.31418,-42.33 -1.15446,-23.47391 -47.33263,-55.029 -56.95309,-60.80127 -45.02372,-61.95572 -30.78546,-26.93727 -5.77227,-6.15709 -8.08118,-48.87191 -10.00527,-25.39799 -53.87454,-66.18873 z"
	} else if (terrainID === rf.PASTURE_RIVER_SHARP_U) {
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3, 4])) path = "m 0.02047,-463.41394 399.71248,231.85045 -0.57389,463.7009 L -0.26647,463.12703 -399.692,231.27658 l 0.28694,-185.07864 29.26825,-1.43472 23.81632,-4.30415 16.92968,3.73026 14.63412,6.02582 35.86796,20.94688 26.9727,12.91247 18.07745,13.1994 13.77329,10.61692 16.06884,6.88665 26.9727,9.18219 22.66855,5.16499 34.43324,-3.73027 28.12047,-2.86944 23.52938,-4.87804 18.65134,-6.31276 12.62552,-12.91246 14.34718,-9.1822 L -1.98813,68.57954 5.4724,51.93681 15.80237,38.45046 32.4451,9.7561 50.23561,-19.7991 62.0003,-39.31126 l 7.46053,-21.52077 3.73027,-28.98131 10.32997,-79.48339 -3.15638,-41.60682 -1.72166,-17.50356 -9.46914,-31.85075 -9.75609,-24.3902 -14.92106,-15.20802 -24.10327,-18.93828 -16.92967,-10.90385 -28.12048,-16.06885 -14.06024,-7.17359 -13.1994,-1.14777 -13.19941,-1.14778 -18.65134,2.00861 -15.20801,3.15638 h -15.7819 l -18.65133,-0.86083 -10.61692,-4.30416 -11.76469,-7.74747 -4.87804,-6.88665 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -399.692,-231.56349 0.57389,183.07003 40.45905,-0.57389 15.7819,7.74748 12.91246,-1.14777 35.00712,16.92967 28.69437,7.17359 16.06884,16.64273 42.18071,39.31128 43.32849,15.49496 47.63264,-5.45193 12.91247,-4.87804 33.5724,-7.1736 24.9641,-11.1908 16.92967,-22.66854 20.94689,-51.07597 22.09465,-60.83205 9.46914,-49.3543 3.73027,-32.99852 -6.02581,-22.95549 -2.86944,-18.36439 -16.06884,-21.80772 -8.60831,-7.46053 -35.29407,-10.32997 h -17.7905 l -32.99852,3.73026 -38.73739,8.89526 -18.65134,-1.43472 -28.9813,-9.46914 -25.82493,-11.76469 -15.49496,-7.74748 -8.89525,-11.1908 -5.73887,-11.47774 -4.87804,-10.90386 z"
	} else if (terrainID === rf.PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L) {
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2])) path = "m 0.02058,-463.127 399.71257,231.30575 -0.2029,463.22021 -150.75454,88.05851 -8.11599,-6.08699 -6.49279,-4.6667 -10.55079,-25.56537 -16.43488,-40.98576 -9.73919,-21.91317 -5.8841,-33.88427 -2.63769,-15.21748 -8.3189,-21.10158 -9.13049,-36.52196 -1.21739,-7.91309 -6.8986,-13.59429 -8.31889,-17.65228 -3.24639,-9.53629 -5.8841,-8.72469 -13.18848,-17.24648 -8.9276,-7.71019 -4.26089,-3.0435 -7.50729,-4.6667 -7.1015,-8.52179 -4.86959,-3.04349 -14.20298,-15.21749 -8.3189,-8.52179 -6.49279,-9.33339 2.8406,-6.89859 2.63769,-5.8841 -1.21739,-14.20298 -2.6377,-30.23207 3.85509,-12.17399 3.2464,-34.69586 -1.0145,-12.57978 -2.63769,-13.59429 -5.4783,-9.73919 -5.47829,-9.73919 -4.058,-6.49279 -1.4203,-14.20299 -2.23189,-8.72469 -10.95659,-17.65228 -16.43489,-19.27548 -10.14498,-9.53629 -10.55079,-10.95659 -31.04367,-24.55087 -22.92768,-11.97109 -20.89867,-11.76819 -39.76836,-12.57978 -10.34789,-1.8261 -9.53629,-3.6522 -5.6812,-9.13049 v 0 l -7.10149,-11.36239 -3.65219,-1.21739 -5.6812,-15.01459 -4.66669,-9.94209 -3.4493,-2.4348 z"
		else if (util.arraysEqual(unrotatedVertexes, [3, 4])) path = "M 0.02058,462.90762 -399.692,231.39896 V 47.57176 l 20.49288,1.4203 15.01458,-2.8406 15.01459,-5.27539 9.13049,1.82609 7.10149,1.4203 22.92768,-2.6377 10.34788,-1.01449 20.08708,0.6087 20.89868,-2.029 18.26098,-4.058 10.14499,3.4493 14.60878,0.2029 13.39139,2.2319 18.46388,8.52179 35.30456,8.11599 28.20307,7.91309 13.79719,2.6377 12.78269,0.6087 20.49287,4.66669 9.33339,-0.6087 25.76828,-6.49279 22.92767,-8.92759 18.66678,-1.8261 12.98559,1.6232 15.42038,11.15949 23.73928,19.88418 18.46388,21.30447 8.52179,10.55079 5.68119,18.66678 2.6377,24.14508 6.69569,16.02908 4.6667,24.95667 6.08699,25.56538 16.84068,68.17432 3.8551,13.39139 11.56529,22.31898 20.89867,36.72486 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -399.8949,-232.02415 158.46473,-91.3049 10.55079,16.43488 15.82618,13.39139 19.68128,19.68128 18.66678,15.21748 28.40597,10.55079 37.73936,10.95659 33.68137,11.56529 22.11607,9.94209 19.47838,14.81168 14.00009,11.36239 5.27539,14.60878 9.53629,24.14508 5.8841,15.42038 3.44929,13.59429 -2.02899,15.21748 6.08699,18.26098 1.8261,13.59429 -1.2174,14.00008 -9.53629,16.02909 -23.73928,32.26106 -12.37688,8.92759 -18.66678,4.8696 -28.40597,5.47829 -15.82619,-0.8116 -28.00017,-1.0145 -17.44938,-0.6087 -18.26098,-4.86959 -17.65228,-7.10149 -30.23207,-10.75369 -20.08708,-2.8406 -18.26098,-4.05799 -31.44946,-11.56529 -8.3189,-3.4493 h -19.68128 l -30.84076,-1.6232 -11.97109,-0.4058 -46.86985,-0.6087 z"
	} else if (terrainID === rf.WOODS_RIVER_BRACKETS_WIDE_NARROW) {
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 4])) path = "m 399.53025,-231.61835 v 181.59531 l -6.49279,-0.8116 -8.52179,1.8261 -12.98559,7.50729 -12.37688,-1.4203 -22.52188,-1.01449 -14.60879,1.62319 -17.44938,6.2899 -28.81177,9.73919 -7.71019,4.86959 -6.28989,1.0145 -7.91309,3.0435 -6.6957,0.8116 -21.50737,11.15948 -16.63779,4.8696 -22.52187,6.08699 -40.37706,0.2029 -43.62345,-1.4203 -22.52188,-3.44929 -16.02908,-5.4783 -20.28998,-8.72469 -15.01458,-6.69569 -16.84069,-1.4203 -20.08708,1.0145 -14.20298,3.4493 -19.88418,7.10149 -17.85518,9.53629 -30.63787,22.92767 -23.94217,17.04359 -14.00009,14.60878 -18.26098,22.11608 -11.97109,25.76827 -12.98558,32.66687 -12.98559,32.46396 -7.71019,22.11608 -10.14499,39.36256 -12.17399,35.30456 -11.56528,23.33347 -19.47838,32.66687 -153.79804,-88.87011 0.2029,-185.6533 40.78286,-2.8406 9.73919,-2.23189 15.42038,2.23189 25.76827,2.8406 78.52222,4.058 31.44947,-4.058 72.02942,-22.92768 27.79727,-18.46388 43.42055,-40.37705 18.05809,-30.02917 18.26098,-58.43514 1.62319,-41.39156 -1.42029,-20.28997 -10.75369,-28.20307 -6.6957,-18.86968 -26.37697,-28.00017 -30.84077,-16.84069 -16.02908,-17.85518 -18.66678,-28.81177 -27.79727,-48.69594 155.42124,-89.68171 z"
		else if (util.arraysEqual(unrotatedVertexes, [2, 3])) path = "m 399.73315,47.36886 0.4058,184.233 -400.32127,231.50866 -163.33433,-96.1745 19.68128,-47.27565 6.89859,-14.60878 6.69569,-26.98568 10.75369,-30.63786 4.2609,-27.59437 2.8406,-21.91318 4.46379,-36.72486 10.55079,-25.56538 16.23198,-15.21748 26.57987,-24.34797 19.07258,-19.68128 22.92768,-11.56529 19.27548,-10.75369 22.31898,3.4493 40.17415,-3.0435 6.6957,2.4348 12.78268,-0.2029 13.79719,4.26089 19.88418,4.2609 10.14499,1.0145 30.84076,10.14499 46.26115,0.4058 28.00017,-7.1015 49.30465,-12.17398 12.37689,-7.50729 18.26098,-3.8551 37.33356,-0.2029 35.10166,1.4203 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -399.97894,-48.7804 0.28694,-182.49615 162.41591,-93.69729 23.52356,33.72607 8.89525,14.06024 18.93828,17.50356 15.7819,14.06024 16.92968,10.32997 18.07744,7.46053 7.46054,0.86084 18.93828,16.06884 11.1908,13.19941 6.31276,12.91246 1.43472,14.63412 -1.14778,14.63413 -1.72166,14.92107 -5.73887,12.05163 -9.46914,24.10326 -19.51217,43.90238 -11.76469,18.65134 -5.45193,8.6083 -10.90385,8.60831 -10.61692,5.45193 -13.48635,2.58249 -43.61543,-3.44332 -37.30267,-9.1822 -16.35579,-1.14777 -7.74748,-1.72166 h -5.45192 l -7.46054,-5.16499 -20.94688,-5.16498 -10.61692,-2.86944 -14.34718,-2.58249 -39.59822,4.30415 z"
	} else if (terrainID === rf.PASTURE_RIVER_TRI_BLADE) {
		// hex_28
		if (util.arraysEqual(unrotatedVertexes, [0, 1])) path = "m 399.57531,-49.06266 0.38482,-181.63417 -401.36534,-233.58462 -157.39062,94.28044 26.93727,31.55509 19.24091,35.40327 14.23827,29.631 11.54454,31.93991 36.55773,72.73063 25.78281,54.25936 14.62309,28.86136 14.23828,25.01318 15.0079,17.31682 19.24091,12.699 39.25145,5.00264 50.41118,9.23563 35.78809,1.53927 36.55773,-1.92409 25.39799,-8.08118 20.39537,-5.77227 22.70427,-14.62309 17.31681,-5.77227 31.17028,1.15445 15.39272,-1.15445 13.46864,4.233 12.699,-3.46337 22.31945,-2.30891 z"
		else if (util.arraysEqual(unrotatedVertexes, [2, 3])) path = "m -0.23815,463.39914 400.27018,-232.92405 0.31292,-181.40912 -32.32473,-4.61782 -33.86399,4.233 -71.57618,3.84818 -11.54455,-6.54191 -38.48181,13.85346 -34.63364,1.92409 -35.01845,2.30891 -50.02636,-8.85082 -8.466,-4.233 -17.31681,-0.38482 -20.01055,4.233 -25.78282,9.23564 -20.39536,22.70427 -28.47654,41.17554 -33.864,63.87981 -3.46336,14.62309 -7.31155,11.92937 -15.77754,23.08909 -10.39009,23.08909 -19.24091,28.86136 -18.08645,21.93463 -9.23564,26.55246 -10.39009,19.2409 -3.84818,8.85082 z"
		else if (util.arraysEqual(unrotatedVertexes, [4, 5])) path = "m -401.23127,-231.08165 1.53927,462.55142 157.39063,90.04745 56.56827,-66.18872 32.70954,-41.17554 26.16763,-43.86927 10.77491,-16.54718 1.53927,-21.93464 9.62046,-24.24354 30.40063,-65.80391 3.46337,-66.18872 -29.631,-67.728 -21.165,-45.02372 -25.78282,-38.86663 -31.9399,-35.78809 -19.24091,-32.70955 -19.62573,-30.01581 -27.32209,-46.17818 z"
	} else if (terrainID === rf.DESERT_RIVER_SHARP_U) {
		// hex_00
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3, 4])) path = "m -399.692,50.88412 0.27211,180.95151 399.99807,230.74718 398.63753,-234.01247 0.54421,-460.67805 -400.27017,-231.83561 -159.18291,93.87709 13.87748,22.04071 14.96592,24.48968 22.04071,22.31282 19.59174,17.41488 23.94546,19.31964 25.85022,18.77542 12.78905,4.35372 18.23121,10.06797 14.4217,12.51695 21.49649,7.89112 19.31964,7.0748 15.78223,11.97273 17.9591,20.95228 13.06116,14.4217 16.87067,14.6938 15.51013,23.12914 14.14959,30.74815 10.06798,28.29919 3.53739,11.70062 -3.53739,43.5372 -6.25848,19.86385 -5.98636,16.32646 -11.97273,15.23802 -17.14278,22.04071 -11.42851,8.97955 -26.66654,9.52376 -24.76179,6.53058 -20.40806,-1.63265 -23.12914,7.61902 -13.33327,2.44896 -25.306,-2.44896 -39.99981,-7.0748 -31.83658,-16.59856 -42.72088,-11.70062 -47.61882,-11.42852 -39.45559,-1.63264 -34.28555,2.17686 -67.21056,-2.72108 -47.61882,0.54422 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -399.692,-44.35351 -0.54422,-187.20998 163.53663,-95.23764 27.48286,49.79568 71.83639,55.78204 47.0746,26.12233 26.12232,2.17686 26.12233,8.70744 35.10187,26.66654 12.78905,5.17004 35.64609,36.73451 30.47604,23.12914 7.3469,20.13596 v 51.15622 l -9.79587,28.8434 -9.52376,22.31281 -35.64609,19.59174 -30.74815,-5.98636 -14.4217,-1.90475 -8.97954,2.99318 -7.89112,-4.35372 -12.78906,4.08161 -47.61881,-14.96591 -50.3399,-25.03389 -11.70062,-5.17005 -37.27873,-23.67335 -85.44177,-7.0748 -27.48286,-7.89112 z"
	} else if (terrainID === rf.WOODS_RIVER_GENTLE_CURVE) {
		// hex_15
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3])) path = "m 0.57818,-463.67122 -157.00605,91.97235 8.70744,7.89112 3.26529,21.7686 12.51695,8.70744 8.43533,12.24484 32.10869,29.11551 22.31282,12.24483 19.04752,17.9591 31.29237,26.93865 25.03389,31.83658 19.59175,17.14277 27.75496,27.48286 17.9591,28.57129 14.69381,31.29237 3.8095,42.99299 -4.08161,32.92501 -10.61219,36.73452 -21.22439,28.02707 2.17686,15.78224 -7.0748,17.14277 -5.44215,16.05435 -5.98636,35.37398 -5.44215,13.33326 -1.08843,20.13596 -8.97955,21.4965 -23.94546,34.28555 -33.46923,33.74133 -19.59174,8.97955 -30.20394,9.52376 -16.05434,6.80269 -21.76861,25.57811 -26.93864,45.16985 -13.06116,20.40806 162.7203,97.14239 399.99807,-232.37983 0.27211,-462.5828 z"
		else if (util.arraysEqual(unrotatedVertexes, [4, 5])) path = "m -400.23622,-230.20296 161.35977,-95.23763 28.02708,41.08824 29.93182,46.25828 33.46923,28.57129 35.10187,17.14277 37.82295,28.02708 24.21757,11.15641 29.1155,23.67335 16.59856,13.60538 3.26529,22.04071 5.44215,26.12232 0.27211,47.0746 -17.68699,24.76179 -11.42851,36.1903 -4.08162,37.55084 -0.81632,44.89774 -1.63265,21.7686 -13.33326,12.51695 -23.40125,6.25847 -19.59174,6.25848 -25.0339,32.38079 -64.21737,20.95228 -16.87067,10.61219 -17.41488,20.13596 -23.67336,54.1494 -11.42851,11.70062 -153.74076,-88.43494 z"
	} else if (terrainID === rf.PASTURE_RIVER_GENTLE_CURVE_2) {
		// hex_05
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3])) path = "M -0.25075,462.74549 399.96013,229.9305 399.57531,-231.08165 0.51888,-462.74218 l -153.54244,89.66263 16.932,23.47391 3.46336,12.31418 43.86927,48.8719 33.09436,35.78809 20.39537,36.17291 10.39009,32.32472 3.07854,24.62837 14.23827,45.02372 5.00264,39.25145 5.00264,31.55509 -1.9241,36.94255 -10.7749,46.56299 -20.01055,65.03427 -15.00791,59.262 -23.85872,68.49763 -38.097,61.18609 -52.72009,76.19399 z"
		else if (util.arraysEqual(unrotatedVertexes, [4, 5])) path = "m -398.92236,232.62423 156.62099,90.43227 10.77491,-30.40064 17.31681,-23.08909 25.01318,-46.94781 21.54982,-46.563 12.699,-23.47391 18.85609,-36.94254 45.79336,-101.97681 -18.85609,-48.48709 -5.77227,-39.63627 1.15445,-20.78018 4.61782,-11.54455 -1.92409,-25.78281 -4.61782,-17.70164 -32.32472,-51.56563 -24.24355,-37.71218 -23.47391,-29.631 -18.47127,-11.15972 -18.85609,-21.165 -10.77491,-19.62573 -156.23617,89.66263 z"
	} else if (terrainID === rf.ROCK_RIVER_GENTLE_CURVE) {
		// hex_12
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3])) path = "m 0.13407,-462.74218 -155.08172,89.66263 18.85609,35.01845 10.39009,14.62309 9.62045,9.62046 11.92937,23.4739 8.08118,24.24355 20.01054,24.62836 13.46864,33.09436 15.0079,13.08382 24.24355,50.79599 20.78018,51.56564 15.39273,45.40854 8.46599,51.95045 -5.00263,67.728 -30.40064,55.41381 -5.00263,20.39537 -28.86136,24.24354 -3.07855,12.31418 -38.86663,28.09173 -14.23827,20.39536 -12.699,56.95309 -40.02109,79.27254 158.16026,93.51081 398.67161,-233.19981 -0.38482,-461.78179 z"
		else if (util.arraysEqual(unrotatedVertexes, [4, 5])) path = "m -400.46164,-231.08165 0.38482,461.39697 160.08436,90.43227 16.93199,-27.70691 25.398,-38.86663 39.25146,-43.09964 27.32208,-18.85609 38.86664,-33.09436 23.47391,-25.78281 9.62045,-47.71746 11.92936,-45.40854 9.23564,-12.31418 -8.85082,-62.34054 -11.92936,-18.85609 -2.30891,-20.01055 -26.93727,-40.02108 -8.08118,-24.62837 -1.15446,-28.09172 -63.11018,-61.18609 -54.25936,-59.262 -24.62836,-37.71217 z"
	} else if (terrainID === rf.MOUNTAIN_RIVER_STRAIGHT) {
		// hex_20
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2])) path = "m 0.13407,-463.127 -160.85399,92.74118 43.09963,64.26463 35.01845,55.41381 10.39009,27.32209 -1.53927,35.40327 -9.23564,33.09436 -15.0079,44.25409 14.62309,49.25673 32.70954,51.56563 60.80127,37.71218 70.42172,9.23564 39.63627,10.7749 28.47655,35.40327 11.15972,60.80127 6.54191,53.87455 18.85609,35.40327 33.47918,56.56827 23.85873,31.9399 157.0058,-91.58672 0.38482,-462.16661 z"
		else if (util.arraysEqual(unrotatedVertexes, [3, 4, 5])) path = "m -400.07682,-231.08165 -0.38482,462.55143 399.44125,232.04534 158.16026,-93.12599 -28.47654,-57.72272 -15.00791,-50.02636 2.69373,-25.398 L 90.18152,157.96951 65.55315,108.71278 57.85679,93.32006 23.22316,77.15769 0.13407,78.69697 -51.04675,46.37224 l -95.4349,-26.55245 -8.85082,-11.92936 -4.233,-17.70164 8.466,-63.495 -9.23564,-14.23827 8.466,-89.27781 -0.76963,-21.165 -13.85346,-30.40063 -21.93463,-23.08909 -32.70954,-36.94255 -18.47128,-35.78808 z"
	} else if (terrainID === rf.MOUNTAIN_RIVER_SOURCE) {
		// hex_21
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3, 4, 5])) path = "m -399.692,-231.08165 -0.38482,462.55143 399.82607,231.27571 400.5957,-232.43017 0.38482,-462.16661 -400.98052,-232.04535 -150.84872,88.893 19.24091,29.24618 8.466,45.79336 24.24354,41.56036 19.62573,38.86663 49.25672,75.80918 27.70691,18.85609 13.46863,33.09436 -1.15445,30.78546 -11.92936,20.01054 -26.55246,17.70163 -21.93463,22.31946 -17.70164,7.31154 -1.15445,30.01582 -1.53927,29.631 5.00263,14.23827 -6.15709,5.77227 -27.32209,0.38482 -13.85345,18.47127 -13.85345,41.56036 -3.07855,27.32209 0.76964,27.32209 -13.85346,4.233 -5.77227,-8.85082 -2.30891,-15.00791 3.84818,-12.69899 -3.07854,-18.08646 -1.92409,-11.15972 5.00263,-25.78282 7.31155,-14.62309 21.93463,-22.70427 -4.233,-50.02636 22.31946,-30.40064 30.40063,-31.17027 11.92936,-12.699 -16.16236,-45.79336 -38.86663,-15.77754 -28.47655,-60.03164 -35.01845,-44.25408 -18.85609,-5.00264 -43.86927,-75.80918 -7.69636,-5.00263 -8.08118,-15.00791 z"
	} else if (terrainID === rf.DESERT_RIVER_GENTLE_CURVE) {
		// hex_01
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3])) path = "m -0.78236,-464.48754 -155.10129,91.70024 20.13595,31.83658 18.23121,23.12914 21.49649,17.41488 31.29237,12.78906 29.38761,7.3469 22.31282,6.80269 21.22439,18.77542 11.70062,20.13595 10.8843,20.40807 26.39443,31.83658 17.68699,25.03389 7.0748,16.59856 2.99318,14.4217 -2.17686,13.33327 -4.62583,11.15641 -6.80269,17.41488 -5.98636,20.13596 0.2721,16.87066 -1.36053,17.68699 1.90475,15.78224 2.72108,12.78905 7.61901,7.89112 7.89111,12.51695 1.63265,13.06116 5.17004,26.66654 -1.90475,19.04753 -7.0748,19.59174 -23.40124,38.36716 -16.59856,20.95228 -25.57811,22.31282 -25.306,19.31963 -17.68699,11.97273 -22.85703,1.36054 -17.68699,5.17004 -19.59174,16.87067 -16.87067,17.68699 -9.52376,22.04071 -7.34691,29.38761 -4.62583,13.06116 -11.42851,12.78906 -23.40125,39.18348 158.9108,94.14921 400.27017,-232.65194 v -463.12702 z"
		else if (util.arraysEqual(unrotatedVertexes, [4, 5])) path = "m -399.96411,-231.8356 1.36054,464.21544 159.45501,88.97917 21.4965,-37.00663 13.33327,-22.04071 16.05434,-25.306 23.40125,-16.87066 19.86385,-12.78906 62.31262,-26.93864 44.62564,-24.76179 25.03389,-15.51013 c 0,0 24.76178,-30.20393 25.57811,-31.83658 C 13.36723,106.66617 28.60525,60.9521 28.60525,60.9521 L 37.04058,32.38081 28.06104,1.63266 23.1631,-25.57809 l 1.63265,-16.32645 -9.25166,-10.6122 0.81632,-41.36034 -61.22419,-49.52357 -48.97936,-41.36035 -14.4217,-24.21757 -14.14959,-19.04752 -40.54402,-28.5713 -37.00662,-22.58492 -28.02708,-23.94546 -11.15641,-22.04071 z"
	} else if (terrainID === rf.WOODS_RIVER_SHARP_U) {
		// hex 16
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3, 4])) path = "m -399.41989,41.63247 -0.54422,191.01948 399.72596,230.20297 399.99807,-232.37983 -0.27211,-463.12701 -399.72596,-231.0193 -161.90398,94.69342 20.40807,17.68699 20.13595,13.87749 29.38762,10.8843 26.93864,7.0748 34.01344,5.44215 34.82977,14.96591 16.87067,11.70062 19.04752,22.58493 18.50331,34.82976 9.25166,32.92501 2.17686,20.13596 -1.36054,49.25146 1.63265,70.47585 -1.08843,28.02708 -10.6122,23.40125 -29.1155,39.18348 -34.82977,29.11551 -28.29918,28.29918 -30.47604,19.86385 -35.9182,25.57811 -26.93864,11.15641 c 0,0 -16.05435,0.2721 -17.41488,0.2721 -1.36054,0 -36.1903,-4.62583 -36.1903,-4.62583 l -22.58493,-22.0407 -34.82976,-29.38762 -72.38061,-36.1903 -36.1903,-14.14959 -17.68698,-2.448967 -12.78906,1.904755 -12.78906,1.904747 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -399.14778,-233.19614 -0.27211,180.6794 29.38761,0.81632 20.95228,-0.54421 25.03389,4.89793 38.36716,10.88431 31.56448,16.32645 22.58492,23.40124 20.13596,18.50332 19.04753,11.15641 26.93864,14.96591 31.29237,5.71426 25.306,2.44897 12.24484,-2.99319 11.97273,-10.8843 26.12232,-27.48286 22.58493,-29.93183 27.21075,-34.82976 2.17686,-10.61219 -2.99318,-13.60538 -3.265292,-20.13596 -4.897941,-39.9998 -1.088423,-22.58493 0.544212,-16.32645 -1.904756,-14.69381 0.27211,-17.41488 -4.08161,-11.70062 -5.17005,-5.44215 -11.42851,-3.5374 -11.15641,-8.70744 -10.8843,-5.98637 -11.97273,-3.5374 -13.60538,-0.54421 -30.74815,-0.27211 -54.69361,-22.85703 -37.55084,-21.4965 -24.76179,-22.04071 -8.33692,-10.428 -154.65549,89.06708"
	} else if (terrainID === rf.PASTURE_RIVER_GENTLE_CURVE_1) {
		// hex 04
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3])) path = "m 0.51888,-463.51182 -167.78071,97.74381 12.699,21.74223 16.16236,27.32209 10.96732,25.398 24.24354,20.58777 32.70954,25.20559 27.12968,21.35741 22.70428,29.24618 6.92672,29.8234 8.466,31.36268 6.73432,43.29205 7.69636,38.86663 -1.15445,46.563 -6.15709,28.86136 -11.54455,44.83131 -15.39272,47.52505 -19.0485,60.60886 -24.05114,64.84186 -20.78018,30.78545 -25.20559,39.05904 -14.04586,20.58777 -23.47391,31.17027 -6.3495,7.88878 158.16027,91.97154 400.01847,-231.66054 -0.57723,-463.51347 z"
		else if (util.arraysEqual(unrotatedVertexes, [4, 5])) path = "m -399.14778,-231.29139 -0.81633,462.3107 156.46183,90.3397 50.33989,-92.78867 14.69381,-21.4965 12.24484,-27.75496 13.06116,-23.12914 30.20394,-54.96573 23.67335,-60.95208 7.34691,-39.18349 1.36053,-61.22419 -2.17686,-41.63245 -3.26529,-14.14959 -5.71426,-14.4217 -21.7686,-29.93183 -8.16322,-16.59856 -20.13596,-13.60538 -31.29237,-32.10868 -24.48967,-28.5713 -25.85022,-45.98617 -13.87748,-23.94546 z"
	} else if (terrainID === rf.PASTURE_RIVER_GENTLE_CURVE_3) {
		// hex 06
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3])) path = "m 2.05816,-463.127 -159.89195,92.54877 17.12441,24.24354 35.9805,38.86664 27.32209,32.51713 17.50922,29.82341 15.00791,33.09436 1.34687,33.67159 -13.66105,41.36795 -6.54191,11.73695 -13.66104,6.54191 -5.77227,4.04059 -4.0406,9.62046 -5.38745,15.0079 0.96205,6.92673 9.62045,13.08382 18.27886,15.20032 37.32736,23.4739 30.78546,7.50396 35.01845,16.54718 21.74222,16.35477 29.631,31.55509 17.70164,35.21086 7.31154,23.47391 v 32.51713 l -2.88613,18.66368 -9.42805,42.33 -24.05113,32.13232 -27.89932,23.08909 -58.68477,34.82604 -27.12968,9.23564 -46.37059,12.31418 -28.28413,6.73431 -19.24091,13.46864 -28.28413,22.31945 -12.50659,17.50923 168.93517,98.70586 400.01847,-231.85294 -0.19241,-463.51348 z"
		else if (util.arraysEqual(unrotatedVertexes, [4, 5])) path = "m -400.46164,-231.08165 v 462.16661 l 154.6969,88.12336 15.96996,-28.09173 19.0485,-19.24091 36.1729,-30.01581 40.2135,-23.85873 47.14022,-15.77754 56.95309,-14.43069 33.864,-4.04059 10.19768,-7.11913 14.23827,-12.50659 9.04323,-13.46864 5.38745,-20.78018 L 41.1172,113.13819 33.03602,93.70488 14.94957,76.96529 9.3697,62.72701 -0.25075,51.56729 -25.84116,39.25311 -62.39888,28.09338 l -38.67423,-14.8155 -20.78018,-16.35477 -21.74223,-23.85873 -25.5904,-37.51977 -4.81023,-32.70954 4.04059,-21.74223 19.62573,-32.90195 23.66631,-23.2815 11.73696,-12.50659 2.30891,-8.65841 -1.92409,-9.62045 -3.84819,-10.19768 -8.85081,-8.85082 -18.47128,-0.76964 -20.58777,-14.23827 -16.16236,-11.15972 -11.35214,-5.77228 -30.78545,-27.7069 -12.31418,-18.08646 -10.96732,-16.54718 z"
	} else if (terrainID === rf.PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_R) {
		// hex 09
		if (util.arraysEqual(unrotatedVertexes, [0, 1])) path = "m 0.32648,-463.51182 400.01847,232.81499 0.19241,184.71271 -36.55772,-2.1165 -20.78019,-0.19241 -12.50659,1.73169 -10.96731,4.04059 -28.66896,6.73431 -22.12704,7.50396 -34.24882,10.00527 -36.55772,11.73695 -38.86664,12.50659 -11.92936,3.07855 -18.27886,-1.53927 -26.93727,-5.57987 -11.35214,-6.3495 -27.89931,-10.00527 -9.04323,-8.466 -6.54191,-13.66104 -3.65577,-7.50396 -1.92409,-26.55245 -7.31155,-24.43595 -12.89141,-20.58777 -13.46863,-13.27623 -29.05377,-28.28413 -28.28414,-30.40064 -17.50922,-13.85345 -10.5825,-17.12441 -7.50396,-10.00527 -8.466,-11.15973 -2.1165,-7.50395 -15.39272,-30.01582 -2.88614,-4.61782 -2.30891,-11.92936 -5.19504,-11.15973 -10.00527,-12.699 -6.92673,-8.27359 -0.76964,-8.85081 -3.27095,-11.73696 -7.69637,-13.08382 -7.11913,-12.50659 z"
		else if (util.arraysEqual(unrotatedVertexes, [2, 3, 4])) path = "M 400.15254,231.46978 -0.05834,463.32272 -399.692,231.08496 V 50.60524 l 19.24091,0.38482 31.17027,1.15445 10.77491,4.61782 13.08381,13.27623 27.32209,21.54982 33.09437,20.97258 37.90458,19.24091 33.864,9.81287 29.631,5.38745 24.05113,0.38482 15.58514,-7.31155 27.70691,0.57723 34.44122,-12.12177 30.20823,-27.32209 19.24091,-7.88877 20.58777,-10.77491 21.54981,-8.85082 12.12178,0.96205 25.78281,9.62045 28.66896,9.62045 20.20295,3.07855 18.66368,0.38482 18.27886,-2.1165 10.5825,-0.19241 26.74486,-5.38746 19.24091,-7.11913 35.9805,-6.73432 29.631,-10.77491 13.27622,-5.38745 12.699,-0.19241 21.54982,-3.07855 21.54982,-3.27095 14.23827,-3.46336 17.70163,0.96204 h 11.54455 l 6.54191,2.30891 5.57986,2.50132 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -236.14428,-325.74692 45.02372,80.23459 27.5145,29.82341 24.05113,20.78018 15.20032,16.73959 16.54718,14.04586 12.12178,12.50659 22.12704,19.81813 13.27623,17.31682 7.69636,14.23827 15.00791,17.50923 2.1165,10.5825 7.31154,21.54982 2.1165,16.35477 -0.19241,13.66104 -6.92672,22.12705 -10.00528,25.5904 -6.73431,6.54191 -6.3495,4.81023 -7.88878,4.233 -12.50659,3.65577 -15.58513,4.233 -6.3495,2.50132 c 0,0 -7.88877,5.57986 -8.65841,5.57986 -0.76964,0 -14.62309,4.233 -14.62309,4.233 l -20.58777,4.42541 c 0,0 -27.70691,5.38746 -28.66895,5.38746 -0.96205,0 -17.50923,-3.84819 -17.50923,-3.84819 l -32.70954,-16.54718 -29.631,-25.20559 -32.70955,-29.43859 -18.08645,-18.47127 -13.66104,-9.42804 -21.74223,-8.27359 -29.631,-6.73432 -18.47127,-4.81023 -14.62309,-0.38482 -0.38482,-180.67212 z"
	} else if (terrainID === rf.ROCK_RIVER_STRAIGHT) {
		// hex 11
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2])) path = "m 0.57818,-462.58278 399.18174,231.29139 0.27211,462.3107 L 249.82867,315.37264 219.08052,266.39329 179.62493,198.0943 150.78153,151.01969 133.63876,124.62526 102.07428,67.48268 87.10837,44.35354 53.36704,9.52378 20.44203,-26.39442 -2.1429,-52.24463 l -18.2312,-37.82295 -14.69381,-39.45559 -30.20394,-81.36015 -19.59174,-47.61882 -51.70043,-85.98598 -15.51013,-29.93182 z"
		else if (util.arraysEqual(unrotatedVertexes, [3, 4, 5])) path = "m -399.41989,-230.74717 160.27133,-92.78867 21.22439,32.3808 23.67335,39.18348 17.41489,35.37398 13.33327,40.54402 14.14959,35.64609 16.59856,47.61882 20.95228,39.45559 48.97935,47.89092 43.53721,44.62564 28.29918,39.18348 13.33327,31.83658 10.8843,31.29237 15.23802,26.39443 23.12914,30.20394 19.31964,27.48286 23.67335,52.51675 16.05434,35.91819 29.11551,54.69362 L 0.03396,463.67124 -399.96411,231.01931 Z"
	} else if (terrainID === rf.ROCK_RIVER_SHARP_U) {
		// hex 13
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 2, 3, 4])) path = "M 0.32648,-463.127 399.96013,-231.85129 399.76772,231.27737 0.13407,463.70753 -399.30718,231.66218 -399.692,44.44815 l 25.01318,0.38482 25.01318,0.57723 46.37059,3.84818 24.43595,2.69372 27.89932,14.04587 30.59304,16.35477 31.17027,3.07854 h 28.47655 l 18.08645,-3.84818 20.20295,-1.53927 c 0,0 11.35214,7.31155 12.31418,7.69636 0.96205,0.38482 25.20559,14.8155 25.20559,14.8155 l 35.01846,2.88614 L -20.2613,98.70751 1.09611,84.27683 30.5347,50.41283 58.81884,16.93365 76.52047,-14.62144 83.83202,-37.1333 c 0,0 1.34686,-26.55245 1.73168,-30.97786 0.38482,-4.42541 0.96204,-47.90986 0.96204,-47.90986 l 11.15973,-35.9805 10.19768,-30.97786 0.19241,-31.17027 -4.61782,-26.36005 -25.01318,-32.13231 -15.58513,-14.8155 -51.75805,-22.12704 -57.14549,-9.04323 -30.20823,-8.65841 -39.63627,-8.65841 -16.16236,-2.30891 -18.47127,-19.0485 -7.88877,-13.08381 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -399.692,-231.46647 156.23617,-89.27781 21.93464,35.59568 14.23827,8.65841 29.05377,15.0079 22.51186,-0.57722 19.24091,-3.07855 24.24354,-1.92409 27.70691,3.07855 27.5145,4.42541 38.48182,2.69372 25.20559,-1.73168 14.81549,1.15446 16.35478,4.81022 13.08381,11.15973 17.50923,17.89404 6.92673,14.8155 1.34686,15.77755 -5.77227,12.12177 -15.39273,24.05113 -10.39009,16.16237 -5.96468,21.3574 c 0,0 -0.38482,13.85346 -0.57723,15.00791 -0.19241,1.15446 3.84818,20.97259 3.84818,20.97259 l 6.3495,28.86136 -1.34686,16.73959 -6.92673,16.932 -15.20031,16.35477 -27.12968,34.05641 -13.46864,20.39536 -9.62045,4.233 -13.46864,4.233 -6.92673,-7.69636 -11.54454,-7.31154 -27.12968,-8.466 -17.89405,-3.07855 -45.79336,-2.50132 -15.39272,1.92409 -7.50396,2.1165 -10.96731,-2.30891 -18.85609,-9.81286 -77.92568,-27.89932 -46.17818,-28.86136 -23.08909,-10.00527 -29.82341,-7.88877 -14.04586,-0.96205 -7.69636,0.38482 z"
	} else if (terrainID === rf.WOODS_RIVER_BRACKETS_NARROW_WIDE) {
		// hex 18
		if (util.arraysEqual(unrotatedVertexes, [0, 1])) path = "m 0.03396,-463.39911 -165.16927,96.59818 25.306,53.06096 8.97955,33.46923 17.41488,65.30581 5.17004,52.24464 14.69381,31.02026 34.01344,31.83658 30.74815,28.29918 32.92501,16.05435 52.51676,1.36054 56.32625,-10.34009 53.60519,-16.32645 41.90456,0.81632 38.63927,7.89112 35.10187,9.52376 26.66654,10.34009 42.99299,3.5374 48.16303,0.2721 v -183.12836 z"
		else if (util.arraysEqual(unrotatedVertexes, [2, 3, 5])) path = "m -0.25075,463.13031 -158.16026,-93.126 33.09436,-59.26199 26.55245,-22.70428 42.71482,-30.40063 23.4739,-25.78282 16.54718,-49.25672 -1.53927,-57.72272 -18.85609,-57.72273 -33.47918,-46.17818 -39.25145,-29.24618 -31.93991,-17.70163 -73.11545,-19.62573 -51.18081,-5.00263 -45.40854,4.233 -61.95573,-5.00264 -27.32209,-1.15446 -1.15445,-180.09489 154.31208,-86.19927 29.24618,54.64418 16.54718,52.33527 12.699,54.64418 36.55772,77.34845 21.165,28.86136 31.55509,27.32209 39.63627,28.47654 51.95045,20.01054 26.16764,1.15446 35.40327,-12.699 45.02372,-12.699 59.262,-3.46336 44.63891,7.31154 85.42963,30.78545 41.56036,13.85346 43.09963,-2.69373 26.16764,7.69636 1.15445,177.01636 z"
		else if (util.arraysEqual(unrotatedVertexes, [4])) path = "m -400.07682,232.23941 0.38482,-190.10017 16.16236,3.46336 58.87718,-10.39009 67.728,-18.08645 54.64418,-7.31154 48.48708,18.08645 23.08909,42.33 36.17291,71.57617 3.07854,37.32737 -23.85872,38.86663 -28.86136,12.699 -46.17818,10.00527 -26.16764,25.78282 -26.93727,55.02899 z"
	} else if (terrainID === rf.WOODS_RIVER_BRACKETS_2_US) {
		// hex 19
		if (util.arraysEqual(unrotatedVertexes, [0, 1, 3, 4])) path = "m -399.14778,52.24466 -0.81633,179.31886 399.72596,232.37983 159.99923,-93.06077 -27.21075,-42.72089 -11.97273,-12.24483 -18.50332,-13.33327 -30.47604,-10.8843 -49.25146,-10.06798 -52.51676,-17.9591 -19.59174,-18.2312 -26.12232,-30.20394 -9.52376,-19.86385 -7.89112,-12.24484 -1.08843,-24.76178 4.35372,-22.31282 10.8843,-15.51013 18.77542,-11.97273 15.23802,-5.17004 6.80269,-5.17005 6.25847,-19.86385 6.80269,-31.29236 9.52376,-20.95228 26.66654,-18.50331 22.31282,-2.17686 20.13596,-17.14278 29.65972,-14.96591 34.82976,-9.52377 34.28555,-1.63264 25.03389,3.26529 37.55084,1.36054 49.25146,-2.17686 49.52357,-1.90476 16.87067,-5.71425 17.41488,-4.35373 42.17667,-1.08843 9.25166,2.99319 -0.54422,-186.39366 -398.36542,-232.10772 -156.46183,94.42131 40.27191,68.5711 36.46241,74.01325 43.2651,71.02006 24.21757,41.90456 4.35372,43.5372 -1.90475,40.54403 -9.79587,38.91137 -14.1496,27.75497 -24.21757,37.00663 -12.78905,12.78905 -20.68017,25.57811 -35.10187,16.59856 -28.02708,14.42169 -31.83658,5.71426 -44.35353,-10.61219 -44.35352,-30.74815 -27.75497,-35.10187 -13.33327,-3.80951 -4.89794,-7.89112 -46.25828,-11.70062 -12.78905,-2.17686 -12.24484,0.81632 z"
		else if (util.arraysEqual(unrotatedVertexes, [2])) path = "m 399.75992,45.71408 -44.89774,-0.54422 -10.06798,2.72108 -42.99299,3.80951 -41.63245,-7.89112 -20.95228,-2.72108 -60.40787,-0.54421 -39.99981,-0.54422 -29.11551,4.35372 -25.306,12.24484 -47.61881,22.58493 -13.06116,8.43533 -16.05435,55.50993 -13.06116,31.56448 5.17004,8.16322 29.38762,16.05435 54.14939,10.34008 21.76861,1.63265 27.75496,16.32645 54.42151,21.4965 22.04071,11.15641 28.57129,57.68679 2.99318,7.61901 158.63869,-93.8771 z"
		else if (util.arraysEqual(unrotatedVertexes, [5])) path = "m -399.14778,-230.74717 156.73393,-88.70705 21.4965,32.38079 27.48286,20.95228 14.4217,32.10869 11.1564,32.92501 23.40125,34.82976 18.23121,20.40807 32.10869,20.68017 18.2312,10.61219 21.22439,34.55766 -12.51695,41.63245 -10.61219,39.45559 -14.14959,27.21076 -26.12233,13.60537 -53.06097,16.05435 -28.57129,-0.27211 -42.44877,-23.94546 -33.74133,-45.98617 -26.12233,-20.40807 -33.19712,-10.61219 -35.37397,-7.61901 -28.29919,4.08161 z"
	}

	// Now we have a base path, scale it for the current RATIO
	if (path !== "") {
		if (forZoomPanel) return path
		// FINAL RATIO
		const scaledPath = path.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)
		return scaledPath
	}

	// This code rotate 30 deg mathematically = but doesn't work on any relative movements
	/*if (path !== "") {
		// Apply rotation if shouldRotate is true
		if (store.hexStyle === rf.FLAT) {
			const angle = 30 * (Math.PI / 180) // 30 degrees in radians
			const cosTheta = Math.cos(angle)
			const sinTheta = Math.sin(angle)

			// Parse and rotate path coordinates
			path = path.replace(/([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)/g, (match, x, y) => {
				const xNum = parseFloat(x)
				const yNum = parseFloat(y)
				// Apply 2D rotation: x' = x * cos(θ) - y * sin(θ), y' = x * sin(θ) + y * cos(θ)
				const xPrime = xNum * cosTheta - yNum * sinTheta
				const yPrime = xNum * sinTheta + yNum * cosTheta
				return `${xPrime.toFixed(6)},${yPrime.toFixed(6)}`
			})
		}

		// Scale the path if not for zoom panel
		if (forZoomPanel) return path
		const scaledPath = path.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)
		return scaledPath
	}*/

	let pathData = ""
	let vertexesToHighlight = unrotatedVertexes

	// Reorder into contiguous circular order when vertices wrap around the 5/0 boundary
	if (vertexesToHighlight.length > 1) {
		let maxGap = -1
		let maxGapIndex = 0
		for (let i = 0; i < vertexesToHighlight.length; i++) {
			const curr = vertexesToHighlight[i]
			const next = vertexesToHighlight[(i + 1) % vertexesToHighlight.length]
			const gap = (next - curr + 6) % 6
			if (gap > maxGap) {
				maxGap = gap
				maxGapIndex = (i + 1) % vertexesToHighlight.length
			}
		}
		if (maxGapIndex > 0) {
			vertexesToHighlight = vertexesToHighlight.slice(maxGapIndex).concat(vertexesToHighlight.slice(0, maxGapIndex))
		}
	}

	// Guard against empty vertex arrays - apparently can happen when a hex is bridged
	// -- ie, one bucket now no longer existts
	if (vertexesToHighlight.length === 0) {
		return ""
	}

	// Start at the mid point before the first vertex
	let firstVertex = vertexesToHighlight[0]
	let firstMidPoint = (firstVertex + 5) % 6

	//if (firstMidPoint < 0) firstMidPoint = 5

	const vertexesPointyArr = store.VERTICES_POINTY_EXT
	const midPointsArr = store.MID_POINTS_POINTY

	let firstMidPointArr = midPointsArr[firstMidPoint]
	let firstVertexArr = vertexesPointyArr[firstVertex]
	const startX = (firstMidPointArr[0] + firstVertexArr[0]) / 2
	const startY = (firstMidPointArr[1] + firstVertexArr[1]) / 2

	pathData += `M ${startX},${startY} ` // Move to the starting point

	// Now add the VERTICES_POINTY
	for (let i = 0; i < vertexesToHighlight.length; i++) {
		const vertex = vertexesPointyArr[vertexesToHighlight[i]]
		pathData += `L ${vertex[0]},${vertex[1]} ` // Line to each vertex
	}

	let finalMidPoint = vertexesToHighlight[vertexesToHighlight.length - 1]
	let finalMidPointARR = midPointsArr[finalMidPoint]
	let lastVertexARR = vertexesPointyArr[vertexesToHighlight[vertexesToHighlight.length - 1]]
	const endX = (finalMidPointARR[0] + lastVertexARR[0]) / 2
	const endY = (finalMidPointARR[1] + lastVertexARR[1]) / 2

	pathData += `L ${endX},${endY} ` // Line to the final midpoint

	// If it's not the entire hex, add the center point and close the path
	if (vertexesToHighlight.length !== 6) {
		// A full hex selection will have 6 VERTICES_POINTY highlighted
		pathData += `L 0,0 Z` // Line to center, close path
	} else {
		pathData += "Z" // Close the path if it's the entire hex
	}

	if (forZoomPanel) return pathData

	// FINAL RATIO
	const scaledPathData = pathData.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)

	return scaledPathData
}

// This should probably be updated to use store.MID_POINTS_POINTY, as I suspect this just calcs everything itself as it was written first
export function getShoreHighlightPoints(entry, forZoomPanel = false) {
	const store = useModelStore()
	const hex = model.getHexByID(entry[0])
	const side = entry[1]

	const isShore = util.indexArray(6).map((i) => hex.hexLookup[i] >= 0 && model.getHexByID(hex.hexLookup[i]).currentTerrain === rf.TERR_SEA)
	const leftShore = isShore[(side + 5) % 6]
	const rightShore = isShore[(side + 1) % 6]

	const leftVertexId = side
	const rightVertexId = (side + 1) % 6

	const vertexesPointyArr = store.VERTICES_POINTY_EXT

	let leftPoint = vertexesPointyArr[leftVertexId]
	let rightPoint = vertexesPointyArr[rightVertexId]
	let leftDir = vec.normal(vec.subtract(leftShore ? [0, 0] : vertexesPointyArr[(leftVertexId + 5) % 6], leftPoint))
	let rightDir = vec.normal(vec.subtract(rightShore ? [0, 0] : vertexesPointyArr[(rightVertexId + 1) % 6], rightPoint))

	let highlightWidth = 120

	// Calculate the coordinates of the four corners of the rectangle
	let corner1 = vec.sum(rightPoint, vec.scaleBy(highlightWidth, rightDir))
	let corner2 = rightPoint
	let corner3 = leftPoint
	let corner4 = vec.sum(leftPoint, vec.scaleBy(highlightWidth, leftDir))

	// Return the SVG points for the rectangle
	let pathData = `${corner1[0].toFixed(3)},${corner1[1].toFixed(3)} ${corner2[0].toFixed(3)},${corner2[1].toFixed(3)} ${corner3[0].toFixed(3)},${corner3[1].toFixed(3)} ${corner4[0].toFixed(3)},${corner4[1].toFixed(3)}`
	if (forZoomPanel) return pathData

	// FINAL RATIO
	const scaledPathData = pathData.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)

	return scaledPathData
}

export function getHalfShoreHighlightPoints(entry, forZoomPanel = false) {
	const store = useModelStore()
	const hex = model.getHexByID(entry[0])
	//const hexID = entry[0]
	const vertex = entry[1][0]
	const side = entry[1][1]
	const nextVertex = (vertex === side ? vertex + 5 : vertex + 1) % 6
	const nextSide = vertex === side ? (side + 5) % 6 : vertex

	const isShore = hex.hexLookup[nextSide] >= 0 && model.getHexByID(hex.hexLookup[nextSide]).currentTerrain === rf.TERR_SEA

	const vertexesPointyArr = store.VERTICES_POINTY_EXT
	const midPointsArr = store.MID_POINTS_POINTY

	let vertexPoint = vertexesPointyArr[vertex]
	let midPoint = vec.sum(vec.scaleBy(0.8, midPointsArr[side]), vec.scaleBy(0.2, vertexPoint))

	let vertexDir = vec.normal(vec.subtract(isShore ? [0, 0] : vertexesPointyArr[nextVertex], vertexPoint))

	// ASSUME HORIZONTAL, IE r === r
	let mod = vec.normal([[-0.5, -1, -0.5, 0.5, 1, 0.5][side], [rf.hexSmallRatio, 0, -rf.hexSmallRatio, -rf.hexSmallRatio, 0, rf.hexSmallRatio][side]])

	let highlightWidth = 120

	// Calculate the coordinates of the four corners of the rectangle
	// The 0.9 is just a dirty hack
	let corner1 = vec.sum(midPoint, vec.scaleBy(0.9 * highlightWidth, mod))
	let corner2 = midPoint
	let corner3 = vertexPoint
	let corner4 = vec.sum(vertexPoint, vec.scaleBy(highlightWidth, vertexDir))

	// Return the SVG points for the rectangle
	let pathData = `${corner1[0].toFixed(3)},${corner1[1].toFixed(3)} ${corner2[0].toFixed(3)},${corner2[1].toFixed(3)} ${corner3[0].toFixed(3)},${corner3[1].toFixed(3)} ${corner4[0].toFixed(3)},${corner4[1].toFixed(3)}`

	if (forZoomPanel) return pathData

	// FINAL RATIO
	const scaledPathData = pathData.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)

	return scaledPathData
}

export function getRiverHighlightPath(hexID, riverIdx, forZoomPanel) {
	const store = useModelStore()
	//const store = useModelStore()

	let hex = model.getHexByID(hexID)
	let rotation = hex.rotation
	let terrainID = hex.hexTerrainID
	let riverSides = util.indexArray(6).filter((i) => hex.sideRiverVertexIds[i] >= 0 && hex.riverVertexRiverIds[hex.sideRiverVertexIds[i]] === riverIdx)

	// Un rotate the river sides - to match up with the exact path
	let unrotatedRiverSides = riverSides.map((i) => (i - rotation + 6) % 6)
	//unrotatedRiverSides.sort()
	// Correct numeric sort
	unrotatedRiverSides.sort((a, b) => a - b)

	let path = ""
	if (terrainID === rf.PASTURE_RIVER_STRAIGHT) {
		if (util.arraysEqual(unrotatedRiverSides, [2, 5])) path = "m -271.93237,-303.04265 23.47391,46.563 32.90195,27.5145 28.86136,18.85609 -0.19241,28.09172 -10.5825,61.95573 -2.1165,55.02899 0.57723,69.45968 0.57723,28.28414 24.05113,15.39272 59.262,21.93464 41.75277,1.53927 38.2894,33.67159 49.44914,4.42541 c 0,0 36.55772,29.43859 36.55772,30.20822 0,0.76964 18.85609,63.87982 18.85609,63.87982 l 15.00791,62.72536 12.926502,74.19041 30.476048,45.71406 162.09035,-91.81275 -36.75014,-51.37322 -30.20822,-40.2135 -17.12441,-50.41118 -4.233,-41.17554 L 194.65964,73.886739 178.68969,43.486105 147.32701,9.8145159 106.15147,-1.3452107 30.149882,-4.616165 l -50.988406,-27.12968 -22.127044,-16.547181 -18.278862,-53.682134 13.853453,-37.90459 7.119136,-51.95045 -0.192409,-50.9884 -8.27359,-29.43859 -31.36268,-46.17818 -34.44123,-57.1455 -12.50659,-13.66104 z"
	} else if (terrainID === rf.PASTURE_RIVER_STRAIGHT_WIGGLY) {
		if (util.arraysEqual(unrotatedRiverSides, [2, 5])) path = "m -277.51572,-302.31145 10.06798,40.81613 39.18348,36.73452 51.42833,23.12914 57.68679,12.51694 -3.8095,22.31282 7.07479,17.41488 7.89112,12.51695 -24.76178,53.06097 -18.77542,42.44877 V 2.9932 l 1.36053,45.44195 12.78906,31.29237 29.65972,20.95228 47.34671,3.5374 70.74796,-13.06116 26.39443,-7.0748 2.17686,5.17004 -45.44196,44.62564 -32.6529,49.52357 -25.0339,41.63245 14.96592,60.95209 29.38761,55.78204 54.1494,17.41488 66.12213,-2.17686 26.12232,31.02026 150.47546,-85.71387 -32.92501,-53.87729 -25.306,-27.48286 -32.10869,-7.0748 -41.90455,0.81632 -50.06779,14.96592 -8.70744,-7.3469 26.93864,-34.55766 48.70725,-49.79568 34.01344,-38.09505 6.53058,-44.62564 -7.07479,-45.98617 -16.87067,-36.73452 -35.37398,-26.39443 -84.35333,7.61901 -69.93164,14.96592 21.22439,-37.00663 30.20394,-39.72769 8.16322,-35.37398 -2.72107,-30.74815 26.93864,-38.36717 10.8843,-24.48967 -3.53739,-28.29919 -14.96592,-46.53038 -47.34671,-8.16323 -84.35333,-13.33327 -27.21076,-10.61219 -17.41488,-14.14959 -10.61219,-34.01345 z"
	} else if (terrainID === rf.WOODS_RIVER_BRACKETS_WIDE_NARROW) {
		if (util.arraysEqual(unrotatedRiverSides, [4, 5])) path = "m -261.72015,-313.79276 39.36256,57.21774 28.40597,29.62337 30.43497,16.23198 28.00017,17.44938 9.33339,29.21757 -4.46379,38.14516 -28.40597,68.17433 -17.85519,10.55079 c 0,0 -22.72477,2.4348 -25.15957,2.4348 -2.4348,0 -56.81194,-13.39139 -56.81194,-13.39139 l -65.73953,-9.33339 -46.66695,-10.55079 -28.81177,-2.029 0.4058,148.11685 47.07275,3.65219 66.95693,10.55079 65.33373,-2.84059 44.23215,-14.60879 16.63779,-14.20298 40.17415,-23.94218 28.40597,-24.34797 38.95676,-36.11616 54.37714,-41.79736 9.73919,-54.37714 v -39.76836 l -1.21739,-44.63795 -8.116,-38.95676 -32.05816,-25.56538 -16.23199,-24.34797 -40.98575,-18.26098 -21.91318,-37.73936 -28.00017,-28.40597 z"
		else if (util.arraysEqual(unrotatedRiverSides, [1, 3])) path = "m -266.99554,309.10958 18.66678,-49.91335 10.14499,-37.33356 10.55079,-49.91334 5.27539,-31.65237 31.65237,-45.04375 36.52196,-41.79736 48.29015,-36.52196 37.73936,-28.00017 27.18857,-26.37697 37.73936,-11.36239 43.82635,7.30439 24.75378,0.8116 c 0,0 10.55079,10.55079 14.20298,10.55079 3.6522,0 60.86994,6.89859 60.86994,6.89859 l 62.89893,-11.36238 55.59454,-24.75378 64.11633,-22.72477 32.05817,-9.73919 25.15957,-6.087 17.44939,-0.4058 0.81159,185.04461 -35.71036,0.4058 -43.01475,4.46379 -38.95676,17.04358 -54.78294,13.39139 -47.47855,4.8696 -56.81194,-13.39139 -44.23216,-13.39139 -32.46396,2.029 -46.66695,11.76819 -37.73936,28.40597 -16.63778,15.01458 -11.36239,35.71036 -4.058,37.73936 -4.86959,45.04376 -17.85518,37.73936 -19.47838,40.98575 -23.13058,29.62337 z"
	} else if (terrainID === rf.PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L) {
		if (util.arraysEqual(unrotatedRiverSides, [2, 4, 5])) path = "m -280.79273,-300.40137 38.34806,46.05825 37.53646,23.33347 c 0,0 56.20324,20.89868 57.21774,20.89868 1.0145,0 48.49305,10.75369 48.49305,10.75369 l 32.05816,12.98558 c 0,0 26.57988,20.08708 26.78278,25.97118 0.2029,5.88409 5.68119,31.04366 5.68119,31.04366 l 0.2029,36.11616 -11.76819,33.07267 -15.62328,21.30448 -29.21757,7.50729 -30.23207,2.029 -40.17415,-12.37689 -20.89868,-10.55079 -54.17424,-11.56529 -56.60904,-9.94209 -58.43514,-1.2174 -35.50746,0.2029 -12.57979,0.2029 0.2029,170.43582 70.00043,-7.91309 81.97151,-4.66669 55.59454,5.68119 59.44963,12.37689 54.37715,2.63769 48.49304,-11.15949 21.30448,-9.73918 12.37689,-1.2174 22.11607,15.82618 20.28998,36.72486 12.17399,51.73945 14.40588,57.01483 7.1015,48.89885 16.02908,59.85544 34.49296,34.49296 157.85603,-91.102 L 265.00769,240.52945 242.48581,181.68851 214.28274,120.20988 196.02176,68.87623 156.8621,4.9628 l -45.65245,-32.26107 -9.33339,-39.56545 5.8841,-44.02926 -1.4203,-44.63795 -14.20299,-40.37706 -25.15957,-40.37705 -51.33364,-48.89885 -68.78303,-44.23215 -51.53655,-14.20299 -21.91317,-15.62328 -12.98559,-23.33348 z"
	} else if (terrainID === rf.PASTURE_RIVER_SHARP_U) {
		if (util.arraysEqual(unrotatedRiverSides, [4, 5])) path = "m -399.97894,100.71723 c 0,0 49.92819,-3.44333 52.79762,-1.14778 2.86944,2.29555 62.84066,30.12908 62.84066,30.12908 l 26.39881,21.23383 42.18071,9.1822 74.89229,19.51216 c 0,0 56.81484,1.72166 60.83205,0.57389 4.01721,-1.14778 30.70297,-6.02582 46.19792,-8.03442 15.49496,-2.00861 49.92819,-12.91247 56.24095,-24.67715 6.31276,-11.76469 31.5638,-42.18072 31.5638,-42.18072 l 37.58962,-42.7546 14.63412,-48.20653 14.92107,-45.62403 10.32997,-50.78902 1.43472,-69.44036 -0.28694,-68.86647 -10.32997,-78.62256 -14.63413,-22.95549 -27.83353,-40.45905 c 0,0 -18.36439,-8.03442 -20.373,-9.18219 -2.0086,-1.14778 -43.32849,-14.63413 -43.32849,-14.63413 l -50.78902,-10.04302 -37.30267,3.15638 c 0,0 -19.22522,-4.5911 -23.81632,-4.5911 -4.5911,0 -6.88665,-6.88665 -6.88665,-6.88665 l -192.82611,112.19496 21.52077,34.43323 25.82492,29.5552 c 0,0 38.73739,17.21661 39.88517,17.21661 1.14777,0 96.41306,-2.86943 96.41306,-2.86943 0,0 30.41602,-10.90386 31.85074,-10.90386 1.43472,0 35.58101,-2.00861 35.58101,-2.00861 l 16.92967,8.03443 1.14778,30.41602 -6.31276,31.27686 -18.07745,61.11899 c 0,0 -9.75608,47.05875 -12.33858,49.64124 -2.58249,2.5825 -15.20801,19.22523 -19.22522,20.65995 -4.01721,1.43471 -15.7819,8.6083 -25.25104,10.90385 -9.46914,2.29555 -32.99852,7.74748 -36.1549,7.74748 -3.15638,0 -19.79911,1.14778 -24.96409,0.28695 -5.16499,-0.86084 -28.98131,-5.45193 -34.43324,-11.19081 -5.45193,-5.73887 -38.73739,-34.43323 -38.73739,-34.43323 l -35.58101,-21.52077 c 0,0 -27.54658,-6.88665 -29.55519,-7.17359 -2.0086,-0.28695 -31.85074,-4.01721 -35.86795,-3.73027 -4.01721,0.28694 -56.24095,-2.00861 -56.24095,-2.00861 z"
	} else if (terrainID === rf.WOODS_RIVER_STRAIGHT) {
		// hex_14
		//if (util.arraysEqual(unrotatedRiverSides, [2, 5])) path = "m -287.85581,-294.42033 22.85704,37.00662 30.20393,38.91138 30.74815,37.55084 0.81633,34.28555 8.16322,42.99299 c 0,0 12.24484,11.97273 13.33327,13.87748 1.08843,1.90475 16.05435,29.38761 16.05435,29.38761 l 6.25847,25.57811 19.86385,45.16985 31.02026,32.6529 30.47604,35.10188 45.98617,74.01324 57.41469,84.89755 39.99981,64.76159 37.00662,51.42833 24.21757,37.00662 186.39366,-108.02669 c 0,0 -53.33308,-73.46903 -53.33308,-74.55746 0,-1.08843 -10.06798,-53.87729 -10.06798,-53.87729 L 214.7268,118.36679 154.04682,64.76161 69.42138,-33.46921 l -20.68017,-68.5711 -33.46923,-53.33307 -29.38761,-66.12213 -13.06116,-68.84321 -21.4965,-56.87047 -50.612,-58.77523 z"
		if (util.arraysEqual(unrotatedRiverSides, [2, 5])) path = "m -294.25182,-292.65256 25.78281,41.56037 15.39273,56.18345 40.79072,66.95836 67.728,81.19663 76.96363,66.95836 27.70691,33.09436 11.15972,44.25409 23.47391,45.02372 26.55245,35.40327 21.93464,84.66 23.08909,43.48445 39.25145,53.1049 22.31945,28.47655 176.24672,-102.74645 -62.34054,-83.50554 -44.63891,-53.48972 -8.85081,-73.50027 -14.23828,-50.41118 -32.32472,-66.57354 -58.87718,-41.94518 -60.41645,-80.427 -43.48445,-71.96099 -53.87454,-93.126 -20.78019,-46.17818 -21.54981,-18.85609 z"
	} else if (terrainID === rf.PASTURE_RIVER_TRI_BLADE) {
		if (util.arraysEqual(unrotatedRiverSides, [1, 3, 5])) path = "m -266.0872,-308.84203 31.83658,63.94527 28.8434,44.08142 30.47604,32.92501 32.6529,45.16985 23.67336,48.43514 20.95228,54.96572 v 34.28555 l -31.29237,68.5711 -22.85703,62.85683 -35.10187,55.23783 -45.71407,53.87729 -38.63927,49.25147 152.65233,85.71387 31.56447,-76.73433 30.20394,-43.26509 32.38079,-60.40787 L 6.29243,158.6387 29.42157,103.67298 51.19018,87.89075 81.122,82.99281 l 25.0339,2.44897 57.41468,3.5374 58.23102,2.99318 41.63245,-10.8843 69.38742,-2.72108 30.47604,-2.17686 36.1903,2.44897 1.08843,-176.32568 -85.71387,-3.5374 -53.33307,2.17686 -23.94547,13.06116 -61.76841,7.89112 -50.8841,-1.63264 H 77.04039 l -31.02026,-6.80269 -22.58492,-25.03389 -45.16985,-84.08123 -32.3808,-53.06097 -24.76178,-65.85002 -33.46923,-48.70725 -23.67335,-22.04071 z"
	} else if (terrainID === rf.DESERT_RIVER_SHARP_U) {
		// hex_00
		if (util.arraysEqual(unrotatedRiverSides, [4, 5])) path = "m -270.98514,-305.57674 31.02026,59.31944 47.0746,38.91138 65.30581,35.64608 58.23101,15.51013 41.36034,32.10869 41.08824,35.10187 29.38761,20.13596 5.17005,23.12914 -9.25166,31.02026 -13.87748,18.2312 -28.8434,4.35372 h -31.56447 l -28.8434,-10.61219 -59.86366,-22.58493 -77.27854,-42.17666 -45.71406,-8.70744 -80.27172,-6.25848 -72.38061,-1.36053 0.54422,189.38684 c 0,0 103.40086,3.26529 107.48247,2.44896 4.08162,-0.81632 59.04734,-4.08161 59.04734,-4.08161 l 51.15621,5.98637 54.96572,14.96591 75.37379,17.9591 53.87729,2.99318 59.86366,-4.08161 c 0,0 32.38079,-7.89112 34.01344,-8.43534 1.63264,-0.54421 72.3806,-41.36034 72.3806,-41.36034 0,0 25.57811,-29.65972 25.85022,-31.56447 0.2721,-1.90476 7.89111,-27.75497 8.16322,-30.20394 0.27211,-2.44897 10.06798,-62.31262 10.06798,-62.31262 l -6.25847,-37.55084 -19.04753,-71.83639 -27.48286,-60.67998 -27.21075,-27.48286 -48.16304,-31.56447 -37.82294,-12.24484 -60.13577,-24.76179 -43.26509,-28.02707 -32.3808,-31.56448 -23.40125,-29.93182 -6.53058,-6.80269 z"
	} else if (terrainID === rf.WOODS_RIVER_GENTLE_CURVE) {
		// hex_15
		if (util.arraysEqual(unrotatedRiverSides, [3, 5])) path = "m -279.96469,-300.4067 22.85704,55.23783 41.36034,45.71407 47.61882,39.7277 60.67998,31.83658 25.85021,21.7686 13.33327,41.08824 1.90475,34.01344 -19.86385,52.78886 1.36054,40.81613 -15.78224,41.90456 -18.50331,8.16322 -14.14959,28.57129 -50.06778,19.59174 -35.10188,13.60538 -28.84339,34.01344 -18.77542,31.83658 -19.59175,58.23101 168.70667,95.78185 41.90456,-67.75477 51.15622,-16.32645 35.91819,-18.77542 33.19712,-37.55084 34.55766,-61.76841 11.42851,-47.61882 12.78906,-65.3058 5.71425,-34.55766 17.68699,-50.06779 1.90476,-29.38761 6.25847,-65.85002 -13.06116,-59.86366 -22.31282,-26.12232 -38.91138,-32.3808 -36.73451,-52.24464 -32.10869,-24.48968 -46.8025,-39.99981 -32.10868,-19.59174 -18.50332,-19.59174 -11.97273,-19.31964 z"
	} else if (terrainID === rf.PASTURE_RIVER_GENTLE_CURVE_2) {
		// hex_05
		if (util.arraysEqual(unrotatedRiverSides, [3, 5])) path = "m -303.87228,-287.2651 34.63364,52.33527 51.56563,76.96363 11.92936,57.72272 2.69373,87.35372 15.00791,33.864 -28.47655,98.51345 -36.55772,71.19136 -59.262,90.04745 L -70.28766,420.80031 3.21261,303.43077 39.38552,181.44341 59.01124,99.09233 83.63961,-17.12275 l -0.38482,-63.87982 -18.08646,-90.43227 -10.39009,-53.48972 -34.63363,-58.87718 -77.34845,-80.81181 -38.86663,-43.09963 z"
	} else if (terrainID === rf.ROCK_RIVER_GENTLE_CURVE) {
		if (util.arraysEqual(unrotatedRiverSides, [3, 5])) path = "m -282.70728,-297.65519 50.41118,76.19399 60.41645,51.56564 17.31682,54.25936 38.09699,53.87454 12.31419,68.11281 -6.1571,64.64945 -29.24618,63.11018 -85.81444,66.18872 -39.25146,57.33791 -20.01054,40.02109 204.72326,116.21508 36.94254,-128.14444 49.25673,-73.88509 50.79599,-65.03427 15.77755,-70.0369 1.53927,-95.05009 -4.233,-85.42963 -26.16763,-96.20454 -52.72009,-83.50554 -53.10491,-83.12072 -32.32472,-41.56036 z"
	} else if (terrainID === rf.MOUNTAIN_RIVER_STRAIGHT) {
		// hex_20
		if (util.arraysEqual(unrotatedRiverSides, [2, 5])) path = "m -285.40101,-296.88556 37.71218,63.87982 32.32473,40.79072 2.30891,63.495 -1.53928,83.89036 -8.85081,64.26463 -6.92673,42.71482 87.35372,35.40327 104.28572,31.55509 50.796,18.08645 37.32736,60.80127 13.08382,86.58408 22.70427,49.64155 36.55772,47.33263 L 297.98332,289.1925 244.4936,209.91996 220.63487,118.33324 207.55105,47.14188 181.76824,0.57888 145.21051,-16.73794 92.49042,-20.2013 l -70.0369,-10.39009 -33.09436,-21.165 -33.47918,-37.32736 -7.69637,-28.86136 10.3901,-32.32473 21.54981,-60.80127 -4.61782,-69.26726 -17.70163,-36.17291 -71.961,-80.427 z"
	} else if (terrainID === rf.MOUNTAIN_RIVER_SOURCE) {
		// hex_21
		if (util.arraysEqual(unrotatedRiverSides, [5])) path = "m -308.10528,-282.26247 41.17554,81.19663 51.95045,69.26727 42.33,53.48972 25.398,25.01318 -11.92936,25.01318 -18.85609,60.41645 1.53927,26.93728 -16.54718,58.49235 -0.38482,34.63364 6.54191,46.563 17.70163,30.40063 29.631,8.466 31.17027,-0.76964 17.31682,-10.77491 c 0,0 7.69636,-16.16236 8.466,-18.47127 0.76964,-2.30891 5.38745,-29.24618 5.38745,-29.24618 l 3.84818,-42.71481 8.85082,-15.77755 21.165,-8.466 c 0,0 15.77755,-5.38745 18.47127,-9.23563 2.69373,-3.84818 6.92673,-28.47654 6.92673,-28.47654 l -4.61782,-20.78019 0.76964,-17.31681 53.87454,-55.79863 c 0,0 13.08382,-28.86137 13.46863,-30.78546 0.38482,-1.92409 1.9241,-48.8719 1.9241,-51.18081 0,-2.30891 -12.699,-34.24882 -12.699,-34.24882 l -21.54982,-28.86136 -41.17554,-15.77754 -17.31682,-78.88772 -13.08382,-35.78809 -10.39009,-31.55509 -20.01054,-53.48972 -15.00791,-20.78019 z"
	} else if (terrainID === rf.DESERT_RIVER_GENTLE_CURVE) {
		// hex_01
		if (util.arraysEqual(unrotatedRiverSides, [3, 5])) path = "m -266.35931,-308.56992 11.70062,24.76178 19.04753,22.31282 25.306,14.4217 40.54402,23.67335 12.78906,20.95228 13.87748,24.76179 23.67336,21.49649 31.02025,20.95228 36.1903,31.83658 29.65973,23.40125 10.8843,64.48949 9.52376,35.10187 -26.12232,67.48266 -28.02708,33.19712 -40.27191,17.9591 -60.40787,20.13596 -39.4556,22.04071 -40.27191,31.02025 -28.02708,42.17667 -21.49649,44.08142 171.69985,97.4145 38.09505,-52.78886 1.90476,-24.21757 8.70744,-33.74134 18.77542,-16.32645 35.37398,-14.96591 48.16303,-17.41489 28.29918,-25.306 25.57811,-35.37397 34.55766,-47.61882 11.1564,-32.10869 4.35373,-59.04733 -8.16323,-42.72089 -13.33327,-28.57129 v -38.91137 l 12.24484,-26.39443 2.17686,-37.27874 -8.97955,-41.63245 -31.02026,-52.24464 -36.73451,-54.96572 -34.28555,-34.28555 -38.09506,-7.61901 -41.08823,-4.89794 -31.83658,-10.34008 -38.09506,-46.53039 z"
	} else if (terrainID === rf.WOODS_RIVER_SHARP_U) {
		// hex 16
		if (util.arraysEqual(unrotatedRiverSides, [4, 5])) path = "m -276.93501,-301.50337 33.864,44.6389 44.25409,21.93464 45.40854,18.08645 58.10754,10.39009 24.24355,14.62309 8.08118,29.24618 11.54454,68.11282 8.08118,34.24881 -29.63099,38.86664 -29.24618,37.71217 c 0,0 -40.79073,4.61782 -42.71482,4.61782 -1.92409,0 -40.40591,-18.47127 -40.40591,-18.47127 l -28.09172,-33.864 -18.85609,-27.32209 c 0,0 -44.63891,-16.16236 -48.10227,-16.16236 -3.46336,0 -61.18609,-3.07854 -61.18609,-3.07854 l -58.49236,-3.46337 1.53927,168.93517 52.72009,18.08646 c 0,0 41.94518,19.24091 45.02373,20.39536 3.07854,1.15445 48.10227,33.864 48.10227,33.864 l 49.25672,25.398 c 0,0 38.097,10.7749 39.63627,10.7749 1.53927,0 52.72009,6.1571 52.72009,6.1571 0,0 52.72009,-5.00264 55.029,-6.92673 2.3089,-1.92409 37.71217,-26.93727 41.56036,-28.47655 3.84818,-1.53927 33.09436,-29.63099 33.09436,-29.63099 L 45.15779,97.55306 82.86997,64.07388 c 0,0 19.24091,-19.24091 20.39536,-21.165 1.15446,-1.92409 12.699,-31.93991 14.62309,-36.17291 1.92409,-4.233 -0.38482,-58.49236 -0.38482,-58.49236 0,0 4.233,-50.41118 4.61782,-52.33527 0.38482,-1.92409 -0.38482,-85.81445 -0.38482,-85.81445 l -6.15709,-50.41118 c 0,0 -11.92936,-23.08909 -11.92936,-24.62836 0,-1.53927 -21.165,-31.17027 -21.165,-34.63363 0,-3.46337 -38.86663,-32.32473 -38.86663,-32.32473 l -60.80127,-23.08909 -46.17818,-14.62309 -19.62573,-10.00527 -27.32209,-18.85609 z"
	} else if (terrainID === rf.PASTURE_RIVER_GENTLE_CURVE_1) {
		// hex 04
		if (util.arraysEqual(unrotatedRiverSides, [3, 5])) path = "m -290.21123,-294.57665 50.51846,79.33961 40.54402,43.2651 39.99981,40.54402 18.77541,42.72088 1.08844,65.30581 -9.79588,59.04733 -16.05434,48.97936 -30.20394,43.26509 -50.33989,82.9928 -42.44877,65.30581 -8.70744,16.32645 201.35957,114.82937 68.02688,-78.63907 38.36716,-60.67998 21.4965,-63.94527 19.04752,-63.94527 17.14278,-72.3806 13.06116,-105.30561 c 0,0 -3.26529,-129.25108 -3.80951,-130.61162 -0.54421,-1.36054 -23.12914,-69.38742 -23.12914,-69.38742 l -36.1903,-56.87047 -49.79568,-26.93865 -48.70724,-43.2651 -17.9591,-21.49649 -8.43533,-15.51013 z"
	} else if (terrainID === rf.PASTURE_RIVER_GENTLE_CURVE_3) {
		if (util.arraysEqual(unrotatedRiverSides, [3, 5])) path = "m -282.68576,-298.22984 23.67335,32.65291 31.02026,30.47604 34.01344,20.13596 31.29237,13.60537 3.8095,8.97955 -5.71425,11.97273 -21.4965,33.46923 -14.14959,29.38761 -4.89794,66.39424 17.41489,44.89774 36.4624,33.46923 60.13577,29.65972 48.16303,10.8843 24.48968,16.87067 16.87067,23.12914 -0.27211,23.12914 -4.62583,18.2312 -10.34009,7.3469 -62.04051,11.97274 -52.51676,12.24483 -41.63245,21.4965 -73.19692,48.43514 -20.95228,22.85703 -15.51013,25.57811 170.61142,99.59135 27.75497,-27.75496 12.24484,-10.34009 c 0,0 22.0407,-10.61219 26.12232,-11.70062 4.08161,-1.08843 38.91137,-17.9591 38.91137,-17.9591 l 70.74796,-29.93183 c 0,0 34.55766,-24.48968 35.64609,-25.03389 1.08843,-0.54422 34.01344,-39.45559 34.01344,-39.45559 l 20.40806,-57.14258 4.89794,-48.43514 -6.80269,-61.2242 L 141.25777,29.38763 114.31912,-20.95227 90.91788,-38.63925 58.26497,-58.231 15.8162,-72.9248 l -50.06779,-23.40125 -0.54421,-11.15641 6.25847,-14.14959 15.78224,-22.85703 5.44215,-50.3399 -8.43534,-49.79567 -14.6938,-30.74815 -25.57811,-30.20394 -45.44196,-58.77523 -25.85021,-23.94546 z"
	} else if (terrainID === rf.PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_R) {
		// hex 09
		if (util.arraysEqual(unrotatedRiverSides, [1, 4, 5])) path = "m -264.62083,-309.58455 35.54025,76.66052 48.97936,66.93845 57.68679,49.25146 34.82977,43.2651 13.06116,32.10869 -8.70744,42.17667 -16.05435,10.34008 c 0,0 -27.48286,10.8843 -29.1155,11.15641 -1.63265,0.27211 -42.72089,4.89794 -42.72089,4.89794 l -39.18348,-17.68699 -45.44196,-44.62564 -30.47604,-29.65972 -39.7277,-17.41488 -45.44196,-6.53058 -29.38761,0.54422 1.63265,195.64531 33.74133,3.5374 25.57811,12.24484 23.67335,22.31281 37.00663,15.23802 77.55064,33.46923 50.612,13.06116 50.33989,-5.44215 52.51676,-15.51013 29.65972,-20.68017 51.15621,-34.55766 29.11551,3.5374 28.57129,11.42852 34.01344,4.35372 41.63245,-1.90475 92.24446,-18.23121 75.64589,-19.86385 28.29918,-6.80269 11.42852,-3.53739 h 14.6938 l 10.06798,4.35372 1.90476,-212.78809 -53.06097,-6.80269 -50.612,2.72108 -40.81613,10.06797 -101.76822,17.41489 -32.38079,-4.62583 -17.9591,-10.06798 -21.22439,-32.6529 -20.13596,-37.00663 -31.29236,-45.71406 -41.08824,-30.20394 -32.6529,-53.33307 -19.31964,-35.9182 -24.76178,-52.51675 -15.51013,-17.41488 z"
	} else if (terrainID === rf.ROCK_RIVER_STRAIGHT) {
		// hex 11
		if (util.arraysEqual(unrotatedRiverSides, [2, 5])) path = "m -280.78319,-297.65519 44.25409,98.51345 22.31945,77.73326 40.79073,99.28309 81.96626,111.98208 43.86927,70.80654 34.24882,58.49236 33.864,78.50291 30.78545,68.88245 25.398,50.41118 L 359.93904,253.78923 297.5985,163.35696 241.03023,47.91151 197.9306,-7.88712 92.49042,-119.09957 37.84625,-221.07638 -7.94712,-326.13174 -59.12793,-393.47491 -79.13847,-416.564 Z"
	} else if (terrainID === rf.ROCK_RIVER_SHARP_U) {
		// hex 13
		if (util.arraysEqual(unrotatedRiverSides, [4, 5])) path = "m -282.14155,-297.95773 20.40807,35.91819 32.92501,32.10869 36.91828,9.23929 60.03163,4.61782 41.94518,-5.38746 44.6389,1.53928 50.41118,-2.69373 c 0,0 24.62836,6.92673 26.93727,8.08118 2.30891,1.15445 14.62309,22.70427 14.62309,22.70427 l -9.23563,17.70164 -13.85346,21.93463 -14.62309,75.80918 10.00528,22.31945 -3.84819,24.24355 -27.32208,26.93727 -21.54982,14.23827 -13.85346,-9.23564 -46.17817,-11.15972 -69.26727,0.76963 -67.728,-21.54981 -81.19663,-37.71218 c 0,0 -49.25672,-18.08646 -51.18082,-18.08646 -1.92409,0 -35.40327,-0.76963 -35.40327,-0.76963 l -1.15445,163.1629 65.03427,11.92936 65.8039,13.85345 100.82236,16.16237 43.48445,7.69636 54.64418,14.62309 52.72009,-5.38746 42.33,-21.93463 44.25408,-47.33263 38.097,-59.64682 24.62836,-60.80127 8.85082,-83.89036 16.16236,-83.50554 -9.62045,-48.8719 -24.24354,-26.93727 -39.25146,-33.47918 -53.48972,-21.93464 -59.262,-12.699 -59.26199,-3.84818 -24.62836,-3.46336 -15.39273,-14.23827 z"
	} else if (terrainID === rf.WOODS_RIVER_BRACKETS_NARROW_WIDE) {
		// hex 18
		if (util.arraysEqual(unrotatedRiverSides, [1, 5])) path = "m -294.25182,-291.88292 28.09172,63.495 41.56036,87.73854 56.18345,64.64945 43.48445,31.9399 81.58145,57.72273 26.55246,7.31154 50.79599,13.46864 70.03691,18.08645 64.26463,5.38746 77.73327,20.39536 63.495,24.62836 49.64154,-1.92409 38.48181,2.69373 2.69373,-255.90408 -139.68899,-24.62836 -73.88509,-8.85082 -114.67581,22.31946 -51.18081,-6.54191 -41.56036,-22.31946 -24.62837,-26.55245 -15.0079,-28.09173 -13.08382,-71.57617 -30.40064,-52.33527 -20.01054,-20.78018 z"
		else if (util.arraysEqual(unrotatedRiverSides, [3, 4])) path = "m -399.30718,92.93524 -1.92409,-185.09754 86.58408,7.69637 83.12073,17.31681 53.48972,24.62837 57.72272,26.93727 55.029,44.25409 23.85873,34.24881 39.63627,38.48182 25.39799,61.18609 -1.92409,50.02636 -5.00263,43.09963 -32.32473,29.631 -33.47918,14.23827 -44.6389,58.87718 -27.32209,33.864 -179.71008,-101.97682 14.62309,-51.18081 26.16763,-26.16764 54.64418,-18.47127 52.72009,-27.32209 -3.84818,-33.86399 -20.01055,-43.86928 -17.31682,-29.24618 -24.24354,-3.46336 c 0,0 -32.32472,9.62046 -35.78809,11.15973 -3.46336,1.53927 -65.03427,15.39272 -65.03427,15.39272 l -46.17818,5.00264 z"
	} else if (terrainID === rf.WOODS_RIVER_BRACKETS_2_US) {
		// hex 19
		if (util.arraysEqual(unrotatedRiverSides, [4, 5])) path = "m -264.23601,-304.96674 36.17291,51.95045 27.32209,55.79864 40.02109,63.11018 43.48445,30.40063 27.70691,16.54718 -15.77755,65.41909 -15.39273,30.01581 -66.95835,18.85609 -37.71218,-13.08381 -24.62837,-41.17555 -20.78018,-28.86136 -45.40854,-15.77754 -57.3379,-13.46864 -25.78282,2.30891 -0.76964,183.17344 61.18609,5.77228 43.48445,29.63099 72.73063,33.864 60.41645,-1.92409 37.71218,-29.24618 20.01055,-19.24091 15.39272,-8.85081 29.631,-34.24882 32.70955,-51.56563 17.31681,-50.02636 24.62836,-61.18609 c 0,0 -0.38481,-60.03163 -0.76963,-61.95572 -0.38482,-1.9241 -30.01582,-56.56827 -30.01582,-56.56827 l -37.32736,-66.95836 -38.48182,-71.57618 -31.9399,-45.02372 z"
		else if (util.arraysEqual(unrotatedRiverSides, [1, 2])) path = "m 136.90405,385.57638 -33.19712,-46.25828 -50.612,-25.306 -68.84321,-14.96591 -51.42832,-22.04071 -23.67335,-34.55766 c 0,0 -4.89794,-33.74133 -4.89794,-35.64608 0,-1.90476 0.81632,-34.82977 0.81632,-34.82977 l 6.80269,-38.63927 25.85022,-21.7686 23.67335,-12.24484 14.4217,-53.60518 9.52376,-21.4965 27.48286,-18.2312 41.63246,-44.35353 33.19711,-20.95228 66.12213,-5.17004 104.4893,-5.17004 67.21056,-10.34009 72.3806,-0.27211 2.72107,174.42093 -87.34651,-0.54422 -90.61181,-10.61219 -82.17647,7.61901 -79.99962,18.50331 -23.40125,56.32626 53.8773,9.52377 57.41468,17.41488 65.30581,29.93183 35.64609,37.55084 25.85021,45.98617 z"
	} else if (terrainID === rf.CITY) {
		path = "M 0,-463.127 L 399.692,-231.564 L 399.692,231.564 L 0,463.127 L -399.692,231.564 L -399.692,-231.564 Z M 0,-347.345 L 299.769,-173.673 L 299.769,173.673 L 0,347.345 L -299.769,173.673 L -299.769,-173.673 Z"
	}

	// Now we have a base path, scale it for the current RATIO
	if (path !== "") {
		if (forZoomPanel) return path
		const scaledPath = path.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)
		return scaledPath
	}

	// So now we need to make up a path on the fly. So use the river sides to make the path
	let pathData = ""
	// Basically we want the vertexes before and after each river side, joined through hex center
	let vertexesToHighlight = []
	for (let i = 0; i < unrotatedRiverSides.length; i++) {
		vertexesToHighlight.push(unrotatedRiverSides[i])
		vertexesToHighlight.push((unrotatedRiverSides[i] + 1) % 6)
	}

	// Start at the mid point before the first vertex
	//let firstVertex = vertexesToHighlight[0]
	//let firstMidPoint = (firstVertex + 5) % 6
	//if (firstMidPoint < 0) firstMidPoint = 5

	const vertexesPointyArr = store.VERTICES_POINTY_EXT

	for (let i = 0; i < vertexesToHighlight.length; i += 2) {
		const firstPoint = vertexesPointyArr[vertexesToHighlight[i]]
		const secondPoint = vertexesPointyArr[(vertexesToHighlight[i] + 1) % 6]
		const thurdPoints = [0, 0]
		pathData += `M 0,0 L ${firstPoint[0]},${firstPoint[1]} L ${secondPoint[0]},${secondPoint[1]} L ${thurdPoints[0]},${thurdPoints[1]} `
	}

	// If it's not the entire hex, add the center point and close the path
	if (vertexesToHighlight.length !== 6) {
		// A full hex selection will have 6 VERTICES_POINTY highlighted
		pathData += `L 0,0 Z` // Line to center, close path
	} else {
		pathData += "Z" // Close the path if it's the entire hex
	}

	// Now scale it for the current RATIO
	if (forZoomPanel) return pathData
	const scaledPath = pathData.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)
	return scaledPath
}

export function addTimingsToWaypoints(startArr, waypoints) {
	const store = useModelStore()

	// Adjust this variable to change the overall speed
	// (Higher = Slower)
	const SPEED_FACTOR = 1

	for (let i = 0; i < waypoints.length; i++) {
		let startXY = i == 0 ? startArr : waypoints[i - 1]

		let startX = startXY[0]
		let startY = startXY[1]
		let endX = waypoints[i][0]
		let endY = waypoints[i][1]

		// 1. Calculate the pixel distance (what you have now)
		let pixelDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)

		// 2. Normalize by Ratio to get the "Internal Map Distance"
		let internalDistance = pixelDistance / store.RATIO

		// 3. Set timing based on Internal Distance
		// This will be the SAME for both your log examples!
		const timing = internalDistance * SPEED_FACTOR
		waypoints[i].push(timing)
	}
}

/*
export function getRoadSvgSegment(vertices, forZoomPanel) {
	const store = useModelStore()
	let startPoint = vertices[0]
	let endPoint = vertices[1]
	// Note: This uses ratio'd vertexes. So for zoom panel, undo the ratio
	if (!forZoomPanel) {
		startPoint = vec.scaleBy(store.RATIO, startPoint)
		endPoint = vec.scaleBy(store.RATIO, endPoint)
		//startPoint[0] = startPoint[0] * store.RATIO
		//startPoint[1] = startPoint[1] * store.RATIO
		//endPoint[0] = endPoint[0] * store.RATIO
		//endPoint[1] = endPoint[1] * store.RATIO
	}
	return `M${startPoint[0]} ${startPoint[1]} L${endPoint[0]} ${endPoint[1]}`
}*/

/***** NEW BRIDGEDS  */
// Utility function for line intersection
function lineIntersection(p1, p2, p3, p4) {
	const x1 = p1[0],
		y1 = p1[1]
	const x2 = p2[0],
		y2 = p2[1]
	const x3 = p3[0],
		y3 = p3[1]
	const x4 = p4[0],
		y4 = p4[1]

	const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
	if (Math.abs(den) < 1e-10) return null // Parallel lines

	const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den

	if (t < 0 || t > 1) return null // Intersection outside segment p1-p2

	return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
}

// Main function to get bridge path
export function getBridgeSVGpath(hexID, bridgeEntry, outlineHighlight = false, withRoad = false, forZoomPanel = false, returnRiverPointsForDebugOnly = false, returnMidpointForDebugOnly = false) {
	const store = useModelStore()
	const hexObj = model.getHexByID(hexID, "view")

	//function vertexPoints(side) {
	//	return [store.VERTICES_POINTY_EXT[side], store.VERTICES_POINTY_EXT[(side + 1) % 6]]
	//}
	//const vertexBasis = [store.VERTICES_POINTY_EXT, util.indexArray(6).map(vertexPoints)]
	const bridgeEntryIndexInBridges = util.indexOfArrayInArray(hexObj.bridges, bridgeEntry)
	const bridgeRiverLines = hexObj.bridgeRiverLines[bridgeEntryIndexInBridges].map(computes.computedToXY.value, true)
	let riverStartPoint = vec.scaleBy(store.RATIO, bridgeRiverLines[0])
	let riverEndPoint = vec.scaleBy(store.RATIO, bridgeRiverLines[1])

	let ratio = (0.2 * store.refSize) / store.canvasSize // Matching original scaling

	// Bridge centerline vector
	let startPoint = vec.scaleBy(store.RATIO, hexObj.vertices[bridgeEntry[0]])
	let endPoint = vec.scaleBy(store.RATIO, hexObj.vertices[bridgeEntry[1]])

	if (forZoomPanel) {
		// let VERTICES_ORIGINAL_NEW_SCHEME_FOR_HEX = hex.vertices.map(a => vec.scaleBy(1/store.RATIO, a)
		//let unscaledNewVertexScheme = computes.computeVertices(store.ZOOM_PANEL_VERTICES, hex.nodeVertexDefinitions)
		riverStartPoint = bridgeRiverLines[0]
		riverEndPoint = bridgeRiverLines[1]
		//startPoint = vec.scaleBy(1 / store.RATIO, startPoint)
		//endPoint = vec.scaleBy(1 / store.RATIO, endPoint)
		startPoint = hexObj.vertices[bridgeEntry[0]]
		endPoint = hexObj.vertices[bridgeEntry[1]]
		ratio = 1.846 // Why? Because This is the above ratio when the map has a single hex.
	}

	if (returnRiverPointsForDebugOnly) {
		if (forZoomPanel) return [vec.scaleBy(1, bridgeRiverLines[0]), vec.scaleBy(1, bridgeRiverLines[1])]
		//else return [vec.scaleBy(store.RATIO, bridgeRiverLines[0]), vec.scaleBy(store.RATIO, bridgeRiverLines[1])]
		else return [riverStartPoint, riverEndPoint]
		//else return [startPoint, endPoint]
	}

	const bridgeVec = vec.subtract(endPoint, startPoint)
	const bridgeLengthActual = vec.length(bridgeVec)
	if (bridgeLengthActual < 1e-10) return { bridgeD: "" } // Avoid division by zero

	const dir = vec.normal(bridgeVec) // Unit vector along bridge

	let perp = [-dir[1], dir[0]] // Perpendicular (CCW)

	// Orient perp based on river direction
	const riverVec = vec.subtract(riverEndPoint, riverStartPoint)
	const riverDir = vec.normal(riverVec.length > 0 ? riverVec : [1, 0])
	const cross = riverDir[0] * dir[1] - riverDir[1] * dir[0]
	if (cross < 0) perp = [-perp[0], -perp[1]] // Flip for consistent "facing"

	// Find intersection point P
	let P = lineIntersection(startPoint, endPoint, riverStartPoint, riverEndPoint)
	if (!P) {
		rf.doAdminAlrt("Bridge and river lines do not intersect. Bridge will be centered.")
		P = vec.sum(startPoint, vec.scaleBy(0.5, bridgeVec)) // Fallback to midpoint
	}
	if (returnMidpointForDebugOnly) return P

	// Fixed bridge dimensions matching original
	const L = 100 * ratio // Fixed bridge length
	const taperL = 20 * ratio // Taper length each side
	const middleL = 60 * ratio // Middle length

	const taper1L = taperL
	//const taper2L = taperL
	const actualMiddleL = middleL

	const u2 = taper1L / L
	const u3 = (taper1L + actualMiddleL) / L

	const hwEnd = 50 * ratio
	const hwMiddle = 20 * ratio

	// Get position at parametric u, centered at P
	const getPos = (u) => vec.sum(P, vec.scaleBy((u - 0.5) * L, dir))

	// Calculate bridge points
	const left1 = vec.sum(getPos(0), vec.scaleBy(-hwEnd, perp))
	const left2 = vec.sum(getPos(u2), vec.scaleBy(-hwMiddle, perp))
	const left3 = vec.sum(getPos(u3), vec.scaleBy(-hwMiddle, perp))
	const left4 = vec.sum(getPos(1), vec.scaleBy(-hwEnd, perp))

	const right1 = vec.sum(getPos(0), vec.scaleBy(hwEnd, perp))
	const right2 = vec.sum(getPos(u2), vec.scaleBy(hwMiddle, perp))
	const right3 = vec.sum(getPos(u3), vec.scaleBy(hwMiddle, perp))
	const right4 = vec.sum(getPos(1), vec.scaleBy(hwEnd, perp))

	// Construct bridge path (two lines)
	let bridgeD = `M${left1[0]} ${left1[1]} L${left2[0]} ${left2[1]} L${left3[0]} ${left3[1]} L${left4[0]} ${left4[1]} M${right1[0]} ${right1[1]} L${right2[0]} ${right2[1]} L${right3[0]} ${right3[1]} L${right4[0]} ${right4[1]}`

	if (outlineHighlight) {
		bridgeD = `M${left1[0]} ${left1[1]} L${right1[0]} ${right1[1]} L${right4[0]} ${right4[1]} L${left4[0]} ${left4[1]} Z`
	}

	if (!withRoad) return { bridgeD }

	// Road: straight line from startPoint to endPoint (full span, independent of bridge length)
	const roadD = `M${startPoint[0]} ${startPoint[1]} L${endPoint[0]} ${endPoint[1]}`

	return { bridgeD, roadD }
}
/*** END NEW BRIDGES */

// NB WALLS LIVE ON EDGES
// BUT IN ORDER TO DISPLAY A WALL IN THE ZOOM PANEL, THE POSITION NEEDS TO BE REFERENCED TO A PARTICULAR HEX
export function getWallSVGpointsFromHexID(hexID1, hexID2, forHighlight, forText, forZoomPanel) {
	const store = useModelStore()

	let wallWidth = 25

	const hex1 = model.getHexByID(hexID1)
	const hex2 = model.getHexByID(hexID2)
	const joiningSide = hd.getJoiningSide(hex1.coord, hex2.coord)

	const vertexesPointyArr = store.VERTICES_POINTY_EXT
	const midPointsArr = store.MID_POINTS_POINTY

	if (forText) {
		if (forZoomPanel) return midPointsArr[joiningSide]
		// FINAL RATIO
		return vec.scaleBy(store.RATIO, midPointsArr[joiningSide])
	}

	let x1 = vertexesPointyArr[joiningSide][0]
	let y1 = vertexesPointyArr[joiningSide][1]
	let x2 = vertexesPointyArr[(joiningSide + 1) % 6][0]
	let y2 = vertexesPointyArr[(joiningSide + 1) % 6][1]

	// Now we have line points on the edge of the hex. So give it a halfoffset outwards and half offset inwards
	const angleRadians = (((joiningSide + 5) % 6) * 60 * Math.PI) / 180
	const cosAngle = Math.cos(angleRadians)
	const sinAngle = Math.sin(angleRadians)

	const offset = forHighlight ? wallWidth * 2 : wallWidth
	let x1a = x1 + offset * cosAngle
	let y1a = y1 + offset * sinAngle
	let x2a = x2 + offset * cosAngle
	let y2a = y2 + offset * sinAngle
	// Now make up the points the other side
	let x3b = x1 - offset * cosAngle
	let y3b = y1 - offset * sinAngle
	let x4b = x2 - offset * cosAngle
	let y4b = y2 - offset * sinAngle

	let pathData = `${x1a},${y1a} ${x2a},${y2a} ${x4b},${y4b} ${x3b},${y3b}`

	if (forZoomPanel) return pathData

	// FINAL RATIO
	const scaledPathData = pathData.replace(/[-+]?\d*\.\d+|\d+/g, scaleNumber)

	return scaledPathData
}

export function getWallSVGpointsFromHexIDModifiedForZoomPanelEdgeSummary(side, bank) {
	const store = useModelStore()
	let wallWidth = 25

	const vertexesPointyArr = store.VERTICES_POINTY_EXT
	const midPointsArr = store.MID_POINTS_POINTY

	let x1 = vertexesPointyArr[side][0]
	let y1 = vertexesPointyArr[side][1]
	let x2 = vertexesPointyArr[(side + 1) % 6][0]
	let y2 = vertexesPointyArr[(side + 1) % 6][1]

	// Now we have line points on the edge of the hex. So give it a halfoffset outwards and half offset inwards
	const angleRadians = (((side + 5) % 6) * 60 * Math.PI) / 180
	const cosAngle = Math.cos(angleRadians)
	const sinAngle = Math.sin(angleRadians)

	const offset = wallWidth * 2
	let x1a = x1 + offset * cosAngle
	let y1a = y1 + offset * sinAngle
	let x2a = x2 + offset * cosAngle
	let y2a = y2 + offset * sinAngle

	// Now make up the points the other side
	let x3b = x1 - offset * cosAngle
	let y3b = y1 - offset * sinAngle
	let x4b = x2 - offset * cosAngle
	let y4b = y2 - offset * sinAngle

	// Return a full shore
	if (bank === 0) return `M ${x1a},${y1a} ${x2a},${y2a} ${x4b},${y4b} ${x3b},${y3b} Z`

	// Now it's a half shore, so get the mid points
	let m1 = midPointsArr[side][0]
	let m2 = midPointsArr[side][1]
	let m1a = m1 + offset * cosAngle
	let m2a = m2 + offset * sinAngle

	if (bank === 1) return `M ${x1a},${y1a} ${m1a},${m2a} Z`
	else return `M  ${x2a},${y2a} ${m1a},${m2a} Z`
}

/**
 * Processes resources in a bucket, grouping by type and sorting by transporter status.
 * @param {Array} resourcesInBucket - Filtered resources for this specific bucket
 * @param {Array} bucketResLocations - Sorted XY coordinates available in this bucket
 * @returns {Array} Array of resource Gfx objects ready for rendering
 */
export function getResourceGfxs(resourcesInBucket, bucketResLocations) {
	const resourceGfxs = []
	if (!resourcesInBucket.length || !bucketResLocations.length) return resourceGfxs

	// 1. Group by resource type
	const groupedByType = {}
	resourcesInBucket.forEach((res) => {
		if (!groupedByType[res.type]) groupedByType[res.type] = []
		groupedByType[res.type].push(res)
	})

	// 2. Track how many resources are assigned to each coordinate slot
	const slotCounts = new Array(bucketResLocations.length).fill(0)
	const resourceTypes = Object.keys(groupedByType)

	// 3. Process each group (Type) one by one
	resourceTypes.forEach((type, typeIndex) => {
		const group = groupedByType[type]

		// 4. Sort within the group: Transporters (ID >= 0) first
		group.sort((a, b) => {
			const aVal = a.movedTransporterID >= 0 ? 1 : 0
			const bVal = b.movedTransporterID >= 0 ? 1 : 0
			return bVal - aVal
		})

		// 5. Determine which slot (coordinate) to use for this TYPE
		let slotIndex
		if (typeIndex < bucketResLocations.length) {
			// Use the next fresh spot
			slotIndex = typeIndex
		} else {
			// Out of spots! Find the slot index with the current minimum count
			slotIndex = slotCounts.indexOf(Math.min(...slotCounts))
		}

		const basePos = bucketResLocations[slotIndex]

		// 6. Assign items in this group to the chosen slot
		group.forEach((res) => {
			// The offset is based on how many items are ALREADY in this slot pile
			const currentOffset = slotCounts[slotIndex]

			resourceGfxs.push({
				id: res.id,
				img: res.gfx,
				type: res.type,
				width: rf.DEFAULT_RES_WIDTH,
				height: rf.DEFAULT_RES_HEIGHT,
				pos: [basePos[0], basePos[1]],
				offsets: currentOffset, // Shift left/down by total pile height
				movedThisTurn: res.movedTransporterID >= 0,
			})

			// Increment count for this slot so the next item (or next type) stacks correctly
			slotCounts[slotIndex]++
		})
	})

	return resourceGfxs
}

export function getCornerTrianglePoints(center, width, height, corner = 0, triangleSize = 0.5) {
	const [x, y] = center
	const halfW = width / 2
	const halfH = height / 2

	// Define the bounding box edges
	const left = x - halfW
	const right = x + halfW
	const top = y - halfH
	const bottom = y + halfH

	// Calculate how far the triangle extends from the corner
	const xSize = halfW * triangleSize
	const ySize = halfH * triangleSize

	// Mapping: Each entry contains [CornerPoint, SidePoint1, SidePoint2]
	const cornerMap = {
		0: [`${left},${top}`, `${left},${top + ySize}`, `${left + xSize},${top}`], // Top Left
		1: [`${right},${top}`, `${right - xSize},${top}`, `${right},${top + ySize}`], // Top Right
		2: [`${left},${bottom}`, `${left},${bottom - ySize}`, `${left + xSize},${bottom}`], // Bottom Left
		3: [`${right},${bottom}`, `${right - xSize},${bottom}`, `${right},${bottom - ySize}`], // Bottom Right
	}

	return (cornerMap[corner] || cornerMap[0]).join(" ")
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

export function resetConflictPreferences() {
	const store = useModelStore()
	store.conflictPreset.conflictDecision = rf.CONFLICT_DECISION_NO_CONFLICT // Default: Option 2 (do not wish)
	store.conflictPreset.prayingDecision = rf.CONFLICT_PRAYING_WAIT_AND_SEE // Default: Last option
	store.conflictPreset.turnOrderDecision = rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE // Default: Last option
	store.conflictPreset.skipWonderPhaseDecision = rf.CONFLICT_SKIP_WONDER_PHASE_WAIT_AND_SEE // Default: Last option
	store.conflictPreset.skipProductionPhaseDecision = rf.CONFLICT_SKIP_PRODUCTION_PHASE_WAIT_AND_SEE // Default: Last option
}
