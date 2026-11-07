import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const gameDirectory = join(process.cwd(), 'src', 'game');
const sources = readdirSync(gameDirectory).filter(
  (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'),
);

function readSource(name: string): string {
  return readFileSync(join(gameDirectory, name), 'utf8');
}

describe('game engine boundaries', () => {
  it('no usa DOM, red, teclado, tiempo real ni aleatoriedad', () => {
    for (const name of sources) {
      const source = readSource(name);

      expect(source, `${name} usa Math.random`).not.toMatch(/Math\.random/);
      expect(source, `${name} usa Date.now`).not.toMatch(/Date\.now/);
      expect(source, `${name} usa document`).not.toMatch(/\bdocument\b/);
      expect(source, `${name} usa window`).not.toMatch(/\bwindow\b/);
      expect(source, `${name} importa node:`).not.toMatch(/from\s+['"]node:/);
      expect(source, `${name} importa host/ui/server/controller`).not.toMatch(
        /from\s+['"][^'"]*(host|ui|server|controller)[^'"]*['"]/,
      );
    }
  });

  it('solo importa módulos relativos dentro de src/game', () => {
    for (const name of sources) {
      const source = readSource(name);
      const specifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
        (match) => match[1],
      );

      for (const specifier of specifiers) {
        expect(specifier.startsWith('./'), `${name} importa ${specifier}`).toBe(true);
      }
    }
  });
});
