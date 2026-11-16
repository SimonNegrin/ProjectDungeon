---
type: Task Report
title: "TASK-0171: informe de ejecución"
description: E2E y QA visual del ciclo de cofres y guion de playtest de la maza circular.
task: TASK-0171
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T18:58:00Z }
artifacts: artifacts/TASK-0171/attempt-1/
verified:
---

# Estado

`success`. Ciclo de cofres, dos vistas, feedback, CLS, guardado/carga y curva
cubiertos; playtest de la maza preparado.

# Cambios

- `tests/e2e/chests.spec.ts` (3 tests): ciclo real con semilla `295`,
  guardado/carga con `.zip` y curva 1/6 jugadores.
- Sin cambios en `src/`, reglas, botín ni tests existentes.
- Commit: `ed9619b08f5d00bd3a6e88a1fd433ebf76685d70`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 116 archivos, 1890 tests, docs, build | `verify-output.txt` |
| `pnpm exec playwright test` | OK: 290 tests | `e2e-output.txt` |
| `chests.spec.ts` | OK: 3/3 | `chests/screenshots/` |
| `verify:task TASK-0171` | fail: criterios sin firma | `verify-task-output.txt` |

La E2E no inyecta cofres: el estado de la página coincide con
`createInitialState({ seed: 295 })`. El cofre nace en `(13,9)`, sala no-spawn,
con «Daga arcana» y «Maza circular».

# Evidencia visual

- `chests/screenshots/`: «Cofre» y «Suelo» a 1280×720 y 900×700, HUD cerrado,
  abierto y vacío, cofre cargado y feedback de apertura y transferencias.
- CLS sin desplazamientos prohibidos; única entrada `strong[hud-action]`
  (1,64e-6, con input reciente): `chests/logs/ciclo-cofre.json`.

## Playtest de la maza circular

Nueva partida, 1 jugador, semilla `295`, Guerrero. Bajar de `(13,5)` a `(13,8)`
(puerta en `(13,6)`); cursor al cofre `(13,9)` y `Espacio`; «Coger todo»;
equipar «Maza circular» desde Bolsa (dos manos: escudo a la mochila). Cerrar
panel, ir a `(14,8)` y atacar al centinela de `(15,8)`; el de `(15,9)` también
entra en el anillo. `(14,9)` es alternativa diagonal.

Mirar: alcance de las 8 casillas (diagonales, sin centro), daño y feedback por
objetivo, coste de 1 acción, comparación con la espada (menos acierto y pierde
el escudo) y si un cofre por nivel basta.

# Desviaciones

- El banner (`z-index: 5`) queda tapado por el panel (`20`); existe y se
  anuncia, pero se ve al cerrar el panel. Capturas de feedback con panel
  cerrado. No se cambia la capa: es UI y el alcance no lo pide.
- `verify:task` falla solo por la firma de criterios; `docs/**` es de
  `game-lead` y no se ha editado.
- Primer intento E2E: fallo de aserción del test, corregido; no fue de producto.

# Problemas conocidos

- ¿Tarea propia para que el banner se vea con el panel abierto?
- «¡Alarma! Te han visto» viene del acercamiento, no de abrir o transferir.

# Fricción reutilizable

Ninguna entrada nueva.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 |
| `report_bytes` | 2985 |
| `overflow` | `none` |
| `criteria_failed` | 0 (firma pendiente de `game-lead`) |
