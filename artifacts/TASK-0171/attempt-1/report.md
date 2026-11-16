---
type: Task Report
title: "TASK-0171: informe de ejecución"
description: E2E y QA visual del ciclo de cofres y guion de playtest de la maza circular.
task: TASK-0171
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T19:02:00Z }
artifacts: artifacts/TASK-0171/attempt-1/
verified:
---

# Estado

`success`. Ciclo de cofres, dos vistas, feedback visible con el panel abierto,
CLS, guardado/carga y curva cubiertos; playtest de la maza preparado.

# Cambios

- `src/host/ui.css`: el banner sube a `z-index: 25` y `top: 0` con el panel
  abierto (`1.5u` vertical, `pointer-events: none`); con el submenú vuelve a `5`.
- `tests/e2e/chests.spec.ts`: banner visible con el panel abierto tras abrir,
  coger todo y depositar; sin `advance` + `Escape`; capturas a 1280×720 y
  900×700.
- Commits: `398fbdef945a4ff6082711fb5cf99d3a75ab4782` (fix y E2E);
  `ed9619b08f5d00bd3a6e88a1fd433ebf76685d70` (spec inicial).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 116 archivos, 1890 tests, docs, build | `verify-output.txt` |
| `pnpm exec playwright test` | OK: 290 tests | `e2e-output.txt` |
| `chests.spec.ts` | OK: 3/3 | `chests/screenshots/` |
| `verify:task TASK-0171` | fail: criterios sin firma | `verify-task-output.txt` |

La E2E no inyecta cofres: coincide con `createInitialState({ seed: 295 })`. El
cofre nace en `(13,9)`, sala no-spawn, con «Daga arcana» y «Maza circular». El
banner se comprueba en el DOM real y el submenú lo deja detrás.

# Evidencia visual

- `chests/screenshots/`: «Cofre» y «Suelo» a 1280×720 y 900×700, HUD, cofre
  vacío y cargado, y feedback con panel abierto.
- Capturas cambiadas: las de feedback y `panel-cofre-*`; detalle en
  `report-detalle.md`.
- CLS sin desplazamientos prohibidos; única entrada `strong[hud-action]`
  (1,64e-6, con input reciente): `chests/logs/ciclo-cofre.json`.

## Playtest de la maza circular

Nueva partida, 1 jugador, semilla `295`, Guerrero. Bajar de `(13,5)` a `(13,8)`
(puerta en `(13,6)`); cursor al cofre `(13,9)` y `Espacio`; «Coger todo»;
equipar «Maza circular» desde Bolsa (dos manos: escudo a la mochila). Cerrar
panel, ir a `(14,8)` y atacar al centinela de `(15,8)`; el de `(15,9)` también
entra. `(14,9)` sirve en diagonal.

Mirar: 8 casillas (diagonales, sin centro), daño y feedback por objetivo, coste
de 1 acción, comparación con la espada y si un cofre por nivel basta.

# Desviaciones

- `verify:task` falla solo por la firma de criterios; `docs/**` es de
  `game-lead` y no se ha editado.
- «¡Alarma! Te han visto» viene del acercamiento, no de abrir o transferir.

# Problemas conocidos

Ninguno abierto del hito. Los valores de botín y maza se deciden en playtest.

# Fricción reutilizable

Ninguna entrada nueva.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 |
| `report_bytes` | 2992 |
| `overflow` | `none` |
| `criteria_failed` | 0 (firma pendiente de `game-lead`) |
