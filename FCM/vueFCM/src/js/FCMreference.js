import i18n from '../i18n'
const t = i18n.global.t; // Shortcut

export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ["admin", "BotKickStarter"]

export const FRIED_GEESE_DONKEY = 0
export const GLUTTONY_INC = 1
export const DUCK_DINER = 2
export const SANTA_MARIA_PIZZA = 3
export const XANGO_BLUES = 4
export const SIAP_FAJI = 5

export const BOT_NAME = "FcmBot"
export const TOURNAMENT_ADMIN_NAME = "FCMtourneyAdmin"
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
export const REWIND_CONSENT_VOTE_TOPIC = "rewind_consent_votes"
export const KICKOUT_VOTE_TOPIC = "kickout_player_votes"
export const KICKOUT_SOLO_DELAY_MS = 2 * 24 * 60 * 60 * 1000

// Map constants - any map is superimposed on a grid 17x16
export const ssW = 17 * 5 // small square width
export const ssH = 16 * 5 // small square height

// Starting options
export const SO_SHORT_GAME = 1
export const SO_NO_MILESTONES = 2
export const SO_NO_CEO_MILESTONE = 3
export const SO_ALLOW_SURRENDER = 5
export const SO_NO_RADIO_MILESTONE = 6
export const SO_HARD_CHOICES = 8
export const SO_FRY_CHEFS = 9
export const SO_KIMCHI = 10
export const SO_SUSHI = 11
export const SO_NOODLES = 12
export const SO_GOURMET = 13
export const SO_MOVIE_STARS = 14
export const SO_MASS_MARKETERS = 15
export const SO_NIGHT_SHIFT = 16
export const SO_RURAL_MARKETERS = 17
export const SO_NEW_DISTRICTS = 18
export const SO_NEW_DISTRICTS_APP = 181
export const SO_NEW_DISTRICTS_ALL = 182
export const SO_NEW_DISTRICTS_PARK = 183
export const SO_COFFEE = 19
export const SO_KETCHUP_MS = 20
export const SO_NEW_MS = 21
export const SO_LOBBYISTS = 22
export const SO_RESERVE_PRICE = 23
// Chinese Expansion
export const SO_URBAN_PLANNING = 40
export const SO_URBAN_PLANNING_PLUS = 41
export const SO_JAZZ_MUSICIANS = 42
export const SO_DUMPLINGS = 43
export const SO_DELIVERY_DRIVERS = 44
export const SO_HAWKERS = 45
// Other options
export const SO_STRICT_PAYDAY_FRIDGE = 101
export const SO_TRAINING_GAME = 102
export const SO_SANDBOX_MODE = 103
export const SO_DRAFT_MODULES = 205
export const SO_DRAFT_MODULE_BREAKER = 300

// Types when adding elements to map
export const TYPE_CAMPAIGN = 0
export const TYPE_GARDEN = 1
export const TYPE_HOUSE = 2
export const TYPE_RESTAURANT = 3
export const TYPE_COFFEE_SHOP = 4

// PHASES
export const PHASE_SETUP_RESTAURANT1 = 0
export const PHASE_SETUP_RESTAURANT2 = 1
export const PHASE_SETUP_RESERVE = 2
export const PHASE_RESTRUCTURING = 3
export const PHASE_TURN_ORDER = 4
export const PHASE_WORKING_DAY = 5
export const PHASE_DINNERTIME = 6
export const PHASE_PIZZA_BOMB = 11
export const PHASE_PAYDAY = 7
export const PHASE_MARKETING_CAMPAIGNS = 8
export const PHASE_COFFE_SHOP_MS = 12
export const PHASE_CLEAN_UP = 9
export const PHASE_GAME_OVER = 10
export const PHASE_SETUP_MODULES = 13
export const PHASE_URBAN_PLANNING = 14
export const PHASE_CHOOSE_CEO_BONUS = 15

// PRE-PHASES
export const PREPHASE_PAYDAY = 17
export const PREPHASE_CLEAN_UP = 19

// SUB PHASES
export const SUBPHASE_HIRING = 1
export const SUBPHASE_TRAINING = 2
export const SUBPHASE_COFFEE_SHOPS_FROM_TRAIN = 2.5
export const SUBPHASE_MARKETING = 3
export const SUBPHASE_PRODUCE = 4
export const SUBPHASE_HOUSES = 5
export const SUBPHASE_LOBBYISTS = 5.5
export const SUBPHASE_NEW_RESTAURANTS = 6

export const SUBPHASE_CONFIRM_END_TURN = 7

// CEO actions
export const CEO_ACTION_HIRE_1 = 0
export const CEO_ACTION_PRICE_MINUS_3 = 1
export const CEO_ACTION_RECRUITING_MANAGER = 2
export const CEO_ACTION_COACH = 3

// Item box items - being added to map
export const ITEM_BOX_RESTO = 0
export const ITEM_BOX_CAMPAIGN = 1
export const ITEM_BOX_HOUSE = 2
export const ITEM_BOX_LOBBYIST = 3
export const ITEM_BOX_FREEWAY = 4
export const ITEM_BOX_URBAN_PLANNING = 5

// normal Actions
export const ACT_NONE = -1
export const ACT_PLACE_FREEWAY = 0

export const ACT_CONFIRM_RESIGN = 101
export const ACT_CONFIRM_KICKOUT = 102
export const ACT_CONFORM_END_TURN = 103
export const ACT_CONFIRM_DELAY_FIRST_RESTO = 104
export const ACT_CONFIRM_NO_MORE_EMPLOYEES = 105

// RES CARDS
export const RES_CARD_NONE = -1
export const RES_CARD_OG_2_SLOTS = 1
export const RES_CARD_OG_3_SLOTS = 2
export const RES_CARD_OG_4_SLOTS = 3


