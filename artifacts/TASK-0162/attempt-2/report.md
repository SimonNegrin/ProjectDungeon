---
type: Task Report
title: "TASK-0162: informe del intento 2"
description: Desglose inherente/equipo/traits visible en la ficha del portador.
task: TASK-0162
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T09:55:00Z }
artifacts: artifacts/TASK-0162/attempt-2/
verified:
---

# Estado

`success`. El desglose se lee con el panel abierto y sin `F1`.

# Cambios

- `hud-detail.ts`: `PanelDetail` adjunta `statBreakdown(unit)`; una sola fuente
  para la ficha y `F1`.
- `hud.ts`: nueve filas en la ficha derecha, una por atributo, con
  inherente/equipo/traits y el total tras `=`; la resistencia separa niveles y
  bandas sin `·` (R-026).
- `index.html`, `ui.css`: bloque bajo las secciones de objeto y scroll de la
  ficha si dos traits largos no dejan alto.
- Tests unitarios y E2E nuevos.
- Commit SHA: `fb31d8a`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 112 ficheros / 1796 tests + docs, tsc, build, bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 276 tests pasan | `e2e-output.txt` |
| `vitest tests/unit/host/` | 47 ficheros / 755 tests | `unit-output.txt` |
| Regresión HUD/panel/QA | 44 tests pasan | `e2e-regression-output.txt` |

# Evidencia visual

- `e2e/inventory/screenshots/panel-desglose-portador-900x700.png` y
  `panel-desglose-portador-1280x720.png`: panel abierto y las nueve filas.
- `panel-desglose-portador-sin-collar.png`: MP máximos pasa de `+2`/`8` a
  `+0`/`6` sin cerrar el panel.
- `panel-desglose-ficha-scroll-900x700.png`: con dos traits la ficha se desplaza
  y la última fila sigue alcanzable.

# Desviaciones

- El desglose vive en la **ficha derecha**, no en el panel: nueve filas en el
  panel no caben a 900×700 porque las piernas decorativas fijan el alto mínimo
  de las columnas y `qa-visual-correccion-ui-v7` exige que desborden y prohíbe
  recortarlas. El brief permite la ficha derecha.
- La ficha conserva dos secciones enmarcadas (R-011); el desglose va debajo.
- Resistencia: niveles de equipo/traits y perfil de bandas del motor; con
  `inherente = total` se muestra un solo perfil, y dos si una pieza futura
  desplaza bandas.

# Problemas conocidos y preguntas abiertas

- Con dos traits largos la ficha gana scroll interno. ¿Se prefiere recortar el
  perfil de resistencia antes que desplazar?

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El alto mínimo de las columnas del panel lo fijan las piernas decorativas, que desbordan la figura y no se pueden recortar. | `qa-visual-correccion-ui-v7` y `panel-three-columns-qa` | Desglose en la ficha derecha | Cualquier contenido bajo las columnas topa con ~130 px lógicos a 900×700 | Documentar el presupuesto vertical | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2420 |
| `report_bytes` | 3017 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
