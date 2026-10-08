/**
 * Great Western Trail - engine core.
 *
 * Ported faithfully from boardgamefiesta `com.boardgamefiesta.row.logic`
 * (GPL-3.0, Copyright (C) 2021 Tom Wetjens). Framework-free.
 *
 * Action "class" identity is represented by the ActionType string, which is the
 * same identity the Java engine uses (one command class <=> one ActionType).
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum CattleType {
	JERSEY = "JERSEY",
	GUERNSEY = "GUERNSEY",
	BLACK_ANGUS = "BLACK_ANGUS",
	DUTCH_BELT = "DUTCH_BELT",
	SIMMENTAL = "SIMMENTAL",
	HOLSTEIN = "HOLSTEIN",
	BROWN_SWISS = "BROWN_SWISS",
	AYRSHIRE = "AYRSHIRE",
	WEST_HIGHLAND = "WEST_HIGHLAND",
	TEXAS_LONGHORN = "TEXAS_LONGHORN",
}

export const CATTLE_DEFAULT_VALUE: Record<CattleType, number> = {
	[CattleType.JERSEY]: 1,
	[CattleType.GUERNSEY]: 2,
	[CattleType.BLACK_ANGUS]: 2,
	[CattleType.DUTCH_BELT]: 2,
	[CattleType.SIMMENTAL]: 0,
	[CattleType.HOLSTEIN]: 3,
	[CattleType.BROWN_SWISS]: 3,
	[CattleType.AYRSHIRE]: 3,
	[CattleType.WEST_HIGHLAND]: 4,
	[CattleType.TEXAS_LONGHORN]: 5,
}

export enum Worker {
	COWBOY = "COWBOY",
	CRAFTSMAN = "CRAFTSMAN",
	ENGINEER = "ENGINEER",
}

export enum HazardType {
	FLOOD = "FLOOD",
	DROUGHT = "DROUGHT",
	ROCKFALL = "ROCKFALL",
}

export enum Hand {
	NONE = "NONE",
	GREEN = "GREEN",
	BLACK = "BLACK",
	BOTH = "BOTH",
}

const HAND_FEES: Record<Hand, [number, number, number]> = {
	[Hand.NONE]: [0, 0, 0],
	[Hand.GREEN]: [2, 2, 1],
	[Hand.BLACK]: [2, 1, 2],
	[Hand.BOTH]: [4, 3, 3],
}

export function handFee(hand: Hand, playerCount: number): number {
	const idx = Math.max(0, Math.min(playerCount - 2, 2))
	return HAND_FEES[hand][idx]
}

export enum Teepee {
	BLUE = "BLUE",
	GREEN = "GREEN",
}

export enum City {
	KANSAS_CITY = "KANSAS_CITY",
	TOPEKA = "TOPEKA",
	WICHITA = "WICHITA",
	COLORADO_SPRINGS = "COLORADO_SPRINGS",
	SANTA_FE = "SANTA_FE",
	ALBUQUERQUE = "ALBUQUERQUE",
	EL_PASO = "EL_PASO",
	SAN_DIEGO = "SAN_DIEGO",
	SACRAMENTO = "SACRAMENTO",
	SAN_FRANCISCO = "SAN_FRANCISCO",
	FULTON = "FULTON",
	BLOOMINGTON = "BLOOMINGTON",
	PEORIA = "PEORIA",
	CHICAGO_2 = "CHICAGO_2",
	TOLEDO = "TOLEDO",
	PITTSBURGH_2 = "PITTSBURGH_2",
	PHILADELPHIA = "PHILADELPHIA",
	COLUMBIA = "COLUMBIA",
	ST_LOUIS = "ST_LOUIS",
	CHICAGO = "CHICAGO",
	DETROIT = "DETROIT",
	CLEVELAND = "CLEVELAND",
	PITTSBURGH = "PITTSBURGH",
	NEW_YORK_CITY = "NEW_YORK_CITY",
	MEMPHIS = "MEMPHIS",
	DENVER = "DENVER",
	MILWAUKEE = "MILWAUKEE",
	GREEN_BAY = "GREEN_BAY",
	MINNEAPOLIS = "MINNEAPOLIS",
	TORONTO = "TORONTO",
	MONTREAL = "MONTREAL",
}

export enum DiscColor {
	WHITE = "WHITE",
	BLACK = "BLACK",
}

export enum Unlockable {
	CERT_LIMIT_4 = "CERT_LIMIT_4",
	CERT_LIMIT_6 = "CERT_LIMIT_6",
	EXTRA_STEP_DOLLARS = "EXTRA_STEP_DOLLARS",
	EXTRA_STEP_POINTS = "EXTRA_STEP_POINTS",
	EXTRA_CARD = "EXTRA_CARD",
	AUX_GAIN_DOLLAR = "AUX_GAIN_DOLLAR",
	AUX_DRAW_CARD_TO_DISCARD_CARD = "AUX_DRAW_CARD_TO_DISCARD_CARD",
	AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT = "AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT",
	AUX_PAY_TO_MOVE_ENGINE_FORWARD = "AUX_PAY_TO_MOVE_ENGINE_FORWARD",
	AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD = "AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD",
	AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET = "AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET",
}

export const UNLOCKABLE_INFO: Record<Unlockable, { count: number; discColor: DiscColor; cost: number }> = {
	[Unlockable.CERT_LIMIT_4]: { count: 1, discColor: DiscColor.WHITE, cost: 0 },
	[Unlockable.CERT_LIMIT_6]: { count: 1, discColor: DiscColor.BLACK, cost: 0 },
	[Unlockable.EXTRA_STEP_DOLLARS]: { count: 1, discColor: DiscColor.BLACK, cost: 0 },
	[Unlockable.EXTRA_STEP_POINTS]: { count: 1, discColor: DiscColor.BLACK, cost: 0 },
	[Unlockable.EXTRA_CARD]: { count: 2, discColor: DiscColor.BLACK, cost: 5 },
	[Unlockable.AUX_GAIN_DOLLAR]: { count: 2, discColor: DiscColor.WHITE, cost: 0 },
	[Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD]: { count: 2, discColor: DiscColor.WHITE, cost: 0 },
	[Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT]: { count: 2, discColor: DiscColor.WHITE, cost: 0 },
	[Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD]: { count: 2, discColor: DiscColor.WHITE, cost: 0 },
	[Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD]: { count: 2, discColor: DiscColor.WHITE, cost: 0 },
	[Unlockable.AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET]: { count: 2, discColor: DiscColor.WHITE, cost: 2 },
}

export enum ScoreCategory {
	DOLLARS = "DOLLARS",
	CATTLE_CARDS = "CATTLE_CARDS",
	OBJECTIVE_CARDS = "OBJECTIVE_CARDS",
	STATION_MASTERS = "STATION_MASTERS",
	WORKERS = "WORKERS",
	HAZARDS = "HAZARDS",
	EXTRA_STEP_POINTS = "EXTRA_STEP_POINTS",
	JOB_MARKET_TOKEN = "JOB_MARKET_TOKEN",
	BUILDINGS = "BUILDINGS",
	CITIES = "CITIES",
	BID = "BID",
	STATIONS = "STATIONS",
}

export enum Edition {
	FIRST = "FIRST",
	SECOND = "SECOND",
}

export enum Status {
	BIDDING = "BIDDING",
	STARTED = "STARTED",
	ENDED = "ENDED",
}

export enum Mode {
	ORIGINAL = "ORIGINAL",
	STRATEGIC = "STRATEGIC",
}

export enum BuildingsOption {
	BEGINNER = "BEGINNER",
	RANDOMIZED = "RANDOMIZED",
}

export enum PlayerOrderOption {
	RANDOMIZED = "RANDOMIZED",
	BIDDING = "BIDDING",
}

export enum Variant {
	ORIGINAL = "ORIGINAL",
	BALANCED = "BALANCED",
}

/** Objective Tasks (ObjectiveCard.Task). */
export enum Task {
	BUILDING = "BUILDING",
	GREEN_TEEPEE = "GREEN_TEEPEE",
	BLUE_TEEPEE = "BLUE_TEEPEE",
	HAZARD = "HAZARD",
	STATION = "STATION",
	BREEDING_VALUE_3 = "BREEDING_VALUE_3",
	BREEDING_VALUE_4 = "BREEDING_VALUE_4",
	BREEDING_VALUE_5 = "BREEDING_VALUE_5",
	SAN_FRANCISCO = "SAN_FRANCISCO",
}

