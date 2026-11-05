import test from "node:test";
import assert from "node:assert/strict";

import { AI_POLL_INTERVAL_MS, POLL_INTERVAL_MS, pollIntervalMs } from "./LBR_IO.js";

test("polling is faster only while an AI seat is to act", () => {
	assert.equal(pollIntervalMs({ activeSeat: 1, pending: null }, [1]), AI_POLL_INTERVAL_MS);
	assert.equal(pollIntervalMs({ activeSeat: 0, pending: null }, [1]), POLL_INTERVAL_MS, "a human seat keeps the slow poll");
	assert.equal(pollIntervalMs({ activeSeat: 1, pending: { seat: 0 } }, [1]), POLL_INTERVAL_MS, "the pending decision wins");
	assert.equal(pollIntervalMs({ activeSeat: 1, gameOver: true }, [1]), POLL_INTERVAL_MS, "a finished game never speeds up");
	assert.equal(pollIntervalMs(null, [1]), POLL_INTERVAL_MS, "no position yet");
});
