import * as controller from "./BUScontroller.js"
import * as rf from "./BUSreference.js"
import * as model from "./BUSmodel.js"
import * as view from "./BUSview.js"

//import { usePersonalStore } from "../stores/BUSpersonal.js"
import { useModelStore } from "../stores/BUSstore.js"
import { usePersonalStore } from "../stores/BUSpersonal.js"

export function removeItemAll(arr, value) {
	var arrCopy = [...arr]
	var i = 0
	while (i < arr.length) {
		if (arrCopy[i] === value) {
			arrCopy.splice(i, 1)
		} else {
			++i
		}
	}
	return arrCopy
}

export function sleepPause(miliseconds) {
	var currentTime = new Date().getTime()

	while (currentTime + miliseconds >= new Date().getTime()) {
		// Do Nothing
	}
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function htmlEscape(str) {
	return String(str)
		.replace(/(?:\r|\n|\r\n)/g, "SNLB")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
}

export function htmlUnescape(value) {
	return String(value)
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/SNLB/g, "\n")
}

// get CSRF for javascript
export function getCookie(name) {
	const value = `; ${document.cookie}`
	const parts = value.split(`; ${name}=`)
	if (parts.length === 2) return parts.pop().split(";").shift()
}

export function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1))
		//const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

export function timestampToString(timestamp) {
	var d = new Date(timestamp)
	var res = ""
	/*res += d.getFullYear() + '/'
  if (d.getMonth() < 9) res += '0' + (d.getMonth() + 1) + '/'
  else res += d.getMonth() + 1 + '/'
  if (d.getDate() < 10) res += '0' + d.getDate() + ' '
  else res += d.getDate() + ' '
  if (d.getHours() < 10) res += '0' + d.getHours() + ':'
  else res += d.getHours() + ':'
  if (d.getMinutes() < 10) res += '0' + d.getMinutes() + ':'
  else res += d.getMinutes() + ':'
  if (d.getSeconds() < 10) res += '0' + d.getSeconds()
  else res += d.getSeconds()*/
	if (d.getDate() < 10) res += "0" + d.getDate() + "/"
	else res += d.getDate() + "/"
	if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
	else res += d.getMonth() + 1 + "/"
	res += d.getFullYear() + " "
	if (d.getHours() < 10) res += "0" + d.getHours() + ":"
	else res += d.getHours() + ":"
	if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
	else res += d.getMinutes() + ":"
	if (d.getSeconds() < 10) res += "0" + d.getSeconds()
	else res += d.getSeconds()

	return res
}

