import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {splitVendorChunkPlugin} from 'vite';
import fs from 'fs';

const hash: string = JSON.parse(
  fs.readFileSync('public/definitions/hash.json', 'utf8'),
);

// https://vitejs.dev/config/
export default defineConfig({
  base: '/configurador/',
  plugins: [
    react(),
    {
      name: 'zelvoq-definition-hash',
      transformIndexHtml: (html) =>
        html.replace('__ZELVOQ_DEFINITIONS_HASH__', hash),
    },
    splitVendorChunkPlugin(),
  ],
  assetsInclude: ['**/*.glb'],
  envDir: '.',
  server: {open: true},
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      assets: path.resolve(__dirname, './src/assets'),
    },
  },
  optimizeDeps: {
    include: ['@the-via/reader'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      // Enable esbuild polyfill plugins
      plugins: [],
    },
  },
});
