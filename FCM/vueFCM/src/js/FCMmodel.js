import * as rf from "./FCMreference"
import * as controller from "./FCMcontroller"
import * as map from "./FCMmap"
import * as funcs from "./FCMfuncs"
import * as rules from "./FCMrules"
import * as context from "./FCMcontext"
import * as IO from "../backend/FCM_IO"
import * as WS from "../backend/FCMwebsocket"
import * as plyr from "./FCMplayer"
import * as replay from "./FCMreplay"
import * as view from "./FCMview"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal"
import i18n from "../i18n"

export async function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true

	// set up starting options
	if (window.initData.startingOptions) {
		setInternalStartingOptions(window.initData.startingOptions)
		// Seed the raw list so draft UI / module list survive a reload
		store.externalStartingOptions.splice(0)
		for (const opt of window.initData.startingOptions) store.externalStartingOptions.push(parseInt(opt, 10))
	}
	store.startingOptionsHTML = window.initData.startingOptionsHTML || ""

	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	personal.finishedGame = window.initData.finishedGame
	if (window.initData.startingOptions && window.initData.startingOptions.includes(rf.SO_TRAINING_GAME)) {
		personal.trainingGame = true
	}
	//store.refSize = window.initData.myZoomLevel
	store.refSize = 200
	personal.liveWS = false
	// Set up logged in player, but not involved
	if (window.initData.pov === -9 || window.initData.pov === -1 || window.initData.pov >= 0) {
		personal.name = window.initData.name || "Guest"
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		personal.latestUpdate = window.initData.latestUpdate
	}

	// 1. Get the string from the script tag
	const gameData = window.initData.gameData
	// If NOT your game, and NO game data, then game hasn't started
	if (window.initData.pov < 0 && gameData === "") {
		// Create the <h1> element
		var heading = document.createElement("h1")
		// Set the text content of the <h1> element
			heading.textContent = i18n.global.t("FCM_IO.gameNotStarted")
		// Get a reference to the body element
		var body = document.body
		// Append the <h1> element to the body
		body.appendChild(heading)
		return
	}

	personal.pov = window.initData.pov
	// Set up rewind panel data (outside pov gate so super users who aren't players still see it)
	if (window.initData.currentRewindConsent) personal.currentRewindConsent = window.initData.currentRewindConsent
	if (window.initData.rewindPanelType) store.viewSettings.rewindPanelType = window.initData.rewindPanelType
	store.viewSettings.rewindHostPossible = window.initData.rewindHostPossible
	if (window.initData.rewindHostHTML) store.viewSettings.rewindHostHTML = window.initData.rewindHostHTML
	// Set up Involved Player data
	if (personal.pov >= 0) {
		personal.liveWS = true
		if (window.initData.preferedColor > -1) personal.preferredColour = window.initData.preferedColor
		personal.secondsToNextKickout = window.initData.secondsToNextKickout
		// Set up kickout timer / kickout options
		if (personal.kickoutCountdownIntervalTimer != null) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.flexiKickoutCountdownIntervalTimer != null) clearInterval(personal.flexiKickoutCountdownIntervalTimer)
		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
				if (personal.finishedGame) funcs.importFCMmodel(window.initData.gameData, true)
				else funcs.importFCMmodel(window.initData.gameData, false)
				let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
				let secondsIn24Hours = 24 * 60 * 60
				let playerSeconds = 0

				// Iterate over the KickoutFlexiDataArray to find the player's entry
				for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
					let entry = KickoutFlexiDataArray[i]

					// Check if the entry is a length-2 array and the first element matches the playerName
					if (Array.isArray(entry) && entry.length === 2 && entry[0] === controller.currentPlayerObj().name) {
						playerSeconds = entry[1]
						break
					}
				}
				let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
				personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout
				personal.flexiKickoutCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
			}
		}
		// Start standard kickout timer if within last 20 minutes
		if (personal.secondsToNextKickout <= 1200) {
			personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)
		}
		// Load kickout vote data
		if (window.initData.kickoutVotesData) store.kickoutVotesData = typeof window.initData.kickoutVotesData === "string" ? JSON.parse(window.initData.kickoutVotesData) : window.initData.kickoutVotesData
		store.kickoutVoteThreshold = window.initData.kickoutVoteThreshold
		personal.notes = funcs.htmlUnescape(window.initData.notes)

		if (window.initData.chatNotification) store.viewSettings.showChat = true
		personal.yourTurnAudioType = window.initData.yourTurnAudioType
		// Set up and save new game if there's no data
		if (gameData === "") {
			/************************* SETUP GAME *************************/
			if (window.initData.startingMap.length > 0) {
				store.mapData.tiles = window.initData.startingMap
			} else {
				store.mapData.tiles = map.generateRandomMap(window.initData.playerNames.length)
			}
			map.initCoords()
			view.setMapDisplayTiles()

			let displayNamesArr = window.initData.displayNames || ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]

			let COLOURS = funcs.shuffle([rf.FRIED_GEESE_DONKEY, rf.GLUTTONY_INC, rf.DUCK_DINER, rf.SANTA_MARIA_PIZZA, rf.XANGO_BLUES, rf.SIAP_FAJI])

			store.players.splice(0)
			for (let i = 0; i < window.initData.playerNames.length; i++) {
				store.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],

					restaurants: [],
					money: 0,
					bankrupt: false,
					employees: [],
					beach: [],
					milestones: [],
					marketers: [],
					resources: [],
					additionalCampaignArrayIndex: -1,
					additionalMarketedGood: [], //[store.context.campaign, store.context.secondGood],
					coffeeShops: [],
					ceoSlots: 3, // NB this is exported separately as a global entry
					ceoAction: rf.CEO_ACTION_HIRE_1,
					OOBpreference: 0, // Only used to store result of checkboz, then compressed into moveData
				})
				// Add a reserve card space
				store.reserveCards.push(-1)
			} // End looping and inserting player names

			// Now insert display names
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].name === "SHADOW" && displayNamesArr.length > 0) store.players[i].displayName = displayNamesArr[0]
				else if (store.players[i].name === "SHADOW_2" && displayNamesArr.length > 1) store.players[i].displayName = displayNamesArr[1]
				else if (store.players[i].name === "SHADOW_3" && displayNamesArr.length > 2) store.players[i].displayName = displayNamesArr[2]
				else if (store.players[i].name === "SHADOW_4" && displayNamesArr.length > 3) store.players[i].displayName = displayNamesArr[3]
				else if (store.players[i].name === "SHADOW_5" && displayNamesArr.length > 4) store.players[i].displayName = displayNamesArr[4]
				else store.players[i].displayName = store.players[i].name
			}

			// Set up gameflow
			store.gameflow.turn = 0
			store.gameflow.fullTurnOrder = store.players.map((_, index) => index)
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			store.gameflow.phase = rf.PHASE_SETUP_RESTAURANT1
			store.gameflow.subphase = rf.SUBPHASE_HIRING
			store.gameflow.newTurnOrder = []

			if (store.startingOptions.draftModules) store.gameflow.phase = rf.PHASE_SETUP_MODULES
			if (store.startingOptions.urbanPlanning || store.startingOptions.urbanPlanningPlus) store.gameflow.phase = rf.PHASE_URBAN_PLANNING

			store.availableMarketingCampaigns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]
			if (store.players.length > 2) store.availableMarketingCampaigns.push(12)
			if (store.players.length > 3) store.availableMarketingCampaigns.push(15)
			if (store.players.length > 4) store.availableMarketingCampaigns.push(16)

			store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]

			if (store.players.length < 5) {
				let max = maxUnique(store.players.length)
				for (let i = 0; i < rf.BASE_UNIQUE_CARDS.length; i++) {
					store.availableEmployees[rf.BASE_UNIQUE_CARDS[i]] = max
				}
			}

			if (store.startingOptions.useMilestones === false) {
				store.availableMilestones = []
			} else {
				store.availableMilestones = rf.BASE_GAME_MILESTONES.concat([])
				if (store.startingOptions.noCeoMilestone === true) {
					store.availableMilestones.splice(store.availableMilestones.indexOf(rf.FIRST_100_DOL), 1)
				}
				if (store.startingOptions.noRadioMilestone === true) {
					store.availableMilestones.splice(store.availableMilestones.indexOf(rf.FIRST_RADIO_CAMPAIGN), 1)
				}
			}

			if (store.startingOptions.shortGame === true) store.bank = store.players.length * 75
			else store.bank = store.players.length * 50

			let to = []
			for (let i = 0; i < store.players.length; to[i] = i++);

			store.ceoLevel = 3
			store.reserveCards = Array.from({ length: store.players.length }, () => -1)

			// INTERNAL OPTIONS NEED TO BE SET BEFORE THIS
			setupKetchupExpansion(store.players.length)

			let pInfos = []
			for (let i = 0; i < store.players.length; i++) {
				pInfos.push(store.players[i].name)
			}

			addHistory(rf.HIST_SETUP_GAME, [], -1, 0)

			if (store.mapData.tiles.indexOf(20) > -1) {
				let rotated = 0
				if (store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] === 1 || store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] === 3) rotated = 1
				let index = map.findIndexForHouse(25)
				addHouse(25, index, rotated)
			}

			personal.haltPlay = true
			await IO.saveGameNormal(true, false, false)
		} // End NEW GAME
	} // end involved player

	// If there is load data, then load it
	if (gameData !== "") {
		// FInally, impport data
		if (personal.finishedGame) {
			funcs.importFCMmodel(gameData, true)
		} else funcs.importFCMmodel(gameData, false)

		context.clearAllHighlights()
		// Import move data if present
		if (window.initData.moveData !== "") {
			personal.moveDataRaw = window.initData.moveData
		}
		// If you have a move, import that too for the visuals
		//IO.loadCurrentMove()
		// Add expert panel for working day NOT your turn
		// You must be involved, have moved, and not be able to play
		if (store.gameflow.phase >= rf.PHASE_WORKING_DAY && window.initData.moveData !== "") {
			let decompressedData = funcs.decompressData(window.initData.moveData)
			if (decompressedData[0] !== window.initData.name) {
				alert(i18n.global.t("alerts.nameMatchError"))
			} else {
				store.context.preMoveData = decompressedData[3]
				// Restore autoFridge from preMoveData cleanup skip flag
				if (personal.pov >= 0 && store.context.preMoveData[1] && store.context.preMoveData[1][0] === -1) {
					store.players[personal.pov].autoFridge = 1
				}
			}
		} else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING && window.initData.moveData !== "") {
			let decompressedData = funcs.decompressData(window.initData.moveData)
			if (decompressedData[0] !== window.initData.name) {
				alert(i18n.global.t("alerts.nameMatchError"))
			} else {
				store.players[personal.pov].beach = [...decompressedData[3][0]]
				store.players[personal.pov].employees = [...decompressedData[3][1]]
				if (decompressedData[3][2]) store.players[personal.pov].OOBpreference = decompressedData[3][2]
				else store.players[personal.pov].OOBpreference = 0
			}
		}

		// get current players
		if (controller.isSimulPhase()) {
			// rebuild the turnOrder from the names
			let currentNames = window.initData.currentPlayers
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < currentNames.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (currentNames[i] === store.players[j].name) store.gameflow.turnOrder.push(j)
				}
			}
		}

		// Go to replay mode if requested
		if (window.initData.spoilerFree) {
			// Enter replay mode at step 1
			store.viewSettings.showReplay = true
			store.replayResetData = funcs.exportFCMmodel(true) // FIZ

			// TURM ON
			await replay.generateReplayData(true)
		}
	}

	// start WS
	if (window.initData.pov >= -9) {
		WS.StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}
	// Allow play
	personal.haltPlay = false
	// This must be the last item
	if (personal.canPlay()) controller.startPlayerTurn()
} // end initGame

