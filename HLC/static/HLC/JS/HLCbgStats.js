/**
 * BG Stats export for the Horseless Carriage game end screen.
 *
 * Loaded as its own script by HLCtemplate.html (next to qrcode.js and bgStats.js)
 * only when the viewer opted in on their profile. HLCview.js calls it on every
 * game end, so a failure here must never break the game end screen.
 */

function buildHLCBgStatsUrl() {
	if (!global.bgStatsEnabled) return undefined

	// turnOrder is money-sorted when the game ends, so this is the final standings
	var turnOrder = M.gameFlow.turnOrder
	var groups = []
	for (var i = 0; i < turnOrder.length; i++) {
		var player = M.players[turnOrder[i]]
		// autoplay marks a bot seat, including a player who was kicked out
		if (player.autoplay === true || player.name === "HcBot") continue
		var score = player.money
		var last = groups.length > 0 ? groups[groups.length - 1] : null
		if (last != null && last[0].score === score) last.push({ name: player.name, score: score })
		else groups.push([{ name: player.name, score: score }])
	}

	// The end-of-game log entry carries the real finish time; fall back to now
	var logs = M.logs || []
	var playDate = Date.now()
	for (var j = logs.length - 1; j >= 0; j--) {
		if (logs[j].action === Log.GAME_END) {
			playDate = logs[j].timestamp * 1000
			break
		}
	}

	return window.OBGBgStats.buildUrl({
		title: "Horseless Carriage",
		bggId: 350205,
		sourceGameId: "HLC",
		sourcePlayId: global.gameID,
		playDate: playDate,
		groups: groups,
	})
}

function appendBgStatsActions() {
	var url
	try {
		url = buildHLCBgStatsUrl()
	} catch (err) {
		// A nicety must never stop the game end screen from rendering
		console.warn("BG Stats export unavailable:", err)
		return
	}
	if (url == undefined) return

	var div = $("<div id='bgStatsDiv'></div>")
	var qrDiv = $("<div class='bgStatsQr'></div>")
	var link = $("<a target='_blank' rel='noopener'></a>").attr("href", url).text(gettext("Post to BG Stats"))
	var copyButton = $("<button type='button' class='actionsLineButton'></button>").text(gettext("Copy link"))
	var qrButton = $("<button type='button' class='actionsLineButton'></button>").text(gettext("QR code"))

	// Clipboard permission can be refused; the QR code beside it is the fallback
	copyButton.on("click", function () {
		navigator.clipboard.writeText(url).then(function () {
			copyButton.text(gettext("Link copied"))
			setTimeout(function () {
				copyButton.text(gettext("Copy link"))
			}, 2000)
		})
	})
	qrButton.on("click", function () {
		if (qrDiv.is(":empty")) qrDiv.html(window.OBGQR.toSvg(url))
		qrDiv.toggle()
	})

	div.append(link).append("<br/><br/>").append(copyButton).append(" ").append(qrButton).append(qrDiv)
	$("#actions").append("<BR/><BR/>").append(div)
}
