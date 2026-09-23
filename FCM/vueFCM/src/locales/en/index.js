// English messages assembled from per-area parts.
// Each area owns one file so parallel edits never collide.
import core from './core.js'
import actionArea from './actionArea.js'
import workingDay from './workingDay.js'
import prePhase from './prePhase.js'
import topMenu from './topMenu.js'
import history from './history.js'
import panels from './panels.js'
import io from './io.js'

function merge(target, source) {
	for (const key of Object.keys(source)) {
		const a = target[key]
		const b = source[key]
		if (b && typeof b === 'object' && !Array.isArray(b)) {
			target[key] = merge(a && typeof a === 'object' && !Array.isArray(a) ? a : {}, b)
		} else {
			target[key] = b
		}
	}
	return target
}

export const en = merge({}, core)
merge(en, actionArea)
merge(en, workingDay)
merge(en, prePhase)
merge(en, topMenu)
merge(en, history)
merge(en, panels)
merge(en, io)

export default en