export function setInternalStartingOptions(startingOptionsArray) {
	const store = useModelStore()
	if (startingOptionsArray.length === 0) return

	const opts = startingOptionsArray.map(Number)

	for (let i = 0; i < opts.length; i++) {
		if (opts[i] === rf.SO_SHORT_GAME) store.startingOptions.shortGame = true
		if (opts[i] === rf.SO_NO_MILESTONES) store.startingOptions.useMilestones = false
		if (opts[i] === rf.SO_NO_CEO_MILESTONE) store.startingOptions.noCeoMilestone = true
		if (opts[i] === rf.SO_ALLOW_SURRENDER) store.startingOptions.allowSurrender = true
		if (opts[i] === rf.SO_NO_RADIO_MILESTONE) store.startingOptions.noRadioMilestone = true
		if (String(opts[i]).length > 2 && String(opts[i])[0] === "7") alert(i18n.global.t("alerts.unknownStartingOption"))

		if (opts[i] === rf.SO_HARD_CHOICES) store.startingOptions.hardChoices = true
		if (opts[i] === rf.SO_FRY_CHEFS) store.startingOptions.fryChefs = true
		if (opts[i] === rf.SO_KIMCHI) store.startingOptions.kimchi = true
		if (opts[i] === rf.SO_SUSHI) store.startingOptions.sushi = true
		if (opts[i] === rf.SO_NOODLES) store.startingOptions.noodles = true
		if (opts[i] === rf.SO_GOURMET) store.startingOptions.gourmet = true
		if (opts[i] === rf.SO_MOVIE_STARS) store.startingOptions.movieStars = true
		if (opts[i] === rf.SO_MASS_MARKETERS) store.startingOptions.massMarketers = true
		if (opts[i] === rf.SO_NIGHT_SHIFT) store.startingOptions.nightShift = true
		if (opts[i] === rf.SO_RURAL_MARKETERS) store.startingOptions.ruralMarketers = true
		if (opts[i] === rf.SO_NEW_DISTRICTS) store.startingOptions.newDistricts = true
		if (opts[i] === rf.SO_NEW_DISTRICTS_APP) store.startingOptions.newDistrictsApp = true
		if (opts[i] === rf.SO_NEW_DISTRICTS_ALL) store.startingOptions.newDistrictsAll = true
		if (opts[i] === rf.SO_NEW_DISTRICTS_PARK) store.startingOptions.newDistrictsPark = true
		if (opts[i] === rf.SO_COFFEE) store.startingOptions.coffee = true
		if (opts[i] === rf.SO_KETCHUP_MS) store.startingOptions.ketchupMilestone = true
		if (opts[i] === rf.SO_NEW_MS) store.startingOptions.newMilestones = true
		if (opts[i] === rf.SO_LOBBYISTS) store.startingOptions.lobbyists = true
		if (opts[i] === rf.SO_RESERVE_PRICE) store.startingOptions.reservePrice = true
		// Chinese Expansion
		if (opts[i] === rf.SO_URBAN_PLANNING) store.startingOptions.urbanPlanning = true
		if (opts[i] === rf.SO_URBAN_PLANNING_PLUS) store.startingOptions.urbanPlanningPlus = true
		if (opts[i] === rf.SO_JAZZ_MUSICIANS) store.startingOptions.jazzMusicians = true
		if (opts[i] === rf.SO_DUMPLINGS) store.startingOptions.dumplings = true
		if (opts[i] === rf.SO_DELIVERY_DRIVERS) store.startingOptions.deliveryDrivers = true
		if (opts[i] === rf.SO_HAWKERS) store.startingOptions.hawkers = true

		if (opts[i] === rf.SO_STRICT_PAYDAY_FRIDGE) store.startingOptions.strictPaydayFridge = true
		if (opts[i] === rf.SO_TRAINING_GAME) store.startingOptions.trainingGame = true
		if (opts[i] === rf.SO_SANDBOX_MODE) store.startingOptions.sandboxMode = true

		if (opts[i] === rf.SO_DRAFT_MODULES) store.startingOptions.draftModules = true
		// 300 marks draft-module mode; flags for options AFTER 300 (already-drafted
		// modules like lobbylist/coffee) must still apply — stopping here made
		// export/include-lobby-tiles disagree with import on reload
		if (opts[i] === rf.SO_DRAFT_MODULE_BREAKER) store.startingOptions.draftModules = true
	}
}

