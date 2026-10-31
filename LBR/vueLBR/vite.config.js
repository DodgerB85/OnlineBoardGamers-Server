import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
	plugins: [vue()],
	root: resolve("./src"),
	server: {
		host: "0.0.0.0",
		port: 3069,
		open: false,
		watch: {
			usePolling: true,
			disableGlobbing: false,
			interval: 1000,
		},
		fs: {
			allow: ["..", "../..", "/static", resolve("../static"), resolve("../../static"), resolve("../../")],
		},
	},
	base: command === "serve" ? "/static/" : "https://www.onlineboardgamers.com/static/LBR",
	build: {
		outDir: resolve("../static/LBR/LBRvuedist"),
		assetsDir: "./assets",
		manifest: false,
		emptyOutDir: true,
		target: "es2015",
		rollupOptions: {
			input: {
				main: resolve("./src/main.js"),
			},
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name]-[hash].js",
				assetFileNames: (assetInfo) => {
					const info = assetInfo.name.split(".");
					const extType = info[info.length - 1];
					if (/\.(jpg|png|jpe?g|gif|svg|webp|webm|mp3)$/.test(assetInfo.name)) {
						return `images/[name].${extType}`;
					}
					if (extType === "css") return `[name].${extType}`;
					return `[name]-[hash].${extType}`;
				},
			},
		},
	},
}));
