---
type: Task Report
title: "TASK-0101: informe del intento 2"
description: Selección y foco sincronizados al entrar en una zona con Tab.
task: TASK-0101
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T01:35:00Z }
artifacts: artifacts/TASK-0101/attempt-2/
verified:
---

# Estado

`success`. Hipótesis confirmada: `focusZone` enfocaba sin tocar `selectedKey`; ahora
selecciona el objeto recordado (o el primero por lectura) al entrar con
`Tab`/`Shift+Tab`.

# Cambios

- `src/host/inventory-panel-view.ts`: `focusZone` usa `selectByKey`; foco,
  `aria-current`, barra de acciones y detalle describen el mismo objeto. Flechas,
  vecino y ciclo de zonas intactos.
- `tests/e2e/support.ts`: `selectPanelRow` usa `Tab` hasta la zona y flechas
  dentro; eliminado el rodeo de flecha de escape.
- `tests/e2e/panel-three-columns-qa.spec.ts`: tras cada `Tab` en una zona se
  comprueba `activeKey === selectedKey`; memoria no vacua cambiando de objeto en
  mochila y derecha y volviendo con `Shift+Tab`/`Tab`.
- Sin lógica pura nueva: no procede test unitario adicional.
- Commit: `e94a56bb07acef1c8f86ff785bf8736747a0db68`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest navegación/panel/ui-foundations` | OK: 30 tests | `test-output.txt` |
| `pnpm run verify` | OK: 1288 unitarios, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | OK: 145 tests | `e2e-output.txt` |

# Evidencia visual

- `screenshots/1280x720-foco-y-reapertura.png`: Daga enfocada y seleccionada,
  barra «Daga · En mochila».
- `screenshots/900x700-foco-zonas.png`: Hacha del suelo enfocada y seleccionada,
  barra con Recoger/Equipar. Resto de capturas mantiene columnas, scroll y
  estados vacíos.

# Desviaciones

- El ciclo coherente de zonas deja la barra de acciones de equipo/mochila sin
  ruta solo-`Tab` que conserve el objeto elegido. El helper de test enfoca el
  botón ya renderizado de ese objeto y lo activa con `Enter`; no cambia
  producción ni reduce la cobertura de operaciones.
- No se tocaron layout, reglas, costes, motor, catálogo ni tests de intentos
  anteriores.

# Problemas conocidos y preguntas abiertas

- La ruta de acciones de equipo/mochila queda para el submenú de TASK-0102.

# Fricción reutilizable

Sin fricción nueva. La ruta de artefactos por spec sigue `pending` en el informe
del intento 1.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2549 |
| `report_bytes` | 2541 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
