import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Code splitting agressif
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/socket.io-client')) {
            return 'vendor-socket';
          }
          if (id.includes('node_modules/simple-peer')) {
            return 'vendor-peer';
          }
        },
      },
    },
    // Compression maximale
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,    // retire les console.log en prod
        drop_debugger: true,
        pure_funcs: ['console.log'],
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 300,
    // Assets inline si < 4kb (évite des requêtes HTTP)
    assetsInlineLimit: 4096,
    // Source maps désactivés en prod (gain de taille)
    sourcemap: false,
  },
  // Préchargement des modules critiques
  optimizeDeps: {
    include: ['react', 'react-dom', 'socket.io-client'],
  },
});
