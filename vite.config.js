import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    open: '/index.html',
    port: 3000,
    host: true,
  },
  base: './',
});
