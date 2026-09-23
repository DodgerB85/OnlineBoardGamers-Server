<script setup>
/** Each individual entry for the FCM history
 *  Displays player actions, game events, and turn information
 */

import * as rf from "../js/FCMreference.js"
import * as funcs from "../js/FCMfuncs.js"
import * as history from "../js/FCMhistory.js"
import * as replay from "../js/FCMreplay.js"
import * as view from "../js/FCMview.js"
import * as map from "../js/FCMmap.js"
import * as plyr from "../js/FCMplayer.js"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

import i18n from "../i18n"

import InfoPopup from "./utils/InfoPopup.vue"

const props = defineProps({
	entry: {
		type: Array,
		required: true,
	},
	entry_ID: {
		type: Number,
		default: -1,
	},
})

function clickedHistoryEntry(action, entry3, entry_id) {
	// If not replay, or if clicking on the replay entry, just do highlights
	if (!store.viewSettings.showReplay || entry_id === -1) {
		if (history.setupHistoryHighlight) history.setupHistoryHighlight(action, entry3, entry_id)
	}
	// Otherwise, you are clicking in history during replay
	else if (replay.goToReplayStep) replay.goToReplayStep(entry_id)
}

const ORDINAL_KEYS = ["first", "second", "third", "fourth", "fifth", "sixth"]
const UNROTATABLE_CAMPAIGNS = [1, 2, 3, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]

const MODULE_IMGS = {
	8: ["so_hardchoices2", "hardChoices"],
	20: ["so_ketchupMS", "ketchupMilestone"],
	23: ["so_reservePrice", "newReserveCards"],
	14: ["so_movieStars", "movieStars"],
	15: ["so_massMarketeers", "massMarketeers"],
	13: ["so_GFC", "gourmetFoodCritics"],
	17: ["so_rural", "ruralMarketeers"],
	22: ["so_lobbyists", "lobbyists"],
	16: ["so_nightShift", "nightShiftManager"],
	19: ["so_coffee", "coffee"],
	9: ["so_fryChef", "fryChef"],
	10: ["so_kimchi", "kimchi"],
	11: ["so_sushi", "sushi"],
	12: ["so_noodles", "noodles"],
	999: ["so_skip", "skipModule"],
}

function translateApartmentNumber(number) {
	if (number == 3.2) return 3.14
	if (number == 9.7) return 9.75
	else return number
}

function getFormattedDate(timestamp) {
	return new Date(timestamp).toLocaleString()
}

function getFacingDirection(rotation) {
	if (rotation === 0) return "NE"
	if (rotation === 1) return "SE"
	if (rotation === 2) return "SW"
	return "NW"
}

function getOrdinalWord(n) {
	return ORDINAL_KEYS[n] ? i18n.global.t("history.ordinals." + ORDINAL_KEYS[n]) : String(n + 1)
}

function giveNumOrdinal(n) {
	return ORDINAL_KEYS[n] ? i18n.global.t("history.numOrdinals." + ORDINAL_KEYS[n]) : String(n + 1)
}

function playerName(playerIndex) {
	return store.players[playerIndex]?.displayName ?? i18n.global.t("history.system")
}

function playerIconSrc(colour) {
	return view.getImage("player_resto_icon_" + personal.getCorrectedColour(colour))
}

function empTitle(employee, training = false) {
	if (rf.EMPLOYEES_STR[employee] == null) return "?"
	let nameString = rf.EMPLOYEES_STR[employee].title
	if (training) {
		if (nameString === i18n.global.t("employees.newBusinessDeveloper")) nameString = i18n.global.t("history.abbr.newBizDev")
		else if (nameString === i18n.global.t("employees.executiveVicePresident")) nameString = i18n.global.t("history.abbr.executiveVP")
		else if (nameString === i18n.global.t("employees.seniorVicePresident")) nameString = i18n.global.t("history.abbr.seniorVP")
		else if (nameString === i18n.global.t("employees.recruitingManager")) nameString = i18n.global.t("history.abbr.recruitingMgr")
		else if (nameString === i18n.global.t("employees.jazzMusician")) nameString = i18n.global.t("history.abbr.jazzM")
	}
	return nameString
}

function empType(employee) {
	return rf.EMPLOYEES_STR[employee]?.type ?? ""
}

function empClass(employee) {
	const type = empType(employee)
	return [type, type === "manager" ? "inverted" : ""].filter(Boolean)
}

function goodSrc(good) {
	if (Array.isArray(good)) good = good[0]
	return view.getImage(`item_${good}`)
}

function goodClass(good) {
	if (Array.isArray(good)) good = good[0]
	if (good === rf.BEER || good === rf.COKE) return "foodTokenThin"
	if (good === rf.LEMONADE || good === rf.COFFEE) return "foodTokenMed"
	return ""
}

function salaryPayText(salaryArr) {
	if (salaryArr.length > 1) return i18n.global.t("history.salaryPay", { amount: salaryArr[0], count: salaryArr[1] })
	return String(salaryArr[0])
}

function getNumOfTrainsStr(from, to) {
	let res = ">"
	// from hiring, just give level of employee
	if (from === -1) {
		let idx = rf.EMPLOYEE_ARRANGEMENT.indexOf(to)
		idx = idx % 5
		res = String(idx) + "x >"
	} else {
		let fromIdx = rf.EMPLOYEE_ARRANGEMENT.indexOf(from)
		fromIdx = fromIdx % 5
		let toIdx = rf.EMPLOYEE_ARRANGEMENT.indexOf(to)
		toIdx = toIdx % 5
		if (toIdx - fromIdx > 1) res = String(toIdx - fromIdx) + "x >"
	}
	return res
}

/////////////////////////
function getCoordinates(index) {
	let firstUsedCol = map.getUsedRowCol()[1][0]
	let firstUsedRow = map.getUsedRowCol()[0][0]

	let indexXcoord = index % (store.mapData.dimensions[0] * 5)
	let indexYcoord = Math.floor(index / (store.mapData.dimensions[0] * 5))

	indexXcoord = indexXcoord - firstUsedCol * 5 + 1
	indexYcoord = indexYcoord - firstUsedRow * 5 + 1

	return [indexXcoord, indexYcoord]
}

function showHawkerRoute(routeIndexes) {
	const current = store.highlights.indexesToHighlightPath
	if (current.length === routeIndexes.length && current.every((v, i) => v === routeIndexes[i])) store.highlights.indexesToHighlightPath = []
	else store.highlights.indexesToHighlightPath = routeIndexes
}

	// Expand a coffee block's exported highlight squares (flat array, or
	// [[route singles], [restaurant indexes], [coffee shop singles]]) into board indexes 
	function coffeeHighlightSquares(exported) {
		const squares = []
		if (!exported || exported.length === 0) return squares
		if (typeof exported[0] === "number") {
			for (const idx of exported) squares.push(funcs.importIndex(idx))
		} else {
			const W = rf.ssW
			for (const idx of exported[0] || []) squares.push(funcs.importIndex(idx))
			for (const idx of exported[1] || []) {
				const r = funcs.importIndex(idx)
				squares.push(r, r + 1, r + W, r + W + 1)
			}
			// Coffee shop sales are singles (1x1), not 2x2 footprints
			for (const idx of exported[2] || []) squares.push(funcs.importIndex(idx))
		}
		return squares
	}

// Toggle the coffee route highlight + the info panel in the action area
function toggleCoffeeInfo(bi) {
	const block = computedEntry3.value.blocks[bi]
	if (!block || block.kind !== "coffee") return

	if (store.viewSettings.coffeeInfoShownBlock === bi) {
		store.clearCoffeeHistoryInfo()
		return
	}
	store.viewSettings.showCoffeeHistoryInfo = true
	store.viewSettings.coffeeInfoShownBlock = bi
	store.historyHelpers.coffeeRouteSquaresToHighlight = coffeeHighlightSquares(block.highlightSqs)
}

