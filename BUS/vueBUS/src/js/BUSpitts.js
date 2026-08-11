import * as rf from "./BUSreference.js"
import { useModelStore } from "../stores/BUSstore.js"

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
