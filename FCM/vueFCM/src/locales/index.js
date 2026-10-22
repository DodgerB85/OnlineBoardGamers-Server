import en, { merge } from './en/index.js'
import zhHans from './zh-hans.js'
import zhHansExtra from './zh-hans.extra.js'
import de from './de.js'
import deExtra from './de.extra.js'
import fr from './fr.js'
import frExtra from './fr.extra.js'
import es from './es.js'
import esExtra from './es.extra.js'
import it from './it.js'
import itExtra from './it.extra.js'

// Later translation passes live in *.extra.js; keep the main files untouched.
const withExtra = (messages, extra) => merge(merge({}, messages), extra)

export const messages = {
	en,
	'zh-hans': withExtra(zhHans, zhHansExtra),
	de: withExtra(de, deExtra),
	fr: withExtra(fr, frExtra),
	es: withExtra(es, esExtra),
	it: withExtra(it, itExtra),
}

export default messages
