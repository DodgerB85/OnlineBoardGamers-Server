import * as rf from './CNSreference'
import hexlib from './hexlib.js'


/*export function getPlayerSeed(num) {
  let res = []
  for (let i = 0; i < num; i++) {
    res.push(initialPlayersState[i])
  }
  return res
}*/

/*export const initialPlayersState = [
  {
    name: "testPlayer0",
    displayName: "Ross",
    colour: rf.BLUE,
    storedResources: [], // max 5, on days of the week
    links: [], // 5 wooden rods to place on the map
    score: 0, // aka movie tickets / money
    seenDiscardHexRefs: [], // store the hexes you have discarded and thus KNOW are in the discard pile
  },
  {
    name: "testPlayer1",
    displayName: "Rachel",
    colour: rf.RED,
    storedResources: [], // max 5, on days of the week
    links: [], // 5 wooden rods to place on the map
    score: 0, // aka movie tickets / money
    seenDiscardHexRefs: [], // store the hexes you have discarded and thus KNOW are in the discard pile
  },
  {
    name: "testPlayer2",
    displayName: "Joey",
    colour: rf.BLACK,
    storedResources: [], // max 5, on days of the week
    links: [], // 5 wooden rods to place on the map
    score: 0, // aka movie tickets / money
    seenDiscardHexRefs: [], // store the hexes you have discarded and thus KNOW are in the discard pile
  },
  {
    name: "testPlayer3",
    displayName: "Chandler",
    colour: rf.YELLOW,
    storedResources: [], // max 5, on days of the week
    links: [], // 5 wooden rods to place on the map
    score: 0, // aka movie tickets / money
    seenDiscardHexRefs: [], // store the hexes you have discarded and thus KNOW are in the discard pile
  },
]*/

export const initialGridState2p3p = [
  {
    id: 1,
    hex: new hexlib.Hex(0, 0, 0),
    hexRef: rf.HEX_CANNES_L,
    rotation: 0
  },
  {
    id: 2,
    hex: new hexlib.Hex(1, 0, -1),
    hexRef: rf.HEX_CANNES_R,
    rotation: 0
  }
]

export const initialGridState4p = [
  {
    id: 1,
    hex: new hexlib.Hex(0, 0, 0),
    hexRef: rf.HEX_CANNES_L,
    rotation: 0
  },
  {
    id: 2,
    hex: new hexlib.Hex(1, 0, -1),
    hexRef: rf.HEX_CANNES_R,
    rotation: 0
  },
  {
    id: 3,
    hex: new hexlib.Hex(0, -1, 1),
    hexRef: rf.HEX_CANNES_L4P,
    rotation: 0
  },
  {
    id: 4,
    hex: new hexlib.Hex(1, -1, 0),
    hexRef: rf.HEX_CANNES_R4P,
    rotation: 0
  }
]


