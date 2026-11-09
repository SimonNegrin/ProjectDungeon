---
type: Task
id: TASK-0047
title: "Arnés: build de producción separado y guarda de bundle"
description: Separar el build de juego del de experimentos y añadir una comprobación que falle si el bundle de producción contiene variantes no elegidas o marcadores de BSP/plantillas.
status: stable
task_status: done
task_type: harness
requirement: REQ-011
requirement_ids: [T-015, T-016]
depends_on: [TASK-0046]
unlocks: [TASK-0049]
created_at: 2026-11-09T15:30:00Z
completed_at: 2026-11-09T17:14:41Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0047/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-09T17:14:41Z
    note: >-
      Intento 1 verificado en task/TASK-0047 (código 35d6eb0, evidencia fcea5f3,
      verificación c21d318; fusión 08e97e3). Lead re-ejecutó `pnpm run verify`
      (721/721 tests, docs/config, build y guarda), `build`, `build:experiments`
      (dist-experiments aislado), guarda positiva y negativa fuerte: import
      temporal de BSP con retención en globalThis subió el bundle de 106,91 a
      144,87 kB, la minificación borró los literales y la guarda falló por el
      grafo con `BSP module in production graph at src/game/bsp.ts`; cambio
      revertido byte a byte. Dev sirvió `/`, `/experiments/` y EXP-004 con 200.
      Diff revisado: solo configuración de build, guarda, scripts, README,
      tsconfig, test nuevo y artefactos; sin cambios de generador/host ni tests
      debilitados. AC 1-6 cumplidos. E2E sigue rojo por fixtures BSP 32×32
      preexistentes de TASK-0046, reproducido también en `main`; se difiere a
      TASK-0048/0049 y no es regresión de este intento.
---

# Objetivo

Que `pnpm run build` genere solo el juego con `growth` y que una comprobación
automática impida que vuelvan al bundle `buildBsp`, `pickTemplate`, los entry
points de `experiments/` o las variantes descartadas.

# Contexto

- [ADR-013](../decisions/ADR-013-generador-produccion-por-variante.md).
- `vite.config.ts` incluye hoy todos los `experiments/*/index.html` como entradas
  del mismo build.
- La comparación A/B/C se queda en `EXP-004` y en el servidor de desarrollo.

# Criterios de aceptación

- [ ] `pnpm run build` construye solo el entry de producción (`index.html` →
      `src/host/main.ts`) y no incluye `experiments/`.
- [ ] Existe un comando separado (`build:experiments` o equivalente) que
      construye los experimentos sin contaminar el bundle de juego.
- [ ] Una comprobación automática (`check:bundle`, test de CI o script de build)
      falla si `dist/` contiene `buildBsp`, `pickTemplate`, `EXP-004` o chunks de
      `bsp`/`templates`; el mensaje indica el marcador encontrado.
- [ ] La comprobación se ejecuta después del build y forma parte de `verify` o
      de un comando documentado que el lead pueda re-ejecutar.
- [ ] `pnpm run dev` sigue sirviendo los experimentos en desarrollo.
- [ ] `pnpm run docs:check`, `pnpm run test`, `pnpm run build` y la guarda pasan;
      sin dependencias nuevas.

# Plan de test

- **Build:** ejecutar `build` y `build:experiments` por separado y comprobar las
  entradas de cada salida.
- **Guarda positiva:** el bundle real de `growth` pasa sin marcadores.
- **Guarda negativa:** un import temporal de `buildBsp` o un entry de
  experimento hace fallar la comprobación; se revierte.
- **Regresión:** E2E de humo y `verify` siguen pasando.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0047/attempt-1/report.md`.
- [ ] Salidas de build, guarda positiva y negativa en `attempt-1/`.
- [ ] Commit SHA en `task/TASK-0047`.

# Restricciones

- No cambiar el comportamiento del generador ni del host.
- No borrar experimentos ni dejar de servirlos en desarrollo.
- No añadir dependencias; usar scripts y Node/Vite existentes.
- No silenciar la guarda con listas de permitidos amplias.

# No objetivos

- Selector de generador en runtime.
- Promocionar BSP o plantillas.
- QA visual (`TASK-0049`).