export function maxUnique(playerNumber) {
	let max = 3
	if (playerNumber === 4) max = 2
	if (playerNumber < 4) max = 1
	return max
}

export function setupKetchupExpansion(playerNumber) {
	const store = useModelStore()
	let max = maxUnique(playerNumber)
	let additionalLuxuriesManagerAdded = false

	if (store.startingOptions.fryChefs) {
		store.availableEmployees[rf.FRY_CHEF] = 6
	}
	if (store.startingOptions.kimchi) {
		store.availableEmployees[rf.KIMCHI_MASTER] = max
		store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
	}
	if (store.startingOptions.sushi) {
		store.availableEmployees[rf.SUSHI_COOK] = 6
		store.availableEmployees[rf.SUSHI_CHEF] = max
		if (!additionalLuxuriesManagerAdded) store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
	}
	if (store.startingOptions.noodles) {
		store.availableEmployees[rf.NOODLE_COOK] = 6
		store.availableEmployees[rf.NOODLE_CHEF] = max
		if (!additionalLuxuriesManagerAdded) store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
	}
	if (store.startingOptions.newMilestones) {
		store.availableMilestones = rf.KETCHUP_NEW_MILESTONES.concat([])
	}
	if (store.startingOptions.newDistricts) {
		// Don't need to do anything, as it's setup with the map
	}
	if (store.startingOptions.lobbyists) {
		store.availableEmployees[rf.LOBBYIST] = 6
		if (store.startingOptions.useMilestones) store.availableMilestones.push(rf.FIRST_LOBBYIST_USED)
	}
	if (store.startingOptions.coffee) {
		store.availableEmployees[rf.BARISTA_TRAINEE] = 12
		store.availableEmployees[rf.BARISTA] = 6
		store.availableEmployees[rf.LEAD_BARISTA] = max
		//store.availableEmployees[LUXURIES_MANAGER]++;
		if (!additionalLuxuriesManagerAdded) store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
		if (store.startingOptions.useMilestones) store.availableMilestones.push(rf.FIRST_COFFEE_SOLD)
	}
	if (store.startingOptions.ketchupMilestone) {
		store.availableMilestones.push(rf.SOMEONE_SELLS_YOUR_DEMAND)
	}
	if (store.startingOptions.nightShift) {
		store.availableEmployees[rf.NIGHT_SHIFT_MANAGER] = max
	}
	if (store.startingOptions.massMarketers) {
		store.availableEmployees[rf.MASS_MARKETEER] = 6
	}

	if (store.startingOptions.ruralMarketers) {
		store.availableEmployees[rf.RURAL_MARKETEER] = 6
		store.availableMilestones.push(rf.FIRST_RURAL_MARKETEER_USED)
		store.availableMarketingCampaigns.push(21, 22, 23, 24)
	}
	if (store.startingOptions.gourmet) {
		store.availableEmployees[rf.GOURMET_FOOD_CRITIC] = 6
		store.availableMarketingCampaigns.push(17, 18, 19, 20)
	}
	if (store.startingOptions.movieStars) {
		store.availableEmployees[rf.B_MOVIE_STAR] = 1
		if (store.players.length >= 4) store.availableEmployees[rf.C_MOVIE_STAR] = 1
		if (store.players.length >= 5) store.availableEmployees[rf.D_MOVIE_STAR] = 1
	}
	if (store.startingOptions.jazzMusicians) store.availableEmployees[rf.JAZZ_MUSICIAN] = 6
	if (store.startingOptions.dumplings) {
		store.availableEmployees[rf.DUMPLING_COOK] = 6
		store.availableEmployees[rf.DUMPLING_CHEF] = max
		if (store.startingOptions.useMilestones) store.availableMilestones.push(rf.FIRST_DUMPLING_SOLD)
	}
	if (store.startingOptions.deliveryDrivers) store.availableEmployees[rf.DELIVERY_DRIVER] = 6
	if (store.startingOptions.hawkers) {
		store.availableEmployees[rf.HAWKER_MARKETEER] = 6
		store.availableMarketingCampaigns.push(25, 26, 27)
	}
}

