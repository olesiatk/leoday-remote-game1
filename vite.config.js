import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'remoteGame1',
      filename: 'remoteEntry.js',
      exposes: { './Game': './src/games/Tetris.jsx' },
      shared: ['react', 'react-dom']
    })
  ],
  server: { host: true, port: 3005, strictPort: true },
    preview: {
    host: true,
    port: 3005,
    strictPort: true,
    cors: true
  },
  build: { modulePreload: false, target: 'esnext', minify: false, cssCodeSplit: false }
});
