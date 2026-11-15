/**
 * Vista DOM del menú principal y del paso 1 (REQ-016 R-001..R-004, R-011, R-012).
 *
 * La sección vive dentro del marco 16:9 y es opaca: tapa HUD y canvas mientras
 * está activa. El modelo puro decide; esta vista solo pinta estado, mueve el
 * foco y traduce clics/teclas. No construye `GameSession` ni arranca partida.
 */

import {
  createStartScreen,
  type StartScreenHandlers,
  type StartScreenState,
  type StartScreenStep,
} from './start-screen';

export interface StartScreenViewOptions extends StartScreenHandlers {
  /** Query string de la página; por defecto, sin parámetros. */
  readonly search?: string;
  /** Aleatoriedad inyectable para tests. */
  readonly random?: () => number;
}

export interface StartScreenView {
  /** La pantalla de inicio sigue visible: el host no interpreta teclas de juego. */
  isActive(): boolean;
  /** Oculta la pantalla sin tocar el modelo al pasar a configurar jugadores. */
  hide(): void;
  /** Vuelve al menú principal con N=1 y semilla vacía, sin recargar. */
  showMenu(): void;
  /**
   * Muestra la pantalla y abre el paso 1 con el modelo existente. Lo usa
   * «Nueva partida» de la pausa (REQ-024 R-013) sin reiniciar la sesión.
   */
  showStepOne(): void;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Falta la pantalla de inicio: ${selector}`);
  return element;
}

function messageFor(state: StartScreenState): string {
  return state.error ?? '';
}

/**
 * Monta la pantalla. `?test=1` no la crea: el host de test arranca como antes.
 * «Continuar» anuncia la configuración con `role="status"` pero no navega,
 * no oculta el paso 1 y no inicia la partida.
 */
export function createStartScreenView(
  root: ParentNode,
  options: StartScreenViewOptions,
): StartScreenView {
  const model = createStartScreen({
    search: options.search,
    random: options.random,
  });

  const section = requireElement<HTMLElement>(root, '[data-testid="start-screen"]');
  const menu = requireElement<HTMLElement>(root, '[data-testid="start-menu"]');
  const stepOne = requireElement<HTMLElement>(root, '[data-testid="start-step1"]');
  const dialog = requireElement<HTMLElement>(root, '[data-testid="start-cancel-dialog"]');
  const newButton = requireElement<HTMLButtonElement>(root, '[data-testid="start-new"]');
  const loadButton = requireElement<HTMLButtonElement>(root, '[data-testid="start-load"]');
  const players = requireElement<HTMLSelectElement>(root, '[data-testid="step1-players"]');
  const seed = requireElement<HTMLInputElement>(root, '[data-testid="step1-seed"]');
  const error = requireElement<HTMLElement>(root, '[data-testid="step1-error"]');
  const status = requireElement<HTMLElement>(root, '[data-testid="start-status"]');
  const continueButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="step1-continue"]',
  );
  const cancelButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="step1-cancel"]',
  );
  const confirmButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="start-cancel-confirm"]',
  );
  const dismissButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="start-cancel-dismiss"]',
  );

  let announcement = '';
  let visible = true;
  let renderedStep: StartScreenStep | null = null;
  let cancelOrigin: HTMLElement | null = null;

  const dialogButtons: readonly HTMLButtonElement[] = [confirmButton, dismissButton];

  const renderMessages = (state: StartScreenState): void => {
    error.hidden = state.error === null;
    error.textContent = messageFor(state);
    seed.setAttribute('aria-invalid', String(state.errorField === 'seed'));
  };

  const render = (): void => {
    const state = model.state();
    section.hidden = !visible;
    menu.hidden = state.step !== 'menu';
    stepOne.hidden = state.step !== 'step1';
    dialog.hidden = state.step !== 'confirm-cancel';

    players.value = String(state.playerCount);
    seed.value = state.seedText;
    renderMessages(state);
    status.textContent = state.step === 'menu' ? (state.notice ?? '') : announcement;

    if (state.step !== renderedStep) {
      if (state.step === 'step1' && renderedStep === 'confirm-cancel') {
        const origin = cancelOrigin;
        cancelOrigin = null;
        if (origin && origin.isConnected && !origin.hidden) origin.focus();
        else players.focus();
      } else if (state.step === 'confirm-cancel') {
        const active = document.activeElement;
        cancelOrigin = active instanceof HTMLElement ? active : cancelButton;
        dismissButton.focus();
      } else if (state.step === 'step1') {
        players.focus();
      } else {
        newButton.focus();
      }
      renderedStep = state.step;
    }
  };

  const openStepOne = (): void => {
    announcement = '';
    model.openStepOne();
    render();
  };

  const requestCancel = (): void => {
    announcement = '';
    model.requestCancel();
    render();
  };

  const dismissCancel = (): void => {
    model.dismissCancel();
    render();
  };

  const confirmCancel = (): void => {
    announcement = '';
    model.confirmCancel();
    render();
  };

  const continueStepOne = (): void => {
    const config = model.continueStepOne();
    if (!config) {
      render();
      if (model.state().errorField === 'seed') seed.focus();
      return;
    }
    const noun = config.playerCount === 1 ? 'jugador' : 'jugadores';
    announcement = `Configuración lista: ${config.playerCount} ${noun}, semilla ${config.seed}.`;
    options.onContinue(config);
    render();
  };

  newButton.addEventListener('click', openStepOne);
  loadButton.addEventListener('click', () => options.onLoadRequested());
  players.addEventListener('change', () => {
    model.setPlayerCount(Number(players.value));
    render();
  });
  seed.addEventListener('input', () => {
    model.setSeedText(seed.value);
    renderMessages(model.state());
  });
  continueButton.addEventListener('click', continueStepOne);
  cancelButton.addEventListener('click', requestCancel);
  confirmButton.addEventListener('click', confirmCancel);
  dismissButton.addEventListener('click', dismissCancel);

  const trapDialogFocus = (backwards: boolean): void => {
    const current = dialogButtons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = backwards ? -1 : 1;
    const next =
      current < 0
        ? 0
        : (current + delta + dialogButtons.length) % dialogButtons.length;
    dialogButtons[next].focus();
  };

  window.addEventListener('keydown', (event) => {
    if (!visible) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const step = model.state().step;

    if (event.key === 'Escape') {
      // En el menú no hay nada que cerrar; en paso 1 y aviso sí.
      if (step === 'menu') return;
      event.preventDefault();
      if (step === 'step1') requestCancel();
      else dismissCancel();
      return;
    }

    if (event.key === 'Tab' && step === 'confirm-cancel') {
      event.preventDefault();
      trapDialogFocus(event.shiftKey);
    }
  });

  render();

  return {
    isActive(): boolean {
      return visible;
    },
    hide(): void {
      visible = false;
      section.hidden = true;
    },
    showMenu(): void {
      announcement = '';
      model.returnToMenu();
      visible = true;
      renderedStep = null;
      render();
    },
    showStepOne(): void {
      announcement = '';
      visible = true;
      model.openStepOne();
      renderedStep = null;
      render();
    },
  };
}
