/**
 * This is a reference file to store actions/etc as constants.
 * It makes the code easier to read, and items easier to store, as they're just numbers
 *
 *
 */
import { useModelStore } from '../stores/CNSstore.js'

export const BOT_NAME = "CnsBot"
export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ['BotKickStarter', 'admin']
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
export const KICKOUT_VOTE_TOPIC = "kickout_player_votes"
export const KICKOUT_SOLO_DELAY_MS = 2 * 24 * 60 * 60 * 1000

/* Ratios */
export const hexBigRatio = 1.1547
export const hexSmallRatio = 0.866

/** COLOURS */
export const BLACK = 0
export const BLUE = 1
export const RED = 2
export const YELLOW = 3

// EXTERNAL VARS
/** PHASES */
export const PHASE_PLACE_HEXES = 0
export const PHASE_NETWORK = 1
export const PHASE_PRODUCTION = 2
export const PHASE_CONFIRM_PIRATE = 3
export const PHASE_MOVE_PIRATE = 4
export const PHASE_STORE_RES = 5
export const PHASE_GAME_OVER = 6
// END EXTERNAL VARSs

/** ACTIONS */
export const ACT_NONE = -1
export const ACT_PLACE_HEX = 0
export const ACT_ADD_LINK = 1
export const ACT_REMOVE_LINK = 2
export const ACT_READD_LINK = 3
export const ACT_ADD_CIGAR = 4
export const ACT_FILM_CRITIC = 5
export const ACT_SELL_CANNES = 6
export const ACT_PIRATE = 7
export const ACT_MOVE_PIRATE = 8
export const ACT_CONFIRM_PIRATE_PLACEMENT = 9
export const ACT_CONFIRM_END_TURN = 10
export const ACT_CONFIRM_RESIGN = 11
export const ACT_CONFIRM_KICKOUT = 12

/** HISTORY */
// Non-player Actions
export const HIST_NEW_GAME = 0
export const HIST_NEW_TURN = 1
export const HIST_REWIND = 2
export const HIST_RESIGN = 3
export const HIST_KICKOUT = 4
export const HIST_GAME_END = 5

// Player Actions
export const HIST_ADD_HEX = 10
export const HIST_STORE_HEX = 11
export const HIST_ADD_LINK = 12
export const HIST_PRODUCE_RES = 13
export const HIST_CONVERT_RES = 14
export const HIST_INCREASE_PRICE = 15
export const HIST_PIRATE_MOVIE = 16
export const HIST_MOVE_PIRATE = 17
export const HIST_SELL_MOVIES = 18
export const HIST_ADD_CIGAR = 19
export const HIST_STORE_RES = 20

// Available hexes to use for building the map
// Cannes tiles can be 0 and 1 as they are never stored
export const HEX_CANNES_L = 0
export const HEX_CANNES_R = 1
export const HEX_CANNES_L4P = 2
export const HEX_CANNES_R4P = 3


export const CANNES_HEXES = [HEX_CANNES_L, HEX_CANNES_R] // 4P HEXES PUSHED IN HERE DURING SETUP!!!!

// Resources run 0-12, so start hexes from 20 to easily check if they're being stored
export const HEX_PARTY_NO_ENTRANCE_A = 20
export const HEX_PARTY_NO_ENTRANCE_B = 21
export const HEX_PARTY_0_A = 22
export const HEX_PARTY_0_B = 23
export const HEX_PARTY_01 = 24
export const HEX_PARTY_02_A = 25
export const HEX_PARTY_02_B = 26
export const HEX_PARTY_03_A = 27
export const HEX_PARTY_03_B = 28
export const HEX_PARTY_05 = 29

export const HEX_PARTY_PEOPLE = 30
export const HEX_PARTY_BEER = 31
export const HEX_PARTY_CHIP = 32

