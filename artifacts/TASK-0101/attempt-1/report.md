---
type: Task Report
title: "TASK-0101: informe de ejecución"
description: Tres columnas, figura de equipo y navegación espacial.
task: TASK-0101
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T01:22:00Z }
artifacts: artifacts/TASK-0101/attempt-1/
verified:
---

# Estado

`success`. Tres columnas de un tercio, figura de ocho huecos, mochila 2×4,
derecha reservada con suelo visible y navegación N-001 a N-010.

# Cambios

- `src/host/inventory-navigation.ts`: vecino estricto, empates, más próximo y
  ciclo de zonas.
- `src/host/inventory-panel.ts`: `ground` siempre lista, `corpses: []` y avisos
  de vacío; stats y comparación quedan en el modelo para TASK-0102.
- Vista, `index.html` y `ui.css`: tres columnas, figura CSS, roving tabindex,
  barra de acciones, `Tab` por zonas y scroll solo en el suelo.
- Tests nuevos de navegación, estructura y E2E de teclado/scroll.
- Commit: `b6922542394e4d5bb61b4a9dcfb0fefcbe43da43`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 1288 unitarios, build y bundle | `verify-output.txt` |
| `vitest navegación/panel/ui-foundations` | OK: 30 tests | `test-output.txt` |
| `pnpm run test:e2e` | OK: 145 tests | `e2e-output.txt` |

# Evidencia visual

- `screenshots/1280x720-*` y `900x700-*`: columnas, mochila llena con cuatro
  objetos, suelo vacío, foco por zonas, reapertura y scroll.
- `logs/*.json`: a 1280×720 panel, cuerpo y columnas no desbordan; a 900×700
  solo se desplaza el suelo.

# Desviaciones

- Ninguna. `Tab` enfoca la zona sin cambiar la selección; las flechas
  mueven foco y selección, y así la barra del objeto elegido sigue alcanzable.
- Cadáveres reservados y vacíos; no se inventan trasvases ni cofres.

# Problemas conocidos y preguntas abiertas

- En 900×700 algunos nombres se recortan; el `aria-label` es completo.
- Ficha del objeto y submenú con `Enter`: TASK-0102.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Brief pide `screenshots/` raíz; `artifactPath` crea carpeta por spec. | Copia manual desde `*-qa/screenshots/`. | Copiar capturas clave y borrar duplicados. | Afecta a cualquier tarea E2E con `E2E_ARTIFACTS_DIR`. | Documentar la ruta o permitir raíz plana. | Bajo. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2559 |
| `report_bytes` | 2550 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
