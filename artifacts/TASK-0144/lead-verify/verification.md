---
type: Verification
title: "TASK-0144: verificación independiente del intento 1"
description: Reejecución del QA de pausa, guardado y carga; criterio 7 bloqueado por TASK-0153.
task: TASK-0144
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:10:00Z }
---

# Resultado

Verificación independiente del intento 1: **criterios 1-6 y 8 correctos**;
**criterio 7 bloqueado** por un defecto real del resultado, propiedad de
TASK-0153. Sin cambios de producción ni tests existentes modificados.

# Diff revisado

- `git diff main...HEAD`: solo `tests/e2e/pause-save-load-qa.spec.ts`, artefactos
  y el brief. Sin cambios en `src/`, `index.html`, `public/`, `package.json` ni
  `pnpm-lock.yaml`.
- No se ha borrado, saltado ni debilitado ningún test existente.

# Reejecución

| Comando | Resultado |
|---|---|
| `pnpm run verify` | OK: 107 archivos, 1678 tests; docs:check 693/160, config:check, tsc, build y bundle OK |
| `pnpm run test:e2e` | OK: 258/258 en 1.6 m, incluidos los 7 tests nuevos |
| `node artifacts/TASK-0144/attempt-1/probe/probe.mjs` | Defecto reproducido: `defect: true` |

# Criterios

1-6 y 8: cubiertos por el spec y los specs previos; capturas revisadas
(`pausa-raiz`, `pausa-controles`, `error-carga`). 7: falla; ver bloqueo.

# Bloqueo del criterio 7

El resultado de victoria y derrota sigue mostrando un único botón «Reiniciar»
que despacha `Restart` con la misma semilla y party, y `Esc` abre la pausa con
«Guardar partida» desactivado por partida terminada. Contradice REQ-024 R-012 y
el criterio 7. Evidencia: `artifacts/TASK-0144/attempt-1/probe/` y capturas
`probe/resultado-victoria.png`, `probe/resultado-pausa.png` y
`probe/resultado-derrota.png`.

Propietario: TASK-0153, que ya tiene como criterio retirar «Reiniciar» y la
pausa del resultado. Esa tarea deberá ajustar `tests/e2e/game-input-hud.spec.ts`,
que pulsa «Reiniciar». TASK-0144 debe reejecutarse después.

# Observaciones

- La suite E2E tarda 1.6-2.0 m; margen suficiente sobre los 240 s, pero conviene
  vigilarlo al añadir tests.
- El spec nuevo documenta el defecto en su cabecera y deja la aserción roja en
  el probe, fuera de la suite, para no romper `main` mientras TASK-0153 es
  dueña del arreglo.
