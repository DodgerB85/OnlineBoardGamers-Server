/*import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})*/
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { resolve } from 'path';

import { fileURLToPath, URL } from 'node:url'
import dotenv from 'dotenv'

// Load environment variables from root .env
dotenv.config({ path: resolve('../../.env') })

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  root: resolve('./src'),
  server: {
    host: '0.0.0.0',
    port: 3036,
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


    resolve: {
    alias:
      command === 'serve'
        ? [{ find: '@static', replacement: fileURLToPath(new URL('./src', import.meta.url)) }]
        : [{ find: '@static', replacement: fileURLToPath(new URL('../static', import.meta.url)) }]
  },
   base: command === 'serve' ? '/static/' : 'https://www.onlineboardgamers.com/static/WEB',
  build: {
    outDir: resolve('../static/WEB/WEBvuedist'),
    assetsDir: './assets',
    manifest: false,
    emptyOutDir: true,
    target: 'es2015',
    //minify: true,
    rollupOptions: {
      external: [
        'NonExistingPath',
        // Needed to enable building of /static/ links
        /^\/static.*/,
      ],
      input: {
        main: resolve('./src/main.js')
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        //assetFileNames: `[name].[ext]`
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]

          console.log(assetInfo); // Log asset name to the console

          if (/\.(jpg|png|jpe?g|gif|svg|webp|webm|mp3)$/.test(assetInfo.name)) {
            if (assetInfo.originalFileNames[0].startsWith('../../static/WEB/images/tiles/')) {
              return `images/tiles/[name].${extType}`;
            } else if (assetInfo.originalFileNames[0].startsWith('../../static/WEB/images/contracts/')) {
              return `images/contracts/[name].${extType}`;
            }else if (assetInfo.originalFileNames[0].startsWith('../../static/WEB/images/extensions/')) {
              return `images/extensions/[name].${extType}`;
            } else if (assetInfo.originalFileNames[0].startsWith('../../static/WEB/images/')) {
              return `images/[name].${extType}`;
            }
            else return `images/[name].${extType}`
          }

          /*if (/\.(jpg|png|jpe?g|gif|svg|webp|webm|mp3)$/.test(assetInfo.name)) {
            return `images/[name].${extType}`
          }*/
          if (/\.(css)$/.test(assetInfo.name)) {
            return `[name].${extType}`
          }
          if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${extType}`
          }
          return `[name]-[hash].${extType}`
        }
      }
    }
  }


}))
