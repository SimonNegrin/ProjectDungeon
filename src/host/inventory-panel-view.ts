/**
 * Vista DOM del panel de personaje (REQ-018 T-008/T-009).
 *
 * Vive dentro del marco 16:9, nunca en Canvas. Reutiliza filas y botones
 * estables para que el foco no se pierda en cada refresco, atrapa `Tab` dentro
 * del diálogo y deja `Escape`/`I` al host. La vista no valida: solo pinta el
 * modelo y despacha el comando de la acción confirmada.
 */

import { EQUIPMENT_SLOTS } from '../game/equipment';
import type { GameState } from '../game/types';
import {
  buildInventoryPanelModel,
  type InventoryPanelModel,
  type PanelAction,
  type PanelItem,
} from './inventory-panel';

interface PanelRowView {
  readonly root: HTMLElement;
  readonly icon: HTMLElement;
  readonly name: HTMLElement;
  readonly detail: HTMLElement;
  readonly traits: HTMLElement;
  readonly comparison: HTMLElement;
  readonly buttons: ReadonlyMap<PanelAction['kind'], HTMLButtonElement>;
}

export interface InventoryPanelView {
  open(state: GameState): void;
  close(): void;
  isOpen(): boolean;
  update(state: GameState): void;
  setMessage(message: string | null): void;
}

export interface InventoryPanelOptions {
  /** Comando confirmado desde una fila; el host lo despacha y decide. */
  readonly onCommand?: (action: PanelAction) => void;
  /** El botón de cerrar pide al host que cierre el panel. */
  readonly onClose?: () => void;
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

function focusedElement(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active : null;
}

/** Test id estable a partir de la clave de la fila. */
function rowTestId(key: string): string {
  return key.replace(/[^a-zA-Z0-9-]+/g, '-');
}

function createRow(
  parent: HTMLElement,
  key: string,
  kinds: readonly PanelAction['kind'][],
): PanelRowView {
  const root = document.createElement('li');
  root.className = 'inventory-row';
  root.dataset.testid = `inventory-${rowTestId(key)}`;
  root.dataset.rowKey = key;

  const header = document.createElement('div');
  header.className = 'inventory-row-header';

  const icon = document.createElement('span');
  icon.className = 'inventory-row-icon';
  icon.dataset.testid = `inventory-${rowTestId(key)}-icon`;
  icon.setAttribute('aria-hidden', 'true');
  icon.hidden = true;

  const name = document.createElement('span');
  name.className = 'inventory-row-name';
  name.dataset.testid = `inventory-${rowTestId(key)}-name`;

  const detail = document.createElement('span');
  detail.className = 'inventory-row-detail';

  header.append(icon, name, detail);

  const traits = document.createElement('p');
  traits.className = 'inventory-row-traits';

  const comparison = document.createElement('p');
  comparison.className = 'inventory-row-comparison';

  const actions = document.createElement('div');
  actions.className = 'inventory-row-actions';

  const buttons = new Map<PanelAction['kind'], HTMLButtonElement>();
  for (const kind of kinds) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inventory-action';
    button.dataset.testid = `inventory-action-${kind}-${rowTestId(key)}`;
    button.dataset.action = kind;
    actions.append(button);
    buttons.set(kind, button);
  }

  root.append(header, traits, comparison, actions);
  parent.append(root);

  return { root, icon, name, detail, traits, comparison, buttons };
}

/**
 * Icono DOM con el mismo recorte que el mundo: fondo CSS posicionado sobre
 * `items.png`, nunca un canvas. La hoja y el tamaño viven en `index.html`; aquí
 * solo se desplaza la ventana al `rect` del catálogo.
 */
function updateIcon(icon: HTMLElement, item: PanelItem): void {
  const rect = item.sprite;
  icon.hidden = item.empty || rect === null;
  if (!rect) {
    icon.style.removeProperty('background-position');
    return;
  }
  icon.style.backgroundPosition = `-${rect.x}px -${rect.y}px`;
}

function updateRow(
  view: PanelRowView,
  item: PanelItem,
  onCommand: (action: PanelAction) => void,
): void {
  view.root.dataset.empty = String(item.empty);
  view.root.classList.toggle('is-empty', item.empty);
  updateIcon(view.icon, item);
  view.name.textContent = item.name;
  view.detail.textContent = item.detail;

  const hasTraits = item.traits.length > 0;
  view.traits.hidden = item.empty;
  view.traits.textContent = hasTraits
    ? `Traits: ${item.traits.join(' · ')}`
    : 'Traits: —';

  const hasComparison = item.comparison.length > 0;
  view.comparison.hidden = item.empty || !hasComparison;
  view.comparison.textContent = hasComparison
    ? `Antes → después: ${item.comparison
        .map((row) => `${row.label} ${row.before} → ${row.after}`)
        .join(' · ')}`
    : '';

  for (const [kind, button] of view.buttons) {
    const action = item.actions.find((candidate) => candidate.kind === kind);
    button.hidden = action === undefined;
    if (!action) {
      button.textContent = '';
      button.onclick = null;
      continue;
    }
    button.textContent = action.label;
    button.onclick = () => onCommand(action);
  }
}

