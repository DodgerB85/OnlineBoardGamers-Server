import * as rf from "./BUSreference.js"

import { useModelStore } from "../stores/BUSstore.js"
import { usePersonalStore } from "../stores/BUSpersonal.js"

export function kickoutTimerTicker() {
	const personal = usePersonalStore()
	if (personal.secondsToNextKickout == undefined || personal.secondsToNextKickout > 1200 || personal.trainingGame) {
		clearInterval(personal.kickoutCountdownIntervalTimer)
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
	// Icons
	if (image === "icon-house") return new URL(`../../../static/BUS/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/BUS/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/BUS/images/icon-rulebook.svg`, import.meta.url).href
	//else if (image === "icon-info") return new URL(`../../../static/BUS/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/BUS/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/BUS/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/BUS/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/BUS/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/BUS/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/BUS/images/icon-replay.svg`, import.meta.url).href
	//else if (image === "icon-hand-card") return new URL(`../../../static/BUS/images/icon-hand-card.svg`, import.meta.url).href
	//else if (image === "icon-cog") return new URL(`../../../static/BUS/images/icon-cog.svg`, import.meta.url).href
	else if (image === "icon-board") return new URL(`../../../static/BUS/images/icon-board.svg`, import.meta.url).href
	// Other imports
	else if (image === "loading-bar-black") return new URL(`../../../static/BUS/images/loading-bar-black.gif`, import.meta.url).href
	//else if (image === "Busbox") return new URL(`../../../static/BUS/images/Busbox.jpg`, import.meta.url).href
	else if (image === "email") return new URL(`../../../static/BUS/images/email.png`, import.meta.url).href
	// Buildings
	if (image === "building1") return new URL(`../../../static/BUS/images/building1.png`, import.meta.url).href
	if (image === "building2") return new URL(`../../../static/BUS/images/building2.png`, import.meta.url).href
	if (image === "building3") return new URL(`../../../static/BUS/images/building3.png`, import.meta.url).href
	if (image === "passenger") return new URL(`../../../static/BUS/images/passenger.png`, import.meta.url).href
	if (image === "jeroen") return new URL(`../../../static/BUS/images/jeroen.png`, import.meta.url).href
	if (image === "joris") return new URL(`../../../static/BUS/images/joris.png`, import.meta.url).href

	if (image === "building1_orig") return new URL(`../../../static/BUS/images/building1_orig.jpg`, import.meta.url).href
	if (image === "building2_orig") return new URL(`../../../static/BUS/images/building2_orig.jpg`, import.meta.url).href
	if (image === "building3_orig") return new URL(`../../../static/BUS/images/building3_orig.jpg`, import.meta.url).href
	if (image === "passenger_orig") return new URL(`../../../static/BUS/images/passenger.png`, import.meta.url).href

	if (image === "bus0") return new URL(`../../../static/BUS/images/bus_blue.png`, import.meta.url).href
	if (image === "bus1") return new URL(`../../../static/BUS/images/bus_green.png`, import.meta.url).href
	if (image === "bus2") return new URL(`../../../static/BUS/images/bus_purple.png`, import.meta.url).href
	if (image === "bus3") return new URL(`../../../static/BUS/images/bus_red.png`, import.meta.url).href
	if (image === "bus4") return new URL(`../../../static/BUS/images/bus_yellow.png`, import.meta.url).href

	if (image === "rightActions") return new URL(`../../../static/BUS/images/rightActions.jpg`, import.meta.url).href
	if (image === "rightActions_orig") return new URL(`../../../static/BUS/images/rightActions_orig.jpg`, import.meta.url).href

	if (image === "stone_blue") return new URL(`../../../static/BUS/images/stone_blue.png`, import.meta.url).href
	if (image === "stone_green") return new URL(`../../../static/BUS/images/stone_green.png`, import.meta.url).href

	if (image === "bus-box-sm") return new URL(`../../../static/BUS/images/bus-box-sm.jpg`, import.meta.url).href
	if (image === "pointer") return new URL(`../../../static/BUS/images/pointer.png`, import.meta.url).href

	if (image === "Board_20A") return new URL(`../../../static/BUS/images/Board_20A.jpg`, import.meta.url).href
	if (image === "Board_orig") return new URL(`../../../static/BUS/images/Board_orig.jpg`, import.meta.url).href
	if (image === "Board_origV2") return new URL(`../../../static/BUS/images/Board_origV2.jpg`, import.meta.url).href
	if (image === "Board_20AC") return new URL(`../../../static/BUS/images/Board_20AC.jpg`, import.meta.url).href
	if (image === "Board_Pitts") return new URL(`../../../static/BUS/images/Board_Pitts.jpg`, import.meta.url).href
}

export function getBuildingPos(junctionID, buildingSlot, outline) {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) {
		// Get pos for actual junctions
		if (buildingSlot === -1) {
			let shift = 0
			if (outline) shift = (store.refSize * -20) / 400
			if (junctionID === 0) return [shift + (store.refSize * 212) / 400, shift + (store.refSize * 315) / 400]
			if (junctionID === 1) return [shift + (store.refSize * 132) / 400, shift + (store.refSize * 899) / 400]
			if (junctionID === 2) return [shift + (store.refSize * 306) / 400, shift + (store.refSize * 1728) / 400]
			if (junctionID === 3) return [shift + (store.refSize * 164) / 400, shift + (store.refSize * 2333) / 400]
			if (junctionID === 4) return [shift + (store.refSize * 345) / 400, shift + (store.refSize * 2830) / 400]
			if (junctionID === 5) return [shift + (store.refSize * 820) / 400, shift + (store.refSize * 293) / 400]
			if (junctionID === 6) return [shift + (store.refSize * 537) / 400, shift + (store.refSize * 569) / 400]
			if (junctionID === 7) return [shift + (store.refSize * 568) / 400, shift + (store.refSize * 1005) / 400]
			if (junctionID === 8) return [shift + (store.refSize * 673) / 400, shift + (store.refSize * 1428) / 400]
			if (junctionID === 9) return [shift + (store.refSize * 811) / 400, shift + (store.refSize * 1903) / 400]
			if (junctionID === 10) return [shift + (store.refSize * 728) / 400, shift + (store.refSize * 2411) / 400]
			if (junctionID === 11) return [shift + (store.refSize * 932) / 400, shift + (store.refSize * 2904) / 400]
			if (junctionID === 12) return [shift + (store.refSize * 1259) / 400, shift + (store.refSize * 506) / 400]
			if (junctionID === 13) return [shift + (store.refSize * 1069) / 400, shift + (store.refSize * 871) / 400]
			if (junctionID === 14) return [shift + (store.refSize * 1090) / 400, shift + (store.refSize * 1586) / 400]
			if (junctionID === 15) return [shift + (store.refSize * 1301) / 400, shift + (store.refSize * 1998) / 400]
			if (junctionID === 16) return [shift + (store.refSize * 1235) / 400, shift + (store.refSize * 2379) / 400]
			if (junctionID === 17) return [shift + (store.refSize * 1286) / 400, shift + (store.refSize * 2817) / 400]
			if (junctionID === 18) return [shift + (store.refSize * 1747) / 400, shift + (store.refSize * 327) / 400]
			if (junctionID === 19) return [shift + (store.refSize * 1709) / 400, shift + (store.refSize * 779) / 400]
			if (junctionID === 20) return [shift + (store.refSize * 1474) / 400, shift + (store.refSize * 1212) / 400]
			if (junctionID === 21) return [shift + (store.refSize * 1793) / 400, shift + (store.refSize * 1671) / 400]
			if (junctionID === 22) return [shift + (store.refSize * 1722) / 400, shift + (store.refSize * 2192) / 400]
			if (junctionID === 23) return [shift + (store.refSize * 1780) / 400, shift + (store.refSize * 2654) / 400]
			if (junctionID === 24) return [shift + (store.refSize * 2205) / 400, shift + (store.refSize * 164) / 400]
			if (junctionID === 25) return [shift + (store.refSize * 2198) / 400, shift + (store.refSize * 556) / 400]
			if (junctionID === 26) return [shift + (store.refSize * 2045) / 400, shift + (store.refSize * 1163) / 400]
			if (junctionID === 27) return [shift + (store.refSize * 2283) / 400, shift + (store.refSize * 1510) / 400]
			if (junctionID === 28) return [shift + (store.refSize * 2134) / 400, shift + (store.refSize * 2238) / 400]
			if (junctionID === 29) return [shift + (store.refSize * 2477) / 400, shift + (store.refSize * 228) / 400]
			if (junctionID === 30) return [shift + (store.refSize * 2679) / 400, shift + (store.refSize * 571) / 400]
			if (junctionID === 31) return [shift + (store.refSize * 2545) / 400, shift + (store.refSize * 1006) / 400]
			if (junctionID === 32) return [shift + (store.refSize * 2695) / 400, shift + (store.refSize * 1435) / 400]
			if (junctionID === 33) return [shift + (store.refSize * 2272) / 400, shift + (store.refSize * 1907) / 400]
			if (junctionID === 34) return [shift + (store.refSize * 2599) / 400, shift + (store.refSize * 2327) / 400]
			if (junctionID === 35) return [shift + (store.refSize * 2198) / 400, shift + (store.refSize * 2751) / 400]

			return [100, 100]
		}

		// Get pos for buildings, or highlight outline
		let shift = 0
		if (outline) shift = (store.refSize * -20) / 400
		if (junctionID === 0) return [shift + (store.refSize * 101) / 400, shift + (store.refSize * 208) / 400]
		if (junctionID === 1) return [shift + (store.refSize * 239) / 400, shift + (store.refSize * 810) / 400]
		if (junctionID === 2 && buildingSlot === 2) return [shift + (store.refSize * 180) / 400, shift + (store.refSize * 1809) / 400]
		if (junctionID === 2 && buildingSlot === 3) return [shift + (store.refSize * 478) / 400, shift + (store.refSize * 1716) / 400]
		if (junctionID === 3) return [shift + (store.refSize * 275) / 400, shift + (store.refSize * 2250) / 400]
		if (junctionID === 4) return [shift + (store.refSize * 251) / 400, shift + (store.refSize * 2948) / 400]
		if (junctionID === 5) return [shift + (store.refSize * 739) / 400, shift + (store.refSize * 162) / 400]
		if (junctionID === 6) return [shift + (store.refSize * 525) / 400, shift + (store.refSize * 415) / 400]
		if (junctionID === 7 && buildingSlot === 2) return [shift + (store.refSize * 468) / 400, shift + (store.refSize * 1094) / 400]
		if (junctionID === 7 && buildingSlot === 3) return [shift + (store.refSize * 657) / 400, shift + (store.refSize * 877) / 400]
		if (junctionID === 8) return [shift + (store.refSize * 643) / 400, shift + (store.refSize * 1579) / 400]
		if (junctionID === 9 && buildingSlot === 1) return [shift + (store.refSize * 781) / 400, shift + (store.refSize * 1766) / 400]
		if (junctionID === 9 && buildingSlot === 3) return [shift + (store.refSize * 691) / 400, shift + (store.refSize * 1983) / 400]
		// 10
		if (junctionID === 11) return [shift + (store.refSize * 784) / 400, shift + (store.refSize * 2810) / 400]
		if (junctionID === 12) return [shift + (store.refSize * 1257) / 400, shift + (store.refSize * 363) / 400]
		if (junctionID === 13) return [shift + (store.refSize * 988) / 400, shift + (store.refSize * 1017) / 400]
		if (junctionID === 14 && buildingSlot === 0) return [shift + (store.refSize * 980) / 400, shift + (store.refSize * 1456) / 400]
		if (junctionID === 14 && buildingSlot === 1) return [shift + (store.refSize * 1067) / 400, shift + (store.refSize * 1760) / 400]
		if (junctionID === 15 && buildingSlot === 0) return [shift + (store.refSize * 1168) / 400, shift + (store.refSize * 2044) / 400]
		if (junctionID === 15 && buildingSlot === 1) return [shift + (store.refSize * 1387) / 400, shift + (store.refSize * 2102) / 400]
		if (junctionID === 16 && buildingSlot === 1) return [shift + (store.refSize * 1139) / 400, shift + (store.refSize * 2500) / 400]
		if (junctionID === 16 && buildingSlot === 3) return [shift + (store.refSize * 1326) / 400, shift + (store.refSize * 2515) / 400]
		if (junctionID === 17) return [shift + (store.refSize * 1385) / 400, shift + (store.refSize * 2934) / 400]
		if (junctionID === 18) return [shift + (store.refSize * 1639) / 400, shift + (store.refSize * 486) / 400]
		if (junctionID === 19 && buildingSlot === 1) return [shift + (store.refSize * 1572) / 400, shift + (store.refSize * 818) / 400]
		if (junctionID === 19 && buildingSlot === 3) return [shift + (store.refSize * 1680) / 400, shift + (store.refSize * 630) / 400]
		if (junctionID === 20 && buildingSlot === 0) return [shift + (store.refSize * 1334) / 400, shift + (store.refSize * 1217) / 400]
		if (junctionID === 20 && buildingSlot === 1) return [shift + (store.refSize * 1624) / 400, shift + (store.refSize * 1217) / 400]
		if (junctionID === 21 && buildingSlot === 0) return [shift + (store.refSize * 1776) / 400, shift + (store.refSize * 1486) / 400]
		if (junctionID === 21 && buildingSlot === 1) return [shift + (store.refSize * 1874) / 400, shift + (store.refSize * 1829) / 400]
		if (junctionID === 22 && buildingSlot === 2) return [shift + (store.refSize * 1841) / 400, shift + (store.refSize * 2314) / 400]
		if (junctionID === 22 && buildingSlot === 3) return [shift + (store.refSize * 1604) / 400, shift + (store.refSize * 2097) / 400]
		if (junctionID === 23) return [shift + (store.refSize * 1775) / 400, shift + (store.refSize * 2828) / 400]
		if (junctionID === 24) return [shift + (store.refSize * 2338) / 400, shift + (store.refSize * 169) / 400]
		// 25
		if (junctionID === 26 && buildingSlot === 1) return [shift + (store.refSize * 1918) / 400, shift + (store.refSize * 1176) / 400]
		if (junctionID === 26 && buildingSlot === 3) return [shift + (store.refSize * 2005) / 400, shift + (store.refSize * 990) / 400]
		if (junctionID === 27 && buildingSlot === 2) return [shift + (store.refSize * 2215) / 400, shift + (store.refSize * 1652) / 400]
		if (junctionID === 27 && buildingSlot === 3) return [shift + (store.refSize * 2127) / 400, shift + (store.refSize * 1469) / 400]
		if (junctionID === 28) return [shift + (store.refSize * 2280) / 400, shift + (store.refSize * 2264) / 400]
		if (junctionID === 29) return [shift + (store.refSize * 2609) / 400, shift + (store.refSize * 217) / 400]
		if (junctionID === 30) return [shift + (store.refSize * 2539) / 400, shift + (store.refSize * 690) / 400]
		if (junctionID === 31 && buildingSlot === 2) return [shift + (store.refSize * 2675) / 400, shift + (store.refSize * 1022) / 400]
		if (junctionID === 31 && buildingSlot === 3) return [shift + (store.refSize * 2480) / 400, shift + (store.refSize * 1156) / 400]
		if (junctionID === 32) return [shift + (store.refSize * 2729) / 400, shift + (store.refSize * 1608) / 400]
		if (junctionID === 33) return [shift + (store.refSize * 2114) / 400, shift + (store.refSize * 1957) / 400]
		if (junctionID === 34) return [shift + (store.refSize * 2677) / 400, shift + (store.refSize * 2457) / 400]
		if (junctionID === 35) return [shift + (store.refSize * 2078) / 400, shift + (store.refSize * 2621) / 400]
	}

	// USING PITTSBURGH BOARD
	else if (personal.selectedBoard === rf.BOARD_PITTS) {
		// Get pos for actual junctions
		if (buildingSlot === -1) {
			let shift = 0
			if (outline) shift = (store.refSize * -22) / 400
			if (junctionID === 0) return [shift + (store.refSize * 223) / 400, shift + (store.refSize * 600) / 400]
			if (junctionID === 1) return [shift + (store.refSize * 185) / 400, shift + (store.refSize * 1120) / 400]
			if (junctionID === 2) return [shift + (store.refSize * 421) / 400, shift + (store.refSize * 1480) / 400]
			if (junctionID === 3) return [shift + (store.refSize * 566) / 400, shift + (store.refSize * 1710) / 400]
			if (junctionID === 4) return [shift + (store.refSize * 206) / 400, shift + (store.refSize * 2087) / 400]
			if (junctionID === 5) return [shift + (store.refSize * 482) / 400, shift + (store.refSize * 2580) / 400]
			if (junctionID === 6) return [shift + (store.refSize * 796) / 400, shift + (store.refSize * 357) / 400]
			if (junctionID === 7) return [shift + (store.refSize * 652) / 400, shift + (store.refSize * 817) / 400]
			if (junctionID === 8) return [shift + (store.refSize * 809) / 400, shift + (store.refSize * 1167) / 400]
			if (junctionID === 9) return [shift + (store.refSize * 982) / 400, shift + (store.refSize * 1443) / 400]
			if (junctionID === 10) return [shift + (store.refSize * 936) / 400, shift + (store.refSize * 1973) / 400]

			if (junctionID === 11) return [shift + (store.refSize * 669) / 400, shift + (store.refSize * 2107) / 400]
			if (junctionID === 12) return [shift + (store.refSize * 929) / 400, shift + (store.refSize * 2477) / 400]
			if (junctionID === 13) return [shift + (store.refSize * 942) / 400, shift + (store.refSize * 2933) / 400]
			if (junctionID === 14) return [shift + (store.refSize * 996) / 400, shift + (store.refSize * 780) / 400]
			if (junctionID === 15) return [shift + (store.refSize * 986) / 400, shift + (store.refSize * 263) / 400]
			if (junctionID === 16) return [shift + (store.refSize * 1306) / 400, shift + (store.refSize * 623) / 400]
			if (junctionID === 17) return [shift + (store.refSize * 1149) / 400, shift + (store.refSize * 790) / 400]
			if (junctionID === 18) return [shift + (store.refSize * 1366) / 400, shift + (store.refSize * 1243) / 400]
			if (junctionID === 19) return [shift + (store.refSize * 1332) / 400, shift + (store.refSize * 1727) / 400]
			if (junctionID === 20) return [shift + (store.refSize * 1356) / 400, shift + (store.refSize * 2177) / 400]
			if (junctionID === 21) return [shift + (store.refSize * 1379) / 400, shift + (store.refSize * 2657) / 400]
			if (junctionID === 22) return [shift + (store.refSize * 1349) / 400, shift + (store.refSize * 3120) / 400]
			if (junctionID === 23) return [shift + (store.refSize * 1426) / 400, shift + (store.refSize * 83) / 400]
			if (junctionID === 24) return [shift + (store.refSize * 1529) / 400, shift + (store.refSize * 1057) / 400]
			if (junctionID === 25) return [shift + (store.refSize * 1502) / 400, shift + (store.refSize * 1557) / 400]
			if (junctionID === 26) return [shift + (store.refSize * 1889) / 400, shift + (store.refSize * 1833) / 400]
			if (junctionID === 27) return [shift + (store.refSize * 1892) / 400, shift + (store.refSize * 2163) / 400]
			if (junctionID === 28) return [shift + (store.refSize * 1876) / 400, shift + (store.refSize * 2590) / 400]
			if (junctionID === 29) return [shift + (store.refSize * 1876) / 400, shift + (store.refSize * 3020) / 400]
			if (junctionID === 30) return [shift + (store.refSize * 1990) / 400, shift + (store.refSize * 97) / 400]
			if (junctionID === 31) return [shift + (store.refSize * 1779) / 400, shift + (store.refSize * 523) / 400]
			if (junctionID === 32) return [shift + (store.refSize * 1959) / 400, shift + (store.refSize * 940) / 400]
			if (junctionID === 33) return [shift + (store.refSize * 1932) / 400, shift + (store.refSize * 1407) / 400]
			if (junctionID === 34) return [shift + (store.refSize * 2298) / 400, shift + (store.refSize * 470) / 400]
			if (junctionID === 35) return [shift + (store.refSize * 2393) / 400, shift + (store.refSize * 1440) / 400]
			if (junctionID === 36) return [shift + (store.refSize * 2305) / 400, shift + (store.refSize * 1957) / 400]
			if (junctionID === 37) return [shift + (store.refSize * 2288) / 400, shift + (store.refSize * 2270) / 400]

			return [100, 100]
		}

		// Get pos for buildings, or highlight outline
		let shift = 0
		if (outline) shift = (store.refSize * -22) / 400
		if (junctionID === 0) return [shift + (store.refSize * 95) / 400, shift + (store.refSize * 567) / 400]
		if (junctionID === 1) return [shift + (store.refSize * 74) / 400, shift + (store.refSize * 1190) / 400]
		if (junctionID === 2) return [shift + (store.refSize * 434) / 400, shift + (store.refSize * 1330) / 400]
		if (junctionID === 3 && buildingSlot === 0) return [shift + (store.refSize * 564) / 400, shift + (store.refSize * 1853) / 400]
		if (junctionID === 3 && buildingSlot === 4) return [shift + (store.refSize * 434) / 400, shift + (store.refSize * 1703) / 400]
		if (junctionID === 4 && buildingSlot === 2) return [shift + (store.refSize * 430) / 400, shift + (store.refSize * 1991) / 400]
		if (junctionID === 4 && buildingSlot === 4) return [shift + (store.refSize * 64) / 400, shift + (store.refSize * 2058) / 400]
		// 5
		if (junctionID === 6) return [shift + (store.refSize * 708) / 400, shift + (store.refSize * 260) / 400]
		if (junctionID === 7 && buildingSlot === 2) return [shift + (store.refSize * 582) / 400, shift + (store.refSize * 657) / 400]
		if (junctionID === 7 && buildingSlot === 3) return [shift + (store.refSize * 448) / 400, shift + (store.refSize * 820) / 400]
		if (junctionID === 8 && buildingSlot === 0) return [shift + (store.refSize * 670) / 400, shift + (store.refSize * 1150) / 400]
		if (junctionID === 8 && buildingSlot === 3) return [shift + (store.refSize * 802) / 400, shift + (store.refSize * 947) / 400]
		if (junctionID === 9 && buildingSlot === 0) return [shift + (store.refSize * 835) / 400, shift + (store.refSize * 1643) / 400]
		if (junctionID === 9 && buildingSlot === 1) return [shift + (store.refSize * 835) / 400, shift + (store.refSize * 1403) / 400]
		if (junctionID === 10 && buildingSlot === 0) return [shift + (store.refSize * 797) / 400, shift + (store.refSize * 2033) / 400]
		if (junctionID === 10 && buildingSlot === 1) return [shift + (store.refSize * 1040) / 400, shift + (store.refSize * 1883) / 400]
		if (junctionID === 11) return [shift + (store.refSize * 531) / 400, shift + (store.refSize * 2187) / 400]
		if (junctionID === 12) return [shift + (store.refSize * 775) / 400, shift + (store.refSize * 2413) / 400]
		if (junctionID === 13) return [shift + (store.refSize * 872) / 400, shift + (store.refSize * 3040) / 400]
		if (junctionID === 14 && buildingSlot === 0) return [shift + (store.refSize * 852) / 400, shift + (store.refSize * 793) / 400]
		if (junctionID === 14 && buildingSlot === 2) return [shift + (store.refSize * 989) / 400, shift + (store.refSize * 513) / 400]
		if (junctionID === 15) return  [shift + (store.refSize * 1158) / 400, shift + (store.refSize * 290) / 400]
		if (junctionID === 16 && buildingSlot === 2) return [shift + (store.refSize * 1449) / 400, shift + (store.refSize * 490) / 400]
		if (junctionID === 16 && buildingSlot === 3) return [shift + (store.refSize * 1469) / 400, shift + (store.refSize * 690) / 400]
		// CORRECT UP TO HERE
		if (junctionID === 18 && buildingSlot === 0) return [shift + (store.refSize * 1262) / 400, shift + (store.refSize * 1387) / 400]
		if (junctionID === 18 && buildingSlot === 2) return [shift + (store.refSize * 1174) / 400, shift + (store.refSize * 1207) / 400]
		if (junctionID === 19 && buildingSlot === 0) return [shift + (store.refSize * 1225) / 400, shift + (store.refSize * 1814) / 400]
		if (junctionID === 19 && buildingSlot === 1) return [shift + (store.refSize * 1249) / 400, shift + (store.refSize * 1547) / 400]
		if (junctionID === 20 && buildingSlot === 0) return [shift + (store.refSize * 1249) / 400, shift + (store.refSize * 2271) / 400]
		if (junctionID === 20 && buildingSlot === 1) return [shift + (store.refSize * 1489) / 400, shift + (store.refSize * 2057) / 400]
		if (junctionID === 21 && buildingSlot === 2) return [shift + (store.refSize * 1488) / 400, shift + (store.refSize * 2750) / 400]
		if (junctionID === 21 && buildingSlot === 3) return [shift + (store.refSize * 1261) / 400, shift + (store.refSize * 2723) / 400]
		if (junctionID === 22) return [shift + (store.refSize * 1265) / 400, shift + (store.refSize * 2963) / 400]
		if (junctionID === 23) return [shift + (store.refSize * 1481) / 400, shift + (store.refSize * 300) / 400]
		if (junctionID === 24 && buildingSlot === 0) return [shift + (store.refSize * 1615) / 400, shift + (store.refSize * 937) / 400]
		if (junctionID === 24 && buildingSlot === 2) return [shift + (store.refSize * 1645) / 400, shift + (store.refSize * 1150) / 400]
		if (junctionID === 25 && buildingSlot === 0) return [shift + (store.refSize * 1618) / 400, shift + (store.refSize * 1387) / 400]
		if (junctionID === 25 && buildingSlot === 2) return [shift + (store.refSize * 1698) / 400, shift + (store.refSize * 1577) / 400]
		if (junctionID === 26 && buildingSlot === 2) return [shift + (store.refSize * 2005) / 400, shift + (store.refSize * 1753) / 400]
		if (junctionID === 26 && buildingSlot === 3) return [shift + (store.refSize * 1751) / 400, shift + (store.refSize * 1873) / 400]
		if (junctionID === 27) return [shift + (store.refSize * 2005) / 400, shift + (store.refSize * 2058) / 400]
		if (junctionID === 28 && buildingSlot === 2) return [shift + (store.refSize * 1769) / 400, shift + (store.refSize * 2491) / 400]
		if (junctionID === 28 && buildingSlot === 4) return [shift + (store.refSize * 1992) / 400, shift + (store.refSize * 2658) / 400]
		if (junctionID === 29) return [shift + (store.refSize * 2019) / 400, shift + (store.refSize * 3025) / 400]
		// 30
		if (junctionID === 31 && buildingSlot === 0) return [shift + (store.refSize * 1932) / 400, shift + (store.refSize * 607) / 400]
		if (junctionID === 31 && buildingSlot === 2) return [shift + (store.refSize * 1762) / 400, shift + (store.refSize * 340) / 400]
		if (junctionID === 32) return [shift + (store.refSize * 2109) / 400, shift + (store.refSize * 930) / 400]
		if (junctionID === 33 && buildingSlot === 0) return [shift + (store.refSize * 2059) / 400, shift + (store.refSize * 1317) / 400]
		if (junctionID === 33 && buildingSlot === 3) return [shift + (store.refSize * 2032) / 400, shift + (store.refSize * 1523) / 400]
		if (junctionID === 34) return [shift + (store.refSize * 2125) / 400, shift + (store.refSize * 387) / 400]
		if (junctionID === 35) return [shift + (store.refSize * 2272) / 400, shift + (store.refSize * 1543) / 400]
		if (junctionID === 36) return [shift + (store.refSize * 2439) / 400, shift + (store.refSize * 1974) / 400]
		if (junctionID === 37) return [shift + (store.refSize * 2359) / 400, shift + (store.refSize * 2394) / 400]

		return [0, 0]
	}

	// USING ORIGINAL BOARD
	else if (personal.selectedBoard === rf.BOARD_OG) {
		// Get pos for actual junctions
		if (buildingSlot === -1) {
			let shift = 0
			if (outline) shift = (store.refSize * -15) / 400
			if (junctionID === 0) return [shift + (store.refSize * 196) / 400, shift + (store.refSize * 2783) / 400]
			if (junctionID === 1) return [shift + (store.refSize * 778) / 400, shift + (store.refSize * 2884) / 400]
			if (junctionID === 2) return [shift + (store.refSize * 1567) / 400, shift + (store.refSize * 2718) / 400]
			if (junctionID === 3) return [shift + (store.refSize * 2154) / 400, shift + (store.refSize * 2859) / 400]
			if (junctionID === 4) return [shift + (store.refSize * 2591) / 400, shift + (store.refSize * 2793) / 400]
			if (junctionID === 5) return [shift + (store.refSize * 209) / 400, shift + (store.refSize * 2112) / 400]
			if (junctionID === 6) return [shift + (store.refSize * 507) / 400, shift + (store.refSize * 2463) / 400]
			if (junctionID === 7) return [shift + (store.refSize * 854) / 400, shift + (store.refSize * 2374) / 400]
			if (junctionID === 8) return [shift + (store.refSize * 1307) / 400, shift + (store.refSize * 2316) / 400]
			if (junctionID === 9) return [shift + (store.refSize * 1771) / 400, shift + (store.refSize * 2161) / 400]
			if (junctionID === 10) return [shift + (store.refSize * 2187) / 400, shift + (store.refSize * 2327) / 400]
			if (junctionID === 11) return [shift + (store.refSize * 2686) / 400, shift + (store.refSize * 2144) / 400]
			if (junctionID === 12) return [shift + (store.refSize * 438) / 400, shift + (store.refSize * 1648) / 400]
			if (junctionID === 13) return [shift + (store.refSize * 747) / 400, shift + (store.refSize * 1911) / 400]
			if (junctionID === 14) return [shift + (store.refSize * 1496) / 400, shift + (store.refSize * 1898) / 400]
			if (junctionID === 15) return [shift + (store.refSize * 1844) / 400, shift + (store.refSize * 1719) / 400]
			if (junctionID === 16) return [shift + (store.refSize * 2195) / 400, shift + (store.refSize * 1760) / 400]
			if (junctionID === 17) return [shift + (store.refSize * 2576) / 400, shift + (store.refSize * 1728) / 400]
			if (junctionID === 18) return [shift + (store.refSize * 258) / 400, shift + (store.refSize * 1124) / 400]
			if (junctionID === 19) return [shift + (store.refSize * 738) / 400, shift + (store.refSize * 1218) / 400]
			if (junctionID === 20) return [shift + (store.refSize * 1094) / 400, shift + (store.refSize * 1462) / 400]
			if (junctionID === 21) return [shift + (store.refSize * 1543) / 400, shift + (store.refSize * 1144) / 400]
			if (junctionID === 22) return [shift + (store.refSize * 2049) / 400, shift + (store.refSize * 1248) / 400]
			if (junctionID === 23) return [shift + (store.refSize * 2464) / 400, shift + (store.refSize * 1192) / 400]
			if (junctionID === 24) return [shift + (store.refSize * 150) / 400, shift + (store.refSize * 655) / 400]
			if (junctionID === 25) return [shift + (store.refSize * 532) / 400, shift + (store.refSize * 680) / 400]
			if (junctionID === 26) return [shift + (store.refSize * 1062) / 400, shift + (store.refSize * 836) / 400]
			if (junctionID === 27) return [shift + (store.refSize * 1420) / 400, shift + (store.refSize * 621) / 400]
			if (junctionID === 28) return [shift + (store.refSize * 2072) / 400, shift + (store.refSize * 795) / 400]
			if (junctionID === 29) return [shift + (store.refSize * 194) / 400, shift + (store.refSize * 353) / 400]
			if (junctionID === 30) return [shift + (store.refSize * 536) / 400, shift + (store.refSize * 139) / 400]
			if (junctionID === 31) return [shift + (store.refSize * 925) / 400, shift + (store.refSize * 317) / 400]
			if (junctionID === 32) return [shift + (store.refSize * 1367) / 400, shift + (store.refSize * 179) / 400]
			if (junctionID === 33) return [shift + (store.refSize * 1787) / 400, shift + (store.refSize * 630) / 400]
			if (junctionID === 34) return [shift + (store.refSize * 2234) / 400, shift + (store.refSize * 314) / 400]
			if (junctionID === 35) return [shift + (store.refSize * 2575) / 400, shift + (store.refSize * 752) / 400]

			return [100, 100]
		}

		// Get pos for buildings, or highlight outline
		let shift = 0
		if (outline) shift = (store.refSize * -12) / 400
		if (junctionID === 0) return [shift + (store.refSize * 249) / 400, shift + (store.refSize * 2913) / 400, -10]
		if (junctionID === 1) return [shift + (store.refSize * 846) / 400, shift + (store.refSize * 2986) / 400, 10]
		if (junctionID === 2 && buildingSlot === 2) return [shift + (store.refSize * 1640) / 400, shift + (store.refSize * 2836) / 400, -15]
		if (junctionID === 2 && buildingSlot === 3) return [shift + (store.refSize * 1482) / 400, shift + (store.refSize * 2838) / 400, 14]
		if (junctionID === 3) return [shift + (store.refSize * 2242) / 400, shift + (store.refSize * 2950) / 400, 14]
		if (junctionID === 4) return [shift + (store.refSize * 2706) / 400, shift + (store.refSize * 2710) / 400, -13]
		if (junctionID === 5) return [shift + (store.refSize * 360) / 400, shift + (store.refSize * 2164) / 400, 42]
		if (junctionID === 6) return [shift + (store.refSize * 398) / 400, shift + (store.refSize * 2479) / 400, 42]
		if (junctionID === 7 && buildingSlot === 2) return [shift + (store.refSize * 964) / 400, shift + (store.refSize * 2475) / 400, -16]
		if (junctionID === 7 && buildingSlot === 3) return [shift + (store.refSize * 776) / 400, shift + (store.refSize * 2490) / 400, 15]
		if (junctionID === 8) return [shift + (store.refSize * 1282) / 400, shift + (store.refSize * 2461) / 400, -40]
		if (junctionID === 9 && buildingSlot === 1) return [shift + (store.refSize * 1648) / 400, shift + (store.refSize * 2203) / 400, -37]
		if (junctionID === 9 && buildingSlot === 3) return [shift + (store.refSize * 1821) / 400, shift + (store.refSize * 2293) / 400, -18]
		// 10
		if (junctionID === 11) return [shift + (store.refSize * 2601) / 400, shift + (store.refSize * 2289) / 400, 45]
		if (junctionID === 12) return [shift + (store.refSize * 316) / 400, shift + (store.refSize * 1690) / 400, -28]
		if (junctionID === 13) return [shift + (store.refSize * 862) / 400, shift + (store.refSize * 2004) / 400, 18]
		if (junctionID === 14 && buildingSlot === 0) return [shift + (store.refSize * 1516) / 400, shift + (store.refSize * 1783) / 400, 43]
		if (junctionID === 14 && buildingSlot === 1) return [shift + (store.refSize * 1645) / 400, shift + (store.refSize * 1923) / 400, 25]
		if (junctionID === 15 && buildingSlot === 0) return [shift + (store.refSize * 1732) / 400, shift + (store.refSize * 1681) / 400, 28]
		if (junctionID === 15 && buildingSlot === 1) return [shift + (store.refSize * 1951) / 400, shift + (store.refSize * 1632) / 400, -8]
		if (junctionID === 16 && buildingSlot === 1) return [shift + (store.refSize * 2320) / 400, shift + (store.refSize * 1851) / 400, 0]
		if (junctionID === 16 && buildingSlot === 3) return [shift + (store.refSize * 2398) / 400, shift + (store.refSize * 1662) / 400, 0]
		if (junctionID === 17) return [shift + (store.refSize * 2658) / 400, shift + (store.refSize * 1846) / 400, -35]
		if (junctionID === 18) return [shift + (store.refSize * 243) / 400, shift + (store.refSize * 1246) / 400, 17]
		if (junctionID === 19 && buildingSlot === 1) return [shift + (store.refSize * 743) / 400, shift + (store.refSize * 1353) / 400, -35]
		if (junctionID === 19 && buildingSlot === 3) return [shift + (store.refSize * 624) / 400, shift + (store.refSize * 1228) / 400, -35]
		if (junctionID === 20 && buildingSlot === 0) return [shift + (store.refSize * 1140) / 400, shift + (store.refSize * 1346) / 400, 37]
		if (junctionID === 20 && buildingSlot === 1) return [shift + (store.refSize * 1245) / 400, shift + (store.refSize * 1462) / 400, 37]
		if (junctionID === 21 && buildingSlot === 0) return [shift + (store.refSize * 1532) / 400, shift + (store.refSize * 1282) / 400, 30]
		if (junctionID === 21 && buildingSlot === 1) return [shift + (store.refSize * 1722) / 400, shift + (store.refSize * 1269) / 400, -12]
		if (junctionID === 22 && buildingSlot === 2) return [shift + (store.refSize * 2161) / 400, shift + (store.refSize * 1148) / 400, -7]
		if (junctionID === 22 && buildingSlot === 3) return [shift + (store.refSize * 2176) / 400, shift + (store.refSize * 1322) / 400, 5]
		if (junctionID === 23) return [shift + (store.refSize * 2597) / 400, shift + (store.refSize * 1152) / 400, -17]
		if (junctionID === 24) return [shift + (store.refSize * 206) / 400, shift + (store.refSize * 568) / 400, -8]
		// 25
		if (junctionID === 26 && buildingSlot === 1) return [shift + (store.refSize * 933) / 400, shift + (store.refSize * 718) / 400, -18]
		if (junctionID === 26 && buildingSlot === 3) return [shift + (store.refSize * 887) / 400, shift + (store.refSize * 897) / 400, -18]
		if (junctionID === 27 && buildingSlot === 2) return [shift + (store.refSize * 1527) / 400, shift + (store.refSize * 522) / 400, 12]
		if (junctionID === 27 && buildingSlot === 3) return [shift + (store.refSize * 1548) / 400, shift + (store.refSize * 671) / 400, 12]
		if (junctionID === 28) return [shift + (store.refSize * 2196) / 400, shift + (store.refSize * 718) / 400, 1]
		if (junctionID === 29) return [shift + (store.refSize * 338) / 400, shift + (store.refSize * 379) / 400, 44]
		if (junctionID === 30) return [shift + (store.refSize * 670) / 400, shift + (store.refSize * 73) / 400, -26]
		if (junctionID === 31 && buildingSlot === 2) return [shift + (store.refSize * 1017) / 400, shift + (store.refSize * 207) / 400, 14]
		if (junctionID === 31 && buildingSlot === 3) return [shift + (store.refSize * 1056) / 400, shift + (store.refSize * 387) / 400, 10]
		if (junctionID === 32) return [shift + (store.refSize * 1515) / 400, shift + (store.refSize * 191) / 400, 43]
		if (junctionID === 33) return [shift + (store.refSize * 1838) / 400, shift + (store.refSize * 755) / 400, -27]
		if (junctionID === 34) return [shift + (store.refSize * 2131) / 400, shift + (store.refSize * 277) / 400, 35]
		if (junctionID === 35) return [shift + (store.refSize * 2642) / 400, shift + (store.refSize * 647) / 400, 40]
	} else if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) {
		// Get pos for actual junctions
		if (buildingSlot === -1) {
			let shift = 0
			if (outline) shift = (store.refSize * -20) / 400
			if (junctionID === 0) return [shift + (store.refSize * 299) / 400, shift + (store.refSize * 474) / 400]
			if (junctionID === 1) return [shift + (store.refSize * 203) / 400, shift + (store.refSize * 1033) / 400]
			if (junctionID === 2) return [shift + (store.refSize * 358) / 400, shift + (store.refSize * 1808) / 400]
			if (junctionID === 3) return [shift + (store.refSize * 205) / 400, shift + (store.refSize * 2375) / 400]
			if (junctionID === 4) return [shift + (store.refSize * 345) / 400, shift + (store.refSize * 2833) / 400]
			if (junctionID === 5) return [shift + (store.refSize * 895) / 400, shift + (store.refSize * 490) / 400]
			if (junctionID === 6) return [shift + (store.refSize * 585) / 400, shift + (store.refSize * 767) / 400]
			if (junctionID === 7) return [shift + (store.refSize * 668) / 400, shift + (store.refSize * 1150) / 400]
			if (junctionID === 8) return [shift + (store.refSize * 697) / 400, shift + (store.refSize * 1536) / 400]
			if (junctionID === 9) return [shift + (store.refSize * 843) / 400, shift + (store.refSize * 1992) / 400]
			if (junctionID === 10) return [shift + (store.refSize * 696) / 400, shift + (store.refSize * 2409) / 400]
			if (junctionID === 11) return [shift + (store.refSize * 866) / 400, shift + (store.refSize * 2921) / 400]
			if (junctionID === 12) return [shift + (store.refSize * 1297) / 400, shift + (store.refSize * 711) / 400]
			if (junctionID === 13) return [shift + (store.refSize * 1067) / 400, shift + (store.refSize * 1016) / 400]
			if (junctionID === 14) return [shift + (store.refSize * 1085) / 400, shift + (store.refSize * 1740) / 400]
			if (junctionID === 15) return [shift + (store.refSize * 1266) / 400, shift + (store.refSize * 2069) / 400]
			if (junctionID === 16) return [shift + (store.refSize * 1222) / 400, shift + (store.refSize * 2424) / 400]
			if (junctionID === 17) return [shift + (store.refSize * 1223) / 400, shift + (store.refSize * 2834) / 400]
			if (junctionID === 18) return [shift + (store.refSize * 1737) / 400, shift + (store.refSize * 560) / 400]
			if (junctionID === 19) return [shift + (store.refSize * 1661) / 400, shift + (store.refSize * 996) / 400]
			if (junctionID === 20) return [shift + (store.refSize * 1454) / 400, shift + (store.refSize * 1357) / 400]
			if (junctionID === 21) return [shift + (store.refSize * 1725) / 400, shift + (store.refSize * 1780) / 400]
			if (junctionID === 22) return [shift + (store.refSize * 1650) / 400, shift + (store.refSize * 2284) / 400]
			if (junctionID === 23) return [shift + (store.refSize * 1678) / 400, shift + (store.refSize * 2704) / 400]
			if (junctionID === 24) return [shift + (store.refSize * 2171) / 400, shift + (store.refSize * 424) / 400]
			if (junctionID === 25) return [shift + (store.refSize * 2143) / 400, shift + (store.refSize * 786) / 400]
			if (junctionID === 26) return [shift + (store.refSize * 2006) / 400, shift + (store.refSize * 1327) / 400]
			if (junctionID === 27) return [shift + (store.refSize * 2172) / 400, shift + (store.refSize * 1697) / 400]
			if (junctionID === 28) return [shift + (store.refSize * 2034) / 400, shift + (store.refSize * 2330) / 400]
			if (junctionID === 29) return [shift + (store.refSize * 2425) / 400, shift + (store.refSize * 484) / 400]
			if (junctionID === 30) return [shift + (store.refSize * 2616) / 400, shift + (store.refSize * 814) / 400]
			if (junctionID === 31) return [shift + (store.refSize * 2454) / 400, shift + (store.refSize * 1193) / 400]
			if (junctionID === 32) return [shift + (store.refSize * 2561) / 400, shift + (store.refSize * 1619) / 400]
			if (junctionID === 33) return [shift + (store.refSize * 2177) / 400, shift + (store.refSize * 2037) / 400]
			if (junctionID === 34) return [shift + (store.refSize * 2476) / 400, shift + (store.refSize * 2443) / 400]
			if (junctionID === 35) return [shift + (store.refSize * 2080) / 400, shift + (store.refSize * 2816) / 400]

			return [100, 100]
		}

		// Get pos for buildings, or highlight outline
		let shift = 0
		if (outline) shift = (store.refSize * -20) / 400
		if (junctionID === 0) return [shift + (store.refSize * 234) / 400, shift + (store.refSize * 398) / 400]
		if (junctionID === 1) return [shift + (store.refSize * 335) / 400, shift + (store.refSize * 959) / 400]
		if (junctionID === 2 && buildingSlot === 2) return [shift + (store.refSize * 243) / 400, shift + (store.refSize * 1879) / 400]
		if (junctionID === 2 && buildingSlot === 3) return [shift + (store.refSize * 247) / 400, shift + (store.refSize * 1741) / 400]
		if (junctionID === 3) return [shift + (store.refSize * 351) / 400, shift + (store.refSize * 2288) / 400]
		if (junctionID === 4) return [shift + (store.refSize * 284) / 400, shift + (store.refSize * 2935) / 400]
		if (junctionID === 5) return [shift + (store.refSize * 905) / 400, shift + (store.refSize * 380) / 400]
		if (junctionID === 6) return [shift + (store.refSize * 589) / 400, shift + (store.refSize * 629) / 400]
		if (junctionID === 7 && buildingSlot === 2) return [shift + (store.refSize * 578) / 400, shift + (store.refSize * 1251) / 400]
		if (junctionID === 7 && buildingSlot === 3) return [shift + (store.refSize * 754) / 400, shift + (store.refSize * 1026) / 400]
		if (junctionID === 8) return [shift + (store.refSize * 564) / 400, shift + (store.refSize * 1545) / 400]
		if (junctionID === 9 && buildingSlot === 1) return [shift + (store.refSize * 828) / 400, shift + (store.refSize * 1873) / 400]
		if (junctionID === 9 && buildingSlot === 3) return [shift + (store.refSize * 722) / 400, shift + (store.refSize * 2061) / 400]
		// 10
		if (junctionID === 11) return [shift + (store.refSize * 730) / 400, shift + (store.refSize * 2804) / 400]
		if (junctionID === 12) return [shift + (store.refSize * 1300) / 400, shift + (store.refSize * 594) / 400]
		if (junctionID === 13) return [shift + (store.refSize * 979) / 400, shift + (store.refSize * 1182) / 400]
		if (junctionID === 14 && buildingSlot === 0) return [shift + (store.refSize * 991) / 400, shift + (store.refSize * 1583) / 400]
		if (junctionID === 14 && buildingSlot === 1) return [shift + (store.refSize * 1073) / 400, shift + (store.refSize * 1931) / 400]
		if (junctionID === 15 && buildingSlot === 0) return [shift + (store.refSize * 1155) / 400, shift + (store.refSize * 2170) / 400]
		if (junctionID === 15 && buildingSlot === 1) return [shift + (store.refSize * 1390) / 400, shift + (store.refSize * 2164) / 400]
		if (junctionID === 16 && buildingSlot === 1) return [shift + (store.refSize * 1116) / 400, shift + (store.refSize * 2539) / 400]
		if (junctionID === 16 && buildingSlot === 3) return [shift + (store.refSize * 1315) / 400, shift + (store.refSize * 2614) / 400]
		if (junctionID === 17) return [shift + (store.refSize * 1318) / 400, shift + (store.refSize * 2948) / 400]
		if (junctionID === 18) return [shift + (store.refSize * 1730) / 400, shift + (store.refSize * 455) / 400]
		if (junctionID === 19 && buildingSlot === 1) return [shift + (store.refSize * 1541) / 400, shift + (store.refSize * 1031) / 400]
		if (junctionID === 19 && buildingSlot === 3) return [shift + (store.refSize * 1681) / 400, shift + (store.refSize * 878) / 400]
		if (junctionID === 20 && buildingSlot === 0) return [shift + (store.refSize * 1307) / 400, shift + (store.refSize * 1376) / 400]
		if (junctionID === 20 && buildingSlot === 1) return [shift + (store.refSize * 1611) / 400, shift + (store.refSize * 1364) / 400]
		if (junctionID === 21 && buildingSlot === 0) return [shift + (store.refSize * 1729) / 400, shift + (store.refSize * 1597) / 400]
		if (junctionID === 21 && buildingSlot === 1) return [shift + (store.refSize * 1807) / 400, shift + (store.refSize * 1955) / 400]
		if (junctionID === 22 && buildingSlot === 2) return [shift + (store.refSize * 1771) / 400, shift + (store.refSize * 2413) / 400]
		if (junctionID === 22 && buildingSlot === 3) return [shift + (store.refSize * 1556) / 400, shift + (store.refSize * 2206) / 400]
		if (junctionID === 23) return [shift + (store.refSize * 1690) / 400, shift + (store.refSize * 2844) / 400]
		if (junctionID === 24) return [shift + (store.refSize * 2178) / 400, shift + (store.refSize * 312) / 400]
		// 25
		if (junctionID === 26 && buildingSlot === 1) return [shift + (store.refSize * 1865) / 400, shift + (store.refSize * 1351) / 400]
		if (junctionID === 26 && buildingSlot === 3) return [shift + (store.refSize * 1952) / 400, shift + (store.refSize * 1131) / 400]
		if (junctionID === 27 && buildingSlot === 2) return [shift + (store.refSize * 2182) / 400, shift + (store.refSize * 1827) / 400]
		if (junctionID === 27 && buildingSlot === 3) return [shift + (store.refSize * 2032) / 400, shift + (store.refSize * 1634) / 400]
		if (junctionID === 28) return [shift + (store.refSize * 2157) / 400, shift + (store.refSize * 2366) / 400]
		if (junctionID === 29) return [shift + (store.refSize * 2513) / 400, shift + (store.refSize * 401) / 400]
		if (junctionID === 30) return [shift + (store.refSize * 2472) / 400, shift + (store.refSize * 924) / 400]
		if (junctionID === 31 && buildingSlot === 2) return [shift + (store.refSize * 2580) / 400, shift + (store.refSize * 1214) / 400]
		if (junctionID === 31 && buildingSlot === 3) return [shift + (store.refSize * 2394) / 400, shift + (store.refSize * 1339) / 400]
		if (junctionID === 32) return [shift + (store.refSize * 2643) / 400, shift + (store.refSize * 1744) / 400]
		if (junctionID === 33) return [shift + (store.refSize * 2040) / 400, shift + (store.refSize * 2085) / 400]
		if (junctionID === 34) return [shift + (store.refSize * 2565) / 400, shift + (store.refSize * 2547) / 400]
		if (junctionID === 35) return [shift + (store.refSize * 1970) / 400, shift + (store.refSize * 2685) / 400]
	}

	alert("JID: " + String(junctionID))
	alert("BSl:" + String(buildingSlot))
	return [0, 0]
}

