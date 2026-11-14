import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_SILHOUETTES,
  EQUIPMENT_SLOTS,
  ITEM_SHEET,
  type EquipmentSlot,
  type ItemSpriteRect,
} from '../../../src/game/equipment';
import { showsEquipmentSilhouette } from '../../../src/host/inventory-panel-view';

const css = readFileSync(new URL('../../../src/host/ui.css', import.meta.url), 'utf8');
const panelView = readFileSync(
  new URL('../../../src/host/inventory-panel-view.ts', import.meta.url),
  'utf8',
);
const itemsTxtPath = fileURLToPath(
  new URL('../../../public/assets/32rogues/items.txt', import.meta.url),
);

const EXPECTED_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  weapon: '1.d. long sword',
  shield: '12.a. buckler',
  armor: '13.e. scale mail',
  head: '16.e. helm',
  feet: '15.b. leather boots',
  hands: '14.b. leather gloves',
  neck: '17.b. metal pendant',
  ring: '18.b. gold band ring',
};

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

/** Celdas reales de `items.txt`, con la misma geometría que el catálogo. */
function cellsFromItemsTxt(): ReadonlyMap<string, ItemSpriteRect> {
  const cells = new Map<string, ItemSpriteRect>();
  for (const rawLine of readFileSync(itemsTxtPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = /^(\d+)\.([a-z])\.\s+(.+)$/.exec(line);
    if (match === null) continue;
    cells.set(line, {
      x: (match[2].charCodeAt(0) - 'a'.charCodeAt(0)) * ITEM_SHEET.cell,
      y: (Number(match[1]) - 1) * ITEM_SHEET.cell,
      width: ITEM_SHEET.cell,
      height: ITEM_SHEET.cell,
    });
  }
  return cells;
}

describe('siluetas de los ocho huecos de equipamiento (R-029/S-005)', () => {
  it('declara una única tabla con la etiqueta aprobada para cada hueco', () => {
    expect(Object.keys(EQUIPMENT_SILHOUETTES)).toEqual([...EQUIPMENT_SLOTS]);
    for (const slot of EQUIPMENT_SLOTS) {
      expect(EQUIPMENT_SILHOUETTES[slot].label, slot).toBe(
        EXPECTED_LABELS[slot],
      );
    }
  });

  it('usa el recorte exacto de items.txt, dentro de la hoja y sin duplicados', () => {
    const cells = cellsFromItemsTxt();
    const seen = new Set<string>();
    for (const slot of EQUIPMENT_SLOTS) {
      const { label, rect } = EQUIPMENT_SILHOUETTES[slot];
      expect(cells.get(label), `${slot}: ${label}`).toEqual(rect);
      expect(rect.width, slot).toBe(ITEM_SHEET.cell);
      expect(rect.height, slot).toBe(ITEM_SHEET.cell);
      expect(rect.x, slot).toBeGreaterThanOrEqual(0);
      expect(rect.y, slot).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width, slot).toBeLessThanOrEqual(ITEM_SHEET.width);
      expect(rect.y + rect.height, slot).toBeLessThanOrEqual(ITEM_SHEET.height);
      seen.add(`${rect.x},${rect.y}`);
    }
    expect(seen.size).toBe(EQUIPMENT_SLOTS.length);
  });

  it('solo se muestra en un hueco de Equipo vacío', () => {
    expect(showsEquipmentSilhouette('equipment', true)).toBe(true);
    expect(showsEquipmentSilhouette('equipment', false)).toBe(false);
    expect(showsEquipmentSilhouette('backpack', true)).toBe(false);
    expect(showsEquipmentSilhouette('backpack', false)).toBe(false);
    expect(showsEquipmentSilhouette('right', true)).toBe(false);
    expect(showsEquipmentSilhouette('right', false)).toBe(false);
  });

  it('es una capa propia con máscara de items.png y color de token', () => {
    const silhouette = block('.inventory-slot-silhouette');
    expect(silhouette).toMatch(/position:\s*absolute/);
    expect(silhouette).toMatch(/inset:\s*0/);
    expect(silhouette).toMatch(/background:\s*var\(--ui-line-color\)/);
    expect(silhouette).toMatch(
      /(?:-webkit-)?mask-image:\s*url\('\/assets\/32rogues\/items\.png'\)/,
    );
    expect(silhouette).toMatch(
      /(?:-webkit-)?mask-size:\s*calc\(var\(--ui-unit\)\s*\*\s*352\)\s+calc\(var\(--ui-unit\)\s*\*\s*832\)/,
    );
    expect(silhouette).toMatch(/pointer-events:\s*none/);
    // La capa no reutiliza ni altera el bisel de `.ui-inset` (TASK-0112).
    expect(silhouette).not.toMatch(/--ui-bevel|::before|::after|\bborder\b/);
  });

  it('la vista lee la tabla única y no duplica etiquetas ni recortes', () => {
    expect(panelView).toContain('EQUIPMENT_SILHOUETTES');
    expect(panelView).toContain('inventory-slot-silhouette');
    expect(panelView).toContain('maskPosition');
    expect(panelView).toContain('webkitMaskPosition');
    for (const label of Object.values(EXPECTED_LABELS)) {
      expect(panelView, `la vista duplica ${label}`).not.toContain(label);
      expect(css, `el CSS duplica ${label}`).not.toContain(label);
    }
  });
});
