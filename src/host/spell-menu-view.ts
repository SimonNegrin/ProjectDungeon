/**
 * Vista DOM de la lista de hechizos. Reutiliza los nodos de `index.html` y crea
 * una fila estable por hechizo; el modelo puro decide nombres, costes,
 * disponibilidad y selección.
 */

import type { SpellId } from '../game/spells';
import type { GameState } from '../game/types';
import {
  buildSpellMenuModel,
  SPELL_ORDER,
  type SpellMenuSelection,
} from './spell-menu';

export interface SpellMenuView {
  update(state: GameState, selection: SpellMenuSelection): void;
}

function requireElement<T extends HTMLElement>(
  root: ParentNode,
  testId: string,
): T {
  const element = root.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Falta el elemento con data-testid="${testId}"`);
  }
  return element;
}

interface RowView {
  readonly row: HTMLElement;
  readonly name: HTMLElement;
  readonly meta: HTMLElement;
  readonly availability: HTMLElement;
}

function createRow(parent: HTMLElement, id: SpellId, index: number): RowView {
  const row = document.createElement('li');
  row.className = 'spell-row';
  row.dataset.testid = `spell-row-${id}`;
  row.dataset.spellId = id;
  row.setAttribute('aria-selected', 'false');

  const key = document.createElement('span');
  key.className = 'spell-row-key';
  key.textContent = String(index + 1);

  const name = document.createElement('span');
  name.className = 'spell-row-name';
  name.dataset.testid = `spell-name-${id}`;

  const meta = document.createElement('span');
  meta.className = 'spell-row-meta';
  meta.dataset.testid = `spell-meta-${id}`;

  const availability = document.createElement('strong');
  availability.className = 'spell-row-availability';
  availability.dataset.testid = `spell-availability-${id}`;

  row.append(key, name, meta, availability);
  parent.append(row);
  return { row, name, meta, availability };
}

export function createSpellMenuView(root: ParentNode): SpellMenuView {
  const list = requireElement(root, 'spell-list');
  const items = requireElement(root, 'spell-list-items');
  const hint = requireElement(root, 'spell-list-hint');

  const rows = new Map<SpellId, RowView>();
  for (const [index, id] of SPELL_ORDER.entries()) {
    rows.set(id, createRow(items, id, index));
  }

  return {
    update(state: GameState, selection: SpellMenuSelection): void {
      const model = buildSpellMenuModel(state, selection);
      list.hidden = !model.open;
      hint.textContent = model.hint;

      for (const item of model.items) {
        const row = rows.get(item.id);
        if (!row) continue;
        row.name.textContent = item.name;
        row.meta.textContent = `Nv ${item.minLevel} · ${item.cost} maná`;
        row.availability.textContent = item.availabilityLabel;
        row.row.dataset.availability = item.availability;
        row.row.classList.toggle('is-selected', item.selected);
        row.row.setAttribute('aria-selected', String(item.selected));
      }
    },
  };
}
