document.addEventListener("DOMContentLoaded", () => {
	const games = JSON.parse(document.getElementById("extraStatsData").textContent)
	const tabs = [...document.querySelectorAll("#extraStatsGameTabs .tablinks")]
	const players = document.getElementById("extraStatsPlayers")
	let selectedGame = games[0]
	const format = (value, unit) => value === null ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`

	function render() {
		const cohort = selectedGame.cohorts[players.value]
		document.getElementById("extraStatsTitle").textContent = selectedGame.name
		document.getElementById("extraStatsDemo").hidden = !selectedGame.isSynthetic
		document.getElementById("extraStatsCoverage").textContent = `${cohort.games} readable matches in this selection. Across all player counts: ${selectedGame.finished} eligible matches, ${selectedGame.unreadable} unreadable histories, ${selectedGame.missingTiming} without reliable timing.`
		const charts = document.getElementById("extraStatsCharts")
		const values = document.getElementById("extraStatsValues")
		charts.replaceChildren()
		values.replaceChildren()
		const metrics = ["duration", "lobby", "actions", "gap"].map(key => cohort.metrics[key])
		for (const metric of metrics) {
			const row = document.createElement("tr")
			for (const text of [metric.label, format(metric.average, metric.unit), format(metric.median, metric.unit), metric.count]) {
				const cell = document.createElement("td")
				cell.textContent = text
				row.append(cell)
			}
			values.append(row)
		}
		for (const metric of metrics) {
			const card = document.createElement("div")
			card.className = "extra-stats-chart"
			const heading = document.createElement("h3")
			heading.textContent = metric.label
			const plot = document.createElement("div")
			plot.className = "extra-stats-plot"
			const max = Math.max(metric.average || 0, metric.median || 0)
			for (const kind of ["average", "median"]) {
				const column = document.createElement("div")
				column.className = "extra-stats-column"
				const value = document.createElement("span")
				value.className = "extra-stats-value"
				value.textContent = format(metric[kind], metric.unit)
				const track = document.createElement("div")
				track.className = "extra-stats-track"
				const bar = document.createElement("span")
				bar.className = `extra-stats-bar ${kind}`
				bar.style.height = `${max ? (metric[kind] || 0) / max * 100 : 0}%`
				track.append(bar)
				const label = document.createElement("span")
				label.textContent = kind === "average" ? "Average" : "Median"
				column.append(value, track, label)
				plot.append(column)
			}
			card.append(heading, plot)
			charts.append(card)
		}

	}

	function selectGame(code) {
		selectedGame = games.find(game => game.gameCode === code)
		tabs.forEach(tab => {
			const isSelected = tab.id === code
			tab.classList.toggle("active", isSelected)
			tab.setAttribute("aria-selected", isSelected)
			tab.tabIndex = isSelected ? 0 : -1
		})
		players.replaceChildren()
		for (const count of Object.keys(selectedGame.cohorts)) {
			players.add(new Option(count === "0" ? "All player counts" : `${count} players`, count))
		}
		render()
	}
	tabs.forEach((tab, index) => {
		tab.setAttribute("role", "tab")
		tab.setAttribute("aria-controls", "extraStatsPanel")
		tab.addEventListener("click", () => selectGame(tab.id))
		tab.addEventListener("keydown", event => {
			if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
			event.preventDefault()
			const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length
			selectGame(tabs[next].id)
			tabs[next].focus()
		})
	})
	players.addEventListener("change", render)
	if (selectedGame) selectGame(selectedGame.gameCode)
})
