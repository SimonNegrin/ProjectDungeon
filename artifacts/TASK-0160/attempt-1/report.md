---
type: Task Report
title: "TASK-0160: informe de ejecución"
description: Barrido de EXP-004 partido en tres tests por variante con timeout local de 15 s, sin cambios en muestra ni aserciones.
task: TASK-0160
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:52:00Z }
artifacts: artifacts/TASK-0160/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- Archivos: `experiments/EXP-004-salas-irregulares/src/spawn.test.ts`. El `it`
  «A/B/C × 200 semillas» pasa a tres tests (`growth`, `bsp`, `templates`) que
  comparten el helper `sweepVariant`: mismas 200 semillas, cinco comprobaciones
  y etiquetas `${variant} · ${seed}`; cada test declara `{ timeout: 15_000 }`
  con comentario del coste real (~1 s por variante en aislado) y de la
  contención de 86-92 workers. No se tocaron `vitest.config.ts`, `package.json`
  ni otros tests.
- Commit SHA: `d5555e0`. Los artefactos van en un commit aparte.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run experiments/EXP-004-salas-irregulares --reporter=verbose` | 7 ficheros / 63 tests pasan; barridos 893, 1526 y 872 ms | `test-isolated-output.txt` |
| `pnpm run test` (1.ª) | 99 ficheros / 1473 tests pasan | `test-run-1-output.txt` |
| `pnpm run test` (2.ª) | 99 ficheros / 1473 tests pasan | `test-run-2-output.txt` |
| `pnpm run verify` | pasa (docs, config, tests, build y bundle) | `verify-output.txt` |

# Evidencia visual

- Rutas: no aplica (cambio solo de test).
- Qué debe mirar el usuario: nada visual; el diff de `spawn.test.ts`.

# Desviaciones

- Ninguna sobre el brief. Se extrajo el cuerpo del barrido a un helper local
  para no triplicar 30 líneas de aserciones; no cambia su contenido ni sus
  mensajes.

# Problemas conocidos y preguntas abiertas

- El margen de 15 s es local a estos tres tests: si el fichero acumula más
  barridos, el timeout no escala solo. No requiere decisión creativa.
- Los artefactos no se editan a mano fuera de este informe; el lead decide su
  commit y la actualización de `task_status`/`verified`.

# Fricción reutilizable

Ninguna entrada: el timeout intermitente bajo contención ya estaba registrado
en `docs/log.md` (2026-11-13) y el brief aportaba el coste en aislado.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2266 |
| `report_bytes` | 2426 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
