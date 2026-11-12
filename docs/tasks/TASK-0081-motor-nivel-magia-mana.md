---
type: Task
id: TASK-0081
title: "Motor: nivel de magia y maná por turno"
description: "Migrar la magia a un nivel único 0–4 por personaje y añadir maná máximo nivel × 4 que se recarga al inicio de cada turno, con niveles del roster y enemigos sin magia."
status: stable
task_status: done
task_type: feature
requirement: REQ-025
requirement_ids: [R-001, R-003, R-004, T-001, T-005, T-008, T-009, T-010]
depends_on: [TASK-0080]
unlocks: [TASK-0082]
created_at: 2026-11-12T14:55:00Z
completed_at: 2026-11-12T23:35:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0081/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:55:00Z }
verified:
  - by: task-lead
    at: 2026-11-12T23:35:00Z
    note: >-
      Verificación independiente en `task/TASK-0081` (código `5dab41c`, informe
      `929e10e`, docs y verificación `81043b3`, merge `f3363c4`). Diff completo
      revisado: solo `src/game/`, `src/host/debug.ts`, tests, arquitectura y
      artefactos; `package.json`, `pnpm-lock.yaml`, acciones, réplica y MP
      intactos. `pnpm run verify` re-ejecutado OK (1054/1054, docs, config, tsc,
      build y bundle), `docs:check` OK (410 documentos, 84 tareas) y
      `pnpm run test:e2e` OK (112/112, extra). Criterios comprobados: nivel único
      0–4 sin `MagicSchool`/`stats.magia`; maná 0/4/8/12/16 con fórmula única y
      separado del MP; recarga al inicio del turno solo en vivas; roster Mago 4,
      Clérigo 3, Guerrero mágico 2, Cocinero 1 y enemigos 0; snapshot/debug
      clonan `mana` y la serialización conserva ambos campos; tests migrados sin
      debilitar aserciones y `mana.test.ts` cubre nivel 0, recálculo, recarga,
      gasto entre turnos y determinismo. Sin contradicciones operativas en
      REQ-014/015/021; arquitectura matizada a `UnitStats.magicLevel` y
      `mana.ts`. Los dos `verify` fallidos del runner fueron el flake de
      `EXP-004/spawn.test.ts`, que no se reprodujo en la re-ejecución; queda como
      fricción `deferred`. Sin decisión creativa abierta.
---

# Objetivo

Que cada personaje tenga un `magicLevel` entero de 0 a 4 y un maná
`{ current, max }` con `max = nivel × 4`, separado del MP, que se recarga
completo al inicio de su turno. No hay hechizos todavía.

# Contexto

- `src/game/types.ts`: hoy `MagicLevel` es 1–4 por familia y
  `UnitStats.magia` es `MagicSchool[]`; `Unit` no tiene maná.
- `src/game/roster.ts`: nueve arquetipos con `stats.magia` vacío y un texto
  `magic` de identidad. Niveles acordados: Mago 4, Clérigo 3, Guerrero mágico 2,
  Cocinero 1; el resto 0.
- `src/game/bestiary.ts`: los tres tipos declaran `stats.magia: []`; pasan a
  `magicLevel: 0` y maná 0.
- `src/game/turn.ts`: `restorePlayerTurn` y `restoreEnemyTurn` restauran MP y
  acciones; el maná se une a esa restauración.
- `src/host/debug.ts` y el snapshot profundo copian `stats.magia`; se adaptan.
- [REQ-025](../requirements/REQ-025-magia-hechizos-mana.md) y
  [ADR-019](../decisions/ADR-019-magia-mana-hechizos.md).
- Depende de `TASK-0080` por secuencia del milestone: la magia empieza cuando
  la réplica está cerrada.

# Criterios de aceptación

- [ ] `UnitStats.magicLevel` es un entero 0–4; desaparecen `MagicSchool` y
      `stats.magia` como fuentes de verdad. Nivel 0 significa sin magia.
- [ ] `Unit.mana` guarda `{ current, max }`; `max = magicLevel × 4` con una única
      fórmula (0/4/8/12/16) y no se confunde con MP. Cambiar el nivel recalcula el
      máximo.
- [ ] Al empezar el turno de una unidad viva, el maná vuelve a `max` junto a MP y
      acciones; el gasto no persiste entre turnos. Un nivel 0 tiene maná 0.
- [ ] Roster y bestiario declaran los niveles acordados; los enemigos no tienen
      magia en este corte.
- [ ] Serialización, snapshot y debug exponen `magicLevel` y maná actual/máximo;
      ninguna prueba depende de `stats.magia`.
- [ ] Tests de migración, máximos 0/4/8/12/16, recarga por turno, nivel 0,
      recálculo y determinismo; tests de `REQ-014`, `REQ-015` y `REQ-021`
      conservan su intención. `pnpm run verify` pasa.
- [ ] Glosario y arquitectura recogen el nivel único y el maná; se verifica que
      `REQ-014`, `REQ-015` y `REQ-021` no contradicen la implementación;
      `docs:check` pasa.
- [ ] Sin catálogo de hechizos, lanzamiento, HUD nuevo ni cambios de balance.

# Plan de test

- Unitario: fórmula de maná máximo, nivel 0, recarga al inicio de turno, gasto
  simulado y recálculo al cambiar de nivel.
- Integración: turno jugador → enemigo restaura MP, acciones y maná sin arrastre.
- E2E / visual: no aplica; el HUD de magia llega en `TASK-0083`.
- Manual: inspeccionar el debug de Mago y Cocinero con 16/16 y 4/4.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0081/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y `docs:check`
- [ ] Commit SHA en la rama `task/TASK-0081`

# Restricciones

- No implementar hechizos, curación, resurrección ni proyectiles mágicos.
- No tocar el contador de acciones ni la réplica.
- No añadir dependencias.

# No objetivos

- Catálogo y resolvedor (`TASK-0082`).
- HUD, input y feedback de hechizos (`TASK-0083`).
- Progresión o aprendizaje de magia.
