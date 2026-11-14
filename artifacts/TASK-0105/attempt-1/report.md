---
type: Task Report
title: "TASK-0105: informe de ejecución"
description: HUD izquierdo en tres zonas, pie sin marco y retirada de fase, turno, PV enemigo y estado.
task: TASK-0105
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T13:25:00Z }
artifacts: artifacts/TASK-0105/attempt-1/
verified:
---

# Estado

`success`. Los siete criterios se cumplen; fase, turno, PV enemigo y estado
siguen solo en `F1`.

# Cambios

- `index.html`: tres zonas `ui-outset` (personaje en dos columnas, arma, stats),
  `hud-magic-row`, `hud-traits` oculto y `.hud-footer` con teclas y sugerencia;
  fuera los cuatro testids retirados.
- `src/host/hud.ts`: `HudModel` sin `phase`/`enemyHp`/`turn`/`status`; `weapon`
  como `{name,accuracy,damage,sprite}|null`; `traits: string|null`;
  `playerMagicVisible`; sprite de `items.png` con el recorte del panel; vista
  oculta zona y filas condicionales.
- `src/host/hud-detail.ts`: `traitsLabel` devuelve `null` sin traits.
- `src/host/ui.css`: reglas de zona, retrato/arma, pie y pulso del arma; todo con
  `--ui-unit`/`--ui-line` o token de rol.
- Tests: unitarios (`hud`, `hud-detail`, `session`, `equipment-integration`,
  `ui-foundations`) y E2E (`hud-left-zones-qa` nueva; `game-input-hud`,
  `frame-qa`, `generated-map-qa`, `equipment-hud-qa`, `combat-equipment-qa`,
  `inventory-equipment-qa`, `spell-hud-qa`, `action-counter-turn-qa`,
  `motion-qa`, `feedback-combat-qa`, `support`). Ninguna aserción retirada sin
  sustituto de ausencia o de F1.
- Commits: `8458651` (implementación), `d42e9de` (tests).

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---|---|---|
| `pnpm run verify` | 240 s | verde (pasada registrada; el comando tarda ~13 s) | `verify-output.txt` |
| `pnpm run verify` | 120 s | fallo intermitente preexistente de `EXP-004` | `verify-flake-output.txt` |
| `VITEST_MAX_WORKERS=2 pnpm run verify` | 120 s | verde reproducible: 1307 tests | `verify-tuned-output.txt` |
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0105/attempt-1/e2e pnpm run test:e2e` | 180 s | verde: 163 tests | `e2e-output.txt` |

# Evidencia visual

- `artifacts/TASK-0105/attempt-1/e2e/hud-left-zones-qa/screenshots/`:
  `con-arma`, `sin-arma-sin-magia`, `sin-arma-con-magia`, `fantasma` y
  `sugerencia`, a 900×700 y 1280×720.
- Mirar: dos columnas del personaje con bordes superiores alineados, sprite de
  arma en la zona propia, filas de magia/maná solo con mago, «PV» en stats, y
  teclas/sugerencia debajo de las zonas sin marco. Ausencia de fase, turno, PV
  enemigo y estado; `F1` conserva `Fase`, `Turno`, `Enemigo` y `Estado`.

# Desviaciones

- `pnpm run verify` falla de forma intermitente por el timeout de 5 s de
  `EXP-004` con los 92 workers por defecto; se reprodujo igual en `HEAD` limpio.
  Pasa aislado y con `VITEST_MAX_WORKERS=2` (`verify-tuned-output.txt`). Sin
  cambios de alcance.

# Problemas conocidos y preguntas abiertas

- El pulso del arma se aplica a `hud-weapon` (nombre) y conserva la clase
  `is-pulsing`; el feedback visual de TASK-0083 sigue cubierto.
- La zona de arma sigue mostrando el arma equipada de un jugador fantasma, igual
  que antes; el detalle del cursor sigue indicando «Fantasma: sin equipo».

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `pnpm run test` falla a veces en `EXP-004` (barrido 3×200, 5 s) solo con los 92 workers por defecto; mismo fallo en `HEAD` limpio | `verify-output.txt` intermitente; `--maxWorkers=2` verde (1307) | `VITEST_MAX_WORKERS=2` o `--no-file-parallelism` | Cualquier tarea bloquea el gate sin relación con su cambio | Subir `testTimeout` de ese archivo o acotar el barrido en vitest.config | Bajo: solo experimentos | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2889 |
| `report_bytes` | 3979 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
