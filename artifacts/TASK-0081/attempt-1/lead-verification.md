---
type: Task Verification
title: "TASK-0081: verificación independiente del lead"
description: Re-ejecución de verify, docs y E2E; revisión de criterios, diff y triaje de fricción.
task: TASK-0081
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T23:30:00Z }
artifacts: artifacts/TASK-0081/attempt-1/
---

# Resultado

Verificado en `task/TASK-0081` (código `5dab41c`, informe `929e10e`, docs del
lead y verificación). Los ocho criterios se cumplen. No hay cambios fuera de
alcance ni tests debilitados. Sin decisión creativa abierta.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (240 s) | 1054/1054; docs, config, tsc, build y bundle OK | `logs/lead-verify.txt` |
| `pnpm run docs:check` (60 s) | OK: 410 documentos, 84 tareas, 5 experimentos | `logs/lead-docs-check.txt` |
| `pnpm run test:e2e` (180 s, extra) | 112/112 | `logs/lead-e2e.txt` |

El primer `verify` del runner falló por el test pesado de `EXP-004` agotando 5 s
bajo carga; la re-ejecución del lead (y el tercer intento del runner) pasa entera.
El fallo no toca `src/game/` ni los tests de la tarea.

# Criterios

| # | Criterio | Evidencia | Estado |
|---|---|---|---|
| 1 | `UnitStats.magicLevel` 0–4; sin `MagicSchool`/`stats.magia` | `types.ts`, `roster.ts`, `bestiary.ts`; `rg` sin coincidencias en `src/` y `tests/` | OK |
| 2 | `Unit.mana { current, max }`; fórmula única 0/4/8/12/16, separada del MP, recálculo al cambiar nivel | `mana.ts` (`manaMaxFor`, `createMana`, `restoreMana`); `mana.test.ts` | OK |
| 3 | Recarga al inicio del turno de una unidad viva; sin arrastre; nivel 0 con 0 | `turn.ts`; tests de jugador, enemigo, muerto, dos turnos y nivel 0 | OK |
| 4 | Roster Mago 4, Clérigo 3, Guerrero mágico 2, Cocinero 1, resto 0; enemigos 0 | `roster.ts`, `bestiary.ts`; `mana.test.ts`, `roster.test.ts`, `bestiary.test.ts` | OK |
| 5 | Serialización, snapshot y debug exponen nivel y maná; ninguna prueba usa `stats.magia` | `debug.ts` clona `mana`; `debug.test.ts`; `stats.test.ts`; `rg` limpio | OK |
| 6 | Tests de migración, máximos, recarga, nivel 0, recálculo y determinismo; intención de REQ-014/015/021 | `mana.test.ts`; suites migradas; `pnpm run verify` 1054/1054 | OK |
| 7 | Glosario y arquitectura recogen el cambio; requisitos sin contradicción; `docs:check` | `glossary.md`; `architecture.md` (matizado a `UnitStats.magicLevel` y `mana.ts`); `logs/lead-docs-check.txt` | OK |
| 8 | Sin catálogo, lanzamiento, HUD, IA mágica ni balance | Diff limitado a `src/game`, `src/host/debug.ts`, tests y artefactos; `package.json`/lock intactos | OK |

# Diff y tests

- Revisado el diff completo `ccda09d..HEAD`: no se tocó `src/game/actions.ts`,
  `combat.ts`, `perception.ts`, réplica ni MP. `Unit.mana` es un campo nuevo
  separado de `mp`/`maxMp`.
- Tests migrados sin pérdida de intención: `stats.test.ts` sigue comprobando
  atributos serializables y rango 0–4; `bestiary.test.ts` mantiene la tabla
  completa y añade nivel 0; `roster.test.ts` conserva stats, equipo y niveles.
  No se elimina ninguna aserción de comportamiento; el único test nuevo es
  `mana.test.ts` (196 líneas).
- `enemy-placement.test.ts` añade el campo obligatorio `mana` al fixture; no
  cambia expectativas. `engine.test.ts` añade las comprobaciones de maná 0.

# Requisitos

- REQ-014 R-007/T-001: nivel entero único y serializable; sin mapas
  familia→nivel. Las filas históricas de la tabla de decisiones están marcadas
  como sustituidas.
- REQ-015 R-008/T-001: niveles del roster y nivel en el catálogo.
- REQ-021 T-007: máximo derivado del nivel, recarga al inicio del turno y maná
  separado del MP; la resurrección sigue fuera de este corte.
- REQ-025 T-001/T-005: fórmula única y recarga junto a MP/acciones.
- Sin contradicciones operativas detectadas.

# Triaje de fricción

| Propuesta | Clase | Disposición |
|---|---|---|
| `EXP-004/spawn.test.ts` agota 5 s con la suite completa y puede tumbar `verify` | Arnés / test infra | `deferred` a `requirements-writer`/`harness-keeper`: flake preexistente, evidencia en `logs/verify-failed.txt` y `logs/test-maxworkers4.txt`; no bloquea ni cambia el resultado de la tarea. |
| La arquitectura decía `Unit.magicLevel` y omitía `mana.ts` | Documental | `accepted`: aplicado en `docs/design/architecture.md` («`UnitStats.magicLevel`», `Unit.mana` y `mana.ts`). |
| El plan manual de Mago/Cocinero con 16/16 y 4/4 no se inspeccionó en HUD | Local de la tarea | `accepted`: no hay HUD en este corte; `mana.test.ts` verifica Mago 16 y Cocinero 4, y `debug.test.ts` el snapshot. La inspección visual llega con `TASK-0083`. |

# Cierre

Listo para fusionar. `main` no tenía cambios ajenos; la rama solo contiene esta
tarea.
