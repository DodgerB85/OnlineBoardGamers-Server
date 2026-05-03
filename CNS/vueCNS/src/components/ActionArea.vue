<script setup>
/** Action area - This is where you interact with the game flow.
 * Confirm actions, end turn, reset turn.
 * Also, it's where you're told what to do next, eg
 * "Select a hex to add to the grid"
 *
 */
import * as rf from "../js/CNSreference"
import * as controller from "../js/CNScontroller"
import * as funcs from "../js/CNSfuncs"
import * as model from "../js/CNSmodel"
import * as map from "../js/CNSmap"
import * as Bot from "../js/CNSBot"

import { useModelStore } from "../stores/CNSstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/CNSpersonal.js"
const personal = usePersonalStore()

function canMoveToNetworkPhase(hexActionsUsed, agents) {
	if (agents === 0 && hexActionsUsed === 1) return true
	if (agents === 1 && (hexActionsUsed === 1 || hexActionsUsed === 2)) return true
	if (agents === 2 && hexActionsUsed >= 1) return true
}

function localEndPlayerTurn(withoutConfirmation) {
	store.context.action = rf.ACT_CONFIRM_END_TURN
	if (withoutConfirmation) controller.endPlayerTurn()
}

function resetWholeTurn() {
	funcs.importModel(store.wholeTurnResetData, false)
	// Recalc estate agents
	let hexRefsInNetwork = map.getHexesInNetwork(controller.currentPlayerObj(), true)
	if (hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_A) || hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_B)) store.context.realEstateAgentsInNetwork = 1
	if (hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_A) && hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_B)) store.context.realEstateAgentsInNetwork = 2
}

function resetNetworkPhase() {
	funcs.importModel(store.networkPhaseResetData, true)

	store.context.placeableLinks.splice(0)
	store.context.placeableTiles.splice(0)
	store.context.action = rf.ACT_ADD_LINK
	map.setNeighbours()
	map.setPlaceableLinks(controller.currentPlayerObj(), false)

	store.phaseResetData = funcs.exportModel(false)
	model.setCurrentProdRes(controller.currentPlayerObj())
}

function resetPhase() {
	let phase = store.gameflow.phase
	if (phase === rf.PHASE_STORE_RES) funcs.importModel(store.phaseResetData, true)
	else funcs.importModel(store.phaseResetData, false)

	if (phase === rf.PHASE_CONFIRM_PIRATE) store.gameflow.phase = rf.PHASE_PRODUCTION
	else store.gameflow.phase = phase

	if (!store.context.startingTurnAfterPirates) controller.startPhase(store.gameflow.phase)
}
function offerResourceStoragePhase() {
	if (store.gameflow.phase !== rf.PHASE_STORE_RES) return false
	if (!store.useExpansion && store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 5) return true
	if (store.useExpansion && store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 3) return true
}

function offerResourceStoragePhaseButton() {
	if (store.gameflow.phase !== rf.PHASE_STORE_RES) return false
	if (!store.useExpansion) return false
	if (controller.currentPlayerObj().storedResources.length > 0) return false
	if (store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 5) return false
	return true
}

function stopStoringResources() {
	model.storeResources()
	store.context.action = rf.ACT_CONFIRM_END_TURN
	controller.endPlayerTurn()
}

function getOrdinal(num) {
	if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
}
function localCheckResign() {
	store.context.action = rf.ACT_CONFIRM_RESIGN
}
function cancelKickout() {
	personal.kickoutRequired = 0
}

function passKickout() {
	personal.kickoutRequired = 0
	personal.removeCurrentFlexTime = true
	personal.removeCurrentFlexTimeName = controller.currentPlayerObj().name
	controller.endPlayerTurn()
}

