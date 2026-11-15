---
type: Task Brief Detail
title: "TASK-0126: contrato y matriz de tests"
description: Detalle técnico del resumen, la navegación y el arranque de partida.
task: TASK-0126
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:20:00Z }
---

# Contrato propuesto

## Modelo puro (`src/host/party-summary.ts`)

```ts
export interface PartySummaryRow {
  readonly number: number;       // 1..N
  readonly archetype: string;    // ROSTER[id].name
  readonly variant: 1 | 2;
  readonly name: string;         // name.trim() || ROSTER[id].name
}
export interface PartySummary {
  readonly seed: number;
  readonly players: readonly PartySummaryRow[];
}
export function createPartySummary(party: PlayerPartyConfig): PartySummary;

export type StartPartyResult =
  | { readonly ok: true; readonly session: GameSession }
  | { readonly ok: false; readonly error: string };

export function startParty(party: PlayerPartyConfig): StartPartyResult;
```

- `createPartySummary` no muta `party`, conserva el orden y no reordena.
- `startParty` llama solo a `new GameSession({ seed: party.seed, players:
  party.players })`. Captura `GameConfigError` (y cualquier `Error`) y devuelve
  el mensaje; no lanza ni construye estado parcial. No valida ni duplica reglas
  del motor.
- El nombre efectivo del resumen usa el nombre del arquetipo cuando el nombre
  propio está vacío; no cambia el `PlayerConfig` que llega al motor.

## Vista DOM (`src/host/party-summary-view.ts`)

Opciones: `party: PlayerPartyConfig`, `onStart(): boolean` (devuelve si arrancó),
`onBack(): void`, `onCancelConfirmed(): void`. API: `isActive()`, `show(party)`,
`hide()`, `destroy()`, `showError(message)`.

- Sección opaca hermana de `player-screen`, dentro del marco.
- Marcado en `index.html` (testids): `party-summary`, `summary-players`,
  `summary-player-<n>` (con `summary-player-number`, `-archetype`, `-variant`,
  `-name`), `summary-seed` (texto, sin `input`), `summary-start`,
  `summary-back`, `summary-cancel`, `summary-status` (`role="status"`),
  `summary-error` (`role="alert"`), `summary-cancel-dialog`,
  `summary-cancel-confirm`, `summary-cancel-dismiss`.
- Foco inicial en «Empezar»; `Esc` abre confirmación; `Esc` en el aviso lo
  cierra; `Tab` atrapado en el aviso y foco devuelto al origen al cerrar. Los
  botones son nativos y funcionan con `Enter`/`Espacio`.
- Al pulsar «Empezar», si `onStart()` devuelve `false`, permanece visible y
  anuncia el error; si arranca, el host la destruye.
- `show(party)` repinta filas y semilla con `replaceChildren` (sin listeners
  acumulados si se vuelve atrás y se entra de nuevo).

## Integración (`src/host/main.ts`)

- `openPlayerScreen`: `onComplete` oculta la pantalla de jugador (añadir
  `hide()`/`show()` a `PlayerScreenView`, sin tocar su modelo) y muestra el
  resumen con `party`; elimina el anuncio provisional «Party lista».
- «Atrás»: oculta el resumen y vuelve a mostrar la pantalla de jugador en el
  último jugador; el modelo conserva arquetipo, variante y nombre.
- «Empezar»: `startParty(party)`; si ok, `session = result.session` (cambiar
  `const session` a `let`), destruir pantallas de arranque y resumen, resetear
  presentación (animación, feedback, panel, spell menu, eventos, spot, efectos,
  cámara/cursor) y `render()`. Ver `setupState` como referencia; no reutilizar
  `session.load`, que está documentado como hook de test.
- «Cancelar» confirmado: destruir pantallas y `startScreenView.showMenu()`.
- Las guardas de teclado ya consultan `isActive()` de inicio/jugador: incluir el
  resumen para que `Esc`/teclas no lleguen al mapa.
- `?test=1`: no monta resumen; el arranque por defecto no cambia.

# Matriz de tests

Unitario (`tests/unit/host/party-summary.test.ts`):

- 1 y 2 jugadores: filas en orden con número, arquetipo de `ROSTER`, variante y
  nombre efectivo; nombre vacío cae al del arquetipo.
- Semilla del resumen igual a la recibida.
- `startParty` con 2 jugadores: sesión con `state.config.players` idénticos
  (nombre propio incluido), `state.config.seed` y `session.seed` elegidos, y
  `state.players` con arquetipo/variante/nombre resueltos.
- Configuración rechazada (N=0 o arquetipo inventado): `ok: false`, mensaje no
  vacío, sin lanzar.
- Mantener `tests/unit/host/session.test.ts` y `tests/unit/game/engine.test.ts`.

E2E (`tests/e2e/party-summary.spec.ts`, 1280×720 y una captura 900×700):

1. 1 jugador: menú → paso 1 (semilla 4242) → jugador → resumen; una fila
   Guerrero/Variante 1/Guerrero; semilla 4242 visible y sin control editable;
   foco en «Empezar».
2. «Atrás»: vuelve a «Jugador 1 de 1» con Guerrero; «Siguiente» regresa al
   resumen sin duplicar filas.
3. Cancelar: aviso visible; desistir conserva el resumen; `Esc` reabre; confirmar
   oculta resumen/jugador y muestra el menú principal con «Nueva» enfocada.
4. 2 jugadores: P1 Mago/variante 2/«Ana», P2 Guerrero/variante 1/«Boro»;
   resumen en orden 1-2; «Empezar» oculta el resumen, muestra canvas y
   `window.__game.snapshot()` expone 2 jugadores con arquetipo, variante y
   nombre, `config.seed` 4242 y mapa con esa semilla. Captura del resumen y del
   juego arrancado.
5. Actualizar en `tests/e2e/player-screen.spec.ts` el bloque del último
   «Siguiente»: ahora abre el resumen (sin el texto «Party lista»); conservar el
   resto de aserciones.

Manual: leer la semilla y comprobar que no se puede editar.

# Evidencia y comandos

- `pnpm exec vitest run tests/unit/host/party-summary.test.ts tests/unit/host/session.test.ts tests/unit/game/engine.test.ts` (120 s).
- `pnpm run verify` (240 s).
- `E2E_ARTIFACTS_DIR=artifacts/TASK-0126/attempt-1 pnpm exec playwright test tests/e2e/party-summary.spec.ts tests/e2e/player-screen.spec.ts` (240 s).
- Capturas bajo `artifacts/TASK-0126/attempt-1/<spec>/screenshots/`.

# Riesgos

- No congelar la sesión por defecto antes del arranque: con `?test=1` debe seguir
  comportándose igual.
- Resetear cámara/cursor/animación al empezar para que la partida con N
  jugadores se pinte desde el spawn correcto.
- No crear listeners duplicados al reentrar al resumen; `destroy()` debe retirar
  el listener global y `replaceChildren` evita nodos muertos.