/**
 * Every command, mirroring `view/ActionType`. The name == class simple name
 * uppercased with underscores stripped (enforced by ActionTypeTest.naming).
 */
export enum ActionType {
	MOVE = "MOVE",
	PLACE_BID = "PLACE_BID",
	BUY_CATTLE = "BUY_CATTLE",
	DELIVER_TO_CITY = "DELIVER_TO_CITY",
	DISCARD_CARD = "DISCARD_CARD",
	DRAW_CARD = "DRAW_CARD",
	DRAW_2_CARDS = "DRAW_2_CARDS",
	DRAW_3_CARDS = "DRAW_3_CARDS",
	DRAW_4_CARDS = "DRAW_4_CARDS",
	DRAW_5_CARDS = "DRAW_5_CARDS",
	DRAW_6_CARDS = "DRAW_6_CARDS",
	DRAW_2_CATTLE_CARDS = "DRAW_2_CATTLE_CARDS",
	GAIN_1_DOLLAR = "GAIN_1_DOLLAR",
	GAIN_2_DOLLARS = "GAIN_2_DOLLARS",
	GAIN_3_DOLLARS = "GAIN_3_DOLLARS",
	GAIN_4_DOLLARS = "GAIN_4_DOLLARS",
	GAIN_5_DOLLARS = "GAIN_5_DOLLARS",
	GAIN_12_DOLLARS = "GAIN_12_DOLLARS",
	GAIN_1_CERTIFICATE = "GAIN_1_CERTIFICATE",
	GAIN_2_CERTIFICATES = "GAIN_2_CERTIFICATES",
	GAIN_1_DOLLAR_PER_ENGINEER = "GAIN_1_DOLLAR_PER_ENGINEER",
	GAIN_1_DOLLAR_PER_CRAFTSMAN = "GAIN_1_DOLLAR_PER_CRAFTSMAN",
	GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS = "GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS",
	GAIN_2_DOLLARS_PER_STATION = "GAIN_2_DOLLARS_PER_STATION",
	GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR = "GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR",
	HIRE_WORKER = "HIRE_WORKER",
	HIRE_WORKER_PLUS_2 = "HIRE_WORKER_PLUS_2",
	HIRE_WORKER_MINUS_1 = "HIRE_WORKER_MINUS_1",
	HIRE_WORKER_MINUS_2 = "HIRE_WORKER_MINUS_2",
	MOVE_1_FORWARD = "MOVE_1_FORWARD",
	MOVE_2_FORWARD = "MOVE_2_FORWARD",
	MOVE_3_FORWARD = "MOVE_3_FORWARD",
	MOVE_3_FORWARD_WITHOUT_FEES = "MOVE_3_FORWARD_WITHOUT_FEES",
	MOVE_4_FORWARD = "MOVE_4_FORWARD",
	MOVE_5_FORWARD = "MOVE_5_FORWARD",
	MOVE_ENGINE_FORWARD = "MOVE_ENGINE_FORWARD",
	MOVE_ENGINE_1_FORWARD = "MOVE_ENGINE_1_FORWARD",
	MOVE_ENGINE_2_FORWARD = "MOVE_ENGINE_2_FORWARD",
	MOVE_ENGINE_AT_MOST_2_FORWARD = "MOVE_ENGINE_AT_MOST_2_FORWARD",
	MOVE_ENGINE_AT_MOST_3_FORWARD = "MOVE_ENGINE_AT_MOST_3_FORWARD",
	MOVE_ENGINE_AT_MOST_4_FORWARD = "MOVE_ENGINE_AT_MOST_4_FORWARD",
	MOVE_ENGINE_2_OR_3_FORWARD = "MOVE_ENGINE_2_OR_3_FORWARD",
	MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS = "MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS",
	MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS = "MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS",
	MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD = "MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD",
	MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR = "MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR",
	MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS = "MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS",
	MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS = "MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS",
	MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS = "MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS",
	MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS = "MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS",
	PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD = "PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD",
	PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD = "PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD",
	PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE = "PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE",
	PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES = "PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES",
	PLACE_BUILDING = "PLACE_BUILDING",
	PLACE_CHEAP_BUILDING = "PLACE_CHEAP_BUILDING",
	PLACE_BUILDING_FOR_FREE = "PLACE_BUILDING_FOR_FREE",
	REMOVE_HAZARD = "REMOVE_HAZARD",
	REMOVE_HAZARD_FOR_2_DOLLARS = "REMOVE_HAZARD_FOR_2_DOLLARS",
	REMOVE_HAZARD_FOR_5_DOLLARS = "REMOVE_HAZARD_FOR_5_DOLLARS",
	REMOVE_HAZARD_FOR_FREE = "REMOVE_HAZARD_FOR_FREE",
	TRADE_WITH_TRIBES = "TRADE_WITH_TRIBES",
	REMOVE_CARD = "REMOVE_CARD",
	SINGLE_AUXILIARY_ACTION = "SINGLE_AUXILIARY_ACTION",
	SINGLE_OR_DOUBLE_AUXILIARY_ACTION = "SINGLE_OR_DOUBLE_AUXILIARY_ACTION",
	TAKE_OBJECTIVE_CARD = "TAKE_OBJECTIVE_CARD",
	PLAY_OBJECTIVE_CARD = "PLAY_OBJECTIVE_CARD",
	UPGRADE_STATION = "UPGRADE_STATION",
	UPGRADE_ANY_STATION_BEHIND_ENGINE = "UPGRADE_ANY_STATION_BEHIND_ENGINE",
	DOWNGRADE_STATION = "DOWNGRADE_STATION",
	APPOINT_STATION_MASTER = "APPOINT_STATION_MASTER",
	USE_ADJACENT_BUILDING = "USE_ADJACENT_BUILDING",
	CHOOSE_FORESIGHT_1 = "CHOOSE_FORESIGHT_1",
	CHOOSE_FORESIGHT_2 = "CHOOSE_FORESIGHT_2",
	CHOOSE_FORESIGHT_3 = "CHOOSE_FORESIGHT_3",
	UNLOCK_WHITE = "UNLOCK_WHITE",
	UNLOCK_BLACK_OR_WHITE = "UNLOCK_BLACK_OR_WHITE",
	EXTRAORDINARY_DELIVERY = "EXTRAORDINARY_DELIVERY",
	MAX_CERTIFICATES = "MAX_CERTIFICATES",
	DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS = "DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS",
	DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS = "DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS",
	DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE = "DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE",
	DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES = "DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES",
	DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS = "DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS",
	DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS = "DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS",
	DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS = "DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS",
	DISCARD_1_GUERNSEY = "DISCARD_1_GUERNSEY",
	DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS = "DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS",
	DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS = "DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS",
	DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES = "DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES",
	DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS = "DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS",
	DISCARD_PAIR_TO_GAIN_3_DOLLARS = "DISCARD_PAIR_TO_GAIN_3_DOLLARS",
	DISCARD_PAIR_TO_GAIN_4_DOLLARS = "DISCARD_PAIR_TO_GAIN_4_DOLLARS",
	DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES = "DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES",
	DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE = "DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE",
	DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND = "DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND",
	DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND = "DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND",
	ADD_1_OBJECTIVE_CARD_TO_HAND = "ADD_1_OBJECTIVE_CARD_TO_HAND",
	TAKE_BREEDING_VALUE_3_CATTLE_CARD = "TAKE_BREEDING_VALUE_3_CATTLE_CARD",
	DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD = "DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD",
	DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD = "DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD",
	DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS = "DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS",
	GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL = "GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL",
	DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION = "DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION",
	// The following are second-edition / Rails to the North only (not exercised by first-edition scope):
	UPGRADE_SIMMENTAL = "UPGRADE_SIMMENTAL",
	GAIN_EXCHANGE_TOKEN = "GAIN_EXCHANGE_TOKEN",
	USE_EXCHANGE_TOKEN = "USE_EXCHANGE_TOKEN",
	PLACE_BRANCHLET = "PLACE_BRANCHLET",
	DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET = "DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET",
	UPGRADE_STATION_TOWN = "UPGRADE_STATION_TOWN",
	TAKE_BONUS_STATION_MASTER = "TAKE_BONUS_STATION_MASTER",
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export enum ROWError {
	CANNOT_SKIP_ACTION = "CANNOT_SKIP_ACTION",
	CANNOT_PERFORM_ACTION = "CANNOT_PERFORM_ACTION",
	ALREADY_AT_SPACE = "ALREADY_AT_SPACE",
	ALREADY_DELIVERED_TO_CITY = "ALREADY_DELIVERED_TO_CITY",
	ALREADY_HAS_HAZARD = "ALREADY_HAS_HAZARD",
	ALREADY_HAS_STATION_MASTER = "ALREADY_HAS_STATION_MASTER",
	ALREADY_PLAYER_ON_SPACE = "ALREADY_PLAYER_ON_SPACE",
	ALREADY_UNLOCKED = "ALREADY_UNLOCKED",
	ALREADY_UPGRADED_STATION = "ALREADY_UPGRADED_STATION",
	AT_LEAST_2_PLAYERS_REQUIRED = "AT_LEAST_2_PLAYERS_REQUIRED",
	AT_MOST_4_PLAYERS_SUPPORTED = "AT_MOST_4_PLAYERS_SUPPORTED",
	BUILDING_NOT_AVAILABLE = "BUILDING_NOT_AVAILABLE",
	CANNOT_REPLACE_BUILDING_OF_OTHER_PLAYER = "CANNOT_REPLACE_BUILDING_OF_OTHER_PLAYER",
	CANNOT_REPLACE_NEUTRAL_BUILDING = "CANNOT_REPLACE_NEUTRAL_BUILDING",
	CANNOT_STEP_DIRECTLY_FROM_TO = "CANNOT_STEP_DIRECTLY_FROM_TO",
	CARD_NOT_IN_HAND = "CARD_NOT_IN_HAND",
	CATTLE_CARDS_NOT_IN_HAND = "CATTLE_CARDS_NOT_IN_HAND",
	CATTLE_CARD_NOT_AVAILABLE = "CATTLE_CARD_NOT_AVAILABLE",
	CITY_VALUE_MUST_BE_LESS_THEN_OR_EQUAL_TO_SPACES_THAT_ENGINE_MOVED_BACKWARDS = "CITY_VALUE_MUST_BE_LESS_THEN_OR_EQUAL_TO_SPACES_THAT_ENGINE_MOVED_BACKWARDS",
	GAME_ENDED = "GAME_ENDED",
	GAME_NOT_ENDED = "GAME_NOT_ENDED",
	HAZARD_MUST_BE_OF_TYPE = "HAZARD_MUST_BE_OF_TYPE",
	HAZARD_NOT_ON_TRAIL = "HAZARD_NOT_ON_TRAIL",
	JOB_MARKET_CLOSED = "JOB_MARKET_CLOSED",
	LOCATION_EMPTY = "LOCATION_EMPTY",
	LOCATION_NOT_EMPTY = "LOCATION_NOT_EMPTY",
	MUST_CHOOSE_ACTION = "MUST_CHOOSE_ACTION",
	MUST_MOVE_AT_LEAST_STEPS = "MUST_MOVE_AT_LEAST_STEPS",
	MUST_PICK_WHITE_DISC = "MUST_PICK_WHITE_DISC",
	MUST_SPECIFY_3_FORESIGHTS = "MUST_SPECIFY_3_FORESIGHTS",
	NOT_PAIR = "NOT_PAIR",
	NOT_AT_LOCATION = "NOT_AT_LOCATION",
	NOT_AT_STATION = "NOT_AT_STATION",
	NOT_ENOUGH_BALANCE_TO_PAY = "NOT_ENOUGH_BALANCE_TO_PAY",
	NOT_ENOUGH_BREEDING_VALUE = "NOT_ENOUGH_BREEDING_VALUE",
	NOT_ENOUGH_CATTLE_CARDS_OF_BREEDING_VALUE_AVAILABLE = "NOT_ENOUGH_CATTLE_CARDS_OF_BREEDING_VALUE_AVAILABLE",
	NOT_ENOUGH_CERTIFICATES = "NOT_ENOUGH_CERTIFICATES",
	NOT_ENOUGH_COWBOYS = "NOT_ENOUGH_COWBOYS",
	NOT_ENOUGH_CRAFTSMEN = "NOT_ENOUGH_CRAFTSMEN",
	NOT_ENOUGH_WORKERS = "NOT_ENOUGH_WORKERS",
	NOT_FIRST_ACTION = "NOT_FIRST_ACTION",
	NO_ACTIONS = "NO_ACTIONS",
	NO_SUCH_LOCATION = "NO_SUCH_LOCATION",
	NO_SUCH_SPACE = "NO_SUCH_SPACE",
	NO_TEEPEE_AT_LOCATION = "NO_TEEPEE_AT_LOCATION",
	OBJECTIVE_CARD_NOT_AVAILABLE = "OBJECTIVE_CARD_NOT_AVAILABLE",
	REPLACEMENT_BUILDING_MUST_BE_HIGHER = "REPLACEMENT_BUILDING_MUST_BE_HIGHER",
	REPLACEMENT_BUILDING_MUST_BE_PLAYER_BUILDING = "REPLACEMENT_BUILDING_MUST_BE_PLAYER_BUILDING",
	SPACE_NOT_REACHABLE = "SPACE_NOT_REACHABLE",
	STATION_MUST_BE_BEHIND_ENGINE = "STATION_MUST_BE_BEHIND_ENGINE",
	STATION_NOT_UPGRADED_BY_PLAYER = "STATION_NOT_UPGRADED_BY_PLAYER",
	STEPS_EXCEED_LIMIT = "STEPS_EXCEED_LIMIT",
	WORKERS_EXCEED_LIMIT = "WORKERS_EXCEED_LIMIT",
	NO_SUCH_PLAYER = "NO_SUCH_PLAYER",
	LOCATION_NOT_ADJACENT = "LOCATION_NOT_ADJACENT",
	STATION_NOT_ON_TRACK = "STATION_NOT_ON_TRACK",
	MUST_START_ON_NEUTRAL_BUILDING = "MUST_START_ON_NEUTRAL_BUILDING",
	WORKER_NOT_AVAILABLE = "WORKER_NOT_AVAILABLE",
	BID_TOO_LOW = "BID_TOO_LOW",
	BID_INVALID_POSITION = "BID_INVALID_POSITION",
	CITY_NOT_ACCESSIBLE = "CITY_NOT_ACCESSIBLE",
	ALREADY_PLACED_BRANCHLET = "ALREADY_PLACED_BRANCHLET",
	NOT_ENOUGH_EXCHANGE_TOKENS = "NOT_ENOUGH_EXCHANGE_TOKENS",
	NO_BRANCHLETS = "NO_BRANCHLETS",
	NO_SUCH_TOWN = "NO_SUCH_TOWN",
	STATION_MASTER_NOT_AVAILABLE = "STATION_MASTER_NOT_AVAILABLE",
	TOWN_NOT_ACCESSIBLE = "TOWN_NOT_ACCESSIBLE",
	NOT_CURRENT_PLAYER = "NOT_CURRENT_PLAYER",
	INVALID_CATTLE_TYPE = "INVALID_CATTLE_TYPE",
	NO_TILES_LEFT = "NO_TILES_LEFT",
	CANNOT_FORCE_END_TURN = "CANNOT_FORCE_END_TURN",
	CANNOT_UPGRADE_SIMMENTAL = "CANNOT_UPGRADE_SIMMENTAL",
	STATION_MUST_BE_DIFFERENT = "STATION_MUST_BE_DIFFERENT",
	NOT_ENOUGH_CARDS = "NOT_ENOUGH_CARDS",
	NO_AUTOMA_STATE = "NO_AUTOMA_STATE",
	NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
}

export class ROWException extends Error {
	readonly error: ROWError
	constructor(error: ROWError) {
		super(error)
		this.name = "ROWException"
		this.error = error
	}
}

// ---------------------------------------------------------------------------
// Random - faithful java.util.Random clone + replay tape
// ---------------------------------------------------------------------------

export interface Rng {
	next(bits: number): number
	int(bound: number): number
	boolean(): boolean
}

const JAVA_MULT = 0x5deece66dn
const JAVA_ADD = 0xbn
const JAVA_MASK = (1n << 48n) - 1n

/** Port of java.util.Random (48-bit LCG). Needed to replay Java fixtures. */
export class JavaRandom implements Rng {
	private seed: bigint