export function findPlayerForCampaign(number) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].marketers.length; j++) {
			if (store.players[i].marketers[j].campaign === number) return i
		}
	}
	return -1
}

export function addMarketingCampaign(number, index, rotated, good, duration) {
	//}, nightShift) {
	const store = useModelStore()
	store.campaigns.push({
		number: number,
		index: index,
		rotated: rotated,
		good: good,
		duration: duration,
		//nightShift: nightShift,
	})
	store.availableMarketingCampaigns.splice(store.availableMarketingCampaigns.indexOf(number), 1)

	if (rf.MARKETING_CAMPAIGNS[number].type != rf.GOURMET_GUIDE && rf.MARKETING_CAMPAIGNS[number].type != rf.HAWKER_TRUCK) {
		map.addElement(rf.TYPE_CAMPAIGN, number, index, rotated)
	}

	// RM WAS AWARDED HERE
}

export function shouldActionCoffeeShops() {
	const store = useModelStore()
	if (!store.startingOptions.coffee) return false
	store.context.baristaCoffeeShops = 0
	store.context.leadBaristaCoffeeShopsFromB = 0
	store.context.leadBaristaCoffeeShopsFromTB = 0
	for (let i = 0; i < store.context.justTrained.length; i++) {
		if (store.context.justTrained[i].to === rf.LEAD_BARISTA) {
			// if you trained up twice you get both coffee shops
			if (store.context.justTrained[i].spent === 2) {
				store.context.baristaCoffeeShops++
				store.context.leadBaristaCoffeeShopsFromTB++
			} else store.context.leadBaristaCoffeeShopsFromB++
		} else if (store.context.justTrained[i].to === rf.BARISTA) {
			store.context.baristaCoffeeShops++
		}
	}
	if (store.context.baristaCoffeeShops + store.context.leadBaristaCoffeeShopsFromB + store.context.leadBaristaCoffeeShopsFromTB > 0) return true
	return false
}

export function addCoffeeShop(playerIndex, index) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	player.coffeeShops.push(index)
	map.addElement(rf.TYPE_COFFEE_SHOP, player.colour, index, false)
}

export function removeCoffeeShop(playerIndex, index) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	player.coffeeShops = player.coffeeShops.filter((value) => value !== index)
	map.addElement(rf.TYPE_COFFEE_SHOP, player.colour, index, false, true)
}

export function addFreeway(index, rotated, sides) {
	const store = useModelStore()
	store.freeways.push({
		index: index,
		rotated: rotated,
		sides: sides,
	})
	map.addFreeway(index, rotated, sides)
}

export function addPark(index, variety, rotation, flipped, parkModel) {
	const store = useModelStore()
	store.parks.push({
		index: index,
		variety: variety,
		rotation: rotation,
		flipped: flipped,
	})
	map.addPark(index, parkModel)
}

export function addNewRoad(index, variety, rotation, turnAdded) {
	const store = useModelStore()
	store.newRoads.push({
		index: index,
		variety: variety,
		rotation: rotation,
		turnAdded: turnAdded,
	})
	map.addNewRoad(index, variety, rotation, store.gameflow.turn === turnAdded)
}

export function removeMarketingCampaign(number) {
	const store = useModelStore()

	// 1. Find the campaign
	const campaign = store.campaigns.find((c) => c.number === number)

	if (!campaign) return // Guard clause if campaign doesn't exist

	// 2. Remove the campaign
	store.campaigns = store.campaigns.filter((c) => c.number !== number)

	// 3. Update store and sort
	store.availableMarketingCampaigns.push(number)
	store.availableMarketingCampaigns.sort((a, b) => a - b)

	// 4. Update map
	map.addElement(rf.TYPE_CAMPAIGN, number, campaign.index, campaign.rotated, true)
}

export function addRestaurant_core(playerIndex, index, rotation, open) {
	const store = useModelStore()
	plyr.addRestaurantToPlayer(playerIndex, index, rotation, open)
	map.addElement(rf.TYPE_RESTAURANT, store.players[playerIndex].colour, index, false)
}

export function addRestaurant(playerIndex, index, rotation, open) {
	const store = useModelStore()
	addRestaurant_core(playerIndex, index, rotation, open)

	// Add History
	if (store.context.rotation !== 3) addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION, [funcs.exportIndex(index), store.context.rotation], controller.currentPlayerIndex(), 0)
	else addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION, [funcs.exportIndex(index)], controller.currentPlayerIndex(), 0)
}

export function removeRestaurant(playerIndex, index) {
	const store = useModelStore()
	store.players[playerIndex].restaurants = store.players[playerIndex].restaurants.filter((r) => r.index !== index)
	map.addElement(rf.TYPE_RESTAURANT, store.players[playerIndex].colour, index, false, true)
}

export function addGarden(index, rotated, house) {
	const store = useModelStore()
	store.gardens.push({
		index: index,
		rotated: rotated === true,
		house: house,
	})

	map.addElement(rf.TYPE_GARDEN, -1, index, rotated === true)
}

export function addHouse(number, index, rotated) {
	const store = useModelStore()
	store.houses.push({
		number: number,
		index: index,
		rotated: rotated,
	})

	map.addElement(rf.TYPE_HOUSE, number, index, rotated)
}

export function addNeedToHouse(good, house, ownerIndex) {
	const store = useModelStore()

	// 1. Find the house
	let houseObj = store.needs.find((houseNeed) => houseNeed.number === house)

	// 2. If not found, create it and add to the list
	if (!houseObj) {
		houseObj = { number: house, needs: [] }
		store.needs.push(houseObj)
	}

	// 3. Ensure the needs array exists (defensive check)
	houseObj.needs = houseObj.needs || []

	// 4. Push the new data
	houseObj.needs.push([good, ownerIndex])
}

export function findHouse(number) {
	const store = useModelStore()
	// 1. Search existing houses
	let res = store.houses.find((h) => h.number === number)

	// 2. If found, return immediately
	if (res) return res

	// 3. Fallback: Search board houses if not found in current houses
	if (rf.BOARD_HOUSES.includes(number)) {
		const t = map.findIndexForHouse(number)

		if (t > -1) {
			return {
				number: number,
				index: t,
				natural: true,
			}
		}
	}

	// 4. Return -1 if no house or apartment was found
	return -1
}

