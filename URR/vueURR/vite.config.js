import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

import { resolve } from "path"

import { fileURLToPath, URL } from "node:url"

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
	plugins: [vue()],
	root: resolve("./src"),
	server: {
		host: "0.0.0.0",
		port: 3054,
		open: false,
		proxy: {
			// Static images are served by Django (:8000); the Vue app's absolute
			// /static/URR image references resolve to the Vite dev origin (:3054) otherwise.
			"/static/URR": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
		watch: {
			usePolling: true,
			disableGlobbing: false,
			interval: 1000, // Check every 1000ms (1 second)
		},
		fs: {
			allow: [resolve(".."), resolve("../.."), resolve("../../"), "/static"],
		},
	},
	resolve: {
		alias: command === "serve" ? [{ find: "@static", replacement: fileURLToPath(new URL("./src", import.meta.url)) }] : [{ find: "@static", replacement: fileURLToPath(new URL("../static", import.meta.url)) }],
	},
	base: command === "serve" ? "/static/" : "https://www.onlineboardgamers.com/static/URR",
	build: {
		outDir: resolve("../static/URR/URRvuedist"),
		assetsDir: "./assets",
		manifest: false,
		emptyOutDir: true,
		target: "es2015",
		rollupOptions: {
			external: ["NonExistingPath", /^\/static.*/],
			input: {
				main: resolve("./src/main.js"),
			},
			output: {
				entryFileNames: `[name].js`,
				chunkFileNames: `[name].js`,
				assetFileNames: (assetInfo) => {
					const info = assetInfo.name.split(".")
					const extType = info[info.length - 1]
					if (/\.(jpg|png|jpe?g|gif|svg|webp|webm|mp3)$/.test(assetInfo.name)) {
						return `images/[name].${extType}`
					}
					if (/\.(css)$/.test(assetInfo.name)) {
						return `[name].${extType}`
					}
					return `[name]-[hash].${extType}`
				},
			},
		},
	},
}))
