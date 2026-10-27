// NTRmap.js - Map topology and scenario definitions (client-side)
// Napoleon's Triumph - Battle of Austerlitz
// Based on NT_Annotated_Rules_v1.4.pdf

import * as rf from './NTRreference'

// =============================================================================
// LOCALE DEFINITIONS
// =============================================================================

export const LOCALES = {
  // Pratzen Heights - Central high ground
  PRATZEN: {
    id: "PRATZEN",
    name: "Pratzen Heights",
    terrain: rf.TERRAIN_HILL,
    position: { x: 700, y: 450 },
    objective: true,
    fort: false,
  },

  // Santon Hill - Key defensive position
  SANTON: {
    id: "SANTON",
    name: "Santon Hill",
    terrain: rf.TERRAIN_HILL,
    position: { x: 850, y: 350 },
    objective: true,
    fort: true,
  },

  // Southern towns
  TELNITZ: {
    id: "TELNITZ",
    name: "Telnitz",
    terrain: rf.TERRAIN_TOWN,
    position: { x: 550, y: 600 },
    objective: false,
    fort: false,
  },
  SOKOLNITZ: {
    id: "SOKOLNITZ",
    name: "Sokolnitz",
    terrain: rf.TERRAIN_TOWN,
    position: { x: 650, y: 650 },
    objective: false,
    fort: false,
  },

  // Pratzen area
  BLASWITZ: {
    id: "BLASWITZ",
    name: "Blaswitz",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 750, y: 550 },
    objective: false,
    fort: false,
  },
  KOBLITZ: {
    id: "KOBLITZ",
    name: "Koblitz",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 800, y: 600 },
    objective: false,
    fort: false,
  },

  // Austerlitz town - French objective
  AUSTERLITZ: {
    id: "AUSTERLITZ",
    name: "Austerlitz",
    terrain: rf.TERRAIN_TOWN,
    position: { x: 900, y: 700 },
    objective: true,
    fort: false,
  },

  // Eastern sector
  ZURLAN: {
    id: "ZURLAN",
    name: "Zurlan",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 950, y: 500 },
    objective: false,
    fort: false,
  },

  // Northern wooded area
  HOLUBITZ: {
    id: "HOLUBITZ",
    name: "Holubitz",
    terrain: rf.TERRAIN_WOODED,
    position: { x: 600, y: 400 },
    objective: false,
    fort: false,
  },

  // Pratzen wings
  PRATZEN_WEST: {
    id: "PRATZEN_WEST",
    name: "West Pratzen",
    terrain: rf.TERRAIN_HILL,
    position: { x: 600, y: 450 },
    objective: false,
    fort: false,
  },
  PRATZEN_EAST: {
    id: "PRATZEN_EAST",
    name: "East Pratzen",
    terrain: rf.TERRAIN_HILL,
    position: { x: 800, y: 450 },
    objective: false,
    fort: false,
  },

  // Northern deployment areas
  BOSSENITZ: {
    id: "BOSSENITZ",
    name: "Bosenitz",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 500, y: 500 },
    objective: false,
    fort: false,
  },
  RAKOVNICE: {
    id: "RAKOVNICE",
    name: "Rakovnice",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 450, y: 400 },
    objective: false,
    fort: false,
  },
  KRENOWITZ: {
    id: "KRENOWITZ",
    name: "Krenowitz",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 400, y: 300 },
    objective: false,
    fort: false,
  },

  // Allied deployment zones (off-map entry areas)
  ALLIED_DEPLOY_N: {
    id: "ALLIED_DEPLOY_N",
    name: "Allied Deployment North",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 500, y: 150 },
    objective: false,
    fort: false,
    deployment_zone: "allied_north",
  },
  ALLIED_DEPLOY_C: {
    id: "ALLIED_DEPLOY_C",
    name: "Allied Deployment Center",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 700, y: 150 },
    objective: false,
    fort: false,
    deployment_zone: "allied_center",
  },
  ALLIED_DEPLOY_S: {
    id: "ALLIED_DEPLOY_S",
    name: "Allied Deployment South",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 900, y: 150 },
    objective: false,
    fort: false,
    deployment_zone: "allied_south",
  },

  // French deployment zones
  FRENCH_DEPLOY_W: {
    id: "FRENCH_DEPLOY_W",
    name: "French Deployment West",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 200, y: 450 },
    objective: false,
    fort: false,
    deployment_zone: "french_west",
  },
  FRENCH_DEPLOY_C: {
    id: "FRENCH_DEPLOY_C",
    name: "French Deployment Center",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 200, y: 600 },
    objective: false,
    fort: false,
    deployment_zone: "french_center",
  },
  FRENCH_DEPLOY_E: {
    id: "FRENCH_DEPLOY_E",
    name: "French Deployment East",
    terrain: rf.TERRAIN_CLEAR,
    position: { x: 200, y: 750 },
    objective: false,
    fort: false,
    deployment_zone: "french_east",
  },
}

