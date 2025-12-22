/**
 * Anything to do with visual displays.
 * So getting images / pngs
 * Also any long tedious functions to draw / position things
 * 
 */

import * as rf from './CNSreference'

import { useModelStore } from '../stores/CNSstore.js'
import { usePersonalStore } from '../stores/CNSpersonal.js'


export function phaseStr() {
  const store = useModelStore()

  if (store.gameflow.phase === rf.PHASE_PLACE_HEXES) return "Place Hexes"
  if (store.gameflow.phase === rf.PHASE_NETWORK) return "Develop Network"
  if (store.gameflow.phase === rf.PHASE_PRODUCTION) return "Production"
  if (store.gameflow.phase === rf.PHASE_CONFIRM_PIRATE) return "Production"
  if (store.gameflow.phase === rf.PHASE_MOVE_PIRATE) return "Move Pirates"
  if (store.gameflow.phase === rf.PHASE_STORE_RES) return "Store Resources"

}


export function getImage(image) {
  console.log('Path check:', import.meta.url);

  // Icons
	if (image === "icon-house") return new URL(`../../../static/CNS/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/CNS/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/CNS/images/icon-rulebook.svg`, import.meta.url).href
	//else if (image === "icon-info") return new URL(`../../../static/CNS/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/CNS/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/CNS/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/CNS/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/CNS/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/CNS/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/CNS/images/icon-replay.svg`, import.meta.url).href
	else if (image === "icon-box") return new URL(`../../../static/CNS/images/icon-box.svg`, import.meta.url).href

	// Other imports
	else if (image === "loading-bar-black") return new URL(`../../../static/CNS/images/loading-bar-black.gif`, import.meta.url).href
	else if (image === "rot_anticlockwise") return new URL(`../../../static/CNS/images/rot_anticlockwise.svg`, import.meta.url).href
	else if (image === "rot_clockwise") return new URL(`../../../static/CNS/images/rot_clockwise.svg`, import.meta.url).href
	else if (image === "CNSbox") return new URL(`../../../static/CNS/images/CNSbox.jpg`, import.meta.url).href
  // HEXES
  else if (image === 'hex' + String(rf.HEX_CANNES_L)) return new URL(`../../../static/CNS/images/hexes/hex_0.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_CANNES_R)) return new URL(`../../../static/CNS/images/hexes/hex_1.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_CANNES_L4P)) return new URL(`../../../static/CNS/images/hexes/hex_0.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_CANNES_R4P)) return new URL(`../../../static/CNS/images/hexes/hex_1.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_NO_ENTRANCE_A)) return new URL(`../../../static/CNS/images/hexes/hex_10.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_NO_ENTRANCE_B)) return new URL(`../../../static/CNS/images/hexes/hex_11.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_0_A)) return new URL(`../../../static/CNS/images/hexes/hex_12.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_0_B)) return new URL(`../../../static/CNS/images/hexes/hex_13.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_01)) return new URL(`../../../static/CNS/images/hexes/hex_14.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_02_A)) return new URL(`../../../static/CNS/images/hexes/hex_15.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_02_B)) return new URL(`../../../static/CNS/images/hexes/hex_16.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_03_A)) return new URL(`../../../static/CNS/images/hexes/hex_17.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_03_B)) return new URL(`../../../static/CNS/images/hexes/hex_18.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_05)) return new URL(`../../../static/CNS/images/hexes/hex_19.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_PEOPLE)) return new URL(`../../../static/CNS/images/hexes/hex_20.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_BEER)) return new URL(`../../../static/CNS/images/hexes/hex_21.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PARTY_CHIP)) return new URL(`../../../static/CNS/images/hexes/hex_22.png`, import.meta.url).href

  else if (image === 'hex' + String(rf.HEX_YELLOW_PEOPLE1_A)) return new URL(`../../../static/CNS/images/hexes/hex_30.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_PEOPLE1_B)) return new URL(`../../../static/CNS/images/hexes/hex_30.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_PEOPLE2)) return new URL(`../../../static/CNS/images/hexes/hex_32.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_BEER1_A)) return new URL(`../../../static/CNS/images/hexes/hex_33.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_BEER1_B)) return new URL(`../../../static/CNS/images/hexes/hex_33.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_BEER2)) return new URL(`../../../static/CNS/images/hexes/hex_35.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_CHIP1_A)) return new URL(`../../../static/CNS/images/hexes/hex_36.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_CHIP1_B)) return new URL(`../../../static/CNS/images/hexes/hex_36.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_CHIP1_C)) return new URL(`../../../static/CNS/images/hexes/hex_36.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_CHIP1_D)) return new URL(`../../../static/CNS/images/hexes/hex_36.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_YELLOW_CHIP2)) return new URL(`../../../static/CNS/images/hexes/hex_40.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_REAL_ESTATE_A)) return new URL(`../../../static/CNS/images/hexes/hex_50.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_REAL_ESTATE_B)) return new URL(`../../../static/CNS/images/hexes/hex_50.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_FILM_CRITIC)) return new URL(`../../../static/CNS/images/hexes/hex_52.png`, import.meta.url).href

  else if (image === 'hex' + String(rf.HEX_PROD_CIGAR_A)) return new URL(`../../../static/CNS/images/hexes/hex_60.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_CIGAR_B)) return new URL(`../../../static/CNS/images/hexes/hex_61.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_COMPUTER_A)) return new URL(`../../../static/CNS/images/hexes/hex_62.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_COMPUTER_B)) return new URL(`../../../static/CNS/images/hexes/hex_62.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_COMPUTER_C)) return new URL(`../../../static/CNS/images/hexes/hex_62.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_ACTRESS_A)) return new URL(`../../../static/CNS/images/hexes/hex_65.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_ACTRESS_B)) return new URL(`../../../static/CNS/images/hexes/hex_65.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_SFX_A)) return new URL(`../../../static/CNS/images/hexes/hex_67.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_SFX_B)) return new URL(`../../../static/CNS/images/hexes/hex_67.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_SCRIPT_A)) return new URL(`../../../static/CNS/images/hexes/hex_69.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_SCRIPT_B)) return new URL(`../../../static/CNS/images/hexes/hex_69.png`, import.meta.url).href

  else if (image === 'hex' + String(rf.HEX_PROD_MOVIE_ACTION)) return new URL(`../../../static/CNS/images/hexes/hex_71.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_MOVIE_GIRLIE)) return new URL(`../../../static/CNS/images/hexes/hex_72.png`, import.meta.url).href
  else if (image === 'hex' + String(rf.HEX_PROD_MOVIE_SCIFI)) return new URL(`../../../static/CNS/images/hexes/hex_73.png`, import.meta.url).href

  else if (image === 'hexJunk1') return new URL(`../../../static/CNS/images/hexes/j1.png`, import.meta.url).href
  else if (image === 'hexJunk2') return new URL(`../../../static/CNS/images/hexes/j2.png`, import.meta.url).href
  else if (image === 'hexJunk3') return new URL(`../../../static/CNS/images/hexes/j3.png`, import.meta.url).href
  else if (image === 'hexJunk4') return new URL(`../../../static/CNS/images/hexes/j4.png`, import.meta.url).href
  else if (image === 'hexJunk5') return new URL(`../../../static/CNS/images/hexes/j5.png`, import.meta.url).href
  else if (image === 'hexJunk6') return new URL(`../../../static/CNS/images/hexes/j6.png`, import.meta.url).href
  else if (image === 'hexJunk7') return new URL(`../../../static/CNS/images/hexes/j7.png`, import.meta.url).href

  else if (image === 'res' + String(rf.RES_PEOPLE)) return new URL(`../../../static/CNS/images/res0.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_BEER)) return new URL(`../../../static/CNS/images/res1.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_CHIP)) return new URL(`../../../static/CNS/images/res2.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_COMPUTER)) return new URL(`../../../static/CNS/images/res3.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_ACTRESS)) return new URL(`../../../static/CNS/images/res4.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_SFX)) return new URL(`../../../static/CNS/images/res5.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_SCRIPT)) return new URL(`../../../static/CNS/images/res6.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_MOVIE_ACTION)) return new URL(`../../../static/CNS/images/res7.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_MOVIE_GIRLIE)) return new URL(`../../../static/CNS/images/res8.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_MOVIE_SCIFI)) return new URL(`../../../static/CNS/images/res9.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_MONEY)) return new URL(`../../../static/CNS/images/res10.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_FILM_CRITIC)) return new URL(`../../../static/CNS/images/res11.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_CIGAR)) return new URL(`../../../static/CNS/images/cigar.png`, import.meta.url).href
  else if (image === 'res' + String(rf.RES_PIRATE)) return new URL(`../../../static/CNS/images/pirate.png`, import.meta.url).href

  else if (image === 'boxOffice') return new URL(`../../../static/CNS/images/boxOffice.jpg`, import.meta.url).href
  else if (image === 'cigar') return new URL(`../../../static/CNS/images/cigar.png`, import.meta.url).href
  else if (image === 'cigar_u') return new URL(`../../../static/CNS/images/cigar_u.png`, import.meta.url).href
  else if (image === 'cigar_d') return new URL(`../../../static/CNS/images/cigar_d.png`, import.meta.url).href

  else if (image === 'pirate') return new URL(`../../../static/CNS/images/pirate.png`, import.meta.url).href

  else alert("V-GI: " + image)
}

export function kickoutTimerTicker() {
  //const store = useModelStore()
  const personal = usePersonalStore()
  

  if (personal.secondsToNextKickout == undefined || personal.secondsToNextKickout > 1200) {
    clearInterval(personal.kickoutCountdownIntervalTimer) // FIXXXXXXXXXXXXXXXX
  } else {
    personal.secondsToNextKickout--
    if (personal.secondsToNextKickout < 60) {
      // toggle the red class on and off
      if (document.getElementById('kickoutTimerSpan').classList.contains('redText'))
        document.getElementById('kickoutTimerSpan').classList.remove('redText')
      else document.getElementById('kickoutTimerSpan').classList.add('redText')
    } else document.getElementById('kickoutTimerSpan').classList.remove('redText')

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
      if (document.getElementById('flexiKickoutTimerSpan').classList.contains('redText'))
        document.getElementById('flexiKickoutTimerSpan').classList.remove('redText')
      else document.getElementById('flexiKickoutTimerSpan').classList.add('redText')
    } else document.getElementById('flexiKickoutTimerSpan').classList.remove('redText')

    if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
  }
}
