---
type: Task Report
title: "TASK-0176: informe de ejecución"
description: QA E2E de densidad por party real; cobertura nueva verde y dos fallos E2E preexistentes.
task: TASK-0176
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:31:53Z }
artifacts: artifacts/TASK-0176/attempt-1/
verified:
---

# Estado

`blocked`: la QA nueva y `pnpm run verify` pasan; «sin regresiones en la suite
E2E» no se puede firmar porque dos specs ya fallan en `main`. Sin tocar `src/`.

# Cambios

- `tests/e2e/density-party-real-qa.spec.ts`: dos E2E desde el menú real (1 vs 6
  jugadores a 1280×720 y 900×700; guardado y carga desde el menú principal).
- Commit SHA: `e63bf36d636ce914b27e68759c142b6803db2d55`.

# Cobertura por criterio

- 1 ✓ Semilla 279837264: 1 jugador da 5 enemigos y 6 dan 11;
  `playersP` 1/6, total aplicado 5/11 y 4 salas no-spawn.
- 2 ✓ Guardado real de 6 jugadores y carga: total 11, posiciones, tipos, `home`,
  salas, rejilla, puertas, spawns, cofres, suelo, RNG y party idénticos. La
  posición del jugador movido se conserva: el mapa no se regenera.
- 3 ✓ Capturas con `F1` a 1280×720 y 900×700; el overlay muestra «Enemigos del
  generador» con tipo, posición, sala y emboscada.
- 4 ✗ Suite E2E completa: 290/292. Fallan `host-result-qa.spec.ts:145` y
  `pause-save-load-qa.spec.ts:751`: la semilla 79, documentada como victoria,
  acaba en derrota con 1 jugador. Reproducido sin este spec.
- 5 ✓ `pnpm run verify`: 118 archivos, 1904 tests, `tsc`, build y bundle.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | ok: 1904 tests | `verify-output.txt` |
| `pnpm run test:e2e tests/e2e/density-party-real-qa.spec.ts` | 2/2 | `e2e-output.txt` |
| `pnpm run test:e2e` | 290/292, 2 fallos preexistentes | `e2e-full-output.txt` |
| Dos specs fallidas sin este spec | 2/2 fallan igual | `e2e-fallos-base.txt` |

# Evidencia visual

- `density-party-real-qa/screenshots/`: `reparto-1-jugador-{1280x720,900x700}`,
  `reparto-6-jugadores-{1280x720,900x700}` y `cargado-6-jugadores-1280x720`.
- `density-party-real-qa/logs/`: presupuesto, totales y fichas por viewport;
  `guardado-carga.json` declara `preserved` a `true`.
- Mirar «Enemigos del generador» en `F1`: 5 fichas con 1 jugador y 11 con 6.

# Desviaciones

- El test de guardado mueve al jugador una casilla antes de guardar, en fase de
  personajes, para que una regeneración se delate también por la posición.

# Problemas conocidos y preguntas abiertas

- La victoria de la semilla 79 ya no se sostiene con 1 jugador. Decide
  `game-lead`: adaptar `WIN_GAME_SEED`/`PLAY_SEED` o el helper, o tratarlo como
  regresión de balance para el playtest. No se tocan esos specs: el arreglo
  cambia un fixture ajeno.

# Fricción reutilizable

Sin entradas que cumplan un disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (sin brief en el intento 1) |
| `report_bytes` | 3066 |
| `overflow` | `none` |
| `criteria_failed` | 1 (criterio 4; decisión de `game-lead`) |
