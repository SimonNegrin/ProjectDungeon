---
type: Task Report
title: "TASK-0095: informe de ejecución"
description: Panel modal DOM de inventario/equipo/suelo con teclado, comparación, costes y retirada de G y 1-3.
task: TASK-0095
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:45:00Z }
artifacts: artifacts/TASK-0095/attempt-1/
verified:
---

# Estado

`blocked` solo por el gate de documentación: la implementación, los tests y el
build están completos y pasan; `pnpm run verify` falla en `docs:check` por dos
errores en ficheros del lead (detalle abajo), fuera de mi propiedad.

# Cambios

- Archivos: `src/host/{inventory-panel,inventory-panel-view,input,hud,main}.ts`,
  `index.html`; tests `tests/unit/host/{inventory-panel,input,hud,equipment-integration}.test.ts`.
- Panel DOM `role="dialog" aria-modal` sobre el marco 16:9 con equipo (8 huecos),
  mochila (capacidad real) y suelo solo si el tile tiene objetos; filas y botones
  estables, foco atrapado y visible, Tab/Shift+Tab/flechas, `Escape`/`I` cierran.
- Comparación antes de equipar con `aggregateEffectiveStats`; total y desglose de
  stats con `effectiveStats`; traits en cada hueco (`—` hoy); motivo textual por
  rechazo; acciones enviadas solo al confirmar.
- `I` exige partida en curso, fase de jugador, jugador vivo y sin animación; el
  panel bloquea todos los comandos del mapa y se refresca con `presentationState`.
- `G` y `1`-`3` fuera de input y ayuda; `SelectWeapon` queda como tipo legacy sin
  teclas. Sin cambios en motor, reglas, catálogo ni dependencias.
- Commits: `c37f3d4` (código, tests y evidencia), `13a01c5` (salidas).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run` (4 archivos) | 73/73 | `focused-test-output.txt` |
| `pnpm run test` | 1237/1237 | `logs/pnpm-run-test.txt` |
| `pnpm run verify` | falla `docs:check` (2 errores ajenos) | `verify-output.txt` |
| `config:check + test + build + check:bundle` | OK | `logs/verify-steps-sin-docs.txt` |
| Smoke Playwright manual 1280×720 | OK, sin errores de consola | `logs/manual-panel-smoke.txt` |

Cubre apertura/cierre, bloqueo, gating por fase/animación/muerte, ausencia de
`G`/`1`-`3`, ocho huecos, suelo vacío, comparación, desglose, coste de 1 MP sin
acción y cue pendiente sin adelanto.

# Evidencia visual

- `screenshots/panel-abierto-1280x720.png`: panel abierto, foco visible, equipo y
  mochila, total de stats y ayuda. Smoke: desequipar cuesta 1 MP, el arma pasa a
  la mochila, `Escape` cierra, el cursor vuelve a moverse y `G` no cambia nada.
- A 720 px el desglose queda bajo el pliegue y se lee con el scroll interno.

# Desviaciones

- Los E2E que aún esperan `G recoger`/`1`-`3` quedan como están: los actualiza
  TASK-0098, según el alcance. No se añadieron E2E.
- El smoke manual no se guardó como spec para no invadir TASK-0098.

# Problemas conocidos y preguntas abiertas

- `docs:check` falla por: `TASK-0095` no incluye `TASK-0096` en `unlocks` (lo
  declara `TASK-0096`, editado fuera de esta tarea) y `docs/log.md:8` supera 400
  caracteres. Necesito que el lead corrija ambos y repita `pnpm run verify`.
- Con varios objetos en el tile, `PickUp` toma el primero; el panel lo advierte
  y permite equipar la fila concreta.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `docs:check` bloquea verify por metadatos de tareas y entradas de log del lead, no por el código | `verify-output.txt`: 2 errores en `docs/tasks/TASK-0095` y `docs/log.md` | Verificar el resto de pasos por separado y devolver `blocked` | Cualquier task-runner sin propiedad sobre `docs/` choca con el mismo gate | `harness-keeper`/lead: validar el brief antes de lanzar y separar entradas largas del log | Bajo; no cambia reglas ni tests | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3317 |
| `report_bytes` | 4074 |
| `overflow` | `none` |
| `criteria_failed` | 1 (`pnpm run verify` por `docs:check`) |
