import i18n from "../i18n"
const t = i18n.global.t // Shortcut

import * as rf from "./FCMreference"
import * as map from "./FCMmap"
import * as model from "./FCMmodel"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"

// Returns the correct image key for a reserve card, accounting for reservePrice option
export function getReserveCardImageKey(cardValue) {
	const store = useModelStore()
	if (store.startingOptions.reservePrice) {
		if (cardValue === -1) return "res_card_0"
		if (cardValue === 1) return "res_card_5"
		if (cardValue === 2) return "res_card_10"
		if (cardValue === 3) return "res_card_20"
		return "res_card_0"
	}
	return cardValue === -1 ? "res_card_0" : `res_card_${cardValue}`
}

export function getFlexiKickoutTImerText() {
	const personal = usePersonalStore()
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

export function kickoutTimerTicker() {
	const personal = usePersonalStore()
	if (personal.trainingGame) {
		clearInterval(personal.kickoutCountdownIntervalTimer)
		return
	}
	if (personal.secondsToNextKickout > 1200) {
		clearInterval(personal.kickoutCountdownIntervalTimer)
	} else {
		personal.secondsToNextKickout--
		let el = document.getElementById("kickoutTimerTimer")
		if (el) {
			if (personal.secondsToNextKickout < 60) {
				if (el.classList.contains("redText")) el.classList.remove("redText")
				else el.classList.add("redText")
			} else {
				el.classList.remove("redText")
			}
		}
		if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
	}
}

export function kickoutFlexiTimerTicker() {
	const personal = usePersonalStore()
	if (personal.kickoutRequired !== 1 || personal.secondsToNextKickout > 1200 || personal.canPlay()) {
		clearInterval(personal.flexiKickoutCountdownIntervalTimer)
		return
	}
	personal.flexiSecondsToNextKickout--
	let el = document.getElementById("flexiKickoutTimerSpan")
	if (el) {
		if (personal.flexiSecondsToNextKickout < 60) {
			if (el.classList.contains("redText")) el.classList.remove("redText")
			else el.classList.add("redText")
		} else {
			el.classList.remove("redText")
		}
	}
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
}

export function phaseStr(phase) {
	if (phase === rf.PHASE_SETUP_RESTAURANT1)
		return t("phases.setupRestaurants") //0
	else if (phase === rf.PHASE_SETUP_RESTAURANT2) return " " + t("phases.setupRestaurantsRound2")
	else if (phase === rf.PHASE_SETUP_RESERVE) return " " + t("phases.setupReserveCards")
	else if (phase === rf.PHASE_RESTRUCTURING) return " " + t("phases.restructuring")
	else if (phase === rf.PHASE_TURN_ORDER) return " " + t("phases.orderOfBusiness")
	else if (phase === rf.PHASE_WORKING_DAY)
		return " " + t("phases.workingHours") //5
	else if (phase === rf.PHASE_DINNERTIME) return " " + t("phases.dinnertime")
	else if (phase === rf.PHASE_PAYDAY) return " " + t("phases.payday")
	else if (phase === rf.PHASE_MARKETING_CAMPAIGNS) return " " + t("phases.marketingCampaigns")
	else if (phase === rf.PHASE_CLEAN_UP) return " " + t("phases.cleanUp")
	else if (phase === rf.PHASE_GAME_OVER)
		return " " + t("phases.gameEnd") //10
	else if (phase === rf.PHASE_PIZZA_BOMB) return " " + t("phases.pizzaMilestone")
	else if (phase === rf.PHASE_COFFE_SHOP_MS)
		return " " + t("phases.coffeeSellingMilestone") //12
	else if (phase === rf.PHASE_SETUP_MODULES)
		return " " + t("phases.setupDraftModules") //13
	else if (phase === rf.PHASE_URBAN_PLANNING)
		return " " + t("phases.setupUrbanPlanning") //14
	else if (phase === rf.PHASE_CHOOSE_CEO_BONUS) return " " + t("phases.chooseCEOBonus") //15
}

export function getImage(image) {
	// Icons
	if (image === "icon-house") return new URL(`../../../static/FCM/images/house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/FCM/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/FCM/images/icon-rulebook.svg`, import.meta.url).href
	//else if (image === "icon-info") return new URL(`../../../static/FCM/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/FCM/images/rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/FCM/images/talk.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/FCM/images/stop-sign.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/FCM/images/notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/FCM/images/scroll-unfurled.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/FCM/images/replay.svg`, import.meta.url).href
	//else if (image === "icon-hand-card") return new URL(`../../../static/FCM/images/icon-hand-card.svg`, import.meta.url).href
	//else if (image === "icon-cog") return new URL(`../../../static/FCM/images/icon-cog.svg`, import.meta.url).href
	//else if (image === "icon-help") return new URL(`../../../static/FCM/images/icon-help.svg`, import.meta.url).href
	else if (image === "icon-box") return new URL(`../../../static/FCM/images/cardboard-box.svg`, import.meta.url).href
	// Other imports
	else if (image === "loading-bar-black") return new URL(`../../../static/FCM/images/loading-bar-black.gif`, import.meta.url).href
	else if (image === "rot_anticlockwise") return new URL(`../../../static/FCM/images/rot_anticlockwise.svg`, import.meta.url).href
	else if (image === "rot_clockwise") return new URL(`../../../static/FCM/images/rot_clockwise.svg`, import.meta.url).href
	else if (image === "flip_h") return new URL(`../../../static/FCM/images/flip_h.svg`, import.meta.url).href
	// Map tiles (for lobbyist milestone tile selector)
	else if (image.startsWith("map") && /^\d{2}$/.test(image.slice(3))) {
		const tileNum = parseInt(image.slice(3))
		return new URL(`../../../static/FCM/images/map${String(tileNum).padStart(2, "0")}.jpg`, import.meta.url).href
	} else if (image === "FCMbox") return new URL(`../../../static/FCM/images/fcm-box.jpg`, import.meta.url).href
	else if (image === "FCMbox2") return new URL(`../../../static/FCM/images/fcm-box2.jpg`, import.meta.url).href
	else if (image === "email") return new URL(`../../../static/FCM/images/email.png`, import.meta.url).href
	else if (image === "fired") return new URL(`../../../static/FCM/images/fired.jpg`, import.meta.url).href
	// resto icons
	else if (image === `player_resto_icon_${rf.FRIED_GEESE_DONKEY}`) return new URL(`../../../static/FCM/images/p_fried_geese.jpg`, import.meta.url).href
	else if (image === `player_resto_icon_${rf.GLUTTONY_INC}`) return new URL(`../../../static/FCM/images/p_gluttony_inc.jpg`, import.meta.url).href
	else if (image === `player_resto_icon_${rf.DUCK_DINER}`) return new URL(`../../../static/FCM/images/p_duck_diner.jpg`, import.meta.url).href
	else if (image === `player_resto_icon_${rf.SANTA_MARIA_PIZZA}`) return new URL(`../../../static/FCM/images/p_santa_maria.jpg`, import.meta.url).href
	else if (image === `player_resto_icon_${rf.XANGO_BLUES}`) return new URL(`../../../static/FCM/images/p_xango_blues.jpg`, import.meta.url).href
	else if (image === `player_resto_icon_${rf.SIAP_FAJI}`) return new URL(`../../../static/FCM/images/p_siap_faji.jpg`, import.meta.url).href
	// Resto opsn
	else if (image === `player_resto_open_${rf.FRIED_GEESE_DONKEY}`) return new URL(`../../../static/FCM/images/r_fried_geese_open.jpg`, import.meta.url).href
	else if (image === `player_resto_open_${rf.GLUTTONY_INC}`) return new URL(`../../../static/FCM/images/r_gluttony_inc_open.jpg`, import.meta.url).href
	else if (image === `player_resto_open_${rf.DUCK_DINER}`) return new URL(`../../../static/FCM/images/r_duck_diner_open.jpg`, import.meta.url).href
	else if (image === `player_resto_open_${rf.SANTA_MARIA_PIZZA}`) return new URL(`../../../static/FCM/images/r_santa_maria_open.jpg`, import.meta.url).href
	else if (image === `player_resto_open_${rf.XANGO_BLUES}`) return new URL(`../../../static/FCM/images/r_xango_blues_open.jpg`, import.meta.url).href
	else if (image === `player_resto_open_${rf.SIAP_FAJI}`) return new URL(`../../../static/FCM/images/r_siap_faji_open.jpg`, import.meta.url).href
	// Resto coming soon
	else if (image === `player_resto_soon_${rf.FRIED_GEESE_DONKEY}`) return new URL(`../../../static/FCM/images/r_fried_geese_soon.jpg`, import.meta.url).href
	else if (image === `player_resto_soon_${rf.GLUTTONY_INC}`) return new URL(`../../../static/FCM/images/r_gluttony_inc_soon.jpg`, import.meta.url).href
	else if (image === `player_resto_soon_${rf.DUCK_DINER}`) return new URL(`../../../static/FCM/images/r_duck_diner_soon.jpg`, import.meta.url).href
	else if (image === `player_resto_soon_${rf.SANTA_MARIA_PIZZA}`) return new URL(`../../../static/FCM/images/r_santa_maria_soon.jpg`, import.meta.url).href
	else if (image === `player_resto_soon_${rf.XANGO_BLUES}`) return new URL(`../../../static/FCM/images/r_xango_blues_soon.jpg`, import.meta.url).href
	else if (image === `player_resto_soon_${rf.SIAP_FAJI}`) return new URL(`../../../static/FCM/images/r_siap_faji_soon.jpg`, import.meta.url).href
	// Player colour images
	else if (image === `player_${rf.FRIED_GEESE_DONKEY}`) return new URL(`../../../static/FCM/images/p_fried_geese.jpg`, import.meta.url).href
	else if (image === `player_${rf.GLUTTONY_INC}`) return new URL(`../../../static/FCM/images/p_gluttony_inc.jpg`, import.meta.url).href
	else if (image === `player_${rf.DUCK_DINER}`) return new URL(`../../../static/FCM/images/p_duck_dinner.jpg`, import.meta.url).href
	else if (image === `player_${rf.SANTA_MARIA_PIZZA}`) return new URL(`../../../static/FCM/images/p_santa_maria.jpg`, import.meta.url).href
	else if (image === `player_${rf.XANGO_BLUES}`) return new URL(`../../../static/FCM/images/p_xango_blues.jpg`, import.meta.url).href
	else if (image === `player_${rf.SIAP_FAJI}`) return new URL(`../../../static/FCM/images/p_siap_faji.jpg`, import.meta.url).href
	// Coffee shop images
	else if (image === `coffeeShop_${rf.FRIED_GEESE_DONKEY}`) return new URL(`../../../static/FCM/images/c_fried_geese.jpg`, import.meta.url).href
	else if (image === `coffeeShop_${rf.GLUTTONY_INC}`) return new URL(`../../../static/FCM/images/c_gluttony_inc.jpg`, import.meta.url).href
	else if (image === `coffeeShop_${rf.DUCK_DINER}`) return new URL(`../../../static/FCM/images/c_golden_duck_diner.jpg`, import.meta.url).href
	else if (image === `coffeeShop_${rf.SANTA_MARIA_PIZZA}`) return new URL(`../../../static/FCM/images/c_santa_maria.jpg`, import.meta.url).href
	else if (image === `coffeeShop_${rf.XANGO_BLUES}`) return new URL(`../../../static/FCM/images/c_xango_blues.jpg`, import.meta.url).href
	else if (image === `coffeeShop_${rf.SIAP_FAJI}`) return new URL(`../../../static/FCM/images/c_siap_faji.jpg`, import.meta.url).href
	// Apartment images
	else if (image === "apartment") return new URL(`../../../static/FCM/images/apartment.jpg`, import.meta.url).href
	else if (image === "apartment_PI") return new URL(`../../../static/FCM/images/PI.jpg`, import.meta.url).href
	else if (image === "apartment_975") return new URL(`../../../static/FCM/images/975.jpg`, import.meta.url).href
	// map tiles
	else if (image === "map1") return new URL(`../../../static/FCM/images/map01.jpg`, import.meta.url).href
	else if (image === "map2") return new URL(`../../../static/FCM/images/map02.jpg`, import.meta.url).href
	else if (image === "map3") return new URL(`../../../static/FCM/images/map03.jpg`, import.meta.url).href
	else if (image === "map4") return new URL(`../../../static/FCM/images/map04.jpg`, import.meta.url).href
	else if (image === "map5") return new URL(`../../../static/FCM/images/map05.jpg`, import.meta.url).href
	else if (image === "map6") return new URL(`../../../static/FCM/images/map06.jpg`, import.meta.url).href
	else if (image === "map7") return new URL(`../../../static/FCM/images/map07.jpg`, import.meta.url).href
	else if (image === "map8") return new URL(`../../../static/FCM/images/map08.jpg`, import.meta.url).href
	else if (image === "map9") return new URL(`../../../static/FCM/images/map09.jpg`, import.meta.url).href
	else if (image === "map10") return new URL(`../../../static/FCM/images/map10.jpg`, import.meta.url).href
	else if (image === "map11") return new URL(`../../../static/FCM/images/map11.jpg`, import.meta.url).href
	else if (image === "map12") return new URL(`../../../static/FCM/images/map12.jpg`, import.meta.url).href
	else if (image === "map13") return new URL(`../../../static/FCM/images/map13.jpg`, import.meta.url).href
	else if (image === "map14") return new URL(`../../../static/FCM/images/map14.jpg`, import.meta.url).href
	else if (image === "map15") return new URL(`../../../static/FCM/images/map15.jpg`, import.meta.url).href
	else if (image === "map16") return new URL(`../../../static/FCM/images/map16.jpg`, import.meta.url).href
	else if (image === "map17") return new URL(`../../../static/FCM/images/map17.jpg`, import.meta.url).href
	else if (image === "map18") return new URL(`../../../static/FCM/images/map18.jpg`, import.meta.url).href
	else if (image === "map19") return new URL(`../../../static/FCM/images/map19.jpg`, import.meta.url).href
	else if (image === "map20") return new URL(`../../../static/FCM/images/map20.jpg`, import.meta.url).href
	else if (image === "map21") return new URL(`../../../static/FCM/images/map21.jpg`, import.meta.url).href
	else if (image === "map22") return new URL(`../../../static/FCM/images/map22.jpg`, import.meta.url).href
	else if (image === "map23") return new URL(`../../../static/FCM/images/map23.jpg`, import.meta.url).href
	else if (image === "map24") return new URL(`../../../static/FCM/images/map24.jpg`, import.meta.url).href
	else if (image === "map25") return new URL(`../../../static/FCM/images/map25.jpg`, import.meta.url).href
	else if (image === "map26") return new URL(`../../../static/FCM/images/map26.jpg`, import.meta.url).href
	// Reserve cards
	else if (image === `res_card_${rf.RES_CARD_OG_2_SLOTS}`) return new URL(`../../../static/FCM/images/reserve100.jpg`, import.meta.url).href
	else if (image === `res_card_${rf.RES_CARD_OG_3_SLOTS}`) return new URL(`../../../static/FCM/images/reserve200.jpg`, import.meta.url).href
	else if (image === `res_card_${rf.RES_CARD_OG_4_SLOTS}`) return new URL(`../../../static/FCM/images/reserve300.jpg`, import.meta.url).href
	else if (image === "res_card_0") return new URL(`../../../static/FCM/images/reserve0.jpg`, import.meta.url).href
	else if (image === "res_card_5") return new URL(`../../../static/FCM/images/reserve5.jpg`, import.meta.url).href
	else if (image === "res_card_10") return new URL(`../../../static/FCM/images/reserve10.jpg`, import.meta.url).href
	else if (image === "res_card_20") return new URL(`../../../static/FCM/images/reserve20.jpg`, import.meta.url).href
	// CEO cards
	else if (image === `ceo_card_OG_2`) return new URL(`../../../static/FCM/images/ceo_2.jpg`, import.meta.url).href
	else if (image === `ceo_card_OG_3`) return new URL(`../../../static/FCM/images/ceo.jpg`, import.meta.url).href
	else if (image === `ceo_card_OG_4`) return new URL(`../../../static/FCM/images/ceo_4.jpg`, import.meta.url).href
	// CEO action images
	else if (image === `ceo_action_1`) return new URL(`../../../static/FCM/images/ceo_action_1.jpg`, import.meta.url).href
	else if (image === `ceo_action_2`) return new URL(`../../../static/FCM/images/ceo_action_2.jpg`, import.meta.url).href
	else if (image === `ceo_action_3`) return new URL(`../../../static/FCM/images/ceo_action_3.jpg`, import.meta.url).href
	// emp cards
	else if (image === `emp_${rf.WAITRESS}`) return new URL(`../../../static/FCM/images/e_waitress.jpg`, import.meta.url).href
	else if (image === `emp_${rf.NEW_BUSINESS_DEVELOPER}`) return new URL(`../../../static/FCM/images/e_new_business_developer.jpg`, import.meta.url).href
	else if (image === `emp_${rf.LOCAL_MANAGER}`) return new URL(`../../../static/FCM/images/e_local_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.REGIONAL_MANAGER}`) return new URL(`../../../static/FCM/images/e_regional_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.CFO}`) return new URL(`../../../static/FCM/images/e_cfo.jpg`, import.meta.url).href
	else if (image === `emp_${rf.MANAGEMENT_TRAINEE}`) return new URL(`../../../static/FCM/images/e_management_trainee.jpg`, import.meta.url).href
	else if (image === `emp_${rf.JUNIOR_VICE_PRESIDENT}`) return new URL(`../../../static/FCM/images/e_junior_vp.jpg`, import.meta.url).href
	else if (image === `emp_${rf.VICE_PRESIDENT}`) return new URL(`../../../static/FCM/images/e_vice_president.jpg`, import.meta.url).href
	else if (image === `emp_${rf.SENIOR_VICE_PRESIDENT}`) return new URL(`../../../static/FCM/images/e_senior_vp.jpg`, import.meta.url).href
	else if (image === `emp_${rf.EXECUTIVE_VICE_PRESIDENT}`) return new URL(`../../../static/FCM/images/e_executive_vp.jpg`, import.meta.url).href
	else if (image === `emp_${rf.PRICING_MANAGER}`) return new URL(`../../../static/FCM/images/e_pricing_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.LUXURIES_MANAGER}`) return new URL(`../../../static/FCM/images/e_luxuries_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.DISCOUNT_MANAGER}`) return new URL(`../../../static/FCM/images/e_discount_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.RECRUITING_GIRL}`) return new URL(`../../../static/FCM/images/e_recruiting_girl.jpg`, import.meta.url).href
	else if (image === `emp_${rf.RECRUITING_MANAGER}`) return new URL(`../../../static/FCM/images/e_recruiting_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.HR_DIRECTOR}`) return new URL(`../../../static/FCM/images/e_hr_director.jpg`, import.meta.url).href
	else if (image === `emp_${rf.TRAINER}`) return new URL(`../../../static/FCM/images/e_trainer.jpg`, import.meta.url).href
	else if (image === `emp_${rf.COACH}`) return new URL(`../../../static/FCM/images/e_coach.jpg`, import.meta.url).href
	else if (image === `emp_${rf.GURU}`) return new URL(`../../../static/FCM/images/e_guru.jpg`, import.meta.url).href
	else if (image === `emp_${rf.ERRAND_BOY}`) return new URL(`../../../static/FCM/images/e_errand_boy.jpg`, import.meta.url).href
	else if (image === `emp_${rf.CART_OPERATOR}`) return new URL(`../../../static/FCM/images/e_cart_operator.jpg`, import.meta.url).href
	else if (image === `emp_${rf.TRUCK_DRIVER}`) return new URL(`../../../static/FCM/images/e_truck_driver.jpg`, import.meta.url).href
	else if (image === `emp_${rf.ZEPPELIN_PILOT}`) return new URL(`../../../static/FCM/images/e_zeppelin_pilot.jpg`, import.meta.url).href
	else if (image === `emp_${rf.MARKETING_TRAINEE}`) return new URL(`../../../static/FCM/images/e_marketing_trainee.jpg`, import.meta.url).href
	else if (image === `emp_${rf.CAMPAIGN_MANAGER}`) return new URL(`../../../static/FCM/images/e_campaign_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.BRAND_MANAGER}`) return new URL(`../../../static/FCM/images/e_brand_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.BRAND_DIRECTOR}`) return new URL(`../../../static/FCM/images/e_brand_director.jpg`, import.meta.url).href
	else if (image === `emp_${rf.KITCHEN_TRAINEE}`) return new URL(`../../../static/FCM/images/e_kitchen_trainee.jpg`, import.meta.url).href
	else if (image === `emp_${rf.BURGER_COOK}`) return new URL(`../../../static/FCM/images/e_burger_cook.jpg`, import.meta.url).href
	else if (image === `emp_${rf.BURGER_CHEF}`) return new URL(`../../../static/FCM/images/e_burger_chef.jpg`, import.meta.url).href
	else if (image === `emp_${rf.PIZZA_COOK}`) return new URL(`../../../static/FCM/images/e_pizza_cook.jpg`, import.meta.url).href
	else if (image === `emp_${rf.PIZZA_CHEF}`) return new URL(`../../../static/FCM/images/e_pizza_chef.jpg`, import.meta.url).href
	else if (image === `emp_${rf.FRY_CHEF}`) return new URL(`../../../static/FCM/images/e_fry_chef.jpg`, import.meta.url).href
	else if (image === `emp_${rf.KIMCHI_MASTER}`) return new URL(`../../../static/FCM/images/e_kimchi_master.jpg`, import.meta.url).href
	else if (image === `emp_${rf.NOODLE_COOK}`) return new URL(`../../../static/FCM/images/e_noodle_cook.jpg`, import.meta.url).href
	else if (image === `emp_${rf.NOODLE_CHEF}`) return new URL(`../../../static/FCM/images/e_noodle_chef.jpg`, import.meta.url).href
	else if (image === `emp_${rf.SUSHI_COOK}`) return new URL(`../../../static/FCM/images/e_sushi_cook.jpg`, import.meta.url).href
	else if (image === `emp_${rf.SUSHI_CHEF}`) return new URL(`../../../static/FCM/images/e_sushi_chef.jpg`, import.meta.url).href
	else if (image === `emp_${rf.BARISTA_TRAINEE}`) return new URL(`../../../static/FCM/images/e_barista_trainee.jpg`, import.meta.url).href
	else if (image === `emp_${rf.BARISTA}`) return new URL(`../../../static/FCM/images/e_barista.jpg`, import.meta.url).href
	else if (image === `emp_${rf.LEAD_BARISTA}`) return new URL(`../../../static/FCM/images/e_lead_barista.jpg`, import.meta.url).href
	else if (image === `emp_${rf.B_MOVIE_STAR}`) return new URL(`../../../static/FCM/images/e_b_movie_star.jpg`, import.meta.url).href
	else if (image === `emp_${rf.C_MOVIE_STAR}`) return new URL(`../../../static/FCM/images/e_c_movie_star.jpg`, import.meta.url).href
	else if (image === `emp_${rf.D_MOVIE_STAR}`) return new URL(`../../../static/FCM/images/e_d_movie_star.jpg`, import.meta.url).href
	else if (image === `emp_${rf.GOURMET_FOOD_CRITIC}`) return new URL(`../../../static/FCM/images/e_gourmet_food_critic.jpg`, import.meta.url).href
	else if (image === `emp_${rf.LOBBYIST}`) return new URL(`../../../static/FCM/images/e_lobbyist.jpg`, import.meta.url).href
	else if (image === `emp_${rf.MASS_MARKETEER}`) return new URL(`../../../static/FCM/images/e_mass_marketer.jpg`, import.meta.url).href
	else if (image === `emp_${rf.NIGHT_SHIFT_MANAGER}`) return new URL(`../../../static/FCM/images/e_night_shift_manager.jpg`, import.meta.url).href
	else if (image === `emp_${rf.RURAL_MARKETEER}`) return new URL(`../../../static/FCM/images/e_rural_marketer.jpg`, import.meta.url).href
	// Chinese Expansion
	else if (image === `emp_${rf.JAZZ_MUSICIAN}`) return new URL(`../../../static/FCM/images/e_jazz_musician.jpg`, import.meta.url).href
	else if (image === `emp_${rf.DUMPLING_COOK}`) return new URL(`../../../static/FCM/images/e_dumpling_cook.jpg`, import.meta.url).href
	else if (image === `emp_${rf.DUMPLING_CHEF}`) return new URL(`../../../static/FCM/images/e_dumpling_chef.jpg`, import.meta.url).href
	else if (image === `emp_${rf.DELIVERY_DRIVER}`) return new URL(`../../../static/FCM/images/e_delivery_driver.jpg`, import.meta.url).href
	else if (image === `emp_${rf.HAWKER_MARKETEER}`) return new URL(`../../../static/FCM/images/e_hawker_marketeer.jpg`, import.meta.url).href
	// MS icons - 29 icons
	else if (image === "m_icon01.png") return new URL(`../../../static/FCM/images/m_icon01.png`, import.meta.url).href
	else if (image === "m_icon02.png") return new URL(`../../../static/FCM/images/m_icon02.png`, import.meta.url).href
	else if (image === "m_icon03.png") return new URL(`../../../static/FCM/images/m_icon03.png`, import.meta.url).href
	else if (image === "m_icon04.png") return new URL(`../../../static/FCM/images/m_icon04.png`, import.meta.url).href
	else if (image === "m_icon05.png") return new URL(`../../../static/FCM/images/m_icon05.png`, import.meta.url).href
	else if (image === "m_icon06.png") return new URL(`../../../static/FCM/images/m_icon06.png`, import.meta.url).href
	else if (image === "m_icon07.png") return new URL(`../../../static/FCM/images/m_icon07.png`, import.meta.url).href
	else if (image === "m_icon08.png") return new URL(`../../../static/FCM/images/m_icon08.png`, import.meta.url).href
	else if (image === "m_icon09.png") return new URL(`../../../static/FCM/images/m_icon09.png`, import.meta.url).href
	else if (image === "m_icon10.png") return new URL(`../../../static/FCM/images/m_icon10.png`, import.meta.url).href
	else if (image === "m_icon11.png") return new URL(`../../../static/FCM/images/m_icon11.png`, import.meta.url).href
	else if (image === "m_icon12.png") return new URL(`../../../static/FCM/images/m_icon12.png`, import.meta.url).href
	else if (image === "m_icon13.png") return new URL(`../../../static/FCM/images/m_icon13.png`, import.meta.url).href
	else if (image === "m_icon14.png") return new URL(`../../../static/FCM/images/m_icon14.png`, import.meta.url).href
	else if (image === "m_icon15.png") return new URL(`../../../static/FCM/images/m_icon15.png`, import.meta.url).href
	else if (image === "m_icon16.png") return new URL(`../../../static/FCM/images/m_icon16.png`, import.meta.url).href
	else if (image === "m_icon17.png") return new URL(`../../../static/FCM/images/m_icon17.png`, import.meta.url).href
	else if (image === "m_icon18.png") return new URL(`../../../static/FCM/images/m_icon18.png`, import.meta.url).href
	else if (image === "m_icon19.png") return new URL(`../../../static/FCM/images/m_icon19.png`, import.meta.url).href
	else if (image === "m_icon20.png") return new URL(`../../../static/FCM/images/m_icon20.png`, import.meta.url).href
	else if (image === "m_icon21.png") return new URL(`../../../static/FCM/images/m_icon21.png`, import.meta.url).href
	else if (image === "m_icon22.png") return new URL(`../../../static/FCM/images/m_icon22.png`, import.meta.url).href
	else if (image === "m_icon23.png") return new URL(`../../../static/FCM/images/m_icon23.png`, import.meta.url).href
	else if (image === "m_icon24.png") return new URL(`../../../static/FCM/images/m_icon24.png`, import.meta.url).href
	else if (image === "m_icon25.png") return new URL(`../../../static/FCM/images/m_icon25.png`, import.meta.url).href
	else if (image === "m_icon26.png") return new URL(`../../../static/FCM/images/m_icon26.png`, import.meta.url).href
	else if (image === "m_icon27.png") return new URL(`../../../static/FCM/images/m_icon27.png`, import.meta.url).href
	else if (image === "m_icon28.png") return new URL(`../../../static/FCM/images/m_icon28.png`, import.meta.url).href
	else if (image === "m_icon29.png") return new URL(`../../../static/FCM/images/m_icon29.png`, import.meta.url).href
	// EMPLOYEE ICOND
	else if (image === "icon1x") return new URL(`../../../static/FCM/images/icon1x.png`, import.meta.url).href
	else if (image === "iconRecruit") return new URL(`../../../static/FCM/images/icon-recruit.png`, import.meta.url).href
	else if (image === "iconRangeInfinite") return new URL(`../../../static/FCM/images/icon-rangeInfinite.png`, import.meta.url).href
	else if (image === "iconRange2") return new URL(`../../../static/FCM/images/icon-roadRange2.png`, import.meta.url).href
	else if (image === "iconRange3") return new URL(`../../../static/FCM/images/icon-roadRange3.png`, import.meta.url).href
	else if (image === "iconRange4") return new URL(`../../../static/FCM/images/icon-airRange4.png`, import.meta.url).href
	else if (image === "iconSalary") return new URL(`../../../static/FCM/images/icon-salary.png`, import.meta.url).href
	// ITEMS - FOOD/DRINK
	else if (image === `item_${rf.LEMONADE}`) return new URL(`../../../static/FCM/images/juice.png`, import.meta.url).href
	else if (image === `item_${rf.COKE}`) return new URL(`../../../static/FCM/images/coke.png`, import.meta.url).href
	else if (image === `item_${rf.BEER}`) return new URL(`../../../static/FCM/images/beer.png`, import.meta.url).href
	else if (image === `item_${rf.PIZZA}`) return new URL(`../../../static/FCM/images/pizza.png`, import.meta.url).href
	else if (image === `item_${rf.BURGER}`) return new URL(`../../../static/FCM/images/burger.png`, import.meta.url).href
	else if (image === `item_${rf.COFFEE}`) return new URL(`../../../static/FCM/images/coffee.png`, import.meta.url).href
	else if (image === `item_${rf.NOODLES}`) return new URL(`../../../static/FCM/images/noodles.png`, import.meta.url).href
	else if (image === `item_${rf.SUSHI}`) return new URL(`../../../static/FCM/images/sushi.png`, import.meta.url).href
	else if (image === `item_${rf.KIMCHI}`) return new URL(`../../../static/FCM/images/kimchi.png`, import.meta.url).href
	else if (image === `item_${rf.DUMPLING}`) return new URL(`../../../static/FCM/images/dumpling.png`, import.meta.url).href
	// HOUSES
	else if (image === "house_garden") return new URL(`../../../static/FCM/images/house_garden.jpg`, import.meta.url).href
	else if (image === "house_small") return new URL(`../../../static/FCM/images/house.jpg`, import.meta.url).href
	// MARKETING CAMPAIGNS
	else if (image === "campaign_1") return new URL(`../../../static/FCM/images/marketing1.jpg`, import.meta.url).href
	else if (image === "campaign_2") return new URL(`../../../static/FCM/images/marketing2.jpg`, import.meta.url).href
	else if (image === "campaign_3") return new URL(`../../../static/FCM/images/marketing3.jpg`, import.meta.url).href
	else if (image === "campaign_4") return new URL(`../../../static/FCM/images/marketing4.jpg`, import.meta.url).href
	else if (image === "campaign_4-icon") return new URL(`../../../static/FCM/images/marketing4-icon.jpg`, import.meta.url).href
	else if (image === "campaign_5") return new URL(`../../../static/FCM/images/marketing5.jpg`, import.meta.url).href
	else if (image === "campaign_6") return new URL(`../../../static/FCM/images/marketing6.jpg`, import.meta.url).href
	else if (image === "campaign_7") return new URL(`../../../static/FCM/images/marketing7.jpg`, import.meta.url).href
	else if (image === "campaign_8") return new URL(`../../../static/FCM/images/marketing8.jpg`, import.meta.url).href
	else if (image === "campaign_9") return new URL(`../../../static/FCM/images/marketing9.jpg`, import.meta.url).href
	else if (image === "campaign_10") return new URL(`../../../static/FCM/images/marketing10.jpg`, import.meta.url).href
	else if (image === "campaign_11") return new URL(`../../../static/FCM/images/marketing11.jpg`, import.meta.url).href
	else if (image === "campaign_12") return new URL(`../../../static/FCM/images/marketing12.jpg`, import.meta.url).href
	else if (image === "campaign_13") return new URL(`../../../static/FCM/images/marketing13.jpg`, import.meta.url).href
	else if (image === "campaign_14") return new URL(`../../../static/FCM/images/marketing14.jpg`, import.meta.url).href
	else if (image === "campaign_15") return new URL(`../../../static/FCM/images/marketing15.jpg`, import.meta.url).href
	else if (image === "campaign_16") return new URL(`../../../static/FCM/images/marketing16.jpg`, import.meta.url).href
	else if (image === "campaign_17") return new URL(`../../../static/FCM/images/marketing17.jpg`, import.meta.url).href
	else if (image === "campaign_18") return new URL(`../../../static/FCM/images/marketing18.jpg`, import.meta.url).href
	else if (image === "campaign_19") return new URL(`../../../static/FCM/images/marketing19.jpg`, import.meta.url).href
	else if (image === "campaign_20") return new URL(`../../../static/FCM/images/marketing20.jpg`, import.meta.url).href
	else if (image === "campaign_21") return new URL(`../../../static/FCM/images/marketing21.jpg`, import.meta.url).href
	else if (image === "campaign_22") return new URL(`../../../static/FCM/images/marketing21.jpg`, import.meta.url).href
	else if (image === "campaign_23") return new URL(`../../../static/FCM/images/marketing21.jpg`, import.meta.url).href
	else if (image === "campaign_24") return new URL(`../../../static/FCM/images/marketing21.jpg`, import.meta.url).href
	else if (image === "campaign_25") return new URL(`../../../static/FCM/images/marketing25_h.jpg`, import.meta.url).href
	else if (image === "campaign_26") return new URL(`../../../static/FCM/images/marketing26_h.jpg`, import.meta.url).href
	else if (image === "campaign_27") return new URL(`../../../static/FCM/images/marketing27_h.jpg`, import.meta.url).href
	// Double good airplane campaigns
	else if (image === "campaign_4a") return new URL(`../../../static/FCM/images/marketing4-a.jpg`, import.meta.url).href
	else if (image === "campaign_5a") return new URL(`../../../static/FCM/images/marketing5-a.jpg`, import.meta.url).href
	else if (image === "campaign_6a") return new URL(`../../../static/FCM/images/marketing6-a.jpg`, import.meta.url).href
	// EOD summary campaign images
	else if (image.startsWith("marketing_campaign_")) return getImage("campaign_" + image.slice("marketing_campaign_".length))
	// Freeway
	else if (image === "freeway") return new URL(`../../../static/FCM/images/freeway.jpg`, import.meta.url).href
	// Rural Marketing Area background
	else if (image === "ruralArea") return new URL(`../../../static/FCM/images/ruralArea.jpg`, import.meta.url).href
	// MODULES / STARTING OPTION ICONS
	else if (image === "so_hardchoices2") return new URL(`../../../static/FCM/images/hardchoices2.jpg`, import.meta.url).href
	else if (image === "hardChoice2_icon") return new URL(`../../../static/FCM/images/hardchoices2.jpg`, import.meta.url).href
	else if (image === "hardChoice3_icon") return new URL(`../../../static/FCM/images/hardchoices3.jpg`, import.meta.url).href
	else if (image === "so_ketchupMS") return new URL(`../../../static/FCM/images/so_ketchupMS.svg`, import.meta.url).href
	else if (image === "so_reservePrice") return new URL(`../../../static/FCM/images/so_reservePrice.jpg`, import.meta.url).href
	else if (image === "so_movieStars") return new URL(`../../../static/FCM/images/so_movieStars.svg`, import.meta.url).href
	else if (image === "so_massMarketeers") return new URL(`../../../static/FCM/images/so_massMarketeers.jpg`, import.meta.url).href
	else if (image === "so_GFC") return new URL(`../../../static/FCM/images/so_GFC.jpg`, import.meta.url).href
	else if (image === "so_rural") return new URL(`../../../static/FCM/images/so_rural.jpg`, import.meta.url).href
	else if (image === "so_lobbyists") return new URL(`../../../static/FCM/images/so_lobbyists.jpg`, import.meta.url).href
	else if (image === "so_nightShift") return new URL(`../../../static/FCM/images/so_nightShift.jpg`, import.meta.url).href
	else if (image === "so_coffee") return new URL(`../../../static/FCM/images/so_coffee.svg`, import.meta.url).href
	else if (image === "so_fryChef") return new URL(`../../../static/FCM/images/so_fryChef.svg`, import.meta.url).href
	else if (image === "so_kimchi") return new URL(`../../../static/FCM/images/so_kimchi.svg`, import.meta.url).href
	else if (image === "so_sushi") return new URL(`../../../static/FCM/images/so_sushi.svg`, import.meta.url).href
	else if (image === "so_noodles") return new URL(`../../../static/FCM/images/so_noodles.svg`, import.meta.url).href
	else if (image === "so_skip") return new URL(`../../../static/FCM/images/so_skip.jpg`, import.meta.url).href
	// HOUSES & GARDEN
	else if (image === "garden") return new URL(`../../../static/FCM/images/garden.jpg`, import.meta.url).href
	// ROADS (lobbyist - under construction while turnAdded is the current turn)
	else if (image === "roadUC") return new URL(`../../../static/FCM/images/roadUC.jpg`, import.meta.url).href
	else if (image.startsWith("road_")) {
		const parts = image.split("_")
		const variety = parseInt(parts[1])
		const suffix = parts[2] === "UC" ? "UC" : ""
		return new URL(`../../../static/FCM/images/road${variety}${suffix}.${variety === 2 ? "png" : "jpg"}`, import.meta.url).href
	}
	// PARKS (lobbyist)
	else if (image.startsWith("park_")) {
		const variety = parseInt(image.split("_")[1])
		return new URL(`../../../static/FCM/images/park${variety}.${variety === 0 ? "jpg" : "png"}`, import.meta.url).href
	} 
	// Resign
	else if (image === "resign") return new URL(`../../../static/FCM/images/m_icon24.png`, import.meta.url).href
	// 
	else alert("V-GI: " + image)
}

export function setMapDisplayTiles() {
	const store = useModelStore()
	let res = []

	let usedRows = map.getUsedRowCol()[0]
	let usedCols = map.getUsedRowCol()[1]

	// Emit the used grid densely (row-major over used rows/cols) so that
	// displayTiles indexes line up with the compact board coordinates used by
	// getTilePos. Empty cells are pushed as [-1, -1] placeholders, which the
	// board renderer skips.

	for (let rowCount = 0; rowCount < usedRows.length; rowCount++) {
		for (let colCount = 0; colCount < usedCols.length; colCount++) {
			const row = usedRows[rowCount]
			const col = usedCols[colCount]
			const tile = store.mapData.tiles[(row * store.mapData.dimensions[0] + col) * 2]
			const r = store.mapData.tiles[(row * store.mapData.dimensions[0] + col) * 2 + 1]

			res.push([tile, r])
		}
	}
	store.mapData.displayTiles = [...res]
}

export function getXYforSmallSquare(index, usedRowCol) {
	const store = useModelStore()
	const isTile = false

	let w = store.refSize / 5
	let trueW = store.refSize / 5
	if (isTile === true) {
		w = store.refSize
	}
	let coords = map.giveCoord(index, isTile)
	let xOffset = model.isItemOnLeftOfBoard() === true ? 2.5 : 0
	let yOffset = model.isItemOnTopOfBoard() === true ? 2.5 : 0
	let x = coords[0]
	let y = coords[1]
	const urc = usedRowCol || map.getUsedRowCol()
	let firstUsedCol = urc[1][0]
	let firstUsedRow = urc[0][0]
	if (isTile) {
		x = x - firstUsedCol
		y = y - firstUsedRow
	} else {
		x = x - firstUsedCol * 5
		y = y - firstUsedRow * 5
	}
	x = xOffset * trueW + x * w
	y = yOffset * trueW + y * w

	return [x, y]
}

// Board food tokens - picks the high contrast variant when the user has that setting
export function giveBoardFoodTokenImage(good) {
	const highContrast = window.initData.highContrastBoardItems
	let name = ""
	if (highContrast) {
		switch (good) {
			case rf.BURGER:
				name = "burger_board2.png"
				break
			case rf.PIZZA:
				name = "pizza_board2.png"
				break
			case rf.BEER:
				name = "beer_board2.png"
				break
			case rf.COKE:
				name = "coke_board2.png"
				break
			case rf.LEMONADE:
				name = "juice_board2.png"
				break
			case rf.COFFEE:
				name = "coffee_board.png"
				break
			case rf.SUSHI:
				name = "sushi_board.png"
				break
			case rf.NOODLES:
				name = "noodles_board.png"
				break
			case rf.KIMCHI:
				name = "kimchi_board.png"
				break
			case rf.DUMPLING:
				name = "dumpling_board.png"
				break
		}
	} else {
		switch (good) {
			case rf.BURGER:
				name = "burger_board.png"
				break
			case rf.PIZZA:
				name = "pizza_board.png"
				break
			case rf.BEER:
				name = "beer_board.png"
				break
			case rf.COKE:
				name = "coke_board.png"
				break
			case rf.LEMONADE:
				name = "juice_board.png"
				break
			case rf.COFFEE:
				name = "coffee_board.png"
				break
			case rf.SUSHI:
				name = "sushi_board.png"
				break
			case rf.NOODLES:
				name = "noodles_board.png"
				break
			case rf.KIMCHI:
				name = "kimchi_board.png"
				break
			case rf.DUMPLING:
				name = "dumpling_board.png"
				break
		}
	}
	return new URL(`../../../static/FCM/images/` + name, import.meta.url).href
}
