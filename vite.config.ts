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
        experiments: resolve(experimentsDir, 'index.html'),
        ...experimentInputs,
      },
    },
  },
});
