import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // GoogleSignInButton reads this at module load and renders nothing without
    // it; Login.test.jsx exercises the Google callback, so tests need a value
    // (a placeholder — the Google script is stubbed on window.google).
    env: { VITE_GOOGLE_CLIENT_ID: 'test-google-client-id' },
  },
});
