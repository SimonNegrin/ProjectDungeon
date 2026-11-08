---
type: Task Brief Detail
title: "TASK-0017: detalle del intento 1"
description: Notas de implementación para EXP-002; no sustituye la tarea ni sus criterios.
task: TASK-0017
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:58:00Z }
---

# Lectura de la rejilla

“Rejilla de 13×13 tiles de 32 px” se refiere al **viewport** (416×416), como
`MAP_VIEWPORT` de `src/host/layout.ts`, no al mundo. Si el mundo midiera 13×13, la
cámara no tendría recorrido y el clamp nunca se vería. Usa un mundo mayor (por
ejemplo 20×20) con borde de muros y dibuja solo el recorte de 13×13. El E2E y las
capturas deben poder comprobar que el canvas mide 416×416 lógicos y que la cámara
se limita en el borde.

# Escenarios sugeridos

Son una sugerencia, no un criterio; mantén los requisitos de longitud, diagonal y
borde.

- **Corto (3 pasos rectos):** inicio `(5,5)`, pasos E, E, E; fin `(8,5)`. La
  cámara queda centrada todo el recorrido y no toca clamp.
- **Largo (6 pasos):** inicio `(8,9)`, pasos E, NE, E, E, SE, E; fin `(14,9)`.
  Incluye dos diagonales y termina con la cámara clampada a la derecha
  (`maxX = (20−13)×32 = 224`). El personaje deja de estar centrado en el viewport
  en el último tramo, que es justo lo que hay que enseñar.
- Un goblin estático fuera del camino puede servir de referencia visual; no hay
  combate ni IA. El jugador usa `KNIGHT_RECT`.
- La semilla decide las variantes de suelo (`floorTileFor`/`TILE_RECTS`) y debe
  quedar en la decisión. El camino no cambia con la semilla.

# Modelo y timeline

Separa la lógica pura del DOM/Canvas (`motion.ts` o equivalente) para poder
testearla con Vitest sin canvas:

- fases por paso: pausa en el tile actual (`pauseMs`) → transición
  (`stepMs` recto; `stepMs×√2` en velocidad constante, `stepMs` en duración
  constante) → pausa en el destino; se repite. La pausa del primer tile y la del
  destino no se omiten;
- `totalMs = Σ(stepDuration + pauseMs)`;
- `advance(dt)` reparte deltas grandes en subtramos (≤50 ms) sin saltarse fases ni
  pasos; deltas pequeños avanzan con la misma semilla el mismo estado;
- posición visual = interpolación lineal entre centros de tiles, redondeada a
  entero para dibujar; en diagonal la trayectoria es recta;
- cámara = `clamp(round(pos − viewport/2), 0, world − viewport)` con enteros;
- MP inicial 6; baja al completar cada paso (`mpLeft`), no al empezar ni de golpe
  al final; el estado pasa a `ready` tras la pausa del destino;
- `play()` reinicia desde el inicio y pasa a `playing`; `reset()` vuelve a `idle`;
  repetir desde `ready` es válido.

No uses `performance.now()` ni `Math.random()` en el modelo. En modo normal el
rAF puede llamar a `advance(dt)`; en `?test=1` no debe haber rAF y el avance lo
hace el E2E.

# UI y shell

- Mantén la estructura visual del shell: cabecera con pregunta, toolbar de
  semilla, panel de parámetros, escenario/canvas, métricas y panel de decisión.
  Reutiliza `_shell/styles.css` y, si encaja, `mountExperiment` con una sola
  variante. No edites `_shell/`.
- Parámetros mínimos: `preset` (A/B/C/personalizado), `scenario` (short/long),
  `stepMs` 40–250, `pauseMs` 0–200, `diagonal` (constant-speed /
  constant-duration). Los presets aplican 90/30, 125/50 y 160/75. Mover un slider
  debe mostrar `personalizado` y no dejar el preset anterior como activo.
- Añade `Recorrer`/`Repetir`, un HUD con estado (`idle`/`playing`/`ready`), paso,
  MP y duración total, y un aviso **Listo** al terminar. `Espacio` repite cuando
  está listo; durante `playing` se ignoran flechas/WASD/Espacio/Enter/F/E (no se
  encolan). `F1`/`R` no son necesarios en la maqueta.
- Cursor: no dibujes el cuadrado mientras `playing`; los puntos del camino se
  apagan al pisar cada tile. En `idle`/`ready` puede verse el cursor sobre el
  jugador.
