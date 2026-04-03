/** History Functions
 *  Generally handles clicks to a history entry
 * So this sets up the appropriate flashing highlights in the game
 *
 *
 *
 */



import { useModelStore } from "../stores/KFWstore.js"
import { nextTick } from "vue"

export async function setupHistoryHighlight(action, entry3, entry_id) {
	const store = useModelStore()
	store.clearHistoryHelpers()
	await nextTick()

	/*if (action === rf.HIST_ADD_CITY) {//
	} else if (action === rf.HIST_ACQUIRE_COMPANY) {
		//
	} */
}
