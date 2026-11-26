import createFcmRolloutModule from "./wasm/fcm_rollout.js"

let modulePromise = null

function getModule() {
	if (!modulePromise) {
		modulePromise = createFcmRolloutModule({
			locateFile(path) {
				if (path.endsWith(".wasm")) return "/static/FCM/wasm/fcm_rollout.wasm"
				return path
			},
		})
	}
	return modulePromise
}

self.onmessage = async event => {
	const { id, input } = event.data
	try {
		const mod = await getModule()
		const raw = mod.chooseFullRolloutTurn(JSON.stringify(input))
		const plan = JSON.parse(raw)
		if (plan.error) {
			self.postMessage({ id, error: plan.error })
		} else {
			self.postMessage({ id, plan })
		}
	} catch (error) {
		self.postMessage({ id, error: error?.message || String(error) })
	}
}
