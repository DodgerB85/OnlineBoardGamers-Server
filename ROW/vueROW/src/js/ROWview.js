/**
 * View helpers for ROW: image/asset resolution and display labels.
 *
 * All ROW/ROW2 art and sounds live under ROW/static/ROW/images. Vite cannot
 * statically rewrite a dynamic `new URL(...)`, so we use the site's absolute
 * static prefix (as the other games do). It resolves against the page origin,
 * working with Django serving static in both dev and prod.
 */
const STATIC_BASE = "/static/ROW/"

function asset(path) {
	return STATIC_BASE + path
}

export function getImage(image) {
	if (image === "icon-house") return asset("images/icon-house.svg")
	if (image === "icon-nextGame") return asset("images/icon-nextGame.svg")
	if (image === "icon-rulebook") return asset("images/icon-rulebook.svg")
	if (image === "icon-info") return asset("images/icon-info.svg")
	if (image === "icon-rewind") return asset("images/icon-rewind.svg")
	if (image === "icon-chat") return asset("images/icon-chat.svg")
	if (image === "icon-stop") return asset("images/icon-stop.svg")
	if (image === "icon-notebook") return asset("images/icon-notebook.svg")
	if (image === "icon-scroll") return asset("images/icon-scroll.svg")
	if (image === "icon-replay") return asset("images/icon-replay.svg")
	if (image === "resign") return asset("images/resign.jpg")
	return ""
}

export function editionImage(edition, name) {
	return asset(`images/row${edition === "SECOND" ? "2" : ""}/${name}`)
}

export function boardImage(edition) {
	return editionImage(edition, "board.jpg")
}

export function buildingImage(edition, building, color) {
	return editionImage(edition, `buildings/${building}_${color.toLowerCase()}.jpg`)
}

/** Card backs. (Static template attributes are compiled into module imports by Vite.) */
export function cardBackImage() {
	return asset("images/row/cards/back.jpg")
}

export function cardBackGreyImage() {
	return asset("images/row/cards/back_grey.jpg")
}

export function workerImage(worker) {
	return asset(`images/row/${worker.toLowerCase()}.jpg`)
}

export function teepeeImage(teepee) {
	return asset(`images/row/teepee_${teepee.toLowerCase()}.jpg`)
}

export function hazardImage(type, hand) {
	return asset(`images/row/${type.toLowerCase()}_${hand.toLowerCase()}.jpg`)
}

export function jobMarketTokenImage() {
	return asset("images/row/job_market_token.jpg")
}

const STATION_MASTER_IMAGES = {
	GAIN_2_DOLLARS_POINT_FOR_EACH_WORKER: "point_per_worker.jpg",
	REMOVE_HAZARD_OR_TEEPEE_POINTS_FOR_EACH_2_OBJECTIVE_CARDS: "points_per_2_objective_cards.jpg",
	PERM_CERT_POINTS_FOR_EACH_2_HAZARDS: "points_per_pair_hazards.jpg",
	PERM_CERT_POINTS_FOR_TEEPEE_PAIRS: "points_per_pair_teepees.jpg",
	PERM_CERT_POINTS_FOR_EACH_2_CERTS: "points_per_2_certs.jpg",
	TWO_PERM_CERTS: "sm/2_perm_certs.jpg",
	TWELVE_DOLLARS: "sm/12_dollars.jpg",
	PERM_CERT_POINTS_PER_2_STATIONS: "sm/points_per_2_stations.jpg",
	GAIN_2_CERTS_POINTS_PER_BUILDING: "sm/2_certs.jpg",
	PLACE_BRANCHLET_POINTS_PER_2_EXCHANGE_TOKENS: "sm/place_branchlet.jpg",
	GAIN_EXCHANGE_TOKEN_POINTS_PER_AREA: "sm/points_per_area.jpg",
	GAIN_5_DOLLARS_OR_TAKE_CATTLE_CARD: "mt/gain5_take3card.jpg",
	HIRE_WORKER_PLUS_2: "mt/hire_worker_plus2.jpg",
	REMOVE_2_CARDS: "mt/remove_2_cards.jpg",
	MOVE_ENGINE_3_FORWARD: "mt/move_engine_3.jpg",
	PLACE_BUILDING_FOR_FREE: "mt/place_building_free.jpg",
}

export function stationMasterImage(master) {
	const file = STATION_MASTER_IMAGES[master]
	return file ? asset(`images/row/${file}`) : ""
}

/**
 * Human-readable labels for each action type, ported from the reference
 * Angular `gwt`/`gwt2` locale (`actions.buttons` / `actions.descriptions`).
 * Unknown action types fall back to a prettified enum name.
 */