export var LZString = (function () {
	function o(o, r) {
		if (!t[o]) {
			t[o] = {}
			for (var n = 0; n < o.length; n++) t[o][o.charAt(n)] = n
		}
		return t[o][r]
	}
	var r = String.fromCharCode,
		//n = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
		e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",
		t = {},
		i = {
			/*compressToBase64: function (o) {
          if (null == o) return ''
          var r = i._compress(o, 6, function (o) {
            return n.charAt(o)
          })
          switch (r.length % 4) {
            default:
            case 0:
              return r
            case 1:
              return r + '==='
            case 2:
              return r + '=='
            case 3:
              return r + '='
          }
        },
        decompressFromBase64: function (r) {
          return null == r
            ? ''
            : '' == r
            ? null
            : i._decompress(r.length, 32, function (e) {
                return o(n, r.charAt(e))
              })
        },
        compressToUTF16: function (o) {
          return null == o
            ? ''
            : i._compress(o, 15, function (o) {
                return r(o + 32)
              }) + ' '
        },
        decompressFromUTF16: function (o) {
          return null == o
            ? ''
            : '' == o
            ? null
            : i._decompress(o.length, 16384, function (r) {
                return o.charCodeAt(r) - 32
              })
        },
        compressToUint8Array: function (o) {
          for (
            var r = i.compress(o), n = new Uint8Array(2 * r.length), e = 0, t = r.length;
            t > e;
            e++
          ) {
            var s = r.charCodeAt(e)
            ;(n[2 * e] = s >>> 8), (n[2 * e + 1] = s % 256)
          }
          return n
        },
        decompressFromUint8Array: function (o) {
          if (null === o || void 0 === o) return i.decompress(o)
          for (var n = new Array(o.length / 2), e = 0, t = n.length; t > e; e++)
            n[e] = 256 * o[2 * e] + o[2 * e + 1]
          var s = []
          return (
            n.forEach(function (o) {
              s.push(r(o))
            }),
            i.decompress(s.join(''))
          )
        },*/
			compressToEncodedURIComponent: function (o) {
				return null == o
					? ""
					: i._compress(o, 6, function (o) {
							return e.charAt(o)
						})
			},
			decompressFromEncodedURIComponent: function (r) {
				return null == r
					? ""
					: "" == r
						? null
						: ((r = r.replace(/ /g, "+")),
							i._decompress(r.length, 32, function (n) {
								return o(e, r.charAt(n))
							}))
			},
			compress: function (o) {
				return i._compress(o, 16, function (o) {
					return r(o)
				})
			},
			_compress: function (o, r, n) {
				if (null == o) return ""
				var e,
					t,
					i,
					s = {},
					p = {},
					u = "",
					c = "",
					a = "",
					l = 2,
					f = 3,
					h = 2,
					d = [],
					m = 0,
					v = 0
				for (i = 0; i < o.length; i += 1)
					if (((u = o.charAt(i)), Object.prototype.hasOwnProperty.call(s, u) || ((s[u] = f++), (p[u] = !0)), (c = a + u), Object.prototype.hasOwnProperty.call(s, c))) a = c
					else {
						if (Object.prototype.hasOwnProperty.call(p, a)) {
							if (a.charCodeAt(0) < 256) {
								for (e = 0; h > e; e++) ((m <<= 1), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++)
								for (t = a.charCodeAt(0), e = 0; 8 > e; e++) ((m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1))
							} else {
								for (t = 1, e = 0; h > e; e++) ((m = (m << 1) | t), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t = 0))
								for (t = a.charCodeAt(0), e = 0; 16 > e; e++) ((m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1))
							}
							;(l--, 0 == l && ((l = Math.pow(2, h)), h++), delete p[a])
						} else for (t = s[a], e = 0; h > e; e++) ((m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1))
						;(l--, 0 == l && ((l = Math.pow(2, h)), h++), (s[c] = f++), (a = String(u)))
					}
				if ("" !== a) {
					if (Object.prototype.hasOwnProperty.call(p, a)) {
						if (a.charCodeAt(0) < 256) {
							for (e = 0; h > e; e++) ((m <<= 1), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++)
							for (t = a.charCodeAt(0), e = 0; 8 > e; e++) ((m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1))
						} else {
							for (t = 1, e = 0; h > e; e++) ((m = (m << 1) | t), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t = 0))
							for (t = a.charCodeAt(0), e = 0; 16 > e; e++) ((m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1))
						}
						;(l--, 0 == l && ((l = Math.pow(2, h)), h++), delete p[a])
					} else for (t = s[a], e = 0; h > e; e++) ((m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1))
					;(l--, 0 == l && ((l = Math.pow(2, h)), h++))
				}
				for (t = 2, e = 0; h > e; e++) ((m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1))
				for (;;) {
					if (((m <<= 1), v == r - 1)) {
						d.push(n(m))
						break
					}
					v++
				}
				return d.join("")
			},
			decompress: function (o) {
				return null == o
					? ""
					: "" == o
						? null
						: i._decompress(o.length, 32768, function (r) {
								return o.charCodeAt(r)
							})
			},
			_decompress: function (o, n, e) {
				var t,
					i,
					s,
					p,
					u,
					c,
					a,
					l,
					f = [],
					h = 4,
					d = 4,
					m = 3,
					v = "",
					w = [],
					A = { val: e(0), position: n, index: 1 }
				for (i = 0; 3 > i; i += 1) f[i] = i
				for (p = 0, c = Math.pow(2, 2), a = 1; a != c; ) ((u = A.val & A.position), (A.position >>= 1), 0 == A.position && ((A.position = n), (A.val = e(A.index++))), (p |= (u > 0 ? 1 : 0) * a), (a <<= 1))
				switch ((t = p)) {
					case 0:
						for (p = 0, c = Math.pow(2, 8), a = 1; a != c; ) ((u = A.val & A.position), (A.position >>= 1), 0 == A.position && ((A.position = n), (A.val = e(A.index++))), (p |= (u > 0 ? 1 : 0) * a), (a <<= 1))
						l = r(p)
						break
					case 1:
						for (p = 0, c = Math.pow(2, 16), a = 1; a != c; ) ((u = A.val & A.position), (A.position >>= 1), 0 == A.position && ((A.position = n), (A.val = e(A.index++))), (p |= (u > 0 ? 1 : 0) * a), (a <<= 1))
						l = r(p)
						break
					case 2:
						return ""
				}
				for (f[3] = l, s = l, w.push(l); ; ) {
					if (A.index > o) return ""
					for (p = 0, c = Math.pow(2, m), a = 1; a != c; ) ((u = A.val & A.position), (A.position >>= 1), 0 == A.position && ((A.position = n), (A.val = e(A.index++))), (p |= (u > 0 ? 1 : 0) * a), (a <<= 1))
					switch ((l = p)) {
						case 0:
							for (p = 0, c = Math.pow(2, 8), a = 1; a != c; ) ((u = A.val & A.position), (A.position >>= 1), 0 == A.position && ((A.position = n), (A.val = e(A.index++))), (p |= (u > 0 ? 1 : 0) * a), (a <<= 1))
							;((f[d++] = r(p)), (l = d - 1), h--)
							break
						case 1:
							for (p = 0, c = Math.pow(2, 16), a = 1; a != c; ) ((u = A.val & A.position), (A.position >>= 1), 0 == A.position && ((A.position = n), (A.val = e(A.index++))), (p |= (u > 0 ? 1 : 0) * a), (a <<= 1))
							;((f[d++] = r(p)), (l = d - 1), h--)
							break
						case 2:
							return w.join("")
					}
					if ((0 == h && ((h = Math.pow(2, m)), m++), f[l])) v = f[l]
					else {
						if (l !== d) return null
						v = s + s.charAt(0)
					}
					;(w.push(v), (f[d++] = s + v.charAt(0)), h--, (s = v), 0 == h && ((h = Math.pow(2, m)), m++))
				}
			},
		}
	return i
})()