export const HEX_YELLOW_PEOPLE1_A = 40
export const HEX_YELLOW_PEOPLE1_B = 41
export const HEX_YELLOW_PEOPLE2 = 42
export const HEX_YELLOW_BEER1_A = 43
export const HEX_YELLOW_BEER1_B = 44
export const HEX_YELLOW_BEER2 = 45
export const HEX_YELLOW_CHIP1_A = 46
export const HEX_YELLOW_CHIP1_B = 47
export const HEX_YELLOW_CHIP1_C = 48
export const HEX_YELLOW_CHIP1_D = 49
export const HEX_YELLOW_CHIP2 = 50

export const HEX_REAL_ESTATE_A = 60 // phone
export const HEX_REAL_ESTATE_B = 61 // phone
export const HEX_FILM_CRITIC = 62 // phone

export const HEX_PROD_CIGAR_A = 70
export const HEX_PROD_CIGAR_B = 71
export const HEX_PROD_COMPUTER_A = 72
export const HEX_PROD_COMPUTER_B = 73
export const HEX_PROD_COMPUTER_C = 74
export const HEX_PROD_ACTRESS_A = 75
export const HEX_PROD_ACTRESS_B = 76
export const HEX_PROD_SFX_A = 77
export const HEX_PROD_SFX_B = 78
export const HEX_PROD_SCRIPT_A = 79
export const HEX_PROD_SCRIPT_B = 80
export const HEX_PROD_MOVIE_ACTION = 81
export const HEX_PROD_MOVIE_GIRLIE = 82
export const HEX_PROD_MOVIE_SCIFI = 83

export const HEX_PHONE_TILES = [HEX_REAL_ESTATE_A, HEX_REAL_ESTATE_B, HEX_FILM_CRITIC]

export const HEX_PARTY_TILES = [
  HEX_PARTY_NO_ENTRANCE_A,
  HEX_PARTY_NO_ENTRANCE_B,
  HEX_PARTY_0_A,
  HEX_PARTY_0_B,
  HEX_PARTY_01,
  HEX_PARTY_02_A,
  HEX_PARTY_02_B,
  HEX_PARTY_03_A,
  HEX_PARTY_03_B,
  HEX_PARTY_05,
  HEX_PARTY_PEOPLE,
  HEX_PARTY_BEER,
  HEX_PARTY_CHIP
]
export const HEX_PARTY_ROTATABLE = [
  HEX_PARTY_0_A,
  HEX_PARTY_0_B,
  HEX_PARTY_01,
  HEX_PARTY_02_A,
  HEX_PARTY_02_B,
  HEX_PARTY_03_A,
  HEX_PARTY_03_B,
  HEX_PARTY_05
]

export const HEX_PARTY_FIXED = [
  HEX_PARTY_NO_ENTRANCE_A,
  HEX_PARTY_NO_ENTRANCE_B,
  HEX_PARTY_PEOPLE,
  HEX_PARTY_BEER,
  HEX_PARTY_CHIP
]

