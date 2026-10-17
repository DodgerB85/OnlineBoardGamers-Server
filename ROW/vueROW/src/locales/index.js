// ROW messages assembled from the shared app shell plus the per-language
// ROW namespace files (mirrors FCM's locales/index.js).
import app from "./app.js"
import rowEn from "./row/en.json"
import rowIt from "./row/it.json"
import rowNl from "./row/nl.json"
import rowPt from "./row/pt.json"

export const messages = {
	en: { ...app, ...rowEn },
	it: { ...app, ...rowIt },
	nl: { ...app, ...rowNl },
	pt: { ...app, ...rowPt },
}

export default messages
