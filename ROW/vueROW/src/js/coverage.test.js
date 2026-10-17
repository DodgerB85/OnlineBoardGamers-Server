import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ActionType } from "./ROWindex";

/**
 * Action coverage guard: every command the engine defines must be exercised by the replay
 * corpus, referenced by a unit test, or explicitly declared in `coverage-matrix.json` with a
 * reason. Anything else fails, so a new ActionType (or a lost fixture) cannot slip through
 * untested.
 */
const ALL = Object.values(ActionType);

function fixtureActionTypes() {
	const dirs = [join(__dirname, "__fixtures__", "replays"), join(__dirname, "__fixtures__", "replays", "fuzz")];
	const set = new Set();
	for (const dir of dirs) {
		for (const file of readdirSync(dir)) {
			if (!file.endsWith(".json")) continue;
			const json = JSON.parse(readFileSync(join(dir, file), "utf8"));
			for (const command of json.commands ?? []) {
				if (command.action && command.action.type) set.add(command.action.type);
			}
		}
	}
	return set;
}

function referencedActionTypes() {
	const set = new Set();
	const dirs = [__dirname, join(__dirname, "automa")];
	for (const dir of dirs) {
		for (const file of readdirSync(dir)) {
			if (!file.endsWith(".test.js")) continue;
			const text = readFileSync(join(dir, file), "utf8");
			for (const match of text.matchAll(/ActionType\.([A-Z0-9_]+)/g)) set.add(match[1]);
		}
	}
	return set;
}

const matrix = JSON.parse(readFileSync(join(__dirname, "coverage-matrix.json"), "utf8"));

describe("Action coverage", () => {
	it("every ActionType is exercised by the corpus/tests or declared with a reason", () => {
		const covered = new Set([...fixtureActionTypes(), ...referencedActionTypes()]);
		const missing = ALL.filter((action) => !covered.has(action) && !matrix[action]);
		expect(missing, `Undeclared and unexercised actions:\n${missing.join("\n")}`).toEqual([]);
	});
});
