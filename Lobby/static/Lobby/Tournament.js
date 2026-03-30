document.addEventListener("DOMContentLoaded", function () {
	// Add click event to view games
	var clickableGameRows = document.querySelectorAll(".clickableGameRow")

	clickableGameRows.forEach(function (row) {
		row.addEventListener("click", function () {
			var prefix = ""
			if (row.classList.contains("FCM")) prefix = "/FCM/"
			else if (row.classList.contains("HLC")) prefix = "/HLC/"
			else if (row.classList.contains("BUS")) prefix = "/BUS/"
			else if (row.classList.contains("AQY")) prefix = "/AQY/"
			else if (row.classList.contains("IND")) prefix = "/IND/"

			if (prefix !== "") {
				window.open(prefix + this.id.slice(8), "_self")
			}
		})
	})

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
})