// =============================================================================
// APPROACH DEFINITIONS
// =============================================================================

function createApproach(id, from_loc, to_loc, type, terrain) {
  const capacity = type === "wide" ? 3 : 1
  return {
    id,
    from_locale: from_loc,
    to_locale: to_loc,
    type,        // "wide" or "narrow"
    terrain,     // clear, rough, wooded, stream, river, road
    capacity,
  }
}

export const APPROACHES = {
  // Pratzen Heights connections
  A_PRATZEN_SANTON: createApproach("A_PRATZEN_SANTON", "PRATZEN", "SANTON", "wide", "clear"),
  A_PRATZEN_BLASWITZ: createApproach("A_PRATZEN_BLASWITZ", "PRATZEN", "BLASWITZ", "wide", "clear"),
  A_PRATZEN_PRATZEN_WEST: createApproach("A_PRATZEN_PRATZEN_WEST", "PRATZEN", "PRATZEN_WEST", "wide", "clear"),
  A_PRATZEN_PRATZEN_EAST: createApproach("A_PRATZEN_PRATZEN_EAST", "PRATZEN", "PRATZEN_EAST", "wide", "clear"),
  A_PRATZEN_HOLUBITZ: createApproach("A_PRATZEN_HOLUBITZ", "PRATZEN", "HOLUBITZ", "narrow", "wooded"),
  A_PRATZEN_KOBLITZ: createApproach("A_PRATZEN_KOBLITZ", "PRATZEN", "KOBLITZ", "narrow", "rough"),

  // Santon Hill
  A_SANTON_ZURLAN: createApproach("A_SANTON_ZURLAN", "SANTON", "ZURLAN", "wide", "clear"),
  A_SANTON_KOBLITZ: createApproach("A_SANTON_KOBLITZ", "SANTON", "KOBLITZ", "narrow", "rough"),
  A_SANTON_AUSTERLITZ: createApproach("A_SANTON_AUSTERLITZ", "SANTON", "AUSTERLITZ", "narrow", "road"),

  // Telnitz/Sokolnitz
  A_TELNITZ_SOKOLNITZ: createApproach("A_TELNITZ_SOKOLNITZ", "TELNITZ", "SOKOLNITZ", "wide", "clear"),
  A_TELNITZ_BOSSENITZ: createApproach("A_TELNITZ_BOSSENITZ", "TELNITZ", "BOSSENITZ", "narrow", "stream"),
  A_SOKOLNITZ_BLASWITZ: createApproach("A_SOKOLNITZ_BLASWITZ", "SOKOLNITZ", "BLASWITZ", "wide", "clear"),
  A_SOKOLNITZ_PRATZEN_WEST: createApproach("A_SOKOLNITZ_PRATZEN_WEST", "SOKOLNITZ", "PRATZEN_WEST", "narrow", "rough"),

  // Blaswitz/Koblitz
  A_BLASWITZ_KOBLITZ: createApproach("A_BLASWITZ_KOBLITZ", "BLASWITZ", "KOBLITZ", "wide", "clear"),
  A_KOBLITZ_ZURLAN: createApproach("A_KOBLITZ_ZURLAN", "KOBLITZ", "ZURLAN", "narrow", "clear"),

  // Austerlitz
  A_AUSTERLITZ_ZURLAN: createApproach("A_AUSTERLITZ_ZURLAN", "AUSTERLITZ", "ZURLAN", "wide", "road"),
  A_AUSTERLITZ_KOBLITZ: createApproach("A_AUSTERLITZ_KOBLITZ", "AUSTERLITZ", "KOBLITZ", "narrow", "rough"),

  // Northern deployment connections
  A_ALLIED_DEPLOY_N_RAKOVNICE: createApproach("A_ALLIED_DEPLOY_N_RAKOVNICE", "ALLIED_DEPLOY_N", "RAKOVNICE", "wide", "road"),
  A_ALLIED_DEPLOY_C_KRENOWITZ: createApproach("A_ALLIED_DEPLOY_C_KRENOWITZ", "ALLIED_DEPLOY_C", "KRENOWITZ", "wide", "road"),
  A_ALLIED_DEPLOY_S_PRATZEN_EAST: createApproach("A_ALLIED_DEPLOY_S_PRATZEN_EAST", "ALLIED_DEPLOY_S", "PRATZEN_EAST", "wide", "road"),

  // French deployment connections
  A_FRENCH_DEPLOY_W_TELNITZ: createApproach("A_FRENCH_DEPLOY_W_TELNITZ", "FRENCH_DEPLOY_W", "TELNITZ", "wide", "road"),
  A_FRENCH_DEPLOY_C_SOKOLNITZ: createApproach("A_FRENCH_DEPLOY_C_SOKOLNITZ", "FRENCH_DEPLOY_C", "SOKOLNITZ", "wide", "road"),
  A_FRENCH_DEPLOY_E_AUSTERLITZ: createApproach("A_FRENCH_DEPLOY_E_AUSTERLITZ", "FRENCH_DEPLOY_E", "AUSTERLITZ", "wide", "road"),

  // Cross connections
  A_RAKOVNICE_KRENOWITZ: createApproach("A_RAKOVNICE_KRENOWITZ", "RAKOVNICE", "KRENOWITZ", "wide", "clear"),
  A_KRENOWITZ_HOLUBITZ: createApproach("A_KRENOWITZ_HOLUBITZ", "KRENOWITZ", "HOLUBITZ", "narrow", "wooded"),
  A_HOLUBITZ_PRATZEN_WEST: createApproach("A_HOLUBITZ_PRATZEN_WEST", "HOLUBITZ", "PRATZEN_WEST", "narrow", "wooded"),
  A_BOSSENITZ_RAKOVNICE: createApproach("A_BOSSENITZ_RAKOVNICE", "BOSSENITZ", "RAKOVNICE", "narrow", "clear"),
}

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
          locale: unit.locale,
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
          locale: unit.locale,
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
      locales: Object.values(LOCALES).map(l => ({
        id: l.id,
        name: l.name,
        terrain: l.terrain,
        position: l.position,
        objective: l.objective,
        fort: l.fort,
        deployment_zone: l.deployment_zone,
      })),
      approaches: Object.values(APPROACHES).map(a => ({
        id: a.id,
        from: a.from_locale,
        to: a.to_locale,
        type: a.type,
        terrain: a.terrain,
        capacity: a.capacity,
      })),
      units: allUnits,
      morale: { allied: scenario.starting_morale.ALLIED, french: scenario.starting_morale.FRENCH },
      objectives: ["PRATZEN", "SANTON", "AUSTERLITZ", "TELNITZ"],
      round: 1,
    },
    fog_of_war: { allied_hidden: [], french_hidden: [] },
  }
}

// =============================================================================
// OBJECTIVE LOCALES
// =============================================================================

export const OBJECTIVE_LOCALES = ["PRATZEN", "SANTON", "AUSTERLITZ", "TELNITZ"]

// =============================================================================
// MAP TOPOLOGY EXPORT
// =============================================================================

export const MAP_TOPOLOGY = {
  locales: LOCALES,
  approaches: APPROACHES,
  objectives: OBJECTIVE_LOCALES,
}