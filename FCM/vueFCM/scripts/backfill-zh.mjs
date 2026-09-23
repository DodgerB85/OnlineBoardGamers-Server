import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const root = 'FCM/vueFCM/src'
const poFiles = [
	'FCM/locale/zh_Hans/LC_MESSAGES/FCMjs.po',
	'FCM/locale/zh_Hans/LC_MESSAGES/djangojs.po',
	'FCM/locale/zh_Hans/LC_MESSAGES/django.po',
	'FCM/locale/zh_Hans/LC_MESSAGES/FCM.po',
]

function parsePo(text) {
	// Normalize newlines; walk line-by-line state machine
	const entries = new Map()
	const lines = text.replace(/^﻿/, '').split(/\r?\n/)
	let msgid = null
	let msgidPlural = null
	let collecting = null // 'id' | 'idp' | 'str' | 'str0' | 'str1'
	let buf = []
	let haveMsgid = false

	const flush = () => {
		const joined = buf.join('')
		if (collecting === 'id') {
			msgid = joined
			haveMsgid = true
		} else if (collecting === 'idp') {
			msgidPlural = joined
		} else if (collecting === 'str' && haveMsgid && msgid.length && joined.length && !entries.has(msgid)) {
			entries.set(msgid, joined)
		} else if (collecting === 'str0' && haveMsgid && msgid.length && joined.length && !entries.has(msgid)) {
			entries.set(msgid, joined)
		}
		buf = []
	}

	for (const raw of lines) {
		const line = raw // keep exact; only strip \r already done by split
		if (line.startsWith('#')) {
			// comment — if we were mid-entry without msgstr, reset id only on blank handling
			continue
		}
		if (line.trim() === '') {
			flush()
			msgid = null
			msgidPlural = null
			haveMsgid = false
			collecting = null
			continue
		}
		let m
		if ((m = line.match(/^msgid\s+"(.*)"$/))) {
			flush()
			collecting = 'id'
			buf = [m[1]]
		} else if ((m = line.match(/^msgid_plural\s+"(.*)"$/))) {
			flush()
			collecting = 'idp'
			buf = [m[1]]
		} else if ((m = line.match(/^msgstr\[(\d+)\]\s+"(.*)"$/))) {
			flush()
			collecting = Number(m[1]) === 0 ? 'str0' : 'str1'
			buf = [m[2]]
		} else if ((m = line.match(/^msgstr\s+"(.*)"$/))) {
			flush()
			collecting = 'str'
			buf = [m[1]]
		} else if ((m = line.match(/^"(.*)"$/))) {
			buf.push(m[1])
		} else {
			// unknown line — close current field
			flush()
			collecting = null
		}
	}
	flush()
	return entries
}

function unescapePo(s) {
	// PO escapes: \\ \" \n \t
	let out = ''
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '\\' && i + 1 < s.length) {
			const n = s[i + 1]
			if (n === 'n') out += '\n'
			else if (n === 't') out += '\t'
			else if (n === '"') out += '"'
			else if (n === '\\') out += '\\'
			else out += n
			i++
		} else out += s[i]
	}
	return out
}

function gettextToVue(s) {
	return s.replace(/%\((\w+)\)s/g, '{$1}').replace(/%%/g, '%')
}

const poMap = new Map()
for (const f of poFiles) {
	try {
		const text = readFileSync(f, 'utf8')
		const entries = parsePo(text)
		console.log(f, '->', entries.size)
		for (const [k, v] of entries) {
			const key = unescapePo(k)
			const val = unescapePo(v)
			if (val && !poMap.has(key)) poMap.set(key, val)
		}
	} catch (e) {
		console.warn('skip', f, e.message)
	}
}
console.log('po total:', poMap.size)

function norm(s) {
	return gettextToVue(s)
		.replace(/\{[a-zA-Z0-9_]+\}/g, '{}')
		.replace(/\{\d+\}/g, '{}')
		.replace(/\s+/g, ' ')
		.trim()
}

// Index by exact English and normalized English
const byExact = new Map()
const byNorm = new Map()
for (const [k, v] of poMap) {
	if (!byExact.has(k)) byExact.set(k, v)
	const n = norm(k)
	if (n && !byNorm.has(n)) byNorm.set(n, v)
}

const en = (await import(pathToFileURL(join(root, 'locales/en/index.js')).href)).default

let filled = 0
let exactHits = 0
let total = 0
const zh = {}
function walk(enObj, zhObj) {
	for (const key of Object.keys(enObj)) {
		const ev = enObj[key]
		if (ev && typeof ev === 'object' && !Array.isArray(ev)) {
			zhObj[key] = zhObj[key] || {}
			walk(ev, zhObj[key])
		} else if (typeof ev === 'string') {
			total++
			let hit = byExact.get(ev)
			if (hit) exactHits++
			if (!hit) hit = byNorm.get(norm(ev))
			if (hit) {
				zhObj[key] = gettextToVue(hit)
				filled++
			}
		}
	}
}
walk(en, zh)

console.log('en strings:', total, 'exact:', exactHits, 'zh filled:', filled, '(' + Math.round((filled / total) * 100) + '%)')

const header = `// zh-Hans (Simplified Chinese) messages.
// Back-filled from FCM/locale/zh_Hans/LC_MESSAGES/*.po; missing keys fall back to en.
export default `
writeFileSync(join(root, 'locales/zh-hans.js'), header + JSON.stringify(zh, null, '\t') + '\n', 'utf8')
console.log('wrote locales/zh-hans.js')
