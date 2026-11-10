---
type: Task Brief
title: "TASK-0057: brief del intento 2"
description: "Cerrar regresiones E2E del nuevo beat sin ampliar el alcance de feedback."
task: TASK-0057
attempt: 2
status: stable
brief_bytes: 3764
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T18:10:00Z }
---

# Objetivo

Cerrar las 8 regresiones que el lead encontró al ejecutar `pnpm run test:e2e`
tras el intento 1, manteniendo el alcance del brief original. No ampliar la
cobertura E2E de feedback (eso es TASK-0061): solo corregir el código y migrar
expectativas stale sin debilitarlas.

# Evidencia

`pnpm run test:e2e` del lead: 69 pasan, 8 fallan (salida en
`artifacts/TASK-0057/attempt-1/lead-e2e-output.txt`):

1. `combat-equipment-qa` «feedbacks de daño…»: el texto de daño no queda sobre el
   objetivo. **Hipótesis A (bug):** con un ataque sin movimiento, la animación no
   tiene pasos y `cameraAt`/`focusUnitId` cae al centro del mapa o a la última
   unidad, en vez de conservar la cámara actual; el feedback se coloca con esa
   cámara errónea.
2. `cursor-qa` «enemigo adyacente…»: `E` tras `F` no avanza el turno porque el
   beat de ataque descarta la intención. **Hipótesis B (expectativa stale):** el
   test debe completar la presentación (`settle`) antes de `E`.
3. `cursor-qa` «sin acción»: `Espacio` tras `F` se descarta y no muestra «Sin
   acción». Misma hipótesis B: completar el ataque antes de probar el rechazo.
4. `game-input-hud` «loop completo»: mismo caso que 2.
5. `motion-qa` «moverse sobre un enemigo»: mismo caso que 2.
6. `motion-qa` «fase enemiga…»: al congelar en `keydown`, el primer cue es
   `EnemyPhaseStarted` (400 ms) y aún no hay movimiento; `animation.unitId` cae
   a la última unidad. Migrar el muestreo para avanzar el pre-beat antes de
   afirmar el foco del primer `UnitMoved`, o corregir el fallback si la cámara
   salta.
7. `perception-alarm-qa` y 8. `perception-host-qa`: esperan el aviso de alarma
   inmediatamente al despachar. REQ-017/TASK-0057 lo retrasan a su cue: migrar a
   `settle`/avance hasta el cue antes de leer el aviso; no volver a adelantarlo.

# Invariantes

- No toques `src/game/`, `experiments/`, dependencias, requisitos ni docs.
- `MOTION_CONFIG` sigue 125/70; `FEEDBACK_CONFIG` sigue siendo la única fuente.
- La cámara no debe saltar al centro del mapa ni a otra unidad cuando la
  animación no tiene movimiento activo: conserva la cámara actual hasta que
  empiece el primer paso o el cue correspondiente.
- Mantén el bloqueo/descarte de input, el retraso del estado y el aviso de alarma
  en su cue. No los desactives para que pasen los tests.
- No borres, saltes ni debilites tests; migra expectativas y conserva sus
  aserciones semánticas.

# Criterios de aceptación

Los mismos de `docs/tasks/TASK-0057-nucleo-feedback-timeline-estado.md#criterios-de-aceptación`.
Añadido de verificación: `pnpm run test:e2e` completo en verde.

# Contexto mínimo

- `src/host/motion.ts` (`cameraAt`, `focusUnitId`, `activeCues`),
  `src/host/main.ts` (`render`, `fireFeedbacks`, `animationSnapshot`).
- Specs afectadas: `tests/e2e/combat-equipment-qa.spec.ts`,
  `cursor-qa.spec.ts`, `game-input-hud.spec.ts`, `motion-qa.spec.ts`,
  `perception-alarm-qa.spec.ts`, `perception-host-qa.spec.ts`.
- `tests/e2e/support.ts`: `settle` y `dispatch`.
- Informe y salidas del intento 1 en `artifacts/TASK-0057/attempt-1/`.

# Artefactos

`artifacts/TASK-0057/attempt-2/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `logs/`. Commit SHA en la rama
`task/TASK-0057`.

# Comandos

`pnpm exec vitest run tests/unit/host` (180 s), `pnpm run test:e2e` (300 s),
`pnpm run verify` (300 s). Nada de npm/npx. No dejes servidores ni procesos.
