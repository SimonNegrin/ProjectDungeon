---
type: Task Brief
title: "TASK-0061: brief del intento 1"
description: E2E completo y QA visual determinista de todas las familias, reducido y deuda de advance.
task: TASK-0061
attempt: 1
status: stable
brief_bytes: 3269
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T22:05:00Z }
---

# Objetivo

Cerrar la evidencia E2E y visual de REQ-017: cada familia observable en su pico
con `advance(ms)`, suite completa sin regresiones, capturas 1280×720 legibles y
`prefers-reduced-motion` sin animación pero con la misma información y orden.

# No objetivos

- Cues nuevos, cambios de reglas, efectos, `FEEDBACK_CONFIG` o arte.
- Playtest de sensación (usuario), dependencias nuevas, `experiments/` ni
  `src/game/`.

# Invariantes

- `src/game/` intacto; `pnpm` con timeouts explícitos.
- No borres, saltes ni debilites tests; migra expectativas obsoletas a
  `advance(ms)`/cue observable conservando su intención.
- Sin esperas de reloj real; mismo estado final y orden de eventos.
- `docs/**` es del lead: no lo edites; reporta deltas documentales.

# Criterios de aceptación

Viven en [TASK-0061](../../../docs/tasks/TASK-0061-e2e-qa-visual-feedback.md#criterios-de-aceptación).
Enlazar; no copiar.

# Contexto mínimo

- Cubiertos: impacto/fallo/muerte/cadáver (`feedback-combat-qa`), inventario,
  percepción, fases, fin, reinicio y rechazo (`feedback-inventory-perception-qa`),
  fuera de pantalla/reducido (`enemy-phase-offscreen-qa`).
- Huecos: `EnemyReturned` (`zzz`), `EnemyWaited` (`...`), `PlayerTurnStarted` y
  reducido con comparación de orden y texto/banner/marca.
- Apoyo: `support.ts` (`dispatchFrozen`, `advanceToCue`, `settle`),
  `perception-fixtures.ts`, `perception-alarm-qa`, `flee-behavior-qa`.
- Deuda TASK-0058: `src/host/main.ts` `advanceForTest` (~705) ignora la
  persistencia cuando no hay animación.
- Duraciones: `src/host/feedback-config.ts`.

# Decisión técnica del lead

- Arregla `advanceForTest`: con `animation === null`, reloj manual, cancela el rAF
  de textos y consume `advanceTransientFeedback(ms)` antes de renderizar;
  `advance(0)` no consume. Regresión E2E: texto visible al terminar la animación,
  visible tras `advance(0)`, oculto tras `advance(texts.damageMs + margen)`.
- Cubre `returned`/`waited`/`player-turn` con estados controlados y `advanceToCue`.
- Reducido: emula `reducedMotion: 'reduce'`; `animating === false`, texto/banner/
  marca estáticos, sin sacudida/fundido y mismo orden de `events.map(type)`.
- Capturas: `E2E_ARTIFACTS_DIR=artifacts/TASK-0061/attempt-1`; copia las
  definitivas a `attempt-1/screenshots/`. Pico de cada familia a 1280×720; para
  grises aplica `filter: grayscale(1)` y captura impacto y fallo (texto y
  `data-result` deben distinguirlos). Demuestra rejilla/cursor/camino con feedback
  persistente y cursor ya visible.
- Ejecuta la suite completa. `--repeat-each=3` en alarma, huida y muerte.

# Artefactos

`artifacts/TASK-0061/attempt-1/{report.md,test-output.txt,verify-output.txt,e2e-*.txt,playtest.md,screenshots/,logs/}`.

# Riesgos

- Cada criterio necesita aserción; la captura no es la única prueba.
- Distingue expectativa obsoleta de regresión real al migrar tests.
- `playtest.md`: qué mirar, qué ajustar y qué no cambia.
