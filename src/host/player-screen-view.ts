/**
 * Vista DOM de la configuración jugador a jugador (REQ-016 R-005, R-007,
 * R-008, R-011, T-005..T-007).
 *
 * La sección es hermana de la pantalla de inicio y opaca: tapa HUD y canvas
 * mientras está activa. El modelo puro decide; esta vista pinta estado, mueve
 * el foco y traduce clics/teclas. No construye `GameSession` ni arranca nada.
 */

import type { ArchetypeId } from '../game/roster';
import { ROSTER } from '../game/roster';
import {
  createPlayerScreen,
  type PlayerPartyConfig,
  type PlayerScreenConfig,
  type PlayerScreenStep,
} from './player-screen';

export interface PlayerScreenViewOptions extends PlayerScreenConfig {
  /** Punto de extensión del resumen (TASK-0126); aquí solo anuncia. */
  onComplete(config: PlayerPartyConfig): void;
  /** La cancelación se confirmó: el host vuelve al menú principal. */
  onCancelConfirmed(): void;
}

export interface PlayerScreenView {
  /** La pantalla sigue visible y consume sus teclas. */
  isActive(): boolean;
  /** Anuncia un mensaje en la región `role="status"` de la pantalla. */
  announce(message: string): void;
  /** Oculta la sección y retira el listener global. */
  destroy(): void;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Falta la pantalla de jugador: ${selector}`);
  return element;
}

/**
 * Monta la pantalla ya visible con el borrador del jugador 1. `onComplete` no
 * navega: la sección queda como está hasta TASK-0126.
 */
export function createPlayerScreenView(
  root: ParentNode,
  options: PlayerScreenViewOptions,
): PlayerScreenView {
  const model = createPlayerScreen({
    playerCount: options.playerCount,
    seed: options.seed,
  });

  const section = requireElement<HTMLElement>(root, '[data-testid="player-screen"]');
  const position = requireElement<HTMLElement>(root, '[data-testid="player-position"]');
  const status = requireElement<HTMLElement>(root, '[data-testid="player-status"]');
  const archetypes = requireElement<HTMLElement>(
    root,
    '[data-testid="player-archetypes"]',
  );
  const nameInput = requireElement<HTMLInputElement>(root, '[data-testid="player-name"]');
  const variantOne = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="player-variant-1"]',
  );
  const variantTwo = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="player-variant-2"]',
  );
  const backButton = requireElement<HTMLButtonElement>(root, '[data-testid="player-back"]');
  const nextButton = requireElement<HTMLButtonElement>(root, '[data-testid="player-next"]');
  const cancelButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="player-cancel"]',
  );
  const dialog = requireElement<HTMLElement>(
    root,
    '[data-testid="player-cancel-dialog"]',
  );
  const confirmButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="player-cancel-confirm"]',
  );
  const dismissButton = requireElement<HTMLButtonElement>(
    root,
    '[data-testid="player-cancel-dismiss"]',
  );

  const archetypeButtons = new Map<ArchetypeId, HTMLButtonElement>();
  // Cada montaje parte de un contenedor vacío: destroy() no se lleva el DOM y
  // reutilizarlo acumularía botones con testids duplicados y listeners muertos.
  archetypes.replaceChildren();
  for (const id of Object.keys(ROSTER) as ArchetypeId[]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'player-choice ui-outset';
    button.dataset.testid = `player-archetype-${id}`;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = ROSTER[id].name;
    button.addEventListener('click', () => {
      model.setArchetype(id);
      render();
    });
    archetypes.append(button);
    archetypeButtons.set(id, button);
  }

  const dialogButtons: readonly HTMLButtonElement[] = [confirmButton, dismissButton];

  let visible = true;
  let announcement = `Jugador 1 de ${options.playerCount}.`;
  let renderedStep: PlayerScreenStep | null = null;
  let renderedIndex: number | null = null;
  let cancelOrigin: HTMLElement | null = null;

  const currentDraft = () => model.state().players[model.state().index];

  const focusSelectedArchetype = (): void => {
    const draft = currentDraft();
    const button = archetypeButtons.get(draft.archetypeId);
    if (button) button.focus();
  };

  const render = (): void => {
    const state = model.state();
    section.hidden = !visible;
    section.dataset.step = state.step;
    position.textContent = `Jugador ${state.index + 1} de ${state.playerCount}`;
    status.textContent = announcement;
    dialog.hidden = state.step !== 'confirm-cancel';

    const draft = state.players[state.index];
    for (const [id, button] of archetypeButtons) {
      button.setAttribute('aria-pressed', String(draft.archetypeId === id));
    }
    variantOne.setAttribute('aria-pressed', String(draft.variant === 1));
    variantTwo.setAttribute('aria-pressed', String(draft.variant === 2));
    if (nameInput.value !== draft.name) nameInput.value = draft.name;
    backButton.disabled = state.index === 0;

    if (state.step !== renderedStep) {
      if (state.step === 'confirm-cancel') {
        const active = document.activeElement;
        cancelOrigin = active instanceof HTMLElement ? active : cancelButton;
        dismissButton.focus();
      } else if (renderedStep === 'confirm-cancel') {
        const origin = cancelOrigin;
        cancelOrigin = null;
        if (origin && origin.isConnected && !origin.hidden) origin.focus();
        else focusSelectedArchetype();
      } else {
        focusSelectedArchetype();
      }
      renderedStep = state.step;
    }

    if (state.index !== renderedIndex) {
      renderedIndex = state.index;
      if (state.step === 'player') focusSelectedArchetype();
    }
  };

  const requestCancel = (): void => {
    model.requestCancel();
    render();
  };

  const dismissCancel = (): void => {
    model.dismissCancel();
    render();
  };

  const confirmCancel = (): void => {
    if (!model.confirmCancel()) return;
    visible = false;
    section.hidden = true;
    options.onCancelConfirmed();
  };

  const next = (): void => {
    const party = model.next();
    if (party === null) {
      announcement = `Jugador ${model.state().index + 1} de ${options.playerCount}.`;
    }
    render();
    if (party !== null) options.onComplete(party);
  };

  const back = (): void => {
    model.back();
    announcement = `Jugador ${model.state().index + 1} de ${options.playerCount}.`;
    render();
  };

  variantOne.addEventListener('click', () => {
    model.setVariant(1);
    render();
  });
  variantTwo.addEventListener('click', () => {
    model.setVariant(2);
    render();
  });
  nameInput.addEventListener('input', () => {
    model.setName(nameInput.value);
    const normalized = currentDraft().name;
    if (nameInput.value !== normalized) nameInput.value = normalized;
  });
  backButton.addEventListener('click', back);
  nextButton.addEventListener('click', next);
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
    const step = model.state().step;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (step === 'player') requestCancel();
      else dismissCancel();
      return;
    }

    if (event.key === 'Tab' && step === 'confirm-cancel') {
      event.preventDefault();
      trapDialogFocus(event.shiftKey);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  render();

  return {
    isActive(): boolean {
      return visible;
    },
    announce(message: string): void {
      announcement = message;
      status.textContent = message;
    },
    destroy(): void {
      visible = false;
      section.hidden = true;
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
