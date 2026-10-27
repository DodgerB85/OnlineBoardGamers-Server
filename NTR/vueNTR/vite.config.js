import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  root: resolve('./src'),
  server: {
    host: '0.0.0.0',
    port: 3066,
    open: false,
    watch: {
      usePolling: true,
      disableGlobbing: false,
      interval: 1000,   // Check every 1000ms (1 second)
    },
    fs: {
      allow: [
        // Search up for workspace root
        "..",
        "../..",
        // Static directory for Docker mount
        "/static",
        // Allow access to parent static directory
        resolve("../static"),
        resolve("../../static"),
        // Or be explicit by pointing to the project root
        resolve("../../"),
      ],
    },
  },
  // NTR serves its images straight from Django (/static/NTR/images/...), so it
  // needs no @static alias or /static proxy the other games use.
  base: command === 'serve' ? '/static/' : 'https://www.onlineboardgamers.com/static/NTR',
  build: {
    outDir: resolve('../static/NTR/NTRvuedist'),
    assetsDir: './assets',
    manifest: false,
    emptyOutDir: true,
    target: 'es2015',
    rollupOptions: {
      input: {
        main: resolve('./src/main.js')
      },
      output: {
        entryFileNames: `[name].js`,
        // Content-hash the lazy chunks (FCM pattern): a fixed chunk name can be
        // served stale by Cloudflare/browsers for the full max-age.
        chunkFileNames: `[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]

          if (/\.(jpg|png|jpe?g|gif|svg|webp|webm|mp3)$/.test(assetInfo.name)) {
            return `images/[name].${extType}`
          }
          if (/\.(css)$/.test(assetInfo.name)) {
            return `[name].${extType}`
          }
          return `[name]-[hash].${extType}`
        }
      }
    }
  }
}))