export function createInventoryPanelView(
  root: ParentNode,
  options: InventoryPanelOptions = {},
): InventoryPanelView {
  const panel = requireElement(root, 'inventory-panel');
  const player = requireElement(root, 'inventory-player');
  const mp = requireElement(root, 'inventory-mp');
  const backpackCount = requireElement(root, 'inventory-backpack-count');
  const equipmentList = requireElement(root, 'inventory-equipment');
  const backpackList = requireElement(root, 'inventory-backpack');
  const groundSection = requireElement(root, 'inventory-ground-section');
  const groundHint = requireElement(root, 'inventory-ground-hint');
  const groundList = requireElement(root, 'inventory-ground');
  const statsTotal = requireElement(root, 'inventory-stats-total');
  const statsRows = requireElement(root, 'inventory-stats-rows');
  const message = requireElement(root, 'inventory-message');
  const closeButton = requireElement<HTMLButtonElement>(root, 'inventory-close');

  const equipmentRows = new Map<string, PanelRowView>();
  for (const slot of EQUIPMENT_SLOTS) {
    equipmentRows.set(
      `slot:${slot}`,
      createRow(equipmentList, `slot:${slot}`, ['unequip', 'drop']),
    );
  }

  const backpackRows = new Map<string, PanelRowView>();
  const groundRows = new Map<string, PanelRowView>();
  let previousFocus: HTMLElement | null = null;

  const onCommand = (action: PanelAction): void => {
    options.onCommand?.(action);
  };

  const focusables = (): readonly HTMLElement[] => {
    const nodes = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([hidden])',
    );
    return [...nodes].filter((node) => node.offsetParent !== null);
  };

  const focusFirst = (): void => {
    const first = focusables()[0];
    first?.focus();
  };

  const ensureBackpackRow = (key: string): PanelRowView => {
    const existing = backpackRows.get(key);
    if (existing) return existing;
    const created = createRow(backpackList, key, ['equip', 'drop']);
    backpackRows.set(key, created);
    return created;
  };

  const ensureGroundRow = (key: string): PanelRowView => {
    const existing = groundRows.get(key);
    if (existing) return existing;
    const created = createRow(groundList, key, ['pickup', 'equip']);
    groundRows.set(key, created);
    return created;
  };

  const renderModel = (model: InventoryPanelModel): void => {
    player.textContent = model.playerName;
    mp.textContent = model.mp;
    backpackCount.textContent = model.backpackCount;

    for (const item of model.equipment) {
      const row = equipmentRows.get(item.key);
      if (row) updateRow(row, item, onCommand);
    }

    for (const item of model.backpack) {
      updateRow(ensureBackpackRow(item.key), item, onCommand);
    }
    for (const [key, row] of backpackRows) {
      const present = model.backpack.some((item) => item.key === key);
      if (!present) {
        row.root.remove();
        backpackRows.delete(key);
      }
    }

    const ground = model.ground;
    groundSection.hidden = ground === null;
    groundHint.textContent = model.groundHint;
    groundHint.hidden = model.groundHint === '';
    for (const item of ground ?? []) {
      updateRow(ensureGroundRow(item.key), item, onCommand);
    }
    const groundKeys = new Set((ground ?? []).map((item) => item.key));
    for (const [key, row] of groundRows) {
      if (groundKeys.has(key)) continue;
      row.root.remove();
      groundRows.delete(key);
    }

    statsTotal.textContent = model.stats.total;
    statsRows.replaceChildren(
      ...model.stats.rows.map((row) => {
        const entry = document.createElement('li');
        entry.className = 'inventory-stats-row';
        const label = document.createElement('strong');
        label.textContent = `${row.label}: `;
        entry.append(label, row.value);
        return entry;
      }),
    );

    // Un refresco puede retirar la fila enfocada (recoger, soltar). El foco
    // vuelve al panel para que `Tab` siga atrapado y la navegación no se rompa.
    if (!panel.hidden && !panel.contains(document.activeElement)) focusFirst();
  };

  closeButton.addEventListener('click', () => {
    options.onClose?.();
  });

  // Si el foco escapa por cualquier vía (clic en el fondo, fila retirada), el
  // diálogo modal lo recupera; nunca deja el teclado fuera mientras está abierto.
  document.addEventListener('focusin', (event) => {
    if (panel.hidden) return;
    const target = event.target;
    if (target instanceof Node && panel.contains(target)) return;
    focusFirst();
  });

  // Atrapa el foco dentro del diálogo y permite recorrer acciones con flechas.
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const nodes = focusables();
    if (nodes.length === 0) return;
    const current = nodes.indexOf(document.activeElement as HTMLElement);
    const backwards =
      event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey);
    const delta = backwards ? -1 : 1;
    const next =
      current < 0
        ? event.shiftKey
          ? nodes.length - 1
          : 0
        : (current + delta + nodes.length) % nodes.length;
    event.preventDefault();
    nodes[next].focus();
  });

  return {
    open(state: GameState): void {
      previousFocus = focusedElement();
      panel.hidden = false;
      message.hidden = true;
      message.textContent = '';
      renderModel(buildInventoryPanelModel(state));
      focusFirst();
    },
    close(): void {
      panel.hidden = true;
      message.hidden = true;
      message.textContent = '';
      if (previousFocus?.isConnected) previousFocus.focus();
      previousFocus = null;
    },
    isOpen(): boolean {
      return !panel.hidden;
    },
    update(state: GameState): void {
      if (panel.hidden) return;
      renderModel(buildInventoryPanelModel(state));
    },
    setMessage(value: string | null): void {
      message.textContent = value ?? '';
      message.hidden = value === null;
    },
  };
}