// History
export const HISTORY_LENGTH = 30
// actions possible
export const HIST_SETUP_GAME = 0 // checked
export const HIST_CHOOSE_RESTAURANT_STARTING_POSITION = 1
export const HIST_CHOOSE_RESERVE_CARD = 2
export const HIST_CHOOSE_STRUCTURE = 3 // NB BEACH is stored but NOT displayed
export const HIST_DELAY_SETUP = 4
export const HIST_CHOOSE_TURN_ORDER = 5
export const HIST_CHOOSE_TURN_ORDER_FORCED = 6
export const HIST_CHOOSE_TURN_ORDER_AUTO_EARLY = 62
export const HIST_CHOOSE_TURN_ORDER_AUTO_LATE = 63
export const HIST_HIRE = 7
export const HIST_TRAIN = 8
export const HIST_START_MARKETING_CAMPAIGN = 9
export const HIST_PRODUCE_FOOD_DRINKS = 10 // checked
export const HIST_BANK_BREAK = 11
export const HIST_BUILD_GARDEN = 12
export const HIST_BUILD_HOUSE = 13
export const HIST_OPEN_RESTAURANT = 14
export const HIST_MOVE_RESTAURANT = 15
export const HIST_DINNER_TIME = 16
export const HIST_SALARY = 17 // checked
export const HIST_SALARY_STRICT = 18
export const HIST_MARKETING_CAMPAIGN_PHASE = 19
export const HIST_INCOME = 20 // checked
export const HIST_NEW_MILESTONE = 21 // checked
export const HIST_DISPLAY_RESERVE = 22
export const HIST_FIRE = 23
export const HIST_FRIDGE_RESOURCES = 24
export const HIST_NEW_TURN = 25 // checked
export const HIST_END_GAME = 26
export const HIST_BANKRUPT = 27
export const HIST_TOTAL_BANKRUPT = 28
export const HIST_ONE_LEFT = 29
export const HIST_MARKETING_EARNING = 30
export const HIST_PIZZA_BOMB = 31
export const HIST_DISCOUNT_MILESTONE = 32
export const HIST_LOBBYIST_PARK = 33
export const HIST_LOBBYIST_ROAD = 34
export const HIST_COFFEE_SALE = 35
export const HIST_COFFE_SHOP_BUILD = 36
export const HIST_COFFE_SHOP_REMOVE = 37
export const HIST_REWIND = 38 // checked
export const HIST_RESIGN = 39 // checked
export const HIST_KICKOUT = 40 // checked
export const HIST_CHOOSE_MODULE = 41
export const HIST_NEW_TILE = 42
export const HIST_ADD_FREEWAY = 43
export const HIST_RESTO_MAILBOX_MS = 44
export const HIST_START_NS_CAMPAIGN = 45
export const HIST_PRODUCE_KIMCHI = 46
export const HIST_CEO_BONUS_CHOSEN = 47
export const HIST_REMOVE_HC_MS = 48

export const LEMONADE = 0
export const COKE = 1
export const BEER = 2
export const PIZZA = 3
export const BURGER = 4
export const COFFEE = 5
export const NOODLES = 6
export const SUSHI = 7
export const KIMCHI = 8
export const DUMPLING = 9
export const DRINK = [BEER, COKE, LEMONADE]

export const BLANK_EMPLOYEE_SPACE = -1
export const WAITRESS = 0
export const NEW_BUSINESS_DEVELOPER = 1
export const LOCAL_MANAGER = 2
export const REGIONAL_MANAGER = 3
export const CFO = 4
export const MANAGEMENT_TRAINEE = 5
export const JUNIOR_VICE_PRESIDENT = 6
export const VICE_PRESIDENT = 7
export const SENIOR_VICE_PRESIDENT = 8
export const EXECUTIVE_VICE_PRESIDENT = 9
export const PRICING_MANAGER = 10
export const LUXURIES_MANAGER = 11
export const DISCOUNT_MANAGER = 12
// These need to be here, so the numbers are in the range of campaigns that could be from multiple sources
export const MARKETING_TRAINEE = 13
export const CAMPAIGN_MANAGER = 14
export const BRAND_MANAGER = 15
export const BRAND_DIRECTOR = 16
// They must be 16 or lower, as camp 17 is GFC only
export const RECRUITING_GIRL = 17
export const RECRUITING_MANAGER = 18
export const HR_DIRECTOR = 19
export const TRAINER = 20
export const COACH = 21
export const GURU = 22
export const ERRAND_BOY = 23
export const CART_OPERATOR = 24
export const TRUCK_DRIVER = 25
export const ZEPPELIN_PILOT = 26

export const KITCHEN_TRAINEE = 27
export const BURGER_COOK = 28
export const BURGER_CHEF = 29
export const PIZZA_COOK = 30
export const PIZZA_CHEF = 31
export const FRY_CHEF = 32
export const KIMCHI_MASTER = 33
export const NOODLE_COOK = 34
export const NOODLE_CHEF = 35
export const SUSHI_COOK = 36
export const SUSHI_CHEF = 37
export const BARISTA_TRAINEE = 38
export const BARISTA = 39
export const LEAD_BARISTA = 40
export const B_MOVIE_STAR = 41
export const C_MOVIE_STAR = 42
export const D_MOVIE_STAR = 43
export const GOURMET_FOOD_CRITIC = 44
export const LOBBYIST = 45
export const MASS_MARKETEER = 46
export const NIGHT_SHIFT_MANAGER = 47
export const RURAL_MARKETEER = 48
// Chinese Expansion
export const DUMPLING_COOK = 49
export const DUMPLING_CHEF = 50
export const HAWKER_MARKETEER = 51
export const DELIVERY_DRIVER = 52
export const JAZZ_MUSICIAN = 53

// NB TO INDICATE TRAIN FROM STRUC, 70 IS ADDED TO THE EMPLOYEE NUMBER ???????????
export const EMPLOYEE_ARRANGEMENT = [
	NIGHT_SHIFT_MANAGER,
	// 1
	NEW_BUSINESS_DEVELOPER,
	LOCAL_MANAGER,
	REGIONAL_MANAGER,
	CFO,
	// 5
	MANAGEMENT_TRAINEE,
	JUNIOR_VICE_PRESIDENT,
	VICE_PRESIDENT,
	SENIOR_VICE_PRESIDENT,
	EXECUTIVE_VICE_PRESIDENT,
	// 10
	RECRUITING_GIRL,
	-1,
	RECRUITING_MANAGER,
	-1,
	HR_DIRECTOR,
	// 15
	TRAINER,
	-1,
	COACH,
	GURU,
	-1,
	// 20
	PRICING_MANAGER,
	LUXURIES_MANAGER,
	DISCOUNT_MANAGER,
	-1,
	-1,
	// 25
	MARKETING_TRAINEE,
	CAMPAIGN_MANAGER,
	BRAND_MANAGER,
	BRAND_DIRECTOR,
	-1,
	// 30
	-1,
	MASS_MARKETEER,
	-1,
	-1,
	-1,
	// 35
	-1,
	RURAL_MARKETEER,
	-1,
	-1,
	-1,
	// 40
	-1,
	GOURMET_FOOD_CRITIC,
	-1,
	-1,
	-1,
	// 45
	-1,
	HAWKER_MARKETEER,
	-1,
	-1,
	-1,
	// Drinks 50
	23,
	24,
	25,
	26,
	-1,
	// 55
	WAITRESS,
	B_MOVIE_STAR,
	-1,
	-1,
	-1,
	// 60
	-1,
	C_MOVIE_STAR,
	-1,
	-1,
	-1,
	// 65
	-1,
	D_MOVIE_STAR,
	-1,
	-1,
	-1,
	// 70
	-1,
	JAZZ_MUSICIAN,
	-1,
	-1,
	-1,
	//
	LOBBYIST,
	-1,
	-1,
	-1,
	-1,
	//
	DELIVERY_DRIVER,
	-1,
	-1,
	-1,
	-1,
	//
	27,
	28,
	29,
	-1,
	-1,
	//
	-1,
	30,
	31,
	-1,
	-1,
	//
	-1,
	SUSHI_COOK,
	SUSHI_CHEF,
	-1,
	-1,
	//
	-1,
	NOODLE_COOK,
	NOODLE_CHEF,
	-1,
	-1,
	//
	-1,
	DUMPLING_COOK,
	DUMPLING_CHEF,
	-1,
	-1,
	//
	-1,
	-1,
	FRY_CHEF,
	-1,
	-1,
	//
	KIMCHI_MASTER,
	-1,
	-1,
	-1,
	-1,
	//
	BARISTA_TRAINEE,
	BARISTA,
	LEAD_BARISTA,
	-1,
	-1,
	// ADD AN EXTRA -1 AT END to trigger adding final row if needed
	//-1,
]