// Initial Draw Piles
export const INITIAL_DRAW_PILE_2P3P = [
  HEX_PARTY_NO_ENTRANCE_A,
  HEX_PARTY_NO_ENTRANCE_B,
  HEX_PARTY_0_A,
  HEX_PARTY_0_B,
  HEX_PARTY_01,
  HEX_PARTY_05,
  HEX_PARTY_02_A,
  HEX_PARTY_02_B,
  HEX_PARTY_03_A,
  HEX_PARTY_03_B,
  HEX_PARTY_PEOPLE,
  HEX_PARTY_BEER,
  HEX_PARTY_CHIP,
  HEX_YELLOW_PEOPLE1_A,
  HEX_YELLOW_PEOPLE1_B,
  HEX_YELLOW_PEOPLE2,
  HEX_YELLOW_BEER1_A,
  HEX_YELLOW_BEER1_B,
  HEX_YELLOW_BEER2,
  HEX_YELLOW_CHIP1_A,
  HEX_YELLOW_CHIP1_B,
  HEX_YELLOW_CHIP1_C,
  HEX_YELLOW_CHIP2,
  HEX_REAL_ESTATE_A,
  HEX_FILM_CRITIC,
  HEX_PROD_CIGAR_A,
  HEX_PROD_COMPUTER_A,
  HEX_PROD_COMPUTER_B,
  HEX_PROD_ACTRESS_A,
  HEX_PROD_SFX_A,
  HEX_PROD_SCRIPT_A,
  HEX_PROD_MOVIE_ACTION,
  HEX_PROD_MOVIE_GIRLIE,
  HEX_PROD_MOVIE_SCIFI
]
export const INITIAL_DRAW_PILE_4P = [
  HEX_PARTY_NO_ENTRANCE_A,
  HEX_PARTY_NO_ENTRANCE_B,
  HEX_PARTY_0_A,
  HEX_PARTY_0_B,
  HEX_PARTY_01,
  HEX_PARTY_05,
  HEX_PARTY_02_A,
  HEX_PARTY_02_B,
  HEX_PARTY_03_A,
  HEX_PARTY_03_B,
  HEX_PARTY_PEOPLE,
  HEX_PARTY_BEER,
  HEX_PARTY_CHIP,
  HEX_YELLOW_PEOPLE1_A,
  HEX_YELLOW_PEOPLE1_B,
  HEX_YELLOW_PEOPLE2,
  HEX_YELLOW_BEER1_A,
  HEX_YELLOW_BEER1_B,
  HEX_YELLOW_BEER2,
  HEX_YELLOW_CHIP1_A,
  HEX_YELLOW_CHIP1_B,
  HEX_YELLOW_CHIP1_C,
  HEX_YELLOW_CHIP1_D,
  HEX_YELLOW_CHIP2,
  HEX_REAL_ESTATE_A,
  HEX_REAL_ESTATE_B,
  HEX_FILM_CRITIC,
  HEX_PROD_CIGAR_A,
  HEX_PROD_CIGAR_B,
  HEX_PROD_COMPUTER_A,
  HEX_PROD_COMPUTER_B,
  HEX_PROD_COMPUTER_C,
  HEX_PROD_ACTRESS_A,
  HEX_PROD_ACTRESS_B,
  HEX_PROD_SFX_A,
  HEX_PROD_SFX_B,
  HEX_PROD_SCRIPT_A,
  HEX_PROD_SCRIPT_B,
  HEX_PROD_MOVIE_ACTION,
  HEX_PROD_MOVIE_GIRLIE,
  HEX_PROD_MOVIE_SCIFI
]

// Resources, produced from tiles. Used days of the week storage, and on your turn
export const RES_PEOPLE = 0
export const RES_BEER = 1
export const RES_CHIP = 2
export const RES_COMPUTER = 3
export const RES_ACTRESS = 4
export const RES_SFX = 5
export const RES_SCRIPT = 6
export const RES_MOVIE_ACTION = 7
export const RES_MOVIE_GIRLIE = 8
export const RES_MOVIE_SCIFI = 9
export const RES_MONEY = 10
export const RES_FILM_CRITIC = 11
export const RES_CIGAR = 12
export const RES_PIRATE = 13

export const RES_MOVIE_OFFET = 7

// Production opportunities, from tiles in your network
export const PROD_FILM_CRITIC = 0
export const PROD_CIGAR = 1
export const PROD_COMPUTER = 2
export const PROD_ACTRESS = 3
export const PROD_SFX = 4
export const PROD_SCRIPT = 5
export const PROD_MOVIE_ACTION = 6
export const PROD_MOVIE_GIRLIE = 7
export const PROD_MOVIE_SCIFI = 8
export const PROD_CANNES = 9
export const PROD_PIRATE = 10

