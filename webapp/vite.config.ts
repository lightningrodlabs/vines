import {defineConfig} from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';
import path from "path";
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { internalIpV4Sync } from "internal-ip";

console.log("vite: process.env.HC_APP_PORT: ", process.env.HC_APP_PORT);
console.log("vite: process.env.HAPP_BUILD_MODE: ", process.env.HAPP_BUILD_MODE);
const HAPP_BUILD_MODE = process.env.HAPP_BUILD_MODE? process.env.HAPP_BUILD_MODE : "Retail";


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
    checker({typescript: true}),
    viteStaticCopy({
          targets: [
              { src: "./icon.png", dest: "./" },
              { src: "./add-to-pocket.svg", dest: "./" },
              { src: '../node_modules/@shoelace-style/shoelace/dist/assets', dest: "shoelace-assets" }
          ]
    }),
    dts(),
  ],
  define: {
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
    // rollupOptions: {
    //   output: {
    //     entryFileNames: "index.js",
    //     chunkFileNames: `assets/index-chunk.js`,
    //     assetFileNames: "assets[extname]",
    //   },
    // }
  },
  server: {
      host: "0.0.0.0",
      port: 1420,
      strictPort: true,
      hmr: {
          protocol: "ws",
          host: internalIpV4Sync(),
          port: 1421,
      },
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
