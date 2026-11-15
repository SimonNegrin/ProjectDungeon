---
type: Task Report
title: "TASK-0144: informe de ejecución"
description: QA E2E de pausa, guardado y carga; criterio 7 bloqueado.
task: TASK-0144
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:36:00Z }
artifacts: artifacts/TASK-0144/attempt-1/
verified:
---

# Estado

`blocked`: QA 1-6 y 8 pasa; el criterio 7 falla por «Reiniciar» y pausa en el
resultado. Propietario: TASK-0153. Sin tocar producción.

# Cambios

- `tests/e2e/pause-save-load-qa.spec.ts` (7 tests) y artefactos.
- Commit SHA: `a94f406` (spec).

# Cobertura por criterio

- 1-3 ✓ `Esc` en personajes, enemiga y animación, cerrando antes el panel;
  pausa congelada e input ignorado; cinco acciones con teclado y `Esc`.
- 4 ✓ Guardar solo en personajes sin animación, con motivo en enemiga y
  animación; nombre y manifiesto correctos.
- 5-6 ✓ Ida y vuelta `.zip` (menú) y `.json` (pausa, con confirmación); activo,
  ronda, cámara y HUD sin aviso. Siete límites rechazados con mensaje y partida
  intacta (rutas, extra, 5 entradas, 5/20 MB, archivo, `.json`).
- 7 ✗ Defecto: «Reiniciar» en ambos overlays y `Esc` abre pausa; `R` sí se
  ignora. Probe fuera de la suite.
- 8 ✓ Capturas de pausa, menú, controles y error; ambos comandos verdes.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK, 1678 tests | `verify-output.txt` |
| `pnpm run test:e2e` | 258 pasan (2.0m) | `e2e-output.txt` |

# Evidencia visual

- `pause-save-load-qa/screenshots/`; defecto en `probe/resultado-*.png`.
- Probe (servidor 4174): `node …/probe/probe.mjs` → `["Reiniciar"]`,
  `escOpensPause: true`, reinicio con la misma party.

# Desviaciones

- La aserción roja del criterio 7 vive en el probe, como pidió el brief.

# Problemas conocidos y preguntas abiertas

- TASK-0153 debe retirar «Reiniciar» y bloquear la pausa; luego actualizar
  `game-input-hud.spec.ts`, que usa ese botón.
- La suite tarda 2.0m: 40 s de margen sobre 240 s.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Criterio 7 vs E2E que pulsa «Reiniciar» | `game-input-hud.spec.ts:373`; probe `output.txt` | Probe fuera de la suite | Todo QA de R-012 lo repite | TASK-0153 actualice ese E2E | Bajo; test | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2099 |
| `report_bytes` | 2558 |
| `overflow` | `none` |
| `criteria_failed` | 1 (criterio 7; TASK-0153) |
