import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.js"],
	},
	resolve: {
		alias: {
			"@static": resolve("../static"),
		},
	},
})