function getFlexiKickoutTImerText() {
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

function localSellMovies() {
  model.sellMovies(controller.currentPlayerIndex())
}

function cancelSales() {
  model.cancelSellMovies()
}
</script>

<template>
	<div id="actionAreaDiv">
		<template v-if="personal.name == undefined">
			<div id="loggedOutText">
				Please
				<a href="/register">REGISTER</a>
				or
				<a href="/login">LOGIN</a>
				to play a game
				<br />
			</div>
			<br />
		</template>

		<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
			<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
				Player
				<b>{{ controller.currentPlayerObj().name }}</b>
				has used all the standard kickout time.
				<br />
				<br />
				Remaining Flex-Time:
				<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
				<br />
				<br />
				For more information see
				<b><a href="/help/" target="_blank">Help</a></b>
			</div>
			<div v-else id="kickoutDiv">
				<br />
				<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
					Player
					<b>{{ controller.currentPlayerObj().name }}</b>
					has timed out
					<br />
					To kick out
					<b>{{ controller.currentPlayerObj().name }}</b>
					press Confirm Kickout
					<br />
					The game will proceed to the next player/phase/turn
					<br />
					<br />
					Otherwise you can allow
					<b>{{ controller.currentPlayerObj().name }}</b>
					more time - reload the page to initiate kickout again
					<br />

					<br />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{ controller.currentPlayerObj().name }} in the game - but end their current turn</button>
					</span>
					<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">Confirm Kickout</button></span>
				</template>
				<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
					This will permanently remove
					<b>{{ controller.currentPlayerObj().name }}</b>
					from the game
					<br />
					<b>It cannot be undone</b>
					<br />
					<br />
					Try checking the chat in case they have given a reason for any temporary absence
					<br />
					Please consider giving them a short grace period, in case they are just delayed

					<br />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>
					<span>
						<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">Permanently Kickout {{ controller.currentPlayerObj().name }}</button>
					</span>
				</template>
			</div>
		</template>

		<template v-if="store.topMenuViews.rewindErrorText !== ''">
			<h1 id="rewindErrorText">{{ store.topMenuViews.rewindErrorText }}</h1>
		</template>

		<!-- ALWAYS SHOWS GAME END-->
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<div id="gameEndDiv">
				Game Over
				<br />
				<br />
				<span v-if="store.oldBoysNetwork.length >= 10">All Cigars Used</span>
				<span v-else-if="store.hexDrawPile.length + store.hexDiscardPile.length === 0">All Tiles Used</span>
				<span v-else>One Player Remaining</span>
				<br />
				<br />
				Winner:
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][0][0]].colour)">{{ store.players[store.history[store.history.length - 1][3][0][0]].displayName }} € {{ store.players[store.history[store.history.length - 1][3][0][0]].score }} M</span>
				</div>

				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][0][0]].name === personal.name">
					<h1>Congratulations!</h1>
				</template>

				<br />
				<span v-if="store.players[store.gameflow.fullTurnOrder[0]].score === store.players[store.gameflow.fullTurnOrder[1]].score">Next in Turn Order</span>
				<span v-else>Outright Winner</span>

				<br />
				<br />
				Fancy a
				<a :href="'/createCNSpage/' + String(personal.gameID) + '/'">rematch</a>
				?
				<br />

				<template v-for="(entry, idx) in store.history[store.history.length - 1][3]" :key="idx">
					<template v-if="idx !== 0">
						{{ getOrdinal(idx + 1) }}:
						<div class="playerScoreSummaryDiv">
							<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].name }} € {{ store.players[entry[0]].score }} M</span>
						</div>
					</template>
					<br />
				</template>
			</div>
		</template>

		<template v-if="personal.canPlay()">
			<!-- TURN 1 INFO -->
			<template v-if="store.gameflow.turn === 1 && !store.topMenuViews.showReplay">
				<h2>Welcome to Cannes!</h2>
				<b>
					NOTE: To see the entire play area, including any table / table junk,
					<br />
					use the "Table" button in the top right, next to the +/- Zoom buttons
				</b>
				<br />
				<br />
				<div class="intro_items_list_div">
					Use this area to carry out your main actions.
					<br />
					Place tiles and links directly on the map below.
					<br />
					Use the area above and right to choose new tiles, increase film prices, sell films, and pirate films.
					<br />
					<br />
					<b>REWIND</b>
					will literally roll the game back by one player turn.
					<br />
					It should not normally be used other than immediately after you have ended your turn,
					<br />
					if you immediately realise you have made a mistake.
					<br />
					Rewinding too much will reveal hidden information about which tiles will be drawn next,
					<br />
					and if the rewind goes too far, it could even change what tiles are drawn.
					<br />
					<br />
					<b>REPLAY</b>
					does not alter the game state in any way. You can view all the moves made from the
					<br />
					start of the game, stepping through move by move, and viewing the game state exactly as it was at that time.
					<br />
					Once you exit replay mode, the game will return to the same state as when you entered replay mode.
					<br />
					Until the game is finished, all "Drawn Tiles" will be obscured during Replay mode.
					<br />
					<br />
					For more information please see
					<b><a class="linkOther" href="/CNS/help/" target="_blank">Cannes Help</a></b>
				</div>
				<br />
			</template>
			<!-- MOVE PIRATE -->
			<template v-if="store.gameflow.phase === rf.PHASE_MOVE_PIRATE">
				Move the pirates to a new party
				<br />
				<br />
				<span v-if="store.context.pirateActionsUsed >= 2">
					As the previous player is connected to all parties and sold multiple pirates,
					<br />
					you may place the pirates in any party
				</span>
				<span v-else>The previous player sold once, so you must move the pirates to a new party</span>
				<br />
				<br />
			</template>
			<!-- CONFIRM RESIGN -->
			<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN">
				<p>Are you sure you want to resign?</p>
				<p>Resigning will unbalance the game for the remaining players</p>
				<p>Please carry on playing if that is at all possible</p>
				<p>Even if you think you can't win, you can still aim for not last / most monuments / funny monument positions / etc</p>
				<button class="actionsLineButton resignButton" @click="resetWholeTurn">Carry On Playing</button>
				<button class="actionsLineButton" @click="Bot.actionResign">Confirm Resignation</button>
			</template>

			<!-- PLACE HEXES -->
			<div v-if="store.gameflow.phase === rf.PHASE_PLACE_HEXES && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_CONFIRM_RESIGN">
				You must place at least one Tile. You may then place a second Tile, or add to your Network
				<span v-if="store.useExpansion && !controller.currentPlayerObj().storedResources.some((value) => value >= 20)">
					<br />
					Instead of placing a Tile, you may store a single Tile instead - it will take up 2 spaces
					<template v-if="controller.currentPlayerObj().links.length === 0">
						<br />
						<span class="warningSpan">You must place a link before being able to store tiles</span>
					</template>
				</span>
				<span v-if="store.context.realEstateAgentsInNetwork === 1">
					<br />
					The estate agent in your network allows you to place an additional Tile (3 total, or 1/2 and then add to your network)
				</span>
				<span v-if="store.context.realEstateAgentsInNetwork === 2">
					<br />
					The 2 estate agents in your network allow you to place 2 additional Tiles (Up to 3 total - you may then also add to your Network)
				</span>
				<span v-if="controller.currentPlayerObj().storedResources.some((value) => value >= 20)">
					<br />
					As an action, you may place your stored Tile
				</span>
				<br />
				<button @click="localCheckResign" v-if="controller.canResign()" class="actionsLineButton resignButton">Resign</button>
				<button @click="resetWholeTurn" class="actionsLineButton">Reset</button>
				<button @click="controller.endCurrentPhase(true)" v-if="canMoveToNetworkPhase(store.context.hexActionsUsed, store.context.realEstateAgentsInNetwork)" class="actionsLineButton">Move on to Network Phase</button>
				<button @click="localEndPlayerTurn(true)" v-if="store.context.hexActionsUsed >= 2" class="actionsLineButton">End Turn</button>
			</div>

			<!-- PLACE LINKS -->
			<div v-if="store.gameflow.phase === rf.PHASE_NETWORK">
				<span v-if="store.context.linksPlacedThisTurn === 0">
					<span v-if="controller.currentPlayerObj().links.length <= 3">You may place 2 Links</span>
					<span v-else-if="controller.currentPlayerObj().links.length == 4">You may place 1 Link and then Move 1 Link</span>
					<span v-else>You may move 2 Links</span>
				</span>
				<span v-if="store.context.linksPlacedThisTurn === 1">
					You have placed 1 link.
					<span v-if="controller.currentPlayerObj().links.length < 5">You may place 1 more</span>
					<span v-else>You may move 1 more</span>
				</span>

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="resetNetworkPhase" class="actionsLineButton">Reset Network</button>
				<button v-if="store.context.action !== rf.ACT_READD_LINK" @click="controller.endCurrentPhase(true)" class="actionsLineButton">Move on to Production Phase</button>
			</div>

			<!-- PRODUCTION -->
			<div v-if="store.gameflow.phase === rf.PHASE_PRODUCTION && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_PIRATE && store.context.action !== rf.ACT_SELL_CANNES">
				Convert Available Resources into New Resources

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button v-if="store.networkPhaseResetData !== ''" @click="resetNetworkPhase" class="actionsLineButton">Reset Network</button>
				<button @click="resetPhase" class="actionsLineButton">Reset Production</button>
				<button @click="controller.endCurrentPhase(true)" class="actionsLineButton">Finish Production</button>
			</div>

			<div v-if="store.gameflow.phase === rf.PHASE_PRODUCTION && store.context.action === rf.ACT_SELL_CANNES">
				         Confirm Movie Sales (See upper right panel)<br />
          <button class="actionsLineButton" @click="localSellMovies">Sell Movies</button>
          <button class="actionsLineButton" @click="cancelSales">Canccel</button>
			</div>

			<!-- STORE RESOURCES -->
			<div v-if="offerResourceStoragePhase()">
				You may only store 5 resources. Click resources to remove them
				<br/>
				<span :class="[{tooManyResources: store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 5}, {tooManyResForTile: store.context.availableResources.reduce((acc, curr) => acc + curr, 0) >=4 && store.context.availableResources.reduce((acc, curr) => acc + curr, 0) <= 5}, {canStoreAllRes : store.context.availableResources.reduce((acc, curr) => acc + curr, 0) <= 3}]">
					(You have {{ store.context.availableResources.reduce((acc, curr) => acc + curr, 0) }} resources
					<span v-if="store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 5"> - you must discard</span>
					<span v-else-if="store.context.availableResources.reduce((acc, curr) => acc + curr, 0) >=4 && store.context.availableResources.reduce((acc, curr) => acc + curr, 0) <= 5"> - you can store all resources, but will be unable to store a tile</span>
					<span v-else> - you can store all resources</span>
					)
				</span>

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button v-if="store.networkPhaseResetData !== ''" @click="resetNetworkPhase" class="actionsLineButton">Reset Network</button>
				<button @click="resetPhase" class="actionsLineButton">Reset Resources</button>
				<button v-if="offerResourceStoragePhaseButton()" class="actionsLineButton" @click="stopStoringResources">Store current resources & End Turn (No room to store a tile)</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
				<span v-if="store.gameflow.phase === rf.PHASE_PRODUCTION">
					<br />
					<br />
					As you have less than
					<span v-if="!store.useExpansion">5</span>
					<span v-else>3</span>
					resources, they will all be stored
					<br />
				</span>

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button v-if="store.networkPhaseResetData !== ''" @click="resetNetworkPhase" class="actionsLineButton">Reset Network</button>

				<button @click="resetPhase" v-if="store.gameflow.phase !== rf.PHASE_PLACE_HEXES" class="actionsLineButton">
					<span v-if="store.gameflow.phase === rf.PHASE_STORE_RES">Reset Resource Phase</span>
					<span v-else>Reset Production Phase</span>
				</button>
				<button @click="controller.endPlayerTurn()" class="actionsLineButton">End Turn</button>
			</div>

			<!-- Confirm PIRATE Turn End -->
			<div v-if="store.context.action === rf.ACT_CONFIRM_PIRATE_PLACEMENT">
				Confirm Pirate Placement
				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">Cancel</button>
				<button @click="controller.endPlayerPiratePlacementTurn()" class="actionsLineButton">Confirm</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.gameflow.phase === rf.PHASE_CONFIRM_PIRATE">
				You have completed pirating movies and now the next player in turn order needs to move the pirates
				<br />
				<br />
				<span class="warningSpan">YOUR ACTIONS UP TO THIS POINT WILL BE SAVED - YOU WILL NOT BE ABLE TO UNDO THEM LATER</span>
				<!--<br/>Your actions up to this point will be saved. You will not be able to undo them later.-->
				<br />
				<br />
				Are you sure you want to end your turn?
				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="resetPhase" v-if="store.gameflow.phase !== rf.PHASE_PLACE_HEXES" class="actionsLineButton">Reset Phase</button>
				<button @click="controller.endPlayerPirateTurn()" class="actionsLineButton">Confirm Turn To This Point</button>
			</div>
		</template>
	</div>
</template>

<style scoped>
.intro_items_list_div {
	width: fit-content;
	text-align: left;
	margin: 9px auto;
}

.warningSpan {
	font-weight: 900;
	color: darkgoldenrod;
}

.resignButton {
	margin-right: 100px;
}

#actionAreaDiv {
	font-weight: bolder;
}

#gameEndDiv {
	font-size: 30px;
	font-weight: bold;
}

#rewindErrorText,
#loggedOutText {
	/*margin: 0;
    width: 100%;*/
	font-weight: bolder;
	/*text-align: center;*/
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.tooManyResources {
	/*background-color: lightgoldenrodyellow;*/
	color: darkred;
}

.tooManyResForTile {
		background-color: lightgoldenrodyellow;
	color: darkred;
}

.canStoreAllRes {
	background-color: lightgreen;
	color: darkgreen;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	font-size: 30px;
	margin: 4px;
	padding: 0px;
}

.playerScoreSummaryDiv span {
	padding: 4px;
	padding-left: 8px;
	padding-right: 8px;
}
</style>
