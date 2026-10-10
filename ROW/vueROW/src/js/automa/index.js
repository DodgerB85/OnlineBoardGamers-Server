/**
 * ROW automa entry point. The Garth ruleset itself lives in ./garth.js; this module is the
 * thin seam the rest of the client talks to (seat name + one-turn driver).
 */
import { Garth, createGarth, deserializeGarth, DIFFICULTIES } from "./garth"

/** Django username of the computer seat. Its presence marks an automa game. */
export const AI_NAME = "RowAI"

export { Garth, createGarth, deserializeGarth, DIFFICULTIES }

export function isAutomaSeat(playerName) {
	return playerName === AI_NAME
}

export const AUTOMA_STEP_CAP = 500

/**
 * Drive Garth until its turn ends (or the game ends). Java runs one step per `executeAutoma`
 * call; the host loops. Throws if it fails to hand the turn back within the cap, which would
 * otherwise spin forever on a port bug.
 */
export function playAutomaTurns(game, rng, cap = AUTOMA_STEP_CAP) {
	let steps = 0
	while (!game.isEnded() && game.currentPlayer === AI_NAME && steps < cap) {
		game.executeAutoma(AI_NAME, rng)
		steps++
	}
	if (steps >= cap)
		throw new Error("Automa did not finish its turn")
	return steps
}
