import * as rf from './TGZreference'


export function getPlayerSeed(num) {
  let res = []
  for (let i = 0; i < num; i++) {
    res.push(initialPlayersState[i])
  }
  return res
}

var initialPlayersState = [
  {
    name: "testPlayer0",
    displayName: "Player1",
    colour: 0,
    cows: 3,
    monuments: [],
    craftsmen: [],
    craftsmenPrices: [1, 1, 1, 1, 1, 1, 1],
    god: [[rf.NO_god, 0]],
    specialists: [],
    techs: [],
  },
  {
    name: "testPlayer1",
    displayName: "Ross",
    colour: 1,
    cows: 3,
    monuments: [],
    craftsmen: [],
    craftsmenPrices: [1, 1, 1, 1, 1, 1, 1],
    god: [[rf.NO_god, 0]],
    specialists: [],
    techs: [],
  },
  {
    name: "testPlayer2",
    displayName: "Rachel",
    colour: 2,
    cows: 3,
    monuments: [],
    craftsmen: [],
    craftsmenPrices: [1, 1, 1, 1, 1, 1, 1],
    god: [[rf.NO_god, 0]],
    specialists: [],
    techs: [],
  },
  {
    name: "testPlayer3",
    displayName: "Joey",
    colour: 3,
    cows: 3,
    monuments: [],
    craftsmen: [],
    craftsmenPrices: [1, 1, 1, 1, 1, 1, 1],
    god: [[rf.NO_god, 0]],
    specialists: [],
    techs: [],
  },
  {
    name: "testPlayer4",
    displayName: "Chandler",
    colour: 4,
    cows: 3,
    monuments: [],
    craftsmen: [],
    craftsmenPrices: [1, 1, 1, 1, 1, 1, 1],
    god: [[rf.NO_god, 0]],
    specialists: [],
    techs: [],
  }
]


