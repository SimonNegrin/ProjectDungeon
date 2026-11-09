import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Build de producción: solo el juego. Los experimentos se construyen con
 * `vite.config.experiments.ts` y nunca comparten salida con `dist/`.
 */
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
      },
    },
  },
});
