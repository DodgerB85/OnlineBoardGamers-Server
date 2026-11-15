import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'

function load(name, mocks) {
 const source = readFileSync(new URL(`../src/js/${name}.js`, import.meta.url), 'utf8')
 return vm.createContext({ ...mocks, source })
}
function run(context) {
 vm.runInContext(context.source.replace(/^import .*$/gm, '').replace(/export /g, ''), context)
 return context
}

test('invalid exhibitions consume caravan and artwork, drop geese, and replay identically', () => {
 const caravan = { id: 1, type: 8, ownerIndex: 0, location: [1, 7, 0] }
 const art = { type: 10, location: [2, 1] }
 const goose = { location: [3, 1] }
 const store = { gameOptions: { useArt: true }, gameflow: { phase: 4 }, context: {}, players: [{}, {}] }
 const actions = []
 const c = run(load('RNBatelier', {
  useModelStore: () => store,
  rf: { EXHIBITION_TRANSPORTER: 8, PHASE_MOVEMENTS: [4], STACK_EXHIBITION: 27 },
  model: { homeMarkersOnHex: () => [{ ownerIndex: 1 }], resourcesOnTransport: () => [art], resourcesFollowingTransporter: () => [goose], getTransporterByID: () => caravan },
  loc: { isOOBlocation: l => l[0] === -1, setOOBlocation: () => [-1], convertLocationToBucket: l => l },
  stack: { getTransIDtoUse: () => 1, addItemToStack: a => actions.push(a) }
 }))
 assert.equal(c.checkExhibitionOnMove(caravan), true)
 assert.equal(caravan.location[0], -1)
 assert.equal(art.location[0], -1)
 assert.equal(goose.location[1], 7)
 assert.equal(actions[0].historyEntry[4], 0)
 assert.equal(c.countDistinctShows(0), 0)
 caravan.location = [1, 7, 0]
 c.performExhibitionStackAction(actions[0].historyEntry)
 assert.equal(caravan.location[0], -1)
})

test('fare brought by another transporter cannot pay', () => {
 const c = run(load('RNBtrain', {
  rf: { RES_GOOSE: 99 },
  loc: { isOnSpecificTransporter: (l, id) => l[0] === 2 && l[1] === id, isOnAnyTransporter: l => l[0] === 2, isSpecificHexLocation: (l, id) => l[1] === id }
 }))
 const transporter = { id: 1, location: [1, 7] }
 assert.equal(c.isFareAccessible({ type: 0, movedTransporterID: -1, location: [1, 7] }, transporter), true)
 assert.equal(c.isFareAccessible({ type: 0, movedTransporterID: 1, location: [2, 1] }, transporter), true)
 assert.equal(c.isFareAccessible({ type: 0, movedTransporterID: -1, location: [1, 8] }, transporter), false)
 assert.equal(c.isFareAccessible({ type: 0, movedTransporterID: 2, location: [1, 7] }, transporter), false)
})


test('pending exhibition flush runs once; cancellation prevents stale model access', () => {
 let timer
 let lookups = 0
 const c = run(load('RNBatelier', {
  setTimeout: callback => { timer = callback; return 1 },
  clearTimeout: () => { timer = null },
  model: { getTransporterByID: () => { lookups++; return null } }
 }))
 c.scheduleExhibitionAfterAnimation({ id: 1 }, () => {})
 assert.equal(typeof timer, 'function')
 c.flushPendingExhibition()
 c.flushPendingExhibition()
 assert.equal(lookups, 1)
 assert.equal(timer, null)
 c.scheduleExhibitionAfterAnimation({ id: 1 }, () => {})
 c.cancelPendingExhibition()
 c.flushPendingExhibition()
 assert.equal(timer, null)
 assert.equal(lookups, 1)
})

test('exhibition verifier accepts valid arrival, rejects bad scores and wrong homes', () => {
 const caravan = { id: 1, ownerIndex: 0, type: 8, location: [1, 7, 0] }
 let beauty = 3
 const c = run(load('RNBstack', {
  useModelStore: () => ({}),
  rf: { STACK_EXHIBITION: 27, EXHIBITION_TRANSPORTER: 8 },
  atelier: { isArtEnabled: () => true },
  model: { getTransporterByID: () => caravan, homeMarkersOnHex: () => [{ ownerIndex: 1 }], resourcesOnTransport: () => Array.from({ length: beauty }, (_, type) => ({ type })) },
  loc: { isOOBlocation: () => false }
 }))
 const action = { action: 27, playerIndex: 0, historyEntry: [27, 1, 0, 1, 3] }
 assert.equal(c.verifySingleStackAction(action), 0)
 // The recorded beauty may be stale (another player's show landed first); the
 // value is recomputed at application, so a valid-looking record still verifies.
 action.historyEntry[4] = 4
 assert.equal(c.verifySingleStackAction(action), 0)
 action.historyEntry[4] = 2
 assert.equal(c.verifySingleStackAction(action), 4)
 beauty = 2
 action.historyEntry[4] = 0
 assert.equal(c.verifySingleStackAction(action), 0)
 action.historyEntry[3] = 2
 assert.equal(c.verifySingleStackAction(action), 3)
})

test('pre-set show applied after a better show is a no-show but still vanishes', () => {
 const caravan = { id: 1, type: 8, ownerIndex: 0, location: [1, 7, 0] }
 const arts = [{ type: 10 }, { type: 11 }, { type: 12 }]
 const store = { gameOptions: { useArt: true }, gameflow: { phase: 4 }, context: {}, players: [{ artShownAt: {} }, { artShownAt: {} }, { artShownAt: { 1: 5 } }] }
 const c = run(load('RNBatelier', {
  useModelStore: () => store,
  rf: { EXHIBITION_TRANSPORTER: 8, PHASE_MOVEMENTS: [4], STACK_EXHIBITION: 27 },
  model: { getTransporterByID: () => caravan, homeMarkersOnHex: () => [{ ownerIndex: 1 }], resourcesOnTransport: () => arts, resourcesFollowingTransporter: () => [] },
  loc: { isOOBlocation: l => l[0] === -1, setOOBlocation: () => [-1], convertLocationToBucket: l => l },
  stack: { getTransIDtoUse: () => 1, addItemToStack: () => {} }
 }))
 const action = [27, 1, 0, 1, 3]
 assert.equal(c.performExhibitionStackAction(action), 0)
 assert.equal(action[4], 0)
 assert.equal(caravan.location[0], -1)
 assert.equal(c.countDistinctShows(0), 0)
})
