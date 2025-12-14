/* global global */

document.addEventListener("DOMContentLoaded", function () {
	// Add click event to view games
	var clickableGameRows = document.querySelectorAll(".clickableGameRow")

	/*clickableGameRows.forEach(function (row) {
		row.addEventListener("click", function () {
			var prefix = ""
			if (row.classList.contains("FCM")) prefix = "/FCM/"
			else if (row.classList.contains("HC")) prefix = "/HC/"
			else if (row.classList.contains("Bus")) prefix = "/Bus/"
			else if (row.classList.contains("AQY")) prefix = "/AQY/"
			else if (row.classList.contains("IND")) prefix = "/IND/"

			if (prefix !== "") {
				window.open(prefix + this.id.slice(8), "_self")
			}
		})
	})*/

	// Add click to cusom map
	var customMapImages = document.querySelectorAll(".startingMap")
	for (let i = 0; i < customMapImages.length; i++) {
		customMapImages[i].onclick = function (e) {
			e.stopPropagation() // stops the browser from redirecting.
			e.preventDefault()
			document.getElementById("mapData").value = this.getAttribute("data-map")

			let form = document.getElementById("openInMapEditorForm")
			form.submit()
		}
		customMapImages[i].onmouseenter = function () {
			this.style.opacity = "0.4"
			this.style.cursor = "pointer"
		}

		customMapImages[i].onmouseleave = function () {
			this.style.opacity = ""
		}
	}

	// Add chat button click
	const chatButton = document.querySelector("#sendMessageButton")
	chatButton.removeEventListener("click", sendChatMessage)
	chatButton.addEventListener("click", sendChatMessage)

	// Display the chat
	reparseChatData()

	// Start WS
	StartWebSocket()
})

function reparseChatData() {
	let messageListDiv = document.getElementById("messageList")
	messageListDiv.innerHTML = ""
	let chatArray = []
	if (global.chatData !== "") {
		let compressedData = Uint8Array.from(atob(global.chatData), (c) => c.charCodeAt(0))
		// eslint-disable-next-line no-undef
		let decompressedData = pako.ungzip(compressedData, { to: "string" })
		chatArray = JSON.parse(decompressedData)
		global.chatArray = JSON.parse(decompressedData)
	}
	chatArray.push(["MT Bot", 0, "Welcome to the lobby for this Mini Tournament!\n\nPlease remember that these are meant to be fast paced games (several moves per day), so don't join if you won't have the time for fast play"])
	let ts = parseInt(global.MT_CreationTimestamp / 1000)
	for (let i = chatArray.length - 1; i >= 0; i--) {
		ts += parseInt(chatArray[i][1])
		addMessageToDisplay.call(this, chatArray[i], ts)
	}
}

function addMessageToDisplay(messageArr, timestamp) {
	let div = document.createElement("div")
	div.className = "chatentry"

	let header = document.createElement("div")
	header.className = "header"

	let dateSpan = document.createElement("span")
	dateSpan.className = "date"
	dateSpan.textContent = giveFormattedDate(timestamp * 1000) + " " // Assuming giveFormattedDate is defined elsewhere
	header.appendChild(dateSpan)

	let usernameSpan = document.createElement("span")
	usernameSpan.className = "bold"
	usernameSpan.textContent = messageArr[0]
	header.appendChild(usernameSpan)

	div.appendChild(header)
	//messageArr[2] = messageArr[2].replace(/=-NEWLINE-=/g, "\n")
	//messageArr[2] = messageArr[2].replace(/ZQ/g, "\n")
	//messageArr[2] = messageArr[2].replace(/\n/g, "<br/>")
	let messageBody = messageArr[2]
		//
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/ZQ/g, "<br/>")
		.replace(/\n/g, "<br/>")

	let bodyDiv = document.createElement("div")
	bodyDiv.className = "body"
	bodyDiv.innerHTML = messageBody // Use innerHTML to render the <br/> tags
	div.appendChild(bodyDiv)

	let messageList = document.getElementById("messageList")

	messageList.prepend(div)
}

function giveFormattedDate(timestamp) {
	let d = new Date(timestamp)
	/*let res = d.getFullYear() + "/"
	if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
	else res += d.getMonth() + 1 + "/"
	if (d.getDate() < 10) res += "0" + d.getDate() + " "
	else res += d.getDate() + " "
	if (d.getHours() < 10) res += "0" + d.getHours() + ":"
	else res += d.getHours() + ":"
	if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
	else res += d.getMinutes() + ":"
	if (d.getSeconds() < 10) res += "0" + d.getSeconds()
	else res += d.getSeconds()*/

	let res = ""
	if (d.getHours() < 10) res += "0" + d.getHours() + ":"
	else res += d.getHours() + ":"
	if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
	else res += d.getMinutes() + ":"
	if (d.getSeconds() < 10) res += "0" + d.getSeconds()
	else res += d.getSeconds()
	res += " "
	if (d.getDate() < 10) res += "0" + d.getDate() + "/"
	else res += d.getDate() + "/"
	if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
	else res += d.getMonth() + 1 + "/"
	res += d.getFullYear()

	return res
}