	constructor(seed: number | bigint) {
		this.seed = (BigInt(seed) ^ JAVA_MULT) & JAVA_MASK
	}

	next(bits: number): number {
		this.seed = (this.seed * JAVA_MULT + JAVA_ADD) & JAVA_MASK
		const result = this.seed >> BigInt(48 - bits)
		// next(31) returns a signed 32-bit value; keep it as Java does.
		return Number(BigInt.asIntN(32, result))
	}

	/** java.util.Random.nextInt(bound) semantics. */
	int(bound: number): number {
		if (bound <= 0) throw new Error("bound must be positive")
		if ((bound & -bound) === bound) {
			// Power of two: Java still draws 31 bits here.
			return Math.floor((bound * this.next(31)) / 0x80000000)
		}
		let bits: number
		let val: number
		do {
			bits = this.next(31)
			val = bits % bound
		} while (bits - val + (bound - 1) < 0)
		return val
	}

	boolean(): boolean {
		return this.next(1) !== 0
	}

	/** java.util.Random.nextDouble(). */
	double(): number {
		return ((this.next(26) << 27) + this.next(27)) / (1 << 53)
	}

	/** Snapshot/restore the internal seed so a position can be replayed exactly. */
	getState(): string {
		return this.seed.toString()
	}
	setState(state: string): void {
		this.seed = BigInt(state)
	}
}

export interface RandomTapeEntry {
	bits: number
	value: number
}

/**
 * Mirrors the Java RecordingRandom: replays a recorded tape of next(bits)
 * outputs, and (optionally) records when constructing a tape.
 */
export class RecordingRandom implements Rng {
	private tape: RandomTapeEntry[]
	private index = 0
	private recorded: RandomTapeEntry[] = []
	private recording: boolean

