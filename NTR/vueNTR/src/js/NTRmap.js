// NTRmap.js - Map topology and scenario definitions (client-side)
// Napoleon's Triumph - Battle of Austerlitz
// Topology comes from NTRboard.json, extracted from images/map.jpg (coordinates are map pixels).

import board from './NTRboard.json'

export const BOARD_SIZE = { width: board.size[0], height: board.size[1] }
export const VOIDS = board.voids

// =============================================================================
// LOCALES (ids are the numbers printed on the reference map)
// =============================================================================

export const LOCALES = Object.fromEntries(Object.entries(board.locales).map(([id, l]) => [id, {
  id,
  name: id,
  polygon: l.polygon,
  position: { x: l.reserve[0], y: l.reserve[1] },
  capacity: l.capacity,
  objectives: l.objectives,
  objective: l.objectives.length > 0,
  setup: l.setup,
  entry: l.entry,
  road_links: board.road_links[id] || [],
}]))

// =============================================================================
// APPROACHES (id "a-b"; penalties keyed by the locale being attacked into)
// =============================================================================

export const APPROACHES = Object.fromEntries(Object.entries(board.approaches).map(([id, a]) => [id, {
  id,
  from_locale: a.locales[0],
  to_locale: a.locales[1],
  type: a.width,
  capacity: a.width === "wide" ? 3 : 1,
  penalties: a.penalties,
  road: a.road,
  line: a.line,
}]))

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getAdjacentLocales(localeId) {
  const adjacent = new Set()
  for (const approach of Object.values(APPROACHES)) {
    if (approach.from_locale === localeId) adjacent.add(approach.to_locale)
    else if (approach.to_locale === localeId) adjacent.add(approach.from_locale)
  }
  return Array.from(adjacent)
}

export function getApproachBetween(localeA, localeB) {
  for (const approach of Object.values(APPROACHES)) {
    if ((approach.from_locale === localeA && approach.to_locale === localeB) ||
        (approach.from_locale === localeB && approach.to_locale === localeA)) {
      return approach
    }
  }
  return null
}

export function getApproachesFrom(localeId) {
  return Object.values(APPROACHES).filter(a => a.from_locale === localeId || a.to_locale === localeId)
}

// Board topology in the shape stored on store.board; never taken from saves
export function buildBoardTopology() {
  return {
    locales: Object.values(LOCALES),
    approaches: Object.values(APPROACHES).map(a => ({
      id: a.id,
      from: a.from_locale,
      to: a.to_locale,
      type: a.type,
      capacity: a.capacity,
      penalties: a.penalties,
      road: a.road,
      line: a.line,
    })),
    objectives: OBJECTIVE_LOCALES,
  }
}

// =============================================================================
// UNIT PLACEMENT HELPERS
// =============================================================================

function createUnit(type, side, locale, strength, corps, revealed = false) {
  return { type, side, locale, strength, corps, revealed }
}

// Corps IDs
export const ALLIED_CORPS = {
  AUSTRIAN: "AUSTRIAN",
  RUSSIAN_1: "RUSSIAN_1",
  RUSSIAN_2: "RUSSIAN_2",
  RUSSIAN_3: "RUSSIAN_3",
}

export const FRENCH_CORPS = {
  IMPERIAL_GUARD: "IMPERIAL_GUARD",
  I_CORPS: "I_CORPS",
  II_CORPS: "II_CORPS",
  III_CORPS: "III_CORPS",
  IV_CORPS: "IV_CORPS",
  V_CORPS: "V_CORPS",
  CAVALRY_RESERVE: "CAVALRY_RESERVE",
}

const SIDE_ALLIED = "ALLIED"
const SIDE_FRENCH = "FRENCH"
const UT_COMMANDER = "COMMANDER"
const UT_INFANTRY = "INFANTRY"
const UT_GUARD = "GUARD_INFANTRY"
const UT_CAVALRY = "CAVALRY"
const UT_ARTILLERY = "ARTILLERY"

// ponytail: scenario unit lists are still the old placeholder corps; each placeholder zone is
// pinned to a real printed set-up locale. Replace with the printed order of battle per commander.
const DEPLOY_LOCALES = {
  ALLIED_DEPLOY_N: "67",  // Bagration
  ALLIED_DEPLOY_C: "106", // Langeron
  ALLIED_DEPLOY_S: "143", // Kienmayer
  FRENCH_DEPLOY_W: "133", // Legrand
  FRENCH_DEPLOY_C: "53",  // Bessières
  FRENCH_DEPLOY_E: "64",  // Lannes
}

// =============================================================================
// SCENARIO: 1 DECEMBER (Evening Positions - Pre-Battle)
// Allies concentrated on Pratzen Heights, French before Austerlitz
// =============================================================================

