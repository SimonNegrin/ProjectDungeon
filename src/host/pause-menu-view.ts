/**
 * Vista DOM del menú de pausa (REQ-024 R-001/R-002/R-007).
 *
 * Es hermana de las pantallas de arranque: opaca, modal y dentro del marco
 * 16:9. No decide nada: pinta `PauseState`, genera la lista de controles desde
 * el mapa único de teclas y traduce clics/teclas a callbacks del host.
 */

import {
  KEY_BINDINGS,
  keyCodesLabel,
  type KeyBindingGroup,
} from './keymap';
import {
  PAUSE_ACTIONS,
  type PauseAction,
  type PauseContext,
  type PauseScreen,
  type PauseState,
} from './pause-menu';

export interface PauseMenuViewOptions {
  /** Acción de la raíz ya resuelta por la pulsación (ratón o teclado). */
  onAction(action: PauseAction): void;
  /** Flechas/W-S mueven la selección; el host actualiza el modelo. */
  onMoveSelection(delta: number): void;
  /** `Enter`/Espacio cuando el foco no está en un botón nativo. */
  onActivateSelection(): void;
  onConfirm(kind: 'new-game' | 'load-game'): void;
  onCancel(): void;
}

export interface PauseMenuView {
  show(state: PauseState, context: PauseContext): void;
  update(state: PauseState, context: PauseContext): void;
  hide(): void;
  isOpen(): boolean;
}

const GROUP_LABELS: Readonly<Record<KeyBindingGroup, string>> = {
  movimiento: 'Movimiento',
  acciones: 'Acciones',
  interfaz: 'Interfaz',
};

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

function isEditable(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable
  );
}

function confirmText(screen: PauseScreen): string {
  if (screen === 'confirm-new') {
    return '¿Empezar una partida nueva? Se perderá el progreso no guardado.';
  }
  return '¿Cargar una partida? Se reemplazará la partida actual.';
}

const ACTION_TEST_IDS: Readonly<Record<PauseAction, string>> = {
  resume: 'pause-resume',
  'new-game': 'pause-new',
  'load-game': 'pause-load',
  'save-game': 'pause-save',
  controls: 'pause-controls',
};