export const BASE_UNIQUE_CARDS = [REGIONAL_MANAGER, CFO, EXECUTIVE_VICE_PRESIDENT, LUXURIES_MANAGER, HR_DIRECTOR, GURU, ZEPPELIN_PILOT, BRAND_DIRECTOR, BURGER_CHEF, PIZZA_CHEF]
export const UNIQUE_CARDS = [REGIONAL_MANAGER, CFO, EXECUTIVE_VICE_PRESIDENT, LUXURIES_MANAGER, HR_DIRECTOR, GURU, ZEPPELIN_PILOT, BRAND_DIRECTOR, BURGER_CHEF, PIZZA_CHEF, KIMCHI_MASTER, SUSHI_CHEF, NOODLE_CHEF, LEAD_BARISTA, B_MOVIE_STAR, C_MOVIE_STAR, D_MOVIE_STAR, NIGHT_SHIFT_MANAGER, DUMPLING_CHEF]
export const HIREABLE_EMPLOYEES = [WAITRESS, MANAGEMENT_TRAINEE, PRICING_MANAGER, RECRUITING_GIRL, TRAINER, ERRAND_BOY, MARKETING_TRAINEE, KITCHEN_TRAINEE, BARISTA_TRAINEE, KIMCHI_MASTER, NIGHT_SHIFT_MANAGER, LOBBYIST, DELIVERY_DRIVER]
export const REQUIRE_SALARY = [NEW_BUSINESS_DEVELOPER, LOCAL_MANAGER, REGIONAL_MANAGER, CFO, JUNIOR_VICE_PRESIDENT, VICE_PRESIDENT, SENIOR_VICE_PRESIDENT, EXECUTIVE_VICE_PRESIDENT, LUXURIES_MANAGER, DISCOUNT_MANAGER, RECRUITING_MANAGER, HR_DIRECTOR, COACH, GURU, CART_OPERATOR, TRUCK_DRIVER, ZEPPELIN_PILOT, CAMPAIGN_MANAGER, BRAND_MANAGER, BRAND_DIRECTOR, BURGER_COOK, BURGER_CHEF, PIZZA_COOK, PIZZA_CHEF, FRY_CHEF, KIMCHI_MASTER, NOODLE_COOK, NOODLE_CHEF, SUSHI_COOK, SUSHI_CHEF, BARISTA, LEAD_BARISTA, B_MOVIE_STAR, C_MOVIE_STAR, D_MOVIE_STAR, GOURMET_FOOD_CRITIC, LOBBYIST, MASS_MARKETEER, NIGHT_SHIFT_MANAGER, RURAL_MARKETEER, DUMPLING_COOK, DUMPLING_CHEF, HAWKER_MARKETEER, DELIVERY_DRIVER, JAZZ_MUSICIAN]
export const TRAINABLE_BASE = [MANAGEMENT_TRAINEE, ERRAND_BOY, MARKETING_TRAINEE, KITCHEN_TRAINEE, BARISTA_TRAINEE]
export const MANAGERS = [MANAGEMENT_TRAINEE, JUNIOR_VICE_PRESIDENT, VICE_PRESIDENT, SENIOR_VICE_PRESIDENT, EXECUTIVE_VICE_PRESIDENT, NIGHT_SHIFT_MANAGER]
export const MARKETERS = [MARKETING_TRAINEE, CAMPAIGN_MANAGER, BRAND_MANAGER, BRAND_DIRECTOR, GOURMET_FOOD_CRITIC, MASS_MARKETEER, RURAL_MARKETEER, HAWKER_MARKETEER]
export const PRODUCERS = [KITCHEN_TRAINEE, PIZZA_COOK, PIZZA_CHEF, BURGER_COOK, BURGER_CHEF, ERRAND_BOY, CART_OPERATOR, TRUCK_DRIVER, ZEPPELIN_PILOT, NOODLE_COOK, NOODLE_CHEF, SUSHI_COOK, SUSHI_CHEF, BARISTA_TRAINEE, BARISTA, LEAD_BARISTA, DUMPLING_COOK, DUMPLING_CHEF]
export const CAN_BUILD_RESTAURANT = [LOCAL_MANAGER, REGIONAL_MANAGER]
export const COOKS = [PIZZA_COOK, PIZZA_CHEF, BURGER_COOK, BURGER_CHEF, NOODLE_COOK, NOODLE_CHEF, SUSHI_COOK, SUSHI_CHEF, BARISTA_TRAINEE, BARISTA, LEAD_BARISTA, DUMPLING_COOK, DUMPLING_CHEF]
export const ORIGINAL_AVAILABLE_EMPLOYEES = [
	12,
	6,
	6,
	3,
	3,
	18,
	12,
	6,
	6,
	3,
	12, // 0 - 10
	3,
	6,
	12,
	6,
	6, //15
	3,
	12,
	6,
	3,
	12, //20
	6,
	3,
	12,
	6,
	6,
	3,
	12,
	6,
	3,
	6, //30
	3,
	-1,
	-1,
	-1,
	-1,
	-1,
	-1,
	-1,
	-1,
	-1, //40
	-1,
	-1,
	-1,
	-1,
	-1,
	-1,
	-1,
	-1, //48
	// Chinese Expansion
	-1, 
	-1,
	-1,
	-1,
	-1,
]
/*exp, 32-48*/ /*-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]*/

