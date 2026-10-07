import { describe, expect, it } from "vitest"
import { ActionType, ROWError, ROWException, Hand, JavaRandom, PossibleAction, RecordingRandom, handFee } from "../core"

describe("Hand toll matrix (TrailTest / Hand.getFee)", () => {
	it("matches the authoritative fee matrix", () => {
		// NONE 0/0/0, GREEN 2/2/1, BLACK 2/1/2, BOTH 4/3/3 for 2/3/4 players
		expect([handFee(Hand.NONE, 2), handFee(Hand.NONE, 3), handFee(Hand.NONE, 4)]).toEqual([0, 0, 0])
		expect([handFee(Hand.GREEN, 2), handFee(Hand.GREEN, 3), handFee(Hand.GREEN, 4)]).toEqual([2, 2, 1])
		expect([handFee(Hand.BLACK, 2), handFee(Hand.BLACK, 3), handFee(Hand.BLACK, 4)]).toEqual([2, 1, 2])
		expect([handFee(Hand.BOTH, 2), handFee(Hand.BOTH, 3), handFee(Hand.BOTH, 4)]).toEqual([4, 3, 3])
	})
})

describe("java.util.Random clone", () => {
	it("is deterministic for a given seed", () => {
		const a = new JavaRandom(0)
		const b = new JavaRandom(0)
		for (let i = 0; i < 20; i++) expect(a.next(31)).toBe(b.next(31))
	})

	it("nextInt(bound) stays in range (both branches)", () => {
		const r = new JavaRandom(12345)
		for (let i = 0; i < 500; i++) {
			const v = r.int(100)
			expect(v).toBeGreaterThanOrEqual(0)
			expect(v).toBeLessThan(100)
		}
		const p = new JavaRandom(99)
		for (let i = 0; i < 500; i++) {
			const v = p.int(64)
			expect(v).toBeGreaterThanOrEqual(0)
			expect(v).toBeLessThan(64)
		}
	})
})

describe("RecordingRandom tape contract (ReplayContractTest)", () => {
	it("replays a bounded tape and must be fully consumed", () => {
		const tape = [
			{ bits: 31, value: 123 },
			{ bits: 31, value: 456 },
		]
		const r = new RecordingRandom(tape)
		expect(r.next(31)).toBe(123)
		expect(r.next(31)).toBe(456)
		expect(() => r.assertFullyConsumed()).not.toThrow()
	})

	it("reports unused draws", () => {
		const r = new RecordingRandom([{ bits: 31, value: 1 }])
		expect(() => r.assertFullyConsumed()).toThrow(/unused draws/)
	})

	it("reports a bit-width mismatch", () => {
		const r = new RecordingRandom([{ bits: 31, value: 1 }])
		expect(() => r.next(26)).toThrow(/mismatch/)
	})

	it("reports tape exhaustion", () => {
		const r = new RecordingRandom([])
		expect(() => r.next(31)).toThrow(/exhausted/)
	})
})

describe("PossibleAction state machine (PossibleActionTest)", () => {
	it("mandatory cannot be skipped and can only be performed once", () => {
		const pa = PossibleAction.mandatory(ActionType.MOVE)
		expect(pa.canPerform(ActionType.MOVE)).toBe(true)
		expect(pa.canSkip()).toBe(false)
		expect(() => pa.skip()).toThrowError()
		pa.perform(ActionType.MOVE)
		expect(pa.isFinal()).toBe(true)
	})

	it("repeat enforces at least/at most", () => {
		const repeat = PossibleAction.repeat(1, 1, ActionType.DRAW_CARD)
		expect(() => repeat.skip()).toThrowError(/CANNOT_SKIP_ACTION/)
		repeat.perform(ActionType.DRAW_CARD)
		expect(repeat.isFinal()).toBe(true)
	})

	it("choice requires exactly one option", () => {
		const choice = PossibleAction.choiceActions([ActionType.GAIN_1_DOLLAR, ActionType.GAIN_2_DOLLARS])
		expect(choice.canSkip()).toBe(false)
		expect(() => choice.skip()).toThrowError(/MUST_CHOOSE_ACTION/)
		expect(() => choice.perform(ActionType.DRAW_CARD)).toThrowError(/CANNOT_PERFORM_ACTION/)
	})

	it("any allows performing then skipping", () => {
		const any = PossibleAction.anyActions([ActionType.GAIN_1_DOLLAR, ActionType.GAIN_2_DOLLARS])
		expect(any.canSkip()).toBe(true)
		any.perform(ActionType.GAIN_1_DOLLAR)
		any.perform(ActionType.GAIN_2_DOLLARS)
		expect(any.isFinal()).toBe(true)
	})

	it("whenThen gates 'then' behind 'when'", () => {
		const wt = PossibleAction.whenThen(1, 1, ActionType.TAKE_OBJECTIVE_CARD, ActionType.GAIN_2_DOLLARS)
		expect(() => wt.perform(ActionType.GAIN_2_DOLLARS)).toThrowError()
		wt.perform(ActionType.TAKE_OBJECTIVE_CARD)
		expect(wt.canPerform(ActionType.GAIN_2_DOLLARS)).toBe(true)
		wt.perform(ActionType.GAIN_2_DOLLARS)
		expect(wt.isFinal()).toBe(true)
	})
})

describe("ROWException carries the error code", () => {
	it("uses the ROWError name as the message", () => {
		const e = new ROWException(ROWError.CANNOT_PERFORM_ACTION)
		expect(e.message).toBe("CANNOT_PERFORM_ACTION")
		expect(e.error).toBe(ROWError.CANNOT_PERFORM_ACTION)
	})
})