const DEC_01_ALLIED_SETUP = {
  ALLIED_DEPLOY_N: [
    createUnit(UT_COMMANDER, SIDE_ALLIED, "ALLIED_DEPLOY_N", 0, "RUSSIAN_1", true), // Kutusov
    createUnit(UT_GUARD, SIDE_ALLIED, "ALLIED_DEPLOY_N", 3, "RUSSIAN_1"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_N", 2, "RUSSIAN_1"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_N", 2, "RUSSIAN_1"),
  ],
  ALLIED_DEPLOY_C: [
    createUnit(UT_COMMANDER, SIDE_ALLIED, "ALLIED_DEPLOY_C", 0, "AUSTRIAN", true),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_C", 3, "AUSTRIAN"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_C", 2, "AUSTRIAN"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_C", 2, "RUSSIAN_2"),
  ],
  ALLIED_DEPLOY_S: [
    createUnit(UT_COMMANDER, SIDE_ALLIED, "ALLIED_DEPLOY_S", 0, "RUSSIAN_3", true),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_S", 2, "RUSSIAN_3"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_S", 2, "RUSSIAN_3"),
    createUnit(UT_CAVALRY, SIDE_ALLIED, "ALLIED_DEPLOY_S", 2, "RUSSIAN_3"),
  ],
}

const DEC_01_FRENCH_SETUP = {
  FRENCH_DEPLOY_W: [
    createUnit(UT_COMMANDER, SIDE_FRENCH, "FRENCH_DEPLOY_W", 0, "III_CORPS", true), // Davout
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_W", 3, "III_CORPS"),
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_W", 2, "III_CORPS"),
    createUnit(UT_ARTILLERY, SIDE_FRENCH, "FRENCH_DEPLOY_W", 1, "III_CORPS"),
  ],
  FRENCH_DEPLOY_C: [
    createUnit(UT_COMMANDER, SIDE_FRENCH, "FRENCH_DEPLOY_C", 0, "IMPERIAL_GUARD", true), // Napoleon
    createUnit(UT_GUARD, SIDE_FRENCH, "FRENCH_DEPLOY_C", 3, "IMPERIAL_GUARD"),
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_C", 3, "I_CORPS"),
    createUnit(UT_ARTILLERY, SIDE_FRENCH, "FRENCH_DEPLOY_C", 1, "IMPERIAL_GUARD"),
  ],
  FRENCH_DEPLOY_E: [
    createUnit(UT_COMMANDER, SIDE_FRENCH, "FRENCH_DEPLOY_E", 0, "IV_CORPS", true), // Soult
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_E", 3, "IV_CORPS"),
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_E", 2, "V_CORPS"),
    createUnit(UT_CAVALRY, SIDE_FRENCH, "FRENCH_DEPLOY_E", 2, "CAVALRY_RESERVE"),
  ],
}

// =============================================================================
// SCENARIO: 2 DECEMBER (Morning - Historical Battle)
// Allies moving southward, French awaiting attack
// =============================================================================

const DEC_02_ALLIED_SETUP = {
  ALLIED_DEPLOY_N: [
    createUnit(UT_COMMANDER, SIDE_ALLIED, "ALLIED_DEPLOY_N", 0, "RUSSIAN_1", true),
    createUnit(UT_GUARD, SIDE_ALLIED, "ALLIED_DEPLOY_N", 3, "RUSSIAN_1"),
  ],
  ALLIED_DEPLOY_C: [
    createUnit(UT_COMMANDER, SIDE_ALLIED, "ALLIED_DEPLOY_C", 0, "AUSTRIAN", true),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_C", 3, "AUSTRIAN"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_C", 2, "RUSSIAN_1"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_C", 2, "RUSSIAN_2"),
  ],
  ALLIED_DEPLOY_S: [
    createUnit(UT_COMMANDER, SIDE_ALLIED, "ALLIED_DEPLOY_S", 0, "RUSSIAN_3", true),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_S", 2, "RUSSIAN_3"),
    createUnit(UT_INFANTRY, SIDE_ALLIED, "ALLIED_DEPLOY_S", 2, "RUSSIAN_3"),
    createUnit(UT_CAVALRY, SIDE_ALLIED, "ALLIED_DEPLOY_S", 2, "RUSSIAN_3"),
  ],
}