	constructor(tape: RandomTapeEntry[] = [], recording = false) {
		this.tape = tape
		this.recording = recording
	}

	next(bits: number): number {
		if (this.recording) {
			// Without an underlying source we cannot record real values; tape is supplied.
			throw new ROWException(ROWError.NOT_IMPLEMENTED)
		}
		if (this.index >= this.tape.length) {
			throw new Error(`Random tape exhausted at draw ${this.index} (requested ${bits} bits)`)
		}
		const entry = this.tape[this.index]
		if (entry.bits !== bits) {
			throw new Error(`Random tape mismatch at draw ${this.index}: expected ${entry.bits} bits, requested ${bits}`)
		}
		this.index++
		return entry.value
	}

	int(bound: number): number {
		// Replay the same algorithm as JavaRandom, drawing from the tape.
		if (bound <= 0) throw new Error("bound must be positive")
		if ((bound & -bound) === bound) {
			// Power of two: Java still draws 31 bits here.
			return Math.floor((bound * this.next(31)) / 0x80000000)
		}
		let bits: number
		let val: number
		do {
			bits = this.next(31)
			val = bits % bound
		} while (bits - val + (bound - 1) < 0)
		return val
	}

	boolean(): boolean {
		return this.next(1) !== 0
	}

	assertFullyConsumed(): void {
		if (this.index < this.tape.length) {
			throw new Error(`Random tape has ${this.tape.length - this.index} unused draws`)
		}
	}

