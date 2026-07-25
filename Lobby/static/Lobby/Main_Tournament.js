/* global global */

document.addEventListener("DOMContentLoaded", function () {
	// Add click event to view games
	var clickableGameRows = document.querySelectorAll(".clickableGameRow")

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
	StartWebSocket().catch(() => {
		console.log("WebSocket background task initialized.")
	})
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
	chatArray.push(["Tournament Bot", 0, "Welcome to the lobby for this Tournament!\n\nPlease remember that these are meant to be faster paced games (1+ move per day)"])
	let ts = parseInt(global.MainT_CreationTimestamp / 1000)
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

	let usernameSpan = document.createElement("span")
	usernameSpan.className = "bold"
	usernameSpan.textContent = messageArr[0]
	header.appendChild(usernameSpan)

	let dateSpan = document.createElement("span")
	dateSpan.className = "date"
	dateSpan.textContent = giveFormattedDate(timestamp * 1000) + " " // Assuming giveFormattedDate is defined elsewhere
	header.appendChild(dateSpan)

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
	timestamp -= parseInt(global.MainT_CreationTimestamp / 1000)
	for (let i = 0; i < global.chatArray.length; i++) {
		timestamp -= parseInt(global.chatArray[i][1])
	}

	let csrftoken = getCookie("csrftoken")
	let messageArr = [timestamp, message]

	fetch("/sendMainTchatMessage/", {
		method: "POST",
		body: JSON.stringify({
			action: "sendChatMessage",
			MainT_ID: global.MainT_ID,
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

			MainTwebSocket.send("NEWCHATTS" + String(global.MainT_ID)) //+ String(result.latestUpdate));
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
var MainTwebSocket
let MainTconnectionPromise = null // Track the in-progress connection

let retryCount = 0
const MAX_RETRIES = 13 // Uses 3 tries per attempt
const BASE_RETRY_DELAY = 2000

async function StartWebSocket() {
	if (MainTwebSocket && MainTwebSocket.readyState === 1) return MainTwebSocket
	if (MainTconnectionPromise) return MainTconnectionPromise

	if (retryCount >= MAX_RETRIES) {
		console.error("Max WebSocket retries reached.")
		return null
	}

	MainTconnectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (MainTwebSocket) MainTwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null) // Resolve null to prevent "Uncaught Promise" errors
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			MainTconnectionPromise = null
		}

		const handleFailure = (reason) => {
			retryCount++
			console.warn(`WS Attempt ${retryCount} failed: ${reason}`)

			if (retryCount < MAX_RETRIES) {
				const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount - 1)
				setTimeout(StartWebSocket, delay)
			} else {
				//
			}
		}

		try {
			// Logic to prevent multiple native connections
			if (MainTwebSocket && MainTwebSocket.readyState === 0) {
				// Wait for existing native attempt
			} else {
				if (MainTwebSocket) MainTwebSocket.close()
				let wsUri = "wss://wss.s3.sitereview.io/ws/HomeMainTchannel" + String(global.MainT_ID) + "/"
				MainTwebSocket = new WebSocket(wsUri)
			}

			MainTwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				MainTwebSocketOnOpen(evt)
				resolve(MainTwebSocket)
			}

			MainTwebSocket.onclose = () => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}

			MainTwebSocket.onerror = (_evt) => {
				cleanup()
				handleFailure("Socket Error (Blocked)")
				resolve(null)
			}

			MainTwebSocket.onmessage = (evt) => MainTwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return MainTconnectionPromise
}

function MainTwebSocketOnOpen(_evt) {
	//ConnectionStatus = "CONNECTED";
}

async function MainTwebSocketOnInfo(IncomingInfo) {
	if (IncomingInfo.data.slice(0, 9) === "NEWCHATTS") {
		if (IncomingInfo.data.slice(9) == global.MainT_ID) {
			reloadChatData()
		}
	}
}

async function reloadChatData() {
	let csrftoken = getCookie("csrftoken")

	// Function to fetch data from the database
	try {
		const response = await fetch("/reloadMainTchatData/", {
			method: "POST",
			body: JSON.stringify({
				MainT_ID: global.MainT_ID,
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
