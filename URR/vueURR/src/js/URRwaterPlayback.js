import * as rf from "./URRreference.js"
import * as water from "./URRwater.js"
import { historyAction } from "./URRhistoryActions.js"
import i18n from "../i18n.js"

const t = i18n.global.t

function canalPath(board, from, to) {
	const queue = [[from]]
	const visited = new Set([from])
	for (const path of queue) {
		const last = path.at(-1)
		if (last === to) return path
		for (const canal of board.canals) {
			if (!canal.includes(last)) continue
			const next = canal.find((id) => id !== last)
			if (visited.has(next)) continue
			const area = board.areas.find((area) => area.id === next)
			if (next !== to && (area.isRiver || area.waterwork)) continue
			visited.add(next)
			queue.push([...path, next])
		}
	}
	throw new Error(t("waterPlayback.noCanalPath"))
}

export function buildWaterPlayback(history, snapshots, completionIndex) {
	const selected = snapshots.slice(0, completionIndex + 1)
	const completed = selected.at(-1)
	if (!completed || completed.rain.outflow === null || completed.rain.step === "routing") throw new Error(t("waterPlayback.notComplete"))
	let startIndex = completionIndex
	while (startIndex > 0) {
		const before = selected[startIndex - 1]
		const after = selected[startIndex]
		if ([rf.PHASE_DEVELOPMENT, rf.PHASE_SETTLEMENT].includes(before.gameflow.phase) && (after.gameflow.phase === rf.PHASE_RAINY_SEASON || after.gameflow.turn > before.gameflow.turn || after.gameflow.phase === rf.PHASE_GAME_OVER)) break
		startIndex--
	}
	if (startIndex === 0) throw new Error(t("waterPlayback.noStart"))
	const game = JSON.parse(JSON.stringify(selected[startIndex]))
	for (const area of game.board.areas) area.irrigatedBy = null
	game.rain = { step: "routing", outflow: null, harvestOrder: [] }
	const board = JSON.parse(JSON.stringify(game.board))
	const steps = []
	const waitingWater = new Map()
	const label = (id) => board.areas.find((area) => area.id === id)?.label || id
	function record(event) {
		if (event.type === "confluence") {
			if (event.waiting) waitingWater.set(event.to, event.amount)
			else waitingWater.delete(event.to)
		}
		// The reservoir's undiverted share stays on the river, and stays visible
		// there, until its canal play is done and the water is released.
		if (event.type === "reservoir" && event.downstream > 0) waitingWater.set(event.to, event.downstream)
		if (event.type === "river" && waitingWater.has(event.from)) waitingWater.delete(event.from)
		if (event.amount === 0) return
		const descriptions = {
			source: t("waterPlayback.source", { amount: event.amount, area: label(event.to) }),
			river: event.to ? t("waterPlayback.riverTo", { amount: event.amount, from: label(event.from), to: label(event.to) }) : t("waterPlayback.riverExit", { amount: event.amount, from: label(event.from) }),
			confluence: event.waiting ? t("waterPlayback.confluenceWait", { amount: event.amount, area: label(event.to) }) : t("waterPlayback.confluenceMerge", { amount: event.amount, area: label(event.to) }),
			reservoir: t("waterPlayback.reservoir", { state: rf.STATE_NAMES[event.state], area: label(event.to), amount: event.amount, downstream: event.downstream }),
			pump: t("waterPlayback.pump", { amount: event.amount, from: label(event.from), state: rf.STATE_NAMES[event.state], to: label(event.to) }),
			irrigate: t("waterPlayback.irrigate", { state: rf.STATE_NAMES[event.state], area: label(event.to) }),
			return: t("waterPlayback.return", { amount: event.amount, from: label(event.from), to: label(event.to) }),
			outflow: t("waterPlayback.outflow", { amount: event.amount }),
		}
		const path = event.from && event.to && ["pump", "irrigate", "return"].includes(event.type) ? canalPath(board, event.from, event.to) : [event.from, event.to].filter(Boolean)
		steps.push({ ...event, path, waitingWater: [...waitingWater].map(([area, amount]) => ({ area, amount })), text: descriptions[event.type], wet: game.board.areas.filter((area) => area.irrigatedBy !== null).map((area) => area.id) })
	}
	let finished = water.startWaterRouting(game, record)
	for (let index = startIndex + 1; index <= completionIndex; index++) {
		const action = historyAction(history[index])
		if (action?.type === "allocateWater") finished = water.allocateWater(game, action, record)
		else if (action?.type === "advanceWater") finished = water.advanceWaterRouting(game, record)
	}
	if (!finished || game.rain.routing.outflow !== completed.rain.outflow) throw new Error(t("waterPlayback.noAllDecisions"))
	const wet = game.board.areas.filter((area) => area.irrigatedBy !== null).map((area) => area.id)
	steps.push({ type: "complete", path: [], wet, waitingWater: [], text: wet.length === 1 ? t("waterPlayback.completeOne", { count: wet.length, outflow: game.rain.routing.outflow }) : t("waterPlayback.completeMany", { count: wet.length, outflow: game.rain.routing.outflow }) })
	return { board, steps }
}