export function findApartment(number) {
	if (number === 3.2 || number === 9.7) {
		let t = map.findIndexForApartment(number)
		let res = {
			number: number,
			index: t,
		}
		return res
	}
	return -1
}

function isOffBoardItem(val) {
	return val === rf.FREEWAY || (val >= 130 + rf.AIRPLANE && val <= 130 + 6)
}

function getUsedBounds() {
	const [usedRows, usedCols] = map.getUsedRowCol()
	if (usedRows.length === 0 || usedCols.length === 0) return null
	return {
		colStart: usedCols[0] * 5,
		colEnd: (usedCols[usedCols.length - 1] + 1) * 5,
		rowStart: usedRows[0] * 5,
		rowEnd: (usedRows[usedRows.length - 1] + 1) * 5,
	}
}

export function isItemOnLeftOfBoard() {
	const store = useModelStore()
	const coords = store.mapData.coords
	const b = getUsedBounds()
	if (!b) return false
	const ssW = rf.ssW
	for (let r = b.rowStart; r < b.rowEnd; r++) {
		for (let c = b.colStart - 5; c < b.colStart; c++) {
			if (c < 0) continue
			if (isOffBoardItem(coords[r * ssW + c])) return true
		}
	}
	return false
}

export function isItemOnRightOfBoard() {
	const store = useModelStore()
	const coords = store.mapData.coords
	const b = getUsedBounds()
	if (!b) return false
	const ssW = rf.ssW
	for (let r = b.rowStart; r < b.rowEnd; r++) {
		for (let c = b.colEnd; c < b.colEnd + 5; c++) {
			if (c >= ssW) continue
			if (isOffBoardItem(coords[r * ssW + c])) return true
		}
	}
	return false
}

export function isItemOnTopOfBoard() {
	const store = useModelStore()
	const coords = store.mapData.coords
	const b = getUsedBounds()
	if (!b) return false
	const ssW = rf.ssW
	for (let r = b.rowStart - 5; r < b.rowStart; r++) {
		if (r < 0) continue
		for (let c = b.colStart; c < b.colEnd; c++) {
			if (isOffBoardItem(coords[r * ssW + c])) return true
		}
	}
	return false
}

export function isItemOnBottomOfBoard() {
	const store = useModelStore()
	const coords = store.mapData.coords
	const b = getUsedBounds()
	if (!b) return false
	const ssW = rf.ssW
	for (let r = b.rowEnd; r < b.rowEnd + 5; r++) {
		if (r >= rf.ssH) continue
		for (let c = b.colStart; c < b.colEnd; c++) {
			if (isOffBoardItem(coords[r * ssW + c])) return true
		}
	}
	return false
}

export function alreadyChosenReserveCard() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (store.reserveCards[personal.pov] !== -1) return true
	return false
}

export function clearForNewTurn() {
	const store = useModelStore()
	const { turn } = store.gameflow

	store.firstPizzas.length = 0
	store.coffeeShopMSplayers.length = 0

	// 1. Efficiently collect milestones using flatMap and forEach
	const usedMilestonesArray = []
	store.players.forEach((playerObj, playerIndex) => {
		plyr.clearForNewTurn(playerIndex)
		if (playerObj.milestones) {
			usedMilestonesArray.push(...playerObj.milestones)
		}
	})

	// 2. Handle Hard Choices / New Milestones logic
	const removedHC = []
	if (store.startingOptions.hardChoices) {
		if (turn === 2) removedHC.push(...rf.HC_OLD_MS_LEAVE_END_TURN_2)
		if (turn === 3) removedHC.push(...rf.HC_OLD_MS_LEAVE_END_TURN_3)
	} else if (store.startingOptions.newMilestones && turn === 2) {
		removedHC.push(...rf.HC_NEW_MS_LEAVE_END_TURN_2)
	}
	if (removedHC.length > 0) usedMilestonesArray.push(...removedHC)

	// 3. Optimized "Difference": Using a Set for O(1) lookups
	const usedSet = new Set(usedMilestonesArray)
	store.availableMilestones = store.availableMilestones.filter((ms) => !usedSet.has(ms))

	// 4. Update roads (Optimized loop)
	for (let i = 0; i < store.mapData.coords.length; i++) {
		if (store.mapData.coords[i] === rf.ROAD_UC) store.mapData.coords[i] = rf.ROAD
	}

	// 5. Reset context arrays (using .length = 0 is slightly faster than .splice(0))
	store.context.justHired.length = 0
	store.context.justTrained.length = 0
	store.context.justCoffeeShopped.length = 0
	store.context.justMarketed.length = 0

	context.resetJustProduced()

	store.context.remainingProducers.length = 0
	store.context.justBuilt.length = 0
	store.context.justLobbied.length = 0
	store.context.justOpened.length = 0
}

// Door squares for one player's open restaurants.
// Drive-in → all 4 rotations; otherwise just the restaurant's current rotation.
export function giveRestaurantDoorIndices(playerIndex, { openOnly = true } = {}) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (!playerObj) return []

	const hasDriveIn = plyr.doesPlayerHaveDriveIn(playerIndex)
	const res = []

	for (const resto of playerObj.restaurants) {
		if (openOnly && !resto.open) continue

		const rotationStart = hasDriveIn ? 0 : resto.rotation
		const rotationEnd = hasDriveIn ? 4 : resto.rotation + 1

		for (let rotation = rotationStart; rotation < rotationEnd; rotation++) {
			res.push(resto.index + rules.getOffsetForRotation(rotation))
		}
	}

	return res
}

// This is literally the square OF the entrace / coffee shop
export function giveAllPlayerRestaurantEntrances(withCoffeeShops) {
	const store = useModelStore()
	const res = []

	for (let i = 0; i < store.players.length; i++) {
		const player = store.players[i]

		for (const index of giveRestaurantDoorIndices(i)) {
			res.push({ playerIndex: i, colour: player.colour, index })
		}

		if (withCoffeeShops && store.startingOptions.coffee && player.coffeeShops.length > 0) {
			for (const index of player.coffeeShops) {
				res.push({ playerIndex: i, colour: player.colour, index })
			}
		}
	}

	return res
}

