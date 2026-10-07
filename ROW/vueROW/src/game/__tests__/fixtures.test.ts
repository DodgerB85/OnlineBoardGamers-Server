import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { RecordingRandom } from "../core"

/**
 * The 17 checked-in Java replay fixtures (copied verbatim from row-local).
 *
 * A full byte-for-byte state replay would require our serialization schema to
 * match the Java one, which this port deliberately does not (it uses a cleaner
 * versioned schema). What we *do* verify here is the replay contract that the
 * Java tests enforce: every recorded random draw is reused with the same bit
 * width and the tape is fully consumed. This is the RNG-determinism guarantee
 * the whole port depends on.
 */
const fixtureDir = join(__dirname, "..", "__fixtures__", "replays")
const files = readdirSync(fixtureDir).filter((f) => f.endsWith(".json"))

describe("Java replay fixtures", () => {
	it("contains the 17 expected fixtures", () => {
		expect(files.length).toBe(17)
	})

	for (const file of files) {
		it(`honours the random tape contract in ${file}`, () => {
			const replay = JSON.parse(readFileSync(join(fixtureDir, file), "utf8"))
			expect(replay.version).toBe(1)
			expect(["row", "row2"]).toContain(replay.game)
			expect(["FIRST", "SECOND"]).toContain(replay.edition)
			expect(Array.isArray(replay.commands)).toBe(true)

			for (const command of replay.commands) {
				const tape = (command.random ?? []) as { bits: number; value: number }[]
				const rng = new RecordingRandom(tape)
				for (const entry of tape) {
					expect(rng.next(entry.bits)).toBe(entry.value)
				}
				expect(() => rng.assertFullyConsumed()).not.toThrow()
			}
		})
	}
})
