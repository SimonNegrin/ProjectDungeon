# Contrato técnico del intento 1

## 1. Modelo puro `src/host/pause-menu.ts`

Tipo serializable y sin DOM:

```ts
export type PauseAction = 'resume' | 'new-game' | 'load-game' | 'save-game' | 'controls';
export type PauseScreen = 'root' | 'controls' | 'confirm-new' | 'confirm-load';

export interface PauseContext {
  readonly phase: 'player' | 'enemy';
  readonly status: 'playing' | 'victory' | 'defeat';
  readonly animating: boolean;
  readonly panning: boolean;
}

export interface PauseState {
  readonly open: boolean;
  readonly screen: PauseScreen;
  readonly index: number;
  readonly save: { readonly enabled: boolean; readonly reason: string | null };
}
```

- `PAUSE_ACTIONS` fija el orden literal: `resume`, `new-game`, `load-game`,
  `save-game`, `controls`.
- `createPauseState()` cerrado; `openPause(state, context)`,
  `closePause(state)`, `movePauseSelection(state, delta)`,
  `activatePauseAction(state)`, `escapePause(state)`.
- `saveAvailability(context)` devuelve `enabled` solo con `status === 'playing'`,
  `phase === 'player'`, `!animating` y `!panning`. Motivo en español y distinto
  por causa: fase, animación, paneo y partida terminada. Se recalcula al abrir;
  el resto del tiempo no cambia porque la pausa congela el juego.
- `activatePauseAction`: `resume` pide cerrar; `new-game` va a `confirm-new`;
  `load-game` a `confirm-load`; `controls` a `controls`; `save-game` solo si
  `save.enabled`. En confirmaciones, activar confirma (el host ejecuta el
  callback); cancelar vuelve a raíz. `escapePause` en raíz cierra, en el resto
  vuelve a raíz. La selección de raíz se conserva al volver de un submenú.

## 2. Mapa único `src/host/keymap.ts`

Catálogo `KEY_BINDINGS` con `{ id, codes, label, group, managed? }`, códigos en
minúscula (`event.key` normalizado) y etiquetas generadas (`arrowup` → `↑`,
`escape` → `Esc`, `' '` → `Espacio`). Debe incluir al menos: cursor (WASD y
flechas), mover/atacar, panel, hechizos, fin de turno (`E`, vigente hasta
TASK-0149), pausa (`Esc`), debug (`F1`, `F2`). `R` no existe.

`src/host/input.ts` deriva de ese catálogo la tabla de movimiento y las teclas
gestionadas; no dejes listas literales paralelas. `hud.ts` construye
`KEYS_HELP` desde el catálogo y la vista de pausa construye sus secciones desde
el mismo. Test de deriva: cada código de movimiento del catálogo produce la
intención de cursor correcta, no hay códigos duplicados y la ayuda contiene
todas las etiquetas de las vinculaciones públicas.

## 3. Vista `src/host/pause-menu-view.ts` + `index.html` + `ui.css`

