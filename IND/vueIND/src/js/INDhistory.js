/** History Functions
 *  Generally handles clicks to a history entry
 * So this sets up the appropriate flashing highlights in the game
 *
 *
 *
 */

import * as rf from "./INDreference"

import { useModelStore } from "../stores/INDstore.js"
import { nextTick } from "vue"

export async function setupHistoryHighlight(action, entry3, entry_id) {
	const store = useModelStore()
	store.clearHistoryHelpers()
	await nextTick()

	if (action === rf.HIST_ADD_CITY) {
		store.historyHelpers.histTerritoriesToHighlight.push(entry3[0])
	} else if (action === rf.HIST_ACQUIRE_COMPANY) {
		store.historyHelpers.histTerritoriesToHighlight.push(entry3[1])
	} else if (action === rf.HIST_RND) {
		let entry = store.history[entry_id]
		if (entry3.length === 2) store.historyHelpers.histRNDmarkersToHighlight.push([entry[1], entry3[0], entry3[1]])
		else store.historyHelpers.histRNDmarkersToHighlight.push([entry3[2], entry3[0], entry3[1]])
	} else if (action === rf.HIST_MERGER_REMOVE_SIAP_FAJI_TERRS) {
		// idx 0 is the slot idx
		for (let i = 1; i < entry3.length; i++) {
			store.historyHelpers.histTerritoriesToHighlight.push(entry3[i])
		}
	} else if (action === rf.HIST_MERGER_SHIP_REDEPLOYMENT) {
		// idx 0 is the slot idx
		for (let i = 1; i < entry3.length; i++) {
			store.historyHelpers.histTerritoriesToHighlight.push(entry3[i])
		}
	} else if (action === rf.HIST_OPERATE_SHIPPING) {
		if (entry3.length > 1) {
			// Last entry is ship gfx
			for (let i = 1; i < entry3.length - 1; i++) {
				store.historyHelpers.histTerritoriesToHighlight.push(entry3[i])
			}
		}
	} else if (action === rf.HIST_SKIP_OPERATE_LAND) {
		// just have slot content in entry3
		// List of company IDs
		// No way to retreieve company state at that time
	} else if (action === rf.HIST_OPERATE_LAND_PAID_EXPANSION_ONLY) {
		for (let i = 0; i < entry3[1].length; i++) {
			store.historyHelpers.histTerritoriesToHighlight.push(entry3[1][i])
		}
	} else if (action === rf.HIST_OPERATE_LAND) {
		// entry3[0] is SLOT CONTENT, ie. [companyID, companyID, companyID]
		// MIDDLE entries are good journey, [prod marker terr, ship_company_owner, ship_company_id, chip_terr, ship_ter ship_ter..... city_terr]
		// LAST entry is expansions. -1 if paid for

		// highlight all SHIPPED terrs and CITIES in blue
		for (let i = 1; i <= entry3.length - 2; i++) {
			store.historyHelpers.histTerritoriesToHighlightBlue.push(entry3[i][0])
			store.historyHelpers.histCitiesToHighlightBlue.push(entry3[i][entry3[i].length - 1])
		}
		// highlight all NEW terrs in yellow
		for (let i = 0; i < entry3[entry3.length - 1].length; i++) {
			if (entry3[entry3.length - 1][i] !== -1 && entry3[entry3.length - 1][i] !== -2) store.historyHelpers.histTerritoriesToHighlight.push(entry3[entry3.length - 1][i])
		}
		// Highlight USED ship markers
		for (let i = 1; i <= entry3.length - 2; i++) {
			for (let j = 3; j <= entry3[i].length - 2; j++) {
				let companyID = entry3[i][2]
				let terrID = entry3[i][j]
				store.historyHelpers.histShipMarkersToHighlight.push([companyID, terrID])
			}
		}
	} else if (action === rf.HIST_CITY_GROWTH || action === rf.HIST_MANUAL_CITY_GROWTH) {
		store.historyHelpers.histCitiesToHighlight = entry3[0].concat(entry3[1])
	}
}
