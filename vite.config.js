import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        phaser: resolve(__dirname, 'phaser.html'),
      },
    },
  },
  server: { port: 3000, open: true },
  base: './',
});
