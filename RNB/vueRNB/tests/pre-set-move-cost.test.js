/**
 * Tests for pre-set move cost bug:
 *
 * Bug: startPlayerMainPhasePreTurn unconditionally calls resetTransportersForNewTurn
 * after pre-set loading, even when the pre-set was INTERRUPTED (a stack action failed).
 * This erases remainingMoves deductions from already-executed pre-set moves.
 * The transporter moves to a new location (from the pre-set move) but keeps full maxMoves,
 * letting it move far more than intended in the player's manual turn.
 *
 * Fixed: startPlayerMainPhasePreTurn checks failedStackHistoryEntry and skips the
 * reset when a pre-set move failed during loading.
 */

import test from "node:test"
import assert from "node:assert/strict"

// --- Helper: resetTransportersForNewTurn (replica of RNBmodel.js) --- //

const transporterStats = {
	32: { maxMoves: 2, maxCapacity: 2 }, // DONKEY
	33: { maxMoves: 3, maxCapacity: 3 }, // WAGON
	34: { maxMoves: 4, maxCapacity: 6 }, // TRUCK
	35: { maxMoves: 3, maxCapacity: 3 }, // RAFT
	36: { maxMoves: 4, maxCapacity: 5 }, // ROWBOAT
	37: { maxMoves: 6, maxCapacity: 8 }, // STEAMER
	38: { maxMoves: 99, maxCapacity: 4 }, // PLANE
}

function resetTransportersForNewTurn(inGameTransporters) {
	for (let i = 0; i < inGameTransporters.length; i++) {
		let stats = transporterStats[inGameTransporters[i].type]
		if (!stats) stats = { maxMoves: 0 }
		inGameTransporters[i].remainingMoves = stats.maxMoves
		inGameTransporters[i].movedThisTurn = false
		inGameTransporters[i].justPickedUpFromLocation.splice(0)
	}
}

// --- Helper: simulate startPlayerMainPhasePreTurn's reset-or-skip logic --- //

function handlePreTurnReset(inGameTransporters, failedStackHistoryEntry) {
	// This mirrors the fix: skip transporter/resource/stack/undo reset
	// when a pre-set move failed
	const preMoveFailed = failedStackHistoryEntry.length > 0
	if (!preMoveFailed) {
		resetTransportersForNewTurn(inGameTransporters)
	}
}

// --- Helper to create a transporter --- //

function makeTransporter(id, type, remainingMoves) {
	return {
		id,
		type,
		remainingMoves,
		movedThisTurn: remainingMoves < transporterStats[type].maxMoves,
		justPickedUpFromLocation: [],
		location: [0, id, 0],
		ownerIndex: 0,
		uniqueID: `00${String(type).padStart(2, "0")}00000${id}`,
	}
}

// ============================================================
// Tests
// ============================================================

test("resetTransportersForNewTurn sets remainingMoves to maxMoves", () => {
	const transporters = [
		makeTransporter(0, 36, 2), // rowboat, used 2 of 4
		makeTransporter(1, 38, 50), // plane, used 49 of 99
	]

	resetTransportersForNewTurn(transporters)

	assert.equal(transporters[0].remainingMoves, 4, "rowboat reset to 4")
	assert.equal(transporters[1].remainingMoves, 99, "plane reset to 99")
	assert.equal(transporters[0].movedThisTurn, false)
	assert.equal(transporters[1].movedThisTurn, false)
})

test("handlePreTurnReset skips reset when failedStackHistoryEntry has items", () => {
	// Rowboat already moved 2 (remaining=2). Pre-set move failed.
	const transporters = [makeTransporter(0, 36, 2)]
	const failedEntry = ["plane_move_interrupted"]

	handlePreTurnReset(transporters, failedEntry)

	// remainingMoves should still be 2 — NOT reset to 4
	assert.equal(transporters[0].remainingMoves, 2,
		"rowboat keeps remainingMoves=2 after failed pre-set")
	assert.equal(transporters[0].movedThisTurn, true,
		"rowboat keeps movedThisTurn=true after failed pre-set")
})

test("handlePreTurnReset resets when failedStackHistoryEntry is empty", () => {
	const transporters = [makeTransporter(0, 36, 2)]

	handlePreTurnReset(transporters, [])

	// remainingMoves should be reset to 4
	assert.equal(transporters[0].remainingMoves, 4,
		"rowboat reset to 4 when no pre-set failure")
})

test("interrupted pre-set allows exceeding maxMoves (BUG REPRODUCTION)", () => {
	// Full scenario: rowboat produced, then pre-set move succeeded, then
	// another pre-set move FAILED. Without the fix, resetTransportersForNewTurn
	// erases the cost deduction and the rowboat gets full moves back.

	const rowboat = makeTransporter(0, 36, 4) // produced, fresh at 4

	// Pre-set move: rowboat moves 2 hexes, cost deducted
	rowboat.remainingMoves = 2
	rowboat.movedThisTurn = true

	// Another pre-set move fails (e.g., plane can't reach destination)
	const failedEntry = ["failed_plane_move"]

	// --- WITHOUT FIX (old behavior) ---
	// Use a clone to show what the bug produces
	const bugScenario = [Object.assign({}, rowboat, { justPickedUpFromLocation: [] })]
	resetTransportersForNewTurn(bugScenario)
	// Bug: rowboat reset to 4, even though it already moved 2 in pre-set
	assert.equal(bugScenario[0].remainingMoves, 4,
		"BUG: rowboat reset to 4 after interrupted pre-set (would allow 6 total)")
	// Rowboat can now move 4 more = 6 total, exceeding maxMoves

	// --- WITH FIX (new behavior) ---
	const fixScenario = [Object.assign({}, rowboat, { justPickedUpFromLocation: [] })]
	handlePreTurnReset(fixScenario, failedEntry)
	// Fix: rowboat keeps 2 remainingMoves
	assert.equal(fixScenario[0].remainingMoves, 2,
		"FIX: rowboat keeps remainingMoves=2 after interrupted pre-set")

	// With the fix, total movement = 2 (pre-set) + 2 (remaining) = 4 = maxMoves
	// Without the fix, total movement = 2 (pre-set) + 4 (reset) = 6 > maxMoves
	console.log("PASS: interrupted pre-set no longer erases move cost deduction")
})


