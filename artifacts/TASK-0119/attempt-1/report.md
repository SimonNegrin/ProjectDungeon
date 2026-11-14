---
type: Task Report
title: "TASK-0119: informe de ejecución"
description: El submenú conserva su apertura en refrescos sin cambios de selección ni opciones.
task: TASK-0119
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T20:05:00Z }
artifacts: artifacts/TASK-0119/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/inventory-panel.ts`: predicado puro `samePanelMenu` (acción, etiqueta,
  coste, disponibilidad, motivo y comando).
- `src/host/inventory-panel-view.ts`: al abrir se guarda clave e instancia del
  objeto; `renderModel` solo cierra el submenú si cambia la clave, desaparece o
  cambia la instancia, o difieren las opciones. Si se conserva, ajusta el índice
  activo y reposiciona el menú. Sin cambios en `src/game/**`.
- Tests: `tests/e2e/panel-submenu-reopen-qa.spec.ts` (3 casos) y 2 unitarios de
  `samePanelMenu` en `tests/unit/host/inventory-panel.test.ts`.
- Commit SHA: `df5143f`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| E2E nuevo sobre código previo | 2 failed, 1 passed (guardia de cierre) | `e2e-failing-before.txt` |
| E2E nuevo con arreglo | 3 passed | `e2e-fixed.txt` |
| `pnpm run verify` | OK: 94 archivos, 1332 tests; build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 211 passed | `e2e-output.txt` |

El primer fallo previo es el esperado: tras recoger, el submenú visible se cierra
antes de los 150 ms con el bucle de feedback vivo.

# Criterios

- E2E previo falla: `e2e-failing-before.txt`, en `expectMenuPersists` tras
  recoger.
- `Enter` mantiene el submenú tras recoger, equipar, desequipar y soltar: test 1,
  espera real `!animation.animating` y visible a los 150 ms.
- La selección y el foco siguen a la instancia tras cada acción (`backpack:2`,
  `slot:weapon`, `ground:item-test-ground-0`); nunca a un hueco vacío.
- Cambio de turno/update real: test 2 abre el menú, despacha `EndTurn` y sigue
  visible a 150 ms con flechas operativas. Resize conserva su cobertura previa.
- Clic, flechas, `Tab`, `aria-current`, foco y fila vacía: rutas intactas; specs
  de panel y unitarios verdes.
- Sin MP, costes, reglas ni modelo nuevos: solo presentación; snapshots mantienen
  el coste por operación y `src/game/**` no cambia.

# Evidencia visual

- `e2e-failing-before.txt` y `e2e-fixed.txt`; capturas de fallo en
  `test-results/` (no versionadas). Sin cambio visual: aspecto, posición y cursor
  del submenú se conservan.

# Desviaciones

- Ninguna. El test 3 es una guardia: con 0 MP el menú se cierra cuando `EndTurn`
  devuelve MP y cambian las opciones.

# Problemas conocidos y preguntas abiertas

- Bucle de render ~60 fps en `src/host/main.ts`: `scheduleTextFrame` reinicia
  `textLastFrameTime`, `textTick` obtiene `raw = 0` y el banner no caduca;
  `render()` se repite. Evidencia: `lead-repro/confirm-loop.txt` y el fallo previo.
  Fuera de alcance. Tarea aparte: conservar la marca entre reenganches y calcular
  el delta monotónico; riesgo medio en tiempos de feedback.
- Un menú abierto durante una animación se conserva si el modelo presentado
  mantiene selección y opciones; si cambia la fila, se cierra. Es lo pedido.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `pnpm run test:e2e -- <spec>` ejecuta toda la suite; el `--` llega literal a Playwright | Primera corrida: `playwright test -- tests/...`, «Running 210 tests»; con `pnpm exec playwright test <spec>`, 3 | `pnpm exec playwright test <ruta>` | Cualquier spec suelto pierde tiempo y mezcla evidencia | Documentar el filtro por ruta con `pnpm exec playwright test` | Bajo; solo documentación | `deferred` (harness-keeper) |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2555 |
| `report_bytes` | 3947 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
