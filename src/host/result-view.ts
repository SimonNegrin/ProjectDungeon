/**
 * Vista DOM de la pantalla de resultado (REQ-031 R-020, T-015).
 *
 * Es la pantalla final del host: opaca, modal y hermana de la pausa y del
 * arranque. Solo pinta el modelo de `result.ts` y traduce clics/teclas; no
 * reinicia ni carga nada por su cuenta. Las dos acciones son botones nativos,
 * de modo que `Tab`, `Enter` y `Espacio` funcionan sin atajos propios, y `Esc`
 * se consume sin abrir la pausa porque no hay partida en curso.
 */

import type { GameState } from '../game/types';
import { buildResultScreen, type ResultPlayer, type ResultScreen } from './result';

export interface ResultViewOptions {
  /** «Nueva partida»: el host abre el paso 1 de REQ-016; nunca reinicia. */
  onNewGame(): void;
  /** «Cargar partida»: cargador compartido sin confirmación. */
  onLoad(): void;
}

export interface ResultView {
  /** El resultado sigue visible: el host no interpreta teclas de juego. */
  isActive(): boolean;
  /** Deriva de `state` y pinta; solo enfoca al pasar de oculta a visible. */
  update(state: GameState): void;
  /** Mensaje visible del rechazo de carga; `null` lo oculta. */
  setLoadMessage(message: string | null): void;
  /** Oculta la pantalla y devuelve el foco al marco si estaba dentro. */
  hide(): void;
}

function requireElement<T extends HTMLElement>(root: ParentNode, testId: string): T {
  const element = root.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`Falta el elemento con data-testid="${testId}"`);
  return element;
}

function span(testId: string, className: string, text: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.dataset.testid = testId;
  element.className = className;
  element.textContent = text;
  return element;
}

function rowFor(player: ResultPlayer): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'result-player ui-inset';
  item.dataset.testid = `result-player-${player.number}`;
  item.append(
    span('result-player-number', 'result-player-number', String(player.number)),
    span('result-player-name', 'result-player-name', player.name),
    span('result-player-archetype', 'result-player-archetype', player.archetype),
  );
  return item;
}

/** Clave estable de los datos visibles; evita repintar en cada frame. */
function contentKey(screen: ResultScreen): string {
  return JSON.stringify({
    status: screen.status,
    round: screen.round,
    seed: screen.seed,
    players: screen.players,
  });
}

export function createResultView(
  root: ParentNode,
  options: ResultViewOptions,
): ResultView {
  const frame = root instanceof HTMLElement ? root : null;
  const section = requireElement<HTMLElement>(root, 'result-screen');
  const title = requireElement<HTMLElement>(root, 'result-title');
  const round = requireElement<HTMLElement>(root, 'result-round');
  const seed = requireElement<HTMLElement>(root, 'result-seed');
  const playersList = requireElement<HTMLElement>(root, 'result-players');
  const announcement = requireElement<HTMLElement>(root, 'result-announcement');
  const message = requireElement<HTMLElement>(root, 'result-load-message');
  const newButton = requireElement<HTMLButtonElement>(root, 'result-new');
  const loadButton = requireElement<HTMLButtonElement>(root, 'result-load');

  const buttons: readonly HTMLButtonElement[] = [newButton, loadButton];

  let visible = false;
  let renderedKey: string | null = null;

  const focusPrimary = (): void => {
    newButton.focus({ preventScroll: true });
  };

  const focusCurrent = (): void => {
    const active = document.activeElement;
    if (active === loadButton) {
      loadButton.focus({ preventScroll: true });
      return;
    }
    focusPrimary();
  };

  const setLoadMessage = (value: string | null): void => {
    message.textContent = value ?? '';
    message.hidden = value === null || value === '';
  };

  const paint = (screen: ResultScreen): void => {
    title.textContent = screen.title;
    title.dataset.status = screen.status;
    round.textContent = `Ronda ${screen.round}`;
    seed.textContent = `Semilla ${screen.seed}`;
    playersList.replaceChildren(...screen.players.map(rowFor));
    announcement.textContent = screen.announcement;
  };

  const cycleFocus = (backwards: boolean): void => {
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = backwards ? -1 : 1;
    const next =
      current < 0 ? 0 : (current + delta + buttons.length) % buttons.length;
    buttons[next]?.focus({ preventScroll: true });
  };

  /**
   * Consume la tecla en origen. `stopImmediatePropagation` evita que el
   * listener global del host convierta `Esc` en pausa mientras la partida ya
   * terminó.
   */
  const consume = (event: KeyboardEvent): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  window.addEventListener('keydown', (event) => {
    if (!visible) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

    if (event.key === 'Escape') {
      consume(event);
      return;
    }
    if (event.key === 'Tab') {
      consume(event);
      cycleFocus(event.shiftKey);
    }
  });

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (!visible) return;
      if (button === newButton) options.onNewGame();
      else options.onLoad();
    });
  }

  // Foco atrapado: el diálogo modal nunca deja el teclado fuera del resultado.
  document.addEventListener('focusin', (event) => {
    if (!visible) return;
    const target = event.target;
    if (target instanceof Node && section.contains(target)) return;
    focusCurrent();
  });

  return {
    isActive(): boolean {
      return visible;
    },
    update(state: GameState): void {
      const screen = buildResultScreen(state);
      if (screen === null) {
        if (visible) {
          visible = false;
          renderedKey = null;
          section.hidden = true;
          setLoadMessage(null);
        }
        return;
      }

      const key = contentKey(screen);
      if (!visible) {
        visible = true;
        section.hidden = false;
        setLoadMessage(null);
        paint(screen);
        renderedKey = key;
        // La partida ya terminó: el foco entra en la acción primaria y no
        // vuelve a moverse mientras el resultado siga visible.
        focusPrimary();
        return;
      }

      if (key === renderedKey) return;
      paint(screen);
      renderedKey = key;
    },
    setLoadMessage,
    hide(): void {
      if (!visible) return;
      visible = false;
      renderedKey = null;
      section.hidden = true;
      setLoadMessage(null);
      if (document.activeElement instanceof Node && section.contains(document.activeElement)) {
        frame?.focus({ preventScroll: true });
      }
    },
  };
}
