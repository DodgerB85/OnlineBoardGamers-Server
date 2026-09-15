document.addEventListener("DOMContentLoaded", function () {
	// Update all times to local
	var timeSpans = document.getElementsByClassName("timeToConvertSpan")
	if (!timeSpans.length) return
	for (var i = 0; i < timeSpans.length; i++) {
		/*var localDateTime = new Date(parseInt(timeSpans[i].innerText)).toLocaleString();
    localDateTime = localDateTime.slice(0, -3);
    //localDateTime = localDateTime.replaceAll(',', '');
    localDateTime = localDateTime.replace(/,/g, "");
    timeSpans[i].innerHTML = localDateTime;*/
		//timeSpans[i].innerHTML = new Date(parseInt(timeSpans[i].innerText)).toLocaleString({dateStyle: 'short', timeStyle: 'short'});
		//timeSpans[i].innerHTML = new Date(parseInt(timeSpans[i].innerText)).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
		let localDateTime = new Date(parseInt(timeSpans[i].innerText)).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
		localDateTime = localDateTime.replace(/,/g, "")

		timeSpans[i].innerHTML = localDateTime + "<br/>"
	}
})

// Game-row decorative separators for game rows.
// Shared here so every page that renders `.row09` game rows (lobby,
// player info, stats, ...) gets the same row separators as the lobby table.
const rowDividerResources = {
	FCM: ["/static/FCM/images/burger.png", "/static/FCM/images/coke.png", "/static/FCM/images/coffee.png", "/static/FCM/images/pizza.png"],
	HLC: ["/static/HLC/images/v_car.png", "/static/HLC/images/v_truck.png", "/static/HLC/images/punch_clock.png"],
	BUS: ["/static/BUS/images/bus_red.png", "/static/BUS/images/passenger.png", "/static/BUS/images/building1.png"],
	TGZ: ["/static/TGZ/images/cows1_b.png", "/static/TGZ/images/cows1_br.png", "/static/TGZ/images/cows1_w.png"],
	CNS: ["/static/CNS/images/cigar.png", "/static/CNS/images/cigar_u.png", "/static/CNS/images/pirate.png"],
	AQY: ["/static/AQY/images/aqy_icon.png", "/static/AQY/images/c_inn_red.png", "/static/AQY/images/res_border_wood.jpg"],
	IND: ["/static/IND/images/ship_simple_cargo.png", "/static/IND/images/ship_simple_galleon.png", "/static/IND/images/ship_djong1.png"],
	KFW: ["/static/KFW/images/season_spring.png", "/static/KFW/images/season_summer.png", "/static/KFW/images/season_autumn.png", "/static/KFW/images/season_winter.png", "/static/KFW/images/skill_saw.jpg", "/static/KFW/images/skill_pickaxe.jpg", "/static/KFW/images/skill_anvil.jpg", "/static/KFW/images/cabin.png"],
	WEB: ["/static/WEB/images/web_icon.png", "/static/WEB/images/web_icon_3.png", "/static/WEB/images/s1-divider.png"],
	RNB: ["/static/RNB/images/transporters/transport_donkey_black.png", "/static/RNB/images/transporters/transport_wagon_black.png", "/static/RNB/images/transporters/transport_rowboat_black.png", "/static/RNB/images/transporters/transport_steamer_black.png", "/static/RNB/images/transporters/transport_truck_black.png"],
}

function addGameRowDividers() {
	//return
	document.querySelectorAll(".row09").forEach((row) => {
		const gameIcon = row.querySelector(".gameIcon")
		const gameCode = gameIcon?.src.match(/\/static\/([^/]+)\//)?.[1]
		const resources = rowDividerResources[gameCode]
		if (!resources) return

		let seed = 0
		for (const character of row.id || gameCode) seed = (seed * 31 + character.charCodeAt(0)) >>> 0

		const divider = document.createElement("div")
		divider.className = "row-divider"
		divider.classList.add(`row-divider-${gameCode.toLowerCase()}`)
		divider.setAttribute("aria-hidden", "true")
		divider.style.setProperty("--divider-count", 3 + (seed % 3))
		for (let index = 0; index < 3 + (seed % 3); index++) {
			const icon = document.createElement("span")
			icon.className = "row-divider-icon"
			const resource = resources[(seed + index * 7) % resources.length]
			if (resource.endsWith(".jpg")) icon.classList.add("row-divider-tile")
			icon.style.setProperty("--divider-icon", `url("${resource}")`)
			icon.style.setProperty("--divider-size", `${16 + ((seed >>> (index * 3)) % 5)}px`)
			icon.style.setProperty("--divider-rotation", `${((seed >>> (index * 4)) % 17) - 8}deg`)
			divider.append(icon)
		}
		row.querySelector(".col-icon")?.append(divider)
	})
}

document.addEventListener("DOMContentLoaded", addGameRowDividers)
