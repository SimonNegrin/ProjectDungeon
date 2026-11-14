---
type: Task Report
title: "TASK-0102: informe del intento 1"
description: Ficha de dos bloques en el HUD derecho y submenú contextual con coste y rechazos.
task: TASK-0102
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T02:12:00Z }
artifacts: artifacts/TASK-0102/attempt-1/
verified:
---

# Estado

`success`. Implementación: `81ff6741474202ee1f0ac199bd24e630051868ed`.
Corrección de evidencia: `9242f1ec271d6434dbc3e6c0cde9cb62ddcac418`.

# Cambios

- `inventory-panel.ts`: `PanelItem` publica `itemId` e `instanceId`; nuevo
  `PanelSelection` y `buildPanelMenu` puro con acciones por contexto, coste
  `1 MP`, `disabled` con motivo `no-mp` y sin `recoger` con mochila llena.
- `hud-detail.ts`: `buildPanelDetail` compone dos bloques independientes con
  stats, traits, descripción y estado «Vacío», sin delta.
- `hud.ts` e `index.html`: `hud-panel-detail` con testids estables; con panel
  abierto oculta cursor, vitals y bandas; al cerrar reaparece el detalle ya
  compuesto. El cuarto parámetro de `update` es opcional.
- `inventory-panel-view.ts`: publica la selección; `Enter` abre el submenú,
  flechas lo recorren, izquierda/derecha no hacen nada, `Escape` cierra y
  devuelve el foco, `Tab` no lo abandona y `Enter` ejecuta una vez. Opciones con
  coste, `aria-disabled` y motivo, sin foco programático.
- Se retiró la barra `inventory-actions` (HTML, vista y CSS). `Tab` recorre solo
  equipo → mochila → derecha → cerrar. N-008 sigue la instancia al cambiar de
  zona y el foco real se alinea con la nueva clave.
- `main.ts` guarda `panelSelection` y refresca solo el HUD al navegar.
- Tests: nuevos unitarios de ficha y menú, HTML/CSS; E2E
  `panel-submenu-hud-qa.spec.ts`; helpers y flujos existentes adaptados.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest hud-detail/inventory-panel/ui-foundations` | OK: 47 tests | `test-output.txt` |
| `pnpm run verify` | OK: 1298 unitarios, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | OK: 150 tests | `e2e-output.txt` |
| E2E focalizado (tres specs) | OK: 17 tests | `focused-e2e-output.txt` |

# Evidencia visual

Base real: `panel-submenu-hud-qa/screenshots/`. Copias en `screenshots/`:

- `submenu-1280x720.png` y `submenu-900x700.png` → `1280x720-submenu.png` y
  `900x700-submenu.png`: submenú abierto con coste y sin tapar la fila.
- `submenu-sin-mp-900x700.png` → `900x700-submenu-sin-mp.png`: opciones
  deshabilitadas con motivo.
- `submenu-mochila-llena-1280x720.png` → `1280x720-submenu-mochila-llena.png`:
  solo «Equipar» desde suelo.
- `ficha-dos-bloques-1280x720.png` → `1280x720-ficha-dos-bloques.png`;
  `ficha-posiciones-900x700.png` → `900x700-ficha-dos-bloques.png`: dos bloques
  sin submenú abierto.
- `submenu-posiciones-<vp>.png`: captura separada del test de posiciones.
- `panel-submenu-hud-qa/logs/submenu-geometry.json` (`logs/`): sin solape y
  dentro del panel.

# Desviaciones

- Ninguna de alcance, reglas, costes o catálogo. `PanelItem.actions` queda como
  fuente interna del menú; la barra DOM ya no existe y el submenú es el único
  camino de UI.
- Corrección de evidencia: dos tests escribían `ficha-dos-bloques-<vp>`; el de
  posiciones ahora usa `submenu-posiciones-<vp>` y cierra el menú antes de la
  ficha.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `E2E_ARTIFACTS_DIR` crea `<spec>/screenshots` y el brief pide capturas en la raíz del intento | `tests/e2e/artifacts.ts`; copia manual a `attempt-1/screenshots/` | Ejecutar el spec focalizado con la variable y copiar las capturas clave | Se repite en TASK-0048, TASK-0101 y esta tarea | Permitir una ruta sin segmento de spec o documentar la copia | Bajo; solo arnés/docs | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2489 |
| `report_bytes` | 4032 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
