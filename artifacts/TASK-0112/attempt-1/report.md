---
type: Task Report
title: "TASK-0112: informe de ejecución"
description: Biseles de 2× con crecimiento exterior sin mover el interior.
task: TASK-0112
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T16:20:00Z }
artifacts: artifacts/TASK-0112/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/ui.css`: token `--ui-bevel` (`2 × --ui-line`) y `--ui-bevel-grow`;
  `.ui-outset`/`.ui-inset` conservan el borde base y pintan el bisel con dos
  contornos exteriores en L (claro NO, oscuro SE); marco con pseudo exterior;
  huecos de una línea en rejillas y scroll para no recortar; panel-body conserva
  borde real compensado.
- Tests: `tests/unit/host/ui-foundations.test.ts`,
  `tests/e2e/qa-visual-revision-ui.spec.ts`, `tests/e2e/ui-foundations-qa.spec.ts`
  y nuevo `tests/e2e/bisel-grueso-geometria-qa.spec.ts`.
- Commit SHA: `36d315d7bb18703583d6dab5f7bfd7e81b0efa9e`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 1320 tests, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | OK: 189 tests | `e2e-output.txt` |

El test nuevo fuerza `--ui-bevel: var(--ui-line)` (1×) y restaura 2×: mide el
interior de HUD, zona, ficha, columnas, slot, botón y submenú, y comprueba que
el contorno crece hacia fuera. Deltas interiores ≤0,82 px.

# Evidencia visual

- `screenshots/biseles-panel-900x700.png`, `biseles-panel-1280x720.png`.
- `screenshots/biseles-hud-900x700.png`, `biseles-hud-1280x720.png`.
- `logs/biseles-900x700.json`, `logs/biseles-1280x720.json`.
- Mirar el grosor uniforme del marco, HUD, columnas, slots y submenú, sin
  recortes ni desplazamiento del contenido, y el cursor del mapa con su ancho.

# Desviaciones

- `.ui-outset`/`.ui-inset` no usan el borde de 2× directamente: Chromium
  redondea el grosor de borde y desplazaba interiores anidados hasta ~1,6 px.
  Se usa la vía permitida por T-015 («outline o caja exterior equivalente»):
  contornos absolutos que no participan en el flujo ni en el scroll.
- `.inventory-panel-body` mantiene borde real de 2× con margen y tamaño
  compensados (δ interior ≤0,82 px) para no cambiar el bloque contenedor del
  submenú. `.inventory-column` pasa a `overflow: visible`; el recorte se evita
  con huecos internos.
- Los tests de relieve existentes se adaptaron a contornos/outline; no se
  eliminó ni se saltó cobertura.

# Problemas conocidos y preguntas abiertas

- Chromium cuantiza a píxel el grosor renderizado de borde/outline: a 900×700
  el token mide 2,35 px pero el valor computado es 2. El token sigue siendo
  `2 × --ui-line` y la geometría se valida con rectángulos.
- El cursor del panel sigue a 1× por alcance de TASK-0116; el del mapa conserva
  su ancho.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `getComputedStyle().borderWidth/outlineWidth` redondea a entero aunque el token de escala sea fraccionario; medir interiores con ese valor da falsos desplazamientos | `logs/biseles-900x700.json`, `logs/biseles-1280x720.json` | Medir con `getBoundingClientRect` + padding/token y tolerancia ±1; no derivar interiores del ancho computado del borde | Afecta a toda la QA de relieve y a futuras tareas 0113–0118 | Añadir la nota al protocolo de QA visual del arnés | Bajo; solo documentación de verificación | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2659 |
| `report_bytes` | 3634 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