export function createPauseMenuView(
  root: ParentNode,
  options: PauseMenuViewOptions,
): PauseMenuView {
  const frame = root instanceof HTMLElement ? root : null;
  const section = requireElement<HTMLElement>(root, 'pause-menu');
  const rootScreen = requireElement<HTMLElement>(root, 'pause-root');
  const controlsScreen = requireElement<HTMLElement>(root, 'pause-controls-screen');
  const controlsList = requireElement<HTMLElement>(root, 'pause-controls-list');
  const confirmBlock = requireElement<HTMLElement>(root, 'pause-confirm-block');
  const confirmTextNode = requireElement<HTMLElement>(root, 'pause-confirm-text');
  const confirmButton = requireElement<HTMLButtonElement>(root, 'pause-confirm');
  const cancelButton = requireElement<HTMLButtonElement>(root, 'pause-cancel');
  const controlsBack = requireElement<HTMLButtonElement>(root, 'pause-controls-back');
  const saveReason = requireElement<HTMLElement>(root, 'pause-save-reason');

  const actionButtons = PAUSE_ACTIONS.map((action) => ({
    action,
    element: requireElement<HTMLButtonElement>(root, ACTION_TEST_IDS[action]),
  }));
  const saveButton = actionButtons.find(
    (entry) => entry.action === 'save-game',
  )!.element;

  // La lista de controles se construye una vez desde el catálogo. No hay
  // inputs ni botones de remapeo: solo texto.
  for (const group of ['movimiento', 'acciones', 'interfaz'] as const) {
    const bindings = KEY_BINDINGS.filter((binding) => binding.group === group);
    if (bindings.length === 0) continue;
    const block = document.createElement('section');
    block.className = 'pause-controls-group';
    block.dataset.group = group;

    const heading = document.createElement('h3');
    heading.className = 'pause-controls-heading';
    heading.textContent = GROUP_LABELS[group];
    block.append(heading);

    const list = document.createElement('dl');
    list.className = 'pause-controls-rows';
    for (const binding of bindings) {
      const row = document.createElement('div');
      row.className = 'pause-control-row';
      row.dataset.testid = `pause-control-${binding.id}`;

      const keys = document.createElement('dt');
      keys.className = 'pause-control-keys';
      keys.textContent = keyCodesLabel(binding);

      const label = document.createElement('dd');
      label.className = 'pause-control-label';
      label.textContent = binding.label;

      row.append(keys, label);
      list.append(row);
    }
    block.append(list);
    controlsList.append(block);
  }

  let visible = false;
  let previousFocus: HTMLElement | null = null;
  let renderedScreen: PauseScreen | null = null;
  let renderedIndex = -1;

  const focusableButtons = (screen: PauseScreen): HTMLButtonElement[] => {
    if (screen === 'root') {
      return actionButtons
        .map((entry) => entry.element)
        .filter((button) => !button.disabled);
    }
    if (screen === 'controls') return [controlsBack];
    return [confirmButton, cancelButton];
  };

  const focusSelected = (state: { readonly index: number }): void => {
    const button = actionButtons[state.index]?.element;
    if (button && !button.disabled) {
      button.focus({ preventScroll: true });
      return;
    }
    // Guardar desactivado no es enfocable: el foco va al motivo visible para
    // que Enter/Espacio no activen la acción anterior por accidente.
    saveReason.focus({ preventScroll: true });
  };

  const focusPrimary = (state: { screen: PauseScreen; index: number }): void => {
    if (state.screen === 'root') {
      focusSelected(state);
      return;
    }
    if (state.screen === 'controls') {
      controlsBack.focus({ preventScroll: true });
      return;
    }
    cancelButton.focus({ preventScroll: true });
  };

  const render = (state: PauseState): void => {
    rootScreen.hidden = state.screen !== 'root';
    controlsScreen.hidden = state.screen !== 'controls';
    confirmBlock.hidden =
      state.screen !== 'confirm-new' && state.screen !== 'confirm-load';

    for (const [index, entry] of actionButtons.entries()) {
      entry.element.dataset.selected = String(
        state.screen === 'root' && state.index === index,
      );
    }

    saveButton.disabled = !state.save.enabled;
    saveButton.dataset.enabled = String(state.save.enabled);
    saveReason.textContent = state.save.reason ?? '';
    saveReason.hidden = state.save.enabled || state.save.reason === null;

    if (!confirmBlock.hidden) {
      confirmTextNode.textContent = confirmText(state.screen);
      confirmButton.dataset.kind =
        state.screen === 'confirm-new' ? 'new-game' : 'load-game';
    }

    if (state.screen !== renderedScreen) {
      renderedScreen = state.screen;
      renderedIndex = state.index;
      focusPrimary(state);
      return;
    }

    if (state.screen === 'root' && state.index !== renderedIndex) {
      renderedIndex = state.index;
      focusSelected(state);
    }
  };

  const cycleFocus = (backwards: boolean): void => {
    const buttons = focusableButtons(renderedScreen ?? 'root');
    if (buttons.length === 0) return;
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = backwards ? -1 : 1;
    const next =
      current < 0
        ? 0
        : (current + delta + buttons.length) % buttons.length;
    buttons[next]?.focus({ preventScroll: true });
  };

  window.addEventListener('keydown', (event) => {
    if (!visible) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const key = event.key.toLowerCase();
    const screen = renderedScreen ?? 'root';

    if (key === 'escape') {
      event.preventDefault();
      options.onCancel();
      return;
    }

    if (key === 'tab') {
      event.preventDefault();
      cycleFocus(event.shiftKey);
      return;
    }

    if (key === 'enter' || key === ' ') {
      const active = document.activeElement;
      if (
        active instanceof HTMLButtonElement &&
        section.contains(active) &&
        !active.disabled
      ) {
        // El host bloquea Enter/Espacio como teclas gestionadas; aquí se
        // dispara el `click` nativo antes de que ese bloqueo lo cancele.
        event.preventDefault();
        active.click();
        return;
      }
      if (screen !== 'root') return;
      event.preventDefault();
      options.onActivateSelection();
      return;
    }

    if (screen !== 'root') return;

    if (key === 'arrowup' || key === 'w') {
      event.preventDefault();
      options.onMoveSelection(-1);
      return;
    }
    if (key === 'arrowdown' || key === 's') {
      event.preventDefault();
      options.onMoveSelection(1);
    }
  });

  for (const entry of actionButtons) {
    entry.element.addEventListener('click', () => options.onAction(entry.action));
  }
  confirmButton.addEventListener('click', () => {
    options.onConfirm(
      confirmButton.dataset.kind === 'new-game' ? 'new-game' : 'load-game',
    );
  });
  cancelButton.addEventListener('click', () => options.onCancel());
  controlsBack.addEventListener('click', () => options.onCancel());

  // Foco atrapado: el diálogo modal nunca deja el teclado fuera mientras está
  // abierto. No intercepta inputs editables porque no hay ninguno dentro.
  document.addEventListener('focusin', (event) => {
    if (!visible) return;
    const target = event.target;
    if (target instanceof Node && section.contains(target)) return;
    focusPrimary({ screen: renderedScreen ?? 'root', index: renderedIndex });
  });

  return {
    show(state: PauseState, _context: PauseContext): void {
      previousFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      visible = true;
      section.hidden = false;
      renderedScreen = null;
      renderedIndex = -1;
      render(state);
    },
    update(state: PauseState, _context: PauseContext): void {
      if (!visible) return;
      render(state);
    },
    hide(): void {
      if (!visible) return;
      visible = false;
      section.hidden = true;
      const target = previousFocus;
      previousFocus = null;
      if (target && target.isConnected && !isEditable(target)) {
        target.focus({ preventScroll: true });
        return;
      }
      // Devolver el foco al marco permite seguir jugando con el teclado sin
      // tocar ningún input del arranque.
      frame?.focus({ preventScroll: true });
    },
    isOpen(): boolean {
      return visible;
    },
  };
}
