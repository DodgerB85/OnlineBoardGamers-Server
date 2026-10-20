// English messages assembled from per-area parts.
// Each area owns one file so parallel edits never collide.
import core from "./core.js"
import topMenu from "./topMenu.js"
import map from "./map.js"
import city from "./city.js"
import history from "./history.js"
import reference from "./reference.js"
import io from "./io.js"

function merge(target, source) {
	for (const key of Object.keys(source)) {
		const a = target[key]
		const b = source[key]
		if (b && typeof b === "object" && !Array.isArray(b)) {
			target[key] = merge(a && typeof a === "object" && !Array.isArray(a) ? a : {}, b)
		} else {
			target[key] = b
		}
	}
	return target
}

export const en = merge({}, core)
merge(en, topMenu)
merge(en, map)
merge(en, city)
merge(en, history)
merge(en, reference)
merge(en, io)

export default en
