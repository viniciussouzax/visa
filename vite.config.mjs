import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Serve diretamente do public/ como raiz
  root: 'public',

  // Build output (caso faça build futuro)
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        dashboard: resolve(__dirname, 'public/dashboard.html'),
        portal: resolve(__dirname, 'public/portal.html'),
        form: resolve(__dirname, 'public/ds160-form.html'),
        landing: resolve(__dirname, 'public/landing.html'),
        docs: resolve(__dirname, 'public/docs.html'),
      },
    },
  },

  server: {
    port: 3000,
    open: false,
    // Sem cache para dev
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});