export const getRangeForEmployee = function (employee) {
	// 8 is infinite, -2 is no range
	if (employee === LOCAL_MANAGER) return 3
	if (employee === REGIONAL_MANAGER) return 8
	if (employee === CART_OPERATOR) return 2
	if (employee === TRUCK_DRIVER) return 3
	if (employee === ZEPPELIN_PILOT) return 4
	if (employee === MARKETING_TRAINEE) return 2
	if (employee === CAMPAIGN_MANAGER) return 3
	if (employee === BRAND_MANAGER) return 8
	if (employee === BRAND_DIRECTOR) return 8
	// Expansion
	if (employee === LOBBYIST) return 2
	if (employee === BARISTA) return 2
	if (employee === LEAD_BARISTA) return 8
	// Chinese Expansion
	if (employee === HAWKER_MARKETEER) return 2

	return -2
}

export const getRangeType = function (employee) {
	if (employee === REGIONAL_MANAGER) return "air"
	if (employee === ZEPPELIN_PILOT) return "air"
	if (employee === BRAND_MANAGER) return "air"
	if (employee === BRAND_DIRECTOR) return "air"
	if (employee === LEAD_BARISTA) return "air"

	return "road"
}

export const FIRST_HIRE_3 = 0
export const FIRST_THROW_AWAY = 1
export const FIRST_WAITRESS = 2
export const FIRST_20_DOL = 3
export const FIRST_100_DOL = 4
export const FIRST_LOWER_PRICES = 5
export const FIRST_TRAIN = 6
export const FIRST_BURGER_PRODUCED = 7
export const FIRST_PIZZA_PRODUCED = 8
export const FIRST_ERRAND_BOY = 9
export const FIRST_CART_OPERATOR = 10
export const FIRST_20_SALARIES = 11
export const FIRST_BILLBOARD = 12
export const FIRST_BURGER_MARKETED = 13
export const FIRST_PIZZA_MARKETED = 14
export const FIRST_DRINK_MARKETED = 15
export const FIRST_AIRPLANE_CAMPAIGN = 16
export const FIRST_RADIO_CAMPAIGN = 17
export const FIRST_MARKETEER_USED = 18 // OK
export const FIRST_MARKETING_TRAINEE_USED = 19 // OK
export const FIRST_CAMPAIGN_MANAGER_USED = 20 // OK
export const FIRST_BRAND_MANAGER_USED = 21 // OK
export const FIRST_BRAND_DIRECTOR_USED = 22 // OK
export const FIRST_BURGER_SOLD = 23 // OK
export const FIRST_PIZZA_SOLD = 24
export const FIRST_LEMONADE_SOLD = 25 // OK
export const FIRST_BEER_SOLD = 26 // OK
export const FIRST_COKE_SOLD = 27 // OK
export const FIRST_RECRUITING_GIRL_USED = 28 // OK
export const FIRST_TRAINER_USED = 29 // OK
export const FIRST_DISCOUNT_MANAGER_USED = 30 // OK
export const FIRST_HOUSE_BUILT = 31 // OK
export const FIRST_NEW_RESTAURANT = 32 // OK
export const FIRST_WAITRESS_USED = 33 // OK
export const FIRST_CART_OPERATOR_USED = 34 // OK
export const FIRST_RURAL_MARKETEER_USED = 35 // module
export const FIRST_COFFEE_SOLD = 36 // module
export const SOMEONE_SELLS_YOUR_DEMAND = 37 // module
export const FIRST_LOBBYIST_USED = 38 // module
export const FIRST_DUMPLING_SOLD = 39 // module

export const BASE_GAME_MILESTONES = [FIRST_HIRE_3, FIRST_THROW_AWAY, FIRST_WAITRESS, FIRST_20_DOL, FIRST_100_DOL, FIRST_LOWER_PRICES, FIRST_TRAIN, FIRST_BURGER_PRODUCED, FIRST_PIZZA_PRODUCED, FIRST_ERRAND_BOY, FIRST_CART_OPERATOR, FIRST_20_SALARIES, FIRST_BILLBOARD, FIRST_BURGER_MARKETED, FIRST_PIZZA_MARKETED, FIRST_DRINK_MARKETED, FIRST_AIRPLANE_CAMPAIGN, FIRST_RADIO_CAMPAIGN]
export const KETCHUP_NEW_MILESTONES = [FIRST_MARKETEER_USED, FIRST_MARKETING_TRAINEE_USED, FIRST_CAMPAIGN_MANAGER_USED, FIRST_BRAND_MANAGER_USED, FIRST_BRAND_DIRECTOR_USED, FIRST_BURGER_SOLD, FIRST_PIZZA_SOLD, FIRST_LEMONADE_SOLD, FIRST_BEER_SOLD, FIRST_COKE_SOLD, FIRST_RECRUITING_GIRL_USED, FIRST_TRAINER_USED, FIRST_DISCOUNT_MANAGER_USED, FIRST_HOUSE_BUILT, FIRST_NEW_RESTAURANT, FIRST_WAITRESS_USED, FIRST_CART_OPERATOR_USED]

export const RADIO = 0
export const AIRPLANE = 1
export const MAIL = 2
export const BILLBOARD = 3
export const GOURMET_GUIDE = 4
export const GIANT_BILLBOARD = 5
export const HAWKER_TRUCK = 6

export const MARKETING_CAMPAIGNS = [
	{},
	{ type: RADIO, width: 1, height: 1 },
	{ type: RADIO, width: 1, height: 1 },
	{ type: RADIO, width: 1, height: 1 }, //3
	{ type: AIRPLANE, width: 2, height: 1 },
	{ type: AIRPLANE, width: 3, height: 2 },
	{ type: AIRPLANE, width: 5, height: 2 }, //6
	{ type: MAIL, width: 2, height: 2 },
	{ type: MAIL, width: 2, height: 2 },
	{ type: MAIL, width: 1, height: 1 },
	{ type: MAIL, width: 1, height: 1 }, //10
	{ type: BILLBOARD, width: 3, height: 2 }, //11
	{ type: BILLBOARD, width: 2, height: 2 },
	{ type: BILLBOARD, width: 3, height: 1 }, //13
	{ type: BILLBOARD, width: 2, height: 1 }, //14
	{ type: BILLBOARD, width: 1, height: 1 },
	{ type: BILLBOARD, width: 1, height: 1 },
	{ type: GOURMET_GUIDE, width: 2, height: 2 },
	{ type: GOURMET_GUIDE, width: 2, height: 2 },
	{ type: GOURMET_GUIDE, width: 2, height: 2 },
	{ type: GOURMET_GUIDE, width: 2, height: 2 },
	// Set height to 3 not 1 so a rotation isn't asked for during camptain selection
	{ type: GIANT_BILLBOARD, width: 3, height: 1 },//21
	{ type: GIANT_BILLBOARD, width: 3, height: 1 },
	{ type: GIANT_BILLBOARD, width: 3, height: 1 },
	{ type: GIANT_BILLBOARD, width: 3, height: 1 },//24
	// INTERALLY, HAWKERS MUST BE SET TO 25-27 SO AS NOT TO CONFLICT
	{ type: HAWKER_TRUCK, width: 3, height: 3 },//25
	{ type: HAWKER_TRUCK, width: 3, height: 3 },
	{ type: HAWKER_TRUCK, width: 3, height: 3 },//27

]