// Splotter Designer helper functions
// Status is a single number:
// -1 = not arrived yet, -2 = removed from the game (returned to the Netherlands)
// 0..99 = junction the designer is on
// 100..499 = their junction plus 100 (has attended Splotter Con)
// 500+ = parked on a building (or on their convention-centre spot), plus 100 if they have attended;
//        returned to the base value at round end like a delivered passenger; a designer parked on
//        their convention spot stays there instead

export function getDesignerStatusJunction(status) {
	if (status < 0 || status >= rf.DESIGNER_ON_BUILDING_FLAG) return -1
	return status % rf.DESIGNER_CON_FLAG
}

// The junction a designer can be transported from. While parked (500+, e.g. on a building or the
// convention-centre spot) a designer cannot be transported at all; an attended designer standing on
// the convention junction (17) is transported from there
export function getDesignerTransportJunction(status) {
	if (status < 0 || status >= rf.DESIGNER_ON_BUILDING_FLAG) return -1
	if (status >= rf.DESIGNER_CON_FLAG) return rf.PITTS_CONVENTION_JUNCTION
	return status
}

export function hasDesignerAttendedCon(status) {
	return status >= rf.DESIGNER_CON_FLAG
}

// Has a Splotter Designer already arrived at the Airport this round?
// Checks both the current player's in-progress actions and the stored history
export function designerArrivedThisRound() {
	const store = useModelStore()
	for (let i = 0; i < store.context.historyObj.length; i++) {
		if (Array.isArray(store.context.historyObj[i])) return true
	}
	for (let i = store.history.length - 1; i >= 0; i--) {
		const entry = store.history[i]
		if (entry[0] === rf.HIST_NEW_TURN) break
		if (entry[0] === rf.HIST_ADD_PAX && Array.isArray(entry[3])) {
			for (let j = 0; j < entry[3].length; j++) {
				if (Array.isArray(entry[3][j])) return true
			}
		}
	}
	return false
}