	get consumed(): number {
		return this.index
	}
}

/** java.util.Collections.shuffle(list, rnd). */
export function shuffle<T>(list: T[], rnd: Rng): void {
	for (let i = list.length; i > 1; i--) {
		const j = rnd.int(i)
		const tmp = list[i - 1]
		list[i - 1] = list[j]
		list[j] = tmp
	}
}

// ---------------------------------------------------------------------------
// PossibleAction algebra (port of PossibleAction.java)
// ---------------------------------------------------------------------------

/** JSON form of the possible-action tree, so mid-turn state round-trips. */
export interface SerializedPossibleAction {
	kind: "mandatory" | "any" | "choice" | "repeat" | "whenThen"
	action?: ActionType | null
	actions?: SerializedPossibleAction[]
	atLeast?: number
	atMost?: number
	repeatingAction?: SerializedPossibleAction
	current?: SerializedPossibleAction | null
	when?: ActionType
	then?: ActionType
	thens?: number
}

export interface SerializedActionStack {
	actions: SerializedPossibleAction[]
	immediateActions: SerializedPossibleAction[]
}

export abstract class PossibleAction {
	abstract perform(action: ActionType): void
	abstract skip(): void
	abstract isFinal(): boolean
	abstract canPerform(action: ActionType): boolean
	abstract canSkip(): boolean
	abstract getPossibleActions(): Set<ActionType>
	abstract clone(): PossibleAction
	abstract serialize(): SerializedPossibleAction

