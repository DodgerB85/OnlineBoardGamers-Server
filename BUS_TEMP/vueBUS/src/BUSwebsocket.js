//import { useModelStore } from './stores/model.js'

import { usePersonalStore } from './stores/personal.js'
import { useModelStore } from "./stores/model.js"

import * as IO from './BUS_IO'

export var BusWebSocket

export async function StartWebSocket() {
  if (typeof BusWebSocket !== 'undefined') {
    if (BusWebSocket.readyState === 0 || BusWebSocket.readyState === 1) return
    else BusWebSocket.close()
  }
  const personal = usePersonalStore()
  const model = useModelStore()


  var ChannelNumber = personal.gameID

  //wsUri = "wss://connect.websocket.in/v3/" + ChannelNumber + "?apiKey=***REMOVED***";
  //wsUri = "wss://socketsbay.com/wss/v2/10/5c77d2bb57dcf99bd4bdea1584117526/";
  // var wsUri = "wss://socketsbay.com/wss/v2/" + String(ChannelNumber) + "/5c77d2bb57dcf99bd4bdea1584117526/";
  //var wsUri = "wss://wss.s3.sitereview.io/ws/allFCMchannels/";
  var wsUri = 'wss://wss.s3.sitereview.io/ws/HomeBusChannel' + String(ChannelNumber) + '/'

  //wss://wss.s3.sitereview.io/ws/anythingyoulikehere/

  // Alternate Jonny Server

  // wss://wsserver.fly.dev/ws/yourchannelhere/

  BusWebSocket = new WebSocket(wsUri)

  BusWebSocket.onopen = async function (evt) {
    await BusWebSocketOnOpen(evt)
  }
  BusWebSocket.onclose = function (evt) {
    BusWebSocketOnClose(evt)
  }
  BusWebSocket.onmessage = function (evt) {
    BusWebSocketOnInfo(evt)
  }
  BusWebSocket.onerror = function (evt) {
    BusWebSocketOnError(evt)
  }
}

function BusWebSocketOnOpen() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSconnected'
  personal.liveWS = true
}

function BusWebSocketOnClose() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSdisconnected'
  // Reconnect after a delay
  setTimeout(StartWebSocket, 2000)
}

function BusWebSocketOnError() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSdisconnected'
  // Reconnect after a delay
  setTimeout(StartWebSocket, 2000)
}

async function BusWebSocketOnInfo(IncomingInfo) {
  const personal = usePersonalStore()
  const model = useModelStore()


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
            tempElement.innerHTML = model.gameName
            // Get the decoded text
            let decodedGameName = tempElement.textContent
  
            Notification.requestPermission(function (status) {
              const title = "It is your turn in Bus"
  
              const options = {
                body: "" + decodedGameName + ": " + model.gameflow.turn + " - " + model.phaseStr(),
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
        BusWebSocket.send('NEWDATATS' + String(personal.gameID) + String(personal.latestUpdate))
    }
  }
}
