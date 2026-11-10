---
type: Task Brief
title: "TASK-0057: brief del intento 3"
description: "Completar FEEDBACK_CONFIG con las duraciones de persistencia y disolución de REQ-017."
task: TASK-0057
attempt: 3
status: stable
brief_bytes: 2330
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T18:25:00Z }
---

# Objetivo

Cerrar el hueco del criterio 1 de la ficha: `FEEDBACK_CONFIG` debe contener
**todas** las duraciones de REQ-017, no solo los beats. No cambies
comportamiento, reglas, timeline, estado ni tests de intención; solo configuración
y las aserciones que la leen.

# Evidencia

El informe del intento 2 da el criterio por cubierto, pero la configuración no
incluye estas duraciones de persistencia/disolución que REQ-017 sí fija:

- `deathDissolveMs: 300` (R-008; la disolución de la muerte).
- `fledPersistMs: 600`, `returnedPersistMs: 500`, `waitedPersistMs: 400`
  (matriz, columna Persistencia).
- `enemyPhaseBannerMs: 800` y `playerTurnBannerMs: 700` (matriz; `texts.bannerMs`
  solo cubre 800 y no el banner de 700).
- Revisa también `alarmBannerMs`/`rejectedNoticeMs`: hoy `alarmNoticeMs` y
  `noticeMs` valen 1600; si los mantienes, deja claro que cubren ambos usos.

# Invariantes

- No toques `src/game/`, `experiments/`, `index.html`, dependencias, requisitos
  ni `docs/**`.
- No cambies beats, `MOTION_CONFIG` 125/70, timeline, estado intermedio, input
  ni E2E; el comportamiento ya verificado debe quedar idéntico.
- Sin números mágicos nuevos en el host: los valores viven solo en
  `FEEDBACK_CONFIG`.
- No borres, saltes ni debilites tests. Añade aserciones de configuración.

# Criterios de aceptación

Los de `docs/tasks/TASK-0057-nucleo-feedback-timeline-estado.md#criterios-de-aceptación`.
Verificación añadida: `pnpm run test:e2e` sigue 77/77.

# Contexto mínimo

- `src/host/feedback-config.ts`.
- `tests/unit/host/presentation-feedback.test.ts` (bloque «FEEDBACK_CONFIG»).
- REQ-017 R-008, R-015, R-016, R-019 y la matriz evento → feedback.
- `artifacts/TASK-0057/attempt-2/report.md`.

# Artefactos

`artifacts/TASK-0057/attempt-3/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`. Commit SHA en `task/TASK-0057`.

# Comandos

`pnpm exec vitest run tests/unit/host` (180 s), `pnpm run test:e2e` (300 s),
`pnpm run verify` (300 s). Nada de npm/npx.
