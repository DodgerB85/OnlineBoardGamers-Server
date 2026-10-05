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
		port: 3044,
		open: false,
		fs: {
			allow: [resolve(".."), resolve("../.."), resolve("../../")],
		},
	},
	resolve: {
		dedupe: ["vue"],
		alias: command === "serve" ? [{ find: "@static", replacement: fileURLToPath(new URL("./src", import.meta.url)) }] : [{ find: "@static", replacement: fileURLToPath(new URL("../static", import.meta.url)) }],
	},
	base: command === "serve" ? "/static/" : "https://www.onlineboardgamers.com/static/DDL",
	build: {
		outDir: resolve("../static/DDL/DDLvuedist"),
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