export const SMALL_CAMPAIGNS = [1, 2, 3, 9, 10, 15, 16]
export const ROTATABLE_CAMPAIGNS = [4, 5, 6, 11, 13, 14]

//rf.PARKS = [
//	{shape: "I", width: 4, height: 1 }
//]

// On the board :
export const OFF_BOARD = -1
export const EMPTY_SPACE = 0
export const ROAD = 1
export const DRINK_BEER = 2
export const DRINK_COKE = 3
export const DRINK_LEMONADE = 4
//export const ROADWORKS = 5 // Not used - use ROAD_UC
export const ROAD_UC = 6
export const PARK = 7
export const FREEWAY = 8
export const HOUSE = 10 // + house number IE 11-29,31,32,35
export const MARKETING = 130 // + campaign number // NB THIS IS BAD. MARKETING SHOULD HAVE ~30 numbers reserved for it.
export const RESTAURANT_OPEN = 140 // + colour // THIS CAN CLASH WITTH MARKETING CAMPAIGNS
export const RESTAURANT_COMING_SOON = 150 // + colour // SAME HERE. I don't think it matters as coords are only really chacked for roads/space
export const COFFEE_SHOP = 160 // + colour

export const GARDEN = 59
export const BRIDGE_H = 60
export const BRIDGE_V = 61
//rf.PARK = 62;
//rf.COFFEE_SHOP = 63; // + colour
/*rf.ADDITIONAL_HOUSES = 50; // + 21 or 22 or 25
rf.HOUSE_21 = 71;
rf.HOUSE_22 = 72;
rf.HOUSE_25 = 75;
rf.HOUSE_PI = 80;
rf.HOUSE9_34 = 81;*/

export const ROADS = [ROAD, BRIDGE_H, BRIDGE_V]
export const BRIDGES = [BRIDGE_H, BRIDGE_V]

