import { useModelStore } from '../stores/TGZstore.js'
import { usePersonalStore } from '../stores/TGZpersonal.js'

import * as IO from './TGZ_IO'
import * as view from './TGZview'

export var TGZwebSocket

export async function StartWebSocket() {
  if (typeof TGZwebSocket !== 'undefined') {
    if (TGZwebSocket.readyState === 0 || TGZwebSocket.readyState === 1) return
    else TGZwebSocket.close()
  }
  const personal = usePersonalStore()

  var ChannelNumber = personal.gameID

 var wsUri = 'wss://wss.s3.sitereview.io/ws/HomeTGZchannel' + String(ChannelNumber) + '/'

  TGZwebSocket = new WebSocket(wsUri)

  TGZwebSocket.onopen = async function (evt) {
    await TGZwebSocketOnOpen(evt)
  }
  TGZwebSocket.onclose = function (evt) {
    TGZwebSocketOnClose(evt)
  }
  TGZwebSocket.onmessage = function (evt) {
    TGZwebSocketOnInfo(evt)
  }
  TGZwebSocket.onerror = function (evt) {
    TGZwebSocketOnError(evt)
  }
}

async function TGZwebSocketOnOpen() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSconnected'
  personal.liveWS = true
  IO.checkForLatestData()
}

function TGZwebSocketOnClose() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSdisconnected'
  // Reconnect after a delay
  setTimeout(StartWebSocket, 2000)
}

function TGZwebSocketOnError() {
  const personal = usePersonalStore()
  personal.WSstatus = 'WSdisconnected'
  // Reconnect after a delay
  setTimeout(StartWebSocket, 2000)
}

async function TGZwebSocketOnInfo(IncomingInfo) {
  const store = useModelStore()
  const personal = usePersonalStore()

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
        store.topMenuViews.showReplay = false
        personal.latestUpdate = newTS
        personal.kickoutRequired = false
        await IO.reloadGameData()
        if (personal.yourTurnAudioType > 0) {
          let beep
          if (personal.yourTurnAudioType == 1) beep = new Audio('/static/TGZ/sounds/beep.mp3')
          if (personal.yourTurnAudioType == 2)
            beep = new Audio('/static/TGZ/sounds/bell.mp3')
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
              const title = "It is your turn in The Great Zimbabwe"
  
              const options = {
                body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
                //badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
                icon: "/static/TGZ/images/tgz_icon.png",
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
        TGZwebSocket.send('NEWDATATS' + String(personal.gameID) + String(personal.latestUpdate))
    }
  }
}
