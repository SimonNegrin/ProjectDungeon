/**
 * Vista DOM del panel de personaje (REQ-018 T-008, REQ-032 N-001 a N-010).
 *
 * Vive dentro del marco 16:9, nunca en Canvas. Presenta tres columnas de un
 * tercio: figura de equipo, mochila y columna derecha con cadáveres y suelo. La
 * rejilla no muestra stats ni traits; el detalle llegará al HUD derecho en
 * TASK-0102. La navegación es espacial sobre un plano único: la vista inyecta el
 * centro de cada celda y el módulo puro resuelve el vecino.
 */

import { EQUIPMENT_SLOTS, type EquipmentSlot } from '../game/equipment';
import type { GameState } from '../game/types';
import {
  buildInventoryPanelModel,
  buildPanelMenu,
  type InventoryPanelModel,
  type PanelItem,
  type PanelMenuOption,
  type PanelSelection,
} from './inventory-panel';
import {
  cycleZone,
  findNeighbor,
  firstInReadingOrder,
  nearestTo,
  type NavigationCell,
  type NavigationDirection,
  type NavigationPoint,
} from './inventory-navigation';

interface CellView {
  readonly key: string;
  readonly zone: string;
  readonly root: HTMLLIElement;
  readonly icon: HTMLElement;
  readonly name: HTMLElement;
  readonly state: HTMLElement;
}

export interface InventoryPanelView {
  open(state: GameState): void;
  close(): void;
  isOpen(): boolean;
  update(state: GameState): void;
  setMessage(message: string | null): void;
}

export interface InventoryPanelOptions {
  /** Comando confirmado desde el submenú; el host lo despacha. */
  readonly onCommand?: (option: PanelMenuOption) => void;
  /** El botón de cerrar pide al host que cierre el panel. */
  readonly onClose?: () => void;
  /** Publica la selección para la ficha del HUD derecho. */
  readonly onSelectionChange?: (selection: PanelSelection | null) => void;
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

function stateLabel(key: string): string {
  if (key.startsWith('slot:')) return 'Equipado';
  if (key.startsWith('backpack:')) return 'En mochila';
  return 'En el suelo';
}

function directionForKey(key: string): NavigationDirection | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      break;
  }
  if (key.length !== 1) return null;
  switch (key.toLowerCase()) {
    case 'w':
      return 'up';
    case 's':
      return 'down';
    case 'a':
      return 'left';
    case 'd':
      return 'right';
    default:
      return null;
  }
}

function createCell(
  parent: HTMLElement,
  key: string,
  zone: string,
  className: string,
): CellView {
  const root = document.createElement('li');
  root.className = `inventory-row ui-inset ${className}`;
  root.dataset.testid = `inventory-${rowTestId(key)}`;
  root.dataset.rowKey = key;
  root.dataset.zone = zone;

  const icon = document.createElement('span');
  icon.className = 'inventory-row-icon';
  icon.dataset.testid = `inventory-${rowTestId(key)}-icon`;
  icon.setAttribute('aria-hidden', 'true');
  icon.hidden = true;

  const name = document.createElement('span');
  name.className = 'inventory-row-name';
  name.dataset.testid = `inventory-${rowTestId(key)}-name`;

  const state = document.createElement('span');
  state.className = 'inventory-row-state';
  state.dataset.testid = `inventory-${rowTestId(key)}-state`;

  root.append(icon, name, state);
  parent.append(root);

  return { key, zone, root, icon, name, state };
}

/** Icono DOM con el mismo recorte que el mundo: fondo CSS sobre `items.png`. */
function updateIcon(icon: HTMLElement, item: PanelItem): void {
  const rect = item.sprite;
  icon.hidden = item.empty || rect === null;
  if (!rect) {
    icon.style.removeProperty('background-position');
    return;
  }
  icon.style.backgroundPosition = `calc(var(--ui-scale) * ${-rect.x}px) calc(var(--ui-scale) * ${-rect.y}px)`;
}

