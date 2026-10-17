import { defineConfig } from "vitest/config"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
	resolve: {
		alias: [
			{ find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
			{ find: "@static", replacement: fileURLToPath(new URL("../static", import.meta.url)) },
		],
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.js"],
	},
})
