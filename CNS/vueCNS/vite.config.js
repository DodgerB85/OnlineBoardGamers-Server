import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { resolve } from "path"
import { fileURLToPath, URL } from "node:url"

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
	plugins: [vue()],
	root: resolve("./src"),
	server: {
		host: "0.0.0.0",
		port: 3012,
		open: false,
		watch: {
			usePolling: true,
			disableGlobbing: false,
			interval: 1000,
		},
		fs: {
			allow: [
				// Search up for workspace root
				"..",
				// Or be explicit by pointing to the project root
				"C:/Roger/Programming/OnlineBoardGamers/CNS/",
			],
		},
	},

	resolve: {
		alias:
			command === "serve"
				? [
						{
							find: "@static",
							replacement: fileURLToPath(new URL("../static", import.meta.url)),
						},
					]
				: [
						{
							find: "@static",
							replacement: "https://www.onlineboardgamers.com/static",
						},
					],
	},

	base: command === "serve" ? "/static/" : "https://www.onlineboardgamers.com/static/CNS/",

	build: {
		outDir: resolve("../static/CNS/CNSvuedist"),
		//assetsDir: "./assets",
		manifest: false,
		emptyOutDir: true,
		target: "es2015",
		cssCodeSplit: false,

		// --- MINIFICATION IMPROVEMENTS ---
		cssMinify: true, // Ensures CSS is minified via Lightning CSS or esbuild
		// ---------------------------------

		rollupOptions: {
			//external: ["NonExistingPath", /^\/static.*/, /^https:\/\/www\.onlineboardgamers\.com\/static.*/],
			external: [
				"NonExistingPath",
				/^\/static.*/,
				/^https:\/\/www\.onlineboardgamers\.com\/static.*/,
				// ADD THIS LINE:
				/.*\/static\/CNS\/images\/.*/,
			],
			input: {
				main: resolve("./src/main.js"),
			},
			output: {
				entryFileNames: `[name].js`,
				chunkFileNames: `[name].js`,
				assetFileNames: (assetInfo) => {
					const info = assetInfo.name.split(".")
					const extType = info[info.length - 1]

					//console.log(assetInfo)
					//console.log(`INFO: ${assetInfo.name} - ${assetInfo.originalFileNames[0]}`)
					//console.log(new URL(`@static/CNS/images/help/clickPlayers.jpg`, import.meta.url).href)
					//console.log('ABOVE')
					if (/\.(jpg|png|jpe?g|gif|svg|webp|webm|mp3)$/.test(assetInfo.name)) {
						//console.log(new URL(`@static/CNS/images/help/clickPlayers.jpg`, import.meta.url).href)
						if (assetInfo.originalFileNames[0].startsWith("../../static/CNS/images/hexes/")) {
							console.log("1111111")
							return `images/hexes/[name].${extType}`
						} else if (assetInfo.originalFileNames[0].startsWith("../../static/CNS/images/")) {
							console.log("333333")
							return `images/[name].${extType}`
						}

						return `images/[name].${extType}`
					}

					if (/\.(css)$/.test(assetInfo.name)) {
						return `main.${extType}` // Add hash for cache busting
					}
					if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name)) {
						return `fonts/[name].[hash].${extType}`
					}
					return `[name].[hash].${extType}`
				},
			},
		},
	},
}))