function updateCell(view: CellView, item: PanelItem): void {
  view.root.dataset.empty = String(item.empty);
  view.root.classList.toggle('is-empty', item.empty);
  updateIcon(view.icon, item);
  view.name.textContent = item.name;
  // El nombre ya dice «Vacío»; el estado solo informa de objetos presentes.
  view.state.textContent = item.empty ? '' : stateLabel(view.key);

  if (item.empty) {
    view.root.removeAttribute('tabindex');
    view.root.setAttribute('aria-disabled', 'true');
    view.root.setAttribute(
      'aria-label',
      `${item.detail}: vacío, no seleccionable`,
    );
    return;
  }
  view.root.removeAttribute('aria-disabled');
  view.root.setAttribute('aria-label', `${item.name}, ${stateLabel(view.key)}`);
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
  const groundList = requireElement(root, 'inventory-ground');
  const groundScroll = requireElement(root, 'inventory-ground-scroll');
  const groundHint = requireElement(root, 'inventory-ground-hint');
  const groundEmpty = requireElement(root, 'inventory-ground-empty');
  const cadaversEmpty = requireElement(root, 'inventory-cadavers-empty');
  const message = requireElement(root, 'inventory-message');
  const submenu = requireElement(root, 'inventory-submenu');
  const closeButton = requireElement<HTMLButtonElement>(root, 'inventory-close');

  const equipmentCells = new Map<EquipmentSlot, CellView>();
  for (const slot of EQUIPMENT_SLOTS) {
    equipmentCells.set(
      slot,
      createCell(
        equipmentList,
        `slot:${slot}`,
        'equipment',
        `inventory-slot inventory-slot-${slot}`,
      ),
    );
  }

  const backpackCells = new Map<number, CellView>();
  const groundCells = new Map<string, CellView>();
  const zoneLastKey = new Map<string, string>();
  let currentCells: readonly NavigationCell[] = [];
  let model: InventoryPanelModel | null = null;
  let currentState: GameState | null = null;
  let selectedKey: string | null = null;
  let lastKey: string | null = null;
  let previousFocus: HTMLElement | null = null;
  let menuOpen = false;
  let menuIndex = 0;
  let menuOptions: readonly PanelMenuOption[] = [];

  const cellView = (key: string): CellView | null => {
    for (const view of equipmentCells.values()) {
      if (view.key === key) return view;
    }
    for (const view of backpackCells.values()) {
      if (view.key === key) return view;
    }
    return groundCells.get(key) ?? null;
  };

  const centerOf = (key: string): NavigationPoint | null => {
    const view = cellView(key);
    if (!view || !view.root.isConnected || view.root.dataset.empty === 'true') {
      return null;
    }
    const panelRect = panel.getBoundingClientRect();
    const rect = view.root.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - panelRect.left,
      y: rect.top + rect.height / 2 - panelRect.top,
    };
  };

  const readCells = (): readonly NavigationCell[] => {
    const cells: NavigationCell[] = [];
    for (const view of [
      ...equipmentCells.values(),
      ...backpackCells.values(),
      ...groundCells.values(),
    ]) {
      if (!view.root.isConnected || view.root.dataset.empty === 'true') continue;
      const center = centerOf(view.key);
      if (center) cells.push({ key: view.key, zone: view.zone, center });
    }
    return cells;
  };

  const itemForKey = (key: string | null): PanelItem | null => {
    if (!model || key === null) return null;
    return (
      model.equipment.find((item) => item.key === key) ??
      model.backpack.find((item) => item.key === key) ??
      model.ground.find((item) => item.key === key) ??
      null
    );
  };

  const selectionFor = (key: string | null): PanelSelection | null => {
    const item = itemForKey(key);
    const view = key === null ? null : cellView(key);
    if (
      !item ||
      item.empty ||
      item.itemId === null ||
      item.instanceId === null ||
      !view
    ) {
      return null;
    }
    return {
      key: item.key,
      itemId: item.itemId,
      instanceId: item.instanceId,
      zone: view.zone,
    };
  };

  const emitSelection = (): void => {
    options.onSelectionChange?.(selectionFor(selectedKey));
  };

  const revealRow = (view: CellView): void => {
    if (view.zone !== 'right' || !groundList.contains(view.root)) return;
    const rowRect = view.root.getBoundingClientRect();
    const scrollRect = groundScroll.getBoundingClientRect();
    if (rowRect.top < scrollRect.top) {
      groundScroll.scrollTop -= scrollRect.top - rowRect.top;
    } else if (rowRect.bottom > scrollRect.bottom) {
      groundScroll.scrollTop += rowRect.bottom - scrollRect.bottom;
    }
  };

  const focusRow = (view: CellView): void => {
    view.root.focus({ preventScroll: true });
    revealRow(view);
  };

  const focusSelectedOrClose = (): void => {
    const view = selectedKey === null ? null : cellView(selectedKey);
    if (view && view.root.dataset.empty === 'false') {
      focusRow(view);
      return;
    }
    closeButton.focus();
  };

  function positionMenu(): void {
    const rowView = selectedKey === null ? null : cellView(selectedKey);
    if (!rowView) return;
    const panelRect = panel.getBoundingClientRect();
    const rowRect = rowView.root.getBoundingClientRect();
    const columnRect =
      rowView.root.closest<HTMLElement>('.inventory-column')?.getBoundingClientRect() ??
      rowRect;
    const menuRect = submenu.getBoundingClientRect();
    const gap = 6;
    const minLeft = 4;
    const maxLeft = Math.max(minLeft, panelRect.width - menuRect.width - 4);
    const rightOfColumn = columnRect.right - panelRect.left + gap;
    const leftOfColumn =
      columnRect.left - panelRect.left - menuRect.width - gap;

    let left = rowView.zone === 'right' ? leftOfColumn : rightOfColumn;
    if (left < minLeft) left = rightOfColumn;
    if (left > maxLeft) left = leftOfColumn;
    left = Math.min(Math.max(minLeft, left), maxLeft);

    const maxTop = Math.max(4, panelRect.height - menuRect.height - 4);
    const top = Math.min(Math.max(4, rowRect.top - panelRect.top), maxTop);
    submenu.style.left = `${left}px`;
    submenu.style.top = `${top}px`;
  }

  function setMenuActive(index: number): void {
    if (!menuOpen) return;
    menuIndex = Math.min(Math.max(0, index), menuOptions.length - 1);
    const options = [
      ...submenu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ];
    options.forEach((element, position) => {
      const active = position === menuIndex;
      element.dataset.active = String(active);
      element.setAttribute('aria-selected', String(active));
    });
    const active = options[menuIndex];
    if (active) submenu.setAttribute('aria-activedescendant', active.id);
  }

  function renderMenu(): void {
    if (!menuOpen) {
      submenu.hidden = true;
      submenu.replaceChildren();
      submenu.removeAttribute('aria-activedescendant');
      return;
    }

    submenu.hidden = false;
    submenu.replaceChildren(
      ...menuOptions.map((option, index) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.id = `inventory-submenu-option-${option.kind}`;
        element.className = 'inventory-submenu-option';
        element.dataset.testid = `inventory-submenu-option-${option.kind}`;
        element.dataset.kind = option.kind;
        element.dataset.active = String(index === menuIndex);
        element.setAttribute('role', 'menuitem');
        element.tabIndex = -1;
        element.setAttribute('aria-selected', String(index === menuIndex));
        element.setAttribute('aria-disabled', String(option.disabled));

        const label = document.createElement('span');
        label.className = 'inventory-submenu-label';
        label.textContent = option.label;
        const cost = document.createElement('span');
        cost.className = 'inventory-submenu-cost';
        cost.textContent = option.costLabel;
        element.append(label, cost);

        if (option.disabled && option.reason !== null) {
          const reason = document.createElement('span');
          reason.className = 'inventory-submenu-reason';
          reason.textContent = option.reason;
          element.append(reason);
        }

        element.addEventListener('click', () => {
          if (option.disabled) return;
          executeOption(option);
        });
        return element;
      }),
    );

    const active = submenu.querySelector<HTMLElement>(
      `[role="menuitem"]:nth-child(${menuIndex + 1})`,
    );
    if (active) submenu.setAttribute('aria-activedescendant', active.id);
    submenu.style.left = '0px';
    submenu.style.top = '0px';
    positionMenu();
  }

  function closeMenu(focusObject: boolean): void {
    const wasOpen = menuOpen;
    menuOpen = false;
    menuOptions = [];
    menuIndex = 0;
    renderMenu();
    if (wasOpen && focusObject) focusSelectedOrClose();
  }

  function openMenu(): boolean {
    if (currentState === null || selectedKey === null) return false;
    const options = buildPanelMenu(currentState, selectedKey);
    if (options.length === 0) return false;
    menuOptions = options;
    menuIndex = 0;
    menuOpen = true;
    renderMenu();
    return true;
  }

  function executeOption(option: PanelMenuOption): void {
    if (option.disabled) return;
    closeMenu(true);
    options.onCommand?.(option);
  }

  const applySelection = (focus: boolean): void => {
    for (const view of [
      ...equipmentCells.values(),
      ...backpackCells.values(),
      ...groundCells.values(),
    ]) {
      const occupied = view.root.dataset.empty === 'false';
      const selected = occupied && view.key === selectedKey;
      view.root.classList.toggle('is-selected', selected);
      view.root.setAttribute('aria-current', selected ? 'true' : 'false');
      if (occupied) view.root.tabIndex = selected ? 0 : -1;
    }
    panel.dataset.selectedKey = selectedKey ?? '';
    emitSelection();
    if (selectedKey !== null) {
      const view = cellView(selectedKey);
      if (view) zoneLastKey.set(view.zone, selectedKey);
    }
    if (!focus) return;
    if (selectedKey !== null) {
      const view = cellView(selectedKey);
      if (view) {
        focusRow(view);
        return;
      }
    }
    closeButton.focus();
  };

  const selectByKey = (key: string, focus: boolean): void => {
    selectedKey = key;
    lastKey = key;
    applySelection(focus);
  };

  const zoneOf = (element: HTMLElement | null): string | null => {
    if (!element) return null;
    if (element === closeButton) return 'close';
    const zone = element.closest<HTMLElement>('[data-zone]');
    return zone?.dataset.zone ?? null;
  };

  const availableZones = (): string[] => {
    const zones: string[] = [];
    // `Tab` visita solo zonas con objetos; las vacías no son paradas.
    for (const zone of ['equipment', 'backpack', 'right'] as const) {
      if (!currentCells.some((cell) => cell.zone === zone)) continue;
      zones.push(zone);
    }
    zones.push('close');
    return zones;
  };

  const focusZone = (zone: string | null): void => {
    if (zone === null) return;
    if (zone === 'close') {
      closeButton.focus();
      return;
    }
    const zoneCells = currentCells.filter((cell) => cell.zone === zone);
    if (zoneCells.length === 0) return;
    const remembered = zoneLastKey.get(zone);
    const target =
      zoneCells.find((cell) => cell.key === remembered) ??
      firstInReadingOrder(zoneCells);
    if (!target) return;
    // `Tab` salta de zona, no recorre objetos: al entrar se selecciona el
    // recordado (o el primero por lectura) para que foco, `aria-current` y la
    // ficha describan siempre el mismo objeto.
    selectByKey(target.key, true);
  };

  const handleTab = (event: KeyboardEvent): void => {
    const active = focusedElement();
    const currentZone = zoneOf(active);
    const backwards = event.shiftKey;
    const zones = availableZones();
    const next = cycleZone(zones, currentZone, backwards);
    if (next === null) {
      event.preventDefault();
      closeButton.focus();
      return;
    }
    event.preventDefault();
    focusZone(next);
  };

  const renderModel = (state: GameState, mode: 'open' | 'update'): void => {
    if (menuOpen) closeMenu(false);
    currentState = state;
    const next = buildInventoryPanelModel(state);
    // El centro y la identidad anteriores se miden antes de retirar o vaciar
    // filas: son la referencia de N-008 cuando el objeto cambia de zona o
    // desaparece.
    const previousKey = selectedKey;
    const previousItem = itemForKey(previousKey);
    const previousInstanceId = previousItem?.instanceId ?? null;
    const previousCenter = previousKey === null ? null : centerOf(previousKey);

    model = next;
    player.textContent = next.playerName;
    mp.textContent = next.mp;
    backpackCount.textContent = next.backpackCount;

    for (const item of next.equipment) {
      const slot = item.key.slice('slot:'.length) as EquipmentSlot;
      const view = equipmentCells.get(slot);
      if (view) updateCell(view, item);
    }

    for (const item of next.backpack) {
      const index = Number(item.key.slice('backpack:'.length));
      let view = backpackCells.get(index);
      if (!view) {
        view = createCell(
          backpackList,
          `backpack:${index}`,
          'backpack',
          'inventory-backpack-cell',
        );
        backpackCells.set(index, view);
      }
      updateCell(view, item);
    }
    for (const [index, view] of backpackCells) {
      if (index < next.backpack.length) continue;
      view.root.remove();
      backpackCells.delete(index);
    }

    const groundKeys = new Set(next.ground.map((item) => item.key));
    for (const item of next.ground) {
      let view = groundCells.get(item.key);
      if (!view) {
        view = createCell(groundList, item.key, 'right', 'inventory-ground-row');
        groundCells.set(item.key, view);
      }
      updateCell(view, item);
    }
    for (const [key, view] of groundCells) {
      if (groundKeys.has(key)) continue;
      view.root.remove();
      groundCells.delete(key);
    }

    groundHint.textContent = next.groundHint;
    groundHint.hidden = next.groundHint === '';
    groundEmpty.textContent = next.groundEmptyHint;
    groundEmpty.hidden = next.ground.length > 0;
    cadaversEmpty.textContent = next.corpsesEmptyHint;
    cadaversEmpty.hidden = next.corpses.length > 0;

    currentCells = readCells();

    if (mode === 'open') {
      selectedKey =
        lastKey !== null && currentCells.some((cell) => cell.key === lastKey)
          ? lastKey
          : (firstInReadingOrder(currentCells)?.key ?? null);
    } else if (previousInstanceId !== null) {
      // N-008 por identidad: equipar, desequipar, recoger y soltar pueden mover
      // la instancia a otra zona; el foco la sigue a su nueva clave.
      const moved = [...next.equipment, ...next.backpack, ...next.ground].find(
        (item) => item.instanceId === previousInstanceId,
      );
      if (moved && currentCells.some((cell) => cell.key === moved.key)) {
        selectedKey = moved.key;
      } else if (previousCenter !== null) {
        selectedKey = nearestTo(currentCells, previousCenter)?.key ?? null;
      } else {
        selectedKey =
          lastKey !== null && currentCells.some((cell) => cell.key === lastKey)
            ? lastKey
            : (firstInReadingOrder(currentCells)?.key ?? null);
      }
    } else if (
      selectedKey !== null &&
      currentCells.some((cell) => cell.key === selectedKey)
    ) {
      // El objeto sigue existiendo: se conserva la selección (N-007/N-008).
    } else if (previousCenter !== null) {
      selectedKey = nearestTo(currentCells, previousCenter)?.key ?? null;
    } else {
      selectedKey =
        lastKey !== null && currentCells.some((cell) => cell.key === lastKey)
          ? lastKey
          : (firstInReadingOrder(currentCells)?.key ?? null);
    }
    lastKey = selectedKey ?? lastKey;
    applySelection(false);

    const active = focusedElement();
    const activeInside = active !== null && panel.contains(active);
    const activeKey = active?.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey;
    const activeStillValid =
      activeKey === undefined ||
      currentCells.some((cell) => cell.key === activeKey);
    // N-008/N-010: si el objeto cambió de clave o el foco quedó en otra fila,
    // el foco real sigue a la selección; el botón de cerrar no se secuestra.
    const focusOnAnotherRow =
      activeKey !== undefined && activeKey !== selectedKey;

    if (
      !panel.hidden &&
      (!activeInside || !activeStillValid || focusOnAnotherRow)
    ) {
      focusSelectedOrClose();
    }
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
    focusSelectedOrClose();
  });

  panel.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    // `event.repeat` no debe ejecutar dos veces ni recorrer el menú a saltos.
    if (event.repeat) return;

    if (menuOpen) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          setMenuActive(menuIndex + 1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          setMenuActive(menuIndex - 1);
          return;
        case 'ArrowLeft':
        case 'ArrowRight':
          // Izquierda/derecha no hacen nada, pero no deben mover el foco.
          event.preventDefault();
          event.stopPropagation();
          return;
        case 'Tab':
          // El submenú no atrapa el foco: se queda en el objeto que lo abrió.
          event.preventDefault();
          event.stopPropagation();
          return;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          closeMenu(true);
          return;
        case 'Enter': {
          event.preventDefault();
          event.stopPropagation();
          const option = menuOptions[menuIndex];
          // Una opción deshabilitada ya muestra su motivo; no despacha.
          if (option && !option.disabled) executeOption(option);
          return;
        }
        default:
          return;
      }
    }

    if (event.key === 'Tab') {
      handleTab(event);
      return;
    }

    if (event.key === 'Enter') {
      const activeKey = focusedElement()
        ?.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey;
      if (activeKey === undefined || activeKey !== selectedKey) return;
      event.preventDefault();
      event.stopPropagation();
      openMenu();
      return;
    }

    const direction = directionForKey(event.key);
    if (direction === null) return;
    event.preventDefault();
    const activeKey = focusedElement()
      ?.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey;
    const origin = activeKey ?? selectedKey;
    if (origin === null) return;
    const target = findNeighbor(currentCells, origin, direction);
    if (target === null) return; // Sin rebote en el borde.
    selectByKey(target.key, true);
  });

  return {
    open(state: GameState): void {
      previousFocus = focusedElement();
      panel.hidden = false;
      message.hidden = true;
      message.textContent = '';
      renderModel(state, 'open');
      focusSelectedOrClose();
    },
    close(): void {
      closeMenu(false);
      panel.hidden = true;
      message.hidden = true;
      message.textContent = '';
      options.onSelectionChange?.(null);
      if (previousFocus?.isConnected) previousFocus.focus();
      previousFocus = null;
    },
    isOpen(): boolean {
      return !panel.hidden;
    },
    update(state: GameState): void {
      if (panel.hidden) return;
      renderModel(state, 'update');
    },
    setMessage(value: string | null): void {
      message.textContent = value ?? '';
      message.hidden = value === null;
    },
  };
}
