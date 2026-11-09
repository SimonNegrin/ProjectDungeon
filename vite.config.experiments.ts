import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const experimentsDir = resolve(root, 'experiments');

const experimentInputs = Object.fromEntries(
  readdirSync(experimentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => {
      const entryPoint = resolve(experimentsDir, entry.name, 'index.html');
      return [entry.name, entryPoint] as const;
    })
    .filter(([, entryPoint]) => existsSync(entryPoint)),
);

/**
 * Build separado de experimentos: el mismo conjunto de entradas que antes
 * mezclaba `vite.config.ts`, pero aislado en `dist-experiments/`.
 */
export default defineConfig({
  build: {
    target: 'es2022',
    outDir: resolve(root, 'dist-experiments'),
    rollupOptions: {
      input: {
        experiments: resolve(experimentsDir, 'index.html'),
        ...experimentInputs,
      },
    },
  },
});
