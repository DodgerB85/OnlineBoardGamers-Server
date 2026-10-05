document.addEventListener("DOMContentLoaded", () => {
	const dialog = document.getElementById("gameMomentumDialog")
	if (!dialog) return
	const message = document.getElementById("gameMomentumMessage")
	const targets = document.getElementById("gameMomentumTargets")
	const streak = document.getElementById("gameMomentumStreak")
	let currentGameID
	async function getMomentum(gameID) {
		const response = await fetch(`/gameMomentum/${gameID}/`, { headers: { Accept: "application/json" } })
		if (!response.ok) throw new Error("Unable to load game momentum. You must be a player in this match.")
		return response.json()
	}

	async function renderMomentum(gameID) {
		const data = await getMomentum(gameID)
		targets.replaceChildren()
		document.getElementById("gameMomentumNudge").textContent = data.nudge || ""
		streak.textContent = data.streak?.days > 0 && data.isActive ? `🔥 ${data.streak.days} day streak · Best: ${data.streak.best}. ${data.streak.hasMovedToday ? "Today's goal is met." : "One turn by anyone before midnight UTC meets today's goal."}` : ""
		if (!data.targets.length) {
			const note = document.createElement("p")
			note.textContent = data.isActive ? "No other players currently have a turn eligible for a nudge." : "This match has finished."
			targets.append(note)
		}
		for (const target of data.targets) {
			const button = document.createElement("button")
			button.type = "button"
			button.textContent = `Nudge ${target.name}`
			button.disabled = !target.canNudge
			button.title = target.canNudge ? "Ask this player to take their turn or message the group" : "Nudges disabled or a nudge was sent within the last 24 hours"
			button.addEventListener("click", async () => {
				button.disabled = true
				message.textContent = "Sending…"
				try {
					const response = await fetch(`/nudgePlayer/${gameID}/`, {
						method: "POST",
						headers: { "Content-Type": "application/json", "X-CSRFToken": document.querySelector("#gameMomentumToken input").value },
						body: JSON.stringify({ playerID: target.id, latestUpdate: data.latestUpdate }),
					})
					const result = await response.json()
					message.textContent = result.message || result.error
					if (!response.ok) await renderMomentum(gameID)
				} catch (error) {
					message.textContent = "Unable to send the nudge. Reopen this dialog to try again."
					console.error(error)
				}
			})
			targets.append(button)
		}
	}

	async function openMomentum(gameID) {
		currentGameID = gameID
		message.textContent = "Loading…"
		targets.replaceChildren()
		streak.textContent = ""
		document.getElementById("gameMomentumNudge").textContent = ""
		if (!dialog.open) dialog.showModal()
		try {
			await renderMomentum(gameID)
			message.textContent = ""
		} catch (error) {
			message.textContent = error.message
		}
	}

	document.addEventListener("gameMomentumOpen", event => openMomentum(event.detail.gameID))
	setInterval(() => {
		if (document.visibilityState !== "visible") return
		if (dialog.open && currentGameID) renderMomentum(currentGameID).catch(error => { message.textContent = error.message })
	}, 60000)
})
