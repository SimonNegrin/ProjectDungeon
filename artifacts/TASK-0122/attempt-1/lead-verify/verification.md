---
type: Lead Verification
title: "TASK-0122: verificación independiente"
description: Revisión del diff y reejecución de tests del intento 1.
task: TASK-0122
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:58:00Z }
---

# Diff

Revisado `git diff main...HEAD` (18 archivos, +897/−17). Cambios limitados a
`src/game/{config,types,roster,engine,index}.ts`, `src/host/{session,main,debug}.ts`,
tests unitarios y artefactos.

- `GameConfig`/`PlayerConfig`/`GameConfigError` con cuatro códigos y validación
  antes de generar; el test con generador espía demuestra que no hay estado
  parcial.
- `createInitialState` es la única ruta: host, `GameSession`, `load`,
  `regenerate` y `Restart` consumen `players`/`state.config`.
- `Unit.variant` viaja al snapshot; `GameState.config` es opcional para estados
  manuales y el snapshot lo expone clonado o `null`.
- Nombre vacío -> nombre del arquetipo; nombres no vacíos se conservan tal cual;
  orden de `players` = turno.
- Sin imports de `src/host/` ni DOM en `src/game/`; sin cambios de fórmulas,
  roster, balance, `Container`, render ni dependencias.
- Tests históricos intactos; solo se añadió `variant: null` al fixture y tests
  nuevos.

# Comandos

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run` (3 archivos obligatorios) | 53/53 OK | runner `test-output.txt` |
| `pnpm run verify` (primera ejecución) | falla solo EXP-004 por timeout 5 s (5386 ms) | `verify-lead.txt` |
| `pnpm exec vitest run experiments/EXP-004-salas-irregulares/src/spawn.test.ts` | 20/20 OK aislado | `exp004-isolated.txt` |
| `pnpm run verify` (segunda ejecución) | 94 archivos / 1344 tests OK; tsc, build y bundle OK | `verify-lead-2.txt` |

El fallo de EXP-004 es el flake preexistente documentado en `docs/log.md`
(2026-11-12, 2026-11-13 y TASK-0092): barrido A/B/C de 200 semillas con timeout
propio de 5 s bajo la suite paralela. No se ha tocado el experimento.

# Criterios

Los siete criterios de aceptación se cumplen; E2E y QA visual no aplican porque
no hay cambio de UI. La disposición de la fricción EXP-004 queda `deferred` a
`harness-keeper`, ya anotada en el log.