const computedEntry3 = computed(() => {
	let ret = {}
	let entry = props.entry
	const param = entry[3]

	if (entry[0] === rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION) {
		const restoIndex = funcs.importIndex(param[0])
		let rotation = 3
		if (param.length > 1) rotation = param[1]

		ret.facingStr = getFacingDirection(rotation)
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(restoIndex)
	} else if (entry[0] === rf.HIST_CHOOSE_STRUCTURE) {
		ret.hasEmployees = param[0].length > 0
		ret.hasBeach = param[1].length > 0
		ret.employees = param[0]
	} else if (entry[0] === rf.HIST_TRAIN) {
		ret.trainedInfo = []
		for (let i = 0; i < param.length / 2; i++) {
			let from = param[i * 2]
			let fromStructure = false
			let fromHiring = false
			if (from >= 50) {
				from -= 50
				fromStructure = true
			} else if (from === -1) fromHiring = true
			const to = param[i * 2 + 1]
			ret.trainedInfo.push({
				from: from,
				to: to,
				numTrainsStr: getNumOfTrainsStr(from, to),
				fromStructure: fromStructure,
				fromHiring: fromHiring,
			})
		}
	} else if (entry[0] === rf.HIST_START_MARKETING_CAMPAIGN) {
		ret.campaignNumber = param[0]
		const campaignIndex = funcs.importIndex(param[1]) // OR ROUTE IF HAWKER
		const campaignGoodEntry = param[2]
		let paramIdx = 3
		let campaignEmployee = -1
		if (ret.campaignNumber <= 3 || ret.campaignNumber >= 17) {
			if (ret.campaignNumber <= 3) campaignEmployee = rf.BRAND_DIRECTOR
			else if (ret.campaignNumber <= 20) campaignEmployee = rf.GOURMET_FOOD_CRITIC
			else if (ret.campaignNumber <= 24) campaignEmployee = rf.RURAL_MARKETEER
			else campaignEmployee = rf.HAWKER_MARKETEER
		}
		// Otherwise need to read in the employee
		else {
			campaignEmployee = param[paramIdx++]
		}
		ret.campaignEmployee = campaignEmployee
		let campaignRotated = 0
		if (rf.ROTATABLE_CAMPAIGNS.includes(ret.campaignNumber)) campaignRotated = param[paramIdx++]
		ret.campaignRotated = campaignRotated

		ret.durationNum = param.length > paramIdx ? param[paramIdx] : 9
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(campaignIndex)

		ret.campaignGoods = Array.isArray(campaignGoodEntry) ? [...campaignGoodEntry] : [campaignGoodEntry]

		// Add second good for radio campaigns when the First Radio Campaign milestone is held
		ret.radioDouble = store.players[entry[1]] != null && plyr.hasMilestone(entry[1], rf.FIRST_RADIO_CAMPAIGN) && rf.MARKETING_CAMPAIGNS[ret.campaignNumber]?.type === rf.RADIO

		ret.noCoords = ret.campaignNumber >= 17 && ret.campaignNumber <= 27
		ret.isHawker = ret.campaignNumber >= 25 && ret.campaignNumber <= 27
		ret.routeIndexes = ret.isHawker ? funcs.importIndexes(param[1]) : []

		let rotString = ""
		if (!UNROTATABLE_CAMPAIGNS.includes(ret.campaignNumber)) {
			rotString = campaignRotated == 1 ? i18n.global.t("history.vertically") : i18n.global.t("history.horizontally")
			if (ret.campaignNumber === 4) rotString = campaignRotated == 1 ? i18n.global.t("history.horizontally") : i18n.global.t("history.vertically")
		}
		ret.orientationStr = rotString
	} else if (entry[0] === rf.HIST_PRODUCE_FOOD_DRINKS) {
		ret.employees = param[0]
		ret.producedItems = []
		param[1].forEach((count, j) => {
			if (count > 0) ret.producedItems.push({ count: count, good: j })
		})
	} else if (entry[0] === rf.HIST_BUILD_HOUSE) {
		const houseIndex = funcs.importIndex(param[0])
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(houseIndex)
		ret.houseNumber = param[1]
		const houseRot = param.length > 2 ? param[2] : 1
		ret.orientationStr = houseRot === 1 || houseRot === 3 ? i18n.global.t("history.horizontally") : i18n.global.t("history.vertically")
	} else if (entry[0] === rf.HIST_BUILD_GARDEN) {
		const gardenIndex = funcs.importIndex(param[0])
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(gardenIndex)
		ret.houseNumber = param[1]
		ret.orientationStr = param.length > 2 && param[2] === 0 ? i18n.global.t("history.horizontally") : i18n.global.t("history.vertically")
	} else if (entry[0] === rf.HIST_ADD_FREEWAY) {
		const freewayIndex = funcs.importIndex(param[0])
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(freewayIndex)
		let rotString = ""
		if (param[1] == 1) rotString = i18n.global.t("history.vertically")
		else rotString = i18n.global.t("history.horizontally")
		if (param[2] === 0) {
			if (param[1] == 0) rotString = i18n.global.t("history.horizontally")
			else rotString = i18n.global.t("history.vertically")
		}
		ret.orientationStr = rotString
	} else if (entry[0] === rf.HIST_OPEN_RESTAURANT) {
		const restoIndex = funcs.importIndex(param[0])
		ret.isLocalManager = param[1] === 1
		let rotation = 3
		if (param.length > 2) rotation = param[2]
		ret.facingStr = getFacingDirection(rotation)
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(restoIndex)
	} else if (entry[0] === rf.HIST_MOVE_RESTAURANT) {
		const newRestoIndex = funcs.importIndex(param[0])
		const oldRestoIndex = funcs.importIndex(param[1])
		let rotation = 3
		if (param.length > 2) rotation = param[2]
		ret.facingStr = getFacingDirection(rotation)
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(oldRestoIndex)
		;[ret.Xcoord2, ret.Ycoord2] = getCoordinates(newRestoIndex)
	} else if (entry[0] === rf.HIST_PIZZA_BOMB) {
		const radioIndex = funcs.importIndex(param[0])
		ret.radioNum = param.length > 1 ? param[1] : 1
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(radioIndex)
	} else if (entry[0] === rf.HIST_LOBBYIST_PARK) {
		const parkIndex = funcs.importIndex(param[0])
		ret.parkVariety = param[1]
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(parkIndex)
		let variety = i18n.global.t("history.park4")
		if (ret.parkVariety == 1) variety = i18n.global.t("history.parkT")
		if (ret.parkVariety == 2) variety = i18n.global.t("history.parkL")

		let rotation = 0
		let flipped = 0
		if (param.length >= 3) rotation = param[2]
		if (param.length >= 4) flipped = param[3]

		// Glyphs for the T/L park shapes (variety-rotation, "f" suffix = flipped)
		const PARK_GLYPHS = {
			"1-0": "┬",
			"1-1": "┥",
			"1-2": "┸",
			"1-3": "┣",
			"2-0": "┑",
			"2-1": "⌋",
			"2-2": "⌞",
			"2-3": "⎾",
			"2-0f": "⌜",
			"2-1f": "⌉",
			"2-2f": "┘",
			"2-3f": "L",
		}
		let rotString = " " + (rotation == 1 ? i18n.global.t("history.vertically") : i18n.global.t("history.horizontally")) + " "
		const glyph = PARK_GLYPHS[ret.parkVariety + "-" + rotation + (flipped === 1 ? "f" : "")]
		if (glyph) rotString = glyph

		ret.parkDetails = variety + rotString
	} else if (entry[0] === rf.HIST_LOBBYIST_ROAD) {
		const roadIndex = funcs.importIndex(param[0])
		const roadVariety = param[1]
		let roadRotation = 0
		if (param.length >= 3) roadRotation = param[2]
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(roadIndex)

		let roadVarStr = i18n.global.t("history.road2")
		if (roadVariety == 1) roadVarStr = i18n.global.t("history.road4")
		if (roadVariety == 2) roadVarStr = i18n.global.t("history.roadCorner")

		let roadRotStr = " " + i18n.global.t("history.horizontally") + " "
		if (roadRotation === 1) roadRotStr = " " + i18n.global.t("history.vertically") + " "
		if (roadVariety == 2) roadRotStr = ["┌", "┓", "┘", "└"][roadRotation]

		ret.roadDetails = roadVarStr + roadRotStr
	} else if (entry[0] === rf.HIST_NEW_TILE) {
		const tileIndex = funcs.importIndex(param[0])
		ret.tileID = param[1]
		ret.tileRotation = param[2]
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(tileIndex)
		let numStr = "" + (ret.tileID + 1)
		if (ret.tileID < 9) numStr = "0" + (ret.tileID + 1)
		ret.tileImgKey = "map" + numStr
	} else if (entry[0] === rf.HIST_COFFE_SHOP_BUILD || entry[0] === rf.HIST_COFFE_SHOP_REMOVE) {
		const coffeeShopIndex = funcs.importIndex(param[0])
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(coffeeShopIndex)
	} else if (entry[0] === rf.HIST_RESTO_MAILBOX_MS) {
		ret.campaignNumber = param[0]
		const mailboxIndex = funcs.importIndex(param[1])
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(mailboxIndex)
	} else if (entry[0] === rf.HIST_START_NS_CAMPAIGN) {
		ret.campaignNumber = param[0]
		const nsCampaignIndex = funcs.importIndex(param[1])
		ret.durationNum = param[3]
		let nsRotString = ""
		if (param.length >= 4 && param[4] == 1) nsRotString = i18n.global.t("history.vertically")
		else if (param.length >= 4 && param[4] == 0) nsRotString = i18n.global.t("history.horizontally")
		ret.orientationStr = nsRotString
		ret.isRotatable = rf.ROTATABLE_CAMPAIGNS.includes(ret.campaignNumber)
		;[ret.Xcoord, ret.Ycoord] = getCoordinates(nsCampaignIndex)
	} else if (entry[0] === rf.HIST_DINNER_TIME) {
		/*
		Regular sale house:
		0 = houseNumber
		1 = [list of goods]
		// NO SALE STOPS HERE (length === 2)
		2 = [list of providers, winner first] - each [colour, price, distance, waitresses|[jazz,waitresses], order, movieStar?]
		3 = bonus_amount
		4 = garden/park/both status
		5? = num_fry_chefs

		Coffee sale block:
		0 = how much coffee sold per player idx (array)
		1 = highlight squares
		2 = coffee sales data - each [base price, numFryChefs?]
		*/
		ret.noSalesAtAll = param.length === 0
		ret.blocks = []
		let currentBuilding = -1
		let currentGardenParkMultiplier = 1
		let currentGardenParkStatus = 0

		let roadworksTurn = null
		if (store.startingOptions.lobbyists && store.newRoads.length > 0) {
			for (let i = store.history.length - 1; i >= 0; i--) {
				if (store.history[i][0] === rf.HIST_NEW_TURN) {
					roadworksTurn = store.history[i][3][0]
					break
				}
			}
		}

		for (const house of param) {
			// Not a coffee sale
			if (!store.startingOptions.coffee || typeof house[0] === "number") {
				const buildingNumber = house[0]
				currentBuilding = buildingNumber
				const block = {
					kind: "sale",
					buildingNumber: buildingNumber,
					isApartment: rf.APARTMENTS.includes(buildingNumber),
					isRural: buildingNumber == rf.RURAL_MARKETING_AREA,
					goods: house[1],
					noSale: house.length === 2,
					multipleProviders: false,
					providers: [],
					singleProviderColour: null,
					roadworksNote: false,
					sale: null,
				}
				if (house.length !== 2) {
					const providers = house[2]
					block.multipleProviders = providers.length > 1
					if (block.multipleProviders) {
						block.providers = providers.map((c) => ({
							colour: c[0],
							price: c[1],
							distance: c[2],
							jazz: store.startingOptions.jazzMusicians ? c[3][0] : null,
							waitresses: store.startingOptions.jazzMusicians ? c[3][1] : c[3],
							order: c[4],
							star: store.startingOptions.movieStars && c.length > 5 ? c[5] : null,
						}))
						block.roadworksNote = roadworksTurn !== null && store.newRoads.some((r) => r.turnAdded === roadworksTurn)
					} else {
						block.singleProviderColour = providers[0][0]
					}

					// Sale summary for the winning provider (always the first entry)
					const winner = providers[0]
					if (winner.length > 0) {
						const basePrice = winner[1]
						const bonusAmount = house[3]
						const numItems = house[1].length
						const gardenParkStatus = house[4]
						currentGardenParkStatus = gardenParkStatus
						let gardenParkMultiplier = gardenParkStatus
						if (gardenParkMultiplier === 1) gardenParkMultiplier = 2
						if (gardenParkMultiplier === 0) gardenParkMultiplier = 1
						currentGardenParkMultiplier = gardenParkMultiplier
						let numFryChefs = 0
						if (store.startingOptions.fryChefs && house.length > 5 && house[5] > 0 && house[5] !== 9) numFryChefs = house[5]
						const finalSaleAmount = basePrice * numItems * gardenParkMultiplier + bonusAmount + numFryChefs * 10
						const winnerIdx = store.players.findIndex((p) => p.colour === winner[0])
						block.sale = {
							winnerColour: winner[0],
							basePrice: basePrice,
							numItems: numItems,
							gardenParkStatus: gardenParkStatus,
							bonusAmount: bonusAmount,
							numFryChefs: numFryChefs,
							finalSaleAmount: finalSaleAmount,
							milestoneNote: winnerIdx > -1 && (plyr.hasMilestone(winnerIdx, rf.FIRST_MARKETEER_USED) || plyr.hasMilestone(winnerIdx, rf.SOMEONE_SELLS_YOUR_DEMAND)),
						}
					}
				}
				ret.blocks.push(block)
			} else if (store.startingOptions.coffee && typeof house[0] === "object") {
				const coffeeSalesNum = house[0]
				const coffeeSalesData = house[2]
				const coffeeBuilding = currentBuilding
				const block = {
					kind: "coffee",
					buildingNumber: coffeeBuilding,
					isApartment: rf.APARTMENTS.includes(coffeeBuilding),
					isRural: coffeeBuilding == rf.RURAL_MARKETING_AREA,
					gardenParkStatus: currentGardenParkStatus,
					highlightSqs: house[1],
					rows: [],
					anySales: false,
				}
				for (let i = 0; i < coffeeSalesNum.length; i++) {
					if (coffeeSalesNum[i] > 0) {
						block.anySales = true
						const baseCoffeePrice = coffeeSalesData[i][0]
						let numCoffeeFryChefs = 0
						if (store.startingOptions.fryChefs && coffeeSalesData[i].length > 1) numCoffeeFryChefs = coffeeSalesData[i][1]
						const finalCoffeeSaleAmount = baseCoffeePrice * coffeeSalesNum[i] * currentGardenParkMultiplier + numCoffeeFryChefs * 10
						block.rows.push({
							colour: store.players[i]?.colour,
							count: coffeeSalesNum[i],
							baseCoffeePrice: baseCoffeePrice,
							numFryChefs: numCoffeeFryChefs,
							finalSaleAmount: finalCoffeeSaleAmount,
						})
					}
				}
				ret.blocks.push(block)
			}
		}
	} else if (entry[0] === rf.HIST_MARKETING_CAMPAIGN_PHASE) {
		/* Each param is an array with the following entries:
		0: campaign number
		1: affected buildings
		2: marketed good
		*/
		ret.none = param.length === 0
		ret.massRoundHeader = null
		let marketingParam = [...param]
		if (!ret.none && store.startingOptions.massMarketers) {
			if (typeof param.slice(-1)[0] !== "number") {
				const hasMass = store.players.some((p) => p.employees.includes(rf.MASS_MARKETEER))
				if (hasMass) ret.massRoundHeader = i18n.global.t("history.normalAdvertisingRound")
			} else {
				ret.massRoundHeader = i18n.global.t("history.massMarketeerRound", { num: param.slice(-1)[0] })
				marketingParam = param.slice(0, -1)
			}
		}
		ret.campaigns = marketingParam.map((campaign) => {
			const houses = []
			const apartments = []
			let affectsRMA = false
			if (campaign.length > 1 && campaign[1].length > 0) {
				campaign[1].forEach((number) => {
					if (rf.ALL_HOUSES.includes(number)) houses.push(number)
					if (rf.APARTMENTS.includes(number)) apartments.push(number === 3.2 ? 3.14 : number)
					if (number == rf.RURAL_MARKETING_AREA) affectsRMA = true
				})
			}
			return { num: campaign[0], good: campaign[2], houses: houses, apartments: apartments, rma: affectsRMA }
		})
	} else if (entry[0] === rf.HIST_MARKETING_EARNING) {
		ret.earningRows = []
		param.forEach((pEarnings, p) => {
			if (pEarnings.length === 0) return
			let numItems = pEarnings[0].length
			pEarnings[0].forEach((bldg) => {
				if (bldg === 3.2) numItems++
				if (bldg === 9.7) numItems++
				if (bldg === rf.RURAL_MARKETING_AREA) numItems++
			})
			const uniqBuildings = [...new Set(pEarnings[0])]
			let buildingsStr
			if (uniqBuildings.includes(rf.RURAL_MARKETING_AREA)) buildingsStr = uniqBuildings.map((b) => (b === rf.RURAL_MARKETING_AREA ? " [" + i18n.global.t("history.ruralArea") + "]" : " " + b)).toString()
			else buildingsStr = uniqBuildings.toString()
			ret.earningRows.push({
				colour: store.players[p]?.colour,
				amount: pEarnings[1],
				numItems: numItems,
				buildingsStr: buildingsStr,
				singleBuilding: uniqBuildings.length === 1,
			})
		})
	} else if (entry[0] === rf.HIST_INCOME) {
		ret.none = param.length === 0
		ret.jazzTable = !!store.startingOptions.jazzMusicians
		ret.incomeRows = []
		for (let k = 0; k < param.length; k++) {
			const waitressVal = plyr.hasMilestone(k, rf.FIRST_WAITRESS) ? 5 : 3
			const salesIncome = param[k][0]
			let numberOfWaitress = 0
			let numberOfJazz = 0
			if (ret.jazzTable) {
				numberOfWaitress = param[k][1][0]
				numberOfJazz = param[k][1][1]
			} else numberOfWaitress = param[k][1]
			const CFObonus = param[k].length > 2 ? param[k][2] : 0
			ret.incomeRows.push({
				colour: store.players[k]?.colour,
				salesIncome: salesIncome,
				numberOfJazz: numberOfJazz,
				numberOfWaitress: numberOfWaitress,
				waitressVal: waitressVal,
				CFObonus: CFObonus,
				totalIncome: salesIncome + numberOfJazz * 15 + numberOfWaitress * waitressVal + CFObonus,
			})
		}
	} else if (entry[0] === rf.HIST_SALARY) {
		ret.none = param.length === 0
		ret.salaryRows = param.map((s, i) => ({ colour: store.players[i]?.colour, payStr: salaryPayText(s) }))
	} else if (entry[0] === rf.HIST_SALARY_STRICT) {
		const dollarAmount = param[0]
		const itemsAmount = param.length > 1 ? param[1] : 0
		ret.payStr = itemsAmount > 0 ? i18n.global.t("history.salaryPay", { amount: dollarAmount, count: itemsAmount }) : String(dollarAmount)
	} else if (entry[0] === rf.HIST_DISPLAY_RESERVE) {
		ret.reserveCards = param.map((v) => {
			if (store.startingOptions.reservePrice) {
				if (v === -1) return "res_card_0"
				if (v === 1) return "res_card_5"
				if (v === 2) return "res_card_10"
				if (v === 3) return "res_card_20"
				return "res_card_0"
			}
			return v === -1 ? "res_card_0" : `res_card_${v}`
		})
		// New base price from the most frequent reserve card
		ret.basePrice = 10
		if (store.startingOptions.reservePrice) {
			const reserveCounts = [0, 0, 0]
			for (const card of param) {
				if (card >= 1 && card <= 3) reserveCounts[card - 1]++
			}
			const maxCount = Math.max(...reserveCounts)
			if (maxCount === reserveCounts[2]) ret.basePrice = 20
			else if (maxCount === reserveCounts[0]) ret.basePrice = 5
		}
	} else if (entry[0] === rf.HIST_NEW_MILESTONE) {
		ret.ms = rf.MILESTONES_STR[param[0]]
	} else if (entry[0] === rf.HIST_CEO_BONUS_CHOSEN) {
		if (param[0] === rf.CEO_ACTION_PRICE_MINUS_3) ret.ceoText = "playerDetails.priceMinus3"
		else if (param[0] === rf.CEO_ACTION_RECRUITING_MANAGER) ret.ceoText = "employees.recruitingManagerDesc"
		else if (param[0] === rf.CEO_ACTION_COACH) ret.ceoText = "employees.coachDesc"
		else ret.ceoText = ""
	} else if (entry[0] === rf.HIST_CHOOSE_MODULE) {
		ret.moduleChoice = MODULE_IMGS[param[0]] ?? null
	}
	return ret
})
</script>