export function giveCurrentPlayerRestaurantEntrances(withCS) {
	const store = useModelStore()
	const res = []

	const playerObj = controller.currentPlayerObj()
	if (!playerObj) return res

	const colour = playerObj.colour

	for (const index of giveRestaurantDoorIndices(controller.currentPlayerIndex())) {
		res.push({ colour, index })
	}

	if (withCS && store.startingOptions.coffee && playerObj.coffeeShops.length > 0) {
		for (const index of playerObj.coffeeShops) {
			res.push({ colour, index })
		}
	}

	return res
}

export function getSinglePlayerRestaurantEntrances(playerIndex) {
	return giveRestaurantDoorIndices(playerIndex)
}

export function getAvailableCoffee(returnArray) {
	const store = useModelStore()
	let availableCoffee = [0, 0, 0, 0, 0, 0]
	for (let i = 0; i < store.players.length; i++) {
		availableCoffee[store.players[i].colour] = plyr.getCoffeeAmountForPlayer(i)
	}

	if (returnArray) return availableCoffee
	const sum = availableCoffee.reduce((partialSum, a) => partialSum + a, 0)
	if (sum > 0) return true
	return false
}

// number = house / apartment / RMA number
export function getCoffeeRoute(number, playerIndex, winningRange) {
	const store = useModelStore()
	const playerColour = store.players[playerIndex].colour
	const restaurantSquares = getSinglePlayerRestaurantEntrances(playerIndex)
	const index = map.findIndexForHouse(number)
	let zone = []

	// 1. Zone Calculation
	if (number !== rf.RURAL_MARKETING_AREA) {
		zone = [index + 1, index + rf.ssW, index + rf.ssW + 1]
	}

	if (hasGarden(number)) {
		if (!rf.BOARD_HOUSES.includes(number)) {
			const house = store.houses.find((h) => h.number === number)
			if (house && (house.rotated === 1 || house.rotated === 3)) {
				zone.push(index + 2, index + rf.ssW + 2)
			} else {
				zone.push(index + 2 * rf.ssW, index + 2 * rf.ssW + 1)
			}
		} else {
			const g = store.gardens.find((garden) => garden.house === number)
			if (g) {
				const gIdx = g.index
				if (gIdx === index - 1) zone.push(index - 1, index + rf.ssW - 1)
				else if (gIdx === index + 2) zone.push(index + 2, index + rf.ssW + 2)
				else if (gIdx === index - rf.ssW) zone.push(index - rf.ssW, index - rf.ssW + 1)
				else if (gIdx === index + 2 * rf.ssW) zone.push(index + 2 * rf.ssW, index + 2 * rf.ssW + 1)
			}
		}
	}

	if (rf.APARTMENTS.includes(number)) {
		zone.push(index + 2, index + rf.ssW + 2, index + 2 * rf.ssW, index + 2 * rf.ssW + 1, index + 2 * rf.ssW + 2)
	}

	if (number === rf.RURAL_MARKETING_AREA && store.freeways.length > 0) {
		zone = map.getRuralMarketingSigns()
	}
	if (index !== -1) zone.push(index)

	// 2. Generate and Filter Routes (Subset logic optimized)
	let possibleRoutes = []
	for (const space of zone) {
		possibleRoutes.push(...map.getCoffeeRoutesFromBldgSquare(space, restaurantSquares, winningRange))
	}

	const checker = (arr, target) => target.every((v) => arr.includes(v))

	// Efficiently filter subsets by sorting by length descending
	possibleRoutes.sort((a, b) => b.length - a.length)
	let uniqueRoutes = possibleRoutes.filter((route, i) => {
		for (let j = 0; j < possibleRoutes.length; j++) {
			if (i === j) continue
			if (checker(possibleRoutes[j], route)) {
				// route is contained in another: drop strict subsets, but among
				// identical routes keep the first one
				if (possibleRoutes[j].length === route.length && i < j) continue
				return false
			}
		}
		return true
	})

	// 3. Sales Potential Analysis
	const allEntrancesIdx = new Set(giveAllPlayerRestaurantEntrances(true).map((s) => s.index))
	let uniqueRoutesPotentialSales = []

	for (const route of uniqueRoutes) {
		let availableCoffee = getAvailableCoffee(true)

		let routeNeighbours = [...new Set(map.neighbours(route))]

		let filteredZone = routeNeighbours.filter((space) => allEntrancesIdx.has(space))

		for (let i = filteredZone.length - 1; i >= 0; i--) {
			const space = filteredZone[i]
			const coord = store.mapData.coords[space]
			if (coord >= 140 && coord <= 149) {
				const currentRestoZone = map.getRestaurantZoneFromAnyIndex(space)
				for (let j = i - 1; j >= 0; j--) {
					if (currentRestoZone.includes(filteredZone[j])) {
						filteredZone.splice(i, 1)
						break
					}
				}
			}
		}

		// Remove winning player's own restaurant entrance only (not coffee shops)
		for (let j = filteredZone.length - 1; j >= 0; j--) {
			const coord = store.mapData.coords[filteredZone[j]]
			if (coord >= 140 && coord <= 149 && coord - 140 === playerColour) {
				filteredZone.splice(j, 1)
				break
			}
		}

		const salesEntry = []
		for (const space of filteredZone) {
			const coord = store.mapData.coords[space]
			const playerNum = coord < 160 ? coord % 140 : coord % 160
			if (availableCoffee[playerNum] > 0) {
				salesEntry.push([space, playerNum])
			}
		}
		uniqueRoutesPotentialSales.push(salesEntry)
	}

	// Remove routes whose potential sales locations are a complete subset of
	// another route's sales locations
	const salesSubsetKeep = new Set(uniqueRoutes.map((_, i) => i))
	for (let i = 0; i < uniqueRoutesPotentialSales.length; i++) {
		const locsI = uniqueRoutesPotentialSales[i].map((x) => x[0])
		for (let j = 0; j < uniqueRoutesPotentialSales.length; j++) {
			if (i === j) continue
			const locsJ = uniqueRoutesPotentialSales[j].map((x) => x[0])
			if (locsI.length <= locsJ.length) {
				const isSubset = locsI.every((loc) => locsJ.includes(loc))
				if (isSubset && (locsI.length < locsJ.length || i > j)) {
					salesSubsetKeep.delete(i)
					break
				}
			}
		}
	}
	uniqueRoutes = uniqueRoutes.filter((_, idx) => salesSubsetKeep.has(idx))
	uniqueRoutesPotentialSales = uniqueRoutesPotentialSales.filter((_, idx) => salesSubsetKeep.has(idx))

	// 4. Calculate Max Sales and Cleanup
	let maxPotentialSales = 0
	const totalAvailable = getAvailableCoffee(true).reduce((sum, a) => sum + a, 0)

	const availableCoffeeFinal = getAvailableCoffee(true)
	const processedSales = uniqueRoutesPotentialSales.map((entry) => {
		const coffeeSoldCount = Array(6).fill(0)
		const validSales = entry.filter(([_, player]) => {
			if (coffeeSoldCount[player] < availableCoffeeFinal[player]) {
				coffeeSoldCount[player]++
				return true
			}
			return false
		})
		maxPotentialSales = Math.max(maxPotentialSales, validSales.length)
		return validSales
	})

	maxPotentialSales = Math.min(maxPotentialSales, totalAvailable)

	// Filter results that don't meet max sales
	const finalRoutes = []
	const finalSales = []
	processedSales.forEach((entry, i) => {
		if (entry.length >= maxPotentialSales) {
			finalSales.push(entry)
			finalRoutes.push(uniqueRoutes[i])
		}
	})

	// 5. Finalize Common Components
	const coffeeSalesByColour = Array(6).fill(maxPotentialSales)
	if (finalSales.length > 0) {
		// Find minimum common sales across all strands
		finalSales.forEach((routeSales) => {
			const currentStrand = Array(6).fill(0)
			routeSales.forEach(([_, p]) => currentStrand[p]++)
			currentStrand.forEach((count, p) => {
				coffeeSalesByColour[p] = Math.min(coffeeSalesByColour[p], count)
			})
		})
	}

	// Convert restaurant entrance indexes to base indexes for common index matching
	for (const entry of finalSales) {
		for (const pair of entry) {
			const coord = store.mapData.coords[pair[0]]
			if (coord >= 140 && coord <= 149) {
				const baseIdx = map.getRestaurantZoneFromAnyIndex(pair[0])[0]
				if (baseIdx != null) pair[0] = baseIdx
			}
		}
	}

	const commonSquares = finalRoutes.length > 0 ? finalRoutes[0].filter((sq) => finalRoutes.every((r) => r.includes(sq))) : []

	// Sales locations common to every surviving route (old model.js:1576-1592)
	const commonSales = []
	if (finalSales.length > 0) {
		finalSales[0].forEach((pair) => {
			if (finalSales.every((fs) => fs.some((other) => other[0] === pair[0]))) commonSales.push(pair)
		})
	}

	// A sale only stands if it appears in every surviving route: when a route
	// splits and the branches sell at different spots, the sales cancel out
	// (old model.js:1594-1598)
	const commonSalesByColour = Array(6).fill(0)
	commonSales.forEach(([, p]) => commonSalesByColour[p]++)
	const actualCoffeeSales = store.players.map((p) => Math.min(coffeeSalesByColour[p.colour], commonSalesByColour[p.colour]))

	const salesIndexes = new Set()
	commonSales.forEach(([idx]) => {
		const coord = store.mapData.coords[idx]
		if (coord >= 140 && coord <= 149) {
			map.getRestaurantZoneFromAnyIndex(idx).forEach((zIdx) => salesIndexes.add(zIdx))
		} else {
			salesIndexes.add(idx)
		}
	})

	return [actualCoffeeSales, commonSquares, Array.from(salesIndexes)]
}

