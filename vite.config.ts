import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildInfoPlugin } from './vite-plugins/build-info';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildInfoPlugin()],
  server: {
    proxy: {
      '/api/eodhd': {
        target: 'https://eodhd.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/eodhd/, '/api'),
      },
    },
  },
});