	static deserialize(obj: SerializedPossibleAction): PossibleAction {
		switch (obj.kind) {
			case "mandatory":
				return new Mandatory(obj.action ?? null)
			case "any":
				return new AnyAction((obj.actions ?? []).map(PossibleAction.deserialize))
			case "choice":
				return new ChoiceAction((obj.actions ?? []).map(PossibleAction.deserialize))
			case "repeat":
				return new Repeat(obj.atLeast ?? 0, obj.atMost ?? 0, PossibleAction.deserialize(obj.repeatingAction as SerializedPossibleAction), obj.current ? PossibleAction.deserialize(obj.current) : null)
			case "whenThen":
				return new WhenThen(obj.atLeast ?? 0, obj.atMost ?? 0, obj.when as ActionType, obj.then as ActionType, obj.thens ?? 0, obj.current ? PossibleAction.deserialize(obj.current) : null)
		}
	}

	static mandatory(action: ActionType): PossibleAction {
		return new Mandatory(action)
	}
	static optionalAction(action: ActionType): PossibleAction {
		return new AnyAction([PossibleAction.mandatory(action)])
	}
	static optional(possibleAction: PossibleAction): PossibleAction {
		return new AnyAction([possibleAction])
	}
	static anyActions(actions: ActionType[]): PossibleAction {
		return new AnyAction(actions.map((a) => PossibleAction.mandatory(a)))
	}
	static any(actions: PossibleAction[]): PossibleAction {
		return new AnyAction(actions)
	}
	static repeat(atLeast: number, atMost: number, action: ActionType): PossibleAction {
		return new Repeat(atLeast, atMost, PossibleAction.optionalAction(action))
	}
	static choiceActions(actions: ActionType[]): PossibleAction {
		return new ChoiceAction(actions.map((a) => PossibleAction.optionalAction(a)))
	}
	static choice(actions: PossibleAction[]): PossibleAction {
		return new ChoiceAction(actions)
	}
	static whenThen(atLeast: number, atMost: number, when: ActionType, then: ActionType, thens = 0): PossibleAction {
		return new WhenThen(atLeast, atMost, when, then, thens)
	}
}

class Mandatory extends PossibleAction {
	private action: ActionType | null
	constructor(action: ActionType | null) {
		super()
		this.action = action
	}
	perform(action: ActionType): void {
		if (this.action !== action) throw new ROWException(ROWError.CANNOT_PERFORM_ACTION)
		this.action = null
	}
	skip(): void {
		throw new ROWException(ROWError.CANNOT_SKIP_ACTION)
	}
	isFinal(): boolean {
		return this.action === null
	}
	canPerform(action: ActionType): boolean {
		return this.action !== null && this.action === action
	}
	canSkip(): boolean {
		return false
	}
	getPossibleActions(): Set<ActionType> {
		return this.action !== null ? new Set([this.action]) : new Set()
	}
	clone(): PossibleAction {
		return new Mandatory(this.action)
	}
	serialize(): SerializedPossibleAction {
		return { kind: "mandatory", action: this.action }
	}
}

class AnyAction extends PossibleAction {
	protected actions: PossibleAction[]
	constructor(actions: PossibleAction[]) {
		super()
		this.actions = actions
	}
	perform(action: ActionType): void {
		const element = this.check(action)
		element.perform(action)
		if (element.isFinal()) this.actions = this.actions.filter((a) => a !== element)
	}
	skip(): void {
		this.actions = []
	}
	protected check(action: ActionType): PossibleAction {
		const found = this.actions.find((a) => a.canPerform(action))
		if (!found) throw new ROWException(ROWError.CANNOT_PERFORM_ACTION)
		return found
	}
	isFinal(): boolean {
		return this.actions.length === 0
	}
	canPerform(action: ActionType): boolean {
		return this.actions.some((a) => a.canPerform(action))
	}
	canSkip(): boolean {
		return true
	}
	getPossibleActions(): Set<ActionType> {
		const out = new Set<ActionType>()
		for (const a of this.actions) for (const x of a.getPossibleActions()) out.add(x)
		return out
	}
	clone(): PossibleAction {
		return new AnyAction(this.actions.map((a) => a.clone()))
	}
	serialize(): SerializedPossibleAction {
		return { kind: "any", actions: this.actions.map((a) => a.serialize()) }
	}
}

class ChoiceAction extends AnyAction {
	skip(): void {
		if (this.actions.length > 1) throw new ROWException(ROWError.MUST_CHOOSE_ACTION)
		if (this.actions.length === 1) {
			const action = this.actions[0]
			action.skip()
			if (action.isFinal()) this.actions = []
		}
	}
	perform(action: ActionType): void {
		const element = this.check(action)
		element.perform(action)
		if (element.isFinal()) {
			this.actions = []
		} else {
			this.actions = this.actions.filter((a) => a === element)
		}
	}
	canSkip(): boolean {
		return this.actions.length === 0 || (this.actions.length === 1 && this.actions[0].canSkip())
	}
	clone(): PossibleAction {
		return new ChoiceAction(this.actions.map((a) => a.clone()))
	}
	serialize(): SerializedPossibleAction {
		return { kind: "choice", actions: this.actions.map((a) => a.serialize()) }
	}
}

class Repeat extends PossibleAction {
	protected repeatingAction: PossibleAction
	protected current: PossibleAction | null
	protected atLeast: number
	protected atMost: number
	constructor(atLeast: number, atMost: number, action: PossibleAction, current: PossibleAction | null = null) {
		super()
		this.atLeast = atLeast
		this.atMost = atMost
		this.repeatingAction = action
		this.current = current
	}
	perform(action: ActionType): void {
		if (this.current === null) {
			if (this.atMost === 0) throw new ROWException(ROWError.CANNOT_PERFORM_ACTION)
			this.atLeast = Math.max(0, this.atLeast - 1)
			this.atMost--
			this.current = this.repeatingAction.clone()
		}
		this.current.perform(action)
		if (this.current.isFinal()) this.current = null
	}
	skip(): void {
		if (this.current !== null) {
			this.current.skip()
			this.current = null
		}
		if (this.atLeast > 0) throw new ROWException(ROWError.CANNOT_SKIP_ACTION)
		this.atMost = 0
	}
	isFinal(): boolean {
		return this.current === null && this.atMost === 0
	}
	canPerform(action: ActionType): boolean {
		return this.current !== null ? this.current.canPerform(action) : this.repeatingAction.canPerform(action) && this.atMost > 0
	}
	canSkip(): boolean {
		return (this.current !== null && this.current.canSkip()) || this.atLeast === 0
	}
	getPossibleActions(): Set<ActionType> {
		if (this.current !== null) return this.current.getPossibleActions()
		return this.atMost > 0 ? this.repeatingAction.getPossibleActions() : new Set()
	}
	clone(): PossibleAction {
		return new Repeat(this.atLeast, this.atMost, this.repeatingAction, this.current)
	}
	serialize(): SerializedPossibleAction {
		return {
			kind: "repeat",
			atLeast: this.atLeast,
			atMost: this.atMost,
			repeatingAction: this.repeatingAction.serialize(),
			current: this.current ? this.current.serialize() : null,
		}
	}
}

class WhenThen extends Repeat {
	private when: ActionType
	private then: ActionType
	private thens: number
	constructor(atLeast: number, atMost: number, when: ActionType, then: ActionType, thens: number, current: PossibleAction | null = null) {
		super(atLeast, atMost, PossibleAction.optionalAction(when), current)
		this.when = when
		this.then = then
		this.thens = thens
	}
	perform(action: ActionType): void {
		if (this.when === action) {
			super.perform(action)
			this.thens++
		} else if (action === this.then) {
			if (this.thens === 0) throw new ROWException(ROWError.CANNOT_PERFORM_ACTION)
			this.thens--
		}
	}
	skip(): void {
		if (this.thens > 0) throw new ROWException(ROWError.CANNOT_SKIP_ACTION)
		super.skip()
	}
	isFinal(): boolean {
		return this.thens === 0 && super.isFinal()
	}
	canPerform(action: ActionType): boolean {
		if (action === this.then) return this.thens > 0
		return super.canPerform(action)
	}
	getPossibleActions(): Set<ActionType> {
		if (this.thens > 0) {
			const out = super.getPossibleActions()
			out.add(this.then)
			return out
		}
		return super.getPossibleActions()
	}
	clone(): PossibleAction {
		return new WhenThen(this.atLeast, this.atMost, this.when, this.then, this.thens, this.current)
	}
	serialize(): SerializedPossibleAction {
		return {
			kind: "whenThen",
			atLeast: this.atLeast,
			atMost: this.atMost,
			repeatingAction: this.repeatingAction.serialize(),
			current: this.current ? this.current.serialize() : null,
			when: this.when,
			then: this.then,
			thens: this.thens,
		}
	}
}

// ---------------------------------------------------------------------------
// ActionStack (port of ActionStack.java)
// ---------------------------------------------------------------------------

export class ActionStack {
	private actions: PossibleAction[]
	private immediateActions: PossibleAction[]

