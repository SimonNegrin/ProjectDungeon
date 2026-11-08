---
type: Task Brief Detail
title: "TASK-0018: contrato técnico del intento 1"
description: Módulos, timeline, overrides de render, input, debug y estrategia de tests.
task: TASK-0018
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:05:00Z }
---

# Reparto

- `src/host/motion.ts` (nuevo): modelo puro de presentación. Sin DOM, Canvas,
  `performance.now`, `requestAnimationFrame` ni `Math.random`.
- `src/host/main.ts`: orquestación, bucle rAF, gate de input, render con
  overrides, feedback secuenciado, cierre de animación y debug.
- `src/host/renderer.ts`: acepta posiciones visuales por unidad y dibuja el
  sprite centrado en ellas; mantiene clip, `imageSmoothingEnabled = false` y el
  resto del render intacto.
- `src/host/debug.ts`: añade el estado de presentación y `advance(ms)`.
- `src/host/input.ts`: gate de animación o wrapper equivalente; sin cambiar el
  mapeo existente en reposo.
- Tests unitarios en `tests/unit/host/motion.test.ts` (nuevo) y ampliaciones
  mínimas de `renderer`, `debug`, `input`, `hud` y `session` si aplica.

# Modelo de timeline (motion.ts)

Configuración única exportada, por ejemplo:

```ts
export const MOTION_CONFIG = {
  stepMs: 125,
  pauseMs: 70,
  diagonal: 'constant-duration',
} as const;
```

Tipos mínimos:

- `MotionStep`: `unitId`, `from`, `to`, `dx`, `dy`, `diagonal`,
  `durationMs`, `startMs`, `endMs`, `pauseEndMs`, `mpAfter`.
- `MotionPhase`: pausa (`tile`, `unitId`, `stepIndex`) o transición (`from`,
  `to`, `unitId`), con `startMs`/`endMs`.
- `MotionTimeline`: `steps`, `phases`, `events` (`{ atMs, event }`),
  `totalMs`, `focusUnitIds`, `stepCount`.
- `buildMotionTimeline(events: readonly GameEvent[]): MotionTimeline`.

Construcción:

1. Recorre los eventos en orden con un reloj `clock`.
2. `UnitMoved` del mismo `unitId` y contiguo (`from` == `to` anterior) forma un
   grupo: una pausa inicial de 70 ms en `from`, y por cada paso transición de
   125 ms + pausa de 70 ms en `to`. Así `n` pasos producen exactamente `n + 1`
   pausas.
3. Un `UnitMoved` de otra unidad o no contiguo abre grupo nuevo con su propia
   pausa inicial. La fase enemiga puede tener varios grupos; cada uno se anima
   en orden.
4. Los eventos que no son `UnitMoved` se registran a `clock`, es decir, después
   de la pausa del último tile. `AttackPerformed`, `UnitDied` y `GameEnded`
   quedan por tanto después del último paso y su pausa; `PlayerTurnStarted`
   queda al final de la última animación.
5. Los eventos sin `UnitMoved` (ataque directo, rechazo, reinicio) producen
   `totalMs = 0` y se aplican de inmediato.
6. `visualPosition(timeline, elapsed, unitId)`: centro de tile en pausa,
   interpolación lineal recta (también diagonal) en transición, redondeo a
   entero. Devuelve también `tileX`/`tileY`.
7. `cameraAt(timeline, elapsed, world, viewport)`: centro del sprite enfocado
   menos medio viewport, redondeado y clampado con `clampCamera`. El foco es la
   unidad del grupo activo; si no hay grupo activo, la última unidad animada.
8. `presentationState(state, timeline, elapsed)`: estado derivado para HUD y
   render, sin mutar el del motor:
   - MP del jugador = `mpAfter` del último paso completado (o MP inicial
     reconstruido como `mp final + pasos`).
   - HP y muertes = estado final menos los eventos de ataque/muerte que aún no
     han ocurrido a `elapsed`.
   - `actionAvailable` del atacante = `false` desde su `AttackPerformed` hasta
     `PlayerTurnStarted`.
   - `phase`/`turn` según `EnemyPhaseStarted`/`PlayerTurnStarted` ya ocurridos.
   - `status` = `playing` hasta que ocurre `GameEnded`; después el estado final.
9. `completedSteps(timeline, elapsed)` y `currentStep` para debug y puntos del
   camino.
10. `advanceTimeline` debe avanzar en subtramos de 50 ms como máximo para que un
    delta grande no salte fases ni pasos. Determinista y sin reloj real.

# Render

- `renderScene` recibe un cuarto opcional con `positions` (mapa `unitId` →
  centro en píxeles enteros) o una estructura equivalente. Para unidades sin
  override usa la posición del estado.
- Dibuja el sprite con `dx = Math.round(centerX - size / 2)` y análogo en Y, con
  tamaño 32, sin suavizado. El clip actual del viewport se conserva.
