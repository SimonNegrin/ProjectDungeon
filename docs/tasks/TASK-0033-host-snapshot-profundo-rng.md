---
type: Task
id: TASK-0033
title: "Host: snapshot profundo y RNG de solo lectura"
description: Exponer el estado del RNG y clonar en profundidad equipo, modificadores e inventario para que las instantáneas sean serializables y no compartan referencias con el estado vivo.
status: stable
task_status: done
task_type: feature
requirement: REQ-010
requirement_ids: [T-002, T-003]
depends_on: [TASK-0026, TASK-0027]
unlocks: []
created_at: 2026-11-08T20:00:00Z
completed_at: 2026-11-08T20:02:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0033/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:00:00Z }
verified:
  - by: task-lead
    at: 2026-11-08T20:02:00Z
    note: >-
      Intento 1 verificado en task/TASK-0033: implementación 9ca8efa e informe
      aeee1c3. Diff completo revisado; verify OK (496 unitarios, docs/config y
      build) y test:e2e OK (63/63) re-ejecutados por el lead. Prueba de mutación:
      con `cloneUnit` vuelto a `{ ...unit }`, el test de mutación anidada falla
      (1/1); restaurado. Sin cambios en src/game, HUD, index.html, public,
      package.json ni dependencias; sin tests borrados, saltados ni debilitados.
---

# Objetivo

Cerrar la deuda de `TASK-0026` y `TASK-0027` sobre el snapshot:
`window.__game.snapshot()` debe ser una copia profunda y serializable, incluido
el RNG, para que tests y host no puedan mutar el estado vivo ni auditar el azar
con datos incompletos. No cambia juego, HUD ni reglas.

# Contexto

- `cloneUnit` en `src/host/debug.ts` hace `{ ...unit }`: `equipment`,
  `modifiers` y `weapons` comparten referencias con el estado.
- `GameSnapshot` expone `seed` del mapa, pero no `state.rng` (`seed` y `state`
  del contador de combate), aunque `T-002` pide exponerlo en solo lectura.
- Origen: fricción `deferred` de `TASK-0026` y `TASK-0027`. El motor ya guarda
  `rng`, equipo y modificadores de forma serializable en `src/game/types.ts`.
- No se toca el motor: el snapshot es presentación de depuración.

# Criterios de aceptación

- [x] `GameSnapshot` incluye `rng: { seed, state }`, clonado y actualizado tras
      cada comando; coincide con `state.rng` antes y después de atacar.
- [x] Cada unidad del snapshot clona `modifiers`, `equipment` y el array
      `weapons`; las armas del mapa ya clonadas siguen igual.
- [x] Mutar `rng.state`, `equipment.weaponId`, `modifiers.accuracy` o
      `weapons.push(...)` en una instantánea no cambia el estado; una instantánea
      nueva devuelve los valores originales.
- [x] El snapshot es serializable:
      `JSON.parse(JSON.stringify(snapshot))` conserva RNG, equipo y
      modificadores.
- [x] La API sigue siendo de solo lectura por tipos y no expone referencias
      mutables del estado vivo.
- [x] Tests en `tests/unit/host/debug.test.ts` cubren RNG, copia profunda,
      serialización y determinismo; no se debilitan tests existentes.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan; sin cambios en `src/game/`,
      `index.html`, `public/`, HUD ni dependencias.

# Plan de test

- **Unitario:** snapshot inicial y tras un ataque; RNG coincide con el estado;
  mutar cada campo anidado no afecta al motor; `JSON` round-trip.
- **Integración:** `window.__game.dispatch` de ataque y recogida actualiza
  `rng` y equipo del snapshot.
- **Regresión:** `pnpm test`, `pnpm run test:e2e` y `pnpm run verify`.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0033/attempt-1/report.md`.
- [x] Salidas de tests y `verify` en `attempt-1/`.
- [x] Commit SHA en la rama `task/TASK-0033`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/debug.test.ts` | 120 s |
| `pnpm run test:e2e` | 180 s |
| `pnpm run verify` | 180 s |

# Restricciones

- Solo `src/host/debug.ts`, tipos de snapshot y `tests/unit/host/debug.test.ts`;
  ajustes aditivos mínimos en specs si el tipo lo exige.
- No cambiar reglas, RNG, equipo, daño, turnos, HUD ni presentación.
- No exponer mutadores ni permitir escritura sobre el estado vivo.

# No objetivos

- Cambiar la forma del estado del motor o el algoritmo del RNG.
- Añadir comandos de debug nuevos.
- Mejorar el feedback visual (`TASK-0031`).
