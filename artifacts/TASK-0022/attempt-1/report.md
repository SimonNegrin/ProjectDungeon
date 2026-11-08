---
type: Task Report
title: "TASK-0022: informe de ejecución"
description: Verificación E2E y QA visual del damero y la decoración de REQ-007.
task: TASK-0022
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T13:50:00Z }
artifacts: artifacts/TASK-0022/attempt-1/
verified:
---

# Estado

`success`. Spec E2E nuevo y aislado; sin cambios de producción.

# Cambios

- `tests/e2e/floor-qa.spec.ts` (nuevo): 6 tests de snapshot/densidades,
  damero sala/pasillo, grises, camino/cursor, `MoveTo` y determinismo.
- Commit de código: `a4ea7988aefceecb0557d6cc3b94dab3c97f2581`. Los artefactos
  van en el commit siguiente de `task/TASK-0022`.
- `src/`, `index.html`, `public/`, `docs/`, `package.json` y `pnpm-lock.yaml`
  intactos en los commits. El cambio previo de `docs/tasks/TASK-0022` (estado
  `in_progress` del lead) no se incluyó.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `E2E_ARTIFACTS_DIR=… pnpm exec playwright test floor-qa` | 6/6 | `floor-qa/spec-run-output.txt` |
| `pnpm run test:e2e` | 46/46 (40 previos + 6) | `test-e2e-output.txt` |
| `pnpm run verify` | docs/config OK, 381/381 unitarios, build OK | `verify-output.txt` |

# Evidencia visual

- Rutas: `floor-qa/screenshots/{damero-sala,damero-pasillo,camino-sobre-decal,gris,semilla-distinta}.png`;
  `floor-qa/snapshot.json` y logs `damero.txt`, `grises.txt`, `camino.txt`,
  `moveto.txt`, `densidades.txt`, `determinismo.txt`.
- Densidades (semilla 279837264): sala 51/339 = 15,04 % (12–18 %); pasillo
  5/71 = 7,04 % (6–8 %). 56 decales, 56 tiles únicos; 0 en 18 puertas o 2 spawns.
- Damero desde píxeles del canvas (media interior 60×60): sala paridad 0
  = 25,42 vs 1 = 40,07 (Δ 14,65; par adyacente Δ 15,35). Pasillo adyacente
  (1,6)p1/(1,7)p0 Δ 13,89. Umbral documentado 6.
- Muros: 8 muestras (top/side, ambas paridades) con 0/73728 píxeles distintos
  del sprite; Δ de luminancia por paridad 0,000. Sin tinte de damero.
- Grises: 41,47 vs 26,50 de luminancia (Δ 14,98; umbral 5) en `gris.png`.
- Camino/cursor sobre decal `blood-23a` en (7,6): 2 pasos, `reachable`; overlay
  `z-index:1`, path `1`, cursor `2`, canvas `auto/static`; borde verde 4/4
  píxeles y punto (233,235,239).
- `MoveTo` a (7,9) desde (7,8): sin `CommandRejected`, jugador en (7,9),
  `decoration` y `grid.tiles` idénticos.
- Determinismo: `page.screenshot({fullPage:true})` de dos cargas = 42536 bytes,
  `Buffer.compare=0`, sha256 `c441dcfb…`; `canvas.toDataURL` idéntico. Semilla
  279837265: 55 decales ≠ 56, mismo damero (Δ 15,35).

# Desviaciones

- Ninguna de alcance. `CursorSnapshot` no expone `strongSteps`/`withinMp`; se
  valida `state: 'reachable'` y la longitud del camino.

# Problemas conocidos y preguntas abiertas

- Ninguno.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `artifacts.ts` afirma que dos workers nunca comparten archivos, pero con `fullyParallel` los tests de un mismo spec comparten su carpeta | Comentario de `artifactPath`; 6 tests del spec escriben en `floor-qa/` | Nombres únicos por test | Cualquier spec paralelo con capturas genéricas puede pisarse | Añadir segmento por título o matizar el comentario | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2555 |
| `report_bytes` | 3486 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
