import { defineConfig } from "vitest/config"
import { parse, compileScript } from "@vue/compiler-sfc"

export default defineConfig({
	cacheDir: ".vite-test",
	// Compile client templates for the Node-based Vue custom-renderer tests.
	plugins: [{
		name: "vue-client-test-renderer",
		transform(code, id) {
			if (!id.endsWith(".vue")) return
			const { descriptor } = parse(code, { filename: id })
			return { code: compileScript(descriptor, { id, inlineTemplate: true }).content, map: null }
		},
	}],
	test: {
		environment: "node",
		include: ["src/**/*.test.js"],
	},
})