// Can this player still bring a Designer into play from the Airport?
// (requires two passenger placement spots, one not already used this round, and an available designer)
export function canStillPlaceDesigner() {
	const store = useModelStore()
	if (store.context.passengersLeftToPlace < 2) return false
	if (designerArrivedThisRound()) return false
	return store.jeroenStatus === rf.DESIGNER_NOT_ARRIVED || store.jorisStatus === rf.DESIGNER_NOT_ARRIVED
}

// 1. COMPRESS: Extraction only the values that aren't -1
export function compressJunctions(junctions) {
	const store = useModelStore()
	return junctions.flat().filter((_, index) => {
		const row = Math.floor(index / 6)
		const col = index % 6
		return store.junctions[row][col] !== -1
	})
}

// 2. DECOMPRESS: Map the template back using the flat list
export function decompressJunctions(compressedJunctions) {
	const store = useModelStore()
	let i = 0
	return store.junctions.map((row) => row.map((cell) => (cell === -1 ? -1 : compressedJunctions[i++])))
}

/**
 * Compresses the lines array into a compact object grouped by player index.
 * Only stores the indices of lines that are not empty.
 * Example result: { "0": [5, 12], "1": [3, 80] }
 */
export function compressLines(lines) {
	const compressed = {}

	lines.forEach((lineArray, lineIndex) => {
		// If the array has a player index inside it
		if (lineArray.length > 0) {
			for (const playerIndex of lineArray) {
				// Initialize the player's array if it doesn't exist yet
				if (!compressed[playerIndex]) {
					compressed[playerIndex] = []
				}

				compressed[playerIndex].push(lineIndex)
			}
		}
	})

	return compressed
}

/**
 * Rebuilds the reactive-compatible array of 80 subarrays from the compressed object.
 */
export function decompressLines(compressed) {
	// Create the base structure of 80 empty subarrays
	const lines = Array.from({ length: 80 }, () => [])

	// Loop through each player in the compressed object
	for (const playerIndex in compressed) {
		const playerLines = compressed[playerIndex]
		const pIdx = Number(playerIndex)

		// Place the player index back into the correct line subarray
		playerLines.forEach((lineIdx) => {
			if (lineIdx < 80) {
				lines[lineIdx].push(pIdx)
			}
		})
	}

	return lines
}

// Indices 0 and 3 are Right-Aligned (fill from the end)
// Indices 2 and 5 are Left-Aligned (fill from the start)
// Indices 1, 4, 6 are Single-Slot
const RIGHT_ALIGNED = [0, 3]
const SIZES = [6, 1, 6, 6, 1, 6, 1]

export function compressActionArea(data) {
	// Simply filter out all -1s.
	// [-1, -1, -1, 0] becomes [0]
	// [-1] becomes []
	return data.map((innerArray) => innerArray.filter((val) => val !== -1))
}

export function decompressActionArea(compressed) {
	return compressed.map((playerIndexes, i) => {
		const totalSize = SIZES[i]
		const result = new Array(totalSize).fill(-1)

		if (playerIndexes.length === 0) return result

		if (RIGHT_ALIGNED.includes(i)) {
			// Fill from the right: [-1, -1, -1, -1, 0, 2]
			// We place players at the very end of the array
			for (let j = 0; j < playerIndexes.length; j++) {
				result[totalSize - playerIndexes.length + j] = playerIndexes[j]
			}
		} else {
			// Fill from the left: [2, 0, -1, -1, -1, -1]
			// Or it's a single slot: [1]
			for (let j = 0; j < playerIndexes.length; j++) {
				result[j] = playerIndexes[j]
			}
		}

		return result
	})
}

