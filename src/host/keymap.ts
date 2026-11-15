/**
 * Mapa único de teclas del host (REQ-024 R-007 / T-014).
 *
 * Es la única fuente de verdad para tres consumidores: el traductor de input
 * (`input.ts`), la ayuda compacta del HUD (`hud.ts`) y la pantalla de controles
 * de la pausa (`pause-menu-view.ts`). Los códigos son `event.key` normalizados
 * a minúscula; las etiquetas visibles se generan aquí y nunca se escriben a
 * mano en los tres consumidores.
 *
 * `E` de fin de turno y `R` de reinicio ya no existen: el turno se cierra con
 * `N` y la pausa se abre con `Esc`.
 */

export type KeyBindingGroup = 'movimiento' | 'acciones' | 'interfaz';

export interface CursorStep {
  readonly dx: number;
  readonly dy: number;
}

export interface KeyBinding {
  /** Identificador estable para tests y filas de controles. */
  readonly id: string;
  /** Códigos `event.key` en minúscula. */
  readonly codes: readonly string[];
  /** Acción en español que se muestra junto a las teclas. */
  readonly label: string;
  readonly group: KeyBindingGroup;
  /**
   * Por defecto `true`: el host hace `preventDefault` para que el navegador no
   * ejecute su comportamiento sobre la tecla.
   */
  readonly managed?: boolean;
  /** Presente solo en las cuatro direcciones del cursor. */
  readonly cursor?: CursorStep;
}

const KEY_LABELS: Readonly<Record<string, string>> = {
  arrowup: '↑',
  arrowleft: '←',
  arrowdown: '↓',
  arrowright: '→',
  escape: 'Esc',
  enter: 'Enter',
  tab: 'Tab',
  ' ': 'Espacio',
  f1: 'F1',
  f2: 'F2',
};

/** Etiqueta visible de un código normalizado (`arrowup` → `↑`). */
export function keyLabel(code: string): string {
  const normalized = code.toLowerCase();
  const explicit = KEY_LABELS[normalized];
  if (explicit !== undefined) return explicit;
  return normalized.length === 1 ? normalized.toUpperCase() : normalized;
}

/** Teclas de una vinculación separadas por `/` (`W/↑`). */
export function keyCodesLabel(binding: KeyBinding): string {
  return binding.codes.map(keyLabel).join('/');
}

/**
 * Orden literal de la pantalla de controles y de la ayuda. Las cuatro
 * vinculaciones de cursor comparten etiqueta para que la ayuda agrupe sus
 * códigos en un solo segmento.
 */
export const KEY_BINDINGS: readonly KeyBinding[] = [
  {
    id: 'cursor-up',
    codes: ['w', 'arrowup'],
    label: 'Mover cursor',
    group: 'movimiento',
    cursor: { dx: 0, dy: -1 },
  },
  {
    id: 'cursor-left',
    codes: ['a', 'arrowleft'],
    label: 'Mover cursor',
    group: 'movimiento',
    cursor: { dx: -1, dy: 0 },
  },
  {
    id: 'cursor-down',
    codes: ['s', 'arrowdown'],
    label: 'Mover cursor',
    group: 'movimiento',
    cursor: { dx: 0, dy: 1 },
  },
  {
    id: 'cursor-right',
    codes: ['d', 'arrowright'],
    label: 'Mover cursor',
    group: 'movimiento',
    cursor: { dx: 1, dy: 0 },
  },
  {
    id: 'move',
    codes: [' ', 'enter'],
    label: 'moverse',
    group: 'acciones',
  },
  {
    id: 'attack',
    codes: ['f'],
    label: 'atacar',
    group: 'acciones',
  },
  {
    id: 'panel',
    codes: ['i'],
    label: 'panel',
    group: 'acciones',
  },
  {
    id: 'spells',
    codes: ['q'],
    label: 'hechizos',
    group: 'acciones',
  },
  {
    id: 'cast-spell',
    codes: ['x'],
    label: 'lanzar',
    group: 'acciones',
  },
  {
    id: 'end-turn',
    codes: ['n'],
    label: 'terminar turno',
    group: 'acciones',
  },
  {
    id: 'pause',
    codes: ['escape'],
    label: 'cerrar / pausa',
    group: 'interfaz',
  },
  {
    id: 'debug',
    codes: ['f1'],
    label: 'debug',
    group: 'interfaz',
  },
  {
    id: 'new-seed',
    codes: ['f2'],
    label: 'nueva semilla',
    group: 'interfaz',
  },
];

/** Teclas que el host gestiona y por las que bloquea el navegador. */
export const MANAGED_KEY_CODES: ReadonlySet<string> = new Set(
  KEY_BINDINGS.filter((binding) => binding.managed !== false).flatMap(
    (binding) => binding.codes,
  ),
);

/**
 * Segmentos de la ayuda del HUD: agrupa vinculaciones consecutivas con la misma
 * etiqueta (las cuatro direcciones del cursor) para no repetir el texto.
 */
export function keyHelpSegments(
  bindings: readonly KeyBinding[] = KEY_BINDINGS,
): readonly string[] {
  const segments: Array<{ label: string; codes: string[] }> = [];
  for (const binding of bindings) {
    const last = segments[segments.length - 1];
    if (last && last.label === binding.label) {
      last.codes.push(...binding.codes);
    } else {
      segments.push({ label: binding.label, codes: [...binding.codes] });
    }
  }
  return segments.map(
    (segment) => `${segment.codes.map(keyLabel).join('/')} ${segment.label}`,
  );
}

/** Ayuda compacta de una línea para el pie del HUD. */
export function formatKeyHelp(bindings: readonly KeyBinding[] = KEY_BINDINGS): string {
  return keyHelpSegments(bindings).join(' · ');
}
