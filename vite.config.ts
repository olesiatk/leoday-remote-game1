import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// Only prefix asset paths when building for the standalone GitHub Pages
// deploy; the federation build consumed by host-shell must stay at '/'.
const base = process.env.GH_PAGES === 'true' ? '/leoday-remote-game1/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    federation({
      name: 'remoteGame1',
      filename: 'remoteEntry.js',
      exposes: { './Game': './src/games/Tetris.tsx' },
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
