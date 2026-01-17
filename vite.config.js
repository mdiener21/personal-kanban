import { defineConfig } from 'vite';

const appVersion = process.env.npm_package_version ?? '0.0.0';

export default defineConfig({
  root: 'src',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  build: {
    rollupOptions: {
      input: {
        index: 'src/index.html',
        reports: 'src/reports.html'
      }
    },
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true
  },
  base: './'
});