	constructor(actions: PossibleAction[] = [], immediateActions: PossibleAction[] = []) {
		// Java uses a Deque with peek() at the head; we treat index 0 as the head.
		this.actions = actions
		this.immediateActions = immediateActions
	}

	static initial(startActions: PossibleAction[]): ActionStack {
		return new ActionStack([...startActions], [])
	}

	perform(action: ActionType): void {
		const element = this.check(action)
		element.perform(action)
		if (element.isFinal()) {
			if (this.immediateActions.length === 0) {
				this.actions = this.actions.filter((a) => a !== element)
			} else {
				this.immediateActions = this.immediateActions.filter((a) => a !== element)
			}
		}
	}

	canPerform(action: ActionType): boolean {
		return !this.isEmpty() && this.peek().canPerform(action)
	}

	canSkip(): boolean {
		return !this.isEmpty() && this.peek().canSkip()
	}

	getPossibleActions(): Set<ActionType> {
		if (this.immediateActions.length > 0) return this.immediateActions[0].getPossibleActions()
		if (this.actions.length > 0) return this.actions[0].getPossibleActions()
		return new Set()
	}

	private check(action: ActionType): PossibleAction {
		const element = this.peek()
		if (!element.canPerform(action)) throw new ROWException(ROWError.NOT_FIRST_ACTION)
		return element
	}

