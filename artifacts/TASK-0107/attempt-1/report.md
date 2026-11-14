---
type: Task Report
title: "TASK-0107: informe de ejecución"
description: "Panel preferido de tres columnas con títulos, slots inset y cadáveres del tile; validado a 900×700."
task: TASK-0107
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T13:40:00Z }
artifacts: artifacts/TASK-0107/attempt-1/
verified:
---

# Estado

`success`. Las tres columnas encajan a 900×700 sin solapes ni recortes; no se abre la alternativa 1/3 + dos filas.

# Cambios

- `index.html`: títulos Equipo/Bolsa/Suelo, sin cabecera, ayuda ni estados vacíos; título accesible oculto y «Cerrar».
- `inventory-panel.ts`: `PanelCorpse` derivado de unidades `hp <= 0` en el tile; nombre propio o tipo del bestiario; sin acciones.
- `inventory-panel-view.ts`: un único slot solo icono; cadáveres como presentación, fuera de la navegación.
- `ui.css`: token `--ui-slot`, rejillas 2×4 y de dos columnas, figura de ocho posiciones, cadáveres al inicio de Suelo, scroll solo en la derecha.
- Tests unitarios/E2E adaptados; nombre/MP siguen cubiertos en el HUD izquierdo.
- Commits: `9c6e61c`, `659fed0`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 1310 tests; tsc, build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 167 tests pasan | `e2e-output.txt` |

# Evidencia visual

- `e2e/panel-three-columns-qa/screenshots/tres-columnas-{900x700,1280x720}.png`
- `e2e/panel-three-columns-qa/screenshots/cadavers-3-900x700.png`
- Geometría: `e2e/panel-three-columns-qa/logs/panel-{geometry,corpses}.json`.

**Encaje a 900×700:** panel 488,25 px; tres columnas de 137,0625 px; slots cuadrados de 39,890625 px en las tres columnas; sprites de 37,890625 px dentro del área interior; títulos alineados a `top = 127,375`; sin intersecciones ni recortes. A 1280×720 los slots miden 54,421875 px y también quedan dentro.

# Desviaciones

- Los E2E de `inventory-player`, `inventory-mp` y estados vacíos pasan a `hud-player-name`, `hud-player-mp` y ausencia de filas/texto.
- El scroll del suelo se prueba con 40 objetos; con cuatro se comprueba que caben.

# Problemas conocidos y preguntas abiertas

- Ninguno dentro del alcance. Sin cursor, anti-CLS, QA final ni alternativa.

# Fricción reutilizable

Sin entradas.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3663 |
| `report_bytes` | 2439 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
