/**
 * Small, pure rule helpers shared by the UI and unit tests.
 * Keep these free of store/Vue imports so they can be tested with node --test.
 */

export function canPairNicoloHouse(houseNum) {
	return houseNum >= 25
}

export function assignArray(target, source) {
	target.splice(0, target.length, ...source)
	return target
}

export function clampFamine(level, fountainsBuilt) {
	return Math.max(0, level - fountainsBuilt)
}

export function actingPlayerIndex(trainingGame, pov, currentPlayerIndex) {
	if (trainingGame) return currentPlayerIndex
	return pov
}

// A player who left before placing a city has an empty ZoC and must not count for San Giorgio.
export function countsForSanGiorgioWin(isGone, zocSize) {
	return !isGone || zocSize >= 37
}
