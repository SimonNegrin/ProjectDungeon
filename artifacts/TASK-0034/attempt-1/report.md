---
type: Task Report
title: "TASK-0034: informe de ejecución"
description: Percepción 360°, línea de visión, detección por paso y memoria enemiga.
task: TASK-0034
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:00:00Z }
artifacts: artifacts/TASK-0034/attempt-1/
verified:
---

# Estado

`success`. Percepción pura, detección por paso, estados y memoria serializable
implementados; tests y `verify` verdes. Única desviación: una línea en
`src/host/hud.ts` para que compile el switch exhaustivo de eventos.

# Cambios

- Archivos: `src/game/perception.ts` (nuevo), `ai.ts`, `turn.ts`, `engine.ts`,
  `types.ts`, `index.ts`; tests nuevos/ajustados en `tests/unit/game/` y
  `tests/unit/host/debug.test.ts`.
- Commit SHA: `0838e8cdf7ce6d6108bf8978cc125facc678848d`.
- Visión 360° por Bresenham, radios 6/4/5, `dormant`/`alert`/`returning`,
  `home`, `lastKnown`, `alertTurns`, `hasShouted`, `fleeing`, detección tras
  cada paso de `Move`/`MoveTo` y eventos `EnemySpotted`/`EnemyReturned`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run` (9 archivos de la tarea) | 100 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config OK; 512 tests OK; build OK; 9 avisos de tamaño de handoffs (2 de este intento) | `verify-output.txt` |

# Evidencia visual

No aplica: esta tarea no toca UI, Canvas ni E2E.

# Desviaciones

- **`src/host/hud.ts` (+3 líneas)**: al añadir variantes a `GameEvent`, el switch
  exhaustivo de `eventLabel` (línea 149) rompía `tsc` con TS2366. Se añadió un
  `default` que devuelve el tipo del evento; no cambia el comportamiento de los
  eventos existentes y el feedback real llega en TASK-0038. Esto incumple la
  restricción «no tocar `src/host/`»: el lead debe aceptarlo o revertir la línea
  y reasignar el diseño de eventos.
- **`tests/unit/game/map-integration.test.ts`**: el fixture local pasa el enemigo
  a `alert` para conservar la intención legacy (fase enemiga con contraataque).
  No se tocó ninguna aserción; `createEnemy` sigue naciendo `dormant`.
- **Daño como despertador**: el brief lo difiere a `TASK-0035`; no se integra en
  combate. `hasShouted` queda como dato serializable, sin onda operativa.
- **T-009**: la actualización de `docs/design/turn-economy.md` y glosario queda
  para `requirements-writer`, como indica el brief.

# Problemas conocidos y preguntas abiertas

- El enemigo inicial ahora nace dormido: los E2E que asumen persecución
  inmediata necesitarán ajuste en `TASK-0038`/`TASK-0039` (no se ejecutan aquí).
- El snapshot clona `Unit` con spread, así que `home` y `lastKnown` comparten
  referencia con el estado; no hay mutadores expuestos y el motor es inmutable.
  No se editó `src/host/` para deep-clonarlos.
- `docs:check` avisa del brief de 3067 B (>2560 B objetivo, <4096 B tope); es un
  aviso preexistente, no un fallo.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Añadir una variante a `GameEvent` rompe `tsc` en un switch exhaustivo de `src/host/`, aunque las tareas de motor prohíben tocar `src/host/` | `pnpm run verify` → `src/host/hud.ts(149,40): error TS2366` al añadir `EnemySpotted`/`EnemyReturned` | `default` de 3 líneas en `eventLabel` | TASK-0035 y TASK-0037 añadirán más eventos y volverán a chocar | Centralizar la etiqueta de eventos en un helper tolerante o permitir explícitamente 1 línea de host en tareas de motor | Bajo: solo presentación de debug | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3067 |
| `report_bytes` | 3827 |
| `overflow` | `none` |
| `criteria_failed` | 0 (daño como despertador diferido por brief a TASK-0035) |
