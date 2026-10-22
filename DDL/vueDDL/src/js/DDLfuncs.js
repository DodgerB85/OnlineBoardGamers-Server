/**
 * Generic helpers for the DDL client. Keep this module free of store imports
 * so the rules engine and unit tests can use the seeded shuffle.
 */

import * as rf from "./DDLreference.js"

export const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

function mulberry32(seed) {
	return function () {
		seed |= 0
		seed = (seed + 0x6d2b79f5) | 0
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export const seededShuffle = (array, seed) => {
	const rng = mulberry32(seed)
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

export const generateSeed = () => Math.floor(Math.random() * 2147483647)

export function deepClone(obj) {
	return JSON.parse(JSON.stringify(obj))
}

export function getCookie(name) {
	let cookieValue = null
	if (document.cookie && document.cookie !== "") {
		const cookies = document.cookie.split(";")
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim()
			if (cookie.substring(0, name.length + 1) === name + "=") {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
				break
			}
		}
	}
	return cookieValue
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function removeItemAll(arr, value) {
	const copy = [...arr]
	let i = 0
	while (i < copy.length) {
		if (copy[i] === value) copy.splice(i, 1)
		else ++i
	}
	return copy
}

export function timestampToString(seconds) {
	const d = new Date(seconds * 1000)
	const pad = (n) => String(n).padStart(2, "0")
	return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function htmlEscape(str) {
	return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function htmlUnescape(str) {
	return String(str).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
}

export function decompressChatData(data, baseTimestamp = 0) {
	let chatArray = []
	if (data && data.length > 0) {
		const compressedData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
		// eslint-disable-next-line no-undef
		const decompressedData = pako.ungzip(compressedData, { to: "string" })
		chatArray = JSON.parse(decompressedData)
	}
	let currentFullTime = baseTimestamp
	for (let i = chatArray.length - 1; i >= 0; i--) {
		currentFullTime += chatArray[i][1]
		chatArray[i][1] = currentFullTime
	}
	return chatArray
}

export function compressGameData(obj) {
	const json = JSON.stringify(obj)
	// eslint-disable-next-line no-undef
	const compressed = pako.gzip(json)
	return btoa(String.fromCharCode(...new Uint8Array(compressed)))
}

export function decompressGameData(input) {
	if (!input) return null
	if (typeof input === "object") return input
	if (typeof input === "string" && (input.trim() === "" || input.trim() === "{}")) return null
	const compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	const decompressedData = pako.ungzip(compressedData, { to: "string" })
	return JSON.parse(decompressedData)
}

const goodImageUrls = {}
for (const good of rf.GOODS) {
	goodImageUrls[good.id] = "/static/DDL/images/" + good.img
}

export function goodImage(goodId) {
	return goodImageUrls[goodId] || ""
}

export function goodName(goodId) {
	return rf.goodName(goodId)
}

export function pluralise(count, singular, plural) {
	return count === 1 ? singular : plural
}

export function formatGoods(goods) {
	const counts = {}
	for (const good of goods) counts[good] = (counts[good] || 0) + 1
	return Object.keys(counts)
		.map((id) => (counts[id] > 1 ? `${rf.goodName(Number(id))} x${counts[id]}` : rf.goodName(Number(id))))
		.join(", ")
}
