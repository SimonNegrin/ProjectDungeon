---
type: Task
id: TASK-0160
title: "Test: dividir el barrido de EXP-004 por variante"
description: "Eliminar el timeout intermitente de EXP-004 partiendo el barrido A/B/C × 200 semillas en tres tests, uno por variante, con timeout local documentado y sin reducir la muestra ni las aserciones."
status: stable
task_status: done
task_type: test
requirement: REQ-011
requirement_ids: [R-008, R-009]
depends_on: []
unlocks: []
created_at: 2026-11-15T10:45:04Z
completed_at: 2026-11-15T10:51:38Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0160/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:45:04Z }
verified:
  - by: task-lead
    at: 2026-11-15T10:51:38Z
    note: >-
      Intento 1 verificado (test d5555e0, evidencia fb5c3a7). Diff revisado:
      solo `spawn.test.ts` y artefactos; sin cambios de configuración ni de
      otros tests. El `it` de 600 mapas pasa a `growth`, `bsp` y `templates`,
      con 200 semillas cada uno, `{ timeout: 15_000 }` y comentario; las cinco
      comprobaciones y las etiquetas `${variant} · ${seed}` se conservan.
      Reejecutado: aislado 63/63 con barridos de 766, 1466 y 889 ms (< 5 s);
      `pnpm run test` dos veces 99/1473; `pnpm run verify` completo OK.
---

# Objetivo

Que el barrido de regresión de EXP-004 deje de agotar el timeout de 5 s bajo
carga, dividiéndolo por variante con un timeout local justificado y conservando
la misma muestra y las mismas aserciones.

# Contexto

El test `el barrido A/B/C × 200 semillas...` de
`experiments/EXP-004-salas-irregulares/src/spawn.test.ts` genera 600 mapas en un
solo `it` y tarda ~3,1 s en aislado. Con 86-92 workers compitiendo por CPU cruza
el timeout por defecto de Vitest (5 s) y hace fallar `verify` de forma
intermitente, aunque el fichero pasa aislado. El barrido valida
[REQ-011 R-008/R-009](../requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos)
y las reglas de spawn, enemigos y salida de REQ-012/REQ-013. No es un fallo del
generador. Fricción registrada en `docs/log.md` (2026-11-13) y `deferred` a
`harness-keeper`; este cambio se limita al test, sin tocar la configuración del
arnés.

# Criterios de aceptación

- [ ] El `it` de 200 semillas se sustituye por tres tests, uno por variante
      (`growth`, `bsp`, `templates`), con las mismas 200 semillas cada uno.
- [ ] Cada test nuevo declara un timeout local de 15 s con un comentario que
      explica el coste real y la contención de workers; no se cambia el timeout
      global de Vitest ni se añade `maxWorkers`.
- [ ] Se conservan todas las aserciones actuales: `validateMap` vacío,
      componente global de enemigos ≤2, enemigos ≤ `T`, `hotspotRolls` igual a
      `hotspotsTotal` en ambas métricas y ≥1 enemigo por sala no-spawn.
- [ ] El número de mapas generados y los mensajes de fallo por semilla no
      cambian; no se elimina ni se salta ninguna comprobación.
- [ ] `pnpm exec vitest run experiments/EXP-004-salas-irregulares` pasa y
      muestra tres tests de barrido con duración individual inferior a 5 s en
      aislado.
- [ ] `pnpm run test` pasa en dos ejecuciones consecutivas sin fallo de EXP-004.
- [ ] `pnpm run verify` pasa.

# Plan de test

- Unitario: el fichero de EXP-004 con reporter `verbose`; comprobar los tres
  tests y sus tiempos.
- Integración: `pnpm run test` completo dos veces seguidas.
- E2E / visual: no aplica.
- Manual: revisar el diff y confirmar que no se ha tocado ninguna aserción.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0160/attempt-1/report.md`
- [ ] Salida del fichero aislado y de las dos pasadas de `pnpm run test`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- Solo se edita `experiments/EXP-004-salas-irregulares/src/spawn.test.ts`; el
  generador, `src/game/**` y el resto de tests no cambian.
- No se tocan `vitest.config.ts`, `package.json` ni la política de timeouts:
  cualquier cambio de workers o scripts es de `harness-keeper`.
- No se debilita la cobertura: misma muestra, mismas aserciones y mismos
  mensajes por semilla.

# No objetivos

- Optimizar `generateMap` o la colocación de enemigos.
- Mover el barrido a un script aparte o reducir las semillas.
- Cambiar el timeout por defecto de la suite.
