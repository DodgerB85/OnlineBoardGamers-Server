// Shared labels for the game status banner. Kept outside the per-game bundles so
// every game shows the same wording in every supported language.
const MESSAGES = {
	en: {
		turn: "Turn {turn}",
		yourTurn: "YOUR TURN",
		waitingFor: "Waiting for {names}",
		waitingNext: "Waiting for the next player",
		replay: "Replay",
		gameOver: "Game over",
	},
	de: {
		turn: "Runde {turn}",
		yourTurn: "DU BIST DRAN",
		waitingFor: "Warte auf {names}",
		waitingNext: "Warte auf den nächsten Spieler",
		replay: "Wiedergabe",
		gameOver: "Spiel beendet",
	},
	es: {
		turn: "Turno {turn}",
		yourTurn: "TU TURNO",
		waitingFor: "Esperando a {names}",
		waitingNext: "Esperando al siguiente jugador",
		replay: "Repetición",
		gameOver: "Fin de la partida",
	},
	fr: {
		turn: "Tour {turn}",
		yourTurn: "À VOUS",
		waitingFor: "En attente de {names}",
		waitingNext: "En attente du prochain joueur",
		replay: "Relecture",
		gameOver: "Partie terminée",
	},
	it: {
		turn: "Turno {turn}",
		yourTurn: "TOCCA A TE",
		waitingFor: "In attesa di {names}",
		waitingNext: "In attesa del prossimo giocatore",
		replay: "Riproduzione",
		gameOver: "Partita terminata",
	},
	"zh-hans": {
		turn: "第 {turn} 回合",
		yourTurn: "轮到你了",
		waitingFor: "等待 {names}",
		waitingNext: "等待下一位玩家",
		replay: "回放",
		gameOver: "游戏结束",
	},
	pt: {
		turn: "Turno {turn}",
		yourTurn: "É A SUA VEZ",
		waitingFor: "A aguardar {names}",
		waitingNext: "A aguardar o próximo jogador",
		replay: "Repetição",
		gameOver: "Fim do jogo",
	},
	nl: {
		turn: "Beurt {turn}",
		yourTurn: "JIJ BENT AAN DE BEURT",
		waitingFor: "Wachten op {names}",
		waitingNext: "Wachten op de volgende speler",
		replay: "Herhaling",
		gameOver: "Spel voorbij",
	},
}

const NAMED_COLOURS = {
	black: [0, 0, 0],
	white: [255, 255, 255],
	red: [255, 0, 0],
	green: [0, 128, 0],
	blue: [0, 0, 255],
	yellow: [255, 255, 0],
	orange: [255, 165, 0],
	purple: [128, 0, 128],
	brown: [165, 42, 42],
	pink: [255, 192, 203],
	teal: [0, 128, 128],
	grey: [128, 128, 128],
	gray: [128, 128, 128],
	darkgreen: [0, 100, 0],
}

function parseColour(colour) {
	const value = String(colour || "").trim().toLowerCase()
	if (NAMED_COLOURS[value]) return NAMED_COLOURS[value]
	const hex = value.startsWith("#") ? value.slice(1) : ""
	if (hex.length === 3) return [...hex].map((digit) => parseInt(digit + digit, 16))
	if (hex.length === 6) return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16))
	const rgb = value.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/)
	if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
	return null
}

export function readableTextColour(colour) {
	const parsed = parseColour(colour)
	if (!parsed) return "white"
	const [r, g, b] = parsed
	// Perceived brightness; black text on light chips, white text on dark chips.
	return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "black" : "white"
}

function normaliseLocale(raw) {
	const locale = String(raw || "en").toLowerCase()
	if (locale.startsWith("zh")) return "zh-hans"
	if (locale.startsWith("pt")) return "pt"
	if (locale.startsWith("nl")) return "nl"
	if (locale.startsWith("de")) return "de"
	if (locale.startsWith("es")) return "es"
	if (locale.startsWith("fr")) return "fr"
	if (locale.startsWith("it")) return "it"
	return "en"
}

function format(template, values) {
	return template.replace(/\{(\w+)\}/g, (_, key) => (values[key] === undefined || values[key] === null ? "" : String(values[key])))
}

export function getStatusBannerLabels(locale, { turn, names } = {}) {
	const message = MESSAGES[normaliseLocale(locale)]
	return {
		turn: turn === undefined || turn === null || turn === "" ? "" : format(message.turn, { turn }),
		yourTurn: message.yourTurn,
		waitingFor: names ? format(message.waitingFor, { names }) : "",
		waitingNext: message.waitingNext,
		replay: message.replay,
		gameOver: message.gameOver,
	}
}