- El panel de decisión no debe venir con una opción ganadora seleccionada:
  A/B/C/personalizado, notas y exportación. El JSON debe contener de forma
  inequívoca `stepMs`, `pauseMs`, `diagonal`, `preset`, `scenario`, `seed`,
  `notes` y `decidedAt` (puede ser top-level y/o dentro de `parameters`, como el
  shell). Incluye también `experiment` y `question`.
- Si usas `mountExperiment`, puedes complementar `window.__experiment` desde
  `main.ts` para añadir estado, paso, posición visual, cámara y avance; no
  dupliques la exportación si reutilizas `buildDecision`/`downloadJson`.

# API de test sugerida

`window.__experiment` debe permitir al E2E todo sin reloj real:

- `getParams()`, `setParams()`, `getSeed()`, `setSeed()`, `reset()`;
- `getState(): 'idle' | 'playing' | 'ready'`;
- `getScenario(): 'short' | 'long'`;
- `getStep(): number` (pasos completados);
- `getVisualPosition(): { x, y, tileX, tileY }` en píxeles de mundo enteros;
- `getCamera(): { x, y }` entero;
- `getTimeline(): { totalMs, elapsedMs, steps, diagonal }`;
- `play()`, `step(dt = 16)` (avance determinista), `getDecision()`.

`getParams()` debe devolver los valores efectivos (no solo el preset), y
`getDecision()` los valores actuales. En `?test=1&seed=...` dos ejecuciones con la
misma secuencia deben dar el mismo resultado.

# E2E (`tests/e2e/experiment-motion.spec.ts`)

- Viewport 1600×1200; `goto('/experiments/EXP-002-ritmo-movimiento/?test=1&seed=279837264')`,
  espera `window.__experiment`, sin errores de consola.
- Comprueba que `/experiments/?test=1` carga y lista EXP-002 sin romper el índice.
- Presets A/B/C y sliders; mueve `stepMs`/`pauseMs` y comprueba `personalizado`.
- Escenario corto: `play()`, avanza con `step()` hasta `ready`; 3 pasos, MP 3,
  posición final, cámara entera y centrada.
- Escenario largo: 6 pasos, al menos una diagonal; muestrea a mitad de un paso
  (`playing`, posición entre centros, cámara entera); al final cámara clampada y
  personaje descentrado; MP 0. Compara `totalMs` de velocidad constante y
  duración constante (la constante debe ser mayor).
- Exporta una decisión: elige B, notas, descarga el JSON y guárdalo en
  `artifacts/TASK-0017/attempt-1/decision-example.json`; valida los campos.
- Capturas en `artifacts/TASK-0017/attempt-1/screenshots/`: A, B, C con la misma
  semilla y escenario, y largo (a mitad y listo) con la cámara clampada. Adjunta
  al informe con `testInfo.attach`.
- No uses `waitForTimeout` para la animación; todo el avance va por API.

# Unitarios

Añade tests en `experiments/EXP-002-ritmo-movimiento/src/*.test.ts` (Vitest ya
incluye `experiments/**/*.test.ts`): presets y normalización, duración de paso
recto/diagonal en ambos modos, pausa por tile incluida la del destino, avance con
deltas grandes/pequeños, cámara con clamp y enteros, y determinismo del escenario.
No dupliques los tests del shell.

# Archivos previstos

- `experiments/EXP-002-ritmo-movimiento/index.html`
- `experiments/EXP-002-ritmo-movimiento/src/main.ts`
- `experiments/EXP-002-ritmo-movimiento/src/motion.ts` y `motion.test.ts`
- `experiments/EXP-002-ritmo-movimiento/src/render.ts` (si separas render)
- `experiments/EXP-002-ritmo-movimiento/src/experiment.css` (si hace falta)
- `experiments/EXP-002-ritmo-movimiento/experiment.md` (pasa
  `experiment_status` a `ready`; no rellenes la decisión)
- `experiments/manifest.ts` (entrada EXP-002, `status: ready`)
- `tests/e2e/experiment-motion.spec.ts`

# Presupuesto y cierre

El informe va a `artifacts/TASK-0017/attempt-1/report.md` con la plantilla. Deja
la tarea en `review`, no en `done`; no fusiones ni decidas el ritmo. Registra
desviaciones, problemas y fricción con evidencia y disposición `pending`.
