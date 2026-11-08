---
type: Task
id: TASK-0027
title: "Motor y host: equipo, armas del mapa y recogida"
description: Colocar el hacha y la daga por semilla, recogerlas con G por 1 MP y cambiar entre tres armas con 1-3 sin coste.
status: stable
task_status: done
task_type: feature
requirement: REQ-010
requirement_ids: [R-003, R-004, R-005, R-006, R-011, T-003, T-004, T-007, T-010]
depends_on: [TASK-0026]
unlocks: [TASK-0029]
created_at: 2026-11-08T17:31:45Z
completed_at: 2026-11-08T18:26:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0027/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-08T18:26:00Z
    note: >-
      Intento 1 verificado en task/TASK-0027: implementación d4ea408, informe y
      evidencias f69b844. Diff completo revisado; `pnpm run verify` OK (460
      tests, 138 documentos, build) y `pnpm run test:e2e` OK (55/55). Comprobación
      extra del lead: 64 semillas con dos armas válidas y recogida/cambio sobre
      el mapa generado. Sin tests borrados o debilitados y sin cambios fuera de
      alcance; el snapshot queda para TASK-0029.
---

# Objetivo

Que el jugador empiece con la espada y pueda recoger un hacha y una daga
colocadas de forma determinista en salas distintas, con `G` por 1 MP y cambio
gratuito entre tres huecos con `1`-`3`, según
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos)
R-003 a R-006 y T-003/T-004/T-007.

# Contexto

- Motor de combate y catálogo: `TASK-0026`; estado en `src/game/types.ts` y
  `engine.ts`; mapa en `map.ts`/`bsp.ts`; input en `src/host/input.ts`.
- Semilla de referencia: `279837264`.
- No se implementa HUD, dibujo de armas ni feedback: pertenecen a `TASK-0029`.

# Criterios de aceptación

- [x] El hacha y la daga son entidades de mapa con ID, posición y arma; su
      colocación se deriva de la semilla y del mapa, cae en salas distintas,
      fuera de la sala inicial, es alcanzable y no ocupa muro, puerta ni
      aparición.
- [x] La misma semilla coloca las armas en las mismas posiciones y otra semilla
      las cambia; no se usa `Math.random`.
- [x] `G` sobre un arma la recoge, gasta 1 MP, no consume la acción, la equipa
      sola y la elimina del mapa; con 0 MP se rechaza; recoger dos veces no
      duplica.
- [x] `1`-`3` cambia de arma sin gastar MP ni acción; el inventario tiene tres
      huecos y no admite una cuarta arma.
- [x] El jugador empieza con la espada equipada; el enemigo no recoge objetos ni
      cambia de arma. El estado y el snapshot son serializables y de solo
      lectura.
- [x] La recogida y el cambio conservan el resto de reglas de turno, combate y
      victoria/derrota; no se debilitan tests existentes.
- [x] `pnpm run verify` pasa; sin dependencias nuevas; `src/game/` sigue puro.

# Plan de test

- **Unitario:** colocación determinista, exclusiones, `G` con y sin MP, acción
  intacta, auto-equipo, borrado del mapa, no duplicados, tres huecos y cambio
  gratuito con `1`-`3`.
- **Integración:** `reduce` de recogida y cambio con snapshot; dos ejecuciones
  con la misma semilla; ataque con el arma recién equipada.
- **Regresión:** `pnpm test` y `pnpm run verify`; tests de movimiento y turno
  sin cambios de intención.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0027/attempt-1/report.md`.
- [x] Salidas de tests, `verify` y E2E en `attempt-1/`.
- [x] Commit SHA en la rama `task/TASK-0027` (`d4ea408`, `f69b844`).

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/map.test.ts tests/unit/game/engine.test.ts tests/unit/host/input.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `pnpm run test:e2e` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No tocar `src/host/` salvo el mapeo mínimo de teclas `G` y `1`-`3`; el HUD y
  el dibujo de armas son de `TASK-0029`.
- No implementar bestiario, percepción, alarma ni huida.
- No añadir loot, cofres, comercio, durabilidad, peso ni una cuarta arma.

# No objetivos

- HUD, pistas de `G` y feedback visual (`TASK-0029`).
- E2E y QA visual completos (`TASK-0030`).
- Cambiar la generación del mapa más allá de las posiciones de las armas.

# Verificación

`task-lead` revisó el diff completo y re-ejecutó `pnpm run verify` (460 tests,
138 documentos, config y build) y `pnpm run test:e2e` (55/55). Añadió una
comprobación independiente: 64 semillas generan dos armas válidas (salas
distintas, fuera de la inicial, alcanzables y sin muro/puerta/aparición) y la
recogida/cambio funciona sobre el mapa real de la semilla `279837264`. No se
borraron, saltaron ni debilitaron tests; no hay cambios fuera de alcance ni
dependencias nuevas. El snapshot no expone aún las armas porque `TASK-0029` es
su dueño; el estado es serializable y de solo lectura. La fricción del aviso de
handoff >2,5 KB se rechaza: es una política documentada y no bloquea.
