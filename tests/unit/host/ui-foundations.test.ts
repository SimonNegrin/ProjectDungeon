import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../../src/host/ui.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const panelView = readFileSync(
  new URL('../../../src/host/inventory-panel-view.ts', import.meta.url),
  'utf8',
);
const fontDirectory = new URL('../../../public/fonts/pixelify-sans/', import.meta.url);
const readme = readFileSync(new URL('README.txt', fontDirectory), 'utf8');
const ofl = readFileSync(new URL('OFL.txt', fontDirectory), 'utf8');

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

interface CssRule {
  selector: string;
  body: string;
}

/** Reglas de la UI de juego; deja fuera las excepciones documentadas. */
function gameRules(): CssRule[] {
  const isExcluded = (selector: string): boolean =>
    selector === ':root' ||
    selector.startsWith('.debug-overlay') ||
    selector === 'footer' ||
    selector.startsWith('footer ') ||
    selector === '.stage' ||
    selector === '.frame' ||
    selector === 'canvas';
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match) => ({
      selector: match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim(),
      body: match[2],
    }))
    .filter((rule) => !isExcluded(rule.selector))
    .filter((rule) => !rule.selector.startsWith('@'))
    .filter((rule) => !/^(?:from|to|\d+%)$/.test(rule.selector));
}

