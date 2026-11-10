---
type: Task Report
title: "TASK-0058: informe de ejecución del intento 2"
description: "Sentido correcto del retroceso/esquiva y gesto de defensa visible dentro del tile."
task: TASK-0058
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T18:58:00Z }
artifacts: artifacts/TASK-0058/attempt-2/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/world-effects.ts`: `awayFromAttacker` usa el sentido atacante→objetivo;
  impacto y esquiva alejan al defensor del atacante. Sin cambios de magnitudes.
- `src/host/renderer.ts`: el gesto se dibuja en el borde interior del tile del
  defensor y en una pasada posterior a todas las unidades, de modo que el
  atacante no lo tapa. Color y duración intactos.
- Tests: signo de impacto y fallo en horizontal (ambos sentidos), vertical y
  diagonal; render del gesto en los cuatro lados dentro del tile y después del
  atacante.
- Commit SHA: `bcf72be68ffc12ab51ca1455133467743846d9e2` (`task/TASK-0058`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | 21 archivos, 311 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config/tests/build/bundle OK (790 tests) | `verify-output.txt` |
| `pnpm run test:e2e` | 80 tests OK (43,0 s) | `e2e-output.txt` |

# Evidencia visual

- `screenshots/{impacto,fallo,muerte,cadaver}.png`; originales E2E en
  `feedback-combat-qa/screenshots/`.
- `screenshots/fallo-detalle.png`: recorte 5× de `fallo.png` para leer el gesto;
  no es una captura nueva.
- Mirar en `fallo.png` la línea gris clara bajo el defensor, dentro de su tile y
  por encima del atacante. El resto de capturas se mantiene sin cambios de
  criterio.

# Desviaciones

- Se conservan solo las capturas de `feedback-combat-qa`; el resto de PNG de la
  corrida E2E se descartó por no ser artefacto pedido. `e2e-output.txt` conserva
  el resultado completo.
- No se modificó ningún E2E; solo se recapturó.

# Problemas conocidos y preguntas abiertas

- Ninguno bloqueante. La esquiva/retroceso diagonal sigue avanzando 2 px por eje,
  igual que en el intento 1; no se cambió la magnitud.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2535 |
| `report_bytes` | 2343 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