// Which occupant sits on a building (11-13 pax, 21-23 Jeroen, 31-33 Joris)
export function getBuildingOccupantImage(value) {
	if (value >= 30) return "joris"
	if (value >= 20) return "jeroen"
	return "passenger"
}

// Get the position of a VROOMM destination spot, including the special convention/airport spots
export function getVromDestinationPos(junctionID, spotSlot, outline) {
	const store = useModelStore()
	if (spotSlot === rf.VROM_DEST_JEROEN_CON) {
		return [(store.refSize * rf.PITTS_CONVENTION_JEROEN_SPOT[0]) / 400, (store.refSize * rf.PITTS_CONVENTION_JEROEN_SPOT[1]) / 400]
	}
	if (spotSlot === rf.VROM_DEST_JORIS_CON) {
		return [(store.refSize * rf.PITTS_CONVENTION_JORIS_SPOT[0]) / 400, (store.refSize * rf.PITTS_CONVENTION_JORIS_SPOT[1]) / 400]
	}
	if (spotSlot === rf.VROM_DEST_AIRPORT) {
		return [(store.refSize * rf.PITTS_AIRPORT_SPOT[0]) / 400, (store.refSize * rf.PITTS_AIRPORT_SPOT[1]) / 400]
	}
	return getBuildingPos(junctionID, spotSlot, outline)
}

