/**
 * Vista DOM del resumen de party y semilla (REQ-016 R-009, R-010, R-011).
 *
 * La sección es hermana de la pantalla de inicio y de la de jugador, y opaca:
 * tapa HUD y canvas mientras está activa. Solo pinta el resumen y traduce clics
 * y teclas; el arranque lo decide el host con `onStart`.
 */

import { createPartySummary, type PartySummaryRow } from './party-summary';
import type { PlayerPartyConfig } from './player-screen';

export interface PartySummaryViewOptions {
  /** Devuelve si la partida arrancó; si no, el host ya anunció el error. */
  onStart(): boolean;
  /** Vuelve a la pantalla de jugador en el último jugador configurado. */
  onBack(): void;
  /** La cancelación se confirmó: el host vuelve al menú principal. */
  onCancelConfirmed(): void;
}

export interface PartySummaryView {
  /** El resumen sigue visible y consume sus teclas. */
  isActive(): boolean;
  /** Repinta filas y semilla con la party recibida y enfoca «Empezar». */
  show(party: PlayerPartyConfig): void;
  /** Oculta la sección sin destruirla; se conserva para volver con `show`. */
  hide(): void;
  /** Oculta la sección y retira el listener global. */
  destroy(): void;
  /** Mensaje visible del constructor rechazado; permanece en el resumen. */
  showError(message: string): void;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Falta el resumen de la party: ${selector}`);
  return element;
}

function span(testid: string, className: string, text: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.dataset.testid = testid;
  element.className = className;
  element.textContent = text;
  return element;
}

export function createPartySummaryView(
  root: ParentNode,
  options: PartySummaryViewOptions,
): PartySummaryView {
  const section = requireElement<HTMLElement>(root, '[data-testid="party-summary"]');
  const playersList = requireElement<HTMLElement>(root, '[data-testid="summary-players"]');
  const seedLine = requireElement<HTMLElement>(root, '[data-testid="summary-seed"]');
  const status = requireElement<HTMLElement>(root, '[data-testid="summary-status"]');
  const error = requireElement<HTMLElement>(root, '[data-testid="summary-error"]');
  const startButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="summary-start"]',
  );
  const backButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="summary-back"]',
  );
  const cancelButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="summary-cancel"]',
  );
  const dialog = requireElement<HTMLElement>(
    root,
    '[data-testid="summary-cancel-dialog"]',
  );
  const confirmButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="summary-cancel-confirm"]',
  );
  const dismissButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="summary-cancel-dismiss"]',
  );

  const dialogButtons: readonly HTMLButtonElement[] = [confirmButton, dismissButton];

  let visible = false;
  let confirming = false;
  let cancelOrigin: HTMLElement | null = null;

  const rowFor = (row: PartySummaryRow): HTMLLIElement => {
    const item = document.createElement('li');
    item.className = 'summary-player ui-inset';
    item.dataset.testid = `summary-player-${row.number}`;
    item.append(
      span('summary-player-number', 'summary-player-number', String(row.number)),
      span('summary-player-archetype', 'summary-player-archetype', row.archetype),
      span('summary-player-variant', 'summary-player-variant', `Variante ${row.variant}`),
      span('summary-player-name', 'summary-player-name', row.name),
    );
    return item;
  };

  const render = (): void => {
    section.hidden = !visible;
    section.dataset.step = confirming ? 'confirm-cancel' : 'summary';
    dialog.hidden = !visible || !confirming;
    error.hidden = error.textContent === '';
  };

  const paint = (party: PlayerPartyConfig): void => {
    const summary = createPartySummary(party);
    playersList.replaceChildren(...summary.players.map(rowFor));
    seedLine.textContent = `Semilla ${summary.seed}`;
    status.textContent = `Resumen de la party: ${summary.players.length} ${
      summary.players.length === 1 ? 'jugador' : 'jugadores'
    }, semilla ${summary.seed}.`;
  };

  const clearError = (): void => {
    error.textContent = '';
    error.hidden = true;
  };

  const focusStart = (): void => {
    startButton.focus();
  };

  const requestCancel = (): void => {
    if (!visible || confirming) return;
    const active = document.activeElement;
    cancelOrigin = active instanceof HTMLElement ? active : cancelButton;
    confirming = true;
    render();
    dismissButton.focus();
  };

  const dismissCancel = (): void => {
    if (!confirming) return;
    confirming = false;
    render();
    const origin = cancelOrigin;
    cancelOrigin = null;
    if (origin && origin.isConnected && !origin.hidden) origin.focus();
    else focusStart();
  };

  const confirmCancel = (): void => {
    if (!confirming) return;
    confirming = false;
    visible = false;
    section.hidden = true;
    options.onCancelConfirmed();
  };

  const start = (): void => {
    if (!visible || confirming) return;
    const started = options.onStart();
    if (!started && visible) focusStart();
  };

  startButton.addEventListener('click', start);
  backButton.addEventListener('click', () => {
    if (!visible || confirming) return;
    options.onBack();
  });
  cancelButton.addEventListener('click', requestCancel);
  confirmButton.addEventListener('click', confirmCancel);
  dismissButton.addEventListener('click', dismissCancel);

  const trapDialogFocus = (backwards: boolean): void => {
    const current = dialogButtons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = backwards ? -1 : 1;
    const target =
      current < 0
        ? 0
        : (current + delta + dialogButtons.length) % dialogButtons.length;
    dialogButtons[target].focus();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!visible) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (confirming) dismissCancel();
      else requestCancel();
      return;
    }

    if (event.key === 'Tab' && confirming) {
      event.preventDefault();
      trapDialogFocus(event.shiftKey);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  return {
    isActive(): boolean {
      return visible;
    },
    show(party: PlayerPartyConfig): void {
      clearError();
      paint(party);
      visible = true;
      confirming = false;
      cancelOrigin = null;
      render();
      focusStart();
    },
    hide(): void {
      visible = false;
      confirming = false;
      cancelOrigin = null;
      section.hidden = true;
      dialog.hidden = true;
    },
    destroy(): void {
      visible = false;
      confirming = false;
      cancelOrigin = null;
      section.hidden = true;
      dialog.hidden = true;
      window.removeEventListener('keydown', onKeyDown);
    },
    showError(message: string): void {
      error.textContent = message;
      error.hidden = message === '';
      status.textContent = message;
      if (visible && !confirming) focusStart();
    },
  };
}
