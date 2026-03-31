/*import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
const { resolve } = require('path')

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [vue()],

  // Use this in EMBED dir to access EMBEDDED file
  // Points to main.js
  root: resolve('./src'),

  server: {
    host: 'localhost',
    port: 3006,
    open: false,
    watch: {
      usePolling: true,
      disableGlobbing: false
    }
  },
  resolve: {
    alias:
      command === 'serve'
        ? [{ find: '@static', replacement: fileURLToPath(new URL('./src', import.meta.url)) }]
        : [{ find: '@static', replacement: fileURLToPath(new URL('../static', import.meta.url)) }]
  },

  base: command === 'serve' ? '/static/' : 'https://www.onlineboardgamers.com/static/TGZ',
  build: {
    outDir: resolve('../static/TGZ/TGZvuedist'),
    assetsDir: './assets',
    manifest: true,
    emptyOutDir: true,
    target: 'es2015',
    //minify: true,
    rollupOptions: {
      external: [
        'NonExistingPath',
        // Needed to enable building of /static/ links
        /^\/static.*, //removed a slash here /
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
          if (/\.(png|jpe?g|gif|svg|webp|webm|mp3)$/.test(assetInfo.name)) {
            return `images/[name].${extType}`
          }
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
}))*/


import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { resolve } from 'path';

import { fileURLToPath, URL } from 'node:url'
//import { fileURLToPath, URL } from 'url'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [vue()],
  root: resolve('./src'),
  server: {
    host: '0.0.0.0',
    port: 3006,
    open: false,
    watch: {
      usePolling: true,
      disableGlobbing: false,
      interval: 1000,   // Check every 1000ms (1 second)
    }
  },


    resolve: {
    alias:
      command === 'serve'
        ? [{ find: '@static', replacement: fileURLToPath(new URL('./src', import.meta.url)) }]
        : [{ find: '@static', replacement: fileURLToPath(new URL('../static', import.meta.url)) }]
  },
   base: command === 'serve' ? '/static/' : 'https://www.onlineboardgamers.com/static/TGZ',
  build: {
    outDir: resolve('../static/TGZ/TGZvuedist'),
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
            if (assetInfo.originalFileNames[0].startsWith('../../static/TGZ/images/expansion/')) {
              return `images/expansion/[name].${extType}`;
            }  else if (assetInfo.originalFileNames[0].startsWith('../../static/TGZ/images/')) {
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