const ACTION_LABELS = {
	MOVE: "Move your cattleman",
	PLACE_BID: "Bid VP for turn order",
	BUY_CATTLE: "Buy one or more cattle cards",
	DELIVER_TO_CITY: "Deliver to a city",
	EXTRAORDINARY_DELIVERY: "Extraordinary delivery",
	DISCARD_CARD: "Discard a card",
	REMOVE_CARD: "Remove a card",
	DRAW_CARD: "Draw 1 and discard 1",
	DRAW_2_CARDS: "Draw 2 and discard 2",
	DRAW_3_CARDS: "Draw 3 and discard 3",
	DRAW_4_CARDS: "Draw 4 and discard 4",
	DRAW_5_CARDS: "Draw 5 and discard 5",
	DRAW_6_CARDS: "Draw 6 and discard 6",
	DRAW_2_CATTLE_CARDS: "Draw 2 cattle cards and add them to the cattle market",
	GAIN_1_DOLLAR: "Gain 1 dollar",
	GAIN_2_DOLLARS: "Gain 2 dollars",
	GAIN_3_DOLLARS: "Gain 3 dollars",
	GAIN_4_DOLLARS: "Gain 4 dollars",
	GAIN_5_DOLLARS: "Gain 5 dollars",
	GAIN_12_DOLLARS: "Gain 12 dollars",
	GAIN_1_CERTIFICATE: "Gain 1 certificate",
	GAIN_2_CERTIFICATES: "Gain 2 certificates",
	GAIN_1_DOLLAR_PER_ENGINEER: "Gain $1 per engineer",
	GAIN_1_DOLLAR_PER_CRAFTSMAN: "Gain $1 per craftsman",
	GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS: "Gain 2 dollars per building in the woods",
	GAIN_2_DOLLARS_PER_STATION: "Gain 2 dollars per station",
	GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR: "Gain 2 certificates and 2 dollars per teepee pair",
	HIRE_WORKER: "Hire a worker",
	HIRE_WORKER_PLUS_2: "Hire a worker (-$2)",
	HIRE_WORKER_MINUS_1: "Hire a worker (+$1)",
	HIRE_WORKER_MINUS_2: "Hire a worker (+$2)",
	MOVE_1_FORWARD: "Move your cattleman 1 step forward",
	MOVE_2_FORWARD: "Move your cattleman at most 2 steps forward",
	MOVE_3_FORWARD: "Move your cattleman at most 3 steps forward",
	MOVE_3_FORWARD_WITHOUT_FEES: "Move your cattleman at most 3 steps forward without paying fees",
	MOVE_4_FORWARD: "Move your cattleman at most 4 steps forward",
	MOVE_5_FORWARD: "Move your cattleman at most 5 steps forward",
	MOVE_ENGINE_FORWARD: "Move your engine forward",
	MOVE_ENGINE_1_FORWARD: "Move your engine 1 forward",
	MOVE_ENGINE_2_FORWARD: "Move engine 2 forward",
	MOVE_ENGINE_AT_MOST_2_FORWARD: "Move your engine at most 2 forward",
	MOVE_ENGINE_AT_MOST_3_FORWARD: "Move your engine at most 3 forward",
	MOVE_ENGINE_AT_MOST_4_FORWARD: "Move your engine at most 4 forward",
	MOVE_ENGINE_2_OR_3_FORWARD: "Move your engine 2 or 3 forward",
	MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS: "Move your engine 1 backwards to gain 3 dollars",
	MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS: "Move your engine at least 1 backwards and gain 3 dollars",
	MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD: "Move your engine 1 backwards to remove 1 card",
	MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR: "Move engine 1 backwards to remove 1 card and gain 1 dollar",
	MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS: "Move your engine 2 backwards to remove 2 cards",
	MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS: "Move engine 2 backwards to remove 2 cards and gain 2 dollars",
	MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS: "Move engine up to number of buildings in woods",
	MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS: "Move engine up to number of hazards",
	PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD: "Pay 1 dollar to move your engine 1 forward",
	PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD: "Pay 2 dollars to move your engine 2 forward",
	PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE: "Pay 1 dollar and move your engine 1 backwards to gain 1 certificate",
	PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES: "Pay 2 dollars and move your engine 2 backwards to gain 2 certificates",
	PLACE_BUILDING: "Place a building on the trail",
	PLACE_CHEAP_BUILDING: "Place a building on the trail (+$1)",
	PLACE_BUILDING_FOR_FREE: "Place a building on the trail ($0)",
	REMOVE_HAZARD: "Remove a hazard from the trail",
	REMOVE_HAZARD_FOR_2_DOLLARS: "Remove a hazard for 2 dollars",
	REMOVE_HAZARD_FOR_5_DOLLARS: "Remove a hazard for 5 dollars",
	REMOVE_HAZARD_FOR_FREE: "Remove a hazard for free",
	TRADE_WITH_TRIBES: "Trade with the Tribes",
	SINGLE_AUXILIARY_ACTION: "Perform a single auxiliary action",
	SINGLE_OR_DOUBLE_AUXILIARY_ACTION: "Perform a single or double auxiliary action",
	TAKE_OBJECTIVE_CARD: "Take an objective card",
	PLAY_OBJECTIVE_CARD: "Play an objective card",
	UPGRADE_STATION: "Upgrade station",
	UPGRADE_ANY_STATION_BEHIND_ENGINE: "Upgrade any station that is behind your engine",
	DOWNGRADE_STATION: "Remove a disc from one of your stations",
	APPOINT_STATION_MASTER: "Appoint a station master",
	USE_ADJACENT_BUILDING: "Use the actions of an adjacent building",
	CHOOSE_FORESIGHT_1: "Choose foresight 1",
	CHOOSE_FORESIGHT_2: "Choose foresight 2",
	CHOOSE_FORESIGHT_3: "Choose foresight 3",
	UNLOCK_WHITE: "Remove a disc with white corners from your player board",
	UNLOCK_BLACK_OR_WHITE: "Remove a disc from your player board",
	MAX_CERTIFICATES: "Gain maximum certificates",
	DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS: "Discard 1 Jersey to gain 2 dollars",
	DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS: "Discard 1 Jersey to gain 4 dollars",
	DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE: "Discard 1 Jersey to gain 1 certificate",
	DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES: "Discard 1 Jersey to gain 2 certificates",
	DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS: "Discard 1 Jersey to gain 1 certificate and 2 dollars",
	DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS: "Discard 1 Dutch Belt to gain 2 dollars",
	DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS: "Discard 1 Dutch Belt to gain 3 dollars",
	DISCARD_1_GUERNSEY: "Discard 1 Guernsey to gain 2 dollars",
	DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS: "Discard 1 Guernsey to gain 4 dollars",
	DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS: "Discard 1 Black Angus to gain 2 dollars",
	DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES: "Discard 1 Black Angus to gain 2 certificates",
	DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS: "Discard 1 Holstein to gain 10 dollars",
	DISCARD_PAIR_TO_GAIN_3_DOLLARS: "Discard a pair of cattle cards to gain 3 dollars",
	DISCARD_PAIR_TO_GAIN_4_DOLLARS: "Discard a pair of cattle cards to gain 4 dollars",
	DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES: "Discard 1 objective card to gain 2 certificates",
	DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE: "Discard 1 cattle card to gain 1 certificate",
	DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND: "Discard 1 cattle card to gain 3 dollars and add 1 objective card to your hand",
	DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND: "Discard 1 cattle card to gain 6 dollars and add 1 objective card to your hand",
	ADD_1_OBJECTIVE_CARD_TO_HAND: "Add 1 objective card to your hand",
	TAKE_BREEDING_VALUE_3_CATTLE_CARD: "Take a '3' cattle card from the market",
	DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD: "Discard 1 Dutch Belt to move engine 2 forward",
	DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD: "Discard 1 Jersey to move your engine 1 forward",
	DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION: "Discard 1 Jersey for a single auxiliary action",
	DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS: "Discard 1 cattle card to gain 7 dollars",
	GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL: "Gain 1 certificate and $1 per bell",
	UPGRADE_SIMMENTAL: "Upgrade Simmental card",
	GAIN_EXCHANGE_TOKEN: "Gain 1 exchange token",
	USE_EXCHANGE_TOKEN: "Use 1 exchange token",
	PLACE_BRANCHLET: "Place branchlet",
	DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET: "Discard a '2' cattle card to place branchlet",
	UPGRADE_STATION_TOWN: "Upgrade station",
	TAKE_BONUS_STATION_MASTER: "Take bonus station master tile",
}

/** Human-readable label for an action type (falls back to a prettified enum). */
export function humanizeAction(a) {
	return (
		ACTION_LABELS[a] ??
		String(a)
			.replace(/_/g, " ")
			.toLowerCase()
			.replace(/^\w/, (c) => c.toUpperCase())
	)
}
