/**
 * Contains functions that alter the game state,
 * IE anything that needs to be held in the "digital"
 * model.
 * So the functions in here should allow a replay of
 * the game to be re-created.
 * These should not directly update the "view" or
 * what the player sees.
 *
 * In general, it is better to provide all the required information
 * to the function (EG playerObj, hexes) rather than relying
 * on knowing the currentPlayer.
 * This makes it possible to more easily recreate replays later.
 *
 */
import { useModelStore } from "../stores/CNSstore.js"
import { usePersonalStore } from "../stores/CNSpersonal"

import * as rf from "./CNSreference"
import * as map from "./CNSmap"
import * as controller from "./CNScontroller"
import * as funcs from "./CNSfuncs"
import * as IO from "./CNS_IO"
import hexlib from "./hexlib.js"

export function addHistory(event, playerIndex, timeOffset, params) {
	const personal = usePersonalStore()
	const store = useModelStore()

	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp + timeOffset)
	store.history.push([event, playerIndex, time, [...params]])
}

export function addLink(playerObj, twoHexes) {
	const store = useModelStore()

	/*const modifiedTwoHexes = twoHexes.map((obj) => {
    // Create a copy of the object without the 'rotation' property
    const { rotation, ...newObj } = obj;
    return newObj;
  });*/
	/*let hex0 = JSON.parse(JSON.stringify(twoHexes[0]))
  let hex1 = JSON.parse(JSON.stringify(twoHexes[1]))
  delete hex0.rotation
  delete hex1.rotation
  let modifiedTwoHexes = [hex0, twoHexes]*/

	addLink_core(playerObj, twoHexes)

	//addHistory(rf.HIST_ADD_LINK, controller.currentPlayerIndex(), 0, [[twoHexes[0].hex.q, twoHexes[0].hex.r], [twoHexes[1].hex.q, twoHexes[1].hex.r]])
	if (store.context.action === rf.ACT_ADD_LINK)
		store.context.historyObj.push([
			[twoHexes[0].hex.q, twoHexes[0].hex.r],
			[twoHexes[1].hex.q, twoHexes[1].hex.r],
		])
	else if (store.context.action === rf.ACT_READD_LINK) {
		store.context.historyObj[store.context.historyObj.length - 1] = store.context.historyObj[store.context.historyObj.length - 1].concat([
			[twoHexes[0].hex.q, twoHexes[0].hex.r],
			[twoHexes[1].hex.q, twoHexes[1].hex.r],
		])
		//addHistory(rf.HIST_MOVE_LINK, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	}
	store.context.linksPlacedThisTurn++
	if (store.context.linksPlacedThisTurn < 2) {
		store.context.action = rf.ACT_ADD_LINK
		map.setNeighbours()
		map.setPlaceableLinks(controller.currentPlayerObj(), false)
	} else store.context.action = rf.ACT_NONE
	setCurrentProdRes(controller.currentPlayerObj())
}

export function addLink_core(playerObj, twoHexes) {
	playerObj.links.push([twoHexes[0], twoHexes[1]])
}

export function removeLink(link) {
	const store = useModelStore()
	removeLink_core(controller.currentPlayerObj(), link)
	store.context.historyObj.push([
		[link[0].hex.q, link[0].hex.r],
		[link[1].hex.q, link[1].hex.r],
	])

	map.setNeighbours()
	map.setPlaceableLinks(controller.currentPlayerObj(), false)
	store.context.action = rf.ACT_READD_LINK
}

export function removeLink_core(player, link) {
	let index = player.links.findIndex((item) => item[0].hex.q === link[0].hex.q && item[0].hex.r === link[0].hex.r && item[0].hex.s === link[0].hex.s && item[1].hex.q === link[1].hex.q && item[1].hex.r === link[1].hex.r && item[1].hex.s === link[1].hex.s)
	if (index === -1) index = player.links.findIndex((item) => item[0].hex.q === link[1].hex.q && item[0].hex.r === link[1].hex.r && item[0].hex.s === link[1].hex.s && item[1].hex.q === link[0].hex.q && item[1].hex.r === link[0].hex.r && item[1].hex.s === link[0].hex.s)

	if (index !== -1) player.links.splice(index, 1)
	setCurrentProdRes(controller.currentPlayerObj())
}

export function addCigar(twoHexes) {
	const store = useModelStore()

	let newRes = addCigar_core(twoHexes, controller.currentPlayerObj())
	store.context.action = rf.ACT_NONE
	if (newRes.length > 0) addHistory(rf.HIST_ADD_CIGAR, controller.currentPlayerIndex(), 0, [[twoHexes[0].hex.q, twoHexes[0].hex.r], [twoHexes[1].hex.q, twoHexes[1].hex.r], [...newRes]])
	else
		addHistory(rf.HIST_ADD_CIGAR, controller.currentPlayerIndex(), 0, [
			[twoHexes[0].hex.q, twoHexes[0].hex.r],
			[twoHexes[1].hex.q, twoHexes[1].hex.r],
		])
}

export function addCigar_core(twoHexes, playerObj) {
	const store = useModelStore()

	let oldHexRefs = map.getHexesInNetwork(playerObj, true)

	store.context.availableResources[rf.RES_PEOPLE]--
	store.context.availableResources[rf.RES_PEOPLE]--
	store.oldBoysNetwork.push([twoHexes[0], twoHexes[1]])

	let newHexRefs = map.getHexesInNetwork(playerObj, true)

	// Enable resource conversion from all connected tiles
	let networkResProd = rf.collectResAndProdFromHexRefs(newHexRefs)
	store.context.availableProduction = [...networkResProd[1]]

	// Find the extra hexes only, and add the resources
	newHexRefs = newHexRefs.filter(function (number) {
		return !oldHexRefs.includes(number)
	})
	let networkResProdNew = rf.collectResAndProdFromHexRefs(newHexRefs)
	let newRes = []
	for (let i = 0; i < networkResProdNew[0].length; i++) {
		if (networkResProdNew[0][i] !== 0) {
			for (let j = 0; j < networkResProdNew[0][i]; j++) {
				newRes.push(i)
				store.context.availableResources[i]++
			}
		}
	}
	return newRes
}

export function addHexToMap(tile, hexRef) {
	const store = useModelStore()

	addHexToMap_core(controller.currentPlayerObj(), tile, hexRef, store.context.hexBeingAddedRotation)
	store.context.hexActionsUsed++

	map.calculateCanvasSize()

	store.context.hexRefBeingAdded = -1

	store.context.historyObj.push([hexRef, store.context.hexBeingAddedRotation, [tile.q, tile.r]])
}

export function addHexToMap_core(player, inputHex, hexRef, rotation) {
	const store = useModelStore()
	// calculate pre-partyzones
	let prePartyZoneNum = 0
	let postPartyZoneNum = 0
	if (store.useExpansion) {
		map.updatePartyZones()
		prePartyZoneNum = store.context.partyZones.length
	}

	let storeHex = new hexlib.Hex(inputHex.q, inputHex.r, inputHex.s)

	const hex = {
		id: store.hexes[store.hexes.length - 1].id + 1,
		hex: storeHex,
		hexRef: hexRef,
		rotation: rotation,
	}

	store.hexes.push(hex)

	if (store.useExpansion) {
		map.setNeighbours()
		postPartyZoneNum = store.context.partyZones.length
		// If there's ever 1 party, remove the ship
		if (postPartyZoneNum <= 1) store.pirateShipRef = -1
		// upon 2nd party creation, add the pirate ship
		else if (prePartyZoneNum === 1 && postPartyZoneNum === 2) setPirateInPartyIndex(1)
	}
	// Remove hex from player storge / drawn hexes
	store.ongoingVars.drawnHexes = store.ongoingVars.drawnHexes.filter((a) => a !== hexRef)
	player.storedResources = player.storedResources.filter((a) => a !== hexRef)

	store.context.action = rf.ACT_NONE
}

export function setPirateInPartyIndex(partyIndex) {
	const store = useModelStore()

	let hexRef = store.context.partyZones[partyIndex][0].hexRef
	// Check for non invite tile, and use first available
	for (let i = 0; i < store.context.partyZones[partyIndex].length; i++) {
		if (rf.HEX_PARTY_FIXED.includes(store.context.partyZones[partyIndex][i].hexRef)) {
			hexRef = store.context.partyZones[partyIndex][i].hexRef
			break
		}
	}

	store.pirateShipRef = hexRef
}

export function actionProd(prod) {
	actionProd_core(prod)
	addHistory(rf.HIST_CONVERT_RES, controller.currentPlayerIndex(), 0, [prod])
}

export function actionProd_core(prod) {
	const store = useModelStore()

	if (prod === rf.PROD_COMPUTER) {
		store.context.availableResources[rf.RES_CHIP]--
		store.context.availableResources[rf.RES_COMPUTER]++
	} else if (prod === rf.PROD_ACTRESS) {
		store.context.availableResources[rf.RES_PEOPLE]--
		store.context.availableResources[rf.RES_PEOPLE]--
		store.context.availableResources[rf.RES_ACTRESS]++
	} else if (prod === rf.PROD_SFX) {
		store.context.availableResources[rf.RES_COMPUTER]--
		store.context.availableResources[rf.RES_COMPUTER]--
		store.context.availableResources[rf.RES_SFX]++
	} else if (prod === rf.PROD_SCRIPT) {
		store.context.availableResources[rf.RES_COMPUTER]--
		store.context.availableResources[rf.RES_BEER]--
		store.context.availableResources[rf.RES_SCRIPT]++
	} else if (prod === rf.PROD_MOVIE_ACTION) {
		store.context.availableResources[rf.RES_ACTRESS]--
		store.context.availableResources[rf.RES_SFX]--
		store.context.availableResources[rf.RES_MOVIE_ACTION]++
	} else if (prod === rf.PROD_MOVIE_GIRLIE) {
		store.context.availableResources[rf.RES_ACTRESS]--
		store.context.availableResources[rf.RES_SCRIPT]--
		store.context.availableResources[rf.RES_MOVIE_GIRLIE]++
	} else if (prod === rf.PROD_MOVIE_SCIFI) {
		store.context.availableResources[rf.RES_SCRIPT]--
		store.context.availableResources[rf.RES_SFX]--
		store.context.availableResources[rf.RES_MOVIE_SCIFI]++
	}
}

export function increaseFilmPrice(res) {
	const store = useModelStore()

	increaseFilmPrice_core(res)

	addHistory(rf.HIST_INCREASE_PRICE, controller.currentPlayerIndex(), 0, [res, store.moviePrices[res - rf.RES_MOVIE_OFFET]])

	store.context.action = rf.ACT_NONE
}

export function increaseFilmPrice_core(res) {
	const store = useModelStore()

	store.context.availableResources[rf.RES_BEER]--
	store.moviePrices[res - rf.RES_MOVIE_OFFET]++
}

export function sellMovies(playerIndex) {
	const store = useModelStore()

	sellMovies_core(playerIndex, store.context.sellingSummary)

	// NOTE: The history is added SECOND. So you can use these moviePrices in history as the AFTER
	// BUT then you need to re-calculate and reverse the drop to get sales price
	addHistory(rf.HIST_SELL_MOVIES, playerIndex, 0, [[...store.context.sellingSummary], [...store.moviePrices], [controller.currentPlayerObj().score]])

	// Reset vars
	for (let i = 0; i < store.context.sellingSummary.length; i++) store.context.sellingSummary[i] = 0
	store.context.action = rf.ACT_NONE
}

export function sellMovies_core(playerIndex, sellingSummary) {
	const store = useModelStore()

	// Add money to player, reduce price of movie
	for (let i = 0; i < sellingSummary.length; i++) {
		store.players[playerIndex].score += sellingSummary[i] * store.moviePrices[i]
		store.moviePrices[i] -= sellingSummary[i]
		if (store.moviePrices[i] < 6) store.moviePrices[i] = 6
	}
}

export function drawHexes(num = 1) {
	const store = useModelStore()

	if (store.ongoingVars.drawnHexes.length === 3) return
	let i = 0

	const drawHex = () => {
		i++

		if (store.hexDrawPile.length == 0) {
			store.hexDrawPile = [...store.hexDiscardPile]
			store.hexDiscardPile.splice(0)
			//funcs.shuffle(store.hexDrawPile)

			if (!store.topMenuViews.generatingReplay) {
				// Shuffle draw pile
				const newShuffle = funcs.shuffleSeeded(store.hexDrawPile)
				store.hexDrawPile = [...newShuffle.shuffled]

				// Add a note in the history
				store.history[0][3].push(newShuffle.seed)
			} else if (store.topMenuViews.generatingReplay) {
				// Recreate Shuffle
				const oldShuffle = funcs.shuffleSeeded(store.hexDrawPile, store.history[0][3][store.topMenuViews.replaySeedIndex])
				store.hexDrawPile = oldShuffle.shuffled
				store.topMenuViews.replaySeedIndex++
			}

			// Remove seen discards
			for (let i = 0; i < store.players.length; i++) {
				store.players[i].seenDiscardHexRefs.splice(0)
			}
		}

		if (store.ongoingVars.drawnHexes.length < 3 && store.hexDrawPile.length > 0) store.ongoingVars.drawnHexes.push(store.hexDrawPile.pop())

		if (i < num) {
			drawHex()
		}
	}

	drawHex()

	return
}

export function discardHexes() {
	const store = useModelStore()
	controller.currentPlayerObj().seenDiscardHexRefs = controller.currentPlayerObj().seenDiscardHexRefs.concat([...store.ongoingVars.drawnHexes])

	store.hexDiscardPile = store.hexDiscardPile.concat([...store.ongoingVars.drawnHexes])
	store.ongoingVars.drawnHexes.splice(0)
}

export function storeResources() {
	const store = useModelStore()

	// move res to the player
	for (let i = 0; i < store.context.availableResources.length; i++) {
		while (store.context.availableResources[i] > 0) {
			controller.currentPlayerObj().storedResources.push(i)
			store.context.availableResources[i]--
		}
	}

	// Add history
	addHistory(rf.HIST_STORE_RES, controller.currentPlayerIndex(), 0, [...controller.currentPlayerObj().storedResources])
}

export function storeHex(player, hexRef) {
	const store = useModelStore()

	storeHex_core(player, hexRef)
	store.context.hexActionsUsed++
	addHistory(rf.HIST_STORE_HEX, controller.currentPlayerIndex(), 0, [hexRef])

	store.context.placeableTiles.splice(0)
	map.calculateCanvasSize()
	store.context.hexRefBeingAdded = -1
}

export function storeHex_core(player, hexRef) {
	const store = useModelStore()

	player.storedResources.push(hexRef)
	// Move hex to start, rest of resources in order
	player.storedResources.sort((a, b) => (a >= 20 ? -1 : b >= 20 ? 1 : a - b))
	store.ongoingVars.drawnHexes = store.ongoingVars.drawnHexes.filter((a) => a !== hexRef)
}

export function cancelSellMovies() {
	const store = useModelStore()
	// Remove any sold movies, and add them to stock
	for (let i = 0; i < store.context.sellingSummary.length; i++) {
		store.context.availableResources[i + rf.RES_MOVIE_OFFET] += store.context.sellingSummary[i]
		store.context.sellingSummary[i] = 0
	}
}

export function hexActionsRemaining(playerIndex) {
	if (playerIndex !== controller.currentPlayerIndex()) return false

	const store = useModelStore()

	let agents = store.context.realEstateAgentsInNetwork
	let hexActionsUsed = store.context.hexActionsUsed
	if (agents === 0 && hexActionsUsed === 2) return false
	else if (hexActionsUsed === 3) return false
	return true
}

export function endGame() {
	const store = useModelStore()

	// Remove current player
	store.gameflow.turnOrder.shift()
	store.resetContext()

	let finalRes = endGame_core()
	addHistory(rf.HIST_GAME_END, -1, 0, [...finalRes])

	for (let i = 0; i < store.players.length; i++) {
		store.players[i].seenDiscardHexRefs.splice(0)
	}
	store.gameflow.fullTurnOrder.splice(0)
	for (let i = 0; i < finalRes.length; i++) store.gameflow.fullTurnOrder.push(finalRes[i][0])

	store.gameflow.turnOrder.splice(0)
	store.gameflow.turnOrder.push(0)
	IO.saveGame(false)
}

/*export function endGame_core() {
  const store = useModelStore()

  store.gameflow.phase = rf.PHASE_GAME_OVER

  // Sort players by score
  let finalTurnOrder = store.gameflow.turnOrder.concat(store.gameflow.fullTurnOrder)
  finalTurnOrder = finalTurnOrder.slice(0, store.gameflow.fullTurnOrder.length);

  let finalRes = []
  for (let i = 0; i < store.players.length; i++) {
    finalRes.push([
      i, store.players[i].score,
    ])
  }

  // [playerIndex, name, score]
  finalRes.sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1]; // Sort by score in descending order
    } else {
      const povA = finalTurnOrder.findIndex((entry) => entry === a[0]);
      const povB = finalTurnOrder.findIndex((entry) => entry === b[0]);
      return povA - povB; // Sort by earliest pov value in finalTurnOrder
    }
  });

  return finalRes
}*/

export function endGame_core() {
	const store = useModelStore()

	store.gameflow.phase = rf.PHASE_GAME_OVER

	// Build the final turn order reference (only the completed rounds)
	const finalTurnOrder = store.gameflow.turnOrder.concat(store.gameflow.fullTurnOrder)
	const referenceTurnOrder = finalTurnOrder.slice(0, store.gameflow.fullTurnOrder.length)

	// Create array of [playerIndex, score, isBot]
	const playersWithData = store.players.map((p, i) => ({
		index: i,
		score: p.score,
		isBot: p.displayName === rf.BOT_NAME,
		// Keep the original turn-order position for tie-breaking
		turnOrderPos: referenceTurnOrder.findIndex((id) => id === i),
	}))

	// Sort with the desired rules
	const finalRes = playersWithData.sort((a, b) => {
		// 1. Humans always come before bots
		if (a.isBot && !b.isBot) return 1 // a goes after b
		if (!a.isBot && b.isBot) return -1 // a goes before b

		// 2. Within the same group (both human or both bot) → sort by score desc
		if (b.score !== a.score) {
			return b.score - a.score
		}

		// 3. Same score → earliest in the final turn order wins
		return a.turnOrderPos - b.turnOrderPos
	})

	return finalRes.map((p) => [p.index, p.score])
}

export function pirateResource(player, res, afterPirateResultNum) {
	const store = useModelStore()

	pirateResource_core(player, res, afterPirateResultNum)

	// 2 parties, in both, so add to historyObj
	if (afterPirateResultNum === 0 || afterPirateResultNum === 10) {
		if (store.context.historyObj.length === 0) store.context.historyObj.push(afterPirateResultNum)
		store.context.historyObj.push(res)
	}
	// 2 parties, not in the other one
	else if (afterPirateResultNum === 1) {
		addHistory(rf.HIST_PIRATE_MOVIE, controller.currentPlayerIndex(), 0, [1, res, store.pirateShipRef])
	}
}

export function pirateResource_core(player, res, afterPirateResultNum) {
	const store = useModelStore()
	map.setNeighbours()
	if (store.context.availableResources[res] <= 0) return

	// Sell the pirate copy
	store.context.availableResources[res]--
	player.score += 4

	// Move the ship if no other player involvement
	if (afterPirateResultNum === 0 || afterPirateResultNum === 1) {
		// Just move to the other party
		const currentPirateParty = store.context.partyZones.findIndex((party) => party.some((obj) => obj.hexRef === store.pirateShipRef))
		if (currentPirateParty === 0) setPirateInPartyIndex(1)
		else setPirateInPartyIndex(0)
	}
}

export function endTurn() {
	const store = useModelStore()

	endTurn_core()
	let histObj = []
	histObj.push(store.gameflow.turn)
	let histObj2 = []
	for (let i = 0; i < store.players.length; i++) {
		histObj2.push(store.players[i].score)
	}
	histObj.push([...histObj2])
	addHistory(rf.HIST_NEW_TURN, -1, 0, [...histObj])
}

export function endTurn_core() {
	const store = useModelStore()

	store.gameflow.turn++
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
}

export function setupProductionPhase() {
	const store = useModelStore()

	store.resetContext()
	store.phaseResetData = funcs.exportModel(false)

	setupProductionPhase_core(controller.currentPlayerObj())

	addHistory(rf.HIST_PRODUCE_RES, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	store.context.historyObj.splice(0)
}

export function setupProductionPhase_core(playerObj) {
	const store = useModelStore()

	store.resetContext(true)
	// Set up production
	store.context.availableResources.splice(0)
	store.context.availableProduction.splice(0)
	// Find all hexes in your network
	let hexRefs = map.getHexesInNetwork(playerObj, true)

	// Then collect resources from them
	let networkResProd = rf.collectResAndProdFromHexRefs(hexRefs)
	store.context.availableResources = [...networkResProd[0]]

	// Add a production history
	store.context.historyObj.push([...store.context.availableResources.slice(0, 3)])
	if (playerObj.storedResources.length > 0) store.context.historyObj.push([...playerObj.storedResources])

	// Add stored resources, except tiles
	for (let i = playerObj.storedResources.length - 1; i >= 0; i--) {
		if (playerObj.storedResources[i] <= 20) {
			store.context.availableResources[playerObj.storedResources[i]]++
			playerObj.storedResources.splice(i)
		}
	}

	// Then enable resource conversion from all connected tiles
	store.context.availableProduction = [...networkResProd[1]]

	store.context.action = rf.ACT_NONE
}

export function setCurrentProdRes(playerObj) {
	const store = useModelStore()
	// Set up production
	store.context.availableResources.splice(0)
	store.context.availableProduction.splice(0)
	// Find all hexes in your network
	let hexRefs = map.getHexesInNetwork(playerObj, true)

	// Then collect resources from them
	let networkResProd = rf.collectResAndProdFromHexRefs(hexRefs)
	store.context.availableResources = [...networkResProd[0]]

	// Add stored resources, except tiles
	for (let i = playerObj.storedResources.length - 1; i >= 0; i--) {
		if (playerObj.storedResources[i] <= 20) {
			store.context.availableResources[playerObj.storedResources[i]]++
			//playerObj.storedResources.splice(i)
		}
	}

	// Then enable resource conversion from all connected tiles
	store.context.availableProduction = [...networkResProd[1]]
}