export function exportBUSmodel(forGameOver, saveContext) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let temp = []

	// 0 - players
	let tempPlayers = []
	for (let i = 0; i < store.players.length; i++) {
		let tempPlayer = []
		// 0 - name /  display name
		if (store.players[i].name === store.players[i].displayName) tempPlayer.push([store.players[i].name])
		else tempPlayer.push([store.players[i].name, store.players[i].displayName])
		// 1 - colour
		tempPlayer.push(store.players[i].colour)
		// 2 - score
		tempPlayer.push(store.players[i].score)
		// 3 - maxScore // breaks ties
		tempPlayer.push(store.players[i].maxScore)

		if (!forGameOver) {
			// 4 - endJunctions //  NOT gameover - just needed for next options
			tempPlayer.push(store.players[i].endJunctions)
			// 6 - endLines // NOT gameover
			tempPlayer.push(store.players[i].endLines)
			// 7 - passActionsFlag // NOT gameover
			tempPlayer.push(store.players[i].passActionsFlag === true ? 1 : 0)
		}
		// remainingActions - from hist
		// timeStones - from hist
		// buses - from hist
		tempPlayers.push(tempPlayer)
	}
	temp.push(JSON.parse(JSON.stringify(tempPlayers)))

	// 1 - store.junctions
	temp.push(compressJunctions(store.junctions))

	// 2 - store.lines
	temp.push(compressLines(store.lines))

	// 3 - actionAreaData
	temp.push(compressActionArea(store.actionAreaData))

	// 4 - history
	temp.push(JSON.parse(JSON.stringify(store.history)))

	// 5 - desired Building
	temp.push(store.desiredBuilding)

	// 6 - Pittsburgh-specific status (jeroenStatus, jorisStatus, bridges, remainingBridgeMarkers, bridgeEnds)
	if (personal.selectedBoard === rf.BOARD_PITTS) {
		temp.push([store.jeroenStatus, store.jorisStatus, store.bridges, store.remainingBridgeMarkers, store.bridgeEnds])
	}

	// 7 - gameflow // NOT GAME ENDED
	if (!forGameOver) {
		temp.push([
			//store.gameflow.turn, // from history
			store.gameflow.phase, // 0
			JSON.parse(JSON.stringify(store.gameflow.fullTurnOrder)), // 1
			JSON.parse(JSON.stringify(store.gameflow.turnOrder)), // 2
			JSON.parse(JSON.stringify(store.gameflow.fullActionTurnOrder)), // 3
			//store.gameflow.gameEnded//4
		])
	}

	// 8 - context
	if (saveContext) temp.push(JSON.parse(JSON.stringify(store.context)))

	// FROM HSITORY
	// remainingTimestones
	// remainingPassengers

	function toBase64(uint8Array) {
		let binary = ""
		const len = uint8Array.byteLength
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(uint8Array[i])
		}
		return btoa(binary)
	}

	// Usage with your second method:
	// eslint-disable-next-line no-undef
	const msgpacked = msgpack.encode(temp)
	// eslint-disable-next-line no-undef
	const compressed = pako.gzip(msgpacked, { level: 9 })
	const exportDataB64 = toBase64(compressed)

	return exportDataB64
}

