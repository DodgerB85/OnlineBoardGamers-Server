import * as refFuncs from './refFuncs'
import * as WS from './BUSwebsocket'
import * as Bot from './BUSbot'
import * as constants from './constants'

import { useModelStore } from './stores/model.js'

import { usePersonalStore } from './stores/personal.js'

export const SPLOTTER_CON_USERS = ["admin", "DodgerB", 'agundlachi', 'pgh_gamer', 'cheen']


export async function saveGame(saveRewind) {
  const model = useModelStore()
  const personal = usePersonalStore()

  model.topMenuViews.showLoader = true

  if (personal.liveWS && WS.BusWebSocket.readyState !== 1) {
    await WS.StartWebSocket()
    await refFuncs.sleep(2000)
  }

  let csrftoken = refFuncs.getCookie('csrftoken')

  if (personal.latestUpdate == undefined) personal.latestUpdate = '9999999999999'

  let postData = {
    action: 'save', // USED
    latestUpdate: personal.latestUpdate, // USED
    data: model.exportModel(),
    turn: model.gameflow.turn, // USED
    phase: model.gameflow.phase, // USED
    status: 'ACTIVE', // USED - only if FINISHED
    gameID: personal.gameID, // USED
    saveRewind: saveRewind
  }
  if (model.gameflow.turnOrder.length > 0)
    postData.nextPlayer = [model.players[model.gameflow.turnOrder[0]].name]
  // USED > goes to currentPlayers
  else {
    if (model.gameflow.gameEnded === 0) alert("ZERO TO LENGTH")
    model.gameflow.turnOrder.push(0)
    postData.nextPlayer = [model.players[model.gameflow.turnOrder[0]].name]
    postData.data = model.exportModel()
  }

  // GAME ENDED
  if (model.gameflow.gameEnded > 0) {
    postData.status = 'FINISHED' // USED
    postData.winner = model.getWinnerName()[0] // USED
    postData.saveRewind = false
    let finalPositions = [...model.players]
    let cmp = (a, b) => (a > b) - (a < b)
    finalPositions.sort(function (a, b) {
      return cmp(b.score, a.score) || cmp(b.timeStones, a.timeStones)
    })
    let finalPositionsNames = []
    for (let i = 0; i < finalPositions.length; i++) finalPositionsNames.push(finalPositions[i].name)
    postData.finalPositions = finalPositionsNames
  }
  if (personal.removeCurrentFlexTime) {
    personal.removeCurrentFlexTime = false
    postData.checkName = personal.removeCurrentFlexTimeName
    personal.removeCurrentFlexTimeName = ""
  }

  try {
    const response = await fetch('/BUS/processBUSturn/', {
      method: 'POST',
      body: JSON.stringify(postData),
      headers: { 'X-CSRFToken': csrftoken }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    if (data.syncError) {
      alert('It appears you have an older version of the game. Please refresh the page')
      return
    }
    personal.latestUpdate = data.latestUpdate
    personal.secondsToNextKickout = data.secondsToNextKickout

    // Broadcast update
    if (WS.BusWebSocket.readyState === 1) WS.BusWebSocket.send('NEWDATATS' + String(personal.gameID) + String(personal.latestUpdate))
    else if (personal.liveWS) {
      await WS.StartWebSocket()
      await refFuncs.sleep(2000)
      if (personal.liveWS && WS.BusWebSocket.readyState === 1) WS.BusWebSocket.send('NEWDATATS' + String(personal.gameID) + String(personal.latestUpdate))
      else console.log("2xTO: " + WS.BusWebSocket.readyState)
    }

    model.topMenuViews.showLoader = false
    model.startPlayerTurn()
  } catch (error) {
    console.error('Error fetching data:', error)
    alert('Error saving the game')
  }
}

export async function sendChatMessage(newEntry) {
  const model = useModelStore()
  const personal = usePersonalStore()
  model.topMenuViews.showLoader = true

  let csrftoken = refFuncs.getCookie('csrftoken')

  try {
    const response = await fetch('/BUS/sendChatMessage/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'sendChatMessage',
        player: personal.name,
        gameID: personal.gameID,
        newEntry: newEntry
      }),
      headers: { 'X-CSRFToken': csrftoken }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    if (!data.chatData) {
      alert('Sorry, there was a problem. Please email the webmaster directly')
      return
    }
    model.chatData = model.decompressChatData(data.chatData)
    if (personal.liveWS) WS.BusWebSocket.send('NEWCHATTS' + String(personal.gameID)) //+ String(result.latestUpdate));
    model.topMenuViews.showLoader = false
  } catch (error) {
    console.error('Error sending chat:', error)
    alert('Error sending chat message')
  }
}

export async function saveBoardPreference(boardNumber) {
  const personal = usePersonalStore()

  let csrftoken = refFuncs.getCookie('csrftoken')

  try {
    const response = await fetch('/BUS/changeBUSviewport/', {
      method: 'PUT',
      body: JSON.stringify({
        action: 'saveBoardPreference',
        playerNumber: personal.pov,
        gameID: personal.gameID,
        boardNumber: boardNumber
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-CSRFToken': csrftoken
      }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    //const data = await response.json()
  } catch (error) {
    console.error('Error zooming:', error)
  }
}

export async function reloadGameData() {
  const model = useModelStore()
  const personal = usePersonalStore()
  let csrftoken = refFuncs.getCookie('csrftoken')
  model.topMenuViews.showLoader = true

  // Function to fetch data from the database
  try {
    const response = await fetch('/BUS/data/2/', {
      method: 'POST',
      body: JSON.stringify({
        gameID: personal.gameID
      }),
      headers: { 'X-CSRFToken': csrftoken }
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    model.importModel(data.gameData)
    personal.secondsToNextKickout = data.secondsToNextKickout
    personal.latestUpdate = data.latestUpdate
    model.topMenuViews.showLoader = false
    model.startPlayerTurn()
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

export async function reloadChatData() {
  const model = useModelStore()
  const personal = usePersonalStore()
  let csrftoken = refFuncs.getCookie('csrftoken')

  // Function to fetch data from the database
  try {
    const response = await fetch('/BUS/data/3/', {
      method: 'POST',
      body: JSON.stringify({
        gameID: personal.gameID
      }),
      headers: { 'X-CSRFToken': csrftoken }
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    if (data.gameDoesNotExist === true) location.reload()

    model.chatData = model.decompressChatData(data.chatData)
    if (!personal.inhibitChatPopup) model.topMenuViews.showChat = true
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

export async function saveNotes() {
  const model = useModelStore()
  const personal = usePersonalStore()
  model.topMenuViews.showLoader = true

  let csrftoken = refFuncs.getCookie('csrftoken')

  try {
    const response = await fetch('/BUS/saveNotes/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveNotes',
        player: personal.name,
        gameID: personal.gameID,
        notes: refFuncs.htmlEscape(personal.notes)
      }),
      headers: { 'X-CSRFToken': csrftoken }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    if (!data.notePosted) {
      alert('Sorry, there was a problem. Please email the webmaster directly')
      return
    }

    model.topMenuViews.showLoader = false
  } catch (error) {
    console.error('Error saving Notes:', error)
    alert('Error saving Notes')
  }
}

export async function loadRewind() {
  const model = useModelStore()
  const personal = usePersonalStore()
  model.topMenuViews.showLoader = true
  let csrftoken = refFuncs.getCookie('csrftoken')

  if (model.gameflow.gameEnded > 0) {
    model.rewindErrorText = 'Error: Game Ended'
    model.performingRewind = false
    model.topMenuViews.showLoader = false
    return
  }
  if (model.topMenuViews.showReplay) {
    model.rewindErrorText = 'Error: Exit Replay Mode First'
    model.performingRewind = false
    model.topMenuViews.showLoader = false
    return
  }

  try {
    const response = await fetch('/BUS/processBUSturn/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'loadRewind',
        gameID: personal.gameID
      }),
      headers: { 'X-CSRFToken': csrftoken }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    if (data.syncError) {
      alert('It appears you have an older version of the game. Please refresh the page')
      model.performingRewind = false
      return
    }
    personal.latestUpdate = data.latestUpdate
    // Hide the dropdown
    if (data.errorMessage) {
      model.rewindErrorText = data.errorMessage
      model.performingRewind = false
      model.startPlayerTurn()
    } else {
      model.importModel(data.gameData)

      model.history.push([
        constants.HIST_REWIND,
        personal.pov,
        Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp),
        []
      ])

      // Re kick booted players
      for (let i = 0; i < data.missingPlayers.length; i++) {
        for (let j = 0; j < model.players.length; j++) {
          if (model.players[j].name == data.missingPlayers[i]) {
            model.players[j].displayName = 'BusBot'
            model.players[j].score = 0
          }
        }
      }

      // Send back to DB with another save
      updateDataFromLoadRewind()
    }
    model.topMenuViews.showLoader = false
  } catch (error) {
    console.error('Error rewinding data:', error)
    alert('Error rewinding the game')
    model.performingRewind = false
  }
}

async function updateDataFromLoadRewind() {
  const model = useModelStore()
  const personal = usePersonalStore()
  model.topMenuViews.showLoader = true
  let csrftoken = refFuncs.getCookie('csrftoken')
  // IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER

  try {
    const response = await fetch('/BUS/processBUSturn/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateDataFromLoadRewind',
        turn: model.gameflow.turn,
        nextPlayer: [model.players[model.gameflow.turnOrder[0]].name], // USED > goes to currentPlayers
        gameID: personal.gameID,
        phase: model.gameflow.phase,
        gameData: model.exportModel()
      }),
      headers: { 'X-CSRFToken': csrftoken }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    personal.latestUpdate = data.latestUpdate
    personal.secondsToNextKickout = data.secondsToNextKickout
    if (WS.BusWebSocket.readyState === 1)
      WS.BusWebSocket.send('NEWDATATS' + String(personal.gameID) + String(personal.latestUpdate))
    else if (personal.liveWS && WS.BusWebSocket.readyState === 0) {
      refFuncs.sleepPause(1000)
      if (personal.liveWS && WS.BusWebSocket.readyState === 1)
        WS.BusWebSocket.send('NEWDATATS' + String(personal.gameID) + String(personal.latestUpdate))
    }
    model.topMenuViews.showLoader = false
    model.performingRewind = false
    Bot.actionAnyBotMooves()
    model.resetVarsOnTurnEnd()
    model.startPlayerTurn()
  } catch (error) {
    console.error('Error updating data:', error)
    alert('Error updating the game')
    model.performingRewind = false
    model.startPlayerTurn()
  }
}

export async function resign() {
  /* ONLY GET HERE DURING ACTION SELECTION IF NOT LAST PERSON */
  const model = useModelStore()
  const personal = usePersonalStore()

  // Add history, and remove player
  model.history.push([
    constants.HIST_RESIGN,
    model.gameflow.turnOrder[0],
    Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp),
    []
  ])
  model.resetVarsOnTurnEnd()
  model.gameflow.turnOrder.shift()

  model.topMenuViews.showLoader = true
  let csrftoken = refFuncs.getCookie('csrftoken')

  try {
    const response = await fetch('/BUS/processBUSturn/', {
      method: 'POST',
      body: JSON.stringify({
        gameID: personal.gameID,
        action: 'resign',
        user: personal.name
      }),
      headers: { 'X-CSRFToken': csrftoken }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    //const data = await response.json()
    Bot.actionResign()
    model.startPlayerTurn()
  } catch (error) {
    console.error('Error resiging:', error)
    alert('Error Resigning')
  }
}

export async function saveGameDataAfterKickout() {
  const model = useModelStore()
  const personal = usePersonalStore()
  model.topMenuViews.showLoader = true
  let csrftoken = refFuncs.getCookie('csrftoken')

  var postData = {
    action: 'saveGameDataAfterKickout',
    gameID: personal.gameID,
    kickedName: model.players[model.gameflow.turnOrder[0]].name,
    latestUpdate: personal.latestUpdate
  }

  try {
    const response = await fetch('/BUS/processBUSturn/', {
      method: 'POST',
      body: JSON.stringify(postData),
      headers: { 'X-CSRFToken': csrftoken }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data = await response.json()
    if (data.syncError) {
      alert('It appears you have an older version of the game. Please refresh the page')
      return
    }
    personal.latestUpdate = data.latestUpdate
    // Now set the game to the next state
    // Count non players and end game if only 1 left
    var nbNonPlayers = 0
    for (let i = 0; i < model.players.length; i++)
      if (model.players[i].displayName === 'BusBot') nbNonPlayers++

    if (nbNonPlayers >= model.players.length - 1) {
      // Only 1 player left, so end game
      model.gameflow.phase = constants.PHASE_GAME_OVER
      model.gameflow.gameEnded = 4
      model.endGame()
      saveGame(false)
      return
    } else {
      Bot.actionAnyBotMooves()
      saveGame(true)
      model.startPlayerTurn()
    }
  } catch (error) {
    console.error('Error kicking:', error)
    alert('Error Kicking')
  }
}

export async function saveZoom(zoomLevel) {
  //const model = useModelStore()
  const personal = usePersonalStore()
  let csrftoken = refFuncs.getCookie('csrftoken')

  try {
    const response = await fetch('/BUS/changeBusViewport/', {
      method: 'PUT',
      body: JSON.stringify({
        action: 'zoom',
        zoomLevel: String(zoomLevel),
        playerNumber: personal.pov,
        allPlayers: personal.trainingGame,
        gameID: personal.gameID
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-CSRFToken': csrftoken
      }
    })
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
  } catch (error) {
    console.error('Error zooming:', error)
  }
}

export async function castVote(topic) {
	const model = useModelStore()
	const personal = usePersonalStore()

	model.topMenuViews.showLoader = true
  let csrftoken = refFuncs.getCookie('csrftoken')

	let postData = {
		action: "castVote", // USED
		topic: topic, // USED
		gameID: personal.gameID, // USED
	}

	try {
		const response = await fetch("/BUS/castVote/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			 model.rewindErrorText = "Error; Contact Admin"
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		model.topMenuViews.showLoader = false
		if (data.voteChanged === true) {
			model.successText = "Vote Saved"

			if (topic === constants.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				model.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			}
			else if (topic === constants.STATS_EXCLUDE_VOTE_TOPIC) {
				personal.votedToExclude = true
				model.statsExcludeVotesData = JSON.parse(data.votesData)
			}

		} else  model.rewindErrorText = "Error; Contact Admin"
	} catch (error) {
		console.error("Error fetching data:", error)
		 model.rewindErrorText = "Error; Contact Admin"
		return false
	}
}
