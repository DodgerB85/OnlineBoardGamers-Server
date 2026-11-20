import * as rf from "./URRreference.js"
import * as water from "./URRwater.js"
import { createWaterRecorder } from "./URRwaterPlayback.js"

// A forecast is a full rainy season on a clone of the live board. The viewer
// may choose every destination, so the clone is never written back.
export function createWaterForecast(sourceGame) {
	const game = JSON.parse(JSON.stringify(sourceGame))
	for (const area of game.board.areas) area.irrigatedBy = null
	game.gameflow.phase = rf.PHASE_RAINY_SEASON
	game.gameflow.turnOrder = []
	game.rain = { step: "routing", outflow: null, harvestOrder: [] }
	const recorder = createWaterRecorder(game)
	const finished = water.startWaterRouting(game, recorder.record)
	return { game, recorder, finished }
}

export function chooseWaterForecast(forecast, area, amount) {
	forecast.finished = water.allocateWater(forecast.game, { type: "allocateWater", area, amount }, forecast.recorder.record)
	return forecast.finished
}

export function advanceWaterForecast(forecast) {
	forecast.finished = water.advanceWaterRouting(forecast.game, forecast.recorder.record)
	return forecast.finished
}

export function waterForecastDecider(game) {
	const frame = water.currentWaterFrame(game)
	if (!frame) return null
	const area = game.board.areas.find((entry) => entry.id === frame.area)
	return area?.waterwork ? game.states[area.waterwork.state].king : null
}