<template>
	<div
		class="log"
		:id="entry_ID > -1 ? 'entry' + String(entry_ID) : undefined"
		:class="{ separator: entry[0] === rf.HIST_NEW_TURN || entry[0] === rf.HIST_SETUP_GAME }"
		:style="entry[1] > -1 && store.players[entry[1]] ? { backgroundImage: 'url(' + view.getImage('player_resto_icon_' + personal.getCorrectedColour(store.players[entry[1]].colour)) + ')' } : {}"
		@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
	>
		<div v-if="entry[0] !== rf.HIST_NEW_TURN && entry[0] !== rf.HIST_SETUP_GAME" class="header"><span> {{ getFormattedDate(entry[2] * 1000) }} </span></div>

		<!-- HIST_CHOOSE_RESTAURANT_STARTING_POSITION: player picks their starting restaurant location -->
		<template v-if="entry[0] === rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION">
			<i18n-t keypath="history.chooseStartPos" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
				<template #facing>{{ $t("history.facing." + computedEntry3.facingStr) }}</template>
			</i18n-t>
		</template>

		<!-- HIST_DELAY_SETUP: player delays their first restaurant -->
		<template v-else-if="entry[0] === rf.HIST_DELAY_SETUP">
			<i18n-t keypath="history.delaySetup" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t>
		</template>

		<!-- HIST_CHOOSE_RESERVE_CARD: player picks their reserve card -->
		<template v-else-if="entry[0] === rf.HIST_CHOOSE_RESERVE_CARD">
			<i18n-t keypath="history.chooseReserveCard" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t>
		</template>

		<!-- HIST_CHOOSE_TURN_ORDER: player chooses their turn order -->
		<template v-else-if="entry[0] === rf.HIST_CHOOSE_TURN_ORDER">
			<i18n-t keypath="history.chooseTurnOrder" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #ordinal>{{ getOrdinalWord(entry[3][0]) }}</template>
			</i18n-t>
		</template>

		<!-- HIST_CHOOSE_TURN_ORDER_FORCED: player is forced to a turn order -->
		<template v-else-if="entry[0] === rf.HIST_CHOOSE_TURN_ORDER_FORCED">
			<i18n-t keypath="history.hasToPlayTurnOrder" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #ordinal>{{ getOrdinalWord(entry[3][0]) }}</template>
			</i18n-t>
		</template>

		<!-- HIST_CHOOSE_TURN_ORDER_AUTO_EARLY: player auto-chooses to play early -->
		<template v-else-if="entry[0] === rf.HIST_CHOOSE_TURN_ORDER_AUTO_EARLY">
			<i18n-t keypath="history.chooseTurnOrderAutoEarly" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #ordinal>{{ getOrdinalWord(entry[3][0]) }}</template>
			</i18n-t>
		</template>

		<!-- HIST_CHOOSE_TURN_ORDER_AUTO_LATE: player auto-chooses to play late -->
		<template v-else-if="entry[0] === rf.HIST_CHOOSE_TURN_ORDER_AUTO_LATE">
			<i18n-t keypath="history.chooseTurnOrderAutoLate" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #ordinal>{{ getOrdinalWord(entry[3][0]) }}</template>
			</i18n-t>
		</template>

		<!-- HIST_CHOOSE_STRUCTURE: player chooses which employees go to work -->
		<template v-else-if="entry[0] === rf.HIST_CHOOSE_STRUCTURE">
			<i18n-t v-if="!computedEntry3.hasEmployees && !computedEntry3.hasBeach" keypath="history.hasNoEmployees" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t>
			<div v-else-if="computedEntry3.hasEmployees"><i18n-t keypath="history.sendsToWork" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t> <InfoPopup v-for="(e, i) in computedEntry3.employees" :key="i" type="employee" :employeeId="e">
				<span class="compact" :class="empClass(e)">{{ empTitle(e) }}</span>
			</InfoPopup>
			</div>
			<div v-else><i18n-t keypath="history.sendsNoOneToWork" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t></div>
		</template>

		<!-- HIST_HIRE: player hires employees -->
		<template v-else-if="entry[0] === rf.HIST_HIRE">
			<div v-if="entry[3].length > 0"><i18n-t keypath="history.hires" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t> <InfoPopup v-for="(e, i) in entry[3]" :key="i" type="employee" :employeeId="e">
				<span class="compact" :class="empClass(e)">{{ empTitle(e) }}</span>
			</InfoPopup>
			</div>
			<i18n-t v-else keypath="history.hiresNoOne" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t>
		</template>

		<!-- HIST_TRAIN: player trains employees -->
		<template v-else-if="entry[0] === rf.HIST_TRAIN">
			<div v-if="entry[3].length > 0 && entry[3].length % 2 == 0"><i18n-t keypath="history.trains" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t> <template v-for="(t, i) in computedEntry3.trainedInfo" :key="i">
				<br />
				<template v-if="t.fromHiring">{{ $t("history.fromHiring") + " " }}<b>{{ t.numTrainsStr }}</b> <InfoPopup type="employee" :employeeId="t.to"><span class="compact" :class="empClass(t.to)">{{ empTitle(t.to, true) }}</span></InfoPopup></template>
				<template v-else-if="t.fromStructure">{{ $t("history.fromStructure") }}<InfoPopup type="employee" :employeeId="t.from"><span class="compact" :class="empClass(t.from)">{{ empTitle(t.from) }}</span></InfoPopup> <b>{{ t.numTrainsStr }}</b> <InfoPopup type="employee" :employeeId="t.to"><span class="compact" :class="empClass(t.to)">{{ empTitle(t.to, true) }}</span></InfoPopup></template>
				<template v-else><InfoPopup type="employee" :employeeId="t.from"><span class="compact" :class="empClass(t.from)">{{ empTitle(t.from) }}</span></InfoPopup> <b>{{ t.numTrainsStr }}</b> <InfoPopup type="employee" :employeeId="t.to"><span class="compact" :class="empClass(t.to)">{{ empTitle(t.to, true) }}</span></InfoPopup></template>
			</template>
			</div>
			<i18n-t v-else keypath="history.trainsNoOne" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t>
		</template>

		<!-- HIST_START_MARKETING_CAMPAIGN: player starts a marketing campaign -->
		<template v-else-if="entry[0] === rf.HIST_START_MARKETING_CAMPAIGN">
			<i18n-t keypath="history.campaignStart" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #num>{{ computedEntry3.campaignNumber }}</template>
				<template #employee><InfoPopup type="employee" :employeeId="computedEntry3.campaignEmployee"><span class="compact" :class="empClass(computedEntry3.campaignEmployee)">{{ empTitle(computedEntry3.campaignEmployee) }}</span></InfoPopup></template>
			</i18n-t> <template v-if="!computedEntry3.noCoords">{{ computedEntry3.orientationStr ? $t("history.orientAtCoords", { orient: computedEntry3.orientationStr, x: computedEntry3.Xcoord, y: computedEntry3.Ycoord }) : $t("history.atCoords", { x: computedEntry3.Xcoord, y: computedEntry3.Ycoord }) }}</template>{{ $t("history.advertising") + " " }}
			<img v-for="(g, gi) in computedEntry3.campaignGoods" :key="gi" class="foodTokenImg" :class="goodClass(g)" :src="goodSrc(g)" alt="" />
			<img v-if="computedEntry3.radioDouble" class="foodTokenImg" :class="goodClass(computedEntry3.campaignGoods[0])" :src="goodSrc(computedEntry3.campaignGoods[0])" alt="" />
			{{ computedEntry3.durationNum === 9 ? $t("history.eternally") : $t("history.forTurns", computedEntry3.durationNum) }}
			<br v-if="computedEntry3.isHawker" />
			<input v-if="computedEntry3.isHawker" type="button" class="actionsLineButton" :value="$t('history.showRoute')" @click.stop="showHawkerRoute(computedEntry3.routeIndexes)" />
		</template>

		<!-- HIST_START_NS_CAMPAIGN: Night Shift Manager restarts a campaign -->
		<template v-else-if="entry[0] === rf.HIST_START_NS_CAMPAIGN">
			<i18n-t keypath="history.nsCampaign" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #trainee><InfoPopup type="employee" :employeeId="rf.MARKETING_TRAINEE"><span class="compact" :class="empClass(rf.MARKETING_TRAINEE)">{{ empTitle(rf.MARKETING_TRAINEE) }}</span></InfoPopup></template>
				<template #nsm><InfoPopup type="employee" :employeeId="rf.NIGHT_SHIFT_MANAGER"><span class="compact" :class="empClass(rf.NIGHT_SHIFT_MANAGER)">{{ empTitle(rf.NIGHT_SHIFT_MANAGER) }}</span></InfoPopup></template>
				<template #num>{{ computedEntry3.campaignNumber }}</template>
			</i18n-t> <template v-if="computedEntry3.isRotatable">{{ $t("history.orientAtCoordsAd", { orient: computedEntry3.orientationStr, x: computedEntry3.Xcoord, y: computedEntry3.Ycoord }) }}</template><template v-else>{{ $t("history.atCoordsAd", { x: computedEntry3.Xcoord, y: computedEntry3.Ycoord }) }}</template> <img class="foodTokenImg" :class="goodClass(entry[3][2])" :src="goodSrc(entry[3][2])" alt="" />
			{{ computedEntry3.durationNum === 9 ? $t("history.eternally") : $t("history.forTurns", computedEntry3.durationNum) }}
		</template>

		<!-- HIST_RESTO_MAILBOX_MS: restaurant milestone starts a permanent campaign -->
		<template v-else-if="entry[0] === rf.HIST_RESTO_MAILBOX_MS">
			<i18n-t keypath="history.mailboxCampaign" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #num>{{ computedEntry3.campaignNumber }}</template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
				<template #good><img class="foodTokenImg" :class="goodClass(entry[3][2])" :src="goodSrc(entry[3][2])" alt="" /></template>
			</i18n-t>
		</template>

		<!-- HIST_PRODUCE_FOOD_DRINKS: employees produce or collect food/drinks -->
		<template v-else-if="entry[0] === rf.HIST_PRODUCE_FOOD_DRINKS">
			<div><i18n-t keypath="history.usesProduce" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #employees><InfoPopup v-for="(e, i) in entry[3][0]" :key="'e' + i" type="employee" :employeeId="e">
					<span class="compact" :class="empClass(e)">{{ empTitle(e) }}</span>
				</InfoPopup></template>
			</i18n-t> <template v-for="(pi, i) in computedEntry3.producedItems" :key="i">{{ i > 0 ? ", " : "" }}{{ pi.count }} <img class="foodTokenImg" :class="goodClass(pi.good)" :src="goodSrc(pi.good)" alt="" /></template>
			</div>
		</template>

		<!-- HIST_PRODUCE_KIMCHI: Kimchi Master produces kimchi during cleanup -->
		<template v-else-if="entry[0] === rf.HIST_PRODUCE_KIMCHI">
			<div><i18n-t keypath="history.kimchiProduce" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #emp><InfoPopup type="employee" :employeeId="rf.KIMCHI_MASTER"><span class="compact" :class="empClass(rf.KIMCHI_MASTER)">{{ empTitle(rf.KIMCHI_MASTER) }}</span></InfoPopup></template>
			</i18n-t> <img class="foodTokenImg" :src="goodSrc(rf.KIMCHI)" alt="" />
			</div>
		</template>

		<!-- HIST_BUILD_HOUSE: player builds a house -->
		<template v-else-if="entry[0] === rf.HIST_BUILD_HOUSE">
			<i18n-t keypath="history.buildHouse" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #num>{{ computedEntry3.houseNumber }}</template>
				<template #orient>{{ computedEntry3.orientationStr }}</template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- HIST_BUILD_GARDEN: player builds a garden for a house -->
		<template v-else-if="entry[0] === rf.HIST_BUILD_GARDEN">
			<i18n-t keypath="history.buildGarden" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #num>{{ computedEntry3.houseNumber }}</template>
				<template #orient>{{ computedEntry3.orientationStr }}</template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- HIST_ADD_FREEWAY: player builds a freeway -->
		<template v-else-if="entry[0] === rf.HIST_ADD_FREEWAY">
			<i18n-t keypath="history.buildFreeway" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #orient>{{ computedEntry3.orientationStr }}</template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- HIST_OPEN_RESTAURANT: player opens a new restaurant -->
		<template v-else-if="entry[0] === rf.HIST_OPEN_RESTAURANT">
			<i18n-t v-if="computedEntry3.isLocalManager" keypath="history.openRestaurantLocal" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
				<template #facing>{{ $t("history.facing." + computedEntry3.facingStr) }}</template>
			</i18n-t>
			<i18n-t v-else keypath="history.openRestaurant" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
				<template #facing>{{ $t("history.facing." + computedEntry3.facingStr) }}</template>
			</i18n-t>
		</template>

		<!-- HIST_MOVE_RESTAURANT: player moves an existing restaurant -->
		<template v-else-if="entry[0] === rf.HIST_MOVE_RESTAURANT">
			<i18n-t keypath="history.moveRestaurant" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #x1>{{ computedEntry3.Xcoord }}</template>
				<template #y1>{{ computedEntry3.Ycoord }}</template>
				<template #x2>{{ computedEntry3.Xcoord2 }}</template>
				<template #y2>{{ computedEntry3.Ycoord2 }}</template>
				<template #facing>{{ $t("history.facing." + computedEntry3.facingStr) }}</template>
			</i18n-t>
		</template>

		<!-- HIST_DINNER_TIME: evening sales round with providers and prices -->
		<template v-else-if="entry[0] === rf.HIST_DINNER_TIME">
			<p v-if="computedEntry3.noSalesAtAll">{{ $t("history.noSalesAtAll") }}</p>
			<div v-else>
				<h4>{{ $t("history.dinnerTime") }}</h4>
				<template v-for="(block, bi) in computedEntry3.blocks" :key="bi">
					<div v-if="block.kind === 'sale'" class="house">
						<span v-if="!block.isApartment && !block.isRural">{{ $t("history.houseLabel", { num: block.buildingNumber }) }}</span>
						<span v-else-if="block.isApartment">{{ $t("history.apartmentLabel", { num: translateApartmentNumber(block.buildingNumber) }) }}</span>
						<span v-else>{{ $t("history.ruralLabel") }}</span>
						<img v-for="(g, gi) in block.goods" :key="gi" class="foodTokenImg dinnerGoodsImg" :class="goodClass(g)" :src="goodSrc(g)" alt="" />
						<template v-if="block.noSale">
							{{ " " + $t("history.noFulfillDemands") }}
						</template>
						<template v-else>
							<div v-if="block.roadworksNote">{{ $t("history.roadworksNote") }}</div>
							<template v-if="block.multipleProviders">
								<div>{{ $t("history.playersCanFulfill") }}</div>
								<ul>
									<li v-for="(pr, pri) in block.providers" :key="pri">
										<img class="playerImage" :src="playerIconSrc(pr.colour)" alt="" />:
										<span>
											{{ $t("history.providerPriceDistance", { price: pr.price, distance: pr.distance }) }}
											<template v-if="pr.jazz !== null">{{ pr.jazz }} <InfoPopup type="employee" :employeeId="rf.JAZZ_MUSICIAN"><span class="compact" :class="empClass(rf.JAZZ_MUSICIAN)">{{ empTitle(rf.JAZZ_MUSICIAN, true) }}</span></InfoPopup>, </template>{{ pr.waitresses }} <InfoPopup type="employee" :employeeId="rf.WAITRESS"><span class="compact" :title="empTitle(rf.WAITRESS)">{{ empTitle(rf.WAITRESS) }}</span></InfoPopup>, {{ $t("history.playerOrdinal", { ordinal: giveNumOrdinal(pr.order) }) }}
											<template v-if="pr.star === 1">, <InfoPopup type="employee" :employeeId="rf.B_MOVIE_STAR"><span class="compact" :title="empTitle(rf.B_MOVIE_STAR)">{{ empTitle(rf.B_MOVIE_STAR) }}</span></InfoPopup></template>
											<template v-else-if="pr.star === 2">, <InfoPopup type="employee" :employeeId="rf.C_MOVIE_STAR"><span class="compact" :title="empTitle(rf.C_MOVIE_STAR)">{{ empTitle(rf.C_MOVIE_STAR) }}</span></InfoPopup></template>
											<template v-else-if="pr.star === 3">, <InfoPopup type="employee" :employeeId="rf.D_MOVIE_STAR"><span class="compact" :title="empTitle(rf.D_MOVIE_STAR)">{{ empTitle(rf.D_MOVIE_STAR) }}</span></InfoPopup></template>
										</span>
									</li>
								</ul>
							</template>
							<template v-else>: <i18n-t keypath="history.canFulfill" tag="span" scope="global">
								<template #player><img class="playerImage" :src="playerIconSrc(block.singleProviderColour)" alt="" /></template>
							</i18n-t>
							</template>
							<div v-if="block.sale">
								<i18n-t v-if="block.isApartment" keypath="history.apartmentGoesTo" tag="span" scope="global">
									<template #num>{{ translateApartmentNumber(block.buildingNumber) }}</template>
									<template #player><img class="playerImage" :src="playerIconSrc(block.sale.winnerColour)" alt="" /></template>
									<template #amount>{{ block.sale.finalSaleAmount }}</template>
								</i18n-t>
								<i18n-t v-else-if="block.isRural" keypath="history.ruralGoesTo" tag="span" scope="global">
									<template #player><img class="playerImage" :src="playerIconSrc(block.sale.winnerColour)" alt="" /></template>
									<template #amount>{{ block.sale.finalSaleAmount }}</template>
								</i18n-t>
								<i18n-t v-else keypath="history.houseGoesTo" tag="span" scope="global">
									<template #num>{{ block.buildingNumber }}</template>
									<template #player><img class="playerImage" :src="playerIconSrc(block.sale.winnerColour)" alt="" /></template>
									<template #amount>{{ block.sale.finalSaleAmount }}</template>
								</i18n-t>
								<span>{{ " " + $t("history.basePriceItems", { price: block.sale.basePrice, count: block.sale.numItems }) }}</span>
								<span v-if="block.sale.gardenParkStatus === 1">{{ " " + $t("history.doubledGarden") }}</span>
								<span v-else-if="block.sale.gardenParkStatus === 2 && block.isApartment">{{ " " + $t("history.doubledParkApartment") }}</span>
								<span v-else-if="block.sale.gardenParkStatus === 2">{{ " " + $t("history.doubledParkHouse") }}</span>
								<span v-else-if="block.sale.gardenParkStatus === 3">{{ " " + $t("history.tripledParkGarden") }}</span>
								<span v-if="block.sale.bonusAmount > 0">{{ " " + $t("history.bonusOf", { amount: block.sale.bonusAmount }) }}</span>
								<span v-if="block.sale.numFryChefs > 0">{{ $t("history.fryChefBonus", { amount: block.sale.numFryChefs * 10, count: block.sale.numFryChefs }) }}</span>
								<br v-if="block.sale.milestoneNote" />
								<span v-if="block.sale.milestoneNote" class="distance">{{ $t("history.distanceReducedMilestone") }}</span>
							</div>
						</template>
					</div>
					<div v-else-if="block.kind === 'coffee'" class="coffeeDiv">
						<span v-if="!block.isApartment && !block.isRural">{{ $t("history.coffeeSalesHouse", { num: block.buildingNumber }) }}</span>
						<span v-else-if="block.isApartment">{{ $t("history.coffeeSalesApartment", { num: translateApartmentNumber(block.buildingNumber) }) }}</span>
						<span v-else>{{ $t("history.coffeeSalesRural") }}</span>
						<ul v-if="block.anySales">
							<li v-for="(row, ri) in block.rows" :key="ri">
								<img class="playerImage" :src="playerIconSrc(row.colour)" alt="" />:
								<span>
									{{ row.count }} x <img class="foodTokenImg" :class="goodClass(rf.COFFEE)" :src="goodSrc(rf.COFFEE)" alt="" />{{ " " + $t("history.totalIncomeBase", { amount: row.finalSaleAmount, price: row.baseCoffeePrice }) }}
									<template v-if="block.gardenParkStatus === 1">{{ " " + $t("history.doubledGarden") }}</template>
									<template v-else-if="block.gardenParkStatus === 2">{{ " " + $t("history.doubledParkHouse") }}</template>
									<template v-else-if="block.gardenParkStatus === 3">{{ " " + $t("history.tripledParkGarden") }}</template>
									<template v-if="row.numFryChefs > 0">{{ $t("history.fryChefBonus", { amount: row.numFryChefs * 10, count: row.numFryChefs }) }}</template>
								)</span>
							</li>
						</ul>
						<span v-if="!block.anySales">{{ $t("history.noCoffeeSold") }}</span>
						<button v-if="block.anySales && block.highlightSqs && block.highlightSqs.length > 0" class="actionsLineButton coffeeHistButton" @click.stop="toggleCoffeeInfo(bi)">{{ $t("history.moreInformation") }}</button>
					</div>
				</template>
			</div>
		</template>

		<!-- HIST_INCOME: per-player income breakdown -->
		<template v-else-if="entry[0] === rf.HIST_INCOME">
			<p v-if="computedEntry3.none">{{ $t("history.noIncome") }}</p>
			<div v-else>
				<h4>{{ $t("history.incomeHeader") }}</h4>
				<table>
					<thead>
						<tr>
							<td>{{ $t("history.playerHeader") }}</td>
							<td>{{ $t("history.salesHeader") }}</td>
							<td v-if="computedEntry3.jazzTable"><InfoPopup type="employee" :employeeId="rf.JAZZ_MUSICIAN"><span class="compact" :class="empType(rf.JAZZ_MUSICIAN)">{{ empTitle(rf.JAZZ_MUSICIAN, true) }}</span></InfoPopup></td>
							<td><InfoPopup type="employee" :employeeId="rf.WAITRESS"><span class="compact" :class="empType(rf.WAITRESS)">{{ empTitle(rf.WAITRESS) }}</span></InfoPopup></td>
							<td>{{ $t("history.cfoBonusHeader") }}</td>
							<td>{{ $t("history.totalHeader") }}</td>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(r, i) in computedEntry3.incomeRows" :key="i">
							<td><img class="playerImage" :src="playerIconSrc(r.colour)" alt="" /></td>
							<td>${{ r.salesIncome }}</td>
							<td v-if="computedEntry3.jazzTable">${{ r.numberOfJazz * 15 }}</td>
							<td>${{ r.numberOfWaitress * r.waitressVal }}</td>
							<td>${{ r.CFObonus }}</td>
							<td>${{ r.totalIncome }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>

		<!-- HIST_SALARY: per-player salary payments -->
		<template v-else-if="entry[0] === rf.HIST_SALARY">
			<p v-if="computedEntry3.none">{{ $t("history.noSalaries") }}</p>
			<div v-else>
				<h4>{{ $t("history.salariesHeader") }}</h4>
				<ul>
					<li v-for="(r, i) in computedEntry3.salaryRows" :key="i"><img class="playerImage" :src="playerIconSrc(r.colour)" alt="" />: ${{ r.payStr }}</li>
				</ul>
			</div>
		</template>

		<!-- HIST_SALARY_STRICT: single player pays strict salary -->
		<template v-else-if="entry[0] === rf.HIST_SALARY_STRICT">
			<i18n-t keypath="history.paysSalaries" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #pay>{{ computedEntry3.payStr }}</template>
			</i18n-t>
		</template>

		<!-- HIST_MARKETING_CAMPAIGN_PHASE: marketing phase resolution summary -->
		<template v-else-if="entry[0] === rf.HIST_MARKETING_CAMPAIGN_PHASE">
			<p v-if="computedEntry3.none">{{ $t("history.noMarketingCampaigns") }}</p>
			<div v-else>
				<h4>{{ $t("history.marketingCampaignsHeader") }}</h4>
				<div v-if="computedEntry3.massRoundHeader"><b>{{ computedEntry3.massRoundHeader }}</b></div>
				<div v-for="(c, ci) in computedEntry3.campaigns" :key="ci">
					<i18n-t v-if="c.houses.length > 0" keypath="history.campaignHouses" tag="div" scope="global" :plural="c.houses.length">
						<template #num>{{ c.num }}</template>
						<template #good><img class="foodTokenImg" :class="goodClass(c.good)" :src="goodSrc(c.good)" alt="" /></template>
						<template #list>{{ JSON.stringify(c.houses) }}</template>
					</i18n-t>
					<i18n-t v-if="c.apartments.length > 0" keypath="history.campaignApartments" tag="div" scope="global" :plural="c.apartments.length">
						<template #num>{{ c.num }}</template>
						<template #good><img class="foodTokenImg" :class="goodClass(c.good)" :src="goodSrc(c.good)" alt="" /></template>
						<template #list>{{ JSON.stringify(c.apartments) }}</template>
					</i18n-t>
					<i18n-t v-if="c.rma" keypath="history.giantBillboard" tag="div" scope="global">
						<template #good><img class="foodTokenImg" :class="goodClass(c.good)" :src="goodSrc(c.good)" alt="" /></template>
					</i18n-t>
					<i18n-t v-if="c.houses.length === 0 && c.apartments.length === 0 && !c.rma" keypath="history.campaignFailed" tag="div" scope="global">
						<template #num>{{ c.num }}</template>
						<template #good><img class="foodTokenImg" :class="goodClass(c.good)" :src="goodSrc(c.good)" alt="" /></template>
					</i18n-t>
				</div>
			</div>
		</template>

		<!-- HIST_MARKETING_EARNING: marketers' earnings summary -->
		<template v-else-if="entry[0] === rf.HIST_MARKETING_EARNING">
			<div v-if="computedEntry3.earningRows.length > 0">
				<h4>{{ $t("history.marketeersEarnings") }}</h4>
				<ul>
					<li v-for="(r, i) in computedEntry3.earningRows" :key="i">
						<img class="playerImage" :src="playerIconSrc(r.colour)" alt="" />{{ " " + $t("history.earnedForItems", { amount: r.amount, count: r.numItems }) + " " }}{{ $t(r.singleBuilding ? "history.building" : "history.buildings") + " " }}{{ r.buildingsStr }}
					</li>
				</ul>
			</div>
		</template>

		<!-- HIST_DISPLAY_RESERVE: shows the reserve cards in play -->
		<template v-else-if="entry[0] === rf.HIST_DISPLAY_RESERVE">
			<p>{{ $t("history.reserveCardsAre") }}</p>
			<div><img v-for="(k, i) in computedEntry3.reserveCards" :key="i" class="cardImg" :src="view.getImage(k)" alt="" /></div>
			<p v-if="store.startingOptions.reservePrice">{{ $t("history.newBasePrice", { amount: computedEntry3.basePrice }) }}</p>
		</template>

		<!-- HIST_FIRE: player fires employees -->
		<template v-else-if="entry[0] === rf.HIST_FIRE">
			<div v-if="entry[3].length > 0"><i18n-t keypath="history.fires" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t> <InfoPopup v-for="(e, i) in entry[3]" :key="i" type="employee" :employeeId="e">
				<span class="compact" :class="empClass(e)">{{ empTitle(e) }}</span>
			</InfoPopup>
			</div>
			<i18n-t v-else keypath="history.firesNoEmployees" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t>
		</template>

		<!-- HIST_FRIDGE_RESOURCES: player keeps fridge resources -->
		<template v-else-if="entry[0] === rf.HIST_FRIDGE_RESOURCES">
			<div v-if="entry[3].length > 0"><i18n-t keypath="history.keeps" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t> <img v-for="(g, i) in entry[3]" :key="i" class="foodTokenImg" :class="goodClass(g)" :src="goodSrc(g)" alt="" />
			</div>
			<i18n-t v-else keypath="history.keepsNothing" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t>
		</template>

		<!-- HIST_NEW_MILESTONE: player earns a new milestone -->
		<template v-else-if="entry[0] === rf.HIST_NEW_MILESTONE">
			<span><i18n-t keypath="history.newMilestone" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t> </span>
			<span v-if="computedEntry3.ms" class="fullMilestoneSpan" :class="computedEntry3.ms.type">
				<div class="milestoneTitle">{{ computedEntry3.ms.title.toUpperCase() }}</div>
				<div class="milestoneText">{{ computedEntry3.ms.description }}</div>
				<div class="milestoneSpacer">&nbsp;</div>
				<img class="milestoneIcon" :src="view.getImage(computedEntry3.ms.img)" :class="computedEntry3.ms.additionalClass ? computedEntry3.ms.additionalClass : ''" alt="" />
			</span>
			<span v-else>?</span>
		</template>

		<!-- HIST_CEO_BONUS_CHOSEN: player picks a CEO action -->
		<template v-else-if="entry[0] === rf.HIST_CEO_BONUS_CHOSEN">
			<span><i18n-t keypath="history.ceoAction" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t></span>
			<br />
			{{ computedEntry3.ceoText ? $t(computedEntry3.ceoText) : "" }}
		</template>

		<!-- HIST_CHOOSE_MODULE: player picks a starting module -->
		<template v-else-if="entry[0] === rf.HIST_CHOOSE_MODULE">
			<div><i18n-t keypath="history.choosesModule" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
			</i18n-t> <img v-if="computedEntry3.moduleChoice" class="startingOption" :src="view.getImage(computedEntry3.moduleChoice[0])" :title="$t('history.modules.' + computedEntry3.moduleChoice[1])" alt="" />
				{{ computedEntry3.moduleChoice ? $t("history.modules." + computedEntry3.moduleChoice[1]) : "?" }}
			</div>
		</template>

		<!-- HIST_SETUP_GAME: game start, welcome players -->
		<template v-else-if="entry[0] === rf.HIST_SETUP_GAME">
			<div class="new_turn">{{ $t("history.welcome") }}<br />
				<span v-for="(p, i) in store.players" :key="i" class="newTurnBank"> <img class="playerImage" :src="playerIconSrc(p.colour)" alt="" /> {{ p.name }} </span>
			</div>
		</template>

		<!-- HIST_NEW_TURN: start of turn with bank and player money -->
		<template v-else-if="entry[0] === rf.HIST_NEW_TURN">
			<div class="new_turn">
				{{ $t("history.startOfTurn", { num: entry[3][0] }) }}<br />
				<span class="newTurnBank">{{ $t("history.bankAmount", { amount: entry[3][1] }) }}</span><br />
				<span v-for="(money, i) in entry[3][2]" :key="i" class="newTurnBank"> <img class="playerImage" :src="playerIconSrc(store.players[i]?.colour)" alt="" /> ${{ money }} </span>
			</div>
		</template>

		<!-- HIST_END_GAME: game over and winner announcement -->
		<template v-else-if="entry[0] === rf.HIST_END_GAME">
			<div class="new_turn">{{ $t("history.gameOver") }}</div>
			<i18n-t keypath="history.winnerIs" tag="div" scope="global" class="new_turn">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][0]].colour)">{{ store.players[entry[3][0]].displayName }}</span></template>
			</i18n-t>
		</template>

		<!-- HIST_REMOVE_HC_MS: milestones removed by hardChoices -->
		<template v-else-if="entry[0] === rf.HIST_REMOVE_HC_MS">
			<span>{{ $t("history.milestonesRemoved") }}</span>
			<template v-for="(ms, i) in entry[1]" :key="i">
				<span class="fullMilestoneSpan milestoneHC2span" :class="rf.MILESTONES_STR[ms].type">
					<div class="milestoneTitle">{{ rf.MILESTONES_STR[ms].title.toUpperCase() }}</div>
					<div class="milestoneText">{{ rf.MILESTONES_STR[ms].description }}</div>
					<div class="milestoneSpacer">&nbsp;</div>
					<img class="milestoneIcon" :src="view.getImage(rf.MILESTONES_STR[ms].img)" :class="rf.MILESTONES_STR[ms].additionalClass ? rf.MILESTONES_STR[ms].additionalClass : ''" alt="" />
				</span>
			</template>
		</template>

		<!-- HIST_REWIND: game rewound by a player or admin -->
		<template v-else-if="entry[0] === rf.HIST_REWIND">
			<div class="rewind">{{ $t("history.rewindBy", { name: entry[1] >= 0 ? playerName(entry[1]) : $t("history.admin") }) }}</div>
		</template>

		<!-- HIST_RESIGN: player resigns from the game -->
		<template v-else-if="entry[0] === rf.HIST_RESIGN">
			<div class="rewind">{{ $t("history.resigns", { name: playerName(entry[1]) }) }}</div>
		</template>

		<!-- HIST_KICKOUT: player was kicked out of the game -->
		<template v-else-if="entry[0] === rf.HIST_KICKOUT">
			<div class="rewind">{{ $t("history.kickedOut", { name: playerName(entry[3][0]) }) }}</div>
		</template>

		<!-- HIST_BANK_BREAK: the bank was refilled -->
		<template v-else-if="entry[0] === rf.HIST_BANK_BREAK">
			<div>{{ $t("history.bankBroke", { amount: entry[3][0] }) }}</div>
		</template>

		<!-- HIST_BANKRUPT: a player went bankrupt -->
		<template v-else-if="entry[0] === rf.HIST_BANKRUPT">
			<div>{{ $t("history.bankrupted") }}</div>
		</template>

		<!-- HIST_TOTAL_BANKRUPT: all players went bankrupt, game over -->
		<template v-else-if="entry[0] === rf.HIST_TOTAL_BANKRUPT">
			<div>{{ $t("history.allBankrupt") }}</div>
		</template>

		<!-- HIST_ONE_LEFT: only one player left, game over -->
		<template v-else-if="entry[0] === rf.HIST_ONE_LEFT">
			<div>{{ $t("history.oneLeft") }}</div>
		</template>

		<!-- HIST_DISCOUNT_MILESTONE: bank reduced by First Discount Manager Used -->
		<template v-else-if="entry[0] === rf.HIST_DISCOUNT_MILESTONE">
			<div>{{ $t("history.discountMilestone") }}</div>
		</template>

		<!-- HIST_PIZZA_BOMB: First Pizza Sold triggers a free radio campaign -->
		<template v-else-if="entry[0] === rf.HIST_PIZZA_BOMB">
			<i18n-t keypath="history.pizzaBomb" tag="div" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #num>{{ computedEntry3.radioNum }}</template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- HIST_LOBBYIST_PARK: lobbyist places a park -->
		<template v-else-if="entry[0] === rf.HIST_LOBBYIST_PARK">
			<i18n-t keypath="history.lobbyistPark" tag="div" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #details>{{ computedEntry3.parkDetails }}</template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- HIST_LOBBYIST_ROAD: lobbyist places a road -->
		<template v-else-if="entry[0] === rf.HIST_LOBBYIST_ROAD">
			<i18n-t keypath="history.lobbyistRoad" tag="div" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #details>{{ computedEntry3.roadDetails }}</template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- HIST_NEW_TILE: a new map tile is added -->
		<template v-else-if="entry[0] === rf.HIST_NEW_TILE">
			<i18n-t keypath="history.addsTile" tag="span" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t> <img class="tileImg" :class="'r' + computedEntry3.tileRotation" :src="view.getImage(computedEntry3.tileImgKey)" alt="" />
		</template>

		<!-- HIST_COFFE_SHOP_BUILD: a coffee shop is built -->
		<template v-else-if="entry[0] === rf.HIST_COFFE_SHOP_BUILD">
			<i18n-t keypath="history.buildsCoffeeShop" tag="div" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- HIST_COFFE_SHOP_REMOVE: a coffee shop is removed -->
		<template v-else-if="entry[0] === rf.HIST_COFFE_SHOP_REMOVE">
			<i18n-t keypath="history.removesCoffeeShop" tag="div" scope="global">
				<template #name><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span></template>
				<template #x>{{ computedEntry3.Xcoord }}</template>
				<template #y>{{ computedEntry3.Ycoord }}</template>
			</i18n-t>
		</template>

		<!-- UNKNOWN: fallback for unrecognized history entries -->
		<template v-else>[history #{{ entry[0] }}]</template>
	</div>
</template>












<style scoped>
.log {
	direction: ltr;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 3px 45px 3px 3px;
	background-size: 40px 40px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
	cursor: pointer;
}

.log:hover {
	border-color: yellow;
}

.log.separator {
	padding: 3px;
}

.header {
	font-size: 0.8em;
}

h4 {
	text-align: center;
	margin: 4px 0;
}

.house {
	border-bottom: #000 1px solid;
}

.coffeeDiv {
	margin-top: 5px;
	padding-bottom: 5px;
	border-bottom: #000 1px solid;
}

table {
	width: 100%;
	border: #000 1px solid;
	border-collapse: collapse;
}

table td {
	border: #000 1px solid;
	text-align: center;
}

ul {
	margin: 2px 0;
	padding-left: 20px;
}

li {
	margin: 1px 0;
}

span.compact {
	font-weight: bold;
	padding: 2px 5px;
	margin: 2px;
	display: inline-block;
	cursor: default;
	color: #000;
}

.pricing {
	background-color: #f8a48c;
}

.hiring {
	background-color: #beb6b4;
}

.food {
	background-color: #8fa960;
}

.drink {
	background-color: #a4cf8a;
}

.restaurant {
	background-color: #b8312d;
}

.manager {
	background-color: #241e20;
	color: #fff;
}

.marketer {
	background-color: #87c2c8;
}

.waitress {
	background-color: #b492c4;
}

.delivery {
	background-color: #e98d2a;
}

.compact.inverted {
	color: #fff;
}

img.foodTokenImg {
	width: 25px;
	vertical-align: middle;
	margin: 1px 1px;
}

img.dinnerGoodsImg {
	height: 30px;
	width: auto !important;
}

img.playerImage {
	width: 30px;
	vertical-align: middle;
}

img.cardImg {
	width: 80px;
	margin: 2px;
	vertical-align: middle;
	border-radius: 5px;
}

.new_turn {
	background-color: #000;
	text-align: center;
	color: #fff;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.newTurnBank {
	font-size: 0.8em;
}

.newTurnBank img {
	vertical-align: middle;
}

.rewind {
	background-color: #d4eafd;
	text-align: center;
	color: #000;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

img.tileImg {
	width: 100px;
	vertical-align: middle;
}

.r1 {
	transform: rotate(90deg);
}

.r2 {
	transform: rotate(180deg);
}

.r3 {
	transform: rotate(270deg);
}

.fullMilestoneSpan {
	display: inline-block;
	vertical-align: middle;
	width: 120px;
	height: 120px;
	margin: 10px;
	border-radius: 10px;
	position: relative;
	z-index: 1;
}

.milestoneTitle {
	height: 22px;
	margin: 2px;
	padding: 2px;
	font-family: gonzo;
	font-size: 11px;
	text-align: center;
	position: relative;
	z-index: 10;
}

.milestoneText {
	height: 70px;
	margin: 2px;
	padding: 2px;
	font-size: 13px;
	text-align: center;
	position: relative;
	z-index: 10;
}

.milestoneSpacer {
	height: 5px;
	font-size: 4px;
}

.milestoneIcon {
	position: absolute;
	width: 60px;
	bottom: -13px;
	right: -13px;
	z-index: 5;
	border-bottom: none;
}

img.milestoneIcon.cart {
	bottom: 0;
	right: 0;
}

img.milestoneIcon.billboard {
	bottom: -19px;
	width: 50px;
}

img.milestoneIcon.vertical {
	width: 40px;
}

img.milestoneIcon.house {
	width: 80px;
}

img.milestoneIcon.higher {
	bottom: -5px;
}

img.milestoneIcon.trainer {
	bottom: -15px;
}

img.milestoneIcon.smaller {
	width: 50px;
}

img.milestoneIcon.plane {
	width: 110px;
	bottom: -12px;
}

.milestoneHC2span {
	border: 1px solid red;
}

.foodTokenThin {
	width: 12px !important;
}

.foodTokenMed {
	width: 17px !important;
}
</style>