- Sección hermana de las pantallas de inicio, oculta por defecto, dentro del
  marco 16:9, opaca y modal: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby`, `data-testid="pause-menu"`.
- Raíz: título «Pausa» y cinco botones en orden con
  `data-testid="pause-resume|pause-new|pause-load|pause-save|pause-controls"`.
  Guardar usa `disabled` y un `[data-testid="pause-save-reason"]` visible con el
  motivo; en disponible, motivo oculto.
- Subpantalla de controles: filas generadas desde `KEY_BINDINGS`; sin inputs,
  sin remapeo. Aviso/confirmación: un bloque reutilizable con texto y dos
  botones (`pause-confirm` y `pause-cancel`), distinto texto para Nueva y
  Cargar. Una confirmación por acción.
- Navegación: flechas arriba/abajo y `W/S` mueven la selección; `Enter`/Espacio
  activan; `Tab`/`Shift+Tab` recorren botones; foco visible con
  `:focus-visible`; al abrir, foco en el botón seleccionado (Reanudar). Al
  volver de un submenú, foco en la acción de origen. Al cerrar, devuelve el foco
  al marco/canvas sin robar el foco a un input editable.
- No añadas botón de reinicio. No dupliques la lista de controles en HTML.

API de vista:

```ts
createPauseMenuView(root, {
  onAction(action: PauseAction): void; // resume/new/load/save/controls ya resueltos
  onConfirm(kind: 'new-game' | 'load-game'): void;
  onCancel(): void;
}): PauseMenuView
```

`show(state, context)`, `update(state, context)`, `hide()`, `isOpen()`.
La vista solo pinta y traduce eventos; el modelo decide.

## 4. Integración en `main.ts`

- Estado `pause: PauseState`; `pauseOpen` se lee de `pause.open`.
- Abrir pausa: calcula contexto (`session.state.phase/status`, `animation !== null`,
  `panning = false` hasta TASK-0150), cancela `frameHandle` y `textFrameHandle`
  conservando `animation.elapsed`, `damageTexts`, `banner` y `unitMarks`, y
  muestra la vista. No toca la sesión.
- Reanudar/cerrar: oculta la vista y reanuda el reloj (`lastFrameTime`/
  `textLastFrameTime` a `undefined`, `scheduleTextFrame`/`requestAnimationFrame`
  solo si hay animación o feedback pendiente), sin despachar nada.
- `tick`, `textTick` y `advanceForTest` no avanzan con la pausa abierta. El
  `advanceForTest` puede devolver el estado actual sin consumir tiempo.
- `keydown`: si la pausa está abierta, no llames a `translateKey` de juego; deja
  que la vista consuma la tecla y haz `preventDefault` de las gestionadas.
  Cerrada, `Esc` con panel abierto cierra el panel; con lista de hechizos
  abierta la cierra; si no, abre pausa. `F1` sigue funcionando cerrada; con la
  pausa abierta no.
- `R` se elimina de `translateKey`, de `MANAGED_KEYS`/mapa y de la ayuda. El
  comando `Restart` y `GameSession.dispatch` se conservan para debug/tests y
  para el resultado futuro; no añadas una ruta nueva.
- Guardar: `onAction('save-game')` solo se llama si está habilitado y, en este
  intento, es un no-op documentado (TASK-0140). No descargues nada.
- Cargar: confirmar cierra el aviso y vuelve a raíz; no leas archivos
  (TASK-0141). No inventes un mensaje de error.
- Nueva: confirmar cierra la pausa, cancela animación/feedback, limpia
  selecciones de panel/hechizos y llama a un método nuevo
  `startScreenView.showStepOne()` que muestra la pantalla y abre el paso 1 con
  el modelo existente. En `?test=1` (`startScreenView === null`) solo cierra la
  pausa y no lanza.
- `setupState` y `startPartySession` deben cerrar/limpiar la pausa.
- `render()` no debe redibujar el estado de juego mientras la pausa está abierta
  salvo para pintar la propia vista; el canvas puede quedar congelado.

## 5. Tests

- `tests/unit/host/pause-menu.test.ts`: orden, navegación, límites, `Esc` en
  raíz/submenú/aviso, confirmaciones, guardado habilitado/deshabilitado con
  motivo por fase, animación, paneo y partida terminada, estado puro.
- `tests/unit/host/keymap.test.ts` (o dentro de `input.test.ts`): deriva,
  duplicados y ayuda; `translateKey('Escape')` = abrir pausa, `translateKey('r')`
  = ignorado.
- `tests/unit/host/input.test.ts`: actualiza las expectativas de `R` y del panel;
  añade `Esc` sin panel y con lista de hechizos.
- `tests/e2e/pause-menu.spec.ts`: `?test=1`; pausa con `Esc`, orden de los cinco
  botones, foco visible/navegación, guardado habilitado en fase de personajes,
  `Esc` reanuda, confirmación de Nueva/Cargar y `Esc` vuelve a raíz; en fase
  enemiga (vía `setup` si hace falta) guardado deshabilitado con motivo. Si es
  viable y estable, congela una animación con la pausa abierta y comprueba que
  `step`/`elapsed` no cambian y que el input no mueve al jugador; evita esperas
  frágiles. Capturas con el helper existente.
- Sustituye las pulsaciones de `R` en los E2E existentes por `restart(page)` o
  `dispatchAccepted`, conservando lo que comprobaban del reinicio.

## 6. Verificación esperada

Ejecuta al menos:

```bash
pnpm exec vitest run tests/unit/host/input.test.ts tests/unit/host/pause-menu.test.ts tests/unit/host/keymap.test.ts tests/unit/host/session.test.ts
pnpm run test:e2e tests/e2e/pause-menu.spec.ts
pnpm run verify
```

Guarda salidas completas en `test-output.txt`, `e2e-output.txt` y
`verify-output.txt`. No dejes servidores ni procesos vivos.
