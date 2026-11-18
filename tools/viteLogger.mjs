// Vite reports every emitted asset and its size at info level. Keep build
// progress and warnings, but suppress that asset-size table.
const ANSI = /\u001b\[[0-9;]*m/g
const ASSET_SIZE = /(?:^|\s)\d+(?:[.,]\d+)*\s+(?:B|kB|MB)(?:\s+│\s+gzip:\s+\d+(?:[.,]\d+)*\s+(?:B|kB|MB))?\s*$/

export function quietAssetLogger(createLogger) {
	const logger = createLogger()
	const info = logger.info.bind(logger)
	logger.info = (message, options) => {
		if (typeof message === "string") {
			const lines = message.split("\n").map((line) => line.replace(ANSI, "")).filter((line) => line.trim())
			if (lines.length && lines.every((line) => ASSET_SIZE.test(line))) return
		}
		info(message, options)
	}
	return logger
}
