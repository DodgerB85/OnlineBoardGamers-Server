//import { useModelStore } from './stores/BUSstore.js'

import { usePersonalStore } from '../stores/BUSpersonal.js'
import { useModelStore } from "../stores/BUSstore.js"
import * as view from "../js/BUSview.js"

import * as IO from './BUS_IO.js'

export var BUSwebSocket
let BUSconnectionPromise = null // Track the in-progress connection

export async function StartWebSocket() {
  const personal = usePersonalStore()
  // 1. If already open, return immediately
  if (BUSwebSocket && BUSwebSocket.readyState === 1) {
    return BUSwebSocket
  }

  // 2. If currently connecting, return the existing promise
  if (BUSconnectionPromise) {
    return BUSconnectionPromise
  }

  // 3. Create a new connection promise
  BUSconnectionPromise = new Promise((resolve, reject) => {
    if (typeof BUSwebSocket !== "undefined" && BUSwebSocket.readyState === 0) {
      // Already in native connecting state, just attach listeners
    } else {
      if (BUSwebSocket) BUSwebSocket.close()
      let ChannelNumber = personal.gameID
      let wsUri = "wss://wss.s3.sitereview.io/ws/HomeBUSchannel" + String(ChannelNumber) + "/"
      BUSwebSocket = new WebSocket(wsUri)
    }

    BUSwebSocket.onopen = function (evt) {
      BUSconnectionPromise = null // Clear promise on success
      BUSwebSocketOnOpen(evt)
      resolve(BUSwebSocket)
    }

    BUSwebSocket.onclose = function (evt) {
      BUSconnectionPromise = null
      BUSwebSocketOnClose(evt)
    }

    BUSwebSocket.onerror = function (evt) {
      BUSconnectionPromise = null
      BUSwebSocketOnError(evt)
      reject(evt)
    }

    BUSwebSocket.onmessage = function (evt) {
      BUSwebSocketOnInfo(evt)
    }
  })

  return BUSconnectionPromise
}

function BUSwebSocketOnOpen() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSconnected'
  personal.liveWS = true
}

function BUSwebSocketOnClose() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSdisconnected'
  // Reconnect after a delay
  setTimeout(StartWebSocket, 2000)
}

function BUSwebSocketOnError() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSdisconnected'
  // Reconnect after a delay
  setTimeout(StartWebSocket, 2000)
}

async function BUSwebSocketOnInfo(IncomingInfo) {
  const personal = usePersonalStore()
  const store = useModelStore()


  //alert(JSON.stringify(IncomingInfo.data, null, 4));
  //alert(IncomingInfo.data.slice(0, 16))
  //alert(IncomingInfo.data.slice(16))

  if (IncomingInfo.data.slice(0, 16) === 'MESSAGEFROMADIN=') {
    alert(IncomingInfo.data.slice(16))
  }

  if (IncomingInfo.data.slice(0, 9) === 'NEWCHATTS') {
    if (IncomingInfo.data.slice(9) == personal.gameID) {
      IO.reloadChatData()
    }
  }

  if (IncomingInfo.data.slice(0, 9) === 'NEWDATATS') {
    if (IncomingInfo.data.slice(9, -13) == personal.gameID) {
      var newTS = parseInt(IncomingInfo.data.slice(-13))
      if (newTS > personal.latestUpdate) {
        personal.latestUpdate = newTS
        personal.kickoutRequired = false
        await IO.reloadGameData()
        if (personal.canPlay() && personal.yourTurnAudioType > 0) {
          let beep
          if (personal.yourTurnAudioType === 1) beep = new Audio('/static/BUS/sounds/beep.mp3')
          if (personal.yourTurnAudioType === 2)
            beep = new Audio('/static/BUS/sounds/bell.mp3')
          beep.play()
        }

        if (personal.canPlay()) {
          // Check the browser is capable
          if ("serviceWorker" in navigator && "PushManager" in window) {
            let tempElement = document.createElement("div")
            tempElement.innerHTML = store.gameName
            // Get the decoded text
            let decodedGameName = tempElement.textContent
  
            Notification.requestPermission(function (status) {
              const title = "It is your turn in Bus"
  
              const options = {
                body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
                //badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
                icon: "/static/BUS/images/bus_icon.png",
                tag: "OBGgame",
              }
  
              var n = new Notification(title, options)
              n.onclick = function (event) {
                //event.preventDefault() // Prevents the browser from focusing the Notification's tab
                //window.open("http://localhost:8000/IND/54/", "_blank")
                // Check if the window client exists
                window.focus()
                n.close()
              }
            })
          }
        }


      } else
        BUSwebSocket.send('NEWDATATS' + String(personal.gameID) + String(personal.latestUpdate))
    }
  }
}


export async function broadcastGameUpdate(existingPromise = null) {
  const personal = usePersonalStore()
  if (!personal.liveWS) return

  try {
    // If we already started connecting in the previous function, use that.
    // Otherwise, start a new check.
    const socket = await (existingPromise || StartWebSocket())

    if (socket.readyState === 1) {
      socket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
    }
  } catch (err) {
    console.warn("BUS Broadcast failed:", err)
  }
}