export function collectResAndProdFromHexRefs(hexRefs) {
  const store = useModelStore()

  let res = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  let prod = []
  for (let i = 0; i < hexRefs.length; i++) {
    if (hexRefs[i] === HEX_PARTY_PEOPLE) res[RES_PEOPLE]++
    else if (hexRefs[i] === HEX_PARTY_BEER) res[RES_BEER]++
    else if (hexRefs[i] === HEX_PARTY_CHIP) res[RES_CHIP]++

    else if (hexRefs[i] === HEX_YELLOW_PEOPLE1_A) res[RES_PEOPLE]++
    else if (hexRefs[i] === HEX_YELLOW_PEOPLE1_B) res[RES_PEOPLE]++
    else if (hexRefs[i] === HEX_YELLOW_PEOPLE2) res[RES_PEOPLE] += 2
    else if (hexRefs[i] === HEX_YELLOW_BEER1_A) res[RES_BEER]++
    else if (hexRefs[i] === HEX_YELLOW_BEER1_B) res[RES_BEER]++
    else if (hexRefs[i] === HEX_YELLOW_BEER2) res[RES_BEER] += 2
    else if (hexRefs[i] === HEX_YELLOW_CHIP1_A) res[RES_CHIP]++
    else if (hexRefs[i] === HEX_YELLOW_CHIP1_B) res[RES_CHIP]++
    else if (hexRefs[i] === HEX_YELLOW_CHIP1_C) res[RES_CHIP]++
    else if (hexRefs[i] === HEX_YELLOW_CHIP1_D) res[RES_CHIP]++
    else if (hexRefs[i] === HEX_YELLOW_CHIP2) res[RES_CHIP] += 2

    else if (hexRefs[i] === HEX_FILM_CRITIC) prod.push(PROD_FILM_CRITIC)

    else if (hexRefs[i] === HEX_PROD_CIGAR_A) prod.push(PROD_CIGAR)
    else if (hexRefs[i] === HEX_PROD_CIGAR_B) prod.push(PROD_CIGAR)
    else if (hexRefs[i] === HEX_PROD_COMPUTER_A) prod.push(PROD_COMPUTER)
    else if (hexRefs[i] === HEX_PROD_COMPUTER_B) prod.push(PROD_COMPUTER)
    else if (hexRefs[i] === HEX_PROD_COMPUTER_C) prod.push(PROD_COMPUTER)
    else if (hexRefs[i] === HEX_PROD_ACTRESS_A) prod.push(PROD_ACTRESS)
    else if (hexRefs[i] === HEX_PROD_ACTRESS_B) prod.push(PROD_ACTRESS)
    else if (hexRefs[i] === HEX_PROD_SFX_A) prod.push(PROD_SFX)
    else if (hexRefs[i] === HEX_PROD_SFX_B) prod.push(PROD_SFX)
    else if (hexRefs[i] === HEX_PROD_SCRIPT_A) prod.push(PROD_SCRIPT)
    else if (hexRefs[i] === HEX_PROD_SCRIPT_B) prod.push(PROD_SCRIPT)
    else if (hexRefs[i] === HEX_PROD_MOVIE_ACTION) prod.push(PROD_MOVIE_ACTION)
    else if (hexRefs[i] === HEX_PROD_MOVIE_GIRLIE) prod.push(PROD_MOVIE_GIRLIE)
    else if (hexRefs[i] === HEX_PROD_MOVIE_SCIFI) prod.push(PROD_MOVIE_SCIFI)

    else if (hexRefs[i] === HEX_CANNES_L) prod.push(PROD_CANNES)
    else if (hexRefs[i] === HEX_CANNES_R) prod.push(PROD_CANNES)
    else if (hexRefs[i] === HEX_CANNES_L4P) prod.push(PROD_CANNES)
    else if (hexRefs[i] === HEX_CANNES_R4P) prod.push(PROD_CANNES)

    if (store.useExpansion && hexRefs[i] === store.pirateShipRef) prod.push(PROD_PIRATE)

  }
  // Make the prod array unique
  prod = [...new Set(prod)]
  // Now sort it into the order to be displayed in the production row, single inputs first
  const sortingOrder = [
    PROD_FILM_CRITIC,
    PROD_COMPUTER,
    PROD_CIGAR,
    PROD_ACTRESS,
    PROD_SFX,
    PROD_SCRIPT,
    PROD_MOVIE_ACTION,
    PROD_MOVIE_GIRLIE,
    PROD_MOVIE_SCIFI,
    PROD_PIRATE,
    PROD_CANNES
  ]

  prod.sort(function (x, y) {
    const xIndex = sortingOrder.indexOf(x);
    const yIndex = sortingOrder.indexOf(y);
    return xIndex - yIndex;
  })

  return [[...res], [...prod]]
}

