---
type: Task
id: TASK-0045
title: "Motor: spawn de grupo, enemigos y salida compartidos"
description: Promocionar la selección de spawn, el reparto de enemigos y la salida de EXP-004 al core, y adaptar BSP al nuevo spawn sin cambiar sus 4 enemigos.
status: stable
task_status: ready
task_type: feature
requirement: REQ-012
requirement_ids: [R-001, R-002, R-003, R-004, R-006, R-007, R-008, R-009, R-011, R-014, R-015, T-001, T-002, T-003, T-004, T-005, T-006]
depends_on: [TASK-0044]
unlocks: [TASK-0046]
created_at: 2026-11-09T15:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0045/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
---

# Objetivo

Que el core coloque el grupo alrededor del acceso, reparta enemigos por
superficie y jugadores, marque interiores y emboscadas, y elija una salida única
según [REQ-012 v4](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos)
y [REQ-013 v2](../requirements/REQ-013-entrada-salida-exploracion.md#requisitos-creativos).
BSP adopta el mismo contrato de spawn y conserva sus 4 enemigos.

# Contexto

- Referencia: `experiments/EXP-004-salas-irregulares/src/spawn.ts`, `exit.ts` y
  `generate.ts`.
- Modelo: `TASK-0043`; geometría y puertas: `TASK-0044`.
- El tile y el acceso de salida se reservan antes de enemigos y decoración.

# Criterios de aceptación

- [ ] La sala de spawn es la más protegida; en empate evita la mayor si otra
      admite 6 huecos. `party[0]` es el acceso y el resto queda a Chebyshev ≤2,
      con componentes adyacentes ≤2 y fallback avisado a radio 3 o sala completa.
- [ ] La sala de spawn no recibe enemigos y ninguno empieza con línea de visión a
      un hueco de spawn.
- [ ] `T = ceil(0,02 × N) + ceil(1,2 × 6)` con 6 jugadores por defecto; en 22×18
      queda en 10-12. El reparto es proporcional al área con mínimo 1 por sala
      no-spawn y tipos 60/20/20.
- [ ] Los enemigos prefieren celdas interiores, permiten parejas con componente
      global ≤2 y usan puntos calientes con `hiddenEnemyChance` 0,25 sin superar
      `T`.
- [ ] Hay exactamente una entrada y una salida. La salida está en una sala
      no-spawn a distancia de grafo ≥2, preferiblemente la más lejana; `door`
      usa el borde y no abre paso, las escaleras usan suelo y `random` es estable.
- [ ] El tile y el acceso de la salida no reciben enemigos, spawn, armas ni
      decoración; los fallbacks emiten `warnings`.
- [ ] BSP usa el nuevo contrato de spawn (6 huecos, sin enemigos en spawn, sin
      visión inicial) y conserva 4 enemigos en salas distintas.
- [ ] Todo es puro, determinista y serializable; no usa `Math.random` ni DOM.
- [ ] `pnpm run verify` pasa sin borrar, saltar ni debilitar tests.

# Plan de test

- **Unitario:** protección de spawn, empate, 6 huecos, componentes, fórmula con
  factores a 0 y `P` 1-6, reparto, tipos, interior, emboscadas 0/1, salida,
  reserva y fallbacks.
- **Barrido:** 200 semillas de `growth` sin incidencias y BSP con su semilla de
  referencia.
- **Regresión:** `REQ-009` (4 enemigos, pareja y aislado) y tests de BSP.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0045/attempt-1/report.md`.
- [ ] Tests, `pnpm run verify` y barrido en `attempt-1/`.
- [ ] Commit SHA en `task/TASK-0045`.

# Restricciones

- No crear todavía `variants/growth.ts` ni cambiar el defecto.
- No cambiar bestiario, percepción, alarma, IA ni combate.
- No añadir salida a BSP; `REQ-013` la limita al generador denso en este corte.
- No tocar `src/host/`, `experiments/` ni dependencias.

# No objetivos

- Variante y default (`TASK-0046`), host (`TASK-0048`), bundle (`TASK-0047`) y
  QA (`TASK-0049`).
- Cámara secreta, transición de nivel, cooperativo o persistencia.
