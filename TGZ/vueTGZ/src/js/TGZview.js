
import * as rf from './TGZreference'
import * as map from './TGZmap'

import { useModelStore } from '../stores/TGZstore.js'
import { usePersonalStore } from '../stores/TGZpersonal'

export function getIndexPos(index, rotation = 0) {
  const store = useModelStore()
  let coords = map.getCoordsForIndex(index)
  if (rotation === 0) return [store.refSize / 6 * coords[1], store.refSize / 6 * coords[0]]
  // shift down half a sq and back half a sq
  else return [store.refSize / 6 * coords[1] + store.refSize / 12, store.refSize / 6 * coords[0] - store.refSize / 12]
}

export function kickoutTimerTicker() {
  const personal = usePersonalStore()

  if (personal.trainingGame || personal.secondsToNextKickout == undefined || personal.secondsToNextKickout > 1200) {
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

// THIS JUST SHIFTS THE SMALL SQUARE. INSIDE SHIFTING IS DONE BACK AT THE MAP HIGHLIGHT
export function getIndexPosForCraftsmanPip(craftsmanData) {
  const store = useModelStore()
  let coords = map.getCoordsForIndex(craftsmanData[0])
  // If 2x2 tile, shift down a sq , and right half a square
  if (rf.FOUR_SIZE_TILES.includes(craftsmanData[1])) return [store.refSize / 6 * (coords[1] + 1), store.refSize / 6 * (coords[0] + 0.5)]
  if (craftsmanData[2] === 0) return [store.refSize / 6 * coords[1], store.refSize / 6 * (coords[0] + 0.5)]
  // So must be a 1x2, so shit down one square
  return [store.refSize / 6 * (coords[1] + 1), store.refSize / 6 * coords[0]]
}

export function phaseStr() {
  const store = useModelStore()
  var phaseStr = ''
  if (store.gameflow.phase === rf.PHASE_FIRST_MON) phaseStr = 'Place First Monument'
  else if (store.gameflow.phase === rf.PHASE_BID) phaseStr = 'The Generosity Of Kings'
  else if (store.gameflow.phase === rf.PHASE_BUILD) phaseStr = 'Religion & Culture'
  else if (store.gameflow.phase === rf.PHASE_REVENUES) phaseStr = 'Revenues'
  else if (store.gameflow.phase === rf.PHASE_CHECK_END) phaseStr = 'Let us compare mythologies'
  else if (store.gameflow.phase === rf.PHASE_GAME_OVER) phaseStr = 'We have found the best mythology'


  return phaseStr
}

export function getImage(image) {
  if (image === 'cows13' || image === 'cows14') image = 'cows1_b'
  if (image === 'cows11' || image === 'cows12' || image === 'cows14XXX' || image === 'cows10') image = 'cows1_w'

  if (image === 'map0') return new URL(`@static/TGZ/images/map0.jpg`, import.meta.url).href
  else if (image === 'map1') return new URL(`@static/TGZ/images/map1.jpg`, import.meta.url).href
  else if (image === 'map2') return new URL(`@static/TGZ/images/map2.jpg`, import.meta.url).href
  else if (image === 'map3') return new URL(`@static/TGZ/images/map3.jpg`, import.meta.url).href
  else if (image === 'map4') return new URL(`@static/TGZ/images/map4.jpg`, import.meta.url).href
  else if (image === 'map5') return new URL(`@static/TGZ/images/map5.jpg`, import.meta.url).href
  else if (image === 'map6') return new URL(`@static/TGZ/images/map6.jpg`, import.meta.url).href
  else if (image === 'map7') return new URL(`@static/TGZ/images/map7.jpg`, import.meta.url).href
  else if (image === 'map8') return new URL(`@static/TGZ/images/map8.jpg`, import.meta.url).href
  else if (image === 'map9') return new URL(`@static/TGZ/images/map9.jpg`, import.meta.url).href
  else if (image === 'map10') return new URL(`@static/TGZ/images/map10.jpg`, import.meta.url).href
  else if (image === 'map11') return new URL(`@static/TGZ/images/map11.jpg`, import.meta.url).href
  else if (image === 'map12') return new URL(`@static/TGZ/images/map12.jpg`, import.meta.url).href
  else if (image === 'map13') return new URL(`@static/TGZ/images/map13.jpg`, import.meta.url).href
  else if (image === 'map14') return new URL(`@static/TGZ/images/map14.jpg`, import.meta.url).href
  else if (image === 'map15') return new URL(`@static/TGZ/images/map15.jpg`, import.meta.url).href
  else if (image === 'map16') return new URL(`@static/TGZ/images/map16.jpg`, import.meta.url).href
  else if (image === 'map17') return new URL(`@static/TGZ/images/map17.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.WOOD_TILE)) return new URL(`@static/TGZ/images/res_wood.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.CLAY_TILE)) return new URL(`@static/TGZ/images/res_clay.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.IVORY_TILE)) return new URL(`@static/TGZ/images/res_ivory.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.DIAMOND_TILE)) return new URL(`@static/TGZ/images/res_diamond.jpg`, import.meta.url).href
  else if (image === 'res' + String(rf.WATER_TILE)) return new URL(`@static/TGZ/images/res_water.jpg`, import.meta.url).href
  /**Craftsman TILES */
  else if (image === 'res' + String(rf.WATER_TILE) + '_v') return new URL(`@static/TGZ/images/res_water_V.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.WOOD_CARVER_TILE)) return new URL(`@static/TGZ/images/c_woodCarver.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.WOOD_CARVER_TILE) + '_v') return new URL(`@static/TGZ/images/c_woodCarver_v.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.POTTER_TILE)) return new URL(`@static/TGZ/images/c_potter.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.POTTER_TILE) + '_v') return new URL(`@static/TGZ/images/c_potter_v.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.IVORY_CARVER_TILE)) return new URL(`@static/TGZ/images/c_ivoryCarver.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.DIAMOND_CUTTER_TILE)) return new URL(`@static/TGZ/images/c_diamondCutter.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.SCULPTOR_TILE)) return new URL(`@static/TGZ/images/c_sculptor.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.VESSEL_MAKER_TILE)) return new URL(`@static/TGZ/images/c_vesselMaker.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.THRONE_MAKER_TILE)) return new URL(`@static/TGZ/images/c_throneMaker.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.THRONE_MAKER_TILE) + '_v') return new URL(`@static/TGZ/images/c_throneMaker_v.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(rf.BLACKSMITH_TILE)) return new URL(`@static/TGZ/images/expansion/c_blacksmith.jpg`, import.meta.url).href
  else if (image === 'craftsman' + String(7)) return new URL(`@static/TGZ/images/expansion/c_blacksmith.jpg`, import.meta.url).href
  /**Cows */
  else if (image === 'cows1') return new URL(`@static/TGZ/images/cows1.jpg`, import.meta.url).href
  else if (image === 'cows1_w') return new URL(`@static/TGZ/images/cows1_w.png`, import.meta.url).href
  else if (image === 'cows1_b') return new URL(`@static/TGZ/images/cows1_b.png`, import.meta.url).href
  else if (image === 'cows1_br') return new URL(`@static/TGZ/images/cows1_br.png`, import.meta.url).href
  else if (image === 'cows1_bid') return new URL(`@static/TGZ/images/cows1_bid.jpg`, import.meta.url).href
  else if (image === 'cows2') return new URL(`@static/TGZ/images/cows2.jpg`, import.meta.url).href
  else if (image === 'cows3') return new URL(`@static/TGZ/images/cows3.jpg`, import.meta.url).href
  //else if (image === 'depleted') return new URL(`@static/TGZ/images/depleted.png`, import.meta.url).href
  else if (image === 'noResource' + rf.WOOD_SQ) return new URL(`@static/TGZ/images/noWood.jpg`, import.meta.url).href
  else if (image === 'noResource' + rf.CLAY_SQ) return new URL(`@static/TGZ/images/noClay.jpg`, import.meta.url).href
  else if (image === 'noResource' + rf.IVORY_SQ) return new URL(`@static/TGZ/images/noIvory.jpg`, import.meta.url).href
  else if (image === 'noResource' + rf.DIAMOND_SQ) return new URL(`@static/TGZ/images/noDiamond.jpg`, import.meta.url).href
  else if (image === 'noCows') return new URL(`@static/TGZ/images/noCows.jpg`, import.meta.url).href
  else if (image === 'noCmen') return new URL(`@static/TGZ/images/noCmen.jpg`, import.meta.url).href
  else if (image === 'shad_plaque') return new URL(`@static/TGZ/images/empire_shad.jpg`, import.meta.url).href
  /** gods */
  else if (image === 'god0') return new URL(`@static/TGZ/images/g_shadipinyi.jpg`, import.meta.url).href
  else if (image === 'god1') return new URL(`@static/TGZ/images/g_elegua.jpg`, import.meta.url).href
  else if (image === 'god2') return new URL(`@static/TGZ/images/g_dziva.jpg`, import.meta.url).href
  else if (image === 'god3') return new URL(`@static/TGZ/images/g_eshu.jpg`, import.meta.url).href
  else if (image === 'god4') return new URL(`@static/TGZ/images/g_gu.jpg`, import.meta.url).href
  else if (image === 'god5') return new URL(`@static/TGZ/images/g_obatala.jpg`, import.meta.url).href
  else if (image === 'god6') return new URL(`@static/TGZ/images/g_atete.jpg`, import.meta.url).href
  else if (image === 'god7') return new URL(`@static/TGZ/images/g_tg.jpg`, import.meta.url).href
  else if (image === 'god8') return new URL(`@static/TGZ/images/g_anansi.jpg`, import.meta.url).href
  else if (image === 'god9') return new URL(`@static/TGZ/images/g_qamata.jpg`, import.meta.url).href
  else if (image === 'god10') return new URL(`@static/TGZ/images/g_engai.jpg`, import.meta.url).href
  else if (image === 'god11') return new URL(`@static/TGZ/images/g_xango.jpg`, import.meta.url).href
  // Schism
  else if (image === 'god12') return new URL(`@static/TGZ/images/expansion/g_agwunsi.jpg`, import.meta.url).href
  else if (image === 'god13') return new URL(`@static/TGZ/images/expansion/g_aja.jpg`, import.meta.url).href
  else if (image === 'god14') return new URL(`@static/TGZ/images/expansion/g_aje_shaluga.jpg`, import.meta.url).href
  else if (image === 'god15') return new URL(`@static/TGZ/images/expansion/g_alajire.jpg`, import.meta.url).href
  else if (image === 'god16') return new URL(`@static/TGZ/images/expansion/g_anyanwu.jpg`, import.meta.url).href
  else if (image === 'god17') return new URL(`@static/TGZ/images/expansion/g_ekwensu.jpg`, import.meta.url).href
  else if (image === 'god18') return new URL(`@static/TGZ/images/expansion/g_ogun.jpg`, import.meta.url).href
  else if (image === 'god19') return new URL(`@static/TGZ/images/expansion/g_ovia.jpg`, import.meta.url).href
  else if (image === 'god20') return new URL(`@static/TGZ/images/expansion/g_oya.jpg`, import.meta.url).href
  else if (image === 'god21') return new URL(`@static/TGZ/images/expansion/g_simbi.jpg`, import.meta.url).href
  else if (image === 'god22') return new URL(`@static/TGZ/images/expansion/g_tiurakh.jpg`, import.meta.url).href
  else if (image === 'god23') return new URL(`@static/TGZ/images/expansion/g_yemoja.jpg`, import.meta.url).href
  // Other
  else if (image === 'god24') return new URL(`@static/TGZ/images/expansion/g_ala.jpg`, import.meta.url).href
  else if (image === 'god25') return new URL(`@static/TGZ/images/expansion/g_ajaka.jpg`, import.meta.url).href
  else if (image === 'god26') return new URL(`@static/TGZ/images/expansion/g_aje_shaluga.jpg`, import.meta.url).href
  else if (image === 'god27') return new URL(`@static/TGZ/images/expansion/g_igwekala.jpg`, import.meta.url).href
  else if (image === 'god28') return new URL(`@static/TGZ/images/expansion/g_nyami_nyami.jpg`, import.meta.url).href
  else if (image === 'god29') return new URL(`@static/TGZ/images/expansion/g_olokun.jpg`, import.meta.url).href
  else if (image === 'god30') return new URL(`@static/TGZ/images/expansion/g_orishaAje.jpg`, import.meta.url).href

  /** specs */
  else if (image === 'spec0') return new URL(`@static/TGZ/images/s_herd.jpg`, import.meta.url).href
  else if (image === 'spec1') return new URL(`@static/TGZ/images/s_nomads.jpg`, import.meta.url).href
  else if (image === 'spec2') return new URL(`@static/TGZ/images/s_rain_ceremony.jpg`, import.meta.url).href
  else if (image === 'spec3') return new URL(`@static/TGZ/images/s_shaman.jpg`, import.meta.url).href
  else if (image === 'spec4') return new URL(`@static/TGZ/images/s_builder.jpg`, import.meta.url).href
  /** Techs  */
  else if (image === 'tech' + rf.WOOD_CARVER_TECH_A) return new URL(`@static/TGZ/images/t_wood_carverA.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.WOOD_CARVER_TECH_B) return new URL(`@static/TGZ/images/t_wood_carverB.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.POTTER_TECH_A) return new URL(`@static/TGZ/images/t_potterA.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.POTTER_TECH_B) return new URL(`@static/TGZ/images/t_potterB.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.IVORY_CARVER_TECH_A) return new URL(`@static/TGZ/images/t_ivory_carverA.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.IVORY_CARVER_TECH_B) return new URL(`@static/TGZ/images/t_ivory_carverB.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.DIAMOND_CUTTER_TECH_A) return new URL(`@static/TGZ/images/t_diamond_cutterA.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.DIAMOND_CUTTER_TECH_B) return new URL(`@static/TGZ/images/t_diamond_cutterB.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.SCULPTOR_TECH_A) return new URL(`@static/TGZ/images/t_sculptorA.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.SCULPTOR_TECH_B) return new URL(`@static/TGZ/images/t_sculptorB.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.VESSEL_MAKER_TECH_A) return new URL(`@static/TGZ/images/t_vessel_makerA.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.VESSEL_MAKER_TECH_B) return new URL(`@static/TGZ/images/t_vessel_makerB.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.THRONE_MAKER_TECH_A) return new URL(`@static/TGZ/images/t_throne_makerA.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.THRONE_MAKER_TECH_B) return new URL(`@static/TGZ/images/t_throne_makerB.jpg`, import.meta.url).href
  else if (image === 'tech' + rf.BLACKSMITH_TECH) return new URL(`@static/TGZ/images/expansion/t_blacksmith.jpg`, import.meta.url).href

  else alert("V-GI: " + image)
}



export function getPlayerTribeImage(colour) {
  if (colour === rf.BLACK) return (new URL(`@static/TGZ/images/empire_black.jpg`, import.meta.url).href)
  if (colour === rf.GREEN) return (new URL(`@static/TGZ/images/empire_green.jpg`, import.meta.url).href)
  if (colour === rf.RED) return (new URL(`@static/TGZ/images/empire_red.jpg`, import.meta.url).href)
  if (colour === rf.WHITE) return (new URL(`@static/TGZ/images/empire_white.jpg`, import.meta.url).href)
  if (colour === rf.YELLOW) return (new URL(`@static/TGZ/images/empire_yellow.jpg`, import.meta.url).href)
}