export function importBUSmodel(inputBase64, forGameOver, restoreContext) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let inputModel = null

	try {
		// 1. Base64 to Binary String
		const binaryString = window.atob(inputBase64)
		const bytes = new Uint8Array(binaryString.length)
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}

		// 2. Un-GZIP (pako handles the decompression)
		// eslint-disable-next-line no-undef
		const ungzipped = pako.ungzip(bytes)

		// 3. MessagePack Decode (Works directly on Uint8Array)
		// eslint-disable-next-line no-undef
		inputModel = msgpack.decode(ungzipped)
	} catch (err) {
		console.error("Decompression failed:", err)
		try {
			importModel(inputBase64, restoreContext)
			return
		} catch (err2) {
			console.error("Decompression failed:", err2)
			return null
		}
	}

	// 0 players
	store.players.splice(0)
	for (let i = 0; i < inputModel[0].length; i++) {
		const entry = inputModel[0][i]
		let name = ""
		let displayName = ""
		if (entry[0].length === 1) {
			name = entry[0][0]
			displayName = entry[0][0]
		} else if (entry[0].length === 2) {
			name = entry[0][0]
			displayName = entry[0][1]
		}
		let colour = entry[1]
		let score = entry[2]
		let maxScore = entry[3]
		let endJunctions = []
		let endLines = []
		let playerJunctions = []
		let passActionsFlag = false
		if (!forGameOver) {
			endJunctions = [...entry[4]]
			endLines = [...entry[5]]
			//playerJunctions = [...entry[6]]
			if (typeof entry[6] === "number") {
				passActionsFlag = entry[6] === 1 ? true : false
			}
			if (entry.length > 7) {
				passActionsFlag = entry[7] === 1 ? true : false
			}
		}

		//store.players.splice(0, store.players.length)
		store.players.push({
			name: name,
			displayName: displayName,
			colour: colour,
			score: score,
			maxScore: maxScore,
			endJunctions: endJunctions,
			endLines: endLines,
			playerJunctions: playerJunctions,
			passActionsFlag: passActionsFlag,

			remainingActions: 20,
			timeStones: 0,
			buses: 1,
		})
	}

	// 1 junctions
	store.junctions = decompressJunctions(inputModel[1])
	
	// If junctions is empty (new game), initialize with default state
	if (store.junctions.length === 0) {
		if (personal.selectedBoard === rf.BOARD_PITTS) {
			store.junctions = [...rf.initialJunctionsStateArrayPitts]
		} else {
			store.junctions = [...rf.initialJunctionsStateArray]
		}
	}
	
	// Detect board from junctions length and set selectedBoard
	if (store.junctions.length === 38) {
		personal.selectedBoard = rf.BOARD_PITTS
	} else if (store.junctions.length === 36) {
		personal.selectedBoard = rf.BOARD_20A_CAPSTONE
	}

	// 2 lines
	store.lines.splice(0)
	store.lines = decompressLines(inputModel[2])

	// 3 - actionAreaData
	store.actionAreaData.splice(0)
	store.actionAreaData = decompressActionArea(inputModel[3])

	// 4 - history
	store.history.splice(0)
	Object.assign(store.history, inputModel[4])

	// 5 - desiredBuilding
	store.desiredBuilding = inputModel[5]

	// 6 - Pittsburgh-specific status (jeroenStatus, jorisStatus, bridges, remainingBridgeMarkers, bridgeEnds)
	let pittsStatusIndex = 6
	if (personal.selectedBoard === rf.BOARD_PITTS && inputModel.length > 6 && Array.isArray(inputModel[6]) && inputModel[6].length >= 2) {
		store.jeroenStatus = inputModel[6][0]
		store.jorisStatus = inputModel[6][1]
		// Import bridge data if available (newer format)
		if (inputModel[6].length >= 5) {
			store.bridges.splice(0)
			store.bridges.push(...inputModel[6][2])
			store.remainingBridgeMarkers = inputModel[6][3]
			Object.assign(store.bridgeEnds, inputModel[6][4])
		}
		pittsStatusIndex = 7
	} else {
		store.jeroenStatus = -1
		store.jorisStatus = -1
		// Reset bridge data if not present
		store.bridges.splice(0)
		store.remainingBridgeMarkers = 5
		for (const key in store.bridgeEnds) {
			delete store.bridgeEnds[key]
		}
	}

	// 7 - gameflow (was 6, now 7 if Pittsburgh data present)
	store.gameflow.turn = 0
	store.gameflow.phase = rf.PHASE_CHOOSE_ACTIONS
	store.gameflow.fullTurnOrder = []
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	store.gameflow.fullActionTurnOrder = [...store.gameflow.fullTurnOrder]
	store.gameflow.gameEnded = 0

	if (!forGameOver) {
		store.gameflow.phase = inputModel[pittsStatusIndex][0]
		store.gameflow.fullTurnOrder = [...inputModel[pittsStatusIndex][1]]
		store.gameflow.turnOrder = [...inputModel[pittsStatusIndex][2]]
		store.gameflow.fullActionTurnOrder = [...inputModel[pittsStatusIndex][3]]
		store.gameflow.gameEnded = 0
	} else store.gameflow.gameEnded = 3

	// 8 - context (was 7, now 8 if Pittsburgh data present)
	if (restoreContext && inputModel.length >= pittsStatusIndex + 1) Object.assign(store.context, inputModel[pittsStatusIndex + 1])

	store.remainingPassengers = 11
	store.remainingTimeStones = 5
	if (store.players.length === 3) store.remainingTimeStones = 4

	// Restore data from history
	for (let i = 0; i < store.history.length; i++) {
		const histEntry = store.history[i]
		if (histEntry[0] === rf.HIST_NEW_TURN) store.gameflow.turn++
		// P=Remaining Actions
		else if (histEntry[0] === rf.HIST_CHOOSE_ACTION && histEntry[3][0] <= 6) store.players[histEntry[1]].remainingActions--
		// p=Buses
		else if (histEntry[0] === rf.HIST_ADD_BUS) store.players[histEntry[1]].buses++
		// p=Time Stones / remainingTimeStones
		else if (histEntry[0] === rf.HIST_ALTER_TIME && histEntry[1] !== -1 && histEntry[3][1] !== 0) {
			store.players[histEntry[1]].timeStones++
			store.remainingTimeStones--
		}
		// remainingPassengers
		else if (histEntry[0] === rf.HIST_ADD_PAX) {
			for (let i = 0; i < histEntry[3].length; i++) {
				// Designer markers are [junction, designer] arrays, not passengers
				if (histEntry[3][i] !== -1 && !Array.isArray(histEntry[3][i])) store.remainingPassengers--
			}
		}
	}

	// Now recreate the player networks
	if (!forGameOver) {
		for (let i = 0; i < store.players.length; i++) {
			const player = store.players[i]
			//for (let j = 0; j < player.endJunctions.length; j++) {
			if (player.endJunctions && player.endJunctions.length > 0) {
				const junction = player.endJunctions[0]
				player.playerJunctions = [...model.getJunctionsReachableFromJunction(i, junction)]
			}
		}
	}

	if (forGameOver) {
		store.gameflow.phase = rf.PHASE_GAME_OVER

		const finalPositionsIndices = store.players
			.map((_, index) => index) // Create [0, 1, 2, ...]
			.sort((a, b) => {
				const playerA = store.players[a]
				const playerB = store.players[b]

				// Primary sort: Score (Descending)
				// Secondary sort: Time Stones (Descending)
				return playerB.score - playerA.score || playerB.timeStones - playerA.timeStones
			})

		store.gameflow.fullTurnOrder = [...finalPositionsIndices]
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.fullActionTurnOrder = [...store.gameflow.fullTurnOrder]

		if (store.remainingTimeStones === 0) store.gameflow.gameEnded = 1
		if (model.getEmptyBuildingSpots(true).length === 0) store.gameflow.gameEnded = 2
		let eligiblePlayers = 0
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].remainingActions > 0) eligiblePlayers++
		}
		if (eligiblePlayers <= 1) store.gameflow.gameEnded = 3

		// Now recreate end junctions and end lines
		for (let i = 0; i < store.players.length; i++) {
			const player = store.players[i]
			player.endJunctions = []
			player.endLines = []
			player.junctions = []
			player.lines = []

			// Find all lines belonging to this player
			for (let j = 0; j < store.lines.length; j++) {
				if (store.lines[j].includes(player.colour)) {
					// Add the line
					if (!player.lines.includes(j)) player.lines.push(j)
					// Get the junctions at the ends of this line
					const junctions = view.getJunctionsAtEndOfLine(j)
					if (!player.junctions.includes(junctions[0])) player.junctions.push(junctions[0])
					if (!player.junctions.includes(junctions[1])) player.junctions.push(junctions[1])
				}
			}
			// Now we know all the player lines and junctions.
			// So see if we can find any junctions that are only connected to 1 line, ie an end junction

			// For each player junction, count how many player lines connect to it
			for (let j = 0; j < player.junctions.length; j++) {
				const junction = player.junctions[j]
				let connectedLineCount = 0
				let connectedLineIndex = -1

				// Count how many of this player's lines connect to this junction
				for (let k = 0; k < player.lines.length; k++) {
					const lineIndex = player.lines[k]
					const lineJunctions = view.getJunctionsAtEndOfLine(lineIndex)
					if (lineJunctions.includes(junction)) {
						connectedLineCount++
						connectedLineIndex = lineIndex
					}
				}

				// If only 1 line connects to this junction, it's an end junction
				if (connectedLineCount === 1) {
					if (!player.endJunctions.includes(junction)) {
						player.endJunctions.push(junction)
						player.endLines.push(connectedLineIndex)
					}
				}
			}
		}
	}
}

