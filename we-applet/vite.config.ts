import {defineConfig} from 'vite';
import path from 'path';
import checker from 'vite-plugin-checker';
//import dts from 'vite-plugin-dts';
import {viteStaticCopy} from 'vite-plugin-static-copy'

console.log("vite: process.env.HC_APP_PORT: ", process.env.HC_APP_PORT);
console.log("vite: process.env.HAPP_BUILD_MODE: ", process.env.HAPP_BUILD_MODE);
const HAPP_BUILD_MODE = process.env.HAPP_BUILD_MODE? process.env.HAPP_BUILD_MODE : "Release";


console.log("vite: process.env.APPLET_VIEW: ", process.env.APPLET_VIEW);
const APPLET_VIEW = process.env.APPLET_VIEW? process.env.APPLET_VIEW : "main";

const DIST_FOLDER = "."

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      // @ddd-qc/cell-proxy uses top-level await. esbuild's dev prebundling is
      // not covered by the rollup-side TLA transform, so the dev server needs a
      // target that supports TLA natively. Without this, `vite dev` -- i.e. the
      // localhost source Moss uses in we_dev/config.ts -- fails with
      // "Top-level await is not available in the configured target environment".
      target: 'esnext',
    },
  },
  resolve: {
    alias: {
      '@vines/app': path.resolve(__dirname, '../webapp/src'),
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
        {src: "weave.config.json", dest: DIST_FOLDER},
        {src: "../webapp/icon.png", dest: DIST_FOLDER},
        {src: "../webapp/add-to-pocket.svg", dest: DIST_FOLDER},

        {
          src: "../node_modules/@shoelace-style/shoelace/dist/themes/light.css",
          dest: DIST_FOLDER,
          rename: "styles.css"
        },
        //{ src: '../node_modules/@shoelace-style/shoelace', dest: DIST_FOLDER }
        /** To the root (DIST_FOLDER), not shoelace-assets. In the applet the Shoelace
         *  base path is './', set by @ddd-qc/we-utils' setupProd() when setup() runs at
         *  startup -- after vines-page's setBasePath('/shoelace-assets'), which it
         *  overrides. So default-set icons are fetched from ./assets/icons/. Copying
         *  them to shoelace-assets (6dc5da64) left every such icon blank: the files
         *  table's Type icons and row menus, and the image viewer's download button.
         *  webapp/vite.config.ts is separate: the standalone webapp does not go
         *  through setup(), so /shoelace-assets is right there. */
        {src: '../node_modules/@shoelace-style/shoelace/dist/assets', dest: DIST_FOLDER}
      ]
    }),
    //dts(),
  ],
  define: {
    'process.env.HAPP_BUILD_MODE': JSON.stringify(HAPP_BUILD_MODE),
    'process.env.HAPP_ENV': HAPP_BUILD_MODE == "Debug"? JSON.stringify("BrowserWe") : JSON.stringify("We"),
    'process.env.APPLET_VIEW': JSON.stringify(APPLET_VIEW),
    "process.env.HC_APP_PORT": JSON.stringify(process.env.HC_APP_PORT),
    "process.env.HC_ADMIN_PORT": JSON.stringify(process.env.HC_ADMIN_PORT) || undefined,
    'process.env.NO_WE': JSON.stringify(process.env.NO_WE || false),
  },
  // build: {
  //   emptyOutDir: true,
  //   outDir: DIST_FOLDER,
  //   rollupOptions: {
  //     output: {
  //       entryFileNames: "index.js",
  //       chunkFileNames: `assets/index-chunk.js`,
  //       assetFileNames: "assets[extname]",
  //     },
  //   }
  // },
  server: {
    open: true, // This will open the browser automatically
    watch: {
      usePolling: true,
      interval: 1000 // Check for changes every second
    }
  }
});
