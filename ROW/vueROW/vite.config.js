import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { resolve } from "path"
import { fileURLToPath, URL } from "node:url"

// Great Western Trail (ROW) Vue 3 client.
export default defineConfig(({ command }) => ({
	plugins: [vue()],
	root: resolve("./src"),
	server: {
		host: "0.0.0.0",
		port: 3045,
		open: false,
		fs: {
			allow: [resolve(".."), resolve("../.."), resolve("../../")],
		},
		// Serve the real game art from Django while developing the client on :3045.
		proxy: {
			"/static/ROW": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
	},
	resolve: {
		alias: [
			{ find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
			{ find: "@static", replacement: command === "serve" ? fileURLToPath(new URL("./src", import.meta.url)) : fileURLToPath(new URL("../static", import.meta.url)) },
		],
	},
	base: command === "serve" ? "/static/" : "https://www.onlineboardgamers.com/static/ROW",
	build: {
		outDir: resolve("../static/ROW/ROWvuedist"),
		assetsDir: "./assets",
		manifest: false,
		emptyOutDir: true,
		target: "es2020",
		cssCodeSplit: false,
		rollupOptions: {
			external: ["NonExistingPath", /^\/static.*/],
			input: {
				main: resolve("./src/main.js"),
			},
			output: {
				entryFileNames: `[name].js`,
				chunkFileNames: `[name].js`,
				assetFileNames: (assetInfo) => {
					const name = assetInfo.name || ""
					const info = name.split(".")
					const extType = info[info.length - 1]
					if (/\.(jpg|png|jpe?g|gif|svg|webp|webm|mp3)$/.test(name)) {
						return `images/[name].${extType}`
					}
					if (/\.(css)$/.test(name)) {
						return `main.${extType}`
					}
					return `[name]-[hash].${extType}`
				},
			},
		},
	},
}))
