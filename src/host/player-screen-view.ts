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
  buildArchetypeSheet,
  type SheetStatId,
  type SheetVariant,
} from './archetype-sheet';
import {
  createPlayerScreen,
  type PlayerPartyConfig,
  type PlayerScreenConfig,
  type PlayerScreenStep,
} from './player-screen';

/** Nodo de la ficha que se actualiza en cada render sin rehacer el DOM. */
interface VariantControl {
  readonly button: HTMLButtonElement;
  readonly sprite: HTMLElement;
  readonly selected: HTMLElement;
}

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
  archetypes.removeAttribute('role');
  archetypes.removeAttribute('aria-labelledby');

  const archetypeOptions = document.createElement('div');
  archetypeOptions.className = 'player-archetype-options';
  archetypeOptions.dataset.testid = 'player-archetype-options';
  archetypeOptions.setAttribute('role', 'group');
  archetypeOptions.setAttribute('aria-labelledby', 'player-archetype-label');

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
    archetypeOptions.append(button);
    archetypeButtons.set(id, button);
  }
  archetypes.append(archetypeOptions);

  // Ficha y miniaturas se crean una sola vez por montaje. `render()` solo
  // actualiza sus nodos: reconstruirlos al cambiar de arquetipo perdería el
  // foco de las miniaturas.
  const initial = buildArchetypeSheet(model.state().players[0].archetypeId);

  const sheet = document.createElement('section');
  sheet.className = 'player-sheet ui-inset';
  sheet.dataset.testid = 'player-sheet';
  sheet.setAttribute('aria-labelledby', 'player-sheet-name');

  const sheetName = document.createElement('h3');
  sheetName.id = 'player-sheet-name';
  sheetName.className = 'player-sheet-name';
  sheetName.dataset.testid = 'player-sheet-name';

  const statList = document.createElement('dl');
  statList.className = 'player-sheet-stats';
  const statValues = new Map<SheetStatId, HTMLElement>();
  for (const stat of initial.stats) {
    const row = document.createElement('div');
    row.className = 'player-sheet-row';
    row.dataset.testid = `player-sheet-stat-${stat.id}`;
    const term = document.createElement('dt');
    term.textContent = stat.label;
    const value = document.createElement('dd');
    value.textContent = stat.value;
    row.append(term, value);
    statList.append(row);
    statValues.set(stat.id, value);
  }

  const weaponLine = document.createElement('p');
  weaponLine.className = 'player-sheet-weapon';
  weaponLine.dataset.testid = 'player-sheet-weapon';

  const variants = document.createElement('div');
  variants.className = 'player-variants';
  variants.dataset.testid = 'player-variants';
  variants.setAttribute('role', 'group');
  variants.setAttribute('aria-label', 'Variante');

  const variantControls: readonly VariantControl[] = initial.variants.map(
    (variant: SheetVariant) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'player-variant ui-outset';
      button.dataset.testid = `player-variant-${variant.variant}`;
      button.setAttribute('aria-pressed', 'false');

      const sprite = document.createElement('span');
      sprite.className = 'player-variant-sprite';
      sprite.setAttribute('aria-hidden', 'true');

      const caption = document.createElement('span');
      caption.className = 'player-variant-caption';
      caption.textContent = `Variante ${variant.variant}`;

      const selected = document.createElement('span');
      selected.className = 'player-variant-selected';
      selected.dataset.testid = `player-variant-selected-${variant.variant}`;
      selected.textContent = 'Seleccionada';
      selected.hidden = true;

      button.append(sprite, caption, selected);
      button.addEventListener('click', () => {
        model.setVariant(variant.variant);
        render();
      });
      variants.append(button);

      return { button, sprite, selected };
    },
  );

  sheet.append(sheetName, statList, weaponLine, variants);
  archetypes.append(sheet);

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

    const sheetModel = buildArchetypeSheet(draft.archetypeId);
    sheetName.textContent = sheetModel.name;
    for (const stat of sheetModel.stats) {
      const value = statValues.get(stat.id);
      if (value) value.textContent = stat.value;
    }
    weaponLine.textContent = `Arma temática: ${sheetModel.weapon}`;
    for (const [offset, control] of variantControls.entries()) {
      const variant = sheetModel.variants[offset];
      const active = draft.variant === variant.variant;
      control.button.setAttribute('aria-pressed', String(active));
      control.button.setAttribute('aria-label', variant.accessibleName);
      control.sprite.style.setProperty(
        '--variant-sx',
        String(-variant.rect.sx * 2),
      );
      control.sprite.style.setProperty(
        '--variant-sy',
        String(-variant.rect.sy * 2),
      );
      control.selected.hidden = !active;
    }
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