// 20 Normal
// 5 New district
// 1 Lobbyist (double park)
export const TILES = [
	[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0], //0
	[0, 0, 1, 0, 0, 4, 0, 1, 0, 0, 1, 1, 61, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 2, 0],
	[0, 0, 1, 0, 0, 0, 3, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
	[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 25, 25, 0, 0, 0, 25, 25],
	[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 23, 23, 0, 0, 0, 23, 23, 0, 0],
	[1, 1, 1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 18, 18, 1, 0, 0, 18, 18, 1, 0, 0, 1, 1, 1],
	[0, 2, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0], //6
	//[1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	[1, 1, 1, 1, 1, 1, 0, 15, 15, 1, 1, 0, 15, 15, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
	[0, 0, 1, 1, 1, 0, 26, 26, 0, 1, 1, 26, 26, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0], //8
	[1, 1, 1, 1, 1, 1, 17, 17, 0, 1, 1, 17, 17, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[22, 22, 1, 0, 0, 22, 22, 1, 0, 0, 1, 1, 61, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0], //10
	[1, 1, 1, 1, 1, 1, 0, 28, 28, 1, 1, 0, 28, 28, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], //11
	//[1,1,1,1,1,1,1,28,28,1,1,1,28,28,1,1,1,1,1,1,1,1,1,1,1],
	[0, 0, 1, 0, 0, 0, 2, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	//[1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	[20, 20, 1, 0, 0, 20, 20, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 1, 0, 0, 0, 4, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
	[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 12, 12, 1, 0, 0, 12, 12, 1, 0, 0],
	[0, 0, 1, 14, 14, 0, 0, 1, 14, 14, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
	[0, 0, 1, 1, 1, 0, 0, 0, 4, 1, 1, 0, 0, 0, 1, 1, 3, 0, 0, 0, 1, 1, 1, 0, 0],
	[0, 0, 1, 3, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 2, 0, 1, 0, 0, 0, 0, 1, 0, 0],
	[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0], //19

	//[0, 0, 0, 0, 0, 35, 35, 0, 0, 0, 35, 35, 1, 1, 1, 59, 59, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 35, 35, 0, 0, 0, 35, 35, 1, 1, 1, 35, 35, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 32, 32, 0, 0, 0, 32, 32, 0, 1, 1, 1, 1, 1, 0, 31, 31, 0, 0, 0, 31, 31, 0, 0],
	[0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 4, 0, 4, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 0],
	//[0, 0, 1, 0, 0, 0, 80, 80, 80, 0, 1, 80, 80, 80, 1, 0, 80, 80, 80, 0, 0, 0, 1, 0, 0],
	[0, 0, 1, 0, 0, 0, 13.2, 13.2, 13.2, 0, 1, 13.2, 13.2, 13.2, 1, 0, 13.2, 13.2, 13.2, 0, 0, 0, 1, 0, 0],
	[1, 1, 1, 1, 1, 1, 19.7, 19.7, 19.7, 1, 1, 19.7, 19.7, 19.7, 1, 1, 19.7, 19.7, 19.7, 0, 1, 1, 1, 0, 0],
	[7, 7, 1, 0, 0, 7, 7, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 7, 7, 0, 0, 1, 7, 7],
	[-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
]

export const HOUSE_SQS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 35]

// QWERT
export const BOARD_HOUSES = [2, 4, 5, 7, 8, 10, 12, 13, 15, 16, 18, 21, 22] // NB 25 isn't considered a "board" house because it comes with a garden built in
export const APARTMENT_3 = 3.2
export const APARTMENT_9 = 9.7
export const APARTMENTS = [APARTMENT_3, APARTMENT_9]
export const AVAILABLE_HOUSES = [1, 3, 6, 9, 11, 14, 17, 19]
export const RURAL_MARKETING_AREA = 26
// No 20,23,24
export const ALL_HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 25]

// KETCHUP

export const HC_OLD_MS_LEAVE_END_TURN_2 = [FIRST_BURGER_MARKETED, FIRST_PIZZA_MARKETED, FIRST_DRINK_MARKETED, FIRST_TRAIN]
export const HC_OLD_MS_LEAVE_END_TURN_3 = [FIRST_HIRE_3]

export const HC_NEW_MS_LEAVE_END_TURN_2 = [FIRST_MARKETEER_USED, FIRST_TRAINER_USED, FIRST_RECRUITING_GIRL_USED]

export const ADD_RESTO = 1
export const ADD_RESTO_WD = 2

//rf.SCENARIO_NAMES = ['[Cool Original]', '[New MS]', '[First Coffee]', '[Korean City]', '[Nightlife]', '[Sustenance]', '[Upmarket Area]', '[City Builder]', '[Asian Fusion]', '[First Mover]', '[Overtime]', '[Henri Lo]'];
export const getParkModel = function (variety, rotation, flipped) {
	if (variety === 0) {
		if (rotation === 0) return [[1, 1, 1, 1]]
		if (rotation === 1) return [[1], [1], [1], [1]]
	}
	if (variety === 1) {
		if (rotation === 0)
			return [
				[1, 1, 1],
				[0, 1, 0],
			]
		if (rotation === 1)
			return [
				[0, 1],
				[1, 1],
				[0, 1],
			]
		if (rotation === 2)
			return [
				[0, 1, 0],
				[1, 1, 1],
			]
		if (rotation === 3)
			return [
				[1, 0],
				[1, 1],
				[1, 0],
			]
	}
	if (variety === 2) {
		if (rotation === 0 && !flipped)
			return [
				[1, 1, 1],
				[0, 0, 1],
			]
		if (rotation === 1 && !flipped)
			return [
				[0, 1],
				[0, 1],
				[1, 1],
			]
		if (rotation === 2 && !flipped)
			return [
				[1, 0, 0],
				[1, 1, 1],
			]
		if (rotation === 3 && !flipped)
			return [
				[1, 1],
				[1, 0],
				[1, 0],
			]
		if (rotation === 0 && flipped)
			return [
				[1, 1, 1],
				[1, 0, 0],
			]
		if (rotation === 1 && flipped)
			return [
				[1, 1],
				[0, 1],
				[0, 1],
			]
		if (rotation === 2 && flipped)
			return [
				[0, 0, 1],
				[1, 1, 1],
			]
		if (rotation === 3 && flipped)
			return [
				[1, 0],
				[1, 0],
				[1, 1],
			]
	}
}

export function sortEmployees(employees) {
	const sortingOrder = [NIGHT_SHIFT_MANAGER, EXECUTIVE_VICE_PRESIDENT, SENIOR_VICE_PRESIDENT, VICE_PRESIDENT, JUNIOR_VICE_PRESIDENT, MANAGEMENT_TRAINEE, CFO, HR_DIRECTOR, RECRUITING_MANAGER, RECRUITING_GIRL, GURU, COACH, TRAINER, MASS_MARKETEER, GOURMET_FOOD_CRITIC, RURAL_MARKETEER, BRAND_DIRECTOR, BRAND_MANAGER, CAMPAIGN_MANAGER, HAWKER_MARKETEER, MARKETING_TRAINEE, KIMCHI_MASTER, LEAD_BARISTA, BARISTA, BARISTA_TRAINEE, DUMPLING_CHEF, DUMPLING_COOK, SUSHI_CHEF, SUSHI_COOK, NOODLE_CHEF, NOODLE_COOK, PIZZA_CHEF, PIZZA_COOK, BURGER_CHEF, BURGER_COOK, KITCHEN_TRAINEE, ZEPPELIN_PILOT, TRUCK_DRIVER, CART_OPERATOR, ERRAND_BOY, NEW_BUSINESS_DEVELOPER, LOBBYIST, REGIONAL_MANAGER, LOCAL_MANAGER, LUXURIES_MANAGER, FRY_CHEF, DISCOUNT_MANAGER, PRICING_MANAGER, B_MOVIE_STAR, C_MOVIE_STAR, D_MOVIE_STAR, JAZZ_MUSICIAN, WAITRESS, DELIVERY_DRIVER]

	employees.sort(function (x, y) {
		const xIndex = sortingOrder.indexOf(x)
		const yIndex = sortingOrder.indexOf(y)
		return xIndex - yIndex
	})
	return employees
}

export const MILESTONES_STR = [
	{ text: t('milestones.firstToHire3'), type: "waitress", title: t('milestones.firstToHire3Title'), description: t('milestones.firstToHire3Desc'), img: "m_icon29.png" },
	{ text: t('milestones.firstToThrowAway'), type: "waitress", title: t('milestones.firstToThrowAwayTitle'), description: t('milestones.firstToThrowAwayDesc'), img: "m_icon27.png", additionalClass: "vertical" },
	{ text: t('milestones.firstWaitress'), type: "waitress", title: t('milestones.firstWaitressTitle'), description: t('milestones.firstWaitressDesc'), img: "m_icon16.png", additionalClass: "smaller" },
	{ text: t('milestones.firstToHave20'), type: "waitress", title: t('milestones.firstToHave20Title'), description: t('milestones.firstToHave20Desc'), img: "m_icon24.png" },
	{ text: t('milestones.firstToHave100'), type: "waitress", title: t('milestones.firstToHave100Title'), description: t('milestones.firstToHave100Desc'), img: "m_icon24.png", additionalClass: "smaller" },
	{ text: t('milestones.firstToLowerPrices'), type: "pricing", title: t('milestones.firstToLowerPricesTitle'), description: t('milestones.firstToLowerPricesDesc'), img: "m_icon23.png" },
	{ text: t('milestones.firstToTrain'), type: "hiring", title: t('milestones.firstToTrainTitle'), description: t('milestones.firstToTrainDesc'), img: "m_icon28.png", additionalClass: "vertical" },
	{ text: t('milestones.firstBurgerProduced'), type: "food", title: t('milestones.firstBurgerProducedTitle'), description: t('milestones.firstBurgerProducedDesc'), img: "m_icon04.png" },
	{ text: t('milestones.firstPizzaProduced'), type: "food", title: t('milestones.firstPizzaProducedTitle'), description: t('milestones.firstPizzaProducedDesc'), img: "m_icon07.png", additionalClass: "vertical" },
	{ text: t('milestones.firstErrandBoy'), type: "drink", title: t('milestones.firstErrandBoyTitle'), description: t('milestones.firstErrandBoyDesc'), img: "m_icon26.png", additionalClass: "smaller" },
	{ text: t('milestones.firstCartOperator'), type: "drink", title: t('milestones.firstCartOperatorTitle'), description: t('milestones.firstCartOperatorDesc'), img: "m_icon17.png", additionalClass: "cart" },
	{ text: t('milestones.firstToPay20Salaries'), type: "hiring", title: t('milestones.firstToPay20SalariesTitle'), description: t('milestones.firstToPay20SalariesDesc'), img: "m_icon21.png" },
	{ text: t('milestones.firstBillboard'), type: "marketer", title: t('milestones.firstBillboardTitle'), description: t('milestones.firstBillboardDesc'), img: "m_icon05.png", additionalClass: "billboard" },
	{ text: t('milestones.firstBurgerMarketed'), type: "marketer", title: t('milestones.firstBurgerMarketedTitle'), description: t('milestones.firstBurgerMarketedDesc'), img: "m_icon04.png" },
	{ text: t('milestones.firstPizzaMarketed'), type: "marketer", title: t('milestones.firstPizzaMarketedTitle'), description: t('milestones.firstPizzaMarketedDesc'), img: "m_icon07.png", additionalClass: "vertical" },
	{ text: t('milestones.firstDrinkMarketed'), type: "marketer", title: t('milestones.firstDrinkMarketedTitle'), description: t('milestones.firstDrinkMarketedDesc'), img: "m_icon10.png", additionalClass: "vertical" },
	{ text: t('milestones.firstAirplane'), type: "marketer", title: t('milestones.firstAirplaneTitle'), description: t('milestones.firstAirplaneDesc'), img: "m_icon25.png", additionalClass: "plane" },
	{ text: t('milestones.firstRadio'), type: "marketer", title: t('milestones.firstRadioTitle'), description: t('milestones.firstRadioDesc'), img: "m_icon22.png", additionalClass: "vertical" },
	{ text: t('milestones.firstMarketeer'), type: "marketer", title: t('milestones.firstMarketeerTitle'), description: t('milestones.firstMarketeerDesc'), img: "m_icon05.png", additionalClass: "billboard" },
	{ text: t('milestones.firstMarketingTrainee'), type: "marketer", title: t('milestones.firstMarketingTraineeTitle'), description: t('milestones.firstMarketingTraineeDesc'), img: "m_icon01.png" },
	{ text: t('milestones.firstCampaignManager'), type: "marketer", title: t('milestones.firstCampaignManagerTitle'), description: t('milestones.firstCampaignManagerDesc'), img: "m_icon02.png" },
	{ text: t('milestones.firstBrandManager'), type: "marketer", title: t('milestones.firstBrandManagerTitle'), description: t('milestones.firstBrandManagerDesc'), img: "m_icon03.png", additionalClass: "higher" },
	{ text: t('milestones.firstBrandDirector'), type: "marketer", title: t('milestones.firstBrandDirectorTitle'), description: t('milestones.firstBrandDirectorDesc'), img: "m_icon06.png", additionalClass: "smaller higher" },
	{ text: t('milestones.firstBurgerSold'), type: "food", title: t('milestones.firstBurgerSoldTitle'), description: t('milestones.firstBurgerSoldDesc'), img: "m_icon04.png" },
	{ text: t('milestones.firstPizzaSold'), type: "food", title: t('milestones.firstPizzaSoldTitle'), description: t('milestones.firstPizzaSoldDesc'), img: "m_icon07.png", additionalClass: "vertical" },
	{ text: t('milestones.firstLemonadeSold'), type: "drink", title: t('milestones.firstLemonadeSoldTitle'), description: t('milestones.firstLemonadeSoldDesc'), img: "m_icon08.png" },
	{ text: t('milestones.firstBeerSold'), type: "drink", title: t('milestones.firstBeerSoldTitle'), description: t('milestones.firstBeerSoldDesc'), img: "m_icon09.png" },
	{ text: t('milestones.firstCokeSold'), type: "drink", title: t('milestones.firstCokeSoldTitle'), description: t('milestones.firstCokeSoldDesc'), img: "m_icon10.png", additionalClass: "vertical" },
	{ text: t('milestones.firstRecruitingGirl'), type: "hiring", title: t('milestones.firstRecruitingGirlTitle'), description: t('milestones.firstRecruitingGirlDesc'), img: "m_icon11.png", additionalClass: "vertical" },
	{ text: t('milestones.firstTrainer'), type: "hiring", title: t('milestones.firstTrainerTitle'), description: t('milestones.firstTrainerDesc'), img: "m_icon12.png", additionalClass: "trainer" },
	{ text: t('milestones.firstDiscountManager'), type: "pricing", title: t('milestones.firstDiscountManagerTitle'), description: t('milestones.firstDiscountManagerDesc'), img: "m_icon13.png" },
	{ text: t('milestones.firstHouse'), type: "waitress", title: t('milestones.firstHouseTitle'), description: t('milestones.firstHouseDesc'), img: "m_icon14.png", additionalClass: "house" },
	{ text: t('milestones.firstRestaurant'), type: "restaurant", title: t('milestones.firstRestaurantTitle'), description: t('milestones.firstRestaurantDesc'), img: "m_icon15.png" },
	{ text: t('milestones.firstWaitressUsed'), type: "waitress", title: t('milestones.firstWaitressUsedTitle'), description: t('milestones.firstWaitressUsedDesc'), img: "m_icon16.png", additionalClass: "smaller" },
	{ text: t('milestones.firstCartOperatorUsed'), type: "drink", title: t('milestones.firstCartOperatorUsedTitle'), description: t('milestones.firstCartOperatorUsedDesc'), img: "m_icon17.png", additionalClass: "cart vertical" },
	{ text: t('milestones.firstRuralMarketeer'), type: "marketer", title: t('milestones.firstRuralMarketeerTitle'), description: t('milestones.firstRuralMarketeerDesc'), img: "m_icon18.png" },
	{ text: t('milestones.firstCoffeeSold'), type: "coffee", title: t('milestones.firstCoffeeSoldTitle'), description: t('milestones.firstCoffeeSoldDesc'), img: "m_icon19.png" },
	{ text: t('milestones.someoneSellsYourDemand'), type: "manager inverted", title: t('milestones.someoneSellsYourDemandTitle'), description: t('milestones.someoneSellsYourDemandDesc'), img: "m_icon01.png" },
	{ text: t('milestones.firstLobbyist'), type: "waitress", title: t('milestones.firstLobbyistTitle'), description: t('milestones.firstLobbyistDesc'), img: "m_icon20.png", additionalClass: "higher" },
	{ text: t('milestones.firstDumplingSold'), type: "food", title: t('milestones.firstDumplingSoldTitle'), description: t('milestones.firstDumplingSoldDesc'), img: "m_icon01.png", additionalClass: "higher" }, // TODO class? Icon?
]

export const EMPLOYEES_STR = [
	{ title: t('employees.waitress'), description: t('employees.waitressDesc'), type: "waitress" },
	{ title: t('employees.newBusinessDeveloper'), description: t('employees.newBusinessDeveloperDesc'), type: "waitress" },
	{ title: t('employees.localManager'), description: t('employees.localManagerDesc'), type: "restaurant" },
	{ title: t('employees.regionalManager'), description: t('employees.regionalManagerDesc'), type: "restaurant" },
	{ title: t('employees.cfo'), description: t('employees.cfoDesc'), type: "waitress" },
	{ title: t('employees.managementTrainee'), description: t('employees.managementTraineeDesc'), type: "manager" },
	{ title: t('employees.juniorVicePresident'), description: t('employees.juniorVicePresidentDesc'), type: "manager" },
	{ title: t('employees.vicePresident'), description: t('employees.vicePresidentDesc'), type: "manager" },
	{ title: t('employees.seniorVicePresident'), description: t('employees.seniorVicePresidentDesc'), type: "manager" },
	{ title: t('employees.executiveVicePresident'), description: t('employees.executiveVicePresidentDesc'), type: "manager" },
	{ title: t('employees.pricingManager'), description: t('employees.pricingManagerDesc'), type: "pricing" },
	{ title: t('employees.luxuriesManager'), description: t('employees.luxuriesManagerDesc'), type: "pricing" },
	{ title: t('employees.discountManager'), description: t('employees.discountManagerDesc'), type: "pricing" },
	{ title: t('employees.marketingTrainee'), description: t('employees.marketingTraineeDesc'), type: "marketer" },
	{ title: t('employees.campaignManager'), description: t('employees.campaignManagerDesc'), type: "marketer" },
	{ title: t('employees.brandManager'), description: t('employees.brandManagerDesc'), type: "marketer" },
	{ title: t('employees.brandDirector'), description: t('employees.brandDirectorDesc'), type: "marketer" },

	{ title: t('employees.recruitingGirl'), description: t('employees.recruitingGirlDesc'), type: "hiring" },
	{ title: t('employees.recruitingManager'), description: t('employees.recruitingManagerDesc'), type: "hiring" },
	{ title: t('employees.hrDirector'), description: t('employees.hrDirectorDesc'), type: "hiring" },
	{ title: t('employees.trainer'), description: t('employees.trainerDesc'), type: "hiring" },
	{ title: t('employees.coach'), description: t('employees.coachDesc'), type: "hiring" },
	{ title: t('employees.guru'), description: t('employees.guruDesc'), type: "hiring" },
	{ title: t('employees.errandBoy'), description: t('employees.errandBoyDesc'), type: "drink" },
	{ title: t('employees.cartOperator'), description: t('employees.cartOperatorDesc'), type: "drink" },
	{ title: t('employees.truckDriver'), description: t('employees.truckDriverDesc'), type: "drink" },
	{ title: t('employees.zeppelinPilot'), description: t('employees.zeppelinPilotDesc'), type: "drink" },

	{ title: t('employees.kitchenTrainee'), description: t('employees.kitchenTraineeDesc'), type: "food" },
	{ title: t('employees.burgerCook'), description: t('employees.burgerCookDesc'), type: "food" },
	{ title: t('employees.burgerChef'), description: t('employees.burgerChefDesc'), type: "food" },
	{ title: t('employees.pizzaCook'), description: t('employees.pizzaCookDesc'), type: "food" },
	{ title: t('employees.pizzaChef'), description: t('employees.pizzaChefDesc'), type: "food" },
	{ title: t('employees.fryChef'), description: t('employees.fryChefDesc'), type: "food" },
	{ title: t('employees.kimchiMaster'), description: t('employees.kimchiMasterDesc'), type: "food" },
	{ title: t('employees.noodleCook'), description: t('employees.noodleCookDesc'), type: "food" },
	{ title: t('employees.noodleChef'), description: t('employees.noodleChefDesc'), type: "food" },
	{ title: t('employees.sushiCook'), description: t('employees.sushiCookDesc'), type: "food" },
	{ title: t('employees.sushiChef'), description: t('employees.sushiChefDesc'), type: "food" },
	{ title: t('employees.baristaTrainee'), description: t('employees.baristaTraineeDesc'), type: "coffee" },
	{ title: t('employees.barista'), description: t('employees.baristaDesc'), type: "coffee" },
	{ title: t('employees.leadBarista'), description: t('employees.leadBaristaDesc'), type: "coffee" },
	{ title: t('employees.bMovieStar'), description: t('employees.bMovieStarDesc'), type: "waitress" },
	{ title: t('employees.cMovieStar'), description: t('employees.cMovieStarDesc'), type: "waitress" },
	{ title: t('employees.dMovieStar'), description: t('employees.dMovieStarDesc'), type: "waitress" },
	{ title: t('employees.gourmetFoodCritic'), description: t('employees.gourmetFoodCriticDesc'), type: "marketer" },
	{ title: t('employees.lobbyist'), description: t('employees.lobbyistDesc'), type: "waitress" },
	{ title: t('employees.massMarketeer'), description: t('employees.massMarketeerDesc'), type: "marketer" },
	{ title: t('employees.nightShiftManager'), description: t('employees.nightShiftManagerDesc'), type: "manager" },
	{ title: t('employees.ruralMarketeer'), description: t('employees.ruralMarketeerDesc'), type: "marketer" },

	// Chinese expansion
	{ title: t('employees.dumplingCook'), description: t('employees.dumplingCookDesc'), type: "food" },
	{ title: t('employees.dumplingChef'), description: t('employees.dumplingChefDesc'), type: "food" },
	{ title: t('employees.hawkerMarketeer'), description: t('employees.hawkerMarketeerDesc'), type: "marketer" },
	{ title: t('employees.deliveryDriver'), description: t('employees.deliveryDriverDesc'), type: "delivery" },
	{ title: t('employees.jazzMusician'), description: t('employees.jazzMusicianDesc'), type: "waitress" },
]

export function employeeName(emp) {
	return EMPLOYEES_STR[emp] ? EMPLOYEES_STR[emp].title : String(emp)
}

/*
rf.CEO_BONUS_SELL_PRICE = 54
rf.CEO_BONUS_HIRE_OR_WAGE = 55
rf.CEO_BONUS_2_FREE_COACH = 56
*/