async function sendChatMessage() {
	const chatButton = document.querySelector("#sendMessageButton")
	chatButton.disabled = true
	chatButton.textContent = "Sending...."

	const chatMessageInput = document.getElementById("chatMessage")
	const message = chatMessageInput.value

	if (message.length === 0) {
		chatButton.disabled = false
		chatButton.textContent = "Enter a message first! Send"
		return
	}

	chatMessageInput.value = ""
	let timestamp = parseInt(new Date().getTime() / 1000)
	timestamp -= parseInt(global.MT_CreationTimestamp / 1000)
	for (let i = 0; i < global.chatArray.length; i++) {
		timestamp -= parseInt(global.chatArray[i][1])
	}

	let csrftoken = getCookie("csrftoken")
	let messageArr = [timestamp, message]

	fetch("/sendMTchatMessage/", {
		method: "POST",
		body: JSON.stringify({
			action: "sendChatMessage",
			MT_ID: global.MT_ID,
			//message: htmlEscape(message),
			newEntry: messageArr,
		}),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			if (!result.chatData) {
				alert("Sorry, there was a problem. Please email the webmaster directly")
				return
			}
			global.chatData = result.chatData

			MTwebSocket.send("NEWCHATTS" + String(global.MT_ID)) //+ String(result.latestUpdate));
			reparseChatData()
			chatButton.disabled = false
			chatButton.textContent = "Send"
		})
		.catch((error) => {
			console.log("Error:", error)
		})
}

function getCookie(name) {
	let cookieValue = null
	if (document.cookie && document.cookie !== "") {
		let cookies = document.cookie.split(";")
		for (let i = 0; i < cookies.length; i++) {
			let cookie = cookies[i].trim()
			// Does this cookie string begin with the name we want?
			if (cookie.substring(0, name.length + 1) === name + "=") {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
				break
			}
		}
	}
	return cookieValue
}

/******* WS */
var MTwebSocket

async function StartWebSocket() {
	if (typeof MTwebSocket !== "undefined") {
		if (MTwebSocket.readyState === 0 || MTwebSocket.readyState === 1) return
		else MTwebSocket.close()
	}

	let ChannelNumber = global.MT_ID
	//ChannelNumber = 255

	//wsUri = "wss://connect.websocket.in/v3/" + ChannelNumber + "?apiKey=***REMOVED***";
	//wsUri = "wss://socketsbay.com/wss/v2/10/5c77d2bb57dcf99bd4bdea1584117526/";
	// let wsUri = "wss://socketsbay.com/wss/v2/" + String(ChannelNumber) + "/5c77d2bb57dcf99bd4bdea1584117526/";
	//FCMwebSocket.close();
	//let wsUri = "wss://wss.s3.sitereview.io/ws/allFCMchannels/";
	let wsUri = "wss://wss.s3.sitereview.io/ws/HomeMThannel" + String(ChannelNumber) + "/"

	//wss://wss.s3.sitereview.io/ws/anythingyoulikehere/

	// Alternate Jonny Server

	// wss://wsserver.fly.dev/ws/yourchannelhere/

	MTwebSocket = new WebSocket(wsUri)

	MTwebSocket.onopen = async function (evt) {
		MTwebSocketOnOpen(evt)
	}
	MTwebSocket.onclose = function (evt) {
		MTwebSocketOnClose(evt)
	}
	MTwebSocket.onmessage = function (evt) {
		MTwebSocketOnInfo(evt)
	}
	MTwebSocket.onerror = function (evt) {
		MTwebSocketOnError(evt)
	}
}

function MTwebSocketOnOpen(evt) {
	//ConnectionStatus = "CONNECTED";
}

function MTwebSocketOnClose(evt) {
	MTwebSocket.close()
	//setTimeout(StartWebSocket, 2000)
}

function MTwebSocketOnError(evt) {
	//document.getElementById("liveDiv").innerHTML = gettext("Error")
	setTimeout(StartWebSocket, 2000)
}

async function MTwebSocketOnInfo(IncomingInfo) {
	if (IncomingInfo.data.slice(0, 9) === "NEWCHATTS") {
		if (IncomingInfo.data.slice(9) == global.MT_ID) {
			reloadChatData()
		}
	}
}

	async function reloadChatData() {
		let csrftoken = getCookie("csrftoken")

		// Function to fetch data from the database
		try {
			const response = await fetch("/reloadMTchatData/", {
				method: "POST",
				body: JSON.stringify({
					MT_ID: global.MT_ID,
				}),
				headers: { "X-CSRFToken": csrftoken },
			})

			if (!response.ok) {
				throw new Error("Network response was not ok")
			}
			const data = await response.json()

			global.chatData = data.chatData
			reparseChatData()
		} catch (error) {
			console.error("Error fetching data:", error)
		}
	}


/******* END WS */