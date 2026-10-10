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
export var CattleType;
(function (CattleType) {
    CattleType["JERSEY"] = "JERSEY";
    CattleType["GUERNSEY"] = "GUERNSEY";
    CattleType["BLACK_ANGUS"] = "BLACK_ANGUS";
    CattleType["DUTCH_BELT"] = "DUTCH_BELT";
    CattleType["SIMMENTAL"] = "SIMMENTAL";
    CattleType["HOLSTEIN"] = "HOLSTEIN";
    CattleType["BROWN_SWISS"] = "BROWN_SWISS";
    CattleType["AYRSHIRE"] = "AYRSHIRE";
    CattleType["WEST_HIGHLAND"] = "WEST_HIGHLAND";
    CattleType["TEXAS_LONGHORN"] = "TEXAS_LONGHORN";
})(CattleType || (CattleType = {}));
export const CATTLE_DEFAULT_VALUE = {
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
};
export var Worker;
(function (Worker) {
    Worker["COWBOY"] = "COWBOY";
    Worker["CRAFTSMAN"] = "CRAFTSMAN";
    Worker["ENGINEER"] = "ENGINEER";
})(Worker || (Worker = {}));
export var HazardType;
(function (HazardType) {
    HazardType["FLOOD"] = "FLOOD";
    HazardType["DROUGHT"] = "DROUGHT";
    HazardType["ROCKFALL"] = "ROCKFALL";
})(HazardType || (HazardType = {}));
export var Hand;
(function (Hand) {
    Hand["NONE"] = "NONE";
    Hand["GREEN"] = "GREEN";
    Hand["BLACK"] = "BLACK";
    Hand["BOTH"] = "BOTH";
})(Hand || (Hand = {}));
const HAND_FEES = {
    [Hand.NONE]: [0, 0, 0],
    [Hand.GREEN]: [2, 2, 1],
    [Hand.BLACK]: [2, 1, 2],
    [Hand.BOTH]: [4, 3, 3],
};
export function handFee(hand, playerCount) {
    const idx = Math.max(0, Math.min(playerCount - 2, 2));
    return HAND_FEES[hand][idx];
}
export var Teepee;
(function (Teepee) {
    Teepee["BLUE"] = "BLUE";
    Teepee["GREEN"] = "GREEN";
})(Teepee || (Teepee = {}));
export var City;
(function (City) {
    City["KANSAS_CITY"] = "KANSAS_CITY";
    City["TOPEKA"] = "TOPEKA";
    City["WICHITA"] = "WICHITA";
    City["COLORADO_SPRINGS"] = "COLORADO_SPRINGS";
    City["SANTA_FE"] = "SANTA_FE";
    City["ALBUQUERQUE"] = "ALBUQUERQUE";
    City["EL_PASO"] = "EL_PASO";
    City["SAN_DIEGO"] = "SAN_DIEGO";
    City["SACRAMENTO"] = "SACRAMENTO";
    City["SAN_FRANCISCO"] = "SAN_FRANCISCO";
    City["FULTON"] = "FULTON";
    City["BLOOMINGTON"] = "BLOOMINGTON";
    City["PEORIA"] = "PEORIA";
    City["CHICAGO_2"] = "CHICAGO_2";
    City["TOLEDO"] = "TOLEDO";
    City["PITTSBURGH_2"] = "PITTSBURGH_2";
    City["PHILADELPHIA"] = "PHILADELPHIA";
    City["COLUMBIA"] = "COLUMBIA";
    City["ST_LOUIS"] = "ST_LOUIS";
    City["CHICAGO"] = "CHICAGO";
    City["DETROIT"] = "DETROIT";
    City["CLEVELAND"] = "CLEVELAND";
    City["PITTSBURGH"] = "PITTSBURGH";
    City["NEW_YORK_CITY"] = "NEW_YORK_CITY";
    City["MEMPHIS"] = "MEMPHIS";
    City["DENVER"] = "DENVER";
    City["MILWAUKEE"] = "MILWAUKEE";
    City["GREEN_BAY"] = "GREEN_BAY";
    City["MINNEAPOLIS"] = "MINNEAPOLIS";
    City["TORONTO"] = "TORONTO";
    City["MONTREAL"] = "MONTREAL";
})(City || (City = {}));
export var DiscColor;
(function (DiscColor) {
    DiscColor["WHITE"] = "WHITE";
    DiscColor["BLACK"] = "BLACK";
})(DiscColor || (DiscColor = {}));
export var Unlockable;
(function (Unlockable) {
    Unlockable["CERT_LIMIT_4"] = "CERT_LIMIT_4";
    Unlockable["CERT_LIMIT_6"] = "CERT_LIMIT_6";
    Unlockable["EXTRA_STEP_DOLLARS"] = "EXTRA_STEP_DOLLARS";
    Unlockable["EXTRA_STEP_POINTS"] = "EXTRA_STEP_POINTS";
    Unlockable["EXTRA_CARD"] = "EXTRA_CARD";
    Unlockable["AUX_GAIN_DOLLAR"] = "AUX_GAIN_DOLLAR";
    Unlockable["AUX_DRAW_CARD_TO_DISCARD_CARD"] = "AUX_DRAW_CARD_TO_DISCARD_CARD";
    Unlockable["AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT"] = "AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT";
    Unlockable["AUX_PAY_TO_MOVE_ENGINE_FORWARD"] = "AUX_PAY_TO_MOVE_ENGINE_FORWARD";
    Unlockable["AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD"] = "AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD";
    Unlockable["AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET"] = "AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET";
})(Unlockable || (Unlockable = {}));
export const UNLOCKABLE_INFO = {
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
};
export var ScoreCategory;
(function (ScoreCategory) {
    ScoreCategory["DOLLARS"] = "DOLLARS";
    ScoreCategory["CATTLE_CARDS"] = "CATTLE_CARDS";
    ScoreCategory["OBJECTIVE_CARDS"] = "OBJECTIVE_CARDS";
    ScoreCategory["STATION_MASTERS"] = "STATION_MASTERS";
    ScoreCategory["WORKERS"] = "WORKERS";
    ScoreCategory["HAZARDS"] = "HAZARDS";
    ScoreCategory["EXTRA_STEP_POINTS"] = "EXTRA_STEP_POINTS";
    ScoreCategory["JOB_MARKET_TOKEN"] = "JOB_MARKET_TOKEN";
    ScoreCategory["BUILDINGS"] = "BUILDINGS";
    ScoreCategory["CITIES"] = "CITIES";
    ScoreCategory["BID"] = "BID";
    ScoreCategory["STATIONS"] = "STATIONS";
})(ScoreCategory || (ScoreCategory = {}));
export var Edition;
(function (Edition) {
    Edition["FIRST"] = "FIRST";
    Edition["SECOND"] = "SECOND";
})(Edition || (Edition = {}));
export var Status;
(function (Status) {
    Status["BIDDING"] = "BIDDING";
    Status["STARTED"] = "STARTED";
    Status["ENDED"] = "ENDED";
})(Status || (Status = {}));
export var Mode;
(function (Mode) {
    Mode["ORIGINAL"] = "ORIGINAL";
    Mode["STRATEGIC"] = "STRATEGIC";
})(Mode || (Mode = {}));
export var BuildingsOption;
(function (BuildingsOption) {
    BuildingsOption["BEGINNER"] = "BEGINNER";
    BuildingsOption["RANDOMIZED"] = "RANDOMIZED";
})(BuildingsOption || (BuildingsOption = {}));
export var PlayerOrderOption;
(function (PlayerOrderOption) {
    PlayerOrderOption["RANDOMIZED"] = "RANDOMIZED";
    PlayerOrderOption["BIDDING"] = "BIDDING";
})(PlayerOrderOption || (PlayerOrderOption = {}));
export var Variant;
(function (Variant) {
    Variant["ORIGINAL"] = "ORIGINAL";
    Variant["BALANCED"] = "BALANCED";
})(Variant || (Variant = {}));
/** Objective Tasks (ObjectiveCard.Task). */
export var Task;
(function (Task) {
    Task["BUILDING"] = "BUILDING";
    Task["GREEN_TEEPEE"] = "GREEN_TEEPEE";
    Task["BLUE_TEEPEE"] = "BLUE_TEEPEE";
    Task["HAZARD"] = "HAZARD";
    Task["STATION"] = "STATION";
    Task["BREEDING_VALUE_3"] = "BREEDING_VALUE_3";
    Task["BREEDING_VALUE_4"] = "BREEDING_VALUE_4";
    Task["BREEDING_VALUE_5"] = "BREEDING_VALUE_5";
    Task["SAN_FRANCISCO"] = "SAN_FRANCISCO";
})(Task || (Task = {}));
/**
 * Every command, mirroring `view/ActionType`. The name == class simple name
 * uppercased with underscores stripped (enforced by ActionTypeTest.naming).
 */