// gets the index of the building, then the (zone-index). Then runs the index. Then runs the zone.
// Returns a set of distances for ALWAYS 5 players, with undef if no route possible
// The main pathfinding function is in map > rangeToRestaurantsFromIndex
export function giveRestaurantRangesForHouse(number) {
	const store = useModelStore()
	const index = map.findIndexForHouse(number)
	let zone = []

	// 1. Initial Zone Setup
	if (number !== rf.RURAL_MARKETING_AREA) {
		zone = [index + 1, index + rf.ssW, index + rf.ssW + 1]
	}

	// 2. Garden Logic
	if (hasGarden(number)) {
		if (!rf.BOARD_HOUSES.includes(number)) {
			const house = store.houses.find((h) => h.number === number)
			if (house && (house.rotated === 1 || house.rotated === 3)) {
				zone.push(index + 2, index + rf.ssW + 2)
			} else {
				zone.push(index + 2 * rf.ssW, index + 2 * rf.ssW + 1)
			}
		} else {
			const g = store.gardens.find((garden) => garden.house === number)
			if (g) {
				const { index: gIdx } = g
				if (gIdx === index - 1) {
					zone.push(index - 1, index + rf.ssW - 1)
				} else if (gIdx === index + 2) {
					zone.push(index + 2, index + rf.ssW + 2)
				} else if (gIdx === index - rf.ssW) {
					zone.push(index - rf.ssW, index - rf.ssW + 1)
				} else if (gIdx === index + 2 * rf.ssW) {
					zone.push(index + 2 * rf.ssW, index + 2 * rf.ssW + 1)
				}
			}
		}
	}

	// 3. Apartment logig
	if (rf.APARTMENTS.includes(number)) {
		zone.push(index + 2, index + rf.ssW + 2, index + 2 * rf.ssW, index + 2 * rf.ssW + 1, index + 2 * rf.ssW + 2)
	}

	// 4. Rural Marketing Overrides
	if (number === rf.RURAL_MARKETING_AREA && store.freeways.length > 0) {
		zone = map.getRuralMarketingZone()
	}

	// 5. Distance Calculations
	// Each res/t entry is keyed by playerIndex; -99 = unreachable
	const restaurants = giveAllPlayerRestaurantEntrances()
	const res = map.rangeToRestaurantsFromIndex(index, restaurants)

	// Optimized loop: for...of instead of _.each
	for (const space of zone) {
		const t = map.rangeToRestaurantsFromIndex(space, restaurants)
		for (let i = 0; i < t.length; i++) {
			// Update if no result exists or current path is shorter
			if (res[i] === -99 || (t[i] !== -99 && t[i] < res[i])) {
				res[i] = t[i]
			}
		}
	}

	// 6. Rural Penalty
	if (number === rf.RURAL_MARKETING_AREA) {
		for (let k = 0; k < res.length; k++) {
			if (res[k] !== -99) res[k]++
		}
	}

	return res
}

export function giveHousesWithGarden() {
	const store = useModelStore()
	// 1. Map instead of _.pluck (extracts 'house' property from each object)
	const res = store.gardens.map((g) => g.house)

	// 2. Performance: Call the expensive map search only once
	const allHouses = map.findAllHouses()

	// 3. Optimized check for default houses that always have gardens
	const defaultGardenHouses = [1, 3, 6, 9, 11, 14, 17, 19, 25]

	for (const houseNum of defaultGardenHouses) {
		if (allHouses.includes(houseNum)) {
			res.push(houseNum)
		}
	}

	return res
}

