import en from "./en.js"
import de from "./de.js"
import es from "./es.js"
import fr from "./fr.js"
import it from "./it.js"
import zhHans from "./zh-hans.js"
import { busExtra } from "./busExtra.js"

function merge(base, extra) {
	for (const key in extra) {
		if (extra[key] && typeof extra[key] === "object" && !Array.isArray(extra[key])) {
			base[key] = merge(base[key] || {}, extra[key])
		} else {
			base[key] = extra[key]
		}
	}
	return base
}

export const messages = {
	en: merge(en, busExtra.en),
	de: merge(de, busExtra.de),
	es: merge(es, busExtra.es),
	fr: merge(fr, busExtra.fr),
	it: merge(it, busExtra.it),
	"zh-hans": merge(zhHans, busExtra["zh-hans"]),
}

export default messages
