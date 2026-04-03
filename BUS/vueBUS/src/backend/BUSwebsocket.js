//import { useModelStore } from './stores/BUSstore.js'

import { usePersonalStore } from '../stores/BUSpersonal.js'
import { useModelStore } from "../stores/BUSstore.js"
import * as view from "../js/BUSview.js"

import * as IO from './BUS_IO.js'

export var BUSwebSocket

export async function StartWebSocket() {
  if (typeof BUSwebSocket !== 'undefined') {
    if (BUSwebSocket.readyState === 0 || BUSwebSocket.readyState === 1) return
    else BUSwebSocket.close()
  }
  const personal = usePersonalStore()
  const store = useModelStore()

  var ChannelNumber = personal.gameID

  var wsUri = 'wss://wss.s3.sitereview.io/ws/HomeBUSchannel' + String(ChannelNumber) + '/'

  BUSwebSocket = new WebSocket(wsUri)

  BUSwebSocket.onopen = async function (evt) {
    await BUSwebSocketOnOpen(evt)
  }
  BUSwebSocket.onclose = function (evt) {
    BUSwebSocketOnClose(evt)
  }
  BUSwebSocket.onmessage = function (evt) {
    BUSwebSocketOnInfo(evt)
  }
  BUSwebSocket.onerror = function (evt) {
    BUSwebSocketOnError(evt)
  }
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
