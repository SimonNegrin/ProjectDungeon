---
type: Task Brief
title: "TASK-0019: brief del intento 1"
description: Cobertura E2E determinista y QA visual del movimiento animado de REQ-006.
task: TASK-0019
attempt: 1
status: stable
brief_bytes: 4088
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:20:00Z }
---

# Objetivo

Un spec nuevo `tests/e2e/motion-qa.spec.ts` demuestra, con semilla fija y reloj
congelado, que el recorrido animado se ve, la cámara sigue, el input se ignora y
el estado final coincide con el motor; con capturas revisadas en
`artifacts/TASK-0019/attempt-1/screenshots/`.

# No objetivos

- Reimplementar la animación ni duplicar la timeline en el spec.
- Cambiar reglas, ritmo, comportamiento de producción o tests existentes.
- Tocar `docs/requirements/`, `experiments/`, `package.json` ni el lockfile.

# Invariantes

- `src/game/` intacto. Sin dependencias nuevas. Tests existentes intactos.
- Semilla `279837264` (`/?seed=...`); nada de `waitForTimeout` a ciegas.
- **Reloj determinista:** tras la tecla, congela en el mismo `keydown` con un
  listener de test que llame `window.__game.advance(0)` (registrado después del
  listener del juego, fase burbuja). Sin frame intermedio, `advance(ms)` es exacto.
- Semántica: `snapshot().players/enemies/phase` son el **estado final del motor**;
  lo presentado vive en el HUD DOM, `snapshot().animation` y `snapshot().cursor`.
  No uses el snapshot del motor para afirmar “aún no ha pasado”.
- `settle`/`advance(1_000_000)` completan la presentación.
- HUD: `hud-player-mp`, `hud-phase`, `hud-enemy-hp`; overlay
  `overlay-victory`/`overlay-defeat`; cursor `cursor`, puntos
  `cursor-path-point`; flash `attack-flash`, daño `damage-feedback`.

# Criterios de aceptación

Los de `docs/tasks/TASK-0019-e2e-movimiento-animado.md#criterios-de-aceptación`.
Cúbrelos todos, incluidos comandos E2E, repetición y capturas.

# Contexto mínimo

- `docs/requirements/REQ-006-movimiento-animado.md`: R-001…R-013, T-005…T-008.
- `src/host/motion.ts`: `MOTION_CONFIG` (125/70, diagonal constante); reutiliza la
  config, no copies la interpolación.
- `src/host/main.ts`: congelación, `presentationState`, HUD/cursor y feedback.
- `src/host/debug.ts`: forma de `animation` y `cursor` en el snapshot.
- `tests/e2e/support.ts`: `snapshot`, `settle`, `moveCursorTo`, `approachEnemy`,
  `ensureAdjacentWithMp`, `moveAwayFromEnemy`.
- Patrones: `tests/e2e/cursor-qa.spec.ts` (ataque, victoria, enemigo) y
  `tests/e2e/generated-map-qa.spec.ts` (carga y capturas). Guía
  `docs/harness/visual-qa.md`.

# Pistas verificadas (semilla 279837264)

- Jugador (6,8), MP 6; cámara (0,64). (7,8), (8,8), (9,8) dan caminos de 1–3
  pasos. (5,8) es 1 paso con clamp oeste (`camera.x=0`, sprite descentrado).
- Camino largo de 6 pasos: destino (4,2) (el cursor cruza muros), MP final 0.
- `E` inicial mueve al goblin (23,28)→(24,28): `EnemyPhaseStarted` + `UnitMoved`
  + `PlayerTurnStarted`.
- Moverse sobre un enemigo adyacente ataca al final del último paso **y su pausa**
  (70 + 195·n ms). `prefers-reduced-motion: reduce` con `page.emulateMedia` antes
  de `goto`: instantáneo, mismo estado final.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 240 s |
| `pnpm run test:e2e --repeat-each=3` (spec nuevo) | 300 s |
| `pnpm run verify` | 180 s |

# Artefactos

- `artifacts/TASK-0019/attempt-1/report.md` según `docs/templates/task-report.md`.
- `test-output.txt` (suite y repetición), `verify-output.txt`, `logs/`,
  `screenshots/`: `step-intermediate`, `arrival`, `enemy-phase`,
  `attack-after-walk`, `reduced-motion`.
- Commit en `task/TASK-0019` y SHA en el informe.

# Riesgos y decisiones abiertas

- Carrera tecla→frame: resolver con la congelación síncrona; si no basta, añade el
  hook mínimo de debug, documéntalo y justifícalo.
- Si el fallo es de producción, no lo tapes: deja `review` y escala con evidencia.
- Ejecutar E2E reescribe capturas de tareas previas: revierte rutas ajenas
  (`git checkout -- artifacts/TASK-0007 ...`) y conserva solo las de este intento.
