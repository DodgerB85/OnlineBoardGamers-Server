/**
 * Admin-page entry (FCM/templates/FCM/gameAdmin.html).
 *
 * Loads the Vue client's own modules so the admin tools never need the deleted
 * raw-JS bundle. Vite emits this as FCMvuedist/admin.js (second input in
 * vite.config.js). The page reads the two functions off window.FCMadmin.
 */
import { createPinia, setActivePinia } from "pinia"

import * as funcs from "./js/FCMfuncs.js"
import * as rf from "./js/FCMreference.js"
import * as rules from "./js/FCMrules.js"
import { useModelStore } from "./stores/FCMstore.js"

setActivePinia(createPinia())
const store = useModelStore()

// A game's DB blob -> the named model dump the admin page used to show
function unpackModel(inputB64) {
	funcs.simpleImportWholeFCMmodel(inputB64)
	return JSON.stringify(store.$state, null, 4)
}

// One restructuring move [beach, atWork, autoSelect] -> readable chips
function decodeMove(moveData, name) {
	const employeeSpan = (e) => {
		const emp = rf.EMPLOYEES_STR[e]
		if (!emp) return `<span>${e}</span>`
		return `<span class="compact ${emp.type}${emp.type === "manager" ? " inverted" : ""}">${emp.title}</span>`
	}

	let out = `<br /><b>${name}:  BEACH: </b><br />`
	for (const e of moveData[0]) out += e == null ? " =BLANK= " : employeeSpan(e)
	out += `<br /><br /><b>${name}:  AT WORK: </b><br />`
	let freeSlots = 4
	for (const e of moveData[1]) {
		out += e == null ? " =BLANK= " : employeeSpan(e)
		freeSlots--
		freeSlots += rules.getSubSlotsForEmployee(e)
	}
	out += ` =FREE SLOTS: ${freeSlots} based on ceo 4= AUTO-SELECT: ${moveData[2]} `
	return out
}

window.FCMadmin = { unpackModel, decodeMove }