export function getHousesAffectedByHawkerTruck(campaignNumber) {
	const store = useModelStore()

	// 1. Efficiently find the route in history (searching backwards)
	let route = []
	for (let i = store.history.length - 1; i >= 0; i--) {
		const entry = store.history[i]
		if (entry[0] === rf.HIST_START_MARKETING_CAMPAIGN && entry[3][0] === campaignNumber) {
			route = funcs.importIndexes(entry[3][1])
			break
		}
	}

	if (!route.length) return []

	const neighbours = map.neighbours(route)
	const housesFound = new Set() // Use Set for automatic O(1) duplicate prevention

	for (const neighborIdx of neighbours) {
		const spaceContent = store.mapData.coords[neighborIdx]

		// Check if the space contains a house
		if (spaceContent > rf.HOUSE && spaceContent < rf.HOUSE + 29) {
			const rawHouseNum = spaceContent - rf.HOUSE
			const houseNum = Number.isInteger(spaceContent) ? rawHouseNum : Math.round((rawHouseNum + Number.EPSILON) * 100) / 100

			// Handle Board Houses and Apartments (Simple check)
			if (rf.BOARD_HOUSES.includes(houseNum) || rf.APARTMENTS.includes(houseNum)) {
				housesFound.add(houseNum)
			} else {
				// Handle player-built houses (filtering out garden tiles)
				const h = store.houses.find((house) => house.number === houseNum)
				if (!h) continue

				const houseIndexes = []
				const { rotated, index } = h

				// Determine valid house tiles based on rotation
				if (rotated === 0) {
					houseIndexes.push(index, index + 1, index + rf.ssW, index + rf.ssW + 1)
				} else if (rotated === 2) {
					houseIndexes.push(index + rf.ssW, index + rf.ssW + 1, index + rf.ssW * 2, index + rf.ssW * 2 + 1)
				} else if (rotated === 1) {
					houseIndexes.push(index + 1, index + 2, index + rf.ssW + 1, index + rf.ssW + 2)
				} else if (rotated === 3) {
					houseIndexes.push(index, index + 1, index + rf.ssW, index + rf.ssW + 1)
				}

				// If neighbor is part of the living area (not garden), add the house
				if (houseIndexes.includes(neighborIdx)) {
					housesFound.add(houseNum)
				}
			}
		}
	}

	return Array.from(housesFound)
}

export function hasGarden(house) {
	const store = useModelStore()
	// 1. Check if the house is a standard player-built house.
	// If it's not a Board House, not an Apartment, and not Rural Marketing, it has a garden by default.
	if (!rf.BOARD_HOUSES.includes(house) && !rf.APARTMENTS.includes(house) && house !== rf.RURAL_MARKETING_AREA) {
		return true
	}

	// 2. Otherwise, check the store for manually added gardens (e.g., via milestones)
	return store.gardens.find((g) => g.house === house) != null
}

export function adjacentToPark(building) {
	const store = useModelStore()
	// building is the number of the bldg, eg 3.2, 9.7, 22
	let adjacentToPark = false
	let parkCheckArea
	if (building != rf.RURAL_MARKETING_AREA) {
		if (building === 3.2 || building === 9.7) {
			let appZone = map.giveAllSpaceForAToken(map.findIndexForApartment(building), 3, 3)
			parkCheckArea = map.neighbours(appZone)
			for (let i = 0; i < parkCheckArea.length; i++) {
				if (store.mapData.coords[parkCheckArea[i]] === rf.PARK) {
					adjacentToPark = true
					break
				}
			}
		} else {
			let houseZone = map.getZoneOfHouse(building)
			parkCheckArea = map.neighbours(houseZone)
			for (let i = 0; i < parkCheckArea.length; i++) {
				if (store.mapData.coords[parkCheckArea[i]] === rf.PARK) {
					adjacentToPark = true
					break
				}
			}
		}
	}
	return adjacentToPark
}

export function houseForThisGarden(index) {
	const store = useModelStore()
	for (let i = 0; i < store.gardens.length; i++) {
		let garden = store.gardens[i]
		if (garden.index === index || (garden.rotated === true && garden.index + rf.ssW === index) || (garden.rotated !== true && garden.index + 1 === index)) {
			return garden.house
		}
	}

	return -1
}

export function getHouseOffset(house) {
	const store = useModelStore()

	// 1. Only Board Houses have external garden offsets to calculate
	if (rf.BOARD_HOUSES.includes(house)) {
		const garden = store.gardens.find((g) => g.house === house)

		if (garden) {
			const houseIndex = map.findIndexForHouse(house)
			return garden.index - houseIndex
		}
	}

	// 2. Return 0 for apartments or houses without registered gardens
	return 0
}

export function endGame() {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_GAME_OVER
	// Reform turnOrder and fullTurnOrder
	//store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]

	/*store.gameflow.turnOrder.sort((a, b) => {
			return store.players[b].money - store.players[a].money
		})*/
	// Sort primarily by money, secondarily by original turn order (index)
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder].sort((a, b) => {
		const moneyDiff = store.players[b].money - store.players[a].money
		if (moneyDiff !== 0) {
			return moneyDiff // Sort by money if different
		} else {
			// If money is the same, maintain original order
			return store.gameflow.fullTurnOrder.indexOf(a) - store.gameflow.fullTurnOrder.indexOf(b)
		}
	})

	store.gameflow.fullTurnOrder = [...store.gameflow.turnOrder]
	addHistory(rf.HIST_END_GAME, [rules.winner(true)], -1, 0)
}

export function giveEmployeeIfAvailable(playerIndex, employee) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (store.availableEmployees[employee] > 0) {
		playerObj.beach.push(employee)
		store.availableEmployees[employee]--
	}
}

export function checkAllResourcesOwned(resources, turnData) {
	// Create a copy of the resources array to avoid modifying the original
	const resourcesCopy = [...resources]
	const containedTurnData = [] // Array to store the turnData items that *are* contained

	for (const item of turnData) {
		const index = resourcesCopy.indexOf(item)

		if (index !== -1) {
			// Item found in resourcesCopy, so it's contained
			resourcesCopy.splice(index, 1) // Remove the item from resourcesCopy
			containedTurnData.push(item) // Add the item to the containedTurnData array
		} else {
			// Item not found, so it's *not* contained (do nothing, skip it)
		}
	}

	return containedTurnData // Return the filtered turnData
}

// This should receive a COMPLETE unix TS IE Math.round((new Date().getTime()) / 1000), or 0
export function addHistory(action, param, playerIndex, timestamp) {
	const store = useModelStore()
	if (timestamp === 0) timestamp = Math.round(new Date().getTime() / 1000)
	store.history.push([action, playerIndex, timestamp, param])
}