	private peek(): PossibleAction {
		if (this.immediateActions.length === 0) {
			if (this.actions.length === 0) throw new ROWException(ROWError.NO_ACTIONS)
			return this.actions[0]
		}
		return this.immediateActions[0]
	}

	isEmpty(): boolean {
		return this.actions.length === 0 && this.immediateActions.length === 0
	}

	skipAll(): void {
		while (this.immediateActions.length > 0) this.skipFrom(this.immediateActions)
		while (this.actions.length > 0) this.skipFrom(this.actions)
	}

	skip(): void {
		if (this.immediateActions.length > 0) this.skipFrom(this.immediateActions)
		else this.skipFrom(this.actions)
	}

	private skipFrom(stack: PossibleAction[]): void {
		if (stack.length === 0) throw new ROWException(ROWError.NO_ACTIONS)
		const possibleAction = stack[0]
		possibleAction.skip()
		if (possibleAction.isFinal()) stack.shift()
	}

	size(): number {
		return this.actions.length + this.immediateActions.length
	}

	clear(): void {
		this.actions = []
		this.immediateActions = []
	}

	hasImmediate(): boolean {
		return this.immediateActions.length > 0
	}

	/** Pushes immediate actions on top, keeping relative order (Java addFirst loop). */
	addImmediateActions(immediate: PossibleAction[]): void {
		for (let i = immediate.length - 1; i >= 0; i--) this.immediateActions.unshift(immediate[i])
	}

	addActions(actions: PossibleAction[]): void {
		for (let i = actions.length - 1; i >= 0; i--) this.actions.unshift(actions[i])
	}

	addAction(action: PossibleAction): void {
		this.actions.unshift(action)
	}

	clone(): ActionStack {
		return new ActionStack(
			this.actions.map((a) => a.clone()),
			this.immediateActions.map((a) => a.clone()),
		)
	}

	serialize(): SerializedActionStack {
		return {
			actions: this.actions.map((a) => a.serialize()),
			immediateActions: this.immediateActions.map((a) => a.serialize()),
		}
	}

	static deserialize(obj: SerializedActionStack): ActionStack {
		return new ActionStack(
			(obj.actions ?? []).map(PossibleAction.deserialize),
			(obj.immediateActions ?? []).map(PossibleAction.deserialize),
		)
	}
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface PlayerInfo {
	name: string
	color: string
	type: "HUMAN" | "COMPUTER"
}

export interface CattleCard {
	type: CattleType
	points: number
	value: number
}

export interface ObjectiveCardDef {
	id: string
	tasks: Task[]
	points: number
	penalty: number
	action: ActionType | null
}

export type Card = CattleCard | ObjectiveCardDef

export function isCattleCard(card: Card): card is CattleCard {
	return (card as CattleCard).value !== undefined
}
export function isObjectiveCard(card: Card): card is ObjectiveCardDef {
	return (card as ObjectiveCardDef).tasks !== undefined
}

export interface Hazard {
	type: HazardType
	hand: Hand
	points: number
}

export interface Bid {
	position: number
	points: number
}

export interface UnlockState {
	unlocked: Record<Unlockable, number>
	discs: Record<DiscColor, number> // remaining discs
}

export interface BuildingState {
	name: string
	number: number
	side: "a" | "b"
	player: string | null // null = neutral
	hand: Hand
	craftsmen: number
	points: number
}

export interface LocationState {
	name: string
	building?: BuildingState
	teepee?: Teepee
	hazard?: Hazard
}

export interface ScoreCard {
	categories: Partial<Record<ScoreCategory, number>>
}

export interface Options {
	edition: Edition
	mode: Mode
	buildings: BuildingsOption
	playerOrder: PlayerOrderOption
	variant: Variant
	simmental: boolean
	stationMasterPromos: boolean
	building11: boolean
	building13: boolean
	railsToTheNorth: boolean
}

export function defaultOptions(edition: Edition = Edition.FIRST): Options {
	return {
		edition,
		mode: Mode.ORIGINAL,
		buildings: BuildingsOption.RANDOMIZED,
		playerOrder: PlayerOrderOption.RANDOMIZED,
		variant: Variant.ORIGINAL,
		simmental: false,
		stationMasterPromos: false,
		building11: false,
		building13: false,
		railsToTheNorth: false,
	}
}
