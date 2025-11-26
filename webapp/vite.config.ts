import {defineConfig} from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';
import path from "path";
import { viteStaticCopy } from 'vite-plugin-static-copy'

console.log("vite: process.env.HC_APP_PORT: ", process.env.HC_APP_PORT);
console.log("vite: process.env.HAPP_BUILD_MODE: ", process.env.HAPP_BUILD_MODE);
const HAPP_BUILD_MODE = process.env.HAPP_BUILD_MODE? process.env.HAPP_BUILD_MODE : "Release";


console.log("vite: process.env.APPLET_VIEW: ", process.env.APPLET_VIEW);
const APPLET_VIEW = process.env.APPLET_VIEW? process.env.APPLET_VIEW : "main";

const DIST_FOLDER = "dist"

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@vines/elements': path.resolve(__dirname, '../webcomponents/src')
    }
  },
  plugins: [
    checker({
      typescript: true,
      // eslint: {
      //   lintCommand: 'eslint --ext .ts,.html . --ignore-path .gitignore',
      // },
    }),
      viteStaticCopy({
          targets: [
              {src: "first_time.html", dest: "./"},
          ]
      }),
    dts(),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    'process.env.HAPP_BUILD_MODE': JSON.stringify(HAPP_BUILD_MODE),
    'process.env.HAPP_ENV': JSON.stringify("Browser"),
    'process.env.APPLET_VIEW': JSON.stringify(APPLET_VIEW),
    "process.env.HC_APP_PORT": JSON.stringify(process.env.HC_APP_PORT),
    "process.env.HC_ADMIN_PORT": JSON.stringify(process.env.HC_ADMIN_PORT) || undefined,
    'process.env.NO_WE': JSON.stringify(process.env.NO_WE || false),
  },
  build: {
    emptyOutDir: true,
    //minify: false,
    outDir: DIST_FOLDER,
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        chunkFileNames: `assets/index-chunk.js`,
        assetFileNames: "assets[extname]",
      },
    }
  },
  server: {
    open: false, // This will open the browser automatically
    watch: {
      // include: [
      //   'node_modules/package-one/**',
      //   'node_modules/package-two/**'
      // ],
      usePolling: true,
      interval: 1000 // Check for changes every second
    }
  }
});