- Usa `presentationState` para que una unidad que muere al final siga visible
  durante el recorrido y desaparezca en el evento de muerte.
- La cámara usada es la de presentación; el fondo, tiles, muros y orden de capas
  no cambian.
- El cursor DOM se oculta mientras `animating`; no lo dibujes en Canvas.

# Input y dispatch

- Con animación activa, `keydown` descarta flechas/`WASD`, `Espacio`/`Enter`,
  `F` y `E` sin encolar. `F1` sigue alternando debug; `R` cancela la animación y
  reinicia. El botón de reinicio usa el mismo camino que `R`.
- `F2` durante animación puede ignorarse; no lo uses para mutar la partida a
  medias.
- `window.__game.dispatch(command)`:
  1. si hay animación, la completa de inmediato (render final, eventos
     pendientes, overlay, cursor);
  2. aplica el comando;
  3. si el comando genera timeline, la inicia; devuelve el snapshot final del
     motor y los eventos.
- Un `Restart` cancela y limpia feedback/aviso/debug como hoy.

# Cursor

- Captura el `CursorStatus` previo al comando que inicia la animación.
- Durante el recorrido: cuadrado oculto, puntos del camino visibles según el
  plan previo y apagados/eliminados los pasos ya completados. Mantén el tono
  fuerte/atenuado original para los restantes.
- Al terminar: oculta los puntos, restaura el cursor y aplícalo al viewport con
  la cámara final. Si el evento incluía `PlayerTurnStarted`, recolócalo sobre el
  jugador como hoy. No recentres por mover.
- El snapshot expone el cursor oculto mientras anima; al acabar, su posición
  final.

# HUD, feedback y overlay

- HUD desde `presentationState`: MP por paso, HP de enemigo tras el ataque, fase
  y turno secuenciados, overlays solo cuando `GameEnded` ya ocurrió.
- El feedback de ataque se dispara al cruzar el `atMs` de `AttackPerformed`, con
  la cámara de presentación; no al aplicar el comando. Un solo disparo por
  evento. `prefers-reduced-motion` lo dispara de inmediato.
- El overlay de victoria/derrota no aparece antes de terminar la animación en
  curso. `GameEnded` es el último evento y la animación acaba en ese punto.

# Debug API

Amplía `GameSnapshot` con algo equivalente a:

```ts
readonly animation: {
  readonly animating: boolean;
  readonly step: number;
  readonly totalSteps: number;
  readonly unitId: string | null;
  readonly position: { x: number; y: number; tileX: number; tileY: number } | null;
  readonly camera: { x: number; y: number };
};
```

- `snapshot()` sigue siendo serializable y no muta el estado.
- `window.__game.advance(ms: number): GameSnapshot` avanza el reloj de
  presentación de forma determinista (mismos subtramos de 50 ms), procesa
  eventos y cierre, y devuelve el snapshot resultante. No expongas mutadores del
  estado vivo ni setters de la timeline.
- `prefers-reduced-motion`: detecta con `matchMedia` al arrancar; no hace falta
  reaccionar a cambios en caliente.

# Tests

- Unitarios de `motion`: timeline desde eventos con `from`/`to`/`mpLeft`;
  duración 125/70; `n + 1` pausas; diagonal 125; interpolación recta y diagonal
  con enteros; delta grande sin saltos; cámara centrada y con clamp; MP por
  paso; ataque después de la última pausa; fase enemiga secuenciada; fin de
  partida; reduced motion; determinismo.
- Host: gate de input (teclas descartadas, `F1`/`R` activos), `dispatch` que
  completa, renderer con override entero y muerte al final, snapshot/`advance`,
  HUD progresivo.
- E2E existentes: añade helper de asentamiento (`advance` grande o espera a
  `animation.animating === false`) en `tests/e2e/support.ts` y úsalo tras
  acciones que animan. No cambies las aserciones de intención. Los helpers
  `walkTo`/`approachEnemy` pueden terminar con asentamiento.
- Capturas de la nueva tarea: paso intermedio, llegada, fase enemiga y reduced
  motion. Para el paso intermedio usa `advance` hasta mitad de transición y
  captura; para reduced motion emula `reducedMotion: 'reduce'` antes de cargar.
- No añadas los E2E completos de movimiento de `TASK-0019`; solo lo necesario
  para no romper los existentes.

# Riesgos

- El E2E actual lee `snapshot()` tras pulsar tecla; el estado del motor ya es
  final, pero cursor/cámara/HUD pueden ir por detrás. Añade asentamiento antes
  de aserciones visuales.
- Evita que el bucle rAF siga vivo tras terminar; cancela el frame pendiente.
- No dupliques configuración de duraciones en tests: importa `MOTION_CONFIG`.
- No uses `performance.now` en `src/game/` ni acoples el motor al host.