const DEC_02_FRENCH_SETUP = {
  FRENCH_DEPLOY_W: [
    createUnit(UT_COMMANDER, SIDE_FRENCH, "FRENCH_DEPLOY_W", 0, "III_CORPS", true), // Davout
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_W", 3, "III_CORPS"),
  ],
  FRENCH_DEPLOY_C: [
    createUnit(UT_COMMANDER, SIDE_FRENCH, "FRENCH_DEPLOY_C", 0, "IMPERIAL_GUARD", true), // Napoleon
    createUnit(UT_GUARD, SIDE_FRENCH, "FRENCH_DEPLOY_C", 3, "IMPERIAL_GUARD"),
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_C", 3, "I_CORPS"),
    createUnit(UT_ARTILLERY, SIDE_FRENCH, "FRENCH_DEPLOY_C", 1, "IMPERIAL_GUARD"),
  ],
  FRENCH_DEPLOY_E: [
    createUnit(UT_COMMANDER, SIDE_FRENCH, "FRENCH_DEPLOY_E", 0, "IV_CORPS", true), // Soult
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_E", 3, "IV_CORPS"),
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_E", 2, "V_CORPS"),
    createUnit(UT_CAVALRY, SIDE_FRENCH, "FRENCH_DEPLOY_E", 2, "CAVALRY_RESERVE"),
  ],
}

// French Reinforcements (added when option enabled)
const FRENCH_REINFORCEMENT_UNITS = {
  FRENCH_DEPLOY_W: [
    createUnit(UT_INFANTRY, SIDE_FRENCH, "FRENCH_DEPLOY_W", 2, "I_CORPS"),
  ],
  FRENCH_DEPLOY_E: [
    createUnit(UT_CAVALRY, SIDE_FRENCH, "FRENCH_DEPLOY_E", 2, "CAVALRY_RESERVE"),
  ],
}

// =============================================================================
// SCENARIO REGISTRY
// =============================================================================

export const SCENARIOS = {
  dec_01: {
    slug: "dec_01",
    name: "1 December 1805 (Evening Positions)",
    description: "Allied army concentrated on the Pratzen Heights. French deployed before Austerlitz. Historical starting positions for the evening before the battle.",
    starting_morale: { ALLIED: 12, FRENCH: 12 },
    allied_setup: DEC_01_ALLIED_SETUP,
    french_setup: DEC_01_FRENCH_SETUP,
  },
  dec_02: {
    slug: "dec_02",
    name: "2 December 1805 (Morning - Historical Battle)",
    description: "Historical morning of the battle. Allies have begun their southward movement. French await the attack.",
    starting_morale: { ALLIED: 12, FRENCH: 12 },
    allied_setup: DEC_02_ALLIED_SETUP,
    french_setup: DEC_02_FRENCH_SETUP,
  },
}

export const SCENARIO_CHOICES = [
  { value: "dec_01", label: "1 December 1805 (Evening Positions)" },
  { value: "dec_02", label: "2 December 1805 (Morning - Historical Battle)" },
]

export function getScenario(slug) {
  return SCENARIOS[slug] || SCENARIOS.dec_01
}

// =============================================================================
// BUILD INITIAL GAME STATE (client-side factory)
// =============================================================================

export function buildInitialGameState(scenarioSlug, options) {
  const scenario = getScenario(scenarioSlug)
  const { french_reinforcements = false, santon_fort = false, team_play = false } = options || {}

  const allUnits = []
  let unitIdCounter = 1

  function addUnits(setupDict, sidePrefix) {
    for (const [localeId, units] of Object.entries(setupDict)) {
      for (const unit of units) {
        allUnits.push({
          id: `${sidePrefix}${unitIdCounter++}`,
          type: unit.type,
          side: unit.side,
          locale: DEPLOY_LOCALES[unit.locale],
          strength: unit.strength,
          corps: unit.corps,
          revealed: unit.revealed,
        })
      }
    }
  }

  addUnits(scenario.allied_setup, "A")
  addUnits(scenario.french_setup, "F")

  // Add French reinforcements if option enabled
  if (french_reinforcements) {
    for (const [localeId, units] of Object.entries(FRENCH_REINFORCEMENT_UNITS)) {
      for (const unit of units) {
        allUnits.push({
          id: `F${unitIdCounter++}`,
          type: unit.type,
          side: unit.side,
          locale: DEPLOY_LOCALES[unit.locale],
          strength: unit.strength,
          corps: unit.corps,
          revealed: unit.revealed,
        })
      }
    }
  }

  return {
    version: 1,
    scenario: scenarioSlug,
    options: { french_reinforcements, santon_fort, team_play },
    turn: 1,
    phase: 0, // 0 = Allied turn, 1 = French turn
    board: {
      ...buildBoardTopology(),
      units: allUnits,
      morale: { allied: scenario.starting_morale.ALLIED, french: scenario.starting_morale.FRENCH },
      round: 1,
    },
    fog_of_war: { allied_hidden: [], french_hidden: [] },
  }
}

// =============================================================================
// OBJECTIVE LOCALES
// =============================================================================

export const OBJECTIVE_LOCALES = Object.values(LOCALES).filter(l => l.objective).map(l => l.id)

// =============================================================================
// MAP TOPOLOGY EXPORT
// =============================================================================

export const MAP_TOPOLOGY = {
  locales: LOCALES,
  approaches: APPROACHES,
  objectives: OBJECTIVE_LOCALES,
}