export function getHexImgFromProd(prod) {
  if (prod === PROD_FILM_CRITIC) return HEX_FILM_CRITIC
  else if (prod === PROD_CIGAR) return HEX_PROD_CIGAR_A
  else if (prod === PROD_COMPUTER) return HEX_PROD_COMPUTER_A
  else if (prod === PROD_ACTRESS) return HEX_PROD_ACTRESS_A
  else if (prod === PROD_SFX) return HEX_PROD_SFX_A
  else if (prod === PROD_SCRIPT) return HEX_PROD_SCRIPT_A
  else if (prod === PROD_MOVIE_ACTION) return HEX_PROD_MOVIE_ACTION
  else if (prod === PROD_MOVIE_GIRLIE) return HEX_PROD_MOVIE_GIRLIE
  else if (prod === PROD_MOVIE_SCIFI) return HEX_PROD_MOVIE_SCIFI
  else if (prod === PROD_CANNES) return HEX_CANNES_L
}

export function getInputForProduction(prod) {
  if (prod === PROD_FILM_CRITIC) return [RES_BEER]
  else if (prod === PROD_CIGAR) return [RES_PEOPLE, RES_PEOPLE]
  else if (prod === PROD_COMPUTER) return [RES_CHIP]
  else if (prod === PROD_ACTRESS) return [RES_PEOPLE, RES_PEOPLE]
  else if (prod === PROD_SFX) return [RES_COMPUTER, RES_COMPUTER]
  else if (prod === PROD_SCRIPT) return [RES_COMPUTER, RES_BEER]
  else if (prod === PROD_MOVIE_ACTION) return [RES_ACTRESS, RES_SFX]
  else if (prod === PROD_MOVIE_GIRLIE) return [RES_ACTRESS, RES_SCRIPT]
  else if (prod === PROD_MOVIE_SCIFI) return [RES_SFX, RES_SCRIPT]
  else if (prod === PROD_CANNES) return [RES_MOVIE_ACTION, RES_MOVIE_GIRLIE, RES_MOVIE_SCIFI]
  else if (prod === PROD_PIRATE) return [RES_SCRIPT, RES_ACTRESS, RES_SFX]
}

export function getOutputForProduction(prod) {
  if (prod === PROD_FILM_CRITIC) return RES_FILM_CRITIC
  else if (prod === PROD_CIGAR) return RES_CIGAR
  else if (prod === PROD_COMPUTER) return RES_COMPUTER
  else if (prod === PROD_ACTRESS) return RES_ACTRESS
  else if (prod === PROD_SFX) return RES_SFX
  else if (prod === PROD_SCRIPT) return RES_SCRIPT
  else if (prod === PROD_MOVIE_ACTION) return RES_MOVIE_ACTION
  else if (prod === PROD_MOVIE_GIRLIE) return RES_MOVIE_GIRLIE
  else if (prod === PROD_MOVIE_SCIFI) return RES_MOVIE_SCIFI
  else if (prod === PROD_CANNES) return RES_MONEY
  else if (prod === PROD_PIRATE) return RES_PIRATE
}