export var ActionType;
(function (ActionType) {
    ActionType["MOVE"] = "MOVE";
    ActionType["PLACE_BID"] = "PLACE_BID";
    ActionType["BUY_CATTLE"] = "BUY_CATTLE";
    ActionType["DELIVER_TO_CITY"] = "DELIVER_TO_CITY";
    ActionType["DISCARD_CARD"] = "DISCARD_CARD";
    ActionType["DRAW_CARD"] = "DRAW_CARD";
    ActionType["DRAW_2_CARDS"] = "DRAW_2_CARDS";
    ActionType["DRAW_3_CARDS"] = "DRAW_3_CARDS";
    ActionType["DRAW_4_CARDS"] = "DRAW_4_CARDS";
    ActionType["DRAW_5_CARDS"] = "DRAW_5_CARDS";
    ActionType["DRAW_6_CARDS"] = "DRAW_6_CARDS";
    ActionType["DRAW_2_CATTLE_CARDS"] = "DRAW_2_CATTLE_CARDS";
    ActionType["GAIN_1_DOLLAR"] = "GAIN_1_DOLLAR";
    ActionType["GAIN_2_DOLLARS"] = "GAIN_2_DOLLARS";
    ActionType["GAIN_3_DOLLARS"] = "GAIN_3_DOLLARS";
    ActionType["GAIN_4_DOLLARS"] = "GAIN_4_DOLLARS";
    ActionType["GAIN_5_DOLLARS"] = "GAIN_5_DOLLARS";
    ActionType["GAIN_12_DOLLARS"] = "GAIN_12_DOLLARS";
    ActionType["GAIN_1_CERTIFICATE"] = "GAIN_1_CERTIFICATE";
    ActionType["GAIN_2_CERTIFICATES"] = "GAIN_2_CERTIFICATES";
    ActionType["GAIN_1_DOLLAR_PER_ENGINEER"] = "GAIN_1_DOLLAR_PER_ENGINEER";
    ActionType["GAIN_1_DOLLAR_PER_CRAFTSMAN"] = "GAIN_1_DOLLAR_PER_CRAFTSMAN";
    ActionType["GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS"] = "GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS";
    ActionType["GAIN_2_DOLLARS_PER_STATION"] = "GAIN_2_DOLLARS_PER_STATION";
    ActionType["GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR"] = "GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR";
    ActionType["HIRE_WORKER"] = "HIRE_WORKER";
    ActionType["HIRE_WORKER_PLUS_2"] = "HIRE_WORKER_PLUS_2";
    ActionType["HIRE_WORKER_MINUS_1"] = "HIRE_WORKER_MINUS_1";
    ActionType["HIRE_WORKER_MINUS_2"] = "HIRE_WORKER_MINUS_2";
    ActionType["MOVE_1_FORWARD"] = "MOVE_1_FORWARD";
    ActionType["MOVE_2_FORWARD"] = "MOVE_2_FORWARD";
    ActionType["MOVE_3_FORWARD"] = "MOVE_3_FORWARD";
    ActionType["MOVE_3_FORWARD_WITHOUT_FEES"] = "MOVE_3_FORWARD_WITHOUT_FEES";
    ActionType["MOVE_4_FORWARD"] = "MOVE_4_FORWARD";
    ActionType["MOVE_5_FORWARD"] = "MOVE_5_FORWARD";
    ActionType["MOVE_ENGINE_FORWARD"] = "MOVE_ENGINE_FORWARD";
    ActionType["MOVE_ENGINE_1_FORWARD"] = "MOVE_ENGINE_1_FORWARD";
    ActionType["MOVE_ENGINE_2_FORWARD"] = "MOVE_ENGINE_2_FORWARD";
    ActionType["MOVE_ENGINE_AT_MOST_2_FORWARD"] = "MOVE_ENGINE_AT_MOST_2_FORWARD";
    ActionType["MOVE_ENGINE_AT_MOST_3_FORWARD"] = "MOVE_ENGINE_AT_MOST_3_FORWARD";
    ActionType["MOVE_ENGINE_AT_MOST_4_FORWARD"] = "MOVE_ENGINE_AT_MOST_4_FORWARD";
    ActionType["MOVE_ENGINE_2_OR_3_FORWARD"] = "MOVE_ENGINE_2_OR_3_FORWARD";
    ActionType["MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS"] = "MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS";
    ActionType["MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS"] = "MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS";
    ActionType["MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD"] = "MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD";
    ActionType["MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR"] = "MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR";
    ActionType["MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS"] = "MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS";
    ActionType["MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS"] = "MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS";
    ActionType["MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS"] = "MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS";
    ActionType["MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS"] = "MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS";
    ActionType["PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD"] = "PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD";
    ActionType["PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD"] = "PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD";
    ActionType["PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE"] = "PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE";
    ActionType["PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES"] = "PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES";
    ActionType["PLACE_BUILDING"] = "PLACE_BUILDING";
    ActionType["PLACE_CHEAP_BUILDING"] = "PLACE_CHEAP_BUILDING";
    ActionType["PLACE_BUILDING_FOR_FREE"] = "PLACE_BUILDING_FOR_FREE";
    ActionType["REMOVE_HAZARD"] = "REMOVE_HAZARD";
    ActionType["REMOVE_HAZARD_FOR_2_DOLLARS"] = "REMOVE_HAZARD_FOR_2_DOLLARS";
    ActionType["REMOVE_HAZARD_FOR_5_DOLLARS"] = "REMOVE_HAZARD_FOR_5_DOLLARS";
    ActionType["REMOVE_HAZARD_FOR_FREE"] = "REMOVE_HAZARD_FOR_FREE";
    ActionType["TRADE_WITH_TRIBES"] = "TRADE_WITH_TRIBES";
    ActionType["REMOVE_CARD"] = "REMOVE_CARD";
    ActionType["SINGLE_AUXILIARY_ACTION"] = "SINGLE_AUXILIARY_ACTION";
    ActionType["SINGLE_OR_DOUBLE_AUXILIARY_ACTION"] = "SINGLE_OR_DOUBLE_AUXILIARY_ACTION";
    ActionType["TAKE_OBJECTIVE_CARD"] = "TAKE_OBJECTIVE_CARD";
    ActionType["PLAY_OBJECTIVE_CARD"] = "PLAY_OBJECTIVE_CARD";
    ActionType["UPGRADE_STATION"] = "UPGRADE_STATION";
    ActionType["UPGRADE_ANY_STATION_BEHIND_ENGINE"] = "UPGRADE_ANY_STATION_BEHIND_ENGINE";
    ActionType["DOWNGRADE_STATION"] = "DOWNGRADE_STATION";
    ActionType["APPOINT_STATION_MASTER"] = "APPOINT_STATION_MASTER";
    ActionType["USE_ADJACENT_BUILDING"] = "USE_ADJACENT_BUILDING";
    ActionType["CHOOSE_FORESIGHT_1"] = "CHOOSE_FORESIGHT_1";
    ActionType["CHOOSE_FORESIGHT_2"] = "CHOOSE_FORESIGHT_2";
    ActionType["CHOOSE_FORESIGHT_3"] = "CHOOSE_FORESIGHT_3";
    ActionType["UNLOCK_WHITE"] = "UNLOCK_WHITE";
    ActionType["UNLOCK_BLACK_OR_WHITE"] = "UNLOCK_BLACK_OR_WHITE";
    ActionType["EXTRAORDINARY_DELIVERY"] = "EXTRAORDINARY_DELIVERY";
    ActionType["MAX_CERTIFICATES"] = "MAX_CERTIFICATES";
    ActionType["DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS"] = "DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS";
    ActionType["DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS"] = "DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS";
    ActionType["DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE"] = "DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE";
    ActionType["DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES"] = "DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES";
    ActionType["DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS"] = "DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS";
    ActionType["DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS"] = "DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS";
    ActionType["DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS"] = "DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS";
    ActionType["DISCARD_1_GUERNSEY"] = "DISCARD_1_GUERNSEY";
    ActionType["DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS"] = "DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS";
    ActionType["DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS"] = "DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS";
    ActionType["DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES"] = "DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES";
    ActionType["DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS"] = "DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS";
    ActionType["DISCARD_PAIR_TO_GAIN_3_DOLLARS"] = "DISCARD_PAIR_TO_GAIN_3_DOLLARS";
    ActionType["DISCARD_PAIR_TO_GAIN_4_DOLLARS"] = "DISCARD_PAIR_TO_GAIN_4_DOLLARS";
    ActionType["DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES"] = "DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES";
    ActionType["DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE"] = "DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE";
    ActionType["DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND"] = "DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND";
    ActionType["DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND"] = "DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND";
    ActionType["ADD_1_OBJECTIVE_CARD_TO_HAND"] = "ADD_1_OBJECTIVE_CARD_TO_HAND";
    ActionType["TAKE_BREEDING_VALUE_3_CATTLE_CARD"] = "TAKE_BREEDING_VALUE_3_CATTLE_CARD";
    ActionType["DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD"] = "DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD";
    ActionType["DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD"] = "DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD";
    ActionType["DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS"] = "DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS";
    ActionType["GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL"] = "GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL";
    ActionType["DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION"] = "DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION";
    // The following are second-edition / Rails to the North only (not exercised by first-edition scope):
    ActionType["UPGRADE_SIMMENTAL"] = "UPGRADE_SIMMENTAL";
    ActionType["GAIN_EXCHANGE_TOKEN"] = "GAIN_EXCHANGE_TOKEN";
    ActionType["USE_EXCHANGE_TOKEN"] = "USE_EXCHANGE_TOKEN";
    ActionType["PLACE_BRANCHLET"] = "PLACE_BRANCHLET";
    ActionType["DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET"] = "DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET";
    ActionType["UPGRADE_STATION_TOWN"] = "UPGRADE_STATION_TOWN";
    ActionType["TAKE_BONUS_STATION_MASTER"] = "TAKE_BONUS_STATION_MASTER";
})(ActionType || (ActionType = {}));
// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export var ROWError;
(function (ROWError) {
    ROWError["CANNOT_SKIP_ACTION"] = "CANNOT_SKIP_ACTION";
    ROWError["CANNOT_PERFORM_ACTION"] = "CANNOT_PERFORM_ACTION";
    ROWError["ALREADY_AT_SPACE"] = "ALREADY_AT_SPACE";
    ROWError["ALREADY_DELIVERED_TO_CITY"] = "ALREADY_DELIVERED_TO_CITY";
    ROWError["ALREADY_HAS_HAZARD"] = "ALREADY_HAS_HAZARD";
    ROWError["ALREADY_HAS_STATION_MASTER"] = "ALREADY_HAS_STATION_MASTER";
    ROWError["ALREADY_PLAYER_ON_SPACE"] = "ALREADY_PLAYER_ON_SPACE";
    ROWError["ALREADY_UNLOCKED"] = "ALREADY_UNLOCKED";
    ROWError["ALREADY_UPGRADED_STATION"] = "ALREADY_UPGRADED_STATION";
    ROWError["AT_LEAST_2_PLAYERS_REQUIRED"] = "AT_LEAST_2_PLAYERS_REQUIRED";
    ROWError["AT_MOST_4_PLAYERS_SUPPORTED"] = "AT_MOST_4_PLAYERS_SUPPORTED";
    ROWError["BUILDING_NOT_AVAILABLE"] = "BUILDING_NOT_AVAILABLE";
    ROWError["CANNOT_REPLACE_BUILDING_OF_OTHER_PLAYER"] = "CANNOT_REPLACE_BUILDING_OF_OTHER_PLAYER";
    ROWError["CANNOT_REPLACE_NEUTRAL_BUILDING"] = "CANNOT_REPLACE_NEUTRAL_BUILDING";
    ROWError["CANNOT_STEP_DIRECTLY_FROM_TO"] = "CANNOT_STEP_DIRECTLY_FROM_TO";
    ROWError["CARD_NOT_IN_HAND"] = "CARD_NOT_IN_HAND";
    ROWError["CATTLE_CARDS_NOT_IN_HAND"] = "CATTLE_CARDS_NOT_IN_HAND";
    ROWError["CATTLE_CARD_NOT_AVAILABLE"] = "CATTLE_CARD_NOT_AVAILABLE";
    ROWError["CITY_VALUE_MUST_BE_LESS_THEN_OR_EQUAL_TO_SPACES_THAT_ENGINE_MOVED_BACKWARDS"] = "CITY_VALUE_MUST_BE_LESS_THEN_OR_EQUAL_TO_SPACES_THAT_ENGINE_MOVED_BACKWARDS";
    ROWError["GAME_ENDED"] = "GAME_ENDED";
    ROWError["GAME_NOT_ENDED"] = "GAME_NOT_ENDED";
    ROWError["HAZARD_MUST_BE_OF_TYPE"] = "HAZARD_MUST_BE_OF_TYPE";
    ROWError["HAZARD_NOT_ON_TRAIL"] = "HAZARD_NOT_ON_TRAIL";
    ROWError["JOB_MARKET_CLOSED"] = "JOB_MARKET_CLOSED";
    ROWError["LOCATION_EMPTY"] = "LOCATION_EMPTY";
    ROWError["LOCATION_NOT_EMPTY"] = "LOCATION_NOT_EMPTY";
    ROWError["MUST_CHOOSE_ACTION"] = "MUST_CHOOSE_ACTION";
    ROWError["MUST_MOVE_AT_LEAST_STEPS"] = "MUST_MOVE_AT_LEAST_STEPS";
    ROWError["MUST_PICK_WHITE_DISC"] = "MUST_PICK_WHITE_DISC";
    ROWError["MUST_SPECIFY_3_FORESIGHTS"] = "MUST_SPECIFY_3_FORESIGHTS";
    ROWError["NOT_PAIR"] = "NOT_PAIR";
    ROWError["NOT_AT_LOCATION"] = "NOT_AT_LOCATION";
    ROWError["NOT_AT_STATION"] = "NOT_AT_STATION";
    ROWError["NOT_ENOUGH_BALANCE_TO_PAY"] = "NOT_ENOUGH_BALANCE_TO_PAY";
    ROWError["NOT_ENOUGH_BREEDING_VALUE"] = "NOT_ENOUGH_BREEDING_VALUE";
    ROWError["NOT_ENOUGH_CATTLE_CARDS_OF_BREEDING_VALUE_AVAILABLE"] = "NOT_ENOUGH_CATTLE_CARDS_OF_BREEDING_VALUE_AVAILABLE";
    ROWError["NOT_ENOUGH_CERTIFICATES"] = "NOT_ENOUGH_CERTIFICATES";
    ROWError["NOT_ENOUGH_COWBOYS"] = "NOT_ENOUGH_COWBOYS";
    ROWError["NOT_ENOUGH_CRAFTSMEN"] = "NOT_ENOUGH_CRAFTSMEN";
    ROWError["NOT_ENOUGH_WORKERS"] = "NOT_ENOUGH_WORKERS";
    ROWError["NOT_FIRST_ACTION"] = "NOT_FIRST_ACTION";
    ROWError["NO_ACTIONS"] = "NO_ACTIONS";
    ROWError["NO_SUCH_LOCATION"] = "NO_SUCH_LOCATION";
    ROWError["NO_SUCH_SPACE"] = "NO_SUCH_SPACE";
    ROWError["NO_TEEPEE_AT_LOCATION"] = "NO_TEEPEE_AT_LOCATION";
    ROWError["OBJECTIVE_CARD_NOT_AVAILABLE"] = "OBJECTIVE_CARD_NOT_AVAILABLE";
    ROWError["REPLACEMENT_BUILDING_MUST_BE_HIGHER"] = "REPLACEMENT_BUILDING_MUST_BE_HIGHER";
    ROWError["REPLACEMENT_BUILDING_MUST_BE_PLAYER_BUILDING"] = "REPLACEMENT_BUILDING_MUST_BE_PLAYER_BUILDING";
    ROWError["SPACE_NOT_REACHABLE"] = "SPACE_NOT_REACHABLE";
    ROWError["STATION_MUST_BE_BEHIND_ENGINE"] = "STATION_MUST_BE_BEHIND_ENGINE";
    ROWError["STATION_NOT_UPGRADED_BY_PLAYER"] = "STATION_NOT_UPGRADED_BY_PLAYER";
    ROWError["STEPS_EXCEED_LIMIT"] = "STEPS_EXCEED_LIMIT";
    ROWError["WORKERS_EXCEED_LIMIT"] = "WORKERS_EXCEED_LIMIT";
    ROWError["NO_SUCH_PLAYER"] = "NO_SUCH_PLAYER";
    ROWError["LOCATION_NOT_ADJACENT"] = "LOCATION_NOT_ADJACENT";
    ROWError["STATION_NOT_ON_TRACK"] = "STATION_NOT_ON_TRACK";
    ROWError["MUST_START_ON_NEUTRAL_BUILDING"] = "MUST_START_ON_NEUTRAL_BUILDING";
    ROWError["WORKER_NOT_AVAILABLE"] = "WORKER_NOT_AVAILABLE";
    ROWError["BID_TOO_LOW"] = "BID_TOO_LOW";
    ROWError["BID_INVALID_POSITION"] = "BID_INVALID_POSITION";
    ROWError["CITY_NOT_ACCESSIBLE"] = "CITY_NOT_ACCESSIBLE";
    ROWError["ALREADY_PLACED_BRANCHLET"] = "ALREADY_PLACED_BRANCHLET";
    ROWError["NOT_ENOUGH_EXCHANGE_TOKENS"] = "NOT_ENOUGH_EXCHANGE_TOKENS";
    ROWError["NO_BRANCHLETS"] = "NO_BRANCHLETS";
    ROWError["NO_SUCH_TOWN"] = "NO_SUCH_TOWN";
    ROWError["STATION_MASTER_NOT_AVAILABLE"] = "STATION_MASTER_NOT_AVAILABLE";
    ROWError["TOWN_NOT_ACCESSIBLE"] = "TOWN_NOT_ACCESSIBLE";
    ROWError["NOT_CURRENT_PLAYER"] = "NOT_CURRENT_PLAYER";
    ROWError["INVALID_CATTLE_TYPE"] = "INVALID_CATTLE_TYPE";
    ROWError["NO_TILES_LEFT"] = "NO_TILES_LEFT";
    ROWError["CANNOT_FORCE_END_TURN"] = "CANNOT_FORCE_END_TURN";
    ROWError["CANNOT_UPGRADE_SIMMENTAL"] = "CANNOT_UPGRADE_SIMMENTAL";
    ROWError["STATION_MUST_BE_DIFFERENT"] = "STATION_MUST_BE_DIFFERENT";
    ROWError["NOT_ENOUGH_CARDS"] = "NOT_ENOUGH_CARDS";
    ROWError["NO_AUTOMA_STATE"] = "NO_AUTOMA_STATE";
    ROWError["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
})(ROWError || (ROWError = {}));
export class ROWException extends Error {
    constructor(error) {
        super(error);
        this.name = "ROWException";
        this.error = error;
    }
}
const JAVA_MULT = 0x5deece66dn;
const JAVA_ADD = 0xbn;
const JAVA_MASK = (1n << 48n) - 1n;
/** Port of java.util.Random (48-bit LCG). Needed to replay Java fixtures. */
export class JavaRandom {
    constructor(seed) {
        this.seed = (BigInt(seed) ^ JAVA_MULT) & JAVA_MASK;
    }
    next(bits) {
        this.seed = (this.seed * JAVA_MULT + JAVA_ADD) & JAVA_MASK;
        const result = this.seed >> BigInt(48 - bits);
        // next(31) returns a signed 32-bit value; keep it as Java does.
        return Number(BigInt.asIntN(32, result));
    }
    /** java.util.Random.nextInt(bound) semantics. */
    int(bound) {
        if (bound <= 0)
            throw new Error("bound must be positive");
        if ((bound & -bound) === bound) {
            // Power of two: Java still draws 31 bits here.
            return Math.floor((bound * this.next(31)) / 0x80000000);
        }
        let bits;
        let val;
        do {
            bits = this.next(31);
            val = bits % bound;
        } while (bits - val + (bound - 1) < 0);
        return val;
    }
    boolean() {
        return this.next(1) !== 0;
    }
    /** java.util.Random.nextDouble(). */
    double() {
        return ((this.next(26) << 27) + this.next(27)) / (1 << 53);
    }
    /** Snapshot/restore the internal seed so a position can be replayed exactly. */
    getState() {
        return this.seed.toString();
    }
    setState(state) {
        this.seed = BigInt(state);
    }
}
/**
 * Mirrors the Java RecordingRandom: replays a recorded tape of next(bits)
 * outputs, and (optionally) records when constructing a tape.
 */
export class RecordingRandom {
    constructor(tape = [], recording = false) {
        this.index = 0;
        this.recorded = [];
        this.tape = tape;
        this.recording = recording;
    }
    next(bits) {
        if (this.recording) {
            // Without an underlying source we cannot record real values; tape is supplied.
            throw new ROWException(ROWError.NOT_IMPLEMENTED);
        }
        if (this.index >= this.tape.length) {
            throw new Error(`Random tape exhausted at draw ${this.index} (requested ${bits} bits)`);
        }
        const entry = this.tape[this.index];
        if (entry.bits !== bits) {
            throw new Error(`Random tape mismatch at draw ${this.index}: expected ${entry.bits} bits, requested ${bits}`);
        }
        this.index++;
        return entry.value;
    }
    int(bound) {
        // Replay the same algorithm as JavaRandom, drawing from the tape.
        if (bound <= 0)
            throw new Error("bound must be positive");
        if ((bound & -bound) === bound) {
            // Power of two: Java still draws 31 bits here.
            return Math.floor((bound * this.next(31)) / 0x80000000);
        }
        let bits;
        let val;
        do {
            bits = this.next(31);
            val = bits % bound;
        } while (bits - val + (bound - 1) < 0);
        return val;
    }
    boolean() {
        return this.next(1) !== 0;
    }
    assertFullyConsumed() {
        if (this.index < this.tape.length) {
            throw new Error(`Random tape has ${this.tape.length - this.index} unused draws`);
        }
    }
    get consumed() {
        return this.index;
    }
}
/** java.util.Collections.shuffle(list, rnd). */
export function shuffle(list, rnd) {
    for (let i = list.length; i > 1; i--) {
        const j = rnd.int(i);
        const tmp = list[i - 1];
        list[i - 1] = list[j];
        list[j] = tmp;
    }
}
export class PossibleAction {
    static deserialize(obj) {
        switch (obj.kind) {
            case "mandatory":
                return new Mandatory(obj.action ?? null);
            case "any":
                return new AnyAction((obj.actions ?? []).map(PossibleAction.deserialize));
            case "choice":
                return new ChoiceAction((obj.actions ?? []).map(PossibleAction.deserialize));
            case "repeat":
                return new Repeat(obj.atLeast ?? 0, obj.atMost ?? 0, PossibleAction.deserialize(obj.repeatingAction), obj.current ? PossibleAction.deserialize(obj.current) : null);
            case "whenThen":
                return new WhenThen(obj.atLeast ?? 0, obj.atMost ?? 0, obj.when, obj.then, obj.thens ?? 0, obj.current ? PossibleAction.deserialize(obj.current) : null);
        }
    }
    static mandatory(action) {
        return new Mandatory(action);
    }
    static optionalAction(action) {
        return new AnyAction([PossibleAction.mandatory(action)]);
    }
    static optional(possibleAction) {
        return new AnyAction([possibleAction]);
    }
    static anyActions(actions) {
        return new AnyAction(actions.map((a) => PossibleAction.mandatory(a)));
    }
    static any(actions) {
        return new AnyAction(actions);
    }
    static repeat(atLeast, atMost, action) {
        return new Repeat(atLeast, atMost, PossibleAction.optionalAction(action));
    }
    static choiceActions(actions) {
        return new ChoiceAction(actions.map((a) => PossibleAction.optionalAction(a)));
    }
    static choice(actions) {
        return new ChoiceAction(actions);
    }
    static whenThen(atLeast, atMost, when, then, thens = 0) {
        return new WhenThen(atLeast, atMost, when, then, thens);
    }
}
class Mandatory extends PossibleAction {
    constructor(action) {
        super();
        this.action = action;
    }
    perform(action) {
        if (this.action !== action)
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        this.action = null;
    }
    skip() {
        throw new ROWException(ROWError.CANNOT_SKIP_ACTION);
    }
    isFinal() {
        return this.action === null;
    }
    canPerform(action) {
        return this.action !== null && this.action === action;
    }
    canSkip() {
        return false;
    }
    getPossibleActions() {
        return this.action !== null ? new Set([this.action]) : new Set();
    }
    clone() {
        return new Mandatory(this.action);
    }
    serialize() {
        return { kind: "mandatory", action: this.action };
    }
}
class AnyAction extends PossibleAction {
    constructor(actions) {
        super();
        this.actions = actions;
    }
    perform(action) {
        const element = this.check(action);
        element.perform(action);
        if (element.isFinal())
            this.actions = this.actions.filter((a) => a !== element);
    }
    skip() {
        this.actions = [];
    }
    check(action) {
        const found = this.actions.find((a) => a.canPerform(action));
        if (!found)
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        return found;
    }
    isFinal() {
        return this.actions.length === 0;
    }
    canPerform(action) {
        return this.actions.some((a) => a.canPerform(action));
    }
    canSkip() {
        return true;
    }
    getPossibleActions() {
        const out = new Set();
        for (const a of this.actions)
            for (const x of a.getPossibleActions())
                out.add(x);
        return out;
    }
    clone() {
        return new AnyAction(this.actions.map((a) => a.clone()));
    }
    serialize() {
        return { kind: "any", actions: this.actions.map((a) => a.serialize()) };
    }
}
class ChoiceAction extends AnyAction {
    skip() {
        if (this.actions.length > 1)
            throw new ROWException(ROWError.MUST_CHOOSE_ACTION);
        if (this.actions.length === 1) {
            const action = this.actions[0];
            action.skip();
            if (action.isFinal())
                this.actions = [];
        }
    }
    perform(action) {
        const element = this.check(action);
        element.perform(action);
        if (element.isFinal()) {
            this.actions = [];
        }
        else {
            this.actions = this.actions.filter((a) => a === element);
        }
    }
    canSkip() {
        return this.actions.length === 0 || (this.actions.length === 1 && this.actions[0].canSkip());
    }
    clone() {
        return new ChoiceAction(this.actions.map((a) => a.clone()));
    }
    serialize() {
        return { kind: "choice", actions: this.actions.map((a) => a.serialize()) };
    }
}
class Repeat extends PossibleAction {
    constructor(atLeast, atMost, action, current = null) {
        super();
        this.atLeast = atLeast;
        this.atMost = atMost;
        this.repeatingAction = action;
        this.current = current;
    }
    perform(action) {
        if (this.current === null) {
            if (this.atMost === 0)
                throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
            this.atLeast = Math.max(0, this.atLeast - 1);
            this.atMost--;
            this.current = this.repeatingAction.clone();
        }
        this.current.perform(action);
        if (this.current.isFinal())
            this.current = null;
    }
    skip() {
        if (this.current !== null) {
            this.current.skip();
            this.current = null;
        }
        if (this.atLeast > 0)
            throw new ROWException(ROWError.CANNOT_SKIP_ACTION);
        this.atMost = 0;
    }
    isFinal() {
        return this.current === null && this.atMost === 0;
    }
    canPerform(action) {
        return this.current !== null ? this.current.canPerform(action) : this.repeatingAction.canPerform(action) && this.atMost > 0;
    }
    canSkip() {
        return (this.current !== null && this.current.canSkip()) || this.atLeast === 0;
    }
    getPossibleActions() {
        if (this.current !== null)
            return this.current.getPossibleActions();
        return this.atMost > 0 ? this.repeatingAction.getPossibleActions() : new Set();
    }
    clone() {
        return new Repeat(this.atLeast, this.atMost, this.repeatingAction, this.current);
    }
    serialize() {
        return {
            kind: "repeat",
            atLeast: this.atLeast,
            atMost: this.atMost,
            repeatingAction: this.repeatingAction.serialize(),
            current: this.current ? this.current.serialize() : null,
        };
    }
}
class WhenThen extends Repeat {
    constructor(atLeast, atMost, when, then, thens, current = null) {
        super(atLeast, atMost, PossibleAction.optionalAction(when), current);
        this.when = when;
        this.then = then;
        this.thens = thens;
    }
    perform(action) {
        if (this.when === action) {
            super.perform(action);
            this.thens++;
        }
        else if (action === this.then) {
            if (this.thens === 0)
                throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
            this.thens--;
        }
    }
    skip() {
        if (this.thens > 0)
            throw new ROWException(ROWError.CANNOT_SKIP_ACTION);
        super.skip();
    }
    isFinal() {
        return this.thens === 0 && super.isFinal();
    }
    canPerform(action) {
        if (action === this.then)
            return this.thens > 0;
        return super.canPerform(action);
    }
    getPossibleActions() {
        if (this.thens > 0) {
            const out = super.getPossibleActions();
            out.add(this.then);
            return out;
        }
        return super.getPossibleActions();
    }
    clone() {
        return new WhenThen(this.atLeast, this.atMost, this.when, this.then, this.thens, this.current);
    }
    serialize() {
        return {
            kind: "whenThen",
            atLeast: this.atLeast,
            atMost: this.atMost,
            repeatingAction: this.repeatingAction.serialize(),
            current: this.current ? this.current.serialize() : null,
            when: this.when,
            then: this.then,
            thens: this.thens,
        };
    }
}
// ---------------------------------------------------------------------------
// ActionStack (port of ActionStack.java)
// ---------------------------------------------------------------------------
export class ActionStack {
    constructor(actions = [], immediateActions = []) {
        // Java uses a Deque with peek() at the head; we treat index 0 as the head.
        this.actions = actions;
        this.immediateActions = immediateActions;
    }
    static initial(startActions) {
        return new ActionStack([...startActions], []);
    }
    perform(action) {
        const element = this.check(action);
        element.perform(action);
        if (element.isFinal()) {
            if (this.immediateActions.length === 0) {
                this.actions = this.actions.filter((a) => a !== element);
            }
            else {
                this.immediateActions = this.immediateActions.filter((a) => a !== element);
            }
        }
    }
    canPerform(action) {
        return !this.isEmpty() && this.peek().canPerform(action);
    }
    canSkip() {
        return !this.isEmpty() && this.peek().canSkip();
    }
    getPossibleActions() {
        if (this.immediateActions.length > 0)
            return this.immediateActions[0].getPossibleActions();
        if (this.actions.length > 0)
            return this.actions[0].getPossibleActions();
        return new Set();
    }
    check(action) {
        const element = this.peek();
        if (!element.canPerform(action))
            throw new ROWException(ROWError.NOT_FIRST_ACTION);
        return element;
    }
    peek() {
        if (this.immediateActions.length === 0) {
            if (this.actions.length === 0)
                throw new ROWException(ROWError.NO_ACTIONS);
            return this.actions[0];
        }
        return this.immediateActions[0];
    }
    isEmpty() {
        return this.actions.length === 0 && this.immediateActions.length === 0;
    }
    skipAll() {
        while (this.immediateActions.length > 0)
            this.skipFrom(this.immediateActions);
        while (this.actions.length > 0)
            this.skipFrom(this.actions);
    }
    skip() {
        if (this.immediateActions.length > 0)
            this.skipFrom(this.immediateActions);
        else
            this.skipFrom(this.actions);
    }
    skipFrom(stack) {
        if (stack.length === 0)
            throw new ROWException(ROWError.NO_ACTIONS);
        const possibleAction = stack[0];
        possibleAction.skip();
        if (possibleAction.isFinal())
            stack.shift();
    }
    size() {
        return this.actions.length + this.immediateActions.length;
    }
    clear() {
        this.actions = [];
        this.immediateActions = [];
    }
    hasImmediate() {
        return this.immediateActions.length > 0;
    }
    /** Pushes immediate actions on top, keeping relative order (Java addFirst loop). */
    addImmediateActions(immediate) {
        for (let i = immediate.length - 1; i >= 0; i--)
            this.immediateActions.unshift(immediate[i]);
    }
    addActions(actions) {
        for (let i = actions.length - 1; i >= 0; i--)
            this.actions.unshift(actions[i]);
    }
    addAction(action) {
        this.actions.unshift(action);
    }
    clone() {
        return new ActionStack(this.actions.map((a) => a.clone()), this.immediateActions.map((a) => a.clone()));
    }
    serialize() {
        return {
            actions: this.actions.map((a) => a.serialize()),
            immediateActions: this.immediateActions.map((a) => a.serialize()),
        };
    }
    static deserialize(obj) {
        return new ActionStack((obj.actions ?? []).map(PossibleAction.deserialize), (obj.immediateActions ?? []).map(PossibleAction.deserialize));
    }
}
export function isCattleCard(card) {
    return card.value !== undefined;
}
export function isObjectiveCard(card) {
    return card.tasks !== undefined;
}
export function defaultOptions(edition = Edition.FIRST, extra = {}) {
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
        ...extra,
    };
}