// This is the old method. Use to view old games only
export function importModel(input, restoreContext) {
	const store = useModelStore()
	var step1 = LZString.decompressFromEncodedURIComponent(input)

	var inputModel = JSON.parse(step1)

	// 0 players
	let replacing = false
	if (store.players.length > 0) replacing = true
	for (let i = 0; i < inputModel[0].length; i++) {
		if (replacing) {
			store.players[i].name = inputModel[0][i][0]
			store.players[i].displayName = inputModel[0][i][1]
			store.players[i].colour = inputModel[0][i][2]
			store.players[i].score = inputModel[0][i][3]
			store.players[i].remainingActions = inputModel[0][i][4]
			store.players[i].timeStones = inputModel[0][i][5]
			store.players[i].buses = inputModel[0][i][6]
			store.players[i].endJunctions = inputModel[0][i][7]
			store.players[i].endLines = inputModel[0][i][8]
			store.players[i].playerJunctions = inputModel[0][i][9]
			store.players[i].passActionsFlag = inputModel[0][i][10] === 1 ? true : false
			store.players[i].maxScore = inputModel[0][i].length >= 12 ? inputModel[0][i][11] : inputModel[0][i][3]
		} else {
			//store.players.splice(0, store.players.length)
			store.players.push({
				name: inputModel[0][i][0],
				displayName: inputModel[0][i][1],
				colour: inputModel[0][i][2],
				score: inputModel[0][i][3],
				remainingActions: inputModel[0][i][4],
				timeStones: inputModel[0][i][5],
				buses: inputModel[0][i][6],
				endJunctions: inputModel[0][i][7],
				endLines: inputModel[0][i][8],
				playerJunctions: inputModel[0][i][9],
				passActionsFlag: inputModel[0][i][10] === 1 ? true : false,
				maxScore: inputModel[0][i].length >= 12 ? inputModel[0][i][11] : inputModel[0][i][3],
			})
		}
	}
	//Object.assign(players, inputModel[0])

	// 1 junctions
	/*for (let i = 0; i < inputModel[1].length; i++) {
      //console.log(junctions[i])
      junctions[i].id = inputModel[1][i][0]
      junctions[i].buildings = inputModel[1][i][1]
      junctions[i].passengers = inputModel[1][i][2]
    }*/
	Object.assign(store.junctions, inputModel[1])
	//junctions = [...inputModel[1]]

	// 2
	store.remainingTimeStones = inputModel[2]

	// 3
	store.remainingPassengers = inputModel[3]

	// 4
	//lines = inputModel[5]
	/*for (let i = 0; i < inputModel[5].length; i++) {
      lines[i] = inputModel[5][i]
    }*/
	Object.assign(store.lines, inputModel[4])

	// 5
	//actionAreaData = inputModel[6]
	Object.assign(store.actionAreaData, inputModel[5])

	// 6
	store.gameflow.turn = inputModel[6][0]
	store.gameflow.phase = inputModel[6][1]
	store.gameflow.turnOrder = inputModel[6][2]
	store.gameflow.fullTurnOrder = inputModel[6][3]
	store.gameflow.fullActionTurnOrder = inputModel[6][4]
	store.gameflow.gameEnded = inputModel[6][5]
	//Object.assign(gameflow, inputModel[6])

	// 7
	store.desiredBuilding = inputModel[7]

	// 8
	//history = []
	store.history.splice(0, store.history.length)
	Object.assign(store.history, inputModel[8])
	//history = inputModel[10]

	// 9
	if (restoreContext && inputModel.length >= 9) Object.assign(store.context, inputModel[9])

	// RESET TEMP VARS
	//context.buildingsLeftToPlace = 0

	//alert('import')
}

export function decompressChatData(data) {
	if (data.length > 0) {
		var step1 = LZString.decompressFromEncodedURIComponent(data)
		var chatArray = JSON.parse(step1)
	} else chatArray = []

	chatArray.push(["WelcomeBot", 0, "Welcome to Bus Online!SNLBSNLBIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"])

	return chatArray
}

var define
var module
"function" == typeof define && define.amd
	? define(function () {
			return LZString
		})
	: "undefined" != typeof module && null != module && (module.exports = LZString)
