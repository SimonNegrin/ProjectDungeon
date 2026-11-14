import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../../src/host/ui.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const fontDirectory = new URL('../../../public/fonts/pixelify-sans/', import.meta.url);
const readme = readFileSync(new URL('README.txt', fontDirectory), 'utf8');
const ofl = readFileSync(new URL('OFL.txt', fontDirectory), 'utf8');

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

describe('tokens y escalas de la UI', () => {
  const root = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';

  it('declara en un único :root la familia, las escalas y los ocho colores', () => {
    for (const token of [
      '--ui-font',
      '--ui-title',
      '--ui-body',
      '--ui-data',
      '--ui-help',
      '--ui-bg',
      '--ui-panel',
      '--ui-line',
      '--ui-line-color',
      '--ui-text',
      '--ui-muted',
      '--ui-accent',
      '--ui-danger',
      '--ui-focus',
    ]) {
      expect(root, `Falta ${token} en :root`).toMatch(new RegExp(`${token}\\s*:`));
    }

    expect(root).toMatch(/--ui-line:\s*1px/);
    expect(root).toMatch(/--ui-bg:\s*#06080c/i);
    expect(root).toMatch(/--ui-panel:\s*#0d141d/i);
    expect(root).toMatch(/--ui-line-color:\s*#22303f/i);
    expect(root).toMatch(/--ui-text:\s*#edf2f7/i);
    expect(root).toMatch(/--ui-muted:\s*#9aa7b8/i);
    expect(root).toMatch(/--ui-accent:\s*#e8b86d/i);
    expect(root).toMatch(/--ui-danger:\s*#f87171/i);
    expect(root).toMatch(/--ui-focus:\s*#ffd166/i);
  });

  it('aplica las escalas por rol a HUD, panel y ayuda', () => {
    expect(block('body')).toMatch(/font-family:\s*var\(--ui-font\)/);
    expect(block('.hud')).toMatch(/font-size:\s*var\(--ui-body\)/);
    expect(block('.hud-stat strong')).toMatch(/font-size:\s*var\(--ui-data\)/);
    expect(block('.hud-keys')).toMatch(/font-size:\s*var\(--ui-help\)/);
    expect(block('.inventory-panel-title')).toMatch(/font-size:\s*var\(--ui-title\)/);
    expect(block('.inventory-panel-mp')).toMatch(/font-size:\s*var\(--ui-data\)/);
    expect(block('.inventory-panel-help')).toMatch(/font-size:\s*var\(--ui-help\)/);
  });

  it('enlaza la hoja desde index.html sin bloque <style> inline', () => {
    expect(html).toContain('<link rel="stylesheet" href="/src/host/ui.css" />');
    expect(html).not.toContain('<style');
    expect(html.indexOf('/src/host/ui.css')).toBeLessThan(
      html.indexOf('<script type="module"'),
    );
  });
});

describe('tokens del HUD interior', () => {
  it('no deja literales de color ni grosores de píxel en las reglas del HUD', () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((match) => /\.hud/.test(match[1]))
      .map((match) => ({ selector: match[1].trim(), body: match[2] }));

    expect(rules.length).toBeGreaterThan(10);
    for (const rule of rules) {
      expect(rule.body, `${rule.selector} usa un color literal`).not.toMatch(
        /rgba?\(|#[0-9a-f]{3,8}\b/i,
      );
      expect(rule.body, `${rule.selector} usa un grosor literal`).not.toMatch(
        /border(?:-[a-z]+)?\s*:[^;]*\d+px/i,
      );
    }
  });
});

describe('panel de inventario en tres columnas', () => {
  it('el HTML declara tres columnas, figura, mochila y derecha sin stats', () => {
    expect(html).toContain('class="inventory-columns"');
    expect(html).toContain('data-zone="equipment"');
    expect(html).toContain('data-zone="backpack"');
    expect(html).toContain('data-zone="right"');
    expect(html).toContain('data-testid="inventory-figure"');
    expect(html).toContain('data-testid="inventory-cadavers"');
    expect(html).toContain('data-testid="inventory-ground-scroll"');
    expect(html).toContain('data-testid="inventory-actions"');
    expect(html).not.toContain('inventory-stats');
    expect(html).not.toContain('inventory-row-comparison');
    expect(html).not.toContain('inventory-row-traits');
  });

  it('las reglas del panel usan tokens, foco visible y scroll solo en el suelo', () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((match) => /\.inventory/.test(match[1]))
      .map((match) => ({ selector: match[1].trim(), body: match[2] }));

    expect(rules.length).toBeGreaterThan(20);
    for (const rule of rules) {
      expect(rule.body, `${rule.selector} usa un color literal`).not.toMatch(
        /rgba?\(|#[0-9a-f]{3,8}\b/i,
      );
      expect(rule.body, `${rule.selector} usa un grosor literal`).not.toMatch(
        /border(?:-[a-z]+)?\s*:[^;]*\d+px/i,
      );
      expect(rule.body, `${rule.selector} usa radio o sombra`).not.toMatch(
        /border-radius|box-shadow|text-shadow/i,
      );
    }

    expect(block('.inventory-panel')).toMatch(/overflow:\s*hidden/);
    expect(block('.inventory-panel-body')).toMatch(/overflow:\s*hidden/);
    expect(block('.inventory-columns')).toMatch(/overflow:\s*hidden/);
    expect(block('.inventory-column')).toMatch(/overflow:\s*hidden/);
    expect(block('.inventory-ground-scroll')).toMatch(/overflow-y:\s*auto/);
    expect(css).toMatch(/--ui-focus/);
    expect(css).toMatch(/outline:\s*var\(--ui-line\)\s+solid\s+var\(--ui-focus\)/);
  });
});

describe('fuente Pixelify Sans incluida en el build', () => {
  it('la sirve desde /fonts con la variable 400–700 y swap', () => {
    const face = css.match(/@font-face\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(face).toMatch(/font-family:\s*["']Pixelify Sans["']/);
    expect(face).toMatch(
      /src:\s*url\(["']\/fonts\/pixelify-sans\/PixelifySans-VariableFont_wght\.ttf["']\)\s*format\(["']truetype["']\)/,
    );
    expect(face).toMatch(/font-weight:\s*400\s+700/);
    expect(face).toMatch(/font-style:\s*normal/);
    expect(face).toMatch(/font-display:\s*swap/);
  });

  it('no referencia URLs externas en la hoja ni en index.html', () => {
    expect(css).not.toMatch(/url\(\s*["']?https?:\/\//i);
    expect(css).not.toMatch(/@import\s+url\(\s*["']?https?:\/\//i);
    expect(html).not.toMatch(/https?:\/\//i);
  });

  it('incluye solo el TTF variable con su licencia y crédito', () => {
    const files = readdirSync(fontDirectory).sort();
    expect(files).toEqual([
      'OFL.txt',
      'PixelifySans-VariableFont_wght.ttf',
      'README.txt',
    ]);
    expect(statSync(new URL('PixelifySans-VariableFont_wght.ttf', fontDirectory)).size)
      .toBeGreaterThan(70_000);

    expect(ofl).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(ofl).toContain('The Pixelify Sans Project Authors');

    expect(readme).toContain('Pixelify Sans');
    expect(readme).toContain('The Pixelify Sans Project Authors');
    expect(readme).toContain('https://github.com/eifetx/Pixelify-Sans');
    expect(readme).toMatch(/SIL (Open Font License|OFL),\s*Version 1\.1/i);
    expect(readme).toMatch(/variable/i);
    expect(readme).toMatch(/400\s*[–-]\s*700/);
    expect(readme).toMatch(/no se incluyen\s+las fuentes estáticas/i);
  });
});