describe('tokens y escalas de la UI', () => {
  const root = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';

  it('declara en un único :root la escala, los roles y los ocho colores exactos', () => {
    for (const token of [
      '--ui-font',
      '--ui-scale',
      '--ui-unit',
      '--ui-title',
      '--ui-body',
      '--ui-data',
      '--ui-help',
      '--ui-bg',
      '--ui-panel',
      '--ui-raised',
      '--ui-line',
      '--ui-line-color',
      '--ui-bevel',
      '--ui-bevel-grow',
      '--ui-text',
      '--ui-muted',
      '--ui-accent',
      '--ui-danger',
      '--ui-focus',
      '--ui-bevel-light',
      '--ui-bevel-dark',
    ]) {
      expect(root, `Falta ${token} en :root`).toMatch(new RegExp(`${token}\\s*:`));
    }

    expect(root).toMatch(/--ui-scale:\s*1\b/);
    expect(root).toMatch(/--ui-line:\s*1px/);
    expect(root).toMatch(
      /--ui-bevel:\s*calc\(var\(--ui-line\)\s*\*\s*2\)/,
    );
    expect(root).toMatch(
      /--ui-bevel-grow:\s*calc\(var\(--ui-bevel\)\s*-\s*var\(--ui-line\)\)/,
    );
    expect(root).toMatch(
      /--ui-unit:\s*calc\(var\(--ui-scale\)\s*\*\s*1px\)/,
    );
    expect(root).toMatch(
      /--ui-title:\s*calc\(var\(--ui-scale\)\s*\*\s*14px\)/,
    );
    expect(root).toMatch(
      /--ui-body:\s*calc\(var\(--ui-scale\)\s*\*\s*11\.2px\)/,
    );
    expect(root).toMatch(
      /--ui-data:\s*calc\(var\(--ui-scale\)\s*\*\s*10\.9px\)/,
    );
    expect(root).toMatch(
      /--ui-help:\s*calc\(var\(--ui-scale\)\s*\*\s*10\.1px\)/,
    );
  });

  it('usa la paleta aprobada con alfa opaco y sin colores inventados', () => {
    const expected: Array<[string, string]> = [
      ['--ui-bg', '#2f142f'],
      ['--ui-panel', '#2a584f'],
      ['--ui-raised', '#774448'],
      ['--ui-line-color', '#6eb8a8'],
      ['--ui-text', '#fcffc0'],
      ['--ui-accent', '#ee9c5d'],
      ['--ui-danger', '#c6505a'],
      ['--ui-focus', '#74a33f'],
    ];
    for (const [token, color] of expected) {
      expect(root).toMatch(new RegExp(`${token}:\\s*${color}`, 'i'));
    }
    expect(root).toMatch(/--ui-muted:\s*var\(--ui-line-color\)/);
    expect(root).toMatch(/--ui-positive:\s*var\(--ui-focus\)/);
    expect(root).toMatch(/--ui-bevel-light:\s*var\(--ui-line-color\)/);
    expect(root).toMatch(/--ui-bevel-dark:\s*var\(--ui-bg\)/);

    const literals = gameRules().flatMap(
      (rule) => rule.body.match(/#[0-9a-f]{3,8}\b/gi) ?? [],
    );
    expect(literals, `Colores fuera de :root: ${literals.join(', ')}`).toEqual([]);
  });

  it('pinta el bisel de 2× con contornos exteriores sin mover la caja', () => {
    const outset = block('.ui-outset');
    const inset = block('.ui-inset');
    for (const [name, body] of [
      ['outset', outset],
      ['inset', inset],
    ] as const) {
      expect(body, `${name} conserva el borde base`).toMatch(
        /border-width:\s*var\(--ui-line\)/,
      );
      expect(body, `${name} no usa valores mágicos`).not.toMatch(
        /border-width:\s*var\(--ui-bevel\)/,
      );
    }
    const sharedPseudo =
      css.match(
        /\.ui-outset::before,\s*\.ui-inset::before,\s*\.ui-outset::after,\s*\.ui-inset::after\s*\{([\s\S]*?)\}/,
      )?.[1] ?? '';
    expect(sharedPseudo, 'falta el contorno compartido').toMatch(/content:\s*""/);
    expect(sharedPseudo, 'el contorno no es absoluto').toMatch(
      /position:\s*absolute/,
    );
    expect(sharedPseudo, 'el contorno no cubre el interior').toMatch(
      /inset:\s*0/,
    );
    expect(sharedPseudo, 'el contorno no usa el bisel de 2×').toMatch(
      /outline-width:\s*var\(--ui-bevel\)/,
    );
    expect(sharedPseudo, 'el contorno no ignora el puntero').toMatch(
      /pointer-events:\s*none/,
    );
    for (const [selector, color] of [
      ['.ui-outset::before', '--ui-bevel-light'],
      ['.ui-inset::before', '--ui-bevel-dark'],
      ['.ui-outset::after', '--ui-bevel-dark'],
      ['.ui-inset::after', '--ui-bevel-light'],
    ] as const) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(css, `${selector} sin color`).toMatch(
        new RegExp(`${escaped}\\s*\\{[^}]*outline-color:\\s*var\\(${color}\\)`),
      );
    }
    expect(css).toMatch(
      /\.ui-outset::before,\s*\.ui-inset::before\s*\{[^}]*clip-path:\s*polygon\(/,
    );
    expect(css).toMatch(
      /\.ui-outset::after,\s*\.ui-inset::after\s*\{[^}]*clip-path:\s*polygon\(/,
    );
  });

  it('reserva el crecimiento exterior en las cajas que recortan', () => {
    expect(block('.inventory-slot')).toMatch(/width:\s*var\(--ui-slot\)/);
    expect(block('.inventory-slot')).toMatch(/height:\s*var\(--ui-slot\)/);
    expect(block('.inventory-slot')).toMatch(/overflow:\s*visible/);
    expect(block('.inventory-columns')).toMatch(/overflow:\s*hidden/);
    expect(block('.inventory-columns')).toMatch(/padding:\s*var\(--ui-line\)/);
    expect(block('.inventory-columns')).toMatch(
      /margin:\s*calc\(var\(--ui-line\)\s*\*\s*-1\)/,
    );
    expect(block('.inventory-backpack')).toMatch(/padding:\s*var\(--ui-line\)/);
    expect(block('.inventory-backpack')).toMatch(
      /margin:\s*calc\(var\(--ui-line\)\s*\*\s*-1\)/,
    );
    expect(block('.inventory-ground')).toMatch(/padding:\s*var\(--ui-line\)/);
    expect(block('.inventory-ground')).toMatch(
      /margin:\s*calc\(var\(--ui-line\)\s*\*\s*-1\)/,
    );
    expect(block('.inventory-ground-scroll')).toMatch(
      /padding-inline:\s*var\(--ui-line\)/,
    );
    expect(block('.inventory-panel-body')).toMatch(
      /border-width:\s*var\(--ui-bevel\)/,
    );
  });

  it('aplica las escalas por rol a HUD, panel, hechizos y feedback', () => {
    expect(block('body')).toMatch(/font-family:\s*var\(--ui-font\)/);
    expect(block('.hud')).toMatch(/font-size:\s*var\(--ui-body\)/);
    expect(block('.hud-stat strong')).toMatch(/font-size:\s*var\(--ui-data\)/);
    expect(block('.hud-keys')).toMatch(/font-size:\s*var\(--ui-help\)/);
    expect(block('.hud-detail-title')).toMatch(/font-size:\s*var\(--ui-title\)/);
    expect(block('.inventory-panel-title')).toMatch(/font-size:\s*var\(--ui-title\)/);
    expect(block('.inventory-section-title')).toMatch(/font-size:\s*var\(--ui-data\)/);
    expect(block('.inventory-corpse-name')).toMatch(/font-size:\s*var\(--ui-help\)/);
    expect(block('.spell-row')).toMatch(/font-size:\s*var\(--ui-body\)/);
    expect(block('.damage-feedback')).toMatch(
      /font-size:\s*calc\(var\(--ui-unit\)\s*\*/,
    );
  });

  it('no deja tamaños fijos, clamp, literales ni vocabulario moderno en la UI de juego', () => {
    const rules = gameRules();
    expect(rules.length).toBeGreaterThan(30);

    for (const rule of rules) {
      const label = rule.selector;
      expect(rule.body, `${label} usa un color literal`).not.toMatch(
        /rgba?\(|#[0-9a-f]{3,8}\b|color-mix\(/i,
      );
      expect(rule.body, `${label} usa un degradado`).not.toMatch(
        /(?:linear|radial|conic)-gradient\(/i,
      );
      if (rule.selector !== '.perception-radius') {
        expect(rule.body, `${label} usa radio`).not.toMatch(/border-radius/i);
      }
      expect(rule.body, `${label} usa sombra`).not.toMatch(
        /box-shadow|text-shadow/i,
      );
      expect(rule.body, `${label} usa blur o translucidez`).not.toMatch(
        /backdrop-filter|filter:\s*blur\(|opacity:\s*0?\.[0-9]+/i,
      );
      expect(rule.body, `${label} usa clamp()`).not.toMatch(/clamp\(/i);
      expect(rule.body, `${label} usa rem`).not.toMatch(/\brem\b/i);

      for (const match of rule.body.matchAll(/font-size:\s*([^;]+)/gi)) {
        expect(match[1].trim(), `${label} fija font-size`).toMatch(
          /^(?:var\(--ui-(?:title|body|data|help)\)|calc\(var\(--ui-unit\)\s*\*[^)]*\))$/,
        );
      }
      expect(rule.body, `${label} fija un borde en px`).not.toMatch(
        /border(?:-[a-z]+)?\s*:[^;]*\d+px/i,
      );
    }
  });

  it('pinta el marco exterior con un pseudo-elemento que crece sin encoger el canvas', () => {
    const frame = block('.frame');
    expect(frame).not.toMatch(/(?:^|;)\s*border\s*:/);
    expect(frame).not.toMatch(/border-radius|box-shadow/);
    expect(frame, 'el marco no debe recortar el bisel exterior').not.toMatch(
      /overflow:\s*hidden/,
    );
    const after = block('.frame::after');
    expect(after).toMatch(/content:\s*""/);
    expect(after).toMatch(/position:\s*absolute/);
    expect(after).toMatch(
      /inset:\s*calc\(var\(--ui-bevel-grow\)\s*\*\s*-1\)/,
    );
    expect(after).toMatch(/pointer-events:\s*none/);
    expect(after).toMatch(/border-width:\s*var\(--ui-bevel\)/);
    expect(after).toMatch(
      /border-color:\s*var\(--ui-bevel-light\)\s+var\(--ui-bevel-dark\)/,
    );
    expect(after).toMatch(/z-index:\s*1/);
  });

  it('enlaza la hoja desde index.html sin bloque <style> inline', () => {
    expect(html).toContain('<link rel="stylesheet" href="/src/host/ui.css" />');
    expect(html).not.toContain('<style');
    expect(html.indexOf('/src/host/ui.css')).toBeLessThan(
      html.indexOf('<script type="module"'),
    );
  });
});

describe('relieve y elementos de la UI de juego', () => {
  it('aplica outset a HUD, ficha, panel, hechizos, submenú, banner y overlay', () => {
    for (const fragment of [
      'class="hud-left ui-outset"',
      'class="hud-right ui-outset"',
      'class="hud-detail-block ui-outset"',
      'class="spell-list ui-outset"',
      'class="feedback-banner ui-outset"',
      'class="inventory-panel-body ui-outset"',
      'class="inventory-column inventory-column-equipment ui-outset"',
      'class="inventory-column inventory-column-backpack ui-outset"',
      'class="inventory-column inventory-column-right ui-outset"',
      'class="inventory-submenu ui-outset"',
      'class="overlay ui-outset"',
    ]) {
      expect(html, `Falta ${fragment}`).toContain(fragment);
    }
  });

  it('aplica inset a los huecos de item y al retrato', () => {
    expect(html).toContain('class="hud-portrait ui-inset"');
    expect(panelView).toContain('`inventory-slot ui-inset ${className}`');
  });

  it('compone el HUD izquierdo en tres zonas con pie fuera de ellas', () => {
    const zones = html.match(/class="hud-zone ui-outset"/g) ?? [];
    expect(zones).toHaveLength(3);
    for (const [zone, label] of [
      ['character', 'Personaje'],
      ['weapon', 'Arma actual'],
      ['stats', 'Stats y traits'],
    ] as const) {
      const tag =
        html.match(
          new RegExp(`<section[^>]*data-testid="hud-zone-${zone}"[^>]*>`),
        )?.[0] ?? '';
      expect(tag, `Falta la zona ${zone}`).toContain('hud-zone ui-outset');
      expect(tag).toContain(`data-zone="${zone}"`);
      expect(tag).toContain(`aria-label="${label}"`);
    }

    const left =
      html.match(/<aside class="hud-left ui-outset"[\s\S]*?<\/aside>/)?.[0] ?? '';
    expect(left).toContain('class="hud-portrait ui-inset"');
    for (const retired of ['hud-phase', 'hud-enemy-hp', 'hud-turn', 'hud-status']) {
      expect(left, `El HUD izquierdo no debe declarar ${retired}`).not.toContain(
        `data-testid="${retired}"`,
      );
    }

    const lastZone = html.indexOf('data-testid="hud-zone-stats"');
    const footer = html.indexOf('class="hud-footer"');
    const keys = html.indexOf('data-testid="hud-keys"');
    const suggestion = html.indexOf('data-testid="hud-suggestion"');
    expect(footer).toBeGreaterThan(lastZone);
    expect(keys).toBeGreaterThan(footer);
    expect(suggestion).toBeGreaterThan(keys);
    expect(left).toContain('class="hud-footer"');
    expect(block('.hud-zone')).toMatch(/background:\s*var\(--ui-raised\)/);
    expect(block('.hud-zone')).toMatch(/padding:\s*calc\(var\(--ui-unit\)\s*\*/);
    expect(block('.hud-zone[data-zone="character"]')).toMatch(
      /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/,
    );
    expect(block('.hud-footer')).toMatch(/margin-top:\s*auto/);
  });

  it('no deja radios ni sombras en las reglas del HUD', () => {
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
      expect(rule.body, `${rule.selector} usa radio o sombra`).not.toMatch(
        /border-radius|box-shadow|text-shadow/i,
      );
    }
  });
});

describe('panel de inventario en tres columnas', () => {
  it('el HTML declara tres columnas tituladas, figura, bolsa y suelo sin estado vacío', () => {
    expect(html).toContain('class="inventory-columns"');
    expect(html).toContain('data-zone="equipment"');
    expect(html).toContain('data-zone="backpack"');
    expect(html).toContain('data-zone="right"');
    expect(html).toContain('data-testid="inventory-figure"');
    expect(html).toContain('data-testid="inventory-cadavers"');
    expect(html).toContain('data-testid="inventory-ground-scroll"');
    expect(html).toContain('data-testid="inventory-submenu"');
    expect(html).toContain('id="inventory-title"');
    expect(html).toMatch(/>Equipo<\/h3>/);
    expect(html).toMatch(/>\s*Bolsa <span data-testid="inventory-backpack-count"><\/span>/);
    expect(html).toMatch(/>Suelo<\/h3>/);
    expect(html).not.toContain('data-testid="inventory-player"');
    expect(html).not.toContain('data-testid="inventory-mp"');
    expect(html).not.toContain('inventory-panel-help');
    expect(html).not.toContain('inventory-panel-header');
    expect(html).not.toContain('No hay objetos');
    expect(html).not.toContain('No hay cadáveres');
    expect(html).not.toContain('data-testid="inventory-actions"');
    expect(html).not.toContain('inventory-actions-buttons');
    expect(html).not.toContain('inventory-stats');
    expect(html).not.toContain('inventory-row-comparison');
    expect(html).not.toContain('inventory-row-traits');
  });

  it('el submenú usa tokens, sin literales, radios ni sombras', () => {
    expect(block('.inventory-submenu')).toMatch(/position:\s*absolute/);
    expect(block('.inventory-submenu')).toMatch(/background:\s*var\(--ui-panel\)/);
    expect(block('.inventory-submenu-option[data-active="true"]')).toMatch(
      /border-color:\s*var\(--ui-focus\)/,
    );
    expect(css).toMatch(/\.inventory-submenu-reason\s*\{/);
    for (const selector of [
      '.inventory-submenu',
      '.inventory-submenu-option',
      '.inventory-submenu-cost',
      '.inventory-submenu-reason',
    ]) {
      expect(block(selector), `${selector} usa radio o sombra`).not.toMatch(
        /border-radius|box-shadow|text-shadow/i,
      );
    }
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
    expect(block('.inventory-column')).toMatch(/overflow:\s*visible/);
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