export function getLineSVGpoints(lineID, index, raw) {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.selectedBoard === rf.BOARD_PITTS) {
		// If highlighting, get index and +1
		if (index === 10) {
			index = store.lines[lineID].length
		}

		let lineWidth = (store.refSize * 25) / 400

		let coords = []
		if (lineID === 0) coords = [737, 275, 1117, 245]
		if (lineID === 1) coords = [1257, 283, 1487, 446]
		if (lineID === 2) coords = [1617, 535, 1710, 600]
		if (lineID === 3) coords = [1837, 579, 2087, 333]
		if (lineID === 4) coords = [2223, 299, 2557, 486]
		if (lineID === 5) coords = [2713, 639, 2947, 939]
		if (lineID === 6) coords = [460, 768, 627, 382]
		if (lineID === 7) coords = [713, 368, 843, 642]
		if (lineID === 8) coords = [927, 643, 1137, 326]
		if (lineID === 9) coords =[950, 738, 1180, 845]
		if (lineID === 10) coords = [1287, 812, 1490, 548]
		if (lineID === 11) coords = [1300, 912, 1447, 998]
		if (lineID === 12) coords = [1547, 968, 1720, 708]
		if (lineID === 13) coords = [1573, 1025, 1977, 1018]
		if (lineID === 14) coords = [1837, 708, 1993, 945]
		if (lineID === 15) coords =[2103, 1008, 2470, 1008]
		if (lineID === 16) coords =[2233, 805, 2467, 955]
		if (lineID === 17) coords =[2153, 365, 2160, 632]
		if (lineID === 18) coords = [2233, 715, 2537, 595]
		if (lineID === 19) coords = [2570, 898, 2620, 662]
		if (lineID === 20) coords = [2607, 1013, 2930, 1009]
		if (lineID === 21) coords = [500, 834, 803, 741]
		if (lineID === 22) coords = [507, 907, 777, 1031]
		if (lineID === 23) coords = [913, 1037, 1150, 917]
		if (lineID === 24) coords = [850, 1091, 857, 1218]
		if (lineID === 25) coords = [943, 1199, 1433, 1060]
		if (lineID === 26) coords =[923, 1271, 1233, 1425]
		if (lineID === 27) coords = [1347, 1349, 1460, 1116]
		if (lineID === 28) coords = [1377, 1439, 1717, 1399]
		if (lineID === 29) coords = [1573, 1110, 1740, 1324]
		if (lineID === 30) coords = [1867, 1403, 2157, 1416]
		if (lineID === 31) coords = [2077, 1099, 2210, 1343]
		if (lineID === 32) coords = [2317, 1423, 2643, 1436]
		if (lineID === 33) coords = [2573, 1103, 2687, 1359]
		if (lineID === 34) coords = [2797, 1437, 3123, 1430]
		if (lineID === 35) coords = [3040, 1103, 3137, 1336]
		if (lineID === 36) coords = [330, 1030, 410, 889]
		if (lineID === 37) coords = [187, 1403, 283, 1149]
		if (lineID === 38) coords = [393, 1133, 627, 1326]
		if (lineID === 39) coords = [220, 1479, 617, 1403]
		if (lineID === 40) coords = [717, 1358, 823, 1265]
		if (lineID === 41) coords = [767, 1428, 1047, 1578]
		if (lineID === 42) coords =[610, 1745, 670, 1465]
		if (lineID === 43) coords =[1037, 1935, 1110, 1695]
		if (lineID === 44) coords = [1160, 1576, 1270, 1469]
		if (lineID === 45) coords = [1190, 1611, 1550, 1578]
		if (lineID === 46) coords = [1503, 1908, 1590, 1651]
		if (lineID === 47) coords = [1663, 1546, 1750, 1446]
		if (lineID === 48) coords =[1673, 1655, 1850, 1885]
		if (lineID === 49) coords = [147, 1599, 160, 1949]
		if (lineID === 50) coords = [220, 1561, 520, 1794]
		if (lineID === 51) coords = [670, 1886, 930, 2003]
		if (lineID === 52) coords = [1087, 2034, 1400, 2021]
		if (lineID === 53) coords = [1553, 2003, 1823, 1966]
		if (lineID === 54) coords = [1957, 1953, 2170, 1959]
		if (lineID === 55) coords = [2230, 1857, 2240, 1514]
		if (lineID === 56) coords = [2290, 1957, 2580, 1944]
		if (lineID === 57) coords =[2663, 1844, 2703, 1551]
		if (lineID === 58) coords =[2727, 1941, 3020, 1941]
		if (lineID === 59) coords = [3103, 1851, 3163, 1527]
		if (lineID === 60) coords = [253, 2019, 517, 1887]
		if (lineID === 61) coords = [243, 2139, 470, 2333]
		if (lineID === 62) coords = [543, 2268, 577, 1961]
		if (lineID === 63) coords = [600, 2323, 943, 2089]
		if (lineID === 64) coords = [1077, 2111, 1437, 2421]
		if (lineID === 65) coords = [1473, 2098, 1497, 2368]
		if (lineID === 66) coords = [1590, 2458, 1940, 2398]
		if (lineID === 67) coords = [1930, 2061, 1993, 2278]
		if (lineID === 68) coords = [2077, 2378, 2280, 2375]
		if (lineID === 69) coords = [2253, 2053, 2303, 2266]
		if (lineID === 70) coords = [2390, 2295, 2597, 2018]

		let x1 = (store.refSize * coords[0]) / 400
		let y1 = (store.refSize * coords[1]) / 400
		let x2 = (store.refSize * coords[2]) / 400
		let y2 = (store.refSize * coords[3]) / 400

		let deltaY = Math.abs(y1 - y2)
		let deltaX = Math.abs(x1 - x2)

		let topPercent = deltaX / (deltaX + deltaY)
		let leftPercent = deltaY / (deltaX + deltaY)

		let trigFactor = Math.min(topPercent, leftPercent)
		lineWidth = lineWidth + trigFactor * 1.41 * lineWidth

		if (index === 2) index = -1
		else if (index === 3) index = 2
		else if (index === 4) index = -2

		if (y1 > y2) {
			x1 = index * lineWidth * leftPercent + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = index * lineWidth * leftPercent + x2
			y2 = index * lineWidth * topPercent + y2
		} else {
			x1 = -(index * lineWidth * leftPercent) + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = -(index * lineWidth * leftPercent) + x2
			y2 = index * lineWidth * topPercent + y2
		}

		// Calculate perpendicular offset for polygon width
		const origX1 = (store.refSize * coords[0]) / 400
		const origY1 = (store.refSize * coords[1]) / 400
		const origX2 = (store.refSize * coords[2]) / 400
		const origY2 = (store.refSize * coords[3]) / 400
		
		const origDeltaX = origX2 - origX1
		const origDeltaY = origY2 - origY1
		const origLength = Math.sqrt(origDeltaX * origDeltaX + origDeltaY * origDeltaY)
		
		let x11 = x1
		let y11 = y1
		let x22 = x2
		let y22 = y2
		
		if (origLength > 0) {
			const offsetX = (origDeltaY / origLength) * lineWidth / 2
			const offsetY = (origDeltaX / origLength) * lineWidth / 2
			
			x11 = x1 - offsetX
			y11 = y1 + offsetY
			x22 = x2 - offsetX
			y22 = y2 + offsetY
		}
		
		if (raw) return [x1, y1, x11, y11, x2, y2, x22, y22]
		
		// Calculate polygon points for display
		if (origLength > 0) {
			const offsetX = (origDeltaY / origLength) * lineWidth / 2
			const offsetY = (origDeltaX / origLength) * lineWidth / 2
			
			const p1x = x1 - offsetX
			const p1y = y1 + offsetY
			const p2x = x2 - offsetX
			const p2y = y2 + offsetY
			const p3x = x2 + offsetX
			const p3y = y2 - offsetY
			const p4x = x1 + offsetX
			const p4y = y1 - offsetY
			
			return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`
		}

		return `${x1},${y1} ${x2},${y2}`
	}

	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) {
		// If highlighting, get index and +1
		if (index === 10) {
			index = store.lines[lineID].length
		}

		let lineWidth = (store.refSize * 25) / 400

		let coords = []
		if (lineID === 0) coords = [460, 245, 865, 175]
		if (lineID === 1) coords = [1060, 196, 1720, 333]
		if (lineID === 2) coords = [1875, 330, 2310, 220]
		if (lineID === 3) coords = [2490, 241, 2816, 354]
		if (lineID === 4) coords = [352, 780, 359, 361]
		if (lineID === 5) coords = [439, 336, 585, 509]
		if (lineID === 6) coords = [1000, 281, 1060, 532]
		if (lineID === 7) coords = [1039, 264, 1429, 654]
		if (lineID === 8) coords = [1539, 653, 1727, 434]
		if (lineID === 9) coords = [1899, 396, 2381, 716]
		if (lineID === 10) coords = [2425, 324, 2465, 671]
		if (lineID === 11) coords = [2547, 701, 2808, 460]
		if (lineID === 12) coords = [2917, 497, 2967, 881]
		if (lineID === 13) coords = [417, 798, 561, 647]
		if (lineID === 14) coords = [734, 589, 975, 606]
		if (lineID === 15) coords = [1169, 638, 1397, 700]
		if (lineID === 16) coords = [1537, 823, 1634, 1059]
		if (lineID === 17) coords = [1848, 447, 1949, 788]
		if (lineID === 18) coords = [2057, 858, 2366, 800]
		if (lineID === 19) coords = [2590, 823, 2878, 938]
		if (lineID === 20) coords = [401, 943, 551, 1231]
		if (lineID === 21) coords = [463, 917, 840, 1081]
		if (lineID === 22) coords = [951, 1026, 1033, 722]
		if (lineID === 23) coords = [1053, 1117, 1519, 1128]
		if (lineID === 24) coords = [1727, 1070, 1884, 934]
		if (lineID === 25) coords = [2059, 951, 2363, 1216]
		if (lineID === 26) coords = [2430, 1191, 2455, 909]
		if (lineID === 27) coords = [2567, 881, 2823, 1250]
		if (lineID === 28) coords = [648, 1260, 834, 1160]
		if (lineID === 29) coords = [1015, 1210, 1216, 1446]
		if (lineID === 30) coords = [1347, 1439, 1560, 1215]
		if (lineID === 31) coords = [1751, 1190, 1975, 1303]
		if (lineID === 32) coords = [2162, 1332, 2331, 1303]
		if (lineID === 33) coords = [2568, 1298, 2788, 1323]
		if (lineID === 34) coords = [414, 1698, 513, 1418]
		if (lineID === 35) coords = [637, 1398, 795, 1652]
		if (lineID === 36) coords = [931, 1699, 1167, 1581]
		if (lineID === 37) coords = [1382, 1593, 1631, 1766]
		if (lineID === 38) coords = [1770, 1751, 1985, 1437]
		if (lineID === 39) coords = [2273, 1680, 2382, 1391]
		if (lineID === 40) coords = [2512, 1411, 2672, 1726]
		if (lineID === 41) coords = [2740, 1728, 2838, 1441]
		if (lineID === 42) coords = [235, 2185, 336, 1895]
		if (lineID === 43) coords = [451, 1877, 582, 2141]
		if (lineID === 44) coords = [656, 2141, 786, 1863]
		if (lineID === 45) coords = [926, 1829, 1131, 2011]
		if (lineID === 46) coords = [1320, 2039, 1608, 1895]
		if (lineID === 47) coords = [1846, 1822, 2142, 1785]
		if (lineID === 48) coords = [2373, 1782, 2615, 1812]
		if (lineID === 49) coords = [306, 2256, 496, 2246]
		if (lineID === 50) coords = [769, 2208, 1060, 2140]
		if (lineID === 51) coords = [1330, 2156, 1483, 2256]
		if (lineID === 52) coords = [1605, 2196, 1682, 1955]
		if (lineID === 53) coords = [1789, 1951, 1927, 2233]
		if (lineID === 54) coords = [2052, 2289, 2208, 2213]
		if (lineID === 55) coords = [2279, 1875, 2304, 2097]
		if (lineID === 56) coords = [2410, 2198, 2689, 2234]
		if (lineID === 57) coords = [2749, 1913, 2803, 2146]
		if (lineID === 58) coords = [348, 2468, 517, 2318]
		if (lineID === 59) coords = [635, 2361, 644, 2619]
		if (lineID === 60) coords = [754, 2335, 976, 2515]
		if (lineID === 61) coords = [1089, 2490, 1178, 2213]
		if (lineID === 62) coords = [1291, 2213, 1453, 2629]
		if (lineID === 63) coords = [1512, 2636, 1553, 2428]
		if (lineID === 64) coords = [381, 2587, 552, 2693]
		if (lineID === 65) coords = [728, 2708, 968, 2630]
		if (lineID === 66) coords = [1195, 2637, 1390, 2707]
		if (lineID === 67) coords = [1583, 2656, 1894, 2388]
		if (lineID === 68) coords = [2052, 2398, 2322, 2597]
		if (lineID === 69) coords = [2444, 2580, 2724, 2315]

		let x1 = (store.refSize * coords[0]) / 400
		let y1 = (store.refSize * coords[1]) / 400
		let x2 = (store.refSize * coords[2]) / 400
		let y2 = (store.refSize * coords[3]) / 400

		let deltaY = Math.abs(y1 - y2)
		let deltaX = Math.abs(x1 - x2)
		/*let deltaY = y1 - y2
    let deltaX = x1 - x2*/

		let topPercent = deltaX / (deltaX + deltaY)
		let leftPercent = deltaY / (deltaX + deltaY)

		// find the min
		let trigFactor = Math.min(topPercent, leftPercent)
		lineWidth = lineWidth + trigFactor * 1.41 * lineWidth

		// If not 0 line, shift the x1 and x2
		if (index === 2) index = -1
		else if (index === 3) index = 2
		else if (index === 4) index = -2

		// pointing up lines
		if (y1 > y2) {
			x1 = index * lineWidth * leftPercent + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = index * lineWidth * leftPercent + x2
			y2 = index * lineWidth * topPercent + y2
		}
		// pointing down lines
		else {
			//index = Math.abs(index)
			x1 = -(index * lineWidth * leftPercent) + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = -(index * lineWidth * leftPercent) + x2
			y2 = index * lineWidth * topPercent + y2
		}
		// END not a 0 line

		let shearX = 1
		if (y2 > y1) shearX = -1

		/*// find the min
    let trigFactor = Math.min(topPercent, leftPercent)
    lineWidth = lineWidth + (trigFactor * 1.41 * lineWidth)*/

		let x11 = shearX * (lineWidth * leftPercent) + x1
		let y11 = lineWidth * topPercent + y1

		let x22 = shearX * (lineWidth * leftPercent) + x2
		let y22 = lineWidth * topPercent + y2

		//return "460,278 465,290, 870,210 865,203"

		if (raw) return [x1, y1, x11, y11, x2, y2, x22, y22]
		return "" + String(x1) + "," + String(y1) + " " + String(x11) + "," + String(y11) + " " + String(x22) + "," + String(y22) + " " + String(x2) + "," + String(y2) + " "
	} else if (personal.selectedBoard === rf.BOARD_OG) {
		// If highlighting, get index and +1
		if (index === 10) {
			index = store.lines[lineID].length
		}

		let lineWidth = ((store.refSize * 25) / 400) * 2

		let coords = []
		if (lineID === 0) coords = [2892, 323, 2983, 799]
		if (lineID === 1) coords = [2802, 1528, 2944, 932]
		if (lineID === 2) coords = [2840, 1748, 2959, 2171]
		if (lineID === 3) coords = [2811, 2629, 2916, 2294]
		if (lineID === 4) coords = [2241, 266, 2787, 248]
		if (lineID === 5) coords = [2552, 538, 2805, 289]
		if (lineID === 6) coords = [2491, 942, 2864, 856]
		if (lineID === 7) coords = [2431, 1299, 2878, 911]
		if (lineID === 8) coords = [2422, 1390, 2735, 1571]
		if (lineID === 9) coords = [2432, 2177, 2746, 1678]
		if (lineID === 10) coords = [2516, 2236, 2902, 2215]
		if (lineID === 11) coords = [2485, 2334, 2777, 2628]
		if (lineID === 12) coords = [2262, 2756, 2705, 2686]
		if (lineID === 13) coords = [2259, 326, 2499, 527]
		if (lineID === 14) coords = [2431, 928, 2501, 618]
		if (lineID === 15) coords = [2376, 1289, 2414, 1027]
		if (lineID === 16) coords = [2005, 1530, 2317, 1388]
		if (lineID === 17) coords = [2297, 1785, 2691, 1642]
		if (lineID === 18) coords = [2276, 1894, 2374, 2148]
		if (lineID === 19) coords = [2202, 2738, 2320, 2388]
		if (lineID === 20) coords = [1772, 460, 2090, 305]
		if (lineID === 21) coords = [1984, 756, 2118, 362]
		if (lineID === 22) coords = [2048, 820, 2383, 930]
		if (lineID === 23) coords = [1944, 1491, 1961, 923]
		if (lineID === 24) coords = [2001, 1591, 2210, 1771]
		if (lineID === 25) coords = [1870, 2210, 2178, 1862]
		if (lineID === 26) coords = [1904, 2261, 2262, 2244]
		if (lineID === 27) coords = [1854, 2630, 2257, 2338]
		if (lineID === 28) coords = [1761, 525, 1941, 760]
		if (lineID === 29) coords = [1567, 1131, 1907, 857]
		if (lineID === 30) coords = [1591, 1207, 1891, 1487]
		if (lineID === 31) coords = [1782, 1861, 1914, 1615]
		if (lineID === 32) coords = [1786, 1956, 1830, 2197]
		if (lineID === 33) coords = [1788, 2632, 1812, 2365]
		if (lineID === 34) coords = [1282, 363, 1639, 467]
		if (lineID === 35) coords = [1307, 762, 1649, 530]
		if (lineID === 36) coords = [1327, 838, 1501, 1102]
		if (lineID === 37) coords = [1231, 1559, 1453, 1240]
		if (lineID === 38) coords = [1282, 1629, 1706, 1863]
		if (lineID === 39) coords = [1378, 2133, 1756, 2245]
		if (lineID === 40) coords = [1313, 2526, 1757, 2304]
		if (lineID === 41) coords = [1361, 2575, 1739, 2665]
		if (lineID === 42) coords = [783, 216, 1124, 323]
		if (lineID === 43) coords = [855, 528, 1114, 389]
		if (lineID === 44) coords = [865, 626, 1216, 758]
		if (lineID === 45) coords = [958, 1070, 1224, 827]
		if (lineID === 46) coords = [953, 1187, 1180, 1535]
		if (lineID === 47) coords = [1243, 1684, 1312, 2048]
		if (lineID === 48) coords = [1254, 2507, 1289, 2180]
		if (lineID === 49) coords = [735, 262, 751, 440]
		if (lineID === 50) coords = [816, 725, 915, 1051]
		if (lineID === 51) coords = [689, 1483, 849, 1199]
		if (lineID === 52) coords = [755, 1519, 1127, 1582]
		if (lineID === 53) coords = [747, 1817, 1128, 1641]
		if (lineID === 54) coords = [737, 1901, 863, 2134]
		if (lineID === 55) coords = [912, 2156, 1243, 2119]
		if (lineID === 56) coords = [817, 2616, 846, 2229]
		if (lineID === 57) coords = [876, 2645, 1194, 2562]
		if (lineID === 58) coords = [465, 287, 642, 461]
		if (lineID === 59) coords = [260, 604, 597, 587]
		if (lineID === 60) coords = [421, 959, 639, 703]
		if (lineID === 61) coords = [455, 1022, 826, 1084]
		if (lineID === 62) coords = [322, 1395, 809, 1146]
		if (lineID === 63) coords = [348, 1444, 632, 1497]
		if (lineID === 64) coords = [204, 580, 358, 319]
		if (lineID === 65) coords = [226, 668, 370, 948]
		if (lineID === 66) coords = [240, 1390, 346, 1081]
		if (lineID === 67) coords = [311, 1489, 682, 1809]
		if (lineID === 68) coords = [389, 2238, 645, 1909]
		if (lineID === 69) coords = [408, 2312, 781, 2623]

		let x1 = (store.refSize * coords[0]) / 400
		let y1 = (store.refSize * coords[1]) / 400
		let x2 = (store.refSize * coords[2]) / 400
		let y2 = (store.refSize * coords[3]) / 400

		let deltaY = Math.abs(y1 - y2)
		let deltaX = Math.abs(x1 - x2)
		/*let deltaY = y1 - y2
    let deltaX = x1 - x2*/

		let topPercent = deltaX / (deltaX + deltaY)
		let leftPercent = deltaY / (deltaX + deltaY)

		// find the min
		let trigFactor = Math.min(topPercent, leftPercent)
		lineWidth = lineWidth + trigFactor * 1.41 * lineWidth

		// If not 0 line, shift the x1 and x2
		if (index === 2) index = -1
		else if (index === 3) index = 2
		else if (index === 4) index = -2

		// pointing up lines
		if (y1 > y2) {
			x1 = index * lineWidth * leftPercent + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = index * lineWidth * leftPercent + x2
			y2 = index * lineWidth * topPercent + y2
		}
		// pointing down lines
		else {
			//index = Math.abs(index)
			x1 = -(index * lineWidth * leftPercent) + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = -(index * lineWidth * leftPercent) + x2
			y2 = index * lineWidth * topPercent + y2
		}
		// END not a 0 line

		let shearX = 1
		if (y2 > y1) shearX = -1

		/*// find the min
    let trigFactor = Math.min(topPercent, leftPercent)
    lineWidth = lineWidth + (trigFactor * 1.41 * lineWidth)*/

		let x11 = shearX * (lineWidth * leftPercent) + x1
		let y11 = lineWidth * topPercent + y1

		let x22 = shearX * (lineWidth * leftPercent) + x2
		let y22 = lineWidth * topPercent + y2

		//return "460,278 465,290, 870,210 865,203"

		if (raw) return [x1, y1, x11, y11, x2, y2, x22, y22]
		return "" + String(x1) + "," + String(y1) + " " + String(x11) + "," + String(y11) + " " + String(x22) + "," + String(y22) + " " + String(x2) + "," + String(y2) + " "
	} else if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) {
		// If highlighting, get index and +1
		if (index === 10) {
			index = store.lines[lineID].length
		}

		let lineWidth = (store.refSize * 33) / 400

		let coords = []
		if (lineID === 0) coords = [598, 332, 1038, 259]
		if (lineID === 1) coords = [1210, 272, 1784, 387]
		if (lineID === 2) coords = [1938, 384, 2337, 284]
		if (lineID === 3) coords = [2512, 271, 2845, 371]
		if (lineID === 4) coords = [552, 437, 567, 870]
		if (lineID === 5) coords = [608, 403, 794, 583]
		if (lineID === 6) coords = [1146, 385, 1220, 653]
		if (lineID === 7) coords = [1198, 341, 1553, 693]
		if (lineID === 8) coords = [1638, 711, 1808, 472]
		if (lineID === 9) coords = [1963, 454, 2357, 672]
		if (lineID === 10) coords = [2463, 336, 2486, 626]
		if (lineID === 11) coords = [2579, 656, 2836, 440]
		if (lineID === 12) coords = [2937, 501, 2991, 847]
		if (lineID === 13) coords = [600, 879, 767, 692]
		if (lineID === 14) coords = [904, 641, 1148, 694]
		if (lineID === 15) coords = [1287, 718, 1523, 749]
		if (lineID === 16) coords = [1653, 819, 1776, 1047]
		if (lineID === 17) coords = [1920, 515, 2034, 817]
		if (lineID === 18) coords = [2134, 864, 2337, 793]
		if (lineID === 19) coords = [2623, 793, 2919, 893]
		if (lineID === 20) coords = [615, 1031, 756, 1283]
		if (lineID === 21) coords = [643, 971, 1003, 1084]
		if (lineID === 22) coords = [1085, 1061, 1176, 800]
		if (lineID === 23) coords = [1192, 1114, 1680, 1128]
		if (lineID === 24) coords = [1868, 1074, 1997, 938]
		if (lineID === 25) coords = [2128, 953, 2429, 1195]
		if (lineID === 26) coords = [2497, 902, 2507, 1194]
		if (lineID === 27) coords = [2609, 894, 2862, 1207]
		if (lineID === 28) coords = [815, 1296, 1013, 1156]
		if (lineID === 29) coords = [1153, 1187, 1370, 1430]
		if (lineID === 30) coords = [1488, 1432, 1727, 1203]
		if (lineID === 31) coords = [1896, 1177, 2074, 1272]
		if (lineID === 32) coords = [2224, 1294, 2416, 1263]
		if (lineID === 33) coords = [2573, 1254, 2829, 1267]
		if (lineID === 34) coords = [626, 1725, 728, 1427]
		if (lineID === 35) coords = [839, 1408, 1024, 1652]
		if (lineID === 36) coords = [1116, 1674, 1335, 1547]
		if (lineID === 37) coords = [1523, 1560, 1773, 1715]
		if (lineID === 38) coords = [1889, 1689, 2062, 1410]
		if (lineID === 39) coords = [2353, 1636, 2448, 1344]
		if (lineID === 40) coords = [2552, 1336, 2747, 1670]
		if (lineID === 41) coords = [2779, 1667, 2864, 1362]
		if (lineID === 42) coords = [491, 2162, 582, 1870]
		if (lineID === 43) coords = [679, 1849, 797, 2072]
		if (lineID === 44) coords = [886, 2069, 1010, 1784]
		if (lineID === 45) coords = [1127, 1770, 1355, 1998]
		if (lineID === 46) coords = [1440, 2007, 1739, 1831]
		if (lineID === 47) coords = [1945, 1754, 2261, 1704]
		if (lineID === 48) coords = [2421, 1698, 2707, 1732]
		if (lineID === 49) coords = [542, 2217, 714, 2200]
		if (lineID === 50) coords = [992, 2147, 1292, 2068]
		if (lineID === 51) coords = [1478, 2082, 1708, 2191]
		if (lineID === 52) coords = [1761, 2163, 1814, 1892]
		if (lineID === 53) coords = [1922, 1878, 2081, 2172]
		if (lineID === 54) coords = [2153, 2192, 2335, 2100]
		if (lineID === 55) coords = [2375, 1778, 2404, 2026]
		if (lineID === 56) coords = [2474, 2084, 2797, 2116]
		if (lineID === 57) coords = [2808, 1809, 2884, 2072]
		if (lineID === 58) coords = [573, 2429, 732, 2284]
		if (lineID === 59) coords = [874, 2346, 890, 2608]
		if (lineID === 60) coords = [983, 2282, 1205, 2449]
		if (lineID === 61) coords = [1264, 2442, 1348, 2137]
		if (lineID === 62) coords = [1452, 2144, 1659, 2549]
		if (lineID === 63) coords = [1690, 2541, 1734, 2298]
		if (lineID === 64) coords = [617, 2506, 825, 2628]
		if (lineID === 65) coords = [938, 2635, 1189, 2526]
		if (lineID === 66) coords = [1343, 2521, 1616, 2603]
		if (lineID === 67) coords = [1750, 2557, 2029, 2280]
		if (lineID === 68) coords = [2176, 2274, 2464, 2487]
		if (lineID === 69) coords = [2545, 2480, 2818, 2187]

		let x1 = (store.refSize * coords[0]) / 400
		let y1 = (store.refSize * coords[1]) / 400
		let x2 = (store.refSize * coords[2]) / 400
		let y2 = (store.refSize * coords[3]) / 400

		let deltaY = Math.abs(y1 - y2)
		let deltaX = Math.abs(x1 - x2)

		let topPercent = deltaX / (deltaX + deltaY)
		let leftPercent = deltaY / (deltaX + deltaY)

		// find the min
		let trigFactor = Math.min(topPercent, leftPercent)
		lineWidth = lineWidth + trigFactor * 1.41 * lineWidth

		// If not 0 line, shift the x1 and x2
		if (index === 2) index = -1
		else if (index === 3) index = 2
		else if (index === 4) index = -2

		// pointing up lines
		if (y1 > y2) {
			x1 = index * lineWidth * leftPercent + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = index * lineWidth * leftPercent + x2
			y2 = index * lineWidth * topPercent + y2
		}
		// pointing down lines
		else {
			//index = Math.abs(index)
			x1 = -(index * lineWidth * leftPercent) + x1
			y1 = index * lineWidth * topPercent + y1
			x2 = -(index * lineWidth * leftPercent) + x2
			y2 = index * lineWidth * topPercent + y2
		}
		// END not a 0 line

		let shearX = 1
		if (y2 > y1) shearX = -1

		let x11 = shearX * (lineWidth * leftPercent) + x1
		let y11 = lineWidth * topPercent + y1

		let x22 = shearX * (lineWidth * leftPercent) + x2
		let y22 = lineWidth * topPercent + y2

		if (raw) return [x1, y1, x11, y11, x2, y2, x22, y22]
		return "" + String(x1) + "," + String(y1) + " " + String(x11) + "," + String(y11) + " " + String(x22) + "," + String(y22) + " " + String(x2) + "," + String(y2) + " "
	}
}

export function phaseStr() {
	const store = useModelStore()
	var phaseStr = "333"
	if (store.gameflow.phase === rf.PHASE_SETUP_BLDGS) phaseStr = "Setup Buildings" // TO: 2 bldgs on zone 1 per player
	if (store.gameflow.phase === rf.PHASE_SETUP_LINES) phaseStr = "Setup Lines" // TO then reverse TO,eg 1,2,3,4,4,3,2,1, place 1 line
	if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS) phaseStr = "Choose Actions" // TO: At least 2 actions, then can pass
	if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) phaseStr = "Line Expansion" // 5p: +1 to maxNumBus
	if (store.gameflow.phase === rf.PHASE_ADD_BUS) phaseStr = "Add a Bus"
	if (store.gameflow.phase === rf.PHASE_ADD_PAX) phaseStr = "Add Passengers"
	if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) phaseStr = "Add Buildings" // (GE check)
	if (store.gameflow.phase === rf.PHASE_ALTER_TIME) phaseStr = "Alter Time" // AND POSSIBLE IMMEDIATE GAME END
	if (store.gameflow.phase === rf.PHASE_VROM) phaseStr = "VRROOOMM!!"
	if (store.gameflow.phase === rf.PHASE_CHANGE_START_PLAYER) phaseStr = "Change Start Player" // GE check, if no more bldg spots
	if (store.gameflow.phase === rf.PHASE_GAME_END_CHECK) phaseStr = "Game End Check" // bldg spots, only 1 player with action markers
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) phaseStr = "Game Finished"

	return phaseStr
}

// NOTE: THE ORDER THE JUNCTIONS ARE IN THE ARRAY IS VERY IMPORTANT
// THIS ALLOWS CORRECT PLACEMENT OF LINE END ICON
// REQUIRES DIFFERENT ORDER FOR DIFFERENT BOARD ORIENTATIONS
export function getJunctionsAtEndOfLine(lineID) {
	const personal = usePersonalStore()

	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) {
		if (lineID === 0) return [0, 1]
		if (lineID === 1) return [1, 2]
		if (lineID === 2) return [2, 3]
		if (lineID === 3) return [3, 4]
		if (lineID === 4) return [5, 0]
		if (lineID === 5) return [0, 6]
		if (lineID === 6) return [1, 7]
		if (lineID === 7) return [1, 8]
		if (lineID === 8) return [8, 2]
		if (lineID === 9) return [2, 10]
		if (lineID === 10) return [3, 10]
		if (lineID === 11) return [10, 4]
		if (lineID === 12) return [4, 11]
		if (lineID === 13) return [5, 6]
		if (lineID === 14) return [6, 7]
		if (lineID === 15) return [7, 8]
		if (lineID === 16) return [8, 14]
		if (lineID === 17) return [2, 9]
		if (lineID === 18) return [9, 10]
		if (lineID === 19) return [10, 11]
		if (lineID === 20) return [5, 12]
		if (lineID === 21) return [5, 13]
		if (lineID === 22) return [13, 7]
		if (lineID === 23) return [13, 14]
		if (lineID === 24) return [14, 9]
		if (lineID === 25) return [9, 16]
		if (lineID === 26) return [16, 10]
		if (lineID === 27) return [10, 17]
		if (lineID === 28) return [12, 13]
		if (lineID === 29) return [13, 20]
		if (lineID === 30) return [20, 14]
		if (lineID === 31) return [14, 15]
		if (lineID === 32) return [15, 16]
		if (lineID === 33) return [16, 17]
		if (lineID === 34) return [18, 12]
		if (lineID === 35) return [12, 19]
		if (lineID === 36) return [19, 20]
		if (lineID === 37) return [20, 21]
		if (lineID === 38) return [21, 15]
		if (lineID === 39) return [22, 16]
		if (lineID === 40) return [16, 23]
		if (lineID === 41) return [23, 17]
		if (lineID === 42) return [24, 18]
		if (lineID === 43) return [18, 25]
		if (lineID === 44) return [25, 19]
		if (lineID === 45) return [19, 26]
		if (lineID === 46) return [26, 21]
		if (lineID === 47) return [21, 22]
		if (lineID === 48) return [22, 23]
		if (lineID === 49) return [24, 25]
		if (lineID === 50) return [25, 26]
		if (lineID === 51) return [26, 27]
		if (lineID === 52) return [27, 21]
		if (lineID === 53) return [21, 33]
		if (lineID === 54) return [33, 28]
		if (lineID === 55) return [22, 28]
		if (lineID === 56) return [28, 35]
		if (lineID === 57) return [23, 35]
		if (lineID === 58) return [29, 25]
		if (lineID === 59) return [25, 30]
		if (lineID === 60) return [25, 31]
		if (lineID === 61) return [31, 26]
		if (lineID === 62) return [26, 32]
		if (lineID === 63) return [32, 27]
		if (lineID === 64) return [29, 30]
		if (lineID === 65) return [30, 31]
		if (lineID === 66) return [31, 32]
		if (lineID === 67) return [32, 33]
		if (lineID === 68) return [33, 34]
		if (lineID === 69) return [34, 35]
	} else if (personal.selectedBoard === rf.BOARD_OG) {
		if (lineID === 0) return [0, 1]
		if (lineID === 1) return [2, 1]
		if (lineID === 2) return [2, 3]
		if (lineID === 3) return [4, 3]
		if (lineID === 4) return [5, 0]
		if (lineID === 5) return [6, 0]
		if (lineID === 6) return [7, 1]
		if (lineID === 7) return [8, 1]
		if (lineID === 8) return [8, 2]
		if (lineID === 9) return [10, 2]
		if (lineID === 10) return [10, 3]
		if (lineID === 11) return [10, 4]
		if (lineID === 12) return [11, 4]
		if (lineID === 13) return [5, 6]
		if (lineID === 14) return [7, 6]
		if (lineID === 15) return [8, 7]
		if (lineID === 16) return [14, 8]
		if (lineID === 17) return [9, 2]
		if (lineID === 18) return [9, 10]
		if (lineID === 19) return [11, 10]
		if (lineID === 20) return [12, 5]
		if (lineID === 21) return [13, 5]
		if (lineID === 22) return [13, 7]
		if (lineID === 23) return [14, 13]
		if (lineID === 24) return [14, 9]
		if (lineID === 25) return [16, 9]
		if (lineID === 26) return [16, 10]
		if (lineID === 27) return [17, 10]
		if (lineID === 28) return [12, 13]
		if (lineID === 29) return [20, 13]
		if (lineID === 30) return [20, 14]
		if (lineID === 31) return [15, 14]
		if (lineID === 32) return [15, 16]
		if (lineID === 33) return [17, 16]
		if (lineID === 34) return [18, 12]
		if (lineID === 35) return [19, 12]
		if (lineID === 36) return [19, 20]
		if (lineID === 37) return [21, 20]
		if (lineID === 38) return [21, 15]
		if (lineID === 39) return [22, 16]
		if (lineID === 40) return [23, 16]
		if (lineID === 41) return [23, 17]
		if (lineID === 42) return [24, 18]
		if (lineID === 43) return [25, 18]
		if (lineID === 44) return [25, 19]
		if (lineID === 45) return [26, 19]
		if (lineID === 46) return [26, 21]
		if (lineID === 47) return [21, 22]
		if (lineID === 48) return [23, 22]
		if (lineID === 49) return [24, 25]
		if (lineID === 50) return [25, 26]
		if (lineID === 51) return [27, 26]
		if (lineID === 52) return [27, 21]
		if (lineID === 53) return [33, 21]
		if (lineID === 54) return [33, 28]
		if (lineID === 55) return [28, 22]
		if (lineID === 56) return [35, 28]
		if (lineID === 57) return [35, 23]
		if (lineID === 58) return [29, 25]
		if (lineID === 59) return [30, 25]
		if (lineID === 60) return [31, 25]
		if (lineID === 61) return [31, 26]
		if (lineID === 62) return [32, 26]
		if (lineID === 63) return [32, 27]
		if (lineID === 64) return [30, 29]
		if (lineID === 65) return [30, 31]
		if (lineID === 66) return [32, 31]
		if (lineID === 67) return [32, 33]
		if (lineID === 68) return [34, 33]
		if (lineID === 69) return [34, 35]
	}
	// 20th anniverary
	else if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) {
		if (lineID === 0) return [0, 1]
		if (lineID === 1) return [1, 2]
		if (lineID === 2) return [2, 3]
		if (lineID === 3) return [3, 4]
		if (lineID === 4) return [0, 5]
		if (lineID === 5) return [0, 6]
		if (lineID === 6) return [1, 7]
		if (lineID === 7) return [1, 8]
		if (lineID === 8) return [8, 2]
		if (lineID === 9) return [2, 10]
		if (lineID === 10) return [3, 10]
		if (lineID === 11) return [10, 4]
		if (lineID === 12) return [4, 11]
		if (lineID === 13) return [5, 6]
		if (lineID === 14) return [6, 7]
		if (lineID === 15) return [7, 8]
		if (lineID === 16) return [8, 14]
		if (lineID === 17) return [2, 9]
		if (lineID === 18) return [9, 10]
		if (lineID === 19) return [10, 11]
		if (lineID === 20) return [5, 12]
		if (lineID === 21) return [5, 13]
		if (lineID === 22) return [13, 7]
		if (lineID === 23) return [13, 14]
		if (lineID === 24) return [14, 9]
		if (lineID === 25) return [9, 16]
		if (lineID === 26) return [10, 16]
		if (lineID === 27) return [10, 17]
		if (lineID === 28) return [12, 13]
		if (lineID === 29) return [13, 20]
		if (lineID === 30) return [20, 14]
		if (lineID === 31) return [14, 15]
		if (lineID === 32) return [15, 16]
		if (lineID === 33) return [16, 17]
		if (lineID === 34) return [18, 12]
		if (lineID === 35) return [12, 19]
		if (lineID === 36) return [19, 20]
		if (lineID === 37) return [20, 21]
		if (lineID === 38) return [21, 15]
		if (lineID === 39) return [22, 16]
		if (lineID === 40) return [16, 23]
		if (lineID === 41) return [23, 17]
		if (lineID === 42) return [24, 18]
		if (lineID === 43) return [18, 25]
		if (lineID === 44) return [25, 19]
		if (lineID === 45) return [19, 26]
		if (lineID === 46) return [26, 21]
		if (lineID === 47) return [21, 22]
		if (lineID === 48) return [22, 23]
		if (lineID === 49) return [24, 25]
		if (lineID === 50) return [25, 26]
		if (lineID === 51) return [26, 27]
		if (lineID === 52) return [27, 21]
		if (lineID === 53) return [21, 33]
		if (lineID === 54) return [33, 28]
		if (lineID === 55) return [22, 28]
		if (lineID === 56) return [28, 35]
		if (lineID === 57) return [23, 35]
		if (lineID === 58) return [29, 25]
		if (lineID === 59) return [25, 30]
		if (lineID === 60) return [25, 31]
		if (lineID === 61) return [31, 26]
		if (lineID === 62) return [26, 32]
		if (lineID === 63) return [32, 27]
		if (lineID === 64) return [29, 30]
		if (lineID === 65) return [30, 31]
		if (lineID === 66) return [31, 32]
		if (lineID === 67) return [32, 33]
		if (lineID === 68) return [33, 34]
		if (lineID === 69) return [34, 35]
	}
	// Pitts
	else if (personal.selectedBoard === rf.BOARD_PITTS) {
		if (lineID === 0) return [0, 1]
		if (lineID === 1) return [1, 2]
		if (lineID === 2) return [2, 3]
		if (lineID === 3) return [3, 4]
		if (lineID === 4) return [4, 5]
		if (lineID === 5) return [5, 13]
		if (lineID === 6) return [6, 0]
		if (lineID === 7) return [0, 7]
		if (lineID === 8) return [7, 1]
		if (lineID === 9) return [7, 8]
		if (lineID === 10) return [8, 2]
		if (lineID === 11) return [8, 9]
		if (lineID === 12) return [9,3]
		if (lineID === 13) return [9, 10]
		if (lineID === 14) return [3, 10]
		if (lineID === 15) return [10, 12]
		if (lineID === 16) return [11, 12]
		if (lineID === 17) return [4, 11]
		if (lineID === 18) return [11, 5]
		if (lineID === 19) return [12, 5]
		if (lineID === 20) return [12, 13]
		if (lineID === 21) return [6, 7]
		if (lineID === 22) return [6, 14]
		if (lineID === 23) return [14, 8]
		if (lineID === 24) return [14, 17]
		if (lineID === 25) return [17, 9]
		if (lineID === 26) return [17, 18]
		if (lineID === 27) return [18, 9]
		if (lineID === 28) return [18, 19]
		if (lineID === 29) return [9, 19]
		if (lineID === 30) return [19, 20]
		if (lineID === 31) return [10, 20]
		if (lineID === 32) return [20, 21]
		if (lineID === 33) return [12, 21]
		if (lineID === 34) return [21, 22]
		if (lineID === 35) return [13, 22]
		if (lineID === 36) return [15, 6]
		if (lineID === 37) return [23, 15]
		if (lineID === 38) return [15, 16]
		if (lineID === 39) return [23, 16]
		if (lineID === 40) return [16, 17]
		if (lineID === 41) return [16, 24]
		if (lineID === 42) return [31, 16]
		if (lineID === 43) return [32, 24]
		if (lineID === 44) return [24, 18]
		if (lineID === 45) return [24, 25]
		if (lineID === 46) return [33, 25]
		if (lineID === 47) return [25, 19]
		if (lineID === 48) return [25, 26]
		if (lineID === 49) return [23, 30]
		if (lineID === 50) return [23, 31]
		if (lineID === 51) return [31, 32]
		if (lineID === 52) return [32, 33]
		if (lineID === 53) return [33, 26]
		if (lineID === 54) return [26, 27]
		if (lineID === 55) return [27, 20]
		if (lineID === 56) return [27, 28]
		if (lineID === 57) return [28, 21]
		if (lineID === 58) return [28, 29]
		if (lineID === 59) return [29, 22]
		if (lineID === 60) return [30, 31]
		if (lineID === 61) return [30, 34]
		if (lineID === 62) return [34, 31]
		if (lineID === 63) return [34, 32]
		if (lineID === 64) return [32, 35]
		if (lineID === 65) return [33, 35]
		if (lineID === 66) return [35, 36]
		if (lineID === 67) return [26, 36]
		if (lineID === 68) return [36, 37]
		if (lineID === 69) return [27, 37]
		if (lineID === 70) return [37, 28]
	}
	alert("no junction found AEOL")
	return "none"
}

export function getLinesAroundJunction(junctionID) {
	const personal = usePersonalStore()
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_OG || personal.selectedBoard === rf.BOARD_20A_CAPSTONE) {
		if (junctionID === 0) return [0, 4, 5]
		if (junctionID === 1) return [0, 1, 6, 7]
		if (junctionID === 2) return [1, 2, 8, 9, 17]
		if (junctionID === 3) return [2, 3, 10]
		if (junctionID === 4) return [3, 11, 12]
		if (junctionID === 5) return [4, 13, 20, 21]
		if (junctionID === 6) return [5, 13, 14]
		if (junctionID === 7) return [6, 14, 15, 22]
		if (junctionID === 8) return [7, 8, 15, 16]
		if (junctionID === 9) return [17, 18, 24, 25]
		if (junctionID === 10) return [9, 10, 11, 18, 19, 26, 27]
		if (junctionID === 11) return [12, 19]
		if (junctionID === 12) return [20, 28, 34, 35]
		if (junctionID === 13) return [21, 22, 23, 28, 29]
		if (junctionID === 14) return [16, 23, 24, 30, 31]
		if (junctionID === 15) return [31, 32, 38]
		if (junctionID === 16) return [25, 26, 32, 33, 39, 40]
		if (junctionID === 17) return [27, 33, 41]
		if (junctionID === 18) return [34, 42, 43]
		if (junctionID === 19) return [35, 36, 44, 45]
		if (junctionID === 20) return [29, 30, 36, 37]
		if (junctionID === 21) return [37, 38, 46, 47, 52, 53]
		if (junctionID === 22) return [39, 47, 48, 55]
		if (junctionID === 23) return [40, 41, 48, 57]
		if (junctionID === 24) return [42, 49]
		if (junctionID === 25) return [43, 44, 49, 50, 58, 59, 60]
		if (junctionID === 26) return [45, 46, 50, 51, 61, 62]
		if (junctionID === 27) return [51, 52, 63]
		if (junctionID === 28) return [54, 55, 56]
		if (junctionID === 29) return [58, 64]
		if (junctionID === 30) return [59, 64, 65]
		if (junctionID === 31) return [60, 61, 65, 66]
		if (junctionID === 32) return [62, 63, 66, 67]
		if (junctionID === 33) return [53, 54, 67, 68]
		if (junctionID === 34) return [68, 69]
		if (junctionID === 35) return [56, 57, 69]
	}
	// Pitts
	else if (personal.selectedBoard === rf.BOARD_PITTS) {
		if (junctionID === 0) return [0, 6, 7]
		if (junctionID === 1) return [0, 1, 8]
		if (junctionID === 2) return [1, 2, 10]
		if (junctionID === 3) return [2, 3, 12, 14]
		if (junctionID === 4) return [3, 4, 17]
		if (junctionID === 5) return [4, 5, 18, 19]
		if (junctionID === 6) return [6, 21, 22, 36]
		if (junctionID === 7) return [7, 8, 9, 21]
		if (junctionID === 8) return [9, 10, 11, 23]
		if (junctionID === 9) return [11, 12, 13, 25, 27, 29]
		if (junctionID === 10) return [13, 14, 15, 31]
		if (junctionID === 11) return [16, 17, 18]
		if (junctionID === 12) return [15, 16, 19, 20, 33]
		if (junctionID === 13) return [5, 20, 35]
		if (junctionID === 14) return [22, 23, 24]
		if (junctionID === 15) return [36, 37, 38]
		if (junctionID === 16) return [38, 39, 40, 41, 42]
		if (junctionID === 17) return [24, 25, 26, 40]
		if (junctionID === 18) return [26, 27, 28, 44]
		if (junctionID === 19) return [28, 29, 30, 47]
		if (junctionID === 20) return [30, 31, 32, 55]
		if (junctionID === 21) return [32, 33, 34, 57]
		if (junctionID === 22) return [34, 35, 59]
		if (junctionID === 23) return [37, 39, 49, 50]
		if (junctionID === 24) return [41, 43, 44, 45]
		if (junctionID === 25) return [45, 46, 47, 48]
		if (junctionID === 26) return [48, 53, 54, 67]
		if (junctionID === 27) return [54, 55, 56, 69]
		if (junctionID === 28) return [56, 57, 58, 70]
		if (junctionID === 29) return [58, 59]
		if (junctionID === 30) return [49, 60, 61]
		if (junctionID === 31) return [42, 50, 51, 60, 62]
		if (junctionID === 32) return [43, 51, 52, 63, 64]
		if (junctionID === 33) return [46, 52, 53, 65]
		if (junctionID === 34) return [61, 62, 63]
		if (junctionID === 35) return [64, 65, 66]
		if (junctionID === 36) return [66, 67, 68]
		if (junctionID === 37) return [68, 69, 70]
	}
	alert(`No lines for: ${junctionID} on ${personal.selectedBoard}`)
	return ""
}

export function getLineEndCircleData() {
	const store = useModelStore()
	// want [player colour, line1end]
	let ret = []

	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].endLines.length; j++) {
			let endLine = store.players[i].endLines[j]
			let lineOffset = 0
			lineOffset = store.lines[endLine].indexOf(store.players[i].colour)
			let rawPoints = getLineSVGpoints(endLine, lineOffset, true)

			// find the index of the junction in connected lines
			var index = getJunctionsAtEndOfLine(endLine).indexOf(store.players[i].endJunctions[j])
			// Now place the circle at either the left / right of the line
			let shift = 0
			if (index === 1) shift = 4

			let correctedX = rawPoints[0 + shift] + (rawPoints[2 + shift] - rawPoints[0 + shift]) / 2
			let correctedY = rawPoints[1 + shift] + (rawPoints[3 + shift] - rawPoints[1 + shift]) / 2

			let startCorrectedX = correctedX + 20
			let startCorrectedY = correctedY + 20
			// Find the start points
			//let otherJunction = getJunctionsAtEndOfLine(endLine).find((j) => j !== store.players[i].endJunctions[j])
			//let otherJunctionIndex = getJunctionsAtEndOfLine(endLine).indexOf(otherJunction)
			//let shiftStart = 0
			//if (otherJunctionIndex === 1) shiftStart = 4
			startCorrectedX = rawPoints[0 + shift] + (rawPoints[2 + shift] - rawPoints[0 + shift]) / 2
			startCorrectedY = rawPoints[1 + shift] + (rawPoints[3 + shift] - rawPoints[1 + shift]) / 2

			ret.push([store.players[i].colour, correctedX, correctedY, startCorrectedX, startCorrectedY])
		}
	}

	return ret
}

// Get the starting position for circle animation (from the OTHER junction)
export function getCircleStartPosition(lineID, playerColor, endJunction) {
	const store = useModelStore()
	const junctions = getJunctionsAtEndOfLine(lineID)

	// Find the OTHER junction (not the endJunction)
	const otherJunction = junctions.find((j) => j !== endJunction)
	if (!otherJunction) return null

	// Get the line position for this player
	const lineOffset = store.lines[lineID].indexOf(playerColor)
	const rawPoints = getLineSVGpoints(lineID, lineOffset, true)

	// Find which junction index corresponds to the other junction
	const otherJunctionIndex = junctions.indexOf(otherJunction)
	const shift = otherJunctionIndex === 1 ? 4 : 0

	// Calculate position at the other end of the line
	const startX = rawPoints[0 + shift] + (rawPoints[2 + shift] - rawPoints[0 + shift]) / 2
	const startY = rawPoints[1 + shift] + (rawPoints[3 + shift] - rawPoints[1 + shift]) / 2

	return { x: startX, y: startY }
}
