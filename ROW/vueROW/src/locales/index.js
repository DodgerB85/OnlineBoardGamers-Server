// ROW messages assembled from the shared app shell plus the per-language
// ROW namespace files (mirrors FCM's locales/index.js).
import app from "./app.js"
import appDe from "./app-de.js"
import appEs from "./app-es.js"
import appFr from "./app-fr.js"
import appIt from "./app-it.js"
import appNl from "./app-nl.js"
import appPt from "./app-pt.js"
import appZhHans from "./app-zh-hans.js"
import rowDe from "./row/de.json"
import rowEn from "./row/en.json"
import rowEs from "./row/es.json"
import rowFr from "./row/fr.json"
import rowIt from "./row/it.json"
import rowNl from "./row/nl.json"
import rowPt from "./row/pt.json"
import rowZhHans from "./row/zh-hans.json"

export const messages = {
	en: { ...app, ...rowEn },
	it: { ...app, ...appIt, ...rowIt },
	nl: { ...app, ...appNl, ...rowNl },
	pt: { ...app, ...appPt, ...rowPt },
	de: { ...app, ...appDe, ...rowDe },
	fr: { ...app, ...appFr, ...rowFr },
	es: { ...app, ...appEs, ...rowEs },
	"zh-hans": { ...app, ...appZhHans, ...rowZhHans },
}

export default messages
