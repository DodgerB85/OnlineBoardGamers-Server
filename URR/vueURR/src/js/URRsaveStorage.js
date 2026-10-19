export function compactGameData(state) {
	return {
		...state,
		format: "urr-save-v2",
		states: state.states.map((entry) => [entry.money, entry.king ?? -1, Number(entry.isActive), entry.diggers.map((crew) => [crew.id, crew.era, Number(crew.hasDug)]), Number(entry.hasRevolted)]),
		nations: state.nations.map((entry) => [entry.ownerType === null ? -1 : entry.ownerType === "player" ? 0 : 1, entry.owner ?? -1, Number(entry.isRemoved), entry.bids]),
	}
}

export function expandGameData(data) {
	if (data.format !== "urr-save-v2") throw new Error("Unsupported URR save format")
	const { format, ...expandedData } = data
	return {
		...expandedData,
		states: data.states.map((entry, id) => ({ id, money: entry[0], king: entry[1] < 0 ? null : entry[1], isActive: !!entry[2], diggers: entry[3].map(([crewId, era, hasDug]) => ({ id: crewId, era, capacity: rf.ERA_CARD_DATA[era].digger[0], hasDug: !!hasDug })), hasRevolted: !!entry[4] })),
		nations: data.nations.map((entry, id) => ({ id, ownerType: entry[0] < 0 ? null : entry[0] === 0 ? "player" : "state", owner: entry[1] < 0 ? null : entry[1], isRemoved: !!entry[2], bids: entry[3] })),
	}
}
import * as rf from "./URRreference.js"

